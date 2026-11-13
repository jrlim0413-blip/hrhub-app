import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Calendar, Clock, Users, Building2, MapPin, Search,
  CheckCircle2, Filter, Printer, MessageSquare,
  ShieldCheck, AlertCircle, RefreshCw, Eye, X, Image as ImageIcon,
  ExternalLink, ChevronRight
} from "lucide-react";
import { supabase } from "../lib/supabase.js";
import {
  fetchCloudAttendance,
  subscribeToAttendanceRealtime
} from "../lib/supervisorAttendanceStorage.js";

function getTodayDateStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function ShiftAttendanceOverviewPanel({
  profiles = [],
  presenceMap = {},
  onOpenChat,
  onOpenWorkspaceTab
}) {
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Fetch live records from database for selected date
  const loadDatabaseAttendance = useCallback(async (dateStr) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error, isCloudAvailable } = await fetchCloudAttendance(dateStr);
      if (error && !isCloudAvailable) {
        setErrorMsg("Could not connect to attendance records. Retrying cloud link...");
      }
      if (Array.isArray(data)) {
        setRecords(data);
      } else {
        setRecords([]);
      }
      setLastRefreshedAt(new Date());
    } catch (err) {
      console.warn("Attendance load exception:", err);
      setErrorMsg("Failed to load attendance logs from database.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabaseAttendance(selectedDate);

    // Subscribe to live database changes for this date
    const unsubscribe = subscribeToAttendanceRealtime(selectedDate, (payload) => {
      if (!payload) return;
      // Refresh database records when insert/update/delete happens
      loadDatabaseAttendance(selectedDate);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [selectedDate, loadDatabaseAttendance]);

  // Unique areas dynamically derived strictly from live database records
  const dynamicAreas = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.area) set.add(String(r.area));
      if (r.location_name) set.add(String(r.location_name));
    });
    return Array.from(set);
  }, [records]);

  // Unique statuses dynamically derived from live database records
  const dynamicStatuses = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.status) set.add(String(r.status));
    });
    return Array.from(set);
  }, [records]);

  // Filter records based on active user filters
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const name = (rec.supervisor_name || rec.username || "").toLowerCase();
      const area = String(rec.area || "").toLowerCase();
      const loc = (rec.location_name || "").toLowerCase();
      const shift = (rec.shift || "").toLowerCase();
      const status = (rec.status || "").toLowerCase();
      const remarks = (rec.remarks || "").toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        name.includes(q) ||
        area.includes(q) ||
        loc.includes(q) ||
        shift.includes(q) ||
        remarks.includes(q);

      const matchesArea =
        selectedArea === "all" ||
        String(rec.area) === selectedArea ||
        rec.location_name === selectedArea;

      const matchesStatus =
        selectedStatus === "all" ||
        status === selectedStatus.toLowerCase();

      return matchesSearch && matchesArea && matchesStatus;
    });
  }, [records, searchQuery, selectedArea, selectedStatus]);

  // Live real metrics computed strictly from database records
  const stats = useMemo(() => {
    const totalLogs = records.length;
    const presentCount = records.filter(
      (r) =>
        (r.status || "").toLowerCase() === "present" ||
        (r.status || "").toLowerCase() === "on-duty" ||
        (r.status || "").toLowerCase() === "completed"
    ).length;
    const uniqueStations = new Set(
      records.map((r) => r.location_name || r.area).filter(Boolean)
    ).size;
    const withPhotoCount = records.filter((r) => Boolean(r.photo_url)).length;

    return {
      totalLogs,
      presentCount,
      uniqueStations,
      withPhotoCount
    };
  }, [records]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & REAL-TIME STATUS BAR */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-black tracking-tight mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Calendar size={13} className="text-emerald-600" />
              <span>LIVE CLOUD ATTENDANCE DATABASE</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Enterprise Shift & Attendance Roster
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Real-time attendance logs synchronized directly from on-duty supervisor check-ins, biometric time entries, and field operations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date Picker Input */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                title="Select attendance date to inspect"
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadDatabaseAttendance(selectedDate)}
              disabled={loading}
              title="Sync with cloud database"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin text-emerald-600" : ""} />
              <span>Sync</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              <Printer size={13} />
              <span>Print</span>
            </button>

            {/* Open Full Management Tab if prop provided */}
            {onOpenWorkspaceTab && (
              <button
                type="button"
                onClick={() => onOpenWorkspaceTab("supervisors_attendance")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 font-bold text-xs transition cursor-pointer shadow-xs"
              >
                <span>Full Audit Panel</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* METRICS ROW (Strictly calculated from real database records) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
          <div className="p-4 rounded-2xl bg-[#f2f5f7] border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Database Records</span>
              <Users size={15} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.totalLogs}</div>
            <div className="text-[10px] text-slate-500 font-semibold mt-1">
              Logs for {selectedDate}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f2f5f7] border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Present / On-Duty</span>
              <CheckCircle2 size={15} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{stats.presentCount}</div>
            <div className="text-[10px] text-slate-500 font-semibold mt-1">
              {stats.totalLogs > 0
                ? `${Math.round((stats.presentCount / stats.totalLogs) * 100)}% verified on-site`
                : "Awaiting check-in"}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f2f5f7] border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Active Stations</span>
              <Building2 size={15} className="text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{stats.uniqueStations}</div>
            <div className="text-[10px] text-slate-500 font-semibold mt-1">
              {stats.uniqueStations === 1 ? "1 Field Area" : `${stats.uniqueStations} Field Areas`}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#f2f5f7] border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
              <span>Cloud Status</span>
              <ShieldCheck size={15} className="text-purple-600" />
            </div>
            <div className="text-base font-black text-slate-900 truncate">
              {loading ? "Syncing..." : "Connected"}
            </div>
            <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {lastRefreshedAt ? `Synced ${lastRefreshedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Live Feed"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTERS & SEARCH */}
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

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Dynamic Area Filter */}
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Recorded Areas ({dynamicAreas.length})</option>
            {dynamicAreas.map((area) => (
              <option key={area} value={area}>
                {area.startsWith("Area") ? area : `Area ${area}`}
              </option>
            ))}
          </select>

          {/* Dynamic Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Statuses</option>
            {dynamicStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. ERROR MESSAGE BANNER (if any) */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-amber-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => loadDatabaseAttendance(selectedDate)}
            className="text-xs font-black underline hover:text-amber-900 cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* 4. REAL ATTENDANCE RECORDS GRID */}
      {loading && records.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
          <RefreshCw size={28} className="animate-spin text-emerald-600 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-900">Loading Database Attendance Records...</h3>
          <p className="text-xs text-slate-400">Fetching live shift logs from cloud database table for {selectedDate}.</p>
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((rec) => {
            const name = rec.supervisor_name || rec.username || `Supervisor ${rec.supervisor_id || "--"}`;
            const timeIn = rec.time_in || "--";
            const shiftLabel = rec.shift || "Standard Shift";
            const areaLabel = rec.location_name || (rec.area ? `Area ${rec.area}` : "Field Operations");
            const status = rec.status || "Present";
            const remarks = rec.remarks;
            const photoProof = rec.photo_url;

            const isPresent =
              status.toLowerCase() === "present" ||
              status.toLowerCase() === "on-duty" ||
              status.toLowerCase() === "completed";

            const initials = name
              .split(" ")
              .filter(Boolean)
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "SP";

            return (
              <div
                key={rec.id || `${rec.supervisor_id}_${rec.attendance_date}`}
                className="bg-white rounded-2xl border border-slate-200/90 p-4.5 shadow-xs hover:border-slate-300 transition flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-900 text-emerald-400 font-bold text-sm flex items-center justify-center shadow-xs">
                        {initials}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                          isPresent ? "bg-emerald-500" : "bg-amber-400"
                        }`}
                        title={status}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-sm truncate">
                          {name}
                        </h3>
                        {rec.supervisor_id && (
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            ID #{rec.supervisor_id}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 truncate">
                          <MapPin size={12} className="text-emerald-600 shrink-0" />
                          {areaLabel}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-500">
                          {shiftLabel}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black">
                          <Clock size={11} className="text-emerald-600" />
                          Time In: {timeIn}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black ${
                            isPresent
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {status}
                        </span>
                        {photoProof && (
                          <button
                            type="button"
                            onClick={() => setPreviewPhoto({ url: photoProof, name, date: rec.attendance_date })}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-bold border border-blue-200 cursor-pointer transition"
                            title="View attendance photo proof"
                          >
                            <ImageIcon size={11} />
                            <span>Photo Proof</span>
                          </button>
                        )}
                      </div>

                      {remarks && (
                        <p className="mt-2 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 rounded-lg p-2 italic leading-relaxed">
                          &ldquo;{remarks}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {onOpenChat && (
                    <button
                      type="button"
                      onClick={() => onOpenChat({ name, email: rec.username || "" })}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition cursor-pointer shrink-0"
                      title={`Message ${name}`}
                    >
                      <MessageSquare size={16} />
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>Date: {rec.attendance_date || selectedDate}</span>
                  {rec.created_at && (
                    <span>Logged {new Date(rec.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 5. HONEST DATABASE EMPTY STATE */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-12 text-center space-y-3">
          <Calendar size={36} className="mx-auto text-slate-300" />
          <h3 className="text-base font-extrabold text-slate-800">
            No Attendance Records Found for {selectedDate}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            There are currently no attendance entries recorded in the cloud database for this date. Check-in logs submitted by on-duty supervisors or field personnel will automatically appear here in real-time.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate(getTodayDateStr())}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Go to Today
            </button>
            <button
              type="button"
              onClick={() => loadDatabaseAttendance(selectedDate)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 text-xs font-bold transition cursor-pointer"
            >
              Refresh Cloud Data
            </button>
          </div>
        </div>
      )}

      {/* 6. PHOTO PROOF LIGHTBOX MODAL */}
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
              <div>
                <h4 className="text-xs font-bold text-slate-900">{previewPhoto.name}</h4>
                <p className="text-[10px] text-slate-500">Attendance Photo • {previewPhoto.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
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
            <div className="p-3 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
