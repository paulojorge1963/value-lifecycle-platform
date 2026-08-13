// Minimal, purpose-built Markdown → .docx converter for the demo-kit docs.
// Handles: #/##/### headings, tables, - bullets, N. ordered items, > quotes,
// ``` code fences, --- rules, and inline **bold** *italic* `code`.
// Value Lifecycle Platform — VE blue accent.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} = require("docx");

const CONTENT_W = 9360; // Letter, 1" margins
const BLUE = "2563EB";
const INK = "0F172A";
const GREY = "64748B";

function inlineRuns(text, base = {}) {
  const re = /(\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;
  const runs = [];
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    if (m[2] !== undefined) runs.push(new TextRun({ text: m[2], bold: true, ...base }));
    else if (m[3] !== undefined) runs.push(new TextRun({ text: m[3], font: "Consolas", color: "B91C1C", ...base }));
    else if (m[4] !== undefined) runs.push(new TextRun({ text: m[4], italics: true, ...base }));
    else if (m[5] !== undefined) runs.push(new TextRun({ text: m[5], italics: true, ...base }));
    last = re.lastIndex;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), ...base }));
  return runs.length ? runs : [new TextRun({ text, ...base })];
}

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function buildTable(rows) {
  const header = splitRow(rows[0]);
  const bodyRows = rows.slice(2).map(splitRow); // skip the |---| separator
  const nCols = header.length;
  const colW = Math.floor(CONTENT_W / nCols);
  const colWidths = Array(nCols).fill(colW);

  const mkCell = (txt, isHeader) =>
    new TableCell({
      width: { size: colW, type: WidthType.DXA },
      shading: isHeader ? { type: ShadingType.CLEAR, fill: "EFF6FF" } : undefined,
      margins: { top: 60, bottom: 60, left: 110, right: 110 },
      children: [
        new Paragraph({
          children: inlineRuns(txt, isHeader ? { bold: true, color: BLUE } : {}),
        }),
      ],
    });

  const tableRows = [
    new TableRow({ tableHeader: true, children: header.map((c) => mkCell(c, true)) }),
    ...bodyRows.map((r) => new TableRow({ children: header.map((_, i) => mkCell(r[i] ?? "", false)) })),
  ];

  return new Table({
    columnWidths: colWidths,
    width: { size: CONTENT_W, type: WidthType.DXA },
    rows: tableRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "DBE3F0" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "DBE3F0" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "DBE3F0" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "DBE3F0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "EEF2F8" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "EEF2F8" },
    },
  });
}

function convert(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    // code fence
    if (t.startsWith("```")) {
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        out.push(new Paragraph({
          spacing: { after: 0, line: 240 },
          children: [new TextRun({ text: lines[i] || " ", font: "Consolas", size: 17, color: "374151" })],
        }));
        i++;
      }
      i++; // closing fence
      out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }

    if (t === "") { i++; continue; }

    // horizontal rule
    if (/^-{3,}$/.test(t) || /^\*{3,}$/.test(t)) {
      out.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "DBE3F0", space: 1 } },
        spacing: { after: 160, before: 40 },
        children: [],
      }));
      i++; continue;
    }

    // headings
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const map = { 1: HeadingLevel.TITLE, 2: HeadingLevel.HEADING_1, 3: HeadingLevel.HEADING_2, 4: HeadingLevel.HEADING_3 };
      out.push(new Paragraph({
        heading: map[lvl],
        spacing: { before: lvl <= 2 ? 260 : 180, after: 100 },
        children: inlineRuns(h[2], { color: lvl <= 2 ? BLUE : INK }),
      }));
      i++; continue;
    }

    // blockquote
    if (t.startsWith(">")) {
      const quote = t.replace(/^>\s?/, "");
      out.push(new Paragraph({
        indent: { left: 360 },
        border: { left: { style: BorderStyle.SINGLE, size: 18, color: BLUE, space: 8 } },
        spacing: { after: 120, before: 40 },
        children: inlineRuns(quote, { italics: true, color: GREY }),
      }));
      i++; continue;
    }

    // table (a run of lines starting with |)
    if (t.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(lines[i]); i++; }
      if (rows.length >= 2) out.push(buildTable(rows));
      out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      continue;
    }

    // unordered list item
    const ul = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (ul) {
      const level = Math.min(2, Math.floor(ul[1].length / 2));
      out.push(new Paragraph({
        bullet: { level },
        spacing: { after: 60 },
        children: inlineRuns(ul[2]),
      }));
      i++; continue;
    }

    // ordered list item — keep the source number as a hanging prefix
    const ol = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
    if (ol) {
      out.push(new Paragraph({
        indent: { left: 480, hanging: 360 },
        spacing: { after: 60 },
        children: [new TextRun({ text: `${ol[2]}.\t`, bold: true, color: BLUE }), ...inlineRuns(ol[3])],
      }));
      i++; continue;
    }

    // paragraph
    out.push(new Paragraph({ spacing: { after: 120, line: 264 }, children: inlineRuns(t) }));
    i++;
  }
  return out;
}

function build(inPath, outPath) {
  const md = fs.readFileSync(inPath, "utf8");
  const doc = new Document({
    creator: "Value Lifecycle Platform",
    styles: {
      default: { document: { run: { font: "Calibri", size: 22, color: INK } } },
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      children: convert(md),
    }],
  });
  return Packer.toBuffer(doc).then((buf) => fs.writeFileSync(outPath, buf));
}

const base = "demo-kit";
Promise.all([
  build(`${base}/ValueLifecycle-Demo-Script.md`, `${base}/ValueLifecycle-Demo-Script.docx`),
  build(`${base}/ValueLifecycle-User-Guide.md`, `${base}/ValueLifecycle-User-Guide.docx`),
]).then(() => console.log("wrote both .docx")).catch((e) => { console.error(e); process.exit(1); });
