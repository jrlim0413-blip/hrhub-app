import { createClient } from "@supabase/supabase-js";
import { API_CONFIG } from "../config/apiConfig";

const supabaseUrl = API_CONFIG.SUPABASE_URL;
const supabaseAnonKey = API_CONFIG.SUPABASE_ANON;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export default supabase;
