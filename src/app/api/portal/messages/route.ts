import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const patientId = req.nextUrl.searchParams.get("client_id");
  if (!patientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });
  const { data } = await supabaseAdmin
    .from("portal_messages")
    .select("*")
    .eq("client_id", patientId)
    .order("created_at", { ascending: false });
  return NextResponse.json({ messages: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const orgId = await getOrgId(userId);
  const isStaffReply = body.direction === "outbound";

  const { data, error } = await supabaseAdmin.from("portal_messages").insert({
    organization_id: orgId,
    client_id: body.client_id,
    portal_user_id: body.portal_user_id || null,
    direction: isStaffReply ? "outbound" : "inbound",
    subject: body.subject || null,
    body: body.body,
    sender_clerk_id: isStaffReply ? userId : null,
    is_read: false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If patient sent message: notify care team (all clinicians + admins in org)
  if (!isStaffReply && body.client_id) {
    const { data: patient } = await supabaseAdmin
      .from("clients")
      .select("first_name, last_name")
      .eq("id", body.client_id)
      .single();

    const { data: staff } = await supabaseAdmin
      .from("user_profiles")
      .select("clerk_user_id")
      .eq("organization_id", orgId)
      .in("role", ["clinician", "admin", "supervisor", "billing"]);

    if (staff && staff.length > 0) {
      const notifications = staff.map(s => ({
        user_clerk_id: s.clerk_user_id,
        type: "portal_message",
        title: `Portal message from ${patient ? `${patient.first_name} ${patient.last_name}` : "a patient"}`,
        message: body.body?.slice(0, 120) + (body.body?.length > 120 ? "..." : ""),
        entity_type: "portal_message",
        entity_id: data?.id || null,
        link: `/dashboard/clients/${body.client_id}?tab=messages`,
        is_read: false,
      }));
      await supabaseAdmin.from("notifications").insert(notifications);
    }
  }

  return NextResponse.json({ message: data }, { status: 201 });
}
