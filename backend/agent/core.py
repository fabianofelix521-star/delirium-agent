"""
Agent Core - Central orchestrator for the Delirium Infinite agent.
Handles message processing, tool execution, and reasoning loops.
"""

from __future__ import annotations
import json
import time
from dataclasses import dataclass, field
from typing import AsyncGenerator

from providers.base import Message, LLMResponse
from agent.router import router as llm_router


SYSTEM_PROMPT = """You are Delirium Infinite, an autonomous AI assistant with full system access.
You can execute code, browse the web, manage files, send messages, and much more.
You have access to the following tools:

{tools_description}

When you need to use a tool, respond with a JSON object:
{{"tool": "tool_name", "args": {{"param": "value"}}}}

Always think step by step. Be helpful, precise, and proactive.
Respond in the same language the user writes in."""


@dataclass
class Conversation:
    """A conversation with message history."""
    id: str
    title: str = "New Chat"
    messages: list[Message] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    model: str = ""
    provider: str = ""


class AgentOrchestrator:
    """Central agent that processes messages through the LLM and executes tools."""

    def __init__(self) -> None:
        self.conversations: dict[str, Conversation] = {}
        self.tools: dict[str, dict] = {}

    def get_or_create_conversation(self, conversation_id: str) -> Conversation:
        """Get an existing conversation or create a new one."""
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = Conversation(id=conversation_id)
        return self.conversations[conversation_id]

    def list_conversations(self) -> list[dict]:
        """List all conversations sorted by most recent."""
        convos = sorted(self.conversations.values(), key=lambda c: c.updated_at, reverse=True)
        return [
            {"id": c.id, "title": c.title, "updated_at": c.updated_at, "message_count": len(c.messages)}
            for c in convos
        ]

    async def chat(
        self,
        message: str,
        conversation_id: str = "default",
        provider: str | None = None,
        model: str | None = None,
    ) -> LLMResponse:
        """Process a user message and return the agent's response."""
        convo = self.get_or_create_conversation(conversation_id)

        # Add system prompt if first message
        if not convo.messages:
            convo.messages.append(Message(role="system", content=SYSTEM_PROMPT.format(tools_description=self._get_tools_description())))

        # Add user message
        convo.messages.append(Message(role="user", content=message))
        convo.updated_at = time.time()

        # Auto-title from first message
        if convo.title == "New Chat":
            convo.title = message[:50] + ("..." if len(message) > 50 else "")

        # Get LLM response
        response = await llm_router.chat(convo.messages, provider=provider, model=model)

        # Add assistant message
        convo.messages.append(Message(role="assistant", content=response.content))
        convo.model = response.model
        convo.provider = response.provider

        return response

    async def stream_chat(
        self,
        message: str,
        conversation_id: str = "default",
        provider: str | None = None,
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response token by token."""
        convo = self.get_or_create_conversation(conversation_id)

        if not convo.messages:
            convo.messages.append(Message(role="system", content=SYSTEM_PROMPT.format(tools_description=self._get_tools_description())))

        convo.messages.append(Message(role="user", content=message))
        convo.updated_at = time.time()

        if convo.title == "New Chat":
            convo.title = message[:50] + ("..." if len(message) > 50 else "")

        full_response = ""
        async for token in llm_router.stream(convo.messages, provider=provider, model=model):
            full_response += token
            yield token

        convo.messages.append(Message(role="assistant", content=full_response))

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
            return True
        return False

    def _get_tools_description(self) -> str:
        """Get formatted tool descriptions for the system prompt."""
        if not self.tools:
            return "No tools currently available."
        lines = []
        for name, tool in self.tools.items():
            lines.append(f"- {name}: {tool.get('description', 'No description')}")
        return "\n".join(lines)


# Global agent instance
agent = AgentOrchestrator()
