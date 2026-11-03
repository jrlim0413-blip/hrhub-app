import { useState, useEffect, useMemo, useRef } from "react";
import {
  Users, UserCheck, Clock, Calendar, Search, Filter,
  Download, Printer, RefreshCw, CheckCircle2, AlertTriangle,
  XCircle, Briefcase, Edit3, Save, X, Plus, MapPin,
  ChevronLeft, ChevronRight, ShieldCheck, TrendingUp,
  AlertCircle, Eye, Check, Camera, Smartphone,
  ExternalLink, Navigation, LocateFixed,
  Map as MapIcon, Layers, Shield, Cloud, Loader2, Video, VideoOff, RotateCw,
  UserPlus, Key, Trash2, ShieldAlert, Sparkles, EyeOff
} from "lucide-react";
import { API_CONFIG } from "../config/apiConfig";
import {
  compressImage,
  uploadAttendancePhoto,
  fetchCloudAttendance,
  upsertCloudAttendance,
  subscribeToAttendanceRealtime
} from "../lib/supervisorAttendanceStorage";
import {
  loadFieldMonitoringAccounts,
  addFieldMonitoringAccount,
  updateFieldMonitoringAccount,
  deleteFieldMonitoringAccount,
  getCachedFieldMonitoringAccounts,
  subscribeToFieldAccountsRealtime
} from "../lib/fieldMonitoringStorage";

// Fallback active supervisors (matching live STL Mandaue API IDs 21 to 32)
const FALLBACK_SUPERVISORS = [
  { id: 21, fullName: "ARLFRED SABERON", area: "Mandaue City", username: "spvr-arlfred", isActive: 1 },
  { id: 22, fullName: "RAFFY BAGUIO", area: "Mandaue City", username: "spvr-raffy", isActive: 1 },
  { id: 23, fullName: "ROEL CATALAN", area: "Mandaue City", username: "spvr-roel", isActive: 1 },
  { id: 24, fullName: "MICHAEL DE GUZMAN", area: "Mandaue City", username: "spvr-michael", isActive: 1 },
  { id: 25, fullName: "JOEL ESTORCO", area: "Mandaue City", username: "spvr-joel", isActive: 1 },
  { id: 26, fullName: "HARRY EYA", area: "Mandaue City", username: "spvr-eya", isActive: 1 },
  { id: 27, fullName: "CARL MANGRUBAN", area: "Mandaue City", username: "spvr-carl", isActive: 1 },
  { id: 28, fullName: "JED MELENDREZ", area: "Mandaue City", username: "spvr-jed", isActive: 1 },
  { id: 29, fullName: "NYOR SESALDO", area: "Mandaue City", username: "spvr-nyor", isActive: 1 },
  { id: 30, fullName: "NARCISO TAGUD JR.", area: "Mandaue City", username: "spvr-jason", isActive: 1 },
  { id: 31, fullName: "MOLLY BATUBALANOS", area: "Mandaue City", username: "spvr-molly", isActive: 1 },
  { id: 32, fullName: "COORDINATOR - APPLEGROUP", area: "Mandaue City", username: "spvr-apple", isActive: 1 }
];

// Areas filter reference
const AREAS = [
  { id: "all", label: "All Sectors" },
  { id: "Mandaue City", label: "Mandaue City" },
  { id: "1", label: "Area 1 - Subangdaku / SIMCON" },
  { id: "2", label: "Area 2 - Centro & Cabancalan" },
  { id: "3", label: "Area 3 - Basak & Canduman" },
  { id: "4", label: "Area 4 - Tipolo & Guiso" }
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

  // Cloud Database Sync State ('synced' | 'syncing' | 'offline')
  const [cloudSyncStatus, setCloudSyncStatus] = useState("syncing");

  // Field Check-In Modal State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simSupervisorId, setSimSupervisorId] = useState("");
  const [simLat, setSimLat] = useState("");
  const [simLng, setSimLng] = useState("");
  const [simLocationAccuracy, setSimLocationAccuracy] = useState("");
  const [simLocationName, setSimLocationName] = useState("");
  const [simPhotoUrl, setSimPhotoUrl] = useState("");
  const [simPhotoFile, setSimPhotoFile] = useState(null);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);

  // Mobile PWA Link State
  const [copiedSupervisorId, setCopiedSupervisorId] = useState(null);
  const [copiedPwaNotice, setCopiedPwaNotice] = useState("");

  // Field Monitoring Accounts State (System Discretion Accounts)
  const [fieldAccounts, setFieldAccounts] = useState(() => getCachedFieldMonitoringAccounts());
  const [isFieldAccountsModalOpen, setIsFieldAccountsModalOpen] = useState(false);
  const [fieldAccountForm, setFieldAccountForm] = useState({
    fullName: "",
    username: "",
    password: "",
    area: "Mandaue City"
  });
  const [editingFieldAccountId, setEditingFieldAccountId] = useState(null);
  const [fieldAccountFormError, setFieldAccountFormError] = useState("");
  const [fieldAccountShowPasswords, setFieldAccountShowPasswords] = useState({});
  const [isSubmittingFieldAccount, setIsSubmittingFieldAccount] = useState(false);
  const [rosterCategoryFilter, setRosterCategoryFilter] = useState("all"); // "all" | "supervisors" | "monitoring"

  // Fetch Field Monitoring Accounts from Supabase Table & Realtime listener
  const refreshFieldAccounts = async () => {
    try {
      const accs = await loadFieldMonitoringAccounts();
      if (Array.isArray(accs) && accs.length > 0) {
        setFieldAccounts(accs);
      }
    } catch (err) {
      console.warn("Failed loading field accounts:", err);
    }
  };

  useEffect(() => {
    refreshFieldAccounts();
    const unsub = subscribeToFieldAccountsRealtime(() => {
      refreshFieldAccounts();
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const handleOpenAddAccount = () => {
    setEditingFieldAccountId(null);
    setFieldAccountForm({
      fullName: "",
      username: "",
      password: "",
      area: "Mandaue City"
    });
    setFieldAccountFormError("");
    setIsFieldAccountsModalOpen(true);
  };

  const handleEditFieldAccount = (account) => {
    setEditingFieldAccountId(account.id);
    setFieldAccountForm({
      fullName: account.fullName || "",
      username: account.username || "",
      password: account.password || "",
      area: account.area || "Mandaue City"
    });
    setFieldAccountFormError("");
  };

  const handleSaveFieldAccount = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFieldAccountFormError("");

    const name = String(fieldAccountForm.fullName || "").trim();
    const user = String(fieldAccountForm.username || "").trim();
    const pass = String(fieldAccountForm.password || "").trim();

    if (!name) {
      setFieldAccountFormError("Please enter the Full Name of the Field Monitoring personnel.");
      return;
    }
    if (!user) {
      setFieldAccountFormError("Please enter a login Username.");
      return;
    }
    if (!pass) {
      setFieldAccountFormError("Please enter a login Password.");
      return;
    }

    setIsSubmittingFieldAccount(true);
    try {
      if (editingFieldAccountId) {
        await updateFieldMonitoringAccount(editingFieldAccountId, {
          fullName: name,
          username: user,
          password: pass,
          area: fieldAccountForm.area
        });
        showToast(`✅ Updated account for ${name}`);
      } else {
        await addFieldMonitoringAccount({
          fullName: name,
          username: user,
          password: pass,
          area: fieldAccountForm.area
        });
        showToast(`✅ Created Field Monitoring account for ${name}`);
      }
      await refreshFieldAccounts();
      setEditingFieldAccountId(null);
      setFieldAccountForm({
        fullName: "",
        username: "",
        password: "",
        area: "Mandaue City"
      });
    } catch (err) {
      setFieldAccountFormError("Failed saving account: " + err.message);
    } finally {
      setIsSubmittingFieldAccount(false);
    }
  };

  const handleDeleteFieldAccount = async (account) => {
    const confirmDelete = window.confirm(`Sigurado ka bang nais mong tanggalin ang Field Monitoring account ni "${account.fullName}"?`);
    if (!confirmDelete) return;

    try {
      await deleteFieldMonitoringAccount(account.id);
      showToast(`🗑️ Account ${account.fullName} removed.`);
      await refreshFieldAccounts();
    } catch (err) {
      alert("Error removing account: " + err.message);
    }
  };

  const toggleAccountPasswordVisibility = (id) => {
    setFieldAccountShowPasswords((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyPwaLink = (supervisor) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://hrhub-app.vercel.app";
    const spvrId = supervisor.supervisorId || supervisor.id;
    const spvrName = supervisor.fullName || supervisor.supervisor_name || "Supervisor";
    const spvrUsername = supervisor.username || `spvr_${spvrId}`;
    const spvrArea = supervisor.area && supervisor.area !== "5" ? supervisor.area : "Mandaue City";
    const isFm = supervisor.role === "Field Monitoring" || String(spvrId).toLowerCase().startsWith("fm-");
    const roleParam = isFm ? "field_monitoring" : "supervisor";
    const pwaUrl = `${origin}/?pwa=supervisor&id=${spvrId}&username=${encodeURIComponent(spvrUsername)}&name=${encodeURIComponent(spvrName)}&role=${roleParam}&area=${encodeURIComponent(spvrArea)}`;

    // Retrieve registered password if this is a Field Monitoring account
    const fmMatch = fieldAccounts.find((f) =>
      String(f.id).toLowerCase() === String(spvrId).toLowerCase() ||
      String(f.username).toLowerCase() === String(spvrUsername).toLowerCase()
    );
    const spvrPassword = supervisor.password || fmMatch?.password || "";

    const titleText = isFm
      ? `📱 HRHub Field Monitoring • Daily Login Portal`
      : `📱 HRHub Field Operations • Daily Login Portal`;
    const roleLabel = isFm ? `FIELD MONITOR` : `SUPERVISOR`;

    // Enhanced executive message package with clear instructions ready for Messenger / Viber / SMS
    const formattedMessage = [
      titleText,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 ${roleLabel}: ${spvrName}`,
      `🆔 ID NUMBER: #${spvrId}`,
      `📍 AREA / SECTOR: ${spvrArea}`,
      `🔑 USERNAME: ${spvrUsername}`,
      ...(isFm && spvrPassword ? [`🔐 PASSWORD: ${spvrPassword}`] : []),
      ``,
      `🔗 PERSONAL ACCESS LINK:`,
      `${pwaUrl}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📋 KUNG BINUKSAN SA FACEBOOK MESSENGER:`,
      `1️⃣ Pindutin ang link sa itaas para magbukas sa Messenger.`,
      `2️⃣ Sa pinaka-itaas na kanang bahagi, i-tap ang tatlong tuldok ( ••• ).`,
      `3️⃣ Piliin ang "Open in browser" (upang bumukas sa Google Chrome).`,
      `4️⃣ I-enter ang iyong Username ${isFm && spvrPassword ? `at Password (${spvrPassword})` : `at Password`}.`,
      `5️⃣ I-allow ang GPS at Live Camera para makapag-Daily Login!`,
      ``,
      `📲 PAANO I-INSTALL BILANG CELLPHONE APP:`,
      `• Sa Google Chrome: I-tap ang "Install" sa itaas, O pindutin ang tatlong tuldok (⋮) sa Chrome ➡️ Piliin ang "Install app" o "Add to Home screen".`,
      `• Sa iPhone (Safari): Pindutin ang Share button (⎋ sa ibaba) ➡️ Piliin ang "Add to Home Screen" (+).`,
      `* Lilitaw na ang HRHub app icon sa iyong Home Screen / Apps para sa mabilis na pag-login araw-araw!`,
      ``,
      `🔒 PAALALA SA SEGURIDAD:`,
      `Ang link na ito ay eksklusibo lamang para sa iyong account (#${spvrId}). Huwag ibahagi sa ibang tao.`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `SGC • HR Technology Portal`
    ].join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(formattedMessage);
    } else {
      const el = document.createElement("textarea");
      el.value = formattedMessage;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    setCopiedSupervisorId(String(spvrId));
    setCopiedPwaNotice(`Copied complete instructions & PWA link for ${spvrName}! Ready to paste into Messenger, Viber, or SMS.`);
    setTimeout(() => {
      setCopiedSupervisorId(null);
    }, 3000);
    setTimeout(() => {
      setCopiedPwaNotice("");
    }, 7000);
  };

  // Strict Live Camera State (Live Video Viewfinder - No File Uploads)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("user"); // 'user' (selfie) | 'environment' (area)
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mobileCameraInputRef = useRef(null);

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

  // 3. Load or Initialize Attendance Records for Selected Date & Sync with Supabase Cloud
  useEffect(() => {
    if (supervisorsList.length === 0) return;

    let isMounted = true;
    const storageKey = `hrhub_spvr_attendance_v3_${selectedDate}`;
    const cached = localStorage.getItem(storageKey);

    // Initialize clean attendance records from real API data + registered Field Monitoring accounts
    const supervisorRecords = supervisorsList.map((spvr, index) => {
      return {
        supervisorId: spvr.id,
        fullName: spvr.fullName || spvr.username || `Supervisor ${spvr.id}`,
        username: spvr.username || `spvr_${spvr.id}`,
        area: String(spvr.area && spvr.area !== "5" ? spvr.area : "Mandaue City"),
        role: "Supervisor",
        status: "Awaiting Check-in",
        timeIn: "--",
        latitude: null,
        longitude: null,
        locationAccuracy: null,
        locationName: "",
        photoProof: null,
        shift: SHIFTS[index % SHIFTS.length],
        remarks: "Pending field mobile check-in",
        lastUpdated: ""
      };
    });

    const monitoringRecords = fieldAccounts.map((fm) => {
      return {
        supervisorId: fm.id,
        fullName: fm.fullName,
        username: fm.username,
        area: fm.area || "Mandaue City",
        role: "Field Monitoring",
        status: "Awaiting Check-in",
        timeIn: "--",
        latitude: null,
        longitude: null,
        locationAccuracy: null,
        locationName: "",
        photoProof: null,
        shift: "Full Day Field Operations (07:00 AM - 05:00 PM)",
        remarks: "Field Monitoring Account • Pending Mobile Check-in",
        lastUpdated: ""
      };
    });

    const initialRecords = [...supervisorRecords, ...monitoringRecords];

    let currentWorkingRecords = initialRecords;

    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter((r) => {
            const id = Number(r.supervisorId);
            return !(id >= 13 && id <= 20) && !String(r.fullName).startsWith("SPVR ");
          });
          if (valid.length > 0) {
            const validMap = new Map();
            valid.forEach((r) => validMap.set(String(r.supervisorId), r));

            // Merge cache into initialRecords, preserving role and field monitoring identity
            currentWorkingRecords = initialRecords.map((initRec) => {
              const saved = validMap.get(String(initRec.supervisorId));
              if (saved) {
                return {
                  ...initRec,
                  ...saved,
                  role: initRec.role, // Always preserve authoritative role
                  fullName: initRec.fullName || saved.fullName,
                  username: initRec.username || saved.username,
                  area: String(saved.area && saved.area !== "5" ? saved.area : initRec.area)
                };
              }
              return initRec;
            });

            // Also keep any extra valid records in cache if any
            const initIds = new Set(initialRecords.map((r) => String(r.supervisorId)));
            const extra = valid.filter((r) => !initIds.has(String(r.supervisorId)));
            if (extra.length > 0) {
              currentWorkingRecords = [...currentWorkingRecords, ...extra];
            }
          }
        }
      } catch { }
    }

    setAttendanceRecords(currentWorkingRecords);

    // Asynchronously sync with Supabase Cloud Database
    async function syncCloudData() {
      setCloudSyncStatus("syncing");
      const { data, error, isCloudAvailable } = await fetchCloudAttendance(selectedDate);
      if (!isMounted) return;

      if (isCloudAvailable && Array.isArray(data)) {
        setCloudSyncStatus("synced");
        if (data.length > 0) {
          const cloudMap = new Map();
          data.forEach((row) => {
            cloudMap.set(String(row.supervisor_id), row);
          });

          setAttendanceRecords((prev) => {
            // Guarantee baseList has all initialRecords (Supervisors + Field Monitors)
            const prevMap = new Map();
            (prev || []).forEach((r) => prevMap.set(String(r.supervisorId), r));

            const fullBaseList = initialRecords.map((initRec) => {
              const existing = prevMap.get(String(initRec.supervisorId));
              return existing ? { ...initRec, ...existing, role: initRec.role } : initRec;
            });

            const merged = fullBaseList.map((item) => {
              const cloudRow = cloudMap.get(String(item.supervisorId));
              if (cloudRow) {
                return {
                  ...item,
                  fullName: cloudRow.supervisor_name || item.fullName,
                  username: cloudRow.username || item.username,
                  area: String(cloudRow.area && cloudRow.area !== "5" ? cloudRow.area : (item.area && item.area !== "5" ? item.area : "Mandaue City")),
                  status: cloudRow.status || item.status,
                  timeIn: cloudRow.time_in || item.timeIn,
                  latitude: cloudRow.latitude !== null && cloudRow.latitude !== undefined ? Number(cloudRow.latitude) : item.latitude,
                  longitude: cloudRow.longitude !== null && cloudRow.longitude !== undefined ? Number(cloudRow.longitude) : item.longitude,
                  locationAccuracy: cloudRow.location_accuracy !== null && cloudRow.location_accuracy !== undefined ? Number(cloudRow.location_accuracy) : item.locationAccuracy,
                  locationName: cloudRow.location_name || item.locationName,
                  photoProof: cloudRow.photo_url || item.photoProof,
                  shift: cloudRow.shift || item.shift,
                  remarks: cloudRow.remarks || item.remarks,
                  lastUpdated: cloudRow.updated_at ? new Date(cloudRow.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : item.lastUpdated
                };
              }
              return item;
            });

            try {
              localStorage.setItem(storageKey, JSON.stringify(merged));
            } catch { }
            return merged;
          });
        }
      } else {
        // Table not ready or network offline, gracefully maintain local storage
        setCloudSyncStatus("offline");
      }
    }

    syncCloudData();

    // Subscribe to Realtime Supabase notifications for immediate live updates
    const unsubscribe = subscribeToAttendanceRealtime(selectedDate, (payload) => {
      const row = payload?.new;
      if (!row || !row.supervisor_id) return;

      setAttendanceRecords((prev) => {
        const prevMap = new Map();
        (prev || []).forEach((r) => prevMap.set(String(r.supervisorId), r));

        let currentList = prev || [];
        if (!prevMap.has(String(row.supervisor_id))) {
          const initRec = initialRecords.find((r) => String(r.supervisorId) === String(row.supervisor_id)) || {
            supervisorId: row.supervisor_id,
            fullName: row.supervisor_name || `Personnel ${row.supervisor_id}`,
            username: row.username || "",
            area: String(row.area && row.area !== "5" ? row.area : "Mandaue City"),
            role: String(row.supervisor_id).toLowerCase().startsWith("fm-") ? "Field Monitoring" : "Supervisor",
            status: "Awaiting Check-in",
            timeIn: "--",
            shift: row.shift || "Morning Draw"
          };
          currentList = [...currentList, initRec];
        }

        const updated = currentList.map((item) => {
          if (String(item.supervisorId) === String(row.supervisor_id)) {
            return {
              ...item,
              fullName: row.supervisor_name || item.fullName,
              username: row.username || item.username,
              area: String(row.area && row.area !== "5" ? row.area : (item.area && item.area !== "5" ? item.area : "Mandaue City")),
              status: row.status || item.status,
              timeIn: row.time_in || item.timeIn,
              latitude: row.latitude !== null && row.latitude !== undefined ? Number(row.latitude) : item.latitude,
              longitude: row.longitude !== null && row.longitude !== undefined ? Number(row.longitude) : item.longitude,
              locationAccuracy: row.location_accuracy !== null && row.location_accuracy !== undefined ? Number(row.location_accuracy) : item.locationAccuracy,
              locationName: row.location_name || item.locationName,
              photoProof: row.photo_url || item.photoProof,
              shift: row.shift || item.shift,
              remarks: row.remarks || item.remarks,
              lastUpdated: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            };
          }
          return item;
        });

        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch { }
        return updated;
      });

      showToast(`🔔 Live attendance check-in synced for #${row.supervisor_id}!`);
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [selectedDate, supervisorsList, fieldAccounts]);

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
    let changedRec = null;
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

        changedRec = {
          ...rec,
          status: newStatus,
          timeIn,
          remarks,
          lastUpdated: nowTime
        };
        return changedRec;
      }
      return rec;
    });

    saveRecordsToStorage(updated);
    if (changedRec) {
      upsertCloudAttendance(changedRec, selectedDate);
    }
    showToast(`Updated attendance status to ${newStatus}`);
  };

  // Clock In Now Timestamp
  const handleClockInNow = (supervisorId) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    let changedRec = null;
    const updated = attendanceRecords.map((rec) => {
      if (rec.supervisorId === supervisorId) {
        changedRec = {
          ...rec,
          status: "Present",
          timeIn: nowTime,
          remarks: `Time In confirmed at ${nowTime}`,
          lastUpdated: nowTime
        };
        return changedRec;
      }
      return rec;
    });
    saveRecordsToStorage(updated);
    if (changedRec) {
      upsertCloudAttendance(changedRec, selectedDate);
    }
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
    updated.forEach((r) => upsertCloudAttendance(r, selectedDate));
    showToast("All active supervisors marked as Present & synced!");
  };

  // Grab Live GPS from Browser / Phone with High Accuracy
  const handleGetBrowserGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser/device.");
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const acc = Math.round(pos.coords.accuracy);
        setSimLat(lat);
        setSimLng(lng);
        setSimLocationAccuracy(String(acc));
        setSimLocationName(`Device GPS Location (±${acc}m)`);
        setIsGettingGps(false);
        showToast(`GPS locked: ±${acc}m accuracy!`);
      },
      (err) => {
        alert("Failed to retrieve GPS location: " + err.message + "\nPlease enable Location / GPS in your device settings.");
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Start In-App Live Camera Stream (Strict Live Capture)
  const startLiveCamera = async (facing = cameraFacingMode) => {
    setCameraError("");
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Live video stream is not supported on this browser.");
      }

      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => { });
      }
      setIsCameraActive(true);
      setSimPhotoUrl("");
      setSimPhotoFile(null);
    } catch (err) {
      console.warn("Live camera access notice:", err);
      setCameraError(err.message || "Live camera permission denied or unavailable.");
      setIsCameraActive(false);
    }
  };

  // Stop Live Camera Stream
  const stopLiveCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Capture Frame directly from Live Camera Viewfinder
  const capturePhotoFromLiveCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Mirror horizontal when using selfie camera
    if (cameraFacingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
    canvas.toBlob(
      (blob) => {
        setSimPhotoFile(blob);
        setSimPhotoUrl(dataUrl);
        stopLiveCamera();
        showToast("📸 Live photo captured from camera!");
      },
      "image/jpeg",
      0.82
    );
  };

  // Switch between Selfie (user) and Rear Area Camera (environment)
  const switchCameraFacingMode = () => {
    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextMode);
    if (isCameraActive) {
      startLiveCamera(nextMode);
    }
  };

  // Mobile Device Camera Fallback (Strict Camera Intent via capture="user")
  const handleMobileCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      showToast("Optimizing camera photo...");
      const compressed = await compressImage(file, 1200, 1200, 0.82);
      setSimPhotoFile(compressed.blob);
      setSimPhotoUrl(compressed.dataUrl);
      stopLiveCamera();
      showToast("📸 Live photo captured from camera!");
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSimPhotoUrl(event.target.result);
        setSimPhotoFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  // Watch modal open/close to auto-trigger camera & GPS
  useEffect(() => {
    if (isSimulatorOpen) {
      startLiveCamera("user");
      if (!simLat || !simLng) {
        handleGetBrowserGps();
      }
    } else {
      stopLiveCamera();
    }
    return () => {
      stopLiveCamera();
    };
  }, [isSimulatorOpen]);

  // Submit Mobile Check-In with Cloud Storage & Database Upsert
  const handleSubmitMobileCheckin = async (e) => {
    e.preventDefault();
    if (!simSupervisorId) return;

    if (!simPhotoUrl) {
      alert("⚠️ Please capture a live photo with the camera before checking in.");
      return;
    }

    const targetSpvr = [...supervisorsList, ...fieldAccounts].find((s) => String(s.id) === String(simSupervisorId));
    if (!targetSpvr) return;

    setIsSubmittingCheckIn(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    let finalPhotoUrl = simPhotoUrl;

    // 1. Direct Upload to Supabase Storage Bucket 'supervisor-attendance'
    if (simPhotoFile) {
      try {
        const uploadResult = await uploadAttendancePhoto(simPhotoFile, simSupervisorId, selectedDate);
        if (uploadResult.url) {
          finalPhotoUrl = uploadResult.url;
        } else if (uploadResult.error) {
          console.warn("Storage bucket upload notice (saving photo directly to database):", uploadResult.error);
        }
      } catch (err) {
        console.warn("Photo upload exception:", err);
      }
    }

    const updatedRec = {
      supervisorId: targetSpvr.id,
      fullName: targetSpvr.fullName || targetSpvr.username,
      username: targetSpvr.username,
      area: String(targetSpvr.area && targetSpvr.area !== "5" ? targetSpvr.area : "Mandaue City"),
      status: "Present",
      timeIn: nowTime,
      latitude: simLat ? parseFloat(simLat) : null,
      longitude: simLng ? parseFloat(simLng) : null,
      locationAccuracy: simLocationAccuracy ? parseFloat(simLocationAccuracy) : null,
      locationName: simLocationName.trim() || (simLat ? `Field GPS Tag (±${simLocationAccuracy || "5"}m)` : ""),
      photoProof: finalPhotoUrl || null,
      shift: SHIFTS[0],
      remarks: `Live Camera Check-in captured at ${nowTime}`,
      lastUpdated: nowTime
    };

    // 2. Direct Await Upsert into Supabase Table 'supervisor_attendance'
    const cloudRes = await upsertCloudAttendance(updatedRec, selectedDate);

    if (cloudRes.success) {
      setCloudSyncStatus("synced");
      const updated = attendanceRecords.map((rec) => {
        if (String(rec.supervisorId) === String(simSupervisorId)) {
          return {
            ...rec,
            ...updatedRec
          };
        }
        return rec;
      });

      saveRecordsToStorage(updated);
      showToast(`☁️ Successfully saved to Supabase for ${targetSpvr.fullName}!`);
    } else {
      console.error("Supabase upsert failed:", cloudRes.error);
      alert(`⚠️ Supabase Cloud Save Error:\n${cloudRes.error}\n\nPlease verify table permissions or run the setup SQL script in Supabase Dashboard.`);
      const updated = attendanceRecords.map((rec) => {
        if (String(rec.supervisorId) === String(simSupervisorId)) {
          return { ...rec, ...updatedRec };
        }
        return rec;
      });
      saveRecordsToStorage(updated);
    }

    stopLiveCamera();
    setIsSubmittingCheckIn(false);
    setIsSimulatorOpen(false);
    setSimPhotoUrl("");
    setSimPhotoFile(null);
    setSimLat("");
    setSimLng("");
    setSimLocationAccuracy("");
    setSimLocationName("");
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
      area: record.area && record.area !== "5" ? record.area : "Mandaue City",
      remarks: record.remarks || ""
    });
  };

  // Save Edit DTR with Cloud Upsert
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const updatedRec = {
      ...editingRecord,
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

    const cloudRes = await upsertCloudAttendance(updatedRec, selectedDate);
    if (cloudRes.success) {
      showToast(`☁️ DTR entry saved to Supabase for ${editingRecord.fullName}`);
    }

    const updated = attendanceRecords.map((rec) => {
      if (rec.supervisorId === editingRecord.supervisorId) {
        return updatedRec;
      }
      return rec;
    });

    saveRecordsToStorage(updated);
    setEditingRecord(null);
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
      // Category filter (Source API Supervisors vs Field Monitoring)
      if (rosterCategoryFilter === "supervisors" && r.role === "Field Monitoring") return false;
      if (rosterCategoryFilter === "monitoring" && r.role !== "Field Monitoring") return false;

      const searchMatch =
        searchTerm === "" ||
        r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(r.supervisorId).includes(searchTerm) ||
        (r.role && r.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
  }, [attendanceRecords, searchTerm, statusFilter, areaFilter, rosterCategoryFilter]);

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
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-[#008559] border border-emerald-200/60 uppercase tracking-wider">
                <ShieldCheck size={12} />
                Live Database • STL Mandaue API
              </span>
              <span className="text-xs text-slate-400">•</span>
              {cloudSyncStatus === "synced" ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Database Synced
                </span>
              ) : cloudSyncStatus === "syncing" ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 border border-sky-200/80">
                  <RefreshCw size={10} className="animate-spin text-sky-600" />
                  Connecting Cloud...
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200/80" title="Local storage active. Run 03_supervisor_attendance_schema.sql in Supabase to enable cloud persistence.">
                  <AlertTriangle size={11} className="text-amber-600" />
                  Local Cache Mode
                </span>
              )}
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
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${selectedDate === getTodayString()
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddAccount}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-xs hover:shadow-emerald-950/20 active:scale-95 cursor-pointer"
              title="Add or manage Field Monitoring login accounts"
            >
              <UserPlus size={13} />
              <span>Field Monitoring Accounts ({fieldAccounts.length})</span>
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1.5 ${isSelected
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600"
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Pill: All vs Supervisors vs Field Monitoring */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setRosterCategoryFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${rosterCategoryFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
          >
            All ({attendanceRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setRosterCategoryFilter("supervisors")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${rosterCategoryFilter === "supervisors" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
          >
            Supervisors ({attendanceRecords.filter((r) => r.role !== "Field Monitoring").length})
          </button>
          <button
            type="button"
            onClick={() => setRosterCategoryFilter("monitoring")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${rosterCategoryFilter === "monitoring" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <ShieldCheck size={11} />
            Field Monitor ({attendanceRecords.filter((r) => r.role === "Field Monitoring").length || fieldAccounts.length})
          </button>
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === "table" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                }`}
              title="Table View"
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
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
          <h3 className="text-base font-bold text-slate-800">
            {rosterCategoryFilter === "monitoring"
              ? "No Field Monitor records found"
              : rosterCategoryFilter === "supervisors"
                ? "No supervisor records found"
                : "No attendance records found"}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {rosterCategoryFilter === "monitoring"
              ? "Click \"Add Account\" at the top right to register Field Monitoring personnel."
              : "Try adjusting your search keyword or clearing status filters."}
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
                  <th className="py-3 px-4">GPS Location</th>
                  <th className="py-3 px-4 text-center">📱 Mobile PWA Link</th>
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
                              {record.role === "Field Monitoring" ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[9px] font-black uppercase tracking-wider">
                                  <ShieldCheck size={9} className="text-teal-600" />
                                  Field Monitor
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-[9px] font-semibold">
                                  Source API
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              @{record.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Agents (Real Count from API) */}
                      <td className="py-3 px-3">
                        {record.role === "Field Monitoring" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50/70 text-teal-800 text-xs font-semibold border border-teal-200/50">
                            <ShieldCheck size={12} className="text-teal-600" />
                            <span>Field Inspector</span>
                          </span>
                        ) : (
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
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${record.status === "Present"
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
                            className={`w-1.5 h-1.5 rounded-full ${record.status === "Present"
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
                          className={`inline-flex items-center gap-1.5 font-mono font-bold text-xs px-2.5 py-1 rounded-lg ${record.timeIn !== "--"
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
                      {/* Mobile PWA Link with Auto-Login */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyPwaLink(record)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer ${copiedSupervisorId === String(record.supervisorId)
                              ? "bg-emerald-600 text-white shadow-emerald-900/20"
                              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80"
                              }`}
                            title="Copy personalized PWA auto-login link for this supervisor"
                          >
                            {copiedSupervisorId === String(record.supervisorId) ? (
                              <>
                                <Check size={13} className="text-white" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Smartphone size={13} className="text-emerald-600" />
                                <span>Copy PWA Link</span>
                              </>
                            )}
                          </button>
                          <a
                            href={`/?pwa=supervisor&id=${record.supervisorId}&username=${encodeURIComponent(record.username || "")}&name=${encodeURIComponent(record.fullName)}&role=${record.role === "Field Monitoring" || String(record.supervisorId).toLowerCase().startsWith("fm-") ? "field_monitoring" : "supervisor"}&area=${encodeURIComponent(record.area && record.area !== "5" ? record.area : "Mandaue City")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition"
                            title="Open Mobile PWA view in new tab"
                          >
                            <ExternalLink size={13} />
                          </a>
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
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${record.status === "Present"
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
                        {record.area === "Mandaue City" || record.area === "5" || !record.area ? "Mandaue City" : `Area ${record.area}`}
                      </span>
                    </div>
                  </div>

                  {/* Photo Proof Thumbnail on Card */}
                  {record.photoProof && (
                    <div className="mb-3 flex items-center justify-between gap-2.5 p-2 bg-emerald-50/60 border border-emerald-200/80 rounded-xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-lg overflow-hidden border border-emerald-400 shrink-0 shadow-2xs">
                          <img src={record.photoProof} alt="Proof" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                            <span>Photo Verified</span>
                          </span>
                          <span className="text-[10px] text-emerald-700 block truncate">
                            Logged via Camera
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingPhotoRecord(record)}
                        className="px-2 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold border border-emerald-300 transition cursor-pointer shrink-0"
                      >
                        View Photo
                      </button>
                    </div>
                  )}

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
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${record.status === "Present"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 hover:bg-emerald-50 text-slate-700"
                        }`}
                    >
                      Present
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickStatusChange(record.supervisorId, "Late")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${record.status === "Late"
                        ? "bg-amber-500 text-white"
                        : "bg-slate-100 hover:bg-amber-50 text-slate-700"
                        }`}
                    >
                      Late
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyPwaLink(record)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${copiedSupervisorId === String(record.supervisorId)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200/80"
                        }`}
                      title="Copy personalized mobile PWA link"
                    >
                      {copiedSupervisorId === String(record.supervisorId) ? (
                        <>
                          <Check size={11} className="text-white" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Smartphone size={11} className="text-emerald-600" />
                          <span>Link</span>
                        </>
                      )}
                    </button>

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
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ag.isActive === 1 || ag.isActive === true || ag.status === "active"
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

      {/* ================= 6. PHOTO & GPS VERIFICATION MODAL (BOND PAPER PROPORTION) ================= */}
      {viewingPhotoRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">
                    Official Field Attendance & Geotag Verification Sheet
                  </h3>
                  <p className="text-xs text-slate-400">
                    Supervisor #{viewingPhotoRecord.supervisorId} • {viewingPhotoRecord.fullName} • {viewingPhotoRecord.area === "Mandaue City" || viewingPhotoRecord.area === "5" || !viewingPhotoRecord.area ? "Mandaue City" : `Area ${viewingPhotoRecord.area}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingPhotoRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Bond Paper 2-Column Body */}
            <div className="overflow-y-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/50">
              {/* Left Column: Visual Photo Proof */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={14} className="text-emerald-700" />
                    <span>Visual Field Photo Proof</span>
                  </label>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    Verified Camera Capture
                  </span>
                </div>

                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-950 shadow-md flex items-center justify-center aspect-4/3 max-h-[380px]">
                  <img
                    src={viewingPhotoRecord.photoProof}
                    alt="Supervisor Proof"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white text-[11px] px-3 py-1 rounded-lg border border-white/20">
                    Time In: <strong className="font-mono text-emerald-300">{viewingPhotoRecord.timeIn}</strong>
                  </div>
                </div>

                {/* Supervisor details bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Supervisor:</span>
                    <span className="font-bold text-slate-900">{viewingPhotoRecord.fullName} (#{viewingPhotoRecord.supervisorId})</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Attendance Status:</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {viewingPhotoRecord.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Assigned Sector:</span>
                    <span className="font-bold text-slate-800">{viewingPhotoRecord.area === "Mandaue City" || viewingPhotoRecord.area === "5" || !viewingPhotoRecord.area ? "Mandaue City" : `Area ${viewingPhotoRecord.area}`}</span>
                  </div>
                  {viewingPhotoRecord.remarks && (
                    <div className="pt-1 text-[11px] text-slate-600 italic">
                      Remarks: "{viewingPhotoRecord.remarks}"
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Interactive Map Pin */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-700" />
                    <span>Real-Time Satellite & Street Map Pin</span>
                  </label>
                  {viewingPhotoRecord.latitude && viewingPhotoRecord.longitude && (
                    <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {Number(viewingPhotoRecord.latitude)?.toFixed(4)}, {Number(viewingPhotoRecord.longitude)?.toFixed(4)}
                    </span>
                  )}
                </div>

                {/* Map Embed or No GPS State */}
                {viewingPhotoRecord.latitude && viewingPhotoRecord.longitude ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md aspect-4/3 max-h-[380px] bg-slate-100">
                    <iframe
                      title="Supervisor Geotag Map"
                      src={`https://maps.google.com/maps?q=${viewingPhotoRecord.latitude},${viewingPhotoRecord.longitude}&hl=en&z=17&output=embed`}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white aspect-4/3 max-h-[380px] flex flex-col items-center justify-center p-6 text-center text-slate-400">
                    <MapPin size={36} className="text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-600">No GPS coordinates recorded</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      This check-in did not include satellite GPS coordinates.
                    </p>
                  </div>
                )}

                {/* Geotag Details Box */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                  {viewingPhotoRecord.latitude && viewingPhotoRecord.longitude ? (
                    <>
                      <div className="flex items-center justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Exact Coordinates:</span>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {Number(viewingPhotoRecord.latitude)?.toFixed(6)}, {Number(viewingPhotoRecord.longitude)?.toFixed(6)}
                        </span>
                      </div>
                      {viewingPhotoRecord.locationAccuracy && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500 font-medium">Satellite Accuracy:</span>
                          <span className="font-bold text-slate-800">±{viewingPhotoRecord.locationAccuracy}m radius (High Precision)</span>
                        </div>
                      )}
                      {viewingPhotoRecord.locationName && (
                        <div className="flex items-start justify-between py-1 border-b border-slate-100 gap-2">
                          <span className="text-slate-500 font-medium shrink-0">Area Landmark / Note:</span>
                          <span className="font-medium text-slate-800 text-right">{viewingPhotoRecord.locationName}</span>
                        </div>
                      )}
                    </>
                  ) : null}

                  <div className="pt-2 flex items-center gap-2">
                    {viewingPhotoRecord.latitude && viewingPhotoRecord.longitude && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${viewingPhotoRecord.latitude},${viewingPhotoRecord.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 transition shadow-xs"
                      >
                        <MapIcon size={14} />
                        <span>Open Fullscreen in Google Maps</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setViewingPhotoRecord(null)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Close Docket
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. FIELD CHECK-IN MODAL (BOND PAPER PROPORTION & LIVE MAP) ================= */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0 border-b border-emerald-700/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
                  <Camera size={22} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-extrabold tracking-tight">
                    Field Attendance & Geotag Capture Sheet
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Live camera shutter & interactive satellite GPS mapping • Cloud Verified
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulatorOpen(false)}
                className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Bond Paper 2-Column Form Body */}
            <form onSubmit={handleSubmitMobileCheckin} className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/50">
              {/* Left Column: Live Camera Viewfinder & Snapshot Preview */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera size={14} className="text-emerald-700" />
                    <span>1. Live Camera Proof (Snapshot Only)</span>
                  </label>

                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={switchCameraFacingMode}
                      className="text-[11px] font-bold text-slate-700 hover:text-emerald-700 inline-flex items-center gap-1 cursor-pointer bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 px-2.5 py-1 rounded-lg transition"
                      title="Switch Camera"
                    >
                      <RotateCw size={12} />
                      <span>{cameraFacingMode === "user" ? "Selfie Mode" : "Area Mode"}</span>
                    </button>
                  )}
                </div>

                {/* Hidden input strictly for direct mobile hardware camera intent */}
                <input
                  type="file"
                  ref={mobileCameraInputRef}
                  accept="image/*"
                  capture={cameraFacingMode}
                  onChange={handleMobileCameraCapture}
                  className="hidden"
                />

                {/* Viewfinder Window */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-4/3 max-h-[360px] flex items-center justify-center border-2 border-slate-800 shadow-inner">
                  {/* Live Video Feed */}
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`w-full h-full object-cover ${cameraFacingMode === "user" ? "scale-x-[-1]" : ""
                      } ${isCameraActive && !simPhotoUrl ? "block" : "hidden"}`}
                  />

                  {/* Captured Photo Preview */}
                  {simPhotoUrl && !isCameraActive && (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                      <img
                        src={simPhotoUrl}
                        alt="Captured Proof"
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-xl shadow-md flex items-center gap-1.5 border border-emerald-400">
                        <CheckCircle2 size={13} />
                        <span>Live Photo Captured</span>
                      </div>
                    </div>
                  )}

                  {/* Inactive State */}
                  {!isCameraActive && !simPhotoUrl && (
                    <div className="text-center p-6 text-slate-400 space-y-2">
                      <VideoOff size={36} className="mx-auto text-slate-500" />
                      <p className="text-xs font-bold text-slate-300">Live Camera is ready to start</p>
                      {cameraError ? (
                        <p className="text-[11px] text-amber-400 font-medium max-w-xs mx-auto">
                          {cameraError}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          Click below to start the camera or trigger phone camera.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Live Shutter Button on top of video */}
                  {isCameraActive && (
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={capturePhotoFromLiveCamera}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-extrabold shadow-xl inline-flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer border-2 border-white"
                      >
                        <Camera size={18} />
                        <span>Take Snapshot Now</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Viewfinder Controls & Mobile Trigger */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
                  {simPhotoUrl ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" />
                        <span>Snapshot locked & ready for submission</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => startLiveCamera(cameraFacingMode)}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RotateCw size={13} />
                        <span>Retake Photo</span>
                      </button>
                    </div>
                  ) : !isCameraActive ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startLiveCamera(cameraFacingMode)}
                        className="px-4 py-2 bg-[#008559] hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                      >
                        <Video size={14} />
                        <span>Open Live Viewfinder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => mobileCameraInputRef.current?.click()}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Camera size={14} />
                        <span>Device Camera App</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                        Camera Viewfinder Running
                      </span>
                      <button
                        type="button"
                        onClick={() => mobileCameraInputRef.current?.click()}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline"
                      >
                        Use Phone Camera App
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: GPS Location & Live Interactive Map Pin */}
              <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-700" />
                    <span>2. Satellite GPS & Live Area Map</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleGetBrowserGps}
                    disabled={isGettingGps}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs transition cursor-pointer"
                  >
                    <LocateFixed size={12} className={isGettingGps ? "animate-spin text-emerald-600" : ""} />
                    <span>{isGettingGps ? "Acquiring GPS..." : "Re-detect GPS"}</span>
                  </button>
                </div>

                {/* Select Supervisor */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Supervisor Identity
                  </label>
                  <select
                    value={simSupervisorId}
                    onChange={(e) => setSimSupervisorId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#008559] transition cursor-pointer shadow-2xs"
                  >
                    <optgroup label="STL Supervisors (Source API)">
                      {supervisorsList.map((s) => {
                        const count = agentStatsBySupervisor[String(s.id)]?.total || 0;
                        return (
                          <option key={s.id} value={s.id}>
                            #{s.id} - {s.fullName} ({count} Assigned Agents • {s.area === "Mandaue City" || s.area === "5" || !s.area ? "Mandaue City" : `Area ${s.area}`})
                          </option>
                        );
                      })}
                    </optgroup>
                    {fieldAccounts.length > 0 && (
                      <optgroup label="Field Monitoring Personnel">
                        {fieldAccounts.map((fm) => (
                          <option key={fm.id} value={fm.id}>
                            #{fm.id} - {fm.fullName} ({fm.area || "Mandaue City"})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* LIVE INTERACTIVE MAP DISPLAY */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md aspect-4/3 max-h-[260px] bg-slate-100 flex items-center justify-center">
                  {simLat && simLng ? (
                    <iframe
                      title="Field Location Live Map"
                      src={`https://maps.google.com/maps?q=${simLat},${simLng}&hl=en&z=17&output=embed`}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-2 text-slate-400">
                      <LocateFixed size={32} className="mx-auto text-slate-400" />
                      <p className="text-xs font-bold text-slate-600">Waiting for GPS Coordinates...</p>
                      <button
                        type="button"
                        onClick={handleGetBrowserGps}
                        className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition border border-emerald-200"
                      >
                        Click to Lock Device GPS
                      </button>
                    </div>
                  )}

                  {simLat && simLng && (
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-xs text-[10px] font-bold text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300 shadow-sm">
                      📍 Live Pin Locked
                    </div>
                  )}
                </div>

                {/* GPS Coordinates pill */}
                {simLat && simLng && (
                  <div className="flex items-center justify-between text-xs bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200">
                    <span className="font-mono text-emerald-950 font-bold">
                      📍 {simLat}, {simLng} {simLocationAccuracy ? `(±${simLocationAccuracy}m accuracy)` : ""}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${simLat},${simLng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>Google Maps</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}

                {/* Landmark Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Location Landmark / Area Note
                  </label>
                  <input
                    type="text"
                    value={simLocationName}
                    onChange={(e) => setSimLocationName(e.target.value)}
                    placeholder="e.g. Mandaue Central Station / Subangdaku"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#008559] transition shadow-2xs"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setIsSimulatorOpen(false)}
                    disabled={isSubmittingCheckIn}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingCheckIn || !simPhotoUrl}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm cursor-pointer ${!simPhotoUrl
                      ? "bg-slate-400 cursor-not-allowed opacity-70"
                      : "bg-[#008559] hover:bg-emerald-700 shadow-md"
                      }`}
                  >
                    {isSubmittingCheckIn ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Syncing to Supabase Cloud...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>{simPhotoUrl ? "Submit Field Attendance" : "Capture Photo First"}</span>
                      </>
                    )}
                  </button>
                </div>
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
                    <option value="Mandaue City">Mandaue City</option>
                    <option value="1">Area 1 - Subangdaku</option>
                    <option value="2">Area 2 - Centro</option>
                    <option value="3">Area 3 - Basak</option>
                    <option value="4">Area 4 - Tipolo</option>
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
      {/* ================= FIELD MONITORING ACCOUNTS MANAGEMENT MODAL ================= */}
      {isFieldAccountsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 mb-0.5">
                    <Sparkles size={10} />
                    <span>System Discretion Accounts</span>
                  </div>
                  <h3 className="text-base font-black text-white">
                    Field Monitoring Accounts Management
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFieldAccountsModalOpen(false);
                  setEditingFieldAccountId(null);
                }}
                className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar flex-1">
              {/* Add / Edit Form Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <UserPlus size={14} className="text-emerald-600" />
                    <span>{editingFieldAccountId ? "Edit Field Monitoring Account" : "Add New Field Monitoring Account"}</span>
                  </h4>
                  {editingFieldAccountId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFieldAccountId(null);
                        setFieldAccountForm({ fullName: "", username: "", password: "", area: "Mandaue City" });
                        setFieldAccountFormError("");
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                    >
                      Cancel Edit (Create New Instead)
                    </button>
                  )}
                </div>

                {fieldAccountFormError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{fieldAccountFormError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveFieldAccount} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={fieldAccountForm.fullName}
                      onChange={(e) => setFieldAccountForm({ ...fieldAccountForm, fullName: e.target.value })}
                      placeholder="e.g. JUAN DELA CRUZ / MONITOR 02"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-emerald-600 uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Assigned Area / Sector *
                    </label>
                    <select
                      value={fieldAccountForm.area}
                      onChange={(e) => setFieldAccountForm({ ...fieldAccountForm, area: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                    >
                      <option value="Mandaue City">Mandaue City (General Operations)</option>
                      <option value="Area 1 - Subangdaku / SIMCON">Area 1 - Subangdaku / SIMCON</option>
                      <option value="Area 2 - Centro & Cabancalan">Area 2 - Centro & Cabancalan</option>
                      <option value="Area 3 - Basak & Canduman">Area 3 - Basak & Canduman</option>
                      <option value="Area 4 - Tipolo & Guiso">Area 4 - Tipolo & Guiso</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Login Username *
                    </label>
                    <input
                      type="text"
                      value={fieldAccountForm.username}
                      onChange={(e) => setFieldAccountForm({ ...fieldAccountForm, username: e.target.value })}
                      placeholder="e.g. monitor.mandaue2"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-emerald-600 lowercase"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Login Password *
                    </label>
                    <div className="relative">
                      <input
                        type={fieldAccountShowPasswords["new"] ? "text" : "password"}
                        value={fieldAccountForm.password}
                        onChange={(e) => setFieldAccountForm({ ...fieldAccountForm, password: e.target.value })}
                        placeholder="e.g. Password123!"
                        className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => toggleAccountPasswordVisibility("new")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        {fieldAccountShowPasswords["new"] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="sm:col-span-2 pt-1 flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      disabled={isSubmittingFieldAccount}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#008559] hover:bg-emerald-700 text-white font-black text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Save size={14} />
                      <span>{isSubmittingFieldAccount ? "Saving to Cloud..." : editingFieldAccountId ? "Update Account" : "Add Account"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Registered Accounts List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Active Field Monitoring Accounts ({fieldAccounts.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Credentials synced with HRHub Cloud
                  </span>
                </div>

                {fieldAccounts.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                    Walang naka-register na Field Monitoring accounts. Gamitin ang form sa itaas para mag-add.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {fieldAccounts.map((acc) => (
                      <div key={acc.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            FM
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-slate-900 text-xs truncate">{acc.fullName}</p>
                              <span className="px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[9px] font-black uppercase tracking-wider">
                                {acc.id}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5 font-medium">
                              <span>📍 {acc.area}</span>
                              <span>•</span>
                              <span>User: <strong className="font-mono text-slate-800">{acc.username}</strong></span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono">
                                Pass:{" "}
                                <strong className="text-slate-800">
                                  {fieldAccountShowPasswords[acc.id] ? acc.password : "••••••••"}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => toggleAccountPasswordVisibility(acc.id)}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                  title="Toggle password view"
                                >
                                  {fieldAccountShowPasswords[acc.id] ? <EyeOff size={11} /> : <Eye size={11} />}
                                </button>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleCopyPwaLink(acc)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200/80 transition cursor-pointer"
                            title="Copy PWA Link with Instructions"
                          >
                            <Smartphone size={12} />
                            <span>Copy Link</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEditFieldAccount(acc)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                            title="Edit Account"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteFieldAccount(acc)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                            title="Delete Account"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between text-xs text-slate-500">
              <p className="text-[11px]">
                💡 Ang mga account na ito ay awtomatikong makakapag-login sa <strong>HRHub Mobile PWA</strong>.
              </p>
              <button
                type="button"
                onClick={() => setIsFieldAccountsModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FLOATING TOAST: COPIED PWA NOTICE ================= */}
      {copiedPwaNotice && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="flex-1 text-xs">
            <p className="font-bold text-emerald-400">PWA Mobile Link Copied!</p>
            <p className="text-slate-300 text-[11px] mt-0.5 leading-snug">{copiedPwaNotice}</p>
          </div>
          <button
            onClick={() => setCopiedPwaNotice("")}
            className="text-slate-400 hover:text-white p-1"
          >
            <X size={15} />
          </button>
        </div>
      )}

    </div>
  );
}
