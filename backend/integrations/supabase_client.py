"""Supabase Integration - Direct API tools for the Delirium Agent."""

import os
from typing import Any

import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def _headers(use_service: bool = False) -> dict[str, str]:
    key = SUPABASE_SERVICE_KEY if use_service and SUPABASE_SERVICE_KEY else SUPABASE_KEY
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


async def supabase_query(table: str, method: str = "GET", params: dict | None = None, body: Any = None) -> dict:
    """Execute a Supabase REST API query."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"error": "Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env"}

    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if params:
        query_parts = []
        for k, v in params.items():
            query_parts.append(f"{k}={v}")
        url += "?" + "&".join(query_parts)

    headers = _headers()
    if method in ("POST", "PATCH"):
        headers["Prefer"] = "return=representation"

    async with httpx.AsyncClient(timeout=15) as client:
        if method == "GET":
            resp = await client.get(url, headers=headers)
        elif method == "POST":
            resp = await client.post(url, headers=headers, json=body)
        elif method == "PATCH":
            resp = await client.patch(url, headers=headers, json=body)
        elif method == "DELETE":
            resp = await client.delete(url, headers=headers)
        else:
            return {"error": f"Unsupported method: {method}"}

    if resp.status_code >= 400:
        return {"error": f"Supabase error {resp.status_code}: {resp.text}"}
    try:
        return {"data": resp.json()}
    except Exception:
        return {"data": resp.text}


async def supabase_rpc(function_name: str, params: dict | None = None) -> dict:
    """Call a Supabase Edge Function or RPC."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"error": "Supabase not configured."}

    url = f"{SUPABASE_URL}/rest/v1/rpc/{function_name}"
    headers = _headers()

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, json=params or {})

    if resp.status_code >= 400:
        return {"error": f"RPC error {resp.status_code}: {resp.text}"}
    try:
        return {"data": resp.json()}
    except Exception:
        return {"data": resp.text}


async def supabase_sql(query: str) -> dict:
    """Execute raw SQL via Supabase's pg endpoint (requires service key)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"error": "Supabase service key required for SQL. Set SUPABASE_SERVICE_KEY in .env"}

    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    headers = _headers(use_service=True)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, json={"query": query})

    if resp.status_code >= 400:
        return {"error": f"SQL error {resp.status_code}: {resp.text}"}
    try:
        return {"data": resp.json()}
    except Exception:
        return {"data": resp.text}


async def supabase_storage_list(bucket: str, prefix: str = "") -> dict:
    """List files in a Supabase storage bucket."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"error": "Supabase not configured."}

    url = f"{SUPABASE_URL}/storage/v1/object/list/{bucket}"
    headers = _headers()

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, headers=headers, json={"prefix": prefix, "limit": 100})

    if resp.status_code >= 400:
        return {"error": f"Storage error {resp.status_code}: {resp.text}"}
    try:
        return {"data": resp.json()}
    except Exception:
        return {"data": resp.text}
