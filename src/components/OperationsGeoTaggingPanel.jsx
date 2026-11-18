import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapPin, ShieldAlert, CheckCircle2, AlertTriangle, Layers, Navigation,
  Search, Plus, Eye, RefreshCw, Compass, Info, X, ChevronRight,
  Building2, Check, ExternalLink, Flag, Sliders, Radio, Globe,
  ShieldCheck, ArrowUpRight, Award, Map, CornerDownRight, Car,
  MapPinned, HelpCircle, CheckCheck, XCircle, Filter, Route, Milestone,
  LocateFixed, Play, Pause, RotateCcw, FastForward, ArrowRight,
  MoveRight, Navigation2, Crosshair, ListFilter, ArrowLeft,
  Bus, Factory, Warehouse, Users, Clock, Sparkles, Copy,
  Store, Phone, Wifi, Smartphone, Cloud, Ruler, Scale, CircleDollarSign, TrendingUp,
  Volume2, VolumeX
} from "lucide-react";

import {
  fetchCentralBooths,
  saveCentralBooth,
  deleteCentralBooth,
  subscribeToCentralBooths,
  getLocalCachedBooths
} from "../services/geoBoothsService";

import SNAPPED_EDGE_ROUTE_COORDS from "../data/mandaueEdgeBarangaysRoute.json";

import BARANGAY_PERIMETER_ROUTES from "../data/barangayPerimeterRoutes.json";

import MANDAUE_POIS from "../data/mandauePOIs.json";

import { API_CONFIG } from "../config/apiConfig";
import SOURCE_AGENTS_CACHE from "../data/sourceApiAgentsCache.json";
import { getStlAgents, getStlSupervisors, fetchLiveStlData, matchStlCanonicalName } from "../lib/stlApiLiveService";
import {
  MAGUINDANAO_SECTORS,
  MAGUINDANAO_CHECKPOINTS,
  ILIGAN_SECTORS,
  ILIGAN_CHECKPOINTS,
  COTABATO_SECTORS,
  COTABATO_CHECKPOINTS,
  MULTI_ENTITY_PERIMETER_ROUTES,
  MULTI_ENTITY_ALL_POIS,
  getSectorPerimeterRoute,
  getTerritoryPOIs,
  detectSectorInTerritory
} from "../data/multiEntityGeoData";
import { isGlobalAccessUser, getUserAssignedStlEntity } from "../lib/companyEntities";

export const BARANGAY_API_IDS = {
  casili: ["33"],
  subangdaku: ["47"],
  banilad: ["28"],
  cabancalan: ["30"],
  canduman: ["32"],
  tawason: ["49"],
  cubacub: ["36"],
  jagobiao: ["39"],
  paknaan: ["46"],
  labogon: ["40"],
  umapad: ["52"],
  opao: ["44"],
  looc: ["41"],
  cambaro: ["31"],
  centro: ["35"],
  tipolo: ["51"],
  bakilid: ["27"],
  basak: ["29"],
  maguikay: ["42"],
  tabok: ["48"],
  pagsabungan: ["45"],
  tingub: ["50"],
  casuntingan: ["34"],
  guizo: ["37"],
  mantuyong: ["43"],
  alang_alang: ["26"],
  ibabao: ["54", "38"]
};

export function formatGPS(coords) {
  if (!coords || coords.length < 2) return "N/A";
  const lat = coords[0];
  const lng = coords[1];
  const latStr = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? "E" : "W"}`;
  return `${latStr}, ${lngStr}`;
}

export function pointInPolygon(point, vs) {
  if (!vs || vs.length < 3) return false;
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegmentSquared(p, v, w) {
  const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
  if (l2 === 0) return (p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2;
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p[0] - (v[0] + t * (w[0] - v[0]))) ** 2 + (p[1] - (v[1] + t * (w[1] - v[1]))) ** 2;
}

export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function formatOsrmManeuver(step, destinationLabel = "Kiosk") {
  const m = step?.maneuver || {};
  const type = String(m.type || "").toLowerCase();
  const modifier = String(m.modifier || "").toLowerCase();
  const street = (step?.name || "").trim();
  const streetSuffix = street ? ` onto ${street}` : "";
  const distMeters = Math.round(step?.distance || 0);

  let instruction = street ? `Continue on ${street}` : "Continue straight";
  let dir = "straight";

  if (type === "depart") {
    instruction = street
      ? `Head ${modifier || "forward"} on ${street}`
      : `Depart heading ${modifier || "forward"}`;
    dir = "depart";
  } else if (type === "arrive") {
    instruction = `Arrive at ${destinationLabel}`;
    dir = "arrive";
  } else if (type === "roundabout" || type === "rotary") {
    const exitNum = m.exit ? ` (Exit ${m.exit})` : "";
    instruction = `Take roundabout${exitNum}${streetSuffix}`;
    dir = "roundabout";
  } else if (type === "turn" || type === "end of road" || type === "fork" || type === "off ramp" || type === "on ramp") {
    if (modifier.includes("uturn")) {
      instruction = `Make a U-turn${streetSuffix}`;
      dir = "uturn";
    } else if (modifier.includes("left")) {
      const prefix = modifier.includes("slight") ? "Keep left" : modifier.includes("sharp") ? "Sharp left" : "Turn left";
      instruction = `${prefix}${streetSuffix}`;
      dir = "left";
    } else if (modifier.includes("right")) {
      const prefix = modifier.includes("slight") ? "Keep right" : modifier.includes("sharp") ? "Sharp right" : "Turn right";
      instruction = `${prefix}${streetSuffix}`;
      dir = "right";
    } else {
      instruction = `Continue straight${streetSuffix}`;
      dir = "straight";
    }
  } else if (type === "merge") {
    instruction = `Merge${streetSuffix}`;
    dir = modifier.includes("left") ? "left" : modifier.includes("right") ? "right" : "straight";
  } else if (type === "new name" || type === "continue") {
    instruction = street ? `Continue onto ${street}` : "Continue straight";
    dir = "straight";
  }

  return {
    instruction,
    street: street || (type === "arrive" ? destinationLabel : "Local Road"),
    distanceMeters: distMeters,
    durationSec: Math.round(step?.duration || 0),
    dir,
    location: Array.isArray(m.location) && m.location.length >= 2 ? [m.location[1], m.location[0]] : null
  };
}

function formatNavDistance(meters) {
  if (!Number.isFinite(meters) || meters < 0) return "0 m";
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatNavDuration(sec) {
  const mins = Math.max(1, Math.round((sec || 0) / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

function formatNavArrivalClock(sec) {
  const arrival = new Date(Date.now() + Math.max(60, sec || 60) * 1000);
  return arrival.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const PH_ARTERIAL_CORRIDORS = [
  "m.c. briones", "mc briones", "a.s. fortuna", "as fortuna", "u.n. avenue", "un avenue", "united nations",
  "ouano", "marcelo fernan", "a.c. cortes", "ac cortes", "d.m. cortes", "gov. m. cuenco", "cuenco",
  "lopez jaena", "plaridel", "national highway", "cebu north", "sinsuat", "quezon ave", "roxb", "roxas",
  "tubod", "pala-o", "ibabao", "subangdaku", "banilad", "maguikay", "tipolo"
];

function toTaglishVoiceInstruction(step) {
  if (!step) return "";
  const street = step.street && step.street !== "Local Road" && step.street !== "Starting Point" ? step.street : "";
  const distText =
    step.distanceMeters >= 1000
      ? `Sa loob ng ${(step.distanceMeters / 1000).toFixed(1)} kilometers, `
      : step.distanceMeters >= 50
      ? `Sa loob ng ${Math.round(step.distanceMeters / 10) * 10} meters, `
      : "";

  switch (step.dir) {
    case "arrive":
      return `Nakarating ka na sa ${step.street || "destinasyon"}. Mag-ingat sa paghinto.`;
    case "depart":
      return street ? `Magsimula at dumiretso sa ${street}.` : `Magsimula at sundan ang ruta sa mapa.`;
    case "left":
      return `${distText}kumaliwa${street ? ` papuntang ${street}` : ""}.`;
    case "right":
      return `${distText}kumanan${street ? ` papuntang ${street}` : ""}.`;
    case "uturn":
      return `${distText}mag-U-turn${street ? ` sa ${street}` : ""}.`;
    case "roundabout":
      return `${distText}pumasok sa rotonda${street ? ` papuntang ${street}` : ""}.`;
    default:
      return `${distText}dumiretso lang${street ? ` sa ${street}` : ""}.`;
  }
}

function normalizeSpokenNavigationText(text) {
  return String(text || "")
    .replace(/\bBrgy\.?\s+/gi, "Barangay ")
    .replace(/\bSt\.?\b/g, "Street")
    .replace(/\bAve\.?\b/gi, "Avenue")
    .replace(/\bHwy\.?\b/gi, "Highway")
    .replace(/\bBlvd\.?\b/gi, "Boulevard")
    .replace(/\bRd\.?\b/gi, "Road")
    .replace(/\bExt\.?\b/gi, "Extension")
    .replace(/\bkm\b/gi, "kilometers")
    .replace(/\bmin\b/gi, "minutes")
    .replace(/\bhr\b/gi, "hour")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSpeechChunks(text, maxLen = 165) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).trim().length <= maxLen) {
      current = (current + " " + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        const parts = s.split(/,\s*/);
        let sub = "";
        for (const p of parts) {
          if ((sub + ", " + p).trim().length <= maxLen) {
            sub = sub ? `${sub}, ${p}` : p;
          } else {
            if (sub) chunks.push(sub);
            sub = p.slice(0, maxLen);
          }
        }
        current = sub;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

let activeNavAudioEl = null;
let activeNavSpeechToken = 0;
const navTtsAudioCache = Object.create(null);
const navTtsCacheKeys = [];
let navAudioUnlocked = false;

function unlockNavAudioPlayback() {
  if (navAudioUnlocked || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    }
    navAudioUnlocked = true;
  } catch { }
}

function stopWazeVoice() {
  activeNavSpeechToken += 1;
  if (activeNavAudioEl) {
    try {
      activeNavAudioEl.pause();
      activeNavAudioEl.currentTime = 0;
    } catch { }
    activeNavAudioEl = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch { }
  }
}

function speakBrowserNeuralFallback(text, lang = "tl") {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices() || [];

    const isNatural = (v) => /natural|online|google|samantha|karen|ava|blessica|angelo|rosa/i.test(v.name || "");
    const preferred =
      lang === "tl"
        ? voices.find((v) => /fil|tl-ph/i.test(v.lang) && isNatural(v)) ||
          voices.find((v) => /en-ph/i.test(v.lang) && isNatural(v)) ||
          voices.find((v) => /fil|tl-ph|en-ph/i.test(v.lang)) ||
          voices.find((v) => /en/i.test(v.lang) && isNatural(v))
        : voices.find((v) => /en-(us|ph|gb)/i.test(v.lang) && isNatural(v)) ||
          voices.find((v) => /en/i.test(v.lang) && isNatural(v));

    if (preferred) utter.voice = preferred;
    utter.lang = preferred?.lang || (lang === "tl" ? "fil-PH" : "en-US");
    utter.rate = 0.98;
    utter.pitch = 1.02;
    utter.volume = 1.0;
    window.speechSynthesis.speak(utter);
  } catch (err) {
    console.warn("Voice fallback notice:", err?.message);
  }
}

async function speakWazeVoice(text, lang = "tl") {
  if (typeof window === "undefined" || !text) return;
  const normalized = normalizeSpokenNavigationText(text);
  if (!normalized) return;

  stopWazeVoice();
  const myToken = activeNavSpeechToken;
  const ttsLang = lang === "en" ? "en" : "tl";
  const chunks = splitSpeechChunks(normalized, 165);

  try {
    for (const chunk of chunks) {
      if (myToken !== activeNavSpeechToken) return;
      const cacheKey = `${ttsLang}:${chunk}`;
      let blobUrl = navTtsAudioCache[cacheKey];

      if (!blobUrl) {
        const res = await fetch(`/api/tts?lang=${encodeURIComponent(ttsLang)}&text=${encodeURIComponent(chunk)}`);
        if (!res.ok) throw new Error(`TTS HTTP ${res.status}`);
        const ctype = res.headers.get("content-type") || "";
        if (!ctype.includes("audio")) throw new Error("Non-audio TTS response");
        const blob = await res.blob();
        blobUrl = URL.createObjectURL(blob);
        if (navTtsCacheKeys.length > 60) {
          const oldestKey = navTtsCacheKeys.shift();
          const oldUrl = navTtsAudioCache[oldestKey];
          if (oldUrl) URL.revokeObjectURL(oldUrl);
          delete navTtsAudioCache[oldestKey];
        }
        navTtsAudioCache[cacheKey] = blobUrl;
        navTtsCacheKeys.push(cacheKey);
      }

      if (myToken !== activeNavSpeechToken) return;

      await new Promise((resolve, reject) => {
        const audio = new Audio(blobUrl);
        activeNavAudioEl = audio;
        audio.playbackRate = 1.04;
        audio.onended = () => {
          if (activeNavAudioEl === audio) activeNavAudioEl = null;
          resolve();
        };
        audio.onerror = (e) => {
          if (activeNavAudioEl === audio) activeNavAudioEl = null;
          reject(e);
        };
        audio.play().catch(reject);
      });
    }
  } catch (err) {
    if (myToken !== activeNavSpeechToken) return;
    console.warn("Natural neural TTS unavailable, using browser voice fallback:", err?.message);
    speakBrowserNeuralFallback(normalized, ttsLang);
  }
}

function calculateBearingDeg(fromCoords, toCoords) {
  if (!fromCoords || !toCoords) return 0;
  const lat1 = (fromCoords[0] * Math.PI) / 180;
  const lat2 = (toCoords[0] * Math.PI) / 180;
  const dLon = ((toCoords[1] - fromCoords[1]) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function buildNavVehicleMarkerHtml(vehicleType = "motor", headingDeg = 0, labelText = "You (Live GPS)") {
  const safeDeg = Number.isFinite(headingDeg) ? Math.round(headingDeg) : 0;

  let vehicleSvg = "";
  if (vehicleType === "motor") {
    vehicleSvg = `
      <svg viewBox="0 0 64 64" width="46" height="46" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.65));">
        <defs>
          <radialGradient id="motoBeam" cx="50%" cy="15%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M22 14 L32 0 L42 14 Z" fill="url(#motoBeam)"/>
        <rect x="29" y="10" width="6" height="12" rx="3" fill="#0f172a" stroke="#e2e8f0" stroke-width="1.2"/>
        <path d="M18 22 L46 22" stroke="#cbd5e1" stroke-width="3.6" stroke-linecap="round"/>
        <circle cx="18" cy="22" r="2.2" fill="#0f172a"/>
        <circle cx="46" cy="22" r="2.2" fill="#0f172a"/>
        <rect x="25" y="17" width="14" height="26" rx="7" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <rect x="28.5" y="42" width="7" height="13" rx="3.5" fill="#0f172a" stroke="#cbd5e1" stroke-width="1.2"/>
        <circle cx="32" cy="31" r="7.5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.2"/>
        <path d="M26.5 28 Q32 23.5 37.5 28" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    `;
  } else if (vehicleType === "car") {
    vehicleSvg = `
      <svg viewBox="0 0 64 64" width="46" height="46" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.65));">
        <defs>
          <radialGradient id="carBeam" cx="50%" cy="12%" r="55%">
            <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#bae6fd" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <path d="M16 14 L24 0 L40 0 L48 14 Z" fill="url(#carBeam)"/>
        <rect x="19" y="11" width="26" height="44" rx="9" fill="#2563eb" stroke="#ffffff" stroke-width="2.2"/>
        <rect x="22" y="18" width="20" height="10" rx="3" fill="#0f172a" opacity="0.9"/>
        <rect x="23" y="29" width="18" height="12" rx="2.5" fill="#60a5fa" opacity="0.9"/>
        <rect x="23" y="42" width="18" height="6" rx="2" fill="#0f172a" opacity="0.85"/>
        <circle cx="23" cy="13" r="2.2" fill="#fef08a"/>
        <circle cx="41" cy="13" r="2.2" fill="#fef08a"/>
        <rect x="21" y="52" width="6" height="2.2" rx="1" fill="#f87171"/>
        <rect x="37" y="52" width="6" height="2.2" rx="1" fill="#f87171"/>
      </svg>
    `;
  } else {
    vehicleSvg = `
      <svg viewBox="0 0 64 64" width="42" height="42" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.6));">
        <circle cx="32" cy="32" r="22" fill="#ffffff" stroke="#2563eb" stroke-width="3"/>
        <path d="M32 13 L45 45 L32 38 L19 45 Z" fill="#2563eb"/>
      </svg>
    `;
  }

  return `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);pointer-events:none;">
      <div style="
        background: rgba(15, 23, 42, 0.92);
        color: #38bdf8;
        border: 1.5px solid #38bdf8;
        border-radius: 9999px;
        padding: 1.5px 8px;
        font-family: Inter, system-ui, sans-serif;
        font-size: 9.5px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: 0 3px 10px rgba(0,0,0,0.55);
        margin-bottom: 3px;
      ">${labelText}</div>
      <div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
        <div style="
          position:absolute;inset:-6px;border-radius:50%;
          background:rgba(56,189,248,0.22);
          border:2px solid rgba(56,189,248,0.6);
          animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
        <div style="transform: rotate(${safeDeg}deg); transition: transform 0.35s ease; display:flex; align-items:center; justify-content:center;">
          ${vehicleSvg}
        </div>
      </div>
    </div>
  `;
}

function computeOfflineProgressAlongRoute(currentCoords, routeCoords = []) {
  if (!currentCoords || !Array.isArray(routeCoords) || routeCoords.length < 2) {
    return { nearestIdx: 0, offRouteMeters: 0, remainingMeters: 0, nextWaypoint: null };
  }
  let nearestIdx = 0;
  let minDist = Infinity;
  for (let i = 0; i < routeCoords.length; i++) {
    const d = calculateDistanceMeters(currentCoords[0], currentCoords[1], routeCoords[i][0], routeCoords[i][1]);
    if (d < minDist) {
      minDist = d;
      nearestIdx = i;
    }
  }
  let remainingMeters = minDist;
  for (let i = nearestIdx; i < routeCoords.length - 1; i++) {
    remainingMeters += calculateDistanceMeters(
      routeCoords[i][0], routeCoords[i][1],
      routeCoords[i + 1][0], routeCoords[i + 1][1]
    );
  }
  const nextWaypoint = routeCoords[Math.min(nearestIdx + 2, routeCoords.length - 1)] || routeCoords[routeCoords.length - 1];
  return {
    nearestIdx,
    offRouteMeters: Math.round(minDist),
    remainingMeters: Math.round(remainingMeters),
    nextWaypoint
  };
}

function latLngToTileXY(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

async function precacheRouteForOffline(routePayload, lang = "tl") {
  if (typeof window === "undefined" || !routePayload) return false;
  try {
    try {
      localStorage.setItem("hrhub_offline_nav_route_v1", JSON.stringify({
        savedAt: Date.now(),
        targetBooth: routePayload.targetBooth,
        agentName: routePayload.agentName,
        coordinates: routePayload.coordinates,
        steps: routePayload.steps,
        distanceMeters: routePayload.distanceMeters,
        durationSec: routePayload.durationSec,
        traffic: routePayload.traffic
      }));
    } catch { }

    const ttsLang = lang === "en" ? "en" : "tl";
    const stepsToCache = (routePayload.steps || []).slice(0, 10);
    for (const st of stepsToCache) {
      const rawPhrase = ttsLang === "tl" ? toTaglishVoiceInstruction(st) : st.instruction;
      const norm = normalizeSpokenNavigationText(rawPhrase);
      const chunks = splitSpeechChunks(norm, 165);
      for (const chunk of chunks) {
        const cacheKey = `${ttsLang}:${chunk}`;
        if (!navTtsAudioCache[cacheKey]) {
          fetch(`/api/tts?lang=${encodeURIComponent(ttsLang)}&text=${encodeURIComponent(chunk)}`)
            .then(async (r) => {
              if (r.ok && (r.headers.get("content-type") || "").includes("audio")) {
                const blob = await r.blob();
                navTtsAudioCache[cacheKey] = URL.createObjectURL(blob);
                navTtsCacheKeys.push(cacheKey);
              }
            })
            .catch(() => {});
        }
      }
    }

    if ("caches" in window && Array.isArray(routePayload.coordinates) && routePayload.coordinates.length > 1) {
      const tileSet = new Set();
      const coords = routePayload.coordinates;
      const sampleStride = Math.max(1, Math.floor(coords.length / 12));
      for (let i = 0; i < coords.length; i += sampleStride) {
        const [lat, lng] = coords[i];
        for (const z of [16, 17]) {
          const { x, y } = latLngToTileXY(lat, lng, z);
          tileSet.add(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
        }
      }
      if (routePayload.targetBooth?.coords) {
        const [dLat, dLng] = routePayload.targetBooth.coords;
        for (const z of [17, 18]) {
          const { x, y } = latLngToTileXY(dLat, dLng, z);
          tileSet.add(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`);
        }
      }

      const urls = Array.from(tileSet).slice(0, 36);
      const tileCache = await caches.open("hrhub-offline-map-tiles-v1");
      for (let i = 0; i < urls.length; i += 6) {
        const batch = urls.slice(i, i + 6);
        await Promise.allSettled(
          batch.map(async (u) => {
            const exists = await tileCache.match(u);
            if (!exists) {
              const r = await fetch(u, { mode: "no-cors" }).catch(() => null);
              if (r) await tileCache.put(u, r).catch(() => {});
            }
          })
        );
      }
    }
    return true;
  } catch {
    return false;
  }
}

async function analyzeRouteTraffic(startCoords, endCoords, baseDistanceMeters, baseDurationSec, steps = []) {
  const tomtomKey = (API_CONFIG?.TOMTOM_API_KEY || "").trim();

  if (tomtomKey) {
    try {
      const ttUrl = `https://api.tomtom.com/routing/1/calculateRoute/${startCoords[0]},${startCoords[1]}:${endCoords[0]},${endCoords[1]}/json?traffic=true&travelMode=car&key=${encodeURIComponent(tomtomKey)}`;
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(ttUrl, { signal: controller.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        const summary = data?.routes?.[0]?.summary;
        if (summary) {
          const delaySec = Math.max(0, Math.round(summary.trafficDelayInSeconds || 0));
          const liveDurationSec = Math.round(summary.travelTimeInSeconds || (baseDurationSec + delaySec));
          const delayRatio = baseDurationSec > 0 ? delaySec / baseDurationSec : 0;
          const level = delaySec >= 360 || delayRatio >= 0.35 ? "heavy" : delaySec >= 120 || delayRatio >= 0.14 ? "moderate" : "clear";
          return {
            isLiveSensor: true,
            sourceLabel: "Live Traffic",
            level,
            label: level === "heavy" ? "Heavy Traffic" : level === "moderate" ? "Moderate Traffic" : "Light / Clear",
            delaySec,
            adjustedDurationSec: liveDurationSec,
            congestedStreets: [],
            advisoryText:
              level === "heavy"
                ? `Heavy live traffic detected (+${Math.max(1, Math.round(delaySec / 60))} min delay).`
                : level === "moderate"
                ? `Moderate traffic along route (+${Math.max(1, Math.round(delaySec / 60))} min delay).`
                : "Roads are mostly clear with smooth live traffic flow."
          };
        }
      }
    } catch (err) {
      console.warn("TomTom live traffic fallback notice:", err?.message);
    }
  }

  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const day = now.getDay();
  const isWeekdayOrSat = day >= 1 && day <= 6;

  const isSeverePeak = isWeekdayOrSat && ((hour >= 7.0 && hour <= 9.25) || (hour >= 16.75 && hour <= 19.75));
  const isModeratePeak = isWeekdayOrSat && ((hour >= 11.5 && hour <= 13.5) || (hour >= 15.5 && hour < 16.75) || (hour > 19.75 && hour <= 21.0));

  const congestedSet = new Set();
  const slowSteps = [];
  (steps || []).forEach((st) => {
    const streetLower = (st.street || "").toLowerCase();
    const isArterial = PH_ARTERIAL_CORRIDORS.some((c) => streetLower.includes(c));
    const speedKmh = st.durationSec > 0 ? (st.distanceMeters / st.durationSec) * 3.6 : 30;
    if (isArterial && st.street && st.street !== "Local Road") {
      congestedSet.add(st.street);
    }
    if ((isArterial && (isSeverePeak || isModeratePeak)) || (st.distanceMeters > 120 && speedKmh < 19)) {
      slowSteps.push(st);
    }
  });

  const avgSpeedKmh = baseDurationSec > 0 ? (baseDistanceMeters / baseDurationSec) * 3.6 : 28;
  const congestedStreets = Array.from(congestedSet).slice(0, 3);

  let level = "clear";
  let multiplier = 1.0;

  if (isSeverePeak && (congestedStreets.length > 0 || avgSpeedKmh < 24 || baseDistanceMeters > 1500)) {
    level = "heavy";
    multiplier = 1.48;
  } else if (isSeverePeak || (isModeratePeak && (congestedStreets.length > 0 || avgSpeedKmh < 26)) || avgSpeedKmh < 18) {
    level = "moderate";
    multiplier = 1.24;
  } else if (congestedStreets.length > 0 && hour >= 9.25 && hour <= 20.5 && isWeekdayOrSat) {
    level = "moderate";
    multiplier = 1.15;
  }

  const adjustedDurationSec = Math.round(baseDurationSec * multiplier);
  const delaySec = Math.max(0, adjustedDurationSec - baseDurationSec);
  const delayMin = Math.round(delaySec / 60);
  const corridorNote = congestedStreets.length > 0 ? ` near ${congestedStreets.join(", ")}` : "";

  return {
    isLiveSensor: false,
    sourceLabel: "Est. Traffic",
    level,
    label: level === "heavy" ? "Heavy Traffic Expected" : level === "moderate" ? "Moderate Traffic" : "Light / Clear Flow",
    delaySec,
    adjustedDurationSec,
    congestedStreets,
    slowSteps,
    advisoryText:
      level === "heavy"
        ? `Peak-hour heavy traffic expected${corridorNote}${delayMin > 0 ? ` (+${delayMin} min est.)` : ""}.`
        : level === "moderate"
        ? `Moderate urban traffic${corridorNote}${delayMin > 0 ? ` (+${delayMin} min est.)` : ""}.`
        : `Roads appear clear${corridorNote}. Normal travel speed expected.`
  };
}

export async function fetchRoadRouteBetweenPoints(startCoords, endCoords, includeSteps = false, destinationLabel = "Target Kiosk") {
  const straightDist = calculateDistanceMeters(startCoords[0], startCoords[1], endCoords[0], endCoords[1]);

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson${includeSteps ? "&steps=true" : ""}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), includeSteps ? 3800 : 3200);
    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadDistance = Math.round(route.distance);
        const roadDurationSec = Math.round(route.duration);
        const roadCoords = (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng]);
        const rawSteps = includeSteps ? (route.legs?.[0]?.steps || []) : [];
        const parsedSteps = rawSteps
          .filter((s) => s && (s.distance > 0 || s.maneuver?.type === "arrive" || s.maneuver?.type === "depart"))
          .map((s) => formatOsrmManeuver(s, destinationLabel));

        if (roadCoords.length > 1) {
          return {
            distanceMeters: roadDistance,
            durationSec: roadDurationSec,
            coordinates: roadCoords,
            steps: parsedSteps,
            isRoadBased: true,
            method: "OSRM Live Road Network"
          };
        }
      }
    }
  } catch (err) {
    console.warn("OSRM road route notice, using urban road grid solver:", err.message);
  }

  const circuityFactor = 1.32;
  const estimatedRoadDistance = Math.round(straightDist * circuityFactor);
  const estDuration = Math.round(estimatedRoadDistance / (28 * 1000 / 3600));

  const [lat1, lng1] = startCoords;
  const [lat2, lng2] = endCoords;
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;

  const roadWaypoints = [
    [lat1, lng1],
    [lat1 + dLat * 0.35, lng1 + dLng * 0.08],
    [lat1 + dLat * 0.42, lng1 + dLng * 0.52],
    [lat1 + dLat * 0.78, lng1 + dLng * 0.65],
    [lat2, lng2]
  ];

  const fallbackSteps = includeSteps
    ? [
        {
          instruction: "Head toward nearest main road from your coordinates",
          street: "Starting Point",
          distanceMeters: Math.round(estimatedRoadDistance * 0.4),
          durationSec: Math.round(estDuration * 0.4),
          dir: "depart",
          location: [lat1, lng1]
        },
        {
          instruction: `Continue along local corridor toward ${destinationLabel}`,
          street: "Main Road",
          distanceMeters: Math.round(estimatedRoadDistance * 0.6),
          durationSec: Math.round(estDuration * 0.6),
          dir: "straight",
          location: roadWaypoints[2]
        },
        {
          instruction: `Arrive at ${destinationLabel}`,
          street: destinationLabel,
          distanceMeters: 0,
          durationSec: 0,
          dir: "arrive",
          location: [lat2, lng2]
        }
      ]
    : [];

  return {
    distanceMeters: estimatedRoadDistance,
    durationSec: estDuration,
    coordinates: roadWaypoints,
    steps: fallbackSteps,
    isRoadBased: true,
    method: "Urban Road Network Grid Model"
  };
}

export function getYesterdayDates() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n) => String(n).padStart(2, "0");
  const isoDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const displayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(d);
  return { isoDate, displayLabel };
}

export function checkAgentIsActive(agent) {
  if (!agent) return false;
  if (agent.deleted_at) return false;

  if (agent.isActive !== undefined && agent.isActive !== null) {
    if ([0, "0", false, "false", "inactive", "disabled"].includes(agent.isActive)) return false;
    if ([1, "1", true, "true", "active", "enabled"].includes(agent.isActive)) return true;
  }

  if (agent.is_active !== undefined && agent.is_active !== null) {
    if ([0, "0", false, "false", "inactive", "disabled"].includes(agent.is_active)) return false;
    if ([1, "1", true, "true", "active", "enabled"].includes(agent.is_active)) return true;
  }

  const status = agent.status ?? agent.account_status ?? agent.accountStatus ?? agent.active;
  if (status !== undefined && status !== null && status !== "") {
    const normalized = String(status).toLowerCase().trim();
    if (["active", "enabled", "1", "true", "live", "approved"].includes(normalized)) return true;
    if (["inactive", "disabled", "0", "false", "suspended", "banned"].includes(normalized)) return false;
  }

  return false;
}

export function KioskIconSvg({ width = 48, height = 62, className = "" }) {
  return (
    <svg
      viewBox="0 0 100 130"
      width={width}
      height={height}
      className={className}
      style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="5" y="6" width="90" height="26" rx="13" fill="#f5a623" stroke="#18181b" strokeWidth="5.5" strokeLinejoin="round" />
      <path d="M 16 19 L 84 19" stroke="#18181b" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />

      <rect x="14" y="30" width="72" height="40" fill="#f5a623" stroke="#18181b" strokeWidth="5" strokeLinejoin="round" />

      <circle cx="50" cy="45" r="9" fill="#f5a623" stroke="#18181b" strokeWidth="4.5" />
      <path d="M 34 69 C 34 55, 66 55, 66 69 Z" fill="#f5a623" stroke="#18181b" strokeWidth="4.5" strokeLinejoin="round" />

      <rect x="3" y="66" width="94" height="16" rx="8" fill="#f5a623" stroke="#18181b" strokeWidth="5.5" strokeLinejoin="round" />

      <rect x="9" y="80" width="82" height="42" rx="10" fill="#f5a623" stroke="#18181b" strokeWidth="5.5" strokeLinejoin="round" />
      <rect x="19" y="90" width="62" height="22" rx="6" fill="#f5a623" stroke="#18181b" strokeWidth="4.5" strokeLinejoin="round" />
    </svg>
  );
}

export function getKioskSvgHtml(width = 48, height = 62) {
  return `
    <svg viewBox="0 0 100 130" width="${width}" height="${height}" style="display: block; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="6" width="90" height="26" rx="13" fill="#f5a623" stroke="#18181b" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 16 19 L 84 19" stroke="#18181b" stroke-width="3.5" stroke-linecap="round" opacity="0.9" />
      <rect x="14" y="30" width="72" height="40" fill="#f5a623" stroke="#18181b" stroke-width="5" stroke-linejoin="round" />
      <circle cx="50" cy="45" r="9" fill="#f5a623" stroke="#18181b" stroke-width="4.5" />
      <path d="M 34 69 C 34 55, 66 55, 66 69 Z" fill="#f5a623" stroke="#18181b" stroke-width="4.5" stroke-linejoin="round" />
      <rect x="3" y="66" width="94" height="16" rx="8" fill="#f5a623" stroke="#18181b" stroke-width="5.5" stroke-linejoin="round" />
      <rect x="9" y="80" width="82" height="42" rx="10" fill="#f5a623" stroke="#18181b" stroke-width="5.5" stroke-linejoin="round" />
      <rect x="19" y="90" width="62" height="22" rx="6" fill="#f5a623" stroke="#18181b" stroke-width="4.5" stroke-linejoin="round" />
    </svg>
  `;
}

function distToPolygon(point, vs) {
  if (!vs || vs.length < 2) return Infinity;
  let minD2 = Infinity;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const d2 = distToSegmentSquared(point, vs[i], vs[j]);
    if (d2 < minD2) minD2 = d2;
  }
  return Math.sqrt(minD2);
}

export function detectBarangayFromCoords(lat, lng) {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) return null;

  const multiSector = detectSectorInTerritory(numLat, numLng);
  if (multiSector) {
    return multiSector;
  }

  const pt = [numLat, numLng];

  const insideMatches = [];
  for (const [id, data] of Object.entries(BARANGAY_PERIMETER_ROUTES)) {
    if (data.boundaryPolygon && data.boundaryPolygon.length > 2) {
      if (pointInPolygon(pt, data.boundaryPolygon)) {
        insideMatches.push({ id, name: data.name, polygon: data.boundaryPolygon, data });
      }
    }
  }

  if (insideMatches.length === 1) {
    return {
      id: insideMatches[0].id,
      name: insideMatches[0].name,
      confidence: "100% Cadastral Survey Match",
      detail: "Coordinates fall strictly within official survey boundary polygon.",
      data: insideMatches[0].data
    };
  }

  if (insideMatches.length > 1) {
    let best = insideMatches[0];
    let minD = Infinity;
    insideMatches.forEach(m => {
      let sLat = 0, sLng = 0;
      m.polygon.forEach(p => { sLat += p[0]; sLng += p[1]; });
      const d = Math.hypot(pt[0] - (sLat / m.polygon.length), pt[1] - (sLng / m.polygon.length));
      if (d < minD) { minD = d; best = m; }
    });
    return {
      id: best.id,
      name: best.name,
      confidence: "Cadastral Boundary Edge",
      detail: "Coordinates lie on shared border; assigned by geographic centroid proximity.",
      data: best.data
    };
  }

  let best = null;
  let minEdgeDist = Infinity;
  for (const [id, data] of Object.entries(BARANGAY_PERIMETER_ROUTES)) {
    if (data.boundaryPolygon && data.boundaryPolygon.length > 2) {
      const d = distToPolygon(pt, data.boundaryPolygon);
      if (d < minEdgeDist) {
        minEdgeDist = d;
        best = { id, name: data.name, distMeters: Math.round(d * 111139), data };
      }
    }
  }

  if (best) {
    return {
      id: best.id,
      name: best.name,
      confidence: best.distMeters < 350 ? "Border Proximity Match" : "Nearest Boundary Proximity",
      detail: `Approximately ${best.distMeters}m from Brgy. ${best.name} perimeter boundary.`,
      distMeters: best.distMeters,
      data: best.data
    };
  }

  return null;
}

export const EDGE_BARANGAYS_CIRCUIT = [
  {
    step: 1,
    id: "subangdaku",
    name: "Subangdaku",
    routeIndex: 0,
    coords: [10.32363, 123.92073],
    edgeSector: "Southernmost Border Edge",
    mainRoad: "M.C. Briones Highway & Hernan Cortes St",
    bordersWith: "Mabolo & Kasambagan, Cebu City",
    landmark: "Mahiga Creek Culvert Bridge",
    instruction: "Perimeter route starts at Subangdaku Mahiga Bridge. Proceed North along Lopez Jaena into Tipolo."
  },
  {
    step: 2,
    id: "tipolo",
    name: "Tipolo",
    routeIndex: 94,
    coords: [10.32683, 123.92866],
    edgeSector: "South Commercial Edge",
    mainRoad: "Lopez Jaena Street & M.C. Briones",
    bordersWith: "Cebu City corridor via Tipolo River",
    landmark: "San Miguel Brewery Complex",
    instruction: "Follow Lopez Jaena St towards A.S. Fortuna junction to enter Banilad."
  },
  {
    step: 3,
    id: "banilad",
    name: "Banilad (Mandaue)",
    routeIndex: 316,
    coords: [10.34477, 123.91350],
    edgeSector: "South-West Border Edge",
    mainRoad: "A.S. Fortuna Street & Gov. M. Cuenco Ave",
    bordersWith: "Banilad, Cebu City (BTC & Country Mall)",
    landmark: "Banilad Flyover & Oakridge Business Park",
    instruction: "A.S. Fortuna eastward is Mandaue. West of flyover is Cebu City. Turn North along Gov. Cuenco into Cabancalan."
  },
  {
    step: 4,
    id: "cabancalan",
    name: "Cabancalan",
    routeIndex: 480,
    coords: [10.35996, 123.91927],
    edgeSector: "Western Border Edge",
    mainRoad: "Kauswagan Road & M.L. Quezon Ave",
    bordersWith: "Talamban, Cebu City (USC Campus)",
    landmark: "Tintay Creek Bridge & Terminal Junction",
    instruction: "East of Tintay Creek is Cabancalan. West is Talamban. Follow Kauswagan Rd into Canduman."
  },
  {
    step: 5,
    id: "canduman",
    name: "Canduman",
    routeIndex: 709,
    coords: [10.36835, 123.92744],
    edgeSector: "North-West Border Edge",
    mainRoad: "Canduman Road & H. Abellana St",
    bordersWith: "Talamban border slopes & Consolacion",
    landmark: "Sacred Heart School - Ateneo de Cebu",
    instruction: "Drive along Canduman Road and turn into Tawason highlands."
  },
  {
    step: 6,
    id: "tawason",
    name: "Tawason",
    routeIndex: 774,
    coords: [10.37500, 123.92300],
    edgeSector: "North-West Highland Edge",
    mainRoad: "Tawason Road",
    bordersWith: "Consolacion Mountain Ridge",
    landmark: "Tawason Hills",
    instruction: "Follow Tawason road connecting towards Casili northern border."
  },
  {
    step: 7,
    id: "casili",
    name: "Casili",
    routeIndex: 863,
    coords: [10.38650, 123.92950],
    edgeSector: "Northernmost Mountain Edge",
    mainRoad: "Casili Mountain Road & Ridge Link",
    bordersWith: "Consolacion Highland Barangays (Panas, Sacsac, Polog)",
    landmark: "Casili Hills & Boundary Marker",
    instruction: "Northernmost boundary of Mandaue City. Proceed East into Cubacub."
  },
  {
    step: 8,
    id: "cubacub",
    name: "Cubacub",
    routeIndex: 1033,
    coords: [10.37398, 123.93505],
    edgeSector: "North Border Edge",
    mainRoad: "Cubacub Road & Pagsabungan Link",
    bordersWith: "Consolacion Border Ridge",
    landmark: "Greenhills Subdivisions",
    instruction: "Follow Cubacub road down towards Cebu North National Highway into Jagobiao."
  },
  {
    step: 9,
    id: "jagobiao",
    name: "Jagobiao",
    routeIndex: 1231,
    coords: [10.37551, 123.95379],
    edgeSector: "North Highway Border Edge",
    mainRoad: "Cebu North National Highway",
    bordersWith: "Cansaga, Consolacion (Welcome Arch)",
    landmark: "Jagobiao Bridge & Eversley Sanitarium",
    instruction: "South of bridge is Mandaue. North past arch is Consolacion. Turn South-East to Paknaan Coastal."
  },
  {
    step: 10,
    id: "paknaan",
    name: "Paknaan",
    routeIndex: 1323,
    coords: [10.37042, 123.96802],
    edgeSector: "North-East Coastal Edge",
    mainRoad: "Cebu North Coastal Road",
    bordersWith: "Consolacion Coastal across Cansaga Bay",
    landmark: "Cansaga Bay Bridge Southern Abutment",
    instruction: "Stay on Mandaue side of Cansaga Bridge. Follow coastal highway South into Labogon."
  },
  {
    step: 11,
    id: "labogon",
    name: "Labogon",
    routeIndex: 1468,
    coords: [10.34735, 123.96146],
    edgeSector: "Eastern Coastal Edge",
    mainRoad: "Labogon Coastal Road",
    bordersWith: "Mactan Channel Shoreline",
    landmark: "Labogon Industrial Corridor",
    instruction: "Follow shoreline highway South towards Marcelo Fernan Bridge approach."
  },
  {
    step: 12,
    id: "umapad",
    name: "Umapad",
    routeIndex: 1569,
    coords: [10.32956, 123.96457],
    edgeSector: "Fernan Bridge Gateway Edge",
    mainRoad: "United Nations (U.N.) Avenue",
    bordersWith: "Lapu-Lapu City across Mactan Channel",
    landmark: "Marcelo Fernan Bridge Western Landing",
    instruction: "Mainland ramp is Mandaue. Follow D.M. Cortes Ave South into Opao."
  },
  {
    step: 13,
    id: "opao",
    name: "Opao",
    routeIndex: 1704,
    coords: [10.32712, 123.95707],
    edgeSector: "Channel Waterfront Edge",
    mainRoad: "D.M. Cortes Avenue",
    bordersWith: "Mactan Channel Shipyards",
    landmark: "Opao Wharf & Shipyards",
    instruction: "Drive along D.M. Cortes Ave towards First Mactan Bridge in Looc."
  },
  {
    step: 14,
    id: "looc",
    name: "Looc",
    routeIndex: 1747,
    coords: [10.32045, 123.94883],
    edgeSector: "First Bridge Gateway Edge",
    mainRoad: "A.C. Cortes Avenue & Looc Port Road",
    bordersWith: "Lapu-Lapu City (First Bridge Span)",
    landmark: "First Mandaue-Mactan Bridge Mainland Ramp",
    instruction: "Drive under bridge approach into Cambaro and Centro commercial core."
  },
  {
    step: 15,
    id: "cambaro",
    name: "Cambaro",
    routeIndex: 1812,
    coords: [10.32488, 123.94420],
    edgeSector: "Urban Coastal Edge",
    mainRoad: "Ouano Avenue & C.D. Seno St",
    bordersWith: "Mactan Channel Port Docks",
    landmark: "Mandaue Reclamation Corridor",
    instruction: "Follow coastal boulevard into Centro port sector."
  },
  {
    step: 16,
    id: "centro",
    name: "Centro (Poblacion)",
    routeIndex: 1895,
    coords: [10.32598, 123.93910],
    edgeSector: "South Harbor & City Hall Edge",
    mainRoad: "F.B. Cabahug St & Ouano Wharf",
    bordersWith: "South Harbor Water Boundary",
    landmark: "Mandaue Presidencia (City Hall) & San Jose Parish",
    instruction: "From Centro, connect back along Lopez Jaena to complete perimeter circuit at Subangdaku."
  }
];

export const INTERIOR_BARANGAYS = [
  { id: "bakilid", name: "Bakilid", coords: [10.33400, 123.93000], mainRoad: "A.S. Fortuna St" },
  { id: "basak", name: "Basak", coords: [10.35400, 123.94800], mainRoad: "M.C. Briones Highway" },
  { id: "maguikay", name: "Maguikay", coords: [10.34100, 123.93600], mainRoad: "M.C. Briones Highway & Flyover" },
  { id: "tabok", name: "Tabok", coords: [10.36200, 123.94400], mainRoad: "M.C. Briones Highway" },
  { id: "pagsabungan", name: "Pagsabungan", coords: [10.36100, 123.93800], mainRoad: "Pagsabungan Road" },
  { id: "tingub", name: "Tingub", coords: [10.36800, 123.94100], mainRoad: "Tingub Road" },
  { id: "casuntingan", name: "Casuntingan", coords: [10.34700, 123.92500], mainRoad: "Cabancalan-Casuntingan Road" },
  { id: "guizo", name: "Guizo", coords: [10.33000, 123.93600], mainRoad: "A. Del Rosario St" },
  { id: "mantuyong", name: "Mantuyong", coords: [10.32800, 123.93800], mainRoad: "B. Ceniza St" },
  { id: "alang_alang", name: "Alang-Alang", coords: [10.33500, 123.94500], mainRoad: "Plaridel St & UN Ave" },
  { id: "ibabao", name: "Ibabao-Estancia", coords: [10.33600, 123.94100], mainRoad: "Plaridel St" }
];

export const ALL_27_BARANGAYS = [
  ...EDGE_BARANGAYS_CIRCUIT.map(b => ({ ...b, isEdge: true })),
  ...INTERIOR_BARANGAYS.map((b, idx) => ({ ...b, step: 16 + idx + 1, isEdge: false }))
];

export default function OperationsGeoTaggingPanel({ onClose, currentUser = null }) {
  const activeUser = useMemo(() => {
    if (currentUser) return currentUser;
    try {
      const raw = localStorage.getItem("hrhub_auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [currentUser]);

  const userEntityScope = useMemo(() => {
    return getUserAssignedStlEntity(activeUser);
  }, [activeUser]);

  const isGlobalUser = !userEntityScope;
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layersGroupRef = useRef(null);
  const carMarkerRef = useRef(null);
  const clickedMarkerRef = useRef(null);
  const measureLineGroupRef = useRef(null);
  const navRouteGroupRef = useRef(null);
  const gpsWatchIdRef = useRef(null);
  const boothMarkersRef = useRef({});
  const searchContainerRef = useRef(null);

  const [focusedBooth, setFocusedBooth] = useState(null);
  const [activeNavRoute, setActiveNavRoute] = useState(null);
  const [isCalculatingNavRoute, setIsCalculatingNavRoute] = useState(false);
  const [isPickingNavOrigin, setIsPickingNavOrigin] = useState(false);
  const isPickingNavOriginRef = useRef(false);
  const focusedBoothRef = useRef(null);
  const activeNavRouteRef = useRef(null);
  const [isNavStepsExpanded, setIsNavStepsExpanded] = useState(false);
  const [isLiveGpsTracking, setIsLiveGpsTracking] = useState(false);
  const [navErrorNotice, setNavErrorNotice] = useState("");
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [voiceLang, setVoiceLang] = useState("tl");
  const [activeNavStepIdx, setActiveNavStepIdx] = useState(0);
  const [showLiveTrafficTiles, setShowLiveTrafficTiles] = useState(false);
  const [navVehicleType, setNavVehicleType] = useState(() => {
    try {
      return localStorage.getItem("hrhub_nav_vehicle_type") || "motor";
    } catch {
      return "motor";
    }
  });
  const [isAutoFollowCamera, setIsAutoFollowCamera] = useState(true);
  const [isOfflineRouteReady, setIsOfflineRouteReady] = useState(false);
  const [isDeviceOnline, setIsDeviceOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const trafficTileLayerRef = useRef(null);
  const navVehicleMarkerRef = useRef(null);
  const navHeadingRef = useRef(0);
  const lastKnownUserCoordsRef = useRef(null);
  const isAutoFollowCameraRef = useRef(true);
  const isProgrammaticMapMoveRef = useRef(false);
  const navVehicleTypeRef = useRef(navVehicleType);
  const spokenStepsRef = useRef(new Set());
  const voiceGuidanceEnabledRef = useRef(true);
  const voiceLangRef = useRef("tl");

  useEffect(() => {
    voiceGuidanceEnabledRef.current = voiceGuidanceEnabled;
    if (!voiceGuidanceEnabled) {
      stopWazeVoice();
    }
  }, [voiceGuidanceEnabled]);

  useEffect(() => {
    voiceLangRef.current = voiceLang;
  }, [voiceLang]);

  useEffect(() => {
    navVehicleTypeRef.current = navVehicleType;
    try {
      localStorage.setItem("hrhub_nav_vehicle_type", navVehicleType);
    } catch { }
    if (navVehicleMarkerRef.current && window.L) {
      const labelText = activeNavRouteRef.current?.isLiveGps
        ? (isDeviceOnline ? "📍 Live GPS" : "📡 Offline GPS")
        : `📍 ${activeNavRouteRef.current?.startLabel || "Start"}`;
      navVehicleMarkerRef.current.setIcon(
        window.L.divIcon({
          className: "nav-origin-pin",
          html: buildNavVehicleMarkerHtml(navVehicleType, navHeadingRef.current, labelText),
          iconSize: [140, 74],
          iconAnchor: [0, 0]
        })
      );
    }
  }, [navVehicleType, isDeviceOnline]);

  useEffect(() => {
    isAutoFollowCameraRef.current = isAutoFollowCamera;
  }, [isAutoFollowCamera]);

  useEffect(() => {
    const onOnline = () => setIsDeviceOnline(true);
    const onOffline = () => setIsDeviceOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    isPickingNavOriginRef.current = isPickingNavOrigin;
  }, [isPickingNavOrigin]);

  useEffect(() => {
    focusedBoothRef.current = focusedBooth;
  }, [focusedBooth]);

  const isNavModeActiveFlag = Boolean(activeNavRoute);
  useEffect(() => {
    activeNavRouteRef.current = activeNavRoute;
  }, [activeNavRoute]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        leafletMapRef.current?.invalidateSize();
      } catch { }
    }, 120);
    return () => clearTimeout(t);
  }, [isNavModeActiveFlag]);

  const [topAgentSearchQuery, setTopAgentSearchQuery] = useState("");
  const [isTopSearchOpen, setIsTopSearchOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsTopSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [selectedEdgeBarangay, setSelectedEdgeBarangay] = useState(EDGE_BARANGAYS_CIRCUIT[0]);

  useEffect(() => {
    if (!leafletLoaded || !leafletMapRef.current || !window.L) return;
    const map = leafletMapRef.current;
    const tomtomKey = (API_CONFIG?.TOMTOM_API_KEY || "").trim();

    if (trafficTileLayerRef.current) {
      try { map.removeLayer(trafficTileLayerRef.current); } catch { }
      trafficTileLayerRef.current = null;
    }

    if (showLiveTrafficTiles && tomtomKey) {
      const ttLayer = window.L.tileLayer(
        `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(tomtomKey)}&tileSize=256`,
        { opacity: 0.78, maxZoom: 19, zIndex: 450 }
      ).addTo(map);
      trafficTileLayerRef.current = ttLayer;
    }
  }, [showLiveTrafficTiles, leafletLoaded]);

  const [measuringSourceKiosk, setMeasuringSourceKiosk] = useState(null);
  const measuringSourceKioskRef = useRef(null);
  const [measuredPair, setMeasuredPair] = useState(null);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);

  useEffect(() => {
    measuringSourceKioskRef.current = measuringSourceKiosk;
  }, [measuringSourceKiosk]);

  const [grossRecords, setGrossRecords] = useState(() => {
    try {
      const { isoDate } = getYesterdayDates();
      const cached = sessionStorage.getItem(`hrhub_yesterday_gross_${isoDate}`);
      if (cached) return JSON.parse(cached);
    } catch { }
    return [];
  });

  const [viewMode, setViewMode] = useState("city");
  const [activeBarangayCircuit, setActiveBarangayCircuit] = useState(null);

  const [brgyInspectorTab, setBrgyInspectorTab] = useState("route");

  const [clickedPoint, setClickedPoint] = useState(null);

  const [showTerminals, setShowTerminals] = useState(false);
  const [showFactories, setShowFactories] = useState(false);

  const [copiedText, setCopiedText] = useState(null);

  const [selectedTerritory, setSelectedTerritory] = useState(() => {
    const scope = getUserAssignedStlEntity(activeUser);
    return scope && !scope.isNonStl ? scope.territoryKey : "all";
  });

  useEffect(() => {
    if (userEntityScope && !userEntityScope.isNonStl && selectedTerritory !== userEntityScope.territoryKey) {
      handleSelectTerritory(userEntityScope.territoryKey);
    }
  }, [userEntityScope, selectedTerritory]);

  const TERRITORY_CONFIG = {
    all: { name: "All STL Territories", coords: [10.3440, 123.9380], zoom: 12, short: "All STL Territories" },
    lucky_betplay: { name: "Lucky Betplay (Mandaue Sector)", coords: [10.3440, 123.9380], zoom: 13, short: "Lucky Betplay" },
    five_a: { name: "5A Royal Gaming (Maguindanao)", coords: [7.1850, 124.2380], zoom: 12, short: "5A Royal" },
    glowing: { name: "Glowing Fortune (Iligan Sector)", coords: [8.2280, 124.2452], zoom: 13, short: "Glowing Fortune" },
    imperial: { name: "Imperial Gaming (Cotabato Sector)", coords: [7.2236, 124.2464], zoom: 13, short: "Imperial Gaming" }
  };

  const activeCheckpoints = useMemo(() => {
    if (selectedTerritory === "five_a") return MAGUINDANAO_CHECKPOINTS;
    if (selectedTerritory === "glowing") return ILIGAN_CHECKPOINTS;
    if (selectedTerritory === "imperial") return COTABATO_CHECKPOINTS;
    return EDGE_BARANGAYS_CIRCUIT;
  }, [selectedTerritory]);

  const activeSectorsList = useMemo(() => {
    if (selectedTerritory === "five_a") return MAGUINDANAO_SECTORS;
    if (selectedTerritory === "glowing") return ILIGAN_SECTORS;
    if (selectedTerritory === "imperial") return COTABATO_SECTORS;
    return ALL_27_BARANGAYS;
  }, [selectedTerritory]);

  const activeRouteCoords = useMemo(() => {
    if (selectedTerritory === "five_a") {
      const pts = MAGUINDANAO_CHECKPOINTS.map((c) => c.coords);
      return [...pts, pts[0]];
    }
    if (selectedTerritory === "glowing") {
      const pts = ILIGAN_CHECKPOINTS.map((c) => c.coords);
      return [...pts, pts[0]];
    }
    if (selectedTerritory === "imperial") {
      const pts = COTABATO_CHECKPOINTS.map((c) => c.coords);
      return [...pts, pts[0]];
    }
    return SNAPPED_EDGE_ROUTE_COORDS;
  }, [selectedTerritory]);

  const handleSelectTerritory = (key) => {
    setSelectedTerritory(key);
    const cfg = TERRITORY_CONFIG[key];
    if (cfg && leafletMapRef.current) {
      leafletMapRef.current.flyTo(cfg.coords, cfg.zoom, { duration: 1.2 });
    }
    const nextCheckpoints =
      key === "five_a"
        ? MAGUINDANAO_CHECKPOINTS
        : key === "glowing"
        ? ILIGAN_CHECKPOINTS
        : key === "imperial"
        ? COTABATO_CHECKPOINTS
        : EDGE_BARANGAYS_CIRCUIT;
    setSelectedEdgeBarangay(nextCheckpoints[0]);
    setActiveBarangayCircuit(null);
    setViewMode("city");
    setIsCityDriving(false);
  };

  const [isCityDriving, setIsCityDriving] = useState(false);
  const [cityRouteIndex, setCityRouteIndex] = useState(0);

  const [isBrgyDriving, setIsBrgyDriving] = useState(false);
  const [brgyRouteIndex, setBrgyRouteIndex] = useState(0);

  const [drivingSpeed, setDrivingSpeed] = useState(2);

  const handleCopyGPS = (coords, label = "Coordinates") => {
    if (!coords) return;
    const text = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedText(`${label}: ${text}`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const [apiAgents, setApiAgents] = useState(() => getStlAgents());
  const [apiSupervisors, setApiSupervisors] = useState(() => getStlSupervisors());
  const [apiBarangays, setApiBarangays] = useState(() => SOURCE_AGENTS_CACHE?.barangays || []);
  const [isAgentsLoading, setIsAgentsLoading] = useState(false);
  const [brgyAgentSearch, setBrgyAgentSearch] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchLiveAgents = async () => {
      try {
        setIsAgentsLoading(true);
        const res = await fetchLiveStlData();
        if (isMounted && res && res.agents && res.agents.length > 0) {
          setApiAgents(res.agents);
        }
        if (isMounted && res && res.supervisors && res.supervisors.length > 0) {
          setApiSupervisors(res.supervisors);
        }
      } catch (err) {
        console.warn("Using offline / cached source agents:", err);
      } finally {
        if (isMounted) setIsAgentsLoading(false);
      }
    };
    fetchLiveAgents();
    return () => { isMounted = false; };
  }, []);

  const getSupervisorName = (supId, agentOrCompany = null) => {
    if (!supId && supId !== 0) return "Unassigned";

    let companyRaw = "";
    if (typeof agentOrCompany === "string") {
      companyRaw = agentOrCompany;
    } else if (agentOrCompany && typeof agentOrCompany === "object") {
      companyRaw = agentOrCompany.company || agentOrCompany.companyName || agentOrCompany.companyShort || "";
    } else if (selectedTerritory && selectedTerritory !== "all") {
      companyRaw = TERRITORY_CONFIG[selectedTerritory]?.name || "";
    }

    if (companyRaw) {
      const canonicalComp = matchStlCanonicalName(companyRaw);
      const matched = (apiSupervisors || []).find(
        (x) => String(x.id) === String(supId) && matchStlCanonicalName(x.company || x.companyName || x.companyShort) === canonicalComp
      );
      if (matched) return matched.fullName || matched.username || `Supervisor #${supId}`;
    }

    const s = (apiSupervisors || []).find((x) => String(x.id) === String(supId));
    return s?.fullName || s?.username || (supId ? `Supervisor #${supId}` : "Unassigned");
  };

  const getBarangayNameFromApiId = (bId) => {
    const b = apiBarangays.find(x => String(x.id) === String(bId));
    return b?.name || `Barangay #${bId}`;
  };

  const territoryAgents = useMemo(() => {
    if (selectedTerritory === "five_a") {
      return apiAgents.filter((a) => {
        const c = matchStlCanonicalName(a.company);
        return c.includes("5A") || c.includes("Royal");
      });
    }
    if (selectedTerritory === "glowing") {
      return apiAgents.filter((a) => {
        const c = matchStlCanonicalName(a.company);
        return c.includes("Glowing") || c.includes("Fortune");
      });
    }
    if (selectedTerritory === "imperial") {
      return apiAgents.filter((a) => {
        const c = matchStlCanonicalName(a.company);
        return c.includes("Imperial");
      });
    }
    if (selectedTerritory === "lucky_betplay") {
      return apiAgents.filter((a) => {
        const c = matchStlCanonicalName(a.company);
        return c.includes("Lucky") || c.includes("Betplay");
      });
    }
    return apiAgents;
  }, [apiAgents, selectedTerritory]);

  const getAgentsForBarangayId = (brgyCircuitId) => {
    const validIds = BARANGAY_API_IDS[brgyCircuitId] || [];
    if (validIds.length > 0) {
      return territoryAgents.filter((a) => validIds.includes(String(a.brgyId)));
    }
    const cleanId = String(brgyCircuitId || "").toLowerCase();
    return territoryAgents.filter((a) => {
      const loc = `${a.location || ""} ${a.address || ""} ${a.outlet || ""}`.toLowerCase();
      if (cleanId.includes("dos") || cleanId.includes("sinsuat")) {
        return loc.includes("dos") || loc.includes("sinsuat") || loc.includes("awang") || loc.includes("dalican");
      }
      if (cleanId.includes("kudarat") || cleanId.includes("nuling")) {
        return loc.includes("kudarat") || loc.includes("nuling") || loc.includes("simuay");
      }
      if (cleanId.includes("parang")) return loc.includes("parang");
      if (cleanId.includes("mastura")) return loc.includes("mastura") || loc.includes("tambu");
      if (cleanId.includes("matanog")) return loc.includes("matanog") || loc.includes("sarmiento");
      if (cleanId.includes("barira")) return loc.includes("barira");
      if (cleanId.includes("buldon")) return loc.includes("buldon");
      if (cleanId.includes("south_upi")) return loc.includes("south upi") || loc.includes("timanan");
      if (cleanId.includes("upi")) return loc.includes("upi") || loc.includes("nuro");
      if (cleanId.includes("dbs")) return loc.includes("dbs") || loc.includes("blah");
      if (cleanId.includes("northern_kabuntalan")) return loc.includes("northern") || loc.includes("sabaken");
      if (cleanId.includes("kabuntalan")) return loc.includes("kabuntalan") || loc.includes("tumbao");

      if (cleanId.includes("tibanga")) return loc.includes("tibanga") || loc.includes("iit");
      if (cleanId.includes("tubod")) return loc.includes("tubod");
      if (cleanId.includes("suarez")) return loc.includes("suarez");
      if (cleanId.includes("palao") || cleanId.includes("pala-o")) return loc.includes("palao") || loc.includes("pala-o");
      if (cleanId.includes("hinaplanon")) return loc.includes("hinaplanon") || loc.includes("mandulog");
      if (cleanId.includes("kiwalan")) return loc.includes("kiwalan");
      if (cleanId.includes("tambacan")) return loc.includes("tambacan") || loc.includes("ibjt");
      if (cleanId.includes("saray")) return loc.includes("saray");
      if (cleanId.includes("poblacion_iligan")) return loc.includes("poblacion") || loc.includes("quezon");
      if (cleanId.includes("buruun") || cleanId.includes("buru-un")) return loc.includes("buruun") || loc.includes("buru-un") || loc.includes("cristina");
      if (cleanId.includes("dalipuga")) return loc.includes("dalipuga");
      if (cleanId.includes("baloi")) return loc.includes("baloi");
      if (cleanId.includes("linamon")) return loc.includes("linamon");

      if (cleanId.includes("rosary")) return loc.includes("rosary") || loc.includes("rh");
      if (cleanId.includes("tamontaka")) return loc.includes("tamontaka");
      if (cleanId.includes("kalanganan")) return loc.includes("kalanganan");
      if (cleanId.includes("bagua")) return loc.includes("bagua");
      if (cleanId.includes("poblacion")) return loc.includes("poblacion");

      return loc.includes(cleanId);
    });
  };

  const activeBarangayAgents = useMemo(() => {
    if (!activeBarangayCircuit) return [];
    return getAgentsForBarangayId(activeBarangayCircuit.id);
  }, [activeBarangayCircuit, territoryAgents]);

  const activeBarangayAgentsFiltered = useMemo(() => {
    if (!brgyAgentSearch.trim()) return activeBarangayAgents;
    const q = brgyAgentSearch.toLowerCase();
    return activeBarangayAgents.filter(a =>
      (a.fullName && a.fullName.toLowerCase().includes(q)) ||
      (a.username && a.username.toLowerCase().includes(q)) ||
      (a.outlet && a.outlet.toLowerCase().includes(q)) ||
      (a.contactNumber && a.contactNumber.includes(q))
    );
  }, [activeBarangayAgents, brgyAgentSearch]);

  useEffect(() => {
    window.__hrhub_geotagging_active = true;
    try { localStorage.setItem("hrhub_geotagging_active", "true"); } catch { }
    window.dispatchEvent(new CustomEvent("hrhub_geotagging_visibility", { detail: true }));
    return () => {
      window.__hrhub_geotagging_active = false;
      try { localStorage.removeItem("hrhub_geotagging_active"); } catch { }
      window.dispatchEvent(new CustomEvent("hrhub_geotagging_visibility", { detail: false }));
    };
  }, []);

  const [taggedAgentCoords, setTaggedAgentCoords] = useState(() => {
    try {
      localStorage.removeItem("hrhub_custom_booths");
      const stored = localStorage.getItem("hrhub_agent_tagged_coordinates");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {
      console.warn("Could not load tagged agent coordinates from localStorage", e);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem("hrhub_agent_tagged_coordinates", JSON.stringify(taggedAgentCoords));
    } catch (e) {
      console.warn("Could not save tagged agent coordinates to localStorage", e);
    }
  }, [taggedAgentCoords]);

  const [userTaggedBooths, setUserTaggedBooths] = useState(() => getLocalCachedBooths());
  const [syncStatus, setSyncStatus] = useState("synced");

  useEffect(() => {
    let isMounted = true;

    async function initCloudSync() {
      try {
        setSyncStatus("syncing");
        const cloudBooths = await fetchCentralBooths();
        if (isMounted && Array.isArray(cloudBooths) && cloudBooths.length > 0) {
          setUserTaggedBooths(cloudBooths);
        }
        if (isMounted) setSyncStatus("synced");
      } catch (err) {
        console.warn("[GeoTagging] Cloud sync load warning:", err);
        if (isMounted) setSyncStatus("offline");
      }
    }

    initCloudSync();

    const unsubscribe = subscribeToCentralBooths((updatedBooths) => {
      if (isMounted && Array.isArray(updatedBooths)) {
        setUserTaggedBooths(updatedBooths);
        setSyncStatus("synced");
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const [isBoothModalOpen, setIsBoothModalOpen] = useState(false);
  const [editingBoothId, setEditingBoothId] = useState(null);
  const [detectedBarangayResult, setDetectedBarangayResult] = useState(null);
  const [boothFormData, setBoothFormData] = useState({
    name: "",
    latStr: "",
    lngStr: "",
    address: "",
    selectedAgentId: "",
    tellerName: "",
    supervisor: "",
    contactNumber: "",
    notes: ""
  });

  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentStatusFilter, setAgentStatusFilter] = useState("all");

  const assignedAgentIds = useMemo(() => {
    const ids = new Set();
    (userTaggedBooths || []).forEach((b) => {
      if (editingBoothId && String(b.id) === String(editingBoothId)) {
        return;
      }
      if (b.agentId) {
        ids.add(String(b.agentId));
      }
    });
    return ids;
  }, [userTaggedBooths, editingBoothId]);

  const assignedAgentNames = useMemo(() => {
    const names = new Set();
    (userTaggedBooths || []).forEach((b) => {
      if (editingBoothId && String(b.id) === String(editingBoothId)) {
        return;
      }
      if (b.tellerName) {
        names.add(b.tellerName.trim().toLowerCase());
      }
    });
    return names;
  }, [userTaggedBooths, editingBoothId]);

  const availableAgents = useMemo(() => {
    return (apiAgents || []).filter((ag) => {
      if (assignedAgentIds.has(String(ag.id))) return false;
      const fName = String(ag.fullName || "").trim().toLowerCase();
      const uName = String(ag.username || "").trim().toLowerCase();
      if (fName && assignedAgentNames.has(fName)) return false;
      if (uName && assignedAgentNames.has(uName)) return false;
      return true;
    });
  }, [apiAgents, assignedAgentIds, assignedAgentNames]);

  const activeAgentsCount = useMemo(() => {
    return availableAgents.filter((a) => checkAgentIsActive(a)).length;
  }, [availableAgents]);

  const inactiveAgentsCount = useMemo(() => {
    return availableAgents.length - activeAgentsCount;
  }, [availableAgents, activeAgentsCount]);

  const filteredAvailableAgents = useMemo(() => {
    let list = availableAgents;

    if (agentStatusFilter === "active") {
      list = list.filter((ag) => checkAgentIsActive(ag));
    } else if (agentStatusFilter === "inactive") {
      list = list.filter((ag) => !checkAgentIsActive(ag));
    }

    const q = agentSearchQuery.trim().toLowerCase();
    if (!q) return list;

    const tokens = q.split(/\s+/).filter(Boolean);

    return list.filter((ag) => {
      const isActive = checkAgentIsActive(ag);
      const statusText = isActive ? "active online" : "inactive offline disabled";
      const name = String(ag.fullName || "").toLowerCase();
      const username = String(ag.username || "").toLowerCase();
      const outlet = String(ag.outlet || "").toLowerCase();
      const supervisor = String(getSupervisorName(ag.supervisor, ag) || "").toLowerCase();
      const contact = String(ag.contactNumber || "").replace(/[^0-9]/g, "");
      const brgy = String(ag.brgyId || "");
      const id = String(ag.id || "");
      const address = String(ag.address || "").toLowerCase();

      const composite = `${name} ${username} ${outlet} ${supervisor} ${contact} ${brgy} ${id} ${address} ${statusText}`;
      return tokens.every((token) => composite.includes(token));
    });
  }, [availableAgents, agentSearchQuery, agentStatusFilter]);

  const selectedAgentObj = useMemo(() => {
    if (!boothFormData.selectedAgentId) return null;
    return (apiAgents || []).find((a) => String(a.id) === String(boothFormData.selectedAgentId)) || null;
  }, [apiAgents, boothFormData.selectedAgentId]);

  const [cityInspectorTab, setCityInspectorTab] = useState("waypoint");

  const [editingAgentId, setEditingAgentId] = useState(null);
  const [inlineCoordForm, setInlineCoordForm] = useState({
    latStr: "",
    lngStr: "",
    notes: ""
  });

  const inlineDetectedBarangay = useMemo(() => {
    const lat = parseFloat(inlineCoordForm.latStr);
    const lng = parseFloat(inlineCoordForm.lngStr);
    if (isNaN(lat) || isNaN(lng) || lat < 10.20 || lat > 10.50 || lng < 123.80 || lng > 124.10) {
      return null;
    }
    return detectBarangayFromCoords(lat, lng);
  }, [inlineCoordForm.latStr, inlineCoordForm.lngStr]);

  const allTaggedAgentsList = useMemo(() => {
    return Object.entries(taggedAgentCoords).map(([agentId, data]) => {
      const agent = apiAgents.find((a) => String(a.id) === String(agentId));
      return { agentId, agent, ...data };
    });
  }, [taggedAgentCoords, apiAgents]);

  const activeBarangayTaggedAgents = useMemo(() => {
    if (!activeBarangayCircuit) return [];
    const validApiIds = BARANGAY_API_IDS[activeBarangayCircuit.id] || [];
    return allTaggedAgentsList.filter((item) => {
      return (
        item.detectedBarangayId === activeBarangayCircuit.id ||
        (item.agent && validApiIds.includes(String(item.agent.brgyId)))
      );
    });
  }, [activeBarangayCircuit, allTaggedAgentsList]);

  const getBoothTerritoryKey = useCallback((booth) => {
    if (!booth) return "lucky_betplay";
    if (booth.territoryKey && booth.territoryKey !== "all") return booth.territoryKey;
    const comp = (booth.company || booth.companyName || "").toLowerCase();
    if (comp.includes("5a") || comp.includes("royal") || comp.includes("maguindanao")) return "five_a";
    if (comp.includes("glowing") || comp.includes("fortune") || comp.includes("iligan")) return "glowing";
    if (comp.includes("imperial") || comp.includes("cotabato")) return "imperial";
    if (comp.includes("lucky") || comp.includes("betplay") || comp.includes("mandaue")) return "lucky_betplay";

    const bId = String(booth.barangayId || "").toLowerCase();
    if (MAGUINDANAO_SECTORS.some(s => s.id === bId)) return "five_a";
    if (ILIGAN_SECTORS.some(s => s.id === bId)) return "glowing";
    if (COTABATO_SECTORS.some(s => s.id === bId)) return "imperial";
    if (BARANGAY_API_IDS[bId] || ALL_27_BARANGAYS.some(b => b.id === bId)) return "lucky_betplay";

    const coords = booth.coords || [booth.lat, booth.lng];
    if (coords && coords.length >= 2) {
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        if (lat >= 10.25 && lat <= 10.45 && lng >= 123.85 && lng <= 124.05) return "lucky_betplay";
        if (lat >= 8.10 && lat <= 8.35 && lng >= 124.15 && lng <= 124.35) return "glowing";
        if (lat >= 7.18 && lat <= 7.26 && lng >= 124.20 && lng <= 124.27) return "imperial";
        if (lat >= 6.80 && lat <= 7.65 && lng >= 123.90 && lng <= 124.60) return "five_a";
      }
    }
    return "lucky_betplay";
  }, []);

  const territoryTaggedBooths = useMemo(() => {
    if (selectedTerritory === "all") return userTaggedBooths;
    return (userTaggedBooths || []).filter((b) => getBoothTerritoryKey(b) === selectedTerritory);
  }, [userTaggedBooths, selectedTerritory, getBoothTerritoryKey]);

  const activeBarangayTaggedBooths = useMemo(() => {
    if (!activeBarangayCircuit) return territoryTaggedBooths;
    const bRoute = getSectorPerimeterRoute(activeBarangayCircuit.id, BARANGAY_PERIMETER_ROUTES);
    const poly = bRoute?.boundaryPolygon;

    return territoryTaggedBooths.filter((b) => {
      if (b.barangayId === activeBarangayCircuit.id) return true;
      if (b.barangayName && activeBarangayCircuit.name && (
        b.barangayName.toLowerCase().includes(activeBarangayCircuit.name.toLowerCase()) ||
        activeBarangayCircuit.name.toLowerCase().includes(b.barangayName.toLowerCase())
      )) return true;
      if (poly && poly.length > 2 && b.coords && b.coords.length >= 2) {
        if (pointInPolygon(b.coords, poly)) return true;
      }
      return false;
    });
  }, [activeBarangayCircuit, territoryTaggedBooths]);

  const handleOpenBoothModal = (prefilledCoords = null, prefilledBarangay = null) => {
    let lat = "";
    let lng = "";
    if (prefilledCoords && prefilledCoords.length >= 2) {
      lat = prefilledCoords[0].toFixed(6);
      lng = prefilledCoords[1].toFixed(6);
    } else if (clickedPoint) {
      lat = clickedPoint.lat.toFixed(6);
      lng = clickedPoint.lng.toFixed(6);
    } else if (prefilledBarangay) {
      lat = prefilledBarangay.coords[0].toFixed(6);
      lng = prefilledBarangay.coords[1].toFixed(6);
    } else if (activeBarangayCircuit) {
      lat = activeBarangayCircuit.coords[0].toFixed(6);
      lng = activeBarangayCircuit.coords[1].toFixed(6);
    }

    setEditingBoothId(null);
    setAgentSearchQuery("");
    setIsAgentDropdownOpen(false);
    setAgentStatusFilter("all");
    const initialDetected = (lat && lng) ? detectBarangayFromCoords(lat, lng) : null;
    setDetectedBarangayResult(initialDetected);

    const nextBoothNum = String(territoryTaggedBooths.length + 1).padStart(3, "0");

    setBoothFormData({
      name: nextBoothNum,
      latStr: lat,
      lngStr: lng,
      address: initialDetected ? (initialDetected.address || `Brgy. ${initialDetected.name}`) : "",
      selectedAgentId: "",
      tellerName: "",
      supervisor: "",
      contactNumber: "",
      notes: ""
    });
    setIsBoothModalOpen(true);
  };

  const handleEditUserBooth = (booth) => {
    setEditingBoothId(booth.id);
    setAgentSearchQuery("");
    setIsAgentDropdownOpen(false);
    setAgentStatusFilter("all");
    const lat = booth.coords[0].toFixed(6);
    const lng = booth.coords[1].toFixed(6);
    const detected = detectBarangayFromCoords(lat, lng);
    setDetectedBarangayResult(detected);

    setBoothFormData({
      name: booth.name,
      latStr: lat,
      lngStr: lng,
      address: booth.address || "",
      selectedAgentId: booth.agentId || "",
      tellerName: booth.tellerName || "",
      supervisor: booth.supervisor || "",
      contactNumber: booth.contactNumber || "",
      notes: booth.notes || ""
    });
    setIsBoothModalOpen(true);
  };

  const handleDetectBarangay = () => {
    const lat = parseFloat(boothFormData.latStr);
    const lng = parseFloat(boothFormData.lngStr);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid numerical Latitude and Longitude coordinates first.");
      return;
    }
    const detected = detectBarangayFromCoords(lat, lng);
    if (detected) {
      setDetectedBarangayResult(detected);
      if (!boothFormData.address.trim()) {
        setBoothFormData((prev) => ({
          ...prev,
          address: detected.address || `Brgy. ${detected.name}`
        }));
      }
      if (!boothFormData.name.trim()) {
        setBoothFormData((prev) => ({
          ...prev,
          name: `${detected.name} Outlet`
        }));
      }
    } else {
      setDetectedBarangayResult({
        id: "outside",
        name: "Outside Operational Territory",
        confidence: "Out of Bounds",
        detail: "Coordinates do not match any recognized sector in the active STL territories. Please verify your coordinates."
      });
    }
  };

  const handleSaveBoothModal = (e) => {
    e?.preventDefault();
    const lat = parseFloat(boothFormData.latStr);
    const lng = parseFloat(boothFormData.lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid numerical Latitude and Longitude coordinates.");
      return;
    }

    if (!boothFormData.name.trim()) {
      alert("Please provide a Booth or Outlet Name.");
      return;
    }

    if (!boothFormData.address.trim()) {
      alert("Please provide the Booth Address.");
      return;
    }

    const detected = detectBarangayFromCoords(lat, lng) || {
      id: activeBarangayCircuit ? activeBarangayCircuit.id : (selectedTerritory || "territory"),
      name: activeBarangayCircuit ? activeBarangayCircuit.name : (TERRITORY_CONFIG[selectedTerritory]?.name || "Operating Sector"),
      confidence: "Custom Pinned Location",
      detail: `Coordinates fall within ${TERRITORY_CONFIG[selectedTerritory]?.name || "active STL"} territory.`
    };

    const activeTerritoryKey = selectedTerritory !== "all"
      ? selectedTerritory
      : (detected.territoryKey || "lucky_betplay");
    const activeCompanyName = selectedTerritory !== "all"
      ? (TERRITORY_CONFIG[selectedTerritory]?.short || TERRITORY_CONFIG[selectedTerritory]?.name || "Lucky Betplay")
      : (detected.companyName || "Lucky Betplay Corporation");

    const newBooth = {
      id: editingBoothId || `booth_${Date.now()}`,
      name: boothFormData.name.trim(),
      coords: [lat, lng],
      lat,
      lng,
      address: boothFormData.address.trim(),
      barangayId: detected.id,
      barangayName: detected.name,
      detectionConfidence: detected.confidence,
      detectionDetail: detected.detail,
      territoryKey: activeTerritoryKey,
      company: activeCompanyName,
      companyName: activeCompanyName,
      agentId: boothFormData.selectedAgentId || "",
      tellerName: boothFormData.tellerName.trim(),
      supervisor: boothFormData.supervisor.trim(),
      contactNumber: boothFormData.contactNumber.trim(),
      notes: boothFormData.notes.trim(),
      updatedAt: new Date().toISOString()
    };

    setUserTaggedBooths((prev) => {
      const filtered = prev.filter((b) => b.id !== newBooth.id);
      return [newBooth, ...filtered];
    });

    saveCentralBooth(newBooth)
      .then(() => setSyncStatus("synced"))
      .catch((err) => {
        console.warn("[GeoTagging] Cloud booth save warning:", err);
        setSyncStatus("offline");
      });

    if (editingBoothId) {
      const prevBooth = userTaggedBooths.find((b) => b.id === editingBoothId);
      if (prevBooth?.agentId && String(prevBooth.agentId) !== String(boothFormData.selectedAgentId)) {
        setTaggedAgentCoords((prev) => {
          const next = { ...prev };
          delete next[prevBooth.agentId];
          return next;
        });
      }
    }

    if (boothFormData.selectedAgentId) {
      setTaggedAgentCoords((prev) => ({
        ...prev,
        [boothFormData.selectedAgentId]: {
          agentId: boothFormData.selectedAgentId,
          coords: [lat, lng],
          lat,
          lng,
          detectedBarangayId: detected.id,
          detectedBarangayName: detected.name,
          confidence: detected.confidence,
          detail: detected.detail,
          notes: boothFormData.address.trim(),
          updatedAt: new Date().toISOString()
        }
      }));
    }

    setIsBoothModalOpen(false);
    setEditingBoothId(null);
    setAgentSearchQuery("");
    setIsAgentDropdownOpen(false);

    setCopiedText(`Booth "${newBooth.name}" saved at ${newBooth.address} in Brgy. ${detected.name}!`);
    setTimeout(() => setCopiedText(null), 3500);

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([lat, lng], 17, { duration: 0.9 });
    }
  };

  const handleDeleteUserBooth = (boothId) => {
    if (window.confirm("Are you sure you want to remove this tagged booth?")) {
      const targetBooth = userTaggedBooths.find((b) => b.id === boothId);
      if (targetBooth?.agentId) {
        setTaggedAgentCoords((prev) => {
          const next = { ...prev };
          delete next[targetBooth.agentId];
          return next;
        });
      }
      setUserTaggedBooths((prev) => prev.filter((b) => b.id !== boothId));
      deleteCentralBooth(boothId)
        .then(() => setSyncStatus("synced"))
        .catch((err) => {
          console.warn("[GeoTagging] Cloud booth delete warning:", err);
          setSyncStatus("offline");
        });
    }
  };

  const handleStartEditAgentCoords = (agent) => {
    setEditingAgentId(agent.id);
    const existing = taggedAgentCoords[agent.id];
    if (existing && existing.coords) {
      setInlineCoordForm({
        latStr: existing.coords[0].toFixed(6),
        lngStr: existing.coords[1].toFixed(6),
        notes: existing.notes || ""
      });
    } else if (clickedPoint) {
      setInlineCoordForm({
        latStr: clickedPoint.lat.toFixed(6),
        lngStr: clickedPoint.lng.toFixed(6),
        notes: ""
      });
    } else if (activeBarangayCircuit) {
      setInlineCoordForm({
        latStr: activeBarangayCircuit.coords[0].toFixed(6),
        lngStr: activeBarangayCircuit.coords[1].toFixed(6),
        notes: ""
      });
    } else {
      setInlineCoordForm({ latStr: "", lngStr: "", notes: "" });
    }
  };

  const handleSaveAgentCoords = (agent) => {
    const lat = parseFloat(inlineCoordForm.latStr);
    const lng = parseFloat(inlineCoordForm.lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid numerical Latitude and Longitude coordinates.");
      return;
    }

    const detected = detectBarangayFromCoords(lat, lng) || {
      id: activeBarangayCircuit ? activeBarangayCircuit.id : (selectedTerritory || "territory"),
      name: activeBarangayCircuit ? activeBarangayCircuit.name : (TERRITORY_CONFIG[selectedTerritory]?.name || "Operating Sector"),
      confidence: "Custom Pinned Location",
      detail: `Coordinates tagged within ${TERRITORY_CONFIG[selectedTerritory]?.name || "active STL"} boundaries.`
    };

    const newTag = {
      agentId: agent.id,
      coords: [lat, lng],
      lat,
      lng,
      detectedBarangayId: detected.id,
      detectedBarangayName: detected.name,
      confidence: detected.confidence,
      detail: detected.detail,
      notes: inlineCoordForm.notes.trim() || agent.address || detected.address || `Brgy. ${detected.name}`,
      updatedAt: new Date().toISOString()
    };

    setTaggedAgentCoords((prev) => ({
      ...prev,
      [agent.id]: newTag
    }));

    const agentTerritoryKey = agent.territoryKey || (selectedTerritory !== "all" ? selectedTerritory : (detected.territoryKey || "lucky_betplay"));
    const agentCompanyName = agent.company || agent.companyName || (selectedTerritory !== "all" ? (TERRITORY_CONFIG[selectedTerritory]?.short || TERRITORY_CONFIG[selectedTerritory]?.name) : (detected.companyName || "Lucky Betplay Corporation"));

    const newBooth = {
      id: `booth_agent_${agent.id}`,
      name: agent.outlet || `${agent.fullName} Station`,
      coords: [lat, lng],
      lat,
      lng,
      address: inlineCoordForm.notes.trim() || agent.address || detected.address || `Brgy. ${detected.name}`,
      barangayId: detected.id,
      barangayName: detected.name,
      detectionConfidence: detected.confidence,
      detectionDetail: detected.detail,
      territoryKey: agentTerritoryKey,
      company: agentCompanyName,
      companyName: agentCompanyName,
      agentId: agent.id,
      tellerName: agent.fullName,
      supervisor: getSupervisorName(agent.supervisor, agent),
      contactNumber: agent.contactNumber || "",
      notes: inlineCoordForm.notes.trim(),
      updatedAt: new Date().toISOString()
    };

    setUserTaggedBooths((prev) => [newBooth, ...prev.filter((b) => b.id !== newBooth.id && b.agentId !== agent.id)]);

    saveCentralBooth(newBooth)
      .then(() => setSyncStatus("synced"))
      .catch((err) => {
        console.warn("[GeoTagging] Cloud agent booth save warning:", err);
        setSyncStatus("offline");
      });

    setEditingAgentId(null);
    setInlineCoordForm({ latStr: "", lngStr: "", notes: "" });

    setCopiedText(`GPS coordinates saved for ${agent.fullName}! Plotted in Brgy. ${detected.name}.`);
    setTimeout(() => setCopiedText(null), 3500);

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([lat, lng], 17, { duration: 0.9 });
    }
  };

  const handleRemoveAgentCoords = (agentId) => {
    if (window.confirm("Are you sure you want to remove the GPS coordinates for this agent?")) {
      setTaggedAgentCoords((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
      setUserTaggedBooths((prev) => prev.filter((b) => b.agentId !== agentId));
      deleteCentralBooth(`booth_agent_${agentId}`)
        .then(() => setSyncStatus("synced"))
        .catch((err) => {
          console.warn("[GeoTagging] Cloud agent booth delete warning:", err);
          setSyncStatus("offline");
        });
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchGross = async () => {
      try {
        const { isoDate: yesterdayStr } = getYesterdayDates();

        const url = new URL(API_CONFIG.GROSS_REPORT_URL);
        const effectiveId = url.searchParams.get("id") || import.meta.env.VITE_GROSS_ACCOUNTANT_ID || "2";
        url.searchParams.set("id", effectiveId);
        url.searchParams.set("from", yesterdayStr);
        url.searchParams.set("to", yesterdayStr);

        const res = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${API_CONFIG.GROSS_REPORT_TOKEN}`
          }
        });
        if (res.ok && isMounted) {
          const payload = await res.json();
          let list = [];
          if (Array.isArray(payload)) {
            list = payload;
          } else {
            for (const key of ["data", "results", "records", "items", "collectors", "tellers"]) {
              if (Array.isArray(payload?.[key])) {
                list = payload[key];
                break;
              }
            }
            if (list.length === 0 && payload?.data && typeof payload.data === "object") {
              list = Array.isArray(payload.data) ? payload.data : [payload.data];
            }
          }
          if (Array.isArray(list) && list.length > 0) {
            setGrossRecords(list);
            try { sessionStorage.setItem(`hrhub_yesterday_gross_${yesterdayStr}`, JSON.stringify(list)); } catch { }
          }
        }
      } catch (err) {
      }
    };
    fetchGross();
    return () => { isMounted = false; };
  }, []);

  const getBoothAgentGross = (booth) => {
    const { isoDate: yesterdayStr, displayLabel: yesterdayLabel } = getYesterdayDates();

    if (!booth) {
      return {
        gross: 0,
        formatted: "₱0.00",
        hasRecord: false,
        agentName: "Unassigned",
        agentUsername: "",
        agentStatus: "Unassigned",
        contactNumber: "N/A",
        supervisor: "N/A",
        outlet: "Kiosk Outlet",
        yesterdayDate: yesterdayLabel,
        yesterdayIso: yesterdayStr
      };
    }

    const agentId = String(booth.agentId || "");
    const tellerName = String(booth.tellerName || "").toLowerCase().trim();

    const matchedAgent = apiAgents.find((a) =>
      (agentId && String(a.id) === agentId) ||
      (tellerName && (a.fullName?.toLowerCase().includes(tellerName) || a.username?.toLowerCase() === tellerName))
    );

    const effectiveAgentName = matchedAgent?.fullName || booth.tellerName || "Unassigned";
    const effectiveUsername = matchedAgent?.username || "";

    let totalGross = 0;
    let foundRecord = false;

    const getRecDate = (r) => {
      const year = Number(r.drawYear || r.year || 0);
      const month = Number(r.drawMonth || r.month || 0);
      const day = Number(r.drawDay || r.day || 0);
      if (year && month && day) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${year}-${pad(month)}-${pad(day)}`;
      }
      const str = r.date || r.drawDate || r.draw_date || r.created_at || r.transDate || r.recordDate || "";
      if (typeof str === "string" && str.length >= 10) {
        return str.slice(0, 10);
      }
      return "";
    };

    if (grossRecords && grossRecords.length > 0) {
      grossRecords.forEach((r) => {
        const rDate = getRecDate(r);
        if (rDate && rDate !== yesterdayStr) {
          return;
        }

        const rId = String(r.userId || r.id || r.collectorId || "");
        const rName = String(r.fullName || r.full_name || r.collectorName || r.name || "").toLowerCase();
        const rUser = String(r.username || "").toLowerCase();

        const isMatch =
          (agentId && rId === agentId) ||
          (matchedAgent && String(matchedAgent.id) === rId) ||
          (effectiveUsername && rUser === effectiveUsername.toLowerCase()) ||
          (tellerName && (rName.includes(tellerName) || tellerName.includes(rName))) ||
          (effectiveAgentName && (rName.includes(effectiveAgentName.toLowerCase()) || effectiveAgentName.toLowerCase().includes(rName)));

        if (isMatch) {
          foundRecord = true;
          let amt = 0;
          if (r.daily && typeof r.daily === "object" && r.daily[yesterdayStr] !== undefined) {
            amt = Number(r.daily[yesterdayStr] || 0);
          } else {
            amt = Number(r.TotalOverAllGross || r.gross || r.totalGross || r.amount || r.grossAmount || 0);
          }

          if (!isNaN(amt) && amt > 0) {
            totalGross += amt;
          }
        }
      });
    }

    if (!foundRecord && booth.yesterdayGross) {
      totalGross = Number(booth.yesterdayGross) || 0;
      foundRecord = totalGross > 0;
    }

    const currencyFormatter = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return {
      gross: totalGross,
      formatted: currencyFormatter.format(totalGross),
      hasRecord: foundRecord,
      agentName: effectiveAgentName,
      agentUsername: effectiveUsername,
      agentStatus: matchedAgent?.isActive ? "Active Teller" : (matchedAgent ? "Registered Agent" : "Manual Tag"),
      contactNumber: matchedAgent?.contactNumber || booth.contactNumber || "No contact number",
      supervisor: booth.supervisor || (matchedAgent?.supervisor ? `Supervisor #${matchedAgent.supervisor}` : "No supervisor assigned"),
      outlet: matchedAgent?.outlet || booth.name || "Kiosk Outlet",
      yesterdayDate: yesterdayLabel,
      yesterdayIso: yesterdayStr
    };
  };

  const startMeasuringFromKiosk = (booth) => {
    if (!booth) return;
    if (territoryTaggedBooths.length < 2) {
      setCopiedText("At least 2 tagged kiosks are required in this territory to measure!");
      setTimeout(() => setCopiedText(null), 3000);
      return;
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.closePopup();
    }
    setMeasuringSourceKiosk(booth);
    setCopiedText(`Measuring from Booth ${booth.name}`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleCompleteMeasurement = async (source, target) => {
    if (!source || !target || !source.coords || !target.coords) return;
    if (String(source.id) === String(target.id)) {
      setCopiedText("Please select a different kiosk as destination!");
      setTimeout(() => setCopiedText(null), 2500);
      return;
    }

    setMeasuringSourceKiosk(null);
    setCopiedText("Calculating road-based distance & route...");

    const roadRoute = await fetchRoadRouteBetweenPoints(source.coords, target.coords);
    const distMeters = roadRoute.distanceMeters;

    const pair = {
      source,
      target,
      distanceMeters: distMeters,
      isRoadBased: true,
      roadCoordinates: roadRoute.coordinates,
      durationSec: roadRoute.durationSec,
      routingMethod: roadRoute.method
    };

    setMeasuredPair(pair);
    setCopiedText(null);
    setIsDistanceModalOpen(true);

    if (leafletMapRef.current && measureLineGroupRef.current && window.L) {
      const map = leafletMapRef.current;
      const measureGroup = measureLineGroupRef.current;
      measureGroup.clearLayers();

      window.L.polyline(roadRoute.coordinates, {
        color: "#0d9488",
        weight: 7,
        opacity: 0.45,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(measureGroup);

      window.L.polyline(roadRoute.coordinates, {
        color: "#2dd4bf",
        weight: 4,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
        dashArray: "10, 6"
      }).addTo(measureGroup);

      const midIdx = Math.floor(roadRoute.coordinates.length / 2);
      const [midLat, midLng] = roadRoute.coordinates[midIdx] || [
        (source.coords[0] + target.coords[0]) / 2,
        (source.coords[1] + target.coords[1]) / 2
      ];

      const distLabel = distMeters >= 1000
        ? `${(distMeters / 1000).toFixed(2)} km`
        : `${Math.round(distMeters)} m`;

      const badgeIcon = window.L.divIcon({
        className: "measure-distance-badge",
        html: `
          <div style="
            background: #042f2e;
            color: #2dd4bf;
            border: 2px solid #14b8a6;
            padding: 4px 10px;
            border-radius: 9999px;
            font-family: system-ui, sans-serif;
            font-size: 11px;
            font-weight: 900;
            white-space: nowrap;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <span>🚗</span>
            <span>${distLabel} (Road)</span>
          </div>
        `,
        iconSize: [130, 26],
        iconAnchor: [65, 13]
      });

      const midMarker = window.L.marker([midLat, midLng], { icon: badgeIcon }).addTo(measureGroup);
      midMarker.on("click", () => {
        setIsDistanceModalOpen(true);
      });

      try {
        const bounds = window.L.latLngBounds(roadRoute.coordinates);
        map.fitBounds(bounds, { padding: [90, 90], maxZoom: 17 });
      } catch { }
    }
  };

  const handleClearMeasurement = () => {
    setMeasuredPair(null);
    setMeasuringSourceKiosk(null);
    setIsDistanceModalOpen(false);
    if (measureLineGroupRef.current) {
      measureLineGroupRef.current.clearLayers();
    }
  };

  const stopLiveGpsWatch = useCallback(() => {
    if (gpsWatchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      try {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
      } catch { }
      gpsWatchIdRef.current = null;
    }
    setIsLiveGpsTracking(false);
  }, []);

  const speakRouteStep = useCallback((step, langOverride = null) => {
    if (!step) return;
    const lang = langOverride || voiceLangRef.current || "tl";
    const phrase =
      lang === "tl"
        ? toTaglishVoiceInstruction(step)
        : step.distanceMeters >= 50 && step.dir !== "arrive" && step.dir !== "depart"
        ? `In ${formatNavDistance(step.distanceMeters)}, ${step.instruction}.`
        : `${step.instruction}.`;
    speakWazeVoice(phrase, lang);
  }, []);

  const speakRouteStartSummary = useCallback((routePayload, langOverride = null) => {
    if (!routePayload || !voiceGuidanceEnabledRef.current) return;
    const lang = langOverride || voiceLangRef.current || "tl";
    const boothName = routePayload.targetBooth?.name || "001";
    const agentPart = routePayload.agentName ? `, ${routePayload.agentName}` : "";
    const distStr = formatNavDistance(routePayload.distanceMeters);
    const durStr = formatNavDuration(routePayload.durationSec);
    const traffic = routePayload.traffic;
    const firstStep = routePayload.steps?.[0];

    let trafficPhrase = "";
    if (traffic?.level === "heavy") {
      trafficPhrase =
        lang === "tl"
          ? ` Paalala, may mabigat na traffic sa ruta${traffic.congestedStreets?.length ? ` banda sa ${traffic.congestedStreets[0]}` : ""}.`
          : ` Caution, heavy traffic detected along your route${traffic.congestedStreets?.length ? ` near ${traffic.congestedStreets[0]}` : ""}.`;
    } else if (traffic?.level === "moderate") {
      trafficPhrase =
        lang === "tl"
          ? ` May katamtamang traffic sa ilang bahagi ng kalsada.`
          : ` Moderate traffic ahead along parts of the route.`;
    }

    const firstInstruction = firstStep
      ? lang === "tl"
        ? ` ${toTaglishVoiceInstruction(firstStep)}`
        : ` ${firstStep.instruction}.`
      : "";

    const msg =
      lang === "tl"
        ? `Magsisimula na ang biyahe papuntang Booth ${boothName}${agentPart}. Ang layo ay ${distStr}, tinatayang ${durStr}.${trafficPhrase}${firstInstruction}`
        : `Starting navigation to Booth ${boothName}${agentPart}. Total distance is ${distStr}, estimated ${durStr}.${trafficPhrase}${firstInstruction}`;

    speakWazeVoice(msg, lang);
  }, []);

  const handleClearNavRoute = useCallback(() => {
    stopLiveGpsWatch();
    stopWazeVoice();
    spokenStepsRef.current.clear();
    navVehicleMarkerRef.current = null;
    setActiveNavStepIdx(0);
    setActiveNavRoute(null);
    setIsNavStepsExpanded(false);
    setIsPickingNavOrigin(false);
    setIsAutoFollowCamera(true);
    setIsOfflineRouteReady(false);
    setNavErrorNotice("");
    if (navRouteGroupRef.current) {
      navRouteGroupRef.current.clearLayers();
    }
  }, [stopLiveGpsWatch]);

  const recenterOnNavVehicle = useCallback((coordsOverride = null, zoomLevel = 18) => {
    const map = leafletMapRef.current;
    const targetCoords =
      coordsOverride ||
      (navVehicleMarkerRef.current ? [navVehicleMarkerRef.current.getLatLng().lat, navVehicleMarkerRef.current.getLatLng().lng] : null) ||
      activeNavRouteRef.current?.startCoords;
    if (!map || !targetCoords) return;

    setIsAutoFollowCamera(true);
    isAutoFollowCameraRef.current = true;
    isProgrammaticMapMoveRef.current = true;
    try {
      map.flyTo(targetCoords, zoomLevel, { animate: true, duration: 0.65 });
    } catch { }
    setTimeout(() => {
      isProgrammaticMapMoveRef.current = false;
    }, 750);
  }, []);

  const showNavRouteOverview = useCallback(() => {
    const map = leafletMapRef.current;
    const route = activeNavRouteRef.current;
    if (!map || !window.L || !route?.coordinates?.length) return;
    setIsAutoFollowCamera(false);
    isAutoFollowCameraRef.current = false;
    isProgrammaticMapMoveRef.current = true;
    try {
      const bounds = window.L.latLngBounds(route.coordinates);
      if (route.startCoords) bounds.extend(route.startCoords);
      if (route.targetBooth?.coords) bounds.extend(route.targetBooth.coords);
      map.fitBounds(bounds, { padding: [90, 90], maxZoom: 16 });
    } catch { }
    setTimeout(() => {
      isProgrammaticMapMoveRef.current = false;
    }, 600);
  }, []);

  const drawNavRouteOnMap = useCallback((routePayload, cameraMode = "drive") => {
    if (!leafletMapRef.current || !navRouteGroupRef.current || !window.L || !routePayload) return;
    const map = leafletMapRef.current;
    const navGroup = navRouteGroupRef.current;
    navGroup.clearLayers();
    navVehicleMarkerRef.current = null;

    const { startCoords, startLabel, targetBooth, coordinates, distanceMeters, durationSec, isLiveGps, traffic } = routePayload;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return;

    const trafficLevel = traffic?.level || "clear";
    const outerColor = trafficLevel === "heavy" ? "#991b1b" : trafficLevel === "moderate" ? "#92400e" : "#1e3a8a";
    const borderColor = trafficLevel === "heavy" ? "#dc2626" : trafficLevel === "moderate" ? "#d97706" : "#1d4ed8";
    const coreColor = trafficLevel === "heavy" ? "#f87171" : trafficLevel === "moderate" ? "#fbbf24" : "#38bdf8";
    const pillBorder = trafficLevel === "heavy" ? "#ef4444" : trafficLevel === "moderate" ? "#f59e0b" : "#38bdf8";
    const trafficDot = trafficLevel === "heavy" ? "🔴" : trafficLevel === "moderate" ? "🟠" : "🟢";

    const nextPt = coordinates[Math.min(2, coordinates.length - 1)] || targetBooth?.coords;
    const initialHeading = calculateBearingDeg(startCoords, nextPt);
    navHeadingRef.current = initialHeading;

    window.L.polyline(coordinates, {
      color: outerColor,
      weight: 12,
      opacity: 0.45,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(navGroup);

    window.L.polyline(coordinates, {
      color: borderColor,
      weight: 8,
      opacity: 0.92,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(navGroup);

    window.L.polyline(coordinates, {
      color: coreColor,
      weight: 5,
      opacity: 1,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(navGroup);

    window.L.polyline(coordinates, {
      color: "#ffffff",
      weight: 2.5,
      opacity: 0.9,
      dashArray: "6, 16",
      lineCap: "round",
      className: "nav-route-flow-line"
    }).addTo(navGroup);

    const vehicleLabel = isLiveGps
      ? (typeof navigator !== "undefined" && !navigator.onLine ? "📡 Offline GPS" : "📍 Live GPS")
      : `📍 ${startLabel || "Start"}`;
    const vehicleIcon = window.L.divIcon({
      className: "nav-origin-pin",
      html: buildNavVehicleMarkerHtml(navVehicleTypeRef.current || "motor", initialHeading, vehicleLabel),
      iconSize: [140, 74],
      iconAnchor: [0, 0]
    });
    const vMarker = window.L.marker(startCoords, { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(navGroup);
    navVehicleMarkerRef.current = vMarker;

    if (targetBooth?.coords) {
      const destRingIcon = window.L.divIcon({
        className: "nav-dest-ring",
        html: `
          <div style="
            width:54px;height:54px;border-radius:50%;
            border:3px solid #10b981;
            background:rgba(16,185,129,0.2);
            transform:translate(-50%,-50%);
            animation: ping 1.8s cubic-bezier(0,0,0.2,1) infinite;
            pointer-events:none;
          "></div>
        `,
        iconSize: [54, 54],
        iconAnchor: [0, 0]
      });
      window.L.marker(targetBooth.coords, { icon: destRingIcon, interactive: false }).addTo(navGroup);
    }

    const midIdx = Math.floor(coordinates.length / 2);
    const midPt = coordinates[midIdx] || [
      (startCoords[0] + targetBooth.coords[0]) / 2,
      (startCoords[1] + targetBooth.coords[1]) / 2
    ];
    const etaBadgeIcon = window.L.divIcon({
      className: "nav-eta-pill",
      html: `
        <div style="
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
          border: 2px solid ${pillBorder};
          border-radius: 9999px;
          padding: 4px 11px;
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
          box-shadow: 0 6px 18px rgba(15,23,42,0.75);
          display: inline-flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        ">
          <span>${trafficDot}</span>
          <span style="color:${coreColor};">${formatNavDuration(durationSec)}</span>
          <span style="opacity:0.6;">•</span>
          <span>${formatNavDistance(distanceMeters)}</span>
        </div>
      `,
      iconSize: [180, 28],
      iconAnchor: [0, 0]
    });
    const etaMarker = window.L.marker(midPt, { icon: etaBadgeIcon, zIndexOffset: 900 }).addTo(navGroup);
    etaMarker.on("click", () => setIsNavStepsExpanded((prev) => !prev));

    if (cameraMode === "drive") {
      setIsAutoFollowCamera(true);
      isAutoFollowCameraRef.current = true;
      isProgrammaticMapMoveRef.current = true;
      try {
        map.invalidateSize();
        map.flyTo(startCoords, 18, { animate: true, duration: 0.75 });
      } catch { }
      setTimeout(() => {
        isProgrammaticMapMoveRef.current = false;
      }, 850);
    } else if (cameraMode === "fit") {
      isProgrammaticMapMoveRef.current = true;
      try {
        const bounds = window.L.latLngBounds(coordinates);
        bounds.extend(startCoords);
        if (targetBooth?.coords) bounds.extend(targetBooth.coords);
        map.fitBounds(bounds, { padding: [90, 90], maxZoom: 17 });
      } catch { }
      setTimeout(() => {
        isProgrammaticMapMoveRef.current = false;
      }, 650);
    }
  }, []);

  const computeAndDisplayNavRoute = useCallback(async (startCoords, targetBooth, agentName = "", startLabel = "Your Location", isLiveGps = false, cameraMode = "drive", isLiveReroute = false) => {
    if (!startCoords || !targetBooth?.coords) return;
    if (!isLiveReroute) setIsCalculatingNavRoute(true);
    setNavErrorNotice("");
    setIsPickingNavOrigin(false);

    const destLabel = `Booth ${targetBooth.name || "001"}${agentName ? ` (${agentName})` : ""}`;
    try {
      const roadRoute = await fetchRoadRouteBetweenPoints(startCoords, targetBooth.coords, true, destLabel);
      const traffic = await analyzeRouteTraffic(
        startCoords,
        targetBooth.coords,
        roadRoute.distanceMeters,
        roadRoute.durationSec,
        roadRoute.steps || []
      );
      const payload = {
        targetBooth,
        agentName: agentName || targetBooth.tellerName || "",
        startCoords,
        currentCoords: startCoords,
        startLabel,
        isLiveGps,
        coordinates: roadRoute.coordinates,
        distanceMeters: roadRoute.distanceMeters,
        initialDistanceMeters: roadRoute.distanceMeters,
        baseDurationSec: roadRoute.durationSec,
        durationSec: traffic?.adjustedDurationSec || roadRoute.durationSec,
        initialDurationSec: traffic?.adjustedDurationSec || roadRoute.durationSec,
        steps: roadRoute.steps || [],
        traffic,
        method: roadRoute.method
      };
      setActiveNavRoute(payload);
      activeNavRouteRef.current = payload;
      setFocusedBooth({ booth: targetBooth, agentName: agentName || targetBooth.tellerName || "" });

      setClickedPoint(null);
      setMeasuringSourceKiosk(null);
      setMeasuredPair(null);
      setIsDistanceModalOpen(false);
      setIsCityDriving(false);
      setIsBrgyDriving(false);
      if (measureLineGroupRef.current) {
        try { measureLineGroupRef.current.clearLayers(); } catch { }
      }
      if (leafletMapRef.current) {
        try { leafletMapRef.current.closePopup(); } catch { }
      }

      drawNavRouteOnMap(payload, cameraMode);

      if (!isLiveReroute) {
        spokenStepsRef.current.clear();
        setActiveNavStepIdx(0);
        setIsOfflineRouteReady(false);
        speakRouteStartSummary(payload);
        precacheRouteForOffline(payload, voiceLangRef.current).then((ok) => {
          if (ok && activeNavRouteRef.current) setIsOfflineRouteReady(true);
        });
      }
    } catch (err) {
      console.warn("Nav route computation notice:", err);
      if (!isLiveReroute) {
        setNavErrorNotice("Could not compute road route right now. Try picking a start point on the map.");
      }
    } finally {
      if (!isLiveReroute) setIsCalculatingNavRoute(false);
    }
  }, [drawNavRouteOnMap, speakRouteStartSummary]);

  const startLiveGpsWatchForBooth = useCallback((targetBooth, targetAgent = "") => {
    if (!targetBooth?.coords || typeof navigator === "undefined" || !navigator.geolocation) return;
    stopLiveGpsWatch();
    setIsLiveGpsTracking(true);
    let lastRerouteAt = Date.now();
    let prevPosCoords = null;

    gpsWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const liveCoords = [pos.coords.latitude, pos.coords.longitude];
        lastKnownUserCoordsRef.current = { coords: liveCoords, timestamp: Date.now() };
        const route = activeNavRouteRef.current;
        if (!route || !route.coordinates?.length) return;

        const progress = computeOfflineProgressAlongRoute(liveCoords, route.coordinates);
        const speedMps = pos.coords.speed && pos.coords.speed > 1.2 ? pos.coords.speed : null;

        let heading = navHeadingRef.current;
        if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading) && speedMps) {
          heading = pos.coords.heading;
        } else if (prevPosCoords && calculateDistanceMeters(prevPosCoords[0], prevPosCoords[1], liveCoords[0], liveCoords[1]) >= 4) {
          heading = calculateBearingDeg(prevPosCoords, liveCoords);
        } else if (progress.nextWaypoint) {
          heading = calculateBearingDeg(liveCoords, progress.nextWaypoint);
        }
        prevPosCoords = liveCoords;
        navHeadingRef.current = heading;

        if (navVehicleMarkerRef.current && window.L) {
          navVehicleMarkerRef.current.setLatLng(liveCoords);
          const lbl = navigator.onLine ? "📍 Live GPS" : "📡 Offline GPS";
          navVehicleMarkerRef.current.setIcon(
            window.L.divIcon({
              className: "nav-origin-pin",
              html: buildNavVehicleMarkerHtml(navVehicleTypeRef.current || "motor", heading, lbl),
              iconSize: [140, 74],
              iconAnchor: [0, 0]
            })
          );
        }

        if (isAutoFollowCameraRef.current && leafletMapRef.current) {
          isProgrammaticMapMoveRef.current = true;
          try {
            const curZoom = leafletMapRef.current.getZoom();
            if (curZoom < 17) {
              leafletMapRef.current.setView(liveCoords, 18, { animate: true, duration: 0.45 });
            } else {
              leafletMapRef.current.panTo(liveCoords, { animate: true, duration: 0.45 });
            }
          } catch { }
          setTimeout(() => {
            isProgrammaticMapMoveRef.current = false;
          }, 500);
        }

        const ratio = route.initialDistanceMeters > 0
          ? Math.min(1, Math.max(0, progress.remainingMeters / route.initialDistanceMeters))
          : 1;
        const estRemainingSec = speedMps
          ? Math.round(progress.remainingMeters / speedMps)
          : Math.max(30, Math.round((route.initialDurationSec || route.durationSec || 60) * ratio));

        const destLabel = `Booth ${targetBooth.name || "001"}${targetAgent ? ` (${targetAgent})` : ""}`;
        const distToDest = calculateDistanceMeters(liveCoords[0], liveCoords[1], targetBooth.coords[0], targetBooth.coords[1]);

        if (distToDest <= 45) {
          setActiveNavStepIdx(Math.max(0, (route.steps?.length || 1) - 1));
          if (voiceGuidanceEnabledRef.current && !spokenStepsRef.current.has("arrived")) {
            spokenStepsRef.current.add("arrived");
            speakRouteStep({ dir: "arrive", street: destLabel, distanceMeters: 0 });
          }
        } else if (Array.isArray(route.steps) && route.steps.length > 1) {
          let closestStepIdx = -1;
          let closestStepDist = Infinity;
          for (let i = 1; i < route.steps.length; i++) {
            const st = route.steps[i];
            if (!st?.location) continue;
            const dSt = calculateDistanceMeters(liveCoords[0], liveCoords[1], st.location[0], st.location[1]);
            if (dSt < closestStepDist) {
              closestStepDist = dSt;
              closestStepIdx = i;
            }
          }
          if (closestStepIdx >= 1) {
            const st = route.steps[closestStepIdx];
            if (closestStepDist <= 220) {
              setActiveNavStepIdx(closestStepIdx);
              if (voiceGuidanceEnabledRef.current) {
                const farKey = `far_${closestStepIdx}_${st.dir}_${st.street}`;
                const nearKey = `near_${closestStepIdx}_${st.dir}_${st.street}`;
                if (closestStepDist <= 75 && !spokenStepsRef.current.has(nearKey)) {
                  spokenStepsRef.current.add(nearKey);
                  spokenStepsRef.current.add(farKey);
                  speakRouteStep({ ...st, distanceMeters: Math.round(closestStepDist) });
                } else if (!spokenStepsRef.current.has(farKey)) {
                  spokenStepsRef.current.add(farKey);
                  speakRouteStep({ ...st, distanceMeters: Math.round(closestStepDist) });
                }
              }
            }
          }
        }

        setActiveNavRoute((prev) =>
          prev
            ? {
                ...prev,
                currentCoords: liveCoords,
                distanceMeters: progress.remainingMeters,
                durationSec: estRemainingSec
              }
            : prev
        );

        const now = Date.now();
        if (progress.offRouteMeters > 85 && navigator.onLine && now - lastRerouteAt > 15000) {
          lastRerouteAt = now;
          computeAndDisplayNavRoute(liveCoords, targetBooth, targetAgent, "Your Live Location", true, "none", true);
        }
      },
      (err) => {
        console.warn("Live GPS watch warning:", err?.message);
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
  }, [computeAndDisplayNavRoute, stopLiveGpsWatch, speakRouteStep]);

  const handleRouteFromMyLocation = useCallback((boothOverride = null, agentNameOverride = "") => {
    const targetBooth = boothOverride || focusedBoothRef.current?.booth;
    const targetAgent = agentNameOverride || focusedBoothRef.current?.agentName || targetBooth?.tellerName || "";
    if (!targetBooth?.coords) return;

    unlockNavAudioPlayback();
    setFocusedBooth({ booth: targetBooth, agentName: targetAgent });
    setNavErrorNotice("");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNavErrorNotice("GPS geolocation is not supported on this browser. Click 'Pick Start on Map' to set your starting point.");
      return;
    }

    const launchWithCoords = (myCoords) => {
      lastKnownUserCoordsRef.current = { coords: myCoords, timestamp: Date.now() };
      computeAndDisplayNavRoute(myCoords, targetBooth, targetAgent, "Your Live Location", true, "drive", false);
      startLiveGpsWatchForBooth(targetBooth, targetAgent);
    };

    const cached = lastKnownUserCoordsRef.current;
    if (cached && cached.coords && Date.now() - cached.timestamp < 45000) {
      launchWithCoords(cached.coords);
      return;
    }

    setIsCalculatingNavRoute(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        launchWithCoords([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            launchWithCoords([pos.coords.latitude, pos.coords.longitude]);
          },
          (err) => {
            setIsCalculatingNavRoute(false);
            const reason =
              err?.code === 1
                ? "Location permission denied. Allow browser GPS or click 'Pick Start on Map' below."
                : err?.code === 3
                ? "GPS signal took too long. Try again or click 'Pick Start on Map' below."
                : "Unable to detect device GPS. Click 'Pick Start on Map' below to set your coordinates.";
            setNavErrorNotice(reason);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
      },
      { enableHighAccuracy: false, timeout: 2800, maximumAge: 60000 }
    );
  }, [computeAndDisplayNavRoute, startLiveGpsWatchForBooth]);

  const handleToggleLiveGpsTracking = useCallback(() => {
    unlockNavAudioPlayback();
    if (isLiveGpsTracking) {
      stopLiveGpsWatch();
      return;
    }
    const targetBooth = activeNavRoute?.targetBooth || focusedBoothRef.current?.booth;
    const targetAgent = activeNavRoute?.agentName || focusedBoothRef.current?.agentName || "";
    startLiveGpsWatchForBooth(targetBooth, targetAgent);
  }, [isLiveGpsTracking, activeNavRoute, startLiveGpsWatchForBooth, stopLiveGpsWatch]);

  useEffect(() => {
    return () => {
      stopLiveGpsWatch();
      stopWazeVoice();
    };
  }, [stopLiveGpsWatch]);

  useEffect(() => {
    window.startMeasuringKiosk = (boothId) => {
      const b = userTaggedBooths.find(booth => String(booth.id) === String(boothId));
      if (b) {
        startMeasuringFromKiosk(b);
      }
    };
    window.startNavRouteToKiosk = (boothId) => {
      const b = userTaggedBooths.find(booth => String(booth.id) === String(boothId));
      if (b) {
        if (leafletMapRef.current) {
          try { leafletMapRef.current.closePopup(); } catch { }
        }
        handleRouteFromMyLocation(b, b.tellerName || "");
      }
    };
    return () => {
      delete window.startMeasuringKiosk;
      delete window.startNavRouteToKiosk;
    };
  }, [userTaggedBooths, handleRouteFromMyLocation]);

  useEffect(() => {
    if (!document.getElementById("leaflet-custom-pins-style")) {
      const customStyle = document.createElement("style");
      customStyle.id = "leaflet-custom-pins-style";
      customStyle.innerHTML = `
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .yellow-booth-pin {
          background: transparent !important;
          border: none !important;
        }
        @keyframes navRouteFlow {
          from { stroke-dashoffset: 44; }
          to { stroke-dashoffset: 0; }
        }
        .nav-route-flow-line {
          animation: navRouteFlow 1.1s linear infinite;
        }
      `;
      document.head.appendChild(customStyle);
    }

    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(cssLink);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);

    return () => {
    };
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || leafletMapRef.current) return;

    const initConfig = userEntityScope && !userEntityScope.isNonStl
      ? (TERRITORY_CONFIG[userEntityScope.territoryKey] || TERRITORY_CONFIG.lucky_betplay)
      : TERRITORY_CONFIG.all;

    const map = window.L.map(mapContainerRef.current, {
      center: initConfig.coords,
      zoom: initConfig.zoom,
      minZoom: 9,
      maxZoom: 18,
      zoomControl: false
    });

    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    const group = window.L.layerGroup().addTo(map);
    layersGroupRef.current = group;

    const measureGroup = window.L.layerGroup().addTo(map);
    measureLineGroupRef.current = measureGroup;

    const navGroup = window.L.layerGroup().addTo(map);
    navRouteGroupRef.current = navGroup;

    leafletMapRef.current = map;

    map.on("click", (e) => {
      if (measuringSourceKioskRef.current) return;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      if (isPickingNavOriginRef.current && focusedBoothRef.current?.booth) {
        unlockNavAudioPlayback();
        const { booth, agentName } = focusedBoothRef.current;
        computeAndDisplayNavRoute([lat, lng], booth, agentName, "Picked Map Point", false, "drive", false);
        return;
      }
      if (activeNavRouteRef.current) return;
      setClickedPoint({ lat, lng });
    });

    map.on("dragstart", () => {
      if (activeNavRouteRef.current && !isProgrammaticMapMoveRef.current) {
        setIsAutoFollowCamera(false);
        isAutoFollowCameraRef.current = false;
      }
    });

    const timer = setTimeout(() => {
      map.invalidateSize();
      if (activeRouteCoords && activeRouteCoords.length > 0) {
        const bounds = window.L.latLngBounds(activeRouteCoords);
        map.fitBounds(bounds, { padding: [45, 45] });
      }
    }, 200);

    let resizeObserver = null;
    if (window.ResizeObserver && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        try {
          map.invalidateSize();
        } catch { }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      leafletMapRef.current = null;
      layersGroupRef.current = null;
      measureLineGroupRef.current = null;
      navRouteGroupRef.current = null;
    };
  }, [leafletLoaded]);

  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;
    const map = leafletMapRef.current;

    if (clickedMarkerRef.current) {
      map.removeLayer(clickedMarkerRef.current);
      clickedMarkerRef.current = null;
    }

    if (!clickedPoint) return;

    const { lat, lng } = clickedPoint;
    const googleMapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

    const pinIcon = window.L.divIcon({
      className: "custom-point-pin",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 36px;
            height: 36px;
            background: rgba(14, 165, 233, 0.35);
            border: 2px solid #38bdf8;
            border-radius: 50%;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 30px;
            height: 30px;
            background: #0284c7;
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 16px rgba(2, 132, 199, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            color: #ffffff;
            cursor: pointer;
          ">
            📍
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = window.L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    clickedMarkerRef.current = marker;

    const popupContent = `
      <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 250px; padding: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 9.5px; font-weight: 900; background: #e0f2fe; color: #0369a1; padding: 2.5px 8px; border-radius: 6px; text-transform: uppercase;">
            📍 Tagged GPS Position
          </span>
        </div>
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 8px; margin-bottom: 8px; font-family: ui-monospace, monospace; font-size: 11px;">
          <div style="color: #94a3b8; font-size: 9.5px; margin-bottom: 2px;">WGS-84 Coordinates:</div>
          <strong style="color: #38bdf8; font-size: 12.5px;">${formatGPS([lat, lng])}</strong>
          <div style="color: #64748b; font-size: 10px; margin-top: 3px;">Decimal: ${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
        </div>
        <a
          href="${googleMapsUrl}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: #1a73e8;
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            padding: 8px 12px;
            border-radius: 8px;
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(26, 115, 232, 0.4);
            margin-bottom: 4px;
          "
        >
          <span>Proceed to Google Maps</span>
          <span style="font-size: 14px;">↗</span>
        </a>
      </div>
    `;

    marker.bindPopup(popupContent, { autoClose: false, closeOnClick: false }).openPopup();
  }, [clickedPoint]);

  const activeNavDestBoothId = activeNavRoute?.targetBooth?.id ? String(activeNavRoute.targetBooth.id) : null;

  useEffect(() => {
    if (!leafletLoaded || !leafletMapRef.current || !layersGroupRef.current) return;

    const map = leafletMapRef.current;
    const group = layersGroupRef.current;
    group.clearLayers();

    if (activeNavDestBoothId && activeNavRouteRef.current?.targetBooth?.coords) {
      const targetBooth = activeNavRouteRef.current.targetBooth;
      const displayName = targetBooth.name || "001";
      const destKioskIcon = window.L.divIcon({
        className: "yellow-booth-pin",
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            width: 170px;
            height: 102px;
            user-select: none;
            filter: drop-shadow(0 6px 14px rgba(0,0,0,0.55));
            position: relative;
          ">
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: #047857;
              color: #ffffff;
              border: 2.5px solid #34d399;
              border-radius: 9999px;
              padding: 3px 11px;
              font-family: Inter, system-ui, sans-serif;
              font-size: 11.5px;
              font-weight: 800;
              letter-spacing: 0.3px;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0,0,0,0.65);
              margin-bottom: 2px;
              max-width: 170px;
              overflow: hidden;
              text-overflow: ellipsis;
            ">
              <span>🏁</span>
              <span style="overflow:hidden;text-overflow:ellipsis;">Booth ${displayName}</span>
            </div>
            <div style="width: 48px; height: 62px; display:flex; align-items:center; justify-content:center;">
              ${getKioskSvgHtml(48, 62)}
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;margin-top:-4px;">
              <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #0f172a;"></div>
              <div style="width:10px;height:10px;border-radius:50%;background:#10b981;border:2px solid #ffffff;box-shadow:0 0 10px #10b981;margin-top:-1px;"></div>
            </div>
          </div>
        `,
        iconSize: [170, 102],
        iconAnchor: [85, 102],
        popupAnchor: [0, -102]
      });
      window.L.marker(targetBooth.coords, { icon: destKioskIcon, zIndexOffset: 950 }).addTo(group);
      return;
    }

    if (viewMode === "city") {
      const routePts = activeRouteCoords;

      window.L.polyline(routePts, {
        color: "#064e3b",
        weight: 9,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(group);

      const navLine = window.L.polyline(routePts, {
        color: "#10b981",
        weight: 5.5,
        opacity: 1.0,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(group);

      const terrName = TERRITORY_CONFIG[selectedTerritory]?.name || "STL Territory";
      navLine.bindTooltip(`${terrName} Perimeter Patrol Circuit`, {
        direction: "top",
        permanent: false
      });

      activeCheckpoints.forEach((eb) => {
        const isSelected = selectedEdgeBarangay?.id === eb.id;

        const edgeIcon = window.L.divIcon({
          className: "edge-barangay-pin",
          html: `
            <div style="
              width: ${isSelected ? "34px" : "28px"};
              height: ${isSelected ? "34px" : "28px"};
              background: ${isSelected ? "#0284c7" : "#047857"};
              border: ${isSelected ? "3px solid #ffffff" : "2px solid #34d399"};
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: ${isSelected ? "13px" : "11px"};
              font-weight: 900;
              cursor: pointer;
              transform: translate(-50%, -50%);
              transition: all 0.2s ease;
            ">
              ${eb.step}
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const marker = window.L.marker(eb.coords, { icon: edgeIcon }).addTo(group);

        marker.bindTooltip(`
          <div style="font-family: system-ui, sans-serif; padding: 2px;">
            <strong>Step ${eb.step}: ${eb.name}</strong><br/>
            <span style="font-family: monospace; font-size: 10px; color: #10b981;">GPS: ${formatGPS(eb.coords)}</span>
          </div>
        `, {
          direction: "top",
          permanent: false
        });

        marker.on("click", (e) => {
          window.L.DomEvent.stopPropagation(e);
          setSelectedEdgeBarangay(eb);
          handleSelectBarangayPerimeter(eb.id);
        });
      });

      if (selectedTerritory === "all" || selectedTerritory === "lucky_betplay") {
        INTERIOR_BARANGAYS.forEach((ib) => {
          const intIcon = window.L.divIcon({
            className: "interior-barangay-pin",
            html: `
              <div style="
                width: 14px;
                height: 14px;
                background: #0f172a;
                border: 2px solid #64748b;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                cursor: pointer;
                transform: translate(-50%, -50%);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                <span style="width: 4px; height: 4px; background: #10b981; border-radius: 50%;"></span>
              </div>
            `,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          const marker = window.L.marker(ib.coords, { icon: intIcon }).addTo(group);

          marker.bindTooltip(`
            <div style="font-family: system-ui, sans-serif; padding: 2px;">
              <strong>Brgy. ${ib.name} (Interior Hub)</strong><br/>
              <span style="font-family: monospace; font-size: 10px; color: #38bdf8;">GPS: ${formatGPS(ib.coords)}</span>
            </div>
          `, {
            direction: "top",
            permanent: false
          });

          marker.on("click", (e) => {
            window.L.DomEvent.stopPropagation(e);
            handleSelectBarangayPerimeter(ib.id);
          });
        });
      }

      const currentCityPt = activeRouteCoords[cityRouteIndex] || activeRouteCoords[0];

      const carIcon = window.L.divIcon({
        className: "road-car-marker",
        html: `
          <div style="
            width: 36px;
            height: 36px;
            background: #0284c7;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 16px rgba(2, 132, 199, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
          ">
            🚗
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const carMarker = window.L.marker(currentCityPt, { icon: carIcon }).addTo(group);
      carMarkerRef.current = carMarker;
    }

    if (viewMode === "barangay" && activeBarangayCircuit) {
      const bRoute = getSectorPerimeterRoute(activeBarangayCircuit.id, BARANGAY_PERIMETER_ROUTES);
      if (!bRoute) return;

      const officialPoly = bRoute.boundaryPolygon || bRoute.points;
      if (officialPoly && officialPoly.length > 0) {
        window.L.polygon(officialPoly, {
          color: "#10b981",
          weight: 2.8,
          dashArray: "6, 6",
          fillColor: "#10b981",
          fillOpacity: 0.18
        }).addTo(group);
      }

      if (bRoute.points && bRoute.points.length > 0) {
        window.L.polyline(bRoute.points, {
          color: "#083344",
          weight: 9,
          opacity: 0.85,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(group);

        const brgyLine = window.L.polyline(bRoute.points, {
          color: "#06b6d4",
          weight: 5.5,
          opacity: 1.0,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(group);

        brgyLine.bindTooltip(`Drivable Boundary Road Route around Brgy. ${activeBarangayCircuit.name} (${bRoute.distanceKm} km)`, {
          direction: "top",
          permanent: false
        });
      }

      const centerIcon = window.L.divIcon({
        className: "active-barangay-center-pin",
        html: `
          <div style="
            display: flex;
            align-items: center;
            gap: 5px;
            background: #0284c7;
            border: 2.5px solid #ffffff;
            border-radius: 9999px;
            padding: 4px 10px;
            box-shadow: 0 4px 16px rgba(2, 132, 199, 0.7);
            color: #ffffff;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11.5px;
            font-weight: 900;
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <span>🏛️</span>
            <span>Brgy. ${activeBarangayCircuit.name} (Coverage Area)</span>
          </div>
        `,
        iconSize: [170, 28],
        iconAnchor: [85, 14]
      });

      const centerMarker = window.L.marker(activeBarangayCircuit.coords, { icon: centerIcon }).addTo(group);
      centerMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 2px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 900; color: #0284c7;">🏛️ Brgy. ${activeBarangayCircuit.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">${activeBarangayCircuit.mainRoad}</p>
          <div style="background: #f1f5f9; border-radius: 6px; padding: 6px; font-family: monospace; font-size: 11px; color: #0f172a; margin-bottom: 6px;">
            <strong>Center GPS:</strong> ${formatGPS(activeBarangayCircuit.coords)}
          </div>
          <a
            href="https://www.google.com/maps?q=${activeBarangayCircuit.coords[0]},${activeBarangayCircuit.coords[1]}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 5px;
              background: #1a73e8;
              color: #ffffff;
              font-weight: 800;
              font-size: 11px;
              padding: 6px 10px;
              border-radius: 6px;
              text-decoration: none;
              margin-bottom: 6px;
            "
          >
            <span>Proceed to Google Maps</span>
            <span>↗</span>
          </a>
          <div style="font-size: 9.5px; color: #047857; font-weight: 800;">
            ✓ 100% Authorized Under ${bRoute.companyName || TERRITORY_CONFIG[selectedTerritory]?.name || "Authorized STL"} Jurisdiction
          </div>
        </div>
      `);

      if (bRoute.points && bRoute.points.length > 0) {
        const currentBrgyPt = bRoute.points[brgyRouteIndex] || bRoute.points[0];

        const carIcon = window.L.divIcon({
          className: "brgy-car-marker",
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background: #06b6d4;
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 4px 16px rgba(6, 182, 212, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              cursor: pointer;
            ">
              🚗
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const carMarker = window.L.marker(currentBrgyPt, { icon: carIcon }).addTo(group);
        carMarkerRef.current = carMarker;
      }
    }

    const currentPOIs = getTerritoryPOIs(selectedTerritory, MANDAUE_POIS);
    const shouldRenderTerminals = viewMode === "barangay" || showTerminals;
    if (shouldRenderTerminals) {
      const terminalsToRender = viewMode === "barangay" && activeBarangayCircuit
        ? (activeBarangayData?.terminals && activeBarangayData.terminals.length > 0
            ? activeBarangayData.terminals
            : currentPOIs.terminals.filter(t => t.barangayId === activeBarangayCircuit.id))
        : currentPOIs.terminals;

      terminalsToRender.forEach((term) => {
        const isBelongingToActive = activeBarangayCircuit && term.barangayId === activeBarangayCircuit.id;
        const authName = term.territoryKey === "five_a"
          ? "5A Royal Gaming"
          : term.territoryKey === "glowing"
          ? "Glowing Fortune"
          : term.territoryKey === "imperial"
          ? "Imperial Gaming"
          : "Lucky Betplay";

        const termIcon = window.L.divIcon({
          className: "terminal-pin",
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              background: ${isBelongingToActive ? "#92400e" : "#78350f"};
              border: ${isBelongingToActive ? "2.5px solid #fef08a" : "2px solid #fbbf24"};
              border-radius: 9999px;
              padding: 3px 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              color: #fef3c7;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -50%);
            ">
              <span>🚌</span>
              <span>${term.name.length > 22 ? term.name.slice(0, 20) + "..." : term.name}</span>
            </div>
          `,
          iconSize: [140, 26],
          iconAnchor: [70, 13]
        });

        const marker = window.L.marker(term.coords, { icon: termIcon }).addTo(group);

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 240px; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 16px;">🚌</span>
              <span style="font-size: 9px; font-weight: 900; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">
                ${term.type}
              </span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 900; color: #0f172a;">${term.name}</h4>
            <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 6px; padding: 5px 8px; margin-bottom: 6px; font-family: monospace; font-size: 11px; font-weight: 900; color: #854d0e;">
              📍 GPS: ${formatGPS(term.coords)}
            </div>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">📍 <strong>${term.barangayName}:</strong> ${term.address}</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; font-size: 10.5px; color: #334155; margin-bottom: 6px;">
              <div><strong>Routes:</strong> ${term.routes}</div>
              <div style="margin-top: 3px;"><strong>Operating Hours:</strong> ${term.operatingHours}</div>
              <div style="margin-top: 3px;"><strong>Capacity:</strong> ${term.capacity}</div>
            </div>
            <a
              href="https://www.google.com/maps?q=${term.coords[0]},${term.coords[1]}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                background: #1a73e8;
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 6px 10px;
                border-radius: 6px;
                text-decoration: none;
                margin-bottom: 6px;
              "
            >
              <span>Proceed to Google Maps</span>
              <span>↗</span>
            </a>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800;">
              ✓ ${authName} Authorized Public Transit Point
            </div>
          </div>
        `);
      });
    }

    const shouldRenderFactories = viewMode === "barangay" || showFactories;
    if (shouldRenderFactories) {
      const factoriesToRender = viewMode === "barangay" && activeBarangayCircuit
        ? (activeBarangayData?.factories && activeBarangayData.factories.length > 0
            ? activeBarangayData.factories
            : currentPOIs.factories.filter(f => f.barangayId === activeBarangayCircuit.id))
        : currentPOIs.factories;

      factoriesToRender.forEach((fact) => {
        const isBelongingToActive = activeBarangayCircuit && fact.barangayId === activeBarangayCircuit.id;
        const authName = fact.territoryKey === "five_a"
          ? "5A Royal Gaming"
          : fact.territoryKey === "glowing"
          ? "Glowing Fortune"
          : fact.territoryKey === "imperial"
          ? "Imperial Gaming"
          : "Lucky Betplay";

        const factIcon = window.L.divIcon({
          className: "factory-pin",
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              background: ${isBelongingToActive ? "#7c2d12" : "#431407"};
              border: ${isBelongingToActive ? "2.5px solid #fed7aa" : "2px solid #fb923c"};
              border-radius: 9999px;
              padding: 3px 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              color: #ffedd5;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -50%);
            ">
              <span>🏭</span>
              <span>${fact.name.length > 22 ? fact.name.slice(0, 20) + "..." : fact.name}</span>
            </div>
          `,
          iconSize: [140, 26],
          iconAnchor: [70, 13]
        });

        const marker = window.L.marker(fact.coords, { icon: factIcon }).addTo(group);

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 240px; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 16px;">🏭</span>
              <span style="font-size: 9px; font-weight: 900; background: #ffedd5; color: #9a3412; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">
                ${fact.category}
              </span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 900; color: #0f172a;">${fact.name}</h4>
            <div style="background: #ffedd5; border: 1px solid #fed7aa; border-radius: 6px; padding: 5px 8px; margin-bottom: 6px; font-family: monospace; font-size: 11px; font-weight: 900; color: #9a3412;">
              📍 GPS: ${formatGPS(fact.coords)}
            </div>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">📍 <strong>${fact.barangayName}:</strong> ${fact.address}</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; font-size: 10.5px; color: #334155; margin-bottom: 6px;">
              <div><strong>Workforce Size:</strong> ${fact.workforceSize}</div>
              <div style="margin-top: 3px;"><strong>Products:</strong> ${fact.products}</div>
            </div>
            <a
              href="https://www.google.com/maps?q=${fact.coords[0]},${fact.coords[1]}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                background: #1a73e8;
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 6px 10px;
                border-radius: 6px;
                text-decoration: none;
                margin-bottom: 6px;
              "
            >
              <span>Proceed to Google Maps</span>
              <span>↗</span>
            </a>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800;">
              ✓ ${authName} Designated Employment Zone
            </div>
          </div>
        `);
      });
    }

    const boothsToRender = viewMode === "barangay" && activeBarangayCircuit
      ? activeBarangayTaggedBooths
      : territoryTaggedBooths;

    boothMarkersRef.current = {};
    boothsToRender.forEach((booth) => {
      const { coords, name, address, barangayName, detectionConfidence, tellerName, supervisor, contactNumber, notes } = booth;
      if (!coords || coords.length < 2) return;

      const isBelongingToActive = activeBarangayCircuit && booth.barangayId === activeBarangayCircuit.id;
      const displayName = name || "001";

      const isMeasuringSource = measuringSourceKiosk && String(measuringSourceKiosk.id) === String(booth.id);
      const isMeasuringTargetCandidate = measuringSourceKiosk && String(measuringSourceKiosk.id) !== String(booth.id);

      const outletIcon = window.L.divIcon({
        className: "yellow-booth-pin",
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            width: 160px;
            height: 102px;
            cursor: pointer;
            user-select: none;
            filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
            position: relative;
          ">
            ${isMeasuringSource ? `
              <!-- Pulsing Beacon Halo for Source Kiosk A -->
              <div style="
                position: absolute;
                width: 72px;
                height: 72px;
                border-radius: 50%;
                border: 3px solid #14b8a6;
                background: rgba(20, 184, 166, 0.25);
                top: 36px;
                left: 50%;
                transform: translateX(-50%);
                animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                pointer-events: none;
              "></div>
            ` : ''}

            <!-- 1. BADGE ON TOP OF THE KIOSK -->
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: ${isMeasuringSource ? "#0f766e" : (isMeasuringTargetCandidate ? "#0284c7" : "#047857")};
              color: #ffffff;
              border: 2.5px solid ${isMeasuringSource ? "#2dd4bf" : (isMeasuringTargetCandidate ? "#38bdf8" : "#38bdf8")};
              border-radius: 9999px;
              padding: 2.5px 10px;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 11.5px;
              font-weight: 900;
              letter-spacing: 0.5px;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7), 0 0 10px ${isMeasuringSource ? "rgba(45, 212, 191, 0.6)" : "rgba(56, 189, 248, 0.5)"};
              margin-bottom: 2px;
              max-width: 160px;
              overflow: hidden;
              text-overflow: ellipsis;
            ">
              <span style="font-size: 11px;">${isMeasuringSource ? "📏" : (isMeasuringTargetCandidate ? "🎯" : "🏪")}</span>
              <span style="overflow: hidden; text-overflow: ellipsis;">
                ${isMeasuringSource ? `POINT A: ${displayName}` : (isMeasuringTargetCandidate ? `🎯 Measure: ${displayName}` : displayName)}
              </span>
            </div>

            <!-- 2. ACTUAL ILLUSTRATED KIOSK ICON (Where coordinates are) -->
            <div style="
              position: relative;
              width: 48px;
              height: 62px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${getKioskSvgHtml(48, 62)}
            </div>

            <!-- 3. EXACT GROUND PIN (Directly on coordinates) -->
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: -4px;
            ">
              <div style="
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 6px solid #0f172a;
              "></div>
              <div style="
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: ${isMeasuringSource ? "#14b8a6" : (isMeasuringTargetCandidate ? "#38bdf8" : "#f59e0b")};
                border: 2px solid #ffffff;
                box-shadow: 0 0 10px ${isMeasuringSource ? "#14b8a6" : "#f59e0b"}, 0 2px 5px rgba(0,0,0,0.7);
                margin-top: -1px;
              "></div>
            </div>
          </div>
        `,
        iconSize: [160, 102],
        iconAnchor: [80, 102],
        popupAnchor: [0, -102]
      });

      const marker = window.L.marker(coords, { icon: outletIcon }).addTo(group);
      boothMarkersRef.current[String(booth.id)] = marker;
      if (booth.agentId) {
        boothMarkersRef.current[`agent_${booth.agentId}`] = marker;
      }
      if (booth.tellerName) {
        boothMarkersRef.current[`teller_${booth.tellerName.trim().toLowerCase()}`] = marker;
      }

      marker.on("click", (e) => {
        if (measuringSourceKioskRef.current) {
          window.L.DomEvent.stopPropagation(e);
          if (String(measuringSourceKioskRef.current.id) === String(booth.id)) {
            return;
          }
          handleCompleteMeasurement(measuringSourceKioskRef.current, booth);
          return;
        }
        setFocusedBooth({ booth, agentName: booth.tellerName || "" });
      });

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 260px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 6px;">
            <span style="background: #fef3c7; color: #b45309; font-weight: 900; font-size: 10px; padding: 2px 8px; border-radius: 6px; border: 1px solid #fde68a; display: flex; align-items: center; gap: 3px;">
              <span>🟡</span>
              <span>TAGGED KIOSK BOOTH</span>
            </span>
            <span style="font-size: 10.5px; color: #64748b; font-family: monospace; font-weight: 700;">Brgy. ${barangayName || ''}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <div style="width: 32px; height: 42px; flex-shrink: 0;">
              ${getKioskSvgHtml(32, 42)}
            </div>
            <div>
              <h4 style="margin: 0; font-size: 15px; font-weight: 900; color: #0f172a; line-height: 1.2;">Booth ${displayName}</h4>
              <span style="font-size: 10px; color: #d97706; font-weight: 800;">Official Territory Kiosk</span>
            </div>
          </div>
          
          <div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 7px 9px; font-size: 11px; margin-bottom: 6px; color: #92400e;">
            <div><strong>📍 Booth Address:</strong> ${address || `Brgy. ${barangayName}`}</div>
            <div style="font-size: 9.5px; color: #d97706; font-weight: 800; margin-top: 2px;">✓ ${detectionConfidence || "Cadastral Survey Verified"}</div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 9px; font-size: 10.5px; color: #334155; margin-bottom: 6px; line-height: 1.45;">
            ${tellerName ? `<div><strong>Assigned Teller:</strong> ${tellerName}</div>` : ''}
            ${supervisor ? `<div><strong>Supervisor:</strong> ${supervisor}</div>` : ''}
            ${contactNumber ? `<div><strong>Contact:</strong> ${contactNumber}</div>` : ''}
            ${notes ? `<div><strong>Notes:</strong> ${notes}</div>` : ''}
            <div style="font-family: monospace; font-size: 10px; color: #64748b; margin-top: 3px;"><strong>GPS:</strong> ${formatGPS(coords)}</div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 5px;">
            <!-- Live Waze / Google Maps Route from Current Location -->
            <button
              type="button"
              onclick="window.startNavRouteToKiosk('${booth.id}')"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                width: 100%;
                background: linear-gradient(135deg, #2563eb 0%, #0284c7 100%);
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 8px 10px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                box-shadow: 0 3px 10px rgba(37, 99, 235, 0.4);
              "
            >
              <span>🧭</span>
              <span>Route From My Location</span>
            </button>

            <a
              href="https://www.google.com/maps?q=${coords[0]},${coords[1]}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                background: #0284c7;
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 7px 10px;
                border-radius: 8px;
                text-decoration: none;
                box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);
              "
            >
              <span>Proceed to Google Maps</span>
              <span>↗</span>
            </a>

            <!-- Measure Distance Button -->
            <button
              type="button"
              onclick="window.startMeasuringKiosk('${booth.id}')"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                width: 100%;
                background: #0d9488;
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 7.5px 10px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(13, 148, 136, 0.35);
              "
            >
              <span>📏</span>
              <span>Measure Distance to Another Kiosk</span>
            </button>
          </div>
        </div>
      `);
    });

  }, [leafletLoaded, viewMode, selectedTerritory, activeCheckpoints, activeRouteCoords, activeSectorsList, activeBarangayCircuit, selectedEdgeBarangay, cityRouteIndex, brgyRouteIndex, showTerminals, showFactories, brgyInspectorTab, activeBarangayAgents, taggedAgentCoords, territoryTaggedBooths, activeBarangayTaggedBooths, measuringSourceKiosk, activeNavDestBoothId]);

  useEffect(() => {
    if (!isCityDriving || viewMode !== "city") return;

    const coordsList = activeRouteCoords;
    const checkpointsList = activeCheckpoints;
    const stepSize = coordsList.length < 30 ? 1 : drivingSpeed === 4 ? 6 : drivingSpeed === 2 ? 4 : 2;
    const intervalTime = (coordsList.length < 30 ? 800 : 120) / drivingSpeed;

    const timer = setInterval(() => {
      setCityRouteIndex((prev) => {
        const next = (prev + stepSize) % coordsList.length;
        const currentPt = coordsList[next];

        let closestEb = checkpointsList[0];
        let minDist = 9999;
        checkpointsList.forEach((eb) => {
          const dLat = (currentPt[0] - eb.coords[0]) * 111;
          const dLng = (currentPt[1] - eb.coords[1]) * 111 * Math.cos((currentPt[0] * Math.PI) / 180);
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < minDist) {
            minDist = dist;
            closestEb = eb;
          }
        });

        setSelectedEdgeBarangay(closestEb);

        if (leafletMapRef.current && (next % 15 === 0 || coordsList.length < 30)) {
          leafletMapRef.current.panTo(currentPt, { animate: true, duration: 0.5 });
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isCityDriving, viewMode, drivingSpeed, activeRouteCoords, activeCheckpoints]);

  useEffect(() => {
    if (!isBrgyDriving || viewMode !== "barangay" || !activeBarangayCircuit) return;

    const bRoute = getSectorPerimeterRoute(activeBarangayCircuit.id, BARANGAY_PERIMETER_ROUTES);
    if (!bRoute || !bRoute.points || bRoute.points.length === 0) return;

    const stepSize = drivingSpeed === 4 ? 4 : drivingSpeed === 2 ? 2 : 1;
    const intervalTime = 120 / drivingSpeed;

    const timer = setInterval(() => {
      setBrgyRouteIndex((prev) => {
        const next = (prev + stepSize) % bRoute.points.length;
        const currentPt = bRoute.points[next];

        if (leafletMapRef.current && (next % 10 === 0)) {
          leafletMapRef.current.panTo(currentPt, { animate: true, duration: 0.4 });
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isBrgyDriving, viewMode, activeBarangayCircuit, drivingSpeed]);

  const handleSelectBarangayPerimeter = (barangayId, initialTab = "route") => {
    const found =
      activeSectorsList.find((b) => b.id === barangayId) ||
      activeCheckpoints.find((b) => b.id === barangayId) ||
      ALL_27_BARANGAYS.find((b) => b.id === barangayId);
    if (!found) return;

    setActiveBarangayCircuit(found);
    setViewMode("barangay");
    setBrgyRouteIndex(0);
    setIsBrgyDriving(false);
    setBrgyInspectorTab(initialTab);

    if (leafletMapRef.current) {
      const bRoute = getSectorPerimeterRoute(barangayId, BARANGAY_PERIMETER_ROUTES);
      if (bRoute && bRoute.boundaryPolygon && bRoute.boundaryPolygon.length > 0) {
        const bounds = window.L.latLngBounds(bRoute.boundaryPolygon);
        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else if (bRoute && bRoute.points && bRoute.points.length > 0) {
        const bounds = window.L.latLngBounds(bRoute.points);
        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else if (found.coords) {
        leafletMapRef.current.flyTo(found.coords, 15, { duration: 1.0 });
      }
    }
  };

  const handleReturnToCityView = () => {
    setViewMode("city");
    setActiveBarangayCircuit(null);
    setIsBrgyDriving(false);
    if (leafletMapRef.current) {
      const cityBounds = window.L.latLngBounds(activeRouteCoords);
      leafletMapRef.current.fitBounds(cityBounds, { padding: [45, 45] });
    }
  };

  const handleFocusPOI = (coords) => {
    if (leafletMapRef.current && coords) {
      leafletMapRef.current.flyTo(coords, 17, { duration: 0.8 });
    }
  };

  const topSearchResults = useMemo(() => {
    const q = topAgentSearchQuery.trim().toLowerCase();
    if (!q) return [];

    const results = [];
    const seenAgentIds = new Set();
    const sourceAgents = selectedTerritory === "all" ? apiAgents : territoryAgents;
    const sourceBooths = territoryTaggedBooths;

    (sourceAgents || []).forEach((ag) => {
      const name = (ag.fullName || "").toLowerCase();
      const user = (ag.username || "").toLowerCase();
      const idStr = String(ag.id || "");
      if (name.includes(q) || user.includes(q) || idStr === q) {
        seenAgentIds.add(idStr);
        const assignedBooth = (sourceBooths || []).find((b) => {
          if (b.agentId && String(b.agentId) === idStr) return true;
          if (b.tellerName) {
            const t = b.tellerName.toLowerCase().trim();
            return t.includes(name) || name.includes(t) || (user && t.includes(user));
          }
          return false;
        });
        results.push({
          type: "agent",
          agent: ag,
          assignedBooth: assignedBooth || null
        });
      }
    });

    (sourceBooths || []).forEach((b) => {
      const bTeller = (b.tellerName || "").toLowerCase();
      const bName = (b.name || "").toLowerCase();
      const bAddress = (b.address || "").toLowerCase();
      const bBrgy = (b.barangayName || "").toLowerCase();

      if (bTeller.includes(q) || bName.includes(q) || bAddress.includes(q) || bBrgy.includes(q)) {
        if (!b.agentId || !seenAgentIds.has(String(b.agentId))) {
          results.push({
            type: "booth",
            booth: b,
            agentName: b.tellerName || `Booth ${b.name}`,
            assignedBooth: b
          });
        }
      }
    });

    return results.slice(0, 10);
  }, [topAgentSearchQuery, apiAgents, territoryAgents, selectedTerritory, territoryTaggedBooths]);

  const handleFocusBooth = (booth, agentName = "") => {
    if (!booth || !booth.coords) return;

    if (activeNavRoute && String(activeNavRoute.targetBooth?.id) !== String(booth.id)) {
      handleClearNavRoute();
    }
    setFocusedBooth({ booth, agentName: agentName || booth.tellerName || "" });
    setNavErrorNotice("");

    if (viewMode === "barangay" && activeBarangayCircuit && booth.barangayId !== activeBarangayCircuit.id) {
      setViewMode("city");
      setActiveBarangayCircuit(null);
    }

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo(booth.coords, 18, { duration: 1.0 });
      setTimeout(() => {
        const marker =
          boothMarkersRef.current[String(booth.id)] ||
          (booth.agentId && boothMarkersRef.current[`agent_${booth.agentId}`]) ||
          (booth.tellerName && boothMarkersRef.current[`teller_${booth.tellerName.trim().toLowerCase()}`]);
        if (marker && typeof marker.openPopup === "function") {
          marker.openPopup();
        }
      }, 750);
    }

    setCopiedText(`Focused on Booth ${booth.name || '001'} (Brgy. ${booth.barangayName || ''})${agentName ? ` • ${agentName}` : ''}`);
    setTimeout(() => setCopiedText(null), 3500);
  };

  const handleSelectAgentSearch = (agent) => {
    setIsTopSearchOpen(false);
    setTopAgentSearchQuery(agent.fullName || agent.username);

    const agentIdStr = String(agent.id || "");
    const agentNameLower = (agent.fullName || "").toLowerCase().trim();
    const agentUserLower = (agent.username || "").toLowerCase().trim();

    const matchedBooth = (territoryTaggedBooths || []).find((b) => {
      if (b.agentId && String(b.agentId) === agentIdStr) return true;
      if (b.tellerName) {
        const tLower = b.tellerName.toLowerCase().trim();
        return (
          tLower.includes(agentNameLower) ||
          agentNameLower.includes(tLower) ||
          (agentUserLower && tLower.includes(agentUserLower))
        );
      }
      return false;
    });

    if (matchedBooth) {
      handleFocusBooth(matchedBooth, agent.fullName);
    } else {
      setCopiedText(`${agent.fullName || 'Agent'} is registered but not assigned to any plotted booth yet.`);
      setTimeout(() => setCopiedText(null), 3500);
    }
  };

  const handleSelectBoothSearch = (booth) => {
    setIsTopSearchOpen(false);
    setTopAgentSearchQuery(booth.tellerName || `Booth ${booth.name}`);
    handleFocusBooth(booth, booth.tellerName);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter" && topSearchResults.length > 0) {
      e.preventDefault();
      const first = topSearchResults[0];
      if (first.type === "agent") {
        handleSelectAgentSearch(first.agent);
      } else {
        handleSelectBoothSearch(first.booth);
      }
    } else if (e.key === "Escape") {
      setIsTopSearchOpen(false);
    }
  };

  const currentTerritoryPOIs = useMemo(() => {
    return getTerritoryPOIs(selectedTerritory, MANDAUE_POIS);
  }, [selectedTerritory]);

  const activeBarangayData = activeBarangayCircuit
    ? getSectorPerimeterRoute(activeBarangayCircuit.id, BARANGAY_PERIMETER_ROUTES)
    : null;

  const isNavFocusMode = Boolean(activeNavRoute);

  return (
    <div className="space-y-3 antialiased">
      {!isNavFocusMode && (
      <div className="bg-white rounded-xl border border-slate-200/80 p-1.5 sm:p-2 shadow-2xs flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1 pr-1 shrink-0 flex items-center gap-1">
          <Globe size={11} className="text-emerald-600" />
          <span>Territory:</span>
        </span>
        {isGlobalUser ? (
          Object.entries(TERRITORY_CONFIG).map(([key, cfg]) => {
            const isSelected = selectedTerritory === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectTerritory(key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap shadow-2xs shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white ring-1 ring-slate-800 shadow-2xs"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Building2 size={11} className={isSelected ? "text-emerald-400" : "text-slate-400"} />
                <span>{cfg.short}</span>
              </button>
            );
          })
        ) : (
          userEntityScope && !userEntityScope.isNonStl && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold shadow-2xs shrink-0">
              <Building2 size={11} className="text-emerald-400" />
              <span>{TERRITORY_CONFIG[userEntityScope.territoryKey]?.name || userEntityScope.canonicalName}</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-bold">
                Branch Scope
              </span>
            </div>
          )
        )}
      </div>
      )}

      {userEntityScope?.isNonStl ? (
        <div className="p-12 text-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 space-y-3 shadow-2xs my-4">
          <Building2 size={36} className="mx-auto text-slate-400" />
          <h3 className="text-base font-bold text-slate-800">{userEntityScope.canonicalName}</h3>
          <p className="text-xs max-w-md mx-auto text-slate-500">
            Operations Geo-Tagging is exclusive to PCSO STL Authorized Operating Entities. Your account is assigned to a Non-STL entity.
          </p>
        </div>
      ) : (
        <>

      {!isNavFocusMode && (
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2.5">
        <div ref={searchContainerRef} className="relative flex-1 min-w-[260px] sm:min-w-[340px] max-w-md">
          <div className="relative flex items-center">
            <Search size={15} className="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={topAgentSearchQuery}
              onChange={(e) => {
                setTopAgentSearchQuery(e.target.value);
                setIsTopSearchOpen(true);
              }}
              onFocus={() => setIsTopSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search Booth Code, Agent Name, address, or barangay..."
              className="w-full pl-9 pr-9 py-2 bg-white rounded-2xl border border-slate-200/90 shadow-2xs text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition"
            />
            {topAgentSearchQuery && (
              <button
                type="button"
                onClick={() => {
                  setTopAgentSearchQuery("");
                  setIsTopSearchOpen(false);
                }}
                className="absolute right-3 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {isTopSearchOpen && topAgentSearchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
              {topSearchResults.length > 0 ? (
                <div className="py-1 divide-y divide-slate-100">
                  {topSearchResults.map((res, idx) => {
                    if (res.type === "agent") {
                      const ag = res.agent;
                      const hasBooth = !!res.assignedBooth;
                      return (
                        <button
                          key={`agent-${ag.id}-${idx}`}
                          type="button"
                          onClick={() => handleSelectAgentSearch(ag)}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 transition flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                              hasBooth ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600"
                            }`}>
                              {hasBooth ? <MapPin size={15} className="text-emerald-600" /> : <Users size={15} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 truncate">
                                {ag.fullName || ag.username}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                @{ag.username || "agent"} {ag.supervisor ? `• Sup: ${ag.supervisor}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {hasBooth ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                                <span>🏪</span> Booth {res.assignedBooth.name} ({res.assignedBooth.barangayName})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400">
                                No booth assigned
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    } else {
                      const b = res.booth;
                      return (
                        <button
                          key={`booth-${b.id}-${idx}`}
                          type="button"
                          onClick={() => handleSelectBoothSearch(b)}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 transition flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center text-xs font-black shrink-0">
                              <Store size={15} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-700 truncate">
                                Booth {b.name} {b.tellerName ? `• ${b.tellerName}` : ""}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                Brgy. {b.barangayName} {b.address ? `• ${b.address}` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-200">
                              Plotted Booth
                            </span>
                          </div>
                        </button>
                      );
                    }
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No registered agent or plotted booth matching "<strong>{topAgentSearchQuery}</strong>".
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">
            Active Franchise Area:
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
            {TERRITORY_CONFIG[selectedTerritory]?.name || "All STL Operating Entities"}
          </span>
        </div>
      </div>
      )}

      <div className={`${isNavFocusMode ? "h-[calc(100vh-110px)] min-h-[640px]" : "h-[720px] md:h-[780px]"} rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col relative bg-slate-950 text-white font-sans select-none transition-all duration-200`}>
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full bg-slate-950 z-0 cursor-crosshair"
      />

      {!leafletLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 gap-3 z-30">
          <RefreshCw size={28} className="animate-spin text-emerald-400" />
          <p className="text-xs font-bold tracking-wide">Loading {TERRITORY_CONFIG[selectedTerritory]?.short || "Territory"} Boundary Maps...</p>
        </div>
      )}

      {copiedText && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-mono text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 animate-in fade-in duration-150">
          <Check size={14} />
          <span>Copied {copiedText}</span>
        </div>
      )}

      {isPickingNavOrigin && focusedBooth?.booth && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-xl border-2 border-sky-400 rounded-2xl shadow-2xl p-3 px-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 max-w-[94vw]">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/40 flex items-center justify-center shrink-0 animate-pulse">
            <Crosshair size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Select Starting Coordinates
            </div>
            <div className="text-xs text-white font-semibold">
              Click anywhere on the map to route to <strong>Booth {focusedBooth.booth.name}</strong>{focusedBooth.agentName ? ` (${focusedBooth.agentName})` : ""}.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPickingNavOrigin(false)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition cursor-pointer border border-slate-700 shrink-0"
          >
            Cancel
          </button>
        </div>
      )}

      {activeNavRoute && !isPickingNavOrigin && (
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-xl animate-in fade-in slide-in-from-top-2 duration-200">
          {(() => {
            const currentStep = activeNavRoute.steps?.[activeNavStepIdx] || activeNavRoute.steps?.[0];
            const traffic = activeNavRoute.traffic;
            const trafficBadgeClass =
              traffic?.level === "heavy"
                ? "bg-rose-500/25 text-rose-100 border-rose-400/50"
                : traffic?.level === "moderate"
                ? "bg-amber-500/25 text-amber-100 border-amber-400/50"
                : "bg-emerald-500/25 text-emerald-100 border-emerald-400/50";
            return (
              <div className="bg-gradient-to-r from-[#0f5132] via-[#0d6e47] to-[#0a5838] border border-emerald-400/50 rounded-2xl shadow-2xl overflow-hidden">
                <div className="px-3.5 py-2.5 flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={() => speakRouteStep(currentStep)}
                    title="Click to replay voice instruction"
                    className="flex items-center gap-3 min-w-0 text-left cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/15 group-hover:bg-white/25 border border-white/25 flex items-center justify-center text-white shrink-0 transition">
                      {currentStep?.dir === "left" ? (
                        <ArrowLeft size={19} />
                      ) : currentStep?.dir === "right" ? (
                        <ArrowRight size={19} />
                      ) : currentStep?.dir === "uturn" ? (
                        <RotateCcw size={18} />
                      ) : (
                        <Navigation size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-100 bg-black/25 px-1.5 py-0.5 rounded">
                          {activeNavRoute.isLiveGps ? "Live GPS" : "Road Nav"}
                        </span>
                        {currentStep?.distanceMeters > 0 && (
                          <span className="text-[11px] font-bold text-white/95 font-mono">
                            {formatNavDistance(currentStep.distanceMeters)}
                          </span>
                        )}
                        {traffic && (
                          <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${trafficBadgeClass}`}>
                            <span>{traffic.level === "heavy" ? "🔴" : traffic.level === "moderate" ? "🟠" : "🟢"}</span>
                            <span>{traffic.label}</span>
                            <span className="opacity-75">({traffic.sourceLabel})</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-[13px] font-bold text-white truncate mt-0.5">
                        {voiceLang === "tl" && currentStep
                          ? toTaglishVoiceInstruction(currentStep)
                          : currentStep?.instruction || `Proceed to Booth ${activeNavRoute.targetBooth?.name}`}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !voiceGuidanceEnabled;
                        setVoiceGuidanceEnabled(next);
                        if (next && currentStep) {
                          speakRouteStep(currentStep);
                        }
                      }}
                      className={`p-1.5 rounded-xl border transition cursor-pointer ${
                        voiceGuidanceEnabled
                          ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
                          : "bg-black/30 hover:bg-black/45 text-emerald-200/70 border-white/10"
                      }`}
                      title={voiceGuidanceEnabled ? "Voice Guidance ON (click to mute)" : "Voice Muted (click to unmute)"}
                    >
                      {voiceGuidanceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nextLang = voiceLang === "tl" ? "en" : "tl";
                        setVoiceLang(nextLang);
                        if (voiceGuidanceEnabled && currentStep) {
                          speakRouteStep(currentStep, nextLang);
                        }
                      }}
                      className="px-2 py-1 rounded-xl bg-black/25 hover:bg-black/40 text-emerald-100 text-[10px] font-extrabold border border-white/15 transition cursor-pointer uppercase"
                      title="Switch Voice Language (Taglish / English)"
                    >
                      {voiceLang === "tl" ? "TL" : "EN"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsNavStepsExpanded((prev) => !prev)}
                      className="px-2.5 py-1.5 rounded-xl bg-black/25 hover:bg-black/40 text-white text-[11px] font-semibold border border-white/15 transition cursor-pointer flex items-center gap-1"
                    >
                      <Route size={12} />
                      <span>Steps ({activeNavRoute.steps?.length || 0})</span>
                    </button>
                  </div>
                </div>

                {traffic?.advisoryText && (
                  <div className="px-3.5 py-1.5 bg-black/25 border-t border-white/10 flex items-center justify-between gap-2 text-[10.5px] text-emerald-50/95">
                    <span className="truncate">{traffic.advisoryText}</span>
                    {Boolean((API_CONFIG?.TOMTOM_API_KEY || "").trim()) && (
                      <button
                        type="button"
                        onClick={() => setShowLiveTrafficTiles((prev) => !prev)}
                        className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border transition cursor-pointer shrink-0 ${
                          showLiveTrafficTiles
                            ? "bg-amber-400 text-slate-950 border-amber-300"
                            : "bg-white/10 hover:bg-white/20 text-white border-white/20"
                        }`}
                      >
                        {showLiveTrafficTiles ? "Traffic Map ON" : "Traffic Map"}
                      </button>
                    )}
                  </div>
                )}

                {isNavStepsExpanded && activeNavRoute.steps && activeNavRoute.steps.length > 0 && (
                  <div className="bg-slate-950/95 border-t border-emerald-400/30 max-h-56 overflow-y-auto custom-scrollbar divide-y divide-slate-800/80">
                    {activeNavRoute.steps.map((st, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveNavStepIdx(idx);
                          if (st.location && leafletMapRef.current) {
                            leafletMapRef.current.flyTo(st.location, 17, { duration: 0.7 });
                          }
                          if (voiceGuidanceEnabled) {
                            speakRouteStep(st);
                          }
                        }}
                        className={`w-full px-3.5 py-2 text-left hover:bg-slate-900/90 transition flex items-center justify-between gap-2.5 cursor-pointer ${
                          activeNavStepIdx === idx ? "bg-emerald-950/60 border-l-2 border-l-emerald-400" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            st.dir === "arrive"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : st.dir === "depart"
                              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}>
                            {st.dir === "left" ? "↰" : st.dir === "right" ? "↱" : st.dir === "uturn" ? "↺" : st.dir === "roundabout" ? "⟳" : st.dir === "arrive" ? "🏁" : st.dir === "depart" ? "📍" : "↑"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11.5px] font-semibold text-slate-100 truncate">
                              {voiceLang === "tl" ? toTaglishVoiceInstruction(st) : st.instruction}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{st.street}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {st.distanceMeters > 0 && (
                            <span className="text-[10.5px] font-mono font-bold text-sky-300">
                              {formatNavDistance(st.distanceMeters)}
                            </span>
                          )}
                          <Volume2 size={11} className="text-slate-500" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {isNavFocusMode && !isAutoFollowCamera && (
        <button
          type="button"
          onClick={() => recenterOnNavVehicle(null, 18)}
          className="absolute bottom-36 sm:bottom-28 left-4 z-40 px-3.5 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 shadow-2xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-150"
          title="Zoom back in to your live vehicle location"
        >
          <LocateFixed size={14} className="text-blue-600" />
          <span>Re-center</span>
        </button>
      )}

      {(activeNavRoute || focusedBooth?.booth) && !measuredPair && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-slate-950/95 backdrop-blur-xl border border-sky-500/60 rounded-2xl shadow-2xl p-3 px-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {activeNavRoute ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800/90">
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800">
                  {[
                    { id: "motor", label: "🏍️ Motor" },
                    { id: "car", label: "🚗 Car" },
                    { id: "arrow", label: "🧭 GPS" }
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setNavVehicleType(v.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer ${
                        navVehicleType === v.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {!isDeviceOnline ? (
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      📡 Offline GPS Active
                    </span>
                  ) : isOfflineRouteReady ? (
                    <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      ✓ Offline Ready
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => (isAutoFollowCamera ? showNavRouteOverview() : recenterOnNavVehicle(null, 18))}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[10.5px] font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1"
                    title={isAutoFollowCamera ? "Zoom out to see full route" : "Zoom in (18x) on your vehicle"}
                  >
                    <Crosshair size={11} />
                    <span>{isAutoFollowCamera ? "Overview" : "Re-center"}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-lg shrink-0 ${
                    activeNavRoute.traffic?.level === "heavy"
                      ? "bg-gradient-to-br from-rose-600 to-red-500 shadow-rose-900/40"
                      : activeNavRoute.traffic?.level === "moderate"
                      ? "bg-gradient-to-br from-amber-600 to-orange-500 shadow-amber-900/40"
                      : "bg-gradient-to-br from-blue-600 to-sky-500 shadow-blue-900/40"
                  }`}>
                    <Navigation size={19} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-base font-extrabold leading-none ${
                        activeNavRoute.traffic?.level === "heavy"
                          ? "text-rose-400"
                          : activeNavRoute.traffic?.level === "moderate"
                          ? "text-amber-400"
                          : "text-sky-400"
                      }`}>
                        {formatNavDuration(activeNavRoute.durationSec)}
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        ({formatNavDistance(activeNavRoute.distanceMeters)})
                      </span>
                      <span className="text-[10.5px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        ETA {formatNavArrivalClock(activeNavRoute.durationSec)}
                      </span>
                      {activeNavRoute.traffic?.delaySec >= 60 && (
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          +{Math.round(activeNavRoute.traffic.delaySec / 60)}m traffic
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-white truncate mt-1">
                      To: <strong className="text-amber-300">Booth {activeNavRoute.targetBooth?.name || "001"}</strong>
                      {activeNavRoute.agentName ? ` • ${activeNavRoute.agentName}` : ""}
                      {activeNavRoute.targetBooth?.barangayName ? ` (Brgy. ${activeNavRoute.targetBooth.barangayName})` : ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleLiveGpsTracking}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                      isLiveGpsTracking
                        ? "bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-900/40"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                    title="Auto-track your moving GPS position with automatic voice turns"
                  >
                    <LocateFixed size={13} className={isLiveGpsTracking ? "animate-pulse" : ""} />
                    <span>{isLiveGpsTracking ? "Live GPS ON" : "Live GPS"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => speakRouteStartSummary(activeNavRoute)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
                    title="Replay voice summary & traffic briefing"
                  >
                    <Volume2 size={12} className="text-sky-400" />
                    <span>Speak</span>
                  </button>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${activeNavRoute.startCoords[0]},${activeNavRoute.startCoords[1]}&destination=${activeNavRoute.targetBooth.coords[0]},${activeNavRoute.targetBooth.coords[1]}&travelmode=driving&layer=t`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition flex items-center gap-1 shadow-md"
                    title="Open turn-by-turn navigation & live traffic in Google Maps"
                  >
                    <span>Google Maps</span>
                    <ExternalLink size={11} />
                  </a>

                  <a
                    href={`https://waze.com/ul?ll=${activeNavRoute.targetBooth.coords[0]},${activeNavRoute.targetBooth.coords[1]}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-extrabold transition flex items-center gap-1 shadow-md"
                    title="Open turn-by-turn navigation & live traffic in Waze"
                  >
                    <span>Waze</span>
                    <ExternalLink size={11} />
                  </a>

                  <button
                    type="button"
                    onClick={handleClearNavRoute}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1"
                    title="End Navigation Route"
                  >
                    <X size={13} />
                    <span>End</span>
                  </button>
                </div>
              </div>

              {navErrorNotice && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2">
                  <span>{navErrorNotice}</span>
                  <button
                    type="button"
                    onClick={() => setIsPickingNavOrigin(true)}
                    className="text-sky-300 font-bold underline shrink-0 cursor-pointer"
                  >
                    Pick Start on Map
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/40 flex items-center justify-center shrink-0">
                    <Store size={17} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-white">
                        Booth {focusedBooth.booth.name || "001"}
                      </span>
                      {focusedBooth.agentName && (
                        <span className="text-[10.5px] font-semibold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full truncate max-w-[180px]">
                          {focusedBooth.agentName}
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-400 truncate">
                      Brgy. {focusedBooth.booth.barangayName || "Territory"} • {formatGPS(focusedBooth.booth.coords)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  <button
                    type="button"
                    disabled={isCalculatingNavRoute}
                    onClick={() => handleRouteFromMyLocation(focusedBooth.booth, focusedBooth.agentName)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white text-xs font-extrabold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-blue-900/40 disabled:opacity-60"
                  >
                    {isCalculatingNavRoute ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Navigation size={14} />
                    )}
                    <span>{isCalculatingNavRoute ? "Getting GPS & Route..." : "Route From My Location"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNavErrorNotice("");
                      setIsPickingNavOrigin(true);
                    }}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 transition cursor-pointer flex items-center gap-1"
                    title="Click anywhere on the map to set custom starting coordinates"
                  >
                    <Crosshair size={13} className="text-sky-400" />
                    <span>Pick Start</span>
                  </button>

                  <a
                    href={`https://waze.com/ul?ll=${focusedBooth.booth.coords[0]},${focusedBooth.booth.coords[1]}&navigate=yes`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 text-[11px] font-bold transition flex items-center gap-1"
                    title="Navigate directly in Waze app"
                  >
                    <span>Waze</span>
                    <ExternalLink size={11} />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setFocusedBooth(null);
                      setNavErrorNotice("");
                      setIsPickingNavOrigin(false);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {navErrorNotice && (
                <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 flex items-center justify-between gap-2">
                  <span>{navErrorNotice}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNavErrorNotice("");
                      setIsPickingNavOrigin(true);
                    }}
                    className="text-sky-300 font-bold underline shrink-0 cursor-pointer"
                  >
                    Pick Start on Map
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isNavFocusMode && measuringSourceKiosk && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-xl border-2 border-teal-400 rounded-2xl shadow-2xl p-3 px-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200 max-w-[94vw] border-teal-400 shadow-teal-950/60">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-400/40 flex items-center justify-center shrink-0 animate-pulse">
            <Ruler size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40">
                Distance Measurement
              </span>
              <span className="text-[11px] font-mono font-bold text-teal-300">
                Point A: Booth {measuringSourceKiosk.name}
              </span>
            </div>
            <div className="text-xs text-white font-bold mt-0.5">
              Click a <strong>second kiosk</strong> on the map to measure distance and view yesterday's gross sales.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMeasuringSourceKiosk(null);
              setCopiedText("Measurement cancelled");
              setTimeout(() => setCopiedText(null), 2000);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer border border-slate-700 shrink-0 ml-1"
          >
            Cancel
          </button>
        </div>
      )}

      {!isNavFocusMode && measuredPair && !isDistanceModalOpen && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-xl border border-teal-500/80 rounded-2xl shadow-2xl p-2.5 px-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[94vw]">
          <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Ruler size={16} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-teal-400 flex items-center gap-1">
              <span>🚗</span>
              <span>Road Distance: {measuredPair.distanceMeters >= 1000 ? `${(measuredPair.distanceMeters / 1000).toFixed(2)} km` : `${Math.round(measuredPair.distanceMeters)} m`}</span>
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Booth {measuredPair.source?.name}</span>
              <span className="text-teal-400">➔</span>
              <span>Booth {measuredPair.target?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => setIsDistanceModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1"
            >
              <CircleDollarSign size={13} />
              <span>View Yesterday's Gross</span>
            </button>
            <button
              type="button"
              onClick={handleClearMeasurement}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
              title="Clear Line on Map"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {!isNavFocusMode && clickedPoint && (
        <div className="absolute top-28 left-4 right-4 sm:left-auto sm:right-4 z-40 bg-slate-900/95 backdrop-blur-xl border border-sky-500/80 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
                Tagged Coordinates
              </div>
              <div className="text-xs font-mono font-black text-white">
                {formatGPS([clickedPoint.lat, clickedPoint.lng])}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                ({clickedPoint.lat.toFixed(6)}, {clickedPoint.lng.toFixed(6)})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopyGPS([clickedPoint.lat, clickedPoint.lng], "Tagged Point")}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-slate-700"
              title="Copy GPS coordinates"
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddBooth([clickedPoint.lat, clickedPoint.lng])}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-900/40"
              title="Register and tag a new booth at these exact coordinates"
            >
              <Plus size={13} />
              <span>Add Booth Here</span>
            </button>

            <a
              href={`https://www.google.com/maps?q=${clickedPoint.lat.toFixed(6)},${clickedPoint.lng.toFixed(6)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-900/40"
            >
              <span>Proceed to Google Maps</span>
              <ExternalLink size={13} />
            </a>

            <button
              type="button"
              onClick={() => {
                setClickedPoint(null);
                if (clickedMarkerRef.current && leafletMapRef.current) {
                  leafletMapRef.current.removeLayer(clickedMarkerRef.current);
                  clickedMarkerRef.current = null;
                }
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700 ml-0.5"
              title="Clear Marker"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {!isNavFocusMode && (
      <div className="absolute top-3 left-3 right-3 md:left-4 md:right-4 z-20 pointer-events-auto space-y-2">
        {viewMode === "city" && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shrink-0">
                <Navigation2 size={22} className="rotate-45" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    City Perimeter Circuit
                  </span>
                  <span className="text-sm font-black text-white">
                    Step {selectedEdgeBarangay.step}: Brgy. {selectedEdgeBarangay.name}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    ({formatGPS(selectedEdgeBarangay.coords)})
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-medium line-clamp-1 mt-0.5">
                  💡 <em>Click anywhere on the map to pin exact GPS coordinates &amp; proceed directly to Google Maps!</em>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setShowTerminals(v => !v)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${showTerminals
                  ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md"
                  : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                title="Toggle Transit Terminals & Commuter Stations"
              >
                <Bus size={13} />
                <span>Terminals ({currentTerritoryPOIs.terminals.length})</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showTerminals ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowFactories(v => !v)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${showFactories
                  ? "bg-orange-500/20 border-orange-400 text-orange-300 shadow-md"
                  : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                title="Toggle Industrial Manufacturing Plants & Factories"
              >
                <Factory size={13} />
                <span>Factories ({currentTerritoryPOIs.factories.length})</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showFactories ? "bg-orange-400 animate-pulse" : "bg-slate-600"}`} />
              </button>

              <button
                type="button"
                onClick={() => setCityInspectorTab("tagged_agents")}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer bg-slate-800 border-slate-700 text-slate-300 hover:text-white shadow-sm"
                title="View User-Tagged Booths & Stations on Map"
              >
                <MapPin size={13} className="text-emerald-400" />
                <span>Tagged Booths ({territoryTaggedBooths.length})</span>
              </button>

              <div
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${syncStatus === "syncing"
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    : syncStatus === "offline"
                      ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                      : "bg-sky-500/15 border-sky-500/30 text-sky-300"
                  }`}
                title="Central Supabase Cloud Database: Plotted booths are synchronized in real-time across all users and devices"
              >
                <Cloud size={13} className={syncStatus === "syncing" ? "animate-pulse" : ""} />
                <span>
                  {syncStatus === "syncing" ? "Syncing..." : syncStatus === "offline" ? "Offline" : "Cloud Synced"}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${syncStatus === "syncing"
                      ? "bg-amber-400 animate-ping"
                      : syncStatus === "offline"
                        ? "bg-rose-400"
                        : "bg-emerald-400 animate-pulse"
                    }`}
                />
              </div>

              <button
                type="button"
                onClick={() => handleOpenBoothModal()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
                title="Tag Booth: Enter GPS Coordinates, Detect Barangay & Set Booth Address"
              >
                <Plus size={14} />
                <Store size={14} />
                <span>Tag Booth</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700 ml-1"
                title="Close GeoTagging View"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {viewMode === "barangay" && activeBarangayCircuit && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/60 rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReturnToCityView}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-700 shrink-0 shadow-md"
                title="Return to Whole Mandaue City Map"
              >
                <ArrowLeft size={16} />
                <span>Return to City Overview</span>
              </button>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Full Barangay Boundary
                  </span>
                  <h2 className="text-base font-black text-white">
                    Brgy. {activeBarangayCircuit.name}
                  </h2>
                  <span className="text-xs font-mono font-black text-cyan-400">
                    • {activeBarangayData?.distanceKm || "7.84"} km Perimeter Route
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyGPS(activeBarangayCircuit.coords, `Brgy. ${activeBarangayCircuit.name}`)}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                    title="Click to copy GPS coordinates"
                  >
                    <span>{formatGPS(activeBarangayCircuit.coords)}</span>
                    <Copy size={11} className="text-cyan-400" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300 font-medium mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <ShieldCheck size={13} />
                    <span>100% Precise Boundary Covered</span>
                  </span>
                  <span className="flex items-center gap-1 text-amber-300 font-semibold">
                    <Bus size={13} />
                    <span>{activeBarangayData?.terminals?.length || 0} Transit Stations</span>
                  </span>
                  <span className="flex items-center gap-1 text-orange-300 font-semibold">
                    <Factory size={13} />
                    <span>{activeBarangayData?.factories?.length || 0} Industrial Facilities</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Store size={13} />
                    <span>{activeBarangayTaggedBooths.length} Yellow Booths</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <MapPin size={13} />
                    <span>{activeBarangayTaggedAgents.length} Tagged Stations</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => handleOpenBoothModal(null, activeBarangayCircuit)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/40"
                title={`Tag Booth in Brgy. ${activeBarangayCircuit.name}`}
              >
                <Plus size={14} />
                <Store size={14} />
                <span>Tag Booth</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="px-2.5 py-1 rounded-xl bg-slate-900/95 border border-slate-800 text-[10px] font-black text-cyan-400 backdrop-blur-md shrink-0">
            Select Sector to Inspect:
          </span>
          {activeSectorsList.map((b) => {
            const isCurrent = activeBarangayCircuit?.id === b.id;
            const bAgentsCount = getAgentsForBarangayId(b.id).length;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBarangayPerimeter(b.id)}
                className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 backdrop-blur-md border shadow-sm ${isCurrent
                  ? "bg-cyan-600 text-white border-cyan-400 shadow-md ring-2 ring-cyan-400/40"
                  : "bg-slate-900/90 text-slate-300 hover:text-white border-slate-800"
                  }`}
              >
                <span>{b.isEdge ? "🛡️" : "🏛️"}</span>
                <span>{b.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${isCurrent ? 'bg-cyan-900 text-cyan-100' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'}`}>
                  {bAgentsCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      <div className={`absolute ${isNavFocusMode ? "top-28 right-3.5" : "top-36 right-4"} z-20 flex flex-col gap-2 pointer-events-auto`}>
        <button
          type="button"
          onClick={() => {
            if (leafletMapRef.current) leafletMapRef.current.zoomIn();
          }}
          className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-md text-white shadow-xl flex items-center justify-center font-bold text-base hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            if (leafletMapRef.current) leafletMapRef.current.zoomOut();
          }}
          className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-md text-white shadow-xl flex items-center justify-center font-bold text-base hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
          title="Zoom Out"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => {
            if (leafletMapRef.current) {
              if (isNavFocusMode) {
                recenterOnNavVehicle(null, 18);
              } else if (viewMode === "barangay" && activeBarangayCircuit) {
                const bRoute = BARANGAY_PERIMETER_ROUTES[activeBarangayCircuit.id];
                if (bRoute && bRoute.points) {
                  leafletMapRef.current.panTo(bRoute.points[brgyRouteIndex] || activeBarangayCircuit.coords, { animate: true });
                }
              } else {
                leafletMapRef.current.panTo(SNAPPED_EDGE_ROUTE_COORDS[cityRouteIndex], { animate: true });
              }
            }
          }}
          className={`w-8 h-8 rounded-xl text-white shadow-xl flex items-center justify-center transition cursor-pointer ${
            isNavFocusMode ? "bg-blue-600 hover:bg-blue-500" : "bg-emerald-600 hover:bg-emerald-500"
          }`}
          title={isNavFocusMode ? "Recenter Navigation Route" : "Center on Patrol Vehicle"}
        >
          <Crosshair size={15} />
        </button>
      </div>

      {!isNavFocusMode && (
      <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800 shadow-2xl max-w-xs text-xs pointer-events-auto space-y-1">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="font-black text-slate-300 uppercase text-[9px] tracking-wider flex items-center gap-1.5">
            <Route size={11} className="text-emerald-400" />
            {viewMode === "barangay" ? `Brgy. ${activeBarangayCircuit?.name} Legend` : "Perimeter Circuit Legend"}
          </span>
          <span className="text-[8.5px] text-cyan-400 font-bold">
            {viewMode === "barangay" ? "Precise Boundary" : "City Circuit"}
          </span>
        </div>

        <div className="space-y-1 text-[10px]">
          {viewMode === "barangay" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-sm" />
                <span className="font-bold text-cyan-300">Cyan: Snapped Perimeter Road</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/25 border border-dashed border-emerald-400 shrink-0" />
                <span className="font-bold text-emerald-300">Green: 100% Cadastral Boundary</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">🚌</span>
                <span className="font-semibold text-amber-300">Transit Terminals (GPS Tagged)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">🏭</span>
                <span className="font-semibold text-orange-300">Industrial Facilities (GPS Tagged)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                <span className="font-bold text-emerald-300">Green: Outer Edge Circuit (16 Barangays)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-700 text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                <span className="font-medium text-slate-300">Outer Edge Pins (1 to 16)</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 pt-0.5 border-t border-slate-800 text-[9.5px] text-sky-400">
            <span className="text-xs">📍</span>
            <span className="font-bold">Click map to tag &amp; open Google Maps</span>
          </div>
        </div>
      </div>
      )}

      {!isNavFocusMode && (
      <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:w-[430px] max-h-[390px] z-30 pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 text-xs animate-in slide-in-from-bottom duration-200 flex flex-col gap-2 overflow-hidden">
        {viewMode === "barangay" && activeBarangayCircuit ? (
          <>
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 inline-block mb-0.5">
                  Territory &amp; Facilities Inspector
                </span>
                <h3 className="text-base font-black text-white leading-tight">
                  Brgy. {activeBarangayCircuit.name}
                </h3>
                <p className="text-[10.5px] text-cyan-400 font-bold mt-0.5">
                  100% Authorized Under {TERRITORY_CONFIG[selectedTerritory]?.name || "Authorized STL Area"}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Circuit Length</span>
                <span className="text-xs font-mono font-black text-cyan-400">
                  {activeBarangayData?.distanceKm || "7.84"} km
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setBrgyInspectorTab("route")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shrink-0 ${brgyInspectorTab === "route"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Route size={12} />
                <span>Boundary</span>
              </button>

              <button
                type="button"
                onClick={() => setBrgyInspectorTab("booths")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shrink-0 ${brgyInspectorTab === "booths"
                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <span>🟡</span>
                <span>Booths ({activeBarangayTaggedBooths.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setBrgyInspectorTab("terminals")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shrink-0 ${brgyInspectorTab === "terminals"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Bus size={12} />
                <span>Terminals ({activeBarangayData?.terminals?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setBrgyInspectorTab("factories")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shrink-0 ${brgyInspectorTab === "factories"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Factory size={12} />
                <span>Factories ({activeBarangayData?.factories?.length || 0})</span>
              </button>
            </div>

            {brgyInspectorTab === "route" && (
              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Center GPS:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyGPS(activeBarangayCircuit.coords, `Center of ${activeBarangayCircuit.name}`)}
                      className="font-mono text-cyan-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      title="Click to copy GPS"
                    >
                      <span>{formatGPS(activeBarangayCircuit.coords)}</span>
                      <Copy size={11} />
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Street:</span>
                    <strong className="text-white text-right">{activeBarangayCircuit.mainRoad}</strong>
                  </div>
                  {activeBarangayCircuit.bordersWith && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bordering LGU:</span>
                      <strong className="text-amber-400 text-right">{activeBarangayCircuit.bordersWith}</strong>
                    </div>
                  )}
                  {activeBarangayCircuit.landmark && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Key Landmark:</span>
                      <strong className="text-white text-right truncate max-w-[210px]">{activeBarangayCircuit.landmark}</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Google Maps:</span>
                    <a
                      href={`https://www.google.com/maps?q=${activeBarangayCircuit.coords[0]},${activeBarangayCircuit.coords[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Open Location</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleReturnToCityView}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer text-center"
                  >
                    City Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenBoothModal(null, activeBarangayCircuit)}
                    className="flex-1 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition cursor-pointer text-center shadow-md shadow-cyan-900/30 flex items-center justify-center gap-1.5"
                    title={`Tag a Booth in ${activeBarangayCircuit.name}`}
                  >
                    <Plus size={13} />
                    <span>Tag Booth</span>
                  </button>
                </div>
              </div>
            )}

            {brgyInspectorTab === "booths" && (
              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
                  <span className="text-[10px] font-bold text-amber-400">
                    {activeBarangayTaggedBooths.length} Yellow Booths in {activeBarangayCircuit.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenBoothModal(null, activeBarangayCircuit)}
                    className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={11} />
                    <span>Tag Booth</span>
                  </button>
                </div>

                {activeBarangayTaggedBooths.length > 0 ? (
                  activeBarangayTaggedBooths.map((booth) => (
                    <div
                      key={booth.id}
                      className="p-2 rounded-xl bg-slate-950 border border-amber-900/40 hover:border-amber-500/80 transition space-y-1"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-2">
                          <KioskIconSvg width={24} height={32} className="shrink-0 drop-shadow-md" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                #{booth.name || "001"}
                              </span>
                              <h4 className="font-bold text-white text-xs leading-tight">
                                Booth {booth.name || "001"}
                              </h4>
                            </div>
                            <p className="text-[10px] text-amber-300 font-semibold mt-0.5">
                              📍 {booth.address}
                            </p>
                            {booth.tellerName && (
                              <p className="text-[9px] text-slate-400">Teller: {booth.tellerName}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyGPS(booth.coords, booth.name)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copy GPS"
                          >
                            <Copy size={11} />
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${booth.coords[0]},${booth.coords[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-blue-600/30 hover:bg-blue-500 text-blue-200 hover:text-white transition cursor-pointer"
                            title="Proceed to Google Maps"
                          >
                            <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFocusPOI(booth.coords)}
                            className="px-1.5 py-0.5 rounded-lg bg-amber-600/30 hover:bg-amber-500 text-amber-200 hover:text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            Focus
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (measuringSourceKiosk && String(measuringSourceKiosk.id) !== String(booth.id)) {
                                handleCompleteMeasurement(measuringSourceKiosk, booth);
                              } else {
                                startMeasuringFromKiosk(booth);
                                handleFocusPOI(booth.coords);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${measuringSourceKiosk?.id === booth.id
                                ? "bg-teal-500 text-white shadow-md animate-pulse"
                                : "bg-teal-600/30 hover:bg-teal-500 text-teal-200 hover:text-white"
                              }`}
                            title="Measure distance from this kiosk"
                          >
                            <Ruler size={10} />
                            <span>{measuringSourceKiosk?.id === booth.id ? "Point A" : "Measure"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditUserBooth(booth)}
                            className="p-1 rounded-md bg-cyan-950/60 hover:bg-cyan-600 text-cyan-300 hover:text-white transition cursor-pointer"
                            title="Edit Booth"
                          >
                            <Sliders size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded-md font-mono text-[9px] text-amber-300 font-bold">
                        <span>GPS: {formatGPS(booth.coords)}</span>
                        <span className="text-[8.5px] text-amber-400 font-sans">✓ Verified</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs space-y-1.5">
                    <p>No booths tagged in Brgy. {activeBarangayCircuit.name} yet.</p>
                    <button
                      type="button"
                      onClick={() => handleOpenBoothModal(null, activeBarangayCircuit)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={12} />
                      <span>Tag Booth in {activeBarangayCircuit.name}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {brgyInspectorTab === "terminals" && (
              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                {activeBarangayData?.terminals?.length > 0 ? (
                  activeBarangayData.terminals.map((term) => (
                    <div
                      key={term.id}
                      className="p-2 rounded-xl bg-slate-950 border border-amber-900/40 hover:border-amber-500/80 transition space-y-1"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400">🚌</span>
                            <h4 className="font-bold text-white text-xs leading-tight">{term.name}</h4>
                          </div>
                          <span className="text-[9.5px] text-amber-300/80 font-semibold">{term.type}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyGPS(term.coords, term.name)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copy GPS Coordinates"
                          >
                            <Copy size={11} />
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${term.coords[0]},${term.coords[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-blue-600/30 hover:bg-blue-500 text-blue-200 hover:text-white transition cursor-pointer"
                            title="Proceed to Google Maps"
                          >
                            <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFocusPOI(term.coords)}
                            className="px-2 py-0.5 rounded-lg bg-amber-600/30 hover:bg-amber-500 text-amber-200 hover:text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            Focus
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md font-mono text-[10px] text-amber-300 font-bold">
                        <span>📍 GPS:</span>
                        <span>{formatGPS(term.coords)}</span>
                      </div>

                      <p className="text-[10px] text-slate-400">📍 {term.address}</p>
                      <div className="text-[9.5px] text-slate-300 bg-slate-900/80 p-1 rounded border border-slate-800 space-y-0.5">
                        <div><strong>Routes:</strong> {term.routes}</div>
                        <div><strong>Hours:</strong> {term.operatingHours} • <strong>Capacity:</strong> {term.capacity}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                    No registered public transit terminal inside this specific barangay polygon.
                  </div>
                )}
              </div>
            )}

            {brgyInspectorTab === "factories" && (
              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                {activeBarangayData?.factories?.length > 0 ? (
                  activeBarangayData.factories.map((fact) => (
                    <div
                      key={fact.id}
                      className="p-2 rounded-xl bg-slate-950 border border-orange-900/40 hover:border-orange-500/80 transition space-y-1"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-orange-400">🏭</span>
                            <h4 className="font-bold text-white text-xs leading-tight">{fact.name}</h4>
                          </div>
                          <span className="text-[9.5px] text-orange-300/80 font-semibold">{fact.category}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyGPS(fact.coords, fact.name)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copy GPS Coordinates"
                          >
                            <Copy size={11} />
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${fact.coords[0]},${fact.coords[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-blue-600/30 hover:bg-blue-500 text-blue-200 hover:text-white transition cursor-pointer"
                            title="Proceed to Google Maps"
                          >
                            <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFocusPOI(fact.coords)}
                            className="px-2 py-0.5 rounded-lg bg-orange-600/30 hover:bg-orange-500 text-orange-200 hover:text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            Focus
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-md font-mono text-[10px] text-orange-300 font-bold">
                        <span>📍 GPS:</span>
                        <span>{formatGPS(fact.coords)}</span>
                      </div>

                      <p className="text-[10px] text-slate-400">📍 {fact.address}</p>
                      <div className="text-[9.5px] text-slate-300 bg-slate-900/80 p-1 rounded border border-slate-800 space-y-0.5">
                        <div><strong>Workforce:</strong> {fact.workforceSize}</div>
                        <div><strong>Products:</strong> {fact.products}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                    No major industrial manufacturing plant inside this residential/commercial zone.
                  </div>
                )}
              </div>
            )}

            
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 shrink-0">
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCityInspectorTab("waypoint")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${cityInspectorTab === "waypoint"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  City Circuit
                </button>
                <button
                  type="button"
                  onClick={() => setCityInspectorTab("tagged_agents")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${cityInspectorTab === "tagged_agents"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <MapPin size={12} className={cityInspectorTab === "tagged_agents" ? "text-white" : "text-emerald-400"} />
                  <span>Tagged Booths ({territoryTaggedBooths.length})</span>
                </button>
              </div>
            </div>

            {cityInspectorTab === "waypoint" ? (
              <>
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-block mb-0.5">
                      Sector Checkpoint {selectedEdgeBarangay.step} of {activeCheckpoints.length}
                    </span>
                    <h3 className="text-base font-black text-white leading-tight">
                      {selectedEdgeBarangay.name}
                    </h3>
                    <p className="text-[10.5px] text-emerald-400 font-bold mt-0.5">
                      {selectedEdgeBarangay.edgeSector}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Operator</span>
                    <span className="text-xs font-mono font-black text-emerald-400">
                      {TERRITORY_CONFIG[selectedTerritory]?.short || "Lucky Betplay"}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Waypoint GPS:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyGPS(selectedEdgeBarangay.coords, selectedEdgeBarangay.name)}
                      className="font-mono text-emerald-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      title="Click to copy GPS"
                    >
                      <span>{formatGPS(selectedEdgeBarangay.coords)}</span>
                      <Copy size={11} />
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Highway:</span>
                    <strong className="text-white text-right">{selectedEdgeBarangay.mainRoad}</strong>
                  </div>
                  {selectedEdgeBarangay.bordersWith && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bordering LGU:</span>
                      <strong className="text-rose-400 text-right">{selectedEdgeBarangay.bordersWith}</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Sector Boundary:</span>
                    <span className="font-bold text-cyan-400">Brgy. {selectedEdgeBarangay.name}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Google Maps:</span>
                    <a
                      href={`https://www.google.com/maps?q=${selectedEdgeBarangay.coords[0]},${selectedEdgeBarangay.coords[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Open Location</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectBarangayPerimeter(selectedEdgeBarangay.id)}
                  className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-cyan-900/30"
                >
                  <Route size={13} />
                  <span>Inspect Sector {selectedEdgeBarangay.name}</span>
                </button>
              </>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[250px] pr-1">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
                  <span className="text-[10.5px] font-bold text-slate-400">
                    {territoryTaggedBooths.length} User-Tagged Booths &amp; Outlets
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenBoothModal()}
                    className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={11} />
                    <span>Tag Booth</span>
                  </button>
                </div>

                {territoryTaggedBooths.length > 0 ? (
                  territoryTaggedBooths.map((booth) => (
                    <div
                      key={booth.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-amber-900/40 hover:border-amber-500/80 transition space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-2">
                          <KioskIconSvg width={26} height={34} className="shrink-0 drop-shadow-md" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                #{booth.name || "001"}
                              </span>
                              <h4 className="font-bold text-white text-xs leading-tight">
                                Booth {booth.name || "001"}
                              </h4>
                            </div>
                            <p className="text-[10px] text-amber-300 font-semibold mt-0.5">
                              📍 {booth.address}
                            </p>
                            <p className="text-[9.5px] text-slate-400">
                              Brgy. {booth.barangayName} • {booth.tellerName ? `Teller: ${booth.tellerName}` : "Outlet Station"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyGPS(booth.coords, booth.name)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copy GPS"
                          >
                            <Copy size={11} />
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${booth.coords[0]},${booth.coords[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-blue-600/30 hover:bg-blue-500 text-blue-200 hover:text-white transition cursor-pointer"
                            title="Proceed to Google Maps"
                          >
                            <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFocusPOI(booth.coords)}
                            className="px-1.5 py-0.5 rounded-lg bg-amber-600/30 hover:bg-amber-500 text-amber-200 hover:text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            Focus
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (measuringSourceKiosk && String(measuringSourceKiosk.id) !== String(booth.id)) {
                                handleCompleteMeasurement(measuringSourceKiosk, booth);
                              } else {
                                startMeasuringFromKiosk(booth);
                                handleFocusPOI(booth.coords);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${measuringSourceKiosk?.id === booth.id
                                ? "bg-teal-500 text-white shadow-md animate-pulse"
                                : "bg-teal-600/30 hover:bg-teal-500 text-teal-200 hover:text-white"
                              }`}
                            title="Measure distance from this kiosk"
                          >
                            <Ruler size={10} />
                            <span>{measuringSourceKiosk?.id === booth.id ? "Point A" : "Measure"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditUserBooth(booth)}
                            className="p-1 rounded-md bg-cyan-950/60 hover:bg-cyan-600 text-cyan-300 hover:text-white transition cursor-pointer"
                            title="Edit Booth Details"
                          >
                            <Sliders size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUserBooth(booth.id)}
                            className="p-1 rounded-md bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
                            title="Remove Booth"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded-md font-mono text-[9.5px] text-amber-300 font-bold">
                        <span>GPS: {formatGPS(booth.coords)}</span>
                        <span className="text-[8.5px] text-amber-400 font-sans">✓ {booth.detectionConfidence}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs space-y-2">
                    <p>No booths tagged with coordinates yet.</p>
                    <button
                      type="button"
                      onClick={() => handleOpenBoothModal()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Tag First Booth</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      )}

      {isBoothModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl sm:max-w-3xl lg:max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-amber-500/20">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center p-1 shadow-inner shrink-0">
                  <KioskIconSvg width={28} height={36} className="drop-shadow" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <span>{editingBoothId ? "Edit Yellow Booth" : "Tag New Yellow Booth"}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      YELLOW KIOSK
                    </span>
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Input GPS coordinates, detect belonging barangay, and set booth address &amp; number
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBoothModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBoothModal} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-white flex items-center gap-1.5">
                    <Crosshair size={13} className="text-emerald-400" />
                    <span>GPS Coordinates (WGS-84)</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  {clickedPoint && (
                    <button
                      type="button"
                      onClick={() => {
                        const lat = clickedPoint.lat.toFixed(6);
                        const lng = clickedPoint.lng.toFixed(6);
                        setBoothFormData((prev) => ({ ...prev, latStr: lat, lngStr: lng }));
                        const detected = detectBarangayFromCoords(lat, lng);
                        setDetectedBarangayResult(detected);
                        if (detected && !boothFormData.address) {
                          setBoothFormData((prev) => ({ ...prev, address: detected.address || `Brgy. ${detected.name}` }));
                        }
                      }}
                      className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Use Clicked Map Pin ({clickedPoint.lat.toFixed(4)}, {clickedPoint.lng.toFixed(4)})</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Latitude (e.g. 10.344000)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={boothFormData.latStr}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, latStr: e.target.value }))}
                      placeholder="10.344000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Longitude (e.g. 123.938000)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={boothFormData.lngStr}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, lngStr: e.target.value }))}
                      placeholder="123.938000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleDetectBarangay}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-cyan-950/40"
                  >
                    <MapPinned size={14} />
                    <span>Detect Barangay from Coordinates</span>
                  </button>
                </div>

                {detectedBarangayResult && (
                  <div className={`p-3 rounded-xl border transition animate-in fade-in ${detectedBarangayResult.id === "outside"
                    ? "bg-rose-950/30 border-rose-800/60 text-rose-300"
                    : "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{detectedBarangayResult.id === "outside" ? "⚠️" : "📍"}</span>
                        <div>
                          <div className="text-xs font-black text-white">
                            {detectedBarangayResult.id === "outside" ? "Outside Operational Territory" : `Brgy. ${detectedBarangayResult.name}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {detectedBarangayResult.confidence}
                          </div>
                        </div>
                      </div>
                      {detectedBarangayResult.id !== "outside" && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          CONFIRMED BARANGAY
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {detectedBarangayResult.detail}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs font-black text-white flex items-center gap-1.5 mb-1">
                    <MapPin size={13} className="text-cyan-400" />
                    <span>Booth Address / Street Location</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={boothFormData.address}
                    onChange={(e) => setBoothFormData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder={`e.g. Near town center, ${TERRITORY_CONFIG[selectedTerritory]?.short || "Territory"}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Specify the street name, corner, building, or landmark for field operations and dispatch.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black text-white flex items-center gap-1.5 mb-1">
                    <span className="text-amber-400">🟡</span>
                    <span>Booth Number / Outlet Code (Displayed on Top of Booth)</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={boothFormData.name}
                    onChange={(e) => setBoothFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. 001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    This badge code (e.g. <strong>001</strong>) floats directly on top of your yellow booth on the map.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-white flex items-center gap-1.5">
                    <Users size={13} className="text-blue-400" />
                    <span>Assign Agent / Teller (1:1 Booth Ratio)</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {availableAgents.length} available
                  </span>
                </div>

                {selectedAgentObj ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-950 border border-blue-500/50 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 font-black text-sm shadow-sm">
                          {selectedAgentObj.fullName?.charAt(0) || "A"}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                            checkAgentIsActive(selectedAgentObj) ? "bg-emerald-400" : "bg-slate-500"
                          }`}
                        ></span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white flex items-center gap-2 truncate flex-wrap">
                          <span className="truncate">{selectedAgentObj.fullName}</span>
                          <span className="text-[10px] text-blue-400 font-mono shrink-0">@{selectedAgentObj.username}</span>
                          {checkAgentIsActive(selectedAgentObj) ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                              Inactive
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                            1:1 Assigned
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 truncate mt-0.5">
                          📍 {selectedAgentObj.outlet || "Outlet"} • Supervisor: {getSupervisorName(selectedAgentObj.supervisor, selectedAgentObj)}
                        </div>
                        {selectedAgentObj.contactNumber && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            📞 {selectedAgentObj.contactNumber}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsAgentDropdownOpen((v) => !v)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white text-[11px] font-bold transition cursor-pointer border border-slate-700"
                      >
                        {isAgentDropdownOpen ? "Close" : "Change Agent"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBoothFormData((prev) => ({
                            ...prev,
                            selectedAgentId: "",
                            tellerName: "",
                            supervisor: "",
                            contactNumber: ""
                          }));
                          setIsAgentDropdownOpen(false);
                          setAgentSearchQuery("");
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition cursor-pointer border border-slate-700"
                        title="Unassign Agent (Free up for other booths)"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      <span className="text-slate-300 font-bold">No agent assigned</span>
                      <span className="text-[10px] text-slate-500">(Generic Booth)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAgentDropdownOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-bold transition cursor-pointer border border-blue-500/40"
                    >
                      + Select Agent
                    </button>
                  </div>
                )}

                {(!selectedAgentObj || isAgentDropdownOpen) && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 mt-1">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={agentSearchQuery}
                        onChange={(e) => {
                          setAgentSearchQuery(e.target.value);
                          if (!isAgentDropdownOpen) setIsAgentDropdownOpen(true);
                        }}
                        onFocus={() => setIsAgentDropdownOpen(true)}
                        placeholder="Search agent by name, username, outlet, supervisor, or 'active'/'inactive'..."
                        className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
                      />
                      {agentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAgentSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAgentStatusFilter("all")}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer border ${
                            agentStatusFilter === "all"
                              ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          All ({availableAgents.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgentStatusFilter("active")}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                            agentStatusFilter === "active"
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                              : "bg-slate-900 text-emerald-400 border-slate-800 hover:text-emerald-300"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Active ({activeAgentsCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgentStatusFilter("inactive")}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                            agentStatusFilter === "inactive"
                              ? "bg-slate-700 text-white border-slate-600 shadow-sm"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                          <span>Inactive ({inactiveAgentsCount})</span>
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>
                          {agentSearchQuery.trim()
                            ? `Matching: ${filteredAvailableAgents.length}`
                            : `Available: ${filteredAvailableAgents.length}`}
                        </span>
                        <span className="text-emerald-400 font-bold">✓ 1-to-1</span>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      <button
                        type="button"
                        onClick={() => {
                          setBoothFormData((prev) => ({
                            ...prev,
                            selectedAgentId: "",
                            tellerName: "",
                            supervisor: "",
                            contactNumber: ""
                          }));
                          setIsAgentDropdownOpen(false);
                          setAgentSearchQuery("");
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                        <span>-- No specific agent (Generic Booth) --</span>
                      </button>

                      {filteredAvailableAgents.length > 0 ? (
                        filteredAvailableAgents.map((ag) => {
                          const isSelected = String(boothFormData.selectedAgentId) === String(ag.id);
                          const isActive = checkAgentIsActive(ag);
                          return (
                            <button
                              type="button"
                              key={ag.id}
                              onClick={() => {
                                setBoothFormData((prev) => ({
                                  ...prev,
                                  selectedAgentId: ag.id,
                                  tellerName: ag.fullName,
                                  supervisor: getSupervisorName(ag.supervisor, ag),
                                  contactNumber: ag.contactNumber || prev.contactNumber,
                                  address: prev.address || ag.address || "",
                                  name: prev.name || ag.outlet || `${ag.fullName} Station`
                                }));
                                setIsAgentDropdownOpen(false);
                                setAgentSearchQuery("");
                              }}
                              className={`w-full text-left p-2.5 sm:p-3 rounded-xl transition flex items-center justify-between gap-3 border cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600/25 border-blue-500 text-white shadow-sm"
                                  : "bg-slate-900/80 hover:bg-slate-900 border-slate-800/80 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative shrink-0">
                                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs shadow-sm">
                                    {ag.fullName?.charAt(0) || "A"}
                                  </div>
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                                      isActive ? "bg-emerald-400 ring-2 ring-emerald-500/30" : "bg-slate-500"
                                    }`}
                                  ></span>
                                </div>

                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-white flex items-center gap-2 truncate flex-wrap">
                                    <span className="truncate">{ag.fullName}</span>
                                    <span className="text-[10px] text-blue-400 font-mono">@{ag.username}</span>

                                    {isActive ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        Active
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                        Inactive
                                      </span>
                                    )}

                                    {isSelected && (
                                      <span className="px-1.5 py-0.2 rounded bg-blue-500 text-[9px] text-white font-bold shrink-0">
                                        Selected
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span>📍 {ag.outlet || "Outlet"}</span>
                                    <span className="text-slate-600">•</span>
                                    <span>Spvr: {getSupervisorName(ag.supervisor, ag)}</span>
                                    {ag.contactNumber && (
                                      <>
                                        <span className="text-slate-600">•</span>
                                        <span className="font-mono text-slate-400">📞 {ag.contactNumber}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Available (1:1)
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                          {availableAgents.length === 0
                            ? "All registered agents are currently assigned to other booths (1:1 full)."
                            : `No ${agentStatusFilter !== "all" ? agentStatusFilter : "unassigned"} agent found matching "${agentSearchQuery}".`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Teller Name</label>
                    <input
                      type="text"
                      value={boothFormData.tellerName}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, tellerName: e.target.value }))}
                      placeholder="Teller / Operator"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Supervisor</label>
                    <input
                      type="text"
                      value={boothFormData.supervisor}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, supervisor: e.target.value }))}
                      placeholder="Area Supervisor"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Contact Number</label>
                    <input
                      type="text"
                      value={boothFormData.contactNumber}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, contactNumber: e.target.value }))}
                      placeholder="0917-xxx-xxxx"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Operating Hours / Notes</label>
                    <input
                      type="text"
                      value={boothFormData.notes}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="8:00 AM - 9:00 PM Daily"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBoothModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
                >
                  <Check size={14} />
                  <span>Save &amp; Plot Yellow Booth on Map</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDistanceModalOpen && measuredPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-teal-500/50 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center shadow-lg shrink-0">
                  <Ruler size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Yesterday's Gross Performance ({getYesterdayDates().displayLabel})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Territory Proximity Analyzer
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white leading-tight">
                    Kiosk Distance &amp; Yesterday's Gross Sales
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDistanceModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close Modal (Keeps measurement line on map)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-teal-950/60 via-slate-900 to-slate-950 border border-teal-500/40 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-teal-400">
                      <Car size={13} className="text-teal-400" />
                      <span>Actual Road-Based Distance (Drivable Road Network)</span>
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                        {measuredPair.distanceMeters >= 1000
                          ? `${(measuredPair.distanceMeters / 1000).toFixed(2)} km`
                          : `${Math.round(measuredPair.distanceMeters)} meters`}
                      </span>
                      <span className="text-sm font-mono text-teal-300/80 font-bold">
                        ({Math.round(measuredPair.distanceMeters).toLocaleString()} m by road)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      From <strong>Booth {measuredPair.source?.name}</strong> (Brgy. {measuredPair.source?.barangayName}) to <strong>Booth {measuredPair.target?.name}</strong> (Brgy. {measuredPair.target?.barangayName})
                      {measuredPair.routingMethod && (
                        <span className="ml-2 text-[10px] text-teal-400/90 font-mono bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
                          Routing: {measuredPair.routingMethod}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 font-bold">🚶 Walking</div>
                      <div className="text-xs font-mono font-black text-white mt-0.5">
                        ~{Math.max(1, Math.round(measuredPair.distanceMeters / 80))} min
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 font-bold">🛵 Motorcycle</div>
                      <div className="text-xs font-mono font-black text-teal-300 mt-0.5">
                        ~{Math.max(1, Math.round(measuredPair.distanceMeters / 400))} min
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 font-bold">🚗 Driving</div>
                      <div className="text-xs font-mono font-black text-cyan-300 mt-0.5">
                        ~{Math.max(1, Math.round(measuredPair.distanceMeters / 300))} min
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-teal-900/40 flex items-center gap-2 text-xs">
                  {measuredPair.distanceMeters < 250 ? (
                    <div className="flex items-center gap-2 text-amber-300">
                      <AlertTriangle size={15} className="shrink-0" />
                      <span><strong>Spacing Alert:</strong> Less than 250m apart. Potential territory cannibalization of foot traffic between the two kiosks.</span>
                    </div>
                  ) : measuredPair.distanceMeters <= 1500 ? (
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 size={15} className="shrink-0" />
                      <span><strong>Ideal Territory Spacing:</strong> 250m to 1.5km separation — optimal strategic coverage for this sector.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sky-300">
                      <Info size={15} className="shrink-0" />
                      <span><strong>Wide Spacing:</strong> Greater than 1.5km separation — sufficient room between kiosks for potential additional placement if bettor volume is high.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const s = measuredPair.source;
                  const g = getBoothAgentGross(s);
                  return (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 flex flex-col justify-between gap-3 shadow-md">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>Source Kiosk (Point A)</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {s.id}
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-12 shrink-0">
                            <KioskIconSvg width={40} height={48} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white leading-tight">
                              Booth {s.name}
                            </h4>
                            <div className="text-xs text-emerald-400 font-bold mt-0.5">
                              Brgy. {s.barangayName || (TERRITORY_CONFIG[selectedTerritory]?.short || "Operating Area")}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              📍 {s.address || `Brgy. ${s.barangayName}`}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {formatGPS(s.coords)}
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            <span>Assigned Agent / Teller</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-emerald-300">
                              {g.agentStatus}
                            </span>
                          </div>
                          <div className="text-sm font-black text-white">
                            {g.agentName}
                          </div>
                          {g.agentUsername && (
                            <div className="text-xs text-cyan-400 font-mono">
                              @{g.agentUsername}
                            </div>
                          )}
                          <div className="text-xs text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-slate-400">Supervisor:</span>
                            <span className="font-bold text-white">{g.supervisor}</span>
                          </div>
                          <div className="text-xs text-slate-300 flex items-center justify-between">
                            <span className="text-slate-400">Contact:</span>
                            <span className="font-mono text-slate-200">{g.contactNumber}</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/50 shadow-inner">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                              <CircleDollarSign size={13} />
                              <span>Yesterday's Gross Sales</span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400">
                              {g.hasRecord ? "✓ Verified Draw" : (g.gross > 0 ? "Synced" : "₱0.00 / No Sales")}
                            </span>
                          </div>
                          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight mt-1">
                            {g.formatted}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Verified gross sales recorded for yesterday ({g.yesterdayDate})
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const t = measuredPair.target;
                  const g = getBoothAgentGross(t);
                  return (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-cyan-500/40 flex flex-col justify-between gap-3 shadow-md">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            <span>Destination Kiosk (Point B)</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {t.id}
                          </span>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-10 h-12 shrink-0">
                            <KioskIconSvg width={40} height={48} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white leading-tight">
                              Booth {t.name}
                            </h4>
                            <div className="text-xs text-cyan-400 font-bold mt-0.5">
                              Brgy. {t.barangayName || (TERRITORY_CONFIG[selectedTerritory]?.short || "Operating Area")}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              📍 {t.address || `Brgy. ${t.barangayName}`}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {formatGPS(t.coords)}
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            <span>Assigned Agent / Teller</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-cyan-300">
                              {g.agentStatus}
                            </span>
                          </div>
                          <div className="text-sm font-black text-white">
                            {g.agentName}
                          </div>
                          {g.agentUsername && (
                            <div className="text-xs text-cyan-400 font-mono">
                              @{g.agentUsername}
                            </div>
                          )}
                          <div className="text-xs text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-slate-400">Supervisor:</span>
                            <span className="font-bold text-white">{g.supervisor}</span>
                          </div>
                          <div className="text-xs text-slate-300 flex items-center justify-between">
                            <span className="text-slate-400">Contact:</span>
                            <span className="font-mono text-slate-200">{g.contactNumber}</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/80 to-slate-900 border border-cyan-500/50 shadow-inner">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                              <CircleDollarSign size={13} />
                              <span>Yesterday's Gross Sales</span>
                            </span>
                            <span className="text-[10px] font-bold text-cyan-400">
                              {g.hasRecord ? "✓ Verified Draw" : (g.gross > 0 ? "Synced" : "₱0.00 / No Sales")}
                            </span>
                          </div>
                          <div className="text-2xl font-black text-cyan-400 font-mono tracking-tight mt-1">
                            {g.formatted}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Verified gross sales recorded for yesterday ({g.yesterdayDate})
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {(() => {
                const sGross = getBoothAgentGross(measuredPair.source).gross;
                const tGross = getBoothAgentGross(measuredPair.target).gross;
                const combinedGross = sGross + tGross;
                const grossDiff = Math.abs(sGross - tGross);
                const formatCur = (n) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

                return (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-900/60">
                      <div className="text-[10px] font-black uppercase text-slate-400">Combined Yesterday's Gross</div>
                      <div className="text-lg font-black text-emerald-400 font-mono mt-1">{formatCur(combinedGross)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60">
                      <div className="text-[10px] font-black uppercase text-slate-400">Yesterday's Sales Variance</div>
                      <div className="text-lg font-black text-amber-300 font-mono mt-1">{formatCur(grossDiff)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60">
                      <div className="text-[10px] font-black uppercase text-slate-400">Average Yesterday's Gross</div>
                      <div className="text-lg font-black text-cyan-300 font-mono mt-1">{formatCur(combinedGross / 2)}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${measuredPair.source?.coords?.[0]},${measuredPair.source?.coords?.[1]}&destination=${measuredPair.target?.coords?.[0]},${measuredPair.target?.coords?.[1]}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <span>Google Maps Route</span>
                <span>↗</span>
              </a>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleClearMeasurement();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 font-bold text-xs transition cursor-pointer border border-slate-700"
                >
                  Clear Line
                </button>
                <button
                  type="button"
                  onClick={() => setIsDistanceModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-teal-950/40"
                >
                  <span>View on Map</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
        </>
      )}
    </div>
  );
}
