/**
 * salaryCompensationStorage.js
 * Cloud & Local Persistence Service for Salary & Compensation Payroll Batches and Payslips.
 *
 * Sync priority:
 * 1. Primary: Relational database tables ('payroll_batches', 'salary_compensation_records', 'cash_advances', 'employee_leave_records')
 * 2. Fallback / Redundancy: Cloud store ('user_settings')
 * 3. Offline Cache: localStorage and in-memory caching
 */

import { supabase } from "./supabase";
import { getUserAccountKey } from "./userSettingsStorage";
import { recalculateCompensationRow, round2 } from "./payrollFileParser";

export const PAYROLL_BATCHES_TABLE = "payroll_batches";
export const SALARY_RECORDS_TABLE = "salary_compensation_records";
export const CASH_ADVANCES_TABLE = "cash_advances";
export const LEAVE_RECORDS_TABLE = "employee_leave_records";
export const BATCH_INDEX_KEY = "salary_compensation_batches_index_v1";
export const BATCH_ITEM_PREFIX = "salary_compensation_batch_";
export const CA_LEDGER_KEY = "salary_comp_cash_advances_v1";
export const LEAVE_LEDGER_KEY = "salary_comp_leave_records_v1";
const LOCAL_INDEX_KEY = "hrhub_salary_comp_batches_v1";
const LOCAL_RECORDS_PREFIX = "hrhub_salary_comp_records_v1_";
const LOCAL_CA_KEY = "hrhub_salary_comp_cash_advances_v1";
const LOCAL_LEAVE_KEY = "hrhub_salary_comp_leave_records_v1";

const VALID_PAYROLL_STATUSES = new Set(["Draft", "Verified", "Released"]);
const VALID_CA_SOURCES = new Set(["manual", "payroll_upload"]);
const VALID_CA_ENTRY_TYPES = new Set(["issued", "payroll_deduction", "repayment"]);
const VALID_CA_STATUSES = new Set(["Active", "Deducted", "Settled"]);
const VALID_LEAVE_ENTRY_TYPES = new Set(["credit_grant", "leave_used"]);
const VALID_LEAVE_STATUSES = new Set(["Approved", "Pending", "Cancelled"]);

const memoryBatchIndex = { list: null };
const memoryBatchRecords = new Map();
const memoryCaStore = { list: null };
const memoryLeaveStore = { list: null };

function normalizeDateForDb(val) {
  const s = String(val || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function normalizeStatusForDb(val) {
  const s = String(val || "").trim();
  return VALID_PAYROLL_STATUSES.has(s) ? s : "Verified";
}

function safeNumeric(val) {
  const n = Number(val);
  return Number.isFinite(n) ? round2(n) : 0;
}

function isMissingRelationError(err) {
  const code = String(err?.code || "");
  const msg = String(err?.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table")
  );
}

function mapBatchToDbRow(batch) {
  return {
    id: String(batch.id),
    batch_ref: String(batch.batchRef || batch.id),
    title: String(batch.title || "Payroll Batch"),
    company_id: String(batch.companyId || "sgc"),
    company_code: String(batch.companyCode || "SGC"),
    company_name: String(batch.companyName || "Simpal Group of Companies"),
    branch_location: String(batch.branchLocation || ""),
    pay_period: String(batch.payPeriod || "Current Payroll Period"),
    pay_date: normalizeDateForDb(batch.payDate),
    source_file_name: String(batch.sourceFileName || "Uploaded Spreadsheet"),
    parse_engine: String(batch.parseEngine || "Excel Parser"),
    row_count: Math.max(0, Math.round(Number(batch.rowCount || 0))),
    total_gross_pay: safeNumeric(batch.totalGrossPay),
    total_deductions: safeNumeric(batch.totalDeductions),
    total_net_pay: safeNumeric(batch.totalNetPay),
    status: normalizeStatusForDb(batch.status),
    created_by: String(batch.createdBy || "HR Admin"),
    created_at: batch.createdAt || new Date().toISOString(),
    updated_at: batch.updatedAt || new Date().toISOString()
  };
}

function mapDbRowToBatch(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    batchRef: String(row.batch_ref || row.id),
    title: String(row.title || ""),
    companyId: String(row.company_id || "sgc"),
    companyCode: String(row.company_code || "SGC"),
    companyName: String(row.company_name || ""),
    branchLocation: String(row.branch_location || ""),
    payPeriod: String(row.pay_period || ""),
    payDate: row.pay_date ? String(row.pay_date).slice(0, 10) : "",
    sourceFileName: String(row.source_file_name || ""),
    parseEngine: String(row.parse_engine || ""),
    rowCount: Number(row.row_count || 0),
    totalGrossPay: safeNumeric(row.total_gross_pay),
    totalDeductions: safeNumeric(row.total_deductions),
    totalNetPay: safeNumeric(row.total_net_pay),
    status: normalizeStatusForDb(row.status),
    createdBy: String(row.created_by || ""),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

function mapRecordToDbRow(rec) {
  return {
    id: String(rec.id),
    batch_id: String(rec.batchId),
    payslip_ref: String(rec.payslipRef || rec.id),
    seq_no: String(rec.seqNo ?? ""),
    employee_id: String(rec.employeeId || ""),
    employee_name: String(rec.employeeName || "Unnamed Employee").trim() || "Unnamed Employee",
    position: String(rec.position || ""),
    department: String(rec.department || ""),
    monthly_salary: safeNumeric(rec.monthlySalary),
    days_worked: safeNumeric(rec.daysWorked),
    daily_rate: safeNumeric(rec.dailyRate),
    hourly_rate: safeNumeric(rec.hourlyRate),
    basic_pay: safeNumeric(rec.basicPay),
    allowance: safeNumeric(rec.allowance),
    meal_allowance: safeNumeric(rec.mealAllowance),
    holiday_night_pay: safeNumeric(rec.holidayNightPay),
    overtime_pay: safeNumeric(rec.overtimePay),
    gross_pay: safeNumeric(rec.grossPay),
    philhealth: safeNumeric(rec.philhealth),
    pagibig: safeNumeric(rec.pagibig),
    sss: safeNumeric(rec.sss),
    withholding_tax: safeNumeric(rec.withholdingTax),
    cash_advance: safeNumeric(rec.cashAdvance),
    hdmf_loan: safeNumeric(rec.hdmfLoan),
    sss_loan: safeNumeric(rec.sssLoan),
    other_deductions: safeNumeric(rec.otherDeductions),
    total_deductions: safeNumeric(rec.totalDeductions),
    net_pay: safeNumeric(rec.netPay),
    payment_mode: String(rec.paymentMode || "Direct Payroll"),
    status: normalizeStatusForDb(rec.status),
    remarks: String(rec.remarks || ""),
    math_variance: safeNumeric(rec.mathVariance),
    company_id: String(rec.companyId || ""),
    company_name: String(rec.companyName || ""),
    pay_period: String(rec.payPeriod || ""),
    pay_date: normalizeDateForDb(rec.payDate),
    updated_at: rec.updatedAt || new Date().toISOString()
  };
}

function mapDbRowToRecord(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    payslipRef: String(row.payslip_ref || ""),
    seqNo: String(row.seq_no ?? ""),
    employeeId: String(row.employee_id || ""),
    employeeName: String(row.employee_name || ""),
    position: String(row.position || ""),
    department: String(row.department || ""),
    monthlySalary: safeNumeric(row.monthly_salary),
    daysWorked: safeNumeric(row.days_worked),
    dailyRate: safeNumeric(row.daily_rate),
    hourlyRate: safeNumeric(row.hourly_rate),
    basicPay: safeNumeric(row.basic_pay),
    allowance: safeNumeric(row.allowance),
    mealAllowance: safeNumeric(row.meal_allowance),
    holidayNightPay: safeNumeric(row.holiday_night_pay),
    overtimePay: safeNumeric(row.overtime_pay),
    grossPay: safeNumeric(row.gross_pay),
    philhealth: safeNumeric(row.philhealth),
    pagibig: safeNumeric(row.pagibig),
    sss: safeNumeric(row.sss),
    withholdingTax: safeNumeric(row.withholding_tax),
    cashAdvance: safeNumeric(row.cash_advance),
    hdmfLoan: safeNumeric(row.hdmf_loan),
    sssLoan: safeNumeric(row.sss_loan),
    otherDeductions: safeNumeric(row.other_deductions),
    totalDeductions: safeNumeric(row.total_deductions),
    netPay: safeNumeric(row.net_pay),
    paymentMode: String(row.payment_mode || "Direct Payroll"),
    status: normalizeStatusForDb(row.status),
    remarks: String(row.remarks || ""),
    mathVariance: safeNumeric(row.math_variance),
    companyId: String(row.company_id || ""),
    companyName: String(row.company_name || ""),
    payPeriod: String(row.pay_period || ""),
    payDate: row.pay_date ? String(row.pay_date).slice(0, 10) : "",
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

function readLocalIndex() {
  try {
    const raw = localStorage.getItem(LOCAL_INDEX_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("[salaryCompensationStorage] Local index read warning:", err);
  }
  return [];
}

function writeLocalIndex(batches) {
  try {
    localStorage.setItem(LOCAL_INDEX_KEY, JSON.stringify(batches));
  } catch (err) {
    console.warn("[salaryCompensationStorage] Local index write warning:", err);
  }
}

function readLocalBatchPayload(batchId) {
  try {
    const raw = localStorage.getItem(`${LOCAL_RECORDS_PREFIX}${batchId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[salaryCompensationStorage] Local batch payload read warning:", err);
  }
  return null;
}

function writeLocalBatchPayload(batchId, payload) {
  try {
    localStorage.setItem(`${LOCAL_RECORDS_PREFIX}${batchId}`, JSON.stringify(payload));
  } catch (err) {
    console.warn("[salaryCompensationStorage] Local batch payload write warning:", err);
  }
}

function mergeBatchLists(primaryList = [], secondaryList = []) {
  const map = new Map();
  secondaryList.forEach((b) => {
    if (b?.id) map.set(b.id, b);
  });
  primaryList.forEach((b) => {
    if (b?.id) map.set(b.id, b);
  });
  return Array.from(map.values()).sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
  );
}

export function generateBatchRef(companyCode = "SGC", existingBatches = []) {
  const code = String(companyCode || "SGC").toUpperCase();
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `PAY-${code}-${ym}`;
  let maxSeq = 0;

  existingBatches.forEach((b) => {
    const ref = String(b?.batchRef || "");
    const m = ref.match(/(\d+)$/);
    if (ref.startsWith(prefix) && m) {
      const seq = parseInt(m[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  return `${prefix}-${String(maxSeq + 1).padStart(2, "0")}`;
}

export function computeBatchTotals(records = []) {
  return records.reduce(
    (acc, r) => {
      acc.rowCount += 1;
      acc.totalGrossPay = round2(acc.totalGrossPay + Number(r.grossPay || 0));
      acc.totalDeductions = round2(acc.totalDeductions + Number(r.totalDeductions || 0));
      acc.totalNetPay = round2(acc.totalNetPay + Number(r.netPay || 0));
      return acc;
    },
    { rowCount: 0, totalGrossPay: 0, totalDeductions: 0, totalNetPay: 0 }
  );
}

async function persistToRelationalTables(batchSummary, normalizedRecords, pruneRemovedRows = false) {
  if (!supabase) {
    return { synced: false, missingSchema: false, error: "Database client not initialized" };
  }

  try {
    const { error: batchError } = await supabase
      .from(PAYROLL_BATCHES_TABLE)
      .upsert(mapBatchToDbRow(batchSummary), { onConflict: "id" });

    if (batchError) {
      return {
        synced: false,
        missingSchema: isMissingRelationError(batchError),
        error: batchError.message
      };
    }

    if (normalizedRecords.length > 0) {
      const dbRows = normalizedRecords.map(mapRecordToDbRow);
      const { error: recordsError } = await supabase
        .from(SALARY_RECORDS_TABLE)
        .upsert(dbRows, { onConflict: "id" });

      if (recordsError) {
        return {
          synced: false,
          missingSchema: isMissingRelationError(recordsError),
          error: recordsError.message
        };
      }
    }

    if (pruneRemovedRows) {
      const keepIds = new Set(normalizedRecords.map((r) => String(r.id)));
      const { data: existingRows, error: listErr } = await supabase
        .from(SALARY_RECORDS_TABLE)
        .select("id")
        .eq("batch_id", batchSummary.id);

      if (!listErr && Array.isArray(existingRows)) {
        const orphanIds = existingRows.map((r) => r.id).filter((id) => !keepIds.has(String(id)));
        if (orphanIds.length > 0) {
          await supabase.from(SALARY_RECORDS_TABLE).delete().in("id", orphanIds);
        }
      }
    }

    return { synced: true, missingSchema: false, error: null };
  } catch (err) {
    return {
      synced: false,
      missingSchema: isMissingRelationError(err),
      error: err?.message || "Failed to write to relational payroll tables."
    };
  }
}

/**
 * Fetches all saved payroll batches from Supabase ('payroll_batches' primary + 'user_settings' fallback).
 */
export async function fetchPayrollBatchesFromDb() {
  const localBatches = readLocalIndex();
  let relationalBatches = null;
  let relationalError = null;
  let relationalAvailable = false;
  let settingsBatches = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(PAYROLL_BATCHES_TABLE)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        relationalAvailable = true;
        relationalBatches = data.map((row) => ({
          ...mapDbRowToBatch(row),
          relationalSynced: true,
          localOnly: false
        }));
      } else if (error) {
        relationalError = error.message;
        if (!isMissingRelationError(error)) {
          console.warn("[salaryCompensationStorage] payroll_batches query warning:", error.message);
        }
      }
    } catch (err) {
      relationalError = err?.message || "Failed querying payroll_batches.";
    }

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings_json, updated_at")
        .eq("user_id", BATCH_INDEX_KEY)
        .maybeSingle();

      if (!error && data?.settings_json?.batches && Array.isArray(data.settings_json.batches)) {
        settingsBatches = data.settings_json.batches;
      }
    } catch (err) {
      console.warn("[salaryCompensationStorage] Cloud batch index fallback:", err?.message);
    }
  }

  const relationalBatchIds = (relationalBatches || []).map((b) => b.id);
  const relSet = new Set(relationalBatchIds);

  if (relationalBatches !== null || settingsBatches !== null) {
    const localUnsynced = localBatches.filter((b) => b?.localOnly === true);
    const mergedCloud = mergeBatchLists(relationalBatches || [], settingsBatches || []);
    const merged = mergeBatchLists(mergedCloud, localUnsynced).map((b) => ({
      ...b,
      relationalSynced: relSet.has(b.id)
    }));
    memoryBatchIndex.list = merged;
    writeLocalIndex(merged);
    return {
      batches: merged,
      relationalBatchIds,
      source: relationalAvailable ? "supabase_tables" : "supabase_settings",
      relationalAvailable,
      dbError: relationalAvailable ? null : relationalError
    };
  }

  if (localBatches.length > 0) {
    memoryBatchIndex.list = localBatches;
    return {
      batches: localBatches,
      relationalBatchIds: [],
      source: "localStorage",
      relationalAvailable: false,
      dbError: relationalError
    };
  }

  return {
    batches: memoryBatchIndex.list || [],
    relationalBatchIds: [],
    source: "memory",
    relationalAvailable: false,
    dbError: relationalError
  };
}

/**
 * Fetches full compensation & payslip rows for a saved payroll batch from Supabase.
 */
export async function fetchPayrollRecordsForBatch(batchId) {
  if (!batchId) return { batch: null, records: [], source: "empty" };

  if (supabase) {
    try {
      const [{ data: batchRow, error: batchErr }, { data: recRows, error: recErr }] =
        await Promise.all([
          supabase.from(PAYROLL_BATCHES_TABLE).select("*").eq("id", batchId).maybeSingle(),
          supabase
            .from(SALARY_RECORDS_TABLE)
            .select("*")
            .eq("batch_id", batchId)
            .order("payslip_ref", { ascending: true })
        ]);

      if (!recErr && Array.isArray(recRows) && (recRows.length > 0 || batchRow)) {
        const batch = !batchErr && batchRow ? mapDbRowToBatch(batchRow) : null;
        const records = recRows.map(mapDbRowToRecord).filter(Boolean);
        const payload = { batch, records };
        memoryBatchRecords.set(batchId, payload);
        writeLocalBatchPayload(batchId, payload);
        return { batch, records, source: "supabase_tables" };
      }
    } catch (err) {
      console.warn("[salaryCompensationStorage] Relational batch records notice:", err?.message);
    }

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", `${BATCH_ITEM_PREFIX}${batchId}`)
        .maybeSingle();

      if (!error && data?.settings_json) {
        const payload = data.settings_json;
        const records = Array.isArray(payload.records) ? payload.records : [];
        memoryBatchRecords.set(batchId, payload);
        writeLocalBatchPayload(batchId, payload);
        return { batch: payload.batch || null, records, source: "supabase_settings" };
      }
    } catch (err) {
      console.warn("[salaryCompensationStorage] Cloud batch records fallback:", err?.message);
    }
  }

  const localPayload = readLocalBatchPayload(batchId);
  if (localPayload) {
    memoryBatchRecords.set(batchId, localPayload);
    return {
      batch: localPayload.batch || null,
      records: Array.isArray(localPayload.records) ? localPayload.records : [],
      source: "localStorage"
    };
  }

  const memPayload = memoryBatchRecords.get(batchId);
  if (memPayload) {
    return {
      batch: memPayload.batch || null,
      records: Array.isArray(memPayload.records) ? memPayload.records : [],
      source: "memory"
    };
  }

  return { batch: null, records: [], source: "empty" };
}

async function persistIndexToSupabase(batches) {
  memoryBatchIndex.list = batches;
  writeLocalIndex(batches);

  if (!supabase) return { synced: false, error: "Database client not initialized" };
  try {
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: BATCH_INDEX_KEY,
          settings_json: { batches, updatedAt: new Date().toISOString() },
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

    return { synced: !error, error: error?.message || null };
  } catch (err) {
    return { synced: false, error: err?.message || "Failed to persist index to user_settings" };
  }
}

async function persistBatchPayloadToSupabase(batchId, payload) {
  memoryBatchRecords.set(batchId, payload);
  writeLocalBatchPayload(batchId, payload);

  if (!supabase) return { synced: false, error: "Database client not initialized" };
  try {
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: `${BATCH_ITEM_PREFIX}${batchId}`,
          settings_json: payload,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

    return { synced: !error, error: error?.message || null };
  } catch (err) {
    return { synced: false, error: err?.message || "Failed to persist batch payload to user_settings" };
  }
}

/**
 * Saves an extracted/reviewed payroll batch and its employee compensation records to Supabase.
 */
export async function savePayrollBatchToDb({ batchMeta = {}, records = [], currentUser = null }) {
  const accountKey = getUserAccountKey(currentUser);
  const now = new Date().toISOString();
  const { batches: existingBatches } = await fetchPayrollBatchesFromDb();

  const batchId = batchMeta.id || `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const companyCode = String(batchMeta.companyCode || "SGC").toUpperCase();
  const batchRef = batchMeta.batchRef || generateBatchRef(companyCode, existingBatches);

  const normalizedRecords = records.map((row, idx) => {
    const clean = recalculateCompensationRow(row, "initial");
    const payslipRef = row.payslipRef || `${batchRef}-PS${String(idx + 1).padStart(3, "0")}`;
    return {
      ...clean,
      id: row.id || `${batchId}_row_${idx + 1}`,
      batchId,
      payslipRef,
      companyId: batchMeta.companyId || "sgc",
      companyName: batchMeta.companyName || "Simpal Group of Companies",
      payPeriod: batchMeta.payPeriod || "Current Payroll Period",
      payDate: normalizeDateForDb(batchMeta.payDate) || now.split("T")[0],
      status: normalizeStatusForDb(row.status),
      updatedAt: now
    };
  });

  const totals = computeBatchTotals(normalizedRecords);

  const batchSummary = {
    id: batchId,
    batchRef,
    title: batchMeta.title || `${batchMeta.companyName || "Payroll"} (${batchMeta.payPeriod || "Cutoff"})`,
    companyId: batchMeta.companyId || "sgc",
    companyCode,
    companyName: batchMeta.companyName || "Simpal Group of Companies",
    branchLocation: String(batchMeta.branchLocation || "").trim(),
    payPeriod: batchMeta.payPeriod || "Current Payroll Period",
    payDate: normalizeDateForDb(batchMeta.payDate) || now.split("T")[0],
    sourceFileName: batchMeta.sourceFileName || "Uploaded Spreadsheet",
    parseEngine: batchMeta.parseEngine || "Excel Parser",
    ...totals,
    status: normalizeStatusForDb(batchMeta.status),
    createdBy: currentUser?.name || accountKey,
    createdAt: batchMeta.createdAt || now,
    updatedAt: now
  };

  // 1. Primary write: Dedicated relational tables (payroll_batches + salary_compensation_records)
  const relationalRes = await persistToRelationalTables(
    batchSummary,
    normalizedRecords,
    Boolean(batchMeta.id)
  );

  // 2. Redundancy & offline cache: user_settings + localStorage
  const payloadRes = await persistBatchPayloadToSupabase(batchId, {
    batch: batchSummary,
    records: normalizedRecords
  });

  const indexRes = await persistIndexToSupabase([
    batchSummary,
    ...existingBatches.filter((b) => b.id !== batchId)
  ]);
  const settingsSynced = Boolean(payloadRes.synced && indexRes.synced);
  const syncedToSupabase = Boolean(relationalRes.synced || settingsSynced);

  const finalBatchSummary = {
    ...batchSummary,
    relationalSynced: relationalRes.synced,
    localOnly: !syncedToSupabase
  };

  const nextBatches = [
    finalBatchSummary,
    ...existingBatches.filter((b) => b.id !== batchId)
  ];
  memoryBatchIndex.list = nextBatches;
  writeLocalIndex(nextBatches);

  // 3. Auto-reflect any Cash Advancement deductions from uploaded payroll rows into CA ledger
  await syncPayrollCashAdvancesForBatch(finalBatchSummary, normalizedRecords, currentUser);

  return {
    success: true,
    syncedToSupabase,
    relationalSynced: relationalRes.synced,
    relationalMissingSchema: relationalRes.missingSchema,
    relationalError: relationalRes.error || null,
    settingsSynced,
    dbError: relationalRes.error || payloadRes.error || indexRes.error || null,
    batch: finalBatchSummary,
    records: normalizedRecords,
    batches: nextBatches
  };
}

/**
 * Syncs existing backup batches (from user_settings or localStorage) into payroll_batches
 * and salary_compensation_records tables.
 */
export async function syncPendingBatchesToRelationalTables() {
  const current = await fetchPayrollBatchesFromDb();
  const relSet = new Set(current.relationalBatchIds || []);
  const pending = (current.batches || []).filter((b) => b?.id && !relSet.has(b.id));

  if (pending.length === 0) {
    return { syncedCount: 0, failedCount: 0, error: null, batches: current.batches || [] };
  }

  let syncedCount = 0;
  let failedCount = 0;
  let lastError = null;

  for (const batch of pending) {
    const recRes = await fetchPayrollRecordsForBatch(batch.id);
    const records = recRes.records || [];
    const writeRes = await persistToRelationalTables(batch, records, false);
    if (writeRes.synced) {
      syncedCount += 1;
      await syncPayrollCashAdvancesForBatch(batch, records);
    } else {
      failedCount += 1;
      lastError = writeRes.error || lastError;
    }
  }

  const refreshed = await fetchPayrollBatchesFromDb();
  return {
    syncedCount,
    failedCount,
    error: lastError,
    batches: refreshed.batches || [],
    relationalBatchIds: refreshed.relationalBatchIds || [],
    relationalAvailable: refreshed.relationalAvailable
  };
}

/**
 * Updates records or batch status for an existing saved payroll batch in Supabase.
 */
export async function updatePayrollBatchRecordsInDb(batchId, updatedRecords = [], batchPatch = {}) {
  const now = new Date().toISOString();
  const { batches: existingBatches } = await fetchPayrollBatchesFromDb();
  const existingBatch = existingBatches.find((b) => b.id === batchId) || { id: batchId };

  const cleanRecords = updatedRecords.map((r, idx) => ({
    ...r,
    batchId,
    payslipRef: r.payslipRef || `${existingBatch.batchRef || "PAY"}-PS${String(idx + 1).padStart(3, "0")}`,
    status: normalizeStatusForDb(r.status),
    payDate: normalizeDateForDb(r.payDate) || normalizeDateForDb(existingBatch.payDate),
    updatedAt: now
  }));

  const totals = computeBatchTotals(cleanRecords);
  const allReleased = cleanRecords.length > 0 && cleanRecords.every((r) => r.status === "Released");
  const updatedBatch = {
    ...existingBatch,
    ...batchPatch,
    ...totals,
    status: normalizeStatusForDb(batchPatch.status || (allReleased ? "Released" : existingBatch.status)),
    updatedAt: now
  };

  const relationalRes = await persistToRelationalTables(updatedBatch, cleanRecords, true);

  const payloadRes = await persistBatchPayloadToSupabase(batchId, {
    batch: updatedBatch,
    records: cleanRecords
  });

  const nextBatches = existingBatches.map((b) => (b.id === batchId ? updatedBatch : b));
  const indexRes = await persistIndexToSupabase(nextBatches);
  const settingsSynced = Boolean(payloadRes.synced && indexRes.synced);

  await syncPayrollCashAdvancesForBatch(updatedBatch, cleanRecords);

  return {
    success: true,
    syncedToSupabase: Boolean(relationalRes.synced || settingsSynced),
    relationalSynced: relationalRes.synced,
    relationalError: relationalRes.error || null,
    dbError: relationalRes.error || payloadRes.error || indexRes.error || null,
    batch: updatedBatch,
    records: cleanRecords,
    batches: nextBatches
  };
}

/**
 * Deletes a saved payroll batch and its associated records from Supabase and local cache.
 */
export async function deletePayrollBatchFromDb(batchId) {
  const { batches: existingBatches } = await fetchPayrollBatchesFromDb();
  const nextBatches = existingBatches.filter((b) => b.id !== batchId);

  memoryBatchRecords.delete(batchId);
  try {
    localStorage.removeItem(`${LOCAL_RECORDS_PREFIX}${batchId}`);
  } catch (err) {
    console.warn("[salaryCompensationStorage] Local cache remove warning:", err?.message);
  }

  let relationalDeleted = false;
  if (supabase) {
    try {
      const { error: relDelErr } = await supabase
        .from(PAYROLL_BATCHES_TABLE)
        .delete()
        .eq("id", batchId);
      relationalDeleted = !relDelErr;
      if (relDelErr && !isMissingRelationError(relDelErr)) {
        console.warn("[salaryCompensationStorage] Delete relational batch notice:", relDelErr.message);
      }
    } catch (err) {
      console.warn("[salaryCompensationStorage] Delete relational batch warning:", err?.message);
    }

    try {
      await supabase
        .from("user_settings")
        .delete()
        .eq("user_id", `${BATCH_ITEM_PREFIX}${batchId}`);
    } catch (err) {
      console.warn("[salaryCompensationStorage] Delete batch payload notice:", err?.message);
    }
  }

  const indexRes = await persistIndexToSupabase(nextBatches);
  await deleteCashAdvancesForBatch(batchId);

  return {
    success: true,
    syncedToSupabase: Boolean(relationalDeleted || indexRes.synced),
    batches: nextBatches
  };
}

/* ============================================================================
 * CASH ADVANCEMENT (CA) LEDGER PERSISTENCE & PAYROLL REFLECTION
 * ============================================================================ */

function normalizeCaSourceType(val) {
  return VALID_CA_SOURCES.has(val) ? val : "manual";
}

function normalizeCaEntryType(val) {
  return VALID_CA_ENTRY_TYPES.has(val) ? val : "issued";
}

function normalizeCaStatus(val, entryType = "issued") {
  if (VALID_CA_STATUSES.has(val)) return val;
  return entryType === "payroll_deduction" ? "Deducted" : entryType === "repayment" ? "Settled" : "Active";
}

function mapCaEntryToDbRow(entry) {
  const entryType = normalizeCaEntryType(entry.entryType);
  return {
    id: String(entry.id),
    ca_ref: String(entry.caRef || entry.id),
    source_type: normalizeCaSourceType(entry.sourceType),
    entry_type: entryType,
    employee_id: String(entry.employeeId || ""),
    employee_name: String(entry.employeeName || "Unnamed Employee").trim() || "Unnamed Employee",
    position: String(entry.position || ""),
    department: String(entry.department || ""),
    company_id: String(entry.companyId || "sgc"),
    company_name: String(entry.companyName || ""),
    amount: Math.max(0, safeNumeric(entry.amount)),
    date_recorded: normalizeDateForDb(entry.dateRecorded),
    pay_period: String(entry.payPeriod || ""),
    reason: String(entry.reason || ""),
    status: normalizeCaStatus(entry.status, entryType),
    batch_id: String(entry.batchId || ""),
    batch_ref: String(entry.batchRef || ""),
    payroll_record_id: String(entry.payrollRecordId || ""),
    payslip_ref: String(entry.payslipRef || ""),
    created_by: String(entry.createdBy || "HR Admin"),
    created_at: entry.createdAt || new Date().toISOString(),
    updated_at: entry.updatedAt || new Date().toISOString()
  };
}

function mapDbRowToCaEntry(row) {
  if (!row) return null;
  const entryType = normalizeCaEntryType(row.entry_type);
  return {
    id: String(row.id),
    caRef: String(row.ca_ref || row.id),
    sourceType: normalizeCaSourceType(row.source_type),
    entryType,
    employeeId: String(row.employee_id || ""),
    employeeName: String(row.employee_name || ""),
    position: String(row.position || ""),
    department: String(row.department || ""),
    companyId: String(row.company_id || "sgc"),
    companyName: String(row.company_name || ""),
    amount: Math.max(0, safeNumeric(row.amount)),
    dateRecorded: row.date_recorded ? String(row.date_recorded).slice(0, 10) : "",
    payPeriod: String(row.pay_period || ""),
    reason: String(row.reason || ""),
    status: normalizeCaStatus(row.status, entryType),
    batchId: String(row.batch_id || ""),
    batchRef: String(row.batch_ref || ""),
    payrollRecordId: String(row.payroll_record_id || ""),
    payslipRef: String(row.payslip_ref || ""),
    createdBy: String(row.created_by || "HR Admin"),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

function readLocalCaLedger() {
  try {
    const raw = localStorage.getItem(LOCAL_CA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("[salaryCompensationStorage] Local CA read warning:", err);
  }
  return [];
}

function writeLocalCaLedger(entries) {
  try {
    localStorage.setItem(LOCAL_CA_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn("[salaryCompensationStorage] Local CA write warning:", err);
  }
}

async function persistCaLedgerToSettings(entries) {
  memoryCaStore.list = entries;
  writeLocalCaLedger(entries);

  if (!supabase) return { synced: false, error: "Database client not initialized" };
  try {
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: CA_LEDGER_KEY,
          settings_json: { entries, updatedAt: new Date().toISOString() },
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    return { synced: !error, error: error?.message || null };
  } catch (err) {
    return { synced: false, error: err?.message || "Failed persisting CA ledger to user_settings" };
  }
}

function mergeCaLists(primaryList = [], secondaryList = []) {
  const map = new Map();
  secondaryList.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  primaryList.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return Array.from(map.values()).sort((a, b) => {
    const dCmp = String(b.dateRecorded || "").localeCompare(String(a.dateRecorded || ""));
    if (dCmp !== 0) return dCmp;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

export function generateCashAdvanceRef(existingEntries = []) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `CA-${ym}`;
  let maxSeq = 0;

  existingEntries.forEach((e) => {
    const ref = String(e?.caRef || "");
    const m = ref.match(/(\d+)$/);
    if (ref.startsWith(prefix) && m) {
      const seq = parseInt(m[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
}

export async function fetchCashAdvancesFromDb() {
  const localEntries = readLocalCaLedger();
  let relationalEntries = null;
  let relationalError = null;
  let relationalAvailable = false;
  let settingsEntries = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(CASH_ADVANCES_TABLE)
        .select("*")
        .order("date_recorded", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        relationalAvailable = true;
        relationalEntries = data.map((row) => ({
          ...mapDbRowToCaEntry(row),
          relationalSynced: true,
          localOnly: false
        }));
      } else if (error) {
        relationalError = error.message;
        if (!isMissingRelationError(error)) {
          console.warn("[salaryCompensationStorage] cash_advances query warning:", error.message);
        }
      }
    } catch (err) {
      relationalError = err?.message || "Failed querying cash_advances.";
    }

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", CA_LEDGER_KEY)
        .maybeSingle();

      if (!error && data?.settings_json?.entries && Array.isArray(data.settings_json.entries)) {
        settingsEntries = data.settings_json.entries;
      }
    } catch (err) {
      console.warn("[salaryCompensationStorage] CA settings fallback warning:", err?.message);
    }
  }

  const relationalCaIds = (relationalEntries || []).map((e) => e.id);
  const relSet = new Set(relationalCaIds);

  if (relationalEntries !== null || settingsEntries !== null) {
    const localUnsynced = localEntries.filter((e) => e?.localOnly === true);
    const mergedCloud = mergeCaLists(relationalEntries || [], settingsEntries || []);
    const merged = mergeCaLists(mergedCloud, localUnsynced).map((e) => ({
      ...e,
      relationalSynced: relSet.has(e.id)
    }));
    memoryCaStore.list = merged;
    writeLocalCaLedger(merged);
    return {
      entries: merged,
      relationalCaIds,
      source: relationalAvailable ? "supabase_tables" : "supabase_settings",
      relationalAvailable,
      dbError: relationalAvailable ? null : relationalError
    };
  }

  if (localEntries.length > 0) {
    memoryCaStore.list = localEntries;
    return {
      entries: localEntries,
      relationalCaIds: [],
      source: "localStorage",
      relationalAvailable: false,
      dbError: relationalError
    };
  }

  return {
    entries: memoryCaStore.list || [],
    relationalCaIds: [],
    source: "memory",
    relationalAvailable: false,
    dbError: relationalError
  };
}

export async function saveCashAdvanceEntryToDb(entryData = {}, currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const now = new Date().toISOString();
  const { entries: existingEntries } = await fetchCashAdvancesFromDb();

  const existing = existingEntries.find((e) => e.id === entryData.id) || null;
  const entryType = normalizeCaEntryType(entryData.entryType || existing?.entryType || "issued");
  const sourceType = normalizeCaSourceType(entryData.sourceType || existing?.sourceType || "manual");
  const id = entryData.id || `ca_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const caRef = entryData.caRef || existing?.caRef || generateCashAdvanceRef(existingEntries);

  const normalized = {
    id,
    caRef,
    sourceType,
    entryType,
    employeeId: String(entryData.employeeId ?? existing?.employeeId ?? "").trim(),
    employeeName: String(entryData.employeeName ?? existing?.employeeName ?? "").trim(),
    position: String(entryData.position ?? existing?.position ?? "").trim(),
    department: String(entryData.department ?? existing?.department ?? "").trim(),
    companyId: String(entryData.companyId ?? existing?.companyId ?? "sgc"),
    companyName: String(entryData.companyName ?? existing?.companyName ?? ""),
    amount: Math.max(0, safeNumeric(entryData.amount)),
    dateRecorded: normalizeDateForDb(entryData.dateRecorded) || now.split("T")[0],
    payPeriod: String(entryData.payPeriod ?? existing?.payPeriod ?? "").trim(),
    reason: String(entryData.reason ?? existing?.reason ?? "").trim(),
    status: normalizeCaStatus(entryData.status || existing?.status, entryType),
    batchId: String(entryData.batchId ?? existing?.batchId ?? ""),
    batchRef: String(entryData.batchRef ?? existing?.batchRef ?? ""),
    payrollRecordId: String(entryData.payrollRecordId ?? existing?.payrollRecordId ?? ""),
    payslipRef: String(entryData.payslipRef ?? existing?.payslipRef ?? ""),
    createdBy: existing?.createdBy || currentUser?.name || accountKey,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  let relationalSynced = false;
  let relationalError = null;

  if (supabase) {
    try {
      const { error } = await supabase
        .from(CASH_ADVANCES_TABLE)
        .upsert(mapCaEntryToDbRow(normalized), { onConflict: "id" });
      relationalSynced = !error;
      if (error) relationalError = error.message;
    } catch (err) {
      relationalError = err?.message || "Failed saving Cash Advancement to database.";
    }
  } else {
    relationalError = "Database client not initialized";
  }

  const nextPreSettings = mergeCaLists([normalized], existingEntries.filter((e) => e.id !== id));
  const settingsRes = await persistCaLedgerToSettings(nextPreSettings);
  const syncedToSupabase = Boolean(relationalSynced || settingsRes.synced);

  const finalEntry = {
    ...normalized,
    relationalSynced,
    localOnly: !syncedToSupabase
  };

  const nextEntries = mergeCaLists([finalEntry], existingEntries.filter((e) => e.id !== id));
  memoryCaStore.list = nextEntries;
  writeLocalCaLedger(nextEntries);

  return {
    success: true,
    syncedToSupabase,
    relationalSynced,
    relationalError,
    settingsSynced: settingsRes.synced,
    dbError: relationalError || settingsRes.error || null,
    entry: finalEntry,
    entries: nextEntries
  };
}

export async function deleteCashAdvanceEntryFromDb(caId) {
  const { entries: existingEntries } = await fetchCashAdvancesFromDb();
  const nextEntries = existingEntries.filter((e) => e.id !== caId);

  let relationalDeleted = false;
  if (supabase) {
    try {
      const { error } = await supabase.from(CASH_ADVANCES_TABLE).delete().eq("id", caId);
      relationalDeleted = !error;
      if (error && !isMissingRelationError(error)) {
        console.warn("[salaryCompensationStorage] Delete CA warning:", error.message);
      }
    } catch (err) {
      console.warn("[salaryCompensationStorage] Delete CA exception:", err?.message);
    }
  }

  const settingsRes = await persistCaLedgerToSettings(nextEntries);
  return {
    success: true,
    syncedToSupabase: Boolean(relationalDeleted || settingsRes.synced),
    entries: nextEntries
  };
}

/**
 * Syncs payroll CA deductions (records with cashAdvance > 0) for a given payroll batch
 * into the Cash Advancement ledger cleanly without duplicating or erasing manual entries.
 */
export async function syncPayrollCashAdvancesForBatch(batchSummary, records = [], currentUser = null) {
  if (!batchSummary?.id) return { entries: [], synced: false };

  const now = new Date().toISOString();
  const accountKey = currentUser?.name || getUserAccountKey(currentUser);
  const caRows = (records || [])
    .filter((rec) => Number(rec?.cashAdvance || 0) > 0 && String(rec?.employeeName || "").trim())
    .map((rec, idx) => {
      const payslipRef = rec.payslipRef || `${batchSummary.batchRef || "PAY"}-PS${String(idx + 1).padStart(3, "0")}`;
      const id = `ca_payroll_${rec.id}`;
      return {
        id,
        caRef: `CA-${payslipRef}`,
        sourceType: "payroll_upload",
        entryType: "payroll_deduction",
        employeeId: String(rec.employeeId || ""),
        employeeName: String(rec.employeeName || "").trim(),
        position: String(rec.position || ""),
        department: String(rec.department || batchSummary.branchLocation || ""),
        companyId: String(batchSummary.companyId || rec.companyId || "sgc"),
        companyName: String(batchSummary.companyName || rec.companyName || ""),
        amount: round2(Number(rec.cashAdvance || 0)),
        dateRecorded: normalizeDateForDb(batchSummary.payDate) || now.split("T")[0],
        payPeriod: String(batchSummary.payPeriod || rec.payPeriod || ""),
        reason: `Payroll Salary Advancement / CA deduction (${batchSummary.batchRef || batchSummary.id})`,
        status: "Deducted",
        batchId: String(batchSummary.id),
        batchRef: String(batchSummary.batchRef || ""),
        payrollRecordId: String(rec.id),
        payslipRef,
        createdBy: batchSummary.createdBy || accountKey,
        createdAt: rec.updatedAt || now,
        updatedAt: now
      };
    });

  const keepIds = new Set(caRows.map((c) => c.id));
  let relationalSynced = false;
  let relationalError = null;

  if (supabase) {
    try {
      const { data: existingDbRows, error: listErr } = await supabase
        .from(CASH_ADVANCES_TABLE)
        .select("id")
        .eq("batch_id", batchSummary.id)
        .eq("source_type", "payroll_upload");

      if (listErr) {
        relationalError = listErr.message;
      } else {
        const staleDbIds = (existingDbRows || [])
          .map((r) => r.id)
          .filter((id) => !keepIds.has(String(id)));
        if (staleDbIds.length > 0) {
          await supabase.from(CASH_ADVANCES_TABLE).delete().in("id", staleDbIds);
        }

        if (caRows.length > 0) {
          const { error: upsertErr } = await supabase
            .from(CASH_ADVANCES_TABLE)
            .upsert(caRows.map(mapCaEntryToDbRow), { onConflict: "id" });
          if (upsertErr) {
            relationalError = upsertErr.message;
          } else {
            relationalSynced = true;
          }
        } else {
          relationalSynced = true;
        }
      }
    } catch (err) {
      relationalError = err?.message || "Failed syncing payroll CA rows.";
    }
  }

  const { entries: existingAll } = await fetchCashAdvancesFromDb();
  const filteredExisting = existingAll.filter(
    (e) => !(e.sourceType === "payroll_upload" && e.batchId === batchSummary.id && !keepIds.has(e.id))
  );
  const nextAll = mergeCaLists(
    caRows.map((c) => ({ ...c, relationalSynced, localOnly: !relationalSynced })),
    filteredExisting
  );
  await persistCaLedgerToSettings(nextAll);

  return {
    entries: nextAll,
    reflectedCount: caRows.length,
    relationalSynced,
    relationalError
  };
}

export async function deleteCashAdvancesForBatch(batchId) {
  if (!batchId) return;
  if (supabase) {
    try {
      await supabase
        .from(CASH_ADVANCES_TABLE)
        .delete()
        .eq("batch_id", batchId)
        .eq("source_type", "payroll_upload");
    } catch (err) {
      console.warn("[salaryCompensationStorage] Delete batch CA warning:", err?.message);
    }
  }

  const { entries: existingAll } = await fetchCashAdvancesFromDb();
  const remaining = existingAll.filter(
    (e) => !(e.sourceType === "payroll_upload" && e.batchId === batchId)
  );
  await persistCaLedgerToSettings(remaining);
}

/**
 * Pulls CA deductions from all saved payroll batches and pushes any backup CA rows
 * into public.cash_advances.
 */
export async function syncCashAdvancesFromSavedBatches(currentUser = null) {
  const batchRes = await fetchPayrollBatchesFromDb();
  const batches = batchRes.batches || [];
  let reflectedBatchCount = 0;

  for (const batch of batches) {
    const recRes = await fetchPayrollRecordsForBatch(batch.id);
    const records = recRes.records || [];
    if (records.some((r) => Number(r?.cashAdvance || 0) > 0)) {
      await syncPayrollCashAdvancesForBatch(batch, records, currentUser);
      reflectedBatchCount += 1;
    }
  }

  // Push any manual or unsynced CA entries sitting in user_settings/localStorage to cash_advances table
  const currentCa = await fetchCashAdvancesFromDb();
  const relSet = new Set(currentCa.relationalCaIds || []);
  const pendingRows = (currentCa.entries || []).filter((e) => e?.id && !relSet.has(e.id));

  let pushError = null;
  if (pendingRows.length > 0 && supabase) {
    try {
      const { error } = await supabase
        .from(CASH_ADVANCES_TABLE)
        .upsert(pendingRows.map(mapCaEntryToDbRow), { onConflict: "id" });
      if (error) pushError = error.message;
    } catch (err) {
      pushError = err?.message || "Failed pushing CA entries to database.";
    }
  }

  const refreshed = await fetchCashAdvancesFromDb();
  return {
    ...refreshed,
    reflectedBatchCount,
    dbError: pushError || refreshed.dbError || null
  };
}

/**
 * Computes overall Cash Advancement KPI totals, per-employee balance ledger,
 * and chronological running-balance timeline for deduction transparency.
 */
export function computeCashAdvanceSummaries(entries = []) {
  let totalIssued = 0;
  let totalPayrollDeducted = 0;
  let totalRepaid = 0;
  const empMap = new Map();

  entries.forEach((entry) => {
    const amount = safeNumeric(entry?.amount);
    const type = normalizeCaEntryType(entry?.entryType);
    if (type === "issued") totalIssued = round2(totalIssued + amount);
    else if (type === "payroll_deduction") totalPayrollDeducted = round2(totalPayrollDeducted + amount);
    else if (type === "repayment") totalRepaid = round2(totalRepaid + amount);

    const nameKey = String(entry?.employeeName || "").trim().toUpperCase();
    if (!nameKey) return;

    if (!empMap.has(nameKey)) {
      empMap.set(nameKey, {
        key: nameKey,
        employeeName: String(entry.employeeName || "").trim(),
        employeeId: String(entry.employeeId || "").trim(),
        position: String(entry.position || "").trim(),
        department: String(entry.department || "").trim(),
        companyId: String(entry.companyId || "sgc"),
        companyName: String(entry.companyName || ""),
        issuedTotal: 0,
        payrollDeductedTotal: 0,
        repaidTotal: 0,
        outstandingBalance: 0,
        entryCount: 0,
        latestDate: entry.dateRecorded || "",
        _rawEntries: []
      });
    }

    const emp = empMap.get(nameKey);
    emp.entryCount += 1;
    emp._rawEntries.push(entry);
    if (!emp.employeeId && entry.employeeId) emp.employeeId = entry.employeeId;
    if (!emp.position && entry.position) emp.position = entry.position;
    if (!emp.department && entry.department) emp.department = entry.department;
    if (!emp.companyName && entry.companyName) emp.companyName = entry.companyName;
    if (String(entry.dateRecorded || "") > String(emp.latestDate || "")) {
      emp.latestDate = entry.dateRecorded || "";
    }

    if (type === "issued") emp.issuedTotal = round2(emp.issuedTotal + amount);
    else if (type === "payroll_deduction") emp.payrollDeductedTotal = round2(emp.payrollDeductedTotal + amount);
    else if (type === "repayment") emp.repaidTotal = round2(emp.repaidTotal + amount);

    emp.outstandingBalance = round2(
      Math.max(0, emp.issuedTotal - emp.payrollDeductedTotal - emp.repaidTotal)
    );
  });

  const typeOrder = { issued: 0, payroll_deduction: 1, repayment: 2 };

  const employeeSummaries = Array.from(empMap.values())
    .map(({ _rawEntries, ...emp }) => {
      const sortedTimelineRaw = [..._rawEntries].sort((a, b) => {
        const dCmp = String(a?.dateRecorded || "").localeCompare(String(b?.dateRecorded || ""));
        if (dCmp !== 0) return dCmp;
        const tA = typeOrder[normalizeCaEntryType(a?.entryType)] ?? 9;
        const tB = typeOrder[normalizeCaEntryType(b?.entryType)] ?? 9;
        if (tA !== tB) return tA - tB;
        return String(a?.createdAt || "").localeCompare(String(b?.createdAt || ""));
      });

      let rawRunning = 0;
      let deductionCount = 0;
      const timeline = sortedTimelineRaw.map((item, idx) => {
        const amt = safeNumeric(item?.amount);
        const itemType = normalizeCaEntryType(item?.entryType);
        const signedDelta = itemType === "issued" ? amt : -amt;
        if (itemType !== "issued") deductionCount += 1;
        const rawBefore = rawRunning;
        rawRunning = round2(rawRunning + signedDelta);
        return {
          ...item,
          entryType: itemType,
          amount: amt,
          stepNumber: idx + 1,
          signedDelta,
          balanceBefore: round2(Math.max(0, rawBefore)),
          balanceAfter: round2(Math.max(0, rawRunning)),
          rawBalanceAfter: rawRunning
        };
      });

      const totalRecovered = round2(emp.payrollDeductedTotal + emp.repaidTotal);
      const unlinkedDeductionTotal = round2(Math.max(0, totalRecovered - emp.issuedTotal));
      const recoveryProgressPct =
        emp.issuedTotal > 0
          ? Math.min(100, Math.round((totalRecovered / emp.issuedTotal) * 1000) / 10)
          : 0;

      let caStatus = "Active";
      if (emp.issuedTotal <= 0 && totalRecovered > 0) {
        caStatus = "Needs Approved CA";
      } else if (emp.issuedTotal > 0 && emp.outstandingBalance === 0) {
        caStatus = "Settled";
      } else if (emp.issuedTotal > 0 && totalRecovered > 0) {
        caStatus = "Partially Deducted";
      }

      return {
        ...emp,
        approvedWholeTotal: emp.issuedTotal,
        totalRecovered,
        unlinkedDeductionTotal,
        recoveryProgressPct,
        deductionCount,
        caStatus,
        timeline
      };
    })
    .sort((a, b) => {
      if (b.outstandingBalance !== a.outstandingBalance) {
        return b.outstandingBalance - a.outstandingBalance;
      }
      if (b.payrollDeductedTotal !== a.payrollDeductedTotal) {
        return b.payrollDeductedTotal - a.payrollDeductedTotal;
      }
      return a.employeeName.localeCompare(b.employeeName);
    });

  const netOutstandingBalance = round2(
    employeeSummaries.reduce((sum, emp) => sum + emp.outstandingBalance, 0)
  );
  const totalRecovered = round2(totalPayrollDeducted + totalRepaid);
  const overallRecoveryRatePct =
    totalIssued > 0 ? Math.min(100, Math.round((totalRecovered / totalIssued) * 1000) / 10) : 0;

  return {
    totalIssued,
    totalPayrollDeducted,
    totalRepaid,
    totalRecovered,
    overallRecoveryRatePct,
    netOutstandingBalance,
    settledCount: employeeSummaries.filter((e) => e.caStatus === "Settled").length,
    activeCount: employeeSummaries.filter((e) => e.outstandingBalance > 0).length,
    unlinkedCount: employeeSummaries.filter((e) => e.caStatus === "Needs Approved CA").length,
    employeeSummaries
  };
}


/* ============================================================================
 * EMPLOYEE LEAVE RECORDS & REMAINING CREDITS LEDGER
 * ============================================================================ */

function normalizeLeaveEntryType(val) {
  return VALID_LEAVE_ENTRY_TYPES.has(val) ? val : "leave_used";
}

function normalizeLeaveStatus(val, entryType = "leave_used") {
  if (VALID_LEAVE_STATUSES.has(val)) return val;
  return entryType === "credit_grant" ? "Approved" : "Approved";
}

function mapLeaveEntryToDbRow(entry) {
  const entryType = normalizeLeaveEntryType(entry.entryType);
  return {
    id: String(entry.id),
    leave_ref: String(entry.leaveRef || entry.id),
    entry_type: entryType,
    leave_type: String(entry.leaveType || "Service Incentive Leave (SIL)").trim() || "Service Incentive Leave (SIL)",
    employee_id: String(entry.employeeId || ""),
    employee_name: String(entry.employeeName || "Unnamed Employee").trim() || "Unnamed Employee",
    position: String(entry.position || ""),
    department: String(entry.department || ""),
    company_id: String(entry.companyId || "sgc"),
    company_name: String(entry.companyName || ""),
    days: Math.max(0, safeNumeric(entry.days)),
    credit_year: Number(entry.creditYear) || new Date().getFullYear(),
    start_date: normalizeDateForDb(entry.startDate),
    end_date: normalizeDateForDb(entry.endDate),
    reason: String(entry.reason || ""),
    status: normalizeLeaveStatus(entry.status, entryType),
    created_by: String(entry.createdBy || "HR Admin"),
    created_at: entry.createdAt || new Date().toISOString(),
    updated_at: entry.updatedAt || new Date().toISOString()
  };
}

function mapDbRowToLeaveEntry(row) {
  if (!row) return null;
  const entryType = normalizeLeaveEntryType(row.entry_type);
  return {
    id: String(row.id),
    leaveRef: String(row.leave_ref || row.id),
    entryType,
    leaveType: String(row.leave_type || "Service Incentive Leave (SIL)"),
    employeeId: String(row.employee_id || ""),
    employeeName: String(row.employee_name || ""),
    position: String(row.position || ""),
    department: String(row.department || ""),
    companyId: String(row.company_id || "sgc"),
    companyName: String(row.company_name || ""),
    days: Math.max(0, safeNumeric(row.days)),
    creditYear: Number(row.credit_year) || new Date().getFullYear(),
    startDate: row.start_date ? String(row.start_date).slice(0, 10) : "",
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : "",
    reason: String(row.reason || ""),
    status: normalizeLeaveStatus(row.status, entryType),
    createdBy: String(row.created_by || "HR Admin"),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

function readLocalLeaveLedger() {
  try {
    const raw = localStorage.getItem(LOCAL_LEAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("[salaryCompensationStorage] Local leave read warning:", err);
  }
  return [];
}

function writeLocalLeaveLedger(entries) {
  try {
    localStorage.setItem(LOCAL_LEAVE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn("[salaryCompensationStorage] Local leave write warning:", err);
  }
}

async function persistLeaveLedgerToSettings(entries) {
  memoryLeaveStore.list = entries;
  writeLocalLeaveLedger(entries);

  if (!supabase) return { synced: false, error: "Database client not initialized" };
  try {
    const { error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: LEAVE_LEDGER_KEY,
          settings_json: { entries, updatedAt: new Date().toISOString() },
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );
    return { synced: !error, error: error?.message || null };
  } catch (err) {
    return { synced: false, error: err?.message || "Failed persisting leave ledger to backup store" };
  }
}

function mergeLeaveLists(primaryList = [], secondaryList = []) {
  const map = new Map();
  secondaryList.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  primaryList.forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });
  return Array.from(map.values()).sort((a, b) => {
    const dCmp = String(b.startDate || b.createdAt || "").localeCompare(
      String(a.startDate || a.createdAt || "")
    );
    if (dCmp !== 0) return dCmp;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
}

export function generateLeaveRef(existingEntries = []) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `LV-${ym}`;
  let maxSeq = 0;

  existingEntries.forEach((e) => {
    const ref = String(e?.leaveRef || "");
    const m = ref.match(/(\d+)$/);
    if (ref.startsWith(prefix) && m) {
      const seq = parseInt(m[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  return `${prefix}-${String(maxSeq + 1).padStart(3, "0")}`;
}

export async function fetchLeaveRecordsFromDb() {
  const localEntries = readLocalLeaveLedger();
  let relationalEntries = null;
  let relationalError = null;
  let relationalAvailable = false;
  let settingsEntries = null;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(LEAVE_RECORDS_TABLE)
        .select("*")
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        relationalAvailable = true;
        relationalEntries = data.map((row) => ({
          ...mapDbRowToLeaveEntry(row),
          relationalSynced: true,
          localOnly: false
        }));
      } else if (error) {
        relationalError = error.message;
        if (!isMissingRelationError(error)) {
          console.warn("[salaryCompensationStorage] employee_leave_records query warning:", error.message);
        }
      }
    } catch (err) {
      relationalError = err?.message || "Failed querying leave records.";
    }

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("settings_json")
        .eq("user_id", LEAVE_LEDGER_KEY)
        .maybeSingle();

      if (!error && data?.settings_json?.entries && Array.isArray(data.settings_json.entries)) {
        settingsEntries = data.settings_json.entries;
      }
    } catch (err) {
      console.warn("[salaryCompensationStorage] Leave settings fallback warning:", err?.message);
    }
  }

  const relationalLeaveIds = (relationalEntries || []).map((e) => e.id);
  const relSet = new Set(relationalLeaveIds);

  if (relationalEntries !== null || settingsEntries !== null) {
    const localUnsynced = localEntries.filter((e) => e?.localOnly === true);
    const mergedCloud = mergeLeaveLists(relationalEntries || [], settingsEntries || []);
    const merged = mergeLeaveLists(mergedCloud, localUnsynced).map((e) => ({
      ...e,
      relationalSynced: relSet.has(e.id)
    }));
    memoryLeaveStore.list = merged;
    writeLocalLeaveLedger(merged);
    return {
      entries: merged,
      relationalLeaveIds,
      source: relationalAvailable ? "database_tables" : "cloud_backup",
      relationalAvailable,
      dbError: relationalAvailable ? null : relationalError
    };
  }

  if (localEntries.length > 0) {
    memoryLeaveStore.list = localEntries;
    return {
      entries: localEntries,
      relationalLeaveIds: [],
      source: "localStorage",
      relationalAvailable: false,
      dbError: relationalError
    };
  }

  return {
    entries: memoryLeaveStore.list || [],
    relationalLeaveIds: [],
    source: "memory",
    relationalAvailable: false,
    dbError: relationalError
  };
}

export async function saveLeaveRecordToDb(entryData = {}, currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const now = new Date().toISOString();
  const { entries: existingEntries } = await fetchLeaveRecordsFromDb();

  const existing = existingEntries.find((e) => e.id === entryData.id) || null;
  const entryType = normalizeLeaveEntryType(entryData.entryType || existing?.entryType || "leave_used");
  const id = entryData.id || `lv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const leaveRef = entryData.leaveRef || existing?.leaveRef || generateLeaveRef(existingEntries);
  const startDate = normalizeDateForDb(entryData.startDate) || existing?.startDate || now.split("T")[0];
  const endDate = normalizeDateForDb(entryData.endDate) || startDate;

  const normalized = {
    id,
    leaveRef,
    entryType,
    leaveType: String(entryData.leaveType || existing?.leaveType || "Service Incentive Leave (SIL)").trim(),
    employeeId: String(entryData.employeeId ?? existing?.employeeId ?? "").trim(),
    employeeName: String(entryData.employeeName ?? existing?.employeeName ?? "").trim(),
    position: String(entryData.position ?? existing?.position ?? "").trim(),
    department: String(entryData.department ?? existing?.department ?? "").trim(),
    companyId: String(entryData.companyId ?? existing?.companyId ?? "sgc"),
    companyName: String(entryData.companyName ?? existing?.companyName ?? ""),
    days: Math.max(0, safeNumeric(entryData.days)),
    creditYear: Number(entryData.creditYear || existing?.creditYear || new Date(startDate).getFullYear() || new Date().getFullYear()),
    startDate,
    endDate,
    reason: String(entryData.reason ?? existing?.reason ?? "").trim(),
    status: normalizeLeaveStatus(entryData.status || existing?.status, entryType),
    createdBy: existing?.createdBy || currentUser?.name || accountKey,
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  let relationalSynced = false;
  let relationalError = null;

  if (supabase) {
    try {
      const { error } = await supabase
        .from(LEAVE_RECORDS_TABLE)
        .upsert(mapLeaveEntryToDbRow(normalized), { onConflict: "id" });
      relationalSynced = !error;
      if (error) relationalError = error.message;
    } catch (err) {
      relationalError = err?.message || "Failed saving Leave Record to database.";
    }
  } else {
    relationalError = "Database client not initialized";
  }

  const nextPreSettings = mergeLeaveLists([normalized], existingEntries.filter((e) => e.id !== id));
  const settingsRes = await persistLeaveLedgerToSettings(nextPreSettings);
  const syncedToDb = Boolean(relationalSynced || settingsRes.synced);

  const finalEntry = {
    ...normalized,
    relationalSynced,
    localOnly: !syncedToDb
  };

  const nextEntries = mergeLeaveLists([finalEntry], existingEntries.filter((e) => e.id !== id));
  memoryLeaveStore.list = nextEntries;
  writeLocalLeaveLedger(nextEntries);

  return {
    success: true,
    syncedToSupabase: syncedToDb,
    relationalSynced,
    relationalError,
    settingsSynced: settingsRes.synced,
    dbError: relationalError || settingsRes.error || null,
    entry: finalEntry,
    entries: nextEntries
  };
}

export async function deleteLeaveRecordFromDb(leaveId) {
  const { entries: existingEntries } = await fetchLeaveRecordsFromDb();
  const nextEntries = existingEntries.filter((e) => e.id !== leaveId);

  let relationalDeleted = false;
  if (supabase) {
    try {
      const { error } = await supabase.from(LEAVE_RECORDS_TABLE).delete().eq("id", leaveId);
      relationalDeleted = !error;
      if (error && !isMissingRelationError(error)) {
        console.warn("[salaryCompensationStorage] Delete leave warning:", error.message);
      }
    } catch (err) {
      console.warn("[salaryCompensationStorage] Delete leave exception:", err?.message);
    }
  }

  const settingsRes = await persistLeaveLedgerToSettings(nextEntries);
  return {
    success: true,
    syncedToSupabase: Boolean(relationalDeleted || settingsRes.synced),
    entries: nextEntries
  };
}

export async function syncPendingLeaveRecordsToRelationalTables() {
  const currentLeave = await fetchLeaveRecordsFromDb();
  const relSet = new Set(currentLeave.relationalLeaveIds || []);
  const pendingRows = (currentLeave.entries || []).filter((e) => e?.id && !relSet.has(e.id));

  let pushError = null;
  if (pendingRows.length > 0 && supabase) {
    try {
      const { error } = await supabase
        .from(LEAVE_RECORDS_TABLE)
        .upsert(pendingRows.map(mapLeaveEntryToDbRow), { onConflict: "id" });
      if (error) pushError = error.message;
    } catch (err) {
      pushError = err?.message || "Failed syncing leave records to database.";
    }
  }

  const refreshed = await fetchLeaveRecordsFromDb();
  return {
    ...refreshed,
    syncedCount: pendingRows.length,
    dbError: pushError || refreshed.dbError || null
  };
}

/**
 * Computes overall Leave Credit metrics, per-employee remaining leave balances,
 * per-leave-type allocations, and chronological running-balance timeline.
 */
export function computeLeaveSummaries(entries = [], yearFilter = "ALL") {
  let totalCreditsAllocated = 0;
  let totalDaysUsed = 0;
  let totalPendingDays = 0;
  const empMap = new Map();

  const yearScoped = entries.filter((e) => {
    if (yearFilter === "ALL" || !yearFilter) return true;
    const yr = Number(e?.creditYear || (e?.startDate ? String(e.startDate).slice(0, 4) : 0));
    return yr === Number(yearFilter);
  });

  yearScoped.forEach((entry) => {
    const days = Math.max(0, safeNumeric(entry?.days));
    const type = normalizeLeaveEntryType(entry?.entryType);
    const status = normalizeLeaveStatus(entry?.status, type);
    const leaveCategory = String(entry?.leaveType || "Service Incentive Leave (SIL)").trim();

    if (status !== "Cancelled") {
      if (type === "credit_grant") totalCreditsAllocated = round2(totalCreditsAllocated + days);
      else if (status === "Approved") totalDaysUsed = round2(totalDaysUsed + days);
      else if (status === "Pending") totalPendingDays = round2(totalPendingDays + days);
    }

    const nameKey = String(entry?.employeeName || "").trim().toUpperCase();
    if (!nameKey) return;

    if (!empMap.has(nameKey)) {
      empMap.set(nameKey, {
        key: nameKey,
        employeeName: String(entry.employeeName || "").trim(),
        employeeId: String(entry.employeeId || "").trim(),
        position: String(entry.position || "").trim(),
        department: String(entry.department || "").trim(),
        companyId: String(entry.companyId || "sgc"),
        companyName: String(entry.companyName || ""),
        creditsTotal: 0,
        usedTotal: 0,
        pendingTotal: 0,
        remainingDays: 0,
        entryCount: 0,
        latestDate: entry.startDate || "",
        _rawEntries: [],
        _typeMap: new Map()
      });
    }

    const emp = empMap.get(nameKey);
    emp.entryCount += 1;
    emp._rawEntries.push(entry);
    if (!emp.employeeId && entry.employeeId) emp.employeeId = entry.employeeId;
    if (!emp.position && entry.position) emp.position = entry.position;
    if (!emp.department && entry.department) emp.department = entry.department;
    if (!emp.companyName && entry.companyName) emp.companyName = entry.companyName;
    if (String(entry.startDate || "") > String(emp.latestDate || "")) {
      emp.latestDate = entry.startDate || "";
    }

    if (status !== "Cancelled") {
      if (!emp._typeMap.has(leaveCategory)) {
        emp._typeMap.set(leaveCategory, {
          leaveType: leaveCategory,
          credits: 0,
          used: 0,
          pending: 0,
          remaining: 0
        });
      }
      const catRec = emp._typeMap.get(leaveCategory);

      if (type === "credit_grant") {
        emp.creditsTotal = round2(emp.creditsTotal + days);
        catRec.credits = round2(catRec.credits + days);
      } else if (status === "Approved") {
        emp.usedTotal = round2(emp.usedTotal + days);
        catRec.used = round2(catRec.used + days);
      } else if (status === "Pending") {
        emp.pendingTotal = round2(emp.pendingTotal + days);
        catRec.pending = round2(catRec.pending + days);
      }
      catRec.remaining = round2(Math.max(0, catRec.credits - catRec.used));
    }

    emp.remainingDays = round2(Math.max(0, emp.creditsTotal - emp.usedTotal));
  });

  const typePriority = { credit_grant: 0, leave_used: 1 };

  const employeeSummaries = Array.from(empMap.values())
    .map(({ _rawEntries, _typeMap, ...emp }) => {
      const sortedRaw = [..._rawEntries].sort((a, b) => {
        const dA = String(a?.startDate || a?.createdAt || "").slice(0, 10);
        const dB = String(b?.startDate || b?.createdAt || "").slice(0, 10);
        const dCmp = dA.localeCompare(dB);
        if (dCmp !== 0) return dCmp;
        const pA = typePriority[normalizeLeaveEntryType(a?.entryType)] ?? 9;
        const pB = typePriority[normalizeLeaveEntryType(b?.entryType)] ?? 9;
        if (pA !== pB) return pA - pB;
        return String(a?.createdAt || "").localeCompare(String(b?.createdAt || ""));
      });

      let rawRunning = 0;
      const timeline = sortedRaw.map((item, idx) => {
        const days = Math.max(0, safeNumeric(item?.days));
        const itemType = normalizeLeaveEntryType(item?.entryType);
        const itemStatus = normalizeLeaveStatus(item?.status, itemType);
        const affectsBalance =
          itemStatus !== "Cancelled" && (itemType === "credit_grant" || itemStatus === "Approved");
        const signedDelta = !affectsBalance ? 0 : itemType === "credit_grant" ? days : -days;
        const rawBefore = rawRunning;
        rawRunning = round2(rawRunning + signedDelta);

        return {
          ...item,
          entryType: itemType,
          status: itemStatus,
          days,
          stepNumber: idx + 1,
          signedDelta,
          balanceBefore: round2(Math.max(0, rawBefore)),
          balanceAfter: round2(Math.max(0, rawRunning)),
          rawBalanceAfter: rawRunning
        };
      });

      const uncreditedUsedDays = round2(Math.max(0, emp.usedTotal - emp.creditsTotal));
      const remainingAfterPending = round2(
        Math.max(0, emp.creditsTotal - emp.usedTotal - emp.pendingTotal)
      );
      const usagePct =
        emp.creditsTotal > 0
          ? Math.min(100, Math.round((emp.usedTotal / emp.creditsTotal) * 1000) / 10)
          : 0;

      let leaveStatus = "Available";
      if (emp.creditsTotal <= 0 && emp.usedTotal > 0) {
        leaveStatus = "Needs Leave Credits";
      } else if (emp.creditsTotal > 0 && emp.remainingDays <= 0) {
        leaveStatus = "Exhausted (0 Left)";
      } else if (emp.creditsTotal > 0 && emp.remainingDays <= 1.5) {
        leaveStatus = "Low Credits";
      } else if (emp.creditsTotal === 0 && emp.usedTotal === 0 && emp.pendingTotal > 0) {
        leaveStatus = "Pending Approval";
      }

      return {
        ...emp,
        remainingAfterPending,
        uncreditedUsedDays,
        usagePct,
        leaveStatus,
        byLeaveType: Array.from(_typeMap.values()),
        timeline
      };
    })
    .sort((a, b) => {
      if (b.remainingDays !== a.remainingDays) return b.remainingDays - a.remainingDays;
      if (b.usedTotal !== a.usedTotal) return b.usedTotal - a.usedTotal;
      return a.employeeName.localeCompare(b.employeeName);
    });

  const netRemainingDays = round2(
    employeeSummaries.reduce((sum, emp) => sum + emp.remainingDays, 0)
  );

  return {
    totalEmployees: employeeSummaries.length,
    totalCreditsAllocated,
    totalDaysUsed,
    totalPendingDays,
    netRemainingDays,
    exhaustedCount: employeeSummaries.filter((e) => e.leaveStatus === "Exhausted (0 Left)").length,
    lowCount: employeeSummaries.filter((e) => e.leaveStatus === "Low Credits").length,
    needsCreditsCount: employeeSummaries.filter((e) => e.leaveStatus === "Needs Leave Credits").length,
    employeeSummaries
  };
}
