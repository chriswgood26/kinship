import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { sendEmail } from "@/lib/communications";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  // Scope to org to prevent cross-org data leaks
  const { data } = await supabaseAdmin
    .from("portal_messages")
    .select("*")
    .eq("organization_id", orgId)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    action: "view",
    resource_type: "portal_message",
    client_id: clientId,
    description: `Viewed portal messages for client ${clientId}`,
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ messages: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  const orgId = await getOrgId(userId);
  const isStaffReply = body.direction === "outbound";

  // Resolve sender display name
  let senderName: string | null = null;
  if (isStaffReply) {
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("first_name, last_name, credentials")
      .eq("clerk_user_id", userId)
      .single();
    if (profile) {
      senderName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
      if (profile.credentials) senderName += `, ${profile.credentials}`;
    }
  } else if (body.portal_user_id) {
    const { data: pu } = await supabaseAdmin
      .from("portal_users")
      .select("first_name, last_name")
      .eq("id", body.portal_user_id)
      .single();
    if (pu) senderName = [pu.first_name, pu.last_name].filter(Boolean).join(" ");
  }

  const { data, error } = await supabaseAdmin.from("portal_messages").insert({
    organization_id: orgId,
    client_id: body.client_id,
    portal_user_id: body.portal_user_id || null,
    direction: isStaffReply ? "outbound" : "inbound",
    subject: body.subject || null,
    body: body.body,
    sender_clerk_id: isStaffReply ? userId : null,
    sender_name: senderName,
    is_read: false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    user_name: senderName,
    action: "create",
    resource_type: "portal_message",
    resource_id: data?.id ?? null,
    client_id: body.client_id ?? null,
    description: isStaffReply
      ? `Sent portal message to client ${body.client_id}`
      : `Received portal message from patient for client ${body.client_id}`,
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  const msgId = data?.id || null;

  if (!isStaffReply && body.client_id) {
    // Patient → staff: in-app notifications + email each staff member
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("first_name, last_name")
      .eq("id", body.client_id)
      .single();

    const { data: staff } = await supabaseAdmin
      .from("user_profiles")
      .select("clerk_user_id, email, first_name, last_name")
      .eq("organization_id", orgId)
      .in("role", ["clinician", "admin", "supervisor", "billing"]);

    const clientName = client ? `${client.first_name} ${client.last_name}` : "a client";

    if (staff && staff.length > 0) {
      // In-app notifications
      const notifications = staff.map(s => ({
        user_clerk_id: s.clerk_user_id,
        type: "portal_message",
        title: `Portal message from ${clientName}`,
        message: body.body?.slice(0, 120) + (body.body?.length > 120 ? "..." : ""),
        entity_type: "portal_message",
        entity_id: msgId,
        link: `/dashboard/clients/${body.client_id}?tab=messages`,
        is_read: false,
      }));
      await supabaseAdmin.from("notifications").insert(notifications);

      // Email notifications
      for (const s of staff) {
        if (!s.email) continue;
        await sendEmail({
          to: s.email,
          subject: `New portal message from ${clientName}`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
              <div style="background:#0d9488;padding:20px 24px;border-radius:12px 12px 0 0">
                <h2 style="color:#fff;margin:0;font-size:18px">New Portal Message</h2>
              </div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
                <p style="margin:0 0 12px">Hi ${s.first_name || "there"},</p>
                <p style="margin:0 0 12px"><strong>${clientName}</strong> sent you a secure message${body.subject ? ` about "<em>${body.subject}</em>"` : ""}:</p>
                <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #0d9488;border-radius:4px;font-size:14px;color:#475569">
                  ${body.body?.slice(0, 300)}${body.body?.length > 300 ? "…" : ""}
                </blockquote>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com"}/dashboard/clients/${body.client_id}?tab=messages"
                   style="display:inline-block;background:#0d9488;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                  View &amp; Reply
                </a>
                <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">This is a secure message from Kinship EHR. Do not reply to this email.</p>
              </div>
            </div>
          `,
        });
      }
    }
  } else if (isStaffReply && body.client_id) {
    // Staff → patient: email the portal user(s) for this client
    const { data: portalUsers } = await supabaseAdmin
      .from("portal_users")
      .select("email, first_name, client_id")
      .eq("client_id", body.client_id)
      .eq("is_active", true);

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name")
      .eq("id", orgId)
      .single();

    const orgName = org?.name || "Your care team";

    if (portalUsers && portalUsers.length > 0) {
      for (const pu of portalUsers) {
        if (!pu.email) continue;
        await sendEmail({
          to: pu.email,
          subject: body.subject ? `Re: ${body.subject}` : "New message from your care team",
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
              <div style="background:#0d9488;padding:20px 24px;border-radius:12px 12px 0 0">
                <h2 style="color:#fff;margin:0;font-size:18px">Message from Your Care Team</h2>
              </div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
                <p style="margin:0 0 12px">Hi ${pu.first_name || "there"},</p>
                <p style="margin:0 0 12px">You have a new secure message from <strong>${senderName || orgName}</strong>${body.subject ? ` about "<em>${body.subject}</em>"` : ""}:</p>
                <blockquote style="margin:0 0 16px;padding:12px 16px;background:#f8fafc;border-left:3px solid #0d9488;border-radius:4px;font-size:14px;color:#475569">
                  ${body.body?.slice(0, 300)}${body.body?.length > 300 ? "…" : ""}
                </blockquote>
                <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com"}/portal/messages"
                   style="display:inline-block;background:#0d9488;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                  View in Patient Portal
                </a>
                <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">This is a secure message from ${orgName}. Do not reply to this email — use the portal link above.</p>
              </div>
            </div>
          `,
        });
      }
    }
  }

  return NextResponse.json({ message: data }, { status: 201 });
}
