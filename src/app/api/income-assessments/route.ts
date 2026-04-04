import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateFPLPercent } from "@/lib/fpl";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const patientId = req.nextUrl.searchParams.get("client_id");
  if (!patientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("client_income_assessments")
    .select("*")
    .eq("client_id", patientId)
    .eq("organization_id", orgId)
    .order("effective_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assessments: data });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { client_id, annual_income, family_size, verification_method, notes, effective_date } = body;
  if (!client_id || annual_income == null || !family_size) {
    return NextResponse.json({ error: "client_id, annual_income, family_size required" }, { status: 400 });
  }
  const fpl_percent = calculateFPLPercent(Number(annual_income), Number(family_size));
  const exp = new Date(effective_date || new Date());
  exp.setFullYear(exp.getFullYear() + 1);
  const expiration_date = exp.toISOString().split("T")[0];

  // Deactivate previous active assessment
  await supabaseAdmin
    .from("client_income_assessments")
    .update({ status: "superseded" })
    .eq("client_id", client_id)
    .eq("organization_id", orgId)
    .eq("status", "active");

  const { data, error } = await supabaseAdmin
    .from("client_income_assessments")
    .insert({
      client_id,
      organization_id: orgId,
      annual_income: Number(annual_income),
      family_size: Number(family_size),
      fpl_percent,
      verification_method: verification_method || "self_reported",
      effective_date: effective_date || new Date().toISOString().split("T")[0],
      expiration_date,
      status: "active",
      assessed_by_clerk_id: userId,
      notes: notes || null,
    })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assessment: data }, { status: 201 });
}
