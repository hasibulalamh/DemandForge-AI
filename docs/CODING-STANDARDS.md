# Coding Standards

## TypeScript

- `strict` is on. Avoid `any`; use `unknown` + narrowing. Prefer discriminated unions over
  optional-field soup.
- Use the typed Supabase client (`Database` in `src/types/database.ts`) and exported row types
  (`Tables<"leads">`, `TablesUpdate<"leads">`).
- Do not cast through `as unknown as` in production code. Tests may cast test doubles once,
  clearly marked.
- Server-only modules import `server-only`.

## React and Next.js

- Server Components by default. Add `"use client"` only for state, effects, browser APIs, or
  event handlers; keep client components leaf-level.
- Pages fetch data through `src/features/**/queries.ts` (server) or route handlers.
- Route handler signature: `(request: NextRequest, context: { params: Promise<{ id: string }> })`
  and always `await context.params`.
- Validate `searchParams` and request bodies with Zod; never index them directly.
- Wrap route bodies in `safeRoute` and return `jsonOk`.
- Avoid `window.location` for internal navigation; use `router.push/replace`.
- Escape apostrophes in JSX text (`&apos;` is enforced by lint when ambiguous).

## Supabase

- Browser: `createBrowserClient` only where necessary.
- Server: `createSupabaseServerClient()` for RLS-scoped reads/writes.
- Admin: `createSupabaseAdminClient()` only in workers/token verification/account deletion,
  always with an explicit authenticated user scope.
- Never send `user_id` from client input.
- Select only needed columns; paginate; add indexes for new filters.

## Validation and errors

- Zod schemas live in `src/lib/validation/` (requests) and `src/lib/gemini/` (model output).
- Throw `ApiError` with a stable code; `safeRoute` converts it to `{ error: { code, message } }`.
- Never leak provider payloads, SQL details, stack traces, or secrets.
- Retry only transient failures; use `NonRetryableJobError` for permanent ones.

## Security

- Secrets only in `src/lib/env.ts`; never in `NEXT_PUBLIC_*` or client files.
- Hash/canonicalize untrusted input (URLs, text) before persistence.
- Escape every model-provided string inserted into generated HTML.
- No external requests from generated demos.
- No secrets, cookies, or personal data in logs. Log ids and error codes.

## Naming

- Files: kebab-case (`api-token.ts`, `demo-actions.tsx`).
- Components: PascalCase; hooks `useX`; schemas `xSchema`; types `X`.
- Database: snake_case; TypeScript fields (on rows) stay snake_case, view models camelCase.
- Job types: `<verb>_<noun>` (`analyze_lead`, `generate_demo`, `deploy_demo`).

## Styling

- Tailwind utilities in JSX; shared variants in `src/components/ui/primitives.tsx`.
- Use design tokens (violet brand, zinc neutrals); no arbitrary hex values in components.
- Every interactive element has a visible focus state and an accessible name.
- Mobile-first; verify at 375px, 768px, and 1280px.

## Testing

- Unit tests are deterministic; fake Gemini/Vercel/Supabase. No network.
- Table-driven cases for validators and scoring.
- Every bug fix gets a regression test.
- RLS changes require a new assertion in `tests/rls/run-rls-tests.mjs`.
- Never weaken an assertion to pass; fix the cause or document a real limitation.

## Formatting and commits

- Prettier (110 columns, double quotes, trailing commas, Tailwind class sorting).
- ESLint must pass with zero warnings.
- Commit messages describe intent, imperative mood, ≤72 character subject.
- Update docs in the same change as behaviour.

## Definition of done

1. Feature works through the real interface (page or API).
2. Typecheck, lint, unit tests, RLS harness, e2e (where relevant), and build pass.
3. Failure and empty states implemented.
4. Docs and changelog updated; verification recorded honestly.
