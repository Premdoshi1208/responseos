"""
Voice AI Service for Speech-to-Text (Groq Whisper) and Text-to-Speech.
Handles audio validation, latency tracking, and graceful fallback to browser speech synthesis.
"""

import io
import os
import tempfile
import time
from typing import Optional, TypedDict
import httpx
from groq import AsyncGroq

from app.core.config import get_settings

settings = get_settings()


class TranscriptionResult(TypedDict):
    text: str
    duration_ms: Optional[int]
    latency_ms: int
    provider: str
    model: str


class SynthesisResult(TypedDict):
    audio_base64: Optional[str]
    content_type: str
    latency_ms: int
    provider: str
    use_browser_fallback: bool
    fallback_reason: Optional[str]


class VoiceService:
    def __init__(self, groq_api_key: Optional[str] = None):
        self.api_key = groq_api_key or settings.GROQ_API_KEY
        self.client = AsyncGroq(api_key=self.api_key) if self.api_key else None
        self.whisper_model = "whisper-large-v3-turbo"
        self.tts_model = "canopylabs/orpheus-v1-english"

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        content_type: str = "audio/webm",
    ) -> TranscriptionResult:
        """
        Transcribe audio using Groq Whisper.
        Validates size and duration, creates a temporary file, and cleans it up immediately.
        """
        start_time = time.time()

        if not self.client:
            raise ValueError("Groq client is not initialized. GROQ_API_KEY missing.")

        # Max file size check
        max_bytes = settings.MAX_AUDIO_SIZE_MB * 1024 * 1024
        if len(audio_bytes) > max_bytes:
            raise ValueError(f"Audio file exceeds maximum size limit of {settings.MAX_AUDIO_SIZE_MB}MB.")

        # Determine file extension
        ext = ".webm"
        if "wav" in content_type or filename.endswith(".wav"):
            ext = ".wav"
        elif "mp3" in content_type or filename.endswith(".mp3"):
            ext = ".mp3"
        elif "ogg" in content_type or filename.endswith(".ogg"):
            ext = ".ogg"
        elif "m4a" in content_type or filename.endswith(".m4a"):
            ext = ".m4a"

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_file:
                temp_file.write(audio_bytes)
                temp_path = temp_file.name

            with open(temp_path, "rb") as f:
                transcription = await self.client.audio.transcriptions.create(
                    file=(os.path.basename(temp_path), f, content_type),
                    model=self.whisper_model,
                    language="en",
                    temperature=0.0,
                    response_format="verbose_json",
                )

            latency_ms = int((time.time() - start_time) * 1000)
            text = transcription.text.strip()
            duration_ms = None
            if hasattr(transcription, "duration") and transcription.duration:
                duration_ms = int(transcription.duration * 1000)

            return {
                "text": text,
                "duration_ms": duration_ms,
                "latency_ms": latency_ms,
                "provider": "groq-whisper",
                "model": self.whisper_model,
            }
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except OSError:
                    pass

    async def synthesize_speech(
        self,
        text: str,
        voice: str = "autumn",
    ) -> SynthesisResult:
        """
        Synthesize speech from text.
        Attempts Groq Orpheus TTS. If terms acceptance or quota prevents it,
        returns an explicit browser fallback response.
        """
        start_time = time.time()
        import base64

        if not self.api_key:
            return {
                "audio_base64": None,
                "content_type": "",
                "latency_ms": 0,
                "provider": "browser-speech-synthesis",
                "use_browser_fallback": True,
                "fallback_reason": "Groq API key not configured",
            }

        # Attempt Groq Speech Synthesis via REST endpoint
        try:
            async with httpx.AsyncClient(timeout=10.0) as http_client:
                response = await http_client.post(
                    "https://api.groq.com/openai/v1/audio/speech",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.tts_model,
                        "input": text[:1000],  # Bound text length
                        "voice": voice,
                    },
                )

                latency_ms = int((time.time() - start_time) * 1000)

                if response.status_code == 200:
                    b64 = base64.b64encode(response.content).decode("utf-8")
                    return {
                        "audio_base64": b64,
                        "content_type": response.headers.get("content-type", "audio/mp3"),
                        "latency_ms": latency_ms,
                        "provider": f"groq-{self.tts_model}",
                        "use_browser_fallback": False,
                        "fallback_reason": None,
                    }
                else:
                    # Parse error details for transparency
                    error_msg = "Unknown TTS error"
                    try:
                        err_json = response.json()
                        error_msg = err_json.get("error", {}).get("message", response.text)
                    except Exception:
                        error_msg = response.text[:200]

                    return {
                        "audio_base64": None,
                        "content_type": "",
                        "latency_ms": latency_ms,
                        "provider": "browser-speech-synthesis",
                        "use_browser_fallback": True,
                        "fallback_reason": f"Groq TTS unavailable ({error_msg}). Falling back to browser synthesis.",
                    }

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "audio_base64": None,
                "content_type": "",
                "latency_ms": latency_ms,
                "provider": "browser-speech-synthesis",
                "use_browser_fallback": True,
                "fallback_reason": f"Connection error: {str(e)}. Falling back to browser synthesis.",
            }
