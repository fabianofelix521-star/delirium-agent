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
