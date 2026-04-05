import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { id } = await params;

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "60");

  const { data, error } = await supabaseAdmin
    .from("skill_data_points")
    .select("*")
    .eq("skill_program_id", id)
    .eq("organization_id", orgId)
    .order("recorded_date", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dataPoints: data || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { id } = await params;
  const body = await req.json();

  if (!body.recorded_date || !body.staff_name) {
    return NextResponse.json({ error: "recorded_date and staff_name are required" }, { status: 400 });
  }

  // Verify skill belongs to this org
  const { data: skill } = await supabaseAdmin
    .from("skill_programs")
    .select("client_id")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!skill) return NextResponse.json({ error: "Skill program not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin.from("skill_data_points").insert({
    organization_id: orgId,
    skill_program_id: id,
    client_id: skill.client_id,
    recorded_date: body.recorded_date,
    staff_name: body.staff_name,
    staff_clerk_id: userId,
    trials_total: body.trials_total ?? null,
    trials_correct: body.trials_correct ?? null,
    prompt_level: body.prompt_level || null,
    duration_seconds: body.duration_seconds ?? null,
    frequency_count: body.frequency_count ?? null,
    session_notes: body.session_notes || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dataPoint: data }, { status: 201 });
}
