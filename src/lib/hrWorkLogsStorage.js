/**
 * hrWorkLogsStorage.js
 * Dedicated Live Database Service for Enterprise HR Daily Work Logs & Shift Timesheets.
 * 
 * Features:
 * - Direct Supabase table queries: `hr_work_logs`
 * - Resilient fallback to `user_settings` if custom table is being set up
 * - Live real-time database listener (`supabase.channel`) + Cross-tab broadcast
 * - Telemetry Auto-Logger (`autoLogHRAction`): captures actual system operations performed by HR
 * - Automated duration calculator (decimal + formatted hours)
 */

import { supabase } from "./supabase.js";
import { HEAD_OFFICE } from "./companyEntities.js";

export const TABLE_NAME = "hr_work_logs";
export const FALLBACK_SETTINGS_KEY = "enterprise_hr_actual_worklogs_v1";

// Broadcast Channel for Instant Cross-Tab Real-Time Sync
let workLogsChannel = null;
try {
  if (typeof window !== "undefined" && window.BroadcastChannel) {
    workLogsChannel = new BroadcastChannel("hrhub_worklogs_live_sync");
  }
} catch {
  // Ignore
}

export function broadcastWorkLogUpdate(type, payload) {
  try {
    if (workLogsChannel) {
      workLogsChannel.postMessage({ type, payload, timestamp: Date.now() });
    }
  } catch {
    // Ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hrhub_worklogs_updated", { detail: { type, payload } }));
  }
}

/**
 * Real-time subscription to database changes
 */
export function subscribeToWorkLogsLive(callback) {
  const handler = (e) => {
    if (e?.detail) callback(e.detail);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("hrhub_worklogs_updated", handler);
  }

  // Cross-tab broadcast listener
  let bcHandler = null;
  if (workLogsChannel) {
    bcHandler = (e) => {
      if (e?.data) callback(e.data);
    };
    workLogsChannel.addEventListener("message", bcHandler);
  }

  // Supabase Realtime channel listener
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

/**
 * Calculate duration in hours between two time strings like "8:00 AM" and "10:30 AM"
 */
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
  if (diff < 0) diff += 24 * 60; // Overnight shift

  const hours = diff / 60;
  const numericHours = parseFloat(hours.toFixed(2));
  const formatted = hours % 1 === 0 ? `${hours} hr${hours === 1 ? "" : "s"}` : `${hours.toFixed(1)} hrs`;

  return { numericHours, formatted };
}

/**
 * Normalizes a record from the database to clean frontend camelCase format
 */
function normalizeLogRecord(raw) {
  if (!raw) return null;
  const numericDuration = Number(raw.hours_worked || raw.hoursWorked || 0);
  const formattedDuration =
    numericDuration > 0
      ? numericDuration % 1 === 0
        ? `${numericDuration} hr${numericDuration === 1 ? "" : "s"}`
        : `${numericDuration.toFixed(1)} hrs`
      : "--";

  const progressText = raw.progress_comments || raw.progressComments || "";
  const isAuto = Boolean(raw.is_auto_logged || raw.isAutoLogged || progressText.includes("[Auto-Logged]"));
  const taskTitle = raw.task_project || raw.taskProject || "General HR Task";
  let normalizedCat = raw.category || "";
  if (!normalizedCat || normalizedCat === "General HR Admin" || taskTitle.toLowerCase().includes("shift login") || taskTitle.toLowerCase().includes("check-in")) {
    normalizedCat = "Shift Attendance & Station Check-in";
  }

  return {
    id: String(raw.id || `log_${Date.now()}`),
    date: raw.log_date || raw.date || getTodayDateStr(),
    taskProject: taskTitle,
    category: normalizedCat,
    startTime: raw.start_time || raw.startTime || "8:00 AM",
    endTime: raw.end_time || raw.endTime || "5:00 PM",
    hoursWorked: raw.hours_worked_formatted || formattedDuration,
    numericHours: numericDuration,
    progressComments: progressText.replace("[Auto-Logged] ", "").replace("[Auto-Logged]", "").trim(),
    status: raw.status || "Completed",
    isAutoLogged: isAuto,
    authorName: raw.author_name || raw.authorName || "HR Officer",
    authorEmail: (raw.author_email || raw.authorEmail || "").toLowerCase().trim(),
    authorRole: raw.author_role || raw.authorRole || "HR Administrator",
    company: raw.company || HEAD_OFFICE,
    branch: raw.branch || "Head Office (SGC)",
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString()
  };
}

// In-memory cache
let memoryWorkLogsList = null;

/**
 * Fetch all work logs directly from database table `hr_work_logs`
 * 100% strictly database-driven. NO mockups, NO synthetic baseline data.
 */
export async function fetchAllWorkLogs() {
  try {
    // 1. Direct query to dedicated `hr_work_logs` database table
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const normalized = data.map(normalizeLogRecord).filter(Boolean);
      memoryWorkLogsList = normalized;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(FALLBACK_SETTINGS_KEY, JSON.stringify(normalized));
        } catch {}
      }
      return normalized;
    }

    // 2. Fallback to `user_settings` table if dedicated table is pending setup
    const { data: settingsData } = await supabase
      .from("user_settings")
      .select("settings_json")
      .eq("user_id", FALLBACK_SETTINGS_KEY)
      .maybeSingle();

    if (settingsData?.settings_json && Array.isArray(settingsData.settings_json)) {
      const normalized = settingsData.settings_json.map(normalizeLogRecord).filter(Boolean);
      memoryWorkLogsList = normalized;
      return normalized;
    }

    // 3. Fallback to localStorage cache
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

/**
 * Add a new real work log directly to database
 */
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
    // 1. Attempt direct insert into `hr_work_logs` table
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

      // Update backup mirror
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

    // 2. Resilient fallback if table does not exist yet
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

/**
 * Delete a work log entry directly from database
 */
export async function deleteWorkLogEntry(logId) {
  try {
    // Delete directly from dedicated database table
    await supabase.from(TABLE_NAME).delete().eq("id", logId);

    // Update in-memory and fallback cache
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

// In-memory anti-duplication debounce set
const recentAutoLogs = new Map();

/**
 * Checks if a user is specifically the Head Office HRMD Master Account.
 * Only the Head Office HRMD Master Account is excluded from being logged, as they oversee all staff logs.
 * All other per-user accounts (branch officers, supervisors, employees) are recorded and visible per user.
 */
export function isHRMDUser(user) {
  if (!user) return false;
  const email = String(user.email || user.authorEmail || "").toLowerCase().trim();
  const name = String(user.name || user.authorName || "").toLowerCase().trim().replace(/\s+/g, "");
  const role = String(user.role || user.authorRole || "").toLowerCase().trim();

  // ONLY exclude when specifically HRMD
  return (
    name === "hrmd" ||
    role === "hrmd director" ||
    role === "head office hrmd" ||
    role === "hrmd admin" ||
    email === "hrmd@simpalgroup.com" ||
    email === "hrmd@hrhub.com" ||
    (email.includes("hrmd@") && !email.includes("admin@"))
  );
}

// Alias for backwards compatibility
export const isHRAdminUser = isHRMDUser;

/**
 * Automatically logs an actual operational action performed by staff/officers in HR Hub.
 * Triggered transparently in the background when operations are performed:
 * - Drafting or issuing an official Memo / NTE
 * - Updating 201 employee files or compliance docs
 * - Resolving or reviewing an Incident Report
 * - Publishing a company announcement
 * - Daily shift portal access
 * 
 * Note: Specifically HRMD Master Account is excluded as they monitor the logs.
 * All other per-user personnel (Remark Joy Gaviola, branch staff, supervisors) are logged.
 */
export async function autoLogHRAction({
  user,
  taskProject,
  category = "Shift Attendance & Station Check-in",
  progressComments = "",
  status = "Completed",
  durationMinutes = 30
}) {
  if (!user || !taskProject) return null;

  // Specifically HRMD Master Account is excluded since they monitor the logs
  if (isHRMDUser(user)) {
    return null;
  }

  const userEmail = (user.email || user.authorEmail || "").toLowerCase().trim();
  const userName = user.name || user.authorName || "HR Officer";
  const userCompany = user.company || user.authorCompany || HEAD_OFFICE;
  const userRole = user.role || user.authorRole || "HR Officer";
  const userBranch = user.branch || user.authorBranch || "Head Office (SGC)";

  // Debounce duplicate events within 10 seconds
  const debounceKey = `${userEmail}_${taskProject}`;
  const lastLogged = recentAutoLogs.get(debounceKey);
  const nowMs = Date.now();
  if (lastLogged && nowMs - lastLogged < 10000) {
    return null;
  }
  recentAutoLogs.set(debounceKey, nowMs);

  const now = new Date();
  const endTimeStr = formatTimeAMPM(now);
  const startTimeObj = new Date(now.getTime() - durationMinutes * 60 * 1000);
  const startTimeStr = formatTimeAMPM(startTimeObj);

  const durationHours = parseFloat((durationMinutes / 60).toFixed(2));
  const formattedDuration = durationHours % 1 === 0 ? `${durationHours} hr${durationHours === 1 ? "" : "s"}` : `${durationHours} hrs`;

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

/**
 * HR Work Log Operational Categories
 */
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

/**
 * System-Wide Telemetry Mapping for Live Shift & Accomplishment Logs.
 * Automatically logs professional HR operational records whenever any tab or feature is used.
 */
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
    task: "SOP Workflow & Task Board Audit",
    category: "Corporate Policy & Administrative",
    comments: "Inspected standard operating procedures, task milestones, and daily administrative duties."
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

/**
 * System-Wide Activity Logger:
 * Automatically records actual operations performed by authenticated staff users.
 * Does NOT generate artificial telemetry for offline users.
 */
export function logSystemActivity(user, moduleId, customDetails = {}) {
  // Only actual logged-in users who are NOT the HRMD master monitor generate work logs
  if (!user || isHRMDUser(user)) return null;

  const mod = MODULE_WORKLOG_MAP[moduleId];
  if (!mod && !customDetails.task) return null;

  const task = customDetails.task || mod?.task || `Operated in ${moduleId}`;
  const category = customDetails.category || mod?.category || "Corporate Policy & Administrative";
  const comments = customDetails.comments || mod?.comments || `Active session in ${moduleId} module.`;
  const durationMinutes = customDetails.durationMinutes || 20;

  return autoLogHRAction({
    user,
    taskProject: task,
    category,
    progressComments: comments,
    status: "Completed",
    durationMinutes
  });
}

