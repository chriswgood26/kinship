import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { data: skill, error } = await supabaseAdmin
    .from("skill_programs")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error || !skill) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Also fetch recent data points
  const { data: dataPoints } = await supabaseAdmin
    .from("skill_data_points")
    .select("*")
    .eq("skill_program_id", id)
    .order("recorded_date", { ascending: false })
    .limit(60);

  return NextResponse.json({ skill, dataPoints: dataPoints || [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { id } = await params;
  const body = await req.json();

  const allowed = [
    "skill_name", "description", "category", "measurement_type", "prompt_levels",
    "baseline_value", "target_value", "target_trials", "mastery_criteria",
    "status", "mastered_date", "notes", "isp_id", "isp_goal_id",
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from("skill_programs")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ skill: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("skill_programs")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
