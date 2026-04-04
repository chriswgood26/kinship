import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/communications";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("referrals")
    .select("*, client:client_id(id, first_name, last_name, mrn)")
    .eq("id", id)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ referral: data });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  // Fetch existing referral to compare status & get email recipients
  const { data: existing } = await supabaseAdmin
    .from("referrals")
    .select("*, organization_id, referral_type, status, referred_by, referred_by_email, referred_to, referred_to_email, applicant_email, reason, client:client_id(first_name, last_name)")
    .eq("id", id)
    .single();

  const { data, error } = await supabaseAdmin
    .from("referrals")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── STATUS TRACKING EMAILS ──
  const oldStatus = existing?.status;
  const newStatus = body.status;

  if (newStatus && newStatus !== oldStatus && existing) {
    // Look up org info
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("name, phone, email")
      .eq("id", existing.organization_id)
      .single();

    const orgName = org?.name || "Our Team";
    const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

    const client = Array.isArray(existing.client) ? existing.client[0] : existing.client;
    const patientLabel = client
      ? `${client.first_name} ${client.last_name}`
      : (() => {
          const match = (existing.notes || "").match(/^Applicant: ([^|]+)/);
          return match ? match[1].trim() : "the applicant";
        })();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://app.kinshipehr.com";

    const statusBadgeColor =
      newStatus === "accepted" || newStatus === "completed"
        ? "#0f766e"
        : newStatus === "declined" || newStatus === "cancelled"
        ? "#dc2626"
        : "#d97706";

    const emailHtml = (recipientType: "referring" | "receiving") => `
      <div style="font-family:sans-serif;max-width:560px;margin:auto;">
        <h2 style="color:${statusBadgeColor};">Referral ${statusLabel}</h2>
        <p>
          The referral for <strong>${patientLabel}</strong> from <strong>${orgName}</strong>
          has been updated to <span style="color:${statusBadgeColor};font-weight:700;">${statusLabel}</span>.
        </p>
        ${
          body.status_note
            ? `<div style="background:#f8fafc;border-left:4px solid #e2e8f0;padding:12px 16px;margin:16px 0;border-radius:4px;">
                <p style="margin:0;color:#334155;font-size:14px;">${body.status_note}</p>
               </div>`
            : ""
        }
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <tr><td style="padding:8px;background:#f8fafc;font-weight:600;width:140px;">Patient/Applicant</td><td style="padding:8px;">${patientLabel}</td></tr>
          ${existing.reason ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Reason</td><td style="padding:8px;">${existing.reason}</td></tr>` : ""}
          <tr><td style="padding:8px;background:#f8fafc;font-weight:600;">New Status</td><td style="padding:8px;color:${statusBadgeColor};font-weight:700;">${statusLabel}</td></tr>
        </table>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
          ${orgName}${org?.phone ? ` · ${org.phone}` : ""}${org?.email ? ` · ${org.email}` : ""}<br/>
          Kinship EHR · Referral Management
        </p>
      </div>
    `;

    // For INCOMING referrals: email the referring provider about acceptance/decline
    if (existing.referral_type === "incoming" && existing.referred_by_email) {
      await sendEmail({
        to: existing.referred_by_email,
        subject: `Referral Update: ${patientLabel} — ${statusLabel}`,
        html: emailHtml("referring"),
      });
    }

    // For INCOMING referrals: also email the applicant if they provided an email
    if (
      existing.referral_type === "incoming" &&
      existing.applicant_email &&
      (newStatus === "accepted" || newStatus === "declined")
    ) {
      const applicantSubject =
        newStatus === "accepted"
          ? `Your referral to ${orgName} has been accepted`
          : `Update on your referral to ${orgName}`;
      const applicantHtml = `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;">
          <h2 style="color:${statusBadgeColor};">Referral ${statusLabel}</h2>
          ${
            newStatus === "accepted"
              ? `<p>Good news! Your referral to <strong>${orgName}</strong> has been accepted. Someone from our team will be in contact with you soon to schedule your first appointment.</p>`
              : `<p>We have reviewed your referral to <strong>${orgName}</strong> and unfortunately are unable to accept it at this time.${body.status_note ? ` ${body.status_note}` : ""}</p><p>Please contact your referring provider for next steps.</p>`
          }
          <p style="color:#64748b;font-size:13px;margin-top:16px;">${orgName}${org?.phone ? ` · ${org.phone}` : ""}${org?.email ? ` · ${org.email}` : ""}</p>
          <p style="color:#94a3b8;font-size:12px;">Kinship EHR · Referral Management</p>
        </div>
      `;
      await sendEmail({
        to: existing.applicant_email,
        subject: applicantSubject,
        html: applicantHtml,
      });
    }

    // For OUTGOING referrals: notify the receiving provider of status change
    if (existing.referral_type === "outgoing" && existing.referred_to_email) {
      await sendEmail({
        to: existing.referred_to_email,
        subject: `Referral Update: ${patientLabel} — ${statusLabel}`,
        html: emailHtml("receiving"),
      });
    }
  }

  return NextResponse.json({ referral: data });
}
