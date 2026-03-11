"""Ollama Local LLM Provider"""

from typing import AsyncGenerator
import httpx
from providers.base import BaseProvider, LLMResponse, Message


class OllamaProvider(BaseProvider):
    name = "ollama"
    models = ["qwen2.5-coder:32b", "llama3.1:70b", "mistral:7b", "codellama:13b"]

    def __init__(self, base_url: str = "http://localhost:11434", default_model: str = "qwen2.5-coder:32b") -> None:
        super().__init__(base_url=base_url, default_model=default_model)

    async def chat(self, messages: list[Message], model: str | None = None,
                   temperature: float = 0.7, max_tokens: int = 4096) -> LLMResponse:
        model = model or self.default_model
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": m.role, "content": m.content} for m in messages],
                    "options": {"temperature": temperature, "num_predict": max_tokens},
                    "stream": False,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return LLMResponse(
                content=data["message"]["content"],
                model=model,
                provider=self.name,
                tokens_used=data.get("eval_count", 0),
            )

    async def stream(self, messages: list[Message], model: str | None = None,
                     temperature: float = 0.7, max_tokens: int = 4096) -> AsyncGenerator[str, None]:
        model = model or self.default_model
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": m.role, "content": m.content} for m in messages],
                    "options": {"temperature": temperature, "num_predict": max_tokens},
                    "stream": True,
                },
            ) as resp:
                import json
                async for line in resp.aiter_lines():
                    if line.strip():
                        chunk = json.loads(line)
                        if not chunk.get("done", False):
                            yield chunk.get("message", {}).get("content", "")

    async def list_local_models(self) -> list[str]:
        """List models installed in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                return [m["name"] for m in data.get("models", [])]
        except Exception:
            return []

    async def test_connection(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False
