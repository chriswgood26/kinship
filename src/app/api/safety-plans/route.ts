import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";
import { getUserProfile } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const client_id = url.searchParams.get("client_id");

  const { profile, orgId } = await getUserProfile(userId);

  let query = supabaseAdmin
    .from("safety_plans")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (client_id) query = query.eq("client_id", client_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    user_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    action: "view",
    resource_type: "safety_plan",
    client_id: client_id ?? null,
    description: client_id ? `Viewed safety plans for client ${client_id}` : "Viewed safety plan list",
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ safety_plans: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.client_id) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const { profile, orgId } = await getUserProfile(userId);

  const { data, error } = await supabaseAdmin
    .from("safety_plans")
    .insert({
      organization_id: orgId,
      client_id: body.client_id,
      cssrs_screening_id: body.cssrs_screening_id || null,
      risk_level: body.risk_level || null,
      warning_signs: body.warning_signs || [],
      internal_coping_strategies: body.internal_coping_strategies || [],
      social_contacts: body.social_contacts || [],
      support_contacts: body.support_contacts || [],
      professional_contacts: body.professional_contacts || [],
      crisis_line_included: body.crisis_line_included ?? true,
      means_restriction_discussed: body.means_restriction_discussed ?? false,
      means_restriction_notes: body.means_restriction_notes || null,
      reasons_for_living: body.reasons_for_living || null,
      client_agreement: body.client_agreement ?? false,
      client_signature_date: body.client_signature_date || null,
      clinician_name: body.clinician_name || null,
      clinician_credentials: body.clinician_credentials || null,
      clinician_signature_date: body.clinician_signature_date || null,
      follow_up_date: body.follow_up_date || null,
      notes: body.notes || null,
      status: "active",
      created_by_clerk_id: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    user_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    action: "create",
    resource_type: "safety_plan",
    resource_id: data?.id ?? null,
    client_id: body.client_id,
    description: `Created safety plan for client ${body.client_id}${body.risk_level ? ` (${body.risk_level})` : ""}`,
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ safety_plan: data }, { status: 201 });
}
