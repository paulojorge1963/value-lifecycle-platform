# Customer Success Module — Design Proposal

## A continuous, whole-relationship CS lifecycle alongside the Value Lifecycle Platform

**Status:** Draft for review · **Scope:** a new *Customer Success* pillar added to the existing Value Engineering (VE) + Value Realization (VR) app · **Audience:** product/engineering + value practice leads.

> **In one line.** Add Customer Success as a **third pillar** — a per-customer, continuous 8-stage lifecycle that *references* (does not duplicate) the bounded VE studies and VR tracks, completing the loop *sell → prove → retain & grow*.

---

## 1 · Why a separate pillar (not a change to VR)

The app today runs two **bounded** disciplines joined by a first-class handover:

- **Value Engineering** — build & quantify the business case (8-phase Job Plan). *Pre-sale.*
- **Value Realization** — prove the value of *one* initiative (7-phase lifecycle, ends at Close-Out). *Post-sale, time-boxed.*

Customer Success is different in kind:

| | Value Realization (existing) | Customer Success (proposed) |
|---|---|---|
| **Organised around** | one value initiative | the whole customer relationship |
| **Lifespan** | bounded — ends at Close-Out | continuous — loops renewal → expansion |
| **Owner** | Value Realization Manager | Customer Success Manager (CSM) |
| **Granularity** | one track per value case | one engagement per account (many tracks/studies over time) |

Forcing the 8 continuous CS stages onto the 7 bounded VR phases would break the VR model and serve neither. Keeping CS **separate but linked** matches the model already documented in the process guide and role materials (CS is *adjacent* to VE→VRM), and it completes the lifecycle:

```
   VE study  ──handover──▶  VR track  ──proof──▶  CS engagement  ──new opportunity──▶  VE study
 (build case)            (prove value)        (retain & grow, continuous)                (loop)
```

---

## 2 · Where it fits — the three-pillar architecture

One clean hierarchy, with CS as the long-lived relationship wrapper:

```
Account / Customer
   └── CS Engagement            (continuous — the 8-stage CS lifecycle)
          ├── references → VE Studies    (bounded: build the case)
          └── references → VR Tracks     (bounded: prove the value)
```

- A **CS Engagement** is created per customer/account and lives for the life of the relationship.
- It **links to** that account's VE studies and VR tracks rather than re-implementing them.
- The existing **standalone VR track** ("software already in place") becomes a natural child of a CS engagement — that's renewal-assurance on the installed base.

**Design principle — single source of truth.** CS is the *relationship layer*; VR remains the *value-proof engine*. CS's Value-Realisation stage **surfaces** the linked VR track's KPIs and benefits; it never re-enters them. This is the guard against building a parallel, drifting copy of the value data.

---

## 3 · The 8-stage CS lifecycle

Modelled exactly on the attached Customer Success Process Flow, expressed in the app's phase-instance pattern (each stage carries purpose, key activities, exit criteria, and outputs — like the VE/VR phases).

| # | Stage | Objective | Key activities | Primary output |
|---|---|---|---|---|
| 1 | **Handover** | Capture the promise; successful transition Sales→CS | Capture objectives & success criteria; identify stakeholders; document commitments, risks & assumptions | **Customer Success Plan** |
| 2 | **Onboarding** | Get the customer live, enabled, confident | Kick-off & align on goals/roles/timelines; technical setup & integration; training plan; define governance rhythm | Onboarding plan |
| 3 | **Adoption** | Drive meaningful usage | Track usage & activity; monitor feature adoption; identify & remove adoption blockers; enable users | **Adoption Tracker** |
| 4 | **Value Realisation** | Prove measurable business outcomes | Define value metrics & baselines; quantify benefits; capture stories & impact; communicate value | **Value Register** *(from linked VR tracks)* |
| 5 | **Health Management** | Monitor health, manage risk | Score customer health; review risks & issues; ensure exec alignment; track renewal signals; action plans | **Health Scorecard** |
| 6 | **Governance Rhythm** | Stay aligned & proactive | Operational check-ins; success reviews; executive business reviews (QBR/EBR); track actions & commitments | **Action Log** + QBR/EBR decks |
| 7 | **Renewal Management** | Make renewal a natural result of proven value | Confirm renewal date & stakeholders; review value & usage; address gaps; engage procurement; build case | **Renewal Plan** |
| 8 | **Expansion & Growth** | Grow relevance & value | Identify expansion triggers; build & validate business case; engage account team; execute growth plan | **Growth Plan** |

**Continuous governance** (spanning all stages, per the diagram): strong multi-threaded relationships, clear communication, customer-outcome focus, proactive risk management, continuous improvement. **Feedback loop:** capture feedback → learn → improve → enhance value → strengthen relationship — wired back into VE templates and playbooks.

Unlike VR, the CS lifecycle **does not close out** — stages 5–8 recur continuously; Renewal and Expansion feed each other and loop.

---

## 4 · Data model (proposed)

New objects, reusing the existing config-layer, phase-instance, KPI, comment, audit and export infrastructure.

```prisma
enum CsStageKey {
  HANDOVER ONBOARDING ADOPTION VALUE_REALISATION
  HEALTH_MANAGEMENT GOVERNANCE_RHYTHM RENEWAL_MANAGEMENT EXPANSION_GROWTH
}
enum CsEngagementStatus { ACTIVE AT_RISK RENEWED CHURNED ARCHIVED }
enum ActionStatus       { OPEN IN_PROGRESS BLOCKED DONE }
enum Sentiment          { PROMOTER NEUTRAL DETRACTOR }

model CustomerSuccessEngagement {
  id             String  @id @default(cuid())
  code           String  @unique            // "CS-2026-001"
  accountName    String
  organizationId String                     // tenant (reuse Organization)
  teamId         String?
  industryKey    String                     // reuse solution profile
  ownerId        String                     // the CSM
  status         CsEngagementStatus @default(ACTIVE)
  healthOverall  Health  @default(GREEN)    // reuse GREEN/AMBER/RED
  arr            Float?                      // annual recurring revenue
  currency       String  @default("ZAR")
  renewalDate    DateTime?
  startedAt      DateTime?
  // children
  stages         CsStageInstance[]
  stakeholders   Stakeholder[]
  actions        ActionItem[]
  healthScores   HealthScore[]              // time-series scorecard
  renewalPlan    RenewalPlan?
  growthPlan     GrowthPlan?
  successPlan     Json?                      // Customer Success Plan (objectives, commitments, success criteria)
  // links (single source of truth — CS references, not copies)
  studies        Study[]                    // via optional Study.engagementId
  tracks         RealizationTrack[]         // via optional RealizationTrack.engagementId
  reports        ValueReport[]              // reuse (add engagementId)
  kpiTargets     KpiTarget[]                // optional engagement-level KPIs (add engagementId)
}

model CsStageInstance {
  id String @id @default(cuid())
  engagementId String
  stage CsStageKey
  order Int
  status PhaseStatus @default(NOT_STARTED)  // reuse
  notes String?
  startedAt DateTime?  completedAt DateTime?
  @@unique([engagementId, stage])
}

model Stakeholder {
  id String @id @default(cuid())
  engagementId String
  name String  title String?  role String?    // economic buyer / champion / sponsor / user lead / detractor
  influence Int?                                // 1–5
  sentiment Sentiment @default(NEUTRAL)
  notes String?
}

model HealthScore {                            // one row per review period → trend
  id String @id @default(cuid())
  engagementId String
  periodLabel String  periodDate DateTime
  overall Int                                  // 0–100 (or GREEN/AMBER/RED derived)
  factors Json                                 // [{key,label,score,weight}] adoption/value/sentiment/support/engagement
  note String?
  @@unique([engagementId, periodLabel])
}

model ActionItem {
  id String @id @default(cuid())
  engagementId String
  title String  owner String?  dueDate DateTime?
  status ActionStatus @default(OPEN)
  sourceStage CsStageKey?  createdAt DateTime @default(now())
}

model RenewalPlan {
  id String @id @default(cuid())
  engagementId String @unique
  renewalDate DateTime?  stage String?         // e.g. "6–9 months out"
  valueSummary String?  risks String?  procurementStatus String?  plannedActions String?
}

model GrowthPlan {
  id String @id @default(cuid())
  engagementId String @unique
  triggers String?  opportunities Json?        // [{name, value, stage}]
  targetValue Float?  narrative String?
}
```

**Small additions to existing models:** an optional `engagementId` on `Study`, `RealizationTrack`, `ValueReport`, `KpiTarget` (nullable FK) so they can hang off a CS engagement without disturbing anything that exists today. `Comment` and `AuditEvent` are already polymorphic (`entityType`/`entityId`) — no change needed. `ReportKind` already has `QUARTERLY_QBR` and `EXECUTIVE_EBR`.

---

## 5 · Roles & permissions

Add a **Customer Success Manager (CSM)** role (already named in the role materials) and CS capabilities to the existing RBAC (`src/lib/session.ts`):

| Capability | ADMIN | CSM | VRM | VE | Reviewer/Viewer |
|---|:--:|:--:|:--:|:--:|:--:|
| `cs.create` | ✓ | ✓ | | | |
| `cs.edit` | ✓ | ✓ | | | |
| `cs.delete` | ✓ | | | | |
| `view` | ✓ | ✓ | ✓ | ✓ | ✓ |

A CSM sees the CS workspace; VRM/VE see linked engagements read-only from their study/track. Standard org-tenant isolation applies (same as studies/tracks).

---

## 6 · Artefacts & exports (mapping the diagram's "Key Outputs")

| CS artefact | How it's produced |
|---|---|
| Customer Success Plan | `successPlan` on the engagement (+ export to Word) |
| Stakeholder Map | `Stakeholder[]` (influence × sentiment grid view) |
| Adoption Tracker | reuse the VR **Adoption Plan** on linked tracks + engagement KPIs |
| Value Register | reuse linked VR tracks' **benefits + KPI actuals** (surfaced, not copied) |
| Health Scorecard | `HealthScore[]` (weighted factors + trend) |
| Action Log | `ActionItem[]` |
| Renewal Plan | `RenewalPlan` (+ export) |
| Growth Plan | `GrowthPlan` (+ export) |
| QBR / EBR decks | reuse `ValueReport` (`QUARTERLY_QBR` / `EXECUTIVE_EBR`) + export |

---

## 7 · UI surface

- New **`/cs`** workspace: engagement list (health, renewal date, ARR, status) + a **"+ New engagement"** form.
- **`/cs/[id]`** detail: the 8-stage stepper with per-stage guidance; panels for Health Scorecard, Stakeholder Map, Action Log, Renewal & Growth plans, and **linked studies/tracks** (with the VR value data surfaced read-only).
- **Portfolio** gains a CS lens: renewal pipeline, health distribution, at-risk accounts — beside the existing planned-vs-realized value.

---

## 8 · Phased build plan

**Phase 1 — MVP (~1.5–2 weeks): the engagement + lifecycle + links.**
- `CustomerSuccessEngagement` + `CsStageInstance` (8 stages, config-driven guidance in `src/lib/domain/`), CSM role + RBAC, optional `engagementId` on Study/Track.
- `/cs` list + `/cs/[id]` detail with the 8-stage stepper, basic overall Health (GREEN/AMBER/RED), `renewalDate`, and linked studies/tracks surfacing VR value.
- Portfolio CS lens (renewal dates + health).

**Phase 2 — the CS artefacts (~1–2 weeks).**
- Health Scorecard (weighted factors + trend), Stakeholder Map, Action Log, Renewal Plan, Growth Plan, Customer Success Plan.
- Exports: Renewal Plan, Growth Plan, EBR deck; capture-workbook + importer support for CS (mirroring the VE/VR capture kit).

**Phase 3 — proactivity & intelligence (~1–2 weeks).**
- Renewal reminders & health alerts; feedback-loop wiring back into VE templates; optional GenAI assists (EBR narrative, health summary, renewal-risk call) via the existing `src/lib/ai.ts` seam.

*Estimates are indicative and assume the current stack/patterns.*

---

## 9 · Non-goals (for now)

- A full CRM (contacts, opportunities, activities) — CS links to accounts, it doesn't replace Salesforce/HubSpot.
- Support ticketing — health *reads* support signals; it doesn't run a service desk.
- Billing/subscription management — `arr`/`renewalDate` are captured, not invoiced.

---

## 10 · Open decisions

1. **Account entity now or later?** MVP uses `accountName` as a string; a first-class `Account` model (grouping engagements/studies/tracks) is cleaner long-term. *Recommend: string in MVP, Account model in Phase 2.*
2. **Does CS subsume the standalone VR track?** *Recommend: keep standalone VR tracks, but allow attaching them to a CS engagement (renewal assurance on installed base).*
3. **Health scoring method** — which weighted factors (adoption, value delivered, sentiment, support health, engagement) and thresholds for GREEN/AMBER/RED. *Needs a short definition workshop.*
4. **Naming** — confirm "Customer Success" pillar and "CSM" role in the product nav.

---

## 11 · Risks & mitigations

| Risk | Mitigation |
|---|---|
| Duplicating value data between VR and CS | Single-source-of-truth rule: CS **references** VR tracks; never re-enters KPIs/benefits |
| Scope creep into a full platform | Phase-gated; MVP delivers the lifecycle + links before artefacts/intelligence |
| Overlap/confusion with VR for users | Clear framing: VR = prove *an initiative*; CS = manage *the relationship* (documented in the guide) |
| RBAC/tenant leakage | Reuse the proven org-scoping + capability checks used by studies/tracks |

---

*Value Lifecycle Platform — design proposal for the Customer Success module.*
