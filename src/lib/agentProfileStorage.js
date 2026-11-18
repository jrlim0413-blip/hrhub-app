
import { supabase } from "./supabase";

const LOCAL_PROFILES_KEY = "hrhub_agent_profile_overrides";

function getLocalOverrides() {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

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

export async function getAgentProfileOverride(agentKey) {
  if (!agentKey) return null;
  const normKey = String(agentKey).toLowerCase().trim();

  try {
    const { data, error } = await supabase
      .from("agent_profiles")
      .select("*")
      .eq("agent_key", normKey)
      .maybeSingle();

    if (!error) {
      if (data) {
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
        clearLocalOverride(normKey);
        return null;
      }
    }
  } catch (err) {
    console.warn("Supabase profile fetch notice, checking local cache:", err);
  }

  const local = getLocalOverrides();
  return local[normKey] || null;
}

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

  setLocalOverride(normKey, form);

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

export function getAllAgentProfileOverridesSync() {
  return getLocalOverrides();
}
