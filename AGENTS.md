# AGENTS.md — Working in DemandForge AI

## Read order before changing code

1. `docs/RULE.md` — non-negotiable rules.
2. `docs/ARCHITECTURE.md` — module boundaries and request flow.
3. `docs/BACKEND-SCHEMA.md` and `docs/AUTH-AND-RLS.md` — before touching data.
4. `docs/API-SPECIFICATION.md` — before touching routes.
5. `docs/IMPLEMENTATION-PLAN.md` / `docs/TASKS.md` — current state.
6. The narrowest related doc: `GEMINI-INTEGRATION.md`, `DEMO-GENERATION.md`,
   `VERCEL-DEPLOYMENT.md`, `FACEBOOK-DATA-SOURCES.md`, `SECURITY.md`.

## Repository map

| Path                   | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `src/app/`             | App Router pages, layouts, route handlers (`src/app/api/v1/...`) |
| `src/components/`      | Shared UI primitives and shell                                   |
| `src/features/`        | Feature data access and client components                        |
| `src/lib/`             | Supabase, Gemini, Vercel, jobs, security, validation             |
| `src/types/`           | Typed database definitions                                       |
| `supabase/migrations/` | Versioned SQL schema, RLS, queue functions                       |
| `extension/`           | Chrome Manifest V3 extension (TypeScript)                        |
| `tests/unit/`          | Vitest unit/integration tests with fakes                         |
| `tests/rls/`           | Live Postgres RLS isolation harness                              |
| `tests/e2e/`           | Playwright smoke tests                                           |
| `docs/`                | Product, design, architecture, operations                        |

## Ground rules for edits

- **Server-first.** Default to Server Components. Add `"use client"` only for
  interaction, browser APIs, or hooks.
- **Never import server-only modules into client code.** `src/lib/supabase/admin.ts`,
  `src/lib/gemini/*`, `src/lib/vercel/*`, and `src/lib/jobs/*` are server-only.
  `src/lib/env.ts` must never be imported from a Client Component.
- **Authorization is server-side.** Use `requireUser()` from `src/lib/auth.ts` in
  pages and route handlers. Never trust a `user_id` from the request body.
- **Validate input with Zod.** Schemas live in `src/lib/validation/`. Parse body,
  query, and params before use.
- **API responses follow `src/lib/api/response.ts`.** Success: `{ data }`. Error:
  `{ error: { code, message, details? } }` with an appropriate HTTP status.
- **Logs never include secrets, tokens, raw cookies, or full post text.** Log IDs and
  error codes.
- **Do not add a second database, a separate Node server, or Laravel.** The product
  runs on Next.js + Supabase. Background work uses the Postgres queue.
- **Do not add a dependency** unless the existing stack cannot do the job. Match the
  pinned versions in `package.json`.

## Adding a feature — checklist

1. Update the SQL migration if data changes; never edit an applied migration in
   production — add a new one.
2. Update `src/types/database.ts` (or regenerate with `pnpm db:types`).
3. Add/extend Zod schemas and tests for them.
4. Implement server logic in `src/lib/<domain>/` or `src/features/<domain>/`.
5. Expose it through `/api/v1/...` with auth, origin check, rate limit, and
   ownership filter.
6. Build the UI with loading, empty, error, and unauthorized states.
7. Add tests. Run all gates.
8. Update docs, `docs/TASKS.md`, and `docs/CHANGELOG.md`.

## Testing

```bash
pnpm typecheck          # TypeScript, strict
pnpm lint               # ESLint (Next core-web-vitals + TS)
pnpm test               # Vitest unit/integration
pnpm test:rls           # Live Postgres RLS harness (needs Docker or SUPABASE_DB_URL)
pnpm test:e2e           # Playwright smoke tests (needs a dev server / browsers)
pnpm build              # Production build
```

- Unit tests must not call Gemini, Vercel, or a live Supabase project. Inject fakes
  (`tests/unit/fakes/`).
- `tests/rls/run-rls-tests.mjs` starts an ephemeral Postgres container, applies
  migrations, and asserts cross-user isolation. It skips with a clear message when
  Docker and `SUPABASE_DB_URL` are both unavailable.
- Playwright covers unauthenticated routing and configuration states. Authenticated
  end-to-end flows require a configured Supabase project and are documented as such.
- Record actual outcomes in `docs/TEST-REPORT.md`, including failures and skips.

## Failure handling conventions

- External calls: explicit timeout (AbortSignal), bounded retries with backoff, and a
  typed error (`GeminiError`, `VercelError`) carrying a safe message.
- Jobs: on failure, increment attempt count (done by `claim_jobs`), schedule a retry
  with backoff, and after `max_attempts` mark `failed` with `last_error`.
- Never swallow an error to return a fake success. Surface configuration errors in the
  UI rather than pretending data exists.

## Documentation updates

Every change that alters behaviour updates the relevant docs in the same commit.
`docs/CHANGELOG.md` gets an entry under `Unreleased`. `docs/TASKS.md` checkboxes are
updated as work lands. Do not claim a feature works without a test or a manual
verification step recorded in `docs/TEST-REPORT.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
