import React, { useEffect, useState } from 'react';
import { X, Copy, Download, Check, FileText, Code } from 'lucide-react';
import { fetchIncidentReport } from '../../lib/api';

interface ReportModalProps {
  isOpen: boolean;
  incidentId: string | null;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, incidentId, onClose }) => {
  const [format, setFormat] = useState<'markdown' | 'json'>('markdown');
  const [reportData, setReportData] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !incidentId) return;

    async function loadReport() {
      setLoading(true);
      try {
        const data = await fetchIncidentReport(incidentId!, format);
        if (format === 'json') {
          setReportData(JSON.stringify(data, null, 2));
        } else {
          setReportData(data);
        }
      } catch (err: any) {
        setReportData(`Error generating report: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [isOpen, incidentId, format]);

  if (!isOpen || !incidentId) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = format === 'markdown' ? 'md' : 'json';
    const mime = format === 'markdown' ? 'text/markdown' : 'application/json';
    const blob = new Blob([reportData], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `responseos-incident-${incidentId.substring(0, 8)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-midnight-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-dark border border-surface-border rounded-2xl max-w-3xl w-full h-[85vh] p-6 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-surface-border">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              Incident Simulation Audit Report
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Incident ID: {incidentId}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg bg-midnight-950 p-1 border border-surface-border">
              <button
                onClick={() => setFormat('markdown')}
                className={`px-3 py-1 text-xs font-mono rounded ${
                  format === 'markdown'
                    ? 'bg-amber-500/20 text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Markdown
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-3 py-1 text-xs font-mono rounded ${
                  format === 'json'
                    ? 'bg-amber-500/20 text-amber-400 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                JSON
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-hover text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content Preview */}
        <div className="flex-1 overflow-y-auto my-4 p-4 rounded-xl bg-midnight-950 border border-surface-border font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed selection:bg-amber-500/30">
          {loading ? 'Compiling audit records...' : reportData}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-border">
          <span className="text-[11px] text-slate-500 font-mono">
            Generated from verified PostgreSQL records.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="py-2 px-3.5 rounded-xl bg-surface-card hover:bg-surface-hover border border-surface-border text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-midnight-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Download .{format === 'markdown' ? 'md' : 'json'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
