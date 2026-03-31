import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";


export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const patientId = req.nextUrl.searchParams.get("client_id");
  if (!patientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from("client_vitals")
    .select("*")
    .eq("client_id", patientId)
    .order("recorded_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vitals: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { client_id, encounter_id, recorded_at, ...measurements } = body;
  if (!client_id) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("first_name, last_name")
    .eq("clerk_user_id", userId)
    .single();

  const { data, error } = await supabaseAdmin.from("client_vitals").insert({
    client_id,
    encounter_id: encounter_id || null,
    organization_id: orgId,
    recorded_at: recorded_at || new Date().toISOString(),
    recorded_by_clerk_id: userId,
    recorded_by_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
    // Measurements
    systolic_bp: measurements.systolic_bp ? Number(measurements.systolic_bp) : null,
    diastolic_bp: measurements.diastolic_bp ? Number(measurements.diastolic_bp) : null,
    heart_rate: measurements.heart_rate ? Number(measurements.heart_rate) : null,
    respiratory_rate: measurements.respiratory_rate ? Number(measurements.respiratory_rate) : null,
    temperature_f: measurements.temperature_f ? Number(measurements.temperature_f) : null,
    oxygen_saturation: measurements.oxygen_saturation ? Number(measurements.oxygen_saturation) : null,
    weight_lbs: measurements.weight_lbs ? Number(measurements.weight_lbs) : null,
    height_in: measurements.height_in ? Number(measurements.height_in) : null,
    bmi: measurements.weight_lbs && measurements.height_in
      ? Math.round((Number(measurements.weight_lbs) / (Number(measurements.height_in) ** 2)) * 703 * 10) / 10
      : null,
    pain_scale: measurements.pain_scale ? Number(measurements.pain_scale) : null,
    blood_glucose: measurements.blood_glucose ? Number(measurements.blood_glucose) : null,
    notes: measurements.notes || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vital: data }, { status: 201 });
}
