import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { sendPortalInviteEmail } from "@/lib/portalInvite";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();
  if (!body.client_id || !body.email || !body.first_name) return NextResponse.json({ error: "client_id, email, and first_name required" }, { status: 400 });

  // Generate a secure invite token valid for 72 hours
  const inviteToken = randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin.from("portal_users").insert({
    organization_id: orgId,
    client_id: body.client_id,
    clerk_user_id: `portal_pending_${Date.now()}`,
    email: body.email,
    first_name: body.first_name,
    last_name: body.last_name || null,
    relationship: body.relationship || "patient",
    is_active: true,
    access_settings: body.access_settings || { appointments: true, documents: false, notes: false, billing: false, treatment_plan: false, messages: false },
    invited_by: userId,
    invite_token: inviteToken,
    invite_expires_at: inviteExpiresAt,
  }).select("*, client:client_id(first_name, last_name), org:organization_id(name)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send invitation email (best-effort — don't fail the request if email fails)
  const emailResult = await sendPortalInviteEmail({
    to: body.email,
    firstName: body.first_name,
    inviteToken,
    orgName: (Array.isArray(data.org) ? data.org[0]?.name : data.org?.name) || "your care team",
    patientName: (() => {
      const c = Array.isArray(data.client) ? data.client[0] : data.client;
      return c ? `${c.first_name} ${c.last_name}` : undefined;
    })(),
  });

  return NextResponse.json({ portalUser: data, emailSent: emailResult.success }, { status: 201 });
}
