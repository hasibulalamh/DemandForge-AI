# Tasks

`[x]` complete and verified where the environment allows. `[~]` implemented but requiring
credentials/manual verification. `[ ]` not implemented.

## Documentation

- [x] RULE, AGENTS, README, .env.example
- [x] PRD, SCOPE, ACCEPTANCE-CRITERIA
- [x] DESIGN, TRD, ARCHITECTURE, APPFLOW, SYSTEM-DIAGRAMS
- [x] BACKEND-SCHEMA, DATABASE-MIGRATIONS, API-SPECIFICATION, AUTH-AND-RLS
- [x] IMPLEMENT, IMPLEMENTATION-PLAN, TASKS, CODING-STANDARDS
- [x] GEMINI-INTEGRATION, FACEBOOK-DATA-SOURCES, DEMO-GENERATION, VERCEL-DEPLOYMENT
- [x] SECURITY, TEST-PLAN, DEPLOYMENT, ENVIRONMENT-VARIABLES, TROUBLESHOOTING,
      KNOWN-LIMITATIONS, CHANGELOG, TEST-REPORT

## Foundation

- [x] Next.js App Router, strict TypeScript, Tailwind 4
- [x] ESLint + Prettier
- [x] Supabase browser/SSR/admin clients
- [x] Single-owner setup with server-only claim secret and multi-device login
- [x] Login, logout, email verification, password reset, session refresh
- [x] Protected layout and route redirects
- [x] CSP, frame protection, referrer policy
- [x] `server-only` boundaries

## Database

- [x] Enums, tables, constraints, indexes
- [x] `updated_at` triggers, profile creation trigger
- [x] RLS on profiles/sources/rules/leads/demos/artifacts/jobs/attempts/deployments/outreach/usage/audit/tokens
- [x] Ownership policies and parent-ownership checks
- [x] Queue functions (`claim_jobs`, `recover_stale_jobs`)
- [x] Seed data
- [x] Live RLS harness, including anonymous denial and post-init signup blocking
- [x] Security test TypeScript validation and awaited Supabase BOLA/IDOR assertions

## Sources and leads

- [x] Sources CRUD UI + API
- [x] Collection rules UI + API
- [x] Manual import with normalization and dedupe
- [x] Extension import with bearer token
- [x] Lead list: search, filters, sorting, pagination
- [x] Lead detail: original text, evidence, score, signals, jobs
- [x] Pipeline status updates
- [x] Lead deletion
- [x] Source deletion keeps leads

## Analysis

- [x] Gemini client with timeout, retries, backoff
- [x] Response schema + Zod validation
- [x] Budget normalization (no invented values)
- [x] Evidence quotes and next action
- [x] Deterministic scoring with breakdown
- [x] Usage + cost recording
- [x] Retry/failure handling
- [~] Live Gemini request (needs key)

## Jobs

- [x] Enqueue with idempotency
- [x] Atomic claim, attempt tracking
- [x] Retry/backoff/max attempts
- [x] Stale recovery
- [x] Worker endpoint with `CRON_SECRET`
- [x] Vercel cron entry
- [x] Non-retryable error classification

## Demos

- [x] Demo project creation (analysed leads only)
- [x] Gemini design specification
- [x] Deterministic renderer (3 templates, 4 files)
- [x] Artifact validation (structure, scripts, URLs, secrets, size)
- [x] Sandboxed preview + download
- [x] Human approval and re-approval after regeneration
- [x] Demo list and detail pages
- [~] Live generation (needs Gemini key)

## Deployment

- [x] Vercel service with dedicated-project guard
- [x] Approval gate in worker
- [x] Real status polling and URL persistence
- [x] Deployment history and error display
- [x] Retry without duplicate builds
- [~] Live Vercel deployment (needs token)

## Outreach and operations

- [x] Draft creation per lead
- [x] Status transitions with timestamps
- [x] Outreach list and statistics
- [x] AI usage dashboard
- [x] Profile update
- [x] Account deletion with confirmation
- [x] Extension token management
- [x] Audit events

## Extension

- [x] MV3 manifest, popup, service worker
- [x] Runtime host-permission request
- [x] Active-tab capture (facebook.com only)
- [x] Rule hint and duplicate feedback
- [x] Build script
- [ ] Persistent content script (intentionally omitted)
- [ ] Meta API adapter (not approved)

## Verification

- [x] `pnpm typecheck`, `pnpm typecheck:extension`
- [x] `pnpm lint`, `pnpm format:check`
- [x] `pnpm test` — 125 tests
- [x] `pnpm test:rls` — 63 checks
- [x] `pnpm test:e2e` — 8 tests
- [x] `pnpm build`
- [x] `pnpm build:extension`
- [~] Hosted Supabase auth flow
- [~] Live Gemini and Vercel calls
