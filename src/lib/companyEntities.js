/**
 * companyEntities.js
 * Centralized Enterprise Entity & Designation Architecture for Simpal Group of Companies
 * 
 * Defines:
 * - Head Office (Simpal Group of Companies)
 * - STL Subsidiaries (PCSO Small Town Lottery Authorized Gaming Operations)
 * - Non-STL Subsidiaries (MC POWER GAS, SIMCON)
 * - Categorized Operational Designations for Non-Head Office / Subsidiary Accounts
 * - Dedicated HR Pre-Registration Roles for Head Office HR Hub
 */

// ============================================================================
// 1. CORPORATE ENTITIES DIRECTORY
// ============================================================================

export const HEAD_OFFICE = "Simpal Group of Companies";

export const STL_SUBSIDIARIES = [
  "Lucky Betplay Corporation",
  "5A Royal Gaming OPC",
  "Glowing Fortune",
  "Imperial Gaming OPC"
];

export const NON_STL_SUBSIDIARIES = [
  "MC POWER GAS",
  "Simpal Construction (SIMCON)"
];

export const ALL_SUBSIDIARIES = [
  HEAD_OFFICE,
  ...STL_SUBSIDIARIES,
  ...NON_STL_SUBSIDIARIES
];

export const ENTITY_METADATA = {
  [HEAD_OFFICE]: {
    id: "sgc",
    name: HEAD_OFFICE,
    shortName: "Simpal Group",
    code: "SGC",
    type: "head_office",
    category: "Corporate Head Office",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    defaultBranch: "Head Office (Mandaue)",
    description: "Central corporate holding & executive administrative governance."
  },
  "Lucky Betplay Corporation": {
    id: "lucky_betplay",
    name: "Lucky Betplay Corporation",
    shortName: "Lucky Betplay",
    code: "LBC",
    type: "stl",
    category: "STL Subsidiary (PCSO Authorized)",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    defaultBranch: "Mandaue City Branch",
    description: "PCSO STL Authorized Agent Corporation (Mandaue City, Cebu)."
  },
  "5A Royal Gaming OPC": {
    id: "5a_royal",
    name: "5A Royal Gaming OPC",
    shortName: "5A Royal",
    code: "5ARG",
    type: "stl",
    category: "STL Subsidiary (PCSO Authorized)",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    defaultBranch: "Maguindanao Branch",
    description: "PCSO STL Authorized Agent Corporation (Province of Maguindanao)."
  },
  "Glowing Fortune": {
    id: "glowing_fortune",
    name: "Glowing Fortune",
    shortName: "Glowing Fortune",
    code: "GFC",
    type: "stl",
    category: "STL Subsidiary (PCSO Authorized)",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    defaultBranch: "Iligan City Branch",
    description: "PCSO STL Authorized Agent Corporation (Lanao del Norte & Lanao del Sur)."
  },
  "Imperial Gaming OPC": {
    id: "imperial_gaming",
    name: "Imperial Gaming OPC",
    shortName: "Imperial Gaming",
    code: "IMP",
    type: "stl",
    category: "STL Subsidiary (PCSO Authorized)",
    badgeColor: "bg-violet-100 text-violet-800 border-violet-300",
    defaultBranch: "Cotabato City Branch",
    description: "PCSO STL Authorized Agent Corporation (City of Cotabato)."
  },
  "MC POWER GAS": {
    id: "mc_power_gas",
    name: "MC POWER GAS",
    shortName: "MC Power Gas",
    code: "MCPG",
    type: "non_stl",
    category: "Non-STL Subsidiary (Petroleum & Fuel Retail)",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
    defaultBranch: "MC Power Gas Station (Mandaue)",
    description: "Commercial petroleum, fuel retail, and energy distribution station network."
  },
  "Simpal Construction (SIMCON)": {
    id: "simcon",
    name: "Simpal Construction (SIMCON)",
    shortName: "SIMCON",
    code: "SIMCON",
    type: "non_stl",
    category: "Non-STL Subsidiary (Construction & Engineering)",
    badgeColor: "bg-orange-100 text-orange-800 border-orange-300",
    defaultBranch: "SIMCON Field Site",
    description: "Civil engineering, heavy infrastructure, and building operations."
  }
};

export const DEFAULT_BRANCH_MAP = {
  [HEAD_OFFICE]: "Head Office (Mandaue)",
  "Lucky Betplay Corporation": "Mandaue City Branch",
  "5A Royal Gaming OPC": "Maguindanao Branch",
  "Glowing Fortune": "Iligan City Branch",
  "Imperial Gaming OPC": "Cotabato City Branch",
  "MC POWER GAS": "MC Power Gas Station (Mandaue)",
  "Simpal Construction (SIMCON)": "SIMCON Field Site"
};

export const ALL_BRANCH_PRESETS = [
  "Head Office (Mandaue)",
  "Mandaue City Branch",
  "Maguindanao Branch",
  "Cotabato City Branch",
  "Iligan City Branch",
  "Baloi, Lanao Branch",
  "Lanao del Norte Branch",
  "MC Power Gas Station (Mandaue)",
  "MC Power Gas Station (Regional)",
  "SIMCON Field Site",
  "Regional Draw & Operations"
];

// Helper to check entity type
export function isStlEntity(companyName) {
  if (!companyName) return false;
  return STL_SUBSIDIARIES.some((sub) => sub.toLowerCase() === companyName.toLowerCase());
}

export function isNonStlEntity(companyName) {
  if (!companyName) return false;
  return NON_STL_SUBSIDIARIES.some((sub) => sub.toLowerCase() === companyName.toLowerCase());
}

export function isHeadOffice(companyName) {
  if (!companyName) return false;
  const c = companyName.toLowerCase();
  return c.includes("simpal group") || c === "sgc" || c === "head office";
}

// ============================================================================
// 2. PRE-REGISTRATION ROLES (Dedicated to HR Hub Account Creation)
// ============================================================================
// As instructed: "as is lang ang sa pre registration ng side kasi since HR hub ito
// it means ang HR lang na account ang merong role or designation na about HR."
export const HR_PRE_REGISTRATION_ROLES = [
  "HR Administrator",
  "HR Manager",
  "HR Admin I",
  "HR Admin II",
  "HR Admin III",
  "HR Admin IV",
  "HR Admin V",
  "HR Admin VI",
  "HR-Onsite",
  "System Administrator",
  "Team Member"
];

// ============================================================================
// 3. CATEGORIZED OPERATIONAL DESIGNATIONS FOR OTHER ACCOUNTS / SUBSIDIARIES
// ============================================================================
// Full list provided by management categorized for instant search and selection:
export const OPERATIONAL_DESIGNATION_GROUPS = [
  {
    category: "Corporate & Finance Administration",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    roles: [
      "CFO ADMIN STAFF",
      "ACCOUNTING ADMIN STAFF",
      "IT ADMIN STAFF",
      "HR ON-SITE",
      "LIAISON OFFICER",
      "OFFICE STAFF",
      "OFFICE CLERK"
    ]
  },
  {
    category: "STL & Branch Cashiering Operations",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    roles: [
      "CLUSTER IN CHARGE",
      "DRAW COURT OFFICER",
      "HEAD CASHIER",
      "ASSISTANT CASHIER",
      "CASHIER & SUPERVISOR",
      "CASHIER",
      "RECEIVER",
      "UNCLAIMED SPECIALIST"
    ]
  },
  {
    category: "Customer Service & Technical Support",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    roles: [
      "CUSTOMER SERVICE REPRESENTATIVE",
      "TECH SUPPORT"
    ]
  },
  {
    category: "Fuel & Gas Station Operations (MC POWER GAS / Non-STL)",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    roles: [
      "OFFICER IN CHARGE",
      "CASHIER I",
      "CASHIER II",
      "PUMP ATTENDANT"
    ]
  },
  {
    category: "General Services, Logistics & Facilities",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    roles: [
      "SECURITY",
      "DRIVER",
      "MAINTENACE STAFF",
      "COOK",
      "UTILITY"
    ]
  },
  {
    category: "Central HRMD & Executive (Head Office)",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
    roles: [
      "HR Administrator",
      "HR Manager",
      "HR Admin I",
      "HR Admin II",
      "HR Admin III",
      "HR Admin IV",
      "HR Admin V",
      "HR Admin VI",
      "Site Supervisor",
      "Team Member"
    ]
  }
];

// Flat array of all designations for validation and lookups
export const ALL_OPERATIONAL_ROLES = OPERATIONAL_DESIGNATION_GROUPS.flatMap((g) => g.roles);
