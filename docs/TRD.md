# Technical Requirements Document

## Stack (pinned in `package.json`)

| Layer         | Choice                                                 | Rationale                                                        |
| ------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Framework     | Next.js 16.4.2 (App Router, Turbopack)                 | Server Components, route handlers, `after()`, Node runtime proxy |
| UI            | React 19.3, TypeScript 5.9 strict                      | Typed server/client boundary                                     |
| Styling       | Tailwind CSS 4 via `@tailwindcss/turbopack`            | Utility styling without a config file                            |
| Database/Auth | Supabase (`@supabase/ssr` 0.12.7, `supabase-js` 2.118) | Postgres + Auth + RLS; SSR cookie pattern                        |
| Validation    | Zod 4.6                                                | Runtime validation for requests and model output                 |
| AI            | Google Gemini REST `v1beta` via `fetch`                | No SDK version drift; full control of timeout/retries/schema     |
| Deployment    | Vercel REST `/v13/deployments`                         | Documented inline-file deployment; immutable URLs                |
| Extension     | Manifest V3 + TypeScript + esbuild                     | Minimal bundle, no framework in the popup                        |
| Tests         | Vitest 5, Playwright 1.64, `pg` harness                | Fast unit tests, browser smoke tests, real RLS checks            |
| Lint/format   | ESLint 9 (`eslint-config-next`), Prettier 3            | Next's rules + consistent formatting                             |

## Architectural decisions

### AD1 — Server Components first; client components only for interaction

Pages fetch through server clients so secrets never enter the browser. Client components
(`src/features/**/components`, shell, toast, dialogs) call `/api/v1` with same-origin cookies.

### AD2 — RLS is the primary authorization boundary

Every table has policies keyed on `auth.uid()`. Route handlers additionally scope by
`user_id`, so a missing filter does not become a breach. The service-role client is limited to
workers, token verification, and trusted writes.

### AD3 — One Postgres, one queue

Long work is stored in `public.jobs`. `claim_jobs()` uses `FOR UPDATE SKIP LOCKED`, increments
attempts atomically, and is executable only by `service_role`. Supabase Queues/PGMQ was not
needed: the workload is low-volume (a handful of analyses/demos per day) and the SQL queue
already provides durability, retries, and idempotency without extra infrastructure.

### AD4 — Gemini response schemas + Zod double validation

The model is constrained by an OpenAPI-subset response schema, then parsed by Zod with length
and enum limits. Validation failures are retryable; HTTP 4xx and safety blocks are not.

### AD5 — Deterministic rendering from a model-written specification

Gemini writes a design specification (copy, palette, sections). A renderer emits the four
allowed files. This guarantees structural validity, prevents model-authored scripts, and makes
regeneration reproducible. The model never writes executable code that reaches users.

### AD6 — Artifacts stored in Postgres, not object storage

`demo_artifacts.files` holds a validated JSON manifest (`db://demo_artifacts/<demo-id>`). This
keeps approval and deployment atomic, removes a storage credential, and makes previews
readable under RLS. Size is capped at 700KB, so the row stays small.

### AD7 — Sandboxed single-document previews

The preview route inlines CSS/JS into one document and serves it with
`Content-Security-Policy: sandbox allow-scripts; default-src 'none'; ...`, rendered in an
iframe with `sandbox="allow-scripts"`. The document gets an opaque origin, cannot read
dashboard cookies or call same-origin APIs, and cannot make network requests. Artifacts remain
downloadable.

### AD8 — Deployment into one dedicated Vercel project

Every deployment targets `VERCEL_PROJECT_ID`/`VERCEL_PROJECT_NAME` (default
`demandforge-demos`). Names are never user-controlled. Each deployment gets an immutable
`*.vercel.app` URL; the service rejects any other host.

### AD9 — Token auth for the extension

The popup sends `Authorization: Bearer df_…`. Tokens are 256-bit random values stored as
SHA-256 hashes (`api_tokens`), revocable, and rate limited. No Supabase session cookie is
shared with the extension.

### AD10 — Bounded work on serverless

`/api/v1/jobs/run` processes at most five jobs / 45 seconds per invocation and is protected by
`CRON_SECRET`. Route handlers use `after()` for opportunistic processing but never rely on it
for durability; `vercel.json` schedules the worker every five minutes.

## Constraints

- No Laravel, no second Node server, no second Postgres.
- Next.js API routes and Server Actions only; no separate API service.
- All privileged calls run in Node runtime (`src/lib/**` imports `server-only`).
- `cacheComponents` is disabled: every protected page is request-scoped.
- Demo artifacts are static; no server-side rendering for demos.
- The generated demos must not load any external asset; fonts are system stacks.

## Environment and deployment requirements

- Node 20+ (developed on Node 24), pnpm 11.
- Supabase project with email auth enabled.
- Gemini API key with access to the configured model (`gemini-2.5-flash` default).
- Vercel token scoped to one team/project for demo deployments.
- `CRON_SECRET` configured in Vercel so the scheduled worker authenticates.

## Dependency policy

Add a dependency only when the platform cannot do the job. Prefer `fetch` over vendor SDKs
(Gemini, Vercel) to keep bundles small and behaviour testable. No UI component library: the
design system is local and Tailwind-based.
