import React from 'react';
import { Link } from 'react-router-dom';
import {
  Mic,
  LayoutDashboard,
  Radio,
  Zap,
  MapPin,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Database,
  Volume2,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { TRAINING_SCENARIOS } from '../lib/scenarios';
import { SimulationBanner } from '../components/shared/SimulationBanner';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-midnight-950 text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      <SimulationBanner />

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 overflow-hidden border-b border-surface-border">
        {/* Subtle grid background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-card border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold mb-8 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Voice AI Incident Intake & Dispatcher Training Copilot</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Every second <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-coral-glow to-amber-500">matters.</span>
          </h1>

          {/* Subheadline */}
          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Voice-first AI incident intake that transforms natural caller conversations into structured, actionable intelligence for human emergency operators in real time.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to="/caller"
              className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-midnight-950 font-bold text-base shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Mic className="w-5 h-5" />
              Start Live Simulation
            </Link>
            <Link
              to="/operator"
              className="w-full sm:w-auto py-3.5 px-6 rounded-xl bg-surface-card hover:bg-surface-hover border border-surface-border text-slate-100 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" />
              Open Command Center
            </Link>
          </div>

          {/* Key Metric Highlights */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-surface-dark border border-surface-border text-left">
              <span className="text-[11px] font-mono uppercase text-slate-500 block">Speech-To-Text</span>
              <span className="text-sm font-bold text-blue-400 flex items-center gap-1 mt-1">
                <Zap className="w-3.5 h-3.5" /> Groq Whisper Turbo
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Sub-second audio transcription</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-dark border border-surface-border text-left">
              <span className="text-[11px] font-mono uppercase text-slate-500 block">Reasoning Engine</span>
              <span className="text-sm font-bold text-purple-400 flex items-center gap-1 mt-1">
                <Cpu className="w-3.5 h-3.5" /> Groq GPT-OSS
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Bounded autonomous tool loops</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-dark border border-surface-border text-left">
              <span className="text-[11px] font-mono uppercase text-slate-500 block">Two-Tab Sync</span>
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1 mt-1">
                <Radio className="w-3.5 h-3.5" /> Real-time SSE
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Live sync across browser contexts</p>
            </div>
            <div className="p-4 rounded-xl bg-surface-dark border border-surface-border text-left">
              <span className="text-[11px] font-mono uppercase text-slate-500 block">Human Oversight</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Operator Dispatch
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Deterministic state machine</p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Product Workflow Flow */}
      <section className="py-20 border-b border-surface-border bg-midnight-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              How ResponseOS Works in Real Time
            </h2>
            <p className="text-sm text-slate-400 mt-3">
              A synchronized two-role architecture bridging conversational caller intake with high-velocity operator response.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-surface-dark border border-surface-border flex flex-col relative">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-bold text-lg mb-5">
                01
              </div>
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Mic className="w-4 h-4 text-amber-400" />
                Natural Voice Intake
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The caller speaks into their browser microphone. Groq Whisper Turbo transcribes the audio stream into text with measured latency under 400ms.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-surface-dark border border-surface-border flex flex-col relative">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono font-bold text-lg mb-5">
                02
              </div>
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                Intelligent Structuring
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Groq GPT-OSS reasons through the report, asks concise clarifying questions, resolves landmarks into SF map coordinates, and extracts structured facts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-surface-dark border border-surface-border flex flex-col relative">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-lg mb-5">
                03
              </div>
              <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Human Operator Dispatch
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The incident instantly appears on the operator command console. The operator verifies facts, reviews transcripts, and dispatches simulated response units.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Six Curated Fictional Scenarios */}
      <section className="py-20 border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
            <div>
              <span className="text-xs font-mono uppercase text-amber-400 font-bold tracking-wider">
                Simulated Training Scenarios
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
                San Francisco Incident Catalog
              </h2>
            </div>
            <Link
              to="/caller"
              className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 mt-3 sm:mt-0 font-semibold"
            >
              Test Scenarios in Caller <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TRAINING_SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                className="p-5 rounded-2xl bg-surface-dark border border-surface-border hover:border-amber-500/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-100">{sc.title}</span>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {sc.landmark}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{sc.brief}</p>
                </div>
                <div className="pt-3 border-t border-surface-border/60">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                    Suggested Prompt:
                  </span>
                  <p className="text-[11px] text-slate-300 italic line-clamp-2">"{sc.suggestedPrompt}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-midnight-950 border-t border-surface-border text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-mono font-bold text-slate-300 text-sm">RESPONSEOS</span>
            <span className="ml-2 text-slate-500">— "Every second matters."</span>
            <p className="text-[11px] text-slate-600 mt-1">
              Inspired by DispatchAI. Built as an autonomous voice-first AI incident intake system.
            </p>
          </div>
          <div className="text-center sm:text-right text-[11px]">
            <p className="text-amber-400/80 font-mono">Controlled Emergency-Response Training Simulation Only.</p>
            <p className="text-slate-600 mt-0.5">Powered by Groq Whisper Turbo, Groq GPT-OSS, and OpenStreetMap.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
