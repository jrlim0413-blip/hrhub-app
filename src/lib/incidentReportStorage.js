import { supabase } from "./supabase";

const LOCAL_STORAGE_KEY = "hrhub_incident_reports_v1";

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

  // Sensible defaults based on known entity assignments
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
      // Purge old mock records (like IR-2026-09-001)
      const clean = parsed.filter((r) => r.id !== "IR-2026-09-001");
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
          senderCompany: d.sender_company || d.senderCompany || d.company,
          senderHrName: d.sender_hr_name || d.senderHrName || d.reporting_hr_name,
          receiverCompany: d.receiver_company || d.receiverCompany || "Simpal Group of Companies",
          receiverHrName: d.receiver_hr_name || d.receiverHrName || "JEVINCE JAYE S. JUBAY, CHRP",
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
    senderCompany: report.senderCompany || report.company || "5A Royal Gaming OPC",
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

  // Attempt sync with Supabase (non-blocking)
  try {
    if (supabase) {
      await supabase.from("incident_reports").upsert({
        id: updatedReport.id,
        case_number: updatedReport.caseNumber,
        status: updatedReport.status,
        date_of_incident: updatedReport.dateOfIncident,
        date_reported: updatedReport.dateReported,
        reporting_hr_name: updatedReport.reportingHrName || updatedReport.senderHrName,
        reporting_hr_title: updatedReport.reportingHrTitle || updatedReport.senderHrTitle,
        employee_name: updatedReport.employeeName,
        employee_position: updatedReport.employeePosition,
        company: updatedReport.company || updatedReport.senderCompany,
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

/**
 * Purge / clear all incident reports (reset to pure clean state)
 */
export async function clearAllIncidentReports() {
  saveLocalReports([]);
  try {
    if (supabase) {
      await supabase.from("incident_reports").delete().neq("id", "keep_schema_intact");
    }
  } catch (err) {
    console.debug("[incidentReportStorage] Supabase clear warning:", err?.message);
  }
  return [];
}
