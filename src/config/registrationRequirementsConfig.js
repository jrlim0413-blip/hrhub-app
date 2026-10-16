// registrationRequirementsConfig.js
// Standard HR Registration Document Slots for Agents & Employees
// Strict Sequence Order:
// 1. Biodata -> 2. Barangay Clearance -> 3. Agency Agreement -> 4. Valid ID -> etc.

export const REGISTRATION_SLOTS = [
  {
    id: "biodata",
    order: 1,
    title: "Biodata",
    subtitle: "Biodata, Resume, or Curriculum Vitae (CV)",
    cleanName: "Biodata",
    required: true,
    allowMultiple: false,
    badgeColor: "purple"
  },
  {
    id: "barangay_clearance",
    order: 2,
    title: "Barangay Clearance",
    subtitle: "Barangay Clearance or Certificate of Residency",
    cleanName: "Barangay_Clearance",
    required: true,
    allowMultiple: false,
    badgeColor: "emerald"
  },
  {
    id: "agency_agreement",
    order: 3,
    title: "Agency Agreement",
    subtitle: "Agency Agreement, Contract, or Appointment Form (Multi-page)",
    cleanName: "Agency_Agreement",
    required: true,
    allowMultiple: true,
    badgeColor: "blue"
  },
  {
    id: "valid_id",
    order: 4,
    title: "Valid ID",
    subtitle: "Government Valid ID (Front & Back / Multiple IDs)",
    cleanName: "Valid_ID",
    required: true,
    allowMultiple: true,
    badgeColor: "indigo"
  },
  {
    id: "police_clearance",
    order: 5,
    title: "Police Clearance",
    subtitle: "PNP Police Clearance Certificate",
    cleanName: "Police_Clearance",
    required: false,
    allowMultiple: false,
    badgeColor: "teal"
  },
  {
    id: "nbi_clearance",
    order: 6,
    title: "NBI Clearance",
    subtitle: "National Bureau of Investigation Clearance",
    cleanName: "NBI_Clearance",
    required: false,
    allowMultiple: false,
    badgeColor: "cyan"
  },
  {
    id: "psa_birth_certificate",
    order: 7,
    title: "PSA Birth Certificate",
    subtitle: "PSA / NSO Certificate of Live Birth",
    cleanName: "PSA_Birth_Certificate",
    required: false,
    allowMultiple: false,
    badgeColor: "amber"
  },
  {
    id: "id_picture_2x2",
    order: 8,
    title: "2x2 ID Photo",
    subtitle: "Recent formal 2x2 ID picture with white background",
    cleanName: "2x2_ID_Photo",
    required: false,
    allowMultiple: false,
    badgeColor: "fuchsia"
  },
  {
    id: "other_document",
    order: 9,
    title: "Other Document",
    subtitle: "Medical certificate, certifications, or additional files",
    cleanName: "Other_Document",
    required: false,
    allowMultiple: true,
    badgeColor: "slate"
  }
];

export const REQUIRED_SLOT_IDS = ["biodata", "barangay_clearance", "agency_agreement", "valid_id"];
export const OPTIONAL_SLOTS = REGISTRATION_SLOTS.filter((s) => !s.required);

/**
 * Returns numeric priority rank for a given category id or name
 */
export function getSlotOrder(categoryKeyOrName = "") {
  if (!categoryKeyOrName) return 99;
  const lower = String(categoryKeyOrName).toLowerCase();
  if (lower === "biodata" || lower.includes("biodata") || lower.includes("resume") || lower.includes("cv")) return 1;
  if (lower === "barangay_clearance" || lower.includes("barangay") || lower.includes("brgy")) return 2;
  if (lower === "agency_agreement" || lower.includes("agency") || lower.includes("agreement") || lower.includes("contract")) return 3;
  if (lower === "valid_id" || lower.includes("valid id") || lower.includes("valid_id") || lower.includes("id card") || lower.includes("national id") || lower.includes("driver") || lower.includes("passport") || lower.includes("sss") || lower.includes("umid") || lower.includes("philhealth") || lower.includes("voter")) return 4;
  if (lower === "police_clearance" || lower.includes("police")) return 5;
  if (lower === "nbi_clearance" || lower.includes("nbi")) return 6;
  if (lower === "psa_birth_certificate" || lower.includes("birth") || lower.includes("psa") || lower.includes("nso")) return 7;
  if (lower === "id_picture_2x2" || lower.includes("2x2") || lower.includes("photo")) return 8;
  if (lower === "other_document" || lower.includes("other")) return 9;
  return 99;
}

/**
 * Finds all requirement records matching a specific slot, ordered by their subOrder/sortOrder/createdAt
 */
export function findRequirementsForSlot(requirements = [], slotId = "") {
  if (!requirements || !requirements.length) return [];
  const matches = requirements.filter((r) => {
    if (r.categoryKey === slotId) return true;
    const text = `${r.classifiedType || ""} ${r.name || ""}`.toLowerCase();
    if (slotId === "biodata" && (text.includes("biodata") || text.includes("resume") || text.includes("cv"))) return true;
    if (slotId === "barangay_clearance" && (text.includes("barangay") || text.includes("brgy"))) return true;
    if (slotId === "agency_agreement" && (text.includes("agreement") || text.includes("contract") || text.includes("agency"))) return true;
    if (slotId === "valid_id" && (text.includes("valid id") || text.includes("driver") || text.includes("umid") || text.includes("sss") || text.includes("passport") || text.includes("national id") || text.includes("philhealth") || text.includes("voter") || text.includes("valid_id"))) return true;
    if (slotId === "police_clearance" && text.includes("police")) return true;
    if (slotId === "nbi_clearance" && text.includes("nbi")) return true;
    if (slotId === "psa_birth_certificate" && (text.includes("birth") || text.includes("psa") || text.includes("nso"))) return true;
    if (slotId === "id_picture_2x2" && (text.includes("2x2") || text.includes("photo"))) return true;
    if (slotId === "other_document" && text.includes("other")) return true;
    return false;
  });

  return matches.sort((a, b) => {
    const subA = typeof a.subOrder === "number" ? a.subOrder : (typeof a.sortOrder === "number" ? a.sortOrder : 999);
    const subB = typeof b.subOrder === "number" ? b.subOrder : (typeof b.sortOrder === "number" ? b.sortOrder : 999);
    if (subA !== subB) return subA - subB;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}

/**
 * Finds the primary requirement record matching a specific slot
 */
export function findRequirementForSlot(requirements = [], slotId = "") {
  const all = findRequirementsForSlot(requirements, slotId);
  return all.length > 0 ? all[0] : null;
}

/**
 * Sorts requirements according to the strict slot sequence:
 * 1. Biodata -> 2. Barangay Clearance -> 3. Agency Agreement -> 4. Valid ID -> etc.
 * And within each slot, by subOrder/sortOrder
 */
export function sortRequirementsBySlotSequence(items = []) {
  return [...items].sort((a, b) => {
    const orderA = getSlotOrder(a.categoryKey || a.classifiedType || a.name);
    const orderB = getSlotOrder(b.categoryKey || b.classifiedType || b.name);
    if (orderA !== orderB) return orderA - orderB;

    const subA = typeof a.subOrder === "number" ? a.subOrder : (typeof a.sortOrder === "number" ? a.sortOrder : 999);
    const subB = typeof b.subOrder === "number" ? b.subOrder : (typeof b.sortOrder === "number" ? b.sortOrder : 999);
    if (subA !== subB) return subA - subB;

    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}
