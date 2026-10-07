/**
 * Weather Service for HRHub Workspace
 * Uses Open-Meteo API (100% Free, no API key required, CORS-ready)
 * Supports auto-detecting Laptop/Device GPS coordinates, distance sorting for nearby areas,
 * and reverse geocoding for Philippine localities.
 */

export const PHILIPPINE_AREAS = [
  { id: "makati", name: "Makati HQ", city: "Makati City", region: "Metro Manila", lat: 14.5547, lon: 121.0244 },
  { id: "bgc", name: "BGC / Taguig Hub", city: "Taguig City", region: "Metro Manila", lat: 14.5469, lon: 121.0504 },
  { id: "ortigas", name: "Ortigas Center", city: "Pasig City", region: "Metro Manila", lat: 14.5869, lon: 121.0614 },
  { id: "qc", name: "Quezon City Office", city: "Quezon City", region: "Metro Manila", lat: 14.6760, lon: 121.0437 },
  { id: "manila", name: "Manila Port & Logistics", city: "City of Manila", region: "Metro Manila", lat: 14.5995, lon: 120.9842 },
  { id: "alabang", name: "Alabang / South Hub", city: "Muntinlupa City", region: "Metro Manila", lat: 14.4173, lon: 121.0416 },
  { id: "cavite", name: "Cavite Operations Site", city: "Imus, Cavite", region: "Calabarzon", lat: 14.4296, lon: 120.9367 },
  { id: "laguna", name: "Laguna Plant Site", city: "Santa Rosa, Laguna", region: "Calabarzon", lat: 14.3122, lon: 121.1114 },
  { id: "batangas", name: "Batangas Port Facility", city: "Batangas City", region: "Calabarzon", lat: 13.7565, lon: 121.0583 },
  { id: "clark", name: "Clark Hub / Pampanga", city: "Mabalacat, Pampanga", region: "Central Luzon", lat: 15.1764, lon: 120.5282 },
  { id: "bulacan", name: "Bulacan Project Office", city: "Malolos, Bulacan", region: "Central Luzon", lat: 14.8527, lon: 120.8160 },
  { id: "cebu", name: "Cebu Regional Branch", city: "Cebu City", region: "Visayas", lat: 10.3157, lon: 123.8854 },
  { id: "iloilo", name: "Iloilo Hub", city: "Iloilo City", region: "Visayas", lat: 10.7202, lon: 122.5621 },
  { id: "davao", name: "Davao Operations Site", city: "Davao City", region: "Mindanao", lat: 7.0731, lon: 125.6128 },
  { id: "cdo", name: "Cagayan de Oro Branch", city: "CDO", region: "Mindanao", lat: 8.4542, lon: 124.6319 }
];

export const RECENT_CYCLONES_PAGASA = [
  { name: "None (Clear PAR)", signal: 0, category: "Normal", desc: "No active tropical cyclone inside the Philippine Area of Responsibility (PAR)." },
  { name: "Severe Tropical Storm 'KRISTINE'", signal: 2, category: "Severe Tropical Storm", desc: "Heavy to intense rainfall with gusty winds. Field operations suspended." },
  { name: "Super Typhoon 'PEPITO'", signal: 3, category: "Super Typhoon", desc: "Destructive typhoon-force winds. Full office work suspension recommended." },
  { name: "Typhoon 'LEON'", signal: 1, category: "Typhoon", desc: "Intermittent rain showers. Heightened vigilance for outdoor operations." },
  { name: "Tropical Depression 'ENTENG'", signal: 1, category: "Tropical Depression", desc: "Scattered rain showers. Prepare umbrellas and check road flood advisories." }
];

/**
 * Compute Haversine distance in kilometers between two GPS coordinates
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Get nearby areas sorted by distance from given coordinates
 */
export function getNearbyAreasSorted(currentLat, currentLon) {
  return PHILIPPINE_AREAS.map((area) => {
    const distKm = getDistanceKm(currentLat, currentLon, area.lat, area.lon);
    return { ...area, distKm };
  }).sort((a, b) => a.distKm - b.distKm);
}

/**
 * Reverse geocode GPS coordinates to obtain a readable Philippine locality name
 */
export async function reverseGeocodeLocation(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const city = data.city || data.locality || data.principalSubdivision || "";
      const region = data.principalSubdivision || "";
      if (city) {
        return {
          city: region && !city.includes(region) ? `${city}, ${region}` : city,
          name: `Current Location (${city})`
        };
      }
    }
  } catch (err) {
    console.warn("Reverse geocode failed, finding nearest known area:", err);
  }

  // Fallback: Find nearest known Philippine area
  const nearest = getNearbyAreasSorted(lat, lon)[0];
  return {
    city: nearest ? nearest.city : "Detected Location",
    name: nearest ? `Current Location (Near ${nearest.city})` : "Current Laptop Location"
  };
}

export function getWeatherConditionInfo(code) {
  // WMO Weather interpretation codes (WW)
  if (code === 0) {
    return { label: "Clear Sky", icon: "Sun", isRain: false };
  }
  if (code >= 1 && code <= 3) {
    return {
      label: code === 1 ? "Mainly Clear" : code === 2 ? "Partly Cloudy" : "Overcast",
      icon: code === 3 ? "Cloud" : "CloudSun",
      isRain: false
    };
  }
  if (code === 45 || code === 48) {
    return { label: "Foggy / Mist", icon: "CloudFog", isRain: false };
  }
  if (code >= 51 && code <= 57) {
    return { label: "Light Drizzle", icon: "CloudDrizzle", isRain: true };
  }
  if (code >= 61 && code <= 67) {
    return {
      label: code >= 65 ? "Heavy Rain" : "Moderate Rain",
      icon: "CloudRain",
      isRain: true
    };
  }
  if (code >= 80 && code <= 82) {
    return {
      label: "Heavy Showers",
      icon: "CloudRain",
      isRain: true
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      label: "Thunderstorm",
      icon: "CloudLightning",
      isRain: true
    };
  }
  return { label: "Fair Weather", icon: "CloudSun", isRain: false };
}

export function evaluateRainAdvisory(rainProb, rainSum = 0) {
  if (rainProb >= 70 || rainSum >= 15) {
    return {
      level: "high",
      badge: "High Rain Risk",
      title: "High Probability of Rain / Flooding Risk",
      advice: "Notify field and site supervisors (SIMCON). Prepare contingency plans for commute delays and potential remote work / WFH.",
      bgColor: "bg-rose-50/80 border-rose-200 text-rose-800",
      pillColor: "bg-rose-500 text-white",
      dotColor: "bg-rose-500",
      probability: rainProb
    };
  }
  if (rainProb >= 40 || rainSum >= 5) {
    return {
      level: "moderate",
      badge: "Moderate Rain Expected",
      title: "Scattered Rain Showers Expected",
      advice: "Advise employees to bring umbrellas. Outdoor activities and logistics deliveries should monitor local hourly radar.",
      bgColor: "bg-amber-50/80 border-amber-200 text-amber-800",
      pillColor: "bg-amber-500 text-white",
      dotColor: "bg-amber-500",
      probability: rainProb
    };
  }
  if (rainProb >= 20) {
    return {
      level: "low",
      badge: "Low Rain Chance",
      title: "Low Chance of Isolated Showers",
      advice: "Favorable conditions for standard operations. Minor isolated afternoon drizzle may occur.",
      bgColor: "bg-sky-50/80 border-sky-200 text-sky-800",
      pillColor: "bg-sky-500 text-white",
      dotColor: "bg-sky-500",
      probability: rainProb
    };
  }
  return {
    level: "clear",
    badge: "Fair & Clear",
    title: "Clear Conditions / No Heavy Rain Expected",
    advice: "Optimal weather for site inspections, outdoor branch audits, and standard business operations.",
    bgColor: "bg-emerald-50/80 border-emerald-200 text-emerald-800",
    pillColor: "bg-emerald-600 text-white",
    dotColor: "bg-emerald-500",
    probability: rainProb
  };
}

/**
 * Identify exact time periods when rain is expected
 */
function extractRainTimeWindows(hourlyItems) {
  const rainyHours = hourlyItems.filter((h) => h.rainProb >= 40 || h.rainSum >= 0.5);
  if (rainyHours.length === 0) {
    return {
      hasRain: false,
      summary: "No significant rain expected in the upcoming hours."
    };
  }

  // Peak hour
  const peak = [...rainyHours].sort((a, b) => b.rainProb - a.rainProb)[0];
  const first = rainyHours[0];
  const last = rainyHours[rainyHours.length - 1];

  return {
    hasRain: true,
    firstHour: first.timeLabel,
    lastHour: last.timeLabel,
    peakHour: peak.timeLabel,
    peakProb: peak.rainProb,
    peakSum: peak.rainSum,
    summary: `Rain expected around ${first.timeLabel} – ${last.timeLabel} (Peak: ${peak.rainProb}% at ${peak.timeLabel})`
  };
}

export function getCardinalDirection(deg = 0) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(deg / 45) % 8];
}

/**
 * Fetch complete weather forecast: current, hourly timeline, multi-day, and rain windows
 */
export async function fetchWeatherForecast(lat = 14.5547, lon = 121.0244, forceFresh = false) {
  const cacheKey = `hrhub_weather_v4_${lat.toFixed(3)}_${lon.toFixed(3)}`;

  if (!forceFresh) {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        // Cache for 15 minutes
        if (Date.now() - timestamp < 15 * 60 * 1000) {
          return { data, fromCache: true };
        }
      }
    } catch {
      // Ignore cache error
    }
  }

  const endpoint = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,cloud_cover,precipitation,wind_direction_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=Asia%2FManila&forecast_days=5`;

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Weather request failed with status: ${response.status}`);
  }

  const raw = await response.json();

  // Process multi-day forecasts
  const dailyForecasts = (raw.daily?.time || []).map((dateStr, index) => {
    const code = raw.daily.weather_code[index];
    const maxTemp = Math.round(raw.daily.temperature_2m_max[index]);
    const minTemp = Math.round(raw.daily.temperature_2m_min[index]);
    const rainProb = raw.daily.precipitation_probability_max?.[index] ?? 0;
    const rainSum = raw.daily.precipitation_sum?.[index] ?? 0;
    const condition = getWeatherConditionInfo(code);

    const d = new Date(dateStr);
    const dayLabel =
      index === 0
        ? "Today"
        : index === 1
        ? "Tomorrow"
        : d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    return {
      date: dateStr,
      dayLabel,
      isToday: index === 0,
      isTomorrow: index === 1,
      maxTemp,
      minTemp,
      rainProb,
      rainSum,
      condition,
      advisory: evaluateRainAdvisory(rainProb, rainSum)
    };
  });

  // Process hourly timeline (Next 24 hours starting from current local hour)
  const now = new Date();
  const currentHourISO = now.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"

  const allHourlyTimes = raw.hourly?.time || [];
  let startIndex = allHourlyTimes.findIndex((t) => t.startsWith(currentHourISO));
  if (startIndex === -1) {
    startIndex = 0;
  }

  // Take next 24 hours
  const next24Hours = allHourlyTimes.slice(startIndex, startIndex + 24).map((timeStr, idx) => {
    const actualIndex = startIndex + idx;
    const hourDate = new Date(timeStr);
    const hourNum = hourDate.getHours();
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    const timeLabel = `${displayHour}:00 ${ampm}`;

    const temp = Math.round(raw.hourly.temperature_2m[actualIndex] ?? 0);
    const rainProb = raw.hourly.precipitation_probability[actualIndex] ?? 0;
    const rainSum = raw.hourly.precipitation[actualIndex] ?? 0;
    const code = raw.hourly.weather_code[actualIndex] ?? 0;
    const condition = getWeatherConditionInfo(code);

    return {
      timeStr,
      timeLabel,
      hourNum,
      temp,
      rainProb,
      rainSum,
      condition,
      isNextDay: hourDate.getDate() !== now.getDate()
    };
  });

  const todayUpcoming = next24Hours.filter((h) => !h.isNextDay);
  const tomorrowHours = next24Hours.filter((h) => h.isNextDay);

  const todayRainWindow = extractRainTimeWindows(todayUpcoming);
  const tomorrowRainWindow = extractRainTimeWindows(tomorrowHours);

  const currentCondition = getWeatherConditionInfo(raw.current?.weather_code);

  const processed = {
    updatedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    current: {
      temperature: Math.round(raw.current?.temperature_2m ?? 0),
      feelsLike: Math.round(raw.current?.apparent_temperature ?? raw.current?.temperature_2m ?? 0),
      humidity: Math.round(raw.current?.relative_humidity_2m ?? 0),
      windSpeed: Math.round(raw.current?.wind_speed_10m ?? 0),
      windDirection: getCardinalDirection(raw.current?.wind_direction_10m ?? 0),
      cloudCover: Math.round(raw.current?.cloud_cover ?? 0),
      precipitation: raw.current?.precipitation ?? 0,
      pressure: Math.round(raw.current?.surface_pressure ?? 1010),
      condition: currentCondition
    },
    todayRainWindow,
    tomorrowRainWindow,
    hourly: next24Hours,
    tomorrow: dailyForecasts[1] || null,
    daily: dailyForecasts
  };

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: processed }));
  } catch {
    // Ignore cache error
  }

  return { data: processed, fromCache: false };
}
