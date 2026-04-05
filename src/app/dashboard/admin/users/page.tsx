import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727";


  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, role")
    .eq("clerk_user_id", user.id)
    .single();

  const { data: users } = await supabaseAdmin
    .from("user_profiles")
    .select("*")
    .eq("organization_id", profile?.organization_id || orgId)
    .order("last_name");

  return <UsersClient users={users || []} currentUserId={user.id} />;
}
