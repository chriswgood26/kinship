// CCBHC PPS Claims — list and create draft claims
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try { orgId = await getOrgId(userId); }
  catch { return NextResponse.json({ error: "Organization not found" }, { status: 403 }); }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);

  let query = supabaseAdmin
    .from("ccbhc_pps_claims")
    .select("*, client:client_id(first_name, last_name, mrn)")
    .eq("organization_id", orgId)
    .order("period_start", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);

  const { data: claims, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ claims: claims || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try { orgId = await getOrgId(userId); }
  catch { return NextResponse.json({ error: "Organization not found" }, { status: 403 }); }

  const body = await req.json();
  const {
    client_id, methodology, period_start, period_end,
    rate_applied, billing_code, billing_modifier,
    icd10_codes, qualifying_encounter_ids, notes,
  } = body;

  if (!client_id || !period_start || !rate_applied) {
    return NextResponse.json({ error: "client_id, period_start, and rate_applied required" }, { status: 400 });
  }

  const charge_amount = parseFloat(rate_applied);

  const { data, error } = await supabaseAdmin
    .from("ccbhc_pps_claims")
    .insert({
      organization_id: orgId,
      client_id,
      methodology: methodology || "pps1_daily",
      period_start,
      period_end: period_end || period_start,
      rate_applied: charge_amount,
      charge_amount,
      billing_code: billing_code || "T1015",
      billing_modifier: billing_modifier || null,
      icd10_codes: icd10_codes || [],
      qualifying_encounter_ids: qualifying_encounter_ids || [],
      notes: notes || null,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ claim: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try { orgId = await getOrgId(userId); }
  catch { return NextResponse.json({ error: "Organization not found" }, { status: 403 }); }

  const body = await req.json();
  const { id, status } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("ccbhc_pps_claims")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ claim: data });
}
