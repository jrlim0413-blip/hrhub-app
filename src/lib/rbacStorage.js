
import { supabase } from "./supabase";
import { fetchEmployeesFromDatabase } from "./employeeStorage";

const STORAGE_KEY = "hrhub_rbac_capabilities_matrix_enterprise_v3";
const CLOUD_SETTINGS_KEY = "hrhub_rbac_matrix_master";

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

export const WORKSPACE_TABS_CONFIG = [
  {
    id: "communication",
    label: "Enterprise Communication & Employee Portal",
    shortLabel: "Communication Portal",
    category: "Portal",
    code: "WORKSPACE TAB: COMMUNICATION • ACCESS_PORTAL",
    description: "Company-wide announcements bulletin, employee directory, shift rosters, and compliance handbooks.",
    sidebarTabId: "communication"
  },
  {
    id: "home",
    label: "Home Dashboard & Executive KPIs",
    shortLabel: "Home Dashboard",
    category: "Home",
    code: "WORKSPACE TAB: HOME • VIEW_EXECUTIVE_DASHBOARD",
    description: "Central executive operational hub, frequently used modules, and cross-entity activity overview.",
    sidebarTabId: "home"
  },
  {
    id: "meetings",
    label: "Zoom & Google Meet Scheduler",
    shortLabel: "Zoom & Meet",
    category: "Home",
    code: "WORKSPACE TAB: MEETINGS • SCHEDULE_VIDEO_MEETINGS",
    description: "Live video conference scheduling, Zoom/Google Meet session management, and executive calendar.",
    sidebarTabId: "meetings"
  },
  {
    id: "ai_buddy_assistant",
    label: "HRHub AI Buddy & Interactive App Guide",
    shortLabel: "HRHub AI Buddy",
    category: "Home",
    code: "WORKSPACE FEATURE: AI ASSISTANT • ACCESS_AI_BUDDY",
    description: "Account-aware AI Assistant for Head Office HR, Subsidiary STL Gross/Winnings/AWOL guidance, and direct module routing.",
    sidebarTabId: "home"
  },
  {
    id: "geotagging",
    label: "Territory GeoTagging & Road Map",
    shortLabel: "GeoTagging Map",
    category: "Operations",
    code: "WORKSPACE TAB: OPERATIONS • VIEW_GEOTAGGING_MAP",
    description: "Interactive territory boundaries, yellow booth kiosk plotting, and navigable road distance routing.",
    sidebarTabId: "geotagging"
  },
  {
    id: "weather",
    label: "Field Weather Radar",
    shortLabel: "Weather Radar",
    category: "Operations",
    code: "WORKSPACE TAB: OPERATIONS • VIEW_WEATHER_RADAR",
    description: "Real-time regional Doppler weather radar and natural hazard advisories for field branches.",
    sidebarTabId: "weather"
  },
  {
    id: "sops",
    label: "Task Board",
    shortLabel: "Task Board",
    category: "Home",
    code: "WORKSPACE TAB: TASK BOARD • VIEW_TASK_BOARD",
    description: "Enterprise Kanban Task Board with General HR tasks, per-employee task assignments, For Review submissions, and HR Admin approval.",
    sidebarTabId: "sops"
  },
  {
    id: "supervisors_attendance",
    label: "Supervisors Attendance & Biometric Audit Trail",
    shortLabel: "Supervisors Attendance",
    category: "Operations",
    code: "WORKSPACE TAB: ATTENDANCE • AUDIT_SUPERVISOR_ATTENDANCE",
    description: "Field supervisor on-site check-in logs, biometric timestamp verification, and monthly attendance rosters.",
    sidebarTabId: "supervisors_attendance"
  },
  {
    id: "incident_reports",
    label: "Incident Reports & Due Process (Notice to Explain)",
    shortLabel: "Incident Reports & NTE",
    category: "HR Admin",
    code: "WORKSPACE TAB: DUE PROCESS • MANAGE_INCIDENT_REPORTS",
    description: "Formal investigation, branch incident report transmittal, and legal Notice to Explain (NTE) adjudication.",
    sidebarTabId: "incident_reports"
  },
  {
    id: "memo",
    label: "Official Corporate Memorandum Generator",
    shortLabel: "Memo Generator",
    category: "HR Admin",
    code: "WORKSPACE TAB: MEMORANDUMS • GENERATE_CORPORATE_MEMOS",
    description: "Official executive memorandum creation, digital sign-off, and multi-entity regulatory notice dissemination.",
    sidebarTabId: "memo"
  },
  {
    id: "doc_studio",
    label: "Document Studio (Coupon Bond Certificates)",
    shortLabel: "Document Studio",
    category: "HR Admin",
    code: "WORKSPACE TAB: DOCUMENTS • GENERATE_DOC_STUDIO",
    description: "Printable legal coupon bond certificates, employment contracts, and formal company notices.",
    sidebarTabId: "doc_studio"
  },
  {
    id: "salary_compensation",
    label: "Salary & Compensation w/ Payslip (Excel & OCR)",
    shortLabel: "Salary & Payslip",
    category: "HR Admin",
    code: "WORKSPACE TAB: HR PAYROLL • MANAGE_SALARY_COMPENSATION",
    description: "Upload Excel or OCR payroll files, verify extracted compensation records, save batches to database, and issue printable payslips.",
    sidebarTabId: "salary_compensation"
  },
  {
    id: "agents",
    label: "Agents Directory & 201 Registry",
    shortLabel: "Agents Directory",
    category: "HR Admin",
    code: "WORKSPACE TAB: PERSONNEL • VIEW_AGENTS_DIRECTORY",
    description: "Centralized active retail agents, terminal outlets, staff 201 records, and entity assignments.",
    sidebarTabId: "agents"
  },
  {
    id: "employee_pre_registration",
    label: "Personnel Pre-Registration & Credential Onboarding",
    shortLabel: "Pre-Registration",
    category: "HR Admin",
    code: "WORKSPACE TAB: PERSONNEL • PRE_REGISTER_EMPLOYEE",
    description: "Authority to register new employee credentials, assign company entities, and initiate First-Time Setup accounts.",
    sidebarTabId: "agents"
  },
  {
    id: "dole_handbook",
    label: "DOLE Legal Guidelines & Labor Suite",
    shortLabel: "DOLE Guidelines",
    category: "HR Admin",
    code: "WORKSPACE TAB: LEGAL • VIEW_DOLE_HANDBOOK",
    description: "DOLE Department Orders, Labor Code statutory compliance guidelines, and legal references.",
    sidebarTabId: "dole_handbook"
  },
  {
    id: "gross",
    label: "Gross Revenue & Financial Remittance Reports",
    shortLabel: "Gross Report",
    category: "Finance",
    code: "WORKSPACE TAB: FINANCE • VIEW_FINANCIAL_REPORTS",
    description: "Multi-entity betting draw financial ledgers, cashier shortage audits, and official remittance reconciliation.",
    sidebarTabId: "gross"
  },
  {
    id: "revenue_trends",
    label: "Multi-Entity Revenue Trends & Betting Ratio",
    shortLabel: "Revenue Trends",
    category: "Finance",
    code: "WORKSPACE TAB: FINANCE • VIEW_REVENUE_TRENDS",
    description: "Multi-area betting ratio analytics, draw performance comparison, and revenue trend charts.",
    sidebarTabId: "revenue_trends"
  },
  {
    id: "payroll_calc",
    label: "13th Month Payroll Calculator (DOLE P.D. 851)",
    shortLabel: "13th Month Calc",
    category: "Finance",
    code: "WORKSPACE TAB: FINANCE • ACCESS_PAYROLL_CALC",
    description: "Pro-rated 13th month entitlement calculator and statutory payroll computation utility.",
    sidebarTabId: "payroll_calc"
  },
  {
    id: "petty_cash",
    label: "Branch Expenses & Petty Cash Vouchers",
    shortLabel: "Petty Cash & Vouchers",
    category: "Finance",
    code: "WORKSPACE TAB: FINANCE • MANAGE_PETTY_CASH",
    description: "Regional branch expense vouchers, receipt liquidation logs, and petty cash replenishment.",
    sidebarTabId: "petty_cash"
  },
  {
    id: "hr_analytics",
    label: "HR Analytics & Workforce KPI Dashboard",
    shortLabel: "HR Analytics",
    category: "Analytics",
    code: "WORKSPACE TAB: ANALYTICS • VIEW_HR_ANALYTICS",
    description: "Workforce headcount demographics, disciplinary analytics, attendance trends, and compliance scorecards.",
    sidebarTabId: "hr_analytics"
  },
  {
    id: "permission_matrix",
    label: "Role & Capabilities Access Control Matrix",
    shortLabel: "Permission Matrix",
    category: "Security",
    code: "WORKSPACE TAB: SECURITY • MANAGE_RBAC_MATRIX",
    description: "Granular role tier permissions, per-user access tags, workstation feature gating, and security administration.",
    sidebarTabId: "permission_matrix"
  },
  {
    id: "api_health",
    label: "System Health & API Configuration",
    shortLabel: "API Health & Config",
    category: "Security",
    code: "WORKSPACE TAB: SECURITY • MANAGE_API_CONFIG",
    description: "Enterprise live API endpoints, latency diagnostics, and multi-entity stream configuration.",
    sidebarTabId: "api_health"
  }
];

export const IN_TAB_FEATURES_CONFIG = [
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
    id: "comm_add_employee",
    label: "Register & Profile New Employee (Employee Profiling)",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows Branch HR and Administrators to register and profile new employees directly within the Directory tab in Communications."
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
  {
    id: "comm_hr_helpdesk",
    label: "Access HR Helpdesk Support Tickets",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows filing and tracking HR support tickets for COE, government benefits, leaves, 201 files, and personnel concerns."
  },
  {
    id: "comm_it_helpdesk",
    label: "Access IT Helpdesk Technical Support",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows reporting POS/STL terminal issues, HRHub login/password support, biometrics, printers, and network outages."
  },
  {
    id: "comm_finance_desk",
    label: "Access Finance Desk Remittance & Inquiry Tickets",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows coordinating STL gross remittance queries, hits payout verification, petty cash liquidation, and payslip concerns."
  },
  {
    id: "comm_knowledge_center",
    label: "Access Knowledge Center & Operational Guides",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows browsing and searching company playbooks, STL gross guides, DOLE protocols, and HRHub walkthroughs."
  },
  {
    id: "comm_suggestion_box",
    label: "Access Employee Suggestion Box & Feedback",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows submitting named or anonymous suggestions, upvoting ideas, and reviewing official management responses."
  },
  {
    id: "comm_leaderboards",
    label: "Access Employee & Subsidiary Leaderboards",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows viewing real-time performance rankings, completed task scores, and executive recognition awards."
  },
  {
    id: "comm_polls_surveys",
    label: "Access Company Polls & Pulse Surveys",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Allows participating in company-wide polls, employee pulse surveys, and viewing real-time voting tallies."
  },
  {
    id: "comm_manage_helpdesk",
    label: "Manage & Resolve Helpdesk Tickets (HR, IT, Finance)",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Authority to view all submitted tickets across HR, IT, and Finance Desks, update ticket statuses, reply as desk support, and delete tickets."
  },
  {
    id: "comm_manage_engagement",
    label: "Administer Knowledge Center, Suggestions, Awards & Polls",
    parentTab: "communication",
    belongsToLabel: "Enterprise Communication & Employee Portal",
    description: "Authority to publish Knowledge Center guides, post official Suggestion Box responses, grant Leaderboard Awards, and create or close Polls & Surveys."
  },

  {
    id: "schedule_corporate_meetings",
    label: "Schedule Executive Operational Meetings",
    parentTab: "meetings",
    belongsToLabel: "Zoom & Google Meet Scheduler",
    description: "Allows scheduling corporate meetings, setting agendas, and coordinating inter-departmental sessions."
  },

  {
    id: "manage_sop_tasks",
    label: "Post, Assign & Approve Task Board Submissions (HR Admin)",
    parentTab: "sops",
    belongsToLabel: "Task Board",
    description: "Authority to post General HR or Specific Employee tasks, view full Backlog/In Progress/For Review/Done columns, review subsidiary actions, and mark tasks Done."
  },
  {
    id: "access_weather_radar",
    label: "Inspect Real-time Field Weather Radar",
    parentTab: "weather",
    belongsToLabel: "Field Weather Radar",
    description: "Displays live satellite weather maps and regional hazard alerts for field branch operations."
  },

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

export const FACTORY_ROLE_TIER_PERMISSIONS = {
  system_admin: {
    communication: true,
    home: true,
    overview: true,
    meetings: true,
    ai_buddy_assistant: true,
    geotagging: true,
    weather: true,
    sops: true,
    supervisors_attendance: true,
    incident_reports: true,
    memo: true,
    doc_studio: true,
    salary_compensation: true,
    agents: true,
    employee_pre_registration: true,
    dole_handbook: true,
    gross: true,
    revenue_trends: true,
    payroll_calc: true,
    petty_cash: true,
    hr_analytics: true,
    permission_matrix: true,
    api_health: true,
    comm_bulletin: true,
    comm_post_bulletin: true,
    comm_directory: true,
    comm_manage_profiles: true,
    comm_add_employee: true,
    comm_attendance: true,
    comm_policies: true,
    comm_hr_helpdesk: true,
    comm_it_helpdesk: true,
    comm_finance_desk: true,
    comm_knowledge_center: true,
    comm_suggestion_box: true,
    comm_leaderboards: true,
    comm_polls_surveys: true,
    comm_manage_helpdesk: true,
    comm_manage_engagement: true,
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
    communication: true,
    home: true,
    overview: true,
    meetings: true,
    ai_buddy_assistant: true,
    geotagging: true,
    weather: true,
    sops: true,
    supervisors_attendance: true,
    incident_reports: true,
    memo: true,
    doc_studio: true,
    salary_compensation: true,
    agents: true,
    employee_pre_registration: false,
    dole_handbook: true,
    gross: false,
    revenue_trends: false,
    payroll_calc: true,
    petty_cash: true,
    hr_analytics: true,
    permission_matrix: false,
    api_health: false,
    comm_bulletin: true,
    comm_post_bulletin: true,
    comm_directory: true,
    comm_manage_profiles: true,
    comm_add_employee: true,
    comm_attendance: true,
    comm_policies: true,
    comm_hr_helpdesk: true,
    comm_it_helpdesk: true,
    comm_finance_desk: true,
    comm_knowledge_center: true,
    comm_suggestion_box: true,
    comm_leaderboards: true,
    comm_polls_surveys: true,
    comm_manage_helpdesk: false,
    comm_manage_engagement: false,
    schedule_corporate_meetings: true,
    manage_sop_tasks: false,
    access_weather_radar: true,
    investigate_and_issue_ir: true,
    issue_official_nte: false,
    serve_nte_on_site: true,
    record_written_defense: true,
    render_case_disposition: false,
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
    communication: true,
    home: true,
    overview: true,
    meetings: true,
    ai_buddy_assistant: true,
    geotagging: true,
    weather: true,
    sops: true,
    supervisors_attendance: true,
    incident_reports: true,
    memo: true,
    doc_studio: false,
    salary_compensation: false,
    agents: true,
    employee_pre_registration: false,
    dole_handbook: true,
    gross: true,
    revenue_trends: true,
    payroll_calc: false,
    petty_cash: true,
    hr_analytics: false,
    permission_matrix: false,
    api_health: false,
    comm_bulletin: true,
    comm_post_bulletin: false,
    comm_directory: true,
    comm_manage_profiles: false,
    comm_add_employee: false,
    comm_attendance: true,
    comm_policies: true,
    comm_hr_helpdesk: true,
    comm_it_helpdesk: true,
    comm_finance_desk: true,
    comm_knowledge_center: true,
    comm_suggestion_box: true,
    comm_leaderboards: true,
    comm_polls_surveys: true,
    comm_manage_helpdesk: false,
    comm_manage_engagement: false,
    schedule_corporate_meetings: false,
    manage_sop_tasks: false,
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
    communication: true,
    home: true,
    overview: true,
    meetings: false,
    ai_buddy_assistant: true,
    geotagging: false,
    weather: false,
    sops: true,
    supervisors_attendance: false,
    incident_reports: true,
    memo: true,
    doc_studio: false,
    salary_compensation: true,
    agents: false,
    employee_pre_registration: false,
    dole_handbook: false,
    gross: true,
    revenue_trends: true,
    payroll_calc: true,
    petty_cash: true,
    hr_analytics: false,
    permission_matrix: false,
    api_health: false,
    comm_bulletin: true,
    comm_post_bulletin: false,
    comm_directory: true,
    comm_manage_profiles: false,
    comm_add_employee: false,
    comm_attendance: false,
    comm_policies: true,
    comm_hr_helpdesk: true,
    comm_it_helpdesk: true,
    comm_finance_desk: true,
    comm_knowledge_center: true,
    comm_suggestion_box: true,
    comm_leaderboards: true,
    comm_polls_surveys: true,
    comm_manage_helpdesk: false,
    comm_manage_engagement: false,
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

export function classifyEmployeeRoleTier(employee) {
  const email = (employee?.email || "").toLowerCase().trim();
  const role = (employee?.role || "").toLowerCase().trim();
  const company = (employee?.company || "").toLowerCase().trim();

  if (
    email === "admin@hrhub.com" ||
    email === "jay@simpalgroup.com" ||
    role === "super administrator" ||
    role === "executive" ||
    role.includes("super admin")
  ) {
    return "system_admin";
  }

  if (
    role.includes("hr") ||
    role.includes("compliance") ||
    role.includes("people") ||
    role.includes("specialist") ||
    role.includes("administrator") ||
    email.includes("quennie") ||
    email.includes("remark") ||
    email.includes("efilfonimda")
  ) {
    return "hr_admin";
  }

  if (
    role.includes("cashier") ||
    role.includes("teller") ||
    role.includes("finance") ||
    role.includes("treasury")
  ) {
    return "finance_cashier";
  }

  return "operations_supervisor";
}

export async function fetchRealAccountsAndTiers() {
  const employees = await fetchEmployeesFromDatabase();

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

export function getRbacMatrixData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.roleTiers) {
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

  const initial = {
    roleTiers: JSON.parse(JSON.stringify(FACTORY_ROLE_TIER_PERMISSIONS)),
    accountOverrides: {},
    lastSyncedAt: new Date().toISOString()
  };
  saveRbacMatrixData(initial);
  return initial;
}

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

export function saveRbacMatrixData(matrixData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrixData));
    window.dispatchEvent(new CustomEvent("hrhub_rbac_updated", { detail: matrixData }));
  } catch (err) {
    console.error("[rbacStorage] Local save notice:", err);
  }
}

export function resetRbacMatrixToDefaults() {
  const defaults = {
    roleTiers: JSON.parse(JSON.stringify(FACTORY_ROLE_TIER_PERMISSIONS)),
    accountOverrides: {},
    lastSyncedAt: new Date().toISOString()
  };
  saveRbacMatrixData(defaults);
  return defaults;
}

export function normalizeTabKey(key) {
  if (!key) return key;
  const k = String(key).trim();
  if (k === "overview") return "home";
  if (k === "betting_ratio") return "revenue_trends";
  return k;
}

function getAccountOverrideMap(matrixData, targetEmail) {
  if (!matrixData?.accountOverrides || !targetEmail) return null;
  const norm = String(targetEmail).toLowerCase().trim();
  if (matrixData.accountOverrides[norm]) return matrixData.accountOverrides[norm];
  const matchedKey = Object.keys(matrixData.accountOverrides).find(
    (k) => k.toLowerCase().trim() === norm
  );
  return matchedKey ? matrixData.accountOverrides[matchedKey] : null;
}

export function getEffectiveCapability(type, targetId, capId, matrixData = null, accountsList = []) {
  const data = matrixData || getRbacMatrixData();
  const normCapId = normalizeTabKey(capId);

  const featureDef = IN_TAB_FEATURES_CONFIG.find((f) => f.id === normCapId);
  if (featureDef && featureDef.parentTab) {
    const parentAllowed = getEffectiveCapability(type, targetId, featureDef.parentTab, data, accountsList);
    if (!parentAllowed) return false;
  }

  if (type === "role") {
    const roleConfig = data.roleTiers?.[targetId] || FACTORY_ROLE_TIER_PERMISSIONS[targetId] || {};
    if (typeof roleConfig[normCapId] === "boolean") return roleConfig[normCapId];
    if (normCapId === "home" && typeof roleConfig.overview === "boolean") return roleConfig.overview;
    return Boolean(FACTORY_ROLE_TIER_PERMISSIONS[targetId]?.[normCapId]);
  }

  if (type === "account") {
    const normEmail = String(targetId || "").toLowerCase().trim();
    const override = getAccountOverrideMap(data, normEmail);
    if (override) {
      if (typeof override[normCapId] === "boolean") return override[normCapId];
      if (normCapId === "home" && typeof override.overview === "boolean") return override.overview;
    }

    const matchedAccount = accountsList.find(
      (a) =>
        String(a.id || "").toLowerCase() === normEmail ||
        String(a.email || "").toLowerCase().trim() === normEmail
    );
    if (matchedAccount?.roleTier) {
      return getEffectiveCapability("role", matchedAccount.roleTier, normCapId, data, accountsList);
    }
    return getEffectiveCapability("role", "operations_supervisor", normCapId, data, accountsList);
  }

  return false;
}

export function toggleCapability(type, targetId, capId, nextValue) {
  const data = getRbacMatrixData();
  const normCapId = normalizeTabKey(capId);

  if (type === "role") {
    if (!data.roleTiers) data.roleTiers = {};
    if (!data.roleTiers[targetId]) {
      data.roleTiers[targetId] = { ...(FACTORY_ROLE_TIER_PERMISSIONS[targetId] || {}) };
    }
    data.roleTiers[targetId][normCapId] = nextValue;
    if (normCapId === "home") data.roleTiers[targetId].overview = nextValue;

    const tabItem = WORKSPACE_TABS_CONFIG.find((t) => t.id === normCapId);
    if (tabItem && !nextValue) {
      const childFeatures = IN_TAB_FEATURES_CONFIG.filter((f) => f.parentTab === normCapId);
      childFeatures.forEach((f) => {
        data.roleTiers[targetId][f.id] = false;
      });
    }

    const featureItem = IN_TAB_FEATURES_CONFIG.find((f) => f.id === normCapId);
    if (featureItem && nextValue && featureItem.parentTab) {
      data.roleTiers[targetId][featureItem.parentTab] = true;
    }
  } else if (type === "account") {
    const normEmail = String(targetId || "").toLowerCase().trim();
    if (!data.accountOverrides) data.accountOverrides = {};
    if (!data.accountOverrides[normEmail]) {
      data.accountOverrides[normEmail] = {};
    }
    data.accountOverrides[normEmail][normCapId] = nextValue;
    if (normCapId === "home") data.accountOverrides[normEmail].overview = nextValue;

    const tabItem = WORKSPACE_TABS_CONFIG.find((t) => t.id === normCapId);
    if (tabItem && !nextValue) {
      const childFeatures = IN_TAB_FEATURES_CONFIG.filter((f) => f.parentTab === normCapId);
      childFeatures.forEach((f) => {
        data.accountOverrides[normEmail][f.id] = false;
      });
    }

    const featureItem = IN_TAB_FEATURES_CONFIG.find((f) => f.id === normCapId);
    if (featureItem && nextValue && featureItem.parentTab) {
      data.accountOverrides[normEmail][featureItem.parentTab] = true;
    }
  }

  data.lastSyncedAt = new Date().toISOString();
  saveRbacMatrixData(data);
  syncMatrixToCloud().catch((err) => console.debug("[rbacStorage] Auto-sync notice:", err?.message));
  return data;
}

export function setAccountCapabilityTag(email, capId, isEnabled) {
  const normEmail = String(email || "").toLowerCase().trim();
  if (!normEmail || !capId) return getRbacMatrixData();

  const data = getRbacMatrixData();
  const normCapId = normalizeTabKey(capId);
  if (!data.accountOverrides) data.accountOverrides = {};
  if (!data.accountOverrides[normEmail]) data.accountOverrides[normEmail] = {};

  data.accountOverrides[normEmail][normCapId] = Boolean(isEnabled);
  if (normCapId === "home") data.accountOverrides[normEmail].overview = Boolean(isEnabled);

  const tabItem = WORKSPACE_TABS_CONFIG.find((t) => t.id === normCapId);
  if (tabItem) {
    const childFeatures = IN_TAB_FEATURES_CONFIG.filter((f) => f.parentTab === normCapId);
    if (!isEnabled) {
      childFeatures.forEach((f) => {
        data.accountOverrides[normEmail][f.id] = false;
      });
    } else {
      if (normCapId === "communication") {
        const anyCommChildEnabled = childFeatures.some((f) => data.accountOverrides[normEmail][f.id] === true);
        if (!anyCommChildEnabled) {
          data.accountOverrides[normEmail].comm_bulletin = true;
        }
      }
    }
  }

  const featureItem = IN_TAB_FEATURES_CONFIG.find((f) => f.id === normCapId);
  if (featureItem && isEnabled && featureItem.parentTab) {
    data.accountOverrides[normEmail][featureItem.parentTab] = true;
    if (featureItem.parentTab === "home") data.accountOverrides[normEmail].overview = true;
  }

  data.lastSyncedAt = new Date().toISOString();
  saveRbacMatrixData(data);
  syncMatrixToCloud().catch((err) => console.debug("[rbacStorage] Auto-sync notice:", err?.message));
  return data;
}

export function setAccountRestrictedOnlyMode(email, allowedCapIds = []) {
  const normEmail = String(email || "").toLowerCase().trim();
  if (!normEmail) return getRbacMatrixData();

  const data = getRbacMatrixData();
  if (!data.accountOverrides) data.accountOverrides = {};

  const allowedSet = new Set(allowedCapIds.map(normalizeTabKey));
  const nextOverrides = { overview: false };

  WORKSPACE_TABS_CONFIG.forEach((t) => {
    nextOverrides[t.id] = allowedSet.has(t.id);
  });
  if (nextOverrides.home) nextOverrides.overview = true;

  IN_TAB_FEATURES_CONFIG.forEach((f) => {
    const granted = allowedSet.has(f.id);
    nextOverrides[f.id] = granted;
    if (granted && f.parentTab) {
      nextOverrides[f.parentTab] = true;
      if (f.parentTab === "home") nextOverrides.overview = true;
    }
  });

  data.accountOverrides[normEmail] = nextOverrides;
  data.lastSyncedAt = new Date().toISOString();
  saveRbacMatrixData(data);
  syncMatrixToCloud().catch((err) => console.debug("[rbacStorage] Auto-sync notice:", err?.message));
  return data;
}

export function grantAllAccountCapabilities(email, excludeAdminOnly = true) {
  const normEmail = String(email || "").toLowerCase().trim();
  if (!normEmail) return getRbacMatrixData();

  const data = getRbacMatrixData();
  if (!data.accountOverrides) data.accountOverrides = {};

  const nextOverrides = { overview: true };
  WORKSPACE_TABS_CONFIG.forEach((t) => {
    if (excludeAdminOnly && (t.id === "permission_matrix" || t.id === "api_health")) {
      nextOverrides[t.id] = false;
    } else {
      nextOverrides[t.id] = true;
    }
  });
  IN_TAB_FEATURES_CONFIG.forEach((f) => {
    if (excludeAdminOnly && f.parentTab === "permission_matrix") {
      nextOverrides[f.id] = false;
    } else {
      nextOverrides[f.id] = true;
    }
  });

  data.accountOverrides[normEmail] = nextOverrides;
  data.lastSyncedAt = new Date().toISOString();
  saveRbacMatrixData(data);
  syncMatrixToCloud().catch((err) => console.debug("[rbacStorage] Auto-sync notice:", err?.message));
  return data;
}

export function clearAccountOverrides(email) {
  const normEmail = String(email || "").toLowerCase().trim();
  if (!normEmail) return getRbacMatrixData();

  const data = getRbacMatrixData();
  if (data.accountOverrides) {
    Object.keys(data.accountOverrides).forEach((k) => {
      if (k.toLowerCase().trim() === normEmail) {
        delete data.accountOverrides[k];
      }
    });
  }

  data.lastSyncedAt = new Date().toISOString();
  saveRbacMatrixData(data);
  syncMatrixToCloud().catch((err) => console.debug("[rbacStorage] Auto-sync notice:", err?.message));
  return data;
}

export function hasAccountCustomOverrides(email, matrixData = null) {
  const data = matrixData || getRbacMatrixData();
  const override = getAccountOverrideMap(data, email);
  return Boolean(override && Object.keys(override).length > 0);
}

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

export function isUserTabAllowed(user, tabKey, passedMatrix = null) {
  if (!user) return true;

  const email = (user.email || "").toLowerCase().trim();
  const normTab = normalizeTabKey(tabKey);
  const matrix = passedMatrix || getRbacMatrixData();

  if (normTab === "permission_matrix" && (email === "admin@hrhub.com" || email === "jay@simpalgroup.com")) {
    return true;
  }

  const override = getAccountOverrideMap(matrix, email);
  if (override) {
    if (typeof override[normTab] === "boolean") {
      return override[normTab];
    }
    if (normTab === "home" && typeof override.overview === "boolean") {
      return override.overview;
    }
  }

  const roleTier = classifyEmployeeRoleTier(user);
  return getEffectiveCapability("role", roleTier, normTab, matrix);
}

export function isUserFeatureAllowed(user, featureKey, passedMatrix = null) {
  if (!user) return true;

  const email = (user.email || "").toLowerCase().trim();
  const matrix = passedMatrix || getRbacMatrixData();

  const featureDef = IN_TAB_FEATURES_CONFIG.find((f) => f.id === featureKey);
  if (featureDef && featureDef.parentTab) {
    if (!isUserTabAllowed(user, featureDef.parentTab, matrix)) {
      return false;
    }
  }

  const override = getAccountOverrideMap(matrix, email);
  if (override && typeof override[featureKey] === "boolean") {
    return override[featureKey];
  }

  const roleTier = classifyEmployeeRoleTier(user);
  return getEffectiveCapability("role", roleTier, featureKey, matrix);
}
