import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, first_name, last_name")
    .eq("clerk_user_id", userId)
    .single();

  const { data, error } = await supabaseAdmin
    .from("safety_plans")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth, phone_primary)")
    .eq("id", id)
    .eq("organization_id", profile?.organization_id || "")
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (profile?.organization_id) {
    await logAuditEvent({
      organization_id: profile.organization_id,
      user_clerk_id: userId,
      user_name: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : null,
      action: "view",
      resource_type: "safety_plan",
      resource_id: id,
      client_id: data.client_id,
      description: `Viewed safety plan ${id}`,
      ip_address: getRequestIp(req),
      user_agent: getRequestUserAgent(req),
    });
  }

  return NextResponse.json({ safety_plan: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, first_name, last_name")
    .eq("clerk_user_id", userId)
    .single();

  // Allowlist fields that can be updated
  const allowed = [
    "risk_level", "warning_signs", "internal_coping_strategies",
    "social_contacts", "support_contacts", "professional_contacts",
    "crisis_line_included", "means_restriction_discussed", "means_restriction_notes",
    "reasons_for_living", "client_agreement", "client_signature_date",
    "clinician_name", "clinician_credentials", "clinician_signature_date",
    "follow_up_date", "notes", "status",
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from("safety_plans")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", profile?.organization_id || "")
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message || "Not found" }, { status: 500 });

  if (profile?.organization_id) {
    await logAuditEvent({
      organization_id: profile.organization_id,
      user_clerk_id: userId,
      user_name: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : null,
      action: "update",
      resource_type: "safety_plan",
      resource_id: id,
      client_id: data.client_id,
      description: `Updated safety plan ${id}`,
      ip_address: getRequestIp(req),
      user_agent: getRequestUserAgent(req),
    });
  }

  return NextResponse.json({ safety_plan: data });
}
