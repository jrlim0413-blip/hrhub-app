/**
 * inAppEmailService.js
 * Comprehensive In-App Email Dispatch & Receiving Client for HR Hub.
 * Enables sending, receiving, threading, and storing official IR and NTE communications
 * without leaving the application or switching to external email providers.
 */

import { supabase } from "./supabase";

const LOCAL_EMAIL_STORAGE_KEY = "hrhub_inapp_emails_v1";
const CLOUD_EMAIL_BACKUP_KEY = "hrhub_inapp_emails_hub";

let emailBroadcastChannel = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    emailBroadcastChannel = new BroadcastChannel("hrhub_inapp_emails_sync");
  } catch (e) {
    // Ignore channel creation error
  }
}

function getLocalEmails() {
  try {
    const raw = localStorage.getItem(LOCAL_EMAIL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalEmails(emails) {
  try {
    localStorage.setItem(LOCAL_EMAIL_STORAGE_KEY, JSON.stringify(emails));
  } catch (e) {
    console.warn("[inAppEmailService] Local save error:", e);
  }
}

/**
 * Fetch all in-app emails (Inbox + Sent)
 */
export async function fetchInAppEmails() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", CLOUD_EMAIL_BACKUP_KEY)
        .maybeSingle();

      if (!error && data?.settings_json?.emails && Array.isArray(data.settings_json.emails)) {
        saveLocalEmails(data.settings_json.emails);
        return data.settings_json.emails;
      }
    }
  } catch (err) {
    console.debug("[inAppEmailService] Cloud fetch warning:", err?.message);
  }

  return getLocalEmails();
}

/**
 * Send an in-app email with instant cross-tab live sync and cloud backup
 */
export async function sendInAppEmail({
  from,
  fromName,
  to,
  toName,
  cc = "",
  subject,
  body,
  caseNumber = "",
  documentType = "INCIDENT_REPORT",
  attachments = []
}) {
  const current = getLocalEmails();
  const nowIso = new Date().toISOString();

  const newEmail = {
    id: `EML-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    from: from || "admin@hrhub.com",
    fromName: fromName || "HR Hub Officer",
    to: to || "",
    toName: toName || to || "Recipient",
    cc: cc || "",
    subject: subject || "Official HR Communication",
    body: body || "",
    caseNumber,
    documentType, // "INCIDENT_REPORT" | "NOTICE_TO_EXPLAIN" | "EMPLOYEE_DEFENSE"
    attachments: Array.isArray(attachments) ? attachments : [],
    status: "DELIVERED",
    read: false,
    timestamp: nowIso
  };

  const updated = [newEmail, ...current];
  saveLocalEmails(updated);

  // Broadcast to other open tabs
  if (emailBroadcastChannel) {
    try {
      emailBroadcastChannel.postMessage({
        action: "NEW_EMAIL",
        email: newEmail,
        emails: updated
      });
    } catch (e) {
      // Ignore
    }
  }

  // Cloud persistence
  if (supabase) {
    try {
      await supabase.from("user_settings").upsert(
        {
          user_id: CLOUD_EMAIL_BACKUP_KEY,
          settings_json: {
            emails: updated,
            lastUpdated: nowIso
          },
          updated_at: nowIso
        },
        { onConflict: "user_id" }
      );
    } catch (err) {
      console.debug("[inAppEmailService] Cloud save notice:", err?.message);
    }
  }

  return newEmail;
}

/**
 * Mark email as read
 */
export async function markEmailAsRead(id) {
  const current = getLocalEmails();
  const updated = current.map((e) => (e.id === id ? { ...e, read: true } : e));
  saveLocalEmails(updated);

  if (supabase) {
    try {
      await supabase.from("user_settings").upsert(
        {
          user_id: CLOUD_EMAIL_BACKUP_KEY,
          settings_json: { emails: updated, lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    } catch {
      // Ignore
    }
  }

  return updated;
}

/**
 * Delete an email message
 */
export async function deleteInAppEmail(id) {
  const current = getLocalEmails();
  const updated = current.filter((e) => e.id !== id);
  saveLocalEmails(updated);

  if (supabase) {
    try {
      await supabase.from("user_settings").upsert(
        {
          user_id: CLOUD_EMAIL_BACKUP_KEY,
          settings_json: { emails: updated, lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    } catch {
      // Ignore
    }
  }

  return updated;
}

/**
 * Subscribe to live email updates across browser tabs
 */
export function subscribeToLiveEmails(callback) {
  if (!emailBroadcastChannel) return () => {};

  const handler = (event) => {
    if (event.data?.emails && Array.isArray(event.data.emails)) {
      callback(event.data.emails, event.data.email);
    }
  };

  emailBroadcastChannel.addEventListener("message", handler);
  return () => {
    emailBroadcastChannel.removeEventListener("message", handler);
  };
}

/**
 * Generate formal memo template for Incident Report transmittal
 */
export function generateIrEmailTemplate(report = {}) {
  const dateStr = report.dateReported || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return (
    `MEMORANDUM\n\n` +
    `DATE: ${dateStr}\n` +
    `TO: ${report.receiverHrName || "Head Office HRMD"} (${report.receiverCompany || "Simpal Group of Companies"})\n` +
    `FROM: ${report.senderHrName || report.reportingHrName || "Branch HR"} (${report.senderCompany || report.company || "Subsidiary Company"})\n` +
    `SUBJECT: OFFICIAL TRANSMITTAL OF INCIDENT REPORT [CASE NO. ${report.caseNumber || "IR-NEW"}]\n` +
    `EMPLOYEE CONCERNED: ${(report.employeeName || "Staff").toUpperCase()} (${report.employeePosition || "Position"})\n` +
    `BRANCH LOCATION: ${report.branch || "Branch Location"}\n\n` +
    `Dear HRMD Team,\n\n` +
    `Please find attached the official transmittal of the Incident Report filed against ${report.employeeName}.\n\n` +
    `SUMMARY OF FINDINGS:\n` +
    `• Incident Category: ${report.incidentCategory || "Cash Shortage / SOP Violation"}\n` +
    (report.cashShortageAmount ? `• Shortage Variance: PHP ${report.cashShortageAmount}\n` : "") +
    `• Audit Conducted On: ${report.auditDates || "Scheduled Audit"} by ${report.auditedBy || "Internal Audit"}\n\n` +
    `INCIDENT DETAILS:\n` +
    `${report.specificFindings || report.fullIncidentNarrative || "Please refer to the enclosed Incident Report form."}\n\n` +
    `ROOT CAUSES IDENTIFIED:\n` +
    `${report.incidentCauses || "Non-observance of branch Standard Operating Procedures."}\n\n` +
    `This report is formally transmitted to Simpal Group of Companies (Head Office) for legal evaluation and issuance of the official Notice to Explain (NTE).\n\n` +
    `Respectfully yours,\n` +
    `${report.senderHrName || report.reportingHrName || "Branch HR Officer"}\n` +
    `${report.senderHrTitle || report.reportingHrTitle || "HR Admin"}\n` +
    `${report.senderCompany || report.company}`
  );
}

/**
 * Generate formal memo template for Notice to Explain issuance
 */
export function generateNteEmailTemplate(report = {}) {
  const dateStr = report.nteDate || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return (
    `NOTICE TO EXPLAIN (NTE)\n\n` +
    `DATE: ${dateStr}\n` +
    `TO: ${(report.employeeName || "Employee").toUpperCase()}\n` +
    `POSITION: ${report.employeePosition || "Cashier"}\n` +
    `BRANCH: ${report.branch || "Branch"}\n` +
    `COMPANY: ${report.senderCompany || report.company}\n` +
    `FROM: ${report.nteSignatoryName || "JEVINCE JAYE S. JUBAY, CHRP"} (${report.nteSignatoryTitle || "HRMD Manager"})\n` +
    `SUBJECT: FORMAL NOTICE TO EXPLAIN - CASE NO. ${report.caseNumber || "NTE-OFFICIAL"}\n\n` +
    `STATEMENT OF CHARGES & FINDINGS:\n` +
    `${report.nteBodyParagraph1 || "A verified cash shortage or procedural breach was uncovered during the branch audit."}\n\n` +
    `SPECIFIC ALLEGATIONS:\n` +
    `${report.nteBodyParagraph2 || "Failure to observe cash handling standard operating procedures."}\n\n` +
    `COMPANY CODE OF CONDUCT VIOLATION CHARGE:\n` +
    `${report.codeOfConductSection || "Section 14: Offenses Against Honesty, Financial Custodianship & Company Property."}\n\n` +
    `PHILIPPINE LABOR CODE (PD 442) GROUNDS:\n` +
    `${report.laborCodeViolation || "Article 297 (Termination by Employer / Just Causes)."}\n\n` +
    `DUE PROCESS DIRECTIVE:\n` +
    `${report.nteDueProcessClause || "You are hereby given five (5) calendar days from receipt of this notice to submit your written explanation."}\n\n` +
    `${report.nteConclusion || "Failure on your part to submit a written explanation shall be considered an admission of the foregoing allegations.\n\nFor your strict compliance."}\n\n` +
    `ISSUED BY:\n` +
    `${report.nteSignatoryName || "JEVINCE JAYE S. JUBAY, CHRP"}\n` +
    `${report.nteSignatoryTitle || "HRMD Manager"}\n` +
    `Simpal Group of Companies (Head Office)`
  );
}
