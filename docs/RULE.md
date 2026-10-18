# RULE.md — Mandatory Project Rules

These rules apply to every change in DemandForge AI. They are not suggestions.
`AGENTS.md` explains how to apply them while working.

## 1. Product boundary

1. DemandForge discovers **client project opportunities** from sources the user is
   authorised to read, analyses them, generates a static website concept, and — only
   after explicit human approval — deploys it.
2. DemandForge **never** sends unsolicited messages, automates Facebook actions, or
   performs login, CAPTCHA, rate-limit, or private-group circumvention.
3. The tool is a decision-support and demo-production system. Every score, status,
   and usage figure displayed to the user must come from the database or a documented
   computation — never from a fabricated placeholder.

## 2. Data collection

1. Supported collection paths are: manual paste/URL import, the user-initiated Chrome
   extension import, and explicitly approved Meta APIs. Automatic hidden scraping is
   prohibited.
2. Only content the user can legitimately view and export is imported. Do not store
   cookies, passwords, private messages, or unrelated personal data.
3. Every lead must retain its original source URL (when one exists) and the original
   text. Analysis must never detach a claim from its evidence.
4. Duplicate imports must be detected before insert and must not create a second lead.

## 3. Secrets

1. `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `VERCEL_TOKEN`, and `CRON_SECRET`
   are server-only. They must never appear in `NEXT_PUBLIC_*` variables, client
   bundles, generated demos, logs, API responses, or the browser extension.
2. The extension authenticates with a per-user API token issued in Settings. API tokens
   are stored as SHA-256 hashes and shown once at creation.
3. Any value that reaches `NEXT_PUBLIC_*` is public by definition. Only the Supabase
   URL and publishable/anon key may live there.
4. Never commit `.env.local` or real credentials. Committed templates contain
   placeholders only.

## 4. Authorization

1. Every user-owned table has Row Level Security enabled with policies keyed on
   `auth.uid()`. Application code must not be the only access control.
2. Route handlers validate the caller with `requireUser()` (cookie session) or
   `requireApiToken()` (extension token), then apply ownership filters as defence in
   depth. Client-provided `user_id` is never trusted.
3. Mutations using cookie auth must pass the same-origin check.
4. The service-role client is only used inside `src/lib/jobs/`, trusted workers, and
   token verification. It is never imported into a Client Component.

## 5. Generated content isolation

1. Generated demos are static `index.html`, `assets/css/styles.css`,
   `assets/js/main.js`, `README.md`. No React, no bundler, no server code.
2. Every generated manifest is validated (allowed paths, size, no external network
   access, no inline handlers, no frames/objects, no `eval`). Unsafe manifests are
   rejected and marked failed.
3. Previews render inside a sandboxed iframe with `sandbox="allow-scripts"` and a CSP
   `sandbox` directive that creates an opaque origin. Generated code never shares the
   dashboard origin's cookies or APIs.
4. Deployment requires `demo_projects.generation_status = 'approved'` and
   `approved_at` set by a human. Workers reject unapproved artifacts.

## 6. Deployment honesty

1. A deployment is `deployed` only when the Vercel API reports a ready deployment and
   returns a URL. Timeouts and API errors are recorded as failures with the message.
2. Missing Vercel credentials produce a visible configuration error. Mocks are allowed
   only in tests.
3. Deployments are confined to the dedicated demo project named by
   `VERCEL_PROJECT_ID` / `VERCEL_PROJECT_NAME`; the service refuses names outside the
   configured project. It never mutates unrelated projects.

## 7. AI integrity

1. Gemini output is untrusted input: parse, validate with Zod, and bound retries.
2. Unknown budget, deadline, urgency, and intent stay `unknown`. The model may not
   invent requirements; every extracted feature carries a quote from the source.
3. Lead scores come from `src/lib/scoring.ts`, a deterministic, documented formula.
   The model supplies signals, not the final priority.
4. Gemini usage (tokens, cost estimate, success/error) is recorded in `ai_usage`.

## 8. Background work

1. Long work runs in the durable `jobs` table, not in an unbounded request.
2. Jobs are claimed atomically (`claim_jobs`, `FOR UPDATE SKIP LOCKED`), retried with
   backoff up to `max_attempts`, and protected by idempotency keys.
3. Queue endpoints are authenticated with `CRON_SECRET` and process a bounded number of
   jobs within a time budget.

## 9. Quality gates

Before a task is reported complete:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

- Tests must be real. Never invent results or mark skipped tests as passing.
- If a gate cannot run (missing credentials, unavailable service), record it in
  `docs/TEST-REPORT.md` and `docs/KNOWN-LIMITATIONS.md`.
- Bug fixes must include a regression test where practical.
- Do not weaken or delete an assertion to make a check pass.

## 10. Documentation

1. Code and documentation ship together. Update `docs/TASKS.md`,
   `docs/IMPLEMENTATION-PLAN.md`, `docs/CHANGELOG.md`, and affected docs in the same
   change.
2. Documentation must describe the code that exists. Planned features are labelled
   as not implemented.
3. When architecture changes, update `docs/TRD.md`, `docs/ARCHITECTURE.md`, and any
   affected diagram.
