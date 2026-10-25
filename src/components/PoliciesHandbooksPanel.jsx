import { useState, useMemo } from "react";
import {
  ShieldCheck, FileText, Search, BookOpen, Download,
  CheckCircle2, AlertTriangle, ArrowRight, X, ExternalLink,
  Printer, Scale, Sparkles, Building2, Lock
} from "lucide-react";

const CORPORATE_POLICIES = [
  {
    id: "handbook",
    title: "Simpal Group Comprehensive Employee Handbook (2026 Manual)",
    category: "General HR & Employment",
    badge: "Official Handbook",
    badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    effectiveDate: "January 1, 2026",
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
- 5-Day Incentive Leave for employees with at least one year of continuous service.`
  },
  {
    id: "due_process",
    title: "DOLE Due Process & Disciplinary Investigation Code (IR & NTE Standards)",
    category: "Due Process & Legal",
    badge: "Legal Standard",
    badgeColor: "bg-rose-50 text-rose-800 border-rose-200",
    effectiveDate: "March 15, 2026",
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
4. Commission of a crime against the employer or co-employees.`
  },
  {
    id: "cash_custody",
    title: "Gaming Station Cash Float Custody & Remittance Guidelines",
    category: "Finance & Operations",
    badge: "Cash Operations",
    badgeColor: "bg-blue-50 text-blue-800 border-blue-200",
    effectiveDate: "February 1, 2026",
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
3. Unauthorized withholding of company remittances constitutes grave misconduct under the Company Code of Conduct.`
  },
  {
    id: "safety_health",
    title: "Occupational Safety and Health Standards Manual (Republic Act No. 11058)",
    category: "Health & Safety",
    badge: "DOLE RA 11058",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    effectiveDate: "January 15, 2026",
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
In the event of a Tropical Cyclone Wind Signal (TCWS) Signal No. 2 or higher, all outdoor construction site operations shall be halted immediately. Site supervisors must secure all scaffolding and electrical fixtures.`
  },
  {
    id: "anti_graft",
    title: "Corporate Anti-Graft, Ethics & Conflict of Interest Policy",
    category: "Corporate Governance",
    badge: "Ethics & Compliance",
    badgeColor: "bg-purple-50 text-purple-800 border-purple-200",
    effectiveDate: "January 1, 2026",
    docRef: "SGC-GOV-2026-ET-01",
    summary: "Guidelines on non-disclosure, commercial gifts, outside business engagements, confidential data handling, and whistleblower protections.",
    content: `ANTI-GRAFT, CONFLICT OF INTEREST & ETHICAL CONDUCT POLICY
Board of Directors & Executive Management Office

1. FIDUCIARY RESPONSIBILITY: Employees shall not engage in any commercial activity, employment, or consultancy that conflicts with the business interests of Simpal Group of Companies.
2. GIFTS AND FAVORS: Employees are strictly prohibited from soliciting or accepting cash, expensive gifts, or unauthorized discounts from suppliers, vendors, or contractors.
3. CONFIDENTIALITY & DATA PRIVACY: All internal personnel files, financial ledgers, gross reports, and software access keys are confidential trade secrets protected under the Philippine Data Privacy Act of 2012 (RA 10173).`
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
      const matchesSearch = !q || pol.title.toLowerCase().includes(q) || pol.summary.toLowerCase().includes(q) || pol.docRef.toLowerCase().includes(q);
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
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>CORPORATE POLICIES & COMPLIANCE HANDBOOKS</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Official Corporate Standards & Legal Documentation
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Legally certified corporate policies, DOLE due process rules, Labor Code standards, and occupational safety handbooks governing all group operations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-slate-900 text-emerald-400 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
              <Scale size={13} />
              <span>DOLE 2026 Compliant</span>
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
              placeholder="Search corporate handbooks, due process rules, RA 11058, or document refs..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-emerald-600 text-white shadow-xs shadow-emerald-600/20"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. POLICY CARDS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPolicies.map((policy) => (
          <div
            key={policy.id}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${policy.badgeColor}`}>
                  {policy.badge}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {policy.docRef}
                </span>
              </div>

              <h2 className="font-extrabold text-slate-900 text-base leading-snug">
                {policy.title}
              </h2>

              <p className="text-xs text-slate-500 leading-relaxed">
                {policy.summary}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400">
                Effective: {policy.effectiveDate}
              </span>

              <button
                type="button"
                onClick={() => setActivePolicyModal(policy)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs transition cursor-pointer shadow-2xs"
              >
                <BookOpen size={12} />
                <span>Read Full Document &rarr;</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. POLICY READER MODAL */}
      {activePolicyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${activePolicyModal.badgeColor}`}>
                    {activePolicyModal.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {activePolicyModal.docRef}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {activePolicyModal.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Category: {activePolicyModal.category} • Effective Date: {activePolicyModal.effectiveDate}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Document Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono text-slate-700 leading-relaxed bg-white">
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">
                {activePolicyModal.content}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Certified Official Document • Simpal Group Corporate Secretariat</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Printer size={13} />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicyModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
