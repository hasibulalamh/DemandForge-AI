# Implementation Plan

Status is honest: ✅ delivered and verified, ◐ delivered and partially verified (credentials or
manual step required), ⛔ not implemented.

## Phase 1 — Foundation

| Task                                                                               | Status | Notes                                                                             |
| ---------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------- |
| Repository audit                                                                   | ✅     | Fresh Next.js 16 scaffold; no existing user code to preserve                      |
| Documentation set                                                                  | ✅     | 31 documents under `/` and `docs/`                                                |
| Next.js + TypeScript strict + Tailwind                                             | ✅     | `pnpm build`, `pnpm typecheck`                                                    |
| Supabase clients (browser, SSR, admin)                                             | ✅     | `@supabase/ssr` cookie pattern                                                    |
| Authentication (single-owner setup, login, logout, verification, recovery, guards) | ◐      | Hosted email delivery and dashboard signup toggle require deployment verification |
| Session refresh + route protection                                                 | ✅     | `src/proxy.ts`; Playwright redirect tests                                         |
| Security headers / CSP                                                             | ✅     | Proxy for pages, sandbox CSP for previews                                         |

## Phase 2 — Database, RLS, sources, leads

| Task                                         | Status | Notes                                         |
| -------------------------------------------- | ------ | --------------------------------------------- |
| Migrations: schema, enums, indexes, triggers | ✅     | Applied by RLS harness                        |
| RLS policies on 13 tables                    | ✅     | 63 live checks pass                           |
| Typed database definitions                   | ✅     | Handwritten; `pnpm db:types` for regeneration |
| Sources CRUD                                 | ✅     | UI + API                                      |
| Collection rules CRUD                        | ✅     | UI + API                                      |
| Manual import + canonical URL + dedupe       | ✅     | Unit tests + live unique indexes              |
| Lead dashboard (search/filter/sort/page)     | ✅     | Real queries                                  |
| Lead detail with evidence                    | ✅     | Score breakdown + quotes                      |

## Phase 3 — Gemini, scoring, jobs

| Task                                     | Status | Notes                          |
| ---------------------------------------- | ------ | ------------------------------ |
| Gemini REST client with timeout/retries  | ✅     | Unit-tested with fake fetch    |
| Structured schema + Zod validation       | ✅     | Retries on invalid shape       |
| Evidence-backed analysis + normalization | ✅     | Unknown stays unknown          |
| Deterministic scoring                    | ✅     | Fixed weights, tested          |
| Usage recording with cost estimate       | ✅     | Writes to `ai_usage`           |
| Durable queue, atomic claim, retries     | ✅     | Live queue tests               |
| Cron endpoint + `after()` trigger        | ✅     | `CRON_SECRET` enforced         |
| Live Gemini call                         | ◐      | No API key in this environment |

## Phase 4 — Chrome extension

| Task                                | Status     | Notes                                      |
| ----------------------------------- | ---------- | ------------------------------------------ |
| MV3 manifest, popup, service worker | ✅         | Built with esbuild                         |
| User-initiated capture (active tab) | ✅ (build) | facebook.com only; manual install required |
| Token auth + settings storage       | ✅         | Tokens hashed server-side                  |
| Duplicate/relevance feedback        | ✅         | Rule hint + duplicate link                 |
| Persistent background scraping      | ⛔         | Prohibited by design                       |
| Meta API adapter                    | ⛔         | Requires approved permissions; documented  |

## Phase 5 — Demo generation

| Task                                        | Status | Notes                               |
| ------------------------------------------- | ------ | ----------------------------------- |
| Gemini design specification                 | ✅     | Validated schema                    |
| Deterministic HTML/CSS/JS renderer          | ✅     | Three templates, four files         |
| Artifact validation                         | ✅     | Paths, size, scripts, URLs, secrets |
| Isolated preview                            | ✅     | Sandbox CSP + iframe sandbox        |
| Download fallback                           | ✅     | Self-contained HTML                 |
| Revision workflow (regenerate → re-approve) | ✅     | Approval cleared on generation      |
| Live generation call                        | ◐      | No Gemini key in this environment   |

## Phase 6 — Deployment

| Task                             | Status | Notes                        |
| -------------------------------- | ------ | ---------------------------- |
| Vercel service (create + poll)   | ✅     | Unit-tested with fake fetch  |
| Approval gate                    | ✅     | Worker rejects unapproved    |
| Deployment history + errors      | ✅     | `deployments` table + UI     |
| Retry reuses existing deployment | ✅     | Avoids duplicate builds      |
| Live Vercel deployment           | ◐      | No token in this environment |

## Phase 7 — Outreach, usage, operations

| Task                         | Status | Notes                                              |
| ---------------------------- | ------ | -------------------------------------------------- |
| Outreach drafts and statuses | ✅     | Manual send only                                   |
| Usage and cost reporting     | ✅     | Per operation/model                                |
| Profile + account deletion   | ✅     | Cascade delete                                     |
| Audit events                 | ✅     | Import, analysis, generation, approval, deployment |
| Extension token management   | ✅     | Create once, revoke                                |
| Analytics fabrication        | ⛔     | Never; all values are queried                      |

## Phase 8 — Verification

| Task                                                                 | Status                 |
| -------------------------------------------------------------------- | ---------------------- |
| Unit/integration suite (125 tests)                                   | ✅                     |
| Live RLS/queue harness (63 checks)                                   | ✅                     |
| Playwright smoke tests (8)                                           | ✅                     |
| Typecheck, lint, production build                                    | ✅                     |
| Extension typecheck + build                                          | ✅                     |
| Live third-party verification (Supabase hosted auth, Gemini, Vercel) | ◐ requires credentials |
