
const STORAGE_KEY_PROXY_ENABLED = "hrhub_serverless_proxy_enabled";

export function isServerlessProxyEnabled() {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY_PROXY_ENABLED);
  return stored !== "false";
}

export function setServerlessProxyEnabled(enabled) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_PROXY_ENABLED, enabled ? "true" : "false");
}

export function isExternalApiUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) return false;

  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin === window.location.origin) return false;
    if (parsed.hostname.includes("supabase.co")) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildProxyUrl(targetUrl) {
  if (!targetUrl) return "";
  if (!isServerlessProxyEnabled()) return targetUrl;
  if (!isExternalApiUrl(targetUrl)) return targetUrl;

  return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}

export async function proxyFetch(targetUrl, options = {}) {
  const shouldUseProxy = isServerlessProxyEnabled() && isExternalApiUrl(targetUrl);

  if (!shouldUseProxy) {
    return fetch(targetUrl, options);
  }

  const proxiedUrl = buildProxyUrl(targetUrl);

  try {
    const res = await fetch(proxiedUrl, options);
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const isProxyHeaderPresent = Boolean(res.headers.get("x-serverless-proxy"));
    const isSpaHtmlFallback = contentType.includes("text/html") && !isProxyHeaderPresent;

    if (isSpaHtmlFallback || (res.status === 404 && !isProxyHeaderPresent)) {
      console.warn("[Proxy Notice] /api/proxy unavailable (SPA fallback detected). Attempting direct fetch.");
      return await fetch(targetUrl, options);
    }

    if (res.ok || (res.status >= 400 && res.status < 500)) {
      return res;
    }

    console.warn(`[Proxy Notice] Serverless proxy returned status ${res.status}. Attempting direct fallback.`);
    return await fetch(targetUrl, options);
  } catch (err) {
    console.warn("[Proxy Notice] Serverless proxy fetch error, falling back to direct fetch:", err.message);
    return await fetch(targetUrl, options);
  }
}

export async function testServerlessProxyHealth() {
  try {
    const testUrl = "https://httpbin.org/status/200";
    const res = await fetch(`/api/proxy?url=${encodeURIComponent(testUrl)}`, {
      headers: { Accept: "application/json" }
    });
    return res.ok || res.status === 200;
  } catch {
    return false;
  }
}
