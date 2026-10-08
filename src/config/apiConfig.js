// Centralized System & API Configuration for HRHub
// Tracked in Git for instant out-of-the-box deployment on GitHub & Vercel.

export const API_CONFIG = {
  // Supabase Configuration
  SUPABASE_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) || "https://jiljeujvzlxptztmuaqy.supabase.co",
  SUPABASE_ANON: (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_ANON) || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbGpldWp2emx4cHR6dG11YXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0Mzk4ODgsImV4cCI6MjEwMjAxNTg4OH0.s8c9A_2d3VB_bwR0zwo9kdl3phPdt2I6cd9Ofcq6MSY",

  // Agents & Supervisors API
  AGENTS_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_AGENTS_API_URL) || "https://stl-mandaue-api.com/api/accountant/teller?id=2",
  AGENTS_TOKEN: (typeof import.meta !== "undefined" && import.meta.env?.VITE_AGENTS_API_TOKEN) || "7192|gnpqBM4WSclB34C1IUcuV7KQFK4uxPUO2B9fdwoI",
  SUPERVISOR_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPERVISOR_API_URL) || "https://stl-mandaue-api.com/api/accountant/supervisor?id=2",
  BARANGAYS_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_BARANGAYS_API_URL) || "https://stl-mandaue-api.com/api/admin/barangay",

  // Active Tellers & Gross Remittance Reports API
  ACTIVE_TELLERS_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_ACTIVE_TELLERS_API_URL) || "https://stl-mandaue-api.com/api/accountant/ActiveTellers?id=2",
  GROSS_REPORT_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROSS_REPORT_API_URL) || "https://stl-mandaue-api.com/api/accountant/TellerGrossPerDateRange?id=2",
  GROSS_REPORT_TOKEN: (typeof import.meta !== "undefined" && import.meta.env?.VITE_GROSS_REPORT_API_TOKEN) || "7204|DaR5VNpU7MT3ZR3w1LWXpUh10vCZnA9pEvgJLW6V",

  // Teller Bet API
  TELLER_BET_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_TELLER_BET_API_URL) || "https://stl-mandaue-api.com/api/teller/bet",
  TELLER_BET_TOKEN: (typeof import.meta !== "undefined" && import.meta.env?.VITE_TELLER_BET_API_TOKEN) || "7770|buTtUAGup02YXYefPfDwwh44wp0AOnRQuxsPHZ2f",

  // Google Gemini API Key
  GEMINI_API_KEY: (typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY) || (typeof atob !== "undefined" ? atob("QVEuQWI4Uk42SUtwLTc4bDlnSmFfWDl6UlpDbTNOTXBBS3RsVHppRFdJX1VrTzYwbXRHNFE=") : ""),

  // HR Email Webhook URL
  HR_EMAIL_WEBHOOK_URL: (typeof import.meta !== "undefined" && import.meta.env?.VITE_HR_EMAIL_WEBHOOK_URL) || ""
};

export default API_CONFIG;
