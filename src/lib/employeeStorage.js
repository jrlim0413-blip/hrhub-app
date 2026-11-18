
import { supabase } from "./supabase.js";

export const EMPLOYEES_TABLE = "employees";
export const BACKUP_STORE_KEY = "company_employee_directory";
export const DELETED_STORE_KEY = "company_deleted_employees";
export const LOCAL_DELETED_KEY = "hrhub_deleted_employee_emails";

const deletedEmailsSet = new Set();
deletedEmailsSet.add("efilfonimda@gmail.com");

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

const memoryEmployeeStore = new Map();

const INITIAL_DIRECTORY = [
  {
    id: "emp-remark-joy",
    email: "remarkjoymark@gmail.com",
    name: "Remark Joy Gaviola",
    company: "Lucky Betplay Corporation",
    role: "CUSTOMER SERVICE REPRESENTATIVE",
    birthday: "1994-08-16",
    is_approved: true,
    login_enabled: false,
    created_at: "2026-10-15T00:00:00.000Z",
    metadata: {
      birthday: "1994-08-16"
    }
  },
  {
    id: "e159a891-36ad-444c-b7d1-a991a2e0a8a7",
    email: "caquennie6@gmail.com",
    name: "Caquennie6",
    company: "Simpal Group of Companies",
    role: "Team Member",
    birthday: "1996-05-24",
    is_approved: true,
    login_enabled: true,
    created_at: "2026-10-09T13:45:51.365Z",
    metadata: {
      birthday: "1996-05-24"
    }
  },
  {
    id: "admin-hrmd-master",
    email: "admin@hrhub.com",
    name: "H R M D",
    company: "Simpal Group of Companies",
    role: "HR Administrator",
    birthday: "1990-01-01",
    is_approved: true,
    login_enabled: true,
    created_at: "2026-08-01T00:00:00.000Z",
    metadata: {
      birthday: "1990-01-01"
    }
  }
];

INITIAL_DIRECTORY.forEach((emp) => {
  const emailKey = emp.email.trim().toLowerCase();
  const idKey = String(emp.id || "").toLowerCase();
  if (!deletedEmailsSet.has(emailKey) && !deletedEmailsSet.has(idKey)) {
    memoryEmployeeStore.set(emailKey, emp);
  }
});

export function isEmployeeDeleted(emailOrId) {
  if (!emailOrId) return false;
  const q = String(emailOrId).trim().toLowerCase();
  return deletedEmailsSet.has(q);
}

export function isEmployeeLoginEnabled(emp) {
  if (!emp) return false;
  const email = (emp.email || "").trim().toLowerCase();
  if (email === "admin@hrhub.com" || email === "caquennie6@gmail.com") return true;

  if (typeof emp.login_enabled === "boolean") return emp.login_enabled;
  if (emp.metadata && typeof emp.metadata.login_enabled === "boolean") return emp.metadata.login_enabled;

  if (
    emp.is_preregistered ||
    emp.metadata?.is_preregistered ||
    emp.metadata?.pre_registered ||
    emp.status === "pre_registered"
  ) {
    return true;
  }

  const role = (emp.role || "").trim().toLowerCase();
  if (
    role.startsWith("hr admin") ||
    role === "hr administrator" ||
    role === "super administrator" ||
    role === "hr manager"
  ) {
    return true;
  }

  return false;
}

export function getDeletedEmails() {
  return Array.from(deletedEmailsSet);
}

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

syncDeletedEmailsFromCloud();

async function purgeLegacyLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const rawLegacy = window.localStorage.getItem("hrhub_employee_directory");
    if (rawLegacy) {
      try {
        const parsed = JSON.parse(rawLegacy);
        if (Array.isArray(parsed)) {
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
      window.localStorage.removeItem("hrhub_employee_directory");
    }

    window.localStorage.removeItem("hrhub_employee_passwords");
  } catch (err) {
    console.warn("LocalStorage purge notice:", err);
  }
}

purgeLegacyLocalStorage();

export async function fetchEmployeesFromDatabase() {
  await syncDeletedEmailsFromCloud();

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
            return;
          }
          const meta = emp.metadata && typeof emp.metadata === "object" ? emp.metadata : {};
          const createdBy = (emp.created_by || meta.created_by || meta.created_by_email || "").trim().toLowerCase();
          const loginEnabled = typeof emp.login_enabled === "boolean"
            ? emp.login_enabled
            : typeof meta.login_enabled === "boolean"
              ? meta.login_enabled
              : (emp.status === "pre_registered" || emailKey === "admin@hrhub.com");
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
            login_enabled: loginEnabled,
            metadata: { ...meta, login_enabled: loginEnabled },
            is_approved: typeof emp.is_approved === "boolean" ? emp.is_approved : true,
            created_at: emp.created_at || new Date().toISOString()
          });
        }
      });
    } else {
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
              return;
            }
            const meta = emp.metadata && typeof emp.metadata === "object" ? emp.metadata : {};
            const createdBy = (emp.created_by || emp.created_by_email || meta.created_by || meta.created_by_email || "").trim().toLowerCase();
            const loginEnabled = typeof emp.login_enabled === "boolean"
              ? emp.login_enabled
              : typeof meta.login_enabled === "boolean"
                ? meta.login_enabled
                : (emp.status === "pre_registered" || emailKey === "admin@hrhub.com");
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
              login_enabled: loginEnabled,
              metadata: { ...meta, login_enabled: loginEnabled },
              is_approved: typeof emp.is_approved === "boolean" ? emp.is_approved : true
            });
          }
        });
      }
    }

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
            return;
          }
          const existing = mergedMap.get(emailKey) || {};
          const meta = existing.metadata || {};
          const createdBy = existing.created_by || meta.created_by || "";
          const loginEnabled = typeof existing.login_enabled === "boolean"
            ? existing.login_enabled
            : typeof meta.login_enabled === "boolean"
              ? meta.login_enabled
              : (prof.status === "pre_registered" || emailKey === "admin@hrhub.com");
          mergedMap.set(emailKey, {
            ...existing,
            id: prof.id || existing.id || `db-${Date.now()}`,
            email: prof.email.trim(),
            name: existing.name || prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            company: existing.company || "Simpal Group of Companies",
            role: existing.role || "Team Member",
            created_by: createdBy,
            created_by_email: createdBy,
            login_enabled: loginEnabled,
            metadata: { ...meta, login_enabled: loginEnabled },
            is_approved: typeof existing.is_approved === "boolean" ? existing.is_approved : (typeof prof.is_approved === "boolean" ? prof.is_approved : true),
            created_at: prof.created_at || existing.created_at || new Date().toISOString()
          });
        });
      }
    } catch (profErr) {
      console.warn("Profiles check in fetchEmployees:", profErr);
    }

    memoryEmployeeStore.clear();
    mergedMap.forEach((val, key) => {
      if (!deletedEmailsSet.has(key) && !deletedEmailsSet.has(String(val.id).toLowerCase())) {
        memoryEmployeeStore.set(key, val);
      }
    });

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
      birthday: "1990-01-01",
      is_approved: true,
      login_enabled: true,
      created_at: new Date().toISOString(),
      metadata: {
        birthday: "1990-01-01"
      }
    });
  } else {
    storeMap.set(HRMD_ADMIN_EMAIL, {
      ...existing,
      name: "H R M D",
      role: "HR Administrator",
      birthday: existing.birthday || "1990-01-01",
      is_approved: true,
      login_enabled: true,
      metadata: {
        ...(existing.metadata || {}),
        birthday: existing.birthday || existing.metadata?.birthday || "1990-01-01"
      }
    });
  }
}

export function getStoredEmployees() {
  ensureHrmdAdmin(memoryEmployeeStore);
  return Array.from(memoryEmployeeStore.values());
}

export async function saveStoredEmployee(employee) {
  if (!employee || !employee.email) return getStoredEmployees();

  const targetEmail = employee.email.trim().toLowerCase();
  const targetId = employee.id ? String(employee.id).toLowerCase() : null;

  if (deletedEmailsSet.has(targetEmail) || (targetId && deletedEmailsSet.has(targetId))) {
    deletedEmailsSet.delete(targetEmail);
    if (targetId) deletedEmailsSet.delete(targetId);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(Array.from(deletedEmailsSet)));
      } catch (e) {}
    }
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
  const isLogin = typeof employee.login_enabled === "boolean"
    ? employee.login_enabled
    : typeof existing.login_enabled === "boolean"
      ? existing.login_enabled
      : typeof employee.metadata?.login_enabled === "boolean"
        ? employee.metadata.login_enabled
        : targetEmail === "admin@hrhub.com";

  const bday = employee.birthday || existing.birthday || employee.birthdate || employee.metadata?.birthday || existing.metadata?.birthday || "";

  const meta = {
    ...(existing.metadata || {}),
    ...(employee.metadata || {}),
    birthday: bday,
    login_enabled: isLogin,
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
    birthday: bday,
    created_by: createdBy,
    created_by_email: createdBy,
    login_enabled: isLogin,
    metadata: meta,
    is_approved: typeof employee.is_approved === "boolean" ? employee.is_approved : true,
    created_at: existing.created_at || employee.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  memoryEmployeeStore.set(targetEmail, updatedRecord);

  try {
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

  try {
    await supabase
      .from(EMPLOYEES_TABLE)
      .update({ is_approved: Boolean(isApproved), updated_at: new Date().toISOString() })
      .or(`email.ilike.${targetRecord.email},id.eq.${targetRecord.id}`);

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

    await supabase
      .from("profiles")
      .update({ is_approved: Boolean(isApproved) })
      .ilike("email", targetRecord.email);
  } catch (err) {
    console.warn("Error updating employee approval in Supabase:", err);
  }

  return Array.from(memoryEmployeeStore.values());
}

export async function updateStoredEmployeeLoginAccess(emailOrId, loginEnabled) {
  const query = String(emailOrId || "").trim().toLowerCase();
  if (!query) return getStoredEmployees();

  const isAllowed = Boolean(loginEnabled);
  const now = new Date().toISOString();
  let targetRecord = null;

  for (const [email, record] of memoryEmployeeStore.entries()) {
    if (email === query || String(record.id).toLowerCase() === query) {
      const effectiveAllowed = email === "admin@hrhub.com" ? true : isAllowed;
      const meta = { ...(record.metadata || {}), login_enabled: effectiveAllowed };
      targetRecord = {
        ...record,
        login_enabled: effectiveAllowed,
        metadata: meta,
        updated_at: now
      };
      memoryEmployeeStore.set(email, targetRecord);
      break;
    }
  }

  if (!targetRecord) return getStoredEmployees();

  try {
    let queryBuilder = supabase.from(EMPLOYEES_TABLE).update({
      metadata: targetRecord.metadata,
      updated_at: now
    });

    if (targetRecord.id && targetRecord.email) {
      queryBuilder = queryBuilder.or(`email.ilike.${targetRecord.email},id.eq.${targetRecord.id}`);
    } else if (targetRecord.email) {
      queryBuilder = queryBuilder.ilike("email", targetRecord.email);
    } else if (targetRecord.id) {
      queryBuilder = queryBuilder.eq("id", targetRecord.id);
    }

    const { error: patchErr } = await queryBuilder;
    if (patchErr) {
      console.warn("Notice updating employee metadata:", patchErr.message || patchErr);
    }

    const allEmployees = Array.from(memoryEmployeeStore.values()).filter(
      (emp) => !deletedEmailsSet.has((emp.email || "").trim().toLowerCase())
    );
    await supabase
      .from("user_settings")
      .upsert({
        user_id: BACKUP_STORE_KEY,
        settings_json: { employees: allEmployees },
        updated_at: now
      }, { onConflict: "user_id" });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hrhub_employees_updated", { detail: allEmployees }));
    }
  } catch (err) {
    console.warn("Notice updating login permission in cloud:", err);
  }

  return Array.from(memoryEmployeeStore.values());
}

export async function updateAllStoredEmployeesLoginAccess(loginEnabled) {
  const isAllowed = Boolean(loginEnabled);
  const now = new Date().toISOString();

  for (const [email, record] of memoryEmployeeStore.entries()) {
    if (email === "admin@hrhub.com") continue;
    const meta = { ...(record.metadata || {}), login_enabled: isAllowed };
    memoryEmployeeStore.set(email, {
      ...record,
      login_enabled: isAllowed,
      metadata: meta,
      updated_at: now
    });
  }

  const allEmployees = Array.from(memoryEmployeeStore.values()).filter(
    (emp) => !deletedEmailsSet.has((emp.email || "").trim().toLowerCase())
  );

  try {
    await supabase
      .from("user_settings")
      .upsert({
        user_id: BACKUP_STORE_KEY,
        settings_json: { employees: allEmployees },
        updated_at: now
      }, { onConflict: "user_id" });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hrhub_employees_updated", { detail: allEmployees }));
    }
  } catch (err) {
    console.warn("Notice bulk updating login permissions in cloud:", err);
  }

  return allEmployees;
}

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

  if (targetEmail) deletedEmailsSet.add(targetEmail);
  if (targetId) deletedEmailsSet.add(String(targetId).toLowerCase());

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(LOCAL_DELETED_KEY, JSON.stringify(Array.from(deletedEmailsSet)));
    } catch (err) {
      console.warn("Notice saving deleted employee tombstone:", err);
    }
  }

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

export function mergeProfilesWithStored(supabaseProfiles = []) {
  const mergedMap = new Map();

  memoryEmployeeStore.forEach((item, emailKey) => {
    const idKey = String(item.id || "").toLowerCase();
    if (!deletedEmailsSet.has(emailKey) && !deletedEmailsSet.has(idKey)) {
      mergedMap.set(emailKey, { ...item });
    }
  });

  (supabaseProfiles || []).forEach((sp) => {
    if (!sp?.email) return;
    const emailKey = sp.email.trim().toLowerCase();
    const idKey = String(sp.id || "").toLowerCase();
    if (deletedEmailsSet.has(emailKey) || deletedEmailsSet.has(idKey)) {
      return;
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

    const bday = sp.birthday || sp.birthdate || sp.birth_date || existing?.birthday || meta.birthday || "";
    const mergedMeta = {
      ...meta,
      birthday: bday
    };

    mergedMap.set(emailKey, {
      id: sp.id || existing?.id || `db-${Date.now()}`,
      email: sp.email.trim(),
      name: existing?.name || sp.name || sp.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      company: existing?.company || sp.company || "Simpal Group of Companies",
      role: existing?.role || sp.role || "Team Member",
      branch: sp.branch || existing?.branch || meta.branch || "",
      phone: sp.phone || existing?.phone || meta.phone || "",
      birthday: bday,
      created_by: createdBy,
      created_by_email: createdBy,
      metadata: mergedMeta,
      is_approved: isApproved,
      created_at: sp.created_at || existing?.created_at || new Date().toISOString()
    });
  });

  const REMARK_EMAIL = "remarkjoymark@gmail.com";
  if (!deletedEmailsSet.has(REMARK_EMAIL)) {
    if (!mergedMap.has(REMARK_EMAIL)) {
      mergedMap.set(REMARK_EMAIL, {
        id: "emp-remark-joy",
        email: REMARK_EMAIL,
        name: "Remark Joy Gaviola",
        company: "Lucky Betplay Corporation",
        role: "CUSTOMER SERVICE REPRESENTATIVE",
        birthday: "1994-08-16",
        is_approved: true,
        created_at: "2026-10-15T00:00:00.000Z",
        metadata: {
          birthday: "1994-08-16"
        }
      });
    } else {
      const remark = mergedMap.get(REMARK_EMAIL);
      if (!remark.name || remark.name === "Remarkjoymark") remark.name = "Remark Joy Gaviola";
      if (!remark.company) remark.company = "Lucky Betplay Corporation";
      if (!remark.role || remark.role === "Team Member") remark.role = "CUSTOMER SERVICE REPRESENTATIVE";
      if (!remark.birthday) remark.birthday = "1994-08-16";
      if (remark.metadata) remark.metadata.birthday = remark.birthday || "1994-08-16";
      remark.is_approved = true;
    }
  }

  ensureHrmdAdmin(mergedMap);

  return Array.from(mergedMap.values()).filter((emp) => {
    const eKey = (emp.email || "").trim().toLowerCase();
    const iKey = String(emp.id || "").toLowerCase();
    return !deletedEmailsSet.has(eKey) && !deletedEmailsSet.has(iKey);
  });
}

export const CREDENTIALS_STORE_KEY = "company_activated_credentials";
export const LOCAL_CREDENTIALS_KEY = "hrhub_activated_credentials";

const activatedPasswordsMap = new Map();
activatedPasswordsMap.set("admin@hrhub.com", "admin123");

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
      if (typeof window !== "undefined" && window.localStorage) {
        const currentObj = Object.fromEntries(activatedPasswordsMap.entries());
        window.localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(currentObj));
      }
    }
  } catch (cloudErr) {
    console.warn("Could not sync credentials from cloud:", cloudErr);
  }
}

export function getStoredPasswords() {
  return Object.fromEntries(activatedPasswordsMap.entries());
}

export async function saveActivatedPassword(email, password) {
  if (!email || !password) return;
  const normEmail = String(email).trim().toLowerCase();
  const normPass = String(password).trim();

  activatedPasswordsMap.set(normEmail, normPass);

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const currentObj = Object.fromEntries(activatedPasswordsMap.entries());
      window.localStorage.setItem(LOCAL_CREDENTIALS_KEY, JSON.stringify(currentObj));
    } catch (e) {
      console.warn("localStorage save error:", e);
    }
  }

  try {
    const allCreds = Object.fromEntries(activatedPasswordsMap.entries());
    await supabase
      .from("user_settings")
      .upsert({
        user_id: CREDENTIALS_STORE_KEY,
        settings_json: { passwords: allCreds },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });

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

export async function verifyActivatedPassword(email, password) {
  if (!email || !password) return false;
  const normEmail = String(email).trim().toLowerCase();
  const normPass = String(password).trim();

  if (normEmail === "admin@hrhub.com" && normPass === "admin123") {
    return true;
  }

  if (activatedPasswordsMap.has(normEmail)) {
    return activatedPasswordsMap.get(normEmail) === normPass;
  }

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
    }
  }

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

fetchEmployeesFromDatabase().catch(() => {});
syncActivatedCredentialsFromCloud().catch(() => {});

