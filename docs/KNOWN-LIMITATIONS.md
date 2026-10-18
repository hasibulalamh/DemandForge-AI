# Known Limitations

Honest boundaries of the current implementation. Items marked **blocked** require credentials or
approvals unavailable in this environment; they are implemented but not live-verified.

## External integrations

| Item                        | State           | Detail                                                                                                                                                                   |
| --------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Live Gemini analysis        | Blocked         | No `GEMINI_API_KEY` here. Client, schemas, retries, normalization, scoring and usage accounting are unit-tested with fakes; no real request was made.                    |
| Live Vercel deployment      | Blocked         | No `VERCEL_TOKEN`. Request shape, scoping, error mapping, polling and approval gating are unit-tested; no real deployment occurred.                                      |
| Hosted Supabase auth        | Blocked         | Login/signup/logout and redirects verified with a local Chromium run against an unconfigured project; real email delivery and hosted session cookies were not exercised. |
| RLS against hosted Supabase | Partial         | 63 checks pass against a local PostgreSQL using the `auth.uid()` shim, not against the hosted project.                                                                   |
| Meta API collection         | Not implemented | Requires an approved Meta app and app review. No endpoint or permission is invented. `source_type = 'meta_api'` is reserved and rejected by validation.                  |

## Product scope

- **No automatic or scheduled collection.** Import is user-initiated (manual paste or extension
  click). There is no crawler, headless browser, or background capture.
- **No automated outreach.** Drafts are prepared; sending and follow-up reminders are manual.
  Status is recorded, not driven, by the app.
- **One outreach draft per lead+channel.** Multiple channels are supported; multiple drafts per
  channel are not.
- **Deployments target one dedicated Vercel project** (`production` target). No custom domains,
  aliases, or per-demo projects. Stored per-deployment URLs are immutable.
- **Demos are static** (HTML/CSS/JS). No contact form submission, no backend, no analytics.
  Form/iframe/object/embed tags are rejected by validation.
- **Three templates** (`local-service`, `portfolio`, `saas-landing`). No user-uploaded templates
  or asset library.
- **No visual diff or A/B testing** of demos; revisions replace the artifact and clear approval.

## Security and operations

- **Rate limits are per serverless instance**, not global. A distributed limiter (Redis/Upstash)
  is required for strict enforcement.
- **No MFA UI**; enable it in Supabase Auth settings if required (the app respects the session).
- **No custom email templates or verification flow.** Supabase defaults apply.
- **No fine-grained roles.** `profiles.role` exists (`owner`/`admin`/`member`) but all users see
  only their own data; there is no shared workspace or team access.
- **Account deletion is immediate** for owned rows; audit and usage rows are deleted with the
  account. There is no soft-delete recovery window.
- **Audit retention is unbounded** (no automatic pruning).
- **Preview isolation relies on CSP `sandbox` + opaque-origin iframe**; it is not a separate
  origin or domain. A dedicated preview domain would be stronger.
- **Fixed-window limiter** allows bursts at window boundaries.
- **No request-level tracing** (no OpenTelemetry); logs are structured but local to the platform.

## Data model

- Deduplication is per user (unique on `user_id` + canonical URL / content hash). The same post
  can exist in two accounts.
- Canonicalization removes common tracking parameters, not all of them.
- Content hashing is over normalized text only; edited posts re-import as new leads.
- Post text is capped at 20,000 characters by the extension and API.
- Author identity is not stored (privacy by design), so per-author aggregation is unavailable.

## Testing gaps

- No authenticated end-to-end run (import → analyze → generate → deploy) in CI; that path is
  covered by a mocked workflow test.
- No load or soak testing of the queue.
- No accessibility audit beyond semantic markup, labels, focus styles, and contrast choices.
- Extension capture was not exercised against a live Facebook page (no authenticated browser
  session available); its extraction and messaging logic is reviewed but not integration-tested.

## Maintenance

- Migrations are forward-only; there is no down migration tooling.
- Regenerating `src/types/database.ts` requires the Supabase CLI and a linked project.
