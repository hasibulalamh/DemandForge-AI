# Authentication and RLS

## Authentication

DemandForge has exactly one owner account. It intentionally does not implement public
registration, members, invitations, teams, or subscriptions. The `member` enum value remains
only for migration compatibility with pre-initialization rows; no member can be onboarded or
claim ownership.

- **Provider:** Supabase Auth (email + password).
- **SSR pattern:** `@supabase/ssr` with `createServerClient` in Server Components/route handlers
  and `createBrowserClient` only where a browser client is genuinely needed.
- **Session refresh:** `src/proxy.ts` runs on every non-API request, calls
  `supabase.auth.getUser()` and writes refreshed cookies onto the response (and onto redirects).
- **Login/logout:** Server Actions in `src/app/actions/auth.ts`. Sign-up passes
  `display_name` in user metadata; the database trigger creates the profile.
- **Initial owner:** `/setup` requires `OWNER_SETUP_SECRET`, records a service-role-only claim,
  and `claim_initial_owner()` promotes the verified account under a transaction lock.
- **After initialization:** `is_workspace_initialized()` blocks setup and the auth trigger rejects
  new users. Also disable Supabase Auth's public signup setting in the project dashboard.
- **Recovery:** Supabase email verification uses `/auth/callback`; password reset uses
  `/forgot-password` and `/reset-password`.
- **Protection:** anonymous requests to any non-public page redirect to `/login`; `/login`
  redirects authenticated users to `/dashboard`; API routes return 401 JSON.
- **Session cookie:** managed by `@supabase/ssr` (httpOnly, `SameSite=Lax`). The extension does
  not receive or reuse it.

### Account deletion

`DELETE /api/v1/profile` with `{ confirm: "DELETE" }` calls `auth.admin.deleteUser` with the
service-role client. Foreign keys cascade all owned rows. The UI requires an explicit
confirmation dialog. No soft delete or retention copy exists in v1.

### Extension tokens

- Generated as `df_` + 32 random bytes (base64url).
- Stored as SHA-256 hex (`api_tokens.token_hash`), unique; plaintext returned once.
- Verified with a constant-time comparison; `revoked_at` disables immediately; `last_used_at`
  updated on use.
- Scoped per user; the import API never accepts a `user_id` from the caller.

## RLS model

Every user-owned table has RLS enabled (`supabase/migrations/20261017090100_rls.sql`).
Policies derive ownership from `auth.uid()` — never from request input.

| Table              | select                 | insert                            | update       | delete |
| ------------------ | ---------------------- | --------------------------------- | ------------ | ------ |
| `profiles`         | own id                 | own id                            | own id       | —      |
| `sources`          | `user_id = auth.uid()` | same                              | same         | same   |
| `collection_rules` | own                    | own                               | own          | own    |
| `leads`            | own                    | own                               | own          | own    |
| `demo_projects`    | own                    | own **and** referenced lead owned | own          | own    |
| `demo_artifacts`   | parent demo owned      | none (service role only)          | none         | none   |
| `jobs`             | own                    | own                               | none         | none   |
| `job_attempts`     | parent job owned       | none                              | none         | none   |
| `deployments`      | own                    | none                              | none         | none   |
| `outreach_records` | own                    | own **and** lead owned            | own          | own    |
| `ai_usage`         | own                    | none                              | none         | none   |
| `audit_events`     | own                    | none                              | none         | none   |
| `api_tokens`       | own                    | own                               | own (revoke) | own    |

Notes:

- `service_role` bypasses RLS. It is used only by workers, token verification, account deletion,
  and audit/usage writes; every query is explicitly scoped to a verified user id.
- `anon` has schema usage but no table grants, so anonymous queries fail.
- Job state transitions are worker-only; users can enqueue and observe but not mark jobs
  succeeded or claim work.
- Generated artifacts are worker-written, preventing a user from injecting unvalidated files.

## Defence in depth in application code

1. `requireUser()` / `requireApiUser()` for pages and routes.
2. Origin checks for cookie mutations.
3. Explicit `.eq("user_id", user.id)` in route handlers, even though RLS already applies.
4. `importLead()` and job handlers always scope by the authenticated user.
5. Zod validation before any query.
6. Rate limits on expensive or abusable endpoints.

## Verification

`pnpm test:rls` starts an ephemeral Postgres 16 container, applies the real migrations, then
runs 67 assertions, including:

- RLS enabled and policies present on all 13 tables.
- User A cannot select/update/delete user B's leads, sources, rules, jobs, artifacts,
  deployments, usage, audit events, or tokens.
- Inserting a row with another user's `user_id` fails.
- A demo cannot reference another user's lead; outreach cannot target another user's lead.
- Artifacts cannot be inserted by an authenticated user.
- Users cannot mutate jobs or claim work.
- `anon` cannot read leads.
- `service_role` can read across users (expected bypass, used by workers).
- The profile trigger assigns owner/member correctly.

The hosted Supabase auth flow (email confirmation, cookie issuance) is verified by build and by
unauthenticated Playwright tests; it is not executed against a live project in this environment
(see `docs/TEST-REPORT.md`).
