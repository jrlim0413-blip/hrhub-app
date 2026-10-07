import { useState, useMemo } from "react";
import {
  Users, Search, ShieldCheck, CheckCircle2, Clock,
  RefreshCw, UserPlus, Mail, Building2, Briefcase,
  ExternalLink, Copy, Check, Filter, Trash2, ShieldAlert,
  ArrowUpDown, MoreVertical, Sparkles, X, ChevronDown
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  saveStoredEmployee,
  updateStoredEmployeeApproval
} from "../lib/employeeStorage";

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
  "HR Specialist",
  "Site Supervisor",
  "Site Engineer",
  "Compliance Officer",
  "Operations Lead",
  "Finance & Payroll Analyst",
  "Safety Officer",
  "Team Member"
];

export default function EmployeeDirectoryPanel({
  profiles = [],
  onlineEmails = new Set(),
  currentEmail = "",
  loading = false,
  onRefresh,
  onUpdateProfile
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // 'all' | 'online' | 'pending' | 'approved'
  const [selectedSubsidiary, setSelectedSubsidiary] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [notice, setNotice] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // New Employee Form State
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    name: "",
    company: "Simpal Group of Companies",
    role: "Team Member",
    isApproved: true
  });

  // Calculate statistics
  const stats = useMemo(() => {
    let total = profiles.length;
    let onlineCount = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    profiles.forEach((p) => {
      const email = p.email?.toLowerCase() || "";
      const isOnline = (currentEmail && email === currentEmail) || onlineEmails.has(email);
      if (isOnline) onlineCount++;
      if (p.is_approved) approvedCount++;
      else pendingCount++;
    });

    return { total, onlineCount, approvedCount, pendingCount };
  }, [profiles, onlineEmails, currentEmail]);

  // Filtered & Sorted profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const email = p.email?.toLowerCase() || "";
      const name = (p.name || email.split("@")[0].replace(/[._]/g, " ")).toLowerCase();
      const company = (p.company || "Simpal Group of Companies").toLowerCase();
      const role = (p.role || "Team Member").toLowerCase();
      const isOnline = (currentEmail && email === currentEmail) || onlineEmails.has(email);

      // Search matching
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || email.includes(query) || name.includes(query) || company.includes(query) || role.includes(query);

      // Tab filter
      let matchesFilter = true;
      if (selectedFilter === "online") matchesFilter = isOnline;
      else if (selectedFilter === "approved") matchesFilter = Boolean(p.is_approved);
      else if (selectedFilter === "pending") matchesFilter = !p.is_approved;

      // Subsidiary filter
      const matchesSubsidiary = selectedSubsidiary === "all" || p.company === selectedSubsidiary;

      return matchesSearch && matchesFilter && matchesSubsidiary;
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
  }, [profiles, searchQuery, selectedFilter, selectedSubsidiary, onlineEmails, currentEmail]);

  // Toggle approval status
  const handleToggleApproval = async (profile) => {
    const newApprovedState = !profile.is_approved;
    const targetEmail = profile.email;

    // Save to persistent storage
    updateStoredEmployeeApproval(targetEmail, newApprovedState);

    if (onUpdateProfile) {
      onUpdateProfile(profile.id, { is_approved: newApprovedState });
    }

    try {
      if (profile.id && !String(profile.id).startsWith("prof-")) {
        await supabase
          .from("profiles")
          .update({ is_approved: newApprovedState })
          .eq("id", profile.id);
      }
    } catch (err) {
      console.warn("Approval toggle notice:", err);
    }

    setNotice({
      type: "success",
      message: `${targetEmail} is now ${newApprovedState ? "APPROVED" : "SUSPENDED"}.`
    });
    setTimeout(() => setNotice(null), 4000);
  };

  // Add new employee handler
  const handleAddEmployeeSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = newEmployee.email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setIsSubmittingAdd(true);

    try {
      const newRecord = {
        id: `prof-${Date.now()}`,
        email: trimmedEmail,
        is_approved: Boolean(newEmployee.isApproved),
        name: newEmployee.name.trim() || trimmedEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
        company: newEmployee.company,
        role: newEmployee.role,
        created_at: new Date().toISOString()
      };

      // 1. Save to persistent storage immediately
      saveStoredEmployee(newRecord);

      // 2. Update UI state immediately
      if (onUpdateProfile) {
        onUpdateProfile(null, newRecord);
      }

      // 3. Try database insert in background
      try {
        await supabase
          .from("profiles")
          .insert([{
            email: trimmedEmail,
            is_approved: Boolean(newEmployee.isApproved)
          }]);
      } catch (insertError) {
        console.warn("Direct db insert note:", insertError);
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

      {/* Main Header & Actions */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Users size={18} />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Personnel & Access Control</span>
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">Employee Directory</h2>
          <p className="mt-0.5 text-xs text-slate-500 max-w-xl">
            Centralized personnel registry across Simpal Group subsidiaries. Pre-register employees, manage access approvals, and monitor real-time presence.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Directory"
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-emerald-600" : ""} />
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-slate-900/15 transition cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Pre-Register Employee</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Personnel</span>
            <span className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Users size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Enrolled across subsidiaries</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Active Now</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Sparkles size={16} />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-2xl font-black text-emerald-700">{stats.onlineCount}</p>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Real-time active connections</p>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Approved Access</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck size={16} />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.approvedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Permitted to login</p>
        </div>

        <div className={`border rounded-2xl p-4 shadow-xs transition ${stats.pendingCount > 0
            ? "bg-amber-50/60 border-amber-200"
            : "bg-white border-slate-200/90"
          }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${stats.pendingCount > 0 ? "text-amber-900" : "text-slate-500"}`}>
              Pending Review
            </span>
            <span className={`p-2 rounded-xl ${stats.pendingCount > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
              <Clock size={16} />
            </span>
          </div>
          <p className={`mt-2 text-2xl font-black ${stats.pendingCount > 0 ? "text-amber-700" : "text-slate-900"}`}>
            {stats.pendingCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {stats.pendingCount > 0 ? "Requires administrator sign-off" : "All accounts verified"}
          </p>
        </div>
      </div>

      {/* Control Bar: Search, Filters & View Mode */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-800 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100 transition">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, company, or role..."
                className="w-full border-0 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Subsidiary Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedSubsidiary}
              onChange={(e) => setSelectedSubsidiary(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Subsidiaries</option>
              {SUBSIDIARIES.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === "grid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-100 text-xs">
          {[
            { id: "all", label: `All Personnel (${stats.total})` },
            { id: "online", label: `Active Online (${stats.onlineCount})` },
            { id: "approved", label: `Approved (${stats.approvedCount})` },
            { id: "pending", label: `Pending Review (${stats.pendingCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${selectedFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
            >
              {tab.label}
            </button>
          ))}
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
              ? `No matches for "${searchQuery}". Try clearing your search query or filters.`
              : "No employees registered under this filter yet."}
          </p>
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setSelectedFilter("all"); setSelectedSubsidiary("all"); }}
            className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((prof) => {
            const email = prof.email?.toLowerCase() || "";
            const isCurrentUser = Boolean(currentEmail && email === currentEmail);
            const isOnline = isCurrentUser || onlineEmails.has(email);
            const initials = prof.email ? prof.email.slice(0, 2).toUpperCase() : "HR";
            const displayName = prof.name || (prof.email ? prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Employee");
            const company = prof.company || "Simpal Group of Companies";
            const role = prof.role || "Team Member";

            return (
              <div
                key={prof.id || prof.email}
                className={`bg-white rounded-2xl p-5 border transition shadow-xs flex flex-col justify-between gap-4 ${isOnline
                    ? "border-emerald-200/90 hover:border-emerald-300 ring-1 ring-emerald-500/10"
                    : "border-slate-200/80 hover:border-slate-300"
                  }`}
              >
                <div>
                  {/* Top Bar: Avatar & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl font-black text-sm flex items-center justify-center shadow-xs ${isOnline ? "bg-slate-900 text-emerald-400" : "bg-slate-800 text-slate-300"
                        }`}>
                        {initials}
                      </div>
                      {isOnline ? (
                        <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white"></span>
                        </span>
                      ) : (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white bg-slate-300"></span>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          {isCurrentUser ? "Active (You)" : "Active Now"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Offline
                        </span>
                      )}

                      {prof.is_approved ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50/60 px-2 py-0.5 rounded-full border border-emerald-200/60">
                          <ShieldCheck size={10} className="text-emerald-600" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock size={10} className="text-amber-600" /> Pending Approval
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="mt-3 space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-900 truncate flex items-center gap-1.5">
                      {displayName}
                      {isCurrentUser && (
                        <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-200">
                          You
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                      <Mail size={12} className="text-slate-400 shrink-0" /> {prof.email}
                    </p>
                    <div className="pt-2 flex flex-col gap-1 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1.5 truncate">
                        <Building2 size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{company}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                        <Briefcase size={12} className="text-slate-400 shrink-0" />
                        <span>{role}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleApproval(prof)}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${prof.is_approved
                        ? "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs shadow-emerald-600/20"
                      }`}
                  >
                    {prof.is_approved ? (
                      <>
                        <ShieldAlert size={13} className="text-slate-500" /> Revoke
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} /> Approve Access
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => copyActivationInstructions(prof.email, prof.id)}
                    title="Copy First-Time Setup Instructions"
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50/50 transition cursor-pointer"
                  >
                    {copiedId === prof.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  </button>
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
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Presence</th>
                  <th className="py-3 px-4">Access Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProfiles.map((prof) => {
                  const email = prof.email?.toLowerCase() || "";
                  const isCurrentUser = Boolean(currentEmail && email === currentEmail);
                  const isOnline = isCurrentUser || onlineEmails.has(email);
                  const initials = prof.email ? prof.email.slice(0, 2).toUpperCase() : "HR";
                  const displayName = prof.name || (prof.email ? prof.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : "Employee");

                  return (
                    <tr key={prof.id || prof.email} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${isOnline ? "bg-slate-900 text-emerald-400" : "bg-slate-700 text-slate-200"
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
                        {prof.company || "Simpal Group of Companies"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {prof.role || "Team Member"}
                      </td>
                      <td className="py-3 px-4">
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
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleApproval(prof)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${prof.is_approved
                                ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                              }`}
                          >
                            {prof.is_approved ? "Revoke" : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyActivationInstructions(prof.email, prof.id)}
                            title="Copy setup message"
                            className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          >
                            {copiedId === prof.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
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

      {/* Pre-Register Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  <UserPlus size={13} /> New Personnel Registration
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
                    onChange={(e) => setNewEmployee({ ...newEmployee, company: e.target.value })}
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
    </div>
  );
}
