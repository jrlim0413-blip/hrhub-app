import { useState, useMemo, useEffect } from "react";
import {
  Users, Search, ShieldCheck, CheckCircle2, Clock,
  RefreshCw, UserPlus, Mail, Building2, Briefcase,
  Copy, Check, Filter, Trash2, ShieldAlert,
  Sparkles, X, ChevronDown, Edit3, MapPin, UserCheck,
  Phone, UserCog, CheckSquare, Layers, Sliders,
  LayoutGrid, List, User
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  saveStoredEmployee,
  updateStoredEmployeeApproval,
  deleteStoredEmployee
} from "../lib/employeeStorage";
import {
  isUserFeatureAllowed,
  isUserTabAllowed,
  getRbacMatrixData
} from "../lib/rbacStorage";

const SUBSIDIARIES = [
  "Simpal Group of Companies",
  "Simpal Construction (SIMCON)",
  "Lucky Betplay Corporation",
  "5A Royal Gaming OPC",
  "Glowing Fortune",
  "Imperial Gaming OPC"
];

const ROLES = [
  "HR Administrator",
  "HR Manager",
  "HR Admin I",
  "HR Admin II",
  "HR Admin III",
  "HR Admin IV",
  "HR Admin V",
  "HR Admin VI",
  "HR-Onsite",
  "Site Supervisor",
  "Team Member"
];

const BRANCH_PRESETS = [
  "Head Office (Mandaue)",
  "Mandaue City, Cebu",
  "Maguindanao Branch",
  "Cotabato City Branch",
  "Iligan City Branch",
  "Baloi, Lanao Branch",
  "Lanao del Norte Branch",
  "SIMCON Field Site (Cebu)",
  "Regional Draw & Operations"
];

const DEFAULT_BRANCH_MAP = {
  "Simpal Group of Companies": "Head Office (Mandaue)",
  "Simpal Construction (SIMCON)": "SIMCON Field Site (Cebu)",
  "Lucky Betplay Corporation": "Mandaue City, Cebu",
  "5A Royal Gaming OPC": "Maguindanao Branch",
  "Glowing Fortune": "Iligan City Branch",
  "Imperial Gaming OPC": "Cotabato City Branch"
};

const STANDARD_HR_HANDLERS = [
  "H R M D (Head Office)",
  "HR Lucky Betplay (Mandaue)",
  "HR 5A Royal Gaming (Maguindanao)",
  "HR Glowing Fortune (Iligan & Lanao)",
  "HR Imperial Gaming (Cotabato)",
  "HR SIMCON Construction"
];

export default function EmployeeDirectoryPanel({
  profiles = [],
  onlineEmails = new Set(),
  currentEmail = "",
  loading = false,
  onRefresh,
  onUpdateProfile,
  onDeleteProfile,
  onOpenPermissions
}) {
  const [matrixData, setMatrixData] = useState(() => getRbacMatrixData());

  useEffect(() => {
    const handleRbacUpdate = (e) => {
      if (e.detail) {
        setMatrixData(e.detail);
      }
    };
    window.addEventListener("hrhub_rbac_updated", handleRbacUpdate);
    return () => window.removeEventListener("hrhub_rbac_updated", handleRbacUpdate);
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // 'all' | 'online' | 'pending' | 'approved'
  const [selectedSubsidiary, setSelectedSubsidiary] = useState("all");
  const [selectedHRFilter, setSelectedHRFilter] = useState("all"); // 'all' | 'unassigned' | specific HR
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  
  // Pre-Registration Modal State (Kept completely intact)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  
  // Entity Employee Profiling Modal State (For Per-Entity / Company Accounts)
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [isSubmittingEntity, setIsSubmittingEntity] = useState(false);
  const [newEntityEmployee, setNewEntityEmployee] = useState({
    name: "",
    email: "",
    company: "",
    role: "Team Member",
    branch: "",
    phone: "",
    isApproved: true
  });
  
  // Edit Profile / Diversify HR Assignment Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  const [notice, setNotice] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // New Employee Form State (Preserves exact existing pre-registration system)
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    name: "",
    company: "Simpal Group of Companies",
    role: "Team Member",
    branch: "",
    assigned_hr: "",
    isApproved: true
  });

  // Managed Personnel Profiles (Excludes Master Superadmin/HRMD from deletion/revocation)
  const managedProfiles = useMemo(() => {
    return (profiles || []).filter((p) => (p.email || "").trim().toLowerCase() !== "admin@hrhub.com");
  }, [profiles]);

  // Current logged in HR profile
  const currentProfile = useMemo(() => {
    const curEmail = (currentEmail || "").toLowerCase().trim();
    return (profiles || []).find((p) => (p.email || "").toLowerCase().trim() === curEmail);
  }, [profiles, currentEmail]);

  // Determine whether logged in account is Head Office (HR Administrator) or a Per-Entity / Branch Account
  const isHeadOffice = useMemo(() => {
    const curEmail = (currentEmail || "").toLowerCase().trim();
    const company = (currentProfile?.company || "").toLowerCase().trim();
    const role = (currentProfile?.role || "").toLowerCase().trim();

    return (
      curEmail === "admin@hrhub.com" ||
      curEmail === "jay@simpalgroup.com" ||
      curEmail === "efilfonimda@gmail.com" ||
      curEmail.includes("hrmd") ||
      role === "hr administrator" ||
      role === "super administrator" ||
      role.includes("super admin") ||
      (company.includes("simpal group") && !company.includes("construction")) ||
      company.includes("head office")
    );
  }, [currentEmail, currentProfile]);

  const isEntityAccount = !isHeadOffice;
  const userEntityCompany = currentProfile?.company || "Lucky Betplay Corporation";

  // Dynamic list of available HR Handlers for assignment & filtering
  const availableHRHandlers = useMemo(() => {
    const set = new Set(STANDARD_HR_HANDLERS);

    // Add HR officers discovered from existing profiles
    (profiles || []).forEach((p) => {
      const role = (p.role || "").toLowerCase();
      const name = p.name?.trim();
      if (role.includes("hr") || role.includes("admin") || role.includes("manager")) {
        if (name && !name.toLowerCase().includes("super administrator")) {
          set.add(name);
        }
      }
      if (p.assigned_hr && p.assigned_hr.trim()) {
        set.add(p.assigned_hr.trim());
      }
    });

    // Add current user name if logged in
    if (currentProfile?.name) {
      set.add(currentProfile.name);
    }

    return Array.from(set).sort();
  }, [profiles, currentProfile]);

  // Calculate statistics for managed personnel
  const stats = useMemo(() => {
    let total = managedProfiles.length;
    let onlineCount = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    managedProfiles.forEach((p) => {
      const email = p.email?.toLowerCase() || "";
      const isOnline = (currentEmail && email === currentEmail) || onlineEmails.has(email);
      if (isOnline) onlineCount++;
      if (p.is_approved) approvedCount++;
      else pendingCount++;
    });

    return { total, onlineCount, approvedCount, pendingCount };
  }, [managedProfiles, onlineEmails, currentEmail]);

  // Pre-Registration: Exclusively for Head Office HR Administrator to create system login accounts
  const canPreRegister = isHeadOffice;

  // Add Employee Profile: Exclusively for Per-Entity / Company Accounts to add employee profiles
  const canAddEntityEmployee = isEntityAccount;

  // Profile Administration Permission Check (Edit, Approve, Decommission)
  const canManageProfiles = useMemo(() => {
    const curEmail = (currentEmail || "").toLowerCase().trim();
    const userObj = {
      email: curEmail,
      role: currentProfile?.role || "Team Member",
      company: currentProfile?.company || "Simpal Group of Companies"
    };

    return (
      isUserFeatureAllowed(userObj, "comm_manage_profiles", matrixData) ||
      isUserFeatureAllowed(userObj, "provision_employee_records", matrixData)
    );
  }, [currentEmail, currentProfile, matrixData]);

  // Filtered & Sorted profiles
  const filteredProfiles = useMemo(() => {
    return managedProfiles.filter((p) => {
      const email = p.email?.toLowerCase() || "";
      const name = (p.name || email.split("@")[0].replace(/[._]/g, " ")).toLowerCase();
      const company = (p.company || "Simpal Group of Companies").toLowerCase();
      const role = (p.role || "Team Member").toLowerCase();
      const branch = (p.branch || "").toLowerCase();
      const assignedHR = (p.assigned_hr || "").toLowerCase();
      const isOnline = (currentEmail && email === currentEmail) || onlineEmails.has(email);

      // Search matching (matches name, email, company, role, branch, or assigned HR)
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        email.includes(query) ||
        name.includes(query) ||
        company.includes(query) ||
        role.includes(query) ||
        branch.includes(query) ||
        assignedHR.includes(query);

      // Tab filter
      let matchesFilter = true;
      if (selectedFilter === "online") matchesFilter = isOnline;
      else if (selectedFilter === "approved") matchesFilter = Boolean(p.is_approved);
      else if (selectedFilter === "pending") matchesFilter = !p.is_approved;

      // Subsidiary filter
      const matchesSubsidiary = selectedSubsidiary === "all" || p.company === selectedSubsidiary;

      // HR Diversification filter
      let matchesHR = true;
      if (selectedHRFilter === "unassigned") {
        matchesHR = !p.assigned_hr;
      } else if (selectedHRFilter !== "all") {
        matchesHR = (p.assigned_hr || "").trim().toLowerCase() === selectedHRFilter.toLowerCase().trim();
      }

      // Branch filter
      const matchesBranch = selectedBranchFilter === "all" || (p.branch || "").trim().toLowerCase() === selectedBranchFilter.toLowerCase().trim();

      return matchesSearch && matchesFilter && matchesSubsidiary && matchesHR && matchesBranch;
    }).sort((a, b) => {
      const aEmail = a.email?.toLowerCase() || "";
      const bEmail = b.email?.toLowerCase() || "";
      const aOnline = (currentEmail && aEmail === currentEmail) || onlineEmails.has(aEmail);
      const bOnline = (currentEmail && bEmail === currentEmail) || onlineEmails.has(bEmail);

      // 1. Pending profiles first if in pending view
      if (selectedFilter === "pending") {
        return aEmail.localeCompare(bEmail);
      }
      // 2. Active online profiles first
      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;
      // 3. Alphabetical by email
      return aEmail.localeCompare(bEmail);
    });
  }, [managedProfiles, searchQuery, selectedFilter, selectedSubsidiary, selectedHRFilter, selectedBranchFilter, onlineEmails, currentEmail, currentProfile]);

  // Toggle approval status
  const handleToggleApproval = async (profile) => {
    const newApprovedState = !profile.is_approved;
    const targetEmail = (profile.email || "").trim().toLowerCase();
    if (!targetEmail) return;

    // 1. Save to persistent storage immediately
    updateStoredEmployeeApproval(targetEmail, newApprovedState);
    saveStoredEmployee({
      ...profile,
      email: targetEmail,
      is_approved: newApprovedState
    });

    // 2. Update UI state immediately in parent
    if (onUpdateProfile) {
      onUpdateProfile(profile.id, { is_approved: newApprovedState, email: targetEmail });
    }

    // 3. Sync to Supabase Database
    try {
      if (profile.id && !String(profile.id).startsWith("prof-") && !String(profile.id).startsWith("db-") && !String(profile.id).startsWith("emp-")) {
        const { error: idErr } = await supabase
          .from("profiles")
          .update({ is_approved: newApprovedState })
          .eq("id", profile.id);
        if (idErr) console.warn("Supabase update by ID notice:", idErr.message || idErr);
      }

      const { error: emailErr } = await supabase
        .from("profiles")
        .update({ is_approved: newApprovedState })
        .eq("email", targetEmail);

      if (emailErr) {
        console.warn("Supabase update by email notice:", emailErr.message || emailErr);
      }
    } catch (err) {
      console.warn("Approval toggle db sync error:", err);
    }

    setNotice({
      type: "success",
      message: `${targetEmail} is now ${newApprovedState ? "APPROVED" : "SUSPENDED"}.`
    });
    setTimeout(() => setNotice(null), 4000);
  };

  // Open Edit Employee Modal
  const handleOpenEdit = (profile) => {
    const defBranch = profile.branch || DEFAULT_BRANCH_MAP[profile.company] || "Head Office (Mandaue)";
    const defHR = profile.assigned_hr || (currentProfile?.name || currentEmail || "H R M D (Head Office)");

    setEditingEmployee({
      id: profile.id,
      email: profile.email || "",
      name: profile.name || (profile.email ? profile.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : ""),
      company: profile.company || "Simpal Group of Companies",
      role: profile.role || "Team Member",
      branch: defBranch,
      assigned_hr: defHR,
      phone: profile.phone || "",
      is_approved: typeof profile.is_approved === "boolean" ? profile.is_approved : true
    });
    setIsEditModalOpen(true);
  };

  // Open Add / Pre-Registration Modal with Branch HR default pre-fill
  const handleOpenAddModal = () => {
    const defBranch = currentProfile?.branch || DEFAULT_BRANCH_MAP[currentProfile?.company] || "Head Office (Mandaue)";
    const defHR = currentProfile?.name || currentEmail || "H R M D (Head Office)";
    const defComp = currentProfile?.company || "Simpal Group of Companies";

    setNewEmployee({
      email: "",
      name: "",
      company: defComp,
      role: "Team Member",
      branch: defBranch,
      assigned_hr: defHR,
      isApproved: true
    });
    setIsAddModalOpen(true);
  };

  // Submit Edit Employee Form
  const handleEditEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!editingEmployee || !editingEmployee.email) return;

    setIsSubmittingEdit(true);
    const targetEmail = editingEmployee.email.trim().toLowerCase();

    try {
      const updatedRecord = {
        ...editingEmployee,
        email: targetEmail,
        name: editingEmployee.name.trim() || targetEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      };

      // 1. Save to persistent storage immediately
      saveStoredEmployee(updatedRecord);

      // 2. Update UI state in parent dashboard
      if (onUpdateProfile) {
        onUpdateProfile(editingEmployee.id, updatedRecord);
      }

      // 3. Sync to Supabase Database
      try {
        const updatePayload = {
          name: updatedRecord.name,
          company: updatedRecord.company,
          role: updatedRecord.role,
          is_approved: updatedRecord.is_approved
        };
        if (updatedRecord.branch) updatePayload.branch = updatedRecord.branch;
        if (updatedRecord.assigned_hr) updatePayload.assigned_hr = updatedRecord.assigned_hr;
        if (updatedRecord.phone) updatePayload.phone = updatedRecord.phone;

        if (editingEmployee.id && !String(editingEmployee.id).startsWith("prof-") && !String(editingEmployee.id).startsWith("db-") && !String(editingEmployee.id).startsWith("emp-")) {
          const { error: idErr } = await supabase
            .from("profiles")
            .update(updatePayload)
            .eq("id", editingEmployee.id);

          if (idErr) {
            // Fallback for schemas with only standard columns
            await supabase.from("profiles").update({
              name: updatedRecord.name,
              company: updatedRecord.company,
              role: updatedRecord.role,
              is_approved: updatedRecord.is_approved
            }).eq("id", editingEmployee.id);
          }
        } else {
          const { error: emailErr } = await supabase
            .from("profiles")
            .update(updatePayload)
            .ilike("email", targetEmail);

          if (emailErr) {
            await supabase.from("profiles").update({
              name: updatedRecord.name,
              company: updatedRecord.company,
              role: updatedRecord.role,
              is_approved: updatedRecord.is_approved
            }).ilike("email", targetEmail);
          }
        }
      } catch (dbErr) {
        console.warn("Edit db sync note:", dbErr);
      }

      setNotice({
        type: "success",
        message: `Successfully updated ${updatedRecord.name} (Assigned to: ${updatedRecord.assigned_hr || "Unassigned"}).`
      });
      setIsEditModalOpen(false);
      setEditingEmployee(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Edit profile error:", err);
      setNotice({
        type: "warning",
        message: `Updated local profile for ${targetEmail}.`
      });
      setIsEditModalOpen(false);
    } finally {
      setIsSubmittingEdit(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  // Delete employee handler
  const handleDeleteEmployee = async (profile) => {
    const targetEmail = profile.email || "this employee";
    const confirmDelete = window.confirm(
      `Are you sure you want to remove ${targetEmail} from the Employee Directory?\n\nThis will remove their profile and access permissions.`
    );
    if (!confirmDelete) return;

    // 1. Delete from local persistent storage
    if (profile.email) deleteStoredEmployee(profile.email);
    if (profile.id) deleteStoredEmployee(profile.id);

    // 2. Notify parent dashboard
    if (onDeleteProfile) {
      onDeleteProfile(profile.id, profile.email);
    }

    // 3. Delete from Supabase
    try {
      if (profile.id && !String(profile.id).startsWith("prof-") && !String(profile.id).startsWith("db-") && !String(profile.id).startsWith("emp-")) {
        await supabase.from("profiles").delete().eq("id", profile.id);
      } else if (profile.email) {
        await supabase.from("profiles").delete().ilike("email", profile.email);
      }
    } catch (err) {
      console.warn("Delete profile db notice:", err);
    }

    setNotice({
      type: "success",
      message: `Successfully removed ${targetEmail} from directory.`
    });
    setTimeout(() => setNotice(null), 4000);

    if (onRefresh) onRefresh();
  };

  // Pre-Registration Submit Handler (Preserves exact existing pre-registration flow)
  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!canPreRegister) {
      setNotice({
        type: "warning",
        message: "Access Restricted: Only HR Administrator or authorized accounts in the Role Permission Matrix can pre-register employees."
      });
      return;
    }

    const trimmedEmail = newEmployee.email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setIsSubmittingAdd(true);

    try {
      const assignedBranch = newEmployee.branch || DEFAULT_BRANCH_MAP[newEmployee.company] || "Head Office (Mandaue)";
      const assignedHR = newEmployee.assigned_hr || (currentProfile?.name || currentEmail || "H R M D (Head Office)");

      const newRecord = {
        id: `prof-${Date.now()}`,
        email: trimmedEmail,
        is_approved: Boolean(newEmployee.isApproved),
        name: newEmployee.name.trim() || trimmedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        company: newEmployee.company,
        role: newEmployee.role,
        branch: assignedBranch,
        assigned_hr: assignedHR,
        created_at: new Date().toISOString()
      };

      // 1. Save to persistent storage immediately
      saveStoredEmployee(newRecord);

      // 2. Update UI state immediately in parent
      if (onUpdateProfile) {
        onUpdateProfile(null, newRecord);
      }

      // 3. Sync database approval in background if profile already registered in Supabase
      try {
        await supabase
          .from("profiles")
          .update({
            is_approved: Boolean(newEmployee.isApproved)
          })
          .ilike("email", trimmedEmail);
      } catch (insertError) {
        console.warn("Direct db sync note:", insertError);
      }

      setNotice({
        type: "success",
        message: `Successfully pre-registered ${trimmedEmail}! They can now use First-Time Setup to create their password.`
      });
      setIsAddModalOpen(false);
      setNewEmployee({
        email: "",
        name: "",
        company: "Simpal Group of Companies",
        role: "Team Member",
        branch: "",
        assigned_hr: "",
        isApproved: true
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.warn("Pre-register add notice:", err);
      setNotice({
        type: "success",
        message: `Pre-registered ${trimmedEmail} in active personnel registry.`
      });
      setIsAddModalOpen(false);
    } finally {
      setIsSubmittingAdd(false);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  // Open Entity Employee Profiling Modal (Dedicated for Per-Entity / Company Accounts)
  const handleOpenEntityModal = () => {
    const defaultBranch = DEFAULT_BRANCH_MAP[userEntityCompany] || "Head Office (Mandaue)";
    setNewEntityEmployee({
      name: "",
      email: "",
      company: userEntityCompany,
      role: "Team Member",
      branch: defaultBranch,
      phone: "",
      isApproved: true
    });
    setIsEntityModalOpen(true);
  };

  // Submit Handler for Entity Employee Profiling
  const handleAddEntityEmployeeSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = newEntityEmployee.name.trim();
    if (!trimmedName) {
      setNotice({
        type: "warning",
        message: "Please enter the employee's full name."
      });
      return;
    }

    let cleanEmail = (newEntityEmployee.email || "").trim().toLowerCase();
    if (!cleanEmail) {
      const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, ".");
      const compSlug = (newEntityEmployee.company || userEntityCompany).toLowerCase().replace(/[^a-z0-9]/g, "");
      cleanEmail = `${slug}@${compSlug || "company"}.internal`;
    }

    setIsSubmittingEntity(true);
    try {
      const assignedBranch = newEntityEmployee.branch || DEFAULT_BRANCH_MAP[newEntityEmployee.company] || "Branch Office";
      const assignedHR = currentProfile?.name || currentEmail || "Branch HR";

      const newRecord = {
        id: `emp-entity-${Date.now()}`,
        email: cleanEmail,
        is_approved: true,
        name: trimmedName,
        company: newEntityEmployee.company || userEntityCompany,
        role: newEntityEmployee.role || "Team Member",
        branch: assignedBranch,
        assigned_hr: assignedHR,
        phone: newEntityEmployee.phone || "",
        created_at: new Date().toISOString()
      };

      await saveStoredEmployee(newRecord);

      if (onUpdateProfile) {
        onUpdateProfile(null, newRecord);
      }

      setNotice({
        type: "success",
        message: `Successfully registered ${trimmedName} under ${newRecord.company}!`
      });
      setIsEntityModalOpen(false);
      setNewEntityEmployee({
        name: "",
        email: "",
        company: "",
        role: "Team Member",
        branch: "",
        phone: "",
        isApproved: true
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error adding entity employee:", err);
      setNotice({
        type: "warning",
        message: "Failed to save employee profile. Please check connection and try again."
      });
    } finally {
      setIsSubmittingEntity(false);
      setTimeout(() => setNotice(null), 5000);
    }
  };

  const copyActivationInstructions = (email, id) => {
    const text = `Hi! You have been registered in the HrHub portal. Please go to http://localhost:5173, click "First-Time Setup", and enter your email (${email}) to create your personal password.`;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {notice && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 ${
          notice.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Corporate Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/70">
              <Users size={16} />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Simpal Group • Personnel Governance</span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">Employee Directory</h2>
          <p className="mt-0.5 text-xs text-slate-500 max-w-xl">
            Enterprise personnel database, corporate roles, branch assignments, and diversified HR handler portfolios.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Directory"
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>

          {/* Permissions Matrix: Exclusively for Head Office HR Administrator */}
          {isHeadOffice && onOpenPermissions && (
            <button
              type="button"
              onClick={onOpenPermissions}
              title="Configure Role & Permissions Matrix"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition cursor-pointer shadow-2xs"
            >
              <Sliders size={14} className="text-emerald-600" />
              <span>Permissions Matrix</span>
            </button>
          )}

          {/* Head Office: Pre-Register System Login Account */}
          {isHeadOffice && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition cursor-pointer"
            >
              <UserPlus size={15} className="text-emerald-400" />
              <span>Pre-Register Employee</span>
            </button>
          )}

          {/* Per-Entity / Company Account: Add Employee Profile for their Entity */}
          {isEntityAccount && (
            <button
              type="button"
              onClick={handleOpenEntityModal}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/20 transition cursor-pointer"
            >
              <UserPlus size={15} />
              <span>Add Employee Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Corporate Metric KPI Cards (Clean 3-Card Balanced Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Personnel */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Personnel</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <Users size={16} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Enrolled across subsidiaries</p>
        </div>

        {/* Card 2: Active Online */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Online</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles size={16} />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <p className="text-2xl font-black text-emerald-700 tracking-tight">{stats.onlineCount}</p>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time active sessions</p>
        </div>

        {/* Card 3: Pending Review */}
        <div className={`border rounded-2xl p-4.5 shadow-xs transition ${
          stats.pendingCount > 0
            ? "bg-amber-50/60 border-amber-200"
            : "bg-white border-slate-200/90"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              stats.pendingCount > 0 ? "text-amber-900" : "text-slate-500"
            }`}>
              Pending Review
            </span>
            <span className={`p-2 rounded-xl ${
              stats.pendingCount > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
            }`}>
              <Clock size={16} />
            </span>
          </div>
          <p className={`mt-3 text-2xl font-black tracking-tight ${
            stats.pendingCount > 0 ? "text-amber-700" : "text-slate-900"
          }`}>
            {stats.pendingCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {stats.pendingCount > 0 ? "Requires authorization" : "All accounts verified"}
          </p>
        </div>
      </div>

      {/* Unified Corporate Toolbar: Status Tabs & Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Tier 1: Corporate Status Tabs */}
        <div className="px-4 pt-2.5 pb-0 border-b border-slate-100 flex items-center justify-between gap-4 overflow-x-auto bg-slate-50/40">
          <div className="flex items-center gap-1 sm:gap-2 -mb-px">
            {[
              { id: "all", label: "All Personnel", count: stats.total },
              { id: "online", label: "Online Now", count: stats.onlineCount, isOnlineTab: true },
              { id: "approved", label: "Approved", count: stats.approvedCount },
              { id: "pending", label: "Pending Review", count: stats.pendingCount, isPendingTab: true }
            ].map((tab) => {
              const isActive = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`group flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "border-emerald-600 text-emerald-950 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                  }`}
                >
                  {tab.isOnlineTab && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition ${
                      isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : tab.isPendingTab && tab.count > 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200/70 text-slate-600 group-hover:bg-slate-200"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reset link if filters active */}
          {(selectedHRFilter !== "all" || selectedSubsidiary !== "all" || selectedBranchFilter !== "all" || searchQuery || selectedFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedFilter("all");
                setSelectedSubsidiary("all");
                setSelectedHRFilter("all");
                setSelectedBranchFilter("all");
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 shrink-0 cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Tier 2: Search & Dropdown Filters Bar */}
        <div className="p-3.5 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee by name, role, email, or branch..."
                className="w-full border-0 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown Filters and View Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* HR Handler Select */}
            <div className="relative">
              <select
                value={selectedHRFilter}
                onChange={(e) => setSelectedHRFilter(e.target.value)}
                className={`h-9 text-xs font-medium border rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer transition ${
                  selectedHRFilter !== "all"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <option value="all">👥 HR: All Handlers</option>
                <option value="unassigned">⚠️ Unassigned</option>
                <optgroup label="HR Officers">
                  {availableHRHandlers.map((hr) => (
                    <option key={hr} value={hr}>{hr}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Company Select */}
            <select
              value={selectedSubsidiary}
              onChange={(e) => setSelectedSubsidiary(e.target.value)}
              className="h-9 text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">🏢 Company: All</option>
              {SUBSIDIARIES.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            {/* Branch Select */}
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="h-9 text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">📍 Branch: All</option>
              {BRANCH_PRESETS.map((br) => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 shrink-0 ml-auto sm:ml-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid View"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <List size={13} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Content */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Users size={24} />
          </div>
          <h4 className="text-base font-bold text-slate-800">No personnel found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No matches for "${searchQuery}". Try adjusting your search query or company filters.`
              : "No employees registered under this filter yet."}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedFilter("all");
              setSelectedSubsidiary("all");
              setSelectedHRFilter("all");
              setSelectedBranchFilter("all");
            }}
            className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Executive Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((prof) => {
            const email = prof.email?.toLowerCase() || "";
            const isCurrentUser = Boolean(currentEmail && email === currentEmail);
            const isOnline = isCurrentUser || onlineEmails.has(email);
            const initials = prof.email ? prof.email.slice(0, 2).toUpperCase() : "HR";
            const displayName = prof.name || (prof.email ? prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee");
            const company = prof.company || "Simpal Group of Companies";
            const role = prof.role || "Team Member";
            const branch = prof.branch || DEFAULT_BRANCH_MAP[company] || "Head Office";
            const assignedHR = prof.assigned_hr || "Unassigned";

            return (
              <div
                key={prof.id || prof.email}
                className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${
                  isOnline
                    ? "border-slate-200 hover:border-emerald-300 hover:shadow-sm"
                    : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                {/* Card Header & Identity */}
                <div className="p-5 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <div className={`w-11 h-11 rounded-xl font-extrabold text-xs flex items-center justify-center shadow-2xs ${
                          isOnline ? "bg-slate-900 text-emerald-400" : "bg-slate-800 text-slate-300"
                        }`}>
                          {initials}
                        </div>
                        {isOnline ? (
                          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white"></span>
                          </span>
                        ) : (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-slate-300"></span>
                        )}
                      </div>

                      {/* Name & Role */}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                          {displayName}
                          {isCurrentUser && (
                            <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200">
                              You
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 truncate">
                            {role}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {prof.is_approved ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                          <ShieldCheck size={10} className="text-emerald-600" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock size={10} className="text-amber-600" /> Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata List */}
                  <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                    <p className="text-slate-500 truncate flex items-center gap-2">
                      <Mail size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{prof.email}</span>
                    </p>
                    <p className="text-slate-600 font-medium truncate flex items-center gap-2">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{company}</span>
                    </p>
                    <p className="text-slate-600 truncate flex items-center gap-2">
                      <MapPin size={13} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{branch}</span>
                    </p>
                    <p className="text-slate-600 truncate flex items-center gap-2">
                      <UserCheck size={13} className="text-slate-400 shrink-0" />
                      <span className="text-[11px] truncate">
                        HR Handler:{" "}
                        <strong className={assignedHR.toLowerCase().includes("unassigned") ? "text-amber-600 font-semibold" : "text-slate-800 font-bold"}>
                          {assignedHR.toLowerCase().includes("unassigned") ? "Unassigned" : assignedHR}
                        </strong>
                      </span>
                    </p>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  {canManageProfiles ? (
                    <button
                      type="button"
                      onClick={() => handleToggleApproval(prof)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                        prof.is_approved
                          ? "bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                      }`}
                    >
                      {prof.is_approved ? (
                        <>
                          <ShieldAlert size={12} className="text-slate-400" />
                          <span>Revoke</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-1.5">
                    {canManageProfiles && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(prof)}
                        title="Edit Profile"
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition cursor-pointer"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => copyActivationInstructions(prof.email, prof.id)}
                      title="Copy Setup Instructions"
                      className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition cursor-pointer"
                    >
                      {copiedId === prof.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>

                    {canManageProfiles && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(prof)}
                        title="Remove from Directory"
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Table View */
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Organization & Branch</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Assigned HR</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProfiles.map((prof) => {
                  const email = prof.email?.toLowerCase() || "";
                  const isCurrentUser = Boolean(currentEmail && email === currentEmail);
                  const isOnline = isCurrentUser || onlineEmails.has(email);
                  const initials = prof.email ? prof.email.slice(0, 2).toUpperCase() : "HR";
                  const displayName = prof.name || (prof.email ? prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee");
                  const branch = prof.branch || DEFAULT_BRANCH_MAP[prof.company] || "Head Office";
                  const assignedHR = prof.assigned_hr || "Unassigned";

                  return (
                    <tr key={prof.id || prof.email} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                            isOnline ? "bg-slate-900 text-emerald-400" : "bg-slate-700 text-slate-200"
                          }`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              {displayName}
                              {isCurrentUser && (
                                <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400">{prof.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        <span className="block font-semibold text-slate-800">{prof.company || "Simpal Group of Companies"}</span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin size={10} className="text-emerald-600" /> {branch}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {prof.role || "Team Member"}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg text-[10px]">
                          <UserCheck size={11} className="text-slate-500" /> {assignedHR}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Offline
                            </span>
                          )}

                          {prof.is_approved ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <ShieldCheck size={10} className="text-emerald-600" /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock size={10} className="text-amber-600" /> Pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManageProfiles && (
                            <button
                              type="button"
                              onClick={() => handleToggleApproval(prof)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                                prof.is_approved
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
                              }`}
                            >
                              {prof.is_approved ? "Revoke" : "Approve"}
                            </button>
                          )}
                          {canManageProfiles && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(prof)}
                              title="Edit employee details"
                              className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <Edit3 size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => copyActivationInstructions(prof.email, prof.id)}
                            title="Copy setup message"
                            className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          >
                            {copiedId === prof.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                          {canManageProfiles && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(prof)}
                              title="Remove employee"
                              className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Profile & HR Allocation Modal */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  <UserCog size={13} /> Edit Personnel & HR Assignment
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">Update Employee Details</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingEmployee(null);
                }}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditEmployeeSubmit} className="p-6 space-y-4">
              {/* Employee ID / Identity Header */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {editingEmployee.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="truncate flex-1">
                  <span className="text-xs font-bold text-slate-800 block truncate">{editingEmployee.name || editingEmployee.email}</span>
                  <span className="text-[11px] text-slate-400 block truncate">{editingEmployee.email}</span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  editingEmployee.is_approved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {editingEmployee.is_approved ? "Approved" : "Pending"}
                </span>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingEmployee.name}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
                />
              </div>

              {/* Company & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Company Entity</label>
                  <select
                    value={editingEmployee.company}
                    onChange={(e) => {
                      const newComp = e.target.value;
                      setEditingEmployee({
                        ...editingEmployee,
                        company: newComp,
                        branch: DEFAULT_BRANCH_MAP[newComp] || editingEmployee.branch
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {SUBSIDIARIES.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Branch / Location</label>
                  <select
                    value={editingEmployee.branch}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, branch: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {BRANCH_PRESETS.map((br) => (
                      <option key={br} value={br}>{br}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Position & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Designation / Role</label>
                  <select
                    value={editingEmployee.role}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Contact Number</label>
                  <input
                    type="text"
                    value={editingEmployee.phone || ""}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                    placeholder="e.g. +63 917 123 4567"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
                  />
                </div>
              </div>

              {/* Assigned HR Handler (Diversification) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <UserCheck size={13} className="text-emerald-600" />
                    Assigned HR Handler (Direct Responsibility)
                  </label>
                  {currentProfile?.name && (
                    <button
                      type="button"
                      onClick={() => setEditingEmployee({ ...editingEmployee, assigned_hr: currentProfile.name })}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      Assign to Me ({currentProfile.name})
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={editingEmployee.assigned_hr || ""}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, assigned_hr: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="">-- Select Assigned HR Officer / Unit --</option>
                    {availableHRHandlers.map((hr) => (
                      <option key={hr} value={hr}>{hr}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400">
                  This employee will be under the direct management and monitoring of the selected HR handler.
                </p>
              </div>

              {/* Approval Checkbox */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="editApproveCheckbox"
                  checked={editingEmployee.is_approved}
                  onChange={(e) => setEditingEmployee({ ...editingEmployee, is_approved: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="editApproveCheckbox" className="text-xs text-slate-700 font-medium cursor-pointer">
                  <strong className="block font-bold text-slate-900">Approved Access Permissions</strong>
                  Permit this employee to log in and use the HrHub dashboard.
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold shadow-md shadow-slate-900/15 transition cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingEdit ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving Changes...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Save Profile Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pre-Register / Profiling Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  <UserPlus size={13} /> Personnel Profiling & Registration
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">Pre-Register Employee</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Work Email Address *</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition">
                  <Mail size={15} className="text-slate-400 shrink-0" />
                  <input
                    type="email"
                    required
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    placeholder="e.g. employee@simpalgroup.com"
                    className="w-full border-0 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Company Entity</label>
                  <select
                    value={newEmployee.company}
                    onChange={(e) => {
                      const newComp = e.target.value;
                      setNewEmployee({
                        ...newEmployee,
                        company: newComp,
                        branch: DEFAULT_BRANCH_MAP[newComp] || newEmployee.branch
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {SUBSIDIARIES.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Role / Designation</label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Branch & Assigned HR seamlessly pre-filled */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Branch / Location</label>
                  <select
                    value={newEmployee.branch || DEFAULT_BRANCH_MAP[newEmployee.company] || "Head Office (Mandaue)"}
                    onChange={(e) => setNewEmployee({ ...newEmployee, branch: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {BRANCH_PRESETS.map((br) => (
                      <option key={br} value={br}>{br}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Assigned HR</label>
                  <select
                    value={newEmployee.assigned_hr || currentProfile?.name || currentEmail || "H R M D (Head Office)"}
                    onChange={(e) => setNewEmployee({ ...newEmployee, assigned_hr: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {availableHRHandlers.map((hr) => (
                      <option key={hr} value={hr}>{hr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="approveCheckbox"
                  checked={newEmployee.isApproved}
                  onChange={(e) => setNewEmployee({ ...newEmployee, isApproved: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="approveCheckbox" className="text-xs text-emerald-950 font-medium cursor-pointer">
                  <strong className="block font-bold">Approve Immediately</strong>
                  Permit this employee to activate their account and access the dashboard right away.
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold shadow-md shadow-slate-900/15 transition cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingAdd ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} /> Complete Pre-Registration
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entity Employee Profiling Modal (Dedicated for Per-Entity / Company Accounts) */}
      {isEntityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  <UserPlus size={13} /> Entity Employee Profiling
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">Add Employee Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register employee profile under <span className="font-bold text-slate-700">{userEntityCompany}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEntityModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddEntityEmployeeSubmit} className="p-6 space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Name *</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition">
                  <User size={15} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    required
                    value={newEntityEmployee.name}
                    onChange={(e) => setNewEntityEmployee({ ...newEntityEmployee, name: e.target.value })}
                    placeholder="e.g. Maria Santos"
                    className="w-full border-0 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Company & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Company Entity</label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2.5 text-xs text-slate-700 font-semibold">
                    <Building2 size={14} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{userEntityCompany}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Role / Designation *</label>
                  <select
                    value={newEntityEmployee.role}
                    onChange={(e) => setNewEntityEmployee({ ...newEntityEmployee, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Branch / Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Branch / Work Location</label>
                <select
                  value={newEntityEmployee.branch || DEFAULT_BRANCH_MAP[userEntityCompany] || "Branch Office"}
                  onChange={(e) => setNewEntityEmployee({ ...newEntityEmployee, branch: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                >
                  {BRANCH_PRESETS.map((br) => (
                    <option key={br} value={br}>{br}</option>
                  ))}
                </select>
              </div>

              {/* Optional Email & Contact Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Work Email</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs focus-within:border-emerald-500 focus-within:bg-white transition">
                    <Mail size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="email"
                      value={newEntityEmployee.email}
                      onChange={(e) => setNewEntityEmployee({ ...newEntityEmployee, email: e.target.value })}
                      placeholder="e.g. maria@company.com"
                      className="w-full border-0 bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Contact Phone</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="text"
                    value={newEntityEmployee.phone}
                    onChange={(e) => setNewEntityEmployee({ ...newEntityEmployee, phone: e.target.value })}
                    placeholder="e.g. 0917-123-4567"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEntityModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEntity}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer flex items-center gap-2"
                >
                  {isSubmittingEntity ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving Profile...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Save Employee Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
