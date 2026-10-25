import { useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  FileText,
  Send,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Building2,
  Calendar,
  Volume2,
  VolumeX,
  Printer,
  X,
  ArrowRight,
  Eye,
  FileCheck,
  Check,
  Smartphone,
  MapPin,
  CreditCard,
  DollarSign,
  Briefcase,
  Layers
} from "lucide-react";
import {
  fetchIncidentReports,
  saveIncidentReport,
  deleteIncidentReport,
  lookupAssignedHrForCompany,
  lookupSgcCentralHr
} from "../lib/incidentReportStorage";
import {
  playAiVoiceAnnouncement,
  stopVoiceAnnouncement,
  isVoiceMuted,
  setVoiceMuted
} from "../lib/voiceAnnouncer";

// Standard Philippine Legal & Company Due Process Constants
const DEFAULT_COMPANY_ADDRESS =
  "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat, Philippines";
const DEFAULT_COMPANY_EMAIL = "imsoroglohr@gmail.com";

const SUBSIDIARY_OPTIONS = [
  "5A Royal Gaming OPC",
  "Lucky Betplay Corporation",
  "Simpal Construction (SIMCON)",
  "Imperial Gaming OPC",
  "Glowing Fortune",
  "Simpal Group of Companies"
];

export default function IncidentReportPanel({
  currentUser,
  profiles = [],
  onClose,
  onOpenAiBuddy
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, PENDING_SGC_REVIEW, NTE_RETURNED, SERVED, RESOLVED
  const [portalView, setPortalView] = useState("ALL"); // ALL, SUBSIDIARY_PORTAL, SGC_CENTRAL_PORTAL
  const [searchQuery, setSearchQuery] = useState("");
  const [voiceMutedState, setVoiceMutedState] = useState(isVoiceMuted());

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isIrViewerOpen, setIsIrViewerOpen] = useState(false);
  const [isNteViewerOpen, setIsNteViewerOpen] = useState(false);
  const [isNteDraftModalOpen, setIsNteDraftModalOpen] = useState(false);
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Form states for creating a new Incident Report (Subsidiary HR -> SGC HRMD)
  const initialCompany = currentUser?.company || "5A Royal Gaming OPC";
  const initialSenderHr = lookupAssignedHrForCompany(initialCompany, profiles);
  const initialSgcHr = lookupSgcCentralHr(profiles);

  const [irForm, setIrForm] = useState({
    // SENDER: Subsidiary Company & HR
    senderCompany: initialCompany,
    company: initialCompany,
    reportingHrName: initialSenderHr.name,
    reportingHrTitle: initialSenderHr.title,
    reportingHrEmail: initialSenderHr.email,
    
    // RECEIVER: Simpal Group of Companies (SGC HRMD)
    receiverCompany: "Simpal Group of Companies",
    assignedCentralHrName: initialSgcHr.name,
    assignedCentralHrTitle: initialSgcHr.title,
    assignedCentralHrCompany: "Simpal Group of Companies",
    reportReceivedBy: `${initialSgcHr.name} (${initialSgcHr.title} - SGC)`,
    reportReceivedDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),

    // Subject Employee
    employeeName: "",
    employeeId: "",
    employeePosition: "Cashier",
    department: "Finance & Cashier Operations",
    phoneNumber: "+63 917 842 9102",
    branch: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
    
    // Incident Details
    dateOfIncident: new Date().toISOString().slice(0, 10),
    dateReported: new Date().toISOString().slice(0, 10),
    incidentTime: "16:30 PM",
    policeNotified: "NO",
    incidentCategory: "Cash Shortage & Non-observance of SOPs",
    auditDates: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    auditedBy: "CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora",
    cashShortageAmount: "",
    specificFindings: "",
    fullIncidentNarrative: "",
    incidentCauses: "Non-observance of Cashier Standard Operating Procedures (SOPs), unauthorized credit extensions, and failure to reconcile daily cash float before shift closure.",
    followUpRecommendations: "Immediate transmittal to Simpal Group of Companies (SGC) HRMD for formal Notice to Explain (NTE) issuance under Article 297 Labor Code.",
    additionalNotes: "All physical cash count discrepancy sheets and borrower signed slips have been submitted and attached to the audit file.",
    evidenceNotes: ""
  });

  // When Originating Subsidiary Company changes, dynamically lookup the assigned HR from Employee Directory
  const handleCompanyChange = (newCompany) => {
    const assigned = lookupAssignedHrForCompany(newCompany, profiles);
    const sgcHr = lookupSgcCentralHr(profiles);

    setIrForm((prev) => ({
      ...prev,
      company: newCompany,
      senderCompany: newCompany,
      reportingHrName: assigned.name,
      reportingHrTitle: assigned.title,
      reportingHrEmail: assigned.email,
      assignedCentralHrName: sgcHr.name,
      assignedCentralHrTitle: sgcHr.title,
      reportReceivedBy: `${sgcHr.name} (${sgcHr.title} - SGC)`
    }));
  };

  // Load records
  const loadRecords = async () => {
    setLoading(true);
    const data = await fetchIncidentReports();
    setReports(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, []);

  // Voice toggle handler
  const handleToggleVoice = () => {
    const nextState = !voiceMutedState;
    setVoiceMuted(nextState);
    setVoiceMutedState(nextState);
    if (!nextState) {
      playAiVoiceAnnouncement("Voice notifications enabled for Incident Reports and Notice to Explain workflow.");
    } else {
      stopVoiceAnnouncement();
    }
  };

  // Filtered reports by status, portal perspective, and search
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Perspective filter: Subsidiary HR vs SGC Central HRMD
      if (portalView === "SUBSIDIARY_PORTAL") {
        // Show reports belonging to subsidiary issuer
        if (currentUser?.company && currentUser.company !== "Simpal Group of Companies") {
          const matchComp = (item.senderCompany || item.company || "").toLowerCase();
          if (!matchComp.includes(currentUser.company.toLowerCase())) return false;
        }
      } else if (portalView === "SGC_CENTRAL_PORTAL") {
        // Show reports received by Simpal Group of Companies
        const matchRecv = (item.receiverCompany || "Simpal Group of Companies").toLowerCase();
        if (!matchRecv.includes("simpal")) return false;
      }

      // Filter status
      if (activeFilter === "PENDING_SGC_REVIEW" && item.status !== "SUBMITTED_TO_CENTRAL_HR") return false;
      if (activeFilter === "NTE_RETURNED" && item.status !== "NTE_ISSUED") return false;
      if (activeFilter === "SERVED" && item.status !== "SERVED_TO_EMPLOYEE") return false;
      if (activeFilter === "RESOLVED" && item.status !== "CASE_RESOLVED" && item.status !== "EXPLANATION_RECEIVED") return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEmp = item.employeeName?.toLowerCase().includes(q);
        const matchCase = item.caseNumber?.toLowerCase().includes(q);
        const matchCategory = item.incidentCategory?.toLowerCase().includes(q);
        const matchSender = (item.senderCompany || item.company)?.toLowerCase().includes(q);
        const matchSenderHr = (item.senderHrName || item.reportingHrName)?.toLowerCase().includes(q);
        if (!matchEmp && !matchCase && !matchCategory && !matchSender && !matchSenderHr) return false;
      }
      return true;
    });
  }, [reports, activeFilter, portalView, searchQuery, currentUser]);

  // Open Create IR Modal
  const handleOpenCreateModal = () => {
    const targetComp = currentUser?.company || "5A Royal Gaming OPC";
    const assigned = lookupAssignedHrForCompany(targetComp, profiles);
    const sgcHr = lookupSgcCentralHr(profiles);

    setIrForm({
      senderCompany: targetComp,
      company: targetComp,
      reportingHrName: assigned.name,
      reportingHrTitle: assigned.title,
      reportingHrEmail: assigned.email,
      receiverCompany: "Simpal Group of Companies",
      assignedCentralHrName: sgcHr.name,
      assignedCentralHrTitle: sgcHr.title,
      assignedCentralHrCompany: "Simpal Group of Companies",
      reportReceivedBy: `${sgcHr.name} (${sgcHr.title} - SGC)`,
      reportReceivedDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      employeeName: "",
      employeeId: "",
      employeePosition: "Cashier",
      department: "Finance & Cashier Operations",
      phoneNumber: "+63 917 842 9102",
      branch: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
      dateOfIncident: new Date().toISOString().slice(0, 10),
      dateReported: new Date().toISOString().slice(0, 10),
      incidentTime: "16:30 PM",
      policeNotified: "NO",
      incidentCategory: "Cash Shortage & Non-observance of SOPs",
      auditDates: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      auditedBy: "CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora",
      cashShortageAmount: "",
      specificFindings: "",
      fullIncidentNarrative: "",
      incidentCauses: "Non-observance of Cashier Standard Operating Procedures (SOPs), unauthorized credit extensions, and failure to reconcile daily cash float before shift closure.",
      followUpRecommendations: "Immediate transmittal to Simpal Group of Companies (SGC) HRMD for formal Notice to Explain (NTE) issuance under Article 297 Labor Code.",
      additionalNotes: "All physical cash count discrepancy sheets and borrower signed slips have been submitted and attached to the audit file.",
      evidenceNotes: ""
    });
    setIsCreateModalOpen(true);
  };

  // Submit IR from Subsidiary Company HR -> Simpal Group of Companies (SGC HRMD)
  const handleSubmitIrToCentralHr = async (e) => {
    e.preventDefault();
    if (!irForm.employeeName.trim()) {
      alert("Please provide the Employee Name.");
      return;
    }

    const caseId = `IR-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(Math.floor(100 + Math.random() * 900))}`;
    const dateFormatted = new Date(irForm.dateReported).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const newReport = {
      id: caseId,
      caseNumber: caseId,
      status: "SUBMITTED_TO_CENTRAL_HR", // Forwarded to Simpal Group of Companies (SGC)
      ...irForm,
      senderCompany: irForm.company,
      senderHrName: irForm.reportingHrName,
      senderHrTitle: irForm.reportingHrTitle,
      receiverCompany: "Simpal Group of Companies",
      receiverHrName: irForm.assignedCentralHrName,
      receiverHrTitle: irForm.assignedCentralHrTitle,
      companyAddress: DEFAULT_COMPANY_ADDRESS,
      companyEmail: DEFAULT_COMPANY_EMAIL,
      forwardedAt: new Date().toISOString(),

      // Pre-seed template NTE paragraphs ready for SGC HRMD to review & approve
      nteSubject: "Notice to Explain",
      nteDate: dateFormatted,
      nteBodyParagraph1: `According to the incident report submitted by the ${irForm.reportingHrTitle}, ${irForm.reportingHrName} of ${irForm.company} dated ${dateFormatted}, it was found that you have an outstanding cash shortage of PHP ${irForm.cashShortageAmount || "0.00"} during the audit conducted on ${irForm.auditDates}, by the ${irForm.auditedBy}.`,
      nteBodyParagraph2: irForm.specificFindings || "It was also noted that certain unauthorized advance transactions and shortages remained uncleared and were not immediately addressed at the time of the audit.",
      nteBodyParagraph3: `These circumstances raise serious concerns regarding your cash handling, accountability, and compliance with Company SOPs. As the assigned ${irForm.employeePosition}, you are expected to strictly control company funds, follow established procedures, and promptly address shortages and irregular transactions. Failure to do so may compromise the Company's financial controls and accountability.`,
      nteDueProcessClause: "In line with due process, you are hereby requested to submit a written explanation within one (1) working day upon receipt of this memo. Given the above allegation, why you should not discipline and find liable for the following alleged violations of the Employees Code of Conduct.",
      codeOfConductSection: "Section 18. Offenses Related to Job Performance and Productivity.\n(a) Non-observance of Standard Operating Procedures. Willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense.",
      laborCodeViolation: "The above-alleged offense also violates Article 297 of the Labor Code of the Philippines, particularly, serious misconduct, willful disobedience, gross and habitual neglect of duties, fraud or breach of trust, commission of a crime, and analogous cases.",
      nteConclusion: "Therefore, failure on your part to submit a written explanation shall be considered an admission of the foregoing allegation.\n\nFor your strict Compliance.",
      nteSignatoryName: irForm.assignedCentralHrName,
      nteSignatoryTitle: irForm.assignedCentralHrTitle,
      nteSignatoryCompany: irForm.company,
      nteFooterNote: `HR 201 File & Records ${new Date().getFullYear()}`,

      activityLog: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "IR_TRANSMITTED_TO_SGC",
          actor: `${irForm.reportingHrName} (${irForm.company} HR)`,
          message: `Transmitted Incident Report ${caseId} for ${irForm.employeeName} to Simpal Group of Companies (SGC HRMD) for Notice to Explain issuance.`
        }
      ]
    };

    await saveIncidentReport(newReport);
    await loadRecords();
    setIsCreateModalOpen(false);

    // AI Buddy Voice Announcement
    const announcement = `Attention Simpal Group of Companies HRMD! A new Incident Report has been transmitted from ${irForm.company} by HR Admin ${irForm.reportingHrName} for employee ${irForm.employeeName}. Forwarded to SGC for Notice to Explain evaluation.`;
    playAiVoiceAnnouncement(announcement);
  };

  // Simpal Group of Companies (SGC HRMD) Evaluates & Issues NTE (Returns to Originating Company)
  const handleOpenDraftNte = (report) => {
    setSelectedReport(report);
    setIsNteDraftModalOpen(true);
  };

  const handleSaveAndReturnNte = async (updatedDraft) => {
    const senderCompany = selectedReport.senderCompany || selectedReport.company || "5A Royal Gaming OPC";
    const senderHrName = selectedReport.senderHrName || selectedReport.reportingHrName || "Area HR Admin";

    const updated = {
      ...selectedReport,
      ...updatedDraft,
      status: "NTE_ISSUED", // NTE Approved by SGC and returned to originating Company HR
      nteIssuedAt: new Date().toISOString(),
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "NTE_ISSUED_BY_SGC",
          actor: `${updatedDraft.nteSignatoryName} (${updatedDraft.nteSignatoryTitle} - SGC)`,
          message: `Simpal Group of Companies (SGC) HRMD issued the official Notice to Explain and returned it to ${senderCompany} HR (${senderHrName}) for serving to employee.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    setIsNteDraftModalOpen(false);
    setSelectedReport(updated);

    // Voice announcement
    const announcement = `Notice to Explain has been officially approved by Simpal Group of Companies HRMD and returned to ${senderCompany} HR ${senderHrName}. Please serve the document to ${updated.employeeName}.`;
    playAiVoiceAnnouncement(announcement);
  };

  // Subsidiary Company HR marks NTE as Served to Employee
  const handleServeNte = async (report) => {
    const senderComp = report.senderCompany || report.company || "Subsidiary Company";
    const senderHr = currentUser?.name || report.senderHrName || report.reportingHrName || "Area HR Admin";

    const updated = {
      ...report,
      status: "SERVED_TO_EMPLOYEE",
      servedAt: new Date().toISOString(),
      servedBy: senderHr,
      activityLog: [
        ...(report.activityLog || []),
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "NTE_SERVED_TO_EMPLOYEE",
          actor: `${senderHr} (${senderComp} HR)`,
          message: `Official Notice to Explain was served to ${report.employeeName} by ${senderComp} HR. The one-working-day explanation period is active.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    if (selectedReport?.id === report.id) setSelectedReport(updated);

    // Voice announcement
    const announcement = `Notice to Explain has been officially served to ${report.employeeName} by ${senderComp} HR. The one-working-day explanation period has commenced.`;
    playAiVoiceAnnouncement(announcement);
  };

  // Log written explanation received from employee
  const handleLogExplanation = async (reportId, explanationText) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const senderComp = report.senderCompany || report.company;
    const updated = {
      ...report,
      status: "EXPLANATION_RECEIVED",
      explanationReceivedAt: new Date().toISOString(),
      explanationText: explanationText || "Employee submitted formal written explanation.",
      activityLog: [
        ...(report.activityLog || []),
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "EXPLANATION_RECEIVED",
          actor: report.reportingHrName || report.senderHrName,
          message: `Received written explanation from ${report.employeeName} at ${senderComp}. Transmitted to Simpal Group of Companies HRMD for final administrative hearing determination.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    setIsExplanationModalOpen(false);

    // Voice announcement
    const announcement = `Employee written explanation has been received and logged for case ${report.caseNumber}. Transmitted to Simpal Group of Companies HRMD for final administrative determination.`;
    playAiVoiceAnnouncement(announcement);
  };

  // View Authentic NTE Document
  const handleViewNteDocument = (report) => {
    setSelectedReport(report);
    setIsNteViewerOpen(true);
  };

  // View Authentic IR Document
  const handleViewIrDocument = (report) => {
    setSelectedReport(report);
    setIsIrViewerOpen(true);
  };

  // Print Document Trigger
  const handlePrintDocument = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Navigation Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs transition">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#96c158] to-[#7ea741] text-white flex items-center justify-center shadow-md shadow-[#96c158]/20 shrink-0">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#eef7e5] text-[#55782a] border border-[#d3eab8]">
                  Entity Due Process Architecture
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Subsidiary Company (Sender) ➔ Simpal Group of Companies (Receiver & NTE Issuer)
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
                Incident Reports & Notice to Explain (NTE)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                The assigned HR of each entity issues an Incident Report (IR) to <strong>Simpal Group of Companies (SGC)</strong>. SGC evaluates and issues the formal <strong>Notice to Explain (NTE)</strong>, returning it to the originating company HR for employee service.
              </p>
            </div>
          </div>

          {/* Action Tools: Perspective Portal Toggle & Issue IR */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleToggleVoice}
              title={voiceMutedState ? "Turn ON voice announcements" : "Mute voice announcements"}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs ${
                voiceMutedState
                  ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
              }`}
            >
              {voiceMutedState ? <VolumeX size={15} /> : <Volume2 size={15} className="text-emerald-600 animate-pulse" />}
              <span>{voiceMutedState ? "Voice Muted" : "AI Voice Active"}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#8cb84a] hover:bg-[#7ea741] text-white shadow-md shadow-[#8cb84a]/25 transition cursor-pointer active:scale-98"
            >
              <Plus size={16} />
              <span>Issue Incident Report (IR)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Multi-Entity Pipeline Indicator Banner */}
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-emerald-50/70 via-slate-50 to-amber-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-500">
              Workflow Pipeline:
            </span>
            <span className="font-extrabold text-slate-800 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200">
              <Building2 size={13} className="text-[#96c158]" />
              Subsidiary HR (Sender)
            </span>
            <ArrowRight size={13} className="text-slate-400" />
            <span className="font-extrabold text-emerald-800 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100/70 border border-emerald-300">
              <Building2 size={13} className="text-emerald-700" />
              Simpal Group of Companies (Receiver / SGC HRMD)
            </span>
            <ArrowRight size={13} className="text-slate-400" />
            <span className="font-extrabold text-amber-800 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100/70 border border-amber-300">
              <FileText size={13} className="text-amber-700" />
              NTE Returned to Subsidiary HR
            </span>
          </div>

          {/* Perspective View Switcher */}
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setPortalView("ALL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                portalView === "ALL" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Pipelines
            </button>
            <button
              type="button"
              onClick={() => setPortalView("SUBSIDIARY_PORTAL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                portalView === "SUBSIDIARY_PORTAL"
                  ? "bg-[#8cb84a] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              Subsidiary HR
            </button>
            <button
              type="button"
              onClick={() => setPortalView("SGC_CENTRAL_PORTAL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                portalView === "SGC_CENTRAL_PORTAL"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              SGC Central HRMD
            </button>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            {[
              { id: "ALL", label: "All Cases", count: reports.length },
              {
                id: "PENDING_SGC_REVIEW",
                label: "Transmitted to SGC (Pending NTE)",
                count: reports.filter((r) => r.status === "SUBMITTED_TO_CENTRAL_HR").length,
                badgeColor: "bg-amber-100 text-amber-800"
              },
              {
                id: "NTE_RETURNED",
                label: "SGC Approved NTE (Ready to Serve)",
                count: reports.filter((r) => r.status === "NTE_ISSUED").length,
                badgeColor: "bg-emerald-100 text-emerald-800"
              },
              {
                id: "SERVED",
                label: "Served to Employee",
                count: reports.filter((r) => r.status === "SERVED_TO_EMPLOYEE").length,
                badgeColor: "bg-blue-100 text-blue-800"
              },
              {
                id: "RESOLVED",
                label: "Explanation / Resolved",
                count: reports.filter((r) => r.status === "CASE_RESOLVED" || r.status === "EXPLANATION_RECEIVED").length
              }
            ].map((tab) => {
              const active = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      active ? "bg-white/20 text-white" : tab.badgeColor || "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search employee, company, HR..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#8cb84a] focus:border-transparent bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      {/* Case List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileText size={14} className="text-slate-500" />
            Active Records ({filteredReports.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Sender: Originating Subsidiary HR ➔ Receiver: Simpal Group of Companies (SGC HRMD)
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700">No incident reports found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no records matching your current filter. Click "Issue Incident Report" to create a new case.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-[#8cb84a] text-white inline-flex items-center gap-2 hover:bg-[#7ea741] cursor-pointer"
            >
              <Plus size={14} />
              <span>Issue New Incident Report</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReports.map((report) => {
              const isPendingSgc = report.status === "SUBMITTED_TO_CENTRAL_HR";
              const isNteIssued = report.status === "NTE_ISSUED";
              const isServed = report.status === "SERVED_TO_EMPLOYEE";
              const isExplanation = report.status === "EXPLANATION_RECEIVED";
              const senderComp = report.senderCompany || report.company || "Subsidiary Company";
              const senderHr = report.senderHrName || report.reportingHrName || "Area HR Admin";
              const receiverComp = report.receiverCompany || "Simpal Group of Companies";
              const receiverHr = report.receiverHrName || report.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP";

              return (
                <div
                  key={report.id}
                  className="p-4 md:p-5 hover:bg-slate-50/80 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Employee, Case #, and Incident Summary */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {report.caseNumber}
                      </span>

                      {/* Status Badge */}
                      {isPendingSgc && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={12} />
                          Transmitted to SGC (Awaiting NTE Issuance)
                        </span>
                      )}
                      {isNteIssued && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                          <CheckCircle2 size={12} />
                          SGC Approved NTE ➔ Returned to {senderComp} HR
                        </span>
                      )}
                      {isServed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock size={12} />
                          Served to Employee (Clock Active)
                        </span>
                      )}
                      {isExplanation && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <CheckCircle2 size={12} />
                          Explanation Received (Transmitted to SGC)
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400">
                        Incident Date: {report.dateOfIncident || report.auditDates}
                      </span>
                    </div>

                    {/* Employee & Category */}
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span>{report.employeeName}</span>
                        <span className="text-xs font-medium text-slate-500">
                          ({report.employeePosition || "Staff"} • {report.department || senderComp})
                        </span>
                      </h3>
                      <p className="text-xs text-rose-700 font-semibold mt-0.5 flex items-center gap-1.5">
                        <AlertTriangle size={13} />
                        <span>Category: {report.incidentCategory}</span>
                        {report.cashShortageAmount && (
                          <span className="font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded text-[11px]">
                            Shortage: PHP {report.cashShortageAmount}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Sender & Receiver Explicit Routing Display */}
                    <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">SENDER:</span>
                        <strong className="text-slate-900">{senderComp}</strong>
                        <span className="text-slate-500">({senderHr})</span>
                      </div>

                      <ArrowRight size={13} className="text-slate-400" />

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600">RECEIVER (SGC):</span>
                        <strong className="text-emerald-950">{receiverComp}</strong>
                        <span className="text-emerald-700">({receiverHr})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Speak Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const summary = `Incident report ${report.caseNumber} issued by ${senderComp} HR ${senderHr} for ${report.employeeName}. Sent to ${receiverComp} HRMD ${receiverHr}. Status: ${
                          isPendingSgc
                            ? "Awaiting Simpal Group of Companies Notice to Explain issuance."
                            : isNteIssued
                            ? "Notice to Explain has been approved by SGC and returned to subsidiary HR for serving."
                            : isServed
                            ? "Notice to Explain has been served to employee."
                            : "Written explanation received."
                        }`;
                        playAiVoiceAnnouncement(summary);
                      }}
                      title="Speak case summary via AI Buddy"
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition cursor-pointer"
                    >
                      <Volume2 size={16} />
                    </button>

                    {/* Button 1: View Incident Report (IR) Form (Matching reference design) */}
                    <button
                      type="button"
                      onClick={() => handleViewIrDocument(report)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#8cb84a] hover:bg-[#7ea741] text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FileText size={14} />
                      <span>View IR Form</span>
                    </button>

                    {/* Simpal Group of Companies: Evaluate & Issue NTE */}
                    {isPendingSgc && (
                      <button
                        type="button"
                        onClick={() => handleOpenDraftNte(report)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <FileText size={14} />
                        <span>SGC: Issue & Return NTE</span>
                      </button>
                    )}

                    {/* Button 2: View Official NTE Document (Letterhead layout) */}
                    <button
                      type="button"
                      onClick={() => handleViewNteDocument(report)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Eye size={14} />
                      <span>View Official NTE</span>
                    </button>

                    {/* Subsidiary Company HR: Mark as Served */}
                    {isNteIssued && (
                      <button
                        type="button"
                        onClick={() => handleServeNte(report)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Check size={14} />
                        <span>Serve to Employee</span>
                      </button>
                    )}

                    {/* Log Explanation */}
                    {isServed && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReport(report);
                          setIsExplanationModalOpen(true);
                        }}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <FileCheck size={14} />
                        <span>Log Explanation</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW INCIDENT REPORT (Subsidiary HR -> SGC HRMD)            */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Green Banner */}
            <div className="bg-[#96c158] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex-1 text-center">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                  INCIDENT REPORT
                </h2>
                <p className="text-[11px] text-white/90 font-medium">
                  Transmitted to Simpal Group of Companies (SGC HRMD) for Notice to Explain (NTE)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitIrToCentralHr} className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-7 custom-scrollbar bg-slate-50/30">
              {/* SENDER & RECEIVER DIRECTORY ROUTING BOX */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                  <Briefcase size={14} className="text-emerald-600" />
                  HR Process Routing (Based on Employee Directory)
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* SENDER COMPANY */}
                  <div className="p-3 rounded-lg bg-white border border-slate-200">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
                      1. SENDER: Originating Company
                    </label>
                    <select
                      value={irForm.company}
                      onChange={(e) => handleCompanyChange(e.target.value)}
                      className="w-full text-xs font-bold text-slate-900 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-[#96c158]"
                    >
                      {SUBSIDIARY_OPTIONS.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>

                    <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1.5">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span><strong>Assigned HR:</strong> {irForm.reportingHrName} ({irForm.reportingHrTitle})</span>
                    </div>
                  </div>

                  {/* RECEIVER: SGC */}
                  <div className="p-3 rounded-lg bg-white border border-emerald-300">
                    <label className="block text-[10px] font-black uppercase tracking-wide text-emerald-700 mb-1">
                      2. RECEIVER: Notice to Explain (NTE) Issuer
                    </label>
                    <div className="text-xs font-black text-emerald-950 p-2 bg-emerald-50/70 rounded-lg border border-emerald-200">
                      Simpal Group of Companies (SGC HRMD)
                    </div>

                    <div className="mt-2 text-[11px] text-emerald-800 flex items-center gap-1.5">
                      <User size={12} className="text-emerald-600 shrink-0" />
                      <span><strong>Executive Reviewer:</strong> {irForm.assignedCentralHrName} ({irForm.assignedCentralHrTitle})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: EMPLOYEE DETAILS */}
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                    EMPLOYEE DETAILS
                  </h3>
                  <div className="w-12 h-0.5 bg-[#96c158] mx-auto mt-1 rounded-full" />
                </div>

                <div className="space-y-3.5">
                  {/* NAME */}
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                      NAME <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. MA. CATHRINA PANIZARES"
                        value={irForm.employeeName}
                        onChange={(e) => setIrForm({ ...irForm, employeeName: e.target.value.toUpperCase() })}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] font-bold text-slate-900 transition"
                      />
                    </div>
                  </div>

                  {/* DEPARTMENT & PHONE NUMBER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        DEPARTMENT
                      </label>
                      <div className="relative">
                        <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Finance & Cashier Operations"
                          value={irForm.department}
                          onChange={(e) => setIrForm({ ...irForm, department: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        PHONE NUMBER
                      </label>
                      <div className="relative">
                        <Smartphone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. +63 917 842 9102"
                          value={irForm.phoneNumber}
                          onChange={(e) => setIrForm({ ...irForm, phoneNumber: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* POSITION & BRANCH */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        POSITION / DESIGNATION
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cashier"
                        value={irForm.employeePosition}
                        onChange={(e) => setIrForm({ ...irForm, employeePosition: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        BRANCH / AREA LOCATION
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat"
                        value={irForm.branch}
                        onChange={(e) => setIrForm({ ...irForm, branch: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: DESCRIPTION OF INCIDENT */}
              <div className="space-y-4 pt-2">
                <div className="text-center">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                    DESCRIPTION OF INCIDENT
                  </h3>
                  <div className="w-12 h-0.5 bg-[#96c158] mx-auto mt-1 rounded-full" />
                </div>

                {/* 2-Column Grid (Left: Meta, Right: Incident Details Box) */}
                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
                  {/* Left Column */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        DATE
                      </label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={irForm.dateOfIncident}
                          onChange={(e) => setIrForm({ ...irForm, dateOfIncident: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        LOCATION
                      </label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Tacurong Branch"
                          value={irForm.branch}
                          onChange={(e) => setIrForm({ ...irForm, branch: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        TIME
                      </label>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. 16:30 PM"
                          value={irForm.incidentTime}
                          onChange={(e) => setIrForm({ ...irForm, incidentTime: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1.5">
                        POLICE NOTIFIED
                      </label>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-700 pt-0.5">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="policeNotified"
                            value="YES"
                            checked={irForm.policeNotified === "YES"}
                            onChange={() => setIrForm({ ...irForm, policeNotified: "YES" })}
                            className="text-[#96c158] focus:ring-[#96c158]"
                          />
                          <span>YES</span>
                        </label>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="policeNotified"
                            value="NO"
                            checked={irForm.policeNotified === "NO"}
                            onChange={() => setIrForm({ ...irForm, policeNotified: "NO" })}
                            className="text-[#96c158] focus:ring-[#96c158]"
                          />
                          <span>NO</span>
                        </label>
                      </div>
                    </div>

                    {/* Cash Shortage Amount */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        SHORTAGE (PHP)
                      </label>
                      <div className="relative">
                        <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-500" />
                        <input
                          type="text"
                          placeholder="e.g. 12,102.00"
                          value={irForm.cashShortageAmount}
                          onChange={(e) => setIrForm({ ...irForm, cashShortageAmount: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-rose-700"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: INCIDENT DETAILS (Large Box) */}
                  <div className="flex flex-col">
                    <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                      INCIDENT DETAILS
                    </label>
                    <textarea
                      rows={8}
                      placeholder="How the incident occurred, factors leading to it, what took place. Be as specific as possible."
                      value={irForm.specificFindings}
                      onChange={(e) => setIrForm({ ...irForm, specificFindings: e.target.value })}
                      className="w-full flex-1 p-3.5 text-xs rounded-2xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900 leading-relaxed custom-scrollbar transition"
                    />
                    <p className="text-[10px] text-slate-400 mt-1.5 italic">
                      How the incident occurred, factors leading to it, what took place. Be as specific as possible.
                    </p>
                  </div>
                </div>

                {/* Causes & Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                      INCIDENT CAUSES
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Root cause, lapses in SOPs, unauthorized credit extensions..."
                      value={irForm.incidentCauses}
                      onChange={(e) => setIrForm({ ...irForm, incidentCauses: e.target.value })}
                      className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900 leading-relaxed transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                      FOLLOW UP RECOMMENDATIONS
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Transmittal to Simpal Group of Companies (SGC) for formal Notice to Explain (NTE)..."
                      value={irForm.followUpRecommendations}
                      onChange={(e) => setIrForm({ ...irForm, followUpRecommendations: e.target.value })}
                      className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900 leading-relaxed transition"
                    />
                  </div>
                </div>

                {/* ADDITIONAL NOTES */}
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                    ADDITIONAL NOTES
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Attach audit sheets, count sheets, signed IOUs, or witness slips..."
                    value={irForm.additionalNotes}
                    onChange={(e) => setIrForm({ ...irForm, additionalNotes: e.target.value })}
                    className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-100/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#96c158] text-slate-900 leading-relaxed transition"
                  />
                </div>
              </div>

              {/* SECTION 3: FOR OFFICIAL USE ONLY */}
              <div className="space-y-4 pt-2">
                <div className="text-center">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                    FOR OFFICIAL USE ONLY
                  </h3>
                  <div className="w-12 h-0.5 bg-[#96c158] mx-auto mt-1 rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* REPORT RECEIVED BY (SGC HRMD) */}
                  <div className="p-3 rounded-xl bg-[#eef7e5] border border-[#d8eac2]">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wide text-[#55782a] mb-1">
                      REPORT RECEIVED BY (SGC HRMD)
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#55782a]" />
                      <input
                        type="text"
                        value={irForm.reportReceivedBy}
                        onChange={(e) => setIrForm({ ...irForm, reportReceivedBy: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#cbe3b0] bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#96c158]"
                      />
                    </div>
                  </div>

                  {/* DATE */}
                  <div className="p-3 rounded-xl bg-[#eef7e5] border border-[#d8eac2]">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wide text-[#55782a] mb-1">
                      DATE RECEIVED
                    </label>
                    <div className="relative">
                      <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#55782a]" />
                      <input
                        type="text"
                        value={irForm.reportReceivedDate}
                        onChange={(e) => setIrForm({ ...irForm, reportReceivedDate: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#cbe3b0] bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#96c158]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 px-1">
                  <span>
                    <strong>Filed By:</strong> {irForm.reportingHrName} ({irForm.company} HR)
                  </span>
                  <span>
                    <strong>Designated Receiver:</strong> Simpal Group of Companies (SGC HRMD)
                  </span>
                </div>
              </div>

              {/* Bottom Green Banner */}
              <div className="bg-[#96c158] text-white py-2.5 px-4 rounded-xl text-center shadow-xs">
                <p className="text-xs font-black uppercase tracking-wider">{irForm.company}</p>
                <p className="text-[10px] text-white/90">Employee Incident Report</p>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#8cb84a] hover:bg-[#7ea741] text-white shadow-md shadow-[#8cb84a]/25 transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Send size={15} />
                  <span>Transmit IR to Simpal Group of Companies (SGC)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: AUTHENTIC INCIDENT REPORT (IR) DOCUMENT VIEWER & PRINT           */}
      {/* ========================================================================= */}
      {isIrViewerOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls Bar */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                  {selectedReport.caseNumber}
                </span>
                <span className="text-xs font-bold text-slate-700">Official Incident Report Form</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice speech */}
                <button
                  type="button"
                  onClick={() => {
                    const speech = `Official Incident Report for ${selectedReport.employeeName} of ${selectedReport.senderCompany || selectedReport.company}. Incident occurred on ${selectedReport.dateOfIncident || "September 24, 2026"} at ${selectedReport.branch || "Tacurong Branch"}. Transmitted to Simpal Group of Companies for Notice to Explain issuance.`;
                    playAiVoiceAnnouncement(speech);
                  }}
                  title="Listen to official document reading"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-[#eef7e5] text-slate-700 hover:text-[#55782a] transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Volume2 size={14} />
                  <span>Listen (Voice)</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#8cb84a] hover:bg-[#7ea741] text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Printer size={14} />
                  <span>Print IR Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsIrViewerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Authentic Printable Document Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 flex justify-center custom-scrollbar">
              <div className="bg-white w-full max-w-[760px] p-0 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-slate-900 font-sans relative overflow-hidden flex flex-col justify-between min-h-[960px]">
                {/* Top Green Banner */}
                <div className="bg-[#96c158] text-white py-5 px-6 text-center">
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white">
                    INCIDENT REPORT
                  </h1>
                </div>

                {/* Document Body */}
                <div className="p-8 sm:p-12 space-y-8 flex-1">
                  {/* 1. EMPLOYEE DETAILS */}
                  <div className="space-y-4">
                    <h2 className="text-center text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-800">
                      EMPLOYEE DETAILS
                    </h2>

                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                          NAME
                        </div>
                        <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2.5">
                          <CreditCard size={15} className="text-slate-400 shrink-0" />
                          <span>{selectedReport.employeeName}</span>
                          <span className="text-xs text-slate-500 font-medium ml-auto">
                            ({selectedReport.employeePosition || "Staff"} • {selectedReport.senderCompany || selectedReport.company})
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                            DEPARTMENT
                          </div>
                          <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2">
                            <Building2 size={14} className="text-slate-400 shrink-0" />
                            <span>{selectedReport.department || selectedReport.senderCompany || selectedReport.company}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                            PHONE NUMBER
                          </div>
                          <div className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2">
                            <Smartphone size={14} className="text-slate-400 shrink-0" />
                            <span>{selectedReport.phoneNumber || "+63 917 842 9102"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. DESCRIPTION OF INCIDENT */}
                  <div className="space-y-4">
                    <h2 className="text-center text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-800">
                      DESCRIPTION OF INCIDENT
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
                      {/* Left Side */}
                      <div className="space-y-3">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                            DATE
                          </div>
                          <div className="w-full px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                            <Calendar size={13} className="text-slate-400 shrink-0" />
                            <span>{selectedReport.dateOfIncident || selectedReport.auditDates}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                            LOCATION
                          </div>
                          <div className="w-full px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                            <MapPin size={13} className="text-slate-400 shrink-0" />
                            <span className="truncate">{selectedReport.branch || "Tacurong Branch"}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                            TIME
                          </div>
                          <div className="w-full px-3 py-2 rounded-xl bg-slate-100/80 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
                            <Clock size={13} className="text-slate-400 shrink-0" />
                            <span>{selectedReport.incidentTime || "16:30 PM"}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                            POLICE NOTIFIED
                          </div>
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-700 pt-1">
                            <span className="inline-flex items-center gap-1">
                              <span
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  selectedReport.policeNotified === "YES"
                                    ? "border-[#96c158] bg-[#96c158]"
                                    : "border-slate-300"
                                }`}
                              >
                                {selectedReport.policeNotified === "YES" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </span>
                              <span>YES</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span
                                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  selectedReport.policeNotified !== "YES"
                                    ? "border-[#96c158] bg-[#96c158]"
                                    : "border-slate-300"
                                }`}
                              >
                                {selectedReport.policeNotified !== "YES" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </span>
                              <span>NO</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: INCIDENT DETAILS BOX */}
                      <div className="flex flex-col">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                          INCIDENT DETAILS
                        </div>
                        <div className="w-full flex-1 p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-xs text-slate-800 leading-relaxed text-justify min-h-[160px]">
                          {selectedReport.specificFindings || selectedReport.fullIncidentNarrative}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-1 italic">
                          How the incident occurred, factors leading to it, what took place. Be as specific as possible.
                        </div>
                      </div>
                    </div>

                    {/* Causes and Recommendations Boxes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                          INCIDENT CAUSES
                        </div>
                        <div className="w-full p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-800 leading-relaxed min-h-[70px]">
                          {selectedReport.incidentCauses || "Non-observance of Cashier Standard Operating Procedures (SOPs) and unauthorized transactions."}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                          FOLLOW UP RECOMMENDATIONS
                        </div>
                        <div className="w-full p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-800 leading-relaxed min-h-[70px]">
                          {selectedReport.followUpRecommendations || "Transmitted to Simpal Group of Companies (SGC HRMD) for formal Notice to Explain (NTE) under Article 297 Labor Code."}
                        </div>
                      </div>
                    </div>

                    {/* Additional Notes Box */}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1">
                        ADDITIONAL NOTES
                      </div>
                      <div className="w-full p-3 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-800 leading-relaxed min-h-[50px]">
                        {selectedReport.additionalNotes || selectedReport.evidenceNotes || "All physical cash count discrepancy sheets and borrower signed slips have been submitted and attached to the audit file."}
                      </div>
                    </div>
                  </div>

                  {/* 3. FOR OFFICIAL USE ONLY */}
                  <div className="space-y-4 pt-2">
                    <h2 className="text-center text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-800">
                      FOR OFFICIAL USE ONLY
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* REPORT RECEIVED BY (SGC HRMD) */}
                      <div className="p-3 rounded-xl bg-[#eef7e5] border border-[#d8eac2]">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#55782a] mb-1">
                          REPORT RECEIVED BY (SGC HRMD)
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <User size={14} className="text-[#55782a] shrink-0" />
                          <span>{selectedReport.reportReceivedBy || `${selectedReport.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP"} (HRMD Manager - SGC)`}</span>
                        </div>
                      </div>

                      {/* DATE */}
                      <div className="p-3 rounded-xl bg-[#eef7e5] border border-[#d8eac2]">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#55782a] mb-1">
                          DATE RECEIVED
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <Calendar size={14} className="text-[#55782a] shrink-0" />
                          <span>{selectedReport.reportReceivedDate || selectedReport.dateReported || "September 28, 2026"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>
                        <strong>Sender:</strong> {selectedReport.senderCompany || selectedReport.company} HR ({selectedReport.senderHrName || selectedReport.reportingHrName})
                      </span>
                      <span>
                        <strong>Receiver:</strong> Simpal Group of Companies (SGC HRMD)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Green Banner */}
                <div className="bg-[#96c158] text-white py-3.5 px-6 text-center shrink-0">
                  <h3 className="text-sm font-black uppercase tracking-wider">
                    {selectedReport.senderCompany || selectedReport.company || "5A ROYAL GAMING OPC"}
                  </h3>
                  <p className="text-[10px] text-white/90">Employee Incident Report</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SIMPAL GROUP OF COMPANIES (SGC HRMD) EVALUATION & ISSUE NTE       */}
      {/* ========================================================================= */}
      {isNteDraftModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <FileText size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    SGC HRMD: Issue Official Notice to Explain (NTE)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Simpal Group of Companies central evaluation for IR from {selectedReport.senderCompany || selectedReport.company} • Employee: {selectedReport.employeeName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNteDraftModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <strong>Simpal Group of Companies (SGC) Evaluation Instruction:</strong> Review the incident details submitted by {selectedReport.senderCompany} HR ({selectedReport.senderHrName || selectedReport.reportingHrName}). Once issued, this official NTE will be returned to the originating company HR for formal serving to {selectedReport.employeeName}.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Incident & Audit Findings Citation
                </label>
                <textarea
                  rows={3}
                  defaultValue={selectedReport.nteBodyParagraph1}
                  id="nte-para-1"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  2. Specific Shortages & Procedural Breaches
                </label>
                <textarea
                  rows={3}
                  defaultValue={selectedReport.nteBodyParagraph2}
                  id="nte-para-2"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Code of Conduct Citation
                </label>
                <textarea
                  rows={3}
                  defaultValue={selectedReport.codeOfConductSection}
                  id="nte-code-of-conduct"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Labor Code Citation
                </label>
                <textarea
                  rows={2}
                  defaultValue={selectedReport.laborCodeViolation}
                  id="nte-labor-code"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SGC HRMD Signatory Name
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedReport.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP"}
                    id="nte-sig-name"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Signatory Title
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedReport.assignedCentralHrTitle || "HRMD Manager"}
                    id="nte-sig-title"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNteDraftModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p1 = document.getElementById("nte-para-1").value;
                    const p2 = document.getElementById("nte-para-2").value;
                    const coc = document.getElementById("nte-code-of-conduct").value;
                    const lc = document.getElementById("nte-labor-code").value;
                    const sigName = document.getElementById("nte-sig-name").value;
                    const sigTitle = document.getElementById("nte-sig-title").value;

                    handleSaveAndReturnNte({
                      nteBodyParagraph1: p1,
                      nteBodyParagraph2: p2,
                      codeOfConductSection: coc,
                      laborCodeViolation: lc,
                      nteSignatoryName: sigName,
                      nteSignatoryTitle: sigTitle
                    });
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Send size={15} />
                  <span>SGC: Approve & Return NTE to {selectedReport.senderCompany || selectedReport.company} HR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: AUTHENTIC NOTICE TO EXPLAIN (NTE) DOCUMENT VIEWER & PRINT         */}
      {/* ========================================================================= */}
      {isNteViewerOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls Bar */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                  {selectedReport.caseNumber}
                </span>
                <span className="text-xs font-bold text-slate-700">Official Notice to Explain (Issued by SGC)</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice speech */}
                <button
                  type="button"
                  onClick={() => {
                    const speech = `Official Notice to Explain issued by Simpal Group of Companies for ${selectedReport.employeeName}. Date: ${selectedReport.nteDate || "September 28, 2026"}. In line with due process, you are hereby requested to submit a written explanation within one working day upon receipt of this memo.`;
                    playAiVoiceAnnouncement(speech);
                  }}
                  title="Listen to official document reading"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Volume2 size={14} />
                  <span>Listen (Voice)</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={handlePrintDocument}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Printer size={14} />
                  <span>Print Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsNteViewerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Official Letterhead Printable Document Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 flex justify-center custom-scrollbar">
              <div className="bg-white w-full max-w-[760px] p-8 sm:p-12 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-slate-900 font-sans relative">
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
                  <img src="/logos/5A.png" alt="watermark" className="w-96 h-auto" />
                </div>

                {/* 1. Official Header */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                  {/* Left Logo */}
                  <div className="flex items-center gap-2">
                    <img src="/logos/5A.png" alt="Company Logo" className="h-16 w-auto object-contain" />
                  </div>

                  {/* Center Text */}
                  <div className="text-center flex-1 px-4">
                    <h2 className="text-base font-black tracking-wider uppercase text-slate-900">
                      {selectedReport.senderCompany || selectedReport.company || "5A ROYAL GAMING OPC"}
                    </h2>
                    <p className="text-[11px] text-slate-700 mt-0.5">
                      Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat, Philippines
                    </p>
                    <p className="text-[11px] text-slate-700">
                      Gmail: <span className="underline">imsoroglohr@gmail.com</span>
                    </p>
                  </div>

                  {/* Right Emblem */}
                  <div className="flex items-center gap-2">
                    <img
                      src="/logos/group_emblem.jpg"
                      alt="Corporate Emblem"
                      className="h-14 w-auto object-contain rounded"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                </div>

                {/* 2. Metadata: Date, To, Subject */}
                <div className="mt-6 space-y-2 text-sm text-slate-900 font-sans">
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <span className="font-bold">Date:</span>
                    <span className="font-medium">{selectedReport.nteDate || "September 28, 2026"}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <span className="font-bold">To:</span>
                    <span className="font-extrabold uppercase">{selectedReport.employeeName}</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] gap-2">
                    <span className="font-bold">Subject:</span>
                    <span className="font-bold">Notice to Explain</span>
                  </div>
                </div>

                <div className="w-full h-[1.5px] bg-slate-900 my-4" />

                {/* 3. Document Body Content (Exact structure from photo) */}
                <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed text-slate-800 text-justify">
                  <p>
                    {selectedReport.nteBodyParagraph1 ||
                      `According to the incident report submitted by the HR Admin, Ms. Quennie R. Capuyan dated September 28, 2026, it was found that you have an outstanding cash shortage of PHP 12,102.00 during the audit conducted on September 24, 2026, by the CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora.`}
                  </p>

                  <p>
                    {selectedReport.nteBodyParagraph2 ||
                      `It was also noted that you allowed Mr. Mosher Bebot to borrow PHP 1,000.00 from the company cash and permitted advance fuel transactions for SPVR Joevert Sudsud (PHP 2,030.00) and Mr. Mosher Bebot (PHP 1,050.00) despite the scheduled release of fuel allowances. Furthermore, it was also found that there was a shortage under the name of SPVR Armando amounting to PHP 4,208.00 and other Sales Agents shortages totaling PHP 934.00 that remained uncleared and were not immediately addressed at the time of the audit.`}
                  </p>

                  <p>
                    {selectedReport.nteBodyParagraph3 ||
                      `These circumstances raise serious concerns regarding your cash handling, accountability, and compliance with Company SOPs. As the assigned ${selectedReport.employeePosition || "Cashier"}, you are expected to strictly control company funds, follow established procedures, and promptly address shortages and irregular transactions. Failure to do so may compromise the Company's financial controls and accountability.`}
                  </p>

                  <p>
                    In line with due process, you are hereby requested to submit a written explanation within one (1) working day upon receipt of this memo. Given the above allegation, why you should not discipline and find liable for the following alleged violations of the Employees Code of Conduct.
                  </p>

                  <div className="pl-4 border-l-2 border-slate-400 py-1 space-y-1">
                    <p className="font-bold text-slate-900">
                      Section 18. Offenses Related to Job Performance and Productivity.
                    </p>
                    <p>
                      <strong>(a) Non-observance of Standard Operating Procedures.</strong> Willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense.
                    </p>
                  </div>

                  <p>
                    The above-alleged offense also violates <strong>Article 297 of the Labor Code of the Philippines</strong>, particularly, serious misconduct, willful disobedience, gross and habitual neglect of duties, fraud or breach of trust, commission of a crime, and analogous cases.
                  </p>

                  <p>
                    Therefore, failure on your part to submit a written explanation shall be considered an admission of the foregoing allegation.
                  </p>

                  <p className="font-semibold text-slate-900">
                    For your strict Compliance.
                  </p>
                </div>

                {/* 4. Signatory Block (Issued by Simpal Group of Companies HRMD) */}
                <div className="mt-10 pt-4">
                  <div className="space-y-0.5">
                    <p className="font-black text-sm uppercase tracking-wide text-slate-900">
                      {selectedReport.nteSignatoryName || "JEVINCE JAYE S. JUBAY, CHRP"}
                    </p>
                    <p className="text-xs text-slate-700 font-medium">
                      {selectedReport.nteSignatoryTitle || "HRMD Manager"}
                    </p>
                    <p className="text-xs text-slate-700">
                      Simpal Group of Companies / {selectedReport.senderCompany || selectedReport.company}
                    </p>
                  </div>
                </div>

                {/* 5. Received By Block */}
                <div className="mt-12 pt-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-600">Received by:</p>
                    <p className="font-black text-sm uppercase tracking-wide text-slate-900 mt-4 border-b border-slate-400 inline-block min-w-[240px] pb-1">
                      {selectedReport.employeeName}
                    </p>
                    <p className="text-[11px] text-slate-500">Date & Signature</p>
                  </div>
                </div>

                {/* 6. Document Footer */}
                <div className="mt-14 pt-4 border-t border-slate-200 text-right text-[10px] text-slate-400">
                  {selectedReport.nteFooterNote || "HR 201 File & Records 2026"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: LOG EMPLOYEE EXPLANATION                                         */}
      {/* ========================================================================= */}
      {isExplanationModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-purple-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                  <FileCheck size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Log Written Explanation</h2>
                  <p className="text-xs text-slate-500">
                    Record explanation received from {selectedReport.employeeName} ({selectedReport.senderCompany || selectedReport.company})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExplanationModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Employee Explanation Notes / Summary
                </label>
                <textarea
                  id="explanation-notes-input"
                  rows={4}
                  placeholder="Enter summary of written letter submitted by employee, date submitted, or attach reference..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExplanationModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = document.getElementById("explanation-notes-input").value;
                    handleLogExplanation(selectedReport.id, text);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Transmit Explanation to SGC HRMD</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
