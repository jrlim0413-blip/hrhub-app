import { useState, useEffect, useRef, useMemo } from "react";
import {
  MapPin, ShieldAlert, CheckCircle2, AlertTriangle, Layers, Navigation,
  Search, Plus, Eye, RefreshCw, Compass, Info, X, ChevronRight,
  Building2, Check, ExternalLink, Flag, Sliders, Radio, Globe,
  ShieldCheck, ArrowUpRight, Award, Map, CornerDownRight, Car,
  MapPinned, HelpCircle, CheckCheck, XCircle, Filter, Route, Milestone,
  LocateFixed, Play, Pause, RotateCcw, FastForward, ArrowRight,
  MoveRight, Navigation2, Crosshair, ListFilter, ArrowLeft,
  Bus, Factory, Warehouse, Users, Clock, Sparkles, Copy,
  Store, Phone, Wifi, Smartphone, Cloud, Ruler, Scale, CircleDollarSign, TrendingUp
} from "lucide-react";

// Centralized Multi-User Cloud Database & Realtime Sync Service for Booths
import {
  fetchCentralBooths,
  saveCentralBooth,
  deleteCentralBooth,
  subscribeToCentralBooths,
  getLocalCachedBooths
} from "../services/geoBoothsService";

// Official 1,983-point real street route passing through ALL 16 EDGE BARANGAYS of Mandaue City
import SNAPPED_EDGE_ROUTE_COORDS from "../data/mandaueEdgeBarangaysRoute.json";

// Dedicated individual real-road perimeter circuits & official boundaries for ALL 27 BARANGAYS of Mandaue City
import BARANGAY_PERIMETER_ROUTES from "../data/barangayPerimeterRoutes.json";

// Public transport terminals & industrial factories data
import MANDAUE_POIS from "../data/mandauePOIs.json";

// Live Source API Configuration & Pre-Cached Agents Data
import { API_CONFIG } from "../config/apiConfig";
import SOURCE_AGENTS_CACHE from "../data/sourceApiAgentsCache.json";

// Official mapping between Barangay Circuit IDs and Source API brgyId
export const BARANGAY_API_IDS = {
  casili: ["33"],
  subangdaku: ["47"],
  banilad: ["28"],
  cabancalan: ["30"],
  canduman: ["32"],
  tawason: ["49"],
  cubacub: ["36"],
  jagobiao: ["39"],
  paknaan: ["46"],
  labogon: ["40"],
  umapad: ["52"],
  opao: ["44"],
  looc: ["41"],
  cambaro: ["31"],
  centro: ["35"],
  tipolo: ["51"],
  bakilid: ["27"],
  basak: ["29"],
  maguikay: ["42"],
  tabok: ["48"],
  pagsabungan: ["45"],
  tingub: ["50"],
  casuntingan: ["34"],
  guizo: ["37"],
  mantuyong: ["43"],
  alang_alang: ["26"],
  ibabao: ["54", "38"]
};

// Helper function to format GPS coordinates cleanly in standard navigation format
export function formatGPS(coords) {
  if (!coords || coords.length < 2) return "N/A";
  const lat = coords[0];
  const lng = coords[1];
  const latStr = `${Math.abs(lat).toFixed(5)}° ${lat >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(lng).toFixed(5)}° ${lng >= 0 ? "E" : "W"}`;
  return `${latStr}, ${lngStr}`;
}

// Ray-casting algorithm for checking if a coordinate point is strictly inside a closed polygon
export function pointInPolygon(point, vs) {
  if (!vs || vs.length < 3) return false;
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Distance from point to line segment squared
function distToSegmentSquared(p, v, w) {
  const l2 = (v[0] - w[0]) ** 2 + (v[1] - w[1]) ** 2;
  if (l2 === 0) return (p[0] - v[0]) ** 2 + (p[1] - v[1]) ** 2;
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return (p[0] - (v[0] + t * (w[0] - v[0]))) ** 2 + (p[1] - (v[1] + t * (w[1] - v[1]))) ** 2;
}

// Great-circle / Haversine distance in meters between two GPS coordinates
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth mean radius in meters
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper to get yesterday's ISO date string (YYYY-MM-DD) and formatted display label
export function getYesterdayDates() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const pad = (n) => String(n).padStart(2, "0");
  const isoDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const displayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(d);
  return { isoDate, displayLabel };
}

// Helper to determine if an agent record is Active or Inactive
export function checkAgentIsActive(agent) {
  if (!agent) return false;
  if (agent.deleted_at) return false;

  // Primary API property (0 or 1, or boolean)
  if (agent.isActive !== undefined && agent.isActive !== null) {
    if ([0, "0", false, "false", "inactive", "disabled"].includes(agent.isActive)) return false;
    if ([1, "1", true, "true", "active", "enabled"].includes(agent.isActive)) return true;
  }

  // Secondary property names
  if (agent.is_active !== undefined && agent.is_active !== null) {
    if ([0, "0", false, "false", "inactive", "disabled"].includes(agent.is_active)) return false;
    if ([1, "1", true, "true", "active", "enabled"].includes(agent.is_active)) return true;
  }

  const status = agent.status ?? agent.account_status ?? agent.accountStatus ?? agent.active;
  if (status !== undefined && status !== null && status !== "") {
    const normalized = String(status).toLowerCase().trim();
    if (["active", "enabled", "1", "true", "live", "approved"].includes(normalized)) return true;
    if (["inactive", "disabled", "0", "false", "suspended", "banned"].includes(normalized)) return false;
  }

  return false;
}

// ================= OFFICIAL ILLUSTRATED KIOSK BOOTH SVG ICON =================
// Authentic illustrated kiosk directly matching uploaded design (canopy, service window, teller & counter)
export function KioskIconSvg({ width = 48, height = 62, className = "" }) {
  return (
    <svg
      viewBox="0 0 100 130"
      width={width}
      height={height}
      className={className}
      style={{ display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Roof Canopy (Rounded Top) */}
      <rect x="5" y="6" width="90" height="26" rx="13" fill="#f5a623" stroke="#18181b" strokeWidth="5.5" strokeLinejoin="round" />
      <path d="M 16 19 L 84 19" stroke="#18181b" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />

      {/* 2. Service Window Backing & Pillars */}
      <rect x="14" y="30" width="72" height="40" fill="#f5a623" stroke="#18181b" strokeWidth="5" strokeLinejoin="round" />

      {/* 3. Teller Attendant Person Inside Kiosk */}
      <circle cx="50" cy="45" r="9" fill="#f5a623" stroke="#18181b" strokeWidth="4.5" />
      <path d="M 34 69 C 34 55, 66 55, 66 69 Z" fill="#f5a623" stroke="#18181b" strokeWidth="4.5" strokeLinejoin="round" />

      {/* 4. Front Service Counter Desk */}
      <rect x="3" y="66" width="94" height="16" rx="8" fill="#f5a623" stroke="#18181b" strokeWidth="5.5" strokeLinejoin="round" />

      {/* 5. Lower Kiosk Cabinet Base */}
      <rect x="9" y="80" width="82" height="42" rx="10" fill="#f5a623" stroke="#18181b" strokeWidth="5.5" strokeLinejoin="round" />
      {/* Cabinet Front Inset Panel */}
      <rect x="19" y="90" width="62" height="22" rx="6" fill="#f5a623" stroke="#18181b" strokeWidth="4.5" strokeLinejoin="round" />
    </svg>
  );
}

// Generates the raw SVG HTML string for Leaflet divIcon and popups
export function getKioskSvgHtml(width = 48, height = 62) {
  return `
    <svg viewBox="0 0 100 130" width="${width}" height="${height}" style="display: block; filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));" xmlns="http://www.w3.org/2000/svg">
      <rect x="5" y="6" width="90" height="26" rx="13" fill="#f5a623" stroke="#18181b" stroke-width="5.5" stroke-linejoin="round" />
      <path d="M 16 19 L 84 19" stroke="#18181b" stroke-width="3.5" stroke-linecap="round" opacity="0.9" />
      <rect x="14" y="30" width="72" height="40" fill="#f5a623" stroke="#18181b" stroke-width="5" stroke-linejoin="round" />
      <circle cx="50" cy="45" r="9" fill="#f5a623" stroke="#18181b" stroke-width="4.5" />
      <path d="M 34 69 C 34 55, 66 55, 66 69 Z" fill="#f5a623" stroke="#18181b" stroke-width="4.5" stroke-linejoin="round" />
      <rect x="3" y="66" width="94" height="16" rx="8" fill="#f5a623" stroke="#18181b" stroke-width="5.5" stroke-linejoin="round" />
      <rect x="9" y="80" width="82" height="42" rx="10" fill="#f5a623" stroke="#18181b" stroke-width="5.5" stroke-linejoin="round" />
      <rect x="19" y="90" width="62" height="22" rx="6" fill="#f5a623" stroke="#18181b" stroke-width="4.5" stroke-linejoin="round" />
    </svg>
  `;
}

// Shortest distance from point to polygon boundary
function distToPolygon(point, vs) {
  if (!vs || vs.length < 2) return Infinity;
  let minD2 = Infinity;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const d2 = distToSegmentSquared(point, vs[i], vs[j]);
    if (d2 < minD2) minD2 = d2;
  }
  return Math.sqrt(minD2);
}

// High-precision Barangay detector from GPS Coordinates (Snaps to all 27 cadastral polygons)
export function detectBarangayFromCoords(lat, lng) {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) return null;
  const pt = [numLat, numLng];

  // 1. Strict containment in official cadastral survey polygons
  const insideMatches = [];
  for (const [id, data] of Object.entries(BARANGAY_PERIMETER_ROUTES)) {
    if (data.boundaryPolygon && data.boundaryPolygon.length > 2) {
      if (pointInPolygon(pt, data.boundaryPolygon)) {
        insideMatches.push({ id, name: data.name, polygon: data.boundaryPolygon, data });
      }
    }
  }

  if (insideMatches.length === 1) {
    return {
      id: insideMatches[0].id,
      name: insideMatches[0].name,
      confidence: "100% Cadastral Survey Match",
      detail: "Coordinates fall strictly within official survey boundary polygon.",
      data: insideMatches[0].data
    };
  }

  if (insideMatches.length > 1) {
    let best = insideMatches[0];
    let minD = Infinity;
    insideMatches.forEach(m => {
      let sLat = 0, sLng = 0;
      m.polygon.forEach(p => { sLat += p[0]; sLng += p[1]; });
      const d = Math.hypot(pt[0] - (sLat / m.polygon.length), pt[1] - (sLng / m.polygon.length));
      if (d < minD) { minD = d; best = m; }
    });
    return {
      id: best.id,
      name: best.name,
      confidence: "Cadastral Boundary Edge",
      detail: "Coordinates lie on shared border; assigned by geographic centroid proximity.",
      data: best.data
    };
  }

  // 2. Proximity fallback to nearest cadastral perimeter
  let best = null;
  let minEdgeDist = Infinity;
  for (const [id, data] of Object.entries(BARANGAY_PERIMETER_ROUTES)) {
    if (data.boundaryPolygon && data.boundaryPolygon.length > 2) {
      const d = distToPolygon(pt, data.boundaryPolygon);
      if (d < minEdgeDist) {
        minEdgeDist = d;
        best = { id, name: data.name, distMeters: Math.round(d * 111139), data };
      }
    }
  }

  if (best) {
    return {
      id: best.id,
      name: best.name,
      confidence: best.distMeters < 350 ? "Border Proximity Match" : "Nearest Boundary Proximity",
      detail: `Approximately ${best.distMeters}m from Brgy. ${best.name} perimeter boundary.`,
      distMeters: best.distMeters,
      data: best.data
    };
  }

  return null;
}

// ================= ALL 16 EDGE BARANGAYS (OUTER PERIMETER CIRCUIT) =================
export const EDGE_BARANGAYS_CIRCUIT = [
  {
    step: 1,
    id: "subangdaku",
    name: "Subangdaku",
    routeIndex: 0,
    coords: [10.32363, 123.92073],
    edgeSector: "Southernmost Border Edge",
    mainRoad: "M.C. Briones Highway & Hernan Cortes St",
    bordersWith: "Mabolo & Kasambagan, Cebu City",
    landmark: "Mahiga Creek Culvert Bridge",
    instruction: "Perimeter route starts at Subangdaku Mahiga Bridge. Proceed North along Lopez Jaena into Tipolo."
  },
  {
    step: 2,
    id: "tipolo",
    name: "Tipolo",
    routeIndex: 94,
    coords: [10.32683, 123.92866],
    edgeSector: "South Commercial Edge",
    mainRoad: "Lopez Jaena Street & M.C. Briones",
    bordersWith: "Cebu City corridor via Tipolo River",
    landmark: "San Miguel Brewery Complex",
    instruction: "Follow Lopez Jaena St towards A.S. Fortuna junction to enter Banilad."
  },
  {
    step: 3,
    id: "banilad",
    name: "Banilad (Mandaue)",
    routeIndex: 316,
    coords: [10.34477, 123.91350],
    edgeSector: "South-West Border Edge",
    mainRoad: "A.S. Fortuna Street & Gov. M. Cuenco Ave",
    bordersWith: "Banilad, Cebu City (BTC & Country Mall)",
    landmark: "Banilad Flyover & Oakridge Business Park",
    instruction: "A.S. Fortuna eastward is Mandaue. West of flyover is Cebu City. Turn North along Gov. Cuenco into Cabancalan."
  },
  {
    step: 4,
    id: "cabancalan",
    name: "Cabancalan",
    routeIndex: 480,
    coords: [10.35996, 123.91927],
    edgeSector: "Western Border Edge",
    mainRoad: "Kauswagan Road & M.L. Quezon Ave",
    bordersWith: "Talamban, Cebu City (USC Campus)",
    landmark: "Tintay Creek Bridge & Terminal Junction",
    instruction: "East of Tintay Creek is Cabancalan. West is Talamban. Follow Kauswagan Rd into Canduman."
  },
  {
    step: 5,
    id: "canduman",
    name: "Canduman",
    routeIndex: 709,
    coords: [10.36835, 123.92744],
    edgeSector: "North-West Border Edge",
    mainRoad: "Canduman Road & H. Abellana St",
    bordersWith: "Talamban border slopes & Consolacion",
    landmark: "Sacred Heart School - Ateneo de Cebu",
    instruction: "Drive along Canduman Road and turn into Tawason highlands."
  },
  {
    step: 6,
    id: "tawason",
    name: "Tawason",
    routeIndex: 774,
    coords: [10.37500, 123.92300],
    edgeSector: "North-West Highland Edge",
    mainRoad: "Tawason Road",
    bordersWith: "Consolacion Mountain Ridge",
    landmark: "Tawason Hills",
    instruction: "Follow Tawason road connecting towards Casili northern border."
  },
  {
    step: 7,
    id: "casili",
    name: "Casili",
    routeIndex: 863,
    coords: [10.38650, 123.92950],
    edgeSector: "Northernmost Mountain Edge",
    mainRoad: "Casili Mountain Road & Ridge Link",
    bordersWith: "Consolacion Highland Barangays (Panas, Sacsac, Polog)",
    landmark: "Casili Hills & Boundary Marker",
    instruction: "Northernmost boundary of Mandaue City. Proceed East into Cubacub."
  },
  {
    step: 8,
    id: "cubacub",
    name: "Cubacub",
    routeIndex: 1033,
    coords: [10.37398, 123.93505],
    edgeSector: "North Border Edge",
    mainRoad: "Cubacub Road & Pagsabungan Link",
    bordersWith: "Consolacion Border Ridge",
    landmark: "Greenhills Subdivisions",
    instruction: "Follow Cubacub road down towards Cebu North National Highway into Jagobiao."
  },
  {
    step: 9,
    id: "jagobiao",
    name: "Jagobiao",
    routeIndex: 1231,
    coords: [10.37551, 123.95379],
    edgeSector: "North Highway Border Edge",
    mainRoad: "Cebu North National Highway",
    bordersWith: "Cansaga, Consolacion (Welcome Arch)",
    landmark: "Jagobiao Bridge & Eversley Sanitarium",
    instruction: "South of bridge is Mandaue. North past arch is Consolacion. Turn South-East to Paknaan Coastal."
  },
  {
    step: 10,
    id: "paknaan",
    name: "Paknaan",
    routeIndex: 1323,
    coords: [10.37042, 123.96802],
    edgeSector: "North-East Coastal Edge",
    mainRoad: "Cebu North Coastal Road",
    bordersWith: "Consolacion Coastal across Cansaga Bay",
    landmark: "Cansaga Bay Bridge Southern Abutment",
    instruction: "Stay on Mandaue side of Cansaga Bridge. Follow coastal highway South into Labogon."
  },
  {
    step: 11,
    id: "labogon",
    name: "Labogon",
    routeIndex: 1468,
    coords: [10.34735, 123.96146],
    edgeSector: "Eastern Coastal Edge",
    mainRoad: "Labogon Coastal Road",
    bordersWith: "Mactan Channel Shoreline",
    landmark: "Labogon Industrial Corridor",
    instruction: "Follow shoreline highway South towards Marcelo Fernan Bridge approach."
  },
  {
    step: 12,
    id: "umapad",
    name: "Umapad",
    routeIndex: 1569,
    coords: [10.32956, 123.96457],
    edgeSector: "Fernan Bridge Gateway Edge",
    mainRoad: "United Nations (U.N.) Avenue",
    bordersWith: "Lapu-Lapu City across Mactan Channel",
    landmark: "Marcelo Fernan Bridge Western Landing",
    instruction: "Mainland ramp is Mandaue. Follow D.M. Cortes Ave South into Opao."
  },
  {
    step: 13,
    id: "opao",
    name: "Opao",
    routeIndex: 1704,
    coords: [10.32712, 123.95707],
    edgeSector: "Channel Waterfront Edge",
    mainRoad: "D.M. Cortes Avenue",
    bordersWith: "Mactan Channel Shipyards",
    landmark: "Opao Wharf & Shipyards",
    instruction: "Drive along D.M. Cortes Ave towards First Mactan Bridge in Looc."
  },
  {
    step: 14,
    id: "looc",
    name: "Looc",
    routeIndex: 1747,
    coords: [10.32045, 123.94883],
    edgeSector: "First Bridge Gateway Edge",
    mainRoad: "A.C. Cortes Avenue & Looc Port Road",
    bordersWith: "Lapu-Lapu City (First Bridge Span)",
    landmark: "First Mandaue-Mactan Bridge Mainland Ramp",
    instruction: "Drive under bridge approach into Cambaro and Centro commercial core."
  },
  {
    step: 15,
    id: "cambaro",
    name: "Cambaro",
    routeIndex: 1812,
    coords: [10.32488, 123.94420],
    edgeSector: "Urban Coastal Edge",
    mainRoad: "Ouano Avenue & C.D. Seno St",
    bordersWith: "Mactan Channel Port Docks",
    landmark: "Mandaue Reclamation Corridor",
    instruction: "Follow coastal boulevard into Centro port sector."
  },
  {
    step: 16,
    id: "centro",
    name: "Centro (Poblacion)",
    routeIndex: 1895,
    coords: [10.32598, 123.93910],
    edgeSector: "South Harbor & City Hall Edge",
    mainRoad: "F.B. Cabahug St & Ouano Wharf",
    bordersWith: "South Harbor Water Boundary",
    landmark: "Mandaue Presidencia (City Hall) & San Jose Parish",
    instruction: "From Centro, connect back along Lopez Jaena to complete perimeter circuit at Subangdaku."
  }
];

// ================= ALL 11 INTERIOR BARANGAYS =================
export const INTERIOR_BARANGAYS = [
  { id: "bakilid", name: "Bakilid", coords: [10.33400, 123.93000], mainRoad: "A.S. Fortuna St" },
  { id: "basak", name: "Basak", coords: [10.35400, 123.94800], mainRoad: "M.C. Briones Highway" },
  { id: "maguikay", name: "Maguikay", coords: [10.34100, 123.93600], mainRoad: "M.C. Briones Highway & Flyover" },
  { id: "tabok", name: "Tabok", coords: [10.36200, 123.94400], mainRoad: "M.C. Briones Highway" },
  { id: "pagsabungan", name: "Pagsabungan", coords: [10.36100, 123.93800], mainRoad: "Pagsabungan Road" },
  { id: "tingub", name: "Tingub", coords: [10.36800, 123.94100], mainRoad: "Tingub Road" },
  { id: "casuntingan", name: "Casuntingan", coords: [10.34700, 123.92500], mainRoad: "Cabancalan-Casuntingan Road" },
  { id: "guizo", name: "Guizo", coords: [10.33000, 123.93600], mainRoad: "A. Del Rosario St" },
  { id: "mantuyong", name: "Mantuyong", coords: [10.32800, 123.93800], mainRoad: "B. Ceniza St" },
  { id: "alang_alang", name: "Alang-Alang", coords: [10.33500, 123.94500], mainRoad: "Plaridel St & UN Ave" },
  { id: "ibabao", name: "Ibabao-Estancia", coords: [10.33600, 123.94100], mainRoad: "Plaridel St" }
];

export const ALL_27_BARANGAYS = [
  ...EDGE_BARANGAYS_CIRCUIT.map(b => ({ ...b, isEdge: true })),
  ...INTERIOR_BARANGAYS.map((b, idx) => ({ ...b, step: 16 + idx + 1, isEdge: false }))
];

export default function OperationsGeoTaggingPanel({ onClose }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);
  const layersGroupRef = useRef(null);
  const carMarkerRef = useRef(null);
  const clickedMarkerRef = useRef(null);
  const measureLineGroupRef = useRef(null);

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [selectedEdgeBarangay, setSelectedEdgeBarangay] = useState(EDGE_BARANGAYS_CIRCUIT[0]);

  // Kiosk Distance Measuring & Agent Gross Performance States
  const [measuringSourceKiosk, setMeasuringSourceKiosk] = useState(null);
  const measuringSourceKioskRef = useRef(null);
  const [measuredPair, setMeasuredPair] = useState(null); // { source, target, distanceMeters }
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);

  // Sync ref for immediate Leaflet marker click handling
  useEffect(() => {
    measuringSourceKioskRef.current = measuringSourceKiosk;
  }, [measuringSourceKiosk]);

  // Gross remittance records cache (specifically for yesterday's draw sales)
  const [grossRecords, setGrossRecords] = useState(() => {
    try {
      const { isoDate } = getYesterdayDates();
      const cached = sessionStorage.getItem(`hrhub_yesterday_gross_${isoDate}`);
      if (cached) return JSON.parse(cached);
    } catch { }
    return [];
  });

  // Dual-mode routing: 'city' (full 16 edge barangays) vs 'barangay' (dedicated perimeter of a single barangay)
  const [viewMode, setViewMode] = useState("city"); // 'city' | 'barangay'
  const [activeBarangayCircuit, setActiveBarangayCircuit] = useState(null);

  // Inspector card sub-tabs for barangay details
  const [brgyInspectorTab, setBrgyInspectorTab] = useState("route"); // 'route' | 'terminals' | 'factories'

  // Dynamic Custom Clicked Coordinates Pin (User clicks ANY part of map)
  const [clickedPoint, setClickedPoint] = useState(null); // { lat, lng }

  // POI Layer Toggles
  const [showTerminals, setShowTerminals] = useState(false);
  const [showFactories, setShowFactories] = useState(false);

  // Copied coordinate toast state
  const [copiedText, setCopiedText] = useState(null);

  // Driving Simulation States
  const [isCityDriving, setIsCityDriving] = useState(false);
  const [cityRouteIndex, setCityRouteIndex] = useState(0);

  const [isBrgyDriving, setIsBrgyDriving] = useState(false);
  const [brgyRouteIndex, setBrgyRouteIndex] = useState(0);

  const [drivingSpeed, setDrivingSpeed] = useState(2); // 1x, 2x, 4x

  // Copy GPS coordinates helper
  const handleCopyGPS = (coords, label = "Coordinates") => {
    if (!coords) return;
    const text = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedText(`${label}: ${text}`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Source API Agents & Supervisors State
  const [apiAgents, setApiAgents] = useState(() => SOURCE_AGENTS_CACHE?.agents || []);
  const [apiSupervisors, setApiSupervisors] = useState(() => SOURCE_AGENTS_CACHE?.supervisors || []);
  const [apiBarangays, setApiBarangays] = useState(() => SOURCE_AGENTS_CACHE?.barangays || []);
  const [isAgentsLoading, setIsAgentsLoading] = useState(false);
  const [isAgentsModalOpen, setIsAgentsModalOpen] = useState(false);
  const [agentsModalSearch, setAgentsModalSearch] = useState("");
  const [agentsModalBarangayFilter, setAgentsModalBarangayFilter] = useState("all");
  const [brgyAgentSearch, setBrgyAgentSearch] = useState("");

  // Auto-fetch live agents from Source API in background
  useEffect(() => {
    let isMounted = true;
    const fetchLiveAgents = async () => {
      try {
        setIsAgentsLoading(true);
        const token = API_CONFIG.AGENTS_TOKEN;
        if (!token) return;
        const headers = { Accept: "application/json", Authorization: `Bearer ${token}` };
        const [agentsRes, supRes, bgyRes] = await Promise.all([
          fetch(API_CONFIG.AGENTS_URL, { headers }),
          fetch(API_CONFIG.SUPERVISOR_URL, { headers }),
          fetch(API_CONFIG.BARANGAYS_URL, { headers })
        ]);
        if (agentsRes.ok && supRes.ok && bgyRes.ok && isMounted) {
          const [aData, sData, bData] = await Promise.all([agentsRes.json(), supRes.json(), bgyRes.json()]);
          const aList = Array.isArray(aData) ? aData : (aData?.data || aData?.agents || []);
          const sList = Array.isArray(sData) ? sData : (sData?.data || sData?.supervisors || []);
          const bList = Array.isArray(bData) ? bData : (bData?.data || bData?.barangays || []);
          if (aList.length > 0) setApiAgents(aList);
          if (sList.length > 0) setApiSupervisors(sList);
          if (bList.length > 0) setApiBarangays(bList);
        }
      } catch (err) {
        console.warn("Using offline / cached source agents:", err);
      } finally {
        if (isMounted) setIsAgentsLoading(false);
      }
    };
    fetchLiveAgents();
    return () => { isMounted = false; };
  }, []);

  const getSupervisorName = (supId) => {
    const s = apiSupervisors.find(x => String(x.id) === String(supId));
    return s?.fullName || s?.username || (supId ? `Supervisor #${supId}` : "Unassigned");
  };

  const getBarangayNameFromApiId = (bId) => {
    const b = apiBarangays.find(x => String(x.id) === String(bId));
    return b?.name || `Barangay #${bId}`;
  };

  const getAgentsForBarangayId = (brgyCircuitId) => {
    const validIds = BARANGAY_API_IDS[brgyCircuitId] || [];
    return apiAgents.filter(a => validIds.includes(String(a.brgyId)));
  };

  const activeBarangayAgents = useMemo(() => {
    if (!activeBarangayCircuit) return [];
    return getAgentsForBarangayId(activeBarangayCircuit.id);
  }, [activeBarangayCircuit, apiAgents]);

  const activeBarangayAgentsFiltered = useMemo(() => {
    if (!brgyAgentSearch.trim()) return activeBarangayAgents;
    const q = brgyAgentSearch.toLowerCase();
    return activeBarangayAgents.filter(a =>
      (a.fullName && a.fullName.toLowerCase().includes(q)) ||
      (a.username && a.username.toLowerCase().includes(q)) ||
      (a.outlet && a.outlet.toLowerCase().includes(q)) ||
      (a.contactNumber && a.contactNumber.includes(q))
    );
  }, [activeBarangayAgents, brgyAgentSearch]);

  const filteredModalAgents = useMemo(() => {
    let list = apiAgents;
    if (agentsModalBarangayFilter !== "all") {
      const validIds = BARANGAY_API_IDS[agentsModalBarangayFilter] || [];
      list = list.filter(a => validIds.includes(String(a.brgyId)));
    }
    if (agentsModalSearch.trim()) {
      const q = agentsModalSearch.toLowerCase().trim();
      list = list.filter(a =>
        (a.fullName && a.fullName.toLowerCase().includes(q)) ||
        (a.username && a.username.toLowerCase().includes(q)) ||
        (a.outlet && a.outlet.toLowerCase().includes(q)) ||
        (a.contactNumber && a.contactNumber.includes(q)) ||
        (a.address && a.address.toLowerCase().includes(q)) ||
        (getSupervisorName(a.supervisor).toLowerCase().includes(q))
      );
    }
    return list;
  }, [apiAgents, agentsModalBarangayFilter, agentsModalSearch]);

  // ================= AIRTIGHT GEOTAGGING VISIBILITY BROADCAST =================
  // Strictly hide floating AI Buddy whenever GeoTagging panel is active
  useEffect(() => {
    window.__hrhub_geotagging_active = true;
    try { localStorage.setItem("hrhub_geotagging_active", "true"); } catch { }
    window.dispatchEvent(new CustomEvent("hrhub_geotagging_visibility", { detail: true }));
    return () => {
      window.__hrhub_geotagging_active = false;
      try { localStorage.removeItem("hrhub_geotagging_active"); } catch { }
      window.dispatchEvent(new CustomEvent("hrhub_geotagging_visibility", { detail: false }));
    };
  }, []);

  // ================= USER-TAGGED AGENT COORDINATES STATE & PERSISTENCE =================
  // ZERO mock/synthetic booths: ONLY genuine agent coordinates inputted by the user are saved and plotted!
  const [taggedAgentCoords, setTaggedAgentCoords] = useState(() => {
    try {
      localStorage.removeItem("hrhub_custom_booths");
      const stored = localStorage.getItem("hrhub_agent_tagged_coordinates");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {
      console.warn("Could not load tagged agent coordinates from localStorage", e);
    }
    return {};
  });

  // Sync taggedAgentCoords to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("hrhub_agent_tagged_coordinates", JSON.stringify(taggedAgentCoords));
    } catch (e) {
      console.warn("Could not save tagged agent coordinates to localStorage", e);
    }
  }, [taggedAgentCoords]);

  // Persistent list of user-tagged booths with coordinates & booth address (Centralized Cloud Database + Local Cache)
  const [userTaggedBooths, setUserTaggedBooths] = useState(() => getLocalCachedBooths());
  const [syncStatus, setSyncStatus] = useState("synced"); // 'synced' | 'syncing' | 'offline'

  // Central Supabase Database Load & Realtime Sync Subscription
  useEffect(() => {
    let isMounted = true;

    async function initCloudSync() {
      try {
        setSyncStatus("syncing");
        const cloudBooths = await fetchCentralBooths();
        if (isMounted && Array.isArray(cloudBooths) && cloudBooths.length > 0) {
          setUserTaggedBooths(cloudBooths);
        }
        if (isMounted) setSyncStatus("synced");
      } catch (err) {
        console.warn("[GeoTagging] Cloud sync load warning:", err);
        if (isMounted) setSyncStatus("offline");
      }
    }

    initCloudSync();

    // Subscribe to multi-user real-time events from Supabase Realtime channel
    const unsubscribe = subscribeToCentralBooths((updatedBooths) => {
      if (isMounted && Array.isArray(updatedBooths)) {
        setUserTaggedBooths(updatedBooths);
        setSyncStatus("synced");
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Tag Booth Modal State (Coordinates, Detect Barangay Button & Booth Address)
  const [isBoothModalOpen, setIsBoothModalOpen] = useState(false);
  const [editingBoothId, setEditingBoothId] = useState(null);
  const [detectedBarangayResult, setDetectedBarangayResult] = useState(null);
  const [boothFormData, setBoothFormData] = useState({
    name: "",
    latStr: "",
    lngStr: "",
    address: "",
    selectedAgentId: "",
    tellerName: "",
    supervisor: "",
    contactNumber: "",
    notes: ""
  });

  // Smart Agent Search & Combobox Dropdown State for Tag Booth Modal
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentStatusFilter, setAgentStatusFilter] = useState("all"); // 'all' | 'active' | 'inactive'

  // Set of agent IDs that are already assigned to other booths (1:1 booth-to-agent mapping)
  const assignedAgentIds = useMemo(() => {
    const ids = new Set();
    (userTaggedBooths || []).forEach((b) => {
      // If editing a booth, do NOT consider that booth's own agent as "taken by another booth"
      if (editingBoothId && String(b.id) === String(editingBoothId)) {
        return;
      }
      if (b.agentId) {
        ids.add(String(b.agentId));
      }
    });
    return ids;
  }, [userTaggedBooths, editingBoothId]);

  // Set of agent full names or usernames already assigned to other booths
  const assignedAgentNames = useMemo(() => {
    const names = new Set();
    (userTaggedBooths || []).forEach((b) => {
      if (editingBoothId && String(b.id) === String(editingBoothId)) {
        return;
      }
      if (b.tellerName) {
        names.add(b.tellerName.trim().toLowerCase());
      }
    });
    return names;
  }, [userTaggedBooths, editingBoothId]);

  // Available unassigned agents for 1:1 assignment
  const availableAgents = useMemo(() => {
    return (apiAgents || []).filter((ag) => {
      if (assignedAgentIds.has(String(ag.id))) return false;
      const fName = String(ag.fullName || "").trim().toLowerCase();
      const uName = String(ag.username || "").trim().toLowerCase();
      if (fName && assignedAgentNames.has(fName)) return false;
      if (uName && assignedAgentNames.has(uName)) return false;
      return true;
    });
  }, [apiAgents, assignedAgentIds, assignedAgentNames]);

  // Count active and inactive available agents
  const activeAgentsCount = useMemo(() => {
    return availableAgents.filter((a) => checkAgentIsActive(a)).length;
  }, [availableAgents]);

  const inactiveAgentsCount = useMemo(() => {
    return availableAgents.length - activeAgentsCount;
  }, [availableAgents, activeAgentsCount]);

  // Smart multi-token filtering on available agents (fuzzy token match by name, username, outlet, supervisor, contact, status)
  const filteredAvailableAgents = useMemo(() => {
    let list = availableAgents;

    // Filter by Active / Inactive status tab
    if (agentStatusFilter === "active") {
      list = list.filter((ag) => checkAgentIsActive(ag));
    } else if (agentStatusFilter === "inactive") {
      list = list.filter((ag) => !checkAgentIsActive(ag));
    }

    const q = agentSearchQuery.trim().toLowerCase();
    if (!q) return list;

    const tokens = q.split(/\s+/).filter(Boolean);

    return list.filter((ag) => {
      const isActive = checkAgentIsActive(ag);
      const statusText = isActive ? "active online" : "inactive offline disabled";
      const name = String(ag.fullName || "").toLowerCase();
      const username = String(ag.username || "").toLowerCase();
      const outlet = String(ag.outlet || "").toLowerCase();
      const supervisor = String(getSupervisorName(ag.supervisor) || "").toLowerCase();
      const contact = String(ag.contactNumber || "").replace(/[^0-9]/g, "");
      const brgy = String(ag.brgyId || "");
      const id = String(ag.id || "");
      const address = String(ag.address || "").toLowerCase();

      const composite = `${name} ${username} ${outlet} ${supervisor} ${contact} ${brgy} ${id} ${address} ${statusText}`;
      return tokens.every((token) => composite.includes(token));
    });
  }, [availableAgents, agentSearchQuery, agentStatusFilter]);

  // Currently selected agent object in the form
  const selectedAgentObj = useMemo(() => {
    if (!boothFormData.selectedAgentId) return null;
    return (apiAgents || []).find((a) => String(a.id) === String(boothFormData.selectedAgentId)) || null;
  }, [apiAgents, boothFormData.selectedAgentId]);

  // Inspector Card tab state for City View ('waypoint' | 'tagged_agents')
  const [cityInspectorTab, setCityInspectorTab] = useState("waypoint");

  // Inline Row-Level Agent Coordinate Tagging State (Directly inside agent's row)
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [inlineCoordForm, setInlineCoordForm] = useState({
    latStr: "",
    lngStr: "",
    notes: ""
  });

  // Real-time automatic detection of belonging barangay as coordinates are entered in the agent row
  const inlineDetectedBarangay = useMemo(() => {
    const lat = parseFloat(inlineCoordForm.latStr);
    const lng = parseFloat(inlineCoordForm.lngStr);
    if (isNaN(lat) || isNaN(lng) || lat < 10.20 || lat > 10.50 || lng < 123.80 || lng > 124.10) {
      return null;
    }
    return detectBarangayFromCoords(lat, lng);
  }, [inlineCoordForm.latStr, inlineCoordForm.lngStr]);

  // List of all user-tagged agents with resolved details
  const allTaggedAgentsList = useMemo(() => {
    return Object.entries(taggedAgentCoords).map(([agentId, data]) => {
      const agent = apiAgents.find((a) => String(a.id) === String(agentId));
      return { agentId, agent, ...data };
    });
  }, [taggedAgentCoords, apiAgents]);

  // Tagged agents belonging to the currently active barangay
  const activeBarangayTaggedAgents = useMemo(() => {
    if (!activeBarangayCircuit) return [];
    const validApiIds = BARANGAY_API_IDS[activeBarangayCircuit.id] || [];
    return allTaggedAgentsList.filter((item) => {
      return (
        item.detectedBarangayId === activeBarangayCircuit.id ||
        (item.agent && validApiIds.includes(String(item.agent.brgyId)))
      );
    });
  }, [activeBarangayCircuit, allTaggedAgentsList]);

  // Tagged booths belonging to the currently active barangay
  const activeBarangayTaggedBooths = useMemo(() => {
    if (!activeBarangayCircuit) return userTaggedBooths;
    return userTaggedBooths.filter((b) => b.barangayId === activeBarangayCircuit.id);
  }, [activeBarangayCircuit, userTaggedBooths]);

  // Open Tag Booth Modal with optional pre-filled coordinates
  const handleOpenBoothModal = (prefilledCoords = null, prefilledBarangay = null) => {
    let lat = "";
    let lng = "";
    if (prefilledCoords && prefilledCoords.length >= 2) {
      lat = prefilledCoords[0].toFixed(6);
      lng = prefilledCoords[1].toFixed(6);
    } else if (clickedPoint) {
      lat = clickedPoint.lat.toFixed(6);
      lng = clickedPoint.lng.toFixed(6);
    } else if (prefilledBarangay) {
      lat = prefilledBarangay.coords[0].toFixed(6);
      lng = prefilledBarangay.coords[1].toFixed(6);
    } else if (activeBarangayCircuit) {
      lat = activeBarangayCircuit.coords[0].toFixed(6);
      lng = activeBarangayCircuit.coords[1].toFixed(6);
    }

    setEditingBoothId(null);
    setAgentSearchQuery("");
    setIsAgentDropdownOpen(false);
    setAgentStatusFilter("all");
    const initialDetected = (lat && lng) ? detectBarangayFromCoords(lat, lng) : null;
    setDetectedBarangayResult(initialDetected);

    const nextBoothNum = String(userTaggedBooths.length + 1).padStart(3, "0");

    setBoothFormData({
      name: nextBoothNum,
      latStr: lat,
      lngStr: lng,
      address: initialDetected ? `Brgy. ${initialDetected.name}, Mandaue City` : "",
      selectedAgentId: "",
      tellerName: "",
      supervisor: "",
      contactNumber: "",
      notes: ""
    });
    setIsBoothModalOpen(true);
  };

  // Open Edit Booth Modal for existing booth
  const handleEditUserBooth = (booth) => {
    setEditingBoothId(booth.id);
    setAgentSearchQuery("");
    setIsAgentDropdownOpen(false);
    setAgentStatusFilter("all");
    const lat = booth.coords[0].toFixed(6);
    const lng = booth.coords[1].toFixed(6);
    const detected = detectBarangayFromCoords(lat, lng);
    setDetectedBarangayResult(detected);

    setBoothFormData({
      name: booth.name,
      latStr: lat,
      lngStr: lng,
      address: booth.address || "",
      selectedAgentId: booth.agentId || "",
      tellerName: booth.tellerName || "",
      supervisor: booth.supervisor || "",
      contactNumber: booth.contactNumber || "",
      notes: booth.notes || ""
    });
    setIsBoothModalOpen(true);
  };

  // Dedicated Button Function: Detect Barangay from Coordinates
  const handleDetectBarangay = () => {
    const lat = parseFloat(boothFormData.latStr);
    const lng = parseFloat(boothFormData.lngStr);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid numerical Latitude and Longitude coordinates first.");
      return;
    }
    const detected = detectBarangayFromCoords(lat, lng);
    if (detected) {
      setDetectedBarangayResult(detected);
      if (!boothFormData.address.trim()) {
        setBoothFormData((prev) => ({
          ...prev,
          address: `Brgy. ${detected.name}, Mandaue City`
        }));
      }
      if (!boothFormData.name.trim()) {
        setBoothFormData((prev) => ({
          ...prev,
          name: `${detected.name} Outlet`
        }));
      }
    } else {
      setDetectedBarangayResult({
        id: "outside",
        name: "Outside Mandaue City",
        confidence: "Out of Bounds",
        detail: "Coordinates do not match any of the 27 Mandaue City barangays. Please check your coordinates."
      });
    }
  };

  // Save Booth from Modal (with Coordinates, Auto-Barangay Detection & Booth Address)
  const handleSaveBoothModal = (e) => {
    e?.preventDefault();
    const lat = parseFloat(boothFormData.latStr);
    const lng = parseFloat(boothFormData.lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid numerical Latitude and Longitude coordinates.");
      return;
    }

    if (!boothFormData.name.trim()) {
      alert("Please provide a Booth or Outlet Name.");
      return;
    }

    if (!boothFormData.address.trim()) {
      alert("Please provide the Booth Address.");
      return;
    }

    const detected = detectBarangayFromCoords(lat, lng) || {
      id: "mandaue",
      name: "Mandaue City Territory",
      confidence: "Custom Pinned Location",
      detail: "Coordinates fall within Mandaue City territory."
    };

    const newBooth = {
      id: editingBoothId || `booth_${Date.now()}`,
      name: boothFormData.name.trim(),
      coords: [lat, lng],
      lat,
      lng,
      address: boothFormData.address.trim(),
      barangayId: detected.id,
      barangayName: detected.name,
      detectionConfidence: detected.confidence,
      detectionDetail: detected.detail,
      agentId: boothFormData.selectedAgentId || "",
      tellerName: boothFormData.tellerName.trim(),
      supervisor: boothFormData.supervisor.trim(),
      contactNumber: boothFormData.contactNumber.trim(),
      notes: boothFormData.notes.trim(),
      updatedAt: new Date().toISOString()
    };

    setUserTaggedBooths((prev) => {
      const filtered = prev.filter((b) => b.id !== newBooth.id);
      return [newBooth, ...filtered];
    });

    // Central Cloud Database Sync (Multi-User Centralized Persistence)
    saveCentralBooth(newBooth)
      .then(() => setSyncStatus("synced"))
      .catch((err) => {
        console.warn("[GeoTagging] Cloud booth save warning:", err);
        setSyncStatus("offline");
      });

    // If editing a booth and its assigned agent was changed or cleared, clean up the previous agent's tag
    if (editingBoothId) {
      const prevBooth = userTaggedBooths.find((b) => b.id === editingBoothId);
      if (prevBooth?.agentId && String(prevBooth.agentId) !== String(boothFormData.selectedAgentId)) {
        setTaggedAgentCoords((prev) => {
          const next = { ...prev };
          delete next[prevBooth.agentId];
          return next;
        });
      }
    }

    if (boothFormData.selectedAgentId) {
      setTaggedAgentCoords((prev) => ({
        ...prev,
        [boothFormData.selectedAgentId]: {
          agentId: boothFormData.selectedAgentId,
          coords: [lat, lng],
          lat,
          lng,
          detectedBarangayId: detected.id,
          detectedBarangayName: detected.name,
          confidence: detected.confidence,
          detail: detected.detail,
          notes: boothFormData.address.trim(),
          updatedAt: new Date().toISOString()
        }
      }));
    }

    setIsBoothModalOpen(false);
    setEditingBoothId(null);
    setAgentSearchQuery("");
    setIsAgentDropdownOpen(false);

    setCopiedText(`Booth "${newBooth.name}" saved at ${newBooth.address} in Brgy. ${detected.name}!`);
    setTimeout(() => setCopiedText(null), 3500);

    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([lat, lng], 17, { duration: 0.9 });
    }
  };

  const handleDeleteUserBooth = (boothId) => {
    if (window.confirm("Are you sure you want to remove this tagged booth?")) {
      const targetBooth = userTaggedBooths.find((b) => b.id === boothId);
      if (targetBooth?.agentId) {
        setTaggedAgentCoords((prev) => {
          const next = { ...prev };
          delete next[targetBooth.agentId];
          return next;
        });
      }
      setUserTaggedBooths((prev) => prev.filter((b) => b.id !== boothId));
      deleteCentralBooth(boothId)
        .then(() => setSyncStatus("synced"))
        .catch((err) => {
          console.warn("[GeoTagging] Cloud booth delete warning:", err);
          setSyncStatus("offline");
        });
    }
  };

  // Start tagging coordinates for a specific agent (directly in their row)
  const handleStartEditAgentCoords = (agent) => {
    setEditingAgentId(agent.id);
    const existing = taggedAgentCoords[agent.id];
    if (existing && existing.coords) {
      setInlineCoordForm({
        latStr: existing.coords[0].toFixed(6),
        lngStr: existing.coords[1].toFixed(6),
        notes: existing.notes || ""
      });
    } else if (clickedPoint) {
      setInlineCoordForm({
        latStr: clickedPoint.lat.toFixed(6),
        lngStr: clickedPoint.lng.toFixed(6),
        notes: ""
      });
    } else if (activeBarangayCircuit) {
      setInlineCoordForm({
        latStr: activeBarangayCircuit.coords[0].toFixed(6),
        lngStr: activeBarangayCircuit.coords[1].toFixed(6),
        notes: ""
      });
    } else {
      setInlineCoordForm({ latStr: "", lngStr: "", notes: "" });
    }
  };

  // Save coordinates directly from the agent's row and immediately plot on map
  const handleSaveAgentCoords = (agent) => {
    const lat = parseFloat(inlineCoordForm.latStr);
    const lng = parseFloat(inlineCoordForm.lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid numerical Latitude and Longitude coordinates.");
      return;
    }

    const detected = detectBarangayFromCoords(lat, lng) || {
      id: activeBarangayCircuit ? activeBarangayCircuit.id : "mandaue",
      name: activeBarangayCircuit ? activeBarangayCircuit.name : "Mandaue City Territory",
      confidence: "Custom Pinned Location",
      detail: "Coordinates tagged within Mandaue City boundaries."
    };

    const newTag = {
      agentId: agent.id,
      coords: [lat, lng],
      lat,
      lng,
      detectedBarangayId: detected.id,
      detectedBarangayName: detected.name,
      confidence: detected.confidence,
      detail: detected.detail,
      notes: inlineCoordForm.notes.trim() || agent.address || `Brgy. ${detected.name}`,
      updatedAt: new Date().toISOString()
    };

    setTaggedAgentCoords((prev) => ({
      ...prev,
      [agent.id]: newTag
    }));

    // Mirror to userTaggedBooths
    const newBooth = {
      id: `booth_agent_${agent.id}`,
      name: agent.outlet || `${agent.fullName} Station`,
      coords: [lat, lng],
      lat,
      lng,
      address: inlineCoordForm.notes.trim() || agent.address || `Brgy. ${detected.name}, Mandaue City`,
      barangayId: detected.id,
      barangayName: detected.name,
      detectionConfidence: detected.confidence,
      detectionDetail: detected.detail,
      agentId: agent.id,
      tellerName: agent.fullName,
      supervisor: getSupervisorName(agent.supervisor),
      contactNumber: agent.contactNumber || "",
      notes: inlineCoordForm.notes.trim(),
      updatedAt: new Date().toISOString()
    };

    setUserTaggedBooths((prev) => [newBooth, ...prev.filter((b) => b.id !== newBooth.id && b.agentId !== agent.id)]);

    // Central Cloud Database Sync (Multi-User Centralized Persistence)
    saveCentralBooth(newBooth)
      .then(() => setSyncStatus("synced"))
      .catch((err) => {
        console.warn("[GeoTagging] Cloud agent booth save warning:", err);
        setSyncStatus("offline");
      });

    setEditingAgentId(null);
    setInlineCoordForm({ latStr: "", lngStr: "", notes: "" });

    setCopiedText(`GPS coordinates saved for ${agent.fullName}! Plotted in Brgy. ${detected.name}.`);
    setTimeout(() => setCopiedText(null), 3500);

    // Pan / Fly smoothly to the newly plotted agent station on the map
    if (leafletMapRef.current) {
      leafletMapRef.current.flyTo([lat, lng], 17, { duration: 0.9 });
    }
  };

  // Remove coordinates for an agent
  const handleRemoveAgentCoords = (agentId) => {
    if (window.confirm("Are you sure you want to remove the GPS coordinates for this agent?")) {
      setTaggedAgentCoords((prev) => {
        const next = { ...prev };
        delete next[agentId];
        return next;
      });
      setUserTaggedBooths((prev) => prev.filter((b) => b.agentId !== agentId));
      deleteCentralBooth(`booth_agent_${agentId}`)
        .then(() => setSyncStatus("synced"))
        .catch((err) => {
          console.warn("[GeoTagging] Cloud agent booth delete warning:", err);
          setSyncStatus("offline");
        });
    }
  };

  // Background fetch of STL Gross Records specifically for yesterday's sales
  useEffect(() => {
    let isMounted = true;
    const fetchGross = async () => {
      try {
        const { isoDate: yesterdayStr } = getYesterdayDates();

        const url = new URL(API_CONFIG.GROSS_REPORT_URL);
        const effectiveId = url.searchParams.get("id") || import.meta.env.VITE_GROSS_ACCOUNTANT_ID || "2";
        url.searchParams.set("id", effectiveId);
        url.searchParams.set("from", yesterdayStr);
        url.searchParams.set("to", yesterdayStr);

        const res = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${API_CONFIG.GROSS_REPORT_TOKEN}`
          }
        });
        if (res.ok && isMounted) {
          const payload = await res.json();
          let list = [];
          if (Array.isArray(payload)) {
            list = payload;
          } else {
            for (const key of ["data", "results", "records", "items", "collectors", "tellers"]) {
              if (Array.isArray(payload?.[key])) {
                list = payload[key];
                break;
              }
            }
            if (list.length === 0 && payload?.data && typeof payload.data === "object") {
              list = Array.isArray(payload.data) ? payload.data : [payload.data];
            }
          }
          if (Array.isArray(list) && list.length > 0) {
            setGrossRecords(list);
            try { sessionStorage.setItem(`hrhub_yesterday_gross_${yesterdayStr}`, JSON.stringify(list)); } catch { }
          }
        }
      } catch (err) {
        // Silently continue if offline or network restricted
      }
    };
    fetchGross();
    return () => { isMounted = false; };
  }, []);

  // Compute assigned agent details and yesterday's gross sales for any booth
  const getBoothAgentGross = (booth) => {
    const { isoDate: yesterdayStr, displayLabel: yesterdayLabel } = getYesterdayDates();

    if (!booth) {
      return {
        gross: 0,
        formatted: "₱0.00",
        hasRecord: false,
        agentName: "Unassigned",
        agentUsername: "",
        agentStatus: "Unassigned",
        contactNumber: "N/A",
        supervisor: "N/A",
        outlet: "Kiosk Outlet",
        yesterdayDate: yesterdayLabel,
        yesterdayIso: yesterdayStr
      };
    }

    const agentId = String(booth.agentId || "");
    const tellerName = String(booth.tellerName || "").toLowerCase().trim();

    // Match agent from API agents directory
    const matchedAgent = apiAgents.find((a) =>
      (agentId && String(a.id) === agentId) ||
      (tellerName && (a.fullName?.toLowerCase().includes(tellerName) || a.username?.toLowerCase() === tellerName))
    );

    const effectiveAgentName = matchedAgent?.fullName || booth.tellerName || "Unassigned";
    const effectiveUsername = matchedAgent?.username || "";

    let totalGross = 0;
    let foundRecord = false;

    // Helper to extract ISO date from a record if present
    const getRecDate = (r) => {
      const year = Number(r.drawYear || r.year || 0);
      const month = Number(r.drawMonth || r.month || 0);
      const day = Number(r.drawDay || r.day || 0);
      if (year && month && day) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${year}-${pad(month)}-${pad(day)}`;
      }
      const str = r.date || r.drawDate || r.draw_date || r.created_at || r.transDate || r.recordDate || "";
      if (typeof str === "string" && str.length >= 10) {
        return str.slice(0, 10);
      }
      return "";
    };

    if (grossRecords && grossRecords.length > 0) {
      grossRecords.forEach((r) => {
        const rDate = getRecDate(r);
        // Only include if date matches yesterday (or if record has no date timestamp because endpoint is already filtered)
        if (rDate && rDate !== yesterdayStr) {
          return;
        }

        const rId = String(r.userId || r.id || r.collectorId || "");
        const rName = String(r.fullName || r.full_name || r.collectorName || r.name || "").toLowerCase();
        const rUser = String(r.username || "").toLowerCase();

        const isMatch =
          (agentId && rId === agentId) ||
          (matchedAgent && String(matchedAgent.id) === rId) ||
          (effectiveUsername && rUser === effectiveUsername.toLowerCase()) ||
          (tellerName && (rName.includes(tellerName) || tellerName.includes(rName))) ||
          (effectiveAgentName && (rName.includes(effectiveAgentName.toLowerCase()) || effectiveAgentName.toLowerCase().includes(rName)));

        if (isMatch) {
          foundRecord = true;
          let amt = 0;
          if (r.daily && typeof r.daily === "object" && r.daily[yesterdayStr] !== undefined) {
            amt = Number(r.daily[yesterdayStr] || 0);
          } else {
            amt = Number(r.TotalOverAllGross || r.gross || r.totalGross || r.amount || r.grossAmount || 0);
          }

          if (!isNaN(amt) && amt > 0) {
            totalGross += amt;
          }
        }
      });
    }

    // Fallback if booth had a specific yesterdayGross property
    if (!foundRecord && booth.yesterdayGross) {
      totalGross = Number(booth.yesterdayGross) || 0;
      foundRecord = totalGross > 0;
    }

    const currencyFormatter = new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return {
      gross: totalGross,
      formatted: currencyFormatter.format(totalGross),
      hasRecord: foundRecord,
      agentName: effectiveAgentName,
      agentUsername: effectiveUsername,
      agentStatus: matchedAgent?.isActive ? "Active Teller" : (matchedAgent ? "Registered Agent" : "Manual Tag"),
      contactNumber: matchedAgent?.contactNumber || booth.contactNumber || "No contact number",
      supervisor: booth.supervisor || (matchedAgent?.supervisor ? `Supervisor #${matchedAgent.supervisor}` : "No supervisor assigned"),
      outlet: matchedAgent?.outlet || booth.name || "Kiosk Outlet",
      yesterdayDate: yesterdayLabel,
      yesterdayIso: yesterdayStr
    };
  };

  // Start distance measuring from a chosen kiosk
  const startMeasuringFromKiosk = (booth) => {
    if (!booth) return;
    if (userTaggedBooths.length < 2) {
      setCopiedText("At least 2 tagged kiosks are required on the map to measure!");
      setTimeout(() => setCopiedText(null), 3000);
      return;
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.closePopup();
    }
    setMeasuringSourceKiosk(booth);
    setCopiedText(`Measuring from Booth ${booth.name}`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Complete distance measurement when 2nd kiosk is clicked
  const handleCompleteMeasurement = (source, target) => {
    if (!source || !target || !source.coords || !target.coords) return;
    if (String(source.id) === String(target.id)) {
      setCopiedText("Please select a different kiosk as destination!");
      setTimeout(() => setCopiedText(null), 2500);
      return;
    }

    const distMeters = calculateDistanceMeters(
      source.coords[0], source.coords[1],
      target.coords[0], target.coords[1]
    );

    const pair = { source, target, distanceMeters: distMeters };
    setMeasuredPair(pair);
    setMeasuringSourceKiosk(null);
    setIsDistanceModalOpen(true);

    // Draw connecting line & midpoint distance badge on Leaflet map
    if (leafletMapRef.current && measureLineGroupRef.current && window.L) {
      const map = leafletMapRef.current;
      const measureGroup = measureLineGroupRef.current;
      measureGroup.clearLayers();

      // Glowing dashed line
      window.L.polyline([source.coords, target.coords], {
        color: "#0d9488",
        weight: 4.5,
        dashArray: "8, 8",
        opacity: 0.95
      }).addTo(measureGroup);

      // Midpoint distance badge
      const midLat = (source.coords[0] + target.coords[0]) / 2;
      const midLng = (source.coords[1] + target.coords[1]) / 2;
      const distLabel = distMeters >= 1000
        ? `${(distMeters / 1000).toFixed(2)} km`
        : `${Math.round(distMeters)} m`;

      const badgeIcon = window.L.divIcon({
        className: "measure-distance-badge",
        html: `
          <div style="
            background: #042f2e;
            color: #2dd4bf;
            border: 2px solid #14b8a6;
            padding: 4px 10px;
            border-radius: 9999px;
            font-family: system-ui, sans-serif;
            font-size: 11px;
            font-weight: 900;
            white-space: nowrap;
            box-shadow: 0 4px 14px rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <span>📏</span>
            <span>${distLabel}</span>
          </div>
        `,
        iconSize: [110, 26],
        iconAnchor: [55, 13]
      });

      const midMarker = window.L.marker([midLat, midLng], { icon: badgeIcon }).addTo(measureGroup);
      midMarker.on("click", () => {
        setIsDistanceModalOpen(true);
      });

      try {
        const bounds = window.L.latLngBounds([source.coords, target.coords]);
        map.fitBounds(bounds, { padding: [90, 90], maxZoom: 17 });
      } catch { }
    }
  };

  // Clear current measurement line and reset
  const handleClearMeasurement = () => {
    setMeasuredPair(null);
    setMeasuringSourceKiosk(null);
    setIsDistanceModalOpen(false);
    if (measureLineGroupRef.current) {
      measureLineGroupRef.current.clearLayers();
    }
  };

  // Global trigger for Leaflet HTML popups
  useEffect(() => {
    window.startMeasuringKiosk = (boothId) => {
      const b = userTaggedBooths.find(booth => String(booth.id) === String(boothId));
      if (b) {
        startMeasuringFromKiosk(b);
      }
    };
    return () => {
      delete window.startMeasuringKiosk;
    };
  }, [userTaggedBooths]);

  // Load Leaflet CSS & JS
  useEffect(() => {
    if (!document.getElementById("leaflet-custom-pins-style")) {
      const customStyle = document.createElement("style");
      customStyle.id = "leaflet-custom-pins-style";
      customStyle.innerHTML = `
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        .yellow-booth-pin {
          background: transparent !important;
          border: none !important;
        }
      `;
      document.head.appendChild(customStyle);
    }

    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(cssLink);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Retain Leaflet in document to avoid reload flickers
    };
  }, []);

  // Initialize Map with 100% Free OpenStreetMap Standard Tiles (Zero Watermark / No API Key Required)
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || leafletMapRef.current) return;

    const map = window.L.map(mapContainerRef.current, {
      center: [10.3440, 123.9380], // Mandaue City Center
      zoom: 13,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: false
    });

    // 100% Free Standard OpenStreetMap Tiles - No API key watermark
    window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    const group = window.L.layerGroup().addTo(map);
    layersGroupRef.current = group;

    const measureGroup = window.L.layerGroup().addTo(map);
    measureLineGroupRef.current = measureGroup;

    leafletMapRef.current = map;

    // Click handler anywhere on the map to drop coordinates pin & open Google Maps button
    map.on("click", (e) => {
      // Do not drop pin if currently in kiosk-to-kiosk measuring mode
      if (measuringSourceKioskRef.current) return;
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setClickedPoint({ lat, lng });
    });

    // Invalidate size and auto-fit to Mandaue City bounds on mount
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (SNAPPED_EDGE_ROUTE_COORDS && SNAPPED_EDGE_ROUTE_COORDS.length > 0) {
        const bounds = window.L.latLngBounds(SNAPPED_EDGE_ROUTE_COORDS);
        map.fitBounds(bounds, { padding: [45, 45] });
      }
    }, 200);

    let resizeObserver = null;
    if (window.ResizeObserver && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        try {
          map.invalidateSize();
        } catch { }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      leafletMapRef.current = null;
      layersGroupRef.current = null;
      measureLineGroupRef.current = null;
    };
  }, [leafletLoaded]);

  // Handle custom point pin placement and popup with Google Maps button
  useEffect(() => {
    if (!leafletMapRef.current || !window.L) return;
    const map = leafletMapRef.current;

    if (clickedMarkerRef.current) {
      map.removeLayer(clickedMarkerRef.current);
      clickedMarkerRef.current = null;
    }

    if (!clickedPoint) return;

    const { lat, lng } = clickedPoint;
    const googleMapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

    const pinIcon = window.L.divIcon({
      className: "custom-point-pin",
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            width: 36px;
            height: 36px;
            background: rgba(14, 165, 233, 0.35);
            border: 2px solid #38bdf8;
            border-radius: 50%;
            animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
          "></div>
          <div style="
            width: 30px;
            height: 30px;
            background: #0284c7;
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 16px rgba(2, 132, 199, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            color: #ffffff;
            cursor: pointer;
          ">
            📍
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    const marker = window.L.marker([lat, lng], { icon: pinIcon }).addTo(map);
    clickedMarkerRef.current = marker;

    const popupContent = `
      <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 250px; padding: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 9.5px; font-weight: 900; background: #e0f2fe; color: #0369a1; padding: 2.5px 8px; border-radius: 6px; text-transform: uppercase;">
            📍 Tagged GPS Position
          </span>
        </div>
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 8px; margin-bottom: 8px; font-family: ui-monospace, monospace; font-size: 11px;">
          <div style="color: #94a3b8; font-size: 9.5px; margin-bottom: 2px;">WGS-84 Coordinates:</div>
          <strong style="color: #38bdf8; font-size: 12.5px;">${formatGPS([lat, lng])}</strong>
          <div style="color: #64748b; font-size: 10px; margin-top: 3px;">Decimal: ${lat.toFixed(6)}, ${lng.toFixed(6)}</div>
        </div>
        <a
          href="${googleMapsUrl}"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            background: #1a73e8;
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            padding: 8px 12px;
            border-radius: 8px;
            text-decoration: none;
            box-shadow: 0 4px 12px rgba(26, 115, 232, 0.4);
            margin-bottom: 4px;
          "
        >
          <span>Proceed to Google Maps</span>
          <span style="font-size: 14px;">↗</span>
        </a>
      </div>
    `;

    marker.bindPopup(popupContent, { autoClose: false, closeOnClick: false }).openPopup();
  }, [clickedPoint]);

  // Main Map Drawing Effect
  useEffect(() => {
    if (!leafletLoaded || !leafletMapRef.current || !layersGroupRef.current) return;

    const map = leafletMapRef.current;
    const group = layersGroupRef.current;
    group.clearLayers();

    // ================= MODE 1: WHOLE MANDAUE CITY VIEW =================
    if (viewMode === "city") {
      // 1. Snapped Road Polyline for All 16 Edge Barangays
      window.L.polyline(SNAPPED_EDGE_ROUTE_COORDS, {
        color: "#064e3b",
        weight: 9,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(group);

      const navLine = window.L.polyline(SNAPPED_EDGE_ROUTE_COORDS, {
        color: "#10b981",
        weight: 5.5,
        opacity: 1.0,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(group);

      navLine.bindTooltip("Mandaue City Perimeter Circuit (Connecting All 16 Edge Barangays)", {
        direction: "top",
        permanent: false
      });

      // 2. Compact, Non-Overlapping Pins for 16 Edge Barangays (Clean 28px circular badges with coordinates)
      EDGE_BARANGAYS_CIRCUIT.forEach((eb) => {
        const isSelected = selectedEdgeBarangay?.id === eb.id;

        const edgeIcon = window.L.divIcon({
          className: "edge-barangay-pin",
          html: `
            <div style="
              width: ${isSelected ? "34px" : "28px"};
              height: ${isSelected ? "34px" : "28px"};
              background: ${isSelected ? "#0284c7" : "#047857"};
              border: ${isSelected ? "3px solid #ffffff" : "2px solid #34d399"};
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: ${isSelected ? "13px" : "11px"};
              font-weight: 900;
              cursor: pointer;
              transform: translate(-50%, -50%);
              transition: all 0.2s ease;
            ">
              ${eb.step}
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });

        const marker = window.L.marker(eb.coords, { icon: edgeIcon }).addTo(group);

        marker.bindTooltip(`
          <div style="font-family: system-ui, sans-serif; padding: 2px;">
            <strong>Step ${eb.step}: Brgy. ${eb.name}</strong><br/>
            <span style="font-family: monospace; font-size: 10px; color: #10b981;">GPS: ${formatGPS(eb.coords)}</span>
          </div>
        `, {
          direction: "top",
          permanent: false
        });

        marker.on("click", (e) => {
          window.L.DomEvent.stopPropagation(e);
          setSelectedEdgeBarangay(eb);
          handleSelectBarangayPerimeter(eb.id);
        });
      });

      // 3. Subtle Dot Pins for Interior Barangays (Zero text collision)
      INTERIOR_BARANGAYS.forEach((ib) => {
        const intIcon = window.L.divIcon({
          className: "interior-barangay-pin",
          html: `
            <div style="
              width: 14px;
              height: 14px;
              background: #0f172a;
              border: 2px solid #64748b;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              cursor: pointer;
              transform: translate(-50%, -50%);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="width: 4px; height: 4px; background: #10b981; border-radius: 50%;"></span>
            </div>
          `,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = window.L.marker(ib.coords, { icon: intIcon }).addTo(group);

        marker.bindTooltip(`
          <div style="font-family: system-ui, sans-serif; padding: 2px;">
            <strong>Brgy. ${ib.name} (Interior Hub)</strong><br/>
            <span style="font-family: monospace; font-size: 10px; color: #38bdf8;">GPS: ${formatGPS(ib.coords)}</span>
          </div>
        `, {
          direction: "top",
          permanent: false
        });

        marker.on("click", (e) => {
          window.L.DomEvent.stopPropagation(e);
          handleSelectBarangayPerimeter(ib.id);
        });
      });

      // 4. City Driving Car
      const currentCityPt = SNAPPED_EDGE_ROUTE_COORDS[cityRouteIndex] || SNAPPED_EDGE_ROUTE_COORDS[0];

      const carIcon = window.L.divIcon({
        className: "road-car-marker",
        html: `
          <div style="
            width: 36px;
            height: 36px;
            background: #0284c7;
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 16px rgba(2, 132, 199, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
          ">
            🚗
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const carMarker = window.L.marker(currentCityPt, { icon: carIcon }).addTo(group);
      carMarkerRef.current = carMarker;
    }

    // ================= MODE 2: DEDICATED INDIVIDUAL BARANGAY PERIMETER VIEW (e.g. CASILI) =================
    if (viewMode === "barangay" && activeBarangayCircuit) {
      const bRoute = BARANGAY_PERIMETER_ROUTES[activeBarangayCircuit.id];
      if (!bRoute) return;

      // 1. EXACT OFFICIAL ADMINISTRATIVE BOUNDARY POLYGON (100% Precise Territory)
      const officialPoly = bRoute.boundaryPolygon || bRoute.points;
      if (officialPoly && officialPoly.length > 0) {
        window.L.polygon(officialPoly, {
          color: "#10b981", // Crisp Emerald border
          weight: 2.8,
          dashArray: "6, 6",
          fillColor: "#10b981",
          fillOpacity: 0.18
        }).addTo(group);
      }

      // 2. Real Snapped Road Perimeter Polyline (Circumscribing boundary streets)
      if (bRoute.points && bRoute.points.length > 0) {
        window.L.polyline(bRoute.points, {
          color: "#083344", // Deep casing
          weight: 9,
          opacity: 0.85,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(group);

        const brgyLine = window.L.polyline(bRoute.points, {
          color: "#06b6d4", // Electric cyan
          weight: 5.5,
          opacity: 1.0,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(group);

        brgyLine.bindTooltip(`Drivable Boundary Road Route around Brgy. ${activeBarangayCircuit.name} (${bRoute.distanceKm} km)`, {
          direction: "top",
          permanent: false
        });
      }

      // 3. Barangay Center / Headquarters Marker with GPS & Google Maps link
      const centerIcon = window.L.divIcon({
        className: "active-barangay-center-pin",
        html: `
          <div style="
            display: flex;
            align-items: center;
            gap: 5px;
            background: #0284c7;
            border: 2.5px solid #ffffff;
            border-radius: 9999px;
            padding: 4px 10px;
            box-shadow: 0 4px 16px rgba(2, 132, 199, 0.7);
            color: #ffffff;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 11.5px;
            font-weight: 900;
            white-space: nowrap;
            cursor: pointer;
            transform: translate(-50%, -50%);
          ">
            <span>🏛️</span>
            <span>Brgy. ${activeBarangayCircuit.name} (Coverage Area)</span>
          </div>
        `,
        iconSize: [170, 28],
        iconAnchor: [85, 14]
      });

      const centerMarker = window.L.marker(activeBarangayCircuit.coords, { icon: centerIcon }).addTo(group);
      centerMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 220px; padding: 2px;">
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 900; color: #0284c7;">🏛️ Brgy. ${activeBarangayCircuit.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">${activeBarangayCircuit.mainRoad}</p>
          <div style="background: #f1f5f9; border-radius: 6px; padding: 6px; font-family: monospace; font-size: 11px; color: #0f172a; margin-bottom: 6px;">
            <strong>Center GPS:</strong> ${formatGPS(activeBarangayCircuit.coords)}
          </div>
          <a
            href="https://www.google.com/maps?q=${activeBarangayCircuit.coords[0]},${activeBarangayCircuit.coords[1]}"
            target="_blank"
            rel="noopener noreferrer"
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 5px;
              background: #1a73e8;
              color: #ffffff;
              font-weight: 800;
              font-size: 11px;
              padding: 6px 10px;
              border-radius: 6px;
              text-decoration: none;
              margin-bottom: 6px;
            "
          >
            <span>Proceed to Google Maps</span>
            <span>↗</span>
          </a>
          <div style="font-size: 9.5px; color: #047857; font-weight: 800;">
            ✓ 100% Authorized Under Mandaue City Jurisdiction
          </div>
        </div>
      `);

      // 4. Driving Car on Barangay Perimeter
      if (bRoute.points && bRoute.points.length > 0) {
        const currentBrgyPt = bRoute.points[brgyRouteIndex] || bRoute.points[0];

        const carIcon = window.L.divIcon({
          className: "brgy-car-marker",
          html: `
            <div style="
              width: 36px;
              height: 36px;
              background: #06b6d4;
              border: 3px solid #ffffff;
              border-radius: 50%;
              box-shadow: 0 4px 16px rgba(6, 182, 212, 0.8);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              cursor: pointer;
            ">
              🚗
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const carMarker = window.L.marker(currentBrgyPt, { icon: carIcon }).addTo(group);
        carMarkerRef.current = carMarker;
      }
    }

    // ================= POI LAYER 1: PUBLIC TRANSIT TERMINALS & COMMUTER STATIONS =================
    const shouldRenderTerminals = viewMode === "barangay" || showTerminals;
    if (shouldRenderTerminals) {
      const terminalsToRender = viewMode === "barangay" && activeBarangayCircuit
        ? MANDAUE_POIS.terminals.filter(t => t.barangayId === activeBarangayCircuit.id)
        : MANDAUE_POIS.terminals;

      terminalsToRender.forEach((term) => {
        const isBelongingToActive = activeBarangayCircuit && term.barangayId === activeBarangayCircuit.id;

        const termIcon = window.L.divIcon({
          className: "terminal-pin",
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              background: ${isBelongingToActive ? "#92400e" : "#78350f"};
              border: ${isBelongingToActive ? "2.5px solid #fef08a" : "2px solid #fbbf24"};
              border-radius: 9999px;
              padding: 3px 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              color: #fef3c7;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -50%);
            ">
              <span>🚌</span>
              <span>${term.name.length > 22 ? term.name.slice(0, 20) + "..." : term.name}</span>
            </div>
          `,
          iconSize: [140, 26],
          iconAnchor: [70, 13]
        });

        const marker = window.L.marker(term.coords, { icon: termIcon }).addTo(group);

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 240px; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 16px;">🚌</span>
              <span style="font-size: 9px; font-weight: 900; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">
                ${term.type}
              </span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 900; color: #0f172a;">${term.name}</h4>
            <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 6px; padding: 5px 8px; margin-bottom: 6px; font-family: monospace; font-size: 11px; font-weight: 900; color: #854d0e;">
              📍 GPS: ${formatGPS(term.coords)}
            </div>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">📍 <strong>${term.barangayName}:</strong> ${term.address}</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; font-size: 10.5px; color: #334155; margin-bottom: 6px;">
              <div><strong>Routes:</strong> ${term.routes}</div>
              <div style="margin-top: 3px;"><strong>Operating Hours:</strong> ${term.operatingHours}</div>
              <div style="margin-top: 3px;"><strong>Capacity:</strong> ${term.capacity}</div>
            </div>
            <a
              href="https://www.google.com/maps?q=${term.coords[0]},${term.coords[1]}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                background: #1a73e8;
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 6px 10px;
                border-radius: 6px;
                text-decoration: none;
                margin-bottom: 6px;
              "
            >
              <span>Proceed to Google Maps</span>
              <span>↗</span>
            </a>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800;">
              ✓ Lucky Betplay Authorized Public Transit Point
            </div>
          </div>
        `);
      });
    }

    // ================= POI LAYER 2: INDUSTRIAL PLANTS & FACTORIES =================
    const shouldRenderFactories = viewMode === "barangay" || showFactories;
    if (shouldRenderFactories) {
      const factoriesToRender = viewMode === "barangay" && activeBarangayCircuit
        ? MANDAUE_POIS.factories.filter(f => f.barangayId === activeBarangayCircuit.id)
        : MANDAUE_POIS.factories;

      factoriesToRender.forEach((fact) => {
        const isBelongingToActive = activeBarangayCircuit && fact.barangayId === activeBarangayCircuit.id;

        const factIcon = window.L.divIcon({
          className: "factory-pin",
          html: `
            <div style="
              display: flex;
              align-items: center;
              gap: 4px;
              background: ${isBelongingToActive ? "#7c2d12" : "#431407"};
              border: ${isBelongingToActive ? "2.5px solid #fed7aa" : "2px solid #fb923c"};
              border-radius: 9999px;
              padding: 3px 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              color: #ffedd5;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 10px;
              font-weight: 800;
              white-space: nowrap;
              cursor: pointer;
              transform: translate(-50%, -50%);
            ">
              <span>🏭</span>
              <span>${fact.name.length > 22 ? fact.name.slice(0, 20) + "..." : fact.name}</span>
            </div>
          `,
          iconSize: [140, 26],
          iconAnchor: [70, 13]
        });

        const marker = window.L.marker(fact.coords, { icon: factIcon }).addTo(group);

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 240px; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 16px;">🏭</span>
              <span style="font-size: 9px; font-weight: 900; background: #ffedd5; color: #9a3412; padding: 2px 6px; border-radius: 6px; text-transform: uppercase;">
                ${fact.category}
              </span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 900; color: #0f172a;">${fact.name}</h4>
            <div style="background: #ffedd5; border: 1px solid #fed7aa; border-radius: 6px; padding: 5px 8px; margin-bottom: 6px; font-family: monospace; font-size: 11px; font-weight: 900; color: #9a3412;">
              📍 GPS: ${formatGPS(fact.coords)}
            </div>
            <p style="margin: 0 0 6px 0; font-size: 11px; color: #475569;">📍 <strong>${fact.barangayName}:</strong> ${fact.address}</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px; font-size: 10.5px; color: #334155; margin-bottom: 6px;">
              <div><strong>Workforce Size:</strong> ${fact.workforceSize}</div>
              <div style="margin-top: 3px;"><strong>Products:</strong> ${fact.products}</div>
            </div>
            <a
              href="https://www.google.com/maps?q=${fact.coords[0]},${fact.coords[1]}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                background: #1a73e8;
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 6px 10px;
                border-radius: 6px;
                text-decoration: none;
                margin-bottom: 6px;
              "
            >
              <span>Proceed to Google Maps</span>
              <span>↗</span>
            </a>
            <div style="font-size: 9.5px; color: #047857; font-weight: 800;">
              ✓ Lucky Betplay Designated Employment Zone
            </div>
          </div>
        `);
      });
    }

    // ================= LAYER: USER-TAGGED BOOTHS & AGENT OUTLETS ONLY =================
    // Zero synthetic mock booths: ONLY booths and agents entered by the user are plotted!
    const boothsToRender = viewMode === "barangay" && activeBarangayCircuit
      ? userTaggedBooths.filter((b) => b.barangayId === activeBarangayCircuit.id)
      : userTaggedBooths;

    boothsToRender.forEach((booth) => {
      const { coords, name, address, barangayName, detectionConfidence, tellerName, supervisor, contactNumber, notes } = booth;
      if (!coords || coords.length < 2) return;

      const isBelongingToActive = activeBarangayCircuit && booth.barangayId === activeBarangayCircuit.id;
      const displayName = name || "001";

      const isMeasuringSource = measuringSourceKiosk && String(measuringSourceKiosk.id) === String(booth.id);
      const isMeasuringTargetCandidate = measuringSourceKiosk && String(measuringSourceKiosk.id) !== String(booth.id);

      const outletIcon = window.L.divIcon({
        className: "yellow-booth-pin",
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-end;
            width: 160px;
            height: 102px;
            cursor: pointer;
            user-select: none;
            filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));
            position: relative;
          ">
            ${isMeasuringSource ? `
              <!-- Pulsing Beacon Halo for Source Kiosk A -->
              <div style="
                position: absolute;
                width: 72px;
                height: 72px;
                border-radius: 50%;
                border: 3px solid #14b8a6;
                background: rgba(20, 184, 166, 0.25);
                top: 36px;
                left: 50%;
                transform: translateX(-50%);
                animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
                pointer-events: none;
              "></div>
            ` : ''}

            <!-- 1. BADGE ON TOP OF THE KIOSK -->
            <div style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              background: ${isMeasuringSource ? "#0f766e" : (isMeasuringTargetCandidate ? "#0284c7" : "#047857")};
              color: #ffffff;
              border: 2.5px solid ${isMeasuringSource ? "#2dd4bf" : (isMeasuringTargetCandidate ? "#38bdf8" : "#38bdf8")};
              border-radius: 9999px;
              padding: 2.5px 10px;
              font-family: system-ui, -apple-system, sans-serif;
              font-size: 11.5px;
              font-weight: 900;
              letter-spacing: 0.5px;
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.7), 0 0 10px ${isMeasuringSource ? "rgba(45, 212, 191, 0.6)" : "rgba(56, 189, 248, 0.5)"};
              margin-bottom: 2px;
              max-width: 160px;
              overflow: hidden;
              text-overflow: ellipsis;
            ">
              <span style="font-size: 11px;">${isMeasuringSource ? "📏" : (isMeasuringTargetCandidate ? "🎯" : "🏪")}</span>
              <span style="overflow: hidden; text-overflow: ellipsis;">
                ${isMeasuringSource ? `POINT A: ${displayName}` : (isMeasuringTargetCandidate ? `🎯 Measure: ${displayName}` : displayName)}
              </span>
            </div>

            <!-- 2. ACTUAL ILLUSTRATED KIOSK ICON (Where coordinates are) -->
            <div style="
              position: relative;
              width: 48px;
              height: 62px;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              ${getKioskSvgHtml(48, 62)}
            </div>

            <!-- 3. EXACT GROUND PIN (Directly on coordinates) -->
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-top: -4px;
            ">
              <div style="
                width: 0;
                height: 0;
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 6px solid #0f172a;
              "></div>
              <div style="
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: ${isMeasuringSource ? "#14b8a6" : (isMeasuringTargetCandidate ? "#38bdf8" : "#f59e0b")};
                border: 2px solid #ffffff;
                box-shadow: 0 0 10px ${isMeasuringSource ? "#14b8a6" : "#f59e0b"}, 0 2px 5px rgba(0,0,0,0.7);
                margin-top: -1px;
              "></div>
            </div>
          </div>
        `,
        iconSize: [160, 102],
        iconAnchor: [80, 102],
        popupAnchor: [0, -102]
      });

      const marker = window.L.marker(coords, { icon: outletIcon }).addTo(group);

      // Intercept marker click if in active distance measuring mode
      marker.on("click", (e) => {
        if (measuringSourceKioskRef.current) {
          window.L.DomEvent.stopPropagation(e);
          if (String(measuringSourceKioskRef.current.id) === String(booth.id)) {
            return; // Clicked the same kiosk as source
          }
          handleCompleteMeasurement(measuringSourceKioskRef.current, booth);
          return;
        }
      });

      marker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; min-width: 260px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 6px;">
            <span style="background: #fef3c7; color: #b45309; font-weight: 900; font-size: 10px; padding: 2px 8px; border-radius: 6px; border: 1px solid #fde68a; display: flex; align-items: center; gap: 3px;">
              <span>🟡</span>
              <span>TAGGED KIOSK BOOTH</span>
            </span>
            <span style="font-size: 10.5px; color: #64748b; font-family: monospace; font-weight: 700;">Brgy. ${barangayName || ''}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
            <div style="width: 32px; height: 42px; flex-shrink: 0;">
              ${getKioskSvgHtml(32, 42)}
            </div>
            <div>
              <h4 style="margin: 0; font-size: 15px; font-weight: 900; color: #0f172a; line-height: 1.2;">Booth ${displayName}</h4>
              <span style="font-size: 10px; color: #d97706; font-weight: 800;">Official Territory Kiosk</span>
            </div>
          </div>
          
          <div style="background: #fffbeb; border: 1.5px solid #fcd34d; border-radius: 8px; padding: 7px 9px; font-size: 11px; margin-bottom: 6px; color: #92400e;">
            <div><strong>📍 Booth Address:</strong> ${address || `Brgy. ${barangayName}`}</div>
            <div style="font-size: 9.5px; color: #d97706; font-weight: 800; margin-top: 2px;">✓ ${detectionConfidence || "Cadastral Survey Verified"}</div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 9px; font-size: 10.5px; color: #334155; margin-bottom: 6px; line-height: 1.45;">
            ${tellerName ? `<div><strong>Assigned Teller:</strong> ${tellerName}</div>` : ''}
            ${supervisor ? `<div><strong>Supervisor:</strong> ${supervisor}</div>` : ''}
            ${contactNumber ? `<div><strong>Contact:</strong> ${contactNumber}</div>` : ''}
            ${notes ? `<div><strong>Notes:</strong> ${notes}</div>` : ''}
            <div style="font-family: monospace; font-size: 10px; color: #64748b; margin-top: 3px;"><strong>GPS:</strong> ${formatGPS(coords)}</div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 5px;">
            <a
              href="https://www.google.com/maps?q=${coords[0]},${coords[1]}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                background: #0284c7;
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 7px 10px;
                border-radius: 8px;
                text-decoration: none;
                box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);
              "
            >
              <span>Proceed to Google Maps</span>
              <span>↗</span>
            </a>

            <!-- Measure Distance Button -->
            <button
              type="button"
              onclick="window.startMeasuringKiosk('${booth.id}')"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                width: 100%;
                background: #0d9488;
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 7.5px 10px;
                border-radius: 8px;
                border: none;
                cursor: pointer;
                box-shadow: 0 2px 6px rgba(13, 148, 136, 0.35);
              "
            >
              <span>📏</span>
              <span>Measure Distance to Another Kiosk</span>
            </button>
          </div>
        </div>
      `);
    });

  }, [leafletLoaded, viewMode, activeBarangayCircuit, selectedEdgeBarangay, cityRouteIndex, brgyRouteIndex, showTerminals, showFactories, brgyInspectorTab, activeBarangayAgents, taggedAgentCoords, userTaggedBooths, measuringSourceKiosk]);

  // City-Level Driving Animation
  useEffect(() => {
    if (!isCityDriving || viewMode !== "city") return;

    const stepSize = drivingSpeed === 4 ? 6 : drivingSpeed === 2 ? 4 : 2;
    const intervalTime = 120 / drivingSpeed;

    const timer = setInterval(() => {
      setCityRouteIndex((prev) => {
        const next = (prev + stepSize) % SNAPPED_EDGE_ROUTE_COORDS.length;
        const currentPt = SNAPPED_EDGE_ROUTE_COORDS[next];

        // Auto-match closest edge barangay
        let closestEb = EDGE_BARANGAYS_CIRCUIT[0];
        let minDist = 9999;
        EDGE_BARANGAYS_CIRCUIT.forEach((eb) => {
          const dLat = (currentPt[0] - eb.coords[0]) * 111;
          const dLng = (currentPt[1] - eb.coords[1]) * 111 * Math.cos(currentPt[0] * Math.PI / 180);
          const dist = Math.sqrt(dLat * dLat + dLng * dLng);
          if (dist < minDist) {
            minDist = dist;
            closestEb = eb;
          }
        });

        setSelectedEdgeBarangay(closestEb);

        // Smooth camera follow
        if (leafletMapRef.current && (next % 15 === 0)) {
          leafletMapRef.current.panTo(currentPt, { animate: true, duration: 0.5 });
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isCityDriving, viewMode, drivingSpeed]);

  // Barangay-Level Driving Animation
  useEffect(() => {
    if (!isBrgyDriving || viewMode !== "barangay" || !activeBarangayCircuit) return;

    const bRoute = BARANGAY_PERIMETER_ROUTES[activeBarangayCircuit.id];
    if (!bRoute || !bRoute.points || bRoute.points.length === 0) return;

    const stepSize = drivingSpeed === 4 ? 4 : drivingSpeed === 2 ? 2 : 1;
    const intervalTime = 120 / drivingSpeed;

    const timer = setInterval(() => {
      setBrgyRouteIndex((prev) => {
        const next = (prev + stepSize) % bRoute.points.length;
        const currentPt = bRoute.points[next];

        if (leafletMapRef.current && (next % 10 === 0)) {
          leafletMapRef.current.panTo(currentPt, { animate: true, duration: 0.4 });
        }

        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isBrgyDriving, viewMode, activeBarangayCircuit, drivingSpeed]);

  // Switch into Dedicated Barangay Perimeter Mode (e.g. Casili)
  const handleSelectBarangayPerimeter = (barangayId, initialTab = "route") => {
    const found = ALL_27_BARANGAYS.find(b => b.id === barangayId) || EDGE_BARANGAYS_CIRCUIT.find(b => b.id === barangayId);
    if (!found) return;

    setActiveBarangayCircuit(found);
    setViewMode("barangay");
    setBrgyRouteIndex(0);
    setIsBrgyDriving(false);
    setBrgyInspectorTab(initialTab);

    if (leafletMapRef.current) {
      const bRoute = BARANGAY_PERIMETER_ROUTES[barangayId];
      if (bRoute && bRoute.boundaryPolygon && bRoute.boundaryPolygon.length > 0) {
        // Precise fit to the official municipal boundary of the barangay
        const bounds = window.L.latLngBounds(bRoute.boundaryPolygon);
        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else if (bRoute && bRoute.points && bRoute.points.length > 0) {
        const bounds = window.L.latLngBounds(bRoute.points);
        leafletMapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
      } else {
        leafletMapRef.current.flyTo(found.coords, 16, { duration: 1.0 });
      }
    }
  };

  // Return to Whole Mandaue City View
  const handleReturnToCityView = () => {
    setViewMode("city");
    setActiveBarangayCircuit(null);
    setIsBrgyDriving(false);
    if (leafletMapRef.current) {
      const cityBounds = window.L.latLngBounds(SNAPPED_EDGE_ROUTE_COORDS);
      leafletMapRef.current.fitBounds(cityBounds, { padding: [45, 45] });
    }
  };

  // Fly to specific POI with animation
  const handleFocusPOI = (coords) => {
    if (leafletMapRef.current && coords) {
      leafletMapRef.current.flyTo(coords, 17, { duration: 0.8 });
    }
  };

  const activeBarangayData = activeBarangayCircuit ? BARANGAY_PERIMETER_ROUTES[activeBarangayCircuit.id] : null;

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* ================= 100% PURE FULL-SCREEN MAP CANVAS ================= */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full bg-slate-950 z-0 cursor-crosshair"
      />

      {!leafletLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 gap-3 z-30">
          <RefreshCw size={28} className="animate-spin text-emerald-400" />
          <p className="text-xs font-bold tracking-wide">Loading Mandaue Territory &amp; Boundary Maps...</p>
        </div>
      )}

      {/* ================= COPIED TOAST NOTIFICATION ================= */}
      {copiedText && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-mono text-xs font-bold px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 animate-in fade-in duration-150">
          <Check size={14} />
          <span>Copied {copiedText}</span>
        </div>
      )}

      {/* ================= ACTIVE MEASURING MODE HUD BANNER ================= */}
      {measuringSourceKiosk && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-xl border-2 border-teal-400 rounded-2xl shadow-2xl p-3 px-5 flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200 max-w-[94vw] border-teal-400 shadow-teal-950/60">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-400/40 flex items-center justify-center shrink-0 animate-pulse">
            <Ruler size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/40">
                Distance Measurement
              </span>
              <span className="text-[11px] font-mono font-bold text-teal-300">
                Point A: Booth {measuringSourceKiosk.name}
              </span>
            </div>
            <div className="text-xs text-white font-bold mt-0.5">
              Click a <strong>second kiosk</strong> on the map to measure distance and view yesterday's gross sales.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setMeasuringSourceKiosk(null);
              setCopiedText("Measurement cancelled");
              setTimeout(() => setCopiedText(null), 2000);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer border border-slate-700 shrink-0 ml-1"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ================= FLOATING MEASURED DISTANCE BAR (When measurement line is on map) ================= */}
      {measuredPair && !isDistanceModalOpen && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-xl border border-teal-500/80 rounded-2xl shadow-2xl p-2.5 px-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[94vw]">
          <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Ruler size={16} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase text-teal-400">
              Measured Distance: {measuredPair.distanceMeters >= 1000 ? `${(measuredPair.distanceMeters / 1000).toFixed(2)} km` : `${Math.round(measuredPair.distanceMeters)} m`}
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Booth {measuredPair.source?.name}</span>
              <span className="text-teal-400">➔</span>
              <span>Booth {measuredPair.target?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => setIsDistanceModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition cursor-pointer shadow-md flex items-center gap-1"
            >
              <CircleDollarSign size={13} />
              <span>View Yesterday's Gross</span>
            </button>
            <button
              type="button"
              onClick={handleClearMeasurement}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
              title="Clear Line on Map"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ================= FLOATING GOOGLE MAPS DIALOG FOR CLICKED COORDINATES ================= */}
      {clickedPoint && (
        <div className="absolute top-28 left-4 right-4 sm:left-auto sm:right-4 z-40 bg-slate-900/95 backdrop-blur-xl border border-sky-500/80 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md shrink-0">
              <MapPin size={20} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-sky-400 tracking-wider">
                Tagged Coordinates
              </div>
              <div className="text-xs font-mono font-black text-white">
                {formatGPS([clickedPoint.lat, clickedPoint.lng])}
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                ({clickedPoint.lat.toFixed(6)}, {clickedPoint.lng.toFixed(6)})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => handleCopyGPS([clickedPoint.lat, clickedPoint.lng], "Tagged Point")}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-slate-700"
              title="Copy GPS coordinates"
            >
              <Copy size={13} />
              <span>Copy</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddBooth([clickedPoint.lat, clickedPoint.lng])}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-purple-900/40"
              title="Register and tag a new booth at these exact coordinates"
            >
              <Plus size={13} />
              <span>Add Booth Here</span>
            </button>

            <a
              href={`https://www.google.com/maps?q=${clickedPoint.lat.toFixed(6)},${clickedPoint.lng.toFixed(6)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-900/40"
            >
              <span>Proceed to Google Maps</span>
              <ExternalLink size={13} />
            </a>

            <button
              type="button"
              onClick={() => {
                setClickedPoint(null);
                if (clickedMarkerRef.current && leafletMapRef.current) {
                  leafletMapRef.current.removeLayer(clickedMarkerRef.current);
                  clickedMarkerRef.current = null;
                }
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700 ml-0.5"
              title="Clear Marker"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ================= TOP DYNAMIC HUD: CITY VIEW vs BARANGAY PERIMETER VIEW ================= */}
      <div className="absolute top-3 left-3 right-3 md:left-4 md:right-4 z-20 pointer-events-auto space-y-2">
        {/* VIEW MODE 1: WHOLE CITY PERIMETER HUD */}
        {viewMode === "city" && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shrink-0">
                <Navigation2 size={22} className="rotate-45" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    City Perimeter Circuit
                  </span>
                  <span className="text-sm font-black text-white">
                    Step {selectedEdgeBarangay.step}: Brgy. {selectedEdgeBarangay.name}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    ({formatGPS(selectedEdgeBarangay.coords)})
                  </span>
                </div>

                <p className="text-xs text-slate-300 font-medium line-clamp-1 mt-0.5">
                  💡 <em>Click anywhere on the map to pin exact GPS coordinates &amp; proceed directly to Google Maps!</em>
                </p>
              </div>
            </div>

            {/* City Controls & Optional POI Toggles */}
            <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">
              {/* Optional Terminals Toggle */}
              <button
                type="button"
                onClick={() => setShowTerminals(v => !v)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${showTerminals
                  ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-md"
                  : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                title="Toggle Transit Terminals & Commuter Stations"
              >
                <Bus size={13} />
                <span>Terminals ({MANDAUE_POIS.terminals.length})</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showTerminals ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`} />
              </button>

              {/* Optional Factories Toggle */}
              <button
                type="button"
                onClick={() => setShowFactories(v => !v)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${showFactories
                  ? "bg-orange-500/20 border-orange-400 text-orange-300 shadow-md"
                  : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                title="Toggle Industrial Manufacturing Plants & Factories"
              >
                <Factory size={13} />
                <span>Factories ({MANDAUE_POIS.factories.length})</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showFactories ? "bg-orange-400 animate-pulse" : "bg-slate-600"}`} />
              </button>

              {/* Source API Agents Directory Button */}
              <button
                type="button"
                onClick={() => {
                  setAgentsModalBarangayFilter("all");
                  setIsAgentsModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md hover:bg-emerald-500/30"
                title="View All 389 Live Registered Agents from Source API"
              >
                <Users size={13} />
                <span>Agents ({apiAgents.length})</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </button>

              {/* Tagged Outlets Indicator */}
              <button
                type="button"
                onClick={() => setCityInspectorTab("tagged_agents")}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer bg-slate-800 border-slate-700 text-slate-300 hover:text-white shadow-sm"
                title="View User-Tagged Booths & Stations on Map"
              >
                <MapPin size={13} className="text-emerald-400" />
                <span>Tagged Booths ({userTaggedBooths.length})</span>
              </button>

              {/* Central Supabase Cloud Database Sync Status */}
              <div
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${syncStatus === "syncing"
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    : syncStatus === "offline"
                      ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                      : "bg-sky-500/15 border-sky-500/30 text-sky-300"
                  }`}
                title="Central Supabase Cloud Database: Plotted booths are synchronized in real-time across all users and devices"
              >
                <Cloud size={13} className={syncStatus === "syncing" ? "animate-pulse" : ""} />
                <span>
                  {syncStatus === "syncing" ? "Syncing..." : syncStatus === "offline" ? "Offline" : "Cloud Synced"}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${syncStatus === "syncing"
                      ? "bg-amber-400 animate-ping"
                      : syncStatus === "offline"
                        ? "bg-rose-400"
                        : "bg-emerald-400 animate-pulse"
                    }`}
                />
              </div>

              {/* Tag Booth Button (Replaces Patrol City Button) */}
              <button
                type="button"
                onClick={() => handleOpenBoothModal()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
                title="Tag Booth: Enter GPS Coordinates, Detect Barangay & Set Booth Address"
              >
                <Plus size={14} />
                <Store size={14} />
                <span>Tag Booth</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700 ml-1"
                title="Close GeoTagging View"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* VIEW MODE 2: DEDICATED INDIVIDUAL BARANGAY PERIMETER HUD (e.g. CASILI) */}
        {viewMode === "barangay" && activeBarangayCircuit && (
          <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/60 rounded-2xl shadow-2xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              {/* Back to City Overview Button */}
              <button
                type="button"
                onClick={handleReturnToCityView}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-700 shrink-0 shadow-md"
                title="Return to Whole Mandaue City Map"
              >
                <ArrowLeft size={16} />
                <span>Return to City Overview</span>
              </button>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Full Barangay Boundary
                  </span>
                  <h2 className="text-base font-black text-white">
                    Brgy. {activeBarangayCircuit.name}
                  </h2>
                  <span className="text-xs font-mono font-black text-cyan-400">
                    • {activeBarangayData?.distanceKm || "7.84"} km Perimeter Route
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyGPS(activeBarangayCircuit.coords, `Brgy. ${activeBarangayCircuit.name}`)}
                    className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1 cursor-pointer"
                    title="Click to copy GPS coordinates"
                  >
                    <span>{formatGPS(activeBarangayCircuit.coords)}</span>
                    <Copy size={11} className="text-cyan-400" />
                  </button>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300 font-medium mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <ShieldCheck size={13} />
                    <span>100% Precise Boundary Covered</span>
                  </span>
                  <span className="flex items-center gap-1 text-amber-300 font-semibold">
                    <Bus size={13} />
                    <span>{activeBarangayData?.terminals?.length || 0} Transit Stations</span>
                  </span>
                  <span className="flex items-center gap-1 text-orange-300 font-semibold">
                    <Factory size={13} />
                    <span>{activeBarangayData?.factories?.length || 0} Industrial Facilities</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                    <Users size={13} />
                    <span>{activeBarangayAgents.length} Agents / Tellers</span>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <MapPin size={13} />
                    <span>{activeBarangayTaggedAgents.length} Tagged Stations</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Barangay Driving Controls & Quick Action */}
            <div className="flex items-center gap-2 self-end md:self-center shrink-0 flex-wrap">

              <button
                type="button"
                onClick={() => {
                  setAgentsModalBarangayFilter(activeBarangayCircuit.id);
                  setIsAgentsModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md hover:bg-emerald-500/30"
                title="View All Registered Agents in this Barangay"
              >
                <Users size={13} />
                <span>Agents ({activeBarangayAgents.length})</span>
              </button>

              {/* Tag Booth Button (Barangay View) */}
              <button
                type="button"
                onClick={() => handleOpenBoothModal(null, activeBarangayCircuit)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 shadow-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-950/40"
                title={`Tag Booth in Brgy. ${activeBarangayCircuit.name}`}
              >
                <Plus size={14} />
                <Store size={14} />
                <span>Tag Booth</span>
              </button>
            </div>
          </div>
        )}

        {/* Horizontal Barangay Selector Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="px-2.5 py-1 rounded-xl bg-slate-900/95 border border-slate-800 text-[10px] font-black text-cyan-400 backdrop-blur-md shrink-0">
            Select Barangay to Inspect:
          </span>
          {ALL_27_BARANGAYS.map((b) => {
            const isCurrent = activeBarangayCircuit?.id === b.id;
            const bAgentsCount = getAgentsForBarangayId(b.id).length;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBarangayPerimeter(b.id)}
                className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 backdrop-blur-md border shadow-sm ${isCurrent
                  ? "bg-cyan-600 text-white border-cyan-400 shadow-md ring-2 ring-cyan-400/40"
                  : "bg-slate-900/90 text-slate-300 hover:text-white border-slate-800"
                  }`}
              >
                <span>{b.isEdge ? "🛡️" : "🏛️"}</span>
                <span>{b.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${isCurrent ? 'bg-cyan-900 text-cyan-100' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'}`}>
                  {bAgentsCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= FLOATING ZOOM & FOLLOW CONTROLS (RIGHT SIDE) ================= */}
      <div className="absolute top-36 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            if (leafletMapRef.current) leafletMapRef.current.zoomIn();
          }}
          className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-md text-white shadow-xl flex items-center justify-center font-bold text-base hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            if (leafletMapRef.current) leafletMapRef.current.zoomOut();
          }}
          className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-md text-white shadow-xl flex items-center justify-center font-bold text-base hover:bg-slate-800 border border-slate-700 transition cursor-pointer"
          title="Zoom Out"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => {
            if (leafletMapRef.current) {
              if (viewMode === "barangay" && activeBarangayCircuit) {
                const bRoute = BARANGAY_PERIMETER_ROUTES[activeBarangayCircuit.id];
                if (bRoute && bRoute.points) {
                  leafletMapRef.current.panTo(bRoute.points[brgyRouteIndex] || activeBarangayCircuit.coords, { animate: true });
                }
              } else {
                leafletMapRef.current.panTo(SNAPPED_EDGE_ROUTE_COORDS[cityRouteIndex], { animate: true });
              }
            }
          }}
          className="w-8 h-8 rounded-xl bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:bg-emerald-500 transition cursor-pointer"
          title="Center on Patrol Vehicle"
        >
          <Crosshair size={15} />
        </button>
      </div>

      {/* ================= BOTTOM-LEFT LEGEND ================= */}
      <div className="absolute bottom-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md p-2.5 rounded-2xl border border-slate-800 shadow-2xl max-w-xs text-xs pointer-events-auto space-y-1">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
          <span className="font-black text-slate-300 uppercase text-[9px] tracking-wider flex items-center gap-1.5">
            <Route size={11} className="text-emerald-400" />
            {viewMode === "barangay" ? `Brgy. ${activeBarangayCircuit?.name} Legend` : "Perimeter Circuit Legend"}
          </span>
          <span className="text-[8.5px] text-cyan-400 font-bold">
            {viewMode === "barangay" ? "Precise Boundary" : "City Circuit"}
          </span>
        </div>

        <div className="space-y-1 text-[10px]">
          {viewMode === "barangay" ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 rounded-full bg-cyan-400 shrink-0 shadow-sm" />
                <span className="font-bold text-cyan-300">Cyan: Snapped Perimeter Road</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/25 border border-dashed border-emerald-400 shrink-0" />
                <span className="font-bold text-emerald-300">Green: 100% Cadastral Boundary</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">🚌</span>
                <span className="font-semibold text-amber-300">Transit Terminals (GPS Tagged)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">🏭</span>
                <span className="font-semibold text-orange-300">Industrial Facilities (GPS Tagged)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
                <span className="font-bold text-emerald-300">Green: Outer Edge Circuit (16 Barangays)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-700 text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                <span className="font-medium text-slate-300">Outer Edge Pins (1 to 16)</span>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 pt-0.5 border-t border-slate-800 text-[9.5px] text-sky-400">
            <span className="text-xs">📍</span>
            <span className="font-bold">Click map to tag &amp; open Google Maps</span>
          </div>
        </div>
      </div>

      {/* ================= BOTTOM-RIGHT INSPECTOR CARD ================= */}
      <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:w-[430px] max-h-[390px] z-30 pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 text-xs animate-in slide-in-from-bottom duration-200 flex flex-col gap-2 overflow-hidden">
        {viewMode === "barangay" && activeBarangayCircuit ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2 shrink-0">
              <div>
                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 inline-block mb-0.5">
                  Territory &amp; Facilities Inspector
                </span>
                <h3 className="text-base font-black text-white leading-tight">
                  Brgy. {activeBarangayCircuit.name}
                </h3>
                <p className="text-[10.5px] text-cyan-400 font-bold mt-0.5">
                  100% Authorized Under Mandaue City (Lucky Betplay Corporation)
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Circuit Length</span>
                <span className="text-xs font-mono font-black text-cyan-400">
                  {activeBarangayData?.distanceKm || "7.84"} km
                </span>
              </div>
            </div>

            {/* Sub-Tabs: Boundary | Transit Terminals | Industrial Facilities | Live Agents | Custom Booths */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setBrgyInspectorTab("route")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shrink-0 ${brgyInspectorTab === "route"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Route size={12} />
                <span>Boundary</span>
              </button>

              <button
                type="button"
                onClick={() => setBrgyInspectorTab("booths")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shrink-0 ${brgyInspectorTab === "booths"
                  ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <span>🟡</span>
                <span>Booths ({activeBarangayTaggedBooths.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setBrgyInspectorTab("terminals")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shrink-0 ${brgyInspectorTab === "terminals"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Bus size={12} />
                <span>Terminals ({activeBarangayData?.terminals?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setBrgyInspectorTab("factories")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 shrink-0 ${brgyInspectorTab === "factories"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Factory size={12} />
                <span>Factories ({activeBarangayData?.factories?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setBrgyInspectorTab("agents")}
                className={`flex-1 py-1 px-2 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${brgyInspectorTab === "agents"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
              >
                <Users size={12} />
                <span>Agents ({activeBarangayAgents.length})</span>
                {activeBarangayTaggedAgents.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-sm" title={`${activeBarangayTaggedAgents.length} Tagged on Map`} />
                )}
              </button>
            </div>

            {/* Tab Content: Boundary & Route */}
            {brgyInspectorTab === "route" && (
              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Center GPS:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyGPS(activeBarangayCircuit.coords, `Center of ${activeBarangayCircuit.name}`)}
                      className="font-mono text-cyan-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      title="Click to copy GPS"
                    >
                      <span>{formatGPS(activeBarangayCircuit.coords)}</span>
                      <Copy size={11} />
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Street:</span>
                    <strong className="text-white text-right">{activeBarangayCircuit.mainRoad}</strong>
                  </div>
                  {activeBarangayCircuit.bordersWith && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bordering LGU:</span>
                      <strong className="text-amber-400 text-right">{activeBarangayCircuit.bordersWith}</strong>
                    </div>
                  )}
                  {activeBarangayCircuit.landmark && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Key Landmark:</span>
                      <strong className="text-white text-right truncate max-w-[210px]">{activeBarangayCircuit.landmark}</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Google Maps:</span>
                    <a
                      href={`https://www.google.com/maps?q=${activeBarangayCircuit.coords[0]},${activeBarangayCircuit.coords[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Open Location</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleReturnToCityView}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer text-center"
                  >
                    City Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenBoothModal(null, activeBarangayCircuit)}
                    className="flex-1 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition cursor-pointer text-center shadow-md shadow-cyan-900/30 flex items-center justify-center gap-1.5"
                    title={`Tag a Booth in ${activeBarangayCircuit.name}`}
                  >
                    <Plus size={13} />
                    <span>Tag Booth</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab Content: Tagged Yellow Booths in this Barangay */}
            {brgyInspectorTab === "booths" && (
              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
                  <span className="text-[10px] font-bold text-amber-400">
                    {activeBarangayTaggedBooths.length} Yellow Booths in {activeBarangayCircuit.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenBoothModal(null, activeBarangayCircuit)}
                    className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Plus size={11} />
                    <span>Tag Booth</span>
                  </button>
                </div>

                {activeBarangayTaggedBooths.length > 0 ? (
                  activeBarangayTaggedBooths.map((booth) => (
                    <div
                      key={booth.id}
                      className="p-2 rounded-xl bg-slate-950 border border-amber-900/40 hover:border-amber-500/80 transition space-y-1"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-2">
                          <KioskIconSvg width={24} height={32} className="shrink-0 drop-shadow-md" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                #{booth.name || "001"}
                              </span>
                              <h4 className="font-bold text-white text-xs leading-tight">
                                Booth {booth.name || "001"}
                              </h4>
                            </div>
                            <p className="text-[10px] text-amber-300 font-semibold mt-0.5">
                              📍 {booth.address}
                            </p>
                            {booth.tellerName && (
                              <p className="text-[9px] text-slate-400">Teller: {booth.tellerName}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyGPS(booth.coords, booth.name)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copy GPS"
                          >
                            <Copy size={11} />
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${booth.coords[0]},${booth.coords[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-blue-600/30 hover:bg-blue-500 text-blue-200 hover:text-white transition cursor-pointer"
                            title="Proceed to Google Maps"
                          >
                            <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFocusPOI(booth.coords)}
                            className="px-1.5 py-0.5 rounded-lg bg-amber-600/30 hover:bg-amber-500 text-amber-200 hover:text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            Focus
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (measuringSourceKiosk && String(measuringSourceKiosk.id) !== String(booth.id)) {
                                handleCompleteMeasurement(measuringSourceKiosk, booth);
                              } else {
                                startMeasuringFromKiosk(booth);
                                handleFocusPOI(booth.coords);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${measuringSourceKiosk?.id === booth.id
                                ? "bg-teal-500 text-white shadow-md animate-pulse"
                                : "bg-teal-600/30 hover:bg-teal-500 text-teal-200 hover:text-white"
                              }`}
                            title="Measure distance from this kiosk"
                          >
                            <Ruler size={10} />
                            <span>{measuringSourceKiosk?.id === booth.id ? "Point A" : "Measure"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditUserBooth(booth)}
                            className="p-1 rounded-md bg-cyan-950/60 hover:bg-cyan-600 text-cyan-300 hover:text-white transition cursor-pointer"
                            title="Edit Booth"
                          >
                            <Sliders size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded-md font-mono text-[9px] text-amber-300 font-bold">
                        <span>GPS: {formatGPS(booth.coords)}</span>
                        <span className="text-[8.5px] text-amber-400 font-sans">✓ Verified</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs space-y-1.5">
                    <p>No booths tagged in Brgy. {activeBarangayCircuit.name} yet.</p>
                    <button
                      type="button"
                      onClick={() => handleOpenBoothModal(null, activeBarangayCircuit)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition cursor-pointer inline-flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={12} />
                      <span>Tag Booth in {activeBarangayCircuit.name}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Public Transit Terminals */}
            {brgyInspectorTab === "terminals" && (
              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                {activeBarangayData?.terminals?.length > 0 ? (
                  activeBarangayData.terminals.map((term) => (
                    <div
                      key={term.id}
                      className="p-2 rounded-xl bg-slate-950 border border-amber-900/40 hover:border-amber-500/80 transition space-y-1"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400">🚌</span>
                            <h4 className="font-bold text-white text-xs leading-tight">{term.name}</h4>
                          </div>
                          <span className="text-[9.5px] text-amber-300/80 font-semibold">{term.type}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyGPS(term.coords, term.name)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copy GPS Coordinates"
                          >
                            <Copy size={11} />
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${term.coords[0]},${term.coords[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-blue-600/30 hover:bg-blue-500 text-blue-200 hover:text-white transition cursor-pointer"
                            title="Proceed to Google Maps"
                          >
                            <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFocusPOI(term.coords)}
                            className="px-2 py-0.5 rounded-lg bg-amber-600/30 hover:bg-amber-500 text-amber-200 hover:text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            Focus
                          </button>
                        </div>
                      </div>

                      {/* Prominent GPS Coordinates Badge */}
                      <div className="flex items-center justify-between bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded-md font-mono text-[10px] text-amber-300 font-bold">
                        <span>📍 GPS:</span>
                        <span>{formatGPS(term.coords)}</span>
                      </div>

                      <p className="text-[10px] text-slate-400">📍 {term.address}</p>
                      <div className="text-[9.5px] text-slate-300 bg-slate-900/80 p-1 rounded border border-slate-800 space-y-0.5">
                        <div><strong>Routes:</strong> {term.routes}</div>
                        <div><strong>Hours:</strong> {term.operatingHours} • <strong>Capacity:</strong> {term.capacity}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                    No registered public transit terminal inside this specific barangay polygon.
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Industrial Manufacturing Plants & Factories */}
            {brgyInspectorTab === "factories" && (
              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                {activeBarangayData?.factories?.length > 0 ? (
                  activeBarangayData.factories.map((fact) => (
                    <div
                      key={fact.id}
                      className="p-2 rounded-xl bg-slate-950 border border-orange-900/40 hover:border-orange-500/80 transition space-y-1"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-orange-400">🏭</span>
                            <h4 className="font-bold text-white text-xs leading-tight">{fact.name}</h4>
                          </div>
                          <span className="text-[9.5px] text-orange-300/80 font-semibold">{fact.category}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyGPS(fact.coords, fact.name)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copy GPS Coordinates"
                          >
                            <Copy size={11} />
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${fact.coords[0]},${fact.coords[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-blue-600/30 hover:bg-blue-500 text-blue-200 hover:text-white transition cursor-pointer"
                            title="Proceed to Google Maps"
                          >
                            <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFocusPOI(fact.coords)}
                            className="px-2 py-0.5 rounded-lg bg-orange-600/30 hover:bg-orange-500 text-orange-200 hover:text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            Focus
                          </button>
                        </div>
                      </div>

                      {/* Prominent GPS Coordinates Badge */}
                      <div className="flex items-center justify-between bg-orange-950/40 border border-orange-800/40 px-2 py-0.5 rounded-md font-mono text-[10px] text-orange-300 font-bold">
                        <span>📍 GPS:</span>
                        <span>{formatGPS(fact.coords)}</span>
                      </div>

                      <p className="text-[10px] text-slate-400">📍 {fact.address}</p>
                      <div className="text-[9.5px] text-slate-300 bg-slate-900/80 p-1 rounded border border-slate-800 space-y-0.5">
                        <div><strong>Workforce:</strong> {fact.workforceSize}</div>
                        <div><strong>Products:</strong> {fact.products}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                    No major industrial manufacturing plant inside this residential/commercial zone.
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Registered Agents & Tellers from Source API */}
            {brgyInspectorTab === "agents" && (
              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1">
                {activeBarangayAgents.length > 0 && (
                  <div className="relative mb-1">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={brgyAgentSearch}
                      onChange={(e) => setBrgyAgentSearch(e.target.value)}
                      placeholder={`Search ${activeBarangayAgents.length} agents in Brgy. ${activeBarangayCircuit.name}...`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {activeBarangayAgentsFiltered.length > 0 ? (
                  activeBarangayAgentsFiltered.map((agent) => {
                    const tag = taggedAgentCoords[agent.id];
                    const isEditing = editingAgentId === agent.id;

                    return (
                      <div
                        key={agent.id}
                        className={`p-2.5 rounded-xl bg-slate-950 border transition space-y-1.5 ${isEditing
                          ? "border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg"
                          : tag
                            ? "border-emerald-500/60 bg-emerald-950/20"
                            : "border-slate-800 hover:border-slate-700"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${tag ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-slate-500"}`} />
                              <h4 className="font-bold text-white text-xs leading-tight">{agent.fullName}</h4>
                              <span className="text-[10px] text-slate-400 font-mono">@{agent.username}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium mt-0.5">
                              <Store size={11} className="shrink-0" />
                              <span className="truncate max-w-[200px]">Outlet: <strong>{agent.outlet || "Primary Station"}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {tag && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-700">
                                PLOTTED ON MAP
                              </span>
                            )}
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${agent.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                              {agent.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                        </div>

                        <div className="text-[9.5px] text-slate-300 bg-slate-900/80 p-1.5 rounded border border-slate-800 space-y-0.5">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Supervisor:</span>
                            <strong className="text-slate-200">{getSupervisorName(agent.supervisor)}</strong>
                          </div>
                          {agent.contactNumber && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Contact:</span>
                              <span className="font-mono text-emerald-300">{agent.contactNumber}</span>
                            </div>
                          )}
                          {agent.address && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Address:</span>
                              <span className="text-slate-300 truncate max-w-[190px]">{agent.address}</span>
                            </div>
                          )}
                        </div>

                        {/* ================= ROW-LEVEL COORDINATES DISPLAY OR INLINE EDITING ================= */}
                        {tag && !isEditing && (
                          <div className="mt-1.5 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-1">
                            <div className="flex items-center justify-between gap-1 flex-wrap">
                              <div className="flex items-center gap-1 font-mono text-[10.5px] font-bold text-emerald-300">
                                <MapPin size={11} className="text-emerald-400 shrink-0" />
                                <span>GPS: {formatGPS(tag.coords)}</span>
                              </div>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700/60">
                                ✓ {tag.detectedBarangayName}
                              </span>
                            </div>
                            {tag.notes && (
                              <p className="text-[9.5px] text-slate-300 italic">“{tag.notes}”</p>
                            )}
                            <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-900/40">
                              <button
                                type="button"
                                onClick={() => handleFocusPOI(tag.coords)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black transition cursor-pointer flex items-center gap-1"
                              >
                                <LocateFixed size={10} />
                                <span>Focus</span>
                              </button>
                              <a
                                href={`https://www.google.com/maps?q=${tag.coords[0]},${tag.coords[1]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 rounded bg-blue-600/40 hover:bg-blue-500 text-blue-200 hover:text-white text-[10px] font-bold transition flex items-center gap-1"
                              >
                                <ExternalLink size={10} />
                                <span>Google Maps ↗</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleStartEditAgentCoords(agent)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition cursor-pointer ml-auto"
                              >
                                Edit GPS
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAgentCoords(agent.id)}
                                className="p-1 rounded bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white text-[10px] transition cursor-pointer"
                                title="Remove Coordinates"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          </div>
                        )}

                        {isEditing && (
                          <div className="mt-1.5 p-2.5 rounded-xl bg-slate-900 border-2 border-emerald-500 shadow-xl space-y-2 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <MapPin size={12} />
                                <span>Tag Coordinates on Agent Row</span>
                              </span>
                              {clickedPoint && (
                                <button
                                  type="button"
                                  onClick={() => setInlineCoordForm((prev) => ({
                                    ...prev,
                                    latStr: clickedPoint.lat.toFixed(6),
                                    lngStr: clickedPoint.lng.toFixed(6)
                                  }))}
                                  className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 text-[9.5px] font-bold hover:bg-cyan-900 transition cursor-pointer flex items-center gap-1"
                                >
                                  <Crosshair size={10} />
                                  <span>Use Clicked Map Pin</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Latitude (°N)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 10.384250"
                                  value={inlineCoordForm.latStr}
                                  onChange={(e) => setInlineCoordForm({ ...inlineCoordForm, latStr: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                                  autoFocus
                                />
                              </div>
                              <div>
                                <label className="text-[9.5px] font-bold text-slate-400 block mb-0.5">Longitude (°E)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. 123.931330"
                                  value={inlineCoordForm.lngStr}
                                  onChange={(e) => setInlineCoordForm({ ...inlineCoordForm, lngStr: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            {/* Real-time Cadastral Barangay Detection Preview */}
                            {inlineDetectedBarangay ? (
                              <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/70 text-emerald-200 text-[10.5px] flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1 font-bold text-white">
                                  <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                                  <span>📍 Detected: Brgy. {inlineDetectedBarangay.name}</span>
                                </div>
                                <span className="text-[9px] font-mono text-emerald-300 bg-emerald-900 px-1.5 py-0.2 rounded">
                                  {inlineDetectedBarangay.confidence}
                                </span>
                              </div>
                            ) : (
                              (inlineCoordForm.latStr || inlineCoordForm.lngStr) && (
                                <div className="p-1 rounded-lg bg-amber-950/60 border border-amber-700 text-amber-300 text-[9.5px] flex items-center gap-1">
                                  <AlertTriangle size={11} className="shrink-0" />
                                  <span>Outside Mandaue City boundaries. Please check coordinates.</span>
                                </div>
                              )
                            )}

                            <div>
                              <input
                                type="text"
                                placeholder="Station notes / landmark (optional)..."
                                value={inlineCoordForm.notes}
                                onChange={(e) => setInlineCoordForm({ ...inlineCoordForm, notes: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-800">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingAgentId(null);
                                  setInlineCoordForm({ latStr: "", lngStr: "", notes: "" });
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveAgentCoords(agent)}
                                disabled={!inlineDetectedBarangay}
                                className={`px-3 py-1 rounded-lg text-[11px] font-black transition cursor-pointer flex items-center gap-1 shadow-md ${inlineDetectedBarangay
                                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40"
                                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
                                  }`}
                              >
                                <Check size={12} />
                                <span>Save &amp; Plot on Map</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {!tag && !isEditing && (
                          <div className="mt-1 flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-900/90 border border-dashed border-slate-800 text-xs">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin size={11} className="text-slate-600" />
                              <span>No coordinates tagged</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartEditAgentCoords(agent)}
                              className="px-2.5 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10.5px] font-black transition cursor-pointer flex items-center gap-1 shadow-xs"
                            >
                              <Plus size={11} />
                              <span>Add Coordinates</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                    {brgyAgentSearch ? "No agents match your search in this barangay." : "No registered agents found for this barangay in the source API."}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {/* City View Inspector Tabs: Circuit Waypoints vs Tagged Agent Outlets */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 shrink-0">
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCityInspectorTab("waypoint")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${cityInspectorTab === "waypoint"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  City Circuit
                </button>
                <button
                  type="button"
                  onClick={() => setCityInspectorTab("tagged_agents")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${cityInspectorTab === "tagged_agents"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                    }`}
                >
                  <MapPin size={12} className={cityInspectorTab === "tagged_agents" ? "text-white" : "text-emerald-400"} />
                  <span>Tagged Booths ({userTaggedBooths.length})</span>
                </button>
              </div>
            </div>

            {cityInspectorTab === "waypoint" ? (
              <>
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 inline-block mb-0.5">
                      City Edge Barangay {selectedEdgeBarangay.step} of 16
                    </span>
                    <h3 className="text-base font-black text-white leading-tight">
                      Brgy. {selectedEdgeBarangay.name}
                    </h3>
                    <p className="text-[10.5px] text-emerald-400 font-bold mt-0.5">
                      {selectedEdgeBarangay.edgeSector}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Operator</span>
                    <span className="text-xs font-mono font-black text-emerald-400">
                      Lucky Betplay
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Waypoint GPS:</span>
                    <button
                      type="button"
                      onClick={() => handleCopyGPS(selectedEdgeBarangay.coords, selectedEdgeBarangay.name)}
                      className="font-mono text-emerald-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      title="Click to copy GPS"
                    >
                      <span>{formatGPS(selectedEdgeBarangay.coords)}</span>
                      <Copy size={11} />
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Highway:</span>
                    <strong className="text-white text-right">{selectedEdgeBarangay.mainRoad}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bordering LGU:</span>
                    <strong className="text-rose-400 text-right">{selectedEdgeBarangay.bordersWith}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Registered Agents:</span>
                    <span className="font-bold text-emerald-400">{getAgentsForBarangayId(selectedEdgeBarangay.id).length} Tellers</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400">Google Maps:</span>
                    <a
                      href={`https://www.google.com/maps?q=${selectedEdgeBarangay.coords[0]},${selectedEdgeBarangay.coords[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Open Location</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectBarangayPerimeter(selectedEdgeBarangay.id)}
                  className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-cyan-900/30"
                >
                  <Route size={13} />
                  <span>Inspect Brgy. {selectedEdgeBarangay.name} (Boundary, Terminals &amp; Agents)</span>
                </button>
              </>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-[250px] pr-1">
                <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
                  <span className="text-[10.5px] font-bold text-slate-400">
                    {userTaggedBooths.length} User-Tagged Booths &amp; Outlets
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenBoothModal()}
                    className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={11} />
                    <span>Tag Booth</span>
                  </button>
                </div>

                {userTaggedBooths.length > 0 ? (
                  userTaggedBooths.map((booth) => (
                    <div
                      key={booth.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-amber-900/40 hover:border-amber-500/80 transition space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-2">
                          <KioskIconSvg width={26} height={34} className="shrink-0 drop-shadow-md" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                #{booth.name || "001"}
                              </span>
                              <h4 className="font-bold text-white text-xs leading-tight">
                                Booth {booth.name || "001"}
                              </h4>
                            </div>
                            <p className="text-[10px] text-amber-300 font-semibold mt-0.5">
                              📍 {booth.address}
                            </p>
                            <p className="text-[9.5px] text-slate-400">
                              Brgy. {booth.barangayName} • {booth.tellerName ? `Teller: ${booth.tellerName}` : "Outlet Station"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyGPS(booth.coords, booth.name)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Copy GPS"
                          >
                            <Copy size={11} />
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${booth.coords[0]},${booth.coords[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-md bg-blue-600/30 hover:bg-blue-500 text-blue-200 hover:text-white transition cursor-pointer"
                            title="Proceed to Google Maps"
                          >
                            <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleFocusPOI(booth.coords)}
                            className="px-1.5 py-0.5 rounded-lg bg-amber-600/30 hover:bg-amber-500 text-amber-200 hover:text-white text-[10px] font-bold transition cursor-pointer"
                          >
                            Focus
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (measuringSourceKiosk && String(measuringSourceKiosk.id) !== String(booth.id)) {
                                handleCompleteMeasurement(measuringSourceKiosk, booth);
                              } else {
                                startMeasuringFromKiosk(booth);
                                handleFocusPOI(booth.coords);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${measuringSourceKiosk?.id === booth.id
                                ? "bg-teal-500 text-white shadow-md animate-pulse"
                                : "bg-teal-600/30 hover:bg-teal-500 text-teal-200 hover:text-white"
                              }`}
                            title="Measure distance from this kiosk"
                          >
                            <Ruler size={10} />
                            <span>{measuringSourceKiosk?.id === booth.id ? "Point A" : "Measure"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditUserBooth(booth)}
                            className="p-1 rounded-md bg-cyan-950/60 hover:bg-cyan-600 text-cyan-300 hover:text-white transition cursor-pointer"
                            title="Edit Booth Details"
                          >
                            <Sliders size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUserBooth(booth.id)}
                            className="p-1 rounded-md bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
                            title="Remove Booth"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded-md font-mono text-[9.5px] text-amber-300 font-bold">
                        <span>GPS: {formatGPS(booth.coords)}</span>
                        <span className="text-[8.5px] text-amber-400 font-sans">✓ {booth.detectionConfidence}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs space-y-2">
                    <p>No booths tagged with coordinates yet.</p>
                    <button
                      type="button"
                      onClick={() => handleOpenBoothModal()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Tag First Booth</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ================= LIVE SOURCE API AGENTS DIRECTORY MODAL ================= */}
      {isAgentsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[88vh] bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner shrink-0">
                  <Users size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-white">
                      Source API Agents &amp; Tellers Directory
                    </h2>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live API Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Source: <code className="text-cyan-300 font-mono">stl-mandaue-api.com/api/accountant/teller</code></span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">{apiAgents.length} Registered Agents</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAgentsModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Toolbar: Search & Barangay Filters */}
            <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-900/50 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={agentsModalSearch}
                    onChange={(e) => setAgentsModalSearch(e.target.value)}
                    placeholder="Search by agent name, username, outlet, supervisor, or phone..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  {agentsModalSearch && (
                    <button
                      type="button"
                      onClick={() => setAgentsModalSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                  <span className="font-bold text-white">{filteredModalAgents.length}</span> agents shown
                </div>
              </div>

              {/* Barangay Filter Strip */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setAgentsModalBarangayFilter("all")}
                  className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer shrink-0 text-xs ${agentsModalBarangayFilter === "all"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                >
                  All ({apiAgents.length})
                </button>
                {ALL_27_BARANGAYS.map((b) => {
                  const count = getAgentsForBarangayId(b.id).length;
                  const isSel = agentsModalBarangayFilter === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setAgentsModalBarangayFilter(b.id)}
                      className={`px-2.5 py-1 rounded-xl font-medium transition cursor-pointer shrink-0 flex items-center gap-1.5 text-xs ${isSel
                        ? "bg-cyan-600 text-white shadow-sm font-bold"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                        }`}
                    >
                      <span>{b.name}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${isSel ? 'bg-cyan-900 text-cyan-200' : 'bg-slate-800 text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Body: Agent Cards Grid */}
            <div className="p-3 sm:p-5 overflow-y-auto flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredModalAgents.map((agent, idx) => {
                const bgyName = getBarangayNameFromApiId(agent.brgyId);
                const supName = getSupervisorName(agent.supervisor);
                const matchedBarangay = ALL_27_BARANGAYS.find(b => {
                  const validIds = BARANGAY_API_IDS[b.id] || [];
                  return validIds.includes(String(agent.brgyId));
                });

                return (
                  <div
                    key={agent.id || idx}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/60 transition flex flex-col justify-between gap-2 shadow-sm"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 border border-emerald-900/60 font-black text-xs flex items-center justify-center shrink-0">
                            {(agent.fullName || "A").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-extrabold text-white text-xs truncate leading-tight">
                              {agent.fullName}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono">@{agent.username}</p>
                          </div>
                        </div>

                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${agent.isActive ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                          {agent.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>

                      <div className="space-y-1 pt-1 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                          <Store size={12} className="shrink-0 text-emerald-400" />
                          <span className="truncate">Outlet: {agent.outlet || "Primary"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MapPin size={12} className="shrink-0 text-cyan-400" />
                          <span className="truncate">Barangay: <strong className="text-white">{bgyName}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Users size={12} className="shrink-0 text-amber-400" />
                          <span className="truncate">Supervisor: <strong className="text-slate-300">{supName}</strong></span>
                        </div>
                        {agent.contactNumber && (
                          <div className="flex items-center justify-between text-slate-400 pt-0.5">
                            <span className="flex items-center gap-1.5">
                              <Phone size={12} className="shrink-0 text-slate-400" />
                              <span className="font-mono text-emerald-300">{agent.contactNumber}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(agent.contactNumber);
                                setCopiedText(`Phone copied: ${agent.contactNumber}`);
                                setTimeout(() => setCopiedText(null), 2000);
                              }}
                              className="text-[10px] text-slate-400 hover:text-white"
                              title="Copy contact"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions & Tagged Coordinates Status */}
                    {taggedAgentCoords[agent.id] ? (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-mono text-emerald-300 bg-emerald-950/40 p-1.5 rounded border border-emerald-800/40">
                          <span className="flex items-center gap-1 font-bold">
                            <MapPin size={11} className="text-emerald-400" />
                            <span>{formatGPS(taggedAgentCoords[agent.id].coords)}</span>
                          </span>
                          <span className="text-[9px] text-emerald-400 font-sans">
                            ✓ {taggedAgentCoords[agent.id].detectedBarangayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAgentsModalOpen(false);
                              if (matchedBarangay) handleSelectBarangayPerimeter(matchedBarangay.id, "agents");
                              handleFocusPOI(taggedAgentCoords[agent.id].coords);
                            }}
                            className="flex-1 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <LocateFixed size={11} />
                            <span>Focus Pin</span>
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${taggedAgentCoords[agent.id].coords[0]},${taggedAgentCoords[agent.id].coords[1]}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-200 hover:text-white text-xs font-bold transition flex items-center justify-center"
                            title="Open Google Maps"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                        {matchedBarangay ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAgentsModalOpen(false);
                              handleSelectBarangayPerimeter(matchedBarangay.id, "agents");
                              setTimeout(() => handleStartEditAgentCoords(agent), 300);
                            }}
                            className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Plus size={12} />
                            <span>Add Coordinates on Row</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Mandaue City Territory</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredModalAgents.length === 0 && (
                <div className="col-span-full p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <p className="text-slate-400 text-xs">No agents found matching &quot;{agentsModalSearch}&quot; in this filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setAgentsModalSearch("");
                      setAgentsModalBarangayFilter("all");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-cyan-300 hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Showing <strong>{filteredModalAgents.length}</strong> of <strong>{apiAgents.length}</strong> registered agents across Mandaue City</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAgentsModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: TAG YELLOW BOOTH (COORDINATES, DETECT BARANGAY & BOOTH ADDRESS) ================= */}
      {isBoothModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl sm:max-w-3xl lg:max-w-3xl max-h-[92vh] flex flex-col bg-slate-900 border border-amber-500/50 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-amber-500/20">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center p-1 shadow-inner shrink-0">
                  <KioskIconSvg width={28} height={36} className="drop-shadow" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base flex items-center gap-2">
                    <span>{editingBoothId ? "Edit Yellow Booth" : "Tag New Yellow Booth"}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      YELLOW KIOSK
                    </span>
                  </h3>
                  <p className="text-slate-400 text-xs">
                    Input GPS coordinates, detect belonging barangay, and set booth address &amp; number
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBoothModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer border border-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveBoothModal} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Coordinates Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-white flex items-center gap-1.5">
                    <Crosshair size={13} className="text-emerald-400" />
                    <span>GPS Coordinates (WGS-84)</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  {clickedPoint && (
                    <button
                      type="button"
                      onClick={() => {
                        const lat = clickedPoint.lat.toFixed(6);
                        const lng = clickedPoint.lng.toFixed(6);
                        setBoothFormData((prev) => ({ ...prev, latStr: lat, lngStr: lng }));
                        const detected = detectBarangayFromCoords(lat, lng);
                        setDetectedBarangayResult(detected);
                        if (detected && !boothFormData.address) {
                          setBoothFormData((prev) => ({ ...prev, address: `Brgy. ${detected.name}, Mandaue City` }));
                        }
                      }}
                      className="text-[10px] font-bold text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Use Clicked Map Pin ({clickedPoint.lat.toFixed(4)}, {clickedPoint.lng.toFixed(4)})</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Latitude (e.g. 10.344000)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={boothFormData.latStr}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, latStr: e.target.value }))}
                      placeholder="10.344000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Longitude (e.g. 123.938000)</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={boothFormData.lngStr}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, lngStr: e.target.value }))}
                      placeholder="123.938000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Dedicated Detect Barangay Button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleDetectBarangay}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-cyan-950/40"
                  >
                    <MapPinned size={14} />
                    <span>Detect Barangay from Coordinates</span>
                  </button>
                </div>

                {/* Detected Barangay Feedback Banner */}
                {detectedBarangayResult && (
                  <div className={`p-3 rounded-xl border transition animate-in fade-in ${detectedBarangayResult.id === "outside"
                    ? "bg-rose-950/30 border-rose-800/60 text-rose-300"
                    : "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{detectedBarangayResult.id === "outside" ? "⚠️" : "📍"}</span>
                        <div>
                          <div className="text-xs font-black text-white">
                            {detectedBarangayResult.id === "outside" ? "Outside Mandaue City" : `Brgy. ${detectedBarangayResult.name}`}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">
                            {detectedBarangayResult.confidence}
                          </div>
                        </div>
                      </div>
                      {detectedBarangayResult.id !== "outside" && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          CONFIRMED BARANGAY
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      {detectedBarangayResult.detail}
                    </p>
                  </div>
                )}
              </div>

              {/* Booth Address & Outlet Name */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="text-xs font-black text-white flex items-center gap-1.5 mb-1">
                    <MapPin size={13} className="text-cyan-400" />
                    <span>Booth Address / Street Location</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={boothFormData.address}
                    onChange={(e) => setBoothFormData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="e.g. Lopez Jaena St. near Subangdaku Flyover, Mandaue City"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Specify the street name, corner, building, or landmark for field operations and dispatch.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black text-white flex items-center gap-1.5 mb-1">
                    <span className="text-amber-400">🟡</span>
                    <span>Booth Number / Outlet Code (Displayed on Top of Booth)</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={boothFormData.name}
                    onChange={(e) => setBoothFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. 001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    This badge code (e.g. <strong>001</strong>) floats directly on top of your yellow booth on the map.
                  </p>
                </div>
              </div>

              {/* Assigned Teller / Agent Selection with Smart Search & 1-to-1 Mapping */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-white flex items-center gap-1.5">
                    <Users size={13} className="text-blue-400" />
                    <span>Assign Agent / Teller (1:1 Booth Ratio)</span>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {availableAgents.length} available
                  </span>
                </div>

                {/* Active Selection Card if an agent is selected */}
                {selectedAgentObj ? (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-950 border border-blue-500/50 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300 font-black text-sm shadow-sm">
                          {selectedAgentObj.fullName?.charAt(0) || "A"}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-950 ${
                            checkAgentIsActive(selectedAgentObj) ? "bg-emerald-400" : "bg-slate-500"
                          }`}
                        ></span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white flex items-center gap-2 truncate flex-wrap">
                          <span className="truncate">{selectedAgentObj.fullName}</span>
                          <span className="text-[10px] text-blue-400 font-mono shrink-0">@{selectedAgentObj.username}</span>
                          {checkAgentIsActive(selectedAgentObj) ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                              Inactive
                            </span>
                          )}
                          <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
                            1:1 Assigned
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 truncate mt-0.5">
                          📍 {selectedAgentObj.outlet || "Outlet"} • Supervisor: {getSupervisorName(selectedAgentObj.supervisor)}
                        </div>
                        {selectedAgentObj.contactNumber && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            📞 {selectedAgentObj.contactNumber}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsAgentDropdownOpen((v) => !v)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-white text-[11px] font-bold transition cursor-pointer border border-slate-700"
                      >
                        {isAgentDropdownOpen ? "Close" : "Change Agent"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBoothFormData((prev) => ({
                            ...prev,
                            selectedAgentId: "",
                            tellerName: "",
                            supervisor: "",
                            contactNumber: ""
                          }));
                          setIsAgentDropdownOpen(false);
                          setAgentSearchQuery("");
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 transition cursor-pointer border border-slate-700"
                        title="Unassign Agent (Free up for other booths)"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* When no agent is currently selected */
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                      <span className="text-slate-300 font-bold">No agent assigned</span>
                      <span className="text-[10px] text-slate-500">(Generic Booth)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAgentDropdownOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-bold transition cursor-pointer border border-blue-500/40"
                    >
                      + Select Agent
                    </button>
                  </div>
                )}

                {/* Smart Search & Dropdown Picker */}
                {(!selectedAgentObj || isAgentDropdownOpen) && (
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 mt-1">
                    {/* Search Input Box */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={agentSearchQuery}
                        onChange={(e) => {
                          setAgentSearchQuery(e.target.value);
                          if (!isAgentDropdownOpen) setIsAgentDropdownOpen(true);
                        }}
                        onFocus={() => setIsAgentDropdownOpen(true)}
                        placeholder="Search agent by name, username, outlet, supervisor, or 'active'/'inactive'..."
                        className="w-full bg-slate-900 border border-slate-700/80 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
                      />
                      {agentSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAgentSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Quick Filter Status Tabs & Count */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAgentStatusFilter("all")}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer border ${
                            agentStatusFilter === "all"
                              ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          All ({availableAgents.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgentStatusFilter("active")}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                            agentStatusFilter === "active"
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-sm"
                              : "bg-slate-900 text-emerald-400 border-slate-800 hover:text-emerald-300"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Active ({activeAgentsCount})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAgentStatusFilter("inactive")}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                            agentStatusFilter === "inactive"
                              ? "bg-slate-700 text-white border-slate-600 shadow-sm"
                              : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-300"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                          <span>Inactive ({inactiveAgentsCount})</span>
                        </button>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        <span>
                          {agentSearchQuery.trim()
                            ? `Matching: ${filteredAvailableAgents.length}`
                            : `Available: ${filteredAvailableAgents.length}`}
                        </span>
                        <span className="text-emerald-400 font-bold">✓ 1-to-1</span>
                      </div>
                    </div>

                    {/* Scrollable List of Available Agents */}
                    <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                      {/* Option to clear / keep generic booth */}
                      <button
                        type="button"
                        onClick={() => {
                          setBoothFormData((prev) => ({
                            ...prev,
                            selectedAgentId: "",
                            tellerName: "",
                            supervisor: "",
                            contactNumber: ""
                          }));
                          setIsAgentDropdownOpen(false);
                          setAgentSearchQuery("");
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-white transition flex items-center gap-2 cursor-pointer"
                      >
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                        <span>-- No specific agent (Generic Booth) --</span>
                      </button>

                      {filteredAvailableAgents.length > 0 ? (
                        filteredAvailableAgents.map((ag) => {
                          const isSelected = String(boothFormData.selectedAgentId) === String(ag.id);
                          const isActive = checkAgentIsActive(ag);
                          return (
                            <button
                              type="button"
                              key={ag.id}
                              onClick={() => {
                                setBoothFormData((prev) => ({
                                  ...prev,
                                  selectedAgentId: ag.id,
                                  tellerName: ag.fullName,
                                  supervisor: getSupervisorName(ag.supervisor),
                                  contactNumber: ag.contactNumber || prev.contactNumber,
                                  address: prev.address || ag.address || "",
                                  name: prev.name || ag.outlet || `${ag.fullName} Station`
                                }));
                                setIsAgentDropdownOpen(false);
                                setAgentSearchQuery("");
                              }}
                              className={`w-full text-left p-2.5 sm:p-3 rounded-xl transition flex items-center justify-between gap-3 border cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600/25 border-blue-500 text-white shadow-sm"
                                  : "bg-slate-900/80 hover:bg-slate-900 border-slate-800/80 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative shrink-0">
                                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-200 font-bold text-xs shadow-sm">
                                    {ag.fullName?.charAt(0) || "A"}
                                  </div>
                                  <span
                                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                                      isActive ? "bg-emerald-400 ring-2 ring-emerald-500/30" : "bg-slate-500"
                                    }`}
                                  ></span>
                                </div>

                                <div className="min-w-0">
                                  <div className="font-bold text-xs text-white flex items-center gap-2 truncate flex-wrap">
                                    <span className="truncate">{ag.fullName}</span>
                                    <span className="text-[10px] text-blue-400 font-mono">@{ag.username}</span>

                                    {/* Prominent Active / Inactive Badge */}
                                    {isActive ? (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        Active
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                                        Inactive
                                      </span>
                                    )}

                                    {isSelected && (
                                      <span className="px-1.5 py-0.2 rounded bg-blue-500 text-[9px] text-white font-bold shrink-0">
                                        Selected
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span>📍 {ag.outlet || "Outlet"}</span>
                                    <span className="text-slate-600">•</span>
                                    <span>Spvr: {getSupervisorName(ag.supervisor)}</span>
                                    {ag.contactNumber && (
                                      <>
                                        <span className="text-slate-600">•</span>
                                        <span className="font-mono text-slate-400">📞 {ag.contactNumber}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  Available (1:1)
                                </span>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                          {availableAgents.length === 0
                            ? "All registered agents are currently assigned to other booths (1:1 full)."
                            : `No ${agentStatusFilter !== "all" ? agentStatusFilter : "unassigned"} agent found matching "${agentSearchQuery}".`}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Teller Name</label>
                    <input
                      type="text"
                      value={boothFormData.tellerName}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, tellerName: e.target.value }))}
                      placeholder="Teller / Operator"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Supervisor</label>
                    <input
                      type="text"
                      value={boothFormData.supervisor}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, supervisor: e.target.value }))}
                      placeholder="Area Supervisor"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Contact Number</label>
                    <input
                      type="text"
                      value={boothFormData.contactNumber}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, contactNumber: e.target.value }))}
                      placeholder="0917-xxx-xxxx"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Operating Hours / Notes</label>
                    <input
                      type="text"
                      value={boothFormData.notes}
                      onChange={(e) => setBoothFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="8:00 AM - 9:00 PM Daily"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBoothModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
                >
                  <Check size={14} />
                  <span>Save &amp; Plot Yellow Booth on Map</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= KIOSK DISTANCE & AGENT GROSS MODAL ================= */}
      {isDistanceModalOpen && measuredPair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-teal-500/50 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center shadow-lg shrink-0">
                  <Ruler size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Yesterday's Gross Performance ({getYesterdayDates().displayLabel})
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Territory Proximity Analyzer
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white leading-tight">
                    Kiosk Distance &amp; Yesterday's Gross Sales
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDistanceModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close Modal (Keeps measurement line on map)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* 1. HERO DISTANCE BANNER */}
              <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-teal-950/60 via-slate-900 to-slate-950 border border-teal-500/40 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-teal-400">
                      Direct Geodesic Distance
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                        {measuredPair.distanceMeters >= 1000
                          ? `${(measuredPair.distanceMeters / 1000).toFixed(2)} km`
                          : `${Math.round(measuredPair.distanceMeters)} meters`}
                      </span>
                      <span className="text-sm font-mono text-teal-300/80 font-bold">
                        ({Math.round(measuredPair.distanceMeters).toLocaleString()} m)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      From <strong>Booth {measuredPair.source?.name}</strong> (Brgy. {measuredPair.source?.barangayName}) to <strong>Booth {measuredPair.target?.name}</strong> (Brgy. {measuredPair.target?.barangayName})
                    </p>
                  </div>

                  {/* Estimated Travel Times */}
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 font-bold">🚶 Walking</div>
                      <div className="text-xs font-mono font-black text-white mt-0.5">
                        ~{Math.max(1, Math.round(measuredPair.distanceMeters / 80))} min
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 font-bold">🛵 Motorcycle</div>
                      <div className="text-xs font-mono font-black text-teal-300 mt-0.5">
                        ~{Math.max(1, Math.round(measuredPair.distanceMeters / 400))} min
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-w-[70px]">
                      <div className="text-[10px] text-slate-400 font-bold">🚗 Driving</div>
                      <div className="text-xs font-mono font-black text-cyan-300 mt-0.5">
                        ~{Math.max(1, Math.round(measuredPair.distanceMeters / 300))} min
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spacing Assessment */}
                <div className="mt-4 pt-3 border-t border-teal-900/40 flex items-center gap-2 text-xs">
                  {measuredPair.distanceMeters < 250 ? (
                    <div className="flex items-center gap-2 text-amber-300">
                      <AlertTriangle size={15} className="shrink-0" />
                      <span><strong>Spacing Alert:</strong> Less than 250m apart. Potential territory cannibalization of foot traffic between the two kiosks.</span>
                    </div>
                  ) : measuredPair.distanceMeters <= 1500 ? (
                    <div className="flex items-center gap-2 text-emerald-300">
                      <CheckCircle2 size={15} className="shrink-0" />
                      <span><strong>Ideal Territory Spacing:</strong> 250m to 1.5km separation — optimal strategic coverage for this sector.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sky-300">
                      <Info size={15} className="shrink-0" />
                      <span><strong>Wide Spacing:</strong> Greater than 1.5km separation — sufficient room between kiosks for potential additional placement if bettor volume is high.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. SIDE-BY-SIDE KIOSK & ASSIGNED AGENT GROSS COMPARISON */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* KIOSK 1: SOURCE */}
                {(() => {
                  const s = measuredPair.source;
                  const g = getBoothAgentGross(s);
                  return (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 flex flex-col justify-between gap-3 shadow-md">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span>Source Kiosk (Point A)</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {s.id}
                          </span>
                        </div>

                        {/* Booth Identity */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-12 shrink-0">
                            <KioskIconSvg width={40} height={48} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white leading-tight">
                              Booth {s.name}
                            </h4>
                            <div className="text-xs text-emerald-400 font-bold mt-0.5">
                              Brgy. {s.barangayName || "Mandaue City"}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              📍 {s.address || `Brgy. ${s.barangayName}`}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {formatGPS(s.coords)}
                            </div>
                          </div>
                        </div>

                        {/* Agent Information Card */}
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            <span>Assigned Agent / Teller</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-emerald-300">
                              {g.agentStatus}
                            </span>
                          </div>
                          <div className="text-sm font-black text-white">
                            {g.agentName}
                          </div>
                          {g.agentUsername && (
                            <div className="text-xs text-cyan-400 font-mono">
                              @{g.agentUsername}
                            </div>
                          )}
                          <div className="text-xs text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-slate-400">Supervisor:</span>
                            <span className="font-bold text-white">{g.supervisor}</span>
                          </div>
                          <div className="text-xs text-slate-300 flex items-center justify-between">
                            <span className="text-slate-400">Contact:</span>
                            <span className="font-mono text-slate-200">{g.contactNumber}</span>
                          </div>
                        </div>

                        {/* HIGHLIGHTED YESTERDAY'S GROSS SALES */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/50 shadow-inner">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                              <CircleDollarSign size={13} />
                              <span>Yesterday's Gross Sales</span>
                            </span>
                            <span className="text-[10px] font-bold text-emerald-400">
                              {g.hasRecord ? "✓ Verified Draw" : (g.gross > 0 ? "Synced" : "₱0.00 / No Sales")}
                            </span>
                          </div>
                          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight mt-1">
                            {g.formatted}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Verified gross sales recorded for yesterday ({g.yesterdayDate})
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* KIOSK 2: TARGET */}
                {(() => {
                  const t = measuredPair.target;
                  const g = getBoothAgentGross(t);
                  return (
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border-2 border-cyan-500/40 flex flex-col justify-between gap-3 shadow-md">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            <span>Destination Kiosk (Point B)</span>
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ID: {t.id}
                          </span>
                        </div>

                        {/* Booth Identity */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-12 shrink-0">
                            <KioskIconSvg width={40} height={48} />
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white leading-tight">
                              Booth {t.name}
                            </h4>
                            <div className="text-xs text-cyan-400 font-bold mt-0.5">
                              Brgy. {t.barangayName || "Mandaue City"}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              📍 {t.address || `Brgy. ${t.barangayName}`}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {formatGPS(t.coords)}
                            </div>
                          </div>
                        </div>

                        {/* Agent Information Card */}
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            <span>Assigned Agent / Teller</span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-cyan-300">
                              {g.agentStatus}
                            </span>
                          </div>
                          <div className="text-sm font-black text-white">
                            {g.agentName}
                          </div>
                          {g.agentUsername && (
                            <div className="text-xs text-cyan-400 font-mono">
                              @{g.agentUsername}
                            </div>
                          )}
                          <div className="text-xs text-slate-300 flex items-center justify-between pt-1 border-t border-slate-800/80">
                            <span className="text-slate-400">Supervisor:</span>
                            <span className="font-bold text-white">{g.supervisor}</span>
                          </div>
                          <div className="text-xs text-slate-300 flex items-center justify-between">
                            <span className="text-slate-400">Contact:</span>
                            <span className="font-mono text-slate-200">{g.contactNumber}</span>
                          </div>
                        </div>

                        {/* HIGHLIGHTED YESTERDAY'S GROSS SALES */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/80 to-slate-900 border border-cyan-500/50 shadow-inner">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                              <CircleDollarSign size={13} />
                              <span>Yesterday's Gross Sales</span>
                            </span>
                            <span className="text-[10px] font-bold text-cyan-400">
                              {g.hasRecord ? "✓ Verified Draw" : (g.gross > 0 ? "Synced" : "₱0.00 / No Sales")}
                            </span>
                          </div>
                          <div className="text-2xl font-black text-cyan-400 font-mono tracking-tight mt-1">
                            {g.formatted}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Verified gross sales recorded for yesterday ({g.yesterdayDate})
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 3. COMBINED TOTALS & FINANCIAL SUMMARY */}
              {(() => {
                const sGross = getBoothAgentGross(measuredPair.source).gross;
                const tGross = getBoothAgentGross(measuredPair.target).gross;
                const combinedGross = sGross + tGross;
                const grossDiff = Math.abs(sGross - tGross);
                const formatCur = (n) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);

                return (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded-xl bg-slate-900/60">
                      <div className="text-[10px] font-black uppercase text-slate-400">Combined Yesterday's Gross</div>
                      <div className="text-lg font-black text-emerald-400 font-mono mt-1">{formatCur(combinedGross)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60">
                      <div className="text-[10px] font-black uppercase text-slate-400">Yesterday's Sales Variance</div>
                      <div className="text-lg font-black text-amber-300 font-mono mt-1">{formatCur(grossDiff)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60">
                      <div className="text-[10px] font-black uppercase text-slate-400">Average Yesterday's Gross</div>
                      <div className="text-lg font-black text-cyan-300 font-mono mt-1">{formatCur(combinedGross / 2)}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${measuredPair.source?.coords?.[0]},${measuredPair.source?.coords?.[1]}&destination=${measuredPair.target?.coords?.[0]},${measuredPair.target?.coords?.[1]}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
              >
                <span>Google Maps Route</span>
                <span>↗</span>
              </a>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    handleClearMeasurement();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 font-bold text-xs transition cursor-pointer border border-slate-700"
                >
                  Clear Line
                </button>
                <button
                  type="button"
                  onClick={() => setIsDistanceModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-teal-950/40"
                >
                  <span>View on Map</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
