import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PortalManagementClient from "./PortalManagementClient";

export const dynamic = "force-dynamic";

export default async function PortalManagementPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");


  const { data: portalUsers } = await supabaseAdmin
    .from("portal_users")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data: patients } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, mrn, preferred_name")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("last_name");

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Portal Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage portal access for patients, family members, and community partners</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
        <strong>How it works:</strong> Create a portal account for a patient, family member, parole officer, or other authorized person. Each account is linked to a patient record and you control exactly what they can see — appointments, documents, visit notes, billing, and more.
      </div>

      <PortalManagementClient portalUsers={portalUsers || []} patients={patients || []} />
    </div>
  );
}
