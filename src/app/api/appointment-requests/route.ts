import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { sendEmail } from "@/lib/communications";

/** GET — staff: list appointment requests for their org */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const status = req.nextUrl.searchParams.get("status") || "pending";

  const query = supabaseAdmin
    .from("appointment_requests")
    .select("*, client:client_id(first_name, last_name, preferred_name, mrn)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  const { data, error } = status === "all"
    ? await query
    : await query.eq("status", status);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data || [] });
}

/** POST — patient portal: submit a new appointment request */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Resolve portal user → client
  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("id, client_id, organization_id, first_name, last_name, email")
    .eq("clerk_user_id", userId)
    .eq("is_active", true)
    .single();

  if (!portalUser) return NextResponse.json({ error: "Portal user not found" }, { status: 404 });

  const { data: request, error } = await supabaseAdmin
    .from("appointment_requests")
    .insert({
      organization_id: portalUser.organization_id,
      client_id: portalUser.client_id,
      portal_user_id: portalUser.id,
      requested_date: body.requested_date || null,
      requested_time: body.requested_time || null,
      appointment_type: body.appointment_type || null,
      notes: body.notes || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify staff by email + in-app notification
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("first_name, last_name")
    .eq("id", portalUser.client_id)
    .single();

  const clientName = client
    ? `${client.first_name} ${client.last_name}`
    : [portalUser.first_name, portalUser.last_name].filter(Boolean).join(" ") || "A patient";

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("name")
    .eq("id", portalUser.organization_id)
    .single();

  const { data: staff } = await supabaseAdmin
    .from("user_profiles")
    .select("clerk_user_id, email, first_name")
    .eq("organization_id", portalUser.organization_id)
    .overlaps("roles", ["clinician", "admin", "supervisor", "receptionist"]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.kinshipehr.com";

  if (staff && staff.length > 0) {
    // In-app notifications
    const notifications = staff.map((s) => ({
      user_clerk_id: s.clerk_user_id,
      type: "appointment_request",
      title: `Appointment request from ${clientName}`,
      message: [
        body.appointment_type,
        body.requested_date
          ? new Date(body.requested_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
          : null,
        body.requested_time
          ? new Date(`2000-01-01T${body.requested_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
          : null,
      ]
        .filter(Boolean)
        .join(" · ") || "No details provided",
      entity_type: "appointment_request",
      entity_id: request?.id ?? null,
      link: `/dashboard/scheduling?requests=1`,
      is_read: false,
    }));
    await supabaseAdmin.from("notifications").insert(notifications);

    // Email notifications (fire-and-forget)
    const dateStr = body.requested_date
      ? new Date(body.requested_date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      : "No specific date";
    const timeStr = body.requested_time
      ? new Date(`2000-01-01T${body.requested_time}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "Flexible";

    for (const s of staff) {
      if (!s.email) continue;
      sendEmail({
        to: s.email,
        subject: `Appointment request from ${clientName}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
            <div style="background:#0d9488;padding:20px 24px;border-radius:12px 12px 0 0">
              <h2 style="color:#fff;margin:0;font-size:18px">📅 New Appointment Request</h2>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px">
              <p style="margin:0 0 12px">Hi ${s.first_name || "there"},</p>
              <p style="margin:0 0 16px"><strong>${clientName}</strong> has requested an appointment via the patient portal.</p>
              <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px">
                <tr><td style="padding:6px 0;color:#64748b;width:120px">Type</td><td style="padding:6px 0;font-weight:600">${body.appointment_type || "Not specified"}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Preferred date</td><td style="padding:6px 0;font-weight:600">${dateStr}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Preferred time</td><td style="padding:6px 0;font-weight:600">${timeStr}</td></tr>
                ${body.notes ? `<tr><td style="padding:6px 0;color:#64748b;vertical-align:top">Notes</td><td style="padding:6px 0">${body.notes}</td></tr>` : ""}
              </table>
              <a href="${appUrl}/dashboard/scheduling?requests=1"
                 style="display:inline-block;background:#0d9488;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
                Review Request
              </a>
              <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">This notification is from ${org?.name || "Kinship EHR"}.</p>
            </div>
          </div>
        `,
      }).catch(() => {});
    }
  }

  return NextResponse.json({ request }, { status: 201 });
}
