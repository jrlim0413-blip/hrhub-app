import { useState, useEffect } from "react";
import {
  Radio,
  Play,
  Square,
  Clock,
  Tv,
  Droplets,
  Wind,
  ShieldAlert,
  Satellite,
  CloudRain,
  MapPin,
  RefreshCw,
  Eye,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  Gauge,
  Thermometer,
  Cloud,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { PHILIPPINE_AREAS } from "../lib/weatherService";

// Map hotspot presets with coordinates
const RADAR_CITIES = [
  {
    id: "makati",
    name: "Metro Manila (NCR)",
    region: "National Capital Region",
    lat: 14.5547,
    lon: 121.0244,
    temp: 29,
    condition: "Partly Cloudy",
    rainProb: 100,
    rainWindow: "3:00 PM – 10:00 PM",
    advisory: "Peak heavy rain (100%) expected at 6:00 PM. High flood risk in low-lying roads."
  },
  {
    id: "clark",
    name: "Clark / Central Luzon",
    region: "Pampanga & Bataan Hub",
    lat: 15.1764,
    lon: 120.5282,
    temp: 30,
    condition: "Scattered Rain",
    rainProb: 75,
    rainWindow: "2:00 PM – 7:00 PM",
    advisory: "Moderate to heavy showers in afternoon. Field logistics teams advised to secure cargo."
  },
  {
    id: "cebu",
    name: "Cebu / Central Visayas",
    region: "Visayas Regional Hub",
    lat: 10.3157,
    lon: 123.8854,
    temp: 31,
    condition: "Isolated Showers",
    rainProb: 45,
    rainWindow: "4:00 PM – 8:00 PM",
    advisory: "Generally fair weather with brief late afternoon coastal showers. Normal operations."
  },
  {
    id: "davao",
    name: "Davao Operations",
    region: "Southern Mindanao",
    lat: 7.0731,
    lon: 125.6128,
    temp: 32,
    condition: "Fair & Humid",
    rainProb: 25,
    rainWindow: "6:00 PM – 8:00 PM",
    advisory: "Optimal conditions for outdoor and site inspections. High heat index precautions."
  }
];

export default function WeatherNewsMap({
  weatherData,
  selectedLocation,
  activeCyclone,
  onSelectLocation
}) {
  const [activeCity, setActiveCity] = useState(RADAR_CITIES[0]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeFeed, setActiveFeed] = useState("satellite"); // 'satellite' | 'radar' | 'wind'
  const [currentTime, setCurrentTime] = useState("");
  const [zoomLevel, setZoomLevel] = useState(8); // 8 for city close-up, 5 for PAR wide
  const [iframeKey, setIframeKey] = useState(Date.now());
  const [hudExpanded, setHudExpanded] = useState(true);

  // Clock for TV broadcast corner
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync active city if selectedLocation matches one of the presets
  useEffect(() => {
    if (selectedLocation) {
      const match = RADAR_CITIES.find(
        (c) =>
          c.id === selectedLocation.id ||
          selectedLocation.name.toLowerCase().includes(c.name.toLowerCase().slice(0, 5)) ||
          selectedLocation.city.toLowerCase().includes(c.name.toLowerCase().slice(0, 5))
      );
      if (match) {
        setActiveCity(match);
      }
      setIframeKey(Date.now());
    }
  }, [selectedLocation]);

  // Speech synthesis for TV News Anchor Voice Report
  const handlePlayVoiceBroadcast = () => {
    if (!window.speechSynthesis) {
      alert("Speech synthesis is not supported on this browser.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const current = weatherData?.current;
    const cloudDesc =
      (current?.cloudCover ?? 70) >= 75
        ? "heavy overcast satellite cloud density"
        : (current?.cloudCover ?? 70) >= 40
        ? "scattered convective clouds"
        : "clear satellite horizon";

    const reportText = `Live satellite ground status for ${selectedLocation?.name || activeCity.name}. Satellite sensors detect ${
      current?.cloudCover ?? 78
    } percent cloud density with ${cloudDesc}. Surface temperature is ${
      current?.temperature ?? activeCity.temp
    } degrees Celsius, feels like ${current?.feelsLike ?? 38} degrees. Rain radar indicates ${
      (current?.precipitation ?? 0) > 0 ? `${current.precipitation} millimeters per hour active rain` : "dry ground surface"
    }. Regarding tropical cyclone activity: ${activeCyclone.name}. ${
      activeCyclone.desc
    }. HR and field supervisors are advised to monitor localized precipitation radar.`;

    const utterance = new SpeechSynthesisUtterance(reportText);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha"))
      ) || voices.find((v) => v.lang.startsWith("en"));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
    setIsPlayingAudio(true);
  };

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Construct live satellite / radar embed URL auto-centered on current location
  const getEmbedUrl = () => {
    const lat = selectedLocation?.lat || activeCity?.lat || 14.5547;
    const lon = selectedLocation?.lon || activeCity?.lon || 121.0244;

    if (activeFeed === "radar") {
      return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=${zoomLevel}&overlay=radar&product=radar&level=surface&lat=${lat}&lon=${lon}`;
    }
    if (activeFeed === "wind") {
      return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=${zoomLevel}&overlay=wind&product=ecmwf&level=surface&lat=${lat}&lon=${lon}`;
    }
    // Default: Live Himawari-9 Geostationary Infrared Satellite Feed
    return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=${zoomLevel}&overlay=satellite&product=satellite&level=surface&lat=${lat}&lon=${lon}`;
  };

  const current = weatherData?.current;
  const cloudCover = current?.cloudCover ?? 78;
  const currentRain = current?.precipitation ?? 0;
  const rainProb = weatherData?.tomorrow?.rainProb ?? activeCity.rainProb;

  // Cloud Density Category
  const cloudDesc =
    cloudCover >= 80
      ? "Dense Overcast (Thick Storm Clouds)"
      : cloudCover >= 50
      ? "Scattered Convective Clouds"
      : cloudCover >= 25
      ? "Partly Cloudy"
      : "Clear Satellite Sky";

  // Site Operational Status Assessment
  const isHighRisk = currentRain > 2 || rainProb >= 70;
  const isModerateRisk = currentRain > 0 || rainProb >= 40;

  return (
    <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white border border-slate-800 shadow-2xl animate-fade-in font-sans">
      {/* 1. TV BROADCAST TOP BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0b1b2b] to-slate-950 px-4 py-2.5 sm:px-6 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-600 font-black text-[10px] tracking-wider text-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>LIVE SATELLITE FEED</span>
          </div>

          <div className="flex items-center gap-2">
            <Tv size={14} className="text-emerald-400" />
            <span className="font-extrabold tracking-tight text-white sm:text-sm">
              HR<span className="text-emerald-400">HUB</span> HIMAWARI-9 SATELLITE BROADCAST
            </span>
            <span className="text-[10px] font-bold text-slate-400 hidden md:inline">
              • PHILIPPINE AREA OF RESPONSIBILITY (PAR)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-xl text-slate-300 font-mono text-[11px]">
            <Clock size={12} className="text-emerald-400" />
            <span>{currentTime || "12:15:00 PM"} PHT</span>
          </div>

          {/* Voice News Anchor Button */}
          <button
            type="button"
            onClick={handlePlayVoiceBroadcast}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer border ${
              isPlayingAudio
                ? "bg-rose-600 border-rose-400 text-white animate-pulse"
                : "bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30"
            }`}
          >
            {isPlayingAudio ? (
              <>
                <Square size={12} />
                <span>Stop Voice</span>
              </>
            ) : (
              <>
                <Play size={12} fill="currentColor" />
                <span>Play News Anchor</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SATELLITE LAYER & ZOOM CONTROLS BAR */}
      <div className="bg-[#071321] px-4 py-2 sm:px-6 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Eye size={12} className="text-emerald-400" /> Satellite Feeds:
          </span>

          <button
            type="button"
            onClick={() => {
              setActiveFeed("satellite");
              setIframeKey(Date.now());
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer border ${
              activeFeed === "satellite"
                ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Satellite size={13} />
            <span>Live Infrared Satellite (Clouds)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFeed("radar");
              setIframeKey(Date.now());
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer border ${
              activeFeed === "radar"
                ? "bg-blue-600 text-white border-blue-400 shadow-xs"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <CloudRain size={13} />
            <span>Doppler Rain Radar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFeed("wind");
              setIframeKey(Date.now());
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer border ${
              activeFeed === "wind"
                ? "bg-teal-600 text-white border-teal-400 shadow-xs"
                : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Wind size={13} />
            <span>Live Wind Streams</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Toggle: City Close-up vs PAR Wide */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setZoomLevel(8);
                setIframeKey(Date.now());
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                zoomLevel >= 8 ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
              }`}
            >
              <ZoomIn size={12} />
              <span>City Zoom</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setZoomLevel(5);
                setIframeKey(Date.now());
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                zoomLevel <= 5 ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
              }`}
            >
              <ZoomOut size={12} />
              <span>PAR Wide</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIframeKey(Date.now())}
            title="Reload Satellite Feed"
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 rounded-lg border border-slate-800 transition cursor-pointer"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* 2. MAIN SATELLITE STAGE WITH SITE TELEMETRY HUD OVERLAY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 relative min-h-[500px]">
        {/* SATELLITE VIEWER (8 Columns) */}
        <div className="lg:col-span-8 relative bg-black overflow-hidden flex items-center justify-center min-h-[440px] sm:min-h-[500px]">
          <div className="w-full h-full relative">
            <iframe
              key={iframeKey}
              title="Live Philippine Satellite & Radar"
              src={getEmbedUrl()}
              className="w-full h-full min-h-[440px] sm:min-h-[500px] border-0"
              loading="lazy"
              allow="geolocation"
            />

            {/* Top Left Watermark Tag */}
            <div className="absolute top-3 left-3 pointer-events-none z-10 flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] shadow-lg">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-extrabold text-white uppercase tracking-wider">
                {activeFeed === "satellite"
                  ? "HIMAWARI-9 GEOSTATIONARY IR"
                  : activeFeed === "radar"
                  ? "PHILIPPINES DOPPLER RADAR"
                  : "WIND VECTOR PARTICLES"}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                • {selectedLocation?.name || activeCity.name}
              </span>
            </div>

            {/* FLOATING COMMAND CENTER: LIVE SITE SATELLITE STATUS HUD */}
            <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md z-20 transition-all duration-300">
              <div className="rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 shadow-2xl p-3.5 text-xs text-white space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-black text-[11px] uppercase tracking-wider text-emerald-400 truncate">
                      Site Satellite Telemetry: {selectedLocation?.name || activeCity.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setHudExpanded(!hudExpanded)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                  >
                    {hudExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>

                {hudExpanded ? (
                  <div className="space-y-2 animate-fade-in">
                    {/* Cloud Cover & Rain Detection Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Cloud size={11} className="text-sky-400" /> Satellite Cloud
                          </span>
                          <span className="text-white font-black">{cloudCover}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cloudCover >= 80 ? "bg-rose-500" : cloudCover >= 50 ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                            style={{ width: `${cloudCover}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-1 truncate">{cloudDesc}</p>
                      </div>

                      <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                          <span className="flex items-center gap-1">
                            <Droplets size={11} className="text-blue-400" /> Doppler Rain
                          </span>
                          <span className="text-white font-black">{currentRain > 0 ? `${currentRain} mm/h` : "0 mm/h"}</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-200 mt-1 truncate">
                          {currentRain > 0 ? "🌧️ Active Precipitation" : "☀️ Dry Ground Surface"}
                        </p>
                        <p className="text-[9px] text-slate-400">Peak Risk: {rainProb}%</p>
                      </div>
                    </div>

                    {/* Ground Atmosphere Metrics */}
                    <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                      <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                        <span className="text-slate-400 block font-semibold">Heat Index</span>
                        <span className="font-black text-white text-xs">{current?.feelsLike ?? 38}°C</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                        <span className="text-slate-400 block font-semibold">Wind Vector</span>
                        <span className="font-black text-white text-xs">{current?.windSpeed ?? 10} km/h {current?.windDirection ?? "ENE"}</span>
                      </div>
                      <div className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-center">
                        <span className="text-slate-400 block font-semibold">Barometer</span>
                        <span className="font-black text-white text-xs">{current?.pressure ?? 1008} hPa</span>
                      </div>
                    </div>

                    {/* Operational Safety Status Badge */}
                    <div
                      className={`p-2 rounded-xl border flex items-center gap-2 text-[10px] ${
                        isHighRisk
                          ? "bg-rose-950/60 border-rose-800/80 text-rose-200"
                          : isModerateRisk
                          ? "bg-amber-950/60 border-amber-800/80 text-amber-200"
                          : "bg-emerald-950/60 border-emerald-800/80 text-emerald-200"
                      }`}
                    >
                      {isHighRisk ? (
                        <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                      ) : (
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      )}
                      <span className="font-bold leading-tight">
                        {isHighRisk
                          ? "RAIN HAZARD: Suspend outdoor concreting / Check transit routes."
                          : isModerateRisk
                          ? "PRECAUTIONARY: High cloud density, bring rain gear."
                          : "NORMAL GROUND STATUS: Optimal condition for field operations."}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[10px] text-slate-300">
                    <span>Cloud: <strong>{cloudCover}%</strong></span>
                    <span>Rain: <strong>{currentRain > 0 ? `${currentRain} mm/h` : "Dry"}</strong></span>
                    <span>Temp: <strong>{current?.temperature ?? 30}°C</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. NEWS ANCHOR TELEPROMPTER REPORT CARD (4 Columns) */}
        <div className="lg:col-span-4 bg-gradient-to-b from-[#0b1726] to-[#08121f] p-4 sm:p-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 space-y-4">
          <div className="space-y-4">
            {/* Focus City Header */}
            <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Ground Station Telemetry
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {selectedLocation?.name || activeCity.name}
                </h3>
                <p className="text-[11px] text-slate-400">{selectedLocation?.city || activeCity.region}</p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-white">{current?.temperature ?? activeCity.temp}°C</span>
                <span className="block text-[10px] text-emerald-400 font-bold">{current?.condition?.label || activeCity.condition}</span>
              </div>
            </div>

            {/* News Anchor Bulletin Script */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/70 text-xs space-y-2 shadow-inner">
              <div className="flex items-center gap-1.5 text-emerald-400 font-black text-[10px] uppercase tracking-wider">
                <Radio size={12} className="animate-pulse" />
                <span>Anchor Meteorological Script</span>
              </div>
              <p className="text-slate-200 leading-relaxed text-[11px]">
                "{activeCity.advisory}"
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                <span>Peak Window: <strong className="text-white">{activeCity.rainWindow}</strong></span>
                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold">
                  {rainProb}% Rain
                </span>
              </div>
            </div>

            {/* Weather Disturbance / Tropical Cyclone Status */}
            <div
              className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                activeCyclone.signal > 0
                  ? "bg-rose-950/50 border-rose-800/80 text-rose-100"
                  : "bg-slate-900/60 border-slate-800 text-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <ShieldAlert
                    size={12}
                    className={activeCyclone.signal > 0 ? "text-rose-400" : "text-emerald-400"}
                  />
                  PAGASA Disturbance Status
                </span>
                {activeCyclone.signal > 0 && (
                  <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded">
                    Signal #{activeCyclone.signal}
                  </span>
                )}
              </div>
              <p className="font-bold text-white text-xs">{activeCyclone.name}</p>
              <p className="text-[11px] opacity-85 leading-snug">{activeCyclone.desc}</p>
            </div>

            {/* Operational Indicators */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold">
                  <Droplets size={12} className="text-sky-400" />
                  <span>Rain Probability</span>
                </div>
                <p className="text-sm font-black text-white mt-1">{rainProb}%</p>
                <span className="text-[9px] text-slate-500">Doppler forecast</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-semibold">
                  <Wind size={12} className="text-teal-400" />
                  <span>Wind Velocity</span>
                </div>
                <p className="text-sm font-black text-white mt-1">{current?.windSpeed ?? 10} km/h</p>
                <span className="text-[9px] text-slate-500">{current?.windDirection ?? "ENE"} vector</span>
              </div>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Center Satellite on City:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {RADAR_CITIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveCity(c);
                    const matched = PHILIPPINE_AREAS.find((a) => a.id === c.id);
                    if (matched && onSelectLocation) onSelectLocation(matched);
                    setIframeKey(Date.now());
                  }}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-bold text-left transition cursor-pointer border truncate ${
                    (selectedLocation?.id || activeCity.id) === c.id
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {c.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. LOWER-THIRD NEWS TICKER */}
      <div className="bg-[#b91c1c] text-white flex items-center overflow-hidden h-9 border-t border-rose-600 shadow-md">
        <div className="bg-amber-400 text-slate-950 font-black px-3.5 h-full flex items-center gap-1 text-xs shrink-0 tracking-wider shadow-sm z-10 uppercase">
          <span>BREAKING</span>
          <span className="hidden sm:inline">BULLETIN</span>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="inline-block whitespace-nowrap text-xs font-bold pl-4 animate-marquee">
            <span>
              🔴 LIVE SATELLITE STATUS: Cloud density at {cloudCover}% over {selectedLocation?.name || activeCity.name} •
              Rain risk peaks at {rainProb}% • Surface heat index: {current?.feelsLike ?? 38}°C • PAGASA PAR STATUS:{" "}
              {activeCyclone.name} • All field supervisors (SIMCON) advised to monitor local radar updates •
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
