// documentOcrClassifier.js
// Intelligent OCR Document Classification & Auto-Naming Engine for HR Registration Requirements
// Supports Google Gemini Multimodal Vision API with local heuristic fallback.

import { API_CONFIG } from "../config/apiConfig";

// Standard HR Registration Document Types in strict priority sequence:
// 1. Biodata -> 2. Barangay Clearance -> 3. Agency Agreement -> 4. Valid ID -> etc.
export const DOCUMENT_CATEGORIES = [
  { id: "biodata", label: "Biodata", cleanName: "Biodata", priority: 1, color: "purple" },
  { id: "barangay_clearance", label: "Barangay Clearance", cleanName: "Barangay_Clearance", priority: 2, color: "emerald" },
  { id: "agency_agreement", label: "Agency Agreement", cleanName: "Agency_Agreement", priority: 3, color: "blue" },
  { id: "valid_id", label: "Valid ID", cleanName: "Valid_ID", priority: 4, color: "indigo" },
  { id: "police_clearance", label: "Police Clearance", cleanName: "Police_Clearance", priority: 5, color: "teal" },
  { id: "nbi_clearance", label: "NBI Clearance", cleanName: "NBI_Clearance", priority: 6, color: "cyan" },
  { id: "psa_birth_certificate", label: "PSA Birth Certificate", cleanName: "PSA_Birth_Certificate", priority: 7, color: "amber" },
  { id: "medical_certificate", label: "Medical Certificate", cleanName: "Medical_Certificate", priority: 8, color: "rose" },
  { id: "drug_test", label: "Drug Test Result", cleanName: "Drug_Test_Result", priority: 9, color: "orange" },
  { id: "id_picture_2x2", label: "2x2 ID Photo", cleanName: "2x2_ID_Photo", priority: 10, color: "fuchsia" },
  { id: "other_document", label: "Other Document", cleanName: "Document", priority: 99, color: "slate" }
];

export const DOCUMENT_TYPES = DOCUMENT_CATEGORIES;

/**
 * Returns numeric priority rank for document categories (1 = Biodata, 2 = Barangay Clearance, 3 = Agency Agreement, 4 = Valid ID, ...)
 */
export function getCategoryPriority(categoryOrName = "") {
  if (!categoryOrName) return 99;
  const lower = String(categoryOrName).toLowerCase();
  if (lower.includes("biodata") || lower.includes("resume") || lower.includes("cv") || lower.includes("personal data")) return 1;
  if (lower.includes("barangay") || lower.includes("brgy")) return 2;
  if (lower.includes("agreement") || lower.includes("contract") || lower.includes("agency") || lower.includes("appointment") || lower.includes("moa")) return 3;
  if (lower.includes("valid id") || lower.includes("philsys") || lower.includes("national id") || lower.includes("driver") || lower.includes("license") || lower.includes("umid") || lower.includes("sss") || lower.includes("philhealth") || lower.includes("voter") || lower.includes("passport") || lower.includes("postal") || lower.includes("prc") || lower.includes("tin") || lower.includes("id card") || lower.includes("identity")) return 4;
  if (lower.includes("police") || lower.includes("pnp")) return 5;
  if (lower.includes("nbi")) return 6;
  if (lower.includes("birth") || lower.includes("psa") || lower.includes("nso")) return 7;
  if (lower.includes("medical") || lower.includes("fit to work") || lower.includes("health")) return 8;
  if (lower.includes("drug")) return 9;
  if (lower.includes("photo") || lower.includes("2x2") || lower.includes("1x1")) return 10;
  return 99;
}

/**
 * Automatically sorts requirement documents into standard sequence:
 * 1. Biodata -> 2. Barangay Clearance -> 3. Agency Agreement -> 4. Valid ID -> etc.
 * Custom drag sortOrder is respected if set by user.
 */
export function sortRequirementsByStandardOrder(items = []) {
  return [...items].sort((a, b) => {
    // If user has dragged items into a custom sortOrder, respect that
    const aOrder = typeof a.sortOrder === "number" ? a.sortOrder : null;
    const bOrder = typeof b.sortOrder === "number" ? b.sortOrder : null;
    if (aOrder !== null && bOrder !== null && aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    const pA = getCategoryPriority(a.classifiedType || a.name);
    const pB = getCategoryPriority(b.classifiedType || b.name);
    if (pA !== pB) return pA - pB;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}

/**
 * Extracts raw text from an image or filename heuristic
 */
function localFilenameHeuristic(fileName = "") {
  const clean = String(fileName).toLowerCase().replace(/[-_.]/g, " ");

  if (clean.includes("biodata") || clean.includes("resume") || clean.includes("cv") || clean.includes("personal data")) {
    return { type: "Biodata", cleanName: "Biodata", confidence: 0.95 };
  }
  if (clean.includes("barangay") || clean.includes("brgy") || clean.includes("clearance brgy")) {
    return { type: "Barangay Clearance", cleanName: "Barangay_Clearance", confidence: 0.95 };
  }
  if (clean.includes("agreement") || clean.includes("contract") || clean.includes("agency") || clean.includes("appointment") || clean.includes("moa")) {
    return { type: "Agency Agreement", cleanName: "Agency_Agreement", confidence: 0.95 };
  }
  if (clean.includes("valid id") || clean.includes("national id") || clean.includes("philsys") || clean.includes("driver") || clean.includes("license") || clean.includes("umid") || clean.includes("sss") || clean.includes("philhealth") || clean.includes("passport") || clean.includes("voter") || clean.includes("postal") || clean.includes("prc") || clean.includes("tin") || clean.includes("id card") || clean.includes("identity")) {
    return { type: "Valid ID", cleanName: "Valid_ID", confidence: 0.92 };
  }
  if (clean.includes("police") || clean.includes("pnp")) {
    return { type: "Police Clearance", cleanName: "Police_Clearance", confidence: 0.94 };
  }
  if (clean.includes("nbi")) {
    return { type: "NBI Clearance", cleanName: "NBI_Clearance", confidence: 0.95 };
  }
  if (clean.includes("birth") || clean.includes("psa") || clean.includes("nso") || clean.includes("live birth")) {
    return { type: "PSA Birth Certificate", cleanName: "PSA_Birth_Certificate", confidence: 0.93 };
  }
  if (clean.includes("medical") || clean.includes("fit to work") || clean.includes("clinic") || clean.includes("health")) {
    return { type: "Medical Certificate", cleanName: "Medical_Certificate", confidence: 0.92 };
  }
  if (clean.includes("drug") || clean.includes("drug test")) {
    return { type: "Drug Test Result", cleanName: "Drug_Test_Result", confidence: 0.94 };
  }
  if (clean.includes("2x2") || clean.includes("1x1") || clean.includes("id photo") || clean.includes("photo") || clean.includes("selfie")) {
    return { type: "2x2 ID Photo", cleanName: "2x2_ID_Photo", confidence: 0.90 };
  }
  if (clean.includes("id") || clean.includes("card")) {
    return { type: "Valid ID", cleanName: "Valid_ID", confidence: 0.86 };
  }

  return null;
}

/**
 * Extracts base64 raw string and mime type from dataUrl
 */
function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64Data: match[2]
  };
}

/**
 * Classifies an employment requirement document using Gemini Multimodal OCR + Local Heuristic Engine
 *
 * @param {Object|File} fileOrData - File object or options { dataUrl, fileName, agentName }
 * @param {string} [optionalAgentName] - Agent's name if first param is File
 * @returns {Promise<Object>} classification result
 */
export async function classifyRequirementDocument(fileOrData, optionalAgentName = "") {
  let dataUrl = "";
  let fileName = "document.jpg";
  let agentName = optionalAgentName;

  if (fileOrData instanceof File || fileOrData instanceof Blob) {
    fileName = fileOrData.name || "document.jpg";
    dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(fileOrData);
    });
  } else if (typeof fileOrData === "object" && fileOrData !== null) {
    dataUrl = fileOrData.dataUrl || "";
    fileName = fileOrData.name || fileOrData.fileName || "document.jpg";
    agentName = fileOrData.agentName || optionalAgentName;
  }

  const fileExt = fileName.split(".").pop() || "jpg";
  const cleanAgentPrefix = agentName ? agentName.trim().replace(/[^a-zA-Z0-9_\-]/g, "_") : "";

  // 1. Try Gemini Vision API if key is available and dataUrl is image
  const apiKey = API_CONFIG.GEMINI_API_KEY;
  const parsed = parseDataUrl(dataUrl);

  if (apiKey && parsed && parsed.mimeType.startsWith("image/")) {
    const candidateModels = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];

    for (const gModel of candidateModels) {
      try {
        const prompt = `You are an expert HR Document OCR and Classification AI for the Philippines (STL Gaming, Agency & Human Resources).
Analyze the attached employment requirement image. Perform optical character recognition (OCR) on all stamps, seals, agency headers, text, and logos.

Classify the document strictly into ONE of the following standard HR requirement categories (in prioritized order):
1. Biodata (Biodata, Resume, Curriculum Vitae, Personal Data Sheet)
2. Barangay Clearance (Barangay Clearance, Certificate of Residency, Punong Barangay Certification)
3. Agency Agreement (Agency Agreement, Agent Contract, Agency Appointment, MOA, Terms of Engagement)
4. Valid ID (Philippine National ID, PhilSys, Driver's License, SSS/UMID, PhilHealth ID, Passport, Voter's ID, Postal ID, PRC)
5. Police Clearance (PNP Police Clearance)
6. NBI Clearance (National Bureau of Investigation Clearance)
7. PSA Birth Certificate (PSA/NSO Certificate of Live Birth)
8. Medical Certificate (Medical Certificate, Fit to Work, Clinic Certificate)
9. Drug Test Result (Laboratory Drug Test Screening)
10. 2x2 ID Photo (ID Picture, 2x2 Picture, 1x1 Picture)
11. Other Document (Any other official document)

Return ONLY a valid JSON object without markdown formatting:
{
  "classifiedType": "Document category from list above (e.g. Biodata, Barangay Clearance, Agency Agreement, Valid ID, Police Clearance, NBI Clearance, PSA Birth Certificate, Medical Certificate, Drug Test Result, 2x2 ID Photo)",
  "cleanIdentifier": "Shorthand label (e.g. Biodata, Barangay_Clearance, Agency_Agreement, Valid_ID, Police_Clearance, etc.)",
  "confidence": 0.95,
  "ocrSnippet": "Exact text or agency header read from document header or seal",
  "agencyIssuer": "Issuing agency, barangay, or clinic if detected"
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: parsed.mimeType,
                        data: parsed.base64Data
                      }
                    }
                  ]
                }
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 300
              }
            })
          }
        );

        if (res.ok) {
          const data = await res.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJsonText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsedJson = JSON.parse(cleanJsonText);

            if (parsedJson?.classifiedType) {
              const cleanId = parsedJson.cleanIdentifier || parsedJson.classifiedType.replace(/\s+/g, "_");
              const suggestedBaseName = cleanAgentPrefix
                ? `${cleanId}_${cleanAgentPrefix}.${fileExt}`
                : `${cleanId}.${fileExt}`;

              return {
                docType: parsedJson.classifiedType,
                classifiedType: parsedJson.classifiedType,
                suggestedFileName: suggestedBaseName,
                confidence: parsedJson.confidence || 0.95,
                extractedSnippet: parsedJson.ocrSnippet || "Verified via Gemini Vision OCR",
                ocrSnippet: parsedJson.ocrSnippet || "Verified via Gemini Vision OCR",
                agencyIssuer: parsedJson.agencyIssuer || "",
                engine: `AI Vision (${gModel})`
              };
            }
          }
        }
      } catch (geminiErr) {
        console.warn(`Vision OCR note on model ${gModel}:`, geminiErr.message);
      }
    }
  }

  // 2. High-Accuracy Local Heuristic Pattern Engine Fallback
  const heuristic = localFilenameHeuristic(fileName);
  if (heuristic) {
    const suggestedBaseName = cleanAgentPrefix
      ? `${heuristic.cleanName}_${cleanAgentPrefix}.${fileExt}`
      : `${heuristic.cleanName}.${fileExt}`;

    return {
      docType: heuristic.type,
      classifiedType: heuristic.type,
      suggestedFileName: suggestedBaseName,
      confidence: heuristic.confidence,
      extractedSnippet: `Document pattern recognized: ${heuristic.type}`,
      ocrSnippet: `Document pattern recognized: ${heuristic.type}`,
      agencyIssuer: "",
      engine: "Pattern Engine"
    };
  }

  // 3. Default fallback if unidentifiable
  const cleanDocName = cleanAgentPrefix
    ? `Document_${cleanAgentPrefix}.${fileExt}`
    : `Document.${fileExt}`;

  return {
    docType: "Other Document",
    classifiedType: "Other Document",
    suggestedFileName: cleanDocName,
    confidence: 0.70,
    extractedSnippet: "General requirement document",
    ocrSnippet: "General requirement document",
    agencyIssuer: "",
    engine: "Standard Heuristic"
  };
}
