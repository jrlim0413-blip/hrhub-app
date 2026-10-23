/**
 * Dedicated Saved Memos Storage Service
 * Purpose: Manage official saved memorandums in dedicated Supabase table ('saved_memos') per user account,
 * eliminating localStorage.
 */

import { supabase } from "./supabase";
import { getUserAccountKey } from "./userSettingsStorage";

export const SAVED_MEMOS_TABLE = "saved_memos";

// In-memory fallback store to ensure zero crashes if Supabase network fails or table is pending migration
const memoryMemosStore = new Map();

/**
 * Fetch all saved memorandums for a user account from Supabase ('saved_memos' table)
 */
export async function getSavedMemosFromDb(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);

  try {
    const { data, error } = await supabase
      .from(SAVED_MEMOS_TABLE)
      .select("*")
      .eq("user_id", accountKey)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      // Map database row columns to Memo object format
      const mapped = data.map((row) => ({
        id: row.id,
        ref: row.ref_no,
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
        approverName: row.approver_name,
        approverTitle: row.approver_title,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      // Update in-memory session cache
      memoryMemosStore.set(accountKey, mapped);
      return { memos: mapped, source: "supabase" };
    }
  } catch (err) {
    console.warn("Supabase saved_memos fetch notice, checking in-memory session:", err);
  }

  const inMem = memoryMemosStore.get(accountKey) || [];
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
      return data.map((r) => r.ref_no).filter(Boolean);
    }
  } catch (err) {
    console.warn("Notice: Querying all global memo refs fallback to memory:", err);
  }

  // Fallback to memory store across all user accounts
  const allInMemory = [];
  memoryMemosStore.forEach((memoList) => {
    if (Array.isArray(memoList)) {
      memoList.forEach((m) => {
        if (m.ref) allInMemory.push(m.ref);
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

  const payload = {
    id,
    user_id: accountKey,
    ref_no: memoRecord.ref || memoRecord.ref_no || `MEMO-${new Date().getFullYear()}-01`,
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
      signatoryLabel: memoRecord.signatoryLabel,
      approverLabel: memoRecord.approverLabel,
      signatorySignature: memoRecord.signatorySignature,
      approverSignature: memoRecord.approverSignature,
      signatorySize: memoRecord.signatorySize,
      signatoryOffsetX: memoRecord.signatoryOffsetX,
      signatoryOffsetY: memoRecord.signatoryOffsetY,
      approverSize: memoRecord.approverSize,
      approverOffsetX: memoRecord.approverOffsetX,
      approverOffsetY: memoRecord.approverOffsetY,
      includedCompanyIds: memoRecord.includedCompanyIds,
      letterheadOverrides: memoRecord.letterheadOverrides,
      watermark: memoRecord.watermark
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

  // Update in-memory session cache
  const existing = memoryMemosStore.get(accountKey) || [];
  const filtered = existing.filter((m) => m.id !== id);
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
    approverName: payload.approver_name,
    approverTitle: payload.approver_title,
    metadata: payload.metadata,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at
  };
  memoryMemosStore.set(accountKey, [formattedMemo, ...filtered]);

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
      .eq("id", memoId)
      .eq("user_id", accountKey);

    if (!error) {
      syncedToSupabase = true;
    } else {
      dbError = error.message;
    }
  } catch (err) {
    dbError = err?.message || String(err);
  }

  // Update in-memory session cache
  const existing = memoryMemosStore.get(accountKey) || [];
  const updated = existing.filter((m) => m.id !== memoId);
  memoryMemosStore.set(accountKey, updated);

  return { success: true, syncedToSupabase, error: dbError, remaining: updated };
}
