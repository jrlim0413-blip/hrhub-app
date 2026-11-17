import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Calendar, Clock, Building2, User, Search, Plus, Printer,
  RefreshCw, CheckCircle2, AlertCircle, Trash2, X, ChevronLeft,
  ChevronRight, ShieldCheck, Briefcase, FileText, Tag,
  TrendingUp, UserCheck, CheckCircle, ArrowUpRight
} from "lucide-react";
import {
  HEAD_OFFICE,
  ALL_SUBSIDIARIES,
  ENTITY_METADATA,
  matchesCompanyEntity
} from "../lib/companyEntities.js";
import {
  fetchAllWorkLogs,
  addWorkLogEntry,
  deleteWorkLogEntry,
  subscribeToWorkLogsLive,
  getTodayDateStr,
  formatDateToMMDDYYYY,
  calculateHoursWorked,
  HR_WORK_CATEGORIES,
  isHRMDUser
} from "../lib/hrWorkLogsStorage.js";

// Helper to get formatted current time e.g. "09:30 AM"
function getCurrentFormattedTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const meridian = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${meridian}`;
}

export default function ShiftAttendanceOverviewPanel({
  currentProfile = null,
  currentUser = null,
  isHRMD = true,
  onOpenChat,
  onOpenWorkspaceTab
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr);
  const [selectedSubsidiary, setSelectedSubsidiary] = useState(() => {
    if (!isHRMD && currentProfile?.company) return currentProfile.company;
    return "all";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedHrEmail, setSelectedHrEmail] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [notice, setNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Work Log Entry Form State
  const [newEntry, setNewEntry] = useState({
    taskProject: "",
    category: "Shift Attendance & Station Check-in",
    startTime: "08:00 AM",
    endTime: getCurrentFormattedTime(),
    progressComments: "",
    status: "Completed",
    authorName: currentProfile?.name || currentUser?.name || "HR Officer",
    authorEmail: currentProfile?.email || currentUser?.email || "admin@hrhub.com",
    authorRole: currentProfile?.role || currentUser?.role || "HR Administrator",
    company: currentProfile?.company || currentUser?.company || HEAD_OFFICE,
    branch: currentProfile?.branch || currentUser?.branch || "Head Office (SGC)"
  });

  // Sync profile when currentProfile changes
  useEffect(() => {
    if (currentProfile || currentUser) {
      setNewEntry((prev) => ({
        ...prev,
        authorName: currentProfile?.name || currentUser?.name || prev.authorName,
        authorEmail: currentProfile?.email || currentUser?.email || prev.authorEmail,
        authorRole: currentProfile?.role || currentUser?.role || prev.authorRole,
        company: currentProfile?.company || currentUser?.company || prev.company,
        branch: currentProfile?.branch || currentUser?.branch || prev.branch
      }));
      if (!isHRMD && (currentProfile?.company || currentUser?.company)) {
        setSelectedSubsidiary(currentProfile?.company || currentUser?.company);
      }
    }
  }, [currentProfile, currentUser, isHRMD]);

  const tabsScrollRef = useRef(null);

  const scrollTabs = (direction) => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({
        left: direction === "left" ? -200 : 200,
        behavior: "smooth"
      });
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllWorkLogs();
    setLogs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToWorkLogsLive(() => {
      loadData();
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [loadData]);

  // Unique HR Officers in logs (strictly excluding HRMD monitoring accounts)
  const hrOfficersList = useMemo(() => {
    const map = new Map();
    logs.forEach((l) => {
      if (l.authorEmail && !isHRMDUser(l)) {
        map.set(l.authorEmail.toLowerCase(), {
          name: l.authorName || l.authorEmail.split("@")[0],
          email: l.authorEmail,
          role: l.authorRole,
          company: l.company
        });
      }
    });
    return Array.from(map.values());
  }, [logs]);

  // Date-filtered logs for synchronized subsidiary counters and metrics (excluding HRMD)
  const dateLogs = useMemo(() => {
    return logs.filter((l) => (!selectedDate || l.date === selectedDate) && !isHRMDUser(l));
  }, [logs, selectedDate]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return dateLogs.filter((l) => {
      if (selectedSubsidiary !== "all") {
        if (!matchesCompanyEntity(l.company, selectedSubsidiary)) return false;
      }
      if (selectedCategory !== "all") {
        const itemCat = (l.category === "General HR Admin" || !l.category || (l.taskProject || "").toLowerCase().includes("shift login") || (l.taskProject || "").toLowerCase().includes("check-in") || (l.taskProject || "").toLowerCase().includes("station portal"))
          ? "Shift Attendance & Station Check-in"
          : (l.category || "Corporate Policy & Administrative");
        if (itemCat !== selectedCategory) return false;
      }
      if (selectedStatus !== "all") {
        const isItemInProgress =
          l.status === "In Progress" ||
          l.status === "Ongoing" ||
          l.status === "in_progress" ||
          l.endTime === "Active";
        if (selectedStatus === "in progress" && !isItemInProgress) return false;
        if (selectedStatus === "completed" && isItemInProgress) return false;
        if (selectedStatus !== "in progress" && selectedStatus !== "completed") {
          if ((l.status || "").toLowerCase() !== selectedStatus.toLowerCase()) return false;
        }
      }
      if (selectedHrEmail !== "all") {
        if ((l.authorEmail || "").toLowerCase() !== selectedHrEmail.toLowerCase()) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const taskMatch = (l.taskProject || "").toLowerCase().includes(q);
        const commMatch = (l.progressComments || "").toLowerCase().includes(q);
        const nameMatch = (l.authorName || "").toLowerCase().includes(q);
        const compMatch = (l.company || "").toLowerCase().includes(q);
        const effectiveCat = (l.category === "General HR Admin" || !l.category || (l.taskProject || "").toLowerCase().includes("shift login") || (l.taskProject || "").toLowerCase().includes("check-in") || (l.taskProject || "").toLowerCase().includes("station portal"))
          ? "Shift Attendance & Station Check-in"
          : (l.category || "Corporate Policy & Administrative");
        const catMatch = effectiveCat.toLowerCase().includes(q);
        if (!taskMatch && !commMatch && !nameMatch && !compMatch && !catMatch) return false;
      }
      return true;
    });
  }, [dateLogs, selectedSubsidiary, selectedCategory, selectedStatus, selectedHrEmail, searchQuery]);

  // Live Executive KPI Metrics
  const stats = useMemo(() => {
    const totalEntries = dateLogs.length;

    let totalMinutes = 0;
    const activeOfficersSet = new Set();
    const activeEntitiesSet = new Set();

    dateLogs.forEach((l) => {
      if (l.numericHours) {
        totalMinutes += l.numericHours * 60;
      } else if (l.startTime && l.endTime && l.endTime !== "Active") {
        const dur = calculateHoursWorked(l.startTime, l.endTime);
        totalMinutes += dur.numericHours * 60;
      }
      if (l.authorEmail) activeOfficersSet.add(l.authorEmail.toLowerCase());
      if (l.company) activeEntitiesSet.add(l.company);
    });

    const totalHours = totalMinutes / 60;
    const formattedTotalHours = totalHours % 1 === 0 ? `${totalHours} hrs` : `${totalHours.toFixed(1)} hrs`;
    const activeOfficersCount = activeOfficersSet.size;
    const activeEntitiesCount = activeEntitiesSet.size;

    return {
      totalEntries,
      formattedTotalHours,
      activeOfficersCount,
      activeEntitiesCount
    };
  }, [dateLogs]);

  // Calculate live modal hours preview
  const modalDuration = useMemo(() => {
    return calculateHoursWorked(newEntry.startTime, newEntry.endTime);
  }, [newEntry.startTime, newEntry.endTime]);

  // Handle Add Work Log Submit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!newEntry.taskProject.trim()) return;

    setIsSubmitting(true);
    const res = await addWorkLogEntry({
      ...newEntry,
      date: selectedDate
    });
    setIsSubmitting(false);

    if (res.success) {
      setNotice("HR daily work log recorded in database.");
      setTimeout(() => setNotice(null), 3000);
      setIsAddModalOpen(false);
      setNewEntry((prev) => ({
        ...prev,
        taskProject: "",
        progressComments: "",
        startTime: getCurrentFormattedTime(),
        endTime: getCurrentFormattedTime()
      }));
      loadData();
    } else {
      alert("Failed to save log entry: " + (res.error || "Unknown error"));
    }
  };

  // Handle Delete Entry
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this work log record?")) return;
    await deleteWorkLogEntry(id);
    loadData();
  };

  // Print Executive Summary
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-3 antialiased text-slate-800">
      {/* 1. EXECUTIVE COMPACT HEADER & CONTROL BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold tracking-tight">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <ShieldCheck size={11} className="text-emerald-600" />
                <span>ENTERPRISE HR WORK LOG AUDIT</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Multi-Entity Governance
              </span>
              {!isHRMD && currentProfile?.company && (
                <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Building2 size={10} className="text-blue-600" />
                  <span>{currentProfile.company}</span>
                </span>
              )}
            </div>

            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              Enterprise HR Daily Work Logs & Shift Timesheets
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xl leading-normal truncate">
              Live telemetry and activity audit captured from actual operational tasks across assigned subsidiaries.
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {/* Date Picker */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
              <Calendar size={13} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-[11px] font-semibold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateStr())}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
            >
              Today
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer"
              title="Refresh live cloud records"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-emerald-600" : ""} />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition cursor-pointer"
            >
              <Printer size={12} className="text-slate-500" />
              <span>Print DTR</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition cursor-pointer shadow-2xs active:scale-95"
            >
              <Plus size={13} className="text-emerald-400" />
              <span>+ Log Task</span>
            </button>
          </div>
        </div>

        {/* Notice Toast */}
        {notice && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {/* 2. COMPACT STREAMLINED STAT CHIPS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-0.5">
          <div className="bg-slate-50/70 rounded-xl border border-slate-200/60 px-3 py-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Daily Log Entries</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-slate-900 font-mono">{stats.totalEntries}</span>
                <span className="text-[10px] text-slate-400 font-medium">tasks ({formatDateToMMDDYYYY(selectedDate)})</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-500 shadow-2xs">
              <FileText size={13} />
            </div>
          </div>

          <div className="bg-slate-50/70 rounded-xl border border-slate-200/60 px-3 py-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Hours Rendered</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-emerald-600 font-mono">{stats.formattedTotalHours}</span>
                <span className="text-[10px] text-slate-400 font-medium">cumulative</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Clock size={13} />
            </div>
          </div>

          <div className="bg-slate-50/70 rounded-xl border border-slate-200/60 px-3 py-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Active HR Officers</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-slate-900 font-mono">{stats.activeOfficersCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">reported</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-blue-600 shadow-2xs">
              <UserCheck size={13} />
            </div>
          </div>

          <div className="bg-slate-50/70 rounded-xl border border-slate-200/60 px-3 py-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Entity Coverage</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-slate-900 font-mono">{stats.activeEntitiesCount}</span>
                <span className="text-[10px] text-slate-400 font-medium">of {ALL_SUBSIDIARIES.length + 1} entities</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-purple-600 shadow-2xs">
              <Building2 size={13} />
            </div>
          </div>
        </div>

        {/* 3. SLEEK SUBSIDIARY PILLS SELECTOR (For HRMD) */}
        {isHRMD && (
          <div className="flex items-center justify-between gap-1 overflow-hidden pt-0.5">
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
              title="Scroll left"
            >
              <ChevronLeft size={12} />
            </button>

            <div
              ref={tabsScrollRef}
              className="flex-1 flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-0.5 scroll-smooth"
            >
              <button
                type="button"
                onClick={() => setSelectedSubsidiary("all")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shadow-2xs shrink-0 ${
                  selectedSubsidiary === "all"
                    ? "bg-slate-900 text-white shadow-xs ring-1 ring-emerald-500"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                All Subsidiaries ({dateLogs.length})
              </button>

              {ALL_SUBSIDIARIES.map((comp) => {
                const meta = ENTITY_METADATA[comp] || {};
                const isSelected = selectedSubsidiary === comp;
                const count = dateLogs.filter((l) => matchesCompanyEntity(l.company, comp)).length;

                return (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => setSelectedSubsidiary(comp)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer whitespace-nowrap shadow-2xs shrink-0 ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-xs ring-1 ring-emerald-500"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {meta.logoUrl ? (
                      <img src={meta.logoUrl} alt={meta.shortName} className="w-3 h-3 rounded object-contain" />
                    ) : (
                      <Building2 size={11} className={isSelected ? "text-emerald-400" : "text-slate-400"} />
                    )}
                    <span>{meta.shortName || comp}</span>
                    <span className="text-[9px] px-1 py-0.1 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => scrollTabs("right")}
              className="w-6 h-6 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
              title="Scroll right"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        )}

        {/* 4. CLEAN SINGLE-LINE SEARCH & FILTER BAR */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-0.5">
          <div className="relative flex-1 w-full">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search task, comments, HR..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 flex-wrap">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">📁 All Categories</option>
              {HR_WORK_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.label}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">⚡ All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in progress">In Progress</option>
              <option value="under review">Under Review</option>
            </select>

            {/* HR Officer Filter (For HRMD) */}
            {isHRMD && (
              <select
                value={selectedHrEmail}
                onChange={(e) => setSelectedHrEmail(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer max-w-[150px]"
              >
                <option value="all">👥 All HR ({hrOfficersList.length})</option>
                {hrOfficersList.map((hr) => (
                  <option key={hr.email} value={hr.email}>
                    {hr.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. OFFICIAL HR WORK LOG AUDIT TABLE (SHARP & MINIMAL)         */}
      {/* ============================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <h2 className="text-xs font-bold text-slate-900 tracking-tight">
              Official Activity Timesheet Roster
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">
              • {filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"} on {formatDateToMMDDYYYY(selectedDate)}
            </span>
          </div>

          <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            Cloud Synchronized
          </span>
        </div>

        {/* Tabular Roster Grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider select-none">
                <th className="py-2 px-3 w-[11%]">Date</th>
                <th className="py-2 px-3 w-[25%]">Task / Project</th>
                <th className="py-2 px-3 w-[16%]">Category</th>
                <th className="py-2 px-3 w-[13%] text-center">Time & Duration</th>
                <th className="py-2 px-3 w-[10%] text-center">Status</th>
                <th className="py-2 px-3 w-[20%]">Accomplishments & Notes</th>
                <th className="py-2 px-3 w-[5%] text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <RefreshCw size={20} className="animate-spin text-emerald-600 mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-slate-600">Retrieving live records...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <FileText size={32} className="mx-auto text-slate-300 mb-1.5" />
                    <h3 className="text-xs font-bold text-slate-800">No HR Work Logs Found</h3>
                    <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-0.5">
                      No activity logs recorded for {formatDateToMMDDYYYY(selectedDate)}.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Plus size={13} className="text-emerald-400" />
                      <span>Log HR Task</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((item) => {
                  const statusLower = (item.status || "completed").toLowerCase();
                  const statusBadgeClass =
                    statusLower === "completed"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : statusLower === "in progress"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200";

                  const formattedDate = formatDateToMMDDYYYY(item.date);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/70 transition-colors duration-150 group border-b border-slate-100"
                    >
                      {/* 1. Date */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {formattedDate}
                      </td>

                      {/* 2. Task / Project & Officer Info */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs block leading-snug">
                              {item.taskProject}
                            </span>
                            {item.isAutoLogged && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ⚡ System Telemetry
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-700">{item.authorName}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{item.company}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Category */}
                      <td className="py-2.5 px-3">
                        {(() => {
                          const catName = (item.category === "General HR Admin" || !item.category || (item.taskProject || "").toLowerCase().includes("shift login") || (item.taskProject || "").toLowerCase().includes("check-in") || (item.taskProject || "").toLowerCase().includes("station portal"))
                            ? "Shift Attendance & Station Check-in"
                            : (item.category || "Corporate Policy & Administrative");
                          const catObj = HR_WORK_CATEGORIES.find(c => c.label.toLowerCase() === catName.toLowerCase()) || {
                            color: "bg-teal-50 text-teal-800 border-teal-200"
                          };
                          return (
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold border leading-tight ${catObj.color || "bg-teal-50 text-teal-800 border-teal-200"}`}>
                              {catName}
                            </span>
                          );
                        })()}
                      </td>

                      {/* 4. Time & Duration */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-slate-600 font-mono text-[10px]">
                            {item.startTime} – {item.endTime === "Active" ? "Active" : item.endTime}
                          </div>
                          {item.status === "In Progress" || item.status === "Ongoing" || item.endTime === "Active" ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>Active Now</span>
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {item.hoursWorked || "--"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {item.status === "In Progress" || item.status === "Ongoing" || item.endTime === "Active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            <span>IN PROGRESS</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            <span>COMPLETED</span>
                          </span>
                        )}
                      </td>

                      {/* 6. Accomplishments & Progress */}
                      <td className="py-2.5 px-3 text-slate-600 text-[11px] leading-snug">
                        <p className="line-clamp-2" title={item.progressComments}>
                          {item.progressComments || <span className="text-slate-400 italic">No notes recorded</span>}
                        </p>
                      </td>

                      {/* 7. Action */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {(isHRMD || item.authorEmail === currentProfile?.email) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Delete log entry"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-700">Audit Status:</span>
            <span>All actions timestamped for HRMD review.</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Logged Total:</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-200">
              {stats.formattedTotalHours}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. MODAL: RECORD HR WORK ACTIVITY (CLEAN & SHARP)            */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-2xs flex items-start justify-center p-3 pt-6 sm:pt-10 overflow-y-auto animate-in fade-in"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-xl border border-slate-200 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Record HR Work Activity</h3>
                <p className="text-[10px] text-slate-400">Log an operational task or offline branch activity.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 space-y-3">
              {/* Officer Card */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 font-bold block text-[9px] uppercase">Logged By</span>
                  <span className="font-bold text-slate-900 text-xs">{newEntry.authorName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold block text-[9px] uppercase">Company Entity</span>
                  <span className="font-bold text-slate-900 text-xs">{newEntry.company}</span>
                </div>
              </div>

              {/* Task/Project Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Task / Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newEntry.taskProject}
                  onChange={(e) => setNewEntry({ ...newEntry, taskProject: e.target.value })}
                  placeholder="e.g. Branch Spot Inspection, Face-to-face Hearing"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Functional Area / Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Functional Category
                </label>
                <select
                  value={newEntry.category}
                  onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
                >
                  {HR_WORK_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.label}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Time with 'Now' buttons */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">Start Time</label>
                    <button
                      type="button"
                      onClick={() => setNewEntry({ ...newEntry, startTime: getCurrentFormattedTime() })}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Now
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newEntry.startTime}
                    onChange={(e) => setNewEntry({ ...newEntry, startTime: e.target.value })}
                    placeholder="8:00 AM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700">End Time</label>
                    <button
                      type="button"
                      onClick={() => setNewEntry({ ...newEntry, endTime: getCurrentFormattedTime() })}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Now
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newEntry.endTime}
                    onChange={(e) => setNewEntry({ ...newEntry, endTime: e.target.value })}
                    placeholder="5:00 PM"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Duration Preview */}
              <div className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-emerald-900 font-bold">
                <span className="flex items-center gap-1 text-[11px]">
                  <Clock size={12} className="text-emerald-700" />
                  <span>Duration:</span>
                </span>
                <span className="font-mono text-xs">{modalDuration.formatted}</span>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Status</label>
                <div className="flex items-center gap-1.5">
                  {["Completed", "In Progress", "Under Review"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewEntry({ ...newEntry, status: st })}
                      className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                        newEntry.status === st
                          ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress & Comments */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Accomplishments / Notes
                </label>
                <textarea
                  rows={2}
                  value={newEntry.progressComments}
                  onChange={(e) => setNewEntry({ ...newEntry, progressComments: e.target.value })}
                  placeholder="Detail findings, personnel involved, or outcome..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
                />
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50 flex items-center gap-1"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={12} className="animate-spin text-emerald-400" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Task</span>
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
