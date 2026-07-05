import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store.js';
import { vesselColor, ZONE_STYLE } from '../lib/colors.js';
import { api } from '../api.js';
import MapTools from './MapTools.jsx';

const GHANA_CENTER = [4.6, -1.0];

const BASEMAPS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics', subdomains: '',
  },
  ocean: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — GEBCO, NOAA', subdomains: '',
  },
};

// Build a ship marker. AIS contacts are directional arrows / diamonds; radar &
// satellite contacts (non-cooperative, no AIS) are hollow squares to make the
// sensor-fusion picture obvious. Suspect contacts pulse.
function shipIcon(v, selected) {
  const color = vesselColor(v);
  const dark = v.flags && v.flags.length;
  const size = v.isNavy ? 20 : 16;
  const nonCoop = v.source === 'radar' || v.source === 'sat';
  const ring = dark
    ? `<span class="pulse-ring" style="position:absolute;inset:0;margin:auto;width:${size}px;height:${size}px;border-radius:50%;border:2px solid ${color};"></span>`
    : '';
  let shape;
  if (v.isNavy) {
    shape = `<rect x="6" y="6" width="8" height="8" transform="rotate(45 10 10)" fill="${color}" stroke="#05080f" stroke-width="1"/>`;
  } else if (nonCoop) {
    shape = `<rect x="4.5" y="4.5" width="11" height="11" fill="none" stroke="${color}" stroke-width="2"/>`;
  } else {
    shape = `<path d="M10 2 L15 17 L10 13 L5 17 Z" fill="${color}" stroke="#05080f" stroke-width="1"/>`;
  }
  const sel = selected ? `<circle cx="10" cy="10" r="9" fill="none" stroke="#fcd116" stroke-width="1.5"/>` : '';
  const rot = nonCoop ? 0 : v.heading || 0;
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;">
      ${ring}
      <svg viewBox="0 0 20 20" width="${size}" height="${size}" style="transform:rotate(${rot}deg);position:relative;">
        ${shape}${sel}
      </svg>
    </div>`;
  return L.divIcon({ html, className: 'ship-marker', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function BasemapLayer() {
  const basemap = useStore((s) => s.basemap);
  const b = BASEMAPS[basemap] || BASEMAPS.dark;
  return (
    <TileLayer key={basemap} url={b.url} attribution={b.attribution}
      subdomains={b.subdomains || ''} maxZoom={19} />
  );
}

// When the live feed is pointed at a region away from Ghana (e.g. a coverage
// demo over the Singapore Strait), recentre the map there once.
function LiveRecenter() {
  const map = useMap();
  const source = useStore((s) => s.stats?.source);
  const done = useRef(false);
  useEffect(() => {
    if (!done.current && source?.mode === 'live' && Array.isArray(source.center)) {
      map.setView(source.center, 10);
      done.current = true;
    }
  }, [source, map]);
  return null;
}

function FollowController() {
  const map = useMap();
  const followMmsi = useStore((s) => s.followMmsi);
  const byMmsi = useStore((s) => s.vesselsByMmsi);
  const prevRef = useRef(null);
  useEffect(() => {
    if (!followMmsi) { prevRef.current = null; return; }
    const v = byMmsi[followMmsi];
    if (!v) return;
    if (prevRef.current !== followMmsi) {
      // New follow (e.g. from an alert's Follow button): slew AND zoom in so the
      // highlighted contact is unmistakable.
      prevRef.current = followMmsi;
      map.setView([v.lat, v.lon], Math.max(map.getZoom(), 9), { animate: true });
    } else {
      map.panTo([v.lat, v.lon], { animate: true });
    }
  }, [followMmsi, byMmsi, map]);
  return null;
}

// Pulsing gold halo on the currently selected contact so it stands out the
// moment an operator hits Follow/Track from an alert or panel.
const highlightIcon = L.divIcon({
  className: 'sel-highlight',
  html: `<div style="position:relative;width:52px;height:52px;pointer-events:none;">
    <span class="pulse-ring" style="position:absolute;inset:0;border-radius:50%;border:3px solid #fcd116;"></span>
    <span class="pulse-ring" style="position:absolute;inset:0;border-radius:50%;border:3px solid #fcd116;animation-delay:.6s;"></span>
    <span style="position:absolute;inset:15px;border-radius:50%;border:2px solid #fcd116;box-shadow:0 0 10px #fcd116aa;"></span>
  </div>`,
  iconSize: [52, 52], iconAnchor: [26, 26],
});

function SelectedHighlight() {
  const selectedMmsi = useStore((s) => s.selectedMmsi);
  const byMmsi = useStore((s) => s.vesselsByMmsi);
  const v = selectedMmsi ? byMmsi[selectedMmsi] : null;
  if (!v) return null;
  return (
    <Marker position={[v.lat, v.lon]} icon={highlightIcon}
      interactive={false} zIndexOffset={-1000} />
  );
}

function ZonesLayer() {
  const zones = useStore((s) => s.zones);
  const vis = useStore((s) => s.zoneVisibility);
  return zones.filter((z) => vis[z.kind]).map((z) => {
    const st = ZONE_STYLE[z.kind] || ZONE_STYLE.aoi;
    return (
      <Polygon key={z.id} positions={z.polygon.map(([lon, lat]) => [lat, lon])}
        pathOptions={{ color: st.color, weight: st.weight, dashArray: st.dash, fillColor: st.color, fillOpacity: st.fill }}>
        <Tooltip sticky>{z.name}</Tooltip>
      </Polygon>
    );
  });
}

function VesselMarkers({ onSelect }) {
  const vessels = useStore((s) => s.vessels);
  const replayMode = useStore((s) => s.replayMode);
  const replayFrames = useStore((s) => s.replayFrames);
  const replayIndex = useStore((s) => s.replayIndex);
  const selectedMmsi = useStore((s) => s.selectedMmsi);
  const filters = useStore((s) => s.filters);

  const shown = useMemo(() => {
    if (replayMode) {
      const frame = replayFrames[replayIndex];
      const fv = frame?.vessels || [];
      return filters.darkOnly ? fv.filter((v) => v.flags && v.flags.length) : fv;
    }
    return vessels.filter((v) => {
      if (filters.darkOnly && !(v.flags && v.flags.length)) return false;
      if (filters.type && v.type !== filters.type) return false;
      if (filters.classification && v.classification !== filters.classification) return false;
      if (filters.flag && v.flag !== filters.flag) return false;
      if (filters.q) {
        const s = filters.q.toLowerCase();
        if (!(v.name || '').toLowerCase().includes(s) && !String(v.mmsi).includes(s)) return false;
      }
      return true;
    });
  }, [vessels, filters, replayMode, replayFrames, replayIndex]);

  return shown.map((v) => (
    <Marker key={v.mmsi} position={[v.lat, v.lon]} icon={shipIcon(v, v.mmsi === selectedMmsi)}
      eventHandlers={{ click: () => onSelect(v.mmsi) }}>
      <Tooltip direction="top" offset={[0, -8]}>
        <span className="font-mono text-xs">
          {v.name} {v.flag ? `· ${v.flag}` : ''}
          {v.source === 'radar' ? ' · RADAR' : v.source === 'sat' ? ' · SAT' : ''}
          {typeof v.risk === 'number' ? ` · risk ${v.risk}` : ''}
          {v.flags?.length ? ` · ⚠ ${v.flags.join(', ')}` : ''}
        </span>
      </Tooltip>
    </Marker>
  ));
}

function SelectedTrack() {
  const selectedMmsi = useStore((s) => s.selectedMmsi);
  const replayMode = useStore((s) => s.replayMode);
  const [track, setTrack] = useState([]);
  useEffect(() => {
    let active = true;
    if (!selectedMmsi || replayMode) { setTrack([]); return; }
    const load = () => api.vessel(selectedMmsi).then((v) => active && setTrack(v.track || [])).catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => { active = false; clearInterval(id); };
  }, [selectedMmsi, replayMode]);
  if (track.length < 2) return null;
  return (
    <Polyline positions={track.map((p) => [p.lat, p.lon])}
      pathOptions={{ color: '#fcd116', weight: 1.5, opacity: 0.7, dashArray: '4 4' }} />
  );
}

function BasemapSwitcher() {
  const basemap = useStore((s) => s.basemap);
  const setBasemap = useStore((s) => s.setBasemap);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) L.DomEvent.disableClickPropagation(ref.current); }, []);
  return (
    <div ref={ref} className="absolute top-3 right-3 z-[1000] glass rounded-lg p-1 flex gap-1">
      {Object.keys(BASEMAPS).map((b) => (
        <button key={b} onClick={() => setBasemap(b)}
          className={`px-2 py-1 rounded text-[11px] capitalize ${
            basemap === b ? 'bg-ghana-gold text-navy-950 font-semibold' : 'text-slate-300 hover:bg-navy-700'}`}>
          {b === 'satellite' ? 'Satellite' : b}
        </button>
      ))}
    </div>
  );
}

export default function MapView() {
  const selectVessel = useStore((s) => s.selectVessel);
  const mocs = useStore((s) => s.mocs);
  const mocIconRef = useRef(
    L.divIcon({
      html: `<div style="width:14px;height:14px;border:2px solid #fcd116;background:#0e1524;transform:rotate(45deg);box-shadow:0 0 6px #fcd116"></div>`,
      className: 'moc-marker', iconSize: [14, 14], iconAnchor: [7, 7],
    })
  );

  return (
    <MapContainer center={GHANA_CENTER} zoom={7} zoomControl className="h-full w-full" worldCopyJump>
      <BasemapLayer />
      <ZonesLayer />
      <SelectedTrack />
      <SelectedHighlight />
      <VesselMarkers onSelect={selectVessel} />
      {mocs.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lon]} icon={mocIconRef.current}>
          <Tooltip direction="top" offset={[0, -8]}>
            <span className="font-mono text-xs">{m.code} — {m.name}</span>
          </Tooltip>
        </Marker>
      ))}
      <FollowController />
      <LiveRecenter />
      <MapTools />
      <BasemapSwitcher />
    </MapContainer>
  );
}
