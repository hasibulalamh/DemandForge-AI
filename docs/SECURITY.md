# Security

## Threat model

| Asset                             | Threat                                               | Control                                                                          |
| --------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| Other users' leads/demos/outreach | Horizontal privilege escalation via API or direct DB | RLS on every user-owned table + explicit `user_id` filters in queries            |
| Service-role key                  | Leak to browser/extension/generated demo             | `server-only` module, never in `NEXT_PUBLIC_*`, secret-exposure tests            |
| Provider keys (Gemini, Vercel)    | Leak through logs, errors, client bundles            | Header auth, error scrubbing, redaction in `scrubSecrets()`                      |
| Generated demo code               | XSS/cookie theft inside the dashboard                | Opaque-origin sandbox iframe + CSP `sandbox` + validation rejecting dangerous JS |
| API tokens (`df_…`)               | Theft/abuse                                          | SHA-256 at rest, shown once, revocable, never logged                             |
| Worker endpoint                   | Unauthenticated expensive jobs                       | `CRON_SECRET` bearer requirement + constant-time compare                         |
| Imported content                  | Prompt injection into Gemini                         | Prompt treats post text as data; Zod-validated output; no tool execution         |

## Authentication and authorization

This is a personal single-user deployment, not a multi-tenant product. The owner may maintain
sessions on all three PCs; there is no one-device session limit. Public registration is not
available. Initial setup requires a deployment-specific `OWNER_SETUP_SECRET`, a database claim,
and email confirmation. The persistent initialization flag and auth trigger make the claim
one-time and race-safe; Supabase's **Allow new users to sign up** setting must be disabled
after verification as an additional provider-level control.

- Supabase Auth (email + password). Sessions use `@supabase/ssr` cookies; `src/proxy.ts`
  refreshes them on every request and redirects unauthenticated users to `/login`.
- Protected paths: everything except `/`, `/login`, `/api/v1/health`, `/api/v1/jobs/run`, and
  static assets. Middleware validates the user with `supabase.auth.getUser()` (not just a JWT).
- Every route handler builds the Supabase client from the request cookies and passes the user id
  into queries. `requireUser()` returns 401 JSON for API routes.
- Server-side mutations use the user-scoped client, so RLS applies even if a query forgets a
  filter. `createAdminClient()` (service role) is used only for: API-token lookup, job claiming,
  worker updates, and audit insertion — all scoped by user id from the authenticated context.
- Profile rows are created by a trigger on `auth.users` insert; users cannot escalate their
  `role` (RLS update policy restricts columns and the UI has no role editor).

## RLS summary

RLS is enabled on: `profiles`, `sources`, `collection_rules`, `leads`, `demo_projects`,
`demo_artifacts`, `jobs`, `job_attempts`, `deployments`, `outreach_records`, `ai_usage`,
`audit_events`, `api_tokens`.

Policies are `select/insert/update/delete` per table with `auth.uid() = user_id` (or `id` for
profiles). Related tables (`demo_artifacts`, `job_attempts`, `deployments`) check ownership
through their parent with `exists (...)` subqueries, so a forged parent id cannot read another
user's artifact. No table has an anonymous policy. Column-level grants prevent users from
writing worker-managed fields (job status, deployment status, analysis results) directly.

Verified by `tests/rls/run-rls-tests.mjs` against a real PostgreSQL instance with the Supabase
`auth.uid()` shim — see `docs/TEST-REPORT.md`.

## Secrets

| Variable                                        | Exposure                  | Storage                 |
| ----------------------------------------------- | ------------------------- | ----------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY` | Browser (by design)       | Vercel env              |
| `SUPABASE_SERVICE_ROLE_KEY`                     | Server only               | Vercel env (sensitive)  |
| `GEMINI_API_KEY`, `VERCEL_TOKEN`                | Server only               | Vercel env (sensitive)  |
| `CRON_SECRET`                                   | Server only               | Vercel env (sensitive)  |
| Extension tokens                                | Extension + server (hash) | `api_tokens.token_hash` |

`tests/unit/secret-exposure.test.ts` asserts no secret name appears under `NEXT_PUBLIC_`, that
only public config is exported from `public-config.ts`, and that no client component imports
`env.ts` or the admin client.

## Input validation

Zod schemas in `src/lib/validation/schemas.ts` validate every request body and query string:
UUIDs, bounded strings, enums, array limits, URL format (http/https only), hex colors, and
rejection of unknown keys on import payloads. Validation errors return `400 VALIDATION_ERROR`
with field paths and no stack traces.

## Rate limiting

`src/lib/api/rate-limit.ts` implements a fixed-window limiter keyed by user id and route.
Applied to all mutating and expensive routes (tokens, demos, deploy, approve, downloads,
previews, imports, analysis, jobs, usage, profile, sources, rules, outreach, leads).

**Limitation:** state is per serverless instance, not global. It raises the cost of naive abuse
but is not a distributed guarantee; the durable queue caps expensive work per user as a second
layer. A Redis/Upstash limiter is required for strict enforcement (documented in
`docs/KNOWN-LIMITATIONS.md`).

## Input and output handling

- All user text is rendered through React (escaped) or `escapeHtml()` in generated demos.
- Generated demos are validated: no inline scripts/handlers, no frames/forms/embeds, no
  external URLs, no `eval`/`Function`/`fetch`/storage/cookies, JS must parse.
- Preview is served with `Content-Security-Policy: sandbox allow-scripts; …` and embedded in an
  iframe without `allow-same-origin` — opaque origin, no access to dashboard cookies.
- Download is served with `Content-Disposition: attachment` and `sandbox`.

## CSRF and origin

- Mutations are same-origin `fetch` calls with JSON content type, which browsers preflight
  cross-origin. `src/lib/api/handler.ts` rejects unsafe methods whose `Origin` header is present
  and not the configured app origin.
- Session cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production (Supabase defaults).
- The extension authenticates with a bearer token, never cookies, so it cannot be used for CSRF.

## SSRF

No user-supplied URL is fetched server-side. Import stores the URL as text only. Gemini and
Vercel endpoints are fixed constants. Demo previews read from the database, not from a URL.

## Logging and audit

- Structured logs include event type, ids, and error codes — never tokens, keys, or post text.
- `scrubSecrets()` strips provider key patterns and bearer tokens from stored error messages.
- `audit_events` records approvals, deployments, token creation/revocation, account deletion,
  and job failures, with actor, action, target, and safe metadata.

## Generated-code isolation

Two independent layers: (1) static validation before storage and again before deploy,
(2) runtime isolation via CSP sandbox + opaque-origin iframe. Demos run only on Vercel
(`*.vercel.app`), never on the dashboard origin. If preview were unavailable, execution is
disabled and only the downloadable artifact is offered.

## Data minimisation and retention

- Stored per lead: post text, canonical URL, operator metadata, analysis. No author profiles,
  cookies, or private messages.
- API tokens store a hash only; the plaintext is shown once at creation.
- Deleting a lead cascades demos → artifacts → deployments → outreach rows.
- Deleting an account requires typing `DELETE`; it removes owned rows via cascade and the auth
  user via the service role, then signs out.
- `ai_usage` and `audit_events` are retained for operational history and are removed on account
  deletion.

## Known gaps

See `docs/KNOWN-LIMITATIONS.md`: per-instance rate limiting, no MFA UI, no email verification
flow customisation, and no live verification of Vercel/Gemini in this environment.
