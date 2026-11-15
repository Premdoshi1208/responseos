import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const SimulationBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div className={`bg-amber-500/10 border-b border-amber-500/30 text-amber-300 ${compact ? 'py-1 px-3 text-xs' : 'py-2 px-4 text-xs sm:text-sm'} flex items-center justify-center gap-2 font-medium z-50`}>
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        <strong>TRAINING & SIMULATION ONLY:</strong> ResponseOS does not contact emergency services. In a real emergency, immediately dial <strong>911</strong> or your local emergency number.
      </span>
    </div>
  );
};
