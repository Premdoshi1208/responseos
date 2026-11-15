import { useEffect, useRef, useState } from 'react';
import { TranscriptMessage, VoiceState, ToolResult } from '../types';
import { sendConversationTurn, transcribeAudio } from '../lib/api';
import { audioEngine } from '../lib/audio';

export function useVoiceCall() {
  const [voiceState, setVoiceState] = useState<VoiceState>('READY');
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [lastToolResults, setLastToolResults] = useState<ToolResult[]>([]);
  const [ttsProvider, setTtsProvider] = useState<string>('browser-speech-synthesis');
  const [metrics, setMetrics] = useState({
    transcriptionMs: 0,
    inferenceMs: 0,
    modelUsed: 'openai/gpt-oss-20b',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const durationTimerRef = useRef<any>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Call duration counter
  useEffect(() => {
    if (isCallActive) {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [isCallActive]);

  const startCall = async () => {
    setErrorMessage(null);
    setIsCallActive(true);
    setVoiceState('READY');
    setMessages([]);
    setActiveIncidentId(null);
    setCallDuration(0);

    // Initial greeting from AI dispatcher
    const greetingText =
      'ResponseOS Emergency Simulation. What is the nature of your training scenario and where in San Francisco are you located?';

    setMessages([
      {
        id: 'msg-greeting',
        role: 'AI',
        content: greetingText,
        created_at: new Date().toISOString(),
      },
    ]);

    setVoiceState('SPEAKING');
    await audioEngine.playSpeech(greetingText, null, 'audio/mp3', () => {
      setVoiceState('READY');
    });
  };

  const endCall = () => {
    audioEngine.stopPlayback();
    audioEngine.stopRecording().catch(() => {});
    setIsCallActive(false);
    setVoiceState('ENDED');
    setAudioVolume(0);
  };

  const startRecording = async () => {
    if (voiceState !== 'READY' && voiceState !== 'SPEAKING') return;
    setErrorMessage(null);
    audioEngine.stopPlayback();

    try {
      setVoiceState('LISTENING');
      recordingStartTimeRef.current = Date.now();
      await audioEngine.startRecording((vol) => {
        setAudioVolume(vol);
      });
    } catch (err: any) {
      setVoiceState('READY');
      setErrorMessage(`Microphone access error: ${err.message || 'Permission denied'}`);
    }
  };

  const stopRecordingAndSend = async () => {
    if (voiceState !== 'LISTENING') return;

    try {
      setVoiceState('TRANSCRIBING');
      setAudioVolume(0);
      const audioBlob = await audioEngine.stopRecording();
      const recordedDurationMs = Date.now() - recordingStartTimeRef.current;

      // 1. Transcribe with Groq Whisper
      const transRes = await transcribeAudio(audioBlob);
      const transcribedText = transRes.text;
      const transLatencyMs = transRes.latency_ms || 0;

      if (!transcribedText.trim()) {
        setVoiceState('READY');
        return;
      }

      setMetrics((prev) => ({
        ...prev,
        transcriptionMs: transLatencyMs,
      }));

      // 2. Dispatch to AI agent turn
      await processTurn(transcribedText, recordedDurationMs, transLatencyMs);
    } catch (err: any) {
      setVoiceState('READY');
      setErrorMessage(`Voice processing error: ${err.message}`);
    }
  };

  const sendTextMessage = async (text: string) => {
    if (!text.trim()) return;
    setErrorMessage(null);
    if (!isCallActive) {
      setIsCallActive(true);
    }
    await processTurn(text, undefined, undefined);
  };

  const processTurn = async (
    callerText: string,
    audioDurationMs?: number,
    transLatencyMs?: number
  ) => {
    setVoiceState('PROCESSING');

    // Optimistically append caller message
    const callerMsgId = `caller-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: callerMsgId,
        role: 'CALLER',
        content: callerText,
        audio_duration_ms: audioDurationMs,
        transcription_latency_ms: transLatencyMs,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const convRes = await sendConversationTurn(
        callerText,
        activeIncidentId || undefined,
        audioDurationMs,
        transLatencyMs
      );

      if (convRes.incident_id && !activeIncidentId) {
        setActiveIncidentId(convRes.incident_id);
      }

      if (convRes.tool_results) {
        setLastToolResults(convRes.tool_results);
      }

      setMetrics((prev) => ({
        ...prev,
        inferenceMs: convRes.inference_latency_ms || 0,
        modelUsed: convRes.model_used || 'openai/gpt-oss-20b',
      }));

      const aiReplyText = convRes.text;

      // Append AI message
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'AI',
          content: aiReplyText,
          inference_latency_ms: convRes.inference_latency_ms,
          created_at: new Date().toISOString(),
        },
      ]);

      // 3. Play spoken response
      setVoiceState('SPEAKING');

      const synthData = convRes.synthesis;
      const b64 = synthData?.audio_base64;
      const cType = synthData?.content_type || 'audio/mp3';
      const provider = synthData?.provider || 'browser-speech-synthesis';
      setTtsProvider(provider);

      await audioEngine.playSpeech(aiReplyText, b64, cType, () => {
        setVoiceState('READY');
      });
    } catch (err: any) {
      setVoiceState('READY');
      setErrorMessage(`Conversation error: ${err.message}`);
    }
  };

  const stopSpeaking = () => {
    audioEngine.stopPlayback();
    if (voiceState === 'SPEAKING') {
      setVoiceState('READY');
    }
  };

  return {
    voiceState,
    messages,
    activeIncidentId,
    audioVolume,
    isMuted,
    callDuration,
    isCallActive,
    lastToolResults,
    ttsProvider,
    metrics,
    errorMessage,
    setIsMuted,
    startCall,
    endCall,
    startRecording,
    stopRecordingAndSend,
    sendTextMessage,
    stopSpeaking,
  };
}
