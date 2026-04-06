import fetch from "node-fetch";

const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_DEBUG_BODY_CHARS = 2000;

function isDebugEnabled() {
  return String(process.env.BIOMETRIC_API_DEBUG || "").toLowerCase() === "true";
}

function safeDebugLog(label, payload) {
  if (!isDebugEnabled()) return;
  try {
    const text =
      typeof payload === "string"
        ? payload
        : JSON.stringify(payload, (_k, v) => (typeof v === "bigint" ? String(v) : v));
    // Never include token here; only URLs + truncated bodies.
    console.log(`[BIOMETRIC_API_DEBUG] ${label}: ${text.slice(0, MAX_DEBUG_BODY_CHARS)}`);
  } catch (e) {
    console.log(`[BIOMETRIC_API_DEBUG] ${label}: <unserializable>`);
  }
}

function getConfig() {
  const baseUrl = process.env.BIOMETRIC_API_BASE_URL;
  const token = process.env.BIOMETRIC_API_TOKEN;

  if (!baseUrl) {
    throw new Error("Missing BIOMETRIC_API_BASE_URL");
  }
  if (!token) {
    throw new Error("Missing BIOMETRIC_API_TOKEN");
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

async function fetchJson(url, { token, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    safeDebugLog("REQUEST_URL", url);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      },
      signal: controller.signal
    });

    const contentType = res.headers.get("content-type") || "";
    const bodyText = await res.text();
    safeDebugLog("RESPONSE_META", { status: res.status, contentType });
    safeDebugLog("RESPONSE_BODY", bodyText);

    if (!res.ok) {
      const msg = bodyText?.slice(0, 500) || res.statusText;
      throw new Error(`External API ${res.status}: ${msg}`);
    }

    if (!contentType.includes("application/json")) {
      throw new Error("External API returned non-JSON response");
    }

    return JSON.parse(bodyText);
  } finally {
    clearTimeout(timeout);
  }
}

export async function externalHealthCheck() {
  const { baseUrl, token } = getConfig();
  // Health endpoint is public, but keeping token isn't harmful; do not log it.
  const url = `${baseUrl}/`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    safeDebugLog("HEALTHCHECK_URL", url);
    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal
    });
    const text = await res.text();
    safeDebugLog("HEALTHCHECK_META", { status: res.status });
    safeDebugLog("HEALTHCHECK_BODY", text);
    if (!res.ok) throw new Error(`External API ${res.status}: ${text?.slice(0, 200)}`);
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAttendancePage({ page = 1, limit = 5000 } = {}) {
  const { baseUrl, token } = getConfig();
  const url = new URL(`${baseUrl}/api/attendance`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  return await fetchJson(url.toString(), { token });
}

export async function fetchAttendanceSince({ from }) {
  if (!from) throw new Error("Missing required param: from");
  const { baseUrl, token } = getConfig();
  const url = new URL(`${baseUrl}/api/attendance/since`);
  url.searchParams.set("from", from);
  return await fetchJson(url.toString(), { token });
}

