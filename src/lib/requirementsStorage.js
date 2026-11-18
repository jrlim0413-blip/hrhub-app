
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { supabase } from "./supabase";
import { API_CONFIG } from "../config/apiConfig";
import { sortRequirementsBySlotSequence, getItemSlotRank } from "../config/registrationRequirementsConfig";

const DB_NAME = "hrhub_requirements_db";
const DB_VERSION = 1;
const STORE_NAME = "requirements";
const LOCAL_META_KEY = "hrhub_requirements_metadata";

export function getAgentIdentifier(agent, index = 0) {
  if (!agent) return `agent-${index}`;
  const raw = agent.id || agent.agent_id || agent.teller_id || agent.email || agent.username || agent.name || agent.fullName || `agent-${index}`;
  return String(raw).toLowerCase().trim();
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("profileKey", "profileKey", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

function getLocalMeta() {
  try {
    const raw = localStorage.getItem(LOCAL_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function updateLocalMeta(profileKey, items) {
  try {
    const meta = getLocalMeta();
    meta[profileKey] = items.map(({ id, name, size, type, createdAt, categoryKey, classifiedType, ocrSnippet, sortOrder, subOrder }) => ({
      id,
      name,
      size,
      type,
      createdAt,
      categoryKey: categoryKey || null,
      classifiedType: classifiedType || null,
      ocrSnippet: ocrSnippet || null,
      sortOrder: typeof sortOrder === "number" ? sortOrder : null,
      subOrder: typeof subOrder === "number" ? subOrder : null
    }));
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn("Local metadata cache update notice:", err);
  }
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export async function saveRequirementFile(profileKey, file, extraMeta = {}) {
  const normKey = String(profileKey).toLowerCase().trim();
  const fileExt = file.name.split(".").pop() || "png";
  const preferredName = extraMeta.fileName || file.name;
  const cleanBaseName = preferredName
    .substring(0, preferredName.lastIndexOf(".") !== -1 ? preferredName.lastIndexOf(".") : preferredName.length)
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .slice(0, 50) || "document";
  const recordId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${normKey}/${Date.now()}_${cleanBaseName}.${fileExt}`;

  let publicUrl = null;
  let uploadSuccess = false;

  try {
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("requirements")
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: true
      });

    if (!uploadErr && uploadData) {
      const { data: urlData } = supabase.storage
        .from("requirements")
        .getPublicUrl(storagePath);
      publicUrl = urlData?.publicUrl;
      uploadSuccess = true;
    } else {
      console.warn("Supabase bucket upload note (will fallback if bucket not ready):", uploadErr?.message || uploadErr);
    }
  } catch (err) {
    console.warn("Storage bucket upload exception:", err);
  }

  let dataUrl = publicUrl;
  if (!dataUrl) {
    dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  const record = {
    id: recordId,
    profileKey: normKey,
    name: preferredName,
    size: file.size,
    type: file.type || "image/png",
    dataUrl: dataUrl,
    storagePath: uploadSuccess ? storagePath : null,
    createdAt: new Date().toISOString(),
    categoryKey: extraMeta.categoryKey || null,
    classifiedType: extraMeta.classifiedType || null,
    ocrSnippet: extraMeta.ocrSnippet || null,
    sortOrder: typeof extraMeta.sortOrder === "number" ? extraMeta.sortOrder : null,
    subOrder: typeof extraMeta.subOrder === "number" ? extraMeta.subOrder : null
  };

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (dbErr) {
    console.warn("IndexedDB save note:", dbErr);
    try {
      const fbKey = `hrhub_req_blob_${normKey}`;
      const existing = JSON.parse(localStorage.getItem(fbKey) || "[]");
      existing.push(record);
      localStorage.setItem(fbKey, JSON.stringify(existing));
    } catch (fbErr) {
      console.warn("Fallback storage limit note:", fbErr);
    }
  }

  try {
    const metaPayload = JSON.stringify({
      categoryKey: record.categoryKey || null,
      classifiedType: record.classifiedType || null,
      subOrder: record.subOrder ?? null,
      sortOrder: record.sortOrder ?? null,
      name: record.name
    });

    const basePayload = {
      id: record.id,
      agent_key: normKey,
      file_name: record.name,
      file_size: record.size,
      file_type: record.type,
      storage_path: record.storagePath,
      data_url: record.dataUrl,
      created_at: record.createdAt
    };

    const { error: fullErr } = await supabase.from("agent_requirements").upsert({
      ...basePayload,
      category_key: record.categoryKey,
      sub_order: record.subOrder,
      sort_order: record.sortOrder,
      classified_type: record.classifiedType,
      ocr_snippet: metaPayload
    });

    if (fullErr) {
      const { error: fallbackErr } = await supabase.from("agent_requirements").upsert({
        ...basePayload,
        classified_type: record.classifiedType,
        ocr_snippet: metaPayload
      });

      if (fallbackErr) {
        await supabase.from("agent_requirements").upsert(basePayload);
      }
    }
  } catch (sbErr) {
    console.warn("Supabase requirements sync note:", sbErr);
  }

  const currentList = await getRequirementsByProfile(normKey);
  updateLocalMeta(normKey, currentList);

  return record;
}

export async function updateRequirementRecord(profileKey, recordId, updates = {}) {
  const normKey = String(profileKey).toLowerCase().trim();

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(recordId);
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (existing) {
          const updated = { ...existing, ...updates };
          store.put(updated);
        }
        resolve(true);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn("IndexedDB update notice:", err);
  }

  try {
    const sbUpdates = {};
    if (updates.name !== undefined) sbUpdates.file_name = updates.name;
    if (updates.categoryKey !== undefined) sbUpdates.category_key = updates.categoryKey;
    if (updates.classifiedType !== undefined) sbUpdates.classified_type = updates.classifiedType;
    if (updates.ocrSnippet !== undefined) sbUpdates.ocr_snippet = updates.ocrSnippet;
    if (updates.sortOrder !== undefined) sbUpdates.sort_order = updates.sortOrder;

    if (Object.keys(sbUpdates).length > 0) {
      const { error } = await supabase
        .from("agent_requirements")
        .update(sbUpdates)
        .eq("id", recordId);

      if (error && (sbUpdates.classified_type || sbUpdates.ocr_snippet || sbUpdates.sort_order)) {
        await supabase
          .from("agent_requirements")
          .update({ file_name: updates.name })
          .eq("id", recordId);
      }
    }
  } catch (sbErr) {
    console.warn("Supabase update notice:", sbErr);
  }

  try {
    const fbKey = `hrhub_req_blob_${normKey}`;
    const raw = localStorage.getItem(fbKey);
    if (raw) {
      const items = JSON.parse(raw);
      const idx = items.findIndex((i) => i.id === recordId);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...updates };
        localStorage.setItem(fbKey, JSON.stringify(items));
      }
    }
  } catch {
  }

  const currentList = await getRequirementsByProfile(normKey);
  updateLocalMeta(normKey, currentList);
  return currentList.find((i) => i.id === recordId) || null;
}

export async function saveRequirementsOrder(profileKey, items = []) {
  const normKey = String(profileKey).toLowerCase().trim();

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    items.forEach((item, idx) => {
      const getReq = store.get(item.id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          store.put({ ...getReq.result, sortOrder: idx + 1 });
        }
      };
    });
  } catch (err) {
    console.warn("IndexedDB save order notice:", err);
  }

  try {
    const fbKey = `hrhub_req_blob_${normKey}`;
    const raw = localStorage.getItem(fbKey);
    if (raw) {
      const existing = JSON.parse(raw);
      const updated = existing.map((rec) => {
        const foundIdx = items.findIndex((it) => it.id === rec.id);
        return foundIdx !== -1 ? { ...rec, sortOrder: foundIdx + 1 } : rec;
      });
      localStorage.setItem(fbKey, JSON.stringify(updated));
    }
  } catch {
  }

  updateLocalMeta(normKey, items);
  return items;
}

export async function clearLocalRequirements(profileKey) {
  const normKey = String(profileKey).toLowerCase().trim();
  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("profileKey");
      const request = index.getAllKeys(IDBKeyRange.only(normKey));
      request.onsuccess = () => {
        const keys = request.result || [];
        keys.forEach((k) => store.delete(k));
        resolve(true);
      };
      request.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn("Clear local DB note:", e);
  }

  try {
    localStorage.removeItem(`hrhub_req_blob_${normKey}`);
  } catch {
  }

  const meta = getLocalMeta();
  delete meta[normKey];
  try {
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(meta));
  } catch {
  }
}

async function syncLocalCacheWithRemote(normKey, remoteRecords) {
  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("profileKey");
      const request = index.getAllKeys(IDBKeyRange.only(normKey));
      request.onsuccess = () => {
        const keys = request.result || [];
        keys.forEach((k) => store.delete(k));
        remoteRecords.forEach((rec) => store.put(rec));
        resolve(true);
      };
      request.onerror = () => resolve(false);
    });
  } catch (e) {
    console.warn("Sync local cache note:", e);
  }
}

export async function purgeAllLocalRequirementsCache() {
  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      resolve(true);
    });
  } catch (e) {
    console.warn("Purge IndexedDB note:", e);
  }
  try {
    localStorage.removeItem(LOCAL_META_KEY);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("hrhub_req_blob_")) {
        localStorage.removeItem(key);
      }
    });
  } catch {
  }
}

export async function getRequirementsByProfile(profileKey) {
  const normKey = String(profileKey).toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from("agent_requirements")
      .select("*")
      .eq("agent_key", normKey)
      .order("created_at", { ascending: false });

    if (!error) {
      if (data && data.length > 0) {
        const mapped = data.map((d) => {
          let parsedMeta = {};
          if (d.ocr_snippet && typeof d.ocr_snippet === "string") {
            const trimmed = d.ocr_snippet.trim();
            if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
              try {
                parsedMeta = JSON.parse(trimmed);
              } catch {
                parsedMeta = {};
              }
            }
          }

          let catKey = d.category_key || parsedMeta.categoryKey || null;
          let classType = d.classified_type || parsedMeta.classifiedType || null;
          let sOrder = typeof d.sort_order === "number" ? d.sort_order : (typeof parsedMeta.sortOrder === "number" ? parsedMeta.sortOrder : null);
          let subOrd = typeof d.sub_order === "number" ? d.sub_order : (typeof parsedMeta.subOrder === "number" ? parsedMeta.subOrder : null);

          if (!catKey) {
            const rank = getItemSlotRank({ ...d, name: d.file_name, storagePath: d.storage_path });
            if (rank === 1) { catKey = "biodata"; classType = classType || "Biodata"; sOrder = sOrder ?? 1; }
            else if (rank === 2) { catKey = "barangay_clearance"; classType = classType || "Barangay Clearance"; sOrder = sOrder ?? 2; }
            else if (rank === 3) { catKey = "agency_agreement"; classType = classType || "Agency Agreement"; sOrder = sOrder ?? 3; }
            else if (rank === 4) { catKey = "valid_id"; classType = classType || "Valid ID"; sOrder = sOrder ?? 4; }
            else if (rank === 5) { catKey = "police_clearance"; classType = classType || "Police Clearance"; sOrder = sOrder ?? 5; }
            else if (rank === 6) { catKey = "nbi_clearance"; classType = classType || "NBI Clearance"; sOrder = sOrder ?? 6; }
            else if (rank === 7) { catKey = "psa_birth_certificate"; classType = classType || "PSA Birth Certificate"; sOrder = sOrder ?? 7; }
            else if (rank === 8) { catKey = "id_picture_2x2"; classType = classType || "2x2 ID Photo"; sOrder = sOrder ?? 8; }
            else if (rank === 9) { catKey = "other_document"; classType = classType || "Other Document"; sOrder = sOrder ?? 9; }
          }

          const fallbackUrl = d.storage_path
            ? `${API_CONFIG.SUPABASE_URL}/storage/v1/object/public/requirements/${d.storage_path}`
            : null;
          const resolvedDataUrl = d.data_url || d.file_url || fallbackUrl;

          return {
            id: d.id,
            profileKey: d.agent_key,
            name: d.file_name,
            size: Number(d.file_size) || 0,
            type: d.file_type || "image/png",
            storagePath: d.storage_path || null,
            dataUrl: resolvedDataUrl,
            createdAt: d.created_at,
            categoryKey: catKey,
            classifiedType: classType,
            ocrSnippet: d.ocr_snippet || null,
            sortOrder: sOrder,
            subOrder: subOrd
          };
        });

        const unassigned = mapped.filter((m) => !m.categoryKey);
        if (unassigned.length > 0) {
          const sortedUnassigned = [...unassigned].sort((a, b) => {
            const comp = compareFileNamesNaturally(a.name, b.name);
            if (comp !== 0) return comp;
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
          });

          const hasBiodata = mapped.some((m) => m.categoryKey === "biodata");
          const hasBarangay = mapped.some((m) => m.categoryKey === "barangay_clearance");
          const hasValidId = mapped.some((m) => m.categoryKey === "valid_id");

          sortedUnassigned.forEach((item, idx) => {
            let assignedSlot = null;
            let cleanPrefix = "";

            if (!hasBiodata && idx === 0) {
              assignedSlot = "biodata";
              cleanPrefix = "Biodata";
            } else if (!hasBarangay && (idx === 1 || (!hasBiodata && idx === 1) || (hasBiodata && idx === 0))) {
              assignedSlot = "barangay_clearance";
              cleanPrefix = "Barangay_Clearance";
            } else if (!hasValidId && idx === sortedUnassigned.length - 1) {
              assignedSlot = "valid_id";
              cleanPrefix = "Valid_ID";
            } else {
              assignedSlot = "agency_agreement";
              cleanPrefix = "Agency_Agreement";
            }

            item.categoryKey = assignedSlot;
            item.classifiedType = assignedSlot.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            item.sortOrder = getSlotOrder(assignedSlot);

            const newFileName = item.name.toLowerCase().includes(cleanPrefix.toLowerCase())
              ? item.name
              : `${cleanPrefix}_${item.name}`;
            item.name = newFileName;
            supabase.from("agent_requirements").update({ file_name: newFileName }).eq("id", item.id).then(() => {});
          });
        }

        const ordered = sortRequirementsBySlotSequence(mapped);
        await syncLocalCacheWithRemote(normKey, ordered);
        updateLocalMeta(normKey, ordered);
        return ordered;
      } else {
        await clearLocalRequirements(normKey);
        updateLocalMeta(normKey, []);
        return [];
      }
    }
  } catch (sbErr) {
    console.warn("Supabase read note, falling back to local DB:", sbErr);
  }

  try {
    const db = await openDB();
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("profileKey");
      const request = index.getAll(IDBKeyRange.only(normKey));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    if (records && records.length > 0) {
      const ordered = sortRequirementsBySlotSequence(records);
      updateLocalMeta(normKey, ordered);
      return ordered;
    }
  } catch (err) {
    console.warn("IndexedDB read note, checking fallback:", err);
  }

  try {
    const fbKey = `hrhub_req_blob_${normKey}`;
    const fbRecords = JSON.parse(localStorage.getItem(fbKey) || "[]");
    if (fbRecords.length > 0) {
      return sortRequirementsBySlotSequence(fbRecords);
    }
  } catch {
  }

  return [];
}

export async function deleteRequirementFile(requirementId, profileKey, storagePath = null) {
  const normKey = String(profileKey).toLowerCase().trim();

  if (storagePath) {
    try {
      await supabase.storage.from("requirements").remove([storagePath]);
    } catch (sErr) {
      console.warn("Supabase storage delete note:", sErr);
    }
  }

  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(requirementId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("IndexedDB delete note:", err);
  }

  try {
    await supabase.from("agent_requirements").delete().eq("id", requirementId);
  } catch (sbErr) {
    console.warn("Supabase requirement delete note:", sbErr);
  }

  try {
    const fbKey = `hrhub_req_blob_${normKey}`;
    const existing = JSON.parse(localStorage.getItem(fbKey) || "[]");
    const filtered = existing.filter((item) => item.id !== requirementId);
    localStorage.setItem(fbKey, JSON.stringify(filtered));
  } catch {
  }

  const remaining = await getRequirementsByProfile(normKey);
  updateLocalMeta(normKey, remaining);
  return true;
}

export function getRequirementCountSync(profileKey) {
  const normKey = String(profileKey).toLowerCase().trim();
  const meta = getLocalMeta();
  return meta[normKey]?.length || 0;
}

async function ensurePdfCompatibleDataUrl(dataUrl) {
  if (typeof window === "undefined" || !dataUrl) return dataUrl;
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/png")) {
    return dataUrl;
  }

  if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      if (base64Data.startsWith("data:image/jpeg") || base64Data.startsWith("data:image/png")) {
        return base64Data;
      }
      dataUrl = base64Data;
    } catch (fetchErr) {
      console.warn("Direct blob fetch note, attempting standard canvas load:", fetchErr);
    }
  }

  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width || 800;
    canvas.height = img.naturalHeight || img.height || 600;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch (err) {
    console.warn("Image conversion fallback to original:", err);
    return dataUrl;
  }
}

function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ width: 800, height: 600 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 800,
        height: img.naturalHeight || img.height || 600
      });
    };
    img.onerror = () => {
      resolve({ width: 800, height: 600 });
    };
    img.src = dataUrl;
  });
}

export async function generateRequirementsPdfDoc({
  agentName = "Agent",
  agentId = "",
  supervisorName = "",
  barangayName = "",
  requirements = []
}) {
  const sortedRequirements = sortRequirementsBySlotSequence(requirements);
  const imageItems = sortedRequirements.filter(
    (item) => item.dataUrl && (item.type?.startsWith("image/") || item.dataUrl.startsWith("data:image/") || item.dataUrl.startsWith("http"))
  );

  if (!imageItems || imageItems.length === 0) {
    throw new Error("No image requirements found to generate PDF.");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const printableWidth = pageWidth - (margin * 2);
  const usableTop = 38;
  const usableBottom = pageHeight - 14;
  const usableHeight = usableBottom - usableTop;

  const cleanName = String(agentName || "Agent").replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "Agent";
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  const totalPages = imageItems.length;

  for (let idx = 0; idx < imageItems.length; idx++) {
    const item = imageItems[idx];
    if (idx > 0) {
      doc.addPage("a4", "portrait");
    }

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 26, "F");

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 26, pageWidth, 2.5, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("HRHUB · REGISTRATION REQUIREMENTS", margin, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    const metaParts = [`Agent: ${cleanName}`];
    if (agentId && agentId !== "Not provided") metaParts.push(`ID: ${agentId}`);
    if (supervisorName && supervisorName !== "Not provided") metaParts.push(`Spvr: ${supervisorName}`);
    if (barangayName && barangayName !== "Not provided") metaParts.push(`Brgy: ${barangayName}`);
    doc.text(metaParts.join("  |  "), margin, 18);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${formattedDate}`, pageWidth - margin, 18, { align: "right" });

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, 31, printableWidth, 9, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    const typePrefix = item.classifiedType ? `[${item.classifiedType}] ` : "";
    const docTitle = `Item ${idx + 1} of ${totalPages}: ${typePrefix}${item.name || `Requirement_${idx + 1}`}`;
    doc.text(docTitle, margin + 3, 37);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`File size: ${formatFileSize(item.size)}`, pageWidth - margin - 3, 37, { align: "right" });

    try {
      const compatibleUrl = await ensurePdfCompatibleDataUrl(item.dataUrl);
      const dims = await getImageDimensions(compatibleUrl);
      const imgRatio = dims.width / dims.height;

      const availH = usableHeight - 12;
      let renderWidth = printableWidth;
      let renderHeight = renderWidth / imgRatio;

      if (renderHeight > availH) {
        renderHeight = availH;
        renderWidth = renderHeight * imgRatio;
      }

      const xOffset = margin + (printableWidth - renderWidth) / 2;
      const yOffset = 43 + (availH - renderHeight) / 2;

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(xOffset - 1, yOffset - 1, renderWidth + 2, renderHeight + 2, 1.5, 1.5, "FD");

      const format = compatibleUrl.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(compatibleUrl, format, xOffset, yOffset, renderWidth, renderHeight, undefined, "FAST");
    } catch (imgErr) {
      console.warn("Could not draw image in PDF:", imgErr);
      doc.setTextColor(220, 38, 38);
      doc.setFontSize(10);
      doc.text(`[Image could not be rendered: ${item.name}]`, margin, 60);
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("HRHub Personnel Management System · Official Archival Record", margin, pageHeight - 6);
    doc.text(`Page ${idx + 1} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  const fileName = `${cleanName.replaceAll(" ", "_")}_Registration_Requirements.pdf`;
  const blob = doc.output("blob");
  const blobUrl = URL.createObjectURL(blob);

  return {
    doc,
    blob,
    blobUrl,
    fileName,
    totalPages
  };
}

export async function downloadRequirementsAsPdf(params) {
  const { doc, fileName } = await generateRequirementsPdfDoc(params);
  doc.save(fileName);
  return fileName;
}

export async function generateSingleRequirementPdfDoc({
  requirement,
  agentName = "Agent",
  agentId = "",
  supervisorName = ""
}) {
  if (!requirement?.dataUrl) {
    throw new Error("Invalid requirement document.");
  }
  return generateRequirementsPdfDoc({
    agentName,
    agentId,
    supervisorName,
    requirements: [requirement]
  });
}

export async function downloadSingleRequirementAsPdf({
  requirement,
  agentName = "Agent",
  agentId = "",
  supervisorName = ""
}) {
  const { doc, fileName } = await generateSingleRequirementPdfDoc({
    requirement,
    agentName,
    agentId,
    supervisorName
  });
  doc.save(fileName);
  return fileName;
}

export async function downloadRequirementsAsZip({
  agentName = "Agent",
  requirements = []
}) {
  const sortedRequirements = sortRequirementsBySlotSequence(requirements);
  const imageItems = sortedRequirements.filter(
    (item) => item.dataUrl && (item.type?.startsWith("image/") || item.dataUrl.startsWith("data:image/") || item.dataUrl.startsWith("http"))
  );

  if (imageItems.length === 0) {
    throw new Error("No requirement images found to download.");
  }

  const cleanName = String(agentName || "Agent").replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replaceAll(" ", "_") || "Agent";
  const zip = new JSZip();
  const folder = zip.folder(`${cleanName}_Requirements`);

  for (let i = 0; i < imageItems.length; i++) {
    const item = imageItems[i];
    const dataUrl = item.dataUrl;
    const originalExt = item.name.split(".").pop() || "jpg";
    const baseName = item.name.substring(0, item.name.lastIndexOf(".")) || item.name;
    const safeFileName = `${i + 1}_${baseName.replace(/[^a-zA-Z0-9_\- ]/g, "_")}.${originalExt}`;

    if (dataUrl.startsWith("data:")) {
      const commaIndex = dataUrl.indexOf(",");
      if (commaIndex !== -1) {
        const base64Data = dataUrl.slice(commaIndex + 1);
        folder.file(safeFileName, base64Data, { base64: true });
      }
    } else if (dataUrl.startsWith("http")) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        folder.file(safeFileName, blob);
      } catch (fetchErr) {
        console.warn(`Failed to fetch ${item.name} for ZIP:`, fetchErr);
      }
    }
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 }
  });

  const zipUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = zipUrl;
  link.download = `${cleanName}_Requirements_Images.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(zipUrl), 1000);

  return link.download;
}

export async function batchDownloadIndividualImages({
  agentName = "Agent",
  requirements = []
}) {
  const sortedRequirements = sortRequirementsBySlotSequence(requirements);
  const imageItems = sortedRequirements.filter(
    (item) => item.dataUrl && (item.type?.startsWith("image/") || item.dataUrl.startsWith("data:image/") || item.dataUrl.startsWith("http"))
  );

  if (imageItems.length === 0) {
    throw new Error("No requirement images found to download.");
  }

  const cleanName = String(agentName || "Agent").replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replaceAll(" ", "_") || "Agent";

  for (let i = 0; i < imageItems.length; i++) {
    const item = imageItems[i];
    const originalExt = item.name.split(".").pop() || "jpg";
    const baseName = item.name.substring(0, item.name.lastIndexOf(".")) || item.name;
    const downloadName = `${cleanName}_${i + 1}_${baseName.replace(/[^a-zA-Z0-9_\- ]/g, "_")}.${originalExt}`;

    let downloadUrl = item.dataUrl;
    let blobUrlToRevoke = null;

    if (item.dataUrl.startsWith("http")) {
      try {
        const res = await fetch(item.dataUrl);
        const blob = await res.blob();
        downloadUrl = URL.createObjectURL(blob);
        blobUrlToRevoke = downloadUrl;
      } catch {
        downloadUrl = item.dataUrl;
      }
    }

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (blobUrlToRevoke) {
      setTimeout(() => URL.revokeObjectURL(blobUrlToRevoke), 5000);
    }

    if (i < imageItems.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return imageItems.length;
}
