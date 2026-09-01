// Dependency-free decoder for raw AIS — NMEA 0183 !AIVDM/!AIVDO sentences as
// emitted by any AIS receiver (shore station, pilot plug, SDR).
//
// AIS messages arrive as 6-bit-armored payloads inside NMEA sentences:
//   !AIVDM,<total>,<num>,<seqId>,<channel>,<payload>,<fill>*<checksum>
// Multi-sentence messages (e.g. type 5 static data) are reassembled by seqId.
// Supported message types:
//   1/2/3  Class A position report
//   5      Class A static & voyage data (name, callsign, IMO, type, destination)
//   18/19  Class B position report (19 adds name/type/dimensions)
//   24     Class B static data (part A: name, part B: type/callsign/dimensions)
// Everything else (base stations, aids-to-nav, SAR, binary) is ignored.

// Read arbitrary bit ranges out of a 6-bit-armored payload.
class BitField {
  constructor(payload) {
    this.vals = [];
    for (const ch of payload) {
      let v = ch.charCodeAt(0) - 48;
      if (v > 40) v -= 8;
      this.vals.push(v & 0x3f);
    }
    this.length = this.vals.length * 6;
  }

  uint(start, len) {
    // len never exceeds 30 bits in the fields we read, so shifts stay safe.
    let r = 0;
    for (let i = start; i < start + len; i++) {
      const v = this.vals[(i / 6) | 0] || 0;
      r = (r << 1) | ((v >> (5 - (i % 6))) & 1);
    }
    return r >>> 0;
  }

  int(start, len) {
    let v = this.uint(start, len);
    if (v & (1 << (len - 1))) v -= 1 << len; // two's complement
    return v;
  }

  // 6-bit ASCII string. '@' (0) terminates; trailing spaces trimmed.
  text(start, lenBits) {
    let s = '';
    for (let i = 0; i + 6 <= lenBits && start + i + 6 <= this.length; i += 6) {
      const c = this.uint(start + i, 6);
      if (c === 0) break;
      s += String.fromCharCode(c < 32 ? c + 64 : c);
    }
    return s.replace(/\s+$/, '');
  }
}

function checksumOk(sentence) {
  const star = sentence.lastIndexOf('*');
  if (star === -1 || star + 3 > sentence.length) return false;
  let cs = 0;
  for (let i = 1; i < star; i++) cs ^= sentence.charCodeAt(i);
  return cs === parseInt(sentence.slice(star + 1, star + 3), 16);
}

// Positions use 1/10000 arc-minute units; lat 91 / lon 181 mean "not available".
const toDeg = (v) => v / 600000;

function decodePayload(payload) {
  const b = new BitField(payload);
  if (b.length < 38) return null;
  const type = b.uint(0, 6);
  const mmsi = b.uint(8, 30);
  if (!mmsi) return null;

  if (type >= 1 && type <= 3) {
    if (b.length < 144) return null;
    const lon = toDeg(b.int(61, 28));
    const lat = toDeg(b.int(89, 27));
    if (Math.abs(lon) > 180 || Math.abs(lat) > 90) return null; // "not available"
    const sog = b.uint(50, 10);
    const cog = b.uint(116, 12);
    const hdg = b.uint(128, 9);
    return {
      kind: 'position', mmsi, lat, lon,
      speed: sog === 1023 ? 0 : sog / 10,
      course: cog === 3600 ? 0 : cog / 10,
      heading: hdg === 511 ? undefined : hdg,
    };
  }

  if (type === 18 || type === 19) {
    if (b.length < 139) return null;
    const lon = toDeg(b.int(57, 28));
    const lat = toDeg(b.int(85, 27));
    if (Math.abs(lon) > 180 || Math.abs(lat) > 90) return null;
    const sog = b.uint(46, 10);
    const cog = b.uint(112, 12);
    const hdg = b.uint(124, 9);
    const out = {
      kind: 'position', mmsi, lat, lon,
      speed: sog === 1023 ? 0 : sog / 10,
      course: cog === 3600 ? 0 : cog / 10,
      heading: hdg === 511 ? undefined : hdg,
    };
    if (type === 19 && b.length >= 301) {
      out.name = b.text(143, 120) || undefined;
      out.typeCode = b.uint(263, 8);
      out.length = (b.uint(271, 9) + b.uint(280, 9)) || undefined;
    }
    return out;
  }

  if (type === 5) {
    if (b.length < 302) return null;
    const out = {
      kind: 'static', mmsi,
      imo: b.uint(40, 30) || undefined,
      callsign: b.text(70, 42) || undefined,
      name: b.text(112, 120) || undefined,
      typeCode: b.uint(232, 8),
      length: (b.uint(240, 9) + b.uint(249, 9)) || undefined,
      draught: b.uint(294, 8) / 10 || undefined,
    };
    if (b.length >= 422) out.destination = b.text(302, 120) || undefined;
    return out;
  }

  if (type === 24) {
    const part = b.uint(38, 2);
    if (part === 0 && b.length >= 160) {
      return { kind: 'static', mmsi, name: b.text(40, 120) || undefined };
    }
    if (part === 1 && b.length >= 162) {
      return {
        kind: 'static', mmsi,
        typeCode: b.uint(40, 8),
        callsign: b.text(90, 42) || undefined,
        length: (b.uint(132, 9) + b.uint(141, 9)) || undefined,
      };
    }
    return null;
  }

  return null; // unsupported message type
}

// Stateful decoder: feed it raw NMEA lines one at a time; returns a decoded
// message object when a line completes a message (single- or multi-part),
// otherwise null. Invalid/unsupported lines are silently skipped.
export class AivdmDecoder {
  constructor() {
    this.partials = new Map(); // "seq|channel" -> { parts: [], ts }
  }

  push(rawLine) {
    let line = String(rawLine || '').trim();
    // Strip an NMEA 4.0 TAG block if present: \s:STATION,c:TIMESTAMP*CS\!AIVDM,...
    // Many receivers and feeds prepend these to carry source/timestamp metadata.
    if (line.startsWith('\\')) {
      const end = line.indexOf('\\', 1);
      if (end === -1) return null;
      line = line.slice(end + 1).trim();
    }
    // Accept the common talker IDs: AI (mobile), AB/BS (base station), AN, AR, AD.
    if (!/^![A-Z]{2}VD[MO],/.test(line)) return null;
    if (!checksumOk(line)) return null;
    const f = line.split(',');
    if (f.length < 7) return null;
    const total = Number(f[1]);
    const num = Number(f[2]);
    const payload = f[5];
    if (!payload || !Number.isFinite(total) || !Number.isFinite(num)) return null;

    if (total > 1) {
      const key = `${f[3]}|${f[4]}`;
      const p = this.partials.get(key) || { parts: [], ts: 0 };
      p.parts[num - 1] = payload;
      p.ts = Date.now();
      this.partials.set(key, p);
      let have = 0;
      for (let i = 0; i < total; i++) if (p.parts[i]) have++;
      this.gc();
      if (have < total) return null;
      this.partials.delete(key);
      try { return decodePayload(p.parts.join('')); } catch { return null; }
    }
    try { return decodePayload(payload); } catch { return null; }
  }

  gc() {
    const now = Date.now();
    for (const [k, p] of this.partials) if (now - p.ts > 30000) this.partials.delete(k);
  }
}
