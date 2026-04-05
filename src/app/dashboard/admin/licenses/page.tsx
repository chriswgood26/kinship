import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LicensesClient from "./LicensesClient";

export const dynamic = "force-dynamic";

export default async function LicensesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, roles")
    .eq("clerk_user_id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/sign-in");

  const { data: users } = await supabaseAdmin
    .from("user_profiles")
    .select("id, first_name, last_name, email, title, credentials, roles, license_number, license_type, license_state, license_expiry_date, license_notes, is_active")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("last_name");

  return <LicensesClient users={users || []} />;
}
