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
