/**
 * serverlessProxyService.js
 * Universal Client-Side Interface for HRHub Serverless Proxy.
 * 
 * Routes external API calls through /api/proxy serverless function to:
 * - Eliminate browser CORS errors.
 * - Protect tokens and API URLs from direct client snooping.
 * - Provide automatic fallback to direct fetch in offline / standalone environments.
 */

const STORAGE_KEY_PROXY_ENABLED = "hrhub_serverless_proxy_enabled";

/**
 * Checks if the serverless proxy routing is enabled
 */
export function isServerlessProxyEnabled() {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY_PROXY_ENABLED);
  return stored !== "false";
}

/**
 * Sets proxy routing state
 */
export function setServerlessProxyEnabled(enabled) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_PROXY_ENABLED, enabled ? "true" : "false");
}

/**
 * Checks if a URL is an external third-party API that requires proxying
 */
export function isExternalApiUrl(url) {
  if (!url || typeof url !== "string") return false;
  // Local or relative URLs do not need proxying
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) return false;

  try {
    const parsed = new URL(url, window.location.origin);
    // Don't proxy same origin or Supabase (Supabase has native CORS configured)
    if (parsed.origin === window.location.origin) return false;
    if (parsed.hostname.includes("supabase.co")) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Constructs a proxied URL for a target endpoint
 */
export function buildProxyUrl(targetUrl) {
  if (!targetUrl) return "";
  if (!isServerlessProxyEnabled()) return targetUrl;
  if (!isExternalApiUrl(targetUrl)) return targetUrl;

  return `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
}

/**
 * High-reliability fetch wrapper that passes requests through the Serverless Proxy
 * with automatic fallback to direct fetch if the proxy encounters a network disruption.
 */
export async function proxyFetch(targetUrl, options = {}) {
  const shouldUseProxy = isServerlessProxyEnabled() && isExternalApiUrl(targetUrl);

  if (!shouldUseProxy) {
    return fetch(targetUrl, options);
  }

  const proxiedUrl = buildProxyUrl(targetUrl);

  try {
    const res = await fetch(proxiedUrl, options);
    // If proxy returned a successful status, return response
    if (res.ok || (res.status >= 400 && res.status < 500)) {
      return res;
    }

    // If proxy returned 502/504 (gateway error), attempt direct fetch fallback
    console.warn(`[Proxy Notice] Serverless proxy returned status ${res.status}. Attempting direct fallback.`);
    return await fetch(targetUrl, options);
  } catch (err) {
    console.warn("[Proxy Notice] Serverless proxy fetch error, falling back to direct fetch:", err.message);
    return await fetch(targetUrl, options);
  }
}

/**
 * Quick health check for serverless proxy availability
 */
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
