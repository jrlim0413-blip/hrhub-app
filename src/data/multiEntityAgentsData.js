/**
 * multiEntityAgentsData.js
 * Multi-Entity Agent & Field Personnel Roster for Simpal Group of Companies
 * 
 * Provides authorized agent and field personnel records across all group subsidiaries:
 * - Lucky Betplay Corporation (PCSO STL Mandaue City, Cebu)
 * - 5A Royal Gaming OPC (PCSO STL Province of Maguindanao)
 * - Glowing Fortune (PCSO STL Iligan City & Lanao)
 * - Imperial Gaming OPC (PCSO STL City of Cotabato)
 * - MC POWER GAS (LPG Retail & Logistics Stations)
 * - Simpal Construction (SIMCON Batching & Logistics)
 */

export const MULTI_ENTITY_SUPERVISORS = [
  // Lucky Betplay (Mandaue)
  { id: 21, fullName: "ARLFRED SABERON", company: "Lucky Betplay Corporation", area: "Mandaue City" },
  { id: 22, fullName: "RAFFY BAGUIO", company: "Lucky Betplay Corporation", area: "Mandaue City" },
  { id: 23, fullName: "ROEL CATALAN", company: "Lucky Betplay Corporation", area: "Mandaue City" },
  { id: 24, fullName: "MICHAEL DE GUZMAN", company: "Lucky Betplay Corporation", area: "Mandaue City" },
  { id: 25, fullName: "JOEL ESTORCO", company: "Lucky Betplay Corporation", area: "Mandaue City" },
  { id: 26, fullName: "HARRY EYA", company: "Lucky Betplay Corporation", area: "Mandaue City" },
  { id: 30, fullName: "NARCISO TAGUD JR.", company: "Lucky Betplay Corporation", area: "Mandaue City" },

  // 5A Royal Gaming (Maguindanao)
  { id: 101, fullName: "DATU ALI MIDTIMBANG", company: "5A Royal Gaming OPC", area: "Datu Odin Sinsuat & North Maguindanao" },
  { id: 102, fullName: "NASSER GUIALIL", company: "5A Royal Gaming OPC", area: "Sultan Kudarat & Parang Sector" },
  { id: 103, fullName: "BAI SANDRA MASTURA", company: "5A Royal Gaming OPC", area: "Buluan & South Maguindanao" },
  { id: 104, fullName: "AL-HASSAN SINSUAT", company: "5A Royal Gaming OPC", area: "Upi & Coastal Maguindanao" },

  // Glowing Fortune (Iligan City & Lanao)
  { id: 201, fullName: "JUNARD MACASARTE", company: "Glowing Fortune", area: "Tibanga & Commercial Core (Iligan)" },
  { id: 202, fullName: "FATIMA ALAWI", company: "Glowing Fortune", area: "Tubod & Suarez Sector (Iligan)" },
  { id: 203, fullName: "REX BARANDINO", company: "Glowing Fortune", area: "Hinaplanon & Kiwalan Sector (Iligan)" },
  { id: 204, fullName: "JOCELYN DATU-RAMOS", company: "Glowing Fortune", area: "Marawi Corridor & Lanao South" },

  // Imperial Gaming (Cotabato City)
  { id: 301, fullName: "ABDULRASHID DILANGALEN", company: "Imperial Gaming OPC", area: "Poblacion & City Plaza Core" },
  { id: 302, fullName: "CHERRYLYN SAMAMA", company: "Imperial Gaming OPC", area: "Rosary Heights & Supermarket" },
  { id: 303, fullName: "MOHAMAD PENDATUN", company: "Imperial Gaming OPC", area: "Tamontaka & Kalanganan Coast" },

  // Non-STL Subsidiaries
  { id: 401, fullName: "MARLON CORTES", company: "MC POWER GAS", area: "Mandaue & North Terminal Hub" },
  { id: 501, fullName: "ENGR. DANILO SIMPAL", company: "Simpal Construction (SIMCON)", area: "Subangdaku Central Batching Plant" }
];

export const MULTI_ENTITY_BARANGAYS = [
  // 5A Royal Gaming
  { id: "mag_1", name: "Brgy. Dalican (Datu Odin Sinsuat)", company: "5A Royal Gaming OPC" },
  { id: "mag_2", name: "Brgy. Simuay (Sultan Kudarat)", company: "5A Royal Gaming OPC" },
  { id: "mag_3", name: "Brgy. Poblacion Parang", company: "5A Royal Gaming OPC" },
  { id: "mag_4", name: "Brgy. Poblacion Buluan", company: "5A Royal Gaming OPC" },
  { id: "mag_5", name: "Brgy. Nuro (Upi)", company: "5A Royal Gaming OPC" },
  { id: "mag_6", name: "Brgy. Bugasan (Matanog)", company: "5A Royal Gaming OPC" },

  // Glowing Fortune
  { id: "ilg_1", name: "Brgy. Tibanga (Iligan City)", company: "Glowing Fortune" },
  { id: "ilg_2", name: "Brgy. Tubod (Iligan City)", company: "Glowing Fortune" },
  { id: "ilg_3", name: "Brgy. Hinaplanon (Iligan City)", company: "Glowing Fortune" },
  { id: "ilg_4", name: "Brgy. Suarez (Iligan City)", company: "Glowing Fortune" },
  { id: "ilg_5", name: "Brgy. Kiwalan (Iligan City)", company: "Glowing Fortune" },
  { id: "ilg_6", name: "Brgy. Pala-o (Iligan City)", company: "Glowing Fortune" },

  // Imperial Gaming
  { id: "cot_1", name: "Brgy. Poblacion 1 (City Plaza, Cotabato)", company: "Imperial Gaming OPC" },
  { id: "cot_2", name: "Brgy. Rosary Heights 3 (Cotabato)", company: "Imperial Gaming OPC" },
  { id: "cot_3", name: "Brgy. Tamontaka 1 (Cotabato)", company: "Imperial Gaming OPC" },
  { id: "cot_4", name: "Brgy. Kalanganan 2 (Cotabato)", company: "Imperial Gaming OPC" },
  { id: "cot_5", name: "Brgy. Bagua 1 (Cotabato)", company: "Imperial Gaming OPC" },

  // Non-STL
  { id: "mc_1", name: "Subangdaku Gas Terminal", company: "MC POWER GAS" },
  { id: "sim_1", name: "Subangdaku Industrial Batching Complex", company: "Simpal Construction (SIMCON)" }
];

export const SUBSIDIARY_AGENTS_ROSTER = [
  // =========================================================================
  // 5A ROYAL GAMING OPC (Maguindanao)
  // =========================================================================
  {
    id: "5a_01",
    company: "5A Royal Gaming OPC",
    fullName: "ARMAN GUIAMALON",
    username: "5a_arman",
    address: "POBLACION, DATU ODIN SINSUAT, MAGUINDANAO",
    contactNumber: "09174568891",
    location: "DATU ODIN SINSUAT",
    outlet: "DOS DALICAN HIGHWAY TERMINAL",
    isActive: 1,
    multiLogin: 1,
    supervisor: 101,
    brgyId: "mag_1",
    deviceId: "5a-dos-01-a87f",
    printer_setting: 1
  },
  {
    id: "5a_02",
    company: "5A Royal Gaming OPC",
    fullName: "NORHAMIN SINSUAT",
    username: "5a_norhamin",
    address: "SIMUAY, SULTAN KUDARAT, MAGUINDANAO",
    contactNumber: "09204456782",
    location: "SULTAN KUDARAT",
    outlet: "SIMUAY CORRIDOR KIOSK",
    isActive: 1,
    multiLogin: 1,
    supervisor: 102,
    brgyId: "mag_2",
    deviceId: "5a-sk-02-b91c",
    printer_setting: 1
  },
  {
    id: "5a_03",
    company: "5A Royal Gaming OPC",
    fullName: "ZUBAIDA AMPATUAN",
    username: "5a_zubaida",
    address: "POBLACION PARANG, MAGUINDANAO",
    contactNumber: "09983345129",
    location: "PARANG",
    outlet: "PARANG WHARF TERMINAL BOOTH",
    isActive: 1,
    multiLogin: 1,
    supervisor: 102,
    brgyId: "mag_3",
    deviceId: "5a-prg-03-c45d",
    printer_setting: 1
  },
  {
    id: "5a_04",
    company: "5A Royal Gaming OPC",
    fullName: "HARON MIDTIMBANG",
    username: "5a_haron",
    address: "POBLACION BULUAN, MAGUINDANAO",
    contactNumber: "09395567812",
    location: "BULUAN",
    outlet: "BULUAN PUBLIC MARKET KIOSK",
    isActive: 1,
    multiLogin: 1,
    supervisor: 103,
    brgyId: "mag_4",
    deviceId: "5a-bul-04-d78e",
    printer_setting: 1
  },
  {
    id: "5a_05",
    company: "5A Royal Gaming OPC",
    fullName: "SITTIE AISA DATU",
    username: "5a_sittie",
    address: "NURO, UPI, MAGUINDANAO",
    contactNumber: "09187765432",
    location: "UPI",
    outlet: "UPI NURO TOWN PLAZA KIOSK",
    isActive: 1,
    multiLogin: 1,
    supervisor: 104,
    brgyId: "mag_5",
    deviceId: "5a-upi-05-e12f",
    printer_setting: 1
  },
  {
    id: "5a_06",
    company: "5A Royal Gaming OPC",
    fullName: "BAILYN MASTURA",
    username: "5a_bailyn",
    address: "BUGASAN, MATANOG, MAGUINDANAO",
    contactNumber: "09218876543",
    location: "MATANOG",
    outlet: "MATANOG HIGHWAY CHECKPOINT BOOTH",
    isActive: 0,
    multiLogin: 0,
    supervisor: 102,
    brgyId: "mag_6",
    deviceId: "5a-mat-06-f34a",
    printer_setting: 0
  },

  // =========================================================================
  // GLOWING FORTUNE (Iligan City & Lanao)
  // =========================================================================
  {
    id: "gfc_01",
    company: "Glowing Fortune",
    fullName: "JUNREY MACASARTE",
    username: "gfc_junrey",
    address: "TIBANGA, ILIGAN CITY",
    contactNumber: "09176543219",
    location: "ILIGAN CITY",
    outlet: "TIBANGA COMMERCIAL STRIP BOOTH",
    isActive: 1,
    multiLogin: 1,
    supervisor: 201,
    brgyId: "ilg_1",
    deviceId: "gfc-tib-01-a11b",
    printer_setting: 1
  },
  {
    id: "gfc_02",
    company: "Glowing Fortune",
    fullName: "FARHANA ALAWI",
    username: "gfc_farhana",
    address: "TUBOD, ILIGAN CITY",
    contactNumber: "09207654321",
    location: "ILIGAN CITY",
    outlet: "TUBOD HIGHWAY SOUTH TERMINAL",
    isActive: 1,
    multiLogin: 1,
    supervisor: 202,
    brgyId: "ilg_2",
    deviceId: "gfc-tub-02-b22c",
    printer_setting: 1
  },
  {
    id: "gfc_03",
    company: "Glowing Fortune",
    fullName: "KELVIN BARANDINO",
    username: "gfc_kelvin",
    address: "HINAPLANON, ILIGAN CITY",
    contactNumber: "09988765432",
    location: "ILIGAN CITY",
    outlet: "HINAPLANON CROSSING KIOSK",
    isActive: 1,
    multiLogin: 1,
    supervisor: 203,
    brgyId: "ilg_3",
    deviceId: "gfc-hin-03-c33d",
    printer_setting: 1
  },
  {
    id: "gfc_04",
    company: "Glowing Fortune",
    fullName: "JOCELYN RAMOS",
    username: "gfc_jocelyn",
    address: "SUAREZ, ILIGAN CITY",
    contactNumber: "09399876543",
    location: "ILIGAN CITY",
    outlet: "SUAREZ PUBLIC MARKET POST",
    isActive: 1,
    multiLogin: 1,
    supervisor: 202,
    brgyId: "ilg_4",
    deviceId: "gfc-sua-04-d44e",
    printer_setting: 1
  },
  {
    id: "gfc_05",
    company: "Glowing Fortune",
    fullName: "ANISAH DIMAPORO",
    username: "gfc_anisah",
    address: "KIWALAN, ILIGAN CITY",
    contactNumber: "09191234567",
    location: "ILIGAN CITY",
    outlet: "KIWALAN PORT EXPRESS BOOTH",
    isActive: 1,
    multiLogin: 1,
    supervisor: 203,
    brgyId: "ilg_5",
    deviceId: "gfc-kiw-05-e55f",
    printer_setting: 1
  },
  {
    id: "gfc_06",
    company: "Glowing Fortune",
    fullName: "CHRISTOPHER TABIL",
    username: "gfc_chris",
    address: "PALA-O, ILIGAN CITY",
    contactNumber: "09223344556",
    location: "ILIGAN CITY",
    outlet: "PALA-O PUBLIC MARKET KIOSK",
    isActive: 0,
    multiLogin: 0,
    supervisor: 201,
    brgyId: "ilg_6",
    deviceId: "gfc-pal-06-f66a",
    printer_setting: 0
  },

  // =========================================================================
  // IMPERIAL GAMING OPC (Cotabato City)
  // =========================================================================
  {
    id: "imp_01",
    company: "Imperial Gaming OPC",
    fullName: "RASHID DILANGALEN",
    username: "imp_rashid",
    address: "POBLACION 1, COTABATO CITY",
    contactNumber: "09178899001",
    location: "COTABATO CITY",
    outlet: "CITY PLAZA CENTRAL OUTLET",
    isActive: 1,
    multiLogin: 1,
    supervisor: 301,
    brgyId: "cot_1",
    deviceId: "imp-plz-01-a77b",
    printer_setting: 1
  },
  {
    id: "imp_02",
    company: "Imperial Gaming OPC",
    fullName: "MAYBELLINE SAMAMA",
    username: "imp_maybelline",
    address: "ROSARY HEIGHTS 3, COTABATO CITY",
    contactNumber: "09201122334",
    location: "COTABATO CITY",
    outlet: "ROSARY HEIGHTS CORRIDOR KIOSK",
    isActive: 1,
    multiLogin: 1,
    supervisor: 302,
    brgyId: "cot_2",
    deviceId: "imp-rh3-02-b88c",
    printer_setting: 1
  },
  {
    id: "imp_03",
    company: "Imperial Gaming OPC",
    fullName: "AL-MANSOOR PENDATUN",
    username: "imp_mansoor",
    address: "TAMONTAKA 1, COTABATO CITY",
    contactNumber: "09982233445",
    location: "COTABATO CITY",
    outlet: "TAMONTAKA CROSSING TERMINAL",
    isActive: 1,
    multiLogin: 1,
    supervisor: 303,
    brgyId: "cot_3",
    deviceId: "imp-tam-03-c99d",
    printer_setting: 1
  },
  {
    id: "imp_04",
    company: "Imperial Gaming OPC",
    fullName: "ROHANNA SEMA",
    username: "imp_rohanna",
    address: "KALANGANAN 2, COTABATO CITY",
    contactNumber: "09393344556",
    location: "COTABATO CITY",
    outlet: "KALANGANAN FISHERY HUB KIOSK",
    isActive: 1,
    multiLogin: 1,
    supervisor: 303,
    brgyId: "cot_4",
    deviceId: "imp-kal-04-d00e",
    printer_setting: 1
  },
  {
    id: "imp_05",
    company: "Imperial Gaming OPC",
    fullName: "BAI NUR SINSUAT",
    username: "imp_bainur",
    address: "BAGUA 1, COTABATO CITY",
    contactNumber: "09194455667",
    location: "COTABATO CITY",
    outlet: "BAGUA JUNCTION STATION",
    isActive: 0,
    multiLogin: 0,
    supervisor: 301,
    brgyId: "cot_5",
    deviceId: "imp-bag-05-e11f",
    printer_setting: 0
  },

  // =========================================================================
  // MC POWER GAS & SIMPAL CONSTRUCTION (Non-STL)
  // =========================================================================
  {
    id: "mc_01",
    company: "MC POWER GAS",
    fullName: "JOEL BOKINGO",
    username: "mc_joel",
    address: "SUBANGDAKU, MANDAUE CITY",
    contactNumber: "09175566778",
    location: "MANDAUE CITY",
    outlet: "MC POWER GAS CENTRAL REFILLING HUB",
    isActive: 1,
    multiLogin: 1,
    supervisor: 401,
    brgyId: "mc_1",
    deviceId: "mc-hub-01-a12",
    printer_setting: 1
  },
  {
    id: "sim_01",
    company: "Simpal Construction (SIMCON)",
    fullName: "RUEL BOKINGO",
    username: "sim_ruel",
    address: "SUBANGDAKU INDUSTRIAL COMPLEX, MANDAUE CITY",
    contactNumber: "09206677889",
    location: "MANDAUE CITY",
    outlet: "SIMCON BATCHING & LOGISTICS YARD",
    isActive: 1,
    multiLogin: 1,
    supervisor: 501,
    brgyId: "sim_1",
    deviceId: "sim-yard-01-b34",
    printer_setting: 1
  }
];
