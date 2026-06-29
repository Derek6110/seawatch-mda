import { useEffect, useRef, useState } from 'react';
import { Send, Users, Hash, Radio } from 'lucide-react';
import { useStore } from '../store.js';
import { fmtTime } from '../lib/format.js';

const CHANNEL_LABELS = {
  'ops-national': 'National Ops',
  'zone-f-regional': 'Zone F (Regional)',
  intel: 'Intelligence',
  vtmis: 'VTMIS (Inter-agency)',
  sar: 'Search & Rescue',
  'wnc-ops': 'WNC Ops',
  'enc-ops': 'ENC Ops',
};

export default function CollaborationPanel() {
  const { mocs, currentMoc, currentOperator, activeChannel, joinChannel,
    messages, presence, sendMessage } = useStore();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  // Channels available to this workstation's MOC, plus any already populated.
  const channels = Array.from(
    new Set([...(currentMoc?.channels || []), 'ops-national', 'zone-f-regional', 'intel', 'vtmis', 'sar'])
  );

  const msgs = messages[activeChannel] || [];
  const members = presence[activeChannel] || [];

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [msgs.length, activeChannel]);

  const mocCode = (id) => mocs.find((m) => m.id === id)?.code || '—';

  const submit = (e) => {
    e.preventDefault();
    sendMessage(draft);
    setDraft('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-navy-700 text-sm">
        <Radio size={15} className="text-ghana-gold" />
        <span className="font-semibold text-white">MOC Collaboration</span>
      </div>

      {/* Channel selector */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-navy-700">
        {channels.map((c) => (
          <button key={c} onClick={() => joinChannel(c)}
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded ${
              activeChannel === c ? 'bg-ghana-gold text-navy-950 font-semibold' : 'bg-navy-850 text-slate-300 hover:bg-navy-700'
            }`}>
            <Hash size={11} /> {CHANNEL_LABELS[c] || c}
          </button>
        ))}
      </div>

      {/* Presence */}
      <div className="px-3 py-1.5 flex items-center gap-2 border-b border-navy-700 text-[11px] text-slate-400">
        <Users size={12} />
        {members.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {members.map((m, i) => (
              <span key={i} className="px-1.5 rounded bg-navy-800 text-slate-200">
                {mocCode(m.mocId)} · {m.operator || 'op'}
              </span>
            ))}
          </span>
        ) : (
          <span>You are the only station on this channel</span>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {msgs.map((m) => {
          const mine = m.author === currentOperator?.name;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                <span className="px-1 rounded bg-navy-800 text-ghana-gold font-mono">{mocCode(m.mocId)}</span>
                <span>{m.author}</span>
                <span>·</span>
                <span>{fmtTime(m.ts)}</span>
              </div>
              <div className={`max-w-[85%] text-sm px-2.5 py-1.5 rounded-lg ${
                mine ? 'bg-ghana-green/30 border border-ghana-green/40' : 'bg-navy-800 border border-navy-700'
              } text-slate-100`}>
                {m.text}
              </div>
            </div>
          );
        })}
        {msgs.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            No traffic on this channel yet. Start the conversation.
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="p-2 border-t border-navy-700 flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${CHANNEL_LABELS[activeChannel] || activeChannel}…`}
          className="flex-1 bg-navy-850 border border-navy-700 rounded px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ghana-gold" />
        <button type="submit" className="px-3 rounded bg-ghana-gold text-navy-950 hover:brightness-110">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
