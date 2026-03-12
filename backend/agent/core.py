"""
Agent Core - Central orchestrator for the Delirium Infinite agent.
Handles message processing, tool execution, and reasoning loops.
"""

from __future__ import annotations
import json
import re
import time
from dataclasses import dataclass, field
from typing import AsyncGenerator

from providers.base import Message, LLMResponse
from agent.router import router as llm_router
from tools.executor import execute_tool, get_tools_for_prompt, TOOLS


SYSTEM_PROMPT = """You are Delirium Infinite, an autonomous AI agent with REAL access to the user's computer and the internet.

## Available Tools
{tools_description}

## How to Use Tools
When you need to use a tool, respond with ONLY a JSON object like this:
```json
{{"tool": "tool_name", "args": {{"param": "value"}}}}
```

The tool will be executed and you'll receive the result. You can then use another tool or provide your final answer.

## Rules
1. Use tools whenever the user asks something that requires real data (web search, file access, code execution, etc.)
2. For factual questions about current events, ALWAYS use web_search first
3. You can chain multiple tools - search the web, then browse a specific result
4. When executing code, prefer Python
5. Always show the user what you found/did
6. Respond in the same language the user writes in
7. Be proactive - if the user asks about something, search for the latest info
8. For file operations, the default workspace is ~/agent_workspace"""

MAX_TOOL_ITERATIONS = 10


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
        """Process a user message and return the agent's response (non-streaming with tool loop)."""
        convo = self.get_or_create_conversation(conversation_id)

        if not convo.messages:
            convo.messages.append(Message(
                role="system",
                content=SYSTEM_PROMPT.format(tools_description=get_tools_for_prompt()),
            ))

        convo.messages.append(Message(role="user", content=message))
        convo.updated_at = time.time()

        if convo.title == "New Chat":
            convo.title = message[:50] + ("..." if len(message) > 50 else "")

        final_response: LLMResponse | None = None
        for _ in range(MAX_TOOL_ITERATIONS):
            response = await llm_router.chat(convo.messages, provider=provider, model=model)
            convo.messages.append(Message(role="assistant", content=response.content))
            convo.model = response.model
            convo.provider = response.provider
            final_response = response

            tool_call = self._extract_tool_call(response.content)
            if not tool_call:
                break

            result = await execute_tool(tool_call["tool"], tool_call.get("args", {}))
            result_text = result["result"] if result["success"] else f"Error: {result['error']}"
            convo.messages.append(Message(
                role="user",
                content=f"[Tool Result for {tool_call['tool']}]: {result_text}",
            ))

        return final_response  # type: ignore[return-value]

    async def stream_chat(
        self,
        message: str,
        conversation_id: str = "default",
        provider: str | None = None,
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response with automatic tool execution loop."""
        convo = self.get_or_create_conversation(conversation_id)

        if not convo.messages:
            convo.messages.append(Message(
                role="system",
                content=SYSTEM_PROMPT.format(tools_description=get_tools_for_prompt()),
            ))

        convo.messages.append(Message(role="user", content=message))
        convo.updated_at = time.time()

        if convo.title == "New Chat":
            convo.title = message[:50] + ("..." if len(message) > 50 else "")

        for iteration in range(MAX_TOOL_ITERATIONS):
            full_response = ""
            async for token in llm_router.stream(convo.messages, provider=provider, model=model):
                full_response += token
                yield token

            convo.messages.append(Message(role="assistant", content=full_response))

            # Check if LLM wants to call a tool
            tool_call = self._extract_tool_call(full_response)
            if not tool_call:
                break  # No tool call = final answer

            tool_name = tool_call["tool"]
            tool_args = tool_call.get("args", {})

            yield f"\n\n🔧 **Executing tool: {tool_name}**\n"

            result = await execute_tool(tool_name, tool_args)

            if result["success"]:
                yield f"\n```\n{result['result']}\n```\n"
            else:
                yield f"\n❌ Error: {result['error']}\n"

            # Feed tool result back to LLM
            result_text = result["result"] if result["success"] else f"Error: {result['error']}"
            convo.messages.append(Message(
                role="user",
                content=f"[Tool Result for {tool_name}]: {result_text}",
            ))

            yield "\n\n"

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete a conversation."""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]
            return True
        return False

    @staticmethod
    def _extract_tool_call(text: str) -> dict | None:
        """Try to extract a tool call JSON from the LLM response."""
        patterns = [
            r'```json\s*(\{[^`]*"tool"[^`]*\})\s*```',
            r'```\s*(\{[^`]*"tool"[^`]*\})\s*```',
            r'(\{[^{}]*"tool"\s*:\s*"[^"]*"[^{}]*\})',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(1))
                    if "tool" in data and data["tool"] in TOOLS:
                        return data
                except (json.JSONDecodeError, KeyError):
                    continue
        return None


# Global agent instance
agent = AgentOrchestrator()
