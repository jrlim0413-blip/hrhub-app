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
  // Extract system metadata entry stored inside JSONB activity_log
  const rawLogs = Array.isArray(d.activity_log)
    ? d.activity_log
    : Array.isArray(d.activityLog)
    ? d.activityLog
    : [];
  const metaFromLog =
    rawLogs.find((item) => item?.isSystemMetadata || item?.type === "HRHUB_REPORT_METADATA")?.metadata || {};

  const department =
    d.department ||
    d.department_name ||
    metaFromLog.department ||
    metaFromLog.department_name ||
    "Finance & Cashier Operations";

  const phoneNumber =
    d.phoneNumber ||
    d.phone_number ||
    metaFromLog.phoneNumber ||
    metaFromLog.phone_number ||
    "+63 917 842 9102";

  const employeePosition =
    d.employee_position ||
    d.employeePosition ||
    metaFromLog.employeePosition ||
    metaFromLog.employee_position ||
    "Cashier";

  const branch =
    d.branch ||
    d.branchLocation ||
    d.branch_location ||
    metaFromLog.branch ||
    "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat";

  const auditDates = d.auditDates || d.audit_dates || metaFromLog.auditDates || "";
  const auditedBy = d.auditedBy || d.audited_by || metaFromLog.auditedBy || "CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora";

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

  // Filter out system metadata from user-facing activity logs
  const displayLogs = rawLogs.filter(
    (item) => !item?.isSystemMetadata && item?.type !== "HRHUB_REPORT_METADATA"
  );

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
    employeePosition,
    employee_position: employeePosition,
    dateOfIncident: d.date_of_incident || d.dateOfIncident || "",
    date_of_incident: d.date_of_incident || d.dateOfIncident || "",
    dateReported: d.date_reported || d.dateReported || "",
    date_reported: d.date_reported || d.dateReported || "",
    branch,
    branchLocation: branch,
    branch_location: branch,
    department,
    phoneNumber,
    phone_number: phoneNumber,
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
    activityLog: displayLogs,

    respondentSignature: d.respondentSignature || d.respondent_signature || metaFromLog.respondentSignature || "",
    respondentSignedAt: d.respondentSignedAt || d.respondent_signed_at || metaFromLog.respondentSignedAt || "",
    respondentSignedName: d.respondentSignedName || d.respondent_signed_name || metaFromLog.respondentSignedName || d.employee_name || d.employeeName || "",
    respondentRemarks: d.respondentRemarks || d.respondent_remarks || metaFromLog.respondentRemarks || "",
    employeeEmail: d.employeeEmail || d.employee_email || metaFromLog.employeeEmail || "",

    // 1. Preparer & Operations Manager Signatures
    preparerSignature: d.preparerSignature || d.preparer_signature || metaFromLog.preparerSignature || "",
    preparerName: d.preparerName || d.preparer_name || metaFromLog.preparerName || senderHrName,
    preparerTitle: d.preparerTitle || d.preparer_title || metaFromLog.preparerTitle || senderHrTitle,
    operationsManagerSignature: d.operationsManagerSignature || d.operations_manager_signature || metaFromLog.operationsManagerSignature || "",
    operationsManagerName: d.operationsManagerName || d.operations_manager_name || metaFromLog.operationsManagerName || "Operations Manager",
    operationsManagerTitle: d.operationsManagerTitle || d.operations_manager_title || metaFromLog.operationsManagerTitle || "Operations Manager",

    // 2. Head Office Discretion 1: Filings Only
    filingRemarks: d.filingRemarks || d.filing_remarks || metaFromLog.filingRemarks || "",
    filedAt: d.filedAt || d.filed_at || metaFromLog.filedAt || "",

    // 3. Branch HR Upload Signed NTE Proof
    nteSignedProof: d.nteSignedProof || d.nte_signed_proof || metaFromLog.nteSignedProof || "",
    nteSignedProofName: d.nteSignedProofName || d.nte_signed_proof_name || metaFromLog.nteSignedProofName || "",
    nteServedAt: d.nteServedAt || d.nte_served_at || metaFromLog.nteServedAt || "",

    // 4. Head Office Discretion 2A: Warning Notice
    warningNoticeSubject: d.warningNoticeSubject || d.warning_notice_subject || metaFromLog.warningNoticeSubject || "",
    warningNoticePenalty: d.warningNoticePenalty || d.warning_notice_penalty || metaFromLog.warningNoticePenalty || "",
    warningNoticeBody: d.warningNoticeBody || d.warning_notice_body || metaFromLog.warningNoticeBody || "",
    warningIssuedAt: d.warningIssuedAt || d.warning_issued_at || metaFromLog.warningIssuedAt || "",

    // 5. Head Office Discretion 2B: NOI & Zoom Hearing Schedule
    zoomMeetingTopic: d.zoomMeetingTopic || d.zoom_meeting_topic || metaFromLog.zoomMeetingTopic || "",
    zoomMeetingDate: d.zoomMeetingDate || d.zoom_meeting_date || metaFromLog.zoomMeetingDate || "",
    zoomMeetingTime: d.zoomMeetingTime || d.zoom_meeting_time || metaFromLog.zoomMeetingTime || "",
    zoomMeetingLink: d.zoomMeetingLink || d.zoom_meeting_link || metaFromLog.zoomMeetingLink || "",
    zoomMeetingId: d.zoomMeetingId || d.zoom_meeting_id || metaFromLog.zoomMeetingId || "",
    zoomPasscode: d.zoomPasscode || d.zoom_passcode || metaFromLog.zoomPasscode || "",
    hearingCommittee: d.hearingCommittee || d.hearing_committee || metaFromLog.hearingCommittee || "",
    noiRemarks: d.noiRemarks || d.noi_remarks || metaFromLog.noiRemarks || "",
    noiIssuedAt: d.noiIssuedAt || d.noi_issued_at || metaFromLog.noiIssuedAt || "",

    // 6. Decision on Administrative Case
    adminDecisionSubject: d.adminDecisionSubject || d.admin_decision_subject || metaFromLog.adminDecisionSubject || "",
    adminDecisionFindings: d.adminDecisionFindings || d.admin_decision_findings || metaFromLog.adminDecisionFindings || "",
    adminDecisionPenalty: d.adminDecisionPenalty || d.admin_decision_penalty || metaFromLog.adminDecisionPenalty || "",
    adminDecisionBody: d.adminDecisionBody || d.admin_decision_body || metaFromLog.adminDecisionBody || "",
    adminDecisionIssuedAt: d.adminDecisionIssuedAt || d.admin_decision_issued_at || metaFromLog.adminDecisionIssuedAt || "",

    // 7. Signed Decision Proof & Case Closure
    decisionSignedProof: d.decisionSignedProof || d.decision_signed_proof || metaFromLog.decisionSignedProof || "",
    decisionSignedProofName: d.decisionSignedProofName || d.decision_signed_proof_name || metaFromLog.decisionSignedProofName || "",
    decisionSignedAt: d.decisionSignedAt || d.decision_signed_at || metaFromLog.decisionSignedAt || ""
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

      // If dedicated table query succeeded without error, it is our Single Source of Truth!
      // If the user deleted all rows, dedicatedData is [] (length === 0), which we must strictly respect!
      if (!dedicatedErr && Array.isArray(dedicatedData)) {
        // Also load cloud user_settings backup to cross-merge fields
        let cloudMap = {};
        try {
          const { data: cloudBackup } = await supabase
            .from("user_settings")
            .select("settings_json")
            .eq("user_id", CLOUD_BACKUP_KEY)
            .maybeSingle();
          if (cloudBackup?.settings_json?.reports && Array.isArray(cloudBackup.settings_json.reports)) {
            cloudBackup.settings_json.reports.forEach((item) => {
              if (item && (item.id || item.caseNumber)) {
                cloudMap[item.id || item.caseNumber] = item;
              }
            });
          }
        } catch {
          // ignore
        }

        const normalized = dedicatedData.map((row) => {
          const cloudItem = cloudMap[row.id] || cloudMap[row.case_number] || {};
          return normalizeIncidentReport({ ...cloudItem, ...row });
        });
        saveLocalReports(normalized);

        // Also keep cloud backup in user_settings in sync
        try {
          await supabase.from("user_settings").upsert(
            {
              user_id: CLOUD_BACKUP_KEY,
              settings_json: {
                reports: normalized,
                lastUpdated: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            },
            { onConflict: "user_id" }
          );
        } catch {
          // Ignore
        }

        return normalized;
      }

      // 2. Only if the dedicated table had a query ERROR (e.g., table does not exist yet or schema mismatch),
      // fallback to user_settings backup
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
    department: report.department || report.department_name || "Finance & Cashier Operations",
    department_name: report.department || report.department_name || "Finance & Cashier Operations",
    phoneNumber: report.phoneNumber || report.phone_number || "+63 917 842 9102",
    phone_number: report.phoneNumber || report.phone_number || "+63 917 842 9102",
    employeePosition: report.employeePosition || report.employee_position || "Cashier",
    employee_position: report.employeePosition || report.employee_position || "Cashier",
    branch: report.branch || report.branchLocation || "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
    branchLocation: report.branch || report.branchLocation || "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
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
    senderHrName: report.senderHrName || report.reportingHrName || "Branch HR",
    senderHrTitle: report.senderHrTitle || report.reportingHrTitle || "HR Admin",
    receiverHrName: report.receiverHrName || "JEVINCE JAYE S. JUBAY, CHRP",
    receiverHrTitle: report.receiverHrTitle || "HRMD Manager",
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
    // Pack all extended metadata into a dedicated system log item stored in JSONB activity_log
    const metaEntry = {
      isSystemMetadata: true,
      type: "HRHUB_REPORT_METADATA",
      metadata: {
        department: updatedReport.department || "Finance & Cashier Operations",
        phoneNumber: updatedReport.phoneNumber || "+63 917 842 9102",
        employeePosition: updatedReport.employeePosition || "Cashier",
        branch: updatedReport.branch || "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
        senderCompany: updatedReport.senderCompany || "5A Royal Gaming OPC",
        receiverCompany: updatedReport.receiverCompany || "Simpal Group of Companies",
        senderHrName: updatedReport.senderHrName,
        senderHrTitle: updatedReport.senderHrTitle,
        receiverHrName: updatedReport.receiverHrName,
        receiverHrTitle: updatedReport.receiverHrTitle,
        auditDates: updatedReport.auditDates,
        auditedBy: updatedReport.auditedBy,
        preparerSignature: updatedReport.preparerSignature,
        preparerName: updatedReport.preparerName,
        preparerTitle: updatedReport.preparerTitle,
        operationsManagerSignature: updatedReport.operationsManagerSignature,
        operationsManagerName: updatedReport.operationsManagerName,
        operationsManagerTitle: updatedReport.operationsManagerTitle,
        respondentSignature: updatedReport.respondentSignature,
        respondentSignedAt: updatedReport.respondentSignedAt,
        respondentSignedName: updatedReport.respondentSignedName,
        respondentRemarks: updatedReport.respondentRemarks,
        employeeEmail: updatedReport.employeeEmail,
        filingRemarks: updatedReport.filingRemarks,
        filedAt: updatedReport.filedAt,
        nteSignedProof: updatedReport.nteSignedProof,
        nteSignedProofName: updatedReport.nteSignedProofName,
        nteServedAt: updatedReport.nteServedAt,
        warningNoticeSubject: updatedReport.warningNoticeSubject,
        warningNoticePenalty: updatedReport.warningNoticePenalty,
        warningNoticeBody: updatedReport.warningNoticeBody,
        warningIssuedAt: updatedReport.warningIssuedAt,
        zoomMeetingTopic: updatedReport.zoomMeetingTopic,
        zoomMeetingDate: updatedReport.zoomMeetingDate,
        zoomMeetingTime: updatedReport.zoomMeetingTime,
        zoomMeetingLink: updatedReport.zoomMeetingLink,
        zoomMeetingId: updatedReport.zoomMeetingId,
        zoomPasscode: updatedReport.zoomPasscode,
        hearingCommittee: updatedReport.hearingCommittee,
        noiRemarks: updatedReport.noiRemarks,
        noiIssuedAt: updatedReport.noiIssuedAt,
        adminDecisionSubject: updatedReport.adminDecisionSubject,
        adminDecisionFindings: updatedReport.adminDecisionFindings,
        adminDecisionPenalty: updatedReport.adminDecisionPenalty,
        adminDecisionBody: updatedReport.adminDecisionBody,
        adminDecisionIssuedAt: updatedReport.adminDecisionIssuedAt,
        decisionSignedProof: updatedReport.decisionSignedProof,
        decisionSignedProofName: updatedReport.decisionSignedProofName,
        decisionSignedAt: updatedReport.decisionSignedAt
      }
    };

    const cleanLogs = (Array.isArray(updatedReport.activityLog) ? updatedReport.activityLog : []).filter(
      (item) => !item?.isSystemMetadata && item?.type !== "HRHUB_REPORT_METADATA"
    );
    const dbActivityLog = [metaEntry, ...cleanLogs];

    // Destination A: Dedicated 'incident_reports' table with all native columns
    try {
      await supabase.from("incident_reports").upsert({
        id: updatedReport.id,
        case_number: updatedReport.caseNumber,
        status: updatedReport.status,
        date_of_incident: updatedReport.dateOfIncident || null,
        date_reported: updatedReport.dateReported || null,
        reporting_hr_name: updatedReport.reportingHrName || updatedReport.senderHrName,
        reporting_hr_title: updatedReport.reportingHrTitle || updatedReport.senderHrTitle,
        receiver_hr_name: updatedReport.receiverHrName || "JEVINCE JAYE S. JUBAY, CHRP",
        receiver_hr_title: updatedReport.receiverHrTitle || "HRMD Manager",
        employee_name: updatedReport.employeeName,
        employee_position: updatedReport.employeePosition || "Cashier",
        company: updatedReport.company || updatedReport.senderCompany || "5A Royal Gaming OPC",
        sender_company: updatedReport.senderCompany || updatedReport.company || "5A Royal Gaming OPC",
        receiver_company: updatedReport.receiverCompany || "Simpal Group of Companies",
        branch: updatedReport.branch || "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
        incident_category: updatedReport.incidentCategory,
        cash_shortage_amount: updatedReport.cashShortageAmount,
        specific_findings: findingsText,
        full_incident_narrative: findingsText,
        nte_subject: updatedReport.nteSubject,
        nte_body: updatedReport.nteBodyParagraph1,
        activity_log: dbActivityLog,
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
