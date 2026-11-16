import io
import math
import os
import struct
import sys
import wave
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "backend"))

from app.services.voice_service import VoiceService
from app.core.config import get_settings


def create_synthetic_wav(duration_seconds: float = 1.0, sample_rate: int = 16000) -> bytes:
    """Generate a clean synthetic WAV audio file fixture."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        total_samples = int(duration_seconds * sample_rate)
        frames = bytearray()
        for i in range(total_samples):
            # 440 Hz standard tone
            sample = int(3000 * math.sin(2 * math.pi * 440 * i / sample_rate))
            frames.extend(struct.pack("<h", sample))
        wf.writeframes(frames)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_groq_whisper_transcription_synthetic_audio():
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        pytest.skip("GROQ_API_KEY not set")

    vs = VoiceService(groq_api_key=settings.GROQ_API_KEY)
    audio_bytes = create_synthetic_wav(duration_seconds=0.8)

    res = await vs.transcribe_audio(
        audio_bytes=audio_bytes,
        filename="test_tone.wav",
        content_type="audio/wav",
    )

    assert res["provider"] == "groq-whisper"
    assert "whisper" in res["model"]
    assert res["latency_ms"] > 0
    assert isinstance(res["text"], str)


@pytest.mark.asyncio
async def test_speech_synthesis_or_transparent_fallback():
    settings = get_settings()
    vs = VoiceService(groq_api_key=settings.GROQ_API_KEY)

    res = await vs.synthesize_speech("Unit 4 responding to Ferry Building.")
    assert "provider" in res
    assert isinstance(res["latency_ms"], int)
    # Either Groq Orpheus or transparent browser fallback
    if res["use_browser_fallback"]:
        assert res["provider"] == "browser-speech-synthesis"
        assert res["fallback_reason"] is not None
    else:
        assert res["audio_base64"] is not None
        assert "groq" in res["provider"]


@pytest.mark.asyncio
async def test_audio_max_size_validation():
    vs = VoiceService()
    oversized = b"0" * (12 * 1024 * 1024)  # 12 MB exceeds 10MB limit
    with pytest.raises(ValueError, match="exceeds maximum size limit"):
        await vs.transcribe_audio(oversized)
