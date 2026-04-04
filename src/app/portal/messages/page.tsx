import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PortalMessagesClient from "./PortalMessagesClient";

export const dynamic = "force-dynamic";

export default async function PortalMessagesPage() {
  const user = await currentUser();
  if (!user) redirect("/portal/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("*")
    .eq("clerk_user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!portalUser) redirect("/portal/dashboard");

  const access = portalUser.access_settings || {};
  if (access.messages === false) redirect("/portal/dashboard");

  const { data: messages } = await supabaseAdmin
    .from("portal_messages")
    .select("*")
    .eq("client_id", portalUser.client_id)
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-slate-500 text-sm mt-0.5">Secure messages with your care team</p>
      </div>
      <PortalMessagesClient
        initialMessages={messages || []}
        portalUserId={portalUser.id}
        clientId={portalUser.client_id}
      />
    </div>
  );
}
