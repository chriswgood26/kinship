import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const url = new URL(req.url);
  const programId = url.searchParams.get("program_id");
  const clientId = url.searchParams.get("client_id");
  const limit = parseInt(url.searchParams.get("limit") || "100");

  let query = supabaseAdmin
    .from("behavior_incidents")
    .select("*")
    .eq("organization_id", orgId)
    .order("incident_date", { ascending: false })
    .order("incident_time", { ascending: false })
    .limit(limit);

  if (programId) query = query.eq("behavior_program_id", programId);
  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incidents: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  if (!body.behavior_program_id || !body.incident_date || !body.staff_name) {
    return NextResponse.json(
      { error: "behavior_program_id, incident_date, and staff_name are required" },
      { status: 400 }
    );
  }

  // Verify the program belongs to this org and get client_id
  const { data: program } = await supabaseAdmin
    .from("behavior_programs")
    .select("client_id, organization_id")
    .eq("id", body.behavior_program_id)
    .eq("organization_id", orgId)
    .single();

  if (!program) return NextResponse.json({ error: "Program not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin.from("behavior_incidents").insert({
    organization_id: orgId,
    behavior_program_id: body.behavior_program_id,
    client_id: program.client_id,
    incident_date: body.incident_date,
    incident_time: body.incident_time || null,
    setting: body.setting || null,
    duration_seconds: body.duration_seconds ?? null,
    frequency_count: body.frequency_count ?? 1,
    severity: body.severity || null,
    antecedent: body.antecedent || null,
    behavior_description: body.behavior_description || null,
    consequence: body.consequence || null,
    perceived_function: body.perceived_function || null,
    staff_name: body.staff_name,
    staff_clerk_id: userId,
    notes: body.notes || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incident: data }, { status: 201 });
}
