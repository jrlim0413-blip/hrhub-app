import { useState, useEffect, useCallback, useRef } from "react";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudFog,
  Droplets,
  Wind,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  MapPin,
  ChevronDown,
  ChevronUp,
  Umbrella,
  Sparkles,
  Clock,
  Radio,
  ShieldAlert,
  Edit3,
  Navigation,
  Compass,
  Search,
  Tv,
  Layers
} from "lucide-react";
import WeatherNewsMap from "./WeatherNewsMap";
import {
  PHILIPPINE_AREAS,
  RECENT_CYCLONES_PAGASA,
  fetchWeatherForecast,
  getNearbyAreasSorted,
  reverseGeocodeLocation
} from "../lib/weatherService";

function WeatherIcon({ name, size = 20, className = "" }) {
  switch (name) {
    case "Sun":
      return <Sun size={size} className={`text-amber-500 drop-shadow-xs ${className}`} />;
    case "CloudSun":
      return <CloudSun size={size} className={`text-amber-400 drop-shadow-xs ${className}`} />;
    case "Cloud":
      return <Cloud size={size} className={`text-slate-400 drop-shadow-xs ${className}`} />;
    case "CloudDrizzle":
      return <CloudDrizzle size={size} className={`text-sky-400 drop-shadow-xs ${className}`} />;
    case "CloudRain":
      return <CloudRain size={size} className={`text-blue-500 drop-shadow-xs ${className}`} />;
    case "CloudLightning":
      return <CloudLightning size={size} className={`text-purple-500 drop-shadow-xs ${className}`} />;
    case "CloudFog":
      return <CloudFog size={size} className={`text-slate-400 drop-shadow-xs ${className}`} />;
    default:
      return <CloudSun size={size} className={`text-amber-400 drop-shadow-xs ${className}`} />;
  }
}

export default function WeatherWidget() {
  const [selectedLocation, setSelectedLocation] = useState({
    id: "gps",
    name: "Detecting Location...",
    city: "Laptop GPS",
    lat: 14.5547,
    lon: 121.0244,
    isGps: true
  });
  const [gpsDetected, setGpsDetected] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'map'
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");

  const dropdownRef = useRef(null);

  // Tropical Cyclone Tracker state
  const [activeCyclone, setActiveCyclone] = useState(() => {
    try {
      const saved = localStorage.getItem("hrhub_active_cyclone");
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return RECENT_CYCLONES_PAGASA[0];
  });
  const [cycloneModalOpen, setCycloneModalOpen] = useState(false);
  const [customCycloneName, setCustomCycloneName] = useState("");
  const [customSignal, setCustomSignal] = useState(1);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setBranchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadWeather = useCallback(async (lat, lon, forceFresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await fetchWeatherForecast(lat, lon, forceFresh);
      setWeatherData(data);
    } catch (err) {
      console.error("Failed to load weather:", err);
      setError("Unable to retrieve weather data at this moment. Please check connection or retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. AUTO-DETECT GPS ON MOUNT
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsLoading(false);
      setSelectedLocation({
        ...PHILIPPINE_AREAS[0],
        isGps: false
      });
      loadWeather(PHILIPPINE_AREAS[0].lat, PHILIPPINE_AREAS[0].lon);
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setGpsDetected(true);
        setGpsLoading(false);

        const geocoded = await reverseGeocodeLocation(lat, lon);
        const detected = {
          id: "gps",
          name: geocoded.name || "Laptop GPS Location",
          city: geocoded.city || "Detected Coordinates",
          lat,
          lon,
          isGps: true
        };
        setSelectedLocation(detected);
        loadWeather(lat, lon);
      },
      (err) => {
        console.warn("Geolocation fallback:", err.message);
        setGpsDetected(false);
        setGpsLoading(false);
        const fallback = {
          ...PHILIPPINE_AREAS[0],
          name: "Makati HQ",
          isGps: false
        };
        setSelectedLocation(fallback);
        loadWeather(fallback.lat, fallback.lon);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [loadWeather]);

  // Compute nearby locations sorted by distance
  const nearbyAreas = getNearbyAreasSorted(selectedLocation.lat, selectedLocation.lon).filter((area) => {
    if (!locationSearch.trim()) return true;
    const query = locationSearch.toLowerCase();
    return (
      area.name.toLowerCase().includes(query) ||
      area.city.toLowerCase().includes(query) ||
      area.region.toLowerCase().includes(query)
    );
  });

  const handleSelectLocation = (loc) => {
    setSelectedLocation({ ...loc, isGps: false });
    setBranchDropdownOpen(false);
    loadWeather(loc.lat, loc.lon);
  };

  const handleSwitchToGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setBranchDropdownOpen(false);
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setGpsDetected(true);
        setGpsLoading(false);
        const geocoded = await reverseGeocodeLocation(lat, lon);
        const detected = {
          id: "gps",
          name: geocoded.name || "Laptop GPS Location",
          city: geocoded.city || "Detected Coordinates",
          lat,
          lon,
          isGps: true
        };
        setSelectedLocation(detected);
        loadWeather(lat, lon, true);
      },
      () => {
        setGpsLoading(false);
        alert("Could not access laptop GPS coordinates.");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleUpdateCyclone = (cycloneObj) => {
    setActiveCyclone(cycloneObj);
    localStorage.setItem("hrhub_active_cyclone", JSON.stringify(cycloneObj));
    setCycloneModalOpen(false);
  };

  const handleCustomCycloneSubmit = (e) => {
    e.preventDefault();
    if (!customCycloneName.trim()) return;
    const newObj = {
      name: customCycloneName.trim(),
      signal: Number(customSignal),
      category:
        Number(customSignal) >= 3
          ? "Typhoon / Super Typhoon"
          : Number(customSignal) === 2
          ? "Severe Tropical Storm"
          : "Tropical Depression",
      desc: `PAGASA Wind Signal No. ${customSignal} raised in affected regions. Comply with corporate safety guidelines.`
    };
    handleUpdateCyclone(newObj);
  };

  const tomorrow = weatherData?.tomorrow;
  const current = weatherData?.current;
  const todayRain = weatherData?.todayRainWindow;
  const tomorrowRain = weatherData?.tomorrowRainWindow;

  return (
    <div className="relative mb-6 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_16px_40px_-12px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] transition-all duration-300">
      {/* Ambient Optical Glow Orbs */}
      <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute top-12 -right-16 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

      {/* SINGLE UNIFIED EXECUTIVE HEADER BAR (Clean, Non-cluttered) */}
      <div className="relative z-20 bg-slate-900/90 backdrop-blur-xl text-white px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 rounded-t-3xl">
        {/* Left Side: Title & Smart PAGASA Status Pill */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center backdrop-blur-md shadow-xs shrink-0">
            <Umbrella size={17} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Operations & Weather Pulse
              </span>

              {/* Seamless Integrated PAGASA Badge / Status Pill */}
              <button
                type="button"
                onClick={() => setCycloneModalOpen(true)}
                title="Click to update PAGASA Tropical Cyclone / Storm Status"
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                  activeCyclone.signal >= 3
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-300 hover:bg-rose-500/30 animate-pulse"
                    : activeCyclone.signal > 0
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                    : "bg-white/10 border-white/15 text-slate-300 hover:bg-white/15 hover:text-white"
                }`}
              >
                {activeCyclone.signal > 0 ? (
                  <>
                    <Radio size={11} className="text-rose-400 animate-ping shrink-0" />
                    <span className="truncate max-w-[200px]">{activeCyclone.name} (Signal #{activeCyclone.signal})</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                    <span>PAR: Clear (No Storm)</span>
                  </>
                )}
                <Edit3 size={10} className="text-slate-400 ml-0.5 shrink-0" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              {activeCyclone.signal > 0
                ? activeCyclone.desc
                : "Real-time rain timelines, laptop GPS tracking, and safety advisories"}
            </p>
          </div>
        </div>

        {/* Right Side: View Mode Toggle, Location Dropdown, Refresh, and Collapse Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* VIEW MODE TOGGLE (Cards vs TV News Radar Map) */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-slate-700 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "cards"
                  ? "bg-emerald-500 text-slate-950 shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Layers size={13} />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === "map"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Tv size={13} />
              <span>Live Satellite</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping ml-0.5" />
            </button>
          </div>

          {/* LOCATION DROPDOWN (Solid High-Contrast Floating Card) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-100 hover:text-white rounded-xl text-xs font-semibold border border-slate-600 shadow-sm transition cursor-pointer"
            >
              {selectedLocation.isGps ? (
                <Navigation size={13} className="text-emerald-400 animate-pulse" />
              ) : (
                <MapPin size={13} className="text-amber-400" />
              )}
              <div className="text-left">
                <span className="max-w-[150px] truncate block font-bold">
                  {selectedLocation.name}
                </span>
              </div>
              <ChevronDown size={13} className="text-slate-300 ml-0.5" />
            </button>

            {/* SOLID OPAQUE DARK EXECUTIVE DROPDOWN MENU */}
            {branchDropdownOpen && (
              <div className="absolute right-0 mt-2 w-84 bg-[#0d1b2a] border border-slate-700 rounded-2xl shadow-2xl p-3 text-white z-50 animate-fade-in divide-y divide-slate-800">
                {/* Section A: Active Device GPS Option */}
                <div className="pb-2.5">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Navigation size={11} /> Laptop / Device Location (Default)
                    </span>
                    {gpsDetected && (
                      <span className="text-[9px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                        GPS Active
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSwitchToGPS}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition cursor-pointer border ${
                      selectedLocation.isGps
                        ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-200"
                        : "bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Navigation size={14} className={gpsLoading ? "animate-spin" : ""} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-xs truncate">
                          {gpsDetected ? selectedLocation.city : "Detect Laptop GPS Coordinates"}
                        </p>
                        <p className="text-[10px] text-slate-400">Auto-detected local coordinates</p>
                      </div>
                    </div>
                    {selectedLocation.isGps && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
                  </button>
                </div>

                {/* Section B: Nearby Areas & Branches */}
                <div className="pt-2.5 space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Compass size={11} className="text-amber-400" /> Nearby Areas & Branches (By Distance)
                    </span>
                  </div>

                  {/* Search Bar within dropdown */}
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Search nearby city or hub..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Scrollable list of nearby locations with distance in km */}
                  <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                    {nearbyAreas.map((area) => {
                      const isSelected = selectedLocation.id === area.id && !selectedLocation.isGps;

                      return (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => handleSelectLocation(area)}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                              : "hover:bg-slate-800 text-slate-300"
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-white truncate">{area.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {area.city} • {area.region}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">
                              {area.distKm === 0 ? "Local Area" : `${area.distKm} km away`}
                            </span>
                            {isSelected && <CheckCircle2 size={14} className="text-emerald-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => loadWeather(selectedLocation.lat, selectedLocation.lon, true)}
            title="Refresh Live Weather Data"
            disabled={loading}
            className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-emerald-400 rounded-xl border border-slate-600 transition cursor-pointer disabled:opacity-50 shadow-sm"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-emerald-400" : ""} />
          </button>

          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse Weather Widget" : "Expand Weather Widget"}
            className="p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-600 transition cursor-pointer shadow-sm"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* EMERGENCY CYCLONE ALERT BANNER (Only renders if an active cyclone Signal >= 1 is active) */}
      {activeCyclone.signal > 0 && (
        <div className="relative z-10 mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 backdrop-blur-md text-rose-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
              #{activeCyclone.signal}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs text-rose-900">
                  PAGASA Alert: {activeCyclone.name} ({activeCyclone.category})
                </span>
                <span className="text-[9px] font-black uppercase bg-rose-500 text-white px-2 py-0.2 rounded-full">
                  Signal #{activeCyclone.signal}
                </span>
              </div>
              <p className="text-[11px] text-rose-800 font-medium">
                {activeCyclone.desc}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCycloneModalOpen(true)}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
          >
            Manage Storm Advisory
          </button>
        </div>
      )}

      {/* MAIN WIDGET CONTENT: Frosted Glass Surfaces OR TV News Radar Map */}
      {isExpanded && (
        viewMode === "map" ? (
          <div className="p-3 sm:p-4">
            <WeatherNewsMap
              weatherData={weatherData}
              selectedLocation={selectedLocation}
              activeCyclone={activeCyclone}
              onSelectLocation={handleSelectLocation}
            />
          </div>
        ) : error ? (
        <div className="relative z-10 p-5 bg-rose-50/80 backdrop-blur-md text-rose-700 text-xs flex items-center gap-2 border-b border-rose-200">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button
            onClick={() => loadWeather(selectedLocation.lat, selectedLocation.lon, true)}
            className="ml-auto underline font-bold"
          >
            Retry Now
          </button>
        </div>
      ) : loading && !weatherData ? (
        <div className="relative z-10 p-10 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw size={22} className="animate-spin text-emerald-600" />
          <p className="font-semibold">Retrieving live radar feed for {selectedLocation.name}...</p>
        </div>
      ) : (
        <div className="relative z-10 p-4 sm:p-6 space-y-5">
          {/* ROW A: CURRENT METRICS & TOMORROW'S RAIN HORIZON */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Current Conditions Card */}
            <div className="lg:col-span-5 rounded-2xl bg-white/55 backdrop-blur-xl border border-white/80 p-5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] flex flex-col justify-between transition hover:bg-white/65">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Atmosphere • {selectedLocation.city}
                    </span>
                    {selectedLocation.isGps && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                        GPS
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2.5 mt-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                      {current?.temperature ?? "--"}°C
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      (Heat Index: {current?.feelsLike}°C)
                    </span>
                  </div>
                  <p className="text-xs font-bold text-emerald-800 mt-1 flex items-center gap-1.5">
                    <span>{current?.condition?.label}</span>
                  </p>
                </div>

                <div className="p-3.5 bg-white/70 backdrop-blur-lg rounded-2xl shadow-xs border border-white/90">
                  <WeatherIcon name={current?.condition?.icon} size={36} />
                </div>
              </div>

              {/* Rain time summary for today */}
              <div className="mt-4 p-3 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 text-xs flex items-start gap-2.5 shadow-2xs">
                <Clock size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block text-[11px]">Today's Rain Timing:</span>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{todayRain?.summary}</p>
                </div>
              </div>

              {/* Mini weather stats */}
              <div className="mt-4 pt-3.5 border-t border-slate-200/50 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Droplets size={14} className="text-sky-500" />
                  <span>Humidity: <strong className="text-slate-800">{current?.humidity}%</strong></span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <Wind size={14} className="text-teal-500" />
                  <span>Wind: <strong className="text-slate-800">{current?.windSpeed} km/h</strong></span>
                </div>
              </div>
            </div>

            {/* Tomorrow's Rain Horizon Card */}
            <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-white/65 via-sky-50/25 to-white/45 backdrop-blur-xl border border-blue-200/60 p-5 shadow-[0_8px_24px_-6px_rgba(59,130,246,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] flex flex-col justify-between transition hover:bg-white/70">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-800 border border-blue-300/60 backdrop-blur-md">
                      <Umbrella size={11} className="text-blue-600" /> Tomorrow's Rain Horizon
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs border ${tomorrow?.advisory?.pillColor || "bg-slate-100 text-slate-700"}`}>
                      {tomorrow?.advisory?.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2.5">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900">
                        {tomorrow?.rainProb ?? 0}%
                      </span>
                      <span className="text-xs font-bold text-slate-500 uppercase">Precipitation Chance</span>
                    </div>

                    {tomorrow?.rainSum > 0 && (
                      <span className="text-[11px] font-extrabold text-blue-800 bg-blue-500/15 px-2.5 py-0.5 rounded-lg border border-blue-300/60 backdrop-blur-sm">
                        💧 {tomorrow.rainSum} mm Expected
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1.5">
                    <WeatherIcon name={tomorrow?.condition?.icon} size={28} />
                    <span className="text-sm font-black text-slate-800">
                      {tomorrow?.maxTemp}° <span className="text-slate-400 font-normal text-xs">/ {tomorrow?.minTemp}°C</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">{tomorrow?.condition?.label}</span>
                </div>
              </div>

              {/* Rain Timing Callout for Tomorrow */}
              <div className="mt-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-200/60 backdrop-blur-md text-[11px] text-blue-950 flex items-center gap-2 shadow-2xs">
                <Clock size={14} className="text-blue-600 shrink-0" />
                <span>
                  <strong>Tomorrow's Rain Window:</strong> {tomorrowRain?.hasRain ? tomorrowRain.summary : "Scattered or minimal rain forecast throughout the work day."}
                </span>
              </div>

              {/* Frosted Progress Bar for Rain Probability */}
              <div className="my-2.5 space-y-1">
                <div className="w-full bg-white/70 backdrop-blur-sm rounded-full h-2 overflow-hidden border border-white/80 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      tomorrow?.rainProb >= 70
                        ? "bg-rose-500"
                        : tomorrow?.rainProb >= 40
                        ? "bg-amber-500"
                        : tomorrow?.rainProb >= 20
                        ? "bg-sky-500"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.max(5, tomorrow?.rainProb ?? 0)}%` }}
                  />
                </div>
              </div>

              {/* HR / Operations Advisory Alert Box */}
              <div className={`p-3 rounded-xl border backdrop-blur-md text-xs flex items-start gap-2.5 shadow-2xs ${tomorrow?.advisory?.bgColor}`}>
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <div className="space-y-0.5 min-w-0">
                  <p className="font-bold text-slate-900 leading-tight">
                    {tomorrow?.advisory?.title}
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-95">
                    {tomorrow?.advisory?.advice}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ROW B: HOURLY RAIN TIMELINE */}
          {isExpanded && (
            <div className="pt-2 border-t border-slate-200/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock size={12} className="text-emerald-600" />
                  Upcoming Hourly Rain Timeline (What Time Will It Rain?)
                </p>
                <span className="text-[10px] text-slate-400">Scroll horizontally for next 24h &rarr;</span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
                {weatherData?.hourly?.slice(0, 16).map((h, i) => {
                  const isHigh = h.rainProb >= 60;
                  const isMed = h.rainProb >= 35 && h.rainProb < 60;

                  return (
                    <div
                      key={`${h.timeStr}-${i}`}
                      className={`min-w-[86px] p-2.5 rounded-2xl border flex flex-col items-center justify-between text-center shrink-0 backdrop-blur-md transition-all duration-200 hover:scale-102 ${
                        isHigh
                          ? "bg-rose-50/60 border-rose-300/70 shadow-xs"
                          : isMed
                          ? "bg-amber-50/50 border-amber-300/70 shadow-xs"
                          : "bg-white/50 border-white/80 hover:bg-white/70 shadow-2xs"
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-600 uppercase">
                        {h.timeLabel}
                      </span>

                      <div className="my-1.5 p-1 rounded-xl bg-white/60 backdrop-blur-sm shadow-2xs">
                        <WeatherIcon name={h.condition.icon} size={20} />
                      </div>

                      <span className="text-xs font-black text-slate-800">
                        {h.temp}°C
                      </span>

                      {/* Rain Probability Pill */}
                      <div
                        className={`mt-1.5 w-full py-0.5 rounded-lg text-[9px] font-black shadow-2xs ${
                          isHigh
                            ? "bg-rose-500 text-white"
                            : isMed
                            ? "bg-amber-500 text-white"
                            : h.rainProb > 0
                            ? "bg-sky-500/20 text-sky-800 border border-sky-300/50"
                            : "bg-white/60 text-slate-400 border border-slate-200/50"
                        }`}
                      >
                        {h.rainProb}% rain
                      </div>
                      {h.rainSum > 0 && (
                        <span className="text-[8px] text-slate-500 mt-0.5 font-medium">
                          {h.rainSum} mm
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ROW C: 5-DAY WORKWEEK FORECAST STRIP */}
          {isExpanded && (
            <div className="pt-2 border-t border-slate-200/50">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-amber-500" /> 5-Day Workweek Meteorological Outlook
                </p>
                <span className="text-[10px] text-slate-400">Updated: {weatherData?.updatedAt}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {weatherData?.daily?.map((day, idx) => {
                  const isHighRain = day.rainProb >= 60;
                  const isModerateRain = day.rainProb >= 35 && day.rainProb < 60;

                  return (
                    <div
                      key={day.date}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between backdrop-blur-md ${
                        day.isTomorrow
                          ? "bg-blue-50/50 border-blue-300/80 ring-2 ring-blue-400/20 shadow-xs"
                          : day.isToday
                          ? "bg-white/60 border-white/90 font-medium shadow-2xs"
                          : "bg-white/40 border-white/70 hover:bg-white/65 hover:border-white shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase ${day.isTomorrow ? "text-blue-700" : "text-slate-500"}`}>
                          {idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : day.dayLabel.split(",")[0]}
                        </span>
                        <div className="p-1 rounded-lg bg-white/50">
                          <WeatherIcon name={day.condition.icon} size={18} />
                        </div>
                      </div>

                      <div className="my-2.5">
                        <p className="text-xs font-extrabold text-slate-800">
                          {day.maxTemp}°C <span className="text-[10px] text-slate-400 font-normal">/ {day.minTemp}°</span>
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">{day.condition.label}</p>
                      </div>

                      {/* Rain Probability Badge */}
                      <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px]">
                        <span className="flex items-center gap-1 text-slate-500 font-semibold">
                          <Droplets size={11} className={isHighRain ? "text-rose-500" : isModerateRain ? "text-amber-500" : "text-sky-400"} />
                          Rain:
                        </span>
                        <span
                          className={`font-black px-1.5 py-0.2 rounded-md ${
                            isHighRain
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : isModerateRain
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-white/80 text-slate-600 border border-slate-200/60"
                          }`}
                        >
                          {day.rainProb}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* MODAL: UPDATE TROPICAL CYCLONE STATUS */}
      {cycloneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-2xl rounded-3xl p-5 shadow-2xl border border-white/80 text-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-rose-600" />
                <h3 className="font-extrabold text-sm text-slate-900">
                  Update PAGASA Tropical Cyclone Advisory
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCycloneModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Select an active cyclone preset or input a custom typhoon name announced by PAGASA to broadcast immediate safety protocols across the workspace.
            </p>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Presets:</span>
              <div className="space-y-1">
                {RECENT_CYCLONES_PAGASA.map((cyclone, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleUpdateCyclone(cyclone)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition cursor-pointer backdrop-blur-sm ${
                      activeCyclone.name === cyclone.name
                        ? "bg-emerald-500/15 border-emerald-400/60 font-bold text-emerald-950"
                        : "bg-white/50 border-slate-200/60 hover:bg-white/80 text-slate-700"
                    }`}
                  >
                    <div>
                      <p className="font-bold">{cyclone.name}</p>
                      <p className="text-[10px] text-slate-500">{cyclone.desc}</p>
                    </div>
                    {cyclone.signal > 0 ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white">
                        Signal #{cyclone.signal}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Clear
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Typhoon Form */}
            <form onSubmit={handleCustomCycloneSubmit} className="pt-2 border-t border-slate-200/60 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Or Broadcast Custom Storm:</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Typhoon 'AGHON'"
                  value={customCycloneName}
                  onChange={(e) => setCustomCycloneName(e.target.value)}
                  className="flex-1 bg-white/70 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 backdrop-blur-sm"
                />
                <select
                  value={customSignal}
                  onChange={(e) => setCustomSignal(e.target.value)}
                  className="bg-white/70 border border-slate-200/80 rounded-xl px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 backdrop-blur-sm"
                >
                  <option value={1}>Signal 1</option>
                  <option value={2}>Signal 2</option>
                  <option value={3}>Signal 3</option>
                  <option value={4}>Signal 4</option>
                  <option value={5}>Signal 5</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCycloneModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100/80 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customCycloneName.trim()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  Apply & Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
