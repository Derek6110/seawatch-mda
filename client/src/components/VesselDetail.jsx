import { X, Crosshair, Share2, Navigation2 } from 'lucide-react';
import { useStore } from '../store.js';
import { vesselColor, TYPE_LABELS, ALERT_LABELS, RISK_COLORS } from '../lib/colors.js';
import { fmtCoord, timeAgo } from '../lib/format.js';

const SOURCE_LABELS = { 'ais-live': 'Live AIS', ais: 'AIS', sim: 'AIS', radar: 'Coastal Radar', sat: 'Satellite' };

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm text-white font-mono">{value}</div>
    </div>
  );
}

export default function VesselDetail() {
  const { selectedMmsi, vesselsByMmsi, selectVessel, setFollow, followMmsi,
    createTask, currentMoc, setRightTab, can } = useStore();
  const v = selectedMmsi ? vesselsByMmsi[selectedMmsi] : null;
  if (!v) return null;
  const color = vesselColor(v);
  const dark = v.flags && v.flags.length;
  const canTask = can('createTask');

  return (
    <div className="absolute bottom-4 left-4 z-[1000] w-80 glass rounded-lg shadow-2xl overflow-hidden">
      <div className="h-1" style={{ background: color }} />
      <div className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          <span className="w-3 h-3 rounded-full mt-1" style={{ background: color }} />
          <div className="flex-1">
            <div className="text-base font-semibold text-white leading-tight">{v.name}</div>
            <div className="text-[11px] text-slate-400 font-mono">
              {v.isNavy && v.pennant ? `${v.pennant} · ` : ''}MMSI {v.mmsi} · {v.callsign}
            </div>
          </div>
          <button onClick={() => selectVessel(null)} className="text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {typeof v.risk === 'number' && !v.isNavy && (
            <span className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wide font-semibold"
              style={{ background: `${RISK_COLORS[v.riskLevel]}22`, color: RISK_COLORS[v.riskLevel] }}>
              Risk {v.risk} · {v.riskLevel}
            </span>
          )}
          <span className="inline-block text-[10px] px-2 py-0.5 rounded uppercase tracking-wide"
            style={{ background: `${color}22`, color }}>
            {v.classification}
          </span>
        </div>
        {dark ? (
          <div className="flex flex-wrap gap-1">
            {v.flags.map((f) => (
              <span key={f} className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 uppercase tracking-wide">
                ⚠ {ALERT_LABELS[f] || f}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Type" value={TYPE_LABELS[v.type] || v.type} />
          <Field label="Flag" value={v.flag} />
          <Field label="Speed" value={`${v.speed.toFixed(1)} kn`} />
          <Field label="Course" value={`${Math.round(v.course)}°`} />
          <Field label="Length" value={v.length ? `${v.length} m` : '—'} />
          <Field label="Sensor" value={SOURCE_LABELS[v.source] || 'AIS'} />
          <div className="col-span-2">
            <Field label="Position" value={fmtCoord(v.lat, v.lon)} />
          </div>
          <div className="col-span-2">
            <Field label="Last AIS report" value={v.aisOn ? timeAgo(v.lastReport) : `⚠ DARK · ${timeAgo(v.lastReport)}`} />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setFollow(v.mmsi)}
            className={`flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded ${
              followMmsi === v.mmsi ? 'bg-ghana-gold text-navy-950 font-semibold' : 'bg-navy-700 hover:bg-navy-600 text-white'
            }`}>
            <Navigation2 size={13} /> {followMmsi === v.mmsi ? 'Following' : 'Follow'}
          </button>
          {canTask && (
            <button onClick={() => createTask({
              title: `Investigate ${v.name}`, mmsi: v.mmsi,
              priority: dark ? 'priority' : 'routine',
              assignedTo: currentMoc?.id, assignedToName: currentMoc?.code,
            })}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded bg-navy-700 hover:bg-navy-600 text-white">
              <Crosshair size={13} /> Task
            </button>
          )}
          <button onClick={() => setRightTab('incidents')}
            className="flex-1 flex items-center justify-center gap-1 text-[11px] py-1.5 rounded bg-navy-700 hover:bg-navy-600 text-white">
            <Share2 size={13} /> Report
          </button>
        </div>
      </div>
    </div>
  );
}
