// =============================================================================
//  Solution profiles — configurable, not hard-coded. For Blue Turtle these are
//  the BMC portfolio lines (plus a general reseller/OEM catch-all). Adding one
//  means adding an entry here (and re-seeding); the engine never changes.
//  NB: kept the type/const names (IndustryProfile / industryKey) so the data
//  model and API are untouched — only the content and UI labels change.
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
    /// KPI keys (from kpis.ts) most relevant to this profile.
    defaultKpiKeys: string[];
    /// Profile-specific vocabulary shown in guidance / labels.
    glossary: Record<string, string>;
  };
}

export const INDUSTRY_PROFILES: IndustryProfileDef[] = [
  {
    key: "automation",
    name: "Workload Automation (DBA · Control-M)",
    description:
      "Orchestrating business-critical workflows and data pipelines with BMC Control-M — where job reliability, SLAs and scheduler consolidation drive value.",
    config: {
      studyTypes: [
        "Automation value study",
        "Scheduler consolidation case",
        "SLA reliability review",
        "Data-pipeline orchestration case",
      ],
      costDrivers: [
        "Legacy scheduler licences & maintenance",
        "Failed-job / rerun cost",
        "Manual scheduling & firefighting effort",
        "SLA penalty / business risk",
        "Deployment lead time",
      ],
      valueLevers: [
        "Scheduler consolidation (licence takeout)",
        "Jobs-as-code / faster delivery",
        "SLA management & failure reduction",
        "Hybrid-cloud & data-pipeline orchestration",
        "Reduced manual intervention",
      ],
      exampleDeliverables: [
        "Automation business case",
        "Scheduler consolidation plan",
        "SLA improvement plan",
        "Orchestration target architecture",
      ],
      defaultKpiKeys: [
        "job_success_rate",
        "sla_attainment",
        "cost_savings",
        "roi_pct",
        "payback_period",
        "on_time_implementation",
        "realized_value",
      ],
      glossary: {
        SLA: "Service-Level Agreement",
        MFT: "Managed File Transfer",
        "Jobs-as-code": "Defining scheduled jobs as version-controlled code",
        DBA: "Digital Business Automation (BMC line of business)",
      },
    },
  },
  {
    key: "mainframe",
    name: "Mainframe Optimization (IZOT · BMC AMI)",
    description:
      "Optimising, modernising and managing the IBM Z mainframe with the BMC AMI portfolio — where software cost, availability and DevOps agility drive value.",
    config: {
      studyTypes: [
        "Mainframe cost-optimization study",
        "MLC / MSU reduction review",
        "Availability & resilience review",
        "Mainframe DevOps / modernization case",
      ],
      costDrivers: [
        "MLC / MSU software cost",
        "MIPS / capacity",
        "Incident & outage cost",
        "Manual operations effort",
        "Scarce Z skills / contractors",
        "Batch-window pressure",
      ],
      valueLevers: [
        "R4HA peak reduction & workload tuning",
        "Capacity-upgrade deferral",
        "Automation & AIOps for Z",
        "DevX modernization (jobs-as-code, agile)",
        "Availability & resilience improvement",
      ],
      exampleDeliverables: [
        "Mainframe cost-optimization business case",
        "MLC reduction plan",
        "Availability improvement plan",
        "Modernization roadmap",
      ],
      defaultKpiKeys: [
        "mainframe_cost",
        "reliability_uptime",
        "mttr",
        "cost_savings",
        "roi_pct",
        "payback_period",
        "realized_value",
      ],
      glossary: {
        MLC: "Monthly Licence Charge",
        MSU: "Million Service Units",
        R4HA: "Rolling 4-Hour Average (the mainframe sub-capacity billing basis)",
        AMI: "Automated Mainframe Intelligence (BMC portfolio)",
        IZOT: "Intelligent Z Optimization & Transformation (BMC line of business)",
      },
    },
  },
  {
    key: "serviceops",
    name: "Service & Operations (BMC Helix · DSOM)",
    description:
      "Cloud service and operations management with BMC Helix — ITSM, AIOps, Discovery and the Digital Workplace — where MTTR, deflection and tool consolidation drive value.",
    config: {
      studyTypes: [
        "ITSM value / TCO study",
        "ServiceNow displacement case",
        "AIOps / observability case",
        "Self-service deflection study",
      ],
      costDrivers: [
        "Cost per ticket",
        "Incident & outage cost",
        "Tool-sprawl licences",
        "Manual operations effort",
        "Low self-service adoption",
        "Change-failure rework",
      ],
      valueLevers: [
        "AIOps MTTR reduction",
        "Self-service & virtual-agent deflection",
        "Tool consolidation (licence takeout)",
        "Workflow automation",
        "CMDB / Discovery accuracy",
      ],
      exampleDeliverables: [
        "ITSM value business case",
        "Deflection & automation plan",
        "AIOps value case",
        "Tool-consolidation TCO analysis",
      ],
      defaultKpiKeys: [
        "mttr",
        "ticket_deflection",
        "first_contact_resolution",
        "cost_savings",
        "roi_pct",
        "payback_period",
        "adoption_rate",
        "realized_value",
      ],
      glossary: {
        MTTR: "Mean Time To Resolve",
        MTTD: "Mean Time To Detect",
        CMDB: "Configuration Management Database",
        FCR: "First-Contact Resolution",
        DSOM: "Digital Service & Operations Management (BMC Helix)",
      },
    },
  },
  {
    key: "reseller",
    name: "Software Reseller / OEM — General",
    description:
      "A general software-value profile for OEM products Blue Turtle resells and implements outside the core BMC lines — subscription TCO, adoption and outcome value.",
    config: {
      studyTypes: [
        "Software ROI / TCO business case",
        "Vendor / tool consolidation case",
        "Adoption & value-realization study",
        "Renewal & expansion case",
      ],
      costDrivers: [
        "Licence / subscription cost",
        "Implementation & integration",
        "Run & support cost",
        "Manual effort / inefficiency",
        "Tool overlap / redundancy",
      ],
      valueLevers: [
        "Process automation & productivity",
        "Tool / licence consolidation",
        "Risk & compliance improvement",
        "Availability & performance",
        "Faster time-to-value",
      ],
      exampleDeliverables: [
        "Software business case (ROI / TCO)",
        "Consolidation analysis",
        "Adoption / value plan",
        "Renewal & expansion case",
      ],
      defaultKpiKeys: [
        "cost_savings",
        "roi_pct",
        "payback_period",
        "adoption_rate",
        "time_to_value",
        "realized_value",
      ],
      glossary: {
        TCO: "Total Cost of Ownership",
        OEM: "Original Equipment Manufacturer (the software vendor)",
        ARR: "Annual Recurring Revenue",
      },
    },
  },
];
