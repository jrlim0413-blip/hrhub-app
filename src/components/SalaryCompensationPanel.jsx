import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import {
  Banknote,
  Upload,
  FileSpreadsheet,
  ScanText,
  Sparkles,
  Database,
  Printer,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Search,
  Building2,
  Users,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  FileText,
  Clock,
  ShieldCheck,
  Send,
  AlertTriangle,
  Scale,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Copy
} from "lucide-react";
import { COMPANIES, CORPORATE_GROUP_EMBLEM } from "./MemoGeneratorPanel";
import {
  PAYROLL_FIELD_DEFS,
  recalculateCompensationRow,
  isEmptyCompensationRow,
  detectPayrollHeaderRow,
  autoMapColumns,
  buildCompensationRecordsFromMatrix,
  extractPayrollFooterTotals,
  reconcilePayrollTotals,
  parsePayrollUploadFile,
  aiAssistColumnMapping,
  downloadPayrollTemplateExcel,
  exportPayrollBatchToExcel
} from "../lib/payrollFileParser";
import {
  fetchPayrollBatchesFromDb,
  fetchPayrollRecordsForBatch,
  savePayrollBatchToDb,
  updatePayrollBatchRecordsInDb,
  deletePayrollBatchFromDb,
  syncPendingBatchesToRelationalTables,
  fetchCashAdvancesFromDb,
  saveCashAdvanceEntryToDb,
  deleteCashAdvanceEntryFromDb,
  syncCashAdvancesFromSavedBatches,
  computeCashAdvanceSummaries,
  fetchLeaveRecordsFromDb,
  saveLeaveRecordToDb,
  deleteLeaveRecordFromDb,
  syncPendingLeaveRecordsToRelationalTables,
  computeLeaveSummaries,
  computeBatchTotals
} from "../lib/salaryCompensationStorage";
import { supabase } from "../lib/supabase";

const LEAVE_CATEGORIES = [
  "Service Incentive Leave (SIL)",
  "Vacation Leave (VL)",
  "Sick Leave (SL)",
  "Emergency Leave",
  "Bereavement / Special Leave",
  "Maternity / Paternity Leave",
  "Solo Parent Leave",
  "Leave Without Pay"
];

function formatLeaveDays(val) {
  const num = Number(val || 0);
  if (!Number.isFinite(num)) return "0";
  return Number.isInteger(num) ? String(num) : num.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function computeInclusiveLeaveDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const s = new Date(`${startDate}T00:00:00Z`);
  const e = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 1;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

const LEAVE_TABLE_SETUP_SQL = `CREATE TABLE IF NOT EXISTS public.employee_leave_records (
    id TEXT PRIMARY KEY,
    leave_ref TEXT UNIQUE NOT NULL,
    entry_type TEXT NOT NULL DEFAULT 'leave_used' CHECK (entry_type IN ('credit_grant', 'leave_used')),
    leave_type TEXT NOT NULL DEFAULT 'Service Incentive Leave (SIL)',
    employee_id TEXT DEFAULT '',
    employee_name TEXT NOT NULL,
    position TEXT DEFAULT '',
    department TEXT DEFAULT '',
    company_id TEXT NOT NULL DEFAULT 'sgc',
    company_name TEXT NOT NULL DEFAULT '',
    days NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    credit_year INTEGER NOT NULL DEFAULT 2026,
    start_date DATE,
    end_date DATE,
    reason TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Approved' CHECK (status IN ('Approved', 'Pending', 'Cancelled')),
    created_by TEXT DEFAULT 'HR Admin',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_employee_leave_emp_name ON public.employee_leave_records (employee_name);
CREATE INDEX IF NOT EXISTS idx_employee_leave_year ON public.employee_leave_records (credit_year);
CREATE INDEX IF NOT EXISTS idx_employee_leave_created_at ON public.employee_leave_records (created_at DESC);

ALTER TABLE public.employee_leave_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on employee_leave_records" ON public.employee_leave_records;
    CREATE POLICY "Allow all on employee_leave_records" ON public.employee_leave_records FOR ALL USING (true) WITH CHECK (true);
END $$;

GRANT ALL ON TABLE public.employee_leave_records TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';`;

const CA_TABLE_SETUP_SQL = `CREATE TABLE IF NOT EXISTS public.cash_advances (
    id TEXT PRIMARY KEY,
    ca_ref TEXT UNIQUE NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'payroll_upload')),
    entry_type TEXT NOT NULL DEFAULT 'issued' CHECK (entry_type IN ('issued', 'payroll_deduction', 'repayment')),
    employee_id TEXT DEFAULT '',
    employee_name TEXT NOT NULL,
    position TEXT DEFAULT '',
    department TEXT DEFAULT '',
    company_id TEXT NOT NULL DEFAULT 'sgc',
    company_name TEXT NOT NULL DEFAULT '',
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    date_recorded DATE,
    pay_period TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Deducted', 'Settled')),
    batch_id TEXT DEFAULT '',
    batch_ref TEXT DEFAULT '',
    payroll_record_id TEXT DEFAULT '',
    payslip_ref TEXT DEFAULT '',
    created_by TEXT DEFAULT 'HR Admin',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_advances_emp_name ON public.cash_advances (employee_name);
CREATE INDEX IF NOT EXISTS idx_cash_advances_batch_id ON public.cash_advances (batch_id);
CREATE INDEX IF NOT EXISTS idx_cash_advances_created_at ON public.cash_advances (created_at DESC);

ALTER TABLE public.cash_advances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all on cash_advances" ON public.cash_advances;
    CREATE POLICY "Allow all on cash_advances" ON public.cash_advances FOR ALL USING (true) WITH CHECK (true);
END $$;

GRANT ALL ON TABLE public.cash_advances TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';`;

function DatabaseTableSetupBanner({
  title,
  tableName,
  errorMessage,
  sqlSnippet,
  syncLabel,
  isSyncing,
  onSync,
  onDismiss
}) {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const isMissingTable = /schema cache|does not exist|42P01|PGRST205/i.test(String(errorMessage || ""));

  const handleCopy = async () => {
    if (!sqlSnippet) return;
    try {
      await navigator.clipboard.writeText(sqlSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShowSql(true);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/90 px-4 py-3 text-xs text-amber-950 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              {isMissingTable
                ? `${title} — Cloud Backup Active (Dedicated Table Pending Setup)`
                : title}
            </p>
            <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
              {isMissingTable
                ? `You can already encode and save records via Cloud Backup. To also store rows in public.${tableName}, copy & run the SQL setup script in your Database SQL Editor, then click ${syncLabel}.`
                : errorMessage}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-amber-700 hover:bg-amber-200/60 cursor-pointer shrink-0"
            title="Dismiss notice"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-6">
        {sqlSnippet && (
          <>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold cursor-pointer transition"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              <span>{copied ? "SQL Script Copied!" : "Copy SQL Setup Script"}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSql((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold cursor-pointer transition"
            >
              <span>{showSql ? "Hide SQL" : "View SQL"}</span>
            </button>
          </>
        )}

        {onSync && (
          <button
            type="button"
            disabled={isSyncing}
            onClick={onSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] font-bold cursor-pointer transition"
          >
            <RefreshCw size={11} className={isSyncing ? "animate-spin" : ""} />
            <span>{isSyncing ? "Checking & Syncing..." : syncLabel}</span>
          </button>
        )}
      </div>

      {showSql && sqlSnippet && (
        <div className="pl-6">
          <pre className="p-3 rounded-xl bg-slate-900 text-emerald-300 text-[10.5px] font-mono overflow-x-auto max-h-56 leading-relaxed select-all">
            {sqlSnippet}
          </pre>
        </div>
      )}
    </div>
  );
}

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatMoney(val) {
  return currency.format(Number(val || 0));
}

function escapeHtmlTitle(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function openIsolatedPrintWindow(element, titleText, sheetSelector = ".payslip-sheet") {
  if (!element) return;
  const headStyles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
    .map((node) => node.outerHTML)
    .join("\n");

  const printWindow = window.open("", "_blank", "width=980,height=800");
  if (!printWindow) {
    window.print();
    return;
  }

  const safeTitle = escapeHtmlTitle(titleText);
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <base href="${window.location.origin}/" />
  <title>${safeTitle}</title>
  ${headStyles}
  <style>
    @page {
      size: letter portrait;
      margin: 12mm;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      background: #ffffff !important;
    }
    ${sheetSelector} {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-bottom: 14mm;
    }
  </style>
</head>
<body>
  <div class="space-y-4">
    ${element.innerHTML}
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 450);
}

function resolveCompanyEntity(companyIdOrName) {
  const query = String(companyIdOrName || "").toLowerCase().trim();
  if (!query) return COMPANIES.find((c) => c.id === "sgc") || COMPANIES[0];
  return (
    COMPANIES.find(
      (c) =>
        c.id.toLowerCase() === query ||
        c.code.toLowerCase() === query ||
        c.name.toLowerCase() === query ||
        c.legalName.toLowerCase() === query ||
        (query.includes("lucky") && c.id === "lucky_betplay") ||
        (query.includes("5a") && c.id === "5a_royal") ||
        (query.includes("glowing") && c.id === "glowing_fortune") ||
        (query.includes("imperial") && c.id === "imperial_gaming") ||
        ((query.includes("simcon") || query.includes("construction")) && c.id === "simcon") ||
        (query.includes("simpal group") && c.id === "sgc")
    ) || COMPANIES[0]
  );
}

/**
 * Reusable Official Corporate Payslip Slip Card (used in modal preview and isolated batch printing).
 */
function PayslipDocumentCard({ record, batch, company, preparedByName, compact = false }) {
  const safeComp = company || resolveCompanyEntity(record?.companyId || batch?.companyId);
  const statutoryTotal =
    Number(record?.sss || 0) +
    Number(record?.philhealth || 0) +
    Number(record?.pagibig || 0) +
    Number(record?.withholdingTax || 0);

  return (
    <div
      className={`payslip-sheet bg-white border border-slate-300 rounded-xl text-slate-900 ${
        compact ? "p-5 text-[11px]" : "p-7 text-xs"
      }`}
    >
      {/* Corporate Letterhead */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-emerald-700">
        <div className="flex items-center gap-3 min-w-0">
          {safeComp.logoUrl && (
            <img
              src={safeComp.logoUrl}
              alt={safeComp.name}
              className="w-12 h-12 object-contain shrink-0"
            />
          )}
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-black tracking-wide uppercase text-slate-900 truncate">
              {safeComp.legalName || safeComp.name}
            </h2>
            <p className="text-[10px] text-slate-600 font-medium truncate">
              {safeComp.tagline}
            </p>
            <p className="text-[9.5px] text-slate-500 truncate">
              {safeComp.address}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-right">
          <div>
            <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[10px] uppercase tracking-wider">
              OFFICIAL PAYSLIP
            </span>
            <p className="font-mono text-[10px] font-bold text-slate-600 mt-1">
              {record?.payslipRef || "PAYSLIP-PREVIEW"}
            </p>
          </div>
          <img
            src={safeComp.rightLogoUrl || CORPORATE_GROUP_EMBLEM}
            alt="Corporate Group"
            className="w-10 h-10 object-contain rounded shrink-0"
          />
        </div>
      </div>

      {/* Employee & Payroll Cutoff Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 my-3">
        <div>
          <span className="block text-[9.5px] font-bold uppercase text-slate-400">Employee Name</span>
          <span className="font-extrabold text-slate-900 text-xs">{record?.employeeName || "N/A"}</span>
        </div>
        <div>
          <span className="block text-[9.5px] font-bold uppercase text-slate-400">Employee ID / Seq</span>
          <span className="font-bold text-slate-800">
            {record?.employeeId || (record?.seqNo ? `SEQ #${record.seqNo}` : "Unassigned")}
          </span>
        </div>
        <div>
          <span className="block text-[9.5px] font-bold uppercase text-slate-400">Designation / Role</span>
          <span className="font-semibold text-slate-800">{record?.position || "Staff"}</span>
        </div>
        <div>
          <span className="block text-[9.5px] font-bold uppercase text-slate-400">Branch / Dept</span>
          <span className="font-semibold text-slate-800">
            {record?.department || batch?.branchLocation || "Operations"}
          </span>
        </div>
        <div>
          <span className="block text-[9.5px] font-bold uppercase text-slate-400">Date Covered</span>
          <span className="font-bold text-emerald-800">{record?.payPeriod || batch?.payPeriod || "Current Cutoff"}</span>
        </div>
        <div>
          <span className="block text-[9.5px] font-bold uppercase text-slate-400">Release / Pay Date</span>
          <span className="font-semibold text-slate-800">{record?.payDate || batch?.payDate || "Scheduled"}</span>
        </div>
        <div>
          <span className="block text-[9.5px] font-bold uppercase text-slate-400">Rate &amp; Days Worked</span>
          <span className="font-semibold text-slate-800">
            {Number(record?.daysWorked || 0)} day(s)
            {Number(record?.dailyRate || 0) > 0 ? ` @ ${formatMoney(record.dailyRate)}/d` : ""}
            {Number(record?.hourlyRate || 0) > 0 ? ` (${formatMoney(record.hourlyRate)}/hr)` : ""}
          </span>
          {Number(record?.monthlySalary || 0) > 0 && (
            <span className="block text-[9.5px] text-slate-500">
              Monthly Basic: {formatMoney(record.monthlySalary)}
            </span>
          )}
        </div>
        <div>
          <span className="block text-[9.5px] font-bold uppercase text-slate-400">Payment Mode</span>
          <span className="font-semibold text-slate-800">{record?.paymentMode || "Direct Payroll"}</span>
        </div>
      </div>

      {/* Earnings vs Deductions Two-Column Statement */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Earnings Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-emerald-50 border-b border-emerald-200 px-3 py-1.5 font-extrabold text-[10.5px] uppercase tracking-wider text-emerald-900">
              Earnings &amp; Additionals
            </div>
            <div className="divide-y divide-slate-100">
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">Total Basic Pay</span>
                <span className="font-semibold">{formatMoney(record?.basicPay)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">Allowance</span>
                <span className="font-semibold">{formatMoney(record?.allowance)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">Meal Allowance</span>
                <span className="font-semibold">{formatMoney(record?.mealAllowance)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">Holiday / Night Differential</span>
                <span className="font-semibold">{formatMoney(record?.holidayNightPay)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">Overtime Pay</span>
                <span className="font-semibold">{formatMoney(record?.overtimePay)}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between px-3 py-2 bg-slate-50 border-t border-slate-200 font-black text-slate-900">
            <span>TOTAL GROSS PAY</span>
            <span className="text-emerald-700">{formatMoney(record?.grossPay)}</span>
          </div>
        </div>

        {/* Deductions Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-rose-50 border-b border-rose-200 px-3 py-1.5 font-extrabold text-[10.5px] uppercase tracking-wider text-rose-900">
              Deductions &amp; Statutory Contributions
            </div>
            <div className="divide-y divide-slate-100">
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">PHIC / HDMF / SSS</span>
                <span className="font-semibold">
                  {formatMoney(
                    Number(record?.philhealth || 0) +
                      Number(record?.pagibig || 0) +
                      Number(record?.sss || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between px-3 py-1 text-[10px] text-slate-500 bg-slate-50/50">
                <span>PHIC: {formatMoney(record?.philhealth)} • HDMF: {formatMoney(record?.pagibig)}</span>
                <span>SSS: {formatMoney(record?.sss)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">Salary Advancement / CA</span>
                <span className="font-semibold">{formatMoney(record?.cashAdvance)}</span>
              </div>
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">HDMF Loan / SSS Loan</span>
                <span className="font-semibold">
                  {formatMoney(Number(record?.hdmfLoan || 0) + Number(record?.sssLoan || 0))}
                </span>
              </div>
              {(Number(record?.hdmfLoan || 0) > 0 || Number(record?.sssLoan || 0) > 0) && (
                <div className="flex justify-between px-3 py-1 text-[10px] text-slate-500 bg-slate-50/50">
                  <span>HDMF Loan: {formatMoney(record?.hdmfLoan)}</span>
                  <span>SSS Loan: {formatMoney(record?.sssLoan)}</span>
                </div>
              )}
              <div className="flex justify-between px-3 py-1.5">
                <span className="text-slate-600">Late / Undertime / W-Tax</span>
                <span className="font-semibold">
                  {formatMoney(Number(record?.otherDeductions || 0) + Number(record?.withholdingTax || 0))}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-between px-3 py-2 bg-slate-50 border-t border-slate-200 font-black text-slate-900">
            <span>TOTAL DEDUCTIONS</span>
            <span className="text-rose-700">- {formatMoney(record?.totalDeductions)}</span>
          </div>
        </div>
      </div>

      {/* Net Take-Home Pay Highlight Banner */}
      <div className="mt-3 px-4 py-2.5 rounded-lg bg-emerald-700 text-white flex items-center justify-between">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-100">
            Net Take-Home Compensation
          </span>
          <span className="text-[10px] text-emerald-100">
            Statutory Subtotal: {formatMoney(statutoryTotal)}
            {record?.remarks ? ` • Note: ${record.remarks}` : ""}
          </span>
        </div>
        <div className="text-lg md:text-xl font-black tracking-tight">
          {formatMoney(record?.netPay)}
        </div>
      </div>

      {/* Signatories & Employee Receipt */}
      <div className="grid grid-cols-3 gap-6 pt-5 mt-3 border-t border-slate-200 text-center text-[10.5px]">
        <div>
          <div className="border-b border-slate-400 pb-6 font-bold text-slate-800 uppercase">
            {preparedByName || safeComp.defaultSignatory || "HRMD DEPARTMENT"}
          </div>
          <span className="text-[9.5px] text-slate-500 mt-1 block">Prepared / Verified by HR</span>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-6 font-bold text-slate-800 uppercase">
            {safeComp.approverName || "FINANCE & DISBURSEMENT"}
          </div>
          <span className="text-[9.5px] text-slate-500 mt-1 block">Approved by Finance / Management</span>
        </div>
        <div>
          <div className="border-b border-slate-400 pb-6 font-bold text-slate-800 uppercase">
            {record?.employeeName || "EMPLOYEE SIGNATURE"}
          </div>
          <span className="text-[9.5px] text-slate-500 mt-1 block">Received by Employee / Date</span>
        </div>
      </div>
    </div>
  );
}

export default function SalaryCompensationPanel({ currentUser, profiles = [], onClose }) {
  const [subView, setSubView] = useState("upload"); // "upload" | "database"
  const fileInputRef = useRef(null);
  const printAreaRef = useRef(null);

  // Batch Metadata Form for Upload Staging
  const defaultCompany = useMemo(() => resolveCompanyEntity(currentUser?.company || "sgc"), [currentUser]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(defaultCompany.id);
  const [branchLocation, setBranchLocation] = useState("");
  const [payPeriod, setPayPeriod] = useState("November 1 - 15, 2026");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [batchTitle, setBatchTitle] = useState("");

  // Uploaded / Extracted Staging State
  const [isParsing, setIsParsing] = useState(false);
  const [isAiMapping, setIsAiMapping] = useState(false);
  const [parseError, setParseError] = useState("");
  const [parsedUpload, setParsedUpload] = useState(null);
  const [stagedRows, setStagedRows] = useState([]);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Database Saved State
  const [savedBatches, setSavedBatches] = useState([]);
  const [activeBatchId, setActiveBatchId] = useState("");
  const [activeBatchRecords, setActiveBatchRecords] = useState([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [isSyncingTables, setIsSyncingTables] = useState(false);
  const [dbSyncSource, setDbSyncSource] = useState("loading");
  const [dbErrorNotice, setDbErrorNotice] = useState("");

  // Search / Filter / Edit / Payslip / Verification Modal State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editingRowModal, setEditingRowModal] = useState(null); // { scope: "staging" | "saved", row }
  const [payslipPreviewTarget, setPayslipPreviewTarget] = useState(null); // { record, batch, mode: "single" | "batch_all", recordsList }
  const [manualControlNetPay, setManualControlNetPay] = useState("");
  const [showBreakdownCheck, setShowBreakdownCheck] = useState(false);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [acknowledgeMismatch, setAcknowledgeMismatch] = useState(false);
  const [toast, setToast] = useState(null);

  const caStatementRef = useRef(null);
  const leaveStatementRef = useRef(null);

  // Cash Advancement (CA) Ledger State
  const [caEntries, setCaEntries] = useState([]);
  const [loadingCa, setLoadingCa] = useState(false);
  const [isSavingCa, setIsSavingCa] = useState(false);
  const [isSyncingCa, setIsSyncingCa] = useState(false);
  const [caErrorNotice, setCaErrorNotice] = useState("");
  const [caEmpSearch, setCaEmpSearch] = useState("");
  const [caEmpStatusFilter, setCaEmpStatusFilter] = useState("ALL");
  const [expandedCaEmpKey, setExpandedCaEmpKey] = useState("");
  const [caStatementEmpKey, setCaStatementEmpKey] = useState("");
  const [caLedgerOpen, setCaLedgerOpen] = useState(true);
  const [caSearchQuery, setCaSearchQuery] = useState("");
  const [caSourceFilter, setCaSourceFilter] = useState("ALL");
  const [caTypeFilter, setCaTypeFilter] = useState("ALL");
  const [caEmployeeFilter, setCaEmployeeFilter] = useState("");
  const [caFormModal, setCaFormModal] = useState(null);

  // Employee Leave Records & Remaining Credits State
  const [leaveEntries, setLeaveEntries] = useState([]);
  const [loadingLeave, setLoadingLeave] = useState(false);
  const [isSavingLeave, setIsSavingLeave] = useState(false);
  const [isSyncingLeave, setIsSyncingLeave] = useState(false);
  const [leaveErrorNotice, setLeaveErrorNotice] = useState("");
  const [leaveYearFilter, setLeaveYearFilter] = useState("ALL");
  const [leaveEmpSearch, setLeaveEmpSearch] = useState("");
  const [leaveEmpStatusFilter, setLeaveEmpStatusFilter] = useState("ALL");
  const [expandedLeaveEmpKey, setExpandedLeaveEmpKey] = useState("");
  const [leaveStatementEmpKey, setLeaveStatementEmpKey] = useState("");
  const [leaveLedgerOpen, setLeaveLedgerOpen] = useState(true);
  const [leaveSearchQuery, setLeaveSearchQuery] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("ALL");
  const [leaveEntryTypeFilter, setLeaveEntryTypeFilter] = useState("ALL");
  const [leaveEmployeeFilter, setLeaveEmployeeFilter] = useState("");
  const [leaveFormModal, setLeaveFormModal] = useState(null);

  const activeCompanyObj = useMemo(() => resolveCompanyEntity(selectedCompanyId), [selectedCompanyId]);

  const activeStagedRows = useMemo(
    () => stagedRows.filter((r) => !isEmptyCompensationRow(r)),
    [stagedRows]
  );
  const emptyStagedCount = stagedRows.length - activeStagedRows.length;
  const emptySavedCount = useMemo(
    () => activeBatchRecords.filter((r) => isEmptyCompensationRow(r)).length,
    [activeBatchRecords]
  );
  const stagedPayrollCaRows = useMemo(
    () => activeStagedRows.filter((r) => Number(r.cashAdvance || 0) > 0),
    [activeStagedRows]
  );

  const reconciliation = useMemo(
    () => reconcilePayrollTotals(activeStagedRows, parsedUpload?.reportedTotals, manualControlNetPay),
    [activeStagedRows, parsedUpload, manualControlNetPay]
  );

  const caSummary = useMemo(() => computeCashAdvanceSummaries(caEntries), [caEntries]);

  const caSummaryByEmpKey = useMemo(() => {
    const map = new Map();
    (caSummary.employeeSummaries || []).forEach((emp) => {
      map.set(emp.key, emp);
    });
    return map;
  }, [caSummary]);

  const filteredCaEmployeeSummaries = useMemo(() => {
    const q = caEmpSearch.toLowerCase().trim();
    return (caSummary.employeeSummaries || []).filter((emp) => {
      if (caEmpStatusFilter === "OPEN" && emp.outstandingBalance <= 0 && emp.caStatus !== "Needs Approved CA") {
        return false;
      }
      if (caEmpStatusFilter === "SETTLED" && emp.caStatus !== "Settled") return false;
      if (caEmpStatusFilter === "NEEDS_CA" && emp.caStatus !== "Needs Approved CA") return false;
      if (!q) return true;
      return (
        (emp.employeeName || "").toLowerCase().includes(q) ||
        (emp.employeeId || "").toLowerCase().includes(q) ||
        (emp.department || "").toLowerCase().includes(q) ||
        (emp.companyName || "").toLowerCase().includes(q)
      );
    });
  }, [caSummary, caEmpSearch, caEmpStatusFilter]);

  const stagedCaImpactRows = useMemo(
    () =>
      stagedPayrollCaRows.map((row) => {
        const key = String(row.employeeName || "").trim().toUpperCase();
        const existingEmp = caSummaryByEmpKey.get(key) || null;
        const currentRemaining = existingEmp ? Number(existingEmp.outstandingBalance || 0) : 0;
        const stagedDeduction = Number(row.cashAdvance || 0);
        const projectedRemaining = Math.max(0, Math.round((currentRemaining - stagedDeduction) * 100) / 100);
        return {
          ...row,
          hasApprovedWholeCa: Boolean(existingEmp && existingEmp.issuedTotal > 0),
          approvedWholeTotal: existingEmp ? Number(existingEmp.issuedTotal || 0) : 0,
          currentRemaining,
          stagedDeduction,
          projectedRemaining
        };
      }),
    [stagedPayrollCaRows, caSummaryByEmpKey]
  );

  const caStatementEmployee = useMemo(
    () => (caStatementEmpKey ? caSummaryByEmpKey.get(caStatementEmpKey) || null : null),
    [caStatementEmpKey, caSummaryByEmpKey]
  );

  const filteredCaEntries = useMemo(() => {
    const q = caSearchQuery.toLowerCase().trim();
    const empTarget = caEmployeeFilter.toLowerCase().trim();
    return caEntries.filter((entry) => {
      if (caSourceFilter !== "ALL" && entry.sourceType !== caSourceFilter) return false;
      if (caTypeFilter !== "ALL" && entry.entryType !== caTypeFilter) return false;
      if (empTarget && (entry.employeeName || "").toLowerCase().trim() !== empTarget) return false;
      if (!q) return true;
      return (
        (entry.employeeName || "").toLowerCase().includes(q) ||
        (entry.employeeId || "").toLowerCase().includes(q) ||
        (entry.caRef || "").toLowerCase().includes(q) ||
        (entry.batchRef || "").toLowerCase().includes(q) ||
        (entry.payPeriod || "").toLowerCase().includes(q) ||
        (entry.reason || "").toLowerCase().includes(q)
      );
    });
  }, [caEntries, caSearchQuery, caSourceFilter, caTypeFilter, caEmployeeFilter]);

  const leaveSummary = useMemo(
    () => computeLeaveSummaries(leaveEntries, leaveYearFilter),
    [leaveEntries, leaveYearFilter]
  );

  const leaveSummaryByEmpKey = useMemo(() => {
    const map = new Map();
    (leaveSummary.employeeSummaries || []).forEach((emp) => {
      map.set(emp.key, emp);
    });
    return map;
  }, [leaveSummary]);

  const leaveAvailableYears = useMemo(() => {
    const yrs = new Set([new Date().getFullYear()]);
    leaveEntries.forEach((e) => {
      const y = Number(e?.creditYear || (e?.startDate ? String(e.startDate).slice(0, 4) : 0));
      if (y >= 2020 && y <= 2050) yrs.add(y);
    });
    return Array.from(yrs).sort((a, b) => b - a);
  }, [leaveEntries]);

  const filteredLeaveEmployeeSummaries = useMemo(() => {
    const q = leaveEmpSearch.toLowerCase().trim();
    return (leaveSummary.employeeSummaries || []).filter((emp) => {
      if (leaveEmpStatusFilter === "AVAILABLE" && emp.remainingDays <= 0) return false;
      if (leaveEmpStatusFilter === "EXHAUSTED" && emp.leaveStatus !== "Exhausted (0 Left)") return false;
      if (leaveEmpStatusFilter === "LOW" && emp.leaveStatus !== "Low Credits") return false;
      if (leaveEmpStatusFilter === "NEEDS_CREDITS" && emp.leaveStatus !== "Needs Leave Credits") return false;
      if (!q) return true;
      return (
        (emp.employeeName || "").toLowerCase().includes(q) ||
        (emp.employeeId || "").toLowerCase().includes(q) ||
        (emp.department || "").toLowerCase().includes(q) ||
        (emp.companyName || "").toLowerCase().includes(q)
      );
    });
  }, [leaveSummary, leaveEmpSearch, leaveEmpStatusFilter]);

  const filteredLeaveEntries = useMemo(() => {
    const q = leaveSearchQuery.toLowerCase().trim();
    const empTarget = leaveEmployeeFilter.toLowerCase().trim();
    return leaveEntries.filter((entry) => {
      if (
        leaveYearFilter !== "ALL" &&
        Number(entry.creditYear || (entry.startDate ? String(entry.startDate).slice(0, 4) : 0)) !==
          Number(leaveYearFilter)
      ) {
        return false;
      }
      if (leaveEntryTypeFilter !== "ALL" && entry.entryType !== leaveEntryTypeFilter) return false;
      if (leaveTypeFilter !== "ALL" && entry.leaveType !== leaveTypeFilter) return false;
      if (empTarget && (entry.employeeName || "").toLowerCase().trim() !== empTarget) return false;
      if (!q) return true;
      return (
        (entry.employeeName || "").toLowerCase().includes(q) ||
        (entry.employeeId || "").toLowerCase().includes(q) ||
        (entry.leaveRef || "").toLowerCase().includes(q) ||
        (entry.leaveType || "").toLowerCase().includes(q) ||
        (entry.reason || "").toLowerCase().includes(q)
      );
    });
  }, [
    leaveEntries,
    leaveYearFilter,
    leaveEntryTypeFilter,
    leaveTypeFilter,
    leaveEmployeeFilter,
    leaveSearchQuery
  ]);

  const leaveStatementEmployee = useMemo(
    () => (leaveStatementEmpKey ? leaveSummaryByEmpKey.get(leaveStatementEmpKey) || null : null),
    [leaveStatementEmpKey, leaveSummaryByEmpKey]
  );

  const employeeSuggestionDirectory = useMemo(() => {
    const map = new Map();
    const addCandidate = (item) => {
      const name = String(item?.employeeName || item?.name || "").trim();
      if (!name) return;
      const key = name.toUpperCase();
      const prev = map.get(key) || {
        employeeName: name,
        employeeId: "",
        position: "",
        department: "",
        companyId: selectedCompanyId || "sgc"
      };
      map.set(key, {
        employeeName: prev.employeeName,
        employeeId: prev.employeeId || String(item.employeeId || item.employee_id || "").trim(),
        position: prev.position || String(item.position || item.role || "").trim(),
        department: prev.department || String(item.department || item.branch || "").trim(),
        companyId: item.companyId || prev.companyId
      });
    };
    activeStagedRows.forEach(addCandidate);
    activeBatchRecords.forEach(addCandidate);
    caEntries.forEach(addCandidate);
    leaveEntries.forEach(addCandidate);
    (profiles || []).forEach(addCandidate);
    return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [activeStagedRows, activeBatchRecords, caEntries, leaveEntries, profiles, selectedCompanyId]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Profile lookup map to match uploaded payroll employees against registered directory accounts
  const profileLookup = useMemo(() => {
    const map = new Map();
    (profiles || []).forEach((p) => {
      if (p?.name) map.set(p.name.trim().toLowerCase(), p);
    });
    return map;
  }, [profiles]);

  const activeBatchIdRef = useRef(activeBatchId);
  useEffect(() => {
    activeBatchIdRef.current = activeBatchId;
  }, [activeBatchId]);

  const loadDatabaseBatches = useCallback(async (preferredBatchId = "", showSpinner = true) => {
    if (showSpinner) setLoadingDb(true);
    try {
      const res = await fetchPayrollBatchesFromDb();
      setSavedBatches(res.batches || []);
      setDbSyncSource(res.source || "supabase_tables");
      setDbErrorNotice(res.dbError || "");

      const targetId = preferredBatchId || activeBatchIdRef.current || res.batches?.[0]?.id || "";
      if (targetId) {
        activeBatchIdRef.current = targetId;
        setActiveBatchId(targetId);
        const recRes = await fetchPayrollRecordsForBatch(targetId);
        setActiveBatchRecords(recRes.records || []);
      } else {
        activeBatchIdRef.current = "";
        setActiveBatchId("");
        setActiveBatchRecords([]);
      }
    } catch (err) {
      console.warn("[SalaryCompensationPanel] Database load notice:", err);
      setDbErrorNotice(err?.message || "Failed loading saved payroll batches.");
    } finally {
      setLoadingDb(false);
    }
  }, []);

  const loadCashAdvances = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoadingCa(true);
    try {
      const res = await fetchCashAdvancesFromDb();
      setCaEntries(res.entries || []);
      setCaErrorNotice(res.dbError || "");
    } catch (err) {
      console.warn("[SalaryCompensationPanel] CA load notice:", err);
      setCaErrorNotice(err?.message || "Failed loading Cash Advancement records.");
    } finally {
      setLoadingCa(false);
    }
  }, []);

  const loadLeaveRecords = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoadingLeave(true);
    try {
      const res = await fetchLeaveRecordsFromDb();
      setLeaveEntries(res.entries || []);
      setLeaveErrorNotice(res.dbError || "");
    } catch (err) {
      console.warn("[SalaryCompensationPanel] Leave load notice:", err);
      setLeaveErrorNotice(err?.message || "Failed loading Leave Records.");
    } finally {
      setLoadingLeave(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDatabaseBatches("", false);
      loadCashAdvances(false);
      loadLeaveRecords(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadDatabaseBatches, loadCashAdvances, loadLeaveRecords]);

  // Realtime listener on payroll, CA, leave tables & backup settings store
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel("salary_comp_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payroll_batches"
        },
        () => {
          loadDatabaseBatches("", false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "salary_compensation_records"
        },
        () => {
          loadDatabaseBatches("", false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cash_advances"
        },
        () => {
          loadCashAdvances(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "employee_leave_records"
        },
        () => {
          loadLeaveRecords(false);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_settings",
          filter: "user_id=eq.salary_compensation_batches_index_v1"
        },
        () => {
          loadDatabaseBatches("", false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDatabaseBatches, loadCashAdvances, loadLeaveRecords]);

  const handleSelectSavedBatch = async (batchId) => {
    setActiveBatchId(batchId);
    setLoadingDb(true);
    try {
      const recRes = await fetchPayrollRecordsForBatch(batchId);
      setActiveBatchRecords(recRes.records || []);
    } finally {
      setLoadingDb(false);
    }
  };

  // Process uploaded Excel, CSV, Image, or PDF file
  const handleFileSelected = async (file, preferredSheet = "") => {
    if (!file) return;
    setIsParsing(true);
    setParseError("");
    setManualControlNetPay("");
    setAcknowledgeMismatch(false);

    try {
      const result = await parsePayrollUploadFile(file, preferredSheet);
      setParsedUpload(result);
      setStagedRows(result.records || []);

      if (result.detectedPayPeriod) setPayPeriod(result.detectedPayPeriod);
      if (result.detectedPayDate) setPayDate(result.detectedPayDate);
      if (result.detectedBranch) setBranchLocation(result.detectedBranch);
      if (result.detectedCompanyName) {
        const matched = resolveCompanyEntity(result.detectedCompanyName);
        if (matched?.id) setSelectedCompanyId(matched.id);
      }

      if ((result.records || []).length === 0) {
        setParseError(
          "No employee payroll rows were detected automatically. Check the worksheet selector or adjust the column mapping below."
        );
        setShowColumnMapper(true);
      } else {
        showToast(
          `Successfully extracted ${result.records.length} employee record(s) using ${result.parseEngine}.`
        );
      }
    } catch (err) {
      setParseError(err?.message || "Failed to read the uploaded payroll file.");
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Re-extract rows when switching worksheets inside an uploaded Excel workbook
  const handleSwitchExcelSheet = (sheetName) => {
    if (!parsedUpload?.sheetMatrices?.[sheetName]) return;
    const matrix = parsedUpload.sheetMatrices[sheetName];
    const merges = parsedUpload.sheetMerges?.[sheetName] || [];
    const headerInfo = detectPayrollHeaderRow(matrix, merges);
    const columnMap = autoMapColumns(headerInfo.headers);
    const branchHint = headerInfo.detectedBranch || branchLocation;
    const records = buildCompensationRecordsFromMatrix(matrix, headerInfo.headerRowIndex, columnMap, {
      defaultDepartment: branchHint
    });
    const reportedTotals = extractPayrollFooterTotals(matrix, headerInfo.headerRowIndex, columnMap);

    if (headerInfo.detectedPayPeriod) setPayPeriod(headerInfo.detectedPayPeriod);
    if (headerInfo.detectedPayDate) setPayDate(headerInfo.detectedPayDate);
    if (headerInfo.detectedBranch) setBranchLocation(headerInfo.detectedBranch);

    setParsedUpload({
      ...parsedUpload,
      activeSheetName: sheetName,
      matrix,
      headers: headerInfo.headers,
      headerRowIndex: headerInfo.headerRowIndex,
      columnMap,
      reportedTotals
    });
    setStagedRows(records);
    setAcknowledgeMismatch(false);
    showToast(`Switched to worksheet "${sheetName}" (${records.length} rows detected).`);
  };

  // Apply manual column mapping override or header row index adjustment without re-uploading
  const handleUpdateColumnMapping = (fieldKey, colIdxRaw) => {
    if (!parsedUpload?.matrix) return;
    const nextMap = { ...(parsedUpload.columnMap || {}) };
    if (colIdxRaw === "" || colIdxRaw === null || colIdxRaw === undefined) {
      delete nextMap[fieldKey];
    } else {
      nextMap[fieldKey] = Number(colIdxRaw);
    }
    const records = buildCompensationRecordsFromMatrix(
      parsedUpload.matrix,
      parsedUpload.headerRowIndex,
      nextMap,
      { defaultDepartment: branchLocation || parsedUpload.detectedBranch || "" }
    );
    const reportedTotals = extractPayrollFooterTotals(
      parsedUpload.matrix,
      parsedUpload.headerRowIndex,
      nextMap
    );
    setParsedUpload({ ...parsedUpload, columnMap: nextMap, reportedTotals });
    setStagedRows(records);
    setAcknowledgeMismatch(false);
  };

  const handleChangeHeaderRowIndex = (newIndex) => {
    if (!parsedUpload?.matrix) return;
    const safeIdx = Math.max(0, Math.min(Number(newIndex) || 0, parsedUpload.matrix.length - 1));
    const rawHeaderRow = parsedUpload.matrix[safeIdx] || [];
    const prevRow = safeIdx > 0 ? parsedUpload.matrix[safeIdx - 1] || [] : [];
    const headers = rawHeaderRow.map((cell, idx) => {
      const main = String(cell || "").trim();
      const parent = String(prevRow[idx] || "").trim();
      return main || parent || `Column ${idx + 1}`;
    });
    const columnMap = autoMapColumns(headers);
    const records = buildCompensationRecordsFromMatrix(parsedUpload.matrix, safeIdx, columnMap, {
      defaultDepartment: branchLocation || parsedUpload.detectedBranch || ""
    });
    const reportedTotals = extractPayrollFooterTotals(parsedUpload.matrix, safeIdx, columnMap);
    setParsedUpload({
      ...parsedUpload,
      headerRowIndex: safeIdx,
      headers,
      columnMap,
      reportedTotals
    });
    setStagedRows(records);
    setAcknowledgeMismatch(false);
  };

  const handleRunAiSmartRemap = async () => {
    if (!parsedUpload?.headers?.length || !parsedUpload?.matrix?.length) return;
    setIsAiMapping(true);
    try {
      const sampleRows = parsedUpload.matrix.slice(
        parsedUpload.headerRowIndex + 1,
        parsedUpload.headerRowIndex + 4
      );
      const nextMap = await aiAssistColumnMapping(parsedUpload.headers, sampleRows);
      const records = buildCompensationRecordsFromMatrix(
        parsedUpload.matrix,
        parsedUpload.headerRowIndex,
        nextMap,
        { defaultDepartment: branchLocation || parsedUpload.detectedBranch || "" }
      );
      const reportedTotals = extractPayrollFooterTotals(
        parsedUpload.matrix,
        parsedUpload.headerRowIndex,
        nextMap
      );
      setParsedUpload({ ...parsedUpload, columnMap: nextMap, reportedTotals });
      setStagedRows(records);
      setAcknowledgeMismatch(false);
      showToast("AI Smart Column Mapping applied and payroll rows refreshed.");
    } catch (err) {
      showToast(err?.message || "Could not run AI remapping right now.", "error");
    } finally {
      setIsAiMapping(false);
    }
  };

  // Inline update for staged or saved rows
  const handleInlineFieldChange = (scope, rowId, fieldKey, rawValue, componentKind = null) => {
    const setter = scope === "staging" ? setStagedRows : setActiveBatchRecords;
    setter((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const patched = {
          ...row,
          [fieldKey]: rawValue,
          ...(componentKind ? { _editedComponent: componentKind } : {})
        };
        const isDirectTotalEdit = ["grossPay", "totalDeductions", "netPay"].includes(fieldKey);
        const recomputed = recalculateCompensationRow(
          patched,
          isDirectTotalEdit ? "initial" : componentKind ? "recompute" : "initial"
        );
        return {
          ...row,
          ...recomputed
        };
      })
    );
  };

  const handleAddBlankRow = () => {
    const newRow = recalculateCompensationRow(
      {
        employeeId: `EMP-${String(stagedRows.length + 1).padStart(3, "0")}`,
        employeeName: "",
        position: "Staff",
        department: activeCompanyObj.name,
        basicPay: 0,
        paymentMode: "Direct Payroll",
        status: "Verified"
      },
      "recompute"
    );
    setStagedRows((prev) => [...prev, newRow]);
  };

  const handleRemoveEmptyRows = async (scope = "staging") => {
    if (scope === "staging") {
      const removedCount = stagedRows.length - activeStagedRows.length;
      if (removedCount === 0) {
        showToast("No empty or zero-pay employee rows found in staging.");
        return;
      }
      setStagedRows(activeStagedRows);
      showToast(`Removed ${removedCount} empty / zero-pay employee row(s) from staging.`);
      return;
    }

    const cleaned = activeBatchRecords.filter((r) => !isEmptyCompensationRow(r));
    const removedCount = activeBatchRecords.length - cleaned.length;
    if (removedCount === 0) {
      showToast("No empty or zero-pay employee rows found in this saved batch.");
      return;
    }
    setActiveBatchRecords(cleaned);
    if (activeBatchId) {
      const res = await updatePayrollBatchRecordsInDb(activeBatchId, cleaned);
      setSavedBatches(res.batches || []);
      await loadCashAdvances(false);
    }
    showToast(`Removed ${removedCount} empty / zero-pay employee row(s) from database.`);
  };

  const handleDeleteRow = async (scope, rowId) => {
    if (scope === "staging") {
      setStagedRows((prev) => prev.filter((r) => r.id !== rowId));
      return;
    }
    const nextRecords = activeBatchRecords.filter((r) => r.id !== rowId);
    setActiveBatchRecords(nextRecords);
    if (activeBatchId) {
      const res = await updatePayrollBatchRecordsInDb(activeBatchId, nextRecords);
      setSavedBatches(res.batches || []);
      await loadCashAdvances(false);
      showToast("Record removed and saved batch totals updated in database.");
    }
  };

  // Commit Full Row Edit Modal
  const handleSaveEditedRowModal = async (e) => {
    e.preventDefault();
    if (!editingRowModal?.row) return;
    const { scope, row } = editingRowModal;
    const cleanRow = recalculateCompensationRow(
      { ...row, _editedComponent: "earning" },
      editingRowModal.recalcFromComponents ? "recompute" : "initial"
    );

    if (scope === "staging") {
      setStagedRows((prev) => prev.map((r) => (r.id === cleanRow.id ? cleanRow : r)));
      setEditingRowModal(null);
      showToast("Staged employee compensation updated.");
      return;
    }

    const nextRecords = activeBatchRecords.map((r) =>
      r.id === cleanRow.id ? { ...r, ...cleanRow } : r
    );
    setActiveBatchRecords(nextRecords);
    setEditingRowModal(null);

    if (activeBatchId) {
      const res = await updatePayrollBatchRecordsInDb(activeBatchId, nextRecords);
      setSavedBatches(res.batches || []);
      await loadCashAdvances(false);
      showToast(
        res.syncedToSupabase
          ? "Saved compensation record updated in database."
          : "Record updated locally."
      );
    }
  };

  // Open Pre-Save Confirmation & Excel Reconciliation Modal before committing
  const handleRequestSaveConfirmation = () => {
    if (activeStagedRows.length === 0) {
      showToast("Add or extract at least one employee row with payroll amounts before saving.", "error");
      return;
    }
    setAcknowledgeMismatch(false);
    setShowSaveConfirmModal(true);
  };

  // Save Extracted Data to Database
  const handleCommitStagedToDatabase = async () => {
    const validRows = activeStagedRows;
    if (validRows.length === 0) {
      showToast("Add or extract at least one employee row with payroll amounts before saving.", "error");
      return;
    }

    setIsSavingToDb(true);
    try {
      const res = await savePayrollBatchToDb({
        batchMeta: {
          title:
            batchTitle.trim() ||
            `${activeCompanyObj.name} — ${payPeriod || "Payroll Cutoff"}`,
          companyId: activeCompanyObj.id,
          companyCode: activeCompanyObj.code,
          companyName: activeCompanyObj.name,
          branchLocation: branchLocation.trim(),
          payPeriod: payPeriod.trim() || "Current Payroll Cutoff",
          payDate,
          sourceFileName: parsedUpload?.fileName || "Manual / Excel Entry",
          parseEngine: parsedUpload?.parseEngine || "Manual Payroll Entry",
          status: "Verified"
        },
        records: validRows,
        currentUser
      });

      activeBatchIdRef.current = res.batch.id;
      setSavedBatches(res.batches || []);
      setActiveBatchId(res.batch.id);
      setActiveBatchRecords(res.records || []);
      setDbSyncSource(
        res.relationalSynced
          ? "supabase_tables"
          : res.settingsSynced
          ? "supabase_settings"
          : "localStorage"
      );
      setDbErrorNotice(res.relationalSynced ? "" : res.relationalError || res.dbError || "");
      setShowSaveConfirmModal(false);
      setAcknowledgeMismatch(false);
      setSubView("database");
      await loadCashAdvances(false);

      if (res.relationalSynced) {
        showToast(
          `Saved ${res.records.length} employee compensation record(s) to database (${res.batch.batchRef}).`
        );
      } else if (res.settingsSynced) {
        showToast(
          `Saved to cloud backup (${res.batch.batchRef}), but database tables need setup: ${res.relationalError || "check SQL schema"}`,
          "error"
        );
      } else {
        showToast(
          `Saved ${res.records.length} record(s) locally only. Database sync failed: ${res.dbError || "check SQL tables & policies"}`,
          "error"
        );
      }
    } catch (err) {
      showToast(err?.message || "Failed to commit payroll records to database.", "error");
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleSyncPendingToDatabaseTables = async () => {
    setIsSyncingTables(true);
    try {
      const res = await syncPendingBatchesToRelationalTables();
      setSavedBatches(res.batches || []);
      setDbErrorNotice(res.error || "");
      await loadCashAdvances(false);
      if (res.relationalAvailable && res.failedCount === 0) {
        setDbSyncSource("supabase_tables");
        showToast(
          res.syncedCount > 0
            ? `Synced ${res.syncedCount} batch(es) into database tables (payroll_batches & salary_compensation_records).`
            : "All saved payroll batches are already synced to database tables."
        );
      } else {
        showToast(
          res.error || "Could not sync to database tables. Run the database schema SQL first.",
          "error"
        );
      }
    } catch (err) {
      showToast(err?.message || "Sync to database tables failed.", "error");
    } finally {
      setIsSyncingTables(false);
    }
  };

  const handleOpenNewCaModal = (prefill = {}) => {
    const matchedComp = resolveCompanyEntity(prefill.companyId || selectedCompanyId);
    const entryType = prefill.entryType || "issued";
    setCaFormModal({
      id: prefill.id || "",
      caRef: prefill.caRef || "",
      sourceType: prefill.sourceType || "manual",
      entryType,
      employeeName: prefill.employeeName || "",
      employeeId: prefill.employeeId || "",
      position: prefill.position || "",
      department: prefill.department || branchLocation || "",
      companyId: matchedComp.id,
      companyName: matchedComp.name,
      amount: prefill.amount !== undefined ? String(prefill.amount) : "",
      dateRecorded: prefill.dateRecorded || new Date().toISOString().split("T")[0],
      payPeriod: prefill.payPeriod || payPeriod || "",
      reason: prefill.reason || "",
      status:
        prefill.status ||
        (entryType === "payroll_deduction" ? "Deducted" : entryType === "repayment" ? "Settled" : "Active"),
      batchId: prefill.batchId || "",
      batchRef: prefill.batchRef || "",
      payrollRecordId: prefill.payrollRecordId || "",
      payslipRef: prefill.payslipRef || ""
    });
  };

  const handleSaveCaForm = async (e) => {
    e.preventDefault();
    if (!caFormModal) return;
    if (!String(caFormModal.employeeName || "").trim()) {
      showToast("Please enter or select an employee name.", "error");
      return;
    }
    const numAmount = Number(caFormModal.amount || 0);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      showToast("Cash Advancement amount must be greater than 0.", "error");
      return;
    }

    setIsSavingCa(true);
    try {
      const compObj = resolveCompanyEntity(caFormModal.companyId || selectedCompanyId);
      const res = await saveCashAdvanceEntryToDb(
        {
          ...caFormModal,
          companyId: compObj.id,
          companyName: compObj.name,
          amount: numAmount
        },
        currentUser
      );
      setCaEntries(res.entries || []);
      setCaErrorNotice(res.relationalSynced ? "" : res.relationalError || "");
      setCaFormModal(null);
      showToast(
        res.relationalSynced
          ? `Saved Cash Advancement (${res.entry.caRef}) to database.`
          : `Saved Cash Advancement (${res.entry.caRef}) to backup cloud/local store.`
      );
    } catch (err) {
      showToast(err?.message || "Failed saving Cash Advancement entry.", "error");
    } finally {
      setIsSavingCa(false);
    }
  };

  const handleToggleCaStatus = async (entry) => {
    const nextStatus = entry.status === "Settled" ? "Active" : "Settled";
    const res = await saveCashAdvanceEntryToDb({ ...entry, status: nextStatus }, currentUser);
    setCaEntries(res.entries || []);
    showToast(`Marked ${entry.caRef} as ${nextStatus}.`);
  };

  const handleDeleteCaEntry = async (entry) => {
    if (!window.confirm(`Remove Cash Advancement entry ${entry.caRef} (${entry.employeeName})?`)) {
      return;
    }
    const res = await deleteCashAdvanceEntryFromDb(entry.id);
    setCaEntries(res.entries || []);
    showToast("Cash Advancement entry removed.");
  };

  const handleSyncCaFromPayrolls = async () => {
    setIsSyncingCa(true);
    try {
      const res = await syncCashAdvancesFromSavedBatches(currentUser);
      setCaEntries(res.entries || []);
      setCaErrorNotice(res.dbError || "");
      showToast(
        `Synced Cash Advancement ledger (${res.entries?.length || 0} total entries across saved payrolls).`
      );
    } catch (err) {
      showToast(err?.message || "Failed syncing Cash Advancements from payroll batches.", "error");
    } finally {
      setIsSyncingCa(false);
    }
  };

  const handleOpenNewLeaveModal = (prefill = {}) => {
    const matchedComp = resolveCompanyEntity(prefill.companyId || selectedCompanyId);
    const today = new Date().toISOString().split("T")[0];
    const entryType = prefill.entryType || "leave_used";
    const startDate = prefill.startDate || today;
    const endDate = prefill.endDate || startDate;
    setLeaveFormModal({
      id: prefill.id || "",
      leaveRef: prefill.leaveRef || "",
      entryType,
      leaveType: prefill.leaveType || LEAVE_CATEGORIES[0],
      employeeName: prefill.employeeName || "",
      employeeId: prefill.employeeId || "",
      position: prefill.position || "",
      department: prefill.department || branchLocation || "",
      companyId: matchedComp.id,
      companyName: matchedComp.name,
      days:
        prefill.days !== undefined
          ? String(prefill.days)
          : entryType === "credit_grant"
          ? "5"
          : String(computeInclusiveLeaveDays(startDate, endDate)),
      creditYear: Number(prefill.creditYear || new Date(startDate).getFullYear() || new Date().getFullYear()),
      startDate,
      endDate,
      reason: prefill.reason || "",
      status: prefill.status || "Approved"
    });
  };

  const handleSaveLeaveForm = async (e) => {
    e.preventDefault();
    if (!leaveFormModal) return;
    if (!String(leaveFormModal.employeeName || "").trim()) {
      showToast("Please enter or select an employee name.", "error");
      return;
    }
    const numDays = Number(leaveFormModal.days || 0);
    if (!Number.isFinite(numDays) || numDays <= 0) {
      showToast("Leave days / credits must be greater than 0.", "error");
      return;
    }

    setIsSavingLeave(true);
    try {
      const compObj = resolveCompanyEntity(leaveFormModal.companyId || selectedCompanyId);
      const res = await saveLeaveRecordToDb(
        {
          ...leaveFormModal,
          companyId: compObj.id,
          companyName: compObj.name,
          days: numDays
        },
        currentUser
      );
      setLeaveEntries(res.entries || []);
      setLeaveErrorNotice(res.relationalSynced ? "" : res.relationalError || "");
      setLeaveFormModal(null);
      showToast(
        res.relationalSynced
          ? `Saved Leave Record (${res.entry.leaveRef}) to database.`
          : `Saved Leave Record (${res.entry.leaveRef}) to cloud/local backup.`
      );
    } catch (err) {
      showToast(err?.message || "Failed saving Leave Record.", "error");
    } finally {
      setIsSavingLeave(false);
    }
  };

  const handleCycleLeaveStatus = async (entry) => {
    const nextStatus =
      entry.status === "Approved"
        ? "Pending"
        : entry.status === "Pending"
        ? "Cancelled"
        : "Approved";
    const res = await saveLeaveRecordToDb({ ...entry, status: nextStatus }, currentUser);
    setLeaveEntries(res.entries || []);
    showToast(`Marked leave record ${entry.leaveRef} as ${nextStatus}.`);
  };

  const handleDeleteLeaveEntry = async (entry) => {
    if (!window.confirm(`Delete leave record ${entry.leaveRef} (${entry.employeeName})?`)) {
      return;
    }
    const res = await deleteLeaveRecordFromDb(entry.id);
    setLeaveEntries(res.entries || []);
    showToast("Leave record removed.");
  };

  const handleSyncLeaveToDatabase = async () => {
    setIsSyncingLeave(true);
    try {
      const res = await syncPendingLeaveRecordsToRelationalTables();
      setLeaveEntries(res.entries || []);
      setLeaveErrorNotice(res.dbError || "");
      showToast(
        res.dbError
          ? `Leave sync notice: ${res.dbError}`
          : `Synced Leave Records (${res.entries?.length || 0} total entries).`
      );
    } catch (err) {
      showToast(err?.message || "Failed syncing Leave Records.", "error");
    } finally {
      setIsSyncingLeave(false);
    }
  };

  const handleToggleRecordReleased = async (recordId) => {
    if (!activeBatchId) return;
    const nextRecords = activeBatchRecords.map((r) =>
      r.id === recordId
        ? { ...r, status: r.status === "Released" ? "Verified" : "Released" }
        : r
    );
    setActiveBatchRecords(nextRecords);
    const res = await updatePayrollBatchRecordsInDb(activeBatchId, nextRecords);
    setSavedBatches(res.batches || []);
    showToast("Payslip release status updated in database.");
  };

  const handleReleaseAllPayslips = async () => {
    if (!activeBatchId || activeBatchRecords.length === 0) return;
    const nextRecords = activeBatchRecords.map((r) => ({ ...r, status: "Released" }));
    setActiveBatchRecords(nextRecords);
    const res = await updatePayrollBatchRecordsInDb(activeBatchId, nextRecords, {
      status: "Released"
    });
    setSavedBatches(res.batches || []);
    showToast(`Marked all ${nextRecords.length} payslips as Released in database.`);
  };

  const handleDeleteSavedBatch = async (batchId) => {
    if (!window.confirm("Delete this saved payroll batch and all its payslip records from the database?")) {
      return;
    }
    const res = await deletePayrollBatchFromDb(batchId);
    const remaining = res.batches || [];
    setSavedBatches(remaining);
    if (activeBatchId === batchId) {
      const nextId = remaining[0]?.id || "";
      activeBatchIdRef.current = nextId;
      setActiveBatchId(nextId);
      if (nextId) {
        const recRes = await fetchPayrollRecordsForBatch(nextId);
        setActiveBatchRecords(recRes.records || []);
      } else {
        setActiveBatchRecords([]);
      }
    }
    await loadCashAdvances(false);
    showToast("Payroll batch deleted from database.");
  };

  // Active batch summary & KPI calculations
  const activeSavedBatch = useMemo(
    () => savedBatches.find((b) => b.id === activeBatchId) || null,
    [savedBatches, activeBatchId]
  );

  const stagedTotals = useMemo(() => computeBatchTotals(activeStagedRows), [activeStagedRows]);
  const savedTotals = useMemo(() => computeBatchTotals(activeBatchRecords), [activeBatchRecords]);

  const filteredSavedRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return activeBatchRecords.filter((r) => {
      const matchesStatus = statusFilter === "ALL" || (r.status || "Verified") === statusFilter;
      const matchesQuery =
        !q ||
        (r.employeeName || "").toLowerCase().includes(q) ||
        (r.employeeId || "").toLowerCase().includes(q) ||
        (r.position || "").toLowerCase().includes(q) ||
        (r.department || "").toLowerCase().includes(q) ||
        (r.payslipRef || "").toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [activeBatchRecords, searchQuery, statusFilter]);

  // Isolated Print Engine (matches DocumentStudioPanel crisp popup printing without capturing sidebar/chrome)
  const handlePrintPayslipModal = () => {
    const titleText =
      payslipPreviewTarget?.mode === "batch_all"
        ? `${activeSavedBatch?.batchRef || "Payroll"} - All Official Payslips`
        : `${payslipPreviewTarget?.record?.payslipRef || "Payslip"} - ${payslipPreviewTarget?.record?.employeeName || "Employee"}`;
    openIsolatedPrintWindow(printAreaRef.current, titleText, ".payslip-sheet");
  };

  const handlePrintCaStatement = () => {
    const titleText = `${caStatementEmployee?.employeeName || "Employee"} - Cash Advancement Statement`;
    openIsolatedPrintWindow(caStatementRef.current, titleText, ".ca-statement-sheet");
  };

  const handlePrintLeaveStatement = () => {
    const titleText = `${leaveStatementEmployee?.employeeName || "Employee"} - Leave Credits Statement`;
    openIsolatedPrintWindow(leaveStatementRef.current, titleText, ".leave-statement-sheet");
  };

  const displayTotals = subView === "upload" ? stagedTotals : savedTotals;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === "error"
              ? "bg-rose-900 text-white border-rose-700"
              : "bg-slate-900 text-white border-slate-700"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={15} className="text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.ods,.png,.jpg,.jpeg,.webp,.pdf"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
        className="hidden"
      />

      {/* ================= 1. TOP WORKSPACE HEADER ================= */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-[#0d1b2a] to-emerald-950 text-white p-6 shadow-md border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Banknote size={11} />
                HR Admin Payroll Suite
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200 border border-white/10">
                <Database size={10} className="text-emerald-400" />
                {dbSyncSource === "supabase_tables" || dbSyncSource === "supabase"
                  ? "Database Tables Synced"
                  : dbSyncSource === "supabase_settings"
                  ? "Cloud Backup Synced"
                  : "Local Cache Mode"}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Salary &amp; Compensation w/ Payslip
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Upload Excel spreadsheets (.xlsx, .xls, .csv) or scanned Payroll Images/PDFs via OCR, verify &amp; edit extracted compensation figures, save directly to the database, and issue printable corporate Payslips.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => downloadPayrollTemplateExcel(activeCompanyObj.name)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition cursor-pointer"
            >
              <Download size={14} />
              <span>Download Excel Template</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubView("upload");
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-sm transition cursor-pointer"
            >
              <Upload size={14} />
              <span>Upload Excel / OCR File</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 transition cursor-pointer"
                title="Close Tab"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* 4 Executive KPI Summary Cards */}
        {subView === "cash_advance" ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <span>CA Personnel</span>
                <Users size={13} className="text-sky-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">
                {caSummary.employeeSummaries.length}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                {caSummary.settledCount || 0} settled • {caSummary.activeCount || 0} with open balance
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <span>Approved CA (Whole)</span>
                <ArrowUpRight size={13} className="text-amber-400" />
              </div>
              <div className="text-lg md:text-xl font-black text-amber-300 mt-1">
                {formatMoney(caSummary.totalIssued)}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">
                Total approved principal CA granted
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <span>Deducted via Payroll</span>
                <ArrowDownLeft size={13} className="text-emerald-400" />
              </div>
              <div className="text-lg md:text-xl font-black text-emerald-300 mt-1">
                {formatMoney(caSummary.totalPayrollDeducted)}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                {caSummary.overallRecoveryRatePct || 0}% recovered • Direct paid: {formatMoney(caSummary.totalRepaid)}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-emerald-200">
                <span>Net Remaining Balance</span>
                <Wallet size={13} className="text-emerald-300" />
              </div>
              <div className="text-lg md:text-xl font-black text-white mt-1">
                {formatMoney(caSummary.netOutstandingBalance)}
              </div>
              <div className="text-[10.5px] text-emerald-200/80 mt-0.5">
                {caSummary.unlinkedCount > 0
                  ? `${caSummary.unlinkedCount} employee(s) need whole CA logged`
                  : `Approved Whole − Deductions`}
              </div>
            </div>
          </div>
        ) : subView === "leave_records" ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <span>Tracked Personnel</span>
                <Users size={13} className="text-sky-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">
                {leaveSummary.totalEmployees}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                {leaveSummary.exhaustedCount} exhausted • {leaveSummary.lowCount} low credits
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <span>Total Leave Credits</span>
                <Calendar size={13} className="text-emerald-400" />
              </div>
              <div className="text-lg md:text-xl font-black text-emerald-300 mt-1">
                {formatLeaveDays(leaveSummary.totalCreditsAllocated)} Day(s)
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">
                Allocated leave entitlement credits
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <span>Approved Leaves Used</span>
                <Clock size={13} className="text-amber-400" />
              </div>
              <div className="text-lg md:text-xl font-black text-amber-300 mt-1">
                {formatLeaveDays(leaveSummary.totalDaysUsed)} Day(s)
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                Pending requests: {formatLeaveDays(leaveSummary.totalPendingDays)} day(s)
              </div>
            </div>

            <div className="rounded-xl bg-indigo-500/20 border border-indigo-400/35 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-indigo-200">
                <span>Remaining Leaves</span>
                <ShieldCheck size={13} className="text-indigo-300" />
              </div>
              <div className="text-lg md:text-xl font-black text-white mt-1">
                {formatLeaveDays(leaveSummary.netRemainingDays)} Day(s)
              </div>
              <div className="text-[10.5px] text-indigo-200/80 mt-0.5">
                {leaveSummary.needsCreditsCount > 0
                  ? `${leaveSummary.needsCreditsCount} employee(s) need credits set`
                  : "Available remaining leave days"}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <span>{subView === "upload" ? "Staged Cutoff" : "Saved Batches"}</span>
                <Clock size={13} className="text-emerald-400" />
              </div>
              <div className="text-sm md:text-base font-black text-white mt-1 truncate">
                {subView === "upload" ? payPeriod : `${savedBatches.length} Payroll Batch(es)`}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                {subView === "upload"
                  ? activeCompanyObj.name
                  : activeSavedBatch?.batchRef || "No saved batch selected"}
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <span>Employees Count</span>
                <Users size={13} className="text-sky-400" />
              </div>
              <div className="text-xl font-black text-white mt-1">{displayTotals.rowCount}</div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">
                {subView === "upload" ? "Active rows ready to save" : "Persisted in database"}
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                <span>Total Gross Pay</span>
                <FileSpreadsheet size={13} className="text-amber-400" />
              </div>
              <div className="text-lg md:text-xl font-black text-amber-300 mt-1">
                {formatMoney(displayTotals.totalGrossPay)}
              </div>
              <div className="text-[10.5px] text-slate-400 mt-0.5">
                Deductions: {formatMoney(displayTotals.totalDeductions)}
              </div>
            </div>

            <div className="rounded-xl bg-emerald-500/15 border border-emerald-400/30 p-3.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-emerald-200">
                <span>Total Net Take-Home</span>
                <Banknote size={13} className="text-emerald-300" />
              </div>
              <div className="text-lg md:text-xl font-black text-emerald-300 mt-1">
                {formatMoney(displayTotals.totalNetPay)}
              </div>
              <div className="text-[10.5px] text-emerald-200/80 mt-0.5">
                Payable across all personnel
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= 2. SUB-VIEW SWITCHER TABS ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubView("upload")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subView === "upload"
                ? "bg-[#008559] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Upload size={14} />
            <span>Upload &amp; OCR Reader</span>
            {activeStagedRows.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  subView === "upload" ? "bg-white text-[#008559]" : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {activeStagedRows.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSubView("database")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subView === "database"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Database size={14} />
            <span>Saved Database &amp; Payslips</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                subView === "database" ? "bg-emerald-500 text-slate-950" : "bg-slate-200 text-slate-700"
              }`}
            >
              {savedBatches.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubView("cash_advance")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subView === "cash_advance"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Wallet size={14} />
            <span>Cash Advancement (CA)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                subView === "cash_advance" ? "bg-white text-amber-700" : "bg-amber-100 text-amber-800"
              }`}
            >
              {caEntries.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSubView("leave_records")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              subView === "leave_records"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Calendar size={14} />
            <span>Leave Records</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                subView === "leave_records" ? "bg-white text-indigo-700" : "bg-indigo-100 text-indigo-800"
              }`}
            >
              {leaveSummary.totalEmployees}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-[11px] text-slate-500 font-medium">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>Supports .xlsx, .xls, .csv &amp; Scanned Image/PDF OCR</span>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: UPLOAD EXCEL / OCR READER & STAGING REVIEW                     */}
      {/* ===================================================================== */}
      {subView === "upload" && (
        <div className="space-y-5">
          {/* Batch Settings & Dropzone Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer?.files?.[0];
                if (file) handleFileSelected(file);
              }}
              onClick={() => !isParsing && fileInputRef.current?.click()}
              className={`lg:col-span-7 rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition cursor-pointer min-h-[210px] ${
                isDragOver
                  ? "border-emerald-500 bg-emerald-50/80"
                  : "border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/20"
              }`}
            >
              {isParsing ? (
                <div className="space-y-3 py-4">
                  <RefreshCw size={32} className="mx-auto text-emerald-600 animate-spin" />
                  <p className="text-sm font-extrabold text-slate-800">
                    Reading Payroll File &amp; Extracting Compensation Rows...
                  </p>
                  <p className="text-xs text-slate-500">
                    Detecting columns, statutory deductions, and net pay figures
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mb-3">
                    <FileSpreadsheet size={24} />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Drop your Payroll Excel File or Scanned Image/PDF here
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
                    Reads <strong className="text-slate-700">.xlsx, .xls, .csv</strong> worksheets automatically with header detection, or extracts tables via <strong className="text-slate-700">AI Vision OCR</strong> from screenshots, photos, and PDFs.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold">
                      <Upload size={13} />
                      <span>Browse File</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                      <ScanText size={12} />
                      OCR + Smart Auto-Map
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Batch Config Inputs */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-600" />
                  Payroll Batch Metadata
                </h3>
                {parsedUpload && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {parsedUpload.parseEngine}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Company Entity
                  </label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => setSelectedCompanyId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50/70 focus:outline-none focus:border-emerald-500"
                  >
                    {COMPANIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Branch / City Location
                  </label>
                  <input
                    type="text"
                    value={branchLocation}
                    onChange={(e) => setBranchLocation(e.target.value)}
                    placeholder="e.g. Mandaue City"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Date Covered / Pay Period
                  </label>
                  <input
                    type="text"
                    value={payPeriod}
                    onChange={(e) => setPayPeriod(e.target.value)}
                    placeholder="e.g. October 11-25, 2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Release / Pay Date
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Batch Label (Optional)
                </label>
                <input
                  type="text"
                  value={batchTitle}
                  onChange={(e) => setBatchTitle(e.target.value)}
                  placeholder={`${activeCompanyObj.name} — ${payPeriod}`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {parsedUpload?.sheetNames?.length > 1 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Excel Worksheet Tab
                  </label>
                  <select
                    value={parsedUpload.activeSheetName}
                    onChange={(e) => handleSwitchExcelSheet(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-amber-50/50 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {parsedUpload.sheetNames.map((s) => (
                      <option key={s} value={s}>
                        Worksheet: {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {parseError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 flex items-center gap-2 font-semibold">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Extracted Source Info & Column Mapper Controls */}
          {parsedUpload && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs">
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <FileText size={15} />
                  </span>
                  <div>
                    <p className="font-extrabold text-slate-900">
                      Source: {parsedUpload.fileName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {parsedUpload.ocrSummary}
                    </p>
                  </div>
                </div>

                {!parsedUpload.isOcr && parsedUpload.headers?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRunAiSmartRemap}
                      disabled={isAiMapping}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles size={13} className={isAiMapping ? "animate-spin" : ""} />
                      <span>{isAiMapping ? "AI Mapping..." : "AI Smart Column Map"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowColumnMapper(!showColumnMapper)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      <Sliders size={13} />
                      <span>Adjust Column Mapping</span>
                      {showColumnMapper ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                )}
              </div>

              {showColumnMapper && !parsedUpload.isOcr && parsedUpload.matrix?.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700">Header Row Number (1-based):</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, parsedUpload.matrix.length)}
                      value={(parsedUpload.headerRowIndex || 0) + 1}
                      onChange={(e) => handleChangeHeaderRowIndex(Number(e.target.value) - 1)}
                      className="w-20 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-bold bg-white"
                    />
                    <span className="text-[11px] text-slate-500">
                      Adjust if your Excel title banner pushed column headers lower.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                    {PAYROLL_FIELD_DEFS.map((field) => (
                      <div key={field.key} className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 truncate">
                          {field.label} {field.required ? "*" : ""}
                        </label>
                        <select
                          value={
                            parsedUpload.columnMap?.[field.key] !== undefined
                              ? parsedUpload.columnMap[field.key]
                              : ""
                          }
                          onChange={(e) => handleUpdateColumnMapping(field.key, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold"
                        >
                          <option value="">-- Not Mapped --</option>
                          {parsedUpload.headers.map((hdr, idx) => (
                            <option key={`${idx}-${hdr}`} value={idx}>
                              Col {idx + 1}: {hdr}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Total Amount Checking & Excel Coincide Reconciliation */}
          {stagedRows.length > 0 && (
            <div
              className={`rounded-2xl border p-4 shadow-2xs space-y-3 ${
                reconciliation.status === "MISMATCH"
                  ? "bg-rose-50/60 border-rose-300"
                  : reconciliation.status === "COINCIDES" || reconciliation.status === "ROUNDING_DIFF"
                  ? "bg-emerald-50/50 border-emerald-300"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl border shrink-0 ${
                      reconciliation.status === "MISMATCH"
                        ? "bg-rose-100 border-rose-300 text-rose-700"
                        : reconciliation.status === "COINCIDES" || reconciliation.status === "ROUNDING_DIFF"
                        ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                        : "bg-white border-slate-300 text-slate-700"
                    }`}
                  >
                    {reconciliation.status === "MISMATCH" ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <Scale size={18} />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Total Amount Verification (Excel File Coincide Check)
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          reconciliation.status === "COINCIDES"
                            ? "bg-emerald-600 text-white border-emerald-700"
                            : reconciliation.status === "ROUNDING_DIFF"
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : reconciliation.status === "MISMATCH"
                            ? "bg-rose-600 text-white border-rose-700"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}
                      >
                        {reconciliation.status === "COINCIDES"
                          ? "COINCIDES WITH EXCEL FILE"
                          : reconciliation.status === "ROUNDING_DIFF"
                          ? "MATCHED (CENTAVO ROUNDING)"
                          : reconciliation.status === "MISMATCH"
                          ? "VARIANCE / MISMATCH DETECTED"
                          : "NO FOOTER TOTAL IN FILE"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {reconciliation.hasExcelFooter
                        ? `Compared extracted sums (${stagedRows.length} employees) against Excel footer "${reconciliation.footerLabel}"${reconciliation.footerRowNumber ? ` (Row ${reconciliation.footerRowNumber})` : ""}.`
                        : "No summary TOTAL row was found in the uploaded file. Review extracted totals or enter a Control Net Total to verify."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                    <span className="text-[10.5px] font-bold text-slate-500 whitespace-nowrap">
                      Control Net Total (Optional):
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={manualControlNetPay}
                      onChange={(e) => setManualControlNetPay(e.target.value)}
                      placeholder={
                        reconciliation.hasExcelFooter
                          ? String(reconciliation.primaryChecks.find((c) => c.key === "netPay")?.expected ?? "")
                          : "e.g. 125018.38"
                      }
                      className="w-32 px-2 py-0.5 rounded-lg border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {reconciliation.componentChecks.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBreakdownCheck(!showBreakdownCheck)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                    >
                      <span>{showBreakdownCheck ? "Hide Column Checks" : "Column-by-Column Check"}</span>
                      {showBreakdownCheck ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {reconciliation.primaryChecks.map((chk) => (
                  <div key={chk.key} className="bg-white border border-slate-200 rounded-xl p-2.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 truncate">
                        {chk.label}
                      </span>
                      {chk.hasExpected && (
                        <span
                          className={`text-[9.5px] font-black px-1.5 py-0.2 rounded ${
                            chk.isMismatch
                              ? "bg-rose-100 text-rose-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {chk.isExact
                            ? "MATCH"
                            : chk.isWithinRounding
                            ? `~${chk.diff >= 0 ? "+" : ""}${formatMoney(chk.diff)}`
                            : `${chk.diff >= 0 ? "+" : ""}${formatMoney(chk.diff)}`}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-black text-slate-900 mt-1">
                      {formatMoney(chk.extracted)}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {chk.hasExpected ? `File/Control: ${formatMoney(chk.expected)}` : "No reference total"}
                    </div>
                  </div>
                ))}
              </div>

              {showBreakdownCheck && reconciliation.componentChecks.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {reconciliation.componentChecks.map((cc) => (
                    <div key={cc.key} className="bg-white/90 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10.5px]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-600 truncate">{cc.label}</span>
                        <span className={cc.isMismatch ? "text-rose-600 font-black" : "text-emerald-600 font-bold"}>
                          {cc.isMismatch ? "DIFF" : "OK"}
                        </span>
                      </div>
                      <div className="font-extrabold text-slate-900">{formatMoney(cc.extracted)}</div>
                      <div className="text-[9.5px] text-slate-400">Excel: {formatMoney(cc.expected)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Extracted Data Review Table & Save to Database Action */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Extracted Data Staging Table ({activeStagedRows.length} Active Employee
                  {activeStagedRows.length === 1 ? "" : "s"}
                  {emptyStagedCount > 0 ? ` • ${emptyStagedCount} empty row(s)` : ""})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Review or edit extracted numbers inline, check totals above, then confirm before saving to the database.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {emptyStagedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEmptyRows("staging")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Remove Empty Rows ({emptyStagedCount})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleAddBlankRow}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add Employee Row</span>
                </button>

                <button
                  type="button"
                  disabled={activeStagedRows.length === 0 || isSavingToDb}
                  onClick={handleRequestSaveConfirmation}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#008559] hover:bg-[#00704a] disabled:opacity-50 text-white text-xs font-black shadow-sm transition cursor-pointer"
                >
                  {isSavingToDb ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Database size={14} />
                  )}
                  <span>
                    {isSavingToDb
                      ? "Saving to Database..."
                      : `Verify & Save to Database (${activeStagedRows.length})`}
                  </span>
                </button>
              </div>
            </div>

            {stagedRows.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <FileSpreadsheet size={34} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No staged payroll data yet</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Upload an Excel file (.xlsx, .xls, .csv) or scanned Payroll Image/PDF above, or add a manual row to test Payslip generation.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Employee Name &amp; ID</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Position / Branch</th>
                      <th className="py-2.5 px-3 text-right min-w-[110px]">Basic Pay</th>
                      <th className="py-2.5 px-3 text-right min-w-[100px]">OT / Allow</th>
                      <th className="py-2.5 px-3 text-right min-w-[110px]">Gross Pay</th>
                      <th className="py-2.5 px-3 text-right min-w-[110px]">Statutory</th>
                      <th className="py-2.5 px-3 text-right min-w-[100px]">CA / Other</th>
                      <th className="py-2.5 px-3 text-right min-w-[110px]">Total Ded</th>
                      <th className="py-2.5 px-3 text-right min-w-[120px]">Net Pay</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stagedRows.map((row, idx) => {
                      const isMatched = profileLookup.has((row.employeeName || "").trim().toLowerCase());
                      const otherEarnTotal =
                        Number(row.allowance || 0) +
                        Number(row.mealAllowance || 0) +
                        Number(row.holidayNightPay || 0) +
                        Number(row.overtimePay || 0);
                      const statutorySum =
                        Number(row.sss || 0) +
                        Number(row.philhealth || 0) +
                        Number(row.pagibig || 0) +
                        Number(row.withholdingTax || 0);
                      const otherDedSum =
                        Number(row.cashAdvance || 0) +
                        Number(row.hdmfLoan || 0) +
                        Number(row.sssLoan || 0) +
                        Number(row.otherDeductions || 0);

                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 font-bold text-slate-400">{row.seqNo || idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={row.employeeName}
                              placeholder="Employee full name"
                              onChange={(e) =>
                                handleInlineFieldChange("staging", row.id, "employeeName", e.target.value)
                              }
                              className="w-full px-2 py-1 rounded-lg border border-slate-200 font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                            />
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-mono text-slate-400">
                                {row.employeeId || (row.seqNo ? `SEQ #${row.seqNo}` : "No ID")}
                              </span>
                              {Number(row.daysWorked || 0) > 0 && (
                                <span className="text-[10px] text-slate-500">
                                  • {row.daysWorked}d @ {formatMoney(row.dailyRate)}
                                </span>
                              )}
                              {isMatched && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                                  Matched Profile
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-700 truncate max-w-[150px]">
                              {row.position || "Staff"}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {row.department || branchLocation || activeCompanyObj.name}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.basicPay}
                              onChange={(e) =>
                                handleInlineFieldChange(
                                  "staging",
                                  row.id,
                                  "basicPay",
                                  e.target.value,
                                  "earning"
                                )
                              }
                              className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-right font-semibold focus:outline-none focus:border-emerald-500"
                            />
                            {Number(row.monthlySalary || 0) > 0 && (
                              <span className="block text-[9.5px] text-slate-400 mt-0.5">
                                Mo: {formatMoney(row.monthlySalary)}
                              </span>
                            )}
                          </td>
                          <td
                            className="py-2.5 px-3 text-right font-medium text-slate-600"
                            title={`Allowance: ${formatMoney(row.allowance)} | Meal: ${formatMoney(row.mealAllowance)} | Holiday: ${formatMoney(row.holidayNightPay)} | OT: ${formatMoney(row.overtimePay)}`}
                          >
                            {formatMoney(otherEarnTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatMoney(row.grossPay)}
                          </td>
                          <td
                            className="py-2.5 px-3 text-right font-medium text-slate-600"
                            title={`PHIC: ${formatMoney(row.philhealth)} | HDMF: ${formatMoney(row.pagibig)} | SSS: ${formatMoney(row.sss)}`}
                          >
                            {formatMoney(statutorySum)}
                          </td>
                          <td
                            className="py-2.5 px-3 text-right font-medium text-rose-600"
                            title={`Sal. Adv: ${formatMoney(row.cashAdvance)} | HDMF Loan: ${formatMoney(row.hdmfLoan)} | SSS Loan: ${formatMoney(row.sssLoan)} | Late/UT: ${formatMoney(row.otherDeductions)}`}
                          >
                            {formatMoney(otherDedSum)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                            {formatMoney(row.totalDeductions)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-black text-emerald-700 text-xs">
                              {formatMoney(row.netPay)}
                            </span>
                            {Math.abs(row.mathVariance || 0) > 1 && (
                              <span
                                className="block text-[9.5px] font-bold text-amber-600"
                                title="Sheet Net Pay differs from (Gross - Deductions)"
                              >
                                Diff: {formatMoney(row.mathVariance)}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingRowModal({
                                    scope: "staging",
                                    row: { ...row },
                                    recalcFromComponents: true
                                  })
                                }
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="Edit all salary & deduction fields"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPayslipPreviewTarget({
                                    mode: "single",
                                    record: {
                                      ...row,
                                      payPeriod,
                                      payDate,
                                      companyId: activeCompanyObj.id,
                                      companyName: activeCompanyObj.name,
                                      payslipRef: "PREVIEW-SLIP"
                                    },
                                    batch: {
                                      companyId: activeCompanyObj.id,
                                      companyName: activeCompanyObj.name,
                                      branchLocation,
                                      payPeriod,
                                      payDate
                                    }
                                  })
                                }
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                                title="Preview Payslip"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow("staging", row.id)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Remove Row"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: SAVED PAYROLL DATABASE & PAYSLIP ISSUANCE                     */}
      {/* ===================================================================== */}
      {subView === "database" && (
        <div className="space-y-5">
          {/* Saved Batch Selector List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Database size={14} className="text-emerald-600" />
                Saved Payroll Batches in Database
              </h3>
              <div className="flex flex-wrap items-center gap-2">
                {savedBatches.some((b) => !b.relationalSynced) && (
                  <button
                    type="button"
                    disabled={isSyncingTables}
                    onClick={handleSyncPendingToDatabaseTables}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={isSyncingTables ? "animate-spin" : ""} />
                    <span>
                      {isSyncingTables
                        ? "Syncing to Tables..."
                        : `Sync ${savedBatches.filter((b) => !b.relationalSynced).length} Batch(es) to Database`}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadDatabaseBatches(activeBatchId)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                >
                  <RefreshCw size={12} className={loadingDb ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {dbErrorNotice && (
              <DatabaseTableSetupBanner
                title="Payroll Database Tables Notice"
                tableName="payroll_batches"
                errorMessage={dbErrorNotice}
                syncLabel="Verify & Sync Batches"
                isSyncing={isSyncingTables}
                onSync={handleSyncPendingToDatabaseTables}
                onDismiss={() => setDbErrorNotice("")}
              />
            )}

            {savedBatches.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-700">No saved payroll batches in the database yet.</p>
                <button
                  type="button"
                  onClick={() => setSubView("upload")}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#008559] text-white text-xs font-bold cursor-pointer"
                >
                  <Upload size={13} />
                  <span>Upload Payroll Excel / OCR Now</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {savedBatches.map((batch) => {
                  const isActive = batch.id === activeBatchId;
                  const bComp = resolveCompanyEntity(batch.companyId || batch.companyName);
                  return (
                    <div
                      key={batch.id}
                      onClick={() => handleSelectSavedBatch(batch.id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                        isActive
                          ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-200/60"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {bComp.logoUrl && (
                          <img
                            src={bComp.logoUrl}
                            alt={bComp.code}
                            className="w-8 h-8 object-contain shrink-0 mt-0.5"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-black text-emerald-700">
                              {batch.batchRef}
                            </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                batch.status === "Released"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {batch.status || "Verified"}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-900 truncate mt-0.5">
                            {batch.payPeriod}
                          </p>
                          <p className="text-[10.5px] text-slate-500 truncate">
                            {batch.companyName} • {batch.rowCount} staff
                          </p>
                          <p className="text-xs font-black text-emerald-700 mt-1">
                            Net: {formatMoney(batch.totalNetPay)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSavedBatch(batch.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer shrink-0"
                        title="Delete batch from database"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Batch Compensation Records & Bulk Payslip Tools */}
          {activeSavedBatch && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/70">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search employee, ID, ref..."
                      className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-emerald-500 w-56"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Verified">Verified</option>
                    <option value="Released">Released</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {emptySavedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmptyRows("saved")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Remove Empty Rows ({emptySavedCount})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => exportPayrollBatchToExcel(activeSavedBatch, filteredSavedRecords)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReleaseAllPayslips}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Mark All Released</span>
                  </button>

                  <button
                    type="button"
                    disabled={filteredSavedRecords.filter((r) => !isEmptyCompensationRow(r)).length === 0}
                    onClick={() =>
                      setPayslipPreviewTarget({
                        mode: "batch_all",
                        batch: activeSavedBatch,
                        recordsList: filteredSavedRecords.filter((r) => !isEmptyCompensationRow(r))
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>
                      Print All Payslips ({filteredSavedRecords.filter((r) => !isEmptyCompensationRow(r)).length})
                    </span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Payslip Ref</th>
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Position / Branch</th>
                      <th className="py-2.5 px-3 text-right">Basic Pay</th>
                      <th className="py-2.5 px-3 text-right">Gross Pay</th>
                      <th className="py-2.5 px-3 text-right">Total Ded</th>
                      <th className="py-2.5 px-3 text-right">Net Pay</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Payslip &amp; DB Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSavedRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3 font-mono text-[10.5px] font-bold text-slate-600">
                          {rec.payslipRef}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-slate-900">{rec.employeeName}</div>
                          <div className="text-[10px] text-slate-400">
                            {rec.employeeId || "No ID"} • {rec.paymentMode || "Direct Payroll"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-700">{rec.position || "Staff"}</div>
                          <div className="text-[10px] text-slate-400">{rec.department || activeSavedBatch.companyName}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {formatMoney(rec.basicPay)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatMoney(rec.grossPay)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-700">
                          - {formatMoney(rec.totalDeductions)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-emerald-700">
                          {formatMoney(rec.netPay)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRecordReleased(rec.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase cursor-pointer transition ${
                              rec.status === "Released"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-amber-100 text-amber-800 border border-amber-200"
                            }`}
                            title="Click to toggle Released / Verified"
                          >
                            {rec.status || "Verified"}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPayslipPreviewTarget({
                                  mode: "single",
                                  record: rec,
                                  batch: activeSavedBatch
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#008559] hover:bg-[#00704a] text-white text-[11px] font-bold cursor-pointer"
                            >
                              <Printer size={12} />
                              <span>Payslip</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingRowModal({
                                  scope: "saved",
                                  row: { ...rec },
                                  recalcFromComponents: true
                                })
                              }
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              title="Edit compensation record"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow("saved", rec.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete row from database"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: CASH ADVANCEMENT (CA) LEDGER & PAYROLL UPLOAD REFLECTION      */}
      {/* ===================================================================== */}
      {subView === "cash_advance" && (
        <div className="space-y-5">
          {/* Header Action Toolbar & Workflow Guide */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Wallet size={16} className="text-amber-600" />
                  <span>Cash Advancement (CA) &amp; Payroll Deduction Transparency</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Encode the employee&apos;s approved whole Cash Advancement amount first, then track automatic payroll deductions and full running-balance transparency per employee.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncCaFromPayrolls}
                  disabled={isSyncingCa}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isSyncingCa ? "animate-spin" : ""} />
                  <span>{isSyncingCa ? "Syncing CA..." : "Sync CA from Saved Payrolls"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenNewCaModal({ entryType: "issued" })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-xs transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Input Approved CA (Whole Amount)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-[11px]">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-50/70 border border-amber-200/70">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <div className="font-extrabold text-amber-950">Input Approved Whole CA</div>
                  <div className="text-[10px] text-amber-800/80">
                    Record the full approved cash advance granted to an employee.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <div className="font-extrabold text-emerald-950">Upload &amp; Save Payroll</div>
                  <div className="text-[10px] text-emerald-800/80">
                    Salary Advancement / CA columns automatically deduct per cutoff.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-sky-50/70 border border-sky-200/70">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <div className="font-extrabold text-sky-950">Running Balance &amp; Statement</div>
                  <div className="text-[10px] text-sky-800/80">
                    View per-cutoff deductions, % recovered, and printable CA statements.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {caErrorNotice && (
            <DatabaseTableSetupBanner
              title="Cash Advancement Table Notice"
              tableName="cash_advances"
              errorMessage={caErrorNotice}
              sqlSnippet={CA_TABLE_SETUP_SQL}
              syncLabel="Verify & Sync CA Now"
              isSyncing={isSyncingCa}
              onSync={handleSyncCaFromPayrolls}
              onDismiss={() => setCaErrorNotice("")}
            />
          )}

          {/* Unsaved Uploaded Payroll Staging CA Impact Preview */}
          {stagedCaImpactRows.length > 0 && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/75 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet size={15} className="text-sky-600 shrink-0" />
                  <div>
                    <p className="text-xs font-extrabold text-sky-950">
                      Pending Payroll CA Deductions in Staging ({stagedCaImpactRows.length} employee
                      {stagedCaImpactRows.length === 1 ? "" : "s"} — Total{" "}
                      {formatMoney(
                        stagedCaImpactRows.reduce((s, r) => s + r.stagedDeduction, 0)
                      )}
                      )
                    </p>
                    <p className="text-[10.5px] text-sky-700">
                      Preview from staged upload ({parsedUpload?.fileName || "Staging"}). Once saved to database, these deductions automatically reduce each employee&apos;s Remaining CA Balance below.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubView("upload")}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold cursor-pointer shrink-0"
                >
                  Go to Staging &amp; Save
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {stagedCaImpactRows.map((row) => (
                  <div
                    key={`staged-ca-${row.id}`}
                    className="rounded-xl bg-white border border-sky-200 px-3 py-2 text-[11px] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-900 truncate">{row.employeeName}</div>
                      <div className="text-[10px] text-slate-500">
                        {row.hasApprovedWholeCa
                          ? `Current Bal: ${formatMoney(row.currentRemaining)}`
                          : "No approved whole CA logged yet"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-rose-700">
                        -{formatMoney(row.stagedDeduction)}
                      </div>
                      {row.hasApprovedWholeCa && (
                        <div className="text-[10px] font-bold text-emerald-700">
                          Est. Bal: {formatMoney(row.projectedRemaining)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Per-Employee CA Balance & Chronological Transparency Ledger */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Employee Cash Advancement Summary &amp; Deduction Transparency ({filteredCaEmployeeSummaries.length})
                </h4>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Click <strong>Breakdown</strong> on any employee row to inspect step-by-step payroll deductions, or open <strong>Statement</strong> for a printable transparency report.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={caEmpSearch}
                    onChange={(e) => setCaEmpSearch(e.target.value)}
                    placeholder="Find employee or branch..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-amber-500 w-52"
                  />
                </div>

                <select
                  value={caEmpStatusFilter}
                  onChange={(e) => setCaEmpStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All CA Statuses ({caSummary.employeeSummaries.length})</option>
                  <option value="OPEN">With Open Balance / Attention</option>
                  <option value="SETTLED">Settled / Fully Deducted ({caSummary.settledCount || 0})</option>
                  <option value="NEEDS_CA">Needs Approved Whole CA ({caSummary.unlinkedCount || 0})</option>
                </select>
              </div>
            </div>

            {filteredCaEmployeeSummaries.length === 0 ? (
              <div className="p-10 text-center space-y-2.5">
                <Wallet size={32} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">
                  No Employee Cash Advancement summaries yet
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Start by clicking <strong>Input Approved CA (Whole Amount)</strong> to record an employee&apos;s approved cash advance, or upload &amp; save a payroll file with Salary Advancement deductions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Employee &amp; Branch</th>
                      <th className="py-2.5 px-3 text-right">Approved CA (Whole)</th>
                      <th className="py-2.5 px-3 text-right">Deducted via Payroll</th>
                      <th className="py-2.5 px-3 w-44">Recovery Progress</th>
                      <th className="py-2.5 px-3 text-right">Remaining Balance</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Transparency &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCaEmployeeSummaries.map((emp) => {
                      const isExpanded = expandedCaEmpKey === emp.key;
                      const isLedgerFiltered =
                        caEmployeeFilter.toLowerCase().trim() === emp.employeeName.toLowerCase().trim();
                      return (
                        <Fragment key={emp.key}>
                          <tr
                            className={`hover:bg-slate-50 transition ${
                              isExpanded ? "bg-amber-50/40" : ""
                            }`}
                          >
                            <td className="py-3 px-3">
                              <div className="font-extrabold text-slate-900">{emp.employeeName}</div>
                              <div className="text-[10px] text-slate-500">
                                {emp.department || emp.companyName || "General"}
                                {emp.employeeId ? ` • ${emp.employeeId}` : ""}
                                {emp.position ? ` • ${emp.position}` : ""}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="font-black text-amber-800">
                                {formatMoney(emp.issuedTotal)}
                              </div>
                              <div className="text-[9.5px] text-slate-400">
                                Approved principal
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="font-black text-emerald-700">
                                {emp.payrollDeductedTotal > 0
                                  ? `-${formatMoney(emp.payrollDeductedTotal)}`
                                  : formatMoney(0)}
                              </div>
                              <div className="text-[9.5px] text-slate-500">
                                {emp.deductionCount} deduction{emp.deductionCount === 1 ? "" : "s"}
                                {emp.repaidTotal > 0 ? ` • Direct: -${formatMoney(emp.repaidTotal)}` : ""}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                                <span className="text-slate-600">
                                  {emp.issuedTotal > 0 ? `${emp.recoveryProgressPct}% recovered` : "Awaiting whole CA"}
                                </span>
                                {emp.issuedTotal > 0 && (
                                  <span className="text-slate-400">
                                    {formatMoney(emp.totalRecovered)}
                                  </span>
                                )}
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    emp.caStatus === "Settled"
                                      ? "bg-emerald-500"
                                      : emp.caStatus === "Needs Approved CA"
                                      ? "bg-rose-400"
                                      : "bg-amber-500"
                                  }`}
                                  style={{
                                    width: `${
                                      emp.issuedTotal > 0
                                        ? Math.min(100, Math.max(0, emp.recoveryProgressPct))
                                        : emp.totalRecovered > 0
                                        ? 100
                                        : 0
                                    }%`
                                  }}
                                />
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div
                                className={`font-black text-sm ${
                                  emp.outstandingBalance > 0
                                    ? "text-amber-700"
                                    : "text-emerald-700"
                                }`}
                              >
                                {formatMoney(emp.outstandingBalance)}
                              </div>
                              {emp.unlinkedDeductionTotal > 0 && (
                                <div className="text-[9.5px] font-bold text-rose-600">
                                  Over/unlinked: {formatMoney(emp.unlinkedDeductionTotal)}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  emp.caStatus === "Settled"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : emp.caStatus === "Partially Deducted"
                                    ? "bg-sky-100 text-sky-800"
                                    : emp.caStatus === "Needs Approved CA"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {emp.caStatus}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedCaEmpKey(isExpanded ? "" : emp.key)
                                  }
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border cursor-pointer ${
                                    isExpanded
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  <span>Breakdown</span>
                                  {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setCaStatementEmpKey(emp.key)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[10.5px] font-bold cursor-pointer"
                                  title="Open Employee CA Transparency Statement & Print"
                                >
                                  <FileText size={11} />
                                  <span>Statement</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenNewCaModal({
                                      employeeName: emp.employeeName,
                                      employeeId: emp.employeeId,
                                      position: emp.position,
                                      department: emp.department,
                                      companyId: emp.companyId,
                                      entryType: "issued",
                                      amount:
                                        emp.unlinkedDeductionTotal > 0
                                          ? String(emp.unlinkedDeductionTotal)
                                          : "",
                                      reason:
                                        emp.unlinkedDeductionTotal > 0
                                          ? "Approved whole CA matching payroll deductions"
                                          : ""
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-lg border text-[10.5px] font-bold cursor-pointer ${
                                    emp.caStatus === "Needs Approved CA"
                                      ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-700"
                                      : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                                  }`}
                                >
                                  {emp.caStatus === "Needs Approved CA" ? "+ Log Whole CA" : "+ Add CA"}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Running-Balance Deduction Transparency Drawer */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90">
                              <td colSpan={7} className="px-5 py-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <h5 className="text-xs font-black text-slate-900">
                                        Chronological CA Deduction Breakdown — {emp.employeeName}
                                      </h5>
                                      <p className="text-[10.5px] text-slate-500">
                                        Approved Whole CA ({formatMoney(emp.issuedTotal)}) − Total Deducted ({formatMoney(emp.totalRecovered)}) = Remaining Balance ({formatMoney(emp.outstandingBalance)})
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCaEmployeeFilter(isLedgerFiltered ? "" : emp.employeeName)
                                        }
                                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-[10.5px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                      >
                                        {isLedgerFiltered ? "Clear Audit Filter" : "Filter Audit Table Below"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setCaStatementEmpKey(emp.key)}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-bold cursor-pointer"
                                      >
                                        <Printer size={11} />
                                        <span>Print Transparency Statement</span>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9.5px]">
                                        <tr>
                                          <th className="py-2 px-2.5 text-center w-10">#</th>
                                          <th className="py-2 px-2.5">Date</th>
                                          <th className="py-2 px-2.5">CA Ref / Batch</th>
                                          <th className="py-2 px-2.5">Cutoff / Particulars</th>
                                          <th className="py-2 px-2.5 text-right">+ Approved CA</th>
                                          <th className="py-2 px-2.5 text-right">- Deducted / Paid</th>
                                          <th className="py-2 px-2.5 text-right">Running Balance</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {emp.timeline.map((step) => (
                                          <tr key={`step-${step.id}`} className="hover:bg-slate-50">
                                            <td className="py-2 px-2.5 text-center font-bold text-slate-400">
                                              {step.stepNumber}
                                            </td>
                                            <td className="py-2 px-2.5 font-semibold text-slate-700 whitespace-nowrap">
                                              {step.dateRecorded || "--"}
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <div className="font-mono text-[10px] font-bold text-slate-800">
                                                {step.caRef}
                                              </div>
                                              <div className="text-[9.5px] text-slate-400">
                                                {step.sourceType === "payroll_upload"
                                                  ? `Payroll Upload${step.batchRef ? ` • ${step.batchRef}` : ""}`
                                                  : "Manual Input"}
                                              </div>
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <div className="font-bold text-slate-800">
                                                {step.entryType === "issued"
                                                  ? "Approved CA (Whole Amount)"
                                                  : step.entryType === "payroll_deduction"
                                                  ? `Payroll Deduction (${step.payPeriod || "Cutoff"})`
                                                  : "Direct Cash Repayment"}
                                              </div>
                                              {step.reason && (
                                                <div className="text-[10px] text-slate-500">
                                                  {step.reason}
                                                </div>
                                              )}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-bold text-amber-700">
                                              {step.signedDelta > 0 ? `+${formatMoney(step.amount)}` : "--"}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                                              {step.signedDelta < 0 ? `-${formatMoney(step.amount)}` : "--"}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-black text-slate-900">
                                              {formatMoney(step.balanceAfter)}
                                              {step.rawBalanceAfter < 0 && (
                                                <span className="block text-[9px] font-bold text-rose-600">
                                                  Needs Whole CA (+{formatMoney(Math.abs(step.rawBalanceAfter))})
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Detailed CA Transaction Audit Ledger Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCaLedgerOpen(!caLedgerOpen)}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800 cursor-pointer"
                >
                  {caLedgerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>CA Transaction Audit Ledger ({filteredCaEntries.length})</span>
                </button>
                {caEmployeeFilter && (
                  <button
                    type="button"
                    onClick={() => setCaEmployeeFilter("")}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-bold cursor-pointer"
                  >
                    <span>Employee: {caEmployeeFilter}</span>
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={caSearchQuery}
                    onChange={(e) => setCaSearchQuery(e.target.value)}
                    placeholder="Search employee, CA ref, batch..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-amber-500 w-52"
                  />
                </div>

                <select
                  value={caSourceFilter}
                  onChange={(e) => setCaSourceFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Sources</option>
                  <option value="manual">Manual CA Input</option>
                  <option value="payroll_upload">Payroll Upload</option>
                </select>

                <select
                  value={caTypeFilter}
                  onChange={(e) => setCaTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Transaction Types</option>
                  <option value="issued">Approved CA (Whole Amount)</option>
                  <option value="payroll_deduction">Payroll Deduction</option>
                  <option value="repayment">Direct Repayment</option>
                </select>

                <button
                  type="button"
                  onClick={() => loadCashAdvances(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <RefreshCw size={12} className={loadingCa ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {caLedgerOpen && (
              filteredCaEntries.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Wallet size={30} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">
                    No Cash Advancement transaction logs match the current filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">CA Ref &amp; Date</th>
                        <th className="py-2.5 px-3">Employee &amp; Branch</th>
                        <th className="py-2.5 px-3">Source</th>
                        <th className="py-2.5 px-3">Entry Type</th>
                        <th className="py-2.5 px-3">Pay Period / Remarks</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCaEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-[10.5px] font-black text-slate-700">
                              {entry.caRef}
                            </div>
                            <div className="text-[10px] text-slate-400">{entry.dateRecorded || "--"}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-900">{entry.employeeName}</div>
                            <div className="text-[10px] text-slate-400">
                              {entry.department || entry.companyName || "General"}{" "}
                              {entry.employeeId ? `• ${entry.employeeId}` : ""}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {entry.sourceType === "payroll_upload" ? (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                  <FileSpreadsheet size={10} />
                                  <span>Payroll Upload</span>
                                </span>
                                {entry.batchRef && (
                                  <div className="text-[9.5px] font-mono text-slate-500 mt-0.5">
                                    {entry.batchRef}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                                <Wallet size={10} />
                                <span>Manual CA Input</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[11px] font-bold ${
                                entry.entryType === "issued"
                                  ? "text-amber-700"
                                  : entry.entryType === "payroll_deduction"
                                  ? "text-emerald-700"
                                  : "text-sky-700"
                              }`}
                            >
                              {entry.entryType === "issued"
                                ? "+ Approved Whole CA"
                                : entry.entryType === "payroll_deduction"
                                ? "- Payroll Deduction"
                                : "- Direct Repayment"}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-[240px]">
                            <div className="font-semibold text-slate-700 truncate">
                              {entry.payPeriod || "--"}
                            </div>
                            <div className="text-[10.5px] text-slate-500 truncate" title={entry.reason}>
                              {entry.reason || "No remarks"}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            {entry.entryType === "issued"
                              ? `+${formatMoney(entry.amount)}`
                              : `-${formatMoney(entry.amount)}`}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleCaStatus(entry)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase cursor-pointer ${
                                entry.status === "Deducted"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : entry.status === "Settled"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                              title="Click to toggle Settled / Active status"
                            >
                              {entry.status}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenNewCaModal(entry)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="Edit CA record"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCaEntry(entry)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Delete CA record"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 4: EMPLOYEE LEAVE RECORDS & REMAINING CREDITS TRACKER            */}
      {/* ===================================================================== */}
      {subView === "leave_records" && (
        <div className="space-y-5">
          {/* Header Action Toolbar & 3-Step Workflow Guide */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" />
                  <span>Employee Leave Records &amp; Remaining Credits Tracker</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Track each employee&apos;s allocated leave credits, filed/approved leaves used, and exact remaining leave days at any time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={leaveYearFilter}
                  onChange={(e) => setLeaveYearFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">All Credit Years</option>
                  {leaveAvailableYears.map((yr) => (
                    <option key={yr} value={String(yr)}>
                      Year {yr}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleSyncLeaveToDatabase}
                  disabled={isSyncingLeave}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isSyncingLeave ? "animate-spin" : ""} />
                  <span>{isSyncingLeave ? "Syncing..." : "Sync Pending Leaves"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenNewLeaveModal({ entryType: "credit_grant" })}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Allocate Leave Credits</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenNewLeaveModal({ entryType: "leave_used" })}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-xs transition cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Record Leave Used</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-100 text-[11px]">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <div className="font-extrabold text-emerald-950">Allocate Leave Credits</div>
                  <div className="text-[10px] text-emerald-800/80">
                    Set each employee&apos;s annual leave entitlement (e.g. 5 Days SIL, VL, SL).
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-50/70 border border-indigo-200/70">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <div className="font-extrabold text-indigo-950">Record Filed Leaves Used</div>
                  <div className="text-[10px] text-indigo-800/80">
                    Log leave dates &amp; days taken to deduct automatically from leave credits.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-sky-50/70 border border-sky-200/70">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <div className="font-extrabold text-sky-950">Check Remaining Leaves</div>
                  <div className="text-[10px] text-sky-800/80">
                    See exact remaining days, breakdown by leave type, and printable statements.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {leaveErrorNotice && (
            <DatabaseTableSetupBanner
              title="Leave Records Table Notice"
              tableName="employee_leave_records"
              errorMessage={leaveErrorNotice}
              sqlSnippet={LEAVE_TABLE_SETUP_SQL}
              syncLabel="Sync Pending Leaves"
              isSyncing={isSyncingLeave}
              onSync={handleSyncLeaveToDatabase}
              onDismiss={() => setLeaveErrorNotice("")}
            />
          )}

          {/* Section 1: Per-Employee Remaining Leave Credits Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Employee Remaining Leave Balance Summary ({filteredLeaveEmployeeSummaries.length})
                </h4>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Shows total leave credits granted minus approved leaves taken, plus chronological history and leave type breakdown.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={leaveEmpSearch}
                    onChange={(e) => setLeaveEmpSearch(e.target.value)}
                    placeholder="Find employee or branch..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-indigo-500 w-52"
                  />
                </div>

                <select
                  value={leaveEmpStatusFilter}
                  onChange={(e) => setLeaveEmpStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Leave Statuses ({leaveSummary.employeeSummaries.length})</option>
                  <option value="AVAILABLE">With Remaining Leaves</option>
                  <option value="LOW">Low Credits ({leaveSummary.lowCount})</option>
                  <option value="EXHAUSTED">Exhausted — 0 Left ({leaveSummary.exhaustedCount})</option>
                  <option value="NEEDS_CREDITS">Needs Leave Credits ({leaveSummary.needsCreditsCount})</option>
                </select>
              </div>
            </div>

            {filteredLeaveEmployeeSummaries.length === 0 ? (
              <div className="p-10 text-center space-y-2.5">
                <Calendar size={32} className="mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-700">
                  No Employee Leave Records yet
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Click <strong>Allocate Leave Credits</strong> to set an employee&apos;s starting leave entitlement (e.g., 5 Days SIL or 10 Days VL/SL), then click <strong>Record Leave Used</strong> whenever leave is filed.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Employee &amp; Branch</th>
                      <th className="py-2.5 px-3 text-right">Allocated Credits</th>
                      <th className="py-2.5 px-3 text-right">Used (Approved)</th>
                      <th className="py-2.5 px-3 w-44">Leave Usage</th>
                      <th className="py-2.5 px-3 text-right">Remaining Leaves</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">History &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeaveEmployeeSummaries.map((emp) => {
                      const isExpanded = expandedLeaveEmpKey === emp.key;
                      const isLedgerFiltered =
                        leaveEmployeeFilter.toLowerCase().trim() === emp.employeeName.toLowerCase().trim();
                      return (
                        <Fragment key={emp.key}>
                          <tr
                            className={`hover:bg-slate-50 transition ${
                              isExpanded ? "bg-indigo-50/40" : ""
                            }`}
                          >
                            <td className="py-3 px-3">
                              <div className="font-extrabold text-slate-900">{emp.employeeName}</div>
                              <div className="text-[10px] text-slate-500">
                                {emp.department || emp.companyName || "General"}
                                {emp.employeeId ? ` • ${emp.employeeId}` : ""}
                                {emp.position ? ` • ${emp.position}` : ""}
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="font-black text-emerald-800">
                                {formatLeaveDays(emp.creditsTotal)} Day(s)
                              </div>
                              <div className="text-[9.5px] text-slate-400">
                                Total entitlement
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="font-black text-amber-700">
                                {emp.usedTotal > 0 ? `-${formatLeaveDays(emp.usedTotal)} Day(s)` : "0 Day(s)"}
                              </div>
                              {emp.pendingTotal > 0 && (
                                <div className="text-[9.5px] font-bold text-sky-600">
                                  Pending: {formatLeaveDays(emp.pendingTotal)} day(s)
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                                <span className="text-slate-600">
                                  {emp.creditsTotal > 0 ? `${emp.usagePct}% used` : "No credits set"}
                                </span>
                                {emp.creditsTotal > 0 && (
                                  <span className="text-slate-400">
                                    {formatLeaveDays(emp.usedTotal)}/{formatLeaveDays(emp.creditsTotal)}
                                  </span>
                                )}
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    emp.leaveStatus === "Exhausted (0 Left)" || emp.leaveStatus === "Needs Leave Credits"
                                      ? "bg-rose-500"
                                      : emp.leaveStatus === "Low Credits"
                                      ? "bg-amber-500"
                                      : "bg-indigo-500"
                                  }`}
                                  style={{
                                    width: `${
                                      emp.creditsTotal > 0
                                        ? Math.min(100, Math.max(0, emp.usagePct))
                                        : emp.usedTotal > 0
                                        ? 100
                                        : 0
                                    }%`
                                  }}
                                />
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div
                                className={`font-black text-sm ${
                                  emp.remainingDays > 1.5
                                    ? "text-emerald-700"
                                    : emp.remainingDays > 0
                                    ? "text-amber-700"
                                    : "text-rose-700"
                                }`}
                              >
                                {formatLeaveDays(emp.remainingDays)} Day(s) Left
                              </div>
                              {emp.uncreditedUsedDays > 0 && (
                                <div className="text-[9.5px] font-bold text-rose-600">
                                  Excess / uncredited: {formatLeaveDays(emp.uncreditedUsedDays)} day(s)
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  emp.leaveStatus === "Available"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : emp.leaveStatus === "Low Credits"
                                    ? "bg-amber-100 text-amber-800"
                                    : emp.leaveStatus === "Pending Approval"
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {emp.leaveStatus}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedLeaveEmpKey(isExpanded ? "" : emp.key)
                                  }
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border cursor-pointer ${
                                    isExpanded
                                      ? "bg-slate-900 text-white border-slate-900"
                                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  <span>Breakdown</span>
                                  {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setLeaveStatementEmpKey(emp.key)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[10.5px] font-bold cursor-pointer"
                                  title="Open Employee Leave Balance Statement & Print"
                                >
                                  <FileText size={11} />
                                  <span>Statement</span>
                                </button>

                                {emp.leaveStatus === "Needs Leave Credits" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenNewLeaveModal({
                                        employeeName: emp.employeeName,
                                        employeeId: emp.employeeId,
                                        position: emp.position,
                                        department: emp.department,
                                        companyId: emp.companyId,
                                        entryType: "credit_grant",
                                        days: "5"
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 text-[10.5px] font-bold cursor-pointer"
                                  >
                                    + Set Credits
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenNewLeaveModal({
                                        employeeName: emp.employeeName,
                                        employeeId: emp.employeeId,
                                        position: emp.position,
                                        department: emp.department,
                                        companyId: emp.companyId,
                                        entryType: "leave_used"
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10.5px] font-bold cursor-pointer"
                                  >
                                    + File Leave
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-50/90">
                              <td colSpan={7} className="px-5 py-4">
                                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                      <h5 className="text-xs font-black text-slate-900">
                                        Leave Credits &amp; Usage Breakdown — {emp.employeeName}
                                      </h5>
                                      <p className="text-[10.5px] text-slate-500">
                                        Allocated ({formatLeaveDays(emp.creditsTotal)} day(s)) − Approved Used ({formatLeaveDays(emp.usedTotal)} day(s)) = Remaining ({formatLeaveDays(emp.remainingDays)} day(s))
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenNewLeaveModal({
                                            employeeName: emp.employeeName,
                                            employeeId: emp.employeeId,
                                            position: emp.position,
                                            department: emp.department,
                                            companyId: emp.companyId,
                                            entryType: "credit_grant",
                                            days: "5"
                                          })
                                        }
                                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10.5px] font-bold text-emerald-800 cursor-pointer"
                                      >
                                        + Add Credits
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setLeaveEmployeeFilter(isLedgerFiltered ? "" : emp.employeeName)
                                        }
                                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-[10.5px] font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                      >
                                        {isLedgerFiltered ? "Clear Audit Filter" : "Filter Audit Table"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setLeaveStatementEmpKey(emp.key)}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[10.5px] font-bold cursor-pointer"
                                      >
                                        <Printer size={11} />
                                        <span>Print Statement</span>
                                      </button>
                                    </div>
                                  </div>

                                  {emp.byLeaveType.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {emp.byLeaveType.map((cat) => (
                                        <div
                                          key={`${emp.key}-${cat.leaveType}`}
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[10.5px]"
                                        >
                                          <span className="font-extrabold text-slate-800">{cat.leaveType}:</span>{" "}
                                          <span className="text-emerald-700 font-bold">
                                            +{formatLeaveDays(cat.credits)}
                                          </span>{" "}
                                          /{" "}
                                          <span className="text-amber-700 font-bold">
                                            -{formatLeaveDays(cat.used)}
                                          </span>
                                          {cat.credits > 0 && (
                                            <span className="ml-1.5 font-black text-indigo-700">
                                              ({formatLeaveDays(cat.remaining)} left)
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-[11px] text-left">
                                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9.5px]">
                                        <tr>
                                          <th className="py-2 px-2.5 text-center w-10">#</th>
                                          <th className="py-2 px-2.5">Dates &amp; Ref</th>
                                          <th className="py-2 px-2.5">Category &amp; Reason</th>
                                          <th className="py-2 px-2.5 text-center">Status</th>
                                          <th className="py-2 px-2.5 text-right">+ Credits</th>
                                          <th className="py-2 px-2.5 text-right">- Used</th>
                                          <th className="py-2 px-2.5 text-right">Remaining Bal</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {emp.timeline.map((step) => (
                                          <tr key={`lv-step-${step.id}`} className="hover:bg-slate-50">
                                            <td className="py-2 px-2.5 text-center font-bold text-slate-400">
                                              {step.stepNumber}
                                            </td>
                                            <td className="py-2 px-2.5 whitespace-nowrap">
                                              <div className="font-bold text-slate-800">
                                                {step.startDate || "--"}
                                                {step.endDate && step.endDate !== step.startDate
                                                  ? ` to ${step.endDate}`
                                                  : ""}
                                              </div>
                                              <div className="font-mono text-[9.5px] text-slate-400">
                                                {step.leaveRef} • {step.creditYear}
                                              </div>
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <div className="font-bold text-slate-800">
                                                {step.entryType === "credit_grant"
                                                  ? `Leave Credits Allocated (${step.leaveType})`
                                                  : step.leaveType}
                                              </div>
                                              {step.reason && (
                                                <div className="text-[10px] text-slate-500">{step.reason}</div>
                                              )}
                                            </td>
                                            <td className="py-2 px-2.5 text-center">
                                              <span
                                                className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                                                  step.status === "Approved"
                                                    ? "bg-emerald-100 text-emerald-800"
                                                    : step.status === "Pending"
                                                    ? "bg-sky-100 text-sky-800"
                                                    : "bg-slate-200 text-slate-600"
                                                }`}
                                              >
                                                {step.status}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                                              {step.signedDelta > 0 ? `+${formatLeaveDays(step.days)}` : "--"}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-bold text-amber-700">
                                              {step.signedDelta < 0 ? `-${formatLeaveDays(step.days)}` : "--"}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-black text-slate-900">
                                              {formatLeaveDays(step.balanceAfter)} Day(s)
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Complete Leave Transaction Audit Ledger */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveLedgerOpen(!leaveLedgerOpen)}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-800 cursor-pointer"
                >
                  {leaveLedgerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>Leave Transaction Audit Ledger ({filteredLeaveEntries.length})</span>
                </button>
                {leaveEmployeeFilter && (
                  <button
                    type="button"
                    onClick={() => setLeaveEmployeeFilter("")}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 text-[11px] font-bold cursor-pointer"
                  >
                    <span>Employee: {leaveEmployeeFilter}</span>
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={leaveSearchQuery}
                    onChange={(e) => setLeaveSearchQuery(e.target.value)}
                    placeholder="Search employee, ref, leave type..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-indigo-500 w-52"
                  />
                </div>

                <select
                  value={leaveEntryTypeFilter}
                  onChange={(e) => setLeaveEntryTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Entries</option>
                  <option value="credit_grant">Leave Credits Allocated</option>
                  <option value="leave_used">Leaves Filed / Used</option>
                </select>

                <select
                  value={leaveTypeFilter}
                  onChange={(e) => setLeaveTypeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                >
                  <option value="ALL">All Leave Categories</option>
                  {LEAVE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => loadLeaveRecords(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <RefreshCw size={12} className={loadingLeave ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {leaveLedgerOpen && (
              filteredLeaveEntries.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <Calendar size={30} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">
                    No leave transaction logs match the current filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Leave Ref &amp; Dates</th>
                        <th className="py-2.5 px-3">Employee &amp; Branch</th>
                        <th className="py-2.5 px-3">Entry Type</th>
                        <th className="py-2.5 px-3">Leave Category &amp; Remarks</th>
                        <th className="py-2.5 px-3 text-right">Days</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLeaveEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-[10.5px] font-black text-slate-700">
                              {entry.leaveRef}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {entry.startDate || "--"}
                              {entry.endDate && entry.endDate !== entry.startDate
                                ? ` to ${entry.endDate}`
                                : ""}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-900">{entry.employeeName}</div>
                            <div className="text-[10px] text-slate-400">
                              {entry.department || entry.companyName || "General"}{" "}
                              {entry.employeeId ? `• ${entry.employeeId}` : ""}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {entry.entryType === "credit_grant" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                + Leave Credits ({entry.creditYear})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black">
                                - Leave Used ({entry.creditYear})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 max-w-[240px]">
                            <div className="font-semibold text-slate-800 truncate">{entry.leaveType}</div>
                            <div className="text-[10.5px] text-slate-500 truncate" title={entry.reason}>
                              {entry.reason || "No remarks"}
                            </div>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-black ${
                              entry.entryType === "credit_grant" ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {entry.entryType === "credit_grant"
                              ? `+${formatLeaveDays(entry.days)}`
                              : `-${formatLeaveDays(entry.days)}`}{" "}
                            Day(s)
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleCycleLeaveStatus(entry)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase cursor-pointer ${
                                entry.status === "Approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : entry.status === "Pending"
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                              title="Click to cycle Approved / Pending / Cancelled"
                            >
                              {entry.status}
                            </button>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenNewLeaveModal(entry)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                title="Edit leave record"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLeaveEntry(entry)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Delete leave record"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: EDIT FULL SALARY & DEDUCTIONS RECORD                         */}
      {/* ===================================================================== */}
      {editingRowModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleSaveEditedRowModal}
            className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Edit Salary &amp; Compensation Record
                </h3>
                <p className="text-[11px] text-slate-500">
                  Changes automatically recompute Gross Pay, Total Deductions, and Net Take-Home Pay.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRowModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Employee Name *</label>
                <input
                  type="text"
                  required
                  value={editingRowModal.row.employeeName || ""}
                  onChange={(e) =>
                    setEditingRowModal((prev) => ({
                      ...prev,
                      row: { ...prev.row, employeeName: e.target.value }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  value={editingRowModal.row.employeeId || ""}
                  onChange={(e) =>
                    setEditingRowModal((prev) => ({
                      ...prev,
                      row: { ...prev.row, employeeId: e.target.value }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Mode</label>
                <input
                  type="text"
                  value={editingRowModal.row.paymentMode || ""}
                  onChange={(e) =>
                    setEditingRowModal((prev) => ({
                      ...prev,
                      row: { ...prev.row, paymentMode: e.target.value }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Position / Role</label>
                <input
                  type="text"
                  value={editingRowModal.row.position || ""}
                  onChange={(e) =>
                    setEditingRowModal((prev) => ({
                      ...prev,
                      row: { ...prev.row, position: e.target.value }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Department / Branch</label>
                <input
                  type="text"
                  value={editingRowModal.row.department || ""}
                  onChange={(e) =>
                    setEditingRowModal((prev) => ({
                      ...prev,
                      row: { ...prev.row, department: e.target.value }
                    }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
            </div>

            {/* Earnings Inputs */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
              <span className="block text-[11px] font-black uppercase tracking-wider text-emerald-800">
                Rates, Days &amp; Earnings Breakdown (PHP)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                {[
                  ["monthlySalary", "Basic Monthly Salary", false],
                  ["dailyRate", "Rate Per Day", false],
                  ["hourlyRate", "Rate Per Hour", false],
                  ["daysWorked", "# of Days", true],
                  ["basicPay", "Total Basic Pay", true],
                  ["allowance", "Allowance", true],
                  ["mealAllowance", "Meal Allowance", true],
                  ["holidayNightPay", "Holiday / Night Diff", true],
                  ["overtimePay", "Overtime Pay", true]
                ].map(([key, label, triggersRecalc]) => (
                  <div key={key}>
                    <label className="block font-semibold text-slate-600 mb-1 truncate">{label}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingRowModal.row[key] ?? 0}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingRowModal((prev) => {
                          const nextRow = { ...prev.row, [key]: val };
                          if (key === "daysWorked" || key === "dailyRate") {
                            const d = Number(key === "daysWorked" ? val : nextRow.daysWorked || 0);
                            const r = Number(key === "dailyRate" ? val : nextRow.dailyRate || 0);
                            if (Number.isFinite(d) && Number.isFinite(r) && r > 0) {
                              nextRow.basicPay = Math.round(d * r * 100) / 100;
                            }
                          }
                          return {
                            ...prev,
                            recalcFromComponents: triggersRecalc ? true : prev.recalcFromComponents,
                            row: nextRow
                          };
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-right"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions Inputs */}
            <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2">
              <span className="block text-[11px] font-black uppercase tracking-wider text-rose-800">
                Deductions &amp; Statutory Contributions (PHP)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {[
                  ["philhealth", "PHIC (PhilHealth)"],
                  ["pagibig", "HDMF (Pag-IBIG)"],
                  ["sss", "SSS Contribution"],
                  ["withholdingTax", "Withholding Tax"],
                  ["cashAdvance", "Salary Advancement / CA"],
                  ["hdmfLoan", "HDMF Loan"],
                  ["sssLoan", "SSS Loan"],
                  ["otherDeductions", "Late / Undertime / Other"]
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="block font-semibold text-slate-600 mb-1 truncate">{label}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingRowModal.row[key] ?? 0}
                      onChange={(e) =>
                        setEditingRowModal((prev) => ({
                          ...prev,
                          recalcFromComponents: true,
                          row: { ...prev.row, [key]: e.target.value }
                        }))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold text-right"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Payroll Note</label>
              <input
                type="text"
                value={editingRowModal.row.remarks || ""}
                onChange={(e) =>
                  setEditingRowModal((prev) => ({
                    ...prev,
                    row: { ...prev.row, remarks: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRowModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#008559] hover:bg-[#00704a] text-white text-xs font-black cursor-pointer"
              >
                <Check size={14} />
                <span>Apply &amp; Update Record</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: OFFICIAL CORPORATE PAYSLIP VIEWER & PRINT STUDIO             */}
      {/* ===================================================================== */}
      {payslipPreviewTarget && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  {payslipPreviewTarget.mode === "batch_all"
                    ? `Batch Corporate Payslips (${payslipPreviewTarget.recordsList?.length || 0} Employees)`
                    : "Official Employee Payslip Voucher"}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {payslipPreviewTarget.batch?.companyName || activeCompanyObj.name} •{" "}
                  {payslipPreviewTarget.batch?.payPeriod || payPeriod}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintPayslipModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print Official Payslip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPayslipPreviewTarget(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-5 bg-slate-100/70 p-4 rounded-xl border border-slate-200">
              <div ref={printAreaRef} className="space-y-6">
                {payslipPreviewTarget.mode === "batch_all" ? (
                  (payslipPreviewTarget.recordsList || []).map((rec) => (
                    <PayslipDocumentCard
                      key={rec.id}
                      record={rec}
                      batch={payslipPreviewTarget.batch}
                      company={resolveCompanyEntity(
                        rec.companyId || payslipPreviewTarget.batch?.companyId || selectedCompanyId
                      )}
                      preparedByName={currentUser?.name}
                      compact
                    />
                  ))
                ) : (
                  <PayslipDocumentCard
                    record={payslipPreviewTarget.record}
                    batch={payslipPreviewTarget.batch}
                    company={resolveCompanyEntity(
                      payslipPreviewTarget.record?.companyId ||
                        payslipPreviewTarget.batch?.companyId ||
                        selectedCompanyId
                    )}
                    preparedByName={currentUser?.name}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: PRE-SAVE TOTAL AMOUNT CONFIRMATION & AUDIT GATE              */}
      {/* ===================================================================== */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    reconciliation.status === "MISMATCH"
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : "bg-emerald-50 border-emerald-200 text-emerald-700"
                  }`}
                >
                  {reconciliation.status === "MISMATCH" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <Scale size={20} />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Confirm Total Amount Verification Before Saving
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {activeCompanyObj.name}
                    {branchLocation ? ` (${branchLocation})` : ""} • {payPeriod} •{" "}
                    {activeStagedRows.length} Employees
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSaveConfirmModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Coincide Check Banner */}
            <div
              className={`rounded-xl p-3.5 border text-xs flex items-start gap-2.5 ${
                reconciliation.status === "COINCIDES"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : reconciliation.status === "ROUNDING_DIFF"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : reconciliation.status === "MISMATCH"
                  ? "bg-rose-50 border-rose-200 text-rose-900"
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}
            >
              {reconciliation.status === "MISMATCH" ? (
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
              ) : (
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              )}
              <div>
                <p className="font-extrabold">
                  {reconciliation.status === "COINCIDES"
                    ? "Verified: Extracted Payroll Totals Coincide 100% with Excel File Totals."
                    : reconciliation.status === "ROUNDING_DIFF"
                    ? "Verified: Totals Match Within Centavo Rounding Tolerance (<= ₱1.00)."
                    : reconciliation.status === "MISMATCH"
                    ? "Warning: Extracted Totals Do NOT Coincide with Excel File / Row Math."
                    : "Manual Verification Needed: No Excel Footer Total Row Found."}
                </p>
                <p className="text-[11px] mt-0.5 opacity-90">
                  {reconciliation.hasExcelFooter
                    ? `Checked against Excel footer row "${reconciliation.footerLabel}" (Row ${reconciliation.footerRowNumber || "-"}).`
                    : reconciliation.hasManualControl
                    ? "Checked against your entered Control Net Pay amount."
                    : "You can go back to enter an optional Control Net Total, or confirm saving below if these totals are final."}
                </p>
              </div>
            </div>

            {/* Side-by-Side Total Comparison Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Payroll Total Metric</th>
                    <th className="py-2 px-3 text-right">System Extracted</th>
                    <th className="py-2 px-3 text-right">Excel / Control</th>
                    <th className="py-2 px-3 text-right">Difference</th>
                    <th className="py-2 px-3 text-center">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliation.primaryChecks.map((chk) => (
                    <tr key={chk.key} className={chk.key === "netPay" ? "bg-emerald-50/40 font-bold" : ""}>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{chk.label}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                        {formatMoney(chk.extracted)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {chk.hasExpected ? formatMoney(chk.expected) : "--"}
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-bold ${
                          chk.isMismatch
                            ? "text-rose-600"
                            : chk.hasExpected
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        {chk.hasExpected
                          ? `${chk.diff > 0 ? "+" : ""}${formatMoney(chk.diff)}`
                          : "--"}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {!chk.hasExpected ? (
                          <span className="text-[10px] font-bold text-slate-400">N/A</span>
                        ) : chk.isMismatch ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">
                            MISMATCH
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                            COINCIDES
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(reconciliation.rowVarianceCount > 0 || reconciliation.smallRoundingRowCount > 0) && (
              <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700">
                <span className="font-bold">Row-Level Math Audit:</span>{" "}
                {reconciliation.rowVarianceCount > 0
                  ? `${reconciliation.rowVarianceCount} employee row(s) have Net Pay differing by more than ₱1.00 from (Gross - Deductions). `
                  : ""}
                {reconciliation.smallRoundingRowCount > 0
                  ? `${reconciliation.smallRoundingRowCount} employee row(s) have minor sub-peso centavo rounding variance (<= ₱1.00) from Excel formulas.`
                  : ""}
              </div>
            )}

            {reconciliation.status === "MISMATCH" && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledgeMismatch}
                  onChange={(e) => setAcknowledgeMismatch(e.target.checked)}
                  className="mt-0.5 rounded border-rose-400 text-rose-600 focus:ring-rose-500"
                />
                <span className="font-semibold">
                  I reviewed the variance between the extracted sums and the Excel file totals, and I confirm saving this batch to the database anyway.
                </span>
              </label>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveConfirmModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel / Review Rows
              </button>
              <button
                type="button"
                disabled={isSavingToDb || (reconciliation.status === "MISMATCH" && !acknowledgeMismatch)}
                onClick={handleCommitStagedToDatabase}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#008559] hover:bg-[#00704a] disabled:opacity-50 text-white text-xs font-black shadow-sm cursor-pointer"
              >
                {isSavingToDb ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>
                  {isSavingToDb ? "Saving to Database..." : "Confirm & Save to Database"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: RECORD / EDIT CASH ADVANCEMENT (CA) ENTRY                    */}
      {/* ===================================================================== */}
      {caFormModal && (() => {
        const empKey = String(caFormModal.employeeName || "").trim().toUpperCase();
        const existingEmpCa = empKey ? caSummaryByEmpKey.get(empKey) || null : null;
        const oldEntry = caFormModal.id ? caEntries.find((x) => x.id === caFormModal.id) || null : null;
        const draftAmt = Number.isFinite(Number(caFormModal.amount)) ? Math.max(0, Number(caFormModal.amount || 0)) : 0;
        const baseIssued = Math.max(
          0,
          (existingEmpCa?.issuedTotal || 0) - (oldEntry?.entryType === "issued" ? Number(oldEntry.amount || 0) : 0)
        );
        const baseRecovered = Math.max(
          0,
          (existingEmpCa?.totalRecovered || 0) - (oldEntry && oldEntry.entryType !== "issued" ? Number(oldEntry.amount || 0) : 0)
        );
        const projIssued = caFormModal.entryType === "issued" ? baseIssued + draftAmt : baseIssued;
        const projRecovered = caFormModal.entryType !== "issued" ? baseRecovered + draftAmt : baseRecovered;
        const projRemaining = Math.max(0, Math.round((projIssued - projRecovered) * 100) / 100);
        const safeCompany = resolveCompanyEntity(caFormModal.companyId || selectedCompanyId);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <form
              onSubmit={handleSaveCaForm}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {caFormModal.id
                        ? "Edit Cash Advancement Entry"
                        : caFormModal.entryType === "issued"
                        ? "Input Approved Cash Advancement (Whole Amount)"
                        : "Record Cash Advancement Adjustment"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Encode the approved whole CA amount first; future payroll uploads will automatically deduct against this balance.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCaFormModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <datalist id="ca-employee-directory">
                {employeeSuggestionDirectory.map((cand) => (
                  <option key={cand.employeeName} value={cand.employeeName} />
                ))}
              </datalist>

              {/* Clear Transaction Type Selector Cards */}
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                {[
                  {
                    id: "issued",
                    title: "Approved Whole CA",
                    desc: "Initial total loan",
                    activeCls: "bg-amber-600 text-white border-amber-700 shadow-xs"
                  },
                  {
                    id: "repayment",
                    title: "Direct Payment",
                    desc: "Manual cash paid",
                    activeCls: "bg-sky-600 text-white border-sky-700 shadow-xs"
                  },
                  {
                    id: "payroll_deduction",
                    title: "Payroll Deduction",
                    desc: "Cutoff CA adjustment",
                    activeCls: "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                  }
                ].map((opt) => {
                  const isActive = caFormModal.entryType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setCaFormModal((prev) => ({
                          ...prev,
                          entryType: opt.id,
                          status:
                            opt.id === "payroll_deduction"
                              ? "Deducted"
                              : opt.id === "repayment"
                              ? "Settled"
                              : "Active"
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        isActive
                          ? opt.activeCls
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="font-black leading-tight">{opt.title}</div>
                      <div className={`text-[9.5px] mt-0.5 ${isActive ? "text-white/85" : "text-slate-500"}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Employee Full Name *</label>
                  <input
                    type="text"
                    required
                    list="ca-employee-directory"
                    value={caFormModal.employeeName}
                    placeholder="Type or pick employee name..."
                    onChange={(e) => {
                      const nextName = e.target.value;
                      const match = employeeSuggestionDirectory.find(
                        (c) => c.employeeName.toLowerCase() === nextName.trim().toLowerCase()
                      );
                      setCaFormModal((prev) => ({
                        ...prev,
                        employeeName: nextName,
                        ...(match
                          ? {
                              employeeId: prev.employeeId || match.employeeId,
                              position: prev.position || match.position,
                              department: prev.department || match.department,
                              companyId: match.companyId || prev.companyId
                            }
                          : {})
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    {caFormModal.entryType === "issued"
                      ? "Approved Whole CA Amount (PHP) *"
                      : caFormModal.entryType === "repayment"
                      ? "Direct Cash Repayment Amount (PHP) *"
                      : "Payroll Deduction Amount (PHP) *"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={caFormModal.amount}
                    onChange={(e) => setCaFormModal((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 5000.00"
                    className="w-full px-3.5 py-2.5 rounded-xl border-2 border-amber-300 bg-amber-50/30 font-black text-base text-right text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Live Employee CA Balance Impact Preview */}
                {(existingEmpCa || draftAmt > 0) && (
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <span>Projected Employee CA Transparency Snapshot</span>
                      <span>{safeCompany.code}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white border border-slate-200 p-2">
                        <div className="text-[9.5px] font-bold text-slate-500">Approved Whole</div>
                        <div className="text-xs font-black text-amber-800 mt-0.5">
                          {formatMoney(projIssued)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 p-2">
                        <div className="text-[9.5px] font-bold text-slate-500">Total Deducted</div>
                        <div className="text-xs font-black text-emerald-700 mt-0.5">
                          -{formatMoney(projRecovered)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-900 text-white p-2">
                        <div className="text-[9.5px] font-bold text-slate-300">Projected Balance</div>
                        <div className="text-xs font-black text-amber-300 mt-0.5">
                          {formatMoney(projRemaining)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Entity</label>
                  <select
                    value={caFormModal.companyId}
                    onChange={(e) =>
                      setCaFormModal((prev) => ({ ...prev, companyId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    {COMPANIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch / Department</label>
                  <input
                    type="text"
                    value={caFormModal.department}
                    onChange={(e) =>
                      setCaFormModal((prev) => ({ ...prev, department: e.target.value }))
                    }
                    placeholder="e.g. Mandaue City"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={caFormModal.employeeId}
                    onChange={(e) =>
                      setCaFormModal((prev) => ({ ...prev, employeeId: e.target.value }))
                    }
                    placeholder="Optional"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Position / Designation</label>
                  <input
                    type="text"
                    value={caFormModal.position}
                    onChange={(e) =>
                      setCaFormModal((prev) => ({ ...prev, position: e.target.value }))
                    }
                    placeholder="e.g. Field Monitoring"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {caFormModal.entryType === "issued" ? "Date Approved / Released" : "Date Recorded"}
                  </label>
                  <input
                    type="date"
                    value={caFormModal.dateRecorded}
                    onChange={(e) =>
                      setCaFormModal((prev) => ({ ...prev, dateRecorded: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={caFormModal.status}
                    onChange={(e) => setCaFormModal((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    <option value="Active">Active (Unpaid)</option>
                    <option value="Deducted">Deducted (Payroll)</option>
                    <option value="Settled">Settled / Closed</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    {caFormModal.entryType === "issued"
                      ? "Reference Cutoff / Approval Batch (Optional)"
                      : "Payroll Cutoff / Pay Period"}
                  </label>
                  <input
                    type="text"
                    value={caFormModal.payPeriod}
                    onChange={(e) =>
                      setCaFormModal((prev) => ({ ...prev, payPeriod: e.target.value }))
                    }
                    placeholder="e.g. OCTOBER 11-25, 2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Deduction Terms / Purpose &amp; Remarks
                  </label>
                  <textarea
                    rows={2}
                    value={caFormModal.reason}
                    onChange={(e) => setCaFormModal((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Approved whole CA of PHP 5,000 — deduct PHP 1,000 per payroll cutoff..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCaFormModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCa}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
                >
                  <Check size={14} />
                  <span>
                    {isSavingCa
                      ? "Saving..."
                      : caFormModal.entryType === "issued"
                      ? "Save Approved Whole CA"
                      : "Save Cash Advancement Entry"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* MODAL 5: EMPLOYEE CASH ADVANCEMENT TRANSPARENCY STATEMENT             */}
      {/* ===================================================================== */}
      {caStatementEmployee && (() => {
        const stmtCompany = resolveCompanyEntity(caStatementEmployee.companyId || selectedCompanyId);
        return (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-100 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
              {/* Top Modal Toolbar */}
              <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-amber-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Employee Cash Advancement Transparency Statement
                    </h3>
                    <p className="text-[10.5px] text-slate-500">
                      Complete record from Approved Whole Amount to Payroll Upload Deductions and Remaining Balance.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintCaStatement}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Print / Save PDF Statement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaStatementEmpKey("")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Printable Sheet Content */}
              <div className="p-5 overflow-y-auto">
                <div
                  ref={caStatementRef}
                  className="ca-statement-sheet bg-white border border-slate-300 rounded-xl p-6 space-y-5 text-slate-900 shadow-xs"
                >
                  {/* Corporate Header */}
                  <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-amber-600">
                    <div className="flex items-center gap-3">
                      {stmtCompany.logoUrl && (
                        <img
                          src={stmtCompany.logoUrl}
                          alt={stmtCompany.name}
                          className="w-11 h-11 object-contain shrink-0"
                        />
                      )}
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
                          {stmtCompany.legalName || stmtCompany.name}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Human Resources &amp; Payroll • Cash Advancement Statement of Account
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          caStatementEmployee.caStatus === "Settled"
                            ? "bg-emerald-100 text-emerald-800"
                            : caStatementEmployee.caStatus === "Needs Approved CA"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {caStatementEmployee.caStatus}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Generated: {new Date().toISOString().split("T")[0]}
                      </div>
                    </div>
                  </div>

                  {/* Employee Identity Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
                    <div>
                      <div className="text-[9.5px] font-bold uppercase text-slate-400">Employee Name</div>
                      <div className="font-black text-slate-900 mt-0.5">{caStatementEmployee.employeeName}</div>
                    </div>
                    <div>
                      <div className="text-[9.5px] font-bold uppercase text-slate-400">Employee ID</div>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {caStatementEmployee.employeeId || "--"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9.5px] font-bold uppercase text-slate-400">Position</div>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {caStatementEmployee.position || "--"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9.5px] font-bold uppercase text-slate-400">Branch / Department</div>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {caStatementEmployee.department || stmtCompany.name}
                      </div>
                    </div>
                  </div>

                  {/* 4 Transparency Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                      <div className="text-[9.5px] font-extrabold uppercase text-amber-700">
                        Approved Whole CA
                      </div>
                      <div className="text-base font-black text-amber-900 mt-1">
                        {formatMoney(caStatementEmployee.issuedTotal)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <div className="text-[9.5px] font-extrabold uppercase text-emerald-700">
                        Deducted via Payroll
                      </div>
                      <div className="text-base font-black text-emerald-800 mt-1">
                        -{formatMoney(caStatementEmployee.payrollDeductedTotal)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                      <div className="text-[9.5px] font-extrabold uppercase text-sky-700">
                        Direct Repaid
                      </div>
                      <div className="text-base font-black text-sky-900 mt-1">
                        -{formatMoney(caStatementEmployee.repaidTotal)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-900 bg-slate-900 text-white p-3">
                      <div className="text-[9.5px] font-extrabold uppercase text-slate-300">
                        Remaining Balance
                      </div>
                      <div className="text-base font-black text-amber-300 mt-1">
                        {formatMoney(caStatementEmployee.outstandingBalance)}
                      </div>
                    </div>
                  </div>

                  {/* Visual Recovery Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10.5px] font-bold text-slate-600">
                      <span>Recovery Progress ({caStatementEmployee.deductionCount} deduction entries)</span>
                      <span>{caStatementEmployee.recoveryProgressPct}% Recovered</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{
                          width: `${Math.min(100, Math.max(0, caStatementEmployee.recoveryProgressPct))}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Chronological Running Balance Ledger */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9.5px]">
                        <tr>
                          <th className="py-2 px-2.5 text-center">#</th>
                          <th className="py-2 px-2.5">Date</th>
                          <th className="py-2 px-2.5">Reference / Batch</th>
                          <th className="py-2 px-2.5">Cutoff &amp; Description</th>
                          <th className="py-2 px-2.5 text-right">+ Whole CA</th>
                          <th className="py-2 px-2.5 text-right">- Deducted</th>
                          <th className="py-2 px-2.5 text-right">Running Bal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {caStatementEmployee.timeline.map((step) => (
                          <tr key={`stmt-${step.id}`}>
                            <td className="py-2 px-2.5 text-center font-bold text-slate-400">
                              {step.stepNumber}
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap font-medium">
                              {step.dateRecorded || "--"}
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="font-mono text-[10px] font-bold">{step.caRef}</div>
                              {step.batchRef && (
                                <div className="font-mono text-[9.5px] text-slate-400">{step.batchRef}</div>
                              )}
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="font-bold text-slate-800">
                                {step.entryType === "issued"
                                  ? "Approved Cash Advancement (Whole Amount)"
                                  : step.entryType === "payroll_deduction"
                                  ? `Payroll Deduction — ${step.payPeriod || "Cutoff"}`
                                  : "Direct Cash Repayment"}
                              </div>
                              {step.reason && (
                                <div className="text-[10px] text-slate-500">{step.reason}</div>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-amber-700">
                              {step.signedDelta > 0 ? `+${formatMoney(step.amount)}` : "--"}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                              {step.signedDelta < 0 ? `-${formatMoney(step.amount)}` : "--"}
                            </td>
                            <td className="py-2 px-2.5 text-right font-black text-slate-900">
                              {formatMoney(step.balanceAfter)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatory Footer */}
                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-[10.5px]">
                    <div>
                      <div className="border-b border-slate-400 pb-6 font-bold uppercase">
                        {currentUser?.name || "HRMD / PAYROLL ADMIN"}
                      </div>
                      <span className="text-[9.5px] text-slate-500 mt-1 block">
                        Prepared &amp; Verified by HR / Accounting
                      </span>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-6 font-bold uppercase">
                        {caStatementEmployee.employeeName}
                      </div>
                      <span className="text-[9.5px] text-slate-500 mt-1 block">
                        Acknowledged by Employee / Date
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* MODAL 6: ALLOCATE LEAVE CREDITS / RECORD LEAVE USED                   */}
      {/* ===================================================================== */}
      {leaveFormModal && (() => {
        const empKey = String(leaveFormModal.employeeName || "").trim().toUpperCase();
        const existingEmpLeave = empKey ? leaveSummaryByEmpKey.get(empKey) || null : null;
        const oldEntry = leaveFormModal.id
          ? leaveEntries.find((x) => x.id === leaveFormModal.id) || null
          : null;
        const draftDays = Number.isFinite(Number(leaveFormModal.days))
          ? Math.max(0, Number(leaveFormModal.days || 0))
          : 0;
        const oldAffectedCredits =
          oldEntry && oldEntry.entryType === "credit_grant" && oldEntry.status !== "Cancelled"
            ? Number(oldEntry.days || 0)
            : 0;
        const oldAffectedUsed =
          oldEntry && oldEntry.entryType === "leave_used" && oldEntry.status === "Approved"
            ? Number(oldEntry.days || 0)
            : 0;
        const baseCredits = Math.max(0, (existingEmpLeave?.creditsTotal || 0) - oldAffectedCredits);
        const baseUsed = Math.max(0, (existingEmpLeave?.usedTotal || 0) - oldAffectedUsed);

        const isDraftActive = leaveFormModal.status !== "Cancelled";
        const isDraftApprovedLeave =
          leaveFormModal.entryType === "leave_used" && leaveFormModal.status === "Approved";

        const projCredits =
          leaveFormModal.entryType === "credit_grant" && isDraftActive
            ? baseCredits + draftDays
            : baseCredits;
        const projUsed = isDraftApprovedLeave ? baseUsed + draftDays : baseUsed;
        const projRemaining = Math.max(0, Math.round((projCredits - projUsed) * 100) / 100);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <form
              onSubmit={handleSaveLeaveForm}
              className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      {leaveFormModal.id
                        ? "Edit Employee Leave Record"
                        : leaveFormModal.entryType === "credit_grant"
                        ? "Allocate Employee Leave Credits"
                        : "Record Filed / Approved Leave Used"}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Grant leave entitlements or log leave dates taken to monitor exact remaining leave days.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLeaveFormModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <datalist id="leave-employee-directory">
                {employeeSuggestionDirectory.map((cand) => (
                  <option key={cand.employeeName} value={cand.employeeName} />
                ))}
              </datalist>

              {/* Entry Mode Cards */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {[
                  {
                    id: "credit_grant",
                    title: "+ Allocate Leave Credits",
                    desc: "Grant annual / SIL / VL / SL credits",
                    activeCls: "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                  },
                  {
                    id: "leave_used",
                    title: "- Record Leave Used",
                    desc: "Deduct leave days taken by employee",
                    activeCls: "bg-indigo-600 text-white border-indigo-700 shadow-xs"
                  }
                ].map((opt) => {
                  const isActive = leaveFormModal.entryType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setLeaveFormModal((prev) => ({
                          ...prev,
                          entryType: opt.id,
                          days:
                            opt.id === "credit_grant"
                              ? Number(prev.days || 0) <= 1 ? "5" : prev.days
                              : String(computeInclusiveLeaveDays(prev.startDate, prev.endDate))
                        }))
                      }
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        isActive
                          ? opt.activeCls
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="font-black leading-tight">{opt.title}</div>
                      <div className={`text-[10px] mt-0.5 ${isActive ? "text-white/85" : "text-slate-500"}`}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Employee Full Name *</label>
                  <input
                    type="text"
                    required
                    list="leave-employee-directory"
                    value={leaveFormModal.employeeName}
                    placeholder="Type or pick employee name..."
                    onChange={(e) => {
                      const nextName = e.target.value;
                      const match = employeeSuggestionDirectory.find(
                        (c) => c.employeeName.toLowerCase() === nextName.trim().toLowerCase()
                      );
                      setLeaveFormModal((prev) => ({
                        ...prev,
                        employeeName: nextName,
                        ...(match
                          ? {
                              employeeId: prev.employeeId || match.employeeId,
                              position: prev.position || match.position,
                              department: prev.department || match.department,
                              companyId: match.companyId || prev.companyId
                            }
                          : {})
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Leave Category *</label>
                  <select
                    value={leaveFormModal.leaveType}
                    onChange={(e) =>
                      setLeaveFormModal((prev) => ({ ...prev, leaveType: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    {LEAVE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credit Year</label>
                  <input
                    type="number"
                    min="2020"
                    max="2050"
                    value={leaveFormModal.creditYear}
                    onChange={(e) =>
                      setLeaveFormModal((prev) => ({ ...prev, creditYear: Number(e.target.value) || 2026 }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {leaveFormModal.entryType === "credit_grant" ? "Effective Date" : "Leave Start Date"}
                  </label>
                  <input
                    type="date"
                    value={leaveFormModal.startDate}
                    onChange={(e) => {
                      const nextStart = e.target.value;
                      setLeaveFormModal((prev) => {
                        const nextEnd =
                          prev.endDate && prev.endDate >= nextStart ? prev.endDate : nextStart;
                        return {
                          ...prev,
                          startDate: nextStart,
                          endDate: nextEnd,
                          creditYear: nextStart ? Number(nextStart.slice(0, 4)) : prev.creditYear,
                          ...(prev.entryType === "leave_used"
                            ? { days: String(computeInclusiveLeaveDays(nextStart, nextEnd)) }
                            : {})
                        };
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {leaveFormModal.entryType === "credit_grant" ? "Expiry / Period End Date" : "Leave End Date"}
                  </label>
                  <input
                    type="date"
                    value={leaveFormModal.endDate}
                    min={leaveFormModal.startDate}
                    onChange={(e) => {
                      const nextEnd = e.target.value;
                      setLeaveFormModal((prev) => ({
                        ...prev,
                        endDate: nextEnd,
                        ...(prev.entryType === "leave_used"
                          ? { days: String(computeInclusiveLeaveDays(prev.startDate, nextEnd)) }
                          : {})
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {leaveFormModal.entryType === "credit_grant"
                      ? "Leave Credits Granted (Days) *"
                      : "Leave Days Used *"}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={leaveFormModal.days}
                    onChange={(e) => setLeaveFormModal((prev) => ({ ...prev, days: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border-2 border-indigo-300 bg-indigo-50/30 font-black text-right text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Approval Status</label>
                  <select
                    value={leaveFormModal.status}
                    onChange={(e) => setLeaveFormModal((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    <option value="Approved">Approved (Deducts from Balance)</option>
                    <option value="Pending">Pending Approval</option>
                    <option value="Cancelled">Cancelled / Rejected</option>
                  </select>
                </div>

                {/* Quick Day Presets */}
                <div className="sm:col-span-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10.5px] font-bold text-slate-500 mr-1">Quick Presets:</span>
                  {leaveFormModal.entryType === "credit_grant"
                    ? [
                        { label: "5 Days (DOLE SIL)", val: "5" },
                        { label: "10 Days", val: "10" },
                        { label: "12 Days", val: "12" },
                        { label: "15 Days", val: "15" }
                      ].map((p) => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setLeaveFormModal((prev) => ({ ...prev, days: p.val }))}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10.5px] font-bold cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))
                    : [
                        { label: "0.5 Day (Half-Day)", val: "0.5" },
                        { label: "1 Day", val: "1" },
                        { label: "2 Days", val: "2" },
                        {
                          label: "Match Date Range",
                          val: String(computeInclusiveLeaveDays(leaveFormModal.startDate, leaveFormModal.endDate))
                        }
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setLeaveFormModal((prev) => ({ ...prev, days: p.val }))}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-[10.5px] font-bold cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                </div>

                {/* Projected Remaining Leave Impact Preview */}
                {(existingEmpLeave || draftDays > 0) && (
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <span>Projected Remaining Leave Credits</span>
                      <span>Year {leaveFormModal.creditYear}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-white border border-slate-200 p-2">
                        <div className="text-[9.5px] font-bold text-slate-500">Total Credits</div>
                        <div className="text-xs font-black text-emerald-700 mt-0.5">
                          {formatLeaveDays(projCredits)} Day(s)
                        </div>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 p-2">
                        <div className="text-[9.5px] font-bold text-slate-500">Approved Used</div>
                        <div className="text-xs font-black text-amber-700 mt-0.5">
                          -{formatLeaveDays(projUsed)} Day(s)
                        </div>
                      </div>
                      <div className="rounded-lg bg-slate-900 text-white p-2">
                        <div className="text-[9.5px] font-bold text-slate-300">Remaining Left</div>
                        <div className="text-xs font-black text-indigo-300 mt-0.5">
                          {formatLeaveDays(projRemaining)} Day(s)
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Company Entity</label>
                  <select
                    value={leaveFormModal.companyId}
                    onChange={(e) =>
                      setLeaveFormModal((prev) => ({ ...prev, companyId: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold bg-white"
                  >
                    {COMPANIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch / Department</label>
                  <input
                    type="text"
                    value={leaveFormModal.department}
                    onChange={(e) =>
                      setLeaveFormModal((prev) => ({ ...prev, department: e.target.value }))
                    }
                    placeholder="e.g. Mandaue City"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Reason / Remarks</label>
                  <textarea
                    rows={2}
                    value={leaveFormModal.reason}
                    onChange={(e) => setLeaveFormModal((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g. Annual SIL credit grant or medical / personal leave reason..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 resize-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLeaveFormModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingLeave}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black cursor-pointer"
                >
                  <Check size={14} />
                  <span>
                    {isSavingLeave
                      ? "Saving..."
                      : leaveFormModal.entryType === "credit_grant"
                      ? "Save Leave Credits"
                      : "Save Leave Record"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* MODAL 7: EMPLOYEE LEAVE CREDITS & REMAINING BALANCE STATEMENT         */}
      {/* ===================================================================== */}
      {leaveStatementEmployee && (() => {
        const stmtCompany = resolveCompanyEntity(leaveStatementEmployee.companyId || selectedCompanyId);
        return (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-slate-100 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
              <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Employee Leave Credits &amp; Remaining Balance Statement
                    </h3>
                    <p className="text-[10.5px] text-slate-500">
                      Summary of allocated leave entitlements, filed leaves used, and exact remaining leave credits.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintLeaveStatement}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Print / Save PDF Statement</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeaveStatementEmpKey("")}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-5 overflow-y-auto">
                <div
                  ref={leaveStatementRef}
                  className="leave-statement-sheet bg-white border border-slate-300 rounded-xl p-6 space-y-5 text-slate-900 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-4 pb-3 border-b-2 border-indigo-600">
                    <div className="flex items-center gap-3">
                      {stmtCompany.logoUrl && (
                        <img
                          src={stmtCompany.logoUrl}
                          alt={stmtCompany.name}
                          className="w-11 h-11 object-contain shrink-0"
                        />
                      )}
                      <div>
                        <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
                          {stmtCompany.legalName || stmtCompany.name}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-semibold">
                          Human Resources &amp; Payroll • Official Leave Credits &amp; Balance Statement
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          leaveStatementEmployee.leaveStatus === "Available"
                            ? "bg-emerald-100 text-emerald-800"
                            : leaveStatementEmployee.leaveStatus === "Low Credits"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {leaveStatementEmployee.leaveStatus}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Generated: {new Date().toISOString().split("T")[0]}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
                    <div>
                      <div className="text-[9.5px] font-bold uppercase text-slate-400">Employee Name</div>
                      <div className="font-black text-slate-900 mt-0.5">{leaveStatementEmployee.employeeName}</div>
                    </div>
                    <div>
                      <div className="text-[9.5px] font-bold uppercase text-slate-400">Employee ID</div>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {leaveStatementEmployee.employeeId || "--"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9.5px] font-bold uppercase text-slate-400">Position</div>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {leaveStatementEmployee.position || "--"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9.5px] font-bold uppercase text-slate-400">Branch / Department</div>
                      <div className="font-bold text-slate-700 mt-0.5">
                        {leaveStatementEmployee.department || stmtCompany.name}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                      <div className="text-[9.5px] font-extrabold uppercase text-emerald-700">
                        Allocated Credits
                      </div>
                      <div className="text-base font-black text-emerald-900 mt-1">
                        {formatLeaveDays(leaveStatementEmployee.creditsTotal)} Day(s)
                      </div>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                      <div className="text-[9.5px] font-extrabold uppercase text-amber-700">
                        Used (Approved)
                      </div>
                      <div className="text-base font-black text-amber-800 mt-1">
                        -{formatLeaveDays(leaveStatementEmployee.usedTotal)} Day(s)
                      </div>
                    </div>
                    <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                      <div className="text-[9.5px] font-extrabold uppercase text-sky-700">
                        Pending Requests
                      </div>
                      <div className="text-base font-black text-sky-900 mt-1">
                        {formatLeaveDays(leaveStatementEmployee.pendingTotal)} Day(s)
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-900 bg-slate-900 text-white p-3">
                      <div className="text-[9.5px] font-extrabold uppercase text-slate-300">
                        Remaining Left
                      </div>
                      <div className="text-base font-black text-indigo-300 mt-1">
                        {formatLeaveDays(leaveStatementEmployee.remainingDays)} Day(s)
                      </div>
                    </div>
                  </div>

                  {leaveStatementEmployee.byLeaveType.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {leaveStatementEmployee.byLeaveType.map((cat) => (
                        <div
                          key={`stmt-cat-${cat.leaveType}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px]"
                        >
                          <span className="font-bold text-slate-800">{cat.leaveType}:</span>{" "}
                          <span className="text-emerald-700 font-bold">
                            +{formatLeaveDays(cat.credits)}
                          </span>{" "}
                          /{" "}
                          <span className="text-amber-700 font-bold">
                            -{formatLeaveDays(cat.used)}
                          </span>{" "}
                          <span className="font-black text-indigo-700">
                            ({formatLeaveDays(cat.remaining)} left)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9.5px]">
                        <tr>
                          <th className="py-2 px-2.5 text-center">#</th>
                          <th className="py-2 px-2.5">Dates &amp; Ref</th>
                          <th className="py-2 px-2.5">Category &amp; Remarks</th>
                          <th className="py-2 px-2.5 text-center">Status</th>
                          <th className="py-2 px-2.5 text-right">+ Credits</th>
                          <th className="py-2 px-2.5 text-right">- Used</th>
                          <th className="py-2 px-2.5 text-right">Remaining Bal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leaveStatementEmployee.timeline.map((step) => (
                          <tr key={`lv-stmt-${step.id}`}>
                            <td className="py-2 px-2.5 text-center font-bold text-slate-400">
                              {step.stepNumber}
                            </td>
                            <td className="py-2 px-2.5 whitespace-nowrap">
                              <div className="font-semibold">
                                {step.startDate || "--"}
                                {step.endDate && step.endDate !== step.startDate
                                  ? ` to ${step.endDate}`
                                  : ""}
                              </div>
                              <div className="font-mono text-[9.5px] text-slate-400">{step.leaveRef}</div>
                            </td>
                            <td className="py-2 px-2.5">
                              <div className="font-bold text-slate-800">
                                {step.entryType === "credit_grant"
                                  ? `Allocated Credits (${step.leaveType})`
                                  : step.leaveType}
                              </div>
                              {step.reason && (
                                <div className="text-[10px] text-slate-500">{step.reason}</div>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-center font-bold">{step.status}</td>
                            <td className="py-2 px-2.5 text-right font-bold text-emerald-700">
                              {step.signedDelta > 0 ? `+${formatLeaveDays(step.days)}` : "--"}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold text-amber-700">
                              {step.signedDelta < 0 ? `-${formatLeaveDays(step.days)}` : "--"}
                            </td>
                            <td className="py-2 px-2.5 text-right font-black text-slate-900">
                              {formatLeaveDays(step.balanceAfter)} Day(s)
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-[10.5px]">
                    <div>
                      <div className="border-b border-slate-400 pb-6 font-bold uppercase">
                        {currentUser?.name || "HRMD / PAYROLL ADMIN"}
                      </div>
                      <span className="text-[9.5px] text-slate-500 mt-1 block">
                        Prepared &amp; Certified by HR Department
                      </span>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-6 font-bold uppercase">
                        {leaveStatementEmployee.employeeName}
                      </div>
                      <span className="text-[9.5px] text-slate-500 mt-1 block">
                        Acknowledged by Employee / Date
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
