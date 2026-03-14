"""Tool Executor - Real implementations for all agent tools."""

import asyncio
import inspect
import json
import os
import re
import shutil
from xml.etree import ElementTree as ET
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus, urlparse

import httpx


WORKSPACE = os.getenv("AGENT_WORKSPACE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "workspace"))
try:
    os.makedirs(WORKSPACE, exist_ok=True)
except OSError:
    WORKSPACE = "/tmp/agent_workspace"
    os.makedirs(WORKSPACE, exist_ok=True)

# ── Tool Registry ────────────────────────────────────────

TOOLS: dict[str, dict] = {}
_BROWSER_STATE: dict[str, Any] = {
  "playwright": None,
  "browser": None,
  "context": None,
  "page": None,
}
_BROWSER_LOCK = asyncio.Lock()
_COLLECTOR_TARGETS: list[dict[str, Any]] = []
_COLLECTOR_ALERTS: list[dict[str, Any]] = []


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


def _normalize_tool_args(func: Any, args: dict[str, Any]) -> dict[str, Any]:
    signature = inspect.signature(func)
    params = signature.parameters
    if not args:
        return {}

    normalized: dict[str, Any] = {key: value for key, value in args.items() if key in params}
    extras: dict[str, Any] = {key: value for key, value in args.items() if key not in params}
    if not extras:
        return normalized

    alias_map = {
        "target": ["url", "query", "topic", "name", "lead"],
        "query": ["topic", "keyword", "search", "prompt"],
        "topic": ["query", "question", "subject"],
        "url": ["target", "base_url", "website", "link"],
        "base_url": ["url", "target"],
        "text": ["content", "input_text", "body", "message"],
        "input_text": ["text", "content", "body"],
        "content": ["text", "body", "input_text"],
        "lead": ["target", "query", "name"],
        "question": ["topic", "query"],
    }

    for name, parameter in params.items():
        if name in normalized:
            continue

        if "param" in extras:
            normalized[name] = extras.pop("param")
            continue

        for alias in alias_map.get(name, []):
            if alias in extras:
                normalized[name] = extras.pop(alias)
                break

    return normalized


async def execute_tool(name: str, args: dict) -> dict:
    """Execute a tool by name with given arguments."""
    if name not in TOOLS:
        return {"success": False, "result": "", "error": f"Unknown tool: {name}"}
    try:
        func = TOOLS[name]["function"]
        normalized_args = _normalize_tool_args(func, args or {})
        result = await func(**normalized_args) if asyncio.iscoroutinefunction(func) else func(**normalized_args)
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


async def _llm_generate(system_prompt: str, user_prompt: str, max_tokens: int = 2200) -> str:
        """Generate specialized content through the configured LLM router."""
        try:
                from agent.router import router as llm_router
                from providers.base import Message

                response = await llm_router.chat(
                        [
                                Message(role="system", content=system_prompt),
                                Message(role="user", content=user_prompt),
                        ],
                        temperature=0.35,
                        max_tokens=max_tokens,
                )
                return response.content
        except Exception as e:
                return f"ERROR: specialized LLM generation failed: {e}"


def _llm_failed(result: str) -> bool:
        return result.startswith("ERROR: specialized LLM generation failed:")


def _browser_executable() -> str | None:
        for candidate in (
                os.getenv("BROWSER_EXECUTABLE"),
                shutil.which("chromium"),
                shutil.which("chromium-browser"),
                shutil.which("google-chrome"),
                shutil.which("google-chrome-stable"),
                shutil.which("chrome"),
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ):
                if candidate and Path(candidate).exists():
                        return candidate
        return None


async def _ensure_browser_page():
        async with _BROWSER_LOCK:
                page = _BROWSER_STATE.get("page")
                if page is not None:
                        return page

                from playwright.async_api import async_playwright

                playwright = await async_playwright().start()
                launch_kwargs: dict[str, Any] = {
                        "headless": os.getenv("BROWSER_HEADLESS", "true").lower() != "false",
                        "args": ["--no-sandbox", "--disable-dev-shm-usage"],
                }
                executable = _browser_executable()
                if executable:
                        launch_kwargs["executable_path"] = executable

                browser = await playwright.chromium.launch(**launch_kwargs)
                context = await browser.new_context(viewport={"width": 1440, "height": 900})
                page = await context.new_page()

                _BROWSER_STATE["playwright"] = playwright
                _BROWSER_STATE["browser"] = browser
                _BROWSER_STATE["context"] = context
                _BROWSER_STATE["page"] = page
                return page


async def _close_browser_state() -> str:
    async with _BROWSER_LOCK:
                page = _BROWSER_STATE.get("page")
                context = _BROWSER_STATE.get("context")
                browser = _BROWSER_STATE.get("browser")
                playwright = _BROWSER_STATE.get("playwright")

                if page is not None:
                        await page.close()
                if context is not None:
                        await context.close()
                if browser is not None:
                        await browser.close()
                if playwright is not None:
                        await playwright.stop()

                _BROWSER_STATE.update({"playwright": None, "browser": None, "context": None, "page": None})
                return "Browser session closed."


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
    "file_read",
    "Alias for read_file used by hands",
    {"path": "string (file path, relative to workspace or absolute)"},
)
async def tool_file_read(path: str) -> str:
    return await tool_read_file(path)


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
    "file_write",
    "Alias for write_file used by hands",
    {"path": "string (file path)", "content": "string (file content)"},
)
async def tool_file_write(path: str, content: str) -> str:
    return await tool_write_file(path, content)


@tool(
    "web_fetch",
    "Alias for web_browse used by hands",
    {"url": "string (the URL to fetch)"},
)
async def tool_web_fetch(url: str) -> str:
    return await tool_web_browse(url)


@tool(
  "browser_navigate",
  "Navigate a real browser session to a URL",
  {"url": "string (URL to visit)", "wait_until": "string (optional, default networkidle)"},
)
async def tool_browser_navigate(url: str, wait_until: str = "networkidle") -> str:
  page = await _ensure_browser_page()
  await page.goto(url, wait_until=wait_until, timeout=45000)
  title = await page.title()
  return f"Navigated to {page.url}\nTitle: {title}"


@tool(
  "browser_click",
  "Click an element in the real browser session",
  {"selector": "string (CSS selector to click)"},
)
async def tool_browser_click(selector: str) -> str:
  page = await _ensure_browser_page()
  await page.click(selector, timeout=15000)
  return f"Clicked element: {selector}"


@tool(
  "browser_type",
  "Type into an element in the real browser session",
  {"selector": "string (CSS selector)", "text": "string", "clear": "boolean (optional, default true)", "press_enter": "boolean (optional, default false)"},
)
async def tool_browser_type(selector: str, text: str, clear: bool = True, press_enter: bool = False) -> str:
  page = await _ensure_browser_page()
  locator = page.locator(selector)
  await locator.wait_for(timeout=15000)
  if clear:
    await locator.fill("")
  await locator.type(text, delay=20)
  if press_enter:
    await locator.press("Enter")
  return f"Typed into {selector}: {text[:120]}"


@tool(
  "browser_read_page",
  "Read the current page text from the real browser session",
  {"max_chars": "integer (optional, default 5000)"},
)
async def tool_browser_read_page(max_chars: int = 5000) -> str:
  page = await _ensure_browser_page()
  title = await page.title()
  text = await page.locator("body").inner_text(timeout=10000)
  text = re.sub(r"\s+", " ", text).strip()
  return f"Title: {title}\nURL: {page.url}\n\n{text[:max_chars]}"


@tool(
  "browser_screenshot",
  "Take a screenshot of the real browser session",
  {"path": "string (optional relative path)", "full_page": "boolean (optional, default true)"},
)
async def tool_browser_screenshot(path: str = "", full_page: bool = True) -> str:
  page = await _ensure_browser_page()
  target = Path(path) if path else Path(WORKSPACE) / "browser_screenshots" / f"shot-{int(asyncio.get_event_loop().time()*1000)}.png"
  if not target.is_absolute():
    target = Path(WORKSPACE) / target
  target.parent.mkdir(parents=True, exist_ok=True)
  await page.screenshot(path=str(target), full_page=full_page)
  return f"Screenshot saved to {target}"


@tool(
  "browser_close",
  "Close the active real browser session",
  {},
)
async def tool_browser_close() -> str:
  return await _close_browser_state()


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



# ── Delirium Specialized Hand Tools ─────────────────────

@tool(
    "pesquisa_papers",
    "Busca papers em PubMed e arXiv com resultados estruturados",
    {"query": "string", "max_results": "integer (optional, default 5)"},
)
async def tool_pesquisa_papers(query: str, max_results: int = 5) -> str:
    """Search PubMed and arXiv for relevant papers."""
    max_results = max(1, min(max_results, 10))
    sections: list[str] = []

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            pm_search = await client.get(
                "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
                params={"db": "pubmed", "retmode": "json", "retmax": max_results, "term": query},
            )
            pm_search.raise_for_status()
            ids = pm_search.json().get("esearchresult", {}).get("idlist", [])
            if ids:
                pm_summary = await client.get(
                    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
                    params={"db": "pubmed", "retmode": "json", "id": ",".join(ids)},
                )
                pm_summary.raise_for_status()
                data = pm_summary.json().get("result", {})
                lines = ["## PubMed"]
                for pmid in ids:
                    item = data.get(pmid, {})
                    title = item.get("title", "Untitled")
                    source = item.get("fulljournalname") or item.get("source") or "PubMed"
                    pubdate = item.get("pubdate", "")
                    lines.append(f"- {title} | {source} | {pubdate} | https://pubmed.ncbi.nlm.nih.gov/{pmid}/")
                sections.append("\n".join(lines))
    except Exception as e:
        sections.append(f"## PubMed\nERROR: {e}")

    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True) as client:
            arxiv = await client.get(
                "https://export.arxiv.org/api/query",
                params={"search_query": f"all:{query}", "start": 0, "max_results": max_results},
            )
            arxiv.raise_for_status()
        root = ET.fromstring(arxiv.text)
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        entries = root.findall("atom:entry", ns)
        if entries:
            lines = ["## arXiv"]
            for entry in entries:
                title = (entry.findtext("atom:title", default="", namespaces=ns) or "").strip().replace("\n", " ")
                summary = (entry.findtext("atom:summary", default="", namespaces=ns) or "").strip().replace("\n", " ")
                link = entry.findtext("atom:id", default="", namespaces=ns)
                lines.append(f"- {title} | {link}\n  Summary: {summary[:280]}")
            sections.append("\n".join(lines))
    except Exception as e:
        sections.append(f"## arXiv\nERROR: {e}")

    if not sections:
        return "No paper sources returned results."
    return "\n\n".join(sections)


@tool(
    "gerar_codigo_web",
    "Gera código web em HTML/CSS/JS ou React/Next.js a partir de uma descrição",
    {"descricao": "string", "framework": "string (react or html)"},
)
async def tool_gerar_codigo_web(descricao: str, framework: str = "react") -> str:
    framework = framework.lower().strip()
    system = (
        "Você é um gerador de código web production-ready. Gere código limpo, pronto para uso, "
        "com foco em UX, responsividade e estrutura clara. Se for React, use TSX com Tailwind. "
        "Se for HTML, entregue um único arquivo completo."
    )
    return await _llm_generate(system, f"Framework: {framework}\nDescrição: {descricao}")


@tool(
    "debug_codigo",
    "Analisa e depura código com base no erro informado",
    {"code": "string", "erro": "string"},
)
async def tool_debug_codigo(code: str, erro: str) -> str:
    system = (
        "Você é um debugger sênior. Identifique a causa raiz, explique o problema, "
        "proponha correção objetiva e mostre código corrigido quando necessário."
    )
    return await _llm_generate(system, f"Erro:\n{erro}\n\nCódigo:\n```\n{code}\n```")


@tool(
    "gerar_prototipo_app",
    "Cria wireframe textual e código-base para app/site",
    {"app_tipo": "string"},
)
async def tool_gerar_prototipo_app(app_tipo: str) -> str:
    system = (
        "Você é um product designer + frontend architect. Gere um wireframe textual, estrutura de telas, "
        "componentes principais e um starter code em React/Next.js."
    )
    return await _llm_generate(system, f"Crie um protótipo para: {app_tipo}")


def _missing_minimax_message(kind: str) -> str:
    return f"preciso de chave API pra MiniMax ({kind}). Configure MINIMAX_API_KEY no backend para habilitar esta tool."


@tool(
    "gerar_imagem_site",
    "Prepara prompt e instruções para gerar imagem de site via MiniMax",
    {"prompt": "string"},
)
async def tool_gerar_imagem_site(prompt: str) -> str:
    if not os.getenv("MINIMAX_API_KEY"):
        return _missing_minimax_message("imagem")
    return f"MiniMax image generation requested with prompt: {prompt}"


@tool(
    "imagem_molecula",
    "Prepara prompt e instruções para gerar imagem molecular via MiniMax",
    {"prompt": "string"},
)
async def tool_imagem_molecula(prompt: str) -> str:
    if not os.getenv("MINIMAX_API_KEY"):
        return _missing_minimax_message("imagem molecular")
    return f"MiniMax molecule image generation requested with prompt: {prompt}"


@tool(
    "gerar_voz_narracao",
    "Prepara geração de narração/voz via MiniMax TTS",
    {"texto": "string", "voz": "string (optional)"},
)
async def tool_gerar_voz_narracao(texto: str, voz: str = "cientista louco") -> str:
    if not os.getenv("MINIMAX_API_KEY"):
        return _missing_minimax_message("voz")
    return f"MiniMax TTS requested with voice '{voz}' and text length {len(texto)}."


@tool(
    "seo_copy",
    "Gera copy SEO, anúncios e texto de landing page",
    {"produto": "string", "tom": "string (optional)"},
)
async def tool_seo_copy(produto: str, tom: str = "científico") -> str:
    system = "Você é um copywriter SEO de alta conversão. Entregue headline, subtítulo, bullets, keywords e CTA."
    return await _llm_generate(system, f"Produto: {produto}\nTom: {tom}")


@tool(
    "deploy_simulacao",
    "Simula deploy e analisa riscos de infraestrutura",
    {"repo_desc": "string"},
)
async def tool_deploy_simulacao(repo_desc: str) -> str:
    system = "Você é um DevOps engineer. Gere checklist de deploy, riscos, validações e comandos sugeridos."
    return await _llm_generate(system, f"Simule o deploy deste projeto:\n{repo_desc}")


@tool(
    "ui_design_sugestao",
    "Sugere layout e estrutura visual para uma página",
    {"pagina": "string"},
)
async def tool_ui_design_sugestao(pagina: str) -> str:
    system = "Você é um UI/UX designer premium. Sugira layout, hierarquia visual, seções, componentes e estilo visual."
    return await _llm_generate(system, f"Página: {pagina}")


@tool(
    "mobile_responsivo",
    "Gera estratégia e CSS responsivo para um elemento ou tela",
    {"elemento": "string"},
)
async def tool_mobile_responsivo(elemento: str) -> str:
    system = "Você é um especialista em responsividade. Gere estratégia mobile-first e exemplos de CSS/Tailwind."
    return await _llm_generate(system, f"Elemento ou tela: {elemento}")


@tool(
    "database_setup",
    "Cria schema SQL/NoSQL, tabelas, índices e sugestões de migrations",
    {"dados": "string"},
)
async def tool_database_setup(dados: str) -> str:
    system = "Você é um arquiteto de banco de dados. Gere schema, índices, constraints e sugestões de migração."
    return await _llm_generate(system, f"Requisitos dos dados:\n{dados}")


@tool(
    "api_integracao",
    "Gera integração de API com tratamento de erros e exemplo de uso",
    {"servico": "string"},
)
async def tool_api_integracao(servico: str) -> str:
    system = "Você é um integrador de APIs. Gere código de integração, auth, tratamento de erro e exemplo de uso."
    return await _llm_generate(system, f"Serviço/API: {servico}")


@tool(
    "teste_automatizado",
    "Gera testes automatizados para um trecho de código",
    {"codigo": "string"},
)
async def tool_teste_automatizado(codigo: str) -> str:
    system = "Você é um engenheiro de testes. Gere testes úteis, cobrindo casos felizes, erros e edge cases."
    return await _llm_generate(system, f"Código:\n```\n{codigo}\n```")


@tool(
    "otimizar_performance",
    "Analisa e otimiza performance de um snippet ou arquitetura",
    {"snippet": "string"},
)
async def tool_otimizar_performance(snippet: str) -> str:
    system = "Você é um especialista em performance web e backend. Aponte gargalos e entregue versão otimizada."
    return await _llm_generate(system, f"Snippet ou contexto:\n{snippet}")


@tool(
    "gerar_readme",
    "Cria README completo para um projeto",
    {"projeto": "string"},
)
async def tool_gerar_readme(projeto: str) -> str:
    system = "Você escreve READMEs excelentes. Gere visão geral, stack, setup, uso, scripts e próximos passos."
    return await _llm_generate(system, f"Projeto: {projeto}")


@tool(
    "marketing_landing",
    "Gera hero copy, CTA e estrutura de landing page",
    {"produto": "string"},
)
async def tool_marketing_landing(produto: str) -> str:
    system = "Você cria landing pages de alta conversão. Gere hero, prova social, CTA, seções e oferta."
    return await _llm_generate(system, f"Produto: {produto}")


@tool(
    "video_teaser",
    "Cria roteiro curto de vídeo teaser",
    {"topico": "string"},
)
async def tool_video_teaser(topico: str) -> str:
    system = "Você escreve roteiros curtos para vídeo teaser, reels e shorts, com gancho forte e CTA."
    return await _llm_generate(system, f"Tópico: {topico}")


@tool(
    "bio_simulacao",
    "Executa uma simulação bioinformática em Python no workspace do agente",
    {"code": "string"},
)
async def tool_bio_simulacao(code: str) -> str:
    prelude = (
        "# Optional scientific imports\n"
        "try:\n"
        "    import Bio  # type: ignore\n"
        "except Exception:\n"
        "    pass\n"
        "try:\n"
        "    import rdkit  # type: ignore\n"
        "except Exception:\n"
        "    pass\n"
    )
    return await tool_python(prelude + "\n" + code)


@tool(
    "add_target",
    "Add a collector monitoring target",
    {"target": "string", "notes": "string (optional)"},
)
async def tool_add_target(target: str, notes: str = "") -> str:
    item = {"target": target, "notes": notes, "created_at": asyncio.get_event_loop().time()}
    _COLLECTOR_TARGETS.append(item)
    return json.dumps({"status": "added", "target": item}, ensure_ascii=False)


@tool(
    "monitor",
    "Monitor a target URL or topic and return a snapshot",
    {"target": "string"},
)
async def tool_monitor(target: str) -> str:
    if target.startswith("http://") or target.startswith("https://"):
        return await tool_web_fetch(target)
    return await tool_web_search(target, max_results=5)


@tool(
    "detect_changes",
    "Compare previous and current text and summarize changes",
    {"previous": "string", "current": "string"},
)
async def tool_detect_changes(previous: str, current: str) -> str:
    if previous == current:
        return "No changes detected."
    system = "Compare two text snapshots and summarize meaningful differences concisely."
    result = await _llm_generate(system, f"Previous:\n{previous[:3000]}\n\nCurrent:\n{current[:3000]}", max_tokens=1200)
    if _llm_failed(result):
        return f"Changes detected. Previous length={len(previous)}, current length={len(current)}."
    return result


@tool(
    "build_graph",
    "Build a simple entity graph from text",
    {"text": "string"},
)
async def tool_build_graph(text: str) -> str:
    words = re.findall(r"\b[A-Z][a-zA-Z0-9_-]{2,}\b", text)
    entities = sorted(set(words))[:25]
    edges = [{"from": entities[i], "to": entities[i + 1]} for i in range(len(entities) - 1)]
    return json.dumps({"entities": entities, "edges": edges}, ensure_ascii=False)


@tool(
    "set_alerts",
    "Store a collector alert rule",
    {"target": "string", "rule": "string"},
)
async def tool_set_alerts(target: str, rule: str) -> str:
    alert = {"target": target, "rule": rule}
    _COLLECTOR_ALERTS.append(alert)
    return json.dumps({"status": "alert_set", "alert": alert}, ensure_ascii=False)


@tool(
    "search_leads",
    "Search for potential leads on the web",
    {"query": "string", "max_results": "integer (optional, default 10)"},
)
async def tool_search_leads(query: str, max_results: int = 10) -> str:
    return await tool_web_search(query, max_results=max_results)


@tool(
    "enrich_lead",
    "Enrich a lead with inferred context",
    {"lead": "string", "website": "string (optional)"},
)
async def tool_enrich_lead(lead: str, website: str = "") -> str:
    source = await tool_web_fetch(website) if website else await tool_web_search(lead, max_results=3)
    return json.dumps({"lead": lead, "enrichment": source[:2000]}, ensure_ascii=False)


@tool(
    "score_lead",
    "Score a lead against simple qualification criteria",
    {"lead": "string", "criteria": "string (optional)"},
)
async def tool_score_lead(lead: str, criteria: str = "B2B fit, clear need, reachable") -> str:
    score = min(100, 55 + len(lead) % 35)
    return json.dumps({"lead": lead, "score": score, "criteria": criteria}, ensure_ascii=False)


@tool(
    "export_leads",
    "Export leads content to a file",
    {"leads": "string", "path": "string (optional)"},
)
async def tool_export_leads(leads: str, path: str = "exports/leads.txt") -> str:
    return await tool_write_file(path, leads)


@tool(
    "generate_outreach",
    "Generate an outreach message for a lead",
    {"context": "string"},
)
async def tool_generate_outreach(context: str) -> str:
    system = "Write concise high-conviction outbound outreach in the user's language."
    result = await _llm_generate(system, context, max_tokens=900)
    if _llm_failed(result):
        return f"Olá, vi seu trabalho e acredito que existe um bom encaixe. Contexto base: {context[:300]}"
    return result


@tool(
    "collect_signals",
    "Collect external signals for a prediction topic",
    {"query": "string", "max_results": "integer (optional, default 8)"},
)
async def tool_collect_signals(query: str, max_results: int = 8) -> str:
    return await tool_web_search(query, max_results=max_results)


@tool(
    "build_chain",
    "Build a reasoning chain from context",
    {"context": "string"},
)
async def tool_build_chain(context: str) -> str:
    system = "Turn raw context into a short numbered reasoning chain with uncertainties."
    result = await _llm_generate(system, context, max_tokens=1200)
    if _llm_failed(result):
        return f"1. Gather signals. 2. Compare patterns. 3. Estimate likely outcomes. Context excerpt: {context[:400]}"
    return result


@tool(
    "predict",
    "Make a prediction with confidence and rationale",
    {"question": "string", "context": "string (optional)"},
)
async def tool_predict(question: str, context: str = "") -> str:
    system = "Answer with prediction, confidence %, rationale, and what would change your mind."
    result = await _llm_generate(system, f"Question: {question}\n\nContext:\n{context}", max_tokens=1200)
    if _llm_failed(result):
        return json.dumps({"prediction": question, "confidence": 62, "rationale": "Heuristic fallback due to missing provider."}, ensure_ascii=False)
    return result


@tool(
    "track_outcome",
    "Track the outcome of a prediction",
    {"prediction": "string", "outcome": "string"},
)
async def tool_track_outcome(prediction: str, outcome: str) -> str:
    return json.dumps({"prediction": prediction, "outcome": outcome, "tracked": True}, ensure_ascii=False)


@tool(
    "calibrate",
    "Calibrate prediction quality against outcomes",
    {"history": "string"},
)
async def tool_calibrate(history: str) -> str:
    system = "Review prediction history and suggest calibration improvements."
    result = await _llm_generate(system, history, max_tokens=1000)
    if _llm_failed(result):
        return "Calibration fallback: reduce confidence on sparse evidence and increase confidence only with repeated external confirmation."
    return result


@tool(
    "discover_endpoints",
    "Discover likely API endpoints from a base URL or OpenAPI URL",
    {"base_url": "string"},
)
async def tool_discover_endpoints(base_url: str) -> str:
    candidates = [
        base_url.rstrip("/"),
        base_url.rstrip("/") + "/openapi.json",
        base_url.rstrip("/") + "/docs",
        base_url.rstrip("/") + "/swagger.json",
    ]
    results: list[str] = []
    for candidate in candidates:
        try:
            text = await tool_http_request(candidate)
            results.append(f"## {candidate}\n{text[:1800]}")
        except Exception as e:
            results.append(f"## {candidate}\nERROR: {e}")
    return "\n\n".join(results)


@tool(
    "generate_tests",
    "Generate tests from code or endpoint descriptions",
    {"input_text": "string", "framework": "string (optional, default pytest)"},
)
async def tool_generate_tests(input_text: str, framework: str = "pytest") -> str:
    system = f"Generate useful automated tests in {framework}."
    result = await _llm_generate(system, input_text, max_tokens=1800)
    if _llm_failed(result):
        return f"# Fallback test plan for {framework}\n- Cover success path\n- Cover validation errors\n- Cover network/service failure\n"
    return result


@tool(
    "run_suite",
    "Run a local test suite command",
    {"command": "string (optional, default pytest -q)"},
)
async def tool_run_suite(command: str = "pytest -q") -> str:
    return await tool_shell(command)


@tool(
    "check_coverage",
    "Run coverage or inspect an existing coverage report",
    {"command": "string (optional, default pytest --cov=. --cov-report=term-missing)"},
)
async def tool_check_coverage(command: str = "pytest --cov=. --cov-report=term-missing") -> str:
    return await tool_shell(command)


@tool(
    "fuzz_test",
    "Perform a lightweight fuzz test against an HTTP endpoint",
    {"url": "string", "method": "string (optional, default GET)"},
)
async def tool_fuzz_test(url: str, method: str = "GET") -> str:
    variants = [url, url + "?test='\"<script>", url + "?id=../../../etc/passwd"]
    outputs = []
    for variant in variants:
        outputs.append(f"## {variant}\n{await tool_http_request(variant, method=method)}")
    return "\n\n".join(outputs)


@tool(
    "export_report",
    "Export a report to a file",
    {"content": "string", "path": "string (optional)"},
)
async def tool_export_report(content: str, path: str = "reports/report.md") -> str:
    return await tool_write_file(path, content)


@tool(
    "write_article",
    "Write an article or long-form content piece",
    {"topic": "string", "tone": "string (optional)"},
)
async def tool_write_article(topic: str, tone: str = "professional") -> str:
    system = "Write structured long-form content with title, intro, sections and conclusion."
    result = await _llm_generate(system, f"Topic: {topic}\nTone: {tone}", max_tokens=1800)
    if _llm_failed(result):
        return f"# {topic}\n\nIntro\n\nMain points\n\nConclusion"
    return result


@tool(
    "generate_outline",
    "Generate an outline for an article, page, or script",
    {"topic": "string"},
)
async def tool_generate_outline(topic: str) -> str:
    system = "Generate a clean outline with sections and bullet points."
    result = await _llm_generate(system, topic, max_tokens=900)
    if _llm_failed(result):
        return f"1. Introduction to {topic}\n2. Core ideas\n3. Practical examples\n4. Conclusion"
    return result


@tool(
    "proofread",
    "Proofread and improve text clarity",
    {"text": "string"},
)
async def tool_proofread(text: str) -> str:
    system = "Proofread the text, improve clarity, and return the revised version only."
    result = await _llm_generate(system, text, max_tokens=1500)
    if _llm_failed(result):
        return text
    return result


@tool(
    "create_social_post",
    "Create a social media post for a topic",
    {"topic": "string", "platform": "string (optional)"},
)
async def tool_create_social_post(topic: str, platform: str = "x") -> str:
    system = "Write a concise high-engagement social post with hook, body and CTA."
    result = await _llm_generate(system, f"Platform: {platform}\nTopic: {topic}", max_tokens=700)
    if _llm_failed(result):
        return f"Hook: {topic}\nBody: insight + benefit\nCTA: Quer ver mais?"
    return result


@tool(
    "seo_optimize",
    "Optimize copy for SEO and conversion",
    {"text": "string", "keyword": "string (optional)"},
)
async def tool_seo_optimize(text: str, keyword: str = "") -> str:
    system = "Optimize this copy for SEO. Return improved copy plus keyword guidance."
    result = await _llm_generate(system, f"Keyword: {keyword}\n\nText:\n{text}", max_tokens=1400)
    if _llm_failed(result):
        return text
    return result


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
