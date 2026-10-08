import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle, BarChart3, CalendarDays, CircleDollarSign,
  Download, FileText, LoaderCircle, RefreshCw, TrendingUp, UsersRound, Printer, X,
  CheckCircle2, AlertTriangle, Clock, Search, Users, Zap, Check, ChevronDown, Ticket,
  Layers, ListFilter, Hash, ChevronLeft, ChevronRight, Eye, ArrowDownToLine,
  Radio, RotateCw, Receipt, SlidersHorizontal, BadgeCheck, Clock3, Activity, Sparkles, Timer
} from "lucide-react";
import { API_CONFIG } from "../config/apiConfig";

const DEFAULT_GROSS_URL = API_CONFIG.GROSS_REPORT_URL;
const DEFAULT_SUPERVISOR_URL = API_CONFIG.SUPERVISOR_URL;
const DEFAULT_ACTIVE_TELLERS_URL = API_CONFIG.ACTIVE_TELLERS_URL;
const DEFAULT_BACKUP_TELLERS_URL = API_CONFIG.AGENTS_URL;
const DEFAULT_TOKEN = API_CONFIG.GROSS_REPORT_TOKEN;
const DEFAULT_BET_URL = API_CONFIG.TELLER_BET_URL;
const DEFAULT_BET_TOKEN = API_CONFIG.TELLER_BET_TOKEN;

const formatDate = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0")
].join("-");

const getInitialRange = () => {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  return { from: formatDate(from), to: formatDate(to) };
};

const firstValue = (record, keys, fallback = "") => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record[key] !== "") return record[key];
  }
  return fallback;
};

function getRecords(payload) {
  if (Array.isArray(payload)) return payload;
  for (const key of ["data", "results", "records", "items", "collectors", "tellers", "accountants"]) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (payload?.data && typeof payload.data === "object") return getRecords(payload.data);
  if (payload && typeof payload === "object") return [payload];
  return [];
}

const dateKey = (record) => {
  const year = Number(firstValue(record, ["drawYear", "year"], 0));
  const month = Number(firstValue(record, ["drawMonth", "month"], 0));
  const day = Number(firstValue(record, ["drawDay", "day"], 0));
  if (year && month && day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const str = firstValue(record, ["date", "drawDate", "draw_date", "created_at", "transDate", "recordDate"], "");
  if (str && typeof str === "string") {
    return str.slice(0, 10);
  }
  return "";
};

const getDateColumns = (from, to) => {
  const dates = [];
  const cursor = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (cursor <= end) {
    dates.push(formatDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const shiftDate = (dateString, days) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

const displayDate = (dateString) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric"
}).format(new Date(`${dateString}T00:00:00`));

function normalizeRecords(payload, supervisorsPayload, rangeFrom, rangeTo) {
  const rows = new Map();
  const supervisorNames = new Map(getRecords(supervisorsPayload).map((supervisor) => [
    String(firstValue(supervisor, ["id", "supervisorId"], "")),
    firstValue(supervisor, ["fullName", "full_name", "name", "username"], "Unassigned supervisor")
  ]));
  getRecords(payload).forEach((record, index) => {
    const id = firstValue(record, ["id", "userId", "collectorId", "username", "fullName"], index);
    const name = firstValue(record, ["fullName", "full_name", "collectorName", "name", "username"], `Agent ${index + 1}`);
    const current = rows.get(String(id)) || {
      id,
      name,
      agent: firstValue(record, ["agentName", "agent", "fullName", "full_name"], "Unassigned agent"),
      address: firstValue(record, ["address", "location", "outlet"], "-") ,
      active: firstValue(record, ["isActive", "active", "status"], "-") ,
      supervisor: typeof record.supervisor === "object"
        ? firstValue(record.supervisor, ["name", "fullName", "full_name"], "Unassigned supervisor")
        : (supervisorNames.get(String(record.supervisor)) || record.supervisor || "Unassigned supervisor"),
      daily: {}
    };
    const date = dateKey(record);
    if (date) current.daily[date] = (current.daily[date] || 0) + (Number(firstValue(record, ["TotalOverAllGross", "gross", "totalGross", "amount", "total", "grossAmount"], 0)) || 0);
    rows.set(String(id), current);
  });
  return [...rows.values()].map((row) => ({
    ...row,
    total: Object.entries(row.daily).reduce((sum, [date, value]) => (
      date >= rangeFrom && date <= rangeTo ? sum + value : sum
    ), 0)
  }));
}

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const isTestSupervisor = (name) => {
  const cleaned = String(name || "").toLowerCase().replace(/[-_]/g, " ").trim();
  return (
    cleaned === "test spvr" ||
    cleaned === "test supervisor" ||
    cleaned === "test spv" ||
    cleaned === "testspvr" ||
    (cleaned.includes("test") && (cleaned.includes("spvr") || cleaned.includes("supervisor") || cleaned.includes("spv")))
  );
};

const hasSupervisorContent = (rows, dates = [], prevDates = []) => {
  if (!rows || rows.length === 0) return false;
  return rows.some((record) => {
    const currentSum = dates.reduce((sum, d) => sum + (Number(record.daily?.[d]) || 0), 0);
    if (currentSum > 0) return true;
    const previousSum = prevDates.reduce((sum, d) => sum + (Number(record.daily?.[d]) || 0), 0);
    if (previousSum > 0) return true;
    if (Number(record.total) > 0) return true;
    if (record.daily && Object.values(record.daily).some((val) => Number(val) > 0)) return true;
    return false;
  });
};

const formatDiffTagHtml = (curVal, prevVal) => {
  const cur = Number(curVal) || 0;
  const prev = Number(prevVal) || 0;
  const diff = cur - prev;
  if (cur === 0 && prev === 0) {
    return `<span class="diff-tag diff-zero">—</span>`;
  }
  if (diff > 0) {
    return `<span class="diff-tag diff-pos">▲ +${currency.format(diff)}</span>`;
  }
  if (diff < 0) {
    return `<span class="diff-tag diff-neg">▼ ${currency.format(diff)}</span>`;
  }
  return `<span class="diff-tag diff-zero">• ₱0</span>`;
};

const renderDiffTagJsx = (curVal, prevVal, isSubtotal = false) => {
  const cur = Number(curVal) || 0;
  const prev = Number(prevVal) || 0;
  const diff = cur - prev;
  if (cur === 0 && prev === 0) {
    return (
      <span className={`mt-0.5 inline-block text-[8px] font-semibold ${isSubtotal ? "text-slate-400" : "text-slate-300"}`}>
        —
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className={`mt-0.5 inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[8px] font-extrabold leading-none ${
        isSubtotal 
          ? "bg-emerald-100/90 border-emerald-300 text-emerald-900" 
          : "bg-emerald-50 border-emerald-200/90 text-emerald-700"
      }`}>
        ▲ +{currency.format(diff)}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className={`mt-0.5 inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-[8px] font-extrabold leading-none ${
        isSubtotal 
          ? "bg-rose-100/90 border-rose-300 text-rose-900" 
          : "bg-rose-50 border-rose-200/90 text-rose-700"
      }`}>
        ▼ {currency.format(diff)}
      </span>
    );
  }
  return (
    <span className={`mt-0.5 inline-block text-[8px] font-semibold ${isSubtotal ? "text-slate-500" : "text-slate-400"}`}>
      • ₱0
    </span>
  );
};

// Persistent memory & sessionStorage cache so data appears instantly (0ms) without blank screen
let CACHED_TELLERS = null;
let CACHED_SUPERVISORS = null;
let CACHED_GROSS = null;
let CACHED_LIVE_BETS = {};
let CACHED_RECORDS = null;
let CACHED_LAST_SYNC = null;

try {
  const savedTellers = sessionStorage.getItem("hrhub_tellers_cache");
  if (savedTellers) CACHED_TELLERS = JSON.parse(savedTellers);
  const savedSupervisors = sessionStorage.getItem("hrhub_supervisors_cache");
  if (savedSupervisors) CACHED_SUPERVISORS = JSON.parse(savedSupervisors);
  
  // Stored live bets are strictly tagged by date. If cache date is from a previous day, discard it!
  const todayDateStr = formatDate(new Date());
  const savedBetsDate = sessionStorage.getItem("hrhub_live_bets_date");
  if (savedBetsDate === todayDateStr) {
    const savedBets = sessionStorage.getItem("hrhub_live_bets_cache");
    if (savedBets) CACHED_LIVE_BETS = JSON.parse(savedBets);
  } else {
    sessionStorage.removeItem("hrhub_live_bets_cache");
    sessionStorage.removeItem("hrhub_live_bets_date");
    CACHED_LIVE_BETS = {};
  }

  const savedGross = sessionStorage.getItem("hrhub_gross_cache");
  if (savedGross) CACHED_GROSS = JSON.parse(savedGross);
} catch {}

let RATE_LIMIT_REMAINING = 300;
let RATE_LIMIT_RESET_AT = 0;
let LAST_RATE_LIMIT_WARN = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function SupervisorPicker({ value, onChange, summaries, metrics, showFigures = true }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedSummary = summaries.find((s) => s.name === value);

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none hover:bg-slate-50 hover:border-slate-300 transition shadow-xs shrink-0 ${
          showFigures ? "min-w-56" : "min-w-48"
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <SlidersHorizontal size={13} className="text-emerald-600 shrink-0" />
          <span className="truncate">
            {value === "all" ? "All Supervisors" : value}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {showFigures && metrics && (
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold bg-slate-50 border border-slate-200/80 px-1.5 py-0.5 rounded-md">
              <span className="text-emerald-700">
                {value === "all" ? metrics.withGrossCount : (selectedSummary?.withGross || 0)}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-rose-600">
                {value === "all" ? metrics.withoutGrossCount : (selectedSummary?.withoutGross || 0)}
              </span>
            </span>
          )}
          <ChevronDown size={13} className={`text-slate-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className={`absolute left-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10 backdrop-blur animate-in fade-in zoom-in-95 duration-100 ${
          showFigures ? "w-84" : "w-64"
        }`}>
          {/* Header */}
          {showFigures ? (
            <div className="flex items-center justify-between px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
              <span>Supervisor</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-emerald-600 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                </span>
                <span className="text-rose-600 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Inactive
                </span>
              </div>
            </div>
          ) : (
            <div className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
              Filter by Supervisor
            </div>
          )}

          {/* Option: All Supervisors */}
          <button
            type="button"
            onClick={() => {
              onChange("all");
              setOpen(false);
            }}
            className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-bold transition text-left ${
              value === "all"
                ? "bg-emerald-50 text-emerald-950 font-extrabold"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2 truncate mr-2">
              <span className="w-3.5 flex items-center justify-center shrink-0">
                {value === "all" ? <Check size={13} className="text-emerald-600" /> : null}
              </span>
              <span className="truncate">All Supervisors</span>
            </span>
            {showFigures && metrics && (
              <span className="flex items-center gap-1.5 font-mono text-[10px] font-black shrink-0">
                <span className="rounded bg-emerald-100/80 px-1.5 py-0.5 text-emerald-800">
                  {metrics.withGrossCount}
                </span>
                <span className="rounded bg-rose-100/80 px-1.5 py-0.5 text-rose-800">
                  {metrics.withoutGrossCount}
                </span>
              </span>
            )}
          </button>

          {/* Supervisor rows */}
          <div className="divide-y divide-slate-50 mt-0.5">
            {summaries.map((s) => {
              const isSelected = value === s.name;
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => {
                    onChange(s.name);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition text-left ${
                    isSelected
                      ? "bg-emerald-50 text-emerald-950 font-black"
                      : "text-slate-700 hover:bg-slate-50 font-semibold"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate mr-2">
                    <span className="w-3.5 flex items-center justify-center shrink-0">
                      {isSelected ? <Check size={13} className="text-emerald-600 shrink-0" /> : null}
                    </span>
                    <span className="truncate">{s.name}</span>
                  </span>
                  {showFigures && (
                    <span className="flex items-center gap-1.5 font-mono text-[10px] font-black shrink-0">
                      <span className="rounded bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 text-emerald-700">
                        {s.withGross}
                      </span>
                      <span className="rounded bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 text-rose-700">
                        {s.withoutGross}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GrossReportPanel() {
  const [range, setRange] = useState(getInitialRange);
  const [records, setRecords] = useState(() => CACHED_RECORDS || []);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(() => Boolean(CACHED_TELLERS && CACHED_TELLERS.length > 0));
  const [error, setError] = useState("");
  const [reportTab, setReportTab] = useState("realtime");
  const [previewOpen, setPreviewOpen] = useState(false);

  // Realtime agent entry states
  const [rawGrossList, setRawGrossList] = useState(() => CACHED_GROSS || []);
  const [activeTellers, setActiveTellers] = useState(() => CACHED_TELLERS || []);
  const [supervisorsList, setSupervisorsList] = useState(() => CACHED_SUPERVISORS || []);
  const [lastRefreshed, setLastRefreshed] = useState(() => CACHED_LAST_SYNC || null);
  const [autoRefresh, setAutoRefresh] = useState(true); // ON by default!
  const [realtimeDate, setRealtimeDate] = useState(() => formatDate(new Date()));
  const [realtimeSearch, setRealtimeSearch] = useState("");
  const [realtimeFilter, setRealtimeFilter] = useState("all"); // "all" | "with_gross" | "without_gross"
  const [realtimeSupervisor, setRealtimeSupervisor] = useState("all");
  const [selectedDrawTime, setSelectedDrawTime] = useState("all");

  // Live Bets API states (Taya per agent)
  const [liveBetsMap, setLiveBetsMap] = useState(() => CACHED_LIVE_BETS || {});
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, loading: false });
  const [selectedAgentDetails, setSelectedAgentDetails] = useState(null);
  const [refreshingAgentId, setRefreshingAgentId] = useState(null);
  const [modalDrawFilter, setModalDrawFilter] = useState("all");
  const [modalSearch, setModalSearch] = useState("");

  // Realtime view modes: "entries" (Live Entries Stream per Game & Oras) or "collector" (On-Duty Accounts Summary)
  const [realtimeViewMode, setRealtimeViewMode] = useState("entries");
  const [selectedGameFilter, setSelectedGameFilter] = useState("all");
  const [entriesSearch, setEntriesSearch] = useState("");
  const [entriesPage, setEntriesPage] = useState(1);
  const [selectedTicketModal, setSelectedTicketModal] = useState(null);
  const [ticketDetailsLoading, setTicketDetailsLoading] = useState(false);
  const [ticketCombinations, setTicketCombinations] = useState([]);
  const rotatingIndexRef = useRef(0);
  const isFetchingLiveRef = useRef(false);
  const liveBetsMapRef = useRef(liveBetsMap);
  liveBetsMapRef.current = liveBetsMap;
  const prevRealtimeDateRef = useRef(realtimeDate);

  // --- REALTIME AGENT GROSS & ON-DUTY TRACKING ---
  const [currentDay, setCurrentDay] = useState(() => formatDate(new Date()));
  const todayStr = currentDay;
  const yesterdayStr = useMemo(() => shiftDate(currentDay, -1), [currentDay]);

  // Midnight / New Day transition detector: automatically resets live stream gross when a new day arrives
  useEffect(() => {
    const timer = setInterval(() => {
      const nowStr = formatDate(new Date());
      if (nowStr !== currentDay) {
        console.log(`[HrHub Server Alert] 🌅 New day detected (${nowStr}). Auto-resetting live stream gross for the current day.`);
        setCurrentDay(nowStr);
        setRealtimeDate(nowStr);
        setLiveBetsMap({});
        CACHED_LIVE_BETS = {};
        try {
          sessionStorage.removeItem("hrhub_live_bets_cache");
          sessionStorage.removeItem("hrhub_live_bets_date");
        } catch {}
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [currentDay]);

  // Live Cooldown & Sync Timing States
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [cooldownReason, setCooldownReason] = useState("");
  const [nextPollCountdown, setNextPollCountdown] = useState(25);
  const [historicalLoading, setHistoricalLoading] = useState(false);

  // Live second-by-second cooldown countdown heartbeat
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      if (now < RATE_LIMIT_RESET_AT) {
        const remaining = Math.max(0, Math.ceil((RATE_LIMIT_RESET_AT - now) / 1000));
        setCooldownSeconds(remaining);
      } else {
        setCooldownSeconds((prev) => (prev > 0 ? 0 : 0));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onDutyTellers = useMemo(() => {
    return activeTellers.filter((teller) => {
      if (teller.deleted_at) return false;
      const active = teller.isActive ?? teller.is_active ?? teller.status ?? teller.active;
      if ([0, "0", false, "false", "inactive"].includes(active)) return false;
      return true;
    });
  }, [activeTellers]);

  const onDutyTellersRef = useRef(onDutyTellers);
  onDutyTellersRef.current = onDutyTellers;
  const rawGrossListRef = useRef(rawGrossList);
  rawGrossListRef.current = rawGrossList;

  const viewTicketCombinations = async (entry) => {
    setSelectedTicketModal(entry);
    setTicketDetailsLoading(true);
    setTicketCombinations([]);
    const token = import.meta.env.VITE_TELLER_BET_API_TOKEN || DEFAULT_BET_TOKEN;
    const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };

    try {
      const res = await fetch(`https://stl-mandaue-api.com/api/teller/bet/${entry.transactionId}`, { headers });
      if (res.ok) {
        const payload = await res.json();
        const combis = Array.isArray(payload?.data) ? payload.data : [];
        setTicketCombinations(combis);
      }
    } catch (err) {
      console.error("Error fetching ticket combinations:", err);
    } finally {
      setTicketDetailsLoading(false);
    }
  };

  const fetchLiveBets = async (tellersToFetch, targetDate, isBackgroundPoll = false) => {
    if (!tellersToFetch || tellersToFetch.length === 0) return;
    if (isFetchingLiveRef.current && isBackgroundPoll) return;
    if (Date.now() < RATE_LIMIT_RESET_AT || RATE_LIMIT_REMAINING <= 25) {
      const waitSeconds = Math.max(1, Math.round((RATE_LIMIT_RESET_AT - Date.now()) / 1000));
      if (!isBackgroundPoll && Date.now() - LAST_RATE_LIMIT_WARN > 20000) {
        LAST_RATE_LIMIT_WARN = Date.now();
        console.warn(`[HrHub Server Guard] 🛡️ Rate limit quota active: ${RATE_LIMIT_REMAINING}/300 remaining. Request queue paused for ${waitSeconds}s to maintain safe upstream server throughput.`);
      }
      return;
    }
    isFetchingLiveRef.current = true;

    const token = import.meta.env.VITE_TELLER_BET_API_TOKEN || DEFAULT_BET_TOKEN;
    const baseUrl = import.meta.env.VITE_TELLER_BET_API_URL || DEFAULT_BET_URL;
    const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };

    const fromDate = targetDate;
    const toDate = shiftDate(targetDate, 1);

    if (!isBackgroundPoll) {
      setSyncProgress({ current: 0, total: tellersToFetch.length, loading: true });
    }

    // Sort tellers: prioritize those with known bets so entries appear immediately
    const sortedTellers = [...tellersToFetch].sort((a, b) => {
      const aHas = (liveBetsMap[a.id]?.count || 0) > 0 ? 1 : 0;
      const bHas = (liveBetsMap[b.id]?.count || 0) > 0 ? 1 : 0;
      return bHas - aHas;
    });

    // Gentle concurrency: 2 requests at a time with 250ms pause to stay safely under 300 req/min
    const batchSize = 2;
    let rateLimitHit = false;

    for (let i = 0; i < sortedTellers.length; i += batchSize) {
      if (rateLimitHit || Date.now() < RATE_LIMIT_RESET_AT || RATE_LIMIT_REMAINING <= 25) break;

      const batch = sortedTellers.slice(i, i + batchSize);
      const batchResults = {};

      await Promise.all(
        batch.map(async (teller) => {
          if (Date.now() < RATE_LIMIT_RESET_AT || RATE_LIMIT_REMAINING <= 25) return;

          try {
            const url = new URL(baseUrl);
            url.searchParams.set("tellerId", teller.id);
            url.searchParams.set("from", fromDate);
            url.searchParams.set("to", toDate);

            const res = await fetch(url.toString(), { headers });

            const rem = res.headers.get("x-ratelimit-remaining");
            if (rem !== null) {
              const remNum = Number(rem);
              if (!isNaN(remNum)) {
                RATE_LIMIT_REMAINING = remNum;
                if (remNum <= 25) {
                  RATE_LIMIT_RESET_AT = Date.now() + 45000;
                  setCooldownSeconds(45);
                  setCooldownReason("Server Safe Quota Guard");
                }
              }
            }

            if (res.status === 429) {
              rateLimitHit = true;
              const retryAfter = Number(res.headers.get("retry-after")) || 60;
              RATE_LIMIT_REMAINING = 0;
              RATE_LIMIT_RESET_AT = Date.now() + (retryAfter * 1000);
              setCooldownSeconds(retryAfter);
              setCooldownReason("Server Rate Limit (HTTP 429)");
              console.warn(`[HrHub Server Alert] ⚠️ Upstream rate limit reached (HTTP 429). Cooldown: ${retryAfter}s active to preserve server stability.`);
              return;
            }

            if (!res.ok) {
              console.warn(`[HrHub Server Alert] ⚠️ Remote service exception for collector ${teller.id}: HTTP ${res.status}`);
              return;
            }

            const payload = await res.json();
            const rawBets = Array.isArray(payload?.data) ? payload.data : [];
            const validBets = rawBets.filter((b) => {
              if (Number(b.isVoid) === 1) return false;
              const bDate = b.created_at ? b.created_at.slice(0, 10) : (b.date || b.drawDate || "");
              if (bDate && bDate !== targetDate) return false;
              return true;
            });
            const totalAmount = validBets.reduce((sum, b) => sum + (Number(b.totalBetAmount) || 0), 0);

            const draws = {};
            validBets.forEach((b) => {
              const dt = String(b.drawTime || "10:30");
              draws[dt] = (draws[dt] || 0) + (Number(b.totalBetAmount) || 0);
            });

            batchResults[teller.id] = {
              count: validBets.length,
              total: totalAmount,
              bets: validBets,
              draws
            };
          } catch {
            // Keep previous data on network glitch
          }
        })
      );

      // Merge into state after every batch so entries stream in continuously without waiting
      if (Object.keys(batchResults).length > 0) {
        setLiveBetsMap((prev) => {
          const updated = { ...prev, ...batchResults };
          CACHED_LIVE_BETS = updated;
          try {
            sessionStorage.setItem("hrhub_live_bets_date", targetDate);
            sessionStorage.setItem("hrhub_live_bets_cache", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      if (!isBackgroundPoll) {
        const currentCount = Math.min(i + batchSize, sortedTellers.length);
        setSyncProgress({ current: currentCount, total: sortedTellers.length, loading: currentCount < sortedTellers.length });
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < sortedTellers.length && !rateLimitHit) {
        await sleep(250);
      }
    }

    if (!isBackgroundPoll) {
      setSyncProgress((prev) => ({ ...prev, loading: false }));
      if (sortedTellers.length > 0 && RATE_LIMIT_REMAINING > 25) {
        console.log(`[HrHub Server Status] ✅ Connection to STL API server secure. Quota remaining: ${RATE_LIMIT_REMAINING}/300.`);
      }
    }
    const now = new Date();
    setLastRefreshed(now);
    CACHED_LAST_SYNC = now;
    isFetchingLiveRef.current = false;
  };

  const refreshSingleAgentBets = async (agent) => {
    if (!agent) return;
    setRefreshingAgentId(agent.id);
    const token = import.meta.env.VITE_TELLER_BET_API_TOKEN || DEFAULT_BET_TOKEN;
    const baseUrl = import.meta.env.VITE_TELLER_BET_API_URL || DEFAULT_BET_URL;
    const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
    const fromDate = realtimeDate;
    const toDate = shiftDate(realtimeDate, 1);

    try {
      const url = new URL(baseUrl);
      url.searchParams.set("tellerId", agent.id);
      url.searchParams.set("from", fromDate);
      url.searchParams.set("to", toDate);

      const res = await fetch(url.toString(), { headers });
      if (res.ok) {
        const payload = await res.json();
        const rawBets = Array.isArray(payload?.data) ? payload.data : [];
        const validBets = rawBets.filter((b) => {
          if (Number(b.isVoid) === 1) return false;
          const bDate = b.created_at ? b.created_at.slice(0, 10) : (b.date || b.drawDate || "");
          if (bDate && bDate !== realtimeDate) return false;
          return true;
        });
        const totalAmount = validBets.reduce((sum, b) => sum + (Number(b.totalBetAmount) || 0), 0);
        const draws = {};
        validBets.forEach((b) => {
          const dt = String(b.drawTime || "10:30");
          draws[dt] = (draws[dt] || 0) + (Number(b.totalBetAmount) || 0);
        });

        const updatedInfo = {
          count: validBets.length,
          total: totalAmount,
          bets: validBets,
          draws
        };

        setLiveBetsMap((prev) => {
          const updated = { ...prev, [agent.id]: updatedInfo };
          CACHED_LIVE_BETS = updated;
          return updated;
        });

        setSelectedAgentDetails((prev) => (prev && String(prev.id) === String(agent.id) ? {
          ...prev,
          bets: validBets,
          betsCount: validBets.length,
          gross: totalAmount,
          hasGross: totalAmount > 0,
          draws: Object.entries(draws).map(([time, gross]) => ({ time, gross, hits: 0 }))
        } : prev));
      }
    } catch (err) {
      console.error("Error refreshing single agent bets:", err);
    } finally {
      setRefreshingAgentId(null);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    setError("");

    try {
      const token = import.meta.env.VITE_GROSS_REPORT_API_TOKEN || import.meta.env.VITE_AGENTS_API_TOKEN || DEFAULT_TOKEN;
      const supervisorUrl = import.meta.env.VITE_SUPERVISOR_API_URL || DEFAULT_SUPERVISOR_URL;
      const activeTellersUrl = import.meta.env.VITE_ACTIVE_TELLERS_API_URL || DEFAULT_ACTIVE_TELLERS_URL;

      // 1. FAST PARALLEL BOOT: Fetch active tellers and supervisors first (~200ms)
      const [spvrResult, tellersResult] = await Promise.allSettled([
        fetch(supervisorUrl, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null)),
        fetch(activeTellersUrl, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }).then((r) => (r.ok ? r.json() : null))
      ]);

      const supervisorsPayload = spvrResult.status === "fulfilled" ? spvrResult.value : null;
      let tellersPayload = tellersResult.status === "fulfilled" ? tellersResult.value : null;

      if (!tellersPayload && !CACHED_TELLERS) {
        try {
          const backupRes = await fetch(DEFAULT_BACKUP_TELLERS_URL, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
          if (backupRes.ok) tellersPayload = await backupRes.json();
        } catch {}
      }

      const activeList = getRecords(tellersPayload || CACHED_TELLERS);
      if (activeList.length > 0) {
        setActiveTellers(activeList);
        CACHED_TELLERS = activeList;
        try { sessionStorage.setItem("hrhub_tellers_cache", JSON.stringify(activeList)); } catch {}
      }

      const spvrList = getRecords(supervisorsPayload || CACHED_SUPERVISORS);
      if (spvrList.length > 0) {
        setSupervisorsList(spvrList);
        CACHED_SUPERVISORS = spvrList;
        try { sessionStorage.setItem("hrhub_supervisors_cache", JSON.stringify(spvrList)); } catch {}
      }

      // Mark loaded so UI renders immediately
      setLoaded(true);
      setLastRefreshed(new Date());

      // Filter on-duty tellers
      const currentTellers = activeList.length > 0 ? activeList : (CACHED_TELLERS || []);
      const onDuty = currentTellers.filter((teller) => {
        if (teller.deleted_at) return false;
        const active = teller.isActive ?? teller.is_active ?? teller.status ?? teller.active;
        return ![0, "0", false, "false", "inactive"].includes(active);
      });

      // Trigger initial live bets fetch for top priority on-duty tellers (20 tellers)
      // to populate entries fast without exceeding rate limits
      if (onDuty.length > 0) {
        const priorityTellers = [...onDuty].sort((a, b) => {
          const aHas = (liveBetsMap[a.id]?.count || 0) > 0 ? 1 : 0;
          const bHas = (liveBetsMap[b.id]?.count || 0) > 0 ? 1 : 0;
          return bHas - aHas;
        }).slice(0, 20);
        fetchLiveBets(priorityTellers, realtimeDate);
      }

      // 2. CONCURRENT BACKGROUND LOAD: Fetch month-to-date gross plus the 7-day comparison lookback
      const configuredUrl = import.meta.env.VITE_GROSS_REPORT_API_URL;
      const endpoints = configuredUrl ? [configuredUrl] : [DEFAULT_GROSS_URL];
      let response;
      let lastStatus = "";

      for (const endpoint of endpoints) {
        const url = new URL(endpoint);
        url.searchParams.set("id", import.meta.env.VITE_GROSS_ACCOUNTANT_ID || "2");
        const fetchFrom = shiftDate(range.from, -7);
        const todayStr = formatDate(new Date());
        const fetchTo = range.to < todayStr ? todayStr : range.to;
        url.searchParams.set("from", fetchFrom);
        url.searchParams.set("to", fetchTo);
        try {
          response = await fetch(url, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
          if (response.ok) break;
          lastStatus = response.status;
        } catch (err) {
          lastStatus = err.message;
        }
      }

      if (response?.ok) {
        const grossPayload = await response.json();
        const rawRecords = getRecords(grossPayload);
        setRawGrossList(rawRecords);
        CACHED_GROSS = rawRecords;
        try { sessionStorage.setItem("hrhub_gross_cache", JSON.stringify(rawRecords)); } catch {}
        const normalized = normalizeRecords(grossPayload, supervisorsPayload || CACHED_SUPERVISORS, range.from, range.to);
        setRecords(normalized);
        CACHED_RECORDS = normalized;
      }
    } catch (requestError) {
      console.error("Gross report load error:", requestError);
      if (!CACHED_TELLERS) {
        setError(requestError.message || "Unable to load the gross report.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalGrossForDate = async (targetDate) => {
    setHistoricalLoading(true);
    try {
      const token = import.meta.env.VITE_GROSS_REPORT_API_TOKEN || import.meta.env.VITE_AGENTS_API_TOKEN || DEFAULT_TOKEN;
      const configuredUrl = import.meta.env.VITE_GROSS_REPORT_API_URL;
      const endpoint = configuredUrl || DEFAULT_GROSS_URL;
      const url = new URL(endpoint);
      url.searchParams.set("id", import.meta.env.VITE_GROSS_ACCOUNTANT_ID || "2");
      url.searchParams.set("from", targetDate);
      url.searchParams.set("to", targetDate);

      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const payload = await res.json();
        const recordsForDate = getRecords(payload);
        if (recordsForDate.length > 0) {
          setRawGrossList((prev) => {
            const remaining = prev.filter((r) => dateKey(r) !== targetDate);
            const merged = [...remaining, ...recordsForDate];
            CACHED_GROSS = merged;
            try { sessionStorage.setItem("hrhub_gross_cache", JSON.stringify(merged)); } catch {}
            return merged;
          });
        }
        return recordsForDate;
      }
    } catch (err) {
      console.error("Error fetching historical gross for date:", err);
    } finally {
      setHistoricalLoading(false);
    }
    return [];
  };

  useEffect(() => {
    loadReport();
  }, []);

  // Continuous Real-Time Auto-Stream with live second-by-second countdown
  // Only polls on the current day (todayStr) to completely protect server quota on historical dates
  useEffect(() => {
    const isToday = realtimeDate === todayStr;
    if (!autoRefresh || onDutyTellers.length === 0 || !isToday) return;

    const interval = setInterval(() => {
      if (document.hidden) return; // Pause if tab is in background

      // If server cooldown is active, hold the next sync countdown
      if (Date.now() < RATE_LIMIT_RESET_AT || RATE_LIMIT_REMAINING <= 25) {
        return;
      }

      setNextPollCountdown((prev) => {
        if (prev <= 1) {
          const currentMap = liveBetsMapRef.current || {};

          // Tellers who already have bets today (poll top 4 active)
          const tellersWithBets = onDutyTellers.filter((t) => {
            const info = currentMap[t.id];
            return info && (info.count > 0 || info.total > 0);
          });
          const topActive = tellersWithBets.slice(0, 4);

          // Rotating slice of other tellers (poll 4 rotating)
          const otherTellers = onDutyTellers.filter((t) => {
            const info = currentMap[t.id];
            return !info || (info.count === 0 && info.total === 0);
          });

          const sliceSize = 4;
          const start = rotatingIndexRef.current % Math.max(1, otherTellers.length);
          const rotatingSlice = otherTellers.slice(start, start + sliceSize);
          rotatingIndexRef.current = (start + sliceSize) % Math.max(1, otherTellers.length);

          const targetPoll = [...topActive, ...rotatingSlice];
          if (targetPoll.length > 0) {
            fetchLiveBets(targetPoll, realtimeDate, true /* background poll */);
          }
          return 25; // Reset countdown to 25s
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, onDutyTellers.length, realtimeDate, todayStr]);

  const dateColumns = useMemo(() => getDateColumns(range.from, range.to), [range.from, range.to]);
  const previousDateColumns = useMemo(() => dateColumns.map((date) => shiftDate(date, -7)), [dateColumns]);
  const comparisonPeriods = useMemo(() => ({
    current: `${displayDate(range.from)} - ${displayDate(range.to)}`,
    previous: `${displayDate(shiftDate(range.from, -7))} - ${displayDate(shiftDate(range.to, -7))}`
  }), [range.from, range.to]);
  const activeRecords = useMemo(() => {
    const testSpvrRecords = records.filter((r) => isTestSupervisor(r.supervisor));
    if (testSpvrRecords.length === 0) return records;

    const hasContent = hasSupervisorContent(testSpvrRecords, dateColumns, previousDateColumns);
    if (hasContent) {
      return records;
    }

    return records.filter((r) => !isTestSupervisor(r.supervisor));
  }, [records, dateColumns, previousDateColumns]);

  const groupedRecords = useMemo(() => {
    const groups = activeRecords.reduce((acc, record) => {
      const groupName = record.supervisor || "Unassigned supervisor";
      acc[groupName] = acc[groupName] || [];
      acc[groupName].push(record);
      return acc;
    }, {});

    return Object.fromEntries(
      Object.entries(groups).filter(([supervisor, rows]) => {
        if (!isTestSupervisor(supervisor)) return true;
        return hasSupervisorContent(rows, dateColumns, previousDateColumns);
      })
    );
  }, [activeRecords, dateColumns, previousDateColumns]);

  const supervisorTotals = useMemo(() => Object.fromEntries(Object.entries(groupedRecords).map(([supervisor, rows]) => [supervisor, {
    daily: Object.fromEntries(dateColumns.map((date) => [date, rows.reduce((sum, row) => sum + (row.daily[date] || 0), 0)])),
    total: rows.reduce((sum, row) => sum + dateColumns.reduce((dayTotal, date) => dayTotal + (row.daily[date] || 0), 0), 0)
  }])), [dateColumns, groupedRecords]);

  const summary = useMemo(() => ({
    total: activeRecords.reduce((sum, record) => sum + dateColumns.reduce((dateTotal, date) => dateTotal + (record.daily[date] || 0), 0), 0),
    agents: activeRecords.length,
    topAgent: activeRecords.reduce((top, record) => {
      const current = dateColumns.reduce((dateTotal, date) => dateTotal + (record.daily[date] || 0), 0);
      const topCurrent = top ? dateColumns.reduce((dateTotal, date) => dateTotal + (top.daily[date] || 0), 0) : 0;
      return current > topCurrent ? record : top;
    }, null)
  }), [dateColumns, activeRecords]);

  const comparisonRows = useMemo(() => activeRecords
    .map((record) => {
      const current = dateColumns.reduce((sum, date) => sum + (record.daily[date] || 0), 0);
      const previous = previousDateColumns.reduce((sum, date) => sum + (record.daily[date] || 0), 0);
      return { ...record, current, previous, change: current - previous, changePercent: previous ? ((current - previous) / previous) * 100 : current ? 100 : 0 };
    })
    .sort((left, right) => right.current - left.current), [dateColumns, previousDateColumns, activeRecords]);

  const comparisonTotal = useMemo(() => comparisonRows.reduce((result, row) => ({ current: result.current + row.current, previous: result.previous + row.previous }), { current: 0, previous: 0 }), [comparisonRows]);
  const comparisonMax = Math.max(...comparisonRows.slice(0, 10).map((row) => Math.max(row.current, row.previous)), 1);

  const dailyComparison = useMemo(() => dateColumns.map((date, index) => {
    const current = activeRecords.reduce((sum, record) => sum + (record.daily[date] || 0), 0);
    const previous = activeRecords.reduce((sum, record) => sum + (record.daily[previousDateColumns[index]] || 0), 0);
    return { date, previousDate: previousDateColumns[index], current, previous, change: current - previous };
  }), [dateColumns, previousDateColumns, activeRecords]);

  const dailyMax = Math.max(...dailyComparison.map((day) => Math.max(day.current, day.previous)), 1);

  const analyticsData = useMemo(() => {
    const supervisorEntries = Object.entries(groupedRecords);
    const grandCurrentTotal = activeRecords.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
    const grandPreviousTotal = activeRecords.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
    const grandDiff = grandCurrentTotal - grandPreviousTotal;
    const grandDiffPercent = grandPreviousTotal ? ((grandDiff / grandPreviousTotal) * 100) : 0;

    const supervisorStats = supervisorEntries.map(([supervisor, rows]) => {
      const currentTotal = rows.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
      const previousTotal = rows.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
      const diff = currentTotal - previousTotal;
      const diffPercent = previousTotal ? ((diff / previousTotal) * 100) : 0;
      const share = grandCurrentTotal ? ((currentTotal / grandCurrentTotal) * 100) : 0;
      return {
        supervisor,
        agentCount: rows.length,
        currentTotal,
        previousTotal,
        diff,
        diffPercent,
        share
      };
    });

    const sortedSupervisors = [...supervisorStats].sort((a, b) => b.currentTotal - a.currentTotal);
    const maxSupTotal = Math.max(...sortedSupervisors.map((s) => Math.max(s.currentTotal, s.previousTotal)), 1);
    const topSupervisor = sortedSupervisors[0] || null;
    const highestGainSupervisor = [...supervisorStats].sort((a, b) => b.diff - a.diff)[0] || null;

    const dailyGrandStats = dateColumns.map((date, idx) => {
      const cur = activeRecords.reduce((sum, r) => sum + (r.daily[date] || 0), 0);
      const prev = activeRecords.reduce((sum, r) => sum + (r.daily[previousDateColumns[idx]] || 0), 0);
      const diff = cur - prev;
      const diffPercent = prev ? ((diff / prev) * 100) : 0;
      return {
        date,
        prevDate: previousDateColumns[idx],
        cur,
        prev,
        diff,
        diffPercent
      };
    });
    const maxDailyVal = Math.max(...dailyGrandStats.map((d) => Math.max(d.cur, d.prev)), 1);

    const palette = ["#059669", "#0284c7", "#6366f1", "#8b5cf6", "#f59e0b", "#94a3b8"];
    const top5 = sortedSupervisors.slice(0, 5);
    const othersTotal = sortedSupervisors.slice(5).reduce((sum, s) => sum + s.currentTotal, 0);
    const othersShare = grandCurrentTotal ? (othersTotal / grandCurrentTotal) * 100 : 0;
    const distributionSegments = [
      ...top5.map((s, idx) => ({ name: s.supervisor, share: s.share, color: palette[idx], total: s.currentTotal })),
      ...(othersTotal > 0 ? [{ name: "Others", share: othersShare, color: palette[5], total: othersTotal }] : [])
    ];

    return {
      grandCurrentTotal,
      grandPreviousTotal,
      grandDiff,
      grandDiffPercent,
      supervisorStats,
      sortedSupervisors,
      maxSupTotal,
      topSupervisor,
      highestGainSupervisor,
      dailyGrandStats,
      maxDailyVal,
      distributionSegments
    };
  }, [dateColumns, groupedRecords, previousDateColumns, activeRecords]);

  // --- REALTIME AGENT GROSS & ON-DUTY TRACKING ---

  const supervisorMap = useMemo(() => {
    const map = new Map();
    supervisorsList.forEach((s) => {
      const id = String(firstValue(s, ["id", "supervisorId"], ""));
      const name = firstValue(s, ["fullName", "full_name", "name", "username"], "Unassigned supervisor");
      if (id) map.set(id, name);
    });
    return map;
  }, [supervisorsList]);

  const dateGrossRecords = useMemo(() => {
    return rawGrossList.filter((record) => dateKey(record) === realtimeDate);
  }, [rawGrossList, realtimeDate]);

  const availableDrawTimes = useMemo(() => {
    const set = new Set();
    Object.values(liveBetsMap).forEach((info) => {
      Object.keys(info.draws || {}).forEach((dt) => set.add(dt));
    });
    dateGrossRecords.forEach((r) => {
      const time = r.drawTime || r.time || r.draw_time;
      if (time) set.add(String(time));
    });
    return Array.from(set).sort();
  }, [liveBetsMap, dateGrossRecords]);

  const realtimeAgentItems = useMemo(() => {
    const isHistorical = realtimeDate !== todayStr;

    return onDutyTellers.map((teller, index) => {
      const tellerId = String(teller.id);
      const tellerUser = String(teller.username || "").toLowerCase().trim();

      const liveBetInfo = liveBetsMap[teller.id];
      const hasLiveBetRecord = liveBetInfo !== undefined && liveBetInfo !== null && (liveBetInfo.count > 0 || liveBetInfo.total > 0 || (liveBetInfo.bets && liveBetInfo.bets.length > 0));

      let grossSum = 0;
      let hitsSum = 0;
      let draws = [];
      let betsList = [];
      let betsCount = 0;

      // When viewing Today: live bets stream is primary
      // When viewing Yesterday/Past Dates: dateGrossRecords from Accountant API is primary (100% reliable & complete in 1 single request)
      if (!isHistorical && liveBetInfo && liveBetInfo.count !== undefined) {
        betsList = liveBetInfo.bets || [];
        betsCount = liveBetInfo.count || 0;
        if (selectedDrawTime !== "all") {
          grossSum = Number(liveBetInfo.draws?.[selectedDrawTime] || 0);
          draws = grossSum > 0 ? [{ time: selectedDrawTime, gross: grossSum, hits: 0 }] : [];
        } else {
          grossSum = Number(liveBetInfo.total || 0);
          draws = Object.entries(liveBetInfo.draws || {}).map(([time, gross]) => ({
            time,
            gross,
            hits: 0
          }));
        }
      } else {
        const matchingRows = dateGrossRecords.filter((r) => {
          const matchId = String(firstValue(r, ["id", "userId", "collectorId", "tellerId"], "")) === tellerId;
          const rUser = String(firstValue(r, ["username", "user_name"], "")).toLowerCase().trim();
          const matchUser = tellerUser && rUser && rUser === tellerUser;
          if (!matchId && !matchUser) return false;
          if (selectedDrawTime !== "all") {
            const dt = String(r.drawTime || r.time || "");
            return dt === selectedDrawTime;
          }
          return true;
        });

        grossSum = matchingRows.reduce((sum, r) => {
          const val = Number(firstValue(r, ["TotalOverAllGross", "gross", "totalGross", "amount", "total", "grossAmount"], 0)) || 0;
          return sum + val;
        }, 0);

        hitsSum = matchingRows.reduce((sum, r) => {
          const val = Number(firstValue(r, ["TotalOverAllHits", "hits", "totalHits", "hitsAmount"], 0)) || 0;
          return sum + val;
        }, 0);

        draws = matchingRows.map((r) => ({
          time: String(r.drawTime || "Draw"),
          gross: Number(firstValue(r, ["TotalOverAllGross", "gross", "totalGross", "amount"], 0)) || 0,
          hits: Number(firstValue(r, ["TotalOverAllHits", "hits", "totalHits"], 0)) || 0
        }));
        betsCount = matchingRows.length;
        if (isHistorical && liveBetInfo && liveBetInfo.bets) {
          betsList = liveBetInfo.bets;
        }
      }

      const spvrId = String(firstValue(teller, ["supervisor", "supervisorId"], ""));
      const supervisorName = supervisorMap.get(spvrId) ||
        (typeof teller.supervisor === "string" ? teller.supervisor : "") ||
        teller.supervisorName ||
        "Unassigned supervisor";

      return {
        id: teller.id || index,
        keyId: tellerId,
        name: teller.fullName || teller.full_name || teller.name || teller.outlet || `Agent ${index + 1}`,
        username: teller.username || "-",
        supervisor: supervisorName,
        supervisorId: spvrId,
        outlet: teller.outlet || teller.name || "-",
        address: teller.address || teller.location || "-",
        hasGross: grossSum > 0,
        gross: grossSum,
        hits: hitsSum,
        draws,
        bets: betsList,
        betsCount,
        hasLiveSync: liveBetInfo !== undefined
      };
    });
  }, [onDutyTellers, liveBetsMap, dateGrossRecords, selectedDrawTime, supervisorMap, realtimeDate, todayStr]);

  useEffect(() => {
    if (loaded && onDutyTellersRef.current.length > 0) {
      if (prevRealtimeDateRef.current !== realtimeDate) {
        prevRealtimeDateRef.current = realtimeDate;
        const isToday = realtimeDate === todayStr;

        if (isToday) {
          // Returning to Today: fetch live bets stream for top priority on-duty tellers
          const priorityTellers = onDutyTellersRef.current.slice(0, 40);
          fetchLiveBets(priorityTellers, realtimeDate);
        } else {
          // Viewing Yesterday or a past date:
          // Check if rawGrossList already has records for this date from the month-to-date accountant load
          const hasDataForDate = rawGrossListRef.current.some((record) => dateKey(record) === realtimeDate);
          if (!hasDataForDate) {
            console.log(`[HrHub Accountant Sync] ⚡ Fetching official single-request gross records for ${realtimeDate}...`);
            fetchHistoricalGrossForDate(realtimeDate);
          }
        }
      }
    }
  }, [realtimeDate, loaded, todayStr]);

  const realtimeMetrics = useMemo(() => {
    const totalOnDuty = realtimeAgentItems.length;
    const withGrossCount = realtimeAgentItems.filter((a) => a.hasGross).length;
    const withoutGrossCount = totalOnDuty - withGrossCount;
    const percentageWithGross = totalOnDuty > 0 ? ((withGrossCount / totalOnDuty) * 100).toFixed(1) : "0.0";
    const percentageWithoutGross = totalOnDuty > 0 ? ((withoutGrossCount / totalOnDuty) * 100).toFixed(1) : "0.0";
    const totalGross = realtimeAgentItems.reduce((sum, a) => sum + a.gross, 0);
    const totalHits = realtimeAgentItems.reduce((sum, a) => sum + a.hits, 0);
    const averageGross = withGrossCount > 0 ? Math.round(totalGross / withGrossCount) : 0;

    return {
      totalOnDuty,
      withGrossCount,
      withoutGrossCount,
      percentageWithGross,
      percentageWithoutGross,
      totalGross,
      totalHits,
      averageGross,
      dateGrossCount: dateGrossRecords.length
    };
  }, [realtimeAgentItems, dateGrossRecords]);

  const supervisorSummaries = useMemo(() => {
    const map = {};
    realtimeAgentItems.forEach((agent) => {
      const spvr = agent.supervisor || "Unassigned supervisor";
      if (!map[spvr]) {
        map[spvr] = { name: spvr, total: 0, withGross: 0, withoutGross: 0, gross: 0 };
      }
      map[spvr].total += 1;
      if (agent.hasGross) {
        map[spvr].withGross += 1;
        map[spvr].gross += agent.gross;
      } else {
        map[spvr].withoutGross += 1;
      }
    });

    return Object.values(map)
      .filter((s) => !isTestSupervisor(s.name) || s.gross > 0)
      .sort((a, b) => b.total - a.total);
  }, [realtimeAgentItems]);

  const filteredRealtimeAgents = useMemo(() => {
    return realtimeAgentItems.filter((agent) => {
      if (realtimeFilter === "with_gross" && !agent.hasGross) return false;
      if (realtimeFilter === "without_gross" && agent.hasGross) return false;
      if (realtimeSupervisor !== "all" && agent.supervisor !== realtimeSupervisor) return false;

      if (realtimeSearch.trim()) {
        const q = realtimeSearch.toLowerCase().trim();
        const match =
          agent.name.toLowerCase().includes(q) ||
          agent.username.toLowerCase().includes(q) ||
          agent.outlet.toLowerCase().includes(q) ||
          agent.address.toLowerCase().includes(q) ||
          agent.supervisor.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [realtimeAgentItems, realtimeFilter, realtimeSupervisor, realtimeSearch]);

  const exportRealtimeCsv = () => {
    if (!filteredRealtimeAgents.length) return;
    const headers = [
      "#",
      "Field Agent",
      "Username",
      "Supervisor",
      "Outlet",
      "Address",
      "Duty Status",
      "Submission Compliance",
      "Consolidated Gross (PHP)",
      "Total Hits / Payout (PHP)",
      "Draw Schedules Logged",
      "Audit Date"
    ];
    const rows = filteredRealtimeAgents.map((agent, index) => [
      index + 1,
      `"${(agent.name || "").replace(/"/g, '""')}"`,
      `"${(agent.username || "").replace(/"/g, '""')}"`,
      `"${(agent.supervisor || "").replace(/"/g, '""')}"`,
      `"${(agent.outlet || "").replace(/"/g, '""')}"`,
      `"${(agent.address || "").replace(/"/g, '""')}"`,
      '"On Duty (Active)"',
      `"${agent.hasGross ? "Active Submissions" : "Pending Submissions"}"`,
      agent.gross,
      agent.hits,
      `"${(agent.draws || []).map((d) => `${d.time}: ${d.gross}`).join("; ")}"`,
      realtimeDate
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Field-Agent-Audit-${realtimeDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const formatGameLabel = (drawTime) => {
    const dt = String(drawTime || "").trim();
    if (!dt) return "General Draw";
    if (dt === "10:30" || dt === "10") return "10:30 AM Draw";
    if (dt === "14" || dt === "14:00" || dt === "2" || dt === "2:00") return "02:00 PM Draw";
    if (dt === "15" || dt === "15:00" || dt === "3" || dt === "3:00") return "03:00 PM Draw";
    if (dt === "17" || dt === "17:00" || dt === "5" || dt === "5:00") return "05:00 PM Draw";
    if (dt === "19" || dt === "19:00" || dt === "7" || dt === "7:00") return "07:00 PM Draw";
    if (dt === "20" || dt === "20:00" || dt === "8" || dt === "8:00") return "08:00 PM Draw";
    if (dt === "21" || dt === "21:00" || dt === "9" || dt === "9:00") return "09:00 PM Draw";
    return `${dt} Draw`;
  };

  const allLiveEntries = useMemo(() => {
    const list = [];
    onDutyTellers.forEach((teller) => {
      const info = liveBetsMap[teller.id];
      if (info && Array.isArray(info.bets) && info.bets.length > 0) {
        const spvrId = String(firstValue(teller, ["supervisor", "supervisorId"], ""));
        const supervisorName = supervisorMap.get(spvrId) ||
          (typeof teller.supervisor === "string" ? teller.supervisor : "") ||
          teller.supervisorName ||
          "Unassigned supervisor";
        const agentName = teller.fullName || teller.full_name || teller.name || teller.outlet || `Agent ${teller.id}`;
        const outlet = teller.outlet || teller.name || "-";
        const address = teller.address || teller.location || "-";
        const username = teller.username || "-";

        info.bets.forEach((bet) => {
          const betDate = bet.created_at ? bet.created_at.slice(0, 10) : (bet.date || bet.drawDate || "");
          if (betDate && betDate !== realtimeDate) return;

          list.push({
            ...bet,
            tellerId: teller.id,
            agentName,
            username,
            supervisor: supervisorName,
            outlet,
            address,
            rawDrawTime: String(bet.drawTime || ""),
            gameLabel: formatGameLabel(bet.drawTime),
            amount: Number(bet.totalBetAmount) || 0,
            isVoidBool: Number(bet.isVoid) === 1
          });
        });
      }
    });

    // Sort descending by created_at (oras ng pagpasok sa system - pinakabago muna)
    return list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at.replace(" ", "T")).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at.replace(" ", "T")).getTime() : 0;
      return timeB - timeA;
    });
  }, [onDutyTellers, liveBetsMap, supervisorMap, realtimeDate]);

  const gameStats = useMemo(() => {
    const stats = {};
    allLiveEntries.forEach((entry) => {
      const key = entry.rawDrawTime || "other";
      if (!stats[key]) {
        stats[key] = {
          raw: key,
          label: entry.gameLabel,
          count: 0,
          totalGross: 0
        };
      }
      stats[key].count += 1;
      stats[key].totalGross += entry.amount;
    });

    const order = ["10:30", "14", "15", "17", "19", "20", "21"];
    return Object.values(stats).sort((a, b) => {
      const idxA = order.indexOf(a.raw);
      const idxB = order.indexOf(b.raw);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.raw.localeCompare(b.raw);
    });
  }, [allLiveEntries]);

  const filteredLiveEntries = useMemo(() => {
    return allLiveEntries.filter((entry) => {
      if (selectedGameFilter !== "all" && entry.rawDrawTime !== selectedGameFilter) {
        return false;
      }
      if (realtimeSupervisor !== "all" && entry.supervisor !== realtimeSupervisor) {
        return false;
      }
      if (entriesSearch.trim()) {
        const q = entriesSearch.toLowerCase().trim();
        const tx = String(entry.transactionId || "").toLowerCase();
        const name = String(entry.agentName || "").toLowerCase();
        const user = String(entry.username || "").toLowerCase();
        const outlet = String(entry.outlet || "").toLowerCase();
        const spvr = String(entry.supervisor || "").toLowerCase();
        if (!tx.includes(q) && !name.includes(q) && !user.includes(q) && !outlet.includes(q) && !spvr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allLiveEntries, selectedGameFilter, realtimeSupervisor, entriesSearch]);

  const entriesPageSize = 50;
  const totalEntriesPages = Math.max(1, Math.ceil(filteredLiveEntries.length / entriesPageSize));
  const paginatedEntries = useMemo(() => {
    const start = (entriesPage - 1) * entriesPageSize;
    return filteredLiveEntries.slice(start, start + entriesPageSize);
  }, [filteredLiveEntries, entriesPage, entriesPageSize]);

  const exportLiveEntriesCsv = () => {
    if (!filteredLiveEntries.length) return;
    const headers = [
      "#",
      "Timestamp",
      "Draw Schedule",
      "Transaction Ref ID",
      "Field Agent",
      "Username",
      "Supervisor",
      "Outlet",
      "Address",
      "Gross Amount (PHP)",
      "Ledger Status"
    ];
    const rows = filteredLiveEntries.map((e, index) => [
      index + 1,
      `"${(e.created_at || "").replace(/"/g, '""')}"`,
      `"${(e.gameLabel || "").replace(/"/g, '""')}"`,
      `"${(e.transactionId || "").replace(/"/g, '""')}"`,
      `"${(e.agentName || "").replace(/"/g, '""')}"`,
      `"${(e.username || "").replace(/"/g, '""')}"`,
      `"${(e.supervisor || "").replace(/"/g, '""')}"`,
      `"${(e.outlet || "").replace(/"/g, '""')}"`,
      `"${(e.address || "").replace(/"/g, '""')}"`,
      e.amount || 0,
      e.isVoidBool ? "Void" : "Active"
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Live-Transactions-${realtimeDate}-${selectedGameFilter}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const exportReport = () => {
    const header = ["Supervisor", "Agent", "Address", "Status", ...dateColumns, "Total"].join(",") + "\n";
    const body = activeRecords.map((record) => [record.supervisor, record.agent, record.address, record.active, ...dateColumns.map((date) => record.daily[date] || 0), record.total].join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([header + body], { type: "text/csv" }));
    link.download = `gross-report-${range.from}-to-${range.to}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const printComparison = () => {
    const printWindow = window.open("", "_blank", "width=1300,height=850");
    if (!printWindow) return;

    const supervisorEntries = Object.entries(groupedRecords);
    const totalPages = supervisorEntries.length + 2;
    const {
      grandCurrentTotal,
      grandPreviousTotal,
      grandDiff,
      grandDiffPercent,
      sortedSupervisors,
      maxSupTotal,
      topSupervisor,
      highestGainSupervisor,
      dailyGrandStats,
      maxDailyVal,
      distributionSegments
    } = analyticsData;

    const supervisorPagesHtml = supervisorEntries.map(([supervisor, rows], groupIndex) => {
      const supervisorCurrentTotal = rows.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
      const supervisorPreviousTotal = rows.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
      const supervisorDiff = supervisorCurrentTotal - supervisorPreviousTotal;

      const tableRowsHtml = rows.map((record) => {
        const recCurrentTotal = dateColumns.reduce((sum, d) => sum + (record.daily[d] || 0), 0);
        const recPreviousTotal = previousDateColumns.reduce((sum, d) => sum + (record.daily[d] || 0), 0);
        const diff = recCurrentTotal - recPreviousTotal;

        const dailyCells = dateColumns.map((date, idx) => {
          const prevVal = record.daily[previousDateColumns[idx]] || 0;
          const curVal = record.daily[date] || 0;
          return `<td class="num"><div class="cell-wrap"><span class="prev">${currency.format(prevVal)}</span><strong class="curr">${currency.format(curVal)}</strong>${formatDiffTagHtml(curVal, prevVal)}</div></td>`;
        }).join("");

        return `<tr>
          <td class="agent-name"><div class="cell-wrap">${escapeHtml(record.agent)}</div></td>
          ${dailyCells}
          <td class="num total-col">
            <div class="cell-wrap">
              <span class="prev">${currency.format(recPreviousTotal)}</span>
              <strong class="curr">${currency.format(recCurrentTotal)}</strong>
              ${formatDiffTagHtml(recCurrentTotal, recPreviousTotal)}
            </div>
          </td>
        </tr>`;
      }).join("");

      const dailySubtotalCells = dateColumns.map((date, idx) => {
        const dayCur = rows.reduce((sum, r) => sum + (r.daily[date] || 0), 0);
        const dayPrev = rows.reduce((sum, r) => sum + (r.daily[previousDateColumns[idx]] || 0), 0);
        return `<td class="num"><div class="cell-wrap"><span class="prev">${currency.format(dayPrev)}</span><strong class="curr">${currency.format(dayCur)}</strong>${formatDiffTagHtml(dayCur, dayPrev)}</div></td>`;
      }).join("");

      return `
        <div class="supervisor-sheet page-break">
          <div class="sheet-header">
            <div class="header-main">
              <div class="brand">DAILY GROSS COMPARISON</div>
              <div class="supervisor-title">SUPERVISOR: <span>${escapeHtml(supervisor)}</span></div>
              <div class="sub-info">${rows.length} ${rows.length === 1 ? "Agent" : "Agents"} • Daily Breakdown vs 7 Days Earlier</div>
            </div>
            <div class="header-meta">
              <div>7 days earlier: <strong>${comparisonPeriods.previous}</strong></div>
              <div>Selected range: <strong class="text-emerald">${comparisonPeriods.current}</strong></div>
              <div class="legend"><span><i class="dot-prev"></i> 7 Days Earlier</span> <span><i class="dot-curr"></i> Selected Range</span> <span><b style="color:#166534">▲</b> / <b style="color:#991b1b">▼</b> Diff</span></div>
              <div class="page-num">Page ${groupIndex + 1} of ${totalPages}</div>
            </div>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th class="agent-th"><div class="cell-wrap">Agent</div></th>
                ${dateColumns.map((date, idx) => `
                  <th class="date-th">
                    <div class="cell-wrap">
                      <span class="th-prev">Prev: ${escapeHtml(displayDate(previousDateColumns[idx]))}</span>
                      <span class="th-curr">${escapeHtml(displayDate(date))}</span>
                    </div>
                  </th>
                `).join("")}
                <th class="total-th">
                  <div class="cell-wrap">
                    <span class="th-prev">Prev Total</span>
                    <span class="th-curr">Current Total</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
              <!-- Supervisor Total row inside tbody: only displays on the last page of this supervisor and never repeats on every page -->
              <tr class="supervisor-total-row">
                <td class="agent-name"><div class="cell-wrap"><strong>Total (${escapeHtml(supervisor)})</strong></div></td>
                ${dailySubtotalCells}
                <td class="num total-col">
                  <div class="cell-wrap">
                    <span class="prev">${currency.format(supervisorPreviousTotal)}</span>
                    <strong class="curr">${currency.format(supervisorCurrentTotal)}</strong>
                    ${formatDiffTagHtml(supervisorCurrentTotal, supervisorPreviousTotal)}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="sheet-footer">
            <span>HRHub • Daily Gross Comparison Report</span>
            <span>Printed on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      `;
    }).join("");

    const summaryRowsHtml = supervisorEntries.map(([supervisor, rows]) => {
      const supCurTot = rows.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
      const supPrevTot = rows.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
      const sDiff = supCurTot - supPrevTot;
      const sCells = dateColumns.map((date, idx) => {
        const dCur = rows.reduce((sum, r) => sum + (r.daily[date] || 0), 0);
        const dPrev = rows.reduce((sum, r) => sum + (r.daily[previousDateColumns[idx]] || 0), 0);
        return `<td class="num"><div class="cell-wrap"><span class="prev">${currency.format(dPrev)}</span><strong class="curr">${currency.format(dCur)}</strong>${formatDiffTagHtml(dCur, dPrev)}</div></td>`;
      }).join("");
      return `<tr>
        <td class="agent-name"><div class="cell-wrap"><strong>${escapeHtml(supervisor)}</strong> <small class="sub-info">(${rows.length} ${rows.length === 1 ? "agent" : "agents"})</small></div></td>
        ${sCells}
        <td class="num total-col">
          <div class="cell-wrap">
            <span class="prev">${currency.format(supPrevTot)}</span>
            <strong class="curr">${currency.format(supCurTot)}</strong>
            ${formatDiffTagHtml(supCurTot, supPrevTot)}
          </div>
        </td>
      </tr>`;
    }).join("");

    const grandTotalCellsHtml = dateColumns.map((date, idx) => {
      const grandCur = activeRecords.reduce((sum, r) => sum + (r.daily[date] || 0), 0);
      const grandPrev = activeRecords.reduce((sum, r) => sum + (r.daily[previousDateColumns[idx]] || 0), 0);
      return `<td class="num"><div class="cell-wrap"><span class="prev">${currency.format(grandPrev)}</span><strong class="curr">${currency.format(grandCur)}</strong>${formatDiffTagHtml(grandCur, grandPrev)}</div></td>`;
    }).join("");

    const summarySheetHtml = `
      <div class="supervisor-sheet summary-sheet page-break">
        <div class="sheet-header">
          <div class="header-main">
            <div class="brand">DAILY GROSS COMPARISON</div>
            <div class="supervisor-title">SUPERVISOR TOTALS &amp; GRAND SUMMARY</div>
            <div class="sub-info">${supervisorEntries.length} Supervisors • ${activeRecords.length} Total Agents • Final Summary Page</div>
          </div>
            <div class="header-meta">
              <div>7 days earlier: <strong>${comparisonPeriods.previous}</strong></div>
              <div>Selected range: <strong class="text-emerald">${comparisonPeriods.current}</strong></div>
              <div class="legend"><span><i class="dot-prev"></i> 7 Days Earlier</span> <span><i class="dot-curr"></i> Selected Range</span> <span><b style="color:#166534">▲</b> / <b style="color:#991b1b">▼</b> Diff</span></div>
              <div class="page-num">Page ${totalPages - 1} of ${totalPages} (Summary Table)</div>
          </div>
        </div>

        <table class="report-table">
          <thead>
            <tr>
              <th class="agent-th"><div class="cell-wrap">Supervisor</div></th>
              ${dateColumns.map((date, idx) => `
                <th class="date-th">
                  <div class="cell-wrap">
                    <span class="th-prev">Prev: ${escapeHtml(displayDate(previousDateColumns[idx]))}</span>
                    <span class="th-curr">${escapeHtml(displayDate(date))}</span>
                  </div>
                </th>
              `).join("")}
              <th class="total-th">
                <div class="cell-wrap">
                  <span class="th-prev">Prev Total</span>
                  <span class="th-curr">Current Total</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            ${summaryRowsHtml}
          </tbody>
          <tfoot>
            <tr class="subtotal-row grand-total-row">
              <td><div class="cell-wrap"><strong>GRAND TOTAL</strong></div></td>
              ${grandTotalCellsHtml}
              <td class="num total-col">
                <div class="cell-wrap">
                  <span class="prev">${currency.format(grandPreviousTotal)}</span>
                  <strong class="curr">${currency.format(grandCurrentTotal)}</strong>
                  ${formatDiffTagHtml(grandCurrentTotal, grandPreviousTotal)}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
        <div class="sheet-footer">
          <span>HRHub • Daily Gross Comparison Report • Consolidated Table Page</span>
          <span>Printed on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    `;

    const dailyBarsHtml = dailyGrandStats.map((day) => {
      const prevHeight = Math.max(Math.round((day.prev / maxDailyVal) * 125), 6);
      const curHeight = Math.max(Math.round((day.cur / maxDailyVal) * 125), 6);
      const diffTag = day.diff >= 0 ? `+${day.diffPercent.toFixed(0)}%` : `${day.diffPercent.toFixed(0)}%`;
      const diffClass = day.diff >= 0 ? "diff-pos" : "diff-neg";

      return `
        <div class="daily-col">
          <div class="daily-val-badge">
            <span class="daily-cur-val">${currency.format(day.cur)}</span>
            <span class="daily-diff-badge ${diffClass}">${diffTag}</span>
          </div>
          <div class="daily-bar-stage">
            <div class="v-bar v-bar-prev" style="height:${prevHeight}px;" title="Prev: ${currency.format(day.prev)}"></div>
            <div class="v-bar v-bar-curr" style="height:${curHeight}px;" title="Current: ${currency.format(day.cur)}"></div>
          </div>
          <div class="daily-date-labels">
            <span class="daily-date-curr">${escapeHtml(displayDate(day.date).replace(/, \d{4}/, ""))}</span>
            <span class="daily-date-prev">Prev: ${escapeHtml(displayDate(day.prevDate).replace(/, \d{4}/, ""))}</span>
          </div>
        </div>
      `;
    }).join("");

    const supervisorRankingHtml = sortedSupervisors.map((s, rankIdx) => {
      const curWidth = Math.max(Math.round((s.currentTotal / maxSupTotal) * 100), 1);
      const prevWidth = Math.max(Math.round((s.previousTotal / maxSupTotal) * 100), 1);
      const diffSign = s.diff >= 0 ? "+" : "";
      const diffClass = s.diff >= 0 ? "diff-pos" : "diff-neg";

      return `
        <div class="rank-row">
          <div class="rank-name-col">
            <span class="rank-badge">#${rankIdx + 1}</span>
            <span class="rank-name" title="${escapeHtml(s.supervisor)}">${escapeHtml(s.supervisor)}</span>
            <span class="rank-agents">(${s.agentCount}a)</span>
          </div>
          <div class="rank-bar-col">
            <div class="h-bar-track">
              <div class="h-bar h-bar-prev" style="width:${prevWidth}%;" title="Prev: ${currency.format(s.previousTotal)}"></div>
              <div class="h-bar h-bar-curr" style="width:${curWidth}%;" title="Current: ${currency.format(s.currentTotal)}"></div>
            </div>
          </div>
          <div class="rank-val-col">
            <span class="rank-curr-val">${currency.format(s.currentTotal)}</span>
            <span class="rank-diff ${diffClass}">${diffSign}${currency.format(s.diff)}</span>
            <span class="rank-share">${s.share.toFixed(1)}%</span>
          </div>
        </div>
      `;
    }).join("");

    const distributionBarsHtml = distributionSegments.map((seg) => `
      <div class="dist-seg" style="width:${seg.share}%; background:${seg.color};" title="${escapeHtml(seg.name)}: ${seg.share.toFixed(1)}% (${currency.format(seg.total)})"></div>
    `).join("");

    const distributionLegendHtml = distributionSegments.map((seg) => `
      <div class="dist-leg-item">
        <span class="dist-dot" style="background:${seg.color};"></span>
        <span class="dist-label"><strong>${escapeHtml(seg.name)}</strong>: ${seg.share.toFixed(1)}%</span>
      </div>
    `).join("");

    const analyticsSheetHtml = `
      <div class="supervisor-sheet analytics-sheet">
        <div class="sheet-header">
          <div class="header-main">
            <div class="brand">DAILY GROSS COMPARISON • PERFORMANCE ANALYTICS</div>
            <div class="supervisor-title">VISUAL PERFORMANCE CHARTS &amp; SUMMARY</div>
            <div class="sub-info">${supervisorEntries.length} Supervisors • ${activeRecords.length} Total Agents • Final Analytics Page</div>
          </div>
          <div class="header-meta">
            <div>7 days earlier: <strong>${comparisonPeriods.previous}</strong></div>
            <div>Selected range: <strong class="text-emerald">${comparisonPeriods.current}</strong></div>
            <div class="legend"><span><i class="dot-prev"></i> 7 Days Earlier</span> <span><i class="dot-curr"></i> Selected Range</span></div>
            <div class="page-num">Page ${totalPages} of ${totalPages} (Final Page • Visual Charts)</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-lbl">Selected Range Total</div>
            <div class="kpi-num text-emerald">${currency.format(grandCurrentTotal)}</div>
            <div class="kpi-sub">Gross for selected dates</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Comparison Total</div>
            <div class="kpi-num">${currency.format(grandPreviousTotal)}</div>
            <div class="kpi-sub">Gross 7 days earlier</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Net Performance Variance</div>
            <div class="kpi-num ${grandDiff >= 0 ? "diff-pos" : "diff-neg"}">${grandDiff >= 0 ? "+" : ""}${currency.format(grandDiff)}</div>
            <div class="kpi-sub">${grandDiff >= 0 ? "▲ +" : "▼ "}${grandDiffPercent.toFixed(1)}% vs previous period</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Top Supervisor (Volume)</div>
            <div class="kpi-num">${escapeHtml(topSupervisor?.supervisor || "-")}</div>
            <div class="kpi-sub">${currency.format(topSupervisor?.currentTotal || 0)} (${topSupervisor?.share.toFixed(1)}% share)</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-lbl">Highest Growth Supervisor</div>
            <div class="kpi-num">${escapeHtml(highestGainSupervisor?.supervisor || "-")}</div>
            <div class="kpi-sub">${highestGainSupervisor?.diff >= 0 ? "+" : ""}${currency.format(highestGainSupervisor?.diff || 0)} (${highestGainSupervisor?.diffPercent.toFixed(1)}%)</div>
          </div>
        </div>

        <div class="analytics-grid">
          <div class="analytics-col">
            <div class="card-box">
              <div class="box-head">
                <span class="box-title">DAILY SALES TREND (SELECTED RANGE VS 7 DAYS EARLIER)</span>
                <span class="box-sub">Daily Grand Gross: 7 Days Earlier vs Selected Range</span>
              </div>
              <div class="daily-chart-stage">
                ${dailyBarsHtml}
              </div>
              <div class="chart-foot-legend">
                <span><i class="dot-prev"></i> Gross 7 Days Earlier</span>
                <span><i class="dot-curr"></i> Selected Range Gross</span>
              </div>
            </div>

            <div class="card-box mt-2">
              <div class="box-head">
                <span class="box-title">SUPERVISOR MARKET SHARE CONTRIBUTION</span>
                <span class="box-sub">Share of Grand Total Gross</span>
              </div>
              <div class="dist-bar-track">
                ${distributionBarsHtml}
              </div>
              <div class="dist-legend-grid">
                ${distributionLegendHtml}
              </div>
            </div>
          </div>

          <div class="analytics-col">
            <div class="card-box ranking-box">
              <div class="box-head">
                <span class="box-title">SUPERVISOR PERFORMANCE RANKING</span>
                <span class="box-sub">Ranked by Current Gross (Previous vs Current)</span>
              </div>
              <div class="ranking-list">
                ${supervisorRankingHtml}
              </div>
              <div class="chart-foot-legend mt-1">
                <span><i class="dot-curr"></i> Selected Range Total</span>
                <span><i class="dot-prev"></i> Total 7 Days Earlier</span>
                <span style="margin-left:auto; color:#64748b;">(Amount • Diff • Share %)</span>
              </div>
            </div>
          </div>
        </div>

        <div class="sheet-footer">
          <span>HRHub • Daily Gross Comparison Report • Visual Analytics &amp; Charts Dashboard</span>
          <span>Printed on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    `;

    const printHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Daily Gross Comparison - Per Supervisor</title>
  <style>
    @page {
      size: landscape;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .supervisor-sheet {
      page-break-inside: auto;
      break-inside: auto;
      padding: 4px 0;
      margin-bottom: 20px;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
    }
    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #059669;
      padding-bottom: 6px;
      margin-bottom: 10px;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .brand {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.1em;
      color: #059669;
      text-transform: uppercase;
    }
    .supervisor-title {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
    }
    .supervisor-title span {
      background: #f0fdf4;
      color: #15803d;
      border: 1px solid #bbf7d0;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
      font-weight: 900;
    }
    .sub-info {
      font-size: 10px;
      color: #64748b;
      margin-top: 3px;
    }
    .header-meta {
      text-align: right;
      font-size: 10px;
      color: #475569;
      line-height: 1.35;
    }
    .text-emerald {
      color: #047857;
      font-weight: bold;
    }
    .legend {
      margin-top: 3px;
      font-size: 9px;
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      margin-left: 8px;
    }
    .dot-prev {
      display: inline-block;
      width: 7px;
      height: 7px;
      background: #94a3b8;
      border-radius: 2px;
      margin-right: 3px;
    }
    .dot-curr {
      display: inline-block;
      width: 7px;
      height: 7px;
      background: #047857;
      border-radius: 2px;
      margin-right: 3px;
    }
    .page-num {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      margin-top: 2px;
    }
    table.report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      table-layout: fixed;
      page-break-inside: auto;
      break-inside: auto;
      overflow: visible !important;
    }
    table.report-table thead {
      display: table-header-group;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    table.report-table tbody {
      page-break-inside: auto;
      break-inside: auto;
      overflow: visible !important;
    }
    table.report-table tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
      -webkit-column-break-inside: avoid !important;
      overflow: visible !important;
    }
    table.report-table th, table.report-table td {
      border: 1px solid #cbd5e1;
      padding: 3.5px 5px;
      vertical-align: middle;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
      -webkit-column-break-inside: avoid !important;
      overflow: visible !important;
    }
    .cell-wrap {
      display: block;
      width: 100%;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
      -webkit-column-break-inside: avoid !important;
      overflow: visible !important;
    }
    table.report-table th {
      background: #f8fafc;
      color: #0f172a;
      font-weight: 800;
      text-align: left;
      border-bottom: 2px solid #64748b;
    }
    th.agent-th {
      width: 18%;
    }
    th.date-th {
      text-align: right;
      width: 10.2%;
    }
    th.total-th {
      text-align: right;
      width: 11.2%;
      background: #ecfdf5 !important;
      border-left: 2px solid #059669 !important;
      border-bottom: 2px solid #059669 !important;
    }
    th.total-th .th-curr {
      color: #064e3b !important;
      font-weight: 950 !important;
      font-size: 10px !important;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      display: block;
      line-height: 1.25;
    }
    th.total-th .th-prev {
      color: #047857 !important;
      font-size: 8px !important;
      font-weight: 700 !important;
      display: block;
      line-height: 1.25;
      opacity: 0.85;
    }
    .th-curr {
      color: #0f172a;
      font-weight: 900;
      font-size: 9.5px;
      display: block;
      line-height: 1.25;
    }
    .th-prev {
      color: #64748b;
      font-size: 8px;
      font-weight: 600;
      display: block;
      line-height: 1.25;
    }
    td.num {
      text-align: right;
    }
    td.agent-name {
      font-weight: 700;
      color: #0f172a;
      overflow: visible !important;
      white-space: normal;
      word-break: break-word;
    }
    .prev {
      color: #64748b;
      font-size: 8.5px;
      display: block;
      line-height: 1.25;
    }
    .curr {
      color: #047857;
      font-weight: 800;
      font-size: 9.5px;
      display: block;
      line-height: 1.25;
    }
    .diff-pos {
      color: #15803d;
      font-weight: 700;
      font-size: 8px;
      display: block;
      line-height: 1.1;
    }
    .diff-neg {
      color: #b91c1c;
      font-weight: 700;
      font-size: 8px;
      display: block;
      line-height: 1.1;
    }
    .diff-tag {
      display: inline-block;
      font-size: 7.5px;
      font-weight: 800;
      line-height: 1.15;
      padding: 0.5px 3.5px;
      border-radius: 3px;
      margin-top: 1.5px;
      white-space: nowrap;
      letter-spacing: -0.01em;
    }
    .diff-tag.diff-pos {
      color: #166534;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }
    .diff-tag.diff-neg {
      color: #991b1b;
      background: #fef2f2;
      border: 1px solid #fecaca;
    }
    .diff-tag.diff-zero {
      color: #64748b;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    td.total-col {
      background: #f0fdf4 !important;
      border-left: 2px solid #059669 !important;
    }
    tbody tr:nth-child(even) td.total-col {
      background: #e6f9ed !important;
    }
    td.total-col .curr {
      color: #065f46 !important;
      font-size: 11px !important;
      font-weight: 900 !important;
      letter-spacing: -0.01em;
    }
    td.total-col .prev {
      color: #64748b !important;
      font-size: 8px !important;
      font-weight: 600 !important;
    }
    td.total-col .diff-tag {
      font-size: 8px !important;
      font-weight: 900 !important;
      padding: 0.5px 4px !important;
      border-width: 1.5px !important;
    }
    tbody tr:nth-child(even) {
      background: #fafafa;
    }
    tr.supervisor-total-row {
      background: #f8fafc !important;
      border-top: 2px solid #64748b !important;
      border-bottom: 2px solid #64748b !important;
      font-weight: 800 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
      -webkit-column-break-inside: avoid !important;
    }
    tr.supervisor-total-row td {
      border-top: 2px solid #64748b !important;
      border-bottom: 2px solid #64748b !important;
      background: #f8fafc !important;
      color: #0f172a !important;
      font-weight: 800 !important;
      padding: 4px 5px !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
      -webkit-column-break-inside: avoid !important;
    }
    tr.supervisor-total-row td.total-col {
      background: #dcfce7 !important;
      border-left: 2px solid #047857 !important;
      border-top: 2px solid #64748b !important;
      border-bottom: 2px solid #64748b !important;
    }
    tr.supervisor-total-row td.total-col .curr {
      color: #064e3b !important;
      font-size: 12px !important;
      font-weight: 950 !important;
    }
    tr.supervisor-total-row .curr {
      color: #0f172a !important;
      font-weight: 900 !important;
    }
    tfoot tr.subtotal-row {
      background: #f8fafc;
      border-top: 2px solid #64748b;
      font-weight: 800;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
      -webkit-column-break-inside: avoid !important;
    }
    tfoot tr.grand-total-row {
      background: #f1f5f9;
      border-top: 2px solid #0f172a;
      border-bottom: 3px double #0f172a;
      font-weight: 900;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
      -webkit-column-break-inside: avoid !important;
    }
    tfoot tr.subtotal-row td {
      border-top: 2px solid #64748b;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      break-inside: avoid-page !important;
      -webkit-column-break-inside: avoid !important;
    }
    tfoot tr.grand-total-row td {
      border-top: 2px solid #0f172a;
      border-bottom: 3px double #0f172a;
    }
    tfoot tr.grand-total-row td.total-col {
      background: #bbf7d0 !important;
      border-left: 2px solid #047857 !important;
      border-top: 2px solid #047857 !important;
      border-bottom: 3px double #047857 !important;
    }
    tfoot tr.grand-total-row td.total-col .curr {
      color: #064e3b !important;
      font-size: 13px !important;
      font-weight: 950 !important;
    }
    .sheet-footer {
      margin-top: 6px;
      font-size: 8px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .analytics-sheet {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      padding: 0;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .kpi-lbl {
      font-size: 8px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-num {
      font-size: 15px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .kpi-sub {
      font-size: 8px;
      font-weight: 600;
      color: #475569;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .analytics-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 10px;
      align-items: stretch;
    }
    .analytics-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
    }
    .card-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .ranking-box {
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .mt-2 {
      margin-top: 8px;
    }
    .mt-1 {
      margin-top: 4px;
    }
    .box-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .box-title {
      font-size: 9.5px;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.04em;
    }
    .box-sub {
      font-size: 8px;
      color: #64748b;
    }
    .daily-chart-stage {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      height: 215px;
      border-bottom: 1px solid #cbd5e1;
      padding-top: 8px;
      padding-bottom: 4px;
    }
    .daily-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      height: 100%;
      padding: 0 2px;
    }
    .daily-val-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 8px;
      line-height: 1.15;
    }
    .daily-cur-val {
      font-size: 8.5px;
      font-weight: 800;
      color: #0f172a;
      white-space: nowrap;
    }
    .daily-diff-badge {
      font-size: 7.5px;
      font-weight: 700;
      margin-top: 1px;
    }
    .daily-bar-stage {
      display: flex;
      align-items: flex-end;
      gap: 3px;
      justify-content: center;
      width: 100%;
      height: 140px;
    }
    .v-bar {
      width: 15px;
      border-radius: 3px 3px 0 0;
      min-height: 3px;
    }
    .v-bar-prev {
      background: #94a3b8;
    }
    .v-bar-curr {
      background: #059669;
    }
    .daily-date-labels {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-top: 6px;
      line-height: 1.15;
    }
    .daily-date-curr {
      font-size: 8.5px;
      font-weight: 800;
      color: #0f172a;
    }
    .daily-date-prev {
      font-size: 7px;
      color: #64748b;
    }
    .chart-foot-legend {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 6px;
      font-size: 8px;
      color: #475569;
    }
    .chart-foot-legend span {
      display: inline-flex;
      align-items: center;
    }
    .dist-bar-track {
      display: flex;
      height: 14px;
      border-radius: 3px;
      overflow: hidden;
      background: #e2e8f0;
      margin-top: 6px;
      margin-bottom: 2px;
    }
    .dist-seg {
      height: 100%;
    }
    .dist-legend-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 5px 12px;
      margin-top: 6px;
    }
    .dist-leg-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 8px;
      color: #334155;
    }
    .dist-dot {
      width: 7px;
      height: 7px;
      border-radius: 1.5px;
      display: inline-block;
    }
    .ranking-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      justify-content: space-around;
    }
    .rank-row {
      display: grid;
      grid-template-columns: 140px 1fr 165px;
      align-items: center;
      gap: 10px;
      font-size: 8.5px;
      padding: 3.5px 0;
      border-bottom: 1px dashed #e2e8f0;
    }
    .rank-name-col {
      display: flex;
      align-items: center;
      gap: 4px;
      overflow: hidden;
      white-space: nowrap;
    }
    .rank-badge {
      font-size: 7.5px;
      font-weight: 800;
      color: #64748b;
      min-width: 16px;
    }
    .rank-name {
      font-weight: 800;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .rank-agents {
      font-size: 7.5px;
      color: #94a3b8;
    }
    .rank-bar-col {
      display: flex;
      align-items: center;
      width: 100%;
      padding-right: 6px;
    }
    .h-bar-track {
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: 100%;
    }
    .h-bar {
      height: 5px;
      border-radius: 1.5px;
      min-width: 2px;
    }
    .h-bar-curr {
      background: #059669;
    }
    .h-bar-prev {
      background: #94a3b8;
    }
    .rank-val-col {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 5px;
      white-space: nowrap;
      text-align: right;
      min-width: 160px;
      flex-shrink: 0;
    }
    .rank-curr-val {
      font-weight: 800;
      color: #0f172a;
      font-size: 8.5px;
    }
    .rank-diff {
      font-size: 8px;
      font-weight: 700;
    }
    .rank-share {
      font-size: 7.5px;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 2px;
    }
    @media print {
      body {
        padding: 0;
        margin: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .supervisor-sheet {
        margin-bottom: 0;
        page-break-inside: auto;
        break-inside: auto;
      }
      table.report-table {
        page-break-inside: auto;
        break-inside: auto;
        overflow: visible !important;
      }
      table.report-table thead {
        display: table-header-group;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      table.report-table tbody {
        page-break-inside: auto;
        break-inside: auto;
        overflow: visible !important;
      }
      table.report-table tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        break-inside: avoid-page !important;
        -webkit-column-break-inside: avoid !important;
        overflow: visible !important;
      }
      table.report-table td, table.report-table th {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        break-inside: avoid-page !important;
        -webkit-column-break-inside: avoid !important;
        overflow: visible !important;
      }
      .cell-wrap {
        display: block !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        break-inside: avoid-page !important;
        -webkit-column-break-inside: avoid !important;
        overflow: visible !important;
      }
      .analytics-sheet {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  ${supervisorPagesHtml}
  ${summarySheetHtml}
  ${analyticsSheetHtml}
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const exportWord = () => {
    const dailyMax = Math.max(...dailyComparison.map((day) => Math.max(day.previous, day.current)), 1);
    const dailyGraphRows = dailyComparison.map((day) => `<tr><td>${escapeHtml(displayDate(day.date))}</td><td><div class="bar previous" style="width:${(day.previous / dailyMax) * 100}%"></div><div class="bar current" style="width:${(day.current / dailyMax) * 100}%"></div></td><td class="number">${currency.format(day.previous)}</td><td class="number">${currency.format(day.current)}</td><td class="number ${day.change >= 0 ? "up" : "down"}">${day.change >= 0 ? "+" : ""}${currency.format(day.change)}</td></tr>`).join("");
    const dailyHeaders = dateColumns.map((date, idx) => `<th><small>Prev: ${escapeHtml(displayDate(previousDateColumns[idx]))}</small><br/><strong>${escapeHtml(displayDate(date))}</strong></th>`).join("");
    const supervisorSections = Object.entries(groupedRecords).map(([supervisor, rows], sIndex) => {
      const pageBreak = sIndex > 0 ? `<br clear="all" style="page-break-before:always; mso-special-format:page-break;" />` : "";
      return `${pageBreak}<h2>Supervisor: ${escapeHtml(supervisor)} (${rows.length} ${rows.length === 1 ? "Agent" : "Agents"})</h2><table><thead><tr><th>Agent</th><th>Address</th><th>Status</th>${dailyHeaders}<th style="background:#ecfdf5;border-left:2px solid #059669;color:#064e3b;text-align:right;">Total</th></tr></thead><tbody>${rows.map((record) => {
        const curTot = dateColumns.reduce((sum, d) => sum + (record.daily[d] || 0), 0);
        const prevTot = dateColumns.reduce((sum, d) => sum + (record.daily[previousDateColumns[dateColumns.indexOf(d)]] || 0), 0);
        return `<tr><td>${escapeHtml(record.agent)}</td><td>${escapeHtml(record.address)}</td><td>${escapeHtml(record.active)}</td>${dateColumns.map((date, index) => `<td class="number"><span style="color:#64748b">${currency.format(record.daily[previousDateColumns[index]] || 0)}</span><br/><strong>${currency.format(record.daily[date] || 0)}</strong><br/>${formatDiffTagHtml(record.daily[date] || 0, record.daily[previousDateColumns[index]] || 0)}</td>`).join("")}<td class="number" style="background:#f0fdf4;border-left:2px solid #059669;"><span style="color:#64748b">${currency.format(prevTot)}</span><br/><strong style="color:#065f46;font-size:10px;">${currency.format(curTot)}</strong><br/>${formatDiffTagHtml(curTot, prevTot)}</td></tr>`;
      }).join("")}</tbody></table>`;
    }).join("");
    const grandCurrentTot = activeRecords.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
    const grandPrevTot = activeRecords.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
    const summarySection = `<br clear="all" style="page-break-before:always; mso-special-format:page-break;" /><h2>SUPERVISOR TOTALS &amp; GRAND SUMMARY</h2><table><thead><tr><th>Supervisor</th><th>Agents</th>${dailyHeaders}<th style="background:#ecfdf5;border-left:2px solid #059669;color:#064e3b;text-align:right;">Range Total</th></tr></thead><tbody>${Object.entries(groupedRecords).map(([supervisor, rows]) => {
      const sCur = rows.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
      const sPrev = rows.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
      return `<tr><td><strong>${escapeHtml(supervisor)}</strong></td><td>${rows.length}</td>${dateColumns.map((date, idx) => {
        const dCur = rows.reduce((sum, r) => sum + (r.daily[date] || 0), 0);
        const dPrev = rows.reduce((sum, r) => sum + (r.daily[previousDateColumns[idx]] || 0), 0);
        return `<td class="number"><span style="color:#64748b">${currency.format(dPrev)}</span><br/><strong>${currency.format(dCur)}</strong><br/>${formatDiffTagHtml(dCur, dPrev)}</td>`;
      }).join("")}<td class="number" style="background:#f0fdf4;border-left:2px solid #059669;"><span style="color:#64748b">${currency.format(sPrev)}</span><br/><strong style="color:#065f46;font-size:10px;">${currency.format(sCur)}</strong><br/>${formatDiffTagHtml(sCur, sPrev)}</td></tr>`;
    }).join("")}</tbody><tfoot><tr style="background:#e2e8f0;font-weight:bold"><td colspan="2">GRAND TOTAL</td>${dateColumns.map((date, idx) => {
      const gdCur = activeRecords.reduce((sum, r) => sum + (r.daily[date] || 0), 0);
      const gdPrev = activeRecords.reduce((sum, r) => sum + (r.daily[previousDateColumns[idx]] || 0), 0);
      return `<td class="number"><span style="color:#64748b">${currency.format(gdPrev)}</span><br/><strong>${currency.format(gdCur)}</strong><br/>${formatDiffTagHtml(gdCur, gdPrev)}</td>`;
    }).join("")}<td class="number" style="background:#bbf7d0;border-left:2px solid #047857;"><span style="color:#64748b">${currency.format(grandPrevTot)}</span><br/><strong style="color:#064e3b;font-size:11px;">${currency.format(grandCurrentTot)}</strong><br/>${formatDiffTagHtml(grandCurrentTot, grandPrevTot)}</td></tr></tfoot></table>`;
    const wordDocument = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172033;margin:10px}h1{font-size:24px;margin-bottom:4px}h2{font-size:16px;background:#0d1b2a;color:white;padding:8px;margin:24px 0 8px}p{font-size:11px;color:#64748b}table{border-collapse:collapse;width:100%;margin-bottom:14px;font-size:9px;page-break-inside:avoid;table-layout:auto}tr{page-break-inside:avoid}th{background:#e2e8f0;text-align:left;white-space:nowrap}th,td{border:1px solid #cbd5e1;padding:5px;white-space:nowrap}th:nth-child(n+4),td.number{text-align:right}.agent{font-weight:bold}.agent small{display:block;color:#64748b;font-weight:normal}.bar{height:7px;margin:3px 0;border-radius:3px;min-width:4px}.previous{background:#94a3b8}.current{background:#10b981}.up{color:#059669;font-weight:bold}.down{color:#e11d48;font-weight:bold}.diff-tag{display:inline-block;font-size:7.5px;font-weight:bold;padding:1px 3px;border-radius:2px}.diff-pos{color:#166534;background:#f0fdf4}.diff-neg{color:#991b1b;background:#fef2f2}.diff-zero{color:#64748b}.legend{margin:12px 0}.legend span{display:inline-block;margin-right:18px}.legend i{display:inline-block;width:10px;height:10px;margin-right:4px}.note{font-size:10px;color:#64748b}small{font-weight:normal;color:#64748b}</style></head><body><h1>DAILY SALES REPORT • PER SUPERVISOR</h1><p>Previous week: <strong>${comparisonPeriods.previous}</strong> &nbsp; vs &nbsp; Current week: <strong>${comparisonPeriods.current}</strong></p><p>Each supervisor section below shows the seven daily sales values for every agent.</p><p class="legend"><span><i style="background:#94a3b8"></i>Previous week daily sales</span><span><i style="background:#10b981"></i>Current week daily sales</span></p><h2>Daily sales comparison • all supervisors</h2><table><thead><tr><th>Date</th><th>Graph</th><th>Previous week</th><th>Current week</th><th>Difference</th></tr></thead><tbody>${dailyGraphRows}</tbody></table>${supervisorSections}${summarySection}<p class="note">Generated by HRHub on ${new Date().toLocaleString()}</p></body></html>`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([wordDocument], { type: "application/msword" }));
    link.download = `daily-gross-comparison-per-supervisor-${range.from}-to-${range.to}.doc`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const openPreview = () => setPreviewOpen(true);

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Executive Command Header */}
      <div className="border-b border-slate-800 bg-[#0d1b2a] px-6 py-3.5 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Module Identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 shadow-md shadow-emerald-500/20">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-400">
                  Operations & Audit
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.2 text-[8px] font-bold text-slate-300">
                  Live Suite
                </span>
              </div>
              <h3 className="text-base font-black tracking-tight text-white sm:text-lg">
                Gross Operations Report
              </h3>
            </div>
          </div>

          {/* Compact Icon Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Contextual Date Controls */}
            {reportTab === "realtime" ? (
              <div className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 p-0.5 backdrop-blur-xs">
                <button
                  type="button"
                  onClick={() => setRealtimeDate(todayStr)}
                  className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                    realtimeDate === todayStr ? "bg-emerald-500 text-slate-950 shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                  title="Today"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setRealtimeDate(yesterdayStr)}
                  className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                    realtimeDate === yesterdayStr ? "bg-emerald-500 text-slate-950 shadow-xs" : "text-slate-300 hover:text-white"
                  }`}
                  title="Yesterday"
                >
                  Yesterday
                </button>
                <input
                  type="date"
                  value={realtimeDate}
                  onChange={(e) => setRealtimeDate(e.target.value)}
                  className="rounded-md border border-white/15 bg-slate-900/90 px-1.5 py-0.5 text-xs font-semibold text-white outline-none focus:border-emerald-400"
                  title="Audit date"
                />
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 backdrop-blur-xs text-xs">
                <CalendarDays size={13} className="text-emerald-400" />
                <input
                  type="date"
                  value={range.from}
                  onChange={(event) => setRange({ ...range, from: event.target.value })}
                  className="rounded border border-white/15 bg-slate-900/90 px-1.5 py-0.5 text-xs text-white outline-none"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={range.to}
                  onChange={(event) => setRange({ ...range, to: event.target.value })}
                  className="rounded border border-white/15 bg-slate-900/90 px-1.5 py-0.5 text-xs text-white outline-none"
                />
              </div>
            )}

            {/* Auto-Sync Toggle (Icon Button) */}
            {reportTab === "realtime" && (
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition shadow-xs ${
                  autoRefresh
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    : "border-white/15 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                }`}
                title={autoRefresh ? "Auto-Sync Streaming Active (12s) — Click to pause" : "Auto-Sync Paused — Click to resume"}
              >
                <Radio size={14} className={autoRefresh ? "text-emerald-400 animate-pulse" : "text-slate-400"} />
              </button>
            )}

            {/* Manual Sync (Icon Button) */}
            <button
              type="button"
              onClick={() => {
                if (reportTab === "realtime") {
                  if (realtimeDate === todayStr) {
                    setLiveBetsMap({});
                    CACHED_LIVE_BETS = {};
                    try {
                      sessionStorage.removeItem("hrhub_live_bets_cache");
                      sessionStorage.removeItem("hrhub_live_bets_date");
                    } catch {}
                    const priorityTellers = onDutyTellers.slice(0, 40);
                    fetchLiveBets(priorityTellers, realtimeDate);
                  } else {
                    fetchHistoricalGrossForDate(realtimeDate);
                  }
                } else {
                  loadReport();
                }
              }}
              disabled={reportTab === "realtime" ? (realtimeDate === todayStr ? syncProgress.loading : historicalLoading) : loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
              title={realtimeDate === todayStr ? "Reset and sync latest live records" : "Re-fetch official gross for selected date"}
            >
              <RotateCw
                size={14}
                className={(reportTab === "realtime" ? (realtimeDate === todayStr ? syncProgress.loading : historicalLoading) : loading) ? "animate-spin" : ""}
              />
            </button>

            {/* Global Export CSV (Icon Button) */}
            <button
              type="button"
              onClick={() => {
                if (reportTab === "realtime") {
                  if (realtimeViewMode === "entries") {
                    exportLiveEntriesCsv();
                  } else {
                    exportRealtimeCsv();
                  }
                } else {
                  exportReport();
                }
              }}
              disabled={
                reportTab === "realtime"
                  ? (realtimeViewMode === "entries" ? filteredLiveEntries.length === 0 : filteredRealtimeAgents.length === 0)
                  : !activeRecords.length
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
              title="Export to CSV spreadsheet"
            >
              <ArrowDownToLine size={14} />
            </button>

            {/* Print & Word for historical reports */}
            {reportTab !== "realtime" && (
              <>
                <button
                  type="button"
                  onClick={printComparison}
                  disabled={!activeRecords.length}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-40"
                  title="Print or Save as PDF"
                >
                  <Printer size={14} />
                </button>
                <button
                  type="button"
                  onClick={openPreview}
                  disabled={!activeRecords.length}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-40"
                  title="Preview Word Report"
                >
                  <FileText size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-2">
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-200/60 p-1">
          {[
            {
              id: "entries",
              label: "Live Stream",
              icon: Radio,
              onClick: () => {
                setReportTab("realtime");
                setRealtimeViewMode("entries");
              },
              isActive: reportTab === "realtime" && realtimeViewMode === "entries",
            },
            {
              id: "collector",
              label: "Field Agents",
              icon: BadgeCheck,
              onClick: () => {
                setReportTab("realtime");
                setRealtimeViewMode("collector");
              },
              isActive: reportTab === "realtime" && realtimeViewMode === "collector",
            },
            {
              id: "detail",
              label: "Supervisors",
              icon: SlidersHorizontal,
              onClick: () => setReportTab("detail"),
              isActive: reportTab === "detail",
            },
            {
              id: "comparison",
              label: "Weekly Comparison",
              icon: TrendingUp,
              onClick: () => setReportTab("comparison"),
              isActive: reportTab === "comparison",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={tab.onClick}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  tab.isActive
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon size={14} className={tab.isActive ? "text-emerald-600" : "text-slate-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live streaming indicator & Cooldown Pill */}
        <div className="flex items-center gap-2 text-xs">
          {realtimeDate !== todayStr && reportTab === "realtime" ? (
            historicalLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-900 shadow-xs">
                <RotateCw size={11} className="animate-spin text-emerald-600" />
                <span>FETCHING RECONCILED GROSS...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-900 shadow-xs">
                <BadgeCheck size={12} className="text-emerald-600" />
                <span>OFFICIAL LEDGER (FINALIZED)</span>
              </span>
            )
          ) : cooldownSeconds > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-900 shadow-xs animate-pulse">
              <Timer size={12} className="text-amber-600 animate-spin" />
              <span>COOLDOWN:</span>
              <span className="font-mono font-black text-amber-950 bg-amber-200/90 px-1.5 py-0.2 rounded">
                {cooldownSeconds}s
              </span>
            </span>
          ) : syncProgress.loading ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-900 shadow-xs">
              <RotateCw size={11} className="animate-spin text-emerald-600" />
              <span>SYNCING ({syncProgress.current}/{syncProgress.total})</span>
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                autoRefresh
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              <span>{autoRefresh ? "LIVE" : "PAUSED"}</span>
              {autoRefresh && (
                <span className="font-mono text-[9px] font-black text-emerald-700 bg-emerald-100/90 px-1 py-0.2 rounded">
                  {nextPollCountdown}s
                </span>
              )}
            </span>
          )}

          {lastRefreshed && (
            <span className="hidden text-[10px] font-medium text-slate-400 sm:inline">
              {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* Live Server Cooldown Countdown Notification Banner */}
      {reportTab === "realtime" && cooldownSeconds > 0 && (
        <div className="border-b border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-5 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <Timer size={18} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-amber-950 text-xs">
                    Upstream STL Server Cooldown Active
                  </span>
                  <span className="rounded-full bg-amber-200/90 border border-amber-300/80 px-2 py-0.2 font-mono text-[10px] font-black text-amber-900">
                    {cooldownReason || "HTTP 429 Protection"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Nasa cooldown period pa ang upstream server upang manatiling ligtas ang koneksyon. Awtomatikong papasok ang live gross sa loob ng countdown timer.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 bg-white/95 border border-amber-300 rounded-xl px-3 py-1.5 shadow-xs">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">
                Papasok ang gross sa:
              </span>
              <span className="font-mono text-base font-black text-amber-950">
                {cooldownSeconds}s
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Slim progress bar during sync */}
      {syncProgress.loading && (
        <div className="border-b border-emerald-200 bg-emerald-50/90 px-5 py-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950 mb-1">
            <span className="flex items-center gap-1.5">
              <RefreshCw size={12} className="animate-spin text-emerald-600" />
              Streaming live ticket ledger entries from STL API ({syncProgress.current} / {syncProgress.total})...
            </span>
            <span className="font-mono text-emerald-800">
              {Math.round((syncProgress.current / (syncProgress.total || 1)) * 100)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/60">
            <div
              className="h-full bg-emerald-600 transition-all duration-200 rounded-full"
              style={{ width: `${(syncProgress.current / (syncProgress.total || 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="m-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Unable to load gross report</p>
            <p className="mt-0.5">{error}. Check the API URL, token, and CORS settings.</p>
          </div>
        </div>
      )}

      {loaded && !error && (
        <>
          {reportTab !== "realtime" && (
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Total gross</p>
                <p className="mt-1 text-xl font-black text-slate-900">{currency.format(summary.total)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Agents</p>
                <p className="mt-1 text-xl font-black text-slate-900">{summary.agents}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Top agent</p>
                <p className="mt-1 truncate text-sm font-black text-slate-900">{summary.topAgent?.agent || "No data"}</p>
                <p className="text-xs text-emerald-700">{summary.topAgent ? currency.format(summary.topAgent.total) : "-"}</p>
              </div>
            </div>
          )}

          {/* REALTIME TAB CONTENT */}
          {reportTab === "realtime" && (
            <div className="p-4 space-y-4">
              {/* VIEW 1: LIVE TRANSACTION STREAM */}
              {realtimeViewMode === "entries" && (
                <div className="space-y-4">
                  {/* Entries KPI Metrics */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Transactions</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <Hash size={16} />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900">{allLiveEntries.length}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Validated live ticket entries recorded</p>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Gross Sales Volume</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                          <CircleDollarSign size={16} />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-black text-emerald-950">
                        {currency.format(allLiveEntries.reduce((s, e) => s + e.amount, 0))}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                        Average per ticket: <strong>{allLiveEntries.length > 0 ? currency.format(Math.round(allLiveEntries.reduce((s, e) => s + e.amount, 0) / allLiveEntries.length)) : "₱0"}</strong>
                      </p>
                    </div>

                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Active Draw Schedules</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                          <Clock3 size={16} />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-black text-indigo-950">{gameStats.length}</p>
                      <p className="mt-1 text-[11px] text-indigo-700 font-medium truncate">
                        {gameStats.length > 0 ? gameStats.map((g) => g.label).join(", ") : "No active draw"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Transacting Agents</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
                          <Users size={16} />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-black text-amber-950">
                        {new Set(allLiveEntries.map((e) => e.tellerId)).size}
                      </p>
                      <p className="mt-1 text-[11px] text-amber-700">
                        Out of {realtimeMetrics.totalOnDuty} on-duty agents
                      </p>
                    </div>
                  </div>

                  {/* Consolidated Filter & Search Bar */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3">
                    {/* Top Row: Draw Schedule Ribbon & Filtered Gross Summary */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
                          <Layers size={13} className="text-emerald-600" />
                          Draw Schedule:
                        </span>
                        <button
                          type="button"
                          onClick={() => { setSelectedGameFilter("all"); setEntriesPage(1); }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                            selectedGameFilter === "all"
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          All Draws
                        </button>

                        {gameStats.map((game) => {
                          const isSelected = selectedGameFilter === game.raw;
                          return (
                            <button
                              key={game.raw}
                              type="button"
                              onClick={() => { setSelectedGameFilter(game.raw); setEntriesPage(1); }}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                isSelected
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900"
                              }`}
                            >
                              {game.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="text-xs font-semibold text-slate-500 shrink-0">
                        Filtered Gross: <strong className="text-emerald-700">{currency.format(filteredLiveEntries.reduce((s, e) => s + e.amount, 0))}</strong>
                      </div>
                    </div>

                    {/* Bottom Row: Supervisor Dropdown & Instant Search */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-1 items-center gap-2 max-w-2xl">
                        <SupervisorPicker
                          value={realtimeSupervisor}
                          onChange={(name) => { setRealtimeSupervisor(name); setEntriesPage(1); }}
                          summaries={supervisorSummaries}
                          metrics={realtimeMetrics}
                          showFigures={false}
                        />

                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={entriesSearch}
                            onChange={(e) => { setEntriesSearch(e.target.value); setEntriesPage(1); }}
                            placeholder="Search Transaction Ref ID (e.g. 092226-...), agent name, outlet, supervisor..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs outline-none focus:border-emerald-500"
                          />
                          {entriesSearch && (
                            <button
                              type="button"
                              onClick={() => { setEntriesSearch(""); setEntriesPage(1); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Entries Table */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500">
                      <span className="font-semibold flex items-center gap-1.5 text-slate-700">
                        <Clock3 size={13} className="text-emerald-600" />
                        Chronological Arrival Ledger
                      </span>
                      {selectedGameFilter !== "all" && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                          Schedule: {formatGameLabel(selectedGameFilter)}
                        </span>
                      )}
                    </div>

                    <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
                      <table className="min-w-[1000px] w-full border-collapse text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5 text-center w-12">#</th>
                            <th className="px-3 py-2.5 w-36">Timestamp</th>
                            <th className="px-3 py-2.5 w-36">Draw Schedule</th>
                            <th className="px-3 py-2.5 w-40">Transaction Ref ID</th>
                            <th className="px-3 py-2.5">Field Agent</th>
                            <th className="px-3 py-2.5">Supervisor</th>
                            <th className="px-3 py-2.5">Outlet & Address</th>
                            <th className="px-3 py-2.5 text-right w-28">Wager Amount</th>
                            <th className="px-3 py-2.5 text-center w-20">Status</th>
                            <th className="px-3 py-2.5 text-center w-28">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedEntries.length === 0 ? (
                            syncProgress.loading ? (
                              <>
                                {[1, 2, 3, 4, 5, 6].map((idx) => (
                                  <tr key={`skel-${idx}`} className="animate-pulse">
                                    <td className="px-3 py-3 text-center"><div className="h-3 w-4 bg-slate-200 rounded mx-auto" /></td>
                                    <td className="px-3 py-3"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                                    <td className="px-3 py-3"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                                    <td className="px-3 py-3"><div className="h-4 w-28 bg-slate-200 rounded" /></td>
                                    <td className="px-3 py-3"><div className="h-3 w-36 bg-slate-200 rounded mb-1" /><div className="h-2.5 w-20 bg-slate-100 rounded" /></td>
                                    <td className="px-3 py-3"><div className="h-3 w-24 bg-slate-200 rounded" /></td>
                                    <td className="px-3 py-3"><div className="h-3 w-28 bg-slate-200 rounded" /></td>
                                    <td className="px-3 py-3 text-right"><div className="h-4 w-16 bg-slate-200 rounded ml-auto" /></td>
                                    <td className="px-3 py-3 text-center"><div className="h-4 w-12 bg-emerald-100 rounded mx-auto" /></td>
                                    <td className="px-3 py-3 text-center"><div className="h-5 w-16 bg-slate-200 rounded mx-auto" /></td>
                                  </tr>
                                ))}
                                <tr>
                                  <td colSpan={10} className="p-3 text-center text-xs font-semibold text-emerald-800 bg-emerald-50/50">
                                    <span className="inline-flex items-center gap-2">
                                      <RefreshCw size={13} className="animate-spin text-emerald-600" />
                                      Streaming real-time ledger entries from STL API ({syncProgress.current} / {syncProgress.total})...
                                    </span>
                                  </td>
                                </tr>
                              </>
                            ) : (
                              <tr>
                                <td colSpan={10} className="p-8 text-center text-xs text-slate-500">
                                  {realtimeDate !== todayStr ? (
                                    <div className="max-w-md mx-auto py-2">
                                      <BadgeCheck size={28} className="mx-auto text-emerald-600 mb-2" />
                                      <p className="font-bold text-slate-800 text-sm">Official Finalized Ledger for {displayDate(realtimeDate)}</p>
                                      <p className="mt-1 text-slate-500 text-xs leading-relaxed">
                                        Ang opisyal na gross ng lahat ng field agents para sa petsang ito ay 100% kumpleto at naka-record sa Field Agents Ledger mula sa Accountant API.
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => setRealtimeViewMode("collector")}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition"
                                      >
                                        <Users size={14} />
                                        Tingnan ang Field Agents Ledger ({realtimeMetrics.totalOnDuty} Agents)
                                      </button>
                                    </div>
                                  ) : allLiveEntries.length === 0 ? (
                                    `No live transactions recorded for ${displayDate(realtimeDate)}. Incoming tickets will appear here dynamically as field agents submit wagers.`
                                  ) : (
                                    "No transaction records matched the selected draw schedule or search filters."
                                  )}
                                </td>
                              </tr>
                            )
                          ) : (
                            paginatedEntries.map((entry, index) => {
                              const globalIdx = (entriesPage - 1) * entriesPageSize + index + 1;
                              return (
                                <tr key={entry.transactionId ? `${entry.transactionId}-${index}` : `tx-${index}`} className="transition hover:bg-slate-50/80">
                                  <td className="px-3 py-2.5 text-center font-bold text-slate-400 text-[11px]">
                                    {globalIdx}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-1.5">
                                      <Clock size={12} className="text-emerald-600 shrink-0" />
                                      <div>
                                        <p className="font-black text-slate-900 text-xs">
                                          {entry.created_at ? entry.created_at.split(" ")[1] : "-"}
                                        </p>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          {entry.created_at ? entry.created_at.split(" ")[0] : ""}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-800">
                                      <Clock size={10} className="text-emerald-600" />
                                      {entry.gameLabel}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <button
                                      type="button"
                                      onClick={() => viewTicketCombinations(entry)}
                                      className="font-mono text-xs font-black text-slate-800 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 px-2 py-0.5 rounded transition text-left"
                                      title="Click to inspect ticket combination breakdown"
                                    >
                                      {entry.transactionId || "-"}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-extrabold text-emerald-400">
                                        {entry.agentName.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-extrabold text-slate-900 truncate max-w-44">{entry.agentName}</p>
                                        <span className="font-mono text-[10px] text-slate-400">@{entry.username}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 truncate max-w-36 block">
                                      {entry.supervisor}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <p className="font-semibold text-slate-800 truncate max-w-44">{entry.outlet}</p>
                                    <p className="text-[10px] text-slate-400 truncate max-w-44">{entry.address}</p>
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <span className="text-sm font-black text-emerald-700">
                                      {currency.format(entry.amount)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {entry.isVoidBool ? (
                                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase text-rose-700">
                                        Void
                                      </span>
                                    ) : (
                                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800">
                                        Active
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => viewTicketCombinations(entry)}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition shadow-xs"
                                      title="Inspect ticket combination breakdown"
                                    >
                                      <Receipt size={13} className="text-emerald-700" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    {totalEntriesPages > 1 && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs">
                        <span className="text-slate-500 font-medium">
                          Page <strong className="text-slate-800">{entriesPage}</strong> of{" "}
                          <strong className="text-slate-800">{totalEntriesPages}</strong>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEntriesPage((p) => Math.max(1, p - 1))}
                            disabled={entriesPage === 1}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition disabled:opacity-30"
                            title="Previous page"
                          >
                            <ChevronLeft size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setEntriesPage((p) => Math.min(totalEntriesPages, p + 1))}
                            disabled={entriesPage >= totalEntriesPages}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition disabled:opacity-30"
                            title="Next page"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 2: COLLECTOR SUMMARY VIEW */}
              {realtimeViewMode === "collector" && (
                <>
                  {/* 4 KPI Metrics: On-Duty, Active Submissions, Pending, Average */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* 1. On Duty Agents */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">On-Duty Field Agents</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                          <Users size={16} />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900">{realtimeMetrics.totalOnDuty}</p>
                      <p className="mt-1 text-[11px] text-slate-500">Active deployed agent accounts</p>
                    </div>

                    {/* 2. On Duty With Gross */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Active Submissions</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
                          <CheckCircle2 size={16} />
                        </div>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-2xl font-black text-emerald-950">{realtimeMetrics.withGrossCount}</p>
                        <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900">
                          {realtimeMetrics.percentageWithGross}% compliance
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                        Consolidated sales: <strong>{currency.format(realtimeMetrics.totalGross)}</strong>
                      </p>
                    </div>

                    {/* 3. On Duty Without Gross */}
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Pending Submissions</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm">
                          <AlertTriangle size={16} />
                        </div>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <p className="text-2xl font-black text-rose-950">{realtimeMetrics.withoutGrossCount}</p>
                        <span className="rounded-full bg-rose-200/70 px-2 py-0.5 text-[10px] font-extrabold text-rose-900">
                          {realtimeMetrics.percentageWithoutGross}% pending
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-rose-700">
                        Requires supervisor follow-up & reconciliation
                      </p>
                    </div>

                    {/* 4. Total Gross & Average */}
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Average Gross Volume</p>
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-sm">
                          <CircleDollarSign size={16} />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900">{currency.format(realtimeMetrics.averageGross)}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Consolidated Payout Hits: <strong className="text-slate-700">{currency.format(realtimeMetrics.totalHits)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Informative notice when 0 entries on selected date */}
                  {realtimeMetrics.dateGrossCount === 0 && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                      <div className="flex-1">
                        <p className="font-bold text-sm text-amber-900">
                          No Gross Transactions Posted Yet for {displayDate(realtimeDate)}
                        </p>
                        <p className="mt-1 text-amber-800 leading-relaxed">
                          {realtimeDate === todayStr
                            ? "Scheduled draw reconciliations may still be in progress for today (official draw schedules typically settle after 10:30 AM, 02:00 PM, and 09:00 PM). You can review the finalized ledger from yesterday below."
                            : "No gross sales records were returned by the API for the selected date. Try selecting a different date or refreshing the report."}
                        </p>
                        {realtimeDate === todayStr ? (
                          <button
                            type="button"
                            onClick={() => setRealtimeDate(yesterdayStr)}
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
                          >
                            Review Yesterday's Ledger ({yesterdayStr})
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fetchHistoricalGrossForDate(realtimeDate)}
                            disabled={historicalLoading}
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                          >
                            <RotateCw size={13} className={historicalLoading ? "animate-spin" : ""} />
                            Sync Official Gross ({realtimeDate})
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Consolidated Compliance Status & Supervisor Filter Toolbar */}
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    {/* Status Filter Segmented Pills with Minimal Figures */}
                    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setRealtimeFilter("all")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          realtimeFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        <span>All</span>
                        <span className={`rounded-md px-1.5 py-0.2 font-mono text-[10px] font-black ${
                          realtimeFilter === "all" ? "bg-slate-200/80 text-slate-900" : "bg-slate-200 text-slate-600"
                        }`}>
                          {realtimeMetrics.totalOnDuty}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRealtimeFilter("with_gross")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          realtimeFilter === "with_gross"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-emerald-700 hover:text-emerald-800"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${realtimeFilter === "with_gross" ? "bg-white animate-pulse" : "bg-emerald-500"}`} />
                        <span>Active</span>
                        <span className={`rounded-md px-1.5 py-0.2 font-mono text-[10px] font-black ${
                          realtimeFilter === "with_gross" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {realtimeMetrics.withGrossCount}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRealtimeFilter("without_gross")}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                          realtimeFilter === "without_gross"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "text-rose-700 hover:text-rose-800"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${realtimeFilter === "without_gross" ? "bg-white" : "bg-rose-500"}`} />
                        <span>Inactive</span>
                        <span className={`rounded-md px-1.5 py-0.2 font-mono text-[10px] font-black ${
                          realtimeFilter === "without_gross" ? "bg-white/20 text-white" : "bg-rose-100 text-rose-800"
                        }`}>
                          {realtimeMetrics.withoutGrossCount}
                        </span>
                      </button>
                    </div>

                    {/* Supervisor Picker with clean figures only */}
                    <div className="flex flex-1 items-center gap-2 max-w-xl">
                      <SupervisorPicker
                        value={realtimeSupervisor}
                        onChange={(name) => setRealtimeSupervisor(name)}
                        summaries={supervisorSummaries}
                        metrics={realtimeMetrics}
                      />

                      <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={realtimeSearch}
                          onChange={(e) => setRealtimeSearch(e.target.value)}
                          placeholder="Search agent name, username, outlet, supervisor..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-emerald-500"
                        />
                        {realtimeSearch && (
                          <button
                            type="button"
                            onClick={() => setRealtimeSearch("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Realtime Agent Table */}
                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        <Users size={13} className="text-emerald-600" />
                        Field Agent Compliance Ledger
                      </span>

                      <span className="text-[11px] font-semibold text-slate-500">
                        Showing <strong className="text-slate-800">{filteredRealtimeAgents.length}</strong> of {realtimeMetrics.totalOnDuty} agents
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                      <table className="min-w-[950px] w-full border-collapse text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2.5 text-center w-12">#</th>
                            <th className="px-3 py-2.5 w-36">Compliance Status</th>
                            <th className="px-3 py-2.5">Field Agent Details</th>
                            <th className="px-3 py-2.5">Supervisor</th>
                            <th className="px-3 py-2.5">Outlet & Address</th>
                            <th className="px-3 py-2.5">Draws Logged</th>
                            <th className="px-3 py-2.5 text-center w-32">Live Tickets</th>
                            <th className="px-3 py-2.5 text-right w-28">Consolidated Gross</th>
                            <th className="px-3 py-2.5 text-right w-20">Payout Hits</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredRealtimeAgents.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-xs text-slate-500">
                                No field agent records match the current filter or search criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredRealtimeAgents.map((agent, index) => (
                              <tr
                                key={agent.id ? `${agent.id}-${index}` : `ag-${index}`}
                                className={`transition hover:bg-slate-50/80 ${
                                  !agent.hasGross ? "bg-rose-50/20" : ""
                                }`}
                              >
                                <td className="px-3 py-2.5 text-center font-bold text-slate-400 text-[11px]">
                                  {index + 1}
                                </td>
                                <td className="px-3 py-2.5">
                                  {agent.hasGross ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                      <BadgeCheck size={12} className="text-emerald-600" /> Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-extrabold text-rose-800">
                                      <AlertTriangle size={12} className="text-rose-600" /> Inactive
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-extrabold text-emerald-400">
                                      {agent.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-extrabold text-slate-900 truncate max-w-48">{agent.name}</p>
                                      <span className="font-mono text-[10px] text-slate-400">@{agent.username}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-3 py-2.5">
                                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                    {agent.supervisor}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5">
                                  <p className="font-semibold text-slate-800 truncate max-w-48">{agent.outlet}</p>
                                  <p className="text-[10px] text-slate-400 truncate max-w-48">{agent.address}</p>
                                </td>
                                <td className="px-3 py-2.5">
                                  {agent.draws.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {agent.draws.map((d, dIdx) => (
                                        <span
                                          key={dIdx}
                                          className="inline-flex items-center gap-1 rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700"
                                          title={`Gross: ${currency.format(d.gross)} · Hits: ${currency.format(d.hits)}`}
                                        >
                                          <span className="text-emerald-700 font-extrabold">{d.time}</span>
                                          <span>{currency.format(d.gross)}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-rose-500 italic">
                                      No draws logged
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {agent.betsCount > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAgentDetails(agent)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300 transition shadow-2xs"
                                      title={`Inspect ${agent.betsCount} transaction tickets`}
                                    >
                                      <Receipt size={11} className="text-emerald-600" />
                                      <span>{agent.betsCount}</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => refreshSingleAgentBets(agent)}
                                      disabled={refreshingAgentId === agent.id}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition disabled:opacity-40"
                                      title="Check for submitted transactions"
                                    >
                                      <RotateCw size={11} className={refreshingAgentId === agent.id ? "animate-spin text-emerald-600" : ""} />
                                    </button>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right">
                                  {agent.hasGross ? (
                                    <span className="text-sm font-black text-emerald-700">
                                      {currency.format(agent.gross)}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-slate-300">₱0</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600">
                                  {agent.hits > 0 ? (
                                    <span className="font-bold text-indigo-700">{currency.format(agent.hits)}</span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {reportTab === "detail" && <div className="mx-4 mb-5 overflow-x-auto rounded-2xl border border-emerald-100 bg-emerald-50/40"><div className="border-b border-emerald-100 bg-white px-4 py-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Supervisor summary</p><h4 className="mt-1 text-sm font-extrabold text-slate-900">Sales per day by supervisor</h4></div><table className="min-w-[900px] w-full border-collapse text-[10px]"><thead><tr className="text-left font-extrabold text-slate-700"><th className="border border-emerald-100 px-3 py-2">Supervisor</th>{dateColumns.map((date) => <th key={date} className="border border-emerald-100 px-3 py-2 text-right">{displayDate(date)}</th>)}<th className="border border-emerald-100 border-l-2 border-l-emerald-600 bg-emerald-100/70 px-3 py-2 text-right font-black text-emerald-950">Range total</th></tr></thead><tbody>{Object.entries(supervisorTotals).map(([supervisor, totals]) => <tr key={supervisor} className="bg-white"><td className="border border-emerald-100 px-3 py-2 font-bold text-slate-800">{supervisor}</td>{dateColumns.map((date) => <td key={date} className="border border-emerald-100 px-3 py-2 text-right text-slate-600">{currency.format(totals.daily[date] || 0)}</td>)}<td className="border border-emerald-100 border-l-2 border-l-emerald-600/50 bg-emerald-50/50 px-3 py-2 text-right font-black text-emerald-800 text-[11px]">{currency.format(totals.total)}</td></tr>)}</tbody></table></div>}

          {reportTab === "comparison" && <div className="mx-4 mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Selected range vs 7 days earlier</p><h4 className="mt-1 text-sm font-extrabold text-slate-900">Agent gross comparison</h4><p className="mt-1 text-[10px] text-slate-500">Selected: <strong className="text-emerald-700">{comparisonPeriods.current}</strong><span className="mx-2 text-slate-300">vs</span>7 days earlier: <strong className="text-slate-700">{comparisonPeriods.previous}</strong></p></div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-slate-300" />7 days earlier</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Selected range</span></div>
            </div>
            <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_240px]">
              <div className="space-y-3">{comparisonRows.slice(0, 10).map((row) => <div key={row.id} className="grid grid-cols-[minmax(110px,150px)_1fr_70px] items-center gap-3"><div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-800">{row.agent}</p><p className="truncate text-[9px] text-slate-400">{row.supervisor}</p></div><div className="space-y-1.5"><div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-slate-300" style={{ width: `${(row.previous / comparisonMax) * 100}%` }} /></div><div className="h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(row.current / comparisonMax) * 100}%` }} /></div></div><div className={`text-right text-[10px] font-extrabold ${row.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{row.change >= 0 ? "+" : ""}{row.changePercent.toFixed(0)}%</div></div>)}</div>
              <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Period total</p><p className="mt-2 text-lg font-black text-slate-900">{currency.format(comparisonTotal.current)}</p><p className={`mt-1 text-xs font-bold ${comparisonTotal.current >= comparisonTotal.previous ? "text-emerald-600" : "text-rose-600"}`}>{comparisonTotal.current >= comparisonTotal.previous ? "▲" : "▼"} {comparisonTotal.previous ? `${Math.abs(((comparisonTotal.current - comparisonTotal.previous) / comparisonTotal.previous) * 100).toFixed(1)}%` : "New period"} vs 7 days earlier</p><div className="mt-4 space-y-2 text-[10px] text-slate-500"><div className="flex justify-between"><span>Previous</span><strong className="text-slate-700">{currency.format(comparisonTotal.previous)}</strong></div><div className="flex justify-between"><span>Current</span><strong className="text-emerald-700">{currency.format(comparisonTotal.current)}</strong></div></div></div>
            </div>
          </div>}

          {reportTab === "comparison" && <div className="mx-4 mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">Daily view • all agents</p><h4 className="mt-1 text-sm font-extrabold text-slate-900">Gross per day comparison</h4><p className="mt-1 text-[10px] text-slate-500">{comparisonPeriods.current} compared with {comparisonPeriods.previous}</p></div><span className="text-[10px] font-semibold text-slate-500">{activeRecords.length} agents included</span></div>
            <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-7">{dailyComparison.map((day) => <div key={day.date} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-extrabold text-slate-700">{day.date.slice(5)}</span><span className={`text-[9px] font-bold ${day.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{day.change >= 0 ? "+" : ""}{currency.format(day.change)}</span></div><div className="flex h-28 items-end justify-center gap-2"><div className="w-5 rounded-t-md bg-slate-300" style={{ height: `${Math.max((day.previous / dailyMax) * 100, 4)}px` }} title={`Previous: ${currency.format(day.previous)}`} /><div className="w-5 rounded-t-md bg-emerald-500" style={{ height: `${Math.max((day.current / dailyMax) * 100, 4)}px` }} title={`Current: ${currency.format(day.current)}`} /></div><div className="mt-2 space-y-1 text-[9px]"><div className="flex justify-between gap-2 text-slate-500"><span>Prev</span><strong>{currency.format(day.previous)}</strong></div><div className="flex justify-between gap-2 text-emerald-700"><span>Now</span><strong>{currency.format(day.current)}</strong></div></div></div>)}</div>
            <div className="overflow-x-auto border-t border-slate-100"><table className="min-w-[900px] w-full border-collapse text-[10px]"><thead><tr className="bg-slate-50 text-left font-extrabold text-slate-600"><th className="border-b border-slate-200 px-3 py-2">Agent</th><th className="border-b border-slate-200 px-3 py-2">Supervisor</th>{dateColumns.map((date) => <th key={date} className="border-b border-slate-200 px-3 py-2 text-right">{date.slice(5)}</th>)}<th className="border-b border-slate-200 border-l-2 border-l-emerald-600 bg-emerald-50 px-3 py-2 text-right font-black text-emerald-950">Current total</th><th className="border-b border-slate-200 px-3 py-2 text-right">Change</th></tr></thead><tbody>{comparisonRows.map((row) => <tr key={row.id} className="hover:bg-emerald-50/50"><td className="border-b border-slate-100 px-3 py-2 font-bold text-slate-800">{row.agent}</td><td className="border-b border-slate-100 px-3 py-2 text-slate-500">{row.supervisor}</td>{dateColumns.map((date) => <td key={date} className="border-b border-slate-100 px-3 py-2 text-right text-slate-600">{currency.format(row.daily[date] || 0)}</td>)}<td className="border-b border-slate-100 border-l-2 border-l-emerald-600/40 bg-emerald-50/30 px-3 py-2 text-right font-black text-emerald-800 text-[11px]">{currency.format(row.current)}</td><td className={`border-b border-slate-100 px-3 py-2 text-right font-bold ${row.change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{row.change >= 0 ? "+" : ""}{currency.format(row.change)}</td></tr>)}</tbody></table></div>
          </div>}

          {reportTab === "detail" && (activeRecords.length > 0 ? <div className="overflow-x-auto px-4 pb-5"><table className="min-w-[980px] w-full border-collapse text-[10px]"><thead><tr className="bg-slate-100 text-left font-extrabold text-slate-700"><th className="border border-slate-300 px-2 py-2">Supervisor</th><th className="border border-slate-300 px-2 py-2">Agent</th><th className="border border-slate-300 px-2 py-2">Address</th><th className="border border-slate-300 px-2 py-2">IsActive</th>{dateColumns.map((date) => <th key={date} className="border border-slate-300 px-2 py-2 text-right">{date.slice(5)}</th>)}<th className="border border-slate-300 border-l-2 border-l-emerald-600 bg-emerald-50 px-2 py-2 text-right font-black text-emerald-950">Total</th></tr></thead><tbody>{Object.entries(groupedRecords).map(([groupName, groupRows]) => <Fragment key={groupName}><tr className="bg-slate-800 text-white"><td colSpan={4 + dateColumns.length + 1} className="px-2 py-2 font-extrabold"><span className="mr-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300">SUPERVISOR</span>{groupName}<span className="ml-3 font-normal text-slate-300">{groupRows.length} agent{groupRows.length === 1 ? "" : "s"}</span></td></tr>{groupRows.map((record) => <tr key={record.id} className="hover:bg-emerald-50/50"><td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-600">{record.supervisor}</td><td className="border border-slate-200 px-2 py-1.5 font-bold text-slate-800">{record.agent}</td><td className="max-w-48 border border-slate-200 px-2 py-1.5 text-slate-500">{record.address}</td><td className="border border-slate-200 px-2 py-1.5 text-center text-emerald-700">{String(record.active).toLowerCase() === "true" || String(record.active).toLowerCase() === "active" ? "Active" : record.active}</td>{dateColumns.map((date) => <td key={date} className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{record.daily[date] || 0}</td>)}<td className="border border-slate-200 border-l-2 border-l-emerald-600/40 bg-emerald-50/40 px-2 py-1.5 text-right font-black text-emerald-800">{record.total}</td></tr>)}</Fragment>)}</tbody></table></div> : <p className="p-5 text-center text-xs text-slate-500">No gross records were returned for this date range.</p>)}
        </>
      )}

      {previewOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Daily gross report preview">
        <div className="flex max-h-[95vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-[#0d1b2a] px-5 py-4 text-white">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">Landscape preview</p>
              <h3 className="mt-1 text-base font-extrabold">Daily sales report per supervisor</h3>
              <p className="mt-1 text-[11px] text-slate-300">{comparisonPeriods.current} vs {comparisonPeriods.previous}</p>
            </div>
            <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Close report preview" className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </div>
          <div className="overflow-auto p-4">
            <div className="min-w-[1120px] space-y-6">
              {Object.entries(groupedRecords).map(([supervisor, rows], groupIndex, arr) => {
                const totalPages = arr.length + 2;

                return (
                  <div key={supervisor} className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                              Supervisor #{groupIndex + 1}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {rows.length} {rows.length === 1 ? "Agent" : "Agents"}
                            </span>
                          </div>
                          <h2 className="mt-1 text-xl font-black text-slate-900">
                            {supervisor}
                          </h2>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            DAILY GROSS COMPARISON • {dateColumns.length} daily sales columns
                          </p>
                        </div>
                        <div className="text-right text-[11px] text-slate-500">
                          <p>7 days earlier: <strong>{comparisonPeriods.previous}</strong></p>
                          <p>Selected range: <strong className="text-emerald-700">{comparisonPeriods.current}</strong></p>
                          <p className="mt-1 text-[10px] font-bold text-slate-400">Page {groupIndex + 1} of {totalPages} (Ready to Print)</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[10px]">
                          <thead>
                            <tr className="bg-slate-50 text-left font-bold text-slate-900 border-b-2 border-slate-400">
                              <th className="border border-slate-200 px-3 py-2.5 w-48 text-slate-800">Agent</th>
                              {dateColumns.map((date, index) => (
                                <th key={date} className="border border-slate-200 px-2.5 py-2 text-right">
                                  <span className="font-semibold text-slate-500 text-[9px] block">Prev: {displayDate(previousDateColumns[index])}</span>
                                  <span className="text-slate-900 font-extrabold text-[10px] block">{displayDate(date)}</span>
                                </th>
                              ))}
                              <th className="border-t border-r border-b border-slate-200 border-l-2 border-l-emerald-600 px-3 py-2 text-right bg-emerald-50 w-32">
                                <span className="font-bold text-emerald-800/80 text-[9px] block">Prev Total</span>
                                <span className="text-emerald-950 font-black text-[10px] uppercase tracking-wider block">Current Total</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((record) => {
                              const recCurrentTotal = dateColumns.reduce((sum, d) => sum + (record.daily[d] || 0), 0);
                              const recPreviousTotal = previousDateColumns.reduce((sum, d) => sum + (record.daily[d] || 0), 0);
                              const recDiff = recCurrentTotal - recPreviousTotal;

                              return (
                                <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="border border-slate-200 px-3 py-2 font-bold text-slate-800">{record.agent}</td>
                                  {dateColumns.map((date, index) => {
                                    const prevVal = record.daily[previousDateColumns[index]] || 0;
                                    const curVal = record.daily[date] || 0;
                                    return (
                                      <td key={date} className="border border-slate-200 px-2.5 py-1.5 text-right text-slate-600">
                                        <span className="text-[9px] text-slate-400 block" title={`Previous ${displayDate(previousDateColumns[index])}`}>
                                          {currency.format(prevVal)}
                                        </span>
                                        <strong className="text-emerald-700 font-bold block" title={`Current ${displayDate(date)}`}>
                                          {currency.format(curVal)}
                                        </strong>
                                        {renderDiffTagJsx(curVal, prevVal)}
                                      </td>
                                    );
                                  })}
                                  <td className="border-t border-r border-b border-slate-200 border-l-2 border-l-emerald-600 px-3 py-2 text-right bg-emerald-50/40">
                                    <span className="text-[9px] text-slate-500 font-medium block">{currency.format(recPreviousTotal)}</span>
                                    <strong className="text-emerald-800 font-black text-[11.5px] block tracking-tight">{currency.format(recCurrentTotal)}</strong>
                                    {renderDiffTagJsx(recCurrentTotal, recPreviousTotal)}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-400">
                              <td className="border border-slate-300 px-3 py-2 text-[11px] font-black">
                                Total ({supervisor})
                              </td>
                              {dateColumns.map((date, index) => {
                                const dayCur = rows.reduce((sum, r) => sum + (r.daily[date] || 0), 0);
                                const dayPrev = rows.reduce((sum, r) => sum + (r.daily[previousDateColumns[index]] || 0), 0);
                                return (
                                  <td key={date} className="border border-slate-300 px-2.5 py-2 text-right">
                                    <span className="text-[9px] text-slate-500 block">{currency.format(dayPrev)}</span>
                                    <strong className="text-emerald-800 font-black block">{currency.format(dayCur)}</strong>
                                    {renderDiffTagJsx(dayCur, dayPrev, true)}
                                  </td>
                                );
                              })}
                              <td className="border-t-2 border-b-2 border-r border-slate-300 border-l-2 border-l-emerald-700 px-3 py-2 text-right bg-emerald-100/70">
                                <span className="text-[9px] text-slate-600 font-medium block">
                                  {currency.format(rows.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0))}
                                </span>
                                <strong className="text-emerald-950 font-black text-[12.5px] block tracking-tight">
                                  {currency.format(rows.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0))}
                                </strong>
                                {renderDiffTagJsx(
                                  rows.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0),
                                  rows.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0),
                                  true
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="my-6 flex items-center justify-center gap-3">
                      <div className="h-px flex-1 border-t-2 border-dashed border-slate-300" />
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 px-4 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 shadow-sm">
                        ✂ Page Break • Each supervisor prints on a separate page
                      </span>
                      <div className="h-px flex-1 border-t-2 border-dashed border-slate-300" />
                    </div>
                  </div>
                );
              })}

              {/* Final Page: Supervisor Totals & Grand Summary */}
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-white p-6 shadow-md">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                          Summary Sheet
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {Object.keys(groupedRecords).length} Supervisors • {records.length} Total Agents
                        </span>
                      </div>
                      <h2 className="mt-1 text-xl font-black text-slate-900">
                        SUPERVISOR TOTALS &amp; GRAND SUMMARY
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        Consolidated daily totals for all supervisors and organization grand total
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <p>7 days earlier: <strong>{comparisonPeriods.previous}</strong></p>
                      <p>Selected range: <strong className="text-emerald-700">{comparisonPeriods.current}</strong></p>
                      <p className="mt-1 text-[10px] font-bold text-emerald-700">Page {Object.keys(groupedRecords).length + 1} of {Object.keys(groupedRecords).length + 2} (Summary Table)</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 text-left font-bold text-slate-900 border-b-2 border-slate-400">
                          <th className="border border-slate-200 px-3 py-2.5 w-48 text-slate-800">Supervisor</th>
                          {dateColumns.map((date, index) => (
                            <th key={date} className="border border-slate-200 px-2.5 py-2 text-right">
                              <span className="font-semibold text-slate-500 text-[9px] block">Prev: {displayDate(previousDateColumns[index])}</span>
                              <span className="text-slate-900 font-extrabold text-[10px] block">{displayDate(date)}</span>
                            </th>
                          ))}
                          <th className="border-t border-r border-b border-slate-200 border-l-2 border-l-emerald-600 px-3 py-2 text-right bg-emerald-50 w-32">
                            <span className="font-bold text-emerald-800/80 text-[9px] block">Prev Total</span>
                            <span className="text-emerald-950 font-black text-[10px] uppercase tracking-wider block">Current Total</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(groupedRecords).map(([supervisor, rows]) => {
                          const supCurTotal = rows.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
                          const supPrevTotal = rows.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0);
                          const sDiff = supCurTotal - supPrevTotal;

                          return (
                            <tr key={supervisor} className="hover:bg-slate-50/80 transition-colors">
                              <td className="border border-slate-200 px-3 py-2.5 font-bold text-slate-800">
                                <span className="text-slate-900">{supervisor}</span>
                                <small className="block text-[9px] text-slate-400 font-normal">{rows.length} {rows.length === 1 ? "agent" : "agents"}</small>
                              </td>
                              {dateColumns.map((date, index) => {
                                const dayCur = rows.reduce((sum, r) => sum + (r.daily[date] || 0), 0);
                                const dayPrev = rows.reduce((sum, r) => sum + (r.daily[previousDateColumns[index]] || 0), 0);
                                return (
                                  <td key={date} className="border border-slate-200 px-2.5 py-2 text-right text-slate-600">
                                    <span className="text-[9px] text-slate-400 block">{currency.format(dayPrev)}</span>
                                    <strong className="text-emerald-700 font-bold block">{currency.format(dayCur)}</strong>
                                    {renderDiffTagJsx(dayCur, dayPrev)}
                                  </td>
                                );
                              })}
                              <td className="border-t border-r border-b border-slate-200 border-l-2 border-l-emerald-600 px-3 py-2 text-right bg-emerald-50/40">
                                <span className="text-[9px] text-slate-500 font-medium block">{currency.format(supPrevTotal)}</span>
                                <strong className="text-emerald-800 font-black text-[11.5px] block tracking-tight">{currency.format(supCurTotal)}</strong>
                                {renderDiffTagJsx(supCurTotal, supPrevTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-emerald-50/80 font-black text-slate-900 border-t-2 border-emerald-600">
                          <td className="border border-emerald-200 px-3 py-3 text-[11px] font-black text-emerald-950 uppercase tracking-wider">
                            Grand Total
                          </td>
                          {dateColumns.map((date, index) => {
                            const dayGrandCur = activeRecords.reduce((sum, r) => sum + (r.daily[date] || 0), 0);
                            const dayGrandPrev = activeRecords.reduce((sum, r) => sum + (r.daily[previousDateColumns[index]] || 0), 0);
                            return (
                              <td key={date} className="border border-emerald-200 px-2.5 py-3 text-right">
                                <span className="text-[9px] text-slate-600 block">{currency.format(dayGrandPrev)}</span>
                                <strong className="text-emerald-800 font-black text-[11px] block">{currency.format(dayGrandCur)}</strong>
                                {renderDiffTagJsx(dayGrandCur, dayGrandPrev, true)}
                              </td>
                            );
                          })}
                          <td className="border-t-2 border-b-2 border-r border-emerald-300 border-l-2 border-l-emerald-700 px-3 py-3 text-right bg-emerald-200/80">
                            <span className="text-[9px] text-slate-700 font-medium block">
                              {currency.format(activeRecords.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0))}
                            </span>
                            <strong className="text-emerald-950 font-black text-sm block tracking-tight">
                              {currency.format(activeRecords.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0))}
                            </strong>
                            {renderDiffTagJsx(
                              activeRecords.reduce((sum, r) => sum + dateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0),
                              activeRecords.reduce((sum, r) => sum + previousDateColumns.reduce((dSum, d) => dSum + (r.daily[d] || 0), 0), 0),
                              true
                            )}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Page Break Divider */}
              <div className="my-6 flex items-center justify-center gap-3">
                <div className="h-px flex-1 border-t-2 border-dashed border-slate-300" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-4 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 shadow-sm">
                  ✂ Page Break • Page {Object.keys(groupedRecords).length + 2} of {Object.keys(groupedRecords).length + 2}: Visual Analytics &amp; Charts (Final Page)
                </span>
                <div className="h-px flex-1 border-t-2 border-dashed border-slate-300" />
              </div>

              {/* Final Page: Visual Performance Charts & Analytics */}
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-white p-6 shadow-md">
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-emerald-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                          Performance Analytics
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {Object.keys(groupedRecords).length} Supervisors • {activeRecords.length} Total Agents
                        </span>
                      </div>
                      <h2 className="mt-1 text-xl font-black text-slate-900">
                        VISUAL PERFORMANCE CHARTS &amp; SUMMARY
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        Executive performance dashboard based on Supervisor Totals and Grand Summary
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <p>7 days earlier: <strong>{comparisonPeriods.previous}</strong></p>
                      <p>Selected range: <strong className="text-emerald-700">{comparisonPeriods.current}</strong></p>
                      <div className="mt-1 flex items-center justify-end gap-3 text-[10px]">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-sm bg-slate-400" /> 7 Days Earlier
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <span className="h-2 w-2 rounded-sm bg-emerald-600" /> Selected Range
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] font-bold text-emerald-700">
                        Page {Object.keys(groupedRecords).length + 2} of {Object.keys(groupedRecords).length + 2} (Final Page • Visual Charts)
                      </p>
                    </div>
                  </div>

                  {/* 5 KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-sm">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Selected Range Total</span>
                      <div className="mt-1 text-base font-black text-emerald-700">{currency.format(analyticsData.grandCurrentTotal)}</div>
                      <div className="text-[10px] text-slate-500">Gross for selected dates</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-sm">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Comparison Total</span>
                      <div className="mt-1 text-base font-black text-slate-700">{currency.format(analyticsData.grandPreviousTotal)}</div>
                      <div className="text-[10px] text-slate-500">Gross 7 days earlier</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-sm">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Net Performance Variance</span>
                      <div className={`mt-1 text-base font-black ${analyticsData.grandDiff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {analyticsData.grandDiff >= 0 ? "+" : ""}{currency.format(analyticsData.grandDiff)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-semibold">
                        {analyticsData.grandDiff >= 0 ? "▲ +" : "▼ "}{analyticsData.grandDiffPercent.toFixed(1)}% vs prior period
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-sm">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Top Supervisor (Volume)</span>
                      <div className="mt-1 text-sm font-black text-slate-900 truncate" title={analyticsData.topSupervisor?.supervisor}>
                        {analyticsData.topSupervisor?.supervisor || "-"}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold">
                        {currency.format(analyticsData.topSupervisor?.currentTotal || 0)} ({analyticsData.topSupervisor?.share.toFixed(1)}% share)
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 shadow-sm">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Highest Growth Supervisor</span>
                      <div className="mt-1 text-sm font-black text-slate-900 truncate" title={analyticsData.highestGainSupervisor?.supervisor}>
                        {analyticsData.highestGainSupervisor?.supervisor || "-"}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold">
                        {analyticsData.highestGainSupervisor?.diff >= 0 ? "+" : ""}{currency.format(analyticsData.highestGainSupervisor?.diff || 0)} ({analyticsData.highestGainSupervisor?.diffPercent.toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  {/* Analytics Grid: 2 Columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left Column: Daily Trend & Market Share */}
                    <div className="space-y-4">
                      {/* Selected-range daily trend chart */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wide text-slate-800">
                              Daily Sales Trend (Selected Range vs 7 Days Earlier)
                            </h4>
                            <p className="text-[10px] text-slate-500">Daily Grand Gross: Previous vs Current</p>
                          </div>
                        </div>
                        
                        <div className="flex h-56 items-end justify-between gap-2 border-b border-slate-200 pb-2 pt-4">
                          {analyticsData.dailyGrandStats.map((day) => {
                            const prevHeight = Math.max(Math.round((day.prev / analyticsData.maxDailyVal) * 125), 6);
                            const curHeight = Math.max(Math.round((day.cur / analyticsData.maxDailyVal) * 125), 6);
                            return (
                              <div key={day.date} className="flex flex-1 flex-col items-center justify-end h-full">
                                <div className="mb-2 flex flex-col items-center text-center">
                                  <span className="text-[10px] font-black text-slate-900 leading-tight">
                                    {currency.format(day.cur)}
                                  </span>
                                  <span className={`text-[8.5px] font-bold ${day.diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    {day.diff >= 0 ? "+" : ""}{day.diffPercent.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex items-end gap-1.5 justify-center w-full h-[140px]">
                                  <div
                                    className="w-4 rounded-t bg-slate-300 transition-all hover:bg-slate-400"
                                    style={{ height: `${prevHeight}px` }}
                                    title={`Previous: ${currency.format(day.prev)}`}
                                  />
                                  <div
                                    className="w-4 rounded-t bg-emerald-500 transition-all hover:bg-emerald-600"
                                    style={{ height: `${curHeight}px` }}
                                    title={`Current: ${currency.format(day.cur)}`}
                                  />
                                </div>
                                <div className="mt-2.5 flex flex-col items-center text-center leading-tight">
                                  <span className="text-[10px] font-black text-slate-900">{displayDate(day.date).replace(/, \d{4}/, "")}</span>
                                  <span className="text-[8.5px] text-slate-400">Prev: {displayDate(day.prevDate).replace(/, \d{4}/, "")}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-[10px] text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm bg-slate-400" /> Gross 7 Days Earlier
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                            <span className="h-2 w-2 rounded-sm bg-emerald-600" /> Selected Range Gross
                          </span>
                        </div>
                      </div>

                      {/* Market Share Contribution */}
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wide text-slate-800">
                              Supervisor Market Share Contribution
                            </h4>
                            <p className="text-[10px] text-slate-500">Share of Grand Total Gross</p>
                          </div>
                        </div>
                        <div className="flex h-5 w-full overflow-hidden rounded-md bg-slate-100 shadow-inner">
                          {analyticsData.distributionSegments.map((seg) => (
                            <div
                              key={seg.name}
                              style={{ width: `${seg.share}%`, backgroundColor: seg.color }}
                              title={`${seg.name}: ${seg.share.toFixed(1)}% (${currency.format(seg.total)})`}
                              className="h-full transition-all"
                            />
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-700">
                          {analyticsData.distributionSegments.map((seg) => (
                            <div key={seg.name} className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: seg.color }} />
                              <span><strong>{seg.name}</strong>: {seg.share.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Supervisor Performance Ranking */}
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between h-full">
                      <div>
                        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wide text-slate-800">
                              Supervisor Performance Ranking
                            </h4>
                            <p className="text-[10px] text-slate-500">Ranked by Current Gross (Previous vs Current)</p>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {analyticsData.sortedSupervisors.length} Supervisors
                          </span>
                        </div>

                        <div className="space-y-3">
                          {analyticsData.sortedSupervisors.map((s, rankIdx) => {
                            const curWidth = Math.max(Math.round((s.currentTotal / analyticsData.maxSupTotal) * 100), 2);
                            const prevWidth = Math.max(Math.round((s.previousTotal / analyticsData.maxSupTotal) * 100), 2);

                            return (
                              <div key={s.supervisor} className="flex items-center gap-3 border-b border-slate-100/70 pb-2 text-[10px]">
                                <div className="flex w-44 items-center gap-1.5 shrink-0">
                                  <span className="text-[9px] font-black text-slate-400 min-w-4">#{rankIdx + 1}</span>
                                  <span className="font-bold text-slate-800 truncate" title={s.supervisor}>{s.supervisor}</span>
                                  <span className="text-[8px] text-slate-400">({s.agentCount}a)</span>
                                </div>
                                <div className="flex-1 space-y-1.5 pr-3">
                                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-slate-400 rounded-full" style={{ width: `${prevWidth}%` }} title={`Prev: ${currency.format(s.previousTotal)}`} />
                                  </div>
                                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${curWidth}%` }} title={`Current: ${currency.format(s.currentTotal)}`} />
                                  </div>
                                </div>
                                <div className="w-44 text-right shrink-0 leading-tight">
                                  <div className="font-black text-slate-900">{currency.format(s.currentTotal)}</div>
                                  <div className="flex items-center justify-end gap-1.5 text-[8.5px]">
                                    <span className={`font-bold ${s.diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                      {s.diff >= 0 ? "+" : ""}{currency.format(s.diff)}
                                    </span>
                                    <span className="text-slate-400">({s.share.toFixed(1)}%)</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                            <span className="h-2 w-2 rounded-sm bg-emerald-600" /> Current Total
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-sm bg-slate-400" /> Previous Total
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400">(Amount • Variance • Share %)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button type="button" onClick={() => setPreviewOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button><button type="button" onClick={() => { exportWord(); setPreviewOpen(false); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:bg-emerald-400"><FileText size={14} /> Download Word</button><button type="button" onClick={() => { printComparison(); setPreviewOpen(false); }} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800"><Printer size={14} /> Print report</button></div>
        </div>
      </div>}

      {/* MODAL: Detalye ng Taya / Live Bet Tickets per Agent */}
      {selectedAgentDetails && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Agent live bets detail"
        >
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-black text-sm">
                  {selectedAgentDetails.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
                      Field Agent Audit
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ID: {selectedAgentDetails.id}
                    </span>
                  </div>
                  <h3 className="mt-0.5 text-base font-extrabold text-white flex items-center gap-2">
                    {selectedAgentDetails.name}
                    <span className="font-mono text-xs font-normal text-emerald-400">
                      (@{selectedAgentDetails.username})
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Supervisor: <strong className="text-white">{selectedAgentDetails.supervisor}</strong> • Outlet: <span className="text-slate-200">{selectedAgentDetails.outlet}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refreshSingleAgentBets(selectedAgentDetails)}
                  disabled={refreshingAgentId === selectedAgentDetails.id}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50"
                  title="Synchronize live transactions for this agent"
                >
                  <RotateCw size={14} className={refreshingAgentId === selectedAgentDetails.id ? "animate-spin text-emerald-400" : ""} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAgentDetails(null);
                    setModalSearch("");
                    setModalDrawFilter("all");
                  }}
                  aria-label="Close modal"
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Agent KPI summary cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Total Gross Wager</p>
                  <p className="mt-1 text-xl font-black text-emerald-950">
                    {currency.format(selectedAgentDetails.gross || 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Valid Tickets</p>
                  <p className="mt-1 text-xl font-black text-indigo-950">
                    {selectedAgentDetails.bets?.length || 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Audited Date</p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {displayDate(realtimeDate)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Draws Active</p>
                  <p className="mt-1 text-sm font-black text-amber-950">
                    {selectedAgentDetails.draws?.length ? selectedAgentDetails.draws.map((d) => d.time).join(", ") : "None logged"}
                  </p>
                </div>
              </div>

              {/* Filter / Search Bar inside Modal */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                    Draw Schedule:
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalDrawFilter("all")}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                      modalDrawFilter === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All Draws
                  </button>
                  {Array.from(new Set((selectedAgentDetails.bets || []).map((b) => String(b.drawTime || "10:30")))).sort().map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setModalDrawFilter(dt)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        modalDrawFilter === dt
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {dt}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder="Search Transaction Ref ID..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-emerald-500"
                  />
                  {modalSearch && (
                    <button
                      type="button"
                      onClick={() => setModalSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Tickets Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <div className="max-h-[380px] overflow-y-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-center w-10">#</th>
                        <th className="px-3 py-2">Transaction Ref ID</th>
                        <th className="px-3 py-2">Draw Schedule</th>
                        <th className="px-3 py-2">Wager Timestamp</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        <th className="px-3 py-2 text-right">Wager Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        const allBets = selectedAgentDetails.bets || [];
                        const filtered = allBets.filter((bet) => {
                          if (modalDrawFilter !== "all" && String(bet.drawTime || "10:30") !== modalDrawFilter) {
                            return false;
                          }
                          if (modalSearch) {
                            const q = modalSearch.toLowerCase();
                            const tx = String(bet.transactionId || "").toLowerCase();
                            if (!tx.includes(q)) return false;
                          }
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-xs text-slate-400 italic">
                                {allBets.length === 0
                                  ? "No live transaction tickets recorded for this agent on the selected date."
                                  : "No transaction tickets matched your filter or search query."}
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((bet, bIdx) => (
                          <tr key={bet.transactionId || bIdx} className="hover:bg-slate-50 transition">
                            <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-400">
                              {bIdx + 1}
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-mono text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                                {bet.transactionId || "-"}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                <Clock size={10} className="text-emerald-600" />
                                {bet.drawTime || "10:30"}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                              {bet.created_at || "-"}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {Number(bet.isVoid) === 1 ? (
                                <span className="rounded bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase text-rose-700">
                                  Void
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="font-black text-slate-900 text-xs">
                                {currency.format(bet.totalBetAmount || 0)}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
              <span className="text-[11px] text-slate-500">
                Data source: <code className="text-slate-700 font-mono">/api/teller/bet?tellerId={selectedAgentDetails.id}</code>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedAgentDetails(null);
                  setModalSearch("");
                  setModalDrawFilter("all");
                }}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Ticket Combinations Inspector */}
      {selectedTicketModal && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/70 p-3 sm:p-6 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Ticket combinations inspector"
        >
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-900 px-5 py-4 text-white">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/30">
                    Ticket Combination Breakdown
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Draw Schedule: {selectedTicketModal.gameLabel}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-extrabold text-white flex items-center gap-2">
                  Ref: <span className="font-mono text-emerald-400">{selectedTicketModal.transactionId}</span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Field Agent: <strong className="text-white">{selectedTicketModal.agentName}</strong> • Outlet: {selectedTicketModal.outlet} • Logged at: {selectedTicketModal.created_at}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicketModal(null)}
                aria-label="Close modal"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {ticketDetailsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <RefreshCw size={28} className="animate-spin text-emerald-600 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Loading combination ledger from STL API...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Total Ticket Wager</p>
                      <p className="mt-1 text-xl font-black text-emerald-950">
                        {currency.format(selectedTicketModal.amount || 0)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Combinations Count</p>
                      <p className="mt-1 text-xl font-black text-indigo-950">
                        {ticketCombinations.length} combinations
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Draw Schedule</p>
                      <p className="mt-1 text-sm font-black text-slate-900">
                        {selectedTicketModal.gameLabel}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Ledger Status</p>
                      <p className="mt-1 text-sm font-black text-amber-950">
                        {selectedTicketModal.isVoidBool ? "Voided" : "Active"}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-center w-10">#</th>
                          <th className="px-3 py-2">Combination (No.)</th>
                          <th className="px-3 py-2">Bet Code</th>
                          <th className="px-3 py-2 text-center">Play Type</th>
                          <th className="px-3 py-2 text-right">Wager Amount</th>
                          <th className="px-3 py-2 text-right">Estimated Payout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ticketCombinations.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-xs text-slate-400 italic">
                              No combination breakdown records available for this ticket.
                            </td>
                          </tr>
                        ) : (
                          ticketCombinations.map((c, cIdx) => (
                            <tr key={cIdx} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-400">
                                {cIdx + 1}
                              </td>
                              <td className="px-3 py-2">
                                <span className="font-mono text-sm font-black text-slate-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                                  {c.betNo || "-"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                                  {c.betCode || "-"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {Number(c.rambolito) === 1 ? (
                                  <span className="rounded bg-purple-100 px-2 py-0.5 text-[9px] font-black text-purple-800">
                                    Rambolito
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-600">Straight (Target)</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right font-black text-slate-900">
                                {currency.format(c.betAmount || 0)}
                              </td>
                              <td className="px-3 py-2 text-right font-black text-emerald-700">
                                {currency.format(c.winAmount || 0)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
              <span className="text-[11px] text-slate-500">
                Ref ID: <code className="text-slate-700 font-mono">{selectedTicketModal.transactionId}</code>
              </span>
              <button
                type="button"
                onClick={() => setSelectedTicketModal(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {!loaded && !error && <div className="flex flex-col items-center justify-center px-5 py-12 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CircleDollarSign size={28} /></div><p className="mt-3 text-sm font-bold text-slate-800">Loading Gross Report...</p><p className="mt-1 max-w-sm text-xs text-slate-500">Fetching live agent entries and on-duty gross status from the API.</p></div>}
    </section>
  );
}
