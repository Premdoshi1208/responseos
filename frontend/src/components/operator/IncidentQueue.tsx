import React, { useState } from 'react';
import { Incident, IncidentStatus } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import { Search, Radio, Clock, MapPin, AlertCircle } from 'lucide-react';

interface IncidentQueueProps {
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
}

export const IncidentQueue: React.FC<IncidentQueueProps> = ({
  incidents,
  selectedIncidentId,
  onSelectIncident,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const filterTabs = [
    { label: 'All', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Review', value: 'AWAITING_OPERATOR_REVIEW' },
    { label: 'Assigned', value: 'TRAINING_UNIT_ASSIGNED' },
  ];

  const filteredIncidents = incidents.filter((inc) => {
    // Status filter
    if (filter === 'ACTIVE') {
      if (inc.status === 'CLOSED') return false;
    } else if (filter !== 'ALL') {
      if (inc.status !== filter) return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCat = inc.category?.toLowerCase().includes(q);
      const matchLoc = inc.reported_location?.toLowerCase().includes(q);
      const matchDesc = inc.description?.toLowerCase().includes(q);
      return matchCat || matchLoc || matchDesc;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-surface-dark border-r border-surface-border">
      {/* Header */}
      <div className="p-3.5 border-b border-surface-border bg-midnight-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
            Incident Queue ({incidents.length})
          </h2>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-3 border-b border-surface-border bg-midnight-950 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter incidents by landmark, type..."
            className="w-full bg-surface-card border border-surface-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors whitespace-nowrap ${
                filter === tab.value
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-card'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto divide-y divide-surface-border">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <p>No incidents match the active filters.</p>
            <p className="text-[11px] text-slate-600 mt-1">Start a call from the Live Caller to generate an incident.</p>
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncidentId === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc.id)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500/10 border-l-4 border-l-amber-500 pl-2.5'
                    : 'hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-xs text-slate-100 truncate">
                    {inc.category || 'Incoming Incident'}
                  </span>
                  <StatusBadge status={inc.status} size="sm" />
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mb-1">
                  <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{inc.reported_location || 'Location resolving...'}</span>
                </div>

                {inc.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                    {inc.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-2">
                  <span>ID: {inc.id.substring(0, 8)}</span>
                  <span>{new Date(inc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
