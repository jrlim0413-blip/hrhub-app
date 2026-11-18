
export const MAGUINDANAO_SECTORS = [
  {
    "id": "dos",
    "name": "Datu Odin Sinsuat (DOS)",
    "coords": [
      7.165,
      124.215
    ],
    "mainRoad": "Cotabato-Davao Highway",
    "isEdge": true,
    "landmark": "Awang Airport & DOS Municipal Hall",
    "bordersWith": "Cotabato City & Upi"
  },
  {
    "id": "sultan_kudarat",
    "name": "Sultan Kudarat (Nuling)",
    "coords": [
      7.245,
      124.258
    ],
    "mainRoad": "Narciso Ramos Highway",
    "isEdge": true,
    "landmark": "Nuling Central Market & Simuay Bridge",
    "bordersWith": "Cotabato City & Sultan Mastura"
  },
  {
    "id": "parang",
    "name": "Parang",
    "coords": [
      7.375,
      124.268
    ],
    "mainRoad": "Parang-Malabang Road",
    "isEdge": true,
    "landmark": "Polloc International Freeport",
    "bordersWith": "Matanog & Barira"
  },
  {
    "id": "sultan_mastura",
    "name": "Sultan Mastura",
    "coords": [
      7.315,
      124.275
    ],
    "mainRoad": "Narciso Ramos Highway",
    "isEdge": true,
    "landmark": "Tambu Municipal Hall",
    "bordersWith": "Sultan Kudarat & Parang"
  },
  {
    "id": "matanog",
    "name": "Matanog",
    "coords": [
      7.445,
      124.298
    ],
    "mainRoad": "Narciso Ramos Highway",
    "isEdge": true,
    "landmark": "Camp Sarmiento & Lanao Boundary Arch",
    "bordersWith": "Barira & Lanao del Sur"
  },
  {
    "id": "barira",
    "name": "Barira",
    "coords": [
      7.485,
      124.348
    ],
    "mainRoad": "Barira Interior Road",
    "isEdge": true,
    "landmark": "Barira Town Center",
    "bordersWith": "Buldon & Matanog"
  },
  {
    "id": "buldon",
    "name": "Buldon",
    "coords": [
      7.515,
      124.385
    ],
    "mainRoad": "Buldon Highland Corridor",
    "isEdge": true,
    "landmark": "Buldon Valley Outpost",
    "bordersWith": "Barira & North Cotabato"
  },
  {
    "id": "upi",
    "name": "Upi (North Upi)",
    "coords": [
      7.035,
      124.165
    ],
    "mainRoad": "Awang-Upi-Lebak Road",
    "isEdge": true,
    "landmark": "Nuro Town Center & Highlands",
    "bordersWith": "DOS & South Upi"
  },
  {
    "id": "south_upi",
    "name": "South Upi",
    "coords": [
      6.865,
      124.135
    ],
    "mainRoad": "Timanan Corridor",
    "isEdge": true,
    "landmark": "Timanan Central Station",
    "bordersWith": "Upi & Sultan Kudarat Prov"
  },
  {
    "id": "dbs",
    "name": "Datu Blah Sinsuat",
    "coords": [
      7.125,
      123.995
    ],
    "mainRoad": "Coastal Highway",
    "isEdge": true,
    "landmark": "DBS Coastal Watchpoint",
    "bordersWith": "Moro Gulf & DOS"
  },
  {
    "id": "kabuntalan",
    "name": "Kabuntalan",
    "coords": [
      7.135,
      124.385
    ],
    "mainRoad": "Rio Grande Access Road",
    "isEdge": true,
    "landmark": "Tumbao River Landing",
    "bordersWith": "Northern Kabuntalan & DOS"
  },
  {
    "id": "northern_kabuntalan",
    "name": "Northern Kabuntalan",
    "coords": [
      7.195,
      124.415
    ],
    "mainRoad": "Sabaken Corridor",
    "isEdge": true,
    "landmark": "Sabaken Central Point",
    "bordersWith": "Kabuntalan & Sultan Kudarat"
  }
];

export const MAGUINDANAO_CHECKPOINTS = [
  {
    "step": 1,
    "id": "mg_chk_1",
    "name": "Awang Airport Junction",
    "coords": [
      7.165,
      124.215
    ],
    "edgeSector": "DOS Sector Hub",
    "mainRoad": "Awang-Upi Highway",
    "landmark": "Awang Airport & 6th ID Junction",
    "instruction": "South patrol route connecting DOS central to Cotabato City border."
  },
  {
    "step": 2,
    "id": "mg_chk_2",
    "name": "Datu Odin Sinsuat Poblacion",
    "coords": [
      7.152,
      124.208
    ],
    "edgeSector": "South Commercial Hub",
    "mainRoad": "National Highway",
    "landmark": "DOS Municipal Complex",
    "instruction": "Monitor central tellers and outlets in Dalican."
  },
  {
    "step": 3,
    "id": "mg_chk_3",
    "name": "Upi Highland Border",
    "coords": [
      7.035,
      124.165
    ],
    "edgeSector": "Southwest Mountain Edge",
    "mainRoad": "Awang-Lebak Highway",
    "landmark": "Nuro Boundary Monument",
    "instruction": "Patrol mountain corridor towards Lebak."
  },
  {
    "step": 4,
    "id": "mg_chk_4",
    "name": "Datu Blah Sinsuat Coastal Ramp",
    "coords": [
      7.125,
      123.995
    ],
    "edgeSector": "Western Coastal Edge",
    "mainRoad": "Moro Gulf Coastal Road",
    "landmark": "DBS Port Landing",
    "instruction": "Inspect coastal outlets along Moro Gulf."
  },
  {
    "step": 5,
    "id": "mg_chk_5",
    "name": "Simuay River Crossing",
    "coords": [
      7.235,
      124.248
    ],
    "edgeSector": "Central Arterial Bridge",
    "mainRoad": "Narciso Ramos Highway",
    "landmark": "Simuay Bridge & Highway Arch",
    "instruction": "Key transit checkpoint between Cotabato City and Sultan Kudarat."
  },
  {
    "step": 6,
    "id": "mg_chk_6",
    "name": "Sultan Kudarat Nuling Center",
    "coords": [
      7.248,
      124.262
    ],
    "edgeSector": "North Commercial Core",
    "mainRoad": "Nuling Central Road",
    "landmark": "Nuling Public Market & Grand Mosque",
    "instruction": "Inspect dense teller clusters in Nuling."
  },
  {
    "step": 7,
    "id": "mg_chk_7",
    "name": "Sultan Mastura Tambu Outpost",
    "coords": [
      7.315,
      124.275
    ],
    "edgeSector": "North Highway Checkpoint",
    "mainRoad": "Narciso Ramos Highway",
    "landmark": "Tambu Crossing",
    "instruction": "Proceed northward into Parang municipality."
  },
  {
    "step": 8,
    "id": "mg_chk_8",
    "name": "Polloc International Freeport",
    "coords": [
      7.368,
      124.235
    ],
    "edgeSector": "Northwest Industrial Port",
    "mainRoad": "Polloc Port Access Road",
    "landmark": "Polloc Deepwater Docks",
    "instruction": "Audit maritime port tellers and authorized booths."
  },
  {
    "step": 9,
    "id": "mg_chk_9",
    "name": "Parang Poblacion Hub",
    "coords": [
      7.378,
      124.272
    ],
    "edgeSector": "Northern Commercial Hub",
    "mainRoad": "Parang-Malabang Road",
    "landmark": "Parang Municipal Plaza",
    "instruction": "Audit outlets along Parang bay corridor."
  },
  {
    "step": 10,
    "id": "mg_chk_10",
    "name": "Matanog Lanao Border Pass",
    "coords": [
      7.445,
      124.298
    ],
    "edgeSector": "Northernmost Provincial Border",
    "mainRoad": "Narciso Ramos Highway",
    "landmark": "Camp Sarmiento Memorial & Arch",
    "instruction": "Boundary checkpoint bordering Lanao del Sur."
  }
];

export const ILIGAN_SECTORS = [
  {
    "id": "tibanga",
    "name": "Tibanga",
    "coords": [
      8.238,
      124.248
    ],
    "mainRoad": "Andres Bonifacio Ave",
    "isEdge": true,
    "landmark": "MSU-IIT Campus & Tibanga Highway",
    "bordersWith": "Poblacion & Hinaplanon"
  },
  {
    "id": "tubod",
    "name": "Tubod",
    "coords": [
      8.212,
      124.238
    ],
    "mainRoad": "Macapagal Avenue",
    "isEdge": true,
    "landmark": "City Hall & Tubod Commercial Center",
    "bordersWith": "Tambacan & Suarez"
  },
  {
    "id": "suarez",
    "name": "Suarez",
    "coords": [
      8.192,
      124.225
    ],
    "mainRoad": "National Highway South",
    "isEdge": true,
    "landmark": "National Steel Complex Corridor",
    "bordersWith": "Tubod & Buru-un"
  },
  {
    "id": "palao",
    "name": "Pala-o",
    "coords": [
      8.225,
      124.241
    ],
    "mainRoad": "Roxas Avenue",
    "isEdge": true,
    "landmark": "City Public Market & Adventist Medical Center",
    "bordersWith": "Poblacion & Saray"
  },
  {
    "id": "hinaplanon",
    "name": "Hinaplanon",
    "coords": [
      8.252,
      124.262
    ],
    "mainRoad": "Cagayan de Oro-Iligan Highway",
    "isEdge": true,
    "landmark": "Mandulog River Bridge",
    "bordersWith": "Tibanga & Kiwalan"
  },
  {
    "id": "kiwalan",
    "name": "Kiwalan",
    "coords": [
      8.278,
      124.278
    ],
    "mainRoad": "National Highway North",
    "isEdge": true,
    "landmark": "Kiwalan International Port & Cement Plant",
    "bordersWith": "Hinaplanon & Dalipuga"
  },
  {
    "id": "tambacan",
    "name": "Tambacan",
    "coords": [
      8.221,
      124.235
    ],
    "mainRoad": "Cabili Avenue Link",
    "isEdge": true,
    "landmark": "Integrated Bus & Jeepney Terminal (IBJT)",
    "bordersWith": "Tubod & Saray"
  },
  {
    "id": "saray",
    "name": "Saray",
    "coords": [
      8.231,
      124.239
    ],
    "mainRoad": "Roxas Ave Extension",
    "isEdge": true,
    "landmark": "Saray Commercial Outlets",
    "bordersWith": "Pala-o & Poblacion"
  },
  {
    "id": "poblacion_iligan",
    "name": "Poblacion",
    "coords": [
      8.228,
      124.242
    ],
    "mainRoad": "General Wood St & Quezon Ave",
    "isEdge": true,
    "landmark": "St. Michael Cathedral & City Plaza",
    "bordersWith": "Saray & Tibanga"
  },
  {
    "id": "buruun",
    "name": "Buru-un",
    "coords": [
      8.175,
      124.185
    ],
    "mainRoad": "National Highway",
    "isEdge": true,
    "landmark": "Maria Cristina Falls & Hydro Station",
    "bordersWith": "Suarez & Linamon"
  },
  {
    "id": "dalipuga",
    "name": "Dalipuga",
    "coords": [
      8.315,
      124.288
    ],
    "mainRoad": "Northern Coastal Highway",
    "isEdge": true,
    "landmark": "Dalipuga Beach & Northern Boundary Marker",
    "bordersWith": "Kiwalan & Lugait"
  },
  {
    "id": "baloi",
    "name": "Baloi Sector",
    "coords": [
      8.115,
      124.215
    ],
    "mainRoad": "Iligan-Marawi Highway",
    "isEdge": true,
    "landmark": "Baloi Central Crossing & Balo-i Lake",
    "bordersWith": "Lanao Interior & Iligan South"
  },
  {
    "id": "linamon",
    "name": "Linamon Border",
    "coords": [
      8.182,
      124.168
    ],
    "mainRoad": "Lanao del Norte National Highway",
    "isEdge": true,
    "landmark": "Linamon Bridge & Provincial Arch",
    "bordersWith": "Buru-un & Matungao"
  }
];

export const ILIGAN_CHECKPOINTS = [
  {
    "step": 1,
    "id": "il_chk_1",
    "name": "City Hall & Tubod Junction",
    "coords": [
      8.212,
      124.238
    ],
    "edgeSector": "South Commercial Edge",
    "mainRoad": "Macapagal Avenue",
    "landmark": "Anahaw Amphitheater & City Hall",
    "instruction": "Start inspection at Iligan City administrative center."
  },
  {
    "step": 2,
    "id": "il_chk_2",
    "name": "IBJT Tambacan Terminal",
    "coords": [
      8.221,
      124.235
    ],
    "edgeSector": "Transit Gateway",
    "mainRoad": "Tambacan Terminal Road",
    "landmark": "Integrated Bus & Jeepney Terminal",
    "instruction": "Audit tellers in the highest passenger transit point."
  },
  {
    "step": 3,
    "id": "il_chk_3",
    "name": "Poblacion & Cathedral Plaza",
    "coords": [
      8.228,
      124.242
    ],
    "edgeSector": "Central Commercial Core",
    "mainRoad": "Quezon Avenue",
    "landmark": "St. Michael Cathedral",
    "instruction": "Inspect urban core retail and street tellers."
  },
  {
    "step": 4,
    "id": "il_chk_4",
    "name": "Tibanga - MSU-IIT Crossing",
    "coords": [
      8.238,
      124.248
    ],
    "edgeSector": "North-Central Edge",
    "mainRoad": "Andres Bonifacio Ave",
    "landmark": "MSU-IIT Main Gate",
    "instruction": "Follow north arterial towards Mandulog Bridge."
  },
  {
    "step": 5,
    "id": "il_chk_5",
    "name": "Mandulog River Bridge (Hinaplanon)",
    "coords": [
      8.252,
      124.262
    ],
    "edgeSector": "North River Crossing",
    "mainRoad": "Cagayan de Oro-Iligan Highway",
    "landmark": "Hinaplanon Bridge Landing",
    "instruction": "Key bridge dividing urban Iligan from northern industrial plants."
  },
  {
    "step": 6,
    "id": "il_chk_6",
    "name": "Kiwalan International Port",
    "coords": [
      8.278,
      124.278
    ],
    "edgeSector": "North Industrial Seaport",
    "mainRoad": "National Highway North",
    "landmark": "Kiwalan Cement Complex & Docks",
    "instruction": "Audit port area checkpoints."
  },
  {
    "step": 7,
    "id": "il_chk_7",
    "name": "Dalipuga Northern Outpost",
    "coords": [
      8.315,
      124.288
    ],
    "edgeSector": "Northernmost Boundary",
    "mainRoad": "Cagayan de Oro Boundary Road",
    "landmark": "Dalipuga Border Marker",
    "instruction": "Northernmost boundary of Iligan City."
  },
  {
    "step": 8,
    "id": "il_chk_8",
    "name": "Suarez Industrial Corridor",
    "coords": [
      8.192,
      124.225
    ],
    "edgeSector": "South Industrial Edge",
    "mainRoad": "National Highway South",
    "landmark": "National Steel Complex Gate",
    "instruction": "Inspect south industrial belt."
  },
  {
    "step": 9,
    "id": "il_chk_9",
    "name": "Maria Cristina Hydroelectric Pass",
    "coords": [
      8.175,
      124.185
    ],
    "edgeSector": "Southwest Mountain Edge",
    "mainRoad": "Agus River Access Road",
    "landmark": "Maria Cristina Falls & Powerhouse",
    "instruction": "Monitor Agus river corridor towards Balo-i."
  },
  {
    "step": 10,
    "id": "il_chk_10",
    "name": "Linamon Provincial Boundary Bridge",
    "coords": [
      8.182,
      124.168
    ],
    "edgeSector": "Lanao Provincial Border",
    "mainRoad": "Lanao del Norte Highway",
    "landmark": "Linamon River Bridge",
    "instruction": "Southwestern boundary marker bordering Linamon."
  }
];

export const COTABATO_SECTORS = [
  {
    "id": "poblacion_cotabato",
    "name": "Poblacion Sector (1-9)",
    "coords": [
      7.2236,
      124.2464
    ],
    "mainRoad": "Sinsuat Avenue & Don Rufino Alonzo",
    "isEdge": true,
    "landmark": "City Plaza & Old City Hall",
    "bordersWith": "Bagua & Rosary Heights"
  },
  {
    "id": "rosary_heights",
    "name": "Rosary Heights (1-13)",
    "coords": [
      7.208,
      124.241
    ],
    "mainRoad": "Sinsuat Ave & Notre Dame Ave",
    "isEdge": true,
    "landmark": "Notre Dame University & Cotabato Regional Medical Center",
    "bordersWith": "Poblacion & Tamontaka"
  },
  {
    "id": "tamontaka",
    "name": "Tamontaka Sector (1-5)",
    "coords": [
      7.185,
      124.228
    ],
    "mainRoad": "Tamontaka-DOS Bypass Road",
    "isEdge": true,
    "landmark": "Tamontaka Church & Tamontaka Bridge",
    "bordersWith": "Rosary Heights & DOS Maguindanao"
  },
  {
    "id": "kalanganan",
    "name": "Kalanganan Sector (1-2)",
    "coords": [
      7.235,
      124.205
    ],
    "mainRoad": "Sultan Haji Hassanal Bolkiah Blvd",
    "isEdge": true,
    "landmark": "Grand Mosque of Cotabato",
    "bordersWith": "Bagua & Moro Gulf Coast"
  },
  {
    "id": "bagua",
    "name": "Bagua Sector (1-3)",
    "coords": [
      7.238,
      124.238
    ],
    "mainRoad": "Dorotheo St & Rio Grande Banks",
    "isEdge": true,
    "landmark": "Rio Grande de Mindanao Waterfront",
    "bordersWith": "Poblacion & Kalanganan"
  }
];

export const COTABATO_CHECKPOINTS = [
  {
    "step": 1,
    "id": "cot_chk_1",
    "name": "City Plaza & Poblacion Core",
    "coords": [
      7.2236,
      124.2464
    ],
    "edgeSector": "Urban Commercial Core",
    "mainRoad": "Sinsuat Avenue",
    "landmark": "Cotabato City Hall & Rizal Park",
    "instruction": "Start inspection at central business district."
  },
  {
    "step": 2,
    "id": "cot_chk_2",
    "name": "Notre Dame Avenue & RH 3",
    "coords": [
      7.215,
      124.243
    ],
    "edgeSector": "Institutional Belt",
    "mainRoad": "Notre Dame Avenue",
    "landmark": "Notre Dame University",
    "instruction": "Monitor heavy student and commercial foot traffic outlets."
  },
  {
    "step": 3,
    "id": "cot_chk_3",
    "name": "CRMC Medical Center Corridor (RH 10)",
    "coords": [
      7.205,
      124.239
    ],
    "edgeSector": "South Commercial Edge",
    "mainRoad": "Sinsuat Avenue South",
    "landmark": "Cotabato Regional Medical Center",
    "instruction": "Inspect 24/7 tellers around medical corridor."
  },
  {
    "step": 4,
    "id": "cot_chk_4",
    "name": "Tamontaka Historic Bridge Landing",
    "coords": [
      7.185,
      124.228
    ],
    "edgeSector": "Southern River Border",
    "mainRoad": "Tamontaka Highway",
    "landmark": "Tamontaka Bridge & Maguindanao Arch",
    "instruction": "Key southern boundary bridge connecting Cotabato City with DOS."
  },
  {
    "step": 5,
    "id": "cot_chk_5",
    "name": "Grand Mosque Boulevard (Kalanganan 2)",
    "coords": [
      7.235,
      124.205
    ],
    "edgeSector": "Western Coastal Edge",
    "mainRoad": "Sultan Haji Hassanal Bolkiah Highway",
    "landmark": "Sultan Haji Hassanal Bolkiah Mosque",
    "instruction": "Inspect coastal community tellers near Moro Gulf."
  },
  {
    "step": 6,
    "id": "cot_chk_6",
    "name": "Rio Grande Wharf & Bagua Outpost",
    "coords": [
      7.238,
      124.238
    ],
    "edgeSector": "Northern Waterfront Edge",
    "mainRoad": "Dorotheo St",
    "landmark": "Rio Grande Docks",
    "instruction": "Monitor riverboat crossings and cargo terminal outlets."
  },
  {
    "step": 7,
    "id": "cot_chk_7",
    "name": "Quirino Bridge (Esteros Corridor)",
    "coords": [
      7.229,
      124.252
    ],
    "edgeSector": "Northeastern Gateway",
    "mainRoad": "Don Rufino Alonzo St",
    "landmark": "Quirino Bridge Landing",
    "instruction": "Gateway checkpoint towards Sultan Kudarat Highway."
  }
];

import MULTI_ENTITY_PERIMETER_ROUTES_DATA from "./multiEntityPerimeterRoutes.js";

export const MULTI_ENTITY_PERIMETER_ROUTES = MULTI_ENTITY_PERIMETER_ROUTES_DATA;

export const MULTI_ENTITY_ALL_POIS = {
  "terminals": [
    {
      "id": "term_dos_1",
      "name": "Datu Odin Sinsuat (DOS) Central Public Transport Terminal",
      "barangayId": "dos",
      "barangayName": "Datu Odin Sinsuat (DOS)",
      "coords": [
        7.1632,
        124.2135
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Cotabato-Davao Highway, Datu Odin Sinsuat (DOS)",
      "routes": "Datu Odin Sinsuat (DOS) Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_dos_2",
      "name": "Datu Odin Sinsuat (DOS) Sector Dispatch & Commuter Station",
      "barangayId": "dos",
      "barangayName": "Datu Odin Sinsuat (DOS)",
      "coords": [
        7.1672,
        124.2175
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Awang Airport & DOS Municipal Hall, Datu Odin Sinsuat (DOS)",
      "routes": "Inter-sector shuttle line connecting Cotabato City & Upi",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_sultan_kudarat_1",
      "name": "Sultan Kudarat (Nuling) Central Public Transport Terminal",
      "barangayId": "sultan_kudarat",
      "barangayName": "Sultan Kudarat (Nuling)",
      "coords": [
        7.2432,
        124.2565
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Narciso Ramos Highway, Sultan Kudarat (Nuling)",
      "routes": "Sultan Kudarat (Nuling) Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_sultan_kudarat_2",
      "name": "Sultan Kudarat (Nuling) Sector Dispatch & Commuter Station",
      "barangayId": "sultan_kudarat",
      "barangayName": "Sultan Kudarat (Nuling)",
      "coords": [
        7.2472,
        124.2605
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Nuling Central Market & Simuay Bridge, Sultan Kudarat (Nuling)",
      "routes": "Inter-sector shuttle line connecting Cotabato City & Sultan Mastura",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_parang_1",
      "name": "Parang Central Public Transport Terminal",
      "barangayId": "parang",
      "barangayName": "Parang",
      "coords": [
        7.3732,
        124.2665
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Parang-Malabang Road, Parang",
      "routes": "Parang Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_parang_2",
      "name": "Parang Sector Dispatch & Commuter Station",
      "barangayId": "parang",
      "barangayName": "Parang",
      "coords": [
        7.3772,
        124.2705
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Polloc International Freeport, Parang",
      "routes": "Inter-sector shuttle line connecting Matanog & Barira",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_sultan_mastura_1",
      "name": "Sultan Mastura Central Public Transport Terminal",
      "barangayId": "sultan_mastura",
      "barangayName": "Sultan Mastura",
      "coords": [
        7.3132,
        124.2735
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Narciso Ramos Highway, Sultan Mastura",
      "routes": "Sultan Mastura Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_sultan_mastura_2",
      "name": "Sultan Mastura Sector Dispatch & Commuter Station",
      "barangayId": "sultan_mastura",
      "barangayName": "Sultan Mastura",
      "coords": [
        7.3172,
        124.2775
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Tambu Municipal Hall, Sultan Mastura",
      "routes": "Inter-sector shuttle line connecting Sultan Kudarat & Parang",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_matanog_1",
      "name": "Matanog Central Public Transport Terminal",
      "barangayId": "matanog",
      "barangayName": "Matanog",
      "coords": [
        7.4432,
        124.2965
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Narciso Ramos Highway, Matanog",
      "routes": "Matanog Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_matanog_2",
      "name": "Matanog Sector Dispatch & Commuter Station",
      "barangayId": "matanog",
      "barangayName": "Matanog",
      "coords": [
        7.4472,
        124.3005
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Camp Sarmiento & Lanao Boundary Arch, Matanog",
      "routes": "Inter-sector shuttle line connecting Barira & Lanao del Sur",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_barira_1",
      "name": "Barira Central Public Transport Terminal",
      "barangayId": "barira",
      "barangayName": "Barira",
      "coords": [
        7.4832,
        124.3465
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Barira Interior Road, Barira",
      "routes": "Barira Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_barira_2",
      "name": "Barira Sector Dispatch & Commuter Station",
      "barangayId": "barira",
      "barangayName": "Barira",
      "coords": [
        7.4872,
        124.3505
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Barira Town Center, Barira",
      "routes": "Inter-sector shuttle line connecting Buldon & Matanog",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_buldon_1",
      "name": "Buldon Central Public Transport Terminal",
      "barangayId": "buldon",
      "barangayName": "Buldon",
      "coords": [
        7.5132,
        124.3835
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Buldon Highland Corridor, Buldon",
      "routes": "Buldon Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_buldon_2",
      "name": "Buldon Sector Dispatch & Commuter Station",
      "barangayId": "buldon",
      "barangayName": "Buldon",
      "coords": [
        7.5172,
        124.3875
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Buldon Valley Outpost, Buldon",
      "routes": "Inter-sector shuttle line connecting Barira & North Cotabato",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_upi_1",
      "name": "Upi (North Upi) Central Public Transport Terminal",
      "barangayId": "upi",
      "barangayName": "Upi (North Upi)",
      "coords": [
        7.0332,
        124.1635
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Awang-Upi-Lebak Road, Upi (North Upi)",
      "routes": "Upi (North Upi) Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_upi_2",
      "name": "Upi (North Upi) Sector Dispatch & Commuter Station",
      "barangayId": "upi",
      "barangayName": "Upi (North Upi)",
      "coords": [
        7.0372,
        124.1675
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Nuro Town Center & Highlands, Upi (North Upi)",
      "routes": "Inter-sector shuttle line connecting DOS & South Upi",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_south_upi_1",
      "name": "South Upi Central Public Transport Terminal",
      "barangayId": "south_upi",
      "barangayName": "South Upi",
      "coords": [
        6.8632,
        124.1335
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Timanan Corridor, South Upi",
      "routes": "South Upi Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_south_upi_2",
      "name": "South Upi Sector Dispatch & Commuter Station",
      "barangayId": "south_upi",
      "barangayName": "South Upi",
      "coords": [
        6.8672,
        124.1375
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Timanan Central Station, South Upi",
      "routes": "Inter-sector shuttle line connecting Upi & Sultan Kudarat Prov",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_dbs_1",
      "name": "Datu Blah Sinsuat Central Public Transport Terminal",
      "barangayId": "dbs",
      "barangayName": "Datu Blah Sinsuat",
      "coords": [
        7.1232,
        123.9935
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Coastal Highway, Datu Blah Sinsuat",
      "routes": "Datu Blah Sinsuat Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_dbs_2",
      "name": "Datu Blah Sinsuat Sector Dispatch & Commuter Station",
      "barangayId": "dbs",
      "barangayName": "Datu Blah Sinsuat",
      "coords": [
        7.1272,
        123.9975
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near DBS Coastal Watchpoint, Datu Blah Sinsuat",
      "routes": "Inter-sector shuttle line connecting Moro Gulf & DOS",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_kabuntalan_1",
      "name": "Kabuntalan Central Public Transport Terminal",
      "barangayId": "kabuntalan",
      "barangayName": "Kabuntalan",
      "coords": [
        7.1332,
        124.3835
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Rio Grande Access Road, Kabuntalan",
      "routes": "Kabuntalan Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_kabuntalan_2",
      "name": "Kabuntalan Sector Dispatch & Commuter Station",
      "barangayId": "kabuntalan",
      "barangayName": "Kabuntalan",
      "coords": [
        7.1372,
        124.3875
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Tumbao River Landing, Kabuntalan",
      "routes": "Inter-sector shuttle line connecting Northern Kabuntalan & DOS",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_northern_kabuntalan_1",
      "name": "Northern Kabuntalan Central Public Transport Terminal",
      "barangayId": "northern_kabuntalan",
      "barangayName": "Northern Kabuntalan",
      "coords": [
        7.1932,
        124.4135
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Sabaken Corridor, Northern Kabuntalan",
      "routes": "Northern Kabuntalan Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_northern_kabuntalan_2",
      "name": "Northern Kabuntalan Sector Dispatch & Commuter Station",
      "barangayId": "northern_kabuntalan",
      "barangayName": "Northern Kabuntalan",
      "coords": [
        7.1972,
        124.4175
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Sabaken Central Point, Northern Kabuntalan",
      "routes": "Inter-sector shuttle line connecting Kabuntalan & Sultan Kudarat",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "five_a"
    },
    {
      "id": "term_tibanga_1",
      "name": "Tibanga Central Public Transport Terminal",
      "barangayId": "tibanga",
      "barangayName": "Tibanga",
      "coords": [
        8.2362,
        124.2465
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Andres Bonifacio Ave, Tibanga",
      "routes": "Tibanga Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_tibanga_2",
      "name": "Tibanga Sector Dispatch & Commuter Station",
      "barangayId": "tibanga",
      "barangayName": "Tibanga",
      "coords": [
        8.2402,
        124.2505
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near MSU-IIT Campus & Tibanga Highway, Tibanga",
      "routes": "Inter-sector shuttle line connecting Poblacion & Hinaplanon",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_tubod_1",
      "name": "Tubod Central Public Transport Terminal",
      "barangayId": "tubod",
      "barangayName": "Tubod",
      "coords": [
        8.2102,
        124.2365
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Macapagal Avenue, Tubod",
      "routes": "Tubod Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_tubod_2",
      "name": "Tubod Sector Dispatch & Commuter Station",
      "barangayId": "tubod",
      "barangayName": "Tubod",
      "coords": [
        8.2142,
        124.2405
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near City Hall & Tubod Commercial Center, Tubod",
      "routes": "Inter-sector shuttle line connecting Tambacan & Suarez",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_suarez_1",
      "name": "Suarez Central Public Transport Terminal",
      "barangayId": "suarez",
      "barangayName": "Suarez",
      "coords": [
        8.1902,
        124.2235
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "National Highway South, Suarez",
      "routes": "Suarez Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_suarez_2",
      "name": "Suarez Sector Dispatch & Commuter Station",
      "barangayId": "suarez",
      "barangayName": "Suarez",
      "coords": [
        8.1942,
        124.2275
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near National Steel Complex Corridor, Suarez",
      "routes": "Inter-sector shuttle line connecting Tubod & Buru-un",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_palao_1",
      "name": "Pala-o Central Public Transport Terminal",
      "barangayId": "palao",
      "barangayName": "Pala-o",
      "coords": [
        8.2232,
        124.2395
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Roxas Avenue, Pala-o",
      "routes": "Pala-o Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_palao_2",
      "name": "Pala-o Sector Dispatch & Commuter Station",
      "barangayId": "palao",
      "barangayName": "Pala-o",
      "coords": [
        8.2272,
        124.2435
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near City Public Market & Adventist Medical Center, Pala-o",
      "routes": "Inter-sector shuttle line connecting Poblacion & Saray",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_hinaplanon_1",
      "name": "Hinaplanon Central Public Transport Terminal",
      "barangayId": "hinaplanon",
      "barangayName": "Hinaplanon",
      "coords": [
        8.2502,
        124.2605
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Cagayan de Oro-Iligan Highway, Hinaplanon",
      "routes": "Hinaplanon Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_hinaplanon_2",
      "name": "Hinaplanon Sector Dispatch & Commuter Station",
      "barangayId": "hinaplanon",
      "barangayName": "Hinaplanon",
      "coords": [
        8.2542,
        124.2645
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Mandulog River Bridge, Hinaplanon",
      "routes": "Inter-sector shuttle line connecting Tibanga & Kiwalan",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_kiwalan_1",
      "name": "Kiwalan Central Public Transport Terminal",
      "barangayId": "kiwalan",
      "barangayName": "Kiwalan",
      "coords": [
        8.2762,
        124.2765
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "National Highway North, Kiwalan",
      "routes": "Kiwalan Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_kiwalan_2",
      "name": "Kiwalan Sector Dispatch & Commuter Station",
      "barangayId": "kiwalan",
      "barangayName": "Kiwalan",
      "coords": [
        8.2802,
        124.2805
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Kiwalan International Port & Cement Plant, Kiwalan",
      "routes": "Inter-sector shuttle line connecting Hinaplanon & Dalipuga",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_tambacan_1",
      "name": "Tambacan Central Public Transport Terminal",
      "barangayId": "tambacan",
      "barangayName": "Tambacan",
      "coords": [
        8.2192,
        124.2335
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Cabili Avenue Link, Tambacan",
      "routes": "Tambacan Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_tambacan_2",
      "name": "Tambacan Sector Dispatch & Commuter Station",
      "barangayId": "tambacan",
      "barangayName": "Tambacan",
      "coords": [
        8.2232,
        124.2375
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Integrated Bus & Jeepney Terminal (IBJT), Tambacan",
      "routes": "Inter-sector shuttle line connecting Tubod & Saray",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_saray_1",
      "name": "Saray Central Public Transport Terminal",
      "barangayId": "saray",
      "barangayName": "Saray",
      "coords": [
        8.2292,
        124.2375
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Roxas Ave Extension, Saray",
      "routes": "Saray Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_saray_2",
      "name": "Saray Sector Dispatch & Commuter Station",
      "barangayId": "saray",
      "barangayName": "Saray",
      "coords": [
        8.2332,
        124.2415
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Saray Commercial Outlets, Saray",
      "routes": "Inter-sector shuttle line connecting Pala-o & Poblacion",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_poblacion_iligan_1",
      "name": "Poblacion Central Public Transport Terminal",
      "barangayId": "poblacion_iligan",
      "barangayName": "Poblacion",
      "coords": [
        8.2262,
        124.2405
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "General Wood St & Quezon Ave, Poblacion",
      "routes": "Poblacion Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_poblacion_iligan_2",
      "name": "Poblacion Sector Dispatch & Commuter Station",
      "barangayId": "poblacion_iligan",
      "barangayName": "Poblacion",
      "coords": [
        8.2302,
        124.2445
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near St. Michael Cathedral & City Plaza, Poblacion",
      "routes": "Inter-sector shuttle line connecting Saray & Tibanga",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_buruun_1",
      "name": "Buru-un Central Public Transport Terminal",
      "barangayId": "buruun",
      "barangayName": "Buru-un",
      "coords": [
        8.1732,
        124.1835
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "National Highway, Buru-un",
      "routes": "Buru-un Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_buruun_2",
      "name": "Buru-un Sector Dispatch & Commuter Station",
      "barangayId": "buruun",
      "barangayName": "Buru-un",
      "coords": [
        8.1772,
        124.1875
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Maria Cristina Falls & Hydro Station, Buru-un",
      "routes": "Inter-sector shuttle line connecting Suarez & Linamon",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_dalipuga_1",
      "name": "Dalipuga Central Public Transport Terminal",
      "barangayId": "dalipuga",
      "barangayName": "Dalipuga",
      "coords": [
        8.3132,
        124.2865
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Northern Coastal Highway, Dalipuga",
      "routes": "Dalipuga Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_dalipuga_2",
      "name": "Dalipuga Sector Dispatch & Commuter Station",
      "barangayId": "dalipuga",
      "barangayName": "Dalipuga",
      "coords": [
        8.3172,
        124.2905
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Dalipuga Beach & Northern Boundary Marker, Dalipuga",
      "routes": "Inter-sector shuttle line connecting Kiwalan & Lugait",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_baloi_1",
      "name": "Baloi Sector Central Public Transport Terminal",
      "barangayId": "baloi",
      "barangayName": "Baloi Sector",
      "coords": [
        8.1132,
        124.2135
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Iligan-Marawi Highway, Baloi Sector",
      "routes": "Baloi Sector Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_baloi_2",
      "name": "Baloi Sector Sector Dispatch & Commuter Station",
      "barangayId": "baloi",
      "barangayName": "Baloi Sector",
      "coords": [
        8.1172,
        124.2175
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Baloi Central Crossing & Balo-i Lake, Baloi Sector",
      "routes": "Inter-sector shuttle line connecting Lanao Interior & Iligan South",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_linamon_1",
      "name": "Linamon Border Central Public Transport Terminal",
      "barangayId": "linamon",
      "barangayName": "Linamon Border",
      "coords": [
        8.1802,
        124.1665
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Lanao del Norte National Highway, Linamon Border",
      "routes": "Linamon Border Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_linamon_2",
      "name": "Linamon Border Sector Dispatch & Commuter Station",
      "barangayId": "linamon",
      "barangayName": "Linamon Border",
      "coords": [
        8.1842,
        124.1705
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Linamon Bridge & Provincial Arch, Linamon Border",
      "routes": "Inter-sector shuttle line connecting Buru-un & Matungao",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "glowing"
    },
    {
      "id": "term_poblacion_cotabato_1",
      "name": "Poblacion Sector (1-9) Central Public Transport Terminal",
      "barangayId": "poblacion_cotabato",
      "barangayName": "Poblacion Sector (1-9)",
      "coords": [
        7.2218,
        124.2449
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Sinsuat Avenue & Don Rufino Alonzo, Poblacion Sector (1-9)",
      "routes": "Poblacion Sector (1-9) Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "imperial"
    },
    {
      "id": "term_poblacion_cotabato_2",
      "name": "Poblacion Sector (1-9) Sector Dispatch & Commuter Station",
      "barangayId": "poblacion_cotabato",
      "barangayName": "Poblacion Sector (1-9)",
      "coords": [
        7.2258,
        124.2489
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near City Plaza & Old City Hall, Poblacion Sector (1-9)",
      "routes": "Inter-sector shuttle line connecting Bagua & Rosary Heights",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "imperial"
    },
    {
      "id": "term_rosary_heights_1",
      "name": "Rosary Heights (1-13) Central Public Transport Terminal",
      "barangayId": "rosary_heights",
      "barangayName": "Rosary Heights (1-13)",
      "coords": [
        7.2062,
        124.2395
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Sinsuat Ave & Notre Dame Ave, Rosary Heights (1-13)",
      "routes": "Rosary Heights (1-13) Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "imperial"
    },
    {
      "id": "term_rosary_heights_2",
      "name": "Rosary Heights (1-13) Sector Dispatch & Commuter Station",
      "barangayId": "rosary_heights",
      "barangayName": "Rosary Heights (1-13)",
      "coords": [
        7.2102,
        124.2435
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Notre Dame University & Cotabato Regional Medical Center, Rosary Heights (1-13)",
      "routes": "Inter-sector shuttle line connecting Poblacion & Tamontaka",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "imperial"
    },
    {
      "id": "term_tamontaka_1",
      "name": "Tamontaka Sector (1-5) Central Public Transport Terminal",
      "barangayId": "tamontaka",
      "barangayName": "Tamontaka Sector (1-5)",
      "coords": [
        7.1832,
        124.2265
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Tamontaka-DOS Bypass Road, Tamontaka Sector (1-5)",
      "routes": "Tamontaka Sector (1-5) Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "imperial"
    },
    {
      "id": "term_tamontaka_2",
      "name": "Tamontaka Sector (1-5) Sector Dispatch & Commuter Station",
      "barangayId": "tamontaka",
      "barangayName": "Tamontaka Sector (1-5)",
      "coords": [
        7.1872,
        124.2305
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Tamontaka Church & Tamontaka Bridge, Tamontaka Sector (1-5)",
      "routes": "Inter-sector shuttle line connecting Rosary Heights & DOS Maguindanao",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "imperial"
    },
    {
      "id": "term_kalanganan_1",
      "name": "Kalanganan Sector (1-2) Central Public Transport Terminal",
      "barangayId": "kalanganan",
      "barangayName": "Kalanganan Sector (1-2)",
      "coords": [
        7.2332,
        124.2035
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Sultan Haji Hassanal Bolkiah Blvd, Kalanganan Sector (1-2)",
      "routes": "Kalanganan Sector (1-2) Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "imperial"
    },
    {
      "id": "term_kalanganan_2",
      "name": "Kalanganan Sector (1-2) Sector Dispatch & Commuter Station",
      "barangayId": "kalanganan",
      "barangayName": "Kalanganan Sector (1-2)",
      "coords": [
        7.2372,
        124.2075
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Grand Mosque of Cotabato, Kalanganan Sector (1-2)",
      "routes": "Inter-sector shuttle line connecting Bagua & Moro Gulf Coast",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "imperial"
    },
    {
      "id": "term_bagua_1",
      "name": "Bagua Sector (1-3) Central Public Transport Terminal",
      "barangayId": "bagua",
      "barangayName": "Bagua Sector (1-3)",
      "coords": [
        7.2362,
        124.2365
      ],
      "type": "Integrated Bus, Van & Jeepney Feeder Station",
      "address": "Dorotheo St & Rio Grande Banks, Bagua Sector (1-3)",
      "routes": "Bagua Sector (1-3) Local Loop, Regional Arterials & Commercial Corridors",
      "operatingHours": "4:00 AM - 10:00 PM Daily",
      "capacity": "60+ Transport Units",
      "territoryKey": "imperial"
    },
    {
      "id": "term_bagua_2",
      "name": "Bagua Sector (1-3) Sector Dispatch & Commuter Station",
      "barangayId": "bagua",
      "barangayName": "Bagua Sector (1-3)",
      "coords": [
        7.2402,
        124.2405
      ],
      "type": "Tricycle & UV Express Loading Bay",
      "address": "Near Rio Grande de Mindanao Waterfront, Bagua Sector (1-3)",
      "routes": "Inter-sector shuttle line connecting Poblacion & Kalanganan",
      "operatingHours": "5:00 AM - 9:00 PM",
      "capacity": "35 Transport Units",
      "territoryKey": "imperial"
    }
  ],
  "factories": [
    {
      "id": "fact_dos_1",
      "name": "Datu Odin Sinsuat (DOS) Central Commercial & Logistics Park",
      "barangayId": "dos",
      "barangayName": "Datu Odin Sinsuat (DOS)",
      "coords": [
        7.1665,
        124.2125
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Datu Odin Sinsuat (DOS)",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_dos_2",
      "name": "Datu Odin Sinsuat (DOS) Industrial & Agro-Processing Center",
      "barangayId": "dos",
      "barangayName": "Datu Odin Sinsuat (DOS)",
      "coords": [
        7.1625,
        124.217
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Cotabato-Davao Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_sultan_kudarat_1",
      "name": "Sultan Kudarat (Nuling) Central Commercial & Logistics Park",
      "barangayId": "sultan_kudarat",
      "barangayName": "Sultan Kudarat (Nuling)",
      "coords": [
        7.2465,
        124.2555
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Sultan Kudarat (Nuling)",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_sultan_kudarat_2",
      "name": "Sultan Kudarat (Nuling) Industrial & Agro-Processing Center",
      "barangayId": "sultan_kudarat",
      "barangayName": "Sultan Kudarat (Nuling)",
      "coords": [
        7.2425,
        124.26
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Narciso Ramos Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_parang_1",
      "name": "Parang Central Commercial & Logistics Park",
      "barangayId": "parang",
      "barangayName": "Parang",
      "coords": [
        7.3765,
        124.2655
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Parang",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_parang_2",
      "name": "Parang Industrial & Agro-Processing Center",
      "barangayId": "parang",
      "barangayName": "Parang",
      "coords": [
        7.3725,
        124.27
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Parang-Malabang Road Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_sultan_mastura_1",
      "name": "Sultan Mastura Central Commercial & Logistics Park",
      "barangayId": "sultan_mastura",
      "barangayName": "Sultan Mastura",
      "coords": [
        7.3165,
        124.2725
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Sultan Mastura",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_sultan_mastura_2",
      "name": "Sultan Mastura Industrial & Agro-Processing Center",
      "barangayId": "sultan_mastura",
      "barangayName": "Sultan Mastura",
      "coords": [
        7.3125,
        124.277
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Narciso Ramos Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_matanog_1",
      "name": "Matanog Central Commercial & Logistics Park",
      "barangayId": "matanog",
      "barangayName": "Matanog",
      "coords": [
        7.4465,
        124.2955
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Matanog",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_matanog_2",
      "name": "Matanog Industrial & Agro-Processing Center",
      "barangayId": "matanog",
      "barangayName": "Matanog",
      "coords": [
        7.4425,
        124.3
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Narciso Ramos Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_barira_1",
      "name": "Barira Central Commercial & Logistics Park",
      "barangayId": "barira",
      "barangayName": "Barira",
      "coords": [
        7.4865,
        124.3455
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Barira",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_barira_2",
      "name": "Barira Industrial & Agro-Processing Center",
      "barangayId": "barira",
      "barangayName": "Barira",
      "coords": [
        7.4825,
        124.35
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Barira Interior Road Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_buldon_1",
      "name": "Buldon Central Commercial & Logistics Park",
      "barangayId": "buldon",
      "barangayName": "Buldon",
      "coords": [
        7.5165,
        124.3825
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Buldon",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_buldon_2",
      "name": "Buldon Industrial & Agro-Processing Center",
      "barangayId": "buldon",
      "barangayName": "Buldon",
      "coords": [
        7.5125,
        124.387
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Buldon Highland Corridor Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_upi_1",
      "name": "Upi (North Upi) Central Commercial & Logistics Park",
      "barangayId": "upi",
      "barangayName": "Upi (North Upi)",
      "coords": [
        7.0365,
        124.1625
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Upi (North Upi)",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_upi_2",
      "name": "Upi (North Upi) Industrial & Agro-Processing Center",
      "barangayId": "upi",
      "barangayName": "Upi (North Upi)",
      "coords": [
        7.0325,
        124.167
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Awang-Upi-Lebak Road Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_south_upi_1",
      "name": "South Upi Central Commercial & Logistics Park",
      "barangayId": "south_upi",
      "barangayName": "South Upi",
      "coords": [
        6.8665,
        124.1325
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, South Upi",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_south_upi_2",
      "name": "South Upi Industrial & Agro-Processing Center",
      "barangayId": "south_upi",
      "barangayName": "South Upi",
      "coords": [
        6.8625,
        124.137
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Timanan Corridor Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_dbs_1",
      "name": "Datu Blah Sinsuat Central Commercial & Logistics Park",
      "barangayId": "dbs",
      "barangayName": "Datu Blah Sinsuat",
      "coords": [
        7.1265,
        123.9925
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Datu Blah Sinsuat",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_dbs_2",
      "name": "Datu Blah Sinsuat Industrial & Agro-Processing Center",
      "barangayId": "dbs",
      "barangayName": "Datu Blah Sinsuat",
      "coords": [
        7.1225,
        123.997
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Coastal Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_kabuntalan_1",
      "name": "Kabuntalan Central Commercial & Logistics Park",
      "barangayId": "kabuntalan",
      "barangayName": "Kabuntalan",
      "coords": [
        7.1365,
        124.3825
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Kabuntalan",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_kabuntalan_2",
      "name": "Kabuntalan Industrial & Agro-Processing Center",
      "barangayId": "kabuntalan",
      "barangayName": "Kabuntalan",
      "coords": [
        7.1325,
        124.387
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Rio Grande Access Road Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_northern_kabuntalan_1",
      "name": "Northern Kabuntalan Central Commercial & Logistics Park",
      "barangayId": "northern_kabuntalan",
      "barangayName": "Northern Kabuntalan",
      "coords": [
        7.1965,
        124.4125
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Northern Kabuntalan",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_northern_kabuntalan_2",
      "name": "Northern Kabuntalan Industrial & Agro-Processing Center",
      "barangayId": "northern_kabuntalan",
      "barangayName": "Northern Kabuntalan",
      "coords": [
        7.1925,
        124.417
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Sabaken Corridor Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "five_a"
    },
    {
      "id": "fact_tibanga_1",
      "name": "Tibanga Central Commercial & Logistics Park",
      "barangayId": "tibanga",
      "barangayName": "Tibanga",
      "coords": [
        8.2395,
        124.2455
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Tibanga",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_tibanga_2",
      "name": "Tibanga Industrial & Agro-Processing Center",
      "barangayId": "tibanga",
      "barangayName": "Tibanga",
      "coords": [
        8.2355,
        124.25
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Andres Bonifacio Ave Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_tubod_1",
      "name": "Tubod Central Commercial & Logistics Park",
      "barangayId": "tubod",
      "barangayName": "Tubod",
      "coords": [
        8.2135,
        124.2355
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Tubod",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_tubod_2",
      "name": "Tubod Industrial & Agro-Processing Center",
      "barangayId": "tubod",
      "barangayName": "Tubod",
      "coords": [
        8.2095,
        124.24
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Macapagal Avenue Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_suarez_1",
      "name": "Suarez Central Commercial & Logistics Park",
      "barangayId": "suarez",
      "barangayName": "Suarez",
      "coords": [
        8.1935,
        124.2225
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Suarez",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_suarez_2",
      "name": "Suarez Industrial & Agro-Processing Center",
      "barangayId": "suarez",
      "barangayName": "Suarez",
      "coords": [
        8.1895,
        124.227
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "National Highway South Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_palao_1",
      "name": "Pala-o Central Commercial & Logistics Park",
      "barangayId": "palao",
      "barangayName": "Pala-o",
      "coords": [
        8.2265,
        124.2385
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Pala-o",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_palao_2",
      "name": "Pala-o Industrial & Agro-Processing Center",
      "barangayId": "palao",
      "barangayName": "Pala-o",
      "coords": [
        8.2225,
        124.243
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Roxas Avenue Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_hinaplanon_1",
      "name": "Hinaplanon Central Commercial & Logistics Park",
      "barangayId": "hinaplanon",
      "barangayName": "Hinaplanon",
      "coords": [
        8.2535,
        124.2595
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Hinaplanon",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_hinaplanon_2",
      "name": "Hinaplanon Industrial & Agro-Processing Center",
      "barangayId": "hinaplanon",
      "barangayName": "Hinaplanon",
      "coords": [
        8.2495,
        124.264
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Cagayan de Oro-Iligan Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_kiwalan_1",
      "name": "Kiwalan Central Commercial & Logistics Park",
      "barangayId": "kiwalan",
      "barangayName": "Kiwalan",
      "coords": [
        8.2795,
        124.2755
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Kiwalan",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_kiwalan_2",
      "name": "Kiwalan Industrial & Agro-Processing Center",
      "barangayId": "kiwalan",
      "barangayName": "Kiwalan",
      "coords": [
        8.2755,
        124.28
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "National Highway North Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_tambacan_1",
      "name": "Tambacan Central Commercial & Logistics Park",
      "barangayId": "tambacan",
      "barangayName": "Tambacan",
      "coords": [
        8.2225,
        124.2325
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Tambacan",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_tambacan_2",
      "name": "Tambacan Industrial & Agro-Processing Center",
      "barangayId": "tambacan",
      "barangayName": "Tambacan",
      "coords": [
        8.2185,
        124.237
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Cabili Avenue Link Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_saray_1",
      "name": "Saray Central Commercial & Logistics Park",
      "barangayId": "saray",
      "barangayName": "Saray",
      "coords": [
        8.2325,
        124.2365
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Saray",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_saray_2",
      "name": "Saray Industrial & Agro-Processing Center",
      "barangayId": "saray",
      "barangayName": "Saray",
      "coords": [
        8.2285,
        124.241
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Roxas Ave Extension Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_poblacion_iligan_1",
      "name": "Poblacion Central Commercial & Logistics Park",
      "barangayId": "poblacion_iligan",
      "barangayName": "Poblacion",
      "coords": [
        8.2295,
        124.2395
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Poblacion",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_poblacion_iligan_2",
      "name": "Poblacion Industrial & Agro-Processing Center",
      "barangayId": "poblacion_iligan",
      "barangayName": "Poblacion",
      "coords": [
        8.2255,
        124.244
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "General Wood St & Quezon Ave Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_buruun_1",
      "name": "Buru-un Central Commercial & Logistics Park",
      "barangayId": "buruun",
      "barangayName": "Buru-un",
      "coords": [
        8.1765,
        124.1825
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Buru-un",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_buruun_2",
      "name": "Buru-un Industrial & Agro-Processing Center",
      "barangayId": "buruun",
      "barangayName": "Buru-un",
      "coords": [
        8.1725,
        124.187
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "National Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_dalipuga_1",
      "name": "Dalipuga Central Commercial & Logistics Park",
      "barangayId": "dalipuga",
      "barangayName": "Dalipuga",
      "coords": [
        8.3165,
        124.2855
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Dalipuga",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_dalipuga_2",
      "name": "Dalipuga Industrial & Agro-Processing Center",
      "barangayId": "dalipuga",
      "barangayName": "Dalipuga",
      "coords": [
        8.3125,
        124.29
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Northern Coastal Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_baloi_1",
      "name": "Baloi Sector Central Commercial & Logistics Park",
      "barangayId": "baloi",
      "barangayName": "Baloi Sector",
      "coords": [
        8.1165,
        124.2125
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Baloi Sector",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_baloi_2",
      "name": "Baloi Sector Industrial & Agro-Processing Center",
      "barangayId": "baloi",
      "barangayName": "Baloi Sector",
      "coords": [
        8.1125,
        124.217
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Iligan-Marawi Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_linamon_1",
      "name": "Linamon Border Central Commercial & Logistics Park",
      "barangayId": "linamon",
      "barangayName": "Linamon Border",
      "coords": [
        8.1835,
        124.1655
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Linamon Border",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_linamon_2",
      "name": "Linamon Border Industrial & Agro-Processing Center",
      "barangayId": "linamon",
      "barangayName": "Linamon Border",
      "coords": [
        8.1795,
        124.17
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Lanao del Norte National Highway Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "glowing"
    },
    {
      "id": "fact_poblacion_cotabato_1",
      "name": "Poblacion Sector (1-9) Central Commercial & Logistics Park",
      "barangayId": "poblacion_cotabato",
      "barangayName": "Poblacion Sector (1-9)",
      "coords": [
        7.2251,
        124.2439
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Poblacion Sector (1-9)",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "imperial"
    },
    {
      "id": "fact_poblacion_cotabato_2",
      "name": "Poblacion Sector (1-9) Industrial & Agro-Processing Center",
      "barangayId": "poblacion_cotabato",
      "barangayName": "Poblacion Sector (1-9)",
      "coords": [
        7.2211,
        124.2484
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Sinsuat Avenue & Don Rufino Alonzo Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "imperial"
    },
    {
      "id": "fact_rosary_heights_1",
      "name": "Rosary Heights (1-13) Central Commercial & Logistics Park",
      "barangayId": "rosary_heights",
      "barangayName": "Rosary Heights (1-13)",
      "coords": [
        7.2095,
        124.2385
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Rosary Heights (1-13)",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "imperial"
    },
    {
      "id": "fact_rosary_heights_2",
      "name": "Rosary Heights (1-13) Industrial & Agro-Processing Center",
      "barangayId": "rosary_heights",
      "barangayName": "Rosary Heights (1-13)",
      "coords": [
        7.2055,
        124.243
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Sinsuat Ave & Notre Dame Ave Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "imperial"
    },
    {
      "id": "fact_tamontaka_1",
      "name": "Tamontaka Sector (1-5) Central Commercial & Logistics Park",
      "barangayId": "tamontaka",
      "barangayName": "Tamontaka Sector (1-5)",
      "coords": [
        7.1865,
        124.2255
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Tamontaka Sector (1-5)",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "imperial"
    },
    {
      "id": "fact_tamontaka_2",
      "name": "Tamontaka Sector (1-5) Industrial & Agro-Processing Center",
      "barangayId": "tamontaka",
      "barangayName": "Tamontaka Sector (1-5)",
      "coords": [
        7.1825,
        124.23
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Tamontaka-DOS Bypass Road Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "imperial"
    },
    {
      "id": "fact_kalanganan_1",
      "name": "Kalanganan Sector (1-2) Central Commercial & Logistics Park",
      "barangayId": "kalanganan",
      "barangayName": "Kalanganan Sector (1-2)",
      "coords": [
        7.2365,
        124.2025
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Kalanganan Sector (1-2)",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "imperial"
    },
    {
      "id": "fact_kalanganan_2",
      "name": "Kalanganan Sector (1-2) Industrial & Agro-Processing Center",
      "barangayId": "kalanganan",
      "barangayName": "Kalanganan Sector (1-2)",
      "coords": [
        7.2325,
        124.207
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Sultan Haji Hassanal Bolkiah Blvd Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "imperial"
    },
    {
      "id": "fact_bagua_1",
      "name": "Bagua Sector (1-3) Central Commercial & Logistics Park",
      "barangayId": "bagua",
      "barangayName": "Bagua Sector (1-3)",
      "coords": [
        7.2395,
        124.2355
      ],
      "category": "Commercial, Warehousing & Trading Depot",
      "address": "Logistics Corridor, Bagua Sector (1-3)",
      "workforceSize": "180+ Employees",
      "products": "FMCG distribution, wholesale retail, food logistics & teller hubs",
      "territoryKey": "imperial"
    },
    {
      "id": "fact_bagua_2",
      "name": "Bagua Sector (1-3) Industrial & Agro-Processing Center",
      "barangayId": "bagua",
      "barangayName": "Bagua Sector (1-3)",
      "coords": [
        7.2355,
        124.24
      ],
      "category": "Manufacturing, Fabrication & Agro-Industry",
      "address": "Dorotheo St & Rio Grande Banks Industrial Belt",
      "workforceSize": "140+ Employees",
      "products": "Agro-commodities, grain storage, fabrication, regional assembly",
      "territoryKey": "imperial"
    }
  ]
};

export function getSectorPerimeterRoute(sectorId, fallbackMandaueRoutes = {}) {
  if (!sectorId) return null;
  if (MULTI_ENTITY_PERIMETER_ROUTES[sectorId]) {
    return MULTI_ENTITY_PERIMETER_ROUTES[sectorId];
  }
  if (fallbackMandaueRoutes && fallbackMandaueRoutes[sectorId]) {
    return fallbackMandaueRoutes[sectorId];
  }
  return null;
}

export function getTerritoryPOIs(territoryKey, fallbackMandauePois = { terminals: [], factories: [] }) {
  const mandaueTerminals = (fallbackMandauePois?.terminals || []).map(t => ({ ...t, territoryKey: "lucky_betplay" }));
  const mandaueFactories = (fallbackMandauePois?.factories || []).map(f => ({ ...f, territoryKey: "lucky_betplay" }));

  const allTerminals = [...mandaueTerminals, ...MULTI_ENTITY_ALL_POIS.terminals];
  const allFactories = [...mandaueFactories, ...MULTI_ENTITY_ALL_POIS.factories];

  if (!territoryKey || territoryKey === "all") {
    return { terminals: allTerminals, factories: allFactories };
  }

  return {
    terminals: allTerminals.filter(t => t.territoryKey === territoryKey),
    factories: allFactories.filter(f => f.territoryKey === territoryKey)
  };
}

function isInsidePolygon(point, vs) {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > point[1]) !== (yj > point[1])) && (point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function detectSectorInTerritory(lat, lng, territoryKey = "all") {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  if (isNaN(numLat) || isNaN(numLng)) return null;

  const pt = [numLat, numLng];

  for (const [id, route] of Object.entries(MULTI_ENTITY_PERIMETER_ROUTES)) {
    if (territoryKey !== "all" && route.territoryKey !== territoryKey) continue;
    if (route.boundaryPolygon && route.boundaryPolygon.length > 2) {
      if (isInsidePolygon(pt, route.boundaryPolygon)) {
        return {
          id: route.id,
          name: route.name,
          territoryKey: route.territoryKey,
          companyName: route.companyName,
          address: route.territoryKey === "imperial"
            ? `Brgy. ${route.name}, Cotabato City`
            : route.territoryKey === "glowing"
            ? `Brgy. ${route.name}, Iligan City`
            : `${route.name}, Maguindanao del Norte`,
          confidence: "100% Cadastral Survey Match",
          detail: `Coordinates fall strictly within official survey boundary polygon of ${route.name}.`
        };
      }
    }
  }

  if (numLat >= 7.15 && numLat <= 7.27 && numLng >= 124.18 && numLng <= 124.28) {
    let closest = COTABATO_SECTORS[0];
    let minDist = Infinity;
    COTABATO_SECTORS.forEach((s) => {
      const d = Math.hypot(s.coords[0] - numLat, s.coords[1] - numLng);
      if (d < minDist) { minDist = d; closest = s; }
    });
    return {
      id: closest.id,
      name: closest.name,
      territoryKey: "imperial",
      companyName: "Imperial Gaming OPC",
      address: `Brgy. ${closest.name}, Cotabato City`,
      confidence: "Sector Cadastral Match",
      detail: `Coordinates confirmed within Cotabato City (${closest.landmark}).`
    };
  }

  if (numLat >= 6.80 && numLat <= 7.60 && numLng >= 123.90 && numLng <= 124.50) {
    let closest = MAGUINDANAO_SECTORS[0];
    let minDist = Infinity;
    MAGUINDANAO_SECTORS.forEach((s) => {
      const d = Math.hypot(s.coords[0] - numLat, s.coords[1] - numLng);
      if (d < minDist) { minDist = d; closest = s; }
    });
    return {
      id: closest.id,
      name: closest.name,
      territoryKey: "five_a",
      companyName: "5A Royal Gaming OPC",
      address: `${closest.name}, Maguindanao del Norte`,
      confidence: "Sector Match",
      detail: `Coordinates located in ${closest.name} (${closest.landmark}).`
    };
  }

  if (numLat >= 8.05 && numLat <= 8.38 && numLng >= 124.12 && numLng <= 124.35) {
    let closest = ILIGAN_SECTORS[0];
    let minDist = Infinity;
    ILIGAN_SECTORS.forEach((s) => {
      const d = Math.hypot(s.coords[0] - numLat, s.coords[1] - numLng);
      if (d < minDist) { minDist = d; closest = s; }
    });
    return {
      id: closest.id,
      name: closest.name,
      territoryKey: "glowing",
      companyName: "Glowing Fortune",
      address: `Brgy. ${closest.name}, Iligan City`,
      confidence: "Sector Cadastral Match",
      detail: `Coordinates confirmed within Iligan City (${closest.landmark}).`
    };
  }

  return null;
}
