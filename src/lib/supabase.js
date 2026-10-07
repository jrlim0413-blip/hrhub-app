import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_API_ANON || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase credentials missing: check VITE_API_URL / VITE_API_ANON in .env");
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
export default supabase;
