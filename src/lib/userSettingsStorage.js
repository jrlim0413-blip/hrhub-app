/**
 * Dedicated User Settings Storage Service
 * Purpose: Manage all user default settings in dedicated Supabase table ('user_settings')
 * per user account without localStorage.
 */

import { supabase } from "./supabase.js";

export const USER_SETTINGS_TABLE = "user_settings";
export const ORGANIZATION_DEFAULT_ACCOUNT_KEY = "admin@hrhub.com";
export const SETTINGS_SCHEMA_VERSION = 2;
export const LETTERHEAD_FIELDS = ["legalName", "tagline", "address", "contact"];

// Prior v1 factory values so untouched defaults on existing accounts upgrade cleanly once
const LEGACY_V1_FACTORY_DEFAULTS = {
  fontSize: 13.3,
  signatoryLayout: "dual",
  signatory: { size: 52, offsetX: 0, offsetY: 0 },
  approver: { size: 52, offsetX: 0, offsetY: 0 },
  watermarkOpacity: 18
};

// In-memory session cache (replaces localStorage)
const memorySettingsStore = new Map();

/**
 * Validates per-company letterhead overrides so invalid or blank company headings never blank a letterhead.
 */
export function filterValidLetterheadFields(letterheadMap, validCompanyIds = null) {
  if (!letterheadMap || typeof letterheadMap !== "object" || Array.isArray(letterheadMap)) {
    return {};
  }

  const companyIds = Array.isArray(validCompanyIds) && validCompanyIds.length > 0
    ? validCompanyIds
    : Object.keys(letterheadMap);

  return companyIds.reduce((defaults, companyId) => {
    const savedFields = letterheadMap[companyId];
    if (!savedFields || typeof savedFields !== "object" || Array.isArray(savedFields)) {
      return defaults;
    }
    if (
      Object.prototype.hasOwnProperty.call(savedFields, "legalName") &&
      (typeof savedFields.legalName !== "string" || savedFields.legalName.trim().length === 0)
    ) {
      return defaults;
    }

    const validFields = Object.fromEntries(
      LETTERHEAD_FIELDS
        .filter((field) => typeof savedFields[field] === "string")
        .map((field) => [field, savedFields[field]])
    );
    if (Object.keys(validFields).length > 0) {
      defaults[companyId] = validFields;
    }
    return defaults;
  }, {});
}

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
 * Clean factory baseline defaults aligned with HRMD (admin@hrhub.com) master defaults
 */
export function getDefaultUserSettings() {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    directives: {
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: 14.6
    },
    signatory: {
      name: "JEVINCE JAYE S. JUBAY, CHRP",
      title: "HRMD Manager",
      label: "ISSUED BY:",
      signature: null,
      size: 80,
      offsetX: -12,
      offsetY: -38
    },
    approver: {
      name: "CHARMIE JEAN M. SIMPAL",
      title: "President & CEO",
      label: "NOTED & APPROVED BY:",
      signature: null,
      size: 118,
      offsetX: 0,
      offsetY: -45
    },
    signatoryLayout: "single", // "dual" | "single"
    letterheadDefaults: {}, // Per-company custom overrides for the active user
    organizationLetterheadDefaults: {}, // Organization baseline synced from HRMD (admin@hrhub.com)
    headerDefaults: {
      defaultTo: "HR ON-SITE, CIC, AND FIELD MONITORING",
      defaultFrom: "HUMAN RESOURCES DEPARTMENT",
      defaultSubject: "IMMEDIATE RESPONSE AND COMMUNICATION ACCESSIBILITY"
    },
    watermark: {
      size: 380,
      opacity: 25,
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

const pickNumber = (colVal, jsonVal, fallback) => {
  if (colVal !== null && colVal !== undefined && colVal !== "") {
    return Number(colVal);
  }
  if (jsonVal !== null && jsonVal !== undefined && jsonVal !== "") {
    return Number(jsonVal);
  }
  return fallback;
};

const pickBool = (colVal, jsonVal, fallback) => {
  if (colVal !== null && colVal !== undefined) return Boolean(colVal);
  if (jsonVal !== null && jsonVal !== undefined) return Boolean(jsonVal);
  return fallback;
};

/**
 * Normalizes a Supabase 'user_settings' row into the frontend settings structure.
 */
export function mapUserSettingsRow(data, baseDefaults = getDefaultUserSettings()) {
  if (!data || typeof data !== "object") return baseDefaults;
  const jsonSettings = data.settings_json || data.settings || {};

  return {
    ...baseDefaults,
    ...jsonSettings,
    directives: {
      fontFamily: data.directives_font_family || jsonSettings.directives?.fontFamily || baseDefaults.directives.fontFamily,
      fontSize: pickNumber(data.directives_font_size, jsonSettings.directives?.fontSize, baseDefaults.directives.fontSize)
    },
    signatory: {
      name: data.signatory_name || jsonSettings.signatory?.name || baseDefaults.signatory.name,
      title: data.signatory_title || jsonSettings.signatory?.title || baseDefaults.signatory.title,
      label: data.signatory_label || jsonSettings.signatory?.label || baseDefaults.signatory.label,
      signature: data.signatory_signature ?? jsonSettings.signatory?.signature ?? null,
      size: pickNumber(data.signatory_size, jsonSettings.signatory?.size, baseDefaults.signatory.size),
      offsetX: pickNumber(data.signatory_offset_x, jsonSettings.signatory?.offsetX, baseDefaults.signatory.offsetX),
      offsetY: pickNumber(data.signatory_offset_y, jsonSettings.signatory?.offsetY, baseDefaults.signatory.offsetY)
    },
    approver: {
      name: data.approver_name || jsonSettings.approver?.name || baseDefaults.approver.name,
      title: data.approver_title || jsonSettings.approver?.title || baseDefaults.approver.title,
      label: data.approver_label || jsonSettings.approver?.label || baseDefaults.approver.label,
      signature: data.approver_signature ?? jsonSettings.approver?.signature ?? null,
      size: pickNumber(data.approver_size, jsonSettings.approver?.size, baseDefaults.approver.size),
      offsetX: pickNumber(data.approver_offset_x, jsonSettings.approver?.offsetX, baseDefaults.approver.offsetX),
      offsetY: pickNumber(data.approver_offset_y, jsonSettings.approver?.offsetY, baseDefaults.approver.offsetY)
    },
    signatoryLayout: data.signatory_layout || jsonSettings.signatoryLayout || baseDefaults.signatoryLayout,
    letterheadDefaults: filterValidLetterheadFields(data.letterhead_defaults || jsonSettings.letterheadDefaults || {}),
    organizationLetterheadDefaults: baseDefaults.organizationLetterheadDefaults || {},
    headerDefaults: {
      defaultTo: data.memo_to_default || jsonSettings.headerDefaults?.defaultTo || baseDefaults.headerDefaults.defaultTo,
      defaultFrom: data.memo_from_default || jsonSettings.headerDefaults?.defaultFrom || baseDefaults.headerDefaults.defaultFrom,
      defaultSubject: data.memo_subject_default || jsonSettings.headerDefaults?.defaultSubject || baseDefaults.headerDefaults.defaultSubject
    },
    watermark: {
      size: pickNumber(data.watermark_size, jsonSettings.watermark?.size, baseDefaults.watermark.size),
      opacity: pickNumber(data.watermark_opacity, jsonSettings.watermark?.opacity, baseDefaults.watermark.opacity),
      showDiagonalStamp: pickBool(data.show_diagonal_stamp, jsonSettings.watermark?.showDiagonalStamp, baseDefaults.watermark.showDiagonalStamp),
      diagonalStampText: data.diagonal_stamp_text || jsonSettings.watermark?.diagonalStampText || baseDefaults.watermark.diagonalStampText
    },
    includedCompanyIds: Array.isArray(data.included_company_ids)
      ? data.included_company_ids
      : (jsonSettings.includedCompanyIds || baseDefaults.includedCompanyIds),
    emailWebhookUrl: data.email_webhook_url || jsonSettings.emailWebhookUrl || baseDefaults.emailWebhookUrl || "",
    activeDraft: data.active_draft || jsonSettings.activeDraft || null,
    updatedAt: data.updated_at || new Date().toISOString()
  };
}

/**
 * Builds the shared organization template from HRMD's (admin@hrhub.com) saved settings.
 * Personal e-signature images and active entity filter remain per-account.
 */
export function buildOrganizationBaseline(adminRow = null) {
  const factoryDefaults = getDefaultUserSettings();
  if (!adminRow) return factoryDefaults;

  const adminMapped = mapUserSettingsRow(adminRow, factoryDefaults);
  return {
    ...factoryDefaults,
    version: SETTINGS_SCHEMA_VERSION,
    directives: { ...adminMapped.directives },
    signatory: {
      ...adminMapped.signatory,
      signature: null
    },
    approver: {
      ...adminMapped.approver,
      signature: null
    },
    signatoryLayout: adminMapped.signatoryLayout,
    letterheadDefaults: {},
    organizationLetterheadDefaults: filterValidLetterheadFields(adminMapped.letterheadDefaults),
    headerDefaults: { ...adminMapped.headerDefaults },
    watermark: { ...adminMapped.watermark },
    includedCompanyIds: [...factoryDefaults.includedCompanyIds],
    emailWebhookUrl: adminMapped.emailWebhookUrl || "",
    activeDraft: null
  };
}

const isLegacySignatoryBox = (box, legacy) =>
  Number(box.size) === legacy.size &&
  Number(box.offsetX) === legacy.offsetX &&
  Number(box.offsetY) === legacy.offsetY;

/**
 * Resolves effective account settings from the user's own row and HRMD's organization template row.
 */
export function resolveUserSettingsFromRows(ownRow = null, adminRow = null, accountKey = "") {
  const factoryDefaults = getDefaultUserSettings();

  if (accountKey === ORGANIZATION_DEFAULT_ACCOUNT_KEY) {
    if (!ownRow) return factoryDefaults;
    const mapped = mapUserSettingsRow(ownRow, factoryDefaults);
    return {
      ...mapped,
      version: Number(ownRow?.settings_json?.version ?? ownRow?.settings?.version ?? SETTINGS_SCHEMA_VERSION),
      organizationLetterheadDefaults: {}
    };
  }

  const orgBaseline = buildOrganizationBaseline(adminRow);
  if (!ownRow) {
    return orgBaseline;
  }

  const ownMapped = mapUserSettingsRow(ownRow, orgBaseline);
  const rawOwnVersion = Number(ownRow?.settings_json?.version ?? ownRow?.settings?.version ?? 1);
  const shouldUpgradeLegacyV1 = Number.isFinite(rawOwnVersion) && rawOwnVersion < SETTINGS_SCHEMA_VERSION;

  const mergedDirectives = { ...ownMapped.directives };
  const mergedSignatory = { ...ownMapped.signatory };
  const mergedApprover = { ...ownMapped.approver };
  const mergedWatermark = { ...ownMapped.watermark };
  let mergedSignatoryLayout = ownMapped.signatoryLayout;
  let mergedWebhookUrl = ownMapped.emailWebhookUrl;

  if (shouldUpgradeLegacyV1) {
    if (Number(mergedDirectives.fontSize) === LEGACY_V1_FACTORY_DEFAULTS.fontSize) {
      mergedDirectives.fontSize = orgBaseline.directives.fontSize;
    }
    if (mergedSignatoryLayout === LEGACY_V1_FACTORY_DEFAULTS.signatoryLayout) {
      mergedSignatoryLayout = orgBaseline.signatoryLayout;
    }
    if (isLegacySignatoryBox(mergedSignatory, LEGACY_V1_FACTORY_DEFAULTS.signatory)) {
      mergedSignatory.size = orgBaseline.signatory.size;
      mergedSignatory.offsetX = orgBaseline.signatory.offsetX;
      mergedSignatory.offsetY = orgBaseline.signatory.offsetY;
    }
    if (isLegacySignatoryBox(mergedApprover, LEGACY_V1_FACTORY_DEFAULTS.approver)) {
      mergedApprover.size = orgBaseline.approver.size;
      mergedApprover.offsetX = orgBaseline.approver.offsetX;
      mergedApprover.offsetY = orgBaseline.approver.offsetY;
    }
    if (Number(mergedWatermark.opacity) === LEGACY_V1_FACTORY_DEFAULTS.watermarkOpacity) {
      mergedWatermark.opacity = orgBaseline.watermark.opacity;
    }
    if (!mergedWebhookUrl && orgBaseline.emailWebhookUrl) {
      mergedWebhookUrl = orgBaseline.emailWebhookUrl;
    }
  }

  return {
    ...ownMapped,
    version: SETTINGS_SCHEMA_VERSION,
    directives: mergedDirectives,
    signatory: mergedSignatory,
    approver: mergedApprover,
    signatoryLayout: mergedSignatoryLayout,
    watermark: mergedWatermark,
    emailWebhookUrl: mergedWebhookUrl,
    organizationLetterheadDefaults: orgBaseline.organizationLetterheadDefaults
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
      watermark: { ...defaults.watermark, ...(cached.watermark || {}) },
      letterheadDefaults: filterValidLetterheadFields(cached.letterheadDefaults || {}),
      organizationLetterheadDefaults: filterValidLetterheadFields(cached.organizationLetterheadDefaults || {})
    };
  }

  return defaults;
}

/**
 * Loads user settings directly from Supabase ('user_settings' table) for the account,
 * inheriting organization defaults configured on HRMD (admin@hrhub.com) for other/new accounts.
 */
export async function getUserSettings(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const defaults = getDefaultUserSettings();

  try {
    let dataRows = null;
    let error = null;

    if (accountKey === ORGANIZATION_DEFAULT_ACCOUNT_KEY) {
      const res = await supabase
        .from(USER_SETTINGS_TABLE)
        .select("*")
        .eq("user_id", accountKey)
        .maybeSingle();
      error = res.error;
      dataRows = res.data ? [res.data] : [];
    } else {
      const res = await supabase
        .from(USER_SETTINGS_TABLE)
        .select("*")
        .in("user_id", [accountKey, ORGANIZATION_DEFAULT_ACCOUNT_KEY]);
      error = res.error;
      dataRows = Array.isArray(res.data) ? res.data : [];
    }

    if (!error && Array.isArray(dataRows) && dataRows.length > 0) {
      const ownRow = dataRows.find((row) => row.user_id === accountKey) || null;
      const adminRow = dataRows.find((row) => row.user_id === ORGANIZATION_DEFAULT_ACCOUNT_KEY) || null;
      const merged = resolveUserSettingsFromRows(ownRow, adminRow, accountKey);

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
    version: SETTINGS_SCHEMA_VERSION,
    directives: { ...current.directives, ...(settingsPartial.directives || {}) },
    signatory: { ...current.signatory, ...(settingsPartial.signatory || {}) },
    approver: { ...current.approver, ...(settingsPartial.approver || {}) },
    headerDefaults: { ...current.headerDefaults, ...(settingsPartial.headerDefaults || {}) },
    watermark: { ...current.watermark, ...(settingsPartial.watermark || {}) },
    updatedAt: new Date().toISOString()
  };

  // Cache in active session memory (retaining transient organizationLetterheadDefaults)
  memorySettingsStore.set(accountKey, merged);

  // Strip transient organizationLetterheadDefaults before persisting per-account overrides
  const persistableJson = { ...merged };
  delete persistableJson.organizationLetterheadDefaults;

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
    settings_json: persistableJson,
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
  } catch (err) {
    console.warn("Supabase user_settings reset notice:", err);
  }

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
