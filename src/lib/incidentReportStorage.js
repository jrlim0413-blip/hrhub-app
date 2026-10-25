import { supabase } from "./supabase";

const LOCAL_STORAGE_KEY = "hrhub_incident_reports_v1";
const CLOUD_BACKUP_KEY = "master_incident_reports_hub";

// Broadcast channel for instantaneous cross-tab synchronization
let liveBroadcastChannel = null;
try {
  if (typeof window !== "undefined" && window.BroadcastChannel) {
    liveBroadcastChannel = new BroadcastChannel("hrhub_incident_reports_live_sync");
  }
} catch (e) {
  // Ignore fallback
}

/**
 * Subscribe to live report broadcasts across browser tabs
 */
export function subscribeToLiveReports(onUpdate) {
  if (liveBroadcastChannel) {
    const handleMsg = (e) => {
      if (e.data?.reports && Array.isArray(e.data.reports)) {
        onUpdate(e.data.reports, e.data.action, e.data.target);
      }
    };
    liveBroadcastChannel.addEventListener("message", handleMsg);
    return () => liveBroadcastChannel.removeEventListener("message", handleMsg);
  }
  return () => {};
}

/**
 * Normalizes an incident report row from Supabase
 */
export function normalizeIncidentReport(d) {
  if (!d) return null;

  const specificFindings =
    d.specificFindings ||
    d.specific_findings ||
    d.fullIncidentNarrative ||
    d.full_incident_narrative ||
    d.incident_details ||
    d.incidentDetails ||
    "";

  const fullIncidentNarrative =
    d.fullIncidentNarrative ||
    d.full_incident_narrative ||
    d.specificFindings ||
    d.specific_findings ||
    "";

  const incidentCauses =
    d.incidentCauses ||
    d.incident_causes ||
    "Non-observance of Cashier Standard Operating Procedures (SOPs), unauthorized credit extensions, and failure to reconcile daily cash float before shift closure.";

  const followUpRecommendations =
    d.followUpRecommendations ||
    d.follow_up_recommendations ||
    "Immediate transmittal to Simpal Group of Companies (SGC) Head Office HRMD for formal Notice to Explain (NTE) issuance under Article 297 Labor Code.";

  const additionalNotes =
    d.additionalNotes ||
    d.additional_notes ||
    d.evidenceNotes ||
    d.evidence_notes ||
    "All physical cash count discrepancy sheets and borrower signed slips have been submitted and attached to the audit file.";

  const cashShortageAmount = d.cashShortageAmount || d.cash_shortage_amount || "";
  const incidentCategory = d.incidentCategory || d.incident_category || "Cash Shortage & Non-observance of SOPs";
  const incidentTime = d.incidentTime || d.incident_time || "16:30 PM";
  const policeNotified = d.policeNotified || d.police_notified || "NO";
  const branch = d.branch || d.branchLocation || d.branch_location || "Tacurong Branch";
  const auditDates = d.auditDates || d.audit_dates || "";
  const auditedBy = d.auditedBy || d.audited_by || "CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora";
  const department = d.department || "Finance & Cashier Operations";
  const phoneNumber = d.phoneNumber || d.phone_number || "+63 917 842 9102";

  const senderCompany = d.senderCompany || d.sender_company || d.company || "5A Royal Gaming OPC";
  const company = d.company || d.senderCompany || d.sender_company || "5A Royal Gaming OPC";
  const receiverCompany = d.receiverCompany || d.receiver_company || "Simpal Group of Companies";
  const senderHrName = d.senderHrName || d.sender_hr_name || d.reportingHrName || d.reporting_hr_name || "Branch HR";
  const senderHrTitle = d.senderHrTitle || d.sender_hr_title || d.reportingHrTitle || d.reporting_hr_title || "HR Admin";
  const receiverHrName = d.receiverHrName || d.receiver_hr_name || d.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP";
  const receiverHrTitle = d.receiverHrTitle || d.receiver_hr_title || d.assignedCentralHrTitle || "HRMD Manager";

  const nteSubject = d.nteSubject || d.nte_subject || "Notice to Explain";
  const nteDate = d.nteDate || d.nte_date || "";
  const nteBodyParagraph1 = d.nteBodyParagraph1 || d.nte_body_paragraph1 || d.nte_body || d.nteBody || "";
  const nteBodyParagraph2 = d.nteBodyParagraph2 || d.nte_body_paragraph2 || specificFindings || "";
  const nteBodyParagraph3 = d.nteBodyParagraph3 || d.nte_body_paragraph3 || "";
  const nteDueProcessClause = d.nteDueProcessClause || d.nte_due_process_clause || "";
  const codeOfConductSection = d.codeOfConductSection || d.code_of_conduct_section || "";
  const laborCodeViolation = d.laborCodeViolation || d.labor_code_violation || "";
  const nteConclusion = d.nteConclusion || d.nte_conclusion || "";
  const nteSignatoryName = d.nteSignatoryName || d.nte_signatory_name || receiverHrName;
  const nteSignatoryTitle = d.nteSignatoryTitle || d.nte_signatory_title || receiverHrTitle;
  const nteSignatoryCompany = d.nteSignatoryCompany || d.nte_signatory_company || receiverCompany;
  const nteIssuedDate = d.nteIssuedDate || d.nte_issued_date || "";
  const nteExplanationDeadlineDays = d.nteExplanationDeadlineDays || d.nte_explanation_deadline_days || 1;
  const employeeExplanation = d.employeeExplanation || d.employee_explanation || "";
  const explanationReceivedAt = d.explanationReceivedAt || d.explanation_received_at || "";

  return {
    ...d,
    id: d.id,
    caseNumber: d.case_number || d.caseNumber || d.id,
    status: d.status || "SUBMITTED_TO_CENTRAL_HR",
    senderCompany,
    sender_company: senderCompany,
    company,
    receiverCompany,
    receiver_company: receiverCompany,
    senderHrName,
    sender_hr_name: senderHrName,
    senderHrTitle,
    sender_hr_title: senderHrTitle,
    receiverHrName,
    receiver_hr_name: receiverHrName,
    receiverHrTitle,
    receiver_hr_title: receiverHrTitle,
    reportingHrName: senderHrName,
    reporting_hr_name: senderHrName,
    reportingHrTitle: senderHrTitle,
    reporting_hr_title: senderHrTitle,
    assignedCentralHrName: receiverHrName,
    assignedCentralHrTitle: receiverHrTitle,
    employeeName: d.employee_name || d.employeeName || "",
    employee_name: d.employee_name || d.employeeName || "",
    employeePosition: d.employee_position || d.employeePosition || "Cashier",
    employee_position: d.employee_position || d.employeePosition || "Cashier",
    dateOfIncident: d.date_of_incident || d.dateOfIncident || "",
    date_of_incident: d.date_of_incident || d.dateOfIncident || "",
    dateReported: d.date_reported || d.dateReported || "",
    date_reported: d.date_reported || d.dateReported || "",
    branch,
    branchLocation: branch,
    branch_location: branch,
    department,
    phoneNumber,
    cashShortageAmount,
    cash_shortage_amount: cashShortageAmount,
    specificFindings,
    specific_findings: specificFindings,
    fullIncidentNarrative,
    full_incident_narrative: fullIncidentNarrative,
    incidentCauses,
    incident_causes: incidentCauses,
    followUpRecommendations,
    follow_up_recommendations: followUpRecommendations,
    additionalNotes,
    additional_notes: additionalNotes,
    incidentCategory,
    incident_category: incidentCategory,
    incidentTime,
    incident_time: incidentTime,
    policeNotified,
    police_notified: policeNotified,
    auditDates,
    audit_dates: auditDates,
    auditedBy,
    audited_by: auditedBy,
    nteSubject,
    nte_subject: nteSubject,
    nteDate,
    nteBodyParagraph1,
    nte_body: nteBodyParagraph1,
    nteBodyParagraph2,
    nteBodyParagraph3,
    nteDueProcessClause,
    codeOfConductSection,
    laborCodeViolation,
    nteConclusion,
    violationPresetId: d.violationPresetId || d.violation_preset_id || "",
    violationSeverity: d.violationSeverity || d.violation_severity || "",
    violationSummaryTitle: d.violationSummaryTitle || d.violation_summary_title || "",
    nteSignatoryName,
    nteSignatoryTitle,
    nteSignatoryCompany,
    nteIssuedDate,
    nteExplanationDeadlineDays,
    employeeExplanation,
    explanationReceivedAt,
    activityLog: Array.isArray(d.activity_log) ? d.activity_log : (d.activityLog || [])
  };
}

/**
 * Looks up the assigned HR personnel for a given company from the Employee Directory profiles
 */
export function lookupAssignedHrForCompany(companyName, profiles = []) {
  if (!companyName) {
    return {
      name: "Ms. Quennie R. Capuyan",
      title: "HR Admin",
      email: "caquennie6@gmail.com",
      company: "5A Royal Gaming OPC"
    };
  }

  const norm = companyName.toLowerCase();

  // Find user whose company matches and has an HR/Admin role
  const match = profiles.find((p) => {
    const pComp = (p.company || "").toLowerCase();
    const pRole = (p.role || "").toLowerCase();
    return (
      (pComp.includes(norm) || norm.includes(pComp)) &&
      (pRole.includes("hr") || pRole.includes("admin") || pRole.includes("manager"))
    );
  }) || profiles.find((p) => {
    const pComp = (p.company || "").toLowerCase();
    return pComp.includes(norm) || norm.includes(pComp);
  });

  if (match) {
    return {
      name: match.name || "Company HR Admin",
      title: match.role || "HR Admin",
      email: match.email || "",
      company: match.company || companyName
    };
  }

  // Known entity assignments
  if (norm.includes("5a") || norm.includes("royal")) {
    return {
      name: "Ms. Quennie R. Capuyan",
      title: "HR Admin",
      email: "caquennie6@gmail.com",
      company: "5A Royal Gaming OPC"
    };
  }
  if (norm.includes("lucky") || norm.includes("betplay")) {
    return {
      name: "Remark Joy Gaviola",
      title: "Compliance & HR Officer",
      email: "remarkjoymark@gmail.com",
      company: "Lucky Betplay Corporation"
    };
  }
  if (norm.includes("simcon") || norm.includes("construction")) {
    return {
      name: "Engr. Site HR Lead",
      title: "Site HR Supervisor",
      email: "simcon.hr@simpalgroup.com",
      company: "Simpal Construction (SIMCON)"
    };
  }

  return {
    name: "Area HR Admin",
    title: "HR Administrator",
    email: "",
    company: companyName
  };
}

/**
 * Looks up the Central HRMD personnel assigned to Simpal Group of Companies (SGC - Receiver)
 */
export function lookupSgcCentralHr(profiles = []) {
  const sgcHr = profiles.find((p) => {
    const pComp = (p.company || "").toLowerCase();
    const pRole = (p.role || "").toLowerCase();
    return (
      (pComp.includes("simpal") || pComp.includes("sgc")) &&
      (pRole.includes("hr") || pRole.includes("admin") || pRole.includes("manager"))
    );
  }) || profiles.find((p) => {
    const pName = (p.name || "").toLowerCase();
    return pName.includes("hrmd") || pName.includes("jubay");
  });

  return {
    name: sgcHr?.name || "JEVINCE JAYE S. JUBAY, CHRP",
    title: sgcHr?.role || "HRMD Manager",
    email: sgcHr?.email || "admin@hrhub.com",
    company: "Simpal Group of Companies"
  };
}

// Clean initial reports: starts empty so user can experience live process
const DEFAULT_SEED_REPORTS = [];

// Helper: load local reports
function getLocalReports() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge old mock records
      const clean = parsed.filter((r) => r.id !== "IR-2026-09-001" && !r.isSample && !r.isMock);
      if (clean.length !== parsed.length) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    return [];
  } catch {
    return [];
  }
}

// Helper: save local reports
function saveLocalReports(reports) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reports));
  } catch (err) {
    console.warn("[incidentReportStorage] Local save warning:", err);
  }
}

/**
 * Fetch all incident reports (Dedicated Supabase table first, followed by Cloud user_settings backup)
 */
export async function fetchIncidentReports() {
  try {
    if (supabase) {
      // 1. Check dedicated Supabase table 'incident_reports'
      const { data: dedicatedData, error: dedicatedErr } = await supabase
        .from("incident_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (!dedicatedErr && Array.isArray(dedicatedData) && dedicatedData.length > 0) {
        const normalized = dedicatedData.map(normalizeIncidentReport);
        saveLocalReports(normalized);
        return normalized;
      }

      // 2. Guaranteed Cloud Fallback: Query 'user_settings' for master incident reports
      const { data: cloudBackup, error: backupErr } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", CLOUD_BACKUP_KEY)
        .maybeSingle();

      if (!backupErr && cloudBackup?.settings_json?.reports && Array.isArray(cloudBackup.settings_json.reports)) {
        const normalized = cloudBackup.settings_json.reports.map(normalizeIncidentReport);
        saveLocalReports(normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.debug("[incidentReportStorage] Cloud query notice:", err?.message);
  }

  return getLocalReports();
}

/**
 * Save or update an incident report with multi-destination persistence and live broadcast
 */
export async function saveIncidentReport(report) {
  const current = getLocalReports();
  const nowIso = new Date().toISOString();

  const findingsText =
    report.specificFindings ||
    report.specific_findings ||
    report.fullIncidentNarrative ||
    report.full_incident_narrative ||
    "";

  const updatedReport = {
    ...report,
    id: report.id || `IR-${Date.now().toString().slice(-6)}`,
    caseNumber: report.caseNumber || report.id || `IR-${Date.now().toString().slice(-6)}`,
    specificFindings: findingsText,
    specific_findings: findingsText,
    fullIncidentNarrative: findingsText,
    full_incident_narrative: findingsText,
    cashShortageAmount: report.cashShortageAmount || report.cash_shortage_amount || "",
    cash_shortage_amount: report.cashShortageAmount || report.cash_shortage_amount || "",
    incidentCauses:
      report.incidentCauses ||
      report.incident_causes ||
      "Non-observance of Cashier Standard Operating Procedures (SOPs), unauthorized credit extensions, and failure to reconcile daily cash float before shift closure.",
    incident_causes:
      report.incidentCauses ||
      report.incident_causes ||
      "Non-observance of Cashier Standard Operating Procedures (SOPs), unauthorized credit extensions, and failure to reconcile daily cash float before shift closure.",
    followUpRecommendations:
      report.followUpRecommendations ||
      report.follow_up_recommendations ||
      "Immediate transmittal to Simpal Group of Companies (SGC) Head Office HRMD for formal Notice to Explain (NTE) issuance under Article 297 Labor Code.",
    follow_up_recommendations:
      report.followUpRecommendations ||
      report.follow_up_recommendations ||
      "Immediate transmittal to Simpal Group of Companies (SGC) Head Office HRMD for formal Notice to Explain (NTE) issuance under Article 297 Labor Code.",
    additionalNotes: report.additionalNotes || report.additional_notes || "",
    additional_notes: report.additionalNotes || report.additional_notes || "",
    senderCompany: report.senderCompany || report.company || "5A Royal Gaming OPC",
    company: report.company || report.senderCompany || "5A Royal Gaming OPC",
    receiverCompany: report.receiverCompany || "Simpal Group of Companies",
    updatedAt: nowIso,
    createdAt: report.createdAt || nowIso
  };

  const existingIndex = current.findIndex((r) => r.id === updatedReport.id);
  let updatedList;
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = updatedReport;
  } else {
    updatedList = [updatedReport, ...current];
  }

  saveLocalReports(updatedList);

  // Broadcast instantly to all other open tabs on this browser
  if (liveBroadcastChannel) {
    try {
      liveBroadcastChannel.postMessage({
        reports: updatedList,
        action: "UPSERT",
        target: updatedReport
      });
    } catch (e) {
      // Ignore broadcast error
    }
  }

  // Cloud Persistence (both dedicated table & guaranteed user_settings backup)
  if (supabase) {
    // Destination A: Dedicated 'incident_reports' table
    try {
      await supabase.from("incident_reports").upsert({
        id: updatedReport.id,
        case_number: updatedReport.caseNumber,
        status: updatedReport.status,
        date_of_incident: updatedReport.dateOfIncident || null,
        date_reported: updatedReport.dateReported || null,
        reporting_hr_name: updatedReport.reportingHrName || updatedReport.senderHrName,
        reporting_hr_title: updatedReport.reportingHrTitle || updatedReport.senderHrTitle,
        employee_name: updatedReport.employeeName,
        employee_position: updatedReport.employeePosition,
        company: updatedReport.company || updatedReport.senderCompany,
        branch: updatedReport.branch,
        incident_category: updatedReport.incidentCategory,
        cash_shortage_amount: updatedReport.cashShortageAmount,
        specific_findings: findingsText,
        full_incident_narrative: findingsText,
        nte_subject: updatedReport.nteSubject,
        nte_body: updatedReport.nteBodyParagraph1,
        activity_log: updatedReport.activityLog,
        created_at: updatedReport.createdAt,
        updated_at: updatedReport.updatedAt
      });
    } catch (errA) {
      console.debug("[incidentReportStorage] Supabase table upsert notice:", errA?.message);
    }

    // Destination B: Guaranteed backup in 'user_settings'
    try {
      await supabase.from("user_settings").upsert({
        user_id: CLOUD_BACKUP_KEY,
        settings_json: {
          reports: updatedList,
          lastUpdated: nowIso
        },
        updated_at: nowIso
      }, { onConflict: "user_id" });
    } catch (errB) {
      console.debug("[incidentReportStorage] Supabase backup upsert notice:", errB?.message);
    }
  }

  return updatedReport;
}

/**
 * Delete an incident report
 */
export async function deleteIncidentReport(id) {
  const current = getLocalReports();
  const filtered = current.filter((r) => r.id !== id);
  saveLocalReports(filtered);

  if (liveBroadcastChannel) {
    liveBroadcastChannel.postMessage({ reports: filtered, action: "DELETE", targetId: id });
  }

  if (supabase) {
    try {
      await supabase.from("incident_reports").delete().eq("id", id);
    } catch (err) {
      console.debug("[incidentReportStorage] Supabase delete warning:", err?.message);
    }
    try {
      await supabase.from("user_settings").upsert({
        user_id: CLOUD_BACKUP_KEY,
        settings_json: {
          reports: filtered,
          lastUpdated: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    } catch (err) {
      // Ignore
    }
  }

  return filtered;
}

/**
 * Purge / clear all incident reports (reset to pure clean state)
 */
export async function clearAllIncidentReports() {
  saveLocalReports([]);

  if (liveBroadcastChannel) {
    liveBroadcastChannel.postMessage({ reports: [], action: "CLEAR" });
  }

  if (supabase) {
    try {
      await supabase.from("incident_reports").delete().neq("id", "keep_schema_intact");
    } catch (err) {
      console.debug("[incidentReportStorage] Supabase clear warning:", err?.message);
    }
    try {
      await supabase.from("user_settings").upsert({
        user_id: CLOUD_BACKUP_KEY,
        settings_json: {
          reports: [],
          lastUpdated: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" });
    } catch (err) {
      // Ignore
    }
  }

  return [];
}
