import { useState, useMemo, useEffect } from "react";
import {
  Receipt, DollarSign, Calendar, Plus, Search, Filter, Download,
  Printer, CheckCircle2, AlertTriangle, ArrowUpRight, Check, X,
  Building2, RefreshCw, Layers, ShieldCheck, Clock, FileText,
  CreditCard, Fuel, Wrench, Wifi, Sparkles, HelpCircle
} from "lucide-react";
import { COMPANIES } from "./MemoGeneratorPanel";

// Format Philippine Peso Currency
const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const STORAGE_KEY = "hrhub_branch_expenses_v1";
const PCF_CEILING_DEFAULT = 30000; // ₱30,000 standard petty cash revolving fund ceiling

// Realistic initial branch expenses and vouchers for betting kiosks, branch offices, and operations
const DEFAULT_EXPENSES_LIST = [
  {
    id: "PCV-2026-081",
    date: "2026-11-08",
    branch: "Booth 014 - Talon Dos",
    company: "Lucky Betplay Central Inc.",
    companyId: "lucky_betplay",
    payee: "Mark Anthony Villanueva (Field Supervisor)",
    category: "Thermal Paper & Stationery",
    particulars: "Emergency purchase of 20 rolls 80mm thermal paper for terminal betting draws due to supplier stockout",
    amount: 1400.00,
    receiptNo: "OR# 98412 - Office Depot Imus",
    paymentMode: "Cash from Petty Cash",
    status: "Approved",
    requestedBy: "Mark Anthony Villanueva",
    approvedBy: "Operations Manager",
    remarks: "Official receipt attached and validated"
  },
  {
    id: "PCV-2026-082",
    date: "2026-11-07",
    branch: "Booth 003 - Bacoor Coastal",
    company: "5A Royal Gaming Corp.",
    companyId: "5a_royal",
    payee: "Rochelle Bautista (Lead Cashier)",
    category: "Branch Utilities & Electrical",
    particulars: "Emergency replacement of 32W LED fluorescent daylight tubes and circuit breaker trip check",
    amount: 850.00,
    receiptNo: "OR# 45190 - Ace Hardware Bacoor",
    paymentMode: "Cash from Petty Cash",
    status: "Approved",
    requestedBy: "Rochelle Bautista",
    approvedBy: "Branch Area Supervisor",
    remarks: "Electrical safety repair completed"
  },
  {
    id: "PCV-2026-083",
    date: "2026-11-06",
    branch: "Batangas Provincial Depot",
    company: "Glowing Fortune Corporation",
    companyId: "glowing_fortune",
    payee: "Jomer Dela Cruz (Roving Supervisor)",
    category: "Transportation & Remittance Fuel",
    particulars: "Motorcycle fuel reimbursement for weekly physical draw remittance audit across 6 remote barangay kiosks",
    amount: 1250.00,
    receiptNo: "OR# 771234 - Shell Lipa",
    paymentMode: "GCash Corporate",
    status: "Approved",
    requestedBy: "Jomer Dela Cruz",
    approvedBy: "Finance Auditor",
    remarks: "Logbook itinerary verified against GPS records"
  },
  {
    id: "PCV-2026-084",
    date: "2026-11-05",
    branch: "Central Logistics Depot",
    company: "Simpal Group of Companies",
    companyId: "sgc",
    payee: "Reynaldo Soriano (Operations Marshal)",
    category: "Sanitation & Branch Supplies",
    particulars: "Refill of 10 five-gallon purified drinking water containers and branch cleaning sanitizers",
    amount: 600.00,
    receiptNo: "OR# 1109 - Aquasafe Water Refilling",
    paymentMode: "Cash from Petty Cash",
    status: "Liquidated",
    requestedBy: "Reynaldo Soriano",
    approvedBy: "Head Office HR Admin",
    remarks: "Monthly welfare supply provision"
  },
  {
    id: "PCV-2026-085",
    date: "2026-11-04",
    branch: "Head Office Maintenance",
    company: "Simcon Engineering & Equipment",
    companyId: "simcon",
    payee: "Eduardo Tan (SIMCON Tech Specialist)",
    category: "Booth Carpentry & Hardware",
    particulars: "Fabrication materials: marine plywood backing and heavy-duty padlock sets for newly deployed kiosk #041",
    amount: 3200.00,
    receiptNo: "OR# 66219 - Wilcon Depot Kawit",
    paymentMode: "Bank Transfer",
    status: "Approved",
    requestedBy: "Eduardo Tan",
    approvedBy: "SIMCON Operations Head",
    remarks: "Secured hardware locking mechanism"
  },
  {
    id: "PCV-2026-086",
    date: "2026-11-03",
    branch: "Imperial Arena Branch",
    company: "Imperial Gaming Corp.",
    companyId: "imperial_gaming",
    payee: "Lhea Hernandez (Lead Cashier)",
    category: "POS SIM Load & Fiber Internet",
    particulars: "Prepaid LTE broadband data load renewal for primary betting terminal connectivity fallback",
    amount: 999.00,
    receiptNo: "Smart e-Receipt # 8821415",
    paymentMode: "GCash Corporate",
    status: "Approved",
    requestedBy: "Lhea Hernandez",
    approvedBy: "Field Supervisor",
    remarks: "30-day corporate unlimited data bundle"
  },
  {
    id: "PCV-2026-087",
    date: "2026-11-02",
    branch: "Booth 024 - Dasmariñas",
    company: "Lucky Betplay Central Inc.",
    companyId: "lucky_betplay",
    payee: "Charmaine Reyes (Branch Teller)",
    category: "Emergency & Miscellaneous",
    particulars: "Urgent kiosk key duplicate replacement and first aid antiseptic refill after drawer hinge repair",
    amount: 450.00,
    receiptNo: "OR# 33120 - Mr. Quickie Dasmariñas",
    paymentMode: "Cash from Petty Cash",
    status: "Pending Approval",
    requestedBy: "Charmaine Reyes",
    approvedBy: "Awaiting Supervisor Approval",
    remarks: "Drawer lock cylinder duplicate verified"
  }
];

export default function BranchExpensesVouchersPanel({
  currentUser,
  onClose,
  onNavigate
}) {
  // Master expenses list with persistence
  const [expenses, setExpenses] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_EXPENSES_LIST;
  });

  const saveExpenses = (newList) => {
    setExpenses(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (e) {
      console.warn("Error saving branch expenses:", e);
    }
  };

  // Fund Ceiling & Replenishment
  const [pcfCeiling, setPcfCeiling] = useState(() => {
    try {
      const val = localStorage.getItem("hrhub_pcf_ceiling_v1");
      return val ? parseFloat(val) : PCF_CEILING_DEFAULT;
    } catch {
      return PCF_CEILING_DEFAULT;
    }
  });

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState(null);
  const [isReplenishModalOpen, setIsReplenishModalOpen] = useState(false);

  // New Voucher Form
  const [newVoucher, setNewVoucher] = useState({
    id: `PCV-2026-${String(expenses.length + 82).padStart(3, "0")}`,
    date: new Date().toISOString().split("T")[0],
    branch: "Booth 001 - Main Poblacion",
    company: "Lucky Betplay Central Inc.",
    companyId: "lucky_betplay",
    payee: "",
    category: "Thermal Paper & Stationery",
    particulars: "",
    amount: "",
    receiptNo: "",
    paymentMode: "Cash from Petty Cash",
    status: "Pending Approval",
    requestedBy: currentUser?.name || "Branch Supervisor",
    approvedBy: "Awaiting Finance Approval",
    remarks: ""
  });

  // Categories list
  const EXPENSE_CATEGORIES = [
    "Thermal Paper & Stationery",
    "Branch Utilities & Electrical",
    "Transportation & Remittance Fuel",
    "POS SIM Load & Fiber Internet",
    "Booth Carpentry & Hardware",
    "Sanitation & Branch Supplies",
    "Emergency & Miscellaneous"
  ];

  // -------------------------------------------------------------
  // REVOLVING PETTY CASH FUND COMPUTATIONS
  // -------------------------------------------------------------
  const fundMetrics = useMemo(() => {
    let totalDisbursed = 0;
    let pendingApprovalSum = 0;
    let approvedSum = 0;
    let liquidatedSum = 0;

    expenses.forEach((item) => {
      const amt = Number(item.amount) || 0;
      totalDisbursed += amt;
      if (item.status === "Pending Approval") pendingApprovalSum += amt;
      if (item.status === "Approved") approvedSum += amt;
      if (item.status === "Liquidated") liquidatedSum += amt;
    });

    const cashOnHand = Math.max(0, pcfCeiling - totalDisbursed);
    const depletionPercent = pcfCeiling > 0 ? (totalDisbursed / pcfCeiling) * 100 : 0;
    const isReplenishmentNeeded = cashOnHand <= pcfCeiling * 0.30; // Alert if cash on hand is <= 30%

    return {
      pcfCeiling,
      totalDisbursed,
      cashOnHand,
      depletionPercent: Math.min(100, depletionPercent),
      pendingApprovalSum,
      approvedSum,
      liquidatedSum,
      isReplenishmentNeeded,
      totalVouchersCount: expenses.length
    };
  }, [expenses, pcfCeiling]);

  // Filtered List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (companyFilter !== "ALL" && item.companyId !== companyFilter && item.company !== companyFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.id.toLowerCase().includes(q) ||
          item.payee.toLowerCase().includes(q) ||
          item.branch.toLowerCase().includes(q) ||
          item.particulars.toLowerCase().includes(q) ||
          (item.receiptNo && item.receiptNo.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [expenses, categoryFilter, statusFilter, companyFilter, searchQuery]);

  // Create Voucher
  const handleCreateVoucher = (e) => {
    e.preventDefault();
    if (!newVoucher.payee.trim() || !newVoucher.particulars.trim()) {
      alert("Please fill in Payee name and particulars description.");
      return;
    }
    const amt = parseFloat(newVoucher.amount) || 0;
    if (amt <= 0) {
      alert("Please provide a valid voucher expense amount.");
      return;
    }

    const created = {
      ...newVoucher,
      id: newVoucher.id || `PCV-2026-${String(expenses.length + 82).padStart(3, "0")}`,
      amount: amt
    };

    const updated = [created, ...expenses];
    saveExpenses(updated);
    setIsAddModalOpen(false);

    // Reset Form
    setNewVoucher({
      id: `PCV-2026-${String(updated.length + 82).padStart(3, "0")}`,
      date: new Date().toISOString().split("T")[0],
      branch: "Booth 001 - Main Poblacion",
      company: "Lucky Betplay Central Inc.",
      companyId: "lucky_betplay",
      payee: "",
      category: "Thermal Paper & Stationery",
      particulars: "",
      amount: "",
      receiptNo: "",
      paymentMode: "Cash from Petty Cash",
      status: "Pending Approval",
      requestedBy: currentUser?.name || "Branch Supervisor",
      approvedBy: "Awaiting Finance Approval",
      remarks: ""
    });
  };

  // Status Toggles
  const handleApprove = (id) => {
    const updated = expenses.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: "Approved",
          approvedBy: currentUser?.name || "Operations Manager"
        };
      }
      return item;
    });
    saveExpenses(updated);
  };

  const handleLiquidate = (id) => {
    const updated = expenses.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status: "Liquidated"
        };
      }
      return item;
    });
    saveExpenses(updated);
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this expense voucher record?")) {
      saveExpenses(expenses.filter((item) => item.id !== id));
    }
  };

  // Replenish Fund Handler
  const handleReplenishFund = () => {
    if (window.confirm("Confirm Petty Cash Fund Replenishment? This will archive disbursed vouchers and restore available cash on hand.")) {
      // Mark all approved vouchers as liquidated and replenish
      const updated = expenses.map((item) => ({ ...item, status: "Liquidated" }));
      saveExpenses(updated);
      setIsReplenishModalOpen(false);
      alert(`Petty Cash Fund replenished to full ₱${pcfCeiling.toLocaleString()} ceiling.`);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      "Voucher Number",
      "Date",
      "Branch / Kiosk",
      "Company Entity",
      "Payee / Claimant",
      "Expense Category",
      "Particulars",
      "Amount (PHP)",
      "Official Receipt #",
      "Payment Mode",
      "Status",
      "Requested By",
      "Approved By"
    ];

    const rows = expenses.map((item) => [
      `"${item.id}"`,
      `"${item.date}"`,
      `"${item.branch}"`,
      `"${item.company}"`,
      `"${item.payee}"`,
      `"${item.category}"`,
      `"${item.particulars.replace(/"/g, '""')}"`,
      item.amount.toFixed(2),
      `"${item.receiptNo || "N/A"}"`,
      `"${item.paymentMode}"`,
      `"${item.status}"`,
      `"${item.requestedBy || ""}"`,
      `"${item.approvedBy || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Branch_Expense_Vouchers_Ledger_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-16 font-['Figtree','Inter',sans-serif]">
      {/* ================= 1. HEADER BANNER ================= */}
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-100/40 via-teal-100/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold tracking-wide uppercase">
              <Receipt size={13} className="text-emerald-700" />
              <span>Branch Finance &amp; Petty Cash Management</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Branch Expenses &amp; Petty Cash Vouchers
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-500 max-w-3xl">
              Official disbursement tracking and liquidation system for field operations, betting kiosk thermal supplies, branch utility repairs, transportation allowances, and emergency expenses.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Download CSV Ledger"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setIsReplenishModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Request Fund Replenishment"
            >
              <RefreshCw size={13} />
              <span>Replenish Fund</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#008559] hover:bg-[#00704a] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Voucher</span>
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

        {/* Warning Banner if Fund Depleted */}
        {fundMetrics.isReplenishmentNeeded && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-amber-600 shrink-0" size={16} />
              <span>
                <strong>Petty Cash Replenishment Alert:</strong> Available cash on hand ({currency.format(fundMetrics.cashOnHand)}) has fallen below the 30% operating reserve threshold. Submit liquidation vouchers to Head Office Finance.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsReplenishModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 transition"
            >
              Request Fund Top-Up
            </button>
          </div>
        )}
      </div>

      {/* ================= 2. REVOLVING FUND METRICS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Cash on Hand */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Cash on Hand</p>
          <h3 className={`mt-1 text-2xl font-black ${fundMetrics.cashOnHand < 5000 ? "text-rose-600" : "text-emerald-700"}`}>
            {currency.format(fundMetrics.cashOnHand)}
          </h3>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${
                fundMetrics.cashOnHand < 5000 ? "bg-rose-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.max(0, 100 - fundMetrics.depletionPercent)}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Revolving Ceiling: {currency.format(fundMetrics.pcfCeiling)}
          </p>
        </div>

        {/* Metric 2: Total Disbursed */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Vouchers Disbursed</p>
          <h3 className="mt-1 text-2xl font-black text-slate-900">
            {currency.format(fundMetrics.totalDisbursed)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Across <strong>{fundMetrics.totalVouchersCount}</strong> issued vouchers
          </p>
        </div>

        {/* Metric 3: Approved & Awaiting Liquidation */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Approved for Liquidation</p>
          <h3 className="mt-1 text-2xl font-black text-blue-700">
            {currency.format(fundMetrics.approvedSum)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Liquidated: <strong className="text-emerald-600">{currency.format(fundMetrics.liquidatedSum)}</strong>
          </p>
        </div>

        {/* Metric 4: Pending Approval */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending Supervisor Audit</p>
          <h3 className="mt-1 text-2xl font-black text-amber-700">
            {currency.format(fundMetrics.pendingApprovalSum)}
          </h3>
          <p className="mt-2 text-xs text-slate-500">
            Awaiting receipt verification
          </p>
        </div>
      </div>

      {/* ================= 3. SEARCH & CATEGORY FILTERS ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voucher #, payee, receipt OR #, or branch..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Company Filter */}
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">All Companies</option>
            {COMPANIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-100/70 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Liquidated">Liquidated</option>
          </select>
        </div>
      </div>

      {/* ================= 4. MASTER EXPENSES & VOUCHERS TABLE ================= */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Voucher No.</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Payee & Branch</th>
                <th className="py-3 px-4">Category & Particulars</th>
                <th className="py-3 px-4">Official Receipt #</th>
                <th className="py-3 px-3 text-right">Amount (PHP)</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                    No expense vouchers match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    {/* Voucher ID */}
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-emerald-800 tracking-tight font-mono">
                        {v.id}
                      </span>
                      <span className="block text-[10px] text-slate-400">{v.paymentMode}</span>
                    </td>

                    {/* Date */}
                    <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                      {v.date}
                    </td>

                    {/* Payee & Branch */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{v.payee}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[180px]">
                        {v.branch} • {v.company}
                      </div>
                    </td>

                    {/* Category & Particulars */}
                    <td className="py-3 px-4 max-w-xs">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold mb-0.5">
                        {v.category}
                      </span>
                      <p className="text-[11px] text-slate-600 line-clamp-2" title={v.particulars}>
                        {v.particulars}
                      </p>
                    </td>

                    {/* Official Receipt # */}
                    <td className="py-3 px-4 text-slate-600">
                      <span className="font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {v.receiptNo || "Awaiting Attachment"}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                      {currency.format(v.amount)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === "Approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : v.status === "Liquidated"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedVoucherForPrint(v)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition"
                          title="Print official accounting disbursement voucher"
                        >
                          Print
                        </button>

                        {v.status === "Pending Approval" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(v.id)}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition"
                            title="Approve expense"
                          >
                            Approve
                          </button>
                        )}

                        {v.status === "Approved" && (
                          <button
                            type="button"
                            onClick={() => handleLiquidate(v.id)}
                            className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition"
                            title="Mark as liquidated with Head Office"
                          >
                            Liquidate
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(v.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 transition"
                          title="Delete voucher"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 5. MODAL: CREATE NEW EXPENSE VOUCHER ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Create Petty Cash Voucher (PCV)</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Voucher Number</label>
                  <input
                    type="text"
                    value={newVoucher.id}
                    onChange={(e) => setNewVoucher({ ...newVoucher, id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newVoucher.date}
                    onChange={(e) => setNewVoucher({ ...newVoucher, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payee / Claimant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mark Anthony Villanueva (Field Supervisor)"
                  value={newVoucher.payee}
                  onChange={(e) => setNewVoucher({ ...newVoucher, payee: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Company Entity</label>
                  <select
                    value={newVoucher.companyId}
                    onChange={(e) => {
                      const match = COMPANIES.find((c) => c.id === e.target.value);
                      setNewVoucher({
                        ...newVoucher,
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
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Branch / Kiosk Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Booth 014 - Talon Dos"
                    value={newVoucher.branch}
                    onChange={(e) => setNewVoucher({ ...newVoucher, branch: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category</label>
                <select
                  value={newVoucher.category}
                  onChange={(e) => setNewVoucher({ ...newVoucher, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Particulars & Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Detail the operational reason for the expense (e.g. 20 rolls thermal paper for terminal draws)"
                  value={newVoucher.particulars}
                  onChange={(e) => setNewVoucher({ ...newVoucher, particulars: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (PHP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={newVoucher.amount}
                      onChange={(e) => setNewVoucher({ ...newVoucher, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receipt / OR Number</label>
                  <input
                    type="text"
                    placeholder="e.g. OR# 98412 - Imus"
                    value={newVoucher.receiptNo}
                    onChange={(e) => setNewVoucher({ ...newVoucher, receiptNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Disbursement Mode</label>
                <select
                  value={newVoucher.paymentMode}
                  onChange={(e) => setNewVoucher({ ...newVoucher, paymentMode: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                >
                  <option value="Cash from Petty Cash">Cash from Petty Cash Fund</option>
                  <option value="GCash Corporate">GCash Corporate Account</option>
                  <option value="Bank Transfer">Bank Direct Remittance</option>
                </select>
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
                  Submit Voucher for Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 6. MODAL: OFFICIAL ACCOUNTING PRINTABLE VOUCHER ================= */}
      {selectedVoucherForPrint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-6">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Official Accounting Form
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
                  onClick={() => setSelectedVoucherForPrint(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Voucher Format */}
            <div className="space-y-6 text-slate-800">
              <div className="text-center pb-4 border-b border-slate-200">
                <h2 className="text-lg font-black tracking-wide text-slate-900 uppercase">
                  {selectedVoucherForPrint.company || "SIMPAL GROUP OF COMPANIES"}
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  FINANCE &amp; FIELD TREASURY OPERATIONS
                </p>
                <h3 className="mt-2 text-sm font-extrabold text-emerald-800 uppercase tracking-wider">
                  PETTY CASH DISBURSEMENT VOUCHER (PCV)
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  CONTROL NO: {selectedVoucherForPrint.id}
                </p>
              </div>

              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Payee / Claimant:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedVoucherForPrint.payee}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Date of Disbursement:</span>
                  <span className="font-bold text-slate-800">{selectedVoucherForPrint.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Branch / Location:</span>
                  <span className="font-medium text-slate-800">{selectedVoucherForPrint.branch}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Receipt / OR #:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {selectedVoucherForPrint.receiptNo || "Certified Without Receipt"}
                  </span>
                </div>
              </div>

              {/* Expense Table */}
              <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Expense Classification</th>
                    <th className="py-2.5 px-3 text-left">Particulars &amp; Operational Justification</th>
                    <th className="py-2.5 px-3 text-right">Amount (PHP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-800 align-top">
                      {selectedVoucherForPrint.category}
                    </td>
                    <td className="py-3 px-3 text-slate-600 align-top">
                      {selectedVoucherForPrint.particulars}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 text-sm align-top whitespace-nowrap">
                      {currency.format(selectedVoucherForPrint.amount)}
                    </td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-950 font-black text-sm">
                    <td colSpan={2} className="py-3 px-3 text-right">
                      TOTAL AMOUNT DISBURSED:
                    </td>
                    <td className="py-3 px-3 text-right text-base text-emerald-800 whitespace-nowrap">
                      {currency.format(selectedVoucherForPrint.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Accounting Signatures Grid */}
              <div className="grid grid-cols-4 gap-4 pt-6 text-center text-xs">
                <div>
                  <div className="border-b border-slate-300 pb-8 font-semibold text-slate-700">
                    {selectedVoucherForPrint.payee}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Requested by Payee</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-8 font-semibold text-slate-700">
                    {selectedVoucherForPrint.requestedBy || "Branch Supervisor"}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Checked by Supervisor</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-8 font-semibold text-slate-700">
                    {selectedVoucherForPrint.approvedBy || "Operations Manager"}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Approved by Finance</span>
                </div>
                <div>
                  <div className="border-b border-slate-300 pb-8 font-semibold text-slate-700">
                    {selectedVoucherForPrint.payee}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Received Cash / Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. MODAL: FUND REPLENISHMENT ================= */}
      {isReplenishModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Petty Cash Fund Top-Up / Replenishment</h3>
              <button
                type="button"
                onClick={() => setIsReplenishModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Authorized PCF Ceiling:</span>
                  <span className="font-bold text-slate-800">{currency.format(fundMetrics.pcfCeiling)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Cash on Hand:</span>
                  <span className="font-bold text-slate-800">{currency.format(fundMetrics.cashOnHand)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-emerald-800 font-extrabold">
                  <span>Replenishment Top-Up Amount:</span>
                  <span className="text-sm">{currency.format(fundMetrics.totalDisbursed)}</span>
                </div>
              </div>

              <p className="text-slate-500 text-[11px]">
                Upon replenishment approval, all audited vouchers will be formally marked as <strong>Liquidated</strong> and archived into the annual financial records.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplenishModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReplenishFund}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                >
                  Confirm Replenishment (₱{fundMetrics.totalDisbursed.toLocaleString()})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

