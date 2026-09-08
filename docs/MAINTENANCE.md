# Maintenance & Engineering Notes

Operational reference for maintainers: how the database, migrations, demo-kit and
design system fit together, plus the non-obvious gotchas. Complements
[ARCHITECTURE.md](../ARCHITECTURE.md) (how the app is built) and
[DEPLOYMENT.md](../DEPLOYMENT.md) (how it's deployed).

---

## Database & migrations

- Postgres via Prisma. The datasource uses a **pooled** `DATABASE_URL` (serverless-safe
  runtime connection) and a **direct** `DIRECT_URL` (used by migrations). Locally, set
  both to the same value.
- Migrations live in `prisma/migrations/`. Create one locally with
  `npx prisma migrate dev --name <change>`; commit it. Deploys apply pending migrations
  automatically (see **Build & deploy**).
- **Adopting migrations on an existing database** needs a one-time baseline so the
  tables that already exist aren't recreated:
  ```bash
  npx prisma migrate resolve --applied <first-migration-name>
  ```
  A later `migrate resolve` re-run reporting `P3008 … already recorded as applied` is
  **benign**.
- Verify migrations reproduce the schema with **no drift**:
  ```bash
  npx prisma migrate diff --from-migrations prisma/migrations \
    --to-schema-datamodel prisma/schema.prisma --script
  # → "This is an empty migration." means no drift
  ```
- After adding a schema field **locally**, regenerate the client
  (`prisma migrate dev`, or `prisma db push` for a throwaway change) **and restart the
  dev server** — otherwise queries on the new field fail with `Unknown field`.
- **Rotating the database password** takes the app down until you update **both**
  `DATABASE_URL` and `DIRECT_URL` in the host's env and redeploy. Expect a brief outage;
  do it in a maintenance window.

## Build & deploy

- `build` = `prisma generate && next build` — **no database access**. Used by CI and
  locally, so the CI smoke build needs no DB.
- `vercel-build` = `prisma generate && prisma migrate deploy && next build` — used by the
  deploy host, so **pending migrations are applied on every deploy**. (The host prefers
  `vercel-build` over `build` when present.)
- **Never run `next build` (production) against a running `next dev`** — it shares/corrupts
  `.next`. Symptom: client components silently stop hydrating (SSR looks fine, buttons
  dead, no console error). Fix: stop dev, `rm -rf .next`, restart.
- Lint runs inside the production build. An `<a href>` pointing at an internal API route
  (e.g. a file-download endpoint) trips `@next/next/no-html-link-for-pages`; suppress it
  per-line — `<a>` is correct for a download, `next/link` is not.

## Solution profiles & KPIs — configuration, not code

- Domain config lives in `src/lib/domain/` (`industries.ts` = solution profiles,
  `kpis.ts` = KPI catalogue, `phases.ts` / `cs-stages.ts` = lifecycle phases,
  `templates.ts` = content templates). It is **seeded to the database** by
  `prisma/seed.ts`.
- Adding a profile / KPI / phase = edit the domain file and re-seed. The engine never
  changes per profile.
- Four solution profiles ship out of the box: **Workload Automation**,
  **Mainframe Optimization**, **Service & Operations**, and **Software Reseller**.
- Default currency is **USD** (`DEFAULT_CURRENCY` in `src/lib/finance.ts`); currency is
  selectable per study/track/engagement.

## Capture workbooks & import

- The importer (`src/lib/import/workbook-import.ts`, shared by the CLI and the in-app
  upload) maps workbook tabs/columns to the schema 1:1 — it's a mapping, not a transform.
  Type is auto-detected from the first tab: `1. Engagement` → VE, `1. Track` → VR,
  `1. Account` → CS.
- Blank templates are generated on demand: the **Templates** page and
  `/api/import/template/{VE|VR|CS}`.
- CLI: `npx tsx scripts/import-workbook.ts <file.xlsx> [--dry-run] [--code CODE] [--owner email]`
  — always `--dry-run` first.
- **Gotchas:**
  - A VR **baseline / KPI-tracker** row's `KPI key (auto)` must be a **catalogue key**
    (it's a foreign key to the seeded KPI catalogue); a custom slug throws.
  - The first data row under a table header is **skipped** if it's italic or matches the
    example row; a fully blank row **ends** a table.
- Filled, import-ready samples ship in the demo-kit
  (`demo-kit/ValueLifecycle-Sample-*`) — import the VE study first, then set the VR
  workbook's *Source study code* to the study's code to link them.

## Design system (tokens)

- Palette lives in `tailwind.config.ts` as token ramps: role families `ve` / `vr` / `cs`,
  neutral `ink`, an accent ramp, and `rail` / `railfg` for the sidebar. Components use only
  the token classes, so a palette swap is **config-only** — **except three
  token-independent spots that must be kept in sync**: the `globals.css` body radial-glow
  gradients, the print `.card` border colour, and the `FastDiagram.tsx` connector stroke.

## Regenerating the demo-kit

The `demo-kit/` documents are generated from Markdown sources plus build scripts. When you
change wording, regenerate the derived files and keep them consistent with what
`npm run db:seed` actually creates.

| Output | Regenerate with | Notes |
|---|---|---|
| Design diagrams (`diagrams/*.png/.svg`) | `node demo-kit/make-diagrams.js` | Regenerates all; only changed ones differ |
| Process-guide diagrams (`guide-diagrams/`) | `node demo-kit/make-process-diagrams.js` | |
| Demo Script & User Guide `.docx` | `node demo-kit/md2docx.js` | Rebuilds **both** from their `.md` — `git checkout` the one you didn't change |
| Design Document `.docx` | `node demo-kit/build-design-docx.js` | **Hardcoded in the script — NOT generated from its `.md`. Edit both.** Embeds the current diagram PNGs, so regenerate diagrams first |
| Any doc `.pdf` | `node demo-kit/md2pdf.js <BaseName>` | Needs `npm i marked@12 --no-save`; renders via headless Chrome |
| Solution-Overview deck (`.pptx`) | edit `build-deck.js`, then run it with `pptxgenjs` on `NODE_PATH` | `pptxgenjs` is intentionally **not** a dependency — install it ad-hoc |
| Solution-Overview deck (`.pdf`) | export the `.pptx` with PowerPoint | macOS: `osascript` open → *save as PDF* (see the deployment/export notes) |

> Keep demo-kit wording vendor-neutral and aligned with the seeded solution profiles and
> demo studies — a reader following the docs should find exactly what the seed creates.
