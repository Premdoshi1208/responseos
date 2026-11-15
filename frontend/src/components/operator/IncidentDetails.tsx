import React, { useState } from 'react';
import { Incident, TranscriptMessage, TrainingUnit } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';
import {
  FileText,
  MapPin,
  AlertTriangle,
  HeartPulse,
  Users,
  ShieldCheck,
  CheckCircle2,
  Edit3,
  Flag,
  Send,
  Truck,
  Download,
  CheckSquare,
  Lock,
} from 'lucide-react';
import {
  addOperatorNote,
  assignTrainingUnit,
  closeIncident,
  releaseTrainingUnit,
  submitOperatorReview,
  updateIncidentStatus,
} from '../../lib/api';

interface IncidentDetailsProps {
  incident: Incident | null;
  transcript: TranscriptMessage[];
  units: TrainingUnit[];
  onRefresh: () => void;
  onOpenReportModal: () => void;
}

export const IncidentDetails: React.FC<IncidentDetailsProps> = ({
  incident,
  transcript,
  units,
  onRefresh,
  onOpenReportModal,
}) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'TRANSCRIPT' | 'NOTES'>('DETAILS');
  const [newNote, setNewNote] = useState('');
  const [selectedUnitToAssign, setSelectedUnitToAssign] = useState('');
  const [reviewingField, setReviewingField] = useState<string | null>(null);
  const [correctedValue, setCorrectedValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-surface-dark border-l border-surface-border p-8 text-center text-slate-500">
        <FileText className="w-10 h-10 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">No Incident Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Select an incident from the left queue or map to review AI intake facts and manage simulated response units.
        </p>
      </div>
    );
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    try {
      await addOperatorNote(incident.id, newNote.trim());
      setNewNote('');
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignUnit = async () => {
    if (!selectedUnitToAssign) return;
    setIsSubmitting(true);
    try {
      await assignTrainingUnit(selectedUnitToAssign, incident.id);
      setSelectedUnitToAssign('');
      setActionMessage('Training unit assigned successfully.');
      setTimeout(() => setActionMessage(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReleaseUnit = async (unitId: string) => {
    setIsSubmitting(true);
    try {
      await releaseTrainingUnit(unitId, incident.id);
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async (fieldName: string, type: 'CONFIRMED' | 'CORRECTED' | 'FLAGGED') => {
    setIsSubmitting(true);
    try {
      await submitOperatorReview(
        incident.id,
        fieldName,
        type,
        type === 'CORRECTED' ? correctedValue : undefined
      );
      setReviewingField(null);
      setCorrectedValue('');
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseIncident = async () => {
    if (!confirm('Close this training incident and release all assigned units?')) return;
    setIsSubmitting(true);
    try {
      await closeIncident(incident.id);
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableUnits = units.filter((u) => u.is_available);

  return (
    <div className="flex flex-col h-full bg-surface-dark border-l border-surface-border overflow-hidden">
      {/* Incident Header */}
      <div className="p-4 bg-midnight-900 border-b border-surface-border">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-xs text-slate-400">INCIDENT-{incident.id.substring(0, 8)}</span>
          <StatusBadge status={incident.status} size="md" />
        </div>
        <h2 className="text-base font-bold text-white tracking-tight">
          {incident.category || 'Incoming Incident'}
        </h2>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-slate-200">{incident.reported_location || 'Location unconfirmed'}</span>
          {incident.latitude && (
            <span className="text-[10px] text-slate-500">
              ({incident.latitude.toFixed(4)}, {incident.longitude?.toFixed(4)})
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border bg-midnight-950 text-xs font-mono">
        <button
          onClick={() => setActiveTab('DETAILS')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activeTab === 'DETAILS'
              ? 'border-amber-400 text-amber-300 font-bold bg-surface-card'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Structured Facts
        </button>
        <button
          onClick={() => setActiveTab('TRANSCRIPT')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activeTab === 'TRANSCRIPT'
              ? 'border-amber-400 text-amber-300 font-bold bg-surface-card'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Transcript ({transcript.length})
        </button>
        <button
          onClick={() => setActiveTab('NOTES')}
          className={`flex-1 py-2.5 text-center transition-colors border-b-2 ${
            activeTab === 'NOTES'
              ? 'border-amber-400 text-amber-300 font-bold bg-surface-card'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Operator Notes ({incident.notes?.length || 0})
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'DETAILS' && (
          <>
            {/* AI Executive Summary */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider block mb-1">
                AI Incident Intake Summary
              </span>
              <p className="text-xs text-slate-200 leading-relaxed">
                {incident.summary || 'Summary is actively compiling from caller statement...'}
              </p>
            </div>

            {/* Extracted Structured Facts Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold uppercase text-slate-300">
                  Extracted Intelligence
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Click fact to review</span>
              </div>

              <div className="divide-y divide-surface-border rounded-xl border border-surface-border bg-surface-card overflow-hidden">
                {/* Location Fact */}
                <div className="p-3 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" /> Location
                    </span>
                    <span className="font-mono text-[11px] text-amber-400 font-semibold">
                      {incident.reported_location || 'UNKNOWN'}
                    </span>
                  </div>
                </div>

                {/* Hazards Fact */}
                <div className="p-3 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-coral-glow" /> Reported Hazards
                    </span>
                    <span className="font-mono text-[11px] text-slate-200">
                      {incident.reported_hazards || 'None reported'}
                    </span>
                  </div>
                </div>

                {/* Injuries Fact */}
                <div className="p-3 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-emerald-400" /> Reported Injuries
                    </span>
                    <span className="font-mono text-[11px] text-slate-200">
                      {incident.reported_injuries || 'None reported'}
                    </span>
                  </div>
                </div>

                {/* People Affected Fact */}
                <div className="p-3 hover:bg-surface-hover transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" /> People Affected
                    </span>
                    <span className="font-mono text-[11px] text-slate-200">
                      {incident.people_affected !== null ? incident.people_affected : 'Unconfirmed'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operator Review Actions */}
            <div className="p-3.5 rounded-xl bg-midnight-950 border border-surface-border">
              <span className="text-xs font-mono font-bold uppercase text-slate-300 block mb-2">
                Human Operator Review & Verification
              </span>
              <p className="text-[11px] text-slate-400 mb-3">
                Review the AI-extracted facts against the caller transcript and sign off before dispatching.
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReviewSubmit('incident_details', 'CONFIRMED')}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm Facts
                </button>
                <button
                  onClick={() => {
                    setReviewingField('description');
                    setCorrectedValue(incident.description || '');
                  }}
                  className="py-2 px-3 rounded-lg bg-surface-card hover:bg-surface-hover text-slate-300 border border-surface-border text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  Correct
                </button>
              </div>

              {reviewingField && (
                <div className="mt-3 p-3 bg-surface-card rounded-lg border border-amber-500/30 space-y-2">
                  <span className="text-[11px] font-mono text-amber-400 block font-semibold">
                    Override Incident Circumstances:
                  </span>
                  <textarea
                    rows={2}
                    value={correctedValue}
                    onChange={(e) => setCorrectedValue(e.target.value)}
                    className="w-full bg-midnight-950 border border-surface-border rounded p-2 text-xs text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setReviewingField(null)}
                      className="px-2.5 py-1 text-xs text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReviewSubmit('description', 'CORRECTED')}
                      className="px-3 py-1 bg-amber-500 text-midnight-950 font-bold rounded text-xs"
                    >
                      Save Correction
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Simulated Unit Dispatch Section */}
            <div className="p-3.5 rounded-xl bg-surface-card border border-surface-border">
              <span className="text-xs font-mono font-bold uppercase text-purple-300 block mb-2 flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-400" />
                Simulated Training Unit Dispatch
              </span>

              {/* Currently Assigned Units */}
              {incident.assignments && incident.assignments.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Currently Assigned:</span>
                  {incident.assignments.map((a) => (
                    <div
                      key={a.assignment_id}
                      className="flex items-center justify-between p-2 rounded bg-midnight-950 border border-surface-border text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
                        <span className="font-semibold text-white">{a.unit_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({a.unit_type})</span>
                      </div>
                      {a.is_active && (
                        <button
                          onClick={() => handleReleaseUnit(a.unit_id)}
                          className="text-[10px] font-mono text-red-400 hover:underline"
                        >
                          Release
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Assignment Selector */}
              {incident.status !== 'CLOSED' && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedUnitToAssign}
                    onChange={(e) => setSelectedUnitToAssign(e.target.value)}
                    className="flex-1 bg-midnight-950 border border-surface-border rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">-- Select available training unit --</option>
                    {availableUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_name} ({u.unit_type})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignUnit}
                    disabled={!selectedUnitToAssign || isSubmitting}
                    className="py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all whitespace-nowrap"
                  >
                    Assign Unit
                  </button>
                </div>
              )}
            </div>

            {/* Workflow Closure and Report */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={onOpenReportModal}
                className="flex-1 py-2.5 px-3 rounded-xl bg-surface-card hover:bg-surface-hover border border-surface-border text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                Export Incident Report
              </button>

              {incident.status !== 'CLOSED' && (
                <button
                  onClick={handleCloseIncident}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Close
                </button>
              )}
            </div>
          </>
        )}

        {/* Transcript Tab */}
        {activeTab === 'TRANSCRIPT' && (
          <div className="space-y-3">
            {transcript.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-xl text-xs leading-relaxed border ${
                  m.role === 'CALLER'
                    ? 'bg-amber-500/10 border-amber-500/20 text-slate-200'
                    : 'bg-surface-card border-surface-border text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 mb-1">
                  <span className={m.role === 'CALLER' ? 'text-amber-400 font-semibold' : 'text-purple-400 font-semibold'}>
                    {m.role === 'CALLER' ? 'Caller' : 'ResponseOS AI'}
                  </span>
                  <span>{new Date(m.created_at).toLocaleTimeString()}</span>
                </div>
                <p>{m.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'NOTES' && (
          <div className="space-y-4">
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log operational observation or supervisor note..."
                className="w-full bg-midnight-950 border border-surface-border rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
              <button
                type="submit"
                disabled={!newNote.trim() || isSubmitting}
                className="py-2 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-midnight-950 font-bold text-xs flex items-center gap-1.5 ml-auto transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                Add Note
              </button>
            </form>

            <div className="space-y-2">
              {incident.notes?.map((n) => (
                <div key={n.id} className="p-3 bg-surface-card rounded-xl border border-surface-border text-xs">
                  <span className="text-[10px] font-mono text-slate-500 block mb-1">
                    {new Date(n.created_at).toLocaleTimeString()}
                  </span>
                  <p className="text-slate-200">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
