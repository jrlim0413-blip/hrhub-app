
export const HR_ENTITIES = {
  HEAD_OFFICE: "Simpal Group of Companies",
  HEAD_OFFICE_ACRONYM: "SGC",
  STL_SUBSIDIARIES: [
    "Lucky Betplay Corporation",
    "5A Royal Gaming OPC",
    "Glowing Fortune",
    "Imperial Gaming OPC"
  ],
  NON_STL_SUBSIDIARIES: [
    "MC POWER GAS",
    "Simpal Construction (SIMCON)"
  ],
  SUBSIDIARIES: [
    "Lucky Betplay Corporation",
    "5A Royal Gaming OPC",
    "Glowing Fortune",
    "Imperial Gaming OPC",
    "MC POWER GAS",
    "Simpal Construction (SIMCON)"
  ]
};

export const HR_ROLE_TYPES = {
  HEAD_OFFICE_HRMD: "HEAD_OFFICE_HRMD",
  SUBSIDIARY_BRANCH_HR: "SUBSIDIARY_BRANCH_HR"
};

export const ROLE_PERMISSION_MATRIX = {
  [HR_ROLE_TYPES.HEAD_OFFICE_HRMD]: {
    roleTitle: "Head Office HRMD Central Authority",
    entity: "Simpal Group of Companies (Head Office)",
    description: "Executive central body responsible for reviewing subsidiary incident reports, drafting & legally issuing Notice to Explain (NTE), evaluating employee written defenses, and rendering administrative hearing determinations.",
    canIssueIncidentReport: true,
    canViewAllSubmissions: true,
    canEvaluateIncidentReport: true,
    canIssueNoticeToExplain: true,
    canReturnNteToBranch: true,
    canServeNteToEmployee: true,
    canReviewEmployeeDefense: true,
    canCloseAndResolveCase: true,
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    themeColor: "emerald"
  },
  [HR_ROLE_TYPES.SUBSIDIARY_BRANCH_HR]: {
    roleTitle: "Subsidiary Branch HR Administrator",
    entity: "Subsidiary Entity (e.g. 5A Royal Gaming, Lucky Betplay, SIMCON)",
    description: "Branch / Area HR officer responsible for on-site employee oversight, investigating cash shortages or SOP breaches, transmitting Incident Reports to Head Office (SGC), physically serving returned NTEs to employees, and gathering written explanations.",
    canIssueIncidentReport: true,
    canViewAllSubmissions: false,
    canEvaluateIncidentReport: false,
    canIssueNoticeToExplain: false,
    canReturnNteToBranch: false,
    canServeNteToEmployee: true,
    canReviewEmployeeDefense: false,
    canCloseAndResolveCase: false,
    badgeColor: "bg-[#eef7e5] text-[#55782a] border-[#d3eab8]",
    themeColor: "lime"
  }
};

export function resolveUserHrRole(user, profiles = []) {
  const email = (user?.email || "").toLowerCase().trim();

  let registeredCompany = user?.company || "";
  let registeredName = user?.name || "";
  let registeredRole = user?.role || "";

  if (profiles && Array.isArray(profiles) && email) {
    const matched = profiles.find((p) => (p.email || "").toLowerCase().trim() === email);
    if (matched) {
      if (matched.company) registeredCompany = matched.company;
      if (matched.name) registeredName = matched.name;
      if (matched.role) registeredRole = matched.role;
    }
  }

  const normCompany = (registeredCompany || "").toLowerCase().trim();

  const isHeadOffice =
    (normCompany.includes("simpal") && !normCompany.includes("construction")) ||
    normCompany.includes("sgc") ||
    normCompany.includes("head office") ||
    email === "admin@hrhub.com" ||
    email === "jay@simpalgroup.com" ||
    email === "efilfonimda@gmail.com" ||
    email.includes("hrmd") ||
    (registeredRole || "").toLowerCase().includes("head office") ||
    (registeredRole || "").toLowerCase().includes("hrmd");

  const roleType = isHeadOffice
    ? HR_ROLE_TYPES.HEAD_OFFICE_HRMD
    : HR_ROLE_TYPES.SUBSIDIARY_BRANCH_HR;

  const permissions = ROLE_PERMISSION_MATRIX[roleType];
  const finalCompany = isHeadOffice
    ? HR_ENTITIES.HEAD_OFFICE
    : (registeredCompany || "5A Royal Gaming OPC");

  const reportingName = registeredName || user?.name || "HR Officer";

  return {
    roleType,
    isHeadOffice,
    company: finalCompany,
    userName: reportingName,
    reportingName,
    roleTitle: isHeadOffice
      ? "Head Office HRMD Central Authority"
      : `${finalCompany} HR Administrator`,
    permissions
  };
}

export function isActionAuthorized(user, action, report = null) {
  const userRole = resolveUserHrRole(user);

  switch (action) {
    case "ISSUE_INCIDENT_REPORT":
      return userRole.permissions.canIssueIncidentReport;

    case "ISSUE_NTE":
      return userRole.isHeadOffice && userRole.permissions.canIssueNoticeToExplain;

    case "SERVE_NTE":
      return userRole.permissions.canServeNteToEmployee;

    case "LOG_EXPLANATION":
      return true;

    case "CLOSE_CASE":
      return userRole.isHeadOffice;

    case "VIEW_REPORT":
      if (userRole.isHeadOffice) return true;
      if (!report) return true;
      const reportCompany = (report.senderCompany || report.company || "").toLowerCase();
      const userComp = (userRole.company || "").toLowerCase();
      return reportCompany.includes(userComp) || userComp.includes(reportCompany);

    default:
      return false;
  }
}
