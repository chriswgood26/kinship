import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const patientId = new URL(req.url).searchParams.get("patient_id");
  let query = supabaseAdmin.from("authorizations").select("*").order("created_at", { ascending: false });
  if (patientId) query = query.eq("client_id", patientId);
  const { data } = await query;
  return NextResponse.json({ authorizations: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("authorizations").insert({
    organization_id: profile?.organization_id || null,
    client_id: body.client_id,
    insurance_provider: body.insurance_provider,
    insurance_member_id: body.insurance_member_id || null,
    rendering_provider: body.rendering_provider || null,
    cpt_codes: body.cpt_codes || [],
    diagnosis_codes: body.diagnosis_codes || [],
    sessions_requested: body.sessions_requested || null,
    units_requested: body.units_requested || null,
    priority: body.priority || "routine",
    requested_date: body.requested_date || null,
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    clinical_notes: body.clinical_notes || null,
    status: "entered",
    sessions_used: 0,
    created_by: userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ auth: data }, { status: 201 });
}
