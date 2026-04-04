import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

// Client-side Supabase instance — uses anon key, RLS enforced.
// Credentials are scoped per environment (dev / staging / prod).
export const supabase = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY());
