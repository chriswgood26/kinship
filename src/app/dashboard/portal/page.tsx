import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import PortalManagementClient from "./PortalManagementClient";
import RegistrationRequestsManager from "./RegistrationRequestsManager";
import PortalManagementTabs from "./PortalManagementTabs";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";

export default async function PortalManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");

  const { tab } = await searchParams;
  const activeTab = tab === "registrations" ? "registrations" : "accounts";

  const [portalUsersResult, patientsResult, orgResult, registrationsResult] = await Promise.all([
    supabaseAdmin
      .from("portal_users")
      .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("clients")
      .select("id, first_name, last_name, mrn, date_of_birth")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("last_name"),
    supabaseAdmin
      .from("organizations")
      .select("slug, name")
      .eq("id", orgId)
      .single(),
    supabaseAdmin
      .from("portal_registration_requests")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
  ]);

  const portalUsers = portalUsersResult.data || [];
  const patients = patientsResult.data || [];
  const org = orgResult.data;
  const registrationRequests = registrationsResult.data || [];
  const pendingCount = registrationRequests.filter(r => r.status === "pending").length;

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com";
  const registrationUrl = org?.slug ? `${APP_URL}/register/${org.slug}` : null;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Patient Portal Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage portal access for patients, family members, and community partners</p>
        </div>
      </div>

      {registrationUrl && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl px-5 py-4 text-sm text-teal-800">
          <p className="font-semibold mb-1">Self-Registration Link</p>
          <p className="text-xs text-teal-700 mb-2">Share this link with patients who want to request portal access. Their requests will appear in the Registrations tab for your review.</p>
          <div className="flex items-center gap-2">
            <code className="bg-white border border-teal-200 rounded-lg px-3 py-1.5 text-xs text-teal-900 flex-1 truncate">{registrationUrl}</code>
            <CopyButton text={registrationUrl} />
          </div>
        </div>
      )}

      <PortalManagementTabs activeTab={activeTab} pendingCount={pendingCount} />

      {activeTab === "accounts" && (
        <>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
            <strong>How it works:</strong> Create a portal account for a patient, family member, parole officer, or other authorized person. Each account is linked to a patient record and you control exactly what they can see — appointments, documents, visit notes, billing, and more.
          </div>
          <PortalManagementClient portalUsers={portalUsers} patients={patients} />
        </>
      )}

      {activeTab === "registrations" && (
        <>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
            <strong>Review self-registration requests:</strong> When a patient submits a registration request via your portal sign-up link, it appears here. Approve requests by linking them to an existing client record — an invitation email is sent automatically. Reject requests that can&apos;t be verified.
          </div>
          <RegistrationRequestsManager requests={registrationRequests} clients={patients} />
        </>
      )}
    </div>
  );
}

// CopyButton is defined as a client component in CopyButton.tsx
