// CCBHC PPS Rate Settings — per-org PPS configuration
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(_req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try { orgId = await getOrgId(userId); }
  catch { return NextResponse.json({ error: "Organization not found" }, { status: 403 }); }

  const { data: settings, error } = await supabaseAdmin
    .from("ccbhc_pps_settings")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try { orgId = await getOrgId(userId); }
  catch { return NextResponse.json({ error: "Organization not found" }, { status: 403 }); }

  const body = await req.json();
  const {
    methodology, daily_rate, monthly_rate,
    billing_code, billing_modifier,
    effective_date, state_program_id, notes,
  } = body;

  if (!methodology) {
    return NextResponse.json({ error: "methodology required" }, { status: 400 });
  }

  // Deactivate any existing active settings for this org
  await supabaseAdmin
    .from("ccbhc_pps_settings")
    .update({ is_active: false })
    .eq("organization_id", orgId)
    .eq("is_active", true);

  const { data, error } = await supabaseAdmin
    .from("ccbhc_pps_settings")
    .insert({
      organization_id: orgId,
      methodology,
      daily_rate: daily_rate ? parseFloat(daily_rate) : null,
      monthly_rate: monthly_rate ? parseFloat(monthly_rate) : null,
      billing_code: billing_code || "T1015",
      billing_modifier: billing_modifier || null,
      effective_date: effective_date || new Date().toISOString().split("T")[0],
      state_program_id: state_program_id || null,
      notes: notes || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
