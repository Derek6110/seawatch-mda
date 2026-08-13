import { AivdmDecoder } from './src/ais-decoder.js';

// --- tiny AIVDM encoder (test-only) to round-trip known values ----------------
class BitWriter {
  constructor() { this.bits = []; }
  uint(v, len) { for (let i = len - 1; i >= 0; i--) this.bits.push((v >> i) & 1); }
  int(v, len) { this.uint(v < 0 ? v + (1 << len) : v, len); }
  text(s, lenBits) {
    const chars = Math.floor(lenBits / 6);
    for (let i = 0; i < chars; i++) {
      const c = i < s.length ? s.charCodeAt(i) : 64; // '@' padding
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
function sentence(payload, total = 1, num = 1, seq = '') {
  const body = `AIVDM,${total},${num},${seq},A,${payload},0`;
  let cs = 0;
  for (const ch of body) cs ^= ch.charCodeAt(0);
  return `!${body}*${cs.toString(16).toUpperCase().padStart(2, '0')}`;
}

const dec = new AivdmDecoder();
let pass = 0, fail = 0;
const check = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok  ${label}`); }
  else { fail++; console.log(`  FAIL ${label} ${detail}`); }
};

// --- 1. Round-trip type 1 position (vessel off Tema) --------------------------
{
  const w = new BitWriter();
  w.uint(1, 6); w.uint(0, 2); w.uint(627000123, 30); // type, repeat, MMSI (Ghana prefix 627)
  w.uint(0, 4); w.int(0, 8);                          // nav status, ROT
  w.uint(87, 10); w.uint(0, 1);                       // SOG 8.7 kn, accuracy
  w.int(Math.round(0.0123 * 600000), 28);             // lon 0.0123 E
  w.int(Math.round(5.58 * 600000), 27);               // lat 5.58 N
  w.uint(2571, 12); w.uint(255, 9); w.uint(30, 6);    // COG 257.1, HDG 255, ts
  w.uint(0, 2); w.uint(0, 3); w.uint(0, 1); w.uint(0, 19); // maneuver/spare/raim/radio
  const line = sentence(w.payload());
  const m = dec.push(line);
  check('type1 decodes', !!m && m.kind === 'position');
  if (m) {
    check('type1 mmsi', m.mmsi === 627000123, `got ${m.mmsi}`);
    check('type1 lat', Math.abs(m.lat - 5.58) < 0.0001, `got ${m.lat}`);
    check('type1 lon', Math.abs(m.lon - 0.0123) < 0.0001, `got ${m.lon}`);
    check('type1 speed', Math.abs(m.speed - 8.7) < 0.01, `got ${m.speed}`);
    check('type1 course', Math.abs(m.course - 257.1) < 0.01, `got ${m.course}`);
    check('type1 heading', m.heading === 255, `got ${m.heading}`);
  }
}

// --- 2. Round-trip type 1 with NEGATIVE longitude (west of Greenwich) ---------
{
  const w = new BitWriter();
  w.uint(1, 6); w.uint(0, 2); w.uint(627000456, 30);
  w.uint(0, 4); w.int(0, 8); w.uint(10, 10); w.uint(0, 1);
  w.int(Math.round(-1.75 * 600000), 28);  // lon 1.75 W (Takoradi side)
  w.int(Math.round(4.85 * 600000), 27);   // lat 4.85 N
  w.uint(900, 12); w.uint(511, 9); w.uint(0, 6);
  w.uint(0, 2); w.uint(0, 3); w.uint(0, 1); w.uint(0, 19);
  const m = dec.push(sentence(w.payload()));
  check('neg-lon decodes', !!m);
  if (m) {
    check('neg lon', Math.abs(m.lon - -1.75) < 0.0001, `got ${m.lon}`);
    check('hdg 511 -> undefined', m.heading === undefined, `got ${m.heading}`);
  }
}

// --- 3. Round-trip type 5 static, split into TWO sentences --------------------
{
  const w = new BitWriter();
  w.uint(5, 6); w.uint(0, 2); w.uint(627000123, 30);
  w.uint(0, 2); w.uint(9123456, 30);                  // AIS version, IMO
  w.text('P2XT7', 42);                                // callsign (7 chars)
  w.text('VOLTA TRADER', 120);                        // name (20 chars)
  w.uint(70, 8);                                      // ship type 70 = cargo
  w.uint(90, 9); w.uint(30, 9); w.uint(10, 6); w.uint(10, 6); // dims A/B/C/D
  w.uint(1, 4);                                       // fix type
  w.uint(8, 4); w.uint(14, 5); w.uint(12, 5); w.uint(0, 6);   // ETA
  w.uint(68, 8);                                      // draught 6.8 m
  w.text('TEMA', 120);                                // destination
  w.uint(0, 1); w.uint(0, 1);                         // DTE, spare -> 424 bits
  const payload = w.payload();
  const p1 = payload.slice(0, 40);
  const p2 = payload.slice(40);
  const r1 = dec.push(sentence(p1, 2, 1, '3'));
  const m = dec.push(sentence(p2, 2, 2, '3'));
  check('type5 part1 returns null (partial)', r1 === null);
  check('type5 assembles on part2', !!m && m.kind === 'static');
  if (m) {
    check('type5 name', m.name === 'VOLTA TRADER', `got "${m.name}"`);
    check('type5 callsign', m.callsign === 'P2XT7', `got "${m.callsign}"`);
    check('type5 imo', m.imo === 9123456, `got ${m.imo}`);
    check('type5 length', m.length === 120, `got ${m.length}`);
    check('type5 draught', Math.abs(m.draught - 6.8) < 0.01, `got ${m.draught}`);
    check('type5 destination', m.destination === 'TEMA', `got "${m.destination}"`);
  }
}

// --- 4. Round-trip type 18 Class B ---------------------------------------------
{
  const w = new BitWriter();
  w.uint(18, 6); w.uint(0, 2); w.uint(627000789, 30);
  w.uint(0, 8);                                       // reserved
  w.uint(52, 10); w.uint(0, 1);                       // SOG 5.2
  w.int(Math.round(0.3 * 600000), 28);
  w.int(Math.round(5.2 * 600000), 27);
  w.uint(1800, 12); w.uint(180, 9); w.uint(0, 6);
  w.uint(0, 2); w.uint(0, 27);                        // pad to 168
  const m = dec.push(sentence(w.payload()));
  check('type18 decodes', !!m && m.kind === 'position');
  if (m) {
    check('type18 mmsi', m.mmsi === 627000789, `got ${m.mmsi}`);
    check('type18 speed', Math.abs(m.speed - 5.2) < 0.01, `got ${m.speed}`);
  }
}

// --- 5. Canonical spec vector (GPSD AIVDM doc, type 1) -------------------------
{
  const m = dec.push('!AIVDM,1,1,,B,177KQJ5000G?tO`K>RA1wUbN0TKH,0*5C');
  check('canonical decodes', !!m, JSON.stringify(m));
  if (m) {
    check('canonical mmsi 477553000', m.mmsi === 477553000, `got ${m.mmsi}`);
    check('canonical lat ~47.58', m.lat > 47 && m.lat < 48, `got ${m.lat}`);
    check('canonical lon ~-122.34', m.lon > -123 && m.lon < -122, `got ${m.lon}`);
  }
}

// --- 6. Garbage / corrupt input handled -----------------------------------------
{
  check('empty line -> null', dec.push('') === null);
  check('garbage -> null', dec.push('$GPGGA,junk*00') === null);
  check('bad checksum -> null', dec.push('!AIVDM,1,1,,B,177KQJ5000G?tO`K>RA1wUbN0TKH,0*00') === null);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
