export interface ExtensionSettings {
  apiBaseUrl: string;
  token: string;
}

export interface CollectionRule {
  id: string;
  name: string;
  keywords: string[];
  excluded_keywords: string[];
  is_enabled: boolean;
}

export interface SourceSummary {
  id: string;
  source_name: string;
  source_type: string;
  connection_status: string;
}

export interface ImportResponse {
  duplicate: boolean;
  leadId: string;
  analysisStatus: string;
  matchedRule: string | null;
  jobId: string | null;
}

const STORAGE_KEY = "demandforge.settings.v1";

export async function loadSettings(): Promise<ExtensionSettings | null> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as Partial<ExtensionSettings> | undefined;
  if (!value?.apiBaseUrl || !value?.token) return null;
  return { apiBaseUrl: value.apiBaseUrl, token: value.token };
}

export async function persistSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

export function normalizeBaseUrl(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Enter the dashboard URL." };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid absolute URL." };
  }

  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";

  if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
    return { ok: false, error: "Use HTTPS (plain HTTP is only allowed for localhost)." };
  }

  if (url.pathname !== "/" && url.pathname !== "") {
    return { ok: false, error: "Use the origin only, without a path." };
  }

  return { ok: true, value: url.origin };
}

export async function requestApiPermission(baseUrl: string): Promise<boolean> {
  try {
    const origin = `${new URL(baseUrl).origin}/*`;
    const alreadyGranted = await chrome.permissions.contains({ origins: [origin] });
    if (alreadyGranted) return true;
    return await chrome.permissions.request({ origins: [origin] });
  } catch {
    return false;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Request failed (HTTP ${response.status}).`);
  }
  if (!payload || payload.data === undefined) {
    throw new Error("The dashboard returned an unexpected response.");
  }
  return payload.data;
}

export async function apiRequest<T>(
  settings: ExtensionSettings,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${settings.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${settings.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  return parseResponse<T>(response);
}

export async function testConnection(
  settings: ExtensionSettings,
): Promise<{ rules: CollectionRule[]; sources: SourceSummary[] }> {
  return apiRequest<{ rules: CollectionRule[]; sources: SourceSummary[] }>(settings, "/api/v1/import", {
    method: "GET",
  });
}

export async function importLead(
  settings: ExtensionSettings,
  input: { originalText: string; canonicalUrl: string | null; autoAnalyze: boolean },
): Promise<ImportResponse> {
  return apiRequest<ImportResponse>(settings, "/api/v1/import", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function matchRule(text: string, rules: CollectionRule[]): string | null {
  const lower = text.toLowerCase();
  for (const rule of rules) {
    if (!rule.is_enabled) continue;
    if (rule.excluded_keywords.some((word) => word && lower.includes(word.toLowerCase()))) continue;
    if (rule.keywords.some((word) => word && lower.includes(word.toLowerCase()))) return rule.name;
  }
  return null;
}
