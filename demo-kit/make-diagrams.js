// Generate the design-doc diagrams as SVG, rasterise to PNG with sharp.
// Value Lifecycle Platform — VE = blue, VR = emerald.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT = "demo-kit/diagrams";
fs.mkdirSync(OUT, { recursive: true });

// Palette
const VE = "#2563EB", VE_D = "#1E40AF", VE_MIST = "#EFF6FF";
const VR = "#059669", VR_D = "#047857", VR_MIST = "#ECFDF5";
const DARK = "#0B1220", INK = "#0F172A", MUTED = "#64748B", HAIR = "#CBD5E1", WHITE = "#FFFFFF";
const AMBER = "#D97706", AMBER_MIST = "#FFF7ED";
const FONT = "Arial, Helvetica, sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function rrect(x, y, w, h, { fill = VE, stroke = VE_D, rx = 10, sw = 1.5 } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}
// lines: [{t, b(bold), s(size), c(color)}]; vertically centred block in the box
function boxText(cx, cy, lines, def = {}) {
  const sizes = lines.map((l) => l.s || def.s || 15);
  const lh = sizes.map((s) => s * 1.35);
  const total = lh.reduce((a, b) => a + b, 0);
  let y = cy - total / 2;
  return lines
    .map((l, i) => {
      y += lh[i];
      const baseline = y - lh[i] * 0.28;
      return `<text x="${cx}" y="${baseline}" font-family="${FONT}" font-size="${l.s || def.s || 15}" font-weight="${l.b ? 700 : 400}" fill="${l.c || def.c || WHITE}" text-anchor="middle">${esc(l.t)}</text>`;
    })
    .join("");
}
// left-aligned list of lines starting at (x, yTop)
function listText(x, yTop, lines, { s = 13, c = INK, gap = 1.5 } = {}) {
  let y = yTop;
  return lines
    .map((t) => {
      const line = `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${s}" fill="${c}" text-anchor="start">${esc(t)}</text>`;
      y += s * gap;
      return line;
    })
    .join("");
}
function label(x, y, t, { s = 13, c = MUTED, anchor = "middle", b = false } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${s}" font-weight="${b ? 700 : 400}" fill="${c}" text-anchor="${anchor}">${esc(t)}</text>`;
}
function arrow(x1, y1, x2, y2, { c = MUTED, dash = false, id = "arw" } = {}) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2" marker-end="url(#${id})"${dash ? ' stroke-dasharray="5 4"' : ""}/>`;
}
function svg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}">
  <defs>
    <marker id="arw" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${MUTED}"/></marker>
    <marker id="arwVE" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${VE}"/></marker>
    <marker id="arwVR" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${VR}"/></marker>
  </defs>
  <rect width="${w}" height="${h}" fill="${WHITE}"/>
  ${body}
  </svg>`;
}

// ── A. Value lifecycle: VE Job Plan → handover → VR lifecycle ──────────────
function lifecycle() {
  const w = 1180, h = 470;
  let b = "";
  // VE card (blue)
  const vx = 30, vy = 60, vw = 470, vh = 360;
  b += rrect(vx, vy, vw, vh, { fill: VE_MIST, stroke: VE, sw: 2 });
  b += rrect(vx, vy, vw, 56, { fill: VE, rx: 10, sw: 0 });
  b += `<rect x="${vx}" y="${vy + 40}" width="${vw}" height="16" fill="${VE_MIST}"/>`;
  b += boxText(vx + vw / 2, vy + 28, [{ t: "Value Engineer — 8-phase VE Job Plan", b: true, s: 17 }]);
  b += listText(vx + 34, vy + 95, [
    "1 · Orientation — scope, stakeholders, target",
    "2 · Information — cost & performance facts",
    "3 · Function analysis — verb-noun, FAST, value index",
    "4 · Creative — generate alternatives",
    "5 · Evaluation — weighted scoring & shortlist",
    "6 · Development — recommendations & business case",
    "7 · Presentation — reviewer accept / reject",
    "8 · Handover — baselines, KPIs, success criteria",
  ], { s: 14.5, c: INK, gap: 2.05 });

  // VR card (emerald)
  const rx = 680, ry = 60, rw = 470, rh = 360;
  b += rrect(rx, ry, rw, rh, { fill: VR_MIST, stroke: VR, sw: 2 });
  b += rrect(rx, ry, rw, 56, { fill: VR, rx: 10, sw: 0 });
  b += `<rect x="${rx}" y="${ry + 40}" width="${rw}" height="16" fill="${VR_MIST}"/>`;
  b += boxText(rx + rw / 2, ry + 28, [{ t: "Value Realization Manager — 7-phase lifecycle", b: true, s: 16 }]);
  b += listText(rx + 34, ry + 95, [
    "1 · Intake & alignment — confirm objectives",
    "2 · Baseline & measurement — validate baselines",
    "3 · Implementation planning — work packages",
    "4 · Adoption & change — training, comms, champions",
    "5 · Execution & monitoring — status & health",
    "6 · Value tracking & reporting — KPI actuals, QBR",
    "7 · Close-out — realized value vs business case",
  ], { s: 14.5, c: INK, gap: 2.35 });

  // Handover bridge in the middle
  const hx = 500, hcy = h / 2;
  b += arrow(vx + vw + 2, hcy, hx + 20, hcy, { c: VE, id: "arwVE" });
  b += rrect(hx + 20, hcy - 60, 140, 120, { fill: WHITE, stroke: AMBER, sw: 2, rx: 12 });
  b += boxText(hx + 90, hcy, [
    { t: "HANDOVER", b: true, s: 15, c: AMBER },
    { t: "first-class", s: 12, c: MUTED },
    { t: "≥1 accepted", s: 11.5, c: INK },
    { t: "recommendation", s: 11.5, c: INK },
  ]);
  b += arrow(hx + 160, hcy, rx - 2, hcy, { c: VR, id: "arwVR" });

  b += label(w / 2, 40, "One workspace, the whole value lifecycle — every realization track traces back to its source study.", { s: 13.5, c: MUTED });
  return svg(w, h, b);
}

// ── B. Industry profiles as configuration ─────────────────────────────────
function industryConfig() {
  const w = 1160, h = 420;
  // center engine
  let b = rrect(40, 140, 340, 150, { fill: VE });
  b += boxText(210, 215, [
    { t: "Core engine", b: true, s: 19 },
    { t: "8 VE + 7 VR phases", s: 13, c: "#DBEAFE" },
    { t: "deliverables · finance engine", s: 13, c: "#DBEAFE" },
    { t: "KPI catalogue · templates", s: 13, c: "#DBEAFE" },
  ]);
  b += label(210, 320, "never changes per industry", { s: 12.5, c: MUTED });
  const profiles = [
    ["Construction & Infrastructure", "study types · cost drivers · value levers · default KPIs", 40],
    ["Manufacturing & Product Dev", "study types · cost drivers · value levers · default KPIs", 165],
    ["Enterprise Software / SaaS", "study types · cost drivers · value levers · default KPIs", 290],
  ];
  profiles.forEach(([t, d, py]) => {
    b += rrect(700, py, 420, 92, { fill: VE_MIST, stroke: VE });
    b += boxText(910, py + 46, [{ t, b: true, s: 16.5, c: VE_D }, { t: d, s: 12, c: INK }]);
    b += arrow(382, 215, 695, py + 46, { c: VE, id: "arwVE" });
  });
  b += label(910, 30, "Industry = configuration, not code — add a profile in a TS file and re-seed.", { s: 13, c: MUTED });
  return svg(w, h, b);
}

// ── C. Study data → deliverables ──────────────────────────────────────────
function dataToDocs() {
  const w = 940, h = 640;
  let b = "";
  b += rrect(60, 30, 340, 96, { fill: VE_MIST, stroke: VE });
  b += boxText(230, 78, [{ t: "VE study data", b: true, s: 15, c: INK }, { t: "functions · alternatives · scores", s: 11.5, c: MUTED }, { t: "business case · scenarios · costs", s: 11.5, c: MUTED }]);
  b += rrect(540, 30, 340, 96, { fill: VR_MIST, stroke: VR });
  b += boxText(710, 78, [{ t: "Realization data", b: true, s: 15, c: INK }, { t: "work packages · benefits", s: 11.5, c: MUTED }, { t: "KPI targets & actuals · reports", s: 11.5, c: MUTED }]);
  // generator
  b += rrect(310, 195, 320, 74, { fill: INK, stroke: DARK });
  b += boxText(470, 232, [{ t: "Finance & export engine", b: true, s: 16 }, { t: "ROI · payback · NPV · IRR · LCC", s: 12, c: "#CBD5E1" }]);
  b += arrow(230, 126, 400, 193, { c: MUTED });
  b += arrow(710, 126, 540, 193, { c: MUTED });
  // documents row
  const docs = [
    ["Business Case", VE],
    ["VRP / QBR pack", VR],
    ["KPI workbook", INK],
  ];
  const dw = 220, dy = 350, pitch = 250, x0 = 95;
  docs.forEach(([t, col], i) => {
    const x = x0 + i * pitch, cx = x + dw / 2;
    b += rrect(x, dy, dw, 66, { fill: WHITE, stroke: col });
    b += boxText(cx, dy + 33, [{ t, b: true, s: 14, c: INK }]);
    b += arrow(470, 271, cx, dy - 2, { c: HAIR });
    b += arrow(cx, dy + 68, 470, 488, { c: HAIR });
  });
  // export
  b += rrect(300, 490, 340, 72, { fill: INK });
  b += boxText(470, 526, [{ t: "Export", b: true, s: 17 }, { t: "Word · Excel", s: 13, c: "#CBD5E1" }]);
  b += label(470, 610, "Documents assemble from live data — always current, never a blank template.", { s: 12.5, c: MUTED });
  return svg(w, h, b);
}

// ── D. Architecture ───────────────────────────────────────────────────────
function architecture() {
  const w = 920, h = 560;
  let b = "";
  const cx = 460, bw = 400, bh = 72, x = cx - bw / 2;
  const layers = [
    ["Role-aware UI", "Next.js App Router · React Server Components · Tailwind", 40, VE, WHITE],
    ["Application layer", "Server Actions · REST API · finance & export engine", 190, VE, WHITE],
    ["Prisma ORM", "organization-scoped client · zod validation", 340, VE, WHITE],
    ["PostgreSQL", "the VE↔VR relational graph", 470, VE_MIST, INK],
  ];
  layers.forEach(([t, d, y, fill, col], i) => {
    b += rrect(x, y, bw, bh, { fill, stroke: fill === VE_MIST ? VE : VE_D });
    b += boxText(cx, y + bh / 2, [{ t, b: true, s: 17, c: col }, { t: d, s: 11.5, c: fill === VE_MIST ? MUTED : "#DBEAFE" }]);
    if (i < layers.length - 1) b += arrow(cx, y + bh + 2, cx, layers[i + 1][2] - 2, { c: MUTED });
  });
  b += label(cx + 14, 170, "/portfolio · /ve · /vr · /kpis · /templates", { s: 11.5, c: MUTED, anchor: "start" });
  // side boxes
  b += rrect(28, 188, 200, 74, { fill: WHITE, stroke: HAIR });
  b += boxText(128, 225, [{ t: "Auth.js (NextAuth v5)", b: true, s: 13.5, c: INK }, { t: "JWT · RBAC · middleware", s: 11, c: MUTED }]);
  b += arrow(230, 225, x - 2, 225, { c: MUTED, dash: true });
  b += rrect(692, 188, 200, 74, { fill: WHITE, stroke: HAIR });
  b += boxText(792, 225, [{ t: "Anthropic API", b: true, s: 13.5, c: INK }, { t: "optional · starter text", s: 11, c: MUTED }]);
  b += arrow(690, 225, x + bw + 2, 225, { c: MUTED, dash: true });
  b += label(cx, 545, "Config layer (industries, phases, KPIs, templates) seeded from src/lib/domain/*.ts", { s: 12, c: MUTED });
  return svg(w, h, b);
}

// ── E. The VE→VR handover (marquee) ───────────────────────────────────────
function handover() {
  const w = 1160, h = 460;
  let b = "";
  // left: VE study
  b += rrect(30, 120, 300, 220, { fill: VE_MIST, stroke: VE, sw: 2 });
  b += boxText(180, 158, [{ t: "VE study", b: true, s: 18, c: VE_D }]);
  b += listText(58, 205, [
    "Accepted recommendations",
    "Expected-benefit artifacts",
    "KPI & baseline artifacts",
    "Success criteria",
  ], { s: 13.5, c: INK, gap: 2.2 });
  b += rrect(58, 300, 244, 30, { fill: WHITE, stroke: AMBER, rx: 6 });
  b += boxText(180, 315, [{ t: "gate: ≥1 accepted recommendation", s: 11.5, c: AMBER }]);

  // center: action
  b += arrow(332, 230, 430, 230, { c: VE, id: "arwVE" });
  b += rrect(430, 185, 300, 90, { fill: INK, rx: 12 });
  b += boxText(580, 230, [{ t: "Create Value", b: true, s: 17 }, { t: "Realization Track →", b: true, s: 17 }]);
  b += arrow(730, 230, 828, 230, { c: VR, id: "arwVR" });

  // right: VR track
  b += rrect(828, 90, 302, 300, { fill: VR_MIST, stroke: VR, sw: 2 });
  b += boxText(979, 128, [{ t: "VR track (seeded)", b: true, s: 17, c: VR_D }]);
  b += listText(856, 172, [
    "Work packages ← recommendations",
    "Benefits ← expected-benefit artifacts",
    "KPI targets ← KPI artifacts",
    "Handover artifacts linked to track",
    "Baselines & success criteria carried",
  ], { s: 13, c: INK, gap: 2.15 });
  b += rrect(856, 340, 246, 34, { fill: WHITE, stroke: VR, rx: 6 });
  b += boxText(979, 357, [{ t: "source study VE-… back-linked", s: 11.5, c: VR_D }]);

  b += label(w / 2, 44, "One click turns approved value into owned, measurable work — nothing is re-keyed.", { s: 13.5, c: MUTED });
  b += label(580, 300, "study → HANDED_OVER · audit event written", { s: 11.5, c: MUTED });
  return svg(w, h, b);
}

const diagrams = {
  "1-value-lifecycle": lifecycle(),
  "2-industry-config": industryConfig(),
  "3-data-to-documents": dataToDocs(),
  "4-architecture": architecture(),
  "5-handover": handover(),
};

(async () => {
  for (const [name, s] of Object.entries(diagrams)) {
    fs.writeFileSync(path.join(OUT, name + ".svg"), s);
    await sharp(Buffer.from(s)).png().toFile(path.join(OUT, name + ".png"));
    console.log("wrote", name + ".png");
  }
})();
