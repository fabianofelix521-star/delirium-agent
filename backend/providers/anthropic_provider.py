"""Anthropic (Claude) LLM Provider"""

from typing import AsyncGenerator
import httpx
from providers.base import BaseProvider, LLMResponse, Message


class AnthropicProvider(BaseProvider):
    name = "anthropic"
    models = ["claude-3-opus-20240229", "claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"]

    def __init__(self, api_key: str = "", default_model: str = "claude-3-5-sonnet-20241022") -> None:
        super().__init__(api_key=api_key, base_url="https://api.anthropic.com/v1", default_model=default_model)

    def _headers(self) -> dict[str, str]:
        return {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

    def _format_messages(self, messages: list[Message]) -> tuple[str, list[dict]]:
        system = ""
        formatted = []
        for m in messages:
            if m.role == "system":
                system = m.content
            else:
                formatted.append({"role": m.role, "content": m.content})
        return system, formatted

    async def chat(self, messages: list[Message], model: str | None = None,
                   temperature: float = 0.7, max_tokens: int = 4096) -> LLMResponse:
        model = model or self.default_model
        system, msgs = self._format_messages(messages)
        body: dict = {"model": model, "messages": msgs, "max_tokens": max_tokens, "temperature": temperature}
        if system:
            body["system"] = system
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(f"{self.base_url}/messages", headers=self._headers(), json=body)
            resp.raise_for_status()
            data = resp.json()
            return LLMResponse(
                content=data["content"][0]["text"],
                model=model,
                provider=self.name,
                tokens_used=data.get("usage", {}).get("input_tokens", 0) + data.get("usage", {}).get("output_tokens", 0),
                finish_reason=data.get("stop_reason", "stop"),
            )

    async def stream(self, messages: list[Message], model: str | None = None,
                     temperature: float = 0.7, max_tokens: int = 4096) -> AsyncGenerator[str, None]:
        model = model or self.default_model
        system, msgs = self._format_messages(messages)
        body: dict = {"model": model, "messages": msgs, "max_tokens": max_tokens, "temperature": temperature, "stream": True}
        if system:
            body["system"] = system
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{self.base_url}/messages", headers=self._headers(), json=body) as resp:
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        import json
                        event = json.loads(line[6:])
                        if event.get("type") == "content_block_delta":
                            yield event["delta"].get("text", "")
