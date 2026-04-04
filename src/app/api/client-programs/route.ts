import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";


export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const patientId = req.nextUrl.searchParams.get("client_id");
  const programId = req.nextUrl.searchParams.get("program_id");
  let query = supabaseAdmin
    .from("client_programs")
    .select("*, program:program_id(id, name, code, program_type), patient:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("admission_date", { ascending: false });
  if (patientId) query = query.eq("client_id", patientId);
  if (programId) query = query.eq("program_id", programId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    action: "view",
    resource_type: "client_program",
    client_id: patientId ?? null,
    description: patientId
      ? `Viewed program enrollments for client ${patientId}`
      : "Viewed all client program enrollments",
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ enrollments: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("client_programs").insert({
    organization_id: orgId,
    client_id: body.client_id,
    program_id: body.program_id,
    admission_date: body.admission_date || new Date().toISOString().split("T")[0],
    discharge_date: body.discharge_date || null,
    status: body.status || "active",
    assigned_worker: body.assigned_worker || null,
    notes: body.notes || null,
    enrolled_by_clerk_id: userId,
  }).select("*, program:program_id(id, name, code, program_type)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enrollment: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...patch } = body;
  const { data, error } = await supabaseAdmin.from("client_programs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enrollment: data });
}
