// Runtime data-source control. Lets an administrator switch the Gulf-of-Guinea
// feed between SIMULATION, LIVE (real AISStream), and HYBRID (live + simulated)
// without restarting the server.

import { config } from './config.js';
import { ensureSimVessels, clearSimVessels } from './simulator.js';
import { startLiveAis, stopLiveAis } from './aisstream.js';

let mode = 'sim';

export function getMode() { return mode; }
export function liveAvailable() { return !!config.aisStreamKey; }

// Initialise to the configured mode at boot.
export function initSource() {
  mode = config.dataSource;
  if (mode === 'live' || mode === 'hybrid') {
    if (!startLiveAis()) mode = 'sim'; // no key → fall back
  }
  if (mode === 'sim' || mode === 'hybrid') ensureSimVessels();
  if (mode === 'live') clearSimVessels();
  config.dataSource = mode;
  return mode;
}

export function setMode(newMode) {
  if (!['sim', 'live', 'hybrid'].includes(newMode)) throw new Error('invalid mode');
  if ((newMode === 'live' || newMode === 'hybrid') && !liveAvailable()) {
    throw new Error('no AISStream API key configured on the server');
  }
  if (newMode === 'sim') {
    stopLiveAis();      // closes feed + drops live contacts
    ensureSimVessels();
  } else if (newMode === 'live') {
    clearSimVessels();
    startLiveAis();
  } else { // hybrid
    ensureSimVessels();
    startLiveAis();
  }
  mode = newMode;
  config.dataSource = newMode;
  return mode;
}

// Whether the simulator should advance this tick.
export function simActive() { return mode === 'sim' || mode === 'hybrid'; }
// Whether live ageing should run this tick.
export function liveActive() { return mode === 'live' || mode === 'hybrid'; }
