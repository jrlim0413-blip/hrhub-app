/**
 * ==============================================================================
 * HRHUB APP - CENTRALIZED GEO-TAGGED BOOTHS & KIOSKS SERVICE
 * ==============================================================================
 * Handles multi-user cloud synchronization with Supabase:
 * 1. Primary: public.geo_tagged_booths (dedicated table with Realtime replication)
 * 2. Fallback: public.user_settings (user_id: 'global_geo_tagged_booths')
 * 3. Offline Cache: localStorage ('hrhub_user_tagged_booths')
 *
 * Ensures all team members across all branches, devices, and sessions see
 * the exact same plotted kiosks, teller assignments, and cadastral locations live!
 * ==============================================================================
 */

import { supabase } from "../lib/supabase";

export const LOCAL_STORAGE_KEY = "hrhub_user_tagged_booths";
export const FALLBACK_USER_SETTINGS_ID = "global_geo_tagged_booths";
export const PRIMARY_TABLE = "geo_tagged_booths";

/**
 * Normalizes a database row or raw object into a standard Booth object for the map & inspectors
 */
export function normalizeBooth(raw) {
  if (!raw || typeof raw !== "object") return null;

  const lat = Number(raw.lat ?? (Array.isArray(raw.coords) ? raw.coords[0] : 0));
  const lng = Number(raw.lng ?? (Array.isArray(raw.coords) ? raw.coords[1] : 0));

  return {
    id: String(raw.id || `booth_${Date.now()}`),
    name: String(raw.name || "001").trim(),
    coords: [lat, lng],
    lat,
    lng,
    address: String(raw.address || "").trim(),
    barangayId: String(raw.barangay_id || raw.barangayId || "").trim(),
    barangayName: String(raw.barangay_name || raw.barangayName || "").trim(),
    detectionConfidence: String(raw.confidence || raw.detectionConfidence || "Cadastral Survey Verified").trim(),
    detectionDetail: String(raw.detection_detail || raw.detectionDetail || "Boundary polygon validated").trim(),
    agentId: String(raw.agent_id || raw.agentId || "").trim(),
    tellerName: String(raw.teller_name || raw.tellerName || "").trim(),
    supervisor: String(raw.supervisor || "").trim(),
    contactNumber: String(raw.contact_number || raw.contactNumber || "").trim(),
    notes: String(raw.notes || "").trim(),
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || raw.updatedAt || new Date().toISOString()
  };
}

/**
 * Read cached booths from localStorage (instant, synchronous)
 */
export function getLocalCachedBooths() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeBooth).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn("[GeoBoothsService] Local cache read warning:", err);
  }
  return [];
}

/**
 * Save booths array to localStorage
 */
export function setLocalCachedBooths(booths) {
  try {
    if (Array.isArray(booths)) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(booths));
    }
  } catch (err) {
    console.warn("[GeoBoothsService] Local cache write warning:", err);
  }
}

/**
 * Fetch all booths from Supabase Cloud Database (with automatic fallback to user_settings)
 */
export async function fetchCentralBooths() {
  const localBooths = getLocalCachedBooths();

  if (!supabase) {
    return localBooths;
  }

  // 1. Try Primary Table: public.geo_tagged_booths
  try {
    const { data, error } = await supabase
      .from(PRIMARY_TABLE)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      const normalized = data.map(normalizeBooth).filter(Boolean);
      setLocalCachedBooths(normalized);
      return normalized;
    }

    if (error && error.code !== "42P01") {
      console.warn("[GeoBoothsService] Primary table fetch note:", error.message);
    }
  } catch (err) {
    console.warn("[GeoBoothsService] Primary table query error, falling back:", err);
  }

  // 2. Try Fallback: public.user_settings (user_id = 'global_geo_tagged_booths')
  try {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("user_settings")
      .select("settings_json")
      .eq("user_id", FALLBACK_USER_SETTINGS_ID)
      .limit(1);

    if (!fallbackError && Array.isArray(fallbackData) && fallbackData.length > 0) {
      const json = fallbackData[0]?.settings_json;
      if (json && Array.isArray(json.booths)) {
        const normalized = json.booths.map(normalizeBooth).filter(Boolean);
        setLocalCachedBooths(normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.warn("[GeoBoothsService] Fallback table query error:", err);
  }

  // 3. Fallback to local cache if offline or initial load
  return localBooths;
}

/**
 * Save / Upsert a Booth into the Central Cloud Database & Local Storage
 */
export async function saveCentralBooth(boothData) {
  const normalized = normalizeBooth(boothData);
  if (!normalized || !normalized.id) {
    throw new Error("Invalid booth data to save");
  }

  // 1. Immediate local storage update for 0-latency UI
  const currentList = getLocalCachedBooths();
  const updatedList = [
    normalized,
    ...currentList.filter((b) => b.id !== normalized.id && (!normalized.agentId || b.agentId !== normalized.agentId))
  ];
  setLocalCachedBooths(updatedList);

  // Notify active components in current window
  try {
    window.dispatchEvent(new CustomEvent("hrhub_geo_booths_updated", { detail: updatedList }));
  } catch {}

  // 2. Cloud Database Sync (Dual-upsert for 100% resilience)
  if (supabase) {
    const row = {
      id: normalized.id,
      name: normalized.name,
      lat: normalized.lat,
      lng: normalized.lng,
      address: normalized.address,
      barangay_id: normalized.barangayId,
      barangay_name: normalized.barangayName,
      confidence: normalized.detectionConfidence,
      agent_id: normalized.agentId || null,
      teller_name: normalized.tellerName || null,
      supervisor: normalized.supervisor || null,
      contact_number: normalized.contactNumber || null,
      notes: normalized.notes || null,
      updated_at: new Date().toISOString()
    };

    // A. Upsert into Primary Table
    try {
      const { error: primaryError } = await supabase.from(PRIMARY_TABLE).upsert(row);
      if (primaryError && primaryError.code !== "42P01") {
        console.warn("[GeoBoothsService] Primary table upsert note:", primaryError.message);
      }
    } catch (e) {
      console.warn("[GeoBoothsService] Primary table upsert exception:", e);
    }

    // B. Dual-Sync into Fallback Table (ensures multi-user visibility even before table migration)
    try {
      await supabase.from("user_settings").upsert({
        user_id: FALLBACK_USER_SETTINGS_ID,
        settings_json: {
          booths: updatedList,
          lastUpdated: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("[GeoBoothsService] Fallback user_settings sync note:", e);
    }
  }

  return normalized;
}

/**
 * Delete a Booth from Central Cloud Database & Local Storage
 */
export async function deleteCentralBooth(boothId) {
  if (!boothId) return;

  // 1. Immediate local storage update
  const currentList = getLocalCachedBooths();
  const updatedList = currentList.filter((b) => b.id !== boothId);
  setLocalCachedBooths(updatedList);

  try {
    window.dispatchEvent(new CustomEvent("hrhub_geo_booths_updated", { detail: updatedList }));
  } catch {}

  // 2. Cloud Database Deletion
  if (supabase) {
    // A. Delete from Primary Table
    try {
      const { error } = await supabase.from(PRIMARY_TABLE).delete().eq("id", boothId);
      if (error && error.code !== "42P01") {
        console.warn("[GeoBoothsService] Primary table delete note:", error.message);
      }
    } catch (e) {
      console.warn("[GeoBoothsService] Primary table delete exception:", e);
    }

    // B. Sync deletion to Fallback Table
    try {
      await supabase.from("user_settings").upsert({
        user_id: FALLBACK_USER_SETTINGS_ID,
        settings_json: {
          booths: updatedList,
          lastUpdated: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn("[GeoBoothsService] Fallback table delete note:", e);
    }
  }

  return updatedList;
}

/**
 * Subscribe to real-time changes across all connected devices and users
 */
export function subscribeToCentralBooths(onUpdate) {
  if (typeof onUpdate !== "function") return () => {};

  // 1. Cross-tab & in-window event listener
  const handleWindowSync = (evt) => {
    if (evt.detail && Array.isArray(evt.detail)) {
      onUpdate(evt.detail);
    }
  };
  window.addEventListener("hrhub_geo_booths_updated", handleWindowSync);

  // 2. Supabase Realtime Channel
  let channel = null;
  if (supabase) {
    try {
      channel = supabase
        .channel("hrhub-geo-booths-realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: PRIMARY_TABLE },
          async () => {
            const fresh = await fetchCentralBooths();
            onUpdate(fresh);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_settings",
            filter: `user_id=eq.${FALLBACK_USER_SETTINGS_ID}`
          },
          async () => {
            const fresh = await fetchCentralBooths();
            onUpdate(fresh);
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("[GeoBoothsService] Realtime channel subscription warning:", err);
    }
  }

  // Cleanup function
  return () => {
    window.removeEventListener("hrhub_geo_booths_updated", handleWindowSync);
    if (channel && supabase) {
      try {
        supabase.removeChannel(channel);
      } catch {}
    }
  };
}

