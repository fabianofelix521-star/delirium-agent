"""Google Gemini LLM Provider"""

from typing import AsyncGenerator
import httpx
from providers.base import BaseProvider, LLMResponse, Message


class GoogleProvider(BaseProvider):
    name = "google"
    models = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"]

    def __init__(self, api_key: str = "", default_model: str = "gemini-1.5-pro") -> None:
        super().__init__(api_key=api_key, base_url="https://generativelanguage.googleapis.com/v1beta", default_model=default_model)

    async def chat(self, messages: list[Message], model: str | None = None,
                   temperature: float = 0.7, max_tokens: int = 4096) -> LLMResponse:
        model = model or self.default_model
        contents = []
        for m in messages:
            role = "user" if m.role in ("user", "system") else "model"
            contents.append({"role": role, "parts": [{"text": m.content}]})

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/models/{model}:generateContent?key={self.api_key}",
                json={
                    "contents": contents,
                    "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return LLMResponse(content=text, model=model, provider=self.name)

    async def stream(self, messages: list[Message], model: str | None = None,
                     temperature: float = 0.7, max_tokens: int = 4096) -> AsyncGenerator[str, None]:
        model = model or self.default_model
        contents = []
        for m in messages:
            role = "user" if m.role in ("user", "system") else "model"
            contents.append({"role": role, "parts": [{"text": m.content}]})

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/models/{model}:streamGenerateContent?alt=sse&key={self.api_key}",
                json={
                    "contents": contents,
                    "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
                },
            ) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        import json
                        chunk = json.loads(line[6:])
                        candidates = chunk.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                yield parts[0].get("text", "")
