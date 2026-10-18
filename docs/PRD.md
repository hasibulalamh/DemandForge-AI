# Product Requirements Document

## 1. Problem

A freelance web developer monitors Facebook groups for project requests, manually judges
which are worth pursuing, then spends hours building speculative demos. This is slow,
inconsistent, and easy to get wrong: weak leads get demos, strong leads are missed, and
there is no record of why a lead was prioritised.

## 2. Goal

Turn authorised project posts into scored, evidence-backed leads, and from a selected lead
produce an approved, deployable website concept — while keeping every decision explainable
and every deployment human-controlled.

## 3. Users

| User                               | Needs                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Owner (primary)                    | Run the whole pipeline: sources, leads, demos, deployments, outreach.         |
| Member (authorised dashboard user) | Same workspace access; role is recorded for future permission tiers.          |
| Prospective client                 | Receives a concept demo and a personal message **sent manually by the user**. |

There is no public/anonymous user. Every route except `/login` and `/api/v1/health` requires
authentication.

## 4. Jobs to be done

1. "Show me the posts worth responding to, ranked, with the reasons."
2. "Capture this post in two clicks without scraping anything I'm not allowed to see."
3. "Produce a credible concept site for this specific request, quickly."
4. "Let me check the demo and only then publish it."
5. "Tell me whether publishing actually worked, with the real URL."
6. "Keep my drafts and follow-ups organised without auto-messaging anyone."

## 5. Functional requirements

### 5.1 Sources and collection rules

- Create sources (`manual`, `chrome_extension`), optional URL, connection state.
- Create keyword rules with include/exclude keywords and categories; enable/disable.
- Meta API sources are **not implemented**; the API rejects `meta_api` at the input schema
  and the UI documents the limitation.

### 5.2 Lead import

- Manual import requires text (20–20,000 chars) and optional http(s) URL/source.
- Duplicate detection: canonical URL first, then SHA-256 of normalized text, scoped per user.
- Duplicate imports return the existing lead (HTTP 200) instead of creating a second row.
- Original text, canonical URL, hash, and evidence metadata are stored.

### 5.3 Analysis

- Runs as a durable background job. One analysis per lead version (idempotency key).
- Output: category, title, summary, required features, suggested features, technology
  preferences, budget status/amount/currency, urgency, hiring intent, requirements clarity,
  confidence, evidence quotes, next action, demo scope, template.
- Unknown stays `unknown`; a budget is stored only with both an amount and a currency.
- Score is computed deterministically in code (weights documented in `docs/GEMINI-INTEGRATION.md`).
- Failures are recorded on the lead and the job with a safe message; retries are bounded.

### 5.4 Dashboard

- Real counts only: leads, analysed leads, demos ready/deployed, outreach sent/replied,
  active/failed jobs, sources.
- Search, filters (pipeline, analysis), sorting (newest, score, oldest), pagination.
- Empty, loading, error, and not-found states.

### 5.5 Demo studio and demo lifecycle

- Only analysed leads can generate a demo.
- Template choice: local-service, portfolio, saas-landing.
- Artifact is exactly `index.html`, `assets/css/styles.css`, `assets/js/main.js`, `README.md`.
- The artifact is validated before storage and again before deployment.
- Preview is sandboxed (opaque origin, no same-origin access).
- Approval is explicit and invalidated on regeneration.
- Deployment is allowed only for approved artifacts.

### 5.6 Deployment

- Vercel API deployment into a dedicated demo project.
- Status lifecycle: not_deployed → queued → deploying → deployed | failed.
- Real URL persisted only after Vercel reports READY; errors stored verbatim (scrubbed).
- Full deployment history, including failed attempts and retries.

### 5.7 Outreach

- Draft text attached to a lead and an optional demo.
- Channel, status, sent/response timestamps are recorded manually.
- No sending, posting, or scheduling. This is a tracker.

### 5.8 Usage and settings

- Token usage and estimated cost per call, operation, and model.
- Profile update; irreversible account deletion cascades all owned data.
- Extension tokens: created once, hashed at rest, revocable.

### 5.9 Chrome extension

- User-initiated capture of the current Facebook post, editable before import.
- Bearer token auth; no cookies, no background scraping, no persistent content script.

## 6. Non-functional requirements

| Area           | Requirement                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Security       | RLS on all user tables; secrets server-only; CSRF origin checks; rate limits; sandboxed generated content. |
| Reliability    | Durable jobs with atomic claim, retries, backoff, stale recovery, idempotency.                             |
| Explainability | Every score decomposes into fixed weights and evidence quotes.                                             |
| Performance    | Paginated lists; bounded worker runs (≤45s); indexed queries.                                              |
| Accessibility  | Semantic headings, labelled fields, focus-visible styles, keyboard dialogs, reduced-motion support.        |
| Observability  | Job attempts, audit events, AI usage rows, deployment history.                                             |
| Portability    | No second database, no separate Node server, no Laravel.                                                   |

## 7. Out of scope (v1)

Automatic Meta API ingestion, automated messaging, multi-tenant teams/invites, billing,
custom domains per demo, and image generation.

## 8. Success measures

- Time from lead import to approved demo under 5 minutes for a clear request.
- 100% of deployments have a real Vercel URL or a recorded failure.
- 0 leads visible across accounts (verified by the RLS harness).
- 0 generated artifacts containing external requests or unsafe APIs (verified by validation tests).

## 9. Acceptance

See `docs/ACCEPTANCE-CRITERIA.md` for the verifiable checklist and
`docs/TEST-REPORT.md` for the executed evidence.
