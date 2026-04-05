import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";

// Map assessment_type labels used in program_assessment_requirements to
// screenings.tool values for the screenings table.
const SCREENING_TOOL_MAP: Record<string, string> = {
  "PHQ-9": "phq9",
  "GAD-7": "gad7",
  "C-SSRS": "cssrs",
};

async function checkRequiredAssessments(clientId: string, orgId: string): Promise<string[]> {
  // 1. Get all active program enrollments for this client
  const { data: enrollments } = await supabaseAdmin
    .from("client_programs")
    .select("program_id")
    .eq("organization_id", orgId)
    .eq("client_id", clientId)
    .eq("status", "active");

  if (!enrollments?.length) return [];

  const programIds = enrollments.map((e: { program_id: string }) => e.program_id);

  // 2. Get all active assessment requirements for those programs
  const { data: requirements } = await supabaseAdmin
    .from("program_assessment_requirements")
    .select("assessment_type")
    .eq("organization_id", orgId)
    .in("program_id", programIds)
    .eq("is_active", true);

  if (!requirements?.length) return [];

  // Deduplicate required assessment types
  const requiredTypes = [...new Set(requirements.map((r: { assessment_type: string }) => r.assessment_type))];

  const missing: string[] = [];

  for (const assessmentType of requiredTypes) {
    const screeningTool = SCREENING_TOOL_MAP[assessmentType];

    if (screeningTool) {
      // Check screenings table
      const { data: screeningRows } = await supabaseAdmin
        .from("screenings")
        .select("id")
        .eq("client_id", clientId)
        .eq("tool", screeningTool)
        .limit(1);
      if (!screeningRows?.length) {
        missing.push(assessmentType);
      }
    } else {
      // Check assessments table (status = 'completed')
      const { data: assessmentRows } = await supabaseAdmin
        .from("assessments")
        .select("id")
        .eq("client_id", clientId)
        .eq("assessment_type", assessmentType)
        .eq("status", "completed")
        .limit(1);
      if (!assessmentRows?.length) {
        missing.push(assessmentType);
      }
    }
  }

  return missing;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { note_id, encounter_id, subjective, objective, assessment, plan, diagnosis_codes, is_signed, signed_at, is_late_note, late_note_reason, template_id, custom_content } = body;

  // Hard enforcement: block signing if required assessments are incomplete
  if (is_signed) {
    const { data: encounter } = await supabaseAdmin
      .from("encounters")
      .select("client_id")
      .eq("id", encounter_id)
      .eq("organization_id", orgId)
      .single();

    if (encounter?.client_id) {
      const missing = await checkRequiredAssessments(encounter.client_id, orgId);
      if (missing.length > 0) {
        return NextResponse.json(
          { error: "required_assessments_incomplete", missing_assessments: missing },
          { status: 422 }
        );
      }
    }
  }

  let data, error;
  if (note_id) {
    ({ data, error } = await supabaseAdmin.from("clinical_notes").update({ subjective, objective, assessment, plan, diagnosis_codes, is_signed, signed_at, is_late_note: is_late_note || false, late_note_reason: late_note_reason || null, template_id: template_id || null, custom_content: custom_content || null, updated_at: new Date().toISOString() }).eq("id", note_id).select().single());
    if (is_signed) await supabaseAdmin.from("encounters").update({ status: "signed" }).eq("id", encounter_id).eq("organization_id", orgId);
  } else {
    ({ data, error } = await supabaseAdmin.from("clinical_notes").insert({ encounter_id, note_type: template_id ? "custom" : "progress_note", subjective, objective, assessment, plan, diagnosis_codes, is_signed: is_signed || false, signed_at: signed_at || null, is_late_note: is_late_note || false, late_note_reason: late_note_reason || null, template_id: template_id || null, custom_content: custom_content || null }).select().single());
    if (is_signed) await supabaseAdmin.from("encounters").update({ status: "signed" }).eq("id", encounter_id);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    action: note_id ? "update" : "create",
    resource_type: "clinical_note",
    resource_id: data?.id ?? note_id ?? null,
    description: note_id
      ? `${is_signed ? "Signed" : "Updated"} clinical note ${note_id}${is_late_note ? " (late note)" : ""}`
      : `Created clinical note for encounter ${encounter_id}${is_late_note ? " (late note)" : ""}`,
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ note: data }, { status: 201 });
}
