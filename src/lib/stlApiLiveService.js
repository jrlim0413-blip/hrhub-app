
import stlCacheData from "../data/stlRealApiCache.json";
import { getAreaConfigs } from "./areaApiConfigStorage";

export const STL_ONLY_SUBSIDIARIES = [
  "Lucky Betplay Corporation",
  "Glowing Fortune",
  "5A Royal Gaming OPC",
  "Imperial Gaming OPC"
];

export const STL_ENTITY_CONFIGS = [
  {
    id: "lucky_betplay",
    companyName: "Lucky Betplay Corporation",
    shortName: "Lucky Betplay",
    code: "LBC",
    branch: "Mandaue City, Cebu",
    logoUrl: "/logos/LB.png",
    badgeColor: "bg-blue-100 text-blue-800 border-blue-300",
    centerCoords: [10.3440, 123.9380],
    zoom: 13
  },
  {
    id: "glowing_fortune",
    companyName: "Glowing Fortune",
    shortName: "Glowing Fortune",
    code: "GFC",
    branch: "Iligan City & Lanao del Norte",
    logoUrl: "/logos/GLOW.png",
    badgeColor: "bg-purple-100 text-purple-800 border-purple-300",
    centerCoords: [8.2280, 124.2452],
    zoom: 13
  },
  {
    id: "5a_royal",
    companyName: "5A Royal Gaming OPC",
    shortName: "5A Royal",
    code: "5ARG",
    branch: "Maguindanao del Norte",
    logoUrl: "/logos/5A.png",
    badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-300",
    centerCoords: [7.1850, 124.2380],
    zoom: 12
  },
  {
    id: "imperial_gaming",
    companyName: "Imperial Gaming OPC",
    shortName: "Imperial Gaming",
    code: "IMP",
    branch: "Cotabato City",
    logoUrl: "/logos/IMP.png",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
    centerCoords: [7.2236, 124.2464],
    zoom: 13
  }
];

export function isStlEntity(company) {
  if (!company) return false;
  const norm = String(company).toLowerCase().trim();
  return (
    norm.includes("lucky betplay") ||
    norm.includes("royal") ||
    norm.includes("5a") ||
    norm.includes("glowing") ||
    norm.includes("imperial")
  );
}

export function matchStlCanonicalName(company) {
  if (!company) return "Lucky Betplay Corporation";
  const norm = String(company).toLowerCase().trim();
  if (norm.includes("lucky") || norm.includes("betplay")) return "Lucky Betplay Corporation";
  if (norm.includes("5a") || norm.includes("royal")) return "5A Royal Gaming OPC";
  if (norm.includes("glow") || norm.includes("fortune")) return "Glowing Fortune";
  if (norm.includes("imperial")) return "Imperial Gaming OPC";
  return "Lucky Betplay Corporation";
}

let liveAgents = (stlCacheData && stlCacheData.agents) || [];
let liveSupervisors = (stlCacheData && stlCacheData.supervisors) || [];

export function getStlAgents() {
  return liveAgents;
}

export function getStlSupervisors() {
  return liveSupervisors;
}

export async function fetchLiveStlData() {
  try {
    const areas = getAreaConfigs();
    const stlAreas = areas.filter((a) => isStlEntity(a.companyName));

    const updatedAgents = [];
    const updatedSupervisors = [];

    await Promise.all(
      stlAreas.map(async (area) => {
        const canonicalComp = matchStlCanonicalName(area.companyName);

        if (area.supervisorUrl && area.supervisorToken) {
          try {
            const res = await fetch(area.supervisorUrl, {
              headers: {
                Authorization: `Bearer ${area.supervisorToken}`,
                Accept: "application/json"
              }
            });
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : data?.data || [];
              list.forEach((s) => {
                updatedSupervisors.push({
                  id: s.id,
                  fullName: s.fullName || s.username || `Supervisor #${s.id}`,
                  username: s.username || "",
                  area: s.area || area.areaName,
                  company: canonicalComp,
                  companyShort: area.companyName,
                  areaId: area.id,
                  isActive: s.isActive !== undefined ? Number(s.isActive) : 1,
                  cashierId: s.cashierId || "",
                  contactNumber: s.contactNumber || ""
                });
              });
            }
          } catch (e) {
            console.warn(`Could not live-fetch supervisors for ${area.areaName}:`, e);
          }
        }

        const tellerUrl = area.backupTellersUrl || area.activeTellersUrl;
        const tellerToken = area.backupTellersToken || area.activeTellersToken;
        if (tellerUrl && tellerToken) {
          try {
            const res = await fetch(tellerUrl, {
              headers: {
                Authorization: `Bearer ${tellerToken}`,
                Accept: "application/json"
              }
            });
            if (res.ok) {
              const data = await res.json();
              const list = Array.isArray(data) ? data : data?.data || data?.tellers || [];
              list.forEach((t, idx) => {
                const displayName =
                  t.fullName && t.fullName !== "0" && t.fullName !== "REPLACEMENT"
                    ? t.fullName
                    : t.outlet && t.outlet !== "0"
                    ? t.outlet
                    : t.name || t.username;

                updatedAgents.push({
                  id: t.id || `${area.id}_${idx}`,
                  brgyId: t.brgyId || "1",
                  username: t.username || `teller_${t.id}`,
                  fullName: displayName,
                  address: t.address || area.areaName,
                  location: t.location || area.areaName,
                  outlet: t.outlet || t.name || t.username,
                  contactNumber: t.contactNumber || "09",
                  isActive: t.isActive !== undefined ? Number(t.isActive) : 1,
                  supervisor: t.supervisor || null,
                  company: canonicalComp,
                  companyShort: area.companyName,
                  areaId: area.id,
                  areaName: area.areaName,
                  deviceId: t.deviceId || "",
                  created_at: t.created_at || new Date().toISOString()
                });
              });
            }
          } catch (e) {
            console.warn(`Could not live-fetch tellers for ${area.areaName}:`, e);
          }
        }
      })
    );

    if (updatedAgents.length > 0) {
      liveAgents = updatedAgents;
    }
    if (updatedSupervisors.length > 0) {
      liveSupervisors = updatedSupervisors;
    }

    return {
      agents: liveAgents,
      supervisors: liveSupervisors,
      success: true
    };
  } catch (err) {
    console.warn("Live STL fetch fallback to cache:", err);
    return {
      agents: liveAgents,
      supervisors: liveSupervisors,
      success: false,
      error: err.message
    };
  }
}
