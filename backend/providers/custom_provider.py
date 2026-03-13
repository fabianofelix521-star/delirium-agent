"""Custom OpenAI-Compatible Provider - Works with any OpenAI-compatible API"""

from typing import AsyncGenerator
import json
import httpx
from providers.base import BaseProvider, LLMResponse, Message


class CustomProvider(BaseProvider):
    """Generic provider for any OpenAI-compatible endpoint (Together, Mistral, Cohere, LM Studio, etc.)."""
    
    name = "custom"
    models: list[str] = []

    def __init__(self, api_key: str = "", base_url: str = "", default_model: str = "",
                 provider_name: str = "custom", custom_headers: dict[str, str] | None = None) -> None:
        super().__init__(api_key=api_key, base_url=base_url.rstrip("/"), default_model=default_model)
        self.name = provider_name
        self.custom_headers = custom_headers or {}

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        headers.update(self.custom_headers)
        return headers

    async def chat(self, messages: list[Message], model: str | None = None,
                   temperature: float = 0.7, max_tokens: int = 8192) -> LLMResponse:
        model = model or self.default_model
        payload: dict = {"model": model, "messages": [{"role": m.role, "content": m.content} for m in messages],
                      "temperature": temperature, "max_tokens": max_tokens}
        # Qwen3 thinking support: use thinking budget to reduce latency
        if "qwen3" in (model or "").lower():
            payload["extra_body"] = {"enable_thinking": True, "thinking_budget": 1024}
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=model, provider=self.name,
                tokens_used=data.get("usage", {}).get("total_tokens", 0),
            )

    async def stream(self, messages: list[Message], model: str | None = None,
                     temperature: float = 0.7, max_tokens: int = 8192) -> AsyncGenerator[str, None]:
        model = model or self.default_model
        payload: dict = {"model": model, "messages": [{"role": m.role, "content": m.content} for m in messages],
                      "temperature": temperature, "max_tokens": max_tokens, "stream": True}
        if "qwen3" in (model or "").lower():
            payload["extra_body"] = {"enable_thinking": True, "thinking_budget": 1024}
        async with httpx.AsyncClient(timeout=180) as client:
            async with client.stream(
                "POST", f"{self.base_url}/chat/completions", headers=self._headers(),
                json=payload,
            ) as resp:
                if resp.status_code != 200:
                    body = await resp.aread()
                    raise RuntimeError(f"{self.name} API error {resp.status_code}: {body.decode()}")
                async for line in resp.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        chunk = json.loads(line[6:])
                        delta = chunk["choices"][0].get("delta", {})
                        if content := delta.get("content"):
                            yield content
