import { useMemo } from 'react';
import { Search, Layers, Filter, Ship } from 'lucide-react';
import { useStore } from '../store.js';
import { TYPE_LABELS, CLASS_COLORS, vesselColor } from '../lib/colors.js';

const ZONE_TOGGLES = [
  ['eez', 'EEZ (200 NM)'],
  ['territorial', 'Territorial Sea'],
  ['fishing', 'Fishing Zones'],
  ['oil', 'Oil Fields'],
  ['anchorage', 'Anchorages'],
  ['aoi', 'Areas of Interest'],
];

function VesselRow({ v, selected, onClick }) {
  const color = vesselColor(v);
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded border ${
        selected ? 'border-ghana-gold bg-navy-800' : 'border-transparent hover:bg-navy-850'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
        <span className="text-sm text-white truncate flex-1">{v.name}</span>
        {v.flags?.length > 0 && (
          <span className="text-[9px] px-1 rounded bg-red-500/20 text-red-300 uppercase">dark</span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pl-4">
        <span>{TYPE_LABELS[v.type] || v.type || '—'}</span>
        <span>·</span>
        <span>{v.flag || '—'}</span>
        <span>·</span>
        <span>{(v.speed ?? 0).toFixed(1)} kn</span>
      </div>
    </button>
  );
}

export default function Sidebar() {
  const { vessels, filters, setFilter, selectedMmsi, selectVessel,
    zoneVisibility, toggleZone } = useStore();

  const flags = useMemo(
    () => Array.from(new Set(vessels.map((v) => v.flag))).sort(),
    [vessels]
  );

  const filtered = useMemo(() => {
    return vessels
      .filter((v) => {
        if (filters.darkOnly && !(v.flags && v.flags.length)) return false;
        if (filters.type && v.type !== filters.type) return false;
        if (filters.classification && v.classification !== filters.classification) return false;
        if (filters.flag && v.flag !== filters.flag) return false;
        if (filters.q) {
          const s = filters.q.toLowerCase();
          if (!(v.name || '').toLowerCase().includes(s) && !String(v.mmsi).includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.flags?.length || 0) - (a.flags?.length || 0) || (a.name || '').localeCompare(b.name || ''));
  }, [vessels, filters]);

  return (
    <aside className="w-72 shrink-0 bg-navy-900 border-r border-navy-700 flex flex-col">
      {/* Search */}
      <div className="p-3 border-b border-navy-700">
        <div className="relative">
          <Search size={14} className="absolute left-2 top-2.5 text-slate-500" />
          <input
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            placeholder="Search name or MMSI…"
            className="w-full bg-navy-850 border border-navy-700 rounded pl-7 pr-2 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-ghana-gold"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-navy-700 space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
          <Filter size={12} /> Filters
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={filters.type} onChange={(e) => setFilter({ type: e.target.value })}
            className="bg-navy-850 border border-navy-700 rounded px-1.5 py-1 text-xs text-white">
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select value={filters.classification} onChange={(e) => setFilter({ classification: e.target.value })}
            className="bg-navy-850 border border-navy-700 rounded px-1.5 py-1 text-xs text-white">
            <option value="">All classes</option>
            {Object.keys(CLASS_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.flag} onChange={(e) => setFilter({ flag: e.target.value })}
            className="bg-navy-850 border border-navy-700 rounded px-1.5 py-1 text-xs text-white col-span-2">
            <option value="">All flags</option>
            {flags.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" checked={filters.darkOnly}
            onChange={(e) => setFilter({ darkOnly: e.target.checked })}
            className="accent-ghana-gold" />
          Dark / flagged contacts only
        </label>
      </div>

      {/* Layers */}
      <div className="p-3 border-b border-navy-700 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400">
          <Layers size={12} /> Map Layers
        </div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {ZONE_TOGGLES.map(([kind, label]) => (
            <label key={kind} className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={!!zoneVisibility[kind]}
                onChange={() => toggleZone(kind)} className="accent-ghana-gold" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Contact list */}
      <div className="flex items-center justify-between px-3 py-2 text-[10px] uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5"><Ship size={12} /> Contacts</span>
        <span className="font-mono">{filtered.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {filtered.map((v) => (
          <VesselRow key={v.mmsi} v={v} selected={v.mmsi === selectedMmsi}
            onClick={() => selectVessel(v.mmsi)} />
        ))}
      </div>
    </aside>
  );
}
