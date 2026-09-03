// Ad-hoc: render a demo-kit Markdown doc to a styled A4 PDF via headless Chrome.
// Usage: node demo-kit/md2pdf.js <name-without-ext> [more names...]
// Requires `marked` (install ad-hoc: npm i marked@12 --no-save) and Google Chrome.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { marked } = require("marked");

const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const dir = path.join(__dirname);

const CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.5 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
         color: #1f2937; margin: 0; }
  h1 { font-size: 22pt; color: #0f172a; border-bottom: 2px solid #2563eb;
       padding-bottom: 6px; margin: 0 0 14px; }
  h2 { font-size: 15pt; color: #1d4ed8; margin: 22px 0 8px; }
  h3 { font-size: 12.5pt; color: #0f172a; margin: 16px 0 6px; }
  p { margin: 8px 0; }
  a { color: #2563eb; text-decoration: none; }
  code { font: 10pt "SF Mono", Menlo, Consolas, monospace;
         background: #f1f5f9; padding: 1px 5px; border-radius: 4px; }
  pre { background: #0f172a; color: #e2e8f0; padding: 12px 14px;
        border-radius: 8px; overflow-x: auto; }
  pre code { background: none; color: inherit; padding: 0; }
  blockquote { margin: 10px 0; padding: 6px 14px; border-left: 3px solid #93c5fd;
               background: #eff6ff; color: #334155; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 10pt; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 9px; text-align: left;
           vertical-align: top; }
  th { background: #f1f5f9; color: #0f172a; }
  tr:nth-child(even) td { background: #f8fafc; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 18px 0; }
  ul, ol { margin: 8px 0 8px 22px; }
  li { margin: 3px 0; }
`;

for (const name of process.argv.slice(2)) {
  const mdPath = path.join(dir, `${name}.md`);
  const md = fs.readFileSync(mdPath, "utf8");
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <style>${CSS}</style></head><body>${marked.parse(md)}</body></html>`;
  const htmlPath = path.join(dir, `.${name}.tmp.html`);
  const pdfPath = path.join(dir, `${name}.pdf`);
  fs.writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`, `file://${htmlPath}`,
  ], { stdio: "ignore" });
  fs.unlinkSync(htmlPath);
  console.log("wrote", path.basename(pdfPath));
}
