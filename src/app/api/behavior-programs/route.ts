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
  const behaviorType = url.searchParams.get("behavior_type");

  let query = supabaseAdmin
    .from("behavior_programs")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);
  if (status) query = query.eq("status", status);
  if (behaviorType) query = query.eq("behavior_type", behaviorType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ programs: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  if (!body.client_id || !body.behavior_name) {
    return NextResponse.json({ error: "client_id and behavior_name are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("behavior_programs").insert({
    organization_id: orgId,
    client_id: body.client_id,
    behavior_name: body.behavior_name,
    operational_definition: body.operational_definition || null,
    behavior_type: body.behavior_type || "target",
    behavior_function: body.behavior_function || null,
    measurement_type: body.measurement_type || "frequency",
    interval_minutes: body.interval_minutes ?? null,
    baseline_value: body.baseline_value ?? null,
    reduction_target_pct: body.reduction_target_pct ?? null,
    intervention_strategy: body.intervention_strategy || null,
    preventive_strategies: body.preventive_strategies || null,
    consequence_strategies: body.consequence_strategies || null,
    isp_id: body.isp_id || null,
    isp_goal_id: body.isp_goal_id || null,
    status: "active",
    notes: body.notes || null,
    created_by_clerk_id: userId,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ program: data }, { status: 201 });
}
