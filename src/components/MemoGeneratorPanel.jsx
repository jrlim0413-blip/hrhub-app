import { useState, useMemo, useEffect } from "react";
import {
  FileText, Building2, Send, Printer, Copy, Check, Sparkles,
  Layers, RefreshCw, X, Mail, Eye, Sliders, CheckCircle2,
  AlertCircle, Users, PenTool, Calendar, Bookmark,
  RotateCcw, ArrowRight, ArrowLeft, ExternalLink, Zap,
  Maximize2, ZoomIn, ZoomOut, Save, Archive, Trash2, Clock, Plus,
  Upload, Image, CheckSquare, Square, XCircle
} from "lucide-react";
import { processSignatureToTransparentPng } from "../lib/signatureImageProcessor";
export const HR_OFFICIAL_EMAIL = "imsoroglohr@gmail.com";
export const CORPORATE_GROUP_EMBLEM = "/logos/group_emblem.jpg";

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
  onOpenAiBuddy
}) {
  // Stepper State: 1 = Header & Addressing, 2 = Body Directives, 3 = Signatories, 4 = Final Memo & Multi-Company
  const [currentStep, setCurrentStep] = useState(1);

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

  // Email & Dispatch States
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const backendWebhookUrl = (
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_HR_EMAIL_WEBHOOK_URL ? import.meta.env.VITE_HR_EMAIL_WEBHOOK_URL : "") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("hrhub_gmail_webhook_url") || "" : "")
  ).trim();
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [directSendStatus, setDirectSendStatus] = useState(null);

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

  // Recipient filtering matching all currently INCLUDED/CHECKED companies
  const companyEmployees = useMemo(() => {
    return profiles.filter((p) => {
      const c = (p.company || "").toLowerCase();
      return activeCompanies.some((comp) => {
        const target = comp.name.toLowerCase();
        const code = comp.code.toLowerCase();
        return (
          c.includes(target) ||
          c.includes(code) ||
          (comp.id === "sgc" && (c.includes("simpal") || c === ""))
        );
      });
    });
  }, [profiles, activeCompanies]);

  const recipientEmails = useMemo(() => {
    const set = new Set();
    companyEmployees.forEach((e) => {
      if (e.email) set.add(e.email.trim());
    });
    if (set.size === 0) {
      activeCompanies.forEach((comp) => {
        const baseCompany = COMPANIES.find((company) => company.id === comp.id) || comp;
        const emailPart = baseCompany.contact.split("|")[0].trim();
        if (emailPart && emailPart.includes("@")) set.add(emailPart);
      });
      if (currentUser?.email) set.add(currentUser.email);
    }
    return Array.from(set);
  }, [companyEmployees, activeCompanies, currentUser]);

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

  // Email Generators
  const generateEmailBody = () => {
    return `Dear Team,

Please see the Official Memorandum issued by ${distributionCompany.name}.

${distributionCompany.legalName || distributionCompany.name}
${distributionCompany.tagline || ""}
${distributionCompany.address}
${distributionCompany.contact}

--------------------------------------------------
MEMORANDUM DETAILS:
Ref Number: ${distributionMemoRef}
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
${getSignatoryAffiliation(distributionCompany)}

${signatoryLayout === "dual" ? `NOTED & APPROVED BY:
${approverName}
${approverTitle}
${distributionCompany.legalName || distributionCompany.name}
 ` : ""}
Please acknowledge receipt of this memorandum.

Office of the Human Resources & Corporate Administration
${distributionCompany.legalName}
HR Contact: ${HR_OFFICIAL_EMAIL}`;
  };

  const generateEmailHtml = () => {
    return `<div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
  <div style="text-align: center; border-bottom: 2px solid ${distributionCompany.accentColor || '#059669'}; padding-bottom: 15px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">${escapeHtml(distributionCompany.legalName || distributionCompany.name)}</h2>
    ${distributionCompany.tagline ? `<p style="margin: 3px 0 0 0; color: #047857; font-size: 11px; font-weight: 700;">${escapeHtml(distributionCompany.tagline)}</p>` : ""}
    <p style="margin: 4px 0 0 0; color: #64748b; font-size: 11px;">${escapeHtml(distributionCompany.address || "")}</p>
    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 10px;">${escapeHtml(distributionCompany.contact || "")}</p>
    <p style="margin: 2px 0 0 0; color: #059669; font-size: 11px; font-weight: 600;">HR Dispatch: ${HR_OFFICIAL_EMAIL}</p>
  </div>

  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 4px 0; color: #64748b; width: 90px; font-weight: bold;">MEMO REF:</td>
        <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${distributionMemoRef}</td>
        <td style="padding: 4px 0; color: #64748b; width: 60px; font-weight: bold;">DATE:</td>
        <td style="padding: 4px 0; color: #0f172a;">${memoDate}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748b; font-weight: bold;">TO:</td>
        <td colspan="3" style="padding: 4px 0; color: #0f172a;">${memoTo}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748b; font-weight: bold;">FROM:</td>
        <td colspan="3" style="padding: 4px 0; color: #0f172a;">${memoFrom}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748b; font-weight: bold;">SUBJECT:</td>
        <td colspan="3" style="padding: 4px 0; font-weight: bold; color: ${distributionCompany.accentColor || '#059669'};">${memoSubject}</td>
      </tr>
    </table>
  </div>

  <div style="font-size: 14px; line-height: 1.7; color: #334155; margin-bottom: 25px; white-space: pre-wrap; text-align: justify;">
    ${memoContent.replace(/\n/g, "<br>")}
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; font-size: 12px;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="width: 50%; vertical-align: top;">
          <p style="margin: 0; color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase;">Issued By:</p>
          <p style="margin: 8px 0 2px 0; font-weight: bold; color: #0f172a; font-size: 13px;">${signatoryName}</p>
          <p style="margin: 0; color: #64748b;">${signatoryTitle}</p>
          <p style="margin: 0; color: #059669; font-weight: 600;">${getSignatoryAffiliation(selectedCompany)}</p>
        </td>
        ${signatoryLayout === "dual" ? `
        <td style="width: 50%; vertical-align: top;">
          <p style="margin: 0; color: #64748b; font-size: 10px; font-weight: bold; text-transform: uppercase;">Noted & Approved By:</p>
          <p style="margin: 8px 0 2px 0; font-weight: bold; color: #0f172a; font-size: 13px;">${approverName}</p>
          <p style="margin: 0; color: #64748b;">${approverTitle}</p>
          <p style="margin: 0; color: #64748b; font-weight: 600;">${distributionCompany.legalName || distributionCompany.name}</p>
        </td>` : ""}
      </tr>
    </table>
  </div>

  <div style="margin-top: 25px; padding-top: 10px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 10px; color: #94a3b8;">
    This is an official administrative transmission sent via HrHub Executive Dispatch on behalf of ${distributionCompany.name}.<br>
    For inquiries, coordinate with Human Resources at <a href="mailto:${HR_OFFICIAL_EMAIL}" style="color: #059669; text-decoration: none;">${HR_OFFICIAL_EMAIL}</a>.
  </div>
</div>`;
  };

  // Direct Send to Personnel via configured Backend Webhook or Gmail Web
  const handleSendDirect = async () => {
    if (!backendWebhookUrl) {
      handleSendViaGmailWeb();
      return;
    }

    setIsSendingDirect(true);
    setDirectSendStatus(null);

    const payload = {
      recipients: recipientEmails,
      subject: `[OFFICIAL MEMO] ${distributionMemoRef}: ${memoSubject} - ${distributionCompany.name}`,
      body: generateEmailBody(),
      htmlBody: generateEmailHtml(),
      companyName: distributionCompany.name,
      companyLegal: distributionCompany.legalName,
      memoRef: distributionMemoRef,
      senderEmail: HR_OFFICIAL_EMAIL
    };

    try {
      await fetch(backendWebhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });

      setDirectSendStatus({
        type: "success",
        message: `Memo successfully dispatched to ${recipientEmails.length} personnel via ${HR_OFFICIAL_EMAIL}!`
      });

      setTimeout(() => {
        setEmailModalOpen(false);
        setDirectSendStatus(null);
      }, 3000);
    } catch (err) {
      console.error("Direct dispatch error:", err);
      setDirectSendStatus({
        type: "error",
        message: "Failed to dispatch via backend: " + (err.message || "Connection issue")
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

  // Print Document with embedded CSS to preserve watermark, page breaks, and A4 dimensions
  const handlePrintMemo = (targetCompany = null) => {
    const printWindow = window.open("", "_blank", "width=920,height=1100");
    if (!printWindow) {
      window.print();
      return;
    }

    const companiesToPrint = targetCompany && targetCompany !== "all"
      ? [typeof targetCompany === "string" ? (companies.find((company) => company.id === targetCompany) || companies[0]) : targetCompany]
      : activeCompanies;

    const sheetsHtml = companiesToPrint.map((comp, idx) => {
      const addrLines = formatAddressLines(escapeHtml(comp.address || ""));
      const addressHtml = addrLines.length > 1
        ? `${addrLines[0]}<br>${addrLines[1]}`
        : addrLines[0];

      const compMemoRef = `MEMO-2026-${comp.code}-${memoRef.split("-").pop() || "001"}`;

      return `
        <div class="memo-container ${idx < companiesToPrint.length - 1 ? 'page-break' : ''}">
          <div class="watermark-layer">
            <img src="${comp.logoUrl}" alt="${comp.name} Watermark">
          </div>

          ${showDiagonalStamp ? `<div class="diagonal-stamp">${diagonalStampText}</div>` : ""}

          <div class="content-layer">
            <div class="letterhead">
              <img src="${comp.logoUrl}" class="company-logo-left" alt="${comp.name}">
              <div class="company-info">
                <h1>${escapeHtml(comp.legalName || comp.name)}</h1>
                ${comp.tagline ? `<div class="tagline">${escapeHtml(comp.tagline)}</div>` : ""}
                <div class="address">${addressHtml}</div>
                <div class="contact">${escapeHtml(comp.contact || "")}</div>
              </div>
              <img src="${comp.rightLogoUrl || CORPORATE_GROUP_EMBLEM}" class="company-logo-right" alt="Corporate Emblem">
            </div>

            <div class="header-divider"></div>

            <div class="memo-banner">
              <div class="memo-banner-title">MEMORANDUM</div>
              <div class="memo-banner-sub">
                <span><strong>REF NO:</strong> <span class="ref-pill">${compMemoRef}</span></span>
                <span class="classification-tag">${memoCategory}</span>
              </div>
            </div>

            <table class="metadata-table">
              <tr>
                <td class="meta-label">TO:</td>
                <td class="meta-val">${memoTo}</td>
              </tr>
              <tr>
                <td class="meta-label">FROM:</td>
                <td class="meta-val">${memoFrom}</td>
              </tr>
              <tr>
                <td class="meta-label">DATE:</td>
                <td class="meta-val">${memoDate}</td>
              </tr>
              <tr>
                <td class="meta-label">SUBJECT:</td>
                <td class="meta-val meta-subject">${memoSubject}</td>
              </tr>
            </table>

            <div class="section-divider"></div>

            <div class="memo-body">${memoContent}</div>

            <div class="signatories-grid">
              <div class="sig-box">
                <div class="sig-header-label">ISSUED BY:</div>
                <div class="sig-signature-area">
                  ${signatorySignature ? `<img src="${signatorySignature}" class="sig-img" alt="Signatory Signature">` : `<div class="sig-empty-space"></div>`}
                </div>
                <div class="sig-rule"></div>
                <div class="sig-name">${signatoryName}</div>
                <div class="sig-title">${signatoryTitle}</div>
                <div class="sig-comp">${getSignatoryAffiliation(comp)}</div>
              </div>

              ${signatoryLayout === "dual" ? `
                <div class="sig-box">
                  <div class="sig-header-label">NOTED &amp; APPROVED BY:</div>
                  <div class="sig-signature-area">
                    ${approverSignature ? `<img src="${approverSignature}" class="sig-img" alt="Approver Signature">` : `<div class="sig-empty-space"></div>`}
                  </div>
                  <div class="sig-rule"></div>
                  <div class="sig-name">${approverName}</div>
                  <div class="sig-title">${approverTitle}</div>
                  <div class="sig-comp">${comp.legalName || comp.name}</div>
                </div>
              ` : ""}
            </div>

            <div class="memo-footer">
              <div class="footer-top-line">
                <span>OFFICE OF THE HUMAN RESOURCES &amp; ADMINISTRATION</span>
                <span class="footer-mandate">STRICT COMPLIANCE MANDATED</span>
                <span>${comp.code} • OFFICIAL TRANSMISSION</span>
              </div>
              <div class="footer-division">HUMAN RESOURCE MANAGEMENT DIVISION</div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    const printHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${memoRef} - ${memoSubject} (${companiesToPrint.length} Entities Distribution)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 18mm 14mm 18mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 16px;
      line-height: 1.6;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .memo-container {
      position: relative;
      max-width: 760px;
      margin: 0 auto 30px auto;
      padding: 24px 28px;
      min-height: 980px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
    }
    .watermark-layer {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${watermarkSize}px;
      height: ${watermarkSize}px;
      opacity: ${watermarkOpacity / 100};
      pointer-events: none;
      z-index: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .watermark-layer img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      filter: grayscale(15%);
    }
    .diagonal-stamp {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 24px;
      font-weight: 900;
      color: rgba(220, 38, 38, 0.12);
      border: 3px dashed rgba(220, 38, 38, 0.18);
      padding: 10px 30px;
      letter-spacing: 4px;
      text-transform: uppercase;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1;
    }
    .content-layer {
      position: relative;
      z-index: 2;
    }
    .letterhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 8px;
    }
    .company-logo-left {
      width: 72px;
      height: 72px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .company-info {
      text-align: center;
      flex: 1;
    }
    .company-info h1 {
      font-size: 13.5pt;
      font-weight: 900;
      letter-spacing: 0.03em;
      color: #020617;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .tagline {
      font-size: 8.5pt;
      font-weight: 700;
      color: #065f46;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 3px;
    }
    .company-info .address {
      font-size: 9pt;
      color: #334155;
      font-weight: 700;
      line-height: 1.35;
      text-transform: uppercase;
    }
    .contact {
      font-size: 8pt;
      color: #64748b;
      margin-top: 2px;
    }
    .company-logo-right {
      width: 72px;
      height: 72px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .header-divider {
      border-bottom: 2px solid #0f172a;
      margin: 8px 0 12px 0;
    }
    .memo-banner {
      margin: 10px 0 14px 0;
      padding: 8px 0;
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      text-align: center;
    }
    .memo-banner-title {
      font-size: 16pt;
      font-weight: 900;
      letter-spacing: 0.35em;
      color: #020617;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .memo-banner-sub {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9.5pt;
      color: #334155;
      font-weight: 700;
      padding: 4px 6px 0 6px;
      border-top: 1px solid #e2e8f0;
    }
    .ref-pill {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 900;
      color: #0f172a;
    }
    .classification-tag {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 8pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .metadata-table {
      width: 100%;
      margin-top: 8px;
      margin-bottom: 12px;
      border-collapse: collapse;
      font-size: 10.5pt;
    }
    .metadata-table td {
      padding: 3.5px 0;
      vertical-align: top;
    }
    .meta-label {
      width: 90px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      font-size: 10.5pt;
    }
    .meta-val {
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      font-size: 10.5pt;
    }
    .meta-subject {
      font-weight: 900;
      color: #020617;
    }
    .section-divider {
      border-bottom: 2px solid #0f172a;
      margin-bottom: 18px;
    }
    .memo-body {
      font-size: 10.5pt;
      line-height: 1.75;
      color: #0f172a;
      white-space: pre-wrap;
      font-weight: 500;
      text-align: justify;
      text-justify: inter-word;
    }
    .signatories-grid {
      margin-top: 36px;
      display: grid;
      grid-template-columns: ${signatoryLayout === "dual" ? "1fr 1fr" : "1fr"};
      gap: 28px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-box {
      text-align: left;
    }
    .sig-header-label {
      font-size: 8.5pt;
      font-weight: 900;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .sig-signature-area {
      height: 54px;
      display: flex;
      align-items: flex-end;
    }
    .sig-img {
      max-height: 54px;
      max-width: 210px;
      object-fit: contain;
      margin-bottom: -6px;
    }
    .sig-empty-space {
      height: 38px;
    }
    .sig-rule {
      width: 240px;
      border-bottom: 2px solid #020617;
      margin-top: 2px;
      margin-bottom: 6px;
    }
    .sig-name {
      font-size: 10.5pt;
      font-weight: 900;
      color: #020617;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .sig-title {
      font-size: 9.5pt;
      color: #1e293b;
      font-weight: 700;
    }
    .sig-comp {
      font-size: 9pt;
      color: #475569;
      font-weight: 600;
    }
    .memo-footer {
      margin-top: 50px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer-top-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      color: #64748b;
      font-weight: 800;
      letter-spacing: 0.05em;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
    }
    .footer-mandate {
      color: #020617;
      font-weight: 900;
    }
    .footer-division {
      text-align: center;
      font-size: 8pt;
      font-weight: 900;
      color: #94a3b8;
      letter-spacing: 0.22em;
      margin-top: 4px;
    }
    @media print {
      body {
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .memo-container {
        border: none;
        padding: 0;
        margin-bottom: 0;
        min-height: auto;
      }
    }
  </style>
</head>
<body>
  ${sheetsHtml}

  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

    printWindow.document.write(printHtml);
    printWindow.document.close();
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
                  onClick={() => setEmailModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black px-4 py-2 text-xs shadow-md shadow-emerald-700/20 transition cursor-pointer"
                  title="Send via Email to employee recipients of active entities"
                >
                  <Send size={15} />
                  <span>Send via Email ({recipientEmails.length})</span>
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
                      <div className="flex items-center gap-2">
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
                      </div>

                      <div className="flex items-center gap-3">
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
                              <span>Untoggle / Exclude</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={13} />
                              <span>Include in Memo</span>
                            </>
                          )}
                        </button>

                        {isIncluded && (
                          <button
                            type="button"
                            onClick={() => handlePrintMemo(company)}
                            className="text-[11px] text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer"
                            title={`Print only the ${company.name} memorandum`}
                          >
                            Print this copy only
                          </button>
                        )}
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

                    {/* Executive A4 Sheet Representation */}
                    <div
                      style={{
                        zoom: previewZoom === 100 ? undefined : `${previewZoom}%`,
                      }}
                      className={`relative w-full bg-white border border-slate-300 rounded-sm shadow-xl p-8 sm:p-12 min-h-[960px] overflow-hidden select-none transition-all duration-150 ${
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

                      {/* Foreground Content */}
                      <div className="relative z-10 space-y-3">
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
                        <div className="mt-2 mb-2 border-b-2 border-slate-900"></div>

                        {/* Prominent MEMORANDUM Title Banner with Ref No & Classification */}
                        <div className="py-2.5 my-2 border-y-2 border-slate-900 text-center space-y-1">
                          <h2 className="text-lg sm:text-xl font-black tracking-[0.35em] text-slate-950 uppercase leading-none font-sans">
                            MEMORANDUM
                          </h2>
                          <div className="flex items-center justify-between text-[11px] px-2 font-bold pt-1.5 border-t border-slate-200">
                            <span className="text-slate-700 font-bold">
                              REF NO: <strong className="text-slate-950 font-mono font-black">{compMemoRef}</strong>
                            </span>
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                              {memoCategory}
                            </span>
                          </div>
                        </div>

                        {/* Official HR Memo Header Grid */}
                        <div className="space-y-1.5 text-xs py-2">
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
                        <div className="border-b-2 border-slate-900 my-2"></div>

                        {/* Memo Body Content */}
                        <div className="pt-2 text-[12.5px] sm:text-[13px] text-slate-900 font-normal leading-[1.8] font-sans whitespace-pre-wrap text-justify min-h-[260px]">
                          {memoContent || (
                            <span className="text-slate-400 italic">
                              (No directives entered. Return to Step 2 to write or generate them with AI.)
                            </span>
                          )}
                        </div>

                        {/* Signatory Block with E-Signatures and Crisp Solid Underline */}
                        <div className="pt-8">
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

                        {/* Bottom Official Division Footer */}
                        <div className="pt-16 pb-2">
                          <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-[9.5px] sm:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            <span>OFFICE OF THE HUMAN RESOURCES &amp; ADMINISTRATION</span>
                            <span className="font-black text-slate-800">STRICT COMPLIANCE MANDATED</span>
                            <span>{company.code} • OFFICIAL TRANSMISSION</span>
                          </div>
                          <div className="text-center text-[9px] text-slate-400 font-black uppercase tracking-[0.25em] mt-1.5">
                            HUMAN RESOURCE MANAGEMENT DIVISION
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

      {/* ================= MODAL: DIRECT EMAIL DISPATCH ================= */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Send size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Dispatch Memo to Personnel
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Official transmission for {distributionCompany.name}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Official HR Sender:</span>
                <span className="font-mono font-bold text-emerald-800 text-[11px] truncate ml-2">
                  {HR_OFFICIAL_EMAIL}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-400">Target Entity:</span>
                <span className="font-bold text-slate-800 text-[11px] truncate ml-2">
                  {distributionCompany.code}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-950 flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-700" />
                  Target Recipients:
                </span>
                <span className="font-mono font-black text-emerald-800 bg-emerald-200/80 px-2.5 py-0.5 rounded-full text-[10px]">
                  {recipientEmails.length} Email{recipientEmails.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="max-h-28 overflow-y-auto rounded-xl bg-white border border-emerald-200/80 p-2.5 text-[11px] font-mono text-slate-700 space-y-1">
                {recipientEmails.map((email, idx) => (
                  <div key={idx} className="flex items-center justify-between py-0.5 border-b border-slate-50 last:border-0">
                    <span className="truncate">{email}</span>
                    <CheckCircle2 size={12} className="text-emerald-600 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Memo Ref:</span>
                <span className="font-bold font-mono text-slate-800">{distributionMemoRef}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-400 font-bold text-[10px] uppercase shrink-0">Subject:</span>
                <span className="font-bold text-emerald-900 truncate text-right">{memoSubject}</span>
              </div>
            </div>

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

            <button
              type="button"
              disabled={isSendingDirect || recipientEmails.length === 0}
              onClick={handleSendDirect}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-black text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 disabled:opacity-60 transition cursor-pointer"
            >
              {isSendingDirect ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Delivering memo via {HR_OFFICIAL_EMAIL}...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Memo to {recipientEmails.length} Personnel ({HR_OFFICIAL_EMAIL})</span>
                </>
              )}
            </button>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
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
