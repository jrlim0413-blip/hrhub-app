
import { supabase } from "./supabase";
import { API_CONFIG } from "../config/apiConfig";
import { proxyFetch } from "./serverlessProxyService";

export const AREA_CONFIGS_STORAGE_KEY = "hrhub_area_api_configs";
export const SELECTED_AREA_STORAGE_KEY = "hrhub_selected_gross_area_id";
export const AREA_CONFIGS_TABLE = "user_settings";
export const AREA_CONFIGS_USER_ID = "hrhub_area_api_configs";

export const DEFAULT_AREAS = [
  {
    id: "lucky_betplay_mandaue",
    areaName: "Mandaue City",
    companyName: "Lucky Betplay Corporation",
    accountantId: "2",
    grossReportUrl: "https://stl-mandaue-api.com/api/accountant/TellerGrossPerDateRange?id=2",
    grossReportToken: "7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V",
    activeTellersUrl: "https://stl-mandaue-api.com/api/accountant/ActiveTellers?id=2",
    activeTellersToken: "7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V",
    supervisorUrl: "https://stl-mandaue-api.com/api/accountant/supervisor?id=2",
    supervisorToken: "7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V",
    backupTellersUrl: "https://stl-mandaue-api.com/api/accountant/teller?id=2",
    backupTellersToken: "7192|gnpqBM4WSclB34C1IUcuV7KQFK4uxPUO2B9fdwoI",
    tellerBetUrl: "https://stl-mandaue-api.com/api/teller/bet",
    tellerBetToken: "7770|buTtUAGup02YXYefPfDwwh44wp0AOnRQuxsPHZ2f",
    isDefault: true,
    isActive: true,
    description: "Official Authorized Agent Corporation (AAC Mandaue City, Cebu)",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-27T00:00:00.000Z"
  },
  {
    id: "area_1793090489281_r3s8",
    areaName: "Iligan City",
    companyName: "Glowing Fortune OPC",
    accountantId: "5",
    grossReportUrl: "https://stl-ldn-api.com/api/accountant/TellerGrossPerDateRange?id=5",
    grossReportToken: "78280|VP0eyD5PnBtmWhMRJyjeBARiKuSc0TuLomS9BhRY",
    activeTellersUrl: "https://stl-ldn-api.com/api/accountant/ActiveTellers?id=5",
    activeTellersToken: "78280|VP0eyD5PnBtmWhMRJyjeBARiKuSc0TuLomS9BhRY",
    supervisorUrl: "https://stl-ldn-api.com/api/accountant/supervisor?id=5",
    supervisorToken: "78280|VP0eyD5PnBtmWhMRJyjeBARiKuSc0TuLomS9BhRY",
    backupTellersUrl: "",
    backupTellersToken: "78280|VP0eyD5PnBtmWhMRJyjeBARiKuSc0TuLomS9BhRY",
    tellerBetUrl: "https://stl-ldn-api.com/api/teller/bet",
    tellerBetToken: "78280|VP0eyD5PnBtmWhMRJyjeBARiKuSc0TuLomS9BhRY",
    isDefault: false,
    isActive: true,
    description: "Official Authorized Agent Corporation (AAC Iligan City, Lanao)",
    createdAt: "2026-10-27T08:41:29.282Z",
    updatedAt: "2026-10-27T08:41:29.282Z"
  },
  {
    id: "area_1793113019415_sw9h",
    areaName: "Lanao",
    companyName: "Glowing Fortune OPC",
    accountantId: "2",
    grossReportUrl: "https://stl-ldn-api.com/api/accountant/TellerGrossPerDateRange?id=2",
    grossReportToken: "78346|hZiKkKMOCpwGsvHemo3DrqhDLwYH1ggRCUOGoPB7",
    activeTellersUrl: "https://stl-ldn-api.com/api/accountant/ActiveTellers?id=2",
    activeTellersToken: "78346|hZiKkKMOCpwGsvHemo3DrqhDLwYH1ggRCUOGoPB7",
    supervisorUrl: "https://stl-ldn-api.com/api/accountant/supervisor?id=2",
    supervisorToken: "78346|hZiKkKMOCpwGsvHemo3DrqhDLwYH1ggRCUOGoPB7",
    backupTellersUrl: "",
    backupTellersToken: "78346|hZiKkKMOCpwGsvHemo3DrqhDLwYH1ggRCUOGoPB7",
    tellerBetUrl: "https://stl-ldn-api.com/api/teller/bet",
    tellerBetToken: "78346|hZiKkKMOCpwGsvHemo3DrqhDLwYH1ggRCUOGoPB7",
    isDefault: false,
    isActive: true,
    description: "Official Authorized Agent Corporation (Lanao Branch)",
    createdAt: "2026-10-27T14:56:59.415Z",
    updatedAt: "2026-10-27T14:59:19.764Z"
  },
  {
    id: "area_1793113545845_y89x",
    areaName: "Baloi",
    companyName: "Glowing Fortune OPC",
    accountantId: "6",
    grossReportUrl: "https://stl-ldn-api.com/api/accountant/TellerGrossPerDateRange?id=6",
    grossReportToken: "78347|hWYuslwEKi7jX66EpYYXGYqlQQlrcoLV5G6xfvxf",
    activeTellersUrl: "https://stl-ldn-api.com/api/accountant/ActiveTellers?id=6",
    activeTellersToken: "78347|hWYuslwEKi7jX66EpYYXGYqlQQlrcoLV5G6xfvxf",
    supervisorUrl: "https://stl-ldn-api.com/api/accountant/supervisor?id=6",
    supervisorToken: "78347|hWYuslwEKi7jX66EpYYXGYqlQQlrcoLV5G6xfvxf",
    backupTellersUrl: "",
    backupTellersToken: "78347|hWYuslwEKi7jX66EpYYXGYqlQQlrcoLV5G6xfvxf",
    tellerBetUrl: "https://stl-ldn-api.com/api/teller/bet",
    tellerBetToken: "78347|hWYuslwEKi7jX66EpYYXGYqlQQlrcoLV5G6xfvxf",
    isDefault: false,
    isActive: true,
    description: "Official Authorized Agent Corporation (Baloi Branch)",
    createdAt: "2026-10-27T15:05:45.845Z",
    updatedAt: "2026-10-27T15:07:40.698Z"
  },
  {
    id: "area_1793114244084_wn5z",
    areaName: "Set-B",
    companyName: "Glowing Fortune OPC",
    accountantId: "7",
    grossReportUrl: "https://stl-ldn-api.com/api/accountant/TellerGrossPerDateRange?id=7",
    grossReportToken: "78349|EdqCwderqzPUVCR3oT63dJ5fFwwwVR12HAL3BwTI",
    activeTellersUrl: "https://stl-ldn-api.com/api/accountant/ActiveTellers?id=7",
    activeTellersToken: "78349|EdqCwderqzPUVCR3oT63dJ5fFwwwVR12HAL3BwTI",
    supervisorUrl: "https://stl-ldn-api.com/api/accountant/supervisor?id=7",
    supervisorToken: "78349|EdqCwderqzPUVCR3oT63dJ5fFwwwVR12HAL3BwTI",
    backupTellersUrl: "",
    backupTellersToken: "78349|EdqCwderqzPUVCR3oT63dJ5fFwwwVR12HAL3BwTI",
    tellerBetUrl: "https://stl-ldn-api.com/api/teller/bet",
    tellerBetToken: "78349|EdqCwderqzPUVCR3oT63dJ5fFwwwVR12HAL3BwTI",
    isDefault: false,
    isActive: true,
    description: "Official Authorized Agent Corporation (AAC Set-B Branch)",
    createdAt: "2026-10-27T15:17:24.084Z",
    updatedAt: "2026-10-27T15:56:19.319Z"
  },
  {
    id: "area_1793114932220_sn9n",
    areaName: "Maguindanao",
    companyName: "5A Royal Gaming OPC",
    accountantId: "2",
    grossReportUrl: "https://stl-mag-api.com/api/accountant/TellerGrossPerDateRange?id=2",
    grossReportToken: "163030|CfjCrLgC5TqcbhQ2fxpfuDk2NcAJddWwQbBQ2JVa",
    activeTellersUrl: "https://stl-mag-api.com/api/accountant/ActiveTellers?id=2",
    activeTellersToken: "163030|CfjCrLgC5TqcbhQ2fxpfuDk2NcAJddWwQbBQ2JVa",
    supervisorUrl: "https://stl-mag-api.com/api/accountant/supervisor?id=2",
    supervisorToken: "163030|CfjCrLgC5TqcbhQ2fxpfuDk2NcAJddWwQbBQ2JVa",
    backupTellersUrl: "",
    backupTellersToken: "163030|CfjCrLgC5TqcbhQ2fxpfuDk2NcAJddWwQbBQ2JVa",
    tellerBetUrl: "https://stl-mag-api.com/api/teller/bet",
    tellerBetToken: "163030|CfjCrLgC5TqcbhQ2fxpfuDk2NcAJddWwQbBQ2JVa",
    isDefault: false,
    isActive: true,
    description: "Official Authorized Agent Corporation (AAC Maguindanao Province)",
    createdAt: "2026-10-27T15:28:52.220Z",
    updatedAt: "2026-10-27T16:00:02.373Z"
  },
  {
    id: "area_1793116008221_1ppr",
    areaName: "Cotabato City",
    companyName: "Imperial Gaming OPC",
    accountantId: "2",
    grossReportUrl: "https://stl-cotabato-api.com/api/accountant/TellerGrossPerDateRange?id=2",
    grossReportToken: "64226|7T80ImEj6Ql1XUAhNhAyPxxqBJWd4oOPh2wKE8td",
    activeTellersUrl: "https://stl-cotabato-api.com/api/accountant/ActiveTellers?id=2",
    activeTellersToken: "64226|7T80ImEj6Ql1XUAhNhAyPxxqBJWd4oOPh2wKE8td",
    supervisorUrl: "https://stl-cotabato-api.com/api/accountant/supervisor?id=2",
    supervisorToken: "64226|7T80ImEj6Ql1XUAhNhAyPxxqBJWd4oOPh2wKE8td",
    backupTellersUrl: "",
    backupTellersToken: "64226|7T80ImEj6Ql1XUAhNhAyPxxqBJWd4oOPh2wKE8td",
    tellerBetUrl: "https://stl-cotabato-api.com/api/teller/bet",
    tellerBetToken: "64226|7T80ImEj6Ql1XUAhNhAyPxxqBJWd4oOPh2wKE8td",
    isDefault: false,
    isActive: true,
    description: "Official Authorized Agent Corporation (AAC Cotabato City)",
    createdAt: "2026-10-27T15:46:48.221Z",
    updatedAt: "2026-10-27T15:49:55.152Z"
  }
];

let memoryAreaConfigs = null;

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

export function getAreaConfigById(id) {
  const configs = getAreaConfigs();
  const found = configs.find((c) => c.id === id);
  return found || configs[0] || DEFAULT_AREAS[0];
}

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

export function setSelectedAreaId(id) {
  try {
    localStorage.setItem(SELECTED_AREA_STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent("hrhub_selected_area_changed", { detail: { id } }));
  } catch {}
}

export async function saveAreaConfigs(configs) {
  if (!Array.isArray(configs)) return;
  memoryAreaConfigs = configs;

  try {
    localStorage.setItem(AREA_CONFIGS_STORAGE_KEY, JSON.stringify(configs));
  } catch (err) {
    console.warn("Error saving area configs to localStorage:", err);
  }

  try {
    window.dispatchEvent(new CustomEvent("hrhub_area_configs_updated", { detail: configs }));
  } catch {}

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

export function sanitizeAreaItem(item) {
  if (!item || typeof item !== "object") return item;

  const grossReportUrl = String(item.grossReportUrl || "").trim();
  let accountantId = String(item.accountantId || "").trim();

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

export async function loadAreaConfigsFromCloud() {
  if (!supabase) return getAreaConfigs();

  try {
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

    if (!record && !error) {
      saveAreaConfigs(getAreaConfigs());
    }
  } catch (err) {
    console.warn("Error loading area configs from cloud:", err);
  }

  return getAreaConfigs();
}

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

export async function deleteAreaConfig(id) {
  const configs = getAreaConfigs();
  if (configs.length <= 1) {
    throw new Error("Cannot delete the only remaining Area configuration.");
  }

  const updated = configs.filter((c) => c.id !== id);
  await saveAreaConfigs(updated);

  if (getSelectedAreaId() === id) {
    setSelectedAreaId(updated[0].id);
  }

  return updated;
}

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
    if (lowerPath.includes("tellergrossperdaterange") || lowerHref.includes("tellergrossperdaterange")) {
      const today = new Date().toISOString().slice(0, 10);
      if (!u.searchParams.has("from")) u.searchParams.set("from", today);
      if (!u.searchParams.has("to")) u.searchParams.set("to", today);
    }
    if (lowerPath.includes("/teller/bet")) {
      const today = new Date().toISOString().slice(0, 10);
      if (!u.searchParams.has("from")) u.searchParams.set("from", today);
      if (!u.searchParams.has("to")) u.searchParams.set("to", today);
      if (!u.searchParams.has("tellerId")) u.searchParams.set("tellerId", "1");
    }
    return u.toString();
  } catch {
    return String(rawUrl).trim();
  }
}

export async function testEndpointHealth({ url, token, method = "GET", timeoutMs = 8000, accountantId = null }) {
  const preparedUrl = prepareTestUrl(url, accountantId);
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await proxyFetch(preparedUrl, {
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
