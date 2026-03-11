"""GitHub API Route - Repository management and file browsing."""

import os
from typing import Optional

import httpx
from fastapi import APIRouter, Query

router = APIRouter()

GITHUB_API = "https://api.github.com"


def _get_token() -> Optional[str]:
    return os.getenv("GITHUB_TOKEN")


def _headers() -> dict:
    token = _get_token()
    h = {"Accept": "application/vnd.github.v3+json"}
    if token:
        h["Authorization"] = f"token {token}"
    return h


@router.get("/status")
async def github_status():
    """Check if GitHub is connected (token configured)."""
    token = _get_token()
    if not token:
        return {"connected": False, "message": "No GITHUB_TOKEN configured"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{GITHUB_API}/user", headers=_headers())
            if resp.status_code == 200:
                user = resp.json()
                return {
                    "connected": True,
                    "username": user.get("login"),
                    "name": user.get("name"),
                    "avatar": user.get("avatar_url"),
                }
            return {"connected": False, "message": "Invalid token"}
    except Exception as e:
        return {"connected": False, "message": str(e)}


@router.get("/repos")
async def list_repos(
    sort: str = Query(default="updated", regex="^(updated|pushed|created|full_name)$"),
    per_page: int = Query(default=30, le=100),
):
    """List authenticated user's repositories."""
    token = _get_token()
    if not token:
        return {"repos": [], "error": "No GITHUB_TOKEN configured"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{GITHUB_API}/user/repos",
                headers=_headers(),
                params={"sort": sort, "per_page": per_page, "type": "owner"},
            )
            if resp.status_code != 200:
                return {"repos": [], "error": f"GitHub API error: {resp.status_code}"}

            repos = resp.json()
            return {
                "repos": [
                    {
                        "name": r["name"],
                        "full_name": r["full_name"],
                        "description": r.get("description", ""),
                        "language": r.get("language", ""),
                        "default_branch": r.get("default_branch", "main"),
                        "updated_at": r.get("updated_at", ""),
                        "html_url": r.get("html_url", ""),
                        "private": r.get("private", False),
                    }
                    for r in repos
                ]
            }
    except Exception as e:
        return {"repos": [], "error": str(e)}


@router.get("/repos/{owner}/{repo}/tree")
async def get_repo_tree(owner: str, repo: str, branch: Optional[str] = None):
    """Get file tree for a repository."""
    token = _get_token()
    if not token:
        return {"tree": [], "error": "No GITHUB_TOKEN configured"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            # Get default branch if not specified
            if not branch:
                repo_resp = await client.get(
                    f"{GITHUB_API}/repos/{owner}/{repo}",
                    headers=_headers(),
                )
                if repo_resp.status_code == 200:
                    branch = repo_resp.json().get("default_branch", "main")
                else:
                    branch = "main"

            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/{branch}",
                headers=_headers(),
                params={"recursive": "1"},
            )
            if resp.status_code != 200:
                return {"tree": [], "error": f"GitHub API error: {resp.status_code}"}

            items = resp.json().get("tree", [])

            # Build nested tree structure
            root: list[dict] = []
            dirs: dict[str, dict] = {}

            for item in sorted(items, key=lambda x: x["path"]):
                parts = item["path"].split("/")
                node = {
                    "name": parts[-1],
                    "type": "folder" if item["type"] == "tree" else "file",
                    "path": item["path"],
                }
                if item["type"] == "tree":
                    node["children"] = []
                    dirs[item["path"]] = node

                parent_path = "/".join(parts[:-1])
                if parent_path and parent_path in dirs:
                    dirs[parent_path]["children"].append(node)
                elif not parent_path:
                    root.append(node)

            return {"tree": root}
    except Exception as e:
        return {"tree": [], "error": str(e)}


@router.get("/repos/{owner}/{repo}/file")
async def get_file_content(owner: str, repo: str, path: str = Query(...)):
    """Get file content from a repository."""
    token = _get_token()
    if not token:
        return {"content": "", "error": "No GITHUB_TOKEN configured"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}",
                headers=_headers(),
            )
            if resp.status_code != 200:
                return {"content": "", "error": f"GitHub API error: {resp.status_code}"}

            data = resp.json()
            if data.get("encoding") == "base64":
                import base64
                content = base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            else:
                content = data.get("content", "")

            return {
                "content": content,
                "name": data.get("name", ""),
                "path": data.get("path", ""),
                "size": data.get("size", 0),
                "sha": data.get("sha", ""),
            }
    except Exception as e:
        return {"content": "", "error": str(e)}
