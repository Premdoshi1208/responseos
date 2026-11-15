import React, { useEffect, useRef } from 'react';
import { TranscriptMessage } from '../../types';
import { User, Radio, Clock, Zap } from 'lucide-react';

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  ttsProvider?: string;
}

export const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ messages, ttsProvider }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="bg-surface-dark border border-surface-border rounded-2xl p-6 text-center text-slate-500 text-sm h-64 flex flex-col items-center justify-center">
        <Radio className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
        <p className="font-medium text-slate-400">Live Transcript Waiting</p>
        <p className="text-xs text-slate-500 mt-1">Start call and speak or type to see real-time speech-to-text.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-dark border border-surface-border rounded-2xl flex flex-col h-80 sm:h-96 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="py-2.5 px-4 bg-midnight-900 border-b border-surface-border flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono font-semibold uppercase text-slate-300">Live Transcript</span>
        {ttsProvider && (
          <span className="font-mono text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            TTS: {ttsProvider.replace('canopylabs/', '')}
          </span>
        )}
      </div>

      {/* Message stream */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((m) => {
          const isCaller = m.role === 'CALLER';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isCaller ? 'items-end' : 'items-start'} animate-fade-in`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[11px] font-mono text-slate-400">
                {isCaller ? (
                  <>
                    <span>Caller</span>
                    <User className="w-3 h-3 text-slate-400" />
                  </>
                ) : (
                  <>
                    <Radio className="w-3 h-3 text-amber-400" />
                    <span className="text-amber-400 font-semibold">ResponseOS AI</span>
                  </>
                )}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                  isCaller
                    ? 'bg-amber-500 text-midnight-950 font-medium rounded-tr-none shadow-md shadow-amber-500/10'
                    : 'bg-surface-card text-slate-100 border border-surface-border rounded-tl-none shadow-md'
                }`}
              >
                {m.content}
              </div>

              {/* Latency and timing badges */}
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-500">
                {m.transcription_latency_ms ? (
                  <span className="flex items-center gap-0.5 text-blue-400">
                    <Zap className="w-2.5 h-2.5" /> STT: {m.transcription_latency_ms}ms
                  </span>
                ) : null}
                {m.inference_latency_ms ? (
                  <span className="flex items-center gap-0.5 text-purple-400">
                    <Zap className="w-2.5 h-2.5" /> LLM: {m.inference_latency_ms}ms
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
