# Changelog

All notable changes to DemandForge AI. Dates follow the repository's migration timeline.

## Unreleased

- Enforced the personal single-owner model with a race-safe, verified initial-owner claim,
  server-only setup secret, provider-level signup-disable procedure, and multi-device sessions.
- Added email verification callback handling plus password reset request and update flows.
- Added RLS-harness checks for anonymous private-data denial and post-initialization signup blocking.
- Repaired security-test typings and awaited Supabase query results without weakening BOLA/IDOR,
  SSRF, file-handling, deployment-approval, or secret-exposure assertions.

## [0.1.0] — 2026-10-17

First complete implementation: lead discovery → analysis → demo generation → approval →
deployment → outreach.

### Added — Foundation

- Next.js 16 App Router with React 19, strict TypeScript, Tailwind CSS 4.
- Design system (neutral surfaces, violet accent), app shell with sidebar/topbar, responsive
  layouts, light theme, accessible focus states.
- Login, signup, logout via Supabase Auth; session refresh and protected-route redirects in
  `src/proxy.ts`; CSP, `X-Frame-Options`, referrer and permissions policies.
- Supabase browser/SSR/admin clients; `server-only` boundary for privileged modules.

### Added — Database

- Migrations for enums, `profiles`, `sources`, `collection_rules`, `leads`, `demo_projects`,
  `demo_artifacts`, `jobs`, `job_attempts`, `deployments`, `outreach_records`, `ai_usage`,
  `audit_events`, `api_tokens`.
- Indexes, unique constraints (`user_id` + canonical URL, `user_id` + content hash, job
  idempotency key), `updated_at` and profile-creation triggers.
- RLS on all user-owned tables with parent-ownership checks for artifacts, attempts, deployments.
- Queue functions `claim_jobs` (SKIP LOCKED, attempt caps) and `recover_stale_jobs`, executable
  only by `service_role`.
- Seed data.

### Added — Sources and leads

- Sources CRUD with connection status and safe metadata; collection rules with keywords,
  excluded keywords, categories, enable toggle.
- Manual import with canonical URL and content-hash deduplication (returns existing lead).
- Lead list with search, pipeline/analysis/category filters, sorting, pagination.
- Lead detail with original text, source link, evidence quotes, score breakdown, signals, jobs.
- Pipeline status updates and lead deletion.

### Added — Analysis

- Server-side Gemini client: header auth, JSON response schema, 60s timeout, 3 attempts with
  exponential backoff and jitter, error classification.
- Zod validation of analysis output; budget normalization that never invents amounts.
- Deterministic, explainable 7-factor scoring (0–100) with stored breakdown and weights version.
- `ai_usage` recording with token counts and estimated cost.

### Added — Jobs

- Durable Postgres queue with atomic claiming, idempotency keys, retry/backoff, max attempts,
  stale-lock recovery, and per-attempt history.
- Handlers: `analyze_lead`, `generate_demo`, `deploy_demo`.
- Worker endpoint `/api/v1/jobs/run` guarded by `CRON_SECRET`; Vercel cron every 5 minutes.

### Added — Demos

- `DemoGenerationService`: Gemini design specification → deterministic renderer → manifest.
- Three templates producing `index.html`, `assets/css/styles.css`, `assets/js/main.js`,
  `README.md`.
- Validator rejecting inline scripts/handlers, frames, forms, external URLs, `eval`/`fetch`/
  cookies/storage, syntax errors, oversized files, and secret markers; re-run before deploy.
- Sandboxed preview (CSP `sandbox`, opaque-origin iframe) and self-contained download.
- Explicit approval gate; regeneration clears approval.

### Added — Deployment

- `VercelDeploymentService` using inline-file deployments into a dedicated project, with
  team/project scoping, URL validation, status polling, history, and error persistence.
- Deploy job requires current approval; retries poll instead of duplicating builds.

### Added — Outreach and operations

- Outreach drafts per lead with channel, content, status transitions and timestamps; statistics.
- Settings: profile, integration status (names of missing variables only), API tokens, AI usage,
  account deletion with typed confirmation.
- Audit events for approvals, deployments, token lifecycle, account deletion.
- `df_` extension tokens hashed at rest, shown once, revocable.

### Added — Chrome extension

- Manifest V3, TypeScript, popup + service worker, no persistent content script.
- Click-only capture of the active Facebook post tab, text review before import, runtime host
  permission request, rule hint, duplicate feedback, token storage in `chrome.storage.local`.
- esbuild bundle script (`pnpm build:extension`).

### Added — Documentation and tests

- Full documentation set (`README`, `AGENTS`, `RULE`, PRD, SCOPE, acceptance criteria, design,
  TRD, architecture, appflow, diagrams, schema, migrations, API spec, auth/RLS, implementation
  guide and plan, tasks, coding standards, integration guides, security, test plan and report,
  deployment, environment variables, troubleshooting, limitations).
- 125 unit tests, 63 live RLS checks, 8 Playwright tests, production and extension builds.

### Known issues

See `docs/KNOWN-LIMITATIONS.md`. Live Gemini and Vercel calls were not verified (no credentials
in the build environment); rate limiting is per instance; no Meta API adapter.
