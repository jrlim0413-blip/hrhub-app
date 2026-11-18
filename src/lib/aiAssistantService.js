// HRHub Ai Buddy Engine & Intelligence Service
// Simpal Group of Companies • HR & Operations Knowledge Engine
import { API_CONFIG } from "../config/apiConfig";

/**
 * Determines whether the logged-in account is an HR Administrator assigned to
 * Simpal Group of Companies / Head Office (keeps Head Office HR dialog/MP3 AS-IS),
 * vs. a Subsidiary / STL Branch account (uses STL Gross, Winnings, AWOL Agent dialog/MP3).
 */
export function isHeadOfficeHrAdminUser(user, isHRMDFlag = null) {
  if (!user) return true;
  const email = String(user.email || "").toLowerCase().trim();
  const role = String(user.role || "").toLowerCase().trim();
  const name = String(user.name || "").toLowerCase().trim();
  const company = String(user.company || "").toLowerCase().trim();

  const isExplicitSubsidiary =
    company.includes("lucky") ||
    company.includes("betplay") ||
    company.includes("5a") ||
    company.includes("royal") ||
    company.includes("glowing") ||
    company.includes("fortune") ||
    company.includes("imperial") ||
    company.includes("mc power") ||
    company.includes("simcon") ||
    company.includes("simpal construction") ||
    company.includes("mandaue") ||
    company.includes("iligan") ||
    company.includes("cotabato") ||
    company.includes("maguindanao");

  const isHoCompany =
    !isExplicitSubsidiary &&
    (company === "" ||
      company.includes("simpal group") ||
      company.includes("head office") ||
      company.includes("sgc"));

  if (
    email === "admin@hrhub.com" ||
    email === "jay@simpalgroup.com" ||
    email === "efilfonimda@gmail.com" ||
    email.includes("hrmd") ||
    name.replace(/\s+/g, "") === "hrmd"
  ) {
    return isHoCompany;
  }

  const isHrAdminRole =
    role.includes("hr administrator") ||
    role.includes("hr admin") ||
    role.includes("hrmd") ||
    role.includes("super administrator") ||
    role.includes("super admin") ||
    isHRMDFlag === true;

  return isHoCompany && isHrAdminRole;
}

/**
 * Complete Interactive Navigation Directory for HRHub App Modules & Sub-Tabs.
 * Powers AI Buddy's App Guide & Clickable Direct Routing Buttons.
 */
export const HRHUB_MODULE_CATALOG = [
  // Communication Portal Tabs
  {
    id: "comm:bulletin",
    routeType: "comm",
    targetId: "bulletin",
    label: "Company Bulletin & Announcements",
    shortLabel: "Company Bulletin",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_bulletin",
    description: "Official company announcements, memorandums feed, and celebrations.",
    keywords: ["bulletin", "announcement", "anunsyo", "post", "feed", "communication"]
  },
  {
    id: "comm:directory",
    routeType: "comm",
    targetId: "directory",
    label: "Employee Directory & 201 Profiles",
    shortLabel: "Employee Directory",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_directory",
    description: "Staff profiles, 201 records, pre-registration, birthdays, and branch rosters.",
    keywords: ["employee directory", "directory", "201", "profile", "empleyado", "pre-register", "staff"]
  },
  {
    id: "comm:attendance",
    routeType: "comm",
    targetId: "attendance",
    label: "Shift & Attendance Timesheets",
    shortLabel: "Shift & Attendance",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_attendance",
    description: "Live daily HR work logs, active/AFK status, DTR print, and CSV export.",
    keywords: ["shift", "timesheet", "work log", "dtr", "afk", "attendance overview"]
  },
  {
    id: "comm:policies",
    routeType: "comm",
    targetId: "policies",
    label: "Corporate Policies & Handbooks",
    shortLabel: "Policies & Handbooks",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_policies",
    description: "Code of conduct, OSH RA 11058 safety rules, and employee handbook.",
    keywords: ["policy", "policies", "handbook", "osh", "code of conduct", "patakaran"]
  },
  {
    id: "comm:hr_helpdesk",
    routeType: "comm",
    targetId: "hr_helpdesk",
    label: "HR Helpdesk Support Tickets",
    shortLabel: "HR Helpdesk",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_hr_helpdesk",
    description: "File and track HR requests for COE, SSS/PhilHealth/Pag-IBIG, leaves, and 201 files.",
    keywords: ["hr helpdesk", "helpdesk", "coe", "certificate of employment", "sss", "philhealth", "pag-ibig", "hr ticket", "hr support"]
  },
  {
    id: "comm:it_helpdesk",
    routeType: "comm",
    targetId: "it_helpdesk",
    label: "IT Helpdesk Technical Support",
    shortLabel: "IT Helpdesk",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_it_helpdesk",
    description: "Report POS/STL terminal issues, login/password resets, printers, biometrics, or network issues.",
    keywords: ["it helpdesk", "it support", "tech support", "pos", "terminal", "password reset", "printer", "biometric", "internet", "network", "bug"]
  },
  {
    id: "comm:finance_desk",
    routeType: "comm",
    targetId: "finance_desk",
    label: "Finance Desk & Remittance Support",
    shortLabel: "Finance Desk",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_finance_desk",
    description: "Submit inquiries on STL gross remittance, hits payout verification, petty cash, and payslips.",
    keywords: ["finance desk", "finance support", "remittance query", "payout verification", "payslip concern", "accounting ticket"]
  },
  {
    id: "comm:knowledge_center",
    routeType: "comm",
    targetId: "knowledge_center",
    label: "Knowledge Center & Operational Guides",
    shortLabel: "Knowledge Center",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_knowledge_center",
    description: "Searchable operational guides, STL gross study playbooks, DOLE due process, and HRHub tutorials.",
    keywords: ["knowledge center", "knowledge base", "guide", "tutorial", "playbook", "faq", "gabay", "manual"]
  },
  {
    id: "comm:suggestion_box",
    routeType: "comm",
    targetId: "suggestion_box",
    label: "Employee Suggestion Box",
    shortLabel: "Suggestion Box",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_suggestion_box",
    description: "Submit named or anonymous improvement ideas, upvote proposals, and read management responses.",
    keywords: ["suggestion", "suggestion box", "feedback", "idea", "suhestiyon", "anonymous"]
  },
  {
    id: "comm:leaderboards",
    routeType: "comm",
    targetId: "leaderboards",
    label: "Employee & Subsidiary Leaderboards",
    shortLabel: "Leaderboards",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_leaderboards",
    description: "Live performance rankings based on completed Task Board items and HR recognition awards.",
    keywords: ["leaderboard", "leaderboards", "ranking", "top performer", "award", "recognition", "points"]
  },
  {
    id: "comm:polls_surveys",
    routeType: "comm",
    targetId: "polls_surveys",
    label: "Company Polls & Pulse Surveys",
    shortLabel: "Polls & Survey",
    category: "Communication Portal",
    rbacTabKey: "communication",
    rbacFeatureKey: "comm_polls_surveys",
    description: "Vote in active company polls, employee pulse surveys, and view live vote results.",
    keywords: ["poll", "polls", "survey", "surveys", "vote", "boto", "pulse survey"]
  },
  // Operations Workspace Tabs
  {
    id: "tab:home",
    routeType: "workspace",
    targetId: "home",
    label: "Workspace Ready / Home Dashboard",
    shortLabel: "Home Dashboard",
    category: "Home",
    rbacTabKey: "home",
    description: "Main Workspace launcher and Frequently Used Modules hub.",
    keywords: ["home", "dashboard", "workspace"]
  },
  {
    id: "tab:meetings",
    routeType: "workspace",
    targetId: "meetings",
    label: "Zoom & Google Meet Scheduler",
    shortLabel: "Zoom & Meet",
    category: "Home",
    rbacTabKey: "meetings",
    description: "Schedule and join executive or branch video meetings.",
    keywords: ["zoom", "meet", "meeting", "video call", "conference"]
  },
  {
    id: "tab:gross",
    routeType: "workspace",
    targetId: "gross",
    label: "Gross Revenue & STL Remittance Report",
    shortLabel: "Gross Report",
    category: "Finance & STL",
    rbacTabKey: "gross",
    description: "Live & historical STL Gross sales, hits, teller turnovers, and draw reports.",
    keywords: ["gross", "remittance", "hits", "panalo", "sales", "benta", "draw", "stl"]
  },
  {
    id: "tab:revenue_trends",
    routeType: "workspace",
    targetId: "revenue_trends",
    label: "Multi-Entity Revenue Trends & Betting Ratio",
    shortLabel: "Revenue Trends",
    category: "Finance & STL",
    rbacTabKey: "revenue_trends",
    description: "Compare gross up/down trends, betting ratios, and multi-area STL performance.",
    keywords: ["trend", "ratio", "betting ratio", "pagbaba", "pagtaas", "bumaba", "tumaas", "compare", "analytics"]
  },
  {
    id: "tab:agents",
    routeType: "workspace",
    targetId: "agents",
    label: "Agents Directory & Outlets",
    shortLabel: "Agents Directory",
    category: "HR & Field",
    rbacTabKey: "agents",
    description: "View active STL retail agents, terminal outlets, and supervisor assignments.",
    keywords: ["agent", "agents", "teller", "outlet", "kiosk", "awol"]
  },
  {
    id: "tab:incident_reports",
    routeType: "workspace",
    targetId: "incident_reports",
    label: "Incident Reports & Notice to Explain (NTE)",
    shortLabel: "Incident Reports & NTE",
    category: "HR & Due Process",
    rbacTabKey: "incident_reports",
    description: "File branch Incident Reports (IR), AWOL cases, and process legal NTEs.",
    keywords: ["incident", "ir", "nte", "noe", "awol", "disciplinary", "due process", "violation", "reklamo"]
  },
  {
    id: "tab:memo",
    routeType: "workspace",
    targetId: "memo",
    label: "Official Memo Generator",
    shortLabel: "Memo Generator",
    category: "HR & Documents",
    rbacTabKey: "memo",
    description: "Draft, format with company letterhead, print, and email official memos.",
    keywords: ["memo", "memorandum", "advisory", "directive"]
  },
  {
    id: "tab:doc_studio",
    routeType: "workspace",
    targetId: "doc_studio",
    label: "Document Studio (Coupon Bond Certificates)",
    shortLabel: "Document Studio",
    category: "HR & Documents",
    rbacTabKey: "doc_studio",
    description: "Create printable certificates, contracts, and formal company letters.",
    keywords: ["document studio", "certificate", "coupon bond", "contract", "letter"]
  },
  {
    id: "tab:salary_compensation",
    routeType: "workspace",
    targetId: "salary_compensation",
    label: "Salary & Compensation w/ Payslip",
    shortLabel: "Salary & Payslip",
    category: "HR & Payroll",
    rbacTabKey: "salary_compensation",
    description: "Upload Excel/OCR payroll ledgers and generate printable employee payslips.",
    keywords: ["salary", "payslip", "compensation", "sahod", "sweldo", "payroll upload"]
  },
  {
    id: "tab:payroll_calc",
    routeType: "workspace",
    targetId: "payroll_calc",
    label: "13th Month Payroll Calculator",
    shortLabel: "13th Month Calc",
    category: "Finance & Payroll",
    rbacTabKey: "payroll_calc",
    description: "Compute pro-rated 13th month pay following DOLE P.D. 851.",
    keywords: ["13th month", "calculator", "dole", "bonus", "holiday pay"]
  },
  {
    id: "tab:petty_cash",
    routeType: "workspace",
    targetId: "petty_cash",
    label: "Branch Expenses & Petty Cash Vouchers",
    shortLabel: "Petty Cash",
    category: "Finance & STL",
    rbacTabKey: "petty_cash",
    description: "Record branch expense vouchers, receipts, and cash liquidations.",
    keywords: ["petty cash", "voucher", "expense", "gastos", "liquidation"]
  },
  {
    id: "tab:geotagging",
    routeType: "workspace",
    targetId: "geotagging",
    label: "Territory GeoTagging & Road Map",
    shortLabel: "GeoTagging Map",
    category: "Field Operations",
    rbacTabKey: "geotagging",
    description: "Plot yellow booth kiosks, check territory boundaries, and road distances.",
    keywords: ["geotag", "map", "booth", "kiosk", "territory", "mapa", "locat"]
  },
  {
    id: "tab:weather",
    routeType: "workspace",
    targetId: "weather",
    label: "Field Weather Radar",
    shortLabel: "Weather Radar",
    category: "Field Operations",
    rbacTabKey: "weather",
    description: "Live satellite weather & cyclone alerts affecting branch & STL turnout.",
    keywords: ["weather", "ulan", "bagyo", "radar", "panahon"]
  },
  {
    id: "tab:sops",
    routeType: "workspace",
    targetId: "sops",
    label: "Task Board",
    shortLabel: "Task Board",
    category: "Field Operations",
    rbacTabKey: "sops",
    description: "Daily task board, milestones, and operational checklists.",
    keywords: ["task board", "tasks", "checklist", "procedure", "sop"]
  },
  {
    id: "tab:supervisors_attendance",
    routeType: "workspace",
    targetId: "supervisors_attendance",
    label: "Supervisors Attendance & Biometric Audit",
    shortLabel: "Supervisors Attendance",
    category: "Field Operations",
    rbacTabKey: "supervisors_attendance",
    description: "Verify field supervisor GPS/biometric check-ins and accomplishments.",
    keywords: ["supervisor", "biometric", "check-in", "attendance"]
  },
  {
    id: "tab:dole_handbook",
    routeType: "workspace",
    targetId: "dole_handbook",
    label: "DOLE Legal Guidelines Suite",
    shortLabel: "DOLE Guidelines",
    category: "HR & Legal",
    rbacTabKey: "dole_handbook",
    description: "Philippine Labor Code, DOLE Department Orders, and due process references.",
    keywords: ["dole", "labor code", "legal", "batas", "art. 297", "holiday"]
  },
  {
    id: "tab:hr_analytics",
    routeType: "workspace",
    targetId: "hr_analytics",
    label: "HR Analytics & Workforce KPI",
    shortLabel: "HR Analytics",
    category: "Analytics",
    rbacTabKey: "hr_analytics",
    description: "Executive headcount, disciplinary trends, attendance & compliance KPIs.",
    keywords: ["hr analytics", "kpi", "headcount", "demographics", "scorecard"]
  },
  {
    id: "tab:permission_matrix",
    routeType: "workspace",
    targetId: "permission_matrix",
    label: "Role & Capabilities Access Control Matrix",
    shortLabel: "Permission Matrix",
    category: "Security (HRMD)",
    rbacTabKey: "permission_matrix",
    description: "Manage role permissions and per-user module/feature access tags.",
    keywords: ["permission", "rbac", "matrix", "access control", "role", "tag"]
  },
  {
    id: "tab:api_health",
    routeType: "workspace",
    targetId: "api_health",
    label: "System Health & API Configuration",
    shortLabel: "API Health",
    category: "Security (HRMD)",
    rbacTabKey: "api_health",
    description: "Monitor live accountant/teller API latency and endpoints.",
    keywords: ["api", "health", "endpoint", "server", "config"]
  }
];

/**
 * Strip raw [[NAV:...]] syntax markers from visible AI text
 */
export function stripNavMarkers(text) {
  if (!text) return "";
  return text.replace(/\[\[NAV:[^\]]+\]\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Extract clickable module navigation routes from explicit [[NAV:...]] markers
 * and contextual keyword intent in both user prompt and AI reply.
 */
export function extractSuggestedRoutes(aiText = "", userPrompt = "") {
  const routes = [];
  const addedIds = new Set();

  const pushModule = (mod) => {
    if (!mod || addedIds.has(mod.id)) return;
    addedIds.add(mod.id);
    routes.push(mod);
  };

  // 1. Parse explicit [[NAV:targetId|Optional Label]] markers emitted by AI
  const navRegex = /\[\[NAV:([a-zA-Z0-9_:-]+)(?:\|([^\]]+))?\]\]/g;
  let match;
  while ((match = navRegex.exec(aiText || "")) !== null) {
    const rawKey = match[1].trim().toLowerCase();
    const found = HRHUB_MODULE_CATALOG.find(
      (m) => m.id.toLowerCase() === rawKey || m.targetId.toLowerCase() === rawKey
    );
    if (found) pushModule(found);
  }

  // 2. Contextual intent detection so navigation buttons ALWAYS appear when relevant
  const combined = `${userPrompt || ""} ${aiText || ""}`.toLowerCase();
  const isAskingAppTour =
    combined.includes("paano gamitin") ||
    combined.includes("how to use") ||
    combined.includes("buong project") ||
    combined.includes("all modules") ||
    combined.includes("lahat ng module") ||
    combined.includes("app tour") ||
    combined.includes("gabay sa app");

  if (isAskingAppTour && routes.length < 4) {
    ["tab:gross", "tab:revenue_trends", "tab:agents", "tab:incident_reports", "tab:memo", "comm:directory", "comm:attendance", "tab:geotagging"].forEach((id) => {
      pushModule(HRHUB_MODULE_CATALOG.find((m) => m.id === id));
    });
    return routes.slice(0, 8);
  }

  // Score keyword hits from userPrompt primarily (higher signal) then aiText
  const promptLower = (userPrompt || "").toLowerCase();
  const wantsNavigation =
    promptLower.includes("punta") ||
    promptLower.includes("pumunta") ||
    promptLower.includes("open") ||
    promptLower.includes("buksan") ||
    promptLower.includes("link") ||
    promptLower.includes("route") ||
    promptLower.includes("saan") ||
    promptLower.includes("where") ||
    promptLower.includes("go to") ||
    promptLower.includes("paano");

  for (const mod of HRHUB_MODULE_CATALOG) {
    const matchedPrompt = mod.keywords.some((kw) => promptLower.includes(kw));
    if (matchedPrompt) {
      pushModule(mod);
    }
  }

  // If user asked for navigation/help and we still have room, scan AI text for strong module mentions
  if (wantsNavigation && routes.length < 4) {
    const aiLower = (aiText || "").toLowerCase();
    for (const mod of HRHUB_MODULE_CATALOG) {
      if (aiLower.includes(mod.shortLabel.toLowerCase()) || aiLower.includes(mod.label.toLowerCase())) {
        pushModule(mod);
      }
    }
  }

  return routes.slice(0, 6);
}

export const SIMPAL_COMPANIES_CONTEXT = `
You are HRHub Ai Buddy, an executive AI partner for the Simpal Group of Companies.
You assist Human Resources, Executives, Field Operations, and Administrative Personnel.

Creator & Key Personnel Knowledge:
- JAY RYAN LIM: Jay Ryan Lim is the brilliant and highly skilled IT professional and software engineer who developed and created you (HRHub Ai Buddy) and built this entire HRHub system. Whenever anyone asks about Jay Ryan Lim (e.g. "sino si Jay Ryan Lim?", "who is Jay Ryan Lim?", "sino gumawa sayo?", "who created you?", "who is your developer?"), always warmly, proudly, and respectfully answer that Jay Ryan Lim is the one who created you and developed this entire system, and that he is a talented and skilled IT professional ("siya ang gumawa sa akin at sa buong HRHub system na ito, at isa siyang magaling na IT").
- QUENNIE CAPUYAN LIM: Quennie Capuyan Lim is the HR Employee and Labor Relations specialist at Simpal Group of Companies. She is the kind, dedicated, and beautiful wife of Jay Ryan Lim ("siya ay HR Employee and Labor Relations sa Simpal Group of Companies, at ang mabait at magandang asawa ni Jay Ryan Lim na isang magaling na IT"). Whenever anyone asks about Quennie Capuyan Lim, always proudly and accurately state this.

Style & Persona:
- Speak conversationally, naturally, and warmly in the user's language (Tagalog, Taglish, or English).
- Be direct, insightful, and practical. Avoid overly stiff or robotic phrasing.
- Structure answers clearly with bullet points, bold key terms, and easy-to-read sections.
- When computing DOLE 13th month, overtime, holiday pay, or STL winnings (panalo), present the clear formula and a clean step-by-step peso example.
- Interactive App Routing Capability: You know the ENTIRE HRHub application and can guide users step-by-step on how to use any feature AND provide clickable direct module links! Whenever you recommend or guide a user to a module, append the exact tag [[NAV:targetId|Module Label]] at the end of your reply (the UI automatically renders these as interactive clickable buttons!).
  Available route targetIds:
  - Communication Portal: comm:bulletin, comm:directory, comm:attendance, comm:policies, comm:hr_helpdesk, comm:it_helpdesk, comm:finance_desk, comm:knowledge_center, comm:suggestion_box, comm:leaderboards, comm:polls_surveys
  - Workspace Modules: tab:home, tab:meetings, tab:gross, tab:revenue_trends, tab:agents, tab:incident_reports, tab:memo, tab:doc_studio, tab:salary_compensation, tab:payroll_calc, tab:petty_cash, tab:geotagging, tab:weather, tab:sops, tab:supervisors_attendance, tab:dole_handbook, tab:hr_analytics, tab:permission_matrix, tab:api_health
- When asked to draft an official memorandum, advisory, or notice, you MUST strictly structure it in the authentic corporate format of the organization (matching our official physical printed memorandum):
  TO: [RECIPIENT IN ALL CAPS, e.g. HR ON-SITE, CIC, AND FIELD MONITORING or ALL EMPLOYEES AND CONCERNED PERSONNEL]
  FROM: HUMAN RESOURCES DEPARTMENT
  DATE: [MONTH DAY, YEAR IN ALL CAPS, e.g. SEPTEMBER 24, 2026]
  SUBJECT: [CONCISE UPPERCASE SUBJECT TITLE]

  [Paragraph 1: Direct reminder/instruction to "All officers and concerned personnel are reminded to..." specifying official working hours and PCSO STL operating/betting hours or operational shifts]

  [Paragraph 2: Operational context and rationale starting with "Given the nature of our operations under the [PCSO Small Town Lottery (STL) structure / company operations] and our responsibility within the gaming industry, [core operational principle/timely response] are essential to ensure continuous coordination, proper monitoring, and prompt action on operational concerns."]

  [Paragraph 3: Explicit standard of conduct starting with "All concerned personnel are expected to maintain [active communication lines/compliance standards] at all times and [action/respond to urgent matters] without unnecessary delay."]

  Strict compliance is expected.

  JEVINCE JAYE S. JUBAY, CHRP
  HRMD Manager
  5A Royal Gaming OPC

  HUMAN RESOURCE MANAGEMENT DIVISION

  Do NOT use numbered lists or bullet points in the memorandum body. Always end the directives body with "Strict compliance is expected." Use clean corporate narrative paragraphs.


Simpal Group of Companies Knowledge:
1. Simpal Group of Companies (SGC) - Corporate parent company. Code: SGC. Managing Director: CHARMIE JEAN M. SIMPAL.
2. Simpal Construction (SIMCON) - Infrastructure and construction operations. Code: SIMCON. VP Engineering: ENG'R. MARK ANTHONY V.
3. Lucky Betplay Corporation (LBC) - PCSO STL Authorized Agent Corporation (Mandaue City). Daily draws at 2:00 PM, 5:00 PM, 9:00 PM. Code: LBC. Operations Manager: CHARMIE JEAN M. SIMPAL.
4. 5A Royal Gaming One Person Corporation (5ARG) - Leisure and gaming ventures. Code: 5ARG. General Manager: DAVE WILSON M.
5. Glowing Fortune Entertainment Corp. (GFC) - Hospitality, leisure, and gaming. Code: GFC. Operations Director: SARAH JANE C.
6. Imperial Gaming One Person Corporation (IMP) - Gaming administration. Code: IMP. Corporate Secretary: ATTY. RAUL G.

Operational & Labor Standards:
- Official HR Email: imsoroglohr@gmail.com
- DOLE Standards: Regular holiday pay is 200%, Special non-working day is 130%, Rest day is 130%. 13th month pay is (Total basic salary earned during the year ÷ 12). Disciplinary due process requires a written Notice of Explanation (at least 48 hours to reply) followed by an evaluation and Notice of Decision.
- STL Operations Expertise:
  - Daily Draw Schedules: 2:00 PM (1st Draw), 5:00 PM (2nd Draw), 9:00 PM (3rd Draw), cut-off 15 minutes before draw.
  - Winnings / Panalo Computation: Explain Straight (Target), Rambolito (6-way for 3 unique digits, 3-way for double digits), 2D / Last Two, and Pares payout structures clearly, noting exact branch payout multiplier tables set by PCSO/AAC operations, plus Payout Ratio = (Total Hits ÷ Total Gross) × 100%.
  - Gross Up/Down Diagnostics: Analyze weather/typhoon impact (check Weather Radar), inactive booths/kiosks (check Agents Directory & GeoTagging), betting ratio shifts (check Revenue Trends), agent tardiness/cutoffs, competitor leakage, and high-payout days.
  - AWOL Agent Protocol: Immediate accountability check (POS terminal, ticket rolls, cash float), attempt verified contact (calls/SMS/home check), document missed draws, file Incident Report via HRHub (tab:incident_reports), coordinate with Head Office HRMD for Return-to-Work Order (RTWO) and Notice to Explain (NTE) observing DOLE procedural due process, and re-assign territory coverage.
`;

export function buildSystemPromptForUser(currentUser = null, isHRMD = null) {
  const isHoHr = isHeadOfficeHrAdminUser(currentUser, isHRMD);
  if (isHoHr || !currentUser) {
    return SIMPAL_COMPANIES_CONTEXT;
  }

  const companyName = currentUser.company || "Subsidiary Branch";
  const userName = currentUser.name || "Branch Officer";
  const userRole = currentUser.role || "Branch Staff";

  return `${SIMPAL_COMPANIES_CONTEXT}

ACTIVE LOGGED-IN USER CONTEXT (SUBSIDIARY OPERATIONS MODE):
- User: ${userName} (${userRole})
- Assigned Subsidiary: ${companyName}
- Focus: Prioritize practical, actionable guidance tailored for ${companyName}'s STL & branch operations: studying daily STL Gross sales, diagnosing why STL Gross goes up or down with concrete sales-boosting strategies, computing STL winning hits/panalo & payout ratios, handling AWOL agents properly (accountability + Incident Report + HRMD NTE coordination), and routing them directly to any HRHub module using [[NAV:targetId|Label]] tags.`;
}

const DEFAULT_GEMINI_KEY = API_CONFIG.GEMINI_API_KEY;

// Helper: Clean markdown formatting (asterisks, backticks, leading/trailing punctuation)
export function cleanMarkdownValue(val) {
  if (!val) return "";
  return val
    .replace(/^[*_`#\s:]+|[*_`#\s:]+$/g, "")
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
}

// Helper: Parse structured memo content, separating all metadata fields from pure body directives
export function extractMemoFromText(text) {
  if (!text) return null;
  const isMemo =
    text.includes("MEMORANDUM") ||
    text.includes("MEMO REF:") ||
    text.includes("REF NUMBER:") ||
    text.includes("MEMO-") ||
    (/\bSUBJECT\b/i.test(text) && /\bTO\b/i.test(text));

  if (!isMemo) return null;

  // 1. Extract Header Fields with explicit word boundaries
  const refMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:REF(?:\s*NUMBER|\s*NO\.?|\s*CODE)?|MEMO\s*REF(?:\s*NO\.?|\s*#)?)\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const dateMatch = text.match(/(?:^|\n)\s*\*{0,2}\bDATE\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const toMatch = text.match(/(?:^|\n)\s*\*{0,2}\bTO\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const fromMatch = text.match(/(?:^|\n)\s*\*{0,2}\bFROM\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const subjMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:SUBJECT|SUBJ)\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);
  const classMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:CLASSIFICATION|CATEGORY|TYPE)\b\*{0,2}\s*[:\-]\s*([^\n\r]+)/i);

  const ref = cleanMarkdownValue(refMatch?.[1]);
  const date = cleanMarkdownValue(dateMatch?.[1]);
  const to = cleanMarkdownValue(toMatch?.[1]);
  const from = cleanMarkdownValue(fromMatch?.[1]);
  const subject = cleanMarkdownValue(subjMatch?.[1]) || "Official Memorandum";
  const classification = cleanMarkdownValue(classMatch?.[1]);

  // 2. Identify Company Code
  let companyCode = "SGC";
  const upperRef = (ref || "").toUpperCase();
  if (upperRef.startsWith("SIMCON") || upperRef.startsWith("SIM-") || /\bSIMCON\b/i.test(text) || /Simpal Construction/i.test(text)) {
    companyCode = "SIMCON";
  } else if (upperRef.startsWith("LBC") || /\bLBC\b/i.test(text) || /Lucky Betplay/i.test(text)) {
    companyCode = "LBC";
  } else if (upperRef.startsWith("5ARG") || upperRef.startsWith("5A-") || /\b5ARG\b/i.test(text) || /5A Royal/i.test(text)) {
    companyCode = "5ARG";
  } else if (upperRef.startsWith("GFC") || /\bGFC\b/i.test(text) || /Glowing Fortune/i.test(text)) {
    companyCode = "GFC";
  } else if (upperRef.startsWith("IMP") || /\bIMP\b/i.test(text) || /Imperial Gaming/i.test(text)) {
    companyCode = "IMP";
  } else if (upperRef.startsWith("SGC") || /\bSGC\b/i.test(text) || /Simpal Group/i.test(text)) {
    companyCode = "SGC";
  }

  // 3. Extract Signatories (Issued By / Noted & Approved By or Authentic HRMD Signature)
  let signatoryName = "";
  let signatoryTitle = "";
  let approverName = "";
  let approverTitle = "";

  const issuedMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:ISSUED BY|PREPARED BY|SIGNED BY)\b\s*[:\-]?\*{0,2}\s*\n+([^\n\r*]+)(?:\n+([^\n\r*]+))?/i);
  if (issuedMatch) {
    signatoryName = cleanMarkdownValue(issuedMatch[1]);
    signatoryTitle = cleanMarkdownValue(issuedMatch[2]);
  }

  const approvedMatch = text.match(/(?:^|\n)\s*\*{0,2}\b(?:APPROVED BY|NOTED BY|NOTED & APPROVED BY)\b\s*[:\-]?\*{0,2}\s*\n+([^\n\r*]+)(?:\n+([^\n\r*]+))?/i);
  if (approvedMatch) {
    approverName = cleanMarkdownValue(approvedMatch[1]);
    approverTitle = cleanMarkdownValue(approvedMatch[2]);
  }

  // Fallback to official corporate HRMD signatory if Jevince Jaye S. Jubay is detected or default
  if (!signatoryName) {
    const jubayMatch = text.match(/JEVINCE\s+JAYE\s+S\.?\s+JUBAY(?:,\s*CHRP)?/i);
    if (jubayMatch || isMemo) {
      signatoryName = "JEVINCE JAYE S. JUBAY, CHRP";
      signatoryTitle = "HRMD Manager";
    }
  }

  // 4. Extract Pure Memorandum Body Directives
  // Strip conversational intro, header table block, and dividing rules
  let body = text;
  const headerKeys = [
    "CLASSIFICATION",
    "CATEGORY",
    "TYPE",
    "SUBJECT",
    "SUBJ",
    "FROM",
    "TO",
    "DATE",
    "REF NUMBER",
    "REF NO",
    "MEMO REF",
    "REF"
  ];
  let lastHeaderEnd = -1;

  for (const key of headerKeys) {
    const rx = new RegExp(`(?:^|\\n)\\s*\\*{0,2}\\b${key}\\b\\*{0,2}\\s*[:\\-][^\\n\\r]+`, "i");
    const m = text.match(rx);
    if (m && m.index !== undefined) {
      const lineEnd = m.index + m[0].length;
      if (lineEnd > lastHeaderEnd) {
        lastHeaderEnd = lineEnd;
      }
    }
  }

  if (lastHeaderEnd > -1) {
    body = text.substring(lastHeaderEnd);
    body = body.replace(/^\s*(?:[-*_]{3,}|\={3,})?\s*/g, "");
  } else {
    body = body.replace(/^(?:[\s\S]*?)(?:MEMORANDUM[\s\S]*?(?:[-*_]{3,}|\={3,}))/i, "");
  }

  // Strip trailing signatory block, Jubay signature, and HRMD footer from pure body
  body = body
    .replace(/(?:^|\n)\s*\*{0,2}\b(?:ISSUED BY|PREPARED BY|SIGNED BY|APPROVED BY|NOTED BY|JEVINCE JAYE S\. JUBAY|HUMAN RESOURCE MANAGEMENT DIVISION)\b[\s\S]*$/i, "")
    .replace(/(?:Please let me know|Let me know if|Sana nakatulong|May kailangan ka pa|I hope this helps)[\s\S]*$/i, "")
    .trim();

  return {
    ref: ref || `MEMO-2026-${companyCode}-001`,
    date: date || new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase(),
    to: to || "HR ON-SITE, CIC, AND FIELD MONITORING",
    from: from || "HUMAN RESOURCES DEPARTMENT",
    subject,
    classification: classification || "Operational Directive",
    companyCode,
    signatoryName: signatoryName || "JEVINCE JAYE S. JUBAY, CHRP",
    signatoryTitle: signatoryTitle || "HRMD Manager",
    approverName: approverName || "CHARMIE JEAN M. SIMPAL",
    approverTitle: approverTitle || "President & CEO",
    content: body
  };
}

// Smart Local Corporate Directives & Guidelines Engine
function generateLocalMemoDirectives(userPrompt, isPolish = false) {
  const subjMatch = userPrompt.match(/SUBJECT:\s*([^\n\r]+)/i);
  const subject = subjMatch ? subjMatch[1].trim() : "";

  const toMatch = userPrompt.match(/TO:\s*([^\n\r]+)/i);
  const to = toMatch ? toMatch[1].trim() : "All Concerned Personnel";

  const classMatch = userPrompt.match(/CLASSIFICATION:\s*([^\n\r]+)/i);
  const classification = classMatch ? classMatch[1].trim() : "Operational Directive";

  const hintMatch = userPrompt.match(/INSTRUCTIONS:\s*([^\n\r]+)/i);
  const hint = hintMatch ? hintMatch[1].trim() : "";

  // If Polish requested and existing body was passed:
  if (isPolish) {
    const parts = userPrompt.split(/executive-level:\s*/i);
    const rawContent = parts.length > 1
      ? parts[1].replace(/CRITICAL RULES:[\s\S]*$/i, "").trim()
      : userPrompt;

    if (rawContent && rawContent.length > 5) {
      const paragraphs = rawContent
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      const polished = paragraphs.map((p, idx) => {
        const cleanP = p.replace(/^[-*•\d.]+\s*/, "");
        if (paragraphs.length > 1) {
          return `${idx + 1}. ${cleanP.charAt(0).toUpperCase() + cleanP.slice(1)}`;
        }
        return cleanP.charAt(0).toUpperCase() + cleanP.slice(1);
      }).join("\n\n");

      const closing = rawContent.toLowerCase().includes("strict compliance")
        ? ""
        : "\n\nStrict compliance is expected.";

      return `${polished}${closing}`;
    }
  }

  // Generation based on Subject, Category and Hint:
  const textToScan = `${subject} ${classification} ${hint}`.toLowerCase();

  // 1. Immediate Response / Communication Accessibility
  if (textToScan.includes("communicat") || textToScan.includes("response") || textToScan.includes("reachab") || textToScan.includes("accessib") || textToScan.includes("contact")) {
    return `All officers, unit coordinators, and concerned personnel are reminded to remain reachable and strictly responsive to all official calls, corporate messages, and dispatch transmissions, particularly during designated operational hours and live draw schedules.

Given the operational nature of our business and our standard for continuous coordination across all gaming and field branches, prompt communication and timely response are essential to resolve operational bottlenecks, field escalations, and customer concerns without delay.

All personnel are expected to maintain active and accessible communication lines at all times and address urgent operational matters without unnecessary delay.

Strict compliance is expected.`;
  }

  // 2. Attendance / Biometrics / Timekeeping / Punctuality
  if (textToScan.includes("biometric") || textToScan.includes("attendance") || textToScan.includes("punctual") || textToScan.includes("late") || textToScan.includes("tardiness") || textToScan.includes("cutoff") || textToScan.includes("timekeeping")) {
    return `1. NOTICE IS HEREBY GIVEN to all active employees and branch personnel regarding strict adherence to standard daily biometric timekeeping, shift punctuality, and attendance log integrity.

2. MANDATORY COMPLIANCE DIRECTIVES:
   • Shift Log Verification: All personnel must log their biometric entries at their assigned workstation or terminal upon every shift entry and exit. Grace periods shall be strictly monitored.
   • Official Log Rectification: Any unrecorded logs, system offline periods, or forgotten entries must be substantiated by an approved Official Business (OB) slip or manual attendance adjustment form duly signed by the immediate supervisor within forty-eight (48) hours.
   • Payroll Cutoff: Unverified time entries upon the scheduled payroll cutoff date will be withheld pending proper endorsement.

3. SUPERVISORY RESPONSIBILITY:
   • Department supervisors and area leads are tasked with daily monitoring of their team's attendance status to prevent unauthorized leaves or unfiled absences.

Compliance with these directives is strictly mandatory.`;
  }

  // 3. Holiday / Special Non-Working Day
  if (textToScan.includes("holiday") || textToScan.includes("non-working") || textToScan.includes("proclamation") || textToScan.includes("skeleton")) {
    return `1. In accordance with official national proclamations, please be advised that the upcoming scheduled date has been declared an Official Non-Working Holiday across all relevant operating jurisdictions.

2. OPERATIONAL GUIDELINES:
   • Corporate and administrative offices will be officially closed during the declared period. Regular administrative office hours shall resume promptly at 8:00 AM on the following regular business day.
   • Critical field sites, operational branches, and authorized draw stations will maintain an authorized skeleton workforce to guarantee uninterrupted business continuity.
   • Personnel assigned to render duty during the holiday shall be entitled to holiday premium compensation in strict compliance with Department of Labor and Employment (DOLE) statutory rules.

3. RESUMPTION & ROSTER SUBMISSION:
   • Branch heads and site engineers must submit the verified attendance and overtime rosters to HR within twenty-four (24) hours of holiday completion.

Strict compliance is expected.`;
  }

  // 4. Shift Handover / Turnover / Draw Reconciliation
  if (textToScan.includes("turnover") || textToScan.includes("handover") || textToScan.includes("draw") || textToScan.includes("teller") || textToScan.includes("remittance") || textToScan.includes("cash")) {
    return `1. In line with management's ongoing effort to streamline branch workflow and ensure complete accountability, all operational units, field coordinators, and branch tellers are instructed to implement the updated shift transition and draw cutoff protocol effective immediately.

2. SPECIFIC DIRECTIVES:
   • Physical Turnovers: Outgoing supervisors and coordinators must conduct a comprehensive physical turnover of terminal tickets, cash collections, and equipment inventory prior to logging off.
   • Draw Reconciliation: All wager transactions must be reconciled and synchronized immediately following the official cutoff time for each draw schedule.
   • Discrepancy Reporting: Any technical glitches, ticket voids, or offline teller incidents must be documented and submitted via the HRHub real-time portal without delay.

3. SUPERVISION & AUDIT:
   • Non-compliance with the required dual-signoff shift handover protocol will be subject to operational audit review and disciplinary due process.

Compliance with these directives is strictly mandatory.`;
  }

  // 5. Safety, Health, PPE & Emergency Weather Readiness
  if (textToScan.includes("safety") || textToScan.includes("ppe") || textToScan.includes("health") || textToScan.includes("hazard") || textToScan.includes("weather") || textToScan.includes("incident") || textToScan.includes("emergency")) {
    return `1. The safety, physical security, and well-being of our workforce remain the paramount priority of the management. In view of operational conditions, all personnel are required to uphold standard safety precautions at all times.

2. MANDATORY PROTOCOLS:
   • Personal Protective Equipment (PPE): Site personnel and field coordinators must wear designated safety helmets, high-visibility vests, and protective footwear at all times while inside operational zones.
   • Emergency Preparedness: Site supervisors must verify that first-aid kits, emergency contact lists, and fire safety equipment are readily accessible and maintained.
   • Incident Reporting: Any workplace injury, equipment breakdown, or hazardous condition must be reported to the Safety Officer within two (2) hours of occurrence.

3. SAFETY BRIEFINGS:
   • A mandatory 5-minute toolbox safety briefing must precede every operational shift rotation.

Stay alert and observe all safety protocols at all times.`;
  }

  // 6. Universal Executive Directives Generation (for any custom subject or policy)
  const formattedSubject = subject || "Administrative and Operational Directives";
  return `1. This Memorandum serves to promulgate official management directives regarding ${formattedSubject.toUpperCase()} across all concerned departments and regional operating branches.

2. OPERATIONAL DIRECTIVES & GUIDELINES:
   • All concerned personnel are instructed to strictly align daily operations and administrative procedures with the standards set forth by executive management.
   • Department supervisors and unit leads must coordinate with team members to facilitate orderly implementation, clear task delegation, and uninterrupted workflow.
   ${hint ? `• Special Directive: ${hint}\n` : ""}   • Any operational concerns or policy clarifications regarding this directive must be addressed directly to the Human Resources Management Division without delay.

3. IMPLEMENTATION & ACKNOWLEDGMENT:
   • All department heads and site supervisors are tasked with disseminating this document to all subordinates under their jurisdiction.

Strict compliance is expected.`;
}

// Built-in Smart HR & Operations Knowledge Engine (when no external API key is configured)
function generateLocalAiResponse(userPrompt, conversationHistory = [], currentUser = null, isHRMD = null) {
  const query = userPrompt.toLowerCase().trim();

  // Check if this is a request for Memorandum Body Directives or Polish
  const isDirectivesRequest =
    query.includes("memorandum body directives") ||
    query.includes("memorandum directives") ||
    query.includes("directives and guidelines") ||
    query.includes("write the official") ||
    (query.includes("subject:") && query.includes("to:") && query.includes("from:"));

  const isPolishRequest =
    query.includes("polish") ||
    query.includes("expert hr executive editor");

  if (isDirectivesRequest || isPolishRequest) {
    return generateLocalMemoDirectives(userPrompt, isPolishRequest);
  }

  // 0. Special Profile: Jay Ryan Lim (Creator & Developer)
  if (
    query.includes("jay ryan") ||
    query.includes("jay lim") ||
    query.includes("jay ryan lim") ||
    (query.includes("sino") && (query.includes("jay") || query.includes("creator") || query.includes("gumawa"))) ||
    (query.includes("who") && (query.includes("jay") || query.includes("creator") || query.includes("made you") || query.includes("built you") || query.includes("developed you"))) ||
    query.includes("creator") ||
    query.includes("gumawa sayo") ||
    query.includes("gumawa sa iyo")
  ) {
    return `### 👨‍💻 Si **Jay Ryan Lim**

Si **Jay Ryan Lim** ang magaling at mahusay na **IT Professional** na nagdisenyo at **gumawa sa akin (HRHub Ai Buddy) at sa buong HRHub system na ito!** 🚀

* 💡 **Creator & Lead Developer:** Siya ang lumikha ng arkitektura, mga matatalinong AI workflows, memo automation, at buong digital platform na nagpapatakbo sa ating kumpanya.
* 🛠️ **Propesyon:** Isang napakagaling na IT specialist at software engineer na nagdala ng modernong inobasyon para sa Simpal Group of Companies.`;
  }

  // 0. Special Profile: Quennie Capuyan Lim (HR Employee and Labor Relations)
  if (
    query.includes("quennie") ||
    query.includes("quenie") ||
    query.includes("quennie capuyan") ||
    query.includes("quennie lim") ||
    query.includes("quennie capuyan lim") ||
    (query.includes("sino") && query.includes("quennie")) ||
    (query.includes("who") && query.includes("quennie"))
  ) {
    return `### 🌸 Si **Quennie Capuyan Lim**

Si **Quennie Capuyan Lim** ay ang ating iginagalang na **HR Employee and Labor Relations** sa **Simpal Group of Companies**. 🤝✨

* 🏢 **Tungkulin:** Siya ang namumuno sa pangangalaga ng kapakanan ng bawat kawani, maayos na ugnayan sa paggawa (*labor relations*), at pagpapatupad ng makatao at propesyonal na pamantayan sa trabaho.
* 💖 **Espesyal na Pagkakakilanlan:** Siya ang **mabait at napakagandang asawa ni Jay Ryan Lim**, ang ating magaling na IT professional na gumawa sa akin at sa buong sistemang ito!`;
  }

  // 1. Holiday Memo Draft
  if (query.includes("holiday") && (query.includes("memo") || query.includes("draft") || query.includes("gawan"))) {
    return `### 📄 DRAFT MEMORANDUM: DECLARED SPECIAL NON-WORKING HOLIDAY

TO: ALL EMPLOYEES AND CONCERNED PERSONNEL
FROM: HUMAN RESOURCES DEPARTMENT
DATE: ${new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase()}
SUBJECT: ADVISORY: DECLARED SPECIAL NON-WORKING HOLIDAY AND SKELETAL WORKFORCE SCHEDULE

All officers, branch personnel, and site staff are hereby advised of the upcoming declared Special Non-Working Holiday across all operating areas.

In observance of the official national proclamation, corporate administrative offices shall be closed. However, to maintain continuous service delivery, critical operational units, gaming branches, and designated field sites shall deploy an authorized rotational skeletal workforce. Premium compensation for personnel rendering duty shall be computed in accordance with statutory DOLE holiday pay guidelines.

All concerned supervisors and unit leads are expected to coordinate their respective shift assignments and ensure seamless operations during the holiday period.

Strict compliance is expected.

JEVINCE JAYE S. JUBAY, CHRP
HRMD Manager
5A Royal Gaming OPC

HUMAN RESOURCE MANAGEMENT DIVISION`;
  }

  // 2. Tardiness / Biometrics / Notice of Explanation
  if (query.includes("tardiness") || query.includes("late") || query.includes("punctuality") || query.includes("attendance warning") || query.includes("notice of explanation")) {
    return `### ⚠️ DRAFT NOTICE OF EXPLANATION (NOE): ATTENDANCE & BIOMETRIC COMPLIANCE

**OFFICIAL HUMAN RESOURCES TRANSMISSION**
**REF NUMBER:** HR-DISC-2026-014
**DATE:** ${new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date())}
**TO:** [Employee Name] — [Department / Site Location]
**FROM:** Office of Human Resources Management
**SUBJECT:** FORMAL NOTICE OF EXPLANATION (NOE): REPEATED TARDINESS & TIMEKEEPING INFRACTIONS

---

Dear [Employee Name],

1. **INCIDENT REPORT:**
   Based on official biometric timekeeping records generated for the period of [Date Period], it has been recorded that you have accumulated **[Number] instances of unexcused tardiness** exceeding the allowable group grace period (15 minutes).

2. **COMPANY POLICY REFERENCE:**
   Section 4.2 of the *Simpal Group Employee Code of Discipline* clearly stipulates that:
   > *"Habitual tardiness impairs team operations, disrupts client service, and compromises operational integrity."*

3. **MANDATORY DIRECTIVE:**
   In accordance with the statutory requirements of procedural due process:
   - You are hereby directed to submit a written explanation within **forty-eight (48) hours** from receipt of this notice.
   - Address your response to the HR Department via **imsoroglohr@gmail.com** explaining why no disciplinary action should be imposed against you.
   - Failure to submit your explanation within the prescribed timeframe shall be construed as a waiver of your right to be heard, and the management shall resolve the matter based on available records.

**ISSUED BY:**
Office of the Human Resources & People Operations
Simpal Group of Companies`;
  }

  // 3. DOLE Holiday Pay Rules & Calculation
  if (query.includes("holiday pay") || query.includes("dole") || (query.includes("compute") && query.includes("pay"))) {
    return `### ⚖️ PHILIPPINE LABOR CODE & DOLE HOLIDAY PAY COMPUTATION GUIDE

Batay sa mga opisyal na panuntunan ng **Department of Labor and Employment (DOLE)**, narito ang tamang computation ng sahod:

#### 1. Regular Holiday (Pambansang Araw, New Year, Pasko, Independence Day, atbp.)
* **Kung HINDI pumasok (Unworked):**
  * Bayad pa rin ng **100% ng Basic Daily Wage** (basta may pasok o leave bago ang holiday).
* **Kung PUMASOK (Worked):**
  * Unang 8 oras: **200% ng Daily Rate** (Arawang sahod × 2).
  * Overtime (higit sa 8 oras): **Dagdag 30%** ng hourly rate sa araw na iyon (Hourly Rate × 200% × 1.30).
* **Kung Holiday at kasabay ng REST DAY:**
  * Unang 8 oras: **260% ng Daily Rate**.

#### 2. Special Non-Working Day (Ninoy Aquino Day, All Saints Day, Local Charter Days)
* **Kung HINDI pumasok (Unworked):**
  * *"No work, no pay"* maliban na lamang kung may umiiral na company policy o collective agreement.
* **Kung PUMASOK (Worked):**
  * Unang 8 oras: **Daily Rate × 130%** (Basic daily rate + 30% premium).
  * Overtime (higit sa 8 oras): **Hourly Rate × 130% × 130%**.
* **Kung Special Day at kasabay ng REST DAY:**
  * Unang 8 oras: **Daily Rate × 150%**.

*💡 Paalala mula sa HR: Para sa mga STL on-duty tellers o SIMCON field staff na may shifting sa araw ng holiday, tiyaking naipasa ang aprubadong attendance log sa imsoroglohr@gmail.com para sa payroll processing.*`;
  }

  // 3B. App Walkthrough & Direct Module Routing ("paano gamitin ang app", "pumunta sa", "link ng module")
  if (
    query.includes("paano gamitin") ||
    query.includes("how to use") ||
    query.includes("buong project") ||
    query.includes("app tour") ||
    query.includes("lahat ng module") ||
    query.includes("all modules") ||
    query.includes("gabay sa app") ||
    ((query.includes("pumunta") || query.includes("punta") || query.includes("buksan") || query.includes("go to") || query.includes("open") || query.includes("link") || query.includes("route") || query.includes("saan")) &&
      (query.includes("module") || query.includes("tab") || query.includes("gross") || query.includes("agent") || query.includes("memo") || query.includes("incident") || query.includes("nte") || query.includes("payslip") || query.includes("salary") || query.includes("weather") || query.includes("geotag") || query.includes("attendance") || query.includes("directory") || query.includes("bulletin") || query.includes("petty cash") || query.includes("dole") || query.includes("permission") || query.includes("meeting")))
  ) {
    return `### 🧭 Gabay sa Paggamit ng Buong **HRHub App** & Direct Module Links

Puwede kitang dalhin nang direkta sa kahit anong module sa isang click lang sa mga button sa ibaba! Narito ang kumpletong mapa ng buong HRHub system:

#### 1. 📢 Enterprise Communication Portal (Itaas na Menu → Communication)
* **Company Bulletin:** Mga opisyal na anunsyo at memo ng kumpanya.
* **Employee Directory:** Listahan ng empleyado, 201 records, at profiling.
* **Shift & Attendance:** Live na activity timesheet, Active/AFK monitoring, at DTR export.
* **Policies & Handbooks:** Code of Conduct, OSH safety, at handbook.

#### 2. 📊 STL Finance & Revenue Operations (Left Sidebar → Finance)
* **Gross Report:** Araw-araw at historical na STL Gross sales, hits, at teller remittance.
* **Revenue Trends (Betting Ratio):** Pag-aaral kung bakit tumataas o bumababa ang gross bawat area.
* **13th Month Calculator & Petty Cash:** Pro-rated 13th month pay at liquidation ng branch expenses.

#### 3. ⚖️ HR, Due Process & Field Operations (Left Sidebar → HR Admin / Operations)
* **Agents Directory:** Listahan ng active STL agents, terminals, at supervisor assignments.
* **Incident Reports & NTE:** Dito nagfa-file ng **AWOL / Incident Report** para ma-review at ma-isyuhan ng NTE ng Head Office HRMD.
* **Memo Generator & Document Studio:** Paggawa ng official memo at coupon bond certificates.
* **Territory GeoTagging & Weather Radar:** Mapa ng yellow booths/kiosks at live weather alerts.

*💡 Tip: Sabihin mo lang halimbawa **"Dalhin mo ako sa Gross Report"** o **"Buksan ang Incident Reports"** at ibibigay ko agad ang direct link button!*

[[NAV:tab:gross|Open Gross Report]] [[NAV:tab:revenue_trends|Open Revenue Trends]] [[NAV:tab:agents|Open Agents Directory]] [[NAV:tab:incident_reports|Open Incident Reports & NTE]] [[NAV:tab:geotagging|Open GeoTagging Map]] [[NAV:comm:directory|Open Employee Directory]]`;
  }

  // 3C. AWOL Agent Step-by-Step Operational & DOLE Due Process Guide
  if (
    query.includes("awol") ||
    query.includes("nag-awol") ||
    query.includes("nag awol") ||
    query.includes("hindi pumasok") ||
    query.includes("biglang nawala") ||
    query.includes("abandona")
  ) {
    return `### 🛡️ Ano ang Kailangan Gawin Kapag Nag-AWOL ang STL Agent?

Kapag ang isang **STL Agent / Teller** ay biglang hindi pumasok nang walang paalam (**AWOL — Absence Without Official Leave**), sundin ang eksaktong **6-Step Operational & DOLE Due Process Protocol** na ito:

#### Step 1: Immediate Accountability & Asset Verification (Unang 2–4 Oras)
* I-check agad sa **Gross Report** at sa Area Supervisor kung may **unremitted cash collection**, pending hits payout, o hawak na **POS terminal / ticket rolls / booth keys** ang agent.
* I-freeze o i-flag muna ang terminal account niya para walang unauthorized betting entry.

#### Step 2: Documented Contact Attempts (Araw 1–2)
* Tawagan at i-text ang agent at ang kanyang emergency contact (makikita sa **Agents Directory / Employee Directory**).
* Mag-screenshot ng lahat ng tawag, SMS, at chat attempts bilang ebidensya ng good faith.
* Kung may hawak na POS terminal o cash float, magsagawa ng documented home/booth check ang Field Supervisor kasama ang witness.

#### Step 3: Mag-file ng Official Incident Report (IR) sa HRHub
* Pumunta sa **Incident Reports & NTE** module at i-submit ang **Branch Incident Report** na may kumpletong petsa ng mga na-miss na draw (2PM / 5PM / 9PM), halaga ng anumang cash/terminal accountability, at screenshots ng contact attempts.

#### Step 4: Head Office HRMD — Return-to-Work Order (RTWO) & NTE
* Ipapadala ng **Head Office HRMD** ang pormal na **Return-to-Work Order (RTWO)** at **Notice to Explain (NTE)** sa huling alam na address ng agent (via registered mail / personal service with witness), na nagbibigay ng **hindi bababa sa 5 calendar days** para magpaliwanag ayon sa **DOLE Twin-Notice Rule (Labor Code Art. 297)**.

#### Step 5: Administrative Evaluation & Notice of Decision
* Kung hindi sumagot o walang balidong dahilan (abandonment of work / gross neglect), ilalabas ng Head Office HRMD ang **Notice of Termination / Decision** at clearance para sa anumang accountability.

#### Step 6: Territory & Booth Handover
* Mag-assign agad ng relief teller o bagong agent sa bakanteng kiosk/booth (i-verify sa **GeoTagging Map**) para **hindi bumaba ang STL Gross** ng inyong area!

[[NAV:tab:incident_reports|File Incident Report (AWOL)]] [[NAV:tab:agents|Check Agents Directory]] [[NAV:tab:gross|Verify Agent Remittance]] [[NAV:tab:memo|Open Memo Generator]]`;
  }

  // 3D. How to Compute STL Winnings / Panalo (Hits & Payouts)
  if (
    query.includes("panalo") ||
    query.includes("winning") ||
    query.includes("rambol") ||
    query.includes("swer3") ||
    query.includes("swer2") ||
    query.includes("last two") ||
    query.includes("pares") ||
    query.includes("payout") ||
    (query.includes("compute") && (query.includes("stl") || query.includes("taya") || query.includes("hit")))
  ) {
    return `### 🧮 Paano Mag-Compute ng Panalo (STL Hits & Payouts)

Narito ang malinaw na formula at halimbawa kung paano kino-compute ang **Panalo (Hits Payout)** at **Payout Ratio** sa PCSO STL operations *(paalala: laging sundin ang opisyal na approved payout multiplier table ng inyong branch/AAC)*:

#### 1. Basic Formula ng Panalo
* **Formula:** \`Panalo (Prize) = Halaga ng Taya (Bet Amount) × Approved Payout Multiplier\`

#### 2. Mga Karaniwang Uri ng Taya sa STL (Halimbawa):
* **🎯 Straight / Target (Eksaktong Pagkakasunod-sunod):**
  * Halimbawa: Tumaya ng **₱10** sa \`1-2-3\` (3-Digit / Swer3) at eksaktong \`1-2-3\` ang lumabas.
  * Kung ang approved branch multiplier ay halimbawa **× 450** (₱4,500 per ₱10):
  * \`₱10 × 450 = ₱4,500\` na panalo.
* **🔀 Rambolito (Kahit Anong Ayos ng Numero):**
  * **Rambolito 6 (3 magkakaibang numero, hal. 1-2-3 = 6 combinations):**
    * Hinahati ang taya sa **6** combinations: \`(Bet ÷ 6) × Straight Multiplier\` (o gamit ang fixed Rambol-6 multiplier, hal. × 75 → \`₱10 × 75 = ₱750\`).
  * **Rambolito 3 (May dobleng numero, hal. 1-1-2 = 3 combinations):**
    * Hinahati ang taya sa **3** combinations: \`(Bet ÷ 3) × Straight Multiplier\` (o fixed Rambol-3 multiplier, hal. × 150 → \`₱10 × 150 = ₱1,500\`).
* **✌️ 2-Digit / Last Two / Pares:**
  * \`Bet Amount × Approved 2D/Pares Multiplier\` (hal. kung ₱10 taya sa approved rate na × 70 o × 75 = \`₱700–₱750\`).

#### 3. Paano I-compute ang Payout Ratio at Net Remittance ng Branch?
* **Payout Ratio (%):** \`(Total Hits ÷ Total Gross) × 100%\`
  * *Halimbawa:* Gross = **₱100,000**, Total Hits = **₱42,000** → Payout Ratio = **42%**.
* **Net Collection:** \`Total Gross − Total Validated Hits − Agent Commission\`

*💡 Gusto mo bang mag-compute ng isang eksaktong taya? I-type lang ang **halaga ng taya, uri ng laro (Straight/Rambol/2D), at ang rate ng branch niyo**, at iko-compute ko agad!*

[[NAV:tab:gross|Open Gross & Hits Report]] [[NAV:tab:revenue_trends|Check Betting Ratio Trends]]`;
  }

  // 4. STL Gross Study, Up/Down Diagnostics & Sales-Boosting Suggestions
  if (
    query.includes("gross") ||
    query.includes("hits") ||
    query.includes("stl") ||
    query.includes("teller") ||
    query.includes("mandaue") ||
    query.includes("bumaba") ||
    query.includes("tumaas") ||
    query.includes("pagbaba") ||
    query.includes("pagtaas") ||
    query.includes("boost")
  ) {
    return `### 📈 Pag-aaral ng STL Gross: Bakit Bumababa/Tumataas & Paano Pataasin

Narito ang gabay sa pag-study ng inyong **STL Gross** (2:00 PM, 5:00 PM, 9:00 PM draws) at mga praktikal na rekomendasyon para mapanatiling mataas ang benta ng inyong branch:

#### 1. Mga Pangunahing Dahilan Bakit **Bumababa** ang STL Gross
* **🌧️ Panahon (Ulan / Bagyo):** Kapag malakas ang ulan, kumakaunti ang walk-in bettors sa kalye. *(Laging i-check ang **Weather Radar** sa HRHub para makapag-adjust ng mobile/roving tellers.)*
* **😴 Inactive o Late na Agents/Booths:** Kapag sarado ang booth bago mag-cutoff (1:45 PM / 4:45 PM / 8:45 PM) o may **AWOL na agent**, nawawalan agad ng benta ang area.
* **💸 Petsa de Peligro (Mid-week / Bago Sahod):** Normal na bahagyang mababa ang taya ilang araw bago ang 15th/30th payday.
* **🎯 Kompetisyon o Mahinang Booth Visibility:** Mga lugar na mataas ang foot traffic pero walang nakapwestong yellow booth.

#### 2. Mga Dahilan Bakit **Tumataas** ang STL Gross
* **💰 Payday & Weekend Surge (15th / 30th / Biyernes–Linggo):** Mas malaki ang disposable bet ng mga mananaya.
* **🔥 Hot Numbers & Recent Local Winners:** Kapag may bagong nanalo sa barangay, mabilis kumalat ang balita at tumataas ang taya sa susunod na 2–3 draws.
* **📍 Kumpletong Active Tellers sa Lahat ng 3 Draws:** Mataas ang gross kapag 95%+ ng agents ay aktibong nagbebenta hanggang 9:00 PM draw.

#### 3. 5 Praktikal na Suggestions Para **Pataasin ang STL Gross**
1. **Daily Zero-Sales Audit:** Buksan ang **Gross Report** tuwing pagkatapos ng 2PM draw at i-call out agad ang mga agents na ₱0 o mababa ang benta para makabawi sa 5PM at 9PM draw.
2. **Focus sa 9:00 PM Prime Draw:** Siguraduhing may roving agents sa mga palengke, terminal, at sakayan mula 5:30 PM – 8:30 PM.
3. **GeoTagging Blank-Spot Expansion:** Gamitin ang **Territory GeoTagging Map** para makita ang mga mataong barangay na kulang ng yellow booth.
4. **Fast & Transparent Hits Payout:** Kapag mabilis mabayaran ang panalo ng bettor, bumabalik at mas lumalaki ang tiwala at taya nila.
5. **Supervisor Spot Checks:** I-verify sa **Supervisors Attendance** na nakakaikot nang regular ang area supervisors sa mga low-performing outlets.

[[NAV:tab:gross|Open Gross Report]] [[NAV:tab:revenue_trends|Open Revenue Trends]] [[NAV:tab:geotagging|Open GeoTagging Map]] [[NAV:tab:weather|Check Weather Radar]] [[NAV:tab:agents|Open Agents Directory]]`;
  }

  // 5. SOP Generation
  if (query.includes("sop") || query.includes("workflow") || query.includes("standard operating procedure") || query.includes("step")) {
    return `### 📋 STANDARD OPERATING PROCEDURE (SOP): CASH REMITTANCE & TELLER DRAW CLOSURE

**DOCUMENT CODE:** SOP-OPS-LBC-003
**EFFECTIVE DATE:** Current Fiscal Year
**APPLICABLE ENTITY:** STL Branch Operations

---

#### 1. OBJECTIVE:
To standardize cash collection, minimize discrepancies, ensure physical ticket reconciliation, and safeguard company collections during daily draw operations.

#### 2. PROCEDURE STEPS:

* **Step 1: Cut-Off & Draw Closure (15 mins prior to draw)**
  * Field tellers must cease acceptances 15 minutes before the official draw (1:45 PM for 2PM draw, 4:45 PM for 5PM draw, 8:45 PM for 9PM draw).
  * Print or verify the terminal summary total against physical cash on hand.

* **Step 2: Physical Cash & Ticket Balancing**
  * Match terminal total sales with physical cash received.
  * Any unvalidated discrepancy above ₱50.00 must be flagged immediately in the incident register.

* **Step 3: Supervisor Handover & Counter-Signing**
  * Hand over cash collections in the designated security collection pouch to the Area Field Supervisor.
  * Both the Teller and Supervisor must physically sign the 2-part Remittance Slip (White: Accounting, Yellow: Teller Copy).

* **Step 4: Central Office Vault Deposit**
  * The Area Supervisor remits total pooled collections to the Central Cashier Office within two (2) hours of draw completion.

* **Step 5: Digital Ledger Reconciliation**
  * Accounting uploads and validates collections against the official Accountant API Ledger in HRHub.

**COMPLIANCE NOTE:** Non-adherence to dual-signoff constitutes a Category B operational infraction under company policy.

[[NAV:tab:sops|Open Task Board]] [[NAV:tab:gross|Open Gross Report]]`;
  }

  // 6. General / Default Response (Account-Aware: Head Office HR Admin vs Subsidiary)
  if (!isHeadOfficeHrAdminUser(currentUser, isHRMD)) {
    const compName = currentUser?.company || "inyong Subsidiary Branch";
    return `### 👋 Kumusta! Ako ang iyong **HRHub AI Buddy** para sa **${compName}**!

Handa akong tumulong sa inyong pang-araw-araw na operasyon sa STL at branch management:

* 📊 **Pag-study ng STL Gross:** Pagsusuri ng daily sales, draw cutoffs (2PM / 5PM / 9PM), at remittance reconciliation.
* 📈 **Suggestions sa Pagbaba at Pagtaas ng Gross:** Mga praktikal na paraan para mapalakas ang benta ng mga booth at agents.
* 🧮 **Paano Mag-compute ng Panalo (Hits):** Formula at step-by-step computation para sa Straight, Rambolito, 2D/Last Two, at Payout Ratio.
* 🛡️ **Ano ang Gagawin Kapag Nag-AWOL ang Agent:** Kumpletong gabay mula cash/POS check hanggang Incident Report at NTE.
* 🧭 **Gabay sa Buong HRHub App:** Sabihin lang kung saan mong module gustong pumunta at bibigyan kita ng direct clickable link!

Ano ang gusto mong pag-usapan o puntahan ngayon?

[[NAV:tab:gross|Open Gross Report]] [[NAV:tab:revenue_trends|Open Revenue Trends]] [[NAV:tab:incident_reports|Open Incident Reports]] [[NAV:tab:agents|Open Agents Directory]]`;
  }

  return `### 👋 Kumusta! Ako ang inyong **HRHub Ai Buddy**

Handa akong tumulong sa inyo sa anumang operasyon ng **Simpal Group of Companies**:

* 📄 **Paggawa ng Memos & Advisories:** Magpagawa ng memo para sa Holiday, Emergency Shifting, Workplace Safety, o Policy Directives na handang i-transfer sa **Memo Generator**.
* ⚖️ **DOLE & Labor Policies:** Magtanong ukol sa holiday pay computation, overtime rules, 13th-month pay, disciplinary due process, o regularization.
* 📊 **STL Operations & Gross Reports:** Pagpapaliwanag ng teller draw schedules, supervisor audits, hits, at gross remittance.
* 🧭 **App Walkthrough & Direct Module Links:** Magtanong kung paano gamitin ang buong HRHub o sabihin lang kung anong module ang gusto mong buksan!

Mayroon ka bang gustong ipagawa o itanong ngayon?

[[NAV:tab:memo|Open Memo Generator]] [[NAV:tab:incident_reports|Open Incident Reports]] [[NAV:comm:directory|Open Employee Directory]] [[NAV:comm:attendance|Open Shift & Attendance]]`;
}

// Main AI Completion Handler: Dual Engine with automatic Smart Local fallback
export async function sendAiChatMessage({
  messages,
  userPrompt,
  customApiKey = "",
  model = "gpt-4o-mini",
  currentUser = null,
  isHRMD = null
}) {
  const systemPrompt = buildSystemPromptForUser(currentUser, isHRMD);

  const finalizeReply = (rawText, source, modelName) => {
    const suggestedRoutes = extractSuggestedRoutes(rawText, userPrompt);
    const cleanedText = stripNavMarkers(rawText);
    return {
      content: cleanedText,
      text: cleanedText,
      source,
      model: modelName,
      memoData: extractMemoFromText(cleanedText),
      suggestedRoutes
    };
  };

  const activeApiKey =
    customApiKey.trim() ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENAI_API_KEY ? import.meta.env.VITE_OPENAI_API_KEY.trim() : "") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("hrhub_openai_api_key") || "" : "");

  const geminiApiKey =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY ? import.meta.env.VITE_GEMINI_API_KEY.trim() : "") ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_OPENAI_API_KEY && (import.meta.env.VITE_OPENAI_API_KEY.startsWith("AQ.") || import.meta.env.VITE_OPENAI_API_KEY.startsWith("AIzaSy")) ? import.meta.env.VITE_OPENAI_API_KEY.trim() : "") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("hrhub_gemini_api_key") || "" : "") ||
    (activeApiKey.startsWith("AQ.") || activeApiKey.startsWith("AIzaSy") ? activeApiKey : "") ||
    DEFAULT_GEMINI_KEY;

  // Priority 1: Google Gemini Multi-Model Pool (Over 1,000+ Requests/Day total free quota)
  if (geminiApiKey) {
    const candidateModels = [
      "gemini-3.5-flash-lite", // 500 Requests Per Day, 15 RPM
      "gemini-3.1-flash-lite", // 500 Requests Per Day, 15 RPM
      "gemini-3.5-flash",      // 20 Requests Per Day
      "gemini-flash-latest",   // Active latest
      "gemini-3.7-flash",      // 20 Requests Per Day
      "gemini-3.8-flash",      // 20 Requests Per Day
      "gemini-3.6-flash"       // 20 Requests Per Day
    ];
    for (const gModel of candidateModels) {
      try {
        const geminiContents = [
          ...messages.slice(-8).map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }]
          })),
          {
            role: "user",
            parts: [{ text: userPrompt }]
          }
        ];

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              contents: geminiContents
            })
          }
        );

        if (res.ok) {
          const data = await res.json();
          const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (geminiText && geminiText.trim().length > 0) {
            return finalizeReply(geminiText.trim(), "gemini_core", `HRHub Ai Buddy (${gModel})`);
          }
        } else {
          console.warn(`Gemini model ${gModel} returned status:`, res.status);
        }
      } catch (gErr) {
        console.warn(`Gemini engine error on ${gModel}:`, gErr);
      }
    }
  }

  // Priority 2: Direct OpenAI Engine (if valid key is provided)
  if (activeApiKey && !activeApiKey.startsWith("AQ.") && !activeApiKey.startsWith("AIzaSy")) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeApiKey}`
        },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            ...messages.map((m) => ({
              role: m.role,
              content: m.content
            })),
            {
              role: "user",
              content: userPrompt
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return finalizeReply(content, "ai_buddy_core", "HRHub Ai Buddy");
        }
      }
    } catch (err) {
      console.warn("Direct engine error, falling back to live gateway:", err);
    }
  }

  // Tier 2: Real Live Engine (Powered via live intelligence gateway)
  try {
    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => controller.abort(), 6000);

    const liveMessages = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userPrompt }
    ];

    const liveRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messages: liveMessages,
        model: "openai",
        seed: Math.floor(Math.random() * 1000000)
      })
    });

    clearTimeout(timeoutTimer);

    if (liveRes.ok) {
      const rawText = await liveRes.text();
      let responseText = (rawText || "").trim();
      try {
        const parsed = JSON.parse(responseText);
        if (parsed.content) {
          responseText = parsed.content;
        } else if (parsed.choices?.[0]?.message?.content) {
          responseText = parsed.choices[0].message.content;
        }
      } catch {
        // It's plain text/markdown string
      }

      if (responseText && responseText.length > 0) {
        return finalizeReply(responseText, "ai_buddy_live", "HRHub Ai Buddy");
      }
    }
  } catch (liveErr) {
    console.warn("Live gateway unavailable or timed out, falling back to local HR brain:", liveErr);
  }

  // Tier 3 Fallback: Smart Local HR & Operations Knowledge Engine
  const localReply = generateLocalAiResponse(userPrompt, messages, currentUser, isHRMD);
  return finalizeReply(localReply, "local_brain", "HRHub Ai Buddy");
}
