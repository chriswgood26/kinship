import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const patientId = req.nextUrl.searchParams.get("patient_id");
  if (!patientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });
  const { data } = await supabaseAdmin
    .from("patient_problems")
    .select("*")
    .eq("client_id", patientId)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  return NextResponse.json({ problems: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("patient_problems").insert({
    client_id: body.client_id,
    organization_id: orgId,
    icd10_code: body.icd10_code,
    description: body.description,
    onset_date: body.onset_date || null,
    status: body.status || "active",
    added_by_clerk_id: userId,
    notes: body.notes || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ problem: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...patch } = body;
  const { data, error } = await supabaseAdmin.from("patient_problems")
    .update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ problem: data });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabaseAdmin.from("patient_problems").delete().eq("id", id);
  return NextResponse.json({ deleted: true });
}
