// Storage and Cloud Sync Service for Custom Field Monitoring Accounts
// Direct Supabase Table: public.field_monitoring_accounts
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

function mapDbToAccount(row) {
  if (!row) return null;
  return {
    id: String(row.id || ""),
    fullName: row.full_name || row.fullName || "",
    username: row.username || "",
    password: row.password || "Password123!",
    area: row.area && row.area !== "all" ? row.area : "Mandaue City",
    role: row.role || "Field Monitoring",
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : (row.isActive !== undefined ? Boolean(row.isActive) : true),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString()
  };
}

function mapAccountToDb(acc) {
  return {
    id: String(acc.id || "").trim(),
    full_name: String(acc.fullName || "").trim().toUpperCase(),
    username: String(acc.username || "").trim().toLowerCase(),
    password: String(acc.password || "Password123!").trim(),
    area: acc.area && acc.area !== "all" ? acc.area : "Mandaue City",
    role: "Field Monitoring",
    is_active: acc.isActive !== false
  };
}

/**
 * Loads all Field Monitoring accounts from Supabase table 'field_monitoring_accounts'.
 * Includes self-healing fallback to user_settings and localStorage.
 */
export async function loadFieldMonitoringAccounts() {
  let accounts = null;

  // 1. Direct fetch from Supabase table 'field_monitoring_accounts'
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("field_monitoring_accounts")
        .select("*")
        .order("id", { ascending: true });

      if (!error && Array.isArray(data)) {
        if (data.length > 0) {
          accounts = data.map(mapDbToAccount);
        } else {
          // Table exists but is empty -> auto-seed FM-01 into Supabase
          try {
            const seedPayload = mapAccountToDb(DEFAULT_FIELD_MONITORING_ACCOUNTS[0]);
            await supabase.from("field_monitoring_accounts").insert(seedPayload);
            accounts = [...DEFAULT_FIELD_MONITORING_ACCOUNTS];
          } catch {
            accounts = [...DEFAULT_FIELD_MONITORING_ACCOUNTS];
          }
        }
      } else if (error) {
        console.warn("[fieldMonitoringStorage] Table query notice, attempting user_settings fallback:", error.message);
      }
    } catch (tableErr) {
      console.warn("[fieldMonitoringStorage] Cloud table fetch exception:", tableErr);
    }
  }

  // 2. Fallback to Supabase user_settings (for smooth transition before SQL script is run)
  if (!accounts && supabase) {
    try {
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", CLOUD_SETTINGS_KEY)
        .maybeSingle();

      if (settingsData?.settings_json?.accounts && Array.isArray(settingsData.settings_json.accounts) && settingsData.settings_json.accounts.length > 0) {
        accounts = settingsData.settings_json.accounts.map((acc) => ({
          ...acc,
          password: acc.password || "Password123!"
        }));
      }
    } catch (settingsErr) {
      console.warn("[fieldMonitoringStorage] Fallback settings load notice:", settingsErr);
    }
  }

  // 3. Fallback to localStorage cache
  if (!accounts) {
    try {
      const raw = localStorage.getItem(FIELD_MONITORING_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          accounts = parsed.map((acc) => ({
            ...acc,
            password: acc.password || "Password123!"
          }));
        }
      }
    } catch { }
  }

  if (!accounts || accounts.length === 0) {
    accounts = [...DEFAULT_FIELD_MONITORING_ACCOUNTS];
  }

  // Synchronize localStorage cache for immediate synchronous retrieval
  try {
    localStorage.setItem(FIELD_MONITORING_STORAGE_KEY, JSON.stringify(accounts));
  } catch { }

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
        return parsed.map((acc) => ({
          ...acc,
          password: acc.password || "Password123!"
        }));
      }
    }
  } catch { }
  return [...DEFAULT_FIELD_MONITORING_ACCOUNTS];
}

export const getLocalFieldAccounts = getCachedFieldMonitoringAccounts;

/**
 * Saves Field Monitoring accounts to Supabase table and cache
 */
export async function saveFieldMonitoringAccounts(accounts) {
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  // Local cache
  try {
    localStorage.setItem(FIELD_MONITORING_STORAGE_KEY, JSON.stringify(safeAccounts));
  } catch (err) {
    console.warn("[fieldMonitoringStorage] Local save warning:", err);
  }

  // Cloud sync to table
  if (supabase && safeAccounts.length > 0) {
    try {
      const dbRows = safeAccounts.map(mapAccountToDb);
      const { error } = await supabase
        .from("field_monitoring_accounts")
        .upsert(dbRows, { onConflict: "id" });

      if (error) {
        console.warn("[fieldMonitoringStorage] Upsert to table notice, syncing user_settings:", error.message);
        await supabase.from("user_settings").upsert({
          user_id: CLOUD_SETTINGS_KEY,
          settings_json: { accounts: safeAccounts, lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
      }
    } catch (cloudErr) {
      console.warn("[fieldMonitoringStorage] Cloud save warning:", cloudErr);
    }
  }

  return safeAccounts;
}

/**
 * Adds a new Field Monitoring account directly into Supabase table
 */
export async function addFieldMonitoringAccount(newAccount) {
  const current = await loadFieldMonitoringAccounts();

  let maxNum = 0;
  current.forEach((acc) => {
    const match = String(acc.id || "").match(/^FM-(\d+)$/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  });
  const id = newAccount.id || `FM-${String(maxNum + 1).padStart(2, "0")}`;

  const created = {
    id,
    fullName: String(newAccount.fullName || "").trim().toUpperCase(),
    username: String(newAccount.username || "").trim().toLowerCase(),
    password: String(newAccount.password || "").trim(),
    area: newAccount.area && newAccount.area !== "all" ? newAccount.area : "Mandaue City",
    role: "Field Monitoring",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // 1. Direct Supabase Table Insert
  if (supabase) {
    try {
      const dbPayload = mapAccountToDb(created);
      const { error } = await supabase
        .from("field_monitoring_accounts")
        .insert(dbPayload);

      if (error) {
        console.warn("[fieldMonitoringStorage] Direct table insert error, falling back to user_settings:", error.message);
        const updated = [created, ...current.filter((c) => c.id !== created.id)];
        await supabase.from("user_settings").upsert({
          user_id: CLOUD_SETTINGS_KEY,
          settings_json: { accounts: updated, lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
      }
    } catch (insertErr) {
      console.warn("[fieldMonitoringStorage] Insert exception:", insertErr);
    }
  }

  const updatedList = [created, ...current.filter((c) => c.id !== created.id)];
  try {
    localStorage.setItem(FIELD_MONITORING_STORAGE_KEY, JSON.stringify(updatedList));
  } catch { }

  return { success: true, account: created, accounts: updatedList };
}

/**
 * Updates an existing Field Monitoring account directly in Supabase table
 */
export async function updateFieldMonitoringAccount(id, updates) {
  const current = await loadFieldMonitoringAccounts();
  const updatedList = current.map((acc) => {
    if (String(acc.id) === String(id)) {
      return {
        ...acc,
        ...updates,
        fullName: updates.fullName ? String(updates.fullName).trim().toUpperCase() : acc.fullName,
        username: updates.username ? String(updates.username).trim().toLowerCase() : acc.username,
        password: updates.password !== undefined && updates.password !== "" ? String(updates.password).trim() : acc.password,
        area: updates.area ? updates.area : acc.area,
        updatedAt: new Date().toISOString()
      };
    }
    return acc;
  });

  // Direct Supabase table update
  if (supabase) {
    try {
      const dbUpdates = {};
      if (updates.fullName !== undefined) dbUpdates.full_name = String(updates.fullName).trim().toUpperCase();
      if (updates.username !== undefined) dbUpdates.username = String(updates.username).trim().toLowerCase();
      if (updates.password !== undefined && updates.password !== "") dbUpdates.password = String(updates.password).trim();
      if (updates.area !== undefined) dbUpdates.area = updates.area;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      dbUpdates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("field_monitoring_accounts")
        .update(dbUpdates)
        .eq("id", id);

      if (error) {
        console.warn("[fieldMonitoringStorage] Table update notice, saving to user_settings fallback:", error.message);
        await supabase.from("user_settings").upsert({
          user_id: CLOUD_SETTINGS_KEY,
          settings_json: { accounts: updatedList, lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
      }
    } catch (updateErr) {
      console.warn("[fieldMonitoringStorage] Update exception:", updateErr);
    }
  }

  try {
    localStorage.setItem(FIELD_MONITORING_STORAGE_KEY, JSON.stringify(updatedList));
  } catch { }

  return { success: true, accounts: updatedList };
}

/**
 * Deletes a Field Monitoring account from Supabase table
 */
export async function deleteFieldMonitoringAccount(id) {
  const current = await loadFieldMonitoringAccounts();
  const updatedList = current.filter((acc) => String(acc.id) !== String(id));

  if (supabase) {
    try {
      const { error } = await supabase
        .from("field_monitoring_accounts")
        .delete()
        .eq("id", id);

      if (error) {
        console.warn("[fieldMonitoringStorage] Table delete notice, syncing to user_settings fallback:", error.message);
        await supabase.from("user_settings").upsert({
          user_id: CLOUD_SETTINGS_KEY,
          settings_json: { accounts: updatedList, lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString()
        }, { onConflict: "user_id" });
      }
    } catch (delErr) {
      console.warn("[fieldMonitoringStorage] Delete exception:", delErr);
    }
  }

  try {
    localStorage.setItem(FIELD_MONITORING_STORAGE_KEY, JSON.stringify(updatedList));
  } catch { }

  return { success: true, accounts: updatedList };
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

  // Load latest accounts directly from database
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

/**
 * Subscribes to Realtime Postgres changes on 'public.field_monitoring_accounts'
 */
export function subscribeToFieldAccountsRealtime(onTableChange) {
  if (!supabase) return () => {};
  try {
    const channelName = `rt_field_monitoring_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "field_monitoring_accounts"
        },
        (payload) => {
          if (typeof onTableChange === "function") {
            onTableChange(payload);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch { }
    };
  } catch (err) {
    console.warn("Realtime field accounts subscribe notice:", err);
    return () => {};
  }
}
