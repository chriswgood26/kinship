import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { sendEmail } from "@/lib/communications";

/** PATCH — staff: confirm or deny an appointment request */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { id } = await params;
  const body = await req.json();
  const { action, appointment_date, start_time, end_time, provider_id, notes } = body;

  if (!["confirm", "deny"].includes(action)) {
    return NextResponse.json({ error: "action must be confirm or deny" }, { status: 400 });
  }

  // Fetch the request and verify org scope
  const { data: apptReq, error: fetchErr } = await supabaseAdmin
    .from("appointment_requests")
    .select("*, client:client_id(first_name, last_name, email), portal_user:portal_user_id(email, first_name)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (fetchErr || !apptReq) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (apptReq.status !== "pending") {
    return NextResponse.json({ error: "Request already reviewed" }, { status: 409 });
  }

  let newAppointmentId: string | null = null;

  if (action === "confirm") {
    // Create the real appointment
    const { data: newAppt, error: apptErr } = await supabaseAdmin
      .from("appointments")
      .insert({
        organization_id: orgId,
        client_id: apptReq.client_id,
        provider_id: provider_id || null,
        appointment_date: appointment_date || apptReq.requested_date,
        start_time: start_time || apptReq.requested_time || null,
        end_time: end_time || null,
        duration_minutes: 60,
        appointment_type: apptReq.appointment_type || "Individual Therapy",
        status: "confirmed",
        notes: notes || apptReq.notes || null,
      })
      .select()
      .single();

    if (apptErr) return NextResponse.json({ error: apptErr.message }, { status: 500 });
    newAppointmentId = newAppt?.id ?? null;
  }

  // Update request status
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("appointment_requests")
    .update({
      status: action === "confirm" ? "confirmed" : "denied",
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      appointment_id: newAppointmentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Notify patient via email
  const portalUser = Array.isArray(apptReq.portal_user)
    ? apptReq.portal_user[0]
    : apptReq.portal_user;
  const client = Array.isArray(apptReq.client) ? apptReq.client[0] : apptReq.client;
  const patientEmail = portalUser?.email || client?.email;
  const patientFirst = portalUser?.first_name || client?.first_name || "there";

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();
  const orgName = org?.name || "Your care team";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com";

  if (patientEmail) {
    if (action === "confirm") {
      const confirmedDate =
        appointment_date || apptReq.requested_date
          ? new Date(
              (appointment_date || apptReq.requested_date) + "T12:00:00"
            ).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
          : "TBD";
      const confirmedTime =
        start_time || apptReq.requested_time
          ? new Date(
              `2000-01-01T${start_time || apptReq.requested_time}`
            ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : "";

      sendEmail({
        to: patientEmail,
        subject: "Your appointment has been confirmed",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
            <div style="background:#0d9488;padding:20px 24px;border-radius:12px 12px 0 0">
              <h2 style="color:#fff;margin:0;font-size:18px">✅ Appointment Confirmed</h2>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
              <p style="margin:0 0 12px">Hi ${patientFirst},</p>
              <p style="margin:0 0 16px">Great news — your appointment request has been confirmed by ${orgName}.</p>
              <div style="background:#f0fdf9;border:1px solid #99f6e4;border-radius:10px;padding:16px;margin-bottom:20px">
                <div style="font-weight:700;color:#0d9488;font-size:16px;margin-bottom:8px">📅 ${confirmedDate}${confirmedTime ? ` · ${confirmedTime}` : ""}</div>
                <div style="color:#475569;font-size:14px">${apptReq.appointment_type || "Appointment"}</div>
              </div>
              <a href="${appUrl}/portal/appointments"
                 style="display:inline-block;background:#0d9488;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                View in Portal
              </a>
              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">Questions? Reply through your <a href="${appUrl}/portal/messages" style="color:#0d9488">secure portal messages</a>.</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    } else {
      sendEmail({
        to: patientEmail,
        subject: "Update on your appointment request",
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
            <div style="background:#64748b;padding:20px 24px;border-radius:12px 12px 0 0">
              <h2 style="color:#fff;margin:0;font-size:18px">Appointment Request Update</h2>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
              <p style="margin:0 0 12px">Hi ${patientFirst},</p>
              <p style="margin:0 0 16px">Unfortunately, ${orgName} is unable to confirm your appointment request at this time. Please reach out to us directly to find a suitable time.</p>
              <a href="${appUrl}/portal/messages"
                 style="display:inline-block;background:#0d9488;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                Message Your Care Team
              </a>
              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">This message is from ${orgName}.</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ request: updated, appointment_id: newAppointmentId });
}
