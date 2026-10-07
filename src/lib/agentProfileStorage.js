// agentProfileStorage.js - Persistent database storage for agent profile overrides
// Connects to Supabase ('agent_profiles') with local fallback/caching so custom edits
// (Birthday, Address, Contact No., Emergency contacts, Booth, ID) persist across sessions.

import { supabase } from "./supabase";

const LOCAL_PROFILES_KEY = "hrhub_agent_profile_overrides";

/**
 * Gets all locally cached agent profile overrides
 */
function getLocalOverrides() {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Updates locally cached agent profile overrides
 */
function setLocalOverride(agentKey, data) {
  try {
    const all = getLocalOverrides();
    all[agentKey] = {
      ...all[agentKey],
      ...data,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn("Local agent override save note:", err);
  }
}

/**
 * Clears local cached override for a specific agent
 */
export function clearLocalOverride(agentKey) {
  if (!agentKey) return;
  const normKey = String(agentKey).toLowerCase().trim();
  try {
    const all = getLocalOverrides();
    delete all[normKey];
    localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn("Local agent override clear note:", err);
  }
}

/**
 * Loads saved profile override for a specific agent
 * Tries Supabase first, with automatic local cache fallback
 */
export async function getAgentProfileOverride(agentKey) {
  if (!agentKey) return null;
  const normKey = String(agentKey).toLowerCase().trim();

  // 1. Try fetching from Supabase
  try {
    const { data, error } = await supabase
      .from("agent_profiles")
      .select("*")
      .eq("agent_key", normKey)
      .maybeSingle();

    if (!error) {
      if (data) {
        // Map DB snake_case columns to camelCase form fields
        const mapped = {
          fullName: data.full_name || "",
          birthday: data.birthday || "",
          homeAddress: data.home_address || "",
          contactNumber: data.contact_number || "",
          emergencyName: data.emergency_name || "",
          emergencyContactNumber: data.emergency_contact_number || "",
          boothNumber: data.booth_number || "",
          boothLocation: data.booth_location || "",
          idNumber: data.id_number || "",
          notes: data.notes || ""
        };
        setLocalOverride(normKey, mapped);
        return mapped;
      } else {
        // Supabase answered successfully with null - record was deleted in DB!
        clearLocalOverride(normKey);
        return null;
      }
    }
  } catch (err) {
    console.warn("Supabase profile fetch notice, checking local cache:", err);
  }

  // 2. Check local fallback (only if Supabase was unreachable or error)
  const local = getLocalOverrides();
  return local[normKey] || null;
}

/**
 * Saves or updates agent profile override in Supabase and local cache
 */
export async function saveAgentProfileOverride(agentKey, form) {
  if (!agentKey) return false;
  const normKey = String(agentKey).toLowerCase().trim();

  const payload = {
    agent_key: normKey,
    full_name: form.fullName || "",
    birthday: form.birthday || "",
    home_address: form.homeAddress || "",
    contact_number: form.contactNumber || "",
    emergency_name: form.emergencyName || "",
    emergency_contact_number: form.emergencyContactNumber || "",
    booth_number: form.boothNumber || "",
    booth_location: form.boothLocation || "",
    id_number: form.idNumber || "",
    updated_at: new Date().toISOString()
  };

  // 1. Save to local cache immediately for zero latency
  setLocalOverride(normKey, form);

  // 2. Persist to Supabase
  let syncedToSupabase = false;
  try {
    const { error } = await supabase
      .from("agent_profiles")
      .upsert(payload, { onConflict: "agent_key" });

    if (!error) {
      syncedToSupabase = true;
    } else {
      console.warn("Supabase agent_profiles save notice:", error.message);
    }
  } catch (err) {
    console.warn("Supabase network/table notice:", err);
  }

  return { success: true, syncedToSupabase };
}

/**
 * Synchronously get all local overrides for fast badges and lists
 */
export function getAllAgentProfileOverridesSync() {
  return getLocalOverrides();
}
