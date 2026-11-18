/**
 * api/tts.js
 * Lightweight Natural Human Voice TTS endpoint for HRHub Navigation.
 * Streams natural Filipino (tl) & English (en) neural MP3 audio with 0 database egress.
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const rawText = String(req.query?.text || "").trim();
    const rawLang = String(req.query?.lang || "tl").toLowerCase().trim();
    const lang = rawLang === "en" ? "en" : "tl";

    if (!rawText) {
      return res.status(400).json({ error: "Missing text parameter" });
    }

    // Clamp to safe single-utterance length (client splits longer text into chunks)
    const text = rawText.slice(0, 200);
    const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;

    const upstream = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
      }
    });

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `TTS upstream error (${upstream.status})` });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=86400");
    return res.status(200).send(buffer);
  } catch (err) {
    console.warn("api/tts error:", err?.message);
    return res.status(500).json({ error: "Failed to synthesize voice audio" });
  }
}
