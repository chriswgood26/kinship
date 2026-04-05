import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PortalProfileClient from "./PortalProfileClient";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/portal/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("client_id, organization_id")
    .eq("clerk_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!portalUser) redirect("/portal/dashboard");

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select(
      "first_name, last_name, preferred_name, date_of_birth, gender, pronouns, " +
      "phone_primary, phone_secondary, email, address_line1, city, state, zip, " +
      "primary_language, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship"
    )
    .eq("id", portalUser.client_id)
    .eq("organization_id", portalUser.organization_id)
    .single();

  if (!client) redirect("/portal/dashboard");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-0.5">View and update your demographic information</p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <PortalProfileClient client={client as any} />
    </div>
  );
}
