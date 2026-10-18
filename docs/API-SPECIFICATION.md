# API Specification

Base path: `/api/v1`. All responses are JSON with `Cache-Control: no-store`.

## Conventions

- Success: `{ "data": ... }`
- Error: `{ "error": { "code": string, "message": string, "details"?: unknown } }`
- Validation errors return `422 VALIDATION_ERROR` with `details: [{ path, message }]`.
- Auth: Supabase session cookie (browser) **or** `Authorization: Bearer df_...` (extension,
  import endpoints only).
- Cookie-authenticated mutations require an `Origin` matching `NEXT_PUBLIC_APP_URL` or the
  request origin. Missing `Origin` → `403 ORIGIN_REQUIRED`; mismatched → `403 ORIGIN_NOT_ALLOWED`;
  `Sec-Fetch-Site: cross-site` → `403 CROSS_SITE_REQUEST`.
- Rate limits are per user and route (in-memory fixed window).

## Auth

This is a personal single-owner deployment. The owner may use independent sessions on all
three PCs, but there is no public signup endpoint or team/member onboarding. Initial setup is
performed through `/setup` with the server-only `OWNER_SETUP_SECRET`; email verification and
password recovery return through `/auth/callback`.

| Endpoint      | Method | Auth   | Description                              |
| ------------- | ------ | ------ | ---------------------------------------- |
| `/health`     | GET    | public | `{ status: "ok", service, time }` only   |
| `/import`     | GET    | Bearer | Rules + sources for the extension popup  |
| `/import`     | POST   | Bearer | Import one lead, optional auto-analysis  |
| `/tokens`     | GET    | cookie | List own tokens (prefix only)            |
| `/tokens`     | POST   | cookie | Create token; plaintext returned once    |
| `/tokens/:id` | DELETE | cookie | Revoke token                             |
| `/profile`    | PATCH  | cookie | Update display name                      |
| `/profile`    | DELETE | cookie | Delete account (`{ confirm: "DELETE" }`) |

## Sources

| Endpoint       | Method | Body / notes                                                                             |
| -------------- | ------ | ---------------------------------------------------------------------------------------- |
| `/sources`     | GET    | Own sources                                                                              |
| `/sources`     | POST   | `{ sourceType: manual\|chrome_extension, sourceName, sourceUrl? }`; 409 on duplicate URL |
| `/sources/:id` | PATCH  | `{ sourceName?, sourceUrl?, connectionStatus? }`                                         |
| `/sources/:id` | DELETE | Removes the source, keeps leads                                                          |

## Collection rules

| Endpoint                | Method | Body                                                                       |
| ----------------------- | ------ | -------------------------------------------------------------------------- |
| `/collection-rules`     | GET    | Own rules                                                                  |
| `/collection-rules`     | POST   | `{ name, keywords[], excludedKeywords[], projectCategories[], isEnabled }` |
| `/collection-rules/:id` | PATCH  | Partial of the above                                                       |
| `/collection-rules/:id` | DELETE | —                                                                          |

## Leads

| Endpoint             | Method | Notes                                                                                                                                                                                                                  |
| -------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/leads`             | GET    | Query: `q`, `pipeline`, `analysis`, `category`, `minScore`, `sort` (`newest\|score\|oldest`), `page`, `pageSize` (≤50). Returns `{ leads, total, page, pageSize }`                                                     |
| `/leads`             | POST   | Manual import: `{ sourceId?, canonicalUrl?, originalText (20–20000), externalReference?, publishedAt? }`. Returns `{ leadId, duplicate, analysisStatus, matchedRule }`; 201 new, 200 duplicate, 409 on source conflict |
| `/leads/:id`         | GET    | Lead row (RLS)                                                                                                                                                                                                         |
| `/leads/:id`         | PATCH  | `{ pipelineStatus }`                                                                                                                                                                                                   |
| `/leads/:id`         | DELETE | Cascades demos/outreach                                                                                                                                                                                                |
| `/leads/:id/analyze` | POST   | Enqueues analysis (idempotent per lead version); 202 `{ jobId, jobStatus, duplicate }`                                                                                                                                 |

Import (`POST /import`, bearer) accepts the same body plus `autoAnalyze: boolean` and returns
`jobId` when a job was queued.

## Demos

| Endpoint              | Method | Notes                                                                                                                               |
| --------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/demos`              | GET    | Own demos with lead title/category                                                                                                  |
| `/demos`              | POST   | `{ leadId, templateName, title?, styleNotes? }`; requires analysed lead; 201 `{ demo, jobId }`                                      |
| `/demos/:id/approve`  | POST   | Requires a stored artifact and `ready\|approved`; sets `approved_at`                                                                |
| `/demos/:id/deploy`   | POST   | Requires approval + Vercel config; 503 `NOT_CONFIGURED` if missing; 409 if a deployment is in progress; 202 `{ deployment, jobId }` |
| `/demos/:id/preview`  | GET    | HTML with `sandbox` CSP; requires session                                                                                           |
| `/demos/:id/download` | GET    | Self-contained HTML attachment                                                                                                      |

## Jobs

| Endpoint    | Method   | Notes                                                                                                                                                                      |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/jobs`     | GET      | Query: `status`, `type`, `page`, `pageSize`                                                                                                                                |
| `/jobs/run` | GET/POST | Worker only. Requires `Authorization: Bearer $CRON_SECRET`; 503 if unset, 401 mismatch. Returns `{ workerId, recovered, claimed, succeeded, failed, retried, durationMs }` |

Vercel Cron calls this endpoint every five minutes (`vercel.json`). Route handlers also invoke
`runWorker` through `after()` for low-latency processing; both paths are bounded.

## Outreach

| Endpoint        | Method | Notes                                                                                                |
| --------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `/outreach`     | GET    | Own records with lead titles                                                                         |
| `/outreach`     | POST   | `{ leadId, demoProjectId?, channel, draftContent, status? }`; demo must belong to the same lead/user |
| `/outreach/:id` | PATCH  | `{ status?, draftContent?, notes?, sentAt?, responseAt? }`; timestamps stamped when status implies   |
| `/outreach/:id` | DELETE | —                                                                                                    |

## Usage

`GET /usage` → totals (calls, errors, tokens, estimated cost), grouped by operation and model,
plus the 20 most recent calls. All values come from `ai_usage` rows.

## Status codes

| Code | Meaning                                               |
| ---- | ----------------------------------------------------- |
| 200  | Success / duplicate import                            |
| 201  | Created                                               |
| 202  | Job queued                                            |
| 400  | Malformed body                                        |
| 401  | No valid session/token                                |
| 403  | Origin/ownership refusal                              |
| 404  | Missing or not owned                                  |
| 409  | Duplicate / invalid state (not approved, in progress) |
| 422  | Schema validation / unsafe artifact                   |
| 429  | Rate limited (`details.retryAfterSeconds`)            |
| 503  | Integration not configured                            |

## Rate limits (per user)

| Route        | Limit      |
| ------------ | ---------- |
| Lead import  | 30/min     |
| Analyse      | 10/min     |
| Demo create  | 10/min     |
| Deploy       | 5/min      |
| Token create | 5/min      |
| Reads        | 60–120/min |

State is per serverless instance; documented in `docs/SECURITY.md`.
