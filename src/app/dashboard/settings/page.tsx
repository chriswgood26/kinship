import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id, role, roles").eq("clerk_user_id", user.id).single();
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("id, name, npi, tax_id, phone, email, website, address_line1, city, state, zip, client_terminology, org_type, referral_due_days, referral_due_business_days, plan, addons, requested_plan, restrict_to_credentialed_payers")
    .eq("id", profile?.organization_id || "")
    .single();

  return <SettingsClient org={org} userRoles={profile?.roles || [profile?.role || "clinician"]} />;
}
