// Flow diagrams for the VE & VRM Process Guide. Hand-rolled SVG → PNG (sharp).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const OUT = path.join(__dirname, "guide-diagrams");
fs.mkdirSync(OUT, { recursive: true });

// Value Lifecycle Platform palette (VE = blue, VR = emerald)
const DEEP = "#1E40AF", BLUE = "#2563EB", BLUEB = "#93C5FD", BLUE_MIST = "#EFF6FF";
const TEAL = "#059669", TEALB = "#6EE7B7", TEAL_MIST = "#ECFDF5";
const AMBER = "#D97706", AMBER_MIST = "#FFF7ED";
const INK = "#0F172A", MUTED = "#64748B", HAIR = "#CBD5E1", WHITE = "#FFFFFF";
const FONT = "Arial, Helvetica, sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function rrect(x, y, w, h, { fill = BLUE, stroke = "none", rx = 10, sw = 1.5 } = {}) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${fill}"${stroke === "none" ? "" : ` stroke="${stroke}" stroke-width="${sw}"`}/>`;
}
function boxText(cx, cy, lines, def = {}) {
  const sizes = lines.map((l) => l.s || def.s || 15);
  const lh = sizes.map((s) => s * 1.34);
  const total = lh.reduce((a, b) => a + b, 0);
  let y = cy - total / 2;
  return lines.map((l, i) => {
    y += lh[i];
    const baseline = y - lh[i] * 0.28;
    return `<text x="${cx}" y="${baseline}" font-family="${FONT}" font-size="${l.s || def.s || 15}" font-weight="${l.b ? 700 : 400}" fill="${l.c || def.c || WHITE}" text-anchor="middle">${esc(l.t)}</text>`;
  }).join("");
}
function listText(x, yTop, lines, { s = 13, c = INK, gap = 1.55 } = {}) {
  let y = yTop;
  return lines.map((t) => {
    const line = `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${s}" fill="${c}" text-anchor="start">${esc(t)}</text>`;
    y += s * gap; return line;
  }).join("");
}
function label(x, y, t, { s = 13, c = MUTED, anchor = "middle", b = false } = {}) {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${s}" font-weight="${b ? 700 : 400}" fill="${c}" text-anchor="${anchor}">${esc(t)}</text>`;
}
function arrow(x1, y1, x2, y2, { c = MUTED, dash = false, id = "arw" } = {}) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="2.2" marker-end="url(#${id})"${dash ? ' stroke-dasharray="5 4"' : ""}/>`;
}
function svg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${h * 2}" viewBox="0 0 ${w} ${h}">
  <defs>
    <marker id="arw" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${MUTED}"/></marker>
    <marker id="arwB" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${BLUE}"/></marker>
    <marker id="arwT" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${TEAL}"/></marker>
    <marker id="arwA" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="${AMBER}"/></marker>
  </defs>
  <rect width="${w}" height="${h}" fill="${WHITE}"/>${body}</svg>`;
}

// ── D1. End-to-end value lifecycle ────────────────────────────────────────
function lifecycle() {
  const w = 1180, h = 470;
  let b = label(w / 2, 34, "One workspace, the whole value lifecycle — every realization effort traces back to the study it came from.", { s: 13.5, c: MUTED });
  // VE card
  const vx = 30, vy = 58, vw = 480, vh = 372;
  b += rrect(vx, vy, vw, vh, { fill: BLUE_MIST, stroke: BLUE, sw: 2 });
  b += rrect(vx, vy, vw, 52, { fill: BLUE, rx: 10 });
  b += `<rect x="${vx}" y="${vy + 38}" width="${vw}" height="14" fill="${BLUE_MIST}"/>`;
  b += boxText(vx + vw / 2, vy + 26, [{ t: "VALUE ENGINEERING — 8-phase Job Plan", b: true, s: 15 }]);
  b += listText(vx + 30, vy + 88, [
    "1 · Orientation — scope, stakeholders, target",
    "2 · Information — current-state cost & pain",
    "3 · Function analysis — where value hides",
    "4 · Creative — generate alternatives",
    "5 · Evaluation — score & shortlist",
    "6 · Development — recommendations & business case",
    "7 · Presentation — reviewer accept / reject",
    "8 · Handover — baselines, KPIs, success criteria",
  ], { s: 14.5, c: INK, gap: 2.12 });
  // VRM card
  const rx = 670, ry = 58, rw = 480, rh = 372;
  b += rrect(rx, ry, rw, rh, { fill: TEAL_MIST, stroke: TEAL, sw: 2 });
  b += rrect(rx, ry, rw, 52, { fill: TEAL, rx: 10 });
  b += `<rect x="${rx}" y="${ry + 38}" width="${rw}" height="14" fill="${TEAL_MIST}"/>`;
  b += boxText(rx + rw / 2, ry + 26, [{ t: "VALUE REALIZATION — 7-phase lifecycle", b: true, s: 15 }]);
  b += listText(rx + 30, ry + 88, [
    "1 · Intake & alignment — confirm objectives",
    "2 · Baseline & measurement — validate baselines",
    "3 · Implementation planning — work packages",
    "4 · Adoption & change — training, comms, champions",
    "5 · Execution & monitoring — status & health",
    "6 · Value tracking & reporting — KPI actuals, QBR",
    "7 · Close-out — realized value vs the business case",
  ], { s: 14.5, c: INK, gap: 2.4 });
  // Handover bridge
  const hcy = h / 2 + 6;
  b += arrow(vx + vw + 3, hcy, 520, hcy, { c: BLUE, id: "arwB" });
  b += rrect(520, hcy - 62, 132, 124, { fill: AMBER_MIST, stroke: AMBER, sw: 2, rx: 14 });
  b += boxText(586, hcy, [
    { t: "HANDOVER", b: true, s: 14, c: AMBER },
    { t: "governance", s: 11.5, c: MUTED }, { t: "gate", s: 11.5, c: MUTED },
    { t: "≥1 accepted", s: 11, c: INK }, { t: "recommendation", s: 11, c: INK },
  ]);
  b += arrow(652, hcy, rx - 3, hcy, { c: TEAL, id: "arwT" });
  return svg(w, h, b);
}

// ── generic horizontal phase flow ─────────────────────────────────────────
function phaseFlow(title, phases, accent, accentId) {
  const n = phases.length;
  const w = 1180, h = 300;
  const m = 26, gap = 20;
  const cw = (w - m * 2 - gap * (n - 1)) / n;
  const cy = 130, ch = 150, cyTop = cy - ch / 2;
  let b = label(w / 2, 34, title, { s: 15, c: INK, b: true });
  phases.forEach(([num, name, sub, gate], i) => {
    const x = m + i * (cw + gap);
    const isGate = !!gate;
    b += rrect(x, cyTop, cw, ch, { fill: i % 2 ? WHITE : BLUE_MISTof(accent), stroke: accent, sw: isGate ? 2.5 : 1.4, rx: 12 });
    // number badge
    b += `<circle cx="${x + 26}" cy="${cyTop + 26}" r="16" fill="${accent}"/>`;
    b += label(x + 26, cyTop + 31, num, { s: 15, c: WHITE, b: true });
    b += `<foreignObject/>`;
    b += wrapText(x + cw / 2, cyTop + 62, name, { s: 14.5, c: INK, b: true, w: cw - 24 });
    b += wrapText(x + cw / 2, cyTop + ch - 34, sub, { s: 11.5, c: MUTED, w: cw - 22 });
    if (isGate) b += rrect(x + cw / 2 - 34, cyTop + ch - 20, 68, 16, { fill: AMBER, rx: 6 }) + label(x + cw / 2, cyTop + ch - 8, "GATE", { s: 9.5, c: WHITE, b: true });
    if (i < n - 1) b += arrow(x + cw + 2, cy, x + cw + gap - 2, cy, { c: accent, id: accentId });
  });
  b += label(w / 2, h - 16, "Work each phase in order; the exit-criteria checklist is the quality gate before advancing.", { s: 12.5, c: MUTED });
  return svg(w, h, b);
}
function BLUE_MISTof(accent) { return accent === TEAL ? TEAL_MIST : BLUE_MIST; }
// crude 2-line word wrap centred at (cx, yBaselineFirst)
function wrapText(cx, y, text, { s = 13, c = INK, b = false, w = 120 } = {}) {
  const words = String(text).split(" ");
  const maxChars = Math.max(6, Math.floor(w / (s * 0.52)));
  const lines = []; let cur = "";
  for (const wd of words) {
    if ((cur + " " + wd).trim().length > maxChars && cur) { lines.push(cur); cur = wd; }
    else cur = (cur + " " + wd).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3).map((ln, i) =>
    `<text x="${cx}" y="${y + i * s * 1.25}" font-family="${FONT}" font-size="${s}" font-weight="${b ? 700 : 400}" fill="${c}" text-anchor="middle">${esc(ln)}</text>`
  ).join("");
}

function veFlow() {
  return phaseFlow("The Value Engineering process — 8 phases", [
    ["1", "Orientation", "scope & target"],
    ["2", "Information", "current-state facts"],
    ["3", "Function analysis", "where value hides"],
    ["4", "Creative", "generate options"],
    ["5", "Evaluation", "score & shortlist"],
    ["6", "Development", "case & recs"],
    ["7", "Presentation", "accept / reject", true],
    ["8", "Handover", "prepare the bridge"],
  ], BLUE, "arwB");
}
function vrmFlow() {
  return phaseFlow("The Value Realization process — 7 phases", [
    ["1", "Intake & alignment", "confirm objectives"],
    ["2", "Baseline & measurement", "validate baselines"],
    ["3", "Implementation planning", "work packages"],
    ["4", "Adoption & change", "drive usage"],
    ["5", "Execution & monitoring", "status & health"],
    ["6", "Value tracking & reporting", "KPI actuals · QBR"],
    ["7", "Close-out", "prove & feed back"],
  ], TEAL, "arwT");
}

// ── D3. The handover ──────────────────────────────────────────────────────
function handover() {
  const w = 1180, h = 430;
  let b = label(w / 2, 32, "The handover turns approved value into owned, measurable work — nothing is re-keyed.", { s: 13.5, c: MUTED });
  // left
  b += rrect(30, 96, 320, 250, { fill: BLUE_MIST, stroke: BLUE, sw: 2 });
  b += boxText(190, 130, [{ t: "VE study — ready to hand over", b: true, s: 15, c: DEEP }]);
  b += listText(56, 176, [
    "Accepted recommendation(s)",
    "Quantified business case (ROI / TCO)",
    "Baselines & KPI definitions",
    "Success criteria",
    "Expected-benefit artifacts",
  ], { s: 13.5, c: INK, gap: 2.15 });
  // gate
  b += arrow(352, 220, 452, 220, { c: BLUE, id: "arwB" });
  b += rrect(452, 168, 276, 104, { fill: AMBER_MIST, stroke: AMBER, sw: 2, rx: 14 });
  b += boxText(590, 220, [
    { t: "HANDOVER — governance gate", b: true, s: 14, c: AMBER },
    { t: "Guard: ≥ 1 reviewer-accepted", s: 12, c: INK },
    { t: "recommendation", s: 12, c: INK },
    { t: "study → HANDED_OVER · audit logged", s: 11, c: MUTED },
  ]);
  b += arrow(728, 220, 828, 220, { c: TEAL, id: "arwT" });
  // right
  b += rrect(828, 80, 322, 290, { fill: TEAL_MIST, stroke: TEAL, sw: 2 });
  b += boxText(989, 116, [{ t: "VR track — auto-seeded", b: true, s: 15, c: TEAL }]);
  b += listText(854, 162, [
    "Work packages ← recommendations",
    "Benefits ← expected-benefit artifacts",
    "KPI targets ← KPI definitions (+ baselines)",
    "Success criteria carried across",
    "Back-link to the source study",
  ], { s: 13, c: INK, gap: 2.35 });
  return svg(w, h, b);
}

// ── D5. Roles across the lifecycle (swimlane grid) ────────────────────────
function roles() {
  const stages = ["Discover", "Business case", "Approve", "Handover", "Implement", "Prove value", "Renew / expand"];
  const rows = [
    ["Value Engineer", BLUE, [2, 2, 1, 1, 0, 0, 1]],
    ["Reviewer / Sponsor", AMBER, [0, 0, 2, 0, 0, 1, 1]],
    ["Value Realization Mgr", TEAL, [0, 0, 0, 1, 2, 2, 2]],
    ["Delivery team", DEEP, [0, 0, 0, 1, 2, 1, 0]],
    ["Customer", MUTED, [1, 1, 1, 0, 1, 1, 1]],
  ];
  const w = 1180, h = 380;
  const labW = 210, x0 = labW + 20, top = 74, colW = (w - x0 - 20) / stages.length, rowH = 50;
  let b = label(w / 2, 32, "Who leads and who supports, across the value lifecycle", { s: 15, c: INK, b: true });
  // stage headers
  stages.forEach((st, c) => { b += label(x0 + c * colW + colW / 2, top - 12, st, { s: 12.5, c: INK, b: true }); });
  rows.forEach(([name, col, cells], r) => {
    const y = top + r * rowH;
    b += label(labW, y + rowH / 2 + 4, name, { s: 13.5, c: INK, b: true, anchor: "end" });
    cells.forEach((v, c) => {
      const cx = x0 + c * colW, cw = colW - 10;
      if (v === 0) { b += rrect(cx, y + 6, cw, rowH - 12, { fill: "#F3F7FB", rx: 8 }); return; }
      const fill = v === 2 ? col : lighten(col);
      b += rrect(cx, y + 6, cw, rowH - 12, { fill, rx: 8 });
      b += label(cx + cw / 2, y + rowH / 2 + 4, v === 2 ? "Lead" : "Support", { s: 11.5, c: v === 2 ? WHITE : INK, b: v === 2 });
    });
  });
  b += label(x0, h - 14, "Solid = leads the stage · light = supports · grey = not primarily involved.", { s: 12, c: MUTED, anchor: "start" });
  return svg(w, h, b);
}
function lighten(hex) {
  const map = { [BLUE]: BLUE_MIST, [TEAL]: TEAL_MIST, [AMBER]: AMBER_MIST, [DEEP]: "#DCE9F7", [MUTED]: "#E7EDF2" };
  return map[hex] || "#E7EDF2";
}

// ── D6. Building the business case (value flow) ───────────────────────────
function valueFlow() {
  const w = 1180, h = 300;
  const steps = [
    ["Current state", "cost & pain today", BLUE_MIST, BLUE],
    ["Value drivers", "what an outcome is worth", BLUE_MIST, BLUE],
    ["Solution mapping", "capability → value driver", BLUE_MIST, BLUE],
    ["Quantify", "ROI · TCO · payback", DEEP, WHITE],
    ["Baselines & KPIs", "what we'll measure", TEAL_MIST, TEAL],
    ["Success criteria", "the definition of done", TEAL_MIST, TEAL],
  ];
  const n = steps.length, m = 26, gap = 22, cw = (w - m * 2 - gap * (n - 1)) / n, cy = 150, ch = 120, cyTop = cy - ch / 2;
  let b = label(w / 2, 34, "How a Value Engineer builds the case — a repeatable value pipeline", { s: 15, c: INK, b: true });
  steps.forEach(([name, sub, fill, txt], i) => {
    const x = m + i * (cw + gap);
    const dark = fill === DEEP;
    b += rrect(x, cyTop, cw, ch, { fill, stroke: dark ? DEEP : txt, sw: 1.5, rx: 12 });
    b += wrapText(x + cw / 2, cyTop + 46, name, { s: 15, c: dark ? WHITE : INK, b: true, w: cw - 20 });
    b += wrapText(x + cw / 2, cyTop + 82, sub, { s: 11.5, c: dark ? "#CFE3F5" : MUTED, w: cw - 18 });
    if (i < n - 1) b += arrow(x + cw + 2, cy, x + cw + gap - 2, cy, { c: MUTED });
  });
  b += label(w / 2, h - 16, "The output — baselines, KPIs and success criteria — is exactly what the Value Realization Manager measures against.", { s: 12.5, c: MUTED });
  return svg(w, h, b);
}


const diagrams = {
  "d1-lifecycle": lifecycle(),
  "d2-ve-flow": veFlow(),
  "d3-handover": handover(),
  "d4-vrm-flow": vrmFlow(),
  "d5-roles": roles(),
  "d6-value-flow": valueFlow(),
};

(async () => {
  for (const [name, s] of Object.entries(diagrams)) {
    fs.writeFileSync(path.join(OUT, name + ".svg"), s);
    await sharp(Buffer.from(s)).png().toFile(path.join(OUT, name + ".png"));
    console.log("wrote", name + ".png");
  }
})();
