import { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MousePointer2, Ruler, Target, Square, Circle as CircleIcon,
  Pentagon, MapPin, Trash2,
} from 'lucide-react';

const NM = 1852; // metres per nautical mile
const RING_PRESETS = [5, 10, 25, 50]; // NM

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

const TOOLS = [
  { key: 'select', icon: MousePointer2, title: 'Select / pan' },
  { key: 'measure', icon: Ruler, title: 'Measure distance & bearing (click points, double-click to finish)' },
  { key: 'rings', icon: Target, title: 'Range rings (click a centre)' },
  { key: 'rectangle', icon: Square, title: 'Draw rectangle (drag)' },
  { key: 'circle', icon: CircleIcon, title: 'Draw circle (click centre, click edge)' },
  { key: 'polygon', icon: Pentagon, title: 'Draw polygon (click points, double-click to finish)' },
  { key: 'marker', icon: MapPin, title: 'Drop labelled marker' },
];

export default function MapTools() {
  const map = useMap();
  const [tool, setTool] = useState('select');
  const [readout, setReadout] = useState('');
  const fgRef = useRef(null);
  const tempRef = useRef(null);
  const barRef = useRef(null);

  // Persistent drawing layers.
  useEffect(() => {
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

  // Bind map interaction handlers for the active tool.
  useEffect(() => {
    const fg = fgRef.current;
    const temp = tempRef.current;
    if (!fg || !temp) return;
    temp.clearLayers();
    setReadout('');

    map.getContainer().style.cursor = tool === 'select' ? '' : 'crosshair';
    if (tool === 'rectangle') map.dragging.disable(); else map.dragging.enable();
    if (tool === 'measure' || tool === 'polygon') map.doubleClickZoom.disable();
    else map.doubleClickZoom.enable();

    const handlers = {};

    if (tool === 'measure' || tool === 'polygon') {
      const pts = [];
      let preview = null;
      const redraw = (cursor) => {
        temp.clearLayers();
        const all = cursor ? [...pts, cursor] : pts;
        if (all.length >= 1) {
          const isPoly = tool === 'polygon';
          const shape = isPoly
            ? L.polygon(all, { color: '#fcd116', weight: 1.5, dashArray: '5 5', fillOpacity: 0.05 })
            : L.polyline(all, { color: '#fcd116', weight: 2, dashArray: '5 5' });
          temp.addLayer(shape);
        }
        pts.forEach((p) => temp.addLayer(L.marker(p, { icon: dotIcon() })));
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
      handlers.dblclick = () => {
        if (pts.length < 2) return;
        if (tool === 'measure') {
          const line = L.polyline(pts, { color: '#fcd116', weight: 2 }).addTo(fg);
          let total = 0;
          for (let i = 1; i < pts.length; i++) total += map.distance(pts[i - 1], pts[i]);
          L.marker(pts[pts.length - 1], { icon: textIcon(`${nm(total)} NM`) }).addTo(fg);
          line.bindTooltip(`${nm(total)} NM`, { permanent: false, sticky: true });
        } else {
          const poly = L.polygon(pts, { color: '#fcd116', weight: 1.5, fillColor: '#fcd116', fillOpacity: 0.08 }).addTo(fg);
          const areaNm2 = polygonAreaNm2(pts);
          poly.bindTooltip(`Area ≈ ${areaNm2.toFixed(1)} NM²`, { sticky: true });
        }
        pts.length = 0; temp.clearLayers(); setReadout('');
      };
    } else if (tool === 'rings') {
      handlers.click = (e) => {
        L.marker(e.latlng, { icon: dotIcon('#3aa6ff') }).addTo(fg);
        RING_PRESETS.forEach((r) => {
          L.circle(e.latlng, { radius: r * NM, color: '#3aa6ff', weight: 1, fill: false, dashArray: '3 5' }).addTo(fg);
          L.marker(L.latLng(e.latlng.lat + (r * NM) / 111320, e.latlng.lng), { icon: textIcon(`${r} NM`, '#3aa6ff') }).addTo(fg);
        });
      };
    } else if (tool === 'rectangle') {
      let start = null;
      let rect = null;
      handlers.mousedown = (e) => { start = e.latlng; };
      handlers.mousemove = (e) => {
        if (!start) return;
        const b = L.latLngBounds(start, e.latlng);
        if (rect) rect.setBounds(b);
        else rect = L.rectangle(b, { color: '#2ecc71', weight: 1.5, fillOpacity: 0.08 }).addTo(temp);
        setReadout(`${nm(map.distance(b.getSouthWest(), b.getSouthEast()))} × ${nm(map.distance(b.getSouthWest(), b.getNorthWest()))} NM`);
      };
      handlers.mouseup = (e) => {
        if (!start) return;
        const b = L.latLngBounds(start, e.latlng);
        temp.clearLayers();
        L.rectangle(b, { color: '#2ecc71', weight: 1.5, fillColor: '#2ecc71', fillOpacity: 0.1 }).addTo(fg);
        start = null; rect = null; setReadout('');
      };
    } else if (tool === 'circle') {
      let center = null;
      let circ = null;
      handlers.click = (e) => {
        if (!center) { center = e.latlng; L.marker(center, { icon: dotIcon('#bb6bd9') }).addTo(temp); return; }
        const radius = map.distance(center, e.latlng);
        temp.clearLayers();
        L.circle(center, { radius, color: '#bb6bd9', weight: 1.5, fillColor: '#bb6bd9', fillOpacity: 0.1 })
          .addTo(fg).bindTooltip(`R ${nm(radius)} NM`, { sticky: true });
        center = null; circ = null; setReadout('');
      };
      handlers.mousemove = (e) => {
        if (!center) return;
        const radius = map.distance(center, e.latlng);
        if (circ) circ.setRadius(radius);
        else circ = L.circle(center, { radius, color: '#bb6bd9', weight: 1, dashArray: '4 4', fill: false }).addTo(temp);
        setReadout(`radius ${nm(radius)} NM`);
      };
    } else if (tool === 'marker') {
      handlers.click = (e) => {
        const label = window.prompt('Marker label (optional):', '') || '';
        const m = L.marker(e.latlng, { icon: dotIcon('#ff9f1c') }).addTo(fg);
        if (label) m.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -6] }).openTooltip();
      };
    }

    for (const [ev, fn] of Object.entries(handlers)) map.on(ev, fn);
    return () => { for (const [ev, fn] of Object.entries(handlers)) map.off(ev, fn); };
  }, [tool, map]);

  const clearAll = () => { fgRef.current?.clearLayers(); tempRef.current?.clearLayers(); setReadout(''); };

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
        <button title="Clear all drawings" onClick={clearAll}
          className="w-8 h-8 flex items-center justify-center rounded text-red-300 hover:bg-red-500/20">
          <Trash2 size={16} />
        </button>
      </div>
      {readout && (
        <div className="glass rounded px-2 py-1 text-[11px] font-mono text-ghana-gold max-w-[200px]">
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
