# Facebook Data Sources

## Policy

Being logged into Facebook does **not** grant permission to scrape arbitrary content.
DemandForge only imports content the operator is authorised to read and reuse.

### Prohibited (not implemented, and must not be added)

- Hidden browser-session scraping, headless crawling, or background collection.
- Login/CAPTCHA/rate-limit bypass, private-group circumvention.
- Extracting cookies, sessions, private messages, or credentials.
- Automated posting, commenting, or messaging.
- Fake or unapproved Meta API permissions/endpoints.

## Supported collection paths

| Path                              | Status          | Mechanism                              | Notes                                                                      |
| --------------------------------- | --------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| Manual paste + URL                | Implemented     | `POST /api/v1/leads`                   | Works for any source the user can read; URL optional                       |
| Chrome extension (user-initiated) | Implemented     | `POST /api/v1/import` with `df_` token | Reads only the active tab, only after a click; facebook.com only           |
| Approved Meta API integration     | Not implemented | —                                      | Requires app review and explicit permissions; no endpoint is invented here |
| Scheduled automatic collection    | Not implemented | —                                      | Would require an authorised API                                            |

## Extension design

- **Manifest V3**, permissions: `activeTab`, `scripting`, `storage`, optional host permission
  requested at runtime for the configured dashboard origin.
- **No `content_scripts`** and no Facebook host permission. Capture runs
  `chrome.scripting.executeScript` from the popup, on the active tab, in response to a click.
- Extraction picks the last visible `[role="article"]` on a Facebook post page (or falls back to
  the visible body text), capped at 20,000 characters, and strips query/fragment from the URL.
- The popup shows the text for review before import. Nothing is sent automatically.
- The service worker only logs installation and answers a `ping` message.

### Token handling

1. Settings → Integrations → create a token (`df_…`), shown once.
2. Paste into the popup; stored in `chrome.storage.local`.
3. The popup requests host permission for the exact origin (HTTPS required, except localhost).
4. Requests send `Authorization: Bearer df_…`; the server hashes and looks it up in `api_tokens`.
5. Revoking a token in Settings disables it immediately.

## Meta API — what it would require

An approved Meta app with permissions appropriate to the content type (for example page posts
for Pages the user administers), app review, and a documented endpoint. None of that is
configured in this repository, so no Graph API call exists. `source_type = 'meta_api'` is
reserved in the database enum, but the input validation rejects it and the UI says automatic
collection is unavailable.

Adding an adapter later must implement this interface (see `docs/IMPLEMENT.md`):

```ts
interface SourceAdapter {
  type: SourceType;
  isConfigured(): boolean;
  fetchSince(cursor: string | null): Promise<{ items: RawPost[]; nextCursor: string | null }>;
}
```

Adapters must not assume permission from a logged-in session.

## Duplicate detection

- Canonical URL first (https, lowercased host, tracking parameters removed, fragment removed,
  trailing slash removed, sorted query).
- Then SHA-256 of NFKC-normalized, lowercased, whitespace-collapsed text.
- Both are unique per user, so two accounts may independently import the same post.
- Re-imports return the existing lead (HTTP 200) with a link instead of creating a duplicate.

## Individual rights and retention

- Only the post text, canonical URL, and the operator's own metadata are stored.
- Author names/profile links are not collected by the extension.
- Deleting a lead removes its text; deleting the account removes everything.
- Operators must honour applicable platform terms and data-protection obligations when importing.
