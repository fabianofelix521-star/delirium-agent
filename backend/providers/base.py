"""
LLM Provider Base Class
All providers implement this interface for unified access.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncGenerator


@dataclass
class Message:
    """A chat message."""
    role: str  # "system", "user", "assistant"
    content: str


@dataclass
class LLMResponse:
    """Response from an LLM provider."""
    content: str
    model: str
    provider: str
    tokens_used: int = 0
    cost_usd: float = 0.0
    finish_reason: str = "stop"
    metadata: dict = field(default_factory=dict)


class BaseProvider(ABC):
    """Abstract base class for all LLM providers."""

    name: str = "base"
    models: list[str] = []

    def __init__(self, api_key: str = "", base_url: str = "", default_model: str = "") -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.default_model = default_model

    @abstractmethod
    async def chat(
        self,
        messages: list[Message],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        """Send a chat request and get a complete response."""
        ...

    @abstractmethod
    async def stream(
        self,
        messages: list[Message],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response token by token."""
        ...

    async def test_connection(self) -> bool:
        """Test if the provider is reachable and the API key is valid."""
        try:
            response = await self.chat(
                [Message(role="user", content="Say 'ok'.")],
                max_tokens=10,
            )
            return len(response.content) > 0
        except Exception:
            return False

    def get_models(self) -> list[str]:
        """Return available models for this provider."""
        return self.models
