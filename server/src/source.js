// Runtime data-source control. Lets an administrator switch the Gulf-of-Guinea
// feed between SIMULATION, LIVE (real AISStream), and HYBRID (live + simulated)
// without restarting the server.

import { config } from './config.js';
import { ensureSimVessels, clearSimVessels } from './simulator.js';
import { startLiveAis, stopLiveAis } from './aisstream.js';
import { startMarineTraffic, stopMarineTraffic } from './marinetraffic.js';
import { startDataDocked, stopDataDocked } from './datadocked.js';

let mode = 'sim';

export function getMode() { return mode; }

// Live picture is available if any real-AIS provider is configured.
export function liveAvailable() {
  return !!config.aisStreamKey || !!config.marineTraffic.url || !!config.dataDocked.key;
}

// Start every configured live provider; returns true if at least one started.
function startLiveFeeds() {
  const a = startLiveAis();          // AISStream (WebSocket) — no-op without key
  const m = startMarineTraffic();    // MarineTraffic (polling) — no-op without URL
  const d = startDataDocked();       // Data Docked (polling) — no-op without key
  return a || m || d;
}
function stopLiveFeeds() {
  stopLiveAis();          // closes stream + drops live contacts
  stopMarineTraffic();    // stops polling
  stopDataDocked();       // stops polling
}

// Initialise to the configured mode at boot.
export function initSource() {
  mode = config.dataSource;
  if (mode === 'live' || mode === 'hybrid') {
    if (!startLiveFeeds()) mode = 'sim'; // no provider configured → fall back
  }
  if (mode === 'sim' || mode === 'hybrid') ensureSimVessels();
  if (mode === 'live') clearSimVessels();
  config.dataSource = mode;
  return mode;
}

export function setMode(newMode) {
  if (!['sim', 'live', 'hybrid'].includes(newMode)) throw new Error('invalid mode');
  if ((newMode === 'live' || newMode === 'hybrid') && !liveAvailable()) {
    throw new Error('no live AIS provider (AISStream or MarineTraffic) configured on the server');
  }
  if (newMode === 'sim') {
    stopLiveFeeds();
    ensureSimVessels();
  } else if (newMode === 'live') {
    clearSimVessels();
    startLiveFeeds();
  } else { // hybrid
    ensureSimVessels();
    startLiveFeeds();
  }
  mode = newMode;
  config.dataSource = newMode;
  return mode;
}

// Whether the simulator should advance this tick.
export function simActive() { return mode === 'sim' || mode === 'hybrid'; }
// Whether live ageing should run this tick.
export function liveActive() { return mode === 'live' || mode === 'hybrid'; }
