
import { supabase } from "./supabase.js";
import { HEAD_OFFICE } from "./companyEntities.js";

export const TABLE_NAME = "hr_work_logs";
export const FALLBACK_SETTINGS_KEY = "enterprise_hr_actual_worklogs_v1";

let workLogsChannel = null;
try {
  if (typeof window !== "undefined" && window.BroadcastChannel) {
    workLogsChannel = new BroadcastChannel("hrhub_worklogs_live_sync");
  }
} catch {
}

export function broadcastWorkLogUpdate(type, payload) {
  try {
    if (workLogsChannel) {
      workLogsChannel.postMessage({ type, payload, timestamp: Date.now() });
    }
  } catch {
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hrhub_worklogs_updated", { detail: { type, payload } }));
  }
}

export function subscribeToWorkLogsLive(callback) {
  const handler = (e) => {
    if (e?.detail) callback(e.detail);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("hrhub_worklogs_updated", handler);
  }

  let bcHandler = null;
  if (workLogsChannel) {
    bcHandler = (e) => {
      if (e?.data) callback(e.data);
    };
    workLogsChannel.addEventListener("message", bcHandler);
  }

  let sbChannel = null;
  try {
    sbChannel = supabase
      .channel("public:hr_work_logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE_NAME },
        (payload) => {
          callback({ type: "database_event", payload });
        }
      )
      .subscribe();
  } catch (err) {
    console.warn("Supabase realtime channel init warning:", err);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("hrhub_worklogs_updated", handler);
    }
    if (workLogsChannel && bcHandler) {
      workLogsChannel.removeEventListener("message", bcHandler);
    }
    if (sbChannel) {
      supabase.removeChannel(sbChannel);
    }
  };
}

export function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateToMMDDYYYY(dateStr) {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${m}-${d}-${y}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatTimeAMPM(dateObj = new Date()) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const meridian = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${meridian}`;
}

export function calculateHoursWorked(startTimeStr, endTimeStr) {
  if (!startTimeStr || !endTimeStr) return { numericHours: 0, formatted: "--" };

  const parseTime = (str) => {
    if (!str) return null;
    const match = str.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const meridian = match[3] ? match[3].toUpperCase() : null;

    if (meridian === "PM" && h < 12) h += 12;
    if (meridian === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const startMins = parseTime(startTimeStr);
  const endMins = parseTime(endTimeStr);

  if (startMins === null || endMins === null) return { numericHours: 0, formatted: "--" };

  let diff = endMins - startMins;
  if (diff < 0) diff += 24 * 60;

  const hours = diff / 60;
  const numericHours = parseFloat(hours.toFixed(2));
  const formatted = hours % 1 === 0 ? `${hours} hr${hours === 1 ? "" : "s"}` : `${hours.toFixed(1)} hrs`;

  return { numericHours, formatted };
}

function normalizeLogRecord(raw) {
  if (!raw) return null;
  const rawStatus = String(raw.status || "");
  const isReportedActive =
    rawStatus === "In Progress" ||
    rawStatus === "Ongoing" ||
    rawStatus === "in_progress" ||
    rawStatus === "AFK" ||
    rawStatus === "afk" ||
    raw.end_time === "Active" ||
    raw.endTime === "Active";

  const lastActiveTimestamp = raw.updated_at || raw.created_at;
  let elapsedMinutes = 0;
  if (lastActiveTimestamp) {
    const lastActiveMs = new Date(lastActiveTimestamp).getTime();
    if (!isNaN(lastActiveMs)) {
      elapsedMinutes = Math.max(0, (Date.now() - lastActiveMs) / (60 * 1000));
    }
  }

  const isStaleExpired = isReportedActive && elapsedMinutes > 7;

  const isAfk = !isStaleExpired && isReportedActive && (
    rawStatus.toUpperCase() === "AFK" ||
    rawStatus.toLowerCase().includes("afk") ||
    String(raw.progress_comments || "").includes("[Idle]") ||
    elapsedMinutes >= 2
  );

  const isOngoing = isReportedActive && !isStaleExpired;

  const taskTitle = raw.task_project || raw.taskProject || "General HR Task";
  let normalizedCat = raw.category || "";
  if (!normalizedCat || normalizedCat === "General HR Admin" || taskTitle.toLowerCase().includes("shift login") || taskTitle.toLowerCase().includes("check-in")) {
    normalizedCat = "Shift Attendance & Station Check-in";
  }

  const effectiveStartTime = raw.start_time || raw.startTime || "8:00 AM";
  const effectiveEndTime = isOngoing
    ? "Active"
    : raw.end_time && raw.end_time !== "Active"
      ? raw.end_time
      : lastActiveTimestamp
        ? formatTimeAMPM(new Date(lastActiveTimestamp))
        : "5:00 PM";

  const calc = calculateHoursWorked(effectiveStartTime, effectiveEndTime);
  const numericDuration = isOngoing ? 0 : (Number(raw.hours_worked || raw.hoursWorked || 0) || calc.numericHours);
  const formattedDuration = isAfk
    ? "Idle / AFK"
    : isOngoing
      ? "Active Now"
      : calc.formatted !== "--"
        ? calc.formatted
        : numericDuration > 0
          ? numericDuration % 1 === 0 ? `${numericDuration} hrs` : `${numericDuration.toFixed(1)} hrs`
          : "--";

  const progressText = raw.progress_comments || raw.progressComments || "";
  const isAuto = Boolean(raw.is_auto_logged || raw.isAutoLogged || progressText.includes("[Auto-Logged]"));

  return {
    id: String(raw.id || `log_${Date.now()}`),
    date: raw.log_date || raw.date || getTodayDateStr(),
    taskProject: taskTitle,
    category: normalizedCat,
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
    hoursWorked: formattedDuration,
    numericHours: numericDuration,
    progressComments: progressText.replace("[Auto-Logged] ", "").replace("[Auto-Logged]", "").trim(),
    status: isAfk ? "AFK" : isOngoing ? "In Progress" : (raw.status === "In Progress" ? "Completed" : (raw.status || "Completed")),
    isAfk,
    isAutoLogged: isAuto,
    authorName: raw.author_name || raw.authorName || "HR Officer",
    authorEmail: (raw.author_email || raw.authorEmail || "").toLowerCase().trim(),
    authorRole: raw.author_role || raw.authorRole || "HR Administrator",
    company: raw.company || HEAD_OFFICE,
    branch: raw.branch || "Head Office (SGC)",
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || raw.created_at || new Date().toISOString()
  };
}

let memoryWorkLogsList = null;

export async function fetchAllWorkLogs() {
  try {
    autoPruneOldLogs(7);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const seen = new Set();
      const activeUserDates = new Set();
      const uniqueData = [];
      for (const row of data) {
        const email = (row.author_email || "").toLowerCase().trim();
        const date = row.log_date || "";
        const isRowActive = row.status === "In Progress" || row.status === "AFK" || row.status === "Ongoing" || row.end_time === "Active";

        if (isRowActive) {
          const activeUserKey = `${email}__${date}`;
          if (activeUserDates.has(activeUserKey)) {
            continue;
          }
          activeUserDates.add(activeUserKey);
        }

        const key = `${email}__${(row.task_project || "").trim()}__${date}__${row.start_time || ""}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueData.push(row);
        }
      }

      const normalized = uniqueData.map(normalizeLogRecord).filter(Boolean);
      memoryWorkLogsList = normalized;

      autoReconcileStaleSessions(data);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(FALLBACK_SETTINGS_KEY, JSON.stringify(normalized));
        } catch {}
      }
      return normalized;
    }

    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("settings_json")
      .eq("user_id", FALLBACK_SETTINGS_KEY)
      .maybeSingle();

    if (settingsData?.settings_json && Array.isArray(settingsData.settings_json)) {
      const seen = new Set();
      const uniqueData = [];
      for (const row of settingsData.settings_json) {
        const key = `${(row.author_email || "").toLowerCase().trim()}__${(row.task_project || "").trim()}__${row.log_date || ""}__${row.start_time || ""}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueData.push(row);
        }
      }
      const normalized = uniqueData.map(normalizeLogRecord).filter(Boolean);
      memoryWorkLogsList = normalized;

      autoReconcileStaleSessions(data);
      return normalized;
    }

    if (typeof window !== "undefined") {
      const local = window.localStorage.getItem(FALLBACK_SETTINGS_KEY);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            const normalized = parsed.map(normalizeLogRecord).filter(Boolean);
            memoryWorkLogsList = normalized;
            return normalized;
          }
        } catch {}
      }
    }

    memoryWorkLogsList = [];
    return [];
  } catch (err) {
    console.warn("fetchAllWorkLogs exception:", err);
    return memoryWorkLogsList || [];
  }
}

export async function addWorkLogEntry(entry) {
  if (!entry || !entry.taskProject) {
    return { success: false, error: "Task or project name is required." };
  }

  const dateStr = entry.date || getTodayDateStr();
  const { numericHours, formatted: formattedDuration } = calculateHoursWorked(entry.startTime, entry.endTime);

  const comments = (entry.progressComments || "").trim();
  const taggedComments = entry.isAutoLogged && !comments.includes("[Auto-Logged]")
    ? `[Auto-Logged] ${comments}`.trim()
    : comments;

  const payloadSnake = {
    log_date: dateStr,
    task_project: entry.taskProject.trim(),
    category: (entry.category && entry.category !== "General HR Admin")
      ? entry.category
      : ((entry.taskProject || "").toLowerCase().includes("shift") || (entry.taskProject || "").toLowerCase().includes("check-in") || (entry.taskProject || "").toLowerCase().includes("login"))
      ? "Shift Attendance & Station Check-in"
      : "Shift Attendance & Station Check-in",
    start_time: entry.startTime || "8:00 AM",
    end_time: entry.endTime || "5:00 PM",
    hours_worked: numericHours,
    progress_comments: taggedComments,
    status: entry.status || "Completed",
    author_name: entry.authorName || "HR Officer",
    author_email: (entry.authorEmail || "").toLowerCase().trim(),
    author_role: entry.authorRole || "HR Administrator",
    company: entry.company || HEAD_OFFICE,
    branch: entry.branch || "Head Office (SGC)"
  };

  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([payloadSnake])
      .select()
      .single();

    if (!error && data) {
      const normalized = normalizeLogRecord(data);
      const existing = await fetchAllWorkLogs();
      const updated = [normalized, ...existing.filter((item) => item.id !== normalized.id)];
      memoryWorkLogsList = updated;

      try {
        await supabase.from("user_settings").upsert(
          {
            user_id: FALLBACK_SETTINGS_KEY,
            settings_json: updated,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id" }
        );
      } catch {}

      broadcastWorkLogUpdate("work_log_added", normalized);
      return { success: true, log: normalized };
    }

    const fallbackId = `wlog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newLogItem = normalizeLogRecord({
      id: fallbackId,
      ...payloadSnake,
      created_at: new Date().toISOString()
    });

    const currentList = await fetchAllWorkLogs();
    const updated = [newLogItem, ...currentList];
    memoryWorkLogsList = updated;

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(FALLBACK_SETTINGS_KEY, JSON.stringify(updated));
      } catch {}
    }

    try {
      await supabase.from("user_settings").upsert(
        {
          user_id: FALLBACK_SETTINGS_KEY,
          settings_json: updated,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    } catch {}

    broadcastWorkLogUpdate("work_log_added", newLogItem);
    return { success: true, log: newLogItem };
  } catch (err) {
    console.warn("addWorkLogEntry exception:", err);
    return { success: false, error: err.message };
  }
}

export async function deleteWorkLogEntry(logId) {
  try {
    await supabase.from(TABLE_NAME).delete().eq("id", logId);

    const currentList = await fetchAllWorkLogs();
    const updated = currentList.filter((l) => l.id !== logId);
    memoryWorkLogsList = updated;

    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(FALLBACK_SETTINGS_KEY, JSON.stringify(updated));
      } catch {}
    }

    try {
      await supabase.from("user_settings").upsert(
        {
          user_id: FALLBACK_SETTINGS_KEY,
          settings_json: updated,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    } catch {}

    broadcastWorkLogUpdate("work_log_deleted", { id: logId });
    return { success: true };
  } catch (err) {
    console.warn("deleteWorkLogEntry exception:", err);
    return { success: false, error: err.message };
  }
}

const recentAutoLogs = new Map();

export function isHRMDUser(user) {
  if (!user) return false;
  const email = String(user.email || user.authorEmail || user.author_email || "").toLowerCase().trim();
  const name = String(user.name || user.authorName || user.author_name || "").toLowerCase().trim().replace(/\s+/g, "");
  const role = String(user.role || user.authorRole || user.author_role || "").toLowerCase().trim();

  return (
    name === "hrmd" ||
    name.includes("hrmd") ||
    role === "hrmd director" ||
    role === "head office hrmd" ||
    role === "hrmd admin" ||
    role.includes("hrmd") ||
    email === "admin@hrhub.com" ||
    email === "hrmd@simpalgroup.com" ||
    email === "hrmd@hrhub.com" ||
    email.includes("hrmd@")
  );
}

export const isHRAdminUser = isHRMDUser;

export async function autoLogHRAction({
  user,
  taskProject,
  category = "Shift Attendance & Station Check-in",
  progressComments = "",
  status = "Completed",
  durationMinutes = 30
}) {
  if (!user || !taskProject) return null;

  const userEmail = (user.email || user.authorEmail || "").toLowerCase().trim();
  const userName = user.name || user.authorName || "HR Officer";
  const userCompany = user.company || user.authorCompany || HEAD_OFFICE;
  const userRole = user.role || user.authorRole || "HR Officer";
  const userBranch = user.branch || user.authorBranch || "Head Office (SGC)";

  const debounceKey = `${userEmail}_${taskProject}_${status}`;
  const lastLogged = recentAutoLogs.get(debounceKey);
  const nowMs = Date.now();
  if (lastLogged && nowMs - lastLogged < 5000) {
    return null;
  }
  recentAutoLogs.set(debounceKey, nowMs);

  const now = new Date();
  const isOngoing = status === "In Progress" || status === "Ongoing";
  const endTimeStr = isOngoing ? "Active" : formatTimeAMPM(now);
  const startTimeObj = new Date(now.getTime() - durationMinutes * 60 * 1000);
  const startTimeStr = formatTimeAMPM(startTimeObj);

  const durationHours = isOngoing ? 0 : parseFloat((durationMinutes / 60).toFixed(2));
  const formattedDuration = isOngoing
    ? "Active Now"
    : durationHours % 1 === 0
      ? `${durationHours} hr${durationHours === 1 ? "" : "s"}`
      : `${durationHours} hrs`;

  return await addWorkLogEntry({
    date: getTodayDateStr(),
    taskProject: taskProject.trim(),
    category,
    startTime: startTimeStr,
    endTime: endTimeStr,
    hoursWorked: formattedDuration,
    progressComments: progressComments.trim(),
    status,
    authorName: userName,
    authorEmail: userEmail,
    authorRole: userRole,
    company: userCompany,
    branch: userBranch,
    isAutoLogged: true
  });
}

export const HR_WORK_CATEGORIES = [
  { id: "shift_attendance", label: "Shift Attendance & Station Check-in", color: "bg-teal-50 text-teal-800 border-teal-200" },
  { id: "due_process", label: "Employee Relations & Due Process", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "compliance_201", label: "201 Filing & Requirements Audit", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "payroll_comp", label: "Payroll, SSS & Compensation", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "branch_audit", label: "Branch Inspection & Field Visit", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "recruitment", label: "Recruitment & Applicant Interview", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "policy_admin", label: "Corporate Policy & Administrative", color: "bg-sky-50 text-sky-700 border-sky-200" },
  { id: "coordination_meeting", label: "Operational Coordination Meeting", color: "bg-slate-100 text-slate-700 border-slate-200" }
];

export const MODULE_WORKLOG_MAP = {
  home: {
    task: "Executive Dashboard Operations & KPI Review",
    category: "Corporate Policy & Administrative",
    comments: "Reviewed corporate HR indicators, active workforce metrics, and subsidiary operations."
  },
  meetings: {
    task: "Operational Coordination Meeting & Station Portal Session",
    category: "Operational Coordination Meeting",
    comments: "Participated in live operational coordination conference with regional station supervisors."
  },
  sops: {
    task: "Task Board & Daily Operations Audit",
    category: "Corporate Policy & Administrative",
    comments: "Reviewed daily task board items, milestones, and administrative duties."
  },
  weather: {
    task: "Field Weather & Natural Hazard Radar Monitoring",
    category: "Branch Inspection & Field Visit",
    comments: "Monitored regional Doppler weather radar and cyclone alerts affecting construction and kiosk branches."
  },
  incident_reports: {
    task: "Incident Reports, NTE & Due Process Adjudication",
    category: "Employee Relations & Due Process",
    comments: "Reviewed filed incident reports, supervisor audit logs, and issued administrative due process notices."
  },
  memo: {
    task: "Drafted & Issued Corporate Directive Memo",
    category: "Employee Relations & Due Process",
    comments: "Generated and published official corporate memorandum via HRMD studio."
  },
  doc_studio: {
    task: "Document Studio Legal Formatting & Certificate Generation",
    category: "Corporate Policy & Administrative",
    comments: "Formatted legal bond certificates, employment contracts, and statutory circulars."
  },
  gross: {
    task: "Daily STL Gross Revenue Audit & Draw Cutoff Reconciliation",
    category: "Payroll, SSS & Compensation",
    comments: "Verified yesterday's ticket turnover, draw sales totals, and operational gross figures."
  },
  revenue_trends: {
    task: "Multi-Entity Revenue Trends & Betting Ratio Analysis",
    category: "Payroll, SSS & Compensation",
    comments: "Analyzed multi-area betting ratio performance across authorized operating entities."
  },
  agents: {
    task: "Agents Directory & Outlet Personnel Audit",
    category: "Branch Inspection & Field Visit",
    comments: "Inspected active retail agents, terminal outlets, and supervisor station assignments."
  },
  supervisors_attendance: {
    task: "Supervisor Attendance & Daily Accomplishment Review",
    category: "Branch Inspection & Field Visit",
    comments: "Verified GPS biometric check-ins and approved operational accomplishment logs."
  },
  permission_matrix: {
    task: "Role Permission Matrix & RBAC Access Control Audit",
    category: "Corporate Policy & Administrative",
    comments: "Audited system security tiers, department permissions, and administrative access rights."
  },
  api_health: {
    task: "Enterprise API Configuration & Endpoint Health Audit",
    category: "Corporate Policy & Administrative",
    comments: "Pinged live accountant and teller API streams to verify connection latency and uptime."
  },
  geotagging: {
    task: "Territory GeoTagging & Navigable Road Map Inspection",
    category: "Branch Inspection & Field Visit",
    comments: "Plotted yellow booth kiosks, inspected sector boundaries, and analyzed road distance routes."
  },
  dole_handbook: {
    task: "DOLE Legal Guidelines & Labor Code Compliance Inquiry",
    category: "Employee Relations & Due Process",
    comments: "Consulted DOLE Department Orders, statutory wage rules, and employee labor standards."
  },
  hr_analytics: {
    task: "Workforce Analytics & Headcount Demographics Evaluation",
    category: "Corporate Policy & Administrative",
    comments: "Analyzed employee attrition, turnover rates, and multi-subsidiary headcount distribution."
  },
  payroll_calc: {
    task: "13th Month Payroll Calculation & Statutory Compensation Audit",
    category: "Payroll, SSS & Compensation",
    comments: "Computed pro-rated 13th month entitlements and validated statutory compensation ledgers."
  },
  petty_cash: {
    task: "Branch Expense Vouchers & Petty Cash Liquidation Audit",
    category: "Payroll, SSS & Compensation",
    comments: "Audited regional branch expense vouchers, receipts, and cash replenishment requests."
  },
  directory: {
    task: "Employee Directory & 201 Personnel Records Audit",
    category: "201 Filing & Requirements Audit",
    comments: "Managed employee directory profiles, birthdays, pre-registrations, and statutory compliance documents."
  },
  policies: {
    task: "Corporate Handbooks, OSH & Health Standards Review",
    category: "Corporate Policy & Administrative",
    comments: "Reviewed corporate governance handbooks, OSH RA 11058 rules, and health sanitation standards."
  },
  bulletin: {
    task: "Corporate Bulletin Board & Announcements Feed Review",
    category: "Corporate Policy & Administrative",
    comments: "Reviewed official announcements, company circulars, and executive leadership memos."
  },
  hr_helpdesk: {
    task: "HR Helpdesk Support & Employee Ticket Resolution",
    category: "Employee Relations & Due Process",
    comments: "Handled HR Helpdesk inquiries covering COE requests, benefits, leaves, and employee concerns."
  },
  it_helpdesk: {
    task: "IT Helpdesk Technical Support & Terminal Assistance",
    category: "Corporate Policy & Administrative",
    comments: "Coordinated IT Helpdesk tickets for POS/STL terminals, HRHub accounts, biometrics, and connectivity."
  },
  finance_desk: {
    task: "Finance Desk Remittance & Payout Ticket Review",
    category: "Payroll, SSS & Compensation",
    comments: "Reviewed Finance Desk tickets regarding STL gross remittances, hits payouts, petty cash, and payslips."
  },
  knowledge_center: {
    task: "Knowledge Center Guides & Operational Playbooks Review",
    category: "Corporate Policy & Administrative",
    comments: "Consulted and managed operational playbooks, DOLE protocols, and HRHub guides in the Knowledge Center."
  },
  suggestion_box: {
    task: "Employee Suggestion Box & Feedback Review",
    category: "Employee Relations & Due Process",
    comments: "Reviewed staff improvement suggestions, feedback votes, and management responses."
  },
  leaderboards: {
    task: "Performance Leaderboards & Recognition Awards Review",
    category: "Corporate Policy & Administrative",
    comments: "Reviewed staff and subsidiary leaderboard rankings and employee recognition awards."
  },
  polls_surveys: {
    task: "Company Polls & Employee Pulse Survey Administration",
    category: "Employee Relations & Due Process",
    comments: "Reviewed and participated in live company polls and employee pulse surveys."
  },
  attendance: {
    task: "Daily HR Shift Login & Station Portal Check-in",
    category: "Shift Attendance & Station Check-in",
    comments: "Initiated active operational shift and workstation session in the HR portal."
  },
  shift_attendance: {
    task: "Daily HR Shift Login & Station Portal Check-in",
    category: "Shift Attendance & Station Check-in",
    comments: "Initiated active operational shift and workstation session in the HR portal."
  },
  salary_compensation: {
    task: "Salary & Compensation with Payslip Ledger Audit",
    category: "Payroll, SSS & Compensation",
    comments: "Audited monthly payroll computations, OCR salary slips, and SSS deductions."
  },
  betting_ratio: {
    task: "Multi-Area Betting Ratio Performance Analysis",
    category: "Payroll, SSS & Compensation",
    comments: "Analyzed multi-area betting ratio performance across regional STL gaming branches."
  }
};

let activeSessionLock = {
  email: null,
  moduleId: null,
  timestamp: 0,
  inFlight: false
};

export async function trackUserActiveModuleSession({ user, moduleId, customDetails = {} }) {
  if (!user || !moduleId) return null;

  const userEmail = (user.email || user.authorEmail || user.author_email || "").toLowerCase().trim();
  const nowMs = Date.now();

  if (
    activeSessionLock.email === userEmail &&
    activeSessionLock.moduleId === moduleId &&
    nowMs - activeSessionLock.timestamp < 15 * 60 * 1000
  ) {
    return null;
  }

  if (activeSessionLock.inFlight && activeSessionLock.email === userEmail) {
    return null;
  }

  activeSessionLock = {
    email: userEmail,
    moduleId,
    timestamp: nowMs,
    inFlight: true
  };

  const userName = user.name || user.authorName || user.author_name || "HR Officer";
  const userCompany = user.company || user.authorCompany || HEAD_OFFICE;
  const userRole = user.role || user.authorRole || user.author_role || "HR Officer";
  const userBranch = user.branch || user.authorBranch || "Head Office (SGC)";

  const mod = MODULE_WORKLOG_MAP[moduleId];
  const task = customDetails.task || mod?.task || `Operated in ${moduleId}`;
  const category = customDetails.category || mod?.category || "Corporate Policy & Administrative";
  const comments = customDetails.comments || mod?.comments || `Currently viewing and active in the ${task} module.`;

  const now = new Date();
  const nowTimeStr = formatTimeAMPM(now);
  const todayStr = getTodayDateStr();

  try {
    const { data: activeRows } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .ilike("author_email", userEmail)
      .eq("log_date", todayStr)
      .in("status", ["In Progress", "Ongoing", "in_progress", "AFK", "afk"])
      .order("created_at", { ascending: false });

    if (Array.isArray(activeRows) && activeRows.length > 0) {
      const activeRow = activeRows[0];
      const isAfk = Boolean(customDetails.isAfk);
      const newStatus = isAfk ? "AFK" : "In Progress";
      const newComments = isAfk
        ? `[Idle] Officer is currently Away From Keyboard (AFK) on ${task}.`
        : (comments ? comments.trim() : `Active and working in ${task}.`);

      await supabase
        .from(TABLE_NAME)
        .update({
          task_project: task.trim(),
          category,
          progress_comments: newComments,
          status: newStatus,
          end_time: "Active",
          updated_at: new Date().toISOString()
        })
        .eq("id", activeRow.id);

      if (activeRows.length > 1) {
        const extraIds = activeRows.slice(1).map((r) => r.id);
        await supabase.from(TABLE_NAME).delete().in("id", extraIds);
      }

      const updatedRecord = normalizeLogRecord({
        ...activeRow,
        task_project: task.trim(),
        category,
        progress_comments: newComments,
        status: newStatus,
        end_time: "Active"
      });

      if (Array.isArray(memoryWorkLogsList)) {
        memoryWorkLogsList = memoryWorkLogsList.map((m) => (m.id === activeRow.id ? updatedRecord : m));
      }

      broadcastWorkLogUpdate("work_log_updated", updatedRecord);
      return updatedRecord;
    }

    const newSessionPayload = {
      date: todayStr,
      taskProject: task.trim(),
      category,
      startTime: nowTimeStr,
      endTime: "Active",
      hoursWorked: customDetails.isAfk ? "Idle / AFK" : "Active Now",
      numericHours: 0.0,
      progressComments: comments.trim(),
      status: customDetails.isAfk ? "AFK" : "In Progress",
      authorName: userName,
      authorEmail: userEmail,
      authorRole: userRole,
      company: userCompany,
      branch: userBranch,
      isAutoLogged: true
    };

    return await addWorkLogEntry(newSessionPayload);
  } catch (err) {
    console.warn("trackUserActiveModuleSession exception:", err);
    return null;
  } finally {
    activeSessionLock.inFlight = false;
  }
}

export async function updateUserPresenceStatus({ user, isAfk, currentModule = "home" }) {
  if (!user) return false;

  const userEmail = (user.email || user.authorEmail || user.author_email || "").toLowerCase().trim();
  const todayStr = getTodayDateStr();
  const mod = MODULE_WORKLOG_MAP[currentModule];
  const task = mod?.task || "HR Operations";

  try {
    const { data: activeRows } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .ilike("author_email", userEmail)
      .eq("log_date", todayStr)
      .in("status", ["In Progress", "Ongoing", "in_progress", "AFK", "afk"])
      .order("created_at", { ascending: false });

    if (Array.isArray(activeRows) && activeRows.length > 0) {
      const activeRow = activeRows[0];
      const newStatus = isAfk ? "AFK" : "In Progress";
      const newComments = isAfk
        ? `[Idle] Officer is currently Away From Keyboard (AFK) on ${task}.`
        : `Active and working in ${task}.`;

      await supabase
        .from(TABLE_NAME)
        .update({
          status: newStatus,
          progress_comments: newComments,
          end_time: "Active",
          updated_at: new Date().toISOString()
        })
        .eq("id", activeRow.id);

      if (activeRows.length > 1) {
        const extraIds = activeRows.slice(1).map((r) => r.id);
        await supabase.from(TABLE_NAME).delete().in("id", extraIds);
      }

      const updatedRecord = normalizeLogRecord({
        ...activeRow,
        status: newStatus,
        progress_comments: newComments,
        end_time: "Active"
      });

      if (Array.isArray(memoryWorkLogsList)) {
        memoryWorkLogsList = memoryWorkLogsList.map((m) => (m.id === activeRow.id ? updatedRecord : m));
      }

      broadcastWorkLogUpdate("work_log_updated", updatedRecord);
      return true;
    }
  } catch (err) {
    console.warn("updateUserPresenceStatus exception:", err);
  }
  return false;
}

export async function autoPruneOldLogs(retentionDays = 7) {
  try {
    if (typeof window !== "undefined") {
      const todayStr = getTodayDateStr();
      const lastPruned = window.localStorage.getItem("hrhub_last_prune_date");
      if (lastPruned === todayStr) {
        return;
      }
      window.localStorage.setItem("hrhub_last_prune_date", todayStr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString().slice(0, 10);
    const cutoffIso = cutoffDate.toISOString();

    await supabase
      .from(TABLE_NAME)
      .delete()
      .or(`log_date.lt.${cutoffDateStr},created_at.lt.${cutoffIso}`);
  } catch (err) {
    console.warn("autoPruneOldLogs notice:", err);
  }
}

export function logSystemActivity(user, moduleId, customDetails = {}) {
  if (!user) return null;
  return trackUserActiveModuleSession({ user, moduleId, customDetails });
}

export async function autoReconcileStaleSessions(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return;
  const nowMs = Date.now();
  const staleRows = [];

  for (const row of rawRows) {
    const isReportedActive =
      row.status === "In Progress" ||
      row.status === "Ongoing" ||
      row.status === "in_progress" ||
      row.status === "AFK" ||
      row.status === "afk" ||
      row.end_time === "Active";

    if (!isReportedActive) continue;

    const lastActive = row.updated_at || row.created_at;
    if (!lastActive) continue;
    const elapsedMinutes = (nowMs - new Date(lastActive).getTime()) / (60 * 1000);

    if (elapsedMinutes > 7) {
      staleRows.push(row);
    }
  }

  if (staleRows.length === 0) return;

  for (const row of staleRows) {
    const lastActive = row.updated_at || row.created_at;
    const endTimeStr = formatTimeAMPM(new Date(lastActive));
    const calc = calculateHoursWorked(row.start_time, endTimeStr);

    try {
      await supabase
        .from(TABLE_NAME)
        .update({
          status: "Completed",
          end_time: endTimeStr,
          hours_worked: calc.numericHours,
          updated_at: new Date().toISOString()
        })
        .eq("id", row.id);
    } catch (e) {
      console.warn("Auto-reconcile session update notice:", e);
    }
  }
}

export async function sendUserHeartbeat({ user, isAfk = false, currentModule = "home" }) {
  if (!user) return;
  const userEmail = (user.email || user.authorEmail || user.author_email || "").toLowerCase().trim();
  const todayStr = getTodayDateStr();

  try {
    await supabase
      .from(TABLE_NAME)
      .update({
        status: isAfk ? "AFK" : "In Progress",
        updated_at: new Date().toISOString()
      })
      .ilike("author_email", userEmail)
      .eq("log_date", todayStr)
      .in("status", ["In Progress", "Ongoing", "in_progress", "AFK", "afk"]);
  } catch (err) {
    console.warn("sendUserHeartbeat notice:", err);
  }
}

export async function closeActiveModuleSession({ user }) {
  if (!user) return;
  const userEmail = (user.email || user.authorEmail || user.author_email || "").toLowerCase().trim();
  const todayStr = getTodayDateStr();
  const now = new Date();
  const nowTimeStr = formatTimeAMPM(now);

  try {
    const { data: activeRows } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .ilike("author_email", userEmail)
      .eq("log_date", todayStr)
      .in("status", ["In Progress", "Ongoing", "in_progress", "AFK", "afk"]);

    if (Array.isArray(activeRows) && activeRows.length > 0) {
      for (const row of activeRows) {
        const dur = calculateHoursWorked(row.start_time, nowTimeStr);
        await supabase
          .from(TABLE_NAME)
          .update({
            status: "Completed",
            end_time: nowTimeStr,
            hours_worked: dur.numericHours,
            updated_at: now.toISOString()
          })
          .eq("id", row.id);
      }
      broadcastWorkLogUpdate("work_log_updated");
    }
  } catch (err) {
    console.warn("closeActiveModuleSession notice:", err);
  }
}

