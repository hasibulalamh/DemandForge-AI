# Environment Variables

Copy `.env.example` to `.env.local` for development. Set the same keys in Vercel for production.
Only `NEXT_PUBLIC_*` values are inlined into the client bundle.

## Public

| Variable                               | Required | Example                    | Purpose                                                          |
| -------------------------------------- | -------- | -------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                  | yes      | `https://app.example.com`  | Origin used for auth redirects, metadata, and CSRF origin checks |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes      | `https://abcd.supabase.co` | Supabase project URL                                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes      | `sb_publishable_…`         | Current publishable key (RLS-protected)                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`        | legacy   | `eyJ…`                     | Only for projects without publishable keys                       |

`src/lib/public-config.ts` accepts either key: it prefers the publishable key and falls back to
the anon key, so both key formats work with the installed SDK.

## Server-only

| Variable                          | Required      | Default             | Purpose                                                                         |
| --------------------------------- | ------------- | ------------------- | ------------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`       | yes           | —                   | Bypasses RLS for trusted operations (tokens, worker, audit). Never client-side. |
| `GEMINI_API_KEY`                  | for analysis  | —                   | Google AI Studio key                                                            |
| `GEMINI_MODEL`                    | no            | `gemini-2.5-flash`  | Model id                                                                        |
| `GEMINI_INPUT_PRICE_PER_MILLION`  | no            | `0.30`              | Cost estimate                                                                   |
| `GEMINI_OUTPUT_PRICE_PER_MILLION` | no            | `2.50`              | Cost estimate                                                                   |
| `VERCEL_TOKEN`                    | for deploys   | —                   | Vercel access token                                                             |
| `VERCEL_TEAM_ID`                  | if team-owned | —                   | Team scope for API calls                                                        |
| `VERCEL_PROJECT_ID`               | for deploys   | —                   | Dedicated demo project id                                                       |
| `VERCEL_PROJECT_NAME`             | no            | `demandforge-demos` | Fallback project name                                                           |
| `CRON_SECRET`                     | yes in prod   | —                   | Bearer secret for `/api/v1/jobs/run`                                            |
| `SUPABASE_DB_URL`                 | tests only    | —                   | Direct Postgres URL for `pnpm test:rls`                                         |
| `OWNER_SETUP_SECRET`              | before setup  | —                   | Server-only secret required for the one-time owner setup claim                  |

## Behaviour when unset

| Missing                     | Effect                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Supabase URL/key            | App renders a configuration notice; auth routes redirect to a setup message; APIs return `503 NOT_CONFIGURED` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server data access fails closed; integrations page lists it as missing                                        |
| `GEMINI_API_KEY`            | Analysis route returns `503 NOT_CONFIGURED`; import and demos of existing analyses still work                 |
| `VERCEL_TOKEN`/project      | Deploy returns `503 NOT_CONFIGURED`; approval and preview still work                                          |
| `CRON_SECRET`               | Worker endpoint rejects all requests (fail closed)                                                            |
| `OWNER_SETUP_SECRET`        | `/setup` renders the owner-setup-disabled notice until the secret is configured                               |

Settings → Integrations shows which of these are configured (names only, never values).

## Security rules

- Never commit `.env.local` (git-ignored) or real credentials.
- Never prefix a secret with `NEXT_PUBLIC_`.
- Provide secrets to the extension only as `df_` API tokens issued in Settings.
- Rotate keys after exposure; the service-role key bypasses all RLS.
