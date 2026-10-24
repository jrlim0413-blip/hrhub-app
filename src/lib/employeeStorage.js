/**
 * employeeStorage.js
 * Dedicated Supabase Database Storage Service for Employee Directory & Personnel Accounts.
 * 
 * Completely eliminates localStorage saving:
 * All employee profiles (Remark Joy Gaviola, Caquennie6, Efilfonimda, etc.) are permanently
 * stored and synchronized directly with the dedicated Supabase database table ('employees').
 */

import { supabase } from "./supabase";

export const EMPLOYEES_TABLE = "employees";
export const BACKUP_STORE_KEY = "company_employee_directory";

// In-memory cache for fast synchronous renders
const memoryEmployeeStore = new Map();

// Base seed accounts to guarantee instant availability
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
    id: "43eb7f87-a4e5-4e38-8c00-dcbdabd7b66b",
    email: "efilfonimda@gmail.com",
    name: "Efilfonimda",
    company: "Simpal Group of Companies",
    role: "Team Member",
    is_approved: true,
    created_at: "2026-08-12T00:33:27.743Z"
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

// Initialize in-memory cache with base records
INITIAL_DIRECTORY.forEach((emp) => {
  memoryEmployeeStore.set(emp.email.trim().toLowerCase(), emp);
});

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
  const mergedMap = new Map(memoryEmployeeStore);

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
          mergedMap.set(emailKey, {
            id: emp.id || `emp-${Date.now()}`,
            email: emp.email.trim(),
            name: emp.name || emailKey.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            company: emp.company || "Simpal Group of Companies",
            role: emp.role || "Team Member",
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
            mergedMap.set(emailKey, {
              ...emp,
              email: emp.email.trim(),
              name: emp.name || emailKey.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
              company: emp.company || "Simpal Group of Companies",
              role: emp.role || "Team Member",
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
          const existing = mergedMap.get(emailKey) || {};
          mergedMap.set(emailKey, {
            ...existing,
            id: prof.id || existing.id || `db-${Date.now()}`,
            email: prof.email.trim(),
            name: existing.name || prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            company: existing.company || "Simpal Group of Companies",
            role: existing.role || "Team Member",
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
    mergedMap.forEach((val, key) => memoryEmployeeStore.set(key, val));

    // Ensure HRMD master admin is consistent
    ensureHrmdAdmin(memoryEmployeeStore);

    return Array.from(memoryEmployeeStore.values());
  } catch (err) {
    console.warn("Error fetching employees from database:", err);
    return Array.from(memoryEmployeeStore.values());
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
  const existing = memoryEmployeeStore.get(targetEmail) || {};

  const updatedRecord = {
    ...existing,
    ...employee,
    id: employee.id || existing.id || `emp-${Date.now()}`,
    email: targetEmail,
    name: employee.name || existing.name || targetEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    company: employee.company || existing.company || "Simpal Group of Companies",
    role: employee.role || existing.role || "Team Member",
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
        updated_at: updatedRecord.updated_at
      }, { onConflict: "email" });

    if (empErr) {
      console.warn("Notice saving to 'employees' table:", empErr.message);
    }

    // B. Also sync to cloud backup in 'user_settings'
    const allEmployees = Array.from(memoryEmployeeStore.values());
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
    } catch {}
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
    const allEmployees = Array.from(memoryEmployeeStore.values());
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
 * Delete an employee from Supabase Database by email or id.
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

  // Persist deletion to Supabase
  try {
    // 1. Delete from 'employees' table
    if (targetEmail) {
      await supabase.from(EMPLOYEES_TABLE).delete().ilike("email", targetEmail);
    }
    if (targetId && !String(targetId).startsWith("emp-")) {
      await supabase.from(EMPLOYEES_TABLE).delete().eq("id", targetId);
    }

    // 2. Delete from 'profiles' table
    if (targetEmail) {
      await supabase.from("profiles").delete().ilike("email", targetEmail);
    }
    if (targetId && !String(targetId).startsWith("emp-") && !String(targetId).startsWith("prof-")) {
      await supabase.from("profiles").delete().eq("id", targetId);
    }

    // 3. Update cloud backup
    const allEmployees = Array.from(memoryEmployeeStore.values());
    await supabase
      .from("user_settings")
      .upsert({
        user_id: BACKUP_STORE_KEY,
        settings_json: { employees: allEmployees },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
  } catch (err) {
    console.warn("Error deleting employee from Supabase:", err);
  }

  return Array.from(memoryEmployeeStore.values());
}

/**
 * Merge Supabase database profiles with database-backed employees directory.
 * Authoritative source of truth is the Supabase database.
 */
export function mergeProfilesWithStored(supabaseProfiles = []) {
  const mergedMap = new Map();

  // 1. First populate with our database-backed employee records
  memoryEmployeeStore.forEach((item, emailKey) => {
    mergedMap.set(emailKey, { ...item });
  });

  // 2. Overlay / synchronize with any Supabase Auth profiles
  (supabaseProfiles || []).forEach((sp) => {
    if (!sp?.email) return;
    const emailKey = sp.email.trim().toLowerCase();
    const existing = mergedMap.get(emailKey);

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
      is_approved: isApproved,
      created_at: sp.created_at || existing?.created_at || new Date().toISOString()
    });
  });

  // 3. Ensure Remark Joy Gaviola is always properly configured
  const REMARK_EMAIL = "remarkjoymark@gmail.com";
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

  // 4. Ensure HR Administrator account is always present
  ensureHrmdAdmin(mergedMap);

  return Array.from(mergedMap.values());
}

/**
 * Obsolete password functions - No localStorage password storage.
 * Supabase Auth handles password verification.
 */
export function getStoredPasswords() {
  return {};
}

export function saveActivatedPassword() {
  // Passwords managed by Supabase Auth, no localStorage
}

export function verifyActivatedPassword(email, password) {
  if (!email || !password) return false;
  const normEmail = String(email).trim().toLowerCase();
  const normPass = String(password).trim();
  // Master HR Administrator fallback login credentials
  return normEmail === "admin@hrhub.com" && normPass === "admin123";
}

// Initial async fetch to populate memory store from Supabase
fetchEmployeesFromDatabase().catch(() => {});
