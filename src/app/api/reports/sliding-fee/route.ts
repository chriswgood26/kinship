import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const url = req.nextUrl;
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const from = url.searchParams.get("from") || firstOfMonth;
  const to = url.searchParams.get("to") || today;

  const [
    { data: adjustments },
    { data: charges },
    { data: activeAssessments },
    { data: retroAdj },
  ] = await Promise.all([
    // SFS charge adjustments in date range
    supabaseAdmin
      .from("charge_adjustments")
      .select("id, adjustment_amount, patient_responsibility, fpl_percent, tier_label, created_at, client_id, charge_id")
      .eq("organization_id", orgId)
      .eq("adjustment_type", "sliding_fee")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false }),

    // Charges with SFS patient_responsibility set in range
    supabaseAdmin
      .from("charges")
      .select("id, charge_amount, patient_responsibility, status, service_date, cpt_code, cpt_description")
      .eq("organization_id", orgId)
      .not("patient_responsibility", "is", null)
      .gte("service_date", from)
      .lte("service_date", to)
      .order("service_date", { ascending: false }),

    // All active income assessments (for FPL distribution snapshot)
    supabaseAdmin
      .from("client_income_assessments")
      .select("id, client_id, fpl_percent, effective_date, expiration_date, status")
      .eq("organization_id", orgId)
      .eq("status", "active"),

    // Retroactive adjustment log
    supabaseAdmin
      .from("sfs_retroactive_adjustments")
      .select("id, client_id, old_fpl_percent, new_fpl_percent, charges_affected, total_adjustment_delta, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({
    adjustments: adjustments || [],
    charges: charges || [],
    activeAssessments: activeAssessments || [],
    retroAdj: retroAdj || [],
    dateRange: { from, to },
  });
}
