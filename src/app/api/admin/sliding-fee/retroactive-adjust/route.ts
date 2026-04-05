import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import {
  calculateRetroactiveAdjustments,
  DEFAULT_SFS_TIERS,
  type SFSTier,
  type SFSProgramOverride,
  type SFSServiceOverride,
  type SFSGrantSchedule,
  type SFSPayerExclusion,
} from "@/lib/fpl";

/**
 * POST /api/admin/sliding-fee/retroactive-adjust
 *
 * Body:
 *   client_id       — required
 *   new_fpl_percent — required; the client's newly assessed FPL %
 *   old_fpl_percent — optional; for logging
 *   income_assessment_id — optional; reference to the income assessment
 *   apply           — boolean; if true, persist the adjustments to charges
 *
 * Returns: preview of charge adjustments (and applies them if apply=true)
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { client_id, new_fpl_percent, old_fpl_percent, income_assessment_id, apply = false } = body;

  if (!client_id || new_fpl_percent == null) {
    return NextResponse.json({ error: "client_id and new_fpl_percent required" }, { status: 400 });
  }

  // Fetch pending/unpaid charges for this client
  const { data: charges, error: chargesError } = await supabaseAdmin
    .from("charges")
    .select("id, cpt_code, charge_amount, status, service_date")
    .eq("client_id", client_id)
    .eq("organization_id", orgId)
    .in("status", ["pending", "draft"]);

  if (chargesError) return NextResponse.json({ error: chargesError.message }, { status: 500 });
  if (!charges || charges.length === 0) {
    return NextResponse.json({ adjustments: [], message: "No pending charges found" });
  }

  // Load org's SFS configuration
  const [orgTiersRes, programOverridesRes, serviceOverridesRes, grantSchedulesRes, payerExclusionsRes] =
    await Promise.all([
      supabaseAdmin.from("sliding_fee_schedule").select("*").eq("organization_id", orgId).eq("is_active", true).order("fpl_min"),
      supabaseAdmin.from("sfs_program_overrides").select("*").eq("organization_id", orgId).eq("is_active", true),
      supabaseAdmin.from("sfs_service_overrides").select("*").eq("organization_id", orgId).eq("is_active", true),
      supabaseAdmin.from("sfs_grant_schedules").select("*").eq("organization_id", orgId).eq("is_active", true),
      supabaseAdmin.from("sfs_payer_exclusions").select("*").eq("organization_id", orgId).eq("is_active", true),
    ]);

  // Also get client's current insurance for exclusion check
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("insurance_provider")
    .eq("id", client_id)
    .eq("organization_id", orgId)
    .single();

  const orgTiers: SFSTier[] = orgTiersRes.data?.length ? orgTiersRes.data : DEFAULT_SFS_TIERS;
  const sfsOptions = {
    orgTiers,
    programOverrides: (programOverridesRes.data || []) as SFSProgramOverride[],
    serviceOverrides: (serviceOverridesRes.data || []) as SFSServiceOverride[],
    grantSchedules: (grantSchedulesRes.data || []) as SFSGrantSchedule[],
    payerExclusions: (payerExclusionsRes.data || []) as SFSPayerExclusion[],
  };

  const chargeInputs = charges.map(c => ({
    id: c.id,
    cpt_code: c.cpt_code,
    charge_amount: Number(c.charge_amount) || 0,
    current_patient_responsibility: null,
    service_date: c.service_date,
    insurance_provider: client?.insurance_provider ?? null,
    program_area: null,
  }));

  const adjustments = calculateRetroactiveAdjustments(chargeInputs, Number(new_fpl_percent), sfsOptions);
  const totalDelta = adjustments.reduce((s, a) => s + a.delta, 0);

  if (apply && adjustments.length > 0) {
    // Log the retroactive adjustment
    await supabaseAdmin.from("sfs_retroactive_adjustments").insert({
      organization_id: orgId,
      client_id,
      income_assessment_id: income_assessment_id || null,
      old_fpl_percent: old_fpl_percent != null ? Number(old_fpl_percent) : null,
      new_fpl_percent: Number(new_fpl_percent),
      charges_affected: adjustments.length,
      total_adjustment_delta: totalDelta,
      applied_by_clerk_id: userId,
      line_items: adjustments,
      status: "applied",
    });

    // Update each charge's patient_responsibility if the column exists
    // (We store this as a note in the charges.notes field as a lightweight approach)
    for (const adj of adjustments) {
      if (adj.delta !== 0) {
        await supabaseAdmin
          .from("charges")
          .update({
            notes: `SFS retroactive adjustment: patient owes $${adj.new_patient_owes.toFixed(2)} (was $${adj.old_patient_owes.toFixed(2)}, Δ$${adj.delta.toFixed(2)}) — FPL updated to ${new_fpl_percent}%`,
          })
          .eq("id", adj.charge_id)
          .eq("organization_id", orgId);
      }
    }
  }

  return NextResponse.json({
    adjustments,
    totalDelta,
    chargesAffected: adjustments.filter(a => a.delta !== 0).length,
    applied: apply,
  });
}

/**
 * GET /api/admin/sliding-fee/retroactive-adjust?client_id=...
 * Returns the retroactive adjustment history for a client
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const clientId = req.nextUrl.searchParams.get("client_id");

  const query = supabaseAdmin
    .from("sfs_retroactive_adjustments")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (clientId) query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ history: data || [] });
}
