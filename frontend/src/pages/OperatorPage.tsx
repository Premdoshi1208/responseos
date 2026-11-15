import React, { useEffect, useState } from 'react';
import { IncidentQueue } from '../components/operator/IncidentQueue';
import { IncidentMap } from '../components/operator/IncidentMap';
import { IncidentDetails } from '../components/operator/IncidentDetails';
import { ReportModal } from '../components/operator/ReportModal';
import { SimulationBanner } from '../components/shared/SimulationBanner';
import { useWorkspace } from '../hooks/useWorkspace';
import { useSSE } from '../hooks/useSSE';
import { getIncidentDetail, getIncidents, getTrainingUnits, getTranscript } from '../lib/api';
import { Incident, TrainingUnit, TranscriptMessage } from '../types';
import { Shield, Radio, RefreshCw, Layout, Layers, PhoneCall } from 'lucide-react';
import { Link } from 'react-router-dom';

export const OperatorPage: React.FC = () => {
  const { workspace } = useWorkspace('operator');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [units, setUnits] = useState<TrainingUnit[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'QUEUE' | 'MAP' | 'DETAILS'>('MAP');

  const refreshData = async () => {
    try {
      const [incList, unitList] = await Promise.all([
        getIncidents(undefined, 'operator'),
        getTrainingUnits('operator'),
      ]);
      setIncidents(incList);
      setUnits(unitList);

      if (selectedIncidentId) {
        const [detail, tList] = await Promise.all([
          getIncidentDetail(selectedIncidentId, 'operator'),
          getTranscript(selectedIncidentId, 'operator'),
        ]);
        setSelectedIncident(detail);
        setTranscript(tList);
      } else if (incList.length > 0) {
        setSelectedIncidentId(incList[0].id);
      }
    } catch (e) {
      console.error('Refresh error:', e);
    }
  };

  // Initial load
  useEffect(() => {
    refreshData();
  }, [workspace]);

  // Load details whenever selected incident changes
  useEffect(() => {
    if (!selectedIncidentId) return;
    async function loadDetail() {
      try {
        const [detail, tList] = await Promise.all([
          getIncidentDetail(selectedIncidentId!, 'operator'),
          getTranscript(selectedIncidentId!, 'operator'),
        ]);
        setSelectedIncident(detail);
        setTranscript(tList);
      } catch (e) {
        console.error('Failed to load detail:', e);
      }
    }
    loadDetail();
  }, [selectedIncidentId]);

  // SSE real-time sync with caller tab
  const { isConnected } = useSSE('operator', {
    onTranscriptUpdate: (data) => {
      if (selectedIncidentId && data.incident_id === selectedIncidentId) {
        setTranscript((prev) => [
          ...prev,
          {
            id: data.message_id || `msg-${Date.now()}`,
            role: data.role,
            content: data.content,
            created_at: data.created_at || new Date().toISOString(),
          },
        ]);
      }
      refreshData();
    },
    onIncidentUpdate: () => {
      refreshData();
    },
    onUnitUpdate: () => {
      refreshData();
    },
    onStatusChange: () => {
      refreshData();
    },
  });

  return (
    <div className="h-screen w-screen bg-midnight-950 text-slate-100 flex flex-col overflow-hidden">
      <SimulationBanner compact />

      {/* Operator Header Bar */}
      <div className="h-14 bg-midnight-900 border-b border-surface-border px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold font-mono tracking-tight text-white uppercase">
                ResponseOS Operator Command Center
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Operator Role
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Human-In-The-Loop Incident Oversight & Simulated Unit Dispatch</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
            <span className="text-slate-400 hidden sm:inline">{isConnected ? 'Live SSE Sync' : 'Reconnecting...'}</span>
          </div>

          <button
            onClick={refreshData}
            className="p-1.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-surface-border text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/caller"
            target="_blank"
            className="py-1 px-3 rounded-lg bg-surface-card hover:bg-surface-hover border border-surface-border text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Open Caller Tab</span>
          </Link>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden border-b border-surface-border bg-midnight-950 text-xs font-mono">
        <button
          onClick={() => setMobileView('QUEUE')}
          className={`flex-1 py-2 text-center border-b-2 ${
            mobileView === 'QUEUE' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-slate-400'
          }`}
        >
          Queue ({incidents.length})
        </button>
        <button
          onClick={() => setMobileView('MAP')}
          className={`flex-1 py-2 text-center border-b-2 ${
            mobileView === 'MAP' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-slate-400'
          }`}
        >
          Map View
        </button>
        <button
          onClick={() => setMobileView('DETAILS')}
          className={`flex-1 py-2 text-center border-b-2 ${
            mobileView === 'DETAILS' ? 'border-amber-400 text-amber-300 font-bold' : 'border-transparent text-slate-400'
          }`}
        >
          Details
        </button>
      </div>

      {/* Desktop 3-Panel Operations Console */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Panel: Incident Queue (25%) */}
        <div className={`md:col-span-3 h-full overflow-hidden ${mobileView === 'QUEUE' ? 'block' : 'hidden md:block'}`}>
          <IncidentQueue
            incidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setMobileView('DETAILS');
            }}
          />
        </div>

        {/* Center Panel: Interactive Map (45%) */}
        <div className={`md:col-span-5 h-full overflow-hidden ${mobileView === 'MAP' ? 'block' : 'hidden md:block'}`}>
          <IncidentMap
            incidents={incidents}
            selectedIncident={selectedIncident}
            units={units}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setMobileView('DETAILS');
            }}
          />
        </div>

        {/* Right Panel: Incident Facts, Transcript, and Unit Dispatch (30%) */}
        <div className={`md:col-span-4 h-full overflow-hidden ${mobileView === 'DETAILS' ? 'block' : 'hidden md:block'}`}>
          <IncidentDetails
            incident={selectedIncident}
            transcript={transcript}
            units={units}
            onRefresh={refreshData}
            onOpenReportModal={() => setIsReportModalOpen(true)}
          />
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        incidentId={selectedIncidentId}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
};
