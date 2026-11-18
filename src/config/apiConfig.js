
export const API_CONFIG = {
  SUPABASE_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "https://ojjsejqsaflajpqwbmcr.supabase.co",
  SUPABASE_ANON: (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_ANON) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qanNlanFzYWZsYWpwcXdibWNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwNDM0ODAsImV4cCI6MjEwODYxOTQ4MH0.A5W507SDHt8pKpg50-gRRhA8aVyJF_D1K9ucLrQYOHs",

  AGENTS_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_AGENTS_API_URL) || "https://stl-mandaue-api.com/api/accountant/teller?id=2",
  AGENTS_TOKEN: (typeof import.meta !== "undefined" && import.meta.env?.VITE_AGENTS_API_TOKEN) || "7192|gnpqBM4WSclB34C1IUcuV7KQFK4uxPUO2B9fdwoI",
  SUPERVISOR_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPERVISOR_API_URL) || "https://stl-mandaue-api.com/api/accountant/supervisor?id=2",
  BARANGAYS_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_BARANGAYS_API_URL) || "https://stl-mandaue-api.com/api/admin/barangay",

  ACTIVE_TELLERS_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_ACTIVE_TELLERS_API_URL) || "https://stl-mandaue-api.com/api/accountant/ActiveTellers?id=2",
  GROSS_REPORT_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROSS_REPORT_API_URL) || "https://stl-mandaue-api.com/api/accountant/TellerGrossPerDateRange?id=2",
  GROSS_REPORT_TOKEN: (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROSS_REPORT_API_TOKEN) || "7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V",

  TELLER_BET_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_TELLER_BET_API_URL) || "https://stl-mandaue-api.com/api/teller/bet",
  TELLER_BET_TOKEN: (typeof import.meta !== "undefined" && import.meta.env?.VITE_TELLER_BET_API_TOKEN) || "7770|buTtUAGup02YXYefPfDwwh44wp0AOnRQuxsPHZ2f",

  GEMINI_API_KEY: (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) || "",

  TOMTOM_API_KEY: (typeof import.meta !== "undefined" && import.meta.env?.VITE_TOMTOM_API_KEY) || "",

  HR_EMAIL_WEBHOOK_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_HR_EMAIL_WEBHOOK_URL) || "",

  ZOOM_CONFIG: {
    SDK_KEY: (typeof import.meta !== "undefined" && import.meta.env?.VITE_ZOOM_SDK_KEY) || "kuZ0EnZWQ1WKsvU16cO3Ug",
    SDK_SECRET: (typeof import.meta !== "undefined" && import.meta.env?.VITE_ZOOM_SDK_SECRET) || "Ga7WezKPKlXnwXO1Jd6AfawgY0BV6wPv",
    ACCOUNT_ID: (typeof import.meta !== "undefined" && import.meta.env?.VITE_ZOOM_ACCOUNT_ID) || "",
    CLIENT_ID: (typeof import.meta !== "undefined" && import.meta.env?.VITE_ZOOM_CLIENT_ID) || "kuZ0EnZWQ1WKsvU16cO3Ug",
    CLIENT_SECRET: (typeof import.meta !== "undefined" && import.meta.env?.VITE_ZOOM_CLIENT_SECRET) || "Ga7WezKPKlXnwXO1Jd6AfawgY0BV6wPv"
  }
};

export default API_CONFIG;
