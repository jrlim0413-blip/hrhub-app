/**
 * hrAttendanceStorage.js
 * Dedicated Cloud Database & Synchronized Local Storage Service for
 * Multi-Entity HR Officers Attendance and Daily Work & Accomplishment Logs.
 * 
 * Features:
 * - Real-time HR Time-In / Time-Out / Duty Status tracking per entity.
 * - Daily HR Work & Accomplishment Logs ("parang may kanyang logs sila").
 * - Categorized audit trail (Profiling & 201 Files, SOP Audits, Due Process, Field Terminal Visits, etc.)
 * - Instant cross-tab broadcast synchronization.
 * - Resilient Supabase database backing via 'user_settings' table.
 */

import { supabase } from "./supabase.js";
import { HEAD_OFFICE, ALL_SUBSIDIARIES, matchesCompanyEntity } from "./companyEntities.js";

export const HR_ATTENDANCE_STORE_KEY = "enterprise_hr_attendance_roster_master_v1";
export const HR_ACCOMPLISHMENT_STORE_KEY = "enterprise_hr_accomplishment_logs_master_v1";

// Live Cross-Tab Broadcast Channel
let hrBroadcastChannel = null;
try {
  if (typeof window !== "undefined" && window.BroadcastChannel) {
    hrBroadcastChannel = new BroadcastChannel("hrhub_hr_attendance_live_sync");
  }
} catch {
  // Fallback for older browsers
}

export function broadcastHRAttendanceUpdate(type, payload) {
  try {
    if (hrBroadcastChannel) {
      hrBroadcastChannel.postMessage({ type, payload, timestamp: Date.now() });
    }
  } catch {
    // Ignore
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hrhub_hr_attendance_updated", { detail: { type, payload } }));
  }
}

export function subscribeToHRAttendanceLive(callback) {
  const handler = (e) => {
    if (e?.detail) callback(e.detail);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("hrhub_hr_attendance_updated", handler);
  }
  if (hrBroadcastChannel) {
    const bcHandler = (e) => {
      if (e?.data) callback(e.data);
    };
    hrBroadcastChannel.addEventListener("message", bcHandler);
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("hrhub_hr_attendance_updated", handler);
      }
      hrBroadcastChannel.removeEventListener("message", bcHandler);
    };
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("hrhub_hr_attendance_updated", handler);
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

export const HR_LOG_CATEGORIES = [
  {
    id: "profiling_201",
    label: "Profiling & 201 Files",
    icon: "FolderCheck",
    color: "bg-blue-50 text-blue-800 border-blue-200",
    badge: "📂 201 Files"
  },
  {
    id: "attendance_audit",
    label: "Attendance & Roster Audit",
    icon: "ClipboardCheck",
    color: "bg-emerald-50 text-emerald-800 border-emerald-200",
    badge: "📋 Attendance Audit"
  },
  {
    id: "due_process",
    label: "Due Process & IR / NTE",
    icon: "ShieldAlert",
    color: "bg-rose-50 text-rose-800 border-rose-200",
    badge: "⚖️ Due Process & IR"
  },
  {
    id: "memos_policy",
    label: "Memos & Policy Circulars",
    icon: "Megaphone",
    color: "bg-purple-50 text-purple-800 border-purple-200",
    badge: "📢 Policy Memos"
  },
  {
    id: "station_inspection",
    label: "Field Terminal & Station Visit",
    icon: "Building2",
    color: "bg-amber-50 text-amber-900 border-amber-200",
    badge: "🏢 Station Inspection"
  },
  {
    id: "payroll_benefits",
    label: "Payroll & Benefits Coordination",
    icon: "CreditCard",
    color: "bg-teal-50 text-teal-800 border-teal-200",
    badge: "💰 Payroll & Benefits"
  },
  {
    id: "personnel_inquiry",
    label: "Personnel Relations & Support",
    icon: "Users",
    color: "bg-indigo-50 text-indigo-800 border-indigo-200",
    badge: "🤝 HR Relations"
  }
];

export const COMMON_HR_TASK_PRESETS = [
  {
    category: "profiling_201",
    title: "Verified 201 Compliance Files for New Branch Hires",
    details: "Checked NBI Clearance, SSS/PhilHealth/Pag-IBIG member data, and signed employment contracts for new personnel."
  },
  {
    category: "attendance_audit",
    title: "Conducted Daily Shift Biometric & Cashier DTR Audit",
    details: "Reconciled terminal teller time-in records against active drawer assignments; verified station supervisor logs."
  },
  {
    category: "due_process",
    title: "Facilitated Incident Report (IR) Intake & Explanation Conference",
    details: "Documented discrepancy findings, provided formal receipt of statement, and escalated findings for administrative review."
  },
  {
    category: "station_inspection",
    title: "Station Spot Inspection & Safety Environment Review",
    details: "Visited branch terminal to inspect physical cash custody enclosures, teller workstations, and bulletin postings."
  },
  {
    category: "memos_policy",
    title: "Disseminated Enterprise Policy Circular to Branch Supervisors",
    details: "Circulated executive operational memo and confirmed acknowledgment signatures across all field shifts."
  },
  {
    category: "payroll_benefits",
    title: "Consolidated Branch Timesheet Exceptions for Payroll Cutoff",
    details: "Reviewed and validated overtime slips, official leaves, and verified deductions before final payroll submission."
  }
];

// In-memory caches for instant synchronous render
let memoryAttendanceMap = null;
let memoryAccomplishmentsList = null;

// Initial starter seed records for today so HR Administrator immediately sees realistic data
function generateInitialSeeds() {
  const today = getTodayDateStr();

  const initialAttendance = [
    {
      id: `admin@hrhub.com_${today}`,
      date: today,
      email: "admin@hrhub.com",
      name: "H R M D",
      company: "Simpal Group of Companies",
      role: "HR Administrator",
      branch: "Head Office (SGC)",
      status: "present",
      timeIn: "07:45 AM",
      timeOut: null,
      breakStart: null,
      breakEnd: null,
      location: "Head Office Corporate Suite",
      shift: "Executive Shift (07:30 AM - 05:30 PM)",
      notes: "Central holding HR administration and multi-entity operations oversight.",
      updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: `caquennie6@gmail.com_${today}`,
      date: today,
      email: "caquennie6@gmail.com",
      name: "Quennie Lim",
      company: "Simpal Group of Companies",
      role: "HR Admin III",
      branch: "Head Office (SGC)",
      status: "present",
      timeIn: "08:00 AM",
      timeOut: null,
      breakStart: null,
      breakEnd: null,
      location: "Head Office (SGC)",
      shift: "Standard Office Shift (08:00 AM - 05:00 PM)",
      notes: "Corporate onboarding, compliance filings, and employee records archival.",
      updatedAt: new Date(Date.now() - 3600000 * 3.5).toISOString()
    },
    {
      id: `aguinaldokinjohn@gmail.com_${today}`,
      date: today,
      email: "aguinaldokinjohn@gmail.com",
      name: "Kin John Aguinaldo",
      company: "5A Royal Gaming OPC",
      role: "HR Admin V",
      branch: "Maguindanao Branch",
      status: "present",
      timeIn: "08:15 AM",
      timeOut: null,
      breakStart: null,
      breakEnd: null,
      location: "Maguindanao Branch Office",
      shift: "STL Operations Shift (08:00 AM - 05:00 PM)",
      notes: "On-site HR duty, draw court teller supervision, and terminal audit.",
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: `itreports.company@gmail.com_${today}`,
      date: today,
      email: "itreports.company@gmail.com",
      name: "Jay Ryan Lim",
      company: "Lucky Betplay Corporation",
      role: "Site Supervisor",
      branch: "Mandaue City Branch",
      status: "field_work",
      timeIn: "08:30 AM",
      timeOut: null,
      breakStart: null,
      breakEnd: null,
      location: "Mandaue Terminal Cluster A",
      shift: "Field & Operations Duty (08:30 AM - 05:30 PM)",
      notes: "Conducting station-level supervisor attendance checking and biometric sync.",
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
    }
  ];

  const initialAccomplishments = [
    {
      id: `seed_log_1_${today}`,
      date: today,
      authorEmail: "aguinaldokinjohn@gmail.com",
      authorName: "Kin John Aguinaldo",
      authorRole: "HR Admin V",
      authorCompany: "5A Royal Gaming OPC",
      branch: "Maguindanao Branch",
      category: "attendance_audit",
      title: "Completed Morning Shift Roster Verification & Biometric Cross-Match",
      details: "Audited morning teller check-ins across 14 terminals in Maguindanao. Reconciled biometric time-in against active cluster cashier schedules; zero unexcused absences noted.",
      timeLogged: "09:30 AM",
      status: "completed",
      tags: ["Biometric Audit", "Maguindanao"],
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: `seed_log_2_${today}`,
      date: today,
      authorEmail: "aguinaldokinjohn@gmail.com",
      authorName: "Kin John Aguinaldo",
      authorRole: "HR Admin V",
      authorCompany: "5A Royal Gaming OPC",
      branch: "Maguindanao Branch",
      category: "profiling_201",
      title: "Processed 201 File Requirements & IDs for Newly Enrolled Tellers",
      details: "Collected Government Valid IDs (PhilSys / UMID) and medical clearances for 2 newly hired relief tellers. Uploaded digital compliance records to secure cloud dossier.",
      timeLogged: "11:15 AM",
      status: "completed",
      tags: ["201 Dossier", "Onboarding"],
      createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString()
    },
    {
      id: `seed_log_3_${today}`,
      date: today,
      authorEmail: "caquennie6@gmail.com",
      authorName: "Quennie Lim",
      authorRole: "HR Admin III",
      authorCompany: "Simpal Group of Companies",
      branch: "Head Office (SGC)",
      category: "memos_policy",
      title: "Disseminated Enterprise Holiday Schedule & Cutoff Advisory",
      details: "Prepared and circulated the official memorandum regarding upcoming payroll cutoff and special working holiday staffing roster to all entity administrators.",
      timeLogged: "10:00 AM",
      status: "completed",
      tags: ["Executive Memo", "Payroll Cutoff"],
      createdAt: new Date(Date.now() - 3600000 * 2.5).toISOString()
    },
    {
      id: `seed_log_4_${today}`,
      date: today,
      authorEmail: "admin@hrhub.com",
      authorName: "H R M D",
      authorRole: "HR Administrator",
      authorCompany: "Simpal Group of Companies",
      branch: "Head Office (SGC)",
      category: "due_process",
      title: "Central Administrative Due Process & Incident Report Review",
      details: "Conducted preliminary evaluation of branch incident reports from the past week. Verified compliance with standard disciplinary procedure and guidelines.",
      timeLogged: "08:45 AM",
      status: "in_progress",
      tags: ["Due Process", "Compliance"],
      createdAt: new Date(Date.now() - 3600000 * 3.8).toISOString()
    }
  ];

  return { initialAttendance, initialAccomplishments };
}

/**
 * Load HR Attendance Roster for a specific date
 */
export async function fetchHRAttendanceRoster(dateStr = getTodayDateStr()) {
  try {
    // 1. Check in-memory cache
    if (!memoryAttendanceMap) {
      // Try LocalStorage
      const local = typeof window !== "undefined" ? window.localStorage.getItem(HR_ATTENDANCE_STORE_KEY) : null;
      if (local) {
        try {
          memoryAttendanceMap = JSON.parse(local);
        } catch {
          memoryAttendanceMap = {};
        }
      } else {
        memoryAttendanceMap = {};
      }
    }

    // 2. Fetch from Supabase user_settings
    try {
      const { data } = await supabase
        .from("user_settings")
        .select("raw_settings")
        .eq("account_key", HR_ATTENDANCE_STORE_KEY)
        .maybeSingle();

      if (data?.raw_settings && typeof data.raw_settings === "object") {
        memoryAttendanceMap = {
          ...memoryAttendanceMap,
          ...data.raw_settings
        };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(HR_ATTENDANCE_STORE_KEY, JSON.stringify(memoryAttendanceMap));
        }
      }
    } catch {
      // Ignore network errors in sandbox
    }

    // Pre-seed today if empty
    if (!memoryAttendanceMap[dateStr] || !Array.isArray(memoryAttendanceMap[dateStr]) || memoryAttendanceMap[dateStr].length === 0) {
      const { initialAttendance } = generateInitialSeeds();
      if (dateStr === getTodayDateStr()) {
        memoryAttendanceMap[dateStr] = initialAttendance;
        persistHRAttendanceRoster(memoryAttendanceMap);
      } else {
        memoryAttendanceMap[dateStr] = [];
      }
    }

    return memoryAttendanceMap[dateStr] || [];
  } catch (err) {
    console.warn("fetchHRAttendanceRoster error:", err);
    return [];
  }
}

/**
 * Persist HR attendance roster to localStorage and Supabase
 */
async function persistHRAttendanceRoster(fullMap) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(HR_ATTENDANCE_STORE_KEY, JSON.stringify(fullMap));
    } catch {
      // Local storage quota or disabled
    }
  }

  try {
    await supabase.from("user_settings").upsert(
      {
        account_key: HR_ATTENDANCE_STORE_KEY,
        raw_settings: fullMap,
        updated_at: new Date().toISOString()
      },
      { onConflict: "account_key" }
    );
  } catch {
    // Ignore network errors
  }
}

/**
 * Punch or update an HR Officer's Attendance record
 */
export async function punchHRAttendance(record) {
  if (!record || !record.email) return { success: false, error: "Missing HR email" };

  const dateStr = record.date || getTodayDateStr();
  const currentList = await fetchHRAttendanceRoster(dateStr);

  const existingIdx = currentList.findIndex(
    (item) => (item.email || "").toLowerCase() === record.email.toLowerCase()
  );

  const updatedRecord = {
    id: `${record.email}_${dateStr}`,
    date: dateStr,
    email: record.email,
    name: record.name || record.email.split("@")[0],
    company: record.company || HEAD_OFFICE,
    role: record.role || "HR Officer",
    branch: record.branch || "Corporate Office",
    status: record.status || "present",
    timeIn: record.timeIn || (existingIdx >= 0 ? currentList[existingIdx].timeIn : new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
    timeOut: record.timeOut !== undefined ? record.timeOut : (existingIdx >= 0 ? currentList[existingIdx].timeOut : null),
    breakStart: record.breakStart !== undefined ? record.breakStart : (existingIdx >= 0 ? currentList[existingIdx].breakStart : null),
    breakEnd: record.breakEnd !== undefined ? record.breakEnd : (existingIdx >= 0 ? currentList[existingIdx].breakEnd : null),
    location: record.location || (existingIdx >= 0 ? currentList[existingIdx].location : "On-Site Office"),
    shift: record.shift || (existingIdx >= 0 ? currentList[existingIdx].shift : "Regular Day Shift"),
    notes: record.notes || (existingIdx >= 0 ? currentList[existingIdx].notes : ""),
    updatedAt: new Date().toISOString()
  };

  let newList = [];
  if (existingIdx >= 0) {
    newList = [...currentList];
    newList[existingIdx] = updatedRecord;
  } else {
    newList = [updatedRecord, ...currentList];
  }

  memoryAttendanceMap[dateStr] = newList;
  await persistHRAttendanceRoster(memoryAttendanceMap);
  broadcastHRAttendanceUpdate("attendance_punched", updatedRecord);

  return { success: true, record: updatedRecord };
}

/**
 * Load HR Daily Work & Accomplishment Logs
 */
export async function fetchHRAccomplishmentLogs(dateStr = null) {
  try {
    if (!memoryAccomplishmentsList) {
      const local = typeof window !== "undefined" ? window.localStorage.getItem(HR_ACCOMPLISHMENT_STORE_KEY) : null;
      if (local) {
        try {
          memoryAccomplishmentsList = JSON.parse(local);
        } catch {
          memoryAccomplishmentsList = [];
        }
      } else {
        memoryAccomplishmentsList = [];
      }
    }

    try {
      const { data } = await supabase
        .from("user_settings")
        .select("raw_settings")
        .eq("account_key", HR_ACCOMPLISHMENT_STORE_KEY)
        .maybeSingle();

      if (data?.raw_settings && Array.isArray(data.raw_settings)) {
        memoryAccomplishmentsList = data.raw_settings;
        if (typeof window !== "undefined") {
          window.localStorage.setItem(HR_ACCOMPLISHMENT_STORE_KEY, JSON.stringify(memoryAccomplishmentsList));
        }
      }
    } catch {
      // Ignore
    }

    // Seed if completely empty
    if (!Array.isArray(memoryAccomplishmentsList) || memoryAccomplishmentsList.length === 0) {
      const { initialAccomplishments } = generateInitialSeeds();
      memoryAccomplishmentsList = initialAccomplishments;
      persistHRAccomplishments(memoryAccomplishmentsList);
    }

    if (dateStr) {
      return memoryAccomplishmentsList.filter((log) => log.date === dateStr);
    }

    return memoryAccomplishmentsList;
  } catch (err) {
    console.warn("fetchHRAccomplishmentLogs error:", err);
    return [];
  }
}

/**
 * Persist HR accomplishments
 */
async function persistHRAccomplishments(logsList) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(HR_ACCOMPLISHMENT_STORE_KEY, JSON.stringify(logsList));
    } catch {
      // Ignore
    }
  }

  try {
    await supabase.from("user_settings").upsert(
      {
        account_key: HR_ACCOMPLISHMENT_STORE_KEY,
        raw_settings: logsList,
        updated_at: new Date().toISOString()
      },
      { onConflict: "account_key" }
    );
  } catch {
    // Ignore
  }
}

/**
 * Add a new HR Accomplishment / Task Log entry
 */
export async function addHRAccomplishmentLog(logData) {
  if (!logData || !logData.title) {
    return { success: false, error: "Task title is required." };
  }

  const allLogs = await fetchHRAccomplishmentLogs();
  const dateStr = logData.date || getTodayDateStr();

  const newLog = {
    id: `hrlog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: dateStr,
    authorEmail: logData.authorEmail || "admin@hrhub.com",
    authorName: logData.authorName || "HR Officer",
    authorRole: logData.authorRole || "HR Administrator",
    authorCompany: logData.authorCompany || HEAD_OFFICE,
    branch: logData.branch || "Head Office (SGC)",
    category: logData.category || "profiling_201",
    title: logData.title.trim(),
    details: (logData.details || "").trim(),
    timeLogged: logData.timeLogged || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    status: logData.status || "completed", // 'completed' | 'in_progress' | 'pending_followup'
    tags: Array.isArray(logData.tags) ? logData.tags : [],
    createdAt: new Date().toISOString()
  };

  const updatedLogs = [newLog, ...allLogs];
  memoryAccomplishmentsList = updatedLogs;
  await persistHRAccomplishments(updatedLogs);
  broadcastHRAttendanceUpdate("accomplishment_added", newLog);

  return { success: true, log: newLog };
}

/**
 * Delete an HR Accomplishment Log
 */
export async function deleteHRAccomplishmentLog(logId) {
  const allLogs = await fetchHRAccomplishmentLogs();
  const updatedLogs = allLogs.filter((l) => l.id !== logId);
  memoryAccomplishmentsList = updatedLogs;
  await persistHRAccomplishments(updatedLogs);
  broadcastHRAttendanceUpdate("accomplishment_deleted", { id: logId });
  return { success: true };
}

/**
 * Filter HR Officers from all database profiles
 * Returns profiles categorized by entity with designated HR duties
 */
export function extractHROfficers(allProfiles = []) {
  if (!Array.isArray(allProfiles)) return [];

  return allProfiles.filter((p) => {
    const role = (p.role || "").toLowerCase().trim();
    const email = (p.email || "").toLowerCase().trim();
    const dept = (p.department || "").toLowerCase().trim();

    return (
      email === "admin@hrhub.com" ||
      role.includes("hr") ||
      role.includes("admin") ||
      role.includes("supervisor") ||
      dept.includes("human resources") ||
      dept.includes("people")
    );
  });
}
