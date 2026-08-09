import { useEffect } from 'react';
import { ShieldAlert, EyeOff, Radio, FileWarning, ScrollText, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { useStore } from './store.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Login from './components/Login.jsx';
import TopBar from './components/TopBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import MapView from './components/MapView.jsx';
import VesselDetail from './components/VesselDetail.jsx';
import Legend from './components/Legend.jsx';
import ReplayBar from './components/ReplayBar.jsx';
import AlertsPanel from './components/AlertsPanel.jsx';
import DarkVesselPanel from './components/DarkVesselPanel.jsx';
import CollaborationPanel from './components/CollaborationPanel.jsx';
import IncidentPanel from './components/IncidentPanel.jsx';
import IncidentThread from './components/IncidentThread.jsx';
import AuditPanel from './components/AuditPanel.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';

const BASE_TABS = [
  { key: 'alerts', label: 'Alerts', icon: ShieldAlert },
  { key: 'dark', label: 'Dark Vessels', icon: EyeOff },
  { key: 'collab', label: 'Collaborate', icon: Radio },
  { key: 'incidents', label: 'Incidents', icon: FileWarning },
];

// Thin rail shown in place of a collapsed panel; click to expand it again.
function CollapsedRail({ side, label, icon: Icon, badge, onExpand }) {
  const Chevron = side === 'left' ? ChevronRight : ChevronLeft;
  const border = side === 'left' ? 'border-r' : 'border-l';
  return (
    <div className={`w-9 shrink-0 bg-navy-900 ${border} border-navy-700 flex flex-col items-center py-2 gap-3`}>
      <button onClick={onExpand} title={`Expand ${label} panel`}
        className="relative p-1.5 rounded text-slate-300 hover:bg-navy-700 hover:text-ghana-gold">
        <Chevron size={16} />
        {badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 text-[8px] px-1 rounded-full bg-ghana-red text-white font-mono">{badge}</span>
        )}
      </button>
      <button onClick={onExpand} title={`Expand ${label} panel`}
        className="text-slate-400 hover:text-ghana-gold">
        <Icon size={15} />
      </button>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 whitespace-nowrap"
        style={{ writingMode: 'vertical-rl' }}>{label}</div>
    </div>
  );
}

function RightPanel() {
  const { rightTab, setRightTab, stats, alerts, can, toggleRight } = useStore();
  const openAlerts = alerts.filter((a) => a.status === 'open').length;
  const badges = { alerts: openAlerts, dark: stats?.darkVessels || 0 };
  const tabs = can('viewAudit') ? [...BASE_TABS, { key: 'audit', label: 'Audit', icon: ScrollText }] : BASE_TABS;

  return (
    <aside className="w-96 shrink-0 bg-navy-900 border-l border-navy-700 flex flex-col">
      <nav className="flex border-b border-navy-700 items-stretch">
        <button onClick={toggleRight} title="Collapse panel"
          className="px-2 flex items-center text-slate-400 hover:text-ghana-gold hover:bg-navy-800 border-r border-navy-700">
          <ChevronRight size={16} />
        </button>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setRightTab(key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] uppercase tracking-wide relative ${
              rightTab === key ? 'text-ghana-gold' : 'text-slate-400 hover:text-slate-200'}`}>
            <Icon size={16} />
            {label}
            {badges[key] > 0 && (
              <span className="absolute top-1 right-1/4 text-[8px] px-1 rounded-full bg-ghana-red text-white font-mono">{badges[key]}</span>
            )}
            {rightTab === key && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-ghana-gold" />}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-hidden">
        {rightTab === 'alerts' && <AlertsPanel />}
        {rightTab === 'dark' && <DarkVesselPanel />}
        {rightTab === 'collab' && <CollaborationPanel />}
        {rightTab === 'incidents' && <IncidentPanel />}
        {rightTab === 'audit' && <AuditPanel />}
      </div>
    </aside>
  );
}

export default function App() {
  const { user, authChecked, bootstrapAuth, connected, vessels, adminOpen, selectedIncidentId,
    leftCollapsed, rightCollapsed, toggleLeft, toggleRight, alerts, stats } = useStore();

  useEffect(() => { bootstrapAuth(); }, [bootstrapAuth]);

  // Gate the whole console behind authentication.
  if (!authChecked) {
    return (
      <div className="h-screen flex items-center justify-center bg-navy-950">
        <div className="text-ghana-gold text-lg font-semibold tracking-widest animate-pulse">SeaWatch</div>
      </div>
    );
  }
  if (!user) return <Login />;

  const loading = vessels.length === 0;

  return (
    <div className="h-screen flex flex-col bg-navy-950 text-slate-100 overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        {leftCollapsed
          ? <CollapsedRail side="left" label="Filters" icon={SlidersHorizontal} onExpand={toggleLeft} />
          : <ErrorBoundary label="Sidebar"><Sidebar /></ErrorBoundary>}
        <main className="flex-1 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-ghana-gold text-lg font-semibold tracking-widest animate-pulse">SeaWatch</div>
                <div className="text-slate-400 text-sm mt-1">
                  {connected ? 'Acquiring maritime picture…' : 'Connecting to backend on :4000…'}
                </div>
              </div>
            </div>
          ) : (
            <ErrorBoundary label="Map">
              <MapView />
              <VesselDetail />
              <Legend />
              <ReplayBar />
            </ErrorBoundary>
          )}
        </main>
        {rightCollapsed
          ? <CollapsedRail side="right" label="Threats" icon={ShieldAlert} onExpand={toggleRight}
              badge={alerts.filter((a) => a.status === 'open').length + (stats?.darkVessels || 0)} />
          : <ErrorBoundary label="Panel"><RightPanel /></ErrorBoundary>}
      </div>
      {adminOpen && <ErrorBoundary label="Admin"><AdminDashboard /></ErrorBoundary>}
      {selectedIncidentId && <ErrorBoundary label="Incident"><IncidentThread /></ErrorBoundary>}
    </div>
  );
}
