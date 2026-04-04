import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  let query = supabaseAdmin
    .from("charges")
    .select("id, service_date, cpt_code, cpt_description, charge_amount, status, client:client_id(first_name, last_name, mrn)")
    .eq("organization_id", orgId)
    .order("service_date", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data: charges, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    action: "view",
    resource_type: "charge",
    description: status
      ? `Viewed billing charges (status: ${status})`
      : "Viewed billing charges",
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ charges: charges || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("charges").insert({
    organization_id: orgId,
    client_id: body.client_id,
    service_date: body.service_date,
    cpt_code: body.cpt_code,
    cpt_description: body.cpt_description || null,
    icd10_codes: body.icd10_codes || [],
    units: body.units || 1,
    charge_amount: body.charge_amount ? parseFloat(body.charge_amount) : null,
    notes: body.notes || null,
    status: "pending",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    action: "create",
    resource_type: "charge",
    resource_id: data?.id ?? null,
    client_id: body.client_id ?? null,
    description: `Created charge ${body.cpt_code} for client ${body.client_id}`,
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ charge: data }, { status: 201 });
}
