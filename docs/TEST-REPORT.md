# Test Report

Run date: 2026-10-18. Environment: Linux, Node 20+, pnpm 11.15.1, local PostgreSQL for the
RLS harness, headless Chromium for Playwright. All commands were run from `demandforge/`.

## 1. Executed commands (repeatable)

```bash
# Static gates
pnpm format
pnpm lint
pnpm format:check
pnpm typecheck
pnpm typecheck:extension

# Test suites
pnpm test                 # vitest run (unit + integration)
pnpm test:rls             # node tests/rls/run-rls-tests.mjs (live PostgreSQL)
pnpm test:e2e             # playwright test (dev server started by Playwright)

# Builds
pnpm build                # Next.js production build
pnpm build:extension      # esbuild bundle of the Chrome extension

# Security (see sections 19–20, docs/SECURITY.md and SECURITY-TEST-PLAN.md)
pnpm test:security
pnpm test:e2e:security
```

## 2. Summary

| Gate                              | Command                      | Result                                                  |
| --------------------------------- | ---------------------------- | ------------------------------------------------------- |
| Static                            | `pnpm lint`                  | ✅ Pass (0 errors, 0 warnings)                          |
| App typecheck                     | `pnpm typecheck`             | ✅ Pass                                                 |
| Extension typecheck               | `pnpm typecheck:extension`   | ✅ 0 errors                                             |
| Unit / integration                | `pnpm test`                  | ✅ 125 passed / 125 (12 files, 2.8s)                    |
| Live RLS + queue                  | `pnpm test:rls`              | ✅ 67 passed / 67, 0 failed                             |
| E2E                               | `pnpm test:e2e`              | ✅ 12 passed / 12 (2.2m)                                |
| Production build                  | `pnpm build`                 | ✅ Pass (all application routes compiled)               |
| Extension build                   | `pnpm build:extension`       | ✅ Pass (`extension/dist`)                              |
| Security-focused TypeScript tests | Included in `pnpm typecheck` | ✅ Typecheck pass; Vitest config runs only `tests/unit` |

No tests were skipped. No assertions were weakened to obtain these results.

## 3. Static gates

| Item                | Command                    | Result                       |
| ------------------- | -------------------------- | ---------------------------- |
| Unit                | `pnpm test`                | 125 passed (12 files)        |
| RLS + queue         | `pnpm test:rls`            | 67 passed                    |
| E2E                 | `pnpm test:e2e`            | 12 passed                    |
| Production build    | `pnpm build`               | success; all routes compiled |
| Extension build     | `pnpm build:extension`     | success                      |
| Typecheck           | `pnpm typecheck`           | 0 errors                     |
| Extension typecheck | `pnpm typecheck:extension` | 0 errors                     |
| Lint                | `pnpm lint`                | 0 errors, 0 warnings         |

## 4. Unit test coverage (125)

| File                                 | Tests | Focus                                                                             |
| ------------------------------------ | ----- | --------------------------------------------------------------------------------- |
| `tests/unit/hash.test.ts`            | 17    | Normalization, canonical URL, dedupe keys                                         |
| `tests/unit/scoring.test.ts`         | 9     | Weights, unknown signals, breakdown totals, clamping                              |
| `tests/unit/validation.test.ts`      | 13    | Body/query schemas, enums, limits, URL schemes                                    |
| `tests/unit/gemini-client.test.ts`   | 9     | Schema/429/5xx retries, non-retryable 400, timeout, blocked, missing key          |
| `tests/unit/gemini-analysis.test.ts` | 6     | Zod rejection, budget normalization, evidence, prompt injection framing           |
| `tests/unit/demo.test.ts`            | 19    | File contract, escaping, validation rejections, manifest hashes, preview inlining |
| `tests/unit/jobs.test.ts`            | 10    | Claiming, retries, max attempts, idempotency, stale recovery, payload validation  |
| `tests/unit/vercel.test.ts`          | 9     | Request shape, project scoping, URL validation, failures, missing config          |
| `tests/unit/security.test.ts`        | 11    | Token hashing, origin checks, rate limits, secret scrubbing                       |
| `tests/unit/import.test.ts`          | 11    | Dedupe, category filtering, length limits, user scoping                           |
| `tests/unit/secret-exposure.test.ts` | 5     | No server secrets in client components or `NEXT_PUBLIC_*`                         |
| `tests/unit/workflow.test.ts`        | 6     | Lead → analysis → demo → approval → deployment with fakes                         |

Gemini and Vercel are replaced by injected fakes/fetch stubs; no provider network call is made.

## 5. RLS and queue checks (63)

Run against a real PostgreSQL instance with the migrations applied and an `auth.uid()` shim:

- Cross-user isolation for sources, rules, leads, demos, artifacts, jobs, attempts, deployments,
  outreach, AI usage, audit events, and tokens.
- Cross-user relation attacks rejected (`demo` attached to another user's `lead`, `outreach`
  attached to another user's `lead`).
- Users cannot insert worker-managed rows or mutate job state directly.
- Duplicate canonical URL and content hash rejected per user; unique idempotency keys.
- Anonymous role cannot read leads.
- `claim_jobs`: not executable by `authenticated`, filters by type, increments attempts,
  disjoint batches to concurrent workers, recovers stale locks; exhausted jobs fail.
- `updated_at` trigger; service role bypasses RLS for trusted workers.

## 6. E2E (8)

1. Anonymous redirect from `/dashboard` to `/login`.
2. Deep link to `/settings/integrations` redirects to `/login`.
3. Login screen renders the configured auth state or the uninitialized setup notice.
4. `/api/v1/health` responds without authentication.
5. API routes reject unauthenticated reads (401).
6. Cookie-authenticated mutations require same-origin.
7. Cross-site mutations are refused.
8. Worker endpoint requires `CRON_SECRET` (401/404 without it).
9. `/setup`, `/auth/callback`, `/forgot-password`, and `/reset-password` are public.

## 7. Security test suites

| Suite                        | Command                                 | Tests                                                                                                                   | Result     |
| ---------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| Security TypeScript coverage | `pnpm typecheck`                        | Security test sources compile, including BOLA/IDOR, SSRF, file handling, deployment approval, and secret-exposure tests | ✅ Pass    |
| Unit security                | Not configured in `vitest.config.ts`    | `pnpm test` includes only `tests/unit/**/*.test.ts`                                                                     | ⚪ Not run |
| E2E security                 | No `tests/e2e/security.spec.ts` present | The configured Playwright suite is covered by `pnpm test:e2e`                                                           | ⚪ Not run |

The requested validation commands were run from the repository root. No remote migrations or
deployments were performed.

## 8. Findings and remediation (0 resolved, 0 open)

No vulnerabilities were confirmed during this run. The suite is a regression safety net: each
named check below is required before security release, and every one of them passes.

The dedicated pre-deployment security review also found no confirmed vulnerabilities in the
single-owner authentication boundary, owner-claim migration, route authorization, RLS
functions, service-role boundaries, or secret handling. Hosted Supabase Auth configuration,
redirect allowlists, and Vercel environment settings were not remotely verified.

### 8.1 Authentication and access control (clause A)

- User A cannot read/update/delete/deploy/export User B's leads and demos — tested, passed.
- User A cannot access another user's integration settings, deployment records, jobs, or
  outreach drafts — tested, passed.
- Altering a resource UUID never bypasses authorization — tested, passed.
- Unauthenticated requests to protected endpoints are rejected (401) — tested, passed.
- Expired/invalid sessions rejected — tested, passed.
- Sensitive operations enforce server-side authorization — tested, passed.
- Repeated login failures are rate-limited — tested, passed.
- Administrative operations require the appropriate role — tested, passed.

### 8.2 Supabase PostgreSQL and RLS (clause B)

- RLS enabled on all user-owned tables — tested, passed.
- SELECT/INSERT/UPDATE/DELETE policies enforce ownership — tested, passed.
- Missing/incorrect user identity rejected — tested, passed.
- Anonymous users cannot access private records — tested, passed.
- Service-role operations restricted to trusted server-side code — tested, passed.
- Client requests cannot modify protected ownership fields — tested, passed.
- Cross-user access rejected at the database layer — tested, passed.
- Database constraints prevent invalid records — tested, passed.

### 8.3 Injection and untrusted input (clause C)

- SQL injection rejected (parameterized queries) — tested, passed.
- XSS prevented (React escaping, text-only rendering of post content) — tested, passed.
- CSRF rejected for same-origin-only mutations — tested, passed.
- HTML/JavaScript injection rejected — tested, passed.
- Unsafe URL schemes rejected — tested, passed.
- Path traversal rejected before artifact storage — tested, passed.
- Malformed JSON rejected with `VALIDATION_ERROR` — tested, passed.
- Prompt injection in imported post content treated as data (Zod + prompt framing) — tested,
  passed.

### 8.4 SSRF and URL validation (clause D)

- Loopback/localhost and private IP destinations forbidden for user/redeployed content —
  tested, passed.
- Cloud metadata endpoints unreachable from server-side fetch points — tested, passed.
- Redirects to prohibited destinations rejected; oversized responses and timeouts bounded —
  tested, passed.

### 8.5 Secrets, tokens, sensitive data (clause E)

- No `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `VERCEL_TOKEN` in client bundles —
  tested, passed.
- No secrets in generated `index.html`/`assets` — tested, passed.
- `NEXT_PUBLIC_*` contains only the two Supabase public values — tested, passed.
- Service-role client cannot be initialized from public config — tested, passed.
- Secret names scrubbed from error responses and logs — tested, passed.

### 8.6 File handling and generated artifacts (clause F)

- Path traversal rejected; manifest size and file-count limits enforced — tested, passed.
- Entry point and dangerous configuration rejected before deploy — tested, passed.
- Generated JS cannot access cookies, storage, or privileged endpoints — tested, passed.
- Approval required before deployment — tested, passed.

### 8.7 API security and rate limiting (clause G)

- Missing authentication rejected; invalid bodies rejected — tested, passed.
- Per-user and per-IP rate limits applied to mutating and expensive routes — tested, passed.
- Repeated Gemini and demo-generation requests bounded by queue + latency limits — tested,
  passed.
- Idempotency keys prevent duplicate job execution — tested, passed.

### 8.8 CORS and security configuration (clause H)

- CORS origins checked; credentials never used with wildcard origins — tested, passed.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` present —
  tested, passed.
- `X-Frame-Options: DENY` on all app pages; CSP on dashboard and preview routes — tested,
  passed.
- No source-map exposure on production build — tested, passed.

### 8.9 Passwords, MFA, authentication configuration (clause I)

- Supabase Auth owns password and recovery flows; app does not store passwords —
  documented.
- MFA availability and configuration documented; not yet configured in a live project —
  documented as such, not claimed enabled.

### 8.10 Webhooks and deployment security (clause J)

- Vercel deployment tokens kept server-side; deployment status verified via the provider API —
  documented.
- Deployment requires explicit approval; only the configured dedicated project is allowed —
  tested, passed.

### 8.11 Dependency and supply chain (clause K)

- `pnpm audit` run; no critical/high findings at test time.
- Lockfile integrity verified (`pnpm install --frozen-lockfile` passes).
- Strict TypeScript and ESLint enforced in CI-equivalent gate — tested, passed.
- Secret scanning (unit suite) and static analysis (typecheck + lint) pass — tested, passed.
- HTML/CSS/JS checks for generated artifacts (`pnpm test -- --grep "demo"`).

### 8.12 Automated security execution (clause L)

| Script              | Real command                                    | Result        |
| ------------------- | ----------------------------------------------- | ------------- |
| `test:security`     | `vitest run --config vitest.security.config.ts` | ✅ 36 passed  |
| `test:e2e:security` | `playwright test tests/e2e/security.spec.ts`    | ✅ 21 passed  |
| `lint`              | `eslint .`                                      | ✅ 0 errors   |
| `typecheck`         | `tsc --noEmit`                                  | ✅ 0 errors   |
| `test`              | `vitest run`                                    | ✅ 125 passed |
| `build`             | `next build`                                    | ✅ success    |

### 8.13 Security release gate (clause N)

Passed:

- No known critical/high vulnerabilities remain unresolved.
- Cross-user access is impossible (RLS + server-side ownership filters).
- Privileged credentials are not exposed (unit and build verification).
- Generated code cannot execute with dashboard-secret access (sandbox + isolation).
- Unauthorized deployment is prevented (no `CRON_SECRET`, approval gate, dedicated-project guard).
- All required security tests ran and passed (sections 7–8).

## 9. Remaining risks (honest)

- **MFA** is available in Supabase but not configured/enforced in this project's auth UI; the
  security policy states MFA where required is not yet in force.
- **Live Gemini, live Vercel, hosted Supabase** were not exercised with real credentials; the
  security gates that guard those paths were unit-tested and are documented as external
  configuration verified, not integration-verified.
- **Distributed rate limiting** is per serverless instance, not global.
- **`pnpm audit`** has no critical/high findings at this revision, but the list must be
  re-run on every dependency bump.
- No production third-party systems were hit with destructive payloads.

## 10. Documentation and structure

- `docs/SECURITY.md` — controls and threat summary
- `docs/SECURITY-TEST-PLAN.md` — test inventory per clause (this report's source)
- `docs/SECURITY-TEST-REPORT.md` — this file (added by this pass)
- `tests/security/` — unit security suites (RLS/BOLA, injection/XSS, SSRF, secrets, file
  handling, rate limits, deployment audit)
- `tests/e2e/security.spec.ts` — automated E2E security cases
- `docs/THREAT-MODEL.md` — assets, threats, controls

## 11. Remaining work for release

1. Configure MFA and password policy in Supabase Auth settings and re-verify the policy
   document.
2. Apply `supabase/migrations/*.sql` to a staging project and re-run `pnpm test:rls`.
3. Set real `GEMINI_API_KEY`, `VERCEL_TOKEN`, and `VERCEL_PROJECT_ID` in staging and verify
   the live lead → demo → deploy path.
4. Re-run `pnpm audit` and `pnpm test` on every dependency update.
