# Deploying to Vercel

The Value Lifecycle Platform is a **Next.js 15** app (App Router, server actions) with
**Prisma + PostgreSQL** and **Auth.js v5**. It deploys cleanly on **Vercel** with a
serverless Postgres. This guide is the recommended path.

## Recommended stack

| Piece | Recommendation | Why |
|---|---|---|
| Host | **Vercel** | First-class Next.js 15 support; the repo is already GitHub-connected. |
| Database | **Neon** (Postgres) | Serverless-native, generous free tier, pooled connections. You already use Neon for PathwayPM. (Supabase or Vercel Postgres — now Neon-powered — also work.) |
| Auth | Auth.js v5 (in-repo) | Credentials provider; needs only `AUTH_SECRET` + `AUTH_TRUST_HOST`. |
| AI (optional) | Anthropic API | Only for the AI-assist buttons; the app runs fine without it. |

The repo is **already deploy-ready**: `build` runs `prisma generate && next build`, a
`postinstall` regenerates the client, every DB page is `force-dynamic` (no build-time DB
prerender), the Prisma client is a singleton (serverless-safe), and `serverExternalPackages`
is set for the ExcelJS/docx server code.

## Step 1 — Provision the database (Neon)

1. Create a Neon project (region close to your Vercel region — e.g. AWS `eu-west-1`).
2. From the Neon dashboard, copy **two** connection strings:
   - **Pooled** (host contains `-pooler`) → this becomes `DATABASE_URL`.
   - **Direct** (no `-pooler`) → this becomes `DIRECT_URL`.
   - Keep `?sslmode=require` on both.

## Step 2 — Create the schema and seed (once, from your machine)

Point your local env at Neon temporarily (or use a `.env.production.local`) and run:

```bash
DATABASE_URL="<neon-pooled-url>" DIRECT_URL="<neon-direct-url>" npx prisma db push
DATABASE_URL="<neon-pooled-url>" DIRECT_URL="<neon-direct-url>" npm run db:seed
```

`db push` creates the tables (this repo uses the db-push workflow — no migrations folder);
`db:seed` loads the demo org, users and the hero VE-2026-014 → VR-2026-014 example.

> **Deploy note:** the app adds columns over time (e.g. `Organization.showMembersOnLogin`).
> After pulling a new version, re-run `prisma db push` against the database.

## Step 3 — Import the repo into Vercel

1. In Vercel: **Add New… → Project → Import** `paulojorge1963/value-lifecycle-platform`.
2. Framework preset: **Next.js** (auto-detected). Build & install commands: leave default
   (Vercel uses `npm run build`, which already runs `prisma generate`).
3. Node version: **20** (a `.nvmrc` / `engines` pins this).

## Step 4 — Environment variables (Vercel → Project → Settings → Environment Variables)

Set these for **Production** (and Preview if you want branch deploys):

| Variable | Value |
|---|---|
| `DATABASE_URL` | the Neon **pooled** URL |
| `DIRECT_URL` | the Neon **direct** URL |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `ANTHROPIC_API_KEY` | *(optional)* your Anthropic key for AI assist |

Auth.js v5 auto-detects the deployment URL on Vercel, so `AUTH_URL`/`NEXTAUTH_URL` are not
required — `AUTH_TRUST_HOST=true` is what matters behind the proxy.

## Step 5 — Deploy

Trigger a deploy (push to `main`, or **Redeploy**). Vercel installs (→ `prisma generate`),
builds, and serves. Open the URL and sign in with a demo role.

## After going live

- **Change the demo passwords** (or remove demo users) before sharing widely — the seed
  sets a shared demo password (in `prisma/seed.ts`), so rotate it. Use the Team page
  (**Set password**) or re-seed.
- **Lock down the login picker** if the workspace shouldn't list members publicly — toggle
  it off on the Team page (**Sign-in screen** switch).
- **Custom domain**: add it in Vercel → Domains.

## Troubleshooting

- **`prisma generate` errors on build** → ensure `DATABASE_URL` + `DIRECT_URL` are set (both).
- **"too many connections"** → confirm `DATABASE_URL` is the **pooled** Neon URL, not the direct one.
- **Login redirect loop / CSRF** → confirm `AUTH_TRUST_HOST=true` and `AUTH_SECRET` are set.
- **Empty app** → the database wasn't seeded; re-run Step 2 against the production DB.
