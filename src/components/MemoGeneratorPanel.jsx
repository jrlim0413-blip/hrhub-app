import { useState, useMemo, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { toBlob as htmlToImageBlob } from "html-to-image";
import {
  FileText, Building2, Send, Printer, Copy, Check, Sparkles,
  Layers, RefreshCw, X, Mail, Eye, Sliders, CheckCircle2,
  AlertCircle, Users, UserPlus, PenTool, Calendar, Bookmark,
  RotateCcw, ArrowRight, ArrowLeft, ExternalLink, Zap,
  ChevronLeft, ChevronRight, LayoutGrid,
  Maximize2, ZoomIn, ZoomOut, Save, Archive, Trash2, Clock, Plus,
  Upload, Image, CheckSquare, Square, XCircle, Code, ShieldCheck, Key,
  Camera, Download, Bold, Italic, Underline, Strikethrough, Highlighter,
  List, ListOrdered, Shapes, Minus, Palette, Heading, Type, Eraser,
  ALargeSmall, CaseUpper, Undo2, Redo2
} from "lucide-react";
import { processSignatureToTransparentPng } from "../lib/signatureImageProcessor";
import { mergeProfilesWithStored } from "../lib/employeeStorage";
import {
  getUserAccountKey,
  getUserSettings,
  getLocalUserSettings,
  saveUserSettings
} from "../lib/userSettingsStorage";
import {
  getSavedMemosFromDb,
  saveMemoRecordToDb,
  deleteMemoRecordFromDb,
  getAllGlobalMemoRefs,
  SAVED_MEMOS_TABLE
} from "../lib/savedMemosStorage";
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
    name: "Glowing Fortune OPC",
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
    defaultSignatoryCompany: "Glowing Fortune OPC",
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

const LETTERHEAD_FIELDS = ["legalName", "tagline", "address", "contact"];

const filterValidLetterheadFields = (letterheadMap) => {
  if (!letterheadMap || typeof letterheadMap !== "object" || Array.isArray(letterheadMap)) return {};

  return COMPANIES.reduce((defaults, company) => {
    const savedFields = letterheadMap[company.id];
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

/**
 * Remove HTML tags from text for plain text representations (clipboard, plaintext email, word count)
 */
export function stripHtml(content) {
  if (!content) return "";
  return content.replace(/<[^>]*>/g, "");
}

/**
 * Convert integer to Roman Numeral string (e.g. 1 -> I, 4 -> IV)
 */
export function toRoman(num) {
  const map = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
  let roman = "";
  for (let key in map) {
    while (num >= map[key]) {
      roman += key;
      num -= map[key];
    }
  }
  return roman || "I";
}

/**
 * Render memorandum directives with rich HTML formatting and Markdown shortcuts support
 */
export function renderMemoDirectivesHtml(content) {
  if (!content) return "";
  let html = content;
  // Markdown bold **text** -> <b>$1</b>
  html = html.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  // Markdown italic *text* (excluding text inside tags)
  html = html.replace(/(?<![<a-zA-Z0-9])\*([^*\n]+)\*(?![a-zA-Z0-9>])/g, "<i>$1</i>");
  // Markdown highlight ==text== -> <mark ...>$1</mark>
  html = html.replace(/==(.*?)==/g, '<mark style="background-color: #fef08a; color: #713f12; padding: 1px 5px; border-radius: 3px; font-weight: 600;">$1</mark>');
  // Markdown strikethrough ~~text~~ -> <s>$1</s>
  html = html.replace(/~~(.*?)~~/g, "<s>$1</s>");

  // If content has markdown numbered lists ("1. " or "1) ") or bullets ("- ", "* ", "• ")
  // and is not already wrapped in <ol> or <ul>, convert to clean HTML lists
  if (!html.includes("<ol") && !html.includes("<ul")) {
    const lines = html.split(/\r?\n/);
    let inOl = false;
    let inUl = false;
    const processed = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const olMatch = line.match(/^\s*(\d+)[\.\)]\s+(.*)$/);
      const ulMatch = line.match(/^\s*[\-\*\•]\s+(.*)$/);

      if (olMatch) {
        if (inUl) {
          processed.push("</ul>");
          inUl = false;
        }
        if (!inOl) {
          processed.push('<ol style="list-style-type: decimal; padding-left: 24px; margin: 6px 0;">');
          inOl = true;
        }
        processed.push(`<li style="margin-bottom: 3px;">${olMatch[2]}</li>`);
      } else if (ulMatch) {
        if (inOl) {
          processed.push("</ol>");
          inOl = false;
        }
        if (!inUl) {
          processed.push('<ul style="list-style-type: disc; padding-left: 24px; margin: 6px 0;">');
          inUl = true;
        }
        processed.push(`<li style="margin-bottom: 3px;">${ulMatch[1]}</li>`);
      } else {
        if (inOl) {
          processed.push("</ol>");
          inOl = false;
        }
        if (inUl) {
          processed.push("</ul>");
          inUl = false;
        }
        processed.push(line);
      }
    }
    if (inOl) processed.push("</ol>");
    if (inUl) processed.push("</ul>");
    html = processed.join("\n");
  }

  return html;
}

export const DIRECTIVE_FONT_FAMILIES = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif", preview: "Standard Clean" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif", preview: "Formal Memo Standard" },
  { label: "Georgia", value: "Georgia, serif", preview: "Executive Serif" },
  { label: "Segoe UI", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", preview: "Corporate Modern" },
  { label: "Calibri", value: "Calibri, 'Segoe UI', sans-serif", preview: "Contemporary Office" },
  { label: "Roboto", value: "Roboto, sans-serif", preview: "Clean Digital" },
  { label: "Courier New", value: "'Courier New', Courier, monospace", preview: "Technical / Monospace" }
];

export const DIRECTIVE_FONT_SIZES = [
  { label: "9 pt (Compact)", value: 12 },
  { label: "10 pt (Standard)", value: 13.3 },
  { label: "11 pt (Executive)", value: 14.6 },
  { label: "12 pt (Formal)", value: 16 },
  { label: "13 pt (Large)", value: 17.3 },
  { label: "14 pt (Extra Large)", value: 18.6 },
  { label: "16 pt (Prominent)", value: 21.3 }
];

/**
 * In-memory registry of references used in current active browser session
 * to guarantee immediate uniqueness across all tabs/drafts before DB persistence.
 */
const sessionUsedRefs = new Set();

/**
 * Replace company code in a reference while strictly preserving the date-sequence suffix (e.g. 261023-01).
 */
export function getCompanySpecificMemoRef(companyCode = "LBC", baseRef = "") {
  if (!baseRef) return `MEMO-${new Date().getFullYear()}-${companyCode}`;
  const parts = String(baseRef).trim().split("-");
  if (parts.length >= 4) {
    const prefix = parts.slice(0, 2).join("-"); // "MEMO-2026"
    const suffix = parts.slice(3).join("-"); // "261023-01" or "001"
    return `${prefix}-${companyCode}-${suffix}`;
  }
  return baseRef.replace(/-(?:LBC|SARG|SIMCON|GTI|RMC|FES|OPC)-/i, `-${companyCode}-`);
}

/**
 * Generate sequential, unique memorandum reference across all accounts.
 * Pattern: MEMO-[YEAR]-[CODE]-[YY][MMDD]-[SEQ (starting at 01)]
 * Example: MEMO-2026-LBC-261023-01
 */
export function generateUniqueMemoRef(companyCode = "LBC", allKnownRefs = []) {
  const now = new Date();
  const fullYear = now.getFullYear();
  const yy = String(fullYear).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateTag = `${yy}${mm}${dd}`; // e.g. "261023"

  const candidatePool = new Set([
    ...sessionUsedRefs,
    ...(Array.isArray(allKnownRefs) ? allKnownRefs : [])
  ]);

  let maxSeq = 0;
  const dateTagRegex = new RegExp(`(?:${dateTag})[-_]?(\\d+)`, "i");

  for (const ref of candidatePool) {
    if (!ref || typeof ref !== "string") continue;
    const match = ref.match(dateTagRegex);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(2, "0");
  const generatedRef = `MEMO-${fullYear}-${companyCode}-${dateTag}-${seqStr}`;
  sessionUsedRefs.add(generatedRef);
  return generatedRef;
}

export function registerUsedMemoRef(ref) {
  if (ref && typeof ref === "string") {
    sessionUsedRefs.add(ref.trim());
  }
}

export default function MemoGeneratorPanel({
  onClose,
  profiles = [],
  currentUser = null,
  initialDraft = null,
  onOpenAiBuddy,
  onNavigateToDirectory
}) {
  const userAccountKey = useMemo(() => getUserAccountKey(currentUser), [currentUser]);
  const initialUserSettings = useMemo(() => getLocalUserSettings(currentUser), [currentUser]);
  const isSettingsInitialized = useRef(false);

  // Stepper State: 1 = Header & Addressing, 2 = Body Directives, 3 = Signatories, 4 = Final Memo & Multi-Company
  const [currentStep, setCurrentStep] = useState(1);
  const [unlinkedNoticeModalOpen, setUnlinkedNoticeModalOpen] = useState(false);

  // Selected Company State - Default to Lucky Betplay Corporation (LBC)
  const [selectedCompanyId, setSelectedCompanyId] = useState("lucky_betplay");
  const [savedLetterheadDefaults, setSavedLetterheadDefaults] = useState(() => {
    return filterValidLetterheadFields(initialUserSettings.letterheadDefaults);
  });
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
  const [memoRef, setMemoRef] = useState(() => generateUniqueMemoRef("LBC"));
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

  // Directives Editor Refs & WYSIWYG Live Formatting States
  const liveEditorRef = useRef(null);
  const modalLiveEditorRef = useRef(null);
  const [directivesFontFamily, setDirectivesFontFamily] = useState(() => {
    return initialUserSettings.directives?.fontFamily || "Arial, Helvetica, sans-serif";
  });
  const [directivesFontSize, setDirectivesFontSize] = useState(() => {
    return Number(initialUserSettings.directives?.fontSize) || 13.3;
  });
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);
  const [colorMenuOpen, setColorMenuOpen] = useState(false);
  const [clausesMenuOpen, setClausesMenuOpen] = useState(false);

  // Synchronize contentEditable div innerHTML when memoContent is changed externally
  useEffect(() => {
    const formattedHtml = memoContent ? renderMemoDirectivesHtml(memoContent) : "";
    if (liveEditorRef.current && document.activeElement !== liveEditorRef.current) {
      if (liveEditorRef.current.innerHTML !== formattedHtml) {
        liveEditorRef.current.innerHTML = formattedHtml;
      }
    }
    if (modalLiveEditorRef.current && document.activeElement !== modalLiveEditorRef.current) {
      if (modalLiveEditorRef.current.innerHTML !== formattedHtml) {
        modalLiveEditorRef.current.innerHTML = formattedHtml;
      }
    }
  }, [memoContent, currentStep, magnifyModalOpen, isSourceMode]);

  // Auto-close toolbar popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".memo-toolbar-menu-container")) {
        setShapesMenuOpen(false);
        setHighlightMenuOpen(false);
        setColorMenuOpen(false);
        setClausesMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSetFontFamily = (font) => {
    setDirectivesFontFamily(font);
    saveUserSettings(currentUser, { directives: { fontFamily: font, fontSize: directivesFontSize } });
  };

  const handleSetFontSize = (size) => {
    const clamped = Math.max(9, Math.min(26, Number(size) || 13.3));
    setDirectivesFontSize(clamped);
    saveUserSettings(currentUser, { directives: { fontFamily: directivesFontFamily, fontSize: clamped } });
  };

  const getActiveEditor = () => {
    if (magnifyModalOpen && modalLiveEditorRef.current) return modalLiveEditorRef.current;
    return liveEditorRef.current;
  };

  const handleLiveEditorInput = (e) => {
    const html = e.currentTarget.innerHTML;
    setMemoContent(html);
  };

  const executeCommand = (command, value = null) => {
    const editor = getActiveEditor();
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
    setMemoContent(editor.innerHTML);
  };

  const insertHtmlAtCursor = (html) => {
    const editor = getActiveEditor();
    if (!editor) {
      setMemoContent((prev) => (prev ? prev + "\n" + html : html));
      return;
    }
    editor.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node;
      let lastNode;
      while ((node = tempDiv.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      editor.innerHTML += html;
    }
    setMemoContent(editor.innerHTML);
  };

  const transformSelectedToUppercase = () => {
    const editor = getActiveEditor();
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().toUpperCase();
    document.execCommand("insertText", false, text);
    setMemoContent(editor.innerHTML);
  };

  const handleUndo = () => {
    const editor = getActiveEditor();
    if (!editor) return;
    editor.focus();
    document.execCommand("undo", false, null);
    setMemoContent(editor.innerHTML);
  };

  const handleRedo = () => {
    const editor = getActiveEditor();
    if (!editor) return;
    editor.focus();
    document.execCommand("redo", false, null);
    setMemoContent(editor.innerHTML);
  };

  const handleEditorKeyDown = (e) => {
    // Undo shortcut: Ctrl+Z / Cmd+Z (or Redo if Shift is held: Ctrl+Shift+Z)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }

    // Redo shortcut: Ctrl+Y / Cmd+Y
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      handleRedo();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertHTML", false, "&nbsp;&nbsp;&nbsp;&nbsp;");
      const editor = getActiveEditor();
      if (editor) setMemoContent(editor.innerHTML);
      return;
    }

    // Auto-detect list prefix when pressing Space at the beginning of a line (e.g. "1. " or "- ")
    if (e.key === " ") {
      const sel = window.getSelection();
      if (sel && sel.isCollapsed && sel.anchorNode) {
        const textNode = sel.anchorNode;
        if (textNode.nodeType === Node.TEXT_NODE) {
          const textBeforeCursor = textNode.textContent.slice(0, sel.anchorOffset).trim();
          // Check for "1." or "1)"
          if (/^(\d+)[\.\)]$/.test(textBeforeCursor)) {
            e.preventDefault();
            textNode.textContent = textNode.textContent.slice(sel.anchorOffset);
            document.execCommand("insertOrderedList", false, null);
            const editor = getActiveEditor();
            if (editor) setMemoContent(editor.innerHTML);
            return;
          }
          // Check for "-", "*", "•"
          if (/^[\-\*\•]$/.test(textBeforeCursor)) {
            e.preventDefault();
            textNode.textContent = textNode.textContent.slice(sel.anchorOffset);
            document.execCommand("insertUnorderedList", false, null);
            const editor = getActiveEditor();
            if (editor) setMemoContent(editor.innerHTML);
            return;
          }
        }
      }
    }
  };

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
  const [signatoryLabel, setSignatoryLabel] = useState("ISSUED BY:");
  const [signatoryName, setSignatoryName] = useState("JEVINCE JAYE S. JUBAY, CHRP");
  const [signatoryTitle, setSignatoryTitle] = useState("HRMD Manager");
  const [signatoryCompany, setSignatoryCompany] = useState(selectedCompany.name);
  const [approverLabel, setApproverLabel] = useState("NOTED & APPROVED BY:");
  const [approverName, setApproverName] = useState("CHARMIE JEAN M. SIMPAL");
  const [approverTitle, setApproverTitle] = useState("President & CEO");

  // E-Signatures (Loaded from and saved to user account settings)
  const [signatorySignature, setSignatorySignature] = useState(() => {
    return initialUserSettings.signatory?.signature || null;
  });
  const [approverSignature, setApproverSignature] = useState(() => {
    return initialUserSettings.approver?.signature || null;
  });

  // Signature Position Offsets & Sizes (Horizontal, Vertical alignment & Scale)
  const [signatoryOffsetX, setSignatoryOffsetX] = useState(() => {
    return initialUserSettings.signatory?.offsetX ?? 48;
  });
  const [signatoryOffsetY, setSignatoryOffsetY] = useState(() => {
    return initialUserSettings.signatory?.offsetY ?? -3;
  });
  const [signatorySize, setSignatorySize] = useState(() => {
    return initialUserSettings.signatory?.size ?? 56;
  });

  const [approverOffsetX, setApproverOffsetX] = useState(() => {
    return initialUserSettings.approver?.offsetX ?? 48;
  });
  const [approverOffsetY, setApproverOffsetY] = useState(() => {
    return initialUserSettings.approver?.offsetY ?? -3;
  });
  const [approverSize, setApproverSize] = useState(() => {
    return initialUserSettings.approver?.size ?? 56;
  });

  useEffect(() => {
    if (!isSettingsInitialized.current) return;
    saveUserSettings(currentUser, {
      signatory: {
        offsetX: signatoryOffsetX,
        offsetY: signatoryOffsetY,
        size: signatorySize
      }
    });
  }, [signatoryOffsetX, signatoryOffsetY, signatorySize, currentUser]);

  useEffect(() => {
    if (!isSettingsInitialized.current) return;
    saveUserSettings(currentUser, {
      approver: {
        offsetX: approverOffsetX,
        offsetY: approverOffsetY,
        size: approverSize
      }
    });
  }, [approverOffsetX, approverOffsetY, approverSize, currentUser]);

  // Step 4: Preview, Zoom & Watermark States
  const [previewZoom, setPreviewZoom] = useState(100); // 90, 100, 110
  const [paperSize, setPaperSize] = useState("auto"); // "auto" | "short" | "a4" | "legal13" | "legal14"
  const [previewEntityIndex, setPreviewEntityIndex] = useState(0);
  const [previewViewMode, setPreviewViewMode] = useState("slide"); // "slide" | "scroll"
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

  const safePreviewIndex = Math.min(
    Math.max(0, previewEntityIndex),
    Math.max(0, companiesToPreview.length - 1)
  );

  // Keyboard navigation for Step 4 Memorandum Output Viewer (Left / Right Arrow Keys)
  useEffect(() => {
    if (currentStep !== 4) return;
    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target?.tagName)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPreviewEntityIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setPreviewEntityIndex((prev) => Math.min(companiesToPreview.length - 1, prev + 1));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, companiesToPreview.length]);
  const distributionCompany = activeCompanies.find((company) => company.id === selectedCompanyId) || activeCompanies[0] || selectedCompany;
  const distributionMemoRef = selectedCompanyId === distributionCompany.id
    ? memoRef
    : getCompanySpecificMemoRef(distributionCompany.code, memoRef);
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

  // Saved Memos Archive State (Loaded from and saved to Supabase 'saved_memos' table per account)
  const [savedMemos, setSavedMemos] = useState([]);
  const [isLoadingSavedMemos, setIsLoadingSavedMemos] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoadingSavedMemos(true);
        const [{ memos }, globalRefs] = await Promise.all([
          getSavedMemosFromDb(currentUser),
          getAllGlobalMemoRefs()
        ]);
        if (isMounted) {
          setSavedMemos(memos || []);
          if (!initialDraft?.ref && !initialUserSettings?.activeDraft?.ref) {
            setMemoRef((prevRef) => {
              const compCode = selectedCompany?.code || "LBC";
              return generateUniqueMemoRef(compCode, globalRefs);
            });
          }
        }
      } catch (err) {
        console.warn("Failed to load saved memos from Supabase:", err);
      } finally {
        if (isMounted) setIsLoadingSavedMemos(false);
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser]);

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Email & Dispatch States (Company-Specific Segregation)
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [customWebhookUrl, setCustomWebhookUrl] = useState(() => {
    return (
      initialUserSettings.emailWebhookUrl ||
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_HR_EMAIL_WEBHOOK_URL ? import.meta.env.VITE_HR_EMAIL_WEBHOOK_URL : "") ||
      ""
    ).trim();
  });
  const [showScriptGuideModal, setShowScriptGuideModal] = useState(false);
  const [copiedScriptNotice, setCopiedScriptNotice] = useState(false);
  const [isEditingWebhook, setIsEditingWebhook] = useState(false);
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  const [directSendStatus, setDirectSendStatus] = useState(null);
  const [copyingImageId, setCopyingImageId] = useState(null);
  const [copiedImageId, setCopiedImageId] = useState(null);
  const [imageCopyToast, setImageCopyToast] = useState(null);
  const [companyLogoDataMap, setCompanyLogoDataMap] = useState({});
  const [fadedWatermarkMap, setFadedWatermarkMap] = useState({});
  const [groupEmblemDataUrl, setGroupEmblemDataUrl] = useState("");

  // Automatically load account default settings from Supabase ('user_settings' table) on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { settings } = await getUserSettings(currentUser);
        if (!isMounted || !settings) {
          isSettingsInitialized.current = true;
          return;
        }

        if (settings.letterheadDefaults && Object.keys(settings.letterheadDefaults).length > 0) {
          const filtered = filterValidLetterheadFields(settings.letterheadDefaults);
          setSavedLetterheadDefaults(filtered);
          setLetterheadOverrides(filtered);
        }

        if (settings.directives?.fontFamily) {
          setDirectivesFontFamily(settings.directives.fontFamily);
        }
        if (settings.directives?.fontSize) {
          setDirectivesFontSize(Number(settings.directives.fontSize));
        }
        if (settings.paperSize) {
          setPaperSize(settings.paperSize);
        }

        if (settings.signatory) {
          if (settings.signatory.name) setSignatoryName(settings.signatory.name);
          if (settings.signatory.title) setSignatoryTitle(settings.signatory.title);
          if (settings.signatory.label) setSignatoryLabel(settings.signatory.label);
          if (settings.signatory.signature !== undefined) setSignatorySignature(settings.signatory.signature);
          if (settings.signatory.size) setSignatorySize(Number(settings.signatory.size));
          if (settings.signatory.offsetX !== undefined) setSignatoryOffsetX(Number(settings.signatory.offsetX));
          if (settings.signatory.offsetY !== undefined) setSignatoryOffsetY(Number(settings.signatory.offsetY));
        }

        if (settings.approver) {
          if (settings.approver.name) setApproverName(settings.approver.name);
          if (settings.approver.title) setApproverTitle(settings.approver.title);
          if (settings.approver.label) setApproverLabel(settings.approver.label);
          if (settings.approver.signature !== undefined) setApproverSignature(settings.approver.signature);
          if (settings.approver.size) setApproverSize(Number(settings.approver.size));
          if (settings.approver.offsetX !== undefined) setApproverOffsetX(Number(settings.approver.offsetX));
          if (settings.approver.offsetY !== undefined) setApproverOffsetY(Number(settings.approver.offsetY));
        }

        if (settings.signatoryLayout) {
          setSignatoryLayout(settings.signatoryLayout);
        }

        if (settings.watermark) {
          if (settings.watermark.size) setWatermarkSize(Number(settings.watermark.size));
          if (settings.watermark.opacity !== undefined) setWatermarkOpacity(Number(settings.watermark.opacity));
          if (settings.watermark.showDiagonalStamp !== undefined) setShowDiagonalStamp(Boolean(settings.watermark.showDiagonalStamp));
          if (settings.watermark.diagonalStampText) setDiagonalStampText(settings.watermark.diagonalStampText);
        }

        if (settings.includedCompanyIds && Array.isArray(settings.includedCompanyIds)) {
          setIncludedCompanyIds(settings.includedCompanyIds);
        }

        if (settings.emailWebhookUrl) {
          setCustomWebhookUrl(settings.emailWebhookUrl);
        }
      } catch (err) {
        console.warn("Account defaults auto-load notice:", err);
      } finally {
        if (isMounted) {
          isSettingsInitialized.current = true;
        }
      }
    })();

    return () => { isMounted = false; };
  }, [currentUser]);

  // Seamless Background Auto-Save: Automatically and seamlessly persists any changed defaults per account in Supabase
  useEffect(() => {
    if (!isSettingsInitialized.current) return;

    const timer = setTimeout(() => {
      saveUserSettings(currentUser, {
        directives: {
          fontFamily: directivesFontFamily,
          fontSize: directivesFontSize
        },
        signatory: {
          name: signatoryName,
          title: signatoryTitle,
          label: signatoryLabel,
          signature: signatorySignature,
          size: signatorySize,
          offsetX: signatoryOffsetX,
          offsetY: signatoryOffsetY
        },
        approver: {
          name: approverName,
          title: approverTitle,
          label: approverLabel,
          signature: approverSignature,
          size: approverSize,
          offsetX: approverOffsetX,
          offsetY: approverOffsetY
        },
        signatoryLayout,
        letterheadDefaults: savedLetterheadDefaults,
        headerDefaults: {
          defaultTo: memoTo,
          defaultFrom: memoFrom,
          defaultSubject: memoSubject
        },
        watermark: {
          size: watermarkSize,
          opacity: watermarkOpacity,
          showDiagonalStamp,
          diagonalStampText
        },
        includedCompanyIds,
        emailWebhookUrl: customWebhookUrl
      });
    }, 600);

    return () => clearTimeout(timer);
  }, [
    currentUser,
    directivesFontFamily,
    directivesFontSize,
    signatoryName,
    signatoryTitle,
    signatoryLabel,
    signatorySignature,
    signatorySize,
    signatoryOffsetX,
    signatoryOffsetY,
    approverName,
    approverTitle,
    approverLabel,
    approverSignature,
    approverSize,
    approverOffsetX,
    approverOffsetY,
    signatoryLayout,
    savedLetterheadDefaults,
    memoTo,
    memoFrom,
    memoSubject,
    watermarkSize,
    watermarkOpacity,
    showDiagonalStamp,
    diagonalStampText,
    includedCompanyIds,
    customWebhookUrl
  ]);

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
    saveUserSettings(currentUser, { emailWebhookUrl: trimmed });
    setIsEditingWebhook(false);
  };

  // Sync initial draft from HRHub Ai Buddy if provided or stored in user settings
  useEffect(() => {
    let draft = initialDraft;
    if (!draft && initialUserSettings.activeDraft) {
      draft = initialUserSettings.activeDraft;
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
      if (draft.signatoryLabel) setSignatoryLabel(draft.signatoryLabel.trim());
      if (draft.signatoryName) setSignatoryName(draft.signatoryName.trim());
      if (draft.signatoryTitle) setSignatoryTitle(draft.signatoryTitle.trim());
      if (draft.approverLabel) setApproverLabel(draft.approverLabel.trim());
      if (draft.approverName) setApproverName(draft.approverName.trim());
      if (draft.approverTitle) setApproverTitle(draft.approverTitle.trim());
      if (draft.content) {
        setMemoContent(cleanDirectivesBody(draft.content));
      }
    }
  }, [initialDraft, initialUserSettings]);

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
      const compMemoRef = getCompanySpecificMemoRef(comp.code, memoRef);

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
    setMemoRef((prevRef) => getCompanySpecificMemoRef(comp.code, prevRef));
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

  const saveLetterheadDefaults = async () => {
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
      setSavedLetterheadDefaults(nextSavedDefaults);
      setLetterheadOverrides((previous) => ({ ...previous, [selectedCompanyId]: savedFields }));
      setDirtyLetterheadCompanyIds((previous) => previous.filter((id) => id !== selectedCompanyId));
      await saveUserSettings(currentUser, { letterheadDefaults: nextSavedDefaults });
      setLetterheadStatus({ type: "success", message: `Letterhead saved to account defaults for ${company.name}.` });
    } catch (error) {
      console.error("Could not save memo letterhead defaults:", error);
      setLetterheadStatus({ type: "error", message: "Could not save letterhead defaults. Please try again." });
    }
  };

  const restoreLetterheadDefaults = async () => {
    const nextSavedDefaults = { ...savedLetterheadDefaults };
    const nextOverrides = { ...letterheadOverrides };
    delete nextSavedDefaults[selectedCompanyId];
    delete nextOverrides[selectedCompanyId];

    try {
      setSavedLetterheadDefaults(nextSavedDefaults);
      setLetterheadOverrides(nextOverrides);
      setDirtyLetterheadCompanyIds((previous) => previous.filter((id) => id !== selectedCompanyId));
      await saveUserSettings(currentUser, { letterheadDefaults: nextSavedDefaults });
      setLetterheadStatus({ type: "success", message: `Original letterhead restored for ${selectedCompany.name}.` });
    } catch (error) {
      console.error("Could not restore memo letterhead defaults:", error);
      setLetterheadStatus({ type: "error", message: "Could not restore the original letterhead. Please try again." });
    }
  };

  // E-Signature Upload & Removal Handlers (Per User Account)
  const handleSignatureUpload = async (event, setSignature, roleKey, roleLabel) => {
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
      await saveUserSettings(currentUser, {
        [roleKey]: { signature: processedSignature }
      });
    } catch (error) {
      console.error(`Could not save ${roleLabel.toLowerCase()} signature:`, error);
      alert("The signature was converted for this session but could not be saved to account settings.");
    } finally {
      event.target.value = "";
    }
  };

  const handleUploadSignatorySignature = (event) =>
    handleSignatureUpload(event, setSignatorySignature, "signatory", "Signatory");

  const handleRemoveSignatorySignature = async () => {
    setSignatorySignature(null);
    try {
      await saveUserSettings(currentUser, {
        signatory: { signature: null }
      });
    } catch { }
  };

  const handleUploadApproverSignature = (event) =>
    handleSignatureUpload(event, setApproverSignature, "approver", "Approver");

  const handleRemoveApproverSignature = async () => {
    setApproverSignature(null);
    try {
      await saveUserSettings(currentUser, {
        approver: { signature: null }
      });
    } catch { }
  };

  // Save Memo to Records / Database Archive (Supabase 'saved_memos' table per account)
  const handleSaveMemoToArchive = async () => {
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
      signatoryLabel,
      signatoryName,
      signatoryTitle,
      signatoryCompany: getSignatoryAffiliation(distributionCompany),
      approverLabel,
      approverName,
      approverTitle,
      signatoryLayout,
      directivesFontFamily,
      directivesFontSize,
      signatorySignature,
      approverSignature,
      signatoryOffsetX,
      signatoryOffsetY,
      signatorySize,
      approverOffsetX,
      approverOffsetY,
      approverSize,
      savedAt: new Date().toISOString()
    };

    const updated = [newMemo, ...savedMemos.filter((m) => m.ref !== distributionMemoRef || m.companyId !== distributionCompany.id)];
    setSavedMemos(updated);
    registerUsedMemoRef(distributionMemoRef);

    try {
      const res = await saveMemoRecordToDb(currentUser, newMemo);
      if (res.syncedToSupabase) {
        setImageCopyToast({
          type: "success",
          message: `✓ Memo '${distributionMemoRef}' saved to Supabase table for ${userAccountKey}!`
        });
      }
    } catch (e) {
      console.error("Failed to save memo to database:", e);
    }
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3500);
  };

  // Delete saved memo from database
  const handleDeleteSavedMemo = async (id) => {
    const filtered = savedMemos.filter((m) => m.id !== id);
    setSavedMemos(filtered);
    try {
      await deleteMemoRecordFromDb(currentUser, id);
    } catch (e) {
      console.error("Failed to delete memo from database:", e);
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
    if (m.signatoryLabel) setSignatoryLabel(m.signatoryLabel);
    if (m.signatoryName) setSignatoryName(m.signatoryName);
    if (m.signatoryTitle) setSignatoryTitle(m.signatoryTitle);
    setSignatoryCompany(resolveSignatoryAffiliation(memoCompany, m.signatoryCompany));
    if (m.approverLabel) setApproverLabel(m.approverLabel);
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

${stripHtml(memoContent)}

-----------------------------------------------------
${signatoryLabel?.trim() ? `${signatoryLabel.trim()}\n` : ""}${signatoryName}
${signatoryTitle}
${getSignatoryAffiliation(distributionCompany)}

${signatoryLayout === "dual" ? `${approverLabel?.trim() ? `${approverLabel.trim()}\n` : ""}${approverName}
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
    const compMemoRef = getCompanySpecificMemoRef(comp.code, memoRef);
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
${stripHtml(memoContent)}

--------------------------------------------------
${signatoryLabel?.trim() ? `${signatoryLabel.trim()}\n` : ""}${signatoryName}
${signatoryTitle}
${getSignatoryAffiliation(comp)}

${signatoryLayout === "dual" ? `${approverLabel?.trim() ? `${approverLabel.trim()}\n` : ""}${approverName}
${approverTitle}
${compLegal}
` : ""}
Please acknowledge receipt of this memorandum. Official PDF is attached.

Office of the Human Resources & Corporate Administration
${compLegal}
HR Contact: ${HR_OFFICIAL_EMAIL}`;
  };

  const generateCompanyEmailHtml = (targetComp = distributionCompany, preferredPaper = paperSize) => {
    const comp = targetComp || distributionCompany;
    const addrLines = formatAddressLines(escapeHtml(comp.address || ""));
    const addressHtml = addrLines.length > 1
      ? `${addrLines[0]}<br>${addrLines[1]}`
      : addrLines[0];
    const compMemoRef = getCompanySpecificMemoRef(comp.code, memoRef);
    const compLegal = comp.legalName || comp.name;
    const metrics = getMemoFitMetrics(memoContent, preferredPaper);
    const effectiveSigSize = Number(signatorySize) || 52;
    const effectiveAppSize = Number(approverSize) || 52;

    // Exact email paper sheet height mirroring the selected bond paper size (width: 680px)
    let emailMinHeightPx = 962; // Standard A4 (210 x 297 mm)
    let emailPadding = "26px 34px 20px 34px";

    if (metrics.isShort) {
      emailMinHeightPx = 880; // Short Bond / Letter (8.5 x 11 in)
      emailPadding = "24px 34px 20px 34px";
    } else if (metrics.effectivePaper === "legal14") {
      emailMinHeightPx = 1120; // US Legal (8.5 x 14 in)
      emailPadding = "18px 34px 16px 34px";
    } else if (metrics.isLegal) {
      emailMinHeightPx = 1040; // Long Bond / Folio (8.5 x 13 in)
      emailPadding = "20px 34px 16px 34px";
    }

    // Category badge color accents
    let catBadgeBg = "#d1fae5";
    let catBadgeColor = "#065f46";
    let catBadgeBorder = "#6ee7b7";
    if (memoCategory === "Mandatory Compliance") {
      catBadgeBg = "#d1fae5";
      catBadgeColor = "#065f46";
      catBadgeBorder = "#6ee7b7";
    } else if (memoCategory === "Executive Order") {
      catBadgeBg = "#eff6ff";
      catBadgeColor = "#1e40af";
      catBadgeBorder = "#bfdbfe";
    } else if (memoCategory === "Safety & Health") {
      catBadgeBg = "#fffbeb";
      catBadgeColor = "#92400e";
      catBadgeBorder = "#fde68a";
    }

    // Safe Background Watermark: Applied directly as CSS background-image on the paper sheet container.
    // This prevents email clients (like Gmail / Outlook) from stripping position:absolute and pushing the watermark to the top!
    const watermarkUrl = fadedWatermarkMap[comp.id] || companyLogoDataMap[comp.id] || comp.logoUrl;
    const watermarkBgStyle = watermarkUrl
      ? `background-image: url('${watermarkUrl}'); background-repeat: no-repeat; background-position: center 48%; background-size: ${Math.round((watermarkSize || 280) * 0.95)}px auto;`
      : "";

    return `<div style="background-color: #f1f5f9; padding: 24px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Exactly mirrors the Official Executive Memorandum White Paper Document for: ${metrics.paperLabel} -->
  <div style="max-width: 680px; width: 100%; min-height: ${emailMinHeightPx}px; margin: 0 auto; background-color: #ffffff; ${watermarkBgStyle} border: 1px solid #cbd5e1; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); padding: ${emailPadding}; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; position: relative; color: #0f172a;">
    
    <!-- Top & Body Section (Flush Top) -->
    <div style="width: 100%;">
      
      <!-- 1. Corporate Letterhead Table (Left Logo, Center Info, Right Emblem) -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
        <tr>
          <td style="width: 72px; vertical-align: middle; text-align: left;">
            ${(companyLogoDataMap[comp.id] || comp.logoUrl) ? `
              <img src="${companyLogoDataMap[comp.id] || comp.logoUrl}" style="max-height: ${metrics.logoMaxHeight || '52px'}; max-width: 70px; display: block; object-fit: contain;" alt="${escapeHtml(comp.name)} Logo">
            ` : ""}
          </td>
          <td style="vertical-align: middle; text-align: center; padding: 0 10px;">
            <h1 style="font-size: ${metrics.letterheadTitleSize || '14pt'}; font-weight: 900; color: #020617; text-transform: uppercase; margin: 0; letter-spacing: 0.3px; line-height: 1.15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              ${escapeHtml(compLegal)}
            </h1>
            ${comp.tagline ? `<div style="font-size: 7.5pt; color: #047857; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px;">${escapeHtml(comp.tagline)}</div>` : ""}
            <div style="font-size: 7.5pt; color: #334155; font-weight: 600; text-transform: uppercase; margin-top: 1px; line-height: 1.25;">${addressHtml}</div>
            <div style="font-size: 7pt; color: #64748b; font-weight: 500; margin-top: 0.5px;">${escapeHtml(comp.contact || "")}</div>
          </td>
          <td style="width: 72px; vertical-align: middle; text-align: right;">
            ${(groupEmblemDataUrl || comp.rightLogoUrl || CORPORATE_GROUP_EMBLEM) ? `
              <img src="${groupEmblemDataUrl || comp.rightLogoUrl || CORPORATE_GROUP_EMBLEM}" style="max-height: ${metrics.logoMaxHeight || '50px'}; max-width: 68px; display: inline-block; object-fit: contain; border-radius: 4px;" alt="Corporate Group Emblem">
            ` : ""}
          </td>
        </tr>
      </table>

      <!-- Top Letterhead Divider Line -->
      <div style="border-bottom: 2px solid #0f172a; margin: 3px 0 5px 0;"></div>

      <!-- 2. Prominent MEMORANDUM Title Banner with Ref No & Classification -->
      <div style="border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: ${metrics.bannerPadding || '4px 4px'}; margin: 3px 0 5px 0; text-align: center;">
        <h2 style="font-size: ${metrics.bannerTitleSize || '14pt'}; font-weight: 900; letter-spacing: 0.35em; color: #020617; text-transform: uppercase; margin: 0; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          MEMORANDUM
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 3px; padding-top: 3px; border-top: 1px solid #e2e8f0; font-size: 8pt; font-weight: 700;">
          <tr>
            <td style="text-align: left; color: #334155;">
              REF NO: <strong style="color: #020617; font-family: monospace; font-weight: 900;">${compMemoRef}</strong>
            </td>
            <td style="text-align: right;">
              <span style="display: inline-block; padding: 1px 10px; border-radius: 9999px; font-size: 7.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; background: ${catBadgeBg}; color: ${catBadgeColor}; border: 1px solid ${catBadgeBorder};">
                ${memoCategory}
              </span>
            </td>
          </tr>
        </table>
      </div>

      <!-- 3. Official HR Memo Header Grid (Step 4 Format) - Standard 12pt -->
      <div style="padding: ${metrics.headerPadding || '2px 0'}; font-size: 12pt; line-height: 1.45;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 90px; font-size: 12pt; font-weight: 900; color: #0f172a; text-transform: uppercase; padding: 2px 0;">TO:</td>
            <td style="font-size: 12pt; font-weight: 800; color: #020617; text-transform: uppercase; letter-spacing: 0.2px; padding: 2px 0;">${memoTo}</td>
          </tr>
          <tr>
            <td style="width: 90px; font-size: 12pt; font-weight: 900; color: #0f172a; text-transform: uppercase; padding: 2px 0;">FROM:</td>
            <td style="font-size: 12pt; font-weight: 800; color: #020617; text-transform: uppercase; letter-spacing: 0.2px; padding: 2px 0;">${memoFrom}</td>
          </tr>
          <tr>
            <td style="width: 90px; font-size: 12pt; font-weight: 900; color: #0f172a; text-transform: uppercase; padding: 2px 0;">DATE:</td>
            <td style="font-size: 12pt; font-weight: 800; color: #020617; text-transform: uppercase; letter-spacing: 0.2px; padding: 2px 0;">${memoDate}</td>
          </tr>
          <tr>
            <td style="width: 90px; font-size: 12pt; font-weight: 900; color: #0f172a; text-transform: uppercase; padding: 2px 0;">SUBJECT:</td>
            <td style="font-size: 12pt; font-weight: 900; color: #020617; text-transform: uppercase; letter-spacing: -0.2px; padding: 2px 0;">${memoSubject}</td>
          </tr>
        </table>
      </div>

      <!-- Solid Divider between Header and Directives -->
      <div style="border-bottom: 2px solid #0f172a; margin: 3px 0 6px 0;"></div>

      <!-- 4. Directives Body Content with Bullet/Numbered Lists -->
      <div class="memo-directives-content" style="font-family: ${directivesFontFamily}; font-size: ${directivesFontSize}px; line-height: ${metrics.bodyLineHeight}; color: #0f172a; font-weight: 400; text-align: justify; padding: ${metrics.directivesPadding || '4px 0 16px 0'};">
        <style>
          .memo-directives-content ol { list-style-type: decimal !important; margin: 6px 0 !important; padding-left: 24px !important; }
          .memo-directives-content ul { list-style-type: disc !important; margin: 6px 0 !important; padding-left: 24px !important; }
          .memo-directives-content li { display: list-item !important; margin-bottom: 4px !important; }
        </style>
${renderMemoDirectivesHtml(memoContent)}
      </div>

      <!-- 5. Signatory Sign-off Block -->
      <div style="margin-top: ${metrics.sigMarginTop || '18px'}; padding-top: 2px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
          <tr>
            <td style="width: ${signatoryLayout === "dual" ? "50%" : "auto"}; max-width: ${signatoryLayout === "dual" ? "none" : "320px"}; vertical-align: top; text-align: left; padding-right: 18px;">
              ${signatoryLabel?.trim() ? `<p style="margin: 0 0 1px 0; color: #475569; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(signatoryLabel.trim())}</p>` : ""}
              <div style="height: ${Math.max(48, effectiveSigSize + 6)}px; display: flex; align-items: flex-end;">
                ${signatorySignature ? `
                  <img src="${signatorySignature}" style="height: ${effectiveSigSize}px; max-height: ${effectiveSigSize}px; max-width: ${Math.round(effectiveSigSize * 3.5)}px; display: block; margin-left: ${signatoryOffsetX}px; margin-bottom: ${signatoryOffsetY}px; position: relative; z-index: 2; object-fit: contain; object-position: bottom left;" alt="Signatory Signature">
                ` : '<div style="height: 24px; margin-bottom: 2px;"></div>'}
              </div>
              <p style="margin: 0; font-weight: 900; color: #020617; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.2px; position: relative; z-index: 1;">${escapeHtml(signatoryName)}</p>
              <p style="margin: 1px 0 0 0; color: #334155; font-size: 8pt; font-weight: 700;">${escapeHtml(signatoryTitle)}</p>
              <p style="margin: 1px 0 0 0; color: #64748b; font-weight: 600; font-size: 7.5pt;">${escapeHtml(getSignatoryAffiliation(comp))}</p>
            </td>
            ${signatoryLayout === "dual" ? `
            <td style="width: 50%; vertical-align: top; text-align: left; padding-left: 18px;">
              ${approverLabel?.trim() ? `<p style="margin: 0 0 1px 0; color: #475569; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(approverLabel.trim())}</p>` : ""}
              <div style="height: ${Math.max(48, effectiveAppSize + 6)}px; display: flex; align-items: flex-end;">
                ${approverSignature ? `
                  <img src="${approverSignature}" style="height: ${effectiveAppSize}px; max-height: ${effectiveAppSize}px; max-width: ${Math.round(effectiveAppSize * 3.5)}px; display: block; margin-left: ${approverOffsetX}px; margin-bottom: ${approverOffsetY}px; position: relative; z-index: 2; object-fit: contain; object-position: bottom left;" alt="Approver Signature">
                ` : '<div style="height: 24px; margin-bottom: 2px;"></div>'}
              </div>
              <p style="margin: 0; font-weight: 900; color: #020617; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.2px; position: relative; z-index: 1;">${escapeHtml(approverName)}</p>
              <p style="margin: 1px 0 0 0; color: #334155; font-size: 8pt; font-weight: 700;">${escapeHtml(approverTitle)}</p>
              <p style="margin: 1px 0 0 0; color: #64748b; font-weight: 600; font-size: 7.5pt;">${escapeHtml(compLegal)}</p>
            </td>` : ""}
          </tr>
        </table>
      </div>
    </div>

    <!-- 6. Bottom Section: Official Division Footer (Guaranteed Visible at Bottom Edge of Bond Paper Sheet) -->
    <div style="margin-top: 26px; padding-top: 4px; padding-bottom: 1px; width: 100%;">
      <div style="border-top: 1px solid #cbd5e1; padding-top: 2.5px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 6.8pt; font-weight: 500; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
          <tr>
            <td style="text-align: left; font-weight: 500;">HUMAN RESOURCES &amp; ADMINISTRATION</td>
            <td style="text-align: center; font-weight: 600; color: #0f172a; letter-spacing: 1.2px;">STRICT COMPLIANCE MANDATED</td>
            <td style="text-align: right; font-weight: 500;">${comp.code} • OFFICIAL TRANSMISSION</td>
          </tr>
        </table>
      </div>
      <div style="text-align: center; font-size: 5.8pt; color: #64748b; font-weight: 400; text-transform: uppercase; letter-spacing: 1.8px; margin-top: 1px;">
        CORPORATE EXECUTIVE RECORD • CONFIDENTIAL TRANSMISSION
      </div>
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
  const getMemoFitMetrics = (content = memoContent, preferredPaper = paperSize) => {
    const rawText = stripHtml(content || "").trim();
    const charLen = rawText.length;
    const lineCount = rawText.split(/\r?\n/).filter(Boolean).length;

    // Determine target paper size (Auto, Short 8.5x11, A4, Long 8.5x13, Legal 8.5x14)
    let effectivePaper = preferredPaper || "auto";
    if (effectivePaper === "auto") {
      effectivePaper = (charLen > 950 || lineCount > 15) ? "legal13" : "a4";
    }

    const isShort = effectivePaper === "short" || effectivePaper === "letter";
    const isLegal14 = effectivePaper === "legal14";
    const isLegal13 = effectivePaper === "legal13" || effectivePaper === "legal" || effectivePaper === "long";
    const isLegal = isLegal13 || isLegal14;

    // Dynamically tuned print page margins:
    // On Long Bond (8.5 × 13 in) and Legal (8.5 × 14 in), the top margin is reduced (from 8-10mm down to 3.5mm)
    // so the header sits higher and the bottom division footer is 100% visible and not cut off on printouts.
    // Standard sizes (A4 / Short) maintain safe 8mm top margin to avoid physical printer top-roller clipping.
    const topMarginMm = isLegal ? 3.5 : 8;
    const bottomMarginMm = isLegal ? 5.5 : 7;
    const pageMargin = `${topMarginMm}mm 6mm ${bottomMarginMm}mm 6mm`;

    // Exact physical dimensions and printable heights (paper height minus top & bottom margins)
    let paperSizeCss = "A4 portrait";
    let paperLabel = "A4 (210 × 297 mm)";
    let paperBadgeLabel = "A4 (210×297)";
    let sheetHeightMm = 281; // 297mm - 8mm - 7mm - 1mm buffer
    let sheetWidthMm = 198;  // 210mm - 12mm
    let aspectRatioCss = "210 / 297";
    let previewMinHeightPx = 990;

    if (isShort) {
      paperSizeCss = "8.5in 11in";
      paperLabel = "Short Bond (8.5 × 11 in / Letter)";
      paperBadgeLabel = "Short (8.5×11)";
      sheetHeightMm = 263; // 279.4mm - 8mm - 7mm - 1.4mm buffer
      sheetWidthMm = 203.9;
      aspectRatioCss = "8.5 / 11";
      previewMinHeightPx = 920;
    } else if (isLegal14) {
      paperSizeCss = "8.5in 14in";
      paperLabel = "Legal (8.5 × 14 in)";
      paperBadgeLabel = "Legal (8.5×14)";
      sheetHeightMm = 345; // 355.6mm - 3.5mm - 5.5mm - 1.6mm buffer
      sheetWidthMm = 203.9;
      aspectRatioCss = "8.5 / 14";
      previewMinHeightPx = 1180;
    } else if (isLegal) {
      paperSizeCss = "8.5in 13in";
      paperLabel = "Long Bond (8.5 × 13 in / Folio)";
      paperBadgeLabel = "Long (8.5×13)";
      sheetHeightMm = 320; // 330.2mm - 3.5mm - 5.5mm - 1.2mm buffer
      sheetWidthMm = 203.9;
      aspectRatioCss = "8.5 / 13";
      previewMinHeightPx = 1090;
    }

    // Dynamic Density Tuning for Guaranteed 1-Page Fit across all paper sizes
    let isCompact = false;
    let isUltraCompact = false;

    if (isShort) {
      if (charLen > 1050 || lineCount > 17) {
        isUltraCompact = true;
        isCompact = true;
      } else if (charLen > 550 || lineCount > 10) {
        isCompact = true;
      }
    } else if (!isLegal) {
      if (charLen > 1300 || lineCount > 21) {
        isUltraCompact = true;
        isCompact = true;
      } else if (charLen > 700 || lineCount > 12) {
        isCompact = true;
      }
    } else {
      if (charLen > 1800 || lineCount > 27) {
        isUltraCompact = true;
        isCompact = true;
      } else if (charLen > 1050 || lineCount > 16) {
        isCompact = true;
      }
    }

    // CRITICAL: Strictly respect user's configured directivesFontSize and signature sizes without auto-downscaling
    const directivesFontSizePx = Number(directivesFontSize) || 13.3;
    let directivesLineHeight = "1.6";
    let directivesPadding = "4px 0";
    let sigMarginTop = "24px";
    let bannerPadding = "4px 4px";
    let bannerTitleSize = "14pt";
    let logoMaxHeight = "54px";
    let letterheadTitleSize = "13.5pt";
    let headerPadding = "2.5px 0";
    const effectiveSignatorySize = Number(signatorySize) || 52;
    const effectiveApproverSize = Number(approverSize) || 52;

    if (isUltraCompact) {
      directivesLineHeight = isShort ? "1.26" : "1.30";
      directivesPadding = "1.5px 0";
      sigMarginTop = isShort ? "4px" : isLegal ? "10px" : "6px";
      bannerPadding = "2.5px 4px";
      bannerTitleSize = "12pt";
      logoMaxHeight = isShort ? "38px" : "44px";
      letterheadTitleSize = isShort ? "11.5pt" : "12pt";
      headerPadding = "1px 0";
    } else if (isCompact) {
      directivesLineHeight = isShort ? "1.38" : "1.44";
      directivesPadding = "3px 0";
      sigMarginTop = isShort ? "10px" : isLegal ? "18px" : "12px";
      bannerPadding = "3.5px 4px";
      bannerTitleSize = "13pt";
      logoMaxHeight = isShort ? "46px" : "50px";
      letterheadTitleSize = isShort ? "12.5pt" : "13pt";
      headerPadding = "2px 0";
    } else {
      directivesLineHeight = isShort ? "1.52" : isLegal ? "1.65" : "1.58";
      sigMarginTop = isShort ? "18px" : isLegal ? "28px" : "22px";
    }

    return {
      effectivePaper,
      isShort,
      isLegal,
      isLongPaper: isLegal,
      isCompact,
      isUltraCompact,
      paperSizeCss,
      paperSize: paperSizeCss,
      paperLabel,
      paperBadgeLabel,
      pageMargin,
      sheetHeightMm,
      sheetWidthMm,
      aspectRatioCss,
      previewMinHeightPx,
      directivesFontSizePx,
      directivesLineHeight,
      directivesPadding,
      sigMarginTop,
      bannerPadding,
      bannerTitleSize,
      logoMaxHeight,
      letterheadTitleSize,
      headerPadding,
      effectiveSignatorySize,
      effectiveApproverSize,
      bodyLineHeight: directivesLineHeight,
    };
  };

  const generateCompanyPrintHtml = (targetComp = distributionCompany, preferredPaper = paperSize) => {
    const comp = targetComp || distributionCompany;
    const addrLines = formatAddressLines(escapeHtml(comp.address || ""));
    const addressHtml = addrLines.length > 1
      ? `${addrLines[0]}<br>${addrLines[1]}`
      : addrLines[0];
    const compMemoRef = getCompanySpecificMemoRef(comp.code, memoRef);
    const compLegal = comp.legalName || comp.name;
    const metrics = getMemoFitMetrics(memoContent, preferredPaper);
    const effectiveSigSize = Number(signatorySize) || 52;
    const effectiveAppSize = Number(approverSize) || 52;

    return `
      <div class="memo-print-sheet" style="position: relative; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; height: ${metrics.sheetHeightMm}mm; max-height: ${metrics.sheetHeightMm}mm; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; padding: ${metrics.isLegal ? '0 1mm 1.5mm 1mm' : '0 1mm 2mm 1mm'}; margin: 0; background: #ffffff; color: #0f172a;">
        
        <!-- ================= COMPANY-SPECIFIC EXECUTIVE WATERMARK LAYER ================= -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: ${watermarkSize}px; height: ${watermarkSize}px; pointer-events: none; z-index: 0; user-select: none; display: flex; align-items: center; justify-content: center; opacity: ${watermarkOpacity / 100};">
          <img src="${companyLogoDataMap[comp.id] || comp.logoUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; filter: grayscale(15%);" alt="${escapeHtml(comp.name)} Watermark" />
        </div>

        ${showDiagonalStamp ? `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); pointer-events: none; z-index: 1; white-space: nowrap; border: 3px dashed rgba(225, 29, 72, 0.22); color: rgba(225, 29, 72, 0.22); font-weight: 900; font-size: 18pt; padding: 10px 32px; letter-spacing: 5px; text-transform: uppercase;">
          ${escapeHtml(diagonalStampText)}
        </div>` : ""}

        <!-- Foreground Official Content (Flush top, flexible middle, sagad sa pinaka-baba footer) -->
        <div style="position: relative; z-index: 10; display: flex; flex-direction: column; justify-content: space-between; flex: 1; height: 100%; min-height: 100%; width: 100%;">
          
          <!-- Top Section: Letterhead + Memorandum Title Banner + Header Grid + Directives (Step 4 Format) -->
          <div style="display: flex; flex-direction: column; margin-top: 0; padding-top: 0;">
            
            <!-- Corporate Letterhead (Left Logo, Center Details, Right Emblem) -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;">
              <tr>
                <td style="width: 72px; vertical-align: middle; text-align: left;">
                  ${(companyLogoDataMap[comp.id] || comp.logoUrl) ? `
                    <img src="${companyLogoDataMap[comp.id] || comp.logoUrl}" style="max-height: ${metrics.logoMaxHeight || '52px'}; max-width: 70px; display: block; object-fit: contain;" alt="${escapeHtml(comp.name)} Logo">
                  ` : ""}
                </td>
                <td style="vertical-align: middle; text-align: center; padding: 0 10px;">
                  <h1 style="font-size: ${metrics.letterheadTitleSize || '14pt'}; font-weight: 900; color: #020617; text-transform: uppercase; margin: 0; letter-spacing: 0.3px; line-height: 1.15; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${escapeHtml(compLegal)}
                  </h1>
                  ${comp.tagline ? `<div style="font-size: 7.5pt; color: #047857; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px;">${escapeHtml(comp.tagline)}</div>` : ""}
                  <div style="font-size: 7.5pt; color: #334155; font-weight: 600; text-transform: uppercase; margin-top: 1px; line-height: 1.25;">${addressHtml}</div>
                  <div style="font-size: 7pt; color: #64748b; font-weight: 500; margin-top: 0.5px;">${escapeHtml(comp.contact || "")}</div>
                </td>
                <td style="width: 72px; vertical-align: middle; text-align: right;">
                  ${(groupEmblemDataUrl || comp.rightLogoUrl || CORPORATE_GROUP_EMBLEM) ? `
                    <img src="${groupEmblemDataUrl || comp.rightLogoUrl || CORPORATE_GROUP_EMBLEM}" style="max-height: ${metrics.logoMaxHeight || '50px'}; max-width: 68px; display: inline-block; object-fit: contain; border-radius: 4px;" alt="Corporate Group Emblem">
                  ` : ""}
                </td>
              </tr>
            </table>

            <!-- Top Letterhead Divider Line -->
            <div style="border-bottom: 2px solid #0f172a; margin: 3px 0 5px 0;"></div>

            <!-- Prominent MEMORANDUM Title Banner with Ref No & Classification -->
            <div style="border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: ${metrics.bannerPadding || '4px 4px'}; margin: 3px 0 5px 0; text-align: center;">
              <h2 style="font-size: ${metrics.bannerTitleSize || '14pt'}; font-weight: 900; letter-spacing: 0.35em; color: #020617; text-transform: uppercase; margin: 0; line-height: 1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                MEMORANDUM
              </h2>
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8pt; font-weight: 700; padding-top: 3px; margin-top: 3px; border-top: 1px solid #e2e8f0;">
                <span style="color: #334155;">
                  REF NO: <strong style="color: #020617; font-family: monospace; font-weight: 900;">${compMemoRef}</strong>
                </span>
                <span style="display: inline-block; padding: 1px 10px; border-radius: 9999px; font-size: 7.5pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7;">
                  ${memoCategory}
                </span>
              </div>
            </div>

            <!-- Official HR Memo Header Grid (Step 4 Format) - Standard 12pt -->
            <div style="padding: ${metrics.headerPadding || '2px 0'}; font-size: 12pt; line-height: 1.45;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 90px; font-size: 12pt; font-weight: 900; color: #0f172a; text-transform: uppercase; padding: 2px 0;">TO:</td>
                  <td style="font-size: 12pt; font-weight: 800; color: #020617; text-transform: uppercase; letter-spacing: 0.2px; padding: 2px 0;">${memoTo}</td>
                </tr>
                <tr>
                  <td style="width: 90px; font-size: 12pt; font-weight: 900; color: #0f172a; text-transform: uppercase; padding: 2px 0;">FROM:</td>
                  <td style="font-size: 12pt; font-weight: 800; color: #020617; text-transform: uppercase; letter-spacing: 0.2px; padding: 2px 0;">${memoFrom}</td>
                </tr>
                <tr>
                  <td style="width: 90px; font-size: 12pt; font-weight: 900; color: #0f172a; text-transform: uppercase; padding: 2px 0;">DATE:</td>
                  <td style="font-size: 12pt; font-weight: 800; color: #020617; text-transform: uppercase; letter-spacing: 0.2px; padding: 2px 0;">${memoDate}</td>
                </tr>
                <tr>
                  <td style="width: 90px; font-size: 12pt; font-weight: 900; color: #0f172a; text-transform: uppercase; padding: 2px 0;">SUBJECT:</td>
                  <td style="font-size: 12pt; font-weight: 900; color: #020617; text-transform: uppercase; letter-spacing: -0.2px; padding: 2px 0;">${memoSubject}</td>
                </tr>
              </table>
            </div>

            <!-- Solid Divider between Header and Directives -->
            <div style="border-bottom: 2px solid #0f172a; margin: 3px 0 6px 0;"></div>

            <!-- Directives Body Content -->
            <div class="memo-directives-content" style="font-family: ${directivesFontFamily}; font-size: ${directivesFontSize}px; line-height: ${metrics.bodyLineHeight}; color: #0f172a; font-weight: 400; text-align: justify; white-space: pre-wrap; padding: ${metrics.directivesPadding || '4px 0'};">
${renderMemoDirectivesHtml(memoContent)}
            </div>

            <!-- Signatory Sign-off Block -->
            <div style="margin-top: ${metrics.sigMarginTop}; padding-top: 2px; page-break-inside: avoid; break-inside: avoid;">
              <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                <tr>
                  <td style="width: ${signatoryLayout === "dual" ? "50%" : "auto"}; max-width: ${signatoryLayout === "dual" ? "none" : "320px"}; vertical-align: top; text-align: left; padding-right: 18px;">
                    ${signatoryLabel?.trim() ? `<p style="margin: 0 0 1px 0; color: #475569; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(signatoryLabel.trim())}</p>` : ""}
                    <div style="height: ${Math.max(48, effectiveSigSize + 6)}px; display: flex; align-items: flex-end;">
                      ${signatorySignature ? `
                        <img src="${signatorySignature}" style="height: ${effectiveSigSize}px; max-height: ${effectiveSigSize}px; max-width: ${Math.round(effectiveSigSize * 3.5)}px; display: block; margin-left: ${signatoryOffsetX}px; margin-bottom: ${signatoryOffsetY}px; position: relative; z-index: 2; object-fit: contain; object-position: bottom left;" alt="Signatory Signature">
                      ` : '<div style="height: 24px; margin-bottom: 2px;"></div>'}
                    </div>
                    <p style="margin: 0; font-weight: 900; color: #020617; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.2px; position: relative; z-index: 1;">${escapeHtml(signatoryName)}</p>
                    <p style="margin: 1px 0 0 0; color: #334155; font-size: 8pt; font-weight: 700;">${escapeHtml(signatoryTitle)}</p>
                    <p style="margin: 1px 0 0 0; color: #64748b; font-weight: 600; font-size: 7.5pt;">${escapeHtml(getSignatoryAffiliation(comp))}</p>
                  </td>
                  ${signatoryLayout === "dual" ? `
                  <td style="width: 50%; vertical-align: top; text-align: left; padding-left: 18px;">
                    ${approverLabel?.trim() ? `<p style="margin: 0 0 1px 0; color: #475569; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(approverLabel.trim())}</p>` : ""}
                    <div style="height: ${Math.max(48, effectiveAppSize + 6)}px; display: flex; align-items: flex-end;">
                      ${approverSignature ? `
                        <img src="${approverSignature}" style="height: ${effectiveAppSize}px; max-height: ${effectiveAppSize}px; max-width: ${Math.round(effectiveAppSize * 3.5)}px; display: block; margin-left: ${approverOffsetX}px; margin-bottom: ${approverOffsetY}px; position: relative; z-index: 2; object-fit: contain; object-position: bottom left;" alt="Approver Signature">
                      ` : '<div style="height: 24px; margin-bottom: 2px;"></div>'}
                    </div>
                    <p style="margin: 0; font-weight: 900; color: #020617; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.2px; position: relative; z-index: 1;">${escapeHtml(approverName)}</p>
                    <p style="margin: 1px 0 0 0; color: #334155; font-size: 8pt; font-weight: 700;">${escapeHtml(approverTitle)}</p>
                    <p style="margin: 1px 0 0 0; color: #64748b; font-weight: 600; font-size: 7.5pt;">${escapeHtml(compLegal)}</p>
                  </td>` : ""}
                </tr>
              </table>
            </div>
          </div>

          <!-- Bottom Section: Official Division Footer (Guaranteed Visible at Bottom Edge) -->
          <div style="margin-top: auto; padding-top: 3px; padding-bottom: 1px; margin-bottom: 0; flex-shrink: 0; width: 100%;">
            <div style="border-top: 1px solid #cbd5e1; padding-top: 2.5px; display: flex; justify-content: space-between; align-items: center; font-size: 6.8pt; font-weight: 500; color: #475569; text-transform: uppercase; letter-spacing: 0.8px;">
              <span style="font-weight: 500;">HUMAN RESOURCES &amp; ADMINISTRATION</span>
              <span style="font-weight: 600; color: #0f172a; letter-spacing: 1.2px;">STRICT COMPLIANCE MANDATED</span>
              <span style="font-weight: 500;">${comp.code} • OFFICIAL TRANSMISSION</span>
            </div>
            <div style="text-align: center; font-size: 5.8pt; color: #64748b; font-weight: 400; text-transform: uppercase; letter-spacing: 1.8px; margin-top: 1px;">
              CORPORATE EXECUTIVE RECORD • CONFIDENTIAL TRANSMISSION
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
    const metrics = getMemoFitMetrics(memoContent, paperSize);

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
          htmlBody: generateCompanyEmailHtml(comp, paperSize),
          pdfHtml: generateCompanyPrintHtml(comp, paperSize),
          body: generateEmailBody(comp),
          senderEmail: HR_OFFICIAL_EMAIL,
          isLongPaper: metrics.isLongPaper,
          paperSize: metrics.paperSize
        };
      });

    if (dispatchesPayload.length === 0) {
      setDirectSendStatus({
        type: "error",
        message: "No pre-registered employee work emails are linked for active companies. Dispatch is restricted."
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

    const metrics = getMemoFitMetrics(memoContent, paperSize);

    // Strictly respect Final Memo Distribution selections
    let companiesToPrint = [];
    if (targetCompany && targetCompany !== "all") {
      const single = typeof targetCompany === "string"
        ? (companies.find((company) => company.id === targetCompany) || distributionCompany)
        : targetCompany;
      companiesToPrint = [single];
    } else {
      // Print All: Filter strictly by active / included companies in Final Memo Distribution
      companiesToPrint = companies.filter((comp) => includedCompanyIds.includes(comp.id));
      if (companiesToPrint.length === 0) {
        companiesToPrint = [distributionCompany];
      }
    }

    const sheetsHtml = companiesToPrint.map((comp) => {
      return generateCompanyPrintHtml(comp, paperSize);
    }).join("");

    const printHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${memoRef} - ${memoSubject} (${metrics.paperLabel})</title>
  <style>
    @page {
      size: ${metrics.paperSizeCss};
      margin: ${metrics.pageMargin};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      margin: 0;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .memo-print-sheet {
      width: 100%;
      height: ${metrics.sheetHeightMm}mm;
      min-height: ${metrics.sheetHeightMm}mm;
      max-height: ${metrics.sheetHeightMm}mm;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-before: always;
      break-before: page;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
      padding: ${metrics.isLegal ? '0 1mm 1.5mm 1mm' : '0 1mm 2mm 1mm'};
      margin: 0;
      background: #ffffff;
    }
    .memo-print-sheet:first-child {
      page-break-before: avoid !important;
      break-before: avoid !important;
    }
    .memo-print-sheet:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    ol {
      list-style-type: decimal !important;
      margin: 5px 0 !important;
      padding-left: 24px !important;
    }
    ul {
      list-style-type: disc !important;
      margin: 5px 0 !important;
      padding-left: 24px !important;
    }
    li {
      display: list-item !important;
      list-style: inherit !important;
      margin-bottom: 3px !important;
    }
    @media print {
      @page {
        size: ${metrics.paperSizeCss};
        margin: ${metrics.pageMargin};
      }
      html, body {
        width: 100% !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: visible !important;
      }
      .memo-print-sheet {
        width: 100% !important;
        height: ${metrics.sheetHeightMm}mm !important;
        min-height: ${metrics.sheetHeightMm}mm !important;
        max-height: ${metrics.sheetHeightMm}mm !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: ${metrics.isLegal ? '0 1mm 1.5mm 1mm !important' : '0 1mm 2mm 1mm !important'};
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        position: relative !important;
        page-break-before: always !important;
        break-before: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: always !important;
        break-after: page !important;
        overflow: hidden !important;
      }
      ol {
        list-style-type: decimal !important;
        margin: 5px 0 !important;
        padding-left: 24px !important;
      }
      ul {
        list-style-type: disc !important;
        margin: 5px 0 !important;
        padding-left: 24px !important;
      }
      li {
        display: list-item !important;
        list-style: inherit !important;
        margin-bottom: 3px !important;
      }
      .memo-print-sheet:first-child {
        page-break-before: avoid !important;
        break-before: avoid !important;
      }
      .memo-print-sheet:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
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

  // Generate high-resolution image Blob of a company's executive memo sheet
  const generateMemoSheetBlob = async (sheetEl) => {
    const originalZoom = sheetEl.style.zoom;
    const originalTransform = sheetEl.style.transform;

    try {
      sheetEl.style.zoom = "1";
      sheetEl.style.transform = "none";
      await new Promise((r) => setTimeout(r, 60));

      // Engine 1: html-to-image (Native SVG foreignObject - supports modern CSS & oklch)
      try {
        const blob = await htmlToImageBlob(sheetEl, {
          pixelRatio: 2.2,
          backgroundColor: "#ffffff",
          cacheBust: false,
          skipAutoScale: true,
        });
        if (blob && blob.size > 1000) {
          return blob;
        }
      } catch (errHtmlToImage) {
        console.warn("html-to-image failed, falling back to html2canvas:", errHtmlToImage);
      }

      // Engine 2: html2canvas fallback
      const canvas = await html2canvas(sheetEl, {
        scale: 2.2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 15000,
      });

      return await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Canvas conversion produced empty blob"));
        }, "image/png", 1.0);
      });
    } finally {
      sheetEl.style.zoom = originalZoom;
      sheetEl.style.transform = originalTransform;
    }
  };

  // High-Resolution Image Generation & Clipboard Copying (for chat apps: Viber, Messenger, Telegram, WhatsApp, Gmail)
  const handleCopyMemoAsImage = async (company) => {
    const sheetEl = document.getElementById(`memo-sheet-preview-${company.id}`);
    if (!sheetEl) return;

    try {
      setCopyingImageId(company.id);

      const blob = await generateMemoSheetBlob(sheetEl);
      if (!blob) throw new Error("Could not create memo image blob");

      let copiedSuccessfully = false;

      // Modern Clipboard API
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          const item = new ClipboardItem({ "image/png": blob });
          await navigator.clipboard.write([item]);
          copiedSuccessfully = true;
        } catch (clipErr) {
          console.warn("Direct clipboard.write failed (likely browser permission restriction):", clipErr);
        }
      }

      if (copiedSuccessfully) {
        setCopiedImageId(company.id);
        setImageCopyToast({
          type: "success",
          message: `✓ ${company.name} memorandum copied to clipboard! You can now paste (Ctrl+V) directly into Viber, Messenger, Telegram, or Gmail.`
        });
        setTimeout(() => {
          setCopiedImageId(null);
          setImageCopyToast(null);
        }, 5000);
      } else {
        // Fallback: automatically trigger direct PNG download so user always gets the image file!
        const compMemoRef = getCompanySpecificMemoRef(company.code, memoRef);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `${compMemoRef} - ${company.name}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 3000);

        setCopiedImageId(company.id);
        setImageCopyToast({
          type: "fallback",
          message: `✓ Saved ${company.name} image as PNG! (Browser clipboard write permission was restricted, saved to your Downloads instead).`
        });
        setTimeout(() => {
          setCopiedImageId(null);
          setImageCopyToast(null);
        }, 6000);
      }
    } catch (err) {
      console.error("Failed to copy memo image:", err);
      setImageCopyToast({
        type: "error",
        message: `✕ Could not generate image: ${err?.message || "Error"}. Try using the PNG download button.`
      });
      setTimeout(() => setImageCopyToast(null), 5000);
    } finally {
      setCopyingImageId(null);
    }
  };

  const handleDownloadMemoImage = async (company) => {
    const sheetEl = document.getElementById(`memo-sheet-preview-${company.id}`);
    if (!sheetEl) return;

    try {
      setCopyingImageId(company.id);

      const blob = await generateMemoSheetBlob(sheetEl);
      if (!blob) throw new Error("Could not create memo image blob");

      const compMemoRef = getCompanySpecificMemoRef(company.code, memoRef);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${compMemoRef} - ${company.name}.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 3000);

      setCopiedImageId(company.id);
      setImageCopyToast({
        type: "success",
        message: `✓ ${compMemoRef} - ${company.name}.png downloaded successfully!`
      });
      setTimeout(() => {
        setCopiedImageId(null);
        setImageCopyToast(null);
      }, 4000);
    } catch (err) {
      console.error("Failed to download memo image:", err);
      setImageCopyToast({
        type: "error",
        message: `✕ Failed to download image: ${err?.message || "Unknown error"}`
      });
      setTimeout(() => setImageCopyToast(null), 5000);
    } finally {
      setCopyingImageId(null);
    }
  };

  // Render Directives Formatting Toolbar for both Step 2 and Full-Screen Editor
  const renderDirectivesToolbar = () => (
    <div className="memo-toolbar-menu-container flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl relative select-none z-30">
      {/* 0. History: Undo / Redo */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleUndo}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={handleRedo}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
        >
          <Redo2 size={14} />
        </button>
      </div>

      <div className="h-5 w-px bg-slate-300 mx-0.5" />

      {/* 1. Font Style (Family) Selector */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
        <Type size={13} className="text-slate-500 shrink-0" />
        <select
          value={directivesFontFamily}
          onChange={(e) => handleSetFontFamily(e.target.value)}
          className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[150px] truncate"
          title="Change Directives Font Style / Family"
        >
          {DIRECTIVE_FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Font Size Selector & Quick Controls */}
      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
        <button
          type="button"
          onClick={() => handleSetFontSize(directivesFontSize - 1)}
          className="px-1.5 py-0.5 rounded text-[11px] font-black text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          title="Decrease Font Size (A-)"
        >
          A-
        </button>
        <select
          value={directivesFontSize}
          onChange={(e) => handleSetFontSize(Number(e.target.value))}
          className="text-xs font-black text-slate-800 bg-transparent focus:outline-none cursor-pointer px-1 text-center"
          title="Set Exact Font Size"
        >
          {DIRECTIVE_FONT_SIZES.map((sz) => (
            <option key={sz.value} value={sz.value}>
              {sz.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => handleSetFontSize(directivesFontSize + 1)}
          className="px-1.5 py-0.5 rounded text-[11px] font-black text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          title="Increase Font Size (A+)"
        >
          A+
        </button>
      </div>

      <div className="h-5 w-px bg-slate-300 mx-0.5" />

      {/* 3. Basic Formatting: Bold, Italic, Underline, Strikethrough */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => executeCommand("bold")}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-950 font-bold transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Bold (Ctrl+B)"
        >
          <Bold size={14} className="stroke-[2.5]" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("italic")}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-950 italic transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Italic (Ctrl+I)"
        >
          <Italic size={14} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("underline")}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-950 underline transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Underline (Ctrl+U)"
        >
          <Underline size={14} />
        </button>
        <button
          type="button"
          onClick={() => executeCommand("strikeThrough")}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 line-through transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Strikethrough"
        >
          <Strikethrough size={14} />
        </button>
      </div>

      <div className="h-5 w-px bg-slate-300 mx-0.5" />

      {/* 4. Highlight Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setHighlightMenuOpen(!highlightMenuOpen);
            setShapesMenuOpen(false);
            setColorMenuOpen(false);
            setClausesMenuOpen(false);
          }}
          className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${highlightMenuOpen ? "bg-amber-100 border-amber-300 text-amber-950" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-800"
            }`}
          title="Highlight Text with Color"
        >
          <Highlighter size={14} className="text-amber-500" />
          <span className="text-[11px] hidden sm:inline">Highlight</span>
        </button>

        {highlightMenuOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in duration-100">
            <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">Highlight Colors</div>
            <button
              type="button"
              onClick={() => {
                executeCommand("hiliteColor", "#fef08a");
                setHighlightMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-50 flex items-center gap-2 cursor-pointer transition text-slate-800"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-300 border border-yellow-400" />
              <span>Yellow Highlight</span>
            </button>
            <button
              type="button"
              onClick={() => {
                executeCommand("hiliteColor", "#bbf7d0");
                setHighlightMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition text-slate-800"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-300 border border-emerald-400" />
              <span>Green Highlight</span>
            </button>
            <button
              type="button"
              onClick={() => {
                executeCommand("hiliteColor", "#bae6fd");
                setHighlightMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-sky-50 flex items-center gap-2 cursor-pointer transition text-slate-800"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-sky-300 border border-sky-400" />
              <span>Cyan Highlight</span>
            </button>
            <button
              type="button"
              onClick={() => {
                executeCommand("hiliteColor", "#fbcfe8");
                setHighlightMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-pink-50 flex items-center gap-2 cursor-pointer transition text-slate-800"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-pink-300 border border-pink-400" />
              <span>Pink Highlight</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Text Color Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setColorMenuOpen(!colorMenuOpen);
            setShapesMenuOpen(false);
            setHighlightMenuOpen(false);
            setClausesMenuOpen(false);
          }}
          className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${colorMenuOpen ? "bg-rose-50 border-rose-300 text-rose-950" : "bg-white border-slate-200 hover:bg-slate-100 text-slate-800"
            }`}
          title="Text Color"
        >
          <Palette size={14} className="text-rose-600" />
          <span className="text-[11px] hidden sm:inline">Color</span>
        </button>

        {colorMenuOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in duration-100">
            <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">Text Color</div>
            <button
              type="button"
              onClick={() => {
                executeCommand("foreColor", "#dc2626");
                setColorMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer transition"
            >
              <span className="w-3 h-3 rounded-full bg-red-600" />
              <span>Red Alert</span>
            </button>
            <button
              type="button"
              onClick={() => {
                executeCommand("foreColor", "#059669");
                setColorMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition"
            >
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <span>Emerald Green</span>
            </button>
            <button
              type="button"
              onClick={() => {
                executeCommand("foreColor", "#1e40af");
                setColorMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-800 hover:bg-blue-50 flex items-center gap-2 cursor-pointer transition"
            >
              <span className="w-3 h-3 rounded-full bg-blue-800" />
              <span>Navy Blue</span>
            </button>
            <button
              type="button"
              onClick={() => {
                executeCommand("foreColor", "#0f172a");
                setColorMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-900 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition"
            >
              <span className="w-3 h-3 rounded-full bg-slate-900" />
              <span>Dark Slate</span>
            </button>
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-slate-300 mx-0.5" />

      {/* 6. Shapes & Badges Popover ("mag lagay ng shape") */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShapesMenuOpen(!shapesMenuOpen);
            setHighlightMenuOpen(false);
            setColorMenuOpen(false);
            setClausesMenuOpen(false);
          }}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${shapesMenuOpen ? "bg-indigo-100 border-indigo-300 text-indigo-950" : "bg-white border-slate-200 hover:bg-slate-100 text-indigo-800"
            }`}
          title="Shapes, Official Badges & Callout Shape Boxes"
        >
          <Shapes size={14} className="text-indigo-600" />
          <span className="text-[11px]">Shapes &amp; Badges</span>
        </button>

        {shapesMenuOpen && (
          <div className="absolute left-0 sm:left-auto sm:right-0 md:left-0 top-full mt-1.5 w-76 sm:w-84 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 z-50 space-y-3 animate-in fade-in duration-100 max-h-[460px] overflow-y-auto">
            {/* Geometric Shapes & Bullet Symbols */}
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                Geometric Shapes &amp; Bullet Symbols
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { shape: "■ ", label: "Square" },
                  { shape: "● ", label: "Circle" },
                  { shape: "◆ ", label: "Diamond" },
                  { shape: "▲ ", label: "Triangle" },
                  { shape: "★ ", label: "Star" },
                  { shape: "✔ ", label: "Check" },
                  { shape: "➔ ", label: "Arrow" },
                  { shape: "❖ ", label: "Ornate" }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      insertHtmlAtCursor(`<span>${item.shape}</span>`);
                      setShapesMenuOpen(false);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-indigo-50 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    title={`Insert ${item.label}`}
                  >
                    <span className="text-sm font-black text-indigo-600">{item.shape.trim()}</span>
                    <span className="text-[10px] text-slate-600">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Official Directive Shape Badges */}
            <div className="border-t border-slate-100 pt-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                Official Compliance Shape Badges
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    insertHtmlAtCursor('&nbsp;<span style="display: inline-block; background-color: #fee2e2; color: #991b1b; border: 1px solid #f87171; font-weight: 900; font-size: 8pt; padding: 1px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">MANDATORY COMPLIANCE</span>&nbsp;');
                    setShapesMenuOpen(false);
                  }}
                  className="w-full text-left p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] font-black text-red-800 uppercase px-2 py-0.5 rounded bg-red-200/60 border border-red-300">
                    MANDATORY COMPLIANCE
                  </span>
                  <span className="text-[10px] text-red-600 font-semibold">Red Badge</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    insertHtmlAtCursor('&nbsp;<span style="display: inline-block; background-color: #fef3c7; color: #92400e; border: 1px solid #fcd34d; font-weight: 900; font-size: 8pt; padding: 1px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">CONFIDENTIAL</span>&nbsp;');
                    setShapesMenuOpen(false);
                  }}
                  className="w-full text-left p-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 transition flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] font-black text-amber-800 uppercase px-2 py-0.5 rounded bg-amber-200/60 border border-amber-300">
                    CONFIDENTIAL
                  </span>
                  <span className="text-[10px] text-amber-600 font-semibold">Amber Badge</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    insertHtmlAtCursor('&nbsp;<span style="display: inline-block; background-color: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; font-weight: 900; font-size: 8pt; padding: 1px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">FOR IMMEDIATE COMPLIANCE</span>&nbsp;');
                    setShapesMenuOpen(false);
                  }}
                  className="w-full text-left p-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 transition flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] font-black text-blue-800 uppercase px-2 py-0.5 rounded bg-blue-200/60 border border-blue-300">
                    FOR IMMEDIATE COMPLIANCE
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold">Blue Badge</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    insertHtmlAtCursor('&nbsp;<span style="display: inline-block; background-color: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; font-weight: 900; font-size: 8pt; padding: 1px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">OFFICIALLY APPROVED</span>&nbsp;');
                    setShapesMenuOpen(false);
                  }}
                  className="w-full text-left p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition flex items-center justify-between cursor-pointer"
                >
                  <span className="text-[10px] font-black text-emerald-800 uppercase px-2 py-0.5 rounded bg-emerald-200/60 border border-emerald-300">
                    OFFICIALLY APPROVED
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Green Badge</span>
                </button>
              </div>
            </div>

            {/* Directive Shape Callout Boxes */}
            <div className="border-t border-slate-100 pt-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 mb-1.5">
                Structured Directive Shape Boxes
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    insertHtmlAtCursor('<div style="border-left: 4px solid #059669; background-color: #f0fdf4; padding: 8px 14px; margin: 8px 0; border-radius: 0 6px 6px 0; font-weight: 500;"><b>📌 DIRECTIVE:</b> Insert specific operational instructions or guidelines here.</div><p><br></p>');
                    setShapesMenuOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg border-l-4 border-l-emerald-600 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 transition text-[11px] font-semibold text-emerald-950 cursor-pointer"
                >
                  <b>📌 Green Directive Box</b>
                  <div className="text-[10px] text-emerald-700 font-normal">Highlighted operational directive card</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    insertHtmlAtCursor('<div style="border-left: 4px solid #dc2626; background-color: #fef2f2; padding: 8px 14px; margin: 8px 0; border-radius: 0 6px 6px 0; font-weight: 500;"><b>⚠️ SANCTION NOTICE:</b> Failure to strictly observe these directives shall be dealt with under company rules.</div><p><br></p>');
                    setShapesMenuOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg border-l-4 border-l-red-600 bg-red-50 hover:bg-red-100/70 border border-red-200 transition text-[11px] font-semibold text-red-950 cursor-pointer"
                >
                  <b>⚠️ Red Sanction Box</b>
                  <div className="text-[10px] text-red-700 font-normal">Disciplinary penalty notice box</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    insertHtmlAtCursor('<div style="border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 10px 14px; margin: 8px 0; border-radius: 6px; font-weight: 500;"><b>📋 POLICY STATEMENT:</b> All personnel are required to uphold standard corporate protocols.</div><p><br></p>');
                    setShapesMenuOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 transition text-[11px] font-semibold text-slate-900 cursor-pointer"
                >
                  <b>📋 Framed Policy Box</b>
                  <div className="text-[10px] text-slate-500 font-normal">Enclosed formal policy statement</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="h-5 w-px bg-slate-300 mx-0.5" />

      {/* 7. Lists: Numbers, Bullets, Alphabet, Roman */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => executeCommand("insertOrderedList")}
          className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-850 hover:border-emerald-300 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Numbered List (1. 2. 3.)"
        >
          <ListOrdered size={14} className="text-emerald-600" />
          <span className="text-[11px] hidden sm:inline">1. Numbers</span>
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertUnorderedList")}
          className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-850 hover:border-emerald-300 text-slate-800 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Bullet List (• • •)"
        >
          <List size={14} className="text-emerald-600" />
          <span className="text-[11px] hidden sm:inline">• Bullets</span>
        </button>
      </div>

      <div className="h-5 w-px bg-slate-300 mx-0.5" />

      {/* 8. Structural: Section Title & Divider */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => insertHtmlAtCursor('<h4 style="font-weight: 900; text-transform: uppercase; font-size: 1.15em; margin: 14px 0 6px 0; border-bottom: 2px solid #0f172a; padding-bottom: 2px;">SECTION TITLE</h4><p><br></p>')}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Section Heading Banner"
        >
          <Heading size={14} />
        </button>
        <button
          type="button"
          onClick={() => insertHtmlAtCursor('<hr style="border: none; border-top: 1.5px solid #cbd5e1; margin: 14px 0;"><p><br></p>')}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Divider Line (<hr>)"
        >
          <Minus size={14} />
        </button>
      </div>

      <div className="h-5 w-px bg-slate-300 mx-0.5" />

      {/* 9. Text Utilities: UPPERCASE, Indent & Clear Tags */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={transformSelectedToUppercase}
          className="px-1.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 font-black text-xs transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Convert Selected Text to UPPERCASE"
        >
          <CaseUpper size={13} className="mr-0.5" />
          <span className="text-[10px]">AA</span>
        </button>
        <button
          type="button"
          onClick={() => executeCommand("insertHTML", "&nbsp;&nbsp;&nbsp;&nbsp;")}
          className="px-1.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Insert 4-Space Indent (Tab)"
        >
          Tab
        </button>
        <button
          type="button"
          onClick={() => executeCommand("removeFormat")}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-red-600 transition flex items-center justify-center cursor-pointer shadow-2xs"
          title="Clear Formatting"
        >
          <Eraser size={14} />
        </button>
      </div>

      <div className="h-5 w-px bg-slate-300 mx-0.5" />

      {/* 10. HR Quick Clauses Popover */}
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setClausesMenuOpen(!clausesMenuOpen);
            setShapesMenuOpen(false);
            setHighlightMenuOpen(false);
            setColorMenuOpen(false);
          }}
          className={`px-2 py-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${clausesMenuOpen ? "bg-emerald-100 border-emerald-300 text-emerald-950" : "bg-white border-slate-200 hover:bg-slate-100 text-emerald-800"
            }`}
          title="Insert Standard HR Policy Directives"
        >
          <Bookmark size={13} className="text-emerald-600" />
          <span className="text-[11px] hidden sm:inline">HR Clauses</span>
        </button>

        {clausesMenuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in duration-100">
            <div className="text-[10px] font-black uppercase text-slate-400 px-2 py-1">Standard HR Directives</div>
            <button
              type="button"
              onClick={() => {
                insertHtmlAtCursor("<p>Strict compliance is hereby mandated for all concerned officers and personnel.</p>");
                setClausesMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-50 text-slate-800 cursor-pointer transition"
            >
              • "Strict compliance is hereby mandated..."
            </button>
            <button
              type="button"
              onClick={() => {
                insertHtmlAtCursor("<p>This memorandum shall take effect immediately upon issuance and official transmission.</p>");
                setClausesMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-50 text-slate-800 cursor-pointer transition"
            >
              • "This memorandum takes effect immediately..."
            </button>
            <button
              type="button"
              onClick={() => {
                insertHtmlAtCursor("<p>Failure to comply with the guidelines stipulated herein shall warrant corresponding disciplinary penalties pursuant to company rules and regulations.</p>");
                setClausesMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-50 text-slate-800 cursor-pointer transition"
            >
              • "Failure to comply shall warrant disciplinary..."
            </button>
            <button
              type="button"
              onClick={() => {
                insertHtmlAtCursor("<p>For inquiries or further clarifications regarding this directive, please coordinate directly with the Human Resource Management Division.</p>");
                setClausesMenuOpen(false);
              }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-50 text-slate-800 cursor-pointer transition"
            >
              • "For inquiries, coordinate with HRMD..."
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render Individual Company Memo Sheet Card (used in both Slide View and View All)
  const renderCompanyMemoCard = (company, index) => {
    if (!company) return null;
    const compMemoRef = getCompanySpecificMemoRef(company.code, memoRef);
    const isIncluded = includedCompanyIds.includes(company.id);
    const metrics = getMemoFitMetrics(memoContent, paperSize);

    return (
      <div
        key={company.id}
        id={`memo-sheet-${company.id}`}
        className="w-full max-w-[760px] flex flex-col items-center space-y-2.5 scroll-mt-24"
      >
        {/* Executive Company Section Header Bar */}
        <div className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
          {/* Left: Entity Identifier, Code, and Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`h-5 w-5 rounded-md flex items-center justify-center text-[10.5px] font-black shrink-0 ${isIncluded ? "bg-slate-900 text-white" : "bg-slate-400 text-white"
              }`}>
              {index + 1}
            </span>
            <span className="text-slate-900 font-extrabold uppercase tracking-wide text-xs sm:text-[13px]">
              {company.name}
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {compMemoRef}
            </span>
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${isIncluded
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
              }`}>
              {isIncluded ? "✓ Included" : "✕ Excluded"}
            </span>
            <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              📄 <span className="font-bold text-slate-800">{metrics.paperBadgeLabel}</span> • 1-Page Fit
            </span>
          </div>

          {/* Right: Actions Group */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {isIncluded && (
              <>
                <button
                  type="button"
                  onClick={() => handlePrintMemo(company)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-2.5 py-1.5 text-xs shadow-2xs transition cursor-pointer"
                  title={`Print only the ${company.name} memorandum`}
                >
                  <Printer size={13} className="text-slate-600" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyMemoAsImage(company)}
                  disabled={copyingImageId === company.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 text-xs shadow-xs transition cursor-pointer"
                  title="Copy high-res memorandum image to clipboard"
                >
                  {copyingImageId === company.id ? (
                    <>
                      <RefreshCw size={13} className="animate-spin text-emerald-400" />
                      <span>Generating...</span>
                    </>
                  ) : copiedImageId === company.id ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-300">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Camera size={13} className="text-emerald-400" />
                      <span>Copy Image</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadMemoImage(company)}
                  disabled={copyingImageId === company.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-2.5 py-1.5 text-xs shadow-2xs transition cursor-pointer"
                  title="Download memo as high-res PNG image"
                >
                  <Download size={13} className="text-slate-500" />
                  <span>PNG</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => toggleCompanyInclusion(company.id)}
              className={`inline-flex items-center gap-1 rounded-lg font-bold px-2.5 py-1.5 text-xs transition cursor-pointer border ${isIncluded
                  ? "border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-300 text-slate-600 hover:text-rose-700 shadow-2xs"
                  : "border-emerald-600 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                }`}
              title={isIncluded ? `Exclude ${company.name} from memo distribution` : `Include ${company.name} in memo distribution`}
            >
              {isIncluded ? (
                <>
                  <XCircle size={13} />
                  <span>Exclude</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>Include</span>
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
            aspectRatio: metrics.aspectRatioCss,
            minHeight: `${metrics.previewMinHeightPx}px`
          }}
          className={`relative w-full bg-white border border-slate-300 rounded-sm shadow-xl ${metrics.isLegal ? "px-5 py-3 sm:px-8 sm:py-3.5" : "px-5 py-4 sm:px-8 sm:py-5"
            } overflow-hidden select-none transition-all duration-150 flex flex-col justify-between ${!isIncluded ? "opacity-40 grayscale-[25%] pointer-events-none" : ""
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

          {/* Foreground Content (Flush Top, Natural Signatory Flow, Flush Bottom Footer) */}
          <div className="relative z-10 flex flex-col flex-1 h-full">
            {/* Top Section: Letterhead + Memorandum Title Banner + Metadata Grid + Directives */}
            <div className="flex flex-col space-y-2">
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

              {/* Official HR Memo Header Grid - Standard 12pt (12px) */}
              <div className="space-y-1 text-xs py-1.5">
                <div className="grid grid-cols-[90px_1fr] items-baseline">
                  <span className="font-black text-[12pt] text-slate-900 uppercase">TO:</span>
                  <span className="font-extrabold text-slate-950 uppercase text-[12pt] tracking-wide">{memoTo}</span>
                </div>
                <div className="grid grid-cols-[90px_1fr] items-baseline">
                  <span className="font-black text-[12pt] text-slate-900 uppercase">FROM:</span>
                  <span className="font-extrabold text-slate-950 uppercase text-[12pt] tracking-wide">{memoFrom}</span>
                </div>
                <div className="grid grid-cols-[90px_1fr] items-baseline">
                  <span className="font-black text-[12pt] text-slate-900 uppercase">DATE:</span>
                  <span className="font-extrabold text-slate-950 uppercase text-[12pt] tracking-wide">{memoDate}</span>
                </div>
                <div className="grid grid-cols-[90px_1fr] items-baseline">
                  <span className="font-black text-[12pt] text-slate-900 uppercase">SUBJECT:</span>
                  <span className="font-black text-slate-950 uppercase text-[12pt] tracking-tight">{memoSubject}</span>
                </div>
              </div>

              {/* Bottom Metadata Divider Line */}
              <div className="my-1 border-b-2 border-slate-900"></div>

              {/* Directives / Guidelines Body Section - Strictly Preserved User Font Size */}
              {memoContent && (
                <div
                  style={{
                    fontFamily: directivesFontFamily,
                    fontSize: `${metrics.directivesFontSizePx}px`,
                    lineHeight: metrics.directivesLineHeight
                  }}
                  className="memo-directives-content pt-1.5 text-slate-900 font-normal whitespace-pre-wrap text-justify"
                  dangerouslySetInnerHTML={{
                    __html: renderMemoDirectivesHtml(memoContent)
                  }}
                />
              )}

              {/* Signatory Block with E-Signatures: Auto-adjusted fit */}
              <div style={{ marginTop: metrics.sigMarginTop }} className="pt-1">
                {signatoryLayout === "dual" ? (
                  <div className="grid grid-cols-2 gap-8 items-start">
                    {/* Left: Issued By */}
                    <div>
                      {signatoryLabel?.trim() ? (
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                          {signatoryLabel.trim()}
                        </p>
                      ) : null}
                      <div
                        className="flex items-end"
                        style={{ height: `${Math.max(64, signatorySize + 10)}px` }}
                      >
                        {signatorySignature ? (
                          <img
                            src={signatorySignature}
                            alt="Signatory E-Signature"
                            style={{
                              height: `${signatorySize}px`,
                              maxHeight: `${signatorySize}px`,
                              maxWidth: `${Math.round(signatorySize * 3.5)}px`,
                              marginLeft: `${signatoryOffsetX}px`,
                              marginBottom: `${signatoryOffsetY}px`
                            }}
                            className="object-contain object-bottom pointer-events-none select-none relative z-10"
                          />
                        ) : (
                          <div className="h-10 text-[11px] text-slate-400 italic flex items-center mb-1">
                            (Signature over printed name)
                          </div>
                        )}
                      </div>
                      <p className="text-xs sm:text-[13.5px] font-black text-slate-950 uppercase tracking-tight relative z-0">
                        {signatoryName}
                      </p>
                      <p className="text-[11.5px] font-bold text-slate-800 leading-tight">
                        {signatoryTitle}
                      </p>
                      <p className="text-[10px] text-slate-600 font-semibold">
                        {getSignatoryAffiliation(company)}
                      </p>
                    </div>

                    {/* Right: Approved By */}
                    <div>
                      {approverLabel?.trim() ? (
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                          {approverLabel.trim()}
                        </p>
                      ) : null}
                      <div
                        className="flex items-end"
                        style={{ height: `${Math.max(64, approverSize + 10)}px` }}
                      >
                        {approverSignature ? (
                          <img
                            src={approverSignature}
                            alt="Approver E-Signature"
                            style={{
                              height: `${approverSize}px`,
                              maxHeight: `${approverSize}px`,
                              maxWidth: `${Math.round(approverSize * 3.5)}px`,
                              marginLeft: `${approverOffsetX}px`,
                              marginBottom: `${approverOffsetY}px`
                            }}
                            className="object-contain object-bottom pointer-events-none select-none relative z-10"
                          />
                        ) : (
                          <div className="h-10 text-[11px] text-slate-400 italic flex items-center mb-1">
                            (Signature over printed name)
                          </div>
                        )}
                      </div>
                      <p className="text-xs sm:text-[13.5px] font-black text-slate-950 uppercase tracking-tight relative z-0">
                        {approverName}
                      </p>
                      <p className="text-[11.5px] font-bold text-slate-800 leading-tight">
                        {approverTitle}
                      </p>
                      <p className="text-[10px] text-slate-600 font-semibold">
                        {getSignatoryAffiliation(company)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="min-w-[200px] max-w-[280px] text-left">
                      {signatoryLabel?.trim() ? (
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                          {signatoryLabel.trim()}
                        </p>
                      ) : null}
                      <div
                        className="flex items-end"
                        style={{ height: `${Math.max(64, signatorySize + 10)}px` }}
                      >
                        {signatorySignature ? (
                          <img
                            src={signatorySignature}
                            alt="Signatory E-Signature"
                            style={{
                              height: `${signatorySize}px`,
                              maxHeight: `${signatorySize}px`,
                              maxWidth: `${Math.round(signatorySize * 3.5)}px`,
                              marginLeft: `${signatoryOffsetX}px`,
                              marginBottom: `${signatoryOffsetY}px`
                            }}
                            className="object-contain object-bottom pointer-events-none select-none relative z-10"
                          />
                        ) : (
                          <div className="h-10 text-[11px] text-slate-400 italic flex items-center mb-1">
                            (Signature over printed name)
                          </div>
                        )}
                      </div>
                      <p className="text-xs sm:text-[13.5px] font-black text-slate-950 uppercase tracking-tight relative z-0">
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
            </div>

            {/* Bottom Section: Official Division Footer - Thin, Crisp & Professional */}
            <div className="mt-auto pt-3 pb-0">
              <div className="border-t border-slate-300 pt-2 flex items-center justify-between text-[8.5px] sm:text-[9px] font-medium text-slate-600 uppercase tracking-[0.08em]">
                <span className="font-medium text-slate-600">HUMAN RESOURCES &amp; ADMINISTRATION</span>
                <span className="font-semibold text-slate-900 tracking-[0.12em]">STRICT COMPLIANCE MANDATED</span>
                <span className="font-medium text-slate-600">{company.code} • OFFICIAL TRANSMISSION</span>
              </div>
              <div className="text-center text-[7.5px] sm:text-[8px] text-slate-400 font-normal uppercase tracking-[0.22em] mt-1">
                CORPORATE EXECUTIVE RECORD • CONFIDENTIAL TRANSMISSION
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${isActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-400/40"
                    : isCompleted
                      ? "bg-white border-emerald-300 text-slate-900 hover:border-emerald-500 hover:bg-emerald-50/50"
                      : "bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:bg-emerald-50/20"
                  }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs transition ${isActive
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
                      className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-500 focus:outline-none ${isLetterheadHeadingInvalid ? "border-rose-300" : "border-slate-200"
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
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-emerald-600" />
                      <span>Memorandum Reference #</span>
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const globalRefs = await getAllGlobalMemoRefs();
                        const nextRef = generateUniqueMemoRef(selectedCompany.code, globalRefs);
                        setMemoRef(nextRef);
                      }}
                      className="text-[10px] text-emerald-600 hover:text-emerald-800 normal-case font-bold cursor-pointer flex items-center gap-1 transition"
                      title="Sync next available sequential number from database"
                    >
                      <RefreshCw size={11} />
                      Sync Next Sequence
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={memoRef}
                      readOnly
                      placeholder="e.g. MEMO-2026-LBC-261023-01"
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/90 pl-3.5 pr-28 py-2.5 text-xs font-mono font-black text-slate-800 cursor-not-allowed select-all shadow-2xs focus:outline-none"
                    />
                    <div className="absolute right-2 top-2 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider border border-emerald-200 pointer-events-none flex items-center gap-1">
                      <Key size={10} />
                      Auto-Generated
                    </div>
                  </div>
                  <p className="text-[10.5px] text-slate-500 font-medium">
                    Auto-generated incremental reference across all accounts (YYMMDD-01). Non-editable to prevent collisions.
                  </p>
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

            {/* Large writing canvas for memorandum directives with Rich Formatting Toolbar */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <PenTool size={14} className="text-emerald-600" />
                  Memorandum Body Directives (Full Writing Canvas)
                </label>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Live WYSIWYG Sheet
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsSourceMode(!isSourceMode)}
                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer border ${isSourceMode
                        ? "bg-slate-900 text-emerald-400 border-slate-800 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    title="Toggle between Live WYSIWYG Sheet and HTML Source Code"
                  >
                    <Code size={13} />
                    <span>{isSourceMode ? "Live Sheet View" : "HTML Source"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMagnifyModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer border border-emerald-200"
                    title="Open full-screen modal editor"
                  >
                    <Maximize2 size={12} />
                    <span>Full-Screen Editor</span>
                  </button>
                </div>
              </div>

              {/* Rich Formatting Toolbar (Font Style, Font Size, Bold, Italic, Underline, Highlight, Shapes & Badges, Lists, etc.) */}
              {renderDirectivesToolbar()}

              {/* Real-Time Live Formatted Output Canvas */}
              {!isSourceMode ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-2 sm:p-3 shadow-inner">
                  <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs min-h-[380px] p-5 sm:p-6 transition-all">
                    <div
                      ref={liveEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleLiveEditorInput}
                      onKeyDown={handleEditorKeyDown}
                      data-placeholder="Start typing your official memorandum directives here in real-time...

Write numbered directives (1. 2. 3.), policy bullet points, or formal executive guidelines.
Use the toolbar above for Font Style, Font Size, Bold, Italic, Underline, Highlights, Colors, and Shapes & Badges — all formatted live in real-time!"
                      style={{
                        fontFamily: directivesFontFamily,
                        fontSize: `${directivesFontSize}px`,
                        lineHeight: 1.8,
                        whiteSpace: "pre-wrap"
                      }}
                      className="memo-live-editor w-full min-h-[340px] text-slate-900 text-justify whitespace-pre-wrap outline-none selection:bg-emerald-200 selection:text-emerald-950"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <textarea
                    rows={16}
                    value={memoContent}
                    onChange={(e) => setMemoContent(e.target.value)}
                    placeholder="HTML Source code..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-900 text-emerald-300 p-4 font-mono text-xs leading-relaxed focus:border-emerald-500 focus:outline-none resize-y shadow-inner min-h-[340px]"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400 font-mono pt-1">
                <span className="text-[11px] text-slate-500 font-sans">
                  ✨ Real-time formatted output: Changes are instantly rendered and applied to print, PDF, and email.
                </span>
                <div className="flex items-center gap-3">
                  <span>{stripHtml(memoContent).split(/\s+/).filter(Boolean).length} words</span>
                  <span>{stripHtml(memoContent).length} characters</span>
                </div>
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
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${signatoryLayout === "dual"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                  Dual Signatory (HRMD + CEO)
                </button>
                <button
                  type="button"
                  onClick={() => setSignatoryLayout("single")}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${signatoryLayout === "single"
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
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Signatory Header / Section Label</label>
                      <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Discretionary</span>
                    </div>
                    <input
                      type="text"
                      value={signatoryLabel}
                      onChange={(e) => setSignatoryLabel(e.target.value)}
                      placeholder="e.g. ISSUED BY: or PREPARED BY:"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-900 uppercase focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

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

                  {/* Signature Alignment, Position & Size Controls (Always Accessible) */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1">
                        <span>Signature Alignment &amp; Size</span>
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Position &amp; Scale</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { setSignatoryOffsetX(48); setSignatoryOffsetY(-6); setSignatorySize(56); }}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer underline"
                      >
                        Reset Default
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-medium mb-1">
                          <span className="font-bold">Horizontal (← / →)</span>
                          <span className="font-mono font-bold text-slate-800">{signatoryOffsetX}px</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="250"
                          step="2"
                          value={signatoryOffsetX}
                          onChange={(e) => setSignatoryOffsetX(Number(e.target.value))}
                          className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-semibold">
                          <span>← Left (-50px)</span>
                          <span>Right (+250px) →</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-medium mb-1">
                          <span className="font-bold">Vertical (↓ / ↑)</span>
                          <span className="font-mono font-bold text-slate-800">{signatoryOffsetY}px</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="30"
                          step="1"
                          value={signatoryOffsetY}
                          onChange={(e) => setSignatoryOffsetY(Number(e.target.value))}
                          className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-semibold">
                          <span className="text-emerald-700">← Lower (-50px)</span>
                          <span>Raise (+30px) →</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-medium mb-1">
                          <span className="font-bold">Signature Size</span>
                          <span className="font-mono font-bold text-slate-800">{signatorySize}px</span>
                        </div>
                        <input
                          type="range"
                          min="28"
                          max="160"
                          step="2"
                          value={signatorySize}
                          onChange={(e) => setSignatorySize(Number(e.target.value))}
                          className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-semibold">
                          <span>Smaller (28px)</span>
                          <span>Larger (160px)</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Nudge Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200/60">
                      <span className="text-[9.5px] text-slate-500 font-bold mr-1">Quick Nudge:</span>
                      <button
                        type="button"
                        onClick={() => setSignatoryOffsetX((prev) => Math.max(-50, prev - 6))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                        title="Nudge left"
                      >
                        ← Left
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatoryOffsetX((prev) => Math.min(250, prev + 6))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                        title="Nudge right"
                      >
                        Right →
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatorySize((prev) => Math.max(28, prev - 4))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                        title="Decrease size"
                      >
                        - Decrease
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatorySize((prev) => Math.min(160, prev + 4))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                        title="Increase size"
                      >
                        + Increase
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatoryOffsetY((prev) => Math.max(-50, prev - 3))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                      >
                        ↓ Down
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignatoryOffsetY((prev) => Math.min(30, prev + 3))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                      >
                        ↑ Up
                      </button>
                    </div>
                  </div>
                </div>

                {/* Signature Line Preview */}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Signature Line Preview:
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
                    {signatoryLabel?.trim() ? (
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                        {signatoryLabel.trim()}
                      </p>
                    ) : null}
                    <div
                      className="flex items-end"
                      style={{ height: `${Math.max(56, signatorySize + 8)}px` }}
                    >
                      {signatorySignature ? (
                        <img
                          src={signatorySignature}
                          alt="Signatory E-Signature"
                          style={{
                            height: `${signatorySize}px`,
                            maxHeight: `${signatorySize}px`,
                            maxWidth: `${Math.round(signatorySize * 3.5)}px`,
                            marginLeft: `${signatoryOffsetX}px`,
                            marginBottom: `${signatoryOffsetY}px`
                          }}
                          className="object-contain object-bottom pointer-events-none select-none relative z-10"
                        />
                      ) : (
                        <div className="h-8 text-[11px] text-slate-400 italic flex items-center mb-1">
                          (Physical signature space on printed copy)
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-black text-slate-950 uppercase relative z-0">{signatoryName}</p>
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
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Approver Header / Section Label</label>
                        <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Discretionary</span>
                      </div>
                      <input
                        type="text"
                        value={approverLabel}
                        onChange={(e) => setApproverLabel(e.target.value)}
                        placeholder="e.g. NOTED & APPROVED BY: or APPROVED BY:"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-900 uppercase focus:border-emerald-500 focus:bg-white focus:outline-none"
                      />
                    </div>

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

                  {/* Approver Alignment, Position & Size Controls (Always Accessible) */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1">
                        <span>Approver Signature Alignment &amp; Size</span>
                        <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">Position &amp; Scale</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => { setApproverOffsetX(48); setApproverOffsetY(-6); setApproverSize(56); }}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer underline"
                      >
                        Reset Default
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-medium mb-1">
                          <span className="font-bold">Horizontal (← / →)</span>
                          <span className="font-mono font-bold text-slate-800">{approverOffsetX}px</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="250"
                          step="2"
                          value={approverOffsetX}
                          onChange={(e) => setApproverOffsetX(Number(e.target.value))}
                          className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-semibold">
                          <span>← Left (-50px)</span>
                          <span>Right (+250px) →</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-medium mb-1">
                          <span className="font-bold">Vertical (↓ / ↑)</span>
                          <span className="font-mono font-bold text-slate-800">{approverOffsetY}px</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="30"
                          step="1"
                          value={approverOffsetY}
                          onChange={(e) => setApproverOffsetY(Number(e.target.value))}
                          className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-semibold">
                          <span className="text-emerald-700">← Lower (-50px)</span>
                          <span>Raise (+30px) →</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-600 font-medium mb-1">
                          <span className="font-bold">Signature Size</span>
                          <span className="font-mono font-bold text-slate-800">{approverSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="28"
                          max="160"
                          step="2"
                          value={approverSize}
                          onChange={(e) => setApproverSize(Number(e.target.value))}
                          className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-semibold">
                          <span>Smaller (28px)</span>
                          <span>Larger (160px)</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Nudge Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-200/60">
                      <span className="text-[9.5px] text-slate-500 font-bold mr-1">Quick Nudge:</span>
                      <button
                        type="button"
                        onClick={() => setApproverOffsetX((prev) => Math.max(-50, prev - 6))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                        title="Nudge left"
                      >
                        ← Left
                      </button>
                      <button
                        type="button"
                        onClick={() => setApproverOffsetX((prev) => Math.min(250, prev + 6))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                        title="Nudge right"
                      >
                        Right →
                      </button>
                      <button
                        type="button"
                        onClick={() => setApproverSize((prev) => Math.max(28, prev - 4))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                        title="Decrease size"
                      >
                        - Decrease
                      </button>
                      <button
                        type="button"
                        onClick={() => setApproverSize((prev) => Math.min(160, prev + 4))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                        title="Increase size"
                      >
                        + Increase
                      </button>
                      <button
                        type="button"
                        onClick={() => setApproverOffsetY((prev) => Math.max(-50, prev - 3))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                      >
                        ↓ Down
                      </button>
                      <button
                        type="button"
                        onClick={() => setApproverOffsetY((prev) => Math.min(30, prev + 3))}
                        className="px-2 py-1 rounded-md bg-white border border-slate-300 hover:border-emerald-500 hover:text-emerald-700 text-[10px] font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                      >
                        ↑ Up
                      </button>
                    </div>
                  </div>

                  {/* Signature Line Preview */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Signature Line Preview:
                    </span>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left">
                      {approverLabel?.trim() ? (
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          {approverLabel.trim()}
                        </p>
                      ) : null}
                      <div
                        className="flex items-end"
                        style={{ height: `${Math.max(56, approverSize + 8)}px` }}
                      >
                        {approverSignature ? (
                          <img
                            src={approverSignature}
                            alt="Approver E-Signature"
                            style={{
                              height: `${approverSize}px`,
                              maxHeight: `${approverSize}px`,
                              maxWidth: `${Math.round(approverSize * 3.5)}px`,
                              marginLeft: `${approverOffsetX}px`,
                              marginBottom: `${approverOffsetY}px`
                            }}
                            className="object-contain object-bottom pointer-events-none select-none relative z-10"
                          />
                        ) : (
                          <div className="h-8 text-[11px] text-slate-400 italic flex items-center mb-1">
                            (Physical signature space on printed copy)
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-black text-slate-950 uppercase relative z-0">{approverName}</p>
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
                      className={`relative flex flex-col items-center text-center p-3 rounded-xl border-2 transition cursor-pointer ${isIncluded
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
                        className={`mt-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${isIncluded
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
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition cursor-pointer ${isIncluded
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

            {/* Document Action Toolbar (Executive Corporate Command Bar) */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-md sticky top-3 z-30 overflow-hidden divide-y divide-slate-100">
              {/* Tier 1: Primary Dispatch & Archive Actions */}
              <div className="p-2.5 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 bg-white">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintMemo("all")}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold px-3.5 py-2 text-xs shadow-xs transition cursor-pointer"
                    title="Print or Save all included company memos as PDF"
                  >
                    <Printer size={14} className="text-white" />
                    <span>Print All ({activeCompanies.length} {activeCompanies.length === 1 ? "Entity" : "Entities"})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveMemoToArchive}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold px-3.5 py-2 text-xs shadow-xs transition cursor-pointer"
                    title="Save memo to local records archive"
                  >
                    <Save size={14} />
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
                    className={`inline-flex items-center gap-2 rounded-xl font-bold px-3.5 py-2 text-xs transition cursor-pointer ${totalCompanyRecipients === 0
                        ? "border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-2xs"
                        : "bg-emerald-700 hover:bg-emerald-600 text-white shadow-xs"
                      }`}
                    title={
                      totalCompanyRecipients === 0
                        ? "No pre-registered employee work emails are linked. Click for details."
                        : "Send via Email to pre-registered employee recipients"
                    }
                  >
                    <Send size={13} className={totalCompanyRecipients === 0 ? "text-amber-700" : "text-white"} />
                    <span>Send via Email ({recipientEmails.length})</span>
                    {unlinkedEntities.length > 0 && totalCompanyRecipients > 0 && (
                      <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                        {unlinkedEntities.length} unlinked
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyMemoText}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold px-3 py-2 text-xs shadow-2xs transition cursor-pointer"
                    title="Copy plain formatted text"
                  >
                    {copiedNotice ? <Check size={14} className="text-emerald-600" /> : <Copy size={13} className="text-slate-500" />}
                    <span>{copiedNotice ? "Copied Text!" : "Copy Text"}</span>
                  </button>
                </div>

                {/* Right: Selected Entities Indicator */}
                <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 text-[11px]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{activeCompanies.length} of {companies.length} Entities Active</span>
                  </span>
                </div>
              </div>

              {/* Tier 2: Bond Paper Format Calibration & View Controls */}
              <div className="px-3 sm:px-4 py-2 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Left: Paper Format Selector */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={13} className="text-slate-500" />
                    Bond Paper:
                  </span>
                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] font-medium text-slate-700 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPaperSize("auto")}
                      className={`px-2.5 py-1 rounded-md cursor-pointer transition ${paperSize === "auto"
                          ? "bg-slate-900 text-white shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 font-medium"
                        }`}
                      title="Auto-detect Short, A4 or Long/Legal based on directives length"
                    >
                      Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperSize("short")}
                      className={`px-2.5 py-1 rounded-md cursor-pointer transition ${paperSize === "short"
                          ? "bg-slate-900 text-white shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 font-medium"
                        }`}
                      title="Philippine Short Bond Paper / US Letter (8.5 x 11 in / 215.9 x 279.4 mm)"
                    >
                      Short (8.5×11)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperSize("a4")}
                      className={`px-2.5 py-1 rounded-md cursor-pointer transition ${paperSize === "a4"
                          ? "bg-slate-900 text-white shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 font-medium"
                        }`}
                      title="Standard A4 Paper (210 x 297 mm)"
                    >
                      A4
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperSize("legal13")}
                      className={`px-2.5 py-1 rounded-md cursor-pointer transition ${paperSize === "legal13"
                          ? "bg-slate-900 text-white shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 font-medium"
                        }`}
                      title="Philippine Long Bond Paper / Folio (8.5 x 13 in)"
                    >
                      Long (8.5×13)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaperSize("legal14")}
                      className={`px-2.5 py-1 rounded-md cursor-pointer transition ${paperSize === "legal14"
                          ? "bg-slate-900 text-white shadow-2xs font-bold"
                          : "text-slate-600 hover:text-slate-900 font-medium"
                        }`}
                      title="US Legal Paper (8.5 x 14 in)"
                    >
                      Legal (8.5×14)
                    </button>
                  </div>
                </div>

                {/* Right: Watermark & Zoom Controls */}
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Watermark opacity */}
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Watermark:</span>
                    <input
                      type="range"
                      min={4}
                      max={25}
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      className="w-18 sm:w-22 accent-slate-800 cursor-pointer"
                      title={`Watermark opacity: ${watermarkOpacity}%`}
                    />
                    <span className="font-mono text-[10.5px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {watermarkOpacity}%
                    </span>
                  </div>

                  <div className="h-4 w-px bg-slate-200"></div>

                  {/* Zoom scale */}
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Zoom:</span>
                    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-[10.5px] font-medium text-slate-700 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setPreviewZoom(90)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition ${previewZoom === 90 ? "bg-slate-900 text-white font-bold shadow-2xs" : "hover:text-slate-900"}`}
                      >
                        90%
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewZoom(100)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition ${previewZoom === 100 ? "bg-slate-900 text-white font-bold shadow-2xs" : "hover:text-slate-900"}`}
                      >
                        100%
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewZoom(110)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition ${previewZoom === 110 ? "bg-slate-900 text-white font-bold shadow-2xs" : "hover:text-slate-900"}`}
                      >
                        110%
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tier 3: E-Signature Alignment & Scale Quick Controls (Realtime on Viewer & Print) */}
              <div className="px-3 sm:px-4 py-2 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200 shadow-2xs">
                    ✍ E-Sig Alignment:
                  </span>

                  {/* Horizontal Left ↔ Right Nudge & Controls */}
                  <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Pos:</span>
                    <button
                      type="button"
                      onClick={() => setSignatoryOffsetX((prev) => Math.max(-50, prev - 4))}
                      className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10.5px] text-slate-800 transition cursor-pointer"
                      title="Nudge left (-4px)"
                    >
                      ← Left
                    </button>
                    <span className="font-mono font-black text-[11px] text-slate-900 w-10 text-center">
                      {signatoryOffsetX}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setSignatoryOffsetX((prev) => Math.min(250, prev + 4))}
                      className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10.5px] text-slate-800 transition cursor-pointer"
                      title="Nudge right (+4px)"
                    >
                      Right →
                    </button>
                  </div>

                  {/* Signature Size Scale */}
                  <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Size:</span>
                    <button
                      type="button"
                      onClick={() => setSignatorySize((prev) => Math.max(28, prev - 4))}
                      className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10.5px] text-slate-800 transition cursor-pointer"
                      title="Decrease signature size (-4px)"
                    >
                      - Decrease
                    </button>
                    <span className="font-mono font-black text-[11px] text-slate-900 w-10 text-center">
                      {signatorySize}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setSignatorySize((prev) => Math.min(160, prev + 4))}
                      className="px-2 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10.5px] text-slate-800 transition cursor-pointer"
                      title="Increase signature size (+4px)"
                    >
                      + Increase
                    </button>
                  </div>

                  {/* Vertical Position */}
                  <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Y:</span>
                    <button
                      type="button"
                      onClick={() => setSignatoryOffsetY((prev) => Math.max(-50, prev - 2))}
                      className="px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10px] text-slate-800 transition cursor-pointer"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <span className="font-mono font-bold text-[10.5px] text-slate-900 w-8 text-center">
                      {signatoryOffsetY}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setSignatoryOffsetY((prev) => Math.min(30, prev + 2))}
                      className="px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10px] text-slate-800 transition cursor-pointer"
                      title="Move up"
                    >
                      ↑
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setSignatoryOffsetX(48); setSignatoryOffsetY(-6); setSignatorySize(56); }}
                    className="px-2 py-1 text-[10.5px] text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                    title="Reset to default alignment and size"
                  >
                    Reset
                  </button>
                </div>

                {/* If dual signatory mode is active, Approver quick adjust */}
                {signatoryLayout === "dual" && (
                  <div className="flex items-center gap-2 flex-wrap text-slate-600">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Approver E-Sig:</span>
                    <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setApproverOffsetX((prev) => Math.max(-50, prev - 4))}
                        className="px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10px] text-slate-800 cursor-pointer"
                        title="Approver left"
                      >
                        ←
                      </button>
                      <span className="font-mono font-bold text-[10.5px] text-slate-800 w-8 text-center">{approverOffsetX}px</span>
                      <button
                        type="button"
                        onClick={() => setApproverOffsetX((prev) => Math.min(250, prev + 4))}
                        className="px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10px] text-slate-800 cursor-pointer"
                        title="Approver right"
                      >
                        →
                      </button>
                      <span className="text-slate-300 mx-0.5">|</span>
                      <button
                        type="button"
                        onClick={() => setApproverSize((prev) => Math.max(28, prev - 4))}
                        className="px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10px] text-slate-800 cursor-pointer"
                        title="Approver smaller"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-[10.5px] text-slate-800 w-8 text-center">{approverSize}px</span>
                      <button
                        type="button"
                        onClick={() => setApproverSize((prev) => Math.min(160, prev + 4))}
                        className="px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-300 font-bold text-[10px] text-slate-800 cursor-pointer"
                        title="Approver larger"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ================= MEMORANDUM OUTPUT VIEWER ================= */}
            {/* Navigation Shell & Entity Selector */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs space-y-2.5">
              {/* Top Row: Left / Right Navigation & View Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                {/* Left: Previous, Active Entity Details, Next */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPreviewEntityIndex((prev) => Math.max(0, prev - 1))}
                    disabled={safePreviewIndex === 0}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Previous Entity Memo (Keyboard: Left Arrow ←)"
                  >
                    <ChevronLeft size={16} />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/90 border border-slate-200 text-xs">
                    <span className="h-5 w-5 rounded-md bg-slate-900 text-white text-[10.5px] font-black flex items-center justify-center shrink-0">
                      {safePreviewIndex + 1}
                    </span>
                    <span className="font-extrabold text-slate-900 truncate max-w-[130px] sm:max-w-[200px]">
                      {companiesToPreview[safePreviewIndex]?.name}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {companiesToPreview[safePreviewIndex]?.code}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      ({safePreviewIndex + 1} of {companiesToPreview.length})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewEntityIndex((prev) => Math.min(companiesToPreview.length - 1, prev + 1))}
                    disabled={safePreviewIndex >= companiesToPreview.length - 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    title="Next Entity Memo (Keyboard: Right Arrow →)"
                  >
                    <span>Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Right: Keyboard Hint & View Mode Switcher */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                    ⌨ Use ← / → keys
                  </span>

                  <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold text-slate-700 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPreviewViewMode("slide")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md cursor-pointer transition ${previewViewMode === "slide"
                          ? "bg-slate-900 text-white font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 font-medium"
                        }`}
                      title="Slide View (Focus 1 memo at a time, flip with Left / Right arrows)"
                    >
                      <FileText size={13} />
                      <span>Slide View (← / →)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewMode("scroll")}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md cursor-pointer transition ${previewViewMode === "scroll"
                          ? "bg-slate-900 text-white font-bold shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 font-medium"
                        }`}
                      title="Continuous Scroll View (Show all sheets vertically)"
                    >
                      <LayoutGrid size={13} />
                      <span>View All</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Entity Tab Strip: Quick Pill Picker */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-thin">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                  Entities:
                </span>
                {companiesToPreview.map((comp, idx) => {
                  const isSelected = previewViewMode === "slide" ? idx === safePreviewIndex : false;
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => {
                        setPreviewEntityIndex(idx);
                        if (previewViewMode === "scroll") {
                          const el = document.getElementById(`memo-sheet-${comp.id}`);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition cursor-pointer shrink-0 ${isSelected
                          ? "bg-slate-900 text-white border-slate-900 font-bold shadow-xs"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium"
                        }`}
                      title={`Jump to ${comp.name}`}
                    >
                      <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-black ${isSelected ? "bg-white text-slate-900" : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}>
                        {idx + 1}
                      </span>
                      <span>{comp.code}</span>
                      <span className="hidden lg:inline text-[10.5px] opacity-75 truncate max-w-[90px]">{comp.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Memorandum Output Viewer Stage with Coverflow 3D Animation */}
            {previewViewMode === "slide" ? (
              <div className="relative w-full overflow-hidden py-8 px-0 bg-slate-100/80 border border-slate-200/90 rounded-3xl shadow-inner select-none flex flex-col items-center">
                {/* Floating Left Navigation Arrow Button */}
                <button
                  type="button"
                  onClick={() => setPreviewEntityIndex((prev) => Math.max(0, prev - 1))}
                  disabled={safePreviewIndex === 0}
                  className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-2xl border border-slate-200/90 flex items-center justify-center cursor-pointer transition hover:scale-110 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
                  title="Previous Entity (Keyboard: Left Arrow ←)"
                >
                  <ChevronLeft size={28} className="text-slate-800" />
                </button>

                {/* Floating Right Navigation Arrow Button */}
                <button
                  type="button"
                  onClick={() => setPreviewEntityIndex((prev) => Math.min(companiesToPreview.length - 1, prev + 1))}
                  disabled={safePreviewIndex >= companiesToPreview.length - 1}
                  className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-2xl border border-slate-200/90 flex items-center justify-center cursor-pointer transition hover:scale-110 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
                  title="Next Entity (Keyboard: Right Arrow →)"
                >
                  <ChevronRight size={28} className="text-slate-800" />
                </button>

                {/* Coverflow Sliding Track: All cards visible in horizontal line, center card highlighted & full size */}
                <div
                  className="w-full flex items-center transition-transform duration-500 ease-out py-2"
                  style={{
                    gap: "24px",
                    transform: `translateX(calc(50% - ${safePreviewIndex} * (min(760px, 86vw) + 24px) - min(760px, 86vw) / 2))`
                  }}
                >
                  {companiesToPreview.map((company, index) => {
                    const isCenter = index === safePreviewIndex;
                    return (
                      <div
                        key={company.id}
                        onClick={() => {
                          if (!isCenter) setPreviewEntityIndex(index);
                        }}
                        style={{ width: "min(760px, 86vw)" }}
                        className={`shrink-0 relative transition-all duration-500 ease-out origin-center flex flex-col items-center ${isCenter
                            ? "scale-100 opacity-100 z-20 pointer-events-auto shadow-2xl ring-1 ring-slate-900/10 rounded-2xl"
                            : "scale-[0.84] sm:scale-[0.88] opacity-40 hover:opacity-75 z-10 cursor-pointer pointer-events-auto filter brightness-[0.97] hover:scale-[0.86] sm:hover:scale-[0.90]"
                          }`}
                      >
                        {!isCenter && (
                          <div
                            className="absolute inset-0 z-30 rounded-2xl cursor-pointer flex items-center justify-center bg-slate-900/0 hover:bg-slate-900/10 transition group"
                            title={`Click to view ${company.name}`}
                          >
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 text-white font-bold text-xs px-3.5 py-2 rounded-full shadow-xl flex items-center gap-1.5">
                              <span>View {company.code}</span>
                              <ArrowRight size={13} />
                            </span>
                          </div>
                        )}
                        {renderCompanyMemoCard(company, index)}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Pagination Pill Indicators */}
                <div className="flex items-center justify-center gap-1.5 pt-6 pb-1">
                  {companiesToPreview.map((comp, idx) => {
                    const isActive = idx === safePreviewIndex;
                    return (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => setPreviewEntityIndex(idx)}
                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${isActive
                            ? "w-8 sm:w-10 bg-slate-900 shadow-xs"
                            : "w-3 sm:w-4 bg-slate-300 hover:bg-slate-400"
                          }`}
                        title={`Go to ${comp.name} (${comp.code})`}
                      />
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Continuous Scroll: View All */
              <div className="w-full flex flex-col items-center gap-10 py-2">
                {companiesToPreview.map((company, index) => renderCompanyMemoCard(company, index))}
              </div>
            )}

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
                    className={`rounded-2xl border p-3.5 space-y-2 transition ${dispatch.recipients.length > 0
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
                      <span className={`font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-full border ${dispatch.recipients.length > 0
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
                className={`rounded-2xl p-3 text-xs flex items-center gap-2 border ${directSendStatus.type === "success"
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
              className={`w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-xs font-black text-white shadow-lg transition cursor-pointer ${totalCompanyRecipients === 0
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
                  <span>Cannot Dispatch: No Pre-Registered Work Email Found (Click for details)</span>
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
          <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
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

            <div className="flex-1 min-h-[420px] flex flex-col space-y-2">
              {/* Rich Directives Formatting Toolbar */}
              {renderDirectivesToolbar()}

              <div className="flex-1 min-h-[350px] rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4 shadow-inner flex flex-col">
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm flex-1 p-5 sm:p-8 flex flex-col">
                  <div
                    ref={modalLiveEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleLiveEditorInput}
                    onKeyDown={handleEditorKeyDown}
                    data-placeholder="Draft your full-screen official memorandum directives here in real-time... Use toolbar above for Font Style, Font Size, Bold, Italic, Highlights, Colors, and Shapes!"
                    style={{
                      fontFamily: directivesFontFamily,
                      fontSize: `${directivesFontSize}px`,
                      lineHeight: 1.8,
                      whiteSpace: "pre-wrap"
                    }}
                    className="memo-live-editor flex-1 w-full text-slate-900 text-justify whitespace-pre-wrap outline-none overflow-y-auto selection:bg-emerald-200 selection:text-emerald-950"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 shrink-0 text-xs">
              <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                <span>{stripHtml(memoContent).split(/\s+/).filter(Boolean).length} words</span>
                <span>{stripHtml(memoContent).length} characters</span>
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

      {/* Floating Action Feedback Toast for Image Copy & Download */}
      {imageCopyToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-950 text-white shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`p-1.5 rounded-xl shrink-0 ${imageCopyToast.type === "success"
                ? "bg-emerald-500/20 text-emerald-400"
                : imageCopyToast.type === "download" || imageCopyToast.type === "fallback"
                  ? "bg-sky-500/20 text-sky-400"
                  : "bg-rose-500/20 text-rose-400"
              }`}
          >
            {imageCopyToast.type === "success" ? (
              <Check size={18} />
            ) : imageCopyToast.type === "download" || imageCopyToast.type === "fallback" ? (
              <Download size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
          </div>
          <div className="text-xs font-bold text-slate-100 max-w-sm leading-snug">
            {imageCopyToast.message}
          </div>
          <button
            type="button"
            onClick={() => setImageCopyToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition shrink-0"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
