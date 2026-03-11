"""
LLM Router - Intelligent multi-provider routing with fallback.
Selects the best model based on task type, cost, and availability.
"""

import os
from typing import AsyncGenerator

from providers.base import BaseProvider, LLMResponse, Message
from providers.openai_provider import OpenAIProvider
from providers.anthropic_provider import AnthropicProvider
from providers.google_provider import GoogleProvider
from providers.ollama_provider import OllamaProvider
from providers.groq_provider import GroqProvider
from providers.custom_provider import CustomProvider


class LLMRouter:
    """Routes requests to the optimal LLM provider with auto-fallback."""

    def __init__(self) -> None:
        self.providers: dict[str, BaseProvider] = {}
        self.fallback_order: list[str] = []
        self.default_provider: str = ""
        self._load_providers()

    def _load_providers(self) -> None:
        """Initialize all configured providers from environment variables."""
        # Ollama (local)
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.providers["ollama"] = OllamaProvider(
            base_url=ollama_url,
            default_model=os.getenv("OLLAMA_DEFAULT_MODEL", "qwen2.5-coder:32b"),
        )

        # OpenAI
        if key := os.getenv("OPENAI_API_KEY"):
            self.providers["openai"] = OpenAIProvider(
                api_key=key,
                org_id=os.getenv("OPENAI_ORG_ID", ""),
                default_model=os.getenv("OPENAI_DEFAULT_MODEL", "gpt-4o"),
            )

        # Anthropic
        if key := os.getenv("ANTHROPIC_API_KEY"):
            self.providers["anthropic"] = AnthropicProvider(
                api_key=key,
                default_model=os.getenv("ANTHROPIC_DEFAULT_MODEL", "claude-3-5-sonnet-20241022"),
            )

        # Google
        if key := os.getenv("GOOGLE_API_KEY"):
            self.providers["google"] = GoogleProvider(
                api_key=key,
                default_model=os.getenv("GOOGLE_DEFAULT_MODEL", "gemini-1.5-pro"),
            )

        # Groq
        if key := os.getenv("GROQ_API_KEY"):
            self.providers["groq"] = GroqProvider(
                api_key=key,
                default_model=os.getenv("GROQ_DEFAULT_MODEL", "llama-3.1-70b-versatile"),
            )

        # Alibaba Cloud / DashScope (OpenAI-compatible)
        if key := os.getenv("ALIBABA_API_KEY"):
            self.providers["alibaba"] = CustomProvider(
                api_key=key,
                base_url=os.getenv("ALIBABA_ENDPOINT", "https://coding-intl.dashscope.aliyuncs.com/v1"),
                default_model=os.getenv("ALIBABA_DEFAULT_MODEL", "qwen3-coder-plus"),
                provider_name="Alibaba DashScope",
            )
            self.providers["alibaba"].models = [
                "qwen3-coder-plus", "qwen3-coder-next", "qwen3.5-plus",
                "glm-5", "kimi-k2.5", "MiniMax-M2.5",
            ]

        # Custom OpenAI-compatible
        if url := os.getenv("CUSTOM_API_BASE_URL"):
            self.providers["custom"] = CustomProvider(
                api_key=os.getenv("CUSTOM_API_KEY", ""),
                base_url=url,
                default_model=os.getenv("CUSTOM_API_MODEL", ""),
                provider_name=os.getenv("CUSTOM_API_NAME", "custom"),
            )

        # Set default and fallback
        self.default_provider = os.getenv("DEFAULT_PROVIDER", "ollama")
        self.fallback_order = [p for p in ["ollama", "alibaba", "groq", "openai", "anthropic", "google", "custom"] if p in self.providers]

    def get_provider(self, name: str | None = None) -> BaseProvider:
        """Get a specific provider or the default one."""
        name = name or self.default_provider
        if name not in self.providers:
            raise ValueError(f"Provider '{name}' not configured. Available: {list(self.providers.keys())}")
        return self.providers[name]

    async def chat(
        self,
        messages: list[Message],
        provider: str | None = None,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> LLMResponse:
        """Send a chat request with auto-fallback on failure."""
        if provider:
            providers_to_try = [provider]
        else:
            providers_to_try = [self.default_provider] + [p for p in self.fallback_order if p != self.default_provider]

        last_error: Exception | None = None
        for prov_name in providers_to_try:
            if prov_name not in self.providers:
                continue
            try:
                return await self.providers[prov_name].chat(messages, model, temperature, max_tokens)
            except Exception as e:
                last_error = e
                if not os.getenv("ENABLE_AUTO_FALLBACK", "true").lower() == "true":
                    raise

        raise last_error or RuntimeError("No providers available")

    async def stream(
        self,
        messages: list[Message],
        provider: str | None = None,
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response with auto-fallback on failure."""
        if provider:
            providers_to_try = [provider]
        else:
            # Try default provider first, then fallback order
            providers_to_try = [self.default_provider] + [p for p in self.fallback_order if p != self.default_provider]

        last_error: Exception | None = None
        for prov_name in providers_to_try:
            if prov_name not in self.providers:
                continue
            try:
                async for token in self.providers[prov_name].stream(messages, model, temperature, max_tokens):
                    yield token
                return
            except Exception as e:
                last_error = e
                if not os.getenv("ENABLE_AUTO_FALLBACK", "true").lower() == "true":
                    raise

        raise last_error or RuntimeError("No providers available")

    def list_providers(self) -> list[dict]:
        """List all configured providers and their models."""
        result = []
        for name, provider in self.providers.items():
            result.append({
                "name": name,
                "display_name": provider.name,
                "models": provider.get_models(),
                "default_model": provider.default_model,
                "is_default": name == self.default_provider,
            })
        return result


# Global router instance
router = LLMRouter()
