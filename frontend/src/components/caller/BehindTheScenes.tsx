import React, { useState } from 'react';
import { ToolResult } from '../../types';
import { ChevronDown, ChevronUp, Cpu, Terminal, Zap, ShieldCheck } from 'lucide-react';

interface BehindTheScenesProps {
  toolResults: ToolResult[];
  modelUsed: string;
  transcriptionMs: number;
  inferenceMs: number;
  incidentId: string | null;
  ttsProvider: string;
}

export const BehindTheScenes: React.FC<BehindTheScenesProps> = ({
  toolResults,
  modelUsed,
  transcriptionMs,
  inferenceMs,
  incidentId,
  ttsProvider,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full max-w-xl mx-auto mt-6 bg-surface-dark border border-surface-border rounded-xl overflow-hidden shadow-lg transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2.5 px-4 bg-midnight-900/60 hover:bg-midnight-900 flex items-center justify-between text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span>Behind the scenes (Engineering telemetry)</span>
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="p-4 bg-midnight-950 font-mono text-xs space-y-3 border-t border-surface-border">
          {/* Active Model & Engine */}
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-surface-border text-slate-300">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Reasoning Engine</span>
              <span className="text-amber-400 font-semibold">{modelUsed}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Speech-To-Text</span>
              <span className="text-blue-400 font-semibold">whisper-large-v3-turbo</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Speech Synthesis</span>
              <span className="text-emerald-400">{ttsProvider}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Active Incident ID</span>
              <span className="text-slate-300 truncate block">{incidentId || 'None created yet'}</span>
            </div>
          </div>

          {/* Measured Latencies */}
          <div className="flex items-center gap-4 py-1 text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400" /> STT: <strong className="text-white">{transcriptionMs}ms</strong>
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 text-purple-400" /> LLM: <strong className="text-white">{inferenceMs}ms</strong>
            </span>
          </div>

          {/* Real Tool Execution Log */}
          <div>
            <span className="text-slate-500 block text-[10px] uppercase mb-1.5">Executed Business Tools:</span>
            {toolResults.length === 0 ? (
              <p className="text-slate-600 italic">No tool calls executed in the current turn.</p>
            ) : (
              <div className="space-y-2">
                {toolResults.map((tr, idx) => (
                  <div key={idx} className="bg-surface-card p-2.5 rounded border border-surface-border">
                    <div className="flex items-center justify-between text-amber-300 font-semibold mb-1">
                      <span>{tr.tool_name}()</span>
                      <span className="text-[10px] text-slate-400">{tr.execution_ms}ms</span>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <div><strong className="text-slate-500">Input:</strong> {JSON.stringify(tr.input_data)}</div>
                      <div><strong className="text-slate-500">Output:</strong> {JSON.stringify(tr.output_data)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
