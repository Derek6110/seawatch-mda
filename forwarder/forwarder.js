#!/usr/bin/env node
// SeaWatch shore-station forwarder.
//
// Runs on the PC at the AIS receiver site (e.g. Tema). Reads raw NMEA
// (!AIVDM sentences) from the receiver — over the USB serial port, or over
// UDP if the receiver/vendor software rebroadcasts on the network — and
// forwards it in small batches to the SeaWatch server over HTTPS.
//
// Usage (serial / USB receiver):
//   node forwarder.js --port COM3 --key YOUR_INGEST_KEY
// Usage (UDP rebroadcast, e.g. AIS Dispatcher on port 10110):
//   node forwarder.js --udp 10110 --key YOUR_INGEST_KEY
// Optional:
//   --server https://seawatch.onrender.com   (default)
//   --baud 38400                             (default; AIS receivers use 38400)
//
// Requires Node 18+. For serial mode run `npm install` in this folder first.

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};

const CFG = {
  server: arg('server', process.env.SEAWATCH_SERVER || 'https://seawatch.onrender.com'),
  key: arg('key', process.env.INGEST_KEY || ''),
  serialPort: arg('port', process.env.SERIAL_PORT || ''),
  baud: Number(arg('baud', process.env.BAUD || 38400)),
  udpPort: Number(arg('udp', process.env.UDP_PORT || 0)),
};

if (!CFG.key) {
  console.error('ERROR: no ingest key. Pass --key YOUR_INGEST_KEY (must match the server\'s INGEST_KEY).');
  process.exit(1);
}
if (!CFG.serialPort && !CFG.udpPort) {
  console.error('ERROR: no input. Pass --port COM3 (serial/USB) or --udp 10110 (UDP listen).');
  process.exit(1);
}

// --- batching + upload -------------------------------------------------------
const queue = [];
const MAX_QUEUE = 5000; // offline buffer cap (~ a few minutes of busy traffic)
let sentLines = 0;
let lastResponse = null;
let paused = false;

function enqueue(line) {
  const l = line.trim();
  if (!l.startsWith('!AIVDM') && !l.startsWith('!AIVDO')) return;
  if (queue.length >= MAX_QUEUE) queue.shift(); // drop oldest when offline too long
  queue.push(l);
}

async function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, 500);
  try {
    const res = await fetch(`${CFG.server}/api/ingest/nmea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ingest-key': CFG.key },
      body: JSON.stringify({ lines: batch }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 202 && body.paused) {
      paused = true; // server in simulation mode — drop batch, keep reading
      return;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${body.error || ''}`);
    paused = false;
    sentLines += batch.length;
    lastResponse = body;
  } catch (e) {
    // Put the batch back (front) and retry on the next flush.
    queue.unshift(...batch);
    if (queue.length > MAX_QUEUE) queue.length = MAX_QUEUE;
    console.error(`[${new Date().toISOString()}] upload failed: ${e.message} (buffered ${queue.length})`);
  }
}
setInterval(flush, 2000);

setInterval(() => {
  const state = paused ? 'server in SIM mode (standing by)' : 'forwarding';
  const vessels = lastResponse?.vessels != null ? ` | vessels on server: ${lastResponse.vessels}` : '';
  console.log(`[${new Date().toISOString()}] ${state} | sent ${sentLines} lines | buffered ${queue.length}${vessels}`);
}, 60000);

// --- input: UDP --------------------------------------------------------------
if (CFG.udpPort) {
  const dgram = require('node:dgram');
  const sock = dgram.createSocket('udp4');
  sock.on('message', (buf) => buf.toString().split(/\r?\n/).forEach(enqueue));
  sock.on('listening', () => console.log(`Listening for NMEA on UDP :${CFG.udpPort} -> ${CFG.server}`));
  sock.on('error', (e) => console.error('UDP error:', e.message));
  sock.bind(CFG.udpPort);
}

// --- input: serial (USB receiver) --------------------------------------------
if (CFG.serialPort) {
  let SerialPort, ReadlineParser;
  try {
    ({ SerialPort, ReadlineParser } = require('serialport'));
  } catch {
    console.error('ERROR: serialport package not installed. Run `npm install` in this folder first.');
    process.exit(1);
  }
  let port = null;
  const open = () => {
    port = new SerialPort({ path: CFG.serialPort, baudRate: CFG.baud }, (err) => {
      if (err) {
        console.error(`Serial open failed (${CFG.serialPort}): ${err.message} — retrying in 10s`);
        setTimeout(open, 10000);
        return;
      }
      console.log(`Reading NMEA from ${CFG.serialPort} @ ${CFG.baud} baud -> ${CFG.server}`);
      const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));
      parser.on('data', enqueue);
      port.on('close', () => {
        console.error('Serial port closed — reopening in 10s');
        setTimeout(open, 10000);
      });
      port.on('error', (e) => console.error('Serial error:', e.message));
    });
  };
  open();
}
