import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727";


  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();

  return <SettingsClient org={org} key={org?.updated_at || "settings"} />;
}
