
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

const BLOCKED_HOSTNAMES = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254",
  "metadata.google.internal"
];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );
  res.setHeader("X-Serverless-Proxy", "HRHub-Enterprise-Shield/2.0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
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

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return res.status(400).json({
        ok: false,
        error: "Invalid target URL format"
      });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return res.status(400).json({
        ok: false,
        error: "Only HTTP and HTTPS target endpoints are supported"
      });
    }

    const host = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(host) || host.endsWith(".internal") || host.endsWith(".local")) {
      return res.status(403).json({
        ok: false,
        error: "Target host restricted by corporate proxy security policy"
      });
    }

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

    const response = await fetch(parsed.toString(), fetchOptions);
    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") || "";
    res.status(response.status);

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const cacheControl = response.headers.get("cache-control");
    if (cacheControl) {
      res.setHeader("Cache-Control", cacheControl);
    } else {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    }

    const rateRem = response.headers.get("x-ratelimit-remaining");
    if (rateRem !== null) {
      res.setHeader("x-ratelimit-remaining", rateRem);
    }

    const rawBuffer = Buffer.from(await response.arrayBuffer());
    return res.send(rawBuffer);
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
