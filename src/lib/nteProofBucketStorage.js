
import { supabase } from "./supabase";

const DB_NAME = "hrhub_nte_proofs_bucket_v1";
const DB_VERSION = 1;
const STORE_NAME = "nte_proof_attachments";

function openBucketDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "reportId" });
        store.createIndex("caseNumber", "caseNumber", { unique: false });
        store.createIndex("uploadedAt", "uploadedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open NTE Proofs bucket"));
  });
}

export function optimizeImageForStorage(dataUrlOrFile, maxWidth = 1200, quality = 0.72) {
  return new Promise((resolve) => {
    if (!dataUrlOrFile || typeof window === "undefined") {
      resolve("");
      return;
    }

    const processDataUrl = (srcUrl) => {
      if (!srcUrl || typeof srcUrl !== "string") {
        resolve("");
        return;
      }
      if (srcUrl.startsWith("data:application/pdf")) {
        resolve(srcUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => resolve(srcUrl);
      img.src = srcUrl;
    };

    if (typeof dataUrlOrFile === "string") {
      processDataUrl(dataUrlOrFile);
    } else if (dataUrlOrFile instanceof Blob || dataUrlOrFile instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => processDataUrl(e.target.result);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(dataUrlOrFile);
    } else {
      resolve("");
    }
  });
}

export function dataUrlToBlob(dataUrl) {
  try {
    const arr = dataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    return null;
  }
}

export async function saveNteProofToBucket(reportId, {
  caseNumber = "",
  fileData = "",
  fileName = "signed_nte_proof.jpg",
  fileType = "image/jpeg",
  fileSize = 0,
  dateServed = "",
  uploadedBy = "Branch HR",
  company = ""
}) {
  if (!fileData) {
    throw new Error("Missing fileData for NTE proof bucket");
  }

  const uploadedAt = new Date().toISOString();
  const bucketKey = `nte-proof-${caseNumber || reportId}`;

  try {
    const db = await openBucketDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const record = {
        reportId: String(reportId || caseNumber),
        caseNumber: String(caseNumber || reportId),
        bucketKey,
        fileData,
        fileName,
        fileType,
        fileSize,
        dateServed,
        uploadedBy,
        company,
        uploadedAt
      };
      store.put(record);

      if (caseNumber && String(caseNumber) !== String(reportId)) {
        store.put({
          ...record,
          reportId: String(caseNumber)
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (dbErr) {
    console.warn("[nteProofBucketStorage] IndexedDB bucket warning:", dbErr);
  }

  let cloudUrl = "";
  if (supabase && typeof fileData === "string" && fileData.startsWith("data:")) {
    try {
      const blob = dataUrlToBlob(fileData);
      if (blob) {
        const ext = fileName.split(".").pop() || "jpg";
        const cloudPath = `cases/${caseNumber || reportId}/signed_nte_${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("nte-proofs")
          .upload(cloudPath, blob, { upsert: true, contentType: fileType });

        if (!uploadErr && uploadData?.path) {
          const { data: publicData } = supabase.storage
            .from("nte-proofs")
            .getPublicUrl(uploadData.path);
          cloudUrl = publicData?.publicUrl || "";
        }
      }
    } catch (cloudErr) {
      console.debug("[nteProofBucketStorage] Cloud bucket sync notice:", cloudErr?.message);
    }
  }

  return {
    bucketKey,
    fileName,
    fileSize,
    dateServed,
    uploadedBy,
    uploadedAt,
    cloudUrl
  };
}

export async function getNteProofFromBucket(idOrCaseNumber) {
  if (!idOrCaseNumber) return null;

  const searchKey = String(idOrCaseNumber).trim();
  const cleanKey = searchKey.replace(/^Case\s+/i, "").trim();

  try {
    const db = await openBucketDB();

    const probeKeys = Array.from(new Set([
      searchKey,
      cleanKey,
      `nte-proof-${searchKey}`,
      `nte-proof-${cleanKey}`,
      `Case ${cleanKey}`
    ]));

    for (const key of probeKeys) {
      const result = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      if (result && result.fileData) {
        return result;
      }
    }

    const indexResult = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      if (store.indexNames.contains("caseNumber")) {
        const index = store.index("caseNumber");
        const req = index.get(cleanKey);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } else {
        resolve(null);
      }
    });

    if (indexResult && indexResult.fileData) {
      return indexResult;
    }

    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          if (val && val.fileData) {
            const rId = String(val.reportId || "");
            const cNum = String(val.caseNumber || "");
            const bKey = String(val.bucketKey || "");
            if (
              rId === searchKey ||
              rId === cleanKey ||
              cNum === searchKey ||
              cNum === cleanKey ||
              bKey === searchKey ||
              bKey === cleanKey ||
              (cleanKey && cNum && cNum.includes(cleanKey)) ||
              (cleanKey && rId && rId.includes(cleanKey))
            ) {
              resolve(val);
              return;
            }
          }
          cursor.continue();
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("[nteProofBucketStorage] Failed to read from bucket:", err);
    return null;
  }
}

export async function deleteNteProofFromBucket(idOrCaseNumber) {
  if (!idOrCaseNumber) return;

  try {
    const db = await openBucketDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(String(idOrCaseNumber));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("[nteProofBucketStorage] Delete error:", err);
  }
}

export async function saveExplanationProofToBucket(reportId, {
  caseNumber = "",
  fileData = "",
  fileName = "employee_written_explanation.jpg",
  fileType = "image/jpeg",
  fileSize = 0,
  dateSubmitted = "",
  uploadedBy = "Branch HR",
  company = "",
  explanationText = ""
}) {
  if (!fileData && !explanationText) {
    throw new Error("Missing fileData or explanationText for Explanation proof bucket");
  }

  const uploadedAt = new Date().toISOString();
  const bucketKey = `explanation-proof-${caseNumber || reportId}`;

  try {
    const db = await openBucketDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const record = {
        reportId: `explanation-${String(reportId || caseNumber)}`,
        caseNumber: String(caseNumber || reportId),
        bucketKey,
        fileData: fileData || "",
        fileName: fileName || "employee_written_explanation.jpg",
        fileType,
        fileSize,
        dateSubmitted,
        uploadedBy,
        company,
        explanationText,
        uploadedAt
      };
      store.put(record);

      if (caseNumber && String(caseNumber) !== String(reportId)) {
        store.put({
          ...record,
          reportId: `explanation-${String(caseNumber)}`
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (dbErr) {
    console.warn("[nteProofBucketStorage] Explanation IndexedDB bucket warning:", dbErr);
  }

  let cloudUrl = "";
  if (supabase && typeof fileData === "string" && fileData.startsWith("data:")) {
    try {
      const blob = dataUrlToBlob(fileData);
      if (blob) {
        const ext = fileName.split(".").pop() || "jpg";
        const cloudPath = `cases/${caseNumber || reportId}/explanation_${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("nte-proofs")
          .upload(cloudPath, blob, { upsert: true, contentType: fileType });

        if (!uploadErr && uploadData?.path) {
          const { data: publicData } = supabase.storage
            .from("nte-proofs")
            .getPublicUrl(uploadData.path);
          cloudUrl = publicData?.publicUrl || "";
        }
      }
    } catch (cloudErr) {
      console.debug("[nteProofBucketStorage] Cloud explanation sync notice:", cloudErr?.message);
    }
  }

  return {
    bucketKey,
    fileName,
    fileSize,
    dateSubmitted,
    uploadedBy,
    uploadedAt,
    cloudUrl,
    explanationText
  };
}

export async function getExplanationProofFromBucket(idOrCaseNumber) {
  if (!idOrCaseNumber) return null;

  const searchKey = String(idOrCaseNumber).trim();
  const cleanKey = searchKey.replace(/^Case\s+/i, "").trim();

  try {
    const db = await openBucketDB();

    const probeKeys = Array.from(new Set([
      `explanation-${searchKey}`,
      `explanation-${cleanKey}`,
      `explanation-proof-${searchKey}`,
      `explanation-proof-${cleanKey}`,
      `explanation-Case ${cleanKey}`
    ]));

    for (const key of probeKeys) {
      const result = await new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      if (result && (result.fileData || result.explanationText)) {
        return result;
      }
    }

    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const val = cursor.value;
          if (val && String(val.reportId || "").startsWith("explanation-")) {
            const rId = String(val.reportId || "").replace(/^explanation-/, "");
            const cNum = String(val.caseNumber || "");
            const bKey = String(val.bucketKey || "");
            if (
              rId === searchKey ||
              rId === cleanKey ||
              cNum === searchKey ||
              cNum === cleanKey ||
              bKey === searchKey ||
              bKey === cleanKey ||
              (cleanKey && cNum && cNum.includes(cleanKey)) ||
              (cleanKey && rId && rId.includes(cleanKey))
            ) {
              resolve(val);
              return;
            }
          }
          cursor.continue();
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn("[nteProofBucketStorage] Failed to read explanation proof:", err);
    return null;
  }
}

export async function deleteExplanationProofFromBucket(idOrCaseNumber) {
  if (!idOrCaseNumber) return;

  try {
    const db = await openBucketDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(`explanation-${String(idOrCaseNumber)}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch (err) {
    console.warn("[nteProofBucketStorage] Delete explanation proof error:", err);
  }
}

