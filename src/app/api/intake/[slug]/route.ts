import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/communications";

// Public endpoint — no auth required (intake form submissions from external providers)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Look up org by slug
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("id, name, email")
    .eq("slug", slug)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const body = await req.json();
  const {
    first_name,
    last_name,
    dob,
    phone,
    email: applicant_email,
    insurance,
    reason,
    notes,
    referred_by,
    referred_by_email,
    referred_by_phone,
    priority = "routine",
  } = body;

  if (!first_name || !last_name) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
  }

  const notesText = [
    `Applicant: ${first_name} ${last_name}`,
    dob ? `DOB: ${dob}` : null,
    phone ? `Phone: ${phone}` : null,
    applicant_email ? `Email: ${applicant_email}` : null,
    insurance ? `Insurance: ${insurance}` : null,
    referred_by_phone ? `Referring Provider Phone: ${referred_by_phone}` : null,
    notes ? `\nNotes: ${notes}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  // Create the referral record
  const { data: referral, error } = await supabaseAdmin
    .from("referrals")
    .insert({
      organization_id: org.id,
      referral_type: "incoming",
      status: "pending",
      priority,
      referred_by: referred_by || null,
      referred_by_email: referred_by_email || null,
      applicant_email: applicant_email || null,
      reason: reason || null,
      notes: notesText,
      referral_date: new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) {
    console.error("Intake form error:", error);
    return NextResponse.json({ error: "Failed to submit referral" }, { status: 500 });
  }

  // Notify org admins via email
  const { data: admins } = await supabaseAdmin
    .from("user_profiles")
    .select("email, first_name, last_name")
    .eq("organization_id", org.id)
    .in("role", ["admin", "care_coordinator", "receptionist"])
    .not("email", "is", null)
    .limit(5);

  const adminEmails = (admins || []).map((a) => a.email).filter(Boolean) as string[];
  if (org.email) adminEmails.unshift(org.email);

  const uniqueEmails = [...new Set(adminEmails)];

  if (uniqueEmails.length > 0) {
    await sendEmail({
      to: uniqueEmails[0],
      subject: `New Intake Referral: ${first_name} ${last_name} — ${org.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;">
          <h2 style="color:#0f766e;">New Incoming Referral — ${org.name}</h2>
          <p>A new referral has been submitted via your public intake form.</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;">
            <tr><td style="padding:8px;background:#f8fafc;font-weight:600;border-radius:4px;width:140px;">Applicant</td><td style="padding:8px;">${first_name} ${last_name}</td></tr>
            ${dob ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Date of Birth</td><td style="padding:8px;">${dob}</td></tr>` : ""}
            ${phone ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Phone</td><td style="padding:8px;">${phone}</td></tr>` : ""}
            ${applicant_email ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Email</td><td style="padding:8px;">${applicant_email}</td></tr>` : ""}
            ${insurance ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Insurance</td><td style="padding:8px;">${insurance}</td></tr>` : ""}
            ${referred_by ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Referred By</td><td style="padding:8px;">${referred_by}${referred_by_email ? ` (${referred_by_email})` : ""}</td></tr>` : ""}
            ${priority !== "routine" ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Priority</td><td style="padding:8px;color:${priority === "emergent" ? "#dc2626" : "#d97706"};font-weight:700;text-transform:uppercase;">${priority}</td></tr>` : ""}
            ${reason ? `<tr><td style="padding:8px;background:#f8fafc;font-weight:600;">Reason</td><td style="padding:8px;">${reason}</td></tr>` : ""}
          </table>
          <p style="margin-top:24px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://app.kinshipehr.com"}/dashboard/referrals/${referral.id}"
               style="background:#0f766e;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              View Referral →
            </a>
          </p>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Kinship EHR · Referral Management</p>
        </div>
      `,
    });
  }

  // Create in-app notifications for admin users
  const { data: adminProfiles } = await supabaseAdmin
    .from("user_profiles")
    .select("clerk_user_id")
    .eq("organization_id", org.id)
    .in("role", ["admin", "care_coordinator", "receptionist"])
    .limit(5);

  if (adminProfiles?.length) {
    await supabaseAdmin.from("notifications").insert(
      adminProfiles.map((a) => ({
        user_clerk_id: a.clerk_user_id,
        type: "referral",
        title: `New intake referral: ${first_name} ${last_name}`,
        body: reason
          ? `${reason}${referred_by ? ` — from ${referred_by}` : ""}`
          : `Submitted via intake form${referred_by ? ` by ${referred_by}` : ""}`,
        link: `/dashboard/referrals/${referral.id}`,
      }))
    );
  }

  return NextResponse.json({ success: true, referral_id: referral.id }, { status: 201 });
}

// GET — return org info for the intake form
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("id, name, org_type, city, state, phone, website")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ org });
}
