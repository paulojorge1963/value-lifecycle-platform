# Capture Workbook Field Guides

One-page field guides for the three meeting-capture workbooks. Each mirrors the app 1:1; dropdowns use the app's own pick-lists. **Yellow cells = you fill in · grey = auto/computed · header rows = don't edit.** To import any of them:

```bash
npx tsx scripts/import-workbook.ts <file>.xlsx --dry-run   # preview, then drop --dry-run to write
```

Before importing: delete the greyed example rows (or add rows beneath them) and keep each table's rows contiguous.

---

## VE Discovery Workbook — Value Engineer, pre-sales

Use one workbook **per opportunity**, from the first discovery meeting through to a quantified business case. Afterwards you transcribe or import — you don't re-shape.

**The rhythm of a meeting**

- **Before:** open a fresh copy; set the client + solution profile (loads the right drivers/KPIs); send the client a short data-request list.
- **During:** capture facts *and their source*; get current-state numbers, the pain, and who owns which numbers; flag assumptions + a confidence rating.
- **After:** validate numbers with the client; finish the business-case calc; import (or transcribe) into the app.

**Tab by tab**

| Tab | Capture | Tip |
|---|---|---|
| 1 Engagement | study header | the profile drives the pick-lists |
| 2 Orientation | problem, scope, stakeholders | get a business sponsor, not just IT |
| 3 Baseline | current-state cost & pain | insist on sourced, honest numbers |
| 4 Functions | verb+noun, cost, worth | amber = cost ≫ worth = where value hides |
| 5 Alternatives | options per function | shortlist the ones worth developing |
| 6 Evaluation | weight & score 1–5 | set the weights before you score |
| 7 Recommendations | developed recs | ACCEPTED is the guard for handover |
| 8 Business case | cost/benefit line items | ROI/payback/NPV recompute live |
| 9 Handover pack | KPIs, baselines, success criteria | the baselines the VRM will measure |
| 10 Risks | risk register | score = likelihood × impact |

---

## VR Intake Workbook — Value Realization Manager, post-sale

For a track handed over from a study **or** a standalone track (software already in place). Same 7-phase lifecycle either way — the difference is where the baselines come from.

**The rhythm of a meeting**

- **Before:** set the track header; pick the origin (handover vs standalone); line up the baseline data source.
- **During:** confirm objectives & success criteria out loud; agree each KPI's source, frequency and owner; nail down work-package owners and dates.
- **After:** import; track actuals each period; run the QBR as a reconciliation; capture lessons.

**Tab by tab**

| Tab | Capture | Tip |
|---|---|---|
| 1 Track | header, origin, objectives | standalone = no source study |
| 2 Baselines | validate or establish | standalone: capture from what's live now |
| 3 Work packages | owned, dated work | tie each back to the value it delivers |
| 4 Adoption plan | training, comms, champions | most shortfalls are adoption, not product |
| 5 KPI tracker | targets + actuals by period | attainment vs baseline→target |
| 6 Benefits | planned vs realized | realized rolls up to the portfolio |
| 7 Risks & issues | risks to value | flag amber early |
| 8 QBR notes | value review | a reconciliation, not a story |
| 9 Lessons | what worked / to change | route recommendations back to VE |

---

## CS Intake Workbook — Customer Success Manager, post-sale

Use one workbook **per account / engagement** to capture the continuous Customer Success lifecycle. It **links** the account's studies & tracks rather than duplicating their value.

**The rhythm of a meeting**

- **Before:** open a fresh copy; set the account + solution profile; have the source study/track codes to hand; line up the health inputs.
- **During:** confirm objectives, success criteria and commitments; map stakeholders (influence × sentiment); agree the renewal date and any risks/gaps.
- **After:** score health and log actions; finish renewal & growth plans; import; keep the workbook as source-of-record.

**Tab by tab**

| Tab | Capture | Tip |
|---|---|---|
| 1 Account | engagement header | the profile drives the pick-lists |
| 2 Success plan | criteria, commitments | the promise you're held to |
| 3 Lifecycle | set each of the 8 stages | status per stage |
| 4 Stakeholders | influence & sentiment | find the detractors early |
| 5 Health | 5 factors 0–100 | overall + RAG computed on import |
| 6 Actions | owner, due, status | the governance action log |
| 7 Renewal | date, risks, procurement | make renewal a non-event |
| 8 Growth | triggers, target, narrative | the expansion case |
| 9 Links | VE/VR codes | CS references value, never copies it |

---

*A companion to the demo kit's [Runbook](ValueLifecycle-Runbook.md) and [Process Guide](ValueLifecycle-Process-Guide.md). Styled, branded one-page PDFs of each guide are maintained separately by the deploying organization.*
