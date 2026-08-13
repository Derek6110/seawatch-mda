const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, Header, Footer, TabStopType,
} = require('docx');

const NAVY = '0A1A2E';
const NAVYTX = '12365C';
const GOLD = '946F00';
const MUTED = '5C6E82';
const CW = 9360;

const run = (t, o = {}) => new TextRun({ text: t, bold: o.bold, italics: o.italic, color: o.color, size: o.size });
const P = (children, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 110, line: 268, before: o.before ?? 0 },
  children: [].concat(children).map((t) => (typeof t === 'string' ? new TextRun({ text: t }) : t)),
});
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 130 }, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 90 }, children: [new TextRun(t)] });

const QA = (q, a, confirm) => [
  new Paragraph({
    spacing: { before: 140, after: 40 }, keepNext: true,
    children: [run('Q  ', { bold: true, color: GOLD }), run(q, { bold: true })],
  }),
  new Paragraph({
    spacing: { after: confirm ? 30 : 90 }, indent: { left: 260 },
    children: [run('A  ', { bold: true, color: '2E7D32' }), run(a)],
  }),
  ...(confirm ? [new Paragraph({
    spacing: { after: 100 }, indent: { left: 260 },
    children: [run('⚠ CONFIRM BEFORE MEETING: ', { bold: true, color: 'B45309', size: 18 }), run(confirm, { italic: true, color: MUTED, size: 18 })],
  })] : []),
];

const check = (text, o = {}) => new Paragraph({
  numbering: { reference: 'checklist', level: 0 },
  spacing: { after: 70, line: 260 },
  children: [new TextRun({ text, size: 20 }), ...(o.note ? [new TextRun({ text: '  — ' + o.note, italics: true, color: MUTED, size: 18 })] : [])],
});

const groupHeader = (t) => new Paragraph({
  spacing: { before: 180, after: 60 },
  shading: { fill: 'F2F6FA', type: ShadingType.CLEAR },
  children: [run('  ' + t, { bold: true, color: NAVYTX, size: 21 })],
});

const bd = { style: BorderStyle.SINGLE, size: 1, color: 'C9D6E3' };
const borders = { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd };
function cell(content, w, opts = {}) {
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, borders,
    margins: { top: 90, bottom: 90, left: 120, right: 120 }, verticalAlign: VerticalAlign.TOP,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({
      spacing: { after: 0, line: 250 },
      children: [new TextRun({ text: content, bold: opts.bold, color: opts.color, size: opts.size || 19 })],
    })],
  });
}

const children = [
  new Paragraph({ spacing: { after: 20 }, children: [run('SeaWatch × MarineTraffic / Kpler', { bold: true, size: 40, color: NAVYTX })] }),
  new Paragraph({ spacing: { after: 60 }, children: [run('Meeting Prep — Prepared Answers & Question Checklist', { size: 24, color: GOLD, bold: true })] }),
  new Paragraph({
    spacing: { after: 260 },
    children: [
      run('Date: ', { bold: true, size: 19 }), run('_______________     ', { size: 19 }),
      run('Attendees: ', { bold: true, size: 19 }), run('_______________________________', { size: 19 }),
    ],
  }),

  // ================= SECTION A =================
  H1('A.  Likely questions from MarineTraffic / Kpler — with prepared answers'),
  P('Answers marked ⚠ need a number or decision from you before the meeting — everything else is ready to use as-is.', { after: 160 }),

  H2('Project & use case'),
  ...QA(
    'What is SeaWatch and what stage is it at?',
    'SeaWatch is a live maritime domain awareness (MDA) system built for the Ghana Navy — real-time vessel tracking, dark-vessel / AIS-gap detection, ship-to-ship transfer detection, incident reporting and multi-command collaboration across nine Ghana Navy commands and agencies (NHQ MOC, Western & Eastern Naval Commands, MMCC Zone F, FOB Ezinlibo, FOB Keta, VTMIS, MRCC, Fisheries Commission). It is live and has already been demonstrated to Navy command — the first presentation was well received. We are now sourcing a commercial AIS feed to replace our current stopgap, a free feed with no usable coverage over the Gulf of Guinea.'
  ),
  ...QA(
    'Who is the end customer, and what is your role?',
    'State plainly whether you are presenting as an independent vendor/developer building this for the Ghana Navy, a Navy-affiliated team member, or a hybrid — have one clean sentence ready so it is not ambiguous.',
    'Decide and rehearse your one-sentence answer to this.'
  ),
  ...QA(
    'How many users / workstations will consume the feed?',
    'The system is architected around the nine mapped commands as Maritime Operations Centre (MOC) workstations.',
    'Confirm the current and target concurrent-user count.'
  ),

  H2('Technical'),
  ...QA(
    'Do you need positions only, or also static / voyage data?',
    'Minimum requirement is live position plus static data — name, MMSI/IMO, flag, dimensions, type. Port calls and voyage/ETA data would strengthen the product but are not blocking for the current phase.'
  ),
  ...QA(
    'What call volume / polling cadence do you expect?',
    'The architecture supports either a WebSocket push feed or REST polling (comparable providers we’ve tested were polled every 60–300 seconds). The target area is Ghana’s EEZ bounding box (~1.4°N–6.4°N, 4.2°W–2.2°E), which — based on testing with other AIS sources in similarly busy waters — typically holds on the order of 90–220 concurrent vessels.'
  ),
  ...QA(
    'What have you already tried on the technical side?',
    'Two credential sets were issued to us for evaluation. (1) A 40-character classic-format API key, which returned "SERVICE KEY NOT FOUND" against every classic endpoint we tested (exportvessels, exportvessels-custom-area, vesselpositions, vesselmasterdata, portcalls). (2) An OAuth2 client_id/client_secret pair, which authenticates successfully via the client_credentials grant against your Auth0-based identity server (auth.kpler.com/oauth/token) — but every "audience" value we’ve tried, including the Vessels 2.0 GraphQL endpoint and roughly fifteen other candidates, returns "client not authorized to access resource server." That reads as a client that exists but has no product entitlement granted yet on your side.'
  ),

  H2('Commercial & compliance'),
  ...QA(
    'Will this data be resold or shared with third parties?',
    'Data is displayed only within SeaWatch to Ghana Navy MOC users; it is not resold.',
    'Confirm whether any sharing with allied navies or the regional MMCC Zone F network is planned — Ghana hosts that node, and it may affect the licensing tier they offer.'
  ),
  ...QA(
    'What is your deployment environment / data sovereignty requirement?',
    'Currently hosted on Render (cloud) with PostgreSQL on Neon. The system is also packaged as a portable Docker image, so a sovereign or on-premise deployment is straightforward if required.'
  ),
  ...QA(
    'What is your budget range and procurement timeline?',
    '',
    'Have a number or range ready, even a rough one — vendors size their pitch and flexibility off this.'
  ),
  ...QA(
    'Is an end-user certificate or export-control screening needed for a government/defense buyer?',
    '',
    'Check with Navy procurement/legal whether an EUC is required before this comes up in the room.'
  ),

  // ================= SECTION B =================
  H1('B.  Your checklist — questions to ask them'),
  P('Bring this list into the meeting and tick items off as they’re answered.', { after: 100 }),

  groupHeader('1 · Unblock the technical issue (lead with this)'),
  check('Our OAuth client authenticates but has no product scope — what audience value should we use, and can you activate the entitlement now?'),
  check('Is our subscription for the classic MarineTraffic REST API or the newer Kpler Vessels 2.0 GraphQL API?', { note: 'they use completely different auth' }),
  check('Can you send a working example request — the token call and a data call — for our specific product?'),
  check('Can we get a live test call working before we leave today, or on a follow-up call this week?'),

  groupHeader('2 · Coverage quality for the Gulf of Guinea'),
  check('What is your AIS coverage in the Gulf of Guinea — terrestrial receivers, satellite (S-AIS), or both?'),
  check('What is the typical position-report latency and refresh interval for satellite AIS in that region?'),
  check('Can you provide a coverage map or a sample data dump for a bounding box around Ghana’s EEZ before we commit?'),

  groupHeader('3 · Product fit'),
  check('Which product is right for a live position feed with our own anomaly detection — LVI, Vessels 2.0 GraphQL, or something else?'),
  check('Do you support push (WebSocket / webhook), or is it poll-only?'),
  check('Do you offer dark-vessel / AIS-gap flags natively, or is that entirely on us to compute?'),

  groupHeader('4 · Commercial'),
  check('What is the pricing model — per-vessel, per-call, per-seat, or flat enterprise?'),
  check('What is the minimum contract term? Is there a trial/pilot tier to validate coverage first?'),
  check('What is the SLA — uptime guarantee, support response time?'),

  groupHeader('5 · Integration & support'),
  check('Do we get a dedicated technical contact for onboarding, or a general ticket queue?'),
  check('Are there rate limits that would affect continuous 24/7 polling from an operations center?'),
  check('What is the process to scale up users or add commands later?'),

  // ================= CLOSING =================
  H1('Walk away with'),
  new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [
      new TableRow({ children: [cell('1.  Confirmation of exactly which product you are licensed for (classic API vs. Vessels 2.0 GraphQL).', CW, { fill: 'FFFFFF' })] }),
      new TableRow({ children: [cell('2.  A working audience value (or a corrected/reissued key) for that product.', CW, { fill: 'F2F6FA' })] }),
      new TableRow({ children: [cell('3.  One successful test call before the meeting ends — or, failing that, a firm date and named contact for a follow-up.', CW, { fill: 'FFFFFF' })] }),
    ],
  }),
];

const doc = new Document({
  creator: 'SeaWatch',
  title: 'SeaWatch × MarineTraffic Meeting Prep',
  styles: {
    default: { document: { run: { font: 'Arial', size: 20, color: '1B2733' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 27, bold: true, font: 'Arial', color: NAVYTX }, paragraph: { spacing: { before: 300, after: 130 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: NAVY }, paragraph: { spacing: { before: 200, after: 90 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [{
      reference: 'checklist',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '☐', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 420, hanging: 260 } } } }],
    }],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1260, bottom: 1080, left: 1260 } } },
    headers: { default: new Header({ children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], spacing: { after: 0 },
      children: [run('SeaWatch — MarineTraffic Meeting Prep', { color: MUTED, size: 15 }), run('\tConfidential working notes', { color: MUTED, size: 15 })],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], spacing: { before: 0 },
      children: [run('Prepared for internal use', { color: MUTED, size: 15 }), new TextRun({ children: ['\tPage ', PageNumber.CURRENT], color: MUTED, size: 15 })],
    })] }) },
    children,
  }],
});

const outPath = process.argv[2] || 'MarineTraffic-Meeting-Prep.docx';
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(outPath, buf); console.log('WROTE ' + outPath + ' (' + buf.length + ' bytes)'); });
