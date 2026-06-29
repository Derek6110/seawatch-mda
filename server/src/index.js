// SeaWatch MDA — backend entry point.
// Express REST API + Socket.IO real-time layer + switchable data-source loop.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server as SocketServer } from 'socket.io';

import { config } from './config.js';
import { seedStaticData } from './seed.js';
import { tick } from './simulator.js';
import { runDetection } from './detection.js';
import { applyRisk } from './risk.js';
import { ageLiveVessels } from './aisstream.js';
import { initSource, getMode, simActive, liveActive } from './source.js';
import { setupSockets } from './socket.js';
import { initAuth } from './auth.js';
import { store, listVessels, pushHistory } from './store.js';
import api from './routes/index.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', api);

// In production, serve the built client from this same service so the whole app
// (UI + API + sockets) runs behind one URL with no CORS or proxy needed.
const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback for client-side routes (but never for API/socket paths).
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('  Serving built client from', clientDist);
}

const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: '*' } });
app.set('io', io);
setupSockets(io);

// --- Bootstrap data ---------------------------------------------------------
seedStaticData();
initAuth();
const startMode = initSource();

// --- Main loop: advance picture, detect, score, record, broadcast -----------
function broadcastSnapshot() {
  const vessels = listVessels().map(({ track, ...v }) => v); // omit history
  io.emit('vessels:update', {
    ts: Date.now(), vessels,
    source: { mode: getMode(), live: liveActive() },
  });
}

function recordHistory() {
  pushHistory(
    {
      ts: Date.now(),
      vessels: listVessels().map((v) => ({
        mmsi: v.mmsi, lat: v.lat, lon: v.lon, heading: v.heading,
        name: v.name, classification: v.classification, isNavy: v.isNavy,
        risk: v.risk, riskLevel: v.riskLevel, flags: v.flags,
      })),
    },
    config.historyFrames
  );
}

setInterval(() => {
  if (simActive()) tick();
  if (liveActive()) ageLiveVessels();
  runDetection(io);
  applyRisk(listVessels());
  recordHistory();
  broadcastSnapshot();
}, config.tickMs);

server.listen(config.port, () => {
  console.log(`\n  SeaWatch MDA backend running`);
  console.log(`  REST  : http://localhost:${config.port}/api`);
  console.log(`  Socket: ws://localhost:${config.port}`);
  console.log(`  Data source: ${startMode.toUpperCase()} (region: ${config.liveRegion})`);
  console.log(`  Tracking contacts every ${config.tickMs} ms\n`);
});
