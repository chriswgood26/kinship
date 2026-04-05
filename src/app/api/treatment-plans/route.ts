import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.client_id) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, id")
    .eq("clerk_user_id", userId)
    .single();

  const { data, error } = await supabaseAdmin
    .from("treatment_plans")
    .insert({
      organization_id: profile?.organization_id || null,
      client_id: body.client_id,
      provider_id: profile?.id || null,
      plan_start_date: body.plan_start_date,
      next_review_date: body.next_review_date || null,
      presenting_problem: body.presenting_problem || null,
      strengths: body.strengths || null,
      barriers: body.barriers || null,
      diagnosis_codes: body.diagnosis_codes || [],
      level_of_care: body.level_of_care || null,
      goals: body.goals || [],
      status: "active",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data }, { status: 201 });
}
