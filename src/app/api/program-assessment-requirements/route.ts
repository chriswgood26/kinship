import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const programId = req.nextUrl.searchParams.get("program_id");
  const clientId = req.nextUrl.searchParams.get("client_id");

  // Multi-enrollment: given a client_id, return the UNION of requirements
  // across all of the client's active program enrollments (deduplicated).
  if (clientId) {
    // 1. Fetch all active program enrollments for this client
    const { data: enrollments, error: enrollErr } = await supabaseAdmin
      .from("client_programs")
      .select("program_id, program:program_id(id, name, code)")
      .eq("organization_id", orgId)
      .eq("client_id", clientId)
      .eq("status", "active");

    if (enrollErr) return NextResponse.json({ error: enrollErr.message }, { status: 500 });
    if (!enrollments?.length) return NextResponse.json({ requirements: [], programs: [] });

    const programIds = enrollments.map((e: { program_id: string }) => e.program_id);

    // 2. Fetch requirements for all enrolled programs
    const { data: allRequirements, error: reqErr } = await supabaseAdmin
      .from("program_assessment_requirements")
      .select("*")
      .eq("organization_id", orgId)
      .in("program_id", programIds)
      .eq("is_active", true)
      .order("assessment_type");

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });

    // 3. Deduplicate by assessment_type — take the strictest settings when
    //    the same assessment type appears in multiple programs:
    //    - is_required_at_intake: true wins over false
    //    - reassessment_frequency_days: smallest non-null value wins (most frequent)
    //    - reminder_days_before: largest value wins (most advance notice)
    //    - collect source program names for transparency
    type Req = {
      id: string;
      assessment_type: string;
      is_required_at_intake: boolean;
      reassessment_frequency_days: number | null;
      reminder_days_before: number;
      notes: string | null;
      program_id: string;
      source_programs?: string[];
    };

    const programNameMap: Record<string, string> = {};
    for (const e of enrollments) {
      const prog = e.program as unknown as { id: string; name: string; code: string | null } | null;
      if (prog) programNameMap[prog.id] = prog.name;
    }

    const merged: Record<string, Req & { source_programs: string[] }> = {};
    for (const req of (allRequirements || []) as Req[]) {
      const existing = merged[req.assessment_type];
      const progName = programNameMap[req.program_id] || req.program_id;
      if (!existing) {
        merged[req.assessment_type] = { ...req, source_programs: [progName] };
      } else {
        existing.source_programs.push(progName);
        // Strictest merge
        if (req.is_required_at_intake) existing.is_required_at_intake = true;
        if (
          req.reassessment_frequency_days !== null &&
          (existing.reassessment_frequency_days === null ||
            req.reassessment_frequency_days < existing.reassessment_frequency_days)
        ) {
          existing.reassessment_frequency_days = req.reassessment_frequency_days;
        }
        if (req.reminder_days_before > existing.reminder_days_before) {
          existing.reminder_days_before = req.reminder_days_before;
        }
      }
    }

    const programs = enrollments.map((e: { program_id: string; program: unknown }) => e.program);
    return NextResponse.json({ requirements: Object.values(merged), programs });
  }

  if (!programId) return NextResponse.json({ error: "program_id or client_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("program_assessment_requirements")
    .select("*")
    .eq("organization_id", orgId)
    .eq("program_id", programId)
    .eq("is_active", true)
    .order("assessment_type");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requirements: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("program_assessment_requirements")
    .upsert({
      organization_id: orgId,
      program_id: body.program_id,
      assessment_type: body.assessment_type,
      is_required_at_intake: body.is_required_at_intake ?? true,
      reassessment_frequency_days: body.reassessment_frequency_days ?? null,
      reminder_days_before: body.reminder_days_before ?? 14,
      notes: body.notes || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "program_id,assessment_type" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requirement: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("program_assessment_requirements")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
