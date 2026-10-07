import { useState, useEffect, useMemo } from "react";
import {
  FileText, X, Sparkles, Building2, Languages, UserCheck,
  Send, Sliders, CheckCircle2, ChevronRight, ChevronLeft,
  Plus, Trash2, Bookmark, CheckSquare, Square,
  Lightbulb, ArrowRight, ShieldCheck, Scale, Award, Zap, RotateCcw,
  Maximize2, Minimize2, Check, Info, Copy, Eye, Settings2, ArrowUpRight,
  Wand2, Edit3
} from "lucide-react";

// Standard Company Directory with default Signatory: Jevince Jaye S. Jubay, CHRP (HRMD Manager)
const COMPANIES = [
  {
    id: "lucky_betplay",
    code: "LBC",
    name: "Lucky Betplay Corporation",
    logoUrl: "/logos/LB.png",
    rightLogoUrl: "/id-assets/right_logo_raw.png",
    address: "#257 Barlaps, A.S. Fortuna Street, Bakilid, Mandaue City, Cebu 6014",
    defaultTo: "HR ON-SITE, CIC, AND FIELD MONITORING",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultSignatoryCompany: "5A Royal Gaming OPC",
    defaultApprover: "CHARMIE JEAN M. SIMPAL",
    defaultApproverTitle: "President & CEO"
  },
  {
    id: "sgc",
    code: "SGC",
    name: "Simpal Group of Companies",
    logoUrl: "/logos/SGC.png",
    address: "Penthouse Level, Corporate Executive Tower, Cebu Business Park, Cebu City",
    defaultTo: "ALL EMPLOYEES AND CONCERNED PERSONNEL",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultApprover: "CHARMIE JEAN M. SIMPAL",
    defaultApproverTitle: "President & CEO"
  },
  {
    id: "simcon",
    code: "SIMCON",
    name: "Simpal Construction",
    logoUrl: "/logos/SIM.png",
    address: "Operations Yard & Central Depot, Mandaue Industrial Complex, Mandaue City, Cebu",
    defaultTo: "ALL PROJECT ENGINEERS, SITE SUPERVISORS & FIELD WORKERS",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultApprover: "CHARMIE JEAN M. SIMPAL",
    defaultApproverTitle: "President & CEO"
  },
  {
    id: "5a_royal",
    code: "5ARG",
    name: "5A Royal Gaming OPC",
    logoUrl: "/logos/5A.png",
    address: "Regional Executive Hub, Central Visayas Operations, Cebu, Philippines",
    defaultTo: "ALL GAMING STAFF & BRANCH OPERATIONS PERSONNEL",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultApprover: "CHARMIE JEAN M. SIMPAL",
    defaultApproverTitle: "President & CEO"
  },
  {
    id: "glowing_fortune",
    code: "GFC",
    name: "Glowing Fortune",
    logoUrl: "/logos/GLOW.png",
    address: "Commercial Center Arcade, A.S. Fortuna Street, Mandaue City, Cebu",
    defaultTo: "ALL HOSPITALITY, BRANCH & OPERATIONS PERSONNEL",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultApprover: "CHARMIE JEAN M. SIMPAL",
    defaultApproverTitle: "President & CEO"
  },
  {
    id: "imperial_gaming",
    code: "IMP",
    name: "Imperial Gaming OPC",
    logoUrl: "/logos/IMP.png",
    address: "Metro Cebu Business Center, Cebu City, Philippines",
    defaultTo: "ALL CORPORATE & REGIONAL GAMING STAFF",
    defaultFrom: "HUMAN RESOURCES DEPARTMENT",
    defaultSignatory: "JEVINCE JAYE S. JUBAY, CHRP",
    defaultSignatoryTitle: "HRMD Manager",
    defaultApprover: "CHARMIE JEAN M. SIMPAL",
    defaultApproverTitle: "President & CEO"
  }
];

const CLASSIFICATIONS = [
  "Operational Directive",
  "Mandatory Compliance",
  "Holiday Schedule",
  "General Policy",
  "Safety & Health",
  "Executive Order"
];

const LANGUAGES = [
  { id: "english", label: "English", desc: "Corporate English" },
  { id: "tagalog", label: "Tagalog", desc: "Formal Filipino" },
  { id: "taglish", label: "Taglish", desc: "Corporate Taglish" }
];

// Authentic Company Presets following official HR paragraph structure
const DEFAULT_TOPIC_PRESETS = [
  {
    id: "preset-communication",
    title: "Immediate Response & Communication Accessibility",
    subject: "IMMEDIATE RESPONSE AND COMMUNICATION ACCESSIBILITY",
    details: `All officers and concerned personnel are reminded to remain reachable and responsive to calls, messages, and all official communication channels, particularly during official working hours and PCSO STL operating/betting hours.

Given the nature of our operations under the PCSO Small Town Lottery (STL) structure and our responsibility within the gaming industry, immediate communication and timely response are essential to ensure continuous coordination, proper monitoring, and prompt action on operational concerns.

All concerned personnel are expected to maintain active and accessible communication lines at all times and respond to urgent matters without unnecessary delay.

Strict compliance is expected.`,
    classification: "Operational Directive",
    suggestedTo: "HR ON-SITE, CIC, AND FIELD MONITORING",
    isDefault: true
  },
  {
    id: "preset-lunch",
    title: "Lunch Break Adjustment (11AM - 12PM)",
    subject: "ADJUSTMENT OF OFFICIAL LUNCH BREAK SCHEDULE (11:00 AM TO 12:00 PM)",
    details: `All officers and concerned personnel are hereby advised of the official adjustment in our daily lunch break schedule across all operational units and corporate offices.

Given the continuous nature of our daily operations and our commitment to maintaining uninterrupted client service, the official lunch break is designated strictly from 11:00 AM to 12:00 PM. Designated branch supervisors and area leads must maintain an adequate rotational skeletal workforce so operations remain fully active and coordinated.

All concerned personnel are expected to resume workstation duties promptly at 12:00 PM and strictly observe accurate biometric clock-in and clock-out logging for compliance and payroll verification.

Strict compliance is expected.`,
    classification: "Operational Directive",
    suggestedTo: "ALL EMPLOYEES AND CONCERNED PERSONNEL",
    isDefault: false
  },
  {
    id: "preset-biometrics",
    title: "Biometrics Timing & Attendance Compliance",
    subject: "MANDATORY COMPLIANCE: BIOMETRIC TIMEKEEPING AND ATTENDANCE PROTOCOLS",
    details: `All officers, branch staff, and concerned personnel are reminded of the mandatory observance of daily biometric timekeeping protocols upon arrival and departure.

Given our commitment to workplace discipline and accurate payroll administration, all personnel must log their attendance through the designated biometric terminals within the authorized fifteen (15) minute grace period. Any official field assignment or off-site business must be supported by an approved Official Business (OB) slip submitted to the HR Department within forty-eight (48) hours.

All concerned personnel are expected to uphold punctuality at all times, as habitual tardiness and unrecorded logs shall be processed strictly in accordance with company disciplinary rules.

Strict compliance is expected.`,
    classification: "Mandatory Compliance",
    suggestedTo: "ALL EMPLOYEES AND CONCERNED PERSONNEL",
    isDefault: false
  },
  {
    id: "preset-cutoff",
    title: "Teller Draw Cutoff & Cash Remittance",
    subject: "STANDARD PROTOCOL: TELLER CASH REMITTANCE AND DRAW CUTOFF VERIFICATION",
    details: `All branch tellers, field cash coordinators, and area supervisors are directed to observe the standard cutoff protocols and remittance verification procedures for all daily draw operations.

Given the critical nature of our gaming operations and the strict accountability required for daily sales collections, all counters must observe the mandatory fifteen (15) minute cutoff prior to scheduled draw closures for terminal reconciliation. Physical cash counts, winning payout receipts, and terminal audit logs must match prior to supervisor sign-off.

All concerned personnel are expected to maintain meticulous financial records and ensure the immediate secure turnover of daily remittances to the authorized vault custodian without delay.

Strict compliance is expected.`,
    classification: "Operational Directive",
    suggestedTo: "ALL BRANCH TELLERS, FIELD AGENTS & CASH COORDINATORS",
    isDefault: false
  },
  {
    id: "preset-safety",
    title: "Occupational Safety & Site PPE Protocol",
    subject: "SAFETY DIRECTIVE: MANDATORY PPE PROTOCOLS AND WORKPLACE HAZARD READINESS",
    details: `All site engineers, field supervisors, and concerned personnel are reminded of the strict observance of occupational safety standards and mandatory protective equipment in all active project sites.

Given the hazards inherent in construction and field engineering environments, the wearing of complete Personal Protective Equipment (PPE)—including safety helmets, high-visibility vests, and protective footwear—is strictly mandatory inside all operational areas. Site supervisors must conduct daily five-minute pre-shift safety briefings to assess risks.

All concerned personnel are expected to maintain vigilance at all times and immediately escalate any safety hazard, incident, or near-miss to the Safety & Health Officer within two (2) hours of occurrence.

Strict compliance is expected.`,
    classification: "Safety & Health",
    suggestedTo: "ALL PROJECT SITE ENGINEERS & TECHNICAL PERSONNEL",
    isDefault: false
  },
  {
    id: "preset-holiday",
    title: "Special Non-Working Holiday Advisory",
    subject: "ADVISORY: DECLARED SPECIAL NON-WORKING HOLIDAY AND SKELETAL FORCE ROTATION",
    details: `All officers, branch personnel, and site staff are hereby advised of the upcoming declared Special Non-Working Holiday across all operating areas.

In observance of the official national proclamation, corporate administrative offices shall be closed. However, to maintain continuous service delivery, critical operational units, gaming branches, and designated field sites shall deploy an authorized rotational skeletal workforce. Premium compensation for personnel rendering duty shall be computed in accordance with statutory DOLE holiday pay guidelines.

All concerned supervisors are expected to coordinate their respective shift assignments and ensure seamless operations during the holiday period.

Strict compliance is expected.`,
    classification: "Holiday Schedule",
    suggestedTo: "ALL EMPLOYEES AND CONCERNED PERSONNEL",
    isDefault: false
  }
];

const STORAGE_KEY = "hrhub_memo_topics_list_v4";
const LEGACY_STORAGE_KEY = "hrhub_memo_topics_list_v3";

export function loadSavedTopics() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (parsed.length > 0) {
          // If no item explicitly has isDefault, mark the first one as default
          const hasDefault = parsed.some((t) => t.isDefault);
          if (!hasDefault) {
            parsed[0].isDefault = true;
          }
          return parsed;
        }
        return [];
      }
    }
  } catch (e) {
    console.warn("Could not load topics from localStorage:", e);
  }
  return DEFAULT_TOPIC_PRESETS.map((p, idx) => ({
    ...p,
    isDefault: idx === 0
  }));
}

export function saveTopicsToStorage(topicsList) {
  try {
    const data = JSON.stringify(topicsList);
    localStorage.setItem(STORAGE_KEY, data);
    localStorage.setItem(LEGACY_STORAGE_KEY, data);
  } catch (e) {
    console.warn("Could not save topics to localStorage:", e);
  }
}

export function findActiveDefaultTopic(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  const explicitlyDefault = list.find((t) => t.isDefault);
  if (explicitlyDefault) return explicitlyDefault;
  const firstCustom = list.find((t) => t.isCustom);
  if (firstCustom) return firstCustom;
  return list[0];
}

const RECIPIENT_CHECKBOXES = [
  { id: "hr_cic_field", label: "HR On-site, CIC, and Field Monitoring", text: "HR ON-SITE, CIC, AND FIELD MONITORING" },
  { id: "all_emp", label: "All Employees & Concerned Personnel", text: "ALL EMPLOYEES AND CONCERNED PERSONNEL" },
  { id: "dept_heads", label: "Department Heads & Branch Supervisors", text: "ALL DEPARTMENT HEADS & BRANCH SUPERVISORS" },
  { id: "tellers", label: "Branch Tellers & Field Personnel", text: "ALL BRANCH TELLERS, FIELD AGENTS & CASH COORDINATORS" },
  { id: "site_eng", label: "Site Engineers & Technical Staff", text: "ALL PROJECT SITE ENGINEERS & TECHNICAL PERSONNEL" },
  { id: "skeletal", label: "Designated Skeletal Force on Shift", text: "ALL DESIGNATED SKELETAL FORCE PERSONNEL ON SHIFT" }
];

// Smart AI Classification Analyzer
export function analyzeTopicClassification(topicText = "", subjectText = "") {
  const combined = `${topicText} ${subjectText}`.toLowerCase();

  if (
    combined.includes("holiday") ||
    combined.includes("non-working") ||
    combined.includes("pasko") ||
    combined.includes("christmas") ||
    combined.includes("new year") ||
    combined.includes("proclamation") ||
    combined.includes("holy week") ||
    combined.includes("labor day")
  ) {
    return {
      category: "Holiday Schedule",
      reason: "Detected holiday schedule and non-working advisory terms."
    };
  }

  if (
    combined.includes("tardiness") ||
    combined.includes("biometric") ||
    combined.includes("grace period") ||
    combined.includes("late") ||
    combined.includes("absent") ||
    combined.includes("awol") ||
    combined.includes("noe") ||
    combined.includes("notice of explanation") ||
    combined.includes("disciplinary") ||
    combined.includes("compliance") ||
    combined.includes("infraction") ||
    combined.includes("due process") ||
    combined.includes("penalty")
  ) {
    return {
      category: "Mandatory Compliance",
      reason: "Detected attendance, biometric compliance, or disciplinary terms."
    };
  }

  if (
    combined.includes("lunch") ||
    combined.includes("break") ||
    combined.includes("shift") ||
    combined.includes("rotation") ||
    combined.includes("draw") ||
    combined.includes("teller") ||
    combined.includes("remittance") ||
    combined.includes("cutoff") ||
    combined.includes("handover") ||
    combined.includes("sop") ||
    combined.includes("procedure") ||
    combined.includes("collection") ||
    combined.includes("cash") ||
    combined.includes("skeletal") ||
    combined.includes("communication") ||
    combined.includes("response") ||
    combined.includes("accessible")
  ) {
    return {
      category: "Operational Directive",
      reason: "Detected operational communication, shift rotation, or gaming structure terms."
    };
  }

  if (
    combined.includes("safety") ||
    combined.includes("ppe") ||
    combined.includes("helmet") ||
    combined.includes("typhoon") ||
    combined.includes("weather") ||
    combined.includes("hazard") ||
    combined.includes("calamity") ||
    combined.includes("health") ||
    combined.includes("first aid")
  ) {
    return {
      category: "Safety & Health",
      reason: "Detected occupational safety, health, or weather preparedness terms."
    };
  }

  if (
    combined.includes("executive order") ||
    combined.includes("president") ||
    combined.includes("ceo") ||
    combined.includes("board") ||
    combined.includes("appointment") ||
    combined.includes("reorganization")
  ) {
    return {
      category: "Executive Order",
      reason: "Detected executive level appointment or leadership order terms."
    };
  }

  return {
    category: "General Policy",
    reason: "Standard administrative or organizational policy."
  };
}

// Smart Topic Analyzer: Generates formal uppercase Subject Line and authentic 4-paragraph memo directives
export function generateTopicDetails(rawTopic = "", lang = "english") {
  const text = (rawTopic || "").trim();
  const lower = text.toLowerCase();
  
  const analysis = analyzeTopicClassification(text, text);
  const category = analysis.category;

  let generatedSubject = "";
  let generatedDirectives = "";
  let suggestedTo = "ALL EMPLOYEES AND CONCERNED PERSONNEL";

  if (
    lower.includes("response") ||
    lower.includes("communication") ||
    lower.includes("reachable") ||
    lower.includes("responsive") ||
    lower.includes("accessible")
  ) {
    generatedSubject = "IMMEDIATE RESPONSE AND COMMUNICATION ACCESSIBILITY";
    suggestedTo = "HR ON-SITE, CIC, AND FIELD MONITORING";
    generatedDirectives =
      "All officers and concerned personnel are reminded to remain reachable and responsive to calls, messages, and all official communication channels, particularly during official working hours and PCSO STL operating/betting hours.\n\n" +
      "Given the nature of our operations under the PCSO Small Town Lottery (STL) structure and our responsibility within the gaming industry, immediate communication and timely response are essential to ensure continuous coordination, proper monitoring, and prompt action on operational concerns.\n\n" +
      "All concerned personnel are expected to maintain active and accessible communication lines at all times and respond to urgent matters without unnecessary delay.\n\n" +
      "Strict compliance is expected.";
  } else if (
    lower.includes("cellphone") ||
    lower.includes("mobile") ||
    lower.includes("gadget") ||
    lower.includes("phone")
  ) {
    generatedSubject = "POLICY DIRECTIVE: PROHIBITION OF CELLULAR PHONE USAGE DURING OPERATIONAL HOURS";
    suggestedTo = "ALL BRANCH TELLERS, FIELD AGENTS & CASH COORDINATORS";
    generatedDirectives =
      "All officers, branch tellers, and concerned personnel are reminded to refrain from unauthorized cellular phone and personal gadget usage during official duty hours, particularly during official working hours and PCSO STL operating/betting hours.\n\n" +
      "Given the nature of our operations under the PCSO Small Town Lottery (STL) structure and our responsibility within the gaming industry, undivided attention, customer service focus, and transaction integrity are essential to ensure continuous coordination, proper monitoring, and prompt action on operational concerns.\n\n" +
      "All concerned personnel are expected to keep personal mobile devices in designated storage areas or silent mode at all times and attend to personal matters strictly during authorized break intervals.\n\n" +
      "Strict compliance is expected.";
  } else if (
    lower.includes("lunch") ||
    (lower.includes("break") && (lower.includes("11") || lower.includes("12") || lower.includes("time")))
  ) {
    generatedSubject = "ADJUSTMENT OF OFFICIAL LUNCH BREAK SCHEDULE (11:00 AM TO 12:00 PM)";
    suggestedTo = "ALL EMPLOYEES AND CONCERNED PERSONNEL";
    generatedDirectives =
      "All officers and concerned personnel are hereby advised of the official adjustment in our daily lunch break schedule across all operational units and corporate offices.\n\n" +
      "Given the continuous nature of our daily operations and our commitment to maintaining uninterrupted client service, the official lunch break is designated strictly from 11:00 AM to 12:00 PM. Designated branch supervisors and area leads must maintain an adequate rotational skeletal workforce so operations remain fully active and coordinated.\n\n" +
      "All concerned personnel are expected to resume workstation duties promptly at 12:00 PM and strictly observe accurate biometric clock-in and clock-out logging for compliance and payroll verification.\n\n" +
      "Strict compliance is expected.";
  } else if (
    lower.includes("holiday") ||
    lower.includes("non-working") ||
    lower.includes("walang pasok") ||
    lower.includes("pasko") ||
    lower.includes("new year")
  ) {
    generatedSubject = "ADVISORY: DECLARED SPECIAL NON-WORKING HOLIDAY AND SKELETAL FORCE ROTATION";
    suggestedTo = "ALL EMPLOYEES AND CONCERNED PERSONNEL";
    generatedDirectives =
      "All officers, branch personnel, and site staff are hereby advised of the upcoming declared Special Non-Working Holiday across all operating areas.\n\n" +
      "In observance of the official national proclamation, corporate administrative offices shall be closed. However, to maintain continuous service delivery, critical operational units, gaming branches, and designated field sites shall deploy an authorized rotational skeletal workforce. Premium compensation for personnel rendering duty shall be computed in accordance with statutory DOLE holiday pay guidelines.\n\n" +
      "All concerned supervisors are expected to coordinate their respective shift assignments and ensure seamless operations during the holiday period.\n\n" +
      "Strict compliance is expected.";
  } else if (
    lower.includes("tardiness") ||
    lower.includes("biometric") ||
    lower.includes("grace period") ||
    lower.includes("late") ||
    lower.includes("absent") ||
    lower.includes("attendance")
  ) {
    generatedSubject = "MANDATORY COMPLIANCE: BIOMETRIC TIMEKEEPING AND ATTENDANCE PROTOCOLS";
    suggestedTo = "ALL EMPLOYEES AND CONCERNED PERSONNEL";
    generatedDirectives =
      "All officers, branch staff, and concerned personnel are reminded of the mandatory observance of daily biometric timekeeping protocols upon arrival and departure, particularly during scheduled operational shifts.\n\n" +
      "Given our commitment to workplace discipline and accurate payroll administration, all personnel must log their attendance through the designated biometric terminals within the authorized fifteen (15) minute grace period. Any official field assignment or off-site business must be supported by an approved Official Business (OB) slip submitted to the HR Department within forty-eight (48) hours.\n\n" +
      "All concerned personnel are expected to uphold punctuality at all times, as habitual tardiness and unrecorded logs shall be processed strictly in accordance with company disciplinary rules.\n\n" +
      "Strict compliance is expected.";
  } else if (
    lower.includes("overtime") ||
    lower.includes("ot filing") ||
    lower.includes("over time")
  ) {
    generatedSubject = "OPERATIONAL DIRECTIVE: OVERTIME AUTHORIZATION AND PAYROLL CUTOFF FILING";
    suggestedTo = "ALL DEPARTMENT HEADS & BRANCH SUPERVISORS";
    generatedDirectives =
      "All department heads, branch supervisors, and concerned personnel are reminded that all rendered overtime must have prior written approval before actual execution.\n\n" +
      "Given the rigorous audit protocols governing company payroll disbursement, duly approved overtime forms must be submitted to the HRMD at least three (3) business days prior to the cutoff date. Rendered hours without valid pre-approval or timely filing shall not be credited.\n\n" +
      "All concerned supervisors are expected to validate operational necessity before authorizing additional hours and maintain strict budget oversight.\n\n" +
      "Strict compliance is expected.";
  } else if (
    lower.includes("safety") ||
    lower.includes("ppe") ||
    lower.includes("helmet") ||
    lower.includes("hazard") ||
    lower.includes("typhoon") ||
    lower.includes("baha") ||
    lower.includes("calamity")
  ) {
    generatedSubject = "SAFETY DIRECTIVE: MANDATORY PPE PROTOCOLS AND WORKPLACE HAZARD READINESS";
    suggestedTo = "ALL PROJECT SITE ENGINEERS, SITE SUPERVISORS & FIELD WORKERS";
    generatedDirectives =
      "All site engineers, field supervisors, and concerned personnel are reminded of the strict observance of occupational safety standards and mandatory protective equipment in all active operational zones.\n\n" +
      "Given the hazards inherent in field operations and project environments, the wearing of complete Personal Protective Equipment (PPE) is strictly mandatory at all times. Site supervisors must conduct daily five-minute pre-shift safety briefings to identify risks and ensure emergency preparedness.\n\n" +
      "All concerned personnel are expected to maintain vigilance at all times and immediately escalate any safety hazard, incident, or near-miss to the Safety Officer within two (2) hours of occurrence.\n\n" +
      "Strict compliance is expected.";
  } else if (
    lower.includes("uniform") ||
    lower.includes("dress code") ||
    lower.includes("id") ||
    lower.includes("badge") ||
    lower.includes("grooming")
  ) {
    generatedSubject = "POLICY DIRECTIVE: MANDATORY OFFICE UNIFORM, GROOMING AND COMPANY ID DISPLAY";
    suggestedTo = "ALL EMPLOYEES AND CONCERNED PERSONNEL";
    generatedDirectives =
      "All corporate personnel, branch tellers, and operational staff are reminded of the mandatory adherence to official dress code, grooming, and company identification standards.\n\n" +
      "As representatives of our organization within the community and industry, personnel must wear the prescribed company uniform in accordance with the weekly schedule and prominently display their official company ID cards at all times within company premises.\n\n" +
      "All concerned personnel are expected to maintain neat, professional grooming reflecting our corporate values and undergo periodic compliance checks by branch managers.\n\n" +
      "Strict compliance is expected.";
  } else if (
    lower.includes("teller") ||
    lower.includes("cash") ||
    lower.includes("remittance") ||
    lower.includes("draw") ||
    lower.includes("shortage")
  ) {
    generatedSubject = "STANDARD PROTOCOL: TELLER CASH REMITTANCE AND DRAW CUTOFF VERIFICATION";
    suggestedTo = "ALL BRANCH TELLERS, FIELD AGENTS & CASH COORDINATORS";
    generatedDirectives =
      "All branch tellers, field cash coordinators, and area supervisors are directed to observe the standard cutoff protocols and remittance verification procedures for all daily draw operations.\n\n" +
      "Given the critical nature of our gaming operations and the strict accountability required for daily sales collections, all counters must observe the mandatory fifteen (15) minute cutoff prior to scheduled draw closures for terminal reconciliation. Physical cash counts, winning payout receipts, and terminal audit logs must match prior to supervisor sign-off.\n\n" +
      "All concerned personnel are expected to maintain meticulous financial records and ensure the immediate secure turnover of daily remittances to the authorized vault custodian without delay.\n\n" +
      "Strict compliance is expected.";
  } else if (
    lower.includes("courtesy") ||
    lower.includes("player") ||
    lower.includes("customer") ||
    lower.includes("service")
  ) {
    generatedSubject = "POLICY DIRECTIVE: PROFESSIONAL CUSTOMER COURTESY AND PLAYER RELATIONS";
    suggestedTo = "ALL BRANCH TELLERS, FIELD AGENTS & CASH COORDINATORS";
    generatedDirectives =
      "All frontline personnel, branch tellers, and field coordinators are reminded to observe exemplary customer courtesy, professionalism, and patience in handling all player and patron interactions.\n\n" +
      "Given the customer-facing nature of our operations under the PCSO Small Town Lottery (STL) structure and our corporate dedication to service excellence, courteous engagement and prompt assistance are essential to maintaining public trust and brand reputation.\n\n" +
      "All concerned personnel are expected to maintain composure at all times, address player inquiries respectfully, and immediately escalate unresolved disputes to the Branch Supervisor.\n\n" +
      "Strict compliance is expected.";
  } else {
    // Intelligent corporate formatting matching the exact 4-paragraph corporate structure
    const cleaned = text.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    const upperTitle = words.map(w => w.toUpperCase()).join(" ");

    generatedSubject = upperTitle || "OFFICIAL DIRECTIVE AND OPERATIONAL GUIDELINES";
    suggestedTo = "ALL EMPLOYEES AND CONCERNED PERSONNEL";
    generatedDirectives =
      `All officers and concerned personnel are reminded to observe and uphold standard company directives regarding ${text || "operational protocols"}, particularly during official working hours and daily operational shifts.\n\n` +
      `Given the nature of our operations under the PCSO Small Town Lottery (STL) structure and our collective responsibility to maintain the highest standards of organizational efficiency and service, adherence to these guidelines is essential to ensure continuous coordination, proper monitoring, and prompt action on operational concerns.\n\n` +
      `All concerned personnel are expected to maintain full compliance with these directives at all times and coordinate with their respective department heads on any related operational matters without unnecessary delay.\n\n` +
      `Strict compliance is expected.`;
  }

  return {
    subject: generatedSubject,
    directives: generatedDirectives,
    classification: category,
    suggestedTo,
    reason: analysis.reason
  };
}

export default function MemoDraftModal({
  isOpen = false,
  onClose,
  onGenerate,
  onOpenInGenerator
}) {
  const [currentStep, setCurrentStep] = useState(1);

  // Persistent Topics (presets + custom saved in localStorage)
  const [topics, setTopics] = useState(() => loadSavedTopics());

  // Form State - Dynamically defaulted to the active default topic!
  const [selectedCompanyId, setSelectedCompanyId] = useState("lucky_betplay");
  const [language, setLanguage] = useState("english");

  const [subject, setSubject] = useState(() => {
    const initialList = loadSavedTopics();
    const def = findActiveDefaultTopic(initialList);
    return def?.subject || "IMMEDIATE RESPONSE AND COMMUNICATION ACCESSIBILITY";
  });

  const [classification, setClassification] = useState(() => {
    const initialList = loadSavedTopics();
    const def = findActiveDefaultTopic(initialList);
    return def?.classification || "Operational Directive";
  });

  const [classificationAnalysisReason, setClassificationAnalysisReason] = useState(() => {
    const initialList = loadSavedTopics();
    const def = findActiveDefaultTopic(initialList);
    if (def) {
      const a = analyzeTopicClassification((def.title || "") + " " + (def.details || ""), def.subject || "");
      return a.reason;
    }
    return "Detected operational communication and PCSO STL structure terms.";
  });

  const [memoTo, setMemoTo] = useState(() => {
    const initialList = loadSavedTopics();
    const def = findActiveDefaultTopic(initialList);
    return def?.suggestedTo || "HR ON-SITE, CIC, AND FIELD MONITORING";
  });

  const [selectedRecipientIds, setSelectedRecipientIds] = useState(["hr_cic_field"]);
  const [memoFrom, setMemoFrom] = useState("HUMAN RESOURCES DEPARTMENT");
  const [fromPreset, setFromPreset] = useState("hr_dept");
  
  // Default signatory requested by user
  const [signatoryName, setSignatoryName] = useState("JEVINCE JAYE S. JUBAY, CHRP");
  const [signatoryTitle, setSignatoryTitle] = useState("HRMD Manager");
  const [approverName, setApproverName] = useState("CHARMIE JEAN M. SIMPAL");
  const [approverTitle, setApproverTitle] = useState("President & CEO");

  const [directivesContent, setDirectivesContent] = useState(() => {
    const initialList = loadSavedTopics();
    const def = findActiveDefaultTopic(initialList);
    return def?.details || "";
  });

  // Magnified Review & Edit State
  const [isMagnified, setIsMagnified] = useState(false);

  // Add Topic & Analyzer State
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicSubject, setNewTopicSubject] = useState("");
  const [newTopicDetails, setNewTopicDetails] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const currentCompany = useMemo(() => {
    return COMPANIES.find((c) => c.id === selectedCompanyId) || COMPANIES[0];
  }, [selectedCompanyId]);

  // Handle AI Analyzer for Topic
  const handleAnalyzeNewTopic = () => {
    const raw = newTopicTitle.trim();
    if (!raw) {
      alert("Please enter a topic title or idea first (e.g. 'Communication accessibility' or 'Lunch break 11 to 12').");
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      const result = generateTopicDetails(raw, language);
      setNewTopicSubject(result.subject);
      setNewTopicDetails(result.directives);
      setSubject(result.subject);
      setDirectivesContent(result.directives);
      setClassification(result.classification);
      setClassificationAnalysisReason(result.reason);
      if (result.suggestedTo) {
        setMemoTo(result.suggestedTo);
      }
      setIsAnalyzing(false);
    }, 280);
  };

  const handleSaveCustomTopic = () => {
    if (!newTopicTitle.trim()) {
      alert("Please enter a Topic Title first.");
      return;
    }
    
    let finalSubject = newTopicSubject.trim();
    let finalDetails = newTopicDetails.trim();
    let finalCategory = classification;

    if (!finalSubject || !finalDetails) {
      const generated = generateTopicDetails(newTopicTitle.trim(), language);
      finalSubject = finalSubject || generated.subject;
      finalDetails = finalDetails || generated.directives;
      finalCategory = generated.classification;
    }

    const newTopic = {
      id: `custom-topic-${Date.now()}`,
      title: newTopicTitle.trim(),
      subject: finalSubject,
      details: finalDetails,
      classification: finalCategory,
      suggestedTo: memoTo,
      isCustom: true,
      isDefault: true, // Saved topic automatically becomes the active default!
      createdAt: Date.now()
    };

    // Prepend new topic to the very top and unset other isDefault flags
    const updated = [
      newTopic,
      ...topics.map((t) => ({ ...t, isDefault: false }))
    ];

    setTopics(updated);
    saveTopicsToStorage(updated);

    handleSelectTopic(newTopic);
    setIsAddingTopic(false);
    setNewTopicTitle("");
    setNewTopicSubject("");
    setNewTopicDetails("");
  };

  // Set any selected topic as default and move to top
  const handleSetDefaultTopic = (topicId, e) => {
    e?.stopPropagation();
    const target = topics.find((t) => t.id === topicId);
    if (!target) return;

    const remapped = topics.map((t) => ({
      ...t,
      isDefault: t.id === topicId
    }));
    const targetIdx = remapped.findIndex((t) => t.id === topicId);
    if (targetIdx > 0) {
      const [item] = remapped.splice(targetIdx, 1);
      remapped.unshift(item);
    }

    setTopics(remapped);
    saveTopicsToStorage(remapped);
    handleSelectTopic(target);
  };

  // Delete topic handler: If default is deleted, saved topics automatically become the new default!
  const handleDeleteTopic = (topicId, e) => {
    e.stopPropagation();
    const topicToDelete = topics.find((t) => t.id === topicId);
    const remaining = topics.filter((t) => t.id !== topicId);

    if (remaining.length === 0) {
      setTopics([]);
      saveTopicsToStorage([]);
      return;
    }

    const wasDefault = Boolean(topicToDelete?.isDefault || topicToDelete?.subject === subject);

    let updatedList = [...remaining];
    let newDefaultTopic = null;

    if (wasDefault) {
      // Kung na-delete ang default:
      // Ang magiging default na is yung mga na-save na topic suggestions (isCustom)
      // Kung wala pang saved custom, kunin ang unang natitirang topic
      const firstSavedCustom = remaining.find((t) => t.isCustom);
      newDefaultTopic = firstSavedCustom || remaining[0];

      // Markahan as default at ilagay sa index 0
      updatedList = remaining.map((t) => ({
        ...t,
        isDefault: t.id === newDefaultTopic.id
      }));

      const defIdx = updatedList.findIndex((t) => t.id === newDefaultTopic.id);
      if (defIdx > 0) {
        const [defItem] = updatedList.splice(defIdx, 1);
        updatedList.unshift(defItem);
      }
    } else {
      // Panatilihing may kahit isang default
      const hasDefault = updatedList.some((t) => t.isDefault);
      if (!hasDefault) {
        const firstSavedCustom = updatedList.find((t) => t.isCustom);
        const fallbackTarget = firstSavedCustom || updatedList[0];
        updatedList = updatedList.map((t) => ({
          ...t,
          isDefault: t.id === fallbackTarget.id
        }));
      }
    }

    setTopics(updatedList);
    saveTopicsToStorage(updatedList);

    // Agad ilipat ang form details sa bagong default saved topic
    if (wasDefault && newDefaultTopic) {
      handleSelectTopic(newDefaultTopic);
    }
  };

  // Restore presets while preserving user's saved custom topics
  const handleRestoreDefaultTopics = () => {
    const customTopics = topics.filter((t) => t.isCustom);

    let restored;
    if (customTopics.length > 0) {
      const markedCustom = customTopics.map((c, i) => ({
        ...c,
        isDefault: i === 0
      }));
      restored = [
        ...markedCustom,
        ...DEFAULT_TOPIC_PRESETS.map((p) => ({ ...p, isDefault: false }))
      ];
    } else {
      restored = DEFAULT_TOPIC_PRESETS.map((p, idx) => ({
        ...p,
        isDefault: idx === 0
      }));
    }

    setTopics(restored);
    saveTopicsToStorage(restored);

    const active = findActiveDefaultTopic(restored);
    if (active) {
      handleSelectTopic(active);
    }
  };

  const handleSelectTopic = (topic) => {
    if (!topic) return;
    setSubject(topic.subject || "");
    if (topic.details) {
      setDirectivesContent(topic.details);
    }
    if (topic.suggestedTo) {
      setMemoTo(topic.suggestedTo);
    }
    const analysis = analyzeTopicClassification(
      (topic.title || "") + " " + (topic.details || ""),
      topic.subject || ""
    );
    setClassification(topic.classification || analysis.category);
    setClassificationAnalysisReason(analysis.reason);
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompanyId(companyId);
    const comp = COMPANIES.find((c) => c.id === companyId);
    if (comp) {
      setSignatoryName(comp.defaultSignatory || "JEVINCE JAYE S. JUBAY, CHRP");
      setSignatoryTitle(comp.defaultSignatoryTitle || "HRMD Manager");
      setApproverName(comp.defaultApprover || "CHARMIE JEAN M. SIMPAL");
      setApproverTitle(comp.defaultApproverTitle || "President & CEO");
      if (comp.defaultTo && selectedRecipientIds.length === 1 && selectedRecipientIds[0] === "hr_cic_field") {
        setMemoTo(comp.defaultTo);
      }
    }
  };

  const handleToggleRecipient = (recId) => {
    let updated;
    if (selectedRecipientIds.includes(recId)) {
      updated = selectedRecipientIds.filter((id) => id !== recId);
    } else {
      updated = [...selectedRecipientIds, recId];
    }
    setSelectedRecipientIds(updated);

    const compiledText = updated
      .map((id) => RECIPIENT_CHECKBOXES.find((r) => r.id === id)?.text)
      .filter(Boolean)
      .join(" & ");

    setMemoTo(compiledText || "ALL CONCERNED PERSONNEL");
  };

  const handleFromPresetChange = (presetKey) => {
    setFromPreset(presetKey);
    const map = {
      hr_dept: "HUMAN RESOURCES DEPARTMENT",
      hr_md: "Office of the HR / Managing Director",
      pres_ceo: "Office of the President & CEO",
      ops_mgmt: "Operations Management",
      vp_eng: "Office of the Vice President for Engineering",
      audit_exec: "Executive Management & Corporate Audit",
      custom: memoFrom
    };
    if (presetKey !== "custom") {
      setMemoFrom(map[presetKey] || memoFrom);
    }
  };

  const handleBuildPrompt = (immediateSend = true) => {
    const promptText = `Draft an official company memorandum in the exact corporate format of our organization:

TO: ${memoTo.trim()}
FROM: ${memoFrom.trim()}
DATE: ${new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase()}
SUBJECT: ${subject.trim().toUpperCase()}

${directivesContent.trim()}

${signatoryName.trim().toUpperCase()}
${signatoryTitle.trim()}
${currentCompany.name}

HUMAN RESOURCE MANAGEMENT DIVISION`;

    onGenerate?.(promptText, immediateSend);
    onClose?.();
  };

  const handleOpenInGenerator = () => {
    const draftPayload = {
      companyCode: currentCompany.code,
      companyId: currentCompany.id,
      companyName: currentCompany.name,
      ref: `MEMO-2026-${currentCompany.code}-001`,
      date: new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit", year: "numeric" }).format(new Date()).toUpperCase(),
      to: memoTo.trim().toUpperCase(),
      from: memoFrom.trim().toUpperCase(),
      subject: subject.trim().toUpperCase(),
      classification: classification,
      content: directivesContent.trim(),
      signatoryName: signatoryName.trim().toUpperCase(),
      signatoryTitle: signatoryTitle.trim(),
      signatoryCompany: currentCompany.defaultSignatoryCompany || currentCompany.name,
      approverName: approverName.trim().toUpperCase(),
      approverTitle: approverTitle.trim()
    };

    try {
      localStorage.setItem("hrhub_active_memo_draft", JSON.stringify(draftPayload));
    } catch {}

    onOpenInGenerator?.(draftPayload);
    onClose?.();
  };

  const [activeMobileTab, setActiveMobileTab] = useState("controls"); // "controls" | "preview"
  const [copied, setCopied] = useState(false);
  const [isSignatoriesExpanded, setIsSignatoriesExpanded] = useState(false);
  const [isParametersExpanded, setIsParametersExpanded] = useState(false);

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "2-digit",
      year: "numeric"
    }).format(new Date()).toUpperCase();
  }, []);

  const handleCopyMemo = () => {
    const fullMemoText = `${currentCompany.name.toUpperCase()}
${currentCompany.address}

MEMORANDUM
REF NO: ${currentCompany.code}-HRMD-${new Date().getFullYear()}-001
CLASSIFICATION: ${classification.toUpperCase()}

TO:      ${memoTo.trim()}
FROM:    ${memoFrom.trim()}
DATE:    ${formattedDate}
SUBJECT: ${subject.trim().toUpperCase()}

${directivesContent.trim()}

ISSUED BY:
${signatoryName.trim().toUpperCase()}
${signatoryTitle.trim()}
${currentCompany.defaultSignatoryCompany || currentCompany.name}

NOTED & APPROVED BY:
${approverName.trim().toUpperCase()}
${approverTitle.trim()}
${currentCompany.name}`;

    try {
      navigator.clipboard.writeText(fullMemoText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleAddComplianceClause = () => {
    const clause = "\n\nAll concerned personnel are strictly directed to observe compliance with these established directives. Any violation or failure to comply shall be subject to administrative review in accordance with company policy.\n\nStrict compliance is expected.";
    if (!directivesContent.includes("Strict compliance is expected.")) {
      setDirectivesContent((prev) => `${prev.trim()}${clause}`);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Sync topics with latest localStorage saved state upon opening modal
    const currentList = loadSavedTopics();
    setTopics(currentList);

    const activeDef = findActiveDefaultTopic(currentList);
    if (activeDef) {
      const matchesExisting = currentList.some((t) => t.subject === subject);
      if (!matchesExisting) {
        handleSelectTopic(activeDef);
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (isMagnified) {
          setIsMagnified(false);
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMagnified, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <style>{`
        @keyframes studio-fade-in {
          0% { opacity: 0; transform: scale(0.98) translateY(12px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .ai-studio-animate {
          animation: studio-fade-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .official-memo-paper {
          background-image: linear-gradient(to bottom, #ffffff, #fafafa);
        }
      `}</style>

      {/* ================= FULL-SCREEN FOCUS EDITOR OVERLAY ================= */}
      {isMagnified && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsMagnified(false)}
        >
          <div
            className="ai-studio-animate relative w-full max-w-4xl h-[88vh] max-h-[900px] flex flex-col rounded-2xl bg-white border border-sky-200 shadow-2xl overflow-hidden ring-1 ring-black/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Focus Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-xs">
                  <Maximize2 size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      Executive Directives Focus Editor
                    </h3>
                    <span className="text-[10px] font-semibold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-md border border-sky-400/30">
                      Live Document Sync
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[280px] sm:max-w-lg uppercase font-semibold">
                    {subject || "OFFICIAL MEMORANDUM DIRECTIVES"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMagnified(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Minimize (Esc)"
              >
                <Minimize2 size={16} />
              </button>
            </div>

            {/* Quick Toolbar */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-xs shrink-0">
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <span className="font-semibold text-slate-700">
                  {directivesContent.split("\n\n").filter((p) => p.trim()).length} Paragraphs
                </span>
                <span>•</span>
                <span>{directivesContent.length} characters</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddComplianceClause}
                  className="text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Plus size={12} />
                  <span>Add Compliance Clause</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!subject.trim()) return;
                    const res = generateTopicDetails(subject, language);
                    setDirectivesContent(res.directives);
                    setClassification(res.classification);
                    setClassificationAnalysisReason(res.reason);
                  }}
                  className="text-xs font-medium text-sky-700 bg-white hover:bg-sky-50 border border-slate-200 px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                  title="Re-generate directives with AI"
                >
                  <Sparkles size={12} className="text-sky-600" />
                  <span>Re-Analyze</span>
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="p-6 flex-1 overflow-y-auto space-y-3">
              <textarea
                autoFocus
                rows={14}
                value={directivesContent}
                onChange={(e) => {
                  setDirectivesContent(e.target.value);
                  const analysis = analyzeTopicClassification(e.target.value, subject);
                  setClassification(analysis.category);
                  setClassificationAnalysisReason(analysis.reason);
                }}
                className="w-full h-full min-h-[360px] rounded-xl border border-sky-200 bg-sky-50/20 p-4 text-xs sm:text-sm text-slate-900 leading-relaxed font-sans focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition resize-none"
                placeholder="Type official memorandum paragraphs here..."
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
              <span className="text-xs text-slate-400 hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">Esc</kbd> to minimize
              </span>

              <button
                type="button"
                onClick={() => setIsMagnified(false)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs transition cursor-pointer ml-auto"
              >
                <Check size={13} />
                <span>Done Editing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MASTER STUDIO CONTAINER ================= */}
      <div
        className="ai-studio-animate relative w-full max-w-[1340px] h-[92vh] max-h-[920px] flex flex-col rounded-2xl sm:rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden ring-1 ring-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Studio Master Header */}
        <div className="bg-slate-950 text-white px-5 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between shrink-0 gap-3">
          {/* Left Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 shadow-xs">
              <FileText size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Executive Memo Studio
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-500/30">
                  <Sparkles size={10} />
                  <span>AI Live Drafter</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Smart parameters on left • Live official memorandum updates on right
              </p>
            </div>
          </div>

          {/* Center: Quick Entity Selector Pills */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {COMPANIES.map((comp) => {
              const isSel = selectedCompanyId === comp.id;
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => handleCompanyChange(comp.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    isSel
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                  title={`${comp.name} (${comp.code})`}
                >
                  <img src={comp.logoUrl} alt={comp.code} className="w-3.5 h-3.5 object-contain rounded-2xs" />
                  <span>{comp.code}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Language, Mobile Switcher, Close */}
          <div className="flex items-center gap-2">
            {/* Language Segmented Control */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-semibold">
              {LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguage(l.id)}
                  className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                    language === l.id
                      ? "bg-sky-600 text-white shadow-2xs"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title={l.desc}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Mobile View Toggle */}
            <div className="flex lg:hidden items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setActiveMobileTab("controls")}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  activeMobileTab === "controls" ? "bg-sky-600 text-white" : "text-slate-400"
                }`}
              >
                Studio
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileTab("preview")}
                className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                  activeMobileTab === "preview" ? "bg-sky-600 text-white" : "text-slate-400"
                }`}
              >
                Memo Paper
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Split-View Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* ================= LEFT PANE: STUDIO BUILDER CONTROLS ================= */}
          <div
            className={`lg:col-span-5 flex-col h-full overflow-hidden bg-slate-50/80 border-r border-slate-200/80 ${
              activeMobileTab === "controls" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Scrollable Controls */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              
              {/* Section 1: Topic Suggestions Hub & AI Analyzer */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-sky-600" />
                    <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">
                      Topic Suggestions
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {topics.length < DEFAULT_TOPIC_PRESETS.length && (
                      <button
                        type="button"
                        onClick={handleRestoreDefaultTopics}
                        className="text-[10px] text-sky-600 hover:text-sky-700 font-medium underline flex items-center gap-0.5 cursor-pointer"
                        title="Restore default presets"
                      >
                        <RotateCcw size={9} />
                        <span>Restore</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsAddingTopic(!isAddingTopic)}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg border border-sky-200 transition cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={11} />
                      <span>{isAddingTopic ? "Cancel" : "Add Topic"}</span>
                    </button>
                  </div>
                </div>

                {/* Inline AI Analyzer Drawer */}
                {isAddingTopic && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 space-y-2.5 animate-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-sky-950 flex items-center gap-1">
                        <Zap size={12} className="text-sky-600" />
                        <span>AI Topic Analyzer</span>
                      </span>
                      <span className="text-[10px] text-sky-700 font-medium">Type topic idea then click ⚡</span>
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newTopicTitle}
                        onChange={(e) => setNewTopicTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAnalyzeNewTopic();
                          }
                        }}
                        placeholder="e.g. Daily shift turnover report, Biometrics compliance..."
                        className="flex-1 rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleAnalyzeNewTopic}
                        disabled={isAnalyzing || !newTopicTitle.trim()}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer shrink-0"
                      >
                        <Zap size={11} className={isAnalyzing ? "animate-spin" : ""} />
                        <span>{isAnalyzing ? "Analyzing..." : "⚡ Analyze"}</span>
                      </button>
                    </div>

                    {/* Auto-filled details */}
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={newTopicSubject}
                        onChange={(e) => setNewTopicSubject(e.target.value)}
                        placeholder="Subject line will be generated..."
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 uppercase"
                      />
                      <textarea
                        rows={3}
                        value={newTopicDetails}
                        onChange={(e) => setNewTopicDetails(e.target.value)}
                        placeholder="Directives paragraphs will be generated..."
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-800 font-sans leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-sky-200/70">
                      <span className="text-[10px] text-slate-500">
                        Class: <strong className="text-sky-700">{analyzeTopicClassification(newTopicTitle || newTopicSubject).category}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveCustomTopic}
                        className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[11px] shadow-xs transition cursor-pointer"
                      >
                        Save to Presets
                      </button>
                    </div>
                  </div>
                )}

                {/* Topic Pills Cloud */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {topics.map((t) => {
                    const isSel = subject === t.subject;
                    const isDef = Boolean(t.isDefault);
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTopic(t)}
                        className={`group relative inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg border text-xs transition cursor-pointer select-none ${
                          isSel
                            ? "bg-sky-600 text-white font-semibold border-sky-600 shadow-xs"
                            : isDef
                            ? "bg-sky-50/90 border-sky-300 text-sky-950 font-medium ring-1 ring-sky-200"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-sky-50/50 hover:border-sky-300"
                        }`}
                      >
                        {isDef ? (
                          <span
                            className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-2xs ${
                              isSel ? "bg-white text-sky-700" : "bg-sky-600 text-white"
                            }`}
                            title="Default preset"
                          >
                            Default
                          </span>
                        ) : t.isCustom ? (
                          <span className="text-[10px] text-amber-500 font-bold" title="Custom Saved Topic">★</span>
                        ) : null}

                        <span className="truncate max-w-[200px]">{t.title}</span>

                        <div className="flex items-center gap-0.5 ml-0.5">
                          {!isDef && (
                            <button
                              type="button"
                              onClick={(e) => handleSetDefaultTopic(t.id, e)}
                              className={`p-0.5 rounded text-[10px] transition cursor-pointer ${
                                isSel ? "text-sky-200 hover:text-white" : "text-slate-400 hover:text-sky-600"
                              }`}
                              title="Set as Default Topic"
                            >
                              ★
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTopic(t.id, e)}
                            className={`p-0.5 rounded transition cursor-pointer ${
                              isSel ? "text-sky-100 hover:text-white" : "text-slate-400 hover:text-rose-600"
                            }`}
                            title={`Delete "${t.title}"`}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Subject Line & Classification */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Official Subject Line
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!subject.trim()) return;
                      const res = generateTopicDetails(subject, language);
                      setSubject(res.subject);
                      setDirectivesContent(res.directives);
                      setClassification(res.classification);
                      setClassificationAnalysisReason(res.reason);
                      if (res.suggestedTo) setMemoTo(res.suggestedTo);
                    }}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1 cursor-pointer transition"
                    title="Auto-generate directives from subject"
                  >
                    <Sparkles size={11} />
                    <span>⚡ Auto-Generate Directives</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    const analysis = analyzeTopicClassification(directivesContent, e.target.value);
                    setClassification(analysis.category);
                    setClassificationAnalysisReason(analysis.reason);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none uppercase transition"
                />

                {/* Classification bar */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-medium">Classification:</span>
                    <span className="rounded-md bg-sky-50 text-sky-800 font-bold px-2 py-0.5 border border-sky-200">
                      {classification}
                    </span>
                  </div>
                  <select
                    value={classification}
                    onChange={(e) => {
                      setClassification(e.target.value);
                      setClassificationAnalysisReason("Selected via dropdown");
                    }}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700 focus:outline-none"
                  >
                    {CLASSIFICATIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 3: Recipients & Office (TO & FROM) */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Recipients (TO) & Office (FROM)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsParametersExpanded(!isParametersExpanded)}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                  >
                    {isParametersExpanded ? "Hide Options" : "Quick Chips"}
                  </button>
                </div>

                {/* Quick Recipient Chips */}
                {isParametersExpanded && (
                  <div className="grid grid-cols-2 gap-1.5 pb-1">
                    {RECIPIENT_CHECKBOXES.map((r) => {
                      const isChecked = selectedRecipientIds.includes(r.id);
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleToggleRecipient(r.id)}
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-[11px] text-left transition cursor-pointer select-none ${
                            isChecked
                              ? "bg-sky-50 border-sky-300 text-sky-900 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {isChecked ? <CheckSquare size={13} className="text-sky-600 shrink-0" /> : <Square size={13} className="text-slate-300 shrink-0" />}
                          <span className="truncate">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">TO (Recipients Line):</span>
                  <input
                    type="text"
                    value={memoTo}
                    onChange={(e) => setMemoTo(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-semibold text-slate-800 uppercase focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">FROM (Issuing Office):</span>
                  <select
                    value={fromPreset}
                    onChange={(e) => handleFromPresetChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    <option value="hr_dept">HUMAN RESOURCES DEPARTMENT</option>
                    <option value="hr_md">Office of the HR / Managing Director</option>
                    <option value="pres_ceo">Office of the President & CEO</option>
                    <option value="ops_mgmt">Operations Management</option>
                    <option value="vp_eng">Office of the Vice President for Engineering</option>
                    <option value="audit_exec">Executive Management & Corporate Audit</option>
                    <option value="custom">-- Custom Sender Name --</option>
                  </select>
                </div>
              </div>

              {/* Section 4: Directives & Guidelines Editor */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Directives & Guidelines Content
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddComplianceClause}
                      className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 px-2 py-0.5 rounded-md transition cursor-pointer"
                      title="Add standard strict compliance clause"
                    >
                      + Compliance
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMagnified(true)}
                      className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1"
                      title="Open full-screen focus editor"
                    >
                      <Maximize2 size={11} />
                      <span>Focus</span>
                    </button>
                  </div>
                </div>

                <textarea
                  rows={7}
                  value={directivesContent}
                  onChange={(e) => {
                    setDirectivesContent(e.target.value);
                    const analysis = analyzeTopicClassification(e.target.value, subject);
                    setClassification(analysis.category);
                    setClassificationAnalysisReason(analysis.reason);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-800 leading-relaxed font-sans focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none transition resize-y"
                  placeholder="Official memorandum directives..."
                />
              </div>

              {/* Section 5: Signatories Summary Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <UserCheck size={13} className="text-sky-600" />
                    <span className="font-bold text-[11px] text-slate-700 uppercase tracking-wider">
                      Executive Signatories
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSignatoriesExpanded(!isSignatoriesExpanded)}
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                  >
                    {isSignatoriesExpanded ? "Collapse" : "Edit Signatories"}
                  </button>
                </div>

                {!isSignatoriesExpanded ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100 text-slate-600">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Issued By</span>
                      <strong className="text-slate-800 block truncate">{signatoryName}</strong>
                      <span className="text-[10px] text-slate-500 block truncate">{signatoryTitle}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Approved By</span>
                      <strong className="text-slate-800 block truncate">{approverName}</strong>
                      <span className="text-[10px] text-slate-500 block truncate">{approverTitle}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Issued By</label>
                      <input
                        type="text"
                        value={signatoryName}
                        onChange={(e) => setSignatoryName(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800 uppercase"
                      />
                      <input
                        type="text"
                        value={signatoryTitle}
                        onChange={(e) => setSignatoryTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Approved By</label>
                      <input
                        type="text"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-800 uppercase"
                      />
                      <input
                        type="text"
                        value={approverTitle}
                        onChange={(e) => setApproverTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= RIGHT PANE: REAL-TIME OFFICIAL MEMO DOCUMENT ================= */}
          <div
            className={`lg:col-span-7 flex-col h-full overflow-hidden bg-slate-200/70 relative ${
              activeMobileTab === "preview" ? "flex" : "hidden lg:flex"
            }`}
          >
            {/* Top Preview Bar */}
            <div className="px-5 py-2.5 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-700">Official Memorandum Live Document</span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  [{currentCompany.code}-HRMD-2026-001]
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyMemo}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                >
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copied ? "Copied!" : "Copy Text"}</span>
                </button>
              </div>
            </div>

            {/* Canvas with Real Paper Sheet */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-7 flex justify-center items-start">
              <div className="official-memo-paper bg-white shadow-2xl rounded-sm border border-slate-300/80 p-7 sm:p-9 max-w-[620px] w-full text-slate-900 font-sans text-xs relative select-text transition-all">
                
                {/* Official Letterhead */}
                <div className="flex items-center justify-between pb-2.5">
                  <img
                    src={currentCompany.logoUrl}
                    alt={currentCompany.code}
                    className="h-11 sm:h-12 w-auto object-contain max-w-[120px]"
                  />
                  <div className="text-right">
                    <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-wide uppercase">
                      {currentCompany.name}
                    </h1>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 max-w-[320px] leading-tight mt-0.5 ml-auto">
                      {currentCompany.address}
                    </p>
                  </div>
                  {currentCompany.rightLogoUrl && (
                    <img
                      src={currentCompany.rightLogoUrl}
                      alt="Affiliate"
                      className="h-9 w-auto object-contain hidden sm:block ml-2"
                    />
                  )}
                </div>

                <div className="h-0.5 bg-slate-900 my-2.5" />

                {/* Document Header Banner */}
                <div className="text-center py-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pb-1 border-b border-slate-200">
                    <span>REF NO: {currentCompany.code}-HRMD-{new Date().getFullYear()}-001</span>
                    <span className="font-sans font-bold text-sky-700 uppercase bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      {classification}
                    </span>
                  </div>
                  <h2 className="text-sm sm:text-base font-black tracking-[0.25em] text-slate-900 uppercase pt-2">
                    MEMORANDUM
                  </h2>
                </div>

                <div className="h-px bg-slate-300 my-2" />

                {/* Key-Value Fields */}
                <div className="grid grid-cols-12 gap-y-1 py-1.5 text-[11px] leading-snug">
                  <div className="col-span-2 font-bold text-slate-700 uppercase">TO:</div>
                  <div className="col-span-10 font-bold text-slate-900 uppercase">{memoTo || "ALL CONCERNED PERSONNEL"}</div>

                  <div className="col-span-2 font-bold text-slate-700 uppercase">FROM:</div>
                  <div className="col-span-10 font-bold text-slate-900 uppercase">{memoFrom}</div>

                  <div className="col-span-2 font-bold text-slate-700 uppercase">DATE:</div>
                  <div className="col-span-10 font-semibold text-slate-800">{formattedDate}</div>

                  <div className="col-span-2 font-bold text-slate-700 uppercase">SUBJECT:</div>
                  <div className="col-span-10 font-black text-slate-900 uppercase">{subject}</div>
                </div>

                <div className="h-0.5 bg-slate-900 my-2.5" />

                {/* Directives Body Paragraphs */}
                <div className="py-2 space-y-3 text-[11px] sm:text-xs text-slate-800 font-sans leading-relaxed">
                  {directivesContent ? (
                    directivesContent.split("\n\n").map((para, idx) => (
                      <p key={idx} className="whitespace-pre-line text-justify">
                        {para}
                      </p>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No directives content entered yet. Choose a topic suggestion on the left to populate.</p>
                  )}
                </div>

                {/* Signatory Block */}
                <div className="mt-8 pt-4 grid grid-cols-2 gap-6 text-[11px]">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-6">
                      ISSUED BY:
                    </span>
                    <strong className="block text-slate-900 uppercase font-black tracking-wide underline decoration-slate-300 decoration-1 underline-offset-4">
                      {signatoryName}
                    </strong>
                    <span className="text-slate-600 block text-[10px] mt-0.5">{signatoryTitle}</span>
                    <span className="text-slate-400 block text-[9px] uppercase">
                      {currentCompany.defaultSignatoryCompany || currentCompany.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-400 block mb-6">
                      NOTED & APPROVED BY:
                    </span>
                    <strong className="block text-slate-900 uppercase font-black tracking-wide underline decoration-slate-300 decoration-1 underline-offset-4">
                      {approverName}
                    </strong>
                    <span className="text-slate-600 block text-[10px] mt-0.5">{approverTitle}</span>
                    <span className="text-slate-400 block text-[9px] uppercase">
                      {currentCompany.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 gap-3">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Live sync active • Changes reflect instantly on printable A4
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => handleBuildPrompt(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs transition cursor-pointer shadow-2xs"
                  title="Ask AI Buddy to polish or analyze"
                >
                  <Sparkles size={13} className="text-sky-600" />
                  <span>Ask AI Buddy</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenInGenerator}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition hover:scale-101 cursor-pointer"
                  title="Open directly in the Official Memo Generator (A4 Print Preview)"
                >
                  <FileText size={14} />
                  <span>Open in Memo Generator</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
