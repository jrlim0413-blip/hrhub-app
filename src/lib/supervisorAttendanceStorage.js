// Centralized Service for Supervisor Attendance Cloud Storage & Sync
import { supabase } from "./supabase";

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Reduces 5MB-15MB phone camera shots to ~150KB-250KB JPEG for instant upload.
 */
export async function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("No file provided for compression"));
    }

    // If it's already a small blob or not an image, resolve directly
    if (file.type && !file.type.startsWith("image/")) {
      return resolve({ blob: file, dataUrl: null });
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        canvas.toBlob(
          (blob) => {
            resolve({ blob, dataUrl: compressedDataUrl, width, height });
          },
          "image/jpeg",
          quality
        );
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads attendance photo proof to the Supabase Storage bucket 'supervisor-attendance'.
 * Returns public URL on success or error info.
 */
export async function uploadAttendancePhoto(fileOrBlob, supervisorId, dateStr) {
  try {
    const cleanDate = dateStr || new Date().toISOString().split("T")[0];
    const timestamp = Date.now();
    const fileName = `${cleanDate}/spvr_${supervisorId}_${timestamp}.jpg`;

    const { data, error } = await supabase.storage
      .from("supervisor-attendance")
      .upload(fileName, fileOrBlob, {
        contentType: "image/jpeg",
        upsert: true
      });

    if (error) {
      console.warn("Supabase Storage Upload Warning:", error.message);
      return { url: null, path: null, error: error.message };
    }

    const { data: publicData } = supabase.storage
      .from("supervisor-attendance")
      .getPublicUrl(fileName);

    return {
      url: publicData?.publicUrl || null,
      path: fileName,
      error: null
    };
  } catch (err) {
    console.warn("Storage upload exception:", err.message);
    return { url: null, path: null, error: err.message };
  }
}

/**
 * Fetches attendance records for a specific date from Supabase.
 * Returns records or safe fallback info without throwing errors.
 */
export async function fetchCloudAttendance(dateStr) {
  try {
    const { data, error } = await supabase
      .from("supervisor_attendance")
      .select("*")
      .eq("attendance_date", dateStr);

    if (error) {
      return { data: null, error: error.message, isCloudAvailable: false };
    }
    return { data, error: null, isCloudAvailable: true };
  } catch (err) {
    return { data: null, error: err.message, isCloudAvailable: false };
  }
}

/**
 * Upserts a supervisor attendance record to Supabase table 'supervisor_attendance'.
 * Automatically adapts and retries if optional columns are missing in schema cache.
 */
export async function upsertCloudAttendance(rec, dateStr) {
  try {
    const payload = {
      supervisor_id: String(rec.supervisorId),
      supervisor_name: rec.fullName || `Supervisor ${rec.supervisorId}`,
      username: rec.username || null,
      attendance_date: dateStr,
      time_in: rec.timeIn || "--",
      status: rec.status || "Present",
      area: String(rec.area || "5"),
      shift: rec.shift || null,
      latitude: rec.latitude !== null && rec.latitude !== undefined && rec.latitude !== "" ? Number(rec.latitude) : null,
      longitude: rec.longitude !== null && rec.longitude !== undefined && rec.longitude !== "" ? Number(rec.longitude) : null,
      location_accuracy: rec.locationAccuracy !== null && rec.locationAccuracy !== undefined && rec.locationAccuracy !== "" ? Number(rec.locationAccuracy) : null,
      location_name: rec.locationName || null,
      photo_url: rec.photoProof || null,
      remarks: rec.remarks || null
    };

    let { data, error } = await supabase
      .from("supervisor_attendance")
      .upsert(payload, { onConflict: "supervisor_id,attendance_date" })
      .select();

    // Self-healing: If an error mentions a column not in schema cache, strip that column and retry immediately
    if (error && error.message && error.message.includes("Could not find the") && error.message.includes("column")) {
      const match = error.message.match(/'([^']+)' column/);
      if (match && match[1] && payload[match[1]] !== undefined) {
        delete payload[match[1]];
        const retryResult = await supabase
          .from("supervisor_attendance")
          .upsert(payload, { onConflict: "supervisor_id,attendance_date" })
          .select();
        data = retryResult.data;
        error = retryResult.error;
      }
    }

    if (error) {
      console.warn("Supabase upsert warning:", error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    console.warn("Supabase upsert exception:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sets up a Realtime subscription to receive instant updates when
 * a supervisor submits check-in from their phone or mobile app.
 */
export function subscribeToAttendanceRealtime(dateStr, onRowChange) {
  try {
    const channelName = `realtime_spvr_att_${dateStr}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "supervisor_attendance",
          filter: `attendance_date=eq.${dateStr}`
        },
        (payload) => {
          if (typeof onRowChange === "function") {
            onRowChange(payload);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch { }
    };
  } catch (err) {
    console.warn("Realtime subscription exception:", err);
    return () => { };
  }
}

/**
 * Fetches attendance records across a full date range (e.g. for Weekly Attendance Reports).
 */
export async function fetchRangeCloudAttendance(startDateStr, endDateStr) {
  try {
    const { data, error } = await supabase
      .from("supervisor_attendance")
      .select("*")
      .gte("attendance_date", startDateStr)
      .lte("attendance_date", endDateStr)
      .order("attendance_date", { ascending: true });

    if (error) {
      console.warn("fetchRangeCloudAttendance warning:", error.message);
      return { data: null, error: error.message, isCloudAvailable: false };
    }
    return { data, error: null, isCloudAvailable: true };
  } catch (err) {
    console.warn("fetchRangeCloudAttendance exception:", err.message);
    return { data: null, error: err.message, isCloudAvailable: false };
  }
}

/**
 * Automatically purges photo proofs from past days (end of day cleanup).
 * All attendance metadata (time_in, status, location, coordinates, remarks) remains 100% intact!
 */
export async function autoPurgePastPhotos(currentDateStr = null) {
  try {
    const today = currentDateStr || new Date().toISOString().split("T")[0];
    let purgedDbCount = 0;
    let purgedFilesCount = 0;

    // 1. Purge from Supabase Database Table: nullify photo_url for records prior to today
    try {
      const { data: rowsToClean, error: selectErr } = await supabase
        .from("supervisor_attendance")
        .select("id, attendance_date, photo_url")
        .lt("attendance_date", today)
        .not("photo_url", "is", null);

      if (!selectErr && Array.isArray(rowsToClean) && rowsToClean.length > 0) {
        const ids = rowsToClean.map((r) => r.id);
        const { error: updateErr } = await supabase
          .from("supervisor_attendance")
          .update({ photo_url: null, photo_storage_path: null })
          .in("id", ids);

        if (!updateErr) {
          purgedDbCount = ids.length;
        } else {
          console.warn("[autoPurgePastPhotos] DB photo update notice:", updateErr.message);
        }
      }
    } catch (dbErr) {
      console.warn("[autoPurgePastPhotos] DB photo purge notice:", dbErr.message);
    }

    // 2. Purge image files from Supabase Storage bucket 'supervisor-attendance'
    try {
      const { data: rootItems, error: listErr } = await supabase.storage
        .from("supervisor-attendance")
        .list();

      if (!listErr && Array.isArray(rootItems)) {
        for (const item of rootItems) {
          // Date folders are named YYYY-MM-DD
          if (!item.id && item.name && item.name.length === 10 && item.name < today) {
            const folderName = item.name;
            const { data: subFiles } = await supabase.storage
              .from("supervisor-attendance")
              .list(folderName);

            if (Array.isArray(subFiles) && subFiles.length > 0) {
              const filePaths = subFiles
                .filter((f) => f.name && !f.name.startsWith("."))
                .map((f) => `${folderName}/${f.name}`);

              if (filePaths.length > 0) {
                const { error: delErr } = await supabase.storage
                  .from("supervisor-attendance")
                  .remove(filePaths);

                if (!delErr) {
                  purgedFilesCount += filePaths.length;
                }
              }
            }
          }
        }
      }
    } catch (storageErr) {
      console.warn("[autoPurgePastPhotos] Storage bucket purge notice:", storageErr.message);
    }

    // 3. Purge base64 / URLs from Browser localStorage for past dates to prevent storage quota limits
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const keysToClean = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith("hrhub_spvr_attendance_v3_") || key.startsWith("hrhub_spvr_attendance_"))) {
            const datePart = key.split("_").pop();
            if (datePart && datePart.length === 10 && datePart < today) {
              keysToClean.push(key);
            }
          }
        }

        for (const key of keysToClean) {
          try {
            const raw = window.localStorage.getItem(key);
            if (raw) {
              const records = JSON.parse(raw);
              if (Array.isArray(records)) {
                let hasChanges = false;
                const cleaned = records.map((rec) => {
                  if (rec.photoProof) {
                    hasChanges = true;
                    return { ...rec, photoProof: null };
                  }
                  return rec;
                });
                if (hasChanges) {
                  window.localStorage.setItem(key, JSON.stringify(cleaned));
                }
              }
            }
          } catch { }
        }
      }
    } catch (localErr) {
      console.warn("[autoPurgePastPhotos] LocalStorage purge notice:", localErr);
    }

    return {
      success: true,
      purgedDbCount,
      purgedFilesCount,
      cutoffDate: today
    };
  } catch (err) {
    console.warn("[autoPurgePastPhotos] Overall purge exception:", err.message);
    return { success: false, error: err.message };
  }
}


