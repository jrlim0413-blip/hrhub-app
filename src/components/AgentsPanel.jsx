import { useState, useEffect, useMemo } from "react";
import { AlertCircle, Bot, Download, LoaderCircle, RefreshCw, Search, Users, MapPin, Store, Building2, ChevronLeft, ChevronRight, ShieldCheck, ChevronDown } from "lucide-react";
import AgentProfile from "./AgentProfile";
import {
  ENTITY_METADATA,
  matchesCompanyEntity,
  isGlobalAccessUser,
  getUserAssignedStlEntity
} from "../lib/companyEntities";
import {
  getStlAgents,
  getStlSupervisors,
  fetchLiveStlData,
  matchStlCanonicalName,
  STL_ONLY_SUBSIDIARIES,
  isStlEntity
} from "../lib/stlApiLiveService";
import SOURCE_API_CACHE from "../data/sourceApiAgentsCache.json";

function getAgentList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.agents)) return payload.agents;
  if (Array.isArray(payload?.results)) return payload.results;
  if (payload && typeof payload === "object") return [payload];
  return [];
}

function getSupervisorList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.supervisors)) return payload.supervisors;
  if (Array.isArray(payload?.results)) return payload.results;
  if (payload && typeof payload === "object") return [payload];
  return [];
}

function getBarangayList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.barangays)) return payload.barangays;
  if (Array.isArray(payload?.results)) return payload.results;
  if (payload && typeof payload === "object") return [payload];
  return [];
}

function getAgentName(agent, index) {
  return agent.name || agent.full_name || agent.fullName || agent.username || agent.email || `Agent ${index + 1}`;
}

function isAgentActive(agent) {
  if (!agent) return false;
  if (agent.deleted_at) return false;

  // Primary API property (0 or 1, or boolean)
  if (agent.isActive !== undefined && agent.isActive !== null) {
    if ([0, "0", false, "false", "inactive", "disabled"].includes(agent.isActive)) return false;
    if ([1, "1", true, "true", "active", "enabled"].includes(agent.isActive)) return true;
  }

  // Secondary checks
  if (agent.is_active !== undefined && agent.is_active !== null) {
    if ([0, "0", false, "false", "inactive", "disabled"].includes(agent.is_active)) return false;
    if ([1, "1", true, "true", "active", "enabled"].includes(agent.is_active)) return true;
  }

  const status = agent.status ?? agent.account_status ?? agent.accountStatus ?? agent.active;
  if (status !== undefined && status !== null && status !== "") {
    const normalizedStatus = String(status).toLowerCase().trim();
    if (["0", "false", "inactive", "disabled", "suspended", "deactivated", "terminated"].includes(normalizedStatus)) {
      return false;
    }
    if (["1", "true", "active", "enabled"].includes(normalizedStatus)) {
      return true;
    }
  }

  return false;
}

function getAgentStatus(agent) {
  return isAgentActive(agent) ? "active" : "inactive";
}

export default function AgentsPanel({ onClose, currentUser = null }) {
  const activeUser = useMemo(() => {
    if (currentUser) return currentUser;
    try {
      const raw = localStorage.getItem("hrhub_auth_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [currentUser]);

  const userEntityScope = useMemo(() => {
    return getUserAssignedStlEntity(activeUser);
  }, [activeUser]);

  const isGlobalUser = !userEntityScope;

  const [baseAgents, setBaseAgents] = useState(() => getStlAgents());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'
  const [selectedEntity, setSelectedEntity] = useState(() => {
    const scope = getUserAssignedStlEntity(activeUser);
    return scope && !scope.isNonStl ? scope.canonicalName : "all";
  });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [supervisors, setSupervisors] = useState(() => getStlSupervisors());
  const [visibleCount, setVisibleCount] = useState(60);

  // Enforce entity locking for scoped branch users (e.g. Imperial Gaming sees only Imperial)
  useEffect(() => {
    if (userEntityScope && !userEntityScope.isNonStl && selectedEntity !== userEntityScope.canonicalName) {
      setSelectedEntity(userEntityScope.canonicalName);
    }
  }, [userEntityScope, selectedEntity]);

  const loadAgents = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetchLiveStlData();
      if (res.agents && res.agents.length > 0) {
        setBaseAgents(res.agents);
      }
      if (res.supervisors && res.supervisors.length > 0) {
        setSupervisors(res.supervisors);
      }
      setLoaded(true);
    } catch (requestError) {
      console.warn("Could not fetch live agents from API, using cached data:", requestError);
      if (!baseAgents || baseAgents.length === 0) {
        setError(requestError.message || "Unable to load agents.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  // Reset pagination limit on filter change
  useEffect(() => {
    setVisibleCount(60);
  }, [searchTerm, statusFilter, selectedEntity]);

  // Unified all real STL agents
  const allCombinedAgents = useMemo(() => {
    return baseAgents || [];
  }, [baseAgents]);

  // Combined Supervisors lookup with company-scoped composite key to prevent cross-entity ID collisions
  const allSupervisors = useMemo(() => {
    const map = new Map();
    (supervisors || []).forEach((s) => {
      const canonicalComp = matchStlCanonicalName(s.company || s.companyName || s.companyShort);
      const compositeKey = `${canonicalComp}_${s.id}`;
      map.set(compositeKey, s);
      if (!map.has(String(s.id))) {
        map.set(String(s.id), s);
      }
    });
    return map;
  }, [supervisors]);

  // Combined Barangays lookup
  const allBarangays = useMemo(() => {
    const map = new Map();
    (SOURCE_API_CACHE?.barangays || []).forEach((b) => map.set(String(b.id), b));
    return map;
  }, []);

  // STL-Only Entities list for tabs (Excluding non-STL)
  const entityTabList = useMemo(() => {
    const targetSubs = userEntityScope && !userEntityScope.isNonStl
      ? [userEntityScope.canonicalName]
      : STL_ONLY_SUBSIDIARIES;

    return targetSubs.map((name) => {
      const meta = ENTITY_METADATA[name] || {};
      const count = allCombinedAgents.filter((a) => matchesCompanyEntity(a.company, name)).length;
      return {
        id: name,
        name,
        shortName: meta.shortName || name,
        logoUrl: meta.logoUrl || null,
        count
      };
    });
  }, [allCombinedAgents, userEntityScope]);

  const activeCount = allCombinedAgents.filter((a) => {
    if (selectedEntity !== "all" && !matchesCompanyEntity(a.company, selectedEntity)) return false;
    return isAgentActive(a);
  }).length;

  const currentEntityTotal = allCombinedAgents.filter((a) => {
    if (selectedEntity !== "all" && !matchesCompanyEntity(a.company, selectedEntity)) return false;
    return true;
  }).length;

  const inactiveCount = currentEntityTotal - activeCount;

  const getSupervisorName = (supervisorId, agentOrCompany = null) => {
    if (!supervisorId && supervisorId !== 0) return "Field Coordinator";

    let companyRaw = "";
    if (typeof agentOrCompany === "string") {
      companyRaw = agentOrCompany;
    } else if (agentOrCompany && typeof agentOrCompany === "object") {
      companyRaw = agentOrCompany.company || agentOrCompany.companyName || agentOrCompany.companyShort || "";
    } else if (selectedEntity && selectedEntity !== "all") {
      companyRaw = selectedEntity;
    }

    if (companyRaw) {
      const canonicalComp = matchStlCanonicalName(companyRaw);
      const compositeKey = `${canonicalComp}_${supervisorId}`;
      const spvr = allSupervisors.get(compositeKey);
      if (spvr) {
        return spvr.fullName || spvr.full_name || spvr.name || `Supervisor #${supervisorId}`;
      }
    }

    const supervisor = allSupervisors.get(String(supervisorId));
    return supervisor?.fullName || supervisor?.full_name || supervisor?.name || `Supervisor #${supervisorId}`;
  };

  const filteredAgents = allCombinedAgents.filter((agent) => {
    if (selectedEntity !== "all") {
      if (!matchesCompanyEntity(agent.company, selectedEntity)) return false;
    }

    const spvrName = getSupervisorName(agent.supervisor, agent);
    const searchableText = `${agent.fullName || agent.name || ""} ${agent.username || ""} ${agent.outlet || ""} ${agent.location || ""} ${agent.address || ""} ${agent.company || ""} ${spvrName}`.toLowerCase();
    const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
    const isActive = isAgentActive(agent);

    if (statusFilter === "inactive") {
      if (isActive) return false;
    } else if (statusFilter === "active") {
      if (!isActive) return false;
    }

    return matchesSearch;
  });

  const getBarangayName = (barangayId, agent = null) => {
    if (agent?.barangayName) return agent.barangayName;
    if (agent?.barangay) return agent.barangay;
    if (agent?.location) return agent.location;
    if (!barangayId) return agent?.address || "Operating Sector";
    const barangay = allBarangays.get(String(barangayId));
    return barangay?.name || agent?.address || "Operating Sector";
  };

  // Download list of agents (Name, Company, and Status only)
  const handleDownload = () => {
    if (!filteredAgents || filteredAgents.length === 0) return;

    const headers = ["#", "Agent Name", "Entity / Subsidiary", "Outlet", "Status"];
    const rows = filteredAgents.map((agent, idx) => {
      const name = getAgentName(agent, idx).replace(/"/g, '""');
      const company = (agent.company || "Lucky Betplay Corporation").replace(/"/g, '""');
      const outlet = (agent.outlet || "").replace(/"/g, '""');
      const status = isAgentActive(agent) ? "Active" : "Inactive";
      return `"${idx + 1}","${name}","${company}","${outlet}","${status}"`;
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    const statusLabel = statusFilter === "inactive" ? "Inactive" : "Active";
    link.href = url;
    link.download = `Agents_${selectedEntity === "all" ? "All_Entities" : selectedEntity}_${statusLabel}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-2xs antialiased">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">Agents Directory</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {loaded ? (
                <>
                  <span className="font-bold text-emerald-700">{activeCount} Active</span>
                  {" · "}
                  <span className="font-semibold text-slate-500">{inactiveCount} Inactive</span>
                  {" · "}
                  <span className="text-slate-400">Total: {currentEntityTotal} {selectedEntity === "all" ? "across all entities" : `in ${selectedEntity}`}</span>
                </>
              ) : (
                "View agents connected to this enterprise"
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadAgents}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 shadow-2xs"
          >
            {loading ? <LoaderCircle size={12} className="animate-spin" /> : loaded ? <RefreshCw size={12} /> : <Users size={12} />}
            <span>{loading ? "Loading..." : "Refresh"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close agents panel"
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            ×
          </button>
        </div>
      </div>

      {/* Multi-Entity Carousel / Tabs Bar (STL Subsidiaries Only) */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
        {isGlobalUser ? (
          <button
            type="button"
            onClick={() => setSelectedEntity("all")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap shadow-2xs shrink-0 cursor-pointer ${
              selectedEntity === "all"
                ? "bg-slate-900 text-white ring-1 ring-slate-800 shadow-2xs"
                : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <Building2 size={12} className={selectedEntity === "all" ? "text-emerald-400" : "text-slate-400"} />
            <span>All STL Entities</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${selectedEntity === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {allCombinedAgents.length}
            </span>
          </button>
        ) : (
          userEntityScope && !userEntityScope.isNonStl && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold shrink-0">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Assigned Branch Scope:</span>
            </div>
          )
        )}

        {entityTabList.map((ent) => {
          const isSelected = selectedEntity === ent.id;
          return (
            <button
              key={ent.id}
              type="button"
              onClick={() => {
                if (isGlobalUser) {
                  setSelectedEntity(ent.id);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition whitespace-nowrap shadow-2xs shrink-0 ${
                isGlobalUser ? "cursor-pointer" : "cursor-default"
              } ${
                isSelected
                  ? "bg-slate-900 text-white ring-1 ring-slate-800 shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {ent.logoUrl ? (
                <img src={ent.logoUrl} alt={ent.shortName} className="w-3.5 h-3.5 rounded object-contain shrink-0" />
              ) : (
                <Building2 size={12} className={isSelected ? "text-emerald-400" : "text-slate-400"} />
              )}
              <span>{ent.shortName}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-100 text-slate-600"}`}>
                {ent.count}
              </span>
            </button>
          );
        })}
      </div>

      {userEntityScope?.isNonStl && (
        <div className="mt-4 p-8 text-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 space-y-2">
          <Building2 size={32} className="mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-800">{userEntityScope.canonicalName}</h3>
          <p className="text-xs max-w-md mx-auto text-slate-500">
            Agents Directory is exclusive to PCSO STL Authorized Operating Entities. Your account is assigned to a Non-STL entity.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Unable to load live agents</p>
            <p className="mt-0.5 text-[11px]">{error}. Displaying pre-cached and multi-entity roster.</p>
          </div>
        </div>
      )}

      {/* Filter Row: Search, Active/Inactive Tabs, Download */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={`Search ${selectedEntity === "all" ? "all" : selectedEntity} agents by name, username, outlet, or sector...`}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-emerald-500 focus:bg-white transition"
          />
        </label>

        {/* All, Active & Inactive Filter Tabs */}
        <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100/90 p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
              statusFilter === "all"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>All</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${statusFilter === "all" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {currentEntityTotal}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
              statusFilter === "active"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Active</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${statusFilter === "active" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
              statusFilter === "inactive"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Inactive</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${statusFilter === "inactive" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"}`}>
              {inactiveCount}
            </span>
          </button>
        </div>

        {/* Download Button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={filteredAgents.length === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 shadow-2xs transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
          title="Download filtered agents roster"
        >
          <Download size={12} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {/* Agents Card Grid */}
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.slice(0, visibleCount).map((agent, index) => {
          const entityMeta = ENTITY_METADATA[agent.company] || {};
          const isAct = isAgentActive(agent);

          return (
            <button
              type="button"
              key={agent.id || agent.uuid || index}
              onClick={() => setSelectedAgent({ agent, index })}
              className="rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 text-left transition hover:border-emerald-300 hover:shadow-2xs cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-emerald-400 shrink-0">
                    {getAgentName(agent, index).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-xs font-bold text-slate-900">{getAgentName(agent, index)}</h4>
                    <p className="truncate text-[10px] text-slate-400 font-mono">@{agent.username || `agent_${agent.id}`}</p>
                  </div>
                  <span className={`ml-auto rounded-full px-1.5 py-0.2 text-[8.5px] font-bold shrink-0 ${isAct ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                    {isAct ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Entity Badge */}
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-1.5 py-0.2 rounded truncate">
                    <Building2 size={9} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{agent.company || "Lucky Betplay Corporation"}</span>
                  </span>
                </div>

                {agent.outlet && (
                  <p className="mt-1.5 truncate text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                    <Store size={11} className="shrink-0 text-emerald-600" />
                    <span className="truncate">{agent.outlet}</span>
                  </p>
                )}

                {agent.location && (
                  <p className="mt-0.5 truncate text-[10px] text-slate-500 flex items-center gap-1">
                    <MapPin size={11} className="shrink-0 text-rose-500" />
                    <span className="truncate">Location: <span className="font-semibold text-slate-700">{agent.location}</span></span>
                  </p>
                )}

                {agent.supervisor !== undefined && agent.supervisor !== null && (
                  <p className="mt-0.5 truncate text-[10px] text-slate-400">
                    Supervisor: <span className="font-semibold text-slate-600">{getSupervisorName(agent.supervisor, agent)}</span>
                  </p>
                )}
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-emerald-700 font-bold">
                <span>View Profile &amp; ID</span>
                <span>→</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pagination / Load More Bar */}
      {filteredAgents.length > visibleCount && (
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
          <span className="text-slate-500 text-[11px] font-medium">
            Showing <strong className="text-slate-800 font-bold">{visibleCount}</strong> of <strong className="text-slate-800 font-bold">{filteredAgents.length}</strong> real STL agents
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => Math.min(prev + 60, filteredAgents.length))}
              className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition flex items-center gap-1 cursor-pointer"
            >
              <ChevronDown size={12} />
              <span>Load 60 More</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibleCount(filteredAgents.length)}
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              Show All ({filteredAgents.length})
            </button>
          </div>
        </div>
      )}

      {filteredAgents.length === 0 && (
        <div className="mt-3 rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-500">
          No personnel found under {selectedEntity === "all" ? "any entity" : selectedEntity} matching your search filter.
        </div>
      )}

      {selectedAgent && (
        <AgentProfile
          agent={selectedAgent.agent}
          index={selectedAgent.index}
          supervisorName={getSupervisorName(selectedAgent.agent.supervisor, selectedAgent.agent)}
          barangayName={getBarangayName(selectedAgent.agent?.brgyId, selectedAgent.agent)}
          onSave={(updatedAgent) => {
            setBaseAgents((currentAgents) => currentAgents.map((currentAgent) => (
              currentAgent.id === updatedAgent.id ? updatedAgent : currentAgent
            )));
            setSelectedAgent((currentSelection) => ({ ...currentSelection, agent: updatedAgent }));
          }}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}
