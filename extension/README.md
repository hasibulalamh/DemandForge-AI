# DemandForge AI Importer (Chrome MV3)

A user-initiated importer for project requests the user is authorised to read.
It does **not** scrape in the background, bypass access controls, or send messages.

## What it does

1. You open a Facebook post you can already view.
2. You click **Capture post from this tab** in the popup.
3. The popup injects a one-off function into the active tab (`chrome.scripting.executeScript`)
   that reads the visible post text and its URL.
4. You review/edit the text, then click **Import lead**. The popup calls
   `POST /api/v1/import` with a per-user bearer token.
5. The API deduplicates, stores the lead, and optionally queues Gemini analysis.

## What it deliberately does not do

- No persistent content script, no background scraping, no reading other tabs.
- No cookie, session, or credential access. It never talks to Facebook APIs.
- No bypass of login walls, private groups, CAPTCHAs, or rate limits.
- No automatic messaging or posting.
- No service-role key or Gemini/Vercel secret in the extension.

## Permissions

| Permission                                                     | Why                                                                           |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `activeTab`                                                    | Read the tab you are on, only after you click the action.                     |
| `scripting`                                                    | Inject the one-off text extractor into that tab.                              |
| `storage`                                                      | Store the dashboard URL and your extension token locally.                     |
| Optional host permission (`https://*/*`, `http://localhost/*`) | Call your dashboard API. Requested at runtime for the exact origin you enter. |

The manifest intentionally has no `content_scripts` and no Facebook host permission.

## Build

```bash
pnpm install
pnpm build:extension
# or directly: node extension/build.mjs
```

Output: `extension/dist/` containing `manifest.json`, `popup.html`, `popup.css`,
`popup.js`, `background.js`.

## Install

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select `extension/dist`.
4. In DemandForge, open **Settings → Integrations**, create an extension token,
   and copy it (shown once).
5. Open the popup, enter your dashboard URL (e.g. `https://your-app.vercel.app`)
   and the token, then click **Save and connect**. Grant the requested origin
   permission when Chrome asks.

## Troubleshooting

- **"Permission for the dashboard origin was not granted"** — reopen the popup and
  allow the site access prompt. Check `chrome://extensions` → the extension →
  Site access.
- **"Connection failed"** — confirm the dashboard URL is the origin only
  (no trailing path) and that the token has not been revoked.
- **"Open a Facebook post…"** — capture is limited to `facebook.com` by design.
- **"No post text found"** — open the specific post permalink, or paste the text
  manually. Expanded comment views can obscure the post container.
