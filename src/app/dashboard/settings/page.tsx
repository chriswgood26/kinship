import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id, role").eq("clerk_user_id", user.id).single();
  const { data: org } = await supabaseAdmin.from("organizations").select("*").eq("id", profile?.organization_id || "").single();

  return <SettingsClient org={org} userRole={profile?.role || "clinician"} />;
}
