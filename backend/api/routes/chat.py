"""Chat API Route - Streaming SSE chat endpoint."""

import json
import uuid
from typing import Optional

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agent.core import agent


router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    provider: Optional[str] = None
    model: Optional[str] = None
    stream: bool = True
    agent_id: Optional[str] = None


class ChatResponse(BaseModel):
    content: str
    conversation_id: str
    model: str
    provider: str
    tokens_used: int


@router.post("/send")
async def send_message(request: ChatRequest):
    """Send a message and get a response (streaming or complete)."""
    conversation_id = request.conversation_id or str(uuid.uuid4())

    if request.stream:
        async def event_stream():
            yield f"data: {json.dumps({'type': 'start', 'conversation_id': conversation_id})}\n\n"
            try:
                async for token in agent.stream_chat(
                    message=request.message,
                    conversation_id=conversation_id,
                    provider=request.provider,
                    model=request.model,
                    agent_id=request.agent_id,
                ):
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")
    else:
        response = await agent.chat(
            message=request.message,
            conversation_id=conversation_id,
            provider=request.provider,
            model=request.model,
            agent_id=request.agent_id,
        )
        return ChatResponse(
            content=response.content,
            conversation_id=conversation_id,
            model=response.model,
            provider=response.provider,
            tokens_used=response.tokens_used,
        )


@router.get("/conversations")
async def list_conversations():
    """List all conversations."""
    return agent.list_conversations()


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a conversation with its messages."""
    if conversation_id not in agent.conversations:
        return {"error": "Conversation not found"}
    convo = agent.conversations[conversation_id]
    return {
        "id": convo.id,
        "title": convo.title,
        "messages": [{"role": m.role, "content": m.content} for m in convo.messages if m.role != "system"],
        "updated_at": convo.updated_at,
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation."""
    deleted = agent.delete_conversation(conversation_id)
    return {"deleted": deleted}
