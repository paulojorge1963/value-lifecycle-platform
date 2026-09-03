# Contributing

Thanks for your interest in the **Value Lifecycle Platform**. This guide covers how to get set up, the conventions the codebase follows, and how to propose changes.

New to the project? Read the [User Guide](USER_GUIDE.md) for what the app does and the [ARCHITECTURE](ARCHITECTURE.md) for how it's built.

## Ways to contribute

- **Report a bug** or **request a feature** — open an issue; the templates will guide you.
- **Improve docs** — the README, User Guide, or architecture notes.
- **Send a pull request** — see the workflow below.

## Local setup

Prerequisites: **Node 18+** and a local **PostgreSQL**.

```bash
npm install
cp .env.example .env          # set DATABASE_URL; generate AUTH_SECRET with: openssl rand -base64 32
createdb value_consultancy
npx prisma db push            # create schema + generate the Prisma client
npm run db:seed               # industries, phases, KPIs, templates + demo data
npm run dev                   # http://localhost:3200
```

Sign in at `/login` with a demo account — e.g. `ve@demo.app`, `vrm@demo.app`, `reviewer@demo.app`, `viewer@demo.app`.

## Project layout

| Path | What lives there |
|---|---|
| `src/app/**` | Next.js App Router pages (`/ve`, `/vr`, `/portfolio`, `/kpis`, `/templates`, `/login`) and API routes |
| `src/lib/domain/*.ts` | **The config layer** — industry profiles, phase guidance, KPI catalogue, content templates. Seeded into the DB. |
| `src/lib/actions.ts` | Server actions (mutations: phases, functions, alternatives, recommendations, handover, KPIs, comments, versions, AI) |
| `src/lib/finance.ts` · `evaluation.ts` · `ai.ts` · `auth.ts` · `session.ts` | Finance engine, evaluation-matrix maths, AI drafting, Auth.js config, RBAC |
| `src/components/**` | Client components (editors, dashboards, controls) |
| `prisma/schema.prisma` · `prisma/seed.ts` | Data model and seed |

## Development workflow

1. **Branch** off `main` (`git checkout -b feat/short-description`).
2. Make focused changes — one logical change per PR is easier to review.
3. **Match the surrounding code**: TypeScript (strict), Tailwind utility classes, the existing naming and comment density. VE surfaces use the blue accent, VR surfaces emerald.
4. Before pushing, run:
   ```bash
   npx tsc --noEmit        # must pass
   npm run lint            # optional but appreciated
   ```
5. Open a PR against `main`, describe **what** changed and **why**, and link the issue it closes (`Closes #123`).

### Verifying changes

If a change is visible in the app, check it against the running dev server rather than by eye. If you touch the data model, re-run `npm run db:seed` and confirm the demo still loads.

> **Gotcha:** don't run `npm run build` (a production build) while `npm run dev` is running — they share the `.next` directory and a mixed dev/prod cache stops client components from hydrating (symptom: buttons are dead, no console error). If it happens: stop the dev server, `rm -rf .next`, and restart.

## Extending the domain (no engine changes)

Industries, KPIs, phase guidance, and starter-text templates are **configuration, not code**:

1. Edit the relevant file in `src/lib/domain/` (`industries.ts`, `kpis.ts`, `phases.ts`, `templates.ts`).
2. Run `npm run db:seed` to load it.

Adding a new industry profile or KPI needs no changes to the pages or server actions.

## Database changes

Edit `prisma/schema.prisma`, then:

```bash
npx prisma db push        # regenerates the client too
```

Restart the dev server after a schema change so the running process picks up the new Prisma client. Production should move to versioned `prisma migrate` (see the README production notes).

## Commit & PR conventions

- Present-tense, imperative commit subjects (`Add evaluation-matrix export`, not `Added…`).
- Keep PRs scoped; include screenshots for UI changes.
- Fill in the issue templates when filing issues so maintainers have enough to reproduce or evaluate.

## License

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
