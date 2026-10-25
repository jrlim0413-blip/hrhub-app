import { useState, useEffect, useMemo, useRef } from "react";
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
  Layers,
  ShieldCheck,
  Lock,
  ArrowUpRight,
  Inbox,
  SendHorizontal,
  Info,
  Scale,
  Trash2,
  RefreshCw,
  Mail,
  PenTool,
  CheckCheck,
  FileSignature,
  Paperclip,
  AtSign,
  MessageSquare,
  Reply,
  Video,
  ExternalLink,
  Users,
  Save
} from "lucide-react";
import {
  fetchIncidentReports,
  saveIncidentReport,
  deleteIncidentReport,
  clearAllIncidentReports,
  subscribeToLiveReports,
  lookupAssignedHrForCompany,
  lookupSgcCentralHr,
  saveDefaultIrSignatories,
  loadDefaultIrSignatories
} from "../lib/incidentReportStorage";
import { processSignatureToTransparentPng } from "../lib/signatureImageProcessor";
import { supabase } from "../lib/supabase";
import {
  resolveUserHrRole,
  ROLE_PERMISSION_MATRIX,
  HR_ROLE_TYPES,
  HR_ENTITIES,
  isActionAuthorized
} from "../lib/hrPermissionMatrix";
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
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [voiceMutedState, setVoiceMutedState] = useState(isVoiceMuted());

  // Modals
  const [isPermissionMatrixOpen, setIsPermissionMatrixOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isIrViewerOpen, setIsIrViewerOpen] = useState(false);
  const [isNteViewerOpen, setIsNteViewerOpen] = useState(false);
  const [isNteDraftModalOpen, setIsNteDraftModalOpen] = useState(false);
  const [isExplanationModalOpen, setIsExplanationModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // Employee/Respondent Receipt & Digital Signature states
  const [isSignReceiptModalOpen, setIsSignReceiptModalOpen] = useState(false);
  const [signReportTarget, setSignReportTarget] = useState(null);
  const [signMode, setSignMode] = useState("DRAW"); // "DRAW" | "TYPE"
  const [typedSignature, setTypedSignature] = useState("");
  const [signRemarks, setSignRemarks] = useState("I acknowledge receipt of this Incident Report and take notice of its contents.");
  const sigCanvasRef = useRef(null);
  const isDrawingRef = useRef(false);

  // New Disciplinary Lifecycle Modals (Head Office & Branch HR)
  const [isAddToFilingsModalOpen, setIsAddToFilingsModalOpen] = useState(false);
  const [filingRemarksInput, setFilingRemarksInput] = useState("Reviewed by SGC Head Office HRMD. Noted and retained for 201 file records. Minor discrepancy resolved on-site without formal disciplinary proceeding.");

  const [isUploadNteProofModalOpen, setIsUploadNteProofModalOpen] = useState(false);
  const [nteProofData, setNteProofData] = useState({ fileData: "", fileName: "", dateServed: new Date().toISOString().slice(0, 10), remarks: "" });

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [warningForm, setWarningForm] = useState({
    penalty: "1st Written Warning & Reprimand",
    subject: "",
    body: "",
    signatoryName: "JEVINCE JAYE S. JUBAY, CHRP",
    signatoryTitle: "HRMD Manager"
  });

  const [isNoiModalOpen, setIsNoiModalOpen] = useState(false);
  const [noiForm, setNoiForm] = useState({
    zoomMeetingTopic: "",
    zoomMeetingDate: "",
    zoomMeetingTime: "10:00 AM PST",
    zoomMeetingLink: "",
    zoomMeetingId: "",
    zoomPasscode: "",
    hearingCommittee: "SGC Due Process Committee & HRMD",
    noiRemarks: "You are required to attend this administrative investigation hearing. You may be accompanied by a representative or legal counsel of your choice in accordance with DOLE Department Order No. 147-15."
  });

  const [isAdminDecisionModalOpen, setIsAdminDecisionModalOpen] = useState(false);
  const [adminDecisionForm, setAdminDecisionForm] = useState({
    subject: "",
    findings: "Guilty of Non-observance of Cashier Standard Operating Procedures and Discrepancy",
    penalty: "Written Warning & Restitution of Unaccounted Funds",
    body: "",
    signatoryName: "JEVINCE JAYE S. JUBAY, CHRP",
    signatoryTitle: "HRMD Manager"
  });

  const [isUploadDecisionProofModalOpen, setIsUploadDecisionProofModalOpen] = useState(false);
  const [decisionProofData, setDecisionProofData] = useState({ fileData: "", fileName: "", dateServed: new Date().toISOString().slice(0, 10), remarks: "" });

  const [isZoomViewerOpen, setIsZoomViewerOpen] = useState(false);

  // Compute effective role & capabilities STRICTLY based on the logged-in account (currentUser)
  const effectiveRole = useMemo(() => {
    return resolveUserHrRole(currentUser, profiles);
  }, [currentUser, profiles]);

  // Form states for creating a new Incident Report (Subsidiary HR -> SGC HRMD)
  const initialCompany = effectiveRole.isHeadOffice ? "5A Royal Gaming OPC" : effectiveRole.company;
  const initialSenderHr = lookupAssignedHrForCompany(initialCompany, profiles);
  const initialSgcHr = lookupSgcCentralHr(profiles);

  const [irForm, setIrForm] = useState({
    senderCompany: initialCompany,
    company: initialCompany,
    reportingHrName: initialSenderHr.name,
    reportingHrTitle: initialSenderHr.title,
    reportingHrEmail: initialSenderHr.email,
    receiverCompany: "Simpal Group of Companies",
    assignedCentralHrName: initialSgcHr.name,
    assignedCentralHrTitle: initialSgcHr.title,
    assignedCentralHrCompany: "Simpal Group of Companies",
    reportReceivedBy: `${initialSgcHr.name} (${initialSgcHr.title} - SGC)`,
    reportReceivedDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    employeeName: "",
    employeeId: "",
    employeePosition: "Cashier",
    department: "Finance & Cashier Operations",
    phoneNumber: "+63 917 842 9102",
    branch: "Tacurong Branch",
    location: "Tacurong Branch",
    dateOfIncident: new Date().toISOString().slice(0, 10),
    dateReported: new Date().toISOString().slice(0, 10),
    incidentTime: "16:30 PM",
    factualDescription: "",
    witnesses: "",
    violations: ["Company Policies and Procedures", "Cash Handling / Collection"],
    otherViolation: "",
    violationRemarks: "",
    attachments: ["Reports / Logs", "System Records / CCTV (if any)"],
    otherAttachments: "",
    policeNotified: "NO",
    incidentCategory: "Cash Shortage & Non-observance of SOPs",
    auditDates: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    auditedBy: "CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora",
    cashShortageAmount: "",
    specificFindings: "",
    fullIncidentNarrative: "",
    incidentCauses: "Non-observance of Cashier Standard Operating Procedures (SOPs), unauthorized credit extensions, and failure to reconcile daily cash float before shift closure.",
    followUpRecommendations: "Immediate transmittal to Simpal Group of Companies (SGC) Head Office HRMD for formal Notice to Explain (NTE) issuance under Article 297 Labor Code.",
    additionalNotes: "All physical cash count discrepancy sheets and borrower signed slips have been submitted and attached to the audit file.",
    evidenceNotes: "",
    preparerSignature: "",
    preparerName: initialSenderHr.name,
    preparerTitle: initialSenderHr.title,
    operationsManagerSignature: "",
    operationsManagerName: "Operations Manager",
    operationsManagerTitle: "Operations Manager",
    approvedByName: initialSgcHr.name,
    approvedByTitle: `${initialSgcHr.title} (Head Office)`,
    approvedBySignature: ""
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState("");
  const prevPendingCountRef = useRef(null);

  // Load records (with optional silent background mode)
  const loadRecords = async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await fetchIncidentReports();
      setReports(data);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      // Voice notification for Head Office when incoming report arrives
      const incomingCount = data.filter((r) => r.status === "SUBMITTED_TO_CENTRAL_HR").length;
      if (effectiveRole.isHeadOffice && prevPendingCountRef.current !== null) {
        if (incomingCount > prevPendingCountRef.current) {
          playAiVoiceAnnouncement("New Incident Report incoming from branch HR! Awaiting Notice to Explain evaluation.");
        }
      }
      prevPendingCountRef.current = incomingCount;
    } catch (err) {
      console.warn("Failed to load incident reports:", err);
    } finally {
      if (!isSilent) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  // Real-time synchronization: Supabase postgres_changes + BroadcastChannel + Auto-polling
  useEffect(() => {
    loadRecords(false);

    // 1. Cross-tab instant broadcast listener
    const unsubBroadcast = subscribeToLiveReports((liveList) => {
      setReports(liveList);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    });

    // 2. Supabase Realtime channel subscription
    let realtimeChannel = null;
    try {
      if (supabase) {
        realtimeChannel = supabase
          .channel("realtime-incident-reports-desk")
          .on("postgres_changes", { event: "*", schema: "public", table: "incident_reports" }, () => {
            loadRecords(true);
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "user_settings" }, (payload) => {
            if (payload.new?.user_id === "master_incident_reports_hub") {
              loadRecords(true);
            }
          })
          .subscribe();
      }
    } catch (realtimeErr) {
      console.debug("Realtime channel subscription notice:", realtimeErr?.message);
    }

    // 3. Resilient background auto-polling (every 3.5 seconds)
    const pollInterval = setInterval(() => {
      loadRecords(true);
    }, 3500);

    return () => {
      clearInterval(pollInterval);
      unsubBroadcast();
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [effectiveRole.isHeadOffice]);

  // Persistent Default Signatories State (Saved in LocalStorage & Supabase user_settings)
  const [defaultSignatories, setDefaultSignatories] = useState(null);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [defaultsSavedSuccess, setDefaultsSavedSuccess] = useState(false);

  // Load default signatories on mount
  useEffect(() => {
    let mounted = true;
    const fetchDefaults = async () => {
      try {
        const defs = await loadDefaultIrSignatories();
        if (defs && mounted) {
          setDefaultSignatories(defs);
          setIrForm((prev) => ({
            ...prev,
            preparerName: defs.preparerName || prev.preparerName,
            preparerTitle: defs.preparerTitle || prev.preparerTitle,
            preparerSignature: defs.preparerSignature || prev.preparerSignature,
            operationsManagerName: defs.operationsManagerName || prev.operationsManagerName,
            operationsManagerTitle: defs.operationsManagerTitle || prev.operationsManagerTitle,
            operationsManagerSignature: defs.operationsManagerSignature || prev.operationsManagerSignature,
            approvedByName: defs.approvedByName || prev.approvedByName,
            approvedByTitle: defs.approvedByTitle || prev.approvedByTitle,
            approvedBySignature: defs.approvedBySignature || prev.approvedBySignature
          }));
        }
      } catch (err) {
        console.debug("Error loading default signatories:", err);
      }
    };
    fetchDefaults();
    return () => {
      mounted = false;
    };
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

  // Filtered reports: Head Office sees all, Subsidiary HR only sees their own company's reports
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Role scoping:
      if (!effectiveRole.isHeadOffice) {
        const itemComp = (item.senderCompany || item.company || "").toLowerCase();
        const userComp = (effectiveRole.company || "").toLowerCase();
        if (!itemComp.includes(userComp) && !userComp.includes(itemComp)) {
          return false;
        }
      }

      // Filter status
      if (activeFilter === "PENDING_SGC" && item.status !== "SUBMITTED_TO_CENTRAL_HR") return false;
      if (activeFilter === "FILED_RECORD" && item.status !== "FILED_FOR_RECORD") return false;
      if (
        activeFilter === "NTE_STAGE" &&
        item.status !== "NTE_ISSUED" &&
        item.status !== "NTE_SERVED_ACKNOWLEDGED" &&
        item.status !== "SERVED_TO_EMPLOYEE"
      )
        return false;
      if (activeFilter === "EXPLANATION" && item.status !== "EXPLANATION_RECEIVED") return false;
      if (
        activeFilter === "NOI_ZOOM" &&
        item.status !== "NOI_ISSUED" &&
        item.status !== "NOTICE_OF_WARNING_ISSUED"
      )
        return false;
      if (
        activeFilter === "DECISION_CLOSED" &&
        item.status !== "ADMIN_DECISION_ISSUED" &&
        item.status !== "CASE_CLOSED" &&
        item.status !== "CASE_RESOLVED"
      )
        return false;

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
  }, [reports, activeFilter, effectiveRole, searchQuery]);

  // Toggle violation checkbox in IR create form
  const handleToggleViolation = (item) => {
    setIrForm((prev) => {
      const list = Array.isArray(prev.violations) ? prev.violations : [];
      if (list.includes(item)) {
        return { ...prev, violations: list.filter((v) => v !== item) };
      } else {
        return { ...prev, violations: [...list, item] };
      }
    });
  };

  // Toggle attachment checkbox in IR create form
  const handleToggleAttachment = (item) => {
    setIrForm((prev) => {
      const list = Array.isArray(prev.attachments) ? prev.attachments : [];
      if (list.includes(item)) {
        return { ...prev, attachments: list.filter((a) => a !== item) };
      } else {
        return { ...prev, attachments: [...list, item] };
      }
    });
  };

  // Open Create IR Modal
  const handleOpenCreateModal = async () => {
    const targetComp = effectiveRole.company || "5A Royal Gaming OPC";
    const assigned = lookupAssignedHrForCompany(targetComp, profiles);
    const sgcHr = lookupSgcCentralHr(profiles);

    // Pull persistent defaults if not yet cached in state
    let defs = defaultSignatories;
    if (!defs) {
      try {
        defs = await loadDefaultIrSignatories();
        if (defs) setDefaultSignatories(defs);
      } catch (err) {
        console.debug("Could not fetch default signatories:", err);
      }
    }
    const d = defs || {};

    setIrForm({
      senderCompany: targetComp,
      company: targetComp,
      reportingHrName: currentUser?.name || assigned.name,
      reportingHrTitle: currentUser?.role || assigned.title,
      reportingHrEmail: currentUser?.email || assigned.email,
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
      branch: "Tacurong Branch",
      location: "Tacurong Branch",
      dateOfIncident: new Date().toISOString().slice(0, 10),
      dateReported: new Date().toISOString().slice(0, 10),
      incidentTime: "16:30 PM",
      factualDescription: "During surprise drawer reconciliation audit, a physical cash shortage was uncovered. The personnel on duty could not produce balancing vouchers or valid justification for the discrepancy.",
      witnesses: "",
      violations: ["Company Policies and Procedures", "Cash Handling / Collection"],
      otherViolation: "",
      violationRemarks: "",
      attachments: ["Reports / Logs", "System Records / CCTV (if any)"],
      otherAttachments: "",
      policeNotified: "NO",
      incidentCategory: "Cash Shortage & Non-observance of SOPs",
      auditDates: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      auditedBy: "CFO Admin Staff, Ms. Rollyn Beatrice Simpal and Ms. Hygiene Reusora",
      cashShortageAmount: "",
      specificFindings: "During surprise drawer reconciliation audit, a physical cash shortage was uncovered. The personnel on duty could not produce balancing vouchers or valid justification for the discrepancy.",
      fullIncidentNarrative: "During surprise drawer reconciliation audit, a physical cash shortage was uncovered. The personnel on duty could not produce balancing vouchers or valid justification for the discrepancy.",
      incidentCauses: "Non-observance of Cashier Standard Operating Procedures (SOPs), unauthorized credit extensions, and failure to reconcile daily cash float before shift closure.",
      followUpRecommendations: "Immediate transmittal to Simpal Group of Companies (SGC) Head Office HRMD for formal Notice to Explain (NTE) issuance under Article 297 Labor Code.",
      additionalNotes: "All physical cash count discrepancy sheets and borrower signed slips have been submitted and attached to the audit file.",
      evidenceNotes: "",
      preparerSignature: d.preparerSignature || "",
      preparerName: d.preparerName || currentUser?.name || assigned.name,
      preparerTitle: d.preparerTitle || currentUser?.role || assigned.title,
      operationsManagerSignature: d.operationsManagerSignature || "",
      operationsManagerName: d.operationsManagerName || "Operations Manager",
      operationsManagerTitle: d.operationsManagerTitle || "Operations Manager",
      approvedByName: d.approvedByName || sgcHr.name,
      approvedByTitle: d.approvedByTitle || `${sgcHr.title} (Head Office)`,
      approvedBySignature: d.approvedBySignature || ""
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

    const findingsText =
      irForm.factualDescription?.trim() ||
      irForm.specificFindings?.trim() ||
      irForm.fullIncidentNarrative?.trim() ||
      "During surprise drawer reconciliation audit, a physical cash shortage was uncovered. The personnel on duty could not produce balancing vouchers or valid justification for the discrepancy.";

    const defaultNteSubject = `NOTICE TO EXPLAIN (NTE) — RE: INCIDENT INVESTIGATION FOR ${irForm.employeeName.toUpperCase()}`;
    const defaultNteBodyParagraph1 = `According to the incident report submitted by the ${irForm.reportingHrTitle || "Branch HR Admin"}, ${irForm.reportingHrName || "Branch HR"} of ${irForm.company} dated ${irForm.dateReported || dateFormatted}, an incident involving an unaccounted cash shortage of PHP ${irForm.cashShortageAmount || "0.00"} and deviation from standard operating procedures was uncovered during the audit conducted on ${irForm.auditDates || dateFormatted} by ${irForm.auditedBy || "Internal Audit"}.`;
    const defaultNteBodyParagraph2 = findingsText;
    const defaultNteBodyParagraph3 = `As the designated ${irForm.employeePosition || "Employee"}, you are tasked with strict adherence to cash handling, trust fidelity, and standard operating procedures (SOPs). Failure to properly balance company funds or observe operational guidelines impairs the legitimate trust reposed in you by the company.`;
    const defaultCodeOfConduct = `Employees Code of Conduct — Offenses Involving Dishonesty, Cash Shortages & Gross Neglect of Duties:\n"Any employee who causes or incurs unaccounted shortages, unremitted collections, failure to balance assigned cash floats, or circumvents standard financial control mechanisms shall be subjected to formal administrative disciplinary action."`;
    const defaultLaborCode = `Philippine Labor Code (PD 442), Article 297 [Termination by Employer - Just Causes]:\n(a) Serious Misconduct or willful disobedience in connection with work;\n(b) Gross and habitual neglect of duty;\n(c) Fraud or willful breach of trust reposed by the employer.`;
    const defaultDueProcess = `In strict adherence to procedural due process guaranteed under Department of Labor and Employment (DOLE) Department Order No. 147-15, you are hereby given a period of FIVE (5) CALENDAR DAYS from your receipt hereof to submit a formal written explanation addressing the allegations enumerated above.`;
    const defaultConclusion = `Failure on your part to submit your written explanation within the prescribed 5-day period shall be construed as a waiver of your right to be heard, and the Management shall evaluate the incident based on the evidence on record.`;

    const newReport = {
      id: caseId,
      caseNumber: caseId,
      status: "SUBMITTED_TO_CENTRAL_HR", // Transmitted to Head Office (Simpal Group of Companies)
      ...irForm,
      specificFindings: findingsText,
      fullIncidentNarrative: findingsText,
      specific_findings: findingsText,
      full_incident_narrative: findingsText,
      cashShortageAmount: irForm.cashShortageAmount || "0.00",
      cash_shortage_amount: irForm.cashShortageAmount || "0.00",
      incidentCauses: irForm.incidentCauses,
      incident_causes: irForm.incidentCauses,
      followUpRecommendations: irForm.followUpRecommendations,
      follow_up_recommendations: irForm.followUpRecommendations,
      additionalNotes: irForm.additionalNotes,
      additional_notes: irForm.additionalNotes,
      senderCompany: irForm.company,
      senderHrName: irForm.reportingHrName,
      senderHrTitle: irForm.reportingHrTitle,
      receiverCompany: "Simpal Group of Companies",
      receiverHrName: irForm.assignedCentralHrName,
      receiverHrTitle: irForm.assignedCentralHrTitle,
      preparerSignature: irForm.preparerSignature || "",
      preparerName: irForm.preparerName || irForm.reportingHrName,
      preparerTitle: irForm.preparerTitle || irForm.reportingHrTitle,
      operationsManagerSignature: irForm.operationsManagerSignature || "",
      operationsManagerName: irForm.operationsManagerName || "Operations Manager",
      operationsManagerTitle: irForm.operationsManagerTitle || "Operations Manager",
      companyAddress: DEFAULT_COMPANY_ADDRESS,
      companyEmail: DEFAULT_COMPANY_EMAIL,
      forwardedAt: new Date().toISOString(),

      // Professional Structured NTE Defaults (Manual editable)
      nteSubject: defaultNteSubject,
      nteDate: dateFormatted,
      nteBodyParagraph1: defaultNteBodyParagraph1,
      nteBodyParagraph2: defaultNteBodyParagraph2,
      nteBodyParagraph3: defaultNteBodyParagraph3,
      nteDueProcessClause: defaultDueProcess,
      codeOfConductSection: defaultCodeOfConduct,
      laborCodeViolation: defaultLaborCode,
      nteConclusion: defaultConclusion,
      violationSummaryTitle: "Cash Shortage, Unremitted Funds & Breach of Trust",
      violationSeverity: "SERIOUS OFFENSE",
      nteSignatoryName: irForm.assignedCentralHrName,
      nteSignatoryTitle: irForm.assignedCentralHrTitle,
      nteSignatoryCompany: "Simpal Group of Companies",
      nteFooterNote: `HR 201 File & Records ${new Date().getFullYear()}`,

      activityLog: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "IR_TRANSMITTED_TO_HEAD_OFFICE",
          actor: `${irForm.reportingHrName} (${irForm.company} HR)`,
          message: `Transmitted Incident Report ${caseId} for ${irForm.employeeName} to Simpal Group of Companies (Head Office HRMD).`
        }
      ]
    };

    const saved = await saveIncidentReport(newReport);
    await loadRecords();
    setIsCreateModalOpen(false);
    setSelectedReport(saved || newReport);
    setIsIrViewerOpen(true);

    // AI Voice Announcement
    const announcement = `Transmitted! Incident report for ${irForm.employeeName} has been officially sent from ${irForm.company} to Simpal Group of Companies Head Office for Notice to Explain evaluation.`;
    playAiVoiceAnnouncement(announcement);
  };

  // Simpal Group of Companies (SGC HRMD) Evaluates & Issues NTE (Returns to Originating Company)
  const handleOpenDraftNte = (report) => {
    const findingsText =
      report.specificFindings ||
      report.specific_findings ||
      report.fullIncidentNarrative ||
      report.full_incident_narrative ||
      "Cash discrepancy and procedural non-compliance noted during drawer audit.";

    const defaultNteSubject = report.nteSubject || `NOTICE TO EXPLAIN (NTE) — RE: INCIDENT INVESTIGATION FOR ${(report.employeeName || "EMPLOYEE").toUpperCase()}`;
    const defaultNteDate = report.nteDate || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const defaultNteBodyParagraph1 = report.nteBodyParagraph1 || `According to the incident report submitted by the ${report.reportingHrTitle || report.senderHrTitle || "Branch HR Admin"}, ${report.reportingHrName || report.senderHrName || "Branch HR"} of ${report.senderCompany || report.company} dated ${report.dateReported || "recently"}, it was found that you have an outstanding cash shortage of PHP ${report.cashShortageAmount || "0.00"} during the audit conducted on ${report.auditDates || "scheduled audit"} by ${report.auditedBy || "Internal Audit"}.`;
    const defaultNteBodyParagraph2 = report.nteBodyParagraph2 || findingsText;
    const defaultNteBodyParagraph3 = report.nteBodyParagraph3 || `These circumstances raise serious concerns regarding your cash handling, accountability, and compliance with Company SOPs. As the assigned ${report.employeePosition || "Employee"}, you are expected to strictly safeguard company funds and follow established procedures.`;
    const defaultCodeOfConduct = report.codeOfConductSection || `Employees Code of Conduct — Offenses Involving Dishonesty, Cash Shortages & Operational Lapses:\n"Any employee who causes or incurs unaccounted shortages, unremitted collections, failure to balance assigned cash floats, or circumvents standard financial control mechanisms shall be subjected to formal administrative disciplinary action."`;
    const defaultLaborCode = report.laborCodeViolation || `Philippine Labor Code (PD 442) Art. 297 Just Causes:\n(a) Serious Misconduct or willful disobedience in connection with work;\n(b) Gross and habitual neglect of duty;\n(c) Fraud or willful breach of trust reposed by the employer.`;
    const defaultDueProcess = report.nteDueProcessClause || "In line with procedural due process (DOLE Department Order No. 147-15), you are hereby requested to submit a written explanation within five (5) calendar days upon receipt of this memo, explaining why you should not be disciplined under company rules and the Labor Code.";
    const defaultConclusion = report.nteConclusion || "Failure to submit your written explanation within the five-day period shall be deemed a waiver of your opportunity to present your side, and management will decide the case on the basis of available records.";

    const enrichedReport = {
      ...report,
      nteSubject: defaultNteSubject,
      nteDate: defaultNteDate,
      nteBodyParagraph1: defaultNteBodyParagraph1,
      nteBodyParagraph2: defaultNteBodyParagraph2,
      nteBodyParagraph3: defaultNteBodyParagraph3,
      codeOfConductSection: defaultCodeOfConduct,
      laborCodeViolation: defaultLaborCode,
      nteDueProcessClause: defaultDueProcess,
      nteConclusion: defaultConclusion,
      violationSummaryTitle: report.violationSummaryTitle || "Cash Shortage, Unremitted Funds & Breach of Trust",
      violationSeverity: report.violationSeverity || "SERIOUS OFFENSE",
      nteSignatoryName: report.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP",
      nteSignatoryTitle: report.assignedCentralHrTitle || "HRMD Manager",
      nteSignatoryCompany: "Simpal Group of Companies"
    };

    setSelectedReport(enrichedReport);
    setIsNteDraftModalOpen(true);
  };

  // Direct Simpal Group of Companies (Head Office) NTE Action
  const handleOpenDirectSgcNte = () => {
    // If there is an existing pending report submitted to central HR, open it directly
    const pending = reports.find((r) => r.status === "SUBMITTED_TO_CENTRAL_HR");
    if (pending) {
      handleOpenDraftNte(pending);
      return;
    }

    // Otherwise, generate a fresh direct Head Office NTE draft for Simpal Group of Companies
    const sgcHr = lookupSgcCentralHr(profiles);
    const dateFormatted = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const directCaseNumber = `NTE-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

    const directNteReport = {
      id: `nte-sgc-${Date.now()}`,
      caseNumber: directCaseNumber,
      employeeName: "MARIA KRISTINA SANTOS",
      employeePosition: "Branch Cashier & Vault Custodian",
      branchLocation: "Station 1",
      company: "5A Royal Gaming OPC",
      senderCompany: "5A Royal Gaming OPC",
      receiverCompany: "Simpal Group of Companies",
      reportingHrName: "Ms. Quennie R. Capuyan",
      reportingHrTitle: "Branch HR Admin",
      receiverHrName: sgcHr.name,
      receiverHrTitle: sgcHr.title,
      status: "SUBMITTED_TO_CENTRAL_HR",
      cashShortageAmount: "12,500.00",
      auditDates: dateFormatted,
      auditedBy: `${sgcHr.name} (SGC Internal Audit)`,
      specificFindings: "Cash shortage discrepancy of PHP 12,500.00 identified during surprise drawer reconciliation audit without supporting balancing chits.",
      nteSubject: `NOTICE TO EXPLAIN (NTE) — RE: CASH SHORTAGE AUDIT FOR MARIA KRISTINA SANTOS`,
      nteDate: dateFormatted,
      nteBodyParagraph1: `According to the incident report submitted by the Branch HR Admin, Ms. Quennie R. Capuyan of 5A Royal Gaming OPC dated ${dateFormatted}, an unaccounted cash shortage of PHP 12,500.00 was uncovered during internal audit.`,
      nteBodyParagraph2: "Cash shortage discrepancy of PHP 12,500.00 identified during surprise drawer reconciliation audit without supporting balancing chits.",
      nteBodyParagraph3: "As the assigned Branch Cashier & Vault Custodian, you are expected to strictly control company funds and follow established procedures.",
      codeOfConductSection: `Employees Code of Conduct — Offenses Involving Dishonesty, Cash Shortages & Operational Lapses:\n"Any employee who causes or incurs unaccounted shortages, unremitted collections, failure to balance assigned cash floats, or circumvents standard financial control mechanisms shall be subjected to formal administrative disciplinary action."`,
      laborCodeViolation: `Philippine Labor Code (PD 442) Art. 297 Just Causes:\n(a) Serious Misconduct;\n(b) Gross and habitual neglect of duty;\n(c) Fraud or willful breach of trust.`,
      nteDueProcessClause: "In line with procedural due process (DOLE Department Order No. 147-15), you are hereby requested to submit a written explanation within five (5) calendar days upon receipt of this memo.",
      nteConclusion: "Failure to submit your written explanation within the five-day period shall be deemed a waiver of your opportunity to present your side.",
      violationSummaryTitle: "Cash Shortage, Unremitted Funds & Breach of Trust",
      violationSeverity: "SERIOUS OFFENSE",
      nteSignatoryName: sgcHr.name,
      nteSignatoryTitle: sgcHr.title,
      nteSignatoryCompany: "Simpal Group of Companies",
      nteFooterNote: `Simpal Group HRMD 201 File & Records ${new Date().getFullYear()}`
    };

    setSelectedReport(directNteReport);
    setIsNteDraftModalOpen(true);
  };

  // ---------------------------------------------------------------------------
  // RESPONDENT / EMPLOYEE RECEIPT & DIGITAL SIGNATURE HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenSignModal = (report) => {
    setSignReportTarget(report);
    setTypedSignature(report.employeeName || "");
    setSignRemarks(report.respondentRemarks || "I acknowledge receipt of this Incident Report and take notice of its contents.");
    setSignMode("DRAW");
    setIsSignReceiptModalOpen(true);
    setTimeout(() => {
      clearCanvas();
    }, 150);
  };

  const startDrawing = (e) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveRespondentSignature = async () => {
    if (!signReportTarget) return;

    let signatureDataUrl = "";
    if (signMode === "DRAW") {
      const canvas = sigCanvasRef.current;
      if (canvas) {
        signatureDataUrl = canvas.toDataURL("image/png");
      }
    } else {
      // Create off-screen canvas to render stylish typed signature
      const offscreen = document.createElement("canvas");
      offscreen.width = 400;
      offscreen.height = 100;
      const ctx = offscreen.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 100);
      ctx.font = "italic bold 28px 'Dancing Script', 'Brush Script MT', cursive, sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedSignature || signReportTarget.employeeName, 200, 50);
      signatureDataUrl = offscreen.toDataURL("image/png");
    }

    const timestampStr = new Date().toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    const updated = {
      ...signReportTarget,
      respondentSignature: signatureDataUrl,
      respondentSignedAt: timestampStr,
      respondentSignedName: signReportTarget.employeeName,
      respondentRemarks: signRemarks,
      activityLog: [
        ...(signReportTarget.activityLog || []),
        {
          id: `act-sign-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "IR_SIGNED_BY_RESPONDENT",
          actor: `${signReportTarget.employeeName} (Respondent Employee)`,
          message: `Official Incident Report received and digitally signed by respondent ${signReportTarget.employeeName} on ${timestampStr}. Remarks: "${signRemarks}"`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    if (selectedReport && selectedReport.id === updated.id) {
      setSelectedReport(updated);
    }

    setIsSignReceiptModalOpen(false);
    playAiVoiceAnnouncement(`Incident Report receipt confirmed and digitally signed by ${signReportTarget.employeeName}. Conforme stamped onto official case file.`);
  };

  // Helper: Read and compress signature image file to lightweight transparent PNG DataURL
  const handleSignatureUpload = async (file, targetField) => {
    if (!file) return;
    try {
      const transparentDataUrl = await processSignatureToTransparentPng(file, {
        maxDimension: 800,
        adaptiveBackground: true,
        autoCrop: true
      });
      setIrForm((prev) => ({
        ...prev,
        [targetField]: transparentDataUrl
      }));
    } catch (err) {
      console.warn("Signature processing fallback:", err);
      const reader = new FileReader();
      reader.onload = (e) => {
        setIrForm((prev) => ({
          ...prev,
          [targetField]: e.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper: Save current IR signatories as persistent defaults in Database & LocalStorage
  const handleSaveDefaultSignatories = async () => {
    setIsSavingDefaults(true);
    const defs = {
      preparerName: irForm.preparerName || irForm.reportingHrName || "",
      preparerTitle: irForm.preparerTitle || irForm.reportingHrTitle || "Branch HR",
      preparerSignature: irForm.preparerSignature || "",
      operationsManagerName: irForm.operationsManagerName || "Operations Manager",
      operationsManagerTitle: irForm.operationsManagerTitle || "Operations Manager",
      operationsManagerSignature: irForm.operationsManagerSignature || "",
      approvedByName: irForm.approvedByName || irForm.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP",
      approvedByTitle: irForm.approvedByTitle || "HRMD Manager (Head Office)",
      approvedBySignature: irForm.approvedBySignature || "",
      savedAt: new Date().toISOString()
    };
    try {
      await saveDefaultIrSignatories(defs);
      setDefaultSignatories(defs);
      setDefaultsSavedSuccess(true);
      setTimeout(() => setDefaultsSavedSuccess(false), 4500);
    } catch (err) {
      console.error("Failed to save default signatories:", err);
      alert("Failed to save default signatories to database.");
    } finally {
      setIsSavingDefaults(false);
    }
  };

  // 1. Head Office Discretion 1: Add to Filings (File for Record Only)
  const handleOpenAddToFilings = (report) => {
    setSelectedReport(report);
    setFilingRemarksInput("Reviewed by SGC Head Office HRMD. Incident report noted and officially retained for 201 file records. Minor discrepancy resolved on-site without formal disciplinary proceeding.");
    setIsAddToFilingsModalOpen(true);
  };

  const handleConfirmAddToFilings = async () => {
    if (!selectedReport) return;
    const dateNow = new Date().toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    const updated = {
      ...selectedReport,
      status: "FILED_FOR_RECORD",
      filingRemarks: filingRemarksInput,
      filedAt: dateNow,
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-file-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "IR_FILED_FOR_RECORD",
          actor: `${effectiveRole.reportingName} (SGC Head Office HRMD)`,
          message: `Incident Report added to 201 filings for record purposes only. Notes: "${filingRemarksInput}"`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    setIsAddToFilingsModalOpen(false);
    setSelectedReport(updated);
    playAiVoiceAnnouncement(`Incident Report for ${selectedReport.employeeName} has been officially added to 201 filings.`);
  };

  // 2. Branch HR: Upload Employee Signed NTE Proof of Receipt
  const handleOpenUploadNteProof = (report) => {
    setSelectedReport(report);
    setNteProofData({
      fileData: report.nteSignedProof || "",
      fileName: report.nteSignedProofName || "",
      dateServed: new Date().toISOString().slice(0, 10),
      remarks: "Employee personally served physical copy of NTE and affixed signature acknowledging receipt."
    });
    setIsUploadNteProofModalOpen(true);
  };

  const handleSaveNteProof = async () => {
    if (!selectedReport) return;
    if (!nteProofData.fileData) {
      alert("Please upload the scanned copy or photo of the employee's signed Notice to Explain.");
      return;
    }

    const timestampStr = new Date().toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    const updated = {
      ...selectedReport,
      status: "NTE_SERVED_ACKNOWLEDGED",
      nteSignedProof: nteProofData.fileData,
      nteSignedProofName: nteProofData.fileName,
      nteServedAt: nteProofData.dateServed || timestampStr,
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-nte-proof-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "NTE_SIGNED_PROOF_UPLOADED",
          actor: `${effectiveRole.reportingName} (${selectedReport.company || selectedReport.senderCompany} HR)`,
          message: `Employee signed Notice to Explain proof of receipt uploaded by Branch HR (${nteProofData.fileName || "scanned copy"}). Awaiting written explanation.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    setIsUploadNteProofModalOpen(false);
    setSelectedReport(updated);
    playAiVoiceAnnouncement(`Signed Notice to Explain proof of receipt uploaded successfully.`);
  };

  // 3. Head Office Discretion 2A: Issue Notice of Warning
  const handleOpenWarningModal = (report) => {
    setSelectedReport(report);
    setWarningForm({
      penalty: "1st Written Warning & Reprimand",
      subject: `FORMAL NOTICE OF WARNING — RE: INCIDENT INVESTIGATION FOR ${(report.employeeName || "EMPLOYEE").toUpperCase()}`,
      body: `After comprehensive evaluation of the Incident Report, drawer audit discrepancy records, and the written explanation submitted, the Management of Simpal Group of Companies has determined that your conduct warrants an official disciplinary warning.\n\nYou are hereby issued this Written Warning for non-observance of Cashier Standard Operating Procedures (SOPs) and drawer balancing guidelines. Any further non-compliance or future discrepancy shall result in more severe penalties, up to and including suspension or termination of employment under Company Policy and Philippine Labor Code Article 297.`,
      signatoryName: report.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP",
      signatoryTitle: report.assignedCentralHrTitle || "HRMD Manager"
    });
    setIsWarningModalOpen(true);
  };

  const handleIssueNoticeOfWarning = async () => {
    if (!selectedReport) return;
    const dateFormatted = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const updated = {
      ...selectedReport,
      status: "NOTICE_OF_WARNING_ISSUED",
      warningNoticeSubject: warningForm.subject,
      warningNoticePenalty: warningForm.penalty,
      warningNoticeBody: warningForm.body,
      warningIssuedAt: dateFormatted,
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-warn-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "NOTICE_OF_WARNING_ISSUED",
          actor: `${warningForm.signatoryName} (${warningForm.signatoryTitle} - SGC Head Office)`,
          message: `Issued formal Notice of Warning (${warningForm.penalty}) to ${selectedReport.employeeName}. Transmitted to Branch HR for serving.`
        }
      ]
    };
    await saveIncidentReport(updated);
    await loadRecords();
    setIsWarningModalOpen(false);
    setSelectedReport(updated);
    playAiVoiceAnnouncement(`Notice of Warning has been issued by Head Office for ${selectedReport.employeeName}. Returned to branch HR.`);
  };

  // 4. Head Office Discretion 2B: Notice of Investigation (NOI) with REQUIRED Zoom Meeting Schedule
  const handleOpenNoiModal = (report) => {
    setSelectedReport(report);
    const hearingDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    setNoiForm({
      zoomMeetingTopic: `Administrative Investigation Hearing: Case ${report.caseNumber} - ${report.employeeName}`,
      zoomMeetingDate: hearingDate,
      zoomMeetingTime: "10:00 AM PST",
      zoomMeetingLink: `https://zoom.us/j/${Math.floor(80000000000 + Math.random() * 9000000000)}?pwd=SGC${new Date().getFullYear()}`,
      zoomMeetingId: `${Math.floor(812 + Math.random() * 100)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      zoomPasscode: `SGC${new Date().getFullYear()}`,
      hearingCommittee: "SGC Due Process Committee, Legal Counsel & Central HRMD",
      noiRemarks: "You are hereby formally directed to attend the Administrative Hearing via Zoom on the schedule stated below. In accordance with DOLE Department Order No. 147-15, you have the right to be assisted by a representative, lawyer, or union officer if you so desire. Your attendance is mandatory to present your complete evidence and testimony."
    });
    setIsNoiModalOpen(true);
  };

  const handleIssueNoi = async () => {
    if (!selectedReport) return;
    if (!noiForm.zoomMeetingLink || !noiForm.zoomMeetingDate || !noiForm.zoomMeetingTime) {
      alert("Please provide the required Zoom Meeting Date, Time, and Meeting Link.");
      return;
    }
    const dateFormatted = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const updated = {
      ...selectedReport,
      status: "NOI_ISSUED",
      zoomMeetingTopic: noiForm.zoomMeetingTopic,
      zoomMeetingDate: noiForm.zoomMeetingDate,
      zoomMeetingTime: noiForm.zoomMeetingTime,
      zoomMeetingLink: noiForm.zoomMeetingLink,
      zoomMeetingId: noiForm.zoomMeetingId,
      zoomPasscode: noiForm.zoomPasscode,
      hearingCommittee: noiForm.hearingCommittee,
      noiRemarks: noiForm.noiRemarks,
      noiIssuedAt: dateFormatted,
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-noi-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "NOI_ISSUED_WITH_ZOOM_SCHEDULE",
          actor: `SGC Due Process Committee & HRMD`,
          message: `Issued formal Notice of Investigation (NOI) with scheduled Zoom hearing on ${noiForm.zoomMeetingDate} at ${noiForm.zoomMeetingTime}. Zoom Meeting ID: ${noiForm.zoomMeetingId}.`
        }
      ]
    };
    await saveIncidentReport(updated);
    await loadRecords();
    setIsNoiModalOpen(false);
    setSelectedReport(updated);
    playAiVoiceAnnouncement(`Notice of Investigation officially issued with Zoom hearing schedule for ${selectedReport.employeeName}. Transmitted to branch HR and employee.`);
  };

  // 5. Post-NOI: Decision on Administrative Case
  const handleOpenAdminDecisionModal = (report) => {
    setSelectedReport(report);
    setAdminDecisionForm({
      subject: `DECISION ON ADMINISTRATIVE CASE — CASE NO: ${report.caseNumber} (${report.employeeName.toUpperCase()})`,
      findings: "Guilty of Non-observance of Cashier Standard Operating Procedures (SOPs) and Failure to Balance Cash Float",
      penalty: "3-Day Suspension Without Pay & Mandatory Restitution of Funds",
      body: `After due deliberation of the findings of the Administrative Hearing conducted via Zoom on ${report.zoomMeetingDate || "scheduled date"}, taking into account the incident narrative, drawer audit discrepancy sheets, and the respondent's verbal and written submissions, the SGC Due Process Committee hereby issues its official Decision:\n\n1. The Respondent is found ADMINISTRATIVELY LIABLE for deviation from standard cash custody procedures.\n2. In accordance with the Company Employees Code of Conduct and Labor Code Due Process standards, the respondent is meted the sanction of Suspension Without Pay and required to settle the outstanding shortage amount through authorized salary installment deductions.\n\nThis decision is final, executory, and entered into the employee's permanent 201 personnel records.`,
      signatoryName: report.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP",
      signatoryTitle: report.assignedCentralHrTitle || "HRMD Manager"
    });
    setIsAdminDecisionModalOpen(true);
  };

  const handleIssueAdminDecision = async () => {
    if (!selectedReport) return;
    const dateFormatted = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const updated = {
      ...selectedReport,
      status: "ADMIN_DECISION_ISSUED",
      adminDecisionSubject: adminDecisionForm.subject,
      adminDecisionFindings: adminDecisionForm.findings,
      adminDecisionPenalty: adminDecisionForm.penalty,
      adminDecisionBody: adminDecisionForm.body,
      adminDecisionIssuedAt: dateFormatted,
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-decision-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "ADMIN_DECISION_ISSUED",
          actor: `${adminDecisionForm.signatoryName} (SGC Head Office HRMD)`,
          message: `Head Office issued official Decision on Administrative Case (${adminDecisionForm.penalty}). Sent to Branch HR for personal serving and signed employee acknowledgment.`
        }
      ]
    };
    await saveIncidentReport(updated);
    await loadRecords();
    setIsAdminDecisionModalOpen(false);
    setSelectedReport(updated);
    playAiVoiceAnnouncement(`Decision on Administrative Case issued by Head Office. Returned to branch HR for serving and final employee acknowledgment.`);
  };

  // 6. Branch HR: Upload Employee Signed Decision Proof & Close Case
  const handleOpenUploadDecisionProof = (report) => {
    setSelectedReport(report);
    setDecisionProofData({
      fileData: report.decisionSignedProof || "",
      fileName: report.decisionSignedProofName || "",
      dateServed: new Date().toISOString().slice(0, 10),
      remarks: "Employee personally served copy of Administrative Case Decision, signed acknowledgment copy affixed."
    });
    setIsUploadDecisionProofModalOpen(true);
  };

  const handleSaveDecisionProofAndCloseCase = async () => {
    if (!selectedReport) return;
    if (!decisionProofData.fileData) {
      alert("Please upload the signed copy of the Administrative Decision signed by the employee.");
      return;
    }

    const timestampStr = new Date().toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    const updated = {
      ...selectedReport,
      status: "CASE_CLOSED",
      decisionSignedProof: decisionProofData.fileData,
      decisionSignedProofName: decisionProofData.fileName,
      decisionSignedAt: decisionProofData.dateServed || timestampStr,
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-closed-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "CASE_CLOSED_DUE_PROCESS_COMPLETED",
          actor: `${effectiveRole.reportingName} (${selectedReport.company || selectedReport.senderCompany} HR)`,
          message: `Employee signed copy of the Administrative Decision successfully uploaded. Case is now officially CLOSED and ARCHIVED in compliance with Philippine Due Process.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    setIsUploadDecisionProofModalOpen(false);
    setSelectedReport(updated);
    playAiVoiceAnnouncement(`Administrative decision signed and acknowledged by employee. Case is officially closed and archived.`);
  };

  // Purge test / mock data to start with pure live process
  const handleClearAllMockData = async () => {
    if (window.confirm("Purge all incident reports to start with a completely clean process?")) {
      await clearAllIncidentReports();
      setReports([]);
      setSelectedReport(null);
      playAiVoiceAnnouncement("All test records purged. You are now starting with a completely clean incident reporting process.");
    }
  };

  const handleSaveAndReturnNte = async (updatedDraft) => {
    const senderCompany = selectedReport.senderCompany || selectedReport.company || "5A Royal Gaming OPC";
    const senderHrName = selectedReport.senderHrName || selectedReport.reportingHrName || "Area HR Admin";

    const updated = {
      ...selectedReport,
      ...updatedDraft,
      status: "NTE_ISSUED", // NTE Approved by SGC Head Office and returned to Branch HR
      nteIssuedAt: new Date().toISOString(),
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "NTE_ISSUED_BY_HEAD_OFFICE",
          actor: `${updatedDraft.nteSignatoryName} (${updatedDraft.nteSignatoryTitle} - SGC Head Office)`,
          message: `Simpal Group of Companies (Head Office) HRMD evaluated and issued the official Notice to Explain. Returned to ${senderCompany} HR (${senderHrName}) for serving to employee.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    setIsNteDraftModalOpen(false);
    setSelectedReport(updated);

    // Voice announcement
    const announcement = `Approved and returned! Official Notice to Explain has been issued by Simpal Group of Companies Head Office and dispatched back to ${senderCompany} HR ${senderHrName}. Please serve the document to ${updated.employeeName}.`;
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
          message: `Notice to Explain served to ${report.employeeName} by ${senderComp} HR. The one-working-day explanation period is active.`
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
          message: `Received written explanation from ${report.employeeName} at ${senderComp}. Transmitted to Simpal Group of Companies Head Office HRMD for final administrative hearing determination.`
        }
      ]
    };

    await saveIncidentReport(updated);
    await loadRecords();
    setIsExplanationModalOpen(false);

    // Voice announcement
    const announcement = `Employee written explanation has been received and transmitted to Simpal Group of Companies Head Office for administrative ruling on case ${report.caseNumber}.`;
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

  // Print Document Trigger: Dedicated Long Bond Paper (8.5in x 13in) Printing
  const handlePrintDocument = () => {
    const styleId = "long-bond-paper-print-style";
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      @page {
        size: 8.5in 13in portrait !important;
        margin: 0 !important;
      }
      @media print {
        html, body {
          width: 8.5in !important;
          height: 13in !important;
          max-height: 13in !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body * {
          visibility: hidden !important;
        }
        .no-print,
        .no-print * {
          display: none !important;
          visibility: hidden !important;
        }
        #printable-incident-report-sheet,
        #printable-incident-report-sheet * {
          visibility: visible !important;
        }
        #printable-incident-report-sheet {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 8.5in !important;
          height: 13in !important;
          max-width: 8.5in !important;
          max-height: 13in !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 10mm 12mm 8mm 12mm !important;
          background: #ffffff !important;
          border: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          transform: none !important;
          overflow: hidden !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          z-index: 999999 !important;
        }
      }
    `;

    document.body.classList.add("printing-incident-report");
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove("printing-incident-report");
        if (styleEl) {
          styleEl.remove();
        }
      }, 1000);
    }, 150);
  };

  // Pending counts for live hero indicators
  const pendingSgcReviewCount = reports.filter((r) => r.status === "SUBMITTED_TO_CENTRAL_HR").length;
  const nteReadyToServeCount = reports.filter((r) => r.status === "NTE_ISSUED").length;
  const activeDueProcessCount = reports.filter((r) => r.status === "SERVED_TO_EMPLOYEE").length;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. LOGGED-IN ACCOUNT IDENTITY & ROLE BANNER                                */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Identity of Logged-In User */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Signed In:</span>
            <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {currentUser?.name || currentUser?.email || "HR Officer"}
            </span>
          </div>

          <span className="text-xs text-slate-300 hidden sm:inline">•</span>

          {/* Role Status Tag */}
          {effectiveRole.isHeadOffice ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
              <Building2 size={13} className="text-emerald-700" />
              Head Office HRMD (Simpal Group of Companies)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-black text-xs bg-[#eef7e5] text-[#55782a] border border-[#d3eab8] shadow-2xs">
              <Briefcase size={13} className="text-[#8cb84a]" />
              Branch HR ({effectiveRole.company})
            </span>
          )}
        </div>

        {/* Right side: Action button strictly corresponding to the logged-in account */}
        <div className="flex items-center gap-2 flex-wrap">
          {effectiveRole.isHeadOffice ? (
            <button
              type="button"
              onClick={handleOpenDirectSgcNte}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-600 hover:to-teal-500 text-slate-950 shadow-xs transition cursor-pointer active:scale-98"
              title="Simpal Group of Companies (Head Office) Issue Notice to Explain"
            >
              <Building2 size={14} className="text-slate-950 font-bold" />
              <span>Simpal Group (Issue NTE)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#8cb84a] hover:bg-[#7ea741] text-white shadow-xs transition cursor-pointer active:scale-98"
              title="Transmit Incident Report to Head Office (Simpal Group of Companies)"
            >
              <SendHorizontal size={14} className="text-white font-bold" />
              <span>Transmit IR ➔ Head Office</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadRecords(false)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition cursor-pointer shadow-2xs disabled:opacity-50"
            title={`Realtime Feed Live. Last synchronized: ${lastSyncedTime || "just now"}`}
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync Cloud"}</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllMockData}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
            title="Purge all test/mock data to start with a completely clean process"
          >
            <Trash2 size={13} className="text-rose-600" />
            <span className="hidden sm:inline">Clean Process</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DISTINCT HERO VIEWS: HEAD OFFICE (SGC) vs SUBSIDIARY BRANCH HR         */}
      {/* ========================================================================= */}
      {effectiveRole.isHeadOffice ? (
        /* ======================== HEAD OFFICE HRMD VIEW ======================== */
        <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-800/40 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Head Office Executive Command Center
                </span>
                <span className="text-xs text-slate-400">
                  Simpal Group of Companies (SGC HRMD)
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                Central Due Process & NTE Issuance Desk
              </h1>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                As the <strong>Head Office</strong>, you receive all Incident Reports transmitted from branch subsidiaries (5A Royal, Lucky Betplay, SIMCON, etc.). You evaluate allegations, apply the Employees Code of Conduct and Labor Code Art. 297, and legally issue the official <strong>Notice to Explain (NTE)</strong> back to branch HR for serving.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  voiceMutedState
                    ? "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                    : "bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-md shadow-emerald-500/30"
                }`}
              >
                {voiceMutedState ? <VolumeX size={15} /> : <Volume2 size={15} className="animate-pulse" />}
                <span>{voiceMutedState ? "Voice Muted" : "Head Office AI Voice Active"}</span>
              </button>

              {/* Simpal Group of Companies Action Button */}
              <button
                type="button"
                onClick={handleOpenDirectSgcNte}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-slate-950 shadow-lg shadow-emerald-500/20 transition cursor-pointer active:scale-98"
              >
                <Building2 size={16} className="text-slate-950 font-black" />
                <span>Simpal Group of Companies • Issue Notice to Explain (NTE)</span>
              </button>
            </div>
          </div>

          {/* SGC Head Office Live Action Alert Banner */}
          {pendingSgcReviewCount > 0 && (
            <div className="mt-5 p-3.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-200 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Inbox size={18} />
                </div>
                <div>
                  <strong className="text-amber-100 font-extrabold text-sm">
                    {pendingSgcReviewCount} Incoming Incident Report{pendingSgcReviewCount > 1 ? "s" : ""} Awaiting NTE Evaluation!
                  </strong>
                  <p className="text-[11px] text-amber-300/90 mt-0.5">
                    Transmitted by branch companies. Review evidence and issue official Notice to Explain to start due process.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveFilter("PENDING_SGC_REVIEW")}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-400 text-slate-950 hover:bg-amber-300 transition cursor-pointer shrink-0"
              >
                Review Inbox ({pendingSgcReviewCount})
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ======================== SUBSIDIARY BRANCH HR VIEW ======================== */
        <div className="bg-gradient-to-br from-[#7ea741] via-[#8cb84a] to-[#55782a] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  Branch Outbox & Case Tracker
                </span>
                <span className="text-xs text-white/90 font-bold">
                  {effectiveRole.company}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {effectiveRole.company} • Incident Report Outbox
              </h1>
              <p className="text-xs text-white/90 max-w-2xl leading-relaxed">
                As the <strong>Branch HR</strong>, you investigate on-site cash shortages and SOP breaches. You file the Incident Report (IR) and <strong>transmit it directly to Head Office (Simpal Group of Companies)</strong>. Once Head Office issues the official Notice to Explain (NTE), it returns here so you can serve it to the employee!
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  voiceMutedState
                    ? "bg-white/10 text-white/80 border-white/20 hover:bg-white/20"
                    : "bg-white text-[#55782a] font-black shadow-md"
                }`}
              >
                {voiceMutedState ? <VolumeX size={15} /> : <Volume2 size={15} className="animate-pulse" />}
                <span>{voiceMutedState ? "Voice Muted" : "Branch AI Voice Active"}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-slate-950 hover:bg-slate-900 text-white shadow-xl transition cursor-pointer active:scale-98"
              >
                <SendHorizontal size={16} className="text-emerald-400" />
                <span>Transmit Incident Report ➔ Head Office (SGC)</span>
              </button>
            </div>
          </div>

          {/* Branch HR Live Action Alert: When NTE is returned from Head Office */}
          {nteReadyToServeCount > 0 && (
            <div className="mt-5 p-3.5 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/40 text-white flex items-center justify-between gap-3 text-xs animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white text-[#55782a] flex items-center justify-center font-black shrink-0">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <strong className="text-white font-extrabold text-sm">
                    {nteReadyToServeCount} Notice to Explain (NTE) Returned from Head Office SGC!
                  </strong>
                  <p className="text-[11px] text-white/90 mt-0.5">
                    Official NTEs are approved and ready to be printed and served to employee on-site.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveFilter("NTE_RETURNED")}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-white text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0 shadow-sm"
              >
                View Returned NTEs ({nteReadyToServeCount})
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PIPELINE METRIC CARDS                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
            <FileText size={22} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {effectiveRole.isHeadOffice ? "All Group IR Cases" : "Branch IR Transmissions"}
            </div>
            <div className="text-2xl font-black text-slate-900">{filteredReports.length}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {effectiveRole.isHeadOffice ? "Pending SGC Evaluation" : "Under SGC Review"}
            </div>
            <div className="text-2xl font-black text-amber-600">{pendingSgcReviewCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              NTE Approved & Returned
            </div>
            <div className="text-2xl font-black text-emerald-600">{nteReadyToServeCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
            <Scale size={22} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Active Due Process Clock
            </div>
            <div className="text-2xl font-black text-blue-600">{activeDueProcessCount}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1">
          {[
            { id: "ALL", label: "All Cases", count: filteredReports.length },
            {
              id: "PENDING_SGC",
              label: effectiveRole.isHeadOffice ? "Pending SGC Evaluation" : "Sent to Head Office (SGC)",
              count: reports.filter((r) => r.status === "SUBMITTED_TO_CENTRAL_HR").length,
              badgeColor: "bg-amber-100 text-amber-800"
            },
            {
              id: "FILED_RECORD",
              label: "201 Filings",
              count: reports.filter((r) => r.status === "FILED_FOR_RECORD").length,
              badgeColor: "bg-slate-100 text-slate-800"
            },
            {
              id: "NTE_STAGE",
              label: "NTE Stage",
              count: reports.filter(
                (r) =>
                  r.status === "NTE_ISSUED" ||
                  r.status === "NTE_SERVED_ACKNOWLEDGED" ||
                  r.status === "SERVED_TO_EMPLOYEE"
              ).length,
              badgeColor: "bg-emerald-100 text-emerald-800"
            },
            {
              id: "EXPLANATION",
              label: "Explanations",
              count: reports.filter((r) => r.status === "EXPLANATION_RECEIVED").length,
              badgeColor: "bg-purple-100 text-purple-800"
            },
            {
              id: "NOI_ZOOM",
              label: "NOI / Zoom Hearings",
              count: reports.filter(
                (r) => r.status === "NOI_ISSUED" || r.status === "NOTICE_OF_WARNING_ISSUED"
              ).length,
              badgeColor: "bg-indigo-100 text-indigo-800"
            },
            {
              id: "DECISION_CLOSED",
              label: "Decisions & Closed",
              count: reports.filter(
                (r) =>
                  r.status === "ADMIN_DECISION_ISSUED" ||
                  r.status === "CASE_CLOSED" ||
                  r.status === "CASE_RESOLVED"
              ).length,
              badgeColor: "bg-teal-100 text-teal-800"
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
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#8cb84a] focus:border-transparent bg-slate-50/50"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ACTIVE CASE LIST (TAILORED TO ROLE)                                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileText size={14} className="text-slate-500" />
            {effectiveRole.isHeadOffice
              ? "Head Office Central Incident & NTE Records"
              : `${effectiveRole.company} Branch Due Process Records`} ({filteredReports.length})
          </span>
          <span className="text-[11px] text-slate-400">
            {effectiveRole.isHeadOffice ? "Head Office Authority Mode" : "Branch Outbox Mode"}
          </span>
        </div>

        {filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <ShieldAlert size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700">No incident reports found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are no records matching your current filter in this role view.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              {effectiveRole.isHeadOffice ? (
                <button
                  type="button"
                  onClick={handleOpenDirectSgcNte}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 inline-flex items-center gap-2 hover:from-emerald-400 hover:to-teal-300 cursor-pointer shadow-md active:scale-98"
                >
                  <Building2 size={15} className="text-slate-950 font-bold" />
                  <span>Simpal Group of Companies • Issue Notice to Explain (NTE)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#8cb84a] text-white inline-flex items-center gap-2 hover:bg-[#7ea741] cursor-pointer shadow-md active:scale-98"
                >
                  <SendHorizontal size={15} className="text-white" />
                  <span>+ Transmit Incident Report ➔ Head Office (SGC)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReports.map((report) => {
              const isPendingSgc = report.status === "SUBMITTED_TO_CENTRAL_HR";
              const isFiledForRecord = report.status === "FILED_FOR_RECORD";
              const isNteIssued = report.status === "NTE_ISSUED";
              const isNteAcknowledged = report.status === "NTE_SERVED_ACKNOWLEDGED";
              const isServed = report.status === "SERVED_TO_EMPLOYEE";
              const isExplanation = report.status === "EXPLANATION_RECEIVED";
              const isWarning = report.status === "NOTICE_OF_WARNING_ISSUED";
              const isNoi = report.status === "NOI_ISSUED";
              const isAdminDecision = report.status === "ADMIN_DECISION_ISSUED";
              const isClosed = report.status === "CASE_CLOSED" || report.status === "CASE_RESOLVED";
              const senderComp = report.senderCompany || report.company || "Subsidiary Company";
              const senderHr = report.senderHrName || report.reportingHrName || "Area HR Admin";
              const receiverComp = report.receiverCompany || "Simpal Group of Companies";
              const receiverHr = report.receiverHrName || report.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP";

              return (
                <div
                  key={report.id}
                  className="p-4 md:p-5 hover:bg-slate-50/80 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left Side */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {report.caseNumber}
                      </span>

                      {/* Status Badges with role awareness */}
                      {isPendingSgc && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={12} />
                          {effectiveRole.isHeadOffice
                            ? "📥 Incoming IR: Transmitted from " + senderComp
                            : "📤 Outbox: Transmitted to SGC Head Office"}
                        </span>
                      )}
                      {isFiledForRecord && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          <CheckCircle2 size={12} className="text-slate-500" />
                          📁 Filed for 201 Record Only
                        </span>
                      )}
                      {isNteIssued && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                          <CheckCircle2 size={12} />
                          {effectiveRole.isHeadOffice
                            ? "NTE Issued ➔ Dispatched to " + senderComp
                            : "📥 Returned from Head Office SGC (Awaiting Signed Proof)"}
                        </span>
                      )}
                      {isNteAcknowledged && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          <CheckCheck size={12} className="text-teal-600" />
                          ✅ NTE Served & Signed (Proof Uploaded)
                        </span>
                      )}
                      {isServed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock size={12} />
                          Served to Employee (Active 5-Day Period)
                        </span>
                      )}
                      {isExplanation && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <CheckCircle2 size={12} />
                          Written Explanation Received (Awaiting SGC Evaluation)
                        </span>
                      )}
                      {isWarning && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          <AlertTriangle size={12} className="text-amber-700" />
                          ⚠️ Notice of Warning Issued
                        </span>
                      )}
                      {isNoi && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 animate-pulse">
                          <Scale size={12} className="text-indigo-600" />
                          🔍 Formal Investigation (NOI via Zoom)
                        </span>
                      )}
                      {isAdminDecision && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
                          <FileText size={12} className="text-rose-600" />
                          ⚖️ Decision on Administrative Case Issued
                        </span>
                      )}
                      {isClosed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <CheckCheck size={12} className="text-emerald-700" />
                          ✅ Case Closed & Archived
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400">
                        Incident Date: {report.dateOfIncident || report.auditDates}
                      </span>
                    </div>

                    {/* Employee & Subject */}
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <span>{report.employeeName}</span>
                        <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {report.employeePosition || "Cashier"}
                        </span>
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 mt-1 mb-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 border border-slate-200/80">
                          <Building2 size={11} className="text-slate-400" />
                          {report.department || "Finance & Cashier Operations"}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 border border-slate-200/80">
                          <Smartphone size={11} className="text-slate-400" />
                          {report.phoneNumber || "+63 917 842 9102"}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 border border-slate-200/80">
                          <MapPin size={11} className="text-slate-400" />
                          <span className="truncate max-w-[260px]">{report.branch || "Tacurong Branch"}</span>
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 font-semibold mt-0.5 flex items-center gap-1.5">
                        <AlertTriangle size={13} />
                        <span>Category: {report.incidentCategory}</span>
                        {report.cashShortageAmount && (
                          <span className="font-bold bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded text-[11px]">
                            Shortage: PHP {report.cashShortageAmount}
                          </span>
                        )}
                      </p>

                      {/* Transmitted Incident Details Preview */}
                      {(report.specificFindings || report.specific_findings || report.fullIncidentNarrative) && (
                        <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200/90 text-xs text-slate-700 leading-relaxed max-w-2xl">
                          <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-500 block mb-0.5">
                            INCIDENT DETAILS:
                          </span>
                          <p className="line-clamp-2 italic text-slate-800">
                            "{report.specificFindings || report.specific_findings || report.fullIncidentNarrative}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Sender vs Receiver Routing Bar */}
                    <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-slate-500">ORIGIN:</span>
                        <strong className="text-slate-900">{senderComp}</strong>
                        <span className="text-slate-500">({senderHr})</span>
                      </div>

                      <ArrowRight size={13} className="text-slate-400" />

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600">HEAD OFFICE:</span>
                        <strong className="text-emerald-950">{receiverComp}</strong>
                        <span className="text-emerald-700">({receiverHr})</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Role-Aware Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Voice Summary */}
                    <button
                      type="button"
                      onClick={() => {
                        const summary = `Case ${report.caseNumber}. Issued by ${senderComp} HR ${senderHr} for ${report.employeeName}. Sent to ${receiverComp} Head Office HRMD. Status: ${
                          isPendingSgc
                            ? "Awaiting Head Office SGC Notice to Explain issuance."
                            : isNteIssued
                            ? "Notice to Explain has been issued by SGC and returned to branch HR for serving."
                            : isServed
                            ? "Notice to Explain has been served to employee."
                            : "Written explanation received."
                        }`;
                        playAiVoiceAnnouncement(summary);
                      }}
                      title="Speak summary via AI Buddy"
                      className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition cursor-pointer"
                    >
                      <Volume2 size={16} />
                    </button>

                    {/* View Incident Report Form (Green button) */}
                    <button
                      type="button"
                      onClick={() => handleViewIrDocument(report)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#8cb84a] hover:bg-[#7ea741] text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FileText size={14} />
                      <span>View IR Form</span>
                    </button>

                    {/* 1. SGC HEAD OFFICE EVALUATION OF IR (Pending Stage) */}
                    {effectiveRole.isHeadOffice && isPendingSgc && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Option A: Add to Filings only */}
                        <button
                          type="button"
                          onClick={() => handleOpenAddToFilings(report)}
                          className="px-3.5 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs transition cursor-pointer inline-flex items-center gap-1.5 active:scale-98"
                          title="SGC Head Office Discretion: File for 201 records only without disciplinary proceeding"
                        >
                          <span>📁 Add to Filings</span>
                        </button>

                        {/* Option B: Proceed to Notice to Explain */}
                        <button
                          type="button"
                          onClick={() => handleOpenDraftNte(report)}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transition cursor-pointer inline-flex items-center gap-1.5 active:scale-98"
                          title="SGC Head Office Discretion: Issue official Notice to Explain (NTE)"
                        >
                          <Scale size={14} />
                          <span>⚖️ Proceed to Notice to Explain</span>
                        </button>
                      </div>
                    )}

                    {/* Subsidiary HR when pending: Indicates it is in Head Office hands */}
                    {!effectiveRole.isHeadOffice && isPendingSgc && (
                      <span className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                        <Clock size={13} />
                        <span>Awaiting Head Office (SGC) Evaluation</span>
                      </span>
                    )}

                    {/* 2. FILED FOR RECORD VIEW */}
                    {isFiledForRecord && (
                      <button
                        type="button"
                        onClick={() =>
                          alert(
                            `📁 201 FILING RECORD NOTES:\n\nFiled On: ${
                              report.filedAt || "Recorded"
                            }\nRemarks: ${
                              report.filingRemarks ||
                              "Retained in HR 201 files for record purposes only."
                            }`
                          )
                        }
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>📁 View Filing Notes</span>
                      </button>
                    )}

                    {/* 3. NTE ISSUED STAGE: View NTE + Branch HR Upload Signed Proof */}
                    {(isNteIssued || isNteAcknowledged || isServed || isExplanation || isWarning || isNoi || isAdminDecision || isClosed) && (
                      <button
                        type="button"
                        onClick={() => handleViewNteDocument(report)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Eye size={14} />
                        <span>View Official NTE</span>
                      </button>
                    )}

                    {/* Branch HR: Upload Employee-Signed NTE Proof of Receipt */}
                    {isNteIssued && (
                      <button
                        type="button"
                        onClick={() => handleOpenUploadNteProof(report)}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition cursor-pointer inline-flex items-center gap-1.5 active:scale-98 animate-pulse"
                        title="Upload photo or scan of the employee's signed copy acknowledging receipt of the NTE"
                      >
                        <FileSignature size={14} />
                        <span>📤 Upload Signed NTE Proof</span>
                      </button>
                    )}

                    {/* Branch HR: Log Employee Written Explanation once signed proof is uploaded or served */}
                    {(isNteAcknowledged || isServed) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {report.nteSignedProof && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedReport(report);
                              setIsUploadNteProofModalOpen(true);
                            }}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition cursor-pointer inline-flex items-center gap-1"
                            title="View employee signed NTE receipt proof"
                          >
                            <Paperclip size={13} className="text-teal-600" />
                            <span>Signed NTE Proof</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(report);
                            setIsExplanationModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <FileCheck size={14} />
                          <span>📝 Log Explanation ➔ SGC</span>
                        </button>
                      </div>
                    )}

                    {/* 4. SGC HEAD OFFICE EVALUATION OF EXPLANATION */}
                    {isExplanation && effectiveRole.isHeadOffice && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Option A: Issue Notice of Warning */}
                        <button
                          type="button"
                          onClick={() => handleOpenWarningModal(report)}
                          className="px-3.5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition cursor-pointer inline-flex items-center gap-1.5"
                          title="SGC Head Office Discretion: End proceeding with Notice of Warning"
                        >
                          <AlertTriangle size={14} />
                          <span>⚠️ Issue Notice of Warning</span>
                        </button>

                        {/* Option B: Proceed to Notice of Investigation (NOI) with required Zoom Schedule */}
                        <button
                          type="button"
                          onClick={() => handleOpenNoiModal(report)}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition cursor-pointer inline-flex items-center gap-1.5"
                          title="SGC Head Office Discretion: Proceed to formal Notice of Investigation and schedule Zoom hearing"
                        >
                          <Scale size={14} />
                          <span>🔍 Proceed to NOI (Zoom Hearing)</span>
                        </button>
                      </div>
                    )}

                    {isExplanation && !effectiveRole.isHeadOffice && (
                      <span className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 inline-flex items-center gap-1.5">
                        <Clock size={13} />
                        <span>Under SGC Head Office Evaluation</span>
                      </span>
                    )}

                    {/* 5. NOTICE OF WARNING ISSUED */}
                    {isWarning && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReport(report);
                          setIsWarningModalOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <AlertTriangle size={14} className="text-amber-700" />
                        <span>⚠️ View Warning Notice</span>
                      </button>
                    )}

                    {/* 6. NOTICE OF INVESTIGATION (NOI) & ZOOM HEARING */}
                    {isNoi && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* View Zoom Schedule button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(report);
                            setIsZoomViewerOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition cursor-pointer inline-flex items-center gap-1.5"
                          title="View Zoom Meeting Schedule & Join Link"
                        >
                          <span>🎥 View Zoom Hearing Schedule</span>
                        </button>

                        {/* SGC Head Office can issue Decision of Administrative Case */}
                        {effectiveRole.isHeadOffice && (
                          <button
                            type="button"
                            onClick={() => handleOpenAdminDecisionModal(report)}
                            className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 transition cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <Scale size={14} />
                            <span>⚖️ Issue Decision on Admin Case</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* 7. DECISION ON ADMINISTRATIVE CASE ISSUED */}
                    {isAdminDecision && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(report);
                            setIsAdminDecisionModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <FileText size={14} />
                          <span>View Admin Decision</span>
                        </button>

                        {/* Branch HR serves decision to employee & uploads employee-signed copy to CLOSE CASE */}
                        <button
                          type="button"
                          onClick={() => handleOpenUploadDecisionProof(report)}
                          className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition cursor-pointer inline-flex items-center gap-1.5 animate-pulse"
                          title="Branch HR serves decision to employee, gets employee signature, and uploads proof to close case"
                        >
                          <FileSignature size={14} />
                          <span>📤 Upload Signed Decision & Close Case</span>
                        </button>
                      </div>
                    )}

                    {/* 8. CASE CLOSED */}
                    {isClosed && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(report);
                            if (report.decisionSignedProof) {
                              setIsUploadDecisionProofModalOpen(true);
                            } else {
                              setIsAdminDecisionModalOpen(true);
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <CheckCheck size={14} className="text-emerald-700" />
                          <span>✅ View Closed Case & Signed Proof</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 0: ROLE PERMISSION MATRIX MODAL                                     */}
      {/* ========================================================================= */}
      {isPermissionMatrixOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Role & Permission Matrix: Head Office vs Subsidiary HR
                  </h2>
                  <p className="text-xs text-slate-500">
                    Legal Due Process Mandate (Labor Code Art. 297 & SGC Group Corporate Governance)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPermissionMatrixOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
              <p className="text-slate-600 leading-relaxed">
                This matrix governs the separation of functions between the <strong>Head Office (Simpal Group of Companies)</strong> and <strong>Subsidiary Branch HR officers</strong>. This enforces impartiality, due process integrity, and legal validity of disciplinary actions.
              </p>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-[11px] font-black uppercase text-slate-700 tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Function / Action</th>
                      <th className="py-3 px-4 text-[#55782a] bg-[#eef7e5]">
                        🏢 Subsidiary HR (Branch Outbox)
                      </th>
                      <th className="py-3 px-4 text-emerald-900 bg-emerald-100/70">
                        🏛️ Head Office HRMD (SGC Command)
                      </th>
                      <th className="py-3 px-4 text-slate-600">Legal Due Process Basis</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        1. Investigate & Issue Incident Report (IR)
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold bg-[#eef7e5]/50">
                        ✅ AUTHORIZED (Primary Duty)
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold bg-emerald-50/50">
                        ✅ AUTHORIZED (Direct Cases)
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        First-hand physical fact-finding on shortages / SOP breaches.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        2. View Cross-Entity Incident Reports
                      </td>
                      <td className="py-3 px-4 text-rose-600 font-bold bg-[#eef7e5]/50">
                        ❌ RESTRICTED (Own Entity Only)
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold bg-emerald-50/50">
                        ✅ FULL ACCESS (All Subsidiaries)
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Head Office executive oversight of corporate group compliance.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        3. Issue Official Notice to Explain (NTE)
                      </td>
                      <td className="py-3 px-4 text-rose-600 font-bold bg-[#eef7e5]/50">
                        ❌ STRICTLY RESTRICTED
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold bg-emerald-50/50">
                        ✅ EXCLUSIVE LEGAL AUTHORITY
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Guarantees legal vetting of citations (Art. 297 & Section 18 SOPs).
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        4. Return Issued NTE to Branch HR
                      </td>
                      <td className="py-3 px-4 text-slate-400 bg-[#eef7e5]/50">
                        N/A (Recipient of NTE)
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold bg-emerald-50/50">
                        ✅ AUTHORIZED
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Dispatches signed memo for on-site physical service.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        5. Physically Serve NTE to Employee
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold bg-[#eef7e5]/50">
                        ✅ AUTHORIZED (Primary Duty)
                      </td>
                      <td className="py-3 px-4 text-slate-600 bg-emerald-50/50">
                        ✅ (Direct Head Office staff)
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Receipt block signature & 1-working-day due process clock initiation.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        6. Log Employee Written Explanation
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold bg-[#eef7e5]/50">
                        ✅ AUTHORIZED (Forwards to SGC)
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold bg-emerald-50/50">
                        ✅ AUTHORIZED
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Employee written defense submission into HR 201 File.
                      </td>
                    </tr>

                    <tr>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        7. Render Administrative Hearing & Close Case
                      </td>
                      <td className="py-3 px-4 text-rose-600 font-bold bg-[#eef7e5]/50">
                        ❌ RESTRICTED
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-bold bg-emerald-50/50">
                        ✅ EXCLUSIVE AUTHORITY
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        Final penalty, suspension, repayment schedule, or clearance.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsPermissionMatrixOpen(false)}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white cursor-pointer"
                >
                  Close Matrix
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW INCIDENT REPORT (Subsidiary HR -> SGC HRMD)            */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Green Banner */}
            <div className="bg-[#96c158] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src="/logos/lucky_betplay_sun.png"
                  alt="Lucky Betplay Logo"
                  className="w-10 h-10 object-contain bg-white rounded-lg p-0.5 shadow-xs shrink-0"
                />
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white leading-none">
                    INCIDENT REPORT
                  </h2>
                  <p className="text-[11px] text-white/90 font-medium mt-0.5">
                    Transmitted to Simpal Group of Companies (Head Office HRMD) for Notice to Explain (NTE)
                  </p>
                </div>
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
                      2. RECEIVER: Head Office Notice to Explain (NTE) Authority
                    </label>
                    <div className="text-xs font-black text-emerald-950 p-2 bg-emerald-50/70 rounded-lg border border-emerald-200">
                      Simpal Group of Companies (Head Office HRMD)
                    </div>

                    <div className="mt-2 text-[11px] text-emerald-800 flex items-center gap-1.5">
                      <User size={12} className="text-emerald-600 shrink-0" />
                      <span><strong>Executive Reviewer:</strong> {irForm.assignedCentralHrName} ({irForm.assignedCentralHrTitle})</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1: EMPLOYEE INFORMATION */}
              <div className="space-y-4">
                <div className="bg-[#153459] text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <User size={15} />
                  <span>EMPLOYEE INFORMATION</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* FULL NAME */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        FULL NAME <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. MA. CATHRINA PANIZARES"
                          value={irForm.employeeName}
                          onChange={(e) => setIrForm({ ...irForm, employeeName: e.target.value.toUpperCase() })}
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] font-bold text-slate-900 transition"
                        />
                      </div>
                    </div>

                    {/* EMPLOYEE ID */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        EMPLOYEE ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EMP-2026-084"
                        value={irForm.employeeId}
                        onChange={(e) => setIrForm({ ...irForm, employeeId: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900 transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* DEPARTMENT / UNIT */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        DEPARTMENT / UNIT
                      </label>
                      <div className="relative">
                        <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Finance & Cashier Operations"
                          value={irForm.department}
                          onChange={(e) => setIrForm({ ...irForm, department: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900 transition"
                        />
                      </div>
                    </div>

                    {/* POSITION */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        POSITION
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cashier"
                        value={irForm.employeePosition}
                        onChange={(e) => setIrForm({ ...irForm, employeePosition: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* AREA / BRANCH */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        AREA / BRANCH
                      </label>
                      <div className="relative">
                        <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. Tacurong Branch"
                          value={irForm.branch}
                          onChange={(e) => setIrForm({ ...irForm, branch: e.target.value, location: e.target.value })}
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900 transition"
                        />
                      </div>
                    </div>

                    {/* PHONE NUMBER */}
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
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: INCIDENT DETAILS */}
              <div className="space-y-4 pt-1">
                <div className="bg-[#153459] text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <FileText size={15} />
                  <span>INCIDENT DETAILS</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                  {/* Date, Time, Location */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        DATE OF INCIDENT
                      </label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={irForm.dateOfIncident}
                          onChange={(e) => setIrForm({ ...irForm, dateOfIncident: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        TIME OF INCIDENT
                      </label>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. 16:30 PM"
                          value={irForm.incidentTime}
                          onChange={(e) => setIrForm({ ...irForm, incidentTime: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900"
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
                          value={irForm.location}
                          onChange={(e) => setIrForm({ ...irForm, location: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Factual Description of the Incident */}
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                      FACTUAL DESCRIPTION OF THE INCIDENT <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Detailed chronological narrative of what occurred, factors leading to it, and specific findings..."
                      value={irForm.factualDescription || irForm.specificFindings}
                      onChange={(e) => setIrForm({ ...irForm, factualDescription: e.target.value, specificFindings: e.target.value, fullIncidentNarrative: e.target.value })}
                      className="w-full p-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900 leading-relaxed custom-scrollbar transition font-medium"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      State precisely the date, time, actions taken, discrepancy found, and personnel involved.
                    </p>
                  </div>

                  {/* Witnesses (if any) */}
                  <div>
                    <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                      WITNESSES (IF ANY)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe (Supervisor), Jane Smith (Area Auditor)"
                      value={irForm.witnesses}
                      onChange={(e) => setIrForm({ ...irForm, witnesses: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900 transition"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: VIOLATION (Exact Corporate Layout) */}
              <div className="space-y-4 pt-1">
                <div 
                  className="bg-[#c81e1e] text-white px-4 py-2 font-black text-xs uppercase tracking-wider flex items-center gap-2 rounded-t-xl"
                  style={{ clipPath: "polygon(0 0, 100% 0, 95% 100%, 0 100%)", paddingRight: "30px" }}
                >
                  <AlertTriangle size={15} />
                  <span>VIOLATION</span>
                </div>

                <div className="p-4 rounded-b-2xl rounded-tr-2xl bg-[#fff5f5] border border-[#fecaca] shadow-2xs space-y-4">
                  <p className="text-xs italic font-semibold text-slate-700">
                    Please indicate the specific policy, rule, or standard that was violated:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {/* Column 1 */}
                    <div className="space-y-2.5 p-3 rounded-xl bg-white/80 border border-rose-100">
                      {[
                        "Company Policies and Procedures",
                        "STL Operations and Draw Process",
                        "Sales / Booth Operations",
                        "Ticket Management"
                      ].map((item) => {
                        const isChecked = Array.isArray(irForm.violations) && irForm.violations.includes(item);
                        return (
                          <label
                            key={item}
                            onClick={() => handleToggleViolation(item)}
                            className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer select-none hover:text-[#c81e1e] transition"
                          >
                            <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center shrink-0 transition ${isChecked ? "bg-[#c81e1e] border-[#c81e1e] text-white" : "bg-white border-slate-400"}`}>
                              {isChecked && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="leading-snug">{item}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-2.5 p-3 rounded-xl bg-white/80 border border-rose-100">
                      {[
                        "Cash Handling / Collection",
                        "Data Privacy / Confidentiality",
                        "Attendance / Punctuality",
                        "Code of Conduct"
                      ].map((item) => {
                        const isChecked = Array.isArray(irForm.violations) && irForm.violations.includes(item);
                        return (
                          <label
                            key={item}
                            onClick={() => handleToggleViolation(item)}
                            className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer select-none hover:text-[#c81e1e] transition"
                          >
                            <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center shrink-0 transition ${isChecked ? "bg-[#c81e1e] border-[#c81e1e] text-white" : "bg-white border-slate-400"}`}>
                              {isChecked && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="leading-snug">{item}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Column 3: Other & Remarks */}
                    <div className="space-y-3 p-3 rounded-xl bg-white/80 border border-rose-100">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Other (please specify)
                        </label>
                        <input
                          type="text"
                          placeholder="Specific breach or policy..."
                          value={irForm.otherViolation}
                          onChange={(e) => setIrForm({ ...irForm, otherViolation: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-1 focus:ring-[#c81e1e]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Remarks (if any)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Additional context or remarks..."
                          value={irForm.violationRemarks}
                          onChange={(e) => setIrForm({ ...irForm, violationRemarks: e.target.value })}
                          className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:ring-1 focus:ring-[#c81e1e] leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ATTACHMENTS / EVIDENCE */}
              <div className="space-y-4 pt-1">
                <div className="bg-[#153459] text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2">
                  <Paperclip size={15} />
                  <span>ATTACHMENTS / EVIDENCE</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Column 1 */}
                    <div className="space-y-2.5">
                      {[
                        "Photos (if any)",
                        "Reports / Logs",
                        "System Records / CCTV (if any)"
                      ].map((item) => {
                        const isChecked = Array.isArray(irForm.attachments) && irForm.attachments.includes(item);
                        return (
                          <label
                            key={item}
                            onClick={() => handleToggleAttachment(item)}
                            className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer select-none hover:text-[#153459] transition"
                          >
                            <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center shrink-0 transition ${isChecked ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                              {isChecked && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span>{item}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Column 2 */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Other (please specify)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Audit reconciliation discrepancy sheet"
                        value={irForm.otherAttachments}
                        onChange={(e) => setIrForm({ ...irForm, otherAttachments: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PREPARER & OPERATIONS MANAGER E-SIGNATURE UPLOAD SECTION */}
              <div className="space-y-4 pt-2">
                <div className="text-center">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center justify-center gap-2">
                    <FileSignature size={16} className="text-[#8cb84a]" />
                    <span>E-Signature Endorsement (Prepared By & Operations Manager)</span>
                  </h3>
                  <div className="w-16 h-0.5 bg-[#96c158] mx-auto mt-1 rounded-full" />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Upload digital signatures to authenticate the Incident Report before transmitting to SGC Head Office.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. PREPARED BY (Branch HR / Originator) */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <User size={13} className="text-slate-500" />
                        <span>Prepared By (Reporter / HR)</span>
                      </label>
                      {irForm.preparerSignature && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ E-Sig Uploaded
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Preparer Full Name"
                        value={irForm.preparerName}
                        onChange={(e) => setIrForm({ ...irForm, preparerName: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="Preparer Designation / Title"
                        value={irForm.preparerTitle}
                        onChange={(e) => setIrForm({ ...irForm, preparerTitle: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
                      />
                    </div>

                    {irForm.preparerSignature ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center relative group">
                        <img
                          src={irForm.preparerSignature}
                          alt="Preparer E-Signature"
                          className="max-h-16 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setIrForm({ ...irForm, preparerSignature: "" })}
                          className="mt-1.5 text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                        >
                          Remove / Replace Signature
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-[#8cb84a] rounded-xl bg-slate-50/50 hover:bg-[#eef7e5]/30 cursor-pointer transition">
                        <FileSignature size={20} className="text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Upload Preparer E-Sig</span>
                        <span className="text-[10px] text-slate-400">Click to choose image file (PNG/JPG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSignatureUpload(e.target.files[0], "preparerSignature")}
                        />
                      </label>
                    )}
                  </div>

                  {/* 2. OPERATIONS MANAGER / MANAGER */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Briefcase size={13} className="text-slate-500" />
                        <span>Operations Manager / Manager</span>
                      </label>
                      {irForm.operationsManagerSignature && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          ✓ E-Sig Uploaded
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Manager Full Name"
                        value={irForm.operationsManagerName}
                        onChange={(e) => setIrForm({ ...irForm, operationsManagerName: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 font-bold text-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="Manager Title (e.g. Operations Manager)"
                        value={irForm.operationsManagerTitle}
                        onChange={(e) => setIrForm({ ...irForm, operationsManagerTitle: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
                      />
                    </div>

                    {irForm.operationsManagerSignature ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center relative group">
                        <img
                          src={irForm.operationsManagerSignature}
                          alt="Operations Manager E-Signature"
                          className="max-h-16 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setIrForm({ ...irForm, operationsManagerSignature: "" })}
                          className="mt-1.5 text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                        >
                          Remove / Replace Signature
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-[#8cb84a] rounded-xl bg-slate-50/50 hover:bg-[#eef7e5]/30 cursor-pointer transition">
                        <FileSignature size={20} className="text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Upload Operations Manager E-Sig</span>
                        <span className="text-[10px] text-slate-400">Click to choose image file (PNG/JPG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleSignatureUpload(e.target.files[0], "operationsManagerSignature")}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Save Signatories as Default Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl mt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="text-xs text-emerald-950 font-medium">
                      {defaultsSavedSuccess ? (
                        <strong className="text-emerald-700">✓ Naka-save na bilang Default Signatories sa Database!</strong>
                      ) : (
                        <span>I-set bilang default signatories para automatic nang may e-signature at pangalan sa bawat susunod na IR.</span>
                      )}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isSavingDefaults}
                    onClick={handleSaveDefaultSignatories}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Save size={14} />
                    <span>{isSavingDefaults ? "Saving..." : "Set as Default Signatories"}</span>
                  </button>
                </div>
              </div>

              {/* SECTION 3: FOR OFFICIAL USE ONLY (Head Office Only) */}
              {effectiveRole.isHeadOffice && (
                <div className="space-y-4 pt-2">
                  <div className="text-center">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                      FOR OFFICIAL USE ONLY
                    </h3>
                    <div className="w-12 h-0.5 bg-[#96c158] mx-auto mt-1 rounded-full" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* REPORT RECEIVED BY (SGC Head Office) */}
                    <div className="p-3 rounded-xl bg-[#eef7e5] border border-[#d8eac2]">
                      <label className="block text-[10px] font-extrabold uppercase tracking-wide text-[#55782a] mb-1">
                        REPORT RECEIVED BY (SGC HEAD OFFICE HRMD)
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
                      <strong>Designated Receiver:</strong> Simpal Group of Companies (Head Office HRMD)
                    </span>
                  </div>
                </div>
              )}

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
                  <span>Transmit IR to Head Office (Simpal Group of Companies)</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full h-[90vh] sm:h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Controls Bar - COMPLETELY HIDDEN WHEN PRINTING */}
            <div className="px-5 py-3 border-b border-slate-200 bg-slate-100 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800">
                  {selectedReport.caseNumber}
                </span>
                <span className="text-xs font-bold text-slate-700">Official Incident Report Form</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full hidden sm:inline-flex items-center gap-1">
                  📄 Philippine Long Bond Paper (8.5" × 13")
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice speech */}
                <button
                  type="button"
                  onClick={() => {
                    const speech = `Official Incident Report for ${selectedReport.employeeName} of ${selectedReport.senderCompany || selectedReport.company}. Incident occurred on ${selectedReport.dateOfIncident || "September 24, 2026"} at ${selectedReport.branch || "Tacurong Branch"}. Transmitted to Simpal Group of Companies Head Office for Notice to Explain issuance.`;
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
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#8cb84a] hover:bg-[#7ea741] text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Printer size={15} />
                  <span>Print Bond Paper (Long)</span>
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
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 pb-32 sm:pb-44 bg-slate-300/60 flex justify-center custom-scrollbar">
              <div 
                id="printable-incident-report-sheet"
                className="bg-white w-full max-w-[816px] min-h-[1248px] p-6 sm:p-10 shadow-2xl border border-slate-300 rounded-xs text-slate-900 font-sans relative flex flex-col justify-between"
              >
                {/* Top Right Corner Geometric Diagonal Stripes */}
                <div className="absolute top-0 right-0 w-36 h-28 pointer-events-none overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 144 112" fill="none">
                    <polygon points="60,0 144,0 144,84" fill="#0f2b48" />
                    <polygon points="38,0 52,0 144,72 144,84" fill="#c81e1e" />
                    <polygon points="22,0 30,0 134,112 126,112" fill="#0f2b48" />
                  </svg>
                </div>

                <div className="space-y-5 relative z-10">
                  {/* ============================================================== */}
                  {/* HEADER SECTION: LOGO + TITLE + REPORT NO / DATE FILED BOX      */}
                  {/* ============================================================== */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                    {/* Left: Company Logo & Branding */}
                    <div className="flex items-center gap-3">
                      {/* Official Lucky Betplay Sun Logo */}
                      <img
                        src="/logos/lucky_betplay_sun.png"
                        alt="Lucky Betplay Corporation Logo"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0"
                      />

                      <div>
                        <h2 className="text-lg sm:text-xl font-black tracking-tight text-[#c81e1e] uppercase leading-none">
                          {selectedReport.senderCompany || selectedReport.company || "LUCKY BETPLAY"}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-3.5 h-0.5 bg-[#0f2b48]" />
                          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-[#0f2b48]">
                            CORPORATION
                          </span>
                          <div className="w-3.5 h-0.5 bg-[#0f2b48]" />
                        </div>
                      </div>
                    </div>

                    {/* Center: Main Title Block */}
                    <div className="border-l-2 border-[#0f2b48] pl-4 sm:pl-5 my-auto">
                      <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-[#0f2b48] leading-none">
                        INCIDENT REPORT
                      </h1>
                      <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-slate-600 mt-0.5">
                        EMPLOYEE VIOLATION
                      </div>
                      <p className="text-[10px] italic text-slate-500 mt-0.5">
                        A safe and respectful workplace is everyone's responsibility.
                      </p>
                    </div>

                    {/* Right: Report No. & Date Filed Box */}
                    <div className="bg-[#f0f4f9] border border-[#d2e0ee] rounded-md p-2.5 min-w-[180px] text-xs font-semibold text-slate-800 space-y-1.5 shrink-0 self-start sm:self-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 min-w-[70px]">Report No. :</span>
                        <span className="font-mono font-bold text-[#0f2b48] border-b border-slate-300 flex-1 pb-0.5">
                          {selectedReport.caseNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 min-w-[70px]">Date Filed :</span>
                        <span className="font-semibold text-slate-800 border-b border-slate-300 flex-1 pb-0.5">
                          {selectedReport.dateReported || selectedReport.createdAt?.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================== */}
                  {/* 1. EMPLOYEE INFORMATION                                        */}
                  {/* ============================================================== */}
                  <div className="space-y-0">
                    <div className="bg-[#153459] text-white px-3.5 py-1.5 rounded-t-md font-black text-xs uppercase tracking-wider flex items-center gap-2">
                      <User size={14} className="text-white" />
                      <span>EMPLOYEE INFORMATION</span>
                    </div>

                    <div className="bg-[#f4f7fb] border border-t-0 border-[#d0dbe7] rounded-b-md p-3.5 sm:p-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                        {/* Left Column */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-700 min-w-[85px]">Full Name :</span>
                            <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                              {selectedReport.employeeName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-700 min-w-[85px]">Employee ID :</span>
                            <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                              {selectedReport.employeeId || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-700 min-w-[85px]">Position :</span>
                            <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                              {selectedReport.employeePosition || "Cashier"}
                            </span>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-700 min-w-[115px]">Department / Unit :</span>
                            <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                              {selectedReport.department || "Finance & Operations"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-700 min-w-[115px]">Area / Branch :</span>
                            <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5 truncate">
                              {selectedReport.branch || selectedReport.branchLocation || "Tacurong Branch"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================== */}
                  {/* 2. INCIDENT DETAILS                                            */}
                  {/* ============================================================== */}
                  <div className="space-y-0">
                    <div className="bg-[#153459] text-white px-3.5 py-1.5 rounded-t-md font-black text-xs uppercase tracking-wider flex items-center gap-2">
                      <FileText size={14} className="text-white" />
                      <span>INCIDENT DETAILS</span>
                    </div>

                    <div className="bg-[#f4f7fb] border border-t-0 border-[#d0dbe7] rounded-b-md p-3.5 sm:p-4 text-xs space-y-3.5">
                      {/* Row 1: Date, Time, Location */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-[#153459] shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-700">Date of Incident :</span>
                          <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                            {selectedReport.dateOfIncident || selectedReport.auditDates || "—"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-[#153459] shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-700">Time of Incident :</span>
                          <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                            {selectedReport.incidentTime || "16:30 PM"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-[#153459] shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-700">Location :</span>
                          <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5 truncate">
                            {selectedReport.location || selectedReport.branch || "Tacurong Branch"}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Factual Description of the Incident */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                          <FileText size={13} className="text-[#153459]" />
                          <span>Factual Description of the Incident:</span>
                        </div>
                        <div
                          className="w-full p-2.5 text-xs text-slate-900 leading-[26px] min-h-[90px] whitespace-pre-wrap rounded-sm"
                          style={{
                            backgroundImage: "linear-gradient(to bottom, transparent 25px, #d1d5db 26px)",
                            backgroundSize: "100% 26px"
                          }}
                        >
                          {selectedReport.factualDescription || selectedReport.specificFindings || selectedReport.fullIncidentNarrative || "During surprise drawer reconciliation audit, a physical cash shortage was uncovered. The personnel on duty could not produce balancing vouchers or valid justification for the discrepancy."}
                        </div>
                      </div>

                      {/* Row 3: Witnesses (if any) */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                          <Users size={13} className="text-[#153459]" />
                          <span>Witnesses (if any):</span>
                        </div>
                        <div
                          className="w-full p-2.5 text-xs text-slate-900 leading-[26px] min-h-[55px] whitespace-pre-wrap rounded-sm"
                          style={{
                            backgroundImage: "linear-gradient(to bottom, transparent 25px, #d1d5db 26px)",
                            backgroundSize: "100% 26px"
                          }}
                        >
                          {selectedReport.witnesses || "None reported / Attached to internal audit file."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================== */}
                  {/* 3. VIOLATION (Exact Corporate Look)                            */}
                  {/* ============================================================== */}
                  <div className="space-y-0">
                    <div className="flex items-center">
                      <div
                        className="bg-[#c81e1e] text-white px-4 py-1.5 font-black text-xs uppercase tracking-wider flex items-center gap-2 rounded-t-md"
                        style={{ clipPath: "polygon(0 0, 100% 0, 92% 100%, 0 100%)", paddingRight: "28px" }}
                      >
                        <AlertTriangle size={14} className="text-white shrink-0" />
                        <span>VIOLATION</span>
                      </div>
                    </div>

                    <div className="bg-[#fef2f2] border border-[#fecaca] rounded-b-md p-3.5 sm:p-4 text-xs space-y-3">
                      <p className="text-[11px] italic font-semibold text-slate-700">
                        Please indicate the specific policy, rule, or standard that was violated.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-1">
                        {/* Column 1 */}
                        <div className="space-y-2">
                          {[
                            "Company Policies and Procedures",
                            "STL Operations and Draw Process",
                            "Sales / Booth Operations",
                            "Ticket Management"
                          ].map((item) => {
                            const isChecked = Array.isArray(selectedReport.violations)
                              ? selectedReport.violations.includes(item)
                              : true;
                            return (
                              <div key={item} className="flex items-center gap-2.5 text-[11px] text-slate-800 font-medium">
                                <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center shrink-0 ${isChecked ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                                  {isChecked && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span>{item}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-2">
                          {[
                            "Cash Handling / Collection",
                            "Data Privacy / Confidentiality",
                            "Attendance / Punctuality",
                            "Code of Conduct"
                          ].map((item) => {
                            const isChecked = Array.isArray(selectedReport.violations)
                              ? selectedReport.violations.includes(item)
                              : true;
                            return (
                              <div key={item} className="flex items-center gap-2.5 text-[11px] text-slate-800 font-medium">
                                <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center shrink-0 ${isChecked ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                                  {isChecked && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span>{item}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Column 3: Other & Remarks */}
                        <div className="space-y-2.5 border-t md:border-t-0 md:border-l border-rose-200 pt-2 md:pt-0 md:pl-4">
                          <div className="flex items-center gap-2 text-[11px]">
                            <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center shrink-0 ${selectedReport.otherViolation ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                              {selectedReport.otherViolation && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="font-semibold text-slate-700 whitespace-nowrap">Other (please specify)</span>
                          </div>
                          <div className="border-b border-slate-300 pb-0.5 text-xs text-slate-900 font-semibold min-h-[18px]">
                            {selectedReport.otherViolation || ""}
                          </div>

                          <div className="pt-1">
                            <div className="text-[10px] font-bold text-slate-700 mb-1">Remarks (if any):</div>
                            <div
                              className="w-full p-1.5 text-xs text-slate-800 leading-[24px] min-h-[48px] whitespace-pre-wrap"
                              style={{
                                backgroundImage: "linear-gradient(to bottom, transparent 23px, #cbd5e1 24px)",
                                backgroundSize: "100% 24px"
                              }}
                            >
                              {selectedReport.violationRemarks || (selectedReport.cashShortageAmount ? `Incurred unaccounted cash shortage of PHP ${selectedReport.cashShortageAmount}.` : "")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================== */}
                  {/* 4. ATTACHMENTS / EVIDENCE                                      */}
                  {/* ============================================================== */}
                  <div className="space-y-0">
                    <div className="bg-[#153459] text-white px-3.5 py-1.5 rounded-t-md font-black text-xs uppercase tracking-wider flex items-center gap-2">
                      <Paperclip size={14} className="text-white" />
                      <span>ATTACHMENTS / EVIDENCE</span>
                    </div>

                    <div className="bg-[#f4f7fb] border border-t-0 border-[#d0dbe7] rounded-b-md p-3.5 sm:p-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Column 1 */}
                        <div className="space-y-2">
                          {[
                            "Photos (if any)",
                            "Reports / Logs",
                            "System Records / CCTV (if any)"
                          ].map((item) => {
                            const isChecked = Array.isArray(selectedReport.attachments)
                              ? selectedReport.attachments.includes(item)
                              : true;
                            return (
                              <div key={item} className="flex items-center gap-2.5 text-[11px] text-slate-800 font-medium">
                                <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center shrink-0 ${isChecked ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                                  {isChecked && <Check size={12} strokeWidth={3} />}
                                </div>
                                <span>{item}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[11px]">
                            <div className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center shrink-0 ${selectedReport.otherAttachments ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                              {selectedReport.otherAttachments && <Check size={12} strokeWidth={3} />}
                            </div>
                            <span className="font-semibold text-slate-700">Other (please specify)</span>
                          </div>
                          <div
                            className="w-full p-1.5 text-xs text-slate-800 leading-[24px] min-h-[48px] whitespace-pre-wrap"
                            style={{
                              backgroundImage: "linear-gradient(to bottom, transparent 23px, #cbd5e1 24px)",
                              backgroundSize: "100% 24px"
                            }}
                          >
                            {selectedReport.otherAttachments || selectedReport.additionalNotes || "Attached physical audit reconciliation count discrepancy sheet."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================== */}
                  {/* 5. SIGNATURES / ENDORSEMENTS (Prepared By, Reviewed, Approved) */}
                  {/* ============================================================== */}
                  <div className="bg-[#f4f7fb] border border-[#d0dbe7] rounded-md p-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* 1. Prepared by */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-800 block">Prepared by:</span>
                        <div className="h-16 flex items-center justify-center border-b border-slate-300 pb-1">
                          {selectedReport.preparerSignature ? (
                            <img
                              src={selectedReport.preparerSignature}
                              alt="Preparer E-Sig"
                              className="max-h-14 object-contain"
                            />
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">(Signed on file)</span>
                          )}
                        </div>
                        <div className="text-center pt-0.5">
                          <div className="text-[11px] font-extrabold text-slate-900 uppercase">
                            {selectedReport.preparerName || selectedReport.senderHrName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Name / Position ({selectedReport.preparerTitle || "Branch HR"})
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200 text-[10px]">
                          <span className="text-slate-500 font-semibold">Date:</span>
                          <span className="text-slate-900 font-medium">{selectedReport.dateReported || selectedReport.createdAt?.slice(0, 10)}</span>
                        </div>
                      </div>

                      {/* 2. Reviewed by */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-800 block">Reviewed by:</span>
                        <div className="h-16 flex items-center justify-center border-b border-slate-300 pb-1">
                          {selectedReport.operationsManagerSignature ? (
                            <img
                              src={selectedReport.operationsManagerSignature}
                              alt="Manager E-Sig"
                              className="max-h-14 object-contain"
                            />
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">(Signed on file)</span>
                          )}
                        </div>
                        <div className="text-center pt-0.5">
                          <div className="text-[11px] font-extrabold text-slate-900 uppercase">
                            {selectedReport.operationsManagerName || "Operations Manager"}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Name / Position ({selectedReport.operationsManagerTitle || "Area Operations Manager"})
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200 text-[10px]">
                          <span className="text-slate-500 font-semibold">Date:</span>
                          <span className="text-slate-900 font-medium">{selectedReport.dateReported || selectedReport.createdAt?.slice(0, 10)}</span>
                        </div>
                      </div>

                      {/* 3. Approved by */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-800 block">Approved by:</span>
                        <div className="h-16 flex items-center justify-center border-b border-slate-300 pb-1">
                          {selectedReport.approvedBySignature ? (
                            <img
                              src={selectedReport.approvedBySignature}
                              alt="Approver E-Sig"
                              className="max-h-14 object-contain"
                            />
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">(Simpal Group of Companies HRMD)</span>
                          )}
                        </div>
                        <div className="text-center pt-0.5">
                          <div className="text-[11px] font-extrabold text-slate-900 uppercase">
                            {selectedReport.approvedByName || selectedReport.receiverHrName || "JEVINCE JAYE S. JUBAY, CHRP"}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Name / Position ({selectedReport.approvedByTitle || "HRMD Manager"})
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200 text-[10px]">
                          <span className="text-slate-500 font-semibold">Date:</span>
                          <span className="text-slate-900 font-medium">{selectedReport.reportReceivedDate || selectedReport.dateReported || selectedReport.createdAt?.slice(0, 10)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RESPONDENT ACKNOWLEDGMENT (Only shown if signed conformed) */}
                  {Boolean(selectedReport.respondentSignature) && (
                    <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-extrabold uppercase text-slate-800">Respondent Conforme (Signed Receipt)</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Officially Signed</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <img src={selectedReport.respondentSignature} alt="Respondent Signature" className="max-h-12 object-contain" />
                        <div className="text-xs">
                          <strong className="text-slate-900 block">{selectedReport.respondentSignedName || selectedReport.employeeName}</strong>
                          <span className="text-[10px] text-slate-500">{selectedReport.respondentSignedAt || "Signed receipt"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ============================================================== */}
                {/* FOOTER: CONFIDENTIAL + GEOMETRIC ACCENT STRIPES               */}
                {/* ============================================================== */}
                <div className="relative pt-6 pb-2 mt-4 border-t border-slate-200">
                  <div className="flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                    <div className="w-16 h-px bg-slate-400" />
                    <span>CONFIDENTIAL — INTERNAL USE ONLY</span>
                    <div className="w-16 h-px bg-slate-400" />
                  </div>

                  {/* Bottom Right Corner Geometric Stripes */}
                  <div className="absolute bottom-0 right-0 w-36 h-20 pointer-events-none overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 144 80" fill="none">
                      <polygon points="144,0 144,80 60,80" fill="#0f2b48" />
                      <polygon points="144,12 144,24 52,80 38,80" fill="#c81e1e" />
                      <polygon points="134,0 126,0 22,80 30,80" fill="#0f2b48" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SIMPAL GROUP OF COMPANIES (HEAD OFFICE) ISSUE NTE                 */}
      {/* ========================================================================= */}
      {isNteDraftModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                  <Scale size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Head Office SGC HRMD: Issue Official Notice to Explain (NTE)
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
                <strong>Simpal Group of Companies (Head Office) Instruction:</strong> Review the incident details submitted by {selectedReport.senderCompany} HR ({selectedReport.senderHrName || selectedReport.reportingHrName}). Once issued, this official NTE will be legally stamped and returned to the originating company HR for formal serving to {selectedReport.employeeName}.
              </div>

              {/* Transmitted Incident Details Reference Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-inner">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-[#8cb84a]" />
                    <span>Transmitted Incident Details (from {selectedReport.senderCompany || selectedReport.company} HR)</span>
                  </span>
                  {selectedReport.cashShortageAmount && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-100 text-rose-800">
                      Shortage: PHP {selectedReport.cashShortageAmount}
                    </span>
                  )}
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {selectedReport.specificFindings ||
                    selectedReport.specific_findings ||
                    selectedReport.fullIncidentNarrative ||
                    selectedReport.full_incident_narrative ||
                    "During surprise drawer reconciliation audit, a physical cash shortage was uncovered. The personnel on duty could not produce balancing vouchers or valid justification for the discrepancy."}
                </div>
              </div>

              {/* Professional Manual Due Process & Legal Reference Suite */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold">
                      <Scale size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Human HR Due Process & Legal Citation Suite
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Full manual editorial control. Type your text freely or click quick reference chips to insert standard statutory clauses.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    MANUAL DRAFTING
                  </span>
                </div>

                {/* Quick Insert Buttons for Code of Conduct */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                    Quick Reference: Insert Code of Conduct Grounds
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const coc = document.getElementById("nte-code-of-conduct");
                        if (coc) {
                          coc.value = `Employees Code of Conduct — Offenses Involving Dishonesty, Cash Shortages & Fiduciary Trust:\n"Any employee who causes or incurs unaccounted shortages, unremitted collections, failure to balance assigned cash floats, or circumvents standard financial control mechanisms shall be subjected to formal administrative disciplinary action."`;
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-400 transition cursor-pointer"
                    >
                      + Dishonesty & Cash Shortage
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const coc = document.getElementById("nte-code-of-conduct");
                        if (coc) {
                          coc.value = `Employees Code of Conduct — Offenses Involving Negligence & Procedural Non-Compliance:\n"Gross or habitual failure to follow established Standard Operating Procedures (SOPs), cash-handling manuals, or daily drawer reconciliation policies."`;
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-400 transition cursor-pointer"
                    >
                      + SOP Lapses & Drawer Reconciliation
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const coc = document.getElementById("nte-code-of-conduct");
                        if (coc) {
                          coc.value = `Employees Code of Conduct — Offenses Involving Insubordination & Unauthorized Financial Acts:\n"Willful refusal to comply with audit directives, releasing unauthorized advances or IOUs, or concealing transactional records."`;
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-400 transition cursor-pointer"
                    >
                      + Insubordination & Unauthorized IOUs
                    </button>
                  </div>
                </div>

                {/* Quick Insert Buttons for Labor Code */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                    Quick Reference: Insert Philippine Labor Code (PD 442 Art. 297) Grounds
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const lc = document.getElementById("nte-labor-code");
                        if (lc) {
                          lc.value = `Philippine Labor Code (PD 442), Article 297(c) [Termination by Employer - Just Causes]:\n"Fraud or willful breach by the employee of the trust reposed in him by his employer or duly authorized representative."`;
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-400 transition cursor-pointer"
                    >
                      + Art. 297(c): Breach of Trust / Fraud
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lc = document.getElementById("nte-labor-code");
                        if (lc) {
                          lc.value = `Philippine Labor Code (PD 442), Article 297(b) [Termination by Employer - Just Causes]:\n"Gross and habitual neglect by the employee of his duties."`;
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-400 transition cursor-pointer"
                    >
                      + Art. 297(b): Gross & Habitual Neglect
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const lc = document.getElementById("nte-labor-code");
                        if (lc) {
                          lc.value = `Philippine Labor Code (PD 442), Article 297(a) [Termination by Employer - Just Causes]:\n"Serious Misconduct or willful disobedience by the employee of the lawful orders of his employer or representative in connection with his work."`;
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-amber-50 text-slate-700 border border-slate-200 hover:border-amber-400 transition cursor-pointer"
                    >
                      + Art. 297(a): Serious Misconduct
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  1. Incident & Audit Findings Citation
                </label>
                <textarea
                  rows={3}
                  defaultValue={
                    selectedReport.nteBodyParagraph1 ||
                    `According to the incident report submitted by the ${selectedReport.reportingHrTitle || selectedReport.senderHrTitle || "HR Admin"}, ${selectedReport.reportingHrName || selectedReport.senderHrName || "Branch HR"} of ${selectedReport.senderCompany || selectedReport.company} dated ${selectedReport.dateReported || "today"}, it was found that you have an outstanding cash shortage of PHP ${selectedReport.cashShortageAmount || "0.00"} during the audit conducted on ${selectedReport.auditDates || "scheduled audit"}, by the ${selectedReport.auditedBy || "Internal Audit"}.`
                  }
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
                  defaultValue={
                    selectedReport.nteBodyParagraph2 ||
                    selectedReport.specificFindings ||
                    selectedReport.specific_findings ||
                    selectedReport.fullIncidentNarrative ||
                    selectedReport.full_incident_narrative ||
                    "It was also noted that certain unauthorized advance transactions and shortages remained uncleared and were not immediately addressed at the time of the audit."
                  }
                  id="nte-para-2"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  3. Positional Trust & Fiduciary Responsibility
                </label>
                <textarea
                  rows={2}
                  defaultValue={
                    selectedReport.nteBodyParagraph3 ||
                    `These circumstances raise serious concerns regarding your cash handling, accountability, and compliance with Company SOPs. As the assigned ${selectedReport.employeePosition || "Cashier"}, you are expected to strictly control company funds, follow established procedures, and promptly address shortages and irregular transactions.`
                  }
                  id="nte-para-3"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Company Employees Code of Conduct Citation
                </label>
                <textarea
                  rows={4}
                  defaultValue={selectedReport.codeOfConductSection}
                  id="nte-code-of-conduct"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  5. Philippine Labor Code Statutory Grounds (PD 442 Art. 297)
                </label>
                <textarea
                  rows={3}
                  defaultValue={selectedReport.laborCodeViolation}
                  id="nte-labor-code"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  6. Due Process Clause (DOLE 5-Day Twin-Notice Rule)
                </label>
                <textarea
                  rows={2}
                  defaultValue={
                    selectedReport.nteDueProcessClause ||
                    "In line with due process (DOLE Department Order No. 147-15), you are hereby requested to submit a written explanation within five (5) calendar days upon receipt of this memo, explaining why you should not be disciplined or meted penalties under the Employees Code of Conduct and the Labor Code."
                  }
                  id="nte-due-process"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Head Office SGC Signatory Name
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
                  type="submit"
                  onClick={() => {
                    const p1 = document.getElementById("nte-para-1").value;
                    const p2 = document.getElementById("nte-para-2").value;
                    const p3 = document.getElementById("nte-para-3").value;
                    const coc = document.getElementById("nte-code-of-conduct").value;
                    const lc = document.getElementById("nte-labor-code").value;
                    const dp = document.getElementById("nte-due-process").value;
                    const sigName = document.getElementById("nte-sig-name").value;
                    const sigTitle = document.getElementById("nte-sig-title").value;

                    handleSaveAndReturnNte({
                      nteBodyParagraph1: p1,
                      nteBodyParagraph2: p2,
                      nteBodyParagraph3: p3,
                      codeOfConductSection: coc,
                      laborCodeViolation: lc,
                      nteDueProcessClause: dp,
                      violationSummaryTitle: selectedReport.violationSummaryTitle || "Cash Shortage, Unremitted Funds & Breach of Trust",
                      violationSeverity: selectedReport.violationSeverity || "SERIOUS OFFENSE",
                      nteSignatoryName: sigName,
                      nteSignatoryTitle: sigTitle
                    });
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Send size={15} />
                  <span>Head Office SGC: Approve & Return NTE to {selectedReport.senderCompany || selectedReport.company} HR</span>
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
                <span className="text-xs font-bold text-slate-700">Official Notice to Explain (Issued by Head Office SGC)</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice speech */}
                <button
                  type="button"
                  onClick={() => {
                    const speech = `Official Notice to Explain issued by Simpal Group of Companies Head Office for ${selectedReport.employeeName}. Date: ${selectedReport.nteDate || "September 28, 2026"}. In line with due process, you are hereby requested to submit a written explanation within one working day upon receipt of this memo.`;
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

                  <p className="text-slate-800">
                    {selectedReport.nteDueProcessClause ||
                      "In line with due process (DOLE Department Order No. 147-15), you are hereby requested to submit your written explanation within five (5) calendar days upon receipt of this memo. Given the above allegations, explain why you should not be disciplined and found liable under the Employees Code of Conduct and the Labor Code."}
                  </p>

                  {/* Dynamic Code of Conduct Citation */}
                  <div className="pl-4 border-l-4 border-amber-500 bg-amber-50/60 p-3.5 rounded-r-xl space-y-1.5 my-3">
                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                      EMPLOYEES CODE OF CONDUCT VIOLATION CHARGE:
                    </p>
                    <div className="font-semibold text-slate-900 whitespace-pre-wrap text-xs sm:text-[13px] leading-relaxed">
                      {selectedReport.codeOfConductSection ||
                        "Section 14. Offenses Against Honesty, Financial Custodianship & Company Property."}
                    </div>
                  </div>

                  {/* Dynamic Philippine Labor Code Grounds */}
                  <div className="pl-4 border-l-4 border-blue-600 bg-blue-50/60 p-3.5 rounded-r-xl space-y-1.5 my-3">
                    <p className="text-[11px] font-black uppercase tracking-wider text-blue-900">
                      PHILIPPINE LABOR CODE (PD 442 AS AMENDED) STATUTORY GROUNDS:
                    </p>
                    <div className="text-slate-900 whitespace-pre-wrap text-xs sm:text-[13px] leading-relaxed">
                      {selectedReport.laborCodeViolation ||
                        "Article 297 [formerly Art. 282] (Termination by Employer / Just Causes): Serious Misconduct, Gross Neglect of Duties, and Fraud / Loss of Confidence."}
                    </div>
                  </div>

                  <p className="text-slate-800 whitespace-pre-wrap">
                    {selectedReport.nteConclusion ||
                      "Therefore, failure on your part to submit a written explanation within the mandatory period shall be considered an admission of the foregoing allegation.\n\nFor your strict Compliance."}
                  </p>
                </div>

                {/* 4. Signatory Block (Issued by Simpal Group of Companies Head Office HRMD) */}
                <div className="mt-10 pt-4">
                  <div className="space-y-0.5">
                    <p className="font-black text-sm uppercase tracking-wide text-slate-900">
                      {selectedReport.nteSignatoryName || "JEVINCE JAYE S. JUBAY, CHRP"}
                    </p>
                    <p className="text-xs text-slate-700 font-medium">
                      {selectedReport.nteSignatoryTitle || "HRMD Manager"}
                    </p>
                    <p className="text-xs text-slate-700">
                      Simpal Group of Companies (Head Office) / {selectedReport.senderCompany || selectedReport.company}
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
                    Record explanation from {selectedReport.employeeName} ({selectedReport.senderCompany || selectedReport.company}) ➔ Transmit to SGC Head Office
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
                  <span>Transmit Explanation to Head Office SGC</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EMPLOYEE / RESPONDENT RECEIPT & DIGITAL SIGNATURE MODAL           */}
      {/* ========================================================================= */}
      {isSignReceiptModalOpen && signReportTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center font-bold">
                  <FileSignature size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    Employee / Respondent Official Receipt & Conforme
                  </h2>
                  <p className="text-xs text-white/90">
                    Case No: {signReportTarget.caseNumber} • Respondent: {signReportTarget.employeeName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSignReceiptModalOpen(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Employee Case Context Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{signReportTarget.employeeName}</span>
                  <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                    {signReportTarget.employeePosition}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Company: <strong>{signReportTarget.company || signReportTarget.senderCompany}</strong> • Branch: {signReportTarget.branch || "Branch Office"}
                </div>
              </div>

              {/* Conforme Legal Declaration */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 leading-relaxed italic">
                "I hereby acknowledge that I have formally received a complete copy of this Incident Report and take notice of the audit findings, shortage citations, and factual allegations. I understand that I am accorded the right to submit a written explanation under company due process rules."
              </div>

              {/* Signature Mode Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Affix Respondent Signature:
                  </label>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setSignMode("DRAW")}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        signMode === "DRAW"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignMode("TYPE")}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                        signMode === "TYPE"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Type Full Name
                    </button>
                  </div>
                </div>

                {signMode === "DRAW" ? (
                  <div className="space-y-1.5">
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 relative overflow-hidden flex items-center justify-center">
                      <canvas
                        ref={sigCanvasRef}
                        width={460}
                        height={140}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-[140px] bg-white cursor-crosshair touch-none"
                      />
                      <span className="absolute bottom-1.5 right-2 text-[10px] text-slate-400 pointer-events-none select-none">
                        Sign inside box using mouse or finger
                      </span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition cursor-pointer"
                      >
                        Clear Signature
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Type respondent full legal name..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                        Signature Preview:
                      </span>
                      <span className="font-serif italic text-2xl text-slate-900 font-bold tracking-wide">
                        {typedSignature || signReportTarget.employeeName}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Respondent Remarks Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Respondent Remarks upon Receipt (Optional):
                </label>
                <input
                  type="text"
                  value={signRemarks}
                  onChange={(e) => setSignRemarks(e.target.value)}
                  placeholder="e.g. Received original copy and noted audit contents."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsSignReceiptModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRespondentSignature}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-orange-500/20 transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <FileSignature size={15} />
                  <span>Affix Signature & Acknowledge Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 1: SGC HEAD OFFICE — ADD TO FILINGS (201 RECORD ONLY)     */}
      {/* ========================================================================= */}
      {isAddToFilingsModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold">
                  📁
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    SGC Discretion: Add to Filings
                  </h2>
                  <p className="text-xs text-slate-400">
                    Retain in 201 file records only without formal disciplinary action
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddToFilingsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>
                  <strong>Case Number:</strong> {selectedReport.caseNumber}
                </div>
                <div>
                  <strong>Employee:</strong> {selectedReport.employeeName} ({selectedReport.employeePosition || "Staff"})
                </div>
                <div>
                  <strong>Originating Company:</strong> {selectedReport.senderCompany || selectedReport.company}
                </div>
                {selectedReport.cashShortageAmount && (
                  <div>
                    <strong>Discrepancy Amount:</strong> PHP {selectedReport.cashShortageAmount}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Head Office HRMD Filing Remarks:
                </label>
                <textarea
                  rows={4}
                  value={filingRemarksInput}
                  onChange={(e) => setFilingRemarksInput(e.target.value)}
                  placeholder="Enter remarks for filing..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed font-sans"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  This case will be marked as "Filed for 201 Record Only". No Notice to Explain will be issued.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddToFilingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddToFilings}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white shadow-md transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <Check size={15} />
                  <span>Confirm Add to 201 Filings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 2: BRANCH HR — UPLOAD SIGNED NTE PROOF OF RECEIPT         */}
      {/* ========================================================================= */}
      {isUploadNteProofModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-700 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  <FileSignature size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    Upload Employee-Signed NTE Proof
                  </h2>
                  <p className="text-xs text-emerald-100">
                    Serve NTE to employee on-site and attach signed acknowledgment receipt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadNteProofModalOpen(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1 text-emerald-950">
                <div>
                  <strong>Case:</strong> {selectedReport.caseNumber} • <strong>Employee:</strong> {selectedReport.employeeName}
                </div>
                <div>
                  <strong>Serving HR:</strong> {effectiveRole.reportingName} ({selectedReport.company || selectedReport.senderCompany} HR)
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Date Served to Employee:
                </label>
                <input
                  type="date"
                  value={nteProofData.dateServed}
                  onChange={(e) => setNteProofData({ ...nteProofData, dateServed: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Scanned Copy / Photo of Employee-Signed NTE:
                </label>
                {nteProofData.fileData ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                    <img
                      src={nteProofData.fileData}
                      alt="Signed NTE Proof"
                      className="max-h-48 object-contain rounded-lg shadow-xs"
                    />
                    <div className="mt-2 text-xs text-slate-600 font-medium">{nteProofData.fileName || "signed_nte_proof.jpg"}</div>
                    <button
                      type="button"
                      onClick={() => setNteProofData({ ...nteProofData, fileData: "", fileName: "" })}
                      className="mt-1 text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Remove / Upload Another File
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-300 hover:border-emerald-600 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer transition">
                    <FileSignature size={28} className="text-emerald-600 mb-2" />
                    <span className="text-xs font-bold text-emerald-950">
                      Upload Signed NTE Copy (Image / Photo)
                    </span>
                    <span className="text-[10px] text-emerald-700 mt-0.5">PNG, JPG, or WebP</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setNteProofData((prev) => ({
                              ...prev,
                              fileData: evt.target.result,
                              fileName: file.name
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUploadNteProofModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNteProof}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <Check size={15} />
                  <span>Confirm Signed NTE Upload</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 3: SGC HEAD OFFICE — ISSUE NOTICE OF WARNING              */}
      {/* ========================================================================= */}
      {isWarningModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-500 text-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    SGC Discretion: Issue Notice of Warning
                  </h2>
                  <p className="text-xs text-slate-800">
                    Conclude due process with an official Written Warning & Reprimand
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWarningModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-800 hover:text-slate-950 hover:bg-amber-400 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Warning Sanction Level:
                  </label>
                  <select
                    value={warningForm.penalty}
                    onChange={(e) => setWarningForm({ ...warningForm, penalty: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="1st Written Warning & Reprimand">1st Written Warning & Reprimand</option>
                    <option value="2nd Written Warning">2nd Written Warning</option>
                    <option value="Final Written Warning">Final Written Warning</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Signatory (Head Office):
                  </label>
                  <input
                    type="text"
                    value={warningForm.signatoryName}
                    onChange={(e) => setWarningForm({ ...warningForm, signatoryName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Subject Line:
                </label>
                <input
                  type="text"
                  value={warningForm.subject}
                  onChange={(e) => setWarningForm({ ...warningForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Notice Content:
                </label>
                <textarea
                  rows={6}
                  value={warningForm.body}
                  onChange={(e) => setWarningForm({ ...warningForm, body: e.target.value })}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsWarningModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIssueNoticeOfWarning}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <AlertTriangle size={15} />
                  <span>Promulgate Notice of Warning</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 4: SGC HEAD OFFICE — NOTICE OF INVESTIGATION (NOI) ZOOM   */}
      {/* ========================================================================= */}
      {isNoiModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-700 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  <Video size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    SGC Discretion: Notice of Investigation (NOI)
                  </h2>
                  <p className="text-xs text-indigo-100">
                    Mandatory Zoom Administrative Hearing Schedule (DOLE Department Order No. 147-15)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNoiModalOpen(false)}
                className="p-1.5 rounded-lg text-indigo-200 hover:text-white hover:bg-indigo-600 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-950">
                <strong>Mandatory Requirement:</strong> Head Office is required to prepare a complete Zoom Hearing Schedule with meeting details, committee, and counsel notice.
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Hearing Topic / Case Title: *
                </label>
                <input
                  type="text"
                  value={noiForm.zoomMeetingTopic}
                  onChange={(e) => setNoiForm({ ...noiForm, zoomMeetingTopic: e.target.value })}
                  placeholder="Administrative Investigation Hearing Topic"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Hearing Date: *
                  </label>
                  <input
                    type="date"
                    value={noiForm.zoomMeetingDate}
                    onChange={(e) => setNoiForm({ ...noiForm, zoomMeetingDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Hearing Time: *
                  </label>
                  <input
                    type="text"
                    value={noiForm.zoomMeetingTime}
                    onChange={(e) => setNoiForm({ ...noiForm, zoomMeetingTime: e.target.value })}
                    placeholder="e.g. 10:00 AM PST"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Zoom Meeting Link URL: *
                </label>
                <div className="relative">
                  <Video size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600" />
                  <input
                    type="url"
                    value={noiForm.zoomMeetingLink}
                    onChange={(e) => setNoiForm({ ...noiForm, zoomMeetingLink: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono text-indigo-900 focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Zoom Meeting ID: *
                  </label>
                  <input
                    type="text"
                    value={noiForm.zoomMeetingId}
                    onChange={(e) => setNoiForm({ ...noiForm, zoomMeetingId: e.target.value })}
                    placeholder="812 4001 8920"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Zoom Passcode: *
                  </label>
                  <input
                    type="text"
                    value={noiForm.zoomPasscode}
                    onChange={(e) => setNoiForm({ ...noiForm, zoomPasscode: e.target.value })}
                    placeholder="SGC2026"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Hearing Committee & Legal Panel:
                </label>
                <input
                  type="text"
                  value={noiForm.hearingCommittee}
                  onChange={(e) => setNoiForm({ ...noiForm, hearingCommittee: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Due Process Instructions & Legal Rights:
                </label>
                <textarea
                  rows={3}
                  value={noiForm.noiRemarks}
                  onChange={(e) => setNoiForm({ ...noiForm, noiRemarks: e.target.value })}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNoiModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIssueNoi}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <Video size={15} />
                  <span>Issue Formal NOI & Schedule Zoom Hearing</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 5: ZOOM HEARING VIEWER (FOR SGC, BRANCH HR & EMPLOYEE)    */}
      {/* ========================================================================= */}
      {isZoomViewerOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  <Video size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    Official Zoom Hearing Schedule
                  </h2>
                  <p className="text-xs text-blue-100">
                    Administrative Case Hearing • Case {selectedReport.caseNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsZoomViewerOpen(false)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-500 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center py-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  MANDATORY ATTENDANCE REQUIRED
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  {selectedReport.zoomMeetingTopic || `Investigation Hearing: ${selectedReport.employeeName}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Respondent: <strong>{selectedReport.employeeName}</strong> • {selectedReport.company || selectedReport.senderCompany}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Date</span>
                    <strong className="text-slate-900">{selectedReport.zoomMeetingDate || "Scheduled Date"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Time</span>
                    <strong className="text-slate-900">{selectedReport.zoomMeetingTime || "10:00 AM PST"}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Zoom Meeting ID</span>
                    <strong className="font-mono text-blue-900">{selectedReport.zoomMeetingId || "812 4001 8920"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Passcode</span>
                    <strong className="font-mono text-blue-900">{selectedReport.zoomPasscode || "SGC2026"}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Hearing Committee</span>
                  <span className="text-slate-700 font-semibold">{selectedReport.hearingCommittee || "SGC Due Process Committee & Central HRMD"}</span>
                </div>
              </div>

              {selectedReport.noiRemarks && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 leading-relaxed italic">
                  "{selectedReport.noiRemarks}"
                </div>
              )}

              <div className="pt-2">
                <a
                  href={selectedReport.zoomMeetingLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-2xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 transition cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                >
                  <Video size={16} />
                  <span>🎥 Join Zoom Administrative Hearing Now</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 6: SGC HEAD OFFICE — DECISION ON ADMINISTRATIVE CASE       */}
      {/* ========================================================================= */}
      {isAdminDecisionModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-rose-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  <Scale size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    Decision on Administrative Case
                  </h2>
                  <p className="text-xs text-rose-100">
                    Final Executive Ruling & Disciplinary Promulgation (Labor Code Art. 297)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminDecisionModalOpen(false)}
                className="p-1.5 rounded-lg text-rose-200 hover:text-white hover:bg-rose-500 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-950">
                This Decision will be transmitted to the Branch HR of <strong>{selectedReport.company || selectedReport.senderCompany}</strong>, who must serve it in person to employee <strong>{selectedReport.employeeName}</strong> and upload their signed receipt to close the case.
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Decision Subject:
                </label>
                <input
                  type="text"
                  value={adminDecisionForm.subject}
                  onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, subject: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Investigation Findings & Administrative Liability:
                </label>
                <textarea
                  rows={2}
                  value={adminDecisionForm.findings}
                  onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, findings: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Sanction / Penalty / Restitution:
                  </label>
                  <input
                    type="text"
                    value={adminDecisionForm.penalty}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, penalty: e.target.value })}
                    placeholder="e.g. 3-Day Suspension & Restitution"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Signatory (Head Office HRMD):
                  </label>
                  <input
                    type="text"
                    value={adminDecisionForm.signatoryName}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, signatoryName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Deliberations & Decision Ruling:
                </label>
                <textarea
                  rows={6}
                  value={adminDecisionForm.body}
                  onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, body: e.target.value })}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdminDecisionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleIssueAdminDecision}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <Scale size={15} />
                  <span>Promulgate Decision to Branch HR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 7: BRANCH HR — UPLOAD SIGNED DECISION & CLOSE CASE         */}
      {/* ========================================================================= */}
      {isUploadDecisionProofModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-800 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  <CheckCheck size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    Upload Signed Decision & Close Case
                  </h2>
                  <p className="text-xs text-emerald-200">
                    Serve Decision on Administrative Case, get employee signature, and close case
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadDecisionProofModalOpen(false)}
                className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1 text-emerald-950">
                <div>
                  <strong>Case:</strong> {selectedReport.caseNumber} • <strong>Employee:</strong> {selectedReport.employeeName}
                </div>
                <div>
                  <strong>Decision Penalty:</strong> {selectedReport.adminDecisionPenalty || "Disciplinary Action"}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Date Served to Employee:
                </label>
                <input
                  type="date"
                  value={decisionProofData.dateServed}
                  onChange={(e) => setDecisionProofData({ ...decisionProofData, dateServed: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Upload Scanned / Photo Copy of Employee-Signed Decision: *
                </label>
                {decisionProofData.fileData ? (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                    <img
                      src={decisionProofData.fileData}
                      alt="Signed Decision Proof"
                      className="max-h-48 object-contain rounded-lg shadow-xs"
                    />
                    <div className="mt-2 text-xs text-slate-600 font-medium">{decisionProofData.fileName || "signed_decision.jpg"}</div>
                    <button
                      type="button"
                      onClick={() => setDecisionProofData({ ...decisionProofData, fileData: "", fileName: "" })}
                      className="mt-1 text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Remove / Upload Another File
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-emerald-300 hover:border-emerald-700 rounded-2xl bg-emerald-50/40 hover:bg-emerald-50 cursor-pointer transition">
                    <FileSignature size={28} className="text-emerald-700 mb-2" />
                    <span className="text-xs font-bold text-emerald-950">
                      Upload Signed Decision Proof
                    </span>
                    <span className="text-[10px] text-emerald-700 mt-0.5">PNG, JPG, or WebP</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            setDecisionProofData((prev) => ({
                              ...prev,
                              fileData: evt.target.result,
                              fileName: file.name
                            }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Branch Serving Remarks:
                </label>
                <textarea
                  rows={2}
                  value={decisionProofData.remarks}
                  onChange={(e) => setDecisionProofData({ ...decisionProofData, remarks: e.target.value })}
                  placeholder="Employee personally served copy of Administrative Case Decision, signed acknowledgment copy affixed."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsUploadDecisionProofModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDecisionProofAndCloseCase}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <CheckCheck size={16} />
                  <span>Upload Signed Proof & Close Case</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
