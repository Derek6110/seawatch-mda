// End-to-end ingest test: plays the role of the Tema forwarder against a
// locally running server, then verifies the vessels appear in the picture.

class BitWriter {
  constructor() { this.bits = []; }
  uint(v, len) { for (let i = len - 1; i >= 0; i--) this.bits.push((v >> i) & 1); }
  int(v, len) { this.uint(v < 0 ? v + (1 << len) : v, len); }
  text(s, lenBits) {
    const chars = Math.floor(lenBits / 6);
    for (let i = 0; i < chars; i++) {
      const c = i < s.length ? s.charCodeAt(i) : 64;
      this.uint(c >= 64 ? c - 64 : c, 6);
    }
  }
  payload() {
    while (this.bits.length % 6) this.bits.push(0);
    let out = '';
    for (let i = 0; i < this.bits.length; i += 6) {
      let v = 0;
      for (let j = 0; j < 6; j++) v = (v << 1) | this.bits[i + j];
      out += String.fromCharCode(v < 40 ? v + 48 : v + 48 + 8);
    }
    return out;
  }
}
const sentence = (payload, total = 1, num = 1, seq = '') => {
  const body = `AIVDM,${total},${num},${seq},A,${payload},0`;
  let cs = 0;
  for (const ch of body) cs ^= ch.charCodeAt(0);
  return `!${body}*${cs.toString(16).toUpperCase().padStart(2, '0')}`;
};

function pos(mmsi, lat, lon, sog, cog) {
  const w = new BitWriter();
  w.uint(1, 6); w.uint(0, 2); w.uint(mmsi, 30);
  w.uint(0, 4); w.int(0, 8);
  w.uint(Math.round(sog * 10), 10); w.uint(0, 1);
  w.int(Math.round(lon * 600000), 28);
  w.int(Math.round(lat * 600000), 27);
  w.uint(Math.round(cog * 10), 12); w.uint(Math.round(cog), 9); w.uint(30, 6);
  w.uint(0, 2); w.uint(0, 3); w.uint(0, 1); w.uint(0, 19);
  return sentence(w.payload());
}
function staticMsg(mmsi, name, dest) {
  const w = new BitWriter();
  w.uint(5, 6); w.uint(0, 2); w.uint(mmsi, 30);
  w.uint(0, 2); w.uint(9000000 + (mmsi % 100000), 30);
  w.text('9GAB2', 42);
  w.text(name, 120);
  w.uint(80, 8); // tanker
  w.uint(120, 9); w.uint(40, 9); w.uint(12, 6); w.uint(12, 6);
  w.uint(1, 4); w.uint(8, 4); w.uint(20, 5); w.uint(6, 5); w.uint(0, 6);
  w.uint(85, 8);
  w.text(dest, 120);
  w.uint(0, 1); w.uint(0, 1);
  const p = w.payload();
  return [sentence(p.slice(0, 40), 2, 1, '7'), sentence(p.slice(40), 2, 2, '7')];
}

const BASE = process.env.BASE || 'http://localhost:4098/api';
const KEY = process.env.KEY || 'test-tema-key';
const j = (r) => r.json();

// Simulated Tema-area traffic: 3 vessels, static data for one of them.
const lines = [
  pos(627001111, 5.585, 0.021, 8.4, 210),   // Ghana-flag, off Tema port
  pos(636015555, 5.520, 0.110, 0.3, 0),     // Liberia-flag, drifting in anchorage area
  pos(657002222, 5.640, 0.300, 12.1, 95),   // Nigeria-flag, transiting east
  ...staticMsg(627001111, 'TEMA GLORY', 'TEMA'),
  '!AIVDM,1,1,,B,garbage*00',                // corrupt — must be skipped
];

const wrongKey = await fetch(`${BASE}/ingest/nmea`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ingest-key': 'WRONG' },
  body: JSON.stringify({ lines }),
});
console.log('wrong key rejected:', wrongKey.status === 401 ? 'ok (401)' : `FAIL (${wrongKey.status})`);

const res = await fetch(`${BASE}/ingest/nmea`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ingest-key': KEY },
  body: JSON.stringify({ lines }),
}).then(j);
console.log('ingest response:', JSON.stringify(res));

const vessels = await fetch(`${BASE}/vessels`).then(j);
const shore = vessels.filter((v) => v.provider === 'shore');
console.log(`shore vessels in picture: ${shore.length}`);
for (const v of shore) {
  console.log(`  ${v.name} | ${v.flag} | ${v.type} | ${v.lat.toFixed(4)},${v.lon.toFixed(4)} | ${v.speed}kn | dest:${v.destination || '-'}`);
}

const stats = await fetch(`${BASE}/stats`).then(j);
console.log('stats.providers.shore:', JSON.stringify(stats.source.providers.shore));
console.log('stats.source.live:', stats.source.live, '| liveVessels:', stats.source.liveVessels);

const named = shore.find((v) => v.mmsi === 627001111);
const ok = shore.length === 3
  && named?.name === 'TEMA GLORY'
  && named?.type === 'tanker'
  && named?.destination === 'TEMA'
  && named?.flag === 'Ghana'
  && stats.source.providers.shore.connected === true
  && res.decoded === 4; // 3 positions + 1 assembled static (garbage line skipped)
console.log(ok ? '\nE2E PASS' : '\nE2E CHECK — see notes above');
