// Markdown → .docx for the VE & VRM Process Guide (Blue Turtle branding, embedded diagrams).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, PageBreak,
} = require("docx");

const DIRP = __dirname;
const SRC = path.join(DIRP, "ValueLifecycle-Process-Guide.md");
const OUT = path.join(DIRP, "ValueLifecycle-Process-Guide.docx");

const CONTENT_W = 9360;      // DXA (Letter, 1" margins)
const IMG_W = 620;           // px display width for diagrams
const DEEP = "1E40AF", BLUE = "2563EB", TEAL = "059669", INK = "0F172A", GREY = "64748B";

function inlineRuns(text, base = {}) {
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
  const runs = []; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    if (m[2] !== undefined) runs.push(new TextRun({ text: m[2], bold: true, ...base }));
    else if (m[3] !== undefined) runs.push(new TextRun({ text: m[3], font: "Consolas", color: "B45309", ...base }));
    else if (m[4] !== undefined) runs.push(new TextRun({ text: m[4], italics: true, ...base }));
    else if (m[5] !== undefined) runs.push(new TextRun({ text: m[5], italics: true, ...base }));
    last = re.lastIndex;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...base }));
  return runs.length ? runs : [new TextRun({ text, ...base })];
}
function splitRow(line) { let s = line.trim(); if (s.startsWith("|")) s = s.slice(1); if (s.endsWith("|")) s = s.slice(0, -1); return s.split("|").map((c) => c.trim()); }
function buildTable(rows) {
  const header = splitRow(rows[0]); const body = rows.slice(2).map(splitRow);
  const nCols = header.length; const colW = Math.floor(CONTENT_W / nCols);
  const cell = (txt, h) => new TableCell({
    width: { size: colW, type: WidthType.DXA },
    shading: h ? { type: ShadingType.CLEAR, fill: "EAF4FC" } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children: [new Paragraph({ children: inlineRuns(txt, h ? { bold: true, color: DEEP } : {}) })],
  });
  return new Table({
    columnWidths: Array(nCols).fill(colW), width: { size: CONTENT_W, type: WidthType.DXA },
    rows: [new TableRow({ tableHeader: true, children: header.map((c) => cell(c, true)) }),
      ...body.map((r) => new TableRow({ children: header.map((_, i) => cell(r[i] ?? "", false)) }))],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "CFE0F0" }, bottom: { style: BorderStyle.SINGLE, size: 2, color: "CFE0F0" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "CFE0F0" }, right: { style: BorderStyle.SINGLE, size: 2, color: "CFE0F0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E7EEF6" }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "E7EEF6" },
    },
  });
}
function imagePara(file) {
  const p = path.join(DIRP, file);
  const meta = sharp(p); // metadata read synchronously below via cached buffer
  const buf = fs.readFileSync(p);
  return { buf };
}

(async () => {
  const md = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let seenTitle = false, seenSub = false;

  while (i < md.length) {
    const line = md[i], t = line.trim();

    // image  ![alt](path)
    const im = t.match(/^!\[[^\]]*\]\(([^)]+)\)$/);
    if (im) {
      const file = im[1];
      const p = path.join(DIRP, file);
      const meta = await sharp(p).metadata();
      const h = Math.round(IMG_W * meta.height / meta.width);
      out.push(new Paragraph({
        alignment: AlignmentType.CENTER, spacing: { before: 80, after: 160 },
        children: [new ImageRun({ type: "png", data: fs.readFileSync(p), transformation: { width: IMG_W, height: h } })],
      }));
      i++; continue;
    }
    if (t.startsWith("```")) { i++; while (i < md.length && !md[i].trim().startsWith("```")) { out.push(new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: md[i] || " ", font: "Consolas", size: 17, color: "374151" })] })); i++; } i++; out.push(new Paragraph({ spacing: { after: 120 }, children: [] })); continue; }
    if (t === "") { i++; continue; }
    if (/^-{3,}$/.test(t)) { out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CFE0F0", space: 1 } }, spacing: { after: 160, before: 40 }, children: [] })); i++; continue; }

    const hm = t.match(/^(#{1,4})\s+(.*)$/);
    if (hm) {
      const lvl = hm[1].length, txt = hm[2];
      if (lvl === 1 && !seenTitle) { seenTitle = true; i++; continue; }   // cover title (skip; on cover)
      if (lvl === 2 && seenTitle && !seenSub) { seenSub = true; i++; continue; } // cover subtitle (skip)
      const map = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4 };
      const color = lvl === 1 ? DEEP : lvl === 2 ? BLUE : TEAL;
      out.push(new Paragraph({ heading: map[lvl], spacing: { before: lvl <= 2 ? 300 : 200, after: 100 }, children: inlineRuns(txt, { color }) }));
      i++; continue;
    }
    if (t.startsWith(">")) { out.push(new Paragraph({ indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 18, color: BLUE, space: 8 } }, shading: { type: ShadingType.CLEAR, fill: "EAF4FC" }, spacing: { after: 140, before: 60 }, children: inlineRuns(t.replace(/^>\s?/, ""), { italics: true, color: GREY }) })); i++; continue; }
    if (t.startsWith("|")) { const rows = []; while (i < md.length && md[i].trim().startsWith("|")) { rows.push(md[i]); i++; } if (rows.length >= 2) out.push(buildTable(rows)); out.push(new Paragraph({ spacing: { after: 120 }, children: [] })); continue; }
    const ul = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (ul) { out.push(new Paragraph({ bullet: { level: Math.min(2, Math.floor(ul[1].length / 2)) }, spacing: { after: 60 }, children: inlineRuns(ul[2]) })); i++; continue; }
    const ol = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (ol) { out.push(new Paragraph({ indent: { left: 480, hanging: 360 }, spacing: { after: 60 }, children: [new TextRun({ text: `${ol[2]}.\t`, bold: true, color: BLUE }), ...inlineRuns(ol[3])] })); i++; continue; }
    out.push(new Paragraph({ spacing: { after: 120, line: 268 }, children: inlineRuns(t) }));
    i++;
  }

  // Cover
  const cover = [
    new Paragraph({ spacing: { before: 1700, after: 60 }, children: [new TextRun({ text: "VALUE LIFECYCLE PLATFORM · PROCESS GUIDE", bold: true, color: BLUE, size: 20, characterSpacing: 30 })] }),
    new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 80 }, children: [new TextRun({ text: "Value Engineering & Value Realization", color: INK })] }),
    new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "The end-to-end process — from a first conversation to proven, renewed value.", color: GREY, size: 26 })] }),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "2563EB", space: 2 } }, children: [] }),
    new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Value Lifecycle Platform — MIT © 2026 Paulo Jorge", color: GREY, size: 18 })] }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  const doc = new Document({
    creator: "Value Lifecycle Platform",
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: INK } } } },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: [...cover, ...out] }],
  });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buf);
  console.log("wrote", OUT, "(" + out.length + " blocks)");
})().catch((e) => { console.error(e); process.exit(1); });
