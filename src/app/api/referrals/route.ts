import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { sendEmail } from "@/lib/communications";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();

  if (!body.client_id && body.referral_type !== "incoming") {
    return NextResponse.json(
      { error: "client_id required for outgoing/internal referrals" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("referrals")
    .insert({
      organization_id: orgId,
      client_id: body.client_id || null,
      referral_type: body.referral_type || "outgoing",
      status: "pending",
      priority: body.priority || "routine",
      referred_by: body.referred_by || null,
      referred_by_email: body.referred_by_email || null,
      referred_to: body.referred_to || null,
      referred_to_email: body.referred_to_email || null,
      referred_to_org: body.referred_to_org || null,
      reason: body.reason || null,
      notes: body.notes || null,
      referral_date: body.referral_date || new Date().toISOString().split("T")[0],
      due_date: body.due_date || null,
      applicant_email: body.applicant_email || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Look up org info for emails
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("name, email, phone")
    .eq("id", orgId)
    .single();

  const orgName = org?.name || "Our Organization";
  const sender = await currentUser();
  const senderName =
    [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") || "A provider";

  // ── OUTGOING REFERRAL EMAIL ──
  // Send email to the receiving provider when an outgoing referral is created
  if (body.referral_type === "outgoing" && body.referred_to_email) {
    const patientLabel = body.patient_name || "a patient";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://app.kinshipehr.com";

    await sendEmail({
      to: body.referred_to_email,
      subject: `Referral from ${orgName}: ${patientLabel}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;">
          <h2 style="color:#0f766e;">Outgoing Referral — ${orgName}</h2>
          <p>Hello${body.referred_to ? ` ${body.referred_to}` : ""},</p>
          <p>
            ${senderName} at <strong>${orgName}</strong> has sent you a referral for
            <strong>${patientLabel}</strong>.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr><td style="padding:8px;background:#f8fafc;font-weight:600;width:140px;">Priority</td>
                <td style="padding:8px;${body.priority === "emergent" ? "color:#dc2626;font-weight:700;text-transform:uppercase;" : body.priority === "urgent" ? "color:#d97706;font-weight:600;text-transform:uppercase;" : ""}">${body.priority || "Routine"}</td></tr>
            ${body.referral_date ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Referral Date</td><td style="padding:8px;">${new Date(body.referral_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</td></tr>` : ""}
            ${body.due_date ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Response By</td><td style="padding:8px;">${new Date(body.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</td></tr>` : ""}
            ${body.reason ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Reason</td><td style="padding:8px;">${body.reason}</td></tr>` : ""}
            ${body.notes ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Notes</td><td style="padding:8px;">${body.notes}</td></tr>` : ""}
          </table>
          <p style="margin-top:20px;color:#64748b;font-size:13px;">
            Sent by ${senderName} at ${orgName}${org?.phone ? ` · ${org.phone}` : ""}${org?.email ? ` · ${org.email}` : ""}
          </p>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Kinship EHR · Referral Management</p>
        </div>
      `,
    });
  }

  // ── INTERNAL NOTIFICATION ──
  if (body.assigned_to_clerk_id) {
    await supabaseAdmin.from("notifications").insert({
      user_clerk_id: body.assigned_to_clerk_id,
      type: "referral",
      title: `New referral assigned to you`,
      body: `${senderName}: ${body.reason || "No reason provided"} — Priority: ${body.priority || "routine"}`,
      link: `/dashboard/referrals/${data.id}`,
    });
  }

  return NextResponse.json({ referral: data }, { status: 201 });
}
