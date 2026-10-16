import { useEffect, useState } from "react";
import {
  Activity, Archive, Award, CalendarDays, Check, CheckCircle2, CreditCard, Database, Download, Eye, FileDown, FileText,
  Fingerprint, Home, KeyRound, Loader2, Lock, Pencil, Phone, ShieldCheck, Sparkles, Trash2, Upload, UserRound, X,
  Scan, FileCheck, Printer, ExternalLink, RefreshCw, FileSearch, Tag, Info,
  GripVertical, ArrowLeft, ArrowRight, ChevronDown, ListOrdered, SlidersHorizontal
} from "lucide-react";
import AgentIdCardModal from "./AgentIdCardModal";
import {
  getAgentIdentifier,
  saveRequirementFile,
  getRequirementsByProfile,
  deleteRequirementFile,
  formatFileSize,
  downloadRequirementsAsPdf,
  downloadSingleRequirementAsPdf,
  downloadRequirementsAsZip,
  batchDownloadIndividualImages,
  generateRequirementsPdfDoc,
  generateSingleRequirementPdfDoc,
  updateRequirementRecord,
  saveRequirementsOrder
} from "../lib/requirementsStorage";
import {
  classifyRequirementDocument,
  DOCUMENT_CATEGORIES,
  sortRequirementsByStandardOrder,
  getCategoryPriority
} from "../lib/documentOcrClassifier";
import {
  getAgentProfileOverride,
  saveAgentProfileOverride
} from "../lib/agentProfileStorage";

function getDocumentBadgeStyle(type) {
  if (!type) return "bg-slate-100 text-slate-700 border-slate-200";
  const lower = type.toLowerCase();
  if (lower.includes("biodata") || lower.includes("resume") || lower.includes("cv")) return "bg-purple-100 text-purple-800 border-purple-300";
  if (lower.includes("barangay") || lower.includes("brgy")) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (lower.includes("agreement") || lower.includes("contract") || lower.includes("agency")) return "bg-blue-100 text-blue-800 border-blue-300";
  if (lower.includes("valid id") || lower.includes("national id") || lower.includes("driver") || lower.includes("passport") || lower.includes("umid") || lower.includes("sss") || lower.includes("philhealth") || lower.includes("voter") || lower.includes("id card") || lower.includes("identity")) return "bg-indigo-100 text-indigo-800 border-indigo-300";
  if (lower.includes("police")) return "bg-teal-100 text-teal-800 border-teal-300";
  if (lower.includes("nbi")) return "bg-cyan-100 text-cyan-800 border-cyan-300";
  if (lower.includes("birth") || lower.includes("psa") || lower.includes("nso")) return "bg-amber-100 text-amber-800 border-amber-300";
  if (lower.includes("medical") || lower.includes("fit to work")) return "bg-rose-100 text-rose-800 border-rose-300";
  if (lower.includes("drug")) return "bg-orange-100 text-orange-800 border-orange-300";
  if (lower.includes("photo") || lower.includes("2x2") || lower.includes("1x1")) return "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300";
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function valueOf(agent, keys, fallback = "Not provided") {
  for (const key of keys) {
    if (agent?.[key]) return agent[key];
  }
  return fallback;
}

function rawValueOf(agent, keys) {
  for (const key of keys) {
    if (agent?.[key] !== undefined && agent?.[key] !== null) return agent[key];
  }
  return "";
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value)) {
    const parsedDate = new Date(value);
    if (!Number.isNaN(parsedDate.getTime())) {
      return new Intl.DateTimeFormat("en-PH", {
        dateStyle: "long",
        ...(value.includes("T") ? { timeStyle: "short" } : {})
      }).format(parsedDate);
    }
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function getAgentStatus(agent) {
  const status = agent.status ?? agent.account_status ?? agent.accountStatus;
  if (status !== undefined && status !== null && status !== "") {
    const normalizedStatus = String(status).toLowerCase();
    if (["1", "true", "active", "enabled"].includes(normalizedStatus)) return "Active";
    if (["0", "false", "inactive", "disabled"].includes(normalizedStatus)) return "Inactive";
    return String(status);
  }

  return [1, "1", true].includes(agent.isActive) ? "Active" : "Inactive";
}

export default function AgentProfile({ agent, index, barangayName, supervisorName, onClose, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedOverride, setSavedOverride] = useState(null);
  const [loadingFullProfile, setLoadingFullProfile] = useState(true);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [uploadedRequirements, setUploadedRequirements] = useState([]);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [uploadingRequirements, setUploadingRequirements] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingBatch, setDownloadingBatch] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState(null);
  const [requirementNotice, setRequirementNotice] = useState(null);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [pdfPreviewState, setPdfPreviewState] = useState({
    isOpen: false,
    doc: null,
    blobUrl: null,
    fileName: "",
    totalPages: 1,
    title: ""
  });
  const [scanningOcrIds, setScanningOcrIds] = useState([]);
  const [isBatchScanningOcr, setIsBatchScanningOcr] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const agentKey = getAgentIdentifier(agent, index);

  // Reset requirements accordion to collapsed by default on every profile view or agent switch
  useEffect(() => {
    setRequirementsOpen(false);
  }, [agentKey]);

  // Load saved profile overrides and requirements from database whenever agentKey changes
  useEffect(() => {
    let isMounted = true;
    const fetchSavedData = async () => {
      try {
        setLoadingFullProfile(true);
        setLoadingRequirements(true);
        const [savedList, profileOverride] = await Promise.all([
          getRequirementsByProfile(agentKey),
          getAgentProfileOverride(agentKey)
        ]);
        if (isMounted) {
          setUploadedRequirements(savedList || []);
          if (profileOverride) {
            setSavedOverride(profileOverride);
            setForm((prev) => ({
              ...prev,
              fullName: profileOverride.fullName || prev.fullName,
              birthday: profileOverride.birthday || prev.birthday,
              homeAddress: profileOverride.homeAddress || prev.homeAddress,
              contactNumber: profileOverride.contactNumber || prev.contactNumber,
              emergencyName: profileOverride.emergencyName || prev.emergencyName,
              emergencyContactNumber: profileOverride.emergencyContactNumber || prev.emergencyContactNumber,
              boothNumber: profileOverride.boothNumber || prev.boothNumber,
              boothLocation: profileOverride.boothLocation || prev.boothLocation,
              idNumber: profileOverride.idNumber || prev.idNumber
            }));
          }
        }
      } catch (err) {
        console.warn("Failed to load agent profile data from DB:", err);
      } finally {
        if (isMounted) {
          setLoadingFullProfile(false);
          setLoadingRequirements(false);
        }
      }
    };
    fetchSavedData();
    return () => { isMounted = false; };
  }, [agentKey]);

  const [form, setForm] = useState({
    fullName: rawValueOf(agent, ["fullName", "full_name", "name"]),
    birthday: rawValueOf(agent, ["birthday", "birthdate", "birth_date", "date_of_birth", "dateOfBirth"]),
    homeAddress: rawValueOf(agent, ["home_address", "homeAddress", "address", "location"]),
    contactNumber: rawValueOf(agent, ["contactNumber", "contact_number", "phone", "phone_number", "phoneNumber"]),
    emergencyName: rawValueOf(agent, ["emergency_contact_name", "emergencyContactName", "emergency_name", "emergencyName", "contact_person"]),
    emergencyContactNumber: rawValueOf(agent, ["emergency_contact_number", "emergencyContactNumber", "emergency_phone", "emergencyPhone"]),
    boothNumber: "",
    boothLocation: "",
    idNumber: ""
  });
  const name = form.fullName || savedOverride?.fullName || valueOf(agent, ["name", "full_name", "fullName", "username", "email"], `Agent ${index + 1}`);
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const role = valueOf(agent, ["role", "position", "title"], "SALES REPRESENTATIVE");
  const birthday = form.birthday || savedOverride?.birthday || valueOf(agent, ["birthday", "birthdate", "birth_date", "date_of_birth", "dateOfBirth"]);
  const homeAddress = form.homeAddress || savedOverride?.homeAddress || valueOf(agent, ["home_address", "homeAddress", "address", "location"]);
  const contactNumber = form.contactNumber || savedOverride?.contactNumber || valueOf(agent, ["contactNumber", "contact_number", "phone", "phone_number", "phoneNumber"]);
  const emergencyName = form.emergencyName || savedOverride?.emergencyName || valueOf(agent, ["emergency_contact_name", "emergencyContactName", "emergency_name", "emergencyName", "contact_person"]);
  const emergencyContactNumber = form.emergencyContactNumber || savedOverride?.emergencyContactNumber || valueOf(agent, ["emergency_contact_number", "emergencyContactNumber", "emergency_phone", "emergencyPhone"]);
  const registrationDate = valueOf(agent, ["date_of_registration", "dateOfRegistration", "registration_date", "registrationDate", "created_at"]);
  const boothNumber = form.boothNumber || savedOverride?.boothNumber || valueOf(agent, ["booth_number", "boothNumber"]);
  const boothLocation = form.boothLocation || savedOverride?.boothLocation || valueOf(agent, ["booth_location", "boothLocation"]);
  const idNumber = form.idNumber || savedOverride?.idNumber || valueOf(agent, ["agent_id", "agentId"]);

  const fieldCardClass = (value) => value === "Not provided"
    ? "border-l-2 border-amber-400 bg-amber-50/60 pl-3"
    : "border-l-2 border-slate-200 pl-3";

  const fieldLabelClass = (value) => value === "Not provided"
    ? "text-amber-700"
    : "text-slate-400";

  const updateField = (field, value) => {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      await saveAgentProfileOverride(agentKey, form);
      setSavedOverride({ ...form });
      onSave?.({
        ...agent,
        fullName: form.fullName,
        birthday: form.birthday,
        address: form.homeAddress,
        contactNumber: form.contactNumber,
        emergency_contact_name: form.emergencyName,
        emergency_contact_number: form.emergencyContactNumber,
        booth_number: form.boothNumber,
        booth_location: form.boothLocation,
        agent_id: form.idNumber
      });
      setIsEditing(false);
      setSaved(true);
      setRequirementNotice({
        type: "success",
        message: "Profile changes permanently saved to database!"
      });
      setTimeout(() => setRequirementNotice(null), 5000);
    } catch (err) {
      console.error("Failed to save agent profile override:", err);
    } finally {
      setSavingProfile(false);
    }
  };

  const closePdfPreview = () => {
    if (pdfPreviewState.blobUrl) {
      try {
        URL.revokeObjectURL(pdfPreviewState.blobUrl);
      } catch {
        // ignore
      }
    }
    setPdfPreviewState({
      isOpen: false,
      doc: null,
      blobUrl: null,
      fileName: "",
      totalPages: 1,
      title: ""
    });
  };

  const handleDownloadFromPreview = () => {
    if (pdfPreviewState.doc && pdfPreviewState.fileName) {
      pdfPreviewState.doc.save(pdfPreviewState.fileName);
      setRequirementNotice({
        type: "success",
        message: `PDF successfully downloaded: ${pdfPreviewState.fileName}`
      });
      setTimeout(() => setRequirementNotice(null), 5000);
    }
  };

  // --- DRAG AND DROP REORDERING HANDLERS ---
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    const reordered = [...uploadedRequirements];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const withOrder = reordered.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1
    }));

    setUploadedRequirements(withOrder);
    setDraggedIndex(null);
    await saveRequirementsOrder(agentKey, withOrder);

    setRequirementNotice({
      type: "success",
      message: `Document moved to Page ${targetIndex + 1} of ${withOrder.length}`
    });
    setTimeout(() => setRequirementNotice(null), 3000);
  };

  const handleMoveItem = async (currentIndex, direction) => {
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= uploadedRequirements.length) return;

    const reordered = [...uploadedRequirements];
    const [item] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, item);

    const withOrder = reordered.map((rec, idx) => ({
      ...rec,
      sortOrder: idx + 1
    }));

    setUploadedRequirements(withOrder);
    await saveRequirementsOrder(agentKey, withOrder);
  };

  const handleResetToStandardSequence = async () => {
    // Strict priority: 1. Biodata -> 2. Barangay Clearance -> 3. Agency Agreement -> 4. Valid ID -> etc.
    const sorted = [...uploadedRequirements].sort((a, b) => {
      const pA = getCategoryPriority(a.classifiedType || a.name);
      const pB = getCategoryPriority(b.classifiedType || b.name);
      if (pA !== pB) return pA - pB;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });

    const withOrder = sorted.map((rec, idx) => ({
      ...rec,
      sortOrder: idx + 1
    }));

    setUploadedRequirements(withOrder);
    await saveRequirementsOrder(agentKey, withOrder);

    setRequirementNotice({
      type: "success",
      message: "Re-sorted documents: 1. Biodata → 2. Barangay Clearance → 3. Agency Agreement → 4. Valid ID"
    });
    setTimeout(() => setRequirementNotice(null), 4000);
  };

  const handleChangeCategory = async (file, categoryObj) => {
    setEditingCategoryId(null);
    const fileExt = file.name.split(".").pop() || "jpg";
    const cleanAgentPrefix = name ? name.trim().replace(/[^a-zA-Z0-9_\-]/g, "_") : "";
    const newName = cleanAgentPrefix
      ? `${categoryObj.cleanName}_${cleanAgentPrefix}.${fileExt}`
      : `${categoryObj.cleanName}.${fileExt}`;

    try {
      const updated = await updateRequirementRecord(agentKey, file.id, {
        classifiedType: categoryObj.label,
        name: newName
      });

      setUploadedRequirements((current) =>
        current.map((item) => (item.id === file.id ? { ...item, ...updated, classifiedType: categoryObj.label, name: newName } : item))
      );

      setRequirementNotice({
        type: "success",
        message: `Category updated to "${categoryObj.label}"!`
      });
      setTimeout(() => setRequirementNotice(null), 3000);
    } catch (err) {
      console.error("Failed to change category:", err);
    }
  };

  const handleRequirementUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingRequirements(true);
    setRequirementNotice({
      type: "info",
      message: `Analyzing and uploading ${files.length} document${files.length > 1 ? "s" : ""} with AI OCR...`
    });

    try {
      const newRecords = [];
      for (const file of files) {
        let ocrResult = null;
        try {
          ocrResult = await classifyRequirementDocument(file, name);
        } catch (ocrErr) {
          console.warn("OCR upload classification note:", ocrErr);
        }

        const extraMeta = {
          classifiedType: ocrResult?.docType || null,
          ocrSnippet: ocrResult?.extractedSnippet || null,
          fileName: ocrResult?.suggestedFileName || file.name
        };

        const savedRecord = await saveRequirementFile(agentKey, file, extraMeta);
        newRecords.push(savedRecord);
      }

      const allItems = [
        ...newRecords,
        ...uploadedRequirements.filter((c) => !newRecords.some((n) => n.id === c.id))
      ];

      // Auto-sort into standard priority order: 1. Biodata -> 2. Barangay -> 3. Agreement -> 4. Valid ID
      const ordered = sortRequirementsByStandardOrder(allItems).map((item, idx) => ({
        ...item,
        sortOrder: idx + 1
      }));

      setUploadedRequirements(ordered);
      await saveRequirementsOrder(agentKey, ordered);

      const classifiedCount = newRecords.filter((r) => r.classifiedType && r.classifiedType !== "Other Document").length;
      setRequirementNotice({
        type: "success",
        message: `${files.length} document${files.length === 1 ? "" : "s"} uploaded, classified via OCR, and auto-sorted (${classifiedCount} classified)`
      });
    } catch (err) {
      console.error("Error saving requirement:", err);
      setRequirementNotice({
        type: "error",
        message: "Failed to save requirement to database: " + err.message
      });
    } finally {
      setUploadingRequirements(false);
      event.target.value = "";
      setTimeout(() => setRequirementNotice(null), 5000);
    }
  };

  const handleClassifySingleRequirement = async (file) => {
    if (scanningOcrIds.includes(file.id)) return;
    setScanningOcrIds((prev) => [...prev, file.id]);
    try {
      const ocrResult = await classifyRequirementDocument(file, name);
      const updated = await updateRequirementRecord(agentKey, file.id, {
        classifiedType: ocrResult.docType,
        ocrSnippet: ocrResult.extractedSnippet,
        name: ocrResult.suggestedFileName || file.name
      });

      setUploadedRequirements((current) =>
        current.map((item) => (item.id === file.id ? { ...item, ...updated } : item))
      );

      setRequirementNotice({
        type: "success",
        message: `Recognized as "${ocrResult.docType}" via AI OCR!`
      });
      setTimeout(() => setRequirementNotice(null), 4000);
    } catch (err) {
      console.error("OCR single classify failed:", err);
      setRequirementNotice({
        type: "error",
        message: "OCR classification failed: " + err.message
      });
    } finally {
      setScanningOcrIds((prev) => prev.filter((id) => id !== file.id));
    }
  };

  const handleBatchClassifyAll = async () => {
    if (!uploadedRequirements.length || isBatchScanningOcr) return;
    setIsBatchScanningOcr(true);
    setRequirementNotice({
      type: "info",
      message: `Analyzing ${uploadedRequirements.length} documents using AI OCR...`
    });

    let successCount = 0;
    try {
      let updatedList = [...uploadedRequirements];
      for (const item of uploadedRequirements) {
        setScanningOcrIds((prev) => [...prev, item.id]);
        try {
          const ocrResult = await classifyRequirementDocument(item, name);
          const updated = await updateRequirementRecord(agentKey, item.id, {
            classifiedType: ocrResult.docType,
            ocrSnippet: ocrResult.extractedSnippet,
            name: ocrResult.suggestedFileName || item.name
          });

          updatedList = updatedList.map((rec) => (rec.id === item.id ? { ...rec, ...updated } : rec));
          setUploadedRequirements(updatedList);
          successCount++;
        } catch (itemErr) {
          console.warn(`OCR scan failed for item ${item.name}:`, itemErr);
        } finally {
          setScanningOcrIds((prev) => prev.filter((id) => id !== item.id));
        }
      }

      // Auto-sort into standard priority order: 1. Biodata -> 2. Barangay -> 3. Agreement -> 4. Valid ID
      const ordered = sortRequirementsByStandardOrder(updatedList).map((rec, idx) => ({
        ...rec,
        sortOrder: idx + 1
      }));
      setUploadedRequirements(ordered);
      await saveRequirementsOrder(agentKey, ordered);

      setRequirementNotice({
        type: "success",
        message: `Successfully classified ${successCount} document${successCount !== 1 ? "s" : ""} & sorted: Biodata → Barangay → Agreement → Valid ID!`
      });
      setTimeout(() => setRequirementNotice(null), 5000);
    } catch (err) {
      console.error("Batch OCR classification error:", err);
      setRequirementNotice({
        type: "error",
        message: "Batch OCR scan encountered an error: " + err.message
      });
    } finally {
      setIsBatchScanningOcr(false);
    }
  };

  const removeRequirementFile = async (reqId, storagePath = null) => {
    try {
      await deleteRequirementFile(reqId, agentKey, storagePath);
      setUploadedRequirements((current) => current.filter((item) => item.id !== reqId));
      setRequirementNotice({
        type: "success",
        message: "Requirement removed from database."
      });
      setTimeout(() => setRequirementNotice(null), 3000);
    } catch (err) {
      console.error("Error removing requirement:", err);
    }
  };

  const handlePreviewAllPdf = async () => {
    if (!uploadedRequirements.length) return;
    setDownloadingPdf(true);
    try {
      const { doc, blobUrl, fileName, totalPages } = await generateRequirementsPdfDoc({
        agentName: name,
        agentId: idNumber,
        supervisorName,
        barangayName,
        requirements: uploadedRequirements
      });
      setPdfPreviewState({
        isOpen: true,
        doc,
        blobUrl,
        fileName,
        totalPages,
        title: `${name} — Registration Requirements`
      });
    } catch (err) {
      console.error("PDF preview generation failed:", err);
      setRequirementNotice({
        type: "error",
        message: `PDF compilation failed: ${err.message}`
      });
      setTimeout(() => setRequirementNotice(null), 5000);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePreviewSinglePdf = async (file) => {
    setDownloadingPdf(true);
    try {
      const { doc, blobUrl, fileName, totalPages } = await generateSingleRequirementPdfDoc({
        requirement: file,
        agentName: name,
        agentId: idNumber,
        supervisorName
      });
      setPdfPreviewState({
        isOpen: true,
        doc,
        blobUrl,
        fileName,
        totalPages,
        title: `${file.name} — PDF Preview`
      });
    } catch (err) {
      console.error("Single PDF preview failed:", err);
      setRequirementNotice({
        type: "error",
        message: `PDF preview failed: ${err.message}`
      });
      setTimeout(() => setRequirementNotice(null), 4000);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleBatchDownloadZip = async () => {
    if (!uploadedRequirements.length) return;
    setDownloadingBatch(true);
    try {
      const zipName = await downloadRequirementsAsZip({
        agentName: name,
        requirements: uploadedRequirements
      });
      setRequirementNotice({
        type: "success",
        message: `Batch ZIP downloaded: ${zipName}`
      });
      setTimeout(() => setRequirementNotice(null), 5000);
    } catch (err) {
      console.error("Batch ZIP failed:", err);
      setRequirementNotice({
        type: "error",
        message: `Batch ZIP failed: ${err.message}`
      });
    } finally {
      setDownloadingBatch(false);
    }
  };

  const handleBatchDownloadDirect = async () => {
    if (!uploadedRequirements.length) return;
    setDownloadingBatch(true);
    try {
      const count = await batchDownloadIndividualImages({
        agentName: name,
        requirements: uploadedRequirements
      });
      setRequirementNotice({
        type: "success",
        message: `Batch downloaded ${count} requirement images!`
      });
      setTimeout(() => setRequirementNotice(null), 5000);
    } catch (err) {
      console.error("Batch direct download failed:", err);
      setRequirementNotice({
        type: "error",
        message: `Batch download failed: ${err.message}`
      });
    } finally {
      setDownloadingBatch(false);
    }
  };

  const status = getAgentStatus(agent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-3 py-5 backdrop-blur-md sm:px-6">
      <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-white/70 bg-slate-50 text-slate-900 shadow-[0_24px_90px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5">
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
          <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-20 w-72 bg-sky-300/10 blur-2xl" />
          <div className="absolute left-6 top-6 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">HRHub · Agent profile</div>
          <button type="button" onClick={onClose} aria-label="Close agent profile" className="absolute right-5 top-5 rounded-full border border-white/20 bg-white/10 p-2.5 text-white/80 backdrop-blur transition hover:bg-white/20 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body: Modern Professional Loading Animation vs Ready Profile */}
        {loadingFullProfile ? (
          <div className="relative px-4 pb-12 pt-8 sm:px-8">
            {/* Top Avatar Skeleton with Holographic Laser Biometric Scan & Floating Bounce */}
            <div className="-mt-14 flex items-end justify-between">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-[30px] border-[5px] border-slate-50 bg-slate-950 shadow-2xl overflow-hidden animate-float-bounce">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.3),transparent_70%)]" />
                {/* Holographic Laser Scan Line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_rgba(52,211,153,0.95)] animate-scan-beam z-10 pointer-events-none" />
                {/* Counter-rotating tech rings */}
                <div className="absolute inset-2 rounded-[22px] border border-emerald-500/25 animate-spin-slow" />
                <div className="absolute inset-3.5 rounded-[18px] border border-dashed border-teal-400/40 animate-spin-reverse-slow" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur">
                  <Fingerprint size={28} className="text-emerald-400 animate-pulse" />
                </div>
              </div>

              {/* Status Badge with Live Equalizer Data Stream */}
              <div className="mb-2 inline-flex items-center gap-2.5 rounded-full border border-slate-200 bg-white/95 px-3.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Secure Cloud Sync</span>
                {/* Animated Data Stream Equalizer Bars */}
                <div className="flex items-end gap-0.5 h-3.5 pl-1.5 border-l border-slate-200">
                  <span className="w-0.5 bg-emerald-500 rounded-full data-bar-1" />
                  <span className="w-0.5 bg-emerald-400 rounded-full data-bar-2" />
                  <span className="w-0.5 bg-teal-500 rounded-full data-bar-3" />
                  <span className="w-0.5 bg-emerald-500 rounded-full data-bar-4" />
                  <span className="w-0.5 bg-emerald-400 rounded-full data-bar-5" />
                </div>
              </div>
            </div>

            {/* Central Modern Professional Synchronization Card with Physics-Based Bounce */}
            <div className="relative mt-7 mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/50 to-white p-6 sm:p-7 shadow-[0_12px_45px_-12px_rgba(16,185,129,0.14)] text-center">

              {/* Physics-Based Spring-Bouncing Security Emblem with Floor Shadow Squash */}
              <div className="mx-auto flex flex-col items-center justify-center mb-3">
                {/* Bouncing Emblem Tile */}
                <div className="relative z-10 flex h-20 w-20 items-center justify-center animate-spring-bounce">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/25 shadow-lg shadow-emerald-600/15 backdrop-blur-sm" />
                  <div className="absolute inset-1.5 rounded-2xl border border-dashed border-emerald-400/40 animate-spin-reverse-slow" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-emerald-400 shadow-md shadow-slate-950/30">
                    <ShieldCheck size={22} className="text-emerald-400" />
                  </div>
                </div>

                {/* Dynamic Floor Shadow that contracts as emblem rises and expands as it lands */}
                <div className="h-2 w-16 rounded-full bg-emerald-950/15 blur-[2.5px] -mt-1 animate-shadow-squash" />
              </div>

              {/* Harmonic 3-Sphere Bouncing Wave */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-sm shadow-emerald-500/50 animate-dot-bounce-1" />
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-300 shadow-sm shadow-teal-500/50 animate-dot-bounce-2" />
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-300 shadow-sm shadow-emerald-500/50 animate-dot-bounce-3" />
              </div>

              {/* Enterprise Status Chip */}
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/90 px-3.5 py-1 text-[11px] font-extrabold text-emerald-900 shadow-xs">
                <Lock size={12} className="text-emerald-600" />
                <span>Encrypted Personnel Sync</span>
              </div>

              {/* Headline & Description in Clean Professional English */}
              <h3 className="mt-3 text-lg font-black tracking-tight text-slate-950">
                Authenticating & Loading Personnel Profile
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Securely verifying personnel records, decrypting credentials, and retrieving stored registration documents.
              </p>

              {/* Interactive 3-Stage Animated Data Pipeline with Bouncy Step Capsules */}
              <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3">
                {/* Stage 1: Identity */}
                <div className="flex flex-col items-center gap-1.5 animate-step-hop-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-700 shadow-xs">
                    <Fingerprint size={16} />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-700">Identity</span>
                </div>

                {/* Flow Beam 1 */}
                <div className="relative h-1 w-10 sm:w-16 rounded-full bg-slate-200 overflow-hidden mb-4">
                  <div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-stream-flow" />
                </div>

                {/* Stage 2: Credentials */}
                <div className="flex flex-col items-center gap-1.5 animate-step-hop-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 border border-teal-200/90 text-teal-700 shadow-xs">
                    <KeyRound size={16} />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-700">Credentials</span>
                </div>

                {/* Flow Beam 2 */}
                <div className="relative h-1 w-10 sm:w-16 rounded-full bg-slate-200 overflow-hidden mb-4">
                  <div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-stream-flow" />
                </div>

                {/* Stage 3: Documents */}
                <div className="flex flex-col items-center gap-1.5 animate-step-hop-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200/90 text-emerald-700 shadow-xs">
                    <FileText size={16} />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-700">Documents</span>
                </div>
              </div>

              {/* Precision Shimmer Progress Bar */}
              <div className="mt-5 relative h-1.5 w-64 mx-auto overflow-hidden rounded-full bg-slate-100">
                <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-full animate-pulse" />
              </div>
            </div>

            {/* Shimmering Profile Skeleton Wireframe with Laser Scanning Accents */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-left">
              {/* Left Column Skeleton */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="h-3.5 w-36 rounded-md shimmer-wave" />
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5 border-l-2 border-slate-200 pl-3">
                    <div className="h-2.5 w-20 rounded shimmer-wave" />
                    <div className="h-4 w-4/5 rounded-md shimmer-wave" />
                  </div>
                  <div className="space-y-1.5 border-l-2 border-slate-200 pl-3">
                    <div className="h-2.5 w-24 rounded shimmer-wave" />
                    <div className="h-4 w-3/5 rounded-md shimmer-wave" />
                  </div>
                  <div className="space-y-1.5 border-l-2 border-slate-200 pl-3">
                    <div className="h-2.5 w-28 rounded shimmer-wave" />
                    <div className="h-4 w-2/3 rounded-md shimmer-wave" />
                  </div>
                </div>
              </div>

              {/* Right Column Skeleton */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="h-3.5 w-40 rounded-md shimmer-wave" />
                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5 border-l-2 border-slate-200 pl-3">
                    <div className="h-2.5 w-24 rounded shimmer-wave" />
                    <div className="h-4 w-3/4 rounded-md shimmer-wave" />
                  </div>
                  <div className="space-y-1.5 border-l-2 border-slate-200 pl-3">
                    <div className="h-2.5 w-28 rounded shimmer-wave" />
                    <div className="h-4 w-4/5 rounded-md shimmer-wave" />
                  </div>
                  <div className="space-y-1.5 border-l-2 border-slate-200 pl-3">
                    <div className="h-2.5 w-20 rounded shimmer-wave" />
                    <div className="h-4 w-1/2 rounded-md shimmer-wave" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Accordion Skeletons */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-sm shimmer-wave" />
                  <div className="h-3 w-32 rounded shimmer-wave" />
                </div>
                <div className="h-2.5 w-12 rounded shimmer-wave" />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-sm shimmer-wave" />
                  <div className="h-3 w-44 rounded shimmer-wave" />
                </div>
                <div className="h-4 w-20 rounded-full shimmer-wave" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative px-4 pb-7 sm:px-8 transition-opacity duration-300">
            <div className="-mt-14 flex items-end justify-between">
              <div className="flex h-28 w-28 items-center justify-center rounded-[30px] border-[5px] border-slate-50 bg-slate-950 text-3xl font-extrabold text-emerald-400 shadow-xl">
                {initials}
              </div>
              <span className={`mb-2 flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold shadow-sm ${status === "Active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status === "Active" ? "bg-emerald-500" : "bg-slate-400"}`} /> {status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">{name}</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">{role}</p>
              </div>
              {!isEditing ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowIdCardModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:brightness-110 cursor-pointer"
                    title="Open ID Card studio to print or customize agent ID"
                  >
                    <CreditCard size={15} />
                    <span>Print Agent ID</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsEditing(true); setSaved(false); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-emerald-300 shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 cursor-pointer"
                  >
                    <Pencil size={14} />
                    <span>Edit profile</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-100">Cancel</button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-70"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-slate-950" />
                        <span>Saving to database...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Save changes</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {saved && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>Agent profile updated and permanently saved to database! Details persist across logouts and page refreshes.</span>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="border-b border-slate-200 pb-6 sm:pr-6">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Personal information</h3>
                <div className="mt-4 divide-y divide-slate-200">
                  <div className="border-b border-slate-200 pb-4">
                    <div className="pl-3">
                      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"><UserRound size={13} /> Fullname</p>
                      {isEditing ? <input value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500" /> : <p className="mt-1.5 text-sm font-semibold text-slate-700">{name}</p>}
                    </div>
                  </div>
                  <div className="border-b border-slate-200 py-4">
                    <div className={fieldCardClass(isEditing ? (form.birthday || "Not provided") : birthday)}>
                      <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(birthday)}`}><CalendarDays size={13} /> Birthday</p>
                      {isEditing ? <input type="date" value={form.birthday} onChange={(event) => updateField("birthday", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500" /> : <p className="mt-1.5 text-sm font-semibold text-slate-700">{formatValue(birthday)}</p>}
                    </div>
                  </div>
                  <div className="border-b border-slate-200 py-4">
                    <div className={fieldCardClass(isEditing ? (form.homeAddress || "Not provided") : homeAddress)}>
                      <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(homeAddress)}`}><Home size={13} /> Home Address</p>
                      {isEditing ? <input value={form.homeAddress} onChange={(event) => updateField("homeAddress", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500" /> : <p className="mt-1.5 text-sm font-semibold text-slate-700">{homeAddress}</p>}
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className={fieldCardClass(isEditing ? (form.contactNumber || "Not provided") : contactNumber)}>
                      <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(contactNumber)}`}><Phone size={13} /> Contact No.</p>
                      {isEditing ? <input value={form.contactNumber} onChange={(event) => updateField("contactNumber", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500" /> : <p className="mt-1.5 text-sm font-semibold text-slate-700">{contactNumber}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-200 pb-6 sm:pl-6">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Contact person in case of Emergency</h3>
                <div className="mt-4 divide-y divide-slate-200">
                  <div className="border-b border-slate-200 pb-4">
                    <div className={fieldCardClass(isEditing ? (form.emergencyName || "Not provided") : emergencyName)}>
                      <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(emergencyName)}`}><UserRound size={13} /> Name</p>
                      {isEditing ? <input value={form.emergencyName} onChange={(event) => updateField("emergencyName", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500" /> : <p className="mt-1.5 text-sm font-semibold text-slate-700">{emergencyName}</p>}
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className={fieldCardClass(isEditing ? (form.emergencyContactNumber || "Not provided") : emergencyContactNumber)}>
                      <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(emergencyContactNumber)}`}><Phone size={13} /> Contact Number</p>
                      {isEditing ? <input value={form.emergencyContactNumber} onChange={(event) => updateField("emergencyContactNumber", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500" /> : <p className="mt-1.5 text-sm font-semibold text-slate-700">{emergencyContactNumber}</p>}
                    </div>
                  </div>
                </div>
                <div className="mt-6 border-t border-slate-200 pt-4">
                  <p className="text-[10px] font-semibold leading-relaxed text-slate-400">Emergency contact details should be kept current for employee safety and HR response.</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="border-b border-slate-200 pb-6 sm:pr-6">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Assignment details</h3>
                <div className="mt-4 grid gap-3">
                  <div className={fieldCardClass(registrationDate)}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(registrationDate)}`}>Date of Registration</p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-700">{formatValue(registrationDate)}</p>
                  </div>
                  <div className={fieldCardClass(boothNumber)}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(boothNumber)}`}>Booth Number</p>
                    {isEditing ? <input value={form.boothNumber} onChange={(event) => updateField("boothNumber", event.target.value)} placeholder="Add booth number" className="mt-1.5 w-full border-b border-slate-300 bg-transparent py-1 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-500" /> : <p className="mt-1.5 text-sm font-semibold text-slate-700">{boothNumber}</p>}
                  </div>
                  <div className={fieldCardClass(boothLocation)}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(boothLocation)}`}>Booth Location</p>
                    {isEditing ? <input value={form.boothLocation} onChange={(event) => updateField("boothLocation", event.target.value)} placeholder="Add booth location" className="mt-1.5 w-full border-b border-slate-300 bg-transparent py-1 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-500" /> : <p className="mt-1.5 text-sm font-semibold text-slate-700">{boothLocation}</p>}
                  </div>
                  <div className={fieldCardClass(supervisorName || "Not provided")}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(supervisorName || "Not provided")}`}>Supervisor</p>
                    <p className="mt-1.5 text-sm font-semibold text-slate-700">{supervisorName || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <div className={`border-b border-slate-200 pb-6 sm:pl-6 ${fieldCardClass(idNumber)}`}>
                <h3 className={`text-xs font-extrabold uppercase tracking-wider ${fieldLabelClass(idNumber)}`}>ID Number</h3>
                {isEditing ? <input value={form.idNumber} onChange={(event) => updateField("idNumber", event.target.value)} placeholder="Add ID number" className="mt-4 w-full border-b border-slate-300 bg-transparent py-1 text-2xl font-extrabold tracking-wide text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-500" /> : <p className="mt-4 text-2xl font-extrabold tracking-wide text-slate-700">{idNumber}</p>}
                <p className="mt-2 text-[10px] font-semibold text-slate-400">Agent identification number from the source API.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-5 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"><CalendarDays size={13} className="text-emerald-600" /> Profile synced from API</span>
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"><Award size={13} className="text-emerald-600" /> Agent record</span>
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"><UserRound size={13} className="text-emerald-600" /> HR workspace</span>
            </div>

            <details
              key={`credentials-${agentKey}`}
              className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 select-none">Device Credentials</summary>
              <div className="grid gap-2 border-t border-slate-200 p-3 sm:grid-cols-2">
                {Object.entries(agent).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{key.replaceAll("_", " ")}</p>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-relaxed text-slate-700">{formatValue(value)}</pre>
                  </div>
                ))}
                <div className="rounded-lg border border-slate-200 bg-white p-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">barangay name</p>
                  <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] leading-relaxed text-slate-700">{barangayName || "Not provided"}</pre>
                </div>
              </div>
            </details>

            <details
              key={`requirements-${agentKey}`}
              open={requirementsOpen}
              onToggle={(e) => setRequirementsOpen(e.currentTarget.open)}
              className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition"
            >
              <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 select-none">
                Registration Requirements
                {uploadedRequirements.length > 0 && (
                  <span className="ml-2.5 inline-flex items-center text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {uploadedRequirements.length} in Database
                  </span>
                )}
              </summary>

              <div className="border-t border-slate-200 p-4 space-y-4">
                {/* Notice */}
                {requirementNotice && (
                  <div className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${requirementNotice.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}>
                    <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{requirementNotice.message}</span>
                  </div>
                )}

                {/* Upload Controls & Download Action Bar */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-emerald-300 transition hover:bg-slate-800 shadow-sm cursor-pointer disabled:opacity-70">
                        {uploadingRequirements ? (
                          <>
                            <Loader2 size={14} className="animate-spin text-emerald-400" />
                            <span>AI OCR Scanning & Uploading...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span>Upload Requirements</span>
                          </>
                        )}
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          disabled={uploadingRequirements}
                          onChange={handleRequirementUpload}
                        />
                      </label>

                      {/* Batch OCR Auto-Classify Button */}
                      {uploadedRequirements.length > 0 && (
                        <button
                          type="button"
                          onClick={handleBatchClassifyAll}
                          disabled={isBatchScanningOcr}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 hover:border-indigo-300 disabled:opacity-60 disabled:cursor-wait"
                          title="Scan all requirement documents with AI OCR to classify types and standardize names"
                        >
                          {isBatchScanningOcr ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-indigo-600" />
                              <span>Scanning All with OCR...</span>
                            </>
                          ) : (
                            <>
                              <Scan size={14} className="text-indigo-600" />
                              <span>AI OCR Classify All</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Auto-Sort by Standard Sequence Button */}
                      {uploadedRequirements.length > 0 && (
                        <button
                          type="button"
                          onClick={handleResetToStandardSequence}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50/80 px-3.5 py-2.5 text-xs font-bold text-purple-700 transition hover:bg-purple-100 hover:border-purple-300 shadow-xs"
                          title="Sort in standard sequence: 1. Biodata -> 2. Barangay Clearance -> 3. Agency Agreement -> 4. Valid ID"
                        >
                          <ListOrdered size={14} className="text-purple-600" />
                          <span>Auto-Sort Sequence</span>
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      OCR auto-identifies Biodata, Barangay, Agreement, Valid ID & more
                    </p>
                  </div>

                  {/* Standard Sequence Guide Banner */}
                  {uploadedRequirements.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-slate-100/90 border border-slate-200/90 text-xs text-slate-600 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-extrabold text-slate-800">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-600 text-[10px] text-white">#</span>
                        <span className="text-[11px]">Priority Sequence:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-200">1. Biodata</span>
                        <span className="text-slate-400">→</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">2. Barangay Clearance</span>
                        <span className="text-slate-400">→</span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200">3. Agency Agreement</span>
                        <span className="text-slate-400">→</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">4. Valid ID</span>
                        <span className="text-slate-400">→</span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">5. Other Clearances</span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 italic">Drag cards to arrange PDF page order</span>
                    </div>
                  )}

                  {/* Prominent Download Bar with Interactive PDF Preview and Batch Downloads */}
                  {uploadedRequirements.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-slate-50 p-3.5 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                          <FileDown size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">Download Requirements</h4>
                          <p className="text-[10px] font-medium text-slate-500">
                            {uploadedRequirements.length} {uploadedRequirements.length === 1 ? "document" : "documents"} ready · Following page sequence
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Interactive PDF Preview and Download Button */}
                        <button
                          type="button"
                          onClick={handlePreviewAllPdf}
                          disabled={downloadingPdf}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm shadow-emerald-600/20 transition hover:from-emerald-500 hover:to-teal-500 hover:shadow disabled:cursor-wait disabled:opacity-60"
                          title="Preview full compiled PDF with interactive page controls before downloading"
                        >
                          {downloadingPdf ? (
                            <>
                              <Loader2 size={14} className="animate-spin text-white" />
                              <span>Preparing Preview...</span>
                            </>
                          ) : (
                            <>
                              <Eye size={14} />
                              <span>Preview & Download PDF</span>
                            </>
                          )}
                        </button>

                        {/* Batch Image Download as ZIP */}
                        <button
                          type="button"
                          onClick={handleBatchDownloadZip}
                          disabled={downloadingBatch}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                          title="Download all requirement images compressed as a single ZIP archive"
                        >
                          {downloadingBatch ? (
                            <Loader2 size={13} className="animate-spin text-slate-600" />
                          ) : (
                            <Archive size={14} className="text-emerald-700" />
                          )}
                          <span>Batch Images (ZIP)</span>
                        </button>

                        {/* Batch Image Download Direct */}
                        <button
                          type="button"
                          onClick={handleBatchDownloadDirect}
                          disabled={downloadingBatch}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
                          title="Download each requirement image file individually in batch"
                        >
                          <Download size={13} />
                          <span>Direct Batch</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Uploaded Gallery / List */}
                {loadingRequirements ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    <span>Loading requirements from database...</span>
                  </div>
                ) : uploadedRequirements.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      <span>Uploaded Documents ({uploadedRequirements.length}) · Drag or Click Arrows to Reorder</span>
                      <span className="text-emerald-600 flex items-center gap-1 font-semibold normal-case">
                        <ShieldCheck size={12} /> Persisted in database
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {uploadedRequirements.map((file, idx) => {
                        const isImage = file.type?.startsWith("image/") || file.dataUrl?.startsWith("data:image/");
                        const isScanningThis = scanningOcrIds.includes(file.id);
                        const isBeingDragged = draggedIndex === idx;
                        const isDragOver = dragOverIndex === idx;

                        return (
                          <div
                            key={file.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, idx)}
                            className={`group relative rounded-xl border p-2.5 transition duration-150 flex flex-col justify-between gap-2 ${
                              isDragOver
                                ? "border-indigo-500 ring-2 ring-indigo-400/50 bg-indigo-50/40 shadow-lg scale-[1.02]"
                                : isBeingDragged
                                ? "opacity-40 border-dashed border-slate-400 bg-slate-100"
                                : "border-slate-200 bg-slate-50/80 hover:bg-white hover:border-slate-300 hover:shadow-sm"
                            }`}
                          >
                            {/* Page Sequence Bar & Directional Move Controls */}
                            <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-slate-200/60 text-slate-600">
                              <div
                                className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing"
                                title="Drag card to move page order"
                              >
                                <GripVertical size={14} className="text-slate-400 group-hover:text-slate-700" />
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-900 text-emerald-400 shadow-2xs">
                                  Page {idx + 1}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveItem(idx, -1)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent transition"
                                  title="Move earlier (Page -1)"
                                >
                                  <ArrowLeft size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === uploadedRequirements.length - 1}
                                  onClick={() => handleMoveItem(idx, 1)}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-20 disabled:hover:bg-transparent transition"
                                  title="Move later (Page +1)"
                                >
                                  <ArrowRight size={12} />
                                </button>
                              </div>
                            </div>

                            {/* Preview Area */}
                            {isImage && file.dataUrl ? (
                              <div
                                onClick={() => setPreviewModalImage(file)}
                                className="relative h-28 w-full rounded-lg overflow-hidden bg-slate-900/5 cursor-pointer border border-slate-200/80 group-hover:border-emerald-300 transition"
                              >
                                <img
                                  src={file.dataUrl}
                                  alt={file.name}
                                  className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1.5 text-xs font-bold">
                                  <Eye size={14} /> View Full
                                </div>
                              </div>
                            ) : (
                              <div className="h-28 w-full rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-500 gap-1.5">
                                <FileText size={28} className="text-slate-400" />
                                <span className="text-[10px] font-bold uppercase">{file.name.split('.').pop() || 'DOC'}</span>
                              </div>
                            )}

                            {/* Document Category Badge with Edit Dropdown */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-1">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setEditingCategoryId(editingCategoryId === file.id ? null : file.id)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold border transition ${getDocumentBadgeStyle(
                                      file.classifiedType
                                    )} hover:brightness-95`}
                                    title="Click to change document category"
                                  >
                                    <Tag size={10} />
                                    <span className="truncate max-w-[115px]">{file.classifiedType || "Unclassified"}</span>
                                    <ChevronDown size={10} className="opacity-70" />
                                  </button>

                                  {/* Category Dropdown Picker */}
                                  {editingCategoryId === file.id && (
                                    <div
                                      className="absolute left-0 top-full mt-1 w-48 rounded-xl bg-white shadow-xl border border-slate-200 p-1.5 z-40 max-h-56 overflow-y-auto"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <p className="px-2 py-1 text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                                        Select Category
                                      </p>
                                      {DOCUMENT_CATEGORIES.map((cat) => (
                                        <button
                                          key={cat.id}
                                          type="button"
                                          onClick={() => handleChangeCategory(file, cat)}
                                          className={`w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-between ${
                                            file.classifiedType === cat.label
                                              ? "bg-slate-900 text-white"
                                              : "text-slate-700 hover:bg-slate-100"
                                          }`}
                                        >
                                          <span>{cat.label}</span>
                                          {file.classifiedType === cat.label && <Check size={11} />}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleClassifySingleRequirement(file)}
                                  disabled={isScanningThis}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition disabled:opacity-50"
                                  title="Run AI OCR scan on this document to recognize type and rename"
                                >
                                  {isScanningThis ? (
                                    <Loader2 size={10} className="animate-spin text-indigo-600" />
                                  ) : (
                                    <Scan size={10} />
                                  )}
                                  <span>{file.classifiedType ? "Re-scan" : "AI OCR"}</span>
                                </button>
                              </div>
                            </div>

                            {/* Info & Actions */}
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
                                {file.name}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>{formatFileSize(file.size)}</span>
                                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                  <Check size={11} /> Saved
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                              {file.dataUrl && (
                                <div className="flex items-center gap-1">
                                  <a
                                    href={file.dataUrl}
                                    download={file.name}
                                    className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 text-[11px] font-semibold flex items-center gap-1 transition"
                                    title="Download Original File"
                                  >
                                    <Download size={13} />
                                    <span>Download</span>
                                  </a>
                                  {isImage && (
                                    <button
                                      type="button"
                                      onClick={() => handlePreviewSinglePdf(file)}
                                      className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 text-[11px] font-semibold flex items-center gap-1 transition"
                                      title="Preview single requirement document compiled into branded PDF"
                                    >
                                      <Eye size={12} />
                                      <span>PDF Preview</span>
                                    </button>
                                  )}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => removeRequirementFile(file.id, file.storagePath)}
                                aria-label={`Delete ${file.name}`}
                                className="p-1 rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 text-[11px] font-semibold flex items-center gap-1 transition ml-auto"
                                title="Delete from database"
                              >
                                <Trash2 size={13} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 bg-slate-50/50">
                    <p className="font-semibold text-slate-600">No registration requirements uploaded yet.</p>
                    <p className="mt-1 text-[11px] text-slate-400">Upload clearances, valid IDs, certificates, or documents above. They will be auto-classified by OCR and saved to database.</p>
                  </div>
                )}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Interactive Full-Screen PDF Preview Modal */}
      {pdfPreviewState.isOpen && (
        <div
          className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/85 p-3 sm:p-5 backdrop-blur-md"
          onClick={closePdfPreview}
        >
          <div
            className="relative max-h-[95vh] max-w-5xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-950 border-b border-slate-800 text-white">
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold truncate text-white">{pdfPreviewState.title || "PDF Preview"}</h3>
                    <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      {pdfPreviewState.totalPages} {pdfPreviewState.totalPages === 1 ? "Page" : "Pages"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    File: {pdfPreviewState.fileName} · Verified Archival Document
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Open in new tab button */}
                {pdfPreviewState.blobUrl && (
                  <a
                    href={pdfPreviewState.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
                    title="Open PDF in a new browser tab"
                  >
                    <ExternalLink size={14} />
                    <span className="hidden sm:inline">New Tab</span>
                  </a>
                )}

                {/* Prominent Download Button inside Preview */}
                <button
                  type="button"
                  onClick={handleDownloadFromPreview}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-emerald-900/40"
                  title="Download this compiled PDF document"
                >
                  <FileDown size={15} />
                  <span>Download PDF</span>
                </button>

                {/* Close Modal Button */}
                <button
                  type="button"
                  onClick={closePdfPreview}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer */}
            <div className="p-3 bg-slate-950/70 flex-1 min-h-[500px] max-h-[calc(90vh-120px)] flex flex-col items-center justify-center">
              {pdfPreviewState.blobUrl ? (
                <iframe
                  src={pdfPreviewState.blobUrl}
                  title="Requirements PDF Preview"
                  className="w-full h-full min-h-[520px] rounded-xl border border-slate-700 bg-slate-800 shadow-inner"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-20">
                  <Loader2 size={24} className="animate-spin text-emerald-500" />
                  <p className="text-xs font-bold">Rendering PDF preview...</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Branded HRHub archival format with auto-scaled document layouts and OCR tags</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadFromPreview}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                >
                  <FileDown size={13} /> Save Copy ({pdfPreviewState.fileName})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Preview Modal */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewModalImage(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 text-white">
              <div className="min-w-0 pr-4">
                <p className="text-xs font-bold truncate">{previewModalImage.name}</p>
                <p className="text-[10px] text-slate-400">{formatFileSize(previewModalImage.size)} · Saved in Database</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handlePreviewSinglePdf(previewModalImage)}
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                  title="Preview document in branded PDF format before downloading"
                >
                  <Eye size={14} /> Preview PDF
                </button>
                <a
                  href={previewModalImage.dataUrl}
                  download={previewModalImage.name}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition"
                  title="Download image file"
                >
                  <Download size={14} /> Download Image
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewModalImage(null)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[calc(90vh-60px)] bg-slate-950/60">
              <img
                src={previewModalImage.dataUrl}
                alt={previewModalImage.name}
                className="max-h-[80vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Agent ID Card Modal */}
      {showIdCardModal && (
        <AgentIdCardModal
          agent={agent}
          agentKey={agentKey}
          initialData={{
            fullName: form.fullName || savedOverride?.fullName || name,
            idNumber: form.idNumber || savedOverride?.idNumber || idNumber,
            role: role,
            emergencyName: form.emergencyName || savedOverride?.emergencyName || emergencyName,
            emergencyContactNumber: form.emergencyContactNumber || savedOverride?.emergencyContactNumber || emergencyContactNumber
          }}
          uploadedRequirements={uploadedRequirements}
          onClose={() => setShowIdCardModal(false)}
        />
      )}
    </div>
  );
}
