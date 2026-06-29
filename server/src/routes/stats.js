// Dashboard summary statistics for the command picture.
import { Router } from 'express';
import { store, listVessels } from '../store.js';
import { config } from '../config.js';
import { isLiveConnected } from '../aisstream.js';
import { dbMode } from '../db.js';

const router = Router();

router.get('/stats', (_req, res) => {
  const vessels = listVessels();
  const byType = {};
  const byClass = {};
  const byRisk = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const v of vessels) {
    byType[v.type] = (byType[v.type] || 0) + 1;
    byClass[v.classification] = (byClass[v.classification] || 0) + 1;
    if (v.riskLevel) byRisk[v.riskLevel] = (byRisk[v.riskLevel] || 0) + 1;
  }
  const dark = vessels.filter((v) => v.flags && v.flags.length);
  const openAlerts = store.alerts.filter((a) => a.status === 'open');
  const liveCount = vessels.filter((v) => v.source === 'ais-live').length;
  res.json({
    totalVessels: vessels.length,
    darkVessels: dark.length,
    byType,
    byClass,
    byRisk,
    openAlerts: openAlerts.length,
    highSeverityAlerts: openAlerts.filter((a) => a.severity === 'high').length,
    openIncidents: store.incidents.filter((i) => i.status === 'open').length,
    activeTaskings: store.tasks.filter((t) => t.status !== 'complete').length,
    friendlyUnits: vessels.filter((v) => v.isNavy).length,
    source: {
      mode: config.dataSource,
      live: isLiveConnected(),
      liveVessels: liveCount,
      hasKey: !!config.aisStreamKey,
      region: config.liveRegion,
      center: [
        (config.liveBbox.minLat + config.liveBbox.maxLat) / 2,
        (config.liveBbox.minLon + config.liveBbox.maxLon) / 2,
      ],
    },
    // Persistence backend: 'pg' (durable Postgres) or 'file' (ephemeral).
    accountsStore: dbMode(),
    updatedAt: Date.now(),
  });
});

export default router;
