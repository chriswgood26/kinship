import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const appealStatus = searchParams.get("appeal_status") || "";

  let query = supabaseAdmin
    .from("claim_denials")
    .select(`
      *,
      charge:charge_id(
        id, service_date, cpt_code, cpt_description, charge_amount, status, icd10_codes, modifier,
        client:client_id(id, first_name, last_name, mrn)
      )
    `)
    .eq("organization_id", orgId)
    .order("denial_date", { ascending: false })
    .limit(200);

  if (appealStatus) query = query.eq("appeal_status", appealStatus);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ denials: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const body = await req.json();
  const {
    charge_id,
    denial_date,
    denial_reason_code,
    denial_reason_description,
    denial_category,
    payer_name,
    payer_claim_number,
    original_charge_amount,
    denied_amount,
    appeal_deadline,
    notes,
  } = body;

  if (!charge_id || !denial_reason_code) {
    return NextResponse.json({ error: "charge_id and denial_reason_code are required" }, { status: 400 });
  }

  // Verify the charge belongs to this org
  const { data: charge, error: chargeError } = await supabaseAdmin
    .from("charges")
    .select("id, organization_id, charge_amount")
    .eq("id", charge_id)
    .eq("organization_id", orgId)
    .single();

  if (chargeError || !charge) {
    return NextResponse.json({ error: "Charge not found" }, { status: 404 });
  }

  // Create the denial record
  const { data: denial, error: denialError } = await supabaseAdmin
    .from("claim_denials")
    .insert({
      organization_id: orgId,
      charge_id,
      denial_date: denial_date || new Date().toISOString().split("T")[0],
      denial_reason_code,
      denial_reason_description: denial_reason_description || null,
      denial_category: denial_category || "other",
      payer_name: payer_name || null,
      payer_claim_number: payer_claim_number || null,
      original_charge_amount: original_charge_amount ?? charge.charge_amount,
      denied_amount: denied_amount ?? charge.charge_amount,
      appeal_status: "none",
      appeal_deadline: appeal_deadline || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (denialError) return NextResponse.json({ error: denialError.message }, { status: 500 });

  // Mark the charge as denied
  await supabaseAdmin
    .from("charges")
    .update({
      status: "denied",
      denial_reason_code,
      denial_date: denial_date || new Date().toISOString().split("T")[0],
    })
    .eq("id", charge_id);

  return NextResponse.json({ denial }, { status: 201 });
}
