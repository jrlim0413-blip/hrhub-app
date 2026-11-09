import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Download,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  LoaderCircle,
  Percent,
  Plus,
  Printer,
  Radio,
  RefreshCw,
  Scale,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wrench,
  Zap,
  CircleDollarSign,
  Ticket,
  Wallet
} from "lucide-react";
import { API_CONFIG } from "../config/apiConfig";
import {
  getAreaConfigs,
  loadAreaConfigsFromCloud,
  setSelectedAreaId,
  addAreaConfig,
  saveAreaConfigs,
  DEFAULT_AREAS
} from "../lib/areaApiConfigStorage";

const DEFAULT_GROSS_URL = API_CONFIG.GROSS_REPORT_URL || "https://stl-mandaue-api.com/api/accountant/TellerGrossPerDateRange?id=2";
const DEFAULT_ACTIVE_TELLERS_URL = API_CONFIG.ACTIVE_TELLERS_URL || "https://stl-mandaue-api.com/api/accountant/ActiveTellers?id=2";
const DEFAULT_TOKEN = API_CONFIG.GROSS_REPORT_TOKEN || "7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V";

const currency = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0
});

const currencyDetailed = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2
});

const formatDate = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0")
].join("-");

const getDateChunks = (fromStr, toStr, maxDays = 14) => {
  const chunks = [];
  let cur = new Date(`${fromStr}T00:00:00`);
  const end = new Date(`${toStr}T00:00:00`);
  while (cur <= end) {
    const chunkStart = formatDate(cur);
    const nextCur = new Date(cur);
    nextCur.setDate(nextCur.getDate() + (maxDays - 1));
    const chunkEnd = nextCur < end ? formatDate(nextCur) : formatDate(end);
    chunks.push({ from: chunkStart, to: chunkEnd });
    cur = new Date(nextCur);
    cur.setDate(cur.getDate() + 1);
  }
  return chunks;
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

// Vibrant color palette for multi-area representation
const AREA_PALETTES = [
  {
    bg: "bg-emerald-500",
    gradient: "from-emerald-500 to-teal-600",
    border: "border-emerald-500",
    text: "text-emerald-700",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    ring: "ring-emerald-400"
  },
  {
    bg: "bg-blue-600",
    gradient: "from-blue-600 to-indigo-600",
    border: "border-blue-600",
    text: "text-blue-700",
    badge: "bg-blue-50 text-blue-800 border-blue-200",
    dot: "bg-blue-600",
    ring: "ring-blue-400"
  },
  {
    bg: "bg-purple-600",
    gradient: "from-purple-600 to-violet-600",
    border: "border-purple-600",
    text: "text-purple-700",
    badge: "bg-purple-50 text-purple-800 border-purple-200",
    dot: "bg-purple-600",
    ring: "ring-purple-400"
  },
  {
    bg: "bg-amber-500",
    gradient: "from-amber-500 to-orange-500",
    border: "border-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
    ring: "ring-amber-400"
  },
  {
    bg: "bg-rose-500",
    gradient: "from-rose-500 to-pink-600",
    border: "border-rose-500",
    text: "text-rose-700",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
    ring: "ring-rose-400"
  },
  {
    bg: "bg-cyan-500",
    gradient: "from-cyan-500 to-sky-600",
    border: "border-cyan-500",
    text: "text-cyan-700",
    badge: "bg-cyan-50 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
    ring: "ring-cyan-400"
  }
];

export default function MultiAreaBettingRatioView({
  parentRange = null,
  onSelectAreaForLive = null,
  onNavigateToTools = null
}) {
  const todayStr = useMemo(() => formatDate(new Date()), []);
  const mtdFromStr = useMemo(() => {
    const d = new Date();
    return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }, []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  }, []);

  // Date range filter
  const [dateRange, setDateRange] = useState(() => {
    if (parentRange?.from && parentRange?.to) {
      return { from: parentRange.from, to: parentRange.to };
    }
    return { from: mtdFromStr, to: todayStr };
  });

  // Keep in sync if parentRange changes
  useEffect(() => {
    if (parentRange?.from && parentRange?.to) {
      setDateRange({ from: parentRange.from, to: parentRange.to });
    }
  }, [parentRange?.from, parentRange?.to]);

  // Area configurations from storage / Supabase
  const [areaConfigs, setAreaConfigs] = useState(() => getAreaConfigs());
  const [areaResults, setAreaResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, activeAreaName: "" });
  const [selectedSort, setSelectedSort] = useState("gross"); // 'gross' | 'share' | 'productivity' | 'tellers'
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("all");
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  // Listen to external area config updates
  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        setAreaConfigs(e.detail);
      }
    };
    window.addEventListener("hrhub_area_configs_updated", handleUpdate);
    loadAreaConfigsFromCloud().then((cloudAreas) => {
      if (cloudAreas && cloudAreas.length > 0) {
        setAreaConfigs(cloudAreas);
      }
    });

    return () => {
      window.removeEventListener("hrhub_area_configs_updated", handleUpdate);
    };
  }, []);

  // Fetch all areas data
  const fetchAllAreasData = async () => {
    const activeAreas = areaConfigs.filter((a) => a.isActive !== false);
    if (activeAreas.length === 0) return;

    setLoading(true);
    setSyncProgress({ current: 0, total: activeAreas.length, activeAreaName: "Initializing..." });

    const results = {};
    const validFrom = dateRange.from || mtdFromStr;
    const validTo = dateRange.to || todayStr;
    const chunks = getDateChunks(validFrom, validTo, 14);

    for (let i = 0; i < activeAreas.length; i++) {
      const area = activeAreas[i];
      setSyncProgress({ current: i + 1, total: activeAreas.length, activeAreaName: area.areaName || `Area #${i + 1}` });

      const startTime = performance.now();
      const token = String(area.grossReportToken || area.activeTellersToken || API_CONFIG.GROSS_REPORT_TOKEN || DEFAULT_TOKEN).trim();
      const accountantId = area.accountantId || "2";

      try {
        // 1. Fetch Active Tellers
        let activeTellers = [];
        let activeTellersUrlObj;
        try {
          activeTellersUrlObj = new URL(area.activeTellersUrl || DEFAULT_ACTIVE_TELLERS_URL);
          if (!activeTellersUrlObj.searchParams.has("id")) {
            activeTellersUrlObj.searchParams.set("id", accountantId);
          }
          const tRes = await fetch(activeTellersUrlObj.toString(), {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
          });
          if (tRes.ok) {
            const tData = await tRes.json();
            activeTellers = getRecords(tData);
          }
        } catch (tErr) {
          console.warn(`[Betting Ratio] Active tellers fetch error for ${area.areaName}:`, tErr);
        }

        // 2. Fetch Gross Report (Chunked by 14 days)
        let grossUrlObj;
        try {
          grossUrlObj = new URL(area.grossReportUrl || DEFAULT_GROSS_URL);
        } catch {
          grossUrlObj = new URL(DEFAULT_GROSS_URL);
        }
        if (!grossUrlObj.searchParams.has("id")) {
          grossUrlObj.searchParams.set("id", accountantId);
        }

        const fetchChunk = async (chunk) => {
          try {
            const chunkUrl = new URL(grossUrlObj.toString());
            chunkUrl.searchParams.set("from", chunk.from);
            chunkUrl.searchParams.set("to", chunk.to);
            const gRes = await fetch(chunkUrl.toString(), {
              headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
            });
            if (gRes.ok) {
              const gPayload = await gRes.json();
              return getRecords(gPayload);
            }
          } catch (cErr) {
            console.warn(`[Betting Ratio] Chunk error for ${area.areaName}:`, cErr);
          }
          return [];
        };

        const chunkResults = await Promise.all(chunks.map(fetchChunk));
        const allRecords = chunkResults.flat();
        const durationMs = Math.round(performance.now() - startTime);

        // Calculate Totals, Hits, Kabig & Breakdowns
        let grossSum = 0;
        let hitsSum = 0;
        const dailyGross = {};
        const dailyHits = {};
        const dailyKabig = {};
        const drawDistribution = {};
        const uniqueAgentIds = new Set();

        allRecords.forEach((r) => {
          const amt = Number(firstValue(r, ["TotalOverAllGross", "gross", "totalGross", "amount", "total", "grossAmount"], 0)) || 0;
          const hits = Number(firstValue(r, ["TotalOverAllHits", "hits", "totalHits", "hitsAmount", "winningAmount", "payout"], 0)) || 0;
          grossSum += amt;
          hitsSum += hits;

          const dKey = dateKey(r);
          if (dKey) {
            dailyGross[dKey] = (dailyGross[dKey] || 0) + amt;
            dailyHits[dKey] = (dailyHits[dKey] || 0) + hits;
            dailyKabig[dKey] = (dailyKabig[dKey] || 0) + (amt - hits);
          }

          const dt = String(firstValue(r, ["drawTime", "time", "draw_time"], "") || "").trim();
          if (dt) {
            drawDistribution[dt] = (drawDistribution[dt] || 0) + amt;
          }

          const agId = firstValue(r, ["id", "userId", "collectorId", "agentId"], null);
          if (agId) uniqueAgentIds.add(String(agId));
        });

        const kabigSum = grossSum - hitsSum;
        const kabigPercent = grossSum > 0 ? (kabigSum / grossSum) * 100 : 0;
        const hitsPercent = grossSum > 0 ? (hitsSum / grossSum) * 100 : 0;

        const onDutyTellers = activeTellers.filter((t) => {
          if (t.deleted_at) return false;
          const active = t.isActive ?? t.is_active ?? t.status ?? t.active;
          return ![0, "0", false, "false", "inactive"].includes(active);
        });

        const effectiveTellersCount = onDutyTellers.length > 0
          ? onDutyTellers.length
          : (activeTellers.length > 0 ? activeTellers.length : (uniqueAgentIds.size || 1));

        results[area.id] = {
          area,
          status: (allRecords.length > 0 || activeTellers.length > 0) ? "online" : (durationMs > 6000 ? "offline" : "degraded"),
          latencyMs: durationMs,
          totalGross: grossSum,
          totalHits: hitsSum,
          totalKabig: kabigSum,
          hitsPercent,
          kabigPercent,
          ticketCount: allRecords.length,
          activeTellersCount: effectiveTellersCount,
          onDutyTellersCount: onDutyTellers.length,
          dailyGross,
          dailyHits,
          dailyKabig,
          drawDistribution,
          rawRecordsCount: allRecords.length,
          lastUpdated: new Date().toISOString()
        };
      } catch (areaErr) {
        const durationMs = Math.round(performance.now() - startTime);
        console.error(`[Betting Ratio] Error fetching ${area.areaName}:`, areaErr);
        results[area.id] = {
          area,
          status: "offline",
          latencyMs: durationMs,
          errorMessage: areaErr.message || "Failed to connect to API",
          totalGross: 0,
          totalHits: 0,
          totalKabig: 0,
          hitsPercent: 0,
          kabigPercent: 0,
          ticketCount: 0,
          activeTellersCount: 0,
          onDutyTellersCount: 0,
          dailyGross: {},
          dailyHits: {},
          dailyKabig: {},
          drawDistribution: {},
          rawRecordsCount: 0,
          lastUpdated: new Date().toISOString()
        };
      }
    }

    setAreaResults(results);
    setLastRefreshedAt(new Date());
    setLoading(false);
  };

  // Initial fetch on mount or when date range changes
  useEffect(() => {
    fetchAllAreasData();
  }, [dateRange.from, dateRange.to, areaConfigs.length]);

  // Company options for filter
  const companyOptions = useMemo(() => {
    const list = new Set();
    areaConfigs.forEach((a) => {
      if (a.companyName) list.add(a.companyName);
    });
    return Array.from(list);
  }, [areaConfigs]);

  // Aggregate and calculate Ratios across all areas
  const aggregatedStats = useMemo(() => {
    const activeAreas = areaConfigs.filter((a) => a.isActive !== false);
    const areaEntries = activeAreas.map((area, index) => {
      const res = areaResults[area.id] || {
        area,
        status: "idle",
        latencyMs: 0,
        totalGross: 0,
        ticketCount: 0,
        activeTellersCount: 1,
        onDutyTellersCount: 0,
        dailyGross: {},
        drawDistribution: {}
      };
      const palette = AREA_PALETTES[index % AREA_PALETTES.length];
      return {
        ...res,
        palette,
        area
      };
    });

    // Apply company entity filter if not 'all'
    const filteredEntries = selectedCompanyFilter === "all"
      ? areaEntries
      : areaEntries.filter((item) => item.area.companyName === selectedCompanyFilter);

    // Network Gross, Hits & Kabig Totals
    const totalNetworkGross = filteredEntries.reduce((sum, item) => sum + (item.totalGross || 0), 0);
    const totalNetworkHits = filteredEntries.reduce((sum, item) => sum + (item.totalHits || 0), 0);
    const totalNetworkKabig = totalNetworkGross - totalNetworkHits;
    const networkHitsPercent = totalNetworkGross > 0 ? (totalNetworkHits / totalNetworkGross) * 100 : 0;
    const networkKabigPercent = totalNetworkGross > 0 ? (totalNetworkKabig / totalNetworkGross) * 100 : 0;

    const maxAreaGross = Math.max(...filteredEntries.map((item) => item.totalGross || 0), 0);
    const totalNetworkTellers = filteredEntries.reduce((sum, item) => sum + (item.activeTellersCount || 0), 0);
    const totalNetworkTickets = filteredEntries.reduce((sum, item) => sum + (item.ticketCount || 0), 0);
    const avgProductivity = totalNetworkTellers > 0 ? (totalNetworkGross / totalNetworkTellers) : 0;

    // Calculate individual ratios
    const calculatedAreas = filteredEntries.map((item) => {
      const gross = item.totalGross || 0;
      const hits = item.totalHits || 0;
      const kabig = item.totalKabig !== undefined ? item.totalKabig : (gross - hits);
      const hitsPct = gross > 0 ? (hits / gross) * 100 : 0;
      const kabigPct = gross > 0 ? (kabig / gross) * 100 : 0;

      const tellers = item.activeTellersCount || 1;
      const sharePercent = totalNetworkGross > 0 ? (gross / totalNetworkGross) * 100 : 0;
      const benchmarkMultiplier = maxAreaGross > 0 ? (gross / maxAreaGross) : 0;
      const benchmarkRatio = (maxAreaGross > 0 && gross > 0)
        ? `1 : ${(gross / maxAreaGross).toFixed(2)}`
        : "—";
      const productivityPerTeller = tellers > 0 ? (gross / tellers) : 0;
      const productivityIndex = avgProductivity > 0 ? (productivityPerTeller / avgProductivity) : 1;

      return {
        ...item,
        totalGross: gross,
        totalHits: hits,
        totalKabig: kabig,
        hitsPercent: hitsPct,
        kabigPercent: kabigPct,
        sharePercent,
        benchmarkMultiplier,
        benchmarkRatio,
        productivityPerTeller,
        productivityIndex
      };
    });

    // Sort areas based on user preference
    calculatedAreas.sort((a, b) => {
      if (selectedSort === "gross") return b.totalGross - a.totalGross;
      if (selectedSort === "kabig") return b.totalKabig - a.totalKabig;
      if (selectedSort === "hits") return b.totalHits - a.totalHits;
      if (selectedSort === "share") return b.sharePercent - a.sharePercent;
      if (selectedSort === "productivity") return b.productivityPerTeller - a.productivityPerTeller;
      if (selectedSort === "tellers") return b.activeTellersCount - a.activeTellersCount;
      return 0;
    });

    const marketLeader = calculatedAreas[0] || null;
    const highestProductivityArea = [...calculatedAreas].sort((a, b) => b.productivityPerTeller - a.productivityPerTeller)[0] || null;

    // Count online areas
    const onlineCount = calculatedAreas.filter((a) => a.status === "online").length;

    return {
      areas: calculatedAreas,
      totalNetworkGross,
      totalNetworkHits,
      totalNetworkKabig,
      networkHitsPercent,
      networkKabigPercent,
      maxAreaGross,
      totalNetworkTellers,
      totalNetworkTickets,
      avgProductivity,
      marketLeader,
      highestProductivityArea,
      onlineCount,
      totalCount: calculatedAreas.length
    };
  }, [areaConfigs, areaResults, selectedCompanyFilter, selectedSort]);

  // Export to CSV
  const handleExportCsv = () => {
    if (aggregatedStats.areas.length === 0) return;

    const rows = [
      ["HRHub Multi-Entity Revenue Trends & Betting Ratio Report"],
      ["Date Range", `${dateRange.from} to ${dateRange.to}`],
      ["Exported At", new Date().toLocaleString()],
      ["Combined Gross Turnover", currency.format(aggregatedStats.totalNetworkGross)],
      ["Total Payout Hits", currency.format(aggregatedStats.totalNetworkHits)],
      ["Total Kabig (Net Retained)", currency.format(aggregatedStats.totalNetworkKabig)],
      ["Network Kabig Ratio", `${aggregatedStats.networkKabigPercent.toFixed(1)}%`],
      ["Total Active Tellers", aggregatedStats.totalNetworkTellers],
      ["Network Average Gross / Teller", currency.format(aggregatedStats.avgProductivity)],
      [],
      [
        "Rank",
        "Area / Location",
        "Operating Company",
        "Accountant ID",
        "Gross Turnover (PHP)",
        "Payout Hits (PHP)",
        "Hits Ratio (%)",
        "Kabig Net (PHP)",
        "Kabig Ratio (%)",
        "Betting Share (%)",
        "Benchmark Ratio (vs Leader)",
        "Active Tellers",
        "Productivity (Gross/Teller)",
        "Productivity Index vs Network Avg",
        "API Status",
        "API Latency (ms)"
      ]
    ];

    aggregatedStats.areas.forEach((item, index) => {
      rows.push([
        index + 1,
        item.area.areaName,
        item.area.companyName,
        item.area.accountantId || "2",
        item.totalGross,
        item.totalHits,
        `${item.hitsPercent.toFixed(1)}%`,
        item.totalKabig,
        `${item.kabigPercent.toFixed(1)}%`,
        `${item.sharePercent.toFixed(2)}%`,
        item.benchmarkRatio,
        item.activeTellersCount,
        Math.round(item.productivityPerTeller),
        `${(item.productivityIndex * 100).toFixed(1)}%`,
        item.status,
        item.latencyMs
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Betting_Ratio_All_Areas_${dateRange.from}_to_${dateRange.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Maguindanao preset if only 1 area exists
  const handleAddPresetArea = async () => {
    try {
      const newPreset = {
        id: `area_royal_gaming_${Date.now()}`,
        areaName: "Maguindanao del Norte",
        companyName: "5A Royal Gaming OPC",
        accountantId: "1",
        grossReportUrl: "https://stl-mandaue-api.com/api/accountant/TellerGrossPerDateRange?id=1",
        grossReportToken: API_CONFIG.GROSS_REPORT_TOKEN || DEFAULT_TOKEN,
        activeTellersUrl: "https://stl-mandaue-api.com/api/accountant/ActiveTellers?id=1",
        activeTellersToken: API_CONFIG.GROSS_REPORT_TOKEN || DEFAULT_TOKEN,
        supervisorUrl: "https://stl-mandaue-api.com/api/accountant/supervisor?id=1",
        supervisorToken: API_CONFIG.GROSS_REPORT_TOKEN || DEFAULT_TOKEN,
        backupTellersUrl: "https://stl-mandaue-api.com/api/accountant/teller?id=1",
        backupTellersToken: API_CONFIG.AGENTS_TOKEN,
        tellerBetUrl: "https://stl-mandaue-api.com/api/teller/bet",
        tellerBetToken: API_CONFIG.TELLER_BET_TOKEN,
        isDefault: false,
        isActive: true,
        description: "Official Authorized Agent Corporation (AAC Maguindanao del Norte Branch)"
      };
      await addAreaConfig(newPreset);
      const updated = getAreaConfigs();
      setAreaConfigs(updated);
    } catch (err) {
      alert("Error adding preset area: " + err.message);
    }
  };

  // Switch to an area and open live stream
  const handleFocusAreaLive = (areaId) => {
    setSelectedAreaId(areaId);
    if (onSelectAreaForLive) {
      onSelectAreaForLive(areaId);
    }
  };

  // Switch to Tools tab
  const handleOpenToolsApiHealth = () => {
    if (onNavigateToTools) {
      onNavigateToTools();
    } else {
      window.dispatchEvent(new CustomEvent("hrhub_switch_workspace_tab", { detail: { tabId: "api_health" } }));
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-slate-900/50 rounded-3xl border border-slate-800 text-slate-100">
      {/* 1. HEADER SECTION & CONTROL BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
              <TrendingUp size={13} className="text-emerald-400" />
              <span>Multi-Entity Intelligence</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-300">
              <Server size={11} className="text-slate-400" />
              <span>{aggregatedStats.onlineCount} / {aggregatedStats.totalCount} APIs Online</span>
            </span>
          </div>
          <h2 className="mt-2 text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Multi-Entity Revenue Trends & Betting Ratio</span>
            <span className="text-xs font-normal text-slate-400 font-mono">
              ({aggregatedStats.totalCount} {aggregatedStats.totalCount === 1 ? "Area" : "Areas"})
            </span>
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-2xl">
            Live multi-entity turnover distribution, betting market share ratio, and teller productivity extracted directly from all configured area endpoints in the Tools tab.
          </p>
        </div>

        {/* Date Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Presets */}
          <div className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setDateRange({ from: todayStr, to: todayStr })}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                dateRange.from === todayStr && dateRange.to === todayStr
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setDateRange({ from: yesterdayStr, to: yesterdayStr })}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                dateRange.from === yesterdayStr && dateRange.to === yesterdayStr
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => setDateRange({ from: mtdFromStr, to: todayStr })}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                dateRange.from === mtdFromStr && dateRange.to === todayStr
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              MTD
            </button>
          </div>

          {/* Date Range Inputs */}
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300">
            <CalendarDays size={13} className="text-emerald-400 shrink-0" />
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="bg-transparent text-white outline-none text-xs w-28"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="bg-transparent text-white outline-none text-xs w-28"
            />
          </div>

          {/* Sync / Refresh Button */}
          <button
            type="button"
            onClick={fetchAllAreasData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-50"
            title="Refresh latest data across all area APIs"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{loading ? "Syncing..." : "Sync APIs"}</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={aggregatedStats.areas.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
            title="Download CSV spreadsheet"
          >
            <Download size={13} />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Manage APIs in Tools Shortcut */}
          <button
            type="button"
            onClick={handleOpenToolsApiHealth}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 px-3 py-2 text-xs font-bold text-amber-400 transition hover:bg-slate-700 hover:text-amber-300"
            title="Go to Tools tab to add or configure Area APIs"
          >
            <Wrench size={13} />
            <span className="hidden md:inline">API Config</span>
          </button>
        </div>
      </div>

      {/* Syncing Progress Banner (When active) */}
      {loading && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/40 px-4 py-3 text-xs text-emerald-300 animate-pulse">
          <div className="flex items-center gap-2.5">
            <LoaderCircle size={16} className="animate-spin text-emerald-400 shrink-0" />
            <span>
              Extracting live betting figures ({syncProgress.current}/{syncProgress.total}):{" "}
              <strong className="text-white">{syncProgress.activeAreaName}</strong>
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-emerald-400">
            {Math.round((syncProgress.current / (syncProgress.total || 1)) * 100)}%
          </span>
        </div>
      )}

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* Total Turnover Across All Areas */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Combined Gross</p>
              <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <BarChart3 size={15} />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-white tracking-tight">
              {currency.format(aggregatedStats.totalNetworkGross)}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
            <Clock size={11} className="text-slate-500" />
            <span className="truncate">{dateRange.from} ~ {dateRange.to}</span>
          </div>
        </div>

        {/* Total Kabig (Net Retained Collection) */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-950 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Total Kabig (Net)</p>
              <span className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300">
                <Wallet size={15} />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-emerald-300 tracking-tight">
              {currency.format(aggregatedStats.totalNetworkKabig)}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] border-t border-emerald-500/20 pt-2">
            <span className="text-slate-400">Gross Retained</span>
            <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {aggregatedStats.networkKabigPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Total Payout Hits (Panalo) */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/30 to-slate-950 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Payout Hits</p>
              <span className="rounded-lg bg-rose-500/20 p-2 text-rose-300">
                <Ticket size={15} />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-rose-300 tracking-tight">
              {currency.format(aggregatedStats.totalNetworkHits)}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] border-t border-rose-500/20 pt-2">
            <span className="text-slate-400">Winning Payout</span>
            <span className="font-extrabold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              {aggregatedStats.networkHitsPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Active Betting Force (Tellers) */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Force</p>
              <span className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                <Users size={15} />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-white tracking-tight">
              {aggregatedStats.totalNetworkTellers} <span className="text-xs font-normal text-slate-400">tellers</span>
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
            <Activity size={11} className="text-blue-400" />
            <span className="truncate">{aggregatedStats.totalCount} active AAC areas</span>
          </div>
        </div>

        {/* Market Leader Area */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Top Market Area</p>
              <span className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <Award size={15} />
              </span>
            </div>
            <p className="mt-2 text-base font-black text-white truncate" title={aggregatedStats.marketLeader?.area.areaName || ""}>
              {aggregatedStats.marketLeader?.area.areaName || "—"}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] border-t border-slate-800/80 pt-2">
            <span className="text-slate-400 truncate max-w-[90px]">{aggregatedStats.marketLeader?.area.companyName || "—"}</span>
            <span className="font-extrabold text-amber-400">
              {aggregatedStats.marketLeader ? `${aggregatedStats.marketLeader.sharePercent.toFixed(1)}%` : "—"}
            </span>
          </div>
        </div>

        {/* Network Average Productivity */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg / Teller</p>
              <span className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                <Zap size={15} />
              </span>
            </div>
            <p className="mt-2 text-xl font-black text-white tracking-tight">
              {currency.format(aggregatedStats.avgProductivity)}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-1 text-[10px] text-purple-400 font-semibold border-t border-slate-800/80 pt-2 truncate">
            <TrendingUp size={11} className="shrink-0" />
            <span className="truncate">Top: {aggregatedStats.highestProductivityArea?.area.areaName || "—"}</span>
          </div>
        </div>
      </div>

      {/* 3. MULTI-AREA MARKET SHARE VISUAL BAR */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Percent size={15} className="text-emerald-400" />
              <span>Market Share Turnover Distribution (100% Total)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparative proportional ratio of total bets wagered per geographic area
            </p>
          </div>
          {lastRefreshedAt && (
            <span className="text-[11px] text-slate-500">
              Last synced: {lastRefreshedAt.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* The Segmented Multi-Color Progress Bar */}
        <div className="h-6 w-full rounded-xl overflow-hidden bg-slate-800/80 flex shadow-inner border border-slate-800">
          {aggregatedStats.areas.map((item) => {
            const widthPct = Math.max(item.sharePercent, 0);
            if (widthPct === 0) return null;
            return (
              <div
                key={item.area.id}
                style={{ width: `${widthPct}%` }}
                className={`h-full ${item.palette.bg} transition-all duration-500 relative group cursor-pointer`}
                title={`${item.area.areaName}: ${currency.format(item.totalGross)} (${item.sharePercent.toFixed(1)}%)`}
              >
                {widthPct > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-white drop-shadow-xs px-1 truncate">
                    {item.sharePercent.toFixed(1)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-800/60 text-xs">
          {aggregatedStats.areas.map((item) => (
            <div key={item.area.id} className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-md ${item.palette.bg} shrink-0`} />
              <span className="font-bold text-white">{item.area.areaName}</span>
              <span className="text-slate-400">({currency.format(item.totalGross)})</span>
              <span className="font-extrabold text-emerald-400">{item.sharePercent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. AREA-BY-AREA COMPARATIVE CARDS GRID */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers size={16} className="text-emerald-400" />
              <span>Area Performance & Benchmark Ratio Cards</span>
            </h3>
            <p className="text-xs text-slate-400">
              Side-by-side comparison of volume, benchmark multiplier against market leader, and teller density
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            {companyOptions.length > 1 && (
              <select
                value={selectedCompanyFilter}
                onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
              >
                <option value="all">All Companies</option>
                {companyOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}

            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
            >
              <option value="gross">Sort: Gross Sales</option>
              <option value="kabig">Sort: Kabig (Net Retained)</option>
              <option value="hits">Sort: Payout Hits</option>
              <option value="share">Sort: Market Share %</option>
              <option value="productivity">Sort: Teller Productivity</option>
              <option value="tellers">Sort: Active Tellers</option>
            </select>
          </div>
        </div>

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {aggregatedStats.areas.map((item, index) => {
            const isLeader = index === 0 && item.totalGross > 0;
            return (
              <div
                key={item.area.id}
                className={`rounded-2xl border transition-all duration-200 bg-slate-950/80 p-5 flex flex-col justify-between ${
                  isLeader
                    ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-black ${isLeader ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                          #{index + 1}
                        </span>
                        <h4 className="text-base font-black text-white">{item.area.areaName}</h4>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400 flex items-center gap-1">
                        <Building2 size={11} className="text-slate-500" />
                        <span>{item.area.companyName}</span>
                      </p>
                    </div>

                    {/* API Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.status === "online"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : item.status === "degraded"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}
                      title={`Latency: ${item.latencyMs}ms`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${item.status === "online" ? "bg-emerald-400" : item.status === "degraded" ? "bg-amber-400" : "bg-rose-400"}`} />
                      <span>{item.status === "online" ? `${item.latencyMs}ms` : item.status}</span>
                    </span>
                  </div>

                  {/* Gross Turnover Big Number */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Gross Turnover</p>
                      <span className="text-[10px] font-extrabold text-slate-300">100% Gross</span>
                    </div>
                    <p className="text-2xl font-black text-white mt-1">
                      {currency.format(item.totalGross)}
                    </p>
                  </div>

                  {/* Dual Kabig (Net Retained) & Hits (Payout) Breakdown Cards */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                      <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Wallet size={11} />
                          <span>Kabig (Net)</span>
                        </span>
                        <span className="font-extrabold">{item.kabigPercent.toFixed(1)}%</span>
                      </div>
                      <p className="mt-1 text-sm font-black text-emerald-300">
                        {currency.format(item.totalKabig)}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Retained Gross</p>
                    </div>

                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5">
                      <div className="flex items-center justify-between text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Ticket size={11} />
                          <span>Payout Hits</span>
                        </span>
                        <span className="font-extrabold">{item.hitsPercent.toFixed(1)}%</span>
                      </div>
                      <p className="mt-1 text-sm font-black text-rose-300">
                        {currency.format(item.totalHits)}
                      </p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Winning Payouts</p>
                    </div>
                  </div>

                  {/* Market Share Progress & Benchmark Ratio */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Betting Share Ratio</span>
                      <strong className="text-white font-extrabold">{item.sharePercent.toFixed(1)}%</strong>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{ width: `${Math.max(item.sharePercent, 2)}%` }}
                        className={`h-full ${item.palette.bg}`}
                      />
                    </div>
                  </div>

                  {/* Benchmark Comparison & Productivity Matrix */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-900/90 p-3 border border-slate-800/70 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Benchmark Ratio</p>
                      <p className="mt-0.5 font-black text-white">
                        {isLeader ? (
                          <span className="text-amber-400 font-extrabold">1.00x (Leader)</span>
                        ) : (
                          <span>{item.benchmarkMultiplier.toFixed(2)}x <span className="text-[10px] text-slate-400">({item.benchmarkRatio})</span></span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Active Tellers</p>
                      <p className="mt-0.5 font-black text-white">
                        {item.activeTellersCount} tellers
                      </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400">Sales / Teller (Productivity)</p>
                        <p className="font-extrabold text-emerald-400">
                          {currency.format(item.productivityPerTeller)}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.productivityIndex >= 1
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {item.productivityIndex >= 1 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        <span>{item.productivityIndex >= 1 ? "+" : ""}{((item.productivityIndex - 1) * 100).toFixed(0)}% vs avg</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Quick Focus Action */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Accountant #{item.area.accountantId || "2"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFocusAreaLive(item.area.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    <span>View Live Stream</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. MULTI-AREA COMPARISON TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
        <div className="border-b border-slate-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="text-sm font-extrabold text-white">Detailed Multi-Area Comparison Matrix</h4>
            <p className="text-xs text-slate-400 mt-0.5">Comprehensive statistical breakdown of revenue, ratio, and workforce efficiency</p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {aggregatedStats.areas.length} Areas Monitored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4"># Rank</th>
                <th className="py-3 px-4">Area / Location</th>
                <th className="py-3 px-4">AAC Operating Company</th>
                <th className="py-3 px-4 text-right">Total Gross Bets</th>
                <th className="py-3 px-4 text-right">Payout Hits</th>
                <th className="py-3 px-4 text-right">Kabig (Net)</th>
                <th className="py-3 px-4 text-right">Market Share</th>
                <th className="py-3 px-4 text-center">Ratio vs Leader</th>
                <th className="py-3 px-4 text-center">Active Tellers</th>
                <th className="py-3 px-4 text-right">Gross / Teller</th>
                <th className="py-3 px-4 text-center">API Health</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {aggregatedStats.areas.map((item, index) => (
                <tr key={item.area.id} className="hover:bg-slate-900/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-400">
                    <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-black ${index === 0 ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.palette.bg} shrink-0`} />
                    <span>{item.area.areaName}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {item.area.companyName}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-white text-sm">
                    {currency.format(item.totalGross)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="font-bold text-rose-400 text-xs">
                      {currency.format(item.totalHits)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {item.hitsPercent.toFixed(1)}% payout
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="font-bold text-emerald-400 text-xs">
                      {currency.format(item.totalKabig)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {item.kabigPercent.toFixed(1)}% net
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-extrabold text-emerald-400">{item.sharePercent.toFixed(2)}%</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-300">
                    {index === 0 ? (
                      <span className="text-amber-400 font-extrabold">1.00x (Leader)</span>
                    ) : (
                      <span>{item.benchmarkRatio}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-300">
                    {item.activeTellersCount}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-purple-400">
                    {currency.format(item.productivityPerTeller)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.status === "online"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : item.status === "degraded"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${item.status === "online" ? "bg-emerald-400" : item.status === "degraded" ? "bg-amber-400" : "bg-rose-400"}`} />
                      <span>{item.status === "online" ? `${item.latencyMs}ms` : item.status}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleFocusAreaLive(item.area.id)}
                      className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-slate-700 hover:text-white transition"
                    >
                      Focus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Summary Row */}
            <tfoot>
              <tr className="border-t-2 border-emerald-500/40 bg-slate-900/90 font-black text-white">
                <td className="py-3 px-4" colSpan={3}>
                  COMBINED NETWORK TOTAL
                </td>
                <td className="py-3 px-4 text-right text-emerald-400 text-sm">
                  {currency.format(aggregatedStats.totalNetworkGross)}
                </td>
                <td className="py-3 px-4 text-right text-rose-400">
                  <div>{currency.format(aggregatedStats.totalNetworkHits)}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{aggregatedStats.networkHitsPercent.toFixed(1)}% payout</div>
                </td>
                <td className="py-3 px-4 text-right text-emerald-400">
                  <div>{currency.format(aggregatedStats.totalNetworkKabig)}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{aggregatedStats.networkKabigPercent.toFixed(1)}% net</div>
                </td>
                <td className="py-3 px-4 text-right text-emerald-400">
                  100.00%
                </td>
                <td className="py-3 px-4 text-center text-slate-400">
                  —
                </td>
                <td className="py-3 px-4 text-center">
                  {aggregatedStats.totalNetworkTellers} tellers
                </td>
                <td className="py-3 px-4 text-right text-purple-400">
                  {currency.format(aggregatedStats.avgProductivity)} (avg)
                </td>
                <td className="py-3 px-4 text-center text-slate-400" colSpan={2}>
                  {aggregatedStats.onlineCount}/{aggregatedStats.totalCount} Online
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 6. CALLOUT: If only 1 Area configured, offer 1-click Preset or Tools Guide */}
      {aggregatedStats.totalCount <= 1 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-amber-500/20 p-2.5 text-amber-400 shrink-0">
              <Compass size={20} />
            </span>
            <div>
              <h5 className="text-sm font-bold text-white">Only 1 Area API currently configured</h5>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                The Betting Ratio view automatically extracts and compares all areas configured in the Tools tab. To see multi-area ratios across your branches (e.g., Mandaue vs Maguindanao vs Iligan), configure more endpoints in Tools &gt; API Configuration.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAddPresetArea}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 transition shadow-md"
            >
              <Plus size={14} />
              <span>Add 5A Royal Gaming Preset</span>
            </button>
            <button
              type="button"
              onClick={handleOpenToolsApiHealth}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition"
            >
              <Wrench size={13} />
              <span>Manage APIs in Tools</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

