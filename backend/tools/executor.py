"""Tool Executor - Real implementations for all agent tools."""

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx


WORKSPACE = os.getenv("AGENT_WORKSPACE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "workspace"))
try:
    os.makedirs(WORKSPACE, exist_ok=True)
except OSError:
    WORKSPACE = "/tmp/agent_workspace"
    os.makedirs(WORKSPACE, exist_ok=True)

# ── Tool Registry ────────────────────────────────────────

TOOLS: dict[str, dict] = {}


def tool(name: str, description: str, parameters: dict):
    """Decorator to register a tool."""
    def decorator(func):
        TOOLS[name] = {
            "name": name,
            "description": description,
            "parameters": parameters,
            "function": func,
        }
        return func
    return decorator


async def execute_tool(name: str, args: dict) -> dict:
    """Execute a tool by name with given arguments."""
    if name not in TOOLS:
        return {"success": False, "result": "", "error": f"Unknown tool: {name}"}
    try:
        func = TOOLS[name]["function"]
        result = await func(**args) if asyncio.iscoroutinefunction(func) else func(**args)
        return {"success": True, "result": str(result), "error": None}
    except Exception as e:
        return {"success": False, "result": "", "error": str(e)}


def get_tools_for_prompt() -> str:
    """Generate tool descriptions for the LLM system prompt."""
    lines = []
    for name, info in TOOLS.items():
        params = json.dumps(info["parameters"], ensure_ascii=False)
        lines.append(f"- **{name}**: {info['description']}\n  Parameters: {params}")
    return "\n".join(lines)


# ── Tool Implementations ─────────────────────────────────

BLOCKED_PATTERNS = [
    "rm -rf /",
    "mkfs",
    "dd if=/dev",
    ":(){",
    "fork bomb",
    "chmod -R 777 /",
    "> /dev/sda",
    "shutdown",
    "reboot",
    "halt",
    "init 0",
    "init 6",
]


@tool(
    "shell",
    "Execute a shell command and return stdout/stderr",
    {"command": "string (the shell command to run)"},
)
async def tool_shell(command: str) -> str:
    """Execute shell command with timeout. Dangerous commands are blocked."""
    cmd_lower = command.lower().strip()
    for pattern in BLOCKED_PATTERNS:
        if pattern in cmd_lower:
            return f"BLOCKED: Command contains forbidden pattern '{pattern}'"

    proc = await asyncio.create_subprocess_shell(
        command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=WORKSPACE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
    except asyncio.TimeoutError:
        proc.kill()
        return "ERROR: Command timed out after 30 seconds"

    output = stdout.decode(errors="replace")
    if stderr_text := stderr.decode(errors="replace"):
        output += f"\n[stderr]: {stderr_text}"
    if len(output) > 10_000:
        output = output[:10_000] + "\n... [truncated]"
    return output or "(no output)"


@tool(
    "python",
    "Execute Python code and return the output",
    {"code": "string (Python code to execute)"},
)
async def tool_python(code: str) -> str:
    """Execute Python code in a subprocess."""
    proc = await asyncio.create_subprocess_exec(
        "python3", "-c", code,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=WORKSPACE,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=30)
    except asyncio.TimeoutError:
        proc.kill()
        return "ERROR: Python execution timed out after 30 seconds"

    output = stdout.decode(errors="replace")
    if stderr_text := stderr.decode(errors="replace"):
        output += f"\n[stderr]: {stderr_text}"
    if len(output) > 10_000:
        output = output[:10_000] + "\n... [truncated]"
    return output or "(no output)"


@tool(
    "web_search",
    "Search the web using DuckDuckGo and return results",
    {"query": "string (search query)", "max_results": "integer (optional, default 5)"},
)
async def tool_web_search(query: str, max_results: int = 5) -> str:
    """Search the web using DuckDuckGo (no API key needed)."""
    from ddgs import DDGS

    results = DDGS().text(query, max_results=max_results)
    if not results:
        return "No results found."

    lines: list[str] = []
    for r in results:
        lines.append(f"**{r['title']}**\n{r['href']}\n{r['body']}")
    return "\n\n".join(lines)


@tool(
    "web_browse",
    "Fetch a web page and return its text content",
    {"url": "string (the URL to fetch)"},
)
async def tool_web_browse(url: str) -> str:
    """Fetch a URL and return readable text content."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return "ERROR: Only http/https URLs are allowed"
    hostname = parsed.hostname or ""
    if (
        hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1")
        or hostname.startswith("192.168.")
        or hostname.startswith("10.")
        or hostname.startswith("172.16.")
        or hostname.startswith("172.17.")
        or hostname.startswith("172.18.")
        or hostname.startswith("172.19.")
        or hostname.startswith("172.2")
        or hostname.startswith("172.3")
        or hostname.endswith(".internal")
        or hostname.endswith(".local")
    ):
        return "ERROR: Access to internal/private network addresses is blocked"

    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; Delirium/1.0)"},
        )
        resp.raise_for_status()

    content_type = resp.headers.get("content-type", "")
    if "text/html" in content_type:
        text = resp.text
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) > 8000:
            text = text[:8000] + "\n... [truncated]"
        return text
    elif "application/json" in content_type:
        return resp.text[:8000]
    else:
        return f"Content-Type: {content_type}, Length: {len(resp.content)} bytes"


@tool(
    "read_file",
    "Read the contents of a file",
    {"path": "string (file path, relative to workspace or absolute)"},
)
async def tool_read_file(path: str) -> str:
    """Read a file's contents."""
    p = Path(path) if os.path.isabs(path) else Path(WORKSPACE) / path
    p = p.resolve()
    if not p.exists():
        return f"ERROR: File not found: {p}"
    if p.stat().st_size > 1_000_000:
        return f"ERROR: File too large ({p.stat().st_size} bytes). Max 1MB."
    return p.read_text(errors="replace")


@tool(
    "write_file",
    "Write content to a file (creates dirs as needed)",
    {"path": "string (file path)", "content": "string (file content)"},
)
async def tool_write_file(path: str, content: str) -> str:
    """Write content to a file."""
    p = Path(path) if os.path.isabs(path) else Path(WORKSPACE) / path
    p = p.resolve()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    return f"Written {len(content)} bytes to {p}"


@tool(
    "list_files",
    "List files in a directory",
    {
        "path": "string (directory path, default: workspace root)",
        "pattern": "string (optional glob pattern, e.g. '*.py')",
    },
)
async def tool_list_files(path: str = "", pattern: str = "*") -> str:
    """List files in a directory."""
    p = Path(path) if (path and os.path.isabs(path)) else Path(WORKSPACE) / (path or "")
    if not p.exists():
        return f"ERROR: Directory not found: {p}"
    files = sorted(p.glob(pattern))
    if not files:
        return "(empty)"
    lines: list[str] = []
    for f in files[:200]:
        if f.is_dir():
            lines.append(f"DIR   {f.name}/")
        else:
            lines.append(f"FILE  {f.name}  ({f.stat().st_size} bytes)")
    result = "\n".join(lines)
    if len(files) > 200:
        result += f"\n... and {len(files) - 200} more"
    return result


@tool(
    "git",
    "Run a git command in the workspace",
    {"args": "string (git arguments, e.g. 'status' or 'log --oneline -5')"},
)
async def tool_git(args: str) -> str:
    """Execute a git command."""
    return await tool_shell(f"git {args}")


# ── Supabase Tools ───────────────────────────────────────

@tool(
    "supabase_query",
    "Query a Supabase database table (select, insert, update, delete)",
    {
        "table": "string (table name)",
        "method": "string (GET, POST, PATCH, DELETE)",
        "params": "object (optional query params, e.g. {'select': '*', 'id': 'eq.5'})",
        "body": "object (optional, for POST/PATCH)",
    },
)
async def tool_supabase_query(table: str, method: str = "GET", params: dict | None = None, body: dict | None = None) -> str:
    from integrations.supabase_client import supabase_query
    result = await supabase_query(table, method, params, body)
    return json.dumps(result, ensure_ascii=False, default=str)


@tool(
    "supabase_rpc",
    "Call a Supabase RPC / Edge Function",
    {"function_name": "string", "params": "object (optional)"},
)
async def tool_supabase_rpc(function_name: str, params: dict | None = None) -> str:
    from integrations.supabase_client import supabase_rpc
    result = await supabase_rpc(function_name, params)
    return json.dumps(result, ensure_ascii=False, default=str)


@tool(
    "supabase_storage",
    "List files in a Supabase storage bucket",
    {"bucket": "string (bucket name)", "prefix": "string (optional folder prefix)"},
)
async def tool_supabase_storage(bucket: str, prefix: str = "") -> str:
    from integrations.supabase_client import supabase_storage_list
    result = await supabase_storage_list(bucket, prefix)
    return json.dumps(result, ensure_ascii=False, default=str)


# ── GitHub Tools ─────────────────────────────────────────

@tool(
    "github_repos",
    "List your GitHub repositories",
    {"per_page": "integer (optional, default 30)"},
)
async def tool_github_repos(per_page: int = 30) -> str:
    from integrations.github_client import github_list_repos
    result = await github_list_repos(per_page)
    if "data" in result and isinstance(result["data"], list):
        repos = [{"name": r["full_name"], "url": r["html_url"], "stars": r.get("stargazers_count", 0)} for r in result["data"]]
        return json.dumps(repos, ensure_ascii=False)
    return json.dumps(result, ensure_ascii=False, default=str)


@tool(
    "github_create_repo",
    "Create a new GitHub repository",
    {"name": "string", "description": "string (optional)", "private": "boolean (optional, default false)"},
)
async def tool_github_create_repo(name: str, description: str = "", private: bool = False) -> str:
    from integrations.github_client import github_create_repo
    result = await github_create_repo(name, description, private)
    return json.dumps(result, ensure_ascii=False, default=str)


@tool(
    "github_read_file",
    "Read a file from a GitHub repository",
    {"owner": "string", "repo": "string", "path": "string", "ref": "string (optional, default 'main')"},
)
async def tool_github_read_file(owner: str, repo: str, path: str, ref: str = "main") -> str:
    from integrations.github_client import github_get_file
    import base64
    result = await github_get_file(owner, repo, path, ref)
    if "data" in result and isinstance(result["data"], dict) and "content" in result["data"]:
        content = base64.b64decode(result["data"]["content"]).decode(errors="replace")
        return content
    return json.dumps(result, ensure_ascii=False, default=str)


@tool(
    "github_issues",
    "List issues for a GitHub repository",
    {"owner": "string", "repo": "string", "state": "string (optional: open, closed, all)"},
)
async def tool_github_issues(owner: str, repo: str, state: str = "open") -> str:
    from integrations.github_client import github_list_issues
    result = await github_list_issues(owner, repo, state)
    if "data" in result and isinstance(result["data"], list):
        issues = [{"number": i["number"], "title": i["title"], "state": i["state"], "url": i["html_url"]} for i in result["data"]]
        return json.dumps(issues, ensure_ascii=False)
    return json.dumps(result, ensure_ascii=False, default=str)


@tool(
    "github_create_issue",
    "Create an issue on a GitHub repository",
    {"owner": "string", "repo": "string", "title": "string", "body": "string (optional)"},
)
async def tool_github_create_issue(owner: str, repo: str, title: str, body: str = "") -> str:
    from integrations.github_client import github_create_issue
    result = await github_create_issue(owner, repo, title, body)
    return json.dumps(result, ensure_ascii=False, default=str)


# ── Advanced Tools ───────────────────────────────────────

@tool(
    "search_files",
    "Recursively search for text/regex in files under a directory",
    {"path": "string (directory, default workspace)", "pattern": "string (text or regex to search)", "glob": "string (optional file glob, e.g. '*.py')"},
)
async def tool_search_files(pattern: str, path: str = "", glob: str = "*") -> str:
    """Grep-like recursive search across files."""
    p = Path(path) if (path and os.path.isabs(path)) else Path(WORKSPACE) / (path or "")
    if not p.exists():
        return f"ERROR: Directory not found: {p}"
    matches: list[str] = []
    compiled = re.compile(pattern, re.IGNORECASE)
    for fpath in sorted(p.rglob(glob)):
        if fpath.is_file() and fpath.stat().st_size < 500_000:
            try:
                text = fpath.read_text(errors="replace")
                for i, line in enumerate(text.splitlines(), 1):
                    if compiled.search(line):
                        matches.append(f"{fpath.relative_to(p)}:{i}: {line.strip()[:150]}")
                        if len(matches) >= 100:
                            return "\n".join(matches) + "\n... (100 matches limit)"
            except (OSError, UnicodeDecodeError):
                continue
    return "\n".join(matches) if matches else "No matches found."


@tool(
    "http_request",
    "Make an HTTP request (GET, POST, PUT, DELETE) to any API endpoint",
    {"method": "string (GET/POST/PUT/DELETE)", "url": "string", "headers": "object (optional)", "body": "object or string (optional)"},
)
async def tool_http_request(url: str, method: str = "GET", headers: dict | None = None, body: Any = None) -> str:
    """Make HTTP requests to external APIs."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return "ERROR: Only http/https URLs are allowed"
    hostname = parsed.hostname or ""
    if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1") or hostname.endswith(".internal") or hostname.endswith(".local"):
        return "ERROR: Access to internal network addresses is blocked"
    req_headers = {"User-Agent": "Delirium/1.0"}
    if headers:
        req_headers.update(headers)
    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        if method.upper() == "GET":
            resp = await client.get(url, headers=req_headers)
        elif method.upper() == "POST":
            resp = await client.post(url, headers=req_headers, json=body if isinstance(body, (dict, list)) else None, content=body if isinstance(body, str) else None)
        elif method.upper() == "PUT":
            resp = await client.put(url, headers=req_headers, json=body if isinstance(body, (dict, list)) else None, content=body if isinstance(body, str) else None)
        elif method.upper() == "DELETE":
            resp = await client.delete(url, headers=req_headers)
        else:
            return f"ERROR: Unsupported method: {method}"
    result = f"Status: {resp.status_code}\n"
    ct = resp.headers.get("content-type", "")
    if "json" in ct:
        try:
            result += json.dumps(resp.json(), indent=2, ensure_ascii=False)[:6000]
        except Exception:
            result += resp.text[:6000]
    else:
        result += resp.text[:6000]
    return result


@tool(
    "install_package",
    "Install a Python or Node.js package",
    {"name": "string (package name)", "manager": "string (pip or npm, default pip)"},
)
async def tool_install_package(name: str, manager: str = "pip") -> str:
    """Install a package via pip or npm."""
    safe_name = re.sub(r"[^a-zA-Z0-9_\-@/.]", "", name)
    if not safe_name:
        return "ERROR: Invalid package name"
    if manager == "npm":
        return await tool_shell(f"npm install {safe_name}")
    return await tool_shell(f"pip install {safe_name}")


@tool(
    "edit_file",
    "Replace specific text in a file (search and replace)",
    {"path": "string (file path)", "old_text": "string (exact text to find)", "new_text": "string (replacement text)"},
)
async def tool_edit_file(path: str, old_text: str, new_text: str) -> str:
    """Edit a file by replacing old_text with new_text."""
    p = Path(path) if os.path.isabs(path) else Path(WORKSPACE) / path
    p = p.resolve()
    if not p.exists():
        return f"ERROR: File not found: {p}"
    content = p.read_text(errors="replace")
    if old_text not in content:
        return "ERROR: old_text not found in file"
    count = content.count(old_text)
    new_content = content.replace(old_text, new_text, 1)
    p.write_text(new_content)
    return f"Replaced 1 of {count} occurrence(s) in {p}"


@tool(
    "create_project",
    "Create a project directory structure from a template",
    {"name": "string (project name)", "template": "string (python, node, react, or custom)", "files": "object (optional: {path: content} for custom template)"},
)
async def tool_create_project(name: str, template: str = "python", files: dict | None = None) -> str:
    """Scaffold a new project directory."""
    project_dir = Path(WORKSPACE) / name
    project_dir.mkdir(parents=True, exist_ok=True)
    templates = {
        "python": {
            "main.py": '"""Main entry point."""\n\ndef main():\n    print("Hello from {name}!")\n\nif __name__ == "__main__":\n    main()\n',
            "requirements.txt": "",
            "README.md": f"# {name}\n\nCreated by Delirium Infinite.\n",
        },
        "node": {
            "index.js": f'console.log("Hello from {name}!");\n',
            "package.json": json.dumps({"name": name, "version": "1.0.0", "main": "index.js"}, indent=2),
            "README.md": f"# {name}\n\nCreated by Delirium Infinite.\n",
        },
    }
    file_map = files if files else templates.get(template, templates["python"])
    created: list[str] = []
    for fp, content in file_map.items():
        target = project_dir / fp
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content.replace("{name}", name))
        created.append(str(fp))
    return f"Created project '{name}' at {project_dir} with files: {', '.join(created)}"


# ── Design & Scraping Tools ─────────────────────────────

@tool(
    "scrape_design",
    "Extract design inspiration from a URL: layout, colors, fonts, and CSS patterns",
    {"url": "string (URL to analyze for design)", "extract": "string (optional: 'colors', 'layout', 'fonts', 'all'; default 'all')"},
)
async def tool_scrape_design(url: str, extract: str = "all") -> str:
    """Scrape a website for design patterns, colors, fonts, and layout structure."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return "ERROR: Only http/https URLs are allowed"
    hostname = parsed.hostname or ""
    if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1") or hostname.endswith(".internal") or hostname.endswith(".local"):
        return "ERROR: Access to internal network addresses is blocked"

    async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
        resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (compatible; Delirium/1.0)"})
        resp.raise_for_status()

    html = resp.text

    result_parts: list[str] = []

    if extract in ("all", "colors"):
        # Extract color values from inline styles and CSS
        hex_colors = set(re.findall(r'#(?:[0-9a-fA-F]{3}){1,2}\b', html))
        rgb_colors = set(re.findall(r'rgba?\([^)]+\)', html))
        result_parts.append(f"## Colors Found\nHex: {', '.join(list(hex_colors)[:20])}\nRGB: {', '.join(list(rgb_colors)[:15])}")

    if extract in ("all", "fonts"):
        # Extract font families
        fonts = set(re.findall(r'font-family:\s*([^;}"]+)', html, re.IGNORECASE))
        google_fonts = set(re.findall(r'fonts\.googleapis\.com/css2?\?family=([^&"]+)', html))
        result_parts.append(f"## Fonts\nCSS: {', '.join(list(fonts)[:10])}\nGoogle: {', '.join(list(google_fonts)[:5])}")

    if extract in ("all", "layout"):
        # Extract CSS classes & layout patterns
        classes = re.findall(r'class="([^"]*)"', html)
        class_counts: dict[str, int] = {}
        for cls_group in classes:
            for c in cls_group.split():
                class_counts[c] = class_counts.get(c, 0) + 1
        top_classes = sorted(class_counts.items(), key=lambda x: x[1], reverse=True)[:30]
        result_parts.append(f"## Top CSS Classes\n{chr(10).join(f'- {c}: {n}x' for c, n in top_classes)}")

        # Extract CSS custom properties / design tokens
        tokens = set(re.findall(r'--[\w-]+:\s*[^;]+', html))
        if tokens:
            result_parts.append(f"## CSS Variables / Design Tokens\n{chr(10).join(f'- {t}' for t in list(tokens)[:20])}")

    # Extract meta & structure
    title = re.search(r'<title[^>]*>([^<]+)</title>', html, re.IGNORECASE)
    meta_desc = re.search(r'<meta[^>]*name="description"[^>]*content="([^"]+)"', html, re.IGNORECASE)
    og_image = re.search(r'<meta[^>]*property="og:image"[^>]*content="([^"]+)"', html, re.IGNORECASE)

    result_parts.insert(0, f"## Page Info\nTitle: {title.group(1) if title else 'N/A'}\nDescription: {meta_desc.group(1)[:200] if meta_desc else 'N/A'}\nOG Image: {og_image.group(1) if og_image else 'N/A'}\nURL: {url}")

    # Extract inline styles
    inline_styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL | re.IGNORECASE)
    if inline_styles:
        combined = "\n".join(inline_styles)
        if len(combined) > 3000:
            combined = combined[:3000] + "\n... [truncated]"
        result_parts.append(f"## Inline CSS\n```css\n{combined}\n```")

    return "\n\n".join(result_parts)


@tool(
    "generate_ui_component",
    "Generate a production-ready UI component with Liquid Glass design (React/Next.js + Tailwind CSS)",
    {
        "component": "string (component type: 'hero', 'product-card', 'pricing', 'navbar', 'footer', 'feature-grid', 'testimonial', 'cta', 'sidebar', 'modal', 'form', 'stats-card', 'custom')",
        "style": "string (optional: 'liquid-glass', 'minimal', 'bold', 'gradient'; default 'liquid-glass')",
        "variant": "string (optional: 'dark', 'light'; default 'dark')",
        "description": "string (optional: extra description for custom components)",
    },
)
async def tool_generate_ui_component(
    component: str,
    style: str = "liquid-glass",
    variant: str = "dark",
    description: str = "",
) -> str:
    """Generate a production-ready React component with Liquid Glass styling."""

    # Component templates mapping
    components: dict[str, str] = {
        "hero": _generate_hero(style, variant),
        "product-card": _generate_product_card(style, variant),
        "pricing": _generate_pricing(style, variant),
        "navbar": _generate_navbar(style, variant),
        "footer": _generate_footer(style, variant),
        "feature-grid": _generate_feature_grid(style, variant),
        "stats-card": _generate_stats_card(style, variant),
    }

    if component in components:
        return components[component]
    elif component == "custom" and description:
        return f"""// Custom component: {description}
// Use Liquid Glass design system
// Style: {style}, Variant: {variant}
// Implement this component based on the description above using React + Tailwind CSS.
// Apply the Liquid Glass patterns: backdrop-blur, glass borders, gradient overlays, soft shadows.

import React from 'react';

export default function CustomComponent() {{
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">
        {{/* {description} */}}
        <h2 className="text-2xl font-bold text-white">Custom Component</h2>
        <p className="mt-2 text-white/60">Built with Liquid Glass design system</p>
      </div>
    </div>
  );
}}"""
    return f"ERROR: Unknown component type '{component}'. Available: hero, product-card, pricing, navbar, footer, feature-grid, stats-card, custom"


def _generate_hero(style: str, variant: str) -> str:
    return '''import React from 'react';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#08080f]">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-white/70">Now in Beta</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
          <span className="text-white">Build the </span>
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Future
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed">
          The next generation platform that transforms how you create, design,
          and deploy beautiful applications.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold text-sm overflow-hidden transition-all hover:shadow-lg hover:shadow-indigo-500/25">
            <span className="relative z-10">Get Started Free</span>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button className="px-8 py-3.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl text-white/80 font-semibold text-sm hover:bg-white/10 transition-all">
            View Demo →
          </button>
        </div>
      </div>
    </section>
  );
}'''


def _generate_product_card(style: str, variant: str) -> str:
    return '''import React from 'react';
import { Heart, ShoppingCart, Star } from 'lucide-react';

interface ProductCardProps {
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  badge?: string;
}

export default function ProductCard({ name, price, originalPrice, image, rating, reviews, badge }: ProductCardProps) {
  return (
    <div className="group relative rounded-2xl border border-white/8 bg-white/5 backdrop-blur-xl overflow-hidden transition-all hover:border-white/15 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1">
      {/* Glass highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-white/3 to-transparent">
        <img src={image} alt={name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {badge && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-bold uppercase rounded-lg tracking-wider">
            {badge}
          </span>
        )}
        <button className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/30 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/60 hover:text-rose-400 hover:bg-black/50 transition-all">
          <Heart size={16} />
        </button>
      </div>

      {/* Info */}
      <div className="relative z-10 p-4">
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={12} className={i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-white/15'} />
          ))}
          <span className="text-[11px] text-white/40 ml-1">({reviews})</span>
        </div>

        <h3 className="text-sm font-semibold text-white truncate">{name}</h3>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-white">${price.toFixed(2)}</span>
            {originalPrice && (
              <span className="text-xs text-white/30 line-through">${originalPrice.toFixed(2)}</span>
            )}
          </div>
          <button className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/30 transition-all">
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}'''


def _generate_pricing(style: str, variant: str) -> str:
    return '''import React from 'react';
import { Check } from 'lucide-react';

const plans = [
  { name: 'Starter', price: 0, features: ['5 Projects', '1GB Storage', 'Basic Analytics', 'Email Support'], cta: 'Get Started' },
  { name: 'Pro', price: 29, features: ['Unlimited Projects', '100GB Storage', 'Advanced Analytics', 'Priority Support', 'Custom Domain', 'API Access'], cta: 'Start Free Trial', popular: true },
  { name: 'Enterprise', price: 99, features: ['Everything in Pro', '1TB Storage', 'White-label', 'SSO/SAML', 'Dedicated Support', 'SLA 99.9%', 'Custom Integrations'], cta: 'Contact Sales' },
];

export default function PricingSection() {
  return (
    <section className="py-24 px-6 bg-[#08080f]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white">Simple, transparent pricing</h2>
          <p className="mt-4 text-white/50 text-lg">No hidden fees. Cancel anytime.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-2xl border p-8 transition-all ${
              plan.popular
                ? 'border-indigo-500/50 bg-indigo-500/5 shadow-xl shadow-indigo-500/10 scale-105'
                : 'border-white/8 bg-white/3 hover:border-white/15'
            } backdrop-blur-xl`}>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="relative z-10">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-white/40 ml-2">/month</span>
                </div>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm text-white/70">
                      <Check size={16} className="text-emerald-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button className={`w-full mt-8 py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.popular
                    ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/25'
                    : 'border border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                }`}>
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}'''


def _generate_navbar(style: str, variant: str) -> str:
    return '''import React from 'react';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const [open, setOpen] = React.useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#08080f]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="/" className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
          Brand
        </a>

        <div className="hidden md:flex items-center gap-8">
          {['Features', 'Pricing', 'Docs', 'Blog'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-white/50 hover:text-white transition-colors">
              {item}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <button className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors">Sign In</button>
          <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-500/25 transition-all">
            Get Started
          </button>
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-white/70">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-[#08080f]/95 backdrop-blur-xl p-6 space-y-4">
          {['Features', 'Pricing', 'Docs', 'Blog'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="block text-sm text-white/60 hover:text-white py-2">{item}</a>
          ))}
          <button className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold">
            Get Started
          </button>
        </div>
      )}
    </nav>
  );
}'''


def _generate_footer(style: str, variant: str) -> str:
    return '''import React from 'react';

const links = {
  Product: ['Features', 'Pricing', 'Changelog', 'Docs'],
  Company: ['About', 'Blog', 'Careers', 'Contact'],
  Legal: ['Privacy', 'Terms', 'License'],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#08080f] py-16 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Brand</h3>
          <p className="mt-3 text-sm text-white/40 leading-relaxed">Building the future, one pixel at a time.</p>
        </div>
        {Object.entries(links).map(([title, items]) => (
          <div key={title}>
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-4">{title}</h4>
            <ul className="space-y-2.5">
              {items.map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-white/35 hover:text-white/80 transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-xs text-white/25">
        © {new Date().getFullYear()} Brand. All rights reserved.
      </div>
    </footer>
  );
}'''


def _generate_feature_grid(style: str, variant: str) -> str:
    return '''import React from 'react';
import { Zap, Shield, Globe, BarChart3, Sparkles, Clock } from 'lucide-react';

const features = [
  { icon: Zap, title: 'Lightning Fast', desc: 'Built for speed with edge computing and smart caching.', color: '#f59e0b' },
  { icon: Shield, title: 'Enterprise Security', desc: 'SOC2 compliant with end-to-end encryption.', color: '#10b981' },
  { icon: Globe, title: 'Global Scale', desc: 'Deploy to 30+ regions. 99.99% uptime SLA.', color: '#6366f1' },
  { icon: BarChart3, title: 'Real-time Analytics', desc: 'Track every metric that matters to your business.', color: '#ec4899' },
  { icon: Sparkles, title: 'AI-Powered', desc: 'Smart automation that learns from your workflow.', color: '#8b5cf6' },
  { icon: Clock, title: 'Ship Faster', desc: 'From idea to production in minutes, not months.', color: '#06b6d4' },
];

export default function FeatureGrid() {
  return (
    <section className="py-24 px-6 bg-[#08080f]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white">Everything you need</h2>
          <p className="mt-4 text-white/50 text-lg">Powerful features to scale your business</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="group relative rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl p-6 hover:border-white/15 hover:bg-white/5 transition-all">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}15` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}'''


def _generate_stats_card(style: str, variant: str) -> str:
    return '''import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
}

export default function StatsCard({ title, value, change, icon, color }: StatsCardProps) {
  const isPositive = change >= 0;
  return (
    <div className="relative rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl p-5 hover:border-white/12 transition-all">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
            {icon}
          </div>
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg ${
            isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
          }`}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : ''}{change}%
          </div>
        </div>
        <p className="text-xs text-white/40 mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}'''
