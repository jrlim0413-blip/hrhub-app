/**
 * hrPermissionMatrix.js
 * Explicit Role & Permission Matrix for Incident Reporting & Due Process (NTE)
 * Defines Head Office (Simpal Group of Companies - SGC) vs Subsidiary Companies.
 */

export const HR_ENTITIES = {
  HEAD_OFFICE: "Simpal Group of Companies",
  HEAD_OFFICE_ACRONYM: "SGC",
  SUBSIDIARIES: [
    "5A Royal Gaming OPC",
    "Lucky Betplay Corporation",
    "Simpal Construction (SIMCON)",
    "Imperial Gaming OPC",
    "Glowing Fortune"
  ]
};

export const HR_ROLE_TYPES = {
  HEAD_OFFICE_HRMD: "HEAD_OFFICE_HRMD",
  SUBSIDIARY_BRANCH_HR: "SUBSIDIARY_BRANCH_HR"
};

/**
 * Standard Role & Permission Matrix Table
 */
export const ROLE_PERMISSION_MATRIX = {
  [HR_ROLE_TYPES.HEAD_OFFICE_HRMD]: {
    roleTitle: "Head Office HRMD Central Authority",
    entity: "Simpal Group of Companies (Head Office)",
    description: "Executive central body responsible for reviewing subsidiary incident reports, drafting & legally issuing Notice to Explain (NTE), evaluating employee written defenses, and rendering administrative hearing determinations.",
    canIssueIncidentReport: true, // Head Office can also file internal IRs
    canViewAllSubmissions: true, // Can view all incident reports from all subsidiaries
    canEvaluateIncidentReport: true, // Primary evaluator
    canIssueNoticeToExplain: true, // ONLY Head Office HRMD can issue official NTE
    canReturnNteToBranch: true, // Returns official NTE to branch HR for serving
    canServeNteToEmployee: true, // Can serve direct Head Office employees
    canReviewEmployeeDefense: true, // Final evaluator of written explanation
    canCloseAndResolveCase: true, // Final decision maker
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    themeColor: "emerald"
  },
  [HR_ROLE_TYPES.SUBSIDIARY_BRANCH_HR]: {
    roleTitle: "Subsidiary Branch HR Administrator",
    entity: "Subsidiary Entity (e.g. 5A Royal Gaming, Lucky Betplay, SIMCON)",
    description: "Branch / Area HR officer responsible for on-site employee oversight, investigating cash shortages or SOP breaches, transmitting Incident Reports to Head Office (SGC), physically serving returned NTEs to employees, and gathering written explanations.",
    canIssueIncidentReport: true, // Primary duty: investigate & file IR
    canViewAllSubmissions: false, // Strictly limited to their own subsidiary entity
    canEvaluateIncidentReport: false, // Transmitted to Head Office
    canIssueNoticeToExplain: false, // CANNOT issue NTE (strictly reserved for Head Office SGC)
    canReturnNteToBranch: false,
    canServeNteToEmployee: true, // Primary duty: physically serve returned NTE to employee
    canReviewEmployeeDefense: false, // Transmits defense to Head Office
    canCloseAndResolveCase: false, // Head Office must rule
    badgeColor: "bg-[#eef7e5] text-[#55782a] border-[#d3eab8]",
    themeColor: "lime"
  }
};

/**
 * Resolves whether a given user is Head Office HRMD or a Subsidiary Branch HR
 * @param {object} user - Current user object
 * @returns {object} Role definition and specific capabilities
 */
export function resolveUserHrRole(user) {
  const company = (user?.company || "").trim();
  const email = (user?.email || "").toLowerCase().trim();

  // Head Office checks
  const isHeadOffice =
    company.toLowerCase().includes("simpal") ||
    company.toLowerCase().includes("sgc") ||
    email === "admin@hrhub.com" ||
    email.includes("hrmd");

  const roleType = isHeadOffice
    ? HR_ROLE_TYPES.HEAD_OFFICE_HRMD
    : HR_ROLE_TYPES.SUBSIDIARY_BRANCH_HR;

  const permissions = ROLE_PERMISSION_MATRIX[roleType];

  return {
    roleType,
    isHeadOffice,
    company: isHeadOffice ? HR_ENTITIES.HEAD_OFFICE : (company || "5A Royal Gaming OPC"),
    roleTitle: isHeadOffice ? "Head Office HRMD Manager" : `${company || "Branch"} HR Administrator`,
    permissions
  };
}

/**
 * Validates if the user is authorized to perform a specific workflow action
 */
export function isActionAuthorized(user, action, report = null) {
  const userRole = resolveUserHrRole(user);

  switch (action) {
    case "ISSUE_INCIDENT_REPORT":
      return userRole.permissions.canIssueIncidentReport;

    case "ISSUE_NTE":
      // Strictly Head Office HRMD
      return userRole.isHeadOffice && userRole.permissions.canIssueNoticeToExplain;

    case "SERVE_NTE":
      // Subsidiary HR or assigned HR
      return userRole.permissions.canServeNteToEmployee;

    case "LOG_EXPLANATION":
      return true;

    case "CLOSE_CASE":
      // Strictly Head Office HRMD
      return userRole.isHeadOffice;

    case "VIEW_REPORT":
      if (userRole.isHeadOffice) return true;
      if (!report) return true;
      // Subsidiary HR only sees reports from their company
      const reportCompany = (report.senderCompany || report.company || "").toLowerCase();
      const userComp = (userRole.company || "").toLowerCase();
      return reportCompany.includes(userComp) || userComp.includes(reportCompany);

    default:
      return false;
  }
}
