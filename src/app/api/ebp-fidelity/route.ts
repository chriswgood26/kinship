import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// ── GET /api/ebp-fidelity ─────────────────────────────────────────────────────
// Lists EBP practices and their most recent fidelity assessments
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { searchParams } = new URL(req.url);
  const practiceId = searchParams.get("practice_id");
  const status = searchParams.get("status");

  const [{ data: practices, error: practiceError }, { data: assessments, error: assessmentError }] =
    await Promise.all([
      supabaseAdmin
        .from("ebp_practices")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("ebp_fidelity_assessments")
        .select("*")
        .eq("organization_id", orgId)
        .order("assessment_date", { ascending: false }),
    ]);

  if (practiceError) return NextResponse.json({ error: practiceError.message }, { status: 500 });
  if (assessmentError) return NextResponse.json({ error: assessmentError.message }, { status: 500 });

  // Filter assessments if practice_id or status provided
  let filteredAssessments = assessments || [];
  if (practiceId) filteredAssessments = filteredAssessments.filter(a => a.ebp_practice_id === practiceId);
  if (status) filteredAssessments = filteredAssessments.filter(a => a.status === status);

  // Attach latest assessment score to each practice
  const practicesWithLatest = (practices || []).map(p => {
    const latest = filteredAssessments
      .filter(a => a.ebp_practice_id === p.id)
      .sort((a, b) => new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime())[0];
    return { ...p, latest_assessment: latest || null };
  });

  return NextResponse.json({ practices: practicesWithLatest, assessments: filteredAssessments });
}

// ── POST /api/ebp-fidelity ────────────────────────────────────────────────────
// Create a new EBP practice or fidelity assessment
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { type } = body; // "practice" | "assessment"

  if (type === "practice") {
    const { data, error } = await supabaseAdmin
      .from("ebp_practices")
      .insert({
        organization_id: orgId,
        practice_name: body.practice_name,
        practice_category: body.practice_category || "psychotherapy",
        evidence_level: body.evidence_level || "well_supported",
        target_population: body.target_population || null,
        description: body.description || null,
        implementing_staff: body.implementing_staff || [],
        trained_staff_count: body.trained_staff_count || 0,
        training_completed_date: body.training_completed_date || null,
        go_live_date: body.go_live_date || null,
        fidelity_tool: body.fidelity_tool || null,
        fidelity_tool_max_score: body.fidelity_tool_max_score || null,
        status: body.status || "active",
        notes: body.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ practice: data }, { status: 201 });
  }

  if (type === "assessment") {
    // Compute fidelity level from overall score
    const score = body.overall_score ?? null;
    let fidelityLevel: string | null = null;
    if (score !== null) {
      if (score >= 80) fidelityLevel = "high";
      else if (score >= 60) fidelityLevel = "moderate";
      else if (score >= 40) fidelityLevel = "low";
      else fidelityLevel = "non_adherent";
    }

    const isCompleted = body.status === "completed";
    const { data, error } = await supabaseAdmin
      .from("ebp_fidelity_assessments")
      .insert({
        organization_id: orgId,
        ebp_practice_id: body.ebp_practice_id,
        assessment_date: body.assessment_date,
        assessor_name: body.assessor_name,
        clinician_assessed: body.clinician_assessed || null,
        program_assessed: body.program_assessed || null,
        assessment_type: body.assessment_type || "self_assessment",
        domain_scores: body.domain_scores || {},
        overall_score: score,
        fidelity_level: fidelityLevel,
        checklist_items: body.checklist_items || [],
        items_met: body.items_met || 0,
        items_total: body.items_total || 0,
        strengths: body.strengths || null,
        areas_for_improvement: body.areas_for_improvement || null,
        recommendations: body.recommendations || null,
        action_plan: body.action_plan || null,
        follow_up_date: body.follow_up_date || null,
        status: body.status || "draft",
        completed_at: isCompleted ? new Date().toISOString() : null,
        notes: body.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ assessment: data }, { status: 201 });
  }

  return NextResponse.json({ error: "type must be 'practice' or 'assessment'" }, { status: 400 });
}
