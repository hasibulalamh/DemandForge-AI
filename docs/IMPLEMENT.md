# Implementation Guide

This document describes how the delivered code is structured and how to extend it safely.

## 1. Configure

```bash
cp .env.example .env.local
```

Required for the core app: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
Required for analysis: `GEMINI_API_KEY` (+ optional `GEMINI_MODEL`).
Required for deployments: `VERCEL_TOKEN` + `VERCEL_PROJECT_ID`/`VERCEL_PROJECT_NAME`.
Required for scheduled workers: `CRON_SECRET`.

## 2. Apply the schema

```bash
npx supabase link --project-ref <ref>
pnpm db:push
```

Verify locally with `pnpm test:rls` (Docker required). It applies the same migrations to a fresh
Postgres instance and asserts RLS.

## 3. Add a database table

1. Create `supabase/migrations/<timestamp>_<name>.sql`.
2. Add the table, constraints, indexes, `updated_at` trigger, RLS enablement, and policies.
3. Grant as appropriate (`authenticated` for user tables; worker writes stay service-role).
4. Update `src/types/database.ts` (or `pnpm db:types`).
5. Add to the table list in `tests/rls/run-rls-tests.mjs` and assert isolation.
6. Update `docs/BACKEND-SCHEMA.md`, `docs/AUTH-AND-RLS.md`, `docs/CHANGELOG.md`.

## 4. Add an API route

```ts
// src/app/api/v1/example/route.ts
import type { NextRequest } from "next/server";
import { jsonOk, safeRoute } from "@/lib/api/errors";
import { assertRateLimit } from "@/lib/api/rate-limit";
import { requireApiUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return safeRoute(async () => {
    const user = await requireApiUser(request);
    assertRateLimit(`example:${user.id}`, 60, 60_000);
    return jsonOk({ ok: true });
  });
}
```

Checklist: auth guard → origin check (included) → rate limit → Zod parse → ownership-scoped
query → `jsonOk`. Never return a raw provider error.

## 5. Add a job type

1. Add a Zod payload schema to `jobPayloadSchemas` in `src/lib/jobs/types.ts`.
2. Write `src/lib/jobs/handlers/<name>.ts` exporting a `JobHandler`.
3. Register it in `HANDLERS` in `src/lib/jobs/worker.ts`.
4. Throw `NonRetryableJobError` for permanent failures (missing config, unsafe data).
5. Enqueue with a deterministic idempotency key from the route.
6. Add unit tests using `tests/unit/fakes/admin.ts`.

Worker guarantees: atomic claim, attempt increment, backoff, max attempts, stale recovery,
sanitized errors, attempt rows.

## 6. Change the Gemini analysis

1. Update `src/lib/gemini/schemas.ts` (Zod **and** `leadAnalysisResponseSchema`).
2. Update `src/lib/gemini/prompts.ts` if the task changes.
3. Map new fields in `src/lib/gemini/analysis.ts` (`dbUpdate` + `evidence`).
4. Add a migration/column if persistence is required.
5. Update `docs/GEMINI-INTEGRATION.md` and add a golden-output test.

Never accept a model-supplied score: compute it in `src/lib/scoring.ts`.

## 7. Add a demo template

1. Add the template name to `demoTemplateSchema` (`src/lib/gemini/schemas.ts`) and
   `TEMPLATES` in `src/lib/demo/render.ts`.
2. Provide section ordering and class hooks; reuse the shared CSS and JS.
3. Ensure all model text is passed through `escapeHtml`.
4. Add a render+validate test in `tests/unit/demo.test.ts`.
5. Keep the four-file contract and zero external requests.

## 8. Change deployment behaviour

`src/lib/vercel/client.ts` owns all Vercel API calls. Rules:

- Use documented endpoints; never construct URLs from user input.
- Keep the dedicated-project guard.
- Only accept `*.vercel.app` deployment URLs.
- Persist status transitions; never report success before `READY`.
- Do not retry deployment creation blindly — poll an existing deployment id on retries.

## 9. Extension changes

```bash
pnpm build:extension   # extension/dist
```

- No persistent content script; capture uses `chrome.scripting.executeScript` after a click.
- Restrict capture to `facebook.com`.
- Never add service-role/Gemini/Vercel secrets.
- Request host permission only for the configured origin.
- Update `extension/README.md` if permissions change.

## 10. Verify before finishing

```bash
pnpm typecheck && pnpm typecheck:extension
pnpm lint
pnpm test
pnpm test:rls
pnpm test:e2e
pnpm build
pnpm build:extension
```

Record outcomes in `docs/TEST-REPORT.md`; never claim a check that did not run.
