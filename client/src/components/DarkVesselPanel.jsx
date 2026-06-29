import { useMemo } from 'react';
import { EyeOff, Crosshair, Send } from 'lucide-react';
import { useStore } from '../store.js';
import { ALERT_LABELS, RISK_COLORS } from '../lib/colors.js';

const METHODS = [
  { key: 'ais-gap', label: 'AIS Gap', desc: 'Transponder switched off at sea' },
  { key: 'spoofing', label: 'Spoofing', desc: 'Implausible / falsified position' },
  { key: 'loitering', label: 'Loitering', desc: 'Slow drift in sensitive zone' },
  { key: 'sts', label: 'STS Transfer', desc: 'Close rendezvous offshore' },
  { key: 'zone-violation', label: 'Zone Breach', desc: 'Inside restricted area' },
];

export default function DarkVesselPanel() {
  const { vessels, selectVessel, setFollow, createTask, currentMoc, can } = useStore();
  const canTask = can('createTask');

  const dark = useMemo(
    () => vessels.filter((v) => v.flags && v.flags.length)
      .sort((a, b) => (b.risk || 0) - (a.risk || 0) || b.flags.length - a.flags.length),
    [vessels]
  );

  const counts = useMemo(() => {
    const c = {};
    for (const v of dark) for (const f of v.flags) c[f] = (c[f] || 0) + 1;
    return c;
  }, [dark]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 flex items-center gap-2 border-b border-navy-700 text-sm">
        <EyeOff size={15} className="text-threat-high" />
        <span className="font-semibold text-white">Dark Vessel Tracking</span>
        <span className="ml-auto text-xs font-mono text-slate-400">{dark.length} flagged</span>
      </div>

      {/* Detection method summary */}
      <div className="grid grid-cols-5 gap-1 p-2 border-b border-navy-700">
        {METHODS.map((m) => (
          <div key={m.key} title={m.desc}
            className="text-center rounded bg-navy-850 border border-navy-700 py-1.5">
            <div className="text-base font-mono font-bold text-white">{counts[m.key] || 0}</div>
            <div className="text-[8px] uppercase tracking-wide text-slate-400 leading-tight">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="px-3 py-1.5 text-[10px] text-slate-500 leading-snug border-b border-navy-700">
        Fuses AIS gaps, spoofing, loitering, STS rendezvous & zone breaches. In production,
        correlate with coastal radar & SAT/optical imagery to resolve non-cooperative contacts.
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {dark.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">No dark contacts detected.</div>
        )}
        {dark.map((v) => (
          <div key={v.mmsi} className="rounded border border-red-500/40 bg-navy-850 p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-threat-high blink" />
              <span className="text-sm text-white font-medium flex-1 truncate">{v.name}</span>
              {typeof v.risk === 'number' && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${RISK_COLORS[v.riskLevel]}22`, color: RISK_COLORS[v.riskLevel] }}>
                  {v.risk}
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-400">{v.mmsi}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {v.flags.map((f) => (
                <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 uppercase tracking-wide">
                  {ALERT_LABELS[f] || f}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
              <span>{v.flag}</span><span>{v.type}</span><span>{v.speed.toFixed(1)} kn</span>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button onClick={() => { selectVessel(v.mmsi); setFollow(v.mmsi); }}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-navy-700 hover:bg-navy-600 text-white">
                <Crosshair size={12} /> Track
              </button>
              {canTask && (
                <button
                  onClick={() => createTask({
                    title: `Investigate dark contact ${v.name}`,
                    mmsi: v.mmsi, priority: 'priority',
                    assignedTo: currentMoc?.id, assignedToName: currentMoc?.code,
                    note: `Flagged: ${v.flags.join(', ')}`,
                  })}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-ghana-red/80 hover:bg-ghana-red text-white">
                  <Send size={12} /> Task Asset
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
