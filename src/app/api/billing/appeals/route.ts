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
  const outcome = searchParams.get("outcome") || "";
  const denialId = searchParams.get("denial_id") || "";

  let query = supabaseAdmin
    .from("claim_appeals")
    .select(`
      *,
      denial:denial_id(
        id, denial_date, denial_reason_code, denial_reason_description,
        denial_category, payer_name, payer_claim_number, denied_amount,
        charge:charge_id(
          id, service_date, cpt_code, cpt_description, charge_amount,
          client:client_id(id, first_name, last_name, mrn)
        )
      )
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (outcome) query = query.eq("outcome", outcome);
  if (denialId) query = query.eq("denial_id", denialId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ appeals: data || [] });
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
    denial_id,
    appeal_level,
    appeal_type,
    tracking_number,
    submitted_at,
    deadline,
    amount_appealed,
    notes,
  } = body;

  if (!denial_id) {
    return NextResponse.json({ error: "denial_id is required" }, { status: 400 });
  }

  // Verify the denial belongs to this org
  const { data: denial, error: denialError } = await supabaseAdmin
    .from("claim_denials")
    .select("id, organization_id, denied_amount")
    .eq("id", denial_id)
    .eq("organization_id", orgId)
    .single();

  if (denialError || !denial) {
    return NextResponse.json({ error: "Denial not found" }, { status: 404 });
  }

  const { data: appeal, error: appealError } = await supabaseAdmin
    .from("claim_appeals")
    .insert({
      organization_id: orgId,
      denial_id,
      appeal_level: appeal_level || "level_1",
      appeal_type: appeal_type || "written",
      tracking_number: tracking_number || null,
      submitted_at: submitted_at || null,
      deadline: deadline || null,
      outcome: "pending",
      amount_appealed: amount_appealed ?? denial.denied_amount,
      notes: notes || null,
    })
    .select()
    .single();

  if (appealError) return NextResponse.json({ error: appealError.message }, { status: 500 });

  // Update the denial's appeal_status to in_progress (or submitted if submitted_at provided)
  const newAppealStatus = submitted_at ? "submitted" : "in_progress";
  await supabaseAdmin
    .from("claim_denials")
    .update({ appeal_status: newAppealStatus, updated_at: new Date().toISOString() })
    .eq("id", denial_id);

  return NextResponse.json({ appeal }, { status: 201 });
}
