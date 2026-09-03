# Value Lifecycle Platform — Working Reference

A step-by-step runbook: run the app locally, fill in the capture workbooks after client meetings, and import them. Commands are ready to copy — run them from the **project root** in a terminal.

> **The three pieces.** (1) The **app** — your system of record. (2) The **capture workbooks** — Excel files you fill in during/after meetings (a VE Discovery, VR Intake, or CS Intake workbook). (3) The **importer** — a script that loads a workbook into the app.

---

## 1 · Prerequisites (one-time)

- **Node.js** 18+ and **npm**
- **PostgreSQL** running locally on port 5432

```bash
node --version
npm --version
psql -l | grep value_consultancy   # is the database there yet?
```

---

## 2 · First-time setup

```bash
# from the project root
npm install

# ensure .env has:
#   DATABASE_URL="postgresql://<user>@localhost:5432/value_consultancy?schema=public"
#   AUTH_SECRET="<any long random string>"

createdb value_consultancy        # skip if it already exists
npx prisma db push                # schema + Prisma client
npm run db:seed                   # config + demo data
```

---

## 3 · Running the app

```bash
npm run dev      # http://localhost:3200
```

Sign in with any demo account:

| Email | Role |
|---|---|
| `ve@demo.app` | Value Engineer |
| `vrm@demo.app` | Value Realization Manager |
| `cs@demo.app` | Customer Success Manager |
| `reviewer@demo.app` | Reviewer |
| `admin@demo.app` | Administrator |

All demo accounts share the `DEMO_PASSWORD` password (see §8). When it's set in `.env`, the demo workspace signs in **one-click** from the sign-in screen; otherwise pick a member and type the password. The member picker is off in production by default.

Stop with `Ctrl-C`. Keep the terminal open while using the app.

---

## 4 · Everyday database commands

| Command | Does |
|---|---|
| `npm run db:seed` | Re-seed config + reset demo studies/tracks/engagements (safe to re-run) |
| `npm run db:reset` | Drop, re-create and re-seed everything |
| `npx prisma studio` | Inspect the database in a browser |

---

## 5 · The capture workbooks

Meeting-capture Excel workbooks whose columns and dropdowns mirror the schema 1:1, so entry is transcription (or bulk import), not translation:

- **VE Discovery Workbook** — the Value Engineer's file (one per opportunity)
- **VR Intake Workbook** — the Value Realization Manager's file (per track)
- **CS Intake Workbook** — the Customer Success Manager's file (per account / engagement)

Each has a one-page **field guide** (see `ValueLifecycle-Field-Guides.md`) and a **Read me** tab.

**Three rules that matter for importing:**

1. **Delete the greyed example row** in each table — or add your rows *beneath* it.
2. **Keep each table's rows contiguous** — a blank row ends the table.
3. **Use the dropdowns** (solution profile, KPI, statuses, etc.) — the importer validates these.

---

## 6 · Importing a workbook

Postgres must be running (the dev server need not be).

**Preview first (writes nothing):**

```bash
npx tsx scripts/import-workbook.ts "<path-to-workbook.xlsx>" --dry-run
```

**Then import for real:**

```bash
npx tsx scripts/import-workbook.ts "<path-to-workbook.xlsx>" --owner ve@demo.app
```

| Flag | Does |
|---|---|
| `--dry-run` | Preview only — writes nothing |
| `--owner <email>` | Sets the owner (defaults to an org VE/VRM/CSM) |
| `--org <id>` | Target organization (default `org_demo`) |
| `--code <CODE>` | Force a code (else auto `VE-`/`VR-`/`CS-YYYY-NNN`) |

**What gets created** (auto-detected by the workbook's tabs):

- **VE Discovery** → a study with functions, alternatives (+ scores), recommendations, baseline & stakeholder notes, the business case with line items (ROI/payback/NPV/IRR recomputed), handover artifacts, risks, and the 8 phases.
- **VR Intake** → a realization track (standalone, or linked to a source study), the 7 phases, KPI targets + actuals, work packages, adoption activities, benefits, risks, lessons, and a QBR report.
- **CS Intake** → a Customer Success engagement, the 8 lifecycle stages, stakeholders, actions, a computed health score (overall + RAG), and renewal / growth / success plans — linking any existing studies & tracks you list by code (CS references their value, never duplicates it).

Each run creates a **new** study/track/engagement — always `--dry-run` first.

---

## 7 · Troubleshooting

| Symptom | Fix |
|---|---|
| **ERR_CONNECTION_REFUSED** at localhost:3200 | Dev server isn't running — `npm run dev`. |
| **Port 3200 already in use** | `lsof -ti :3200 \| xargs kill`, then `npm run dev`. |
| Signed out / login screen returns | The server restarted (clears the session) — sign in again. |
| Import **"Unknown field"** / Prisma error after a schema change | Run `npx prisma db push`, then restart the dev server. |
| Import **"Solution profile … unrecognised"** | Pick the profile from the dropdown and re-import. |
| A table imported **fewer rows than expected** | A blank row mid-table ends it, or the example row was left as your first data row. |

---

## 8 · Quick reference

| Item | Value |
|---|---|
| App URL | `http://localhost:3200` |
| Database | `value_consultancy` on `localhost:5432` |
| Demo password (all accounts) | from `DEMO_PASSWORD` env var (unset → a random one is printed at seed; set it in `.env` for one-click sign-in) |
| Start the app | `npm run dev` |
| Re-seed demo data | `npm run db:seed` |
| Import a workbook | `npx tsx scripts/import-workbook.ts "<file>.xlsx" --dry-run` |
| Free a stuck port 3200 | `lsof -ti :3200 \| xargs kill` |

---

*A companion to the demo kit's [User Guide](ValueLifecycle-User-Guide.md), [Process Guide](ValueLifecycle-Process-Guide.md) and [Field Guides](ValueLifecycle-Field-Guides.md).*
