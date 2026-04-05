// PATCH — staff auth required — approve or reject a registration request

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { sendPortalInviteEmail } from "@/lib/portalInvite";
import { randomBytes } from "crypto";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { id } = await params;
  const body = await req.json();
  const { action, rejection_reason, client_id, access_settings } = body;

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  // Fetch the registration request (must belong to this org)
  const { data: request, error: fetchError } = await supabaseAdmin
    .from("portal_registration_requests")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (fetchError || !request) {
    return NextResponse.json({ error: "Registration request not found" }, { status: 404 });
  }

  if (request.status !== "pending") {
    return NextResponse.json({ error: "This request has already been reviewed" }, { status: 409 });
  }

  if (action === "reject") {
    await supabaseAdmin
      .from("portal_registration_requests")
      .update({
        status: "rejected",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejection_reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ status: "rejected" });
  }

  // APPROVE — requires client_id to link the portal account to an existing client record
  if (!client_id) {
    return NextResponse.json({ error: "client_id is required when approving a registration" }, { status: 400 });
  }

  // Verify the client belongs to this org
  const { data: client, error: clientError } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name")
    .eq("id", client_id)
    .eq("organization_id", orgId)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: "Client not found in this organization" }, { status: 404 });
  }

  // Check if a portal account already exists for this email in this org
  const { data: existingPortalUser } = await supabaseAdmin
    .from("portal_users")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", request.email)
    .maybeSingle();

  if (existingPortalUser) {
    return NextResponse.json({ error: "A portal account with this email already exists" }, { status: 409 });
  }

  // Get org name for invite email
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  const inviteToken = randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const defaultAccess = access_settings || {
    appointments: true,
    documents: false,
    notes: false,
    billing: false,
    treatment_plan: false,
    messages: true,
  };

  // Create portal_users record
  const { data: portalUser, error: puError } = await supabaseAdmin
    .from("portal_users")
    .insert({
      organization_id: orgId,
      client_id,
      clerk_user_id: `portal_pending_${Date.now()}`,
      email: request.email,
      first_name: request.first_name,
      last_name: request.last_name,
      relationship: request.relationship || "self",
      is_active: true,
      access_settings: defaultAccess,
      invited_by: userId,
      invite_token: inviteToken,
      invite_expires_at: inviteExpiresAt,
    })
    .select("id")
    .single();

  if (puError) return NextResponse.json({ error: puError.message }, { status: 500 });

  // Update the registration request
  await supabaseAdmin
    .from("portal_registration_requests")
    .update({
      status: "approved",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      portal_user_id: portalUser.id,
      client_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Send invite email
  const emailResult = await sendPortalInviteEmail({
    to: request.email,
    firstName: request.first_name,
    inviteToken,
    orgName: org?.name || "your care team",
    patientName: `${client.first_name} ${client.last_name}`,
  });

  return NextResponse.json({
    status: "approved",
    portal_user_id: portalUser.id,
    emailSent: emailResult.success,
  });
}
