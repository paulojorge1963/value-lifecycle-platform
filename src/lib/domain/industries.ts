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
    /// Vendor product families the study should inventory — their function and
    /// the value they deliver — so the team captures what the customer owns and
    /// how they use it (e.g. the BMC AMI portfolio on the mainframe). Optional.
    products?: { name: string; function: string; value: string }[];
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
        "Data-pipeline / DataOps orchestration case",
        "Application workflow orchestration case",
        "Managed File Transfer (MFT) consolidation case",
        "Control-M SaaS migration case",
        "DevOps / jobs-as-code integration case",
        "Cloud & hybrid workload orchestration case",
        "AI workflow orchestration readiness case",
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
        "Mainframe cost-optimisation study",
        "BMC AMI portfolio value & adoption review",
        "MLC / MSU reduction review",
        "Tailored Fit Pricing (TFP) readiness case",
        "Availability & resilience review",
        "AIOps for Z (BMC AMI Ops) observability case",
        "Storage & backup modernisation (BMC AMI Cloud) case",
        "Mainframe security & compliance (BMC AMI Security) review",
        "Mainframe DevOps / DevX modernisation case",
        "Db2 / IMS / MQ performance & cost-tuning study",
        "Capacity planning & MSU forecasting study",
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
        "DevX modernisation (jobs-as-code, agile)",
        "Availability & resilience improvement",
      ],
      exampleDeliverables: [
        "Mainframe cost-optimisation business case",
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
      products: [
        { name: "BMC AMI Ops", function: "AI-driven monitoring, anomaly detection and automated operations across z/OS, CICS, Db2, IMS, MQ, Java, network and storage (incl. workload/MSU automation & capping).", value: "Fewer and shorter outages, less manual operations effort, proactive problem avoidance and MLC/capacity cost control." },
        { name: "BMC AMI DevX", function: "Mainframe DevOps and AI-augmented code modernisation — IDE (Workbench), debugging (Code Debug/Xpediter), test data (File-AID), fault diagnostics (Abend-AID) and CI/CD (Code Pipeline/ISPW).", value: "Faster, lower-risk application delivery; mitigates COBOL/skills risk; onboards new developers; enables agile & jobs-as-code." },
        { name: "BMC AMI Data", function: "Db2 and IMS database performance, administration, recovery and resilience on IBM Z.", value: "Database performance and availability, lower CPU/cost, and faster, more reliable recovery." },
        { name: "BMC AMI Security", function: "Mainframe threat detection, compliance and access governance (RACF/ACF2/Top Secret), MFA integration and CIS benchmark reporting.", value: "Reduced breach and compliance risk, continuous audit readiness, stronger access control." },
        { name: "BMC AMI Cloud", function: "Mainframe data and storage to cloud object storage — immutable air-gapped backups, fast disaster recovery and data mobility (removes tape).", value: "Storage cost avoidance, cyber-resilience, faster DR, and mainframe data made available to cloud analytics/AI." },
        { name: "BMC AMI Assistant & Agentics", function: "Generative and agentic AI across the AMI portfolio — assisted operations, code understanding and modernisation.", value: "Lower effort and faster time-to-value; makes scarce Z expertise go further." },
      ],
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
        "Discovery & CMDB accuracy case",
        "Change & release automation study",
        "HelixGPT agentic-AI resolution study",
        "Digital Workplace / employee-experience study",
        "Remedy-to-Helix SaaS migration case",
        "Continuous optimisation / capacity & cost case",
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
        "Adoption & value-realisation study",
        "Renewal & expansion case",
        "Cloud migration / modernisation TCO case",
        "Build-vs-buy business case",
        "Security & compliance risk-reduction case",
        "Licence rightsizing / true-up case",
        "Proof-of-value (PoV) outcome study",
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
  {
    key: "mainframe_mod",
    name: "Mainframe Modernisation (IZOT · BMC AMI DevX)",
    description:
      "Understanding and transforming the value of the IBM Z estate — what the mainframe runs, for whom, and what to retain, optimise, modernise or retire. Anchored on a mainframe value assessment, then workload disposition and a modernisation roadmap.",
    config: {
      studyTypes: [
        "Mainframe value assessment (what the mainframe delivers)",
        "BMC AMI portfolio value & adoption review",
        "Application portfolio analysis & disposition (7 Rs)",
        "Workload discovery & rationalisation study",
        "Mainframe modernisation roadmap & business case",
        "COBOL / code modernisation case (AI-augmented · AMI DevX)",
        "Rehost / replatform / refactor option-appraisal study",
        "Mainframe DevOps / jobs-as-code enablement case",
        "API-enablement & hybrid-cloud integration case",
        "Data modernisation / mainframe-to-cloud data mobility case",
        "Z skills & workforce-risk assessment",
        "Batch modernisation & window-reduction study",
      ],
      costDrivers: [
        "MLC / MSU software cost (R4HA peak)",
        "MIPS capacity & growth",
        "Legacy application maintenance cost",
        "Scarce / ageing Z skills & contractors",
        "Technical debt & change risk",
        "Orphaned / low-value workloads",
      ],
      valueLevers: [
        "Workload rationalisation & retirement (orphaned MIPS)",
        "Right-disposition per the 7 Rs (retain/optimise/modernise/retire)",
        "AI-augmented code refactoring & auto-documentation (AMI DevX)",
        "DevOps / jobs-as-code agility & faster delivery",
        "API-enablement & hybrid-cloud integration",
        "Z skills-risk reduction & developer productivity",
      ],
      exampleDeliverables: [
        "Mainframe value & usage baseline",
        "Application portfolio disposition map (7 Rs)",
        "Modernisation roadmap & business case",
        "Workload rationalisation / retirement plan",
      ],
      defaultKpiKeys: [
        "workload_value_mapped",
        "low_value_workloads",
        "mips_capacity",
        "msu_r4ha_peak",
        "cost_per_mips",
        "modernisation_readiness",
        "mainframe_cost",
        "dev_productivity",
        "reliability_uptime",
        "roi_pct",
        "payback_period",
      ],
      glossary: {
        MIPS: "Millions of Instructions Per Second (mainframe capacity measure)",
        MSU: "Million Service Units (CPU consumption — the MLC billing unit)",
        MLC: "Monthly Licence Charge",
        R4HA: "Rolling 4-Hour Average (the sub-capacity software billing basis)",
        TFP: "Tailored Fit Pricing (IBM's consumption/capacity alternative to R4HA)",
        "7 Rs": "Modernisation dispositions: retain, encapsulate, rehost, replatform, refactor, re-architect, replace/retire",
        IZOT: "Intelligent Z Optimization & Transformation (BMC line of business)",
        "AMI DevX": "BMC's AI-augmented mainframe code modernisation & DevOps suite",
        COBOL: "Common Business-Oriented Language (predominant mainframe application language)",
        LPAR: "Logical Partition (a virtualised mainframe instance)",
      },
      products: [
        { name: "BMC AMI Ops", function: "AI-driven monitoring, anomaly detection and automated operations across z/OS, CICS, Db2, IMS, MQ, Java, network and storage (incl. workload/MSU automation & capping).", value: "Fewer and shorter outages, less manual operations effort, proactive problem avoidance and MLC/capacity cost control." },
        { name: "BMC AMI DevX", function: "Mainframe DevOps and AI-augmented code modernisation — IDE (Workbench), debugging (Code Debug/Xpediter), test data (File-AID), fault diagnostics (Abend-AID) and CI/CD (Code Pipeline/ISPW).", value: "Faster, lower-risk application delivery; mitigates COBOL/skills risk; onboards new developers; enables agile & jobs-as-code." },
        { name: "BMC AMI Data", function: "Db2 and IMS database performance, administration, recovery and resilience on IBM Z.", value: "Database performance and availability, lower CPU/cost, and faster, more reliable recovery." },
        { name: "BMC AMI Security", function: "Mainframe threat detection, compliance and access governance (RACF/ACF2/Top Secret), MFA integration and CIS benchmark reporting.", value: "Reduced breach and compliance risk, continuous audit readiness, stronger access control." },
        { name: "BMC AMI Cloud", function: "Mainframe data and storage to cloud object storage — immutable air-gapped backups, fast disaster recovery and data mobility (removes tape).", value: "Storage cost avoidance, cyber-resilience, faster DR, and mainframe data made available to cloud analytics/AI." },
        { name: "BMC AMI Assistant & Agentics", function: "Generative and agentic AI across the AMI portfolio — assisted operations, code understanding and modernisation.", value: "Lower effort and faster time-to-value; makes scarce Z expertise go further." },
      ],
    },
  },
];
