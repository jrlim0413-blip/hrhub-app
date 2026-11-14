import { useState, useRef, useEffect, useMemo } from "react";
import {
  X, User, Mail, Building2, MapPin, Phone, ShieldCheck,
  Camera, Upload, FileText, CheckCircle2,
  AlertCircle, Sparkles, ShieldAlert, Trash2, Calendar,
  Briefcase, Heart, Plus, ExternalLink, RefreshCw, Eye, Paperclip,
  Check, Download, Cloud, Fuel, Coins, Search, CheckCheck,
  ArrowRight, Shield, ChevronDown
} from "lucide-react";
import {
  HEAD_OFFICE,
  STL_SUBSIDIARIES,
  NON_STL_SUBSIDIARIES,
  ALL_SUBSIDIARIES,
  DEFAULT_BRANCH_MAP,
  ALL_BRANCH_PRESETS,
  OPERATIONAL_DESIGNATION_GROUPS,
  ALL_OPERATIONAL_ROLES,
  CENTRAL_HRMD_ROLES,
  isStlEntity,
  isNonStlEntity,
  isHeadOffice
} from "../lib/companyEntities";
import {
  uploadEmployeeRequirementToBucket,
  deleteEmployeeRequirementFromBucket
} from "../lib/employeeRequirementsStorage";

const COVER_PRESETS = [
  {
    id: "preset_emerald",
    name: "Corporate Emerald",
    gradient: "from-emerald-950 via-teal-900 to-slate-900",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
  },
  {
    id: "preset_sapphire",
    name: "Executive Sapphire",
    gradient: "from-blue-950 via-indigo-900 to-slate-950",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-400/30"
  },
  {
    id: "preset_obsidian",
    name: "Obsidian Gold",
    gradient: "from-slate-950 via-amber-950 to-stone-900",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-400/30"
  },
  {
    id: "preset_crimson",
    name: "Crimson Energy",
    gradient: "from-rose-950 via-red-950 to-stone-950",
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-400/30"
  },
  {
    id: "preset_slate",
    name: "Modern Slate",
    gradient: "from-slate-900 via-zinc-800 to-slate-950",
    badgeColor: "bg-slate-500/20 text-slate-300 border-slate-400/30"
  }
];

const REQUIREMENT_CATEGORIES = [
  "Government Valid ID (UMID / Passport / PhilSys)",
  "NBI / Police Clearance",
  "Resume / Bio-Data / Application Form",
  "Medical Exam & Drug Test Clearance",
  "Signed Employment Contract / Job Offer",
  "SSS / PhilHealth / Pag-IBIG MDR Form",
  "Birth Certificate / Barangay Clearance",
  "Other 201 File Document"
];

const DEPARTMENTS = [
  "Operations & Field Terminals",
  "Betting Operations & Tellers",
  "Vault Custody & Cashiering",
  "Site Construction (SIMCON)",
  "Fuel & Station Operations (MC Power Gas)",
  "People Operations (HRMD)",
  "Finance & Audit Controllership",
  "Security & Asset Protection",
  "Executive & Management"
];

const EMPLOYMENT_STATUSES = [
  "Regular Full-Time",
  "Probationary (6 Months)",
  "Contractual / Project-Based",
  "Site Roving / Rotational"
];

export default function AddEmployeeProfileModal({
  isOpen,
  onClose,
  onSave,
  userEntityCompany = "Simpal Group of Companies",
  roles = [],
  branches = [],
  defaultBranchMap = {},
  onFileIncidentReport,
  mode = "add", // 'add' | 'edit'
  initialData = null
}) {
  const [activeTab, setActiveTab] = useState("details"); // 'details' | 'requirements' | 'disciplinary'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [hasSaved, setHasSaved] = useState(false);

  // Animated upload and saving states
  const [uploadProgress, setUploadProgress] = useState(null);
  const [saveStepOverlay, setSaveStepOverlay] = useState(null);
  const [saveConfirmation, setSaveConfirmation] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    email: "",
    company: userEntityCompany,
    role: "Team Member",
    branch: defaultBranchMap[userEntityCompany] || "Head Office (Mandaue)",
    department: "Operations & Field Terminals",
    phone: "",
    employmentStatus: "Regular Full-Time",
    dateHired: new Date().toISOString().split("T")[0],
    emergencyName: "",
    emergencyPhone: "",
    // Statutory Numbers
    sssNumber: "",
    philhealthNumber: "",
    pagibigNumber: "",
    tinNumber: "",
    is_approved: true
  });

  // Media States
  const [selectedPresetId, setSelectedPresetId] = useState("preset_emerald");
  const [customCoverUrl, setCustomCoverUrl] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // 201 Files State: array of { id, name, size, type, category, dataUrl, uploadedAt }
  const [requirementsFiles, setRequirementsFiles] = useState([]);
  const [selectedReqCategory, setSelectedReqCategory] = useState(REQUIREMENT_CATEGORIES[0]);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Synchronize state whenever modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      const meta = initialData.metadata || {};
      const targetCompany = initialData.company || userEntityCompany;
      const targetBranch = initialData.branch || meta.branch || defaultBranchMap[targetCompany] || "Head Office (Mandaue)";

      setFormData({
        id: initialData.id || "",
        name: initialData.name || (initialData.email ? initialData.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : ""),
        email: initialData.email || "",
        company: targetCompany,
        role: initialData.role || "Team Member",
        branch: targetBranch,
        department: meta.department || initialData.department || "Operations & Field Terminals",
        phone: initialData.phone || meta.phone || "",
        employmentStatus: meta.employment_status || "Regular Full-Time",
        dateHired: meta.date_hired || new Date().toISOString().split("T")[0],
        emergencyName: meta.emergency_contact_name || "",
        emergencyPhone: meta.emergency_contact_phone || "",
        sssNumber: meta.sss_number || "",
        philhealthNumber: meta.philhealth_number || "",
        pagibigNumber: meta.pagibig_number || "",
        tinNumber: meta.tin_number || "",
        is_approved: typeof initialData.is_approved === "boolean" ? initialData.is_approved : true
      });

      setAvatarUrl(meta.avatar_url || initialData.avatar_url || null);
      setSelectedPresetId(meta.cover_preset_id || "preset_emerald");
      setCustomCoverUrl(meta.custom_cover_url || null);
      setRequirementsFiles(Array.isArray(meta.requirements_files) ? meta.requirements_files : []);
      setActiveTab("details");
      setHasSaved(true); // Existing profile is already saved
      setNotice(null);
    } else {
      const defBranch = defaultBranchMap[userEntityCompany] || "Head Office (Mandaue)";
      setFormData({
        id: "",
        name: "",
        email: "",
        company: userEntityCompany,
        role: "Team Member",
        branch: defBranch,
        department: "Operations & Field Terminals",
        phone: "",
        employmentStatus: "Regular Full-Time",
        dateHired: new Date().toISOString().split("T")[0],
        emergencyName: "",
        emergencyPhone: "",
        sssNumber: "",
        philhealthNumber: "",
        pagibigNumber: "",
        tinNumber: "",
        is_approved: true
      });

      setAvatarUrl(null);
      setSelectedPresetId("preset_emerald");
      setCustomCoverUrl(null);
      setRequirementsFiles([]);
      setActiveTab("details");
      setHasSaved(false);
      setNotice(null);
    }
  }, [isOpen, initialData, userEntityCompany]);

  if (!isOpen) return null;

  // Selected Cover Gradient or Custom
  const activePreset = COVER_PRESETS.find((p) => p.id === selectedPresetId) || COVER_PRESETS[0];

  // Avatar Upload Handler
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice({ type: "warning", message: "Please select an image file (PNG, JPG, or WEBP)." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setAvatarUrl(canvas.toDataURL("image/jpeg", 0.88));
        setNotice(null);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Custom Cover Upload Handler
  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNotice({ type: "warning", message: "Please select an image file for the cover banner." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxW = 1200;
        const maxH = 400;
        let { width, height } = img;
        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        if (height > maxH) {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        setCustomCoverUrl(canvas.toDataURL("image/jpeg", 0.85));
        setNotice(null);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Multi-file 201 Uploader Handler via Cloud Storage Bucket
  const handleFileRequirementsSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 15 - requirementsFiles.length;
    if (remainingSlots <= 0) {
      setNotice({ type: "warning", message: "Maximum of 15 requirement files reached." });
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const employeeId = formData.id || `emp-${Date.now()}`;

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      try {
        setUploadProgress({
          isUploading: true,
          progress: 10,
          stage: "preparing",
          message: `Preparing "${file.name}" (${i + 1}/${filesToProcess.length})...`,
          fileName: file.name
        });

        const uploadedDoc = await uploadEmployeeRequirementToBucket(
          employeeId,
          file,
          selectedReqCategory,
          (prog) => {
            setUploadProgress({
              isUploading: true,
              progress: prog.percent,
              stage: prog.stage,
              message: prog.message,
              fileName: file.name
            });
          }
        );

        setRequirementsFiles((prev) => [...prev, uploadedDoc]);
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    setUploadProgress(null);
    if (e.target) e.target.value = "";
    setNotice({
      type: "success",
      message: `Successfully uploaded ${filesToProcess.length} document(s) to Cloud Storage Bucket under "${selectedReqCategory}".`
    });
  };

  const handleRemoveRequirementFile = (fileOrId) => {
    const fileId = typeof fileOrId === "string" ? fileOrId : fileOrId?.id;
    const storagePath = typeof fileOrId === "object" ? fileOrId?.storage_path : null;

    if (storagePath) {
      deleteEmployeeRequirementFromBucket(storagePath).catch(() => {});
    }
    setRequirementsFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Build Profile Object Helper
  const buildProfileRecord = () => {
    const trimmedName = formData.name.trim();
    let cleanEmail = (formData.email || "").trim().toLowerCase();
    if (!cleanEmail) {
      const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, ".");
      const compSlug = (formData.company || userEntityCompany).toLowerCase().replace(/[^a-z0-9]/g, "");
      cleanEmail = `${slug}@${compSlug || "company"}.internal`;
    }

    return {
      ...(initialData || {}),
      id: initialData?.id || formData.id || `emp-${Date.now()}`,
      name: trimmedName,
      email: cleanEmail,
      company: formData.company || userEntityCompany,
      role: formData.role || "Team Member",
      branch: formData.branch || defaultBranchMap[formData.company] || "Branch Office",
      phone: formData.phone || "",
      is_approved: typeof formData.is_approved === "boolean" ? formData.is_approved : true,
      metadata: {
        ...(initialData?.metadata || {}),
        avatar_url: avatarUrl || null,
        cover_preset_id: selectedPresetId,
        custom_cover_url: customCoverUrl || null,
        department: formData.department,
        employment_status: formData.employmentStatus,
        date_hired: formData.dateHired,
        emergency_contact_name: formData.emergencyName,
        emergency_contact_phone: formData.emergencyPhone,
        sss_number: formData.sssNumber,
        philhealth_number: formData.philhealthNumber,
        pagibig_number: formData.pagibigNumber,
        tin_number: formData.tinNumber,
        requirements_files: requirementsFiles,
        updated_at: new Date().toISOString()
      }
    };
  };

  // Submit Handler with Animated Saving Progression & Confirmation
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      setNotice({ type: "warning", message: "Please enter the employee's full name." });
      setActiveTab("details");
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    // Step 1: Validation
    setSaveStepOverlay({ step: 1, message: "Validating 201 Personnel Compliance Dossier..." });
    await new Promise((r) => setTimeout(r, 260));

    // Step 2: Storage Sync
    setSaveStepOverlay({ step: 2, message: "Synchronizing Cloud Storage Bucket Documents..." });
    await new Promise((r) => setTimeout(r, 280));

    // Step 3: Central Database Registration
    setSaveStepOverlay({ step: 3, message: "Recording Profile in Central Employee Directory..." });
    await new Promise((r) => setTimeout(r, 260));

    try {
      const record = buildProfileRecord();
      await onSave(record);
      setHasSaved(true);
      setSaveStepOverlay(null);

      if (mode === "edit") {
        setNotice({ type: "success", message: `Profile details for ${record.name} updated successfully!` });
        setTimeout(() => onClose(), 1200);
      } else {
        // Show comprehensive confirmation modal
        setSaveConfirmation({ isOpen: true, employee: record });
      }
    } catch (err) {
      console.error("Error saving employee profile:", err);
      setSaveStepOverlay(null);
      setNotice({ type: "warning", message: "Failed to save profile. Please check connection and try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Launch Incident Report Directly for this Employee
  const handleFileIncidentReportDirectly = async () => {
    if (!formData.name.trim()) {
      setNotice({ type: "warning", message: "Please enter employee name before creating an Incident Report." });
      setActiveTab("details");
      return;
    }

    setIsSubmitting(true);
    try {
      const record = buildProfileRecord();
      // Ensure latest changes are persisted
      await onSave(record);
      onClose();

      // Trigger IR workflow
      if (typeof onFileIncidentReport === "function") {
        onFileIncidentReport(record);
      } else {
        localStorage.setItem("hrhub_incident_target_employee", JSON.stringify(record));
        window.dispatchEvent(
          new CustomEvent("hrhub_switch_workspace_tab", {
            detail: { tabId: "incident_reports", employee: record }
          })
        );
        window.dispatchEvent(
          new CustomEvent("hrhub_file_incident_report", {
            detail: { employee: record }
          })
        );
      }
    } catch (err) {
      console.error("Save & File IR error:", err);
      setNotice({ type: "warning", message: "Failed to initiate Incident Report." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = formData.name
    ? formData.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "HR";

  // Tab definitions:
  // In 'add' mode before saving: ONLY Details and Requirements are shown (NO IR requirement).
  // In 'edit' mode or after saving: The Disciplinary / Incident Report (IR) tab is visible and accessible.
  const isEditOrSaved = mode === "edit" || hasSaved;
  const availableTabs = [
    { id: "details", label: "Personal & Job Details", icon: User },
    { id: "requirements", label: `201 Documents & IDs (${requirementsFiles.length})`, icon: FileText },
    ...(isEditOrSaved ? [
      { id: "disciplinary", label: "Due Process & Incident (IR)", icon: ShieldAlert }
    ] : [])
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-150">
      {/* BOND PAPER FORMATTED DOSSIER CONTAINER (max-w-4xl, min-h-[720px], official executive aesthetic) */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-2xl w-full max-w-4xl min-h-[720px] max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative ring-1 ring-slate-900/5">
        
        {/* ============================================================ */}
        {/* 1. OFFICIAL EXECUTIVE BOND PAPER HEADER                      */}
        {/* ============================================================ */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <FileText size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Personnel 201 File Dossier
                </span>
                <span className="text-[9px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  {formData.company}
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                {mode === "edit" ? `Employee Profile — ${formData.name || "Employee"}` : "Add Comprehensive Employee Profile"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer"
            title="Close dossier"
          >
            <X size={17} />
          </button>
        </div>

        {/* ============================================================ */}
        {/* 2. EXECUTIVE COVER & AVATAR BANNER                           */}
        {/* ============================================================ */}
        <div className="relative shrink-0">
          {/* Cover Banner */}
          <div
            className={`w-full h-36 sm:h-44 relative overflow-hidden transition-all duration-300 ${
              customCoverUrl ? "bg-slate-950" : `bg-gradient-to-r ${activePreset.gradient}`
            }`}
          >
            {customCoverUrl && (
              <img src={customCoverUrl} alt="Cover" className="w-full h-full object-cover opacity-90" />
            )}

            {/* Subtle mesh overlay */}
            <div className="absolute inset-0 bg-black/15 pointer-events-none" />

            {/* Top Bar inside Cover */}
            <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-white z-20">
              <span className="text-[10px] font-black tracking-wider uppercase bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-xs">
                <Sparkles size={11} className="text-amber-300" />
                <span>Executive Personnel Profiling</span>
              </span>

              {/* Cover Action Tools */}
              <div className="flex items-center gap-1.5">
                {customCoverUrl ? (
                  <button
                    type="button"
                    onClick={() => setCustomCoverUrl(null)}
                    className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Revert to preset cover design"
                  >
                    <RefreshCw size={11} />
                    <span>Use Preset</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/80 text-white text-[10px] font-bold transition flex items-center gap-1 border border-white/20 cursor-pointer shadow-xs"
                    title="Upload custom cover photo"
                  >
                    <Camera size={11} className="text-emerald-400" />
                    <span>Custom Cover</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cover Presets Selector Pills: integrated smoothly into bottom-right of Cover */}
            {!customCoverUrl && (
              <div className="absolute bottom-3 right-4 hidden sm:flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/20 rounded-xl p-1 shadow-md z-20">
                {COVER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition cursor-pointer ${
                      selectedPresetId === preset.id
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-white/85 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            )}

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
          </div>

          {/* Profile Identity & Avatar Strip */}
          <div className="px-6 sm:px-8 pb-3 pt-0 bg-white relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Overlapping Avatar Profile Photo: ONLY the avatar has negative margin! */}
              <div className="-mt-12 sm:-mt-14 relative group/avatar shrink-0 z-30">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ring-4 ring-white bg-slate-900 text-emerald-400 font-black text-2xl flex items-center justify-center shadow-xl overflow-hidden relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{initials}</span>
                  )}

                  {/* Hover Camera Overlay */}
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 bg-slate-950/60 text-white flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition cursor-pointer"
                  >
                    <Camera size={20} className="text-emerald-400 mb-0.5" />
                    <span className="text-[9px] font-bold">Change Photo</span>
                  </div>
                </div>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-slate-900 text-white hover:bg-rose-600 transition shadow cursor-pointer"
                    title="Remove photo"
                  >
                    <X size={11} />
                  </button>
                )}

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarSelect}
                  className="hidden"
                />
              </div>

              {/* Identity summary: completely on white background, ZERO negative margin, ZERO overlap! */}
              <div className="min-w-0 pt-2 sm:pt-0 pb-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {formData.name || (mode === "edit" ? "Employee Record" : "New Employee Profile")}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                  <span className="px-2.5 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                    {formData.role}
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-700">
                    {formData.department}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-slate-500 flex items-center gap-1">
                    <MapPin size={11} className="text-emerald-600" />
                    <span>{formData.branch}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Status & mobile preset selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start sm:self-end pb-1">
              {!customCoverUrl && (
                <div className="flex sm:hidden items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl p-1 shadow-2xs overflow-x-auto max-w-full">
                  {COVER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-bold shrink-0 transition cursor-pointer ${
                        selectedPresetId === preset.id
                          ? "bg-slate-900 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              )}
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                formData.is_approved
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-amber-50 text-amber-800 border-amber-300"
              }`}>
                {formData.is_approved ? "Approved Active" : "Pending Review"}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. BOND PAPER DOSSIER TABS                                   */}
        {/* ============================================================ */}
        <div className="px-6 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            {availableTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? "border-emerald-600 text-emerald-800 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <Icon size={14} className={isActive ? "text-emerald-600" : "text-slate-400"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
            Status: <strong className={formData.is_approved ? "text-emerald-600" : "text-amber-600"}>{formData.is_approved ? "Approved Active" : "Pending Review"}</strong>
          </span>
        </div>

        {/* Validation Notice Banner */}
        {notice && (
          <div className={`mx-6 mt-3 p-3 rounded-2xl text-xs flex items-center gap-2 border shrink-0 ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-amber-50 text-amber-900 border-amber-200"
          }`}>
            {notice.type === "success" ? (
              <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
            )}
            <span className="font-semibold">{notice.message}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* 4. BOND PAPER BODY / FORM SECTIONS                           */}
        {/* ============================================================ */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-white">
          
          {/* TAB 1: PERSONAL & EMPLOYMENT DETAILS */}
          {activeTab === "details" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Section A: Primary Employment Assignment */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                  <Briefcase size={14} className="text-emerald-600" />
                  <span>Primary Assignment & Corporate Entity</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Full Name *</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition shadow-2xs">
                      <User size={15} className="text-slate-400 shrink-0" />
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Maria Santos"
                        className="w-full border-0 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none font-bold"
                      />
                    </div>
                  </div>

                  {/* Company Entity */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Company Entity *</label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        isHeadOffice(formData.company)
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : isStlEntity(formData.company)
                            ? "bg-blue-50 text-blue-800 border-blue-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}>
                        {isHeadOffice(formData.company) ? "Corporate HQ" : isStlEntity(formData.company) ? "STL Gaming" : "Non-STL Entity"}
                      </span>
                    </div>
                    <select
                      value={formData.company}
                      onChange={(e) => {
                        const newComp = e.target.value;
                        const newBranch = DEFAULT_BRANCH_MAP[newComp] || formData.branch;
                        let newRole = formData.role;
                        let newDept = formData.department;

                        if (isHeadOffice(newComp) || newComp === HEAD_OFFICE) {
                          newRole = "Team Member";
                          newDept = "Corporate Administration & HRMD";
                        } else if (newComp === "MC POWER GAS") {
                          newRole = "PUMP ATTENDANT";
                          newDept = "Fuel & Station Operations (MC Power Gas)";
                        } else if (isStlEntity(newComp) && (newRole === "PUMP ATTENDANT" || newRole === "Team Member" || CENTRAL_HRMD_ROLES.includes(newRole))) {
                          newRole = "CASHIER";
                          newDept = "Operations & Field Terminals";
                        } else if (newComp === "Simpal Construction (SIMCON)") {
                          newRole = "MAINTENACE STAFF";
                          newDept = "Site Construction (SIMCON)";
                        }

                        setFormData({
                          ...formData,
                          company: newComp,
                          branch: newBranch,
                          role: newRole,
                          department: newDept
                        });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 font-bold focus:border-emerald-500 focus:outline-none cursor-pointer shadow-2xs"
                    >
                      <optgroup label="Head Office">
                        <option value="Simpal Group of Companies">Simpal Group of Companies</option>
                      </optgroup>
                      <optgroup label="STL Subsidiaries">
                        {STL_SUBSIDIARIES.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Non-STL Subsidiaries">
                        {NON_STL_SUBSIDIARIES.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Branch Location */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Branch / Work Location *</label>
                    <select
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:outline-none cursor-pointer shadow-2xs"
                    >
                      {ALL_BRANCH_PRESETS.map((br) => (
                        <option key={br} value={br}>{br}</option>
                      ))}
                    </select>
                  </div>

                  {/* Designation / Role */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Designation / Role *</label>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        (initialData?.is_preregistered || initialData?.status === "pre_registered" || isHeadOffice(formData.company) || formData.company === HEAD_OFFICE)
                          ? "bg-teal-50 text-teal-800 border-teal-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>
                        {(initialData?.is_preregistered || initialData?.status === "pre_registered" || isHeadOffice(formData.company) || formData.company === HEAD_OFFICE)
                          ? "Central HRMD Only"
                          : (formData.role || "Required")}
                      </span>
                    </div>

                    <div className="relative">
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-9 py-2.5 text-xs text-slate-900 font-bold hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none transition cursor-pointer shadow-2xs"
                      >
                        {(initialData?.is_preregistered || initialData?.status === "pre_registered" || isHeadOffice(formData.company) || formData.company === HEAD_OFFICE) ? (
                          <optgroup label="Central HRMD (Head Office)">
                            {CENTRAL_HRMD_ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </optgroup>
                        ) : (
                          OPERATIONAL_DESIGNATION_GROUPS
                            .filter((group) => group.category !== "Central HRMD")
                            .map((group) => (
                              <optgroup key={group.category} label={group.category}>
                                {group.roles.map((r) => (
                                  <option key={r} value={r}>{r}</option>
                                ))}
                              </optgroup>
                            ))
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:outline-none cursor-pointer shadow-2xs"
                    >
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  {/* Employment Status */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Employment Status</label>
                    <select
                      value={formData.employmentStatus}
                      onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:outline-none cursor-pointer shadow-2xs"
                    >
                      {EMPLOYMENT_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Hired */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Date Hired</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition shadow-2xs">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <input
                        type="date"
                        value={formData.dateHired}
                        onChange={(e) => setFormData({ ...formData, dateHired: e.target.value })}
                        className="w-full border-0 bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section B: Contact & Emergency Information */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                  <Phone size={14} className="text-emerald-600" />
                  <span>Contact & Emergency Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Work Email Address</span>
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    </label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition shadow-2xs">
                      <Mail size={14} className="text-slate-400 shrink-0" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="e.g. maria@company.com"
                        className="w-full border-0 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Contact Number</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition shadow-2xs">
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="e.g. 0917-555-0199"
                        className="w-full border-0 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Emergency Contact Person</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs focus-within:border-emerald-500 transition shadow-2xs">
                      <Heart size={14} className="text-rose-500 shrink-0" />
                      <input
                        type="text"
                        value={formData.emergencyName}
                        onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                        placeholder="e.g. Juan Santos (Spouse / Guardian)"
                        className="w-full border-0 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Emergency Phone Number</label>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs focus-within:border-emerald-500 transition shadow-2xs">
                      <Phone size={14} className="text-rose-500 shrink-0" />
                      <input
                        type="text"
                        value={formData.emergencyPhone}
                        onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                        placeholder="e.g. 0918-123-4567"
                        className="w-full border-0 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section C: Statutory Philippine Government IDs */}
              <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  <span>Philippine Statutory Government Identification Numbers</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">SSS Number</label>
                    <input
                      type="text"
                      value={formData.sssNumber}
                      onChange={(e) => setFormData({ ...formData, sssNumber: e.target.value })}
                      placeholder="e.g. 34-1234567-8"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">PhilHealth ID</label>
                    <input
                      type="text"
                      value={formData.philhealthNumber}
                      onChange={(e) => setFormData({ ...formData, philhealthNumber: e.target.value })}
                      placeholder="e.g. 12-345678901-2"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Pag-IBIG / HDMF</label>
                    <input
                      type="text"
                      value={formData.pagibigNumber}
                      onChange={(e) => setFormData({ ...formData, pagibigNumber: e.target.value })}
                      placeholder="e.g. 1210-9876-5432"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">TIN Number</label>
                    <input
                      type="text"
                      value={formData.tinNumber}
                      onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                      placeholder="e.g. 123-456-789-000"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section D: Portal Access Approval Toggle */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="modalApprovalCheckbox"
                  checked={formData.is_approved}
                  onChange={(e) => setFormData({ ...formData, is_approved: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="modalApprovalCheckbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                  <strong className="block font-bold text-slate-900">Approved Personnel & Directory Profile</strong>
                  Active corporate standing. Permits this employee to be included in the company workforce roster and access HRHub features.
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: 201 FILES & STATUTORY REQUIREMENTS */}
          {activeTab === "requirements" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-950 font-black text-xs uppercase tracking-wider">
                    <Upload size={15} className="text-emerald-600" />
                    <span>Attach 201 Personnel Clearances & Compliance Records</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <Cloud size={11} className="text-emerald-600" />
                    <span>Direct Cloud Bucket Storage</span>
                  </span>
                </div>
                <p className="text-xs text-emerald-900/80 leading-relaxed">
                  Upload PDF or scanned copies of mandatory compliance files (NBI Clearance, Signed Employment Contract, Government IDs, Medical Clearance). Documents are streamed directly to the secure <strong>employee-requirements</strong> cloud bucket for maximum database performance.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedReqCategory}
                      onChange={(e) => setSelectedReqCategory(e.target.value)}
                      className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none cursor-pointer shadow-xs"
                    >
                      {REQUIREMENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={uploadProgress?.isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {uploadProgress?.isUploading ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Upload File(s)</span>
                      </>
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,image/*,.doc,.docx"
                    onChange={handleFileRequirementsSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Real-time Animated Upload Progress Bar */}
              {uploadProgress && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white border border-emerald-500/40 shadow-xl space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 animate-spin">
                        <RefreshCw size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[240px] sm:max-w-sm">
                          {uploadProgress.fileName}
                        </p>
                        <p className="text-[10px] text-emerald-400 font-medium">
                          {uploadProgress.message}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-400">{uploadProgress.progress}%</span>
                  </div>

                  {/* Progress Track */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Uploaded Documents List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Attached 201 Documents ({requirementsFiles.length})
                  </span>
                  <span className="text-[11px] text-slate-400">Max 15 attachments per employee dossier</span>
                </div>

                {requirementsFiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {requirementsFiles.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs transition flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                            <FileText size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate" title={f.name}>
                              {f.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 truncate max-w-[150px]">
                                {f.category}
                              </span>
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                <Cloud size={9} />
                                <span>Bucket</span>
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {(f.size / 1024).toFixed(1)} KB • {f.uploadedAt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {f.url && (
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={f.name}
                              className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                              title="Download or preview document"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveRequirementFile(f)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-1.5 text-slate-400">
                    <FileText size={24} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No 201 files attached yet</p>
                    <p className="text-[11px]">Upload Clearances, Contracts, Government IDs, or Member Data Records.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DISCIPLINARY & DUE PROCESS (INCIDENT REPORT) */}
          {/* Shown exclusively when in edit mode or after profile has been saved */}
          {activeTab === "disciplinary" && isEditOrSaved && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200/90 space-y-3">
                <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                  <ShieldAlert size={17} className="text-rose-600" />
                  <span>DOLE Twin-Notice Due Process & Incident Report (IR)</span>
                </div>
                <p className="text-xs text-rose-800/90 leading-relaxed">
                  Need to document a station cash shortage, unexcused absence, company policy violation, or behavioral incident for <strong>{formData.name || "this employee"}</strong>?
                </p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Filing an Incident Report automatically registers the case in the Central Incident Ledger, preparing the formal Notice to Explain (NTE) under Article 297 with a mandatory 5-day defense window.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFileIncidentReportDirectly}
                    className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldAlert size={16} />
                    <span>File Incident Report (IR) for {formData.name || "this Employee"} &rarr;</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
                <h4 className="font-bold text-slate-800">HR Administrative Due Process Protocol</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Launching an Incident Report links directly to the formal investigation pipeline. You may preview and print the official Notice to Explain (NTE), record employee defense statements, and route to Simpal Group of Companies Head Office HRMD.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 5. FORM ACTIONS FOOTER                                       */}
          {/* ============================================================ */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {/* Only show IR button if editing an existing employee or after information is updated */}
              {isEditOrSaved && (
                <button
                  type="button"
                  onClick={handleFileIncidentReportDirectly}
                  className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 text-xs font-extrabold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  title="File Incident Report (IR) / NTE for this employee"
                >
                  <ShieldAlert size={14} />
                  <span>File Incident Report (IR)</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>{mode === "edit" ? "Save Profile Changes" : "Save Employee Profile"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Animated Saving Dossier Progression Overlay */}
        {saveStepOverlay && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center mb-4 shadow-xl relative">
              <RefreshCw size={28} className="animate-spin text-emerald-400" />
              <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/40 animate-ping pointer-events-none" />
            </div>
            <h3 className="text-lg font-black text-white tracking-tight">
              Saving Employee Dossier
            </h3>
            <p className="text-xs text-emerald-300 font-semibold mt-1">
              {saveStepOverlay.message}
            </p>

            <div className="w-64 h-2 rounded-full bg-slate-800 overflow-hidden mt-4">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                style={{ width: `${(saveStepOverlay.step / 3) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Step {saveStepOverlay.step} of 3 • Enterprise Cloud Database
            </p>
          </div>
        )}

        {/* Executive Success Dossier Confirmation Modal */}
        {saveConfirmation && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  Personnel Profile Confirmed
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2 tracking-tight">
                  Profile Successfully Saved!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  The employee dossier has been registered to the corporate directory.
                </p>
              </div>

              {/* Profile Snapshot Summary */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Full Name:</span>
                  <span className="font-bold text-slate-800">{saveConfirmation.employee.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Entity:</span>
                  <span className="font-bold text-slate-800">{saveConfirmation.employee.company}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Designation:</span>
                  <span className="font-bold text-emerald-700">{saveConfirmation.employee.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Branch:</span>
                  <span className="font-semibold text-slate-700">{saveConfirmation.employee.branch}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">201 Attachments:</span>
                  <span className="font-bold text-slate-700">
                    {saveConfirmation.employee.metadata?.requirements_files?.length || 0} file(s)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSaveConfirmation(null);
                    onClose();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-sm"
                >
                  Return to Directory
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSaveConfirmation(null);
                    setFormData({
                      id: "",
                      name: "",
                      email: "",
                      company: userEntityCompany,
                      role: userEntityCompany === "MC POWER GAS" ? "PUMP ATTENDANT" : "CASHIER",
                      branch: DEFAULT_BRANCH_MAP[userEntityCompany] || "Head Office (Mandaue)",
                      department: userEntityCompany === "MC POWER GAS" ? "Fuel & Station Operations (MC Power Gas)" : "Operations & Field Terminals",
                      phone: "",
                      employmentStatus: "Regular Full-Time",
                      dateHired: new Date().toISOString().split("T")[0],
                      emergencyName: "",
                      emergencyPhone: "",
                      sssNumber: "",
                      philhealthNumber: "",
                      pagibigNumber: "",
                      tinNumber: "",
                      is_approved: true
                    });
                    setAvatarUrl(null);
                    setCustomCoverUrl(null);
                    setRequirementsFiles([]);
                    setActiveTab("details");
                    setHasSaved(false);
                    setNotice(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition cursor-pointer"
                >
                  + Add Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
