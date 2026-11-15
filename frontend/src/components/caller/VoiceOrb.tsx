import React from 'react';
import { motion } from 'framer-motion';
import { VoiceState } from '../../types';
import { Mic, Volume2, Sparkles, Loader2, PhoneOff } from 'lucide-react';

interface VoiceOrbProps {
  state: VoiceState;
  volume: number; // 0 to 1
  durationSeconds: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({ state, volume, durationSeconds }) => {
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const getStateDetails = () => {
    switch (state) {
      case 'LISTENING':
        return {
          label: 'Listening to speech...',
          color: 'from-amber-500 via-coral-glow to-amber-600',
          textColor: 'text-amber-400',
          borderColor: 'border-amber-500/50',
          icon: Mic,
          pulse: true,
        };
      case 'TRANSCRIBING':
        return {
          label: 'Transcribing audio (Groq Whisper)...',
          color: 'from-blue-600 via-indigo-500 to-purple-600',
          textColor: 'text-blue-400',
          borderColor: 'border-blue-500/50',
          icon: Loader2,
          pulse: false,
        };
      case 'PROCESSING':
        return {
          label: 'Structuring incident details (Groq GPT-OSS)...',
          color: 'from-purple-600 via-pink-600 to-indigo-600',
          textColor: 'text-purple-400',
          borderColor: 'border-purple-500/50',
          icon: Sparkles,
          pulse: false,
        };
      case 'SPEAKING':
        return {
          label: 'AI Dispatcher speaking...',
          color: 'from-emerald-500 via-teal-500 to-cyan-600',
          textColor: 'text-emerald-400',
          borderColor: 'border-emerald-500/50',
          icon: Volume2,
          pulse: true,
        };
      case 'ENDED':
        return {
          label: 'Call completed',
          color: 'from-slate-700 to-slate-800',
          textColor: 'text-slate-400',
          borderColor: 'border-slate-700',
          icon: PhoneOff,
          pulse: false,
        };
      case 'READY':
      default:
        return {
          label: 'Ready — Hold to speak or type',
          color: 'from-slate-800 via-slate-700 to-slate-800',
          textColor: 'text-slate-300',
          borderColor: 'border-slate-600/40',
          icon: Mic,
          pulse: false,
        };
    }
  };

  const details = getStateDetails();
  const Icon = details.icon;

  // Real volume scaling for reactive wave (between 1.0 and 1.8)
  const volumeScale = state === 'LISTENING' ? 1 + volume * 0.8 : 1;

  return (
    <div className="flex flex-col items-center justify-center p-6 sm:p-8">
      {/* Orb container */}
      <div className="relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64 my-4">
        {/* Outer reactive sound wave ring */}
        {state === 'LISTENING' && (
          <motion.div
            className="absolute rounded-full border border-amber-500/30 bg-amber-500/5"
            style={{ width: '100%', height: '100%' }}
            animate={{ scale: [1, volumeScale, 1] }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          />
        )}

        {/* Second ripple ring */}
        {(state === 'LISTENING' || state === 'SPEAKING') && (
          <motion.div
            className={`absolute rounded-full border ${state === 'LISTENING' ? 'border-coral-glow/30' : 'border-emerald-500/30'} w-44 h-44 sm:w-52 sm:h-52`}
            animate={{
              scale: state === 'LISTENING' ? [1, 1 + volume * 0.5, 1] : [1, 1.15, 1],
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Core animated orb */}
        <motion.div
          className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-gradient-to-br ${details.color} shadow-2xl flex flex-col items-center justify-center border-2 ${details.borderColor} z-10 transition-colors duration-500`}
          animate={
            state === 'TRANSCRIBING' || state === 'PROCESSING'
              ? { rotate: 360 }
              : state === 'LISTENING'
              ? { scale: [1, 1 + volume * 0.2, 1] }
              : { scale: [1, 1.03, 1] }
          }
          transition={
            state === 'TRANSCRIBING' || state === 'PROCESSING'
              ? { repeat: Infinity, duration: 4, ease: 'linear' }
              : { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }
          }
        >
          <Icon className={`w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-md ${state === 'TRANSCRIBING' || state === 'PROCESSING' ? 'animate-spin' : ''}`} />
          {durationSeconds > 0 && (
            <span className="mt-2 text-xs font-mono font-bold text-white/90 bg-black/30 px-2 py-0.5 rounded-full">
              {formatTime(durationSeconds)}
            </span>
          )}
        </motion.div>
      </div>

      {/* State label and feedback */}
      <div className="flex flex-col items-center mt-2 text-center">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${state === 'LISTENING' ? 'bg-amber-400 animate-ping' : state === 'SPEAKING' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <span className={`text-sm sm:text-base font-semibold font-mono tracking-tight ${details.textColor}`}>
            {details.label}
          </span>
        </div>
      </div>
    </div>
  );
};
