import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tmwdorxpimcrwclldxxz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_nnJQMUGS-MUdxWVkhb9eDQ_VcN1Jdg7";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});
