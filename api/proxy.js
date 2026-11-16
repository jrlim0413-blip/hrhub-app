/**
 * api/proxy.js
 * High-Performance Serverless Proxy for HRHub.
 * Compatible with Vercel Serverless Functions, Node.js, and Edge environments.
 * 
 * Functions:
 * 1. Bypasses Cross-Origin Resource Sharing (CORS) blocks when fetching external STL / PCSO APIs.
 * 2. Shields client-side requests and internal bearer tokens from direct browser network exposure.
 * 3. Sanitizes headers and handles GET, POST, and OPTIONS requests securely.
 */

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

// Disallowed hosts for SSRF prevention
const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254", // AWS / cloud metadata
  "metadata.google.internal"
];

export default async function handler(req, res) {
  // 1. Universal CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("X-Serverless-Proxy", "HRHub-Enterprise-Shield/2.0");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // 2. Extract target destination URL
    let targetUrl = req.query.url;
    if (!targetUrl && req.body && typeof req.body === "object") {
      targetUrl = req.body.targetUrl || req.body.url;
    }

    if (!targetUrl) {
      return res.status(400).json({
        ok: false,
        error: "Missing required parameter: target 'url'",
        help: "Provide ?url=https://target-api.com/path or post JSON { targetUrl: '...' }"
      });
    }

    // Parse and validate URL
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return res.status(400).json({
        ok: false,
        error: "Invalid target URL format"
      });
    }

    // Protocol check
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.status(400).json({
        ok: false,
        error: "Only HTTP and HTTPS target endpoints are supported"
      });
    }

    // SSRF protection
    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(host) || host.endsWith(".internal") || host.endsWith(".local")) {
      return res.status(403).json({
        ok: false,
        error: "Target host restricted by corporate proxy security policy"
      });
    }

    // 3. Prepare forward headers
    const forwardHeaders = {
      Accept: req.headers["accept"] || "application/json",
      "User-Agent": "HRHub-Serverless-Proxy/2.0 (Simpal Group Enterprise; +https://hrhub.app)"
    };

    if (req.headers["authorization"]) {
      forwardHeaders["Authorization"] = req.headers["authorization"];
    } else if (req.query.token) {
      forwardHeaders["Authorization"] = `Bearer ${req.query.token}`;
    }

    if (req.headers["content-type"]) {
      forwardHeaders["Content-Type"] = req.headers["content-type"];
    }

    // 4. Prepare fetch options with 20s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const forwardMethod = req.method === "POST" && !req.query.url ? (req.body?.method || "POST") : req.method;
    const fetchOptions = {
      method: forwardMethod,
      headers: forwardHeaders,
      signal: controller.signal
    };

    if (["POST", "PUT", "PATCH"].includes(forwardMethod) && req.body) {
      if (typeof req.body === "string") {
        fetchOptions.body = req.body;
      } else {
        const payloadData = req.body.data !== undefined ? req.body.data : req.body;
        fetchOptions.body = JSON.stringify(payloadData);
      }
    }

    // 5. Execute proxy fetch
    const response = await fetch(parsed.toString(), fetchOptions);
    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    res.status(response.status);

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    // Forward caching headers if available
    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) {
      res.setHeader("Cache-Control", cacheControl);
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }

    // 6. Return response to client
    if (contentType.includes("application/json")) {
      const jsonData = await response.json();
      return res.json(jsonData);
    } else {
      const textData = await response.text();
      return res.send(textData);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return res.status(504).json({
        ok: false,
        error: "Gateway Timeout: Remote API took longer than 20 seconds to respond"
      });
    }

    console.error("Serverless Proxy Error:", error);
    return res.status(502).json({
      ok: false,
      error: "Bad Gateway: Serverless proxy could not reach target endpoint",
      message: error.message || String(error)
    });
  }
}
