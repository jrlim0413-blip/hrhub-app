// payrollFileParser.js
// Unified Payroll & Compensation File Extraction Engine
// Supports Excel Workbooks (.xlsx, .xls, .xlsm, .ods, .csv), Embedded Excel Images,
// and Gemini Multimodal Vision OCR for Scanned Payroll Sheets & PDFs.

import * as XLSX from "xlsx";
import JSZip from "jszip";
import { API_CONFIG } from "../config/apiConfig.js";

export const PAYROLL_FIELD_DEFS = [
  {
    key: "seqNo",
    label: "Seq #",
    type: "text",
    aliases: ["seq", "seq no", "seq #", "sequence", "item no"]
  },
  {
    key: "employeeId",
    label: "Employee ID",
    type: "text",
    aliases: ["employee id", "emp id", "id no", "id number", "emp no", "employee no", "code", "badge", "biometric id"]
  },
  {
    key: "employeeName",
    label: "Employee Name",
    type: "text",
    required: true,
    aliases: ["employee name", "full name", "staff name", "personnel name", "worker name", "payee", "name of employee", "employee", "name"]
  },
  {
    key: "position",
    label: "Designation / Position",
    type: "text",
    aliases: ["designation", "position", "job title", "role", "title"]
  },
  {
    key: "department",
    label: "Department / Branch",
    type: "text",
    aliases: ["department", "dept", "branch", "station", "area", "division", "section", "location", "outlet", "booth", "site"]
  },
  {
    key: "monthlySalary",
    label: "Basic Monthly Salary",
    type: "number",
    aliases: ["basic monthly salary", "monthly basic salary", "monthly salary", "monthly basic", "monthly rate"]
  },
  {
    key: "dailyRate",
    label: "Rate Per Day",
    type: "number",
    aliases: ["rate per day", "daily rate", "rate/day", "day rate", "base rate", "salary rate", "rate"]
  },
  {
    key: "hourlyRate",
    label: "Rate Per Hour",
    type: "number",
    aliases: ["rate per hour", "hourly rate", "rate/hour", "rate per hr", "hour rate", "hr rate"]
  },
  {
    key: "daysWorked",
    label: "# of Days / Hrs",
    type: "number",
    aliases: ["# of days", "no of days", "no. of days", "number of days", "days worked", "days present", "worked days", "duty days", "days", "hours worked", "hrs"]
  },
  {
    key: "basicPay",
    label: "Total Basic Pay",
    type: "number",
    aliases: ["total basic pay", "basic pay", "earned basic", "regular pay", "basic salary", "base pay", "reg pay", "basic", "salary"]
  },
  {
    key: "allowance",
    label: "Allowance",
    type: "number",
    aliases: ["allowance", "allowances", "rice allowance", "transpo", "transportation", "cola", "incentive", "incentives", "commission", "bonus", "adjustment", "other earnings"]
  },
  {
    key: "mealAllowance",
    label: "Meal Allowance",
    type: "number",
    aliases: ["meal allowance", "meal allow", "food allowance", "meal"]
  },
  {
    key: "holidayNightPay",
    label: "Holiday / Night Diff",
    type: "number",
    aliases: ["holiday pay", "legal holiday", "special holiday", "night diff", "night differential", "rest day pay", "holiday/nd", "holiday", "nd pay", "nd"]
  },
  {
    key: "overtimePay",
    label: "Overtime Pay",
    type: "number",
    aliases: ["overtime pay", "overtime amount", "ot pay", "ot amount", "reg ot", "overtime", "ot"]
  },
  {
    key: "grossPay",
    label: "Gross Pay",
    type: "number",
    aliases: ["gross pay", "gross salary", "gross income", "total earnings", "total gross", "gross comp", "total compensation", "gross"]
  },
  {
    key: "philhealth",
    label: "PHIC (PhilHealth)",
    type: "number",
    aliases: ["philhealth contribution", "philhealth ee", "philhealth", "phic ee", "phic", "medicare"]
  },
  {
    key: "pagibig",
    label: "HDMF (Pag-IBIG)",
    type: "number",
    aliases: ["pag-ibig contribution", "pagibig contribution", "pag ibig", "pag-ibig", "pagibig", "hdmf ee", "hdmf"]
  },
  {
    key: "sss",
    label: "SSS Contribution",
    type: "number",
    aliases: ["sss contribution", "sss cont", "sss ee", "sss prem", "sss"]
  },
  {
    key: "withholdingTax",
    label: "Withholding Tax",
    type: "number",
    aliases: ["withholding tax", "w/holding tax", "w/tax", "w-tax", "wtax", "income tax", "bir tax", "tax"]
  },
  {
    key: "cashAdvance",
    label: "Salary Advancement / CA",
    type: "number",
    aliases: ["salary advancement", "salary advance ment", "salary advance", "cash advance", "cash advancement", "advancement", "advance", "c/a", "ca", "vales", "vale", "salary loan", "company loan"]
  },
  {
    key: "hdmfLoan",
    label: "HDMF / Pag-IBIG Loan",
    type: "number",
    aliases: ["hdmf loan", "pag-ibig loan", "pagibig loan", "pag ibig loan", "hdmf calamity loan", "mpl loan"]
  },
  {
    key: "sssLoan",
    label: "SSS Loan",
    type: "number",
    aliases: ["sss loan", "sss salary loan", "sss calamity loan"]
  },
  {
    key: "otherDeductions",
    label: "Late / Undertime / Other Ded.",
    type: "number",
    aliases: ["late undertime", "late/undertime", "late und ertime", "late / undertime", "undertime", "late", "tardiness", "other deductions", "other ded", "absent", "absences", "lwop", "shortage", "shortages", "penalty", "misc deduction", "deductions adj"]
  },
  {
    key: "totalDeductions",
    label: "Total Deductions",
    type: "number",
    aliases: ["total deductions", "total ded", "total deduction", "all deductions", "less deductions", "deductions"]
  },
  {
    key: "netPay",
    label: "Net Pay (Take-Home)",
    type: "number",
    aliases: ["net pay", "net salary", "net income", "net take home", "take home pay", "take home", "net amount", "amount due", "net"]
  },
  {
    key: "paymentMode",
    label: "Payment Mode / Bank",
    type: "text",
    aliases: ["payment mode", "pay mode", "disbursement", "bank", "account", "atm", "gcash", "bdo", "bpi", "payout method"]
  },
  {
    key: "remarks",
    label: "Remarks / Notes",
    type: "text",
    aliases: ["remarks", "notes", "comment", "comments", "status note"]
  }
];

const GEMINI_VISION_MODELS = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite"
];

export function round2(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
}

/**
 * Parses currency strings, parenthetical negatives, and formatted cells cleanly.
 */
export function normalizeMoney(raw, { forceAbsolute = false } = {}) {
  if (raw === null || raw === undefined || raw === "") return 0;
  if (typeof raw === "number") {
    const clean = Number.isFinite(raw) ? raw : 0;
    return round2(forceAbsolute ? Math.abs(clean) : clean);
  }

  let str = String(raw).trim();
  if (!str || str === "-" || str === "--" || str === "—") return 0;

  const isParenNegative = /^\(.*\)$/.test(str);
  str = str
    .replace(/[₱$,\s]/g, "")
    .replace(/^(PHP|Php|php)/, "")
    .replace(/[()]/g, "");

  if (str.endsWith("-")) {
    str = `-${str.slice(0, -1)}`;
  }

  const parsed = parseFloat(str);
  if (!Number.isFinite(parsed)) return 0;
  const signed = isParenNegative ? -Math.abs(parsed) : parsed;
  return round2(forceAbsolute ? Math.abs(signed) : signed);
}

/**
 * Computes consistent Gross Pay, Total Deductions, and Net Pay for a payroll row.
 * - mode === "initial": preserves explicit sheet/OCR Gross, Total Deductions, and Net Pay when present,
 *   computing only missing totals and recording any math variance.
 * - mode === "recompute": recalculates Gross, Total Deductions, and Net Pay from edited components.
 */
export function recalculateCompensationRow(rawRow = {}, mode = "recompute") {
  const monthlySalary = normalizeMoney(rawRow.monthlySalary, { forceAbsolute: true });
  const daysWorked = normalizeMoney(rawRow.daysWorked, { forceAbsolute: true });
  const dailyRate = normalizeMoney(rawRow.dailyRate, { forceAbsolute: true });
  const hourlyRate = normalizeMoney(rawRow.hourlyRate, { forceAbsolute: true });
  const basicPay = normalizeMoney(rawRow.basicPay, { forceAbsolute: true });
  const allowance = normalizeMoney(rawRow.allowance, { forceAbsolute: true });
  const mealAllowance = normalizeMoney(rawRow.mealAllowance, { forceAbsolute: true });
  const holidayNightPay = normalizeMoney(rawRow.holidayNightPay, { forceAbsolute: true });
  const overtimePay = normalizeMoney(rawRow.overtimePay, { forceAbsolute: true });

  const sss = normalizeMoney(rawRow.sss, { forceAbsolute: true });
  const philhealth = normalizeMoney(rawRow.philhealth, { forceAbsolute: true });
  const pagibig = normalizeMoney(rawRow.pagibig, { forceAbsolute: true });
  const withholdingTax = normalizeMoney(rawRow.withholdingTax, { forceAbsolute: true });
  const cashAdvance = normalizeMoney(rawRow.cashAdvance, { forceAbsolute: true });
  const hdmfLoan = normalizeMoney(rawRow.hdmfLoan, { forceAbsolute: true });
  const sssLoan = normalizeMoney(rawRow.sssLoan, { forceAbsolute: true });
  const otherDeductions = normalizeMoney(rawRow.otherDeductions, { forceAbsolute: true });

  const derivedBasic = basicPay > 0 ? basicPay : (daysWorked > 0 && dailyRate > 0 ? round2(daysWorked * dailyRate) : 0);
  const componentsGross = round2(derivedBasic + allowance + mealAllowance + overtimePay + holidayNightPay);
  const componentsDed = round2(
    sss + philhealth + pagibig + withholdingTax + cashAdvance + hdmfLoan + sssLoan + otherDeductions
  );

  const rawGross = normalizeMoney(rawRow.grossPay, { forceAbsolute: true });
  const rawDed = normalizeMoney(rawRow.totalDeductions, { forceAbsolute: true });
  const hasExplicitNet = rawRow.netPay !== undefined && rawRow.netPay !== null && String(rawRow.netPay).trim() !== "";
  const rawNet = normalizeMoney(rawRow.netPay);

  let grossPay;
  let totalDeductions;
  let netPay;

  if (mode === "initial") {
    grossPay = rawGross > 0 ? rawGross : componentsGross;
    totalDeductions = rawDed > 0 ? rawDed : componentsDed;
    netPay = hasExplicitNet ? round2(rawNet) : round2(Math.max(0, grossPay - totalDeductions));
  } else {
    grossPay = componentsGross > 0 || rawRow._editedComponent === "earning" ? componentsGross : rawGross;
    totalDeductions = componentsDed > 0 || rawRow._editedComponent === "deduction" ? componentsDed : rawDed;
    netPay = round2(Math.max(0, grossPay - totalDeductions));
  }

  const effectiveBasic = derivedBasic;
  const expectedNet = round2(grossPay - totalDeductions);
  const mathVariance = round2(expectedNet - netPay);

  return {
    id: rawRow.id || `payrow_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    seqNo: rawRow.seqNo !== undefined && rawRow.seqNo !== null ? String(rawRow.seqNo).trim() : "",
    employeeId: String(rawRow.employeeId || "").trim(),
    employeeName: String(rawRow.employeeName || "").trim(),
    position: String(rawRow.position || "").trim(),
    department: String(rawRow.department || "").trim(),
    monthlySalary,
    daysWorked,
    dailyRate,
    hourlyRate,
    basicPay: effectiveBasic,
    allowance,
    mealAllowance,
    holidayNightPay,
    overtimePay,
    grossPay,
    philhealth,
    pagibig,
    sss,
    withholdingTax,
    cashAdvance,
    hdmfLoan,
    sssLoan,
    otherDeductions,
    totalDeductions,
    netPay,
    paymentMode: String(rawRow.paymentMode || "Direct Payroll").trim() || "Direct Payroll",
    status: String(rawRow.status || "Verified").trim() || "Verified",
    remarks: String(rawRow.remarks || "").trim(),
    mathVariance
  };
}

function formatCellValue(cell) {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    const y = cell.getFullYear();
    const m = String(cell.getMonth() + 1).padStart(2, "0");
    const d = String(cell.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(cell).trim();
}

const MONTH_MAP = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12"
};

/**
 * Converts common release date formats (e.g. "OCTOBER 30, 2026", "10/30/2026", "2026-10-30")
 * into ISO YYYY-MM-DD format for <input type="date">.
 */
export function parseNaturalDateToIso(rawText) {
  const clean = String(rawText || "").trim();
  if (!clean) return "";

  const isoMatch = clean.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const mdyText = clean.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (mdyText) {
    const m = MONTH_MAP[mdyText[1].toLowerCase()];
    if (m) {
      return `${mdyText[3]}-${m}-${mdyText[2].padStart(2, "0")}`;
    }
  }

  const dmyText = clean.match(/\b(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})\b/);
  if (dmyText) {
    const m = MONTH_MAP[dmyText[2].toLowerCase()];
    if (m) {
      return `${dmyText[3]}-${m}-${dmyText[1].padStart(2, "0")}`;
    }
  }

  const slashMdy = clean.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (slashMdy) {
    return `${slashMdy[3]}-${slashMdy[1].padStart(2, "0")}-${slashMdy[2].padStart(2, "0")}`;
  }

  return "";
}

function normalizeHeaderText(val) {
  return String(val || "")
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/[._:/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Scores a normalized header against all canonical payroll field aliases.
 */
function scoreHeaderMatch(headerText, fieldDef) {
  const norm = normalizeHeaderText(headerText);
  if (!norm || /^\d+$/.test(norm)) return 0;

  // Mutual-exclusion guards so loan/meal/monthly columns never steal base fields
  if (fieldDef.key === "sss" && norm.includes("loan")) return 0;
  if (fieldDef.key === "pagibig" && norm.includes("loan")) return 0;
  if (fieldDef.key === "allowance" && norm.includes("meal")) return 0;
  if (fieldDef.key === "basicPay" && norm.includes("monthly")) return 0;
  if (fieldDef.key === "seqNo" && (norm.includes("days") || norm.includes("id"))) return 0;

  let best = 0;
  for (const alias of fieldDef.aliases) {
    const cleanAlias = normalizeHeaderText(alias);
    if (!cleanAlias) continue;
    if (norm === cleanAlias) {
      best = Math.max(best, 1000 + cleanAlias.length);
    } else if (new RegExp(`(^|\\s)${escapeRegExp(cleanAlias)}(\\s|$)`).test(norm)) {
      best = Math.max(best, 500 + cleanAlias.length);
    } else if (cleanAlias.length >= 4 && norm.includes(cleanAlias)) {
      best = Math.max(best, 100 + cleanAlias.length);
    }
  }
  return best;
}

/**
 * Automatically maps spreadsheet headers to canonical payroll fields without collisions.
 */
export function autoMapColumns(headers = []) {
  const candidates = [];
  headers.forEach((hdr, colIdx) => {
    const cleanHdr = normalizeHeaderText(hdr);
    if (!cleanHdr) return;
    PAYROLL_FIELD_DEFS.forEach((field) => {
      const score = scoreHeaderMatch(cleanHdr, field);
      if (score > 0) {
        candidates.push({ colIdx, fieldKey: field.key, score });
      }
    });
  });

  candidates.sort((a, b) => b.score - a.score);

  const mapping = {};
  const usedFields = new Set();
  const usedCols = new Set();

  for (const c of candidates) {
    if (usedFields.has(c.fieldKey) || usedCols.has(c.colIdx)) continue;
    mapping[c.fieldKey] = c.colIdx;
    usedFields.add(c.fieldKey);
    usedCols.add(c.colIdx);
  }

  // Fallback for split "Last Name" / "First Name" columns when full employeeName wasn't matched
  if (mapping.employeeName === undefined) {
    const lastIdx = headers.findIndex((h) => normalizeHeaderText(h).includes("last name"));
    const firstIdx = headers.findIndex((h) => normalizeHeaderText(h).includes("first name"));
    if (lastIdx !== -1 && firstIdx !== -1) {
      mapping._splitLastName = lastIdx;
      mapping._splitFirstName = firstIdx;
      mapping.employeeName = firstIdx;
    }
  }

  return mapping;
}

function countRowNumericValues(row = []) {
  if (!Array.isArray(row)) return 0;
  return row.filter((v) => {
    if (typeof v === "number") return Number.isFinite(v);
    const s = String(v || "").trim();
    return s !== "" && /^[₱$\d,().-]+$/.test(s) && /\d/.test(s);
  }).length;
}

/**
 * Scans the first 25 rows to locate single-row OR two-tier vertically merged payroll headers
 * plus company, branch, pay period, and release date metadata above the table.
 */
export function detectPayrollHeaderRow(matrix = [], merges = []) {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return {
      headerRowIndex: 0,
      headers: [],
      detectedCompanyName: "",
      detectedBranch: "",
      detectedPayPeriod: "",
      detectedPayDate: "",
      matchScore: 0
    };
  }

  const scanLimit = Math.min(matrix.length, 25);
  let bestIndex = 0;
  let bestBannerEnd = 0;
  let bestScore = -1;
  let bestHeaders = [];

  for (let r = 0; r < scanLimit; r++) {
    const row = Array.isArray(matrix[r]) ? matrix[r] : [];
    const nonEmpty = row.map(formatCellValue).filter(Boolean);
    if (nonEmpty.length < 2) continue;

    // Evaluate single-row header candidate
    const mapping = autoMapColumns(row);
    const mappedKeys = Object.keys(mapping).filter((k) => !k.startsWith("_"));
    let rowScore = mappedKeys.length * 10;
    if (mapping.employeeName !== undefined) rowScore += 25;
    if (mapping.basicPay !== undefined || mapping.grossPay !== undefined || mapping.monthlySalary !== undefined) rowScore += 15;
    if (mapping.netPay !== undefined) rowScore += 15;

    const nextRow = matrix[r + 1];
    if (Array.isArray(nextRow)) {
      const nextNumericCount = countRowNumericValues(nextRow);
      if (nextNumericCount >= 2) rowScore += 10;
    }

    const prevRow = r > 0 && Array.isArray(matrix[r - 1]) ? matrix[r - 1] : [];
    const singleHeaders = [];
    const singleColCount = Math.max(row.length, prevRow.length);
    for (let c = 0; c < singleColCount; c++) {
      const main = formatCellValue(row[c]);
      const parent = formatCellValue(prevRow[c]);
      singleHeaders.push(main || parent || `Column ${c + 1}`);
    }

    if (rowScore > bestScore) {
      bestScore = rowScore;
      bestIndex = r;
      bestBannerEnd = r;
      bestHeaders = singleHeaders;
    }

    // Evaluate two-tier merged header candidate (Row r = main + ADDITIONALS/DEDUCTIONS, Row r+1 = sub-columns)
    if (r + 1 < scanLimit && Array.isArray(nextRow)) {
      const nextNumericCount = countRowNumericValues(nextRow);
      const nextMapping = autoMapColumns(nextRow);
      const nextMappedKeys = Object.keys(nextMapping).filter((k) => !k.startsWith("_"));
      const hasVerticalMerge =
        Array.isArray(merges) &&
        merges.some((m) => m?.s?.r === r && m?.e?.r === r + 1);

      if (
        (nextNumericCount <= 1 && nextMappedKeys.length >= 2 && mappedKeys.length >= 2) ||
        (hasVerticalMerge && nextNumericCount <= 1 && nextMappedKeys.length >= 1)
      ) {
        const colCount = Math.max(row.length, nextRow.length);
        const compositeHeaders = [];
        for (let c = 0; c < colCount; c++) {
          const upper = formatCellValue(row[c]);
          const lower = formatCellValue(nextRow[c]);
          compositeHeaders.push(lower || upper || `Column ${c + 1}`);
        }
        const compositeMap = autoMapColumns(compositeHeaders);
        const compositeKeys = Object.keys(compositeMap).filter((k) => !k.startsWith("_"));

        if (compositeKeys.length > Math.max(mappedKeys.length, nextMappedKeys.length)) {
          let twoTierScore = compositeKeys.length * 10 + 30;
          if (compositeMap.employeeName !== undefined) twoTierScore += 25;
          if (compositeMap.basicPay !== undefined || compositeMap.grossPay !== undefined) twoTierScore += 15;
          if (compositeMap.netPay !== undefined) twoTierScore += 15;

          const rowAfterSub = matrix[r + 2];
          if (Array.isArray(rowAfterSub) && countRowNumericValues(rowAfterSub) >= 2) {
            twoTierScore += 15;
          }

          if (twoTierScore > bestScore) {
            bestScore = twoTierScore;
            bestIndex = r + 1;
            bestBannerEnd = r;
            bestHeaders = compositeHeaders;
          }
        }
      }
    }
  }

  // Extract banner metadata (Company, Branch/City, Pay Period / Date Covered, Release Date)
  let detectedCompanyName = "";
  let detectedBranch = "";
  let detectedPayPeriod = "";
  let detectedPayDate = "";

  for (let r = 0; r < bestBannerEnd; r++) {
    const cells = (matrix[r] || []).map(formatCellValue).filter(Boolean);
    if (cells.length === 0) continue;

    // Split any combined cell segments by pipe if present, otherwise inspect cell-by-cell
    const segments = [];
    cells.forEach((cellTxt) => {
      cellTxt.split("|").forEach((part) => {
        const trimmed = part.trim();
        if (trimmed) segments.push(trimmed);
      });
    });

    for (const seg of segments) {
      if (!detectedCompanyName && /(corporation|corp\.?|inc\.?|opc|company|companies|enterprise|gaming|construction|betplay|simpal|royal|glowing|imperial)/i.test(seg)) {
        detectedCompanyName = seg.slice(0, 120);
        continue;
      }

      if (/\b(?:release\s*date|pay(?:out)?\s*date|date\s*released|date\s*of\s*release)\b/i.test(seg)) {
        const dateValText = seg
          .replace(/^.*?\b(?:release\s*date|pay(?:out)?\s*date|date\s*released|date\s*of\s*release)\s*[:-]?\s*/i, "")
          .trim();
        const iso = parseNaturalDateToIso(dateValText || seg);
        if (iso && !detectedPayDate) {
          detectedPayDate = iso;
        }
        continue;
      }

      if (
        !detectedPayPeriod &&
        /(date\s*covered|period|cutoff|cut-off|payroll\s+for|cover|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}[-/]\d{1,2})/i.test(seg)
      ) {
        const candidatePeriod = seg
          .replace(/^(?:(?:pay(?:roll)?\s*(?:register|summary|sheet)?\s*(?:for\s+(?:the\s+)?)?(?:period(?:\s*covered)?)?)|(?:date\s*covered)|(?:period(?:\s*covered)?)|(?:cut-?off))\s*[:-]?\s*/i, "")
          .trim()
          .slice(0, 80);
        if (candidatePeriod) {
          detectedPayPeriod = candidatePeriod;
        }
        continue;
      }

      if (
        !detectedBranch &&
        detectedCompanyName &&
        seg.length >= 3 &&
        seg.length <= 60 &&
        !/^(employees?\s+salary|payroll|salary\s+register|earnings|deductions|additionals|compensation|sheet|confidential)$/i.test(seg)
      ) {
        detectedBranch = seg.replace(/^(?:branch|location|city|area)\s*[:-]?\s*/i, "").trim();
      }
    }
  }

  return {
    headerRowIndex: bestIndex,
    bannerEndIndex: bestBannerEnd,
    headers: bestHeaders,
    detectedCompanyName,
    detectedBranch,
    detectedPayPeriod,
    detectedPayDate,
    matchScore: bestScore
  };
}

const SKIP_ROW_PATTERNS = [
  /^(grand\s*)?totals?$/i,
  /^sub[\s-]*totals?$/i,
  /^prepared\s+by/i,
  /^checked\s+by/i,
  /^approved\s+by/i,
  /^noted\s+by/i,
  /^verified\s+by/i,
  /^received\s+by/i,
  /^signature/i,
  /^page\s+\d+/i,
  /^[-=_*]{3,}$/
];

const RECONCILE_COMPONENT_KEYS = [
  ["allowance", "Allowance"],
  ["mealAllowance", "Meal Allowance"],
  ["holidayNightPay", "Holiday / ND"],
  ["overtimePay", "Overtime"],
  ["philhealth", "PHIC (PhilHealth)"],
  ["pagibig", "HDMF (Pag-IBIG)"],
  ["sss", "SSS"],
  ["withholdingTax", "W/Tax"],
  ["cashAdvance", "Salary Advancement / CA"],
  ["hdmfLoan", "HDMF Loan"],
  ["sssLoan", "SSS Loan"],
  ["otherDeductions", "Late / Undertime / Other"]
];

const ALL_MONEY_KEYS = [
  "basicPay",
  "allowance",
  "mealAllowance",
  "holidayNightPay",
  "overtimePay",
  "grossPay",
  "philhealth",
  "pagibig",
  "sss",
  "withholdingTax",
  "cashAdvance",
  "hdmfLoan",
  "sssLoan",
  "otherDeductions",
  "totalDeductions",
  "netPay"
];

/**
 * Returns true if an extracted/staged compensation row is blank or has zero payroll activity
 * (empty name OR 0 days worked with all earnings, deductions, and net pay equal to 0).
 */
export function isEmptyCompensationRow(row) {
  if (!row || !String(row.employeeName || "").trim()) return true;
  const days = Number(row.daysWorked || 0);
  if (days > 0) return false;
  return ALL_MONEY_KEYS.every((k) => Math.abs(Number(row[k] || 0)) < 0.005);
}

/**
 * Converts raw matrix rows below headerRowIndex into normalized compensation records.
 */
export function buildCompensationRecordsFromMatrix(matrix = [], headerRowIndex = 0, columnMap = {}, options = {}) {
  const records = [];
  const defaultDepartment = String(options?.defaultDepartment || "").trim();

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = Array.isArray(matrix[r]) ? matrix[r] : [];
    const joined = row.map(formatCellValue).filter(Boolean).join(" ").trim();
    if (!joined) continue;

    // Determine employee name (handling split last/first name if present)
    let empName = "";
    if (columnMap._splitLastName !== undefined && columnMap._splitFirstName !== undefined) {
      const last = formatCellValue(row[columnMap._splitLastName]);
      const first = formatCellValue(row[columnMap._splitFirstName]);
      empName = [first, last].filter(Boolean).join(" ").trim();
    } else if (columnMap.employeeName !== undefined) {
      empName = formatCellValue(row[columnMap.employeeName]);
    }

    const firstTextCell = empName || formatCellValue(row[0]) || "";
    const normalizedFirst = firstTextCell.replace(/[:.]+$/, "").trim();
    if (
      SKIP_ROW_PATTERNS.some((re) => re.test(normalizedFirst)) ||
      /\bgrand\s*total\b/i.test(joined) ||
      /^\s*total\s*[:-]?$/i.test(normalizedFirst)
    ) {
      continue;
    }

    // Extract fields according to columnMap
    const rawObj = {};
    PAYROLL_FIELD_DEFS.forEach((def) => {
      if (def.key === "employeeName" && empName) {
        rawObj.employeeName = empName;
        return;
      }
      const colIdx = columnMap[def.key];
      if (colIdx !== undefined && colIdx !== null && colIdx !== "") {
        rawObj[def.key] = row[colIdx];
      }
    });

    if (!rawObj.department && defaultDepartment) {
      rawObj.department = defaultDepartment;
    }

    const normalized = recalculateCompensationRow(rawObj, "initial");

    if (!options?.includeEmptyRows && isEmptyCompensationRow(normalized)) {
      continue;
    }

    // Skip rows with neither an employee name nor any monetary value when includeEmptyRows is true
    const hasMoney =
      normalized.basicPay > 0 ||
      normalized.grossPay > 0 ||
      normalized.netPay > 0 ||
      normalized.totalDeductions > 0;

    if (!normalized.employeeName && !hasMoney) continue;
    if (!normalized.employeeName) {
      // Avoid importing footer summary rows that only carry a total number without a name
      if (!rawObj.employeeId) continue;
      normalized.employeeName = `Employee ${rawObj.employeeId}`;
    }

    records.push({
      ...normalized,
      sourceRowNumber: r + 1
    });
  }

  return records;
}

/**
 * Extracts Excel's own summary footer totals ("TOTAL" or "GRAND TOTAL" row) so extracted rows
 * can be reconciled against the source spreadsheet totals before saving.
 */
export function extractPayrollFooterTotals(matrix = [], headerRowIndex = 0, columnMap = {}) {
  const emptyResult = { found: false, label: "", sourceRowNumber: null, totals: {}, presentKeys: [] };
  if (!Array.isArray(matrix) || matrix.length <= headerRowIndex + 1) return emptyResult;

  let chosenRowIdx = -1;
  let chosenLabel = "";
  let foundGrandTotal = false;

  for (let r = headerRowIndex + 1; r < matrix.length; r++) {
    const row = Array.isArray(matrix[r]) ? matrix[r] : [];
    const cells = row.map(formatCellValue).filter(Boolean);
    if (cells.length === 0) continue;

    const joined = cells.join(" ");
    if (/\bsub[\s-]*totals?\b/i.test(joined)) continue;

    const empCell = columnMap.employeeName !== undefined ? formatCellValue(row[columnMap.employeeName]) : "";
    const firstCell = formatCellValue(row[0]);
    const isGrand = /\bgrand\s*totals?\b/i.test(joined);
    const hasExactTotalCell =
      /^(grand\s*)?totals?\s*[:-]?$/i.test(empCell) ||
      /^(grand\s*)?totals?\s*[:-]?$/i.test(firstCell) ||
      cells.some((c) => /^(grand\s*)?totals?\s*[:-]?$/i.test(c));

    if (!isGrand && !hasExactTotalCell) continue;
    if (countRowNumericValues(row) === 0) continue;

    if (isGrand) {
      chosenRowIdx = r;
      chosenLabel = "GRAND TOTAL";
      foundGrandTotal = true;
    } else if (!foundGrandTotal) {
      chosenRowIdx = r;
      chosenLabel = cells.find((c) => /totals?/i.test(c)) || "TOTAL";
    }
  }

  if (chosenRowIdx === -1) return emptyResult;

  const targetRow = matrix[chosenRowIdx] || [];
  const totals = {};
  const presentKeys = [];

  ALL_MONEY_KEYS.forEach((key) => {
    const colIdx = columnMap[key];
    if (colIdx === undefined || colIdx === null || colIdx === "") return;
    const rawStr = formatCellValue(targetRow[colIdx]);
    if (rawStr === "") return;
    totals[key] = normalizeMoney(targetRow[colIdx], { forceAbsolute: key !== "netPay" });
    presentKeys.push(key);
  });

  // Derive footer Gross / Total Deductions if sheet omits explicit Gross/Ded columns (like Lucky Betplay format)
  const hasAnyEarning = ["basicPay", "allowance", "mealAllowance", "holidayNightPay", "overtimePay"].some((k) =>
    presentKeys.includes(k)
  );
  if (!presentKeys.includes("grossPay") && hasAnyEarning) {
    totals.grossPay = round2(
      Number(totals.basicPay || 0) +
        Number(totals.allowance || 0) +
        Number(totals.mealAllowance || 0) +
        Number(totals.holidayNightPay || 0) +
        Number(totals.overtimePay || 0)
    );
    presentKeys.push("grossPay");
  }

  const hasAnyDeduction = [
    "philhealth",
    "pagibig",
    "sss",
    "withholdingTax",
    "cashAdvance",
    "hdmfLoan",
    "sssLoan",
    "otherDeductions"
  ].some((k) => presentKeys.includes(k));
  if (!presentKeys.includes("totalDeductions") && hasAnyDeduction) {
    totals.totalDeductions = round2(
      Number(totals.philhealth || 0) +
        Number(totals.pagibig || 0) +
        Number(totals.sss || 0) +
        Number(totals.withholdingTax || 0) +
        Number(totals.cashAdvance || 0) +
        Number(totals.hdmfLoan || 0) +
        Number(totals.sssLoan || 0) +
        Number(totals.otherDeductions || 0)
    );
    presentKeys.push("totalDeductions");
  }

  return {
    found: presentKeys.length > 0,
    label: chosenLabel,
    sourceRowNumber: chosenRowIdx + 1,
    totals,
    presentKeys
  };
}

/**
 * Compares extracted staging employee totals against the Excel footer row and/or manual control net total.
 */
export function reconcilePayrollTotals(records = [], reportedTotals = null, manualControlNetPay = "") {
  const stagedTotals = {};
  ALL_MONEY_KEYS.forEach((k) => {
    stagedTotals[k] = 0;
  });

  records.forEach((r) => {
    ALL_MONEY_KEYS.forEach((k) => {
      stagedTotals[k] = round2(stagedTotals[k] + Number(r?.[k] || 0));
    });
  });

  const hasManualControl =
    manualControlNetPay !== undefined &&
    manualControlNetPay !== null &&
    String(manualControlNetPay).trim() !== "" &&
    Number.isFinite(Number(String(manualControlNetPay).replace(/[₱$,\s]/g, "")));
  const manualNet = hasManualControl ? normalizeMoney(manualControlNetPay, { forceAbsolute: true }) : null;

  const hasExcelFooter = Boolean(reportedTotals?.found);
  const excelTotals = reportedTotals?.totals || {};
  const presentSet = new Set(reportedTotals?.presentKeys || []);

  const makeCheck = (key, label, overrideExpected = null) => {
    const extracted = round2(stagedTotals[key] || 0);
    const hasExpected = overrideExpected !== null || (hasExcelFooter && presentSet.has(key));
    const expected = overrideExpected !== null ? round2(overrideExpected) : hasExpected ? round2(excelTotals[key] || 0) : null;
    const diff = hasExpected ? round2(extracted - expected) : null;
    const absDiff = diff === null ? 0 : Math.abs(diff);
    return {
      key,
      label,
      extracted,
      expected,
      diff,
      hasExpected,
      isExact: hasExpected && absDiff < 0.01,
      isWithinRounding: hasExpected && absDiff <= 1.0,
      isMismatch: hasExpected && absDiff > 1.0
    };
  };

  const primaryChecks = [
    makeCheck("basicPay", "Total Basic Pay"),
    makeCheck("grossPay", "Total Gross Pay"),
    makeCheck("totalDeductions", "Total Deductions"),
    makeCheck("netPay", "Total Net Pay (Take-Home)", hasManualControl ? manualNet : null)
  ];

  const componentChecks = RECONCILE_COMPONENT_KEYS.map(([key, label]) => makeCheck(key, label)).filter(
    (c) => c.hasExpected && (c.extracted !== 0 || (c.expected || 0) !== 0)
  );

  const rowVarianceCount = records.filter((r) => Math.abs(Number(r?.mathVariance || 0)) > 1).length;
  const smallRoundingRowCount = records.filter((r) => {
    const v = Math.abs(Number(r?.mathVariance || 0));
    return v > 0.005 && v <= 1;
  }).length;

  const checkedAll = [...primaryChecks, ...componentChecks].filter((c) => c.hasExpected);
  const netCheck = primaryChecks.find((c) => c.key === "netPay");

  let status = "NO_REFERENCE";
  if (checkedAll.length > 0) {
    if (checkedAll.some((c) => c.isMismatch) || rowVarianceCount > 0) {
      status = "MISMATCH";
    } else if (checkedAll.some((c) => !c.isExact && c.isWithinRounding)) {
      status = "ROUNDING_DIFF";
    } else {
      status = "COINCIDES";
    }
  } else if (rowVarianceCount > 0) {
    status = "MISMATCH";
  }

  return {
    status,
    stagedTotals,
    primaryChecks,
    componentChecks,
    rowVarianceCount,
    smallRoundingRowCount,
    hasExcelFooter,
    hasManualControl,
    footerLabel: reportedTotals?.label || "",
    footerRowNumber: reportedTotals?.sourceRowNumber || null,
    netPayDiff: netCheck?.diff ?? null
  };
}

/**
 * Extracts raw dataUrl and mimeType cleanly.
 */
function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64Data: match[2] };
}

function fileToDataUrl(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file contents"));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Parses an image or PDF payroll register / payslip sheet using Gemini Multimodal Vision OCR.
 */
export async function parsePayrollWithOcr(fileOrBlob, overrideFileName = "") {
  const apiKey = API_CONFIG.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini OCR API key is not configured in API Configuration.");
  }

  const fileName = overrideFileName || fileOrBlob?.name || "payroll_scan.png";
  const dataUrl = typeof fileOrBlob === "string" ? fileOrBlob : await fileToDataUrl(fileOrBlob);
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    throw new Error("Unsupported image or PDF format for OCR scanning.");
  }

  const prompt = `You are a Philippine Payroll & Compensation OCR Extraction Engine.
Carefully perform Optical Character Recognition (OCR) on the attached payroll sheet, Excel screenshot, table printout, or payslip PDF/image.
Extract EVERY employee row and financial figure cleanly without guessing missing employees.

Column mapping rules for Philippine payroll registers:
- "DESIGNATION" -> position
- "BASIC MONTHLY SALARY" -> monthlySalary
- "RATE PER DAY" -> dailyRate
- "RATE PER HOUR" -> hourlyRate
- "# OF DAYS" -> daysWorked
- "TOTAL BASIC PAY" -> basicPay
- "ALLOWANCE" -> allowance
- "MEAL ALLOWANCE" -> mealAllowance
- "HOLIDAY PAY" -> holidayNightPay
- "OVERTIME" -> overtimePay
- "PHIC" -> philhealth
- "HDMF" -> pagibig
- "SSS" -> sss
- "SALARY ADVANCEMENT" / "CASH ADVANCE" -> cashAdvance
- "HDMF LOAN" -> hdmfLoan
- "SSS LOAN" -> sssLoan
- "LATE/UNDERTIME" -> otherDeductions
- "DATE COVERED" -> payPeriod, "RELEASE DATE" -> payDate (YYYY-MM-DD)

Return ONLY valid JSON without markdown code fences using this exact schema:
{
  "companyName": "Detected company name or empty string",
  "branchLocation": "Detected city/branch header or empty string",
  "payPeriod": "Detected date covered / payroll period or empty string",
  "payDate": "Detected release/payout date YYYY-MM-DD or empty string",
  "ocrSummary": "Brief note of what header/columns were read by OCR",
  "rows": [
    {
      "seqNo": "Sequence # or empty string",
      "employeeId": "ID code or empty string",
      "employeeName": "Full employee name",
      "position": "Designation/role or empty string",
      "department": "Branch/department or empty string",
      "monthlySalary": 0,
      "dailyRate": 0,
      "hourlyRate": 0,
      "daysWorked": 0,
      "basicPay": 0,
      "allowance": 0,
      "mealAllowance": 0,
      "holidayNightPay": 0,
      "overtimePay": 0,
      "grossPay": 0,
      "philhealth": 0,
      "pagibig": 0,
      "sss": 0,
      "withholdingTax": 0,
      "cashAdvance": 0,
      "hdmfLoan": 0,
      "sssLoan": 0,
      "otherDeductions": 0,
      "totalDeductions": 0,
      "netPay": 0,
      "paymentMode": "Direct Payroll",
      "remarks": ""
    }
  ],
  "reportedTotals": {
    "found": true,
    "label": "TOTAL or GRAND TOTAL row label if visible, else empty string",
    "basicPay": 0,
    "allowance": 0,
    "mealAllowance": 0,
    "holidayNightPay": 0,
    "overtimePay": 0,
    "grossPay": 0,
    "philhealth": 0,
    "pagibig": 0,
    "sss": 0,
    "withholdingTax": 0,
    "cashAdvance": 0,
    "hdmfLoan": 0,
    "sssLoan": 0,
    "otherDeductions": 0,
    "totalDeductions": 0,
    "netPay": 0
  }
}

Rules:
- All numeric fields MUST be numbers (strip peso signs ₱, commas, spaces; treat "-" as 0).
- Omit or skip empty rows and employees with 0 worked days and 0 monetary amounts across earnings/deductions/net pay.
- Put any bottom TOTAL / GRAND TOTAL summary row values into "reportedTotals" (do NOT include summary rows inside "rows").`;

  let lastError = null;
  for (const gModel of GEMINI_VISION_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: parsed.mimeType,
                      data: parsed.base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192
            }
          })
        }
      );

      if (!res.ok) {
        lastError = new Error(`OCR service responded with status ${res.status} on ${gModel}`);
        continue;
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) continue;

      const cleanedJson = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const jsonObj = JSON.parse(cleanedJson);
      const rawRows = Array.isArray(jsonObj?.rows) ? jsonObj.rows : [];

      const branchHint = String(jsonObj?.branchLocation || "").trim();
      const records = rawRows
        .map((row, idx) => ({
          ...recalculateCompensationRow(
            {
              ...row,
              department: row.department || branchHint
            },
            "initial"
          ),
          sourceRowNumber: idx + 1
        }))
        .filter((r) => !isEmptyCompensationRow(r));

      const rawReported = jsonObj?.reportedTotals;
      let ocrReportedTotals = { found: false, label: "", sourceRowNumber: null, totals: {}, presentKeys: [] };
      if (rawReported && (rawReported.found || Number(rawReported.netPay || 0) > 0 || Number(rawReported.basicPay || 0) > 0)) {
        const totals = {};
        const presentKeys = [];
        ALL_MONEY_KEYS.forEach((k) => {
          if (rawReported[k] !== undefined && rawReported[k] !== null && rawReported[k] !== "") {
            totals[k] = normalizeMoney(rawReported[k], { forceAbsolute: k !== "netPay" });
            presentKeys.push(k);
          }
        });
        if (!presentKeys.includes("grossPay") && presentKeys.includes("basicPay")) {
          totals.grossPay = round2(
            Number(totals.basicPay || 0) +
              Number(totals.allowance || 0) +
              Number(totals.mealAllowance || 0) +
              Number(totals.holidayNightPay || 0) +
              Number(totals.overtimePay || 0)
          );
          presentKeys.push("grossPay");
        }
        ocrReportedTotals = {
          found: presentKeys.length > 0,
          label: rawReported.label || "TOTAL",
          sourceRowNumber: null,
          totals,
          presentKeys
        };
      }

      return {
        fileName,
        parseEngine: `AI Vision OCR (${gModel})`,
        isOcr: true,
        sheetNames: [],
        activeSheetName: "OCR Extracted Table",
        headers: PAYROLL_FIELD_DEFS.map((f) => f.label),
        matrix: [],
        headerRowIndex: 0,
        columnMap: {},
        detectedCompanyName: jsonObj.companyName || "",
        detectedBranch: branchHint,
        detectedPayPeriod: jsonObj.payPeriod || "",
        detectedPayDate: parseNaturalDateToIso(jsonObj.payDate || "") || jsonObj.payDate || "",
        reportedTotals: ocrReportedTotals,
        ocrSummary: jsonObj.ocrSummary || `Extracted ${records.length} employee record(s) via OCR.`,
        records
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Unable to extract payroll data from document via OCR.");
}

/**
 * Checks if an XLSX workbook contains an embedded image (e.g. screenshot pasted into Excel)
 * and extracts the largest image blob URL for OCR fallback.
 */
async function extractLargestImageFromXlsx(arrayBuffer) {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const mediaEntries = Object.values(zip.files).filter(
      (f) => !f.dir && /^xl\/media\/.+\.(png|jpe?g|webp|bmp)$/i.test(f.name)
    );
    if (mediaEntries.length === 0) return null;

    let bestEntry = mediaEntries[0];
    let bestBytes = await bestEntry.async("uint8array");

    for (let i = 1; i < mediaEntries.length; i++) {
      const bytes = await mediaEntries[i].async("uint8array");
      if (bytes.length > bestBytes.length) {
        bestEntry = mediaEntries[i];
        bestBytes = bytes;
      }
    }

    const ext = bestEntry.name.split(".").pop().toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    let binary = "";
    for (let i = 0; i < bestBytes.length; i++) {
      binary += String.fromCharCode(bestBytes[i]);
    }
    return `data:${mime};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

/**
 * Parses an Excel (.xlsx, .xls, .xlsm, .ods, .csv) file with multi-sheet support,
 * smart header detection, and automatic embedded-image OCR fallback.
 */
export async function parsePayrollSpreadsheet(file, preferredSheetName = "") {
  const fileName = file.name || "payroll.xlsx";
  const lower = fileName.toLowerCase();
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetNames = Array.isArray(workbook.SheetNames) ? workbook.SheetNames : [];

  if (sheetNames.length === 0) {
    throw new Error("The uploaded spreadsheet contains no readable worksheets.");
  }

  // Evaluate each sheet to pick the strongest payroll sheet when no preferred sheet is chosen
  const sheetMatrices = {};
  const sheetMerges = {};
  let chosenSheet = preferredSheetName && sheetNames.includes(preferredSheetName) ? preferredSheetName : sheetNames[0];
  let bestSheetScore = -1;

  for (const sName of sheetNames) {
    const ws = workbook.Sheets[sName];
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
    const merges = Array.isArray(ws?.["!merges"]) ? ws["!merges"] : [];
    sheetMatrices[sName] = matrix;
    sheetMerges[sName] = merges;
    if (!preferredSheetName) {
      const detected = detectPayrollHeaderRow(matrix, merges);
      const densityBonus = Math.min(matrix.length, 30);
      const totalScore = detected.matchScore + (detected.matchScore > 0 ? densityBonus : 0);
      if (totalScore > bestSheetScore) {
        bestSheetScore = totalScore;
        chosenSheet = sName;
      }
    }
  }

  const activeMatrix = sheetMatrices[chosenSheet] || [];
  const activeMerges = sheetMerges[chosenSheet] || [];
  const headerInfo = detectPayrollHeaderRow(activeMatrix, activeMerges);
  const columnMap = autoMapColumns(headerInfo.headers);
  const records = buildCompensationRecordsFromMatrix(activeMatrix, headerInfo.headerRowIndex, columnMap, {
    defaultDepartment: headerInfo.detectedBranch
  });
  const reportedTotals = extractPayrollFooterTotals(activeMatrix, headerInfo.headerRowIndex, columnMap);

  // If no tabular employee records were found and file contains an embedded screenshot image, auto-OCR it
  if (records.length === 0 && (lower.endsWith(".xlsx") || lower.endsWith(".xlsm"))) {
    const embeddedImageUrl = await extractLargestImageFromXlsx(buffer);
    if (embeddedImageUrl) {
      return await parsePayrollWithOcr(embeddedImageUrl, fileName);
    }
  }

  const parseEngine = lower.endsWith(".csv")
    ? "CSV Spreadsheet Parser"
    : "Excel Parser (SheetJS)";

  return {
    fileName,
    parseEngine,
    isOcr: false,
    sheetNames,
    activeSheetName: chosenSheet,
    sheetMatrices,
    sheetMerges,
    headers: headerInfo.headers,
    matrix: activeMatrix,
    headerRowIndex: headerInfo.headerRowIndex,
    columnMap,
    detectedCompanyName: headerInfo.detectedCompanyName,
    detectedBranch: headerInfo.detectedBranch,
    detectedPayPeriod: headerInfo.detectedPayPeriod,
    detectedPayDate: headerInfo.detectedPayDate,
    reportedTotals,
    ocrSummary: `Read ${records.length} employee compensation row(s) from worksheet "${chosenSheet}".`,
    records
  };
}

/**
 * Unified dispatcher for Excel, CSV, PDF, or Image uploads.
 */
export async function parsePayrollUploadFile(file, preferredSheetName = "") {
  if (!file) throw new Error("Please select a file to upload.");
  const name = (file.name || "").toLowerCase();
  const mime = (file.type || "").toLowerCase();

  const isSpreadsheet =
    /\.(xlsx|xls|xlsm|xlsb|csv|ods|tsv)$/i.test(name) ||
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "text/csv";

  if (isSpreadsheet) {
    return await parsePayrollSpreadsheet(file, preferredSheetName);
  }

  const isOcrSupported =
    /\.(png|jpe?g|webp|pdf)$/i.test(name) ||
    mime.startsWith("image/") ||
    mime === "application/pdf";

  if (isOcrSupported) {
    return await parsePayrollWithOcr(file, file.name);
  }

  throw new Error("Unsupported file format. Please upload an Excel file (.xlsx, .xls, .csv) or scanned Payroll Image/PDF for OCR.");
}

/**
 * Optional Gemini AI column-mapping helper for custom/unfamiliar Excel column headers.
 */
export async function aiAssistColumnMapping(headers = [], sampleRows = []) {
  const apiKey = API_CONFIG.GEMINI_API_KEY;
  if (!apiKey || headers.length === 0) {
    return autoMapColumns(headers);
  }

  const canonicalList = PAYROLL_FIELD_DEFS.map((f) => `${f.key} (${f.label})`).join(", ");
  const headerSnapshot = headers.map((h, i) => `${i}: "${h}"`).join("\n");
  const sampleSnapshot = sampleRows
    .slice(0, 3)
    .map((r, rIdx) => `Row ${rIdx + 1}: ${JSON.stringify(r.slice(0, headers.length))}`)
    .join("\n");

  const prompt = `Map these Excel column indices (0-based) to canonical Philippine payroll fields.
Canonical field keys: ${canonicalList}

Headers:
${headerSnapshot}

Sample rows:
${sampleSnapshot}

Return ONLY a valid JSON object mapping fieldKey -> integer colIdx for matched columns (omit unmatched fields). Example: {"employeeName": 1, "basicPay": 4, "netPay": 11}`;

  for (const gModel of GEMINI_VISION_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
          })
        }
      );

      if (!res.ok) continue;
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;

      const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
      const mapped = JSON.parse(cleaned);
      const validKeys = new Set(PAYROLL_FIELD_DEFS.map((f) => f.key));
      const cleanMap = {};
      Object.entries(mapped).forEach(([k, v]) => {
        if (validKeys.has(k) && typeof v === "number" && v >= 0 && v < headers.length) {
          cleanMap[k] = v;
        }
      });
      if (Object.keys(cleanMap).length > 0) {
        return { ...autoMapColumns(headers), ...cleanMap };
      }
    } catch {
      // Try next fallback model
    }
  }

  return autoMapColumns(headers);
}

/**
 * Generates and downloads a clean Excel (.xlsx) payroll template matching corporate register columns.
 */
export function downloadPayrollTemplateExcel(companyName = "Lucky Betplay Corporation") {
  const aoa = [
    [companyName.toUpperCase()],
    ["MANDAUE CITY"],
    ["EMPLOYEES SALARY"],
    ["DATE COVERED: OCTOBER 11-25, 2026", "", "", "", "", "", "", "", "RELEASE DATE: OCTOBER 30, 2026"],
    [
      "SEQ",
      "EMPLOYEE NAME",
      "DESIGNATION",
      "BASIC MONTHLY SALARY",
      "RATE PER DAY",
      "RATE PER HOUR",
      "# OF DAYS",
      "TOTAL BASIC PAY",
      "ADDITIONALS",
      "",
      "",
      "",
      "DEDUCTIONS",
      "",
      "",
      "",
      "",
      "",
      "",
      "NET PAY",
      "PAYMENT MODE"
    ],
    [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "ALLOWANCE",
      "MEAL ALLOWANCE",
      "HOLIDAY PAY",
      "OVERTIME",
      "PHIC",
      "HDMF",
      "SSS",
      "SALARY ADVANCEMENT",
      "HDMF LOAN",
      "SSS LOAN",
      "LATE/UNDERTIME",
      "",
      ""
    ],
    [
      1,
      "PAMELA MAE D. MACAPOBRE",
      "HEAD CASHIER",
      18000,
      600,
      75,
      15,
      9000,
      1000,
      0,
      0,
      600,
      125,
      100,
      250,
      1000,
      0,
      0,
      0,
      9125,
      "Direct Payroll"
    ],
    [
      2,
      "DAVE P. SAAVEDRA",
      "FIELD MONITORING",
      16200,
      540,
      67.5,
      15,
      8100,
      0,
      1500,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      9,
      9591,
      "Direct Payroll"
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 20 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 20 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 20 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
    { s: { r: 3, c: 8 }, e: { r: 3, c: 20 } },
    { s: { r: 4, c: 8 }, e: { r: 4, c: 11 } },
    { s: { r: 4, c: 12 }, e: { r: 4, c: 18 } },
    ...[0, 1, 2, 3, 4, 5, 6, 7, 19, 20].map((c) => ({ s: { r: 4, c }, e: { r: 5, c } }))
  ];
  ws["!cols"] = [
    { wch: 6 }, { wch: 26 }, { wch: 20 }, { wch: 18 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    { wch: 18 }, { wch: 12 }, { wch: 11 }, { wch: 14 }, { wch: 13 }, { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees Salary");
  XLSX.writeFile(wb, "HRHub_Salary_Compensation_Template.xlsx");
}

/**
 * Exports a saved payroll batch back to an Excel (.xlsx) workbook.
 */
export function exportPayrollBatchToExcel(batch, records = []) {
  const aoa = [
    [(batch?.companyName || "SIMPAL GROUP OF COMPANIES").toUpperCase()],
    [`SALARY & COMPENSATION LEDGER — ${batch?.payPeriod || "Payroll Cutoff"}`],
    [`Batch Ref: ${batch?.batchRef || "N/A"} | Release Date: ${batch?.payDate || "N/A"} | Branch: ${batch?.branchLocation || "Main"} | Source: ${batch?.sourceFileName || "Excel/OCR"}`],
    [],
    [
      "Seq",
      "Payslip Ref",
      "Employee ID",
      "Employee Name",
      "Designation",
      "Branch / Dept",
      "Basic Monthly Salary",
      "Rate Per Day",
      "Rate Per Hour",
      "# of Days",
      "Total Basic Pay",
      "Allowance",
      "Meal Allowance",
      "Holiday / ND",
      "Overtime",
      "Gross Pay",
      "PHIC",
      "HDMF",
      "SSS",
      "W/Tax",
      "Salary Advancement",
      "HDMF Loan",
      "SSS Loan",
      "Late / Undertime",
      "Total Deductions",
      "Net Pay",
      "Payment Mode",
      "Status",
      "Remarks"
    ],
    ...records.map((r, idx) => [
      r.seqNo || idx + 1,
      r.payslipRef || "",
      r.employeeId || "",
      r.employeeName || "",
      r.position || "",
      r.department || "",
      Number(r.monthlySalary || 0),
      Number(r.dailyRate || 0),
      Number(r.hourlyRate || 0),
      Number(r.daysWorked || 0),
      Number(r.basicPay || 0),
      Number(r.allowance || 0),
      Number(r.mealAllowance || 0),
      Number(r.holidayNightPay || 0),
      Number(r.overtimePay || 0),
      Number(r.grossPay || 0),
      Number(r.philhealth || 0),
      Number(r.pagibig || 0),
      Number(r.sss || 0),
      Number(r.withholdingTax || 0),
      Number(r.cashAdvance || 0),
      Number(r.hdmfLoan || 0),
      Number(r.sssLoan || 0),
      Number(r.otherDeductions || 0),
      Number(r.totalDeductions || 0),
      Number(r.netPay || 0),
      r.paymentMode || "Direct Payroll",
      r.status || "Verified",
      r.remarks || ""
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Compensation Ledger");
  const safeName = (batch?.batchRef || "Payroll_Batch").replace(/[^a-zA-Z0-9_-]/g, "_");
  XLSX.writeFile(wb, `${safeName}_Compensation_Ledger.xlsx`);
}
