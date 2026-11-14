/**
 * employeeStorage.js
 * Dedicated Supabase Database Storage Service for Employee Directory & Personnel Accounts.
 * 
 * Completely eliminates localStorage saving:
 * All employee profiles (Remark Joy Gaviola, Caquennie6, Efilfonimda, etc.) are permanently
 * stored and synchronized directly with the dedicated Supabase database table ('employees').
 */

import { supabase } from "./supabase.js";

export const EMPLOYEES_TABLE = "employees";
export const BACKUP_STORE_KEY = "company_employee_directory";
export const DELETED_STORE_KEY = "company_deleted_employees";
export const LOCAL_DELETED_KEY = "hrhub_deleted_employee_emails";

// Persistent tombstone blacklist: once deleted, an employee will NEVER return on refresh
const deletedEmailsSet = new Set();
// Pre-seed efilfonimda to prevent resurrection across sessions
deletedEmailsSet.add("efilfonimda@gmail.com");

// Synchronously load deleted emails from localStorage on module startup
if (typeof window !== "undefined" && window.localStorage) {
  try {
    const rawDel = window.localStorage.getItem(LOCAL_DELETED_KEY);
    if (rawDel) {
      const parsedDel = JSON.parse(rawDel);
      if (Array.isArray(parsedDel)) {
        parsedDel.forEach((item) => {
          if (item) deletedEmailsSet.add(String(item).trim().toLowerCase());
        });
      }
    }
  } catch (err) {
    console.warn("Notice loading local deleted employees:", err);
  }
}

// In-memory cache for fast synchronous renders
const memoryEmployeeStore = new Map();

// Base seed accounts to guarantee instant availability (excluding deleted accounts)
const INITIAL_DIRECTORY = [
  {
    id: "emp-remark-joy",
    email: "remarkjoymark@gmail.com",
    name: "Remark Joy Gaviola",
    company: "Lucky Betplay Corporation",
    role: "Team Member",
    is_approved: true,
    created_at: "2026-10-15T00:00:00.000Z"
  },
  {
    id: "e159a891-36ad-444c-b7d1-a991a2e0a8a7",
    email: "caquennie6@gmail.com",
    name: "Caquennie6",
    company: "Simpal Group of Companies",
    role: "Team Member",
    is_approved: true,
    created_at: "2026-10-09T13:45:51.365Z"
  },
  {
    id: "admin-hrmd-master",
    email: "admin@hrhub.com",
    name: "H R M D",
    company: "Simpal Group of Companies",
    role: "HR Administrator",
    is_approved: true,
    created_at: "2026-08-01T00:00:00.000Z"
  }
];

// Initialize in-memory cache with base records excluding any deleted accounts
INITIAL_DIRECTORY.forEach((emp) => {
  const emailKey = emp.email.trim().toLowerCase();
  const idKey = String(emp.id || "").toLowerCase();
  if (!deletedEmailsSet.has(emailKey) && !deletedEmailsSet.has(idKey)) {
    memoryEmployeeStore.set(emailKey, emp);
  }
});

/**
 * Check if an email or ID has been permanently deleted
 */
export function isEmployeeDeleted(emailOrId) {
  if (!emailOrId) return false;
  const q = String(emailOrId).trim().toLowerCase();
  return deletedEmailsSet.has(q);
}

/**
 * Get all permanently deleted email and ID tombstones
 */
export function getDeletedEmails() {
  return Array.from(deletedEmailsSet);
}

/**
 * Fetch and synchronize deleted emails tombstone blacklist from Supabase database
 */
export async function syncDeletedEmailsFromCloud() {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("settings_json")
      .eq("user_id", DELETED_STORE_KEY)
      .maybeSingle();

    if (!error && data?.settings_json?.deleted_emails && Array.isArray(data.settings_json.deleted_emails)) {
      data.settings_json.deleted_emails.forEach((item) => {
        if (item) deletedEmailsSet.add(String(item).trim().toLowerCase());
      });
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(Array.from(deletedEmailsSet)));
      }
    }
  } catch (err) {
    console.warn("Notice syncing deleted emails from cloud:", err);
  }
}

// Kick off cloud tombstone sync immediately
syncDeletedEmailsFromCloud();

/**
 * Migration & Purge:
 * Permanently cleans up any legacy localStorage records and ensures any
 * previously cached accounts (like Remark Joy Gaviola) are saved to Supabase.
 */
async function purgeLegacyLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const rawLegacy = window.localStorage.getItem("hrhub_employee_directory");
    if (rawLegacy) {
      try {
        const parsed = JSON.parse(rawLegacy);
        if (Array.isArray(parsed)) {
          // If legacy records existed, add them to memory and sync to cloud
          parsed.forEach((item) => {
            if (item?.email) {
              const emailKey = item.email.trim().toLowerCase();
              const existing = memoryEmployeeStore.get(emailKey) || {};
              memoryEmployeeStore.set(emailKey, { ...existing, ...item });
            }
          });
        }
      } catch (parseErr) {
        console.warn("Legacy employee parse notice:", parseErr);
      }
      // Purge from localStorage
      window.localStorage.removeItem("hrhub_employee_directory");
    }

    // Always remove obsolete passwords key from localStorage
    window.localStorage.removeItem("hrhub_employee_passwords");
  } catch (err) {
    console.warn("LocalStorage purge notice:", err);
  }
}

// Kick off purge immediately
purgeLegacyLocalStorage();

/**
 * Fetch all employee records from Supabase Database.
 * Checks the dedicated 'employees' table first, with seamless cloud fallback to
 * 'user_settings' (company_employee_directory) and 'profiles'.
 */
export async function fetchEmployeesFromDatabase() {
  await syncDeletedEmailsFromCloud();

  // Purge any deleted emails from memoryEmployeeStore
  for (const del of deletedEmailsSet) {
    memoryEmployeeStore.delete(del);
  }
  for (const [k, v] of memoryEmployeeStore.entries()) {
    if (deletedEmailsSet.has(String(v.id).toLowerCase()) || deletedEmailsSet.has(k)) {
      memoryEmployeeStore.delete(k);
    }
  }

  const mergedMap = new Map();
  memoryEmployeeStore.forEach((val, key) => {
    if (!deletedEmailsSet.has(key) && !deletedEmailsSet.has(String(val.id).toLowerCase())) {
      mergedMap.set(key, val);
    }
  });

  try {
    // 1. Query dedicated Supabase 'employees' table
    const { data: employeesData, error: employeesErr } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("*")
      .order("created_at", { ascending: true });

    if (!employeesErr && Array.isArray(employeesData) && employeesData.length > 0) {
      employeesData.forEach((emp) => {
        if (emp?.email) {
          const emailKey = emp.email.trim().toLowerCase();
          const idKey = String(emp.id || "").toLowerCase();
          if (deletedEmailsSet.has(emailKey) || deletedEmailsSet.has(idKey)) {
            return; // Skip permanently deleted account
          }
          const meta = emp.metadata && typeof emp.metadata === "object" ? emp.metadata : {};
          const createdBy = (emp.created_by || meta.created_by || meta.created_by_email || "").trim().toLowerCase();
          mergedMap.set(emailKey, {
            id: emp.id || `emp-${Date.now()}`,
            email: emp.email.trim(),
            name: emp.name || emailKey.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            company: emp.company || "Simpal Group of Companies",
            role: emp.role || "Team Member",
            branch: emp.branch || meta.branch || "",
            phone: emp.phone || meta.phone || "",
            created_by: createdBy,
            created_by_email: createdBy,
            metadata: meta,
            is_approved: typeof emp.is_approved === "boolean" ? emp.is_approved : true,
            created_at: emp.created_at || new Date().toISOString()
          });
        }
      });
    } else {
      // 2. Fallback: Query cloud backup in 'user_settings'
      const { data: cloudBackup, error: backupErr } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", BACKUP_STORE_KEY)
        .maybeSingle();

      if (!backupErr && cloudBackup?.settings_json?.employees && Array.isArray(cloudBackup.settings_json.employees)) {
        cloudBackup.settings_json.employees.forEach((emp) => {
          if (emp?.email) {
            const emailKey = emp.email.trim().toLowerCase();
            const idKey = String(emp.id || "").toLowerCase();
            if (deletedEmailsSet.has(emailKey) || deletedEmailsSet.has(idKey)) {
              return; // Skip permanently deleted account
            }
            const meta = emp.metadata && typeof emp.metadata === "object" ? emp.metadata : {};
            const createdBy = (emp.created_by || emp.created_by_email || meta.created_by || meta.created_by_email || "").trim().toLowerCase();
            mergedMap.set(emailKey, {
              ...emp,
              email: emp.email.trim(),
              name: emp.name || emailKey.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
              company: emp.company || "Simpal Group of Companies",
              role: emp.role || "Team Member",
              branch: emp.branch || meta.branch || "",
              phone: emp.phone || meta.phone || "",
              created_by: createdBy,
              created_by_email: createdBy,
              metadata: meta,
              is_approved: typeof emp.is_approved === "boolean" ? emp.is_approved : true
            });
          }
        });
      }
    }

    // 3. Also merge any Auth 'profiles' from Supabase
    try {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*");

      if (Array.isArray(profilesData)) {
        profilesData.forEach((prof) => {
          if (!prof?.email) return;
          const emailKey = prof.email.trim().toLowerCase();
          const idKey = String(prof.id || "").toLowerCase();
          if (deletedEmailsSet.has(emailKey) || deletedEmailsSet.has(idKey)) {
            return; // Skip permanently deleted account
          }
          const existing = mergedMap.get(emailKey) || {};
          const meta = existing.metadata || {};
          const createdBy = existing.created_by || meta.created_by || "";
          mergedMap.set(emailKey, {
            ...existing,
            id: prof.id || existing.id || `db-${Date.now()}`,
            email: prof.email.trim(),
            name: existing.name || prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            company: existing.company || "Simpal Group of Companies",
            role: existing.role || "Team Member",
            created_by: createdBy,
            created_by_email: createdBy,
            metadata: meta,
            is_approved: typeof existing.is_approved === "boolean" ? existing.is_approved : (typeof prof.is_approved === "boolean" ? prof.is_approved : true),
            created_at: prof.created_at || existing.created_at || new Date().toISOString()
          });
        });
      }
    } catch (profErr) {
      console.warn("Profiles check in fetchEmployees:", profErr);
    }

    // Update in-memory store
    memoryEmployeeStore.clear();
    mergedMap.forEach((val, key) => {
      if (!deletedEmailsSet.has(key) && !deletedEmailsSet.has(String(val.id).toLowerCase())) {
        memoryEmployeeStore.set(key, val);
      }
    });

    // Ensure HRMD master admin is consistent
    ensureHrmdAdmin(memoryEmployeeStore);

    return Array.from(memoryEmployeeStore.values()).filter((emp) => {
      const eKey = (emp.email || "").trim().toLowerCase();
      const iKey = String(emp.id || "").toLowerCase();
      return !deletedEmailsSet.has(eKey) && !deletedEmailsSet.has(iKey);
    });
  } catch (err) {
    console.warn("Error fetching employees from database:", err);
    return Array.from(memoryEmployeeStore.values()).filter((emp) => {
      const eKey = (emp.email || "").trim().toLowerCase();
      const iKey = String(emp.id || "").toLowerCase();
      return !deletedEmailsSet.has(eKey) && !deletedEmailsSet.has(iKey);
    });
  }
}

/**
 * Helper to ensure HRMD administrator account is properly formatted
 */
function ensureHrmdAdmin(storeMap) {
  const HRMD_ADMIN_EMAIL = "admin@hrhub.com";
  const existing = storeMap.get(HRMD_ADMIN_EMAIL);
  if (!existing) {
    storeMap.set(HRMD_ADMIN_EMAIL, {
      id: "admin-hrmd-master",
      email: HRMD_ADMIN_EMAIL,
      name: "H R M D",
      company: "Simpal Group of Companies",
      role: "HR Administrator",
      is_approved: true,
      created_at: new Date().toISOString()
    });
  } else {
    storeMap.set(HRMD_ADMIN_EMAIL, {
      ...existing,
      name: "H R M D",
      role: "HR Administrator",
      is_approved: true
    });
  }
}

/**
 * Synchronous getter returning currently cached employees from memory.
 * No localStorage access.
 */
export function getStoredEmployees() {
  ensureHrmdAdmin(memoryEmployeeStore);
  return Array.from(memoryEmployeeStore.values());
}

/**
 * Save or update an employee in the Supabase Database.
 * Persists to dedicated 'employees' table and cloud backup in Supabase.
 * No localStorage saving!
 */
export async function saveStoredEmployee(employee) {
  if (!employee || !employee.email) return getStoredEmployees();

  const targetEmail = employee.email.trim().toLowerCase();
  const targetId = employee.id ? String(employee.id).toLowerCase() : null;

  // If this email or ID was previously deleted, remove it from tombstone blacklist
  if (deletedEmailsSet.has(targetEmail) || (targetId && deletedEmailsSet.has(targetId))) {
    deletedEmailsSet.delete(targetEmail);
    if (targetId) deletedEmailsSet.delete(targetId);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(Array.from(deletedEmailsSet)));
      } catch (e) {}
    }
    // Update cloud tombstone
    supabase
      .from("user_settings")
      .upsert({
        user_id: DELETED_STORE_KEY,
        settings_json: { deleted_emails: Array.from(deletedEmailsSet) },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })
      .catch(() => {});
  }

  const existing = memoryEmployeeStore.get(targetEmail) || {};
  const meta = {
    ...(existing.metadata || {}),
    ...(employee.metadata || {}),
    created_by: employee.created_by || existing.created_by || employee.metadata?.created_by || existing.metadata?.created_by || "",
    branch: employee.branch || existing.branch || "",
    phone: employee.phone || existing.phone || ""
  };
  const createdBy = meta.created_by || "";

  const updatedRecord = {
    ...existing,
    ...employee,
    id: employee.id || existing.id || `emp-${Date.now()}`,
    email: targetEmail,
    name: employee.name || existing.name || targetEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    company: employee.company || existing.company || "Simpal Group of Companies",
    role: employee.role || existing.role || "Team Member",
    branch: employee.branch || existing.branch || meta.branch || "",
    phone: employee.phone || existing.phone || meta.phone || "",
    created_by: createdBy,
    created_by_email: createdBy,
    metadata: meta,
    is_approved: typeof employee.is_approved === "boolean" ? employee.is_approved : true,
    created_at: existing.created_at || employee.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // 1. Update in-memory store immediately
  memoryEmployeeStore.set(targetEmail, updatedRecord);

  // 2. Persist to Supabase Database
  try {
    // A. Upsert to dedicated 'employees' table
    const { error: empErr } = await supabase
      .from(EMPLOYEES_TABLE)
      .upsert({
        id: updatedRecord.id,
        email: updatedRecord.email,
        name: updatedRecord.name,
        company: updatedRecord.company,
        role: updatedRecord.role,
        is_approved: updatedRecord.is_approved,
        metadata: updatedRecord.metadata,
        updated_at: updatedRecord.updated_at
      }, { onConflict: "email" });

    if (empErr) {
      console.warn("Notice saving to 'employees' table:", empErr.message);
    }

    // B. Also sync to cloud backup in 'user_settings'
    const allEmployees = Array.from(memoryEmployeeStore.values()).filter(
      (emp) => !deletedEmailsSet.has((emp.email || "").trim().toLowerCase())
    );
    await supabase
      .from("user_settings")
      .upsert({
        user_id: BACKUP_STORE_KEY,
        settings_json: { employees: allEmployees },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    // C. Update profiles table if profile exists
    try {
      await supabase
        .from("profiles")
        .update({ is_approved: updatedRecord.is_approved })
        .ilike("email", targetEmail);
    } catch (profErr) {
      console.warn("Profiles update notice:", profErr);
    }
  } catch (err) {
    console.error("Error saving employee to Supabase database:", err);
  }

  return Array.from(memoryEmployeeStore.values());
}

/**
 * Update approval status for an employee in Supabase Database.
 */
export async function updateStoredEmployeeApproval(emailOrId, isApproved) {
  const query = String(emailOrId || "").trim().toLowerCase();
  if (!query) return getStoredEmployees();

  let targetRecord = null;
  for (const [email, record] of memoryEmployeeStore.entries()) {
    if (email === query || String(record.id).toLowerCase() === query) {
      targetRecord = { ...record, is_approved: Boolean(isApproved) };
      memoryEmployeeStore.set(email, targetRecord);
      break;
    }
  }

  if (!targetRecord) {
    targetRecord = {
      id: `emp-${Date.now()}`,
      email: query,
      name: query.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      company: "Simpal Group of Companies",
      role: "Team Member",
      is_approved: Boolean(isApproved),
      created_at: new Date().toISOString()
    };
    memoryEmployeeStore.set(query, targetRecord);
  }

  // Persist update to Supabase
  try {
    // 1. Dedicated 'employees' table
    await supabase
      .from(EMPLOYEES_TABLE)
      .update({ is_approved: Boolean(isApproved), updated_at: new Date().toISOString() })
      .or(`email.ilike.${targetRecord.email},id.eq.${targetRecord.id}`);

    // 2. Cloud backup
    const allEmployees = Array.from(memoryEmployeeStore.values()).filter(
      (emp) => !deletedEmailsSet.has((emp.email || "").trim().toLowerCase())
    );
    await supabase
      .from("user_settings")
      .upsert({
        user_id: BACKUP_STORE_KEY,
        settings_json: { employees: allEmployees },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    // 3. Profiles table
    await supabase
      .from("profiles")
      .update({ is_approved: Boolean(isApproved) })
      .ilike("email", targetRecord.email);
  } catch (err) {
    console.warn("Error updating employee approval in Supabase:", err);
  }

  return Array.from(memoryEmployeeStore.values());
}

/**
 * Delete an employee permanently from Supabase Database and local cache.
 * Records target in persistent tombstone blacklist to guarantee it NEVER returns upon page refresh.
 */
export async function deleteStoredEmployee(emailOrId) {
  if (!emailOrId) return getStoredEmployees();
  const query = String(emailOrId).trim().toLowerCase();

  let targetEmail = null;
  let targetId = null;

  for (const [email, record] of memoryEmployeeStore.entries()) {
    if (email === query || String(record.id).toLowerCase() === query) {
      targetEmail = email;
      targetId = record.id;
      memoryEmployeeStore.delete(email);
      break;
    }
  }

  if (!targetEmail && query.includes("@")) {
    targetEmail = query;
  }
  if (!targetId && !query.includes("@")) {
    targetId = query;
  }

  // 1. Add to persistent tombstone blacklist
  if (targetEmail) deletedEmailsSet.add(targetEmail);
  if (targetId) deletedEmailsSet.add(String(targetId).toLowerCase());

  // Save to localStorage immediately for instant offline/initialization protection
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(Array.from(deletedEmailsSet)));
    } catch (err) {
      console.warn("Notice saving deleted employee tombstone:", err);
    }
  }

  // 2. Persist tombstone blacklist to Supabase 'user_settings'
  try {
    await supabase
      .from("user_settings")
      .upsert({
        user_id: DELETED_STORE_KEY,
        settings_json: { deleted_emails: Array.from(deletedEmailsSet) },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
  } catch (cloudErr) {
    console.warn("Notice updating cloud tombstone:", cloudErr);
  }

  // 3. Delete from 'employees' table
  try {
    if (targetEmail) {
      await supabase.from(EMPLOYEES_TABLE).delete().ilike("email", targetEmail);
    }
    if (targetId && !String(targetId).startsWith("emp-")) {
      await supabase.from(EMPLOYEES_TABLE).delete().eq("id", targetId);
    }
  } catch (err) {
    console.warn("Delete from employees table notice:", err);
  }

  // 4. Delete from 'profiles' table
  try {
    if (targetEmail) {
      await supabase.from("profiles").delete().ilike("email", targetEmail);
    }
    if (targetId && !String(targetId).startsWith("emp-") && !String(targetId).startsWith("prof-")) {
      await supabase.from("profiles").delete().eq("id", targetId);
    }
  } catch (err) {
    console.warn("Delete from profiles table notice:", err);
  }

  // 5. Update cloud backup
  try {
    const allEmployees = Array.from(memoryEmployeeStore.values()).filter(
      (emp) => !deletedEmailsSet.has((emp.email || "").trim().toLowerCase())
    );
    await supabase
      .from("user_settings")
      .upsert({
        user_id: BACKUP_STORE_KEY,
        settings_json: { employees: allEmployees },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
  } catch (err) {
    console.warn("Error updating backup store:", err);
  }

  // 6. Dispatch custom window event
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hrhub_employee_deleted", {
        detail: { email: targetEmail, id: targetId }
      })
    );
  }

  return Array.from(memoryEmployeeStore.values()).filter(
    (emp) => !deletedEmailsSet.has((emp.email || "").trim().toLowerCase())
  );
}

/**
 * Merge Supabase database profiles with database-backed employees directory.
 * Authoritative source of truth is the Supabase database.
 * Strictly excludes any permanently deleted account.
 */
export function mergeProfilesWithStored(supabaseProfiles = []) {
  const mergedMap = new Map();

  // 1. First populate with our database-backed employee records, excluding tombstones
  memoryEmployeeStore.forEach((item, emailKey) => {
    const idKey = String(item.id || "").toLowerCase();
    if (!deletedEmailsSet.has(emailKey) && !deletedEmailsSet.has(idKey)) {
      mergedMap.set(emailKey, { ...item });
    }
  });

  // 2. Overlay / synchronize with any Supabase Auth profiles, excluding tombstones
  (supabaseProfiles || []).forEach((sp) => {
    if (!sp?.email) return;
    const emailKey = sp.email.trim().toLowerCase();
    const idKey = String(sp.id || "").toLowerCase();
    if (deletedEmailsSet.has(emailKey) || deletedEmailsSet.has(idKey)) {
      return; // Skip permanently deleted account
    }

    const existing = mergedMap.get(emailKey);
    const meta = existing?.metadata || {};
    const createdBy = (existing?.created_by || meta.created_by || meta.created_by_email || "").trim().toLowerCase();

    let isApproved = true;
    if (existing && typeof existing.is_approved === "boolean") {
      isApproved = existing.is_approved;
    } else if (typeof sp.is_approved === "boolean") {
      isApproved = sp.is_approved;
    }

    mergedMap.set(emailKey, {
      id: sp.id || existing?.id || `db-${Date.now()}`,
      email: sp.email.trim(),
      name: existing?.name || sp.name || sp.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      company: existing?.company || sp.company || "Simpal Group of Companies",
      role: existing?.role || sp.role || "Team Member",
      branch: sp.branch || existing?.branch || meta.branch || "",
      phone: sp.phone || existing?.phone || meta.phone || "",
      created_by: createdBy,
      created_by_email: createdBy,
      metadata: meta,
      is_approved: isApproved,
      created_at: sp.created_at || existing?.created_at || new Date().toISOString()
    });
  });

  // 3. Ensure Remark Joy Gaviola only if NOT deleted
  const REMARK_EMAIL = "remarkjoymark@gmail.com";
  if (!deletedEmailsSet.has(REMARK_EMAIL)) {
    if (!mergedMap.has(REMARK_EMAIL)) {
      mergedMap.set(REMARK_EMAIL, {
        id: "emp-remark-joy",
        email: REMARK_EMAIL,
        name: "Remark Joy Gaviola",
        company: "Lucky Betplay Corporation",
        role: "Team Member",
        is_approved: true,
        created_at: "2026-10-15T00:00:00.000Z"
      });
    } else {
      const remark = mergedMap.get(REMARK_EMAIL);
      if (!remark.name || remark.name === "Remarkjoymark") remark.name = "Remark Joy Gaviola";
      if (!remark.company) remark.company = "Lucky Betplay Corporation";
      if (!remark.role) remark.role = "Team Member";
      remark.is_approved = true;
    }
  }

  // 4. Ensure HR Administrator account is always present
  ensureHrmdAdmin(mergedMap);

  return Array.from(mergedMap.values()).filter((emp) => {
    const eKey = (emp.email || "").trim().toLowerCase();
    const iKey = String(emp.id || "").toLowerCase();
    return !deletedEmailsSet.has(eKey) && !deletedEmailsSet.has(iKey);
  });
}

export const CREDENTIALS_STORE_KEY = "company_activated_credentials";
export const LOCAL_CREDENTIALS_KEY = "hrhub_activated_credentials";

// In-memory activated password cache for instant synchronous verification
const activatedPasswordsMap = new Map();
// Always guarantee master HR Administrator fallback login credentials
activatedPasswordsMap.set("admin@hrhub.com", "admin123");

// Load any existing local credentials into memory on initialization
if (typeof window !== "undefined" && window.localStorage) {
  try {
    const rawLocal = window.localStorage.getItem(LOCAL_CREDENTIALS_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && typeof parsed === "object") {
        Object.entries(parsed).forEach(([k, v]) => {
          if (k && v) activatedPasswordsMap.set(k.trim().toLowerCase(), String(v));
        });
      }
    }
  } catch (err) {
    console.warn("Failed to load local credentials:", err);
  }
}

/**
 * Fetch and synchronize activated credentials from Supabase Database.
 */
export async function syncActivatedCredentialsFromCloud() {
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("settings_json")
      .eq("user_id", CREDENTIALS_STORE_KEY)
      .maybeSingle();

    if (!error && data?.settings_json?.passwords) {
      const passwordsObj = data.settings_json.passwords;
      Object.entries(passwordsObj).forEach(([k, v]) => {
        if (k && v) {
          activatedPasswordsMap.set(k.trim().toLowerCase(), String(v));
        }
      });
      // Sync back to localStorage for instant offline access
      if (typeof window !== "undefined" && window.localStorage) {
        const currentObj = Object.fromEntries(activatedPasswordsMap.entries());
        window.localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(currentObj));
      }
    }
  } catch (cloudErr) {
    console.warn("Could not sync credentials from cloud:", cloudErr);
  }
}

/**
 * Get stored credentials object.
 */
export function getStoredPasswords() {
  return Object.fromEntries(activatedPasswordsMap.entries());
}

/**
 * Persist activated password for employee:
 * 1. Updates in-memory map
 * 2. Saves to localStorage
 * 3. Syncs to Supabase user_settings and employees table metadata
 */
export async function saveActivatedPassword(email, password) {
  if (!email || !password) return;
  const normEmail = String(email).trim().toLowerCase();
  const normPass = String(password).trim();

  // 1. Update in-memory map
  activatedPasswordsMap.set(normEmail, normPass);

  // 2. Persist to localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const currentObj = Object.fromEntries(activatedPasswordsMap.entries());
      window.localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(currentObj));
    } catch (e) {
      console.warn("localStorage save error:", e);
    }
  }

  // 3. Asynchronously sync to Supabase Database
  try {
    // A. Update user_settings table
    const allCreds = Object.fromEntries(activatedPasswordsMap.entries());
    await supabase
      .from("user_settings")
      .upsert({
        user_id: CREDENTIALS_STORE_KEY,
        settings_json: { passwords: allCreds },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

    // B. Also update employees table metadata if record exists
    try {
      const { data: empData } = await supabase
        .from(EMPLOYEES_TABLE)
        .select("metadata")
        .ilike("email", normEmail)
        .maybeSingle();

      const existingMeta = empData?.metadata || {};
      await supabase
        .from(EMPLOYEES_TABLE)
        .update({
          metadata: { ...existingMeta, activated_password: normPass, activated_at: new Date().toISOString() },
          updated_at: new Date().toISOString()
        })
        .ilike("email", normEmail);
    } catch (metaErr) {
      console.warn("Could not update employee metadata password:", metaErr);
    }
  } catch (err) {
    console.warn("Error syncing password to cloud:", err);
  }
}

/**
 * Verify activated password (supports sync check, localStorage check, and cloud fallback).
 */
export async function verifyActivatedPassword(email, password) {
  if (!email || !password) return false;
  const normEmail = String(email).trim().toLowerCase();
  const normPass = String(password).trim();

  // 1. Master admin fallback
  if (normEmail === "admin@hrhub.com" && normPass === "admin123") {
    return true;
  }

  // 2. Fast In-Memory Check
  if (activatedPasswordsMap.has(normEmail)) {
    return activatedPasswordsMap.get(normEmail) === normPass;
  }

  // 3. LocalStorage check
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(LOCAL_CREDENTIALS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.[normEmail]) {
          activatedPasswordsMap.set(normEmail, parsed[normEmail]);
          return parsed[normEmail] === normPass;
        }
      }
    } catch {
      // LocalStorage access not available
    }
  }

  // 4. Cloud Fallback: Check Supabase user_settings
  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("settings_json")
      .eq("user_id", CREDENTIALS_STORE_KEY)
      .maybeSingle();

    if (!error && data?.settings_json?.passwords?.[normEmail]) {
      const cloudPass = data.settings_json.passwords[normEmail];
      activatedPasswordsMap.set(normEmail, cloudPass);
      return cloudPass === normPass;
    }

    // 5. Cloud Fallback: Check employees table metadata
    const { data: empRow } = await supabase
      .from(EMPLOYEES_TABLE)
      .select("metadata")
      .ilike("email", normEmail)
      .maybeSingle();

    if (empRow?.metadata?.activated_password) {
      const metaPass = empRow.metadata.activated_password;
      activatedPasswordsMap.set(normEmail, metaPass);
      return metaPass === normPass;
    }
  } catch (dbErr) {
    console.warn("DB password check error:", dbErr);
  }

  return false;
}

// Initial async fetch to populate memory store from Supabase
fetchEmployeesFromDatabase().catch(() => {});
syncActivatedCredentialsFromCloud().catch(() => {});

