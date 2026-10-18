# Scope

## In scope (implemented)

### Collection

- Manual import (paste text, optional URL, optional source).
- User-initiated Chrome MV3 import of the active Facebook tab.
- Collection rules with keyword/category matching hints.
- Duplicate detection by canonical URL and normalized content hash.
- Source management.

### Analysis

- Server-side Gemini service with structured JSON schema, retries, timeout, usage accounting.
- Evidence-backed extraction and a transparent, deterministic lead score.
- Durable job queue with atomic claiming, retries, backoff, stale recovery, idempotency.
- Per-lead and per-job status in the UI.

### Presentation and delivery

- Static demo generation (`index.html`, `assets/css/styles.css`, `assets/js/main.js`, `README.md`).
- Artifact validation, sandboxed preview, download, human approval.
- Vercel deployment of approved artifacts with real status and URL tracking.
- Deployment history and error reporting.

### Operations

- Outreach draft/status tracking (manual send only).
- AI usage and estimated cost reporting.
- Profile management and irreversible account deletion.
- Extension token management.
- Audit events for imports, approvals, analysis, generation, deployments.

## Out of scope (documented, intentionally not implemented)

| Item                                                         | Reason / current behaviour                                                                                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Automatic Facebook scraping                                  | Prohibited. Only user-initiated import of content the user can view.                                                                                 |
| Meta Graph API ingestion                                     | Would require approved permissions and app review; not available in this build. `meta_api` is rejected by input validation; the DB enum reserves it. |
| Automated messaging or posting                               | The product never sends messages. Outreach is a tracker.                                                                                             |
| Hidden browser automation, cookie extraction, CAPTCHA bypass | Prohibited by product rules and not present in the code.                                                                                             |
| Multi-tenant teams, invites, per-role UI permissions         | Single-workspace owner/member model.                                                                                                                 |
| Billing, subscriptions                                       | Not part of v1.                                                                                                                                      |
| Custom domains for demos                                     | Uses immutable Vercel deployment URLs.                                                                                                               |
| Image/asset generation for demos                             | Demos are text/CSS only; no external assets.                                                                                                         |
| Distributed rate limiting                                    | In-memory per instance; documented limitation.                                                                                                       |
| Real-time collaboration                                      | Not needed for a single-operator workflow.                                                                                                           |
| PGMQ/Supabase Queues                                         | Not required: the SQL queue with `FOR UPDATE SKIP LOCKED` covers the workload. Documented in `docs/ARCHITECTURE.md`.                                 |

## Assumptions

1. The operator has a Supabase project, a Gemini API key, and (optionally) a Vercel token.
2. The operator is permitted to read and reuse the posts they import.
3. Demo deployments are concept artifacts, not client-owned production sites.
4. Network egress to Gemini and Vercel is available from the runtime.
