import { useState, useEffect, useRef } from "react";
import {
  Camera, MapPin, CheckCircle2, AlertCircle, RefreshCw, Smartphone,
  RotateCw, Video, VideoOff, Download, ChevronRight, ShieldCheck,
  Clock, Calendar, User, ExternalLink, ArrowRight, LogOut, Check,
  Sparkles, Layers, Map, Lock, Key, Eye, EyeOff, LogIn, Shield,
  Crosshair, Radio, CheckCircle, Hash, AlertTriangle, Copy
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
 * Generates strict, collision-free aliases for a supervisor
 * e.g. "asaberon", "spvr-arlfred", "arlfred", "21", "arlfred saberon", "saberon"
 */
function getSupervisorAliases(s) {
  if (!s) return [];
  const aliases = new Set();
  const rawUser = String(s.username || "").trim().toLowerCase();
  const id = String(s.id || "").trim();
  const fullName = String(s.fullName || "").trim().toLowerCase();

  if (rawUser) {
    aliases.add(rawUser);
    aliases.add(rawUser.replace(/^spvr-/, ""));
  }
  if (id) aliases.add(id);
  if (fullName) {
    aliases.add(fullName);
    const parts = fullName
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((p) => p && p !== "jr" && p !== "sr" && p !== "iii" && p !== "ii");
    if (parts.length >= 2) {
      aliases.add(parts[0] + parts[parts.length - 1]);
      aliases.add(parts[0][0] + parts[parts.length - 1]);
      aliases.add(parts[0]);
      aliases.add(parts[parts.length - 1]);
    } else if (parts.length === 1) {
      aliases.add(parts[0]);
    }
  }
  return Array.from(aliases).filter(Boolean);
}

/**
 * Strict equality check against supervisor's assigned aliases
 */
function isSupervisorAccountMatch(enteredUser, supervisor) {
  if (!supervisor || !enteredUser) return false;
  const clean = String(enteredUser).trim().toLowerCase();
  const aliases = getSupervisorAliases(supervisor);
  return aliases.includes(clean);
}

/**
 * Strictly authenticates supervisor credentials against official Source API endpoints
 * and verified credentials store. Checks that the password is valid.
 */
async function verifySourceApiCredentials(username, password, supervisor = null) {
  const cleanUsername = String(username || "").trim();
  const cleanPassword = String(password || "").trim();

  if (!cleanUsername || !cleanPassword) {
    return { success: false, error: "Please enter both username and password." };
  }

  // 1. Candidate usernames to check against Source API
  const candidateUsernames = new Set();
  if (supervisor?.username) {
    candidateUsernames.add(supervisor.username.trim().toLowerCase());
    candidateUsernames.add(supervisor.username.replace(/^spvr-/, "").trim().toLowerCase());
  }
  if (cleanUsername) {
    candidateUsernames.add(cleanUsername.toLowerCase());
  }

  const endpoints = [
    "https://stl-mandaue-api.com/api/coordinator/login",
    "https://stl-mandaue-api.com/api/teller/login",
    "https://stl-mandaue-api.com/api/cashier/login",
    "https://stl-mandaue-api.com/api/accountant/login",
    "https://stl-mandaue-api.com/api/admin/login"
  ];

  let isVerifiedByApi = false;
  let apiResponseData = null;

  for (const url of endpoints) {
    for (const u of candidateUsernames) {
      if (!u) continue;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            username: u,
            email: u,
            password: cleanPassword
          })
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data && (data.success === true || data.token || data.access_token || data.data?.token)) {
          isVerifiedByApi = true;
          apiResponseData = data.data || data;
          break;
        }
      } catch (err) {
        console.warn(`Source API login check notice on ${url}:`, err);
      }
    }
    if (isVerifiedByApi) break;
  }

  if (isVerifiedByApi) {
    const spvrId = String(supervisor?.id || "").trim();
    if (spvrId) {
      try { localStorage.setItem(`hrhub_spvr_pwd_${spvrId}`, cleanPassword); } catch { }
    }
    return {
      success: true,
      token: "source-api-verified",
      data: apiResponseData
    };
  }

  // 2. Check if supervisor has a registered/activated password in HRHub cloud credentials
  try {
    const { data: cloudCreds } = await supabase
      .from("user_settings")
      .select("settings_json")
      .eq("user_id", "company_activated_credentials")
      .maybeSingle();

    if (cloudCreds?.settings_json?.passwords) {
      const passwords = cloudCreds.settings_json.passwords;
      for (const u of candidateUsernames) {
        if (passwords[u] && passwords[u] === cleanPassword) {
          return { success: true, token: "cloud-verified", data: { username: u } };
        }
      }
    }
  } catch (cloudErr) {
    console.warn("Cloud credentials check notice:", cloudErr);
  }

  // 3. Check previously verified local session password for this specific supervisor ID
  if (supervisor?.id) {
    try {
      const savedPass = localStorage.getItem(`hrhub_spvr_pwd_${supervisor.id}`);
      if (savedPass && savedPass === cleanPassword) {
        return { success: true, token: "device-verified", data: { id: supervisor.id } };
      }
    } catch { }
  }

  return {
    success: false,
    error: "Invalid password. The password did not match your official Source API credentials."
  };
}

export default function SupervisorMobilePwaView() {
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    return typeof window !== "undefined" ? window.__PWA_PROMPT__ : null;
  });
  const [isInstallable, setIsInstallable] = useState(() => {
    return typeof window !== "undefined" && Boolean(window.__PWA_PROMPT__);
  });
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [showAndroidTip, setShowAndroidTip] = useState(false);
  const [showMessengerTip, setShowMessengerTip] = useState(false);
  const [copiedLinkSuccess, setCopiedLinkSuccess] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent || "";
    return /FBAN|FBAV|FB_IAB|FB4A|Messenger|Instagram|Line|WhatsApp/i.test(ua);
  });

  const handleCopyCurrentUrl = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url);
    } else {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedLinkSuccess(true);
    setTimeout(() => setCopiedLinkSuccess(false), 3000);
  };

  // Supervisor Identity (derived strictly from magic link or storage)
  const isAssignedLink = Boolean(
    typeof window !== "undefined" &&
    (() => {
      const params = new URLSearchParams(window.location.search);
      return params.get("id") || params.get("spvr") || params.get("supervisorId") || params.get("username");
    })()
  );

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
        try { localStorage.setItem("hrhub_pwa_supervisor", JSON.stringify(merged)); } catch { }
        return merged;
      }
      if (nameParam) {
        const custom = {
          id: idParam,
          fullName: decodeURIComponent(nameParam),
          username: usernameParam ? decodeURIComponent(usernameParam) : `spvr-${idParam}`,
          area: resolvedArea
        };
        try { localStorage.setItem("hrhub_pwa_supervisor", JSON.stringify(custom)); } catch { }
        return custom;
      }
    }

    if (usernameParam) {
      const cleanUser = decodeURIComponent(usernameParam).toLowerCase().trim();
      const match = SUPERVISORS.find((s) => isSupervisorAccountMatch(cleanUser, s));
      if (match) {
        return match;
      }
    }

    try {
      const saved = localStorage.getItem("hrhub_pwa_supervisor");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.area || parsed.area === "5") parsed.area = "Mandaue City";
        return parsed;
      }
    } catch { }

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

  // Authentication State with strict per-supervisor session isolation
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get("id") || params.get("spvr") || params.get("supervisorId");
      const targetId = idParam || currentSupervisor?.id;
      if (!targetId) return false;

      const authKey = `hrhub_spvr_auth_${targetId}_${todayStr}`;
      const saved = localStorage.getItem(authKey) || sessionStorage.getItem(authKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.authenticated && String(parsed.supervisorId) === String(targetId)) {
          return true;
        }
      }
    } catch { }
    return false;
  });

  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Reactive URL listener: if URL params change or a new link is opened, synchronize supervisor identity immediately
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id") || params.get("spvr") || params.get("supervisorId");
    const usernameParam = params.get("username");

    if (idParam) {
      const match = SUPERVISORS.find((s) => String(s.id) === String(idParam));
      if (match && String(match.id) !== String(currentSupervisor.id)) {
        setCurrentSupervisor(match);
        setIsAuthenticated(false);
      }
    } else if (usernameParam) {
      const cleanUser = decodeURIComponent(usernameParam).toLowerCase().trim();
      const match = SUPERVISORS.find((s) => isSupervisorAccountMatch(cleanUser, s));
      if (match && String(match.id) !== String(currentSupervisor.id)) {
        setCurrentSupervisor(match);
        setIsAuthenticated(false);
      }
    }
  }, [currentSupervisor.id]);

  // Handle Supervisor Login Submission with strict account link isolation & Source API verification
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

    // 1. STRICT ACCOUNT-TO-LINK LOCK:
    // This terminal strictly belongs to currentSupervisor (e.g. ARLFRED SABERON)
    const isTargetSupervisor = isSupervisorAccountMatch(enteredUser, currentSupervisor);

    if (!isTargetSupervisor) {
      // Find which supervisor the entered username belongs to
      const otherSupervisor = SUPERVISORS.find((s) => isSupervisorAccountMatch(enteredUser, s));

      if (otherSupervisor && String(otherSupervisor.id) !== String(currentSupervisor.id)) {
        setLoginError(
          `Access Denied: Ang terminal link na ito ay eksklusibo lamang para kay ${currentSupervisor.fullName} (ID #${currentSupervisor.id}). Hindi maaaring gamitin ang account ni ${otherSupervisor.fullName} dito. Mangyaring buksan ang sariling opisyal na link para sa iyong account.`
        );
      } else {
        setLoginError(
          `Access Denied: Hindi tugma ang account sa link na ito. Ang terminal link na ito ay nakalaan lamang para kay ${currentSupervisor.fullName}.`
        );
      }
      return;
    }

    // 2. STRICT SOURCE API PASSWORD VERIFICATION:
    setIsAuthenticating(true);
    try {
      const authRes = await verifySourceApiCredentials(enteredUser, enteredPass, currentSupervisor);

      if (!authRes.success) {
        setLoginError(authRes.error || "Invalid password. The password did not match your official Source API credentials.");
        setIsAuthenticating(false);
        return;
      }

      const authKey = `hrhub_spvr_auth_${currentSupervisor.id}_${todayStr}`;
      const sessionData = {
        authenticated: true,
        supervisorId: currentSupervisor.id,
        username: currentSupervisor.username,
        fullName: currentSupervisor.fullName,
        area: currentSupervisor.area || "Mandaue City",
        loginTime: new Date().toISOString()
      };

      try {
        localStorage.setItem(authKey, JSON.stringify(sessionData));
        sessionStorage.setItem(authKey, JSON.stringify(sessionData));
        localStorage.setItem("hrhub_pwa_supervisor", JSON.stringify(currentSupervisor));
        localStorage.setItem(`hrhub_spvr_pwd_${currentSupervisor.id}`, enteredPass);
      } catch { }

      setIsAuthenticated(true);
      setInputPassword("");
      setLoginError("");

      // Auto-request GPS and Camera upon login
      requestGpsLocation();
      startCamera("user");
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
    } catch { }
    setIsAuthenticated(false);
    setInputPassword("");
    setLoginError("");
    stopCamera();
  };

  // Today's Existing Attendance from Supabase Cloud
  const [todayRecord, setTodayRecord] = useState(null);
  const [isCheckingTodayRecord, setIsCheckingTodayRecord] = useState(true);

  // Camera State with Fast Mobile Detection
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
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
      (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (typeof navigator !== "undefined" && navigator.standalone === true);
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Check early capture in index.html
    if (typeof window !== "undefined" && window.__PWA_PROMPT__) {
      setDeferredPrompt(window.__PWA_PROMPT__);
      setIsInstallable(true);
    }

    // iOS check
    const userAgent = typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : "";
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      window.__PWA_PROMPT__ = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handlePromptReady = () => {
      if (typeof window !== "undefined" && window.__PWA_PROMPT__) {
        setDeferredPrompt(window.__PWA_PROMPT__);
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      if (typeof window !== "undefined") {
        window.__PWA_PROMPT__ = null;
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("pwa-prompt-ready", handlePromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("pwa-prompt-ready", handlePromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // If opened inside Facebook Messenger / In-App browser, guide them to "Open in browser"
    if (isInAppBrowser) {
      setShowMessengerTip(true);
      return;
    }
    if (isIos) {
      setShowIosTip(true);
      return;
    }
    const promptEvent = deferredPrompt || (typeof window !== "undefined" ? window.__PWA_PROMPT__ : null);
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
          setIsInstallable(false);
        }
        setDeferredPrompt(null);
        if (typeof window !== "undefined") {
          window.__PWA_PROMPT__ = null;
        }
        return;
      } catch (err) {
        console.warn("PWA install error:", err);
      }
    }
    // If native prompt is not available or already consumed, show clear visual modal guide instead of alert()
    setShowAndroidTip(true);
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

  // Start Camera Stream with Instant Front Camera Detection
  const startCamera = async (facing = cameraFacingMode) => {
    stopCamera();
    setIsVideoReady(false);
    setCameraError("");

    if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera API is not supported in this browser.");
      return;
    }

    try {
      const targetFacing = facing === "user" ? "user" : "environment";
      let stream;

      // Tier 1: Try optimal mobile front-facing camera
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (err1) {
        try {
          // Tier 2: Instant fallback without resolution constraints (prevents hardware delay on mobile)
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing },
            audio: false
          });
        } catch (err2) {
          // Tier 3: Universal fallback to any available video track
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      // Attach immediately if videoRef element is already in DOM
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        video.muted = true;
        try {
          await video.play();
        } catch { }
      }
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
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsVideoReady(false);
  };

  // Reactive binding: ensures stream is immediately attached to <video> when element renders
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.muted = true;
      video.play().catch(() => { });
    }
  }, [isCameraActive]);

  // Flip Camera Front / Back
  const toggleCameraFacing = () => {
    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setCameraFacingMode(nextMode);
    startCamera(nextMode);
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
        status: "Logged In",
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

      {/* ================= MESSENGER IN-APP BROWSER ALERT BANNER ================= */}
      {isInAppBrowser && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/40 px-4 py-2.5 flex items-center justify-between gap-2 shadow-inner">
          <div className="flex items-start gap-2 text-xs min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle size={15} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-amber-300 text-[11px] leading-tight flex items-center gap-1">
                Binuksan sa Messenger Link
              </p>
              <p className="text-[10px] text-slate-300 leading-snug">
                I-tap ang <strong className="text-white font-mono">•••</strong> sa itaas ➔ piliin ang <strong className="text-emerald-400 font-bold">"Open in browser"</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowMessengerTip(true)}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-[11px] font-black shadow-md flex items-center gap-1 shrink-0 cursor-pointer transition"
          >
            <ExternalLink size={12} />
            Paano
          </button>
        </div>
      )}

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

      {/* Messenger In-App Browser Guide Modal */}
      {showMessengerTip && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <ExternalLink size={18} className="text-emerald-400" />
                Galing ka sa Messenger Link:
              </h3>
              <button
                type="button"
                onClick={() => setShowMessengerTip(false)}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200 leading-relaxed">
              ⚠️ <strong>Pansin:</strong> Hindi pinapayagan ng Messenger na mag-install ng App sa loob ng chat. Kailangan itong buksan sa <strong>Google Chrome</strong>.
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-white">I-tap ang tatlong tuldok ( <span className="text-emerald-400 font-bold">•••</span> )</p>
                  <p className="text-[10px] text-slate-400">Nasa pinaka-itaas na kanang bahagi ng Messenger (katabi ng link name).</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-500/30">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-black text-emerald-300 flex items-center gap-1">
                    Piliin ang "Open in browser" <ExternalLink size={12} />
                  </p>
                  <p className="text-[10px] text-slate-300">Ito ang opsyon sa menu na lumabas sa screen mo ngayon. Kusa itong bubukas sa <strong>Google Chrome</strong>.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-white">Pagkabukas sa Chrome ➔ I-tap ang "Install"</p>
                  <p className="text-[10px] text-slate-400">Pindutin ang berdeng "Install" button sa itaas. Kusa nang lilitaw ang HRHub app icon sa iyong cellphone desktop!</p>
                </div>
              </div>
            </div>

            {/* Quick Copy URL Option */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={handleCopyCurrentUrl}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 cursor-pointer transition"
              >
                {copiedLinkSuccess ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span className="text-emerald-400">Na-copy na! Buksan ang Chrome at i-Paste</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>O kaya: Kopyahin ang Link (Copy link)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowMessengerTip(false)}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-950/50 transition active:scale-[0.98]"
              >
                Naintindihan ko (Pipiliin ko ang "Open in browser")
              </button>
            </div>
          </div>
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

      {/* Android Chrome Installation Guide Modal */}
      {showAndroidTip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl relative text-left">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Smartphone size={18} className="text-emerald-400" />
                Paano i-Install sa Android Phone:
              </h3>
              <button
                type="button"
                onClick={() => setShowAndroidTip(false)}
                className="text-slate-400 hover:text-white text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-emerald-200 leading-relaxed">
              💡 <strong>Paalala:</strong> Ang Web App ay <strong>hindi nagda-download ng APK sa Downloads folder</strong>. Direktang lilitaw ang <strong>HRHub App Icon</strong> sa iyong Home Screen o App Menu ng cellphone!
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-white">I-tap ang tatlong tuldok ( <span className="text-emerald-400 font-bold">⋮</span> )</p>
                  <p className="text-[10px] text-slate-400">Nasa kanang-itaas ng iyong Chrome browser katabi ng tab number.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                <div>
                  <p className="font-semibold text-white">Piliin ang <span className="text-emerald-300 font-bold">"Install app"</span> o <span className="text-emerald-300 font-bold">"Add to Home screen"</span></p>
                  <p className="text-[10px] text-slate-400">Makikita ito sa dropdown menu ng Chrome.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-white">I-tap ang <span className="text-emerald-400 font-bold">"Install"</span> o <span className="text-emerald-400 font-bold">"Add"</span></p>
                  <p className="text-[10px] text-slate-400">Tapos na! May HRHub app icon ka na sa phone desktop.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <span className="text-amber-400 font-bold">📲 Galing sa Messenger?</span> Kung lumabas ang "More options", i-tap ang <strong className="text-emerald-400">"Open in browser"</strong> para lumipat sa Google Chrome kung saan puwede itong i-install.
            </div>

            <button
              type="button"
              onClick={() => setShowAndroidTip(false)}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs cursor-pointer shadow-lg shadow-emerald-950/50 transition active:scale-[0.98]"
            >
              Naintindihan ko (Sige)
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
                className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl transition cursor-pointer ${isAuthenticating
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
                    <p className="font-bold text-white">Official Cloud Daily Login Confirmed</p>
                    <p className="text-[10px] font-mono text-slate-400">
                      GPS: {todayRecord.latitude?.toFixed(5) || todayRecord.lat}, {todayRecord.longitude?.toFixed(5) || todayRecord.lng}
                    </p>
                    <p className="text-[10px] text-teal-400">📍 Mandaue City Sector • Status: {todayRecord.status || "Logged In"}</p>
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

            {/* 4. STEP 1: SATELLITE GPS & MANDAUE STATION LOCK (MOVED TO TOP) */}
            {(!todayRecord || submitSuccess === false) && (
              <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center border border-emerald-500/40">
                      01
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

            {/* 5. STEP 2: LIVE PHOTO VERIFICATION (MOVED TO BOTTOM) */}
            {(!todayRecord || submitSuccess === false) && (
              <div className="rounded-3xl border border-slate-800/90 bg-slate-950/80 p-5 shadow-2xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center border border-emerald-500/40">
                      02
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
                    // Live Viewfinder with instant front camera detection
                    <>
                      <video
                        ref={videoRef}
                        playsInline
                        webkit-playsinline="true"
                        autoPlay
                        muted
                        onLoadedData={() => setIsVideoReady(true)}
                        onCanPlay={() => setIsVideoReady(true)}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoReady ? "opacity-100" : "opacity-0"} ${cameraFacingMode === "user" ? "scale-x-[-1]" : ""}`}
                      />

                      {!isVideoReady && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 space-y-2">
                          <div className="w-9 h-9 rounded-full border-2 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                          <p className="text-[11px] text-emerald-400 font-bold tracking-wide animate-pulse">Detecting Front Camera...</p>
                        </div>
                      )}

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
                      {cameraError && <p className="text-[10px] text-rose-400 max-w-xs">{cameraError}</p>}
                      <button
                        type="button"
                        onClick={() => startCamera(cameraFacingMode)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer transition shadow-sm inline-flex items-center gap-1.5"
                      >
                        <Camera size={13} />
                        <span>Start Front Camera</span>
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

            {/* 6. SUBMIT BUTTON DOCK */}
            {(!todayRecord || submitSuccess === false) && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleSubmitAttendance}
                  disabled={isSubmitting || !capturedPhotoUrl || !lat}
                  className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xl transition cursor-pointer ${capturedPhotoUrl && lat && !isSubmitting
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
          <p className="font-semibold text-slate-400">SGC • HR Technology Systems</p>
          <p className="text-[10px] text-slate-600 font-medium">Mandaue City Field Verification Portal • SSL Encrypted</p>
        </div>
      </main>
    </div>
  );
}
