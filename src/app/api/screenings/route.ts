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
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : (client_id ? 50 : 100);
  const { profile, orgId } = await getUserProfile(userId);
  let query = supabaseAdmin.from("screenings").select("*").eq("organization_id", orgId).order("administered_at", { ascending: false }).limit(limit);
  if (client_id) query = query.eq("client_id", client_id);
  const { data } = await query;

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    user_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    action: "view",
    resource_type: "screening",
    client_id: client_id ?? null,
    description: client_id
      ? `Viewed screenings for client ${client_id}`
      : "Viewed screening list",
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ screenings: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { profile, orgId } = await getUserProfile(userId);
  const { data, error } = await supabaseAdmin.from("screenings").insert({
    organization_id: orgId,
    client_id: body.client_id,
    tool: body.tool,
    answers: body.answers || {},
    total_score: body.total_score,
    severity_label: body.severity_label,
    administered_by: body.administered_by || null,
    administered_at: new Date().toISOString(),
    notes: body.notes || null,
    administered_by_clerk_id: userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    user_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    action: "create",
    resource_type: "screening",
    resource_id: data?.id ?? null,
    client_id: body.client_id ?? null,
    description: `Administered ${body.tool?.toUpperCase() ?? "screening"} for client ${body.client_id}`,
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ screening: data }, { status: 201 });
}
