/**
 * Dedicated Saved Memos Storage Service
 * Purpose: Manage official saved memorandums in dedicated Supabase table ('saved_memos') per user account,
 * eliminating localStorage.
 */

import { supabase } from "./supabase.js";
import { getUserAccountKey } from "./userSettingsStorage.js";

export const SAVED_MEMOS_TABLE = "saved_memos";

// In-memory fallback store to ensure zero crashes if Supabase network fails or table is pending migration
const memoryMemosStore = new Map();

/**
 * Fetch all saved memorandums for a user account from Supabase ('saved_memos' table).
 * All accounts access the company-wide corporate archive so memorandums saved by HRMD
 * or other authorized personnel are visible and loadable across the organization.
 */
export async function getSavedMemosFromDb(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);

  try {
    const { data, error } = await supabase
      .from(SAVED_MEMOS_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      // Exclude Document Studio items if stored in fallback_memos_table
      const targetRows = data.filter((row) => !String(row.category || "").startsWith("DOC_STUDIO:"));

      // Map database row columns to Memo object format and unpack metadata
      const mapped = targetRows.map((row) => {
        const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
        return {
          id: row.id,
          ref: (row.ref_no || "").replace(/-SARG-/gi, "-5ARG-").replace(/\bSARG\b/gi, "5ARG"),
          date: row.date,
          to: row.to_field,
          from: row.from_field,
          subject: row.subject,
          content: row.content,
          category: row.category,
          companyId: row.company_id,
          directivesFontFamily: row.directives_font_family,
          directivesFontSize: row.directives_font_size,
          signatoryLayout: row.signatory_layout,
          signatoryName: row.signatory_name,
          signatoryTitle: row.signatory_title,
          signatoryCompany: meta.signatoryCompany,
          approverName: row.approver_name,
          approverTitle: row.approver_title,
          // Flatten metadata fields so they are directly accessible when loading the memo
          signatoryLabel: meta.signatoryLabel || "ISSUED BY:",
          approverLabel: meta.approverLabel || "NOTED & APPROVED BY:",
          signatorySignature: meta.signatorySignature || null,
          approverSignature: meta.approverSignature || null,
          signatorySize: meta.signatorySize,
          signatoryOffsetX: meta.signatoryOffsetX,
          signatoryOffsetY: meta.signatoryOffsetY,
          approverSize: meta.approverSize,
          approverOffsetX: meta.approverOffsetX,
          approverOffsetY: meta.approverOffsetY,
          watermark: meta.watermark,
          includedCompanyIds: meta.includedCompanyIds,
          letterheadOverrides: meta.letterheadOverrides,
          savedByUserId: row.user_id,
          metadata: meta,
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      });

      // Update in-memory session cache (global and per-account)
      memoryMemosStore.set("__global__", mapped);
      memoryMemosStore.set(accountKey, mapped);
      return { memos: mapped, source: "supabase" };
    }
  } catch (err) {
    console.warn("Supabase saved_memos fetch notice, checking in-memory session:", err);
  }

  const inMem = memoryMemosStore.get("__global__") || memoryMemosStore.get(accountKey) || [];
  return { memos: inMem, source: "memory" };
}

/**
 * Fetch all memorandum reference numbers across all users/accounts in Supabase.
 * Checks the database across accounts to ensure strictly unique incremental sequences.
 */
export async function getAllGlobalMemoRefs() {
  try {
    const { data, error } = await supabase
      .from(SAVED_MEMOS_TABLE)
      .select("ref_no, created_at")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      return data
        .map((r) => (r.ref_no || "").replace(/-SARG-/gi, "-5ARG-").replace(/\bSARG\b/gi, "5ARG"))
        .filter(Boolean);
    }
  } catch (err) {
    console.warn("Notice: Querying all global memo refs fallback to memory:", err);
  }

  // Fallback to memory store across all user accounts
  const allInMemory = [];
  memoryMemosStore.forEach((memoList) => {
    if (Array.isArray(memoList)) {
      memoList.forEach((m) => {
        if (m.ref) {
          allInMemory.push(String(m.ref).replace(/-SARG-/gi, "-5ARG-").replace(/\bSARG\b/gi, "5ARG"));
        }
      });
    }
  });
  return allInMemory;
}

/**
 * Save an official memorandum record to Supabase ('saved_memos' table)
 */
export async function saveMemoRecordToDb(currentUser = null, memoRecord = {}) {
  const accountKey = getUserAccountKey(currentUser);

  const id = memoRecord.id || `memo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const rawRef = memoRecord.ref || memoRecord.ref_no || `MEMO-${new Date().getFullYear()}-01`;
  const cleanRef = String(rawRef).replace(/-SARG-/gi, "-5ARG-").replace(/\bSARG\b/gi, "5ARG");

  const payload = {
    id,
    user_id: accountKey,
    ref_no: cleanRef,
    date: memoRecord.date || "",
    to_field: memoRecord.to || memoRecord.to_field || "",
    from_field: memoRecord.from || memoRecord.from_field || "",
    subject: memoRecord.subject || "",
    category: memoRecord.category || "General Policy",
    company_id: memoRecord.companyId || memoRecord.company_id || "lucky_betplay",
    content: memoRecord.content || "",
    directives_font_family: memoRecord.directivesFontFamily || "Arial, Helvetica, sans-serif",
    directives_font_size: memoRecord.directivesFontSize || 13.3,
    signatory_layout: memoRecord.signatoryLayout || "dual",
    signatory_name: memoRecord.signatoryName || "",
    signatory_title: memoRecord.signatoryTitle || "",
    approver_name: memoRecord.approverName || "",
    approver_title: memoRecord.approverTitle || "",
    metadata: {
      ...(memoRecord.metadata || {}),
      signatoryLabel: memoRecord.signatoryLabel || memoRecord.metadata?.signatoryLabel,
      approverLabel: memoRecord.approverLabel || memoRecord.metadata?.approverLabel,
      signatoryCompany: memoRecord.signatoryCompany || memoRecord.metadata?.signatoryCompany,
      signatorySignature: memoRecord.signatorySignature !== undefined ? memoRecord.signatorySignature : memoRecord.metadata?.signatorySignature,
      approverSignature: memoRecord.approverSignature !== undefined ? memoRecord.approverSignature : memoRecord.metadata?.approverSignature,
      signatorySize: memoRecord.signatorySize !== undefined ? memoRecord.signatorySize : memoRecord.metadata?.signatorySize,
      signatoryOffsetX: memoRecord.signatoryOffsetX !== undefined ? memoRecord.signatoryOffsetX : memoRecord.metadata?.signatoryOffsetX,
      signatoryOffsetY: memoRecord.signatoryOffsetY !== undefined ? memoRecord.signatoryOffsetY : memoRecord.metadata?.signatoryOffsetY,
      approverSize: memoRecord.approverSize !== undefined ? memoRecord.approverSize : memoRecord.metadata?.approverSize,
      approverOffsetX: memoRecord.approverOffsetX !== undefined ? memoRecord.approverOffsetX : memoRecord.metadata?.approverOffsetX,
      approverOffsetY: memoRecord.approverOffsetY !== undefined ? memoRecord.approverOffsetY : memoRecord.metadata?.approverOffsetY,
      includedCompanyIds: memoRecord.includedCompanyIds !== undefined ? memoRecord.includedCompanyIds : memoRecord.metadata?.includedCompanyIds,
      letterheadOverrides: memoRecord.letterheadOverrides !== undefined ? memoRecord.letterheadOverrides : memoRecord.metadata?.letterheadOverrides,
      watermark: memoRecord.watermark !== undefined ? memoRecord.watermark : memoRecord.metadata?.watermark
    },
    created_at: memoRecord.createdAt || now,
    updated_at: now
  };

  let syncedToSupabase = false;
  let dbError = null;

  try {
    const { error } = await supabase
      .from(SAVED_MEMOS_TABLE)
      .upsert(payload, { onConflict: "id" });

    if (!error) {
      syncedToSupabase = true;
    } else {
      dbError = error.message;
      console.warn("Supabase saved_memos upsert notice:", error.message);
    }
  } catch (err) {
    dbError = err?.message || String(err);
    console.warn("Supabase saved_memos network notice:", err);
  }

  // Update in-memory session cache across all active stores
  const formattedMemo = {
    id,
    ref: payload.ref_no,
    date: payload.date,
    to: payload.to_field,
    from: payload.from_field,
    subject: payload.subject,
    content: payload.content,
    category: payload.category,
    companyId: payload.company_id,
    directivesFontFamily: payload.directives_font_family,
    directivesFontSize: payload.directives_font_size,
    signatoryLayout: payload.signatory_layout,
    signatoryName: payload.signatory_name,
    signatoryTitle: payload.signatory_title,
    signatoryCompany: payload.metadata?.signatoryCompany,
    approverName: payload.approver_name,
    approverTitle: payload.approver_title,
    signatoryLabel: payload.metadata?.signatoryLabel || "ISSUED BY:",
    approverLabel: payload.metadata?.approverLabel || "NOTED & APPROVED BY:",
    signatorySignature: payload.metadata?.signatorySignature || null,
    approverSignature: payload.metadata?.approverSignature || null,
    signatorySize: payload.metadata?.signatorySize,
    signatoryOffsetX: payload.metadata?.signatoryOffsetX,
    signatoryOffsetY: payload.metadata?.signatoryOffsetY,
    approverSize: payload.metadata?.approverSize,
    approverOffsetX: payload.metadata?.approverOffsetX,
    approverOffsetY: payload.metadata?.approverOffsetY,
    watermark: payload.metadata?.watermark,
    includedCompanyIds: payload.metadata?.includedCompanyIds,
    letterheadOverrides: payload.metadata?.letterheadOverrides,
    savedByUserId: payload.user_id,
    metadata: payload.metadata,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at
  };

  memoryMemosStore.forEach((existingList, key) => {
    if (Array.isArray(existingList)) {
      const filtered = existingList.filter((m) => m.id !== id);
      memoryMemosStore.set(key, [formattedMemo, ...filtered]);
    }
  });
  if (!memoryMemosStore.has("__global__")) {
    memoryMemosStore.set("__global__", [formattedMemo]);
  }
  if (!memoryMemosStore.has(accountKey)) {
    memoryMemosStore.set(accountKey, [formattedMemo]);
  }

  return {
    success: true,
    syncedToSupabase,
    error: dbError,
    memo: formattedMemo,
    accountKey
  };
}

/**
 * Delete a saved memorandum record from Supabase ('saved_memos' table)
 */
export async function deleteMemoRecordFromDb(currentUser = null, memoId) {
  if (!memoId) return { success: false };
  const accountKey = getUserAccountKey(currentUser);

  let syncedToSupabase = false;
  let dbError = null;

  try {
    const { error } = await supabase
      .from(SAVED_MEMOS_TABLE)
      .delete()
      .eq("id", memoId);

    if (!error) {
      syncedToSupabase = true;
    } else {
      dbError = error.message;
    }
  } catch (err) {
    dbError = err?.message || String(err);
  }

  // Update in-memory session cache across all memory stores
  memoryMemosStore.forEach((memoList, key) => {
    if (Array.isArray(memoList)) {
      memoryMemosStore.set(key, memoList.filter((m) => m.id !== memoId));
    }
  });

  const updated = (memoryMemosStore.get("__global__") || memoryMemosStore.get(accountKey) || []);
  return { success: true, syncedToSupabase, error: dbError, remaining: updated };
}
