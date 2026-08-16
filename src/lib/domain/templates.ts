// =============================================================================
//  Content templates — "starter text" offered inside deliverable editors and
//  listed in the Template Library. {{placeholders}} are filled from study/track.
// =============================================================================

export type Discipline = "VE" | "VR";

export interface ContentTemplateDef {
  discipline: Discipline;
  kind: string;
  title: string;
  industryKey?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export const CONTENT_TEMPLATES: ContentTemplateDef[] = [
  // ---------------- VE ----------------
  {
    discipline: "VE",
    kind: "problem_statement",
    title: "Problem statement & scope",
    body: `## Problem statement
{{title}} is being studied because {{reason}}. Today, {{current_state}}, which results in {{pain}}.

## Objective
Improve value by {{objective}} without compromising {{must_not_compromise}}.

## In scope
- {{in_scope_1}}

## Out of scope
- {{out_scope_1}}

## Target outcome
{{target_metric}} improved by {{target_amount}} within {{timeframe}}.`,
    metadata: { sections: ["Problem", "Objective", "Scope", "Target outcome"] },
  },
  {
    discipline: "VE",
    kind: "function_model",
    title: "Function model (verb-noun)",
    body: `List each function as a verb + noun, classify it, and estimate cost vs worth.

| Function (verb-noun) | Basic/Secondary | Cost | Worth | Value index (cost÷worth) |
|---|---|---|---|---|
| {{verb}} {{noun}} | Basic | {{cost}} | {{worth}} | {{index}} |

**Poor-value functions** (high cost-to-worth) are the priority for the Creative phase.`,
  },
  {
    discipline: "VE",
    kind: "business_case",
    title: "Business case",
    body: `## Executive summary
{{recommendation}} delivers an estimated {{headline_value}} with a payback of {{payback}} months (ROI {{roi}}%).

## Baseline scenario
{{baseline_description}} — annual cost {{baseline_cost}}.

## Proposed scenario
{{proposed_description}} — CAPEX {{capex}}, OPEX {{opex}}.

## Cost / benefit
- One-off: {{one_off}}
- Recurring (annual): {{recurring}}
- Net benefit (annual): {{net_benefit}}

## Financials
- ROI: {{roi}}%
- Payback: {{payback}} months
- NPV ({{horizon}}y @ {{discount}}%): {{npv}}
- IRR: {{irr}}%

## Life-cycle cost (where relevant)
{{lcca_notes}}

## Risks & mitigations
{{risks}}

## Value handover
- Expected benefits: {{expected_benefits}}
- KPIs & baselines: {{kpis}}
- Success criteria: {{success_criteria}}`,
    metadata: {
      formulas: {
        roi: "(net_benefit / total_investment) * 100",
        payback: "total_investment / average_monthly_net_benefit",
        npv: "Σ cashflow_t / (1 + r)^t",
      },
    },
  },
  {
    discipline: "VE",
    kind: "presentation_outline",
    title: "Presentation deck outline",
    body: `1. Executive summary — the value story in one line
2. Problem & scope
3. Approach (VE Job Plan)
4. Options considered (evaluation matrix)
5. Recommendation(s)
6. Financials (ROI / payback / NPV / LCCA)
7. Risks & mitigations
8. Implementation outline (milestones, owners, timeline)
9. The ask / decision required`,
  },
  {
    discipline: "VE",
    kind: "business_case",
    title: "ROI / TCO business case (SaaS)",    body: `## Executive summary
{{solution}} delivers {{headline_value}} of annual value: {{automation_savings}} in process savings + {{revenue_uplift}} revenue uplift, against {{tco}} total cost of ownership. Payback {{payback}} months.

## Current state (baseline)
- Manual effort / legacy TCO: {{baseline_cost}}
- Key pain: {{pain}}

## Proposed solution
- Subscription: {{subscription}}/yr
- Implementation & change: {{implementation}} one-off

## Value drivers
- Process automation: {{automation_savings}}
- Revenue / conversion uplift: {{revenue_uplift}}
- Risk / churn reduction: {{risk_reduction}}

## TCO & ROI (3-year)
- 3-yr TCO: {{tco}}
- 3-yr benefit: {{benefit}}
- ROI: {{roi}}% · Payback: {{payback}} months

## Value handover
- Adoption target: {{adoption_target}}%
- KPIs: {{kpis}}
- Success criteria: {{success_criteria}}`,
  },

  // ---------------- VR ----------------
  {
    discipline: "VR",
    kind: "vrp",
    title: "Value Realization Plan",
    body: `## Linked VE study
Source study: {{study_code}} — {{study_title}}. Approved recommendations: {{recommendations}}.

## Objectives & success criteria
{{objectives}}
Success is achieving {{success_criteria}}.

## Baseline & KPIs
| KPI | Baseline | Target | Unit | Data source | Frequency | Owner |
|---|---|---|---|---|---|---|
| {{kpi}} | {{baseline}} | {{target}} | {{unit}} | {{source}} | {{frequency}} | {{owner}} |

## Implementation work breakdown
| Work package | Owner | Milestone | Due | Depends on |
|---|---|---|---|---|
| {{wp}} | {{owner}} | {{milestone}} | {{due}} | {{deps}} |

## Adoption & change management
- Change impact: {{change_impact}}
- Training: {{training}}
- Communications: {{comms}}
- Champions: {{champions}}

## Risks & mitigations
{{risks}}`,
  },
  {
    discipline: "VR",
    kind: "qbr",
    title: "QBR / EBR value pack outline",
    body: `## Executive value story
{{one_line_story}}

## Progress against plan
- Milestones complete: {{milestones_done}} / {{milestones_total}}
- Track health: {{health}}

## Realized benefits to date
- Planned value: {{planned}}
- Realized to date: {{realized}} ({{variance}}% vs plan)
- By category: {{by_category}}

## Adoption
- Adoption rate: {{adoption}}%

## Next-best actions & expansion
- {{next_action}}
- Expansion opportunity: {{expansion}}`,
  },
  {
    discipline: "VR",
    kind: "closeout",
    title: "Close-out report",
    body: `## Final realized value vs business case
- Planned (business case): {{planned}}
- Realized (final): {{realized}}
- Variance: {{variance}}%

## What was delivered
{{summary}}

## Lessons learned
- What worked: {{worked}}
- What to change: {{change}}
- Recommendation for future VE studies: {{ve_feedback}}`,
  },
  {
    discipline: "VR",
    kind: "adoption_plan",
    title: "Adoption & change plan",
    body: `## Change impact by audience
| Audience | How work changes | Readiness | Owner |
|---|---|---|---|
| {{audience}} | {{change}} | {{readiness}} | {{owner}} |

## Training plan
{{training}}

## Communications plan
{{comms}}

## Champion network
{{champions}}

## Adoption measurement
Adoption rate = active users ÷ target users. Target {{adoption_target}}% by {{date}}.`,
  },
];
