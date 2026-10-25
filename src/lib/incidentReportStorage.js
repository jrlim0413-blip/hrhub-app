import { supabase } from "./supabase";

const LOCAL_STORAGE_KEY = "hrhub_incident_reports_v1";

// Initial seed record matching the user's authentic official NTE document
const DEFAULT_SEED_REPORTS = [
  {
    id: "IR-2026-09-001",
    caseNumber: "IR-2026-09-001",
    status: "NTE_ISSUED", // Ready for Area HR to serve to employee
    
    // Incident Meta
    dateOfIncident: "2026-09-24",
    dateReported: "2026-09-28",
    reportingHrName: "Ms. Quennie R. Capuyan",
    reportingHrTitle: "HR Admin",
    reportingHrArea: "Tacurong City, Sultan Kudarat",
    
    // Subject Employee
    employeeName: "MA. CATHRINA PANIZARES",
    employeeId: "5ARG-2024-041",
    employeePosition: "Cashier",
    department: "Finance & Cashier Operations",
    phoneNumber: "+63 917 842 9102",
    company: "5A Royal Gaming OPC",
    branch: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
    companyAddress: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat, Philippines",
    companyEmail: "imsoroglohr@gmail.com",
    
    // Audit & Findings (Matches user's IR reference form)
    incidentTime: "16:30 PM",
    policeNotified: "NO",
    incidentCategory: "Cash Shortage & Non-observance of SOPs",
    auditDates: "September 24, 2026",
    auditedBy: "CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora",
    cashShortageAmount: "12,102.00",
    specificFindings: "Outstanding cash shortage of PHP 12,102.00 during audit; allowed Mr. Mosher Bebot to borrow PHP 1,000.00 from company cash; permitted advance fuel transactions for SPVR Joevert Sudsud (PHP 2,030.00) and Mr. Mosher Bebot (PHP 1,050.00) despite scheduled release; shortages under SPVR Armando (PHP 4,208.00) and other Sales Agents (PHP 934.00) remained uncleared.",
    fullIncidentNarrative: "During the official audit conducted on September 24, 2026 by CFO Admin Staff Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora, an unliquidated cash shortage was uncovered amounting to PHP 12,102.00 under Cashier Ma. Cathrina Panizares. Secondary ledger inspections also confirmed unauthorized employee cash borrowings and premature fuel advances contrary to Standard Operating Procedures.",
    incidentCauses: "Non-observance of Cashier Standard Operating Procedures (SOPs), unauthorized credit extensions, and failure to reconcile daily cash float before shift closure.",
    followUpRecommendations: "Immediate issuance of Notice to Explain (NTE) under Article 297 Labor Code, temporary suspension of vault disbursement authority, and comprehensive ledger audit.",
    additionalNotes: "All physical cash count discrepancy sheets and borrower signed slips have been submitted and attached to the audit file.",
    evidenceNotes: "Official Audit Count Sheet signed Sept 24, 2026; Daily Cashier Vault Reconciliation Logs; Branch fuel log slips.",
    
    // Central HR Routing & Official Receipt
    reportReceivedBy: "JEVINCE JAYE S. JUBAY, CHRP",
    reportReceivedDate: "September 28, 2026",
    assignedCentralHrName: "JEVINCE JAYE S. JUBAY, CHRP",
    assignedCentralHrTitle: "HRMD Manager",
    assignedCentralHrCompany: "5A Royal Gaming OPC",
    forwardedAt: "2026-09-28T08:30:00.000Z",
    
    // NTE Document Details (Matches official format)
    nteSubject: "Notice to Explain",
    nteDate: "September 28, 2026",
    nteBodyParagraph1: "According to the incident report submitted by the HR Admin, Ms. Quennie R. Capuyan dated September 28, 2026, it was found that you have an outstanding cash shortage of PHP 12,102.00 during the audit conducted on September 24, 2026, by the CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora.",
    nteBodyParagraph2: "It was also noted that you allowed Mr. Mosher Bebot to borrow PHP 1,000.00 from the company cash and permitted advance fuel transactions for SPVR Joevert Sudsud (PHP 2,030.00) and Mr. Mosher Bebot (PHP 1,050.00) despite the scheduled release of fuel allowances. Furthermore, it was also found that there was a shortage under the name of SPVR Armando amounting to PHP 4,208.00 and other Sales Agents shortages totaling PHP 934.00 that remained uncleared and were not immediately addressed at the time of the audit.",
    nteBodyParagraph3: "These circumstances raise serious concerns regarding your cash handling, accountability, and compliance with Company SOPs. As the assigned Cashier, you are expected to strictly control company funds, follow established procedures, and promptly address shortages and irregular transactions. Failure to do so may compromise the Company's financial controls and accountability.",
    nteDueProcessClause: "In line with due process, you are hereby requested to submit a written explanation within one (1) working day upon receipt of this memo. Given the above allegation, why you should not discipline and find liable for the following alleged violations of the Employees Code of Conduct.",
    codeOfConductSection: "Section 18. Offenses Related to Job Performance and Productivity.\n(a) Non-observance of Standard Operating Procedures. Willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense.",
    laborCodeViolation: "The above-alleged offense also violates Article 297 of the Labor Code of the Philippines, particularly, serious misconduct, willful disobedience, gross and habitual neglect of duties, fraud or breach of trust, commission of a crime, and analogous cases.",
    nteConclusion: "Therefore, failure on your part to submit a written explanation shall be considered an admission of the foregoing allegation.\n\nFor your strict Compliance.",
    nteSignatoryName: "JEVINCE JAYE S. JUBAY, CHRP",
    nteSignatoryTitle: "HRMD Manager",
    nteSignatoryCompany: "5A Royal Gaming OPC",
    nteFooterNote: "HR 201 File & Records 2026",
    nteIssuedAt: "2026-09-28T10:15:00.000Z",
    
    // Status tracking & audit logs
    servedAt: null,
    servedBy: null,
    explanationReceivedAt: null,
    explanationText: "",
    activityLog: [
      {
        id: "act-1",
        timestamp: "2026-09-28T08:30:00.000Z",
        action: "IR_SUBMITTED",
        actor: "Ms. Quennie R. Capuyan (HR Admin)",
        message: "Submitted Incident Report IR-2026-09-001 regarding cash shortage to Central HRMD."
      },
      {
        id: "act-2",
        timestamp: "2026-09-28T10:15:00.000Z",
        action: "NTE_GENERATED_AND_RETURNED",
        actor: "JEVINCE JAYE S. JUBAY, CHRP (HRMD Manager)",
        message: "Generated official Notice to Explain citing Section 18 SOP violation & Article 297. Returned to Area HR for serving."
      }
    ],
    createdAt: "2026-09-28T08:30:00.000Z",
    updatedAt: "2026-09-28T10:15:00.000Z"
  }
];

// Helper: load local reports
function getLocalReports() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SEED_REPORTS));
      return DEFAULT_SEED_REPORTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SEED_REPORTS;
  } catch {
    return DEFAULT_SEED_REPORTS;
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
 * Fetch all incident reports (Supabase first, fallback to LocalStorage)
 */
export async function fetchIncidentReports() {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from("incident_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        // Normalize fields if needed
        const normalized = data.map((d) => ({
          ...d,
          caseNumber: d.case_number || d.caseNumber || d.id,
          dateOfIncident: d.date_of_incident || d.dateOfIncident,
          dateReported: d.date_reported || d.dateReported,
          reportingHrName: d.reporting_hr_name || d.reportingHrName,
          reportingHrTitle: d.reporting_hr_title || d.reportingHrTitle,
          employeeName: d.employee_name || d.employeeName,
          employeePosition: d.employee_position || d.employeePosition,
          activityLog: Array.isArray(d.activity_log) ? d.activity_log : (d.activityLog || [])
        }));
        saveLocalReports(normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.debug("[incidentReportStorage] Supabase query fallback to local:", err?.message);
  }

  return getLocalReports();
}

/**
 * Save or update an incident report
 */
export async function saveIncidentReport(report) {
  const current = getLocalReports();
  const nowIso = new Date().toISOString();
  
  const updatedReport = {
    ...report,
    id: report.id || `IR-${Date.now().toString().slice(-6)}`,
    caseNumber: report.caseNumber || report.id || `IR-${Date.now().toString().slice(-6)}`,
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

  // Attempt sync with Supabase (non-blocking)
  try {
    if (supabase) {
      await supabase.from("incident_reports").upsert({
        id: updatedReport.id,
        case_number: updatedReport.caseNumber,
        status: updatedReport.status,
        date_of_incident: updatedReport.dateOfIncident,
        date_reported: updatedReport.dateReported,
        reporting_hr_name: updatedReport.reportingHrName,
        reporting_hr_title: updatedReport.reportingHrTitle,
        employee_name: updatedReport.employeeName,
        employee_position: updatedReport.employeePosition,
        company: updatedReport.company,
        branch: updatedReport.branch,
        incident_category: updatedReport.incidentCategory,
        cash_shortage_amount: updatedReport.cashShortageAmount,
        specific_findings: updatedReport.specificFindings,
        full_incident_narrative: updatedReport.fullIncidentNarrative,
        nte_subject: updatedReport.nteSubject,
        nte_body: updatedReport.nteBodyParagraph1,
        activity_log: updatedReport.activityLog,
        created_at: updatedReport.createdAt,
        updated_at: updatedReport.updatedAt
      });
    }
  } catch (err) {
    console.debug("[incidentReportStorage] Supabase upsert failed silently:", err?.message);
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

  try {
    if (supabase) {
      await supabase.from("incident_reports").delete().eq("id", id);
    }
  } catch (err) {
    console.debug("[incidentReportStorage] Supabase delete warning:", err?.message);
  }

  return filtered;
}
