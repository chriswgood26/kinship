import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Fallback for demo/dev — single org
const DEMO_ORG_ID = "34e600b3-beb0-440c-88c4-20032185e727";

/**
 * Get the organization ID for a given Clerk user ID.
 * Falls back to the demo org ID if the user has no profile yet.
 * Use this in ALL API routes instead of hardcoding the org ID.
 */
export async function getOrgId(clerkUserId: string): Promise<string> {
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  return profile?.organization_id || DEMO_ORG_ID;
}

/**
 * Get full user profile including org ID and role.
 */
export async function getUserProfile(clerkUserId: string) {
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, organization_id, role, first_name, last_name, credentials, supervisor_id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  return {
    profile,
    orgId: profile?.organization_id || DEMO_ORG_ID,
  };
}
