# DemandForge AI

Discover authorised client project requests, analyse them with Gemini, generate static
HTML/CSS/JavaScript concept demos, and deploy approved demos to Vercel.

> **Concept demos only.** Demos use fictional copy and sample contact details. DemandForge
> does not send messages, automate Facebook actions, or bypass access controls.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript strict
- Tailwind CSS 4
- Supabase PostgreSQL + Auth + Row Level Security (SQL migrations in `supabase/migrations`)
- Google Gemini REST API (server-side, structured JSON output)
- Vercel REST API for static demo deployments
- Chrome Manifest V3 extension (TypeScript, esbuild)
- Vitest, Playwright, ESLint, Prettier

## Quick start

```bash
pnpm install
cp .env.example .env.local       # fill in Supabase + Gemini (+ optional Vercel) values
pnpm dev                          # http://localhost:3000
```

First run:

```bash
# 1. Create a Supabase project, then apply the schema
npx supabase link --project-ref <ref>
pnpm db:push

# 2. Generate a random `OWNER_SETUP_SECRET`, set it only in the server environment, and open `/setup`.
# 3. Create the owner account with that secret and verify the email.
# 4. Disable Supabase Auth's "Allow new users to sign up" setting after verification.
# 5. Optional: seed sample data for the owner profile
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

Vercel deployments additionally need `VERCEL_TOKEN` and the dedicated demo project
(`VERCEL_PROJECT_ID` / `VERCEL_PROJECT_NAME`). The queue worker needs `CRON_SECRET`; the
included `vercel.json` cron calls `/api/v1/jobs/run` every five minutes.

This is a personal single-user deployment. The owner can sign in concurrently from three PCs;
all private data is synchronized through Supabase. Public registration, teams, invitations,
subscriptions, and one-device session limits are intentionally not implemented.

## Commands

| Command                                            | Purpose                                               |
| -------------------------------------------------- | ----------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start`           | Next.js development and production                    |
| `pnpm typecheck`                                   | TypeScript, strict                                    |
| `pnpm typecheck:extension`                         | Extension TypeScript                                  |
| `pnpm lint` / `pnpm format`                        | ESLint / Prettier                                     |
| `pnpm test`                                        | Vitest unit + integration suite                       |
| `pnpm test:rls`                                    | Live Postgres RLS + queue harness (`SUPABASE_DB_URL`) |
| `pnpm test:e2e`                                    | Playwright smoke tests                                |
| `pnpm build:extension`                             | Bundle the Chrome extension into `extension/dist`     |
| `pnpm db:push` / `pnpm db:reset` / `pnpm db:types` | Supabase migrations and typed schema                  |

## Workflow

```
Authorised import → dedupe → Gemini analysis + score → lead dashboard
→ demo specification → generated HTML/CSS/JS → validation → sandboxed preview
→ human approval → Vercel deployment → outreach tracking
```

1. **Sources & rules** — group imports by origin and match keywords.
2. **Import** — manual paste/URL, or the user-initiated Chrome extension.
3. **Analysis** — durable job extracts requirements, budget/urgency/intent signals,
   quote-level evidence, and a deterministic 0–100 score.
4. **Demo studio** — Gemini writes a design specification; a deterministic renderer writes
   `index.html`, `assets/css/styles.css`, `assets/js/main.js`, `README.md`.
5. **Approve** — a human approves the exact validated artifact.
6. **Deploy** — the worker calls Vercel and stores the real deployment URL only after
   Vercel reports `READY`.

## Repository map

```
src/app/                 Pages and /api/v1 route handlers
src/components/          UI primitives, shell, toast, dialogs
src/features/            leads, sources, demo-studio, demos, outreach, settings
src/lib/                 supabase, gemini, demo, jobs, vercel, api, security, validation
src/types/database.ts    Typed database definitions
supabase/migrations/     Schema, RLS, queue functions
extension/               Chrome MV3 importer
tests/unit | rls | e2e  Test suites
docs/                    Product, architecture, operations
```

## Documentation

Start with [`docs/RULE.md`](docs/RULE.md) and [`AGENTS.md`](AGENTS.md), then
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), [`docs/API-SPECIFICATION.md`](docs/API-SPECIFICATION.md),
and [`docs/ENVIRONMENT-VARIABLES.md`](docs/ENVIRONMENT-VARIABLES.md).

Verification status, including what was not verified (live Gemini, live Vercel, hosted
Supabase auth), is recorded in [`docs/TEST-REPORT.md`](docs/TEST-REPORT.md) and
[`docs/KNOWN-LIMITATIONS.md`](docs/KNOWN-LIMITATIONS.md).

## Safety

- RLS on every user-owned table; ownership derives from `auth.uid()`.
- Service-role key, Gemini key, Vercel token, and cron secret stay server-side.
- Generated artifacts are validated (allowed paths, no external requests, no inline
  handlers, no frames, no `eval`, no secrets) and previewed in a sandboxed, opaque origin.
- Deployments require explicit human approval and never touch unrelated Vercel projects.
