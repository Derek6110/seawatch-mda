import { Check, Crosshair, ShieldAlert } from 'lucide-react';
import { useStore } from '../store.js';
import { SEVERITY_COLORS, ALERT_LABELS } from '../lib/colors.js';
import { timeAgo } from '../lib/format.js';

export default function AlertsPanel() {
  const { alerts, ackAlert, resolveAlert, selectVessel, setFollow, can } = useStore();
  const open = alerts.filter((a) => a.status === 'open');
  const canAck = can('ackAlert');
  const canResolve = can('resolveAlert');

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-navy-700 text-sm">
        <ShieldAlert size={15} className="text-threat-high" />
        <span className="font-semibold text-white">Threat & Anomaly Alerts</span>
        <span className="ml-auto text-xs font-mono text-slate-400">{open.length} open</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {open.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">No open alerts. Picture clear.</div>
        )}
        {open.map((a) => (
          <div key={a.id} className="rounded border border-navy-700 bg-navy-850 overflow-hidden">
            <div className="h-1" style={{ background: SEVERITY_COLORS[a.severity] }} />
            <div className="p-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wide"
                  style={{ background: `${SEVERITY_COLORS[a.severity]}22`, color: SEVERITY_COLORS[a.severity] }}>
                  {a.severity}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-700 text-slate-300 uppercase tracking-wide">
                  {ALERT_LABELS[a.type] || a.type}
                </span>
                <span className="ml-auto text-[10px] text-slate-500 font-mono">{a.id}</span>
              </div>
              <div className="text-sm text-white font-medium">{a.title}</div>
              <div className="text-xs text-slate-400 leading-snug">{a.detail}</div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-500 font-mono">{timeAgo(a.ts)}</span>
                {a.acknowledged && (
                  <span className="text-[10px] text-ghana-green flex items-center gap-1">
                    <Check size={10} /> Ack {a.acknowledgedBy}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  {a.mmsi && (
                    <button
                      onClick={() => { selectVessel(a.mmsi); setFollow(a.mmsi); }}
                      title="Slew map to contact"
                      className="p-1 rounded hover:bg-navy-700 text-slate-300">
                      <Crosshair size={14} />
                    </button>
                  )}
                  {!a.acknowledged && canAck && (
                    <button onClick={() => ackAlert(a.id)}
                      className="text-[11px] px-2 py-0.5 rounded bg-navy-700 hover:bg-navy-600 text-white">
                      Ack
                    </button>
                  )}
                  {canResolve && (
                    <button onClick={() => resolveAlert(a.id)}
                      className="text-[11px] px-2 py-0.5 rounded bg-ghana-green/80 hover:bg-ghana-green text-white">
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
