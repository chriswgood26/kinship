import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PortalAppointmentsClient from "./PortalAppointmentsClient";

export const dynamic = "force-dynamic";

export default async function PortalAppointmentsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users").select("*").eq("clerk_user_id", user.id).single();
  if (!portalUser || !portalUser.access_settings?.appointments) redirect("/portal/dashboard");

  const today = new Date().toISOString().split("T")[0];

  const { data: upcoming } = await supabaseAdmin
    .from("appointments")
    .select("id, appointment_date, start_time, appointment_type, status, notes")
    .eq("client_id", portalUser.client_id)
    .gte("appointment_date", today)
    .order("appointment_date")
    .limit(20);

  const { data: past } = await supabaseAdmin
    .from("appointments")
    .select("id, appointment_date, start_time, appointment_type, status")
    .eq("client_id", portalUser.client_id)
    .lt("appointment_date", today)
    .order("appointment_date", { ascending: false })
    .limit(10);

  const { data: myRequests } = await supabaseAdmin
    .from("appointment_requests")
    .select("id, requested_date, requested_time, appointment_type, status, notes, created_at")
    .eq("portal_user_id", portalUser.id)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <PortalAppointmentsClient
      upcoming={upcoming || []}
      past={past || []}
      myRequests={myRequests || []}
      portalUserId={portalUser.id}
    />
  );
}
