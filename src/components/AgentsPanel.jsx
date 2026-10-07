import { useState } from "react";
import { AlertCircle, Bot, Download, LoaderCircle, RefreshCw, Search, Users } from "lucide-react";
import AgentProfile from "./AgentProfile";

const DEFAULT_AGENTS_URL = "https://stl-mandaue-api.com/api/accountant/teller?id=2";
const DEFAULT_SUPERVISORS_URL = "https://stl-mandaue-api.com/api/accountant/supervisor?id=2";
const DEFAULT_BARANGAYS_URL = "https://stl-mandaue-api.com/api/admin/barangay";

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

function getAgentDetails(agent) {
  return agent.role || agent.position || agent.title || agent.department || agent.email || "Agent profile";
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

export default function AgentsPanel({ onClose }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  // Default is 'active', no 'all' status
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [barangays, setBarangays] = useState([]);

  const loadAgents = async () => {
    setLoading(true);
    setError("");

    try {
      const token = import.meta.env.VITE_AGENTS_API_TOKEN;
      if (!token) {
        throw new Error("Missing VITE_AGENTS_API_TOKEN in .env.local");
      }

      const headers = { Accept: "application/json" };
      headers.Authorization = `Bearer ${token}`;

      const [agentsResponse, supervisorsResponse, barangaysResponse] = await Promise.all([
        fetch(import.meta.env.VITE_AGENTS_API_URL || DEFAULT_AGENTS_URL, { headers }),
        fetch(import.meta.env.VITE_SUPERVISORS_API_URL || DEFAULT_SUPERVISORS_URL, { headers }),
        fetch(import.meta.env.VITE_BARANGAYS_API_URL || DEFAULT_BARANGAYS_URL, { headers })
      ]);
      if (!agentsResponse.ok) throw new Error(`Agents API returned ${agentsResponse.status}`);
      if (!supervisorsResponse.ok) throw new Error(`Supervisors API returned ${supervisorsResponse.status}`);
      if (!barangaysResponse.ok) throw new Error(`Barangays API returned ${barangaysResponse.status}`);

      const [payload, supervisorsPayload, barangaysPayload] = await Promise.all([
        agentsResponse.json(),
        supervisorsResponse.json(),
        barangaysResponse.json()
      ]);
      setSupervisors(getSupervisorList(supervisorsPayload));
      setBarangays(getBarangayList(barangaysPayload));
      setAgents(getAgentList(payload));
      setLoaded(true);
    } catch (requestError) {
      setError(requestError.message || "Unable to load agents.");
      setAgents([]);
      setSupervisors([]);
      setBarangays([]);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = agents.filter((a) => isAgentActive(a)).length;
  const inactiveCount = agents.length - activeCount;

  const filteredAgents = agents.filter((agent) => {
    const searchableText = JSON.stringify(agent).toLowerCase();
    const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
    const isActive = isAgentActive(agent);

    // Active at Inactive lamang, walang 'all'
    if (statusFilter === "inactive") {
      if (isActive) return false;
    } else {
      // Default: active lamang, hindi ipinapakita ang inactive
      if (!isActive) return false;
    }

    return matchesSearch;
  });

  const getSupervisorName = (supervisorId) => {
    const supervisor = supervisors.find((record) => String(record.id) === String(supervisorId));
    return supervisor?.fullName || supervisor?.full_name || supervisor?.name || "Supervisor not found";
  };

  const getBarangayName = (barangayId) => {
    const barangay = barangays.find((record) => String(record.id) === String(barangayId));
    return barangay?.name || "Barangay not found";
  };

  // Download list of agents (Name and Status only)
  const handleDownload = () => {
    if (!filteredAgents || filteredAgents.length === 0) return;

    const headers = ["#", "Agent Name", "Status"];
    const rows = filteredAgents.map((agent, idx) => {
      const name = getAgentName(agent, idx).replace(/"/g, '""');
      const status = isAgentActive(agent) ? "Active" : "Inactive";
      return `"${idx + 1}","${name}","${status}"`;
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    const statusLabel = statusFilter === "inactive" ? "Inactive" : "Active";
    link.href = url;
    link.download = `Agents_${statusLabel}_List_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Agents directory</h3>
            <p className="text-[11px] text-slate-500">
              {loaded ? (
                <>
                  <span className="font-bold text-emerald-600">{activeCount} Active</span>
                  {" · "}
                  <span className="font-semibold text-slate-500">{inactiveCount} Inactive</span>
                </>
              ) : (
                "View agents connected to this workspace"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={loadAgents} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-emerald-400 transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60">
            {loading ? <LoaderCircle size={14} className="animate-spin" /> : loaded ? <RefreshCw size={14} /> : <Users size={14} />}
            {loading ? "Loading agents" : loaded ? "Refresh agents" : "View agents"}
          </button>
          <button type="button" onClick={onClose} aria-label="Close agents panel" className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Unable to load agents</p>
            <p className="mt-0.5">{error}. Check the API URL, token, and CORS settings.</p>
          </div>
        </div>
      )}

      {loaded && !error && agents.length === 0 && (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">No agents were returned by the API.</p>
      )}

      {agents.length > 0 && (
        <>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search agents..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs outline-none focus:border-emerald-500" />
            </label>

            {/* Active & Inactive Filter Tabs Only (No "All statuses") */}
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/90 p-1 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("active")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === "active"
                  ? "bg-emerald-500 text-slate-950 shadow-xs"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                  }`}
              >
                <span>Active</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${statusFilter === "active" ? "bg-slate-950/20 text-slate-950" : "bg-slate-200 text-slate-700"
                  }`}>
                  {activeCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter("inactive")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${statusFilter === "inactive"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                  }`}
              >
                <span>Inactive</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${statusFilter === "inactive" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                  {inactiveCount}
                </span>
              </button>
            </div>

            {/* Download Button (Name & Status only) */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={filteredAgents.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-emerald-400 shadow-xs transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
              title="Download agents list (Name & Status only)"
            >
              <Download size={14} />
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent, index) => (
              <button type="button" key={agent.id || agent.uuid || index} onClick={() => setSelectedAgent({ agent, index })} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-emerald-400">
                    {getAgentName(agent, index).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-xs font-bold text-slate-900">{getAgentName(agent, index)}</h4>
                    <p className="truncate text-[10px] text-slate-500">{getAgentDetails(agent)}</p>
                  </div>
                  <span className={`ml-auto rounded-full px-2 py-1 text-[9px] font-bold ${getAgentStatus(agent) === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                    {getAgentStatus(agent) === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                {agent.email && <p className="mt-3 truncate text-[10px] text-slate-500">{agent.email}</p>}
                {agent.supervisor !== undefined && <p className="mt-2 truncate text-[10px] text-slate-500">Supervisor: <span className="font-semibold text-slate-700">{getSupervisorName(agent.supervisor)}</span></p>}
                <p className="mt-2 text-[10px] font-bold text-emerald-700">View profile</p>
              </button>
            ))}
          </div>
          {filteredAgents.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">No agents match your filters.</p>}
        </>
      )}

      {selectedAgent && <AgentProfile
        agent={selectedAgent.agent}
        index={selectedAgent.index}
        supervisorName={getSupervisorName(selectedAgent.agent.supervisor)}
        barangayName={getBarangayName(selectedAgent.agent.brgyId)}
        onSave={(updatedAgent) => {
          setAgents((currentAgents) => currentAgents.map((currentAgent) => (
            currentAgent.id === updatedAgent.id ? updatedAgent : currentAgent
          )));
          setSelectedAgent((currentSelection) => ({ ...currentSelection, agent: updatedAgent }));
        }}
        onClose={() => setSelectedAgent(null)}
      />}
    </div>
  );
}
