"""
Voice API router for ResponseOS.
Provides real speech-to-text (Groq Whisper), speech synthesis, and full conversational intake.
"""

from typing import Any, Optional
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import WorkspaceContext, require_caller
from app.core.database import get_db
from app.services.ai_agent import IncidentAgent
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/api/voice", tags=["voice"])
voice_service = VoiceService()


class SynthesizeRequest(BaseModel):
    text: str
    voice: Optional[str] = "autumn"


class ConversationRequest(BaseModel):
    text: str
    incident_id: Optional[str] = None
    audio_duration_ms: Optional[int] = None
    transcription_latency_ms: Optional[int] = None


@router.post("/transcribe")
async def transcribe_audio_endpoint(
    file: UploadFile = File(...),
    ctx: WorkspaceContext = Depends(require_caller),
):
    """
    Transcribe recorded microphone audio using Groq Whisper (whisper-large-v3-turbo).
    Measures and returns transcription latency and audio duration.
    """
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty",
        )

    try:
        result = await voice_service.transcribe_audio(
            audio_bytes=content,
            filename=file.filename or "recording.webm",
            content_type=file.content_type or "audio/webm",
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failure: {str(e)}",
        )


@router.post("/synthesize")
async def synthesize_speech_endpoint(
    req: SynthesizeRequest,
    ctx: WorkspaceContext = Depends(require_caller),
):
    """
    Synthesize speech for AI response.
    Attempts Groq Orpheus TTS, with an explicit transparent fallback to browser speech synthesis.
    """
    if not req.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty",
        )

    result = await voice_service.synthesize_speech(text=req.text, voice=req.voice or "autumn")
    return result


@router.post("/conversation")
async def conversation_turn_endpoint(
    req: ConversationRequest,
    ctx: WorkspaceContext = Depends(require_caller),
    db: AsyncSession = Depends(get_db),
):
    """
    Process a conversation turn with the intelligent AI agent.
    Runs Groq LLM inference, executes real business tools, updates incident records,
    and returns conversational text and synthesized voice or browser fallback.
    """
    incident_uuid = uuid.UUID(req.incident_id) if req.incident_id else None

    agent = IncidentAgent(
        db=db,
        workspace_id=uuid.UUID(ctx.workspace_id),
        incident_id=incident_uuid,
    )

    agent_response = await agent.process_caller_message(
        user_text=req.text,
        audio_duration_ms=req.audio_duration_ms,
        transcription_latency_ms=req.transcription_latency_ms,
    )

    # Attempt speech synthesis for the AI's reply
    synthesis = await voice_service.synthesize_speech(text=agent_response.text)

    return {
        "text": agent_response.text,
        "incident_id": agent_response.incident_id,
        "incident_updates": agent_response.incident_updates,
        "tool_results": [
            {
                "tool_name": tr.tool_name,
                "input_data": tr.input_data,
                "output_data": tr.output_data,
                "status": tr.status,
                "execution_ms": tr.execution_ms,
            }
            for tr in agent_response.tool_results
        ],
        "inference_latency_ms": agent_response.inference_latency_ms,
        "model_used": agent_response.model_used,
        "is_real_emergency_interrupt": agent_response.is_real_emergency_interrupt,
        "synthesis": synthesis,
    }
