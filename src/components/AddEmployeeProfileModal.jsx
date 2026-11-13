import { useState, useRef } from "react";
import {
  X, User, Mail, Building2, MapPin, Phone, ShieldCheck,
  Camera, Image as ImageIcon, Upload, FileText, CheckCircle2,
  AlertCircle, Sparkles, ShieldAlert, Trash2, Calendar,
  Briefcase, Heart, Plus, ExternalLink, RefreshCw
} from "lucide-react";

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
  onFileIncidentReport
}) {
  const [activeTab, setActiveTab] = useState("details"); // 'details' | 'requirements' | 'disciplinary'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
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
    tinNumber: ""
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

  // 201 File Requirements Upload Handler
  const handleRequirementsFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      // 10MB per file check
      if (file.size > 10 * 1024 * 1024) {
        setNotice({ type: "warning", message: `File ${file.name} exceeds 10MB limit.` });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const newFileItem = {
          id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          category: selectedReqCategory,
          dataUrl: event.target.result,
          uploadedAt: new Date().toISOString()
        };
        setRequirementsFiles((prev) => [newFileItem, ...prev]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveReqFile = (fileId) => {
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
      name: trimmedName,
      email: cleanEmail,
      company: formData.company || userEntityCompany,
      role: formData.role || "Team Member",
      branch: formData.branch || defaultBranchMap[formData.company] || "Branch Office",
      phone: formData.phone || "",
      is_approved: true,
      metadata: {
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
        created_at: new Date().toISOString()
      }
    };
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      setNotice({ type: "warning", message: "Please enter the employee's full name." });
      setActiveTab("details");
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      const record = buildProfileRecord();
      await onSave(record);
      onClose();
    } catch (err) {
      console.error("Error saving employee profile:", err);
      setNotice({ type: "warning", message: "Failed to save profile. Please check connection and try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save & File Incident Report Handler
  const handleSaveAndFileIR = async () => {
    if (!formData.name.trim()) {
      setNotice({ type: "warning", message: "Please enter employee name before creating an Incident Report." });
      setActiveTab("details");
      return;
    }

    setIsSubmitting(true);
    try {
      const record = buildProfileRecord();
      await onSave(record);
      onClose();

      // Trigger IR workflow
      if (typeof onFileIncidentReport === "function") {
        onFileIncidentReport(record);
      } else {
        localStorage.setItem("hrhub_incident_target_employee", JSON.stringify(record));
        window.dispatchEvent(new CustomEvent("hrhub_switch_workspace_tab", {
          detail: { tabId: "incident_reports", employee: record }
        }));
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* ============================================================ */}
        {/* 1. PROFESSIONAL COVER & AVATAR HEADER                         */}
        {/* ============================================================ */}
        <div className="relative">
          {/* Cover Banner */}
          <div
            className={`w-full h-32 sm:h-36 relative overflow-hidden transition-all duration-300 ${
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
                <span>Executive Employee Profiling</span>
              </span>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/50 hover:bg-rose-600 text-white/80 hover:text-white transition cursor-pointer shadow-md"
              >
                <X size={16} />
              </button>
            </div>

            {/* Cover Action Tools (Upload Custom or Reset) */}
            <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5 z-20">
              {customCoverUrl ? (
                <button
                  type="button"
                  onClick={() => setCustomCoverUrl(null)}
                  className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold transition flex items-center gap-1"
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

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
          </div>

          {/* Overlapping Avatar Profile Photo */}
          <div className="px-6 pb-2 relative flex items-end justify-between -mt-12 sm:-mt-14 z-30">
            <div className="relative group/avatar">
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

            {/* Default Cover Presets Selector Pills */}
            {!customCoverUrl && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-100/90 border border-slate-200/80 rounded-xl p-1 mb-2 shadow-2xs">
                {COVER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold transition ${
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
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. TAB NAVIGATION                                            */}
        {/* ============================================================ */}
        <div className="px-6 border-b border-slate-100 flex items-center justify-between gap-2 bg-white">
          <div className="flex items-center gap-2">
            {[
              { id: "details", label: "Details & Job Info", icon: User },
              { id: "requirements", label: `201 Files & IDs (${requirementsFiles.length})`, icon: FileText },
              { id: "disciplinary", label: "Conduct & Incident (IR)", icon: ShieldAlert }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
                    isActive
                      ? "border-emerald-600 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon size={14} className={isActive ? "text-emerald-600" : "text-slate-400"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
            Registered under <strong className="text-slate-700">{userEntityCompany}</strong>
          </span>
        </div>

        {/* Validation Notice Banner */}
        {notice && (
          <div className={`mx-6 mt-3 p-3 rounded-2xl text-xs flex items-center gap-2 border ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}>
            <AlertCircle size={14} className="shrink-0" />
            <span className="font-medium">{notice.message}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* 3. TAB CONTENTS                                              */}
        {/* ============================================================ */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          
          {/* TAB 1: DETAILS & EMPLOYMENT INFO */}
          {activeTab === "details" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition">
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

              {/* Company & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Company Entity</label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/90 px-3.5 py-2.5 text-xs text-slate-700 font-bold">
                    <Building2 size={14} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{formData.company}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Branch / Work Location *</label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {branches.map((br) => (
                      <option key={br} value={br}>{br}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Designation / Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Email & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Work Email</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus-within:border-emerald-500 focus-within:bg-white transition">
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
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus-within:border-emerald-500 focus-within:bg-white transition">
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
              </div>

              {/* Status & Date Hired */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Employment Status</label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {EMPLOYMENT_STATUSES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Date Hired</label>
                  <input
                    type="date"
                    value={formData.dateHired}
                    onChange={(e) => setFormData({ ...formData, dateHired: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 font-semibold focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Heart size={14} className="text-rose-500" />
                  <span>Emergency Contact Person</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={formData.emergencyName}
                    onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                    placeholder="Contact Name (e.g. Juan Santos)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={formData.emergencyPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                    placeholder="Emergency Phone (e.g. 0918-123-4567)"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 201 FILES & STATUTORY REQUIREMENTS */}
          {activeTab === "requirements" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Statutory Numbers */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" />
                  Philippine Statutory Government IDs
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">SSS Number</label>
                    <input
                      type="text"
                      value={formData.sssNumber}
                      onChange={(e) => setFormData({ ...formData, sssNumber: e.target.value })}
                      placeholder="e.g. 34-1234567-8"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">PhilHealth ID</label>
                    <input
                      type="text"
                      value={formData.philhealthNumber}
                      onChange={(e) => setFormData({ ...formData, philhealthNumber: e.target.value })}
                      placeholder="e.g. 12-345678901-2"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Pag-IBIG / HDMF</label>
                    <input
                      type="text"
                      value={formData.pagibigNumber}
                      onChange={(e) => setFormData({ ...formData, pagibigNumber: e.target.value })}
                      placeholder="e.g. 1234-5678-9012"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Tax ID (TIN)</label>
                    <input
                      type="text"
                      value={formData.tinNumber}
                      onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                      placeholder="e.g. 123-456-789-000"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 201 File Attachments Uploader */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-indigo-600" />
                    Attach 201 File Document Proofs
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Max 10MB per file</span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <select
                    value={selectedReqCategory}
                    onChange={(e) => setSelectedReqCategory(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 font-medium focus:border-emerald-500 focus:bg-white focus:outline-none"
                  >
                    {REQUIREMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0 transition"
                  >
                    <Upload size={13} />
                    <span>Upload Document</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleRequirementsFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Attached Files List */}
                {requirementsFiles.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {requirementsFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                            <FileText size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate text-[11px]">{file.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">
                              <span className="font-semibold text-emerald-700">{file.category}</span> • {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveReqFile(file.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-1 text-slate-400">
                    <FileText size={22} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-600">No 201 files attached yet</p>
                    <p className="text-[11px]">Upload Clearances, Contracts, IDs, or Member Data Records.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DISCIPLINARY & INCIDENT ACTIONS */}
          {activeTab === "disciplinary" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2">
                <div className="flex items-center gap-2 text-rose-900 font-black text-xs uppercase tracking-wider">
                  <ShieldAlert size={16} className="text-rose-600" />
                  <span>Disciplinary Action & Incident Report (IR)</span>
                </div>
                <p className="text-xs text-rose-800/90 leading-relaxed">
                  Need to document a station cash shortage, unexcused absence, policy violation, or behavioral incident for <strong>{formData.name || "this employee"}</strong>?
                </p>
                <p className="text-[11px] text-rose-700">
                  You can immediately save this profile and jump directly into creating an official Incident Report (IR) or Notice to Explain (NTE) under DOLE due process.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleSaveAndFileIR}
                    className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldAlert size={16} />
                    <span>Save Profile & File Incident Report (IR) Now &rarr;</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
                <h4 className="font-bold text-slate-800">DOLE Twin-Notice Due Process Compliance</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Filing an Incident Report automatically registers the case in the Central Incident Ledger, preparing the formal Notice to Explain (NTE) with a mandatory 5-day defense window.
                </p>
              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== "disciplinary" && (
                <button
                  type="button"
                  onClick={handleSaveAndFileIR}
                  className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  title="Save profile and jump directly to file an Incident Report"
                >
                  <ShieldAlert size={13} />
                  <span className="hidden sm:inline">Save &amp; File IR</span>
                </button>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Save Employee Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
