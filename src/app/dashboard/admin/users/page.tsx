import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Get or create user profile
  let { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("clerk_user_id", user.id)
    .single();

  if (!profile) {
    // Auto-create profile from Clerk data
    const { data: newProfile } = await supabaseAdmin
      .from("user_profiles")
      .upsert({
        clerk_user_id: user.id,
        first_name: user.firstName || "",
        last_name: user.lastName || "",
        email: user.emailAddresses?.[0]?.emailAddress || "",
        roles: ["clinician"],
      }, { onConflict: "clerk_user_id" })
      .select()
      .single();
    profile = newProfile;
  }

  const orgId = profile?.organization_id;

  // If user has an org, show all org users; otherwise show just their own profile
  let users;
  if (orgId) {
    const { data } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("organization_id", orgId)
      .order("last_name");
    users = data || [];
  } else {
    users = profile ? [profile] : [];
  }

  return <UsersClient users={users} currentUserId={user.id} isAdmin={(profile?.roles || [profile?.role]).includes("admin")} />;
}
