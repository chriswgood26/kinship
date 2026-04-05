import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// ── GET /api/ebp-fidelity/[id] ────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { id } = await params;

  // Try assessment first, then practice
  const { data: assessment } = await supabaseAdmin
    .from("ebp_fidelity_assessments")
    .select("*, practice:ebp_practice_id(*)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (assessment) return NextResponse.json({ assessment });

  const { data: practice, error } = await supabaseAdmin
    .from("ebp_practices")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ practice });
}

// ── PATCH /api/ebp-fidelity/[id] ──────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { id } = await params;
  const body = await req.json();
  const { table } = body; // "practice" | "assessment"

  if (table === "practice") {
    const { data, error } = await supabaseAdmin
      .from("ebp_practices")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ practice: data });
  }

  // Default: update assessment
  const score = body.overall_score ?? undefined;
  let fidelityLevel: string | undefined;
  if (score !== undefined && score !== null) {
    if (score >= 80) fidelityLevel = "high";
    else if (score >= 60) fidelityLevel = "moderate";
    else if (score >= 40) fidelityLevel = "low";
    else fidelityLevel = "non_adherent";
  }

  const updates: Record<string, unknown> = {
    ...body,
    updated_at: new Date().toISOString(),
  };
  if (fidelityLevel) updates.fidelity_level = fidelityLevel;
  if (body.status === "completed") updates.completed_at = new Date().toISOString();
  delete updates.table;

  const { data, error } = await supabaseAdmin
    .from("ebp_fidelity_assessments")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assessment: data });
}
