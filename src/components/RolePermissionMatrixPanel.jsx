import { useState, useEffect } from "react";
import {
  ShieldCheck, RotateCcw, Cloud, CloudCheck, CheckCircle2,
  Users, User, AlertTriangle, Sparkles, Sliders, Info, ShieldAlert,
  ChevronDown, ChevronRight, Lock, Check, Layers
} from "lucide-react";
import {
  ROLE_TIERS,
  SPECIFIC_ACCOUNTS,
  WORKSPACE_TABS_CONFIG,
  IN_TAB_FEATURES_CONFIG,
  getRbacMatrixData,
  saveRbacMatrixData,
  resetRbacMatrixToDefaults,
  toggleCapability,
  getEffectiveCapability,
  syncMatrixToCloud
} from "../lib/rbacStorage";

export default function RolePermissionMatrixPanel({ onClose }) {
  const [matrixData, setMatrixData] = useState(() => getRbacMatrixData());
  const [viewMode, setViewMode] = useState("role"); // "role" | "account"
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState("Cloud Synced Online");
  const [toastMessage, setToastMessage] = useState("");

  // Sync state with storage events
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) {
        setMatrixData(e.detail);
      }
    };
    window.addEventListener("hrhub_rbac_updated", handleUpdate);
    return () => window.removeEventListener("hrhub_rbac_updated", handleUpdate);
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // Handle toggle switch click
  const handleToggle = (type, targetId, capId, currentValue, parentTabKey = null) => {
    // If parent tab is disabled, prevent enabling feature
    if (parentTabKey) {
      const parentAllowed = getEffectiveCapability(type, targetId, parentTabKey, matrixData);
      if (!parentAllowed && !currentValue) {
        showToast("⚠️ Cannot enable feature while parent workspace tab is disabled.");
        return;
      }
    }

    const nextVal = !currentValue;
    const updated = toggleCapability(type, targetId, capId, nextVal);
    setMatrixData({ ...updated });
    showToast(`Permission updated for ${targetId.toUpperCase()} (${nextVal ? "ENABLED" : "DISABLED"})`);
  };

  // Reset defaults handler
  const handleResetDefaults = () => {
    if (window.confirm("Reset all role & account permissions back to standard defaults?")) {
      const reset = resetRbacMatrixToDefaults();
      setMatrixData({ ...reset });
      showToast("Reset to factory RBAC defaults successfully.");
    }
  };

  // Cloud Sync handler
  const handleSyncCloud = async () => {
    setIsSyncing(true);
    setSyncStatusText("Syncing to Cloud...");
    const res = await syncMatrixToCloud();
    setIsSyncing(false);
    setSyncStatusText(`Cloud Synced Online (${res.timestamp})`);
    showToast("Matrix successfully synced to database cloud storage.");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER & CLOUD SYNC ACTIONS                                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Role & Account Capabilities Matrix
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Configure operational permissions by role tier or customize access specifically per individual account.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Cloud Synced Online Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{syncStatusText}</span>
          </div>

          {/* Sync Cloud Button */}
          <button
            type="button"
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Cloud size={14} className={isSyncing ? "animate-spin text-emerald-600" : "text-slate-500"} />
            <span>{isSyncing ? "Syncing..." : "Sync Cloud"}</span>
          </button>

          {/* Reset Defaults Button */}
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition shadow-2xs cursor-pointer"
          >
            <RotateCcw size={14} className="text-slate-500" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUB-BAR: TABS SWITCHER (By Role Tier vs By Specific Account)            */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode("role")}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              viewMode === "role"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users size={14} />
            <span>By Role Tier ({ROLE_TIERS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("account")}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
              viewMode === "account"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <User size={14} />
            <span>By Specific Account ({SPECIFIC_ACCOUNTS.length})</span>
          </button>
        </div>

        <div className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
          <span className="text-amber-500 font-black">⚡</span>
          <span>
            {viewMode === "role"
              ? "Toggling a capability updates all accounts assigned to the role tier"
              : "Individual account overrides will take precedence over role tier defaults"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CAPABILITIES MATRIX MAIN TABLE CONTAINER                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[960px]">
            {/* TABLE HEADER (COLUMNS) */}
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70">
                <th className="py-4 px-5 text-[11px] font-black uppercase tracking-wider text-slate-500 w-[300px]">
                  System Capability
                </th>

                {viewMode === "role" ? (
                  ROLE_TIERS.map((tier) => (
                    <th key={tier.id} className="py-4 px-4 text-center min-w-[160px]">
                      <div className="inline-flex flex-col items-center">
                        <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${tier.badgeBg}`}>
                          {tier.id === "system_admin" && <ShieldCheck size={13} className="text-emerald-700" />}
                          {tier.id === "terminal_staff" && <User size={13} className="text-teal-700" />}
                          {tier.id === "head_cashier" && <Sliders size={13} className="text-blue-700" />}
                          {tier.id === "branch_supervisor" && <Users size={13} className="text-amber-700" />}
                          <span>{tier.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                          {tier.countText}
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap justify-center">
                          {tier.accounts.map((acct) => (
                            <span
                              key={acct}
                              className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-200/80 text-slate-700 border border-slate-300"
                            >
                              {acct}
                            </span>
                          ))}
                        </div>
                      </div>
                    </th>
                  ))
                ) : (
                  SPECIFIC_ACCOUNTS.map((acct) => (
                    <th key={acct.id} className="py-3 px-3 text-center min-w-[130px]">
                      <div className="inline-flex flex-col items-center">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-900 text-emerald-400 border border-slate-800 shadow-2xs">
                          {acct.badge}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[120px] mt-1">
                          {acct.name}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate max-w-[120px]">
                          {acct.company}
                        </span>
                      </div>
                    </th>
                  ))
                )}
              </tr>
            </thead>

            {/* TABLE BODY */}
            <tbody className="divide-y divide-slate-100 text-xs">
              {/* ========================================================================= */}
              {/* SECTION 1: WORKSPACE TABS (Sidebar Navigation)                            */}
              {/* ========================================================================= */}
              <tr className="bg-emerald-50/40 border-y border-emerald-100">
                <td colSpan={viewMode === "role" ? ROLE_TIERS.length + 1 : SPECIFIC_ACCOUNTS.length + 1} className="py-2.5 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xs text-emerald-900">
                      <Layers size={16} className="text-emerald-700" />
                      <span>WORKSPACE TABS (Sidebar Navigation)</span>
                    </div>
                    <span className="text-[11px] font-medium text-emerald-700 hidden sm:inline">
                      Controls which workspace menus appear in the left sidebar navigation
                    </span>
                  </div>
                </td>
              </tr>

              {WORKSPACE_TABS_CONFIG.map((tab) => (
                <tr key={tab.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 mt-0.5">
                        TAB
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
                    ROLE_TIERS.map((tier) => {
                      const isAllowed = getEffectiveCapability("role", tier.id, tab.id, matrixData);
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
                    SPECIFIC_ACCOUNTS.map((acct) => {
                      const isAllowed = getEffectiveCapability("account", acct.id, tab.id, matrixData);
                      return (
                        <td key={acct.id} className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle("account", acct.id, tab.id, isAllowed)}
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

              {/* ========================================================================= */}
              {/* SECTION 2: IN-TAB FEATURES (Operations & Tools Inside Tabs)                */}
              {/* ========================================================================= */}
              <tr className="bg-amber-50/40 border-y border-amber-100">
                <td colSpan={viewMode === "role" ? ROLE_TIERS.length + 1 : SPECIFIC_ACCOUNTS.length + 1} className="py-2.5 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                      <Sliders size={16} className="text-amber-700" />
                      <span>IN-TAB FEATURES (Operations & Tools Inside Tabs)</span>
                    </div>
                    <span className="text-[11px] font-medium text-amber-700 hidden sm:inline">
                      Operational actions and tools inside workspaces. Cannot be enabled if parent tab is disabled.
                    </span>
                  </div>
                </td>
              </tr>

              {IN_TAB_FEATURES_CONFIG.map((feature) => (
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
                          <span className="text-slate-400">BELONGS TO:</span>
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
                    ROLE_TIERS.map((tier) => {
                      const parentAllowed = getEffectiveCapability("role", tier.id, feature.parentTab, matrixData);
                      const isAllowed = getEffectiveCapability("role", tier.id, feature.id, matrixData);

                      if (!parentAllowed) {
                        return (
                          <td key={tier.id} className="py-3 px-4 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                                <span>OFF</span>
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                <AlertTriangle size={9} />
                                <span>Tab Disabled</span>
                              </span>
                            </div>
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
                    SPECIFIC_ACCOUNTS.map((acct) => {
                      const parentAllowed = getEffectiveCapability("account", acct.id, feature.parentTab, matrixData);
                      const isAllowed = getEffectiveCapability("account", acct.id, feature.id, matrixData);

                      if (!parentAllowed) {
                        return (
                          <td key={acct.id} className="py-3 px-2 text-center">
                            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded">
                              Tab Disabled
                            </span>
                          </td>
                        );
                      }

                      return (
                        <td key={acct.id} className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggle("account", acct.id, feature.id, isAllowed, feature.parentTab)}
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
    </div>
  );
}
