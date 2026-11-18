
export const REGISTRATION_SLOTS = [
  {
    id: "biodata",
    order: 1,
    title: "Biodata",
    subtitle: "Biodata, Resume, or Curriculum Vitae (CV)",
    cleanName: "Biodata",
    required: true,
    allowMultiple: true,
    badgeColor: "purple"
  },
  {
    id: "barangay_clearance",
    order: 2,
    title: "Barangay Clearance",
    subtitle: "Barangay Clearance or Certificate of Residency",
    cleanName: "Barangay_Clearance",
    required: true,
    allowMultiple: true,
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

export function getSlotOrder(categoryKeyOrName = "") {
  if (!categoryKeyOrName) return 99;
  const lower = String(categoryKeyOrName).toLowerCase().trim();
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

export function getItemSlotRank(item) {
  if (!item) return 99;

  if (item.categoryKey) {
    const direct = getSlotOrder(item.categoryKey);
    if (direct < 99) return direct;
  }

  if (item.ocrSnippet) {
    try {
      const parsed = typeof item.ocrSnippet === "string" && item.ocrSnippet.trim().startsWith("{")
        ? JSON.parse(item.ocrSnippet)
        : item.ocrSnippet;
      if (parsed?.categoryKey) {
        const ocrDirect = getSlotOrder(parsed.categoryKey);
        if (ocrDirect < 99) return ocrDirect;
      }
      if (parsed?.classifiedType) {
        const ocrClass = getSlotOrder(parsed.classifiedType);
        if (ocrClass < 99) return ocrClass;
      }
    } catch {
    }
  }

  if (item.classifiedType) {
    const classOrder = getSlotOrder(item.classifiedType);
    if (classOrder < 99) return classOrder;
  }

  if (item.storagePath) {
    const sp = item.storagePath.toLowerCase();
    if (sp.includes("biodata") || sp.includes("resume") || sp.includes("cv")) return 1;
    if (sp.includes("barangay") || sp.includes("brgy")) return 2;
    if (sp.includes("agency") || sp.includes("agreement") || sp.includes("contract")) return 3;
    if (sp.includes("valid_id") || sp.includes("valid id") || sp.includes("id_card")) return 4;
    if (sp.includes("police")) return 5;
    if (sp.includes("nbi")) return 6;
    if (sp.includes("birth") || sp.includes("psa") || sp.includes("nso")) return 7;
    if (sp.includes("2x2") || sp.includes("photo")) return 8;
  }

  const rawName = String(item.name || item.fileName || "").toLowerCase();
  if (rawName) {
    const nameOrder = getSlotOrder(rawName);
    if (nameOrder < 99) return nameOrder;
  }

  if (typeof item.sortOrder === "number" && item.sortOrder >= 1 && item.sortOrder <= 9) {
    return item.sortOrder;
  }

  return 99;
}

export function extractFileNumber(fileName = "") {
  if (!fileName) return null;
  const clean = String(fileName).replace(/\.[^/.]+$/, "");
  const matches = clean.match(/\d+/g);
  if (matches && matches.length > 0) {
    const lastNum = matches[matches.length - 1];
    return parseInt(lastNum, 10);
  }
  return null;
}

export function compareFileNamesNaturally(nameA = "", nameB = "") {
  const strA = String(nameA || "").trim();
  const strB = String(nameB || "").trim();

  const lowerA = strA.toLowerCase();
  const lowerB = strB.toLowerCase();
  if (lowerA.includes("front") && lowerB.includes("back")) return -1;
  if (lowerA.includes("back") && lowerB.includes("front")) return 1;

  const numA = extractFileNumber(strA);
  const numB = extractFileNumber(strB);

  if (numA !== null && numB !== null && numA !== numB) {
    return numA - numB;
  }

  return strA.localeCompare(strB, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

export function findRequirementsForSlot(requirements = [], slotId = "") {
  if (!requirements || !requirements.length) return [];
  const targetRank = getSlotOrder(slotId);

  const matches = requirements.filter((r) => {
    if (r.categoryKey === slotId) return true;

    const rank = getItemSlotRank(r);
    if (rank === targetRank) return true;

    const text = `${r.classifiedType || ""} ${r.name || ""} ${r.fileName || ""}`.toLowerCase();
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
    const subA = typeof a.subOrder === "number" ? a.subOrder : null;
    const subB = typeof b.subOrder === "number" ? b.subOrder : null;
    if (subA !== null && subB !== null && subA !== subB) return subA - subB;

    const fileComp = compareFileNamesNaturally(a.name || a.fileName, b.name || b.fileName);
    if (fileComp !== 0) return fileComp;

    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}

export function findRequirementForSlot(requirements = [], slotId = "") {
  const all = findRequirementsForSlot(requirements, slotId);
  return all.length > 0 ? all[0] : null;
}

export function sortRequirementsBySlotSequence(items = []) {
  return [...items].sort((a, b) => {
    const rankA = getItemSlotRank(a);
    const rankB = getItemSlotRank(b);
    if (rankA !== rankB) {
      return rankA - rankB;
    }

    const subA = typeof a.subOrder === "number" ? a.subOrder : null;
    const subB = typeof b.subOrder === "number" ? b.subOrder : null;
    if (subA !== null && subB !== null && subA !== subB) {
      return subA - subB;
    }

    const fileComp = compareFileNamesNaturally(a.name || a.fileName, b.name || b.fileName);
    if (fileComp !== 0) return fileComp;

    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}
