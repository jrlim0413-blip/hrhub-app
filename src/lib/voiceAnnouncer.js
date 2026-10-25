// Voice & Audio notification announcer matching HRHub AI Buddy girl voice
import { getFemaleVoice } from "../components/AiAssistantGirlWidget";

const VOICE_MUTED_KEY = "hrhub_voice_announcements_muted";

export function isVoiceMuted() {
  try {
    return localStorage.getItem(VOICE_MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function setVoiceMuted(muted) {
  try {
    localStorage.setItem(VOICE_MUTED_KEY, muted ? "true" : "false");
    if (muted && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function toggleVoiceMuted() {
  const next = !isVoiceMuted();
  setVoiceMuted(next);
  return next;
}

// Gentle pleasant chime before announcement
function playAttentionChime() {
  try {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Soft high chime (E5 -> A5)
    osc.frequency.setValueAtTime(659.25, now);
    osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (err) {
    console.debug("[voiceAnnouncer] Chime omitted:", err?.message);
  }
}

/**
 * Announces a message using speech synthesis matching HRHub AI Buddy
 * @param {string} text - Message to speak
 * @param {object} options - Optional pitch, rate, or chime overrides
 */
export function playAiVoiceAnnouncement(text, options = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  if (isVoiceMuted()) return;

  const {
    playChime = true,
    pitch = 1.25,
    rate = 1.05,
    onStart,
    onEnd,
    onError
  } = options;

  try {
    window.speechSynthesis.cancel();

    if (playChime) {
      playAttentionChime();
    }

    // Clean text: strip markdown characters, urls, bullet symbols
    const cleanText = text
      .replace(/[*_#`~>]/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    // Slight delay so chime sounds first
    setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voice = getFemaleVoice();
        if (voice) {
          utterance.voice = voice;
        }
        utterance.pitch = pitch;
        utterance.rate = rate;

        if (onStart) utterance.onstart = onStart;
        if (onEnd) utterance.onend = onEnd;
        if (onError) utterance.onerror = onError;

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn("[voiceAnnouncer] SpeechSynthesis speak failed:", e);
      }
    }, playChime ? 240 : 10);
  } catch (err) {
    console.warn("[voiceAnnouncer] Speech error:", err);
  }
}

export function stopVoiceAnnouncement() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
