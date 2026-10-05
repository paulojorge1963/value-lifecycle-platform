// Blue Turtle branded Word-document shell, reproducing the "Document Template.docx"
// look (turtle cover banner, wordmark running header, "Blue Turtle Confidential"
// footer, brand fonts & heading colours) for every .docx the app exports.
import {
  Document, Paragraph, TextRun, ImageRun, AlignmentType, HeadingLevel,
  Header, Footer, PageNumber, BorderStyle, TabStopType, type ISectionOptions, type FileChild,
} from "docx";
import { BANNER_PNG, BANNER_WH, WORDMARK_PNG, WORDMARK_WH } from "./doc-assets";

// Blue Turtle palette (matches the decks / CVR).
const BLUE = "0053B4", INK = "15303F", MUTED = "5E7789", LINE = "DBE7F0";
const FONT = "Calibri";

// Content width for US-Letter with 1" margins ≈ 6.5in → 624px @96dpi.
const CONTENT_W = 624;
const bannerH = Math.round((CONTENT_W * BANNER_WH.h) / BANNER_WH.w);
const WORDMARK_W = 150;
const wordmarkH = Math.round((WORDMARK_W * WORDMARK_WH.h) / WORDMARK_WH.w);

const img = (data: Buffer, width: number, height: number) =>
  new ImageRun({ type: "png", data, transformation: { width, height } });

/** Running header for pages 2+: small wordmark, right-aligned, with a bottom rule. */
function runningHeader(): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 4 } },
        children: [img(WORDMARK_PNG, WORDMARK_W, wordmarkH)],
      }),
    ],
  });
}

/** "Blue Turtle Confidential 2026"  ·····  Page N — on every page. */
function confidentialFooter(): Footer {
  return new Footer({
    children: [
      new Paragraph({
        spacing: { before: 40 },
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 4 } },
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W * 15 }], // ≈ content width in twips
        children: [
          new TextRun({ text: "Blue Turtle Confidential 2026", font: FONT, size: 16, color: MUTED }),
          new TextRun({ text: "\tPage ", font: FONT, size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: MUTED }),
        ],
      }),
    ],
  });
}

export interface BrandedDocOpts {
  docTitle: string;        // e.g. "Value Engineering — Business Case"
  code: string;            // e.g. "VE-2026-014"
  subtitle?: string;       // e.g. the study / track / account title
  metaLine?: string;       // e.g. "Solution: … | Owner: … | Status: …"
  body: FileChild[];       // the document content (headings, paragraphs, tables)
}

/** Build a Blue Turtle–branded Document: turtle cover banner + title block, then body. */
export function brandedDoc(opts: BrandedDocOpts): Document {
  const cover: FileChild[] = [
    new Paragraph({ spacing: { after: 160 }, children: [img(BANNER_PNG, CONTENT_W, bannerH)] }),
    new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 40 }, children: [new TextRun(opts.docTitle)] }),
    new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: `${opts.code}${opts.subtitle ? "  ·  " + opts.subtitle : ""}`, bold: true, size: 26, color: INK, font: FONT })] }),
    ...(opts.metaLine ? [new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: opts.metaLine, color: MUTED, size: 20, font: FONT })] })] : []),
  ];

  const section: ISectionOptions = {
    properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } }, titlePage: true },
    headers: { first: new Header({ children: [new Paragraph({})] }), default: runningHeader() },
    footers: { first: confidentialFooter(), default: confidentialFooter() },
    children: [...cover, ...opts.body],
  };

  return new Document({
    creator: "Blue Turtle Technologies",
    styles: {
      default: {
        document: { run: { font: FONT, size: 21, color: INK } },
        title: { run: { font: FONT, size: 50, bold: true, color: BLUE }, paragraph: { spacing: { after: 60 } } },
        heading2: { run: { font: FONT, size: 26, bold: true, color: BLUE }, paragraph: { spacing: { before: 260, after: 90 } } },
      },
    },
    sections: [section],
  });
}
