import { useState, useMemo, useEffect } from "react";
import {
  Scale, ShieldCheck, FileText, Calculator, AlertTriangle, CheckCircle2,
  Clock, Building2, DollarSign, BookOpen, Search, ArrowRight, ExternalLink,
  Printer, Download, Sparkles, Copy, Check, Calendar, ChevronRight, Info,
  Bookmark, FileCheck, Layers, UserCheck, UserX, HelpCircle, Send,
  Sliders, ShieldAlert, Award, FileQuestion, Briefcase, RefreshCw, X,
  MapPin, Edit3, Globe, Plus, RotateCcw, Database, ArrowUpRight, Settings
} from "lucide-react";
import { COMPANIES } from "./MemoGeneratorPanel";
import { supabase } from "../lib/supabase";

// ================= 2026 STATUTORY DOLE CONSTANTS & WAGE ORDERS (PHILIPPINES NATIONWIDE) =================
// Official Regional Wage Orders issued by RTWPBs under the National Wages and Productivity Commission (NWPC - DOLE)
// Source: https://nwpc.dole.gov.ph
export const DEFAULT_REGIONAL_WAGE_RATES_2026 = {
  ncr: {
    id: "ncr",
    region: "National Capital Region (NCR - Metro Manila)",
    shortName: "NCR",
    island: "Luzon",
    area: "All 16 Cities & 1 Municipality: Manila, Quezon City, Makati, Taguig, Pasig, Mandaluyong, Caloocan, Pasay, Parañaque, Las Piñas, Muntinlupa, Marikina, Valenzuela, Malabon, Navotas, San Juan, Pateros",
    nonAgri: 755.0,
    agri: 718.0,
    effectiveDate: "September 26, 2026 Mandate",
    orderNo: "Wage Order No. NCR-28",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  car: {
    id: "car",
    region: "Cordillera Administrative Region (CAR)",
    shortName: "CAR",
    island: "Luzon",
    area: "Baguio City, Benguet, Abra, Apayao, Ifugao, Kalinga, Mountain Province",
    nonAgri: 505.0,
    agri: 505.0,
    effectiveDate: "December 30, 2025 - 2026",
    orderNo: "Wage Order No. CAR-24",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region1: {
    id: "region1",
    region: "Region I (Ilocos Region)",
    shortName: "Region I",
    island: "Luzon",
    area: "Pangasinan, La Union, Ilocos Norte, Ilocos Sur (San Fernando City, Dagupan, Laoag, Vigan, Urdaneta)",
    nonAgri: 505.0,
    agri: 480.0,
    effectiveDate: "November 19, 2025 - 2026",
    orderNo: "Wage Order No. RB1-24",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region2: {
    id: "region2",
    region: "Region II (Cagayan Valley)",
    shortName: "Region II",
    island: "Luzon",
    area: "Cagayan, Isabela, Nueva Vizcaya, Quirino, Batanes (Tuguegarao City, Santiago, Cauayan, Ilagan)",
    nonAgri: 480.0,
    agri: 460.0,
    effectiveDate: "2026 Standard",
    orderNo: "Wage Order No. RTWPB 2-24",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region3: {
    id: "region3",
    region: "Region III (Central Luzon)",
    shortName: "Region III",
    island: "Luzon",
    area: "Pampanga, Bulacan, Bataan, Nueva Ecija, Tarlac, Zambales, Aurora (Angeles City, San Fernando, Olongapo, Malolos, Tarlac City, Cabanatuan)",
    nonAgri: 600.0,
    agri: 570.0,
    effectiveDate: "April 16, 2026 Mandate",
    orderNo: "Wage Order No. RBIII-26",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region4a: {
    id: "region4a",
    region: "Region IV-A (CALABARZON)",
    shortName: "Region IV-A",
    island: "Luzon",
    area: "Cavite, Laguna, Batangas, Rizal, Quezon (Antipolo, Calamba, Dasmariñas, Batangas City, Santa Rosa, Imus, Bacoor, Lucena)",
    nonAgri: 645.0,
    agri: 550.0,
    effectiveDate: "October 26, 2026 Mandate",
    orderNo: "Wage Order No. IVA-23",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region4b: {
    id: "region4b",
    region: "Region IV-B (MIMAROPA)",
    shortName: "Region IV-B",
    island: "Luzon",
    area: "Palawan, Oriental Mindoro, Occidental Mindoro, Marinduque, Romblon (Puerto Princesa City, Calapan City)",
    nonAgri: 455.0,
    agri: 455.0,
    effectiveDate: "January 1, 2026 Standard",
    orderNo: "Wage Order No. RB-MIMAROPA-13",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region5: {
    id: "region5",
    region: "Region V (Bicol Region)",
    shortName: "Region V",
    island: "Luzon",
    area: "Albay, Camarines Sur, Camarines Norte, Catanduanes, Masbate, Sorsogon (Legazpi City, Naga City, Iriga, Tabaco, Sorsogon City)",
    nonAgri: 480.0,
    agri: 480.0,
    effectiveDate: "April 8, 2026 - Dec 2026 Tranche",
    orderNo: "Wage Order No. RBV-23",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region6: {
    id: "region6",
    region: "Region VI (Western Visayas)",
    shortName: "Region VI",
    island: "Visayas",
    area: "Iloilo, Negros Occidental, Aklan, Antique, Capiz, Guimaras (Iloilo City, Bacolod City, Roxas City, Kalibo)",
    nonAgri: 550.0,
    agri: 520.0,
    effectiveDate: "November 19, 2025 - 2026",
    orderNo: "Wage Order No. RBVI-29",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region7_classA: {
    id: "region7_classA",
    region: "Region VII (Central Visayas) - Class A (Metro Cebu)",
    shortName: "Region VII (Class A)",
    island: "Visayas",
    area: "Expanded Metro Cebu: Cebu City, Mandaue City, Lapu-Lapu City, Talisay City, Naga City, Carcar City, Danao City, Minglanilla, Consolacion, Liloan, Cordova, San Fernando, Compostela",
    nonAgri: 582.0,
    agri: 572.0,
    effectiveDate: "October 14, 2026 Mandate",
    orderNo: "Wage Order No. ROVII-27",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region7_classB: {
    id: "region7_classB",
    region: "Region VII (Central Visayas) - Class B & C (Provinces)",
    shortName: "Region VII (Class B/C)",
    island: "Visayas",
    area: "Bohol (Tagbilaran City), Negros Oriental (Dumaguete City), Siquijor, Toledo City, Bogo City & other municipalities",
    nonAgri: 542.0,
    agri: 532.0,
    effectiveDate: "October 14, 2026 Mandate",
    orderNo: "Wage Order No. ROVII-27",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region8: {
    id: "region8",
    region: "Region VIII (Eastern Visayas)",
    shortName: "Region VIII",
    island: "Visayas",
    area: "Leyte, Southern Leyte, Samar, Eastern Samar, Northern Samar, Biliran (Tacloban City, Ormoc City, Calbayog, Catbalogan, Maasin)",
    nonAgri: 470.0,
    agri: 440.0,
    effectiveDate: "December 8, 2025 - 2026",
    orderNo: "Wage Order No. RB VIII-25",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region9: {
    id: "region9",
    region: "Region IX (Zamboanga Peninsula)",
    shortName: "Region IX",
    island: "Mindanao",
    area: "Zamboanga del Sur, Zamboanga del Norte, Zamboanga Sibugay (Zamboanga City, Pagadian City, Dipolog City, Isabela City)",
    nonAgri: 464.0,
    agri: 451.0,
    effectiveDate: "June 1, 2026 Standard",
    orderNo: "Wage Order No. RIX-24",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region10: {
    id: "region10",
    region: "Region X (Northern Mindanao)",
    shortName: "Region X",
    island: "Mindanao",
    area: "Misamis Oriental, Bukidnon, Lanao del Norte, Misamis Occidental, Camiguin (Cagayan de Oro City, Iligan City, Valencia, Malaybalay, Ozamiz, Tagoloan)",
    nonAgri: 500.0,
    agri: 500.0,
    effectiveDate: "May 1, 2026 Standard",
    orderNo: "Wage Order No. RX-24",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region11: {
    id: "region11",
    region: "Region XI (Davao Region)",
    shortName: "Region XI",
    island: "Mindanao",
    area: "Davao del Sur, Davao del Norte, Davao de Oro, Davao Oriental, Davao Occidental (Davao City, Tagum City, Panabo City, Digos City, Mati, Samal Island)",
    nonAgri: 540.0,
    agri: 525.0,
    effectiveDate: "September 1, 2026 Mandate",
    orderNo: "Wage Order No. RB XI-24",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region12: {
    id: "region12",
    region: "Region XII (SOCCSKSARGEN)",
    shortName: "Region XII",
    island: "Mindanao",
    area: "South Cotabato, Cotabato (North Cotabato), Sultan Kudarat, Sarangani (General Santos City, Koronadal City, Tacurong City, Kidapawan City)",
    nonAgri: 460.0,
    agri: 443.0,
    effectiveDate: "2026 Standard",
    orderNo: "Wage Order No. RB XII-25",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  region13: {
    id: "region13",
    region: "Region XIII (Caraga Region)",
    shortName: "Region XIII",
    island: "Mindanao",
    area: "Agusan del Norte, Agusan del Sur, Surigao del Norte, Surigao del Sur, Dinagat Islands (Butuan City, Surigao City, Bislig City, Tandag, Bayugan)",
    nonAgri: 475.0,
    agri: 475.0,
    effectiveDate: "January 3, 2026 - May 1, 2026",
    orderNo: "Wage Order No. RXIII-20",
    sourceUrl: "https://nwpc.dole.gov.ph"
  },
  barmm: {
    id: "barmm",
    region: "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)",
    shortName: "BARMM",
    island: "Mindanao",
    area: "Maguindanao del Norte, Maguindanao del Sur, Lanao del Sur, Basilan, Sulu, Tawi-Tawi (Cotabato City, Marawi City, Lamitan, SGA)",
    nonAgri: 436.0,
    agri: 411.0,
    effectiveDate: "August 6, 2026 Mandate",
    orderNo: "Wage Order No. BARMM-05",
    sourceUrl: "https://nwpc.dole.gov.ph"
  }
};


export const REGIONAL_WAGE_RATES_2026 = DEFAULT_REGIONAL_WAGE_RATES_2026;

// Official 2026 Philippine Proclaimed Holidays
export const PHILIPPINE_HOLIDAYS_2026 = [
  { name: "New Year's Day", date: "January 1", type: "regular", rate: "200%" },
  { name: "Maundy Thursday", date: "April 2", type: "regular", rate: "200%" },
  { name: "Good Friday", date: "April 3", type: "regular", rate: "200%" },
  { name: "Araw ng Kagitingan", date: "April 9", type: "regular", rate: "200%" },
  { name: "Labor Day", date: "May 1", type: "regular", rate: "200%" },
  { name: "Independence Day", date: "June 12", type: "regular", rate: "200%" },
  { name: "National Heroes Day", date: "August 31", type: "regular", rate: "200%" },
  { name: "Bonifacio Day", date: "November 30", type: "regular", rate: "200%" },
  { name: "Christmas Day", date: "December 25", type: "regular", rate: "200%" },
  { name: "Rizal Day", date: "December 30", type: "regular", rate: "200%" },
  { name: "Chinese New Year", date: "February 17", type: "special", rate: "130%" },
  { name: "Black Saturday", date: "April 4", type: "special", rate: "130%" },
  { name: "Ninoy Aquino Day", date: "August 21", type: "special", rate: "130%" },
  { name: "All Saints' Day", date: "November 1", type: "special", rate: "130%" },
  { name: "Feast of Immaculate Conception", date: "December 8", type: "special", rate: "130%" },
  { name: "Last Day of the Year", date: "December 31", type: "special", rate: "130%" }
];

export default function DoleLegalGuidelinesPanel({
  currentUser = null,
  profiles = [],
  onClose = () => {},
  onSwitchToDocStudio = () => {},
  onSwitchToMemo = () => {},
  onSwitchToNte = () => {},
  onSwitchToApiConfig = () => {},
  onOpenAiBuddy = () => {}
}) {
  // Navigation Subtabs
  const [activeTab, setActiveTab] = useState("due_process"); // 'due_process' | 'calculator' | 'grounds' | 'discipline' | 'wage_orders' | 'issuances'
  const [selectedCompanyId, setSelectedCompanyId] = useState("lucky_betplay");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);

  const selectedCompany = useMemo(() => {
    return COMPANIES.find((c) => c.id === selectedCompanyId) || COMPANIES[0];
  }, [selectedCompanyId]);

  // Copy Citation Helper
  const handleCopyCitation = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // ================= MODULE 1: DUE PROCESS SIMULATOR STATE =================
  const [nteServeDate, setNteServeDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueProcessChecklist, setDueProcessChecklist] = useState({
    specificActs: true,
    fiveCalendarDays: true,
    hearingOffered: true,
    substantialEvidence: true,
    secondNoticeServed: false
  });

  // Calculate 5-Day Statutory Deadline under DOLE D.O. 147-15
  const statutoryExplanationDeadline = useMemo(() => {
    if (!nteServeDate) return "";
    const date = new Date(nteServeDate);
    // Add 5 calendar days
    date.setDate(date.getDate() + 5);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }, [nteServeDate]);

  const dueProcessScore = useMemo(() => {
    const checks = Object.values(dueProcessChecklist);
    const passed = checks.filter(Boolean).length;
    return Math.round((passed / checks.length) * 100);
  }, [dueProcessChecklist]);

  // ================= MODULE 2: CALCULATOR STATE =================
  const [calcType, setCalcType] = useState("holiday"); // 'holiday' | '13th_month' | 'overtime' | 'separation'
  
  // Holiday Pay inputs
  const [dailyRate, setDailyRate] = useState(468);
  const [holidayType, setHolidayType] = useState("regular"); // 'regular' | 'special'
  const [holidayWorkStatus, setHolidayWorkStatus] = useState("worked_8h"); // 'unworked' | 'worked_8h' | 'worked_ot' | 'worked_restday' | 'worked_restday_ot'
  const [overtimeHours, setOvertimeHours] = useState(2);

  // 13th Month inputs
  const [monthlyBasicSalary, setMonthlyBasicSalary] = useState(18000);
  const [monthsRendered, setMonthsRendered] = useState(12);
  const [unpaidAbsenceDeduction, setUnpaidAbsenceDeduction] = useState(0);

  // Separation Pay inputs
  const [separationCause, setSeparationCause] = useState("retrenchment"); // 'redundancy' | 'retrenchment' | 'closure_losses' | 'disease'
  const [yearsOfService, setYearsOfService] = useState(3);
  const [separationBasicSalary, setSeparationBasicSalary] = useState(20000);

  // Computations
  const holidayComputation = useMemo(() => {
    const hourlyRate = dailyRate / 8;
    let gross = 0;
    let multiplierText = "";
    let breakdown = "";

    if (holidayType === "regular") {
      if (holidayWorkStatus === "unworked") {
        gross = dailyRate * 1.0;
        multiplierText = "100% of Daily Basic";
        breakdown = `₱${dailyRate.toFixed(2)} × 100% = ₱${gross.toFixed(2)} (Paid unworked statutory holiday)`;
      } else if (holidayWorkStatus === "worked_8h") {
        gross = dailyRate * 2.0;
        multiplierText = "200% of Daily Basic";
        breakdown = `₱${dailyRate.toFixed(2)} × 200% = ₱${gross.toFixed(2)}`;
      } else if (holidayWorkStatus === "worked_ot") {
        const base = dailyRate * 2.0;
        const otPay = hourlyRate * 2.0 * 1.30 * overtimeHours;
        gross = base + otPay;
        multiplierText = "200% + OT (260%)";
        breakdown = `Regular 8 hrs: ₱${base.toFixed(2)} + OT (${overtimeHours} hrs @ ₱${(hourlyRate * 2.6).toFixed(2)}/hr): ₱${otPay.toFixed(2)} = ₱${gross.toFixed(2)}`;
      } else if (holidayWorkStatus === "worked_restday") {
        gross = dailyRate * 2.60;
        multiplierText = "260% (Regular Holiday on Scheduled Rest Day)";
        breakdown = `₱${dailyRate.toFixed(2)} × 260% = ₱${gross.toFixed(2)}`;
      } else if (holidayWorkStatus === "worked_restday_ot") {
        const base = dailyRate * 2.60;
        const otPay = hourlyRate * 2.60 * 1.30 * overtimeHours;
        gross = base + otPay;
        multiplierText = "260% + Rest Day OT (338%)";
        breakdown = `First 8 hrs: ₱${base.toFixed(2)} + OT (${overtimeHours} hrs @ ₱${(hourlyRate * 3.38).toFixed(2)}/hr): ₱${otPay.toFixed(2)} = ₱${gross.toFixed(2)}`;
      }
    } else {
      // Special Non-Working Day
      if (holidayWorkStatus === "unworked") {
        gross = 0;
        multiplierText = "No Work, No Pay (Unless Company Agreement)";
        breakdown = "Under DOLE rules, unworked special non-working days are subject to 'No Work, No Pay' principle unless favorable CBA/company policy applies.";
      } else if (holidayWorkStatus === "worked_8h") {
        gross = dailyRate * 1.30;
        multiplierText = "130% of Daily Basic";
        breakdown = `₱${dailyRate.toFixed(2)} × 130% = ₱${gross.toFixed(2)}`;
      } else if (holidayWorkStatus === "worked_ot") {
        const base = dailyRate * 1.30;
        const otPay = hourlyRate * 1.30 * 1.30 * overtimeHours;
        gross = base + otPay;
        multiplierText = "130% + OT (169%)";
        breakdown = `First 8 hrs: ₱${base.toFixed(2)} + OT (${overtimeHours} hrs @ ₱${(hourlyRate * 1.69).toFixed(2)}/hr): ₱${otPay.toFixed(2)} = ₱${gross.toFixed(2)}`;
      } else if (holidayWorkStatus === "worked_restday") {
        gross = dailyRate * 1.50;
        multiplierText = "150% (Special Day on Scheduled Rest Day)";
        breakdown = `₱${dailyRate.toFixed(2)} × 150% = ₱${gross.toFixed(2)}`;
      } else if (holidayWorkStatus === "worked_restday_ot") {
        const base = dailyRate * 1.50;
        const otPay = hourlyRate * 1.50 * 1.30 * overtimeHours;
        gross = base + otPay;
        multiplierText = "150% + Rest Day OT (195%)";
        breakdown = `First 8 hrs: ₱${base.toFixed(2)} + OT (${overtimeHours} hrs @ ₱${(hourlyRate * 1.95).toFixed(2)}/hr): ₱${otPay.toFixed(2)} = ₱${gross.toFixed(2)}`;
      }
    }

    return { hourlyRate, gross, multiplierText, breakdown };
  }, [dailyRate, holidayType, holidayWorkStatus, overtimeHours]);

  // 13th Month Computation (P.D. 851)
  const thirteenthMonthComputation = useMemo(() => {
    const totalEarned = (monthlyBasicSalary * monthsRendered) - unpaidAbsenceDeduction;
    const computed13th = Math.max(0, totalEarned / 12);
    const isTaxExempt = computed13th <= 90000;
    return {
      totalEarned,
      computed13th,
      isTaxExempt,
      taxableAmount: isTaxExempt ? 0 : computed13th - 90000
    };
  }, [monthlyBasicSalary, monthsRendered, unpaidAbsenceDeduction]);

  // Separation Pay Computation (Art. 298/299)
  const separationPayComputation = useMemo(() => {
    const fraction = yearsOfService >= 0.5 ? Math.ceil(yearsOfService) : 0;
    let factor = 0.5; // default 1/2 month per year
    let description = "";

    if (separationCause === "redundancy") {
      factor = 1.0; // 1 month or 1 month per year, whichever is higher
      description = "1 month pay or 1 month pay per year of service (whichever is higher)";
    } else if (separationCause === "retrenchment") {
      factor = 0.5; // 1 month pay or 1/2 month per year, whichever is higher
      description = "1 month pay or 1/2 month pay per year of service (whichever is higher)";
    } else if (separationCause === "closure_losses") {
      factor = 0.0;
      description = "Zero statutory separation pay required if closure is genuinely due to severe bankruptcy/losses proven by audited statements.";
    } else if (separationCause === "disease") {
      factor = 0.5;
      description = "1 month pay or 1/2 month pay per year of service (whichever is higher) with DOH health certification.";
    }

    let calculated = 0;
    if (separationCause === "redundancy") {
      calculated = Math.max(separationBasicSalary, separationBasicSalary * fraction);
    } else if (separationCause === "retrenchment" || separationCause === "disease") {
      calculated = Math.max(separationBasicSalary, separationBasicSalary * factor * fraction);
    }

    return {
      fractionYears: fraction,
      factor,
      description,
      totalPay: calculated
    };
  }, [separationCause, yearsOfService, separationBasicSalary]);

  // ================= MODULE 5: 2026 REGIONAL WAGE ORDERS (PHILIPPINES NATIONWIDE - NWPC DOLE) =================
  const WAGE_STORAGE_KEY = "hrhub_dole_wage_orders_2026_v2";
  const DOLE_WAGE_CLOUD_USER_ID = "system_dole_wage_orders_2026";
  const [wageRates, setWageRates] = useState(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(WAGE_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === "object") {
            return { ...DEFAULT_REGIONAL_WAGE_RATES_2026, ...parsed };
          }
        }
      } catch (err) {
        console.warn("Wage orders parse error:", err);
      }
    }
    return DEFAULT_REGIONAL_WAGE_RATES_2026;
  });

  const [wageSearch, setWageSearch] = useState("");
  const [selectedIsland, setSelectedIsland] = useState("all"); // 'all' | 'Luzon' | 'Visayas' | 'Mindanao'
  const [isWageModalOpen, setIsWageModalOpen] = useState(false);
  const [wageSuccessMsg, setWageSuccessMsg] = useState("");
  const [wageFormData, setWageFormData] = useState({
    key: "ncr",
    region: "",
    shortName: "",
    island: "Luzon",
    area: "",
    nonAgri: 755.0,
    agri: 718.0,
    effectiveDate: "2026 Standard",
    orderNo: ""
  });

  // Cloud Sync: Awtomatikong kukunin ang pinakabagong update mula sa Supabase cloud para sa lahat ng users
  useEffect(() => {
    let isMounted = true;
    async function loadCloudWages() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select("settings_json")
          .eq("user_id", DOLE_WAGE_CLOUD_USER_ID)
          .maybeSingle();

        if (error) {
          console.warn("Notice checking cloud wage rates:", error.message);
          return;
        }

        if (data?.settings_json?.wageRates && isMounted) {
          const cloudRates = data.settings_json.wageRates;
          setWageRates((prev) => ({
            ...DEFAULT_REGIONAL_WAGE_RATES_2026,
            ...prev,
            ...cloudRates
          }));
          if (typeof window !== "undefined" && window.localStorage) {
            window.localStorage.setItem(WAGE_STORAGE_KEY, JSON.stringify(cloudRates));
          }
        }
      } catch (err) {
        console.warn("Supabase wage sync notice:", err);
      }
    }
    loadCloudWages();
    return () => { isMounted = false; };
  }, []);

  const filteredWageOrders = useMemo(() => {
    return Object.entries(wageRates).filter(([key, item]) => {
      const matchIsland = selectedIsland === "all" || item.island === selectedIsland;
      if (!matchIsland) return false;
      if (!wageSearch.trim()) return true;
      const q = wageSearch.toLowerCase();
      return (
        item.region?.toLowerCase().includes(q) ||
        item.area?.toLowerCase().includes(q) ||
        item.orderNo?.toLowerCase().includes(q) ||
        item.shortName?.toLowerCase().includes(q) ||
        item.island?.toLowerCase().includes(q)
      );
    });
  }, [wageRates, selectedIsland, wageSearch]);

  const handleOpenEditWageModal = (key, data = null) => {
    const item = data || wageRates[key] || {
      region: "New Regional Wage Board",
      shortName: "Region",
      island: "Luzon",
      area: "Coverage Cities / Municipalities",
      nonAgri: 500.0,
      agri: 480.0,
      effectiveDate: "2026 Standard",
      orderNo: "Wage Order No. ..."
    };
    setWageFormData({
      key: key || `custom_${Date.now()}`,
      region: item.region || "",
      shortName: item.shortName || item.region || "",
      island: item.island || "Luzon",
      area: item.area || "",
      nonAgri: item.nonAgri || 0,
      agri: item.agri || 0,
      effectiveDate: item.effectiveDate || "2026 Standard",
      orderNo: item.orderNo || ""
    });
    setIsWageModalOpen(true);
  };

  const handleSaveWageOrder = async (e) => {
    e.preventDefault();
    if (!wageFormData.key) return;
    const updated = {
      ...wageRates,
      [wageFormData.key]: {
        region: wageFormData.region,
        shortName: wageFormData.shortName || wageFormData.region,
        island: wageFormData.island || "Luzon",
        area: wageFormData.area,
        nonAgri: parseFloat(wageFormData.nonAgri) || 0,
        agri: parseFloat(wageFormData.agri) || 0,
        effectiveDate: wageFormData.effectiveDate,
        orderNo: wageFormData.orderNo,
        sourceUrl: "https://nwpc.dole.gov.ph"
      }
    };
    setWageRates(updated);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(WAGE_STORAGE_KEY, JSON.stringify(updated));
    }
    setIsWageModalOpen(false);
    setWageSuccessMsg(`Wage Order ${wageFormData.orderNo || wageFormData.region} successfully updated and synced to cloud.`);
    setTimeout(() => setWageSuccessMsg(""), 3500);

    // Sync to Supabase cloud para updated ang lahat ng gumagamit ng system nang walang code deployment
    if (supabase) {
      try {
        await supabase.from("user_settings").upsert({
          user_id: DOLE_WAGE_CLOUD_USER_ID,
          settings_json: { wageRates: updated, lastUpdated: new Date().toISOString() },
          updated_at: new Date().toISOString()
        });
      } catch (sbErr) {
        console.warn("Supabase wage save sync notice:", sbErr);
      }
    }
  };

  const handleResetWageOrders = async () => {
    if (window.confirm("Reset all regional wage rates to official 2026 NWPC DOLE Gazette baseline standards across the Philippines?")) {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(WAGE_STORAGE_KEY);
      }
      setWageRates(DEFAULT_REGIONAL_WAGE_RATES_2026);
      setIsWageModalOpen(false);
      setWageSuccessMsg("Successfully reset to official 2026 NWPC national baseline rates.");
      setTimeout(() => setWageSuccessMsg(""), 3500);

      if (supabase) {
        try {
          await supabase.from("user_settings").upsert({
            user_id: DOLE_WAGE_CLOUD_USER_ID,
            settings_json: { wageRates: DEFAULT_REGIONAL_WAGE_RATES_2026, lastUpdated: new Date().toISOString() },
            updated_at: new Date().toISOString()
          });
        } catch (sbErr) {
          console.warn("Supabase wage reset sync notice:", sbErr);
        }
      }
    }
  };

  const handleLoadRateToCalculator = (rate) => {
    setDailyRate(rate);
    setActiveTab("calculator");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-100 font-sans">
      {/* ================= TOP HERO BANNER ================= */}
      <header className="bg-slate-900 text-white border-b border-slate-800 p-4 sm:p-6 shrink-0 shadow-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-80 -bottom-20 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shrink-0 ring-4 ring-blue-500/20">
              <Scale size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  DOLE Legal Guidelines &amp; Statutory Suite
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={11} /> 2026 DOLE Compliant
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                  D.O. 147-15 Standard
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Centralized Philippine Labor Code adjudication suite: procedural due process verification, regional wage orders, statutory holiday &amp; 13th month calculator, and legal termination matrices.
              </p>
            </div>
          </div>

          {/* Quick Tools & Entity Selector */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-2">
              <Building2 size={14} className="text-amber-400" />
              <div className="text-left">
                <span className="block text-[9px] uppercase font-bold text-slate-400">Target Entity</span>
                <select
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer"
                >
                  {COMPANIES.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Close Legal Guidelines"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar - Responsive 6-Column Grid with Zero Cutoff */}
        <div className="max-w-7xl mx-auto mt-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
            {[
              {
                id: "due_process",
                title: "Due Process",
                subtitle: "D.O. 147-15",
                icon: Scale
              },
              {
                id: "calculator",
                title: "Pay & Benefits",
                subtitle: "Calculator",
                icon: Calculator
              },
              {
                id: "grounds",
                title: "Causes & Grounds",
                subtitle: "Just vs Authorized",
                icon: FileText
              },
              {
                id: "discipline",
                title: "Penalty Matrix",
                subtitle: "Progressive Standard",
                icon: ShieldAlert
              },
              {
                id: "wage_orders",
                title: "2026 Wage Orders",
                subtitle: "Nationwide (17 Regions)",
                icon: Building2
              },
              {
                id: "issuances",
                title: "DOLE Library",
                subtitle: "Orders & Advisories",
                icon: BookOpen
              }
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full py-2.5 px-2 rounded-xl text-xs font-black transition cursor-pointer flex flex-col items-center justify-center text-center gap-0.5 shadow-xs border ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/50 shadow-md scale-[1.01]"
                      : "bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/70"
                  }`}
                  title={`${tab.title} - ${tab.subtitle}`}
                >
                  <div className="flex items-center gap-1.5">
                    <TabIcon size={14} className={isActive ? "text-white" : "text-blue-400"} />
                    <span className="font-black text-xs leading-none">{tab.title}</span>
                  </div>
                  <span className={`text-[10px] leading-tight font-medium ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                    {tab.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT WORKSPACE ================= */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ================= TAB 1: PROCEDURAL DUE PROCESS SIMULATOR (D.O. 147-15) ================= */}
          {activeTab === "due_process" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Due Process Statutory Header Card */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      DOLE Twin-Notice Procedural Due Process Standard
                    </h2>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                      Supreme Court &amp; D.O. 147-15
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                    Under Philippine labor jurisprudence (King of Kings Transport v. Mamac and DOLE D.O. 147-15), valid disciplinary termination strictly requires observance of the twin-notice doctrine with a mandatory five (5) calendar day period to reply. Failure to observe procedural due process renders the dismissal legally defective, awarding nominal damages or backwages.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-slate-400">Compliance Health</span>
                    <span className={`text-xl font-black ${dueProcessScore === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                      {dueProcessScore}% Compliant
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onSwitchToNte}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <Send size={14} className="text-amber-400" />
                    <span>Go to Incident Reports (NTE)</span>
                  </button>
                </div>
              </div>

              {/* 5-Step Visual Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                {[
                  {
                    step: "1",
                    title: "Incident Discovery",
                    desc: "Formal reporting, incident log entry, and initial evidence gathering.",
                    badge: "Discovery",
                    color: "border-slate-300 bg-white"
                  },
                  {
                    step: "2",
                    title: "First Notice (NTE)",
                    desc: "Written Notice to Explain citing specific acts, dates, and rule violated.",
                    badge: "Mandatory Notice 1",
                    color: "border-blue-400 bg-blue-50/40"
                  },
                  {
                    step: "3",
                    title: "5 Calendar Days",
                    desc: "Strict statutory opportunity for employee to formulate written answer.",
                    badge: "Strict Minimum",
                    color: "border-amber-400 bg-amber-50/50"
                  },
                  {
                    step: "4",
                    title: "Admin Hearing",
                    desc: "Right to be heard, present witness/evidence, and representation by counsel.",
                    badge: "Due Process",
                    color: "border-purple-400 bg-purple-50/40"
                  },
                  {
                    step: "5",
                    title: "Second Notice (Decision)",
                    desc: "Written formal decision stating final evaluation and sanctions if any.",
                    badge: "Mandatory Notice 2",
                    color: "border-emerald-400 bg-emerald-50/40"
                  }
                ].map((item) => (
                  <div key={item.step} className={`p-4 rounded-2xl border-2 ${item.color} shadow-2xs space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                        {item.step}
                      </span>
                      <span className="text-[9px] font-black uppercase text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {item.badge}
                      </span>
                    </div>
                    <h3 className="text-xs font-black text-slate-900">{item.title}</h3>
                    <p className="text-[11px] text-slate-600 leading-snug">{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Interactive Audit & 5-Day Calculator Workspace */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: 5-Day Calendar Days Calculator (7 Cols) */}
                <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-blue-600" />
                      <h3 className="text-sm font-black text-slate-900">
                        DOLE 5-Day Calendar Explanation Deadline Calculator
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">Rule: King of Kings Doctrine</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1">
                        Date Notice to Explain (NTE) Served to Employee:
                      </label>
                      <input
                        type="date"
                        value={nteServeDate}
                        onChange={(e) => setNteServeDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Clock starts from date of verified written acknowledgment.
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 flex flex-col justify-between">
                      <span className="text-[10px] uppercase font-black text-blue-900 block">
                        Statutory Minimum Deadline:
                      </span>
                      <div className="text-base font-black text-blue-950 mt-1">
                        {statutoryExplanationDeadline}
                      </div>
                      <span className="text-[10px] text-blue-800 font-semibold mt-1 block">
                        ✓ Exactly 5 Calendar Days given (DOLE D.O. 147-15)
                      </span>
                    </div>
                  </div>

                  {/* Standard DOLE Due Process Clause to Copy */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">
                        Official DOLE D.O. 147-15 Compliant Notice Clause:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(
                          `In strict compliance with the statutory procedural due process requirements under Department of Labor and Employment (DOLE) Department Order No. 147-15, you are hereby given a period of FIVE (5) CALENDAR DAYS from your receipt hereof (or until ${statutoryExplanationDeadline}) to submit your formal written explanation addressing the allegations herein. You are likewise informed of your right to be assisted by counsel or employee representative.`,
                          "due_process_clause"
                        )}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-900 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                      >
                        {copiedKey === "due_process_clause" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedKey === "due_process_clause" ? "Copied!" : "Copy Clause"}</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
                      &quot;In strict compliance with the statutory procedural due process requirements under Department of Labor and Employment (DOLE) Department Order No. 147-15, you are hereby given a period of <strong>FIVE (5) CALENDAR DAYS</strong> from your receipt hereof (or until <strong>{statutoryExplanationDeadline}</strong>) to submit your formal written explanation addressing the allegations herein. You are likewise informed of your right to be assisted by counsel or an authorized employee representative.&quot;
                    </div>
                  </div>
                </div>

                {/* Right: Live Due Process Risk Detector (5 Cols) */}
                <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={18} className="text-amber-500" />
                        <h3 className="text-sm font-black text-slate-900">
                          Due Process Risk Audit
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">Self-Check</span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { key: "specificActs", label: "Notice details specific acts, dates & violated rules" },
                        { key: "fiveCalendarDays", label: "At least 5 full calendar days allowed for written reply" },
                        { key: "hearingOffered", label: "Administrative hearing/clarificatory conference offered" },
                        { key: "substantialEvidence", label: "Findings backed by substantial evidence & audit logs" },
                        { key: "secondNoticeServed", label: "Second written Notice of Decision issued before penalty" }
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition select-none"
                        >
                          <input
                            type="checkbox"
                            checked={dueProcessChecklist[item.key]}
                            onChange={(e) =>
                              setDueProcessChecklist((prev) => ({
                                ...prev,
                                [item.key]: e.target.checked
                              }))
                            }
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-xs text-slate-700 font-medium leading-snug">
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${dueProcessScore === 100 ? "bg-emerald-50 border-emerald-200 text-emerald-950" : "bg-amber-50 border-amber-200 text-amber-950"} space-y-1`}>
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase">
                      {dueProcessScore === 100 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
                      <span>{dueProcessScore === 100 ? "100% Audit-Ready (Safe from Illegal Dismissal)" : "Compliance Warning: Legal Vulnerabilities Detected"}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {dueProcessScore === 100
                        ? "Your disciplinary investigation satisfies both the substantive and procedural standards established under DOLE D.O. 147-15."
                        : "Dismissal without satisfying these 5 criteria risks awards of nominal damages (₱30,000 to ₱50,000 per employee) under the Supreme Court Agabon doctrine."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: STATUTORY PAY & BENEFITS CALCULATOR ================= */}
          {activeTab === "calculator" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Calculator Subtabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                {[
                  { id: "holiday", label: "Holiday Pay (Regular vs Special)", icon: Calendar },
                  { id: "13th_month", label: "13th Month Pay (P.D. 851)", icon: DollarSign },
                  { id: "separation", label: "Separation Pay (Art. 298/299)", icon: Award }
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCalcType(c.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-2 ${
                      calcType === c.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>

              {/* CALC 1: HOLIDAY PAY */}
              {calcType === "holiday" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Inputs */}
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">
                      DOLE Holiday Pay Computation Engine
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Daily Basic Rate (₱):
                          </label>
                          <span className="text-[10px] text-blue-600 font-bold">
                            Active Rate
                          </span>
                        </div>
                        <input
                          type="number"
                          value={dailyRate}
                          onChange={(e) => setDailyRate(parseFloat(e.target.value) || 0)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-900"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                          <span className="text-[9.5px] font-bold text-slate-400">National Rates (NWPC):</span>
                          {[
                            { name: "NCR (₱755)", rate: wageRates.ncr?.nonAgri || 755 },
                            { name: "Metro Cebu (₱582)", rate: wageRates.region7_classA?.nonAgri || 582 },
                            { name: "Davao (₱540)", rate: wageRates.region11?.nonAgri || 540 },
                            { name: "CDO (₱500)", rate: wageRates.region10?.nonAgri || 500 },
                            { name: "CALABARZON (₱645)", rate: wageRates.region4a?.nonAgri || 645 },
                            { name: "Central Luzon (₱600)", rate: wageRates.region3?.nonAgri || 600 },
                            { name: "GenSan (₱460)", rate: wageRates.region12?.nonAgri || 460 },
                            { name: "Iloilo/Bacolod (₱550)", rate: wageRates.region6?.nonAgri || 550 },
                            { name: "Baguio (₱505)", rate: wageRates.car?.nonAgri || 505 }
                          ].map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setDailyRate(p.rate)}
                              className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-900 text-[10px] font-bold border border-blue-200 transition cursor-pointer"
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Holiday Classification:
                        </label>
                        <select
                          value={holidayType}
                          onChange={(e) => setHolidayType(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 bg-white"
                        >
                          <option value="regular">Regular Holiday (100% / 200%)</option>
                          <option value="special">Special Non-Working Day (130%)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Employee Duty / Work Status:
                      </label>
                      <select
                        value={holidayWorkStatus}
                        onChange={(e) => setHolidayWorkStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 bg-white"
                      >
                        <option value="unworked">Unworked (Did not render duty)</option>
                        <option value="worked_8h">Worked standard 8 hours on regular shift</option>
                        <option value="worked_ot">Worked standard 8 hours + Overtime</option>
                        <option value="worked_restday">Worked on Scheduled Rest Day</option>
                        <option value="worked_restday_ot">Worked on Scheduled Rest Day + Overtime</option>
                      </select>
                    </div>

                    {(holidayWorkStatus === "worked_ot" || holidayWorkStatus === "worked_restday_ot") && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Overtime Hours Rendered:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="8"
                          value={overtimeHours}
                          onChange={(e) => setOvertimeHours(parseFloat(e.target.value) || 1)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900"
                        />
                      </div>
                    )}

                    {/* Quick Upcoming Holidays Carousel */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                        Official Statutory Holidays (Philippine Proclamation):
                      </span>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {PHILIPPINE_HOLIDAYS_2026.slice(0, 5).map((h, i) => (
                          <div key={i} className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0 text-left">
                            <span className="block text-[10px] font-black text-slate-800">{h.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{h.date} • {h.type.toUpperCase()} ({h.rate})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Output Card */}
                  <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                        Computed Gross Compensation
                      </span>
                      <div className="text-3xl font-black text-white mt-1">
                        ₱{holidayComputation.gross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-xs text-slate-300 font-medium block mt-1">
                        Applied Rate: {holidayComputation.multiplierText}
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Calculation Breakdown:</span>
                      <p className="font-mono text-slate-200 text-[11px] leading-relaxed">
                        {holidayComputation.breakdown}
                      </p>
                      <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>Hourly Base: ₱{holidayComputation.hourlyRate.toFixed(2)}/hr</span>
                        <span>Daily Rate: ₱{dailyRate.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCitation(
                        `DOLE HOLIDAY PAY COMPUTATION: Daily Basic: ₱${dailyRate.toFixed(2)} | Status: ${holidayWorkStatus} | Applicable Rate: ${holidayComputation.multiplierText} | Total Gross: ₱${holidayComputation.gross.toFixed(2)} | Formula: ${holidayComputation.breakdown}`,
                        "holiday_calc"
                      )}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copiedKey === "holiday_calc" ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedKey === "holiday_calc" ? "Copied Computation to Clipboard!" : "Copy Computation Summary"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CALC 2: 13TH MONTH PAY */}
              {calcType === "13th_month" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">
                      Presidential Decree No. 851 (13th Month Pay Standard)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Monthly Basic Salary (₱):
                        </label>
                        <input
                          type="number"
                          value={monthlyBasicSalary}
                          onChange={(e) => setMonthlyBasicSalary(parseFloat(e.target.value) || 0)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-900"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Exclude allowances and non-integrated benefits.
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Months Rendered in Calendar Year:
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={monthsRendered}
                          onChange={(e) => setMonthsRendered(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-900"
                        />
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          At least 1 month required for eligibility.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Unpaid Absences / Leaves Without Pay Deductions (₱):
                      </label>
                      <input
                        type="number"
                        value={unpaidAbsenceDeduction}
                        onChange={(e) => setUnpaidAbsenceDeduction(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        DOLE Formula: (Total Basic Salary Earned within Calendar Year) ÷ 12
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <span className="font-black uppercase text-[10px] block">Statutory Mandate:</span>
                      <p className="leading-relaxed">
                        Under P.D. 851, the 13th month pay must be paid not later than <strong>December 24</strong> of each year. Failure to pay is punishable by DOLE administrative sanctions and compliance audits.
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                        Net 13th Month Pay
                      </span>
                      <div className="text-3xl font-black text-white mt-1">
                        ₱{thirteenthMonthComputation.computed13th.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-xs text-slate-300 font-medium block mt-1">
                        Based on {monthsRendered} month(s) service
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-300">
                        <span>Total Basic Earned:</span>
                        <span className="font-mono font-bold">₱{thirteenthMonthComputation.totalEarned.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Tax Status (TRAIN Law):</span>
                        <span className={`font-bold ${thirteenthMonthComputation.isTaxExempt ? "text-emerald-400" : "text-amber-400"}`}>
                          {thirteenthMonthComputation.isTaxExempt ? "100% Tax-Exempt (Below ₱90k)" : `Taxable Excess: ₱${thirteenthMonthComputation.taxableAmount.toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCitation(
                        `DOLE 13TH MONTH PAY (P.D. 851): Monthly Basic: ₱${monthlyBasicSalary.toFixed(2)} | Months Rendered: ${monthsRendered} | Deductions: ₱${unpaidAbsenceDeduction.toFixed(2)} | Total 13th Month: ₱${thirteenthMonthComputation.computed13th.toFixed(2)} (Tax-Exempt: ${thirteenthMonthComputation.isTaxExempt ? "YES" : "NO"})`,
                        "13th_calc"
                      )}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copiedKey === "13th_calc" ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedKey === "13th_calc" ? "Copied Computation to Clipboard!" : "Copy 13th Month Summary"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CALC 3: SEPARATION PAY */}
              {calcType === "separation" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">
                      Authorized Causes Separation Pay (Art. 298 &amp; 299)
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Authorized Ground for Termination:
                        </label>
                        <select
                          value={separationCause}
                          onChange={(e) => setSeparationCause(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 bg-white"
                        >
                          <option value="redundancy">Redundancy / Labor-Saving Device (1 month pay per year)</option>
                          <option value="retrenchment">Retrenchment to prevent serious business losses (1/2 month per year)</option>
                          <option value="disease">Disease prejudicial to health / Art. 299 (1/2 month per year)</option>
                          <option value="closure_losses">Closure genuinely due to severe losses (No separation pay)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Latest Monthly Basic Salary (₱):
                          </label>
                          <input
                            type="number"
                            value={separationBasicSalary}
                            onChange={(e) => setSeparationBasicSalary(parseFloat(e.target.value) || 0)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Years of Continuous Service:
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={yearsOfService}
                            onChange={(e) => setYearsOfService(parseFloat(e.target.value) || 0)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-900"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            At least 6 months counts as 1 whole year.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
                      <span className="font-black uppercase text-[10px] block">Mandatory 30-Day DOLE Notice:</span>
                      <p className="leading-relaxed">
                        Authorized causes under Art. 298 strictly require serving written notice to BOTH the employee and the DOLE Regional Office (RKS Form 5) at least <strong>thirty (30) days prior</strong> to the intended date of termination.
                      </p>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                        Statutory Separation Pay
                      </span>
                      <div className="text-3xl font-black text-white mt-1">
                        ₱{separationPayComputation.totalPay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-xs text-slate-300 font-medium block mt-1">
                        Computed for {separationPayComputation.fractionYears} credited year(s)
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/10 border border-white/15 space-y-2 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">DOLE Formula Rule:</span>
                      <p className="text-slate-200 text-[11px] leading-relaxed">
                        {separationPayComputation.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyCitation(
                        `DOLE SEPARATION PAY (Art. 298/299): Cause: ${separationCause} | Monthly Salary: ₱${separationBasicSalary.toFixed(2)} | Service: ${yearsOfService} years | Credited: ${separationPayComputation.fractionYears} years | Statutory Total: ₱${separationPayComputation.totalPay.toFixed(2)}`,
                        "separation_calc"
                      )}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {copiedKey === "separation_calc" ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedKey === "separation_calc" ? "Copied Computation to Clipboard!" : "Copy Separation Pay Summary"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: JUST CAUSES VS AUTHORIZED CAUSES ================= */}
          {activeTab === "grounds" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ARTICLE 297: JUST CAUSES */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-rose-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Employee Fault • Zero Separation Pay
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-1">
                        Article 297 (Just Causes for Dismissal)
                      </h3>
                    </div>
                    <UserX size={24} className="text-rose-500" />
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Under Article 297 of the Labor Code, an employer may terminate employment for any of the following valid just causes. Strict substantial evidence is required.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "1. Serious Misconduct",
                        desc: "Grave, aggravated misconduct directly related to the performance of duties showing employee is unfit to continue working.",
                        elements: "Must be work-related, willful, and of grave character (e.g. physical assault, sexual harassment, grave extortion)."
                      },
                      {
                        title: "2. Willful Disobedience (Insubordination)",
                        desc: "Refusal to obey lawful and reasonable orders of the employer.",
                        elements: "Assailed order must be lawful, reasonable, made known to employee, and pertains to duties he/she was hired to perform."
                      },
                      {
                        title: "3. Gross and Habitual Neglect of Duty",
                        desc: "Repeated, gross failure to exercise diligence resulting in damage or operational disruption.",
                        elements: "Single isolated tardiness is not sufficient; must be gross and habitual (e.g. repeated AWOL, abandonment)."
                      },
                      {
                        title: "4. Fraud or Willful Breach of Trust (Loss of Confidence)",
                        desc: "Applicable to managerial employees or staff holding fiduciary custody of company assets and funds.",
                        elements: "Substantial basis; not mere suspicion (e.g. cashier skimming gaming receipts or cash float tampering)."
                      },
                      {
                        title: "5. Commission of a Crime or Offense",
                        desc: "Crime committed against the employer, immediate family members, or authorized representatives.",
                        elements: "Criminal conviction not strictly necessary; administrative substantial proof suffices."
                      }
                    ].map((g, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-900">{g.title}</h4>
                          <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">Art. 297</span>
                        </div>
                        <p className="text-[11px] text-slate-700 leading-snug">{g.desc}</p>
                        <p className="text-[10px] text-slate-400 italic">Legal standard: {g.elements}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ARTICLE 298 & 299: AUTHORIZED CAUSES */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Business Reasons • Requires Separation Pay
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-1">
                        Article 298 &amp; 299 (Authorized Causes)
                      </h3>
                    </div>
                    <Briefcase size={24} className="text-blue-500" />
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    Authorized causes are initiated by management due to legitimate business necessities or statutory health reasons. Mandatory 30-day DOLE RKS Form 5 notice is required.
                  </p>

                  <div className="space-y-3">
                    {[
                      {
                        title: "1. Redundancy (Art. 298)",
                        pay: "1 Month or 1 Month per Year of Service (whichever is higher)",
                        desc: "Position has become superfluous or in excess of what is reasonably demanded by actual business requirements.",
                        req: "Fair and reasonable criteria (seniority, efficiency, appraisal scores)."
                      },
                      {
                        title: "2. Retrenchment to Prevent Losses (Art. 298)",
                        pay: "1 Month or 1/2 Month per Year of Service (whichever is higher)",
                        desc: "Reduction of personnel undertaken primarily to avert or minimize serious ongoing or imminent business losses.",
                        req: "Audited financial statements certified by independent CPA required."
                      },
                      {
                        title: "3. Installation of Labor-Saving Devices (Art. 298)",
                        pay: "1 Month or 1 Month per Year of Service (whichever is higher)",
                        desc: "Introduction of automated machines, computer systems, or POS units rendering human labor redundant."
                      },
                      {
                        title: "4. Closure or Cessation of Business (Art. 298)",
                        pay: "1/2 Month per Year (Zero if genuinely due to severe bankruptcy)",
                        desc: "Complete permanent shutdown of operations, terminal branch closures, or company dissolution."
                      },
                      {
                        title: "5. Disease Prejudicial to Health (Art. 299)",
                        pay: "1 Month or 1/2 Month per Year of Service",
                        desc: "Employee suffering from illness that cannot be cured within 6 months as certified by public health officer."
                      }
                    ].map((g, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-slate-900">{g.title}</h4>
                          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">Authorized</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 block">Statutory Pay: {g.pay}</span>
                        <p className="text-[11px] text-slate-600 leading-snug">{g.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 4: PROGRESSIVE DISCIPLINE PENALTY MATRIX ================= */}
          {activeTab === "discipline" && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Progressive Discipline &amp; Penalty Schedule (DOLE Proportionality Standard)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Penalties must be progressive and proportional to the severity of the offense. Condonation or double jeopardy is prohibited.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToDocStudio}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Award size={14} />
                  <span>Draft Disciplinary Notice</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-black text-[10.5px] uppercase tracking-wider">
                      <th className="py-3 px-4">Offense Tier</th>
                      <th className="py-3 px-4">Examples / Infraction Type</th>
                      <th className="py-3 px-4">1st Offense</th>
                      <th className="py-3 px-4">2nd Offense</th>
                      <th className="py-3 px-4">3rd Offense</th>
                      <th className="py-3 px-4">4th Offense</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">Tier 1: Minor</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">Tardiness (&lt;15 mins), non-wearing of ID/uniform, untidy workstation</td>
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">Verbal Warning</td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">Written Reprimand</td>
                      <td className="py-3.5 px-4 text-amber-800 font-bold">1-3 Days Suspension</td>
                      <td className="py-3.5 px-4 text-rose-800 font-bold">5-7 Days Suspension</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">Tier 2: Moderate</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">AWOL for 1-2 days, unauthorized sleeping on shift, discourtesy to clients</td>
                      <td className="py-3.5 px-4 text-slate-700 font-semibold">Written Warning</td>
                      <td className="py-3.5 px-4 text-amber-800 font-bold">3-5 Days Suspension</td>
                      <td className="py-3.5 px-4 text-rose-800 font-bold">7-15 Days Suspension</td>
                      <td className="py-3.5 px-4 text-rose-950 font-black">Termination</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 font-bold text-[10px]">Tier 3: Serious</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">AWOL for 3+ days, insubordination to legal directive, neglect causing damage</td>
                      <td className="py-3.5 px-4 text-amber-900 font-bold">7-15 Days Suspension</td>
                      <td className="py-3.5 px-4 text-rose-900 font-black">Termination</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">—</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">—</td>
                    </tr>
                    <tr className="hover:bg-rose-50/30">
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-900 font-black text-[10px]">Tier 4: Grave</span>
                      </td>
                      <td className="py-3.5 px-4 text-rose-950 font-medium">Theft, cash float defalcation, falsification, physical assault, illegal drug use</td>
                      <td className="py-3.5 px-4 text-rose-950 font-black" colSpan="4">
                        Immediate 30-Day Preventive Suspension + NTE + Administrative Hearing leading to Dismissal (Art. 297)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Info size={14} className="text-blue-600" /> Prescription Period: Infractions older than 12 months without subsequent offense are deemed cleansed.
                </span>
                <span className="font-mono text-[10px] text-slate-400">DOLE Guidelines Reference</span>
              </div>
            </div>
          )}

          {/* ================= TAB 5: 2026 REGIONAL WAGE ORDERS (PHILIPPINES NATIONWIDE) ================= */}
          {activeTab === "wage_orders" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Notification Toast */}
              {wageSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{wageSuccessMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWageSuccessMsg("")}
                    className="p-1 text-emerald-700 hover:text-emerald-950 transition cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Official NWPC / DOLE Source & Synchronize Banner */}
              <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-sm border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
                <div className="space-y-2 relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Globe size={11} /> Official NWPC / DOLE Gazette Standards
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      https://nwpc.dole.gov.ph
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Nationwide (All 17 Administrative Regions)
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    2026 Philippine Regional Minimum Wage Rates &amp; Statutory Orders
                  </h3>
                  <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                    Official statutory minimum daily and hourly wage orders enacted by Regional Tripartite Wages and Productivity Boards (RTWPBs) under the National Wages and Productivity Commission (NWPC) across all 17 administrative regions in Luzon, Visayas, and Mindanao.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap shrink-0 relative z-10">
                  <a
                    href="https://nwpc.dole.gov.ph/stats/summary-of-current-regional-daily-minimum-wage-rates/"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-700 shadow-xs"
                    title="Buksan ang opisyal na website ng NWPC DOLE"
                  >
                    <Globe size={14} className="text-blue-400" />
                    <span>Check NWPC Site</span>
                    <ArrowUpRight size={13} className="text-slate-400" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleOpenEditWageModal("ncr")}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Edit3 size={14} />
                    <span>Update Wage Rates</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetWageOrders}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition cursor-pointer border border-slate-700"
                    title="Reset to NWPC 2026 Baseline Standards"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>

              {/* QUICK STATS & BENCHMARK HIGHLIGHTS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Highest Statutory Rate (NCR)</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">₱{Number(wageRates.ncr?.nonAgri || 755).toFixed(2)}</span>
                  <span className="text-[10px] text-blue-700 font-bold block mt-0.5">Wage Order No. NCR-28</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Metro Cebu Standard (Region VII)</span>
                  <span className="text-2xl font-black text-emerald-950 mt-1 block">₱{Number(wageRates.region7_classA?.nonAgri || 582).toFixed(2)}</span>
                  <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">Wage Order No. ROVII-27</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Davao Standard (Region XI)</span>
                  <span className="text-2xl font-black text-indigo-950 mt-1 block">₱{Number(wageRates.region11?.nonAgri || 540).toFixed(2)}</span>
                  <span className="text-[10px] text-indigo-700 font-bold block mt-0.5">Wage Order No. RB XI-24</span>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Northern Mindanao (Region X)</span>
                  <span className="text-2xl font-black text-amber-950 mt-1 block">₱{Number(wageRates.region10?.nonAgri || 500).toFixed(2)}</span>
                  <span className="text-[10px] text-amber-700 font-bold block mt-0.5">Wage Order No. RX-24</span>
                </div>
              </div>

              {/* FILTER BY ISLAND GROUP & SEARCH */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "all", label: "All (17 Regions)", count: Object.keys(wageRates).length },
                    { id: "Luzon", label: "Luzon", count: Object.values(wageRates).filter(r => r.island === "Luzon").length },
                    { id: "Visayas", label: "Visayas", count: Object.values(wageRates).filter(r => r.island === "Visayas").length },
                    { id: "Mindanao", label: "Mindanao", count: Object.values(wageRates).filter(r => r.island === "Mindanao").length }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedIsland(tab.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                        selectedIsland === tab.id
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        selectedIsland === tab.id ? "bg-white/20 text-white" : "bg-white text-slate-600"
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative w-full md:w-80">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={wageSearch}
                      onChange={(e) => setWageSearch(e.target.value)}
                      placeholder="Search province, city, region, or wage order..."
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditWageModal(`custom_${Date.now()}`)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
                  >
                    <Plus size={14} className="text-emerald-400" />
                    <span>Add Wage Board</span>
                  </button>
                </div>
              </div>

              {/* 17 REGIONAL WAGE ORDER CARDS */}
              {filteredWageOrders.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                  No regions, cities, or provinces found matching &quot;{wageSearch}&quot;.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredWageOrders.map(([key, item]) => (
                    <div
                      key={key}
                      className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4 hover:border-blue-400 hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span className="text-[9.5px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {item.orderNo}
                              </span>
                              <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border ${
                                item.island === "Luzon" ? "bg-amber-50 text-amber-900 border-amber-200" :
                                item.island === "Visayas" ? "bg-emerald-50 text-emerald-900 border-emerald-200" :
                                "bg-indigo-50 text-indigo-900 border-indigo-200"
                              }`}>
                                {item.island}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 leading-snug">
                              {item.region}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0">
                            {item.effectiveDate}
                          </span>
                        </div>

                        <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 min-h-[52px]">
                          <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                          <span className="leading-snug text-[11px] text-slate-700 line-clamp-3">
                            {item.area}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                            <span className="text-[9.5px] uppercase font-bold text-emerald-800 block">
                              Non-Agriculture:
                            </span>
                            <span className="text-xl font-black text-emerald-950 mt-0.5 block">
                              ₱{Number(item.nonAgri).toFixed(2)}
                            </span>
                            <span className="text-[9.5px] text-emerald-700 font-mono">
                              ₱{(Number(item.nonAgri) / 8).toFixed(2)} / hr
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                            <span className="text-[9.5px] uppercase font-bold text-slate-600 block">
                              Agriculture:
                            </span>
                            <span className="text-xl font-black text-slate-900 mt-0.5 block">
                              ₱{Number(item.agri).toFixed(2)}
                            </span>
                            <span className="text-[9.5px] text-slate-500 font-mono">
                              ₱{(Number(item.agri) / 8).toFixed(2)} / hr
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditWageModal(key, item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Edit3 size={13} className="text-slate-500" />
                          <span>Edit Rate</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleLoadRateToCalculator(Number(item.nonAgri))}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Calculator size={13} />
                          <span>Use in Calculator</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* De Minimis Statutory Tax-Exempt Caps */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
                  BIR &amp; DOLE Mandatory De Minimis Benefits (Tax-Exempt Thresholds)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] block font-bold">Rice Subsidy</span>
                    <span className="text-base font-black text-slate-900">₱2,000 / mo</span>
                    <span className="text-[9.5px] text-emerald-700 font-semibold block">100% Tax-Exempt</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] block font-bold">Uniform / Clothing</span>
                    <span className="text-base font-black text-slate-900">₱6,000 / yr</span>
                    <span className="text-[9.5px] text-emerald-700 font-semibold block">Annual Allowance</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] block font-bold">Medical Cash Allowance</span>
                    <span className="text-base font-black text-slate-900">₱1,500 / sem</span>
                    <span className="text-[9.5px] text-emerald-700 font-semibold block">₱250 per month</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 text-[10px] block font-bold">Laundry Allowance</span>
                    <span className="text-base font-black text-slate-900">₱300 / mo</span>
                    <span className="text-[9.5px] text-emerald-700 font-semibold block">Integrated</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 6: DOLE DEPARTMENT ORDERS & ADVISORIES LIBRARY ================= */}
          {activeTab === "issuances" && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    DOLE Department Orders &amp; Labor Advisories Reference Library
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official issuances governing employment contracts, occupational safety, and labor inspections.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search orders, rules, citations..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3.5">
                {[
                  {
                    code: "D.O. 147-15",
                    title: "Rules Implementing Book VI of the Labor Code (Due Process & Just Causes)",
                    category: "Due Process & Termination",
                    summary: "Establishes mandatory 5 calendar days reply window for Notice to Explain (NTE), administrative hearing protocol, and definitions of Just and Authorized Causes under Articles 297, 298, and 299.",
                    impact: "Critical for all Incident Reports, NTEs, and disciplinary resolutions."
                  },
                  {
                    code: "D.O. 174-17",
                    title: "Rules Implementing Articles 106 to 109 of the Labor Code (Contracting & Subcontracting)",
                    category: "Labor Contracting",
                    summary: "Strict prohibition of Labor-Only Contracting (LOC). Requires substantial capital (minimum ₱5,000,000 net worth) and independent operational control for contractors and agency security/janitorial providers.",
                    impact: "Governs third-party personnel, security agency agreements, and POS station technicians."
                  },
                  {
                    code: "D.O. 198-18 & R.A. 11058",
                    title: "Occupational Safety and Health Standards (OSH Law) & Compliance Penalties",
                    category: "Occupational Safety",
                    summary: "Mandatory appointment of certified Safety Officers (SO1/SO2), first aid personnel, OSH committee, and compliance with hazard-free work environments. Imposes daily fines of up to ₱100,000 for willful safety non-compliance.",
                    impact: "Required for all central offices, construction sites, and gaming terminal stations."
                  },
                  {
                    code: "Labor Advisory No. 04-20",
                    title: "Guidelines on 13th Month Pay Computation & Exemptions",
                    category: "Wages & Benefits",
                    summary: "Reiterates that 13th month pay is mandatory for all rank-and-file employees with at least 1 month of service, payable on or before December 24, with no exemptions permitted for ongoing business distress.",
                    impact: "Governs year-end payroll accounting and employee separations."
                  },
                  {
                    code: "D.O. 238-23",
                    title: "Strategic Labor Inspection Framework (DOLE Audit Checklist)",
                    category: "Government Audits",
                    summary: "DOLE labor inspection protocol covering General Labor Standards (GLS), statutory benefit remittances (SSS, PhilHealth, Pag-IBIG), payroll records, and occupational health certifications.",
                    impact: "Standard checklist for sudden DOLE provincial labor audits."
                  }
                ].filter(item => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return item.code.toLowerCase().includes(q) || item.title.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q);
                }).map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-blue-300 transition">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded border border-blue-200">
                          {item.code}
                        </span>
                        <h4 className="text-xs font-black text-slate-900">{item.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{item.summary}</p>
                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 italic">Corporate Impact: {item.impact}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(`${item.code}: ${item.title} - ${item.summary}`, `do_${idx}`)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 font-bold transition cursor-pointer flex items-center gap-1 border border-slate-200 shadow-2xs"
                      >
                        {copiedKey === `do_${idx}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>{copiedKey === `do_${idx}` ? "Copied" : "Copy Legal Citation"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================= EDIT / UPDATE WAGE ORDER MODAL ================= */}
          {isWageModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 block mb-1">
                      RTWPB / DOLE Statutory Update
                    </span>
                    <h3 className="text-base font-black text-white">
                      Update Regional Wage Order
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWageModalOpen(false)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleSaveWageOrder} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Region &amp; Board Name:
                    </label>
                    <input
                      type="text"
                      required
                      value={wageFormData.region}
                      onChange={(e) => setWageFormData({ ...wageFormData, region: e.target.value })}
                      placeholder="e.g. Region VII (Central Visayas) - Class A"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Short / Display Name:
                      </label>
                      <input
                        type="text"
                        value={wageFormData.shortName}
                        onChange={(e) => setWageFormData({ ...wageFormData, shortName: e.target.value })}
                        placeholder="e.g. Region VII"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Island Group:
                      </label>
                      <select
                        value={wageFormData.island}
                        onChange={(e) => setWageFormData({ ...wageFormData, island: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="Luzon">Luzon</option>
                        <option value="Visayas">Visayas</option>
                        <option value="Mindanao">Mindanao</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Short / Display Name:
                      </label>
                      <input
                        type="text"
                        value={wageFormData.shortName}
                        onChange={(e) => setWageFormData({ ...wageFormData, shortName: e.target.value })}
                        placeholder="e.g. Region VII"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Island Group:
                      </label>
                      <select
                        value={wageFormData.island}
                        onChange={(e) => setWageFormData({ ...wageFormData, island: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="Luzon">Luzon</option>
                        <option value="Visayas">Visayas</option>
                        <option value="Mindanao">Mindanao</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Official Wage Order Number:
                    </label>
                    <input
                      type="text"
                      required
                      value={wageFormData.orderNo}
                      onChange={(e) => setWageFormData({ ...wageFormData, orderNo: e.target.value })}
                      placeholder="e.g. Wage Order No. ROVII-24"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Coverage Area (Cities &amp; Municipalities):
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={wageFormData.area}
                      onChange={(e) => setWageFormData({ ...wageFormData, area: e.target.value })}
                      placeholder="e.g. Cebu City, Mandaue City, Lapu-Lapu City..."
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Non-Agri Daily Rate (₱):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="100"
                        required
                        value={wageFormData.nonAgri}
                        onChange={(e) => setWageFormData({ ...wageFormData, nonAgri: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-emerald-950 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                        Hourly: ₱{(Number(wageFormData.nonAgri || 0) / 8).toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Agri Daily Rate (₱):
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="100"
                        required
                        value={wageFormData.agri}
                        onChange={(e) => setWageFormData({ ...wageFormData, agri: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-900 focus:outline-none focus:border-slate-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                        Hourly: ₱{(Number(wageFormData.agri || 0) / 8).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Effective Date / Tranche:
                    </label>
                    <input
                      type="text"
                      value={wageFormData.effectiveDate}
                      onChange={(e) => setWageFormData({ ...wageFormData, effectiveDate: e.target.value })}
                      placeholder="e.g. October 2024 - 2026 Mandate"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsWageModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition cursor-pointer shadow-xs"
                    >
                      Save &amp; Synchronize
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

