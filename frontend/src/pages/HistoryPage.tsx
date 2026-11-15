import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/shared/Navbar';
import { SimulationBanner } from '../components/shared/SimulationBanner';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ReportModal } from '../components/operator/ReportModal';
import { getIncidents } from '../lib/api';
import { Incident } from '../types';
import { History, FileText, Download, Calendar, MapPin, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HistoryPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIncidentIdForReport, setSelectedIncidentIdForReport] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const list = await getIncidents(undefined, 'caller');
        setIncidents(list);
      } catch (e) {
        console.error('Failed to load history:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = incidents.filter((inc) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inc.category?.toLowerCase().includes(q) ||
      inc.reported_location?.toLowerCase().includes(q) ||
      inc.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-midnight-950 text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-300">
      <SimulationBanner />
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surface-border">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <History className="w-6 h-6 text-amber-400" />
              <span>Training Simulation History</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Historical records of past training calls, structured facts, and simulated unit dispatches.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search past simulations..."
              className="w-full bg-surface-card border border-surface-border rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-sm">
            Loading historical incident records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center bg-surface-dark border border-surface-border rounded-2xl my-8 max-w-md mx-auto">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">No Past Incidents Recorded</h3>
            <p className="text-xs text-slate-500 mt-1">
              Start a training scenario from the Caller view to generate historical records.
            </p>
            <Link
              to="/caller"
              className="mt-4 inline-block py-2 px-4 rounded-xl bg-amber-500 text-midnight-950 font-bold text-xs"
            >
              Start First Simulation
            </Link>
          </div>
        ) : (
          <div className="my-6 grid grid-cols-1 gap-4">
            {filtered.map((inc) => (
              <div
                key={inc.id}
                className="p-5 rounded-2xl bg-surface-dark border border-surface-border hover:border-surface-hover flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">ID: {inc.id.substring(0, 8)}</span>
                    <StatusBadge status={inc.status} size="sm" />
                    <span className="text-xs font-semibold text-white">{inc.category || 'Unclassified'}</span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {inc.summary || inc.description || 'No incident summary recorded.'}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      {inc.reported_location || 'Unknown landmark'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(inc.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedIncidentIdForReport(inc.id)}
                    className="py-2 px-3.5 rounded-xl bg-surface-card hover:bg-surface-hover border border-surface-border text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    Export Report
                  </button>
                  <Link
                    to="/operator"
                    className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                  >
                    View in Command Center
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <ReportModal
        isOpen={Boolean(selectedIncidentIdForReport)}
        incidentId={selectedIncidentIdForReport}
        onClose={() => setSelectedIncidentIdForReport(null)}
      />
    </div>
  );
};
