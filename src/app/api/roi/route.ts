import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const client_id = new URL(req.url).searchParams.get("client_id");
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id, first_name, last_name").eq("clerk_user_id", userId).single();
  let query = supabaseAdmin.from("releases_of_information").select("*").eq("organization_id", profile?.organization_id || orgId).order("created_at", { ascending: false });
  if (client_id) query = query.eq("client_id", client_id);
  const { data } = await query;

  await logAuditEvent({
    organization_id: profile?.organization_id || orgId,
    user_clerk_id: userId,
    user_name: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : null,
    action: "view",
    resource_type: "release_of_information",
    client_id: client_id ?? null,
    description: client_id
      ? `Viewed releases of information for client ${client_id}`
      : "Viewed all releases of information",
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ rois: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id, first_name, last_name").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("releases_of_information").insert({
    organization_id: profile?.organization_id,
    client_id: body.client_id,
    direction: body.direction || "outgoing",
    recipient_name: body.recipient_name,
    recipient_organization: body.recipient_organization || null,
    recipient_phone: body.recipient_phone || null,
    recipient_fax: body.recipient_fax || null,
    recipient_address: body.recipient_address || null,
    purpose: body.purpose,
    information_to_release: body.information_to_release || [],
    specific_information: body.specific_information || null,
    effective_date: body.effective_date,
    expiration_date: body.expiration_date || null,
    is_revocable: body.is_revocable !== false,
    patient_signature_method: body.patient_signature_method || "written",
    guardian_name: body.guardian_name || null,
    witnessed_by: body.witnessed_by || null,
    notes: body.notes || null,
    status: body.status || "pending_signature",
    created_by: userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (profile?.organization_id) {
    await logAuditEvent({
      organization_id: profile.organization_id,
      user_clerk_id: userId,
      user_name: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : null,
      action: "create",
      resource_type: "release_of_information",
      resource_id: data?.id ?? null,
      client_id: body.client_id ?? null,
      description: `Created release of information for client ${body.client_id} → ${body.recipient_name}`,
      ip_address: getRequestIp(req),
      user_agent: getRequestUserAgent(req),
    });
  }

  return NextResponse.json({ roi: data }, { status: 201 });
}
