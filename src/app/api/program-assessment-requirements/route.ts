import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const programId = req.nextUrl.searchParams.get("program_id");
  if (!programId) return NextResponse.json({ error: "program_id required" }, { status: 400 });

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
