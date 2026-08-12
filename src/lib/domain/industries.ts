// =============================================================================
//  Industry profiles — configurable, not hard-coded. Adding an industry means
//  adding an entry here (and re-seeding); the engine never changes.
// =============================================================================

export interface IndustryProfileDef {
  key: string;
  name: string;
  description: string;
  config: {
    studyTypes: string[];
    costDrivers: string[];
    valueLevers: string[];
    exampleDeliverables: string[];
    /// KPI keys (from kpis.ts) most relevant to this industry.
    defaultKpiKeys: string[];
    /// Industry-specific vocabulary shown in guidance / labels.
    glossary: Record<string, string>;
  };
}

export const INDUSTRY_PROFILES: IndustryProfileDef[] = [
  {
    key: "construction",
    name: "Construction & Infrastructure",
    description:
      "Capital projects and infrastructure where design alternatives, constructability and life-cycle cost drive value.",
    config: {
      studyTypes: [
        "Design VE study",
        "Constructability review",
        "Value planning workshop",
        "Life-cycle cost optimisation",
      ],
      costDrivers: [
        "Materials & quantities",
        "Labour & plant",
        "Design complexity",
        "Site conditions & logistics",
        "Programme / schedule duration",
        "Operation & maintenance (whole-life)",
      ],
      valueLevers: [
        "Design simplification / standardisation",
        "Material substitution",
        "Constructability improvements",
        "Off-site / modular construction",
        "Schedule compression",
        "Whole-life cost reduction",
      ],
      exampleDeliverables: [
        "Design alternatives register",
        "Constructability recommendations",
        "Life-cycle cost analysis (LCCA)",
        "VE workshop report",
      ],
      defaultKpiKeys: [
        "cost_savings",
        "schedule_impact_days",
        "lcc_reduction",
        "recommendations_accepted",
        "reliability_uptime",
      ],
      glossary: {
        BOQ: "Bill of Quantities",
        LCCA: "Life-Cycle Cost Analysis",
        Constructability: "Ease and efficiency with which a design can be built",
      },
    },
  },
  {
    key: "manufacturing",
    name: "Manufacturing & Product Development",
    description:
      "Products and production processes where BOM cost, process efficiency and quality drive value.",
    config: {
      studyTypes: [
        "Product cost teardown / VE study",
        "BOM optimisation",
        "Process / DFMA review",
        "Supplier value analysis",
      ],
      costDrivers: [
        "Bill of materials (BOM) cost",
        "Direct labour & cycle time",
        "Tooling & setup",
        "Scrap / rework / yield",
        "Overhead & logistics",
        "Warranty & field failure",
      ],
      valueLevers: [
        "BOM re-design / part consolidation",
        "Material substitution",
        "Design for manufacture & assembly (DFMA)",
        "Process improvement / automation",
        "Supplier negotiation / re-sourcing",
        "Quality / yield improvement",
      ],
      exampleDeliverables: [
        "BOM & process alternatives",
        "Cost teardown model",
        "DFMA recommendations",
        "Should-cost analysis",
      ],
      defaultKpiKeys: [
        "cost_savings",
        "unit_cost_reduction",
        "first_pass_yield",
        "recommendations_accepted",
        "time_to_value",
      ],
      glossary: {
        BOM: "Bill of Materials",
        DFMA: "Design for Manufacture and Assembly",
        FPY: "First Pass Yield",
        "Should-cost": "Bottom-up estimate of what a part ought to cost",
      },
    },
  },
  {
    key: "saas",
    name: "Enterprise Software / SaaS Sales & Customer Success",
    description:
      "Software solutions where ROI/TCO business cases, adoption and customer outcomes drive value.",
    config: {
      studyTypes: [
        "ROI / TCO business case",
        "Value assessment / discovery",
        "Solution value engineering",
        "Customer success value plan",
      ],
      costDrivers: [
        "Licence / subscription cost",
        "Implementation & integration",
        "Change management & training",
        "Support & success management",
        "Manual process / labour displaced",
        "Legacy system TCO",
      ],
      valueLevers: [
        "Process automation / efficiency",
        "Revenue uplift / conversion",
        "Churn / risk reduction",
        "Consolidation of tooling",
        "Faster time-to-value",
        "Adoption & expansion",
      ],
      exampleDeliverables: [
        "ROI / payback / TCO business case",
        "Value assessment deck",
        "Adoption & success plan",
        "QBR / EBR value pack",
      ],
      defaultKpiKeys: [
        "roi_pct",
        "payback_period",
        "adoption_rate",
        "revenue_uplift",
        "time_to_value",
        "net_variance",
      ],
      glossary: {
        TCO: "Total Cost of Ownership",
        QBR: "Quarterly Business Review",
        EBR: "Executive Business Review",
        "Time-to-value": "Time from go-live to first measurable benefit",
      },
    },
  },
];
