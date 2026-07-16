import { useEffect, useState } from 'react';
import { Radio, ShieldAlert, Activity, Circle, FileText, LogOut, Satellite, Users } from 'lucide-react';
import { useStore } from '../store.js';
import { fmtClock } from '../lib/format.js';
import { ROLE_SHORT } from '../lib/roles.js';
import { generateSitrep } from '../lib/sitrep.js';
import Logo from './Logo.jsx';

function Stat({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded bg-navy-850 border border-navy-700">
      <Icon size={15} style={{ color: accent }} />
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
        <div className="text-sm font-semibold font-mono" style={{ color: accent }}>{value}</div>
      </div>
    </div>
  );
}

export default function TopBar() {
  const { mocs, currentMoc, setMoc, stats, connected, source, user, logout,
    setSourceMode, setAdminOpen, can } = useStore();
  const liveAvailable = stats?.source?.hasKey;
  const [clock, setClock] = useState(fmtClock());
  useEffect(() => {
    const id = setInterval(() => setClock(fmtClock()), 1000);
    return () => clearInterval(id);
  }, []);

  // Honest source indicator: reflect mode and how many *real* live contacts are
  // currently being received (the Gulf of Guinea has sparse free-AIS coverage).
  const mode = stats?.source?.mode || source?.mode || 'sim';
  const liveVessels = stats?.source?.liveVessels ?? 0;
  const liveConnected = stats?.source?.live ?? source?.live;
  const srcLabel = mode === 'live' ? 'Live AIS'
    : mode === 'hybrid' ? 'Live + Sim'
    : 'Simulation';
  const srcActive = mode !== 'sim';

  return (
    <header className="h-14 flex items-center gap-4 px-4 bg-navy-900 border-b border-navy-700 shrink-0">
      <div className="flex items-center gap-3">
        <Logo size={38} />
        <div className="leading-tight">
          <div className="text-base font-bold tracking-widest text-white">SeaWatch</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400">Ghana Navy · Maritime Domain Awareness</div>
        </div>
      </div>

      <div className="h-8 w-px bg-navy-700" />

      {/* Data source switch (Simulation / Live AIS / Hybrid) */}
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${
        srcActive ? 'border-ghana-green/50 bg-ghana-green/10' : 'border-navy-700 bg-navy-850'}`}
        title={liveConnected ? `AISStream connected · ${liveVessels} live contacts in area` : 'Simulator'}>
        <Satellite size={14} className={srcActive ? 'text-ghana-green' : 'text-slate-400'} />
        <select value={mode} onChange={(e) => setSourceMode(e.target.value)}
          className={`bg-transparent text-[11px] font-semibold uppercase tracking-wide focus:outline-none cursor-pointer ${srcActive ? 'text-ghana-green' : 'text-slate-300'}`}>
          <option value="sim" className="bg-navy-850 text-white">Simulation</option>
          <option value="live" disabled={!liveAvailable} className="bg-navy-850 text-white">Live AIS{liveAvailable ? '' : ' (no key)'}</option>
          <option value="hybrid" disabled={!liveAvailable} className="bg-navy-850 text-white">Live + Sim{liveAvailable ? '' : ' (no key)'}</option>
        </select>
        {mode !== 'sim' && <span className={`text-[11px] font-mono ${srcActive ? 'text-ghana-green' : 'text-slate-300'}`}>· {liveVessels}</span>}
        {mode !== 'sim' && stats?.source?.region && (
          <span className="text-[10px] text-slate-400 whitespace-nowrap" title="Live AIS coverage area (demo region until a Ghana feed is acquired)">
            · {stats.source.region}
          </span>
        )}
      </div>

      {/* Workstation MOC selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-400">MOC</span>
        <select value={currentMoc?.id || ''} onChange={(e) => setMoc(e.target.value)}
          className="bg-navy-850 border border-navy-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-ghana-gold">
          {mocs.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Stat icon={Radio} label="Tracks" value={stats?.totalVessels ?? '—'} accent="#3aa6ff" />
        <Stat icon={ShieldAlert} label="Dark" value={stats?.darkVessels ?? '—'} accent="#ff3b3b" />
        <Stat icon={Activity} label="Alerts" value={stats?.openAlerts ?? '—'} accent="#ffa726" />
      </div>

      <div className="h-8 w-px bg-navy-700" />

      {/* SITREP */}
      <button onClick={() => generateSitrep(useStore.getState())}
        title="Generate printable Situation Report"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-navy-850 border border-navy-700 text-slate-200 hover:border-ghana-gold text-xs">
        <FileText size={14} /> SITREP
      </button>

      {/* Clock + link status */}
      <div className="text-right leading-tight">
        <div className="font-mono text-sm text-white">{clock} <span className="text-slate-500 text-xs">UTC</span></div>
        <div className="flex items-center gap-1 justify-end">
          <Circle size={8} className={connected ? 'text-ghana-green fill-ghana-green' : 'text-red-500 fill-red-500 blink'} />
          <span className="text-[10px] uppercase tracking-wider text-slate-400">{connected ? 'Feed Live' : 'Reconnecting'}</span>
        </div>
      </div>

      <div className="h-8 w-px bg-navy-700" />

      {/* User + logout */}
      <div className="flex items-center gap-2">
        <div className="text-right leading-tight">
          <div className="text-sm text-white">{user?.name || '—'}</div>
          <div className="text-[10px] uppercase tracking-wider text-ghana-gold">{ROLE_SHORT[user?.role] || ''}</div>
        </div>
        {can('manageUsers') && (
          <button onClick={() => setAdminOpen(true)} title="Admin dashboard"
            className="p-2 rounded hover:bg-navy-700 text-ghana-gold">
            <Users size={16} />
          </button>
        )}
        <button onClick={logout} title="Sign out" className="p-2 rounded hover:bg-navy-700 text-slate-300">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
