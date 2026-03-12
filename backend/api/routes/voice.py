"""Voice API Route - Real STT + TTS pipeline."""

import io
import os
import tempfile
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, WebSocket
from fastapi.responses import StreamingResponse

router = APIRouter()

# ─── STT: Speech-to-Text ─────────────────────────────────

def _groq_key() -> str:
    return os.getenv("GROQ_API_KEY", "")

def _openai_key() -> str:
    return os.getenv("OPENAI_API_KEY", "")

def _elevenlabs_key() -> str:
    return os.getenv("ELEVENLABS_API_KEY", "")


@router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    engine: str = Form("groq_whisper"),
    language: str = Form("pt"),
):
    """Transcribe audio to text using configured STT engine."""
    audio_bytes = await audio.read()

    if engine == "groq_whisper":
        if not _groq_key():
            raise HTTPException(400, "GROQ_API_KEY not configured in .env")
        return await _stt_groq(audio_bytes, audio.filename or "audio.webm", language)

    elif engine == "openai_whisper":
        if not _openai_key():
            raise HTTPException(400, "OPENAI_API_KEY not configured in .env")
        return await _stt_openai(audio_bytes, audio.filename or "audio.webm", language)

    else:
        raise HTTPException(400, f"STT engine '{engine}' not available. Use groq_whisper or openai_whisper.")


async def _stt_groq(audio_bytes: bytes, filename: str, language: str) -> dict:
    """Transcribe using Groq Whisper API (free tier: 25 req/min)."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {_groq_key()}"},
            files={"file": (filename, audio_bytes)},
            data={"model": "whisper-large-v3-turbo", "language": language, "response_format": "json"},
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Groq STT error: {resp.text[:300]}")
    return resp.json()


async def _stt_openai(audio_bytes: bytes, filename: str, language: str) -> dict:
    """Transcribe using OpenAI Whisper API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {_openai_key()}"},
            files={"file": (filename, audio_bytes)},
            data={"model": "whisper-1", "language": language, "response_format": "json"},
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"OpenAI STT error: {resp.text[:300]}")
    return resp.json()


# ─── TTS: Text-to-Speech ─────────────────────────────────


@router.post("/tts")
async def text_to_speech(
    text: str = Form(...),
    engine: str = Form("edge_tts"),
    voice: str = Form("pt-BR-AntonioNeural"),
    speed: float = Form(1.0),
):
    """Convert text to speech audio (returns mp3 stream)."""
    if engine == "edge_tts":
        return await _tts_edge(text, voice, speed)
    elif engine == "elevenlabs":
        if not _elevenlabs_key():
            raise HTTPException(400, "ELEVENLABS_API_KEY not configured in .env")
        return await _tts_elevenlabs(text, voice)
    elif engine == "openai_tts":
        if not _openai_key():
            raise HTTPException(400, "OPENAI_API_KEY not configured in .env")
        return await _tts_openai(text, voice, speed)
    else:
        raise HTTPException(400, f"TTS engine '{engine}' not available.")


async def _tts_edge(text: str, voice: str, speed: float) -> StreamingResponse:
    """Free TTS using Microsoft Edge (edge-tts library)."""
    import edge_tts

    rate = f"{int((speed - 1) * 100):+d}%"
    communicate = edge_tts.Communicate(text, voice, rate=rate)

    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    await communicate.save(tmp.name)
    audio_bytes = Path(tmp.name).read_bytes()
    os.unlink(tmp.name)

    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")


async def _tts_elevenlabs(text: str, voice_id: str) -> StreamingResponse:
    """Premium TTS using ElevenLabs API."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": _elevenlabs_key(),
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": "eleven_multilingual_v2",
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
            },
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"ElevenLabs error: {resp.text[:300]}")
    return StreamingResponse(io.BytesIO(resp.content), media_type="audio/mpeg")


async def _tts_openai(text: str, voice: str, speed: float) -> StreamingResponse:
    """TTS using OpenAI API."""
    valid_voices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
    if voice not in valid_voices:
        voice = "nova"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/audio/speech",
            headers={
                "Authorization": f"Bearer {_openai_key()}",
                "Content-Type": "application/json",
            },
            json={"model": "tts-1", "input": text, "voice": voice, "speed": speed},
        )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"OpenAI TTS error: {resp.text[:300]}")
    return StreamingResponse(io.BytesIO(resp.content), media_type="audio/mpeg")


# ─── WebSocket (real-time voice) ─────────────────────────

@router.websocket("/stream")
async def voice_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time voice conversation."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            # STT
            try:
                transcript = await _stt_groq(data, "audio.webm", "pt") if _groq_key() else {"text": "[Configure GROQ_API_KEY for voice]"}
                await websocket.send_json({"type": "transcript", "text": transcript.get("text", "")})
            except Exception as e:
                await websocket.send_json({"type": "error", "text": str(e)})
    except Exception:
        pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass


# ─── Engine List ─────────────────────────────────────────

@router.get("/engines")
async def list_voice_engines() -> dict:
    """List available voice engines with their configuration status."""
    return {
        "stt": [
            {
                "id": "groq_whisper", "name": "Groq Whisper",
                "description": "Groq API — free 25 req/min, fast",
                "free": True, "configured": bool(_groq_key()),
            },
            {
                "id": "openai_whisper", "name": "OpenAI Whisper",
                "description": "OpenAI Whisper API — best accuracy",
                "free": False, "configured": bool(_openai_key()),
            },
        ],
        "tts": [
            {
                "id": "edge_tts", "name": "Edge TTS",
                "description": "Microsoft Edge voices — free, no key needed",
                "free": True, "configured": True,
            },
            {
                "id": "elevenlabs", "name": "ElevenLabs",
                "description": "Premium AI voices — human-like quality",
                "free": False, "configured": bool(_elevenlabs_key()),
            },
            {
                "id": "openai_tts", "name": "OpenAI TTS",
                "description": "OpenAI text-to-speech",
                "free": False, "configured": bool(_openai_key()),
            },
        ],
        "voices": [
            {"id": "pt-BR-AntonioNeural", "name": "Antonio (PT-BR)", "language": "pt-BR", "engine": "edge_tts"},
            {"id": "pt-BR-FranciscaNeural", "name": "Francisca (PT-BR)", "language": "pt-BR", "engine": "edge_tts"},
            {"id": "en-US-GuyNeural", "name": "Guy (EN-US)", "language": "en-US", "engine": "edge_tts"},
            {"id": "en-US-JennyNeural", "name": "Jenny (EN-US)", "language": "en-US", "engine": "edge_tts"},
            {"id": "alloy", "name": "Alloy", "language": "multi", "engine": "openai_tts"},
            {"id": "nova", "name": "Nova", "language": "multi", "engine": "openai_tts"},
            {"id": "echo", "name": "Echo", "language": "multi", "engine": "openai_tts"},
            {"id": "shimmer", "name": "Shimmer", "language": "multi", "engine": "openai_tts"},
        ],
    }
