import React, { useState } from 'react';
import { Mic, MicOff, Square, Send, PhoneOff, VolumeX, Sparkles } from 'lucide-react';
import { VoiceState } from '../../types';

interface CallControlsProps {
  voiceState: VoiceState;
  isCallActive: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSendText: (text: string) => void;
  onStopSpeaking: () => void;
  onEndCall: () => void;
  onStartCall: () => void;
  onOpenScenarios: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  voiceState,
  isCallActive,
  onStartRecording,
  onStopRecording,
  onSendText,
  onStopSpeaking,
  onEndCall,
  onStartCall,
  onOpenScenarios,
}) => {
  const [textInput, setTextInput] = useState('');
  const [isPressing, setIsPressing] = useState(false);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onSendText(textInput.trim());
    setTextInput('');
  };

  const handleMouseDown = () => {
    if (!isCallActive) return;
    setIsPressing(true);
    onStartRecording();
  };

  const handleMouseUp = () => {
    if (isPressing) {
      setIsPressing(false);
      onStopRecording();
    }
  };

  const isBusy = voiceState === 'TRANSCRIBING' || voiceState === 'PROCESSING';

  if (!isCallActive) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
        <button
          onClick={onStartCall}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-midnight-950 font-bold text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Mic className="w-5 h-5" />
          Start Voice Simulation
        </button>
        <button
          onClick={onOpenScenarios}
          className="w-full sm:w-auto py-3.5 px-5 rounded-xl bg-surface-card hover:bg-surface-hover border border-surface-border text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          Choose Scenario
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto">
      {/* Voice Controls Row */}
      <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
        {/* Stop speech button (only visible when speaking) */}
        {voiceState === 'SPEAKING' && (
          <button
            onClick={onStopSpeaking}
            className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition-all"
            title="Interrupt AI audio"
          >
            <VolumeX className="w-5 h-5" />
          </button>
        )}

        {/* Primary Push-to-Talk Button */}
        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={isBusy}
          className={`py-4 px-8 rounded-2xl font-bold flex items-center gap-3 text-base shadow-xl transition-all select-none active:scale-95 ${
            voiceState === 'LISTENING'
              ? 'bg-coral-glow text-white shadow-red-500/30 scale-105 animate-pulse'
              : isBusy
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-midnight-950 shadow-amber-500/20'
          }`}
        >
          {voiceState === 'LISTENING' ? (
            <>
              <Square className="w-5 h-5 fill-current" />
              <span>Release to Send</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Hold to Speak</span>
            </>
          )}
        </button>

        {/* Click-to-toggle record alternative */}
        <button
          onClick={() => {
            if (voiceState === 'LISTENING') {
              onStopRecording();
            } else {
              onStartRecording();
            }
          }}
          disabled={isBusy}
          className={`p-3.5 rounded-xl border transition-all text-xs font-semibold flex items-center gap-1.5 ${
            voiceState === 'LISTENING'
              ? 'bg-red-500/20 text-red-400 border-red-500/40'
              : 'bg-surface-card hover:bg-surface-hover text-slate-300 border-surface-border'
          }`}
          title="Click to start/stop speaking without holding"
        >
          {voiceState === 'LISTENING' ? 'Stop' : 'Toggle Mic'}
        </button>

        {/* End Call Button */}
        <button
          onClick={onEndCall}
          className="p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all active:scale-95"
          title="End Simulation Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Text fallback input */}
      <form onSubmit={handleTextSubmit} className="flex items-center gap-2 w-full mt-1">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Or type what is happening (text fallback)..."
          disabled={isBusy}
          className="flex-1 bg-surface-card border border-surface-border rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
        />
        <button
          type="submit"
          disabled={!textInput.trim() || isBusy}
          className="p-2.5 rounded-xl bg-surface-card hover:bg-surface-hover disabled:opacity-40 text-amber-400 border border-surface-border transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
