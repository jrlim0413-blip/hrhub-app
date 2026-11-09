import { useState, useMemo, useEffect } from "react";
import {
  Calculator, DollarSign, Calendar, Users, FileText, CheckCircle2,
  AlertCircle, Download, Printer, Plus, Search, Filter, RefreshCw,
  Building2, ArrowUpRight, Copy, Check, ChevronRight, X, Shield,
  Award, TrendingUp, Sparkles, HelpCircle, FileCheck
} from "lucide-react";
import { COMPANIES } from "./MemoGeneratorPanel";

// Format Philippine Peso Currency
const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const STORAGE_KEY = "hrhub_13th_month_payroll_v1";

// Default realistic sample roster for branch tellers, supervisors, and administrative personnel
const DEFAULT_PAYROLL_ROSTER = [
  {
    id: "EMP-2026-001",
    name: "Arnel Mendoza",
    role: "Area Field Supervisor",
    company: "Lucky Betplay Central Inc.",
    companyId: "lucky_betplay",
    branch: "Cavite East District",
    monthlyBasic: 24500,
    monthsWorked: 12,
    unpaidDeductions: 0,
    status: "Approved",
    dateHired: "2024-03-15",
    paymentMode: "BDO Payroll",
    remarks: "Full calendar year completed"
  },
  {
    id: "EMP-2026-002",
    name: "Maria Cristina Santos",
    role: "Senior Kiosk Teller",
    company: "Lucky Betplay Central Inc.",
    companyId: "lucky_betplay",
    branch: "Booth 012 - Imus Poblacion",
    monthlyBasic: 17500,
    monthsWorked: 12,
    unpaidDeductions: 580,
    status: "Approved",
    dateHired: "2024-08-01",
    paymentMode: "BPI Direct",
    remarks: "1 day unexcused leave deducted"
  },
  {
    id: "EMP-2026-003",
    name: "Jomer Dela Cruz",
    role: "Field Roving Supervisor",
    company: "Glowing Fortune Corporation",
    companyId: "glowing_fortune",
    branch: "Batangas Operations",
    monthlyBasic: 22000,
    monthsWorked: 10,
    unpaidDeductions: 0,
    status: "Computed",
    dateHired: "2026-03-01",
    paymentMode: "BDO Payroll",
    remarks: "Pro-rated (10 months rendered)"
  },
  {
    id: "EMP-2026-004",
    name: "Rochelle Bautista",
    role: "Terminal Booth Cashier",
    company: "5A Royal Gaming Corp.",
    companyId: "5a_royal",
    branch: "Booth 008 - Bacoor Coastal",
    monthlyBasic: 16800,
    monthsWorked: 12,
    unpaidDeductions: 0,
    status: "Approved",
    dateHired: "2025-01-10",
    paymentMode: "BPI Direct",
    remarks: "Perfect attendance record"
  },
  {
    id: "EMP-2026-005",
    name: "Eduardo Tan",
    role: "SIMCON Technical Specialist",
    company: "Simcon Engineering & Equipment",
    companyId: "simcon",
    branch: "Head Office Maintenance",
    monthlyBasic: 26000,
    monthsWorked: 12,
    unpaidDeductions: 1200,
    status: "Approved",
    dateHired: "2023-11-20",
    paymentMode: "UnionBank",
    remarks: "2 days LWOP deducted"
  },
  {
    id: "EMP-2026-006",
    name: "Charmaine Reyes",
    role: "Branch Teller & Cashier",
    company: "Lucky Betplay Central Inc.",
    companyId: "lucky_betplay",
    branch: "Booth 024 - Dasmariñas",
    monthlyBasic: 16800,
    monthsWorked: 7,
    unpaidDeductions: 0,
    status: "Computed",
    dateHired: "2026-06-01",
    paymentMode: "BDO Payroll",
    remarks: "Mid-year hire (Pro-rated 7 months)"
  },
  {
    id: "EMP-2026-007",
    name: "Reynaldo Soriano",
    role: "Security & Operations Marshal",
    company: "Simpal Group of Companies",
    companyId: "sgc",
    branch: "Central Logistics Depot",
    monthlyBasic: 19500,
    monthsWorked: 12,
    unpaidDeductions: 650,
    status: "Approved",
    dateHired: "2024-05-12",
    paymentMode: "Cash / Direct",
    remarks: "1 day LWOP adjustment"
  },
  {
    id: "EMP-2026-008",
    name: "Lhea Hernandez",
    role: "Imperial Branch Lead Cashier",
    company: "Imperial Gaming Corp.",
    companyId: "imperial_gaming",
    branch: "Imperial Arena Branch",
    monthlyBasic: 19000,
    monthsWorked: 12,
    unpaidDeductions: 0,
    status: "Approved",
    dateHired: "2025-02-14",
    paymentMode: "BPI Direct",
    remarks: "Full 12 months verified"
  }
];

export default function ThirteenthMonthPayrollPanel({
  currentUser,
  onClose,
  onNavigate
}) {
  // Mode: 'batch' (Master Ledger) | 'calculator' (Single Employee Precision Tool)
  const [activeMode, setActiveMode] = useState("batch");

  // Roster state with persistence
  const [roster, setRoster] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PAYROLL_ROSTER;
  });

  // Save changes to localStorage
  const saveRoster = (newRoster) => {
    setRoster(newRoster);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRoster));
    } catch (e) {
      console.warn("Error saving 13th month roster:", e);
    }
  };

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Single precision calculator inputs
  const [calcName, setCalcName] = useState("Juan Dela Cruz");
  const [calcRole, setCalcRole] = useState("Booth Teller / Cashier");
  const [calcMonthlyBasic, setCalcMonthlyBasic] = useState(17500);
  const [calcMonthsWorked, setCalcMonthsWorked] = useState(12);
  const [calcUnpaidLeaveDeduction, setCalcUnpaidLeaveDeduction] = useState(0);
  const [calcCompany, setCalcCompany] = useState("Lucky Betplay Central Inc.");
  const [isCopied, setIsCopied] = useState(false);

  // New Employee Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    id: `EMP-2026-${String(roster.length + 1).padStart(3, "0")}`,
    name: "",
    role: "Booth Teller",
    company: "Lucky Betplay Central Inc.",
    companyId: "lucky_betplay",
    branch: "Branch 001",
    monthlyBasic: 17500,
    monthsWorked: 12,
    unpaidDeductions: 0,
    status: "Computed",
    dateHired: new Date().toISOString().split("T")[0],
    paymentMode: "BDO Payroll",
    remarks: "Newly added"
  });

  // Individual Payslip Modal state
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState(null);

  // -------------------------------------------------------------
  // COMPUTATION ENGINE: DOLE P.D. 851 & TRAIN LAW
  // -------------------------------------------------------------
  // Formula: Net 13th Month = Math.max(0, (Monthly Basic * Months Worked - Deductions) / 12)
  // Tax Cap: Up to ₱90,000 is tax-exempt. Excess is subject to withholding tax.
  const computeEmployee13th = (emp) => {
    const basic = Number(emp.monthlyBasic) || 0;
    const months = Math.min(Math.max(Number(emp.monthsWorked) || 0, 0), 12);
    const deductions = Number(emp.unpaidDeductions) || 0;

    const totalBasicEarned = Math.max(0, basic * months - deductions);
    const gross13th = Math.round((totalBasicEarned / 12) * 100) / 100;

    // TRAIN Law Tax-Exemption check (₱90,000 threshold under Section 32(B)(7)(e) of NIRC)
    const taxExemptAmount = Math.min(gross13th, 90000);
    const taxableExcess = Math.max(0, gross13th - 90000);
    const estimatedWithholdingTax = Math.round(taxableExcess * 0.20 * 100) / 100; // 20% indicative tax rate
    const net13th = Math.round((gross13th - estimatedWithholdingTax) * 100) / 100;

    return {
      totalBasicEarned,
      gross13th,
      taxExemptAmount,
      taxableExcess,
      estimatedWithholdingTax,
      net13th,
      isTaxExempt: taxableExcess === 0
    };
  };

  // Precision Calculator Results
  const singleCalcResult = useMemo(() => {
    const basic = Number(calcMonthlyBasic) || 0;
    const months = Number(calcMonthsWorked) || 0;
    const deductions = Number(calcUnpaidLeaveDeduction) || 0;

    const totalEarned = Math.max(0, basic * months - deductions);
    const gross = Math.max(0, totalEarned / 12);
    const taxExempt = Math.min(gross, 90000);
    const taxable = Math.max(0, gross - 90000);
    const tax = taxable * 0.20;
    const net = gross - tax;

    return {
      totalEarned,
      gross,
      taxExempt,
      taxable,
      tax,
      net,
      isExempt: taxable === 0
    };
  }, [calcMonthlyBasic, calcMonthsWorked, calcUnpaidLeaveDeduction]);

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    return roster.filter((emp) => {
      if (companyFilter !== "ALL" && emp.companyId !== companyFilter && emp.company !== companyFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && emp.status !== statusFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.id.toLowerCase().includes(q) ||
          emp.role.toLowerCase().includes(q) ||
          emp.branch.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [roster, companyFilter, statusFilter, searchQuery]);

  // Overall Aggregate Statistics
  const overallStats = useMemo(() => {
    let totalGross13th = 0;
    let totalNet13th = 0;
    let totalBasicSum = 0;
    let approvedCount = 0;
    let disbursedCount = 0;

    roster.forEach((emp) => {
      const comp = computeEmployee13th(emp);
      totalGross13th += comp.gross13th;
      totalNet13th += comp.net13th;
      totalBasicSum += emp.monthlyBasic;
      if (emp.status === "Approved") approvedCount++;
      if (emp.status === "Disbursed") disbursedCount++;
    });

    const averagePayout = roster.length > 0 ? totalNet13th / roster.length : 0;

    return {
      totalHeadcount: roster.length,
      totalGross13th,
      totalNet13th,
      averagePayout,
      approvedCount,
      disbursedCount,
      completionRate: roster.length > 0 ? ((approvedCount + disbursedCount) / roster.length) * 100 : 0
    };
  }, [roster]);

  // Bulk actions
  const handleSetAll12Months = () => {
    if (window.confirm("Set all employees in roster to 12 months (Full Year Service)?")) {
      const updated = roster.map((e) => ({ ...e, monthsWorked: 12, remarks: "Updated to full 12 months" }));
      saveRoster(updated);
    }
  };

  const handleApproveAll = () => {
    if (window.confirm("Approve 13th month payout for all employees?")) {
      const updated = roster.map((e) => ({ ...e, status: "Approved" }));
      saveRoster(updated);
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm("Reset payroll roster to initial verified sample data?")) {
      saveRoster(DEFAULT_PAYROLL_ROSTER);
    }
  };

  // Add Employee Handler
  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!newEmployee.name.trim()) {
      alert("Please provide the employee's full name.");
      return;
    }
    const updated = [
      ...roster,
      {
        ...newEmployee,
        id: newEmployee.id || `EMP-2026-${String(roster.length + 1).padStart(3, "0")}`,
        monthlyBasic: Number(newEmployee.monthlyBasic) || 16800,
        monthsWorked: Number(newEmployee.monthsWorked) || 12,
        unpaidDeductions: Number(newEmployee.unpaidDeductions) || 0
      }
    ];
    saveRoster(updated);
    setIsAddModalOpen(false);
    setNewEmployee({
      id: `EMP-2026-${String(updated.length + 1).padStart(3, "0")}`,
      name: "",
      role: "Booth Teller",
      company: "Lucky Betplay Central Inc.",
      companyId: "lucky_betplay",
      branch: "Branch 001",
      monthlyBasic: 17500,
      monthsWorked: 12,
      unpaidDeductions: 0,
      status: "Computed",
      dateHired: new Date().toISOString().split("T")[0],
      paymentMode: "BDO Payroll",
      remarks: "Newly added"
    });
  };

  // Delete row
  const handleDeleteRow = (empId) => {
    if (window.confirm("Remove this employee from the 13th month payroll ledger?")) {
      saveRoster(roster.filter((r) => r.id !== empId));
    }
  };

  // Update inline row field
  const handleInlineUpdate = (empId, field, value) => {
    const updated = roster.map((r) => {
      if (r.id === empId) {
        return { ...r, [field]: value };
      }
      return r;
    });
    saveRoster(updated);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Employee ID",
      "Employee Name",
      "Position / Role",
      "Company Entity",
      "Branch Location",
      "Monthly Basic (PHP)",
      "Months Worked",
      "Unpaid Deductions (PHP)",
      "Total Basic Earned (PHP)",
      "Gross 13th Month (PHP)",
      "Tax Status",
      "Net 13th Month Pay (PHP)",
      "Payroll Status",
      "Payment Mode"
    ];

    const rows = roster.map((emp) => {
      const comp = computeEmployee13th(emp);
      return [
        `"${emp.id}"`,
        `"${emp.name}"`,
        `"${emp.role}"`,
        `"${emp.company}"`,
        `"${emp.branch}"`,
        emp.monthlyBasic.toFixed(2),
        emp.monthsWorked,
        emp.unpaidDeductions.toFixed(2),
        comp.totalBasicEarned.toFixed(2),
        comp.gross13th.toFixed(2),
        comp.isTaxExempt ? "Tax-Exempt" : `Taxable Excess ₱${comp.taxableExcess.toFixed(2)}`,
        comp.net13th.toFixed(2),
        `"${emp.status}"`,
        `"${emp.paymentMode}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `13th_Month_Payroll_Summary_2026_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Summary Page
  const handlePrint = () => {
    window.print();
  };

  // Copy Single Calc
  const handleCopySingleCalc = () => {
    const text = `DOLE 13TH MONTH PAY BREAKDOWN (P.D. 851)
Employee: ${calcName} (${calcRole})
Company: ${calcCompany}
Monthly Basic Salary: ${currency.format(calcMonthlyBasic)}
Months Rendered in 2026: ${calcMonthsWorked} months
Unpaid Absences / LWOP Deduction: ${currency.format(calcUnpaidLeaveDeduction)}
Total Basic Salary Earned: ${currency.format(singleCalcResult.totalEarned)}
Gross 13th Month Pay (Total ÷ 12): ${currency.format(singleCalcResult.gross)}
TRAIN Law Status: ${singleCalcResult.isExempt ? "100% Tax-Exempt (Below ₱90,000 threshold)" : `Taxable: ${currency.format(singleCalcResult.taxable)}`}
Estimated Withholding Tax: ${currency.format(singleCalcResult.tax)}
NET 13TH MONTH PAYABLE: ${currency.format(singleCalcResult.net)}
Legal Basis: Presidential Decree No. 851 | Mandatory Deadline: On or before December 24`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16 font-['Figtree','Inter',sans-serif]">
      {/* ================= 1. HEADER BANNER ================= */}
      <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-100/40 via-emerald-100/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-bold tracking-wide uppercase">
              <Calculator size={13} className="text-amber-700" />
              <span>DOLE Presidential Decree No. 851 Statutory Suite</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              13th Month Payroll Calculator & Master Ledger
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-500 max-w-3xl">
              Automated statutory 13th month computation for branch tellers, field supervisors, and administrative personnel. Fully compliant with DOLE P.D. 851 guidelines and BIR TRAIN Law ₱90,000 tax-exempt ceiling.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Download Excel / CSV Disbursement File"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Print Official Master Disbursement Sheet"
            >
              <Printer size={13} />
              <span className="hidden sm:inline">Print Ledger</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#008559] hover:bg-[#00704a] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Employee</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Close Tab"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Legal Advisory Strip */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="text-amber-600" size={14} />
            <span>
              Mandatory Payout Deadline: <strong className="text-slate-800">On or before December 24</strong> • Formula: <em>Total Basic Earned ÷ 12</em>
            </span>
          </div>

          <div className="flex items-center gap-2 font-medium text-emerald-700">
            <CheckCircle2 size={13} />
            <span>BIR TRAIN Law Cap: Non-taxable up to <strong>₱90,000.00</strong></span>
          </div>
        </div>
      </div>

      {/* ================= 2. EXECUTIVE METRIC KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Payroll Budget */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Net 13th Month Pool</p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">
            {currency.format(overallStats.totalNet13th)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Gross Total: {currency.format(overallStats.totalGross13th)}
          </p>
        </div>

        {/* KPI 2: Total Eligible Employees */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Eligible Employees</p>
          <h3 className="mt-1 text-2xl font-black text-indigo-700">
            {overallStats.totalHeadcount} Staff
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Approved: <strong className="text-emerald-600">{overallStats.approvedCount}</strong> • Pending: <strong className="text-amber-600">{overallStats.totalHeadcount - overallStats.approvedCount}</strong>
          </p>
        </div>

        {/* KPI 3: Average Payout */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Payout per Staff</p>
          <h3 className="mt-1 text-2xl font-black text-emerald-700">
            {currency.format(overallStats.averagePayout)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Benchmarked to basic field rates
          </p>
        </div>

        {/* KPI 4: Audit & Approval Progress */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Approval Readiness</p>
          <h3 className="mt-1 text-2xl font-black text-amber-700">
            {overallStats.completionRate.toFixed(1)}%
          </h3>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${overallStats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ================= 3. NAVIGATION TABS (BATCH LEDGER vs INDIVIDUAL CALCULATOR) ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveMode("batch")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeMode === "batch"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={14} />
            <span>Master Payroll Ledger ({roster.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode("calculator")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeMode === "calculator"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator size={14} />
            <span>Precision Single Calculator & Payslip</span>
          </button>
        </div>

        {activeMode === "batch" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSetAll12Months}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition"
            >
              Set All 12 Months
            </button>
            <button
              type="button"
              onClick={handleApproveAll}
              className="px-3 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition"
            >
              Approve All Computations
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
              title="Reset to default sample data"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ================= 4. VIEW 1: MASTER PAYROLL LEDGER ================= */}
      {activeMode === "batch" && (
        <div className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff name, ID, position, or branch..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Companies & Entities</option>
                {COMPANIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legalName || c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Computed">Computed</option>
                <option value="Disbursed">Disbursed</option>
              </select>
            </div>
          </div>

          {/* Master Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Staff & Role</th>
                    <th className="py-3 px-4">Company / Branch</th>
                    <th className="py-3 px-3 text-right">Monthly Basic</th>
                    <th className="py-3 px-3 text-center">Months (1-12)</th>
                    <th className="py-3 px-3 text-right">LWOP Deduct</th>
                    <th className="py-3 px-3 text-right">Gross 13th</th>
                    <th className="py-3 px-3 text-right font-black text-slate-900">Net 13th Month</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                        No employees found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((emp) => {
                      const comp = computeEmployee13th(emp);

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                          {/* Staff Name & ID */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {emp.id} • {emp.role}
                            </div>
                          </td>

                          {/* Company / Branch */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-700 truncate max-w-[160px]" title={emp.company}>
                              {emp.company}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">{emp.branch}</div>
                          </td>

                          {/* Editable Monthly Basic */}
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={emp.monthlyBasic}
                              onChange={(e) =>
                                handleInlineUpdate(emp.id, "monthlyBasic", parseFloat(e.target.value) || 0)
                              }
                              className="w-24 text-right px-2 py-1 rounded-lg border border-slate-200 focus:border-amber-500 font-semibold text-slate-800"
                            />
                          </td>

                          {/* Editable Months Worked */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              max="12"
                              value={emp.monthsWorked}
                              onChange={(e) =>
                                handleInlineUpdate(emp.id, "monthsWorked", parseInt(e.target.value) || 0)
                              }
                              className="w-14 text-center px-1.5 py-1 rounded-lg border border-slate-200 focus:border-amber-500 font-bold text-slate-800"
                            />
                          </td>

                          {/* Editable LWOP Deductions */}
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              value={emp.unpaidDeductions}
                              onChange={(e) =>
                                handleInlineUpdate(emp.id, "unpaidDeductions", parseFloat(e.target.value) || 0)
                              }
                              className="w-20 text-right px-2 py-1 rounded-lg border border-slate-200 focus:border-amber-500 text-slate-600"
                            />
                          </td>

                          {/* Gross 13th */}
                          <td className="py-3 px-3 text-right text-slate-600 font-medium">
                            {currency.format(comp.gross13th)}
                          </td>

                          {/* Net 13th Month Pay */}
                          <td className="py-3 px-3 text-right font-black text-emerald-700 text-sm">
                            {currency.format(comp.net13th)}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                emp.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : emp.status === "Disbursed"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {emp.status}
                            </span>
                          </td>

                          {/* Row Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedPayslipEmp(emp)}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                                title="Generate individual payslip / voucher"
                              >
                                Payslip
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(emp.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                title="Remove row"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= 5. VIEW 2: SINGLE PRECISION CALCULATOR ================= */}
      {activeMode === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inputs Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">DOLE Single Staff Precision Calculator</h3>
              <p className="text-xs text-slate-500">
                Compute pro-rated 13th month payout for newly hired, transferred, or resigned employees under P.D. 851.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Employee Full Name</label>
                <input
                  type="text"
                  value={calcName}
                  onChange={(e) => setCalcName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Position / Role</label>
                  <input
                    type="text"
                    value={calcRole}
                    onChange={(e) => setCalcRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company / Entity</label>
                  <select
                    value={calcCompany}
                    onChange={(e) => setCalcCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500"
                  >
                    {COMPANIES.map((c) => (
                      <option key={c.id} value={c.legalName || c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monthly Basic Salary (PHP)
                  <span className="text-[10px] font-normal text-slate-400 ml-1.5">(Excluding allowances)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                  <input
                    type="number"
                    value={calcMonthlyBasic}
                    onChange={(e) => setCalcMonthlyBasic(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Months Rendered (1 - 12)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={calcMonthsWorked}
                    onChange={(e) => setCalcMonthsWorked(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:border-amber-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-400">At least 1 month of service is mandatory</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unpaid Leave Deductions (PHP)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                    <input
                      type="number"
                      value={calcUnpaidLeaveDeduction}
                      onChange={(e) => setCalcUnpaidLeaveDeduction(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">Leave without pay (LWOP) adjustments</p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCopySingleCalc}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{isCopied ? "Copied Computation!" : "Copy Summary to Clipboard"}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedPayslipEmp({
                    id: "CALC-001",
                    name: calcName,
                    role: calcRole,
                    company: calcCompany,
                    branch: "Branch Operations",
                    monthlyBasic: calcMonthlyBasic,
                    monthsWorked: calcMonthsWorked,
                    unpaidDeductions: calcUnpaidLeaveDeduction,
                    status: "Approved",
                    paymentMode: "Direct Payroll",
                    remarks: "Calculated via Precision Tool"
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer"
              >
                <FileCheck size={14} />
                <span>Generate Official Voucher</span>
              </button>
            </div>
          </div>

          {/* Breakdown Results Card */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Step-by-Step P.D. 851 Breakdown
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                  Official DOLE Formula
                </span>
              </div>

              <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-100 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Monthly Basic Salary</span>
                  <span className="font-bold text-slate-800">{currency.format(calcMonthlyBasic)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Service Months in Calendar Year</span>
                  <span className="font-bold text-slate-800">{calcMonthsWorked} / 12 Months</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Unpaid Absences (LWOP Deductions)</span>
                  <span className="font-bold text-rose-600">- {currency.format(calcUnpaidLeaveDeduction)}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Total Basic Earned (Year-to-Date)</span>
                  <span className="font-bold text-slate-900">{currency.format(singleCalcResult.totalEarned)}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Divisor (Prescribed by DOLE)</span>
                  <span className="font-bold text-slate-900">÷ 12</span>
                </div>
              </div>

              {/* TRAIN Law Banner */}
              <div className="mt-4 p-3 rounded-xl bg-white border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-700">BIR TRAIN Law Tax Exemption Cap</span>
                  <span className="font-bold text-emerald-600">₱90,000.00 Limit</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {singleCalcResult.isExempt
                    ? "✓ 100% Tax-Exempt. Amount is below the ₱90,000.00 threshold."
                    : `⚠️ Taxable excess of ${currency.format(singleCalcResult.taxable)} subject to withholding tax.`}
                </p>
              </div>
            </div>

            {/* Total Net Payable Highlight */}
            <div className="mt-6 pt-4 border-t border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-900 uppercase">Net 13th Month Pay</span>
                <p className="text-[11px] text-slate-500">Mandatory release on or before Dec 24</p>
              </div>
              <div className="text-2xl font-black text-emerald-700">
                {currency.format(singleCalcResult.net)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. MODAL: ADD EMPLOYEE ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Add Staff to 13th Month Payroll</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Kristina Santos"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#008559]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Position / Role</label>
                  <input
                    type="text"
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch / Assigned Kiosk</label>
                  <input
                    type="text"
                    value={newEmployee.branch}
                    onChange={(e) => setNewEmployee({ ...newEmployee, branch: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Entity</label>
                <select
                  value={newEmployee.companyId}
                  onChange={(e) => {
                    const match = COMPANIES.find((c) => c.id === e.target.value);
                    setNewEmployee({
                      ...newEmployee,
                      companyId: e.target.value,
                      company: match ? match.legalName || match.name : "Lucky Betplay Central Inc."
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                >
                  {COMPANIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monthly Basic (₱)</label>
                  <input
                    type="number"
                    value={newEmployee.monthlyBasic}
                    onChange={(e) => setNewEmployee({ ...newEmployee, monthlyBasic: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Months (1-12)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={newEmployee.monthsWorked}
                    onChange={(e) => setNewEmployee({ ...newEmployee, monthsWorked: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deductions (₱)</label>
                  <input
                    type="number"
                    value={newEmployee.unpaidDeductions}
                    onChange={(e) => setNewEmployee({ ...newEmployee, unpaidDeductions: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#008559] hover:bg-[#00704a] text-white text-xs font-bold"
                >
                  Add to Master Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 7. MODAL: OFFICIAL INDIVIDUAL PAYSLIP / VOUCHER ================= */}
      {selectedPayslipEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Official Accounting Voucher
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  <Printer size={13} />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayslipEmp(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Official Printable Voucher Content */}
            <div className="space-y-6 text-slate-800">
              {/* Letterhead Header */}
              <div className="text-center pb-4 border-b border-slate-200">
                <h2 className="text-lg font-black tracking-wide text-slate-900 uppercase">
                  {selectedPayslipEmp.company || "SIMPAL GROUP OF COMPANIES"}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  HUMAN RESOURCES MANAGEMENT &amp; DISBURSEMENT DIVISION
                </p>
                <h3 className="mt-2 text-sm font-extrabold text-amber-800 uppercase tracking-wider">
                  OFFICIAL 13TH MONTH PAY DISBURSEMENT VOUCHER (P.D. 851)
                </h3>
                <p className="text-[10px] text-slate-400">Calendar Year 2026 Statutory Compliance</p>
              </div>

              {/* Employee Particulars Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee Name:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedPayslipEmp.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Employee ID:</span>
                  <span className="font-bold text-slate-800">{selectedPayslipEmp.id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Position / Role:</span>
                  <span className="font-medium text-slate-800">{selectedPayslipEmp.role}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Branch Location:</span>
                  <span className="font-medium text-slate-800">{selectedPayslipEmp.branch}</span>
                </div>
              </div>

              {/* Breakdown Table */}
              {(() => {
                const comp = computeEmployee13th(selectedPayslipEmp);
                return (
                  <div className="space-y-4">
                    <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          <th className="py-2 px-3 text-left">Computation Item</th>
                          <th className="py-2 px-3 text-right">Details</th>
                          <th className="py-2 px-3 text-right">Amount (PHP)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-3">Monthly Basic Salary Rate</td>
                          <td className="py-2 px-3 text-right text-slate-500">Prescribed rate</td>
                          <td className="py-2 px-3 text-right font-medium">
                            {currency.format(selectedPayslipEmp.monthlyBasic)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3">Calendar Service Rendered</td>
                          <td className="py-2 px-3 text-right text-slate-500">
                            {selectedPayslipEmp.monthsWorked} of 12 Months
                          </td>
                          <td className="py-2 px-3 text-right font-medium">
                            {currency.format(selectedPayslipEmp.monthlyBasic * selectedPayslipEmp.monthsWorked)}
                          </td>
                        </tr>
                        {selectedPayslipEmp.unpaidDeductions > 0 && (
                          <tr>
                            <td className="py-2 px-3 text-rose-600">Less: Unpaid Leaves (LWOP)</td>
                            <td className="py-2 px-3 text-right text-slate-500">Absence deductions</td>
                            <td className="py-2 px-3 text-right font-medium text-rose-600">
                              - {currency.format(selectedPayslipEmp.unpaidDeductions)}
                            </td>
                          </tr>
                        )}
                        <tr className="bg-slate-50 font-semibold">
                          <td className="py-2 px-3">Total Basic Salary Earned (YTD)</td>
                          <td className="py-2 px-3 text-right text-slate-500">Divided by 12</td>
                          <td className="py-2 px-3 text-right font-bold">
                            {currency.format(comp.totalBasicEarned)}
                          </td>
                        </tr>
                        <tr className="font-bold">
                          <td className="py-2.5 px-3">Gross 13th Month Pay</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600">
                            {comp.isTaxExempt ? "100% Tax-Exempt (TRAIN Law)" : "Taxable Excess"}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-900">
                            {currency.format(comp.gross13th)}
                          </td>
                        </tr>
                        <tr className="bg-emerald-50 text-emerald-900 font-black text-sm">
                          <td className="py-3 px-3">NET 13TH MONTH PAYABLE</td>
                          <td className="py-3 px-3 text-right text-xs font-semibold text-emerald-700">
                            Via {selectedPayslipEmp.paymentMode || "Direct Payroll"}
                          </td>
                          <td className="py-3 px-3 text-right text-base text-emerald-700">
                            {currency.format(comp.net13th)}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Legal Certification Statement */}
                    <p className="text-[10px] text-slate-500 leading-relaxed italic border-l-2 border-amber-400 pl-3">
                      "I hereby acknowledge the receipt of the full and final 13th Month Pay for calendar year 2026 computed in accordance with Presidential Decree No. 851. I affirm that this statutory benefit has been correctly computed and disbursed."
                    </p>

                    {/* Signatures Grid */}
                    <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
                      <div>
                        <div className="border-b border-slate-300 pb-8 font-semibold text-slate-700">
                          {currentUser?.name || "HR Officer"}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">Prepared by HR</span>
                      </div>
                      <div>
                        <div className="border-b border-slate-300 pb-8 font-semibold text-slate-700">
                          Central Finance / Auditor
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">Verified by Finance</span>
                      </div>
                      <div>
                        <div className="border-b border-slate-300 pb-8 font-semibold text-slate-700">
                          {selectedPayslipEmp.name}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">Employee Signature / Date</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

