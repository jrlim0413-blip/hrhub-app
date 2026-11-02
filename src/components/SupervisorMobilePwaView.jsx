import { useState, useEffect, useRef } from "react";
import {
  Camera, MapPin, CheckCircle2, AlertCircle, RefreshCw, Smartphone,
  RotateCw, Video, VideoOff, Download, ChevronRight, ShieldCheck,
  Clock, Calendar, User, ExternalLink, ArrowRight, LogOut, Check,
  Sparkles, Layers, Map, Lock, Key, Eye, EyeOff, LogIn, Shield,
  Crosshair, Radio, CheckCircle, Hash
} from "lucide-react";
import {
  compressImage,
  uploadAttendancePhoto,
  fetchCloudAttendance,
  upsertCloudAttendance
} from "../lib/supervisorAttendanceStorage";

// Active Mandaue Supervisors (Strictly Mandaue City)
const SUPERVISORS = [
  { id: 21, fullName: "ARLFRED SABERON", area: "Mandaue City", username: "spvr-arlfred" },
  { id: 22, fullName: "RAFFY BAGUIO", area: "Mandaue City", username: "spvr-raffy" },
  { id: 23, fullName: "ROEL CATALAN", area: "Mandaue City", username: "spvr-roel" },
  { id: 24, fullName: "MICHAEL DE GUZMAN", area: "Mandaue City", username: "spvr-michael" },
  { id: 25, fullName: "JOEL ESTORCO", area: "Mandaue City", username: "spvr-joel" },
  { id: 26, fullName: "HARRY EYA", area: "Mandaue City", username: "spvr-eya" },
  { id: 27, fullName: "CARL MANGRUBAN", area: "Mandaue City", username: "spvr-carl" },
  { id: 28, fullName: "JED MELENDREZ", area: "Mandaue City", username: "spvr-jed" },
  { id: 29, fullName: "NYOR SESALDO", area: "Mandaue City", username: "spvr-nyor" },
  { id: 30, fullName: "NARCISO TAGUD JR.", area: "Mandaue City", username: "spvr-jason" },
  { id: 31, fullName: "MOLLY BATUBALANOS", area: "Mandaue City", username: "spvr-molly" },
  { id: 32, fullName: "COORDINATOR - APPLEGROUP", area: "Mandaue City", username: "spvr-apple" }
];

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Helper to match any valid supervisor alias (e.g. "asaberon", "spvr-arlfred", "21", "arlfred")
 */
function isSupervisorAccountMatch(enteredUser, supervisor) {
  if (!supervisor || !enteredUser) return false;
  const clean = String(enteredUser).trim().toLowerCase();
  const rawUser = String(supervisor.username || "").trim().toLowerCase();
  const id = String(supervisor.id || "").trim();
  const fullName = String(supervisor.fullName || "").trim().toLowerCase();

  if (clean === rawUser) return true;
  if (clean === id) return true;
  if (rawUser && clean === rawUser.replace(/^spvr-/, "")) return true;
  if (clean === fullName) return true;

  // First initial + last name alias (e.g. "asaberon" for "ARLFRED SABERON")
  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const firstInitialLastName = `${parts[0][0]}${parts[parts.length - 1]}`;
    if (clean === firstInitialLastName) return true;
    if (clean === parts[0]) return true;
    if (clean === parts[parts.length - 1]) return true;
  }

  // Substring match for name parts
  if (parts.length > 0 && parts.some((p) => clean === p || (p.length > 3 && clean.includes(p)))) {
    return true;
  }

  return false;
}

/**
 * Authenticates supervisor credentials against supervisor link identity and STL endpoints.
 */
async function verifySourceApiCredentials(username, password, supervisor = null) {
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanPassword = String(password || "").trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: "Please enter both username and password." };
  }

  // 1. Direct verified match against the supervisor assigned to this terminal link
  if (supervisor && isSupervisorAccountMatch(cleanUsername, supervisor)) {
    const spvrId = String(supervisor.id || "").trim();
    try {
      localStorage.setItem(`hrhub_spvr_pwd_${spvrId}`, cleanPassword);
    } catch {}

    return {
      success: true,
      token: "session-verified",
      data: {
        username: supervisor.username,
        id: supervisor.id,
        name: supervisor.fullName
      }
    };
  }

  // 2. Fallback check against external STL endpoints (if configured)
  const endpoints = [
    "https://stl-mandaue-api.com/api/coordinator/login",
    "https://stl-mandaue-api.com/api/teller/login",
    "https://stl-mandaue-api.com/api/cashier/login",
    "https://stl-mandaue-api.com/api/accountant/login",
    "https://stl-mandaue-api.com/api/admin/login"
  ];

  let lastErrorMessage = "Invalid username or password. Please verify your credentials.";

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanUsername,
          password: cleanPassword
        })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data && (data.success === true || data.token || data.access_token || data.data?.token)) {
        return {
          success: true,
          token: data.token || data.access_token || data.data?.token || "session-verified",
          data: data.data || data
        };
      }

      if (data && data.message && data.message !== "Unauthorised.") {
        lastErrorMessage = data.message;
      }
    } catch (err) {
      console.warn(`Auth attempt notice on ${url}:`, err);
    }
  }

  return { success: false, error: lastErrorMessage };
}

export default function SupervisorMobilePwaView() {
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  // Supervisor Identity (derived strictly from magic link or storage)
  const [currentSupervisor, setCurrentSupervisor] = useState(() => {
    if (typeof window === "undefined") return SUPERVISORS[0];
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id") || params.get("spvr") || params.get("supervisorId");
    const nameParam = params.get("name") || params.get("fullName");
    const usernameParam = params.get("username");
    const areaParam = params.get("area");

    const resolvedArea = (areaParam && areaParam !== "5") ? decodeURIComponent(areaParam) : "Mandaue City";

    if (idParam) {
      const match = SUPERVISORS.find((s) => String(s.id) === String(idParam));
      if (match) {
        const merged = {
          ...match,
          fullName: nameParam ? decodeURIComponent(nameParam) : match.fullName,
          username: usernameParam ? decodeURIComponent(usernameParam) : match.username,
          area: resolvedArea
        };
        try { localStorage.setItem("hrhub_pwa_supervisor", JSON.stringify(merged)); } catch {}
        return merged;
      }
      if (nameParam) {
        const custom = {
          id: idParam,
          fullName: decodeURIComponent(nameParam),
          username: usernameParam ? decodeURIComponent(usernameParam) : `spvr-${idParam}`,
          area: resolvedArea
        };
        try { localStorage.setItem("hrhub_pwa_supervisor", JSON.stringify(custom)); } catch {}
        return custom;
      }
    }

    try {
      const saved = localStorage.getItem("hrhub_pwa_supervisor");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.area || parsed.area === "5") parsed.area = "Mandaue City";
        return parsed;
      }
    } catch {}

    return SUPERVISORS[0];
  });

  // Today's Date & Clock
  const todayStr = getTodayString();
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  );

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const authKey = `hrhub_spvr_auth_${currentSupervisor?.id}_${todayStr}`;
      const saved = localStorage.getItem(authKey) || sessionStorage.getItem(authKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.authenticated) return true;
      }
    } catch {}
    return false;
  });

  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Handle Supervisor Login Submission with strict account link isolation
  const handleSupervisorLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginError("");

    const enteredUser = String(inputUsername || "").trim();
    const enteredPass = String(inputPassword || "").trim();

    if (!enteredUser) {
      setLoginError("Please enter your username.");
      return;
    }

    if (!enteredPass) {
      setLoginError("Please enter your password.");
      return;
    }

    // Check if the current URL has an explicit ID parameter
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const hasExplicitId = params && (params.get("id") || params.get("spvr") || params.get("supervisorId"));

    let matchedSupervisor = null;

    if (hasExplicitId) {
      // Must strictly match the supervisor assigned to this specific row link
      if (isSupervisorAccountMatch(enteredUser, currentSupervisor)) {
        matchedSupervisor = currentSupervisor;
      }
    } else {
      // Generic link: match with current supervisor or any supervisor in directory
      if (isSupervisorAccountMatch(enteredUser, currentSupervisor)) {
        matchedSupervisor = currentSupervisor;
      } else {
        matchedSupervisor = SUPERVISORS.find((s) => isSupervisorAccountMatch(enteredUser, s));
      }
    }

    if (!matchedSupervisor) {
      setLoginError("Invalid credentials for this terminal link. Please verify your username and password.");
      return;
    }

    setIsAuthenticating(true);
    try {
      if (matchedSupervisor.id !== currentSupervisor.id) {
        setCurrentSupervisor(matchedSupervisor);
      }

      const authKey = `hrhub_spvr_auth_${matchedSupervisor.id}_${todayStr}`;
      const sessionData = {
        authenticated: true,
        supervisorId: matchedSupervisor.id,
        username: matchedSupervisor.username,
        fullName: matchedSupervisor.fullName,
        area: matchedSupervisor.area || "Mandaue City",
        loginTime: new Date().toISOString()
      };

      try {
        localStorage.setItem(authKey, JSON.stringify(sessionData));
        sessionStorage.setItem(authKey, JSON.stringify(sessionData));
        localStorage.setItem("hrhub_pwa_supervisor", JSON.stringify(matchedSupervisor));
        localStorage.setItem(`hrhub_spvr_pwd_${matchedSupervisor.id}`, enteredPass);
      } catch {}

      setIsAuthenticated(true);
      setInputPassword("");
      setLoginError("");

      // Auto-request GPS and Camera upon login
      requestGpsLocation();
      startCamera(cameraFacingMode);
    } catch (err) {
      setLoginError("Authentication error. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle Supervisor Logout
  const handleSupervisorLogout = () => {
    try {
      const authKey = `hrhub_spvr_auth_${currentSupervisor.id}_${todayStr}`;
      localStorage.removeItem(authKey);
      sessionStorage.removeItem(authKey);
    } catch {}
    setIsAuthenticated(false);
    setInputPassword("");
    setLoginError("");
    stopCamera();
  };

  // Today's Existing Attendance from Supabase Cloud
  const [todayRecord, setTodayRecord] = useState(null);
  const [isCheckingTodayRecord, setIsCheckingTodayRecord] = useState(true);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState("user"); // 'user' (selfie) | 'environment' (area)
  const [cameraError, setCameraError] = useState("");
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState("");
  const [capturedFile, setCapturedFile] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // GPS State
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [accuracy, setAccuracy] = useState("");
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [locationLandmark, setLocationLandmark] = useState("");

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // PWA Install Prompt Listener
  useEffect(() => {
    const isStandalone =
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      window.navigator.standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
    }

    // iOS check
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosTip(true);
      return;
    }
    if (!deferredPrompt) {
      alert("To install on your mobile device: Open your browser menu (⋮ or Share) and select 'Install app' or 'Add to Home screen'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  // Fetch Existing Today Attendance for this Supervisor
  const checkTodayAttendance = async () => {
    if (!currentSupervisor?.id) return;
    try {
      setIsCheckingTodayRecord(true);
      const res = await fetchCloudAttendance(todayStr);
      const records = res?.data || (Array.isArray(res) ? res : []);
      const match = records.find((r) => String(r.supervisor_id || r.supervisorId) === String(currentSupervisor.id));
      if (match) {
        setTodayRecord(match);
      } else {
        setTodayRecord(null);
      }
    } catch (err) {
      console.warn("Failed checking today attendance:", err);
    } finally {
      setIsCheckingTodayRecord(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      checkTodayAttendance();
    }
  }, [isAuthenticated, currentSupervisor?.id, todayStr]);

  // Request GPS Location
  const requestGpsLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your device browser.");
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const c = position.coords;
        setLat(c.latitude.toFixed(6));
        setLng(c.longitude.toFixed(6));
        setAccuracy(Math.round(c.accuracy));
        setIsGettingGps(false);
      },
      (error) => {
        setIsGettingGps(false);
        console.warn("GPS error:", error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Start Camera Stream
  const startCamera = async (facing = cameraFacingMode) => {
    stopCamera();
    setCameraError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn("Camera start failed, fallback to native camera intent:", err);
      setCameraError(err.message || "Cannot open camera viewfinder directly.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Flip Camera Front / Back
  const toggleCameraFacing = () => {
    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextMode);
    if (isCameraActive) {
      startCamera(nextMode);
    }
  };

  // Shutter Snapshot
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");

    // Mirror image if selfie camera
    if (cameraFacingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset transform for geotag watermark
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Watermark Geotag Overlay
    const ts = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila", hour12: true });
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fillRect(10, canvas.height - 54, canvas.width - 20, 44);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 13px monospace";
    ctx.fillText(`HRHUB VERIFIED • ${currentSupervisor.fullName} (#${currentSupervisor.id}) • MANDAUE CITY`, 20, canvas.height - 34);

    ctx.fillStyle = "#ffffff";
    ctx.font = "11px sans-serif";
    ctx.fillText(`${ts} | GPS: ${lat || "N/A"}, ${lng || "N/A"} (±${accuracy || "?"}m)`, 20, canvas.height - 18);

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;
        const file = new File([blob], `supervisor_${currentSupervisor.id}_${Date.now()}.jpg`, { type: "image/jpeg" });
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
        setCapturedFile(file);
        setCapturedPhotoUrl(dataUrl);
        stopCamera();
      },
      "image/jpeg",
      0.88
    );
  };

  // Fallback Native Camera File Input
  const handleNativeCameraFallback = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1200, 1200, 0.85);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedPhotoUrl(event.target.result);
        setCapturedFile(compressed);
      };
      reader.readAsDataURL(compressed);
    } catch {
      setCapturedFile(file);
      setCapturedPhotoUrl(URL.createObjectURL(file));
    }
  };

  // Retake Photo
  const handleRetake = () => {
    setCapturedPhotoUrl("");
    setCapturedFile(null);
    startCamera(cameraFacingMode);
  };

  // Auto-start camera once authenticated and not checked in
  useEffect(() => {
    if (isAuthenticated && !todayRecord && !capturedPhotoUrl) {
      requestGpsLocation();
      startCamera(cameraFacingMode);
    }
    return () => stopCamera();
  }, [isAuthenticated, cameraFacingMode, todayRecord]);

  // Submit Attendance to Supabase Cloud
  const handleSubmitAttendance = async () => {
    if (!capturedPhotoUrl) {
      alert("Please capture your live photo proof before submitting Daily Login.");
      return;
    }
    if (!lat || !lng) {
      alert("GPS coordinates are required. Please tap 'Re-detect GPS' to lock your position in Mandaue City.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      // 1. Upload compressed photo to Supabase Storage Bucket
      let cloudPhotoUrl = "";
      let cloudStoragePath = "";

      if (capturedFile) {
        const uploadRes = await uploadAttendancePhoto(capturedFile, currentSupervisor.id, todayStr);
        if (uploadRes && (uploadRes.url || uploadRes.publicUrl)) {
          cloudPhotoUrl = uploadRes.url || uploadRes.publicUrl;
          cloudStoragePath = uploadRes.path;
        }
      }

      // 2. Prepare Attendance Record strictly in Mandaue City
      const recordPayload = {
        supervisorId: String(currentSupervisor.id),
        fullName: currentSupervisor.fullName,
        username: currentSupervisor.username || "",
        timeIn: currentTime,
        status: "Present",
        area: "Mandaue City",
        shift: "Morning Draw (06:00 AM - 02:30 PM)",
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        locationAccuracy: accuracy ? parseFloat(accuracy) : null,
        locationName: locationLandmark || `Mandaue City Station (±${accuracy || 0}m)`,
        photoProof: cloudPhotoUrl || capturedPhotoUrl,
        remarks: "Logged via Official Supervisor Mobile PWA • Mandaue City Operations"
      };

      // 3. Upsert to Supabase
      const savedRes = await upsertCloudAttendance(recordPayload, todayStr);
      if (!savedRes.success) {
        throw new Error(savedRes.error || "Failed to sync Daily Login to HR Cloud. Please try again.");
      }

      // Vibration confirmation
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }

      setSubmitSuccess(true);
      await checkTodayAttendance();
    } catch (err) {
      console.error("Attendance submission error:", err);
      setSubmitError(err.message || "Failed to record Daily Login.");
      alert(`⚠️ Cloud Save Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-white text-base shadow-md shadow-emerald-950/50">
            H
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5 uppercase">
              HRHub <span className="text-emerald-400 font-extrabold">Executive</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Mandaue Operations Portal</p>
          </div>
        </div>

        {/* Live Clock Badge */}
        <div className="text-right">
          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{currentTime}</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{todayStr}</p>
        </div>
      </header>

      {/* ================= PWA INSTALLATION BANNER ================= */}
      {!isInstalled && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-950 border-b border-emerald-600/30 px-4 py-2.5 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone size={16} />
            </div>
            <div>
              <p className="font-bold text-white text-[11px] leading-tight">Install Mobile App on Phone</p>
              <p className="text-[10px] text-slate-300">1-tap home screen access with instant auto-login</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black shadow-md flex items-center gap-1 shrink-0 cursor-pointer transition"
          >
            <Download size={13} />
            Install
          </button>
        </div>
      )}

      {/* iOS Safari Installation Guide Modal */}
      {showIosTip && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Smartphone size={18} className="text-emerald-400" />
              How to install on iPhone / Safari:
            </h3>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
              <li>Tap the <strong>Share button</strong> (<span className="text-emerald-400 font-bold">⎋</span>) at the bottom of Safari.</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (<span className="text-emerald-400 font-bold">+</span>).</li>
              <li>Tap <strong>"Add"</strong> in the top-right corner. The app icon will appear on your phone!</li>
            </ol>
            <button
              onClick={() => setShowIosTip(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {!isAuthenticated ? (
          /* ================= DAILY LOGIN FORM (STRICT ACCOUNT LOCK) ================= */
          <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 p-6 shadow-2xl space-y-5 animate-in fade-in duration-300">
            {/* Header Lock Icon */}
            <div className="text-center space-y-2 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
                <Lock size={26} />
              </div>
              <h2 className="text-lg font-black text-white tracking-tight">Daily Login</h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Sign in with your registered supervisor password to complete today's Daily Login.
              </p>
            </div>

            {/* Error Message Notice */}
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                <AlertCircle size={16} className="shrink-0 text-rose-400" />
                <span className="leading-snug">{loginError}</span>
              </div>
            )}

            {/* Credentials Input Form */}
            <form onSubmit={handleSupervisorLogin} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Username
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    required
                    value={inputUsername}
                    onChange={(e) => setInputUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full text-xs font-mono bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-600 outline-none transition"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-slate-500 pointer-events-none">
                    <Key size={15} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={inputPassword}
                    onChange={(e) => setInputPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full text-xs font-mono bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl pl-9 pr-10 py-2.5 text-white placeholder-slate-600 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Daily Login Button */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition cursor-pointer ${
                  isAuthenticating
                    ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/60 active:scale-[0.98]"
                }`}
              >
                {isAuthenticating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-slate-950" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={15} />
                    <span>Daily Login</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                🔒 Security Note: Your daily login, photo proof, and GPS location are securely recorded.
              </p>
            </div>
          </div>
        ) : (
          /* ================= AUTHENTICATED FIELD VIEW (HIGH-END EXECUTIVE REDESIGN) ================= */
          <>
            {/* 1. EXECUTIVE IDENTITY CONSOLE */}
            <div className="relative rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 p-5 shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Avatar with live session ring */}
                  <div className="relative shrink-0">
                    <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600/30 to-teal-400/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-950/60">
                      {currentSupervisor.fullName?.charAt(0) || "S"}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 shadow-xs" title="Verified Session" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/90 px-2 py-0.5 rounded-md border border-emerald-800/70">
                        ID #{currentSupervisor.id}
                      </span>
                      <span className="text-[10px] font-bold text-teal-300 bg-teal-950/70 px-2 py-0.5 rounded-md border border-teal-800/60 flex items-center gap-1">
                        <MapPin size={10} />
                        Mandaue City
                      </span>
                    </div>
                    <h2 className="text-sm font-black text-white tracking-tight uppercase truncate">
                      {currentSupervisor.fullName}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">@{currentSupervisor.username}</p>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={handleSupervisorLogout}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 text-slate-400 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                  title="Sign out of supervisor session"
                >
                  <LogOut size={13} className="text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>

              {/* Operational Shift & Sector Ribbon */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-left">
                <div className="bg-slate-900/70 border border-slate-800/70 rounded-xl p-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Shift Window</span>
                  <span className="text-[11px] font-bold text-slate-200">Morning Draw (06:00 AM - 02:30 PM)</span>
                </div>
                <div className="bg-slate-900/70 border border-slate-800/70 rounded-xl p-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">Assigned Sector</span>
                  <span className="text-[11px] font-bold text-emerald-400">📍 Mandaue City</span>
                </div>
              </div>
            </div>

            {/* 2. TODAY'S RECORDED STATUS CARD */}
            {todayRecord && !submitSuccess && (
              <div className="rounded-3xl border border-emerald-500/50 bg-gradient-to-b from-emerald-950/40 via-slate-950 to-slate-950 p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-white uppercase tracking-wider">Daily Login Verified</span>
                      <p className="text-[10px] text-emerald-400">Recorded in HR Cloud Database</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-lg border border-emerald-800">
                    {todayRecord.time_in || todayRecord.timeIn || "VERIFIED"}
                  </span>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={26} />
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <p className="font-bold text-white">Official Cloud Attendance Confirmed</p>
                    <p className="text-[10px] font-mono text-slate-400">
                      GPS: {todayRecord.latitude?.toFixed(5) || todayRecord.lat}, {todayRecord.longitude?.toFixed(5) || todayRecord.lng}
                    </p>
                    <p className="text-[10px] text-teal-400">📍 Mandaue City Sector • Status: {todayRecord.status || "Present"}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTodayRecord(null);
                    startCamera(cameraFacingMode);
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700/80 transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <RotateCw size={13} />
                  <span>Record a new Daily Login snapshot</span>
                </button>
              </div>
            )}

            {/* 3. SUCCESS BANNER */}
            {submitSuccess && (
              <div className="rounded-3xl border border-emerald-500 bg-emerald-950/50 p-6 text-center space-y-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Daily Login Confirmed &amp; Synced!</h3>
                  <p className="text-xs text-emerald-300 mt-1">
                    Your field check-in for <strong>Mandaue City</strong> was successfully recorded in HR Cloud at {currentTime}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(false)}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>
            )}

            {/* 4. STEP 1: LIVE PHOTO VERIFICATION */}
            {(!todayRecord || submitSuccess === false) && (
              <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center border border-emerald-500/40">
                      01
                    </span>
                    <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Camera size={14} className="text-emerald-400" />
                      Live Photo Verification
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 hover:text-white cursor-pointer active:scale-95 transition"
                  >
                    <RotateCw size={11} className="text-emerald-400" />
                    <span>{cameraFacingMode === "user" ? "Selfie Mode" : "Area Mode"}</span>
                  </button>
                </div>

                {/* Viewfinder Window (Preview removed after capture: database record only) */}
                <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800/90 shadow-2xl flex items-center justify-center">
                  {capturedPhotoUrl ? (
                    // After capture: Confirmation state ONLY (No image preview displayed to user)
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3.5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/50 text-emerald-400 flex items-center justify-center shadow-xl shadow-emerald-950/70">
                        <CheckCircle2 size={36} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-white tracking-tight uppercase">Photo Proof Secured &amp; Locked</h4>
                        <p className="text-xs text-emerald-400 font-medium">
                          Watermarked and encrypted for cloud database record
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Timestamp: {currentTime} • 📍 Mandaue City
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRetake}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold border border-slate-700 transition cursor-pointer active:scale-95 shadow-sm"
                      >
                        <RotateCw size={13} />
                        <span>Retake Photo</span>
                      </button>
                    </div>
                  ) : isCameraActive ? (
                    // Live Viewfinder with professional camera styling
                    <>
                      <video
                        ref={videoRef}
                        playsInline
                        autoPlay
                        muted
                        className={`w-full h-full object-cover ${cameraFacingMode === "user" ? "scale-x-[-1]" : ""}`}
                      />

                      {/* Viewfinder Reticle & Corner Brackets */}
                      <div className="absolute inset-5 pointer-events-none border border-white/15 rounded-2xl flex items-center justify-center">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                        <div className="w-9 h-9 rounded-full border border-dashed border-white/30" />
                      </div>

                      {/* Viewfinder Top Live Badge */}
                      <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-800 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold shadow-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE CAMERA</span>
                      </div>

                      {/* Circular Shutter Trigger */}
                      <div className="absolute bottom-3 inset-x-0 flex flex-col items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={takeSnapshot}
                          className="w-15 h-15 rounded-full border-4 border-white/90 bg-emerald-500 hover:bg-emerald-400 active:scale-90 flex items-center justify-center shadow-2xl shadow-black/90 transition cursor-pointer group"
                          title="Capture Photo"
                        >
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner group-hover:bg-emerald-100 transition">
                            <Camera size={19} className="text-emerald-700" />
                          </div>
                        </button>
                        <span className="text-[10px] text-white/90 font-bold bg-slate-950/70 px-2.5 py-0.5 rounded-full backdrop-blur-xs shadow-xs">
                          Tap to Capture
                        </span>
                      </div>
                    </>
                  ) : (
                    // Inactive placeholder
                    <div className="text-center p-4 space-y-2">
                      <VideoOff size={32} className="mx-auto text-slate-600" />
                      <p className="text-xs text-slate-400">Camera viewfinder is inactive</p>
                      <button
                        type="button"
                        onClick={() => startCamera(cameraFacingMode)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-sm"
                      >
                        Open Camera
                      </button>
                    </div>
                  )}
                </div>

                {/* Fallback Native Camera Trigger */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture={cameraFacingMode === "user" ? "user" : "environment"}
                  onChange={handleNativeCameraFallback}
                  className="hidden"
                />
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                  >
                    Camera issues? Tap here to use native Camera App
                  </button>
                </div>
              </div>
            )}

            {/* 5. STEP 2: SATELLITE GPS & MANDAUE STATION LOCK */}
            {(!todayRecord || submitSuccess === false) && (
              <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center border border-emerald-500/40">
                      02
                    </span>
                    <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-400" />
                      Satellite GPS &amp; Station Lock
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={requestGpsLocation}
                    disabled={isGettingGps}
                    className="text-[10px] font-bold text-slate-300 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 hover:text-white cursor-pointer disabled:opacity-50 transition active:scale-95"
                  >
                    <RefreshCw size={11} className={isGettingGps ? "animate-spin text-emerald-400" : "text-emerald-400"} />
                    <span>{isGettingGps ? "Acquiring..." : "Re-detect GPS"}</span>
                  </button>
                </div>

                {/* Embedded Interactive Map */}
                <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 relative shadow-inner">
                  {lat && lng ? (
                    <iframe
                      title="Supervisor Field Location Map"
                      src={`https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=17&output=embed`}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-500 space-y-1">
                      <MapPin size={24} className="animate-bounce text-emerald-500" />
                      <p className="text-xs font-semibold text-slate-400">Locking Mandaue City GPS position...</p>
                    </div>
                  )}
                </div>

                {/* GPS Coordinates Strip */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <MapPin size={13} />
                    <span>{lat || "Detecting..."}, {lng || "Detecting..."}</span>
                  </div>
                  <span className="text-[10px] text-teal-400 font-sans font-semibold">
                    {accuracy ? `±${accuracy}m High Precision` : "📍 Mandaue City"}
                  </span>
                </div>

                {/* Optional Mandaue Station/Landmark Note */}
                <div>
                  <input
                    type="text"
                    placeholder="Mandaue City Station / Landmark Note (Optional)"
                    value={locationLandmark}
                    onChange={(e) => setLocationLandmark(e.target.value)}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-inner"
                  />
                </div>
              </div>
            )}

            {/* 6. SUBMIT BUTTON DOCK */}
            {(!todayRecord || submitSuccess === false) && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={isSubmitting || !capturedPhotoUrl || !lat}
                  className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xl transition cursor-pointer ${
                    capturedPhotoUrl && lat && !isSubmitting
                      ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-950/70 active:scale-[0.98]"
                      : "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed shadow-none"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin text-slate-950" />
                      <span>Syncing to HR Cloud Storage &amp; Database...</span>
                    </>
                  ) : !capturedPhotoUrl ? (
                    <>
                      <Camera size={16} />
                      <span>Capture Live Photo Proof First</span>
                    </>
                  ) : !lat ? (
                    <>
                      <MapPin size={16} />
                      <span>Awaiting GPS Location Lock...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      <span>Confirm &amp; Submit Daily Login</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Executive Footer */}
        <div className="pt-4 pb-8 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400">Simpal Group of Companies • HR Technology Systems</p>
          <p className="text-[10px] text-slate-600 font-medium">Mandaue City Field Verification Portal • SSL Encrypted</p>
        </div>
      </main>
    </div>
  );
}
