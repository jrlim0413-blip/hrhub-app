import { useState, useMemo, useEffect } from "react";
import {
  Users, Search, ShieldCheck, CheckCircle2, Clock,
  RefreshCw, UserPlus, Mail, Building2,
  Copy, Check, Trash2, ShieldAlert,
  Sparkles, X, Edit3, MapPin,
  Sliders, LayoutGrid, List, User, UserCog, Send,
  FileText, Paperclip
} from "lucide-react";
import { supabase } from "../lib/supabase";
import PreRegisterInviteModal from "./PreRegisterInviteModal";
import AddEmployeeProfileModal from "./AddEmployeeProfileModal";
import {
  copyRichInviteToClipboard,
  getPortalInviteUrl
} from "../lib/preRegisterInvite";
import {
  saveStoredEmployee,
  updateStoredEmployeeApproval,
  deleteStoredEmployee
} from "../lib/employeeStorage";
import {
  isUserFeatureAllowed,
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
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // Pre-Registration Modal State (Exclusively for HRMD)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Unified Enhanced Employee Profiling Modal State (For Add & Edit across all accounts)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState("add"); // 'add' | 'edit'
  const [selectedProfileForModal, setSelectedProfileForModal] = useState(null);

  const [notice, setNotice] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [inviteEmployee, setInviteEmployee] = useState(null);

  // New Employee Form State (Exclusively for HRMD Pre-registration)
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    name: "",
    company: "Simpal Group of Companies",
    role: "Team Member",
    branch: "",
    isApproved: true
  });

  // Current logged in HR profile
  const currentProfile = useMemo(() => {
    const curEmail = (currentEmail || "").toLowerCase().trim();
    return (profiles || []).find((p) => (p.email || "").toLowerCase().trim() === curEmail);
  }, [profiles, currentEmail]);

  // Determine whether logged in account is Head Office HRMD Administrator
  const isHRMD = useMemo(() => {
    const curEmail = (currentEmail || "").toLowerCase().trim();
    const role = (currentProfile?.role || "").toLowerCase().trim();
    const name = (currentProfile?.name || "").toLowerCase().trim();

    return (
      curEmail === "admin@hrhub.com" ||
      curEmail === "jay@simpalgroup.com" ||
      curEmail === "efilfonimda@gmail.com" ||
      curEmail.includes("hrmd") ||
      name.replace(/\s+/g, "") === "hrmd" ||
      role === "super administrator" ||
      role === "super admin" ||
      role === "hr administrator"
    );
  }, [currentEmail, currentProfile]);

  const isHeadOffice = isHRMD;
  const isEntityAccount = !isHRMD;
  const userEntityCompany = currentProfile?.company || "Lucky Betplay Corporation";

  // Managed Personnel Profiles:
  // - If HRMD: Full corporate personnel directory across all subsidiaries (excludes master superadmin from deletion)
  // - If Non-HRMD Branch/Entity Account: ONLY the employee profiles that they themselves added!
  const managedProfiles = useMemo(() => {
    const curEmail = (currentEmail || "").trim().toLowerCase();

    if (isHRMD) {
      return (profiles || []).filter((p) => (p.email || "").trim().toLowerCase() !== "admin@hrhub.com");
    }

    // For all other accounts: strictly filter to employees created/added by this user
    return (profiles || []).filter((p) => {
      const email = (p.email || "").trim().toLowerCase();
      if (email === "admin@hrhub.com") return false;

      const createdBy = (
        p.created_by ||
        p.created_by_email ||
        p.metadata?.created_by ||
        p.metadata?.created_by_email ||
        p.added_by ||
        ""
      ).trim().toLowerCase();

      return Boolean(curEmail && createdBy === curEmail);
    });
  }, [profiles, isHRMD, currentEmail]);

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

  // Pre-Registration: Exclusively for Head Office HR Administrator
  const canPreRegister = isHRMD;

  // Add Employee Profile: For Per-Entity / Company Accounts to add their branch employees
  const canAddEntityEmployee = isEntityAccount;

  // Profile Administration Permission Check (Edit, Approve, Decommission)
  const canManageProfiles = useMemo(() => {
    // Both HRMD and accounts managing their own added employees can manage
    if (isHRMD || isEntityAccount) return true;
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
  }, [isHRMD, isEntityAccount, currentEmail, currentProfile, matrixData]);

  // Filtered & Sorted profiles
  const filteredProfiles = useMemo(() => {
    return managedProfiles.filter((p) => {
      const email = p.email?.toLowerCase() || "";
      const name = (p.name || email.split("@")[0].replace(/[._]/g, " ")).toLowerCase();
      const company = (p.company || "Simpal Group of Companies").toLowerCase();
      const role = (p.role || "Team Member").toLowerCase();
      const branch = (p.branch || "").toLowerCase();
      const isOnline = (currentEmail && email === currentEmail) || onlineEmails.has(email);

      // Search matching (matches name, email, company, role, or branch)
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        email.includes(query) ||
        name.includes(query) ||
        company.includes(query) ||
        role.includes(query) ||
        branch.includes(query);

      // Tab filter
      let matchesFilter = true;
      if (selectedFilter === "online") matchesFilter = isHRMD && isOnline;
      else if (selectedFilter === "approved") matchesFilter = Boolean(p.is_approved);
      else if (selectedFilter === "pending") matchesFilter = !p.is_approved;

      // Subsidiary filter
      const matchesSubsidiary = selectedSubsidiary === "all" || p.company === selectedSubsidiary;

      // Branch filter
      const matchesBranch = selectedBranchFilter === "all" || (p.branch || "").trim().toLowerCase() === selectedBranchFilter.toLowerCase().trim();

      return matchesSearch && matchesFilter && matchesSubsidiary && matchesBranch;
    }).sort((a, b) => {
      const aEmail = a.email?.toLowerCase() || "";
      const bEmail = b.email?.toLowerCase() || "";
      const aOnline = (currentEmail && aEmail === currentEmail) || onlineEmails.has(aEmail);
      const bOnline = (currentEmail && bEmail === currentEmail) || onlineEmails.has(bEmail);

      // 1. Pending profiles first if in pending view
      if (selectedFilter === "pending") {
        return aEmail.localeCompare(bEmail);
      }
      // 2. Active online profiles first ONLY in HRMD view
      if (isHRMD) {
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
      }
      // 3. Alphabetical by email or name
      return (a.name || aEmail).localeCompare(b.name || bEmail);
    });
  }, [managedProfiles, searchQuery, selectedFilter, selectedSubsidiary, selectedBranchFilter, onlineEmails, currentEmail, isHRMD]);

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

  // Open Enhanced Employee Profiling Modal in Edit Mode (Available for all accounts)
  const handleOpenEdit = (profile) => {
    setProfileModalMode("edit");
    setSelectedProfileForModal(profile);
    setIsProfileModalOpen(true);
  };

  // Open Enhanced Employee Profiling Modal in Add Mode
  const handleOpenAddProfileModal = () => {
    setProfileModalMode("add");
    setSelectedProfileForModal(null);
    setIsProfileModalOpen(true);
  };

  // Open Add / Pre-Registration Modal (HRMD Only)
  const handleOpenAddModal = () => {
    const defBranch = currentProfile?.branch || DEFAULT_BRANCH_MAP[currentProfile?.company] || "Head Office (Mandaue)";
    const defComp = currentProfile?.company || "Simpal Group of Companies";

    setNewEmployee({
      email: "",
      name: "",
      company: defComp,
      role: "Team Member",
      branch: defBranch,
      isApproved: true
    });
    setIsAddModalOpen(true);
  };

  // Delete employee handler
  const handleDeleteEmployee = async (profile) => {
    const targetEmail = profile.email || "this employee";
    const confirmDelete = window.confirm(
      `Are you sure you want to remove ${targetEmail} from the Employee Directory?\n\nThis will remove their profile and access permissions.`
    );
    if (!confirmDelete) return;

    // 1. Delete from local persistent storage & cloud tombstone
    if (profile.email) await deleteStoredEmployee(profile.email);
    if (profile.id) await deleteStoredEmployee(profile.id);

    // 2. Notify parent dashboard
    if (onDeleteProfile) {
      await onDeleteProfile(profile.id, profile.email);
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

  // Pre-Registration Submit Handler (Exclusively for HRMD)
  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!canPreRegister) {
      setNotice({
        type: "warning",
        message: "Access Restricted: Only HRMD administrator can pre-register accounts."
      });
      return;
    }

    const trimmedEmail = newEmployee.email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setIsSubmittingAdd(true);

    try {
      const assignedBranch = newEmployee.branch || DEFAULT_BRANCH_MAP[newEmployee.company] || "Head Office (Mandaue)";

      const newRecord = {
        id: `prof-${Date.now()}`,
        email: trimmedEmail,
        is_approved: Boolean(newEmployee.isApproved),
        name: newEmployee.name.trim() || trimmedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        company: newEmployee.company,
        role: newEmployee.role,
        branch: assignedBranch,
        created_by: "admin@hrhub.com",
        created_by_email: "admin@hrhub.com",
        metadata: {
          created_by: "admin@hrhub.com",
          pre_registered: true
        },
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
        message: `Successfully pre-registered ${trimmedEmail}! Opening the HRHub Logo invite card so you can send their First-Time Setup instructions.`
      });
      setIsAddModalOpen(false);
      setInviteEmployee(newRecord);
      setNewEmployee({
        email: "",
        name: "",
        company: "Simpal Group of Companies",
        role: "Team Member",
        branch: "",
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

  // Save Handler for Enhanced Employee Profile Modal (Handles both Add & Edit)
  const handleSaveProfileModal = async (record) => {
    try {
      const creatorEmail = (currentEmail || "").trim().toLowerCase();
      const existingId = selectedProfileForModal?.id || record.id || `emp-prof-${Date.now()}`;
      const fullRecord = {
        ...(selectedProfileForModal || {}),
        ...record,
        id: existingId,
        created_by: selectedProfileForModal?.created_by || creatorEmail,
        created_by_email: selectedProfileForModal?.created_by_email || creatorEmail,
        metadata: {
          ...(selectedProfileForModal?.metadata || {}),
          ...(record.metadata || {}),
          created_by: selectedProfileForModal?.created_by || creatorEmail,
          created_by_email: selectedProfileForModal?.created_by_email || creatorEmail,
          updated_at: new Date().toISOString()
        }
      };

      await saveStoredEmployee(fullRecord);

      // Also sync to profiles table if it's an existing registered user
      try {
        if (selectedProfileForModal?.id && !String(selectedProfileForModal.id).startsWith("prof-") && !String(selectedProfileForModal.id).startsWith("db-") && !String(selectedProfileForModal.id).startsWith("emp-")) {
          await supabase.from("profiles").update({
            name: fullRecord.name,
            company: fullRecord.company,
            role: fullRecord.role,
            is_approved: fullRecord.is_approved
          }).eq("id", selectedProfileForModal.id);
        } else if (fullRecord.email) {
          await supabase.from("profiles").update({
            name: fullRecord.name,
            company: fullRecord.company,
            role: fullRecord.role,
            is_approved: fullRecord.is_approved
          }).ilike("email", fullRecord.email);
        }
      } catch (e) {
        console.debug("Profiles db sync:", e);
      }

      if (onUpdateProfile) {
        onUpdateProfile(fullRecord.id, fullRecord);
      }

      setNotice({
        type: "success",
        message: profileModalMode === "edit"
          ? `Successfully updated profile for ${fullRecord.name}!`
          : `Successfully registered profile for ${fullRecord.name} under ${fullRecord.company}!`
      });
      setIsProfileModalOpen(false);
      setSelectedProfileForModal(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error saving employee profile:", err);
      setNotice({
        type: "warning",
        message: "Failed to save employee profile. Please check connection and try again."
      });
      throw err;
    }
  };

  // Direct Incident Report Filing Trigger
  const handleFileIncidentReportForEmployee = (employee) => {
    try {
      localStorage.setItem("hrhub_incident_target_employee", JSON.stringify(employee));
      window.dispatchEvent(
        new CustomEvent("hrhub_switch_workspace_tab", {
          detail: { tabId: "incident_reports", employee }
        })
      );
      window.dispatchEvent(
        new CustomEvent("hrhub_file_incident_report", {
          detail: { employee }
        })
      );
      setNotice({
        type: "success",
        message: `Opening Incident Report generator for ${employee.name || employee.email}...`
      });
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error("Error switching to incident report:", err);
    }
  };

  const copyActivationInstructions = async (profileOrEmail, id) => {
    const employeeObj =
      typeof profileOrEmail === "object" && profileOrEmail !== null
        ? profileOrEmail
        : { email: String(profileOrEmail || ""), id };
    const recordId = employeeObj.id || id;
    try {
      const res = await copyRichInviteToClipboard(employeeObj, getPortalInviteUrl());
      setCopiedId(recordId);
      setNotice({
        type: "success",
        message:
          res.mode === "rich_html"
            ? `Copied setup instructions w/ HRHub Logo for ${employeeObj.email}! Paste into Gmail/Outlook for the full logo card, or Messenger/Viber for the portal preview.`
            : `Copied setup instructions for ${employeeObj.email}! Click the Send button to copy/download the HRHub Logo image card for Messenger or Viber.`
      });
      setTimeout(() => setNotice(null), 5000);
      setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      console.warn("Clipboard copy warning:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {notice && (
        <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 ${notice.type === "success"
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
            Enterprise personnel database, corporate roles, and branch assignments.
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

          {/* Head Office: Pre-Register System Login Account (HRMD Only) */}
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

          {/* Add Employee Profile: Available for both HRMD & Branch/Entity Accounts */}
          <button
            type="button"
            onClick={handleOpenAddProfileModal}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/20 transition cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Add Employee Profile</span>
          </button>
        </div>
      </div>

      {/* Metric KPI Cards (3 Cards for HRMD, 2 Cards for Branch/Entity Accounts) */}
      {isHRMD ? (
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

          {/* Card 2: Active Online (Exclusively for HRMD) */}
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
          <div className={`border rounded-2xl p-4.5 shadow-xs transition ${stats.pendingCount > 0
              ? "bg-amber-50/60 border-amber-200"
              : "bg-white border-slate-200/90"
            }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${stats.pendingCount > 0 ? "text-amber-900" : "text-slate-500"
                }`}>
                Pending Review
              </span>
              <span className={`p-2 rounded-xl ${stats.pendingCount > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                }`}>
                <Clock size={16} />
              </span>
            </div>
            <p className={`mt-3 text-2xl font-black tracking-tight ${stats.pendingCount > 0 ? "text-amber-700" : "text-slate-900"
              }`}>
              {stats.pendingCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {stats.pendingCount > 0 ? "Requires authorization" : "All accounts verified"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: My Registered Employees */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">My Registered Employees</span>
              <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <Users size={16} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{stats.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Employees added under your branch/account</p>
          </div>

          {/* Card 2: Active Profiles */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Profiles</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck size={16} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-emerald-700 tracking-tight">{stats.approvedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Approved in system registry</p>
          </div>
        </div>
      )}

      {/* Unified Corporate Toolbar: Status Tabs & Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Tier 1: Corporate Status Tabs */}
        <div className="px-4 pt-2.5 pb-0 border-b border-slate-100 flex items-center justify-between gap-4 overflow-x-auto bg-slate-50/40">
          <div className="flex items-center gap-1 sm:gap-2 -mb-px">
            {[
              { id: "all", label: isHRMD ? "All Personnel" : "All Employees", count: stats.total },
              ...(isHRMD ? [{ id: "online", label: "Online Now", count: stats.onlineCount, isOnlineTab: true }] : []),
              { id: "approved", label: "Approved", count: stats.approvedCount },
              { id: "pending", label: "Pending Review", count: stats.pendingCount, isPendingTab: true }
            ].map((tab) => {
              const isActive = selectedFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`group flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${isActive
                      ? "border-emerald-600 text-emerald-950 font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                    }`}
                >
                  {tab.isOnlineTab && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition ${isActive
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
          {(selectedSubsidiary !== "all" || selectedBranchFilter !== "all" || searchQuery || selectedFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedFilter("all");
                setSelectedSubsidiary("all");
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
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
        !isHRMD && managedProfiles.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-3.5 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center">
              <Users size={24} />
            </div>
            <h4 className="text-base font-bold text-slate-800">No employee profiles added yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              You haven&apos;t added any employee profiles for your branch yet. Click &quot;Add Employee Profile&quot; to register your personnel.
            </p>
            <button
              type="button"
              onClick={handleOpenAddProfileModal}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/20 transition cursor-pointer"
            >
              <UserPlus size={15} />
              <span>Add Employee Profile</span>
            </button>
          </div>
        ) : (
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
                setSelectedBranchFilter("all");
              }}
              className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )
      ) : viewMode === "grid" ? (
        /* Executive Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((prof) => {
            const email = prof.email?.toLowerCase() || "";
            const isCurrentUser = Boolean(currentEmail && email === currentEmail);
            const isOnline = isCurrentUser || onlineEmails.has(email);
            const showOnlineIndicator = isHRMD && isOnline;
            const initials = prof.email ? prof.email.slice(0, 2).toUpperCase() : "HR";
            const displayName = prof.name || (prof.email ? prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee");
            const company = prof.company || "Simpal Group of Companies";
            const role = prof.role || "Team Member";
            const branch = prof.branch || DEFAULT_BRANCH_MAP[company] || "Head Office";

            const avatarUrl = prof.metadata?.avatar_url || prof.avatar_url;
            const coverPresetId = prof.metadata?.cover_preset_id;
            const customCoverUrl = prof.metadata?.custom_cover_url;
            const requirementsCount = prof.metadata?.requirements_files?.length || 0;
            const coverPresetGradients = {
              preset_emerald: "from-emerald-950 via-teal-900 to-slate-900",
              preset_sapphire: "from-blue-950 via-indigo-900 to-slate-950",
              preset_obsidian: "from-slate-950 via-amber-950 to-stone-900",
              preset_crimson: "from-rose-950 via-red-950 to-stone-950",
              preset_slate: "from-slate-900 via-zinc-800 to-slate-950"
            };
            const hasCover = Boolean(customCoverUrl || coverPresetId);

            return (
              <div
                key={prof.id || prof.email}
                className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${showOnlineIndicator
                    ? "border-slate-200 hover:border-emerald-300 hover:shadow-sm"
                    : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                  }`}
              >
                {/* Optional Executive Cover Banner */}
                {hasCover && (
                  customCoverUrl ? (
                    <div
                      className="h-14 w-full bg-cover bg-center border-b border-slate-100"
                      style={{ backgroundImage: `url(${customCoverUrl})` }}
                    />
                  ) : (
                    <div
                      className={`h-14 w-full bg-gradient-to-r ${coverPresetGradients[coverPresetId] || "from-slate-900 to-slate-800"} border-b border-slate-100`}
                    />
                  )
                )}

                {/* Card Header & Identity */}
                <div className={`p-5 pb-4 space-y-3 ${hasCover ? "-mt-7" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className={`w-11 h-11 rounded-xl object-cover border-2 shadow-sm ${hasCover ? "border-white bg-slate-900" : "border-slate-200 bg-slate-100"}`}
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-xl font-extrabold text-xs flex items-center justify-center shadow-2xs ${hasCover ? "border-2 border-white ring-1 ring-slate-200/50" : ""} ${showOnlineIndicator ? "bg-slate-900 text-emerald-400" : "bg-slate-800 text-slate-300"
                            }`}>
                            {initials}
                          </div>
                        )}
                        {showOnlineIndicator && (
                          <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white"></span>
                          </span>
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
                    {requirementsCount > 0 && (
                      <div className="pt-1 flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Paperclip size={10} className="text-emerald-600" />
                          <span>{requirementsCount} 201 File(s) Attached</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  {canManageProfiles ? (
                    <button
                      type="button"
                      onClick={() => handleToggleApproval(prof)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${prof.is_approved
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
                      onClick={() => setInviteEmployee(prof)}
                      title="Send Setup Invite Card (w/ HRHub Logo)"
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white text-[10px] font-bold transition cursor-pointer"
                    >
                      <Send size={12} />
                      <span>Invite</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => copyActivationInstructions(prof)}
                      title="Copy Setup Instructions (w/ HRHub Logo)"
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
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProfiles.map((prof) => {
                  const email = prof.email?.toLowerCase() || "";
                  const isCurrentUser = Boolean(currentEmail && email === currentEmail);
                  const isOnline = isCurrentUser || onlineEmails.has(email);
                  const showOnlineIndicator = isHRMD && isOnline;
                  const initials = prof.email ? prof.email.slice(0, 2).toUpperCase() : "HR";
                  const displayName = prof.name || (prof.email ? prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee");
                  const branch = prof.branch || DEFAULT_BRANCH_MAP[prof.company] || "Head Office";

                  const avatarUrl = prof.metadata?.avatar_url || prof.avatar_url;

                  return (
                    <tr key={prof.id || prof.email} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={displayName}
                              className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-200 bg-slate-100"
                            />
                          ) : (
                            <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${showOnlineIndicator ? "bg-slate-900 text-emerald-400" : "bg-slate-700 text-slate-200"
                              }`}>
                              {initials}
                            </div>
                          )}
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
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {isHRMD && (
                            isOnline ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Offline
                              </span>
                            )
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
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${prof.is_approved
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
                            onClick={() => setInviteEmployee(prof)}
                            title="Send setup invite card (w/ HRHub Logo)"
                            className="p-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                          >
                            <Send size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => copyActivationInstructions(prof)}
                            title="Copy setup message (w/ HRHub Logo)"
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

              {/* Branch / Location */}
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

      {/* Comprehensive Bond Paper Sized Employee Profile Modal (Used for both Add and Edit across all accounts) */}
      <AddEmployeeProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedProfileForModal(null);
        }}
        onSave={handleSaveProfileModal}
        userEntityCompany={userEntityCompany}
        roles={ROLES}
        branches={BRANCH_PRESETS}
        defaultBranchMap={DEFAULT_BRANCH_MAP}
        onFileIncidentReport={handleFileIncidentReportForEmployee}
        mode={profileModalMode}
        initialData={selectedProfileForModal}
      />

      {/* Pre-Registered Account Branded Invite Studio (w/ HRHub Logo) */}
      <PreRegisterInviteModal
        key={inviteEmployee?.email || inviteEmployee?.id || "closed"}
        employee={inviteEmployee}
        onClose={() => setInviteEmployee(null)}
      />
    </div>
  );
}
