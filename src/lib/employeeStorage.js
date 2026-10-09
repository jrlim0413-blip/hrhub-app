/**
 * employeeStorage.js
 * Persistent storage & synchronization helper for HrHub employee directory and account activation.
 * Bridges Supabase database records with local personnel registry to ensure zero data loss.
 */

const STORAGE_KEY = "hrhub_employee_directory";
const PASSWORDS_KEY = "hrhub_employee_passwords";

// No hardcoded mock profiles - Supabase database is single source of truth
const DEFAULT_PRE_SEEDED = [];

/**
 * Retrieve all locally stored employee records from localStorage
 */
export function getStoredEmployees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter out old legacy hardcoded dummy IDs if any were cached in user's browser
    const legacyMockIds = new Set([
      "43eb7f87-a4e5-4e38-8c00-dcbdabd7b66b",
      "d85b51e6-2631-4a8d-aba9-b0d8a85057e3"
    ]);
    const cleaned = parsed.filter((item) => !legacyMockIds.has(item?.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (err) {
    console.warn("Error reading employee storage:", err);
    return [];
  }
}

/**
 * Delete an employee from persistent storage by email or id
 */
export function deleteStoredEmployee(emailOrId) {
  if (!emailOrId) return [];
  try {
    const current = getStoredEmployees();
    const query = String(emailOrId).trim().toLowerCase();
    const updated = current.filter((item) => {
      const itemEmail = (item.email || "").trim().toLowerCase();
      const itemId = String(item.id || "").trim().toLowerCase();
      return itemEmail !== query && itemId !== query;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Also clear password for this email if stored
    const passwords = getStoredPasswords();
    if (passwords[query]) {
      delete passwords[query];
      localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
    }
    return updated;
  } catch (err) {
    console.warn("Error deleting employee from storage:", err);
    return [];
  }
}

/**
 * Save or update an employee in persistent storage
 */
export function saveStoredEmployee(employee) {
  try {
    const current = getStoredEmployees();
    const targetEmail = employee.email.trim().toLowerCase();
    
    // Check if already exists by email
    const index = current.findIndex(
      (e) => (e.email || "").trim().toLowerCase() === targetEmail
    );

    let updatedList;
    if (index >= 0) {
      // Update existing
      updatedList = current.map((item, i) =>
        i === index ? { ...item, ...employee, email: targetEmail } : item
      );
    } else {
      // Prepend new record
      updatedList = [
        {
          id: employee.id || `emp-${Date.now()}`,
          email: targetEmail,
          name: employee.name || targetEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          company: employee.company || "Simpal Group of Companies",
          role: employee.role || "Team Member",
          is_approved: typeof employee.is_approved === "boolean" ? employee.is_approved : true,
          created_at: employee.created_at || new Date().toISOString(),
          is_local_draft: true
        },
        ...current
      ];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    return updatedList;
  } catch (err) {
    console.error("Error saving employee to storage:", err);
    return [];
  }
}

/**
 * Update approval status for an employee by email or id
 */
export function updateStoredEmployeeApproval(emailOrId, isApproved) {
  try {
    const current = getStoredEmployees();
    const query = String(emailOrId || "").trim().toLowerCase();
    if (!query) return current;

    let found = false;
    const updated = current.map((item) => {
      const matchEmail = (item.email || "").trim().toLowerCase() === query;
      const matchId = String(item.id || "").trim().toLowerCase() === query;
      if (matchEmail || matchId) {
        found = true;
        return { ...item, is_approved: Boolean(isApproved) };
      }
      return item;
    });

    if (!found) {
      updated.push({
        id: `emp-${Date.now()}`,
        email: query,
        is_approved: Boolean(isApproved)
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Error updating employee approval:", err);
    return [];
  }
}

/**
 * Merge Supabase database profiles with persistent stored employees
 * Supabase profiles are the authoritative database source of truth.
 */
export function mergeProfilesWithStored(supabaseProfiles = []) {
  const stored = getStoredEmployees();
  const storedMap = new Map();
  stored.forEach((item) => {
    if (item?.email) {
      storedMap.set(item.email.trim().toLowerCase(), item);
    }
  });

  const resultMap = new Map();

  // 1. Real Supabase profiles
  (supabaseProfiles || []).forEach((sp) => {
    if (!sp?.email) return;
    const emailKey = sp.email.trim().toLowerCase();
    const localItem = storedMap.get(emailKey);

    // Prioritize explicit local approval state if modified, otherwise use Supabase
    let isApproved = true;
    if (localItem && typeof localItem.is_approved === "boolean") {
      isApproved = localItem.is_approved;
    } else if (typeof sp.is_approved === "boolean") {
      isApproved = sp.is_approved;
    }

    resultMap.set(emailKey, {
      id: sp.id || localItem?.id || `db-${Date.now()}`,
      email: sp.email.trim(),
      name: sp.name || localItem?.name || sp.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      company: sp.company || localItem?.company || "Simpal Group of Companies",
      role: sp.role || localItem?.role || "Team Member",
      is_approved: isApproved,
      created_at: sp.created_at || localItem?.created_at || new Date().toISOString()
    });
  });

  // 2. Overlay any active offline/local drafts
  stored.forEach((item) => {
    if (!item?.email) return;
    const emailKey = item.email.trim().toLowerCase();
    if (!resultMap.has(emailKey)) {
      resultMap.set(emailKey, { ...item });
    }
  });

  // 3. Ensure official HRMD (HR Administrator) account is always present for all team members
  const HRMD_ADMIN_EMAIL = "admin@hrhub.com";
  if (!resultMap.has(HRMD_ADMIN_EMAIL)) {
    resultMap.set(HRMD_ADMIN_EMAIL, {
      id: "admin-hrmd-master",
      email: HRMD_ADMIN_EMAIL,
      name: "H R M D",
      company: "Simpal Group of Companies",
      role: "HR Administrator",
      is_approved: true,
      created_at: new Date().toISOString()
    });
  } else {
    const adminRecord = resultMap.get(HRMD_ADMIN_EMAIL);
    if (adminRecord) {
      if (
        !adminRecord.name ||
        adminRecord.name === "Admin" ||
        adminRecord.name === "Super Administrator" ||
        adminRecord.name.toLowerCase() === "hrmd"
      ) {
        adminRecord.name = "H R M D";
      }
      if (!adminRecord.role || adminRecord.role === "Super Administrator") {
        adminRecord.role = "HR Administrator";
      }
      adminRecord.is_approved = true;
    }
  }

  return Array.from(resultMap.values());
}

/**
 * Password Management for Activated Accounts
 */
export function getStoredPasswords() {
  try {
    const raw = localStorage.getItem(PASSWORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveActivatedPassword(email, password) {
  try {
    const passwords = getStoredPasswords();
    passwords[email.trim().toLowerCase()] = password.trim();
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
  } catch (err) {
    console.warn("Error saving password:", err);
  }
}

export function verifyActivatedPassword(email, password) {
  try {
    const passwords = getStoredPasswords();
    const stored = passwords[email.trim().toLowerCase()];
    return stored && stored === password.trim();
  } catch {
    return false;
  }
}
