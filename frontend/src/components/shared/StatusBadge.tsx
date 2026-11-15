import React from 'react';
import { IncidentStatus } from '../../types';

interface StatusBadgeProps {
  status: IncidentStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
  const getStyle = (s: string) => {
    switch (s) {
      case 'NEW':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'INFORMATION_COLLECTION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'AWAITING_OPERATOR_REVIEW':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30 animate-pulse';
      case 'REVIEWED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'TRAINING_UNIT_ASSIGNED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'CLOSED':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      case 'CONFIRMED':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'REPORTED':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'UNCONFIRMED':
        return 'bg-orange-500/10 text-orange-300 border-orange-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const formatText = (s: string) => {
    return s.replace(/_/g, ' ');
  };

  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded border ${sizeClasses} ${getStyle(status)}`}>
      {formatText(status)}
    </span>
  );
};
