// POST /api/portal/users/[id]/invite — resend portal invitation email
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPortalInviteEmail } from "@/lib/portalInvite";
import { randomBytes } from "crypto";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fetch the portal user
  const { data: portalUser, error: fetchError } = await supabaseAdmin
    .from("portal_users")
    .select("*, client:client_id(first_name, last_name), org:organization_id(name)")
    .eq("id", id)
    .single();

  if (fetchError || !portalUser) return NextResponse.json({ error: "Portal user not found" }, { status: 404 });
  if (portalUser.invite_accepted_at) return NextResponse.json({ error: "Invitation already accepted" }, { status: 400 });

  // Generate a fresh token
  const inviteToken = randomBytes(32).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("portal_users")
    .update({ invite_token: inviteToken, invite_expires_at: inviteExpiresAt })
    .eq("id", id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const orgName = (Array.isArray(portalUser.org) ? portalUser.org[0]?.name : portalUser.org?.name) || "your care team";
  const client = Array.isArray(portalUser.client) ? portalUser.client[0] : portalUser.client;
  const patientName = client ? `${client.first_name} ${client.last_name}` : undefined;

  const emailResult = await sendPortalInviteEmail({
    to: portalUser.email,
    firstName: portalUser.first_name || portalUser.email,
    inviteToken,
    orgName,
    patientName,
  });

  if (!emailResult.success) {
    return NextResponse.json({ error: `Email failed: ${emailResult.error}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
