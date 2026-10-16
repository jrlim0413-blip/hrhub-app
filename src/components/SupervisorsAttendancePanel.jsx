import { useState, useEffect, useMemo, useRef } from "react";
import {
  Users, UserCheck, Clock, Calendar, Search, Filter,
  Download, Printer, RefreshCw, CheckCircle2, AlertTriangle,
  XCircle, Briefcase, Edit3, Save, X, Plus, MapPin,
  ChevronLeft, ChevronRight, ShieldCheck, TrendingUp,
  AlertCircle, Eye, Check, Camera, Smartphone,
  ExternalLink, Navigation, LocateFixed, Upload,
  Map, Layers, Shield
} from "lucide-react";
import { API_CONFIG } from "../config/apiConfig";

// Fallback active supervisors (matching live STL Mandaue API IDs 21 to 32)
const FALLBACK_SUPERVISORS = [
  { id: 21, fullName: "ARLFRED SABERON", area: "5", username: "asaberon", isActive: 1 },
  { id: 22, fullName: "RAFFY BAGUIO", area: "5", username: "rbaguio", isActive: 1 },
  { id: 23, fullName: "ROEL CATALAN", area: "5", username: "rcatalan", isActive: 1 },
  { id: 24, fullName: "MICHAEL DE GUZMAN", area: "5", username: "mdeguzman", isActive: 1 },
  { id: 25, fullName: "JOEL ESTORCO", area: "5", username: "jestorco", isActive: 1 },
  { id: 26, fullName: "HARRY EYA", area: "5", username: "heya", isActive: 1 },
  { id: 27, fullName: "CARL MANGRUBAN", area: "5", username: "cmangruban", isActive: 1 },
  { id: 28, fullName: "JED MELENDREZ", area: "5", username: "jmelendrez", isActive: 1 },
  { id: 29, fullName: "NYOR SESALDO", area: "5", username: "nsesaldo", isActive: 1 },
  { id: 30, fullName: "NARCISO TAGUD JR.", area: "5", username: "ntagud", isActive: 1 },
  { id: 31, fullName: "MOLLY BATUBALANOS", area: "5", username: "mbatubalanos", isActive: 1 },
  { id: 32, fullName: "COORDINATOR - APPLEGROUP", area: "5", username: "applegroup", isActive: 1 }
];

// Areas filter reference
const AREAS = [
  { id: "all", label: "All Sectors" },
  { id: "1", label: "Area 1 - Subangdaku / SIMCON" },
  { id: "2", label: "Area 2 - Centro & Cabancalan" },
  { id: "3", label: "Area 3 - Basak & Canduman" },
  { id: "4", label: "Area 4 - Tipolo & Guiso" },
  { id: "5", label: "Area 5 - Mandaue Central" }
];

// Shift slots for STL operations
const SHIFTS = [
  "Morning Draw (06:00 AM - 02:30 PM)",
  "Afternoon Draw (01:00 PM - 09:30 PM)",
  "Night Cutoff & Reconciliation (04:00 PM - 11:30 PM)",
  "Full Day Field Operations (07:00 AM - 05:00 PM)"
];

// Helper to format ISO date to YYYY-MM-DD
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SupervisorsAttendancePanel({ onClose }) {
  const [selectedDate, setSelectedDate] = useState(getTodayString);
  const [supervisorsList, setSupervisorsList] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'cards'
  
  // Viewing Agents Modal State (view tellers under a supervisor)
  const [viewingSupervisorAgents, setViewingSupervisorAgents] = useState(null);

  // Photo & Geo Verification Modal State
  const [viewingPhotoRecord, setViewingPhotoRecord] = useState(null);

  // Mobile App Check-In Simulator Modal State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simSupervisorId, setSimSupervisorId] = useState("");
  const [simLat, setSimLat] = useState("");
  const [simLng, setSimLng] = useState("");
  const [simLocationName, setSimLocationName] = useState("");
  const [simPhotoUrl, setSimPhotoUrl] = useState("");
  const [isGettingGps, setIsGettingGps] = useState(false);
  const fileInputRef = useRef(null);

  // Edit DTR Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editFormData, setEditFormData] = useState({
    status: "Present",
    timeIn: "",
    latitude: "",
    longitude: "",
    locationName: "",
    photoProof: "",
    shift: "",
    area: "",
    remarks: ""
  });

  // Toast alert
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3500);
  };

  // 1. Fetch Real Supervisors AND Real Agents from Live Database APIs
  const fetchLiveData = async () => {
    setLoading(true);

    try {
      const token = API_CONFIG.AGENTS_TOKEN;
      const headers = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Parallel fetch from both Live APIs
      const [spvrRes, agentsRes] = await Promise.all([
        fetch(API_CONFIG.SUPERVISOR_URL, { headers }),
        fetch(API_CONFIG.AGENTS_URL, { headers })
      ]);

      let spvrs = [];
      if (spvrRes.ok) {
        const payload = await spvrRes.json();
        spvrs = Array.isArray(payload) ? payload : (payload.data || payload.supervisors || payload.results || []);
      }

      let agents = [];
      if (agentsRes.ok) {
        const payload = await agentsRes.json();
        agents = Array.isArray(payload) ? payload : (payload.data || payload.agents || payload.results || []);
      }

      // Filter: Keep active supervisors only (Remove IDs 13 to 20, remove test supervisors)
      spvrs = spvrs.filter((s) => {
        const id = Number(s.id);
        if (id >= 13 && id <= 20) return false;
        const name = String(s.fullName || s.username || "").toLowerCase();
        if (name.includes("test spvr") || name.includes("test supervisor") || name.startsWith("spvr")) return false;
        return true;
      });

      if (spvrs.length === 0) spvrs = FALLBACK_SUPERVISORS;

      setSupervisorsList(spvrs);
      setAgentsList(agents);
      if (spvrs.length > 0 && !simSupervisorId) {
        setSimSupervisorId(String(spvrs[0].id));
      }
    } catch (err) {
      console.warn("Unable to fetch live database, using cached supervisor data:", err.message);
      setSupervisorsList(FALLBACK_SUPERVISORS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  // 2. Compute Real Agent Counts Per Supervisor from API Data
  const agentStatsBySupervisor = useMemo(() => {
    const map = {};
    supervisorsList.forEach((s) => {
      map[String(s.id)] = {
        total: 0,
        active: 0,
        inactive: 0,
        agents: []
      };
    });

    agentsList.forEach((agent) => {
      const spvrId = String(agent.supervisor || agent.supervisor_id || agent.supervisorId || "");
      if (spvrId && map[spvrId]) {
        map[spvrId].total += 1;
        if (agent.isActive === 1 || agent.isActive === true || agent.status === "active") {
          map[spvrId].active += 1;
        } else {
          map[spvrId].inactive += 1;
        }
        map[spvrId].agents.push(agent);
      }
    });

    return map;
  }, [supervisorsList, agentsList]);

  // 3. Load or Initialize Attendance Records for Selected Date
  useEffect(() => {
    if (supervisorsList.length === 0) return;

    const storageKey = `hrhub_spvr_attendance_v3_${selectedDate}`;
    const cached = localStorage.getItem(storageKey);

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any obsolete records
          const valid = parsed.filter((r) => {
            const id = Number(r.supervisorId);
            return !(id >= 13 && id <= 20) && !String(r.fullName).startsWith("SPVR ");
          });
          if (valid.length > 0) {
            setAttendanceRecords(valid);
            return;
          }
        }
      } catch {}
    }

    // Initialize clean attendance records from real API data
    const initialRecords = supervisorsList.map((spvr, index) => {
      return {
        supervisorId: spvr.id,
        fullName: spvr.fullName || spvr.username || `Supervisor ${spvr.id}`,
        username: spvr.username || `spvr_${spvr.id}`,
        area: String(spvr.area || "5"),
        status: "Awaiting Check-in",
        timeIn: "--",
        latitude: null,
        longitude: null,
        locationName: "",
        photoProof: null,
        shift: SHIFTS[index % SHIFTS.length],
        remarks: "Pending field mobile check-in",
        lastUpdated: ""
      };
    });

    setAttendanceRecords(initialRecords);
    try {
      localStorage.setItem(storageKey, JSON.stringify(initialRecords));
    } catch {}
  }, [selectedDate, supervisorsList]);

  // Save current records to localStorage
  const saveRecordsToStorage = (updated) => {
    setAttendanceRecords(updated);
    try {
      const storageKey = `hrhub_spvr_attendance_v3_${selectedDate}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (err) {
      console.error("Failed to persist supervisor attendance:", err);
    }
  };

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const cur = new Date(selectedDate + "T00:00:00");
    cur.setDate(cur.getDate() - 1);
    setSelectedDate(cur.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const cur = new Date(selectedDate + "T00:00:00");
    cur.setDate(cur.getDate() + 1);
    setSelectedDate(cur.toISOString().split("T")[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayString());
  };

  // Quick Status Toggle for a Supervisor
  const handleQuickStatusChange = (supervisorId, newStatus) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updated = attendanceRecords.map((rec) => {
      if (rec.supervisorId === supervisorId) {
        let timeIn = rec.timeIn;
        let remarks = rec.remarks;

        if (newStatus === "Present" && (timeIn === "--" || !timeIn)) {
          timeIn = nowTime;
          remarks = "Manual Time In recorded by Operations";
        } else if (newStatus === "Late") {
          timeIn = nowTime;
          remarks = "Clocked-in past shift schedule";
        } else if (newStatus === "Absent" || newStatus === "On Leave" || newStatus === "Day Off") {
          timeIn = "--";
          remarks = newStatus === "On Leave" ? "Filed leave of absence" : `${newStatus} status logged`;
        }

        return {
          ...rec,
          status: newStatus,
          timeIn,
          remarks,
          lastUpdated: nowTime
        };
      }
      return rec;
    });

    saveRecordsToStorage(updated);
    showToast(`Updated attendance status to ${newStatus}`);
  };

  // Clock In Now Timestamp
  const handleClockInNow = (supervisorId) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updated = attendanceRecords.map((rec) => {
      if (rec.supervisorId === supervisorId) {
        return {
          ...rec,
          status: "Present",
          timeIn: nowTime,
          remarks: `Time In confirmed at ${nowTime}`,
          lastUpdated: nowTime
        };
      }
      return rec;
    });
    saveRecordsToStorage(updated);
    showToast(`Time In recorded at ${nowTime}`);
  };

  // Batch: Mark All Active as Present
  const handleMarkAllPresent = () => {
    if (!window.confirm(`Mark all active supervisors as "Present" with Time In for ${selectedDate}?`)) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updated = attendanceRecords.map((rec) => ({
      ...rec,
      status: "Present",
      timeIn: rec.timeIn && rec.timeIn !== "--" ? rec.timeIn : "06:45 AM",
      remarks: "Batch confirmed Time In by Operations Lead",
      lastUpdated: nowTime
    }));

    saveRecordsToStorage(updated);
    showToast("All active supervisors marked as Present!");
  };

  // Grab Live GPS from Browser / Phone
  const handleGetBrowserGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser/device.");
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSimLat(pos.coords.latitude.toFixed(6));
        setSimLng(pos.coords.longitude.toFixed(6));
        setSimLocationName(`Device GPS Location (±${Math.round(pos.coords.accuracy)}m)`);
        setIsGettingGps(false);
        showToast("GPS Coordinates locked from device!");
      },
      (err) => {
        alert("Failed to retrieve GPS location: " + err.message);
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle Photo File Upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSimPhotoUrl(event.target.result);
      showToast("Real photo loaded from device!");
    };
    reader.readAsDataURL(file);
  };

  // Submit Mobile Check-In
  const handleSubmitMobileCheckin = (e) => {
    e.preventDefault();
    if (!simSupervisorId) return;

    const targetSpvr = supervisorsList.find((s) => String(s.id) === String(simSupervisorId));
    if (!targetSpvr) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const updated = attendanceRecords.map((rec) => {
      if (String(rec.supervisorId) === String(simSupervisorId)) {
        return {
          ...rec,
          status: "Present",
          timeIn: nowTime,
          latitude: simLat ? parseFloat(simLat) : null,
          longitude: simLng ? parseFloat(simLng) : null,
          locationName: simLocationName.trim() || (simLat ? "Mobile GPS Geo-tag" : ""),
          photoProof: simPhotoUrl || null,
          remarks: `Checked-in via Mobile Phone App at ${nowTime}`,
          lastUpdated: nowTime
        };
      }
      return rec;
    });

    saveRecordsToStorage(updated);
    setIsSimulatorOpen(false);
    setSimPhotoUrl("");
    setSimLat("");
    setSimLng("");
    setSimLocationName("");
    showToast(`📱 Mobile Time In recorded for ${targetSpvr.fullName}!`);
  };

  // Open Edit DTR Modal
  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditFormData({
      status: record.status || "Present",
      timeIn: record.timeIn === "--" ? "" : (record.timeIn || ""),
      latitude: record.latitude !== null && record.latitude !== undefined ? record.latitude : "",
      longitude: record.longitude !== null && record.longitude !== undefined ? record.longitude : "",
      locationName: record.locationName || "",
      photoProof: record.photoProof || "",
      shift: record.shift || SHIFTS[0],
      area: record.area || "5",
      remarks: record.remarks || ""
    });
  };

  // Save Edit DTR
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updated = attendanceRecords.map((rec) => {
      if (rec.supervisorId === editingRecord.supervisorId) {
        return {
          ...rec,
          status: editFormData.status,
          timeIn: editFormData.timeIn.trim() || "--",
          latitude: editFormData.latitude ? parseFloat(editFormData.latitude) : null,
          longitude: editFormData.longitude ? parseFloat(editFormData.longitude) : null,
          locationName: editFormData.locationName.trim(),
          shift: editFormData.shift,
          area: editFormData.area,
          remarks: editFormData.remarks.trim() || "Log verified & updated by HR",
          lastUpdated: nowTime
        };
      }
      return rec;
    });

    saveRecordsToStorage(updated);
    setEditingRecord(null);
    showToast(`DTR entry saved for ${editingRecord.fullName}`);
  };

  // Export CSV for Payroll
  const handleExportCSV = () => {
    if (attendanceRecords.length === 0) return;

    const headers = [
      "Date",
      "Supervisor ID",
      "Full Name",
      "Area",
      "Assigned Agents (Total)",
      "Assigned Agents (Active)",
      "Status",
      "Time In",
      "GPS Coordinates",
      "Location Landmark",
      "Shift Assigned",
      "Has Photo Proof",
      "Remarks"
    ];

    const rows = attendanceRecords.map((r) => {
      const spvrStats = agentStatsBySupervisor[String(r.supervisorId)] || { total: 0, active: 0 };
      const coords = r.latitude && r.longitude ? `${r.latitude}, ${r.longitude}` : "No GPS";
      const hasPhoto = r.photoProof ? "Yes" : "No";

      return [
        selectedDate,
        r.supervisorId,
        `"${r.fullName.replace(/"/g, '""')}"`,
        `"Area ${r.area}"`,
        spvrStats.total,
        spvrStats.active,
        r.status,
        r.timeIn,
        `"${coords}"`,
        `"${(r.locationName || "").replace(/"/g, '""')}"`,
        `"${(r.shift || "").replace(/"/g, '""')}"`,
        hasPhoto,
        `"${(r.remarks || "").replace(/"/g, '""')}"`
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Supervisors_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded attendance CSV file");
  };

  // Print Official DTR Sheet
  const handlePrint = () => {
    window.print();
  };

  // Computed Metrics
  const stats = useMemo(() => {
    const totalSupervisors = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === "Present").length;
    const late = attendanceRecords.filter((r) => r.status === "Late").length;
    const ob = attendanceRecords.filter((r) => r.status === "Official Business").length;
    const leave = attendanceRecords.filter((r) => r.status === "On Leave" || r.status === "Day Off").length;
    const pending = attendanceRecords.filter((r) => r.status === "Awaiting Check-in" || r.status === "Absent").length;
    const totalAgentsManaged = Object.values(agentStatsBySupervisor).reduce((acc, curr) => acc + curr.total, 0);

    return { totalSupervisors, totalAgentsManaged, present, late, ob, leave, pending };
  }, [attendanceRecords, agentStatsBySupervisor]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((r) => {
      const searchMatch =
        searchTerm === "" ||
        r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.supervisorId).includes(searchTerm) ||
        r.remarks.toLowerCase().includes(searchTerm.toLowerCase());

      let statusMatch = true;
      if (statusFilter !== "all") {
        if (statusFilter === "present") {
          statusMatch = r.status === "Present";
        } else if (statusFilter === "late") {
          statusMatch = r.status === "Late";
        } else if (statusFilter === "ob") {
          statusMatch = r.status === "Official Business";
        } else if (statusFilter === "leave") {
          statusMatch = r.status === "On Leave" || r.status === "Day Off";
        } else if (statusFilter === "pending") {
          statusMatch = r.status === "Awaiting Check-in" || r.status === "Absent";
        }
      }

      const areaMatch = areaFilter === "all" || String(r.area) === areaFilter;

      return searchMatch && statusMatch && areaMatch;
    });
  }, [attendanceRecords, searchTerm, statusFilter, areaFilter]);

  // Formatted date header
  const formattedDateTitle = useMemo(() => {
    try {
      const d = new Date(selectedDate + "T00:00:00");
      return d.toLocaleDateString("en-PH", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <div className="space-y-6 font-['Figtree','Inter',sans-serif]">
      {/* Toast Alert Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* ================= 1. HEADER & DATE CONTROLS ================= */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-[#008559] border border-emerald-200/60 uppercase tracking-wider">
                <ShieldCheck size={12} />
                Live Database • STL Mandaue API
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">
                {stats.totalSupervisors} Active Supervisors • {stats.totalAgentsManaged} Total Agents Managed
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <UserCheck className="text-[#008559]" size={28} />
              Supervisors Attendance
            </h1>
            <p className="text-xs md:text-sm text-slate-500 max-w-2xl">
              Live monitoring of Area Supervisors, exact Time In, number of agents handled, GPS location, and real photo check-in from their mobile devices.
            </p>
          </div>

          {/* Date Selector Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50/90 p-2 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition shadow-2xs cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={handleSetToday}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                selectedDate === getTodayString()
                  ? "bg-[#008559] text-white"
                  : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100"
              }`}
            >
              Today
            </button>

            <div className="relative flex items-center">
              <Calendar size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008559] transition shadow-2xs"
              />
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-100 text-slate-700 transition shadow-2xs cursor-pointer"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>

            {/* Re-sync Live API */}
            <button
              type="button"
              onClick={() => {
                setIsRefreshing(true);
                fetchLiveData().then(() => {
                  setIsRefreshing(false);
                  showToast("Re-synced with live database!");
                });
              }}
              className="p-2 rounded-xl bg-white border border-slate-200/80 hover:bg-emerald-50 hover:text-[#008559] text-slate-600 transition shadow-2xs cursor-pointer"
              title="Re-fetch from Database API"
            >
              <RefreshCw size={16} className={isRefreshing || loading ? "animate-spin text-[#008559]" : ""} />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Attendance Log for:</span>
            <strong className="text-slate-900 font-bold">{formattedDateTitle}</strong>
          </div>

          <div className="flex items-center gap-2">
            {/* Simulate Mobile Check-in Button */}
            <button
              type="button"
              onClick={() => setIsSimulatorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Smartphone size={13} />
              <span>Simulate Mobile Check-in</span>
            </button>

            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-[#008559] hover:bg-emerald-100/80 border border-emerald-200/80 text-xs font-bold transition cursor-pointer"
            >
              <CheckCircle2 size={13} />
              <span>Mark All Present</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Printer size={13} />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= 2. METRIC STATS CARDS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Active Supervisors */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Supervisors</span>
            <Users size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalSupervisors}</div>
          <div className="mt-1 text-[10px] text-slate-500 font-medium">Active area leads</div>
        </div>

        {/* Total Agents Handled */}
        <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/70 to-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-sky-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Assigned Agents</span>
            <Layers size={16} className="text-sky-500" />
          </div>
          <div className="text-2xl font-extrabold text-sky-700">{stats.totalAgentsManaged}</div>
          <div className="mt-1 text-[10px] text-sky-700 font-semibold">Total across all supervisors</div>
        </div>

        {/* Present Today */}
        <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 to-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Checked In</span>
            <CheckCircle2 size={16} className="text-[#008559]" />
          </div>
          <div className="text-2xl font-extrabold text-[#008559]">{stats.present}</div>
          <div className="mt-1 text-[10px] text-emerald-700 font-semibold">Time In recorded</div>
        </div>

        {/* Late Check-in */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 to-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Late Check-in</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{stats.late}</div>
          <div className="mt-1 text-[10px] text-amber-700 font-medium">Shift grace exceeded</div>
        </div>

        {/* Official Business / On Leave */}
        <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 to-white p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">OB / On Leave</span>
            <Briefcase size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600">{stats.ob + stats.leave}</div>
          <div className="mt-1 text-[10px] text-indigo-700 font-medium">Audit or approved leave</div>
        </div>

        {/* Pending Check-In */}
        <div className="rounded-2xl border border-slate-200/90 bg-slate-50 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Time In</span>
            <Clock size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-700">{stats.pending}</div>
          <div className="mt-1 text-[10px] text-slate-500 font-medium">Pending mobile check-in</div>
        </div>
      </div>

      {/* ================= 3. SEARCH & FILTER TOOLBAR ================= */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search supervisor name or area..."
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#008559] focus:bg-white transition"
          />
        </div>

        {/* Status Tabs Filter */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 max-w-full">
          {[
            { id: "all", label: "All", count: stats.totalSupervisors },
            { id: "present", label: "Checked In", count: stats.present },
            { id: "late", label: "Late", count: stats.late },
            { id: "ob", label: "OB", count: stats.ob },
            { id: "leave", label: "Leave", count: stats.leave },
            { id: "pending", label: "Awaiting", count: stats.pending }
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Area dropdown & View Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#008559] transition cursor-pointer"
          >
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Table View"
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Grid Cards View"
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* ================= 4. ATTENDANCE CONTENT (TABLE OR GRID) ================= */}
      {filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <AlertCircle className="mx-auto text-slate-300 mb-3" size={40} />
          <h3 className="text-base font-bold text-slate-800">No supervisor records found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search keyword or clearing status filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
              setAreaFilter("all");
            }}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE / DTR LEDGER VIEW */
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Supervisor</th>
                  <th className="py-3 px-3">Assigned Agents</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Time In</th>
                  <th className="py-3 px-3">Field Photo</th>
                  <th className="py-3 px-3">GPS Location</th>
                  <th className="py-3 px-3">Area / Sector</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((record) => {
                  const spvrStats = agentStatsBySupervisor[String(record.supervisorId)] || {
                    total: 0,
                    active: 0,
                    agents: []
                  };

                  return (
                    <tr key={record.supervisorId} className="hover:bg-slate-50/70 transition">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {record.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                              <span>{record.fullName}</span>
                              <span className="text-[10px] font-mono text-slate-400">#{record.supervisorId}</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              @{record.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Agents (Real Count from API) */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => setViewingSupervisorAgents({
                            supervisorName: record.fullName,
                            supervisorId: record.supervisorId,
                            stats: spvrStats
                          })}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/80 font-bold transition cursor-pointer group text-left"
                          title="Click to view full list of assigned agents"
                        >
                          <Users size={12} className="text-sky-600 group-hover:scale-110 transition-transform" />
                          <span>{spvrStats.total} Agents</span>
                          <span className="text-[10px] font-normal text-sky-600">({spvrStats.active} Active)</span>
                        </button>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            record.status === "Present"
                              ? "bg-emerald-100 text-emerald-800"
                              : record.status === "Late"
                                ? "bg-amber-100 text-amber-800"
                                : record.status === "Official Business"
                                  ? "bg-sky-100 text-sky-800"
                                  : record.status === "On Leave"
                                    ? "bg-indigo-100 text-indigo-800"
                                    : record.status === "Day Off"
                                      ? "bg-slate-200 text-slate-700"
                                      : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              record.status === "Present"
                                ? "bg-emerald-500"
                                : record.status === "Late"
                                  ? "bg-amber-500"
                                  : record.status === "Official Business"
                                    ? "bg-sky-500"
                                    : record.status === "On Leave"
                                      ? "bg-indigo-500"
                                      : "bg-slate-400"
                            }`}
                          />
                          {record.status}
                        </span>
                      </td>

                      {/* Time In (ONLY) */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 font-mono font-bold text-xs px-2.5 py-1 rounded-lg ${
                            record.timeIn !== "--"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <Clock size={12} className={record.timeIn !== "--" ? "text-emerald-600" : "text-slate-400"} />
                          {record.timeIn}
                        </span>
                      </td>

                      {/* Field Photo Proof */}
                      <td className="py-3 px-3">
                        {record.photoProof ? (
                          <button
                            type="button"
                            onClick={() => setViewingPhotoRecord(record)}
                            className="relative group w-9 h-9 rounded-xl overflow-hidden border border-emerald-400 shadow-2xs hover:scale-105 transition cursor-pointer"
                            title="View Photo & GPS Proof"
                          >
                            <img
                              src={record.photoProof}
                              alt="Proof"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 flex items-center justify-center text-white">
                              <Eye size={12} />
                            </div>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            No photo
                          </span>
                        )}
                      </td>

                      {/* GPS Location & Coordinates */}
                      <td className="py-3 px-3 max-w-xs">
                        {record.latitude && record.longitude ? (
                          <div>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 hover:text-emerald-900 hover:underline bg-emerald-50/70 px-2 py-0.5 rounded-md border border-emerald-100"
                              title="Open in Google Maps"
                            >
                              <MapPin size={11} className="text-emerald-600 shrink-0" />
                              <span>{record.latitude?.toFixed(4)}, {record.longitude?.toFixed(4)}</span>
                              <ExternalLink size={9} className="text-slate-400 ml-0.5" />
                            </a>
                            {record.locationName && (
                              <div className="text-[10px] text-slate-500 truncate mt-0.5" title={record.locationName}>
                                {record.locationName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Not geo-tagged
                          </span>
                        )}
                      </td>

                      {/* Area */}
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          Area {record.area}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {record.status !== "Present" && (
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(record.supervisorId, "Present")}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer"
                              title="Mark Present"
                            >
                              <Check size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleClockInNow(record.supervisorId)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                            title="Stamp Time In Now"
                          >
                            <Clock size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#008559] hover:text-white transition cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit3 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS / GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((record) => {
            const spvrStats = agentStatsBySupervisor[String(record.supervisorId)] || {
              total: 0,
              active: 0,
              agents: []
            };

            return (
              <div
                key={record.supervisorId}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Top card bar */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold flex items-center justify-center text-sm shadow-2xs">
                        {record.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm tracking-tight">
                          {record.fullName}
                        </h4>
                        <div className="text-[11px] text-slate-500">
                          ID: #{record.supervisorId} • @{record.username}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        record.status === "Present"
                          ? "bg-emerald-100 text-emerald-800"
                          : record.status === "Late"
                            ? "bg-amber-100 text-amber-800"
                            : record.status === "Official Business"
                              ? "bg-sky-100 text-sky-800"
                              : record.status === "On Leave"
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>

                  {/* Assigned Agents Card Badge */}
                  <div className="mb-3 p-2.5 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
                        Assigned Agents
                      </span>
                      <div className="text-sm font-extrabold text-sky-900">
                        {spvrStats.total} Agents
                        <span className="text-xs font-semibold text-sky-600 ml-1">
                          ({spvrStats.active} Active)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingSupervisorAgents({
                        supervisorName: record.fullName,
                        supervisorId: record.supervisorId,
                        stats: spvrStats
                      })}
                      className="px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-bold border border-sky-200 transition cursor-pointer"
                    >
                      View List
                    </button>
                  </div>

                  {/* Time In & Area Badge */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                        Time In
                      </span>
                      <span className="text-sm font-mono font-bold text-emerald-900">
                        {record.timeIn}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Sector
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Area {record.area}
                      </span>
                    </div>
                  </div>

                  {/* GPS & Photo if available */}
                  {record.latitude && record.longitude ? (
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 mb-3 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-mono text-emerald-900 block font-semibold">
                          📍 {record.latitude?.toFixed(4)}, {record.longitude?.toFixed(4)}
                        </span>
                        {record.locationName && (
                          <span className="text-[10px] text-slate-500 block truncate">{record.locationName}</span>
                        )}
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        Maps
                      </a>
                    </div>
                  ) : null}

                  {/* Remarks */}
                  {record.remarks && (
                    <p className="text-xs text-slate-600 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 italic">
                      "{record.remarks}"
                    </p>
                  )}
                </div>

                {/* Bottom Quick Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(record.supervisorId, "Present")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        record.status === "Present"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 hover:bg-emerald-50 text-slate-700"
                      }`}
                    >
                      Present
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(record.supervisorId, "Late")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        record.status === "Late"
                          ? "bg-amber-500 text-white"
                          : "bg-slate-100 hover:bg-amber-50 text-slate-700"
                      }`}
                    >
                      Late
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditModal(record)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-emerald-700 transition cursor-pointer"
                  >
                    <Edit3 size={12} />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= 5. VIEW ASSIGNED AGENTS MODAL ================= */}
      {viewingSupervisorAgents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-sky-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Users size={18} className="text-sky-300" />
                  Assigned Agents: {viewingSupervisorAgents.supervisorName}
                </h3>
                <p className="text-xs text-sky-200">
                  Supervisor #{viewingSupervisorAgents.supervisorId} • Total: {viewingSupervisorAgents.stats.total} Agents ({viewingSupervisorAgents.stats.active} Active, {viewingSupervisorAgents.stats.inactive} Inactive)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingSupervisorAgents(null)}
                className="p-1 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Agents List Body */}
            <div className="p-4 overflow-y-auto custom-scrollbar space-y-2 flex-1">
              {viewingSupervisorAgents.stats.agents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No agents linked to this supervisor in the live database.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {viewingSupervisorAgents.stats.agents.map((ag, idx) => (
                    <div key={ag.id || idx} className="py-2.5 px-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{ag.fullName || ag.username || `Agent ${ag.id}`}</span>
                            <span className="text-[10px] font-mono text-slate-400">ID #{ag.id}</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {ag.outlet || ag.location || ag.address || "Outlet not specified"}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ag.isActive === 1 || ag.isActive === true || ag.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {ag.isActive === 1 || ag.isActive === true || ag.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewingSupervisorAgents(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. PHOTO & GPS VERIFICATION MODAL ================= */}
      {viewingPhotoRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">Field Photo Proof</h3>
                  <p className="text-[11px] text-slate-400">Supervisor #{viewingPhotoRecord.supervisorId} • {viewingPhotoRecord.fullName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPhotoRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-inner flex items-center justify-center">
                <img
                  src={viewingPhotoRecord.photoProof}
                  alt="Proof"
                  className="w-full max-h-72 object-contain"
                />
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Supervisor:</span>
                  <span className="font-bold text-slate-900">{viewingPhotoRecord.fullName}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Time In:</span>
                  <span className="font-mono font-bold text-slate-900">{viewingPhotoRecord.timeIn}</span>
                </div>
                {viewingPhotoRecord.latitude && viewingPhotoRecord.longitude && (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">GPS Coordinates:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {viewingPhotoRecord.latitude}, {viewingPhotoRecord.longitude}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                {viewingPhotoRecord.latitude && viewingPhotoRecord.longitude && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${viewingPhotoRecord.latitude},${viewingPhotoRecord.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Map size={14} />
                    <span>Open in Maps</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setViewingPhotoRecord(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. SIMULATE MOBILE CHECK-IN MODAL ================= */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold">Simulate Mobile Check-in App</h3>
                  <p className="text-xs text-emerald-100">Test live photo capture, phone GPS & Time In submission</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitMobileCheckin} className="p-6 space-y-4">
              {/* Select Supervisor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Select Supervisor
                </label>
                <select
                  value={simSupervisorId}
                  onChange={(e) => setSimSupervisorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#008559] transition cursor-pointer"
                >
                  {supervisorsList.map((s) => {
                    const count = agentStatsBySupervisor[String(s.id)]?.total || 0;
                    return (
                      <option key={s.id} value={s.id}>
                        #{s.id} - {s.fullName} ({count} Assigned Agents • Area {s.area})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* GPS Coordinates & Browser Grab */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    GPS Coordinates (Device Location)
                  </label>
                  <button
                    type="button"
                    onClick={handleGetBrowserGps}
                    disabled={isGettingGps}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                  >
                    <LocateFixed size={12} className={isGettingGps ? "animate-spin text-emerald-600" : ""} />
                    <span>{isGettingGps ? "Detecting GPS..." : "Detect Device GPS"}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input
                    type="text"
                    value={simLat}
                    onChange={(e) => setSimLat(e.target.value)}
                    placeholder="Latitude (e.g. 10.3341)"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#008559]"
                  />
                  <input
                    type="text"
                    value={simLng}
                    onChange={(e) => setSimLng(e.target.value)}
                    placeholder="Longitude (e.g. 123.9422)"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#008559]"
                  />
                </div>
                <input
                  type="text"
                  value={simLocationName}
                  onChange={(e) => setSimLocationName(e.target.value)}
                  placeholder="Location landmark / Branch post"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#008559]"
                />
              </div>

              {/* Photo Upload / Proof */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Photo / Selfie Capture (Live Device Camera)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Camera size={14} />
                    <span>{simPhotoUrl ? "Change Photo" : "Upload Picture"}</span>
                  </button>
                  <span className="text-[11px] text-slate-500">
                    {simPhotoUrl ? "Photo attached ✅" : "Optional field camera photo"}
                  </span>
                </div>

                {simPhotoUrl && (
                  <div className="mt-2 w-24 h-24 rounded-xl overflow-hidden border border-emerald-400">
                    <img src={simPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#008559] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <CheckCircle2 size={14} />
                  <span>Submit Time In</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= 8. EDIT DTR RECORD MODAL ================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Daily Attendance Record
                </h3>
                <p className="text-xs text-slate-500">
                  {editingRecord.fullName} • ID #{editingRecord.supervisorId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {/* Status Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Attendance Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008559] focus:bg-white transition cursor-pointer"
                >
                  <option value="Present">Present (Time In Recorded)</option>
                  <option value="Late">Late Check-in</option>
                  <option value="Official Business">Official Business (OB / Audit)</option>
                  <option value="On Leave">On Leave (Approved VL / SL)</option>
                  <option value="Day Off">Day Off / Rest Day</option>
                  <option value="Awaiting Check-in">Awaiting Check-in (No Time In)</option>
                </select>
              </div>

              {/* Time In */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Time In (e.g. 06:45 AM)
                </label>
                <div className="relative">
                  <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={editFormData.timeIn}
                    onChange={(e) => setEditFormData({ ...editFormData, timeIn: e.target.value })}
                    placeholder="e.g. 06:45 AM"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#008559] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={editFormData.latitude}
                    onChange={(e) => setEditFormData({ ...editFormData, latitude: e.target.value })}
                    placeholder="10.3341"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#008559] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={editFormData.longitude}
                    onChange={(e) => setEditFormData({ ...editFormData, longitude: e.target.value })}
                    placeholder="123.9422"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-[#008559] focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Location Name & Area */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Location Landmark
                  </label>
                  <input
                    type="text"
                    value={editFormData.locationName}
                    onChange={(e) => setEditFormData({ ...editFormData, locationName: e.target.value })}
                    placeholder="e.g. Mandaue Central Station"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#008559] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Sector / Area
                  </label>
                  <select
                    value={editFormData.area}
                    onChange={(e) => setEditFormData({ ...editFormData, area: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#008559] focus:bg-white transition cursor-pointer"
                  >
                    <option value="1">Area 1 - Subangdaku</option>
                    <option value="2">Area 2 - Centro</option>
                    <option value="3">Area 3 - Basak</option>
                    <option value="4">Area 4 - Tipolo</option>
                    <option value="5">Area 5 - Mandaue Central</option>
                  </select>
                </div>
              </div>

              {/* Remarks / Field Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Supervisor Remarks / Field Activity
                </label>
                <textarea
                  rows={2}
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  placeholder="Provide activity explanation or field audit notes..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-[#008559] focus:bg-white transition resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#008559] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
