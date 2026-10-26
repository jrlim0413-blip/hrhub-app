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
  Save,
  UploadCloud,
  Download,
  ZoomIn,
  ZoomOut,
  FileEdit,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FolderArchive,
  History
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
import {
  saveNteProofToBucket,
  getNteProofFromBucket,
  deleteNteProofFromBucket,
  saveExplanationProofToBucket,
  getExplanationProofFromBucket,
  optimizeImageForStorage
} from "../lib/nteProofBucketStorage";
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

// Helper: Convert Numeric Amount to Formal Words (e.g., 1445 -> "One Thousand Four Hundred Forty-Five Pesos (PHP 1,445.00)")
function numberToEnglishWords(num) {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Million", "Billion"];

  function convertHundreds(n) {
    let str = "";
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)];
      if (n % 10 > 0) {
        str += "-" + ones[n % 10];
      }
      str += " ";
    } else if (n > 0) {
      str += ones[n] + " ";
    }
    return str.trim();
  }

  let words = "";
  let scaleIndex = 0;
  let integerPart = Math.floor(Math.abs(num));

  while (integerPart > 0) {
    const chunk = integerPart % 1000;
    if (chunk !== 0) {
      const chunkStr = convertHundreds(chunk);
      words = chunkStr + (scales[scaleIndex] ? " " + scales[scaleIndex] : "") + (words ? " " + words : "");
    }
    integerPart = Math.floor(integerPart / 1000);
    scaleIndex++;
  }
  return words.trim();
}

function formatPesosInWords(amount) {
  const numeric = typeof amount === "number" ? amount : parseFloat(String(amount || "").replace(/[^0-9.]/g, ""));
  if (isNaN(numeric) || numeric <= 0) return "";
  const integerPart = Math.floor(numeric);
  const cents = Math.round((numeric - integerPart) * 100);
  const words = numberToEnglishWords(integerPart);
  const centsText = cents > 0 ? ` and ${cents}/100` : "";
  const formattedFigure = Number(numeric).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${words}${centsText} Pesos (PHP ${formattedFigure})`;
}

// Standard Philippine Legal & Company Due Process Constants
const DEFAULT_COMPANY_ADDRESS =
  "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat, Philippines";
const DEFAULT_COMPANY_EMAIL = "imsoroglohr@gmail.com";

export const SUBSIDIARY_OPTIONS = [
  "5A Royal Gaming OPC",
  "Lucky Betplay Corporation",
  "Simpal Construction (SIMCON)",
  "Imperial Gaming OPC",
  "Glowing Fortune",
  "Simpal Group of Companies"
];

// Official Company / Entity Logo & Branding Mapping
export const COMPANY_LOGO_MAP = {
  "5A Royal Gaming OPC": "/logos/5A.png",
  "Glowing Fortune OPC": "/logos/GLOW.png",
  "Glowing Fortune": "/logos/GLOW.png",
  "Imperial Gaming OPC": "/logos/IMP.png",
  "Lucky Betplay Corporation": "/logos/LB.png",
  "Simpal Group of Companies": "/logos/SGC.png",
  "Simpal Construction (SIMCON)": "/logos/SIM.png"
};

export function resolveEntityLogo(companyName, fallback = "/logos/5A.png") {
  const norm = String(companyName || "").toLowerCase().trim();
  if (norm.includes("5a") || norm.includes("royal gaming")) return "/logos/5A.png";
  if (norm.includes("glow") || norm.includes("glowing fortune")) return "/logos/GLOW.png";
  if (norm.includes("imp") || norm.includes("imperial")) return "/logos/IMP.png";
  if (norm.includes("lucky") || norm.includes("betplay") || norm.includes("lb")) return "/logos/LB.png";
  if (norm.includes("simcon") || norm.includes("construction")) return "/logos/SIM.png";
  if (norm.includes("simpal") || norm.includes("sgc") || norm.includes("group of companies")) return "/logos/SGC.png";
  return fallback;
}

export function resolveCompanyOfficialName(companyName, fallback = "5A ROYAL GAMING OPC") {
  const norm = String(companyName || "").toLowerCase().trim();
  if (norm.includes("5a") || norm.includes("royal gaming")) return "5A ROYAL GAMING OPC";
  if (norm.includes("glow") || norm.includes("glowing fortune")) return "GLOWING FORTUNE OPC";
  if (norm.includes("imp") || norm.includes("imperial")) return "IMPERIAL GAMING OPC";
  if (norm.includes("lucky") || norm.includes("betplay") || norm.includes("lb")) return "LUCKY BETPLAY CORPORATION";
  if (norm.includes("simcon") || norm.includes("construction")) return "SIMPAL CONSTRUCTION (SIMCON)";
  if (norm.includes("simpal") || norm.includes("sgc") || norm.includes("group of companies")) return "SIMPAL GROUP OF COMPANIES";
  return String(companyName || fallback).toUpperCase();
}

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
  const [irPaperFormat, setIrPaperFormat] = useState("A4"); // "A4" (Standard) | "SHORT" (Letter) | "LONG" (Long)
  const [ntePaperFormat, setNtePaperFormat] = useState("A4"); // "A4" (Standard) | "SHORT" (Letter) | "LONG" (Long)
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
  const [isViewSignedNteProofModalOpen, setIsViewSignedNteProofModalOpen] = useState(false);
  const [activeProofRecord, setActiveProofRecord] = useState(null);
  const [activeExplanationRecord, setActiveExplanationRecord] = useState(null);
  const [activeProofViewerTab, setActiveProofViewerTab] = useState("SIGNED_NTE"); // "SIGNED_NTE" | "EXPLANATION_DOC"
  const [isLoadingProof, setIsLoadingProof] = useState(false);
  const [proofZoomLevel, setProofZoomLevel] = useState(1);
  const [uploadActiveTab, setUploadActiveTab] = useState("ALL"); // "ALL" | "SIGNED_NTE" | "EXPLANATION"
  const [nteProofData, setNteProofData] = useState({ fileData: "", fileName: "", fileSize: 0, dateServed: new Date().toISOString().slice(0, 10), remarks: "" });
  const [explanationProofData, setExplanationProofData] = useState({
    fileData: "",
    fileName: "",
    fileSize: 0,
    dateSubmitted: new Date().toISOString().slice(0, 10),
    explanationText: ""
  });

  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isWarningViewerOpen, setIsWarningViewerOpen] = useState(false);
  const [warningPaperFormat, setWarningPaperFormat] = useState("A4"); // "A4" | "SHORT" | "LONG" | "LEGAL"
  const [warningForm, setWarningForm] = useState({
    penalty: "Final Stern Warning",
    companyName: "5A ROYAL GAMING OPC",
    companyAddress: DEFAULT_COMPANY_ADDRESS,
    companyEmail: DEFAULT_COMPANY_EMAIL,
    warningDate: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    employeeName: "",
    subject: "Notice of Warning",
    explanationDate: "",
    incidentReference: "",
    codeOfConductViolation: "Article IV – Section 18. Offenses Related to Job Performance and Productivity",
    bodyParagraph1: "",
    bodyParagraph2: "",
    bodyParagraph3: "",
    bodyParagraph4: "Please be guided accordingly.",
    signatoryName: "JEVINCE JAYE S. JUBAY, CHRP",
    signatoryTitle: "HRMD Manager",
    signatoryCompany: "5A Royal Gaming OPC",
    receivedByName: ""
  });

  const [isNoiViewerOpen, setIsNoiViewerOpen] = useState(false);
  const [noiPaperFormat, setNoiPaperFormat] = useState("A4"); // "A4" | "SHORT" | "LONG" | "LEGAL"
  const [isNoiModalOpen, setIsNoiModalOpen] = useState(false);
  const [noiForm, setNoiForm] = useState({
    date: "OCTOBER 12, 2026",
    toEmployee: "",
    subject: "Notice of Investigation",
    hearingDate: "October 14, 2026",
    hearingTime: "2:30 PM",
    hearingMode: "via Zoom Meeting",
    zoomMeetingTopic: "",
    zoomMeetingLink: "",
    zoomMeetingId: "",
    zoomPasscode: "",
    hearingCommittee: "SGC Due Process Committee & HRMD",
    paragraph1: "",
    violation1Article: "Article IV – Section 18. Offenses Related to Job Performance and Productivity.",
    violation1Clause: "(a) Non-observance of Standard Operating Procedures.",
    violation1Desc: "– willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense.",
    violation2Article: "Section 16. Offenses Against Good Personal Behavior and Conduct",
    violation2Clause: "(f) Drunkenness.",
    violation2Desc: "Reporting for work under the influence of liquor or drinking alcoholic beverages during work hours (except on official functions).",
    paragraph2: "You are entitled to counsel of your choice during this investigation. You may also bring your witness(es) if any. Please be guided that failure on your part to comply with this Notice of Investigation shall be considered submitted for a resolution based on the evidence on record.",
    witnessDay: "12th",
    witnessMonthYear: "October 2026",
    witnessPlace: "Tacurong City, Sultan Kudarat, Philippines",
    signatoryName: "JEVINCE JAYE S. JUBAY, CHRP",
    signatoryTitle: "HRMD Manager",
    signatoryCompany: "5A Royal Gaming OPC",
    footerText: `HR 201 File & Records ${new Date().getFullYear()}`
  });

  const [isAdminDecisionViewerOpen, setIsAdminDecisionViewerOpen] = useState(false);
  const [adminDecisionPaperFormat, setAdminDecisionPaperFormat] = useState("A4"); // "A4" | "SHORT" | "LONG" | "LEGAL"
  const [isAdminDecisionModalOpen, setIsAdminDecisionModalOpen] = useState(false);
  const [adminDecisionForm, setAdminDecisionForm] = useState({
    date: "October 21, 2026",
    toEmployee: "",
    subject: "DECISION OF ADMINISTRATIVE CASE",
    introLine: "This is concerning your administrative case on;",
    bullet1Article: "Section 16. Offenses Against Good Personal Behavior and Conduct.",
    bullet1Desc: "(f) Drunkenness. Reporting for work under the influence of liquor or drinking alcoholic beverages during work hours (except on official functions) is classified as serious offense.",
    bullet2Article: "Section 18. Offenses Related to Job Performance and Productivity",
    bullet2Desc: "(a) Non-observance of Standard Operating Procedures. Willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense.",
    paragraph1: "After reviewing the facts and circumstances surrounding the case, Management has determined that there is substantial basis to establish your accountability for the aforementioned violations. Management further notes that this is a repeated occurrence of the same or similar violation, notwithstanding prior reminders, and corrective measures previously undertaken.",
    sanctionLevel: "Final Stern Warning",
    paragraph2: "In view thereof, please be informed that this shall serve as your “Final Stern Warning”. Any further violations of company policies may result in the immediate termination of your employment.",
    paragraph3: "Please be guided accordingly.",
    signatoryName: "JEVINCE JAYE S. JUBAY, CHRP",
    signatoryTitle: "HRMD Manager",
    signatoryCompany: "5A Royal Gaming OPC",
    footerText: `HR 201 File & Records ${new Date().getFullYear()}`
  });

  const [isZoomViewerOpen, setIsZoomViewerOpen] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [transmittingMessage, setTransmittingMessage] = useState("");
  const [openDossierCaseId, setOpenDossierCaseId] = useState(null);

  // Auto-dismiss Dossier popovers on outside clicks
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest(".dossier-dropdown-container")) {
        setOpenDossierCaseId(null);
      }
    };
    document.addEventListener("click", handleGlobalClick);
    return () => document.removeEventListener("click", handleGlobalClick);
  }, []);

  // Compute effective role & capabilities STRICTLY based on the logged-in account (currentUser)
  const effectiveRole = useMemo(() => {
    return resolveUserHrRole(currentUser, profiles);
  }, [currentUser, profiles]);

  // Dynamic entity branding strictly aligned with logged-in account
  const loggedInCompany = effectiveRole?.company || currentUser?.company || "5A Royal Gaming OPC";
  const loggedInLogo = resolveEntityLogo(loggedInCompany);

  // Dynamic paper logo resolver:
  // If user is branch HR, strictly use their logged-in company logo.
  // If user is Head Office (SGC), check if report/memo specifies a subsidiary, otherwise default to loggedInLogo.
  const getPaperLogo = (docCompany = null) => {
    if (!effectiveRole.isHeadOffice) {
      return loggedInLogo;
    }
    if (docCompany) {
      return resolveEntityLogo(docCompany, loggedInLogo);
    }
    return loggedInLogo;
  };

  const getPaperCompanyName = (docCompany = null) => {
    if (!effectiveRole.isHeadOffice) {
      return resolveCompanyOfficialName(loggedInCompany);
    }
    if (docCompany) {
      return resolveCompanyOfficialName(docCompany, loggedInCompany);
    }
    return resolveCompanyOfficialName(loggedInCompany);
  };

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
    typeOfIncident: "Cash Shortage & Non-observance of SOPs",
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
    preparerSignatureScale: 1.25,
    preparerName: initialSenderHr.name,
    preparerTitle: initialSenderHr.title,
    operationsManagerSignature: "",
    operationsManagerSignatureScale: 1.25,
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
  const isFetchingRef = useRef(false);

  // Load records (with optional silent background mode and concurrency protection)
  const loadRecords = async (isSilent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await fetchIncidentReports();
      if (Array.isArray(data)) {
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
      }
    } catch (err) {
      console.warn("Failed to load incident reports:", err);
    } finally {
      isFetchingRef.current = false;
      if (!isSilent) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  // Real-time synchronization: Supabase postgres_changes + BroadcastChannel + Window Focus + Resilient Polling
  useEffect(() => {
    loadRecords(false);

    // 1. Cross-tab instant broadcast listener
    const unsubBroadcast = subscribeToLiveReports((liveList) => {
      setReports(liveList);
      setLastSyncedTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    });

    // 2. Supabase Realtime channel subscription (dedicated to incident_reports table)
    let realtimeChannel = null;
    try {
      if (supabase) {
        realtimeChannel = supabase
          .channel("realtime-incident-reports-desk")
          .on("postgres_changes", { event: "*", schema: "public", table: "incident_reports" }, () => {
            loadRecords(true);
          })
          .subscribe();
      }
    } catch (realtimeErr) {
      console.debug("Realtime channel subscription notice:", realtimeErr?.message);
    }

    // 3. Instant sync whenever user refocuses tab / window
    const handleWindowFocus = () => loadRecords(true);
    window.addEventListener("focus", handleWindowFocus);

    // 4. Gentle background safety polling (every 25 seconds)
    const pollInterval = setInterval(() => {
      loadRecords(true);
    }, 25000);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener("focus", handleWindowFocus);
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
            preparerSignatureScale: defs.preparerSignatureScale || prev.preparerSignatureScale || 1.25,
            operationsManagerName: defs.operationsManagerName || prev.operationsManagerName,
            operationsManagerTitle: defs.operationsManagerTitle || prev.operationsManagerTitle,
            operationsManagerSignature: defs.operationsManagerSignature || prev.operationsManagerSignature,
            operationsManagerSignatureScale: defs.operationsManagerSignatureScale || prev.operationsManagerSignatureScale || 1.25,
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
      typeOfIncident: "Cash Shortage & Non-observance of SOPs",
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
      preparerSignatureScale: d.preparerSignatureScale || 1.25,
      preparerName: d.preparerName || currentUser?.name || assigned.name,
      preparerTitle: d.preparerTitle || currentUser?.role || assigned.title,
      operationsManagerSignature: d.operationsManagerSignature || "",
      operationsManagerSignatureScale: d.operationsManagerSignatureScale || 1.25,
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
      typeOfIncident: irForm.typeOfIncident || irForm.incidentCategory || "Cash Shortage & Non-observance of SOPs",
      type_of_incident: irForm.typeOfIncident || irForm.incidentCategory || "Cash Shortage & Non-observance of SOPs",
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
      preparerSignatureScale: irForm.preparerSignatureScale || 1.25,
      preparerName: irForm.preparerName || irForm.reportingHrName,
      preparerTitle: irForm.preparerTitle || irForm.reportingHrTitle,
      operationsManagerSignature: irForm.operationsManagerSignature || "",
      operationsManagerSignatureScale: irForm.operationsManagerSignatureScale || 1.25,
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

    setIsTransmitting(true);
    setTransmittingMessage("Transmitting Incident Report to Simpal Group of Companies (Head Office HRMD)...");
    try {
      const saved = await saveIncidentReport(newReport);
      await loadRecords();
      setIsCreateModalOpen(false);
      setSelectedReport(saved || newReport);
      setIsIrViewerOpen(true);

      // AI Voice Announcement
      const announcement = `Transmitted! Incident report for ${irForm.employeeName} has been officially sent from ${irForm.company} to Simpal Group of Companies Head Office for Notice to Explain evaluation.`;
      playAiVoiceAnnouncement(announcement);
    } catch (err) {
      console.error("Transmittal error:", err);
      alert("Failed to transmit incident report. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
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

    setIsTransmitting(true);
    setTransmittingMessage("Saving and stamping employee conforme signature...");
    try {
      await saveIncidentReport(updated);
      await loadRecords();
      if (selectedReport && selectedReport.id === updated.id) {
        setSelectedReport(updated);
      }
      setIsSignReceiptModalOpen(false);
      playAiVoiceAnnouncement(`Incident Report receipt confirmed and digitally signed by ${signReportTarget.employeeName}. Conforme stamped onto official case file.`);
    } catch (err) {
      console.error("Signature save error:", err);
      alert("Failed to save digital signature. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
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
      preparerSignatureScale: irForm.preparerSignatureScale || 1.25,
      operationsManagerName: irForm.operationsManagerName || "Operations Manager",
      operationsManagerTitle: irForm.operationsManagerTitle || "Operations Manager",
      operationsManagerSignature: irForm.operationsManagerSignature || "",
      operationsManagerSignatureScale: irForm.operationsManagerSignatureScale || 1.25,
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
          actor: `${effectiveRole.reportingName || effectiveRole.userName || currentUser?.name || "Head Office HR"} (SGC Head Office HRMD)`,
          message: `Incident Report added to 201 filings for record purposes only. Notes: "${filingRemarksInput}"`
        }
      ]
    };

    setIsTransmitting(true);
    setTransmittingMessage("Retaining case in 201 personnel records...");
    try {
      await saveIncidentReport(updated);
      await loadRecords();
      setIsAddToFilingsModalOpen(false);
      setSelectedReport(updated);
      playAiVoiceAnnouncement(`Incident Report for ${selectedReport.employeeName} has been officially added to 201 filings.`);
    } catch (err) {
      console.error("Filing save error:", err);
      alert("Failed to save filing. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
  };

  // 2. Branch HR ONLY: Upload Employee Signed NTE Proof & Employee Written Explanation
  const handleOpenUploadNteProof = async (report, initialUploadFocus = "ALL") => {
    if (effectiveRole.isHeadOffice) {
      alert("Notice: SGC Head Office evaluates cases. Only Branch HR is authorized to serve and upload the employee's signed NTE acknowledgment copy and employee written explanation.");
      return;
    }
    setSelectedReport(report);
    setUploadActiveTab(initialUploadFocus);

    // Initial NTE Proof data
    let initialNteData = report.nteSignedProof || "";
    let initialNteName = report.nteSignedProofName || "";
    let initialNteDate = report.nteServedAt || new Date().toISOString().slice(0, 10);
    try {
      const bucketRecord = await getNteProofFromBucket(report.id);
      if (bucketRecord?.fileData) {
        initialNteData = bucketRecord.fileData;
        initialNteName = bucketRecord.fileName || initialNteName;
        initialNteDate = bucketRecord.dateServed || initialNteDate;
      }
    } catch {
      // fallback
    }

    setNteProofData({
      fileData: initialNteData,
      fileName: initialNteName,
      fileSize: 0,
      dateServed: initialNteDate,
      remarks: "Employee personally served physical copy of NTE on-site and affixed signature acknowledging receipt."
    });

    // Initial Explanation Proof data
    let initialExpData = report.explanationProof || "";
    let initialExpName = report.explanationProofName || "";
    let initialExpDate = report.explanationReceivedAt || new Date().toISOString().slice(0, 10);
    let initialExpText = report.explanationText || "";
    try {
      const expBucketRecord = await getExplanationProofFromBucket(report.id);
      if (expBucketRecord) {
        if (expBucketRecord.fileData) initialExpData = expBucketRecord.fileData;
        if (expBucketRecord.fileName) initialExpName = expBucketRecord.fileName;
        if (expBucketRecord.dateSubmitted) initialExpDate = expBucketRecord.dateSubmitted;
        if (expBucketRecord.explanationText) initialExpText = expBucketRecord.explanationText;
      }
    } catch {
      // fallback
    }

    setExplanationProofData({
      fileData: initialExpData,
      fileName: initialExpName,
      fileSize: 0,
      dateSubmitted: initialExpDate,
      explanationText: initialExpText
    });

    setIsUploadNteProofModalOpen(true);
  };

  const handleSaveNteProof = async () => {
    if (!selectedReport) return;
    if (effectiveRole.isHeadOffice) {
      alert("Unauthorized: Head Office cannot upload Branch HR proof.");
      return;
    }

    const hasNteFile = Boolean(nteProofData.fileData);
    const hasExpFileOrText = Boolean(explanationProofData.fileData || (explanationProofData.explanationText && explanationProofData.explanationText.trim()));

    if (!hasNteFile && !hasExpFileOrText) {
      alert("Please upload the required documents: Received & Signed NTE Proof and Employee In-Written Explanation.");
      return;
    }

    setIsTransmitting(true);
    setTransmittingMessage("Uploading dual submissions & synchronizing to Head Office SGC bucket...");
    try {
      const timestampStr = new Date().toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });

      const hrName =
        effectiveRole.userName ||
        effectiveRole.reportingName ||
        currentUser?.name ||
        selectedReport.senderHrName ||
        selectedReport.reportingHrName ||
        "Branch HR";
      const hrCompany =
        selectedReport.company ||
        selectedReport.senderCompany ||
        effectiveRole.company ||
        "Lucky Betplay Corporation";
      const servingHrLabel = `${hrName} (${hrCompany} HR)`;

      // 1. Process Signed NTE proof
      let nteFinalUrl = selectedReport.nteSignedProof || "";
      let nteBucketKey = selectedReport.nteSignedProofKey || "";
      let nteFileName = selectedReport.nteSignedProofName || "";
      let nteDateServed = nteProofData.dateServed || selectedReport.nteServedAt || timestampStr;

      if (hasNteFile) {
        let optimizedNteData = nteProofData.fileData;
        if (optimizedNteData.startsWith("data:image/")) {
          try {
            const compressed = await optimizeImageForStorage(nteProofData.fileData, 1200, 0.72);
            if (compressed) optimizedNteData = compressed;
          } catch (e) {
            console.warn("NTE optimization fallback:", e);
          }
        }

        const bucketResult = await saveNteProofToBucket(selectedReport.id, {
          caseNumber: selectedReport.caseNumber,
          fileData: optimizedNteData,
          fileName: nteProofData.fileName || "signed_nte_proof.jpg",
          fileType: optimizedNteData.startsWith("data:application/pdf") ? "application/pdf" : "image/jpeg",
          fileSize: nteProofData.fileSize || 0,
          dateServed: nteDateServed,
          uploadedBy: servingHrLabel,
          company: hrCompany
        });

        nteFinalUrl = bucketResult.cloudUrl || optimizedNteData;
        nteBucketKey = bucketResult.bucketKey;
        nteFileName = bucketResult.fileName;
      }

      // 2. Process Employee In-Written Explanation proof & text
      let expFinalUrl = selectedReport.explanationProof || "";
      let expBucketKey = selectedReport.explanationProofKey || "";
      let expFileName = selectedReport.explanationProofName || "";
      let expDateSubmitted = explanationProofData.dateSubmitted || selectedReport.explanationReceivedAt || timestampStr;
      const expText = explanationProofData.explanationText ? explanationProofData.explanationText.trim() : (selectedReport.explanationText || "");

      if (hasExpFileOrText) {
        let optimizedExpData = explanationProofData.fileData || "";
        if (optimizedExpData.startsWith("data:image/")) {
          try {
            const compressed = await optimizeImageForStorage(optimizedExpData, 1200, 0.72);
            if (compressed) optimizedExpData = compressed;
          } catch (e) {
            console.warn("Explanation optimization fallback:", e);
          }
        }

        const expBucketResult = await saveExplanationProofToBucket(selectedReport.id, {
          caseNumber: selectedReport.caseNumber,
          fileData: optimizedExpData,
          fileName: explanationProofData.fileName || "employee_written_explanation.jpg",
          fileType: optimizedExpData.startsWith("data:application/pdf") ? "application/pdf" : "image/jpeg",
          fileSize: explanationProofData.fileSize || 0,
          dateSubmitted: expDateSubmitted,
          uploadedBy: servingHrLabel,
          company: hrCompany,
          explanationText: expText
        });

        expFinalUrl = expBucketResult.cloudUrl || optimizedExpData;
        expBucketKey = expBucketResult.bucketKey;
        expFileName = expBucketResult.fileName;
      }

      // Determine lifecycle status
      const hasExplanationNow = Boolean(expFinalUrl || expText);
      const hasSignedNteNow = Boolean(nteFinalUrl || selectedReport.hasSignedNteProof);
      const newStatus = hasExplanationNow ? "EXPLANATION_RECEIVED" : "NTE_SERVED_ACKNOWLEDGED";

      const logItems = [];
      if (hasSignedNteNow) logItems.push("Received & Signed NTE Proof");
      if (hasExplanationNow) logItems.push("Employee In-Written Explanation Letter");

      const updated = {
        ...selectedReport,
        status: newStatus,
        // Signed NTE
        hasSignedNteProof: hasSignedNteNow,
        nteSignedProofKey: nteBucketKey,
        nteSignedProofName: nteFileName,
        nteServedAt: nteDateServed,
        nteServedBy: servingHrLabel,
        nteSignedProof: nteFinalUrl,
        // In-Written Explanation
        hasExplanationProof: hasExplanationNow,
        explanationProof: expFinalUrl,
        explanationProofName: expFileName,
        explanationProofKey: expBucketKey,
        explanationText: expText,
        explanationReceivedAt: expDateSubmitted,
        explanationSubmittedBy: servingHrLabel,
        activityLog: [
          ...(selectedReport.activityLog || []),
          {
            id: `act-dual-proof-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: hasExplanationNow ? "EXPLANATION_AND_SIGNED_NTE_SUBMITTED" : "NTE_SIGNED_PROOF_UPLOADED",
            actor: servingHrLabel,
            message: `Branch HR uploaded returned documents to Head Office SGC: ${logItems.join(" & ")}. ${hasExplanationNow ? "Transmitted to SGC Head Office for administrative evaluation." : "Awaiting employee written explanation."}`
          }
        ]
      };

      await saveIncidentReport(updated);
      await loadRecords();
      setIsUploadNteProofModalOpen(false);
      setSelectedReport(updated);

      const announcement = hasExplanationNow
        ? `Received & signed Notice to Explain and Employee written explanation successfully submitted to Head Office for case ${selectedReport.caseNumber}.`
        : `Signed Notice to Explain proof uploaded successfully for case ${selectedReport.caseNumber}.`;
      playAiVoiceAnnouncement(announcement);
    } catch (err) {
      console.error("NTE proof upload error:", err);
      alert("Failed to upload proof. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
  };

  // 3. View Signed NTE Proof & Employee Written Explanation (Head Office Audit & Branch HR)
  const handleOpenViewSignedNteProof = async (report, initialTab = "SIGNED_NTE") => {
    setSelectedReport(report);
    setActiveProofViewerTab(initialTab);
    setProofZoomLevel(1);
    setIsViewSignedNteProofModalOpen(true);
    setIsLoadingProof(true);

    try {
      // 1. Fetch Signed NTE proof
      let bucketRecord = await getNteProofFromBucket(report.id);
      if (!bucketRecord && report.caseNumber) {
        bucketRecord = await getNteProofFromBucket(report.caseNumber);
      }
      if (!bucketRecord && report.nteSignedProofKey) {
        bucketRecord = await getNteProofFromBucket(report.nteSignedProofKey);
      }

      const nteFileData =
        (bucketRecord && bucketRecord.fileData) ||
        report.nteSignedProof ||
        "";

      const nteFileName =
        (bucketRecord && bucketRecord.fileName) ||
        report.nteSignedProofName ||
        `Signed_NTE_${report.caseNumber || "Case"}.jpg`;

      const nteDateServed =
        (bucketRecord && bucketRecord.dateServed) ||
        report.nteServedAt ||
        "Recorded on-site";

      const rawUploadedBy =
        (bucketRecord && bucketRecord.uploadedBy) ||
        report.nteServedBy ||
        "";
      const nteUploadedBy =
        rawUploadedBy && !rawUploadedBy.includes("undefined")
          ? rawUploadedBy
          : `${report.senderHrName || "Branch HR"} (${report.senderCompany || report.company || "Lucky Betplay Corporation"} HR)`;

      setActiveProofRecord({
        reportId: report.id,
        caseNumber: report.caseNumber,
        fileData: nteFileData,
        fileName: nteFileName,
        dateServed: nteDateServed,
        uploadedBy: nteUploadedBy,
        uploadedAt: (bucketRecord && bucketRecord.uploadedAt) || report.updatedAt || "",
        company: report.company || report.senderCompany
      });

      // 2. Fetch Employee Written Explanation proof
      let expBucketRecord = await getExplanationProofFromBucket(report.id);
      if (!expBucketRecord && report.caseNumber) {
        expBucketRecord = await getExplanationProofFromBucket(report.caseNumber);
      }
      if (!expBucketRecord && report.explanationProofKey) {
        expBucketRecord = await getExplanationProofFromBucket(report.explanationProofKey);
      }

      const expFileData =
        (expBucketRecord && expBucketRecord.fileData) ||
        report.explanationProof ||
        "";

      const expFileName =
        (expBucketRecord && expBucketRecord.fileName) ||
        report.explanationProofName ||
        `Explanation_Letter_${report.caseNumber || "Case"}.jpg`;

      const expDateSubmitted =
        (expBucketRecord && expBucketRecord.dateSubmitted) ||
        report.explanationReceivedAt ||
        "Recorded on-site";

      const expText =
        (expBucketRecord && expBucketRecord.explanationText) ||
        report.explanationText ||
        "";

      const expUploadedBy =
        (expBucketRecord && expBucketRecord.uploadedBy) ||
        report.explanationSubmittedBy ||
        nteUploadedBy;

      setActiveExplanationRecord({
        reportId: report.id,
        caseNumber: report.caseNumber,
        fileData: expFileData,
        fileName: expFileName,
        dateSubmitted: expDateSubmitted,
        uploadedBy: expUploadedBy,
        explanationText: expText,
        uploadedAt: (expBucketRecord && expBucketRecord.uploadedAt) || report.updatedAt || "",
        company: report.company || report.senderCompany
      });

      // Determine initial tab smartly
      if (initialTab === "EXPLANATION_DOC") {
        setActiveProofViewerTab("EXPLANATION_DOC");
      } else if (!nteFileData && (expFileData || expText)) {
        setActiveProofViewerTab("EXPLANATION_DOC");
      } else {
        setActiveProofViewerTab("SIGNED_NTE");
      }
    } catch (err) {
      console.warn("Failed to retrieve proofs from bucket:", err);
      const rawUploadedBy = report.nteServedBy || "";
      const uploadedBy =
        rawUploadedBy && !rawUploadedBy.includes("undefined")
          ? rawUploadedBy
          : `${report.senderHrName || "Branch HR"} (${report.senderCompany || report.company || "Lucky Betplay Corporation"} HR)`;

      setActiveProofRecord({
        reportId: report.id,
        caseNumber: report.caseNumber,
        fileData: report.nteSignedProof || "",
        fileName: report.nteSignedProofName || "signed_nte_proof.jpg",
        dateServed: report.nteServedAt || "Recorded on-site",
        uploadedBy,
        uploadedAt: report.updatedAt || "",
        company: report.company || report.senderCompany
      });
      setActiveExplanationRecord({
        reportId: report.id,
        caseNumber: report.caseNumber,
        fileData: report.explanationProof || "",
        fileName: report.explanationProofName || "employee_written_explanation.jpg",
        dateSubmitted: report.explanationReceivedAt || "Recorded on-site",
        uploadedBy: report.explanationSubmittedBy || uploadedBy,
        explanationText: report.explanationText || "",
        uploadedAt: report.updatedAt || "",
        company: report.company || report.senderCompany
      });
    } finally {
      setIsLoadingProof(false);
    }
  };


  // 3. Head Office Discretion 2A: Issue Notice of Warning
  const handleOpenWarningModal = (report) => {
    setSelectedReport(report);
    const dateFormatted = report.warningIssuedAt || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const expDate = report.explanationReceivedAt || report.explanationDate || report.nteDate || "March 22, 2026";
    const empName = (report.employeeName || "IBRAHIM BAGEL").toUpperCase();
    const company = report.warningCompanyName || report.senderCompany || report.company || "5A ROYAL GAMING OPC";
    const compAddress = report.warningCompanyAddress || "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat, Philippines";
    const compEmail = report.warningCompanyEmail || "imsoroglohr@gmail.com";
    
    const rawAmt = report.shortageAmount || report.drawerShortage || report.cashShortage || 1445;
    const shortageWords = formatPesosInWords(rawAmt);
    
    const defaultP1 = report.warningParagraph1 || `This is to acknowledge receipt of your written explanation dated ${expDate}, with reference to the incident involving a cash shortage in the amount of ${shortageWords}.`;
    const defaultViolation = report.warningViolationClause || "Article IV \u2013 Section 18. Offenses Related to Job Performance and Productivity";
    const defaultP2 = report.warningParagraph2 || `After careful review, it has been determined that your actions constitute a violation of ${defaultViolation} as stated in the company\u2019s Code of Conduct.`;
    const defaultP3 = report.warningParagraph3 || `In view of this, please be informed that this shall serve as your \u201cFinal Stern Warning\u201d. Any further violations of company policies may result in the immediate termination of your employment.`;
    const defaultP4 = report.warningParagraph4 || "Please be guided accordingly.";
    
    setWarningForm({
      date: dateFormatted,
      toEmployee: empName,
      subject: report.warningNoticeSubject || "Notice of Warning",
      penalty: report.warningNoticePenalty || "Final Stern Warning",
      companyName: company,
      companyAddress: compAddress,
      companyEmail: compEmail,
      explanationDate: expDate,
      shortageAmount: rawAmt,
      violationClause: defaultViolation,
      paragraph1: defaultP1,
      paragraph2: defaultP2,
      paragraph3: defaultP3,
      paragraph4: defaultP4,
      signatoryName: report.warningSignatoryName || report.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP",
      signatoryTitle: report.warningSignatoryTitle || report.assignedCentralHrTitle || "HRMD Manager",
      signatoryCompany: report.warningSignatoryCompany || company,
      footerText: report.warningFooterText || `HR 201 File & Records ${new Date().getFullYear()}`
    });
    setIsWarningModalOpen(true);
  };

  const handleViewWarningDocument = (report) => {
    setSelectedReport(report);
    const dateFormatted = report.warningIssuedAt || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const expDate = report.explanationReceivedAt || report.explanationDate || report.nteDate || "March 22, 2026";
    const empName = (report.employeeName || "IBRAHIM BAGEL").toUpperCase();
    const company = report.warningCompanyName || report.senderCompany || report.company || "5A ROYAL GAMING OPC";
    const compAddress = report.warningCompanyAddress || "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat, Philippines";
    const compEmail = report.warningCompanyEmail || "imsoroglohr@gmail.com";
    
    const rawAmt = report.shortageAmount || report.drawerShortage || report.cashShortage || 1445;
    const shortageWords = formatPesosInWords(rawAmt);
    
    const defaultP1 = report.warningParagraph1 || `This is to acknowledge receipt of your written explanation dated ${expDate}, with reference to the incident involving a cash shortage in the amount of ${shortageWords}.`;
    const defaultViolation = report.warningViolationClause || "Article IV \u2013 Section 18. Offenses Related to Job Performance and Productivity";
    const defaultP2 = report.warningParagraph2 || `After careful review, it has been determined that your actions constitute a violation of ${defaultViolation} as stated in the company\u2019s Code of Conduct.`;
    const defaultP3 = report.warningParagraph3 || `In view of this, please be informed that this shall serve as your \u201cFinal Stern Warning\u201d. Any further violations of company policies may result in the immediate termination of your employment.`;
    const defaultP4 = report.warningParagraph4 || "Please be guided accordingly.";
    
    setWarningForm({
      date: dateFormatted,
      toEmployee: empName,
      subject: report.warningNoticeSubject || "Notice of Warning",
      penalty: report.warningNoticePenalty || "Final Stern Warning",
      companyName: company,
      companyAddress: compAddress,
      companyEmail: compEmail,
      explanationDate: expDate,
      shortageAmount: rawAmt,
      violationClause: defaultViolation,
      paragraph1: defaultP1,
      paragraph2: defaultP2,
      paragraph3: defaultP3,
      paragraph4: defaultP4,
      signatoryName: report.warningSignatoryName || report.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP",
      signatoryTitle: report.warningSignatoryTitle || report.assignedCentralHrTitle || "HRMD Manager",
      signatoryCompany: report.warningSignatoryCompany || company,
      footerText: report.warningFooterText || `HR 201 File & Records ${new Date().getFullYear()}`
    });
    setIsWarningViewerOpen(true);
  };

  const handleIssueNoticeOfWarning = async () => {
    if (!selectedReport) return;
    const updated = {
      ...selectedReport,
      status: "NOTICE_OF_WARNING_ISSUED",
      warningNoticeSubject: warningForm.subject,
      warningNoticePenalty: warningForm.penalty,
      warningIssuedAt: warningForm.date,
      warningCompanyName: warningForm.companyName,
      warningCompanyAddress: warningForm.companyAddress,
      warningCompanyEmail: warningForm.companyEmail,
      warningParagraph1: warningForm.paragraph1,
      warningParagraph2: warningForm.paragraph2,
      warningParagraph3: warningForm.paragraph3,
      warningParagraph4: warningForm.paragraph4,
      warningViolationClause: warningForm.violationClause,
      warningSignatoryName: warningForm.signatoryName,
      warningSignatoryTitle: warningForm.signatoryTitle,
      warningSignatoryCompany: warningForm.signatoryCompany,
      warningFooterText: warningForm.footerText,
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
    setIsTransmitting(true);
    setTransmittingMessage("Transmitting formal Notice of Warning to Branch HR...");
    try {
      await saveIncidentReport(updated);
      await loadRecords();
      setIsWarningModalOpen(false);
      setSelectedReport(updated);
      setIsWarningViewerOpen(true);
      playAiVoiceAnnouncement(`Notice of Warning has been issued by Head Office for ${selectedReport.employeeName}. Returned to branch HR.`);
    } catch (err) {
      console.error("Warning transmittal error:", err);
      alert("Failed to issue notice of warning. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
  };

  // 4. Head Office Discretion 2B: Notice of Investigation (NOI) with REQUIRED Zoom Meeting Schedule
  const handleOpenNoiModal = (report) => {
    setSelectedReport(report);
    const dateFormatted = report.noiIssuedAt || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
    const defaultHearingDate = report.zoomMeetingDate || "October 14, 2026";
    const defaultHearingTime = report.zoomMeetingTime || "2:30 PM";
    const defaultHearingMode = report.zoomMeetingMode || "via Zoom Meeting";
    const empName = (report.employeeName || "MICHAEL SIMPAL").toUpperCase();

    const defP1 = report.noiParagraph1 || `A notice of investigation is one of the requisites by the law to hear and explain your side, you are hereby directed to attend, submit your supporting documents, and bring a counsel of your own choice on ${defaultHearingDate}, ${defaultHearingTime} ${defaultHearingMode}, for the acts allegedly committed in violation of:`;

    setNoiForm({
      date: dateFormatted,
      toEmployee: empName,
      subject: report.noiSubject || "Notice of Investigation",
      hearingDate: defaultHearingDate,
      hearingTime: defaultHearingTime,
      hearingMode: defaultHearingMode,
      zoomMeetingTopic: report.zoomMeetingTopic || `Administrative Investigation Hearing: Case ${report.caseNumber} - ${empName}`,
      zoomMeetingLink: report.zoomMeetingLink || `https://zoom.us/j/${Math.floor(80000000000 + Math.random() * 9000000000)}?pwd=SGC${new Date().getFullYear()}`,
      zoomMeetingId: report.zoomMeetingId || `${Math.floor(812 + Math.random() * 100)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      zoomPasscode: report.zoomPasscode || `SGC${new Date().getFullYear()}`,
      hearingCommittee: report.hearingCommittee || "SGC Due Process Committee & Central HRMD",
      paragraph1: defP1,
      violation1Article: report.noiViolation1Article || "Article IV \u2013 Section 18. Offenses Related to Job Performance and Productivity.",
      violation1Clause: report.noiViolation1Clause || "(a) Non-observance of Standard Operating Procedures.",
      violation1Desc: report.noiViolation1Desc || "\u2013 willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense.",
      violation2Article: report.noiViolation2Article || "Section 16. Offenses Against Good Personal Behavior and Conduct",
      violation2Clause: report.noiViolation2Clause || "(f) Drunkenness.",
      violation2Desc: report.noiViolation2Desc || "Reporting for work under the influence of liquor or drinking alcoholic beverages during work hours (except on official functions).",
      paragraph2: report.noiParagraph2 || "You are entitled to counsel of your choice during this investigation. You may also bring your witness(es) if any. Please be guided that failure on your part to comply with this Notice of Investigation shall be considered submitted for a resolution based on the evidence on record.",
      witnessDay: report.noiWitnessDay || "12th",
      witnessMonthYear: report.noiWitnessMonthYear || "October 2026",
      witnessPlace: report.noiWitnessPlace || "Tacurong City, Sultan Kudarat, Philippines",
      signatoryName: report.noiSignatoryName || "JEVINCE JAYE S. JUBAY, CHRP",
      signatoryTitle: report.noiSignatoryTitle || "HRMD Manager",
      signatoryCompany: report.noiSignatoryCompany || "5A Royal Gaming OPC",
      footerText: report.noiFooterText || `HR 201 File & Records ${new Date().getFullYear()}`
    });
    setIsNoiModalOpen(true);
  };

  const handleViewNoiDocument = (report) => {
    setSelectedReport(report);
    const dateFormatted = report.noiIssuedAt || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
    const defaultHearingDate = report.zoomMeetingDate || "October 14, 2026";
    const defaultHearingTime = report.zoomMeetingTime || "2:30 PM";
    const defaultHearingMode = report.zoomMeetingMode || "via Zoom Meeting";
    const empName = (report.employeeName || "MICHAEL SIMPAL").toUpperCase();

    const defP1 = report.noiParagraph1 || `A notice of investigation is one of the requisites by the law to hear and explain your side, you are hereby directed to attend, submit your supporting documents, and bring a counsel of your own choice on ${defaultHearingDate}, ${defaultHearingTime} ${defaultHearingMode}, for the acts allegedly committed in violation of:`;

    setNoiForm({
      date: dateFormatted,
      toEmployee: empName,
      subject: report.noiSubject || "Notice of Investigation",
      hearingDate: defaultHearingDate,
      hearingTime: defaultHearingTime,
      hearingMode: defaultHearingMode,
      zoomMeetingTopic: report.zoomMeetingTopic || `Administrative Investigation Hearing: Case ${report.caseNumber} - ${empName}`,
      zoomMeetingLink: report.zoomMeetingLink || `https://zoom.us/j/${Math.floor(80000000000 + Math.random() * 9000000000)}?pwd=SGC${new Date().getFullYear()}`,
      zoomMeetingId: report.zoomMeetingId || `${Math.floor(812 + Math.random() * 100)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
      zoomPasscode: report.zoomPasscode || `SGC${new Date().getFullYear()}`,
      hearingCommittee: report.hearingCommittee || "SGC Due Process Committee & Central HRMD",
      paragraph1: defP1,
      violation1Article: report.noiViolation1Article || "Article IV \u2013 Section 18. Offenses Related to Job Performance and Productivity.",
      violation1Clause: report.noiViolation1Clause || "(a) Non-observance of Standard Operating Procedures.",
      violation1Desc: report.noiViolation1Desc || "\u2013 willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense.",
      violation2Article: report.noiViolation2Article || "Section 16. Offenses Against Good Personal Behavior and Conduct",
      violation2Clause: report.noiViolation2Clause || "(f) Drunkenness.",
      violation2Desc: report.noiViolation2Desc || "Reporting for work under the influence of liquor or drinking alcoholic beverages during work hours (except on official functions).",
      paragraph2: report.noiParagraph2 || "You are entitled to counsel of your choice during this investigation. You may also bring your witness(es) if any. Please be guided that failure on your part to comply with this Notice of Investigation shall be considered submitted for a resolution based on the evidence on record.",
      witnessDay: report.noiWitnessDay || "12th",
      witnessMonthYear: report.noiWitnessMonthYear || "October 2026",
      witnessPlace: report.noiWitnessPlace || "Tacurong City, Sultan Kudarat, Philippines",
      signatoryName: report.noiSignatoryName || "JEVINCE JAYE S. JUBAY, CHRP",
      signatoryTitle: report.noiSignatoryTitle || "HRMD Manager",
      signatoryCompany: report.noiSignatoryCompany || "5A Royal Gaming OPC",
      footerText: report.noiFooterText || `HR 201 File & Records ${new Date().getFullYear()}`
    });
    setIsNoiViewerOpen(true);
  };

  const handleIssueNoi = async () => {
    if (!selectedReport) return;
    const updated = {
      ...selectedReport,
      status: "NOI_ISSUED",
      noiSubject: noiForm.subject,
      noiIssuedAt: noiForm.date,
      zoomMeetingTopic: noiForm.zoomMeetingTopic,
      zoomMeetingDate: noiForm.hearingDate,
      zoomMeetingTime: noiForm.hearingTime,
      zoomMeetingMode: noiForm.hearingMode,
      zoomMeetingLink: noiForm.zoomMeetingLink,
      zoomMeetingId: noiForm.zoomMeetingId,
      zoomPasscode: noiForm.zoomPasscode,
      hearingCommittee: noiForm.hearingCommittee,
      noiParagraph1: noiForm.paragraph1,
      noiViolation1Article: noiForm.violation1Article,
      noiViolation1Clause: noiForm.violation1Clause,
      noiViolation1Desc: noiForm.violation1Desc,
      noiViolation2Article: noiForm.violation2Article,
      noiViolation2Clause: noiForm.violation2Clause,
      noiViolation2Desc: noiForm.violation2Desc,
      noiParagraph2: noiForm.paragraph2,
      noiWitnessDay: noiForm.witnessDay,
      noiWitnessMonthYear: noiForm.witnessMonthYear,
      noiWitnessPlace: noiForm.witnessPlace,
      noiSignatoryName: noiForm.signatoryName,
      noiSignatoryTitle: noiForm.signatoryTitle,
      noiSignatoryCompany: noiForm.signatoryCompany,
      noiFooterText: noiForm.footerText,
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-noi-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "NOI_ISSUED_WITH_ZOOM_SCHEDULE",
          actor: `${noiForm.signatoryName} (${noiForm.signatoryTitle})`,
          message: `Issued formal Notice of Investigation (NOI) with scheduled hearing on ${noiForm.hearingDate} at ${noiForm.hearingTime} ${noiForm.hearingMode}. Zoom Meeting ID: ${noiForm.zoomMeetingId}.`
        }
      ]
    };
    setIsTransmitting(true);
    setTransmittingMessage("Scheduling Zoom Hearing & issuing Notice of Investigation...");
    try {
      await saveIncidentReport(updated);
      await loadRecords();
      setIsNoiModalOpen(false);
      setSelectedReport(updated);
      setIsNoiViewerOpen(true);
      playAiVoiceAnnouncement(`Notice of Investigation officially issued with hearing schedule for ${selectedReport.employeeName}.`);
    } catch (err) {
      console.error("NOI issue error:", err);
      alert("Failed to issue NOI. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
  };

  // 5. Post-NOI: Decision on Administrative Case
  const handleOpenAdminDecisionModal = (report) => {
    setSelectedReport(report);
    const dateFormatted = report.adminDecisionIssuedAt || "October 21, 2026";
    const empName = (report.employeeName || "MICHAEL SIMPAL").toUpperCase();

    const bullet1Art = report.adminDecisionBullet1Article || report.noiViolation2Article || "Section 16. Offenses Against Good Personal Behavior and Conduct.";
    const bullet1D = report.adminDecisionBullet1Desc || (report.noiViolation2Clause && report.noiViolation2Desc
      ? `${report.noiViolation2Clause} ${report.noiViolation2Desc} is classified as serious offense.`
      : "(f) Drunkenness. Reporting for work under the influence of liquor or drinking alcoholic beverages during work hours (except on official functions) is classified as serious offense.");

    const bullet2Art = report.adminDecisionBullet2Article || report.noiViolation1Article || "Section 18. Offenses Related to Job Performance and Productivity";
    const bullet2D = report.adminDecisionBullet2Desc || (report.noiViolation1Clause && report.noiViolation1Desc
      ? `${report.noiViolation1Clause} ${report.noiViolation1Desc}`
      : "(a) Non-observance of Standard Operating Procedures. Willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense.");

    const defaultP1 = report.adminDecisionParagraph1 || "After reviewing the facts and circumstances surrounding the case, Management has determined that there is substantial basis to establish your accountability for the aforementioned violations. Management further notes that this is a repeated occurrence of the same or similar violation, notwithstanding prior reminders, and corrective measures previously undertaken.";
    const sanction = report.adminDecisionPenalty || "Final Stern Warning";
    const defaultP2 = report.adminDecisionParagraph2 || `In view thereof, please be informed that this shall serve as your \u201c${sanction}\u201d. Any further violations of company policies may result in the immediate termination of your employment.`;
    const defaultP3 = report.adminDecisionParagraph3 || "Please be guided accordingly.";

    setAdminDecisionForm({
      date: dateFormatted,
      toEmployee: empName,
      subject: report.adminDecisionSubject || "DECISION OF ADMINISTRATIVE CASE",
      introLine: report.adminDecisionIntroLine || "This is concerning your administrative case on;",
      bullet1Article: bullet1Art,
      bullet1Desc: bullet1D,
      bullet2Article: bullet2Art,
      bullet2Desc: bullet2D,
      paragraph1: defaultP1,
      sanctionLevel: sanction,
      paragraph2: defaultP2,
      paragraph3: defaultP3,
      signatoryName: report.adminDecisionSignatoryName || report.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP",
      signatoryTitle: report.adminDecisionSignatoryTitle || report.assignedCentralHrTitle || "HRMD Manager",
      signatoryCompany: report.adminDecisionSignatoryCompany || report.company || loggedInCompany || "5A Royal Gaming OPC",
      footerText: report.adminDecisionFooterText || `HR 201 File & Records ${new Date().getFullYear()}`
    });
    setIsAdminDecisionModalOpen(true);
  };

  const handleViewAdminDecisionDocument = (report) => {
    setSelectedReport(report);
    const dateFormatted = report.adminDecisionIssuedAt || "October 21, 2026";
    const empName = (report.employeeName || "MICHAEL SIMPAL").toUpperCase();

    const bullet1Art = report.adminDecisionBullet1Article || report.noiViolation2Article || "Section 16. Offenses Against Good Personal Behavior and Conduct.";
    const bullet1D = report.adminDecisionBullet1Desc || (report.noiViolation2Clause && report.noiViolation2Desc
      ? `${report.noiViolation2Clause} ${report.noiViolation2Desc} is classified as serious offense.`
      : "(f) Drunkenness. Reporting for work under the influence of liquor or drinking alcoholic beverages during work hours (except on official functions) is classified as serious offense.");

    const bullet2Art = report.adminDecisionBullet2Article || report.noiViolation1Article || "Section 18. Offenses Related to Job Performance and Productivity";
    const bullet2D = report.adminDecisionBullet2Desc || (report.noiViolation1Clause && report.noiViolation1Desc
      ? `${report.noiViolation1Clause} ${report.noiViolation1Desc}`
      : "(a) Non-observance of Standard Operating Procedures. Willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense.");

    const defaultP1 = report.adminDecisionParagraph1 || "After reviewing the facts and circumstances surrounding the case, Management has determined that there is substantial basis to establish your accountability for the aforementioned violations. Management further notes that this is a repeated occurrence of the same or similar violation, notwithstanding prior reminders, and corrective measures previously undertaken.";
    const sanction = report.adminDecisionPenalty || "Final Stern Warning";
    const defaultP2 = report.adminDecisionParagraph2 || `In view thereof, please be informed that this shall serve as your \u201c${sanction}\u201d. Any further violations of company policies may result in the immediate termination of your employment.`;
    const defaultP3 = report.adminDecisionParagraph3 || "Please be guided accordingly.";

    setAdminDecisionForm({
      date: dateFormatted,
      toEmployee: empName,
      subject: report.adminDecisionSubject || "DECISION OF ADMINISTRATIVE CASE",
      introLine: report.adminDecisionIntroLine || "This is concerning your administrative case on;",
      bullet1Article: bullet1Art,
      bullet1Desc: bullet1D,
      bullet2Article: bullet2Art,
      bullet2Desc: bullet2D,
      paragraph1: defaultP1,
      sanctionLevel: sanction,
      paragraph2: defaultP2,
      paragraph3: defaultP3,
      signatoryName: report.adminDecisionSignatoryName || report.assignedCentralHrName || "JEVINCE JAYE S. JUBAY, CHRP",
      signatoryTitle: report.adminDecisionSignatoryTitle || report.assignedCentralHrTitle || "HRMD Manager",
      signatoryCompany: report.adminDecisionSignatoryCompany || report.company || loggedInCompany || "5A Royal Gaming OPC",
      footerText: report.adminDecisionFooterText || `HR 201 File & Records ${new Date().getFullYear()}`
    });
    setIsAdminDecisionViewerOpen(true);
  };

  const handleIssueAdminDecision = async () => {
    if (!selectedReport) return;
    const updated = {
      ...selectedReport,
      status: "ADMIN_DECISION_ISSUED",
      adminDecisionSubject: adminDecisionForm.subject,
      adminDecisionIssuedAt: adminDecisionForm.date,
      adminDecisionPenalty: adminDecisionForm.sanctionLevel,
      adminDecisionIntroLine: adminDecisionForm.introLine,
      adminDecisionBullet1Article: adminDecisionForm.bullet1Article,
      adminDecisionBullet1Desc: adminDecisionForm.bullet1Desc,
      adminDecisionBullet2Article: adminDecisionForm.bullet2Article,
      adminDecisionBullet2Desc: adminDecisionForm.bullet2Desc,
      adminDecisionParagraph1: adminDecisionForm.paragraph1,
      adminDecisionParagraph2: adminDecisionForm.paragraph2,
      adminDecisionParagraph3: adminDecisionForm.paragraph3,
      adminDecisionSignatoryName: adminDecisionForm.signatoryName,
      adminDecisionSignatoryTitle: adminDecisionForm.signatoryTitle,
      adminDecisionSignatoryCompany: adminDecisionForm.signatoryCompany,
      adminDecisionFooterText: adminDecisionForm.footerText,
      activityLog: [
        ...(selectedReport.activityLog || []),
        {
          id: `act-decision-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "ADMIN_DECISION_ISSUED",
          actor: `${adminDecisionForm.signatoryName} (${adminDecisionForm.signatoryTitle})`,
          message: `Head Office promulgated official Decision on Administrative Case (${adminDecisionForm.sanctionLevel}). Sent to Branch HR for personal serving and signed employee acknowledgment.`
        }
      ]
    };
    setIsTransmitting(true);
    setTransmittingMessage("Promulgating Decision on Administrative Case to Branch HR...");
    try {
      await saveIncidentReport(updated);
      await loadRecords();
      setIsAdminDecisionModalOpen(false);
      setSelectedReport(updated);
      setIsAdminDecisionViewerOpen(true);
      playAiVoiceAnnouncement(`Decision on Administrative Case issued by Head Office for ${selectedReport.employeeName}. Returned to branch HR for serving and employee acknowledgment.`);
    } catch (err) {
      console.error("Admin decision error:", err);
      alert("Failed to promulgate decision. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
  };

  // 6. Direct Case Closure (No file upload required for Decision)
  const handleCloseCaseDirectly = async (report) => {
    if (!report) return;
    if (!window.confirm(`Close and archive Case ${report.caseNumber} for ${report.employeeName} in HR 201 File?`)) {
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
      ...report,
      status: "CASE_CLOSED",
      decisionClosedAt: timestampStr,
      activityLog: [
        ...(report.activityLog || []),
        {
          id: `act-closed-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "CASE_CLOSED",
          actor: `${effectiveRole.reportingName || effectiveRole.userName || currentUser?.name || "HR Admin"}`,
          message: `Administrative Case officially CLOSED and ARCHIVED in HR 201 File.`
        }
      ]
    };

    setIsTransmitting(true);
    setTransmittingMessage("Closing and archiving case in 201 file...");
    try {
      await saveIncidentReport(updated);
      await loadRecords();
      setSelectedReport(updated);
      playAiVoiceAnnouncement(`Case ${report.caseNumber} is now officially closed and archived in HR 201 records.`);
    } catch (err) {
      console.error("Close case error:", err);
      alert("Failed to close case. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
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

    setIsTransmitting(true);
    setTransmittingMessage("Issuing official Notice to Explain (NTE) to Branch HR...");
    try {
      await saveIncidentReport(updated);
      await loadRecords();
      setIsNteDraftModalOpen(false);
      setSelectedReport(updated);

      // Voice announcement
      const announcement = `Approved and returned! Official Notice to Explain has been issued by Simpal Group of Companies Head Office and dispatched back to ${senderCompany} HR ${senderHrName}. Please serve the document to ${updated.employeeName}.`;
      playAiVoiceAnnouncement(announcement);
    } catch (err) {
      console.error("NTE transmittal error:", err);
      alert("Failed to issue Notice to Explain. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
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

    setIsTransmitting(true);
    setTransmittingMessage("Updating NTE service status...");
    try {
      await saveIncidentReport(updated);
      await loadRecords();
      if (selectedReport?.id === report.id) setSelectedReport(updated);

      // Voice announcement
      const announcement = `Notice to Explain has been officially served to ${report.employeeName} by ${senderComp} HR. The one-working-day explanation period has commenced.`;
      playAiVoiceAnnouncement(announcement);
    } catch (err) {
      console.error("Serve NTE error:", err);
      alert("Failed to mark NTE as served. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
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

    setIsTransmitting(true);
    setTransmittingMessage("Transmitting explanation notes to Head Office SGC...");
    try {
      await saveIncidentReport(updated);
      await loadRecords();
      setIsExplanationModalOpen(false);

      // Voice announcement
      const announcement = `Employee written explanation has been received and transmitted to Simpal Group of Companies Head Office for administrative ruling on case ${report.caseNumber}.`;
      playAiVoiceAnnouncement(announcement);
    } catch (err) {
      console.error("Log explanation error:", err);
      alert("Failed to transmit explanation notes. Please try again.");
    } finally {
      setIsTransmitting(false);
      setTransmittingMessage("");
    }
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

  // Print Document Trigger: Dynamically supports IR, NTE, Notice of Warning, Notice of Investigation, and Decision of Administrative Case in Standard (A4), Short (Letter 8.5x11), Long (Folio 8.5x13), and Legal paper formats with guaranteed 1-Page Coupon Bond Fit
  const handlePrintDocument = (targetType = null) => {
    const isPrintingAdminDecision = targetType === "adminDecision" || (isAdminDecisionViewerOpen && !isIrViewerOpen && !isNteViewerOpen && !isWarningViewerOpen && !isNoiViewerOpen);
    const isPrintingNoi = targetType === "noi" || (isNoiViewerOpen && !isIrViewerOpen && !isNteViewerOpen && !isWarningViewerOpen && !isAdminDecisionViewerOpen);
    const isPrintingWarning = targetType === "warning" || (isWarningViewerOpen && !isIrViewerOpen && !isNteViewerOpen && !isNoiViewerOpen && !isAdminDecisionViewerOpen);
    const isPrintingNte = targetType === "nte" || (isNteViewerOpen && !isIrViewerOpen && !isWarningViewerOpen && !isNoiViewerOpen && !isAdminDecisionViewerOpen);
    const paperFormat = isPrintingAdminDecision ? adminDecisionPaperFormat : isPrintingNoi ? noiPaperFormat : isPrintingWarning ? warningPaperFormat : isPrintingNte ? ntePaperFormat : irPaperFormat;
    const printableId = isPrintingAdminDecision
      ? "printable-admin-decision-document-sheet"
      : isPrintingNoi
        ? "printable-noi-document-sheet"
        : isPrintingWarning
          ? "printable-warning-document-sheet"
          : isPrintingNte
            ? "printable-nte-document-sheet"
            : "printable-incident-report-sheet";

    const isA4 = paperFormat === "A4";
    const isShort = paperFormat === "SHORT";
    const isLegal = paperFormat === "LEGAL";
    const isLong = paperFormat === "LONG";

    // Set exact page size for @page print rule (W3C CSS compliant length notation)
    const pageSize = isA4
      ? "A4 portrait"
      : isShort
        ? "8.5in 11in"
        : isLegal
          ? "8.5in 14in"
          : "8.5in 13in";

    const paperWidth = isA4 ? "210mm" : "8.5in";
    const paperHeight = isA4 ? "297mm" : isShort ? "11in" : isLegal ? "14in" : "13in";

    const printableEl = document.getElementById(printableId);
    if (!printableEl) {
      window.print();
      return;
    }

    // Dynamic scale computation to fit exactly 1 coupon bond page without spill
    const targetHeightPx = isShort ? 1000 : isA4 ? 1070 : isLegal ? 1280 : 1190;
    const actualHeightPx = printableEl.scrollHeight || printableEl.offsetHeight || 920;
    
    let printScale = 1;
    if (actualHeightPx > targetHeightPx) {
      printScale = Math.min(1, Math.max(0.68, Number((targetHeightPx / actualHeightPx).toFixed(3))));
    } else if (isShort) {
      printScale = 0.94;
    }
    const printWidthPct = Number((100 / printScale).toFixed(2));

    // Dedicated clean print iframe (isolates from screen modals, headers, and scrollbars)
    let iframe = document.getElementById("dedicated-hr-print-iframe");
    if (iframe) {
      try { document.body.removeChild(iframe); } catch (e) {}
    }
    iframe = document.createElement("iframe");
    iframe.id = "dedicated-hr-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.zIndex = "-9999";
    document.body.appendChild(iframe);

    // Extract all styles (Tailwind, fonts, custom rules)
    const headStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((node) => node.outerHTML)
      .join("\n");

    const clonedEl = printableEl.cloneNode(true);
    // Strip fixed screen heights so it flows naturally in the 1-page wrapper
    clonedEl.style.minHeight = "auto";
    clonedEl.style.height = "auto";
    clonedEl.style.maxHeight = "none";
    clonedEl.style.width = "100%";
    clonedEl.style.maxWidth = "100%";
    clonedEl.style.margin = "0";
    clonedEl.style.boxShadow = "none";
    clonedEl.style.border = "none";
    clonedEl.style.borderRadius = "0";

    const printPadding = isPrintingAdminDecision || isPrintingNoi || isPrintingWarning
      ? (isShort ? "6mm 14mm 5mm 14mm" : isA4 ? "8mm 14mm 6mm 14mm" : "10mm 16mm 8mm 16mm")
      : isPrintingNte
        ? (isShort ? "5mm 10mm 4mm 10mm" : isA4 ? "6mm 12mm 5mm 12mm" : "8mm 12mm 6mm 12mm")
        : (isShort ? "3mm 6mm 2mm 6mm" : isA4 ? "4mm 7mm 3mm 7mm" : "5mm 8mm 4mm 8mm");

    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>HR Hub Official Document - ${paperFormat}</title>
        ${headStyles}
        <style>
          @page {
            size: ${pageSize} !important;
            margin: 0 !important;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: ${paperWidth} !important;
            height: ${paperHeight} !important;
            max-width: ${paperWidth} !important;
            max-height: ${paperHeight} !important;
            background: #ffffff !important;
            overflow: hidden !important;
            font-family: 'Figtree', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          }
          .bond-paper-print-wrapper {
            width: ${paperWidth} !important;
            height: ${paperHeight} !important;
            max-width: ${paperWidth} !important;
            max-height: ${paperHeight} !important;
            margin: 0 auto !important;
            padding: ${printPadding} !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
          .bond-paper-scaler {
            width: ${printWidthPct}% !important;
            height: 100% !important;
            box-sizing: border-box !important;
            transform: scale(${printScale}) !important;
            transform-origin: top left !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
        </style>
      </head>
      <body>
        <div class="bond-paper-print-wrapper">
          <div class="bond-paper-scaler">
            ${clonedEl.innerHTML}
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(printHtml);
      iframeDoc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch (e) {
          console.warn("Iframe print error:", e);
          window.print();
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 4000);
      };

      // Ensure images in iframe are fully loaded before printing
      const checkAndPrint = () => {
        const imgs = Array.from(iframeDoc.images || []);
        if (imgs.length === 0) {
          setTimeout(triggerPrint, 250);
          return;
        }
        const promises = imgs.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        });
        Promise.all(promises).then(() => {
          setTimeout(triggerPrint, 250);
        });
      };

      if (iframeDoc.readyState === "complete") {
        checkAndPrint();
      } else {
        iframe.onload = checkAndPrint;
        setTimeout(triggerPrint, 800);
      }
    } catch (err) {
      console.warn("Iframe print fallback to window.print:", err);
      window.print();
    }
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
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${voiceMutedState
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
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${voiceMutedState
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 ${active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${active ? "bg-white/20 text-white" : tab.badgeColor || "bg-slate-200 text-slate-700"
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

              // Compute completed historical documents for this case (Step Dossier)
              const pastDossier = [];

              // 1. Initial Incident Report (always completed once case moves past pending evaluation)
              if (!isPendingSgc) {
                pastDossier.push({
                  id: "ir",
                  title: "Incident Report (IR Form)",
                  subtitle: `Initial filing by ${senderComp}`,
                  statusText: "Submitted",
                  statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
                  icon: FileText,
                  iconColor: "text-[#7ea741]",
                  onClick: () => handleViewIrDocument(report)
                });
              }

              // 2. Official Notice to Explain (NTE)
              const hasNteDoc = report.hasNte || report.nteIssuedAt || isNteIssued || isNteAcknowledged || isServed || isExplanation || isWarning || isNoi || isAdminDecision || isClosed;
              if (hasNteDoc && !isNteIssued && !isServed) {
                pastDossier.push({
                  id: "nte",
                  title: "Notice to Explain (NTE)",
                  subtitle: `Issued ${report.nteIssuedAt || "by Head Office"}`,
                  statusText: "Served",
                  statusColor: "text-blue-700 bg-blue-50 border-blue-200",
                  icon: FileText,
                  iconColor: "text-slate-800",
                  onClick: () => handleViewNteDocument(report)
                });
              }

              // 3. Signed NTE & Employee Written Explanation
              const hasDualProof = report.hasSignedNteProof || report.hasExplanationProof || report.nteSignedProof || report.explanationProof || isNteAcknowledged || isExplanation;
              const isPastExplanation = isWarning || isNoi || isAdminDecision || isClosed;
              if (hasDualProof && isPastExplanation) {
                pastDossier.push({
                  id: "explanation",
                  title: "Signed NTE & Written Explanation",
                  subtitle: "Branch HR serving proof & employee letter",
                  statusText: "Verified Proof",
                  statusColor: "text-teal-700 bg-teal-50 border-teal-200",
                  icon: FileCheck,
                  iconColor: "text-teal-600",
                  onClick: () => {
                    const initialTab = (report.hasSignedNteProof || report.nteSignedProof || report.nteSignedProofKey) ? "SIGNED_NTE" : "EXPLANATION_DOC";
                    handleOpenViewSignedNteProof(report, initialTab);
                  }
                });
              }

              // 4. Notice of Investigation (if NOI was conducted and case moved forward)
              const hasNoiRecord = report.noiIssuedAt || report.noiSubject || report.zoomMeetingDate;
              if ((isAdminDecision || isClosed) && hasNoiRecord) {
                pastDossier.push({
                  id: "noi",
                  title: "Notice of Investigation Memo",
                  subtitle: `Zoom Hearing • ${report.zoomMeetingDate || "Conducted"}`,
                  statusText: "Hearing Record",
                  statusColor: "text-indigo-700 bg-indigo-50 border-indigo-200",
                  icon: Scale,
                  iconColor: "text-indigo-600",
                  onClick: () => handleViewNoiDocument(report)
                });
              }

              // 5. Notice of Warning (if warning was issued and case is archived/closed)
              if (isClosed && (report.warningIssuedAt || report.warningNoticePenalty)) {
                pastDossier.push({
                  id: "warning",
                  title: "Notice of Warning Memo",
                  subtitle: report.warningNoticePenalty || "Final Stern Warning",
                  statusText: "Sanction Issued",
                  statusColor: "text-amber-700 bg-amber-50 border-amber-200",
                  icon: AlertTriangle,
                  iconColor: "text-amber-600",
                  onClick: () => handleViewWarningDocument(report)
                });
              }

              // 6. Decision of Administrative Case (if case is closed)
              if (isClosed && (report.adminDecisionIssuedAt || report.adminDecisionSubject || report.adminDecisionSanction)) {
                pastDossier.push({
                  id: "adminDecision",
                  title: "Decision of Administrative Case",
                  subtitle: `Sanction: ${report.adminDecisionSanction || "Final Stern Warning"}`,
                  statusText: "Resolution",
                  statusColor: "text-rose-700 bg-rose-50 border-rose-200",
                  icon: Scale,
                  iconColor: "text-rose-600",
                  onClick: () => handleViewAdminDecisionDocument(report)
                });
              }

              // Compute 5 Due Process Levels status & states:
              let currentLevelNumber = 1;
              if (isPendingSgc || isFiledForRecord) {
                currentLevelNumber = 1;
              } else if (isNteIssued || isServed) {
                currentLevelNumber = 2;
              } else if (isNteAcknowledged || isExplanation) {
                currentLevelNumber = 3;
              } else if (isWarning || isNoi) {
                currentLevelNumber = 4;
              } else if (isAdminDecision || isClosed) {
                currentLevelNumber = 5;
              }

              const levelPercent = isClosed
                ? 100
                : isAdminDecision
                  ? 95
                  : isWarning || isNoi
                    ? 80
                    : isNteAcknowledged || isExplanation
                      ? 60
                      : isNteIssued || isServed
                        ? 40
                        : 20;

              // Level 1: Incident Filing (IR)
              const isLv1Done = !isPendingSgc;
              const isLv1Active = isPendingSgc;

              // Level 2: Notice to Explain (NTE)
              const hasNteIssued = report.hasNte || report.nteIssuedAt || isNteIssued || isNteAcknowledged || isServed || isExplanation || isWarning || isNoi || isAdminDecision || isClosed;
              const isLv2Done = hasNteIssued && !isNteIssued && !isServed;
              const isLv2Active = isNteIssued || isServed;

              // Level 3: Explanation & Evidence
              const hasExplanation = report.hasSignedNteProof || report.hasExplanationProof || report.nteSignedProof || report.explanationProof || isExplanation || isWarning || isNoi || isAdminDecision || isClosed;
              const isLv3Done = hasExplanation && !isNteAcknowledged && (isWarning || isNoi || isAdminDecision || isClosed);
              const isLv3Active = isNteAcknowledged || isExplanation || ((isNteIssued || isServed) && !isLv3Done);

              // Level 4: Investigation / Hearing
              const isLv4Done = isAdminDecision || isClosed;
              const isLv4Active = isWarning || isNoi;

              // Level 5: Administrative Decision & Closure
              const isLv5Done = isClosed;
              const isLv5Active = isAdminDecision;

              return (
                <div
                  key={report.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/60 transition flex flex-col xl:flex-row items-stretch justify-between gap-5 relative border-b border-slate-100 last:border-b-0"
                >
                  {/* ========================================================================= */}
                  {/* ZONE 1 (LEFT ~60%): EMPLOYEE, INCIDENT DETAILS & SENDER-RECEIVER ROUTING  */}
                  {/* ========================================================================= */}
                  <div className="space-y-3 flex-1 min-w-0 pr-0 xl:pr-3">
                    {/* Header Row: Case ID, Entity Tag, AI Voice & Status Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-900 text-white shadow-2xs">
                        <span className="font-mono text-xs font-bold tracking-wide">
                          {report.caseNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const summary = `Case ${report.caseNumber}. Issued by ${senderComp} HR ${senderHr} for ${report.employeeName}. Sent to ${receiverComp} Head Office HRMD. Current stage: Level ${currentLevelNumber} of 5. Status: ${isPendingSgc
                              ? "Awaiting Head Office SGC Notice to Explain issuance."
                              : isNteIssued
                                ? "Notice to Explain has been issued by SGC and returned to branch HR for serving."
                                : isServed
                                  ? "Notice to Explain has been served to employee."
                                  : isExplanation
                                    ? "Written explanation received."
                                    : isWarning
                                      ? "Notice of Warning issued."
                                      : isNoi
                                        ? "Notice of Investigation hearing scheduled."
                                        : isAdminDecision
                                          ? "Decision on Administrative Case issued."
                                          : "Case closed and archived."
                              }`;
                            playAiVoiceAnnouncement(summary);
                          }}
                          title="Listen to case summary via AI Buddy"
                          className="p-0.5 rounded text-slate-300 hover:text-white transition cursor-pointer"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>

                      {/* Entity Branding Badge */}
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                        <img
                          src={getPaperLogo(report.company || senderComp)}
                          alt={report.company || senderComp}
                          className="w-3.5 h-3.5 object-contain"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                        <span className="text-[11px] font-bold text-slate-800">{report.company || senderComp}</span>
                      </div>

                      {/* Due Process Stage Capsule */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isClosed
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : isAdminDecision
                            ? "bg-rose-50 text-rose-800 border-rose-300 animate-pulse"
                            : isWarning
                              ? "bg-amber-50 text-amber-900 border-amber-300"
                              : isNoi
                                ? "bg-indigo-50 text-indigo-800 border-indigo-300 animate-pulse"
                                : isExplanation
                                  ? "bg-purple-50 text-purple-800 border-purple-300"
                                  : isNteAcknowledged
                                    ? "bg-teal-50 text-teal-800 border-teal-300"
                                    : isServed
                                      ? "bg-blue-50 text-blue-800 border-blue-300"
                                      : isNteIssued
                                        ? "bg-amber-50 text-amber-800 border-amber-300 animate-pulse"
                                        : isFiledForRecord
                                          ? "bg-slate-100 text-slate-700 border-slate-300"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {isClosed && <CheckCheck size={12} className="text-emerald-700" />}
                        {isAdminDecision && <Scale size={12} className="text-rose-600" />}
                        {isNoi && <Scale size={12} className="text-indigo-600" />}
                        {isWarning && <AlertTriangle size={12} className="text-amber-700" />}
                        {isExplanation && <CheckCircle2 size={12} className="text-purple-600" />}
                        {(isNteIssued || isServed || isPendingSgc) && <Clock size={12} className="text-amber-600" />}
                        <span>
                          {isClosed
                            ? "✅ Closed & 201 Archived"
                            : isAdminDecision
                              ? "Level 5: Decision Promulgated"
                              : isNoi
                                ? "Level 4: Formal Hearing (NOI)"
                                : isWarning
                                  ? "Level 4: Notice of Warning"
                                  : isExplanation
                                    ? "Level 3: Explanation Evaluated"
                                    : isNteAcknowledged
                                      ? "Level 3: Awaiting Written Answer"
                                      : isServed
                                        ? "Level 2: Active 120h Explanation"
                                        : isNteIssued
                                          ? "Level 2: NTE Dispatched to Branch"
                                          : isFiledForRecord
                                            ? "Level 1: 201 Record Only"
                                            : "Level 1: Transmitted Incident"}
                        </span>
                      </span>

                      <span className="text-[11px] text-slate-400 ml-auto xl:ml-0">
                        Incident Date: <strong>{report.dateOfIncident || report.auditDates}</strong>
                      </span>
                    </div>

                    {/* Employee Profile Header */}
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
                          <span className="truncate max-w-[280px]">{report.branch || "Tacurong Branch"}</span>
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
                        <div className="mt-2 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 leading-relaxed">
                          <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-500 block mb-0.5">
                            INCIDENT DETAILS:
                          </span>
                          <p className="line-clamp-3 italic text-slate-800">
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

                  {/* ========================================================================= */}
                  {/* ZONE 2 (RIGHT ~40%): DUE PROCESS LEVELS VISUAL TIMELINE & ACTION DOCK      */}
                  {/* ========================================================================= */}
                  <div className="w-full xl:w-[410px] 2xl:w-[450px] shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 sm:p-4 flex flex-col justify-between self-stretch">
                    <div>
                      {/* Box Header: Pipeline Title & Level Counter */}
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Scale size={14} className="text-slate-800" />
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                            Due Process Levels
                          </span>
                        </div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          isClosed
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : isAdminDecision
                              ? "bg-rose-50 text-rose-800 border-rose-300"
                              : isWarning || isNoi
                                ? "bg-indigo-50 text-indigo-800 border-indigo-300"
                                : isExplanation || isNteAcknowledged
                                  ? "bg-purple-50 text-purple-800 border-purple-300"
                                  : isNteIssued || isServed
                                    ? "bg-amber-50 text-amber-800 border-amber-300"
                                    : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}>
                          {isClosed ? "✓ Completed (5/5)" : `Level ${currentLevelNumber} of 5`}
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-200/60">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isClosed
                              ? "bg-emerald-500"
                              : isAdminDecision
                                ? "bg-rose-600"
                                : isWarning || isNoi
                                  ? "bg-indigo-600"
                                  : isExplanation || isNteAcknowledged
                                    ? "bg-purple-600"
                                    : isNteIssued || isServed
                                      ? "bg-amber-500"
                                      : "bg-slate-400"
                          }`}
                          style={{ width: `${levelPercent}%` }}
                        />
                      </div>

                      {/* 5-Level Vertical Timeline */}
                      <div className="relative pl-6 space-y-2.5 before:absolute before:left-[10px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                        {/* Level 1: Incident Filing */}
                        <div className="relative flex items-center justify-between gap-2">
                          <div className={`absolute -left-6 top-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-black border transition ${
                            isLv1Done
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                              : isLv1Active
                                ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                                : "bg-white text-slate-400 border-slate-300"
                          }`}>
                            {isLv1Done ? <Check size={12} strokeWidth={3} /> : "1"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 leading-tight">
                              Lv 1: Incident Filing (IR)
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {senderComp} • {report.dateOfIncident || "Logged"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleViewIrDocument(report)}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer shrink-0 inline-flex items-center gap-1"
                            title="Inspect Initial Incident Report"
                          >
                            <Eye size={11} className="text-slate-500" />
                            <span>View IR</span>
                          </button>
                        </div>

                        {/* Level 2: Notice to Explain (NTE) */}
                        <div className="relative flex items-center justify-between gap-2">
                          <div className={`absolute -left-6 top-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-black border transition ${
                            isLv2Done
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                              : isLv2Active
                                ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                                : "bg-white text-slate-400 border-slate-300"
                          }`}>
                            {isLv2Done ? <Check size={12} strokeWidth={3} /> : "2"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                              <span>Lv 2: Notice to Explain (NTE)</span>
                              {isLv2Active && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                  Active 120h
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {hasNteIssued ? `Issued ${report.nteIssuedAt || "by SGC"}` : "Pending SGC evaluation"}
                            </div>
                          </div>
                          {hasNteIssued ? (
                            <button
                              type="button"
                              onClick={() => handleViewNteDocument(report)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer shrink-0 inline-flex items-center gap-1"
                              title="Inspect Official Notice to Explain"
                            >
                              <Eye size={11} className="text-slate-500" />
                              <span>View NTE</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Pending</span>
                          )}
                        </div>

                        {/* Level 3: Explanation & Evidence */}
                        <div className="relative flex items-center justify-between gap-2">
                          <div className={`absolute -left-6 top-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-black border transition ${
                            isLv3Done
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                              : isLv3Active
                                ? "bg-purple-600 text-white border-purple-700 animate-pulse"
                                : "bg-white text-slate-400 border-slate-300"
                          }`}>
                            {isLv3Done ? <Check size={12} strokeWidth={3} /> : "3"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                              <span>Lv 3: Signed NTE & Answer</span>
                              {isNteAcknowledged && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">
                                  1/2 Done
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {hasExplanation
                                ? "Serving proof & employee answer attached"
                                : "Signed copy & written explanation"}
                            </div>
                          </div>
                          {hasExplanation ? (
                            <button
                              type="button"
                              onClick={() => {
                                const initialTab = (report.hasSignedNteProof || report.nteSignedProof || report.nteSignedProofKey) ? "SIGNED_NTE" : "EXPLANATION_DOC";
                                handleOpenViewSignedNteProof(report, initialTab);
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer shrink-0 inline-flex items-center gap-1"
                              title="Inspect signed NTE proof & employee explanation letter"
                            >
                              <FileCheck size={11} className="text-teal-600" />
                              <span>Proof</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Pending</span>
                          )}
                        </div>

                        {/* Level 4: Investigation / Hearing / Warning */}
                        <div className="relative flex items-center justify-between gap-2">
                          <div className={`absolute -left-6 top-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-black border transition ${
                            isLv4Done
                              ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                              : isLv4Active
                                ? (isWarning ? "bg-amber-500 text-white border-amber-600 animate-pulse" : "bg-indigo-600 text-white border-indigo-700 animate-pulse")
                                : "bg-white text-slate-400 border-slate-300"
                          }`}>
                            {isLv4Done ? <Check size={12} strokeWidth={3} /> : "4"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                              <span>Lv 4: Investigation / Hearing</span>
                              {isNoi && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                                  Zoom Hearing
                                </span>
                              )}
                              {isWarning && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                  Warning
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {isWarning
                                ? "Notice of Warning issued"
                                : hasNoiRecord
                                  ? `NOI Zoom • ${report.zoomMeetingDate || "Conducted"}`
                                  : (isAdminDecision || isClosed)
                                    ? "Executive Due Process Evaluation"
                                    : "Formal hearing committee evaluation"}
                            </div>
                          </div>
                          {isWarning ? (
                            <button
                              type="button"
                              onClick={() => handleViewWarningDocument(report)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer shrink-0 inline-flex items-center gap-1"
                              title="View Notice of Warning"
                            >
                              <AlertTriangle size={11} className="text-amber-600" />
                              <span>Warning</span>
                            </button>
                          ) : hasNoiRecord ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleViewNoiDocument(report)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer shrink-0 inline-flex items-center gap-1"
                                title="View Notice of Investigation"
                              >
                                <Scale size={11} className="text-indigo-600" />
                                <span>NOI</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReport(report);
                                  setIsZoomViewerOpen(true);
                                }}
                                className="p-1 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition cursor-pointer shrink-0"
                                title="Zoom Meeting Schedule"
                              >
                                <Video size={11} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              {(isAdminDecision || isClosed) ? "Evaluated" : "Pending"}
                            </span>
                          )}
                        </div>

                        {/* Level 5: Administrative Decision & Closure */}
                        <div className="relative flex items-center justify-between gap-2">
                          <div className={`absolute -left-6 top-0.5 w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-black border transition ${
                            isLv5Done
                              ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                              : isLv5Active
                                ? "bg-rose-600 text-white border-rose-700 animate-pulse"
                                : "bg-white text-slate-400 border-slate-300"
                          }`}>
                            {isLv5Done ? <CheckCheck size={12} strokeWidth={2.5} /> : "5"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">
                              <span>Lv 5: Decision & Closure</span>
                              {isAdminDecision && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-100 text-rose-800">
                                  Promulgated
                                </span>
                              )}
                              {isClosed && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                  Closed
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {isClosed
                                ? "Case Closed & 201 Archived"
                                : isAdminDecision
                                  ? `Sanction: ${report.adminDecisionSanction || report.adminDecisionPenalty || "Stern Warning"}`
                                  : "2nd Notice — Administrative Ruling"}
                            </div>
                          </div>
                          {(isAdminDecision || isClosed) ? (
                            <button
                              type="button"
                              onClick={() => handleViewAdminDecisionDocument(report)}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-white hover:bg-slate-100 text-rose-800 border border-rose-200 shadow-2xs transition cursor-pointer shrink-0 inline-flex items-center gap-1"
                              title="View Decision of Administrative Case"
                            >
                              <Scale size={11} className="text-rose-600" />
                              <span>Decision</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Pending</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* BOTTOM ACTION DOCK: ROLE-AWARE ACTIONS FOR CURRENT ACTIVE STAGE           */}
                    {/* ========================================================================= */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        <span>Current Stage Action:</span>
                        <span className="text-slate-400 font-mono text-[9px]">{report.caseNumber}</span>
                      </div>

                      {/* 1. STAGE: PENDING SGC EVALUATION */}
                      {isPendingSgc && (
                        <div className="space-y-1.5">
                          {effectiveRole.isHeadOffice ? (
                            <>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddToFilings(report)}
                                  className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs"
                                  title="SGC Head Office Discretion: File for 201 records only"
                                >
                                  <span>📁 File Only</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenDraftNte(report)}
                                  className="flex-2 py-1.5 px-3 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transition cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-98"
                                  title="SGC Head Office Discretion: Issue official Notice to Explain (NTE)"
                                >
                                  <Scale size={13} />
                                  <span>⚖️ Issue Notice to Explain</span>
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCloseCaseDirectly(report)}
                                className="w-full py-1.5 px-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1 active:scale-98"
                                title="Close and archive this incident report directly in HR 201 File"
                              >
                                <CheckCheck size={13} />
                                <span>Close & Archive Case</span>
                              </button>
                            </>
                          ) : (
                            <div className="space-y-1.5">
                              <span className="block text-center py-1.5 px-2.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Awaiting Head Office (SGC) Evaluation
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCloseCaseDirectly(report)}
                                className="w-full py-1.5 px-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1 active:scale-98"
                                title="Close and archive this incident report in HR 201 File"
                              >
                                <CheckCheck size={13} />
                                <span>Close & Archive Case</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. STAGE: FILED FOR RECORD ONLY */}
                      {isFiledForRecord && (
                        <button
                          type="button"
                          onClick={() =>
                            alert(
                              `📁 201 FILING RECORD NOTES:\n\nFiled On: ${report.filedAt || "Recorded"
                              }\nRemarks: ${report.filingRemarks ||
                              "Retained in HR 201 files for record purposes only."
                              }`
                            )
                          }
                          className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                        >
                          <span>📁 View Filing Notes</span>
                        </button>
                      )}

                      {/* 3. STAGE: NTE ISSUED / SERVED */}
                      {(isNteIssued || isServed) && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewNteDocument(report)}
                            className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                          >
                            <Eye size={14} />
                            <span>View Official NTE Document</span>
                          </button>

                          {/* Branch HR Upload Submissions */}
                          {!effectiveRole.isHeadOffice && (!report.hasSignedNteProof || !report.hasExplanationProof) && (
                            <button
                              type="button"
                              onClick={() => handleOpenUploadNteProof(report, "ALL")}
                              className="w-full py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-md shadow-emerald-600/25 transition cursor-pointer inline-flex items-center justify-center gap-2 active:scale-98 animate-pulse"
                              title="Branch HR: Upload received & signed NTE copy and employee written explanation"
                            >
                              <UploadCloud size={14} />
                              <span>
                                {report.hasSignedNteProof
                                  ? "Upload Written Answer (1/2 Done)"
                                  : report.hasExplanationProof
                                    ? "Upload Signed NTE Proof (1/2 Done)"
                                    : "Upload Signed NTE & Answer"}
                              </span>
                            </button>
                          )}

                          {effectiveRole.isHeadOffice && !report.hasSignedNteProof && !report.hasExplanationProof && (
                            <span className="block text-center py-1.5 px-2.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              Awaiting Branch HR Signed Copy & Answer
                            </span>
                          )}
                        </div>
                      )}

                      {/* 4. STAGE: EXPLANATION SUBMITTED */}
                      {isExplanation && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const initialTab = (report.hasSignedNteProof || report.nteSignedProof || report.nteSignedProofKey)
                                ? "SIGNED_NTE"
                                : "EXPLANATION_DOC";
                              handleOpenViewSignedNteProof(report, initialTab);
                            }}
                            className="w-full py-2 px-3 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-98"
                            title="Inspect received and signed NTE acknowledgment proof & employee written explanation"
                          >
                            <FileCheck size={14} />
                            <span>📄 View Signed NTE & Explanation</span>
                          </button>

                          {effectiveRole.isHeadOffice ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenWarningModal(report)}
                                className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1"
                                title="SGC Head Office Discretion: End proceeding with Notice of Warning"
                              >
                                <AlertTriangle size={13} />
                                <span>Issue Warning</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenNoiModal(report)}
                                className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition cursor-pointer inline-flex items-center justify-center gap-1"
                                title="SGC Head Office Discretion: Proceed to formal Notice of Investigation and schedule Zoom hearing"
                              >
                                <Scale size={13} />
                                <span>Proceed to NOI</span>
                              </button>
                            </div>
                          ) : (
                            <span className="block text-center py-1.5 px-2.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              Under SGC Head Office Evaluation
                            </span>
                          )}
                        </div>
                      )}

                      {/* 5. STAGE: NOTICE OF WARNING ISSUED */}
                      {isWarning && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewWarningDocument(report)}
                            className="w-full py-2 px-3 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                            title="View & Print official Notice of Warning document"
                          >
                            <Printer size={14} />
                            <span>⚠️ View & Print Warning Memo</span>
                          </button>
                          <div className="flex items-center gap-2">
                            {effectiveRole.isHeadOffice && (
                              <button
                                type="button"
                                onClick={() => handleOpenWarningModal(report)}
                                className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 transition cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs"
                                title="Edit or adjust warning memo details"
                              >
                                <FileEdit size={13} />
                                <span>Edit Memo</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCloseCaseDirectly(report)}
                              className="flex-1 py-1.5 px-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1 active:scale-98"
                              title="Close and archive this case in HR 201 File after Warning"
                            >
                              <CheckCheck size={13} />
                              <span>Close & Archive Case</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 6. STAGE: NOTICE OF INVESTIGATION (NOI) */}
                      {isNoi && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewNoiDocument(report)}
                            className="w-full py-2 px-3 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95"
                            title="View & Print Official Notice of Investigation (NOI)"
                          >
                            <Printer size={14} />
                            <span>📄 View & Print NOI Memo</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReport(report);
                                setIsZoomViewerOpen(true);
                              }}
                              className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition cursor-pointer inline-flex items-center justify-center gap-1"
                              title="View Zoom Meeting Schedule & Join Link"
                            >
                              <Video size={13} className="text-indigo-600" />
                              <span>Zoom Link</span>
                            </button>

                            {effectiveRole.isHeadOffice && (
                              <button
                                type="button"
                                onClick={() => handleOpenNoiModal(report)}
                                className="flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition cursor-pointer inline-flex items-center justify-center gap-1"
                                title="Edit or adjust NOI details"
                              >
                                <FileEdit size={13} />
                                <span>Edit Memo</span>
                              </button>
                            )}
                          </div>

                          {effectiveRole.isHeadOffice && (
                            <button
                              type="button"
                              onClick={() => handleOpenAdminDecisionModal(report)}
                              className="w-full py-2 px-3 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 transition cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-98"
                            >
                              <Scale size={14} />
                              <span>⚖️ Issue Decision on Admin Case</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* 7. STAGE: DECISION ON ADMINISTRATIVE CASE ISSUED */}
                      {isAdminDecision && (
                        <div className="space-y-1.5">
                          {/* Primary View & Print button */}
                          <button
                            type="button"
                            onClick={() => handleViewAdminDecisionDocument(report)}
                            className="w-full py-2 px-3 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95"
                            title="View & Print Official Decision of Administrative Case"
                          >
                            <Printer size={14} />
                            <span>⚖️ View & Print Admin Decision</span>
                          </button>

                          <div className="flex items-center gap-2">
                            {effectiveRole.isHeadOffice && (
                              <button
                                type="button"
                                onClick={() => handleOpenAdminDecisionModal(report)}
                                className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition cursor-pointer inline-flex items-center justify-center gap-1 shadow-2xs"
                                title="Edit or adjust decision memo details"
                              >
                                <FileEdit size={13} />
                                <span>Edit Memo</span>
                              </button>
                            )}

                            {/* Direct Close & Archive Case without file upload */}
                            <button
                              type="button"
                              onClick={() => handleCloseCaseDirectly(report)}
                              className="flex-1 py-1.5 px-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1 active:scale-98"
                              title="Close and archive this case in HR 201 File without requiring proof upload"
                            >
                              <CheckCheck size={13} />
                              <span>Close & Archive Case</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 8. STAGE: CASE CLOSED */}
                      {isClosed && (
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewAdminDecisionDocument(report)}
                            className="w-full py-2 px-3 rounded-xl text-xs font-black bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
                            title="View Official Decision of Administrative Case Document"
                          >
                            <Printer size={14} className="text-slate-600" />
                            <span>⚖️ View Decision Document</span>
                          </button>

                          <div className="w-full py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-center gap-1.5">
                            <CheckCheck size={14} className="text-emerald-700" />
                            <span>Case Closed & Archived in 201 File</span>
                          </div>
                        </div>
                      )}
                    </div>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Top Green Banner */}
            <div className="bg-[#96c158] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <img
                  src={getPaperLogo(irForm.company || irForm.senderCompany)}
                  alt="Company Logo"
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
                  {/* Date of Incident & Type of Incident (Location removed to avoid redundancy) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        DATE OF INCIDENT <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={irForm.dateOfIncident}
                          onChange={(e) => setIrForm({ ...irForm, dateOfIncident: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900 font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-700 mb-1">
                        TYPE OF INCIDENT <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <AlertTriangle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
                        <input
                          type="text"
                          list="incident-type-presets-list"
                          placeholder="e.g. Cash Shortage & Non-observance of SOPs"
                          value={irForm.typeOfIncident || irForm.incidentCategory || ""}
                          onChange={(e) => setIrForm({ ...irForm, typeOfIncident: e.target.value, incidentCategory: e.target.value })}
                          className="w-full pl-9 pr-2.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#153459] text-slate-900 font-semibold"
                        />
                        <datalist id="incident-type-presets-list">
                          <option value="Cash Shortage & Non-observance of SOPs" />
                          <option value="Drawer Discrepancy & Unaccounted Cash" />
                          <option value="Gross Neglect of Duty / Non-observance of SOPs" />
                          <option value="Habitual Tardiness & Unauthorized Absence (AWOL)" />
                          <option value="Insubordination / Willful Disobedience" />
                          <option value="Breach of Trust & Confidentiality" />
                          <option value="Misappropriation of Company Funds" />
                          <option value="Misconduct / Policy Violation" />
                        </datalist>
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
                        <span>Prepared By (HR)</span>
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
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center relative group">
                        {/* Live Scaled Signature Preview */}
                        <div className="h-20 w-full flex items-center justify-center overflow-hidden bg-white/70 rounded-lg border border-dashed border-slate-200 p-1">
                          <img
                            src={irForm.preparerSignature}
                            alt="Preparer E-Signature"
                            style={{
                              transform: `scale(${irForm.preparerSignatureScale || 1.25})`,
                              transformOrigin: "center"
                            }}
                            className="max-h-14 object-contain transition-transform duration-100"
                          />
                        </div>

                        {/* Interactive E-Sig Size Controls */}
                        <div className="w-full flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase text-slate-500">Size:</span>
                            <button
                              type="button"
                              onClick={() => setIrForm(prev => ({
                                ...prev,
                                preparerSignatureScale: Math.max(0.7, Number(((prev.preparerSignatureScale || 1.25) - 0.15).toFixed(2)))
                              }))}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-black flex items-center justify-center transition cursor-pointer text-xs"
                              title="Make signature smaller"
                            >
                              -
                            </button>
                            <span className="text-[11px] font-mono font-bold text-slate-800 min-w-[36px] text-center">
                              {Math.round((irForm.preparerSignatureScale || 1.25) * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setIrForm(prev => ({
                                ...prev,
                                preparerSignatureScale: Math.min(2.2, Number(((prev.preparerSignatureScale || 1.25) + 0.15).toFixed(2)))
                              }))}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-black flex items-center justify-center transition cursor-pointer text-xs"
                              title="Make signature bigger"
                            >
                              +
                            </button>
                          </div>

                          {/* Quick Scale Presets */}
                          <div className="flex items-center gap-1">
                            {[1.0, 1.3, 1.6].map(scale => (
                              <button
                                key={scale}
                                type="button"
                                onClick={() => setIrForm(prev => ({ ...prev, preparerSignatureScale: scale }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${Math.abs((irForm.preparerSignatureScale || 1.25) - scale) < 0.05
                                  ? "bg-[#153459] text-white shadow-2xs"
                                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                  }`}
                              >
                                {scale === 1.0 ? "1x" : scale === 1.3 ? "1.3x" : "1.6x"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIrForm({ ...irForm, preparerSignature: "" })}
                          className="mt-2 text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
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
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center relative group">
                        {/* Live Scaled Signature Preview */}
                        <div className="h-20 w-full flex items-center justify-center overflow-hidden bg-white/70 rounded-lg border border-dashed border-slate-200 p-1">
                          <img
                            src={irForm.operationsManagerSignature}
                            alt="Operations Manager E-Signature"
                            style={{
                              transform: `scale(${irForm.operationsManagerSignatureScale || 1.25})`,
                              transformOrigin: "center"
                            }}
                            className="max-h-14 object-contain transition-transform duration-100"
                          />
                        </div>

                        {/* Interactive E-Sig Size Controls */}
                        <div className="w-full flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase text-slate-500">Size:</span>
                            <button
                              type="button"
                              onClick={() => setIrForm(prev => ({
                                ...prev,
                                operationsManagerSignatureScale: Math.max(0.7, Number(((prev.operationsManagerSignatureScale || 1.25) - 0.15).toFixed(2)))
                              }))}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-black flex items-center justify-center transition cursor-pointer text-xs"
                              title="Make signature smaller"
                            >
                              -
                            </button>
                            <span className="text-[11px] font-mono font-bold text-slate-800 min-w-[36px] text-center">
                              {Math.round((irForm.operationsManagerSignatureScale || 1.25) * 100)}%
                            </span>
                            <button
                              type="button"
                              onClick={() => setIrForm(prev => ({
                                ...prev,
                                operationsManagerSignatureScale: Math.min(2.2, Number(((prev.operationsManagerSignatureScale || 1.25) + 0.15).toFixed(2)))
                              }))}
                              className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-black flex items-center justify-center transition cursor-pointer text-xs"
                              title="Make signature bigger"
                            >
                              +
                            </button>
                          </div>

                          {/* Quick Scale Presets */}
                          <div className="flex items-center gap-1">
                            {[1.0, 1.3, 1.6].map(scale => (
                              <button
                                key={scale}
                                type="button"
                                onClick={() => setIrForm(prev => ({ ...prev, operationsManagerSignatureScale: scale }))}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${Math.abs((irForm.operationsManagerSignatureScale || 1.25) - scale) < 0.05
                                  ? "bg-[#153459] text-white shadow-2xs"
                                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                                  }`}
                              >
                                {scale === 1.0 ? "1x" : scale === 1.3 ? "1.3x" : "1.6x"}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIrForm({ ...irForm, operationsManagerSignature: "" })}
                          className="mt-2 text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
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
                        <strong className="text-emerald-700">✓ Successfully saved as Default E-Signatories in the database!</strong>
                      ) : (
                        <span>Set as Default Signatories so that the e-signatures and names will automatically appear on every subsequent IR.</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-start justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-6xl w-full h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Controls Bar - COMPLETELY HIDDEN WHEN PRINTING */}
            <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-2xs">
                  {selectedReport.caseNumber}
                </span>
                <span className="text-xs font-black text-slate-800 tracking-tight hidden sm:inline">
                  Official Incident Report Form
                </span>

                {/* Seamless Format Toggle (Short / Standard A4 / Long / Legal) */}
                <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg text-xs font-semibold ml-1">
                  <button
                    type="button"
                    onClick={() => setIrPaperFormat("SHORT")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${irPaperFormat === "SHORT"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Short (8.5×11)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIrPaperFormat("LONG")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${irPaperFormat === "LONG"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Long (8.5×13)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIrPaperFormat("A4")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${irPaperFormat === "A4"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Standard (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIrPaperFormat("LEGAL")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${irPaperFormat === "LEGAL"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Legal (8.5×14)
                  </button>
                </div>

                {/* 1-Page Auto-Fit Active Indicator */}
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Auto 1-Page Fit ({irPaperFormat === "SHORT" ? "Short: 8.5×11in" : irPaperFormat === "LONG" ? "Long: 8.5×13in" : irPaperFormat === "A4" ? "A4: 210×297mm" : "Legal: 8.5×14in"})
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
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-[#eef7e5] text-slate-700 hover:text-[#55782a] transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Volume2 size={14} />
                  <span>Listen</span>
                </button>

                {/* Direct Close & Archive Case button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsIrViewerOpen(false);
                    handleCloseCaseDirectly(selectedReport);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                  title="Close and archive this case directly in HR 201 File"
                >
                  <CheckCheck size={14} />
                  <span>Close Case</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => handlePrintDocument("ir")}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-95 ring-1 ring-slate-950/20"
                >
                  <Printer size={14} className="text-emerald-400" />
                  <span>Print Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsIrViewerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Authentic Printable Document Container */}
            <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-6 pb-12 bg-slate-200/80 flex justify-center items-start custom-scrollbar">
              <div
                id="printable-incident-report-sheet"
                style={{
                  width: irPaperFormat === "A4" ? "210mm" : "8.5in",
                  minWidth: irPaperFormat === "A4" ? "210mm" : "8.5in",
                  maxWidth: irPaperFormat === "A4" ? "210mm" : "8.5in",
                  minHeight: irPaperFormat === "A4" ? "297mm" : irPaperFormat === "SHORT" ? "11in" : irPaperFormat === "LEGAL" ? "14in" : "13in",
                  boxSizing: "border-box",
                }}
                className={`bg-white shadow-2xl ring-1 ring-slate-900/10 rounded-xs text-slate-900 font-sans relative shrink-0 flex flex-col justify-between transition-all duration-150 print:p-0 print:border-none print:shadow-none print:ring-0 ${irPaperFormat === "SHORT"
                  ? "p-3.5 sm:p-4 md:p-5"
                  : irPaperFormat === "A4"
                    ? "p-4 sm:p-6"
                    : irPaperFormat === "LEGAL"
                      ? "p-6 sm:p-8"
                      : "p-5 sm:p-7"
                  }`}
              >
                {/* Top Right Corner Geometric Diagonal Stripes */}
                <div className="absolute top-0 right-0 w-28 h-20 sm:w-32 sm:h-24 pointer-events-none overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 144 112" fill="none">
                    <polygon points="60,0 144,0 144,84" fill="#0f2b48" />
                    <polygon points="38,0 52,0 144,72 144,84" fill="#c81e1e" />
                    <polygon points="22,0 30,0 134,112 126,112" fill="#0f2b48" />
                  </svg>
                </div>

                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
                  <img src={getPaperLogo(selectedReport?.senderCompany || selectedReport?.company)} alt="watermark" className="w-[110mm] max-w-[400px] h-auto object-contain" />
                </div>

                <div className={`relative z-10 ${irPaperFormat === "SHORT"
                  ? "space-y-1.5 sm:space-y-2"
                  : irPaperFormat === "A4"
                    ? "space-y-2 sm:space-y-2.5"
                    : "space-y-2.5 sm:space-y-3"
                  }`}>
                  {/* ============================================================== */}
                  {/* HEADER SECTION: LOGO + TITLE + REPORT NO / DATE FILED BOX      */}
                  {/* ============================================================== */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200">
                    {/* Left: Company Logo & Branding */}
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <img
                        src={getPaperLogo(selectedReport?.senderCompany || selectedReport?.company)}
                        alt="Company Logo"
                        className={`${irPaperFormat === "SHORT" ? "w-12 h-12" : "w-13 h-13 sm:w-15 sm:h-15"} object-contain shrink-0`}
                      />

                      <div>
                        <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase leading-none">
                          {getPaperCompanyName(selectedReport?.senderCompany || selectedReport?.company)}
                        </h2>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                            INCIDENT REPORT FILING
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Center: Main Title Block */}
                    <div className="border-l-2 border-[#0f2b48] pl-2.5 sm:pl-3.5 my-auto">
                      <h1 className={`${irPaperFormat === "SHORT" ? "text-base sm:text-lg" : "text-lg sm:text-xl"} font-black uppercase tracking-wider text-[#0f2b48] leading-none`}>
                        INCIDENT REPORT
                      </h1>
                      <div className="text-[9.5px] sm:text-[10.5px] font-semibold uppercase tracking-[0.22em] text-slate-600 mt-0.5">
                        EMPLOYEE VIOLATION
                      </div>
                      <p className="text-[8.5px] sm:text-[9.5px] italic text-slate-500 mt-0.5">
                        A safe and respectful workplace is everyone's responsibility.
                      </p>
                    </div>

                    {/* Right: Report No. & Date Filed Box */}
                    <div className={`bg-[#f0f4f9] border border-[#d2e0ee] rounded-md ${irPaperFormat === "SHORT" ? "p-1.5 min-w-[155px]" : "p-2 min-w-[165px]"} text-[10.5px] font-semibold text-slate-800 space-y-0.5 shrink-0 self-start sm:self-center`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-500 min-w-[62px]">Report No. :</span>
                        <span className="font-mono font-bold text-[#0f2b48] border-b border-slate-300 flex-1 pb-0.5">
                          {selectedReport.caseNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] uppercase font-bold text-slate-500 min-w-[62px]">Date Filed :</span>
                        <span className="font-semibold text-slate-800 border-b border-slate-300 flex-1 pb-0.5">
                          {selectedReport.dateReported || selectedReport.createdAt?.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Official Head Office Transmittal & Contact Routing Strip */}
                  <div className={`bg-[#f0f4f9] border border-[#d2e0ee] rounded-md ${irPaperFormat === "SHORT" ? "px-2.5 py-1 text-[9.5px]" : "px-3 py-1.5 text-[10px]"} flex flex-wrap items-center justify-between gap-1.5`}>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="font-extrabold text-[#0f2b48] uppercase tracking-wide">Transmitted to Head Office HRMD:</span>
                      <span className="font-semibold text-slate-900">Simpal Group of Companies</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Mail size={11} className="text-[#c81e1e]" />
                      <span className="font-extrabold text-[#0f2b48]">Head Office Email:</span>
                      <a href="mailto:imsoroglohr@gmail.com" className="font-bold text-[#c81e1e] hover:underline font-mono">
                        imsoroglohr@gmail.com
                      </a>
                    </div>
                    <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-500">
                      Official Transmittal Record
                    </span>
                  </div>

                  {/* ============================================================== */}
                  {/* 1. EMPLOYEE INFORMATION                                        */}
                  {/* ============================================================== */}
                  <div className="space-y-0">
                    <div className="bg-[#153459] text-white px-2.5 py-0.5 rounded-t-md font-black text-[10.5px] uppercase tracking-wider flex items-center gap-1.5">
                      <User size={12} className="text-white" />
                      <span>EMPLOYEE INFORMATION</span>
                    </div>

                    <div className={`bg-[#f4f7fb] border border-t-0 border-[#d0dbe7] rounded-b-md ${irPaperFormat === "SHORT" ? "p-2 text-[10px]" : "p-2.5 sm:p-3 text-[10.5px]"}`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                        {/* Left Column */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9.5px] font-semibold text-slate-700 min-w-[75px]">Full Name :</span>
                            <span className="font-bold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                              {selectedReport.employeeName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9.5px] font-semibold text-slate-700 min-w-[75px]">Employee ID :</span>
                            <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                              {selectedReport.employeeId || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9.5px] font-semibold text-slate-700 min-w-[75px]">Position :</span>
                            <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                              {selectedReport.employeePosition || "Cashier"}
                            </span>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9.5px] font-semibold text-slate-700 min-w-[95px]">Department / Unit :</span>
                            <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5">
                              {selectedReport.department || "Finance & Cashier Operations"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9.5px] font-semibold text-slate-700 min-w-[95px]">Area / Branch :</span>
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
                    <div className="bg-[#153459] text-white px-2.5 py-0.5 rounded-t-md font-black text-[10.5px] uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={12} className="text-white" />
                      <span>INCIDENT DETAILS</span>
                    </div>

                    <div className={`bg-[#f4f7fb] border border-t-0 border-[#d0dbe7] rounded-b-md ${irPaperFormat === "SHORT" ? "p-2 space-y-1.5 text-[10px]" : "p-2.5 sm:p-3 space-y-2 text-[10.5px]"}`}>
                      {/* Row 1: Date of Incident & Type of Incident */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className="text-[#153459] shrink-0" />
                          <span className="text-[9.5px] font-semibold text-slate-700">Date of Incident :</span>
                          <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5 text-[10.5px]">
                            {selectedReport.dateOfIncident || selectedReport.auditDates || "—"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <AlertTriangle size={12} className="text-[#c81e1e] shrink-0" />
                          <span className="text-[9.5px] font-semibold text-slate-700">Type of Incident :</span>
                          <span className="font-semibold text-slate-900 border-b border-slate-300 flex-1 pb-0.5 truncate text-[10.5px]">
                            {selectedReport.typeOfIncident || selectedReport.incidentCategory || "Cash Shortage & Non-observance of SOPs"}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Factual Description of the Incident */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-800">
                          <FileText size={11} className="text-[#153459]" />
                          <span>Factual Description of the Incident:</span>
                        </div>
                        <div
                          className={`w-full p-1.5 sm:p-2 text-[10.5px] sm:text-[11px] text-slate-900 leading-[18px] ${irPaperFormat === "SHORT" ? "min-h-[42px]" : "min-h-[48px]"} whitespace-pre-wrap rounded-xs`}
                          style={{
                            backgroundImage: "linear-gradient(to bottom, transparent 17px, #d1d5db 18px)",
                            backgroundSize: "100% 18px"
                          }}
                        >
                          {selectedReport.factualDescription || selectedReport.specificFindings || selectedReport.fullIncidentNarrative || "During surprise drawer reconciliation audit, a physical cash shortage was uncovered. The personnel on duty could not produce balancing vouchers or valid justification for the discrepancy."}
                        </div>
                      </div>

                      {/* Row 3: Witnesses (if any) */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-800">
                          <Users size={11} className="text-[#153459]" />
                          <span>Witnesses (if any):</span>
                        </div>
                        <div
                          className={`w-full p-1.5 sm:p-2 text-[10.5px] sm:text-[11px] text-slate-900 leading-[18px] ${irPaperFormat === "SHORT" ? "min-h-[26px]" : "min-h-[30px]"} whitespace-pre-wrap rounded-xs`}
                          style={{
                            backgroundImage: "linear-gradient(to bottom, transparent 17px, #d1d5db 18px)",
                            backgroundSize: "100% 18px"
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
                        className="bg-[#c81e1e] text-white px-3 py-0.5 font-black text-[10.5px] uppercase tracking-wider flex items-center gap-1.5 rounded-t-md"
                        style={{ clipPath: "polygon(0 0, 100% 0, 92% 100%, 0 100%)", paddingRight: "22px" }}
                      >
                        <AlertTriangle size={12} className="text-white shrink-0" />
                        <span>VIOLATION</span>
                      </div>
                    </div>

                    <div className={`bg-[#fef2f2] border border-[#fecaca] rounded-b-md ${irPaperFormat === "SHORT" ? "p-2 space-y-1.5 text-[9.5px]" : "p-2.5 sm:p-3 space-y-2 text-[10px]"}`}>
                      <p className="text-[9.5px] italic font-semibold text-slate-700">
                        Please indicate the specific policy, rule, or standard that was violated.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-0.5">
                        {/* Column 1 */}
                        <div className="space-y-1">
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
                              <div key={item} className="flex items-center gap-1.5 text-[10px] text-slate-800 font-medium">
                                <div className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 ${isChecked ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                                  {isChecked && <Check size={10} strokeWidth={3} />}
                                </div>
                                <span>{item}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-1">
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
                              <div key={item} className="flex items-center gap-1.5 text-[10px] text-slate-800 font-medium">
                                <div className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 ${isChecked ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                                  {isChecked && <Check size={10} strokeWidth={3} />}
                                </div>
                                <span>{item}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Column 3: Other & Remarks */}
                        <div className="space-y-1 border-t md:border-t-0 md:border-l border-rose-200 pt-1 md:pt-0 md:pl-2.5">
                          <div className="flex items-center gap-1.5 text-[9.5px]">
                            <div className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 ${selectedReport.otherViolation ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                              {selectedReport.otherViolation && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className="font-semibold text-slate-700 whitespace-nowrap">Other (please specify)</span>
                          </div>
                          <div className="border-b border-slate-300 pb-0.5 text-[10.5px] text-slate-900 font-semibold min-h-[15px]">
                            {selectedReport.otherViolation || ""}
                          </div>

                          <div className="pt-0.5">
                            <div className="text-[9px] font-bold text-slate-700 mb-0.5">Remarks (if any):</div>
                            <div
                              className={`w-full p-1 text-[10.5px] text-slate-800 leading-[17px] ${irPaperFormat === "SHORT" ? "min-h-[24px]" : "min-h-[28px]"} whitespace-pre-wrap`}
                              style={{
                                backgroundImage: "linear-gradient(to bottom, transparent 16px, #cbd5e1 17px)",
                                backgroundSize: "100% 17px"
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
                    <div className="bg-[#153459] text-white px-2.5 py-0.5 rounded-t-md font-black text-[10.5px] uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip size={12} className="text-white" />
                      <span>ATTACHMENTS / EVIDENCE</span>
                    </div>

                    <div className={`bg-[#f4f7fb] border border-t-0 border-[#d0dbe7] rounded-b-md ${irPaperFormat === "SHORT" ? "p-2 text-[9.5px]" : "p-2.5 sm:p-3 text-[10px]"}`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {/* Column 1 */}
                        <div className="space-y-1">
                          {[
                            "Photos (if any)",
                            "Reports / Logs",
                            "System Records / CCTV (if any)"
                          ].map((item) => {
                            const isChecked = Array.isArray(selectedReport.attachments)
                              ? selectedReport.attachments.includes(item)
                              : true;
                            return (
                              <div key={item} className="flex items-center gap-1.5 text-[10px] text-slate-800 font-medium">
                                <div className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 ${isChecked ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                                  {isChecked && <Check size={10} strokeWidth={3} />}
                                </div>
                                <span>{item}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[9.5px]">
                            <div className={`w-3.5 h-3.5 rounded-xs border-2 flex items-center justify-center shrink-0 ${selectedReport.otherAttachments ? "bg-[#153459] border-[#153459] text-white" : "bg-white border-slate-400"}`}>
                              {selectedReport.otherAttachments && <Check size={10} strokeWidth={3} />}
                            </div>
                            <span className="font-semibold text-slate-700">Other (please specify)</span>
                          </div>
                          <div
                            className={`w-full p-1 text-[10.5px] text-slate-800 leading-[17px] ${irPaperFormat === "SHORT" ? "min-h-[22px]" : "min-h-[26px]"} whitespace-pre-wrap`}
                            style={{
                              backgroundImage: "linear-gradient(to bottom, transparent 16px, #cbd5e1 17px)",
                              backgroundSize: "100% 17px"
                            }}
                          >
                            {selectedReport.otherAttachments || selectedReport.additionalNotes || "Attached physical audit reconciliation count discrepancy sheet."}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ============================================================== */}
                  {/* 5. SIGNATURES / ENDORSEMENTS (Prepared By & Reviewed By)       */}
                  {/* ============================================================== */}
                  {(() => {
                    // In Head Office account, "Approved by" is completely removed per user request
                    const showApprovedBy = !effectiveRole.isHeadOffice && Boolean(selectedReport.approvedBySignature);
                    return (
                      <div className={`bg-[#f4f7fb] border border-[#d0dbe7] rounded-md ${irPaperFormat === "SHORT" ? "p-2 text-[10px]" : "p-2.5 sm:p-3 text-[10.5px]"}`}>
                        <div className={`grid grid-cols-1 ${showApprovedBy ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3 sm:gap-4`}>
                          {/* 1. Prepared by */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-800 block">Prepared by:</span>
                            <div className="h-10 sm:h-12 flex items-center justify-center border-b border-slate-300 pb-0.5 overflow-hidden">
                              {selectedReport.preparerSignature ? (
                                <img
                                  src={selectedReport.preparerSignature}
                                  alt="Preparer E-Sig"
                                  style={{
                                    transform: `scale(${selectedReport.preparerSignatureScale || 1.15})`,
                                    transformOrigin: "center"
                                  }}
                                  className="max-h-9 sm:max-h-10 object-contain transition-transform"
                                />
                              ) : (
                                <span className="text-[9.5px] text-slate-400 italic">(Signed on file)</span>
                              )}
                            </div>
                            <div className="text-center pt-0.5">
                              <div className="text-[10px] font-extrabold text-slate-900 uppercase">
                                {selectedReport.preparerName || selectedReport.senderHrName}
                              </div>
                              <div className="text-[9px] text-slate-500 font-medium">
                                Name / Position ({selectedReport.preparerTitle || "Branch HR"})
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-200 text-[9px]">
                              <span className="text-slate-500 font-semibold">Date:</span>
                              <span className="text-slate-900 font-medium">{selectedReport.dateReported || selectedReport.createdAt?.slice(0, 10)}</span>
                            </div>
                          </div>

                          {/* 2. Reviewed by */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-800 block">Noted by:</span>
                            <div className="h-10 sm:h-12 flex items-center justify-center border-b border-slate-300 pb-0.5 overflow-hidden">
                              {selectedReport.operationsManagerSignature ? (
                                <img
                                  src={selectedReport.operationsManagerSignature}
                                  alt="Manager E-Sig"
                                  style={{
                                    transform: `scale(${selectedReport.operationsManagerSignatureScale || 1.15})`,
                                    transformOrigin: "center"
                                  }}
                                  className="max-h-9 sm:max-h-10 object-contain transition-transform"
                                />
                              ) : (
                                <span className="text-[9.5px] text-slate-400 italic">(Signed on file)</span>
                              )}
                            </div>
                            <div className="text-center pt-0.5">
                              <div className="text-[10px] font-extrabold text-slate-900 uppercase">
                                {selectedReport.operationsManagerName || "Operations Manager"}
                              </div>
                              <div className="text-[9px] text-slate-500 font-medium">
                                Name / Position ({selectedReport.operationsManagerTitle || "Area Operations Manager"})
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-200 text-[9px]">
                              <span className="text-slate-500 font-semibold">Date:</span>
                              <span className="text-slate-900 font-medium">{selectedReport.dateReported || selectedReport.createdAt?.slice(0, 10)}</span>
                            </div>
                          </div>

                          {/* 3. Approved by (Strictly omitted in Head Office account view) */}
                          {showApprovedBy && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-slate-800 block">Approved by:</span>
                              <div className="h-10 sm:h-12 flex items-center justify-center border-b border-slate-300 pb-0.5 overflow-hidden">
                                {selectedReport.approvedBySignature ? (
                                  <img
                                    src={selectedReport.approvedBySignature}
                                    alt="Approver E-Sig"
                                    className="max-h-9 sm:max-h-10 object-contain"
                                  />
                                ) : (
                                  <span className="text-[9.5px] text-slate-400 italic">(Simpal Group of Companies HRMD)</span>
                                )}
                              </div>
                              <div className="text-center pt-0.5">
                                <div className="text-[10px] font-extrabold text-slate-900 uppercase">
                                  {selectedReport.approvedByName || selectedReport.receiverHrName || "JEVINCE JAYE S. JUBAY, CHRP"}
                                </div>
                                <div className="text-[9px] text-slate-500 font-medium">
                                  Name / Position ({selectedReport.approvedByTitle || "HRMD Manager"})
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 pt-0.5 border-t border-slate-200 text-[9px]">
                                <span className="text-slate-500 font-semibold">Date:</span>
                                <span className="text-slate-900 font-medium">{selectedReport.reportReceivedDate || selectedReport.dateReported || selectedReport.createdAt?.slice(0, 10)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* RESPONDENT ACKNOWLEDGMENT (Only shown if signed conformed) */}
                  {Boolean(selectedReport.respondentSignature) && (
                    <div className="p-2 rounded-lg bg-white border border-slate-300 shadow-2xs space-y-1 text-[9.5px]">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold uppercase text-slate-800">Respondent Conforme (Signed Receipt)</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">Officially Signed</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <img src={selectedReport.respondentSignature} alt="Respondent Signature" className="max-h-8 object-contain" />
                        <div className="text-[10px]">
                          <strong className="text-slate-900 block text-[10.5px]">{selectedReport.respondentSignedName || selectedReport.employeeName}</strong>
                          <span className="text-[9px] text-slate-500">{selectedReport.respondentSignedAt || "Signed receipt"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ============================================================== */}
                {/* FOOTER: CONFIDENTIAL + GEOMETRIC ACCENT STRIPES               */}
                {/* ============================================================== */}
                <div className="relative pt-2 pb-0.5 mt-1 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-[8.5px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                    <div className="w-8 sm:w-10 h-px bg-slate-400" />
                    <span>CONFIDENTIAL — INTERNAL USE ONLY</span>
                    <span>•</span>
                    <span>HEAD OFFICE HRMD: <a href="mailto:imsoroglohr@gmail.com" className="text-[#0f2b48] lowercase font-mono hover:underline">imsoroglohr@gmail.com</a></span>
                    <div className="w-8 sm:w-10 h-px bg-slate-400" />
                  </div>

                  {/* Bottom Right Corner Geometric Stripes */}
                  <div className="absolute bottom-0 right-0 w-24 h-14 sm:w-28 sm:h-16 pointer-events-none overflow-hidden">
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-6xl w-full max-h-[96vh] h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls Bar */}
            <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-2xs">
                  {selectedReport.caseNumber}
                </span>
                <span className="text-xs font-black text-slate-800 tracking-tight hidden sm:inline">
                  Official Notice to Explain (Issued by Head Office SGC)
                </span>

                {/* Bond Paper Format Selector (Short / Long / Standard A4 / Legal) */}
                <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg text-xs font-semibold ml-1">
                  <button
                    type="button"
                    onClick={() => setNtePaperFormat("SHORT")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${ntePaperFormat === "SHORT"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Short (8.5×11)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNtePaperFormat("LONG")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${ntePaperFormat === "LONG"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Long (8.5×13)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNtePaperFormat("A4")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${ntePaperFormat === "A4"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Standard (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNtePaperFormat("LEGAL")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${ntePaperFormat === "LEGAL"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Legal (8.5×14)
                  </button>
                </div>

                {/* 1-Page Auto-Fit Active Indicator */}
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Auto 1-Page Fit ({ntePaperFormat === "SHORT" ? "Short: 8.5×11in" : ntePaperFormat === "LONG" ? "Long: 8.5×13in" : ntePaperFormat === "A4" ? "A4: 210×297mm" : "Legal: 8.5×14in"})
                </span>
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
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Volume2 size={14} />
                  <span>Listen</span>
                </button>

                {/* Direct Close & Archive Case button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsNteViewerOpen(false);
                    handleCloseCaseDirectly(selectedReport);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                  title="Close and archive this case in HR 201 File"
                >
                  <CheckCheck size={14} />
                  <span>Close Case</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => handlePrintDocument("nte")}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-95 ring-1 ring-slate-950/20"
                >
                  <Printer size={14} className="text-emerald-400" />
                  <span>Print Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsNteViewerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Official Letterhead Printable Document Container - Desk Canvas */}
            <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 pb-12 bg-slate-200/80 flex justify-center items-start custom-scrollbar">
              <div
                id="printable-nte-document-sheet"
                style={{
                  width: ntePaperFormat === "A4" ? "210mm" : "8.5in",
                  minWidth: ntePaperFormat === "A4" ? "210mm" : "8.5in",
                  maxWidth: ntePaperFormat === "A4" ? "210mm" : "8.5in",
                  minHeight: ntePaperFormat === "A4" ? "297mm" : ntePaperFormat === "SHORT" ? "11in" : ntePaperFormat === "LEGAL" ? "14in" : "13in",
                  boxSizing: "border-box",
                }}
                className={`bg-white shadow-2xl ring-1 ring-slate-900/10 rounded-xs text-slate-900 font-sans relative shrink-0 flex flex-col justify-between transition-all duration-150 print:p-0 print:border-none print:shadow-none print:ring-0 ${ntePaperFormat === "SHORT"
                  ? "p-4 sm:p-6 md:p-7"
                  : ntePaperFormat === "A4"
                    ? "p-6 sm:p-8 md:p-10"
                    : ntePaperFormat === "LEGAL"
                      ? "p-8 sm:p-11 md:p-13"
                      : "p-7 sm:p-10 md:p-12"
                  }`}
              >
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
                  <img src={getPaperLogo(selectedReport?.senderCompany || selectedReport?.company)} alt="watermark" className="w-[110mm] max-w-[420px] h-auto object-contain" />
                </div>

                <div className="relative z-10 flex flex-col flex-1 justify-between">
                  <div>
                    {/* 1. Official Header */}
                    <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                      {/* Left Logo */}
                      <div className="flex items-center gap-2">
                        <img src={getPaperLogo(selectedReport?.senderCompany || selectedReport?.company)} alt="Company Logo" className="h-16 w-auto object-contain" />
                      </div>

                      {/* Center Text */}
                      <div className="text-center flex-1 px-4">
                        <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-slate-900 leading-tight">
                          {getPaperCompanyName(selectedReport?.senderCompany || selectedReport?.company)}
                        </h2>
                        <p className="text-[11px] text-slate-700 mt-0.5">
                          Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat, Philippines
                        </p>
                        <p className="text-[11px] text-slate-700">
                          Gmail: <span className="underline font-medium">imsoroglohr@gmail.com</span>
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
                    <div className="mt-4 sm:mt-5 space-y-1 text-sm text-slate-900 font-sans">
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <span className="font-bold">Date:</span>
                        <span className="font-medium">{selectedReport.nteDate || "September 28, 2026"}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <span className="font-bold">To:</span>
                        <span className="font-extrabold uppercase tracking-wide">{selectedReport.employeeName}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-2">
                        <span className="font-bold">Subject:</span>
                        <span className="font-extrabold">Notice to Explain</span>
                      </div>
                    </div>

                    <div className="w-full h-[1.5px] bg-slate-900 my-2.5" />

                    {/* 3. Document Body Content (Exact structure from photo) */}
                    <div className={`${ntePaperFormat === "SHORT" ? "space-y-2 text-[11.5px] leading-snug" : "space-y-3.5 text-xs sm:text-[13px] leading-relaxed"} text-slate-800 text-justify`}>
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
                      <div className={`pl-4 border-l-4 border-amber-500 bg-amber-50/60 rounded-r-xl space-y-1 ${ntePaperFormat === "SHORT" ? "p-2.5 my-1.5" : "p-3.5 my-3"}`}>
                        <p className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                          EMPLOYEES CODE OF CONDUCT VIOLATION CHARGE:
                        </p>
                        <div className="font-semibold text-slate-900 whitespace-pre-wrap text-xs sm:text-[13px] leading-relaxed">
                          {selectedReport.codeOfConductSection ||
                            "Section 14. Offenses Against Honesty, Financial Custodianship & Company Property."}
                        </div>
                      </div>

                      {/* Dynamic Philippine Labor Code Grounds */}
                      <div className={`pl-4 border-l-4 border-blue-600 bg-blue-50/60 rounded-r-xl space-y-1 ${ntePaperFormat === "SHORT" ? "p-2.5 my-1.5" : "p-3.5 my-3"}`}>
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
                  </div>

                  <div>
                    {/* 4. Signatory Block (Issued by Simpal Group of Companies Head Office HRMD) */}
                    <div className={`${ntePaperFormat === "SHORT" ? "mt-4 pt-2" : "mt-7 pt-3"}`}>
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
                    <div className={`${ntePaperFormat === "SHORT" ? "mt-4 pt-1" : "mt-7 pt-2"}`}>
                      <div className="space-y-1">
                        <p className="text-xs text-slate-600">Received by:</p>
                        <p className="font-black text-sm uppercase tracking-wide text-slate-900 mt-1 border-b border-slate-400 inline-block min-w-[240px] pb-1">
                          {selectedReport.employeeName}
                        </p>
                        <p className="text-[11px] text-slate-500">Date & Signature</p>
                      </div>
                    </div>

                    {/* 6. Document Footer */}
                    <div className={`${ntePaperFormat === "SHORT" ? "mt-4 pt-2" : "mt-8 pt-3"} border-t border-slate-200 text-right text-[10px] text-slate-400`}>
                      {selectedReport.nteFooterNote || "HR 201 File & Records 2026"}
                    </div>
                  </div>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${signMode === "DRAW"
                        ? "bg-white text-slate-900 shadow-xs font-bold"
                        : "text-slate-500 hover:text-slate-800"
                        }`}
                    >
                      Draw Signature
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignMode("TYPE")}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer ${signMode === "TYPE"
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 2: BRANCH HR ONLY — UPLOAD SIGNED NTE PROOF OF RECEIPT    */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 2: BRANCH HR ONLY — UPLOAD SIGNED NTE & WRITTEN EXPLANATION */}
      {/* ========================================================================= */}
      {isUploadNteProofModalOpen && selectedReport && !effectiveRole.isHeadOffice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-5xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  <UploadCloud size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <span>Return Submissions: Signed NTE & Written Explanation</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                      2 Required Documents
                    </span>
                  </h2>
                  <p className="text-xs text-emerald-100/90">
                    Branch HR Return to SGC Head Office • Case {selectedReport.caseNumber} ({selectedReport.employeeName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadNteProofModalOpen(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Due Process Guidance Notice */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-emerald-900">
                    DOLE Due Process Compliance Protocol:
                  </div>
                  <div className="text-[11px] text-emerald-800 leading-relaxed">
                    After the Head Office issues the Notice to Explain (NTE),the Branch HR must upload the following  <strong>two (2) documents</strong>:
                    <ol className="list-decimal ml-4 mt-1 space-y-0.5">
                      <li><strong>Received at Signed na NTE</strong> — Proof that the employee personally received and signed the NTE.</li>
                      <li><strong>In-Written Explanation of Employee</strong> — The employee’s handwritten or signed written explanation in response to the NTE.</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Grid with 2 distinct document cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ======================================================== */}
                {/* DOCUMENT 1: RECEIVED & SIGNED NTE PROOF                  */}
                {/* ======================================================== */}
                <div className={`p-4 rounded-2xl border-2 transition flex flex-col justify-between ${nteProofData.fileData
                  ? "bg-emerald-50/40 border-emerald-300"
                  : "bg-slate-50 border-slate-200"
                  }`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                          1
                        </span>
                        <span>Received & Signed NTE</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${nteProofData.fileData
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                        {nteProofData.fileData ? "✅ Attached" : "⚠️ Required"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Date Served to Employee:
                      </label>
                      <input
                        type="date"
                        value={nteProofData.dateServed}
                        onChange={(e) => setNteProofData({ ...nteProofData, dateServed: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Signed NTE Copy (Scan / Photo / PDF):
                      </label>
                      {nteProofData.fileData ? (
                        <div className="p-3 rounded-xl bg-white border border-emerald-200 flex flex-col items-center">
                          {nteProofData.fileData.startsWith("data:application/pdf") ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 py-3">
                              <FileText size={24} className="text-emerald-600" />
                              <span>{nteProofData.fileName || "signed_nte.pdf"}</span>
                            </div>
                          ) : (
                            <img
                              src={nteProofData.fileData}
                              alt="Signed NTE Proof"
                              className="max-h-36 object-contain rounded-lg shadow-2xs"
                            />
                          )}
                          <div className="mt-2 text-[11px] text-slate-600 font-medium truncate max-w-full">
                            {nteProofData.fileName || "signed_nte_proof.jpg"}
                          </div>
                          {selectedReport?.hasSignedNteProof ? (
                            <div className="mt-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                              <Lock size={12} className="text-emerald-700" />
                              <span>Permanently Submitted & Locked</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setNteProofData({ ...nteProofData, fileData: "", fileName: "", fileSize: 0 })}
                              className="mt-1 text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                            >
                              Remove / Change File
                            </button>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-emerald-300 hover:border-emerald-600 rounded-xl bg-white hover:bg-emerald-50/50 cursor-pointer transition min-h-[140px]">
                          <FileSignature size={26} className="text-emerald-600 mb-1.5" />
                          <span className="text-xs font-bold text-slate-900 text-center">
                            Upload Signed NTE Copy
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">Photo, Scanned Image, or PDF</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  setNteProofData((prev) => ({
                                    ...prev,
                                    fileData: evt.target.result,
                                    fileName: file.name,
                                    fileSize: file.size
                                  }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 italic">
                    Must include employee's handwritten signature acknowledging receipt of the NTE.
                  </p>
                </div>

                {/* ======================================================== */}
                {/* DOCUMENT 2: EMPLOYEE IN-WRITTEN EXPLANATION              */}
                {/* ======================================================== */}
                <div className={`p-4 rounded-2xl border-2 transition flex flex-col justify-between ${explanationProofData.fileData || explanationProofData.explanationText
                  ? "bg-purple-50/40 border-purple-300"
                  : "bg-slate-50 border-slate-200"
                  }`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                          2
                        </span>
                        <span>Employee Written Explanation</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${explanationProofData.fileData || explanationProofData.explanationText
                        ? "bg-purple-100 text-purple-800 border border-purple-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}>
                        {explanationProofData.fileData || explanationProofData.explanationText ? "✅ Attached" : "⚠️ Required"}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Date Explanation Submitted:
                      </label>
                      <input
                        type="date"
                        value={explanationProofData.dateSubmitted}
                        onChange={(e) => setExplanationProofData({ ...explanationProofData, dateSubmitted: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Explanation Letter (Scan / Photo / PDF):
                      </label>
                      {explanationProofData.fileData ? (
                        <div className="p-3 rounded-xl bg-white border border-purple-200 flex flex-col items-center">
                          {explanationProofData.fileData.startsWith("data:application/pdf") ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 py-3">
                              <FileText size={24} className="text-purple-600" />
                              <span>{explanationProofData.fileName || "explanation_letter.pdf"}</span>
                            </div>
                          ) : (
                            <img
                              src={explanationProofData.fileData}
                              alt="Explanation Proof"
                              className="max-h-36 object-contain rounded-lg shadow-2xs"
                            />
                          )}
                          <div className="mt-2 text-[11px] text-slate-600 font-medium truncate max-w-full">
                            {explanationProofData.fileName || "employee_written_explanation.jpg"}
                          </div>
                          {selectedReport?.hasExplanationProof ? (
                            <div className="mt-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-300 inline-flex items-center gap-1">
                              <Lock size={12} className="text-purple-700" />
                              <span>Permanently Submitted & Locked</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExplanationProofData({ ...explanationProofData, fileData: "", fileName: "", fileSize: 0 })}
                              className="mt-1 text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                            >
                              Remove / Change File
                            </button>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-purple-300 hover:border-purple-600 rounded-xl bg-white hover:bg-purple-50/50 cursor-pointer transition min-h-[140px]">
                          <FileText size={26} className="text-purple-600 mb-1.5" />
                          <span className="text-xs font-bold text-slate-900 text-center">
                            Upload Employee Explanation Letter
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">Handwritten or typed signed letter</span>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  setExplanationProofData((prev) => ({
                                    ...prev,
                                    fileData: evt.target.result,
                                    fileName: file.name,
                                    fileSize: file.size
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
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Employee Explanation Notes / Summary:
                      </label>
                      <textarea
                        rows={2}
                        value={explanationProofData.explanationText}
                        onChange={(e) => setExplanationProofData({ ...explanationProofData, explanationText: e.target.value })}
                        placeholder="Transcribed statement, key explanation points, or employee admission/defense..."
                        className="w-full p-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 mt-2 italic">
                    The formal in-written response submitted by the employee to defend against allegations.
                  </p>
                </div>
              </div>

              {/* Submitting HR Identity Confirmation */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Transmitting HR:</span>
                  <span className="font-semibold text-slate-900">
                    {effectiveRole.reportingName || effectiveRole.userName || currentUser?.name || "Branch HR"} ({selectedReport.company || selectedReport.senderCompany} HR)
                  </span>
                </div>
                <div className="text-[11px] text-teal-700 font-mono">
                  📁 High-Performance Multi-Bucket IndexedDB & Cloud Sync
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
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
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-lg shadow-emerald-700/25 transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <Check size={16} />
                  <span>
                    {nteProofData.fileData && (explanationProofData.fileData || explanationProofData.explanationText)
                      ? "Transmit Both Documents to Head Office ➔ SGC"
                      : "Save & Transmit Submissions to Head Office SGC"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED DUE PROCESS SUBMISSIONS VIEWER (SIGNED NTE & WRITTEN EXPLANATION)*/}
      {/* ========================================================================= */}
      {isViewSignedNteProofModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-7xl w-full max-h-[97vh] h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-white">
            {/* Header with Dual Document Tab Switcher */}
            <div className="px-6 py-3.5 border-b border-slate-800 bg-slate-900/95 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${activeProofViewerTab === "EXPLANATION_DOC"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  }`}>
                  {activeProofViewerTab === "EXPLANATION_DOC" ? <FileText size={22} /> : <FileCheck size={22} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-white">
                      {activeProofViewerTab === "EXPLANATION_DOC"
                        ? "Employee In-Written Explanation"
                        : "Received & Signed Notice to Explain"}
                    </h2>
                    {effectiveRole.isHeadOffice ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        👁️ SGC Head Office Audit
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Branch HR Verified Submissions
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Case {selectedReport.caseNumber} • Respondent: {selectedReport.employeeName}
                  </p>
                </div>
              </div>

              {/* Document Tab Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveProofViewerTab("SIGNED_NTE")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${activeProofViewerTab === "SIGNED_NTE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                >
                  <FileSignature size={13} />
                  <span>1. Signed NTE</span>
                  {activeProofRecord?.fileData ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-300 ml-0.5" title="Document Attached" />
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveProofViewerTab("EXPLANATION_DOC")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${activeProofViewerTab === "EXPLANATION_DOC"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                >
                  <FileText size={13} />
                  <span>2. Written Explanation</span>
                  {(activeExplanationRecord?.fileData || activeExplanationRecord?.explanationText) ? (
                    <span className="w-2 h-2 rounded-full bg-purple-300 ml-0.5" title="Explanation Attached" />
                  ) : null}
                </button>
              </div>

              {/* Toolbar Controls */}
              <div className="flex items-center gap-2">
                {/* Zoom controls */}
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setProofZoomLevel((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))))}
                    title="Zoom Out"
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="px-2 font-mono text-[11px] text-slate-300 min-w-[42px] text-center font-bold">
                    {Math.round(proofZoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setProofZoomLevel((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))))}
                    title="Zoom In"
                    className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <ZoomIn size={14} />
                  </button>
                  {proofZoomLevel !== 1 && (
                    <button
                      type="button"
                      onClick={() => setProofZoomLevel(1)}
                      className="px-2 py-0.5 text-[10px] bg-slate-700 hover:bg-slate-600 rounded text-slate-200 font-bold transition ml-0.5 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => {
                    const activeFile = activeProofViewerTab === "EXPLANATION_DOC"
                      ? (activeExplanationRecord?.fileData || "")
                      : (activeProofRecord?.fileData || "");
                    const titleStr = activeProofViewerTab === "EXPLANATION_DOC"
                      ? `Employee Written Explanation - ${selectedReport.caseNumber}`
                      : `Signed NTE Proof - ${selectedReport.caseNumber}`;
                    const printWin = window.open("", "_blank");
                    if (printWin && activeFile) {
                      printWin.document.write(`
                        <html>
                          <head>
                            <title>${titleStr}</title>
                            <style>
                              body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; background: #fff; }
                              img { max-width: 100%; height: auto; }
                            </style>
                          </head>
                          <body>
                            <img src="${activeFile}" onload="window.print(); window.close();" />
                          </body>
                        </html>
                      `);
                      printWin.document.close();
                    } else {
                      window.print();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition cursor-pointer inline-flex items-center gap-1.5"
                  title="Print active document"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>

                {/* Download button */}
                {((activeProofViewerTab === "EXPLANATION_DOC" ? activeExplanationRecord?.fileData : activeProofRecord?.fileData)) && (
                  <a
                    href={activeProofViewerTab === "EXPLANATION_DOC" ? activeExplanationRecord?.fileData : activeProofRecord?.fileData}
                    download={
                      activeProofViewerTab === "EXPLANATION_DOC"
                        ? (activeExplanationRecord?.fileName || `Employee_Explanation_${selectedReport.caseNumber}.jpg`)
                        : (activeProofRecord?.fileName || `Signed_NTE_${selectedReport.caseNumber}.jpg`)
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-xs ${activeProofViewerTab === "EXPLANATION_DOC" ? "bg-purple-600 hover:bg-purple-500" : "bg-emerald-600 hover:bg-emerald-500"
                      }`}
                    title="Download high-resolution file"
                  >
                    <Download size={14} />
                    <span>Download</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setIsViewSignedNteProofModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Verification Metadata Strip */}
            <div className="px-6 py-2.5 bg-slate-800/60 border-b border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] mr-1.5">
                    {activeProofViewerTab === "EXPLANATION_DOC" ? "Date Submitted:" : "Date Served:"}
                  </span>
                  <span className={`font-semibold ${activeProofViewerTab === "EXPLANATION_DOC" ? "text-purple-400" : "text-emerald-400"}`}>
                    {activeProofViewerTab === "EXPLANATION_DOC"
                      ? (activeExplanationRecord?.dateSubmitted || selectedReport.explanationReceivedAt || "Recorded on-site")
                      : (activeProofRecord?.dateServed || selectedReport.nteServedAt || "Recorded on-site")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] mr-1.5">
                    {activeProofViewerTab === "EXPLANATION_DOC" ? "Transmitted By:" : "Served & Uploaded By:"}
                  </span>
                  <span className="font-semibold text-white">
                    {activeProofViewerTab === "EXPLANATION_DOC"
                      ? (activeExplanationRecord?.uploadedBy || activeProofRecord?.uploadedBy || selectedReport.senderHrName || "Branch HR")
                      : (activeProofRecord?.uploadedBy || selectedReport.nteServedBy || selectedReport.senderHrName || "Branch HR")}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold uppercase text-[10px] mr-1.5">Storage Location:</span>
                  <span className="font-mono text-[11px] text-teal-400">
                    IndexedDB Database Bucket & Cloud Sync
                  </span>
                </div>
              </div>

              <div className={`flex items-center gap-1.5 font-bold text-xs ${activeProofViewerTab === "EXPLANATION_DOC" ? "text-purple-400" : "text-emerald-400"
                }`}>
                <CheckCircle2 size={14} />
                <span>
                  {activeProofViewerTab === "EXPLANATION_DOC"
                    ? "Employee Formal Written Response"
                    : "Acknowledged & Signed by Employee"}
                </span>
              </div>
            </div>

            {/* Document Preview Canvas */}
            <div className="flex-1 min-h-[580px] max-h-[82vh] overflow-auto p-6 bg-slate-950 flex flex-col items-center justify-start custom-scrollbar">
              {/* If viewing explanation and there are explanation notes/text, show top quote banner */}
              {activeProofViewerTab === "EXPLANATION_DOC" && (activeExplanationRecord?.explanationText || selectedReport.explanationText) && (
                <div className="w-full max-w-4xl mb-5 p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-white shrink-0">
                  <div className="flex items-center gap-2 font-bold text-xs text-purple-300 mb-1.5">
                    <FileText size={15} />
                    <span>Employee In-Written Explanation Statement & Summary:</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed italic whitespace-pre-wrap pl-1 border-l-2 border-purple-500/50">
                    "{activeExplanationRecord?.explanationText || selectedReport.explanationText}"
                  </p>
                </div>
              )}

              {isLoadingProof ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3 my-auto">
                  <RefreshCw size={28} className="animate-spin text-emerald-400" />
                  <p className="text-xs font-semibold">Retrieving documents from database bucket...</p>
                </div>
              ) : activeProofViewerTab === "SIGNED_NTE" ? (
                activeProofRecord?.fileData ? (
                  <div
                    className="transition-transform duration-150 ease-out flex justify-center my-auto"
                    style={{ transform: `scale(${proofZoomLevel})`, transformOrigin: "center center" }}
                  >
                    {activeProofRecord.fileData.startsWith("data:application/pdf") ? (
                      <iframe
                        src={activeProofRecord.fileData}
                        title="Signed NTE Document PDF"
                        className="w-[850px] h-[1150px] rounded-lg shadow-2xl bg-white border border-slate-800"
                      />
                    ) : (
                      <img
                        src={activeProofRecord.fileData}
                        alt={`Signed NTE Proof - ${selectedReport.caseNumber}`}
                        className="max-w-full h-auto max-h-[78vh] rounded-lg shadow-2xl border border-slate-800 object-contain bg-white"
                      />
                    )}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3 my-auto">
                    <FileSignature size={36} className="text-slate-600" />
                    <p className="text-sm font-bold text-slate-300">Signed NTE Document Not Found in Bucket</p>
                    <p className="text-xs text-slate-400 max-w-sm text-center">
                      The signed NTE acknowledgment proof has not yet been attached. Branch HR can upload it using the button below.
                    </p>
                    {!effectiveRole.isHeadOffice && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsViewSignedNteProofModalOpen(false);
                          handleOpenUploadNteProof(selectedReport, "ALL");
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-md"
                      >
                        <UploadCloud size={14} />
                        <span>Upload Signed NTE Now</span>
                      </button>
                    )}
                  </div>
                )
              ) : (
                /* Tab 2: Employee Written Explanation */
                activeExplanationRecord?.fileData ? (
                  <div
                    className="transition-transform duration-150 ease-out flex justify-center my-auto"
                    style={{ transform: `scale(${proofZoomLevel})`, transformOrigin: "center center" }}
                  >
                    {activeExplanationRecord.fileData.startsWith("data:application/pdf") ? (
                      <iframe
                        src={activeExplanationRecord.fileData}
                        title="Employee Written Explanation PDF"
                        className="w-[850px] h-[1150px] rounded-lg shadow-2xl bg-white border border-slate-800"
                      />
                    ) : (
                      <img
                        src={activeExplanationRecord.fileData}
                        alt={`Employee Written Explanation - ${selectedReport.caseNumber}`}
                        className="max-w-full h-auto max-h-[78vh] rounded-lg shadow-2xl border border-slate-800 object-contain bg-white"
                      />
                    )}
                  </div>
                ) : (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3 my-auto">
                    <FileText size={36} className="text-slate-600" />
                    <p className="text-sm font-bold text-slate-300">Written Explanation Letter Not Attached</p>
                    <p className="text-xs text-slate-400 max-w-sm text-center">
                      The formal letter or photo of the employee's written explanation has not yet been attached by Branch HR.
                    </p>
                    {!effectiveRole.isHeadOffice && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsViewSignedNteProofModalOpen(false);
                          handleOpenUploadNteProof(selectedReport, "EXPLANATION");
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-md"
                      >
                        <UploadCloud size={14} />
                        <span>Upload Employee Explanation Letter</span>
                      </button>
                    )}
                  </div>
                )
              )}
            </div>

            {/* Footer with Role Guidance */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                <span>
                  {effectiveRole.isHeadOffice
                    ? "Head Office Audit View: Both the received & signed NTE and employee in-written explanation are required for due process evaluation."
                    : "Branch HR View: Submitting both documents ensures complete compliance with DOLE D.O. 147-15 due process standards. Submissions are permanently recorded and cannot be altered."}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 3: SGC HEAD OFFICE — ISSUE NOTICE OF WARNING              */}
      {/* ========================================================================= */}
      {isWarningModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
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
                    Official Disciplinary Warning Memo — 1:1 Matching Standard Format
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

            <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
              {/* Row 1: Header / Memo Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Memo Date:
                  </label>
                  <input
                    type="text"
                    value={warningForm.date || ""}
                    onChange={(e) => setWarningForm({ ...warningForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g. April 6, 2026"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    To (Employee Name):
                  </label>
                  <input
                    type="text"
                    value={warningForm.toEmployee || ""}
                    onChange={(e) => setWarningForm({ ...warningForm, toEmployee: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Warning Sanction Level:
                  </label>
                  <select
                    value={warningForm.penalty || "Final Stern Warning"}
                    onChange={(e) => {
                      const newPenalty = e.target.value;
                      const updatedP3 = `In view of this, please be informed that this shall serve as your “${newPenalty}”. Any further violations of company policies may result in the immediate termination of your employment.`;
                      setWarningForm({ ...warningForm, penalty: newPenalty, paragraph3: updatedP3 });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Final Stern Warning">Final Stern Warning (Official Sample)</option>
                    <option value="1st Written Warning & Reprimand">1st Written Warning & Reprimand</option>
                    <option value="2nd Written Warning">2nd Written Warning</option>
                    <option value="Written Warning">Written Warning</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Company Header Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Company Name:
                  </label>
                  <input
                    type="text"
                    value={warningForm.companyName || ""}
                    onChange={(e) => setWarningForm({ ...warningForm, companyName: e.target.value, signatoryCompany: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Company Address:
                  </label>
                  <input
                    type="text"
                    value={warningForm.companyAddress || ""}
                    onChange={(e) => setWarningForm({ ...warningForm, companyAddress: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Company Email:
                  </label>
                  <input
                    type="text"
                    value={warningForm.companyEmail || ""}
                    onChange={(e) => setWarningForm({ ...warningForm, companyEmail: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Row 3: Quick Calculation Helpers for Paragraph 1 */}
              <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" />
                    Quick Incident Data Synchronization
                  </span>
                  <span className="text-[11px] text-amber-800 font-medium">
                    Automatically converts number to formal English words
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                      Written Explanation Date:
                    </label>
                    <input
                      type="text"
                      value={warningForm.explanationDate || ""}
                      onChange={(e) => {
                        const newExpDate = e.target.value;
                        const words = formatPesosInWords(warningForm.shortageAmount || 1445);
                        const newP1 = `This is to acknowledge receipt of your written explanation dated ${newExpDate}, with reference to the incident involving a cash shortage in the amount of ${words}.`;
                        setWarningForm({ ...warningForm, explanationDate: newExpDate, paragraph1: newP1 });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 bg-white font-medium text-slate-900"
                      placeholder="e.g. March 22, 2026"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-1">
                      Cash Shortage Amount (PHP):
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={warningForm.shortageAmount || ""}
                      onChange={(e) => {
                        const amt = parseFloat(e.target.value) || 0;
                        const words = formatPesosInWords(amt);
                        const expDate = warningForm.explanationDate || "March 22, 2026";
                        const newP1 = `This is to acknowledge receipt of your written explanation dated ${expDate}, with reference to the incident involving a cash shortage in the amount of ${words}.`;
                        setWarningForm({ ...warningForm, shortageAmount: amt, paragraph1: newP1 });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-amber-300 bg-white font-bold text-slate-900"
                      placeholder="e.g. 1445"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-amber-900 font-mono bg-white/80 p-2 rounded-lg border border-amber-200">
                  <strong>Converted:</strong> {formatPesosInWords(warningForm.shortageAmount || 1445)}
                </div>
              </div>

              {/* Paragraph 1 */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paragraph 1 — Acknowledgment & Incident Details:
                </label>
                <textarea
                  rows={2}
                  value={warningForm.paragraph1 || ""}
                  onChange={(e) => setWarningForm({ ...warningForm, paragraph1: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans text-slate-800"
                />
              </div>

              {/* Paragraph 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Paragraph 2 — Code of Conduct Violation:
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Will be formatted in bold</span>
                </div>
                <input
                  type="text"
                  value={warningForm.violationClause || ""}
                  onChange={(e) => {
                    const clause = e.target.value;
                    const newP2 = `After careful review, it has been determined that your actions constitute a violation of ${clause} as stated in the company’s Code of Conduct.`;
                    setWarningForm({ ...warningForm, violationClause: clause, paragraph2: newP2 });
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 font-semibold text-slate-900"
                  placeholder="e.g. Article IV – Section 18. Offenses Related to Job Performance and Productivity"
                />
                <textarea
                  rows={2}
                  value={warningForm.paragraph2 || ""}
                  onChange={(e) => setWarningForm({ ...warningForm, paragraph2: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans text-slate-800"
                />
              </div>

              {/* Paragraph 3 */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paragraph 3 — Sanction & Termination Warning:
                </label>
                <textarea
                  rows={2}
                  value={warningForm.paragraph3 || ""}
                  onChange={(e) => setWarningForm({ ...warningForm, paragraph3: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans text-slate-800"
                />
              </div>

              {/* Paragraph 4 */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paragraph 4 — Directive:
                </label>
                <input
                  type="text"
                  value={warningForm.paragraph4 || ""}
                  onChange={(e) => setWarningForm({ ...warningForm, paragraph4: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium text-slate-800"
                  placeholder="Please be guided accordingly."
                />
              </div>

              {/* Signatory & Footer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Signatory Name:
                  </label>
                  <input
                    type="text"
                    value={warningForm.signatoryName || ""}
                    onChange={(e) => setWarningForm({ ...warningForm, signatoryName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Signatory Title:
                  </label>
                  <input
                    type="text"
                    value={warningForm.signatoryTitle || ""}
                    onChange={(e) => setWarningForm({ ...warningForm, signatoryTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Records Footer Note:
                  </label>
                  <input
                    type="text"
                    value={warningForm.footerText || ""}
                    onChange={(e) => setWarningForm({ ...warningForm, footerText: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-600 font-mono text-[11px]"
                  />
                </div>
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
                  <span>Save & Preview Notice of Warning</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTHENTIC DOCUMENT VIEWER: NOTICE OF WARNING (1:1 SAMPLE FORMAT)          */}
      {/* ========================================================================= */}
      {isWarningViewerOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[96vh] h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls Bar */}
            <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-2xs">
                  {selectedReport.caseNumber}
                </span>
                <span className="text-xs font-black text-slate-800 tracking-tight hidden sm:inline">
                  Notice of Warning Document
                </span>

                {/* Bond Paper Format Selector (Short / Long / Standard A4 / Legal) */}
                <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg text-xs font-semibold ml-1">
                  <button
                    type="button"
                    onClick={() => setWarningPaperFormat("SHORT")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${warningPaperFormat === "SHORT"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Short (8.5×11)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarningPaperFormat("LONG")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${warningPaperFormat === "LONG"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Long (8.5×13)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarningPaperFormat("A4")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${warningPaperFormat === "A4"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Standard (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWarningPaperFormat("LEGAL")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${warningPaperFormat === "LEGAL"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Legal (8.5×14)
                  </button>
                </div>

                {/* Auto 1-Page Fit Indicator */}
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  Auto 1-Page Fit ({warningPaperFormat === "SHORT" ? "Short: 8.5×11in" : warningPaperFormat === "LONG" ? "Long: 8.5×13in" : warningPaperFormat === "A4" ? "A4: 210×297mm" : "Legal: 8.5×14in"})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice speech */}
                <button
                  type="button"
                  onClick={() => {
                    const speech = `Official Notice of Warning issued by 5A Royal Gaming OPC for ${warningForm.toEmployee || selectedReport.employeeName}. Date: ${warningForm.date || "April 6, 2026"}. This shall serve as your Final Stern Warning.`;
                    playAiVoiceAnnouncement(speech);
                  }}
                  title="Listen to official document reading"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-amber-50 text-slate-700 hover:text-amber-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Volume2 size={14} />
                  <span>Listen</span>
                </button>

                {/* Edit Memo button */}
                {effectiveRole.isHeadOffice && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsWarningViewerOpen(false);
                      setIsWarningModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileEdit size={14} />
                    <span>Edit Memo</span>
                  </button>
                )}

                {/* Direct Close & Archive Case button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsWarningViewerOpen(false);
                    handleCloseCaseDirectly(selectedReport);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                  title="Close and archive this case in HR 201 File after Warning"
                >
                  <CheckCheck size={14} />
                  <span>Close Case</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => handlePrintDocument("warning")}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-95 ring-1 ring-slate-950/20"
                >
                  <Printer size={14} className="text-emerald-400" />
                  <span>Print Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWarningViewerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Official Letterhead Printable Document Container - Desk Canvas */}
            <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 pb-12 bg-slate-200/80 flex justify-center items-start custom-scrollbar">
              <div
                id="printable-warning-document-sheet"
                style={{
                  width: warningPaperFormat === "A4" ? "210mm" : "8.5in",
                  minWidth: warningPaperFormat === "A4" ? "210mm" : "8.5in",
                  maxWidth: warningPaperFormat === "A4" ? "210mm" : "8.5in",
                  minHeight: warningPaperFormat === "A4" ? "297mm" : warningPaperFormat === "SHORT" ? "11in" : warningPaperFormat === "LEGAL" ? "14in" : "13in",
                  boxSizing: "border-box",
                }}
                className={`bg-white shadow-2xl ring-1 ring-slate-900/10 rounded-xs text-slate-900 font-sans relative shrink-0 flex flex-col justify-between transition-all duration-150 print:p-0 print:border-none print:shadow-none print:ring-0 ${warningPaperFormat === "SHORT"
                  ? "p-5 sm:p-7 md:p-8"
                  : warningPaperFormat === "A4"
                    ? "p-7 sm:p-9 md:p-11"
                    : warningPaperFormat === "LEGAL"
                      ? "p-9 sm:p-11 md:p-13"
                      : "p-8 sm:p-10 md:p-12"
                  }`}
              >
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.045] pointer-events-none select-none">
                  <img src={getPaperLogo(warningForm.companyName || selectedReport?.company)} alt="watermark" className="w-[110mm] max-w-[440px] h-auto object-contain" />
                </div>

                <div className="relative z-10 flex flex-col flex-1 justify-between">
                  <div>
                    {/* 1. Official Header (Matching Photo 1:1) */}
                    <div className="flex items-center justify-between pb-3">
                      {/* Left Logo */}
                      <div className="flex items-center gap-2">
                        <img src={getPaperLogo(warningForm.companyName || selectedReport?.company)} alt="Company Logo" className="h-16 w-auto object-contain" />
                      </div>

                      {/* Center Text: Company, Address, Email */}
                      <div className="text-center flex-1 px-4">
                        <h2 className="text-sm sm:text-base font-black tracking-wide uppercase text-slate-900 leading-tight">
                          {getPaperCompanyName(warningForm.companyName || selectedReport?.company)}
                        </h2>
                        <p className="text-[11px] text-slate-800 mt-0.5 leading-snug">
                          {warningForm.companyAddress || "Purok Daisy, New Isabela, Tacurong City, Sultan Kudarat, Philippines"}
                        </p>
                        <p className="text-[11px] text-slate-800 leading-snug">
                          Gmail: <span className="font-medium">{warningForm.companyEmail || "imsoroglohr@gmail.com"}</span>
                        </p>
                      </div>

                      {/* Right Emblem: Corporate Emblem */}
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
                    <div className="mt-4 sm:mt-5 space-y-1 text-sm font-sans text-slate-900">
                      <div className="grid grid-cols-[90px_1fr] items-baseline">
                        <span className="font-bold">Date:</span>
                        <span className="font-medium">{warningForm.date || selectedReport.warningIssuedAt || "April 6, 2026"}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] items-baseline">
                        <span className="font-bold">To:</span>
                        <span className="font-black uppercase tracking-wide">
                          {warningForm.toEmployee || (selectedReport.employeeName || "").toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] items-baseline">
                        <span className="font-bold">Subject:</span>
                        <span className="font-black">{warningForm.subject || "Notice of Warning"}</span>
                      </div>
                    </div>

                    {/* Black Dividing Line */}
                    <div className="w-full h-[1.5px] bg-slate-900 mt-2 mb-3 sm:mb-4" />

                    {/* 3. Document Body Content (Exact Structure & Typography from Sample Photo) */}
                    <div className={`${warningPaperFormat === "SHORT" ? "space-y-3 text-xs leading-relaxed" : "space-y-4 text-xs sm:text-[13px] leading-relaxed"} text-slate-900 font-sans text-justify`}>
                      {/* Paragraph 1 */}
                      <p className="pl-6 sm:pl-8">
                        {warningForm.paragraph1 ||
                          `This is to acknowledge receipt of your written explanation dated March 22, 2026, with reference to the incident involving a cash shortage in the amount of One Thousand Four Hundred Forty-Five Pesos (PHP 1,445.00)`}
                      </p>

                      {/* Paragraph 2 with bold Code of Conduct violation */}
                      <p className="pl-6 sm:pl-8">
                        {warningForm.paragraph2 ? (
                          warningForm.paragraph2
                        ) : (
                          <>
                            After careful review, it has been determined that your actions constitute a violation of{" "}
                            <strong>{warningForm.violationClause || "Article IV – Section 18. Offenses Related to Job Performance and Productivity"}</strong>{" "}
                            as stated in the company’s Code of Conduct.
                          </>
                        )}
                      </p>

                      {/* Paragraph 3 with bold Final Stern Warning and immediate termination */}
                      <p className="pl-6 sm:pl-8">
                        {warningForm.paragraph3 ? (
                          warningForm.paragraph3
                        ) : (
                          <>
                            In view of this, please be informed that this shall serve as your{" "}
                            <strong>“{warningForm.penalty || "Final Stern Warning"}”</strong>. Any further violations of company policies may result in the{" "}
                            <strong>immediate termination of your employment</strong>.
                          </>
                        )}
                      </p>

                      {/* Paragraph 4 */}
                      <p className="pl-6 sm:pl-8">
                        {warningForm.paragraph4 || "Please be guided accordingly."}
                      </p>
                    </div>

                    {/* 4. Signatures (Issued by & Received by) */}
                    <div className={`${warningPaperFormat === "SHORT" ? "mt-5 space-y-4" : "mt-8 space-y-7"} text-sm font-sans text-slate-900`}>
                      <div>
                        <p className="mb-2 text-xs sm:text-sm">Sincerely,</p>
                        <p className="font-black text-sm uppercase tracking-wide text-slate-900">
                          {warningForm.signatoryName || "JEVINCE JAYE S. JUBAY, CHRP"}
                        </p>
                        <p className="text-xs text-slate-800">
                          {warningForm.signatoryTitle || "HRMD Manager"}
                        </p>
                        <p className="text-xs text-slate-800">
                          {warningForm.signatoryCompany || warningForm.companyName || "5A Royal Gaming OPC"}
                        </p>
                      </div>

                      <div className="pt-1">
                        <p className="text-xs text-slate-700 mb-2">Received by:</p>
                        <p className="font-black text-sm uppercase tracking-wide text-slate-900">
                          {warningForm.toEmployee || (selectedReport.employeeName || "").toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-700">Date & Signature</p>
                      </div>
                    </div>
                  </div>

                  {/* 5. Document Footer */}
                  <div className={`${warningPaperFormat === "SHORT" ? "mt-5 pt-2" : "mt-8 pt-3"} text-left text-[11px] text-slate-500 font-sans`}>
                    {warningForm.footerText || `HR 201 File & Records ${new Date().getFullYear()}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 4: SGC HEAD OFFICE — NOTICE OF INVESTIGATION (NOI) ZOOM   */}
      {/* ========================================================================= */}
      {isNoiModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-600 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold">
                  <Scale size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">
                    SGC Discretion: Notice of Investigation (NOI)
                  </h2>
                  <p className="text-xs text-blue-100">
                    Official Notice of Investigation Memo — 1:1 Matching Standard Format
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNoiModalOpen(false)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-500 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
              {/* Row 1: Memo Header & Employee Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Memo Date:
                  </label>
                  <input
                    type="text"
                    value={noiForm.date || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. OCTOBER 12, 2026"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    To (Employee Name):
                  </label>
                  <input
                    type="text"
                    value={noiForm.toEmployee || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, toEmployee: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Subject Line:
                  </label>
                  <input
                    type="text"
                    value={noiForm.subject || "Notice of Investigation"}
                    onChange={(e) => setNoiForm({ ...noiForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 2: Hearing Schedule (Date, Time, Mode) */}
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Video size={15} className="text-blue-600" />
                    Investigation Hearing Schedule & Zoom Settings
                  </span>
                  <span className="text-[11px] text-blue-700 font-medium">
                    DOLE Department Order No. 147-15 Compliant
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                      Hearing Date: *
                    </label>
                    <input
                      type="text"
                      value={noiForm.hearingDate || ""}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const newP1 = `A notice of investigation is one of the requisites by the law to hear and explain your side, you are hereby directed to attend, submit your supporting documents, and bring a counsel of your own choice on ${newDate}, ${noiForm.hearingTime || "2:30 PM"} ${noiForm.hearingMode || "via Zoom Meeting"}, for the acts allegedly committed in violation of:`;
                        setNoiForm({ ...noiForm, hearingDate: newDate, paragraph1: newP1 });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-300 bg-white font-bold text-slate-900"
                      placeholder="e.g. October 14, 2026"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                      Hearing Time: *
                    </label>
                    <input
                      type="text"
                      value={noiForm.hearingTime || ""}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        const newP1 = `A notice of investigation is one of the requisites by the law to hear and explain your side, you are hereby directed to attend, submit your supporting documents, and bring a counsel of your own choice on ${noiForm.hearingDate || "October 14, 2026"}, ${newTime} ${noiForm.hearingMode || "via Zoom Meeting"}, for the acts allegedly committed in violation of:`;
                        setNoiForm({ ...noiForm, hearingTime: newTime, paragraph1: newP1 });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-300 bg-white font-bold text-slate-900"
                      placeholder="e.g. 2:30 PM"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                      Hearing Mode: *
                    </label>
                    <input
                      type="text"
                      value={noiForm.hearingMode || "via Zoom Meeting"}
                      onChange={(e) => {
                        const newMode = e.target.value;
                        const newP1 = `A notice of investigation is one of the requisites by the law to hear and explain your side, you are hereby directed to attend, submit your supporting documents, and bring a counsel of your own choice on ${noiForm.hearingDate || "October 14, 2026"}, ${noiForm.hearingTime || "2:30 PM"} ${newMode}, for the acts allegedly committed in violation of:`;
                        setNoiForm({ ...noiForm, hearingMode: newMode, paragraph1: newP1 });
                      }}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-300 bg-white font-semibold text-slate-900"
                      placeholder="via Zoom Meeting"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                      Zoom Meeting Link URL:
                    </label>
                    <input
                      type="url"
                      value={noiForm.zoomMeetingLink || ""}
                      onChange={(e) => setNoiForm({ ...noiForm, zoomMeetingLink: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-200 bg-white font-mono text-blue-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                      Meeting ID:
                    </label>
                    <input
                      type="text"
                      value={noiForm.zoomMeetingId || ""}
                      onChange={(e) => setNoiForm({ ...noiForm, zoomMeetingId: e.target.value })}
                      placeholder="812 4001 8920"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-200 bg-white font-mono text-blue-950"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 mb-1">
                      Passcode:
                    </label>
                    <input
                      type="text"
                      value={noiForm.zoomPasscode || ""}
                      onChange={(e) => setNoiForm({ ...noiForm, zoomPasscode: e.target.value })}
                      placeholder="SGC2026"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-blue-200 bg-white font-mono text-blue-950"
                    />
                  </div>
                </div>
              </div>

              {/* Paragraph 1 */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paragraph 1 — Legal Requisite & Directive:
                </label>
                <textarea
                  rows={3}
                  value={noiForm.paragraph1 || ""}
                  onChange={(e) => setNoiForm({ ...noiForm, paragraph1: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans text-slate-800"
                />
              </div>

              {/* Alleged Violations (2 Articles as in sample) */}
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-900 block">
                  Acts Allegedly Committed in Violation of Code of Conduct:
                </span>

                {/* Violation 1 */}
                <div className="space-y-1.5 pl-3 border-l-2 border-blue-500">
                  <input
                    type="text"
                    value={noiForm.violation1Article || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, violation1Article: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-bold text-slate-900"
                    placeholder="Article IV – Section 18. Offenses Related to Job Performance and Productivity."
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={noiForm.violation1Clause || ""}
                      onChange={(e) => setNoiForm({ ...noiForm, violation1Clause: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-bold text-slate-800"
                      placeholder="(a) Non-observance of Standard Operating Procedures."
                    />
                    <input
                      type="text"
                      value={noiForm.violation1Desc || ""}
                      onChange={(e) => setNoiForm({ ...noiForm, violation1Desc: e.target.value })}
                      className="sm:col-span-2 w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-700"
                      placeholder="– willful or unintentional non-observance of standard operating procedures..."
                    />
                  </div>
                </div>

                {/* Violation 2 */}
                <div className="space-y-1.5 pl-3 border-l-2 border-indigo-500">
                  <input
                    type="text"
                    value={noiForm.violation2Article || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, violation2Article: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-bold text-slate-900"
                    placeholder="Section 16. Offenses Against Good Personal Behavior and Conduct"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={noiForm.violation2Clause || ""}
                      onChange={(e) => setNoiForm({ ...noiForm, violation2Clause: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-bold text-slate-800"
                      placeholder="(f) Drunkenness."
                    />
                    <input
                      type="text"
                      value={noiForm.violation2Desc || ""}
                      onChange={(e) => setNoiForm({ ...noiForm, violation2Desc: e.target.value })}
                      className="sm:col-span-2 w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-700"
                      placeholder="Reporting for work under the influence of liquor or drinking alcoholic beverages..."
                    />
                  </div>
                </div>
              </div>

              {/* Paragraph 2 */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paragraph 2 — Legal Representation & Evidence Submission:
                </label>
                <textarea
                  rows={2}
                  value={noiForm.paragraph2 || ""}
                  onChange={(e) => setNoiForm({ ...noiForm, paragraph2: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans text-slate-800"
                />
              </div>

              {/* Witness Clause */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Witness Day:
                  </label>
                  <input
                    type="text"
                    value={noiForm.witnessDay || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, witnessDay: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-semibold text-slate-900"
                    placeholder="12th"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Month & Year:
                  </label>
                  <input
                    type="text"
                    value={noiForm.witnessMonthYear || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, witnessMonthYear: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 font-semibold text-slate-900"
                    placeholder="October 2026"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Venue / Place:
                  </label>
                  <input
                    type="text"
                    value={noiForm.witnessPlace || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, witnessPlace: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 text-slate-800"
                    placeholder="Tacurong City, Sultan Kudarat, Philippines"
                  />
                </div>
              </div>

              {/* Signatory Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Signatory Name:
                  </label>
                  <input
                    type="text"
                    value={noiForm.signatoryName || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, signatoryName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Signatory Title:
                  </label>
                  <input
                    type="text"
                    value={noiForm.signatoryTitle || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, signatoryTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Company:
                  </label>
                  <input
                    type="text"
                    value={noiForm.signatoryCompany || ""}
                    onChange={(e) => setNoiForm({ ...noiForm, signatoryCompany: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
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
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <Scale size={15} />
                  <span>Save & Preview Notice of Investigation</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTHENTIC DOCUMENT VIEWER: NOTICE OF INVESTIGATION (1:1 SAMPLE FORMAT)   */}
      {/* ========================================================================= */}
      {isNoiViewerOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[96vh] h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls Bar */}
            <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-2xs">
                  {selectedReport.caseNumber}
                </span>
                <span className="text-xs font-black text-slate-800 tracking-tight hidden sm:inline">
                  Notice of Investigation Document
                </span>

                {/* Bond Paper Format Selector (Short / Long / Standard A4 / Legal) */}
                <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg text-xs font-semibold ml-1">
                  <button
                    type="button"
                    onClick={() => setNoiPaperFormat("SHORT")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${noiPaperFormat === "SHORT"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Short (8.5×11)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoiPaperFormat("LONG")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${noiPaperFormat === "LONG"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Long (8.5×13)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoiPaperFormat("A4")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${noiPaperFormat === "A4"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Standard (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoiPaperFormat("LEGAL")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${noiPaperFormat === "LEGAL"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Legal (8.5×14)
                  </button>
                </div>

                {/* Auto 1-Page Fit Indicator */}
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  Auto 1-Page Fit ({noiPaperFormat === "SHORT" ? "Short: 8.5×11in" : noiPaperFormat === "LONG" ? "Long: 8.5×13in" : noiPaperFormat === "A4" ? "A4: 210×297mm" : "Legal: 8.5×14in"})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice speech */}
                <button
                  type="button"
                  onClick={() => {
                    const speech = `Official Notice of Investigation issued by 5A Royal Gaming OPC for ${noiForm.toEmployee || selectedReport.employeeName}. You are directed to attend the hearing on ${noiForm.hearingDate} at ${noiForm.hearingTime} ${noiForm.hearingMode}.`;
                    playAiVoiceAnnouncement(speech);
                  }}
                  title="Listen to official document reading"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-blue-50 text-slate-700 hover:text-blue-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Volume2 size={14} />
                  <span>Listen</span>
                </button>

                {/* Zoom Link Quick Button */}
                <button
                  type="button"
                  onClick={() => setIsZoomViewerOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Video size={13} className="text-indigo-600" />
                  <span>Zoom Link</span>
                </button>

                {/* Edit Memo button */}
                {effectiveRole.isHeadOffice && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsNoiViewerOpen(false);
                      setIsNoiModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileEdit size={14} />
                    <span>Edit Memo</span>
                  </button>
                )}

                {/* Direct Close & Archive Case button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsNoiViewerOpen(false);
                    handleCloseCaseDirectly(selectedReport);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                  title="Close and archive this case in HR 201 File"
                >
                  <CheckCheck size={14} />
                  <span>Close Case</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => handlePrintDocument("noi")}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-95 ring-1 ring-slate-950/20"
                >
                  <Printer size={14} className="text-emerald-400" />
                  <span>Print Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsNoiViewerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Official Letterhead Printable Document Container - Desk Canvas */}
            <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 pb-12 bg-slate-200/80 flex justify-center items-start custom-scrollbar">
              <div
                id="printable-noi-document-sheet"
                style={{
                  width: noiPaperFormat === "A4" ? "210mm" : "8.5in",
                  minWidth: noiPaperFormat === "A4" ? "210mm" : "8.5in",
                  maxWidth: noiPaperFormat === "A4" ? "210mm" : "8.5in",
                  minHeight: noiPaperFormat === "A4" ? "297mm" : noiPaperFormat === "SHORT" ? "11in" : noiPaperFormat === "LEGAL" ? "14in" : "13in",
                  boxSizing: "border-box",
                }}
                className={`bg-white shadow-2xl ring-1 ring-slate-900/10 rounded-xs text-slate-900 font-sans relative shrink-0 flex flex-col justify-between transition-all duration-150 print:p-0 print:border-none print:shadow-none print:ring-0 ${noiPaperFormat === "SHORT"
                  ? "p-5 sm:p-7 md:p-8"
                  : noiPaperFormat === "A4"
                    ? "p-7 sm:p-9 md:p-11"
                    : noiPaperFormat === "LEGAL"
                      ? "p-9 sm:p-11 md:p-13"
                      : "p-8 sm:p-10 md:p-12"
                  }`}
              >
                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.045] pointer-events-none select-none">
                  <img src={getPaperLogo(noiForm.signatoryCompany || selectedReport?.company)} alt="watermark" className="w-[110mm] max-w-[440px] h-auto object-contain" />
                </div>

                <div className="relative z-10 flex flex-col flex-1 justify-between">
                  <div>
                    {/* 1. Official Header (Matching Photo 1:1) */}
                    <div className="flex items-center justify-between pb-3">
                      {/* Left Logo: PCSO Swirl Logo */}
                      <div className="flex items-center gap-2">
                        <img
                          src="/id-assets/pcso_logo.svg"
                          alt="PCSO Logo"
                          className="h-16 w-auto object-contain"
                          onError={(e) => {
                            e.target.src = "/id-assets/pcso_logo.png";
                          }}
                        />
                      </div>

                      {/* Center Logo */}
                      <div className="flex items-center justify-center flex-1 px-4">
                        <img src={getPaperLogo(noiForm.signatoryCompany || selectedReport?.company)} alt="Company Logo" className="h-16 w-auto object-contain" />
                      </div>

                      {/* Right Logo: Corporate Emblem */}
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
                    <div className="mt-6 space-y-1.5 text-sm font-sans text-slate-900">
                      <div className="grid grid-cols-[90px_1fr] items-baseline">
                        <span className="font-bold">Date:</span>
                        <span className="font-bold uppercase tracking-wider">{noiForm.date || "OCTOBER 12, 2026"}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] items-baseline">
                        <span className="font-bold">To:</span>
                        <span className="font-black uppercase tracking-wide">
                          {noiForm.toEmployee || (selectedReport.employeeName || "MICHAEL SIMPAL").toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] items-baseline">
                        <span className="font-bold">Subject:</span>
                        <span className="font-black">{noiForm.subject || "Notice of Investigation"}</span>
                      </div>
                    </div>

                    {/* Black Dividing Line */}
                    <div className="w-full h-[2px] bg-slate-900 mt-2.5 mb-6" />

                    {/* 3. Salutation & Document Body Content (Exact Structure & Typography from Sample Photo) */}
                    <div className="space-y-4 text-xs sm:text-[13px] leading-relaxed text-slate-900 font-sans text-justify">
                      <p className="pl-6 sm:pl-8 font-medium">
                        Greetings:
                      </p>

                      {/* Paragraph 1 */}
                      <p className="pl-6 sm:pl-8">
                        A notice of investigation is one of the requisites by the law to hear and explain your side, you are hereby directed to attend, submit your supporting documents, and bring a counsel of your own choice on{" "}
                        <strong>{noiForm.hearingDate || "October 14, 2026"}, {noiForm.hearingTime || "2:30 PM"} {noiForm.hearingMode || "via Zoom Meeting"}</strong>, for the acts allegedly committed in violation of:
                      </p>

                      {/* Indented Violation List */}
                      <div className="pl-10 sm:pl-14 space-y-2 text-slate-900">
                        {/* Violation 1 */}
                        <div>
                          <p className="font-black">
                            {noiForm.violation1Article || "Article IV – Section 18. Offenses Related to Job Performance and Productivity."}
                          </p>
                          <p className="mt-0.5">
                            <span className="font-black">{noiForm.violation1Clause || "(a) Non-observance of Standard Operating Procedures."}</span>{" "}
                            <span>
                              – willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as{" "}
                              <strong>serious offense and shall accordingly be meted penalties for serious offense.</strong>
                            </span>
                          </p>
                        </div>

                        {/* Violation 2 */}
                        <div className="pt-1">
                          <p className="font-black">
                            {noiForm.violation2Article || "Section 16. Offenses Against Good Personal Behavior and Conduct"}
                          </p>
                          <p className="mt-0.5">
                            <span className="font-black">{noiForm.violation2Clause || "(f) Drunkenness."}</span>{" "}
                            <span>
                              {noiForm.violation2Desc || "Reporting for work under the influence of liquor or drinking alcoholic beverages during work hours (except on official functions)."}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Paragraph 2 */}
                      <p className="pl-6 sm:pl-8 pt-1">
                        {noiForm.paragraph2 ||
                          "You are entitled to counsel of your choice during this investigation. You may also bring your witness(es) if any. Please be guided that failure on your part to comply with this Notice of Investigation shall be considered submitted for a resolution based on the evidence on record."}
                      </p>

                      {/* Witness Clause */}
                      <p className="pl-6 sm:pl-8 pt-2">
                        WITNESS MY HAND this {noiForm.witnessDay || "12th"} day of {noiForm.witnessMonthYear || "October 2026"}, at {noiForm.witnessPlace || "Tacurong City, Sultan Kudarat, Philippines"}.
                      </p>
                    </div>

                    {/* 4. Signatory Block */}
                    <div className="mt-8 text-sm font-sans text-slate-900">
                      {/* Stylized Digital Signature Graphic */}
                      <div className="relative -mb-4 pl-2 h-14 w-44 pointer-events-none select-none">
                        <img
                          src="/id-assets/signature_charmie_transparent.png"
                          alt="Signature"
                          className="h-12 w-auto object-contain filter contrast-125 brightness-75"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                      <p className="font-black text-sm uppercase tracking-wide text-slate-900">
                        {noiForm.signatoryName || "JEVINCE JAYE S. JUBAY, CHRP"}
                      </p>
                      <p className="text-xs text-slate-800 italic">
                        {noiForm.signatoryTitle || "HRMD Manager"}
                      </p>
                      <p className="text-xs text-slate-800 italic">
                        {noiForm.signatoryCompany || "5A Royal Gaming OPC"}
                      </p>
                    </div>

                    {/* 5. Bottom Dual-Column Acknowledgment */}
                    <div className="mt-10 grid grid-cols-2 gap-8 text-sm font-sans text-slate-900 pt-2">
                      {/* Left Column: Received by */}
                      <div>
                        <p className="text-xs text-slate-700 mb-6">Received by:</p>
                        <p className="font-black text-sm uppercase tracking-wide text-slate-900">
                          {noiForm.toEmployee || (selectedReport.employeeName || "MICHAEL SIMPAL").toUpperCase()}
                        </p>
                        <p className="text-xs text-slate-700">Date & Signature</p>
                      </div>

                      {/* Right Column: Informed but refused received */}
                      <div>
                        <p className="text-xs text-slate-700 mb-6">Informed but refused received:</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-slate-900">Witnesses:</span>
                          <span className="border-b border-slate-500 flex-1 min-w-[120px] inline-block"></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6. Document Footer */}
                  <div className="mt-10 pt-3 text-left text-[11px] text-slate-500 font-sans">
                    {noiForm.footerText || `HR 201 File & Records ${new Date().getFullYear()}`}
                  </div>
                </div>
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
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
      {/* ========================================================================= */}
      {/* LIFECYCLE MODAL 6: SGC HEAD OFFICE — DECISION ON ADMINISTRATIVE CASE       */}
      {/* ========================================================================= */}
      {isAdminDecisionModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
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
                    Official Ruling & Executive Disciplinary Promulgation — 1:1 Matching Standard Format
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

            <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
              {/* Row 1: Memo Header & Employee Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Memo Date:
                  </label>
                  <input
                    type="text"
                    value={adminDecisionForm.date || ""}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="e.g. October 21, 2026"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    To (Employee Name):
                  </label>
                  <input
                    type="text"
                    value={adminDecisionForm.toEmployee || ""}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, toEmployee: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Subject Line:
                  </label>
                  <input
                    type="text"
                    value={adminDecisionForm.subject || "DECISION OF ADMINISTRATIVE CASE"}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, subject: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Sanction / Penalty Selection */}
              <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80 space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-950">
                  Decision Sanction / Penalty Level:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={adminDecisionForm.sanctionLevel || "Final Stern Warning"}
                    onChange={(e) => {
                      const newSanction = e.target.value;
                      const newP2 = `In view thereof, please be informed that this shall serve as your “${newSanction}”. Any further violations of company policies may result in the immediate termination of your employment.`;
                      setAdminDecisionForm({ ...adminDecisionForm, sanctionLevel: newSanction, paragraph2: newP2 });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 bg-white font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Final Stern Warning">Final Stern Warning (Official Sample)</option>
                    <option value="3-Day Suspension Without Pay">3-Day Suspension Without Pay</option>
                    <option value="7-Day Suspension Without Pay">7-Day Suspension Without Pay</option>
                    <option value="15-Day Suspension Without Pay">15-Day Suspension Without Pay</option>
                    <option value="Termination of Employment">Termination of Employment (Immediate)</option>
                    <option value="Written Warning & Reprimand">Written Warning & Reprimand</option>
                  </select>
                  <input
                    type="text"
                    value={adminDecisionForm.sanctionLevel || ""}
                    onChange={(e) => {
                      const newSanction = e.target.value;
                      const newP2 = `In view thereof, please be informed that this shall serve as your “${newSanction}”. Any further violations of company policies may result in the immediate termination of your employment.`;
                      setAdminDecisionForm({ ...adminDecisionForm, sanctionLevel: newSanction, paragraph2: newP2 });
                    }}
                    placeholder="Custom Sanction Level"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 bg-white font-bold text-rose-900"
                  />
                </div>
              </div>

              {/* Intro Line */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Introductory Statement:
                </label>
                <input
                  type="text"
                  value={adminDecisionForm.introLine || ""}
                  onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, introLine: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium text-slate-800"
                  placeholder="This is concerning your administrative case on;"
                />
              </div>

              {/* Violations Bullet Points (Connected to notices & case) */}
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-900 block">
                  Violations Established & Decided:
                </span>

                {/* Bullet 1 */}
                <div className="space-y-1.5 pl-3 border-l-2 border-rose-500">
                  <input
                    type="text"
                    value={adminDecisionForm.bullet1Article || ""}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, bullet1Article: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-bold text-slate-900"
                    placeholder="Section 16. Offenses Against Good Personal Behavior and Conduct."
                  />
                  <textarea
                    rows={2}
                    value={adminDecisionForm.bullet1Desc || ""}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, bullet1Desc: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-700"
                    placeholder="(f) Drunkenness. Reporting for work under the influence of liquor or drinking alcoholic beverages..."
                  />
                </div>

                {/* Bullet 2 */}
                <div className="space-y-1.5 pl-3 border-l-2 border-amber-500">
                  <input
                    type="text"
                    value={adminDecisionForm.bullet2Article || ""}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, bullet2Article: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-bold text-slate-900"
                    placeholder="Section 18. Offenses Related to Job Performance and Productivity"
                  />
                  <textarea
                    rows={2}
                    value={adminDecisionForm.bullet2Desc || ""}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, bullet2Desc: e.target.value })}
                    className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-700"
                    placeholder="(a) Non-observance of Standard Operating Procedures..."
                  />
                </div>
              </div>

              {/* Paragraph 1: Management Review & Repeated Occurrence Findings */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paragraph 1 — Management Review & Findings:
                </label>
                <textarea
                  rows={3}
                  value={adminDecisionForm.paragraph1 || ""}
                  onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, paragraph1: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans text-slate-800"
                />
              </div>

              {/* Paragraph 2: Sanction & Termination Warning */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paragraph 2 — Decision Sanction & Warning:
                </label>
                <textarea
                  rows={2}
                  value={adminDecisionForm.paragraph2 || ""}
                  onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, paragraph2: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 leading-relaxed font-sans text-slate-800"
                />
              </div>

              {/* Paragraph 3 */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paragraph 3 — Closing Directive:
                </label>
                <input
                  type="text"
                  value={adminDecisionForm.paragraph3 || "Please be guided accordingly."}
                  onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, paragraph3: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-medium text-slate-800"
                />
              </div>

              {/* Signatory Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Signatory Name:
                  </label>
                  <input
                    type="text"
                    value={adminDecisionForm.signatoryName || ""}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, signatoryName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Signatory Title:
                  </label>
                  <input
                    type="text"
                    value={adminDecisionForm.signatoryTitle || ""}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, signatoryTitle: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Company:
                  </label>
                  <input
                    type="text"
                    value={adminDecisionForm.signatoryCompany || ""}
                    onChange={(e) => setAdminDecisionForm({ ...adminDecisionForm, signatoryCompany: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800"
                  />
                </div>
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
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-md transition cursor-pointer inline-flex items-center gap-2 active:scale-98"
                >
                  <Scale size={15} />
                  <span>Save & Preview Decision Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTHENTIC DOCUMENT VIEWER: DECISION OF ADMINISTRATIVE CASE (1:1 FORMAT)    */}
      {/* ========================================================================= */}
      {isAdminDecisionViewerOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[96vh] h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Controls Bar */}
            <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded-md shadow-2xs">
                  {selectedReport.caseNumber}
                </span>
                <span className="text-xs font-black text-slate-800 tracking-tight hidden sm:inline">
                  Decision of Administrative Case Document
                </span>

                {/* Bond Paper Format Selector (Short / Long / Standard A4 / Legal) */}
                <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg text-xs font-semibold ml-1">
                  <button
                    type="button"
                    onClick={() => setAdminDecisionPaperFormat("SHORT")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${adminDecisionPaperFormat === "SHORT"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Short (8.5×11)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminDecisionPaperFormat("LONG")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${adminDecisionPaperFormat === "LONG"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Long (8.5×13)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminDecisionPaperFormat("A4")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${adminDecisionPaperFormat === "A4"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Standard (A4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminDecisionPaperFormat("LEGAL")}
                    className={`px-2.5 py-1 rounded-md transition cursor-pointer ${adminDecisionPaperFormat === "LEGAL"
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                      }`}
                  >
                    Legal (8.5×14)
                  </button>
                </div>

                {/* Auto 1-Page Fit Indicator */}
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  Auto 1-Page Fit ({adminDecisionPaperFormat === "SHORT" ? "Short: 8.5×11in" : adminDecisionPaperFormat === "LONG" ? "Long: 8.5×13in" : adminDecisionPaperFormat === "A4" ? "A4: 210×297mm" : "Legal: 8.5×14in"})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice speech */}
                <button
                  type="button"
                  onClick={() => {
                    const speech = `Official Decision of Administrative Case issued by ${getPaperCompanyName(adminDecisionForm.signatoryCompany || selectedReport?.company)} for ${adminDecisionForm.toEmployee || selectedReport?.employeeName}. Management has determined that there is substantial basis to establish your accountability. This shall serve as your ${adminDecisionForm.sanctionLevel || "Final Stern Warning"}.`;
                    playAiVoiceAnnouncement(speech);
                  }}
                  title="Listen to official document reading"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-rose-50 text-slate-700 hover:text-rose-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Volume2 size={14} />
                  <span>Listen</span>
                </button>

                {/* Edit Memo button */}
                {effectiveRole.isHeadOffice && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminDecisionViewerOpen(false);
                      setIsAdminDecisionModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 transition cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                  >
                    <FileEdit size={14} />
                    <span>Edit Memo</span>
                  </button>
                )}

                {/* Direct Close & Archive Case button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminDecisionViewerOpen(false);
                    handleCloseCaseDirectly(selectedReport);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                  title="Close and archive this case in HR 201 File"
                >
                  <CheckCheck size={14} />
                  <span>Close Case</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => handlePrintDocument("adminDecision")}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-95 ring-1 ring-slate-950/20"
                >
                  <Printer size={14} className="text-emerald-400" />
                  <span>Print Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAdminDecisionViewerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Official Letterhead Printable Document Container - Desk Canvas */}
            <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6 pb-12 bg-slate-200/80 flex justify-center items-start custom-scrollbar">
              <div
                id="printable-admin-decision-document-sheet"
                style={{
                  width: adminDecisionPaperFormat === "A4" ? "210mm" : "8.5in",
                  minWidth: adminDecisionPaperFormat === "A4" ? "210mm" : "8.5in",
                  maxWidth: adminDecisionPaperFormat === "A4" ? "210mm" : "8.5in",
                  minHeight: adminDecisionPaperFormat === "A4" ? "297mm" : adminDecisionPaperFormat === "SHORT" ? "11in" : adminDecisionPaperFormat === "LEGAL" ? "14in" : "13in",
                  boxSizing: "border-box",
                }}
                className={`bg-white shadow-2xl ring-1 ring-slate-900/10 rounded-xs text-slate-900 font-sans relative shrink-0 flex flex-col justify-between transition-all duration-150 print:p-0 print:border-none print:shadow-none print:ring-0 ${adminDecisionPaperFormat === "SHORT"
                  ? "p-5 sm:p-7 md:p-8"
                  : adminDecisionPaperFormat === "A4"
                    ? "p-7 sm:p-9 md:p-11"
                    : adminDecisionPaperFormat === "LEGAL"
                      ? "p-9 sm:p-11 md:p-13"
                      : "p-8 sm:p-10 md:p-12"
                  }`}
              >
                {/* Background Watermark: Dynamic Company Logo */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.045] pointer-events-none select-none">
                  <img
                    src={getPaperLogo(adminDecisionForm.signatoryCompany || selectedReport?.company)}
                    alt="watermark"
                    className="w-[110mm] max-w-[440px] h-auto object-contain"
                  />
                </div>

                <div className="relative z-10 flex flex-col flex-1 justify-between">
                  <div>
                    {/* 1. Official Header (Matching Photo 1:1) */}
                    <div className="flex items-center justify-between pb-3">
                      {/* Left Logo: PCSO Swirl Logo */}
                      <div className="flex items-center gap-2">
                        <img
                          src="/id-assets/pcso_logo.svg"
                          alt="PCSO Logo"
                          className="h-16 w-auto object-contain"
                          onError={(e) => {
                            e.target.src = "/id-assets/pcso_logo.png";
                          }}
                        />
                      </div>

                      {/* Center Logo: Dynamic Company Logo */}
                      <div className="flex items-center justify-center flex-1 px-4">
                        <img
                          src={getPaperLogo(adminDecisionForm.signatoryCompany || selectedReport?.company)}
                          alt={getPaperCompanyName(adminDecisionForm.signatoryCompany || selectedReport?.company)}
                          className="h-16 w-auto object-contain"
                        />
                      </div>

                      {/* Right Logo: Corporate Emblem */}
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
                    <div className="mt-4 sm:mt-5 space-y-1 text-sm font-sans text-slate-900">
                      <div className="grid grid-cols-[90px_1fr] items-baseline">
                        <span className="font-bold">Date:</span>
                        <span className="font-medium">{adminDecisionForm.date || "October 21, 2026"}</span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] items-baseline">
                        <span className="font-bold">To:</span>
                        <span className="font-black uppercase tracking-wide">
                          {adminDecisionForm.toEmployee || (selectedReport.employeeName || "MICHAEL SIMPAL").toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-[90px_1fr] items-baseline">
                        <span className="font-bold">Subject:</span>
                        <span className="font-black uppercase tracking-wide">{adminDecisionForm.subject || "DECISION OF ADMINISTRATIVE CASE"}</span>
                      </div>
                    </div>

                    {/* Black Dividing Line */}
                    <div className="w-full h-[1.5px] bg-slate-900 mt-2 mb-3 sm:mb-4" />

                    {/* 3. Document Body Content (Exact Structure & Typography from Sample Photo) */}
                    <div className={`${adminDecisionPaperFormat === "SHORT" ? "space-y-2.5 text-xs leading-relaxed" : "space-y-4 text-xs sm:text-[13px] leading-relaxed"} text-slate-900 font-sans text-justify`}>
                      {/* Intro Line */}
                      <p className="pl-6 sm:pl-8">
                        {adminDecisionForm.introLine || "This is concerning your administrative case on;"}
                      </p>

                      {/* Bulleted Violation List */}
                      <div className="pl-10 sm:pl-14 space-y-2 text-slate-900">
                        {/* Bullet 1 */}
                        <div>
                          <p className="font-black flex items-start gap-2">
                            <span>•</span>
                            <span>{adminDecisionForm.bullet1Article || "Section 16. Offenses Against Good Personal Behavior and Conduct."}</span>
                          </p>
                          <p className="pl-4 mt-0.5">
                            {adminDecisionForm.bullet1Desc ||
                              "(f) Drunkenness. Reporting for work under the influence of liquor or drinking alcoholic beverages during work hours (except on official functions) is classified as serious offense."}
                          </p>
                        </div>

                        {/* Bullet 2 */}
                        <div className="pt-0.5">
                          <p className="font-black flex items-start gap-2">
                            <span>•</span>
                            <span>{adminDecisionForm.bullet2Article || "Section 18. Offenses Related to Job Performance and Productivity"}</span>
                          </p>
                          <p className="pl-4 mt-0.5">
                            {adminDecisionForm.bullet2Desc ||
                              "(a) Non-observance of Standard Operating Procedures. Willful or unintentional non-observance of standard operating procedures for direct or indirect personal gain is classified as serious offense and shall accordingly be meted penalties for serious offense."}
                          </p>
                        </div>
                      </div>

                      {/* Paragraph 1: Management Review & Repeated Occurrence */}
                      <p className="pl-6 sm:pl-8 pt-0.5">
                        {adminDecisionForm.paragraph1 ||
                          "After reviewing the facts and circumstances surrounding the case, Management has determined that there is substantial basis to establish your accountability for the aforementioned violations. Management further notes that this is a repeated occurrence of the same or similar violation, notwithstanding prior reminders, and corrective measures previously undertaken."}
                      </p>

                      {/* Paragraph 2: Decision / Sanction Level & Termination Warning */}
                      <p className="pl-6 sm:pl-8">
                        {adminDecisionForm.paragraph2 ? (
                          adminDecisionForm.paragraph2
                        ) : (
                          <>
                            In view thereof, please be informed that this shall serve as your{" "}
                            <strong>“{adminDecisionForm.sanctionLevel || "Final Stern Warning"}”</strong>. Any further violations of company policies may result in the{" "}
                            <strong>immediate termination of your employment</strong>.
                          </>
                        )}
                      </p>

                      {/* Paragraph 3 */}
                      <p className="pl-6 sm:pl-8">
                        {adminDecisionForm.paragraph3 || "Please be guided accordingly."}
                      </p>
                    </div>

                    {/* 4. Signatory Block */}
                    <div className={`${adminDecisionPaperFormat === "SHORT" ? "mt-4 text-xs" : "mt-8 text-sm"} font-sans text-slate-900`}>
                      <p className="mb-1 text-xs sm:text-sm">Sincerely,</p>
                      {/* Stylized Digital Signature Graphic */}
                      <div className="relative -mb-4 pl-2 h-14 w-44 pointer-events-none select-none">
                        <img
                          src="/id-assets/signature_charmie_transparent.png"
                          alt="Signature"
                          className="h-12 w-auto object-contain filter contrast-125 brightness-75"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      </div>
                      <p className="font-black text-sm uppercase tracking-wide text-slate-900">
                        {adminDecisionForm.signatoryName || "JEVINCE JAYE S. JUBAY, CHRP"}
                      </p>
                      <p className="text-xs text-slate-800">
                        {adminDecisionForm.signatoryTitle || "HRMD Manager"}
                      </p>
                      <p className="text-xs text-slate-800">
                        {adminDecisionForm.signatoryCompany || getPaperCompanyName(selectedReport?.company)}
                      </p>
                    </div>

                    {/* 5. Received by Block */}
                    <div className={`${adminDecisionPaperFormat === "SHORT" ? "mt-4 pt-1" : "mt-8 pt-2"} text-sm font-sans text-slate-900`}>
                      <p className="text-xs text-slate-700 mb-2">Received by:</p>
                      <p className="font-black text-sm uppercase tracking-wide text-slate-900">
                        {adminDecisionForm.toEmployee || (selectedReport.employeeName || "MICHAEL SIMPAL").toUpperCase()}
                      </p>
                      <p className="text-xs text-slate-700">Date & Signature</p>
                    </div>
                  </div>

                  {/* 6. Document Footer */}
                  <div className={`${adminDecisionPaperFormat === "SHORT" ? "mt-5 pt-2" : "mt-10 pt-3"} text-left text-[11px] text-slate-500 font-sans`}>
                    {adminDecisionForm.footerText || `HR 201 File & Records ${new Date().getFullYear()}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* ========================================================================= */}
      {/* GLOBAL LOADING & TRANSMITTING ANIMATION OVERLAY                            */}
      {/* ========================================================================= */}
      {isTransmitting && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 flex flex-col items-center text-center max-w-sm w-full space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0f2b48] to-[#1e40af] flex items-center justify-center text-white shadow-xl shadow-blue-900/25">
                <RefreshCw size={28} className="animate-spin text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Transmitting & Saving</h3>
              <p className="text-xs text-slate-600 mt-1 font-semibold leading-relaxed">
                {transmittingMessage || "Synchronizing records to database bucket..."}
              </p>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 via-blue-600 to-[#0f2b48] h-full w-2/3 animate-[pulse_1s_infinite] rounded-full" />
            </div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Please wait • Synchronizing changes
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
