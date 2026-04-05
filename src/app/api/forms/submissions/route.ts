import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// GET /api/forms/submissions — list submissions for org, optional filters
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const sp = req.nextUrl.searchParams;
  const clientId = sp.get("client_id");
  const programId = sp.get("program_id");
  const templateId = sp.get("template_id");
  const status = sp.get("status");

  let query = supabaseAdmin
    .from("form_submissions")
    .select("*, client:client_id(id, first_name, last_name, mrn), program:program_id(id, name, code)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);
  if (programId) query = query.eq("program_id", programId);
  if (templateId) query = query.eq("template_id", templateId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error && error.code !== "42P01") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ submissions: data || [] });
}

// POST /api/forms/submissions — record a new form submission
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const {
    client_id,
    template_id,
    template_name,
    template_category,
    program_id,
    status = "in_progress",
    answers,
    total_score,
    max_score,
    notes,
    submitted_by_name,
  } = body;

  if (!template_id || !template_name) {
    return NextResponse.json({ error: "template_id and template_name are required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("form_submissions")
    .insert({
      organization_id: orgId,
      client_id: client_id || null,
      template_id,
      template_name,
      template_category: template_category || null,
      program_id: program_id || null,
      status,
      started_at: now,
      completed_at: status === "completed" ? now : null,
      answers: answers || {},
      total_score: total_score ?? null,
      max_score: max_score ?? null,
      submitted_by_clerk_id: userId,
      submitted_by_name: submitted_by_name || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submission: data }, { status: 201 });
}

// PATCH /api/forms/submissions — update a submission (e.g. mark complete)
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { id, status, answers, total_score, max_score, notes } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status !== undefined) {
    patch.status = status;
    if (status === "completed") patch.completed_at = new Date().toISOString();
  }
  if (answers !== undefined) patch.answers = answers;
  if (total_score !== undefined) patch.total_score = total_score;
  if (max_score !== undefined) patch.max_score = max_score;
  if (notes !== undefined) patch.notes = notes;

  const { data, error } = await supabaseAdmin
    .from("form_submissions")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submission: data });
}
