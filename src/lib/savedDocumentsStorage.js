
import { supabase } from "./supabase.js";
import { getUserAccountKey } from "./userSettingsStorage.js";

export const SAVED_DOCS_TABLE = "saved_documents";
export const FALLBACK_MEMOS_TABLE = "saved_memos";
const LOCAL_STORAGE_KEY = "hrhub_saved_documents_store_v1";

let isSavedDocsTableAvailable = false;

const memoryDocsStore = new Map();
const sessionUsedDocRefs = new Set();

export function normalizeDocRef(ref = "") {
  if (!ref) return "";
  return String(ref)
    .replace(/-SARG-/gi, "-5ARG-")
    .replace(/\bSARG\b/gi, "5ARG");
}

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

function getLocalCachedDocs(accountKey) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const shared = parsed["__all_hr_documents__"] || [];
        const byAcc = parsed[accountKey] || [];
        const map = new Map();
        for (const item of [...shared, ...byAcc]) {
          if (item && (item.id || item.ref)) {
            const key = item.id || normalizeDocRef(item.ref);
            if (!map.has(key)) {
              map.set(key, { ...item, ref: normalizeDocRef(item.ref) });
            }
          }
        }
        return Array.from(map.values());
      }
    }
  } catch (e) {
    console.warn("Failed reading local cached documents:", e);
  }
  return [];
}

function setLocalCachedDocs(accountKey, docsList) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[accountKey] = docsList;
    parsed["__all_hr_documents__"] = docsList;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
  } catch (e) {
    console.warn("Failed caching documents locally:", e);
  }
}

export async function getSavedDocumentsFromDb(currentUser = null) {
  const accountKey = getUserAccountKey(currentUser);
  const localList = getLocalCachedDocs(accountKey);

  try {
    const { data: memoDocs, error: memoErr } = await supabase
      .from(FALLBACK_MEMOS_TABLE)
      .select("*")
      .ilike("category", "DOC_STUDIO:%")
      .order("created_at", { ascending: false });

    if (!memoErr && Array.isArray(memoDocs)) {
      const mapped = memoDocs.map(mapMemoDocRowToModel);
      memoryDocsStore.set("__global__", mapped);
      memoryDocsStore.set(accountKey, mapped);
      setLocalCachedDocs(accountKey, mapped);
      return { documents: mapped, source: "supabase_memos" };
    }

    if (isSavedDocsTableAvailable) {
      const { data, error } = await supabase
        .from(SAVED_DOCS_TABLE)
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapDocRowToModel);
        memoryDocsStore.set("__global__", mapped);
        memoryDocsStore.set(accountKey, mapped);
        setLocalCachedDocs(accountKey, mapped);
        return { documents: mapped, source: "supabase_docs" };
      }
    }
  } catch (err) {
    console.warn("Supabase documents query notice, falling back to local cache:", err);
  }

  if (localList.length > 0) {
    memoryDocsStore.set(accountKey, localList);
    return { documents: localList, source: "localStorage" };
  }

  const inMem = memoryDocsStore.get(accountKey) || [];
  return { documents: inMem, source: "memory" };
}

export async function getAllGlobalDocumentRefs() {
  const allRefs = [];

  try {
    const { data: memoData, error: memoErr } = await supabase
      .from(FALLBACK_MEMOS_TABLE)
      .select("ref_no, category")
      .ilike("category", "DOC_STUDIO:%");

    if (!memoErr && Array.isArray(memoData)) {
      memoData.forEach((r) => {
        if (r.ref_no) allRefs.push(normalizeDocRef(r.ref_no));
      });
    }

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

  sessionUsedDocRefs.forEach((r) => allRefs.push(r));
  return Array.from(new Set(allRefs));
}

export async function saveDocumentRecordToDb(currentUser = null, docRecord = {}) {
  const accountKey = getUserAccountKey(currentUser);
  const id = docRecord.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const cleanRef = normalizeDocRef(docRecord.ref || `DOC-${new Date().getFullYear()}-01`);

  const serializedElements = (docRecord.paperElements && docRecord.paperElements.length > 0)
    ? JSON.stringify(docRecord.paperElements)
    : (docRecord.content || "");

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
    content: serializedElements,
    company_id: docRecord.companyId || "lucky_betplay",
    company_code: (docRecord.companyCode === "SARG" ? "5ARG" : docRecord.companyCode) || "LBC",
    company_name: docRecord.companyName || "",
    paper_size: docRecord.paperSize || "letter",
    font_family: docRecord.fontFamily || "Arial, Helvetica, sans-serif",
    font_size: docRecord.fontSize || 14.6,
    signatory_layout: docRecord.signatoryLayout || "dual",
    signatory_name: docRecord.signatoryName || "",
    signatory_title: docRecord.signatoryTitle || "",
    approver_name: docRecord.approverName || "",
    approver_title: docRecord.approverTitle || "",
    metadata: {
      paperElements: docRecord.paperElements || [],
      paperSize: docRecord.paperSize || "letter",
      fontFamily: docRecord.fontFamily || "Arial, Helvetica, sans-serif",
      fontSize: docRecord.fontSize || 14.6,
      toolbarFontSize: docRecord.toolbarFontSize || null,
      savedBy: docRecord.savedBy || docRecord.authorName || "HR Officer",
      savedByEmail: docRecord.savedByEmail || docRecord.authorEmail || "",
      savedByRole: docRecord.savedByRole || docRecord.authorRole || "HR Administrator",
      savedByCompany: docRecord.savedByCompany || docRecord.companyName || "",
      savedAt: docRecord.savedAt || now,
      companyCode: (docRecord.companyCode === "SARG" ? "5ARG" : docRecord.companyCode) || "LBC",
      companyName: docRecord.companyName || "",
      title: docRecord.title || "Official Document",
      templateType: docRecord.templateType || "non_affiliation",
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
    if (isSavedDocsTableAvailable) {
      const { error } = await supabase
        .from(SAVED_DOCS_TABLE)
        .upsert(payload, { onConflict: "id" });

      if (!error) syncedToSupabase = true;
    }

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
        content: serializedElements,
        directives_font_family: docRecord.fontFamily || "Arial, Helvetica, sans-serif",
        directives_font_size: docRecord.fontSize || 14.6,
        signatory_layout: docRecord.signatoryLayout || "dual",
        signatory_name: docRecord.signatoryName || "",
        signatory_title: docRecord.signatoryTitle || "",
        approver_name: docRecord.approverName || "",
        approver_title: docRecord.approverTitle || "",
        metadata: {
          ...payload.metadata,
          paperElements: docRecord.paperElements || [],
          savedBy: docRecord.savedBy || docRecord.authorName || "HR Officer",
          savedByEmail: docRecord.savedByEmail || docRecord.authorEmail || "",
          savedByRole: docRecord.savedByRole || docRecord.authorRole || "HR Administrator",
          savedByCompany: docRecord.savedByCompany || docRecord.companyName || "",
          savedAt: docRecord.savedAt || now,
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

  const normalizedModel = {
    ...docRecord,
    id,
    ref: cleanRef,
    paperElements: docRecord.paperElements || [],
    savedBy: docRecord.savedBy || "HR Officer",
    savedByEmail: docRecord.savedByEmail || "",
    savedByRole: docRecord.savedByRole || "HR Administrator",
    savedByCompany: docRecord.savedByCompany || "",
    savedAt: docRecord.savedAt || now,
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

function extractPaperElementsFromRow(meta, row) {
  if (Array.isArray(meta?.paperElements) && meta.paperElements.length > 0) {
    return meta.paperElements;
  }
  if (Array.isArray(row?.paper_elements) && row.paper_elements.length > 0) {
    return row.paper_elements;
  }
  if (typeof row?.content === "string" && row.content.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(row.content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (error) {
      console.warn("Could not parse saved document elements:", error);
    }
  }
  return null;
}

function mapDocRowToModel(row) {
  const meta = row.metadata || {};
  const paperElements = extractPaperElementsFromRow(meta, row);
  const savedAt = meta.savedAt || row.updated_at || row.created_at || new Date().toISOString();
  const savedBy = meta.savedBy || meta.authorName || (row.user_id && row.user_id !== "default" ? row.user_id : "HR Officer");
  const savedByEmail = meta.savedByEmail || meta.authorEmail || "";
  const savedByRole = meta.savedByRole || meta.authorRole || "HR Administrator";
  const savedByCompany = meta.savedByCompany || meta.companyName || row.company_name || "";

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
    paperSize: row.paper_size || meta.paperSize || "letter",
    fontFamily: row.font_family || meta.fontFamily || "Arial, Helvetica, sans-serif",
    fontSize: row.font_size || meta.fontSize || 14.6,
    toolbarFontSize: meta.toolbarFontSize || null,
    paperElements,
    savedBy,
    savedByEmail,
    savedByRole,
    savedByCompany,
    savedAt,
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
  const paperElements = extractPaperElementsFromRow(meta, row);
  const savedAt = meta.savedAt || row.updated_at || row.created_at || new Date().toISOString();
  const savedBy = meta.savedBy || meta.authorName || (row.user_id && row.user_id !== "default" ? row.user_id : "HR Officer");
  const savedByEmail = meta.savedByEmail || meta.authorEmail || "";
  const savedByRole = meta.savedByRole || meta.authorRole || "HR Administrator";
  const savedByCompany = meta.savedByCompany || meta.companyName || "";

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
    fontFamily: row.directives_font_family || meta.fontFamily || "Arial, Helvetica, sans-serif",
    fontSize: row.directives_font_size || meta.fontSize || 14.6,
    toolbarFontSize: meta.toolbarFontSize || null,
    paperElements,
    savedBy,
    savedByEmail,
    savedByRole,
    savedByCompany,
    savedAt,
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
