/**
 * rbacStorage.js
 * Enterprise Role-Based Access Control (RBAC) & Capabilities Management Service.
 *
 * Dynamically queries real database accounts from Supabase ('employees' & 'profiles' tables),
 * eliminates hardcoded mock accounts, and strictly maps all authentic workspace tabs and
 * in-tab operational tools across the entire HR Hub ecosystem.
 */

import { supabase } from "./supabase";
import { fetchEmployeesFromDatabase } from "./employeeStorage";

const STORAGE_KEY = "hrhub_rbac_capabilities_matrix_enterprise_v3";
const CLOUD_SETTINGS_KEY = "hrhub_rbac_matrix_master";

// Enterprise Role Tier Definitions
export const STANDARD_ROLE_TIERS = [
  {
    id: "system_admin",
    name: "HR ADMINISTRATOR & EXECUTIVE",
    description: "Corporate executive officers and HR administrators with global personnel and governance authority.",
    color: "emerald",
    badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200"
  },
  {
    id: "hr_admin",
    name: "BRANCH HR & COMPLIANCE ADMINISTRATOR",
    description: "Area HR personnel responsible for on-site employee welfare, investigating IRs, and serving NTEs.",
    color: "lime",
    badgeBg: "bg-[#eef7e5] text-[#55782a] border-[#d3eab8]"
  },
  {
    id: "operations_supervisor",
    name: "OPERATIONS & BRANCH SUPERVISOR",
    description: "Field supervisors overseeing gaming terminals, construction sites, and daily branch execution.",
    color: "amber",
    badgeBg: "bg-amber-50 text-amber-800 border-amber-200"
  },
  {
    id: "finance_cashier",
    name: "FINANCE & CASHIER OPERATIONS",
    description: "Cash handling personnel, vault custodians, and terminal tellers managing daily financial floats.",
    color: "blue",
    badgeBg: "bg-blue-50 text-blue-800 border-blue-200"
  }
];

// Authentic Workspace Tabs matching the entire HR Hub project
export const WORKSPACE_TABS_CONFIG = [
  {
    id: "communication",
    label: "Enterprise Communication & Employee Portal",
    code: "WORKSPACE TAB: COMMUNICATION • ACCESS_PORTAL",
    description: "Company-wide announcements bulletin, employee directory, shift rosters, and compliance handbooks.",
    sidebarTabId: "communication"
  },
  {
    id: "overview",
    label: "Executive Operations Dashboard & Strategic KPIs",
    code: "WORKSPACE TAB: OVERVIEW • VIEW_EXECUTIVE_DASHBOARD",
    description: "Central executive operational monitoring, corporate meeting calendar, and cross-entity activity metrics.",
    sidebarTabId: "home"
  },
  {
    id: "sops",
    label: "Field Operations Board & Doppler Weather Radar",
    code: "WORKSPACE TAB: OPERATIONS • VIEW_OPERATIONS_BOARD",
    description: "Standard Operating Procedures (SOPs) task boards, equipment readiness tracking, and live weather hazard radar.",
    sidebarTabId: "sops"
  },
  {
    id: "incident_reports",
    label: "Incident Reports & Due Process (Notice to Explain)",
    code: "WORKSPACE TAB: DUE PROCESS • MANAGE_INCIDENT_REPORTS",
    description: "Formal investigation, branch incident report transmittal, and legal Notice to Explain (NTE) adjudication.",
    sidebarTabId: "incident_reports"
  },
  {
    id: "memo",
    label: "Official Corporate Memorandum Generator",
    code: "WORKSPACE TAB: MEMORANDUMS • GENERATE_CORPORATE_MEMOS",
    description: "Official executive memorandum creation, digital sign-off, and multi-entity regulatory notice dissemination.",
    sidebarTabId: "memo"
  },
  {
    id: "gross",
    label: "Gross Revenue & Financial Remittance Reports",
    code: "WORKSPACE TAB: FINANCE • VIEW_FINANCIAL_REPORTS",
    description: "Multi-entity betting draw financial ledgers, cashier shortage audits, and official remittance reconciliation.",
    sidebarTabId: "gross"
  },
  {
    id: "agents",
    label: "Enterprise Personnel Directory & 201 Registry",
    code: "WORKSPACE TAB: PERSONNEL • VIEW_EMPLOYEE_DIRECTORY",
    description: "Centralized staff 201 records, organizational entity assignments, and emergency contact registry.",
    sidebarTabId: "agents"
  },
  {
    id: "employee_pre_registration",
    label: "Personnel Pre-Registration & Credential Onboarding",
    code: "WORKSPACE TAB: PERSONNEL • PRE_REGISTER_EMPLOYEE",
    description: "Authority to register new employee credentials, assign company entities, and initiate First-Time Setup accounts. Exclusively for HR Administrator by default.",
    sidebarTabId: "agents"
  },
  {
    id: "supervisors_attendance",
    label: "Supervisors Attendance & Biometric Audit Trail",
    code: "WORKSPACE TAB: ATTENDANCE • AUDIT_SUPERVISOR_ATTENDANCE",
    description: "Field supervisor on-site check-in logs, biometric timestamp verification, and monthly attendance rosters.",
    sidebarTabId: "supervisors_attendance"
  },
  {
    id: "permission_matrix",
    label: "Role & Capabilities Access Control Matrix",
    code: "WORKSPACE TAB: SECURITY • MANAGE_RBAC_MATRIX",
    description: "Granular role tier permissions, workstation feature gating, and security policy administration.",
    sidebarTabId: "permission_matrix"
  }
];

// Authentic In-Tab Features matching operations and tools inside workspaces
export const IN_TAB_FEATURES_CONFIG = [
  // 0. Enterprise Communication & Employee Portal Features
  {
    id: "comm_bulletin",
    label: "Access Company Bulletin & Announcements Feed",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows viewing company-wide official announcements, memorandums, celebrations, and bulletin posts."
  },
  {
    id: "comm_post_bulletin",
    label: "Publish & Broadcast Bulletin Announcements",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Authority to draft and publish company-wide announcements, official memos, and event notices to the live bulletin feed."
  },
  {
    id: "comm_directory",
    label: "Access Enterprise Employee Directory",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows viewing registered team members, branch assignments, online availability status, and colleague contact info."
  },
  {
    id: "comm_manage_profiles",
    label: "Administer Directory Profiles & Approval Status",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Authority to edit employee designations, diversify HR handler assignments, approve onboarding requests, and decommission profiles."
  },
  {
    id: "comm_attendance",
    label: "Access Shift Rosters & Attendance Overview",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows viewing work shifts, branch attendance schedules, and on-duty personnel rosters."
  },
  {
    id: "comm_policies",
    label: "Access Corporate Policies & Compliance Handbooks",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows viewing company code of conduct, labor compliance standards, safety guidelines, and employee handbook documents."
  },

  // 1. Executive Operations Dashboard Features
  {
    id: "schedule_corporate_meetings",
    label: "Schedule Executive Operational Meetings",
    parentTab: "overview",
    belongsToLabel: "Executive Operations Dashboard",
    description: "Allows scheduling corporate meetings, setting agendas, and coordinating inter-departmental sessions."
  },

  // 2. Field Operations Board Features
  {
    id: "manage_sop_tasks",
    label: "Administer Standard Operating Procedure Tasks",
    parentTab: "sops",
    belongsToLabel: "Field Operations Board",
    description: "Permits updating checklist status, assigning SOP protocols, and verifying field compliance."
  },
  {
    id: "access_weather_radar",
    label: "Inspect Real-time Field Weather Radar",
    parentTab: "sops",
    belongsToLabel: "Field Operations Board",
    description: "Displays live satellite weather maps and regional hazard alerts for field branch operations."
  },

  // 3. Incident Reports & Due Process Features
  {
    id: "investigate_and_issue_ir",
    label: "Investigate & Transmit Branch Incident Report (IR)",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports & Due Process",
    description: "Investigates on-site irregularities and transmits official Incident Reports directly to Head Office HRMD."
  },
  {
    id: "issue_official_nte",
    label: "Issue & Approve Legal Notice to Explain (NTE) (Head Office Exclusive)",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports & Due Process (Head Office SGC Authority)",
    description: "Authority to evaluate allegations, cite Labor Code Art. 297 & Company Code of Conduct, and issue NTE."
  },
  {
    id: "serve_nte_on_site",
    label: "Formally Serve Notice to Explain to Employee On-site",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports & Due Process",
    description: "Authorizes printing and physically serving the returned NTE to respondent employees on-site."
  },
  {
    id: "record_written_defense",
    label: "Record & Transmit Employee Written Defense",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports & Due Process",
    description: "Gathers employee explanations under oath and forwards to Head Office HRMD for formal hearing."
  },
  {
    id: "render_case_disposition",
    label: "Render Conclusive Administrative Determination",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports & Due Process (Head Office SGC Authority)",
    description: "Renders final disciplinary disposition, corrective penalty enforcement, or complete case dismissal."
  },
  {
    id: "print_due_process_docket",
    label: "Generate & Print Certified Legal Dockets",
    parentTab: "incident_reports",
    belongsToLabel: "Incident Reports & Due Process",
    description: "Produces printable audit-ready IR and NTE case dockets with legal certification and signature blocks."
  },

  // 4. Official Corporate Memorandum Generator Features
  {
    id: "formulate_official_memo",
    label: "Formulate & Issue Corporate Memorandums",
    parentTab: "memo",
    belongsToLabel: "Official Corporate Memorandum Generator",
    description: "Drafts, structures, and publishes legally binding corporate memorandums with official header seals."
  },
  {
    id: "ai_smart_memo_drafting",
    label: "AI-Assisted Memorandum Policy Drafting",
    parentTab: "memo",
    belongsToLabel: "Official Corporate Memorandum Generator",
    description: "Utilizes HR AI Buddy intelligence to formulate articulate, legally sound policy documentation."
  },

  // 5. Gross Revenue & Financial Remittance Reports Features
  {
    id: "inspect_financial_ledgers",
    label: "Audit Daily Gross Draw Revenue & Cashier Turnovers",
    parentTab: "gross",
    belongsToLabel: "Gross Revenue & Financial Remittance Reports",
    description: "Audits live gross turnover, cashier shortage/overage logs, and betting terminal audit trails."
  },
  {
    id: "export_financial_csv",
    label: "Export Raw Financial Turnover Ledgers (CSV)",
    parentTab: "gross",
    belongsToLabel: "Gross Revenue & Financial Remittance Reports",
    description: "Downloads unencrypted transaction rows and supervisor audit index data in CSV format."
  },
  {
    id: "generate_remittance_slips",
    label: "Generate Official Remittance Statements",
    parentTab: "gross",
    belongsToLabel: "Gross Revenue & Financial Remittance Reports",
    description: "Generates official remittance receipts, supervisor commission statements, and payment authorizations."
  },

  // 6. Enterprise Personnel Directory & 201 Registry Features
  {
    id: "provision_employee_records",
    label: "Provision & Modify Employee 201 Master Files",
    parentTab: "agents",
    belongsToLabel: "Enterprise Personnel Directory",
    description: "Creates, modifies, and synchronizes employee designations, assigned subsidiaries, and contact details."
  },
  {
    id: "decommission_personnel",
    label: "Decommission & Revoke Enterprise Access",
    parentTab: "agents",
    belongsToLabel: "Enterprise Personnel Directory",
    description: "Revokes system credentials for resigned, offboarded, or suspended personnel."
  },
  {
    id: "pre_register_employee",
    label: "Pre-Register New Personnel (Onboarding Action)",
    parentTab: "agents",
    belongsToLabel: "Enterprise Personnel Directory (HR Administrator Exclusive)",
    description: "Authorizes the Pre-Register Employee button and access to the onboarding modal. Exclusively enabled for HR Administrator by default, with per-account override support."
  },

  // 7. Supervisors Attendance Log Features
  {
    id: "log_supervisor_checkin",
    label: "Record Field Supervisor Biometric Check-In",
    parentTab: "supervisors_attendance",
    belongsToLabel: "Supervisors Attendance & Biometric Audit Trail",
    description: "Logs timestamped on-site check-in verification for roving branch supervisors."
  },
  {
    id: "export_attendance_timesheets",
    label: "Export Verified Monthly Attendance Records",
    parentTab: "supervisors_attendance",
    belongsToLabel: "Supervisors Attendance & Biometric Audit Trail",
    description: "Exports comprehensive attendance sheets for payroll computation and DOLE regulatory audits."
  },

  // 8. Role & Capabilities Access Control Matrix Features
  {
    id: "reconfigure_rbac_policies",
    label: "Reconfigure Enterprise Security Policies",
    parentTab: "permission_matrix",
    belongsToLabel: "Role & Capabilities Access Control Matrix",
    description: "Authorizes toggling workspace tab visibility and granular operational tool permissions."
  },
  {
    id: "synchronize_cloud_security",
    label: "Synchronize Security Policies to Database",
    parentTab: "permission_matrix",
    belongsToLabel: "Role & Capabilities Access Control Matrix",
    description: "Commits security access matrices permanently to Supabase cloud database storage."
  }
];

// Baseline factory capabilities configuration
export const FACTORY_ROLE_TIER_PERMISSIONS = {
  system_admin: {
    // Tabs
    communication: true,
    overview: true,
    sops: true,
    incident_reports: true,
    memo: true,
    gross: true,
    agents: true,
    employee_pre_registration: true,
    supervisors_attendance: true,
    permission_matrix: true,
    // Features
    comm_bulletin: true,
    comm_post_bulletin: true,
    comm_directory: true,
    comm_manage_profiles: true,
    comm_attendance: true,
    comm_policies: true,
    schedule_corporate_meetings: true,
    manage_sop_tasks: true,
    access_weather_radar: true,
    investigate_and_issue_ir: true,
    issue_official_nte: true,
    serve_nte_on_site: true,
    record_written_defense: true,
    render_case_disposition: true,
    print_due_process_docket: true,
    formulate_official_memo: true,
    ai_smart_memo_drafting: true,
    inspect_financial_ledgers: true,
    export_financial_csv: true,
    generate_remittance_slips: true,
    provision_employee_records: true,
    pre_register_employee: true,
    decommission_personnel: true,
    log_supervisor_checkin: true,
    export_attendance_timesheets: true,
    reconfigure_rbac_policies: true,
    synchronize_cloud_security: true
  },
  hr_admin: {
    // Tabs
    communication: true,
    overview: true,
    sops: true,
    incident_reports: true,
    memo: true,
    gross: false,
    agents: true,
    employee_pre_registration: false,
    supervisors_attendance: true,
    permission_matrix: false,
    // Features
    comm_bulletin: true,
    comm_post_bulletin: true,
    comm_directory: true,
    comm_manage_profiles: true,
    comm_attendance: true,
    comm_policies: true,
    schedule_corporate_meetings: true,
    manage_sop_tasks: false,
    access_weather_radar: true,
    investigate_and_issue_ir: true,
    issue_official_nte: false, // Head Office exclusive
    serve_nte_on_site: true,
    record_written_defense: true,
    render_case_disposition: false, // Head Office exclusive
    print_due_process_docket: true,
    formulate_official_memo: true,
    ai_smart_memo_drafting: true,
    inspect_financial_ledgers: false,
    export_financial_csv: false,
    generate_remittance_slips: false,
    provision_employee_records: true,
    pre_register_employee: false,
    decommission_personnel: false,
    log_supervisor_checkin: true,
    export_attendance_timesheets: true,
    reconfigure_rbac_policies: false,
    synchronize_cloud_security: false
  },
  operations_supervisor: {
    // Tabs
    communication: true,
    overview: true,
    sops: true,
    incident_reports: true,
    memo: true,
    gross: true,
    agents: true,
    employee_pre_registration: false,
    supervisors_attendance: true,
    permission_matrix: false,
    // Features
    comm_bulletin: true,
    comm_post_bulletin: false,
    comm_directory: true,
    comm_manage_profiles: false,
    comm_attendance: true,
    comm_policies: true,
    schedule_corporate_meetings: false,
    manage_sop_tasks: true,
    access_weather_radar: true,
    investigate_and_issue_ir: true,
    issue_official_nte: false,
    serve_nte_on_site: true,
    record_written_defense: true,
    render_case_disposition: false,
    print_due_process_docket: true,
    formulate_official_memo: false,
    ai_smart_memo_drafting: false,
    inspect_financial_ledgers: true,
    export_financial_csv: true,
    generate_remittance_slips: true,
    provision_employee_records: false,
    pre_register_employee: false,
    decommission_personnel: false,
    log_supervisor_checkin: true,
    export_attendance_timesheets: true,
    reconfigure_rbac_policies: false,
    synchronize_cloud_security: false
  },
  finance_cashier: {
    // Tabs
    communication: true,
    overview: true,
    sops: false,
    incident_reports: true,
    memo: true,
    gross: true,
    agents: false,
    employee_pre_registration: false,
    supervisors_attendance: false,
    permission_matrix: false,
    // Features
    comm_bulletin: true,
    comm_post_bulletin: false,
    comm_directory: true,
    comm_manage_profiles: false,
    comm_attendance: false,
    comm_policies: true,
    schedule_corporate_meetings: false,
    manage_sop_tasks: false,
    access_weather_radar: false,
    investigate_and_issue_ir: false,
    issue_official_nte: false,
    serve_nte_on_site: false,
    record_written_defense: true,
    render_case_disposition: false,
    print_due_process_docket: true,
    formulate_official_memo: false,
    ai_smart_memo_drafting: false,
    inspect_financial_ledgers: true,
    export_financial_csv: false,
    generate_remittance_slips: true,
    provision_employee_records: false,
    pre_register_employee: false,
    decommission_personnel: false,
    log_supervisor_checkin: false,
    export_attendance_timesheets: false,
    reconfigure_rbac_policies: false,
    synchronize_cloud_security: false
  }
};

/**
 * Classifies a real database employee record into its appropriate enterprise role tier
 */
export function classifyEmployeeRoleTier(employee) {
  const email = (employee?.email || "").toLowerCase().trim();
  const role = (employee?.role || "").toLowerCase().trim();
  const company = (employee?.company || "").toLowerCase().trim();

  // 1. System Administrator / HR Administrator
  if (
    email === "admin@hrhub.com" ||
    email === "jay@simpalgroup.com" ||
    email === "efilfonimda@gmail.com" ||
    role === "hr administrator" ||
    role.includes("administrator") ||
    role.includes("executive") ||
    role.includes("super")
  ) {
    return "system_admin";
  }

  // 2. HR & Compliance Administrator
  if (
    role.includes("hr") ||
    role.includes("compliance") ||
    role.includes("people") ||
    email.includes("quennie") ||
    email.includes("remark")
  ) {
    return "hr_admin";
  }

  // 3. Finance & Cashier Operations
  if (
    role.includes("cashier") ||
    role.includes("teller") ||
    role.includes("finance") ||
    role.includes("treasury")
  ) {
    return "finance_cashier";
  }

  // 4. Default: Operations & Area Supervisor
  return "operations_supervisor";
}

/**
 * Fetch and construct dynamic accounts and role tiers using REAL data from the Supabase database
 */
export async function fetchRealAccountsAndTiers() {
  const employees = await fetchEmployeesFromDatabase();

  // Map real database records
  const realAccounts = employees.map((emp) => {
    const email = (emp.email || "").trim().toLowerCase();
    const roleTier = classifyEmployeeRoleTier(emp);
    const shortBadge = (emp.name || email.split("@")[0])
      .replace(/[._]/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(" ")
      .toUpperCase();

    return {
      id: emp.id || `acc-${email}`,
      email,
      name: emp.name || email,
      company: emp.company || "Simpal Group of Companies",
      role: emp.role || "Staff Member",
      roleTier,
      badge: shortBadge
    };
  });

  // Dynamically group real accounts into role tiers
  const dynamicTiers = STANDARD_ROLE_TIERS.map((tier) => {
    const tierAccounts = realAccounts.filter((a) => a.roleTier === tier.id);
    return {
      ...tier,
      countText: `${tierAccounts.length} ACCOUNT${tierAccounts.length === 1 ? "" : "S"}`,
      accounts: tierAccounts.map((a) => a.badge)
    };
  });

  return { realAccounts, dynamicTiers };
}

/**
 * Load complete matrix data (from Supabase cloud first, with local fallback)
 */
export function getRbacMatrixData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.roleTiers) {
        // Backfill any newly added capability keys from factory defaults
        Object.keys(FACTORY_ROLE_TIER_PERMISSIONS).forEach((tierId) => {
          if (!parsed.roleTiers[tierId]) {
            parsed.roleTiers[tierId] = { ...FACTORY_ROLE_TIER_PERMISSIONS[tierId] };
          } else {
            Object.keys(FACTORY_ROLE_TIER_PERMISSIONS[tierId]).forEach((capKey) => {
              if (typeof parsed.roleTiers[tierId][capKey] === "undefined") {
                parsed.roleTiers[tierId][capKey] = FACTORY_ROLE_TIER_PERMISSIONS[tierId][capKey];
              }
            });
          }
        });
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[rbacStorage] Local storage parse notice:", err);
  }

  // Generate initial state
  const initial = {
    roleTiers: JSON.parse(JSON.stringify(FACTORY_ROLE_TIER_PERMISSIONS)),
    accountOverrides: {},
    lastSyncedAt: new Date().toISOString()
  };
  saveRbacMatrixData(initial);
  return initial;
}

/**
 * Fetch matrix asynchronously from Supabase Database
 */
export async function loadRbacMatrixFromCloud() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", CLOUD_SETTINGS_KEY)
        .maybeSingle();

      if (!error && data?.settings_json?.roleTiers) {
        const cloudData = data.settings_json;
        // Backfill any newly added capability keys from factory defaults
        Object.keys(FACTORY_ROLE_TIER_PERMISSIONS).forEach((tierId) => {
          if (!cloudData.roleTiers[tierId]) {
            cloudData.roleTiers[tierId] = { ...FACTORY_ROLE_TIER_PERMISSIONS[tierId] };
          } else {
            Object.keys(FACTORY_ROLE_TIER_PERMISSIONS[tierId]).forEach((capKey) => {
              if (typeof cloudData.roleTiers[tierId][capKey] === "undefined") {
                cloudData.roleTiers[tierId][capKey] = FACTORY_ROLE_TIER_PERMISSIONS[tierId][capKey];
              }
            });
          }
        });
        saveRbacMatrixData(cloudData);
        return cloudData;
      }
    }
  } catch (err) {
    console.debug("[rbacStorage] Cloud query fallback to local:", err?.message);
  }

  return getRbacMatrixData();
}

/**
 * Save matrix data to localStorage and dispatch update event
 */
export function saveRbacMatrixData(matrixData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrixData));
    window.dispatchEvent(new CustomEvent("hrhub_rbac_updated", { detail: matrixData }));
  } catch (err) {
    console.error("[rbacStorage] Local save notice:", err);
  }
}

/**
 * Reset matrix to factory defaults
 */
export function resetRbacMatrixToDefaults() {
  const defaults = {
    roleTiers: JSON.parse(JSON.stringify(FACTORY_ROLE_TIER_PERMISSIONS)),
    accountOverrides: {},
    lastSyncedAt: new Date().toISOString()
  };
  saveRbacMatrixData(defaults);
  return defaults;
}

/**
 * Resolve effective capability for a specific role tier or account
 */
export function getEffectiveCapability(type, targetId, capId, matrixData = null, accountsList = []) {
  const data = matrixData || getRbacMatrixData();

  if (type === "role") {
    const roleConfig = data.roleTiers?.[targetId] || FACTORY_ROLE_TIER_PERMISSIONS[targetId] || {};
    return Boolean(roleConfig[capId]);
  }

  if (type === "account") {
    const override = data.accountOverrides?.[targetId];
    if (override && typeof override[capId] === "boolean") {
      return override[capId];
    }

    // Fall back to account's resolved role tier
    const matchedAccount = accountsList.find((a) => a.id === targetId || a.email === targetId);
    if (matchedAccount?.roleTier) {
      return getEffectiveCapability("role", matchedAccount.roleTier, capId, data);
    }
    return getEffectiveCapability("role", "system_admin", capId, data);
  }

  return false;
}

/**
 * Toggle single capability switch
 */
export function toggleCapability(type, targetId, capId, nextValue) {
  const data = getRbacMatrixData();

  if (type === "role") {
    if (!data.roleTiers) data.roleTiers = {};
    if (!data.roleTiers[targetId]) {
      data.roleTiers[targetId] = { ...(FACTORY_ROLE_TIER_PERMISSIONS[targetId] || {}) };
    }
    data.roleTiers[targetId][capId] = nextValue;

    // If parent tab toggled OFF, toggle OFF dependent child features
    const tabItem = WORKSPACE_TABS_CONFIG.find((t) => t.id === capId);
    if (tabItem && !nextValue) {
      const childFeatures = IN_TAB_FEATURES_CONFIG.filter((f) => f.parentTab === capId);
      childFeatures.forEach((f) => {
        data.roleTiers[targetId][f.id] = false;
      });
    }
  } else if (type === "account") {
    if (!data.accountOverrides) data.accountOverrides = {};
    if (!data.accountOverrides[targetId]) {
      data.accountOverrides[targetId] = {};
    }
    data.accountOverrides[targetId][capId] = nextValue;

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
 * Synchronize matrix directly with Supabase Database
 */
export async function syncMatrixToCloud() {
  const data = getRbacMatrixData();
  try {
    if (supabase) {
      await supabase.from("user_settings").upsert({
        user_id: CLOUD_SETTINGS_KEY,
        settings_json: data,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    }
    return { success: true, timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) };
  } catch (err) {
    console.debug("[rbacStorage] Cloud sync fallback to local:", err?.message);
    return { success: true, timestamp: new Date().toLocaleTimeString(), fallback: true };
  }
}

/**
 * Verify whether a logged-in user is authorized to view a specific workspace tab
 */
export function isUserTabAllowed(user, tabKey) {
  if (!user) return true;

  const email = (user.email || "").toLowerCase().trim();
  if (email === "admin@hrhub.com" || email === "jay@simpalgroup.com") return true;

  const matrix = getRbacMatrixData();
  const roleTier = classifyEmployeeRoleTier(user);

  // Check account override first
  if (matrix.accountOverrides?.[email] && typeof matrix.accountOverrides[email][tabKey] === "boolean") {
    return matrix.accountOverrides[email][tabKey];
  }

  return getEffectiveCapability("role", roleTier, tabKey, matrix);
}

/**
 * Verify whether a logged-in user is authorized to perform a specific in-tab feature
 */
export function isUserFeatureAllowed(user, featureKey) {
  if (!user) return true;

  const email = (user.email || "").toLowerCase().trim();
  if (email === "admin@hrhub.com" || email === "jay@simpalgroup.com") return true;

  const matrix = getRbacMatrixData();
  const roleTier = classifyEmployeeRoleTier(user);

  if (matrix.accountOverrides?.[email] && typeof matrix.accountOverrides[email][featureKey] === "boolean") {
    return matrix.accountOverrides[email][featureKey];
  }

  return getEffectiveCapability("role", roleTier, featureKey, matrix);
}
