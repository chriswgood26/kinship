import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PortalDocumentsClient from "./PortalDocumentsClient";

export const dynamic = "force-dynamic";

export default async function PortalDocumentsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: portalUser } = await supabaseAdmin.from("portal_users").select("*").eq("clerk_user_id", user.id).single();
  if (!portalUser || !portalUser.access_settings?.documents) redirect("/portal/dashboard");

  const { data: documents } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("client_id", portalUser.client_id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
      <PortalDocumentsClient documents={documents || []} />
    </div>
  );
}
