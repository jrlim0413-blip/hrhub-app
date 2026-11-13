import { useState, useMemo } from "react";
import {
  ShieldCheck, FileText, Search, BookOpen, Download,
  CheckCircle2, AlertTriangle, ArrowRight, X, ExternalLink,
  Printer, Scale, Sparkles, Building2, Lock, Award,
  Bookmark, ChevronRight, Layers, Eye
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
    pages: "48 Pages",
    readTime: "8 min read",
    docRef: "SGC-HRMD-2026-HB-01",
    summary: "Complete governance manual detailing employee onboarding, regular performance appraisals, statutory benefits, office hours, and company culture.",
    content: `SIMPAL GROUP OF COMPANIES
CENTRAL CORPORATE EMPLOYEE HANDBOOK (2026 CONSOLIDATED EDITION)
Document Ref: SGC-HRMD-2026-HB-01 • DOLE Registered Compliance

SECTION 1: THE SIMPAL GROUP WORK ETHIC & IDENTITY
The Simpal Group of Companies (incorporating Simpal Construction, Lucky Betplay Corporation, 5A Royal Gaming OPC, Glowing Fortune, and Imperial Gaming OPC) is committed to integrity, regulatory compliance, and community stewardship. All employees, whether stationed at the Head Office in Mandaue City or in roving regional branch terminals across Mindanao, are expected to uphold the highest standard of accountability.

SECTION 2: OFFICIAL WORKING HOURS & OVERTIME
1. Standard Office Work Hours: 08:00 AM to 05:00 PM, Monday through Friday, with a mandatory 1-hour midday meal break.
2. Field & Gaming Terminal Shifts: Rotational 8-hour operational tours verified via Supervisor Biometric Audit check-in.
3. Overtime Work: Pre-approved by direct supervisors in accordance with Labor Code provisions, paid with applicable statutory premiums.

SECTION 3: STATUTORY MANDATORY BENEFITS
All regular and probationary employees are covered by mandatory Philippine social security programs from Day 1:
- Social Security System (SSS)
- Philippine Health Insurance Corporation (PhilHealth)
- Home Development Mutual Fund (Pag-IBIG Fund)
- 13th Month Pay (pro-rated in compliance with Presidential Decree No. 851)
- 5-Day Incentive Leave for employees with at least one year of continuous service.

SECTION 4: CODE OF DISCIPLINE & INTEGRITY
Employees shall discharge their duties with utmost honesty. Any act of financial falsification, physical altercation on company premises, or unauthorized disclosure of internal gross data warrants immediate disciplinary investigation under statutory twin-notice due process.`
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
    pages: "36 Pages",
    readTime: "6 min read",
    docRef: "SGC-LEGAL-2026-DP-04",
    summary: "Strict twin-notice rule adjudication guidelines, 5 calendar day written explanation window, administrative hearing rights, and just causes under Art. 297.",
    content: `ADMINISTRATIVE DISCIPLINARY MANUAL & DUE PROCESS PROCEDURES
Simpal Group Human Resources Management Division (HRMD)
In compliance with DOLE Department Order No. 147-15 & Labor Code of the Philippines

ARTICLE I: THE MANDATORY TWIN-NOTICE DOCTRINE
No employee shall be subjected to disciplinary penalties without strict adherence to statutory due process:
1. FIRST WRITTEN NOTICE (Notice to Explain / NTE): Must specify the exact offense, cite the Company Code of Conduct rule violated, and give the employee at least five (5) calendar days from receipt to submit their written defense.
2. OPPORTUNITY TO BE HEARD: Administrative hearing or clarificatory conference where the employee may present evidence and be accompanied by counsel or a representative.
3. SECOND WRITTEN NOTICE (Notice of Decision / Disposition): Conclusive written finding by Head Office citing evaluation of all facts, findings, and the specific corrective penalty imposed.

ARTICLE II: JUST CAUSES FOR TERMINATION (ART. 297 LABOR CODE)
1. Serious misconduct or willful disobedience to lawful orders.
2. Gross and habitual neglect of duties.
3. Fraud, cash float defalcation, or willful breach of trust.
4. Commission of a crime against the employer or co-employees.

ARTICLE III: TICKET DISCREPANCIES & AUDIT PROTOCOL
Incident Reports (IR) filed by on-duty supervisors must attach physical audit logs and CCTV references prior to elevation to HRMD.`
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
    pages: "28 Pages",
    readTime: "5 min read",
    docRef: "SGC-FIN-2026-CF-02",
    summary: "Multi-entity draw revenue turnover protocol, daily cashier reconciliation, vault dual-custody verification, and cashier shortage audit rules.",
    content: `OPERATIONAL CASH FLOAT & REMITTANCE COMPLIANCE MANUAL
Gaming Operations Division & Financial Controllership Office

SECTION 1: DAILY CASH FLOAT VERIFICATION
1. At the opening of each betting shift, tellers must counter-sign the Official Beginning Cash Float Form with the on-duty branch supervisor.
2. Mid-day draw receipts and ticket gross turnover must be segregated in locked security drop-boxes at all times.

SECTION 2: REMITTANCE & DISCREPANCY AUDITS
1. All daily ticket sales, gross turnover, and winning payouts must match the automated system totals at draw cutoff.
2. Any cash float discrepancy (overage or shortage) exceeding PHP 100.00 mandates an immediate Incident Report (IR) filed by the on-site supervisor.
3. Unauthorized withholding of company remittances constitutes grave misconduct under the Company Code of Conduct.

SECTION 3: VAULT SECUREMENT & TRANSFER
Cash collection bags must be sealed with unique tamper-evident barcodes prior to armed transit handover.`
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
    pages: "52 Pages",
    readTime: "7 min read",
    docRef: "SIMCON-OSH-2026-03",
    summary: "Safety standards for construction sites, mandatory Personal Protective Equipment (PPE), typhoon & earthquake protocols, and field hazard mitigation.",
    content: `OCCUPATIONAL SAFETY AND HEALTH (OSH) POLICY
Simpal Construction (SIMCON) & Simpal Group Facilities
Pursuant to Republic Act No. 11058 and DOLE Department Order No. 198-18

POLICY STATEMENT:
The Simpal Group is dedicated to providing a safe, accident-free work environment for all employees, construction personnel, and branch visitors.

RULE I: MANDATORY PERSONAL PROTECTIVE EQUIPMENT (PPE)
All personnel entering SIMCON construction sites or technical facilities must wear:
- Hard hat (DOLE/OSHC approved)
- High-visibility reflective vest
- Steel-toed safety boots
- Eye and ear protection during active machinery operations.

RULE II: LIVE WEATHER & NATURAL HAZARDS (DOPPLER RADAR PROTOCOL)
In the event of a Tropical Cyclone Wind Signal (TCWS) Signal No. 2 or higher, all outdoor construction site operations shall be halted immediately. Site supervisors must secure all scaffolding and electrical fixtures.

RULE III: ACCIDENT REPORTING & FIRST AID
Every site shall maintain a certified first-aid kit and designated Safety Officer on active duty at all times.`
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
    pages: "24 Pages",
    readTime: "4 min read",
    docRef: "SGC-GOV-2026-ET-01",
    summary: "Guidelines on non-disclosure, commercial gifts, outside business engagements, confidential data handling, and whistleblower protections.",
    content: `ANTI-GRAFT, CONFLICT OF INTEREST & ETHICAL CONDUCT POLICY
Board of Directors & Executive Management Office

1. FIDUCIARY RESPONSIBILITY: Employees shall not engage in any commercial activity, employment, or consultancy that conflicts with the business interests of Simpal Group of Companies.
2. GIFTS AND FAVORS: Employees are strictly prohibited from soliciting or accepting cash, expensive gifts, or unauthorized discounts from suppliers, vendors, or contractors.
3. CONFIDENTIALITY & DATA PRIVACY: All internal personnel files, financial ledgers, gross reports, and software access keys are confidential trade secrets protected under the Philippine Data Privacy Act of 2012 (RA 10173).
4. WHISTLEBLOWER SHIELD: Any employee who reports irregularities in good faith shall be protected against retaliation, harassment, or adverse employment actions.`
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
    pages: "22 Pages",
    readTime: "4 min read",
    docRef: "SGC-OPS-2026-TC-06",
    summary: "Official communications etiquette, digital signature authority, authorized inter-office letterheads, and password confidentiality policies.",
    content: `INTER-OFFICE COMMUNICATIONS & DIGITAL ACCESS PROTOCOL
Simpal Group Human Resources & Corporate Information Systems

SECTION 1: OFFICIAL MEMO ISSUANCES
All company-wide directives, policy notices, and branch circulars must originate from the HRMD Document Studio or authorized executive leadership.

SECTION 2: ACCOUNT SECURITY & ACCESS CREDENTIALS
1. Individual account logins for HrHub, CCTV monitoring networks, and betting terminals are strictly non-transferable.
2. Sharing master credentials or operating under another user's logged-in identity constitutes a grave security infraction.

SECTION 3: BRANCH RECORD PRESERVATION
Daily attendance logs, incident reports, and expense vouchers must be synced with the central cloud database before shift close.`
  }
];

export default function PoliciesHandbooksPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activePolicyModal, setActivePolicyModal] = useState(null);

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

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black tracking-tight mb-2">
              <BookOpen size={13} className="text-emerald-600" />
              <span>OFFICIAL CORPORATE HANDBOOK LIBRARY</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Corporate Governance & Compliance Handbooks
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Certified legal volumes, DOLE compliance handbooks, and operational manuals governing all Simpal Group entities, branch terminals, and site personnel.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-emerald-400 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
              <Scale size={13} />
              <span>DOLE 2026 Certified Library</span>
            </span>
          </div>
        </div>

        {/* SEARCH & CATEGORY CHIPS */}
        <div className="pt-5 space-y-3">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by handbook title, due process, OSH RA 11058, or document ref..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. REALISTIC 3D BOOKSHELF GALLERY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {filteredPolicies.map((policy) => {
          const Icon = policy.icon;

          return (
            <div
              key={policy.id}
              onClick={() => setActivePolicyModal(policy)}
              className="group cursor-pointer flex flex-col justify-between select-none"
            >
              {/* 3D BOOK CONTAINER WITH PERSPECTIVE */}
              <div className="relative py-4 px-2 flex justify-center items-center">
                {/* Book Shadow on Shelf */}
                <div className="absolute bottom-2 w-48 h-5 bg-slate-900/25 rounded-full blur-md group-hover:w-52 group-hover:h-6 group-hover:bg-slate-900/35 group-hover:translate-y-2 transition-all duration-300" />

                {/* The 3D Book */}
                <div
                  className="relative w-56 h-80 rounded-r-2xl rounded-l-md shadow-2xl transition-all duration-400 ease-out transform group-hover:-translate-y-3 group-hover:-rotate-2 group-hover:shadow-[0_25px_35px_-8px_rgba(0,0,0,0.5)]"
                  style={{
                    perspective: "1200px",
                    transformStyle: "preserve-3d"
                  }}
                >
                  {/* Layered White/Ivory Pages on the Right Edge */}
                  <div className="absolute -right-2 top-2.5 bottom-2.5 w-3 bg-gradient-to-r from-amber-50 via-slate-100 to-amber-100 rounded-r shadow-inner border-r border-t border-b border-amber-200/60 flex flex-col justify-around py-1">
                    <span className="w-full h-px bg-slate-300/60" />
                    <span className="w-full h-px bg-slate-300/60" />
                    <span className="w-full h-px bg-slate-300/60" />
                    <span className="w-full h-px bg-slate-300/60" />
                    <span className="w-full h-px bg-slate-300/60" />
                  </div>

                  {/* Layered Pages on Bottom Edge */}
                  <div className="absolute -bottom-1.5 left-4 right-1 h-2 bg-gradient-to-b from-slate-200 to-amber-50 rounded-b shadow-xs border-b border-amber-200/60" />

                  {/* Silky Ribbon Bookmark hanging at the top */}
                  <div
                    className={`absolute -top-1 right-7 w-4 h-9 ${policy.ribbonColor} shadow-md z-20 transition-all duration-300 group-hover:h-11`}
                    style={{
                      clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)"
                    }}
                  />

                  {/* Hardcover Main Face */}
                  <div
                    className={`relative w-full h-full rounded-r-2xl rounded-l-md bg-gradient-to-br ${policy.coverGradient} p-4.5 flex flex-col justify-between overflow-hidden border border-white/10 z-10`}
                  >
                    {/* Spine Binding Crease Shading on Left Edge */}
                    <div className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-black/50 via-white/10 to-transparent pointer-events-none rounded-l-md" />
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-black/40 pointer-events-none" />

                    {/* Animated Light Sheen on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                    {/* Decorative Gilded Border Inlay */}
                    <div className="absolute inset-2.5 rounded-xl border border-amber-400/30 ring-1 ring-amber-300/15 pointer-events-none" />

                    {/* Book Header: Seal & Corporate Name */}
                    <div className="relative pt-1 pl-3 text-center space-y-1">
                      <div className="w-9 h-9 rounded-full bg-black/40 border border-amber-400/40 text-amber-300 flex items-center justify-center mx-auto shadow-inner">
                        <Icon size={16} />
                      </div>
                      <p className="text-[8px] font-black uppercase tracking-widest text-amber-200/90">
                        SIMPAL GROUP
                      </p>
                      <p className="text-[7px] font-bold tracking-wider text-amber-300/60 uppercase">
                        Official Manual • 2026
                      </p>
                    </div>

                    {/* Book Center: Title & Subtitle */}
                    <div className="relative pl-3 text-center space-y-1.5 my-auto">
                      <h2 className="text-sm font-black text-amber-100 tracking-tight leading-snug drop-shadow-sm font-serif">
                        {policy.title}
                      </h2>
                      <div className="w-8 h-0.5 bg-amber-400/50 mx-auto" />
                      <p className="text-[9px] font-medium text-amber-200/80 leading-tight">
                        {policy.subtitle}
                      </p>
                    </div>

                    {/* Book Footer: Reference & Seal */}
                    <div className="relative pl-3 text-center pt-2 border-t border-amber-400/20">
                      <p className="text-[8px] font-mono font-bold text-amber-300/70 tracking-wider">
                        {policy.docRef}
                      </p>
                      <p className="text-[6.5px] uppercase tracking-widest text-white/50 font-semibold mt-0.5">
                        Central Secretariat Archive
                      </p>
                    </div>

                    {/* Hover "Read" Floating Pill */}
                    <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-30">
                      <div className="bg-slate-900/90 backdrop-blur-xs text-emerald-400 border border-emerald-400/30 text-[10px] font-black py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg">
                        <BookOpen size={11} />
                        <span>Open & Read Handbook</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Handbook Info Card Beneath the Book */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:border-slate-300 transition space-y-2 mt-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold border ${policy.badgeColor}`}>
                    {policy.badge}
                  </span>
                  <span className="font-mono font-semibold text-slate-400">
                    {policy.pages}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-xs line-clamp-1 group-hover:text-emerald-700 transition">
                  {policy.title}
                </h3>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {policy.summary}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>Effective: {policy.effectiveDate}</span>
                  <span className="text-emerald-700 font-bold group-hover:translate-x-1 transition flex items-center gap-0.5">
                    <span>Inspect</span>
                    <ChevronRight size={11} />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. INTERACTIVE BOOK SPREAD READER MODAL */}
      {activePolicyModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setActivePolicyModal(null)}
        >
          <div
            className="bg-[#fcfbf7] rounded-3xl border border-amber-900/20 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Binder Bar */}
            <div className="p-4 sm:p-5 border-b border-amber-900/10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-white truncate">
                    {activePolicyModal.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Ref: {activePolicyModal.docRef} • {activePolicyModal.pages} • DOLE Registered
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                  title="Print handbook manual"
                >
                  <Printer size={13} />
                  <span className="hidden sm:inline">Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicyModal(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Book Reader Spread */}
            <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
              {/* Left Column: Book Details & Document Stamp */}
              <div className="hidden md:block md:col-span-4 p-5 bg-[#f4efe6] border-r border-amber-900/10 space-y-4 overflow-y-auto custom-scrollbar">
                {/* Miniature 3D Book Cover in Modal */}
                <div className={`rounded-xl bg-gradient-to-br ${activePolicyModal.coverGradient} p-4 text-center text-amber-200 border border-amber-300/30 shadow-md space-y-2`}>
                  <p className="text-[8px] font-black uppercase tracking-widest text-amber-300/80">
                    CERTIFIED OFFICIAL COPY
                  </p>
                  <h4 className="text-xs font-black text-amber-100 font-serif leading-snug">
                    {activePolicyModal.title}
                  </h4>
                  <p className="text-[8px] text-amber-300/70 font-mono">
                    {activePolicyModal.docRef}
                  </p>
                </div>

                {/* Metadata List */}
                <div className="bg-white/80 rounded-2xl p-3.5 border border-amber-900/10 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Document Details
                  </span>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Effective Date:</span>
                      <span className="font-bold text-slate-800">{activePolicyModal.effectiveDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Category:</span>
                      <span className="font-bold text-slate-800">{activePolicyModal.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">DOLE Status:</span>
                      <span className="font-bold text-emerald-700">DOLE Compliant</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Read Time:</span>
                      <span className="font-bold text-slate-800">{activePolicyModal.readTime}</span>
                    </div>
                  </div>
                </div>

                {/* DOLE Legal Certification Stamp */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-[11px] text-emerald-800">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Statutory Enforceability</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 leading-relaxed">
                    This document is legally binding across all Simpal Group entities pursuant to DOLE regulations and Department Order No. 147-15.
                  </p>
                </div>
              </div>

              {/* Right Column: High-Res Book Pages */}
              <div className="md:col-span-8 p-6 sm:p-8 overflow-y-auto bg-[#fffefb] space-y-5 custom-scrollbar relative">
                {/* Formal Book Letterhead */}
                <div className="pb-4 border-b-2 border-slate-900/10 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 font-serif tracking-tight">
                      {activePolicyModal.title}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {activePolicyModal.subtitle}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[10px] font-bold shrink-0">
                    {activePolicyModal.docRef}
                  </span>
                </div>

                {/* Book Text Content with Formal Layout */}
                <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
                  <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-800 text-xs sm:text-sm">
                    {activePolicyModal.content}
                  </pre>
                </div>

                {/* Formal Signature & Secretariat Execution Stamp */}
                <div className="pt-6 border-t border-slate-200 mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-slate-900">Simpal Group Human Resources Management Division (HRMD)</p>
                    <p className="text-[10px] text-slate-400">Executive Secretariat Archive • Head Office Mandaue City</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    Verified Official Copy
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Close Action */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-6">
              <span className="text-[10px] text-slate-500 font-medium">
                Tip: Use Print to produce a clean DOLE-compliant hard copy.
              </span>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close Handbook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
