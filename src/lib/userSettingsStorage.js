/**
 * Dedicated User Settings Storage Service
 * Purpose: Save, load, and manage default settings as JSON per user account in Supabase ('user_settings')
 * with zero-latency local cache fallback.
 */

import { supabase } from "./supabase";

export const USER_SETTINGS_TABLE = "user_settings";

/**
 * Extracts a normalized, stable account key for the current user.
 * Prioritizes email, then user id, then username, then stored auth cache.
 */
export function getUserAccountKey(currentUser = null) {
  if (currentUser) {
    if (typeof currentUser === "string" && currentUser.trim()) {
      return currentUser.trim().toLowerCase();
    }
    if (currentUser.email && typeof currentUser.email === "string") {
      return currentUser.email.trim().toLowerCase();
    }
    if (currentUser.id) {
      return String(currentUser.id).trim().toLowerCase();
    }
    if (currentUser.username) {
      return currentUser.username.trim().toLowerCase();
    }
  }

  // Fallback to currently logged-in auth user in localStorage
  try {
    const savedUserStr = localStorage.getItem("hrhub_auth_user");
    if (savedUserStr) {
      const u = JSON.parse(savedUserStr);
      if (u?.email) return u.email.trim().toLowerCase();
      if (u?.id) return String(u.id).trim().toLowerCase();
      if (u?.name) return u.name.trim().toLowerCase();
    }
  } catch {}

  return "default_account";
}

/**
 * Clean factory defaults for all user-configurable parameters
 */
export function getDefaultUserSettings() {
  return {
    version: 1,
    directives: {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: 13.3
    },
    signatory: {
      name: "JEVINCE JAYE S. JUBAY, CHRP",
      title: "HRMD Manager",
      label: "ISSUED BY:",
      signature: null,
      size: 52,
      offsetX: 0,
      offsetY: 0
    },
    approver: {
      name: "CHARMIE JEAN M. SIMPAL",
      title: "President & CEO",
      label: "NOTED & APPROVED BY:",
      signature: null,
      size: 52,
      offsetX: 0,
      offsetY: 0
    },
    signatoryLayout: "dual", // "dual" | "single"
    letterheadDefaults: {}, // Per-company custom overrides
    headerDefaults: {
      defaultTo: "HR ON-SITE, CIC, AND FIELD MONITORING",
      defaultFrom: "HUMAN RESOURCES DEPARTMENT",
      defaultSubject: "IMMEDIATE RESPONSE AND COMMUNICATION ACCESSIBILITY"
    },
    watermark: {
      size: 380,
      opacity: 18,
      showDiagonalStamp: false,
      diagonalStampText: "OFFICIAL MEMORANDUM"
    },
    includedCompanyIds: [
      "lucky_betplay",
      "sgc",
      "simcon",
      "5a_royal",
      "imperial_gaming",
      "glowing_fortune"
    ],
    emailWebhookUrl: "",
    updatedAt: new Date().toISOString()
  };
}

/**
 * Gets user settings cache key for localStorage
 */
function getStorageKey(accountKey) {
  return `hrhub_user_settings_${accountKey}`;
}

/**
 * Synchronous local cache reader for immediate 0ms initial render
 */
export function getLocalUserSettings(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const defaults = getDefaultUserSettings();

  try {
    const raw = localStorage.getItem(getStorageKey(accountKey));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        directives: { ...defaults.directives, ...(parsed.directives || {}) },
        signatory: { ...defaults.signatory, ...(parsed.signatory || {}) },
        approver: { ...defaults.approver, ...(parsed.approver || {}) },
        headerDefaults: { ...defaults.headerDefaults, ...(parsed.headerDefaults || {}) },
        watermark: { ...defaults.watermark, ...(parsed.watermark || {}) }
      };
    }
  } catch (err) {
    console.warn("Failed to read local user settings cache:", err);
  }

  return defaults;
}

/**
 * Loads user settings from Supabase ('user_settings' table) with local cache fallback
 */
export async function getUserSettings(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const localSettings = getLocalUserSettings(currentUser);

  try {
    const { data, error } = await supabase
      .from(USER_SETTINGS_TABLE)
      .select("settings, updated_at")
      .eq("user_id", accountKey)
      .maybeSingle();

    if (!error && data?.settings && typeof data.settings === "object") {
      const merged = {
        ...localSettings,
        ...data.settings,
        directives: { ...localSettings.directives, ...(data.settings.directives || {}) },
        signatory: { ...localSettings.signatory, ...(data.settings.signatory || {}) },
        approver: { ...localSettings.approver, ...(data.settings.approver || {}) },
        headerDefaults: { ...localSettings.headerDefaults, ...(data.settings.headerDefaults || {}) },
        watermark: { ...localSettings.watermark, ...(data.settings.watermark || {}) },
        updatedAt: data.updated_at || data.settings.updatedAt || new Date().toISOString()
      };

      // Synchronize local cache with latest database record
      try {
        localStorage.setItem(getStorageKey(accountKey), JSON.stringify(merged));
      } catch {}

      return {
        settings: merged,
        source: "supabase",
        accountKey
      };
    }
  } catch (err) {
    console.warn("Supabase user_settings fetch notice, falling back to local cache:", err);
  }

  return {
    settings: localSettings,
    source: "local",
    accountKey
  };
}

/**
 * Saves or updates user default settings in Supabase and local cache
 */
export async function saveUserSettings(currentUser = null, settingsPartial = {}) {
  const accountKey = getUserAccountKey(currentUser);
  const current = getLocalUserSettings(currentUser);

  const merged = {
    ...current,
    ...settingsPartial,
    directives: { ...current.directives, ...(settingsPartial.directives || {}) },
    signatory: { ...current.signatory, ...(settingsPartial.signatory || {}) },
    approver: { ...current.approver, ...(settingsPartial.approver || {}) },
    headerDefaults: { ...current.headerDefaults, ...(settingsPartial.headerDefaults || {}) },
    watermark: { ...current.watermark, ...(settingsPartial.watermark || {}) },
    updatedAt: new Date().toISOString()
  };

  // 1. Immediately persist to localStorage for instant local reflection
  try {
    localStorage.setItem(getStorageKey(accountKey), JSON.stringify(merged));
  } catch (err) {
    console.warn("Failed to save local user settings cache:", err);
  }

  // 2. Persist to Supabase dedicated table
  let syncedToSupabase = false;
  let supabaseError = null;

  try {
    const payload = {
      user_id: accountKey,
      settings: merged,
      updated_at: merged.updatedAt
    };

    const { error } = await supabase
      .from(USER_SETTINGS_TABLE)
      .upsert(payload, { onConflict: "user_id" });

    if (!error) {
      syncedToSupabase = true;
    } else {
      supabaseError = error.message;
      console.warn("Supabase user_settings save notice:", error.message);
    }
  } catch (err) {
    supabaseError = err?.message || String(err);
    console.warn("Supabase user_settings network notice:", err);
  }

  return {
    success: true,
    syncedToSupabase,
    error: supabaseError,
    settings: merged,
    accountKey
  };
}

/**
 * Resets user settings back to initial factory defaults
 */
export async function resetUserSettings(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const defaults = getDefaultUserSettings();

  try {
    localStorage.removeItem(getStorageKey(accountKey));
  } catch {}

  let syncedToSupabase = false;
  try {
    const { error } = await supabase
      .from(USER_SETTINGS_TABLE)
      .upsert({
        user_id: accountKey,
        settings: defaults,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    if (!error) syncedToSupabase = true;
  } catch {}

  return { success: true, syncedToSupabase, settings: defaults };
}

/**
 * Exports user settings as a downloadable JSON string
 */
export function exportSettingsAsJson(currentUser = null) {
  const settings = getLocalUserSettings(currentUser);
  return JSON.stringify(settings, null, 2);
}

/**
 * Imports settings from a JSON string and saves them for the user
 */
export async function importSettingsFromJson(currentUser = null, jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Invalid JSON structure");
    }
    return await saveUserSettings(currentUser, parsed);
  } catch (err) {
    return { success: false, error: err.message };
  }
}
