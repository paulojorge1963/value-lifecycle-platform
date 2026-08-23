# Value Lifecycle Platform

[![CI](https://github.com/paulojorge1963/value-lifecycle-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/paulojorge1963/value-lifecycle-platform/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232a?logo=react&logoColor=61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169E1?logo=postgresql&logoColor=white)
![Auth.js](https://img.shields.io/badge/Auth.js-v5-000000?logo=auth0&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-22c55e)

An end-to-end web app for two complementary roles across the full value lifecycle:

- **Value Engineer (VE)** — runs structured value studies (8-phase VE Job Plan), analyses functions/cost/performance, generates alternatives, and builds a quantified business case.
- **Value Realization Manager (VRM)** — implements approved recommendations (7-phase realization lifecycle), drives adoption, measures outcomes, and proves realized value against the business case.

The **VE → VR handover is first-class**: every realization track links back to its source study, business case, baselines, KPIs and success criteria.

Supports three configurable industry profiles out of the box — **Construction & Infrastructure**, **Manufacturing & Product Development**, and **Enterprise Software / SaaS** — with industry as *configuration, not code*.

📘 **New here?** Read the [**User Guide**](USER_GUIDE.md) — how to run a value study end-to-end, from a fresh problem through the handover to proven realized value.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full design, data model and user flows.

🧭 **Proposed:** [`docs/CS-MODULE-DESIGN.md`](docs/CS-MODULE-DESIGN.md) — a draft design for a Customer Success pillar (continuous 8-stage lifecycle) alongside VE and VR. Not yet built.

## Stack

Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL · Tailwind CSS · docx / exceljs exports.

## Prerequisites

- Node 18+ and PostgreSQL running locally.

## Setup

```bash
# 1. Install
npm install

# 2. Configure the database URL
cp .env.example .env
#   edit .env → DATABASE_URL="postgresql://<user>@localhost:5432/value_consultancy?schema=public"

# 3. Create the database
createdb value_consultancy

# 4. Create the schema + generate the client
npx prisma db push

# 5. Seed config (industries, phases, KPIs, templates) + demo data
npm run db:seed

# 6. Run
npm run dev   # http://localhost:3200
```

## What's seeded

- **Config**: 3 industry profiles, 8 VE + 7 VR phase-guidance templates, ~20 KPI definitions with formulas, VE/VR content templates.
- **Demo org** *Meridian Value Advisory* with 5 users (one per role).
- **Study VE-2026-014** (construction) — fully handed over to a live realization track **VR-2026-014** with work packages, benefits, KPI actuals and a QBR.
- **Study VE-2026-021** (SaaS) — in review, with a business case, ready to hand over.

**Sign in** at `/login` (unauthenticated requests are redirected there by middleware). Use the demo quick-login buttons to sign in as Value Engineer, Value Realization Manager, Reviewer or Stakeholder — navigation and permissions adapt. Demo password: `demo1234`.

**Create your own workspace** at `/register` — each sign-up creates a new, isolated organization with the signer as **Admin**. Admins get a **Team** page (`/settings/team`) to add members, assign roles, reset passwords, and remove access. No email server needed (admins set an initial password to share).

## Key scripts

| Script | Action |
|---|---|
| `npm run dev` | Dev server on :3200 |
| `npm run db:seed` | Seed config + demo data (idempotent for config; resets demo studies/tracks) |
| `npm run db:reset` | Drop, re-migrate and re-seed |
| `npx prisma studio` | Browse the database |
| `npx tsx scripts/import-workbook.ts <file.xlsx>` | Import a capture workbook as a study/track (see below) |

## Importing capture workbooks

Meeting-capture Excel workbooks (a **VE Discovery Workbook**, **VR Intake Workbook** or **CS Intake Workbook**, whose columns/dropdowns mirror the schema) can be loaded straight into the app:

```bash
npx tsx scripts/import-workbook.ts <file.xlsx> [--owner <email>] [--org <id>] [--code <CODE>] [--dry-run]
```

- Auto-detects VE / VR / CS by the workbook's tabs, and creates the study/track/engagement **plus all children** — VE: functions, alternatives + scores, recommendations, business case & line items with recomputed ROI/payback/NPV/IRR, handover artifacts; VR: KPIs, work packages, benefits, risks; CS: 8 lifecycle stages, stakeholders, actions, a computed health score, renewal/growth/success plans, and links to existing studies/tracks — in one transaction.
- `--dry-run` prints the full plan and writes nothing. `--owner` sets the owner (defaults to an org VE/VRM). A study/track code is auto-assigned unless `--code` is given.
- Prepare the file first: **delete the greyed example row** in each table (or add rows beneath it) and keep each table's rows **contiguous** (a blank row ends a table). Each run creates a **new** study/track.

## API (selected)

- `GET/POST /api/studies` · `GET /api/studies/:id`
- `GET/POST /api/tracks` — POST creates a track by handing over a study (the VE→VR bridge)
- `GET /api/kpis`
- `GET /api/export/business-case/:studyId` → Word · `GET /api/export/vrp/:trackId` → Word · `GET /api/export/kpis` → Excel

## Production notes

- **Auth**: Auth.js (NextAuth v5) with a Credentials provider (JWT sessions). Config is split for the edge: `src/lib/auth.config.ts` (edge-safe, used by `src/middleware.ts` for route protection) and `src/lib/auth.ts` (adds the Credentials provider using Prisma + bcrypt). `getCurrentUser()`/`can()` in `src/lib/session.ts` resolve role and enforce RBAC. Requires `AUTH_SECRET` in `.env` (generate with `openssl rand -base64 32`). To add OAuth/email providers, extend the `providers` array in `src/lib/auth.ts`.
- **AI starter-text**: recommendation drafting and creative-alternative brainstorming call Claude (`@anthropic-ai/sdk`, model `claude-opus-5`, structured outputs) via `src/lib/ai.ts`. It's gated on `ANTHROPIC_API_KEY` — set it in `.env` to enable AI drafting; when unset, the buttons fall back to template starter text seeded from the industry profile, so the feature works with no external dependency. Buttons label themselves "…with AI" vs "…(template)" accordingly.
- **Migrations**: `prisma db push` is used for the first pass; switch to `prisma migrate` for versioned migrations before production.

## License

[MIT](LICENSE) © 2026 Paulo Jorge
