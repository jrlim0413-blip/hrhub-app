// requirementsStorage.js - Persistent database storage for profile registration requirements
// Utilizes IndexedDB for storing full-resolution requirement images and documents
// with localStorage metadata caching for instant retrieval across logouts and page reloads.

import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { supabase } from "./supabase";

const DB_NAME = "hrhub_requirements_db";
const DB_VERSION = 1;
const STORE_NAME = "requirements";
const LOCAL_META_KEY = "hrhub_requirements_metadata";

/**
 * Standardizes a unique profile key from an agent or employee object
 */
export function getAgentIdentifier(agent, index = 0) {
  if (!agent) return `agent-${index}`;
  const raw = agent.id || agent.agent_id || agent.teller_id || agent.email || agent.username || agent.name || agent.fullName || `agent-${index}`;
  return String(raw).toLowerCase().trim();
}

/**
 * Opens or initializes the IndexedDB database
 */
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

/**
 * Reads local metadata cache
 */
function getLocalMeta() {
  try {
    const raw = localStorage.getItem(LOCAL_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Updates local metadata cache
 */
function updateLocalMeta(profileKey, items) {
  try {
    const meta = getLocalMeta();
    meta[profileKey] = items.map(({ id, name, size, type, createdAt }) => ({
      id,
      name,
      size,
      type,
      createdAt
    }));
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn("Local metadata cache update notice:", err);
  }
}

/**
 * Formats bytes to readable size
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Saves a requirement file for a specific profile into Supabase Storage Bucket 'requirements'
 * and registers metadata in PostgreSQL 'agent_requirements' and local cache.
 * @param {string} profileKey - The unique key for the profile
 * @param {File} file - The uploaded file object
 * @returns {Promise<Object>} The saved requirement record
 */
export async function saveRequirementFile(profileKey, file) {
  const normKey = String(profileKey).toLowerCase().trim();
  const fileExt = file.name.split(".").pop() || "png";
  const cleanBaseName = file.name
    .substring(0, file.name.lastIndexOf("."))
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .slice(0, 40) || "document";
  const recordId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const storagePath = `${normKey}/${Date.now()}_${cleanBaseName}.${fileExt}`;

  let publicUrl = null;
  let uploadSuccess = false;

  // 1. Try uploading to Supabase Storage Bucket 'requirements'
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

  // 2. If storage bucket upload succeeded, use the publicUrl.
  // Otherwise, fallback to reading as base64 DataURL so uploads never fail.
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
    name: file.name,
    size: file.size,
    type: file.type || "image/png",
    dataUrl: dataUrl,
    storagePath: uploadSuccess ? storagePath : null,
    createdAt: new Date().toISOString()
  };

  // 3. Persist to IndexedDB for instant offline preview & local fast retrieval
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

  // 4. Sync metadata to Supabase 'agent_requirements' table
  try {
    const { error } = await supabase.from("agent_requirements").upsert({
      id: record.id,
      agent_key: normKey,
      file_name: record.name,
      file_size: record.size,
      file_type: record.type,
      storage_path: record.storagePath,
      data_url: record.dataUrl, // Stores the clean Supabase Storage CDN URL (or base64 fallback)
      created_at: record.createdAt
    });
    if (error) console.warn("Supabase agent_requirements sync note:", error.message);
  } catch (sbErr) {
    console.warn("Supabase requirements sync note:", sbErr);
  }

  // 5. Update local metadata cache
  const currentList = await getRequirementsByProfile(normKey);
  updateLocalMeta(normKey, currentList);

  return record;
}

/**
 * Clears local cached requirements (IndexedDB and localStorage) for a specific profile
 */
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
    // ignore
  }

  const meta = getLocalMeta();
  delete meta[normKey];
  try {
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

/**
 * Synchronizes local IndexedDB cache with remote records from Supabase
 */
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

/**
 * Purges all local requirements cache across all agents in IndexedDB and localStorage
 */
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
    // ignore
  }
}

/**
 * Retrieves all saved requirements for a specific profile
 * Supabase is the primary authoritative source of truth.
 * @param {string} profileKey - The unique key for the profile
 * @returns {Promise<Array>} Array of requirement records
 */
export async function getRequirementsByProfile(profileKey) {
  const normKey = String(profileKey).toLowerCase().trim();

  // 1. Try fetching from Supabase first (Supabase is Single Source of Truth)
  try {
    const { data, error } = await supabase
      .from("agent_requirements")
      .select("*")
      .eq("agent_key", normKey)
      .order("created_at", { ascending: false });

    if (!error) {
      if (data && data.length > 0) {
        const mapped = data.map((d) => ({
          id: d.id,
          profileKey: d.agent_key,
          name: d.file_name,
          size: Number(d.file_size) || 0,
          type: d.file_type || "image/png",
          storagePath: d.storage_path || null,
          dataUrl: d.data_url || d.file_url,
          createdAt: d.created_at
        }));
        await syncLocalCacheWithRemote(normKey, mapped);
        updateLocalMeta(normKey, mapped);
        return mapped;
      } else {
        // Supabase confirmed 0 records exist (user deleted them in Supabase).
        // Immediately purge any stale local IndexedDB & localStorage cache!
        await clearLocalRequirements(normKey);
        updateLocalMeta(normKey, []);
        return [];
      }
    }
  } catch (sbErr) {
    console.warn("Supabase read note, falling back to local DB:", sbErr);
  }

  // 2. Fetch from IndexedDB ONLY if Supabase is offline or error occurred
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
      updateLocalMeta(normKey, records);
      return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  } catch (err) {
    console.warn("IndexedDB read note, checking fallback:", err);
  }

  // Check localStorage fallback
  try {
    const fbKey = `hrhub_req_blob_${normKey}`;
    const fbRecords = JSON.parse(localStorage.getItem(fbKey) || "[]");
    if (fbRecords.length > 0) {
      return fbRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  } catch {
    // ignore
  }

  return [];
}

/**
 * Deletes a requirement file from database and Supabase storage bucket
 * @param {string} requirementId - ID of the requirement to delete
 * @param {string} profileKey - Profile key
 * @param {string|null} storagePath - Path in Supabase storage bucket if uploaded
 * @returns {Promise<boolean>}
 */
export async function deleteRequirementFile(requirementId, profileKey, storagePath = null) {
  const normKey = String(profileKey).toLowerCase().trim();

  // 1. Delete from Supabase Storage bucket if file was uploaded to bucket
  if (storagePath) {
    try {
      await supabase.storage.from("requirements").remove([storagePath]);
    } catch (sErr) {
      console.warn("Supabase storage delete note:", sErr);
    }
  }

  // 2. Delete from IndexedDB
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

  // 3. Delete from Supabase table
  try {
    await supabase.from("agent_requirements").delete().eq("id", requirementId);
  } catch (sbErr) {
    console.warn("Supabase requirement delete note:", sbErr);
  }

  // 4. Delete from localStorage fallback if exists
  try {
    const fbKey = `hrhub_req_blob_${normKey}`;
    const existing = JSON.parse(localStorage.getItem(fbKey) || "[]");
    const filtered = existing.filter((item) => item.id !== requirementId);
    localStorage.setItem(fbKey, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  const remaining = await getRequirementsByProfile(normKey);
  updateLocalMeta(normKey, remaining);
  return true;
}

/**
 * Synchronously get count of requirements for quick badge display
 * @param {string} profileKey
 * @returns {number}
 */
export function getRequirementCountSync(profileKey) {
  const normKey = String(profileKey).toLowerCase().trim();
  const meta = getLocalMeta();
  return meta[normKey]?.length || 0;
}

/**
 * Ensures image dataURL is compatible with PDF embedding (converts WebP/other to standard JPEG/PNG via canvas)
 */
async function ensurePdfCompatibleDataUrl(dataUrl) {
  if (typeof window === "undefined" || !dataUrl) return dataUrl;
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/png")) {
    return dataUrl;
  }

  // If remote Supabase Storage URL, fetch as blob first for reliable CORS conversion
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

/**
 * Measures dimensions of image for aspect-ratio preservation in PDF
 */
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

/**
 * Automatically compiles all requirement images for an agent into a PDF
 * with official header, branding, metadata, and auto-downloads the file.
 */
export async function downloadRequirementsAsPdf({
  agentName = "Agent",
  agentId = "",
  supervisorName = "",
  barangayName = "",
  requirements = []
}) {
  const imageItems = requirements.filter(
    (item) => item.dataUrl && (item.type?.startsWith("image/") || item.dataUrl.startsWith("data:image/"))
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
  const printableWidth = pageWidth - (margin * 2); // 182mm
  const usableTop = 38;
  const usableBottom = pageHeight - 14;
  const usableHeight = usableBottom - usableTop; // 245mm

  const cleanName = agentName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "Agent";
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

    // --- SLEEK TOP HEADER ---
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 26, "F");

    // Emerald accent line
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 26, pageWidth, 2.5, "F");

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("HRHUB · REGISTRATION REQUIREMENTS", margin, 11);

    // Agent Meta
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225); // slate-300
    const metaParts = [`Agent: ${cleanName}`];
    if (agentId && agentId !== "Not provided") metaParts.push(`ID: ${agentId}`);
    if (supervisorName && supervisorName !== "Not provided") metaParts.push(`Spvr: ${supervisorName}`);
    if (barangayName && barangayName !== "Not provided") metaParts.push(`Brgy: ${barangayName}`);
    doc.text(metaParts.join("  |  "), margin, 18);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Generated: ${formattedDate}`, pageWidth - margin, 18, { align: "right" });

    // --- DOCUMENT SUBHEADER ---
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, 31, printableWidth, 9, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const docTitle = `Item ${idx + 1} of ${totalPages}: ${item.name || `Requirement_${idx + 1}`}`;
    doc.text(docTitle, margin + 3, 37);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`File size: ${formatFileSize(item.size)}`, pageWidth - margin - 3, 37, { align: "right" });

    // --- PROCESS & EMBED IMAGE ---
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

      // Soft container border
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

    // --- SLEEK FOOTER ---
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("HRHub Personnel Management System · Official Archival Record", margin, pageHeight - 6);
    doc.text(`Page ${idx + 1} of ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  }

  const downloadFileName = `${cleanName.replaceAll(" ", "_")}_Registration_Requirements.pdf`;
  doc.save(downloadFileName);
  return downloadFileName;
}

/**
 * Downloads a single requirement document compiled into a clean 1-page PDF
 */
export async function downloadSingleRequirementAsPdf({
  requirement,
  agentName = "Agent",
  agentId = "",
  supervisorName = ""
}) {
  if (!requirement?.dataUrl) {
    throw new Error("Invalid requirement document.");
  }
  return downloadRequirementsAsPdf({
    agentName,
    agentId,
    supervisorName,
    requirements: [requirement]
  });
}

/**
 * Downloads all requirement images in batch as a single ZIP archive
 */
export async function downloadRequirementsAsZip({
  agentName = "Agent",
  requirements = []
}) {
  const imageItems = requirements.filter(
    (item) => item.dataUrl && (item.type?.startsWith("image/") || item.dataUrl.startsWith("data:image/") || item.dataUrl.startsWith("http"))
  );

  if (imageItems.length === 0) {
    throw new Error("No requirement images found to download.");
  }

  const cleanName = agentName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replaceAll(" ", "_") || "Agent";
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

/**
 * Downloads all requirement images in batch as individual files directly to disk
 */
export async function batchDownloadIndividualImages({
  agentName = "Agent",
  requirements = []
}) {
  const imageItems = requirements.filter(
    (item) => item.dataUrl && (item.type?.startsWith("image/") || item.dataUrl.startsWith("data:image/") || item.dataUrl.startsWith("http"))
  );

  if (imageItems.length === 0) {
    throw new Error("No requirement images found to download.");
  }

  const cleanName = agentName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim().replaceAll(" ", "_") || "Agent";

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
