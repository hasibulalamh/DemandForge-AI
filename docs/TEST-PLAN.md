# Test Plan

## Strategy

Four layers, each with a distinct purpose. All commands run from `demandforge/`.

| Layer      | Command                                                                        | Scope                                                                                | Needs external services |
| ---------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------- |
| Static     | `pnpm typecheck`, `pnpm typecheck:extension`, `pnpm lint`, `pnpm format:check` | Types, lint, formatting                                                              | No                      |
| Unit       | `pnpm test`                                                                    | Scoring, hashing, validation, Gemini, demo generation, jobs, Vercel, queue, security | No (fakes)              |
| Database   | `pnpm test:rls`                                                                | RLS isolation, constraints, queue functions against real PostgreSQL                  | PostgreSQL only         |
| End-to-end | `pnpm test:e2e`                                                                | Public pages, auth redirects, headers, 404                                           | Dev/preview server      |
| Build      | `pnpm build`, `pnpm build:extension`                                           | Production compile, extension bundle                                                 | No                      |

## Unit coverage map

| Area                         | File                                 | Key assertions                                                                             |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| Content hash / canonical URL | `tests/unit/hash.test.ts`            | Case, whitespace, tracking params, fragments, trailing slash, unicode normalization        |
| Scoring                      | `tests/unit/scoring.test.ts`         | Weight bounds, unknown signals, monotonicity, breakdown sums to total, clamping            |
| Validation                   | `tests/unit/validation.test.ts`      | UUIDs, enums, limits, URL schemes, unknown keys, budget normalization                      |
| Gemini client                | `tests/unit/gemini-client.test.ts`   | Schema retry, 429/5xx retry, no retry on 400, timeout, blocked, missing key, usage parsing |
| Gemini analysis              | `tests/unit/gemini-analysis.test.ts` | Zod rejection, budget normalization, evidence retention, prompt injection framing          |
| Demo generation              | `tests/unit/demo.test.ts`            | File contract, escaping, manifest hashes, unsafe patterns rejected, preview inlining       |
| Jobs                         | `tests/unit/jobs.test.ts`            | Claiming, retries, max attempts, idempotency, stale recovery, payload validation           |
| Vercel                       | `tests/unit/vercel.test.ts`          | Request shape, team/project scoping, URL validation, build failure, missing config         |
| Security                     | `tests/unit/security.test.ts`        | Token hashing, origin checks, rate limiting, secret scrubbing                              |
| Import                       | `tests/unit/import.test.ts`          | Dedup by URL and hash, category filter, length limits                                      |
| Secret exposure              | `tests/unit/secret-exposure.test.ts` | No secrets in client bundles or `NEXT_PUBLIC_*`                                            |
| Workflow                     | `tests/unit/workflow.test.ts`        | Lead → analysis → demo → approval → deployment with fakes                                  |

## Database tests

`tests/rls/run-rls-tests.mjs`:

1. Applies `supabase/migrations/*.sql` to a scratch database via `SUPABASE_DB_URL`.
2. Creates the `auth.uid()` shim and two users.
3. For every table: user A reads/writes own rows, and cannot read/update/delete user B's rows,
   cannot insert rows owned by B, and cannot escalate profiles.
4. Verifies the service role can claim jobs and that `claim_jobs` is not executable by
   `authenticated`.
5. Verifies cascade deletes and unique constraints (canonical URL/hash per user).

## E2E scope

`tests/e2e/public.spec.ts`: landing page renders and links to login; `/login` renders the form;
unauthenticated `/dashboard` redirects to `/login`; security headers present; unknown route 404.
Authenticated flows require a live Supabase project and are therefore manual (see
`docs/TEST-REPORT.md`).

## Manual verification checklist

- [ ] Sign up, confirm profile row created, sign in/out.
- [ ] Import a post → duplicate re-import returns the existing lead.
- [ ] Analyze a lead → evidence, score breakdown, usage row.
- [ ] Generate a demo → preview renders, no network requests in devtools.
- [ ] Approve → deploy (with Vercel credentials) → live URL loads.
- [ ] Cross-user check: second account sees none of the first account's rows.
- [ ] Extension: create token, paste, capture on a Facebook post, import.

## Conventions

- Tests never call real Gemini or Vercel; `fetch` and service objects are injected.
- Assertions check behaviour (status codes, stored values), not implementation details.
- Any skipped test is listed in `docs/TEST-REPORT.md` with a reason.
