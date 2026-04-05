import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const clientId = req.nextUrl.searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("client_housing_assessments")
    .select("*")
    .eq("client_id", clientId)
    .eq("organization_id", orgId)
    .order("assessment_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assessments: data });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();
  const {
    client_id,
    housing_status,
    housing_type,
    duration_homeless_months,
    is_chronically_homeless,
    assessment_date,
    next_assessment_date,
    notes,
  } = body;

  if (!client_id || !housing_status) {
    return NextResponse.json({ error: "client_id and housing_status required" }, { status: 400 });
  }

  // Supersede previous active assessment
  await supabaseAdmin
    .from("client_housing_assessments")
    .update({ status: "superseded" })
    .eq("client_id", client_id)
    .eq("organization_id", orgId)
    .eq("status", "active");

  const assessDate = assessment_date || new Date().toISOString().split("T")[0];
  // Default next assessment in 6 months
  const nextDate = next_assessment_date || (() => {
    const d = new Date(assessDate + "T12:00:00");
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split("T")[0];
  })();

  const { data, error } = await supabaseAdmin
    .from("client_housing_assessments")
    .insert({
      client_id,
      organization_id: orgId,
      housing_status,
      housing_type: housing_type || null,
      duration_homeless_months: duration_homeless_months != null ? Number(duration_homeless_months) : null,
      is_chronically_homeless: is_chronically_homeless ?? false,
      assessment_date: assessDate,
      next_assessment_date: nextDate,
      status: "active",
      assessed_by_clerk_id: userId,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ assessment: data }, { status: 201 });
}
