import { useEffect, useState } from "react";
import {
  Activity, Archive, Award, CalendarDays, Check, CheckCircle2, CreditCard, Database, Download, Eye, FileDown, FileText,
  Fingerprint, Home, KeyRound, Loader2, Lock, Pencil, Phone, ShieldCheck, Sparkles, Trash2, Upload, UserRound, X,
  FileCheck, Printer, ExternalLink, RefreshCw, Info, Plus, GripVertical, ArrowLeft, ArrowRight, ChevronDown, Layers,
  Maximize2, RotateCw
} from "lucide-react";
import AgentIdCardModal from "./AgentIdCardModal";
import PageOrganizerModal from "./PageOrganizerModal";
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
  REGISTRATION_SLOTS,
  REQUIRED_SLOT_IDS,
  OPTIONAL_SLOTS,
  findRequirementsForSlot,
  findRequirementForSlot,
  sortRequirementsBySlotSequence,
  compareFileNamesNaturally
} from "../config/registrationRequirementsConfig";
import {
  getAgentProfileOverride,
  saveAgentProfileOverride
} from "../lib/agentProfileStorage";

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
  const [uploadingSlotId, setUploadingSlotId] = useState(null);
  const [visibleOptionalSlotIds, setVisibleOptionalSlotIds] = useState([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [draggedPhotoId, setDraggedPhotoId] = useState(null);
  const [dragOverPhotoId, setDragOverPhotoId] = useState(null);
  const [organizingSlotId, setOrganizingSlotId] = useState(null);
  const [activeCoverSlotPhoto, setActiveCoverSlotPhoto] = useState({});

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
              fullName: rawValueOf(agent, ["name", "full_name", "fullName", "username", "email"]),
              birthday: rawValueOf(agent, ["birthday", "birthdate", "birth_date", "date_of_birth", "dateOfBirth"]) || profileOverride.birthday || prev.birthday,
              homeAddress: rawValueOf(agent, ["home_address", "homeAddress", "address", "location"]) || profileOverride.homeAddress || prev.homeAddress,
              contactNumber: rawValueOf(agent, ["contactNumber", "contact_number", "phone", "phone_number", "phoneNumber"]),
              emergencyName: profileOverride.emergencyName || prev.emergencyName,
              emergencyContactNumber: profileOverride.emergencyContactNumber || prev.emergencyContactNumber,
              boothNumber: profileOverride.boothNumber || prev.boothNumber,
              boothLocation: profileOverride.boothLocation || prev.boothLocation,
              idNumber: profileOverride.idNumber || rawValueOf(agent, ["agent_id", "agentId", "id"]) || prev.idNumber
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
    idNumber: rawValueOf(agent, ["agent_id", "agentId", "id"]) || ""
  });
  // Database fields: Strictly immutable and derived directly from the database record
  const apiFullName = valueOf(agent, ["name", "full_name", "fullName", "username", "email"], "");
  const name = apiFullName || `Agent ${index + 1}`;
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const role = valueOf(agent, ["role", "position", "title"], "SALES REPRESENTATIVE");

  const rawApiBirthday = rawValueOf(agent, ["birthday", "birthdate", "birth_date", "date_of_birth", "dateOfBirth"]);
  const isApiBirthday = Boolean(rawApiBirthday && String(rawApiBirthday).trim() !== "");
  const birthday = isApiBirthday ? rawApiBirthday : (form.birthday || savedOverride?.birthday || "Not provided");

  const rawApiHomeAddress = rawValueOf(agent, ["home_address", "homeAddress", "address", "location"]);
  const isApiHomeAddress = Boolean(rawApiHomeAddress && String(rawApiHomeAddress).trim() !== "");
  const homeAddress = isApiHomeAddress ? rawApiHomeAddress : (form.homeAddress || savedOverride?.homeAddress || "Not provided");

  // Contact Number strictly adheres to the Source API and cannot be overwritten
  const contactNumber = valueOf(agent, ["contactNumber", "contact_number", "phone", "phone_number", "phoneNumber"]);
  const emergencyName = form.emergencyName || savedOverride?.emergencyName || valueOf(agent, ["emergency_contact_name", "emergencyContactName", "emergency_name", "emergencyName", "contact_person"]);
  const emergencyContactNumber = form.emergencyContactNumber || savedOverride?.emergencyContactNumber || valueOf(agent, ["emergency_contact_number", "emergencyContactNumber", "emergency_phone", "emergencyPhone"]);
  const registrationDate = valueOf(agent, ["date_of_registration", "dateOfRegistration", "registration_date", "registrationDate", "created_at"]);
  const boothNumber = form.boothNumber || savedOverride?.boothNumber || valueOf(agent, ["booth_number", "boothNumber"]);
  const boothLocation = form.boothLocation || savedOverride?.boothLocation || valueOf(agent, ["booth_location", "boothLocation"]);

  // ID Number is editable and custom-assignable by HR
  const idNumber = form.idNumber || savedOverride?.idNumber || valueOf(agent, ["agent_id", "agentId", "id"], "Not provided");

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
      const cleanOverride = {
        ...savedOverride,
        fullName: rawValueOf(agent, ["name", "full_name", "fullName", "username", "email"]),
        contactNumber: rawValueOf(agent, ["contactNumber", "contact_number", "phone", "phone_number", "phoneNumber"]),
        idNumber: form.idNumber,
        birthday: isApiBirthday ? rawApiBirthday : form.birthday,
        homeAddress: isApiHomeAddress ? rawApiHomeAddress : form.homeAddress,
        emergencyName: form.emergencyName,
        emergencyContactNumber: form.emergencyContactNumber,
        boothNumber: form.boothNumber,
        boothLocation: form.boothLocation
      };

      await saveAgentProfileOverride(agentKey, cleanOverride);
      setSavedOverride(cleanOverride);
      onSave?.({
        ...agent,
        fullName: rawValueOf(agent, ["name", "full_name", "fullName", "username", "email"]),
        birthday: isApiBirthday ? rawApiBirthday : form.birthday,
        address: isApiHomeAddress ? rawApiHomeAddress : form.homeAddress,
        contactNumber: rawValueOf(agent, ["contactNumber", "contact_number", "phone", "phone_number", "phoneNumber"]),
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

  // --- INDIVIDUAL REQUIREMENT SLOT UPLOAD HANDLER ---
  const handleSlotUpload = async (event, slot) => {
    const rawFiles = Array.from(event.target.files || []);
    if (!rawFiles.length) return;

    // 1. Sort selected files naturally by filename number (1, 2, 3, 4, 5, 6, 7, 8...)
    const files = [...rawFiles].sort((a, b) =>
      compareFileNamesNaturally(a.name, b.name)
    );

    setUploadingSlotId(slot.id);
    setRequirementNotice({
      type: "info",
      message: `Uploading ${files.length} document${files.length > 1 ? "s" : ""} to ${slot.title}...`
    });

    try {
      const cleanAgentPrefix = name ? name.trim().replace(/[^a-zA-Z0-9_\-]/g, "_") : "Agent";
      const existingSlotItems = findRequirementsForSlot(uploadedRequirements, slot.id);

      // If slot does NOT allow multiple files (single-file slots like Biodata, Barangay Clearance), purge previous records
      if (!slot.allowMultiple && existingSlotItems.length > 0) {
        for (const oldItem of existingSlotItems) {
          await deleteRequirementFile(oldItem.id, agentKey, oldItem.storagePath);
        }
      }

      const newRecords = [];
      const baseSubOrder = slot.allowMultiple ? existingSlotItems.length : 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const pageNum = baseSubOrder + i + 1;
        const rawBase = file.name || "document";
        const cleanSlotPrefix = slot.cleanName;
        const prefixNeeded = !rawBase.toLowerCase().includes(slot.cleanName.toLowerCase());
        const preferredFileName = prefixNeeded
          ? (slot.allowMultiple ? `${cleanSlotPrefix}_Page_${pageNum}_${rawBase}` : `${cleanSlotPrefix}_${rawBase}`)
          : rawBase;

        const extraMeta = {
          categoryKey: slot.id,
          classifiedType: slot.title,
          fileName: preferredFileName,
          originalName: file.name,
          sortOrder: slot.order,
          subOrder: pageNum
        };

        const savedRecord = await saveRequirementFile(agentKey, file, extraMeta);
        newRecords.push(savedRecord);
      }

      const otherItems = uploadedRequirements.filter((item) => {
        if (!slot.allowMultiple && item.categoryKey === slot.id) return false;
        return !newRecords.some((n) => n.id === item.id);
      });

      const updatedList = sortRequirementsBySlotSequence([...otherItems, ...newRecords]);
      setUploadedRequirements(updatedList);
      await saveRequirementsOrder(agentKey, updatedList);

      setRequirementNotice({
        type: "success",
        message: `${files.length} picture${files.length > 1 ? "s" : ""} added to ${slot.title}!`
      });

      // Automatically open the large organizer modal for multi-photo slots so user can clearly inspect and arrange
      if (slot.allowMultiple) {
        setOrganizingSlotId(slot.id);
      }
    } catch (err) {
      console.error(`Failed to upload to ${slot.title}:`, err);
      setRequirementNotice({
        type: "error",
        message: `Failed to upload to ${slot.title}: ${err.message}`
      });
    } finally {
      setUploadingSlotId(null);
      event.target.value = "";
      setTimeout(() => setRequirementNotice(null), 4000);
    }
  };

  // --- RECOVERY HELPER FOR LEGACY UNASSIGNED DATABASE DOCUMENTS ---
  const handleBulkAssignSlot = async (itemsToAssign, targetSlotId) => {
    try {
      const slotDef = REGISTRATION_SLOTS.find((s) => s.id === targetSlotId) || { id: targetSlotId, title: targetSlotId, order: 3 };
      const existingInSlot = findRequirementsForSlot(uploadedRequirements, targetSlotId);
      const startSubOrder = existingInSlot.length;

      for (let i = 0; i < itemsToAssign.length; i++) {
        const item = itemsToAssign[i];
        await updateRequirementRecord(agentKey, item.id, {
          categoryKey: targetSlotId,
          classifiedType: slotDef.title,
          sortOrder: slotDef.order,
          subOrder: startSubOrder + i + 1
        });
      }

      const refreshed = await getRequirementsByProfile(agentKey);
      setUploadedRequirements(refreshed);
      setRequirementNotice({
        type: "success",
        message: `Successfully linked ${itemsToAssign.length} documents to ${slotDef.title}!`
      });
      setTimeout(() => setRequirementNotice(null), 4000);
    } catch (err) {
      console.error("Bulk assign failed:", err);
      setRequirementNotice({
        type: "error",
        message: `Bulk assignment failed: ${err.message}`
      });
    }
  };

  const handlePurgeUnassigned = async (itemsToPurge) => {
    try {
      for (const item of itemsToPurge) {
        await deleteRequirementFile(item.id, agentKey, item.storagePath);
      }
      const refreshed = await getRequirementsByProfile(agentKey);
      setUploadedRequirements(refreshed);
      setRequirementNotice({
        type: "info",
        message: `Removed ${itemsToPurge.length} unassigned documents.`
      });
      setTimeout(() => setRequirementNotice(null), 3000);
    } catch (err) {
      console.error("Purge unassigned failed:", err);
    }
  };

  // --- REORDER PHOTOS WITHIN MULTI-PAGE SLOTS (AGENCY AGREEMENT, VALID ID) ---
  const handlePhotoDragStart = (e, photoId) => {
    setDraggedPhotoId(photoId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", photoId);
  };

  const handlePhotoDragOver = (e, photoId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverPhotoId !== photoId) {
      setDragOverPhotoId(photoId);
    }
  };

  const handlePhotoDrop = async (e, targetPhotoId, slotId) => {
    e.preventDefault();
    setDragOverPhotoId(null);
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId) {
      setDraggedPhotoId(null);
      return;
    }

    const slotItems = findRequirementsForSlot(uploadedRequirements, slotId);
    const dragIdx = slotItems.findIndex((it) => it.id === draggedPhotoId);
    const targetIdx = slotItems.findIndex((it) => it.id === targetPhotoId);

    if (dragIdx === -1 || targetIdx === -1) {
      setDraggedPhotoId(null);
      return;
    }

    const reordered = [...slotItems];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    const updatedSlotItems = reordered.map((item, idx) => ({
      ...item,
      subOrder: idx + 1
    }));

    const otherItems = uploadedRequirements.filter((item) => item.categoryKey !== slotId);
    const fullUpdatedList = sortRequirementsBySlotSequence([...otherItems, ...updatedSlotItems]);

    setUploadedRequirements(fullUpdatedList);
    setDraggedPhotoId(null);
    await saveRequirementsOrder(agentKey, fullUpdatedList);

    setRequirementNotice({
      type: "success",
      message: `Reordered pictures in ${slotId === "agency_agreement" ? "Agency Agreement" : "Valid ID"}: Page ${targetIdx + 1}`
    });
    setTimeout(() => setRequirementNotice(null), 3000);
  };

  const handleMovePhoto = async (slotId, currentIndex, direction) => {
    const slotItems = findRequirementsForSlot(uploadedRequirements, slotId);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= slotItems.length) return;

    const reordered = [...slotItems];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updatedSlotItems = reordered.map((item, idx) => ({
      ...item,
      subOrder: idx + 1
    }));

    const otherItems = uploadedRequirements.filter((item) => item.categoryKey !== slotId);
    const fullUpdatedList = sortRequirementsBySlotSequence([...otherItems, ...updatedSlotItems]);

    setUploadedRequirements(fullUpdatedList);
    await saveRequirementsOrder(agentKey, fullUpdatedList);
  };

  const handleRotateItem = async (itemId, updatedItem) => {
    try {
      await updateRequirementRecord(agentKey, itemId, { dataUrl: updatedItem.dataUrl });
      setUploadedRequirements((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, dataUrl: updatedItem.dataUrl } : it))
      );
    } catch (err) {
      console.error("Failed to update rotated image:", err);
    }
  };

  const handleOrganizerReorder = async (reorderedSlotItems) => {
    if (!reorderedSlotItems.length) return;
    const slotId = reorderedSlotItems[0].categoryKey;
    const otherItems = uploadedRequirements.filter((item) => item.categoryKey !== slotId);
    const fullUpdatedList = sortRequirementsBySlotSequence([...otherItems, ...reorderedSlotItems]);
    setUploadedRequirements(fullUpdatedList);
    await saveRequirementsOrder(agentKey, fullUpdatedList);
  };

  const handleAddOptionalCategory = (slotId) => {
    if (!visibleOptionalSlotIds.includes(slotId)) {
      setVisibleOptionalSlotIds((prev) => [...prev, slotId]);
    }
    setIsAddCategoryOpen(false);
    const slotObj = REGISTRATION_SLOTS.find((s) => s.id === slotId);
    setRequirementNotice({
      type: "success",
      message: `Added "${slotObj?.title || slotId}" category!`
    });
    setTimeout(() => setRequirementNotice(null), 3000);
  };

  const handleRemoveOptionalCategory = (slotId) => {
    setVisibleOptionalSlotIds((prev) => prev.filter((id) => id !== slotId));
    setIsAddCategoryOpen(false);
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

  // Determine displayed slots: Required slots always visible; optional slots only if added or has uploaded files
  const activeOptionalSlots = OPTIONAL_SLOTS.filter(
    (slot) =>
      visibleOptionalSlotIds.includes(slot.id) ||
      findRequirementsForSlot(uploadedRequirements, slot.id).length > 0
  );

  const availableOptionalSlots = OPTIONAL_SLOTS.filter(
    (slot) => !activeOptionalSlots.some((s) => s.id === slot.id)
  );

  const displayedSlots = [
    ...REGISTRATION_SLOTS.filter((s) => s.required),
    ...activeOptionalSlots
  ];

  const unassignedRequirements = uploadedRequirements.filter((req) => {
    return !REGISTRATION_SLOTS.some((slot) => findRequirementsForSlot([req], slot.id).length > 0);
  });

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
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <UserRound size={13} /> Fullname
                        </p>
                        {isEditing && (
                          <span className="flex items-center gap-1 text-[9.5px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            <Lock size={10} className="text-slate-500" />
                            Database Only
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-slate-700">{name}</p>
                      {isEditing && (
                        <p className="mt-1 text-[10px] font-medium text-slate-400">
                          Strictly synced with Database · Read-only
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="border-b border-slate-200 py-4">
                    <div className={fieldCardClass(isEditing ? (isApiBirthday ? birthday : (form.birthday || "Not provided")) : birthday)}>
                      <div className="flex items-center justify-between">
                        <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(birthday)}`}>
                          <CalendarDays size={13} /> Birthday
                        </p>
                        {isEditing && isApiBirthday && (
                          <span className="flex items-center gap-1 text-[9.5px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            <Lock size={10} className="text-slate-500" />
                            Database Only
                          </span>
                        )}
                      </div>
                      {isEditing && !isApiBirthday ? (
                        <input
                          type="date"
                          value={form.birthday}
                          onChange={(event) => updateField("birthday", event.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"
                        />
                      ) : (
                        <p className="mt-1.5 text-sm font-semibold text-slate-700">{formatValue(birthday)}</p>
                      )}
                      {isEditing && isApiBirthday && (
                        <p className="mt-1 text-[10px] font-medium text-slate-400">
                          Strictly synced with Database · Read-only
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="border-b border-slate-200 py-4">
                    <div className={fieldCardClass(isEditing ? (isApiHomeAddress ? homeAddress : (form.homeAddress || "Not provided")) : homeAddress)}>
                      <div className="flex items-center justify-between">
                        <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(homeAddress)}`}>
                          <Home size={13} /> Home Address
                        </p>
                        {isEditing && isApiHomeAddress && (
                          <span className="flex items-center gap-1 text-[9.5px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            <Lock size={10} className="text-slate-500" />
                            Database Only
                          </span>
                        )}
                      </div>
                      {isEditing && !isApiHomeAddress ? (
                        <input
                          value={form.homeAddress}
                          onChange={(event) => updateField("homeAddress", event.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-emerald-500"
                        />
                      ) : (
                        <p className="mt-1.5 text-sm font-semibold text-slate-700">{homeAddress}</p>
                      )}
                      {isEditing && isApiHomeAddress && (
                        <p className="mt-1 text-[10px] font-medium text-slate-400">
                          Strictly synced with Database · Read-only
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="pt-4">
                    <div className={fieldCardClass(contactNumber)}>
                      <div className="flex items-center justify-between">
                        <p className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${fieldLabelClass(contactNumber)}`}><Phone size={13} /> Contact No.</p>
                        {isEditing && (
                          <span className="flex items-center gap-1 text-[9.5px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                            <Lock size={10} className="text-slate-500" />
                            Database Only
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-slate-700">{contactNumber}</p>
                      {isEditing && (
                        <p className="mt-1 text-[10px] font-medium text-slate-400">
                          Strictly synced with Database · Read-only
                        </p>
                      )}
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
                {isEditing ? (
                  <input
                    value={form.idNumber}
                    onChange={(event) => updateField("idNumber", event.target.value)}
                    placeholder="Add ID number"
                    className="mt-4 w-full border-b border-slate-300 bg-transparent py-1 text-2xl font-extrabold tracking-wide text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-500"
                  />
                ) : (
                  <p className="mt-4 text-2xl font-extrabold tracking-wide text-slate-700">{idNumber}</p>
                )}
                <p className="mt-2 text-[10px] font-semibold text-slate-400">Agent identification number.</p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-5 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"><CalendarDays size={13} className="text-emerald-600" /> Profile synced from Database</span>
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

                {/* Requirements Action Bar */}
                <div className="space-y-3">
                  {/* Sequence Guide Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100/90 border border-slate-200/90 text-xs text-slate-700 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-extrabold text-slate-800">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-600 text-[10px] text-white">#</span>
                      <span className="text-[11px]">Strict Page Sequence:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span className="px-2.5 py-1 rounded-md bg-purple-100 text-purple-900 border border-purple-200">1. Biodata</span>
                      <span className="text-slate-400">→</span>
                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200">2. Barangay Clearance</span>
                      <span className="text-slate-400">→</span>
                      <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-200">3. Agency Agreement</span>
                      <span className="text-slate-400">→</span>
                      <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-200">4. Valid ID</span>
                      <span className="text-slate-400">→</span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-200 text-slate-700">5. Custom Categories</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">Individual slot uploads · Auto-compiled into PDF in this sequence</span>
                  </div>

                  {/* Prominent Download Bar with Interactive PDF Preview and Batch Downloads */}
                  {uploadedRequirements.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-slate-50 p-3.5 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                          <FileDown size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">Registration Document Archive</h4>
                          <p className="text-[10px] font-medium text-slate-500">
                            {uploadedRequirements.length} {uploadedRequirements.length === 1 ? "document" : "documents"} in database · Compiled strictly in 1→2→3→4 sequence
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

                  {/* Header Sub-bar: Category Count + Add Another Category Button */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>Document Categories ({displayedSlots.length})</span>
                      <span className="text-[10px] font-normal text-slate-400">· 4 Standard Required + Custom Optional</span>
                    </div>

                    {/* Add Another Category Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsAddCategoryOpen(!isAddCategoryOpen)}
                        disabled={availableOptionalSlots.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs transition hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Add another document category slot"
                      >
                        <Plus size={14} className="text-emerald-600" />
                        <span>Add Another Category</span>
                        <ChevronDown size={12} className={`text-slate-400 transition-transform ${isAddCategoryOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isAddCategoryOpen && availableOptionalSlots.length > 0 && (
                        <div
                          className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Available Categories
                          </p>
                          <div className="space-y-0.5">
                            {availableOptionalSlots.map((optSlot) => (
                              <button
                                key={optSlot.id}
                                type="button"
                                onClick={() => handleAddOptionalCategory(optSlot.id)}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition flex items-center justify-between group"
                              >
                                <div>
                                  <span className="block font-bold">{optSlot.title}</span>
                                  <span className="block text-[9.5px] font-normal text-slate-400 line-clamp-1">
                                    {optSlot.subtitle}
                                  </span>
                                </div>
                                <Plus size={13} className="text-slate-400 group-hover:text-emerald-600 shrink-0 ml-1.5" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unassigned Database Documents Recovery Banner */}
                {unassignedRequirements.length > 0 && (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Database size={17} />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-amber-950 text-xs">
                          {unassignedRequirements.length} Legacy Upload{unassignedRequirements.length > 1 ? "s" : ""} Found in Database
                        </h5>
                        <p className="text-[10.5px] text-amber-800">
                          These files exist in your database. Link them to a slot to activate their Cover Photos:
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleBulkAssignSlot(unassignedRequirements, "agency_agreement")}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-xs transition"
                        title="Link all files to Agency Agreement (#3)"
                      >
                        Assign to Agency Agreement (#3)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBulkAssignSlot(unassignedRequirements, "valid_id")}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition"
                        title="Link all files to Valid ID (#4)"
                      >
                        Assign to Valid ID (#4)
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePurgeUnassigned(unassignedRequirements)}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs transition"
                        title="Permanently remove these unassigned files"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Individual Requirement Slots Grid */}
                {loadingRequirements ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                    <span>Loading requirements from database...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayedSlots.map((slot) => {
                      const slotItems = findRequirementsForSlot(uploadedRequirements, slot.id);
                      const isUploaded = slotItems.length > 0;
                      const isUploading = uploadingSlotId === slot.id;
                      const isOptional = !slot.required;

                      return (
                        <div
                          key={slot.id}
                          className={`rounded-2xl border p-4 transition duration-200 flex flex-col justify-between gap-3 ${
                            isUploaded
                              ? "border-emerald-300/80 bg-white shadow-xs hover:border-emerald-400 hover:shadow-md ring-1 ring-emerald-500/10"
                              : "border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300"
                          }`}
                        >
                          {/* Top Slot Header */}
                          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-emerald-400 text-xs font-black shadow-xs">
                                #{slot.order}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                                    {slot.title}
                                  </h4>
                                  {slot.allowMultiple && isUploaded && (
                                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md">
                                      {slotItems.length} {slotItems.length === 1 ? "Picture" : "Pictures"}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 line-clamp-1" title={slot.subtitle}>
                                  {slot.subtitle}
                                </p>
                              </div>
                            </div>

                            {/* Status Badge & Optional Remove */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isUploaded ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold shadow-2xs">
                                  <CheckCircle2 size={11} className="text-emerald-600" /> Active in Database
                                </span>
                              ) : slot.required ? (
                                <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold">
                                  Required
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 text-[10px] font-bold">
                                  Optional
                                </span>
                              )}

                              {/* Dismiss button for empty optional slot */}
                              {isOptional && !isUploaded && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionalCategory(slot.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  title="Remove this optional category"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Card Content: Prominent Cover Photo Proof OR Empty Dropzone */}
                          {isUploaded ? (
                            <div className="space-y-3">
                              {(() => {
                                const activePhotoId = activeCoverSlotPhoto[slot.id];
                                const currentCover = slotItems.find((p) => p.id === activePhotoId) || slotItems[0];
                                const currentCoverIdx = slotItems.findIndex((p) => p.id === currentCover.id);
                                const isImage = currentCover?.type?.startsWith("image/") || currentCover?.dataUrl?.startsWith("data:image/") || currentCover?.dataUrl?.startsWith("http");

                                return (
                                  <div className="space-y-2.5">
                                    {/* Prominent Hero Cover Photo Card */}
                                    <div className="relative group rounded-2xl overflow-hidden border border-slate-200/90 bg-gradient-to-b from-slate-900/[0.03] to-slate-900/[0.08] shadow-xs hover:shadow-md transition duration-200">
                                      {/* Top Left Verified Beacon Badge */}
                                      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 text-emerald-400 text-[10px] font-black backdrop-blur-md border border-emerald-500/30 shadow-xs">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                        </span>
                                        <span>Verified in Database</span>
                                      </div>

                                      {/* Top Right Cover Tag */}
                                      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/85 text-white text-[10px] font-black backdrop-blur-md border border-white/20 shadow-xs">
                                        <Sparkles size={11} className="text-amber-400" />
                                        <span>
                                          {slot.allowMultiple
                                            ? `Cover: Page ${currentCoverIdx + 1} of ${slotItems.length}`
                                            : "Cover Photo Proof"}
                                        </span>
                                      </div>

                                      {/* Hero Cover Image Preview */}
                                      {isImage && currentCover.dataUrl ? (
                                        <div
                                          onClick={() => setPreviewModalImage(currentCover)}
                                          className="relative h-44 sm:h-52 w-full overflow-hidden cursor-pointer flex items-center justify-center bg-slate-950/5 group"
                                        >
                                          <img
                                            src={currentCover.dataUrl}
                                            alt={currentCover.name}
                                            className="h-full w-full object-contain p-1.5 group-hover:scale-[1.03] transition duration-300"
                                          />
                                          {/* Smooth Hover Curtain with Quick Triggers */}
                                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent opacity-0 group-hover:opacity-100 transition duration-200 flex flex-col justify-end p-3">
                                            <div className="flex items-center justify-between text-white">
                                              <div className="min-w-0 pr-2">
                                                <p className="text-xs font-black truncate">{currentCover.name}</p>
                                                <p className="text-[10px] text-slate-300">
                                                  {formatFileSize(currentCover.size)} · Saved in Database
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewModalImage(currentCover);
                                                  }}
                                                  className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white text-white hover:text-slate-900 text-[11px] font-bold backdrop-blur-sm transition flex items-center gap-1"
                                                >
                                                  <Eye size={12} />
                                                  <span>Full View</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePreviewSinglePdf(currentCover);
                                                  }}
                                                  className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold shadow-xs transition flex items-center gap-1"
                                                >
                                                  <FileDown size={12} />
                                                  <span>PDF</span>
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="h-44 sm:h-52 w-full flex flex-col items-center justify-center bg-slate-100 text-slate-600 gap-2 p-4">
                                          <div className="h-14 w-14 rounded-2xl bg-white border border-slate-300 shadow-sm flex items-center justify-center text-emerald-600">
                                            <FileText size={32} />
                                          </div>
                                          <p className="text-xs font-black text-slate-800 text-center truncate max-w-xs">
                                            {currentCover.name}
                                          </p>
                                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            Document Verified in Database
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Multi-Picture Filmstrip Carousel */}
                                    {slot.allowMultiple && (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-0.5">
                                          <span className="flex items-center gap-1 text-slate-700">
                                            <Layers size={12} className="text-emerald-600" />
                                            <span>All Pages ({slotItems.length}): Click thumbnail to switch Cover Photo</span>
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setOrganizingSlotId(slot.id)}
                                            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-black hover:underline"
                                            title="Open large full-screen organizer to arrange pages and zoom high-res"
                                          >
                                            <Maximize2 size={11} />
                                            <span>Large Organizer</span>
                                          </button>
                                        </div>

                                        {/* Scrollable Filmstrip */}
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 px-0.5 scrollbar-thin">
                                          {slotItems.map((photo, pIdx) => {
                                            const isCurrentActive = photo.id === currentCover.id;
                                            const pageLabel = slot.id === "valid_id"
                                              ? (pIdx === 0 ? "Front" : pIdx === 1 ? "Back" : `#${pIdx + 1}`)
                                              : `Page ${pIdx + 1}`;

                                            return (
                                              <div
                                                key={photo.id}
                                                onClick={() => {
                                                  setActiveCoverSlotPhoto((prev) => ({ ...prev, [slot.id]: photo.id }));
                                                  setPreviewModalImage(photo);
                                                }}
                                                className={`relative group shrink-0 h-20 w-16 rounded-xl overflow-hidden cursor-pointer border-2 transition duration-200 select-none ${
                                                  isCurrentActive
                                                    ? "border-emerald-500 ring-2 ring-emerald-500/40 scale-105 shadow-md"
                                                    : "border-slate-200 hover:border-emerald-400 opacity-80 hover:opacity-100 hover:scale-102"
                                                }`}
                                                title={`Click to view ${pageLabel} (${photo.name})`}
                                              >
                                                {photo.dataUrl ? (
                                                  <img
                                                    src={photo.dataUrl}
                                                    alt={photo.name}
                                                    className="h-full w-full object-cover group-hover:scale-110 transition duration-300"
                                                    onError={(e) => {
                                                      if (photo.storagePath) {
                                                        e.target.src = `https://jiljeujvzlxptztmuaqy.supabase.co/storage/v1/object/public/requirements/${photo.storagePath}`;
                                                      }
                                                    }}
                                                  />
                                                ) : (
                                                  <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                                                    <FileText size={18} className="text-slate-400" />
                                                  </div>
                                                )}

                                                {/* Page Tag */}
                                                <div className="absolute bottom-0 inset-x-0 bg-slate-950/85 text-center py-0.5 text-[8.5px] font-black text-emerald-400 z-10">
                                                  {pageLabel}
                                                </div>

                                                {/* Hover Eye indicator */}
                                                <div className="absolute inset-0 bg-slate-950/45 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-white pointer-events-none">
                                                  <Eye size={16} className="drop-shadow-md text-emerald-300" />
                                                </div>
                                              </div>
                                            );
                                          })}

                                          {/* Add More Tile */}
                                          <label className="shrink-0 h-20 w-16 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/70 hover:border-emerald-500 flex flex-col items-center justify-center text-emerald-700 cursor-pointer transition gap-0.5">
                                            <input
                                              type="file"
                                              multiple
                                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                                              className="hidden"
                                              disabled={Boolean(uploadingSlotId)}
                                              onChange={(e) => handleSlotUpload(e, slot)}
                                            />
                                            <Plus size={16} />
                                            <span className="text-[9px] font-black">Add</span>
                                          </label>
                                        </div>
                                      </div>
                                    )}

                                    {/* Action Bar */}
                                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                                      <div className="flex flex-wrap items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handlePreviewSinglePdf(currentCover)}
                                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 font-bold flex items-center gap-1.5 transition text-[11px] shadow-2xs"
                                          title="Preview branded PDF"
                                        >
                                          <Eye size={12} className="text-emerald-600" />
                                          <span>Preview PDF</span>
                                        </button>

                                        {slot.allowMultiple ? (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => setOrganizingSlotId(slot.id)}
                                              className="px-2.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 font-extrabold flex items-center gap-1.5 transition text-[11px] shadow-2xs"
                                              title="Open large full-screen organizer to arrange pages and zoom high-res"
                                            >
                                              <Maximize2 size={12} className="text-emerald-700" />
                                              <span>Large Organizer</span>
                                            </button>
                                            <label
                                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 transition text-[11px] shadow-2xs cursor-pointer"
                                              title="Add more pictures to this category"
                                            >
                                              <input
                                                type="file"
                                                multiple
                                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                className="hidden"
                                                disabled={Boolean(uploadingSlotId)}
                                                onChange={(e) => handleSlotUpload(e, slot)}
                                              />
                                              <Plus size={12} className="text-emerald-600" />
                                              <span>Add Pages</span>
                                            </label>
                                          </>
                                        ) : (
                                          <label
                                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-800 font-bold flex items-center gap-1.5 transition text-[11px] shadow-2xs cursor-pointer"
                                            title="Replace file for this requirement slot"
                                          >
                                            <input
                                              type="file"
                                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                                              className="hidden"
                                              disabled={Boolean(uploadingSlotId)}
                                              onChange={(e) => handleSlotUpload(e, slot)}
                                            />
                                            <RefreshCw size={12} className={isUploading ? "animate-spin text-indigo-600" : "text-indigo-500"} />
                                            <span>Replace</span>
                                          </label>
                                        )}

                                        <a
                                          href={currentCover.dataUrl}
                                          download={currentCover.name}
                                          className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition"
                                          title="Download original file"
                                        >
                                          <Download size={13} />
                                        </a>
                                      </div>

                                      {/* Delete button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (slot.allowMultiple && slotItems.length > 1) {
                                            removeRequirementFile(currentCover.id, currentCover.storagePath);
                                          } else {
                                            slotItems.forEach((it) => removeRequirementFile(it.id, it.storagePath));
                                          }
                                        }}
                                        aria-label={`Delete ${slot.title}`}
                                        className="p-1.5 rounded-xl border border-transparent hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                                        title={slot.allowMultiple && slotItems.length > 1 ? `Delete active page (${currentCover.name})` : `Delete ${slot.title} from database`}
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            /* Empty Slot Upload Dropzone */
                            <label className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 py-7 px-3 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition group min-h-[160px]">
                              <input
                                type="file"
                                multiple={slot.allowMultiple}
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                className="hidden"
                                disabled={Boolean(uploadingSlotId)}
                                onChange={(e) => handleSlotUpload(e, slot)}
                              />
                              {isUploading ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 size={26} className="animate-spin text-emerald-600" />
                                  <span className="text-xs font-bold text-emerald-700">Uploading {slot.title}...</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-2">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700 group-hover:scale-110 transition duration-200 shadow-2xs">
                                    <Upload size={18} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-black text-slate-800 group-hover:text-emerald-800">
                                      Upload {slot.title}
                                    </p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {slot.allowMultiple ? "Select one or multiple pictures" : "PDF, JPG, PNG or WEBP"}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </label>
                          )}
                        </div>
                      );
                    })}
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

      {/* Large Page Organizer Modal for Multi-Page Categories (Agency Agreement, Valid ID, etc.) */}
      {organizingSlotId && (
        <PageOrganizerModal
          isOpen={Boolean(organizingSlotId)}
          onClose={() => setOrganizingSlotId(null)}
          slot={REGISTRATION_SLOTS.find((s) => s.id === organizingSlotId)}
          items={findRequirementsForSlot(uploadedRequirements, organizingSlotId)}
          agentName={name}
          onReorder={handleOrganizerReorder}
          onUploadMore={(e, slot) => handleSlotUpload(e, slot)}
          onDelete={removeRequirementFile}
          onRotateItem={handleRotateItem}
          onPreviewPdf={handlePreviewAllPdf}
        />
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
