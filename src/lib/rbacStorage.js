import { supabase } from "./supabase";

const STORAGE_KEY = "hrhub_rbac_capabilities_matrix_v2";

export const ROLE_TIERS = [
  {
    id: "system_admin",
    name: "SYSTEM ADMINISTRATOR",
    countText: "2 ACCOUNTS",
    accounts: ["QUEENNIE", "JAY"],
    color: "emerald",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
  },
  {
    id: "terminal_staff",
    name: "TERMINAL STAFF",
    countText: "2 ACCOUNTS",
    accounts: ["JERIC", "CATHRINA"],
    color: "teal",
    badgeBg: "bg-teal-50 text-teal-800 border-teal-200"
  },
  {
    id: "head_cashier",
    name: "HEAD CASHIER",
    countText: "1 ACCOUNTS",
    accounts: ["MARICEL"],
    color: "blue",
    badgeBg: "bg-blue-50 text-blue-800 border-blue-200"
  },
  {
    id: "branch_supervisor",
    name: "BRANCH SUPERVISOR",
    countText: "1 ACCOUNTS",
    accounts: ["DAWALIN"],
    color: "amber",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200"
  }
];

export const SPECIFIC_ACCOUNTS = [
  { id: "queennie", name: "Quennie Capuyan", badge: "QUEENNIE", roleTier: "system_admin", email: "caquennie6@gmail.com", company: "5A Royal Gaming OPC" },
  { id: "jay", name: "Jay Ryan Lim", badge: "JAY", roleTier: "system_admin", email: "jay@simpalgroup.com", company: "Simpal Group of Companies" },
  { id: "jeric", name: "Jeric", badge: "JERIC", roleTier: "terminal_staff", email: "jeric@luckybetplay.com", company: "Lucky Betplay Corporation" },
  { id: "cathrina", name: "Cathrina", badge: "CATHRINA", roleTier: "terminal_staff", email: "cathrina@luckybetplay.com", company: "Lucky Betplay Corporation" },
  { id: "maricel", name: "Maricel", badge: "MARICEL", roleTier: "head_cashier", email: "maricel@5aroyalgaming.com", company: "5A Royal Gaming OPC" },
  { id: "dawalin", name: "Dawalin", badge: "DAWALIN", roleTier: "branch_supervisor", email: "dawalin@5aroyalgaming.com", company: "5A Royal Gaming OPC" },
  { id: "remark_joy", name: "Remark Joy Gaviola", badge: "REMARK JOY", roleTier: "branch_supervisor", email: "remarkjoymark@gmail.com", company: "Lucky Betplay Corporation" },
  { id: "efilfonimda", name: "Efilfonimda", badge: "EFILFONIMDA", roleTier: "system_admin", email: "efilfonimda@gmail.com", company: "Simpal Group of Companies" }
];

export const WORKSPACE_TABS_CONFIG = [
  {
    id: "overview",
    label: "Consolidated Overview & KPIs Tab",
    code: "SIDEBAR MENU: OVERVIEW • VIEW_OVERVIEW",
    description: "Executive KPI dashboard showing live gross turnover, hit pay, system notices.",
    sidebarTabId: "home"
  },
  {
    id: "draw_reports",
    label: "Draw Gross & Turnover Reports Tab",
    code: "SIDEBAR MENU: DRAW REPORTS • VIEW_REPORTS",
    description: "Draw-by-draw financial reports, supervisor audit receipts, machine turnovers.",
    sidebarTabId: "gross"
  },
  {
    id: "users_rbac",
    label: "Users & RBAC Administration Tab",
    code: "SIDEBAR MENU: USERS & RBAC • MANAGE_USERS",
    description: "Workstation credential administration and Role Permission Matrix access.",
    sidebarTabId: "permission_matrix"
  },
  {
    id: "audit_logs",
    label: "Activity & Security Audit Log Tab",
    code: "SIDEBAR MENU: ACTIVITY LOG • AUDIT_LOGS",
    description: "Real-time security audit trail tracking logins, credential updates, and system events.",
    sidebarTabId: "sops"
  },
  {
    id: "commissions",
    label: "Agent Commissions & Supervisor Rates Tab",
    code: "SIDEBAR MENU: COMMISSIONS • MANAGE_COMMISSIONS",
    description: "Configure baseline agent commission rates per supervisor and branch overrides.",
    sidebarTabId: "gross"
  },
  {
    id: "incident_reports",
    label: "Incident Reports & Notice to Explain (NTE) Tab",
    code: "SIDEBAR MENU: INCIDENT REPORTS • INCIDENT_REPORTS",
    description: "Due process transmittal between Subsidiary Branches & Head Office (SGC).",
    sidebarTabId: "incident_reports"
  },
  {
    id: "memo",
    label: "Official Memo Generator Tab",
    code: "SIDEBAR MENU: MEMO GENERATOR • MEMO_NOTICES",
    description: "Generate and broadcast official company memos, policy updates, and executive notices.",
    sidebarTabId: "memo"
  },
  {
    id: "directory",
    label: "Employees & Agents Directory Tab",
    code: "SIDEBAR MENU: AGENTS & HR DIRECTORY • VIEW_DIRECTORY",
    description: "Enterprise personnel roster, contact registry, and branch assignment records.",
    sidebarTabId: "agents"
  },
  {
    id: "attendance",
    label: "Supervisors Attendance Tab",
    code: "SIDEBAR MENU: SUPERVISORS ATTENDANCE • ATTENDANCE",
    description: "Supervisor attendance tracking, on-site check-ins, and biometric audits.",
    sidebarTabId: "supervisors_attendance"
  }
];

export const IN_TAB_FEATURES_CONFIG = [
  {
    id: "print_remittance",
    label: "Print Remittance Statements",
    parentTab: "overview",
    belongsToLabel: "Overview Tab • Draw Reports Tab",
    description: "Generate official remittance statements and supervisor pay slips."
  },
  {
    id: "export_csv",
    label: "Export Financial Data (CSV)",
    parentTab: "draw_reports",
    belongsToLabel: "Draw Reports Tab",
    description: "Downloads raw tabulated draw receipts and supervisor index data in CSV format."
  },
  {
    id: "api_inspector",
    label: "Technical API Raw Inspector",
    parentTab: "overview",
    belongsToLabel: "Overview Tab",
    description: "Inspects live incoming API payloads and raw database rows."
  },
  {
    id: "provision_users",
    label: "Add & Provision User Credentials",
    parentTab: "users_rbac",
    belongsToLabel: "Users & RBAC Tab",
    description: "Allows provisioning new system users, passwords, branches, and roles."
  },
  {
    id: "override_commissions",
    label: "Modify & Override Commission Rates",
    parentTab: "commissions",
    belongsToLabel: "Commissions Tab",
    description: "Allows updating supervisor baseline rates and provisioning commission overrides."
  },
  {
    id: "issue_ir",
    label: "Issue Incident Report (IR) to Head Office",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports Tab",
    description: "Enables Branch HR & Supervisors to submit incident reports directly to SGC Head Office."
  },
  {
    id: "sgc_issue_nte",
    label: "Issue & Approve Official Notice to Explain (NTE)",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports Tab (Head Office SGC Exclusive)",
    description: "Authority to draft and issue official NTE citing Labor Code Art. 297 and Code of Conduct."
  },
  {
    id: "serve_nte",
    label: "Serve NTE to Employee on-site",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports Tab",
    description: "Permits printing and marking NTE as officially served to employee at branch."
  },
  {
    id: "log_explanation",
    label: "Log Employee Written Explanation",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports Tab",
    description: "Records submitted employee explanation and forwards to Head Office for ruling."
  },
  {
    id: "resolve_case",
    label: "Final Case Determination & Resolution",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports Tab (Head Office SGC Exclusive)",
    description: "Renders formal administrative penalty or case exoneration closure."
  }
];

// Initial default configuration strictly matching the user's reference screenshot
export const DEFAULT_ROLE_TIER_PERMISSIONS = {
  system_admin: {
    // Tabs
    overview: true,
    draw_reports: true,
    users_rbac: true,
    audit_logs: true,
    commissions: true,
    incident_reports: true,
    memo: true,
    directory: true,
    attendance: true,
    // Features
    print_remittance: true,
    export_csv: true,
    api_inspector: true,
    provision_users: true,
    override_commissions: true,
    issue_ir: true,
    sgc_issue_nte: true,
    serve_nte: true,
    log_explanation: true,
    resolve_case: true
  },
  terminal_staff: {
    // Tabs
    overview: true,
    draw_reports: true,
    users_rbac: false,
    audit_logs: false,
    commissions: true,
    incident_reports: true,
    memo: true,
    directory: true,
    attendance: false,
    // Features
    print_remittance: true,
    export_csv: true,
    api_inspector: true,
    provision_users: false, // parent tab disabled
    override_commissions: false,
    issue_ir: true,
    sgc_issue_nte: false,
    serve_nte: true,
    log_explanation: true,
    resolve_case: false
  },
  head_cashier: {
    // Tabs
    overview: true,
    draw_reports: true,
    users_rbac: false,
    audit_logs: false,
    commissions: true,
    incident_reports: true,
    memo: true,
    directory: true,
    attendance: false,
    // Features
    print_remittance: true,
    export_csv: true,
    api_inspector: true,
    provision_users: false, // parent tab disabled
    override_commissions: true,
    issue_ir: true,
    sgc_issue_nte: false,
    serve_nte: true,
    log_explanation: true,
    resolve_case: false
  },
  branch_supervisor: {
    // Tabs
    overview: true,
    draw_reports: true,
    users_rbac: false,
    audit_logs: true,
    commissions: true,
    incident_reports: true,
    memo: true,
    directory: true,
    attendance: true,
    // Features
    print_remittance: true,
    export_csv: true,
    api_inspector: true,
    provision_users: false,
    override_commissions: true,
    issue_ir: true,
    sgc_issue_nte: false,
    serve_nte: true,
    log_explanation: true,
    resolve_case: false
  }
};

/**
 * Load complete matrix data from localStorage
 */
export function getRbacMatrixData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.roleTiers) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[rbacStorage] Failed to read localStorage:", err);
  }

  // Generate initial state
  const initial = {
    roleTiers: JSON.parse(JSON.stringify(DEFAULT_ROLE_TIER_PERMISSIONS)),
    accountOverrides: {}, // overrides per specific account ID
    lastSyncedAt: new Date().toISOString()
  };
  saveRbacMatrixData(initial);
  return initial;
}

/**
 * Save matrix data to localStorage and dispatch update event
 */
export function saveRbacMatrixData(matrixData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrixData));
    window.dispatchEvent(new CustomEvent("hrhub_rbac_updated", { detail: matrixData }));
  } catch (err) {
    console.error("[rbacStorage] Failed to save localStorage:", err);
  }
}

/**
 * Reset matrix to standard factory defaults
 */
export function resetRbacMatrixToDefaults() {
  const defaults = {
    roleTiers: JSON.parse(JSON.stringify(DEFAULT_ROLE_TIER_PERMISSIONS)),
    accountOverrides: {},
    lastSyncedAt: new Date().toISOString()
  };
  saveRbacMatrixData(defaults);
  return defaults;
}

/**
 * Resolve effective capability for a specific role or account
 */
export function getEffectiveCapability(type, targetId, capId, matrixData = null) {
  const data = matrixData || getRbacMatrixData();

  if (type === "role") {
    const roleConfig = data.roleTiers[targetId] || DEFAULT_ROLE_TIER_PERMISSIONS[targetId] || {};
    return Boolean(roleConfig[capId]);
  }

  // Account specific
  if (type === "account") {
    const override = data.accountOverrides[targetId];
    if (override && typeof override[capId] === "boolean") {
      return override[capId];
    }
    // Fall back to account's role tier
    const acct = SPECIFIC_ACCOUNTS.find((a) => a.id === targetId);
    if (acct && acct.roleTier) {
      return getEffectiveCapability("role", acct.roleTier, capId, data);
    }
  }

  return false;
}

/**
 * Update single capability toggle
 */
export function toggleCapability(type, targetId, capId, nextValue) {
  const data = getRbacMatrixData();

  if (type === "role") {
    if (!data.roleTiers[targetId]) {
      data.roleTiers[targetId] = { ...(DEFAULT_ROLE_TIER_PERMISSIONS[targetId] || {}) };
    }
    data.roleTiers[targetId][capId] = nextValue;

    // If a tab is turned OFF, turn OFF its dependent features
    const tabItem = WORKSPACE_TABS_CONFIG.find((t) => t.id === capId);
    if (tabItem && !nextValue) {
      const childFeatures = IN_TAB_FEATURES_CONFIG.filter((f) => f.parentTab === capId);
      childFeatures.forEach((f) => {
        data.roleTiers[targetId][f.id] = false;
      });
    }
  } else if (type === "account") {
    if (!data.accountOverrides[targetId]) {
      data.accountOverrides[targetId] = {};
    }
    data.accountOverrides[targetId][capId] = nextValue;

    // If tab turned OFF
    const tabItem = WORKSPACE_TABS_CONFIG.find((t) => t.id === capId);
    if (tabItem && !nextValue) {
      const childFeatures = IN_TAB_FEATURES_CONFIG.filter((f) => f.parentTab === capId);
      childFeatures.forEach((f) => {
        data.accountOverrides[targetId][f.id] = false;
      });
    }
  }

  data.lastSyncedAt = new Date().toISOString();
  saveRbacMatrixData(data);
  return data;
}

/**
 * Check if current logged-in user can access a workspace tab
 */
export function isUserTabAllowed(user, tabKey) {
  if (!user) return true; // default lenient if user object not loaded

  // System admin by email is always permitted
  const email = (user.email || "").toLowerCase();
  if (email === "admin@hrhub.com" || email === "caquennie6@gmail.com" || email === "jay@simpalgroup.com") {
    return true;
  }

  const matrix = getRbacMatrixData();

  // 1. Check account override by email or name
  const matchAccount = SPECIFIC_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email || (user.name && user.name.toLowerCase().includes(a.id))
  );

  if (matchAccount) {
    return getEffectiveCapability("account", matchAccount.id, tabKey, matrix);
  }

  // 2. Check role tier
  const roleStr = (user.role || "").toLowerCase();
  let roleTier = "terminal_staff";
  if (roleStr.includes("admin") || roleStr.includes("manager")) roleTier = "system_admin";
  else if (roleStr.includes("cashier")) roleTier = "head_cashier";
  else if (roleStr.includes("supervisor")) roleTier = "branch_supervisor";

  return getEffectiveCapability("role", roleTier, tabKey, matrix);
}

/**
 * Check if current user is allowed to use a specific in-tab feature
 */
export function isUserFeatureAllowed(user, featureKey) {
  if (!user) return true;

  const email = (user.email || "").toLowerCase();
  if (email === "admin@hrhub.com" || email === "caquennie6@gmail.com") return true;

  const matrix = getRbacMatrixData();

  const matchAccount = SPECIFIC_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email || (user.name && user.name.toLowerCase().includes(a.id))
  );

  if (matchAccount) {
    return getEffectiveCapability("account", matchAccount.id, featureKey, matrix);
  }

  const roleStr = (user.role || "").toLowerCase();
  let roleTier = "terminal_staff";
  if (roleStr.includes("admin") || roleStr.includes("manager")) roleTier = "system_admin";
  else if (roleStr.includes("cashier")) roleTier = "head_cashier";
  else if (roleStr.includes("supervisor")) roleTier = "branch_supervisor";

  return getEffectiveCapability("role", roleTier, featureKey, matrix);
}

/**
 * Sync matrix to cloud (Supabase)
 */
export async function syncMatrixToCloud() {
  try {
    const data = getRbacMatrixData();
    if (supabase) {
      await supabase.from("organization_settings").upsert({
        key: "rbac_matrix",
        value: data,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });
    }
    return { success: true, timestamp: new Date().toLocaleTimeString() };
  } catch (err) {
    console.debug("[rbacStorage] Cloud sync fallback to local storage:", err?.message);
    return { success: true, timestamp: new Date().toLocaleTimeString(), fallback: true };
  }
}
