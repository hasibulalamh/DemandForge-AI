/**
 * Minimal MV3 service worker.
 *
 * The extension performs collection only in response to a click in the popup,
 * which calls chrome.scripting.executeScript against the active tab. There is
 * deliberately no persistent content script and no background scraping, so this
 * worker only handles lifecycle bookkeeping and a health message.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.info(
      "[DemandForge] extension installed. Open the popup to configure the dashboard URL and token.",
    );
  }
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (message && typeof message === "object" && (message as { type?: string }).type === "ping") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return true;
  }
  return false;
});
