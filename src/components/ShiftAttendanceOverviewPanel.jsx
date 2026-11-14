import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Calendar, Clock, Users, Building2, MapPin, Search,
  CheckCircle2, Filter, Printer, MessageSquare,
  ShieldCheck, AlertCircle, RefreshCw, Eye, X, Image as ImageIcon,
  ExternalLink, ChevronRight, ChevronLeft, Plus, Sparkles, Coffee,
  Car, LogOut, Check, Tag, Send, Trash2, ArrowUpRight, FolderCheck,
  ClipboardCheck, ShieldAlert, Megaphone, CreditCard, LayoutGrid, List
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import {
  HEAD_OFFICE,
  ALL_SUBSIDIARIES,
  ENTITY_METADATA,
  matchesCompanyEntity
} from "../lib/companyEntities.js";
import {
  fetchHRAttendanceRoster,
  fetchHRAccomplishmentLogs,
  deleteHRAccomplishmentLog,
  subscribeToHRAttendanceLive,
  getTodayDateStr,
  HR_LOG_CATEGORIES,
  extractHROfficers
} from "../lib/hrAttendanceStorage.js";
import {
  fetchCloudAttendance,
  subscribeToAttendanceRealtime
} from "../lib/supervisorAttendanceStorage.js";
import LogHRAccomplishmentModal from "./LogHRAccomplishmentModal.jsx";
import HRAttendancePunchModal from "./HRAttendancePunchModal.jsx";

export default function ShiftAttendanceOverviewPanel({
  profiles = [],
  presenceMap = {},
  currentProfile = null,
  currentUser = null,
  isHRMD = true,
  onOpenChat,
  onOpenWorkspaceTab
}) {
  // Navigation Mode: 'hr_center' (Multi-Entity HR Roster & Daily Logs) | 'field_supervisors' (Field Operations Attendance)
  const [activeMode, setActiveMode] = useState("hr_center");

  const [selectedDate, setSelectedDate] = useState(getTodayDateStr);
  const [selectedSubsidiary, setSelectedSubsidiary] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedHrFilter, setSelectedHrFilter] = useState("all"); // 'all' | email
  const [subView, setSubView] = useState("dual"); // 'dual' | 'roster' | 'logs'

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false);
  const [preSelectedHrEmail, setPreSelectedHrEmail] = useState(null);
  const [notice, setNotice] = useState(null);

  // Field supervisors state
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [supervisorRecords, setSupervisorRecords] = useState([]);
  const [supervisorLoading, setSupervisorLoading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // HR Center live state
  const [hrAttendanceList, setHrAttendanceList] = useState([]);
  const [accomplishmentLogs, setAccomplishmentLogs] = useState([]);
  const [hrLoading, setHrLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  const tabsScrollRef = useRef(null);

  const scrollTabs = (direction) => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({
        left: direction === "left" ? -220 : 220,
        behavior: "smooth"
      });
    }
  };

  // If a non-HRMD user logs in, scope default subsidiary to their company
  useEffect(() => {
    if (!isHRMD && currentProfile?.company) {
      setSelectedSubsidiary(currentProfile.company);
    }
  }, [isHRMD, currentProfile?.company]);

  // Extract all HR Officers across entities
  const hrOfficers = useMemo(() => {
    const list = extractHROfficers(profiles);
    const hasHrmd = list.some((p) => (p.email || "").toLowerCase() === "admin@hrhub.com");
    if (!hasHrmd) {
      list.unshift({
        id: "emp_hrmd_master",
        email: "admin@hrhub.com",
        name: "H R M D",
        company: HEAD_OFFICE,
        role: "HR Administrator",
        branch: "Head Office (SGC)",
        is_approved: true
      });
    }
    return list;
  }, [profiles]);

  // Load HR Attendance and Accomplishment logs
  const loadHRData = useCallback(async (dateStr) => {
    setHrLoading(true);
    try {
      const [attData, logsData] = await Promise.all([
        fetchHRAttendanceRoster(dateStr),
        fetchHRAccomplishmentLogs(dateStr)
      ]);
      setHrAttendanceList(attData || []);
      setAccomplishmentLogs(logsData || []);
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn("Failed to load HR attendance data:", err);
    } finally {
      setHrLoading(false);
    }
  }, []);

  // Load Supervisor Attendance records
  const loadSupervisorAttendance = useCallback(async (dateStr) => {
    setSupervisorLoading(true);
    try {
      const { data } = await fetchCloudAttendance(dateStr);
      setSupervisorRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to load supervisor attendance:", err);
      setSupervisorRecords([]);
    } finally {
      setSupervisorLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHRData(selectedDate);
    if (activeMode === "field_supervisors") {
      loadSupervisorAttendance(selectedDate);
    }

    // Subscribe to live HR Attendance updates
    const unsubscribeHR = subscribeToHRAttendanceLive(() => {
      loadHRData(selectedDate);
    });

    // Subscribe to field attendance
    const unsubscribeSpvr = subscribeToAttendanceRealtime(selectedDate, () => {
      loadSupervisorAttendance(selectedDate);
    });

    return () => {
      if (typeof unsubscribeHR === "function") unsubscribeHR();
      if (typeof unsubscribeSpvr === "function") unsubscribeSpvr();
    };
  }, [selectedDate, activeMode, loadHRData, loadSupervisorAttendance]);

  // Handle Delete Accomplishment Log
  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Are you sure you want to delete this accomplishment entry?")) return;
    await deleteHRAccomplishmentLog(logId);
    setNotice({ type: "success", text: "Accomplishment entry removed." });
    setTimeout(() => setNotice(null), 3000);
    loadHRData(selectedDate);
  };

  // Build Unified HR Officers Roster with their Attendance Status for the active date
  const unifiedHrRoster = useMemo(() => {
    const attendanceMap = new Map();
    hrAttendanceList.forEach((att) => {
      if (att.email) {
        attendanceMap.set(att.email.toLowerCase().trim(), att);
      }
    });

    const logsCountMap = new Map();
    accomplishmentLogs.forEach((log) => {
      const em = (log.authorEmail || "").toLowerCase().trim();
      logsCountMap.set(em, (logsCountMap.get(em) || 0) + 1);
    });

    return hrOfficers.map((hr) => {
      const email = (hr.email || "").toLowerCase().trim();
      const att = attendanceMap.get(email);
      const todayLogsCount = logsCountMap.get(email) || 0;
      const isOnline = Boolean(presenceMap[email] || presenceMap[hr.email]);

      return {
        ...hr,
        attendance: att || {
          status: "awaiting_checkin",
          timeIn: "--",
          timeOut: "--",
          location: `${hr.company || "Company"} • ${hr.branch || "Office"}`,
          shift: "Standard Day Shift",
          notes: "Awaiting daily attendance check-in."
        },
        todayLogsCount,
        isOnline
      };
    });
  }, [hrOfficers, hrAttendanceList, accomplishmentLogs, presenceMap]);

  // Filtered HR Officers by Subsidiary
  const filteredHrOfficers = useMemo(() => {
    return unifiedHrRoster.filter((hr) => {
      if (selectedSubsidiary === "all") return true;
      return matchesCompanyEntity(hr.company, selectedSubsidiary);
    });
  }, [unifiedHrRoster, selectedSubsidiary]);

  // Filtered Accomplishment Logs
  const filteredAccomplishmentLogs = useMemo(() => {
    return accomplishmentLogs.filter((log) => {
      // 1. Subsidiary filter
      if (selectedSubsidiary !== "all") {
        if (!matchesCompanyEntity(log.authorCompany, selectedSubsidiary)) return false;
      }

      // 2. HR Officer filter
      if (selectedHrFilter !== "all") {
        if ((log.authorEmail || "").toLowerCase() !== selectedHrFilter.toLowerCase()) return false;
      }

      // 3. Category filter
      if (selectedCategory !== "all") {
        if (log.category !== selectedCategory) return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (log.title || "").toLowerCase().includes(q);
        const detailsMatch = (log.details || "").toLowerCase().includes(q);
        const authorMatch = (log.authorName || "").toLowerCase().includes(q);
        const compMatch = (log.authorCompany || "").toLowerCase().includes(q);
        const tagMatch = (log.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !detailsMatch && !authorMatch && !compMatch && !tagMatch) return false;
      }

      return true;
    });
  }, [accomplishmentLogs, selectedSubsidiary, selectedHrFilter, selectedCategory, searchQuery]);

  // High-Level KPI Metrics for HR Command Center
  const hrMetrics = useMemo(() => {
    const totalHRs = filteredHrOfficers.length;
    const onDutyCount = filteredHrOfficers.filter(
      (h) => h.attendance?.status === "present" || h.attendance?.status === "field_work"
    ).length;
    const onBreakCount = filteredHrOfficers.filter((h) => h.attendance?.status === "break").length;
    const totalLogsToday = filteredAccomplishmentLogs.length;
    const onlineCount = filteredHrOfficers.filter((h) => h.isOnline).length;

    return {
      totalHRs,
      onDutyCount,
      onBreakCount,
      totalLogsToday,
      onlineCount
    };
  }, [filteredHrOfficers, filteredAccomplishmentLogs]);

  // Entity Tabs with live On-Duty counts
  const entityTabs = useMemo(() => {
    const list = [
      {
        id: "all",
        name: "All Entities",
        shortName: "All Entities",
        logoUrl: null,
        count: unifiedHrRoster.length,
        onDutyCount: unifiedHrRoster.filter(
          (h) => h.attendance?.status === "present" || h.attendance?.status === "field_work"
        ).length
      }
    ];

    ALL_SUBSIDIARIES.forEach((comp) => {
      const meta = ENTITY_METADATA[comp] || {};
      const hrs = unifiedHrRoster.filter((h) => matchesCompanyEntity(h.company, comp));
      const onDuty = hrs.filter(
        (h) => h.attendance?.status === "present" || h.attendance?.status === "field_work"
      ).length;

      list.push({
        id: comp,
        name: comp,
        shortName: meta.shortName || comp,
        logoUrl: meta.logoUrl || null,
        count: hrs.length,
        onDutyCount: onDuty
      });
    });

    return list;
  }, [unifiedHrRoster]);

  // Quick punch helper from HR card
  const handleOpenPunchForHr = (email) => {
    setPreSelectedHrEmail(email);
    setIsPunchModalOpen(true);
  };

  // Quick log accomplishment helper from HR card
  const handleOpenLogForHr = (email) => {
    setPreSelectedHrEmail(email);
    setIsLogModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & EXECUTIVE NAVIGATION BAR                     */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black tracking-tight">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>ENTERPRISE HR COMMAND & WORKFORCE ROSTER</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                Simpal Group of Companies
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Shift Attendance & HR Activity Logs
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Consolidated multi-entity monitoring of assigned HR officers, daily attendance check-ins, duty statuses, and real-time operational work accomplishment logs.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date Picker Input */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
              <Calendar size={14} className="text-slate-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                title="Select inspection date"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateStr())}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-bold text-slate-700 transition cursor-pointer"
              title="Return to today's date"
            >
              Today
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                loadHRData(selectedDate);
                if (activeMode === "field_supervisors") loadSupervisorAttendance(selectedDate);
              }}
              disabled={hrLoading || supervisorLoading}
              title="Sync with cloud database"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={hrLoading ? "animate-spin text-emerald-600" : ""} />
              <span>Sync</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            {/* Attendance Punch Button */}
            <button
              type="button"
              onClick={() => {
                setPreSelectedHrEmail(currentProfile?.email || "admin@hrhub.com");
                setIsPunchModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              title="Punch Daily Attendance or Duty Status"
            >
              <Clock size={13} className="text-emerald-400" />
              <span>Punch Attendance</span>
            </button>

            {/* Log Accomplishment Button */}
            <button
              type="button"
              onClick={() => {
                setPreSelectedHrEmail(currentProfile?.email || "admin@hrhub.com");
                setIsLogModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
              title="Record a Daily Work Accomplishment"
            >
              <Plus size={13} />
              <span>+ Log Work Task</span>
            </button>
          </div>
        </div>

        {/* PRIMARY VIEW SELECTOR: Multi-Entity HR Command vs Field Supervisors */}
        <div className="pt-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveMode("hr_center")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeMode === "hr_center"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Building2 size={14} className={activeMode === "hr_center" ? "text-emerald-600" : "text-slate-400"} />
              <span>Per-Entity HR Officers & Daily Logs</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-emerald-100 text-emerald-800">
                {hrOfficers.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode("field_supervisors")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeMode === "field_supervisors"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapPin size={14} className={activeMode === "field_supervisors" ? "text-blue-600" : "text-slate-400"} />
              <span>Field Supervisors & Stations</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-200 text-slate-700">
                {supervisorRecords.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            {lastRefreshedAt && (
              <span>Last synced: {lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. MODE 1: PER-ENTITY HR OFFICERS & DAILY WORK LOGS          */}
      {/* ============================================================ */}
      {activeMode === "hr_center" && (
        <div className="space-y-6">
          {/* ENTITY SELECTOR CAROUSEL TABS (Exclusively available for multi-entity navigation) */}
          {isHRMD && (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-2.5 sm:px-3.5 py-2 bg-slate-50/80 flex items-center justify-between gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => scrollTabs("left")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer shadow-2xs shrink-0"
                  title="Scroll entities left"
                >
                  <ChevronLeft size={13} />
                </button>

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
                        onClick={() => {
                          setSelectedSubsidiary(tab.id);
                          setSelectedHrFilter("all");
                        }}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 ${
                          isSelected
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
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                              : "bg-slate-100 text-slate-600 border border-slate-200/70"
                          }`}
                        >
                          {tab.count}
                        </span>
                        {tab.onDutyCount > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => scrollTabs("right")}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer shadow-2xs shrink-0"
                  title="Scroll entities right"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* KEY METRICS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>Total HR Officers</span>
                <Users size={15} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{hrMetrics.totalHRs}</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">
                {selectedSubsidiary === "all" ? "Across all entities" : `In ${selectedSubsidiary}`}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>On-Duty / Present</span>
                <CheckCircle2 size={15} className="text-emerald-600" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-emerald-700">{hrMetrics.onDutyCount}</span>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">
                Active shift check-ins for {selectedDate}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>Accomplishments Logged</span>
                <Sparkles size={15} className="text-purple-600" />
              </div>
              <div className="text-2xl font-black text-purple-700">{hrMetrics.totalLogsToday}</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">
                Official task entries today
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                <span>Live Active Sessions</span>
                <Clock size={15} className="text-blue-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">{hrMetrics.onlineCount}</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-1">
                Connected to HR Hub workstation
              </div>
            </div>
          </div>

          {/* SEARCH, CATEGORY FILTERS & VIEW MODE SWITCHER */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search HR officer name, task accomplishment, category, or branch..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="all">📂 All Work Categories</option>
                {HR_LOG_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              {/* HR Officer Specific Filter (if active) */}
              {selectedHrFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedHrFilter("all")}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold cursor-pointer hover:bg-amber-100"
                  title="Clear HR filter"
                >
                  <span>Filtered: {selectedHrFilter.split("@")[0]}</span>
                  <X size={12} />
                </button>
              )}

              {/* Sub-view Switcher */}
              <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSubView("dual")}
                  title="Executive Dual View (Roster + Logs)"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    subView === "dual" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutGrid size={13} />
                  <span>Dual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubView("roster")}
                  title="HR Officers Attendance Roster"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    subView === "roster" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Users size={13} />
                  <span>Roster</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSubView("logs")}
                  title="Daily Work Accomplishment Feed"
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    subView === "logs" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <List size={13} />
                  <span>Logs ({filteredAccomplishmentLogs.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* DUAL / ROSTER VIEW: HR Officers Cards */}
          {(subView === "dual" || subView === "roster") && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users size={16} className="text-emerald-600" />
                  <span>Designated Entity HR Officers & Duty Status</span>
                  <span className="text-xs text-slate-400 font-normal">({filteredHrOfficers.length} personnel)</span>
                </h3>

                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                  Click &ldquo;View Logs&rdquo; on an HR to inspect their specific task accomplishments
                </span>
              </div>

              {filteredHrOfficers.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/90 p-8 text-center space-y-2">
                  <Building2 size={32} className="mx-auto text-slate-300" />
                  <h4 className="text-sm font-bold text-slate-800">No HR Officers Enrolled for this Entity</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Operating under Central HRMD administrative governance. You can enroll on-site HR personnel in the Employee Directory.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredHrOfficers.map((hr) => {
                    const initials = hr.name
                      ? hr.name.replace(/\s+/g, "").toLowerCase() === "hrmd"
                        ? "HR"
                        : hr.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                      : (hr.email || "HR").slice(0, 2).toUpperCase();

                    const att = hr.attendance;
                    const isPresent = att.status === "present";
                    const isBreak = att.status === "break";
                    const isField = att.status === "field_work";
                    const isCompleted = att.status === "completed";
                    const isAwaiting = att.status === "awaiting_checkin";

                    const statusBadge = isPresent
                      ? { label: "On-Duty / Present", bg: "bg-emerald-50 text-emerald-800 border-emerald-300", dot: "bg-emerald-500" }
                      : isField
                      ? { label: "Field Terminal Visit", bg: "bg-blue-50 text-blue-800 border-blue-300", dot: "bg-blue-500" }
                      : isBreak
                      ? { label: "On Lunch / Break", bg: "bg-amber-50 text-amber-800 border-amber-300", dot: "bg-amber-500" }
                      : isCompleted
                      ? { label: "Shift Completed", bg: "bg-slate-100 text-slate-700 border-slate-300", dot: "bg-slate-400" }
                      : { label: "Awaiting Check-in", bg: "bg-zinc-100 text-zinc-600 border-zinc-200", dot: "bg-zinc-400" };

                    const isFiltered = selectedHrFilter.toLowerCase() === (hr.email || "").toLowerCase();

                    return (
                      <div
                        key={hr.email || hr.id}
                        className={`bg-white rounded-2xl border transition-all p-4.5 flex flex-col justify-between gap-3 shadow-2xs hover:shadow-sm ${
                          isFiltered ? "border-emerald-500 ring-2 ring-emerald-200" : "border-slate-200/90"
                        }`}
                      >
                        {/* Top: Avatar, Name, Role, Entity */}
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="relative shrink-0">
                                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                                  {initials}
                                </div>
                                <span
                                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white ${statusBadge.dot}`}
                                  title={statusBadge.label}
                                />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-extrabold text-slate-900 text-sm truncate" title={hr.name}>
                                    {hr.name}
                                  </h4>
                                  {hr.isOnline && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Online
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] font-bold text-emerald-700 mt-0.5 truncate">
                                  {hr.role || "HR Officer"}
                                </p>

                                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                                  <Building2 size={11} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{hr.company}</span>
                                </p>
                              </div>
                            </div>

                            {onOpenChat && (
                              <button
                                type="button"
                                onClick={() => onOpenChat({ name: hr.name, email: hr.email })}
                                className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition cursor-pointer shrink-0"
                                title={`Chat with ${hr.name}`}
                              >
                                <MessageSquare size={14} />
                              </button>
                            )}
                          </div>

                          {/* Duty Status Badge & Time In */}
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-black border ${statusBadge.bg}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
                                <span>{statusBadge.label}</span>
                              </span>

                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                In: {att.timeIn || "--"} {att.timeOut ? `• Out: ${att.timeOut}` : ""}
                              </span>
                            </div>

                            {/* Location / Station */}
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate font-medium">
                              <MapPin size={11} className="text-emerald-600 shrink-0" />
                              <span className="truncate">{att.location || hr.branch || "Head Office (SGC)"}</span>
                            </p>

                            {/* Notes / Daily Focus */}
                            {att.notes && (
                              <p className="text-[10px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2 italic leading-relaxed line-clamp-2">
                                &ldquo;{att.notes}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHrFilter(isFiltered ? "all" : hr.email);
                              if (subView === "roster") setSubView("dual");
                            }}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg transition cursor-pointer ${
                              isFiltered
                                ? "bg-emerald-600 text-white"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            <span>{hr.todayLogsCount} Task{hr.todayLogsCount === 1 ? "" : "s"} Logged</span>
                            <ChevronRight size={12} />
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenPunchForHr(hr.email)}
                              className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[10px] font-bold text-slate-700 transition cursor-pointer"
                              title="Update attendance status for this HR"
                            >
                              Punch
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenLogForHr(hr.email)}
                              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-[10px] font-bold text-emerald-400 transition cursor-pointer"
                              title="Add daily task log for this HR"
                            >
                              + Task
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DUAL / LOGS VIEW: Daily Work & Accomplishment Feed */}
          {(subView === "dual" || subView === "logs") && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-600" />
                    <span>Daily Work Accomplishments & Action Trail</span>
                    <span className="text-xs text-slate-400 font-normal">
                      ({filteredAccomplishmentLogs.length} entries for {selectedDate})
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official operational log of tasks executed by entity HR personnel during their shift.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPreSelectedHrEmail(currentProfile?.email || "admin@hrhub.com");
                    setIsLogModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  <span>+ Record Accomplishment</span>
                </button>
              </div>

              {filteredAccomplishmentLogs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center space-y-3">
                  <Sparkles size={36} className="mx-auto text-slate-300" />
                  <h4 className="text-base font-extrabold text-slate-800">
                    No Work Accomplishments Logged for {selectedDate}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    There are no recorded task accomplishments matching your active filters. HR officers can click &ldquo;+ Record Accomplishment&rdquo; to document tasks completed today.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPreSelectedHrEmail(currentProfile?.email || "admin@hrhub.com");
                      setIsLogModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    + Log First Accomplishment
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAccomplishmentLogs.map((log) => {
                    const categoryMeta = HR_LOG_CATEGORIES.find((c) => c.id === log.category) || {
                      badge: "📂 General HR",
                      color: "bg-slate-50 text-slate-800 border-slate-200"
                    };

                    const statusBadge =
                      log.status === "completed"
                        ? { label: "Completed", bg: "bg-emerald-50 text-emerald-800 border-emerald-300" }
                        : log.status === "in_progress"
                        ? { label: "In Progress", bg: "bg-blue-50 text-blue-800 border-blue-300" }
                        : { label: "Requires Follow-up", bg: "bg-amber-50 text-amber-800 border-amber-300" };

                    const authorInitials = log.authorName
                      ? log.authorName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                      : "HR";

                    return (
                      <div
                        key={log.id}
                        className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-slate-300 transition space-y-3"
                      >
                        {/* Header: Author + Meta + Category Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 font-extrabold text-xs flex items-center justify-center shrink-0">
                              {authorInitials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-xs text-slate-900">
                                  {log.authorName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  ({log.authorRole || "HR Officer"})
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.2 rounded">
                                  {log.authorCompany}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Category Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${categoryMeta.color}`}
                            >
                              <span>{categoryMeta.badge}</span>
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border ${statusBadge.bg}`}
                            >
                              {statusBadge.label}
                            </span>

                            {/* Time Logged */}
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60 flex items-center gap-1">
                              <Clock size={11} className="text-slate-400" />
                              <span>{log.timeLogged}</span>
                            </span>

                            {/* Delete Log (HRMD or Author) */}
                            {(isHRMD || (currentProfile?.email && currentProfile.email.toLowerCase() === (log.authorEmail || "").toLowerCase())) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete this accomplishment log"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Task Title & Details */}
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-black text-slate-900 leading-snug">
                            {log.title}
                          </h4>
                          {log.details && (
                            <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                              {log.details}
                            </p>
                          )}
                        </div>

                        {/* Footer Tags & Branch */}
                        <div className="flex items-center justify-between gap-2 pt-1 flex-wrap text-[10px] text-slate-400 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-600">
                              <MapPin size={11} className="text-emerald-600 shrink-0" />
                              <span>{log.branch || "Branch Office"}</span>
                            </span>

                            {Array.isArray(log.tags) && log.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>

                          <span>Date: {log.date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. MODE 2: FIELD SUPERVISORS ATTENDANCE (Existing Roster)   */}
      {/* ============================================================ */}
      {activeMode === "field_supervisors" && (
        <div className="space-y-6">
          {/* Supervisor Filters */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search supervisor name, area, shift, or remarks..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500">
                {supervisorRecords.length} Field Records Found
              </span>
            </div>
          </div>

          {/* Supervisor Records Grid or Empty State */}
          {supervisorLoading ? (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin text-emerald-600 mx-auto" />
              <h3 className="text-sm font-extrabold text-slate-900">Loading Field Supervisor Attendance...</h3>
            </div>
          ) : supervisorRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supervisorRecords.map((rec) => {
                const name = rec.supervisor_name || rec.username || `Supervisor ${rec.supervisor_id || "--"}`;
                const timeIn = rec.time_in || "--";
                const shiftLabel = rec.shift || "Standard Shift";
                const areaLabel = rec.location_name || (rec.area ? `Area ${rec.area}` : "Field Operations");
                const status = rec.status || "Present";
                const photoProof = rec.photo_url;

                return (
                  <div
                    key={rec.id || `${rec.supervisor_id}_${rec.attendance_date}`}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-2xs hover:border-slate-300 transition space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">{name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{areaLabel} • {shiftLabel}</p>
                        <p className="text-[11px] font-bold text-emerald-700 mt-1">Time In: {timeIn}</p>
                      </div>

                      {photoProof && (
                        <button
                          type="button"
                          onClick={() => setPreviewPhoto({ url: photoProof, name, date: rec.attendance_date })}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 cursor-pointer"
                        >
                          <ImageIcon size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
              <Calendar size={36} className="mx-auto text-slate-300" />
              <h3 className="text-base font-extrabold text-slate-800">
                No Supervisor Attendance Records for {selectedDate}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                There are currently no field supervisor check-in logs submitted for this date.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MODALS & LIGHTBOXES                                       */}
      {/* ============================================================ */}

      {/* Modal 1: Log HR Daily Work Accomplishment */}
      <LogHRAccomplishmentModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSuccess={(newLog) => {
          setNotice({ type: "success", text: `Accomplishment logged successfully: "${newLog.title}"` });
          setTimeout(() => setNotice(null), 3500);
          loadHRData(selectedDate);
        }}
        hrOfficers={hrOfficers}
        currentProfile={currentProfile}
        isHRMD={isHRMD}
        selectedDate={selectedDate}
      />

      {/* Modal 2: Attendance Punch Modal */}
      <HRAttendancePunchModal
        isOpen={isPunchModalOpen}
        onClose={() => setIsPunchModalOpen(false)}
        onSuccess={(rec) => {
          setNotice({ type: "success", text: `Attendance updated: ${rec.name} marked as ${rec.status}.` });
          setTimeout(() => setNotice(null), 3500);
          loadHRData(selectedDate);
        }}
        hrOfficers={hrOfficers}
        currentProfile={currentProfile}
        isHRMD={isHRMD}
        selectedDate={selectedDate}
        preSelectedHrEmail={preSelectedHrEmail}
      />

      {/* Lightbox for Supervisor Photo Proof */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-xs font-bold text-slate-900">{previewPhoto.name}</h4>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2 bg-slate-900 flex items-center justify-center max-h-[70vh] overflow-hidden">
              <img
                src={previewPhoto.url}
                alt="Supervisor attendance proof"
                className="max-h-[68vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
