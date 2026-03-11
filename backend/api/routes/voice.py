"""Voice API Route - WebSocket voice streaming."""

from fastapi import APIRouter, WebSocket

router = APIRouter()


@router.websocket("/stream")
async def voice_stream(websocket: WebSocket):
    """WebSocket endpoint for voice conversation streaming."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            # Process audio: STT → LLM → TTS pipeline
            # For now, echo back a status message
            await websocket.send_json({
                "type": "transcript",
                "text": "[Voice processing pipeline - connect STT engine in settings]",
            })
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


@router.get("/engines")
async def list_voice_engines() -> dict:
    """List available voice engines."""
    return {
        "stt": [
            {"id": "whisper_local", "name": "Whisper Local", "description": "faster-whisper (GPU accelerated)", "free": True},
            {"id": "groq_whisper", "name": "Groq Whisper", "description": "Groq API (25 req/min free)", "free": True},
            {"id": "openai_whisper", "name": "OpenAI Whisper", "description": "OpenAI Whisper API", "free": False},
        ],
        "tts": [
            {"id": "edge_tts", "name": "Edge TTS", "description": "Microsoft Edge voices (free)", "free": True},
            {"id": "coqui", "name": "Coqui TTS", "description": "Local open-source TTS", "free": True},
            {"id": "piper", "name": "Piper TTS", "description": "Fast local TTS", "free": True},
            {"id": "elevenlabs", "name": "ElevenLabs", "description": "Premium AI voice", "free": False},
            {"id": "google_tts", "name": "Google TTS", "description": "Google Cloud TTS", "free": False},
        ],
        "voices": [
            {"id": "pt-BR-AntonioNeural", "name": "Antonio (PT-BR)", "language": "pt-BR"},
            {"id": "pt-BR-FranciscaNeural", "name": "Francisca (PT-BR)", "language": "pt-BR"},
            {"id": "en-US-GuyNeural", "name": "Guy (EN-US)", "language": "en-US"},
            {"id": "en-US-JennyNeural", "name": "Jenny (EN-US)", "language": "en-US"},
        ],
    }
