import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: import("next/server").NextRequest) {
  const { userId } = await import("@clerk/nextjs/server").then(m => m.auth());
  if (!userId) return import("next/server").then(m => m.NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
  const client_id = new URL(req.url).searchParams.get("patient_id");
  let query = (await import("@/lib/supabaseAdmin")).supabaseAdmin.from("individual_support_plans").select("*").order("created_at", { ascending: false });
  if (client_id) query = query.eq("client_id", client_id);
  const { data } = await query;
  return (await import("next/server")).NextResponse.json({ plans: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.client_id) return NextResponse.json({ error: "client_id required" }, { status: 400 });
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("individual_support_plans").insert({
    organization_id: profile?.organization_id || null,
    client_id: body.client_id,
    plan_year: body.plan_year,
    effective_date: body.effective_date || null,
    review_date: body.review_date || null,
    coordinator: body.coordinator || null,
    primary_diagnosis: body.primary_diagnosis || null,
    secondary_diagnoses: body.secondary_diagnoses || [],
    level_of_support: body.level_of_support || "moderate",
    living_situation: body.living_situation || null,
    day_program: body.day_program || null,
    strengths: body.strengths || null,
    preferences: body.preferences || null,
    health_safety_concerns: body.health_safety_concerns || null,
    communication_style: body.communication_style || null,
    guardian_name: body.guardian_name || null,
    guardian_relationship: body.guardian_relationship || null,
    notes: body.notes || null,
    goals: body.goals || [],
    status: "draft",
    created_by: userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data }, { status: 201 });
}
