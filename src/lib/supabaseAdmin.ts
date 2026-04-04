import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./env";

// Server-side Supabase admin client — uses service-role key, bypasses RLS.
// Credentials are scoped per environment (dev / staging / prod).
// NEVER expose this client or its key to the browser.
export const supabaseAdmin = createClient(
  SUPABASE_URL(),
  SUPABASE_SERVICE_ROLE_KEY(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);
