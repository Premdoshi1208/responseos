import React from 'react';
import { TRAINING_SCENARIOS } from '../../lib/scenarios';
import { TrainingScenario } from '../../types';
import { X, Car, Flame, HeartPulse, Activity, UserSearch, AlertTriangle, ArrowRight } from 'lucide-react';

interface ScenarioSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: TrainingScenario) => void;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
}) => {
  if (!isOpen) return null;

  const getIcon = (id: string) => {
    switch (id) {
      case 'vehicle-collision':
        return <Car className="w-5 h-5 text-amber-400" />;
      case 'report-of-smoke':
        return <Flame className="w-5 h-5 text-coral-glow" />;
      case 'medical-assistance':
        return <HeartPulse className="w-5 h-5 text-emerald-400" />;
      case 'earthquake-incident':
        return <Activity className="w-5 h-5 text-purple-400" />;
      case 'missing-person':
        return <UserSearch className="w-5 h-5 text-blue-400" />;
      case 'road-obstruction':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-midnight-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-dark border border-surface-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Select Fictional Training Scenario
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose a scenario to test voice intake, landmark resolution, and operator dispatch.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios Grid */}
        <div className="overflow-y-auto py-4 space-y-3">
          {TRAINING_SCENARIOS.map((sc) => (
            <div
              key={sc.id}
              onClick={() => {
                onSelectScenario(sc);
                onClose();
              }}
              className="group p-4 rounded-xl bg-surface-card hover:bg-surface-hover border border-surface-border hover:border-amber-500/40 cursor-pointer transition-all flex items-start gap-4"
            >
              <div className="p-2.5 rounded-lg bg-midnight-950 border border-surface-border group-hover:scale-105 transition-transform">
                {getIcon(sc.id)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-slate-100 group-hover:text-amber-400 transition-colors">
                    {sc.title}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400 bg-midnight-950 px-2 py-0.5 rounded border border-surface-border">
                    {sc.landmark}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{sc.brief}</p>
                <div className="mt-2 text-[11px] text-amber-400/90 italic flex items-center gap-1">
                  <span>Suggested speech: "{sc.suggestedPrompt.substring(0, 75)}..."</span>
                </div>
              </div>
              <div className="self-center">
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
