import { useEffect } from 'react';
import { ScrollText, RefreshCw } from 'lucide-react';
import { useStore } from '../store.js';
import { ROLE_SHORT } from '../lib/roles.js';
import { timeAgo } from '../lib/format.js';

const ACTION_COLOR = {
  login: '#3aa6ff',
  'alert.ack': '#ffd54f',
  'alert.resolve': '#2ecc71',
  'incident.create': '#e74c3c',
  'task.create': '#bb6bd9',
};

export default function AuditPanel() {
  const { audit, refreshAudit, can } = useStore();
  useEffect(() => { refreshAudit(); }, [refreshAudit]);

  if (!can('viewAudit')) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm">
        Audit trail is restricted to OIC and above.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-navy-700 text-sm">
        <ScrollText size={15} className="text-ghana-gold" />
        <span className="font-semibold text-white">Audit Trail</span>
        <button onClick={refreshAudit} className="ml-auto text-slate-400 hover:text-white"><RefreshCw size={14} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {audit.length === 0 && <div className="text-center text-slate-500 text-sm py-8">No audit entries yet.</div>}
        {audit.map((e) => (
          <div key={e.id} className="rounded border border-navy-700 bg-navy-850 px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACTION_COLOR[e.action] || '#7f8fa6' }} />
              <span className="text-[10px] font-mono px-1 rounded bg-navy-700 text-ghana-gold">{ROLE_SHORT[e.role] || e.role}</span>
              <span className="text-sm text-white truncate flex-1">{e.name}</span>
              <span className="text-[10px] text-slate-500 font-mono">{timeAgo(e.ts)}</span>
            </div>
            <div className="text-[11px] text-slate-400 pl-3.5">
              <span className="text-slate-300">{e.action}</span> — {e.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
