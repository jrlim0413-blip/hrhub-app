/**
 * employeeStorage.js
 * Persistent storage & synchronization helper for HrHub employee directory and account activation.
 * Bridges Supabase database records with local personnel registry to ensure zero data loss.
 */

const STORAGE_KEY = "hrhub_employee_directory";
const PASSWORDS_KEY = "hrhub_employee_passwords";

// Default pre-seeded company profiles for Simpal Group
const DEFAULT_PRE_SEEDED = [
  {
    id: "43eb7f87-a4e5-4e38-8c00-dcbdabd7b66b",
    email: "efilfonimda@gmail.com",
    name: "Efil Fonimda",
    company: "Simpal Group of Companies",
    role: "HR Manager",
    is_approved: true,
    created_at: "2026-08-12T00:33:27.743681+00:00"
  },
  {
    id: "d85b51e6-2631-4a8d-aba9-b0d8a85057e3",
    email: "jrlim0413@gmail.com",
    name: "Jay Ryan Lim",
    company: "Simpal Construction (SIMCON)",
    role: "Site Supervisor",
    is_approved: true,
    created_at: "2026-08-11T13:06:02.810151+00:00"
  }
];

/**
 * Retrieve all locally stored employee records from localStorage
 */
export function getStoredEmployees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRE_SEEDED));
      return DEFAULT_PRE_SEEDED;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PRE_SEEDED;
  } catch (err) {
    console.warn("Error reading employee storage:", err);
    return DEFAULT_PRE_SEEDED;
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
          created_at: employee.created_at || new Date().toISOString()
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
    const query = (emailOrId || "").trim().toLowerCase();
    
    const updated = current.map((item) => {
      const matchEmail = (item.email || "").trim().toLowerCase() === query;
      const matchId = String(item.id) === String(emailOrId);
      if (matchEmail || matchId) {
        return { ...item, is_approved: Boolean(isApproved) };
      }
      return item;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn("Error updating employee approval:", err);
    return [];
  }
}

/**
 * Merge Supabase database profiles with persistent stored employees
 * Ensures no pre-registered employee disappears when fetchProfiles runs.
 */
export function mergeProfilesWithStored(supabaseProfiles = []) {
  const stored = getStoredEmployees();
  const resultMap = new Map();

  // 1. Put stored employees first to guarantee all pre-registered users exist
  stored.forEach((item) => {
    if (item.email) {
      resultMap.set(item.email.toLowerCase(), { ...item });
    }
  });

  // 2. Overlay Supabase profiles
  (supabaseProfiles || []).forEach((sp) => {
    if (!sp?.email) return;
    const emailKey = sp.email.toLowerCase();
    const existing = resultMap.get(emailKey);

    if (existing) {
      resultMap.set(emailKey, {
        ...existing,
        id: sp.id || existing.id,
        // If Supabase has explicit is_approved, prefer local override if modified, or fallback to sp
        is_approved: typeof existing.is_approved === "boolean" ? existing.is_approved : sp.is_approved,
        created_at: sp.created_at || existing.created_at
      });
    } else {
      resultMap.set(emailKey, {
        id: sp.id || `db-${Date.now()}`,
        email: sp.email,
        name: sp.name || sp.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        company: sp.company || "Simpal Group of Companies",
        role: sp.role || "Team Member",
        is_approved: typeof sp.is_approved === "boolean" ? sp.is_approved : true,
        created_at: sp.created_at || new Date().toISOString()
      });
    }
  });

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
