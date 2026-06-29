import { useMemo, useState } from 'react';
import { FileWarning, Plus, ClipboardList, MessageSquare, Users } from 'lucide-react';
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
    selectedMmsi, vesselsByMmsi, mocs, currentMoc, can, selectIncident } = useStore();
  const canUpdate = can('updateIncident');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'suspicious', severity: 'medium', description: '' });
  const [shareAll, setShareAll] = useState(true);
  const [shareSet, setShareSet] = useState(() => new Set());

  const sel = selectedMmsi ? vesselsByMmsi[selectedMmsi] : null;
  const mocCode = (id) => mocs.find((m) => m.id === id)?.code || '—';

  // Collaborators = every command/agency except the account holder's own MOC.
  const collaborators = useMemo(
    () => mocs.filter((m) => m.id !== currentMoc?.id),
    [mocs, currentMoc]
  );

  // Only show incidents shared with this MOC (or with everyone, or reported by us).
  const visibleIncidents = useMemo(
    () => incidents.filter((inc) =>
      !inc.sharedWith || inc.sharedWith.includes('all') ||
      inc.mocId === currentMoc?.id || inc.sharedWith.includes(currentMoc?.id)),
    [incidents, currentMoc]
  );

  const toggleShare = (id) => setShareSet((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title) return;
    const sharedWith = shareAll || shareSet.size === 0 ? ['all'] : Array.from(shareSet);
    createIncident({ ...form, sharedWith, mmsi: sel?.mmsi || null, lat: sel?.lat, lon: sel?.lon });
    setForm({ title: '', category: 'suspicious', severity: 'medium', description: '' });
    setShareSet(new Set()); setShareAll(true); setShowForm(false);
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

          {/* Share with collaborators (the account holder's own MOC is excluded) */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
              <Users size={11} /> Share with
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
              <input type="checkbox" checked={shareAll} onChange={(e) => setShareAll(e.target.checked)} className="accent-ghana-gold" />
              All institutions
            </label>
            {!shareAll && (
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 max-h-28 overflow-y-auto pl-1">
                {collaborators.map((m) => (
                  <label key={m.id} className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={shareSet.has(m.id)} onChange={() => toggleShare(m.id)} className="accent-ghana-gold" />
                    <span className="truncate" title={m.name}>{m.code}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {sel && (
            <div className="text-[10px] text-slate-400">
              Linked contact: <span className="text-ghana-gold">{sel.name}</span> (MMSI {sel.mmsi})
            </div>
          )}
          <button type="submit" className="w-full py-1.5 rounded bg-ghana-green text-white text-sm font-semibold hover:brightness-110">
            Submit &amp; share
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
        {visibleIncidents.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-6">No incidents shared with your institution.</div>
        )}
        {visibleIncidents.map((inc) => {
          const shared = inc.sharedWith?.includes('all') ? ['ALL'] : (inc.sharedWith || []).map(mocCode);
          return (
            <button key={inc.id} onClick={() => selectIncident(inc.id)}
              className="w-full text-left rounded border border-navy-700 bg-navy-850 hover:border-ghana-gold p-2.5 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CAT_COLOR[inc.category] }} />
                <span className="text-sm text-white font-medium flex-1 truncate">{inc.title}</span>
                <span className="text-[9px] font-mono text-slate-500">{inc.id}</span>
              </div>
              {inc.description && <div className="text-xs text-slate-400 leading-snug line-clamp-2">{inc.description}</div>}
              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono flex-wrap">
                <span className="text-ghana-gold">{mocCode(inc.mocId)}</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Users size={10} /> {shared.join(', ')}
                </span>
                {inc.comments?.length > 0 && (
                  <span className="flex items-center gap-0.5 text-cyan-300"><MessageSquare size={10} /> {inc.comments.length}</span>
                )}
                {inc.reactions?.length > 0 && <span>· {inc.reactions.length} ⚑</span>}
                <span className="ml-auto flex items-center gap-2">
                  <span>{timeAgo(inc.ts)}</span>
                  {canUpdate ? (
                    <span role="button" tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); updateIncident(inc.id, { status: STATUS_NEXT[inc.status] }); }}
                      className="px-1.5 rounded bg-navy-700 hover:bg-navy-600 text-white uppercase cursor-pointer">
                      {inc.status}
                    </span>
                  ) : (
                    <span className="px-1.5 rounded bg-navy-800 text-slate-300 uppercase">{inc.status}</span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
