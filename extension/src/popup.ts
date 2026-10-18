import {
  importLead,
  loadSettings,
  matchRule,
  normalizeBaseUrl,
  persistSettings,
  requestApiPermission,
  testConnection,
  type CollectionRule,
  type ExtensionSettings,
} from "./api";

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const baseUrlInput = byId<HTMLInputElement>("api-base-url");
const tokenInput = byId<HTMLInputElement>("api-token");
const settingsForm = byId<HTMLFormElement>("settings-form");
const settingsStatus = byId<HTMLParagraphElement>("settings-status");
const connectionBadge = byId<HTMLSpanElement>("connection-badge");
const captureButton = byId<HTMLButtonElement>("capture");
const captureStatus = byId<HTMLParagraphElement>("capture-status");
const importForm = byId<HTMLFormElement>("import-form");
const postUrlInput = byId<HTMLInputElement>("post-url");
const postTextInput = byId<HTMLTextAreaElement>("post-text");
const autoAnalyzeInput = byId<HTMLInputElement>("auto-analyze");
const importButton = byId<HTMLButtonElement>("import");
const importStatus = byId<HTMLParagraphElement>("import-status");
const ruleHint = byId<HTMLParagraphElement>("rule-hint");
const rulesContainer = byId<HTMLDivElement>("rules");

let settings: ExtensionSettings | null = null;
let rules: CollectionRule[] = [];

function setStatus(element: HTMLElement, message: string, tone: "neutral" | "success" | "error" = "neutral") {
  element.textContent = message;
  element.dataset.tone = tone;
}

function setBadge(state: "connected" | "error" | "unknown", label: string) {
  connectionBadge.dataset.state = state;
  connectionBadge.textContent = label;
}

function updateRuleHint() {
  if (!settings) {
    ruleHint.textContent = "";
    return;
  }
  const text = postTextInput.value;
  if (!text.trim()) {
    ruleHint.textContent = "Paste or capture post text to see which rule matches.";
    return;
  }
  const matched = matchRule(text, rules);
  ruleHint.textContent = matched ? `Matched rule: ${matched}` : "No enabled rule matches this text yet.";
}

function renderRules() {
  rulesContainer.replaceChildren();
  for (const rule of rules.slice(0, 6)) {
    const chip = document.createElement("span");
    chip.className = "rule-chip";
    chip.textContent = rule.name;
    rulesContainer.appendChild(chip);
  }
  if (rules.length === 0 && settings) {
    const empty = document.createElement("span");
    empty.className = "hint";
    empty.textContent = "No collection rules configured yet.";
    rulesContainer.appendChild(empty);
  }
}

async function connect(current: ExtensionSettings, announce: boolean): Promise<void> {
  try {
    const result = await testConnection(current);
    rules = result.rules;
    renderRules();
    setBadge("connected", "Connected");
    setStatus(
      settingsStatus,
      `Connected. ${result.rules.length} rule(s), ${result.sources.length} source(s).`,
      "success",
    );
    updateRuleHint();
  } catch (error) {
    setBadge("error", "Connection failed");
    setStatus(
      settingsStatus,
      error instanceof Error ? error.message : "Could not reach the dashboard.",
      "error",
    );
    if (announce) throw error;
  }
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const normalized = normalizeBaseUrl(baseUrlInput.value);
  if (!normalized.ok) {
    setStatus(settingsStatus, normalized.error, "error");
    setBadge("error", "Invalid URL");
    return;
  }
  const token = tokenInput.value.trim();
  if (!token.startsWith("df_") || token.length < 20) {
    setStatus(settingsStatus, "Paste a token created in Settings → Integrations.", "error");
    setBadge("error", "Invalid token");
    return;
  }

  void (async () => {
    const granted = await requestApiPermission(normalized.value);
    if (!granted) {
      setStatus(
        settingsStatus,
        "Permission for the dashboard origin was not granted. Allow it to import leads.",
        "error",
      );
      setBadge("error", "No permission");
      return;
    }

    settings = { apiBaseUrl: normalized.value, token };
    await persistSettings(settings);
    await connect(settings, false);
    if (settingsStatus.dataset.tone !== "success") return;
    if (importStatus) importStatus.textContent = "";
  })();
});

captureButton.addEventListener("click", () => {
  void (async () => {
    setStatus(captureStatus, "Reading the active tab…");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || !tab.url) {
        setStatus(captureStatus, "No active tab available.", "error");
        return;
      }

      const url = new URL(tab.url);
      if (!/(^|\.)facebook\.com$/.test(url.hostname)) {
        setStatus(
          captureStatus,
          "Open a Facebook post you are authorised to view. Capture is limited to facebook.com.",
          "error",
        );
        return;
      }

      const injection = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const articles = Array.from(document.querySelectorAll('[role="article"]')).filter(
            (element): element is HTMLElement =>
              element instanceof HTMLElement && element.offsetParent !== null,
          );
          const target = articles.length > 0 ? articles[articles.length - 1] : null;
          const text = (target?.innerText ?? "").trim() || (document.body?.innerText ?? "").trim();
          return {
            text: text.slice(0, 20000),
            url: location.href.split("#")[0].split("?")[0],
          };
        },
      });

      const result = injection[0]?.result as { text?: string; url?: string } | undefined;
      if (!result?.text || result.text.length < 20) {
        setStatus(
          captureStatus,
          "No post text found. Open a single post, or paste the text manually below.",
          "error",
        );
        return;
      }

      postTextInput.value = result.text;
      postUrlInput.value = result.url ?? "";
      updateRuleHint();
      setStatus(
        captureStatus,
        `Captured ${result.text.length.toLocaleString()} characters. Review before importing.`,
        "success",
      );
    } catch (error) {
      setStatus(
        captureStatus,
        error instanceof Error ? error.message : "Could not read the active tab.",
        "error",
      );
    }
  })();
});

postTextInput.addEventListener("input", updateRuleHint);

importForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    if (!settings) {
      setStatus(importStatus, "Save connection settings first.", "error");
      return;
    }
    if (postTextInput.value.trim().length < 20) {
      setStatus(importStatus, "Paste at least 20 characters.", "error");
      return;
    }

    importButton.disabled = true;
    setStatus(importStatus, "Importing…");
    try {
      const result = await importLead(settings, {
        originalText: postTextInput.value.trim(),
        canonicalUrl: postUrlInput.value.trim() || null,
        autoAnalyze: autoAnalyzeInput.checked,
      });

      if (result.duplicate) {
        setStatus(
          importStatus,
          "This post was already imported. Opening the existing lead is safe.",
          "neutral",
        );
      } else {
        setStatus(
          importStatus,
          result.jobId ? "Lead imported. Gemini analysis queued." : "Lead imported.",
          "success",
        );
      }

      const link = document.createElement("a");
      link.href = `${settings.apiBaseUrl}/leads/${result.leadId}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open lead in DemandForge →";
      link.style.display = "inline-block";
      link.style.marginTop = "6px";
      link.style.color = "#6d28d9";
      link.style.fontWeight = "600";
      importStatus.appendChild(document.createElement("br"));
      importStatus.appendChild(link);

      postTextInput.value = "";
      postUrlInput.value = "";
      updateRuleHint();
    } catch (error) {
      setStatus(importStatus, error instanceof Error ? error.message : "Import failed.", "error");
    } finally {
      importButton.disabled = false;
    }
  })();
});

void (async () => {
  const stored = await loadSettings();
  if (!stored) {
    setBadge("unknown", "Not connected");
    setStatus(settingsStatus, "Add your dashboard URL and an extension token.");
    return;
  }

  settings = stored;
  baseUrlInput.value = stored.apiBaseUrl;
  tokenInput.value = stored.token;
  await connect(stored, false);

  if (connectionBadge.dataset.state !== "connected") {
    // Keep the settings panel visible so the user can fix the token.
    const panel = document.getElementById("settings-panel") as HTMLDetailsElement | null;
    if (panel) panel.open = true;
  }
  updateRuleHint();
})();
