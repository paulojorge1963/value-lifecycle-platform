# Value Lifecycle Platform — Demo Kit

Deliverables for demoing and explaining the **Value Lifecycle Platform** — one workspace that runs both the **Value Engineer** (8-phase VE Job Plan) and the **Value Realization Manager** (7-phase realization lifecycle), with a first-class handover between them.

| File | What it is | Use it to… |
|---|---|---|
| **ValueLifecycle-Demo-Script.docx** | A timed, click-by-click live demo script with a talk-track and objection handling | Run a ~22 min live demo (there's a 12-min cut too) |
| **ValueLifecycle-User-Guide.docx** | A how-to guide covering the whole workflow and every module | Onboard a new user / hand to a customer |
| **ValueLifecycle-Solution-Overview.pptx** | A 14-slide PowerPoint explaining the solution | Present to leadership / include in a proposal |
| **ValueLifecycle-Design-Document.docx** | A design document with the workflow & architecture as diagrams (images baked in) | Explain the design; share on OneDrive where images must render |

Each document is also provided as **Markdown source** (`*.md`) — the editable originals — and the demo script, user guide and design document each ship as a **PDF** for quick sharing. The solution overview ships as both **.pptx** (editable) and **.pdf**.

The design document's `.docx` and `.pdf` have the five diagrams embedded as images (so they render anywhere, including OneDrive/Word). The `.md` version references the same images from `diagrams/` and renders in GitHub, VS Code and Obsidian.

The `diagrams/` subfolder holds the source diagram images (`.svg` + `.png`). The `*.js` files are the generators for the deck, the Word docs, and the diagrams — keep them to tweak/regenerate, or delete.

## What's in the kit

```
demo-kit/
├─ ValueLifecycle-Demo-Script.md / .docx / .pdf     ← live demo walkthrough
├─ ValueLifecycle-User-Guide.md / .docx / .pdf      ← everyday how-to
├─ ValueLifecycle-Design-Document.md / .docx        ← design + diagrams
├─ ValueLifecycle-Solution-Overview.pptx / .pdf     ← leadership deck
├─ diagrams/                                        ← 5 diagrams (.svg + .png)
├─ make-diagrams.js · md2docx.js ·
│  build-design-docx.js · build-deck.js             ← regenerators
└─ README.md
```

## The five diagrams

1. **Value lifecycle** — the 8-phase VE Job Plan → handover → 7-phase realization lifecycle.
2. **Industry as configuration** — the core engine plus three industry profiles.
3. **Data to documents** — study/realization data → finance & export engine → Word/Excel.
4. **Architecture** — Next.js UI → server actions/API → Prisma → PostgreSQL, with Auth.js and the optional Anthropic seam.
5. **The handover** — the marquee flow: accepted recommendations become a seeded realization track.

## Regenerating (optional)

Run these with `node` from the **project root** (they use the project's `docx` / `sharp`):

```bash
node demo-kit/make-diagrams.js        # rebuild diagrams/*.svg + *.png
node demo-kit/md2docx.js              # rebuild Demo-Script.docx + User-Guide.docx from the .md
node demo-kit/build-design-docx.js    # rebuild Design-Document.docx (embeds the PNGs)

npm i -D pptxgenjs                     # deck only: install the generator ad-hoc, then:
node demo-kit/build-deck.js           # rebuild Solution-Overview.pptx
npm uninstall pptxgenjs                # and remove it again when done
```

PDFs were produced by printing the styled Markdown to PDF with headless Chrome (the three documents) and by exporting the `.pptx` to PDF (the deck). Regenerate a document PDF after editing its `.md`; regenerate the deck PDF after editing `build-deck.js` and rebuilding the `.pptx`.

> `pptxgenjs` is **not** a committed dependency — it pulls a vulnerable transitive `image-size` (a dev-only image-parsing DoS, irrelevant to generating a deck). Install it ad-hoc only when regenerating the deck, as shown above, so it stays out of the shipped dependency tree.

## Notes

- All deliverables were validated to open cleanly and were spot-checked as rendered pages. Give them a quick look in Word / PowerPoint on your fonts before presenting — the Word docs use the platform's **VE-blue** accent for headings; the deck uses the full **VE-blue / VR-emerald** brand.
- Demo logins (password `demo1234`): `ve@demo.app`, `reviewer@demo.app`, `vrm@demo.app`, `admin@demo.app`. Hero example: study `VE-2026-014` → track `VR-2026-014`.
- See the repo root for [`README.md`](../README.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md) and [`USER_GUIDE.md`](../USER_GUIDE.md).
