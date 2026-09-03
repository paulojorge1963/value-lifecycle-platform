# Value Lifecycle Platform — Live Demo Script

A timed, click-by-click script for a **20–25 minute** live demo. It tells one story: a value engineer frames a problem and builds a business case, a reviewer approves it, and — in one click — it becomes an owned, measured realization track that proves the money was saved.

> **Before you start.** Have the app running (`npm run dev` → http://localhost:3200) with demo data seeded (`npm run db:seed`). Sign-in is at `/login`; every demo account uses the shared password from the `DEMO_PASSWORD` env var (set it in `.env` before seeding to enable one-click sign-in). Keep this script on a second screen. Timings are a guide, not a metronome.

**The through-line to keep repeating:** *"One workspace carries a piece of work through its whole value lifecycle — and the handover between the two roles is the point of the tool."*

---

## 0 · Setup checklist (before the room)

| Item | Value |
|---|---|
| URL | `http://localhost:3200` |
| Value Engineer login | `ve@demo.app` |
| Reviewer login | `reviewer@demo.app` |
| Realization Manager login | `vrm@demo.app` |
| Customer Success login | `cs@demo.app` |
| Admin login | `admin@demo.app` |
| Hero study (construction, handed over) | `VE-2026-014` → track `VR-2026-014` |
| Ready-to-hand-over study (SaaS) | `VE-2026-021` |

Open with `VE-2026-014` already loaded in a background tab so you can jump to a "finished" example if you run short on time.

---

## 1 · The problem & the promise (2 min · talk, no clicks)

> "Organisations spend a fortune identifying savings — value engineering studies, business cases, board approvals — and then **can't prove the money ever showed up.** The study lives in one team's slide deck; the realization lives in someone else's spreadsheet; the link between them is an email thread.
>
> This platform closes that loop. It runs **two roles in one system** — the **Value Engineer** who finds and quantifies the value, and the **Value Realization Manager** who implements it and proves it. The handover between them is first-class: nothing is re-keyed, and every rand of realized value traces straight back to the business case it came from."

Land the shape of it: **8-phase VE Job Plan → handover → 7-phase realization lifecycle.** Then start clicking.

---

## 2 · Orientation: the portfolio (2 min)

1. Sign in as **`ve@demo.app`**. You land on the **Portfolio**.
2. Point at the **stat tiles** — active studies, active tracks, **planned value** (from VE) vs **realized value** (from VR).

> "This is the leadership view. Planned value on the left comes from the engineers' business cases; realized value on the right comes from the realization managers' actuals. One number the board actually cares about: *are we getting what we approved?*"

3. Point at the **by-industry** breakdown and the two tables — **VE studies** and **VR tracks**.

> "Same platform, three industries out of the box — construction, manufacturing, SaaS — because industry here is *configuration, not code.*"

---

## 3 · A value study, end to end (7 min) — the core of the demo

Open study **`VE-2026-021`** (the SaaS study) from the VE workspace, or create a fresh one to show the wizard — your call on time.

### The phase stepper
1. Point at the **8-phase stepper** across the top: Orientation → Information → Function Analysis → Creative → Evaluation → Development → Presentation → Handover.
2. Click a phase to open its **guidance panel** — purpose, key questions, tasks, **exit criteria**.

> "Every phase teaches. The exit-criteria checklist is a quality gate — you don't advance until the work is genuinely done. A first-time value engineer is never left guessing what 'good' looks like."

### Function analysis + FAST
3. Scroll to the **function model**. Show a couple of functions as **verb + noun** with **cost** and **worth**, and the **value index** that turns amber when a function costs far more than it's worth.

> "This is the heart of value engineering — find the functions where you're overspending relative to worth. Amber is where the savings hide."

4. Show the **FAST diagram** — the how/why logic tree built from the functions' "supports" links.

### Alternatives → evaluation
5. Open **Creative alternatives**. Show a few ideas linked to a function, and the **✨ Brainstorm** button.

> "Type your own, or generate a spread instantly. With an Anthropic key it drafts with Claude; without one it seeds ideas from the industry profile's value levers — so it always works, no external dependency."

6. Open the **Evaluation matrix**. Show **criteria + weights**, score an alternative **1–5**, and watch the **weighted score and rank update live**. Nudge a weight and show everything re-rank.

### Business case
7. **Promote** a shortlisted idea to a recommendation ("Promote to recommendation →"), then open the **Business case**.
8. Add or edit a **cost/benefit line item** and show **ROI, payback, NPV and IRR recompute live**. Point at the currency selector (**ZAR by default**).
9. Click **Save version** — note the snapshot in **version history**.
10. Click **Export to Word**.

> "That's a formatted, board-ready business case generated from the live data — never a blank template."

---

## 4 · The governance gate (2 min)

1. Sign out; sign in as **`reviewer@demo.app`**.
2. Open the same study. Show that the reviewer sees **Accept / Reject** on each recommendation but **cannot edit** the study.

> "Real separation of duties, enforced on the server — not just hidden in the UI. The person who *builds* the case is not the person who *approves* it. Only an **accepted** recommendation can be handed over."

3. **Accept** a recommendation.

---

## 5 · The handover — the marquee moment (3 min)

1. Sign in as **`ve@demo.app`** (or stay as a role that can hand over). Open the study with the accepted recommendation.
2. Click **"Create Value Realization Track →"**.

> "Watch what one click does."

3. Open the new track and narrate what was **pre-populated from the study**:
   - **Work packages** — from the accepted recommendations
   - **Benefits** — from the expected-benefit artifacts
   - **KPI targets** — from the KPI artifacts, with their baselines
   - **Success criteria and baselines** — carried across
4. Point at **"Source study VE-…"** at the top of the track and click it to jump straight back.

> "Nothing was re-keyed. The study is now marked *handed over*, an audit event is written, and both sides show each other's status. **This link is the whole product** — approved value became owned, measurable work in one action."

---

## 6 · Proving the value (3 min)

Switch to the hero track **`VR-2026-014`** (already realized) as **`vrm@demo.app`**.

1. Point at the **value tiles** — planned / realized / variance / on-time.
2. Walk the **7-phase realization stepper**: Intake → Baseline → Implementation → Adoption → Execution → Value tracking → Close-out.
3. Show **work packages** with owners and status, and the **adoption plan**.
4. Open the **KPI tracker** — record or show a **KPI actual** against baseline and target.
5. Open **benefits realization** — edit a **realized value** and show it roll up to the track total.
6. Click **Export VRP / QBR** to Word.

> "This is the proof. Realized value is measured against the baselines the engineer set — so the QBR isn't a story, it's a reconciliation. And it rolls straight back up to the portfolio number we opened on."

7. Return to the **Portfolio** and point again at planned-vs-realized.

> "Full circle: the value we approved, and the value we can prove."

---

## 6b · The other way in — standalone realization *(1–2 min · optional)*

Not every realization starts with a study. When the customer **already runs the software** — an existing deployment you simply need to protect and prove value from — you start a realization track **directly**, with no VE study behind it.

1. Go to the **Value Realization** workspace and click **+ New realization track**.
2. Give it a **title**, pick the **solution profile**, and (optionally) add **objectives, success criteria and a planned value**. Click **Create track**.
3. You land on a fresh track marked **"standalone (existing software)"** — no source study, and *nothing pre-seeded*. It runs the **same 7-phase lifecycle**; you set the **baselines in Phase 2** from the live deployment instead of inheriting them from a study.

> "Same proof, different starting point. When there's no case to engineer — the customer already owns it — you skip VE and the handover and go straight to realizing value. This is the motion for **renewal assurance and adoption rescues on the installed base**: run the lifecycle, set honest baselines from what's live today, and prove the value against them."

Contrast it with the handover track from section 5: one was *born from a study*, the other *started standalone* — and the workspace labels each so you always know which is which.

---

## 6c · Customer Success — the continuing relationship *(2 min · optional)*

Realization proves *one* initiative and closes out; **Customer Success** keeps the whole account healthy through renewal and expansion. Switch to **Customer Success** as `cs@demo.app`.

1. On the **Customer Success workspace**, point at the two engagements and their **attention badges** (health, renewal countdown, at-risk).
2. Open **Retail Bank** — walk the **8-stage lifecycle** stepper, then the **value tiles surfaced from the linked VR track** (the key line): *"the value lives on the track; Customer Success references it, it never re-enters it."*
3. Show the **Health Scorecard** (five weighted factors → a RAG band), the **Stakeholder Map**, and the **Action Log**.
4. Click **Generate EBR** — an executive narrative (AI, or a template fallback) is drafted from the account's data, and its next-best-actions drop straight into the Action Log. Then **Export account review**.
5. Back on the **Portfolio**, point at the **Customer Success lens** — health distribution, upcoming renewals, and the needs-attention list.

> "Sell it, prove it, keep it. The handover turns approved value into proven value; Customer Success turns proven value into a renewed, growing relationship — one workspace, each layer referencing the one beneath it."

---

## 7 · Multi-tenant & roles (1–2 min · optional)

If your audience cares about running this as a product or across teams:

1. Sign in as **`admin@demo.app`** → **Team** in the nav.
2. Show **add member / change role / reset password**, and mention **owner reassignment on removal** (work is reassigned, never orphaned).
3. Mention **self-service registration** at `/register` — each sign-up is a **new, isolated workspace**.

> "Each workspace's studies and tracks are private to it. Roles — Value Engineer, Realization Manager, Reviewer, Viewer, Admin — map to exactly the permissions you'd expect."

---

## 8 · Close (1 min)

> "One workspace, the whole value lifecycle. The engineer finds and quantifies the value; a reviewer approves it; the manager implements it and proves it — and the handover between them means nothing gets lost. So when the board asks *'did we actually get the savings we signed off?'* — you can answer with a number that traces all the way back to the study.
>
> Where in your organisation is that link — between approved value and proven value — weakest today?"

Leave the **Portfolio** on screen for the discussion.

---

## Objection handling

| If they say… | Respond with… |
|---|---|
| "We already have a PM / PPM tool." | "Those track *tasks and schedules.* This tracks *value* — the function analysis, the business case, and the realized-vs-planned reconciliation a PM tool doesn't model. It complements delivery tooling; it doesn't replace it." |
| "The customer already owns the software — there's no new deal to engineer." | "Then start a **standalone realization track**: skip VE and the handover, and run the same 7-phase lifecycle to protect and prove value on what they already run — ideal for **renewals and adoption rescues** (section 6b)." |
| "How is this different from our CRM / Customer Success tool?" | "It doesn't replace the CRM — it's the value spine underneath it. The Customer Success engagement here **references the actual VE studies and VR tracks**, so health, renewal and expansion conversations are grounded in proven value, not just activity metrics (section 6c)." |
| "Do we have to use the AI?" | "No. Every AI touch is a starter-text convenience with a template fallback — the whole platform works with AI switched off, and AI never saves anything on its own." |
| "Our industry isn't one of the three." | "Industry is configuration. A new profile — study types, cost drivers, value levers, default KPIs — is a data file plus a re-seed. The engine doesn't change." |
| "How do we know the realized numbers are honest?" | "They're measured against the baselines captured at handover, and every change is versioned and audit-logged. Soft baselines flatter the numbers — so the tool makes the baseline explicit and traceable." |
| "Can reviewers edit studies?" | "No — separation of duties is enforced on the server. A reviewer can accept or reject, not edit. Only accepted recommendations can be handed over." |
| "What about data isolation between teams?" | "Every workspace is a separate tenant; studies and tracks are scoped to the organisation. A new sign-up starts empty and sees nothing from anyone else." |

---

## Timing cheat-sheet

| Section | Minutes | Running |
|---|---|---|
| 1 · Problem & promise | 2 | 2 |
| 2 · Portfolio | 2 | 4 |
| 3 · Value study end to end | 7 | 11 |
| 4 · Governance gate | 2 | 13 |
| 5 · Handover | 3 | 16 |
| 6 · Proving the value | 3 | 19 |
| 6b · Standalone realization *(optional)* | +1–2 | — |
| 6c · Customer Success *(optional)* | +2 | — |
| 7 · Multi-tenant & roles | 2 | 21 |
| 8 · Close | 1 | 22 |

Runs ~22 minutes with room for questions; the standalone-realization aside (6b) is optional and additive. To cut to **12 minutes**: do sections 2 → 3 (function analysis + business case only) → 5 → 6 → 8.
