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
 * Synchronous SHA-256 hashing for local password storage.
 * Prevents plain-text passwords from being exposed in localStorage or DevTools.
 */
function hashPassword(str) {
  if (!str) return "";
  let s = String(str).trim();
  let k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef4a3f7, 0xc67178f2
  ];
  let h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  let bytes = [];
  for (let i = 0; i < s.length; i++) {
    let code = s.charCodeAt(i);
    if (code < 128) bytes.push(code);
    else if (code < 2048) bytes.push((code >> 6) | 192, (code & 63) | 128);
    else if (code < 65536) bytes.push((code >> 12) | 224, ((code >> 6) & 63) | 128, (code & 63) | 128);
    else bytes.push((code >> 18) | 240, ((code >> 12) & 63) | 128, ((code >> 6) & 63) | 128, (code & 63) | 128);
  }

  let bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);

  bytes.push(0, 0, 0, 0,
    (bitLen >>> 24) & 0xff,
    (bitLen >>> 16) & 0xff,
    (bitLen >>> 8) & 0xff,
    bitLen & 0xff
  );

  let w = new Array(64);
  for (let i = 0; i < bytes.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = (bytes[i + j * 4] << 24) | (bytes[i + j * 4 + 1] << 16) | (bytes[i + j * 4 + 2] << 8) | (bytes[i + j * 4 + 3]);
    }
    for (let j = 16; j < 64; j++) {
      let s0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^ ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^ (w[j - 15] >>> 3);
      let s1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^ ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hVal = h[7];

    for (let j = 0; j < 64; j++) {
      let S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      let ch = (e & f) ^ (~e & g);
      let temp1 = (hVal + S1 + ch + k[j] + w[j]) | 0;
      let S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      let maj = (a & b) ^ (a & c) ^ (b & c);
      let temp2 = (S0 + maj) | 0;

      hVal = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + hVal) | 0;
  }

  return h.map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
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
  if (!email || !password) return;
  try {
    const passwords = getStoredPasswords();
    passwords[email.trim().toLowerCase()] = hashPassword(password.trim());
    localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
  } catch (err) {
    console.warn("Error saving password:", err);
  }
}

export function verifyActivatedPassword(email, password) {
  if (!email || !password) return false;
  try {
    const passwords = getStoredPasswords();
    const emailKey = email.trim().toLowerCase();
    const storedVal = passwords[emailKey];
    if (!storedVal) return false;

    const inputHash = hashPassword(password.trim());

    if (storedVal === inputHash) {
      return true;
    }

    // Auto-migrate legacy plain-text stored password to SHA-256 hash
    if (storedVal === password.trim()) {
      passwords[emailKey] = inputHash;
      localStorage.setItem(PASSWORDS_KEY, JSON.stringify(passwords));
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
