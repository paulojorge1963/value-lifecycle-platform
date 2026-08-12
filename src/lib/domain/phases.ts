// =============================================================================
//  Phase definitions — the guided workflows for both roles.
//  These are the source of truth seeded into PhaseTemplate. Each phase carries
//  purpose, key questions, required inputs, tasks, artifacts and exit criteria.
// =============================================================================

export type Discipline = "VE" | "VR";

export interface PhaseDef {
  discipline: Discipline;
  key: string; // matches VePhaseKey / VrPhaseKey enum values
  order: number;
  title: string;
  purpose: string;
  keyQuestions: string[];
  requiredInputs: string[];
  tasks: string[];
  artifacts: string[]; // deliverables produced
  exitCriteria: string[]; // quality checks to advance
}

// ---------------------------------------------------------------------------
//  VALUE ENGINEERING — the 8-phase VE Job Plan
// ---------------------------------------------------------------------------

export const VE_PHASES: PhaseDef[] = [
  {
    discipline: "VE",
    key: "ORIENTATION",
    order: 1,
    title: "Orientation / Pre-Study",
    purpose:
      "Frame the problem, confirm scope and objectives, and secure the data and stakeholders needed to run an effective study.",
    keyQuestions: [
      "What problem or opportunity are we studying, and why now?",
      "What are the boundaries of scope (in / out)?",
      "Who are the decision-makers, stakeholders and subject-matter experts?",
      "What is the target value outcome (cost, performance, schedule, risk)?",
      "What constraints (regulatory, technical, contractual) must be respected?",
    ],
    requiredInputs: [
      "Project brief / charter",
      "Sponsor and stakeholder list",
      "High-level cost and performance data",
      "Known constraints and non-negotiables",
    ],
    tasks: [
      "Draft the problem statement and scope document",
      "Select the industry profile and study type",
      "Identify stakeholders and confirm the study team",
      "Agree the target value outcome and success measures",
      "Schedule the study and confirm data availability",
    ],
    artifacts: ["Problem statement & scope document", "Stakeholder map", "Study plan"],
    exitCriteria: [
      "Problem statement approved by sponsor",
      "Scope boundaries documented",
      "Industry profile and study type selected",
      "Study team and schedule confirmed",
    ],
  },
  {
    discipline: "VE",
    key: "INFORMATION",
    order: 2,
    title: "Information Phase",
    purpose:
      "Gather and structure all relevant facts — costs, performance, constraints, drawings and stakeholder input — to create a reliable evidence base.",
    keyQuestions: [
      "What does the item / process cost today, broken down by element?",
      "What performance and quality requirements must be met?",
      "What data is authoritative vs assumed? Where are the gaps?",
      "What has been tried before and why did it succeed or fail?",
    ],
    requiredInputs: [
      "Detailed cost breakdown (BOM, unit rates, schedule of quantities)",
      "Performance / quality specifications",
      "Drawings, models, process maps",
      "Stakeholder interviews",
    ],
    tasks: [
      "Assemble the cost model / cost breakdown",
      "Capture performance & quality requirements",
      "Log constraints and assumptions",
      "Record data sources and confidence levels",
      "Produce the information pack / data summary",
    ],
    artifacts: ["Information pack / data summary", "Cost model", "Requirements register"],
    exitCriteria: [
      "Cost data captured to a usable level of detail",
      "Performance requirements documented",
      "Key data gaps identified with a plan to close them",
    ],
  },
  {
    discipline: "VE",
    key: "FUNCTION_ANALYSIS",
    order: 3,
    title: "Function Analysis Phase",
    purpose:
      "Define what the item / process must do in verb-noun terms, classify basic vs secondary functions, and expose where cost is disproportionate to worth.",
    keyQuestions: [
      "What are the basic (essential) functions? What are secondary?",
      "What is the cost of each function vs its worth?",
      "Which functions carry poor value (high cost-to-worth)?",
      "How do functions relate in a how/why (FAST) logic chain?",
    ],
    requiredInputs: ["Information pack", "Cost model", "Requirements register"],
    tasks: [
      "Define functions in verb-noun form",
      "Classify each as basic or secondary",
      "Allocate cost and estimate worth per function",
      "Build the function model / FAST diagram notes",
      "Rank functions by value index (cost ÷ worth)",
    ],
    artifacts: ["Function model", "FAST diagram notes", "Function cost-worth ranking"],
    exitCriteria: [
      "All significant functions defined and classified",
      "Cost and worth allocated to functions",
      "Poor-value functions prioritised for creative effort",
    ],
  },
  {
    discipline: "VE",
    key: "CREATIVE",
    order: 4,
    title: "Creative (Speculation) Phase",
    purpose:
      "Generate a large quantity of alternative ways to deliver the high-priority functions, deferring judgement to maximise idea flow.",
    keyQuestions: [
      "How else could this function be delivered?",
      "What would eliminate, combine or simplify this function?",
      "What do other industries / products do to achieve the same function?",
    ],
    requiredInputs: ["Function cost-worth ranking", "Prioritised functions"],
    tasks: [
      "Run structured brainstorming per prioritised function",
      "Capture every alternative without evaluation",
      "Group and de-duplicate ideas",
      "Tag alternatives to the function(s) they serve",
    ],
    artifacts: ["List of creative alternatives per function"],
    exitCriteria: [
      "Multiple alternatives generated for each high-priority function",
      "Ideas captured and grouped without premature filtering",
    ],
  },
  {
    discipline: "VE",
    key: "EVALUATION",
    order: 5,
    title: "Evaluation Phase",
    purpose:
      "Objectively screen and rank alternatives against weighted criteria to produce a defensible shortlist.",
    keyQuestions: [
      "Which criteria matter (cost, performance, risk, schedule, feasibility)?",
      "How should criteria be weighted?",
      "Which alternatives survive screening and score best?",
      "What are the trade-offs of each shortlisted option?",
    ],
    requiredInputs: ["Creative alternatives list", "Evaluation criteria & weights"],
    tasks: [
      "Define evaluation criteria and weights",
      "Screen out non-feasible alternatives",
      "Score alternatives against criteria",
      "Compute weighted scores and rank",
      "Select the shortlist for development",
    ],
    artifacts: ["Evaluation matrix (criteria, weights, scores)", "Shortlist"],
    exitCriteria: [
      "Weighted evaluation matrix complete",
      "Shortlist selected with rationale",
      "Trade-offs documented for decision-makers",
    ],
  },
  {
    discipline: "VE",
    key: "DEVELOPMENT",
    order: 6,
    title: "Development Phase",
    purpose:
      "Develop shortlisted alternatives into robust recommendations with technical and commercial detail and a quantified business case.",
    keyQuestions: [
      "What is the full technical solution for each recommendation?",
      "What are the CAPEX / OPEX, one-off and recurring cost impacts?",
      "What is the ROI, payback, NPV/IRR and life-cycle cost impact?",
      "What are the risks and how are they mitigated?",
      "What baselines, KPIs and success criteria will prove the value?",
    ],
    requiredInputs: ["Shortlist", "Cost model", "Performance requirements"],
    tasks: [
      "Develop technical detail for each recommendation",
      "Build baseline vs proposed scenarios and cost/benefit model",
      "Compute ROI, payback, NPV/IRR and LCCA where relevant",
      "Complete the risk assessment and mitigations",
      "Draft the value-handover section (benefits, KPIs, baselines, success criteria)",
    ],
    artifacts: [
      "Developed recommendations",
      "Business case (baseline + proposed, cost/benefit, ROI, LCCA, risk)",
      "Value-handover section",
    ],
    exitCriteria: [
      "Each recommendation has technical + commercial detail",
      "Business case financials computed and sanity-checked",
      "Risk assessment complete",
      "Handover artifacts (baselines, KPIs, success criteria) drafted",
    ],
  },
  {
    discipline: "VE",
    key: "PRESENTATION",
    order: 7,
    title: "Presentation Phase",
    purpose:
      "Present the recommendations and business case to decision-makers to secure approval to implement.",
    keyQuestions: [
      "What is the executive value story in one slide?",
      "Which options are recommended and why?",
      "What decision is being asked of the sponsor?",
    ],
    requiredInputs: ["Business case", "Developed recommendations"],
    tasks: [
      "Assemble the presentation deck outline",
      "Prepare the executive summary and financial headlines",
      "Document the recommended option and the ask",
      "Capture approval decisions and conditions",
    ],
    artifacts: ["Presentation deck outline", "Decision log"],
    exitCriteria: [
      "Deck outline complete (summary, problem, options, recommendation, financials, implementation outline)",
      "Approval decision recorded",
    ],
  },
  {
    discipline: "VE",
    key: "HANDOVER",
    order: 8,
    title: "Handover to Implementation & Follow-up",
    purpose:
      "Package approved recommendations, baselines, KPIs and success criteria into a Value Realization track so nothing is lost in translation.",
    keyQuestions: [
      "Which recommendations were approved for implementation?",
      "What are the confirmed baselines, KPIs and success criteria?",
      "Who owns realization, and what is the high-level implementation plan?",
      "What risks carry forward?",
    ],
    requiredInputs: ["Approved recommendations", "Business case", "Handover artifacts"],
    tasks: [
      "Confirm approved recommendations and expected benefits",
      "Finalise baselines, KPI definitions and measurement plan",
      "Draft the high-level implementation plan (milestones, owners, timeline)",
      "Create the Value Realization track and hand over",
    ],
    artifacts: ["Value-handover package", "High-level implementation plan", "Value Realization track (created)"],
    exitCriteria: [
      "All approved recommendations captured as handover artifacts",
      "Baselines and KPIs defined with owners and data sources",
      "Value Realization track created and linked to this study",
    ],
  },
];

// ---------------------------------------------------------------------------
//  VALUE REALIZATION — the 7-phase realization lifecycle
// ---------------------------------------------------------------------------

export const VR_PHASES: PhaseDef[] = [
  {
    discipline: "VR",
    key: "INTAKE",
    order: 1,
    title: "Intake & Alignment",
    purpose:
      "Receive the approved recommendations and business case, and confirm scope, owners, timelines and success criteria with stakeholders.",
    keyQuestions: [
      "What exactly was approved, and what value is expected?",
      "Who owns each recommendation and the overall track?",
      "What are the confirmed success criteria and timelines?",
      "Are there constraints or dependencies from the operational environment?",
    ],
    requiredInputs: ["VE handover package", "Approved business case", "Stakeholder availability"],
    tasks: [
      "Review handover artifacts from the VE study",
      "Confirm scope, objectives and success criteria",
      "Assign track owner and recommendation owners",
      "Agree timelines and governance cadence",
    ],
    artifacts: ["Track charter", "Confirmed success criteria", "RACI"],
    exitCriteria: [
      "Scope and success criteria confirmed with stakeholders",
      "Owners and governance cadence agreed",
    ],
  },
  {
    discipline: "VR",
    key: "BASELINE",
    order: 2,
    title: "Baseline & Measurement Design",
    purpose:
      "Validate baselines and define the KPIs, data sources, frequency and owners; stand up the value dashboard.",
    keyQuestions: [
      "Are the VE baselines still valid? What needs re-measuring?",
      "For each KPI: definition, formula, unit, data source, frequency, owner?",
      "How will planned vs actual be visualised?",
    ],
    requiredInputs: ["Handover KPIs & baselines", "Operational data sources"],
    tasks: [
      "Validate / re-measure baselines",
      "Define each KPI (formula, unit, direction, data source, frequency, owner)",
      "Configure the value dashboard / scorecard",
      "Set targets and thresholds",
    ],
    artifacts: ["KPI definitions & baselines", "Measurement plan", "Value dashboard (configured)"],
    exitCriteria: [
      "Baselines validated",
      "Every KPI has a data source, frequency and owner",
      "Dashboard live with baseline and target lines",
    ],
  },
  {
    discipline: "VR",
    key: "IMPLEMENTATION_PLANNING",
    order: 3,
    title: "Implementation Planning",
    purpose:
      "Break recommendations into work packages with milestones, dependencies, owners and timelines.",
    keyQuestions: [
      "What work packages deliver each recommendation?",
      "What are the milestones and critical dependencies?",
      "Who owns each package and what resources are needed?",
    ],
    requiredInputs: ["Approved recommendations", "High-level implementation plan"],
    tasks: [
      "Decompose recommendations into work packages",
      "Define milestones and dependencies",
      "Assign owners, resources and dates",
      "Baseline the implementation schedule",
    ],
    artifacts: ["Work breakdown & schedule", "Milestone plan", "Dependency map"],
    exitCriteria: [
      "All recommendations decomposed into owned work packages",
      "Milestones and dependencies defined",
      "Schedule baselined",
    ],
  },
  {
    discipline: "VR",
    key: "ADOPTION",
    order: 4,
    title: "Adoption & Change Management",
    purpose:
      "Define change impacts, training, communications and champion networks, and track adoption activity.",
    keyQuestions: [
      "Who is impacted and how does their work change?",
      "What training and communications are needed?",
      "Who are the champions and how will adoption be measured?",
    ],
    requiredInputs: ["Work breakdown", "Stakeholder map", "Adoption KPI definitions"],
    tasks: [
      "Assess change impact by audience",
      "Build the training and communications plan",
      "Stand up a champion network",
      "Track adoption activities and issues",
    ],
    artifacts: ["Adoption & change plan", "Training plan", "Comms plan", "Champion network"],
    exitCriteria: [
      "Change impacts assessed for each audience",
      "Training and comms scheduled",
      "Adoption measurement in place",
    ],
  },
  {
    discipline: "VR",
    key: "EXECUTION",
    order: 5,
    title: "Execution & Monitoring",
    purpose:
      "Deliver the work packages, track progress against plan, manage risks and issues, and capture early wins.",
    keyQuestions: [
      "Are we on track against schedule and milestones?",
      "What risks and issues are active, and who owns them?",
      "What early wins can we capture and communicate?",
      "What course corrections are needed?",
    ],
    requiredInputs: ["Work breakdown & schedule", "Risk register"],
    tasks: [
      "Track work-package progress and milestones",
      "Manage the risk and issue log",
      "Capture early wins and course corrections",
      "Update track health (RAG)",
    ],
    artifacts: ["Progress status", "Risk & issue log", "Early-wins log"],
    exitCriteria: [
      "Progress tracked against the baselined schedule",
      "Risks and issues actively managed",
      "Track health kept current",
    ],
  },
  {
    discipline: "VR",
    key: "VALUE_TRACKING",
    order: 6,
    title: "Value Tracking & Reporting",
    purpose:
      "Measure actual performance against baseline and targets, and produce periodic value reports and QBR/EBR packs.",
    keyQuestions: [
      "What value has been realized vs planned to date?",
      "What is the variance and what is driving it?",
      "What is the executive value story and the next-best action?",
    ],
    requiredInputs: ["KPI actuals", "Benefit measurements"],
    tasks: [
      "Record KPI actuals each period",
      "Compute realized value and variance vs plan",
      "Produce the periodic value report",
      "Assemble the QBR / EBR pack",
    ],
    artifacts: ["Value report (periodic)", "QBR / EBR pack outline", "Planned-vs-realized view"],
    exitCriteria: [
      "KPI actuals recorded for the period",
      "Realized value and variance computed",
      "Value report / QBR pack produced",
    ],
  },
  {
    discipline: "VR",
    key: "CLOSEOUT",
    order: 7,
    title: "Close-Out & Lessons Learned",
    purpose:
      "Confirm realized benefits vs the business case, document lessons learned, and feed improvements back into VE templates and playbooks.",
    keyQuestions: [
      "What benefits were realized vs the original business case?",
      "What worked, what didn't, and what would we change?",
      "What should feed back into future VE studies and templates?",
    ],
    requiredInputs: ["Final KPI actuals", "Realized benefits", "Business case"],
    tasks: [
      "Confirm final realized benefits vs business case",
      "Document lessons learned",
      "Capture recommendations for future VE studies",
      "Close the track and update playbooks",
    ],
    artifacts: ["Close-out report", "Lessons-learned log", "Playbook updates"],
    exitCriteria: [
      "Final realized value confirmed against the business case",
      "Lessons learned documented",
      "Feedback routed to VE templates / playbooks",
    ],
  },
];

export const ALL_PHASES = [...VE_PHASES, ...VR_PHASES];
