import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, Users, MapPin } from 'lucide-react';
import { useStore } from '../store.js';
import { fmtTime, timeAgo } from '../lib/format.js';

const CAT_COLOR = {
  piracy: '#ff3b3b', 'iuu-fishing': '#16a085', smuggling: '#bb6bd9',
  sar: '#3aa6ff', pollution: '#ffa726', suspicious: '#fcd116',
};
const SEV_COLOR = { high: '#ff3b3b', medium: '#ffa726', low: '#ffd54f' };
const REACTIONS = ['👍', '✅', '⚠️', '👀', '🚢', '🛟'];

export default function IncidentThread() {
  const { incidents, selectedIncidentId, selectIncident, commentIncident, reactIncident,
    mocs, currentOperator, currentMoc, can } = useStore();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  const inc = incidents.find((i) => i.id === selectedIncidentId);
  const mocCode = (id) => mocs.find((m) => m.id === id)?.code || '—';

  // Group reactions by emoji with counts + whether I reacted.
  const reactionGroups = useMemo(() => {
    const g = {};
    for (const r of inc?.reactions || []) {
      g[r.emoji] = g[r.emoji] || { count: 0, mine: false, who: [] };
      g[r.emoji].count++;
      g[r.emoji].who.push(`${mocCode(r.mocId)} ${r.author}`);
      if (r.author === currentOperator?.name) g[r.emoji].mine = true;
    }
    return g;
  }, [inc, currentOperator]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [inc?.comments?.length]);

  if (!inc) return null;

  const shared = inc.sharedWith?.includes('all') ? ['All institutions'] : (inc.sharedWith || []).map(mocCode);

  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    commentIncident(inc.id, draft);
    setDraft('');
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/60 flex items-center justify-center p-6" onClick={() => selectIncident(null)}>
      <div className="w-[560px] max-w-full h-[80vh] glass rounded-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-navy-700">
          <div className="flex items-start gap-2">
            <span className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={{ background: CAT_COLOR[inc.category] }} />
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold">{inc.title}</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 flex-wrap">
                <span>{inc.id}</span>
                <span className="px-1.5 rounded uppercase" style={{ background: `${SEV_COLOR[inc.severity]}22`, color: SEV_COLOR[inc.severity] }}>{inc.severity}</span>
                <span className="px-1.5 rounded bg-navy-700 uppercase text-slate-200">{inc.status}</span>
                <span className="px-1.5 rounded bg-navy-700 text-slate-300">{inc.category}</span>
              </div>
            </div>
            <button onClick={() => selectIncident(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-2 flex-wrap">
            <span>Reported by <span className="text-ghana-gold font-mono">{mocCode(inc.mocId)}</span> · {inc.reportedBy}</span>
            <span>·</span>
            <span>{timeAgo(inc.ts)}</span>
            {inc.mmsi && <span className="flex items-center gap-1"><MapPin size={10} /> MMSI {inc.mmsi}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-300 mt-1.5">
            <Users size={12} className="text-slate-400" /> Shared with:
            {shared.map((s, i) => (
              <span key={i} className="px-1.5 py-0.5 rounded bg-navy-800 text-cyan-200 font-mono text-[10px]">{s}</span>
            ))}
          </div>
        </div>

        {/* Description + reactions */}
        <div className="px-4 py-2.5 border-b border-navy-700">
          {inc.description && <div className="text-sm text-slate-200 mb-2">{inc.description}</div>}
          <div className="flex items-center gap-1.5 flex-wrap">
            {REACTIONS.map((emoji) => {
              const g = reactionGroups[emoji];
              return (
                <button key={emoji} onClick={() => reactIncident(inc.id, emoji)}
                  title={g?.who.join(', ') || 'React'}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border ${
                    g?.mine ? 'border-ghana-gold bg-ghana-gold/15' : 'border-navy-700 bg-navy-850 hover:bg-navy-700'}`}>
                  <span>{emoji}</span>
                  {g?.count > 0 && <span className="text-[11px] text-slate-300 font-mono">{g.count}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Discussion thread */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {(!inc.comments || inc.comments.length === 0) && (
            <div className="text-center text-slate-500 text-sm py-8">
              No discussion yet. Start the conversation with the institutions this was shared with.
            </div>
          )}
          {(inc.comments || []).map((c) => {
            const mine = c.author === currentOperator?.name && c.mocId === currentMoc?.id;
            return (
              <div key={c.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                  <span className="px-1 rounded bg-navy-800 text-ghana-gold font-mono">{mocCode(c.mocId)}</span>
                  <span>{c.author}</span><span>·</span><span>{fmtTime(c.ts)}</span>
                </div>
                <div className={`max-w-[85%] text-sm px-2.5 py-1.5 rounded-lg ${
                  mine ? 'bg-ghana-green/30 border border-ghana-green/40' : 'bg-navy-800 border border-navy-700'} text-slate-100`}>
                  {c.text}
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <form onSubmit={send} className="p-2 border-t border-navy-700 flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder="Comment on this incident…"
            className="flex-1 bg-navy-850 border border-navy-700 rounded px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ghana-gold" />
          <button type="submit" className="px-3 rounded bg-ghana-gold text-navy-950 hover:brightness-110"><Send size={16} /></button>
        </form>
      </div>
    </div>
  );
}
