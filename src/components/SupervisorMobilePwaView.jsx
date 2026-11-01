import { useState, useEffect, useRef } from "react";
import {
  Camera, MapPin, CheckCircle2, AlertCircle, RefreshCw, Smartphone,
  RotateCw, Video, VideoOff, Download, ChevronRight, ShieldCheck,
  Clock, Calendar, User, ExternalLink, ArrowRight, LogOut, Check,
  Sparkles, Layers, Map
} from "lucide-react";
import {
  compressImage,
  uploadAttendancePhoto,
  fetchCloudAttendance,
  upsertCloudAttendance
} from "../lib/supervisorAttendanceStorage";

// Active Mandaue Supervisors for fallback selection
const SUPERVISORS = [
  { id: 21, fullName: "ARLFRED SABERON", area: "5", username: "asaberon" },
  { id: 22, fullName: "RAFFY BAGUIO", area: "5", username: "rbaguio" },
  { id: 23, fullName: "ROEL CATALAN", area: "5", username: "rcatalan" },
  { id: 24, fullName: "MICHAEL DE GUZMAN", area: "5", username: "mdeguzman" },
  { id: 25, fullName: "JOEL ESTORCO", area: "5", username: "jestorco" },
  { id: 26, fullName: "HARRY EYA", area: "5", username: "heya" },
  { id: 27, fullName: "CARL MANGRUBAN", area: "5", username: "cmangruban" },
  { id: 28, fullName: "JED MELENDREZ", area: "5", username: "jmelendrez" },
  { id: 29, fullName: "NYOR SESALDO", area: "5", username: "nsesaldo" },
  { id: 30, fullName: "NARCISO TAGUD JR.", area: "5", username: "ntagud" },
  { id: 31, fullName: "MOLLY BATUBALANOS", area: "5", username: "mbatubalanos" },
  { id: 32, fullName: "COORDINATOR - APPLEGROUP", area: "5", username: "applegroup" }
];

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function SupervisorMobilePwaView({ onExitToAdmin }) {
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);

  // Supervisor Identity
  const [currentSupervisor, setCurrentSupervisor] = useState(() => {
    if (typeof window === "undefined") return SUPERVISORS[0];
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id") || params.get("spvr") || params.get("supervisorId");
    const nameParam = params.get("name") || params.get("fullName");

    if (idParam) {
      const match = SUPERVISORS.find((s) => String(s.id) === String(idParam));
      if (match) {
        localStorage.setItem("hrhub_pwa_supervisor", JSON.stringify(match));
        return match;
      }
      if (nameParam) {
        const custom = { id: idParam, fullName: decodeURIComponent(nameParam), area: params.get("area") || "5" };
        localStorage.setItem("hrhub_pwa_supervisor", JSON.stringify(custom));
        return custom;
      }
    }

    try {
      const saved = localStorage.getItem("hrhub_pwa_supervisor");
      if (saved) return JSON.parse(saved);
    } catch {}

    return SUPERVISORS[0];
  });

  // Today's Date & Clock
  const todayStr = getTodayString();
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));

  // Live Philippine Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
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
      alert("Para i-download sa phone: I-click ang tatlong tuldok (⋮) sa browser at pindutin ang 'Install app' o 'Add to Home screen'.");
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
      const records = await fetchCloudAttendance(todayStr);
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
    checkTodayAttendance();
  }, [currentSupervisor?.id, todayStr]);

  // Auto-request GPS on Mount
  useEffect(() => {
    requestGpsLocation();
  }, []);

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
    ctx.fillText(`HRHUB VERIFIED • ${currentSupervisor.fullName} (#${currentSupervisor.id})`, 20, canvas.height - 34);

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

  // Fallback Camera File Input
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

  // Auto-start camera when mounting if not yet checked in
  useEffect(() => {
    if (!todayRecord && !capturedPhotoUrl) {
      startCamera(cameraFacingMode);
    }
    return () => stopCamera();
  }, [cameraFacingMode, todayRecord]);

  // Submit Attendance to Supabase Cloud
  const handleSubmitAttendance = async () => {
    if (!capturedPhotoUrl) {
      alert("Kailangan kumuha ng litrato gamit ang camera para sa attendance proof.");
      return;
    }
    if (!lat || !lng) {
      alert("Kailangan muna makuha ang GPS coordinates. Pindutin ang 'Re-detect GPS'.");
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
        if (uploadRes && uploadRes.publicUrl) {
          cloudPhotoUrl = uploadRes.publicUrl;
          cloudStoragePath = uploadRes.path;
        }
      }

      // 2. Prepare Attendance Record
      const recordPayload = {
        supervisor_id: String(currentSupervisor.id),
        supervisor_name: currentSupervisor.fullName,
        username: currentSupervisor.username || "",
        attendance_date: todayStr,
        time_in: currentTime,
        status: "Present",
        area: currentSupervisor.area || "5",
        shift: "Morning Draw (06:00 AM - 02:30 PM)",
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        location_accuracy: accuracy ? parseFloat(accuracy) : null,
        location_name: locationLandmark || `Field Check-In GPS (±${accuracy || 0}m)`,
        photo_url: cloudPhotoUrl || capturedPhotoUrl,
        photo_storage_path: cloudStoragePath || null,
        remarks: "Logged via Official Supervisor Mobile PWA"
      };

      // 3. Upsert to Supabase
      const saved = await upsertCloudAttendance(recordPayload);
      if (!saved) {
        throw new Error("Hindi na-save ang attendance sa cloud. Pakisubukang muli.");
      }

      // Vibration confirmation
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }

      setSubmitSuccess(true);
      await checkTodayAttendance();
    } catch (err) {
      console.error("Attendance submission error:", err);
      setSubmitError(err.message || "Failed to record attendance.");
      alert(`⚠️ Error sa pag-save: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-white text-base shadow-md shadow-emerald-950/50">
            H
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
              HRHub <span className="text-emerald-400">FIELD PWA</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Supervisor Attendance & Geotag</p>
          </div>
        </div>

        {/* Live Clock Badge */}
        <div className="text-right">
          <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {currentTime}
          </span>
          <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{todayStr}</p>
        </div>
      </header>

      {/* ================= PWA INSTALLATION PROMPT BANNER ================= */}
      {!isInstalled && (
        <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900 border-b border-emerald-600/30 px-4 py-2.5 flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone size={16} />
            </div>
            <div>
              <p className="font-bold text-white text-[11px] leading-tight">I-download bilang App sa Cellphone</p>
              <p className="text-[10px] text-slate-300">1-click access sa home screen nang hindi na naglo-login</p>
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full space-y-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Smartphone size={18} className="text-emerald-400" />
              Paano i-install sa iPhone / Safari:
            </h3>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
              <li>Pindutin ang <strong>Share button</strong> (<span className="text-emerald-400 font-bold">⎋</span>) sa ibaba ng Safari.</li>
              <li>I-scroll pababa at pindutin ang <strong>"Add to Home Screen"</strong> (<span className="text-emerald-400 font-bold">+</span>).</li>
              <li>Pindutin ang <strong>"Add"</strong> sa kanang itaas. Magkakaroon na ito ng app icon sa iyong cellphone!</li>
            </ol>
            <button
              onClick={() => setShowIosTip(false)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
            >
              Naiintindihan ko
            </button>
          </div>
        </div>
      )}

      {/* ================= MAIN CONTENT AREA ================= */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
        {/* Supervisor Identity Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base shrink-0">
              {currentSupervisor.fullName?.charAt(0) || "S"}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                  ID #{currentSupervisor.id}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Area {currentSupervisor.area || "5"}</span>
              </div>
              <h2 className="text-sm font-black text-white tracking-tight mt-0.5">{currentSupervisor.fullName}</h2>
            </div>
          </div>

          {/* Quick Supervisor Switcher Dropdown */}
          <select
            value={currentSupervisor.id}
            onChange={(e) => {
              const match = SUPERVISORS.find((s) => String(s.id) === e.target.value);
              if (match) {
                setCurrentSupervisor(match);
                localStorage.setItem("hrhub_pwa_supervisor", JSON.stringify(match));
                setCapturedPhotoUrl("");
                setCapturedFile(null);
                setSubmitSuccess(false);
              }
            }}
            className="text-[10px] bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            {SUPERVISORS.map((s) => (
              <option key={s.id} value={s.id}>
                #{s.id} {s.fullName.split(" ")[0]}
              </option>
            ))}
          </select>
        </div>

        {/* ================= TODAY'S STATUS CARD ================= */}
        {todayRecord && !submitSuccess && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span className="text-xs font-black text-emerald-300">Naka-Check In Ka Na Ngayong Araw!</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                {todayRecord.time_in || todayRecord.timeIn || "VERIFIED"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {(todayRecord.photo_url || todayRecord.photoUrl) && (
                <img
                  src={todayRecord.photo_url || todayRecord.photoUrl}
                  alt="Proof"
                  className="w-16 h-16 rounded-xl object-cover border border-emerald-500/40 shrink-0"
                />
              )}
              <div className="text-[11px] text-slate-300 space-y-1">
                <p className="font-semibold text-white">Katibayan: Cloud Geo-Verified</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  GPS: {todayRecord.latitude?.toFixed(5) || todayRecord.lat}, {todayRecord.longitude?.toFixed(5) || todayRecord.lng}
                </p>
                <p className="text-[10px] text-emerald-400">Status: {todayRecord.status || "Present"}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setTodayRecord(null);
                startCamera(cameraFacingMode);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCw size={13} />
              Mag-record ng panibagong time snapshot
            </button>
          </div>
        )}

        {/* ================= SUCCESS BANNER ================= */}
        {submitSuccess && (
          <div className="rounded-2xl border border-emerald-500 bg-emerald-950/50 p-5 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Attendance Confirmed &amp; Synced!</h3>
              <p className="text-xs text-emerald-300 mt-0.5">
                Opisyal nang naitala ang iyong field check-in sa HR Cloud ngayong {currentTime}.
              </p>
            </div>
            <button
              onClick={() => setSubmitSuccess(false)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Ok, Tapos na
            </button>
          </div>
        )}

        {/* ================= STEP 1: CAMERA PROOF ================= */}
        {(!todayRecord || submitSuccess === false) && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Camera size={14} className="text-emerald-400" />
                1. Live Camera Geotag Capture
              </span>
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg flex items-center gap-1 hover:text-white cursor-pointer"
              >
                <RotateCw size={11} />
                {cameraFacingMode === "user" ? "Selfie" : "Area"}
              </button>
            </div>

            {/* Viewfinder Window */}
            <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
              {capturedPhotoUrl ? (
                // Captured Photo Preview
                <img src={capturedPhotoUrl} alt="Captured Proof" className="w-full h-full object-cover" />
              ) : isCameraActive ? (
                // Live Viewfinder
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover ${cameraFacingMode === "user" ? "scale-x-[-1]" : ""}`}
                />
              ) : (
                // Inactive placeholder
                <div className="text-center p-4 space-y-2">
                  <VideoOff size={32} className="mx-auto text-slate-600" />
                  <p className="text-xs text-slate-400">Camera viewfinder is inactive</p>
                  <button
                    type="button"
                    onClick={() => startCamera(cameraFacingMode)}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg"
                  >
                    Buksan ang Camera
                  </button>
                </div>
              )}

              {/* Shutter Overlay Button when Camera Active */}
              {isCameraActive && !capturedPhotoUrl && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center">
                  <button
                    type="button"
                    onClick={takeSnapshot}
                    className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs shadow-xl shadow-emerald-950/60 flex items-center gap-2 cursor-pointer transition"
                  >
                    <Camera size={16} />
                    Kunan ng Litrato
                  </button>
                </div>
              )}
            </div>

            {/* Retake Control */}
            {capturedPhotoUrl && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                  <Check size={13} /> Litrato ay handa na
                </span>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 rounded-lg text-[10px] font-bold cursor-pointer"
                >
                  Ulitin ang Litrato
                </button>
              </div>
            )}

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
                Problema sa video? Pindutin ito para sa Phone Camera App
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: SATELLITE GPS & LIVE MAP ================= */}
        {(!todayRecord || submitSuccess === false) && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-400" />
                2. Satellite GPS &amp; Area Map Lock
              </span>
              <button
                type="button"
                onClick={requestGpsLocation}
                disabled={isGettingGps}
                className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg flex items-center gap-1 hover:text-white cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={11} className={isGettingGps ? "animate-spin text-emerald-400" : ""} />
                {isGettingGps ? "Nagde-detect..." : "Re-detect GPS"}
              </button>
            </div>

            {/* Embedded Interactive Map */}
            <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 relative">
              {lat && lng ? (
                <iframe
                  title="Supervisor Field Location Map"
                  src={`https://maps.google.com/maps?q=${lat},${lng}&hl=en&z=17&output=embed`}
                  className="w-full h-full border-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-500 space-y-1">
                  <MapPin size={24} className="animate-bounce text-slate-600" />
                  <p className="text-xs">Kinukuha ang iyong eksaktong GPS coordinates...</p>
                </div>
              )}
            </div>

            {/* GPS Metadata readout */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <MapPin size={13} />
                <span>{lat || "Detecting..."}, {lng || "Detecting..."}</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {accuracy ? `(±${accuracy}m accuracy)` : ""}
              </span>
            </div>

            {/* Optional Area/Landmark note */}
            <div>
              <input
                type="text"
                placeholder="Pangalan ng area / Landmark (Opsyonal)"
                value={locationLandmark}
                onChange={(e) => setLocationLandmark(e.target.value)}
                className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* ================= SUBMIT BUTTON ================= */}
        {(!todayRecord || submitSuccess === false) && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSubmitAttendance}
              disabled={isSubmitting || !capturedPhotoUrl || !lat}
              className={`w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition cursor-pointer ${
                capturedPhotoUrl && lat && !isSubmitting
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/70 active:scale-[0.98]"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed shadow-none"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin text-slate-950" />
                  Nagse-save sa HR Cloud...
                </>
              ) : !capturedPhotoUrl ? (
                <>
                  <Camera size={16} />
                  Kunan Muna ng Litrato ang Mukha
                </>
              ) : !lat ? (
                <>
                  <MapPin size={16} />
                  Hinihintay ang GPS Lock...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Confirm &amp; Sync Proof to HR Cloud
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer Admin Switcher */}
        <div className="pt-4 pb-8 text-center text-xs text-slate-500 space-y-1">
          <p>Official Simpal Group of Companies HR Technology</p>
          <button
            type="button"
            onClick={onExitToAdmin}
            className="text-[11px] text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1 font-semibold"
          >
            Pumunta sa HR Administrator Dashboard <ArrowRight size={11} />
          </button>
        </div>
      </main>
    </div>
  );
}
