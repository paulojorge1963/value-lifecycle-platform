// =============================================================================
//  Customer Success lifecycle — the 8 continuous stages.
//  Mirrors the attached CS Process Flow; rendered as guidance on the engagement
//  page (no template table needed). Keys match the CsStageKey enum in the schema.
// =============================================================================

export interface CsStageDef {
  key: string;
  order: number;
  title: string;
  objective: string;
  keyActivities: string[];
  exitCriteria: string[];
  output: string;
}

export const CS_STAGES: CsStageDef[] = [
  {
    key: "HANDOVER",
    order: 1,
    title: "Handover",
    objective: "Capture the promise from Sales and ensure a successful transition to Customer Success.",
    keyActivities: [
      "Capture customer objectives & success criteria",
      "Identify stakeholders",
      "Document commitments, risks & assumptions",
      "Create the Customer Success Plan",
    ],
    exitCriteria: ["Objectives & success criteria captured", "Stakeholders identified", "Customer Success Plan created"],
    output: "Customer Success Plan",
  },
  {
    key: "ONBOARDING",
    order: 2,
    title: "Onboarding",
    objective: "Get the customer live, enabled and confident.",
    keyActivities: [
      "Kick-off & align on goals, roles & timelines",
      "Review the success plan",
      "Technical setup & integration",
      "Training plan",
      "Define the governance rhythm",
    ],
    exitCriteria: ["Customer live and enabled", "Training delivered", "Governance rhythm agreed"],
    output: "Onboarding plan",
  },
  {
    key: "ADOPTION",
    order: 3,
    title: "Adoption",
    objective: "Drive meaningful usage and engagement.",
    keyActivities: [
      "Track usage & activity",
      "Monitor feature adoption",
      "Identify adoption gaps",
      "Enable users & teams; drive best-practice use",
      "Review & remove adoption blockers",
    ],
    exitCriteria: ["Target usage reached", "Adoption blockers cleared"],
    output: "Adoption Tracker",
  },
  {
    key: "VALUE_REALISATION",
    order: 4,
    title: "Value Realisation",
    objective: "Prove measurable business value and outcomes.",
    keyActivities: [
      "Define value metrics & baselines",
      "Collect data & evidence; quantify benefits",
      "Capture stories & impact",
      "Maintain the Value Register",
      "Communicate value regularly",
    ],
    exitCriteria: ["Value quantified vs baseline", "Value communicated to the customer"],
    output: "Value Register (from linked VR tracks)",
  },
  {
    key: "HEALTH_MANAGEMENT",
    order: 5,
    title: "Health Management",
    objective: "Monitor health and manage risk early to protect outcomes and revenue.",
    keyActivities: [
      "Score customer health",
      "Review risks & issues",
      "Ensure executive alignment",
      "Monitor support health; track renewal signals",
      "Create & execute action plans",
    ],
    exitCriteria: ["Health scored", "Risks owned with action plans"],
    output: "Health Scorecard",
  },
  {
    key: "GOVERNANCE_RHYTHM",
    order: 6,
    title: "Governance Rhythm",
    objective: "Stay aligned and proactive with a structured cadence.",
    keyActivities: [
      "Operational check-ins (weekly/monthly)",
      "Success reviews (monthly/quarterly)",
      "Executive business reviews (QBR / EBR)",
      "Track actions and commitments",
    ],
    exitCriteria: ["Cadence running", "Actions & commitments tracked"],
    output: "Action Log + QBR / EBR decks",
  },
  {
    key: "RENEWAL_MANAGEMENT",
    order: 7,
    title: "Renewal Management",
    objective: "Make renewal a natural result of proven value.",
    keyActivities: [
      "Confirm renewal date & stakeholders",
      "Review value & usage; address risks & gaps",
      "Engage procurement",
      "Build the business case",
      "Create the renewal plan (6–9 months out)",
    ],
    exitCriteria: ["Renewal plan in place", "Renewal secured"],
    output: "Renewal Plan",
  },
  {
    key: "EXPANSION_GROWTH",
    order: 8,
    title: "Expansion & Growth",
    objective: "Grow relevance and value across the business.",
    keyActivities: [
      "Identify expansion triggers & opportunities",
      "Build, prioritise & validate the business case",
      "Engage the account team",
      "Execute the growth plan; realise additional value",
    ],
    exitCriteria: ["Expansion opportunities qualified", "Growth plan in execution"],
    output: "Growth Plan",
  },
];

export const CS_STAGE_TITLE: Record<string, string> = Object.fromEntries(CS_STAGES.map((s) => [s.key, s.title]));
