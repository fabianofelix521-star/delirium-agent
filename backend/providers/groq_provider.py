"""Groq LLM Provider - Ultra-fast inference"""

from typing import AsyncGenerator
import httpx
from providers.base import BaseProvider, LLMResponse, Message


class GroqProvider(BaseProvider):
    name = "groq"
    models = ["llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"]

    def __init__(self, api_key: str = "", default_model: str = "llama-3.1-70b-versatile") -> None:
        super().__init__(api_key=api_key, base_url="https://api.groq.com/openai/v1", default_model=default_model)

    def _headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

    async def chat(self, messages: list[Message], model: str | None = None,
                   temperature: float = 0.7, max_tokens: int = 4096) -> LLMResponse:
        model = model or self.default_model
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._headers(),
                json={"model": model, "messages": [{"role": m.role, "content": m.content} for m in messages],
                      "temperature": temperature, "max_tokens": max_tokens},
            )
            resp.raise_for_status()
            data = resp.json()
            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
                model=model, provider=self.name,
                tokens_used=data.get("usage", {}).get("total_tokens", 0),
            )

    async def stream(self, messages: list[Message], model: str | None = None,
                     temperature: float = 0.7, max_tokens: int = 4096) -> AsyncGenerator[str, None]:
        model = model or self.default_model
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream(
                "POST", f"{self.base_url}/chat/completions", headers=self._headers(),
                json={"model": model, "messages": [{"role": m.role, "content": m.content} for m in messages],
                      "temperature": temperature, "max_tokens": max_tokens, "stream": True},
            ) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        import json
                        chunk = json.loads(line[6:])
                        delta = chunk["choices"][0].get("delta", {})
                        if content := delta.get("content"):
                            yield content
