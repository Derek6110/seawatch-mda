// Dark-vessel & anomaly detection engine.
//
// Runs every tick over the current vessel picture and emits alerts. Each rule
// is intentionally small and independent so analysts can tune thresholds or add
// new behavioural rules (e.g. SAT-AIS correlation, RF geolocation, pattern-of-
// life ML) without rewriting the pipeline.

import { config } from './config.js';
import { store, nextAlertId } from './store.js';
import { distanceNm, pointInPolygon } from './geo.js';
import { ZONES } from './seed.js';

const D = config.detection;

// Human-friendly gap duration: "6h 12m", "45m", "1h".
function fmtGap(min) {
  const m = Math.round(min);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

// Avoid spamming duplicate alerts: remember the last alert signature per vessel.
const lastSig = new Map();

function emit(io, alert) {
  const sig = `${alert.mmsi}:${alert.type}`;
  const prev = lastSig.get(sig);
  // Re-alert only if the same anomaly recurs after a cool-down.
  if (prev && Date.now() - prev < 1000 * 60 * 5) return null;
  lastSig.set(sig, Date.now());

  const full = {
    id: nextAlertId(),
    ts: Date.now(),
    acknowledged: false,
    status: 'open',
    ...alert,
  };
  store.alerts.unshift(full);
  if (store.alerts.length > 500) store.alerts.pop();
  if (io) io.emit('alert:new', full);
  return full;
}

function zonesContaining(point, kinds) {
  return ZONES.filter(
    (z) => (!kinds || kinds.includes(z.kind)) && pointInPolygon(point, z.polygon)
  );
}

export function runDetection(io) {
  const vessels = Array.from(store.vessels.values());
  const now = Date.now();
  const newAlerts = [];

  for (const v of vessels) {
    v.flags = [];
    if (v.isNavy) continue;

    // Rule 1 — AIS gap: at sea with no AIS report for more than the threshold
    // (default 6 hours). The longer the silence, the higher the severity.
    const gapMin = (now - v.lastReport) / 60000;
    if (!v.aisOn && gapMin >= D.aisGapMinutes) {
      v.flags.push('ais-gap');
      v.classification = 'suspect';
      const a = emit(io, {
        type: 'ais-gap',
        severity: gapMin >= 720 ? 'high' : 'medium', // 12h+ => high
        mmsi: v.mmsi,
        vesselName: v.name,
        lat: v.lat, lon: v.lon,
        title: 'AIS signal lost (going dark)',
        detail: `${v.name} (${v.flag}) has not transmitted AIS for ${fmtGap(gapMin)} while at sea (threshold ${fmtGap(D.aisGapMinutes)}).`,
      });
      if (a) newAlerts.push(a);
    }

    // Rule 2 — position spoofing / implausible speed between reports.
    if (v.spoofing) {
      v.flags.push('spoofing');
      v.classification = 'suspect';
      const a = emit(io, {
        type: 'spoofing',
        severity: 'high',
        mmsi: v.mmsi,
        vesselName: v.name,
        lat: v.lat, lon: v.lon,
        title: 'Position spoofing suspected',
        detail: `${v.name} reporting implausible position jumps (> ${D.impossibleSpeedKn} kn implied). Possible AIS manipulation.`,
      });
      if (a) newAlerts.push(a);
    }

    // Rule 3 — loitering in a sensitive zone (illegal fishing / pre-STS).
    if (v.loiterSince && v.speed <= D.loiterSpeedKn) {
      const loiterMin = (now - v.loiterSince) / 60000;
      const sensitive = zonesContaining(v, ['fishing', 'oil', 'eez', 'aoi']);
      if (loiterMin >= D.loiterMinutes && sensitive.length) {
        v.flags.push('loitering');
        const zoneName = sensitive[0].name;
        const a = emit(io, {
          type: 'loitering',
          severity: sensitive.some((z) => z.kind === 'oil') ? 'high' : 'medium',
          mmsi: v.mmsi,
          vesselName: v.name,
          lat: v.lat, lon: v.lon,
          title: 'Loitering in sensitive zone',
          detail: `${v.name} loitering ${Math.round(loiterMin)} min inside ${zoneName}. Possible IUU fishing or rendezvous.`,
        });
        if (a) newAlerts.push(a);
      }
    }

    // Rule 4 — protected-zone violation (trawler-type inside artisanal IEZ,
    // or any contact inside an oil-field safety zone).
    const iez = zonesContaining(v, ['fishing']);
    if (iez.length && (v.type === 'cargo' || v.type === 'tanker' || (v.type === 'fishing' && v.length > 25))) {
      v.flags.push('zone-violation');
      const a = emit(io, {
        type: 'zone-violation',
        severity: 'medium',
        mmsi: v.mmsi,
        vesselName: v.name,
        lat: v.lat, lon: v.lon,
        title: 'Restricted-zone incursion',
        detail: `${v.name} (${v.type}, ${v.length} m) detected inside ${iez[0].name}.`,
      });
      if (a) newAlerts.push(a);
    }
    const oil = zonesContaining(v, ['oil']);
    if (oil.length && !v.isNavy && v.type !== 'supply') {
      v.flags.push('zone-violation');
      const a = emit(io, {
        type: 'zone-violation',
        severity: 'high',
        mmsi: v.mmsi,
        vesselName: v.name,
        lat: v.lat, lon: v.lon,
        title: 'Oil-field safety-zone breach',
        detail: `${v.name} inside ${oil[0].name} without offshore-support tasking.`,
      });
      if (a) newAlerts.push(a);
    }
  }

  // Rule 5 — ship-to-ship rendezvous: two slow vessels in close proximity,
  // away from designated anchorages. Pre-filter to slow, non-navy contacts so
  // the pairwise check stays cheap even with a large live dataset.
  const slow = vessels.filter((v) => !v.isNavy && v.speed <= 3);
  for (let i = 0; i < slow.length; i++) {
    for (let j = i + 1; j < slow.length; j++) {
      const a = slow[i];
      const b = slow[j];
      const d = distanceNm(a, b);
      if (d <= D.stsProximityNm) {
        const inAnchorage = zonesContaining(a, ['anchorage']).length > 0;
        if (inAnchorage) continue;
        a.flags.push('sts'); b.flags.push('sts');
        const alert = emit(io, {
          type: 'sts',
          severity: 'high',
          mmsi: a.mmsi,
          vesselName: `${a.name} ↔ ${b.name}`,
          lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2,
          title: 'Possible ship-to-ship transfer',
          detail: `${a.name} and ${b.name} stationary ${d.toFixed(2)} NM apart offshore — possible illicit STS / fuel transfer.`,
        });
        if (alert) newAlerts.push(alert);
      }
    }
  }

  return newAlerts;
}
