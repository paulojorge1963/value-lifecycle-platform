# User Guide & Everyday Playbook

How to run a value study end-to-end — from a fresh problem to proven, realized value.

> **A polished, shareable version of this guide** (with a contents rail and light/dark theme) is published as an artifact — ask the maintainer for the link. This Markdown copy is the versioned reference.

**Contents**

1. [What this platform is](#1--what-this-platform-is)
2. [Signing in & who does what](#2--signing-in--who-does-what)
3. [Start a new Value Lifecycle](#3--start-a-new-value-lifecycle) — the core workflow
4. [Everyday features](#4--everyday-features)
5. [Good practice](#5--good-practice)
6. [Quick reference](#6--quick-reference)

---

## 1 · What this platform is

One workspace that carries a piece of work through its **whole value lifecycle** — from a value engineer framing a problem and building the business case, to a value realization manager implementing it and proving the money was actually saved.

It maps to two complementary roles and two structured methods. The link between them is the point of the tool: every realization effort traces straight back to the study, business case and success criteria it came from — nothing gets lost in the handover.

| Role | What they do |
|---|---|
| 🔵 **Value Engineer** | Runs the 8-phase VE Job Plan: analyse functions, cost and performance, generate and score alternatives, and produce a quantified business case with baselines, KPIs and success criteria. |
| 🟢 **Value Realization Manager** | Runs the 7-phase realization lifecycle: implement approved recommendations, drive adoption, measure actuals against baseline, report to executives, and confirm realized value. |

> **The vocabulary.** A **Value Lifecycle** = one **VE study** plus the **Value Realization track(s)** it spawns. "Starting a new lifecycle" means creating a study and running it through to a handover. Section 3 walks the whole thing.

---

## 2 · Signing in & who does what

Open the app and you land on the sign-in page. Enter your email and password, or use a **demo quick-login** button to jump in as a specific role. To experience the separation of duties, sign out and sign back in as a different person — the navigation and the buttons you see change with your role.

> **Demo logins.** Password for every demo account is `demo1234`. Try `ve@demo.app` (Value Engineer), `vrm@demo.app` (Realization Manager), `reviewer@demo.app` (approver) and `viewer@demo.app` (read-only stakeholder).

### Creating your own workspace

For real use, click **"Create a workspace"** on the sign-in page. You provide a workspace name, your name, email and password — this creates a **new, isolated organization** and makes you its **Administrator**. Your studies and tracks are private to your workspace.

As an admin, a **Team** link appears in the top nav. From there you **add teammates** (name, email, role, and an initial password to share), **change roles**, **reset passwords**, and **remove access**. Assign each person a role — Value Engineer, Value Realization Manager, Reviewer, or Viewer — and they get exactly the permissions in the table below.

Permissions are role-based — the platform enforces a real separation between the person who *builds* a case, the person who *approves* it, and the person who *realizes* it.

| Capability | Value Engineer | Realization Mgr | Reviewer | Viewer |
|---|:--:|:--:|:--:|:--:|
| Create & edit studies, functions, alternatives, business case | ✅ | — | — | — |
| Accept / reject recommendations | — | — | ✅ | — |
| Create the realization track (handover) | ✅ | ✅ | — | — |
| Manage work packages, adoption, track status | — | ✅ | — | — |
| Record KPI actuals & realized benefits, publish reports | — | ✅ | — | — |
| Comment on studies & tracks | ✅ | ✅ | ✅ | ✅ |
| View everything & export documents | ✅ | ✅ | ✅ | ✅ |

*Admin* can do all of the above. Everyone can read the portfolio, KPI dashboards and template library.

---

## 3 · Start a new Value Lifecycle

This is the everyday operating procedure. A study moves through the VE Job Plan, hits the handover, and continues through the realization lifecycle. Work each phase in order and use its guidance panel — purpose, key questions, tasks and **exit criteria** — as your checklist before advancing.

> **Follow-along scenario.** Your firm is asked to **cut the cost of a wastewater clarifier** without hurting treatment performance. The seeded demo study `VE-2026-014` is exactly this — sign in as the Value Engineer and follow the steps against it, or create your own fresh study and mirror them.

### 🔵 Value Engineering — building the case

**1. Create the study** — Go to **Value Engineering** and click **"New VE study"**. Give it a title, pick the **industry profile** (Construction, Manufacturing or SaaS — this tailors the study types, cost drivers, value levers and default KPIs), choose the **study type** and **currency** (defaults to ZAR), and write a one-line **problem statement**.
→ *Result:* a study with all 8 VE phases created and ready, and its own code (e.g. `VE-2026-021`).

**2. Orientation & Information (phases 1–2)** — Open the study. The phase stepper runs across the top; click a phase to load its guidance. In **Orientation** confirm scope, stakeholders and the target outcome; in **Information** assemble the cost and performance facts. Click **Start phase**, then **Mark complete** once the exit criteria are met.
→ *Tip:* the exit-criteria checklist is your quality gate — don't advance until it's genuinely satisfied.

**3. Function analysis + FAST diagram (phase 3)** — In the **Function model**, add each function as a **verb + noun** ("Separate solids"), classify it *basic* or *secondary*, and enter its **cost** and **worth**. The **value index** (cost ÷ worth) computes automatically and turns amber when a function costs far more than it's worth — that's where the savings hide. Set each function's "supports" link to build the how/why chain, and the **FAST diagram** renders it as a logic tree.

**4. Generate alternatives — Creative (phase 4)** — Under **Creative alternatives**, brainstorm ways to deliver each high-priority function. Use **"+ Add alternative"** to type your own, or **"✨ Brainstorm with AI"** to generate a spread of ideas instantly. Link each idea to the function it improves and **shortlist** the promising ones.
→ *AI note:* with an Anthropic API key configured the button drafts with Claude; without one it seeds ideas from the industry profile's value levers and reads **"Brainstorm (template)"**. Either way you get editable starter ideas.

**5. Score & shortlist — Evaluation (phase 5)** — In the **Evaluation matrix**, define your **criteria and weights** (Cost, Performance, Risk, Feasibility, Schedule…), then score each alternative **1–5** per criterion. The **weighted score** and **rank** update live; changing a weight re-ranks everything. Shortlist the winners for development.

**6. Develop recommendations & the business case (phase 6)** — Promote a shortlisted idea with **"Promote to recommendation →"**, then flesh it out — **"✨ Draft with AI"** fills the summary, technical and commercial detail for you to refine. Open the **Business case** and add cost/benefit line items (CAPEX, OPEX, one-off, recurring, benefits); **ROI, payback, NPV and IRR recompute live**. Click **"Save version"** to snapshot it. Finally, capture the **value-handover** items — baselines, KPI definitions and success criteria — that Realization will be measured against.
→ *Export anytime:* **"Export to Word"** produces a formatted business-case document.

**7. Present & get approval** — A **Reviewer** signs in, reads the recommendations and business case, and clicks **Accept** or **Reject** on each. Only accepted recommendations can be handed over — this is the governance gate between "proposed value" and "committed work".

### → The handover

**8. Hand over to Realization** — With at least one **accepted** recommendation, click **"Create Value Realization Track →"**. The platform spins up a linked VR track and **pre-populates it from the study**: work packages (from the accepted recommendations), benefits (from the expected-benefit artifacts), KPI targets, and the baselines/success criteria. The study is marked *handed over* and both sides now show each other's status.
→ *This is the first-class link.* Open the new track and you'll see "Source study `VE-…`" — click it to jump straight back. Nothing is re-keyed.

### 🟢 Value Realization — proving the value

**9. Intake & baseline (phases 1–2)** — The **Realization Manager** opens the track from **Value Realization**. Confirm the objectives and success criteria, and **validate the baselines** carried over from handover. The KPI tracker and benefits list are already seeded — check the data source, frequency and owner on each KPI.

**10. Plan implementation & adoption (phases 3–4)** — Work the **work packages** (assign owners, set due dates, advance status), and build the **adoption & change plan** — who's impacted, training, comms, champions. This is where recommendations become scheduled, owned work.

**11. Execute & track value (phases 5–6)** — As delivery happens, advance work-package status and set the track's **health** (green / amber / red). Each period, **record KPI actuals** and update the **realized value** on each benefit — these roll up to the track total and into the portfolio automatically. Capture a **value report / QBR** for stakeholders.
→ *Export:* **"Export VRP / QBR"** generates the Value Realization Plan and QBR pack as a Word document.

**12. Close out & feed back (phase 7)** — Confirm **final realized value vs the original business case**, record lessons learned, and route improvements back into the VE templates and playbooks. The loop is closed — you can now point to proven, measured value against the plan you started with.

> **Watch it roll up.** At any point, leaders open the **Portfolio** dashboard to see planned value (from VE studies) against realized value (from VR tracks), broken down by industry and health — the whole book of work in one view.

---

## 4 · Everyday features

- **Portfolio dashboard** — leaders' view: active studies & tracks, planned vs realized value, and a by-industry rollup.
- **KPI dashboard** — role- and industry-filterable KPIs — VE (alternatives, recs accepted, planned value, avg ROI) and VR (realized value, variance, on-time, reports) — plus the formula catalogue.
- **Template library** — industry profiles, phase-by-phase guidance and reusable starter text for every deliverable.
- **Discussion** — threaded comments on any study or track; delete your own, admins can moderate.
- **Version history** — snapshot the business case with "Save version", review any past version, and restore it if a change regresses.
- **Exports** — business case → Word, Value Realization Plan / QBR → Word, KPI workbook → Excel.
- **AI drafting** — draft recommendation detail and brainstorm alternatives with Claude when a key is set — with a template fallback so it always works.
- **Multi-currency** — ZAR by default, switchable per business case (USD, EUR, GBP, and more); every figure re-formats live.

---

## 5 · Good practice

- **Treat exit criteria as gates.** Don't advance a phase until its checklist is genuinely met — it keeps studies defensible.
- **Spend creative effort where the value index is worst.** High cost-to-worth functions (amber) are where simplification pays off; don't optimise what's already good value.
- **Keep baselines honest.** Realized value is measured against them — a soft baseline flatters the numbers and undermines the QBR.
- **Use the roles as designed.** The engineer builds, a reviewer approves, the manager realizes. Signing in as each shows the same study from three angles.
- **Comment as you go.** Decisions and open questions belong on the study/track, not in email — then a QBR export tells the whole story.
- **Snapshot before big edits.** "Save version" on the business case gives you a safe restore point.

---

## 6 · Quick reference

**The 8-phase VE Job Plan:** 1 Orientation → 2 Information → 3 Function Analysis → 4 Creative → 5 Evaluation → 6 Development → 7 Presentation → 8 Handover.

**The 7-phase Realization lifecycle:** 1 Intake & Alignment → 2 Baseline & Measurement → 3 Implementation Planning → 4 Adoption & Change → 5 Execution & Monitoring → 6 Value Tracking & Reporting → 7 Close-Out.

**Where things live**

| Screen | Path |
|---|---|
| Sign in | `/login` — demo password `demo1234` |
| Portfolio (planned vs realized) | `/portfolio` |
| VE workspace (studies, "New VE study") | `/ve` |
| VR workspace (realization tracks) | `/vr` |
| KPIs (dashboards & catalogue) | `/kpis` |
| Templates (profiles, guidance, starter text) | `/templates` |

> **Turning on AI drafting.** Set `ANTHROPIC_API_KEY` in the app's environment and restart. The AI buttons then read "…with AI" and draft with Claude; left unset, they fall back to template starter text and read "…(template)". No other change needed.

---

See [`README.md`](README.md) for setup and [`ARCHITECTURE.md`](ARCHITECTURE.md) for the design and data model.
