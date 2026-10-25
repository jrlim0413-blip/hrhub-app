import { useState, useEffect, useMemo, useRef } from "react";
import {
  ShieldAlert,
  FileText,
  Send,
  Plus,
  Search,
  Filter,
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
  RotateCcw,
  Sparkles,
  Share2,
  Download,
  Check,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  History
} from "lucide-react";
import {
  fetchIncidentReports,
  saveIncidentReport,
  deleteIncidentReport
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
const DEFAULT_CENTRAL_HR_NAME = "JEVINCE JAYE S. JUBAY, CHRP";
const DEFAULT_CENTRAL_HR_TITLE = "HRMD Manager";

export default function IncidentReportPanel({
  currentUser,
  profiles = [],
  onClose,
  onOpenAiBuddy
}) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, PENDING_CENTRAL_HR, NTE_ISSUED, SERVED, RESOLVED
  const [searchQuery, setSearchQuery] = useState("");
  const [voiceMutedState, setVoiceMutedState] = useState(isVoiceMuted());

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isNteViewerOpen, setIsNteViewerOpen] = useState(false);
  const [isNteDraftModalOpen, setIsNteDraftModalOpen] = useState(false);
  const [isServeModalOpen, setIsServeModalOpen] = useState(false);
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Form states for creating a new Incident Report (Area HR)
  const [irForm, setIrForm] = useState({
    employeeName: "",
    employeeId: "",
    employeePosition: "Cashier",
    company: "5A Royal Gaming OPC",
    branch: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
    reportingHrName: currentUser?.name || "Ms. Quennie R. Capuyan",
    reportingHrTitle: "HR Admin",
    dateOfIncident: new Date().toISOString().slice(0, 10),
    dateReported: new Date().toISOString().slice(0, 10),
    incidentCategory: "Cash Shortage & Non-observance of SOPs",
    auditDates: "September 24, 2026",
    auditedBy: "CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora",
    cashShortageAmount: "12,102.00",
    specificFindings: "",
    fullIncidentNarrative: "",
    evidenceNotes: "",
    assignedCentralHrName: DEFAULT_CENTRAL_HR_NAME,
    assignedCentralHrTitle: DEFAULT_CENTRAL_HR_TITLE
  });

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

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Filter status
      if (activeFilter === "PENDING_CENTRAL_HR" && item.status !== "SUBMITTED_TO_CENTRAL_HR") return false;
      if (activeFilter === "NTE_ISSUED" && item.status !== "NTE_ISSUED") return false;
      if (activeFilter === "SERVED" && item.status !== "SERVED_TO_EMPLOYEE") return false;
      if (activeFilter === "RESOLVED" && item.status !== "CASE_RESOLVED" && item.status !== "EXPLANATION_RECEIVED") return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEmp = item.employeeName?.toLowerCase().includes(q);
        const matchCase = item.caseNumber?.toLowerCase().includes(q);
        const matchCategory = item.incidentCategory?.toLowerCase().includes(q);
        const matchHr = item.reportingHrName?.toLowerCase().includes(q);
        if (!matchEmp && !matchCase && !matchCategory && !matchHr) return false;
      }
      return true;
    });
  }, [reports, activeFilter, searchQuery]);

  // Open Create IR Modal
  const handleOpenCreateModal = () => {
    setIrForm({
      employeeName: "",
      employeeId: "",
      employeePosition: "Cashier",
      company: "5A Royal Gaming OPC",
      branch: "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat",
      reportingHrName: currentUser?.name || "Ms. Quennie R. Capuyan",
      reportingHrTitle: "HR Admin",
      dateOfIncident: new Date().toISOString().slice(0, 10),
      dateReported: new Date().toISOString().slice(0, 10),
      incidentCategory: "Cash Shortage & Non-observance of SOPs",
      auditDates: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      auditedBy: "CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora",
      cashShortageAmount: "",
      specificFindings: "",
      fullIncidentNarrative: "",
      evidenceNotes: "",
      assignedCentralHrName: DEFAULT_CENTRAL_HR_NAME,
      assignedCentralHrTitle: DEFAULT_CENTRAL_HR_TITLE
    });
    setIsCreateModalOpen(true);
  };

  // Submit IR to Central HR (Area HR -> Central HR)
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
      status: "SUBMITTED_TO_CENTRAL_HR", // Forwarded to Central HR
      ...irForm,
      companyAddress: DEFAULT_COMPANY_ADDRESS,
      companyEmail: DEFAULT_COMPANY_EMAIL,
      forwardedAt: new Date().toISOString(),

      // Pre-seed template NTE paragraphs so Central HR has an instant ready-to-issue draft
      nteSubject: "Notice to Explain",
      nteDate: dateFormatted,
      nteBodyParagraph1: `According to the incident report submitted by the ${irForm.reportingHrTitle}, ${irForm.reportingHrName} dated ${dateFormatted}, it was found that you have an outstanding cash shortage of PHP ${irForm.cashShortageAmount || "0.00"} during the audit conducted on ${irForm.auditDates}, by the ${irForm.auditedBy}.`,
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
          action: "IR_SUBMITTED_TO_CENTRAL_HR",
          actor: `${irForm.reportingHrName} (${irForm.reportingHrTitle})`,
          message: `Incident Report ${caseId} issued for ${irForm.employeeName} and forwarded to Central HRMD for Notice to Explain evaluation.`
        }
      ]
    };

    await saveIncidentReport(newReport);
    await loadRecords();
    setIsCreateModalOpen(false);

    // AI Buddy Voice Announcement
    const announcement = `Attention HR Team! A new Incident Report has been issued by ${irForm.reportingHrName} for employee ${irForm.employeeName}. Forwarded to Central HRMD for Notice to Explain evaluation.`;
    playAiVoiceAnnouncement(announcement);
  };

  // Central HR Drafts / Issues NTE and returns to Area HR
  const handleOpenDraftNte = (report) => {
    setSelectedReport(report);
    setIsNteDraftModalOpen(true);
  };

  const handleSaveAndReturnNte = async (updatedDraft) => {
    const updated = {
      ...selectedReport,
      ...updatedDraft,
      status: "NTE_ISSUED", // Ready for Area HR to serve
      nteIssuedAt: new Date().toISOString(),
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "NTE_ISSUED_AND_RETURNED",
          actor: `${updatedDraft.nteSignatoryName} (${updatedDraft.nteSignatoryTitle})`,
          message: `Official Notice to Explain has been generated and returned to Area HR (${selectedReport.reportingHrName}) for serving to employee.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    setIsNteDraftModalOpen(false);
    setSelectedReport(updated);

    // Voice announcement
    const announcement = `Notice to Explain has been officially processed and returned by HRMD to Area HR. Please serve the document to ${updated.employeeName} within due process timeline.`;
    playAiVoiceAnnouncement(announcement);
  };

  // Area HR marks NTE as Served to Employee
  const handleServeNte = async (report) => {
    const updated = {
      ...report,
      status: "SERVED_TO_EMPLOYEE",
      servedAt: new Date().toISOString(),
      servedBy: currentUser?.name || report.reportingHrName || "Area HR Admin",
      activityLog: [
        ...(report.activityLog || []),
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "NTE_SERVED_TO_EMPLOYEE",
          actor: currentUser?.name || report.reportingHrName || "Area HR Admin",
          message: `Official Notice to Explain was served to ${report.employeeName}. 1-working-day explanation period active.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    if (selectedReport?.id === report.id) setSelectedReport(updated);

    // Voice announcement
    const announcement = `Notice to Explain has been officially served to ${report.employeeName}. The one-working-day explanation period has commenced.`;
    playAiVoiceAnnouncement(announcement);
  };

  // Log written explanation received from employee
  const handleLogExplanation = async (reportId, explanationText) => {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;

    const updated = {
      ...report,
      status: "EXPLANATION_RECEIVED",
      explanationReceivedAt: new Date().toISOString(),
      explanationText: explanationText || "Employee submitted formal written response.",
      activityLog: [
        ...(report.activityLog || []),
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "EXPLANATION_RECEIVED",
          actor: report.reportingHrName,
          message: `Received written explanation from employee ${report.employeeName}. Logged into HR 201 record.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    setIsExplanationModalOpen(false);

    // Voice announcement
    const announcement = `Employee written explanation has been received and logged for case ${report.caseNumber}. Ready for HRMD administrative determination.`;
    playAiVoiceAnnouncement(announcement);
  };

  // View Authentic NTE Document
  const handleViewNteDocument = (report) => {
    setSelectedReport(report);
    setIsNteViewerOpen(true);
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-md shadow-rose-500/20 shrink-0">
              <ShieldAlert size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                  Due Process & Compliance
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  Philippine Labor Code Art. 297
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
                Incident Reports & Notice to Explain (NTE)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Integrated workflow: Area HR files Incident Report (IR) ➔ Central HRMD drafts & issues official NTE ➔ Returned to Area HR for employee service with voice announcements.
              </p>
            </div>
          </div>

          {/* Action Tools: Voice Toggle & Issue IR */}
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition cursor-pointer active:scale-98"
            >
              <Plus size={16} />
              <span>Issue Incident Report (IR)</span>
            </button>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
            {[
              { id: "ALL", label: "All Cases", count: reports.length },
              {
                id: "PENDING_CENTRAL_HR",
                label: "Pending Central HR",
                count: reports.filter((r) => r.status === "SUBMITTED_TO_CENTRAL_HR").length,
                badgeColor: "bg-amber-100 text-amber-800"
              },
              {
                id: "NTE_ISSUED",
                label: "NTE Ready to Serve",
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
              placeholder="Search employee, case #..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      {/* Case Workflow Status Pipeline / Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total IR Cases</div>
            <div className="text-xl font-extrabold text-slate-900">{reports.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Under Central Review</div>
            <div className="text-xl font-extrabold text-amber-600">
              {reports.filter((r) => r.status === "SUBMITTED_TO_CENTRAL_HR").length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NTE Issued (Returned)</div>
            <div className="text-xl font-extrabold text-emerald-600">
              {reports.filter((r) => r.status === "NTE_ISSUED").length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Served & Responded</div>
            <div className="text-xl font-extrabold text-blue-600">
              {reports.filter((r) => r.status === "SERVED_TO_EMPLOYEE" || r.status === "EXPLANATION_RECEIVED").length}
            </div>
          </div>
        </div>
      </div>

      {/* Case List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileText size={14} className="text-slate-500" />
            Active Incident & Notice to Explain Records ({filteredReports.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Click on any case to view details, draft NTE, or print official notice
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
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white inline-flex items-center gap-2 hover:bg-rose-700 cursor-pointer"
            >
              <Plus size={14} />
              <span>Issue New Incident Report</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReports.map((report) => {
              const isPendingCentral = report.status === "SUBMITTED_TO_CENTRAL_HR";
              const isNteIssued = report.status === "NTE_ISSUED";
              const isServed = report.status === "SERVED_TO_EMPLOYEE";
              const isExplanation = report.status === "EXPLANATION_RECEIVED";

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
                      {isPendingCentral && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={12} />
                          Pending Central HR (IR Forwarded)
                        </span>
                      )}
                      {isNteIssued && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                          <CheckCircle2 size={12} />
                          NTE Issued & Returned (Ready to Serve)
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
                          Explanation Received
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
                          ({report.employeePosition || "Staff"} • {report.company})
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

                    {/* Routing info & reporter */}
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                      <span>
                        <strong className="text-slate-700">Area HR Issuer:</strong> {report.reportingHrName}
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-slate-700">Central HR Evaluator:</strong> {report.assignedCentralHrName}
                      </span>
                      {report.branch && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-xs">{report.branch}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Speak Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const summary = `Incident report ${report.caseNumber} for ${report.employeeName}. Status: ${
                          isPendingCentral
                            ? "Pending Central HR review."
                            : isNteIssued
                            ? "Notice to Explain issued and returned to Area HR for serving."
                            : isServed
                            ? "Notice to Explain has been served to employee."
                            : "Written explanation received."
                        } Allegation involves ${report.incidentCategory} amounting to PHP ${report.cashShortageAmount || "unspecified"}.`;
                        playAiVoiceAnnouncement(summary);
                      }}
                      title="Speak case summary via AI Buddy"
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition cursor-pointer"
                    >
                      <Volume2 size={16} />
                    </button>

                    {/* Central HR: Draft or Edit NTE */}
                    {isPendingCentral && (
                      <button
                        type="button"
                        onClick={() => handleOpenDraftNte(report)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <FileText size={14} />
                        <span>Draft & Return NTE</span>
                      </button>
                    )}

                    {/* View & Print Official NTE Document (User's authentic layout) */}
                    <button
                      type="button"
                      onClick={() => handleViewNteDocument(report)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Eye size={14} />
                      <span>View Official NTE</span>
                    </button>

                    {/* Area HR: Mark as Served */}
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

      {/* MODAL 1: CREATE NEW INCIDENT REPORT (Area HR) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Issue Incident Report (IR)</h2>
                  <p className="text-xs text-slate-500">
                    Area HR creates the incident report to be forwarded to Central HRMD for Notice to Explain (NTE)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitIrToCentralHr} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {/* Employee Selection & Details */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <User size={14} className="text-rose-600" />
                  1. Subject Employee Information
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Employee Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. MA. CATHRINA PANIZARES"
                      value={irForm.employeeName}
                      onChange={(e) => setIrForm({ ...irForm, employeeName: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Employee ID / Designation
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cashier"
                      value={irForm.employeePosition}
                      onChange={(e) => setIrForm({ ...irForm, employeePosition: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Company / Subsidiary
                    </label>
                    <select
                      value={irForm.company}
                      onChange={(e) => setIrForm({ ...irForm, company: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                    >
                      <option value="5A Royal Gaming OPC">5A Royal Gaming OPC</option>
                      <option value="Simpal Group of Companies">Simpal Group of Companies</option>
                      <option value="SIMCON">SIMCON</option>
                      <option value="Lucky Betplay Corporation">Lucky Betplay Corporation</option>
                      <option value="Imperial Gaming OPC">Imperial Gaming OPC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Branch / Area Location
                    </label>
                    <input
                      type="text"
                      value={irForm.branch}
                      onChange={(e) => setIrForm({ ...irForm, branch: e.target.value })}
                      placeholder="e.g. Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Incident Facts & Audit Specifics */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-600" />
                  2. Incident Findings & Audit Details
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Incident Category / Allegation
                    </label>
                    <input
                      type="text"
                      value={irForm.incidentCategory}
                      onChange={(e) => setIrForm({ ...irForm, incidentCategory: e.target.value })}
                      placeholder="e.g. Cash Shortage & Non-observance of SOPs"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cash Shortage Amount (PHP)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12,102.00"
                      value={irForm.cashShortageAmount}
                      onChange={(e) => setIrForm({ ...irForm, cashShortageAmount: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold text-rose-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Audit Date(s)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. September 24, 2026"
                      value={irForm.auditDates}
                      onChange={(e) => setIrForm({ ...irForm, auditDates: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Audited By / Investigating Officers
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora"
                      value={irForm.auditedBy}
                      onChange={(e) => setIrForm({ ...irForm, auditedBy: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specific Violations & Shortage Breakdown
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Allowed Mr. Mosher Bebot to borrow PHP 1,000.00 from company cash; permitted advance fuel transactions for SPVR Joevert Sudsud (PHP 2,030.00) and Mosher Bebot (PHP 1,050.00); SPVR Armando shortage PHP 4,208.00 remained uncleared."
                    value={irForm.specificFindings}
                    onChange={(e) => setIrForm({ ...irForm, specificFindings: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* Area HR & Central HR Routing */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <ArrowRight size={14} className="text-emerald-600" />
                  3. Peer-to-Peer HR Routing
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Reporting Area HR Admin (You)
                    </label>
                    <input
                      type="text"
                      value={irForm.reportingHrName}
                      onChange={(e) => setIrForm({ ...irForm, reportingHrName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Forward To Central HR / HRMD Manager
                    </label>
                    <input
                      type="text"
                      value={irForm.assignedCentralHrName}
                      onChange={(e) => setIrForm({ ...irForm, assignedCentralHrName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-emerald-800"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Send size={15} />
                  <span>Submit & Forward IR to Central HR</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CENTRAL HR DRAFT / ISSUE NTE MODAL */}
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
                    Draft Official Notice to Explain (NTE)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Central HRMD evaluation for Incident Report {selectedReport.caseNumber} • {selectedReport.employeeName}
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
                <strong>Central HR Instruction:</strong> This draft matches the official letterhead format. Review the citations, due process timeframes, and signatory before returning the official NTE to Area HR ({selectedReport.reportingHrName}) for serving.
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
                    Signatory Name
                  </label>
                  <input
                    type="text"
                    defaultValue={selectedReport.assignedCentralHrName || DEFAULT_CENTRAL_HR_NAME}
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
                    defaultValue={selectedReport.assignedCentralHrTitle || DEFAULT_CENTRAL_HR_TITLE}
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
                  <span>Issue & Return NTE to Area HR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUTHENTIC NOTICE TO EXPLAIN (NTE) DOCUMENT VIEWER & PRINT */}
      {isNteViewerOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls Bar */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                  {selectedReport.caseNumber}
                </span>
                <span className="text-xs font-bold text-slate-700">Official Notice to Explain</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice speech */}
                <button
                  type="button"
                  onClick={() => {
                    const speech = `Official Notice to Explain. Date: ${selectedReport.nteDate || "September 28, 2026"}. To: ${selectedReport.employeeName}. Subject: Notice to Explain. ${selectedReport.nteBodyParagraph1} ${selectedReport.nteBodyParagraph2} In line with due process, you are hereby requested to submit a written explanation within one working day upon receipt of this memo.`;
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

            {/* Official Letterhead Printable Document Container (Matches Photo 1:1) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 flex justify-center custom-scrollbar">
              <div className="bg-white w-full max-w-[760px] p-8 sm:p-12 shadow-md border border-slate-200 rounded-sm print:p-0 print:border-none print:shadow-none text-slate-900 font-sans relative">
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
                  <img src="/logos/5A.png" alt="watermark" className="w-96 h-auto" />
                </div>

                {/* 1. Official Header */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                  {/* Left Logo: 5A Royal Gaming */}
                  <div className="flex items-center gap-2">
                    <img src="/logos/5A.png" alt="5A Royal Gaming" className="h-16 w-auto object-contain" />
                  </div>

                  {/* Center Text */}
                  <div className="text-center flex-1 px-4">
                    <h2 className="text-base font-black tracking-wider uppercase text-slate-900">
                      5A ROYAL GAMING OPC
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

                {/* 4. Signatory Block */}
                <div className="mt-10 pt-4">
                  <div className="space-y-0.5">
                    <p className="font-black text-sm uppercase tracking-wide text-slate-900">
                      {selectedReport.nteSignatoryName || DEFAULT_CENTRAL_HR_NAME}
                    </p>
                    <p className="text-xs text-slate-700 font-medium">
                      {selectedReport.nteSignatoryTitle || DEFAULT_CENTRAL_HR_TITLE}
                    </p>
                    <p className="text-xs text-slate-700">
                      {selectedReport.company || "5A Royal Gaming OPC"}
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

      {/* MODAL 4: LOG EMPLOYEE EXPLANATION */}
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
                    Record explanation received from {selectedReport.employeeName}
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
                  <span>Save Explanation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
