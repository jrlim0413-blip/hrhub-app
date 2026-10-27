import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Database,
  ExternalLink,
  Flame,
  Globe,
  KeyRound,
  Layers,
  Link2,
  LoaderCircle,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Video,
  Wrench,
  X,
  Zap
} from "lucide-react";
import {
  getAreaConfigs,
  getAreaConfigById,
  saveAreaConfigs,
  addAreaConfig,
  updateAreaConfig,
  deleteAreaConfig,
  getSelectedAreaId,
  setSelectedAreaId,
  testEndpointHealth,
  loadAreaConfigsFromCloud,
  DEFAULT_AREAS
} from "../lib/areaApiConfigStorage";
import { supabase } from "../lib/supabase";
import { API_CONFIG } from "../config/apiConfig";

const COMPANY_OPTIONS = [
  "Lucky Betplay Corporation",
  "5A Royal Gaming OPC",
  "Imperial Gaming OPC",
  "Glowing Fortune OPC",
  "Simpal Group of Companies",
  "SIMCON Corporation"
];

export default function ApiHealthConfigurationPanel() {
  const [areas, setAreas] = useState(() => getAreaConfigs());
  const [activeAreaId, setActiveAreaId] = useState(() => getSelectedAreaId());
  const [searchTerm, setSearchTerm] = useState("");
  const [activeViewTab, setActiveViewTab] = useState("areas"); // 'areas' | 'health'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [modalForm, setModalForm] = useState(getEmptyForm());
  const [formTesting, setFormTesting] = useState(false);
  const [formTestResult, setFormTestResult] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Health / Latency State
  const [healthResults, setHealthResults] = useState({});
  const [testingAll, setTestingAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Listen to external area config updates
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setAreas(e.detail);
      }
    };
    const handleAreaChange = (e) => {
      if (e.detail?.id) {
        setActiveAreaId(e.detail.id);
      }
    };

    window.addEventListener("hrhub_area_configs_updated", handleUpdate);
    window.addEventListener("hrhub_selected_area_changed", handleAreaChange);

    // Initial cloud load
    loadAreaConfigsFromCloud().then((cloudAreas) => {
      if (cloudAreas && cloudAreas.length > 0) {
        setAreas(cloudAreas);
      }
    });

    return () => {
      window.removeEventListener("hrhub_area_configs_updated", handleUpdate);
      window.removeEventListener("hrhub_selected_area_changed", handleAreaChange);
    };
  }, []);

  function getEmptyForm() {
    return {
      areaName: "",
      companyName: "Lucky Betplay Corporation",
      accountantId: "2",
      grossReportUrl: "https://stl-mandaue-api.com/api/accountant/TellerGrossPerDateRange?id=2",
      grossReportToken: "",
      activeTellersUrl: "https://stl-mandaue-api.com/api/accountant/ActiveTellers?id=2",
      activeTellersToken: "",
      supervisorUrl: "https://stl-mandaue-api.com/api/accountant/supervisor?id=2",
      supervisorToken: "",
      tellerBetUrl: "https://stl-mandaue-api.com/api/teller/bet",
      tellerBetToken: "",
      description: ""
    };
  }

  const handleOpenAddModal = () => {
    setEditingArea(null);
    setModalForm(getEmptyForm());
    setFormTestResult(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (area) => {
    setEditingArea(area);
    setModalForm({
      areaName: area.areaName || "",
      companyName: area.companyName || "Lucky Betplay Corporation",
      accountantId: area.accountantId || "2",
      grossReportUrl: area.grossReportUrl || "",
      grossReportToken: area.grossReportToken || "",
      activeTellersUrl: area.activeTellersUrl || "",
      activeTellersToken: area.activeTellersToken || "",
      supervisorUrl: area.supervisorUrl || "",
      supervisorToken: area.supervisorToken || "",
      tellerBetUrl: area.tellerBetUrl || "",
      tellerBetToken: area.tellerBetToken || "",
      description: area.description || ""
    });
    setFormTestResult(null);
    setModalOpen(true);
  };

  const handleTestModalForm = async () => {
    if (!modalForm.grossReportUrl) return;
    setFormTesting(true);
    setFormTestResult(null);

    try {
      const trimmed = modalForm.grossReportUrl.trim();
      const testUrl = new URL(trimmed);
      const effectiveId = modalForm.accountantId || testUrl.searchParams.get("id") || "2";
      testUrl.searchParams.set("id", effectiveId);
      testUrl.searchParams.set("from", new Date().toISOString().slice(0, 10));
      testUrl.searchParams.set("to", new Date().toISOString().slice(0, 10));

      const result = await testEndpointHealth({
        url: testUrl.toString(),
        token: (modalForm.grossReportToken || "").trim(),
        accountantId: effectiveId
      });

      setFormTesting(false);
      setFormTestResult(result);
    } catch (err) {
      setFormTesting(false);
      setFormTestResult({ ok: false, statusText: "Invalid URL: " + err.message });
    }
  };

  const handleSaveModalForm = async (e) => {
    e.preventDefault();
    if (!modalForm.areaName.trim()) {
      alert("Mangyaring maglagay ng Area / Location Name.");
      return;
    }

    setSaveLoading(true);
    try {
      if (editingArea) {
        await updateAreaConfig(editingArea.id, modalForm);
      } else {
        await addAreaConfig(modalForm);
      }
      setModalOpen(false);
    } catch (err) {
      alert(err.message || "Nagka-error habang sine-save ang area config.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteArea = async (id, name) => {
    if (areas.length <= 1) {
      alert("Hindi maaaring tanggalin ang nag-iisang active area.");
      return;
    }

    if (window.confirm(`Sigurado ka bang nais mong tanggalin ang area na "${name}"?`)) {
      try {
        await deleteAreaConfig(id);
      } catch (err) {
        alert(err.message || "Nagka-error sa pag-delete.");
      }
    }
  };

  const handleSelectActiveArea = (id) => {
    setSelectedAreaId(id);
    setActiveAreaId(id);
  };

  // Run health check on a specific endpoint
  const checkSingleEndpoint = async (key, { url, token, method = "GET", accountantId = null }) => {
    setHealthResults((prev) => ({
      ...prev,
      [key]: { loading: true }
    }));

    const result = await testEndpointHealth({
      url: String(url || "").trim(),
      token: String(token || "").trim(),
      method,
      accountantId
    });

    setHealthResults((prev) => ({
      ...prev,
      [key]: { ...result, loading: false }
    }));
  };

  // Run full system diagnostics
  const handleTestAllEndpoints = async () => {
    setTestingAll(true);
    const selectedArea = getAreaConfigById(activeAreaId);

    const tasks = [
      // 1. Supabase Database
      checkSingleEndpoint("supabase_db", {
        url: `${API_CONFIG.SUPABASE_URL}/rest/v1/user_settings?select=user_id&limit=1`,
        token: API_CONFIG.SUPABASE_ANON
      }),
      // 2. Supabase Storage
      checkSingleEndpoint("supabase_storage", {
        url: `${API_CONFIG.SUPABASE_URL}/storage/v1/bucket`,
        token: API_CONFIG.SUPABASE_ANON
      }),
      // 3. Current Area: Gross Report API
      checkSingleEndpoint("gross_api", {
        url: selectedArea.grossReportUrl,
        token: selectedArea.grossReportToken,
        accountantId: selectedArea.accountantId
      }),
      // 4. Current Area: Active Tellers API
      checkSingleEndpoint("tellers_api", {
        url: selectedArea.activeTellersUrl,
        token: selectedArea.activeTellersToken || selectedArea.grossReportToken,
        accountantId: selectedArea.accountantId
      }),
      // 5. Current Area: Supervisors API
      checkSingleEndpoint("supervisors_api", {
        url: selectedArea.supervisorUrl,
        token: selectedArea.supervisorToken || selectedArea.grossReportToken,
        accountantId: selectedArea.accountantId
      }),
      // 6. Current Area: Teller Bet API
      checkSingleEndpoint("bets_api", {
        url: `${String(selectedArea.tellerBetUrl || "").trim()}?tellerId=1`,
        token: selectedArea.tellerBetToken || selectedArea.grossReportToken
      })
    ];

    await Promise.allSettled(tasks);
    setTestingAll(false);
  };

  const filteredAreas = useMemo(() => {
    if (!searchTerm.trim()) return areas;
    const term = searchTerm.toLowerCase();
    return areas.filter(
      (a) =>
        a.areaName?.toLowerCase().includes(term) ||
        a.companyName?.toLowerCase().includes(term) ||
        a.grossReportUrl?.toLowerCase().includes(term)
    );
  }, [areas, searchTerm]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 font-['Figtree','Inter',sans-serif]">
      {/* Top Banner / Title Header */}
      <div className="rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 shadow-inner">
              <Wrench size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
                  Operations & Infrastructure
                </span>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
                  Multi-Area Live
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
                System Health & API Configuration
              </h2>
              <p className="text-xs text-slate-300 font-normal mt-0.5 max-w-xl">
                Mag-register at mag-manage ng iba't ibang areas/entities para sa Gross Report, Live Bets streaming, at subaybayan ang latency at connectivity ng bawat API endpoint.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleTestAllEndpoints}
              disabled={testingAll}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition backdrop-blur-xs disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <RefreshCw size={14} className={testingAll ? "animate-spin text-emerald-400" : "text-emerald-400"} />
              <span>{testingAll ? "Pinging All..." : "Run System Diagnostics"}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 transition shadow-lg shadow-emerald-500/30 cursor-pointer"
            >
              <Plus size={16} />
              <span>Add New Area / Entity</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Registered Areas</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1.5">{areas.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Active in Gross Report: <strong className="text-emerald-700">{getAreaConfigById(activeAreaId).areaName}</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cloud Storage Sync</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database size={15} />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-black text-slate-900">Supabase Connected</p>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Auto-synced across devices</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Live Stream Ready</span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Radio size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 mt-1.5">Realtime</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Teller bet arrival stream active</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Security & Rate Limit</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={15} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-sm font-black text-slate-900">300 req / min</span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">Safe Guard</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Automated batch throttle enabled</p>
        </div>
      </div>

      {/* Navigation Tabs (Areas vs System Latency) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveViewTab("areas")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
              activeViewTab === "areas"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers size={14} className={activeViewTab === "areas" ? "text-emerald-600" : ""} />
            <span>Area API Configurations ({areas.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("health")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 transition ${
              activeViewTab === "health"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity size={14} className={activeViewTab === "health" ? "text-emerald-600" : ""} />
            <span>System Latency & Diagnostics</span>
          </button>
        </div>

        {activeViewTab === "areas" && (
          <div className="relative w-full sm:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search area, company, or API endpoint..."
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* ================= VIEW 1: AREA CONFIGURATIONS ================= */}
      {activeViewTab === "areas" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAreas.map((area) => {
              const isCurrentActive = area.id === activeAreaId;

              return (
                <div
                  key={area.id}
                  className={`rounded-2xl border p-5 transition bg-white shadow-xs hover:shadow-md flex flex-col justify-between ${
                    isCurrentActive
                      ? "border-emerald-500 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    {/* Header: Area Name & Company */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5">
                            Accountant ID: {area.accountantId || "2"}
                          </span>
                          {isCurrentActive && (
                            <span className="rounded-lg bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 flex items-center gap-1">
                              <Check size={11} className="text-emerald-400" />
                              Active in Gross Report
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1.5">
                          {area.areaName}
                        </h3>
                        <p className="text-xs font-semibold text-slate-600">
                          {area.companyName}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(area)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                          title="Edit Area Config"
                        >
                          <Wrench size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteArea(area.id, area.areaName)}
                          disabled={areas.length <= 1}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition disabled:opacity-30"
                          title="Delete Area"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {area.description && (
                      <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 rounded-lg p-2 border border-slate-100">
                        "{area.description}"
                      </p>
                    )}

                    {/* API Endpoints Summary */}
                    <div className="mt-4 space-y-2 text-[11px] bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-bold flex items-center gap-1.5">
                          <BarChart3 size={12} className="text-emerald-600" /> Gross Report Endpoint:
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(area.grossReportUrl, `gross_${area.id}`)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy URL"
                        >
                          {copiedKey === `gross_${area.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <p className="font-mono text-slate-700 truncate bg-white px-2 py-1 rounded border border-slate-200">
                        {area.grossReportUrl}
                      </p>

                      <div className="flex items-center justify-between text-slate-500 pt-1">
                        <span className="font-bold flex items-center gap-1.5">
                          <Users size={12} className="text-indigo-600" /> Active Tellers Endpoint:
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(area.activeTellersUrl, `tellers_${area.id}`)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy URL"
                        >
                          {copiedKey === `tellers_${area.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <p className="font-mono text-slate-700 truncate bg-white px-2 py-1 rounded border border-slate-200">
                        {area.activeTellersUrl}
                      </p>

                      <div className="flex items-center justify-between text-slate-500 pt-1">
                        <span className="font-bold flex items-center gap-1.5">
                          <Radio size={12} className="text-amber-600" /> Live Bets (Wagers) Endpoint:
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(area.tellerBetUrl, `bets_${area.id}`)}
                          className="text-slate-400 hover:text-slate-600"
                          title="Copy URL"
                        >
                          {copiedKey === `bets_${area.id}` ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        </button>
                      </div>
                      <p className="font-mono text-slate-700 truncate bg-white px-2 py-1 rounded border border-slate-200">
                        {area.tellerBetUrl}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => checkSingleEndpoint(area.id, { url: area.grossReportUrl, token: area.grossReportToken, accountantId: area.accountantId })}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
                    >
                      <Zap size={13} className="text-amber-500" />
                      <span>Test Connection</span>
                    </button>

                    {healthResults[area.id] && (
                      <div className="text-[10px] font-bold">
                        {healthResults[area.id].loading ? (
                          <span className="text-slate-400 animate-pulse">Testing...</span>
                        ) : healthResults[area.id].ok ? (
                          <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                            <CheckCircle2 size={12} /> {healthResults[area.id].durationMs}ms (200 OK)
                          </span>
                        ) : (
                          <span className="text-rose-600 font-bold flex items-center gap-1">
                            <AlertCircle size={12} /> {healthResults[area.id].statusText}
                          </span>
                        )}
                      </div>
                    )}

                    {!isCurrentActive ? (
                      <button
                        type="button"
                        onClick={() => handleSelectActiveArea(area.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 transition shadow-xs"
                      >
                        <span>Activate for Gross Report</span>
                        <ArrowRight size={12} />
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <Check size={14} className="stroke-[3]" /> Currently Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAreas.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center bg-white">
              <AlertCircle size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-700">Walang natagpuang area para sa iyong search filter.</p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition"
              >
                <Plus size={14} /> Add New Area
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================= VIEW 2: SYSTEM HEALTH & LATENCY ================= */}
      {activeViewTab === "health" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Global Endpoint Connectivity Diagnostics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time network ping test sa bawat integration service ng HRHub (Cloud DB, STL APIs, Storage).
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestAllEndpoints}
                disabled={testingAll}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw size={13} className={testingAll ? "animate-spin" : ""} />
                <span>Test All Endpoints Now</span>
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100 text-xs">
              {[
                {
                  id: "supabase_db",
                  label: "Supabase Cloud Database (REST API)",
                  category: "Core Database",
                  url: `${API_CONFIG.SUPABASE_URL}/rest/v1/user_settings`,
                  icon: Database,
                  token: API_CONFIG.SUPABASE_ANON
                },
                {
                  id: "supabase_storage",
                  label: "Supabase File Storage Buckets",
                  category: "Storage Assets",
                  url: `${API_CONFIG.SUPABASE_URL}/storage/v1/bucket`,
                  icon: Server,
                  token: API_CONFIG.SUPABASE_ANON
                },
                {
                  id: "gross_api",
                  label: `Gross Report Consolidated API (${getAreaConfigById(activeAreaId).areaName})`,
                  category: "Financials",
                  url: getAreaConfigById(activeAreaId).grossReportUrl,
                  icon: BarChart3,
                  token: getAreaConfigById(activeAreaId).grossReportToken,
                  accountantId: getAreaConfigById(activeAreaId).accountantId
                },
                {
                  id: "tellers_api",
                  label: `Active Tellers & Personnel Directory (${getAreaConfigById(activeAreaId).areaName})`,
                  category: "Staff Directory",
                  url: getAreaConfigById(activeAreaId).activeTellersUrl,
                  icon: Users,
                  token: getAreaConfigById(activeAreaId).activeTellersToken || getAreaConfigById(activeAreaId).grossReportToken,
                  accountantId: getAreaConfigById(activeAreaId).accountantId
                },
                {
                  id: "supervisors_api",
                  label: `Supervisors Audit API (${getAreaConfigById(activeAreaId).areaName})`,
                  category: "Supervision",
                  url: getAreaConfigById(activeAreaId).supervisorUrl,
                  icon: ShieldCheck,
                  token: getAreaConfigById(activeAreaId).supervisorToken || getAreaConfigById(activeAreaId).grossReportToken,
                  accountantId: getAreaConfigById(activeAreaId).accountantId
                },
                {
                  id: "bets_api",
                  label: `Live Teller Bets Stream (${getAreaConfigById(activeAreaId).areaName})`,
                  category: "Live Transactions",
                  url: `${String(getAreaConfigById(activeAreaId).tellerBetUrl || "").trim()}?tellerId=1`,
                  icon: Radio,
                  token: getAreaConfigById(activeAreaId).tellerBetToken || getAreaConfigById(activeAreaId).grossReportToken
                }
              ].map((service) => {
                const res = healthResults[service.id];
                const Icon = service.icon;

                return (
                  <div key={service.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-lg transition">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-slate-900">{service.label}</p>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {service.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono truncate max-w-md mt-0.5">
                          {service.url}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {res && (
                        <div>
                          {res.loading ? (
                            <span className="text-slate-400 text-xs flex items-center gap-1 font-semibold">
                              <LoaderCircle size={12} className="animate-spin" /> Pinging...
                            </span>
                          ) : res.ok ? (
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[10px] px-2 py-0.5">
                                200 OK
                              </span>
                              <span className="text-xs font-black text-emerald-700">
                                {res.durationMs}ms
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] px-2 py-0.5">
                                {res.statusText || "Failed"}
                              </span>
                              <span className="text-xs font-semibold text-rose-600">
                                {res.durationMs}ms
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => checkSingleEndpoint(service.id, { url: service.url, token: service.token, accountantId: service.accountantId })}
                        className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                      >
                        Ping
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ADD / EDIT AREA API CONFIGURATION ================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                  {editingArea ? <Wrench size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingArea ? `Edit Area: ${editingArea.areaName}` : "Register New Area / Entity"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    I-configure ang bagong STL area para magkaroon ng sariling Gross Report at Live Bets stream.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveModalForm} className="mt-4 space-y-4 text-xs">
              {/* Row 1: Area Name & Company Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Area / Location Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={modalForm.areaName}
                    onChange={(e) => setModalForm({ ...modalForm, areaName: e.target.value })}
                    placeholder="hal. Maguindanao, Cotabato, Iligan..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Company / Entity Name <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={modalForm.companyName}
                    onChange={(e) => setModalForm({ ...modalForm, companyName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    {COMPANY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Accountant ID & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Accountant ID (?id=...)
                  </label>
                  <input
                    type="text"
                    value={modalForm.accountantId}
                    onChange={(e) => setModalForm({ ...modalForm, accountantId: e.target.value })}
                    placeholder="hal. 2"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Branch / Area Notes
                  </label>
                  <input
                    type="text"
                    value={modalForm.description}
                    onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                    placeholder="hal. PCSO STL Authorized Agent Corporation (AAC Province of Maguindanao)"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Section 1: Gross Report API */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 font-black text-slate-900">
                  <BarChart3 size={14} className="text-emerald-700" />
                  <span>1. Gross Sales Consolidated Report API</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Gross Report Endpoint URL
                  </label>
                  <input
                    type="url"
                    required
                    value={modalForm.grossReportUrl}
                    onChange={(e) => setModalForm({ ...modalForm, grossReportUrl: e.target.value })}
                    placeholder="https://stl-area-api.com/api/accountant/TellerGrossPerDateRange?id=2"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Bearer Token (Authorization)
                  </label>
                  <input
                    type="text"
                    value={modalForm.grossReportToken}
                    onChange={(e) => setModalForm({ ...modalForm, grossReportToken: e.target.value })}
                    placeholder="hal. 7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Section 2: Active Tellers & Supervisors */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 font-black text-slate-900">
                  <Users size={14} className="text-indigo-600" />
                  <span>2. Personnel & Supervisor Endpoints</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Active Tellers URL
                    </label>
                    <input
                      type="url"
                      value={modalForm.activeTellersUrl}
                      onChange={(e) => setModalForm({ ...modalForm, activeTellersUrl: e.target.value })}
                      placeholder="https://stl-area-api.com/api/accountant/ActiveTellers?id=2"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Supervisors URL
                    </label>
                    <input
                      type="url"
                      value={modalForm.supervisorUrl}
                      onChange={(e) => setModalForm({ ...modalForm, supervisorUrl: e.target.value })}
                      placeholder="https://stl-area-api.com/api/accountant/supervisor?id=2"
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Live Bets (Wagers) */}
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3.5 space-y-2.5">
                <div className="flex items-center gap-1.5 font-black text-slate-900">
                  <Radio size={14} className="text-amber-600" />
                  <span>3. Realtime Live Bets (Wagers) Stream API</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Teller Bet URL
                  </label>
                  <input
                    type="url"
                    value={modalForm.tellerBetUrl}
                    onChange={(e) => setModalForm({ ...modalForm, tellerBetUrl: e.target.value })}
                    placeholder="https://stl-area-api.com/api/teller/bet"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                    Live Bets Bearer Token
                  </label>
                  <input
                    type="text"
                    value={modalForm.tellerBetToken}
                    onChange={(e) => setModalForm({ ...modalForm, tellerBetToken: e.target.value })}
                    placeholder="hal. 7770|buTtUAGup02YXYefPfDwwh44wp0AOnRQuxsPHZ2f"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Form Test Result Bar */}
              {formTestResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    formTestResult.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                      : "border-rose-200 bg-rose-50 text-rose-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {formTestResult.ok ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-600 shrink-0" />
                    )}
                    <span>
                      {formTestResult.ok
                        ? `API Connected Successfully! (${formTestResult.durationMs}ms - 200 OK)`
                        : `Test Failed: ${formTestResult.statusText} (${formTestResult.status})`}
                    </span>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleTestModalForm}
                  disabled={formTesting || !modalForm.grossReportUrl}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition disabled:opacity-40"
                >
                  <Zap size={13} className={formTesting ? "animate-pulse text-amber-500" : "text-amber-500"} />
                  <span>{formTesting ? "Testing URL..." : "Test Connection"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-xs font-black text-white transition shadow-sm disabled:opacity-50"
                  >
                    {saveLoading ? "Saving..." : editingArea ? "Update Area" : "Save & Register Area"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
