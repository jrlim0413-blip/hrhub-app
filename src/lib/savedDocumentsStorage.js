/**
 * Dedicated Saved Documents & Certificates Storage Service
 * Purpose: Manage official saved certificates, notices, and letters (Coupon Bond studio)
 * with cloud synchronization to Supabase and resilient multi-tier fallback (localStorage & memory).
 */

import { supabase } from "./supabase";
import { getUserAccountKey } from "./userSettingsStorage";

export const SAVED_DOCS_TABLE = "saved_documents";
export const FALLBACK_MEMOS_TABLE = "saved_memos";
const LOCAL_STORAGE_KEY = "hrhub_saved_documents_store_v1";

// Cache table availability: saved_documents table is not deployed on Supabase, so default to false to eliminate 404 console errors
let isSavedDocsTableAvailable = false;

// In-memory fallback cache
const memoryDocsStore = new Map();
const sessionUsedDocRefs = new Set();

/**
 * Normalizes document reference string to strictly guarantee official company codes (e.g. SARG -> 5ARG).
 */
export function normalizeDocRef(ref = "") {
  if (!ref) return "";
  return String(ref)
    .replace(/-SARG-/gi, "-5ARG-")
    .replace(/\bSARG\b/gi, "5ARG");
}

/**
 * Generate a unique sequential document reference code matching company code and date.
 * Format: DOC-YYYY-CODE-YYMMDD-SEQ (e.g. DOC-2026-5ARG-261105-01)
 */
export function generateUniqueDocRef(companyCode = "LBC", allKnownRefs = []) {
  const safeCode = (companyCode === "SARG" ? "5ARG" : companyCode) || "LBC";
  const now = new Date();
  const fullYear = now.getFullYear();
  const yy = String(fullYear).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateTag = `${yy}${mm}${dd}`;

  const candidatePool = new Set([
    ...sessionUsedDocRefs,
    ...(Array.isArray(allKnownRefs) ? allKnownRefs.map(normalizeDocRef) : [])
  ]);

  let maxSeq = 0;
  const dateTagRegex = new RegExp(`(?:${dateTag})[-_]?(\\d+)`, "i");

  for (const ref of candidatePool) {
    if (!ref || typeof ref !== "string") continue;
    const match = ref.match(dateTagRegex);
    if (match && match[1]) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(2, "0");
  const generatedRef = `DOC-${fullYear}-${safeCode}-${dateTag}-${seqStr}`;
  sessionUsedDocRefs.add(generatedRef);
  return generatedRef;
}

export function registerUsedDocRef(ref) {
  if (ref && typeof ref === "string") {
    sessionUsedDocRefs.add(normalizeDocRef(ref.trim()));
  }
}

/**
 * Read cached local documents from localStorage safely.
 */
function getLocalCachedDocs(accountKey) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return (parsed[accountKey] || []).map((d) => ({
          ...d,
          ref: normalizeDocRef(d.ref)
        }));
      }
    }
  } catch (e) {
    console.warn("Failed reading local cached documents:", e);
  }
  return [];
}

/**
 * Write local documents cache to localStorage safely.
 */
function setLocalCachedDocs(accountKey, docsList) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[accountKey] = docsList;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.warn("Failed caching documents locally:", e);
  }
}

/**
 * Fetch all saved official documents for a user account.
 */
export async function getSavedDocumentsFromDb(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const localList = getLocalCachedDocs(accountKey);

  try {
    // 1. Primary check: check records in 'saved_memos' with category like 'DOC_STUDIO:%' (table exists in Supabase)
    const { data: memoDocs, error: memoErr } = await supabase
      .from(FALLBACK_MEMOS_TABLE)
      .select("*")
      .eq("user_id", accountKey)
      .ilike("category", "DOC_STUDIO:%")
      .order("created_at", { ascending: false });

    if (!memoErr && Array.isArray(memoDocs) && memoDocs.length > 0) {
      const mapped = memoDocs.map(mapMemoDocRowToModel);
      memoryDocsStore.set(accountKey, mapped);
      setLocalCachedDocs(accountKey, mapped);
      return { documents: mapped, source: "supabase_memos" };
    }

    // Fallback: check global in saved_memos in case user_id is admin or records are shared
    const { data: allMemoDocs, error: allMemoErr } = await supabase
      .from(FALLBACK_MEMOS_TABLE)
      .select("*")
      .ilike("category", "DOC_STUDIO:%")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!allMemoErr && Array.isArray(allMemoDocs) && allMemoDocs.length > 0) {
      const mapped = allMemoDocs.map(mapMemoDocRowToModel);
      memoryDocsStore.set(accountKey, mapped);
      setLocalCachedDocs(accountKey, mapped);
      return { documents: mapped, source: "supabase_memos_global" };
    }

    // 2. Only if saved_documents is explicitly deployed and available, query it
    if (isSavedDocsTableAvailable) {
      const { data, error } = await supabase
        .from(SAVED_DOCS_TABLE)
        .select("*")
        .eq("user_id", accountKey)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapDocRowToModel);
        memoryDocsStore.set(accountKey, mapped);
        setLocalCachedDocs(accountKey, mapped);
        return { documents: mapped, source: "supabase_docs" };
      }
    }
  } catch (err) {
    console.warn("Supabase documents query notice, falling back to local cache:", err);
  }

  // Fallback to local storage or memory
  if (localList.length > 0) {
    memoryDocsStore.set(accountKey, localList);
    return { documents: localList, source: "localStorage" };
  }

  const inMem = memoryDocsStore.get(accountKey) || [];
  return { documents: inMem, source: "memory" };
}

/**
 * Fetch all document references across all records to guarantee unique numbering sequence.
 */
export async function getAllGlobalDocumentRefs() {
  const allRefs = [];

  try {
    // Check saved_memos (which exists in Supabase)
    const { data: memoData, error: memoErr } = await supabase
      .from(FALLBACK_MEMOS_TABLE)
      .select("ref_no, category")
      .ilike("category", "DOC_STUDIO:%");

    if (!memoErr && Array.isArray(memoData)) {
      memoData.forEach((r) => {
        if (r.ref_no) allRefs.push(normalizeDocRef(r.ref_no));
      });
    }

    // Only query saved_documents if enabled
    if (isSavedDocsTableAvailable) {
      const { data, error } = await supabase
        .from(SAVED_DOCS_TABLE)
        .select("ref_no")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach((r) => {
          if (r.ref_no) allRefs.push(normalizeDocRef(r.ref_no));
        });
      }
    }
  } catch (e) {
    console.warn("Global doc refs query fallback:", e);
  }

  // Include local session refs
  sessionUsedDocRefs.forEach((r) => allRefs.push(r));
  return Array.from(new Set(allRefs));
}

/**
 * Save an official document record to Supabase and local cache.
 */
export async function saveDocumentRecordToDb(currentUser = null, docRecord = {}) {
  const accountKey = getUserAccountKey(currentUser);
  const id = docRecord.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const cleanRef = normalizeDocRef(docRecord.ref || `DOC-${new Date().getFullYear()}-01`);

  const payload = {
    id,
    user_id: accountKey,
    ref_no: cleanRef,
    title: docRecord.title || "Official Document",
    template_type: docRecord.templateType || "non_affiliation",
    date: docRecord.date || "",
    to_field: docRecord.to || "",
    from_field: docRecord.from || "",
    subject: docRecord.subject || docRecord.title || "",
    content: docRecord.content || "",
    company_id: docRecord.companyId || "lucky_betplay",
    company_code: (docRecord.companyCode === "SARG" ? "5ARG" : docRecord.companyCode) || "LBC",
    company_name: docRecord.companyName || "",
    paper_size: docRecord.paperSize || "letter",
    font_family: docRecord.fontFamily || "inter",
    font_size: docRecord.fontSize || 14,
    signatory_layout: docRecord.signatoryLayout || "dual",
    signatory_name: docRecord.signatoryName || "",
    signatory_title: docRecord.signatoryTitle || "",
    approver_name: docRecord.approverName || "",
    approver_title: docRecord.approverTitle || "",
    metadata: {
      templateType: docRecord.templateType,
      signatoryCompany: docRecord.signatoryCompany,
      approverCompany: docRecord.approverCompany,
      signatoryLabel: docRecord.signatoryLabel,
      approverLabel: docRecord.approverLabel,
      signatorySignature: docRecord.signatorySignature,
      approverSignature: docRecord.approverSignature,
      voucherData: docRecord.voucherData || null,
      terminationData: docRecord.terminationData || null,
      explanationData: docRecord.explanationData || null,
      showNotaryBlock: docRecord.showNotaryBlock || false,
      notaryDetails: docRecord.notaryDetails || null,
      watermarkText: docRecord.watermarkText || ""
    },
    created_at: docRecord.createdAt || now,
    updated_at: now
  };

  let syncedToSupabase = false;
  let dbError = null;

  try {
    // 1. If saved_documents table is available, attempt it
    if (isSavedDocsTableAvailable) {
      const { error } = await supabase
        .from(SAVED_DOCS_TABLE)
        .upsert(payload, { onConflict: "id" });

      if (!error) syncedToSupabase = true;
    }

    // 2. Otherwise save directly into saved_memos table (which exists in Supabase)
    if (!syncedToSupabase) {
      const memoPayload = {
        id,
        user_id: accountKey,
        ref_no: cleanRef,
        date: docRecord.date || "",
        to_field: docRecord.to || "",
        from_field: docRecord.from || "",
        subject: docRecord.title || docRecord.subject || "Official Document",
        category: `DOC_STUDIO:${docRecord.templateType || "general"}`,
        company_id: docRecord.companyId || "lucky_betplay",
        content: docRecord.content || "",
        directives_font_family: docRecord.fontFamily || "inter",
        directives_font_size: docRecord.fontSize || 14,
        signatory_layout: docRecord.signatoryLayout || "dual",
        signatory_name: docRecord.signatoryName || "",
        signatory_title: docRecord.signatoryTitle || "",
        approver_name: docRecord.approverName || "",
        approver_title: docRecord.approverTitle || "",
        metadata: {
          ...payload.metadata,
          companyCode: payload.company_code,
          companyName: payload.company_name,
          paperSize: payload.paper_size,
          title: payload.title
        },
        created_at: docRecord.createdAt || now,
        updated_at: now
      };

      const { error: memoErr } = await supabase
        .from(FALLBACK_MEMOS_TABLE)
        .upsert(memoPayload, { onConflict: "id" });

      if (!memoErr) {
        syncedToSupabase = true;
      } else {
        dbError = memoErr.message;
      }
    }
  } catch (e) {
    dbError = e?.message || String(e);
  }

  // Update in-memory and local storage caches
  const normalizedModel = {
    ...docRecord,
    id,
    ref: cleanRef,
    updatedAt: now,
    createdAt: docRecord.createdAt || now
  };

  const existing = getLocalCachedDocs(accountKey);
  const updatedList = [normalizedModel, ...existing.filter((d) => d.id !== id && d.ref !== cleanRef)];
  setLocalCachedDocs(accountKey, updatedList);
  memoryDocsStore.set(accountKey, updatedList);
  registerUsedDocRef(cleanRef);

  return {
    success: true,
    syncedToSupabase,
    dbError,
    record: normalizedModel
  };
}

/**
 * Delete a document from Supabase and local cache.
 */
export async function deleteDocumentRecordFromDb(currentUser = null, id) {
  const accountKey = getUserAccountKey(currentUser);

  try {
    const promises = [supabase.from(FALLBACK_MEMOS_TABLE).delete().eq("id", id)];
    if (isSavedDocsTableAvailable) {
      promises.push(supabase.from(SAVED_DOCS_TABLE).delete().eq("id", id));
    }
    await Promise.allSettled(promises);
  } catch (e) {
    console.warn("Delete document database notice:", e);
  }

  const existing = getLocalCachedDocs(accountKey);
  const filtered = existing.filter((d) => d.id !== id);
  setLocalCachedDocs(accountKey, filtered);
  memoryDocsStore.set(accountKey, filtered);
  return { success: true };
}

// Helpers to map raw database rows to unified model
function mapDocRowToModel(row) {
  const meta = row.metadata || {};
  return {
    id: row.id,
    ref: normalizeDocRef(row.ref_no),
    title: row.title || row.subject || "Official Document",
    templateType: row.template_type || meta.templateType || "non_affiliation",
    date: row.date,
    to: row.to_field,
    from: row.from_field,
    subject: row.subject,
    content: row.content,
    companyId: row.company_id,
    companyCode: normalizeDocRef(row.company_code || "LBC"),
    companyName: row.company_name,
    paperSize: row.paper_size || "letter",
    fontFamily: row.font_family || "inter",
    fontSize: row.font_size || 14,
    signatoryLayout: row.signatory_layout || "dual",
    signatoryName: row.signatory_name,
    signatoryTitle: row.signatory_title,
    signatoryCompany: meta.signatoryCompany,
    approverName: row.approver_name,
    approverTitle: row.approver_title,
    approverCompany: meta.approverCompany,
    voucherData: meta.voucherData || null,
    terminationData: meta.terminationData || null,
    explanationData: meta.explanationData || null,
    showNotaryBlock: Boolean(meta.showNotaryBlock),
    notaryDetails: meta.notaryDetails || null,
    watermarkText: meta.watermarkText || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMemoDocRowToModel(row) {
  const meta = row.metadata || {};
  const tType = row.category ? row.category.replace(/^DOC_STUDIO:/i, "") : "non_affiliation";
  return {
    id: row.id,
    ref: normalizeDocRef(row.ref_no),
    title: meta.title || row.subject || "Official Document",
    templateType: tType,
    date: row.date,
    to: row.to_field,
    from: row.from_field,
    subject: row.subject,
    content: row.content,
    companyId: row.company_id,
    companyCode: normalizeDocRef(meta.companyCode || "LBC"),
    companyName: meta.companyName || "",
    paperSize: meta.paperSize || "letter",
    fontFamily: row.directives_font_family || "inter",
    fontSize: row.directives_font_size || 14,
    signatoryLayout: row.signatory_layout || "dual",
    signatoryName: row.signatory_name,
    signatoryTitle: row.signatory_title,
    signatoryCompany: meta.signatoryCompany,
    approverName: row.approver_name,
    approverTitle: row.approver_title,
    approverCompany: meta.approverCompany,
    voucherData: meta.voucherData || null,
    terminationData: meta.terminationData || null,
    explanationData: meta.explanationData || null,
    showNotaryBlock: Boolean(meta.showNotaryBlock),
    notaryDetails: meta.notaryDetails || null,
    watermarkText: meta.watermarkText || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

