# Value Lifecycle Platform — Architecture

End-to-end workspace for three complementary roles across the value lifecycle:

- **Value Engineer (VE)** — structured value studies, function analysis, alternative generation, quantified business cases.
- **Value Realization Manager (VRM)** — implementation, adoption, measurement, and proof of realized value against the business case.
- **Customer Success Manager (CSM)** — the continuous, whole-relationship lifecycle (onboarding → health → renewal → expansion) for an account.

The connections are **first-class**: a realization track references its source VE study, business case, and handover artifacts; and a **Customer Success engagement references** the account's VE studies and VR tracks — it *surfaces* their value, it never copies it (single source of truth).

---

## 1. High-level architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  ROLE-AWARE UI  (Next.js App Router — React Server Components)         │
│  /portfolio  ·  /ve  ·  /vr  ·  /cs  ·  /kpis  ·  /templates           │
│  Capabilities resolved from Role (VE / VRM / CSM / Reviewer / Viewer)  │
├──────────────────────────────────────────────────────────────────────┤
│  APPLICATION LAYER                                                     │
│  • Server Actions (src/lib/actions.ts): createStudy, phase status,     │
│    recommendation decisions, handoverToRealization, KPI actuals…       │
│  • REST API routes (src/app/api/*): studies, tracks, kpis, exports     │
│  • Finance engine (src/lib/finance.ts): ROI / payback / NPV / IRR / LCC│
│  • Export engine: DOCX (business case, VRP/QBR) · XLSX (KPIs)          │
├──────────────────────────────────────────────────────────────────────┤
│  CORE DOMAIN MODEL (Prisma → Postgres)          CONFIG LAYER (seeded)  │
│  VE:  Study→StudyPhase→PhaseTask                 IndustryProfile        │
│       FunctionItem→Alternative→Recommendation    PhaseTemplate          │
│       BusinessCase→Scenario→CostItem             ContentTemplate        │
│       HandoverArtifact ── the VE→VR bridge ──▶   KpiDefinition          │
│  VR:  RealizationTrack→VrPhaseInstance                                  │
│       WorkPackage · AdoptionPlan→Activity        (src/lib/domain/*.ts   │
│       Benefit · ValueReport · LessonLearned       is the source of      │
│  CS:  CustomerSuccessEngagement→CsStageInstance   truth, seeded to DB)  │
│       Stakeholder · ActionItem · HealthScore                            │
│       RenewalPlan · GrowthPlan (refs Study+Track)                       │
│  KPI: KpiTarget→KpiActual (time series)                                 │
│  Gov: Comment · AuditEvent · DocumentVersion                           │
│  IAM: Organization · Team · User · Membership(Role)                    │
└──────────────────────────────────────────────────────────────────────┘
```

**Three deliberately separated layers** (requirement #6):

1. **Core domain** — the phases, deliverables and KPIs that are true for every industry.
2. **Config layer** — `IndustryProfile`, `PhaseTemplate`, `ContentTemplate`, `KpiDefinition`. These live as versioned TypeScript modules in `src/lib/domain/` and are seeded into the database. **Adding an industry, phase guidance, KPI or template means editing a config file and re-seeding — the engine never changes.**
3. **Role-specific views** — `/ve` vs `/vr` workspaces; capabilities resolved from the user's `Role`.

---

## 2. Data model (key entities & relationships)

Full schema: [`prisma/schema.prisma`](prisma/schema.prisma). Summary:

### Value Engineering
| Entity | Purpose | Key relations |
|---|---|---|
| `Study` | A VE study | → `IndustryProfile`, `User` (owner), `Team` |
| `StudyPhase` | Instance of one of the 8 VE Job Plan phases | `Study` 1—8 `StudyPhase` |
| `PhaseTask` | Checklist item within a phase | `StudyPhase` 1—* |
| `InfoItem` | Information-phase data point | `Study` 1—* |
| `FunctionItem` | Verb-noun function; basic/secondary; cost vs worth; FAST parent chain | self-referential (`FastChain`) |
| `Alternative` | Creative alternative, scored in Evaluation | → `FunctionItem`, `Recommendation` |
| `Recommendation` | Developed rec w/ technical + commercial detail; status | → `Study`, `WorkPackage[]`, `HandoverArtifact[]` |
| `BusinessCase` | Headline financials + narrative | 1—1 `Study` |
| `Scenario` | Baseline vs proposed | `BusinessCase` 1—* |
| `CostItem` | CAPEX/OPEX/one-off/recurring/benefit line | `BusinessCase`/`Scenario` 1—* |
| `RiskItem` | Risk + mitigation | `Study` or `RealizationTrack` |
| **`HandoverArtifact`** | **The VE→VR bridge**: expected benefit, KPI, baseline, measurement plan, success criterion, risk | → `Study`, optionally linked to `RealizationTrack` on handover |

### Value Realization
| Entity | Purpose | Key relations |
|---|---|---|
| **`RealizationTrack`** | A realization track. `origin` = `VE_HANDOVER` (has a source study) or `STANDALONE` (software already in place, no study) — `studyId` is **optional** | → `Study?`, `IndustryProfile`, `User` (owner), `CustomerSuccessEngagement?` |
| `VrPhaseInstance` | Instance of one of the 7 VR phases | `RealizationTrack` 1—7 |
| `WorkPackage` | Implementation WBS; milestones; self-referential dependency graph | → `RealizationTrack`, `Recommendation` |
| `AdoptionPlan` / `AdoptionActivity` | Change management | 1—1 track / 1—* plan |
| `Benefit` | Planned vs realized value by category | `RealizationTrack` 1—* |
| `ValueReport` | Periodic / QBR / EBR pack | `RealizationTrack` 1—* |
| `LessonLearned` | Close-out feedback, can feed back to VE | `RealizationTrack` 1—* |

### Customer Success
CS is the continuous, per-account relationship layer. It **references** VE studies and VR tracks (optional `engagementId` on each) rather than duplicating their value.

| Entity | Purpose | Key relations |
|---|---|---|
| **`CustomerSuccessEngagement`** | A per-account engagement (continuous); `healthOverall` RAG, `arr`, `renewalDate`, `successPlan` | → `IndustryProfile`, `User` (CSM); `Study[]` + `RealizationTrack[]` (references) |
| `CsStageInstance` | Instance of one of the 8 CS lifecycle stages (Handover → Expansion) | `CustomerSuccessEngagement` 1—8 |
| `Stakeholder` | Stakeholder map (influence × sentiment) | engagement 1—* |
| `ActionItem` | Governance action log (owner, due, status) | engagement 1—* |
| `HealthScore` | Point-in-time weighted health (factors + overall 0–100) → rolls up to RAG | engagement 1—* |
| `RenewalPlan` / `GrowthPlan` | Renewal and expansion plans | 1—1 engagement |
| `ValueReport` | Also hangs off an engagement (EBR) — `trackId`/`engagementId` both optional | → track *or* engagement |

### KPIs, config, governance, IAM
- `KpiDefinition` (catalogue: formula, unit, direction, discipline, scope, industry) → `KpiTarget` (instance on a study or track, baseline + target) → `KpiActual` (time-series).
- `IndustryProfile`, `PhaseTemplate`, `ContentTemplate` — the config layer.
- `Comment`, `AuditEvent`, `DocumentVersion` — governance (polymorphic by `entityType`/`entityId`, plus optional `studyId`/`trackId` for fast filtering).
- `Organization` → `Team`, `User` → `Membership(Role)` — RBAC.

---

## 3. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | RSC for data-heavy dashboards, server actions for mutations, one deploy target |
| Language | **TypeScript (strict)** | Domain correctness across a large model |
| ORM / DB | **Prisma 6 + PostgreSQL** | Relational integrity for the VE↔VR graph; JSON columns for extensible config |
| Styling | **Tailwind CSS** | Fast, consistent role-accented UI (VE = blue, VR = emerald) |
| Auth | **Auth.js (NextAuth v5)** — Credentials provider, JWT sessions, edge-safe middleware config | Route protection + RBAC without external services; `providers` array extends to OAuth/email |
| Exports | **docx** (Word), **exceljs** (Excel) | Business case, VRP/QBR, KPI workbook |
| Validation | **zod** | API request validation |

---

## 4. Core user flows

1. **Create a VE study** — `/ve` → *New VE study* → pick industry profile + study type → study created with 8 phases seeded → land on study workspace.
2. **Progress through VE phases** — each phase panel shows purpose, key questions, required inputs, tasks, artifacts, **exit criteria**; Start → Mark complete advances status.
3. **Develop the business case** — `/ve/[id]/business-case`: scenarios + cost/benefit line items → finance engine recomputes ROI/payback/NPV/IRR/LCC live → value-handover section (baselines, KPIs, success criteria).
4. **Hand over VE → VR** (marquee flow) — from the study, *Create Value Realization Track*. Guard: ≥1 **accepted** recommendation. On success it: creates a `RealizationTrack` linked to the study; seeds work packages from accepted recommendations; seeds benefits from expected-benefit artifacts; copies KPI artifacts into `KpiTarget`s; links handover artifacts to the track; sets study → `HANDED_OVER`; writes an `AuditEvent`.
5. **Manage the VR track** — `/vr/[id]`: 7-phase lifecycle, work packages, adoption plan, **KPI tracker** (record actuals per period), **benefits realization** (edit realized value → rolls up to track & portfolio).
6. **Report** — export VRP/QBR to Word; value reports & QBR content stored on the track.
7. **Portfolio view** — `/portfolio`: planned (VE) vs realized (VR), by industry, both tables, plus a **Customer Success lens** (active engagements, health distribution, upcoming renewals, needs-attention list). `/kpis`: role- and industry-filterable KPI tiles + catalogue + Excel export.
8. **Run a Customer Success engagement** — `/cs` → *New engagement* (or import a CS Intake workbook). `/cs/[id]`: the 8-stage lifecycle, a weighted **Health Scorecard** (rolls up to RAG), **attention signals** (renewal/health/overdue-action/detractor alerts), Stakeholder Map, Action Log, Renewal/Growth/Success plans, and **linked studies/tracks whose value it surfaces**. Generate an **EBR narrative** (AI via `src/lib/ai.ts`, else template) → persisted as a report + next-best-actions seeded into the Action Log; export an Account Success Review to Word.

---

## 5. Screen layouts (implemented)

- **Portfolio dashboard** — 4 stat tiles (active studies/tracks, planned/realized value), realized-vs-planned bar, by-industry cards, VE studies + VR tracks tables.
- **VE study workspace** — header (status/industry/value), 8-phase stepper, phase-guidance panel, function model (cost-worth-index, poor-value highlighting), recommendations (accept/reject), business-case sidebar, value-handover card with the handover button.
- **Business-case builder** — live financial tiles, scenarios, cost/benefit table, LCC-by-year, risks, value-handover section, Word export.
- **VR track dashboard** — value tiles (planned/realized/variance/on-time), 7-phase stepper, phase guidance, work packages, KPI tracker, value reports, benefits realization + adoption sidebar; links back to the source study.
- **KPI & portfolio dashboards** — role/industry filters, VE and VR KPI groups, KPI catalogue with formulas.
- **Template library** — industry profiles, VE/VR content templates (expandable starter text), phase-guidance library.

---

## 6. Extensibility notes

- **New industry**: add to `src/lib/domain/industries.ts` (study types, cost drivers, value levers, default KPIs, glossary) → `npm run db:seed`.
- **New KPI**: add to `src/lib/domain/kpis.ts` (formula, unit, direction, discipline, scope) → seed.
- **New phase guidance / template**: edit `phases.ts` / `templates.ts` → seed.
- **CS lifecycle / health factors**: the 8 CS stages live in `src/lib/domain/cs-stages.ts` and the weighted health factors in `src/lib/domain/cs-health.ts` — edit and re-seed; the engine never changes.
- **Auth**: Auth.js Credentials provider with hashed passwords (bcrypt). Middleware (`src/middleware.ts`) redirects unauthenticated requests to `/login`; `getCurrentUser()` reads the session and `can()` enforces role capabilities. Add OAuth/email providers by extending `src/lib/auth.ts`.
- **AI "starter text"**: `ANTHROPIC_API_KEY` seam is reserved for LLM-generated deliverable drafts; the static template library is the fallback.
