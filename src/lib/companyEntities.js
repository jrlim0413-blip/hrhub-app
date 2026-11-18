

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
    defaultBranch: "Head Office (SGC)",
    description: "Central corporate holding & executive administrative governance.",
    logoUrl: "/logos/SGC.png"
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
    description: "PCSO STL Authorized Agent Corporation (Mandaue City, Cebu).",
    logoUrl: "/logos/LB.png"
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
    description: "PCSO STL Authorized Agent Corporation (Province of Maguindanao).",
    logoUrl: "/logos/5A.png"
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
    description: "PCSO STL Authorized Agent Corporation (Lanao del Norte & Lanao del Sur).",
    logoUrl: "/logos/GLOW.png"
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
    description: "PCSO STL Authorized Agent Corporation (City of Cotabato).",
    logoUrl: "/logos/IMP.png"
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
    description: "Commercial petroleum, fuel retail, and energy distribution station network.",
    logoUrl: "/logos/mc_power_gas.png"
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
    description: "Civil engineering, heavy infrastructure, and building operations.",
    logoUrl: "/logos/SIM.png"
  }
};

export const DEFAULT_BRANCH_MAP = {
  [HEAD_OFFICE]: "Head Office (SGC)",
  "Lucky Betplay Corporation": "Mandaue City Branch",
  "5A Royal Gaming OPC": "Maguindanao Branch",
  "Glowing Fortune": "Iligan City Branch",
  "Imperial Gaming OPC": "Cotabato City Branch",
  "MC POWER GAS": "MC Power Gas Station (Mandaue)",
  "Simpal Construction (SIMCON)": "SIMCON Field Site"
};

export const ALL_BRANCH_PRESETS = [
  "Head Office (SGC)",
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

export function matchesCompanyEntity(profileCompany, targetCompany) {
  if (!profileCompany || !targetCompany) return false;
  const pComp = String(profileCompany).toLowerCase().trim();
  const tComp = String(targetCompany).toLowerCase().trim();

  if (pComp === tComp) return true;

  if (tComp.includes("glowing fortune") && pComp.includes("glowing fortune")) return true;
  if ((tComp.includes("simcon") || tComp.includes("construction")) && (pComp.includes("simcon") || pComp.includes("construction"))) return true;
  if (tComp.includes("mc power") && pComp.includes("mc power")) return true;
  if (tComp.includes("5a royal") && pComp.includes("5a royal")) return true;
  if (tComp.includes("lucky betplay") && pComp.includes("lucky betplay")) return true;
  if (tComp.includes("simpal group") && pComp.includes("simpal group")) return true;

  return false;
}

export function normalizeBranchForCompany(company, branch) {
  if (matchesCompanyEntity(company, HEAD_OFFICE)) {
    if (!branch || branch === "Head Office (Mandaue)" || branch.toLowerCase().includes("mandaue")) {
      return "Head Office (SGC)";
    }
  }
  return branch || DEFAULT_BRANCH_MAP[company] || "Head Office (SGC)";
}

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
  const c = String(companyName).toLowerCase().trim();
  return c.includes("simpal group") || c.includes("sgc") || c.includes("head office");
}

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
  "Field Monitoring",
  "Site Supervisor",
  "Team Member"
];

export const CENTRAL_HRMD_ROLES = HR_PRE_REGISTRATION_ROLES;

export const OPERATIONAL_DESIGNATION_GROUPS = [
  {
    category: "Admin & Finance",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    roles: [
      "IT ADMIN STAFF",
      "CFO ADMIN STAFF",
      "ACCOUNTING ADMIN STAFF",
      "HR ON-SITE",
      "LIAISON OFFICER",
      "OFFICE STAFF",
      "OFFICE CLERK"
    ]
  },
  {
    category: "STL Operations",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    roles: [
      "FIELD MONITORING",
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
    category: "MC Power Gas",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    roles: [
      "OFFICER IN CHARGE",
      "CASHIER I",
      "CASHIER II",
      "PUMP ATTENDANT"
    ]
  },
  {
    category: "Customer & Tech",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    roles: [
      "CUSTOMER SERVICE REPRESENTATIVE",
      "TECH SUPPORT"
    ]
  },
  {
    category: "General Services",
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
    category: "Central HRMD",
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

export const ALL_OPERATIONAL_ROLES = OPERATIONAL_DESIGNATION_GROUPS.flatMap((g) => g.roles);

export function isGlobalAccessUser(user = null) {
  let u = user;
  if (!u && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("hrhub_auth_user");
      if (raw) u = JSON.parse(raw);
    } catch {}
  }
  if (!u) return false;

  const email = String(u.email || "").toLowerCase().trim();
  const role = String(u.role || "").toLowerCase().trim();
  const name = String(u.name || "").toLowerCase().trim();
  const company = String(u.company || "").trim();
  const comp = company.toLowerCase();

  if (
    email === "admin@hrhub.com" ||
    name === "h r m d" ||
    name === "hrmd" ||
    email === "jay@simpalgroup.com" ||
    email === "efilfonimda@gmail.com"
  ) {
    return true;
  }

  const isSubsidiaryCompany =
    comp.includes("5a") ||
    comp.includes("royal") ||
    comp.includes("maguindanao") ||
    comp.includes("imperial") ||
    comp.includes("cotabato") ||
    comp.includes("glowing") ||
    comp.includes("fortune") ||
    comp.includes("iligan") ||
    comp.includes("ldn") ||
    comp.includes("lucky") ||
    comp.includes("betplay") ||
    comp.includes("mandaue") ||
    comp.includes("mc power") ||
    comp.includes("simcon") ||
    comp.includes("construction");

  if (isSubsidiaryCompany && !isHeadOffice(company)) {
    return false;
  }

  if (isHeadOffice(company)) {
    return true;
  }

  if (!company && (role.includes("hr administrator") || role.includes("super administrator"))) {
    return true;
  }

  return false;
}

export function getUserAssignedStlEntity(user = null) {
  let u = user;
  if (!u && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("hrhub_auth_user");
      if (raw) u = JSON.parse(raw);
    } catch {}
  }
  if (!u) return null;

  if (isGlobalAccessUser(u)) {
    return null;
  }

  const comp = String(u.company || "").toLowerCase().trim();

  if (comp.includes("imperial") || comp.includes("cotabato")) {
    return {
      canonicalName: "Imperial Gaming OPC",
      shortName: "Imperial Gaming",
      territoryKey: "imperial",
      code: "IMP"
    };
  }
  if (comp.includes("5a") || comp.includes("royal") || comp.includes("maguindanao")) {
    return {
      canonicalName: "5A Royal Gaming OPC",
      shortName: "5A Royal",
      territoryKey: "five_a",
      code: "5ARG"
    };
  }
  if (comp.includes("glowing") || comp.includes("fortune") || comp.includes("iligan") || comp.includes("ldn")) {
    return {
      canonicalName: "Glowing Fortune",
      shortName: "Glowing Fortune",
      territoryKey: "glowing",
      code: "GFC"
    };
  }
  if (comp.includes("lucky") || comp.includes("betplay") || comp.includes("mandaue")) {
    return {
      canonicalName: "Lucky Betplay Corporation",
      shortName: "Lucky Betplay",
      territoryKey: "lucky_betplay",
      code: "LBC"
    };
  }

  if (comp.includes("mc power") || comp.includes("simcon") || comp.includes("construction")) {
    return {
      canonicalName: comp.includes("mc power") ? "MC POWER GAS" : "Simpal Construction (SIMCON)",
      shortName: comp.includes("mc power") ? "MC Power Gas" : "SIMCON",
      isNonStl: true
    };
  }

  return null;
}

