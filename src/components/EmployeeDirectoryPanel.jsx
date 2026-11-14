import { useState, useMemo, useEffect, useRef } from "react";
import {
  Users, Search, ShieldCheck, CheckCircle2, Clock,
  RefreshCw, UserPlus, Mail, Building2,
  Copy, Check, Trash2, ShieldAlert,
  Sparkles, X, Edit3, MapPin,
  Sliders, LayoutGrid, List, User, UserCog, Send,
  FileText, Paperclip, KeyRound, Lock,
  ChevronLeft, ChevronRight, Fuel
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
  deleteStoredEmployee,
  updateStoredEmployeeLoginAccess,
  isEmployeeLoginEnabled
} from "../lib/employeeStorage";
import {
  isUserFeatureAllowed,
  getRbacMatrixData
} from "../lib/rbacStorage";
import {
  HEAD_OFFICE,
  STL_SUBSIDIARIES,
  NON_STL_SUBSIDIARIES,
  ALL_SUBSIDIARIES,
  DEFAULT_BRANCH_MAP,
  ALL_BRANCH_PRESETS,
  HR_PRE_REGISTRATION_ROLES,
  ALL_OPERATIONAL_ROLES,
  ENTITY_METADATA,
  isStlEntity,
  isNonStlEntity,
  isHeadOffice,
  normalizeBranchForCompany,
  matchesCompanyEntity
} from "../lib/companyEntities";

export { matchesCompanyEntity };

const SUBSIDIARIES = ALL_SUBSIDIARIES;

// As instructed: In Pre-Registration, only HR account roles appear
const ROLES = HR_PRE_REGISTRATION_ROLES;

const BRANCH_PRESETS = ALL_BRANCH_PRESETS;

/**
 * Identify the assigned HR Administrator for a given company/subsidiary.
 * Strict match ONLY: An HR profile whose registered company strictly matches targetCompany.
 * Profiles from other companies (e.g. Quennie Lim who belongs to Simpal Group of Companies)
 * will NEVER be assigned to another entity.
 */
export function getAssignedHrForCompany(targetCompany, allProfiles = []) {
  if (!targetCompany || targetCompany === "all" || targetCompany === "All Entities") {
    return null;
  }

  // Strict match: An HR profile whose registered company matches targetCompany
  const direct = (allProfiles || []).find((p) => {
    if (!matchesCompanyEntity(p.company, targetCompany)) return false;
    const role = (p.role || "").toLowerCase().trim();
    return (
      role.includes("hr admin") ||
      role === "hr administrator" ||
      role === "hr manager" ||
      role.includes("hr-onsite") ||
      role.includes("hr onsite") ||
      role.includes("hr on-site") ||
      role.includes("central hrmd")
    );
  });

  return direct || null;
}



export default function EmployeeDirectoryPanel({
  profiles = [],
  onlineEmails = new Set(),
  currentEmail = "",
  loading = false,
  onRefresh,
  onUpdateProfile,
  onDeleteProfile,
  onOpenPermissions,
  onNavigateToIr
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

  useEffect(() => {
    const handleEmpUpdate = () => {
      if (typeof onRefresh === "function") {
        onRefresh();
      }
    };
    window.addEventListener("hrhub_employees_updated", handleEmpUpdate);
    return () => window.removeEventListener("hrhub_employees_updated", handleEmpUpdate);
  }, [onRefresh]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // 'all' | 'entity_enrolled' | 'online' | 'pending' | 'approved'
  const [selectedSubsidiary, setSelectedSubsidiary] = useState("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [showNonStl, setShowNonStl] = useState(false);
  const tabsScrollRef = useRef(null);

  const scrollTabs = (direction) => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth"
      });
    }
  };

  // If a non-STL entity is selected, automatically expand non-STL view
  useEffect(() => {
    if (NON_STL_SUBSIDIARIES.includes(selectedSubsidiary)) {
      setShowNonStl(true);
    }
  }, [selectedSubsidiary]);

  // Pre-Registration Modal State (Exclusively for HRMD)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Portal Login Authorization Toggle State (Exclusively for HRMD / Head Office)
  const [isTogglingLoginId, setIsTogglingLoginId] = useState(null);

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

  // When a per-entity account logs in, automatically select their entity company tab
  useEffect(() => {
    if (!isHRMD && currentProfile?.company) {
      setSelectedSubsidiary(currentProfile.company);
    }
  }, [isHRMD, currentProfile?.company]);

  // Identify the opened company and its assigned HR Administrator
  const currentOpenedCompany = useMemo(() => {
    if (selectedSubsidiary && selectedSubsidiary !== "all" && selectedSubsidiary !== "stl_all" && selectedSubsidiary !== "non_stl_all" && selectedSubsidiary !== "head_office_all") {
      return selectedSubsidiary;
    }
    if (!isHRMD && userEntityCompany) {
      return userEntityCompany;
    }
    return null;
  }, [selectedSubsidiary, isHRMD, userEntityCompany]);

  const assignedHrForOpenedEntity = useMemo(() => {
    if (!currentOpenedCompany) return null;
    return getAssignedHrForCompany(currentOpenedCompany, profiles || []);
  }, [currentOpenedCompany, profiles]);

  const assignedHrForUserCompany = useMemo(() => {
    if (!userEntityCompany) return null;
    return getAssignedHrForCompany(userEntityCompany, profiles || []);
  }, [userEntityCompany, profiles]);

  // Dedicated Entity Navigation Tabs with live counts per entity
  const entityTabs = useMemo(() => {
    const countMap = {};
    (profiles || []).forEach((p) => {
      const comp = p.company || HEAD_OFFICE;
      if (matchesCompanyEntity(comp, HEAD_OFFICE)) {
        countMap[HEAD_OFFICE] = (countMap[HEAD_OFFICE] || 0) + 1;
      }
      STL_SUBSIDIARIES.forEach((sub) => {
        if (matchesCompanyEntity(comp, sub)) {
          countMap[sub] = (countMap[sub] || 0) + 1;
        }
      });
      NON_STL_SUBSIDIARIES.forEach((sub) => {
        if (matchesCompanyEntity(comp, sub)) {
          countMap[sub] = (countMap[sub] || 0) + 1;
        }
      });
    });

    const totalAll = (profiles || []).filter((p) => (p.email || "").toLowerCase() !== "admin@hrhub.com").length;

    return [
      {
        id: "all",
        name: "All Entities",
        shortName: "All Entities",
        code: "ALL",
        type: "all",
        count: totalAll,
        logoUrl: null
      },
      {
        id: HEAD_OFFICE,
        name: HEAD_OFFICE,
        shortName: ENTITY_METADATA[HEAD_OFFICE]?.shortName || "Simpal Group",
        code: ENTITY_METADATA[HEAD_OFFICE]?.code || "SGC",
        type: "head_office",
        count: countMap[HEAD_OFFICE] || 0,
        logoUrl: ENTITY_METADATA[HEAD_OFFICE]?.logoUrl || "/logos/SGC.png"
      },
      ...STL_SUBSIDIARIES.map((sub) => ({
        id: sub,
        name: sub,
        shortName: ENTITY_METADATA[sub]?.shortName || sub,
        code: ENTITY_METADATA[sub]?.code || sub.slice(0, 3).toUpperCase(),
        type: "stl",
        count: countMap[sub] || 0,
        logoUrl: ENTITY_METADATA[sub]?.logoUrl
      })),
      ...(showNonStl ? NON_STL_SUBSIDIARIES.map((sub) => ({
        id: sub,
        name: sub,
        shortName: ENTITY_METADATA[sub]?.shortName || sub,
        code: ENTITY_METADATA[sub]?.code || sub.slice(0, 4).toUpperCase(),
        type: "non_stl",
        count: countMap[sub] || 0,
        logoUrl: ENTITY_METADATA[sub]?.logoUrl
      })) : [])
    ];
  }, [profiles, showNonStl]);

  // Managed Personnel Profiles:
  // - If HRMD: Full corporate personnel directory across all subsidiaries (excludes master superadmin from deletion)
  // - If Non-HRMD Branch/Entity Account: Personnel belonging to their entity (based on company column),
  //   plus the assigned HR administrator for their company, plus any profiles created by this user:
  const managedProfiles = useMemo(() => {
    const curEmail = (currentEmail || "").trim().toLowerCase();

    if (isHRMD) {
      return (profiles || []).filter((p) => (p.email || "").trim().toLowerCase() !== "admin@hrhub.com");
    }

    // For operating entity / subsidiary accounts:
    const myComp = (userEntityCompany || "").trim();
    const assignedHr = getAssignedHrForCompany(myComp, profiles || []);
    const assignedHrEmail = (assignedHr?.email || "").toLowerCase().trim();

    return (profiles || []).filter((p) => {
      const email = (p.email || "").trim().toLowerCase();
      if (email === "admin@hrhub.com" && assignedHrEmail !== "admin@hrhub.com") return false;

      // 1. Is this profile the assigned HR for their company?
      if (assignedHrEmail && email === assignedHrEmail) return true;

      // 2. Does this employee belong to the same company? (db column `company`)
      if (myComp && matchesCompanyEntity(p.company, myComp)) return true;

      // 3. Or created by this user
      const createdBy = (
        p.created_by ||
        p.created_by_email ||
        p.metadata?.created_by ||
        p.metadata?.created_by_email ||
        p.added_by ||
        ""
      ).trim().toLowerCase();
      if (curEmail && createdBy === curEmail) return true;

      return false;
    });
  }, [profiles, isHRMD, currentEmail, userEntityCompany]);

  // Helper to determine if an employee profile was enrolled by an operating entity / subsidiary
  const isEntityEnrolledEmployee = (p) => {
    if (!p) return false;
    const email = (p.email || "").trim().toLowerCase();
    if (email === "admin@hrhub.com" || email === "caquennie6@gmail.com") return false;
    if (p.is_preregistered || p.metadata?.is_preregistered || p.metadata?.pre_registered) return false;
    const role = (p.role || "").trim().toLowerCase();
    if (role.startsWith("hr admin") || role === "super administrator" || role === "hr manager") return false;
    return true;
  };

  // Calculate statistics for managed personnel
  const stats = useMemo(() => {
    let total = managedProfiles.length;
    let onlineCount = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let entityEnrolledCount = 0;

    managedProfiles.forEach((p) => {
      const email = p.email?.toLowerCase() || "";
      const isOnline = (currentEmail && email === currentEmail) || onlineEmails.has(email);
      if (isOnline) onlineCount++;
      if (p.is_approved) approvedCount++;
      else pendingCount++;
      if (isEntityEnrolledEmployee(p)) entityEnrolledCount++;
    });

    return { total, onlineCount, approvedCount, pendingCount, entityEnrolledCount };
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
    const assignedEmail = (assignedHrForOpenedEntity?.email || "").toLowerCase().trim();

    // Source list to filter
    const sourceProfiles = isHRMD
      ? (profiles || []).filter((p) => (p.email || "").trim().toLowerCase() !== "admin@hrhub.com")
      : managedProfiles;

    return sourceProfiles.filter((p) => {
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
      if (selectedFilter === "entity_enrolled") matchesFilter = isEntityEnrolledEmployee(p);
      else if (selectedFilter === "online") matchesFilter = isHRMD && isOnline;
      else if (selectedFilter === "approved") matchesFilter = Boolean(p.is_approved);
      else if (selectedFilter === "pending") matchesFilter = !p.is_approved;

      // Subsidiary & Entity Type filter: STRICTLY match the selected entity's company
      let matchesSubsidiary = true;
      if (selectedSubsidiary === "all") {
        matchesSubsidiary = true;
      } else if (selectedSubsidiary === "stl_all") {
        matchesSubsidiary = isStlEntity(p.company);
      } else if (selectedSubsidiary === "non_stl_all") {
        matchesSubsidiary = isNonStlEntity(p.company);
      } else if (selectedSubsidiary === "head_office_all") {
        matchesSubsidiary = isHeadOffice(p.company);
      } else {
        // Specific entity selected (e.g. "Lucky Betplay Corporation", "5A Royal Gaming OPC", "MC POWER GAS")
        matchesSubsidiary = matchesCompanyEntity(p.company, selectedSubsidiary);
      }

      // Branch filter
      const matchesBranch = selectedBranchFilter === "all" || (p.branch || "").trim().toLowerCase() === selectedBranchFilter.toLowerCase().trim();

      return matchesSearch && matchesFilter && matchesSubsidiary && matchesBranch;
    }).sort((a, b) => {
      const aEmail = a.email?.toLowerCase() || "";
      const bEmail = b.email?.toLowerCase() || "";
      const aOnline = (currentEmail && aEmail === currentEmail) || onlineEmails.has(aEmail);
      const bOnline = (currentEmail && bEmail === currentEmail) || onlineEmails.has(bEmail);

      // 0. Pin assigned HR of currently selected entity to the top!
      if (assignedEmail) {
        const aIsHr = aEmail === assignedEmail;
        const bIsHr = bEmail === assignedEmail;
        if (aIsHr && !bIsHr) return -1;
        if (!aIsHr && bIsHr) return 1;
      }

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
  }, [managedProfiles, profiles, assignedHrForOpenedEntity, searchQuery, selectedFilter, selectedSubsidiary, selectedBranchFilter, onlineEmails, currentEmail, isHRMD]);

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

  // Toggle employee portal login authorization (Exclusively for Central HRMD / Head Office)
  const handleToggleEmployeeLogin = async (profile) => {
    if (!profile) return;
    const targetEmail = (profile.email || "").trim().toLowerCase();
    const targetId = profile.id;
    if (!targetEmail && !targetId) return;

    if (targetEmail === "admin@hrhub.com") {
      setNotice({ type: "warning", message: "Master HRMD Administrator login access cannot be modified." });
      setTimeout(() => setNotice(null), 3500);
      return;
    }

    const currentEnabled = isEmployeeLoginEnabled(profile);
    const nextState = !currentEnabled;
    setIsTogglingLoginId(targetId || targetEmail);

    try {
      await updateStoredEmployeeLoginAccess(targetEmail || targetId, nextState);
      const updatedProf = {
        ...profile,
        login_enabled: nextState,
        metadata: { ...(profile.metadata || {}), login_enabled: nextState }
      };

      if (onUpdateProfile) {
        onUpdateProfile(profile.id, { login_enabled: nextState, metadata: updatedProf.metadata });
      }

      setNotice({
        type: nextState ? "success" : "info",
        message: nextState
          ? `Portal login ENABLED for ${profile.name || targetEmail}. Employee can now activate their account and receive login invitations.`
          : `Portal login restricted to HR PROFILING ONLY for ${profile.name || targetEmail}.`
      });
      setTimeout(() => setNotice(null), 4500);
    } catch (err) {
      console.warn("Toggle login notice:", err);
      setNotice({ type: "error", message: "Failed to update login access. Please try again." });
      setTimeout(() => setNotice(null), 3500);
    } finally {
      setIsTogglingLoginId(null);
    }
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
    const defComp = currentProfile?.company || "Simpal Group of Companies";
    const defBranch = normalizeBranchForCompany(defComp, currentProfile?.branch || DEFAULT_BRANCH_MAP[defComp]);

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
      const assignedBranch = normalizeBranchForCompany(newEmployee.company, newEmployee.branch || DEFAULT_BRANCH_MAP[newEmployee.company]);

      const newRecord = {
        id: `prof-${Date.now()}`,
        email: trimmedEmail,
        is_approved: Boolean(newEmployee.isApproved),
        name: newEmployee.name.trim() || trimmedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        company: newEmployee.company,
        role: newEmployee.role,
        branch: assignedBranch,
        is_preregistered: true,
        login_enabled: true,
        created_by: "admin@hrhub.com",
        created_by_email: "admin@hrhub.com",
        metadata: {
          created_by: "admin@hrhub.com",
          pre_registered: true,
          is_preregistered: true,
          login_enabled: true
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

  // Direct Incident Report Filing Trigger - Links directly to Workspace and automatically opens IR process
  const handleFileIncidentReportForEmployee = (employee) => {
    if (!employee) return;
    try {
      localStorage.setItem("hrhub_incident_target_employee", JSON.stringify(employee));
      if (typeof onNavigateToIr === "function") {
        onNavigateToIr(employee);
      } else {
        window.dispatchEvent(
          new CustomEvent("hrhub_switch_workspace_tab", {
            detail: { tabId: "incident_reports", employee }
          })
        );
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("hrhub_file_incident_report", {
              detail: { employee }
            })
          );
        }, 80);
      }
      setNotice({
        type: "success",
        message: `Opening Incident Report (IR) & NTE workflow for ${employee.name || employee.email}...`
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

        <div className="flex items-center gap-2 shrink-0 flex-nowrap overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Directory"
            className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition cursor-pointer shadow-2xs shrink-0"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>

          {/* Permissions Matrix: Exclusively for Head Office HR Administrator */}
          {isHeadOffice && onOpenPermissions && (
            <button
              type="button"
              onClick={onOpenPermissions}
              title="Configure Role & Permissions Matrix"
              className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition cursor-pointer shadow-2xs shrink-0"
            >
              <Sliders size={14} className="text-emerald-600 shrink-0" />
              <span className="hidden md:inline">Permissions</span>
            </button>
          )}

          {/* Head Office: Pre-Register System Login Account (HRMD Only) */}
          {isHeadOffice && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              title="Pre-Register Employee (Grants HRHub Login Access)"
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl font-bold text-xs shadow-sm transition cursor-pointer shrink-0"
            >
              <UserPlus size={14} className="text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Pre-Register</span>
            </button>
          )}

          {/* Add Employee Profile: Available for both HRMD & Branch/Entity Accounts */}
          <button
            type="button"
            onClick={handleOpenAddProfileModal}
            title="Add Employee Profile (Personnel 201 File)"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl font-bold text-xs shadow-sm shadow-emerald-600/20 transition cursor-pointer shrink-0"
          >
            <UserPlus size={14} className="shrink-0" />
            <span>Add Profile</span>
          </button>
        </div>
      </div>

      {/* Metric KPI Cards (3 Cards for HRMD, 2 Cards for Branch/Entity Accounts) */}
      {isHRMD ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Personnel */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs stagger-1">
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs stagger-2">
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
          <div className={`border rounded-2xl p-4.5 shadow-xs transition stagger-3 ${stats.pendingCount > 0
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Entity Personnel */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs stagger-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {currentOpenedCompany || userEntityCompany} Personnel
              </span>
              <span className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <Users size={16} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900 tracking-tight">{stats.total}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Enrolled under {currentOpenedCompany || userEntityCompany}</p>
          </div>

          {/* Card 2: Active Profiles */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 shadow-xs stagger-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Active Profiles</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <ShieldCheck size={16} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-emerald-700 tracking-tight">{stats.approvedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Approved in system registry</p>
          </div>

          {/* Card 3: Assigned Entity HR */}
          <div className="bg-white border border-emerald-200/90 rounded-2xl p-4.5 shadow-xs bg-linear-to-br from-emerald-50/40 to-teal-50/20 stagger-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
                Assigned Entity HR
              </span>
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <ShieldCheck size={16} />
              </span>
            </div>
            <p className="mt-3 text-base font-black text-slate-900 tracking-tight truncate" title={assignedHrForOpenedEntity?.name || assignedHrForOpenedEntity?.email || "No On-Site HR Assigned"}>
              {assignedHrForOpenedEntity?.name || (assignedHrForOpenedEntity?.email ? assignedHrForOpenedEntity.email.split("@")[0] : "No On-Site HR Assigned")}
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 truncate flex items-center gap-1.5">
              <span>{assignedHrForOpenedEntity?.role || "Supervised by Central HRMD"}</span>
              {assignedHrForOpenedEntity?.email && (
                <span className="text-slate-400 font-normal">({assignedHrForOpenedEntity.email})</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Unified Corporate Toolbar: Entity Navigation & Controls */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden stagger-4">
        {/* Tier 1: Dedicated Entity Tabs Bar with Interactive Navigation Controls - Exclusively for Central HR Administrator (HRMD) */}
        {isHRMD && (
          <div className="px-2.5 sm:px-3.5 py-2 bg-slate-50/80 border-b border-slate-200/70 flex items-center justify-between gap-1.5 sm:gap-2 overflow-hidden">
            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              title="Scroll entities left"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer shadow-2xs shrink-0"
            >
              <ChevronLeft size={13} />
            </button>

            {/* Scrollable Tabs Container */}
            <div
              ref={tabsScrollRef}
              className="flex-1 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5 scroll-smooth"
            >
              {entityTabs.map((tab) => {
                const isSelected = selectedSubsidiary === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedSubsidiary(tab.id)}
                    className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 ${isSelected
                        ? "bg-slate-900 text-white shadow-sm ring-2 ring-emerald-500/40"
                        : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                  >
                    {tab.logoUrl ? (
                      <img
                        src={tab.logoUrl}
                        alt={tab.shortName}
                        className={`w-3.5 h-3.5 rounded object-contain shrink-0 ${isSelected ? "brightness-110 drop-shadow-xs" : ""}`}
                      />
                    ) : (
                      <Building2 size={12} className={isSelected ? "text-emerald-400" : "text-slate-400"} />
                    )}
                    <span>{tab.shortName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                          : "bg-slate-100 text-slate-600 border border-slate-200/70"
                        }`}
                    >
                      {tab.count}
                    </span>
                    {tab.type === "non_stl" && (
                      <span
                        className={`text-[8px] uppercase px-1 py-0.2 rounded font-black tracking-wider ${isSelected ? "bg-amber-400/20 text-amber-300 border border-amber-400/30" : "bg-amber-100 text-amber-900"
                          }`}
                      >
                        Non-STL
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollTabs("right")}
              title="Scroll entities right"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer shadow-2xs shrink-0"
            >
              <ChevronRight size={13} />
            </button>

            {/* Non-STL Interactive Toggle */}
            <button
              type="button"
              onClick={() => setShowNonStl((prev) => !prev)}
              title="Toggle Non-STL Subsidiaries (MC Power Gas & Simcon)"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer shrink-0 shadow-2xs ${showNonStl
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                }`}
            >
              <Fuel size={12} className={showNonStl ? "text-white" : "text-amber-700"} />
              <span className="hidden sm:inline">{showNonStl ? "Hide Non-STL" : "+ Non-STL (2)"}</span>
              <span className="sm:hidden">{showNonStl ? "STL" : "+2"}</span>
            </button>

            {/* Quick Reset if filters active */}
            {(selectedSubsidiary !== "all" || selectedBranchFilter !== "all" || searchQuery || selectedFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFilter("all");
                  setSelectedSubsidiary(isHRMD ? "all" : (currentProfile?.company || "all"));
                  setSelectedBranchFilter("all");
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline px-2 py-1 shrink-0 cursor-pointer hidden xl:inline"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* Tier 2: Search Bar, Status Filter, Branch Filter, and View Mode */}
        <div className="p-2.5 sm:p-3 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
          {/* Search Bar */}
          <div className="flex-1 min-w-[160px]">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition shadow-2xs">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employee by name, role, email, branch..."
                className="w-full border-0 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Dropdown Filters and View Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Status Filter Dropdown */}
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="h-8.5 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl px-2.5 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs flex-1 sm:flex-none sm:min-w-[145px]"
            >
              <option value="all">👥 Status: All ({stats.total})</option>
              {isHRMD && (
                <option value="entity_enrolled">🏢 Entity-Enrolled ({stats.entityEnrolledCount})</option>
              )}
              {isHRMD && (
                <option value="online">🟢 Online Now ({stats.onlineCount})</option>
              )}
              <option value="approved">✅ Approved ({stats.approvedCount})</option>
              <option value="pending">⏳ Pending Review ({stats.pendingCount})</option>
            </select>

            {/* Branch Filter Dropdown */}
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="h-8.5 text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl px-2.5 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs flex-1 sm:flex-none sm:min-w-[120px]"
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
                title="Cards View"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Table View"
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                <List size={13} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Entity-Enrolled Focus Notice (For Central HRMD) */}
      {isHRMD && selectedFilter === "entity_enrolled" && (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in shadow-2xs">
          <div className="flex items-start sm:items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
              <Building2 size={16} />
            </span>
            <div>
              <span className="font-extrabold text-slate-900">Personnel Enrolled by Operating Entities & Subsidiaries</span>
              <p className="text-[11px] text-emerald-900/80 mt-0.5 leading-relaxed">
                These profiles were registered by branch & subsidiary accounts. As HR Administrator, you can toggle <strong>Portal Login</strong> on any employee to authorize them to activate their account and sign in to HRHub.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-2.5 py-1 rounded-full shrink-0 border border-emerald-200">
            {stats.entityEnrolledCount} Records
          </span>
        </div>
      )}

      {/* Assigned HR Administrator for Opened Entity Banner */}
      {currentOpenedCompany && assignedHrForOpenedEntity && (
        <div className="bg-slate-900 text-white rounded-2xl p-4 border border-emerald-500/20 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-black text-sm text-emerald-300 shrink-0">
              {assignedHrForOpenedEntity.name ? assignedHrForOpenedEntity.name.slice(0, 2).toUpperCase() : "HR"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  🏛️ Assigned Entity HR Administrator
                </span>
                <span className="text-xs text-slate-400 truncate">• {currentOpenedCompany}</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5 truncate flex items-center gap-2">
                <span>{assignedHrForOpenedEntity.name || assignedHrForOpenedEntity.email}</span>
                <span className="text-xs font-semibold text-emerald-300/90">
                  ({assignedHrForOpenedEntity.role || "HR Administrator"})
                </span>
              </h4>
            </div>
          </div>
          <div className="text-xs text-slate-300 flex items-center gap-2 shrink-0 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
            <Mail size={13} className="text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] text-slate-200">{assignedHrForOpenedEntity.email}</span>
          </div>
        </div>
      )}

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
                setSelectedSubsidiary(isHRMD ? "all" : (currentProfile?.company || "all"));
                setSelectedBranchFilter("all");
              }}
              className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
            >
              Clear all filters
            </button>
          </div>
        )
      ) : viewMode === "grid" ? (
        /* Executive Card Grid View with Cascading Reveal */
        <div key={`${selectedSubsidiary}_${selectedFilter}_grid`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {filteredProfiles.map((prof) => {
            const email = prof.email?.toLowerCase() || "";
            const isCurrentUser = Boolean(currentEmail && email === currentEmail);
            const isOnline = isCurrentUser || onlineEmails.has(email);
            const showOnlineIndicator = isHRMD && isOnline;
            const initials = prof.email ? prof.email.slice(0, 2).toUpperCase() : "HR";
            const displayName = prof.name || (prof.email ? prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee");
            const company = prof.company || "Simpal Group of Companies";
            const role = prof.role || "Team Member";
            const branch = normalizeBranchForCompany(company, prof.branch);

            const isProfAssignedHr = Boolean(
              assignedHrForOpenedEntity?.email &&
              email &&
              email === (assignedHrForOpenedEntity.email || "").toLowerCase().trim()
            );

            const avatarUrl = prof.metadata?.avatar_url || prof.avatar_url;
            const coverPresetId = prof.metadata?.cover_preset_id;
            const customCoverUrl = prof.metadata?.custom_cover_url;
            const requirementsCount = prof.metadata?.requirements_files?.length || 0;
            const isLoginEnabled = isEmployeeLoginEnabled(prof);
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
                className={`bg-white rounded-2xl border transition shadow-xs flex flex-col justify-between overflow-hidden ${isProfAssignedHr
                    ? "ring-2 ring-emerald-500/30 border-emerald-300 shadow-sm"
                    : showOnlineIndicator
                      ? "border-slate-200 hover:border-emerald-300 hover:shadow-sm"
                      : "border-slate-200/80 hover:border-slate-300 hover:shadow-sm"
                  }`}
              >
                {/* Optional Executive Cover Banner */}
                {hasCover && (
                  customCoverUrl ? (
                    <div
                      className="h-16 w-full bg-cover bg-center border-b border-slate-100 shrink-0"
                      style={{ backgroundImage: `url(${customCoverUrl})` }}
                    />
                  ) : (
                    <div
                      className={`h-16 w-full bg-gradient-to-r ${coverPresetGradients[coverPresetId] || "from-slate-900 to-slate-800"} border-b border-slate-100 shrink-0`}
                    />
                  )
                )}

                {/* Card Header & Identity */}
                <div className="p-4.5 sm:p-5 pb-4 space-y-3 bg-white">
                  {/* Top Row: Floating Avatar overlapping cover + Status Badges on the right */}
                  <div className={`flex items-end justify-between gap-3 ${hasCover ? "-mt-9" : ""}`}>
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={displayName}
                          className={`w-13 h-13 rounded-2xl object-cover shadow-md ${hasCover ? "ring-4 ring-white border-2 border-slate-200/60 bg-slate-900" : "border-2 border-slate-200 bg-slate-100"}`}
                        />
                      ) : (
                        <div className={`w-13 h-13 rounded-2xl font-black text-sm flex items-center justify-center shadow-md ${hasCover ? "ring-4 ring-white border border-slate-700/60" : "border border-slate-200"} ${showOnlineIndicator ? "bg-slate-900 text-emerald-400" : "bg-slate-800 text-slate-200"}`}>
                          {initials}
                        </div>
                      )}
                      {showOnlineIndicator && (
                        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white"></span>
                        </span>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-1 shrink-0 pb-0.5">
                      {isProfAssignedHr ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-teal-900 bg-teal-100/90 px-2.5 py-0.5 rounded-full border border-teal-300 shadow-2xs" title="Assigned HR Administrator for this Entity">
                          🏛️ Assigned Entity HR
                        </span>
                      ) : (
                        <>
                          {prof.is_approved ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70 shadow-2xs">
                              <ShieldCheck size={10} className="text-emerald-600" /> Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                              <Clock size={10} className="text-amber-600" /> Pending
                            </span>
                          )}

                          {isLoginEnabled ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs" title="Portal Login Enabled">
                              <KeyRound size={9} className="text-emerald-700" /> Login Access
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200" title="HR Profiling Only (No Portal Login Access)">
                              <Lock size={9} className="text-slate-500" /> Profiling Only
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Name & Role (STRICTLY on the clean white card background below the cover!) */}
                  <div className="min-w-0 pt-0.5">
                    <h4 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5" title={displayName}>
                      <span className="truncate">{displayName}</span>
                      {isCurrentUser && (
                        <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200 shrink-0">
                          You
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 truncate" title={role}>
                        {role}
                      </span>
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

                {/* Portal Login Authorization Switch (Exclusive for Central HRMD Administrator when reviewing entity-enrolled profiles) */}
                {isHRMD && !isProfAssignedHr && (selectedFilter === "entity_enrolled" || isEntityEnrolledEmployee(prof)) && (
                  <div className={`px-4.5 py-2.5 border-t flex items-center justify-between text-xs transition ${isLoginEnabled ? "bg-emerald-50/60 border-emerald-100" : "bg-slate-50 border-slate-100"
                    }`}>
                    <div className="flex items-center gap-1.5">
                      <KeyRound size={13} className={isLoginEnabled ? "text-emerald-600" : "text-slate-400"} />
                      <span className="font-bold text-slate-700 text-[11px]">Portal Login</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${isLoginEnabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                        }`}>
                        {isLoginEnabled ? "Login Enabled" : "Profiling Only"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleEmployeeLogin(prof)}
                      disabled={isTogglingLoginId === (prof.id || prof.email)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isLoginEnabled ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      title={isLoginEnabled ? "Click to restrict to HR Profiling Only" : "Click to authorize Portal Login & Account Activation"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isLoginEnabled ? "translate-x-4" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>
                )}

                {/* Card Action Footer */}
                <div className="px-4.5 py-3 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
                  {isProfAssignedHr ? (
                    <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200/80 shadow-2xs">
                      <ShieldCheck size={13} className="text-teal-600" />
                      <span>Assigned HR Admin</span>
                    </span>
                  ) : canManageProfiles ? (
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
                    {canManageProfiles && !isProfAssignedHr && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(prof)}
                        title="Edit Profile"
                        className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition cursor-pointer"
                      >
                        <Edit3 size={13} />
                      </button>
                    )}

                    {/* Invite Setup instructions ONLY appear if account has portal login access! */}
                    {isLoginEnabled && !isProfAssignedHr && (
                      <button
                        type="button"
                        onClick={() => setInviteEmployee(prof)}
                        title="Send Setup Invite Card (w/ HRHub Logo)"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white text-[11px] font-bold transition cursor-pointer shadow-2xs"
                      >
                        <Send size={12} />
                        <span>Invite</span>
                      </button>
                    )}

                    {canManageProfiles && !isProfAssignedHr && (
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
        /* Detailed Table View with Fade-In Up */
        <div key={`${selectedSubsidiary}_${selectedFilter}_table`} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs animate-tab-fade-in">
          <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <table className="w-full text-left text-xs border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Employee</th>
                  <th className="py-2.5 px-3">Organization & Branch</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Access</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 stagger-children">
                {filteredProfiles.map((prof) => {
                  const email = prof.email?.toLowerCase() || "";
                  const isCurrentUser = Boolean(currentEmail && email === currentEmail);
                  const isOnline = isCurrentUser || onlineEmails.has(email);
                  const showOnlineIndicator = isHRMD && isOnline;
                  const initials = prof.email ? prof.email.slice(0, 2).toUpperCase() : "HR";
                  const displayName = prof.name || (prof.email ? prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "Employee");
                  const branch = normalizeBranchForCompany(prof.company, prof.branch);
                  const isLoginEnabled = isEmployeeLoginEnabled(prof);

                  const isProfAssignedHr = Boolean(
                    assignedHrForOpenedEntity?.email &&
                    email &&
                    email === (assignedHrForOpenedEntity.email || "").toLowerCase().trim()
                  );

                  const avatarUrl = prof.metadata?.avatar_url || prof.avatar_url;

                  return (
                    <tr key={prof.id || prof.email} className={`hover:bg-slate-50/70 transition ${isProfAssignedHr ? "bg-emerald-50/20" : ""}`}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative shrink-0">
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={displayName}
                                className="w-8 h-8 rounded-xl object-cover border border-slate-200 bg-slate-100"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center bg-slate-800 text-slate-200">
                                {initials}
                              </div>
                            )}
                            {showOnlineIndicator && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse"
                                title="Active Online Now"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                              <span className="truncate">{displayName}</span>
                              {isCurrentUser && (
                                <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[150px]" title={prof.email}>{prof.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-600">
                        <span className="block font-semibold text-slate-800 text-xs truncate max-w-[170px]" title={prof.company || "Simpal Group of Companies"}>
                          {prof.company || "Simpal Group of Companies"}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate max-w-[150px]">
                          <MapPin size={9} className="text-emerald-600 shrink-0" />
                          <span className="truncate">{branch}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-medium text-slate-700 truncate max-w-[140px]" title={prof.role || "Team Member"}>
                            {prof.role || "Team Member"}
                          </span>
                          {isProfAssignedHr && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-teal-800 bg-teal-100/90 px-1.5 py-0.2 rounded-full border border-teal-300 shrink-0">
                              🏛️ Assigned HR
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {prof.is_approved ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck size={10} className="text-emerald-600" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock size={10} className="text-amber-600" /> Pending
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isHRMD && !isProfAssignedHr && (selectedFilter === "entity_enrolled" || isEntityEnrolledEmployee(prof)) ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleEmployeeLogin(prof)}
                              disabled={isTogglingLoginId === (prof.id || prof.email)}
                              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isLoginEnabled ? "bg-emerald-600" : "bg-slate-300"
                                }`}
                              title={isLoginEnabled ? "Click to restrict to HR Profiling Only" : "Click to authorize Portal Login & Account Activation"}
                            >
                              <span
                                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isLoginEnabled ? "translate-x-3.5" : "translate-x-0"
                                  }`}
                              />
                            </button>
                            <span className={`text-[10px] font-bold ${isLoginEnabled ? "text-emerald-700" : "text-slate-500"}`}>
                              {isLoginEnabled ? "Login" : "Profiling"}
                            </span>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${isLoginEnabled
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                            {isLoginEnabled ? <KeyRound size={9} className="text-emerald-600" /> : <Lock size={9} className="text-slate-400" />}
                            <span>{isLoginEnabled ? "Login Access" : "Profiling Only"}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {isProfAssignedHr ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200">
                              Assigned HR
                            </span>
                          ) : canManageProfiles ? (
                            <button
                              type="button"
                              onClick={() => handleToggleApproval(prof)}
                              title={prof.is_approved ? "Revoke Approval" : "Approve Employee"}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer shadow-2xs ${prof.is_approved
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                }`}
                            >
                              {prof.is_approved ? "Revoke" : "Approve"}
                            </button>
                          ) : null}

                          {canManageProfiles && !isProfAssignedHr && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(prof)}
                              title="Edit employee profile"
                              className="p-1 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition cursor-pointer"
                            >
                              <Edit3 size={12} />
                            </button>
                          )}

                          {isLoginEnabled && !isProfAssignedHr && (
                            <button
                              type="button"
                              onClick={() => setInviteEmployee(prof)}
                              title="Send setup invite card"
                              className="p-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition cursor-pointer shadow-2xs"
                            >
                              <Send size={12} />
                            </button>
                          )}

                          {canManageProfiles && !isProfAssignedHr && (
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(prof)}
                              title="Remove employee"
                              className="p-1 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 size={12} />
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

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Role / Designation *</label>
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Central HRMD Only
                    </span>
                  </div>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 font-bold focus:border-emerald-500 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <optgroup label="Central HRMD (Head Office)">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Branch / Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Branch / Location</label>
                <select
                  value={newEmployee.branch || normalizeBranchForCompany(newEmployee.company, DEFAULT_BRANCH_MAP[newEmployee.company])}
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
        isHRMD={isHRMD}
        roles={ALL_OPERATIONAL_ROLES}
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
