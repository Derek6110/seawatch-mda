import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MousePointer2, Ruler, Target, Square, Circle as CircleIcon,
  Pentagon, MapPin, Trash2, Undo2,
} from 'lucide-react';
import { useStore } from '../store.js';

const NM = 1852; // metres per nautical mile
const RING_PRESETS = [5, 10, 25, 50]; // NM

// Drawing palette — gold, blue, green, red, purple, white.
const COLORS = ['#fcd116', '#3aa6ff', '#2ecc71', '#ff4d4d', '#bb6bd9', '#f2f6fa'];
const WEIGHTS = [1.5, 2.5, 4];

function bearing(a, b) {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
const nm = (m) => (m / NM).toFixed(2);

function textIcon(text, color = '#fcd116') {
  return L.divIcon({
    className: 'measure-label',
    html: `<span style="background:#0e1524cc;border:1px solid ${color};color:${color};font:11px ui-monospace,monospace;padding:1px 5px;border-radius:4px;white-space:nowrap;">${text}</span>`,
    iconSize: [0, 0],
  });
}
function dotIcon(color = '#fcd116') {
  return L.divIcon({
    className: 'measure-dot',
    html: `<span style="display:block;width:8px;height:8px;border-radius:50%;background:${color};border:1px solid #05080f;"></span>`,
    iconSize: [8, 8], iconAnchor: [4, 4],
  });
}

// Rebuild a Leaflet layer group from a shared-overlay spec. All clients render
// overlays from these specs, so drawings look identical on every MOC's screen.
function buildOverlayGroup(o) {
  const g = L.featureGroup();
  const style = { color: o.color, weight: o.weight };
  const geom = o.geometry || {};
  if (o.kind === 'measure' && geom.pts?.length >= 2) {
    L.polyline(geom.pts, style).addTo(g);
    geom.pts.forEach((p) => L.marker(p, { icon: dotIcon(o.color), interactive: false }).addTo(g));
    if (o.label) L.marker(geom.pts[geom.pts.length - 1], { icon: textIcon(o.label, o.color), interactive: false }).addTo(g);
  } else if (o.kind === 'polygon' && geom.pts?.length >= 3) {
    L.polygon(geom.pts, { ...style, fillColor: o.color, fillOpacity: 0.08 }).addTo(g);
    if (o.label) {
      const c = geom.pts.reduce((a, p) => [a[0] + p[0] / geom.pts.length, a[1] + p[1] / geom.pts.length], [0, 0]);
      L.marker(c, { icon: textIcon(o.label, o.color), interactive: false }).addTo(g);
    }
  } else if (o.kind === 'rings' && geom.center) {
    L.marker(geom.center, { icon: dotIcon(o.color), interactive: false }).addTo(g);
    RING_PRESETS.forEach((r) => {
      L.circle(geom.center, { radius: r * NM, color: o.color, weight: 1, fill: false, dashArray: '3 5' }).addTo(g);
      L.marker([geom.center[0] + (r * NM) / 111320, geom.center[1]], { icon: textIcon(`${r} NM`, o.color), interactive: false }).addTo(g);
    });
  } else if (o.kind === 'rect' && geom.bounds) {
    L.rectangle(geom.bounds, { ...style, fillColor: o.color, fillOpacity: 0.1 }).addTo(g);
  } else if (o.kind === 'circle' && geom.center && geom.radiusM) {
    const c = L.circle(geom.center, { radius: geom.radiusM, ...style, fillColor: o.color, fillOpacity: 0.1 }).addTo(g);
    if (o.label) c.bindTooltip(o.label, { sticky: true });
  } else if (o.kind === 'marker' && geom.pos) {
    const m = L.marker(geom.pos, { icon: dotIcon(o.color) }).addTo(g);
    if (o.label) m.bindTooltip(o.label, { permanent: true, direction: 'top', offset: [0, -6] }).openTooltip();
  }
  return g;
}

const TOOLS = [
  { key: 'select', icon: MousePointer2, title: 'Select / pan — click a drawing to edit it' },
  { key: 'measure', icon: Ruler, title: 'Measure distance & bearing (click points, double-click to finish)' },
  { key: 'rings', icon: Target, title: 'Range rings (click a centre)' },
  { key: 'rectangle', icon: Square, title: 'Draw rectangle (drag)' },
  { key: 'circle', icon: CircleIcon, title: 'Draw circle (click centre, click edge)' },
  { key: 'polygon', icon: Pentagon, title: 'Draw polygon (click points, double-click to finish)' },
  { key: 'marker', icon: MapPin, title: 'Drop labelled marker' },
];

export default function MapTools() {
  const map = useMap();
  const overlays = useStore((s) => s.overlays);
  const mocs = useStore((s) => s.mocs);
  const [tool, setTool] = useState('select');
  const [color, setColor] = useState(COLORS[0]);
  const [weight, setWeight] = useState(WEIGHTS[1]);
  const [readout, setReadout] = useState('');
  const fgRef = useRef(null);
  const tempRef = useRef(null);
  const barRef = useRef(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const weightRef = useRef(weight);
  toolRef.current = tool;
  colorRef.current = color;
  weightRef.current = weight;

  // Persistent overlay layer + in-progress scratch layer.
  useEffect(() => {
    if (import.meta.env.DEV) window.__seawatchMap = map; // dev-only automation hook
    fgRef.current = L.featureGroup().addTo(map);
    tempRef.current = L.layerGroup().addTo(map);
    if (barRef.current) {
      L.DomEvent.disableClickPropagation(barRef.current);
      L.DomEvent.disableScrollPropagation(barRef.current);
    }
    return () => {
      map.removeLayer(fgRef.current);
      map.removeLayer(tempRef.current);
    };
  }, [map]);

  // Save a finished drawing as a shared overlay — persisted server-side and
  // broadcast live to every MOC; rendering happens via the overlays effect.
  const save = (spec) => {
    useStore.getState().createOverlay({ color: colorRef.current, weight: weightRef.current, ...spec });
  };

  // Render all shared overlays from state (rebuilt on any add/update/delete,
  // including edits made by other MOCs).
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.clearLayers();
    for (const o of overlays) {
      const g = buildOverlayGroup(o);
      g.on('click', (e) => {
        if (toolRef.current !== 'select') return;
        L.DomEvent.stopPropagation(e);
        openEditPopup(o, e.latlng);
      });
      fg.addLayer(g);
    }
  }, [overlays]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEditPopup = (overlay, latlng) => {
    const st = useStore.getState();
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:160px;';
    const title = document.createElement('div');
    const moc = mocs.find((m) => m.id === overlay.mocId)?.code || '';
    title.innerHTML = `<b style="color:#e6edf6;font:600 12px system-ui;">Edit drawing</b><br><span style="color:#93a7be;font:10px system-ui;">by ${overlay.author || 'operator'}${moc ? ` · ${moc}` : ''}</span>`;
    div.appendChild(title);

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:5px;';
    COLORS.forEach((c) => {
      const b = document.createElement('button');
      b.title = 'Recolour';
      b.style.cssText = `width:18px;height:18px;border-radius:50%;background:${c};border:1px solid #05080f;cursor:pointer;`;
      b.onclick = () => { st.updateOverlay(overlay.id, { color: c }); map.closePopup(); };
      row.appendChild(b);
    });
    div.appendChild(row);

    const del = document.createElement('button');
    del.textContent = 'Delete drawing';
    del.style.cssText = 'margin-top:2px;padding:4px 8px;font:600 11px system-ui;color:#ffb4b4;background:#3a1520;border:1px solid #6b2333;border-radius:6px;cursor:pointer;';
    del.onclick = () => { st.deleteOverlay(overlay.id); map.closePopup(); };
    div.appendChild(del);

    L.popup({ closeButton: true, offset: [0, -4] }).setLatLng(latlng).setContent(div).openOn(map);
  };

  // Bind map interaction handlers for the active tool.
  useEffect(() => {
    const temp = tempRef.current;
    if (!temp) return;
    temp.clearLayers();
    setReadout('');

    map.getContainer().style.cursor = tool === 'select' ? '' : 'crosshair';
    if (tool === 'rectangle') map.dragging.disable(); else map.dragging.enable();
    if (tool === 'measure' || tool === 'polygon') map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();

    const handlers = {};
    const C = () => colorRef.current;
    const W = () => weightRef.current;
    const toPair = (p) => [p.lat, p.lng];

    if (tool === 'measure' || tool === 'polygon') {
      const pts = [];
      const redraw = (cursor) => {
        temp.clearLayers();
        const all = cursor ? [...pts, cursor] : pts;
        if (all.length >= 1) {
          const shape = tool === 'polygon'
            ? L.polygon(all, { color: C(), weight: W(), dashArray: '5 5', fillOpacity: 0.05 })
            : L.polyline(all, { color: C(), weight: W(), dashArray: '5 5' });
          temp.addLayer(shape);
        }
        pts.forEach((p) => temp.addLayer(L.marker(p, { icon: dotIcon(C()) })));
      };
      handlers.click = (e) => { pts.push(e.latlng); redraw(); };
      handlers.mousemove = (e) => {
        if (!pts.length) return;
        redraw(e.latlng);
        const last = pts[pts.length - 1];
        const legM = map.distance(last, e.latlng);
        let totalM = 0;
        for (let i = 1; i < pts.length; i++) totalM += map.distance(pts[i - 1], pts[i]);
        totalM += legM;
        if (tool === 'measure') setReadout(`leg ${nm(legM)} NM · ${Math.round(bearing(last, e.latlng))}°T · total ${nm(totalM)} NM`);
        else setReadout(`${pts.length} pts · perimeter ${nm(totalM)} NM`);
      };
      handlers.dblclick = (e) => {
        L.DomEvent.stop(e);
        // A double-click fires two click events first, adding duplicate points at
        // the same spot — drop trailing near-duplicates before finishing.
        while (pts.length > 1 && map.distance(pts[pts.length - 1], pts[pts.length - 2]) < 5) pts.pop();
        if (pts.length < 2) { pts.length = 0; temp.clearLayers(); setReadout(''); return; }
        if (tool === 'measure') {
          let total = 0;
          for (let i = 1; i < pts.length; i++) total += map.distance(pts[i - 1], pts[i]);
          const brg = Math.round(bearing(pts[pts.length - 2], pts[pts.length - 1]));
          save({ kind: 'measure', geometry: { pts: pts.map(toPair) }, label: `${nm(total)} NM · ${brg}°T` });
          setReadout(`✓ measured ${nm(total)} NM (final leg ${brg}°T)`);
        } else {
          const areaNm2 = polygonAreaNm2(pts);
          save({ kind: 'polygon', geometry: { pts: pts.map(toPair) }, label: `${areaNm2.toFixed(1)} NM²` });
          setReadout(`✓ area ${areaNm2.toFixed(1)} NM²`);
        }
        pts.length = 0;
        temp.clearLayers();
      };
    } else if (tool === 'rings') {
      handlers.click = (e) => save({ kind: 'rings', geometry: { center: toPair(e.latlng) } });
    } else if (tool === 'rectangle') {
      let start = null;
      let rect = null;
      handlers.mousedown = (e) => { start = e.latlng; };
      handlers.mousemove = (e) => {
        if (!start) return;
        const b = L.latLngBounds(start, e.latlng);
        if (rect) rect.setBounds(b);
        else rect = L.rectangle(b, { color: C(), weight: W(), fillOpacity: 0.08 }).addTo(temp);
        setReadout(`${nm(map.distance(b.getSouthWest(), b.getSouthEast()))} × ${nm(map.distance(b.getSouthWest(), b.getNorthWest()))} NM`);
      };
      handlers.mouseup = (e) => {
        if (!start) return;
        const b = L.latLngBounds(start, e.latlng);
        temp.clearLayers();
        save({ kind: 'rect', geometry: { bounds: [[b.getSouth(), b.getWest()], [b.getNorth(), b.getEast()]] } });
        start = null; rect = null; setReadout('');
      };
    } else if (tool === 'circle') {
      let center = null;
      let circ = null;
      handlers.click = (e) => {
        if (!center) { center = e.latlng; L.marker(center, { icon: dotIcon(C()) }).addTo(temp); return; }
        const radius = map.distance(center, e.latlng);
        temp.clearLayers();
        save({ kind: 'circle', geometry: { center: toPair(center), radiusM: radius }, label: `R ${nm(radius)} NM` });
        center = null; circ = null; setReadout(`✓ circle R ${nm(radius)} NM`);
      };
      handlers.mousemove = (e) => {
        if (!center) return;
        const radius = map.distance(center, e.latlng);
        if (circ) circ.setRadius(radius);
        else circ = L.circle(center, { radius, color: C(), weight: 1, dashArray: '4 4', fill: false }).addTo(temp);
        setReadout(`radius ${nm(radius)} NM`);
      };
    } else if (tool === 'marker') {
      handlers.click = (e) => {
        const label = window.prompt('Marker label (optional):', '') || '';
        save({ kind: 'marker', geometry: { pos: toPair(e.latlng) }, label });
      };
    }

    for (const [ev, fn] of Object.entries(handlers)) map.on(ev, fn);
    return () => { for (const [ev, fn] of Object.entries(handlers)) map.off(ev, fn); };
  }, [tool, map]);

  const undoLast = () => {
    const last = overlays[overlays.length - 1];
    if (last) useStore.getState().deleteOverlay(last.id);
    setReadout('');
  };
  const clearAll = () => {
    if (!overlays.length) { tempRef.current?.clearLayers(); setReadout(''); return; }
    if (!window.confirm(`Delete all ${overlays.length} shared drawing(s) for every MOC?`)) return;
    const st = useStore.getState();
    overlays.forEach((o) => st.deleteOverlay(o.id));
    tempRef.current?.clearLayers();
    setReadout('');
  };
  const cycleWeight = () => {
    const i = WEIGHTS.indexOf(weight);
    setWeight(WEIGHTS[(i + 1) % WEIGHTS.length]);
  };

  return (
    <div ref={barRef} className="absolute top-3 left-3 z-[1000] flex flex-col gap-1">
      <div className="glass rounded-lg p-1 flex flex-col gap-1">
        {TOOLS.map(({ key, icon: Icon, title }) => (
          <button key={key} title={title} onClick={() => setTool(key)}
            className={`w-8 h-8 flex items-center justify-center rounded ${
              tool === key ? 'bg-ghana-gold text-navy-950' : 'text-slate-300 hover:bg-navy-700'}`}>
            <Icon size={16} />
          </button>
        ))}
        <div className="h-px bg-navy-700 my-0.5" />
        <button title="Undo last drawing" onClick={undoLast}
          className="w-8 h-8 flex items-center justify-center rounded text-slate-300 hover:bg-navy-700">
          <Undo2 size={16} />
        </button>
        <button title="Clear all drawings (all MOCs)" onClick={clearAll}
          className="w-8 h-8 flex items-center justify-center rounded text-red-300 hover:bg-red-500/20">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Style controls: colour palette + line weight for new drawings */}
      <div className="glass rounded-lg p-1.5 flex flex-col items-center gap-1.5">
        {COLORS.map((c) => (
          <button key={c} title={`Draw in ${c}`} onClick={() => setColor(c)}
            className="w-5 h-5 rounded-full border"
            style={{ background: c, borderColor: color === c ? '#ffffff' : '#05080f', boxShadow: color === c ? `0 0 6px ${c}` : 'none' }} />
        ))}
        <button title={`Line weight: ${weight}px (click to change)`} onClick={cycleWeight}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-navy-700">
          <span className="rounded-full bg-slate-200" style={{ width: 16, height: Math.max(2, weight) }} />
        </button>
      </div>

      {readout && (
        <div className="glass rounded px-2 py-1 text-[11px] font-mono max-w-[210px]" style={{ color }}>
          {readout}
        </div>
      )}
    </div>
  );
}

// Spherical excess approximation of polygon area, returned in NM².
function polygonAreaNm2(latlngs) {
  const R = 6371000; // m
  let area = 0;
  const n = latlngs.length;
  for (let i = 0; i < n; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % n];
    area += ((p2.lng - p1.lng) * Math.PI) / 180 *
      (2 + Math.sin((p1.lat * Math.PI) / 180) + Math.sin((p2.lat * Math.PI) / 180));
  }
  area = Math.abs((area * R * R) / 2);
  return area / (NM * NM);
}
