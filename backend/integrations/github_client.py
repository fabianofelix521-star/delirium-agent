"""GitHub Integration - Direct API tools for the Delirium Agent."""

import os

import httpx

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GITHUB_API = "https://api.github.com"


def _headers() -> dict[str, str]:
    h = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


async def github_request(method: str, path: str, body: dict | None = None) -> dict:
    """Make an authenticated GitHub API request."""
    if not GITHUB_TOKEN:
        return {"error": "GitHub not configured. Set GITHUB_TOKEN in .env"}

    url = f"{GITHUB_API}{path}"
    async with httpx.AsyncClient(timeout=20) as client:
        if method == "GET":
            resp = await client.get(url, headers=_headers())
        elif method == "POST":
            resp = await client.post(url, headers=_headers(), json=body)
        elif method == "PATCH":
            resp = await client.patch(url, headers=_headers(), json=body)
        elif method == "PUT":
            resp = await client.put(url, headers=_headers(), json=body)
        elif method == "DELETE":
            resp = await client.delete(url, headers=_headers())
        else:
            return {"error": f"Unsupported method: {method}"}

    if resp.status_code >= 400:
        return {"error": f"GitHub API {resp.status_code}: {resp.text[:500]}"}
    try:
        return {"data": resp.json()}
    except Exception:
        return {"data": resp.text}


async def github_list_repos(per_page: int = 30, sort: str = "updated") -> dict:
    """List authenticated user's repositories."""
    return await github_request("GET", f"/user/repos?per_page={per_page}&sort={sort}")


async def github_create_repo(name: str, description: str = "", private: bool = False) -> dict:
    """Create a new repository."""
    return await github_request("POST", "/user/repos", {
        "name": name,
        "description": description,
        "private": private,
        "auto_init": True,
    })


async def github_get_file(owner: str, repo: str, path: str, ref: str = "main") -> dict:
    """Get a file's content from a repository."""
    return await github_request("GET", f"/repos/{owner}/{repo}/contents/{path}?ref={ref}")


async def github_create_or_update_file(
    owner: str, repo: str, path: str, content_b64: str,
    message: str, sha: str | None = None, branch: str = "main"
) -> dict:
    """Create or update a file in a repo (content must be base64-encoded)."""
    body: dict = {
        "message": message,
        "content": content_b64,
        "branch": branch,
    }
    if sha:
        body["sha"] = sha
    return await github_request("PUT", f"/repos/{owner}/{repo}/contents/{path}", body)


async def github_list_issues(owner: str, repo: str, state: str = "open") -> dict:
    """List issues for a repository."""
    return await github_request("GET", f"/repos/{owner}/{repo}/issues?state={state}&per_page=30")


async def github_create_issue(owner: str, repo: str, title: str, body: str = "") -> dict:
    """Create a new issue."""
    return await github_request("POST", f"/repos/{owner}/{repo}/issues", {
        "title": title, "body": body,
    })


async def github_create_pr(
    owner: str, repo: str, title: str, head: str, base: str = "main", body: str = ""
) -> dict:
    """Create a pull request."""
    return await github_request("POST", f"/repos/{owner}/{repo}/pulls", {
        "title": title, "head": head, "base": base, "body": body,
    })


async def github_search_code(query: str) -> dict:
    """Search code on GitHub."""
    return await github_request("GET", f"/search/code?q={query}&per_page=10")
