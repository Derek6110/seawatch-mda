import { useState } from 'react';
import { FileWarning, Plus, ClipboardList } from 'lucide-react';
import { useStore } from '../store.js';
import { timeAgo } from '../lib/format.js';

const CATEGORIES = [
  ['piracy', 'Piracy / Armed Robbery'],
  ['iuu-fishing', 'IUU Fishing'],
  ['smuggling', 'Smuggling / Trafficking'],
  ['sar', 'Search & Rescue'],
  ['pollution', 'Pollution'],
  ['suspicious', 'Suspicious Activity'],
];

const CAT_COLOR = {
  piracy: '#ff3b3b', 'iuu-fishing': '#16a085', smuggling: '#bb6bd9',
  sar: '#3aa6ff', pollution: '#ffa726', suspicious: '#fcd116',
};

const STATUS_NEXT = { open: 'investigating', investigating: 'resolved', resolved: 'open' };

export default function IncidentPanel() {
  const { incidents, tasks, createIncident, updateIncident, updateTask,
    selectedMmsi, vesselsByMmsi, mocs, can } = useStore();
  const canUpdate = can('updateIncident');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'suspicious', severity: 'medium', description: '' });

  const sel = selectedMmsi ? vesselsByMmsi[selectedMmsi] : null;
  const mocCode = (id) => mocs.find((m) => m.id === id)?.code || '—';

  const submit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    createIncident({
      ...form,
      mmsi: sel?.mmsi || null,
      lat: sel?.lat, lon: sel?.lon,
    });
    setForm({ title: '', category: 'suspicious', severity: 'medium', description: '' });
    setShowForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-navy-700 text-sm">
        <FileWarning size={15} className="text-ghana-gold" />
        <span className="font-semibold text-white">Incidents & Tasking</span>
        <button onClick={() => setShowForm((s) => !s)}
          className="ml-auto flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-ghana-gold text-navy-950 font-semibold hover:brightness-110">
          <Plus size={12} /> Report
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="p-2.5 border-b border-navy-700 space-y-2 bg-navy-850">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Incident title" autoFocus
            className="w-full bg-navy-900 border border-navy-700 rounded px-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ghana-gold" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="bg-navy-900 border border-navy-700 rounded px-1.5 py-1 text-xs text-white">
              {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className="bg-navy-900 border border-navy-700 rounded px-1.5 py-1 text-xs text-white">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description / position / action taken…" rows={2}
            className="w-full bg-navy-900 border border-navy-700 rounded px-2 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-ghana-gold" />
          {sel && (
            <div className="text-[10px] text-slate-400">
              Linked contact: <span className="text-ghana-gold">{sel.name}</span> (MMSI {sel.mmsi})
            </div>
          )}
          <button type="submit" className="w-full py-1.5 rounded bg-ghana-green text-white text-sm font-semibold hover:brightness-110">
            Submit & share to all MOCs
          </button>
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Active taskings */}
        {tasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 px-1">
              <ClipboardList size={12} /> Active Taskings
            </div>
            {tasks.slice(0, 6).map((t) => (
              <div key={t.id} className="rounded border border-navy-700 bg-navy-850 p-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase ${
                    t.priority === 'immediate' ? 'bg-red-500/20 text-red-300' :
                    t.priority === 'priority' ? 'bg-orange-500/20 text-orange-300' :
                    'bg-navy-700 text-slate-300'}`}>{t.priority}</span>
                  <span className="text-sm text-white flex-1 truncate">{t.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                  <span>{t.assignedToName || mocCode(t.assignedTo) || 'Unassigned'}</span>
                  <span>·</span>
                  {canUpdate ? (
                    <button onClick={() => updateTask(t.id, {
                      status: t.status === 'assigned' ? 'enroute' : t.status === 'enroute' ? 'onstation' : 'complete'
                    })}
                      className="px-1.5 rounded bg-navy-700 hover:bg-navy-600 text-white uppercase">
                      {t.status}
                    </button>
                  ) : (
                    <span className="px-1.5 rounded bg-navy-800 text-slate-300 uppercase">{t.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Incidents */}
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 px-1 pt-1">
          <FileWarning size={12} /> Shared Incidents
        </div>
        {incidents.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-6">No incidents reported.</div>
        )}
        {incidents.map((inc) => (
          <div key={inc.id} className="rounded border border-navy-700 bg-navy-850 p-2.5 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLOR[inc.category] }} />
              <span className="text-sm text-white font-medium flex-1 truncate">{inc.title}</span>
              <span className="text-[9px] font-mono text-slate-500">{inc.id}</span>
            </div>
            {inc.description && <div className="text-xs text-slate-400 leading-snug">{inc.description}</div>}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span className="text-ghana-gold">{mocCode(inc.mocId)}</span>
              <span>{inc.reportedBy}</span>
              <span>·</span>
              <span>{timeAgo(inc.ts)}</span>
              {canUpdate ? (
                <button onClick={() => updateIncident(inc.id, { status: STATUS_NEXT[inc.status] })}
                  className="ml-auto px-1.5 rounded bg-navy-700 hover:bg-navy-600 text-white uppercase">
                  {inc.status}
                </button>
              ) : (
                <span className="ml-auto px-1.5 rounded bg-navy-800 text-slate-300 uppercase">{inc.status}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
