# Acceptance Criteria

Status legend: **verified** (executed in this repository), **build-verified** (typecheck /
lint / build), **manual** (requires credentials or human action), **not implemented**.

## A. Foundation

| ID  | Criterion                                                        | Status   | Evidence                             |
| --- | ---------------------------------------------------------------- | -------- | ------------------------------------ |
| A1  | Next.js App Router + TypeScript strict + Tailwind build succeeds | verified | `pnpm build`, `pnpm typecheck`       |
| A2  | ESLint and Prettier configured and clean                         | verified | `pnpm lint`                          |
| A3  | Required documentation set exists                                | verified | `docs/` (31 files)                   |
| A4  | `.env.example` contains placeholders only, no secrets            | verified | `tests/unit/secret-exposure.test.ts` |

## B. Database and auth

| ID  | Criterion                                               | Status                  | Evidence                                                                                   |
| --- | ------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| B1  | Schema created by versioned SQL migrations              | verified                | `pnpm test:rls` applies all migrations to Postgres 16                                      |
| B2  | RLS enabled on all 13 user-owned tables with policies   | verified                | RLS harness, 26 coverage checks                                                            |
| B3  | User A cannot read/update/delete user B's rows          | verified                | RLS harness (leads, sources, rules, jobs, artifacts, deployments, ai_usage, audit, tokens) |
| B4  | Spoofed `user_id` inserts are rejected                  | verified                | RLS harness insert-with-other-owner check                                                  |
| B5  | `anon` role cannot read leads                           | verified                | RLS harness                                                                                |
| B6  | First signup becomes owner; profile trigger creates row | verified                | RLS harness trigger checks                                                                 |
| B7  | Login/logout, protected routes, session refresh         | build-verified + manual | `src/proxy.ts`, `src/app/actions/auth.ts`; Playwright confirms anonymous redirects         |
| B8  | Cross-user access tested explicitly                     | verified                | `tests/rls/run-rls-tests.mjs`                                                              |

## C. Collection

| ID  | Criterion                                                   | Status                              | Evidence                                      |
| --- | ----------------------------------------------------------- | ----------------------------------- | --------------------------------------------- |
| C1  | Manual import validates text length and URL scheme          | verified                            | `tests/unit/validation.test.ts`               |
| C2  | Duplicate import returns the existing lead, scoped per user | verified                            | `tests/unit/import.test.ts`                   |
| C3  | Canonical URL strips tracking parameters                    | verified                            | `tests/unit/hash.test.ts`                     |
| C4  | Chrome extension builds and is user-initiated only          | verified (build) / manual (install) | `pnpm build:extension`; `extension/README.md` |
| C5  | Extension never holds server secrets                        | verified                            | `tests/unit/secret-exposure.test.ts`          |
| C6  | Meta API ingestion                                          | not implemented                     | `docs/FACEBOOK-DATA-SOURCES.md`               |

## D. Gemini analysis

| ID  | Criterion                                             | Status                  | Evidence                                       |
| --- | ----------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| D1  | Structured output validated with Zod                  | verified                | `tests/unit/gemini-analysis.test.ts`           |
| D2  | Malformed JSON retried, then fails safely             | verified                | `tests/unit/gemini-client.test.ts`             |
| D3  | Rate limits/5xx retried with backoff; 4xx not retried | verified                | `tests/unit/gemini-client.test.ts`             |
| D4  | Unknown budget/urgency/intent stay unknown            | verified                | `tests/unit/gemini-analysis.test.ts`           |
| D5  | Score is deterministic and explainable                | verified                | `tests/unit/scoring.test.ts`                   |
| D6  | Usage recorded per call                               | build-verified + manual | `src/lib/gemini/service.ts`; requires live key |
| D7  | Live Gemini call                                      | manual                  | No API key in this environment                 |

## E. Jobs

| ID  | Criterion                                     | Status   | Evidence                                |
| --- | --------------------------------------------- | -------- | --------------------------------------- |
| E1  | Atomic claiming with `FOR UPDATE SKIP LOCKED` | verified | RLS harness: non-overlapping claims     |
| E2  | Attempt counter increments; retries bounded   | verified | RLS harness + `tests/unit/jobs.test.ts` |
| E3  | Idempotency keys prevent duplicates           | verified | unit + RLS harness                      |
| E4  | Stale locks recovered; exhausted jobs failed  | verified | RLS harness                             |
| E5  | Worker endpoint requires `CRON_SECRET`        | verified | Playwright e2e                          |
| E6  | Users cannot claim or mutate jobs             | verified | RLS harness                             |

## F. Demos

| ID  | Criterion                                                              | Status         | Evidence                                       |
| --- | ---------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| F1  | Exactly four allowed files, no React                                   | verified       | `tests/unit/demo.test.ts`                      |
| F2  | Inline scripts/handlers, frames, external URLs, eval, secrets rejected | verified       | `tests/unit/demo.test.ts`                      |
| F3  | Preview sandboxed with opaque origin and restrictive CSP               | verified       | `PREVIEW_CSP` test + route headers             |
| F4  | Regeneration invalidates approval                                      | build-verified | `handleGenerateDemo` sets `approved_at = null` |
| F5  | Approval required before deployment                                    | verified       | `tests/unit/workflow.test.ts`                  |

## G. Deployment

| ID  | Criterion                                                | Status   | Evidence                            |
| --- | -------------------------------------------------------- | -------- | ----------------------------------- |
| G1  | Missing Vercel credentials produce a configuration error | verified | unit + workflow tests               |
| G2  | Deployment URLs accepted only from `*.vercel.app`        | verified | `tests/unit/vercel.test.ts`         |
| G3  | Refuses to deploy outside the dedicated project          | verified | `tests/unit/vercel.test.ts`         |
| G4  | Success only when READY with a URL; failures recorded    | verified | `tests/unit/vercel.test.ts`         |
| G5  | Live deployment                                          | manual   | No Vercel token in this environment |

## H. Outreach and operations

| ID  | Criterion                                      | Status                  | Evidence                                   |
| --- | ---------------------------------------------- | ----------------------- | ------------------------------------------ |
| H1  | Drafts only; no auto-send                      | verified                | No send integration exists; UI states this |
| H2  | Status transitions and timestamps              | build-verified          | `src/app/api/v1/outreach/[id]/route.ts`    |
| H3  | Real dashboard counts, no fabricated analytics | build-verified          | `src/features/dashboard/queries.ts`        |
| H4  | AI usage totals from database                  | build-verified          | `src/features/usage/queries.ts`            |
| H5  | Account deletion cascades owned data           | build-verified + manual | `DELETE /api/v1/profile`                   |

## I. Security

| ID  | Criterion                                                     | Status         | Evidence                                  |
| --- | ------------------------------------------------------------- | -------------- | ----------------------------------------- |
| I1  | Server secrets never imported into Client Components          | verified       | static scan test                          |
| I2  | CSRF/origin checks on cookie mutations                        | verified       | `tests/unit/security.test.ts`, Playwright |
| I3  | Rate limits on mutating endpoints                             | verified       | `tests/unit/security.test.ts`             |
| I4  | API tokens hashed at rest, shown once                         | verified       | `tests/unit/security.test.ts`             |
| I5  | No secret-like markers in generated artifacts                 | verified       | `tests/unit/demo.test.ts`                 |
| I6  | Content Security Policy on app pages, sandbox CSP on previews | build-verified | `src/proxy.ts`, preview route             |

## J. User interface

| ID  | Criterion                                    | Status                       | Evidence                 |
| --- | -------------------------------------------- | ---------------------------- | ------------------------ |
| J1  | All required routes exist                    | verified                     | `pnpm build` route table |
| J2  | Loading, error, empty, not-found states      | verified (presence)          | route files              |
| J3  | Search, filters, pagination                  | build-verified + e2e (login) | `/leads`                 |
| J4  | Confirmation dialogs for destructive actions | build-verified               | `ConfirmDialog` usage    |
| J5  | Responsive layout and accessible contrast    | manual review                | Tailwind design tokens   |
