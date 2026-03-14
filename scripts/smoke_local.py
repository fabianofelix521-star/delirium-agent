#!/usr/bin/env python3
"""Local smoke suite for Delirium Infinite backend and hands."""

from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402
from tools.executor import execute_tool  # noqa: E402


ENDPOINTS = [
    "/health",
    "/api/hands",
    "/api/system/metrics",
    "/api/system/services",
    "/api/overview",
    "/api/runtime",
]

HAND_EXPECTATIONS = {
    "researcher": ["deep_dive", "cross_reference", "fact_check"],
    "designer": ["design_layout", "create_palette", "generate_icon"],
    "devops": ["deploy_app", "manage_docker", "configure_ci"],
    "clip": ["download_video", "extract_clip", "format_platform"],
    "crawler": ["crawl_domain", "extract_structured", "build_sitemap"],
    "api-tester": ["discover_endpoints", "local_http_request", "generate_tests"],
}

TOOL_TESTS = [
    ("researcher.deep_dive", "deep_dive", {"query": "open source browser agents", "max_results": 2}),
    ("designer.create_palette", "create_palette", {"brief": "biohacking dashboard with cyan and amber accents"}),
    ("devops.configure_ci", "configure_ci", {"platform": "github-actions", "project_name": "delirium-agent"}),
    ("clip.format_platform", "format_platform", {"platform": "youtube-shorts", "content": "AI agents navegando e executando tarefas reais"}),
    ("crawler.extract_structured", "extract_structured", {"url": "https://example.com"}),
    ("api-tester.local_http_request", "local_http_request", {"url": "http://127.0.0.1:8000/health"}),
]

HAND_TASKS = {
    "researcher": "Investigue rapidamente browser agents open source e sintetize os sinais principais.",
    "designer": "Crie a direção visual de uma página para agente autônomo premium.",
    "devops": "Prepare um plano seguro de deploy e validação para este projeto no Railway.",
    "crawler": "Rastreie example.com e resuma a estrutura principal.",
    "api-tester": "Descubra endpoints do backend local em http://127.0.0.1:8000 e proponha testes.",
    "content-writer": "Escreva um outline sobre agentes autônomos com browser real.",
}

ARG_ERRORS = (
    "unexpected keyword argument",
    "missing 1 required positional argument",
    "Unknown tool:",
)


def pass_line(message: str) -> None:
    print(f"PASS {message}")


def warn_line(message: str) -> None:
    print(f"WARN {message}")


def fail_line(message: str) -> None:
    print(f"FAIL {message}")


def check_endpoints(client: TestClient) -> list[str]:
    failures: list[str] = []
    for path in ENDPOINTS:
        response = client.get(path)
        if response.status_code == 200:
            pass_line(f"endpoint {path} -> 200")
        else:
            failure = f"endpoint {path} -> {response.status_code}"
            fail_line(failure)
            failures.append(failure)
    return failures


def check_hand_payloads(client: TestClient) -> list[str]:
    failures: list[str] = []
    hands = {hand["id"]: hand for hand in client.get("/api/hands").json()["hands"]}
    for hand_id, expected_tools in HAND_EXPECTATIONS.items():
        hand = hands.get(hand_id)
        if not hand:
            failure = f"hand payload missing: {hand_id}"
            fail_line(failure)
            failures.append(failure)
            continue
        missing = [tool for tool in expected_tools if tool not in hand.get("tools", [])]
        if missing:
            failure = f"hand {hand_id} missing tools {missing}"
            fail_line(failure)
            failures.append(failure)
        else:
            pass_line(f"hand {hand_id} exposes expected tools")
    return failures


async def check_tools() -> list[str]:
    failures: list[str] = []
    for label, tool_name, args in TOOL_TESTS:
        result = await execute_tool(tool_name, args)
        output = result["result"] if result["success"] else result["error"] or ""
        if not result["success"]:
            failure = f"tool {label} failed: {output}"
            fail_line(failure)
            failures.append(failure)
            continue
        if "ERROR:" in output and tool_name not in {"clip.format_platform"}:
            failure = f"tool {label} returned runtime error: {output[:180]}"
            fail_line(failure)
            failures.append(failure)
            continue
        pass_line(f"tool {label} executed")
    return failures


def check_hand_runs(client: TestClient) -> list[str]:
    failures: list[str] = []
    for hand_id, task in HAND_TASKS.items():
        response = client.post(f"/api/hands/{hand_id}/run", json={"task": task})
        text = response.text
        if response.status_code != 200:
            failure = f"hand run {hand_id} -> {response.status_code}"
            fail_line(failure)
            failures.append(failure)
            continue
        if any(marker in text for marker in ARG_ERRORS):
            failure = f"hand run {hand_id} has tool-call error"
            fail_line(failure)
            failures.append(failure)
            continue
        if "Executing tool" in text or '{"tool":' in text:
            pass_line(f"hand run {hand_id} emitted tool activity")
            continue
        warn_line(f"hand run {hand_id} returned without visible tool activity")
    return failures


def main_cli() -> int:
    parser = argparse.ArgumentParser(description="Run local Delirium smoke checks")
    parser.add_argument("--mode", choices=["local", "ci"], default="local")
    parser.add_argument("--skip-hand-runs", action="store_true")
    args = parser.parse_args()

    failures: list[str] = []
    with TestClient(main.app) as client:
        failures.extend(check_endpoints(client))
        failures.extend(check_hand_payloads(client))
        failures.extend(asyncio.run(check_tools()))
        if not args.skip_hand_runs:
            failures.extend(check_hand_runs(client))

    if failures:
        print(f"\nSmoke suite finished with {len(failures)} failure(s).")
        return 1

    print("\nSmoke suite finished without hard failures.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main_cli())