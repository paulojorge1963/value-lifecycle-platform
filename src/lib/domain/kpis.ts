// =============================================================================
//  KPI catalogue — role-specific and shared KPIs with formulas.
//  VE-discipline KPIs are *planned* value; VR-discipline KPIs are *realized*.
// =============================================================================

export type Discipline = "VE" | "VR";
export type BenefitCategory =
  | "COST_SAVING"
  | "REVENUE_UPLIFT"
  | "RISK_REDUCTION"
  | "TIME_SAVING"
  | "QUALITY"
  | "SCHEDULE"
  | "RELIABILITY"
  | "OTHER";
export type KpiDirection = "HIGHER_IS_BETTER" | "LOWER_IS_BETTER";

export interface KpiDef {
  key: string;
  name: string;
  description: string;
  discipline: Discipline;
  category: BenefitCategory;
  unit: string;
  direction: KpiDirection;
  formula?: string;
  scope: "study" | "track" | "portfolio";
  industryKey?: string; // null/undefined = generic
}

export const KPI_CATALOG: KpiDef[] = [
  // ---- Shared / financial ----
  {
    key: "cost_savings",
    name: "Estimated / realized cost savings",
    description: "Reduction in total cost vs baseline. VE estimates it; VR proves it.",
    discipline: "VE",
    category: "COST_SAVING",
    unit: "USD",
    direction: "HIGHER_IS_BETTER",
    formula: "baseline_cost - proposed_cost",
    scope: "study",
  },
  {
    key: "roi_pct",
    name: "Return on investment",
    description: "Net benefit as a percentage of investment.",
    discipline: "VE",
    category: "COST_SAVING",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(net_benefit / total_investment) * 100",
    scope: "study",
  },
  {
    key: "payback_period",
    name: "Payback period",
    description: "Time for cumulative benefits to recover the investment.",
    discipline: "VE",
    category: "COST_SAVING",
    unit: "months",
    direction: "LOWER_IS_BETTER",
    formula: "total_investment / average_monthly_net_benefit",
    scope: "study",
  },
  {
    key: "revenue_uplift",
    name: "Revenue uplift",
    description: "Incremental revenue attributable to the recommendation.",
    discipline: "VR",
    category: "REVENUE_UPLIFT",
    unit: "USD",
    direction: "HIGHER_IS_BETTER",
    formula: "actual_revenue - baseline_revenue",
    scope: "track",
  },

  // ---- VE study-level ----
  {
    key: "alternatives_generated",
    name: "Alternatives generated",
    description: "Count of creative alternatives generated in the study.",
    discipline: "VE",
    category: "OTHER",
    unit: "count",
    direction: "HIGHER_IS_BETTER",
    formula: "count(alternatives)",
    scope: "study",
  },
  {
    key: "recommendations_accepted",
    name: "Recommendations accepted",
    description: "Number of recommendations approved for implementation.",
    discipline: "VE",
    category: "OTHER",
    unit: "count",
    direction: "HIGHER_IS_BETTER",
    formula: "count(recommendations where status = ACCEPTED)",
    scope: "study",
  },
  {
    key: "study_cycle_time",
    name: "Study cycle time",
    description: "Elapsed time from study start to implementation decision.",
    discipline: "VE",
    category: "TIME_SAVING",
    unit: "days",
    direction: "LOWER_IS_BETTER",
    formula: "decision_date - start_date",
    scope: "study",
  },
  {
    key: "avg_roi",
    name: "Average ROI per study",
    description: "Portfolio average of study-level ROI.",
    discipline: "VE",
    category: "COST_SAVING",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "avg(study.roi_pct)",
    scope: "portfolio",
  },

  // ---- VR implementation-level ----
  {
    key: "on_time_implementation",
    name: "On-time implementation",
    description: "Percentage of recommendations / work packages implemented on time.",
    discipline: "VR",
    category: "SCHEDULE",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(on_time_packages / total_packages) * 100",
    scope: "track",
  },
  {
    key: "adoption_rate",
    name: "Adoption rate",
    description: "Percentage of target users / processes using the new solution.",
    discipline: "VR",
    category: "OTHER",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(active_users / target_users) * 100",
    scope: "track",
  },
  {
    key: "task_utilization",
    name: "Licence / capacity utilization",
    description: "Share of licensed capacity (e.g. tasks, seats, units) actually used — proves value from what was purchased and flags right-sizing headroom.",
    discipline: "VR",
    category: "COST_SAVING",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(capacity_used / capacity_licensed) * 100",
    scope: "track",
  },
  {
    key: "time_to_value",
    name: "Time-to-value",
    description: "Time from approval to first measurable benefit.",
    discipline: "VR",
    category: "TIME_SAVING",
    unit: "days",
    direction: "LOWER_IS_BETTER",
    formula: "first_benefit_date - approval_date",
    scope: "track",
  },

  // ---- VR outcome-level ----
  {
    key: "realized_value",
    name: "Realized value",
    description: "Total value realized (cost, revenue, risk, time, quality).",
    discipline: "VR",
    category: "COST_SAVING",
    unit: "USD",
    direction: "HIGHER_IS_BETTER",
    formula: "sum(benefit.realizedValue)",
    scope: "track",
  },
  {
    key: "net_variance",
    name: "Planned vs realized variance",
    description: "Variance between planned and realized value (positive = over-delivered).",
    discipline: "VR",
    category: "OTHER",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "((realized_value - planned_value) / planned_value) * 100",
    scope: "track",
  },
  {
    key: "reports_delivered",
    name: "Value reports / QBRs delivered",
    description: "Count of periodic value reports and QBR/EBR packs delivered.",
    discipline: "VR",
    category: "OTHER",
    unit: "count",
    direction: "HIGHER_IS_BETTER",
    formula: "count(value_reports)",
    scope: "track",
  },

  // ---- VR portfolio-level ----
  {
    key: "total_realized_value",
    name: "Total realized value (portfolio)",
    description: "Aggregate realized value across all tracks.",
    discipline: "VR",
    category: "COST_SAVING",
    unit: "USD",
    direction: "HIGHER_IS_BETTER",
    formula: "sum(track.realizedValue)",
    scope: "portfolio",
  },
  {
    key: "template_reuse_rate",
    name: "Template / plan reuse rate",
    description: "Share of tracks reusing an existing realization plan or template.",
    discipline: "VR",
    category: "OTHER",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(reused_tracks / total_tracks) * 100",
    scope: "portfolio",
  },

  // ---- Industry-specific ----
  {
    key: "schedule_impact_days",
    name: "Schedule impact",
    description: "Change in programme duration (negative = compression).",
    discipline: "VE",
    category: "SCHEDULE",
    unit: "days",
    direction: "LOWER_IS_BETTER",
    formula: "proposed_duration - baseline_duration",
    scope: "study",  },
  {
    key: "lcc_reduction",
    name: "Life-cycle cost reduction",
    description: "Reduction in whole-life cost vs baseline.",
    discipline: "VE",
    category: "COST_SAVING",
    unit: "USD",
    direction: "HIGHER_IS_BETTER",
    formula: "baseline_lcc - proposed_lcc",
    scope: "study",  },
  {
    key: "reliability_uptime",
    name: "Reliability / uptime",
    description: "Availability of the asset or system.",
    discipline: "VR",
    category: "RELIABILITY",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(uptime_hours / total_hours) * 100",
    scope: "track",  },
  {
    key: "unit_cost_reduction",
    name: "Unit cost reduction",
    description: "Reduction in per-unit product cost vs baseline.",
    discipline: "VE",
    category: "COST_SAVING",
    unit: "USD",
    direction: "HIGHER_IS_BETTER",
    formula: "baseline_unit_cost - proposed_unit_cost",
    scope: "study",  },
  {
    key: "first_pass_yield",
    name: "First pass yield",
    description: "Share of units produced correctly without rework.",
    discipline: "VR",
    category: "QUALITY",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(good_units / total_units) * 100",
    scope: "track",  },

  // ---- BMC portfolio KPIs ----
  {
    key: "mainframe_cost",
    name: "Mainframe cost reduction (MLC / MSU)",
    description: "Reduction in mainframe software cost from R4HA peak tuning and workload optimisation.",
    discipline: "VE",
    category: "COST_SAVING",
    unit: "USD",
    direction: "HIGHER_IS_BETTER",
    formula: "baseline_mlc - optimised_mlc",
    scope: "study",
  },
  {
    key: "mttr",
    name: "Mean time to resolve (MTTR)",
    description: "Average time to resolve incidents — lower is better; driven by AIOps and automation.",
    discipline: "VR",
    category: "RELIABILITY",
    unit: "hours",
    direction: "LOWER_IS_BETTER",
    formula: "total_resolution_time / incidents",
    scope: "track",
  },
  {
    key: "job_success_rate",
    name: "Job success rate",
    description: "Share of scheduled jobs that complete successfully first time.",
    discipline: "VR",
    category: "RELIABILITY",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(successful_jobs / total_jobs) * 100",
    scope: "track",
  },
  {
    key: "sla_attainment",
    name: "SLA attainment",
    description: "Share of service-level agreements met in the period.",
    discipline: "VR",
    category: "RELIABILITY",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(slas_met / slas_total) * 100",
    scope: "track",
  },
  {
    key: "ticket_deflection",
    name: "Ticket deflection rate",
    description: "Share of demand resolved by self-service / virtual agent instead of an agent.",
    discipline: "VR",
    category: "COST_SAVING",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(deflected / total_contacts) * 100",
    scope: "track",
  },
  {
    key: "first_contact_resolution",
    name: "First-contact resolution",
    description: "Share of tickets resolved at first contact.",
    discipline: "VR",
    category: "QUALITY",
    unit: "%",
    direction: "HIGHER_IS_BETTER",
    formula: "(fcr_tickets / total_tickets) * 100",
    scope: "track",
  },
];
