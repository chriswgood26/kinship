import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users").select("*").eq("clerk_user_id", userId).single();
  if (!portalUser) return NextResponse.json({ error: "Not a portal user" }, { status: 403 });

  const body = await req.json();

  const { data, error } = await supabaseAdmin.from("releases_of_information").insert({
    organization_id: portalUser.organization_id,
    client_id: portalUser.client_id,
    portal_user_id: portalUser.id,
    requested_via_portal: true,
    staff_reviewed: false,
    direction: "outgoing",
    recipient_name: body.recipient_name,
    recipient_organization: body.recipient_organization || null,
    recipient_phone: body.recipient_phone || null,
    recipient_fax: body.recipient_fax || null,
    recipient_address: body.recipient_address || null,
    purpose: body.purpose,
    information_to_release: body.information_to_release || [],
    specific_information: body.specific_information || null,
    effective_date: new Date().toISOString().split("T")[0],
    expiration_date: body.expiration_date || null,
    is_revocable: true,
    patient_signature_method: "portal_request",
    notes: body.notes || null,
    status: "pending_signature",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create staff notification
  await supabaseAdmin.from("notifications").insert({
    user_clerk_id: "user_3BSMNyYBQNMxfQdtad4Bctoc0q2", // org admin — in production, notify all admins
    type: "alert",
    title: `Patient ROI request from portal`,
    body: `${portalUser.first_name} ${portalUser.last_name} has requested a release of records to ${body.recipient_name}`,
    link: `/dashboard/roi/${data.id}`,
    is_read: false,
  });

  return NextResponse.json({ roi: data }, { status: 201 });
}
