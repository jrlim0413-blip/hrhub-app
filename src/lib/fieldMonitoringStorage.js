// Storage and Cloud Sync Service for Custom Field Monitoring Accounts
import { supabase } from "./supabase";

export const FIELD_MONITORING_STORAGE_KEY = "hrhub_field_monitoring_accounts";
export const CLOUD_SETTINGS_KEY = "field_monitoring_accounts";

export const DEFAULT_FIELD_MONITORING_ACCOUNTS = [
  {
    id: "FM-01",
    fullName: "FIELD MONITOR - MANDAUE",
    username: "monitor.mandaue",
    password: "Password123!",
    area: "Mandaue City",
    role: "Field Monitoring",
    isActive: true,
    createdAt: "2026-11-01T08:00:00.000Z"
  }
];

/**
 * Loads all Field Monitoring accounts from localStorage and Supabase user_settings
 */
export async function loadFieldMonitoringAccounts() {
  let accounts = null;

  // 1. Check localStorage first
  try {
    const raw = localStorage.getItem(FIELD_MONITORING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        accounts = parsed;
      }
    }
  } catch (err) {
    console.warn("[fieldMonitoringStorage] Local load warning:", err);
  }

  // 2. Fetch from Supabase cloud
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", CLOUD_SETTINGS_KEY)
        .maybeSingle();

      if (!error && data?.settings_json?.accounts && Array.isArray(data.settings_json.accounts)) {
        accounts = data.settings_json.accounts;
        try {
          localStorage.setItem(FIELD_MONITORING_STORAGE_KEY, JSON.stringify(accounts));
        } catch { }
      }
    } catch (cloudErr) {
      console.warn("[fieldMonitoringStorage] Cloud load warning:", cloudErr);
    }
  }

  if (!accounts || accounts.length === 0) {
    accounts = [...DEFAULT_FIELD_MONITORING_ACCOUNTS];
    try {
      localStorage.setItem(FIELD_MONITORING_STORAGE_KEY, JSON.stringify(accounts));
    } catch { }
  }

  return accounts;
}

export const fetchFieldMonitoringAccounts = loadFieldMonitoringAccounts;

/**
 * Synchronously retrieves accounts from localStorage cache
 */
export function getCachedFieldMonitoringAccounts() {
  try {
    const raw = localStorage.getItem(FIELD_MONITORING_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch { }
  return [...DEFAULT_FIELD_MONITORING_ACCOUNTS];
}

export const getLocalFieldAccounts = getCachedFieldMonitoringAccounts;

/**
 * Saves Field Monitoring accounts to localStorage and Supabase
 */
export async function saveFieldMonitoringAccounts(accounts) {
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  // Local save
  try {
    localStorage.setItem(FIELD_MONITORING_STORAGE_KEY, JSON.stringify(safeAccounts));
  } catch (err) {
    console.warn("[fieldMonitoringStorage] Local save warning:", err);
  }

  // Cloud save to user_settings
  if (supabase) {
    try {
      await supabase.from("user_settings").upsert(
        {
          user_id: CLOUD_SETTINGS_KEY,
          settings_json: {
            accounts: safeAccounts,
            lastUpdated: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    } catch (cloudErr) {
      console.warn("[fieldMonitoringStorage] Cloud save warning:", cloudErr);
    }
  }

  return safeAccounts;
}

/**
 * Adds a new Field Monitoring account
 */
export async function addFieldMonitoringAccount(newAccount) {
  const current = await loadFieldMonitoringAccounts();
  const nextNumber = current.length + 1;
  const id = newAccount.id || `FM-${String(nextNumber).padStart(2, "0")}`;

  const created = {
    id,
    fullName: String(newAccount.fullName || "").trim().toUpperCase(),
    username: String(newAccount.username || "").trim().toLowerCase(),
    password: String(newAccount.password || "").trim(),
    area: newAccount.area && newAccount.area !== "all" ? newAccount.area : "Mandaue City",
    role: "Field Monitoring",
    isActive: true,
    createdAt: new Date().toISOString()
  };

  const updated = [created, ...current];
  await saveFieldMonitoringAccounts(updated);
  return { success: true, account: created, accounts: updated };
}

/**
 * Updates an existing Field Monitoring account
 */
export async function updateFieldMonitoringAccount(id, updates) {
  const current = await loadFieldMonitoringAccounts();
  const updated = current.map((acc) => {
    if (String(acc.id) === String(id)) {
      return {
        ...acc,
        ...updates,
        fullName: updates.fullName ? String(updates.fullName).trim().toUpperCase() : acc.fullName,
        username: updates.username ? String(updates.username).trim().toLowerCase() : acc.username,
        password: updates.password !== undefined && updates.password !== "" ? String(updates.password).trim() : acc.password,
        updatedAt: new Date().toISOString()
      };
    }
    return acc;
  });
  await saveFieldMonitoringAccounts(updated);
  return { success: true, accounts: updated };
}

/**
 * Deletes a Field Monitoring account
 */
export async function deleteFieldMonitoringAccount(id) {
  const current = await loadFieldMonitoringAccounts();
  const updated = current.filter((acc) => String(acc.id) !== String(id));
  await saveFieldMonitoringAccounts(updated);
  return { success: true, accounts: updated };
}

/**
 * Authenticates credentials against registered Field Monitoring accounts
 */
export async function verifyFieldMonitoringLogin(username, password) {
  const cleanUser = String(username || "").trim().toLowerCase();
  const cleanPass = String(password || "").trim();

  if (!cleanUser || !cleanPass) {
    return { success: false, error: "Please enter both username and password." };
  }

  // Load latest accounts
  const accounts = await loadFieldMonitoringAccounts();
  const match = accounts.find((acc) => {
    if (acc.isActive === false) return false;
    const accUser = String(acc.username || "").trim().toLowerCase();
    const accId = String(acc.id || "").trim().toLowerCase();
    return accUser === cleanUser || accId === cleanUser;
  });

  if (match) {
    if (String(match.password).trim() === cleanPass) {
      return {
        success: true,
        account: match,
        token: "field-monitoring-verified"
      };
    } else {
      return {
        success: false,
        error: "Incorrect password for Field Monitoring account."
      };
    }
  }

  return { success: false, notFound: true };
}
