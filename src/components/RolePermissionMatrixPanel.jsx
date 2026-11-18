import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck, RotateCcw, Cloud, Users, User, AlertTriangle,
  Sparkles, Sliders, RefreshCw, Layers, Database, Lock, CheckCircle2,
  Tag, Plus, X, Search, Unlock, Filter
} from "lucide-react";
import {
  STANDARD_ROLE_TIERS,
  WORKSPACE_TABS_CONFIG,
  IN_TAB_FEATURES_CONFIG,
  fetchRealAccountsAndTiers,
  getRbacMatrixData,
  loadRbacMatrixFromCloud,
  resetRbacMatrixToDefaults,
  toggleCapability,
  getEffectiveCapability,
  syncMatrixToCloud,
  setAccountCapabilityTag,
  setAccountRestrictedOnlyMode,
  grantAllAccountCapabilities,
  clearAccountOverrides,
  hasAccountCustomOverrides
} from "../lib/rbacStorage";

const MODULE_CATEGORIES = ["All", "Portal", "Home", "Operations", "HR Admin", "Finance", "Analytics", "Security"];

export default function RolePermissionMatrixPanel({ currentUser, onClose }) {
  const [matrixData, setMatrixData] = useState(() => getRbacMatrixData());
  const [realAccounts, setRealAccounts] = useState([]);
  const [roleTiers, setRoleTiers] = useState(STANDARD_ROLE_TIERS);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [viewMode, setViewMode] = useState("tags"); // "tags" | "role" | "account"
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState("Database Cloud Synchronized");
  const [toastMessage, setToastMessage] = useState("");

  // Tag Manager & Search states
  const [selectedAccountEmail, setSelectedAccountEmail] = useState("");
  const [accountSearchQuery, setAccountSearchQuery] = useState("");
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState("All");
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [matrixSearchQuery, setMatrixSearchQuery] = useState("");

  const currentEmail = (currentUser?.email || "").toLowerCase().trim();

  // Load real accounts from database and cloud permissions
  const loadDatabaseData = async () => {
    setLoadingAccounts(true);
    try {
      const [cloudMatrix, accountData] = await Promise.all([
        loadRbacMatrixFromCloud(),
        fetchRealAccountsAndTiers()
      ]);

      if (cloudMatrix) setMatrixData(cloudMatrix);
      if (accountData) {
        setRealAccounts(accountData.realAccounts);
        setRoleTiers(accountData.dynamicTiers);
        if (!selectedAccountEmail && accountData.realAccounts.length > 0) {
          // Select first non-master account if available, otherwise first account
          const firstStaff = accountData.realAccounts.find(
            (a) => a.email !== "admin@hrhub.com" && a.email !== "jay@simpalgroup.com"
          );
          setSelectedAccountEmail((firstStaff || accountData.realAccounts[0]).email);
        }
      }
    } catch (err) {
      console.warn("Failed to load real accounts for RBAC matrix:", err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    loadDatabaseData();

    const handleUpdate = (e) => {
      if (e.detail) {
        setMatrixData({ ...e.detail });
      }
    };
    window.addEventListener("hrhub_rbac_updated", handleUpdate);
    return () => window.removeEventListener("hrhub_rbac_updated", handleUpdate);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Filtered accounts list for search
  const filteredAccounts = useMemo(() => {
    const q = accountSearchQuery.toLowerCase().trim();
    if (!q) return realAccounts;
    return realAccounts.filter(
      (a) =>
        (a.name || "").toLowerCase().includes(q) ||
        (a.email || "").toLowerCase().includes(q) ||
        (a.company || "").toLowerCase().includes(q) ||
        (a.role || "").toLowerCase().includes(q)
    );
  }, [realAccounts, accountSearchQuery]);

  // Selected account object for Tag Studio
  const selectedAccount = useMemo(() => {
    if (!selectedAccountEmail && realAccounts.length > 0) return realAccounts[0];
    return (
      realAccounts.find((a) => a.email.toLowerCase() === selectedAccountEmail.toLowerCase()) ||
      realAccounts[0] ||
      null
    );
  }, [realAccounts, selectedAccountEmail]);

  // Filtered tabs & features for matrix search
  const filteredWorkspaceTabs = useMemo(() => {
    const q = matrixSearchQuery.toLowerCase().trim();
    if (!q) return WORKSPACE_TABS_CONFIG;
    return WORKSPACE_TABS_CONFIG.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        (t.shortLabel || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [matrixSearchQuery]);

  const filteredInTabFeatures = useMemo(() => {
    const q = matrixSearchQuery.toLowerCase().trim();
    if (!q) return IN_TAB_FEATURES_CONFIG;
    return IN_TAB_FEATURES_CONFIG.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.belongsToLabel.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
    );
  }, [matrixSearchQuery]);

  // Toggle capability handler (Matrix Table)
  const handleToggle = (type, targetId, capId, currentValue, parentTabKey = null) => {
    if (parentTabKey) {
      const parentAllowed = getEffectiveCapability(type, targetId, parentTabKey, matrixData, realAccounts);
      if (!parentAllowed && !currentValue) {
        showToast("⚠️ Parent module is disabled — enabling both parent module and feature.");
      }
    }

    const nextVal = !currentValue;
    const updated = toggleCapability(type, targetId, capId, nextVal);
    setMatrixData({ ...updated });
    showToast(`Access Updated: ${targetId.toUpperCase()} → ${nextVal ? "ENABLED" : "DISABLED"}`);
  };

  // Tag Add / Remove handler (Tag Studio)
  const handleTagToggle = (email, capId, enable, capLabel) => {
    const updated = setAccountCapabilityTag(email, capId, enable);
    setMatrixData({ ...updated });
    showToast(
      enable
        ? `+ Added "${capLabel}" to ${email}`
        : `× Disabled "${capLabel}" for ${email}`
    );
  };

  // Quick Action: Clear All (Single-Module / Whitelist Mode)
  const handleLockAllForSingleModule = (acct) => {
    if (!acct) return;
    const updated = setAccountRestrictedOnlyMode(acct.email, []);
    setMatrixData({ ...updated });
    showToast(`🔒 All modules disabled for ${acct.name}. Click any "+ Add" tag below to assign specific module(s).`);
  };

  // Quick Action: Grant All Operational Modules
  const handleGrantAllModules = (acct) => {
    if (!acct) return;
    const updated = grantAllAccountCapabilities(acct.email, true);
    setMatrixData({ ...updated });
    showToast(`✅ Granted all standard operational modules to ${acct.name}.`);
  };

  // Quick Action: Reset Account to Role Tier Default
  const handleClearAccountOverrides = (acct) => {
    if (!acct) return;
    const updated = clearAccountOverrides(acct.email);
    setMatrixData({ ...updated });
    showToast(`↺ ${acct.name} reverted to Role Tier default permissions.`);
  };

  // Reset entire matrix to factory defaults
  const handleResetDefaults = () => {
    if (window.confirm("Reset all enterprise role & account access policies back to standard factory defaults?")) {
      const reset = resetRbacMatrixToDefaults();
      setMatrixData({ ...reset });
      showToast("All security access policies restored to baseline defaults.");
    }
  };

  // Cloud Sync handler
  const handleSyncCloud = async () => {
    setIsSyncing(true);
    setSyncStatusText("Synchronizing to Database...");
    const res = await syncMatrixToCloud();
    setIsSyncing(false);
    setSyncStatusText(`Database Cloud Synchronized (${res.timestamp})`);
    showToast("Security access matrix successfully committed to cloud database storage.");
  };

  // Helper to compute enabled module & feature lists for a given account
  const getAccountTagBreakdown = (acct) => {
    if (!acct) return { enabledTabs: [], disabledTabs: [], enabledFeatures: [], disabledFeatures: [] };
    const enabledTabs = [];
    const disabledTabs = [];
    WORKSPACE_TABS_CONFIG.forEach((tab) => {
      if (getEffectiveCapability("account", acct.email, tab.id, matrixData, realAccounts)) {
        enabledTabs.push(tab);
      } else {
        disabledTabs.push(tab);
      }
    });

    const enabledFeatures = [];
    const disabledFeatures = [];
    IN_TAB_FEATURES_CONFIG.forEach((feat) => {
      if (getEffectiveCapability("account", acct.email, feat.id, matrixData, realAccounts)) {
        enabledFeatures.push(feat);
      } else {
        disabledFeatures.push(feat);
      }
    });

    return { enabledTabs, disabledTabs, enabledFeatures, disabledFeatures };
  };

  const selectedBreakdown = useMemo(
    () => getAccountTagBreakdown(selectedAccount),
    [selectedAccount, matrixData, realAccounts]
  );

  const selectedTierInfo = useMemo(() => {
    if (!selectedAccount) return null;
    return STANDARD_ROLE_TIERS.find((t) => t.id === selectedAccount.roleTier) || null;
  }, [selectedAccount]);

  const isSelectedCustom = selectedAccount
    ? hasAccountCustomOverrides(selectedAccount.email, matrixData)
    : false;

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
          <Sparkles size={14} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ENTERPRISE HEADER & CLOUD PERSISTENCE CONTROLS                          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              Enterprise Role & Capabilities Access Control Matrix
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
              LIVE ENFORCED
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Disable or add specific modules and features per user using Access Tags, or configure default permissions across Enterprise Role Tiers. Changes enforce immediately.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Cloud Synced Online Indicator */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Database size={12} className="text-emerald-600" />
            <span>{syncStatusText}</span>
          </div>

          <button
            type="button"
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Cloud size={13} className={isSyncing ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span>{isSyncing ? "Committing..." : "Sync Cloud"}</span>
          </button>

          <button
            type="button"
            onClick={loadDatabaseData}
            disabled={loadingAccounts}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer"
            title="Reload real personnel records from database"
          >
            <RefreshCw size={12} className={loadingAccounts ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span>Reload DB</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer"
          >
            <RotateCcw size={13} className="text-slate-500" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-BAR: USER ACCESS TAGS | ROLE TIERS | ACCOUNT TABLE                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode("tags")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              viewMode === "tags"
                ? "bg-slate-900 text-emerald-400 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Tag size={13} />
            <span>User Access Tags ({realAccounts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("role")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              viewMode === "role"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={13} />
            <span>By Role Tier ({roleTiers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("account")}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              viewMode === "account"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User size={13} />
            <span>Account Matrix Table</span>
          </button>
        </div>

        <div className="text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
          <span className="text-amber-500 font-black">⚡</span>
          <span>
            {viewMode === "tags"
              ? "Click × on a tag to disable, or + to add specific modules & features to a user. Use Lock All for single-module users."
              : viewMode === "role"
              ? "Toggling a capability updates baseline permissions for all accounts in that role tier."
              : "Per-account toggles override role tier defaults and take effect immediately."}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3A. USER ACCESS TAGS STUDIO (ADD / DISABLE MODULES & FEATURES PER USER)   */}
      {/* ========================================================================= */}
      {viewMode === "tags" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* LEFT: USER ACCOUNTS DIRECTORY PICKER */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col max-h-[760px]">
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-emerald-600" />
                  <span>Select User Account</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  {filteredAccounts.length} / {realAccounts.length}
                </span>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={accountSearchQuery}
                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                  placeholder="Search name, email, company..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto custom-scrollbar flex-1">
              {loadingAccounts ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-emerald-600" />
                  Loading database accounts...
                </div>
              ) : filteredAccounts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No accounts match your search.
                </div>
              ) : (
                filteredAccounts.map((acct) => {
                  const isSelected = selectedAccount?.email === acct.email;
                  const isMyAccount = currentEmail && acct.email.toLowerCase() === currentEmail;
                  const isCustom = hasAccountCustomOverrides(acct.email, matrixData);
                  const { enabledTabs } = getAccountTagBreakdown(acct);

                  return (
                    <button
                      key={acct.id}
                      type="button"
                      onClick={() => setSelectedAccountEmail(acct.email)}
                      className={`w-full text-left p-3 transition cursor-pointer flex items-start justify-between gap-2 ${
                        isSelected
                          ? "bg-emerald-50/80 border-l-4 border-l-emerald-600"
                          : "hover:bg-slate-50 border-l-4 border-l-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {acct.name}
                          </span>
                          {isMyAccount && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              YOU
                            </span>
                          )}
                          {isCustom && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                              CUSTOM TAGS
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{acct.email}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {acct.role} • {acct.company}
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${
                            enabledTabs.length === 0
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : enabledTabs.length <= 3
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {enabledTabs.length} {enabledTabs.length === 1 ? "Module" : "Modules"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: SELECTED USER ACCESS TAGS BUILDER */}
          <div className="lg:col-span-8 space-y-4">
            {!selectedAccount ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-10 text-center text-xs text-slate-500">
                Select a user account on the left to manage their module and feature tags.
              </div>
            ) : (
              <>
                {/* Selected User Summary & Quick Actions Bar */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {selectedAccount.badge.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm font-black text-slate-900 truncate">
                            {selectedAccount.name}
                          </h2>
                          {selectedTierInfo && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${selectedTierInfo.badgeBg}`}>
                              {selectedTierInfo.name}
                            </span>
                          )}
                          {isSelectedCustom ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Custom Tag Overrides Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                              Inheriting Role Defaults
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {selectedAccount.email} • {selectedAccount.role} • {selectedAccount.company}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick One-Click Access Presets */}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
                      Quick Presets:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLockAllForSingleModule(selectedAccount)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-extrabold transition cursor-pointer shadow-2xs"
                      title="Disable all modules & features first so you can add only 1 or 2 specific tags"
                    >
                      <Lock size={12} />
                      <span>Lock All (Single-Module Mode)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGrantAllModules(selectedAccount)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold transition cursor-pointer shadow-2xs"
                    >
                      <Unlock size={12} />
                      <span>Grant All Modules</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleClearAccountOverrides(selectedAccount)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold transition cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Reset to Role Default</span>
                    </button>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION A: AUTHORIZED MODULES (WORKSPACE TABS) TAGS       */}
                {/* ========================================================= */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-emerald-600" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Allowed Modules / Workspace Tabs
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                        {selectedBreakdown.enabledTabs.length} Active
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Click <strong className="text-rose-600">×</strong> to disable a module • Click <strong className="text-emerald-700">+</strong> below to add a module
                    </span>
                  </div>

                  {/* Active (Enabled) Module Tags */}
                  <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200/80 min-h-[68px]">
                    {selectedBreakdown.enabledTabs.length === 0 ? (
                      <div className="text-center py-2 text-xs text-slate-500 flex items-center justify-center gap-1.5">
                        <Lock size={14} className="text-rose-500" />
                        <span>
                          <strong>No modules enabled.</strong> Click any <strong className="text-emerald-700">+ Module Tag</strong> below to allow specific module(s) for this account.
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedBreakdown.enabledTabs.map((tab) => {
                          const isProtectedMaster =
                            tab.id === "permission_matrix" &&
                            (selectedAccount.email === "admin@hrhub.com" ||
                              selectedAccount.email === "jay@simpalgroup.com");
                          return (
                            <span
                              key={tab.id}
                              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-2xs"
                            >
                              <CheckCircle2 size={12} className="text-emerald-200 shrink-0" />
                              <span className="text-[9px] uppercase font-black bg-emerald-700/80 px-1.5 py-0.2 rounded text-emerald-100">
                                {tab.category}
                              </span>
                              <span>{tab.shortLabel || tab.label}</span>
                              {!isProtectedMaster && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleTagToggle(selectedAccount.email, tab.id, false, tab.shortLabel || tab.label)
                                  }
                                  className="ml-0.5 p-0.5 rounded-full hover:bg-rose-500 text-emerald-100 hover:text-white transition cursor-pointer"
                                  title={`Disable ${tab.label}`}
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Available / Disabled Module Tags (+ Add to User) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                        <Plus size={13} className="text-emerald-600" />
                        <span>Add Module / Tab to {selectedAccount.name} ({selectedBreakdown.disabledTabs.length} Disabled):</span>
                      </span>

                      <div className="flex items-center gap-1 flex-wrap">
                        {MODULE_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setModuleCategoryFilter(cat)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              moduleCategoryFilter === cat
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {selectedBreakdown.disabledTabs
                        .filter((t) => moduleCategoryFilter === "All" || t.category === moduleCategoryFilter)
                        .map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() =>
                              handleTagToggle(selectedAccount.email, tab.id, true, tab.shortLabel || tab.label)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-dashed border-slate-300 hover:border-emerald-400 text-[11px] font-bold transition cursor-pointer active:scale-95"
                            title={`Click to add "${tab.label}" to ${selectedAccount.name}`}
                          >
                            <Plus size={12} className="text-emerald-600" />
                            <span className="text-[9px] uppercase font-bold text-slate-400">
                              {tab.category}
                            </span>
                            <span>{tab.shortLabel || tab.label}</span>
                          </button>
                        ))}
                      {selectedBreakdown.disabledTabs.filter(
                        (t) => moduleCategoryFilter === "All" || t.category === moduleCategoryFilter
                      ).length === 0 && (
                        <span className="text-[11px] text-slate-400 italic py-1">
                          All modules in this category are already enabled for this user.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* SECTION B: AUTHORIZED IN-TAB FEATURES TAGS                */}
                {/* ========================================================= */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sliders size={16} className="text-amber-600" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Allowed In-Tab Operational Features
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                        {selectedBreakdown.enabledFeatures.length} Active
                      </span>
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={featureSearchQuery}
                        onChange={(e) => setFeatureSearchQuery(e.target.value)}
                        placeholder="Filter features..."
                        className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Active Feature Tags */}
                  <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/80 min-h-[56px]">
                    {selectedBreakdown.enabledFeatures.length === 0 ? (
                      <div className="text-center py-1.5 text-xs text-slate-500">
                        No in-tab features enabled. Click any <strong className="text-amber-700">+ Feature Tag</strong> below to grant specific operational tools.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedBreakdown.enabledFeatures
                          .filter(
                            (f) =>
                              !featureSearchQuery.trim() ||
                              f.label.toLowerCase().includes(featureSearchQuery.toLowerCase()) ||
                              f.belongsToLabel.toLowerCase().includes(featureSearchQuery.toLowerCase())
                          )
                          .map((feat) => (
                            <span
                              key={feat.id}
                              className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-amber-500 text-white text-[10.5px] font-bold shadow-2xs"
                              title={`Parent Module: ${feat.belongsToLabel} — ${feat.description}`}
                            >
                              <span className="text-[8.5px] uppercase font-black bg-amber-600/80 px-1.5 py-0.2 rounded text-amber-50">
                                {feat.parentTab}
                              </span>
                              <span>{feat.label}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleTagToggle(selectedAccount.email, feat.id, false, feat.label)
                                }
                                className="ml-0.5 p-0.5 rounded-full hover:bg-rose-600 text-amber-100 hover:text-white transition cursor-pointer"
                                title={`Disable ${feat.label}`}
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Disabled Feature Tags (+ Add Feature to User) */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                      <Plus size={13} className="text-amber-600" />
                      <span>
                        Add Feature to {selectedAccount.name} ({selectedBreakdown.disabledFeatures.length} Disabled — adding a feature also auto-enables its parent module):
                      </span>
                    </span>

                    <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                      {selectedBreakdown.disabledFeatures
                        .filter(
                          (f) =>
                            !featureSearchQuery.trim() ||
                            f.label.toLowerCase().includes(featureSearchQuery.toLowerCase()) ||
                            f.belongsToLabel.toLowerCase().includes(featureSearchQuery.toLowerCase())
                        )
                        .map((feat) => (
                          <button
                            key={feat.id}
                            type="button"
                            onClick={() =>
                              handleTagToggle(selectedAccount.email, feat.id, true, feat.label)
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-dashed border-slate-300 hover:border-amber-400 text-[10.5px] font-bold transition cursor-pointer active:scale-95"
                            title={`Parent Module: ${feat.belongsToLabel} — Click to grant`}
                          >
                            <Plus size={11} className="text-amber-600 shrink-0" />
                            <span className="text-[8.5px] uppercase font-bold text-slate-400">
                              {feat.parentTab}
                            </span>
                            <span>{feat.label}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3B. CAPABILITIES MATRIX TABLE (BY ROLE TIER OR BY ACCOUNT)                */}
      {/* ========================================================================= */}
      {(viewMode === "role" || viewMode === "account") && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Matrix Filter Bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative flex-1 max-w-md">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={matrixSearchQuery}
                onChange={(e) => setMatrixSearchQuery(e.target.value)}
                placeholder="Filter modules or features in matrix..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {viewMode === "account" && (
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={accountSearchQuery}
                  onChange={(e) => setAccountSearchQuery(e.target.value)}
                  placeholder="Filter user columns..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[960px]">
              {/* TABLE HEADER (COLUMNS) */}
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="py-4 px-5 text-[11px] font-black uppercase tracking-wider text-slate-500 w-[340px]">
                    Authoritative Workspace Capability
                  </th>

                  {viewMode === "role" ? (
                    roleTiers.map((tier) => (
                      <th key={tier.id} className="py-4 px-4 text-center min-w-[170px]">
                        <div className="inline-flex flex-col items-center">
                          <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${tier.badgeBg}`}>
                            {tier.id === "system_admin" && <ShieldCheck size={13} className="text-emerald-700" />}
                            {tier.id === "hr_admin" && <Users size={13} className="text-lime-700" />}
                            {tier.id === "operations_supervisor" && <Sliders size={13} className="text-amber-700" />}
                            {tier.id === "finance_cashier" && <User size={13} className="text-blue-700" />}
                            <span>{tier.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                            {tier.countText}
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap justify-center max-w-[180px]">
                            {tier.accounts && tier.accounts.length > 0 ? (
                              tier.accounts.map((badgeName, idx) => (
                                <span
                                  key={`${badgeName}-${idx}`}
                                  className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-200/80 text-slate-700 border border-slate-300"
                                >
                                  {badgeName}
                                </span>
                              ))
                            ) : (
                              <span className="text-[9px] text-slate-400 italic">No assigned accounts</span>
                            )}
                          </div>
                        </div>
                      </th>
                    ))
                  ) : (
                    filteredAccounts.map((acct) => {
                      const isMyAccount = currentEmail && acct.email.toLowerCase() === currentEmail;
                      const isCustom = hasAccountCustomOverrides(acct.email, matrixData);
                      return (
                        <th
                          key={acct.id}
                          className={`py-3 px-3 text-center min-w-[145px] transition-colors ${
                            isMyAccount ? "bg-emerald-50/60 ring-1 ring-inset ring-emerald-300" : ""
                          }`}
                        >
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-900 text-emerald-400 border border-slate-800 shadow-2xs">
                              {acct.badge}
                            </span>
                            <span className="text-[10px] font-bold text-slate-800 truncate max-w-[135px] mt-1">
                              {acct.name}
                            </span>
                            <span className="text-[9px] text-slate-400 truncate max-w-[135px]">
                              {acct.company}
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                              {isCustom && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Custom
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAccountEmail(acct.email);
                                  setViewMode("tags");
                                }}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
                              >
                                <Tag size={8} />
                                <span>Edit Tags</span>
                              </button>
                            </div>
                          </div>
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>

              {/* TABLE BODY */}
              <tbody className="divide-y divide-slate-100 text-xs">
                {/* SECTION 1: WORKSPACE TABS (All 21 Modules) */}
                <tr className="bg-emerald-50/40 border-y border-emerald-100">
                  <td
                    colSpan={viewMode === "role" ? roleTiers.length + 1 : filteredAccounts.length + 1}
                    className="py-2.5 px-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs text-emerald-900">
                        <Layers size={16} className="text-emerald-700" />
                        <span>WORKSPACE MODULES & TABS ({filteredWorkspaceTabs.length} Modules — Sidebar & Route Enforced)</span>
                      </div>
                      <span className="text-[11px] font-medium text-emerald-700 hidden sm:inline">
                        Disabling a module immediately hides it from the sidebar and locks access
                      </span>
                    </div>
                  </td>
                </tr>

                {filteredWorkspaceTabs.map((tab) => (
                  <tr key={tab.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 mt-0.5 uppercase">
                          {tab.category || "TAB"}
                        </span>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs">
                            {tab.label}
                          </div>
                          <div className="text-[9px] font-mono font-bold text-slate-400 tracking-tight mt-0.5">
                            {tab.code}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            {tab.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {viewMode === "role" ? (
                      roleTiers.map((tier) => {
                        const isAllowed = getEffectiveCapability("role", tier.id, tab.id, matrixData, realAccounts);
                        return (
                          <td key={tier.id} className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle("role", tier.id, tab.id, isAllowed)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                                isAllowed
                                  ? "bg-emerald-500 text-white hover:bg-emerald-600 ring-2 ring-emerald-200"
                                  : "bg-slate-200 text-slate-600 hover:bg-slate-300 ring-1 ring-slate-300"
                              }`}
                            >
                              <span
                                className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                                  isAllowed ? "translate-x-0.5" : "-translate-x-0.5"
                                }`}
                              />
                              <span>{isAllowed ? "ON" : "OFF"}</span>
                            </button>
                          </td>
                        );
                      })
                    ) : (
                      filteredAccounts.map((acct) => {
                        const isAllowed = getEffectiveCapability("account", acct.email, tab.id, matrixData, realAccounts);
                        return (
                          <td key={acct.id} className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle("account", acct.email, tab.id, isAllowed)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer shadow-2xs ${
                                isAllowed
                                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full bg-white transition-transform ${
                                  isAllowed ? "translate-x-0.5" : "-translate-x-0.5"
                                }`}
                              />
                              <span>{isAllowed ? "ON" : "OFF"}</span>
                            </button>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}

                {/* SECTION 2: IN-TAB FEATURES */}
                <tr className="bg-amber-50/40 border-y border-amber-100">
                  <td
                    colSpan={viewMode === "role" ? roleTiers.length + 1 : filteredAccounts.length + 1}
                    className="py-2.5 px-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                        <Sliders size={16} className="text-amber-700" />
                        <span>IN-TAB OPERATIONAL FEATURES ({filteredInTabFeatures.length} Granular Tools)</span>
                      </div>
                      <span className="text-[11px] font-medium text-amber-700 hidden sm:inline">
                        Dependent features are automatically gated if their parent module is disabled
                      </span>
                    </div>
                  </td>
                </tr>

                {filteredInTabFeatures.map((feature) => (
                  <tr key={feature.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-5">
                      <div className="flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300 shrink-0 mt-0.5">
                          FEATURE
                        </span>
                        <div>
                          <div className="font-extrabold text-slate-900 text-xs">
                            {feature.label}
                          </div>
                          <div className="text-[9px] font-bold text-amber-700 mt-0.5 flex items-center gap-1">
                            <span className="text-slate-400">PARENT MODULE:</span>
                            <span className="px-1 py-0.2 rounded bg-amber-50 border border-amber-200">
                              {feature.belongsToLabel}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            {feature.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {viewMode === "role" ? (
                      roleTiers.map((tier) => {
                        const parentAllowed = getEffectiveCapability("role", tier.id, feature.parentTab, matrixData, realAccounts);
                        const isAllowed = getEffectiveCapability("role", tier.id, feature.id, matrixData, realAccounts);

                        if (!parentAllowed) {
                          return (
                            <td key={tier.id} className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggle("role", tier.id, feature.id, false, feature.parentTab)}
                                className="inline-flex flex-col items-center gap-1 cursor-pointer group"
                                title="Click to enable both parent module and this feature"
                              >
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-700 border border-slate-200 transition">
                                  <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-emerald-500" />
                                  <span>OFF</span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                  <AlertTriangle size={9} />
                                  <span>Parent Disabled</span>
                                </span>
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td key={tier.id} className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle("role", tier.id, feature.id, isAllowed, feature.parentTab)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-2xs ${
                                isAllowed
                                  ? "bg-emerald-500 text-white hover:bg-emerald-600 ring-2 ring-emerald-200"
                                  : "bg-slate-200 text-slate-600 hover:bg-slate-300 ring-1 ring-slate-300"
                              }`}
                            >
                              <span
                                className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                                  isAllowed ? "translate-x-0.5" : "-translate-x-0.5"
                                }`}
                              />
                              <span>{isAllowed ? "ON" : "OFF"}</span>
                            </button>
                          </td>
                        );
                      })
                    ) : (
                      filteredAccounts.map((acct) => {
                        const parentAllowed = getEffectiveCapability("account", acct.email, feature.parentTab, matrixData, realAccounts);
                        const isAllowed = getEffectiveCapability("account", acct.email, feature.id, matrixData, realAccounts);

                        if (!parentAllowed) {
                          return (
                            <td key={acct.id} className="py-3 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggle("account", acct.email, feature.id, false, feature.parentTab)}
                                className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-700 hover:text-emerald-700 bg-amber-50 hover:bg-emerald-50 border border-amber-200 hover:border-emerald-300 px-1.5 py-0.5 rounded cursor-pointer transition"
                                title="Parent module is disabled. Click to enable both parent module and feature."
                              >
                                Tab Disabled
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td key={acct.id} className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle("account", acct.email, feature.id, isAllowed, feature.parentTab)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black transition-all cursor-pointer shadow-2xs ${
                                isAllowed
                                  ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full bg-white transition-transform ${
                                  isAllowed ? "translate-x-0.5" : "-translate-x-0.5"
                                }`}
                              />
                              <span>{isAllowed ? "ON" : "OFF"}</span>
                            </button>
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
