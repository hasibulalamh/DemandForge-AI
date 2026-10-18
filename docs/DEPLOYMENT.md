# Deployment

## Prerequisites

- Node 20+, pnpm 11
- Supabase project
- Vercel account (dashboard + demo project)
- Gemini API key

## 1. Supabase

```bash
supabase link --project-ref <ref>
supabase db push                 # applies supabase/migrations/*
psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # optional demo data
pnpm db:types                    # regenerate src/types/database.ts (linked project)
```

Create the first user in **Authentication → Users** (or via `/login` → sign up if enabled).
The `handle_new_user` trigger creates the profile automatically.

Enable email confirmation for production and configure the site URL and redirect URLs to your
deployment origin.

## 2. Vercel dashboard app

1. Import the `demandforge` directory as the project root.
2. Framework preset: Next.js. Build: `pnpm build`. Install: `pnpm install`.
3. Set environment variables from `docs/ENVIRONMENT-VARIABLES.md`.
4. Deploy. `vercel.json` registers the cron:

```json
{ "crons": [{ "path": "/api/v1/jobs/run", "schedule": "*/5 * * * *" }] }
```

5. Set `CRON_SECRET` in Vercel; Vercel sends `Authorization: Bearer <CRON_SECRET>` to the cron.
6. Optionally trigger the worker manually:

```bash
curl -X POST https://<app>/api/v1/jobs/run -H "Authorization: Bearer $CRON_SECRET"
```

## 3. Demo hosting project

Create a second, empty Vercel project (`demandforge-demos`) used only for generated demos.
Set `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, `VERCEL_PROJECT_NAME`. See
`docs/VERCEL-DEPLOYMENT.md`.

## 4. Chrome extension

```bash
pnpm build:extension   # writes extension/dist
```

Chrome → `chrome://extensions` → Developer mode → Load unpacked → `demandforge/extension/dist`.
Create a token in Settings → Integrations, paste it in the popup, set the dashboard URL.

## 5. Verification after deploy

```bash
curl -s https://<app>/api/v1/health | jq
```

Expect `{ "status": "ok", ... }` with `integrations` flags reflecting configured services.

Then: sign in, import a lead, analyze, generate a demo, approve, deploy, and confirm the live
URL. Check **Settings → AI usage** and **Deployments** for the expected records.

## Rollback

- App: Vercel → Deployments → promote the previous build.
- Database: migrations are forward-only; restore from a Supabase backup or write a compensating
  migration. Never edit an applied migration file.
- Demos: previous immutable deployment URLs remain live even after newer demos deploy.

## Operations

| Task                 | How                                                                           |
| -------------------- | ----------------------------------------------------------------------------- |
| Watch jobs           | `/api/v1/jobs` or `jobs` table (`status`, `attempt_count`, `last_error`)      |
| Recover stuck jobs   | The worker's stale recovery runs each tick; or call `recover_stale_jobs(300)` |
| Audit trail          | `audit_events` (approvals, deployments, token changes)                        |
| Cost monitoring      | Settings → AI usage; `ai_usage` table                                         |
| Rotate a token       | Create a new one, update the extension, delete the old row                    |
| Rotate provider keys | Update env in Vercel, redeploy                                                |
