/**
 * Dedicated User Settings Storage Service
 * Purpose: Manage all user default settings in dedicated Supabase table ('user_settings')
 * per user account without localStorage.
 */

import { supabase } from "./supabase";

export const USER_SETTINGS_TABLE = "user_settings";

// In-memory session cache (replaces localStorage)
const memorySettingsStore = new Map();

/**
 * Extracts a normalized, stable account key for the current user.
 * Prioritizes email, then user id, then username, then fallback.
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

  return "default_account";
}

/**
 * Clean factory baseline defaults for all user-configurable parameters
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
    activeDraft: null,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Synchronous in-memory session reader for immediate initial state
 */
export function getLocalUserSettings(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const defaults = getDefaultUserSettings();
  const cached = memorySettingsStore.get(accountKey);

  if (cached) {
    return {
      ...defaults,
      ...cached,
      directives: { ...defaults.directives, ...(cached.directives || {}) },
      signatory: { ...defaults.signatory, ...(cached.signatory || {}) },
      approver: { ...defaults.approver, ...(cached.approver || {}) },
      headerDefaults: { ...defaults.headerDefaults, ...(cached.headerDefaults || {}) },
      watermark: { ...defaults.watermark, ...(cached.watermark || {}) }
    };
  }

  return defaults;
}

/**
 * Loads user settings directly from Supabase ('user_settings' table) for the account
 */
export async function getUserSettings(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const defaults = getDefaultUserSettings();

  try {
    const { data, error } = await supabase
      .from(USER_SETTINGS_TABLE)
      .select("*")
      .eq("user_id", accountKey)
      .maybeSingle();

    if (!error && data) {
      // Map dedicated DB table columns + JSON fallback
      const jsonSettings = data.settings_json || data.settings || {};

      const merged = {
        ...defaults,
        ...jsonSettings,
        directives: {
          fontFamily: data.directives_font_family || jsonSettings.directives?.fontFamily || defaults.directives.fontFamily,
          fontSize: data.directives_font_size ? Number(data.directives_font_size) : (jsonSettings.directives?.fontSize || defaults.directives.fontSize)
        },
        signatory: {
          name: data.signatory_name || jsonSettings.signatory?.name || defaults.signatory.name,
          title: data.signatory_title || jsonSettings.signatory?.title || defaults.signatory.title,
          label: data.signatory_label || jsonSettings.signatory?.label || defaults.signatory.label,
          signature: data.signatory_signature || jsonSettings.signatory?.signature || null,
          size: data.signatory_size ? Number(data.signatory_size) : (jsonSettings.signatory?.size || defaults.signatory.size),
          offsetX: data.signatory_offset_x !== null && data.signatory_offset_x !== undefined ? Number(data.signatory_offset_x) : (jsonSettings.signatory?.offsetX ?? defaults.signatory.offsetX),
          offsetY: data.signatory_offset_y !== null && data.signatory_offset_y !== undefined ? Number(data.signatory_offset_y) : (jsonSettings.signatory?.offsetY ?? defaults.signatory.offsetY)
        },
        approver: {
          name: data.approver_name || jsonSettings.approver?.name || defaults.approver.name,
          title: data.approver_title || jsonSettings.approver?.title || defaults.approver.title,
          label: data.approver_label || jsonSettings.approver?.label || defaults.approver.label,
          signature: data.approver_signature || jsonSettings.approver?.signature || null,
          size: data.approver_size ? Number(data.approver_size) : (jsonSettings.approver?.size || defaults.approver.size),
          offsetX: data.approver_offset_x !== null && data.approver_offset_x !== undefined ? Number(data.approver_offset_x) : (jsonSettings.approver?.offsetX ?? defaults.approver.offsetX),
          offsetY: data.approver_offset_y !== null && data.approver_offset_y !== undefined ? Number(data.approver_offset_y) : (jsonSettings.approver?.offsetY ?? defaults.approver.offsetY)
        },
        signatoryLayout: data.signatory_layout || jsonSettings.signatoryLayout || defaults.signatoryLayout,
        letterheadDefaults: data.letterhead_defaults || jsonSettings.letterheadDefaults || {},
        headerDefaults: {
          defaultTo: data.memo_to_default || jsonSettings.headerDefaults?.defaultTo || defaults.headerDefaults.defaultTo,
          defaultFrom: data.memo_from_default || jsonSettings.headerDefaults?.defaultFrom || defaults.headerDefaults.defaultFrom,
          defaultSubject: data.memo_subject_default || jsonSettings.headerDefaults?.defaultSubject || defaults.headerDefaults.defaultSubject
        },
        watermark: {
          size: data.watermark_size ? Number(data.watermark_size) : (jsonSettings.watermark?.size || defaults.watermark.size),
          opacity: data.watermark_opacity !== null && data.watermark_opacity !== undefined ? Number(data.watermark_opacity) : (jsonSettings.watermark?.opacity ?? defaults.watermark.opacity),
          showDiagonalStamp: data.show_diagonal_stamp !== null && data.show_diagonal_stamp !== undefined ? Boolean(data.show_diagonal_stamp) : (jsonSettings.watermark?.showDiagonalStamp ?? defaults.watermark.showDiagonalStamp),
          diagonalStampText: data.diagonal_stamp_text || jsonSettings.watermark?.diagonalStampText || defaults.watermark.diagonalStampText
        },
        includedCompanyIds: Array.isArray(data.included_company_ids) ? data.included_company_ids : (jsonSettings.includedCompanyIds || defaults.includedCompanyIds),
        emailWebhookUrl: data.email_webhook_url || jsonSettings.emailWebhookUrl || "",
        activeDraft: data.active_draft || jsonSettings.activeDraft || null,
        updatedAt: data.updated_at || new Date().toISOString()
      };

      // Cache in active session memory
      memorySettingsStore.set(accountKey, merged);

      return {
        settings: merged,
        source: "supabase",
        accountKey
      };
    }
  } catch (err) {
    console.warn("Supabase user_settings fetch notice:", err);
  }

  const inMem = memorySettingsStore.get(accountKey) || defaults;
  return {
    settings: inMem,
    source: "memory",
    accountKey
  };
}

/**
 * Saves or updates user default settings directly in Supabase ('user_settings' table)
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

  // Cache in active session memory
  memorySettingsStore.set(accountKey, merged);

  // Dedicated row payload with both explicit columns & JSON document column
  const payload = {
    user_id: accountKey,
    directives_font_family: merged.directives.fontFamily,
    directives_font_size: merged.directives.fontSize,
    signatory_layout: merged.signatoryLayout,
    signatory_name: merged.signatory.name,
    signatory_title: merged.signatory.title,
    signatory_label: merged.signatory.label,
    signatory_size: merged.signatory.size,
    signatory_offset_x: merged.signatory.offsetX,
    signatory_offset_y: merged.signatory.offsetY,
    signatory_signature: merged.signatory.signature,
    approver_name: merged.approver.name,
    approver_title: merged.approver.title,
    approver_label: merged.approver.label,
    approver_size: merged.approver.size,
    approver_offset_x: merged.approver.offsetX,
    approver_offset_y: merged.approver.offsetY,
    approver_signature: merged.approver.signature,
    watermark_size: merged.watermark.size,
    watermark_opacity: merged.watermark.opacity,
    show_diagonal_stamp: merged.watermark.showDiagonalStamp,
    diagonal_stamp_text: merged.watermark.diagonalStampText,
    memo_to_default: merged.headerDefaults.defaultTo,
    memo_from_default: merged.headerDefaults.defaultFrom,
    memo_subject_default: merged.headerDefaults.defaultSubject,
    email_webhook_url: merged.emailWebhookUrl,
    included_company_ids: merged.includedCompanyIds,
    letterhead_defaults: merged.letterheadDefaults,
    active_draft: merged.activeDraft || null,
    settings_json: merged,
    updated_at: merged.updatedAt
  };

  let syncedToSupabase = false;
  let supabaseError = null;

  try {
    let { error } = await supabase
      .from(USER_SETTINGS_TABLE)
      .upsert(payload, { onConflict: "user_id" });

    // Auto-heal schema differences: if any column is reported missing from Supabase schema cache, strip and retry
    if (error && error.message?.includes("Could not find the")) {
      const workingPayload = { ...payload };
      let retries = 5;
      while (error && error.message?.includes("Could not find the") && retries > 0) {
        retries--;
        const missingColMatch = error.message.match(/Could not find the '([^']+)' column/i);
        if (missingColMatch && missingColMatch[1]) {
          delete workingPayload[missingColMatch[1]];
          const retryRes = await supabase
            .from(USER_SETTINGS_TABLE)
            .upsert(workingPayload, { onConflict: "user_id" });
          error = retryRes.error;
        } else {
          break;
        }
      }
    }

    if (!error) {
      syncedToSupabase = true;
    } else {
      supabaseError = error.message;
      console.warn("Supabase user_settings upsert notice:", error.message);
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
 * Resets user settings back to initial factory defaults in Supabase
 */
export async function resetUserSettings(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const defaults = getDefaultUserSettings();

  memorySettingsStore.set(accountKey, defaults);

  let syncedToSupabase = false;
  try {
    const { error } = await supabase
      .from(USER_SETTINGS_TABLE)
      .upsert({
        user_id: accountKey,
        settings_json: defaults,
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
 * Imports settings from a JSON string and saves them directly to Supabase
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
