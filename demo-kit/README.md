# Value Lifecycle Platform — Demo Kit

**Platform version:** v0.3.1 · **Companion packs:** Workshop Guide pack v1.5.0 · Value Study decks v1.2.0 — see [Release history](#release-history) · [all releases on GitHub](https://github.com/paulojorge1963/value-lifecycle-platform/releases)

**Deploy your own:** [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpaulojorge1963%2Fvalue-lifecycle-platform&env=DATABASE_URL,DIRECT_URL,AUTH_SECRET,AUTH_TRUST_HOST&envDescription=Neon%20Postgres%20pooled%20%2B%20direct%20URLs%2C%20an%20Auth.js%20secret%20(openssl%20rand%20-base64%2032)%2C%20and%20AUTH_TRUST_HOST%3Dtrue&envLink=https%3A%2F%2Fgithub.com%2Fpaulojorge1963%2Fvalue-lifecycle-platform%2Fblob%2Fmain%2FDEPLOYMENT.md&project-name=value-lifecycle-platform&repository-name=value-lifecycle-platform) &nbsp; needs a Postgres DB (Neon) created and seeded first — see [DEPLOYMENT.md](../DEPLOYMENT.md).

Deliverables for demoing and explaining the **Value Lifecycle Platform** — one workspace across three roles: the **Value Engineer** (8-phase VE Job Plan), the **Value Realization Manager** (7-phase realization lifecycle) with a first-class handover between them, and the **Customer Success Manager** (continuous 8-stage engagement that references — never duplicates — the account's studies and tracks).

| File | What it is | Use it to… |
|---|---|---|
| **ValueLifecycle-Demo-Script.docx** | A timed, click-by-click live demo script with a talk-track and objection handling | Run a ~22 min live demo (there's a 12-min cut too) |
| **ValueLifecycle-User-Guide.docx** | A how-to guide covering the whole workflow and every module | Onboard a new user / hand to a customer |
| **ValueLifecycle-Solution-Overview.pptx** | A 14-slide PowerPoint explaining the solution | Present to leadership / include in a proposal |
| **ValueLifecycle-Design-Document.docx** | A design document with the workflow & architecture as diagrams (images baked in) | Explain the design; share on OneDrive where images must render |
| **ValueLifecycle-Process-Guide.docx** | A practitioner's guide to the full VE → handover → VRM process, phase by phase, with six flow diagrams — including the standalone VRM path for software already in place | Train the team / learn the method end to end |
| **ValueLifecycle-Runbook.md** | A step-by-step operator's runbook — run the app, fill in the capture workbooks, and import them | Set up / operate the app end to end |
| **ValueLifecycle-Field-Guides.md** | One-page field guides for the three capture workbooks (VE Discovery, VR Intake, CS Intake) | Hand to a VE / VRM / CSM before a client meeting |

Each document is also provided as **Markdown source** (`*.md`) — the editable originals — and the demo script, user guide, design document and process guide each ship as a **PDF** for quick sharing. The solution overview ships as both **.pptx** (editable) and **.pdf**.

The design document's `.docx` and `.pdf` have the five diagrams embedded as images (so they render anywhere, including OneDrive/Word). The `.md` version references the same images from `diagrams/` and renders in GitHub, VS Code and Obsidian.

The `diagrams/` subfolder holds the source diagram images (`.svg` + `.png`). The `*.js` files are the generators for the deck, the Word docs, and the diagrams — keep them to tweak/regenerate, or delete.

## What's in the kit

```
demo-kit/
├─ ValueLifecycle-Demo-Script.md / .docx / .pdf     ← live demo walkthrough
├─ ValueLifecycle-User-Guide.md / .docx / .pdf      ← everyday how-to
├─ ValueLifecycle-Design-Document.md / .docx        ← design + diagrams
├─ ValueLifecycle-Process-Guide.md / .docx / .pdf   ← end-to-end process (learning guide)
├─ ValueLifecycle-Runbook.md                        ← operator runbook (run + capture + import)
├─ ValueLifecycle-Field-Guides.md                   ← one-page guides for the capture workbooks
├─ ValueLifecycle-Solution-Overview.pptx / .pdf     ← leadership deck
├─ diagrams/                                        ← 5 design diagrams (.svg + .png)
├─ guide-diagrams/                                  ← 6 process-guide diagrams (.svg + .png)
├─ make-diagrams.js · md2docx.js · build-design-docx.js ·
│  build-deck.js · make-process-diagrams.js · build-process-docx.js   ← regenerators
└─ README.md
```

## The process guide — what it covers

`ValueLifecycle-Process-Guide` is a phase-by-phase learning guide to the whole method, with six flow diagrams and a worked example. Its sections:

1. Introduction — what VE & VRM are and why they matter
2. The value lifecycle at a glance — including the **two ways a track starts**
3. Roles & responsibilities
4. **Part A** — the 8-phase Value Engineering process
5. The handover — the first-class bridge
   - **5.1 · When there's no study — standalone realization** *(start VRM directly for software already in place)*
6. **Part B** — the 7-phase Value Realization process
7. Measuring value — the business case & KPIs
8. Governance, artifacts & the enabling platform
9. A worked example, end to end
10. Good practice & common pitfalls
11. Roles glossary & key terms
12. Quick-reference checklists

The **standalone VRM path** (new §5.1, and threaded through the lifecycle overview, the Part B intro, the Intake & Baseline phases, the glossary and the VR checklist) mirrors the app's **"New realization track"** flow — running the 7-phase realization lifecycle with no VE study, for an existing deployment, with baselines set from what's already live.

## The five diagrams

1. **Value lifecycle** — the 8-phase VE Job Plan → handover → 7-phase realization lifecycle.
2. **Industry as configuration** — the core engine plus three industry profiles.
3. **Data to documents** — study/realization data → finance & export engine → Word/Excel.
4. **Architecture** — Next.js UI → server actions/API → Prisma → PostgreSQL, with Auth.js and the optional Anthropic seam.
5. **The handover** — the marquee flow: accepted recommendations become a seeded realization track.

## Regenerating (optional)

Run these with `node` from the **project root** (they use the project's `docx` / `sharp`):

```bash
node demo-kit/make-diagrams.js        # rebuild diagrams/*.svg + *.png
node demo-kit/md2docx.js              # rebuild Demo-Script.docx + User-Guide.docx from the .md
node demo-kit/build-design-docx.js    # rebuild Design-Document.docx (embeds the PNGs)
node demo-kit/make-process-diagrams.js # rebuild guide-diagrams/*.png (the process-guide flow diagrams)
node demo-kit/build-process-docx.js   # rebuild Process-Guide.docx (embeds the PNGs)

npm i -D pptxgenjs                     # deck only: install the generator ad-hoc, then:
node demo-kit/build-deck.js           # rebuild Solution-Overview.pptx
npm uninstall pptxgenjs                # and remove it again when done
```

PDFs were produced by printing the styled Markdown to PDF with headless Chrome (the three documents) and by exporting the `.pptx` to PDF (the deck). Regenerate a document PDF after editing its `.md`; regenerate the deck PDF after editing `build-deck.js` and rebuilding the `.pptx`.

> `pptxgenjs` is **not** a committed dependency — it pulls a vulnerable transitive `image-size` (a dev-only image-parsing DoS, irrelevant to generating a deck). Install it ad-hoc only when regenerating the deck, as shown above, so it stays out of the shipped dependency tree.

## Companion packs

Two private Blue Turtle packs complement this kit (access-controlled; links resolve only for authorised accounts):

| Pack | What it is |
|---|---|
| **[Discovery Workshop Guide pack](https://github.com/paulojorge1963/blueturtle-workshop-guide-pack)** *(private)* | The workshop-guide workbook, the per-metric "who owns this number" checklist, agendas for the 12 VE / VR / CS discovery workshops, a value-provenance cheat-sheet + facilitator question bank, and **field-and-column dictionaries for the VE / VR / CS capture workbooks** — for running discovery and securing baselines before the templates are filled. |
| **[Value Study intro decks](https://github.com/paulojorge1963/blueturtle-value-study-decks)** *(private)* | Client-facing decks (and matching emails) to win buy-in for a Value Lifecycle study, plus a reusable template — and **VE→VR→CS sample demo kits** (Investec, Nedbank ×2, Sasol) for demoing the sample data end to end. |

## Release history

The platform is versioned on GitHub — [paulojorge1963/value-lifecycle-platform](https://github.com/paulojorge1963/value-lifecycle-platform/releases). Recent releases:

| Version | What changed |
|---|---|
| **[v0.3.1](https://github.com/paulojorge1963/value-lifecycle-platform/releases/tag/v0.3.1)** | **Now live on Vercel + Neon.** Login hardened for public deploys — the member picker is **off in production** by default and the demo password moved to the `DEMO_PASSWORD` env var (no literal in the repo). Modernized UI palette — **indigo** (VE) · **teal** (VR) on a **zinc** neutral. Deploy + login docs aligned across the README, `DEPLOYMENT.md` and the demo kit. |
| **[v0.3.0](https://github.com/paulojorge1963/value-lifecycle-platform/releases/tag/v0.3.0)** | Advanced UI polish (Inter typography, layered shadows, accent-aware active nav, focus rings) and Vercel deploy-readiness (Prisma `directUrl`, `DEPLOYMENT.md`, production-build fix). |
| **[v0.2.3](https://github.com/paulojorge1963/value-lifecycle-platform/releases/tag/v0.2.3)** | Per-workspace opt-out to hide a workspace's members from the login picker — admin toggle on the Team page. |
| **[v0.2.2](https://github.com/paulojorge1963/value-lifecycle-platform/releases/tag/v0.2.2)** | Login screen: **pick a workspace, then a member** to sign in. The demo workspace stays one-click; real workspaces prefill the member's email and require their own password. |
| **[v0.2.1](https://github.com/paulojorge1963/value-lifecycle-platform/releases/tag/v0.2.1)** | Login screen shows the demo workspace name *(superseded by v0.2.2)*. |
| **[v0.2.0](https://github.com/paulojorge1963/value-lifecycle-platform/releases/tag/v0.2.0)** | Team management: bring an **existing account** into a workspace instead of erroring on a duplicate email. (Also since 0.1.0: in-app workbook import, and the `dev_productivity` / `onboarding_time` KPIs.) |

> Some releases add database columns — deploying a new version may need `prisma db push` (or a migration). Each release note flags this.

The [companion packs](#companion-packs) are versioned separately:

| Pack | Recent releases |
|---|---|
| **[Discovery Workshop Guide pack](https://github.com/paulojorge1963/blueturtle-workshop-guide-pack/releases)** | **v1.5.0** VR & CS Intake workbook dictionaries · **v1.4.0** VE Discovery Workbook dictionary · **v1.3.0** facilitator question bank · **v1.2.0** value-provenance cheat-sheet · **v1.1.0** 12-workshop agendas · **v1.0.0** workbook, Metric Owners checklist & filled sample |
| **[Value Study intro decks](https://github.com/paulojorge1963/blueturtle-value-study-decks/releases)** | **v1.2.0** VE→VR→CS sample demo kits · **v1.1.0** method & accuracy slides · **v1.0.0** reusable template deck + a tailored client deck |

## Notes

- All deliverables were validated to open cleanly and were spot-checked as rendered pages. Give them a quick look in Word / PowerPoint on your fonts before presenting — the Word docs use the platform's **VE-blue** accent for headings; the deck uses the full **VE-blue / VR-emerald** brand.
- Demo logins (local demo): on the sign-in screen, choose the **Meridian Value Advisory · demo** workspace and click a role to sign in one-click — Value Engineer, Value Realization Manager, Customer Success Manager, Reviewer, Stakeholder/Viewer or Administrator (`ve@demo.app`, `vrm@demo.app`, `cs@demo.app`, `admin@demo.app`, …). One-click needs `DEMO_PASSWORD` set (otherwise pick a member and type the password); the member picker is **off in production** by default. Hero example: study `VE-2026-014` → track `VR-2026-014`.
- See the repo root for [`README.md`](../README.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md) and [`USER_GUIDE.md`](../USER_GUIDE.md).
