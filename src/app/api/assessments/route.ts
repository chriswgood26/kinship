import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("assessments").insert({
    organization_id: profile?.organization_id || orgId,
    client_id: body.client_id,
    assessment_type: body.assessment_type || "IM+CANS",
    assessment_date: body.assessment_date,
    assessor_name: body.assessor_name || null,
    status: body.status || "in_progress",
    scores: body.scores || {},
    total_score: body.total_score || 0,
    level_of_care: body.level_of_care || null,
    clinical_notes: body.clinical_notes || null,
    completed_at: body.completed_at || null,
    created_by: userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assessment: data }, { status: 201 });
}
