import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Get the organization ID for a given Clerk user ID.
 * Throws if no profile is found — prevents unknown users from accessing data.
 * Use this in ALL API routes instead of hardcoding the org ID.
 */
export async function getOrgId(clerkUserId: string): Promise<string> {
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (!profile?.organization_id) {
    throw new Error("No organization found for user");
  }

  return profile.organization_id;
}

/**
 * Get full user profile including org ID, role, and email.
 */
export async function getUserProfile(clerkUserId: string) {
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id, organization_id, role, roles, first_name, last_name, credentials, supervisor_id, email")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (!profile?.organization_id) {
    throw new Error("No organization found for user");
  }

  return {
    profile,
    orgId: profile.organization_id,
  };
}
