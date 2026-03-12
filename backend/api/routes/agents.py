"""Agents API Route - Multi-agent registry management."""

from fastapi import APIRouter

from agent.agents import list_agents, get_agent, AGENTS

router = APIRouter()


@router.get("")
@router.get("/")
async def get_agents() -> list[dict]:
    """List all available agents (without full prompts)."""
    return list_agents()


@router.get("/{agent_id}")
async def get_agent_detail(agent_id: str) -> dict:
    """Get full details for a specific agent."""
    agent = get_agent(agent_id)
    if not agent:
        return {"error": "Agent not found"}
    return {
        "id": agent["id"],
        "name": agent["name"],
        "role": agent["role"],
        "icon": agent["icon"],
        "color": agent["color"],
        "description": agent["description"],
        "category": agent["category"],
        "skills": agent["skills"],
        "can_delegate_to": agent["can_delegate_to"],
    }
