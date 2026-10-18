# Troubleshooting

## Setup

### "Supabase is not configured" banner after `pnpm dev`

`NEXT_PUBLIC_SUPABASE_URL` and a key must be set in `.env.local` (restart the dev server —
public variables are inlined at build time). If your project uses legacy keys, set
`NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of the publishable key.

### Redirect loop on `/login`

`NEXT_PUBLIC_APP_URL` must match the origin you browse to (`http://localhost:3000` vs
`http://127.0.0.1:3000`). Set it explicitly and clear cookies for the origin.

### `supabase db push` fails on `create extension`

Managed Supabase has `pgcrypto`/`pg_trgm` available. On self-hosted Postgres install
`postgresql-contrib`, or comment the extension lines and use `gen_random_uuid()` natively
(PostgreSQL 13+).

### Generated types are out of date

```bash
supabase link --project-ref <ref>
pnpm db:types
```

If `supabase` CLI is unavailable, hand-edit `src/types/database.ts` to match the migration.

## Analysis

### `503 NOT_CONFIGURED` on analyze

`GEMINI_API_KEY` is missing. Add it and restart the server. The toast names the variable; the
value is never rendered.

### `429 RATE_LIMITED` from Gemini

The provider quota is exhausted. Jobs retry with backoff up to 3 attempts, then fail with
`rate_limited`. Confirm the model in `GEMINI_MODEL` is enabled for your key and check quota at
Google AI Studio. Usage rows with `error_code` are visible in Settings → AI usage.

### Analysis says "unknown" for budget or urgency

Intentional. The model is instructed never to invent budget, deadline, or purchase intent.
Unknown values keep `budget_status = 'unknown'` and contribute 0 points.

### `invalid_response` after retries

The model returned JSON that failed Zod validation (truncation, wrong enum). Check the job's
`last_error`, then re-run analysis. Lowering `maxOutputTokens` is not the fix; raise it if
truncation is the cause (`src/lib/gemini/client.ts`).

## Jobs

### Jobs stay `queued`

The worker only runs via `/api/v1/jobs/run` with `Authorization: Bearer $CRON_SECRET`. Locally:

```bash
curl -X POST http://localhost:3000/api/v1/jobs/run -H "Authorization: Bearer $CRON_SECRET"
```

Without `CRON_SECRET` the endpoint rejects every request by design. On Vercel, confirm the cron
in `vercel.json` and that the project has the variable set.

### Jobs stuck in `running`

Locks older than 300s are recovered by `recover_stale_jobs(300)` on the next worker tick. If a
job keeps returning to `queued`, check `attempt_count` against `max_attempts`; exhausted jobs are
marked `failed` with the last error.

### Duplicate jobs

Enqueue uses idempotency keys (`analyze:<lead>:<hash>`). A repeat request returns the existing
job instead of creating another. Different content hashes intentionally create new jobs.

## Demos

### "Lead must be analysed first"

Create a demo only after analysis succeeds (`analysis_status = 'analyzed'`). Run analysis from
the lead detail page.

### Generation fails with a validation error

The validator rejected unsafe or malformed files (inline script, external URL, `eval`, size
limit). The message names the rule. Re-generate; if it repeats, the prompt or renderer is the
cause, not the model alone — check `docs/DEMO-GENERATION.md` rules.

### Preview is blank

Check the browser console for a CSP violation. The preview route sets
`sandbox allow-scripts` and the iframe omits `allow-same-origin`; scripts that touch cookies or
storage are blocked by design. A blank frame also appears if the artifact row is missing — the
page then offers a download or regeneration instead.

### Deploy button disabled

Either the demo is not approved (approve first; regeneration clears approval) or Vercel is not
configured. Settings → Integrations lists missing variable names.

## Deployment

### `503 NOT_CONFIGURED` on deploy

Set `VERCEL_TOKEN` and `VERCEL_PROJECT_ID` (or `VERCEL_PROJECT_NAME`). For team projects,
`VERCEL_TEAM_ID` is also required.

### "Vercel rejected the access token"

The token is invalid or revoked. Create a new one at `https://vercel.com/account/tokens` with
access to the team that owns the demo project.

### "Project scope mismatch"

A `VERCEL_PROJECT_NAME` different from the dedicated demo project without a `VERCEL_PROJECT_ID`
is refused so deployments cannot touch unrelated projects. Set the numeric project id.

### Build fails on Vercel

The demo has no build step. A failure usually means project settings inject a framework or build
command. Clear framework/build/output settings on the demo project, or set them to none. The
Vercel error message is stored on the deployment row and shown in the UI.

## Extension

### "Host permission denied"

The popup requests access to your dashboard origin. Accept the prompt; HTTPS is required except
for `localhost`/`127.0.0.1`. Reload the extension after changing the URL.

### "Unauthorized" in the popup

The token was revoked or copied incorrectly. Create a new token in Settings → Integrations. The
plaintext is shown only once.

### "This tab is not a supported Facebook page"

Capture is limited to `facebook.com` post pages and runs only on click. Private groups or posts
you cannot read will not work — use manual paste instead.

### Duplicate shown on import

Expected: the canonical URL or content hash already exists for your account. The response links
to the existing lead.

## Testing

### `pnpm test:rls` cannot connect

Set `SUPABASE_DB_URL` to a scratch database (local Supabase: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`).
The harness creates and drops its own schema objects; do not point it at production.

### Playwright cannot launch Chromium

```bash
pnpm exec playwright install chromium
```

### E2E fails on the port

`playwright.config.ts` starts the dev server on 3000. Stop an existing `pnpm dev` first, or set
`PLAYWRIGHT_BASE_URL` to a running instance.
