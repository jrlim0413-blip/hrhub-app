import { useState, useMemo, useEffect } from "react";
import html2canvas from "html2canvas";
import {
  FileText, Building2, Send, Printer, Copy, Check, Sparkles,
  Layers, RefreshCw, X, Mail, Eye, Sliders, CheckCircle2,
  AlertCircle, Users, UserPlus, PenTool, Calendar, Bookmark,
  RotateCcw, ArrowRight, ArrowLeft, ExternalLink, Zap,
  Maximize2, ZoomIn, ZoomOut, Save, Archive, Trash2, Clock, Plus,
  Upload, Image, CheckSquare, Square, XCircle, Code, ShieldCheck, Key,
  Camera, Download
} from "lucide-react";
import { processSignatureToTransparentPng } from "../lib/signatureImageProcessor";
import { mergeProfilesWithStored, getStoredEmployees } from "../lib/employeeStorage";
export const HR_OFFICIAL_EMAIL = "imsoroglohr@gmail.com";
export const CORPORATE_GROUP_EMBLEM = "/logos/group_emblem.jpg";

/**
 * Match an employee record with its target company entity accurately.
 * Uses exact matches and dedicated entity mapping to prevent substring collision (e.g. 'imp' matching 'simpal').
 */
export function matchEmployeeToCompany(employee, comp) {
  if (!employee || !comp) return false;
  const empComp = (employee.company || "").trim().toLowerCase();
  const compId = (comp.id || "").toLowerCase();
  const compCode = (comp.code || "").toLowerCase();
  const compName = (comp.name || "").trim().toLowerCase();
  const compLegal = (comp.legalName || "").trim().toLowerCase();

  // If employee has no company assigned, default to Parent Holding (SGC)
  if (!empComp) {
    return compId === "sgc" || compCode === "sgc";
  }

  // Exact matches first
  if (empComp === compName || empComp === compLegal || empComp === compCode || empComp === compId) {
    return true;
  }

  // Specific Entity Discriminators
  switch (compId) {
    case "simcon":
      return empComp.includes("simcon") || empComp.includes("construction");

    case "lucky_betplay":
      return empComp.includes("lucky") || empComp.includes("betplay") || empComp.includes("lbc");

    case "5a_royal":
      return (
        empComp.includes("5a") ||
        empComp.includes("royal") ||
        empComp.includes("5arg") ||
        (empComp.includes("gaming") && !empComp.includes("imperial"))
      );

    case "imperial_gaming":
      return empComp.includes("imperial") || empComp === "imp";

    case "glowing_fortune":
      return empComp.includes("glowing") || empComp.includes("fortune");

    case "sgc":
      // Simpal Group (holding) - exclude construction, imperial, lucky, etc.
      return (
        empComp === "sgc" ||
        empComp === "simpal group" ||
        empComp === "simpal group of companies" ||
        (empComp.includes("simpal") && !empComp.includes("construction") && !empComp.includes("simcon"))
      );

    default:
      return empComp === compName || empComp === compLegal;
  }
}

export const COMPANIES = [
  {
    id: "lucky_betplay",
    name: "Lucky Betplay Corporation",
    legalName: "LUCKY BETPLAY CORPORATION",
    tagline: "PCSO STL Authorized Agent Corporation (AAC Mandaue City)",
    category: "Authorized Gaming & STL Operations",
    logoUrl: "/logos/LB.png",
    rightLogoUrl: CORPORATE_GROUP_EMBLEM,
    code: "LBC",
    address: "#257 Barlaps, A.S. Fortuna Street, Bakilid, Mandaue City, Cebu 6014",
    contact: "stl.operations@luckybetplay.com | Tel: (+63 32) 231-9042",
    accentColor: "#059669",
    accentBg: "bg-emerald-600",
    accentText: "text-emerald-600",
    accentBorder: "border-emerald-600",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultSignatoryCompany: "Lucky Betplay Corporation",
    defaultTo: "HR ON-SITE, CIC, AND FIELD MONITORING",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    approverName: "CHARMIE JEAN M. SIMPAL",
    approverTitle: "President & CEO"
  },
  {
    id: "sgc",
    name: "Simpal Group of Companies",
    legalName: "SIMPAL GROUP OF COMPANIES",
    tagline: "Corporate Executive Holding & Group Administration",
    category: "Parent & Holding Enterprise",
    logoUrl: "/logos/SGC.png",
    rightLogoUrl: CORPORATE_GROUP_EMBLEM,
    code: "SGC",
    address: "Penthouse Level, Corporate Executive Tower, Cebu Business Park, Cebu City, Philippines",
    contact: "corporate@simpalgroup.com | Tel: (+63 32) 412-8888",
    accentColor: "#059669",
    accentBg: "bg-emerald-500",
    accentText: "text-emerald-600",
    accentBorder: "border-emerald-500",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultSignatoryCompany: "Simpal Group of Companies",
    defaultTo: "ALL EMPLOYEES AND CONCERNED PERSONNEL",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    approverName: "CHARMIE JEAN M. SIMPAL",
    approverTitle: "President & CEO"
  },
  {
    id: "simcon",
    name: "Simpal Construction (SIMCON)",
    legalName: "SIMPAL CONSTRUCTION",
    tagline: "Building with Vision, Quality, and Pride",
    category: "Heavy Construction & Field Infrastructure",
    logoUrl: "/logos/SIM.png",
    rightLogoUrl: CORPORATE_GROUP_EMBLEM,
    code: "SIMCON",
    address: "Operations Yard & Central Depot, Mandaue Industrial Complex, Mandaue City, Cebu",
    contact: "operations@simcon-ph.com | Tel: (+63 32) 345-7721",
    accentColor: "#047857",
    accentBg: "bg-emerald-700",
    accentText: "text-emerald-700",
    accentBorder: "border-emerald-700",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultSignatoryCompany: "Simpal Construction (SIMCON)",
    defaultTo: "ALL PROJECT ENGINEERS, SITE SUPERVISORS & FIELD WORKERS",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    approverName: "CHARMIE JEAN M. SIMPAL",
    approverTitle: "President & CEO"
  },
  {
    id: "5a_royal",
    name: "5A Royal Gaming OPC",
    legalName: "5A ROYAL GAMING ONE PERSON CORPORATION",
    tagline: "Premier Leisure, Gaming & Entertainment Ventures",
    category: "One Person Corporation (Leisure & Gaming)",
    logoUrl: "/logos/5A.png",
    rightLogoUrl: CORPORATE_GROUP_EMBLEM,
    code: "5ARG",
    address: "Regional Executive Hub, Central Visayas Operations, Cebu, Philippines",
    contact: "admin@5aroyalgaming.com | Tel: (+63 32) 418-5522",
    accentColor: "#059669",
    accentBg: "bg-emerald-600",
    accentText: "text-emerald-600",
    accentBorder: "border-emerald-600",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultSignatoryCompany: "5A Royal Gaming OPC",
    defaultTo: "ALL GAMING STAFF & BRANCH OPERATIONS PERSONNEL",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    approverName: "CHARMIE JEAN M. SIMPAL",
    approverTitle: "President & CEO"
  },
  {
    id: "glowing_fortune",
    name: "Glowing Fortune",
    legalName: "GLOWING FORTUNE ENTERTAINMENT CORP.",
    tagline: "Hospitality, Leisure & Gaming Services",
    category: "Gaming & Hospitality Enterprise",
    logoUrl: "/logos/GLOW.png",
    rightLogoUrl: CORPORATE_GROUP_EMBLEM,
    code: "GFC",
    address: "Commercial Center Arcade, A.S. Fortuna Street, Mandaue City, Cebu",
    contact: "inquiries@glowingfortune.ph | Tel: (+63 32) 346-1189",
    accentColor: "#059669",
    accentBg: "bg-emerald-600",
    accentText: "text-emerald-600",
    accentBorder: "border-emerald-600",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultSignatoryCompany: "Glowing Fortune",
    defaultTo: "ALL HOSPITALITY, BRANCH & OPERATIONS PERSONNEL",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    approverName: "CHARMIE JEAN M. SIMPAL",
    approverTitle: "President & CEO"
  },
  {
    id: "imperial_gaming",
    name: "Imperial Gaming OPC",
    legalName: "IMPERIAL GAMING ONE PERSON CORPORATION",
    tagline: "Corporate Entertainment & Leisure Administration",
    category: "One Person Corporation (Gaming)",
    logoUrl: "/logos/IMP.png",
    rightLogoUrl: CORPORATE_GROUP_EMBLEM,
    code: "IMP",
    address: "Metro Cebu Business Center, Cebu City, Philippines",
    contact: "corporate@imperialgaming.com | Tel: (+63 32) 238-9901",
    accentColor: "#059669",
    accentBg: "bg-emerald-600",
    accentText: "text-emerald-600",
    accentBorder: "border-emerald-600",
    badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultSignatoryCompany: "Imperial Gaming OPC",
    defaultTo: "ALL CORPORATE & REGIONAL GAMING STAFF",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    approverName: "CHARMIE JEAN M. SIMPAL",
    approverTitle: "President & CEO"
  }
];

const LETTERHEAD_STORAGE_KEY = "hrhub_memo_letterhead_defaults";
const LETTERHEAD_FIELDS = ["legalName", "tagline", "address", "contact"];

const loadLetterheadDefaults = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LETTERHEAD_STORAGE_KEY) || "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};

    return COMPANIES.reduce((defaults, company) => {
      const savedFields = stored[company.id];
      if (!savedFields || typeof savedFields !== "object" || Array.isArray(savedFields)) return defaults;

      const validFields = Object.fromEntries(
        LETTERHEAD_FIELDS
          .filter((field) =>
            typeof savedFields[field] === "string" &&
            (field !== "legalName" || savedFields[field].trim().length > 0)
          )
          .map((field) => [field, savedFields[field]])
      );
      if (Object.keys(validFields).length) defaults[company.id] = validFields;
      return defaults;
    }, {});
  } catch {
    return {};
  }
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;"
}[character]));

const resolveSignatoryAffiliation = (company, value) => {
  const affiliation = (value || "").trim();
  if (!affiliation || (affiliation === "5A Royal Gaming OPC" && company.id !== "5a_royal")) {
    return company.name;
  }
  return affiliation;
};

export const formatAddressLines = (address) => {
  if (!address) return [""];
  if (address.includes(",")) {
    const parts = address.split(",");
    if (parts.length >= 3) {
      return [
        parts.slice(0, 2).join(",").trim(),
        parts.slice(2).join(",").trim()
      ];
    }
  }
  return [address];
};

// AUTOMATIC SYSTEM CLASSIFICATION ANALYZER (Based on Subject Line & Content)
export function analyzeClassificationFromSubject(subjectText = "", contentText = "") {
  const text = `${subjectText} ${contentText}`.toLowerCase();

  // 1. Mandatory Compliance
  if (
    text.includes("compliance") ||
    text.includes("biometric") ||
    text.includes("attendance") ||
    text.includes("tardiness") ||
    text.includes("punctual") ||
    text.includes("late") ||
    text.includes("due process") ||
    text.includes("written explanation") ||
    text.includes("notice to explain") ||
    text.includes("infraction") ||
    text.includes("disciplinary") ||
    text.includes("violation") ||
    text.includes("cutoff") ||
    text.includes("mandatory") ||
    text.includes("timekeeping") ||
    text.includes("payroll withholding")
  ) {
    return "Mandatory Compliance";
  }

  // 2. Holiday Schedule
  if (
    text.includes("holiday") ||
    text.includes("non-working") ||
    text.includes("special day") ||
    text.includes("proclamation") ||
    text.includes("skeleton force") ||
    text.includes("skeletal") ||
    text.includes("regular holiday") ||
    text.includes("holy week") ||
    text.includes("christmas") ||
    text.includes("new year") ||
    text.includes("all saints") ||
    text.includes("advisory: declared")
  ) {
    return "Holiday Schedule";
  }

  // 3. Safety & Health
  if (
    text.includes("safety") ||
    text.includes("ppe") ||
    text.includes("health") ||
    text.includes("hazard") ||
    text.includes("weather") ||
    text.includes("typhoon") ||
    text.includes("storm") ||
    text.includes("flood") ||
    text.includes("earthquake") ||
    text.includes("emergency") ||
    text.includes("incident") ||
    text.includes("injury") ||
    text.includes("first aid") ||
    text.includes("sanitation") ||
    text.includes("occupational")
  ) {
    return "Safety & Health";
  }

  // 4. Executive Order
  if (
    text.includes("executive order") ||
    text.includes("appointment") ||
    text.includes("board resolution") ||
    text.includes("restructuring") ||
    text.includes("reorganization") ||
    text.includes("president") ||
    text.includes("ceo directive") ||
    text.includes("board of directors") ||
    text.includes("officer appointment")
  ) {
    return "Executive Order";
  }

  // 5. Operational Directive
  if (
    text.includes("operation") ||
    text.includes("directive") ||
    text.includes("handover") ||
    text.includes("turnover") ||
    text.includes("draw") ||
    text.includes("teller") ||
    text.includes("response") ||
    text.includes("communicat") ||
    text.includes("accessibility") ||
    text.includes("protocol") ||
    text.includes("procedure") ||
    text.includes("workflow") ||
    text.includes("audit") ||
    text.includes("field monitoring") ||
    text.includes("shift")
  ) {
    return "Operational Directive";
  }

  // 6. General Policy
  return "General Policy";
}

export function cleanDirectivesBody(rawContent) {
  if (!rawContent) return "";
  let body = rawContent;

  const headerKeys = [
    "CLASSIFICATION", "CATEGORY", "TYPE", "SUBJECT", "SUBJ",
    "FROM", "TO", "DATE", "REF NUMBER", "REF NO", "MEMO REF", "REF"
  ];
  let lastHeaderEnd = -1;

  for (const key of headerKeys) {
    const rx = new RegExp(`(?:^|\\n)\\s*\\*{0,2}\\b${key}\\b\\*{0,2}\\s*[:\\-][^\\n\\r]+`, "i");
    const m = body.match(rx);
    if (m && m.index !== undefined) {
      const lineEnd = m.index + m[0].length;
      if (lineEnd > lastHeaderEnd) {
        lastHeaderEnd = lineEnd;
      }
    }
  }

  if (lastHeaderEnd > -1) {
    body = body.substring(lastHeaderEnd);
    body = body.replace(/^\s*(?:[-*_]{3,}|\={3,})?\s*/g, "");
  } else {
    body = body.replace(/^(?:[\s\S]*?)(?:MEMORANDUM[\s\S]*?(?:[-*_]{3,}|\={3,}))/i, "");
  }

  body = body
    .replace(/(?:^|\n)\s*\*{0,2}\b(?:ISSUED BY|PREPARED BY|SIGNED BY|APPROVED BY|NOTED BY|JEVINCE JAYE S\. JUBAY|HUMAN RESOURCE MANAGEMENT DIVISION)\b[\s\S]*$/i, "")
    .replace(/(?:Please let me know|Let me know if|I hope this helps|Anything else I can help with)[\s\S]*$/i, "")
    .trim();

  return body || rawContent;
}

export default function MemoGeneratorPanel({
  onClose,
  profiles = [],
  currentUser = null,
  initialDraft = null,
  onOpenAiBuddy,
  onNavigateToDirectory
}) {
  // Stepper State: 1 = Header & Addressing, 2 = Body Directives, 3 = Signatories, 4 = Final Memo & Multi-Company
  const [currentStep, setCurrentStep] = useState(1);
  const [unlinkedNoticeModalOpen, setUnlinkedNoticeModalOpen] = useState(false);

  // Selected Company State - Default to Lucky Betplay Corporation (LBC)
  const [selectedCompanyId, setSelectedCompanyId] = useState("lucky_betplay");
  const [savedLetterheadDefaults, setSavedLetterheadDefaults] = useState(loadLetterheadDefaults);
  const [letterheadOverrides, setLetterheadOverrides] = useState(() => savedLetterheadDefaults);
  const [dirtyLetterheadCompanyIds, setDirtyLetterheadCompanyIds] = useState([]);
  const [letterheadStatus, setLetterheadStatus] = useState(null);
  const companies = useMemo(
    () => COMPANIES.map((company) => ({ ...company, ...letterheadOverrides[company.id] })),
    [letterheadOverrides]
  );
  const selectedCompany = useMemo(() => {
    return companies.find((company) => company.id === selectedCompanyId) || companies[0];
  }, [companies, selectedCompanyId]);
  const letterheadHeading = selectedCompany.legalName ?? selectedCompany.name ?? "";
  const isLetterheadHeadingInvalid = !letterheadHeading.trim();

  // Step 1: Memo Header & Routing States
  const [memoRef, setMemoRef] = useState(() => `MEMO-2026-LBC-001`);
  const [memoDate, setMemoDate] = useState(() => {
    const now = new Date();
    return new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(now).toUpperCase();
  });
  const [memoTo, setMemoTo] = useState("HR ON-SITE, CIC, AND FIELD MONITORING");
  const [memoFrom, setMemoFrom] = useState("HUMAN RESOURCES DEPARTMENT");
  const [memoSubject, setMemoSubject] = useState("IMMEDIATE RESPONSE AND COMMUNICATION ACCESSIBILITY");

  // Step 2: Memorandum Body Directives State (Starts clean / empty canvas or with loaded draft)
  const [memoContent, setMemoContent] = useState("");
  const [magnifyModalOpen, setMagnifyModalOpen] = useState(false);

  // AUTOMATIC CLASSIFICATION STATE (Auto-analyzed by system based on subject & content)
  const [memoCategory, setMemoCategory] = useState(() =>
    analyzeClassificationFromSubject("IMMEDIATE RESPONSE AND COMMUNICATION ACCESSIBILITY", "")
  );

  // Auto-analyze category whenever Subject or Content changes
  useEffect(() => {
    const autoClass = analyzeClassificationFromSubject(memoSubject, memoContent);
    setMemoCategory(autoClass);
  }, [memoSubject, memoContent]);

  // Step 3: Signatory Setup & E-Signature States
  const [signatoryLayout, setSignatoryLayout] = useState("dual"); // 'dual' | 'single'
  const [signatoryName, setSignatoryName] = useState("JEVINCE JAYE S. JUBAY, CHRP");
  const [signatoryTitle, setSignatoryTitle] = useState("HRMD Manager");
  const [signatoryCompany, setSignatoryCompany] = useState(selectedCompany.name);
  const [approverName, setApproverName] = useState("CHARMIE JEAN M. SIMPAL");
  const [approverTitle, setApproverTitle] = useState("President & CEO");

  // E-Signatures (Loaded from and saved to localStorage)
  const [signatorySignature, setSignatorySignature] = useState(() => {
    try {
      return localStorage.getItem("hrhub_memo_signatory_signature") || null;
    } catch {
      return null;
    }
  });
  const [approverSignature, setApproverSignature] = useState(() => {
    try {
      return localStorage.getItem("hrhub_memo_approver_signature") || null;
    } catch {
      return null;
    }
  });

  // Step 4: Preview, Zoom & Watermark States
  const [previewZoom, setPreviewZoom] = useState(100); // 90, 100, 110
  const [watermarkOpacity, setWatermarkOpacity] = useState(6); // 4% to 25% (default 6% for clean look)
  const [watermarkSize, setWatermarkSize] = useState(400);
  const [showDiagonalStamp, setShowDiagonalStamp] = useState(false);
  const [diagonalStampText, setDiagonalStampText] = useState("OFFICIAL MEMORANDUM • CONFIDENTIAL");

  // Multi-Company Distribution Inclusion State (Default: all 6 entities included)
  const [includedCompanyIds, setIncludedCompanyIds] = useState(() =>
    COMPANIES.map((c) => c.id)
  );

  const activeCompanies = useMemo(() => {
    return companies.filter((company) => includedCompanyIds.includes(company.id));
  }, [companies, includedCompanyIds]);
  const companiesToPreview = activeCompanies;
  const distributionCompany = activeCompanies.find((company) => company.id === selectedCompanyId) || activeCompanies[0] || selectedCompany;
  const distributionMemoRef = selectedCompanyId === distributionCompany.id
    ? memoRef
    : `MEMO-2026-${distributionCompany.code}-${memoRef.split("-").pop() || "001"}`;
  const getSignatoryAffiliation = (company) =>
    company.id === selectedCompanyId
      ? resolveSignatoryAffiliation(company, signatoryCompany)
      : company.name;

  const toggleCompanyInclusion = (companyId) => {
    setIncludedCompanyIds((prev) => {
      if (prev.includes(companyId)) {
        if (prev.length <= 1) {
          alert("At least one entity must remain included in the memorandum distribution.");
          return prev;
        }
        return prev.filter((id) => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
  };

  const selectAllCompanies = () => {
    setIncludedCompanyIds(COMPANIES.map((c) => c.id));
  };

  const selectOnlyCompany = (companyId) => {
    setIncludedCompanyIds([companyId]);
  };

  // Saved Memos Archive State
  const [savedMemos, setSavedMemos] = useState(() => {
    try {
      const raw = localStorage.getItem("hrhub_saved_memos_archive");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Email & Dispatch States (Company-Specific Segregation)
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [customWebhookUrl, setCustomWebhookUrl] = useState(() => {
    try {
      return (
        (typeof localStorage !== "undefined" ? localStorage.getItem("hrhub_gmail_webhook_url") : "") ||
        (typeof import.meta !== "undefined" && import.meta.env?.VITE_HR_EMAIL_WEBHOOK_URL ? import.meta.env.VITE_HR_EMAIL_WEBHOOK_URL : "") ||
        ""
      ).trim();
    } catch {
      return "";
    }
  });
  const [showScriptGuideModal, setShowScriptGuideModal] = useState(false);
  const [copiedScriptNotice, setCopiedScriptNotice] = useState(false);
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [directSendStatus, setDirectSendStatus] = useState(null);
  const [copyingImageId, setCopyingImageId] = useState(null);
  const [copiedImageId, setCopiedImageId] = useState(null);
  const [companyLogoDataMap, setCompanyLogoDataMap] = useState({});
  const [fadedWatermarkMap, setFadedWatermarkMap] = useState({});
  const [groupEmblemDataUrl, setGroupEmblemDataUrl] = useState("");

  // Pre-process and cache company logo images and group emblem into self-contained base64 Data URLs
  useEffect(() => {
    let isMounted = true;
    const loadLogos = async () => {
      const rawMap = {};
      const fadedMap = {};

      // 1. Process all company logos
      for (const comp of COMPANIES) {
        if (!comp.logoUrl) continue;
        try {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = comp.logoUrl;
          });

          if (img.naturalWidth && img.naturalHeight) {
            // Raw Logo Data URL
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            rawMap[comp.id] = canvas.toDataURL("image/png");

            // Faded Watermark Data URL (clean, transparent background for email card & PDF)
            const fCanvas = document.createElement("canvas");
            const targetW = 600;
            const targetH = Math.round((img.naturalHeight / img.naturalWidth) * targetW);
            fCanvas.width = targetW;
            fCanvas.height = targetH;
            const fCtx = fCanvas.getContext("2d");
            fCtx.globalAlpha = 0.08; // subtle, readable behind text in email
            fCtx.drawImage(img, 0, 0, targetW, targetH);
            fadedMap[comp.id] = fCanvas.toDataURL("image/png");
          }
        } catch (err) {
          console.warn("Could not pre-process logo for", comp.id, err);
        }
      }

      // 2. Process corporate group emblem
      try {
        const gImg = new window.Image();
        gImg.crossOrigin = "anonymous";
        await new Promise((resolve) => {
          gImg.onload = resolve;
          gImg.onerror = resolve;
          gImg.src = CORPORATE_GROUP_EMBLEM;
        });
        if (gImg.naturalWidth && gImg.naturalHeight) {
          const gCanvas = document.createElement("canvas");
          gCanvas.width = gImg.naturalWidth;
          gCanvas.height = gImg.naturalHeight;
          const gCtx = gCanvas.getContext("2d");
          gCtx.drawImage(gImg, 0, 0);
          if (isMounted) {
            setGroupEmblemDataUrl(gCanvas.toDataURL("image/jpeg"));
          }
        }
      } catch (gErr) {
        console.warn("Could not pre-process corporate emblem", gErr);
      }

      if (isMounted) {
        setCompanyLogoDataMap(rawMap);
        setFadedWatermarkMap(fadedMap);
      }
    };

    loadLogos();
    return () => { isMounted = false; };
  }, []);

  const saveCustomWebhookUrl = (urlToSave) => {
    const trimmed = urlToSave.trim();
    setCustomWebhookUrl(trimmed);
    try {
      localStorage.setItem("hrhub_gmail_webhook_url", trimmed);
    } catch (e) {
      console.error(e);
    }
    setIsEditingWebhook(false);
  };

  // Sync initial draft from HRHub Ai Buddy if provided or stored
  useEffect(() => {
    let draft = initialDraft;
    if (!draft) {
      try {
        const saved = localStorage.getItem("hrhub_active_memo_draft");
        if (saved) {
          draft = JSON.parse(saved);
        }
      } catch {}
    }

    if (draft) {
      const draftCompany = COMPANIES.find((company) => company.id === draft.companyId) || COMPANIES[0];
      if (draft.companyId) setSelectedCompanyId(draftCompany.id);
      setSignatoryCompany(resolveSignatoryAffiliation(draftCompany, draft.signatoryCompany));
      if (draft.ref) setMemoRef(draft.ref.trim());
      if (draft.date) setMemoDate(draft.date.trim());
      if (draft.to) setMemoTo(draft.to.trim());
      if (draft.from) setMemoFrom(draft.from.trim());
      if (draft.subject) setMemoSubject(draft.subject.trim());
      if (draft.signatoryName) setSignatoryName(draft.signatoryName.trim());
      if (draft.signatoryTitle) setSignatoryTitle(draft.signatoryTitle.trim());
      if (draft.approverName) setApproverName(draft.approverName.trim());
      if (draft.approverTitle) setApproverTitle(draft.approverTitle.trim());
      if (draft.content) {
        setMemoContent(cleanDirectivesBody(draft.content));
      }
    }
  }, [initialDraft]);

  // Company-Specific Dispatches List: Strictly pre-registered employees' work emails only!
  const companyDispatches = useMemo(() => {
    const allEmployees = mergeProfilesWithStored(profiles);

    return activeCompanies.map((comp) => {
      const matchingEmployees = allEmployees.filter((emp) => matchEmployeeToCompany(emp, comp));
      const compEmailSet = new Set();
      
      matchingEmployees.forEach((emp) => {
        // Must be a valid work email address from pre-registered employees
        const workEmail = (emp.email || emp.work_email || emp.workEmail || "").trim();
        if (workEmail && workEmail.includes("@")) {
          compEmailSet.add(workEmail);
        }
      });

      // STRICT: Zero fallback to generic company contacts. Pre-registered work emails only!
      const recipients = Array.from(compEmailSet);
      const compMemoRef = `MEMO-2026-${comp.code}-${memoRef.split("-").pop() || "001"}`;

      return {
        companyId: comp.id,
        companyName: comp.name,
        legalName: comp.legalName || comp.name,
        code: comp.code,
        memoRef: compMemoRef,
        recipients,
        employees: matchingEmployees,
        accentColor: comp.accentColor || "#059669"
      };
    });
  }, [activeCompanies, profiles, memoRef]);

  // Companies with 0 linked pre-registered employee emails
  const unlinkedEntities = useMemo(() => {
    return companyDispatches.filter((d) => d.recipients.length === 0);
  }, [companyDispatches]);

  // Companies with at least 1 linked pre-registered employee email
  const linkedEntities = useMemo(() => {
    return companyDispatches.filter((d) => d.recipients.length > 0);
  }, [companyDispatches]);

  // Total unique recipients across all company entities
  const totalCompanyRecipients = useMemo(() => {
    const set = new Set();
    companyDispatches.forEach((d) => {
      d.recipients.forEach((email) => set.add(email));
    });
    return set.size;
  }, [companyDispatches]);

  // All recipient emails combined for generic clients
  const recipientEmails = useMemo(() => {
    const set = new Set();
    companyDispatches.forEach((d) => {
      d.recipients.forEach((email) => set.add(email));
    });
    return Array.from(set);
  }, [companyDispatches]);

  // Switch Company Entity
  const handleSelectCompany = (companyId) => {
    const comp = companies.find((company) => company.id === companyId);
    if (!comp) return;
    setSelectedCompanyId(companyId);
    setSignatoryCompany(comp.name);
    setMemoRef(`MEMO-2026-${comp.code}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}`);
    setLetterheadStatus(null);
  };

  const updateLetterheadField = (field, value) => {
    setLetterheadOverrides((previous) => ({
      ...previous,
      [selectedCompanyId]: {
        ...(previous[selectedCompanyId] || {}),
        [field]: value
      }
    }));
    setDirtyLetterheadCompanyIds((previous) =>
      previous.includes(selectedCompanyId) ? previous : [...previous, selectedCompanyId]
    );
    setLetterheadStatus(null);
  };

  const saveLetterheadDefaults = () => {
    const company = companies.find((item) => item.id === selectedCompanyId) || selectedCompany;
    const heading = company.legalName ?? company.name ?? "";
    if (!heading.trim()) {
      setLetterheadStatus({ type: "error", message: "Enter a company heading before saving the letterhead." });
      return;
    }

    const savedFields = {
      legalName: company.legalName || company.name,
      tagline: company.tagline || "",
      address: company.address || "",
      contact: company.contact || ""
    };
    const nextSavedDefaults = { ...savedLetterheadDefaults, [selectedCompanyId]: savedFields };

    try {
      localStorage.setItem(LETTERHEAD_STORAGE_KEY, JSON.stringify(nextSavedDefaults));
      setSavedLetterheadDefaults(nextSavedDefaults);
      setLetterheadOverrides((previous) => ({ ...previous, [selectedCompanyId]: savedFields }));
      setDirtyLetterheadCompanyIds((previous) => previous.filter((id) => id !== selectedCompanyId));
      setLetterheadStatus({ type: "success", message: `Letterhead saved as the default for ${company.name}.` });
    } catch (error) {
      console.error("Could not save memo letterhead defaults:", error);
      setLetterheadStatus({ type: "error", message: "Could not save letterhead defaults. Please try again." });
    }
  };

  const restoreLetterheadDefaults = () => {
    const nextSavedDefaults = { ...savedLetterheadDefaults };
    const nextOverrides = { ...letterheadOverrides };
    delete nextSavedDefaults[selectedCompanyId];
    delete nextOverrides[selectedCompanyId];

    try {
      localStorage.setItem(LETTERHEAD_STORAGE_KEY, JSON.stringify(nextSavedDefaults));
      setSavedLetterheadDefaults(nextSavedDefaults);
      setLetterheadOverrides(nextOverrides);
      setDirtyLetterheadCompanyIds((previous) => previous.filter((id) => id !== selectedCompanyId));
      setLetterheadStatus({ type: "success", message: `Original letterhead restored for ${selectedCompany.name}.` });
    } catch (error) {
      console.error("Could not restore memo letterhead defaults:", error);
      setLetterheadStatus({ type: "error", message: "Could not restore the original letterhead. Please try again." });
    }
  };

  // E-Signature Upload & Removal Handlers
  const handleSignatureUpload = async (event, setSignature, storageKey, roleLabel) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Signature image file should be under 2MB.");
      event.target.value = "";
      return;
    }

    let processedSignature;
    try {
      processedSignature = await processSignatureToTransparentPng(file);
    } catch (error) {
      console.error(`Error processing ${roleLabel.toLowerCase()} signature:`, error);
      alert("Could not convert this image into a transparent signature. Please try another PNG, JPG, or WebP image.");
      event.target.value = "";
      return;
    }

    setSignature(processedSignature);
    try {
      localStorage.setItem(storageKey, processedSignature);
    } catch (error) {
      console.error(`Could not save ${roleLabel.toLowerCase()} signature:`, error);
      alert("The signature was converted for this session but could not be saved for future use.");
    } finally {
      event.target.value = "";
    }
  };

  const handleUploadSignatorySignature = (event) =>
    handleSignatureUpload(event, setSignatorySignature, "hrhub_memo_signatory_signature", "Signatory");

  const handleRemoveSignatorySignature = () => {
    setSignatorySignature(null);
    try {
      localStorage.removeItem("hrhub_memo_signatory_signature");
    } catch {}
  };

  const handleUploadApproverSignature = (event) =>
    handleSignatureUpload(event, setApproverSignature, "hrhub_memo_approver_signature", "Approver");

  const handleRemoveApproverSignature = () => {
    setApproverSignature(null);
    try {
      localStorage.removeItem("hrhub_memo_approver_signature");
    } catch {}
  };

  // Save Memo to Records / Local Archive
  const handleSaveMemoToArchive = () => {
    const newMemo = {
      id: "memo_" + Date.now(),
      ref: distributionMemoRef,
      subject: memoSubject,
      date: memoDate,
      to: memoTo,
      from: memoFrom,
      category: memoCategory,
      content: memoContent,
      companyId: distributionCompany.id,
      companyName: distributionCompany.name,
      companyCode: distributionCompany.code,
      signatoryName,
      signatoryTitle,
      signatoryCompany: getSignatoryAffiliation(distributionCompany),
      approverName,
      approverTitle,
      signatoryLayout,
      savedAt: new Date().toISOString()
    };

    const updated = [newMemo, ...savedMemos.filter((m) => m.ref !== distributionMemoRef || m.companyId !== distributionCompany.id)];
    setSavedMemos(updated);
    try {
      localStorage.setItem("hrhub_saved_memos_archive", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save memo archive to localStorage:", e);
    }
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3500);
  };

  // Delete saved memo
  const handleDeleteSavedMemo = (id) => {
    const filtered = savedMemos.filter((m) => m.id !== id);
    setSavedMemos(filtered);
    try {
      localStorage.setItem("hrhub_saved_memos_archive", JSON.stringify(filtered));
    } catch (e) {
      console.error("Failed to save after deletion", e);
    }
  };

  // Load saved memo into current editor
  const handleLoadSavedMemo = (m) => {
    const memoCompany = COMPANIES.find((company) => company.id === m.companyId) || selectedCompany;
    if (m.companyId) setSelectedCompanyId(memoCompany.id);
    if (m.ref) setMemoRef(m.ref);
    if (m.date) setMemoDate(m.date);
    if (m.to) setMemoTo(m.to);
    if (m.from) setMemoFrom(m.from);
    if (m.subject) setMemoSubject(m.subject);
    if (m.category) setMemoCategory(m.category);
    if (m.content) setMemoContent(m.content);
    if (m.signatoryName) setSignatoryName(m.signatoryName);
    if (m.signatoryTitle) setSignatoryTitle(m.signatoryTitle);
    setSignatoryCompany(resolveSignatoryAffiliation(memoCompany, m.signatoryCompany));
    if (m.approverName) setApproverName(m.approverName);
    if (m.approverTitle) setApproverTitle(m.approverTitle);
    if (m.signatoryLayout) setSignatoryLayout(m.signatoryLayout);
    setArchiveModalOpen(false);
    setCurrentStep(4);
  };

  // Copy plain formatted memo text for clipboard
  const handleCopyMemoText = () => {
    const fullText = `=====================================================
${distributionCompany.legalName || distributionCompany.name}
${distributionCompany.tagline || ""}
${distributionCompany.address}
${distributionCompany.contact}
=====================================================
MEMORANDUM

MEMO REF:       ${distributionMemoRef}
DATE:           ${memoDate}
TO:             ${memoTo}
FROM:           ${memoFrom}
SUBJECT:        ${memoSubject}
CLASSIFICATION: ${memoCategory}
-----------------------------------------------------

${memoContent}

-----------------------------------------------------
ISSUED BY:
${signatoryName}
${signatoryTitle}
${getSignatoryAffiliation(distributionCompany)}

${signatoryLayout === "dual" ? `NOTED & APPROVED BY:
${approverName}
${approverTitle}
${distributionCompany.legalName || distributionCompany.name}
 ` : ""}=====================================================`;

    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 3000);
    });
  };

  // Email & PDF Generators (Company-Tailored)
  const generateEmailBody = (targetComp = distributionCompany) => {
    const comp = targetComp || distributionCompany;
    const compMemoRef = `MEMO-2026-${comp.code}-${memoRef.split("-").pop() || "001"}`;
    const compLegal = comp.legalName || comp.name;

    return `Dear Team,

Please see the Official Memorandum issued by ${comp.name}.

${compLegal}
${comp.tagline || ""}
${comp.address || ""}
${comp.contact || ""}

--------------------------------------------------
MEMORANDUM DETAILS:
Ref Number: ${compMemoRef}
Date: ${memoDate}
To: ${memoTo}
From: ${memoFrom} (HR Dispatch: ${HR_OFFICIAL_EMAIL})
Subject: ${memoSubject}
Classification: ${memoCategory}
--------------------------------------------------

MEMORANDUM DIRECTIVES:
${memoContent}

--------------------------------------------------
ISSUED BY:
${signatoryName}
${signatoryTitle}
${getSignatoryAffiliation(comp)}

${signatoryLayout === "dual" ? `NOTED & APPROVED BY:
${approverName}
${approverTitle}
${compLegal}
` : ""}
Please acknowledge receipt of this memorandum. Official PDF is attached.

Office of the Human Resources & Corporate Administration
${compLegal}
HR Contact: ${HR_OFFICIAL_EMAIL}`;
  };

  const generateCompanyEmailHtml = (targetComp = distributionCompany) => {
    const comp = targetComp || distributionCompany;
    const compMemoRef = `MEMO-2026-${comp.code}-${memoRef.split("-").pop() || "001"}`;
    const compLegal = comp.legalName || comp.name;
    const accentColor = comp.accentColor || "#059669";

    // Category badge color accents
    let catBadgeBg = "#ecfdf5";
    let catBadgeColor = "#065f46";
    let catBadgeBorder = "#a7f3d0";
    if (memoCategory === "Mandatory Compliance") {
      catBadgeBg = "#fef2f2";
      catBadgeColor = "#991b1b";
      catBadgeBorder = "#fecaca";
    } else if (memoCategory === "Executive Order") {
      catBadgeBg = "#eff6ff";
      catBadgeColor = "#1e40af";
      catBadgeBorder = "#bfdbfe";
    } else if (memoCategory === "Safety & Health") {
      catBadgeBg = "#fffbeb";
      catBadgeColor = "#92400e";
      catBadgeBorder = "#fde68a";
    }

    return `<div style="background-color: #f1f5f9; padding: 32px 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.9); position: relative;">
    
    <!-- Top Modern Gradient Header Accent -->
    <div style="height: 7px; background: linear-gradient(90deg, ${accentColor} 0%, #0d9488 40%, #0284c7 80%, #6366f1 100%);"></div>

    <!-- Executive Letterhead Banner with Left Company Logo & Right Corporate Group Emblem -->
    <div style="padding: 24px 30px 18px 30px; background: linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%); border-bottom: 1px solid #f1f5f9;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <!-- Left: Company Logo -->
          <td style="width: 75px; vertical-align: middle; text-align: center; padding-right: 12px;">
            ${(companyLogoDataMap[comp.id] || comp.logoUrl) ? `
              <img src="${companyLogoDataMap[comp.id] || comp.logoUrl}" style="max-height: 64px; max-width: 75px; display: block; margin: 0 auto; object-fit: contain;" alt="${escapeHtml(comp.name)} Logo">
            ` : ""}
          </td>

          <!-- Center: Corporate Entity Details -->
          <td style="vertical-align: middle; text-align: center; padding: 0 4px;">
            <div style="margin-bottom: 6px;">
              <span style="display: inline-block; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${accentColor}; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 2px 10px; border-radius: 9999px;">
                ★ OFFICIAL HR ADMINISTRATIVE TRANSMISSION ★
              </span>
            </div>
            <h1 style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.2;">
              ${escapeHtml(compLegal)}
            </h1>
            ${comp.tagline ? `<p style="margin: 2px 0 0 0; color: ${accentColor}; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px;">${escapeHtml(comp.tagline)}</p>` : ""}
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 10px; line-height: 1.35;">${escapeHtml(comp.address || "")}</p>
            <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 9.5px; font-family: monospace;">${escapeHtml(comp.contact || "")}</p>
          </td>

          <!-- Right: Corporate Group Emblem -->
          <td style="width: 75px; vertical-align: middle; text-align: center; padding-left: 12px;">
            ${(groupEmblemDataUrl || comp.rightLogoUrl || CORPORATE_GROUP_EMBLEM) ? `
              <img src="${groupEmblemDataUrl || comp.rightLogoUrl || CORPORATE_GROUP_EMBLEM}" style="max-height: 58px; max-width: 68px; display: block; margin: 0 auto; object-fit: contain; border-radius: 4px;" alt="Corporate Emblem">
            ` : ""}
          </td>
        </tr>
      </table>
    </div>

    <!-- Sleek Memorandum Ribbon -->
    <div style="background: #0f172a; color: #ffffff; padding: 12px 36px; border-top: 1px solid rgba(255,255,255,0.1);">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 14px; font-weight: 900; letter-spacing: 3px; color: #ffffff; text-transform: uppercase; vertical-align: middle;">
            MEMORANDUM
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <span style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; padding: 4px 12px; border-radius: 8px; font-family: monospace; font-size: 11.5px; font-weight: 800; color: #6ee7b7; letter-spacing: 0.5px;">
              REF: ${compMemoRef}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Metadata Matrix (Executive Summary Grid) -->
    <div style="padding: 24px 36px 14px 36px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px 20px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 800; width: 90px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px;">DATE:</td>
            <td style="padding: 6px 0; color: #0f172a; font-weight: 800; font-size: 12.5px;">${memoDate}</td>
            <td style="padding: 6px 0; color: #64748b; font-weight: 800; width: 110px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px;">CLASSIFICATION:</td>
            <td style="padding: 6px 0;">
              <span style="background: ${catBadgeBg}; color: ${catBadgeColor}; border: 1px solid ${catBadgeBorder}; font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 6px; text-transform: uppercase;">
                ${memoCategory}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 800; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px;">TO:</td>
            <td colspan="3" style="padding: 6px 0; color: #0f172a; font-weight: 800; font-size: 12.5px; letter-spacing: 0.2px;">${memoTo}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b; font-weight: 800; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px;">FROM:</td>
            <td colspan="3" style="padding: 6px 0; color: #0f172a; font-weight: 800; font-size: 12.5px;">
              ${memoFrom} <span style="font-weight: 600; color: #64748b; font-size: 11px;">(${HR_OFFICIAL_EMAIL})</span>
            </td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 10px 0 2px 0; border-top: 1px dashed #cbd5e1;">
              <div style="display: table; width: 100%;">
                <span style="display: table-cell; color: #64748b; font-weight: 800; font-size: 10.5px; text-transform: uppercase; width: 90px; vertical-align: top; padding-top: 2px;">SUBJECT:</span>
                <span style="display: table-cell; color: ${accentColor}; font-size: 13.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.4;">
                  ${memoSubject}
                </span>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Directives / Body Content with Company Logo Watermark Backdrop (Safe for all email clients) -->
    <div style="padding: 10px 36px 20px 36px;">
      <div style="background-color: #ffffff; ${fadedWatermarkMap[comp.id] ? `background-image: url('${fadedWatermarkMap[comp.id]}'); background-repeat: no-repeat; background-position: center center; background-size: 280px auto;` : ''} border-left: 4px solid ${accentColor}; padding: 22px 24px; border-radius: 0 12px 12px 0; border: 1px solid #e2e8f0; border-left: 4px solid ${accentColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
        <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">
          OFFICIAL DIRECTIVES &amp; PROVISIONS:
        </p>
        <div style="color: #0f172a; font-size: 13.5px; line-height: 1.8; text-align: justify; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
${memoContent.replace(/\n/g, "<br>")}
        </div>
      </div>
    </div>

    <!-- Attached PDF Callout Card -->
    <div style="margin: 0 36px 20px 36px; background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 12px 18px; box-shadow: 0 2px 8px rgba(16,185,129,0.06);">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 32px; vertical-align: middle; font-size: 22px;">📄</td>
          <td style="vertical-align: middle;">
            <p style="margin: 0; font-size: 12px; font-weight: 900; color: #064e3b; letter-spacing: 0.2px;">
              Official PDF Memorandum Document Attached
            </p>
            <p style="margin: 2px 0 0 0; font-size: 10.5px; color: #047857;">
              Attached File: <strong style="font-family: monospace; color: #065f46;">${compMemoRef} - ${comp.name}.pdf</strong> • Includes Official Corporate Watermark &amp; E-Signatures
            </p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Signatories & Executive Verification Block -->
    <div style="padding: 22px 36px 26px 36px; border-top: 1px solid #f1f5f9; background: #fafbfc;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 18px;">
            <p style="margin: 0; color: #64748b; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">ISSUED BY:</p>
            <div style="height: 52px; display: flex; align-items: flex-end; margin-bottom: 4px;">
              ${signatorySignature ? `<img src="${signatorySignature}" style="max-height: 50px; max-width: 170px; display: block;" alt="Signatory Signature">` : '<div style="height: 38px;"></div>'}
            </div>
            <div style="border-bottom: 2px solid #0f172a; width: 190px; margin: 4px 0 6px 0;"></div>
            <p style="margin: 0; font-weight: 900; color: #0f172a; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.2px;">${signatoryName}</p>
            <p style="margin: 2px 0 0 0; color: #475569; font-size: 11px; font-weight: 600;">${signatoryTitle}</p>
            <p style="margin: 1px 0 0 0; color: ${accentColor}; font-size: 10px; font-weight: 700;">${getSignatoryAffiliation(comp)}</p>
          </td>
          ${signatoryLayout === "dual" ? `
          <td style="width: 50%; vertical-align: top; padding-left: 18px;">
            <p style="margin: 0; color: #64748b; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">NOTED &amp; APPROVED BY:</p>
            <div style="height: 52px; display: flex; align-items: flex-end; margin-bottom: 4px;">
              ${approverSignature ? `<img src="${approverSignature}" style="max-height: 50px; max-width: 170px; display: block;" alt="Approver Signature">` : '<div style="height: 38px;"></div>'}
            </div>
            <div style="border-bottom: 2px solid #0f172a; width: 190px; margin: 4px 0 6px 0;"></div>
            <p style="margin: 0; font-weight: 900; color: #0f172a; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.2px;">${approverName}</p>
            <p style="margin: 2px 0 0 0; color: #475569; font-size: 11px; font-weight: 600;">${approverTitle}</p>
            <p style="margin: 1px 0 0 0; color: #64748b; font-size: 10px; font-weight: 700;">${compLegal}</p>
          </td>` : ""}
        </tr>
      </table>
    </div>

    <!-- Official Security & Support Footer -->
    <div style="background-color: #090d16; color: #94a3b8; padding: 20px 36px; text-align: center; font-size: 9.5px; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.08);">
      <div style="display: inline-block; margin-bottom: 6px;">
        <span style="background: rgba(255,255,255,0.08); color: #e2e8f0; font-weight: 800; font-size: 9px; padding: 2px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 1px;">
          HR MANAGEMENT &amp; CORPORATE GOVERNANCE DIVISION
        </span>
      </div>
      <p style="margin: 4px 0 0 0; color: #cbd5e1; font-weight: 600;">
        Official administrative notice issued on behalf of <strong>${comp.name}</strong>.
      </p>
      <p style="margin: 4px 0 0 0; color: #64748b; font-size: 9px;">
        Strict compliance mandated for all concerned personnel • HR Inquiries &amp; Submissions: <a href="mailto:${HR_OFFICIAL_EMAIL}" style="color: #34d399; text-decoration: none; font-weight: bold;">${HR_OFFICIAL_EMAIL}</a>
      </p>
      <p style="margin: 6px 0 0 0; color: #475569; font-size: 8.5px; font-family: monospace;">
        CONFIDENTIALITY NOTICE: This transmission is intended solely for the designated addressee(s).
      </p>
    </div>

  </div>
</div>`;
  };

  /**
   * Dynamic calculation to ensure the memorandum fits seamlessly on 1 sheet of bond paper.
   * If text is long, automatically switches to Long Bond Paper (8.5 x 13 in / Folio)
   * and compacts typography and margins so header, metadata, directives, signatures, and footer
   * fit effortlessly without splitting to a 2nd page.
   */
  const getMemoFitMetrics = (content = memoContent) => {
    const text = (content || "").trim();
    const charLen = text.length;
    const lineCount = text.split(/\r?\n/).length;

    // Auto-detection rules:
    // Long Bond Paper needed when content exceeds ~1250 chars or > 20 lines
    const isLongPaper = charLen > 1250 || lineCount > 20;
    const isCompact = charLen > 700 || lineCount > 13;

    return {
      isLongPaper,
      isCompact,
      paperSize: isLongPaper ? "8.5in 13in" : "A4 portrait",
      paperLabel: isLongPaper ? "Long Bond Paper (8.5 x 13 in)" : "Standard Bond Paper (A4 / Short)",
      pageMargin: isLongPaper ? "2mm 6mm 3mm 6mm" : (isCompact ? "2mm 8mm 3mm 8mm" : "3mm 10mm 4mm 10mm"),
      containerPadding: isLongPaper ? "6px 20px 10px 20px" : (isCompact ? "6px 22px 10px 22px" : "10px 26px 14px 26px"),
      topAccentHeight: "5px",
      headerMarginBottom: isCompact ? "8px" : "14px",
      headerPaddingBottom: isCompact ? "8px" : "12px",
      titleFontSize: isCompact ? "17pt" : "19pt",
      bannerPadding: isCompact ? "5px 12px" : "7px 16px",
      bannerFontSize: isCompact ? "11.5pt" : "13pt",
      tableMarginBottom: isCompact ? "8px" : "14px",
      tableCellPadding: isCompact ? "3.5px 8px" : "5.5px 10px",
      tableFontSize: isCompact ? "8.5pt" : "9.5pt",
      bodyFontSize: isLongPaper ? "9.5pt" : (isCompact ? "9.5pt" : "10.5pt"),
      bodyLineHeight: isLongPaper ? "1.52" : (isCompact ? "1.52" : "1.72"),
      bodyMarginBottom: isCompact ? "12px" : "20px",
      bodyMinHeight: isLongPaper ? "380px" : (isCompact ? "200px" : "260px"),
      sigHeight: isCompact ? "36px" : "48px",
      sigMarginTop: isCompact ? "12px" : "20px",
      footerMarginTop: isCompact ? "12px" : "22px",
      footerPaddingTop: isCompact ? "6px" : "10px",
      watermarkFontSize: isLongPaper ? "50pt" : (isCompact ? "42pt" : "46pt"),
    };
  };

  const generateCompanyPrintHtml = (targetComp = distributionCompany) => {
    const comp = targetComp || distributionCompany;
    const addrLines = formatAddressLines(escapeHtml(comp.address || ""));
    const addressHtml = addrLines.length > 1
      ? `${addrLines[0]}<br>${addrLines[1]}`
      : addrLines[0];
    const compMemoRef = `MEMO-2026-${comp.code}-${memoRef.split("-").pop() || "001"}`;
    const compLegal = comp.legalName || comp.name;
    const accentColor = comp.accentColor || "#059669";
    const metrics = getMemoFitMetrics(memoContent);

    return `
      <div style="position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 780px; margin: 0 auto; padding: ${metrics.containerPadding}; color: #0f172a; background: #ffffff; box-sizing: border-box; overflow: hidden; page-break-inside: avoid; break-inside: avoid; min-height: ${metrics.isLongPaper ? '1180px' : '980px'}; display: flex; flex-direction: column; justify-content: space-between;">
        
        <!-- ================= COMPANY-SPECIFIC EXECUTIVE WATERMARK LAYER ================= -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${watermarkSize}px; height: ${watermarkSize}px; pointer-events: none; z-index: 0; user-select: none; display: flex; align-items: center; justify-content: center; opacity: ${watermarkOpacity / 100};">
          <img src="${companyLogoDataMap[comp.id] || comp.logoUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: grayscale(15%);" alt="${comp.name} Watermark" />
        </div>

        ${showDiagonalStamp ? `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); pointer-events: none; z-index: 1; white-space: nowrap; border: 3px dashed rgba(225, 29, 72, 0.22); color: rgba(225, 29, 72, 0.22); font-weight: 900; font-size: 18pt; padding: 10px 32px; letter-spacing: 5px; text-transform: uppercase;">
          ${escapeHtml(diagonalStampText)}
        </div>` : ""}

        <!-- Foreground Official Content (Flush top, flexible middle, sagad sa baba footer) -->
        <div style="position: relative; z-index: 10; display: flex; flex-direction: column; justify-content: space-between; flex: 1; height: 100%;">
          
          <!-- Top Section: Accent Bar + Header + Banner + Metadata Table + Directives -->
          <div style="display: flex; flex-direction: column; flex: 1;">
            <!-- Top Accent Border Line - Sagad sa taas -->
            <div style="height: ${metrics.topAccentHeight}; background: linear-gradient(90deg, ${accentColor} 0%, #0d9488 50%, #0284c7 100%); margin-bottom: ${metrics.headerMarginBottom}; border-radius: 2px;"></div>

            <!-- Official Executive Letterhead (Left Company Logo, Center Info, Right Corporate Emblem) -->
            <div style="border-bottom: 2px solid ${accentColor}; padding-bottom: ${metrics.headerPaddingBottom}; margin-bottom: ${metrics.headerMarginBottom};">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <!-- Left: Company Logo -->
                  <td style="width: 72px; vertical-align: middle; text-align: left;">
                    ${(companyLogoDataMap[comp.id] || comp.logoUrl) ? `
                      <img src="${companyLogoDataMap[comp.id] || comp.logoUrl}" style="max-height: 56px; max-width: 70px; display: block; object-fit: contain;" alt="${escapeHtml(comp.name)} Logo">
                    ` : ""}
                  </td>

                  <!-- Center: Corporate Entity Details -->
                  <td style="vertical-align: middle; text-align: center; padding: 0 8px;">
                    <div style="display: inline-block; font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: ${accentColor}; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 1px 8px; border-radius: 9999px; margin-bottom: 2px;">
                      OFFICIAL CORPORATE MEMORANDUM
                    </div>
                    <h1 style="font-size: ${metrics.titleFontSize}; font-weight: 900; margin: 0; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.15;">
                      ${escapeHtml(compLegal)}
                    </h1>
                    ${comp.tagline ? `<div style="font-size: 8.5pt; color: ${accentColor}; font-weight: 800; margin-top: 1px; letter-spacing: 0.3px;">${escapeHtml(comp.tagline)}</div>` : ""}
                    <div style="font-size: 8pt; color: #475569; margin-top: 2px; line-height: 1.3;">${addressHtml}</div>
                    <div style="font-size: 7.5pt; color: #64748b; margin-top: 1px; font-family: monospace;">${escapeHtml(comp.contact || "")}</div>
                  </td>

                  <!-- Right: Corporate Group Emblem -->
                  <td style="width: 72px; vertical-align: middle; text-align: right;">
                    ${(groupEmblemDataUrl || comp.rightLogoUrl || CORPORATE_GROUP_EMBLEM) ? `
                      <img src="${groupEmblemDataUrl || comp.rightLogoUrl || CORPORATE_GROUP_EMBLEM}" style="max-height: 52px; max-width: 65px; display: inline-block; object-fit: contain; border-radius: 4px;" alt="Corporate Group Emblem">
                    ` : ""}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Memorandum Dark Banner Bar -->
            <table style="width: 100%; border-collapse: collapse; background: #0f172a; border-radius: 4px; margin-bottom: ${metrics.tableMarginBottom};">
              <tr>
                <td style="padding: ${metrics.bannerPadding}; font-weight: 900; font-size: ${metrics.bannerFontSize}; letter-spacing: 3px; color: #ffffff; text-transform: uppercase;">
                  MEMORANDUM
                </td>
                <td style="padding: ${metrics.bannerPadding}; text-align: right;">
                  <span style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; padding: 2px 8px; border-radius: 4px; font-family: monospace; font-size: 9.5pt; font-weight: 900; color: #6ee7b7; letter-spacing: 0.5px;">
                    REF: ${compMemoRef}
                  </span>
                </td>
              </tr>
            </table>

            <!-- Metadata Matrix Grid -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: ${metrics.tableMarginBottom}; font-size: ${metrics.tableFontSize}; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
              <tr>
                <td style="padding: ${metrics.tableCellPadding}; font-weight: 900; width: 95px; color: #475569; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px;">DATE:</td>
                <td style="padding: ${metrics.tableCellPadding}; font-weight: 800; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-size: 9pt;">${memoDate}</td>
                <td style="padding: ${metrics.tableCellPadding}; font-weight: 900; width: 105px; color: #475569; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px;">CLASSIFICATION:</td>
                <td style="padding: ${metrics.tableCellPadding}; font-weight: 800; color: ${accentColor}; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; text-transform: uppercase;">
                  ${memoCategory}
                </td>
              </tr>
              <tr>
                <td style="padding: ${metrics.tableCellPadding}; font-weight: 900; color: #475569; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px;">TO:</td>
                <td colspan="3" style="padding: ${metrics.tableCellPadding}; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-weight: 800; font-size: 9pt;">${memoTo}</td>
              </tr>
              <tr>
                <td style="padding: ${metrics.tableCellPadding}; font-weight: 900; color: #475569; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px;">FROM:</td>
                <td colspan="3" style="padding: ${metrics.tableCellPadding}; color: #0f172a; border-bottom: 1px solid #e2e8f0; font-weight: 800; font-size: 9pt;">${memoFrom}</td>
              </tr>
              <tr>
                <td style="padding: ${metrics.tableCellPadding}; font-weight: 900; color: #475569; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px;">SUBJECT:</td>
                <td colspan="3" style="padding: ${metrics.tableCellPadding}; font-weight: 900; color: ${accentColor}; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.3px;">
                  ${memoSubject}
                </td>
              </tr>
            </table>

            <!-- Directives Body Content -->
            <div style="font-size: ${metrics.bodyFontSize}; line-height: ${metrics.bodyLineHeight}; color: #1e293b; margin-bottom: ${metrics.bodyMarginBottom}; text-align: justify; white-space: pre-wrap; flex: 1; padding: 0 2px;">
${memoContent}
            </div>
          </div>

          <!-- Bottom Section: Signatories + Footer - Sagad sa baba -->
          <div style="margin-top: auto; padding-top: ${metrics.sigMarginTop};">
            <!-- Signatory Sign-off Block -->
            <table style="width: 100%; border-collapse: collapse; font-size: 9.5pt; page-break-inside: avoid; break-inside: avoid; margin-bottom: ${metrics.footerMarginTop};">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 18px;">
                  <p style="margin: 0; color: #64748b; font-size: 8pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">ISSUED BY:</p>
                  <div style="height: ${metrics.sigHeight}; display: flex; align-items: flex-end; margin-bottom: 2px;">
                    ${signatorySignature ? `<img src="${signatorySignature}" style="max-height: ${metrics.sigHeight}; max-width: 170px; display: block;" alt="Signatory Signature">` : '<div style="height: 30px;"></div>'}
                  </div>
                  <div style="border-bottom: 2px solid #0f172a; width: 190px; margin: 3px 0 4px 0;"></div>
                  <p style="margin: 0; font-weight: 900; color: #0f172a; font-size: 10.5pt; text-transform: uppercase; letter-spacing: 0.2px;">${signatoryName}</p>
                  <p style="margin: 1px 0 0 0; color: #475569; font-size: 9pt; font-weight: 600;">${signatoryTitle}</p>
                  <p style="margin: 1px 0 0 0; color: ${accentColor}; font-weight: 700; font-size: 8.5pt;">${getSignatoryAffiliation(comp)}</p>
                </td>
                ${signatoryLayout === "dual" ? `
                <td style="width: 50%; vertical-align: top; padding-left: 18px;">
                  <p style="margin: 0; color: #64748b; font-size: 8pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px;">NOTED &amp; APPROVED BY:</p>
                  <div style="height: ${metrics.sigHeight}; display: flex; align-items: flex-end; margin-bottom: 2px;">
                    ${approverSignature ? `<img src="${approverSignature}" style="max-height: ${metrics.sigHeight}; max-width: 170px; display: block;" alt="Approver Signature">` : '<div style="height: 30px;"></div>'}
                  </div>
                  <div style="border-bottom: 2px solid #0f172a; width: 190px; margin: 3px 0 4px 0;"></div>
                  <p style="margin: 0; font-weight: 900; color: #0f172a; font-size: 10.5pt; text-transform: uppercase; letter-spacing: 0.2px;">${approverName}</p>
                  <p style="margin: 1px 0 0 0; color: #475569; font-size: 9pt; font-weight: 600;">${approverTitle}</p>
                  <p style="margin: 1px 0 0 0; color: #64748b; font-weight: 700; font-size: 8.5pt;">${compLegal}</p>
                </td>` : ""}
              </tr>
            </table>

            <!-- Print & Archival Official Footer -->
            <div style="padding-top: ${metrics.footerPaddingTop}; border-top: 1px solid #cbd5e1; text-align: center; font-size: 7.5pt; color: #94a3b8; font-weight: 600; page-break-inside: avoid; break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span>OFFICE OF THE HUMAN RESOURCES &amp; ADMINISTRATION</span>
                <span style="font-weight: 900; color: #0f172a;">STRICT COMPLIANCE MANDATED</span>
                <span>${comp.code} • OFFICIAL TRANSMISSION</span>
              </div>
              <div style="letter-spacing: 0.4px;">
                Official Administrative Record • HR Helpdesk: <span style="font-family: monospace; color: #059669;">${HR_OFFICIAL_EMAIL}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  };

  // Direct Send to Personnel via configured Google Apps Script Webhook
  const handleSendDirect = async () => {
    const effectiveUrl = (customWebhookUrl || "").trim();
    if (!effectiveUrl) {
      setShowScriptGuideModal(true);
      return;
    }

    setIsSendingDirect(true);
    setDirectSendStatus(null);
    const metrics = getMemoFitMetrics(memoContent);

    // Build segregated packages for active companies that have recipients
    const dispatchesPayload = companyDispatches
      .filter((d) => d.recipients.length > 0)
      .map((d) => {
        const comp = companies.find((c) => c.id === d.companyId) || distributionCompany;
        return {
          companyId: d.companyId,
          companyName: d.companyName,
          legalName: d.legalName,
          code: d.code,
          memoRef: d.memoRef,
          recipients: d.recipients,
          subject: `[OFFICIAL MEMO] ${d.memoRef}: ${memoSubject} - ${d.companyName}`,
          htmlBody: generateCompanyEmailHtml(comp),
          pdfHtml: generateCompanyPrintHtml(comp),
          body: generateEmailBody(comp),
          senderEmail: HR_OFFICIAL_EMAIL,
          isLongPaper: metrics.isLongPaper,
          paperSize: metrics.paperSize
        };
      });

    if (dispatchesPayload.length === 0) {
      setDirectSendStatus({
        type: "error",
        message: "Walang pre-registered employee work email na naka-link para sa mga aktibong kumpanya. Naka-block ang pag-dispatch."
      });
      setIsSendingDirect(false);
      setUnlinkedNoticeModalOpen(true);
      return;
    }

    const payload = {
      action: "dispatch_company_memos",
      senderEmail: HR_OFFICIAL_EMAIL,
      totalCompanies: dispatchesPayload.length,
      totalRecipients: totalCompanyRecipients,
      isLongPaper: metrics.isLongPaper,
      paperSize: metrics.paperSize,
      dispatches: dispatchesPayload
    };

    try {
      await fetch(effectiveUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      setDirectSendStatus({
        type: "success",
        message: `Memo & PDF (${metrics.paperLabel}) successfully dispatched to ${totalCompanyRecipients} personnel across ${dispatchesPayload.length} company entities via ${HR_OFFICIAL_EMAIL}!`
      });

      setTimeout(() => {
        setEmailModalOpen(false);
        setDirectSendStatus(null);
      }, 3500);
    } catch (err) {
      console.error("Direct dispatch error:", err);
      setDirectSendStatus({
        type: "error",
        message: "Failed to dispatch via Google Apps Script: " + (err.message || "Connection issue")
      });
    } finally {
      setIsSendingDirect(false);
    }
  };

  const handleSendViaGmailWeb = () => {
    const toParam = recipientEmails.join(",");
    const subjectParam = `[OFFICIAL MEMO] ${distributionMemoRef}: ${memoSubject} - ${distributionCompany.name}`;
    const bodyText = generateEmailBody();
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toParam)}&su=${encodeURIComponent(subjectParam)}&body=${encodeURIComponent(bodyText)}`;
    window.open(gmailUrl, "_blank");
    setEmailModalOpen(false);
  };

  const handleSendViaEmailClient = () => {
    const toParam = recipientEmails.join(",");
    const subjectParam = encodeURIComponent(`[OFFICIAL MEMO] ${distributionMemoRef}: ${memoSubject} - ${distributionCompany.name}`);
    const bodyText = generateEmailBody();
    const bodyParam = encodeURIComponent(bodyText);
    const mailtoUrl = `mailto:${toParam}?subject=${subjectParam}&body=${bodyParam}`;
    window.location.href = mailtoUrl;
    setEmailModalOpen(false);
  };

  // Print Document with embedded CSS to preserve watermark, page breaks, and exact 1-page paper dimensions
  const handlePrintMemo = (targetCompany = null) => {
    const printWindow = window.open("", "_blank", "width=920,height=1100");
    if (!printWindow) {
      window.print();
      return;
    }

    const metrics = getMemoFitMetrics(memoContent);

    const companiesToPrint = targetCompany && targetCompany !== "all"
      ? [typeof targetCompany === "string" ? (companies.find((company) => company.id === targetCompany) || companies[0]) : targetCompany]
      : activeCompanies;

    const sheetsHtml = companiesToPrint.map((comp, idx) => {
      return generateCompanyPrintHtml(comp);
    }).join(companiesToPrint.length > 1 ? '<div style="page-break-after: always; break-after: page;"></div>' : "");

    const printHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${memoRef} - ${memoSubject} (${metrics.paperLabel})</title>
  <style>
    @page {
      size: ${metrics.paperSize};
      margin: ${metrics.pageMargin};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      margin: 0;
      line-height: 1.5;
    }
    @media print {
      body {
        padding: 0 !important;
        margin: 0 !important;
      }
    }
  </style>
</head>
<body>
  ${sheetsHtml}
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  };

  // High-Resolution Image Generation & Clipboard Copying (for chat apps: Viber, Messenger, Telegram, WhatsApp, Gmail)
  const handleCopyMemoAsImage = async (company) => {
    const sheetEl = document.getElementById(`memo-sheet-preview-${company.id}`);
    if (!sheetEl) return;

    try {
      setCopyingImageId(company.id);
      const canvas = await html2canvas(sheetEl, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          throw new Error("Canvas blob conversion failed");
        }
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            const item = new ClipboardItem({ "image/png": blob });
            await navigator.clipboard.write([item]);
            setCopiedImageId(company.id);
            setTimeout(() => setCopiedImageId(null), 3500);
          } else {
            handleDownloadMemoImage(company);
          }
        } catch (clipErr) {
          console.warn("Direct clipboard write fallback to download:", clipErr);
          handleDownloadMemoImage(company);
        } finally {
          setCopyingImageId(null);
        }
      }, "image/png", 1.0);
    } catch (err) {
      console.error("Failed to copy memo image:", err);
      setCopyingImageId(null);
    }
  };

  const handleDownloadMemoImage = async (company) => {
    const sheetEl = document.getElementById(`memo-sheet-preview-${company.id}`);
    if (!sheetEl) return;

    try {
      setCopyingImageId(company.id);
      const canvas = await html2canvas(sheetEl, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const compMemoRef = `MEMO-2026-${company.code}-${memoRef.split("-").pop() || "001"}`;
      const link = document.createElement("a");
      link.download = `${compMemoRef} - ${company.name}.png`;
      link.href = dataUrl;
      link.click();
      setCopiedImageId(company.id);
      setTimeout(() => setCopiedImageId(null), 3500);
    } catch (err) {
      console.error("Failed to download memo image:", err);
    } finally {
      setCopyingImageId(null);
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-emerald-200/80 bg-white shadow-xl animate-in fade-in duration-200">
      {/* 1. EXECUTIVE TOP COMMAND BAR (Green & White Concept) */}
      <div className="border-b border-emerald-950 bg-[#06281f] px-6 py-4 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  Corporate Governance
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-400/30">
                  Green &amp; White Executive Edition
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white sm:text-xl">
                Official Company Memorandum
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Saved Memos Archive Button */}
            <button
              type="button"
              onClick={() => setArchiveModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-900/40 px-3.5 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-800/60 hover:text-white transition cursor-pointer"
              title="View previously saved memorandums"
            >
              <Archive size={14} className="text-emerald-400" />
              <span>Saved Records ({savedMemos.length})</span>
            </button>

            {onOpenAiBuddy && (
              <button
                type="button"
                onClick={onOpenAiBuddy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-3.5 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 hover:text-white transition shadow-sm cursor-pointer"
                title="Ask HrHub AI Buddy for advice"
              >
                <Sparkles size={14} className="text-emerald-300 animate-pulse" />
                <span>AI Buddy</span>
              </button>
            )}

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-emerald-300 hover:bg-white/10 hover:text-white transition ml-1"
                title="Close panel"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MODERN 4-STEP WIZARD NAVIGATION BAR (Green & White) */}
      <div className="border-b border-emerald-100 bg-emerald-50/40 px-6 py-3.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {[
            {
              step: 1,
              title: "1. Header & Addressing",
              desc: "TO, FROM, Date, Subject",
              icon: FileText
            },
            {
              step: 2,
              title: "2. Directives Body",
              desc: "Spacious Canvas & AI Draft",
              icon: Sparkles
            },
            {
              step: 3,
              title: "3. Signatories",
              desc: "HRMD Manager & Approver",
              icon: PenTool
            },
            {
              step: 4,
              title: "4. Final Memo & Distribution",
              desc: "Multi-Company, Save & Email",
              icon: Building2
            }
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;

            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setCurrentStep(item.step)}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                  isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-400/40"
                    : isCompleted
                    ? "bg-white border-emerald-300 text-slate-900 hover:border-emerald-500 hover:bg-emerald-50/50"
                    : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50/20"
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs transition ${
                    isActive
                      ? "bg-white text-emerald-800 shadow-xs"
                      : isCompleted
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {isCompleted ? <Check size={16} className="stroke-[3]" /> : item.step}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-black truncate leading-tight ${isActive ? "text-white" : "text-slate-900"}`}>
                    {item.title}
                  </div>
                  <div className={`text-[10px] font-semibold truncate mt-0.5 ${isActive ? "text-emerald-100" : "text-slate-500"}`}>
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Notification Banners */}
      {saveSuccessNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-900 font-bold animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Official Memorandum saved to Records Archive successfully! ({distributionMemoRef})</span>
          </div>
          <button
            type="button"
            onClick={() => setArchiveModalOpen(true)}
            className="text-emerald-700 underline hover:text-emerald-950 font-extrabold cursor-pointer"
          >
            View Saved Archive
          </button>
        </div>
      )}
      {/* 3. STEP CONTENT BODY */}
      <div className="p-6 bg-slate-50/70 min-h-[580px]">
        {/* ================= STEP 1: HEADER & ADDRESSING ================= */}
        {currentStep === 1 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
            {/* Step 1 Introduction Card */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Step 1: Input Memorandum Header &amp; Routing Details
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Enter the TO, FROM, date, and subject. The system automatically analyzes the <strong>classification badge</strong> based on the subject.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-center px-3 py-1 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black uppercase tracking-wider">
                Step 1 of 4
              </span>
            </div>

            {/* Main Header Input Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <section
                aria-labelledby="letterhead-defaults-title"
                className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h5 id="letterhead-defaults-title" className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Letterhead Defaults
                    </h5>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                      Edit this company’s letterhead for memo previews, print, and email. Save as default to reuse it; recipient lists and logos stay unchanged.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                    {selectedCompany.code}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="letterhead-company" className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Company
                    </label>
                    <select
                      id="letterhead-company"
                      value={selectedCompanyId}
                      onChange={(event) => handleSelectCompany(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    >
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}{dirtyLetterheadCompanyIds.includes(company.id) ? " — Unsaved" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="letterhead-company-heading" className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Company Heading
                    </label>
                    <input
                      id="letterhead-company-heading"
                      type="text"
                      required
                      value={letterheadHeading}
                      onChange={(event) => updateLetterheadField("legalName", event.target.value)}
                      aria-invalid={isLetterheadHeadingInvalid || undefined}
                      aria-describedby={isLetterheadHeadingInvalid ? "letterhead-heading-error" : undefined}
                      className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none ${
                        isLetterheadHeadingInvalid ? "border-rose-300" : "border-slate-200"
                      }`}
                    />
                    {isLetterheadHeadingInvalid && (
                      <p id="letterhead-heading-error" className="text-[11px] font-medium text-rose-700">
                        A company heading is required for the memo letterhead.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="letterhead-tagline" className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Tagline
                    </label>
                    <input
                      id="letterhead-tagline"
                      type="text"
                      value={selectedCompany.tagline || ""}
                      onChange={(event) => updateLetterheadField("tagline", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="letterhead-address" className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Address
                    </label>
                    <textarea
                      id="letterhead-address"
                      rows={2}
                      value={selectedCompany.address || ""}
                      onChange={(event) => updateLetterheadField("address", event.target.value)}
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium leading-relaxed text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="letterhead-contact" className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Contact Details
                    </label>
                    <textarea
                      id="letterhead-contact"
                      rows={2}
                      value={selectedCompany.contact || ""}
                      onChange={(event) => updateLetterheadField("contact", event.target.value)}
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium leading-relaxed text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-emerald-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-h-4 text-[11px] text-slate-500" role={letterheadStatus?.type === "error" ? "alert" : "status"} aria-live={letterheadStatus?.type === "error" ? "assertive" : "polite"}>
                    {letterheadStatus?.message || (dirtyLetterheadCompanyIds.includes(selectedCompanyId)
                      ? "Unsaved changes. Save as default to keep this header for future memos."
                      : "These details appear on the printed memo letterhead.")}
                  </p>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={restoreLetterheadDefaults}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      <RotateCcw size={13} />
                      Restore Default
                    </button>
                    <button
                      type="button"
                      disabled={isLetterheadHeadingInvalid}
                      onClick={saveLetterheadDefaults}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save size={13} />
                      Save as Default
                    </button>
                  </div>
                </div>
              </section>

              {/* Reference # and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Memorandum Reference #</span>
                    <button
                      type="button"
                      onClick={() => setMemoRef(`MEMO-2026-${selectedCompany.code}-${String(Math.floor(Math.random() * 900) + 100).padStart(3, "0")}`)}
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 normal-case font-bold cursor-pointer"
                    >
                      Generate New Ref
                    </button>
                  </label>
                  <input
                    type="text"
                    value={memoRef}
                    onChange={(e) => setMemoRef(e.target.value)}
                    placeholder="e.g. MEMO-2026-LBC-001"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                    <span>Date of Issuance</span>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setMemoDate(new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(now).toUpperCase());
                      }}
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 normal-case font-bold cursor-pointer"
                    >
                      Set Today
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={memoDate}
                      onChange={(e) => setMemoDate(e.target.value)}
                      placeholder="e.g. SEPTEMBER 24, 2026"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none shadow-2xs"
                    />
                    <Calendar size={15} className="absolute right-3.5 top-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* TO: Recipients */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
                  <span>TO: (Recipients / Addressee)</span>
                  <span className="text-[10px] text-slate-400 font-semibold normal-case">Target personnel or departments</span>
                </label>
                <input
                  type="text"
                  value={memoTo}
                  onChange={(e) => setMemoTo(e.target.value)}
                  placeholder="e.g. HR ON-SITE, CIC, AND FIELD MONITORING or ALL EMPLOYEES"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none shadow-2xs"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-400 self-center font-bold">Quick Insert:</span>
                  {[
                    "HR ON-SITE, CIC, AND FIELD MONITORING",
                    "ALL EMPLOYEES AND CONCERNED PERSONNEL",
                    "ALL PROJECT ENGINEERS & FIELD WORKERS",
                    "ALL BRANCH OPERATIONS & TELLERS"
                  ].map((quickTo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMemoTo(quickTo)}
                      className="text-[10px] font-semibold bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 rounded-lg transition cursor-pointer"
                    >
                      + {quickTo}
                    </button>
                  ))}
                </div>
              </div>

              {/* FROM: Originating Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  FROM: (Originating Department / Office)
                </label>
                <input
                  type="text"
                  value={memoFrom}
                  onChange={(e) => setMemoFrom(e.target.value)}
                  placeholder="e.g. HUMAN RESOURCES DEPARTMENT"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none shadow-2xs"
                />
              </div>

              {/* SUBJECT: Subject Line */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                  SUBJECT: (Official Directive Subject)
                </label>
                <input
                  type="text"
                  value={memoSubject}
                  onChange={(e) => setMemoSubject(e.target.value)}
                  placeholder="e.g. IMMEDIATE RESPONSE AND COMMUNICATION ACCESSIBILITY"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-950 uppercase tracking-tight focus:border-emerald-500 focus:bg-white focus:outline-none shadow-2xs"
                />
              </div>

              {/* SYSTEM AUTO-ANALYZED CLASSIFICATION BADGE (Automatic AI Analyzer - No manual user pick) */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600" />
                    <span>System Auto-Analyzed Classification Badge:</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    AI Auto-Analyzed
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black shadow-sm text-base">
                      {memoCategory === "Mandatory Compliance" && "⚠️"}
                      {memoCategory === "Operational Directive" && "📋"}
                      {memoCategory === "Holiday Schedule" && "📅"}
                      {memoCategory === "Safety & Health" && "🛡️"}
                      {memoCategory === "Executive Order" && "🏛️"}
                      {memoCategory === "General Policy" && "📌"}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                        <span>{memoCategory}</span>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded-md border border-emerald-200">
                          Active Badge
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                        Automatically identified by the system based on the subject: <span className="font-bold text-emerald-900">"{memoSubject || 'Current Subject'}"</span>
                      </p>
                    </div>
                  </div>

                  <span className="hidden sm:inline-flex px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-900 text-white shadow-2xs">
                    {memoCategory}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1 Bottom Navigation Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3.5 text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                <span>Continue to Step 2: Directives Body</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: MEMORANDUM BODY DIRECTIVES ================= */}
        {currentStep === 2 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
            {/* Step 2 Introduction Card */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Step 2: Memorandum Body Directives &amp; Guidelines
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Enter the memorandum directives in the canvas below. Classification updates automatically based on the subject.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-center px-3 py-1 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black uppercase tracking-wider">
                Step 2 of 4
              </span>
            </div>

            {/* Large writing canvas for memorandum directives */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <PenTool size={14} className="text-emerald-600" />
                  Memorandum Body Directives (Full Writing Canvas)
                </label>
                <button
                  type="button"
                  onClick={() => setMagnifyModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition cursor-pointer border border-emerald-200"
                  title="Open full-screen modal editor"
                >
                  <Maximize2 size={12} />
                  <span>Full-Screen Editor</span>
                </button>
              </div>

              <textarea
                rows={16}
                value={memoContent}
                onChange={(e) => setMemoContent(e.target.value)}
                  placeholder="Enter the memorandum directives here...

Write numbered directives or formal paragraphs.

(Example:
1. All concerned officers are advised...
2. Operational guidelines: ...
3. Strict compliance is expected.)"
                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-900 focus:border-emerald-500 focus:outline-none font-sans resize-y shadow-inner"
              />

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
                <span>{memoContent.split(/\s+/).filter(Boolean).length} words</span>
                <span>{memoContent.length} characters</span>
              </div>
            </div>

            {/* Step 2 Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 text-xs shadow-xs transition cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back to Step 1</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                <span>Continue to Step 3: Signatories</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: SIGNATORY CONFIGURATION ================= */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
            {/* Step 3 Introduction Card */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <PenTool size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Step 3: Official Signatory &amp; Executive Endorsement
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    Set up the issuing HRMD officer and executive approval line (dual or single signatory).
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-center px-3 py-1 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black uppercase tracking-wider">
                Step 3 of 4
              </span>
            </div>

            {/* Layout Mode Selector (Dual vs Single) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Signatory Layout Mode:
                </span>
                <p className="text-[11px] text-slate-500">
                  Choose dual approval (HRMD + CEO) or single approval (HRMD only).
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSignatoryLayout("dual")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    signatoryLayout === "dual"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Dual Signatory (HRMD + CEO)
                </button>
                <button
                  type="button"
                  onClick={() => setSignatoryLayout("single")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    signatoryLayout === "single"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Single Signatory (HRMD Only)
                </button>
              </div>
            </div>

            {/* Signatory Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Issued By */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                    Signatory 1: Issued By (HRMD Signer)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Issuer</span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Official Signer Name</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="e.g. JEVINCE JAYE S. JUBAY, CHRP"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-900 uppercase focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Official Designation / Title</label>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      placeholder="e.g. HRMD Manager"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Affiliated Entity / Department</label>
                    <input
                      type="text"
                      value={signatoryCompany}
                      onChange={(e) => setSignatoryCompany(e.target.value)}
                      placeholder={`e.g. ${selectedCompany.name}`}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* Official E-Signature Upload */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Official Digital E-Signature
                    </span>
                    {signatorySignature ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        E-Signature Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-medium">Optional digital upload</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xs transition">
                      <Upload size={13} />
                      <span>{signatorySignature ? "Change E-Signature" : "Upload E-Signature"}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleUploadSignatorySignature}
                        className="hidden"
                      />
                    </label>

                    {signatorySignature && (
                      <button
                        type="button"
                        onClick={handleRemoveSignatorySignature}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"
                        title="Remove uploaded signature"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Signature Line Preview */}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Signature Line Preview:
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      ISSUED BY:
                    </p>
                    <div className="h-14 flex items-end mb-1">
                      {signatorySignature ? (
                        <img
                          src={signatorySignature}
                          alt="Signatory E-Signature"
                          className="max-h-14 max-w-[190px] object-contain object-bottom pointer-events-none select-none"
                        />
                      ) : (
                        <div className="h-8 text-[11px] text-slate-400 italic flex items-center">
                          (Physical signature space on printed copy)
                        </div>
                      )}
                    </div>
                    <div className="w-56 border-b-2 border-slate-900 mb-1.5"></div>
                    <p className="text-xs font-black text-slate-950 uppercase">{signatoryName}</p>
                    <p className="text-[11px] font-bold text-slate-800 leading-tight">{signatoryTitle}</p>
                    <p className="text-[10px] text-slate-600 font-semibold">{getSignatoryAffiliation(selectedCompany)}</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Noted & Approved By */}
              {signatoryLayout === "dual" ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                      Signatory 2: Noted &amp; Approved By
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Executive Approval</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Approver Official Name</label>
                      <input
                        type="text"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        placeholder="e.g. CHARMIE JEAN M. SIMPAL"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-900 uppercase focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Approver Designation / Title</label>
                      <input
                        type="text"
                        value={approverTitle}
                        onChange={(e) => setApproverTitle(e.target.value)}
                        placeholder="e.g. President & CEO"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Company Legal Organization</label>
                      <input
                        type="text"
                        value={selectedCompany.legalName || selectedCompany.name}
                        readOnly
                        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Official Approver E-Signature Upload */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500">
                        Executive E-Signature
                      </span>
                      {approverSignature ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          E-Signature Active
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Optional digital upload</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-2xs transition">
                        <Upload size={13} />
                        <span>{approverSignature ? "Change E-Signature" : "Upload E-Signature"}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleUploadApproverSignature}
                          className="hidden"
                        />
                      </label>

                      {approverSignature && (
                        <button
                          type="button"
                          onClick={handleRemoveApproverSignature}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"
                          title="Remove uploaded signature"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Signature Line Preview */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Signature Line Preview:
                    </span>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        NOTED &amp; APPROVED BY:
                      </p>
                      <div className="h-14 flex items-end mb-1">
                        {approverSignature ? (
                          <img
                            src={approverSignature}
                            alt="Approver E-Signature"
                            className="max-h-14 max-w-[190px] object-contain object-bottom pointer-events-none select-none"
                          />
                        ) : (
                          <div className="h-8 text-[11px] text-slate-400 italic flex items-center">
                            (Physical signature space on printed copy)
                          </div>
                        )}
                      </div>
                      <div className="w-56 border-b-2 border-slate-900 mb-1.5"></div>
                      <p className="text-xs font-black text-slate-950 uppercase">{approverName}</p>
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">{approverTitle}</p>
                      <p className="text-[10px] text-slate-600 font-semibold">{selectedCompany.legalName || selectedCompany.name}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 p-6 flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2">
                    <PenTool size={20} />
                  </div>
                  <h5 className="text-xs font-bold text-slate-800">Single Signatory Enabled</h5>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                    Only the HRMD Manager's signature block will appear in the final memorandum.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSignatoryLayout("dual")}
                    className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Switch back to Dual Signatory
                  </button>
                </div>
              )}
            </div>

            {/* Step 3 Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 text-xs shadow-xs transition cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back to Step 2</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer"
              >
                <span>Continue to Step 4: Final Memo &amp; Distribution</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 4: FINAL MEMO & MULTI-COMPANY DISTRIBUTION ================= */}
        {currentStep === 4 && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
            {/* Multi-Company Synchronized Overview Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <Building2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Step 4: Unified Multi-Company Memorandum Distribution
                  </h4>
                  <p className="text-xs text-slate-600 font-medium">
                    The memorandum is prepared for all entities by default. <strong>Uncheck or exclude</strong> any entity that should not receive a copy; excluded entities will not appear in the final memo or be included in email or PDF output.
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-center px-3 py-1 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black uppercase tracking-wider">
                {activeCompanies.length} of {COMPANIES.length} Entities Active
              </span>
            </div>

            {/* COMPANY DISTRIBUTION SCOPE SELECTOR (UNTOGGLE / UNCHECK UNINVOLVED ENTITIES) */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckSquare size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      Distribution Scope: {activeCompanies.length} of {COMPANIES.length} Entities Selected
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Select an entity to include or exclude it. <strong>Excluded entities</strong> will not appear in the final memo, PDF, or email dispatch.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={selectAllCompanies}
                    className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    Select All (6)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectOnlyCompany(selectedCompanyId)}
                    className="text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    Only Active ({selectedCompany.code})
                  </button>
                </div>
              </div>

              {/* Interactive 6-Entity Toggle Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {companies.map((comp) => {
                  const isIncluded = includedCompanyIds.includes(comp.id);
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => toggleCompanyInclusion(comp.id)}
                      className={`relative flex flex-col items-center text-center p-3 rounded-xl border-2 transition cursor-pointer ${
                        isIncluded
                          ? "bg-emerald-50/70 border-emerald-500 shadow-2xs"
                          : "bg-slate-50/80 border-slate-200 opacity-60 hover:opacity-90"
                      }`}
                    >
                      {/* Checkbox Status Icon */}
                      <div className="absolute top-2 right-2">
                        {isIncluded ? (
                          <CheckCircle2 size={16} className="text-emerald-600 fill-emerald-100" />
                        ) : (
                          <XCircle size={16} className="text-slate-400" />
                        )}
                      </div>

                      <div className="h-10 w-10 flex items-center justify-center p-1 mb-1">
                        <img src={comp.logoUrl} alt={comp.name} className="max-h-full max-w-full object-contain" />
                      </div>

                      <span className="text-[11px] font-black text-slate-900 leading-tight">
                        {comp.code}
                      </span>
                      <span className="text-[9.5px] font-medium text-slate-600 truncate max-w-full mt-0.5">
                        {comp.name}
                      </span>

                      <span
                        className={`mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isIncluded
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {isIncluded ? "✓ Included" : "✕ Excluded"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Entity Jumper Navigation */}
            <div className="rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-emerald-700" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Quick Jump to Sheet:
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {activeCompanies.map((company) => {
                  const isIncluded = includedCompanyIds.includes(company.id);
                  return (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`memo-sheet-${company.id}`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                        isIncluded
                          ? "bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200 opacity-60"
                      }`}
                      title={`Jump to ${company.name}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${isIncluded ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                      <span>{company.name}</span>
                      <span className="text-[9px] font-mono font-black">({company.code})</span>
                      {!isIncluded && <span className="text-[8.5px] text-rose-600 font-black">[EXCLUDED]</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Document Action Toolbar (Print All, Save, Email, Zoom, Watermark) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-4 z-20 shadow-md">
              {/* Left Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintMemo("all")}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2 text-xs shadow-md transition cursor-pointer"
                  title="Print or Save included company memos as PDF"
                >
                  <Printer size={15} />
                  <span>Print {activeCompanies.length} {activeCompanies.length === 1 ? "Entity" : "Entities"} (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveMemoToArchive}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
                  title="Save memo to local records archive"
                >
                  <Save size={15} />
                  <span>Save to Records</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (totalCompanyRecipients === 0) {
                      setUnlinkedNoticeModalOpen(true);
                    } else {
                      setEmailModalOpen(true);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-xl text-white font-black px-4 py-2 text-xs shadow-md transition cursor-pointer ${
                    totalCompanyRecipients === 0
                      ? "bg-amber-700 hover:bg-amber-600 shadow-amber-700/20"
                      : "bg-emerald-700 hover:bg-emerald-600 shadow-emerald-700/20"
                  }`}
                  title={
                    totalCompanyRecipients === 0
                      ? "Walang pre-registered employee work email na naka-link. I-click para sa dahilan."
                      : "Send via Email to pre-registered employee recipients"
                  }
                >
                  <Send size={15} />
                  <span>Send via Email ({recipientEmails.length})</span>
                  {unlinkedEntities.length > 0 && totalCompanyRecipients > 0 && (
                    <span className="bg-amber-400 text-amber-950 text-[9.5px] font-black px-1.5 py-0.2 rounded-full">
                      {unlinkedEntities.length} unlinked
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyMemoText}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-3 py-2 text-xs transition cursor-pointer"
                  title="Copy plain formatted text"
                >
                  {copiedNotice ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedNotice ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              {/* Right Settings (Zoom & Watermark Controls) */}
              <div className="flex items-center gap-3">
                {/* Zoom scale */}
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px] font-bold text-slate-700">
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(90)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${previewZoom === 90 ? "bg-white text-slate-900 shadow-2xs" : ""}`}
                  >
                    90%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(100)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${previewZoom === 100 ? "bg-white text-slate-900 shadow-2xs" : ""}`}
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewZoom(110)}
                    className={`px-2 py-0.5 rounded cursor-pointer ${previewZoom === 110 ? "bg-white text-slate-900 shadow-2xs" : ""}`}
                  >
                    110%
                  </button>
                </div>

                {/* Watermark opacity */}
                <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                  <span className="text-[10px] text-slate-400 uppercase">Watermark:</span>
                  <input
                    type="range"
                    min={4}
                    max={25}
                    value={watermarkOpacity}
                    onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                    className="w-20 accent-emerald-600 cursor-pointer"
                    title={`Watermark opacity: ${watermarkOpacity}%`}
                  />
                  <span className="font-mono text-[10px] font-bold text-emerald-700">{watermarkOpacity}%</span>
                </div>
              </div>
            </div>

            {/* UNIFIED MULTI-COMPANY VIEWER: Renders all 6 companies sequentially in one place */}
            <div className="w-full flex flex-col items-center gap-10 py-2">
              {companiesToPreview.map((company, index) => {
                const compMemoRef = `MEMO-2026-${company.code}-${memoRef.split("-").pop() || "001"}`;
                const isIncluded = includedCompanyIds.includes(company.id);

                return (
                  <div
                    key={company.id}
                    id={`memo-sheet-${company.id}`}
                    className="w-full max-w-[760px] flex flex-col items-center space-y-2 scroll-mt-24"
                  >
                    {/* Company Section Header Pill */}
                    <div className="w-full flex items-center justify-between px-3 text-xs font-bold text-slate-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                          isIncluded ? "bg-emerald-700 text-white" : "bg-slate-400 text-white"
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-slate-900 font-black uppercase tracking-wide">
                          {company.name}
                        </span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-mono font-bold">
                          {compMemoRef}
                        </span>
                        <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isIncluded ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-rose-100 text-rose-800 border-rose-300"
                        }`}>
                          {isIncluded ? "✓ Included" : "✕ Excluded"}
                        </span>
                        <span className="text-[9.5px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          📄 {getMemoFitMetrics(memoContent).paperLabel} • 1-Page Fit
                        </span>
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        {isIncluded && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyMemoAsImage(company)}
                              disabled={copyingImageId === company.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                              title="Copy high-res memorandum image to clipboard for Viber, Messenger, Telegram, WhatsApp or Gmail"
                            >
                              {copyingImageId === company.id ? (
                                <>
                                  <RefreshCw size={13} className="animate-spin" />
                                  <span>Generating Image...</span>
                                </>
                              ) : copiedImageId === company.id ? (
                                <>
                                  <Check size={13} className="text-emerald-400" />
                                  <span className="text-emerald-300">Copied to Clipboard!</span>
                                </>
                              ) : (
                                <>
                                  <Camera size={13} className="text-emerald-400" />
                                  <span>Copy Memo Image</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadMemoImage(company)}
                              disabled={copyingImageId === company.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-300"
                              title="Download memo as high-res PNG image"
                            >
                              <Download size={13} className="text-slate-500" />
                              <span>PNG</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePrintMemo(company)}
                              className="text-[11px] text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer px-1"
                              title={`Print only the ${company.name} memorandum`}
                            >
                              Print this copy only
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleCompanyInclusion(company.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            isIncluded
                              ? "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-300 hover:border-rose-300"
                              : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-xs"
                          }`}
                        >
                          {isIncluded ? (
                            <>
                              <XCircle size={13} />
                              <span>Exclude</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} />
                              <span>Include in Memo</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Excluded notice banner if company is untoggled */}
                    {!isIncluded && (
                      <div className="w-full rounded-2xl border border-dashed border-rose-300 bg-rose-50/80 p-3 text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-black text-rose-800 uppercase tracking-wide">
                          <AlertCircle size={15} />
                          <span>EXCLUDED FROM MEMORANDUM DISTRIBUTION</span>
                        </div>
                        <p className="text-[11px] text-rose-700 font-medium">
                          <strong>{company.name}</strong> is excluded and will not appear in the final memo, PDF output, or email distribution.
                        </p>
                      </div>
                    )}

                    {/* Executive Sheet Representation - Sagad sa taas at sagad sa baba */}
                    <div
                      id={`memo-sheet-preview-${company.id}`}
                      style={{
                        zoom: previewZoom === 100 ? undefined : `${previewZoom}%`,
                      }}
                      className={`relative w-full bg-white border border-slate-300 rounded-sm shadow-xl px-6 py-5 sm:px-9 sm:py-6 min-h-[960px] overflow-hidden select-none transition-all duration-150 flex flex-col justify-between ${
                        !isIncluded ? "opacity-40 grayscale-[25%] pointer-events-none" : ""
                      }`}
                    >
                      {/* Watermark Layer */}
                      <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 flex items-center justify-center transition-opacity duration-200"
                        style={{
                          width: `${watermarkSize}px`,
                          height: `${watermarkSize}px`,
                          opacity: watermarkOpacity / 100
                        }}
                      >
                        <img
                          src={company.logoUrl}
                          alt={`${company.name} Watermark`}
                          className="max-w-full max-h-full object-contain filter grayscale-[15%]"
                        />
                      </div>

                      {/* Optional Diagonal Stamp */}
                      {showDiagonalStamp && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[35deg] pointer-events-none z-10 whitespace-nowrap border-3 border-dashed border-rose-600/20 text-rose-600/20 font-black text-xl px-8 py-2.5 tracking-[0.25em] uppercase">
                          {diagonalStampText}
                        </div>
                      )}

                      {/* Foreground Content (Flush Top, Flex Middle, Flush Bottom Signatories & Footer) */}
                      <div className="relative z-10 flex flex-col justify-between flex-1 h-full space-y-3">
                        {/* Top Section: Letterhead + Memorandum Title Banner + Metadata Grid + Directives */}
                        <div className="flex flex-col flex-1 space-y-2">
                          {/* Corporate Letterhead (Left Logo, Center Info, Right Corporate Group Emblem) */}
                          <div className="flex items-center justify-between gap-4 pb-1">
                            <div className="h-18 w-18 p-1 flex items-center justify-center shrink-0">
                              <img
                                src={company.logoUrl}
                                alt={company.name}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="min-w-0 flex-1 text-center">
                              <h1 className="text-base sm:text-lg font-black text-slate-950 tracking-wide uppercase leading-tight font-sans">
                                {company.legalName || company.name}
                              </h1>
                              {company.tagline && (
                                <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider mt-0.5">
                                  {company.tagline}
                                </div>
                              )}
                              <div className="text-[10px] sm:text-[10.5px] text-slate-700 font-semibold uppercase leading-snug mt-1">
                                {formatAddressLines(company.address).map((line, idx) => (
                                  <div key={idx}>{line}</div>
                                ))}
                              </div>
                              <div className="text-[9.5px] text-slate-500 font-medium tracking-tight mt-0.5">
                                {company.contact}
                              </div>
                            </div>
                            <div className="h-18 w-18 p-1 flex items-center justify-center shrink-0">
                              <img
                                src={company.rightLogoUrl || CORPORATE_GROUP_EMBLEM}
                                alt="Corporate Emblem"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                          </div>

                          {/* Top Letterhead Divider Line */}
                          <div className="mt-1 mb-1 border-b-2 border-slate-900"></div>

                          {/* Prominent MEMORANDUM Title Banner with Ref No & Classification */}
                          <div className="py-2 my-1 border-y-2 border-slate-900 text-center space-y-1">
                            <h2 className="text-lg sm:text-xl font-black tracking-[0.35em] text-slate-950 uppercase leading-none font-sans">
                              MEMORANDUM
                            </h2>
                            <div className="flex items-center justify-between text-[11px] px-2 font-bold pt-1 border-t border-slate-200">
                              <span className="text-slate-700 font-bold">
                                REF NO: <strong className="text-slate-950 font-mono font-black">{compMemoRef}</strong>
                              </span>
                              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                                {memoCategory}
                              </span>
                            </div>
                          </div>

                          {/* Official HR Memo Header Grid */}
                          <div className="space-y-1 text-xs py-1.5">
                            <div className="grid grid-cols-[90px_1fr] items-baseline">
                              <span className="font-black text-[12px] text-slate-900 uppercase">TO:</span>
                              <span className="font-extrabold text-slate-950 uppercase text-[12px] tracking-wide">{memoTo}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] items-baseline">
                              <span className="font-black text-[12px] text-slate-900 uppercase">FROM:</span>
                              <span className="font-extrabold text-slate-950 uppercase text-[12px] tracking-wide">{memoFrom}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] items-baseline">
                              <span className="font-black text-[12px] text-slate-900 uppercase">DATE:</span>
                              <span className="font-extrabold text-slate-950 uppercase text-[12px] tracking-wide">{memoDate}</span>
                            </div>
                            <div className="grid grid-cols-[90px_1fr] items-baseline">
                              <span className="font-black text-[12px] text-slate-900 uppercase">SUBJECT:</span>
                              <span className="font-black text-slate-950 uppercase text-[13px] tracking-tight">{memoSubject}</span>
                            </div>
                          </div>

                          {/* Solid Divider between Header and Directives */}
                          <div className="border-b-2 border-slate-900 my-1"></div>

                          {/* Memo Body Content */}
                          <div className="pt-2 text-[12.5px] sm:text-[13px] text-slate-900 font-normal leading-[1.8] font-sans whitespace-pre-wrap text-justify flex-1">
                            {memoContent || (
                              <span className="text-slate-400 italic">
                                (No directives entered. Return to Step 2 to write or generate them with AI.)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Section: Signatories + Official Footer - Sagad sa baba */}
                        <div className="mt-auto pt-6 space-y-4">
                          {/* Signatory Block with E-Signatures and Crisp Solid Underline */}
                          <div>
                            {signatoryLayout === "dual" ? (
                              <div className="grid grid-cols-2 gap-8 items-start">
                                {/* Left: Issued By */}
                                <div className="space-y-0.5 text-left">
                                  <p className="text-[10.5px] font-black uppercase text-slate-700 tracking-wider">
                                    ISSUED BY:
                                  </p>
                                  <div className="h-16 flex items-end mb-1">
                                    {signatorySignature ? (
                                      <img
                                        src={signatorySignature}
                                        alt="Signatory E-Signature"
                                        className="max-h-16 max-w-[210px] object-contain object-bottom pointer-events-none select-none -mb-2"
                                      />
                                    ) : (
                                      <div className="h-10 text-[11px] text-slate-400 italic flex items-center">
                                        (Signature over printed name)
                                      </div>
                                    )}
                                  </div>
                                  <div className="w-64 border-b-2 border-slate-950 mb-1.5"></div>
                                  <p className="text-xs sm:text-[13.5px] font-black text-slate-950 uppercase tracking-tight">
                                    {signatoryName}
                                  </p>
                                  <p className="text-[11.5px] font-bold text-slate-800 leading-tight">
                                    {signatoryTitle}
                                  </p>
                                  <p className="text-[10px] text-slate-600 font-semibold">
                                    {getSignatoryAffiliation(company)}
                                  </p>
                                </div>

                                {/* Right: Noted & Approved By */}
                                <div className="space-y-0.5 text-left">
                                  <p className="text-[10.5px] font-black uppercase text-slate-700 tracking-wider">
                                    NOTED &amp; APPROVED BY:
                                  </p>
                                  <div className="h-16 flex items-end mb-1">
                                    {approverSignature ? (
                                      <img
                                        src={approverSignature}
                                        alt="Approver E-Signature"
                                        className="max-h-16 max-w-[210px] object-contain object-bottom pointer-events-none select-none -mb-2"
                                      />
                                    ) : (
                                      <div className="h-10 text-[11px] text-slate-400 italic flex items-center">
                                        (Signature over printed name)
                                      </div>
                                    )}
                                  </div>
                                  <div className="w-64 border-b-2 border-slate-950 mb-1.5"></div>
                                  <p className="text-xs sm:text-[13.5px] font-black text-slate-950 uppercase tracking-tight">
                                    {approverName}
                                  </p>
                                  <p className="text-[11.5px] font-bold text-slate-800 leading-tight">
                                    {approverTitle}
                                  </p>
                                  <p className="text-[10px] text-slate-600 font-semibold">
                                    {company.legalName || company.name}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-start">
                                <div className="space-y-0.5 text-left max-w-[320px]">
                                  <p className="text-[10.5px] font-black uppercase text-slate-700 tracking-wider">
                                    ISSUED BY:
                                  </p>
                                  <div className="h-16 flex items-end mb-1">
                                    {signatorySignature ? (
                                      <img
                                        src={signatorySignature}
                                        alt="Signatory E-Signature"
                                        className="max-h-16 max-w-[210px] object-contain object-bottom pointer-events-none select-none -mb-2"
                                      />
                                    ) : (
                                      <div className="h-10 text-[11px] text-slate-400 italic flex items-center">
                                        (Signature over printed name)
                                      </div>
                                    )}
                                  </div>
                                  <div className="w-64 border-b-2 border-slate-950 mb-1.5"></div>
                                  <p className="text-xs sm:text-[13.5px] font-black text-slate-950 uppercase tracking-tight">
                                    {signatoryName}
                                  </p>
                                  <p className="text-[11.5px] font-bold text-slate-800 leading-tight">
                                    {signatoryTitle}
                                  </p>
                                  <p className="text-[10px] text-slate-600 font-semibold">
                                    {getSignatoryAffiliation(company)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Bottom Official Division Footer - Sagad sa pinaka-baba */}
                          <div className="pt-4 pb-1">
                            <div className="border-t border-slate-300 pt-2.5 flex items-center justify-between text-[9.5px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                              <span>OFFICE OF THE HUMAN RESOURCES &amp; ADMINISTRATION</span>
                              <span className="font-black text-slate-800">STRICT COMPLIANCE MANDATED</span>
                              <span>{company.code} • OFFICIAL TRANSMISSION</span>
                            </div>
                            <div className="text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.25em] mt-1">
                              HUMAN RESOURCE MANAGEMENT DIVISION
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Step 4 Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold px-5 py-3 text-xs shadow-xs transition cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Back to Step 3: Signatories</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer px-2"
                >
                  Edit Header (Step 1)
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer px-2"
                >
                  Edit Directives (Step 2)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: DIRECT EMAIL & PDF DISPATCH WITH COMPANY SEGREGATION ================= */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Send size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Dispatch Official Memo &amp; PDF to Personnel
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Company-Segregated Distribution • Official Sender: <strong className="font-mono text-emerald-700">{HR_OFFICIAL_EMAIL}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Overview Summary Banner */}
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Strict Pre-Registered Employee Delivery</p>
                  <p className="text-[11px] text-slate-600">
                    Personnel will <strong>strictly receive memos &amp; PDFs</strong> linked to their assigned entity using their verified pre-registered work email.
                  </p>
                </div>
              </div>
              <span className="font-mono font-black text-emerald-900 bg-white/90 border border-emerald-300 px-3 py-1 rounded-full text-xs shrink-0 shadow-2xs">
                {totalCompanyRecipients} Personnel • {linkedEntities.length} of {companyDispatches.length} Entities
              </span>
            </div>

            {/* Unlinked Entities Alert Banner (If some active companies have 0 pre-registered emails) */}
            {unlinkedEntities.length > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={18} className="text-amber-700 shrink-0" />
                  <div>
                    <p className="font-extrabold text-xs text-amber-950">
                      {unlinkedEntities.length} {unlinkedEntities.length === 1 ? "Company has" : "Companies have"} no linked Pre-Registered Work Emails
                    </p>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Memos cannot be dispatched to these entities until employee work emails are registered in the Employee Directory.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUnlinkedNoticeModalOpen(true)}
                  className="text-[11px] font-black text-amber-900 bg-white hover:bg-amber-100 border border-amber-300 px-3 py-1 rounded-xl shadow-2xs transition cursor-pointer shrink-0"
                >
                  View Details →
                </button>
              </div>
            )}

            {/* List of Company Segregated Dispatches */}
            <div className="space-y-2.5">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                Company Distribution Roster ({companyDispatches.length} Active {companyDispatches.length === 1 ? "Entity" : "Entities"}):
              </p>

              <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {companyDispatches.map((dispatch) => (
                  <div
                    key={dispatch.companyId}
                    className={`rounded-2xl border p-3.5 space-y-2 transition ${
                      dispatch.recipients.length > 0
                        ? "border-slate-200 bg-slate-50/80 hover:border-slate-300"
                        : "border-rose-200 bg-rose-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dispatch.recipients.length > 0 ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                        <span className="font-extrabold text-xs text-slate-900 truncate">
                          {dispatch.companyName}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          {dispatch.memoRef}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-full border ${
                        dispatch.recipients.length > 0
                          ? "text-emerald-700 bg-emerald-100/70 border-emerald-200"
                          : "text-rose-700 bg-rose-100/80 border-rose-300"
                      }`}>
                        {dispatch.recipients.length > 0
                          ? `${dispatch.recipients.length} Recipient${dispatch.recipients.length === 1 ? "" : "s"}`
                          : "0 Work Emails (Blocked)"}
                      </span>
                    </div>

                    {/* Recipients Email Badges for this company */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {dispatch.recipients.length > 0 ? (
                        dispatch.recipients.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[10.5px] font-mono font-medium text-slate-700 shadow-2xs"
                          >
                            <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                            <span className="truncate max-w-[200px]">{email}</span>
                          </span>
                        ))
                      ) : (
                        <div className="flex items-center justify-between w-full pt-0.5">
                          <span className="text-[10.5px] text-rose-700 font-bold flex items-center gap-1">
                            <AlertCircle size={12} className="text-rose-600 shrink-0" />
                            <span>No pre-registered employee work emails found for this company.</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setUnlinkedNoticeModalOpen(true)}
                            className="text-[10.5px] font-bold text-rose-800 underline cursor-pointer hover:text-rose-950"
                          >
                            Why is this blocked?
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Google Apps Script Webhook Configuration Bar */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                  <Code size={13} className="text-blue-600" />
                  <span>Google Apps Script Webhook URL (Gmail Dispatcher)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowScriptGuideModal(true)}
                  className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  View Deployment Guide &amp; Code →
                </button>
              </div>

              {isEditingWebhook ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    defaultValue={customWebhookUrl}
                    id="hrhub-webhook-url-input"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:border-emerald-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("hrhub-webhook-url-input");
                      if (input) saveCustomWebhookUrl(input.value);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 cursor-pointer"
                  >
                    Save URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingWebhook(false)}
                    className="px-2 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs">
                  <span className="font-mono text-[11px] text-slate-600 truncate flex-1 pr-2">
                    {customWebhookUrl || <span className="italic text-slate-400">No Webhook URL configured. Click 'Configure Webhook' or 'View Deployment Guide'</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingWebhook(true)}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 shrink-0 ml-2 px-2 py-0.5 rounded-lg hover:bg-emerald-50 cursor-pointer"
                  >
                    {customWebhookUrl ? "Edit URL" : "+ Configure Webhook"}
                  </button>
                </div>
              )}
            </div>

            {/* Direct Send Status Feedback */}
            {directSendStatus && (
              <div
                className={`rounded-2xl p-3 text-xs flex items-center gap-2 border ${
                  directSendStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-rose-50 text-rose-800 border-rose-300"
                }`}
              >
                {directSendStatus.type === "success" ? (
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                )}
                <span className="font-bold">{directSendStatus.message}</span>
              </div>
            )}

            {/* Main Action Button */}
            <button
              type="button"
              disabled={isSendingDirect}
              onClick={() => {
                if (totalCompanyRecipients === 0) {
                  setUnlinkedNoticeModalOpen(true);
                } else {
                  handleSendDirect();
                }
              }}
              className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-xs font-black text-white shadow-lg transition cursor-pointer ${
                totalCompanyRecipients === 0
                  ? "bg-amber-600 hover:bg-amber-500 shadow-amber-700/20"
                  : "bg-[#008559] hover:bg-[#00704a] shadow-emerald-700/20"
              }`}
            >
              {isSendingDirect ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Dispatching company-segregated memos &amp; PDFs via {HR_OFFICIAL_EMAIL}...</span>
                </>
              ) : totalCompanyRecipients === 0 ? (
                <>
                  <AlertCircle size={16} />
                  <span>Hindi Maipapadala: Walang Pre-Registered Work Email (I-click para sa detalye)</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Dispatch Memos &amp; Attached PDFs to {totalCompanyRecipients} Personnel ({HR_OFFICIAL_EMAIL})</span>
                </>
              )}
            </button>

            {/* Alternative Dispatch Options */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs flex-wrap">
              <button
                type="button"
                onClick={handleSendViaGmailWeb}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-red-600 font-bold py-1.5 px-2 rounded-lg hover:bg-red-50 transition cursor-pointer"
                title="Review and dispatch using Gmail Web in browser"
              >
                <ExternalLink size={13} />
                <span>Open in Gmail Web</span>
              </button>

              <button
                type="button"
                onClick={handleSendViaEmailClient}
                className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold py-1.5 px-2 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Open system desktop mail client (Outlook, Mail app)"
              >
                <Mail size={13} />
                <span>Desktop Mail App</span>
              </button>

              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer ml-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: UNLINKED WORK EMAIL NOTIFICATION & EXPLANATION ================= */}
      {unlinkedNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl border border-amber-200/90 bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shrink-0">
                  <AlertCircle size={22} className="text-amber-700" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900 leading-tight">
                    Unable to Dispatch Email Memorandum
                  </h4>
                  <p className="text-[11.5px] text-amber-800 font-bold">
                    No Linked Pre-Registered Employee Work Email Address Found
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUnlinkedNoticeModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 text-xs text-slate-700">
              {/* Core Explanation Box */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                <h5 className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-amber-700" />
                  <span>Reason for Dispatch Restriction:</span>
                </h5>
                <p className="text-[12px] leading-relaxed text-slate-800 font-medium">
                  The corporate dispatch system strictly adheres to confidentiality and security policies. 
                  Memos can only be dispatched to verified <strong>Work Email Addresses</strong> of personnel registered under the <strong>Employee Directory (Pre-Register Employee)</strong>.
                </p>
                <p className="text-[11.5px] text-amber-900 font-bold bg-white/80 border border-amber-200 rounded-xl p-2.5">
                  ⚠️ HRHub intentionally disables generic fallback contact emails to preserve document security and ensure verified delivery only to authorized staff.
                </p>
              </div>

              {/* List of Affected Entities with 0 emails */}
              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Entities with No Pre-Registered Work Emails ({unlinkedEntities.length} {unlinkedEntities.length === 1 ? "Entity" : "Entities"}):
                </p>

                <div className="space-y-2">
                  {unlinkedEntities.map((item) => (
                    <div
                      key={item.companyId}
                      className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 flex items-center justify-between flex-wrap gap-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-rose-200 p-1 flex items-center justify-center shrink-0">
                          <Building2 size={16} className="text-rose-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 truncate">
                            {item.companyName}
                          </p>
                          <p className="font-mono text-[10.5px] text-slate-500">
                            {item.memoRef} • {item.code}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-black uppercase text-rose-700 bg-white border border-rose-300 px-3 py-1 rounded-full shadow-2xs">
                        ✕ 0 Registered Personnel
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step-by-Step Resolution Guide */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <h6 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                  <UserPlus size={15} className="text-emerald-700" />
                  <span>How to Link Personnel (Step-by-Step):</span>
                </h6>
                <ol className="list-decimal list-inside space-y-1.5 text-[11.5px] text-slate-700 leading-relaxed font-medium">
                  <li>
                    Navigate to the <strong>Employee Directory</strong> from the navigation menu or click the button below.
                  </li>
                  <li>
                    Click the <strong>"+ Pre-Register Employee"</strong> button.
                  </li>
                  <li>
                    Enter the employee's official <strong>Work Email Address</strong> and assign their corresponding <strong>Company Entity</strong>.
                  </li>
                  <li>
                    Click <strong>Complete Pre-Registration</strong>. Their work email will immediately reflect under the Memo Generator for that company.
                  </li>
                </ol>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 flex-wrap">
              {onNavigateToDirectory && (
                <button
                  type="button"
                  onClick={() => {
                    setUnlinkedNoticeModalOpen(false);
                    setEmailModalOpen(false);
                    onNavigateToDirectory();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black px-4 py-2.5 text-xs shadow-md shadow-emerald-700/20 transition cursor-pointer"
                >
                  <Users size={15} />
                  <span>Go to Pre-Register Employee Directory →</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setUnlinkedNoticeModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer ml-auto"
              >
                I Understand / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: GOOGLE APPS SCRIPT DEPLOYMENT GUIDE ================= */}
      {showScriptGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                  <Code size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Google Apps Script Setup Guide ({HR_OFFICIAL_EMAIL})
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Deploy this script once to allow HRHub to send official emails with PDF attachments.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowScriptGuideModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1 text-xs text-slate-700">
              {/* Step by Step Instructions */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-2">
                <h5 className="font-extrabold text-blue-950 text-xs flex items-center gap-1.5">
                  <span>📋 4-Step Setup Instructions:</span>
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 text-[11.5px] leading-relaxed text-slate-800">
                  <li>
                    Pumunta sa <strong><a href="https://script.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-bold">script.google.com</a></strong> gamit ang iyong HR Google account (<code>{HR_OFFICIAL_EMAIL}</code>).
                  </li>
                  <li>
                    I-click ang <strong>"+ New Project"</strong> at i-paste ang code sa ibaba (burahin ang laman ng <code>Code.gs</code> at i-paste ang script).
                  </li>
                  <li>
                    I-click ang <strong>"Deploy"</strong> (kanang taas) ➜ <strong>"New deployment"</strong> ➜ piliin ang gear icon ➜ <strong>"Web app"</strong>:
                    <ul className="list-disc list-inside pl-4 pt-1 space-y-0.5 text-slate-700 text-[11px]">
                      <li>Execute as: <strong>Me ({HR_OFFICIAL_EMAIL})</strong></li>
                      <li>Who has access: <strong>Anyone</strong> (para makapag-send ang HRHub app)</li>
                    </ul>
                  </li>
                  <li>
                    I-click ang <strong>"Deploy"</strong>, i-authorize ang access, at kopyahin ang <strong>"Web app URL"</strong>. I-paste ito sa Webhook URL input ng HRHub!
                  </li>
                </ol>
              </div>

              {/* Script Code Block */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">Apps Script Source Code (Code.gs):</span>
                  <button
                    type="button"
                    onClick={() => {
                      const codeText = `/**
 * HRHUB ENTERPRISE MEMO & PDF EMAIL DISPATCHER
 * Google Apps Script Webhook (Deploy as Web App)
 * Target Sender: ${HR_OFFICIAL_EMAIL}
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No payload received" })).setMimeType(ContentService.MimeType.JSON);
    }
    var payload = JSON.parse(e.postData.contents);
    var dispatches = payload.dispatches || [payload];
    var results = [];

    for (var i = 0; i < dispatches.length; i++) {
      var item = dispatches[i];
      var recipients = item.recipients || [];
      if (!Array.isArray(recipients)) recipients = [recipients];
      var validRecipients = recipients.filter(function(em) { return em && em.indexOf("@") > 0; });
      if (validRecipients.length === 0) continue;

      var companyName = item.companyName || "Simpal Group";
      var memoRef = item.memoRef || "MEMO-2026";
      var subject = item.subject || ("[OFFICIAL MEMO] " + memoRef + " - " + companyName);
      var htmlBody = item.htmlBody || "<p>Please find attached your official memorandum.</p>";
      var plainBody = item.body || "Please find attached your official memorandum.";
      var attachments = [];

      if (item.pdfHtml) {
        try {
          var pdfBlob = Utilities.newBlob(item.pdfHtml, "text/html", memoRef + ".html")
            .getAs("application/pdf")
            .setName(memoRef + " - " + companyName + ".pdf");
          attachments.push(pdfBlob);
        } catch (err) {
          Logger.log("PDF error: " + err);
        }
      }

      for (var r = 0; r < validRecipients.length; r++) {
        var recipientEmail = validRecipients[r].trim();
        try {
          GmailApp.sendEmail(recipientEmail, subject, plainBody, {
            htmlBody: htmlBody,
            attachments: attachments,
            name: "HRHub Official Dispatch • " + companyName,
            replyTo: item.senderEmail || "${HR_OFFICIAL_EMAIL}"
          });
        } catch (sendErr) {
          Logger.log("Send error for " + recipientEmail + ": " + sendErr);
        }
      }
      results.push({ company: companyName, memoRef: memoRef, count: validRecipients.length });
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", results: results })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "online", service: "HRHub Dispatcher" })).setMimeType(ContentService.MimeType.JSON);
}`;
                      navigator.clipboard.writeText(codeText);
                      setCopiedScriptNotice(true);
                      setTimeout(() => setCopiedScriptNotice(false), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                  >
                    {copiedScriptNotice ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedScriptNotice ? "Script Copied!" : "Copy Apps Script Code"}</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-2xl bg-slate-900 p-3.5 text-[11px] font-mono text-slate-200 space-y-1">
                  <pre className="whitespace-pre-wrap">{`function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var dispatches = payload.dispatches || [payload];
  
  // Loops through company-segregated packages
  // Generates company-specific PDF attachment for each entity
  // Sends email directly via GmailApp.sendEmail with PDF attached
  ...
}`}</pre>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowScriptGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: MAGNIFIED CANVAS EDITOR ================= */}
      {magnifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Maximize2 size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Full-Screen Directives &amp; Guidelines Editor
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Drafting directives for {selectedCompany.name} ({memoRef})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMagnifyModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-[350px] flex flex-col space-y-1">
              <textarea
                value={memoContent}
                onChange={(e) => setMemoContent(e.target.value)}
                placeholder="Draft the complete memorandum directives, paragraphs, and numbered points..."
                className="w-full flex-1 p-4 rounded-2xl border border-slate-200 bg-white text-sm sm:text-base leading-relaxed text-slate-900 focus:border-emerald-500 focus:outline-none font-sans resize-none shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 shrink-0 text-xs">
              <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                <span>{memoContent.split(/\s+/).filter(Boolean).length} words</span>
                <span>{memoContent.length} characters</span>
              </div>

              <button
                type="button"
                onClick={() => setMagnifyModalOpen(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 text-xs shadow-md transition cursor-pointer"
              >
                <Check size={14} className="text-emerald-400" />
                <span>Save &amp; Return to Wizard</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SAVED MEMOS ARCHIVE ================= */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <Archive size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Saved Memorandums Archive ({savedMemos.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Stored official memorandums saved in HrHub system
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {savedMemos.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText size={32} className="mx-auto text-slate-300" />
                  <p className="text-xs font-semibold">No saved memorandums in records yet.</p>
                  <p className="text-[11px]">When you finish drafting a memo, click "Save to Records" in Step 4.</p>
                </div>
              ) : (
                savedMemos.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                          {m.ref}
                        </span>
                        <span className="text-[10px] font-black uppercase text-slate-500">
                          {m.companyCode || m.companyName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {m.date}
                        </span>
                      </div>
                      <h5 className="text-xs font-black text-slate-900 truncate">
                        {m.subject}
                      </h5>
                      <p className="text-[11px] text-slate-500 truncate">
                        TO: {m.to} | FROM: {m.from}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLoadSavedMemo(m)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>Load Memo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSavedMemo(m.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete from records"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
