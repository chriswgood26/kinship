import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { sendEmail, sendSMS } from "@/lib/communications";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const patientId = req.nextUrl.searchParams.get("client_id");
  const query = supabaseAdmin
    .from("client_communications")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(50);
  if (patientId) query.eq("client_id", patientId);
  const { data } = await query;
  return NextResponse.json({ communications: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { client_id, channel, to_address, subject, message, trigger } = body;

  if (!client_id || !channel || !to_address || !message) {
    return NextResponse.json({ error: "client_id, channel, to_address, message required" }, { status: 400 });
  }

  let deliveryResult: { success: boolean; id?: string; sid?: string; error?: string } = { success: false };

  if (channel === "email") {
    deliveryResult = await sendEmail({
      to: to_address,
      subject: subject || "Message from your care team",
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <p style="color:#0d1b2e;font-size:16px;line-height:1.6;">${message.replace(/\n/g, "<br/>")}</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
        <p style="color:#94a3b8;font-size:12px;">This message was sent from your care team via secure patient messaging. Do not reply to this email. For urgent matters, please call our office directly.</p>
      </div>`,
    });
  } else if (channel === "sms") {
    deliveryResult = await sendSMS({ to: to_address, body: message });
  }

  // Log the communication regardless of delivery success
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("first_name, last_name")
    .eq("clerk_user_id", userId)
    .single();

  const { data: log, error } = await supabaseAdmin.from("client_communications").insert({
    client_id,
    organization_id: orgId,
    channel,
    direction: "outbound",
    to_address,
    subject: subject || null,
    message,
    trigger: trigger || "manual",
    sent_by_clerk_id: userId,
    sent_by_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
    delivery_status: deliveryResult.success ? "sent" : "failed",
    delivery_error: deliveryResult.error || null,
    external_id: deliveryResult.id || deliveryResult.sid || null,
    sent_at: new Date().toISOString(),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    communication: log,
    delivered: deliveryResult.success,
    error: deliveryResult.success ? null : deliveryResult.error,
  }, { status: 201 });
}
