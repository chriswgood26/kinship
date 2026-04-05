import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");

  let query = supabaseAdmin
    .from("skill_programs")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);
  if (status) query = query.eq("status", status);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ skills: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  if (!body.client_id || !body.skill_name) {
    return NextResponse.json({ error: "client_id and skill_name are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("skill_programs").insert({
    organization_id: orgId,
    client_id: body.client_id,
    skill_name: body.skill_name,
    description: body.description || null,
    category: body.category || "daily_living",
    isp_id: body.isp_id || null,
    isp_goal_id: body.isp_goal_id || null,
    measurement_type: body.measurement_type || "percent_correct",
    prompt_levels: body.prompt_levels || ["Independent", "Verbal Prompt", "Gestural Prompt", "Physical Prompt", "Full Physical Prompt"],
    baseline_value: body.baseline_value ?? null,
    target_value: body.target_value ?? null,
    target_trials: body.target_trials || 10,
    mastery_criteria: body.mastery_criteria || null,
    status: "active",
    notes: body.notes || null,
    created_by_clerk_id: userId,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ skill: data }, { status: 201 });
}
