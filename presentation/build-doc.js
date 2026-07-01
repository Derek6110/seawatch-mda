const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, TabStopType, TabStopPosition,
  HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber, PageBreak,
} = require('docx');

const NAVY = '0A1A2E';
const NAVYTX = '12365C';
const GOLD = '946F00';
const GREEN = '0B7A3B';
const MUTED = '5C6E82';
const CW = 9360; // content width DXA

const P = (text, o = {}) => new Paragraph({
  spacing: { after: o.after ?? 120, line: 276, ...(o.before ? { before: o.before } : {}) },
  alignment: o.align,
  children: [].concat(text).map((t) => (typeof t === 'string'
    ? new TextRun({ text: t, bold: o.bold, italics: o.italic, color: o.color, size: o.size })
    : t)),
});
const B = (text) => new Paragraph({
  numbering: { reference: 'b', level: 0 }, spacing: { after: 90, line: 276 },
  children: [].concat(text).map((t) => (typeof t === 'string' ? new TextRun({ text: t }) : t)),
});
const run = (text, o = {}) => new TextRun({ text, bold: o.bold, italics: o.italic, color: o.color, size: o.size });
const H1 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 140 }, children: [new TextRun(text)] });
const H2 = (text) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 }, children: [new TextRun(text)] });

const bd = { style: BorderStyle.SINGLE, size: 1, color: 'C9D6E3' };
const borders = { top: bd, bottom: bd, left: bd, right: bd, insideHorizontal: bd, insideVertical: bd };
const cellMargins = { top: 70, bottom: 70, left: 110, right: 110 };

function cell(content, w, opts = {}) {
  const paras = [].concat(content).map((c) => (c instanceof Paragraph ? c : new Paragraph({
    spacing: { after: 0, line: 264 },
    children: [].concat(c).map((t) => (typeof t === 'string' ? new TextRun({ text: t, bold: opts.bold, color: opts.color, size: opts.size || 20 }) : t)),
  })));
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, borders,
    margins: cellMargins, verticalAlign: VerticalAlign.CENTER,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
    children: paras,
  });
}
function headerRow(cells, widths) {
  return new TableRow({ tableHeader: true, children: cells.map((c, i) => cell([run(c, { bold: true, color: 'FFFFFF', size: 20 })], widths[i], { fill: NAVY })) });
}
function table(widths, headers, rows) {
  return new Table({
    width: { size: CW, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      headerRow(headers, widths),
      ...rows.map((r, ri) => new TableRow({
        children: r.map((c, i) => cell(c, widths[i], { fill: ri % 2 ? 'F2F6FA' : 'FFFFFF', bold: i === 0, size: 20 })),
      })),
    ],
  });
}

const crest = fs.readFileSync('crest.png');

const doc = new Document({
  creator: 'SeaWatch',
  title: 'SeaWatch — Implementation & Funding Proposal',
  styles: {
    default: { document: { run: { font: 'Arial', size: 22, color: '1B2733' } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: NAVYTX }, paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: NAVYTX }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [{ reference: 'b', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 260 } } } }] }],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1296, right: 1440, bottom: 1296, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], spacing: { after: 0 },
      children: [run('SeaWatch — Ghana Navy MDA', { color: MUTED, size: 16 }), run('\tImplementation & Funding Proposal', { color: MUTED, size: 16 })],
    })] }) },
    footers: { default: new Footer({ children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }], spacing: { before: 0 },
      children: [run('DRAFT — FOR COMMAND CONSIDERATION', { color: 'B23B3B', size: 15, bold: true }), new TextRun({ children: ['\tPage ', PageNumber.CURRENT], color: MUTED, size: 16 })],
    })] }) },
    children: [
      // ---- Title block ----
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new ImageRun({ type: 'png', data: crest, transformation: { width: 96, height: 92 }, altText: { title: 'Ghana Navy', description: 'Ghana Navy crest', name: 'crest' } })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [run('SeaWatch', { bold: true, size: 48, color: NAVY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [run('Maritime Domain Awareness System', { size: 26, color: NAVYTX })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [run('Implementation & Funding Proposal', { bold: true, size: 24, color: GOLD })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D6E0EA', space: 8 }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D6E0EA', space: 8 } }, spacing: { after: 60, before: 60 },
        children: [run('Prepared by GIG IT SOLUTIONS  ·  for the Ghana Navy Higher Command', { size: 22, color: '1B2733' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [run('Draft for command consideration  ·  Figures are indicative and subject to formal quotation', { italic: true, size: 18, color: MUTED })] }),

      // ---- 1. Executive Summary ----
      H1('1.  Executive Summary'),
      P([run('SeaWatch is a working maritime domain awareness (MDA) platform, already built and demonstrable, that provides a live operating picture, automated dark-vessel detection, inter-agency collaboration and command reporting for Ghana’s waters and the Gulf of Guinea.')]),
      P([run('This proposal sets out what is required to take SeaWatch from its current demonstrable state to a fully '), run('operational', { bold: true }), run(' system. The core finding is straightforward:')]),
      B([run('GIG IT SOLUTIONS can build the software to operational quality and deliver it far faster and more affordably than traditional defence-software programmes, using AI-accelerated development.', { bold: false })]),
      B([run('Reaching “operational”, however, depends on resources that software alone cannot provide — live data feeds, satellite tasking, infrastructure, security accreditation, and a small accountable team. These require funding and procurement.')]),
      P([run('In short: with the Navy’s funding for data, infrastructure, accreditation and GIG IT SOLUTIONS’s lean delivery team, the operational system is achievable on a 12–18 month phased path, with usable capability at every stage.')]),

      // ---- 2. Strategic Need ----
      H1('2.  Strategic Need'),
      P('The Gulf of Guinea remains one of the world’s most contested maritime regions — piracy and armed robbery, illegal, unreported and unregulated (IUU) fishing, smuggling, and threats to offshore oil infrastructure. The common enabler of these threats is “sea blindness”: gaps in the maritime picture that allow illicit actors to operate undetected, including vessels that switch off their transponders to go “dark.” SeaWatch exists to close that gap and give command a single, shared, real-time picture across all Maritime Operations Centres and partner agencies.'),

      // ---- 3. Current Status ----
      H1('3.  Current Status — Proof of Capability'),
      P('The following is already built, deployed and available for testing today, demonstrating that the concept and the engineering approach are sound:'),
      B('Live common operating picture with vessel tracking, classification, search and multiple basemaps (including satellite imagery).'),
      B('Automated dark-vessel detection — AIS gaps, position spoofing, loitering, ship-to-ship transfers and restricted-zone incursions — with a 0–100 vessel risk score.'),
      B('Inter-agency collaboration across nine commands and agencies, shared incidents with live discussion threads, and asset tasking.'),
      B('Role-based access for the watch chain, vetted account approval, an administrator dashboard, and a full audit trail.'),
      B('Ghana-tailored geography — EEZ, territorial sea, Jubilee/TEN/Sankofa oil fields, fishing zones — and the Yaoundé Architecture (MMCC Zone F).'),
      B('Secure, always-on cloud deployment with a persistent database; switchable live-feed and high-fidelity simulation modes for training.'),

      // ---- 4. Phased Plan ----
      new Paragraph({ children: [new PageBreak()] }),
      H1('4.  Phased Implementation Plan'),
      P('Delivery is phased so the Navy receives usable, improving capability at each stage rather than waiting for a single end-state. Each phase combines software delivered by GIG IT SOLUTIONS with specific procured resources.'),

      H2('Phase 1 — Live Data Integration  (Near-term)'),
      P([run('Objective: ', { bold: true }), run('replace simulated traffic with live regional feeds so the picture reflects real vessels.')]),
      B([run('Software — GIG IT SOLUTIONS: ', { bold: true, color: GREEN }), run('build ingestion and fusion for commercial AIS (terrestrial + satellite-AIS), Vessel Monitoring System (VMS) and any available coastal-radar feeds; reliability, de-duplication and historical storage.')]),
      B([run('Procured / external: ', { bold: true, color: GOLD }), run('commercial AIS and VMS data subscriptions; data-sharing arrangements with the Ghana Maritime Authority and fisheries authorities.')]),

      H2('Phase 2 — Satellite Tasking & Analytics  (Mid-term)'),
      P([run('Objective: ', { bold: true }), run('see and resolve non-cooperative “dark” contacts, and move from detection to prediction.')]),
      B([run('Software — GIG IT SOLUTIONS: ', { bold: true, color: GREEN }), run('satellite-imagery tasking and correlation against the AIS picture; pattern-of-life analytics and machine-learning risk scoring; advanced anomaly detection tailored to Ghana Navy doctrine.')]),
      B([run('Procured / external: ', { bold: true, color: GOLD }), run('optical / SAR satellite imagery and tasking contracts; access to historical data to train and validate models; data-science validation of model outputs.')]),

      H2('Phase 3 — Operational Hardening & Accreditation'),
      P([run('Objective: ', { bold: true }), run('field a secure, accredited, sustainable national system.')]),
      B([run('Software — GIG IT SOLUTIONS: ', { bold: true, color: GREEN }), run('security hardening, military authentication (PKI), classification handling, sovereign / on-premise deployment automation, monitoring and disaster recovery; Yaoundé data-sharing interfaces.')]),
      B([run('Procured / external: ', { bold: true, color: GOLD }), run('infrastructure (sovereign cloud or on-premise servers, optionally coastal radar); independent security accreditation and penetration testing; inter-agency and regional (Zone F) data-sharing agreements; training and 24/7 sustainment.')]),

      // ---- 5. Delivery model ----
      H1('5.  Delivery Model'),
      P('SeaWatch is delivered by GIG IT SOLUTIONS — a focused solutions provider that builds with AI-accelerated development — working under Ghana Navy direction, rather than through a large traditional contractor. This keeps cost, timeline and sovereignty under the Navy’s control. The table below clarifies the division of responsibility.'),
      table([3120, 3120, 3120], ['Function', 'GIG IT SOLUTIONS', 'Ghana Navy'], [
        [['Software build & maintenance'], ['Writes & maintains essentially all code, integrations, models and deployment'], ['Directs priorities; reviews & accepts']],
        [['Data & contracts'], ['Integrates whatever feeds are provided'], ['Procures feeds; signs contracts & agreements']],
        [['Security accreditation'], ['Implements controls; produces evidence & docs'], ['Owns sign-off; engages accreditation authority']],
        [['Hardware & infrastructure'], ['Automates deployment & configuration'], ['Procures & installs hardware / cloud']],
        [['Operations & sustainment'], ['Delivers fixes & enhancements'], ['Runs the watch; owns SLA, training, uptime']],
      ]),

      // ---- 6. Investment ----
      H1('6.  Indicative Investment Requirements'),
      P([run('The figures below are rough order-of-magnitude (ROM) planning ranges in USD, intended only to frame the resource envelope. ', { bold: true }), run('They are not quotations or commitments; actual costs require formal vendor quotation and local procurement, and several items are optional or scalable to the coverage the Navy chooses.')]),
      table([2520, 3960, 2880], ['Category', 'What it covers', 'Indicative ROM'], [
        [['GIG IT SOLUTIONS team'], ['Technical lead + security/accreditation specialist + operations/maintenance (lean, AI-accelerated)'], ['Personnel — annual']],
        [['AIS & VMS data feeds'], ['Commercial terrestrial + satellite-AIS and VMS subscriptions (coverage-dependent)'], ['~$20k – $120k / yr']],
        [['Satellite imagery & tasking'], ['Optical / SAR tasking to image dark contacts (volume-dependent)'], ['~$50k – $300k / yr']],
        [['Infrastructure'], ['Sovereign cloud or on-premise servers, networking, backup'], ['~$10k – $60k / yr']],
        [['Coastal radar (optional)'], ['Additional sensor coverage — hardware & installation, site-dependent'], ['Capex — site-by-site']],
        [['Security accreditation'], ['Independent penetration testing & accreditation cycle'], ['~$20k – $80k one-off']],
        [['Training & sustainment'], ['Operator training, support and continuous improvement'], ['Annual']],
      ]),
      P([run('Note: ', { bold: true }), run('the single largest saving versus a conventional programme is the software-engineering line — GIG IT SOLUTIONS’s AI-accelerated development compresses what is normally the most expensive and slowest element of a defence IT system.')], { italic: true }),

      // ---- 7. Timeline ----
      new Paragraph({ children: [new PageBreak()] }),
      H1('7.  Indicative Timeline'),
      table([2200, 4400, 2760], ['Phase', 'Outcome', 'Indicative duration'], [
        [['Phase 1'], ['Live regional data; real-vessel operating picture'], ['2 – 4 months']],
        [['Phase 2'], ['Satellite tasking, pattern-of-life & ML analytics'], ['4 – 8 months']],
        [['Phase 3'], ['Hardened, accredited, sovereign operational system'], ['4 – 8 months (overlapping)']],
        [[run('To operational', { bold: true })], [run('Full national capability, delivered incrementally', { bold: true })], [run('~12 – 18 months', { bold: true })]],
      ]),

      // ---- 8. Risks ----
      H1('8.  Key Risks & Mitigations'),
      table([4500, 4860], ['Risk', 'Mitigation'], [
        [['Data-feed cost or coverage gaps in the Gulf of Guinea'], ['Phase 1 starts with best-value providers; simulation mode covers gaps; scale coverage as budget allows']],
        [['Accreditation & security-approval timelines'], ['Engage the accreditation authority early; build controls in from Phase 1; independent testing in Phase 3']],
        [['Hardware procurement lead times (if radar pursued)'], ['Treat radar as optional/parallel; deliver full value from AIS + satellite first']],
        [['Inter-agency & regional data-sharing agreements'], ['Begin legal/diplomatic engagement (GMA, Fisheries, Zone F) in parallel with Phase 1']],
        [['Continuity & key-person dependency'], ['Code, documentation and deployment fully owned by the Navy; GIG IT SOLUTIONS sustains the build long-term']],
      ]),

      // ---- 9. Boundaries ----
      H1('9.  Division of Responsibility'),
      P([run('GIG IT SOLUTIONS provides: ', { bold: true, color: GREEN }), run('design, build, integration, security implementation, testing, deployment and maintenance of effectively all the software — rapidly and at low marginal cost through AI-accelerated development — as the accountable solution provider.')]),
      P([run('The Navy / Government provides: ', { bold: true, color: GOLD }), run('funding; live data-feed and satellite subscriptions; infrastructure and any sensor hardware; the accreditation authority and security sign-off; personnel security clearances; inter-agency and regional (Zone F) data-sharing agreements; and operational staffing of the watch.')]),

      // ---- 10. Recommendation ----
      H1('10.  Recommendation & The Ask'),
      P('SeaWatch has demonstrated the concept and the engineering. To proceed to operational capability, command is invited to:'),
      new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 90 }, children: [run('Approve phased funding', { bold: true }), run(' for the implementation plan in Section 4, with go/no-go decisions at each phase boundary.')] }),
      new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 90 }, children: [run('Designate a project sponsor and a Navy technical lead', { bold: true }), run(' to own delivery and security sign-off.')] }),
      new Paragraph({ numbering: { reference: 'b', level: 0 }, spacing: { after: 90 }, children: [run('Authorise Phase 1', { bold: true }), run(' — engagement of GIG IT SOLUTIONS and procurement of live AIS/VMS data feeds — to convert the demonstrable system into a live operating picture within months.')] }),
      P([run('With these resources, SeaWatch can be carried to an operational, Ghana-owned maritime domain awareness capability — strengthening the protection of Ghana’s waters, its offshore economy, and its leadership within the Yaoundé Architecture.')], { before: 120 }),
      new Paragraph({ spacing: { before: 220 }, alignment: AlignmentType.CENTER, children: [run('See  ·  Detect  ·  Collaborate  ·  Act', { italic: true, color: NAVYTX, size: 22 })] }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync('SeaWatch-Implementation-Proposal.docx', buf); console.log('WROTE SeaWatch-Implementation-Proposal.docx (' + buf.length + ' bytes)'); });
