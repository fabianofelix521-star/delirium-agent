"""
Agent Core - Central orchestrator for the Delirium Infinite agent.
Handles message processing, tool execution, reasoning loops, and multi-agent routing.
"""

from __future__ import annotations
import json
import re
import time
from dataclasses import dataclass, field
from typing import AsyncGenerator

from providers.base import Message, LLMResponse
from agent.router import router as llm_router
from agent.agents import AGENTS, get_agent, get_agent_system_prompt
from tools.executor import execute_tool, get_tools_for_prompt, TOOLS


DEFAULT_SYSTEM_PROMPT = """You are **Delirium Infinite** — an elite autonomous AI agent with REAL access to the user's computer, internet, GitHub, Supabase, and shell. You are more capable than ChatGPT, Claude, or any commercial assistant because you can actually *execute* actions, not just suggest them.

## Your Capabilities
- **Execute code** (Python, Node.js, Bash) in real-time
- **Browse the web** — search DuckDuckGo, fetch/scrape any URL
- **Full file system access** — read, write, list, search files
- **Shell commands** — run any terminal command (git, npm, pip, etc.)
- **GitHub integration** — list repos, create repos, read files, manage issues
- **Supabase integration** — query tables, call RPC functions, manage storage
- **Multi-step reasoning** — chain tools automatically until the task is complete
- **Multi-agent system** — specialized agents for design, coding, research, and more

## Available Tools
{tools_description}

## How to Use Tools
When you need to use a tool, respond with ONLY a JSON object:
```json
{{"tool": "tool_name", "args": {{"param": "value"}}}}
```
The tool executes immediately and you receive the result. You can chain up to 10 tools per request.

## Autonomous Agent Rules
1. **ALWAYS use tools** for tasks requiring real data — never guess when you can look up
2. **Current events** → use web_search FIRST, then web_browse for details
3. **Chain tools fearlessly** — search → browse → extract → write file → commit
4. **Show your work** — tell the user what you're doing at each step
5. **Match the user's language** — if they write in Portuguese, respond in Portuguese
6. **Be proactive** — anticipate what the user needs next
7. **Code quality** — when writing code, make it production-ready with proper error handling
8. **File workspace** — default at ~/agent_workspace, organize files logically
9. **Error recovery** — if a tool fails, try an alternative approach
10. **Security first** — never expose credentials, validate inputs, block dangerous commands

## Response Style
- Be concise but thorough
- Use markdown formatting (headers, bold, code blocks, lists)
- For code: always specify the language in code blocks
- For long outputs: summarize key points first, then show details
- When showing tool results: format them nicely, don't dump raw JSON"""

MAX_TOOL_ITERATIONS = 10


def _build_system_prompt(agent_id: str | None = None) -> str:
    """Build system prompt — from the agent registry or fallback to default."""
    tools_desc = get_tools_for_prompt()
    if agent_id and agent_id in AGENTS:
        return get_agent_system_prompt(agent_id, tools_desc)
    return DEFAULT_SYSTEM_PROMPT.format(tools_description=tools_desc)


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
    agent_id: str = ""


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
        agent_id: str | None = None,
        system_prompt: str | None = None,
    ) -> LLMResponse:
        """Process a user message and return the agent's response (non-streaming with tool loop)."""
        convo = self.get_or_create_conversation(conversation_id)

        # Set or update agent for this conversation
        if agent_id:
            convo.agent_id = agent_id

        # Always apply system_prompt override when provided (e.g. code page)
        if system_prompt:
            if convo.messages and convo.messages[0].role == "system":
                convo.messages[0] = Message(role="system", content=system_prompt)
            else:
                convo.messages.insert(0, Message(role="system", content=system_prompt))
        elif not convo.messages:
            prompt = _build_system_prompt(convo.agent_id or agent_id)
            convo.messages.append(Message(
                role="system",
                content=prompt,
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
        agent_id: str | None = None,
        system_prompt: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response with automatic tool execution loop."""
        convo = self.get_or_create_conversation(conversation_id)

        # Set or update agent for this conversation
        if agent_id:
            convo.agent_id = agent_id

        # Always apply system_prompt override when provided (e.g. code page)
        if system_prompt:
            if convo.messages and convo.messages[0].role == "system":
                convo.messages[0] = Message(role="system", content=system_prompt)
            else:
                convo.messages.insert(0, Message(role="system", content=system_prompt))
        elif not convo.messages:
            prompt = _build_system_prompt(convo.agent_id or agent_id)
            convo.messages.append(Message(
                role="system",
                content=prompt,
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
        # Strip <think> blocks so tool calls aren't hidden inside them
        cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
        patterns = [
            r'```json\s*(\{[^`]*"tool"[^`]*\})\s*```',
            r'```\s*(\{[^`]*"tool"[^`]*\})\s*```',
            r'(\{[^{}]*"tool"\s*:\s*"[^"]*"[^{}]*\})',
        ]
        for pattern in patterns:
            match = re.search(pattern, cleaned, re.DOTALL)
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
