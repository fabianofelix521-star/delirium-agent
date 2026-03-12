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

        # OpenRouter (200+ models gateway)
        if key := os.getenv("OPENROUTER_API_KEY"):
            self.providers["openrouter"] = CustomProvider(
                api_key=key,
                base_url="https://openrouter.ai/api/v1",
                default_model=os.getenv("OPENROUTER_DEFAULT_MODEL", "anthropic/claude-sonnet-4"),
                provider_name="OpenRouter",
                custom_headers={"HTTP-Referer": os.getenv("APP_URL", "http://localhost:3000")},
            )
            self.providers["openrouter"].models = [
                "anthropic/claude-sonnet-4", "anthropic/claude-4-opus",
                "openai/gpt-4o", "openai/o1-preview",
                "google/gemini-2.5-pro", "google/gemini-2.0-flash",
                "meta-llama/llama-4-maverick", "meta-llama/llama-3.1-405b",
                "deepseek/deepseek-r1", "mistralai/mistral-large",
                "qwen/qwen3-coder", "cohere/command-r-plus",
            ]

        # Custom OpenAI-compatible
        if url := os.getenv("CUSTOM_API_BASE_URL"):
            self.providers["custom"] = CustomProvider(
                api_key=os.getenv("CUSTOM_API_KEY", ""),
                base_url=url,
                default_model=os.getenv("CUSTOM_API_MODEL", ""),
                provider_name=os.getenv("CUSTOM_API_NAME", "custom"),
            )

        # Together AI (OpenAI-compatible)
        if key := os.getenv("TOGETHER_API_KEY"):
            self.providers["together"] = CustomProvider(
                api_key=key,
                base_url="https://api.together.xyz/v1",
                default_model=os.getenv("TOGETHER_DEFAULT_MODEL", "meta-llama/Llama-3.1-70B"),
                provider_name="Together AI",
            )
            self.providers["together"].models = [
                "meta-llama/Llama-3.1-70B", "Qwen/Qwen2.5-72B",
                "meta-llama/Llama-3.1-8B", "mistralai/Mixtral-8x7B-v0.1",
            ]

        # Mistral AI (OpenAI-compatible)
        if key := os.getenv("MISTRAL_API_KEY"):
            self.providers["mistral"] = CustomProvider(
                api_key=key,
                base_url="https://api.mistral.ai/v1",
                default_model=os.getenv("MISTRAL_DEFAULT_MODEL", "mistral-large-latest"),
                provider_name="Mistral AI",
            )
            self.providers["mistral"].models = [
                "mistral-large-latest", "codestral-latest",
                "mistral-small-latest", "open-mistral-nemo",
            ]

        # Cohere (OpenAI-compatible)
        if key := os.getenv("COHERE_API_KEY"):
            self.providers["cohere"] = CustomProvider(
                api_key=key,
                base_url="https://api.cohere.ai/v1",
                default_model=os.getenv("COHERE_DEFAULT_MODEL", "command-r-plus"),
                provider_name="Cohere",
            )
            self.providers["cohere"].models = [
                "command-r-plus", "command-r", "command-light",
            ]

        # Set default and fallback
        self.default_provider = os.getenv("DEFAULT_PROVIDER", "alibaba")
        self.fallback_order = [p for p in ["alibaba", "openrouter", "together", "mistral", "cohere",
                                           "groq", "openai", "anthropic", "google", "custom"] if p in self.providers]

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

    def configure_provider(self, name: str, config: dict) -> dict:
        """Hot-reload a provider from UI-provided config (API key, endpoint, etc.)."""
        api_key = config.get("api_key", "").strip()
        if not api_key:
            # Remove provider if key cleared
            if name in self.providers:
                del self.providers[name]
                self.fallback_order = [p for p in self.fallback_order if p != name]
            return {"status": "removed", "provider": name}

        if name == "openai":
            self.providers["openai"] = OpenAIProvider(
                api_key=api_key, org_id=config.get("org_id", ""),
                default_model=config.get("default_model", "gpt-4o"),
            )
        elif name == "anthropic":
            self.providers["anthropic"] = AnthropicProvider(
                api_key=api_key,
                default_model=config.get("default_model", "claude-3-5-sonnet-20241022"),
            )
        elif name == "google":
            self.providers["google"] = GoogleProvider(
                api_key=api_key,
                default_model=config.get("default_model", "gemini-2.0-flash"),
            )
        elif name == "groq":
            self.providers["groq"] = GroqProvider(
                api_key=api_key,
                default_model=config.get("default_model", "llama-3.1-70b-versatile"),
            )
        elif name == "alibaba":
            endpoint = config.get("endpoint", "https://coding-intl.dashscope.aliyuncs.com/v1")
            self.providers["alibaba"] = CustomProvider(
                api_key=api_key, base_url=endpoint,
                default_model=config.get("default_model", "qwen3-coder-plus"),
                provider_name="Alibaba DashScope",
            )
            self.providers["alibaba"].models = [
                "qwen3-coder-plus", "qwen3-coder-next", "qwen3.5-plus",
                "glm-5", "kimi-k2.5", "MiniMax-M2.5",
            ]
        elif name == "openrouter":
            self.providers["openrouter"] = CustomProvider(
                api_key=api_key, base_url="https://openrouter.ai/api/v1",
                default_model=config.get("default_model", "anthropic/claude-sonnet-4"),
                provider_name="OpenRouter",
                custom_headers={"HTTP-Referer": os.getenv("APP_URL", "http://localhost:3000")},
            )
            self.providers["openrouter"].models = [
                "anthropic/claude-sonnet-4", "anthropic/claude-4-opus",
                "openai/gpt-4o", "openai/o1-preview",
                "google/gemini-2.5-pro", "google/gemini-2.0-flash",
                "meta-llama/llama-4-maverick", "meta-llama/llama-3.1-405b",
                "deepseek/deepseek-r1", "mistralai/mistral-large",
                "qwen/qwen3-coder", "cohere/command-r-plus",
            ]
            # Append custom models from config
            custom_models_str = config.get("custom_models", "")
            if custom_models_str:
                existing = set(self.providers["openrouter"].models)
                for m in custom_models_str.splitlines():
                    m = m.strip()
                    if m and m not in existing:
                        self.providers["openrouter"].models.append(m)
        elif name == "together":
            self.providers["together"] = CustomProvider(
                api_key=api_key, base_url="https://api.together.xyz/v1",
                default_model=config.get("default_model", "meta-llama/Llama-3.1-70B"),
                provider_name="Together AI",
            )
            self.providers["together"].models = [
                "meta-llama/Llama-3.1-70B", "Qwen/Qwen2.5-72B",
                "meta-llama/Llama-3.1-8B", "mistralai/Mixtral-8x7B-v0.1",
            ]
        elif name == "mistral":
            self.providers["mistral"] = CustomProvider(
                api_key=api_key, base_url="https://api.mistral.ai/v1",
                default_model=config.get("default_model", "mistral-large-latest"),
                provider_name="Mistral AI",
            )
            self.providers["mistral"].models = [
                "mistral-large-latest", "codestral-latest",
                "mistral-small-latest", "open-mistral-nemo",
            ]
        elif name == "cohere":
            self.providers["cohere"] = CustomProvider(
                api_key=api_key, base_url="https://api.cohere.ai/v1",
                default_model=config.get("default_model", "command-r-plus"),
                provider_name="Cohere",
            )
            self.providers["cohere"].models = [
                "command-r-plus", "command-r", "command-light",
            ]
        elif name == "custom":
            base_url = config.get("base_url", "").strip()
            if not base_url:
                return {"status": "error", "message": "Base URL required for custom provider"}
            self.providers["custom"] = CustomProvider(
                api_key=api_key, base_url=base_url,
                default_model=config.get("model", ""),
                provider_name=config.get("name", "Custom"),
            )
        else:
            return {"status": "error", "message": f"Unknown provider: {name}"}

        # Update fallback order
        all_fallback = ["alibaba", "openrouter", "together", "mistral", "cohere",
                        "groq", "openai", "anthropic", "google", "custom"]
        self.fallback_order = [p for p in all_fallback if p in self.providers]
        return {"status": "configured", "provider": name}

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
