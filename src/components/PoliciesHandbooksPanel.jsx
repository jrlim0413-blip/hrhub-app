import { useState, useMemo, useEffect, useRef } from "react";
import {
  ShieldCheck, FileText, Search, BookOpen, Download,
  CheckCircle2, AlertTriangle, ArrowRight, X, ExternalLink,
  Printer, Scale, Sparkles, Building2, Lock, Award,
  Bookmark, ChevronRight, ChevronLeft, Layers, Eye,
  HeartPulse, Activity, Check, ListChecks
} from "lucide-react";

const CORPORATE_POLICIES = [
  {
    id: "handbook",
    title: "Employee Handbook & Code of Conduct",
    subtitle: "2026 Consolidated Operations Manual",
    category: "General HR & Employment",
    badge: "Official Handbook",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    coverGradient: "from-emerald-950 via-emerald-900 to-teal-950",
    spineColor: "bg-emerald-950 border-r border-emerald-800/60",
    accentColor: "text-amber-300 border-amber-400/40",
    ribbonColor: "bg-rose-700",
    icon: Building2,
    effectiveDate: "January 1, 2026",
    pages: "5 Pages",
    readTime: "8 min read",
    docRef: "SGC-HRMD-2026-HB-01",
    summary: "Complete governance manual detailing employee onboarding, regular performance appraisals, statutory benefits, office hours, and company culture.",
    chapters: [
      {
        pageNumber: 2,
        title: "Chapter I: The Simpal Group Work Ethic & Corporate Identity",
        subtitle: "Corporate Vision, Mission & Professional Governance",
        content: `SECTION 1: THE SIMPAL GROUP WORK ETHIC & IDENTITY
The Simpal Group of Companies (incorporating Simpal Construction, Lucky Betplay Corporation, 5A Royal Gaming OPC, Glowing Fortune, and Imperial Gaming OPC) is committed to integrity, regulatory compliance, and community stewardship. All employees, whether stationed at the Head Office in Mandaue City or in roving regional branch terminals across Mindanao, are expected to uphold the highest standard of accountability.

SECTION 2: ORGANIZATIONAL STRUCTURE & CODE OF PROFESSIONALISM
1. Every team member acts as an ambassador of the group's reputation.
2. Respect for colleagues, zero-tolerance for harassment, and collaborative excellence are mandatory.
3. Departmental lines of reporting and chain of command must be respected across all subsidiary interactions.`,
        statutoryRef: "SGC Governance Charter 2026",
        keyTakeaway: "Professionalism, fiduciary accountability, and mutual respect in all branch and field touchpoints."
      },
      {
        pageNumber: 3,
        title: "Chapter II: Official Working Hours & Biometric Attendance Shifts",
        subtitle: "Labor Code Compliance, Shift Rotation & Overtime Rules",
        content: `SECTION 1: STANDARD WORK HOURS & ROVING SHIFTS
1. Standard Office Work Hours: 08:00 AM to 05:00 PM, Monday through Friday, with a mandatory 1-hour midday meal break.
2. Field & Gaming Terminal Shifts: Rotational 8-hour operational tours verified via Supervisor Biometric Audit check-in.
3. Punctuality & Grace Periods: A grace period of 10 minutes is observed; repeated tardiness exceeding 3 occurrences in a single payroll cycle triggers administrative review.

SECTION 2: OVERTIME WORK AUTHORIZATION
Overtime work must be pre-approved in writing by direct department heads prior to execution. Overtime rates strictly adhere to the Philippine Labor Code:
- Regular day overtime: +25% premium
- Rest day / Special Non-Working Day: +30% premium
- Regular holiday work: 200% base rate + 30% overtime premium.`,
        statutoryRef: "Philippine Labor Code Articles 83-90",
        keyTakeaway: "Pre-approved overtime, biometric validation, and strict adherence to statutory premium computations."
      },
      {
        pageNumber: 4,
        title: "Chapter III: Statutory Mandatory Benefits & Leave Entitlements",
        subtitle: "SSS, PhilHealth, Pag-IBIG, 13th Month Pay & SIL Guidelines",
        content: `SECTION 1: MANDATORY SOCIAL LEGISLATION COVERAGE
All regular and probationary employees are enrolled in Philippine statutory programs beginning on Day 1 of employment:
- Social Security System (SSS) — Retirement, disability, and sickness security.
- Philippine Health Insurance Corporation (PhilHealth) — Comprehensive inpatient & outpatient coverage.
- Home Development Mutual Fund (Pag-IBIG Fund) — Housing loans and provident savings.

SECTION 2: 13TH MONTH PAY & ANNUAL LEAVES
1. 13th Month Pay: Paid annually on or before December 24, computed as 1/12th of basic salary earned within the calendar year (P.D. 851).
2. Service Incentive Leave (SIL): 5 days paid leave after 12 months of continuous service.
3. Special Statutory Leaves: Maternity Leave (105 days, RA 11210), Paternity Leave (7 days, RA 8187), and Solo Parent Leave (7 days, RA 8972).`,
        statutoryRef: "Presidential Decree No. 851 & Republic Act No. 11210",
        keyTakeaway: "100% Day-1 statutory enrollment with guaranteed statutory leave entitlements."
      },
      {
        pageNumber: 5,
        title: "Chapter IV: Code of Discipline, Twin-Notice & Zero-Tolerance Violations",
        subtitle: "Administrative Sanctions, Grievance Machinery & Company Shield",
        content: `SECTION 1: CODE OF DISCIPLINE & FINANCIAL INTEGRITY
Employees shall discharge their duties with utmost honesty. Any act of financial falsification, physical altercation on company premises, or unauthorized disclosure of internal gross data warrants immediate disciplinary investigation under statutory twin-notice due process.

SECTION 2: PROGRESSIVE DISCIPLINARY STAGES
1. First Offense: Documented Verbal Warning & Clarificatory Conference.
2. Second Offense: Formal Written Warning placed in 201 File.
3. Third Offense: Suspension without pay (1 to 15 days, dependent on offense severity).
4. Grave Misconduct: Notice to Explain (NTE), administrative inquiry, and potential termination under Art. 297.`,
        statutoryRef: "DOLE Department Order No. 147-15",
        keyTakeaway: "Fair and objective progressive discipline grounded in documented proof and employee dignity."
      }
    ]
  },
  {
    id: "health_standards",
    title: "Occupational Health, Wellness & Sanitation Standards",
    subtitle: "DOH, DOLE-OSHC & PCSO Gaming Branch Health Protocols",
    category: "Health & Safety",
    badge: "Health Standards",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
    coverGradient: "from-teal-950 via-emerald-950 to-slate-950",
    spineColor: "bg-teal-950 border-r border-teal-800/60",
    accentColor: "text-emerald-300 border-emerald-400/40",
    ribbonColor: "bg-emerald-500",
    icon: HeartPulse,
    effectiveDate: "January 10, 2026",
    pages: "5 Pages",
    readTime: "6 min read",
    docRef: "SGC-OHS-2026-HS-05",
    summary: "Comprehensive health and wellness regulations, daily branch sanitation protocols, annual medical examination (APE), mental health policy (RA 11036), and contagious disease mitigation.",
    chapters: [
      {
        pageNumber: 2,
        title: "Chapter I: General Health & Branch Sanitation Directives",
        subtitle: "Kiosk Hygiene, Air Filtration & Daily Disinfection Routines",
        content: `SECTION 1: SCOPE & OBJECTIVE
This Health Standard applies across all operational subsidiaries of the Simpal Group of Companies, including central management headquarters in Mandaue City and all active retail betting kiosks, dispatch warehouses, and SIMCON field offices.

SECTION 2: DAILY SANITATION & AIR QUALITY MANDATE
1. Disinfection Schedule: High-touch surfaces (teller transaction counter windows, biometric fingerprint sensors, thermal receipt printers, and entrance door handles) must be sanitized with 70% isopropyl alcohol solution at minimum every four (4) hours during active business shifts.
2. Hand Hygiene Stations: Automatic touchless sanitizer or alcohol dispensers must remain filled and readily accessible at both client-facing windows and teller workbenches.
3. Ventilation & Clean Air: Air-conditioned kiosks and monitoring booths must maintain continuous air exchange. Exhaust louvers and intake filters must be inspected and serviced every bi-weekly operational cycle.`,
        statutoryRef: "DOLE-DOH Joint Memorandum Circular No. 2020-04",
        keyTakeaway: "Mandatory 4-hour touch-surface disinfection and certified air circulation in all betting booths."
      },
      {
        pageNumber: 3,
        title: "Chapter II: Mandatory Annual Physical Examination (APE) & Medical Fitness",
        subtitle: "DOLE Rule 1960 Diagnostics, Medical Clearances & Sick Leave Convalescence",
        content: `SECTION 1: STATUTORY ANNUAL PHYSICAL EXAMINATION (APE)
Every regular, probationary, and contractual employee of the Simpal Group is entitled to and required to undergo the comprehensive Annual Physical Examination fully sponsored by the company.
The standard diagnostic package includes:
- Complete Blood Count (CBC) and Routine Urinalysis / Fecalysis
- Digital Chest X-Ray (Posterior-Anterior View)
- Resting 12-Lead Electrocardiogram (ECG) for employees aged 35 years and above
- Random Blood Sugar (RBS) and Lipid Profile for metabolic screening

SECTION 2: MEDICAL CERTIFICATES & CONVALESCENCE
1. Any absence due to illness exceeding two (2) consecutive calendar days requires an official medical clearance from an accredited physician before resuming work.
2. Tellers and field supervisors exhibiting symptoms of infectious respiratory illness (persistent fever, coughing, acute loss of smell) must promptly inform the HRMD Health Desk and undergo teleconsultation.`,
        statutoryRef: "DOLE OSHS Rule 1960 (Occupational Health Services)",
        keyTakeaway: "100% employer-funded APE diagnostics and strict medical clearances for extended sick leaves."
      },
      {
        pageNumber: 4,
        title: "Chapter III: Workplace Mental Health & Psychological Wellness",
        subtitle: "Republic Act No. 11058, RA 11036 (Mental Health Act) & DOLE D.O. 208-20",
        content: `SECTION 1: CORPORATE COMMITMENT TO PSYCHOLOGICAL WELLNESS
The Simpal Group recognizes that mental health is as vital as physical wellness. The company strictly maintains a non-discriminatory, psychologically secure workplace where mental health conditions are treated with dignity, privacy, and clinical confidentiality.

SECTION 2: EMPLOYEE ASSISTANCE PROGRAM (EAP)
1. Confidential Counseling: Any employee experiencing acute occupational burnout, trauma from field robbery/incident reports, or severe personal distress may access free, private sessions through the HRMD Counseling Liaison.
2. Non-Retaliation & Non-Discrimination: Disclosure of a mental health condition shall never serve as a basis for demotion, non-promotion, or termination of employment.
3. Reasonable Workplace Accommodations: Flexible shift adjustments and temporary task reassignment may be granted upon recommendation of the certified company wellness officer.`,
        statutoryRef: "Republic Act No. 11036 & DOLE Department Order No. 208-20",
        keyTakeaway: "Confidential employee counseling, zero mental health stigma, and protective workplace accommodations."
      },
      {
        pageNumber: 5,
        title: "Chapter IV: Emergency Response, First Aid & Substance-Free Environment",
        subtitle: "On-Site First Aid Marshals, CPR Readiness & DOLE D.O. 53-03 Drug-Free Workplace",
        content: `SECTION 1: FIRST AID KIT & DESIGNATED HEALTH MARSHALS
Every regional branch, gaming terminal, and construction site shall be equipped with an inspected Level-1 Emergency First Aid Kit containing sterile dressings, burn gel, antiseptic swabs, CPR face shields, and automated digital sphygmomanometer. Each shift shall designate at least one employee trained in basic life support.

SECTION 2: 100% DRUG-FREE & SMOKE-FREE WORKPLACE
1. Random Drug Testing: In compliance with RA 9165, all employees are subject to unannounced random drug screenings conducted by DOH-accredited testing laboratories.
2. Smoke-Free Premises: Smoking and vaping are strictly prohibited inside all retail kiosks, teller cages, and server rooms to preserve respiratory health and prevent fire hazards.
3. Heat Stress Mitigation: Field tellers and construction crew are granted mandatory hydration rest pauses during Extreme Caution heat index advisories (> 41°C).`,
        statutoryRef: "DOLE Department Order No. 53-03 & Republic Act No. 9165",
        keyTakeaway: "Inspected Level-1 first aid readiness, random drug screenings, and mandatory heat hydration pauses."
      }
    ]
  },
  {
    id: "due_process",
    title: "DOLE Due Process & Disciplinary Code",
    subtitle: "Notice to Explain (NTE) & IR Adjudication Standards",
    category: "Due Process & Legal",
    badge: "Legal Standard",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
    coverGradient: "from-rose-950 via-rose-900 to-stone-950",
    spineColor: "bg-rose-950 border-r border-rose-800/60",
    accentColor: "text-amber-200 border-amber-300/40",
    ribbonColor: "bg-amber-500",
    icon: Scale,
    effectiveDate: "March 15, 2026",
    pages: "4 Pages",
    readTime: "6 min read",
    docRef: "SGC-LEGAL-2026-DP-04",
    summary: "Strict twin-notice rule adjudication guidelines, 5 calendar day written explanation window, administrative hearing rights, and just causes under Art. 297.",
    chapters: [
      {
        pageNumber: 2,
        title: "Chapter I: The Mandatory Twin-Notice Doctrine",
        subtitle: "Constitutional Due Process, Notice to Explain & 5-Day Window",
        content: `ARTICLE I: THE MANDATORY TWIN-NOTICE DOCTRINE
No employee shall be subjected to disciplinary penalties without strict adherence to statutory due process under DOLE Department Order No. 147-15:
1. FIRST WRITTEN NOTICE (Notice to Explain / NTE): Must specify the exact offense, cite the Company Code of Conduct rule violated, and grant the employee a minimum period of five (5) calendar days from receipt to submit their written explanation.
2. OPPORTUNITY TO BE HEARD: Administrative hearing or clarificatory conference where the employee may present evidence and be accompanied by counsel or a representative.
3. SECOND WRITTEN NOTICE (Notice of Decision / Disposition): Conclusive written finding by Head Office citing evaluation of all facts, findings, and the specific corrective penalty imposed.`,
        statutoryRef: "DOLE Department Order No. 147-15 & Supreme Court King of Kings Doctrine",
        keyTakeaway: "Mandatory 5-calendar-day defense window and twin-notice formal legal compliance."
      },
      {
        pageNumber: 3,
        title: "Chapter II: Statutory Just Causes for Termination (Article 297)",
        subtitle: "Labor Code Grounds, Legal Evidentiary Thresholds & Due Inquiry",
        content: `ARTICLE II: JUST CAUSES FOR DISMISSAL (ART. 297 LABOR CODE)
1. Serious Misconduct: Willful in character and directly connected to the employee's work duties.
2. Gross and Habitual Neglect of Duty: Repeated failures to safeguard company funds, verify biometric shifts, or submit financial accounts.
3. Fraud or Willful Breach of Trust: Defalcation of cash float balances, fabrication of counterfeit tickets, or unauthorized modification of system records.
4. Commission of a Crime: Criminal acts against the employer, coworkers, or immediate family members.
5. Analogous Causes: Actions severely compromising the security and integrity of the Simpal Group operations.`,
        statutoryRef: "Labor Code of the Philippines Article 297 (Termination by Employer)",
        keyTakeaway: "Strict legal grounds requiring clear, substantial evidence before any severe sanction."
      },
      {
        pageNumber: 4,
        title: "Chapter III: Incident Report (IR) Filing & Investigative Procedures",
        subtitle: "Supervisory Escalation, CCTV Log Preservation & Evidence Seals",
        content: `ARTICLE III: INCIDENT REPORT (IR) ESCALATION
1. Immediate Filing: On-duty supervisors discovering any cash discrepancy, altercation, or booth damage must file an official Incident Report within 12 hours.
2. CCTV Preservation: Video footage covering the relevant 4-hour window must be securely tagged and exported to the secure corporate storage server.
3. Non-Prejudgment: Filing an Incident Report does not constitute guilt; it initiates formal fact-finding handled impartially by the HRMD Adjudication Board.`,
        statutoryRef: "SGC Incident Adjudication Manual 2026",
        keyTakeaway: "Standardized 12-hour IR filing timeline and objective evidentiary verification."
      }
    ]
  },
  {
    id: "cash_custody",
    title: "Cash Float Custody & Vault Remittance",
    subtitle: "Branch Tellers & Dual-Key Custody Protocol",
    category: "Finance & Operations",
    badge: "Cash Operations",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
    coverGradient: "from-slate-950 via-blue-950 to-indigo-950",
    spineColor: "bg-slate-950 border-r border-blue-900/60",
    accentColor: "text-blue-200 border-blue-400/40",
    ribbonColor: "bg-emerald-500",
    icon: ShieldCheck,
    effectiveDate: "February 1, 2026",
    pages: "4 Pages",
    readTime: "5 min read",
    docRef: "SGC-FIN-2026-CF-02",
    summary: "Multi-entity draw revenue turnover protocol, daily cashier reconciliation, vault dual-custody verification, and cashier shortage audit rules.",
    chapters: [
      {
        pageNumber: 2,
        title: "Chapter I: Beginning Cash Float & Counter-Signatures",
        subtitle: "Opening Shift Reconciliation, Counter-Signing & Cash Bags",
        content: `SECTION 1: DAILY CASH FLOAT VERIFICATION
1. At the opening of each betting shift, tellers must counter-sign the Official Beginning Cash Float Form with the on-duty branch supervisor.
2. Discrepancies at opening must be noted immediately before accepting any public customer wagers.
3. Mid-day draw receipts and ticket gross turnover must be segregated in locked security drop-boxes at all times to prevent robbery exposure.`,
        statutoryRef: "SGC Financial Control Standard 2026-CF-01",
        keyTakeaway: "Joint counter-signature of float prior to shift opening."
      },
      {
        pageNumber: 3,
        title: "Chapter II: Cutoff Turnover & Shortage Discrepancy Audits",
        subtitle: "Automated Ticket Balancing, Shortage Tolerances & Escrow Lockers",
        content: `SECTION 2: REMITTANCE & DISCREPANCY AUDITS
1. All daily ticket sales, gross turnover, and winning payouts must match the automated system totals at draw cutoff.
2. Any cash float discrepancy (overage or shortage) exceeding PHP 100.00 mandates an immediate Incident Report (IR) filed by the on-site supervisor.
3. Unauthorized withholding or delayed deposit of company remittances constitutes grave misconduct under the Company Code of Conduct.`,
        statutoryRef: "SGC Financial Accounting Code Section 4",
        keyTakeaway: "Zero tolerance for unverified shortages; automatic IR trigger for variance > PHP 100."
      },
      {
        pageNumber: 4,
        title: "Chapter III: Vault Dual-Key Protocol & Armed Handover",
        subtitle: "Vault Keys Segregation, Barcoded Tamper Seals & Transit Security",
        content: `SECTION 3: VAULT SECUREMENT & TRANSFER
1. Dual-Key Custody: Regional vault units require both the Supervisor Key and the Area Custodian Key to access master vaults.
2. Armored Transit: Cash collection bags must be sealed with unique tamper-evident barcodes prior to armed transit handover.
3. Handover Receipts: Both the armored transit guard and the branch custodian must sign duplicate verification logs with stamped timestamps.`,
        statutoryRef: "BSP Currency Handling Directives & SGC Vault SOP",
        keyTakeaway: "Dual-key authorization and numbered tamper-evident barcode bag seals."
      }
    ]
  },
  {
    id: "safety_health",
    title: "Occupational Safety & Health Standards",
    subtitle: "Republic Act No. 11058 & SIMCON Site Directives",
    category: "Health & Safety",
    badge: "DOLE RA 11058",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    coverGradient: "from-amber-950 via-stone-900 to-neutral-950",
    spineColor: "bg-stone-950 border-r border-amber-800/60",
    accentColor: "text-amber-300 border-amber-500/40",
    ribbonColor: "bg-orange-600",
    icon: AlertTriangle,
    effectiveDate: "January 15, 2026",
    pages: "4 Pages",
    readTime: "7 min read",
    docRef: "SIMCON-OSH-2026-03",
    summary: "Safety standards for construction sites, mandatory Personal Protective Equipment (PPE), typhoon & earthquake protocols, and field hazard mitigation.",
    chapters: [
      {
        pageNumber: 2,
        title: "Chapter I: Mandatory Personal Protective Equipment (PPE)",
        subtitle: "DOLE OSHC Approved Hard Hats, Eye Protection & High-Vis Standards",
        content: `RULE I: MANDATORY PERSONAL PROTECTIVE EQUIPMENT (PPE)
All personnel entering SIMCON construction sites or technical facilities must wear:
- Hard hat (DOLE/OSHC approved, non-expired impact shell)
- High-visibility reflective vest (Orange for site workers, Yellow for site safety engineers)
- Steel-toed safety boots with puncture-resistant soles
- Eye and ear protection during active heavy machinery and cutting operations.`,
        statutoryRef: "Republic Act No. 11058 Section 8 & DOLE D.O. 198-18",
        keyTakeaway: "Non-negotiable PPE compliance on every active SIMCON project site."
      },
      {
        pageNumber: 3,
        title: "Chapter II: Live Weather & Natural Hazards (Doppler Radar Protocol)",
        subtitle: "TCWS Signal 2 Halts, Crane Demobilization & Lightning Safety",
        content: `RULE II: TROPICAL CYCLONE & SEVERE WEATHER PROTOCOL
1. Tropical Cyclone Wind Signal (TCWS) Signal No. 2 or higher requires outdoor construction operations and crane activities to cease immediately.
2. Site supervisors must anchor all scaffolding, secure loose roofing sheets, and disconnect temporary electrical mains.
3. Lightning Alerts: All elevated scaffolding work is suspended whenever lightning strikes are observed within an 8-kilometer radius.`,
        statutoryRef: "PAGASA Guidelines & OSHC Weather Safety Code",
        keyTakeaway: "Automatic stoppage of high-risk outdoor activities at TCWS Signal No. 2."
      },
      {
        pageNumber: 4,
        title: "Chapter III: Accident Reporting & Emergency Preparedness",
        subtitle: "On-Duty Safety Officers, Evacuation Drills & DOLE Form WAIR-1",
        content: `RULE III: ACCIDENT REPORTING & EMERGENCY PROCEDURES
1. Every SIMCON construction site shall maintain a DOLE-certified Safety Officer (SO2/SO3) on active duty at all times during construction operations.
2. Any work-related incident or near-miss resulting in medical attention must be reported within 24 hours using DOLE Work Accident/Injury Report (WAIR-1).
3. Quarterly Earthquake and Fire Evacuation Drills must be conducted in coordination with the local Bureau of Fire Protection (BFP).`,
        statutoryRef: "DOLE Occupational Safety and Health Standards Rule 1050",
        keyTakeaway: "Mandatory certified Safety Officers and 24-hour formal WAIR incident reporting."
      }
    ]
  },
  {
    id: "anti_graft",
    title: "Anti-Graft, Ethics & Conflict of Interest",
    subtitle: "Corporate Governance & Data Privacy (RA 10173)",
    category: "Corporate Governance",
    badge: "Ethics & Compliance",
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
    coverGradient: "from-purple-950 via-slate-950 to-zinc-950",
    spineColor: "bg-purple-950 border-r border-purple-800/60",
    accentColor: "text-purple-200 border-purple-400/40",
    ribbonColor: "bg-amber-400",
    icon: Award,
    effectiveDate: "January 1, 2026",
    pages: "4 Pages",
    readTime: "4 min read",
    docRef: "SGC-GOV-2026-ET-01",
    summary: "Guidelines on non-disclosure, commercial gifts, outside business engagements, confidential data handling, and whistleblower protections.",
    chapters: [
      {
        pageNumber: 2,
        title: "Chapter I: Fiduciary Duties & Secondary Engagements",
        subtitle: "Corporate Loyalty, Non-Competition & Outside Employment",
        content: `SECTION 1: FIDUCIARY RESPONSIBILITY
Employees shall not engage in any commercial activity, business partnership, or secondary employment that competes with or creates a conflict of interest with the business interests of the Simpal Group of Companies. Full disclosure of any family-owned supply enterprise is mandatory.`,
        statutoryRef: "Philippine Revised Corporation Code & SGC Board Governance",
        keyTakeaway: "Undivided commercial loyalty and full transparency on external interests."
      },
      {
        pageNumber: 3,
        title: "Chapter II: Gifts, Gratuities & Anti-Bribery Standards",
        subtitle: "Commercial Integrity, Vendor Relations & Gift Limits",
        content: `SECTION 2: GIFTS AND VENDOR GRATUITIES
Employees are strictly prohibited from soliciting or accepting cash, gift certificates, luxury goods, or paid accommodations from suppliers, subcontractors, or business partners. Minor promotional items (calendars, branded pens) valued below PHP 500 may be accepted openly.`,
        statutoryRef: "Republic Act No. 3019 (Anti-Graft and Corrupt Practices Act)",
        keyTakeaway: "Strict prohibition of vendor gifts or financial kickbacks."
      },
      {
        pageNumber: 4,
        title: "Chapter III: Data Privacy (RA 10173) & Whistleblower Shield",
        subtitle: "National Privacy Commission Directives & Non-Retaliation Protections",
        content: `SECTION 3: DATA PRIVACY & TRADE SECRETS
All customer lists, agent phone directories, gross revenue records, and encrypted system API keys are corporate trade secrets protected under the Data Privacy Act of 2012 (RA 10173).

SECTION 4: WHISTLEBLOWER PROTECTION SHIELD
Any employee who reports irregularities, cash skimming, or safety violations in good faith shall be granted absolute protection against termination, demotion, harassment, or retaliation. Reports can be submitted directly to the Executive Ethics Committee.`,
        statutoryRef: "Republic Act No. 10173 (Data Privacy Act of 2012)",
        keyTakeaway: "Comprehensive trade secret defense and impenetrable whistleblower shield."
      }
    ]
  },
  {
    id: "remote_comms",
    title: "Branch Communications & Data Security",
    subtitle: "Inter-Office Memo Protocol & Digital Access",
    category: "Corporate Governance",
    badge: "IT & Comms",
    badgeColor: "bg-teal-50 text-teal-800 border-teal-200",
    coverGradient: "from-teal-950 via-cyan-950 to-slate-950",
    spineColor: "bg-teal-950 border-r border-cyan-800/60",
    accentColor: "text-teal-200 border-teal-400/40",
    ribbonColor: "bg-sky-500",
    icon: Sparkles,
    effectiveDate: "February 15, 2026",
    pages: "3 Pages",
    readTime: "4 min read",
    docRef: "SGC-OPS-2026-TC-06",
    summary: "Official communications etiquette, digital signature authority, authorized inter-office letterheads, and password confidentiality policies.",
    chapters: [
      {
        pageNumber: 2,
        title: "Chapter I: Official Memo Protocol & Executive Issuances",
        subtitle: "Standard Letterheads, Document Numbers & Authorization Tiers",
        content: `SECTION 1: OFFICIAL MEMO ISSUANCES
All company-wide directives, policy notices, and branch circulars must originate from the HRMD Document Studio or authorized executive leadership.
1. All memos must carry an official document tracking barcode and control serial.
2. Only authorized Group Directors and Division Chiefs may issue binding corporate mandates.`,
        statutoryRef: "SGC Information Management Manual 2026",
        keyTakeaway: "Authenticated corporate letterheads and verifiable document serials."
      },
      {
        pageNumber: 3,
        title: "Chapter II: Account Security, Credential Integrity & Record Syncing",
        subtitle: "Non-Transferable Accounts, Multi-Factor Access & End-of-Day Sync",
        content: `SECTION 2: ACCOUNT SECURITY & ACCESS CREDENTIALS
1. Individual account logins for HrHub, CCTV monitoring networks, and betting terminals are strictly non-transferable.
2. Sharing master credentials or operating under another user's logged-in identity constitutes a grave security infraction.

SECTION 3: BRANCH RECORD PRESERVATION
Daily attendance logs, incident reports, and expense vouchers must be synced with the central cloud database before shift close.`,
        statutoryRef: "Cybercrime Prevention Act of 2012 (RA 10175)",
        keyTakeaway: "Strict credential privacy and mandatory end-of-shift cloud database sync."
      }
    ]
  }
];

export default function PoliciesHandbooksPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activePolicyModal, setActivePolicyModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isFlipping, setIsFlipping] = useState(null);

  const categories = ["All", "General HR & Employment", "Due Process & Legal", "Finance & Operations", "Health & Safety", "Corporate Governance"];

  const filteredPolicies = useMemo(() => {
    return CORPORATE_POLICIES.filter((pol) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        pol.title.toLowerCase().includes(q) ||
        pol.subtitle.toLowerCase().includes(q) ||
        pol.summary.toLowerCase().includes(q) ||
        pol.docRef.toLowerCase().includes(q);
      const matchesCat = selectedCategory === "All" || pol.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, selectedCategory]);

  const bookPages = useMemo(() => {
    if (!activePolicyModal) return [];

    const tocPage = {
      isTOC: true,
      pageNumber: 1,
      title: "Table of Contents & Executive Registry",
      subtitle: `${activePolicyModal.title} • DOLE Official Volume`,
      content: "",
      statutoryRef: activePolicyModal.docRef,
      keyTakeaway: activePolicyModal.summary
    };

    const chapterPages = (activePolicyModal.chapters || []).map((ch, idx) => ({
      ...ch,
      isTOC: false,
      pageNumber: idx + 2
    }));

    return [tocPage, ...chapterPages];
  }, [activePolicyModal]);

  const totalPages = bookPages.length;

  const handleOpenBook = (policy) => {
    setActivePolicyModal(policy);
    setCurrentPage(0);
    setIsFlipping(null);
  };

  const handleFlipPage = (direction) => {
    if (isFlipping || !activePolicyModal) return;

    if (direction === "next" && currentPage < totalPages - 1) {
      setIsFlipping("next");
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setIsFlipping(null);
      }, 320);
    } else if (direction === "prev" && currentPage > 0) {
      setIsFlipping("prev");
      setTimeout(() => {
        setCurrentPage((prev) => prev - 1);
        setIsFlipping(null);
      }, 320);
    }
  };

  const jumpToPage = (targetIndex) => {
    if (isFlipping || targetIndex === currentPage || targetIndex < 0 || targetIndex >= totalPages) return;
    setIsFlipping(targetIndex > currentPage ? "next" : "prev");
    setTimeout(() => {
      setCurrentPage(targetIndex);
      setIsFlipping(null);
    }, 300);
  };

  const dragStartXRef = useRef(null);
  const dragStartYRef = useRef(null);
  const isDraggingRef = useRef(false);

  const handleCursorMouseDown = (e) => {
    if (e.target.closest("button, a, input, select, textarea, .toc-row, .no-cursor-flip")) return;
    dragStartXRef.current = e.clientX;
    dragStartYRef.current = e.clientY;
    isDraggingRef.current = true;
  };

  const handleCursorMouseUp = (e) => {
    if (!isDraggingRef.current || dragStartXRef.current === null) return;
    const diffX = dragStartXRef.current - e.clientX;
    const diffY = Math.abs((dragStartYRef.current || e.clientY) - e.clientY);
    isDraggingRef.current = false;
    dragStartXRef.current = null;
    dragStartYRef.current = null;

    if (Math.abs(diffX) > 45 && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        handleFlipPage("next");
      } else {
        handleFlipPage("prev");
      }
    }
  };

  const lastWheelTimeRef = useRef(0);
  const handleCursorWheel = (e) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 650) return;
    if (Math.abs(e.deltaY) > 50 || Math.abs(e.deltaX) > 50) {
      if (e.deltaY > 50 || e.deltaX > 50) {
        lastWheelTimeRef.current = now;
        handleFlipPage("next");
      } else if (e.deltaY < -50 || e.deltaX < -50) {
        lastWheelTimeRef.current = now;
        handleFlipPage("prev");
      }
    }
  };

  useEffect(() => {
    if (!activePolicyModal) return;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === "Space") {
        e.preventDefault();
        handleFlipPage("next");
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handleFlipPage("prev");
      } else if (e.key === "Escape") {
        setActivePolicyModal(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePolicyModal, currentPage, totalPages, isFlipping]);

  const activePageData = bookPages[currentPage] || bookPages[0];

  return (
    <div className="space-y-3 antialiased text-slate-800">
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold tracking-tight mb-1">
              <BookOpen size={11} className="text-emerald-600" />
              <span>OFFICIAL CORPORATE HANDBOOK LIBRARY</span>
            </div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              Corporate Governance & Compliance Handbooks
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl truncate leading-normal">
              Certified legal volumes, DOLE compliance handbooks, and operational manuals governing all Simpal Group entities.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-emerald-400 font-bold text-[10px] flex items-center gap-1.5 shadow-2xs">
              <Scale size={11} />
              <span>DOLE 2026 Certified Library</span>
            </span>
          </div>
        </div>

        <div className="pt-3 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by handbook title, due process, OSH RA 11058, Health Standards, or ref..."
              className="w-full pl-8 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div key={selectedCategory} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 pt-1 stagger-children">
        {filteredPolicies.map((policy) => {
          const Icon = policy.icon;

          return (
            <div
              key={policy.id}
              onClick={() => handleOpenBook(policy)}
              className="group cursor-pointer flex flex-col justify-between select-none"
            >
              <div className="relative py-2 px-1 flex justify-center items-center">
                <div className="absolute bottom-1.5 w-40 h-4 bg-slate-900/20 rounded-full blur-sm group-hover:w-44 group-hover:h-5 group-hover:bg-slate-900/30 group-hover:translate-y-1.5 transition-all duration-300" />

                <div
                  className="relative w-44 h-64 sm:w-48 sm:h-68 rounded-r-xl rounded-l-xs shadow-xl transition-all duration-300 ease-out transform group-hover:-translate-y-2 group-hover:-rotate-1 group-hover:shadow-[0_20px_30px_-6px_rgba(0,0,0,0.4)]"
                  style={{
                    perspective: "1200px",
                    transformStyle: "preserve-3d"
                  }}
                >
                  <div className="absolute -right-1.5 top-2 bottom-2 w-2 bg-gradient-to-r from-amber-50 via-slate-100 to-amber-100 rounded-r shadow-inner border-r border-t border-b border-amber-200/60 flex flex-col justify-around py-0.5">
                    <span className="w-full h-px bg-slate-300/60" />
                    <span className="w-full h-px bg-slate-300/60" />
                    <span className="w-full h-px bg-slate-300/60" />
                    <span className="w-full h-px bg-slate-300/60" />
                  </div>

                  <div className="absolute -bottom-1 left-3 right-1 h-1.5 bg-gradient-to-b from-slate-200 to-amber-50 rounded-b shadow-xs border-b border-amber-200/60" />

                  <div
                    className={`absolute -top-1 right-5 w-3.5 h-7 ${policy.ribbonColor} shadow-sm z-20 transition-all duration-300 group-hover:h-9`}
                    style={{
                      clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)"
                    }}
                  />

                  <div
                    className={`relative w-full h-full rounded-r-xl rounded-l-xs bg-gradient-to-br ${policy.coverGradient} p-3.5 flex flex-col justify-between overflow-hidden border border-white/10 z-10`}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/50 via-white/10 to-transparent pointer-events-none rounded-l-xs" />
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-black/40 pointer-events-none" />

                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                    <div className="absolute inset-2 rounded-lg border border-amber-400/30 ring-1 ring-amber-300/15 pointer-events-none" />

                    <div className="relative pt-0.5 pl-2 text-center space-y-0.5">
                      <div className="w-7 h-7 rounded-full bg-black/40 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto shadow-inner">
                        <Icon size={13} />
                      </div>
                      <p className="text-[7.5px] font-black uppercase tracking-widest text-amber-200/90">
                        SIMPAL GROUP
                      </p>
                      <p className="text-[6.5px] font-bold tracking-wider text-amber-300/60 uppercase">
                        Official Manual • 2026
                      </p>
                    </div>

                    <div className="relative pl-2 text-center space-y-1 my-auto">
                      <h2 className="text-xs sm:text-[13px] font-bold text-amber-100 tracking-tight leading-snug drop-shadow-xs font-serif">
                        {policy.title}
                      </h2>
                      <div className="w-6 h-0.5 bg-amber-400/50 mx-auto" />
                      <p className="text-[8.5px] font-medium text-amber-200/80 leading-tight">
                        {policy.subtitle}
                      </p>
                    </div>

                    <div className="relative pl-2 text-center pt-1.5 border-t border-amber-400/20">
                      <div className="flex items-center justify-between px-2 text-[7.5px] font-mono font-bold text-amber-300/80">
                        <span>{policy.docRef}</span>
                        <span className="bg-amber-400/20 px-1.5 py-0.2 rounded text-amber-200">{policy.pages}</span>
                      </div>
                      <p className="text-[6px] uppercase tracking-widest text-white/50 font-semibold mt-0.5">
                        Central Secretariat Archive
                      </p>
                    </div>

                    <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1.5 group-hover:translate-y-0 z-30">
                      <div className="bg-slate-900/90 backdrop-blur-xs text-emerald-400 border border-emerald-400/30 text-[9px] font-bold py-1 px-2.5 rounded-lg flex items-center justify-center gap-1 shadow-md">
                        <BookOpen size={10} />
                        <span>Flip Book ({policy.pages})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-2xs hover:border-slate-300 transition space-y-1.5 mt-0.5">
                <div className="flex items-center justify-between text-[9px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold border ${policy.badgeColor}`}>
                    {policy.badge}
                  </span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    📖 {policy.pages} (Reliable)
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-xs line-clamp-1 group-hover:text-emerald-700 transition">
                  {policy.title}
                </h3>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {policy.summary}
                </p>

                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>Effective: {policy.effectiveDate}</span>
                  <span className="text-emerald-700 font-bold group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                    <span>Flip to Read</span>
                    <ChevronRight size={10} />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activePolicyModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-start justify-center p-2 sm:p-4 pt-2 sm:pt-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setActivePolicyModal(null)}
        >
          <div
            className="bg-[#1b1511] rounded-3xl border-2 border-amber-900/40 max-w-6xl w-full h-[95vh] min-h-[680px] flex flex-col shadow-2xl overflow-hidden relative select-none animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 sm:p-4 border-b border-amber-900/30 flex items-center justify-between bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 text-white shrink-0 shadow-md">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0 shadow-inner">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-black text-xs sm:text-sm text-amber-100 truncate tracking-tight">
                      {activePolicyModal.title}
                    </h3>
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 tracking-wider">
                      Physical Volume
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-400 font-mono truncate">
                    Ref: {activePolicyModal.docRef} • {totalPages} Verified Pages • {activePolicyModal.category}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="px-2.5 py-1 rounded-xl bg-stone-800/90 border border-stone-700 text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1.5 shadow-2xs">
                  <span className="text-stone-400">Page</span>
                  <span className="text-white bg-stone-900 px-1.5 py-0.5 rounded text-[10px] font-black">{currentPage + 1}</span>
                  <span className="text-stone-500">/</span>
                  <span className="text-stone-400">{totalPages}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleFlipPage("prev")}
                  disabled={currentPage === 0 || isFlipping !== null}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border ${
                    currentPage === 0 || isFlipping !== null
                      ? "bg-stone-900/40 text-stone-600 border-stone-800 cursor-not-allowed"
                      : "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700 hover:text-white shadow-2xs"
                  }`}
                  title="Flip to Previous Page"
                >
                  <ChevronLeft size={15} />
                  <span className="hidden md:inline">Prev Page</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFlipPage("next")}
                  disabled={currentPage === totalPages - 1 || isFlipping !== null}
                  className={`p-1.5 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer border shadow-sm ${
                    currentPage === totalPages - 1 || isFlipping !== null
                      ? "bg-stone-900/40 text-stone-600 border-stone-800 cursor-not-allowed"
                      : "bg-amber-600 hover:bg-amber-500 text-white border-amber-500"
                  }`}
                  title="Flip to Next Page"
                >
                  <span className="hidden md:inline">Next Page</span>
                  <ChevronRight size={15} />
                </button>

                <div className="h-5 w-px bg-stone-800 mx-0.5" />

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-stone-700"
                  title="Print handbook manual"
                >
                  <Printer size={14} />
                  <span className="hidden lg:inline">Print</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePolicyModal(null)}
                  className="p-1.5 rounded-xl bg-stone-800 hover:bg-rose-600 text-stone-400 hover:text-white transition cursor-pointer border border-stone-700"
                  title="Close Handbook"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="px-4 py-2 bg-[#140e0b] border-b border-amber-900/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500/70 shrink-0 mr-1 flex items-center gap-1">
                <ListChecks size={12} className="text-amber-500" /> Chapters:
              </span>
              {bookPages.map((page, idx) => {
                const isActive = idx === currentPage;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => jumpToPage(idx)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                      isActive
                        ? "bg-amber-500 text-stone-950 border-amber-400 shadow-2xs font-black"
                        : "bg-stone-900/80 hover:bg-stone-800 text-stone-300 border-amber-900/20 hover:text-white"
                    }`}
                  >
                    {idx === 0 ? "Page 1: Table of Contents" : `Page ${idx + 1}: ${page.title.replace(/Chapter\s+[IVXLCDM]+:\s*/i, "").slice(0, 20)}...`}
                  </button>
                );
              })}
            </div>

            <div
              className="flex-1 relative overflow-hidden bg-[#241a14] p-2 sm:p-4 md:p-6 flex items-center justify-center select-none"
              onMouseDown={handleCursorMouseDown}
              onMouseUp={handleCursorMouseUp}
              onWheel={handleCursorWheel}
            >
              <div
                className="w-full h-full rounded-2xl bg-[#faf7ee] border-4 border-[#3e2c22] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.65),_inset_0_0_15px_rgba(0,0,0,0.06)] relative flex flex-col md:grid md:grid-cols-2 overflow-hidden"
                style={{
                  perspective: '2500px'
                }}
              >
                {currentPage > 0 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlipPage("prev");
                    }}
                    title="Click cursor here to turn to previous page (◂)"
                    className="hidden md:flex absolute top-0 bottom-0 left-0 w-16 z-30 items-center justify-start pl-2 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-amber-950/20 via-amber-950/5 to-transparent group/leftwing"
                  >
                    <div className="px-2.5 py-2 rounded-full bg-stone-900/90 text-amber-300 shadow-xl border border-amber-400/50 flex items-center gap-1 text-xs font-bold transform -translate-x-1 group-hover/leftwing:translate-x-0 transition">
                      <ChevronLeft size={16} />
                      <span className="text-[10px] hidden lg:inline">Prev</span>
                    </div>
                  </div>
                )}

                {currentPage < totalPages - 1 && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFlipPage("next");
                    }}
                    title="Click cursor here to turn to next page (▸)"
                    className="hidden md:flex absolute top-0 bottom-0 right-0 w-16 z-30 items-center justify-end pr-2 cursor-pointer opacity-0 hover:opacity-100 transition-opacity duration-200 bg-gradient-to-l from-amber-950/20 via-amber-950/5 to-transparent group/rightwing"
                  >
                    <div className="px-2.5 py-2 rounded-full bg-stone-900/90 text-amber-300 shadow-xl border border-amber-400/50 flex items-center gap-1 text-xs font-bold transform translate-x-1 group-hover/rightwing:translate-x-0 transition">
                      <span className="text-[10px] hidden lg:inline">Next</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                )}

                <div className="hidden md:flex absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-12 z-30 pointer-events-none bg-gradient-to-r from-stone-900/25 via-stone-950/45 to-stone-900/25 shadow-inner flex-col justify-between items-center py-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50 shadow-xs" />
                  <div className="w-px flex-1 border-l border-dashed border-stone-500/35" />
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50 shadow-xs" />
                </div>

                <div
                  onClick={(e) => {
                    if (e.target.closest("button, a, input, select, textarea, .no-cursor-flip")) return;
                    if (currentPage > 0) handleFlipPage("prev");
                  }}
                  title={currentPage > 0 ? "Click anywhere on this page with cursor to turn to previous page" : "Official Frontispiece"}
                  className={`h-full p-5 sm:p-7 md:p-9 flex flex-col justify-between overflow-y-auto custom-scrollbar relative border-b md:border-b-0 md:border-r border-amber-900/15 bg-gradient-to-r from-[#f5f0e3] via-[#faf7ee] to-[#f4eee0] shadow-[inset_12px_0_18px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 group/leftpage ${
                    currentPage > 0 ? "cursor-pointer hover:bg-amber-50/30" : "cursor-default"
                  }`}
                  style={{
                    transformOrigin: "right center",
                    transform: isFlipping === "prev" ? "rotateY(18deg) scale(0.98)" : "rotateY(0deg) scale(1)",
                    opacity: isFlipping === "prev" ? 0.75 : 1
                  }}
                >
                  {currentPage > 0 && (
                    <div className="opacity-0 group-hover/leftpage:opacity-100 transition-opacity duration-200 pointer-events-none absolute top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/90 text-amber-300 text-[10px] font-bold shadow-lg border border-amber-400/30">
                      <ChevronLeft size={13} />
                      <span>Click cursor to turn back (Prev Page)</span>
                    </div>
                  )}

                  {currentPage > 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFlipPage("prev");
                      }}
                      title="Click corner to flip to previous page"
                      className="absolute bottom-0 left-0 w-9 h-9 bg-gradient-to-tr from-amber-300/90 via-amber-200/60 to-transparent border-t border-r border-amber-400/80 shadow-md cursor-pointer hover:scale-115 transition rounded-tr-xl z-20 flex items-end justify-start p-1.5"
                    >
                      <span className="text-[9px] font-black text-amber-950 select-none">↶</span>
                    </div>
                  )}

                  {currentPage === 0 ? (
                    <div className="space-y-4 text-center my-auto">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-800 shadow-inner mx-auto">
                        <Scale size={28} />
                      </div>

                      <div className="space-y-1">
                        <p className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-800">
                          REPUBLIC OF THE PHILIPPINES • DOLE COMPLIANT
                        </p>
                        <h2 className="text-lg sm:text-xl font-serif font-black text-slate-900 tracking-tight">
                          SIMPAL GROUP OF COMPANIES
                        </h2>
                        <p className="text-[11px] text-stone-600 font-serif italic">
                          Consolidated Human Resources Management Division (HRMD)
                        </p>
                      </div>

                      <div className="py-2.5 px-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs space-y-1 shadow-2xs max-w-sm mx-auto text-left">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                          <CheckCircle2 size={13} className="text-emerald-700 shrink-0" />
                          <span>Official Administrative Codex</span>
                        </span>
                        <p className="text-[11px] text-stone-700 leading-relaxed">
                          This volume is promulgated under the executive authority of Simpal Group of Companies, covering all subsidiaries, field betting stations, and engineering sites.
                        </p>
                      </div>

                      <div className="text-[10px] font-mono text-stone-500 space-y-0.5">
                        <p>Document Control Ref: <strong>{activePolicyModal.docRef}</strong></p>
                        <p>Total Volume: <strong>{totalPages} Verified Pages</strong></p>
                        <p>Effective Date: <strong>{activePolicyModal.effectiveDate}</strong></p>
                      </div>

                      <div className="pt-2 text-stone-400 text-[10px] font-serif">
                        ✦ ✤ ✦
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-left">
                      <div className="pb-2 border-b border-stone-300 flex items-center justify-between text-[10px] font-mono text-stone-500">
                        <span>{activePolicyModal.docRef}</span>
                        <span className="font-bold text-amber-900 uppercase">Page {currentPage + 1}</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                          Chapter {currentPage} of {totalPages - 1}
                        </span>
                        <h2 className="text-base sm:text-lg font-serif font-black text-slate-900 leading-tight">
                          {activePageData.title}
                        </h2>
                        {activePageData.subtitle && (
                          <p className="text-xs text-stone-600 font-serif italic">
                            {activePageData.subtitle}
                          </p>
                        )}
                      </div>

                      {activePageData.keyTakeaway && (
                        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-xs flex items-start gap-2 shadow-2xs">
                          <Bookmark size={14} className="text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-amber-900">Key Mandate: </strong>
                            <span className="text-stone-700">{activePageData.keyTakeaway}</span>
                          </div>
                        </div>
                      )}

                      <div className="text-xs leading-relaxed text-slate-800 font-sans whitespace-pre-wrap">
                        {(() => {
                          const raw = activePageData.content || "";
                          const parts = raw.split(/\n(?=SECTION\s+[2-9]:)/i);
                          return parts[0] || raw;
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-500 shrink-0">
                    <span className="text-stone-400 text-[9.5px]">Simpal Group HRMD • Archival Leaf</span>
                    <span className="font-bold text-stone-700">- Page {currentPage + 1} -</span>
                  </div>
                </div>

                <div
                  onClick={(e) => {
                    if (e.target.closest("button, a, input, select, textarea, .toc-row, .no-cursor-flip")) return;
                    if (currentPage < totalPages - 1) handleFlipPage("next");
                  }}
                  title={currentPage < totalPages - 1 ? "Click anywhere on this page with cursor to turn to next page" : "End of Volume"}
                  className={`h-full p-5 sm:p-7 md:p-9 flex flex-col justify-between overflow-y-auto custom-scrollbar relative bg-gradient-to-r from-[#f4eee0] via-[#faf7ee] to-[#f5f0e3] shadow-[inset_-12px_0_18px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 group/rightpage ${
                    currentPage < totalPages - 1 ? "cursor-pointer hover:bg-amber-50/30" : "cursor-default"
                  }`}
                  style={{
                    transformOrigin: "left center",
                    transform: isFlipping === "next" ? "rotateY(-18deg) scale(0.98)" : "rotateY(0deg) scale(1)",
                    opacity: isFlipping === "next" ? 0.75 : 1
                  }}
                >
                  {currentPage < totalPages - 1 && (
                    <div className="opacity-0 group-hover/rightpage:opacity-100 transition-opacity duration-200 pointer-events-none absolute top-3 right-4 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900/90 text-amber-300 text-[10px] font-bold shadow-lg border border-amber-400/30">
                      <span>Click cursor to turn next (Next Page)</span>
                      <ChevronRight size={13} />
                    </div>
                  )}

                  {currentPage < totalPages - 1 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFlipPage("next");
                      }}
                      title="Click corner to flip to next page"
                      className="absolute bottom-0 right-0 w-9 h-9 bg-gradient-to-tl from-amber-300/90 via-amber-200/60 to-transparent border-t border-l border-amber-400/80 shadow-md cursor-pointer hover:scale-115 transition rounded-tl-xl z-20 flex items-end justify-end p-1.5"
                    >
                      <span className="text-[9px] font-black text-amber-950 select-none">↷</span>
                    </div>
                  )}

                  {currentPage === 0 ? (
                    <div className="space-y-4">
                      <div className="text-center pb-3 border-b-2 border-stone-300 space-y-1">
                        <p className="text-[9px] font-mono font-black uppercase tracking-widest text-amber-800">
                          MASTER REGISTRY &amp; CHAPTER DIRECTORY
                        </p>
                        <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-900 tracking-tight">
                          TABLE OF CONTENTS
                        </h2>
                        <div className="text-stone-400 text-xs">✦ ✤ ✦</div>
                      </div>

                      <div className="space-y-2 pt-1">
                        {bookPages.slice(1).map((ch, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              jumpToPage(idx + 1);
                            }}
                            className="toc-row group/row cursor-pointer p-2 rounded-xl hover:bg-amber-100/60 transition border border-transparent hover:border-amber-300/60"
                          >
                            <div className="flex items-baseline justify-between gap-1 text-slate-900">
                              <span className="font-serif font-black text-xs sm:text-sm text-slate-900 group-hover/row:text-amber-900 shrink-0">
                                Chapter {idx + 1}: {ch.title.replace(/Chapter\s+[IVXLCDM]+:\s*/i, "")}
                              </span>
                              <span className="flex-1 mx-2 border-b border-dotted border-stone-400/80 group-hover/row:border-amber-700"></span>
                              <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded shadow-2xs shrink-0 group-hover/row:bg-amber-600 group-hover/row:text-white transition">
                                Page {idx + 2}
                              </span>
                            </div>
                            {ch.subtitle && (
                              <p className="text-[11px] text-stone-500 font-serif italic pl-2 pt-0.5 group-hover/row:text-amber-800 line-clamp-1">
                                {ch.subtitle}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFlipPage("next");
                          }}
                          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-serif font-bold text-xs transition cursor-pointer shadow-md inline-flex items-center gap-2"
                        >
                          <span>Click to Open Chapter I (Page 2)</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-left">
                      <div className="pb-2 border-b border-stone-300 flex items-center justify-between text-[10px] font-mono text-stone-500">
                        <span className="font-serif italic">Operational Directives &amp; Execution</span>
                        <span className="font-bold text-amber-900">Right Leaf</span>
                      </div>

                      <div className="text-xs leading-relaxed text-slate-800 font-sans whitespace-pre-wrap">
                        {(() => {
                          const raw = activePageData.content || "";
                          const parts = raw.split(/\n(?=SECTION\s+[2-9]:)/i);
                          if (parts.length > 1) {
                            return parts.slice(1).join("\n\n");
                          }
                          return "All employees and operational personnel must abide strictly by the standards prescribed in this chapter. Infractions will be handled under the administrative due process manual.";
                        })()}
                      </div>

                      {activePageData.statutoryRef && (
                        <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-[10px] text-stone-600 font-mono flex items-center justify-between no-cursor-flip">
                          <span>Mandate: <strong>{activePageData.statutoryRef}</strong></span>
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Check size={11} /> Verified Lawful
                          </span>
                        </div>
                      )}

                      <div className="p-3 rounded-xl border border-stone-200/80 bg-white/70 space-y-1 text-xs no-cursor-flip">
                        <p className="font-serif font-bold text-slate-900 text-[11px]">
                          Simpal Group Human Resources Management Division
                        </p>
                        <p className="text-[10px] text-stone-500">
                          Office of the Executive Director • Mandaue City Head Office Archive
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-500 shrink-0">
                    <span className="text-amber-800 font-serif italic text-[9.5px]">Click page to turn</span>
                    <span className="font-bold text-stone-700">Page {currentPage + 1} of {totalPages}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-[#110c09] border-t border-amber-900/30 flex items-center justify-between px-5 sm:px-6 shrink-0 text-white">
              <span className="text-[10px] text-stone-400 font-serif italic flex items-center gap-1.5">
                <span>📖</span>
                <span>👉 <strong>Cursor Page Turn:</strong> Click cursor <strong>anywhere on the page</strong> (left = Prev, right = Next), drag/swipe with mouse, or scroll wheel to turn pages.</span>
              </span>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs transition cursor-pointer shadow-sm"
              >
                Close Handbook
              </button>
            </div>
          </div>
        </div>
      )}    </div>
  );
}
