/**
 * areaApiConfigStorage.js
 * Multi-Area & Multi-Entity API Configuration and Health Storage Service for HRHub.
 * 
 * Supports dynamic registration of Areas / Entities for Gross Report, Active Tellers,
 * Supervisors, and Live Bets streaming.
 */

import { supabase } from "./supabase";
import { API_CONFIG } from "../config/apiConfig";

export const AREA_CONFIGS_STORAGE_KEY = "hrhub_area_api_configs";
export const SELECTED_AREA_STORAGE_KEY = "hrhub_selected_gross_area_id";
export const AREA_CONFIGS_TABLE = "user_settings";
export const AREA_CONFIGS_USER_ID = "hrhub_area_api_configs";

// Pre-seeded default Area: Lucky Betplay Corporation (Mandaue City)
export const DEFAULT_AREAS = [
  {
    id: "lucky_betplay_mandaue",
    areaName: "Mandaue City",
    companyName: "Lucky Betplay Corporation",
    accountantId: "2",
    grossReportUrl: API_CONFIG.GROSS_REPORT_URL || "https://stl-mandaue-api.com/api/accountant/TellerGrossPerDateRange?id=2",
    grossReportToken: API_CONFIG.GROSS_REPORT_TOKEN || "7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V",
    activeTellersUrl: API_CONFIG.ACTIVE_TELLERS_URL || "https://stl-mandaue-api.com/api/accountant/ActiveTellers?id=2",
    activeTellersToken: API_CONFIG.GROSS_REPORT_TOKEN || "7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V",
    supervisorUrl: API_CONFIG.SUPERVISOR_URL || "https://stl-mandaue-api.com/api/accountant/supervisor?id=2",
    supervisorToken: API_CONFIG.GROSS_REPORT_TOKEN || "7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V",
    backupTellersUrl: API_CONFIG.AGENTS_URL || "https://stl-mandaue-api.com/api/accountant/teller?id=2",
    backupTellersToken: API_CONFIG.AGENTS_TOKEN || "7192|gnpqBM4WSclB34C1IUcuV7KQFK4uxPUO2B9fdwoI",
    tellerBetUrl: API_CONFIG.TELLER_BET_URL || "https://stl-mandaue-api.com/api/teller/bet",
    tellerBetToken: API_CONFIG.TELLER_BET_TOKEN || "7770|buTtUAGup02YXYefPfDwwh44wp0AOnRQuxsPHZ2f",
    isDefault: true,
    isActive: true,
    description: "Official Authorized Agent Corporation (AAC Mandaue City, Cebu)",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-27T00:00:00.000Z"
  }
];

let memoryAreaConfigs = null;

/**
 * Get all configured Areas synchronously (from cache or localStorage)
 */
export function getAreaConfigs() {
  if (memoryAreaConfigs && Array.isArray(memoryAreaConfigs) && memoryAreaConfigs.length > 0) {
    return memoryAreaConfigs;
  }

  try {
    const raw = localStorage.getItem(AREA_CONFIGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryAreaConfigs = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Error reading area configs from localStorage:", err);
  }

  memoryAreaConfigs = [...DEFAULT_AREAS];
  try {
    localStorage.setItem(AREA_CONFIGS_STORAGE_KEY, JSON.stringify(memoryAreaConfigs));
  } catch {}
  return memoryAreaConfigs;
}

/**
 * Get active area configuration by ID
 */
export function getAreaConfigById(id) {
  const configs = getAreaConfigs();
  const found = configs.find((c) => c.id === id);
  return found || configs[0] || DEFAULT_AREAS[0];
}

/**
 * Get currently selected Area ID for Gross Report
 */
export function getSelectedAreaId() {
  try {
    const saved = localStorage.getItem(SELECTED_AREA_STORAGE_KEY);
    const configs = getAreaConfigs();
    if (saved && configs.some((c) => c.id === saved)) {
      return saved;
    }
  } catch {}
  return getAreaConfigs()[0]?.id || DEFAULT_AREAS[0].id;
}

/**
 * Set selected Area ID for Gross Report
 */
export function setSelectedAreaId(id) {
  try {
    localStorage.setItem(SELECTED_AREA_STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent("hrhub_selected_area_changed", { detail: { id } }));
  } catch {}
}

/**
 * Save area configs to localStorage, dispatch update event, and sync to Supabase
 */
export async function saveAreaConfigs(configs) {
  if (!Array.isArray(configs)) return;
  memoryAreaConfigs = configs;

  try {
    localStorage.setItem(AREA_CONFIGS_STORAGE_KEY, JSON.stringify(configs));
  } catch (err) {
    console.warn("Error saving area configs to localStorage:", err);
  }

  // Notify components immediately
  try {
    window.dispatchEvent(new CustomEvent("hrhub_area_configs_updated", { detail: configs }));
  } catch {}

  // Sync to Supabase user_settings
  if (supabase) {
    try {
      await supabase.from(AREA_CONFIGS_TABLE).upsert({
        user_id: AREA_CONFIGS_USER_ID,
        settings_json: { areas: configs, lastUpdated: new Date().toISOString() },
        updated_at: new Date().toISOString()
      });
    } catch (sbErr) {
      console.warn("Supabase area configs sync note:", sbErr);
    }
  }
}

/**
 * Load area configs from Supabase cloud database
 */
/**
 * Sanitize area configuration item (trim all strings, auto-fill tokens, auto-detect accountantId)
 */
export function sanitizeAreaItem(item) {
  if (!item || typeof item !== "object") return item;

  const grossReportUrl = String(item.grossReportUrl || "").trim();
  let accountantId = String(item.accountantId || "").trim();

  // If accountantId is blank or unset, try to extract from grossReportUrl or activeTellersUrl
  if (!accountantId || accountantId === "2") {
    try {
      const u = new URL(grossReportUrl);
      if (u.searchParams.has("id")) {
        accountantId = u.searchParams.get("id");
      }
    } catch {}
  }

  const grossToken = String(item.grossReportToken || "").trim();

  return {
    ...item,
    areaName: String(item.areaName || "").trim(),
    companyName: String(item.companyName || "Lucky Betplay Corporation").trim(),
    accountantId: accountantId || "2",
    grossReportUrl,
    grossReportToken: grossToken,
    activeTellersUrl: String(item.activeTellersUrl || "").trim(),
    activeTellersToken: String(item.activeTellersToken || "").trim() || grossToken,
    supervisorUrl: String(item.supervisorUrl || "").trim(),
    supervisorToken: String(item.supervisorToken || "").trim() || grossToken,
    backupTellersUrl: String(item.backupTellersUrl || "").trim(),
    backupTellersToken: String(item.backupTellersToken || "").trim() || grossToken,
    tellerBetUrl: String(item.tellerBetUrl || "").trim(),
    tellerBetToken: String(item.tellerBetToken || "").trim() || grossToken,
    description: String(item.description || "").trim()
  };
}

/**
 * Load area configs from Supabase cloud database
 */
export async function loadAreaConfigsFromCloud() {
  if (!supabase) return getAreaConfigs();

  try {
    // Use .limit(1) instead of .single() to avoid PostgREST 406 Not Acceptable status
    const { data, error } = await supabase
      .from(AREA_CONFIGS_TABLE)
      .select("settings_json")
      .eq("user_id", AREA_CONFIGS_USER_ID)
      .limit(1);

    const record = Array.isArray(data) ? data[0] : data;

    if (!error && record?.settings_json?.areas && Array.isArray(record.settings_json.areas)) {
      const cloudAreas = record.settings_json.areas.map(sanitizeAreaItem);
      if (cloudAreas.length > 0) {
        memoryAreaConfigs = cloudAreas;
        try {
          localStorage.setItem(AREA_CONFIGS_STORAGE_KEY, JSON.stringify(cloudAreas));
        } catch {}
        window.dispatchEvent(new CustomEvent("hrhub_area_configs_updated", { detail: cloudAreas }));
        return cloudAreas;
      }
    }

    // If no record exists yet in Supabase, seed it seamlessly
    if (!record && !error) {
      saveAreaConfigs(getAreaConfigs());
    }
  } catch (err) {
    console.warn("Error loading area configs from cloud:", err);
  }

  return getAreaConfigs();
}

/**
 * Add a new Area configuration
 */
export async function addAreaConfig(newArea) {
  const configs = getAreaConfigs();
  const id = newArea.id || `area_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const sanitized = sanitizeAreaItem(newArea);
  const item = {
    ...sanitized,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const updated = [...configs, item];
  await saveAreaConfigs(updated);
  return item;
}

/**
 * Update an existing Area configuration
 */
export async function updateAreaConfig(id, updates) {
  const configs = getAreaConfigs();
  const index = configs.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const sanitizedUpdates = sanitizeAreaItem(updates);
  const updatedItem = {
    ...configs[index],
    ...sanitizedUpdates,
    updatedAt: new Date().toISOString()
  };

  const updatedList = [...configs];
  updatedList[index] = updatedItem;
  await saveAreaConfigs(updatedList);
  return updatedItem;
}

/**
 * Delete an Area configuration (prevents deletion if it's the only one)
 */
export async function deleteAreaConfig(id) {
  const configs = getAreaConfigs();
  if (configs.length <= 1) {
    throw new Error("Cannot delete the only remaining Area configuration.");
  }

  const updated = configs.filter((c) => c.id !== id);
  await saveAreaConfigs(updated);

  // If deleted area was active, reset active to the first available area
  if (getSelectedAreaId() === id) {
    setSelectedAreaId(updated[0].id);
  }

  return updated;
}

/**
 * Normalizes test URLs so required backend parameters (like 'from', 'to', and 'tellerId')
 * are present, preventing backend server 500 errors (e.g. Laravel 'Undefined array key from').
 */
export function prepareTestUrl(rawUrl, accountantId = null) {
  if (!rawUrl) return "";
  try {
    const trimmed = String(rawUrl).trim();
    const u = new URL(trimmed);
    if (accountantId && !u.searchParams.has("id")) {
      u.searchParams.set("id", String(accountantId));
    }
    const lowerPath = u.pathname.toLowerCase();
    const lowerHref = u.href.toLowerCase();
    // TellerGrossPerDateRange strictly requires 'from' and 'to'
    if (lowerPath.includes("tellergrossperdaterange") || lowerHref.includes("tellergrossperdaterange")) {
      const today = new Date().toISOString().slice(0, 10);
      if (!u.searchParams.has("from")) u.searchParams.set("from", today);
      if (!u.searchParams.has("to")) u.searchParams.set("to", today);
    }
    // /api/teller/bet requires tellerId
    if (lowerPath.includes("/teller/bet") && !u.searchParams.has("tellerId")) {
      u.searchParams.set("tellerId", "1");
    }
    return u.toString();
  } catch {
    return String(rawUrl).trim();
  }
}

/**
 * Test Endpoint Health / Latency
 */
export async function testEndpointHealth({ url, token, method = "GET", timeoutMs = 8000, accountantId = null }) {
  const preparedUrl = prepareTestUrl(url, accountantId);
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(preparedUrl, {
      method,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - start);

    let sampleCount = null;
    try {
      const data = await res.json();
      if (Array.isArray(data)) sampleCount = data.length;
      else if (Array.isArray(data?.data)) sampleCount = data.data.length;
    } catch {}

    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText || (res.ok ? "OK" : `HTTP ${res.status}`),
      durationMs: duration,
      sampleCount,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const duration = Math.round(performance.now() - start);
    return {
      ok: false,
      status: err.name === "AbortError" ? 408 : 0,
      statusText: err.name === "AbortError" ? "Request Timeout" : err.message || "Network Error",
      durationMs: duration,
      timestamp: new Date().toISOString()
    };
  }
}
