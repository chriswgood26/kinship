// CCBHC PPS — Generate draft claims for a date range
// Scans encounters in the period, groups by client + day (PPS-1) or month (PPS-2),
// deduplicates, and creates draft ccbhc_pps_claims records.
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import {
  isPpsQualifyingEncounter,
  getPeriodKey,
  getPeriodRange,
  DEFAULT_PPS_BILLING_CODE,
} from "@/lib/ccbhcPps";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try { orgId = await getOrgId(userId); }
  catch { return NextResponse.json({ error: "Organization not found" }, { status: 403 }); }

  const body = await req.json();
  const { date_from, date_to } = body;

  if (!date_from || !date_to) {
    return NextResponse.json({ error: "date_from and date_to required (YYYY-MM-DD)" }, { status: 400 });
  }

  // Fetch active PPS settings
  const { data: settings } = await supabaseAdmin
    .from("ccbhc_pps_settings")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!settings) {
    return NextResponse.json({ error: "No active CCBHC PPS rate configuration found. Configure PPS rates first." }, { status: 422 });
  }

  const rate = settings.methodology === "pps1_daily"
    ? (settings.daily_rate ?? 0)
    : (settings.monthly_rate ?? 0);

  if (!rate || rate <= 0) {
    return NextResponse.json({
      error: `PPS rate not configured. Set a ${settings.methodology === "pps1_daily" ? "daily" : "monthly"} rate in PPS settings.`,
    }, { status: 422 });
  }

  // Fetch encounters in the date range with their charges (for ICD-10 codes)
  const { data: encounters, error: encError } = await supabaseAdmin
    .from("encounters")
    .select("id, client_id, encounter_date, encounter_type, status")
    .eq("organization_id", orgId)
    .gte("encounter_date", date_from)
    .lte("encounter_date", date_to)
    .neq("status", "cancelled");

  if (encError) return NextResponse.json({ error: encError.message }, { status: 500 });

  // Filter to qualifying encounters
  const qualifying = (encounters || []).filter(e =>
    isPpsQualifyingEncounter(e.encounter_type)
  );

  if (!qualifying.length) {
    return NextResponse.json({
      created: 0,
      skipped: 0,
      message: "No qualifying CCBHC encounters found in the selected date range.",
    });
  }

  // Fetch charges to get ICD-10 codes per client/date
  const encounterIds = qualifying.map(e => e.id);
  const { data: charges } = await supabaseAdmin
    .from("charges")
    .select("encounter_id, icd10_codes")
    .in("encounter_id", encounterIds);

  const icd10ByEncounter: Record<string, string[]> = {};
  for (const c of charges || []) {
    if (c.encounter_id && c.icd10_codes?.length) {
      icd10ByEncounter[c.encounter_id] = c.icd10_codes;
    }
  }

  // Group by client + period key to find unique PPS billing periods
  type PeriodGroup = {
    client_id: string;
    periodKey: string;
    encounterIds: string[];
    icd10Codes: string[];
  };
  const groups = new Map<string, PeriodGroup>();

  for (const enc of qualifying) {
    const periodKey = getPeriodKey(enc.encounter_date, settings.methodology);
    const mapKey = `${enc.client_id}::${periodKey}`;
    const existing = groups.get(mapKey);
    const icd10 = icd10ByEncounter[enc.id] || [];
    if (existing) {
      existing.encounterIds.push(enc.id);
      for (const code of icd10) {
        if (!existing.icd10Codes.includes(code)) existing.icd10Codes.push(code);
      }
    } else {
      groups.set(mapKey, {
        client_id: enc.client_id,
        periodKey,
        encounterIds: [enc.id],
        icd10Codes: [...icd10],
      });
    }
  }

  // Check which periods already have claims (avoid duplicates)
  const { data: existingClaims } = await supabaseAdmin
    .from("ccbhc_pps_claims")
    .select("client_id, period_start, period_end")
    .eq("organization_id", orgId)
    .neq("status", "void");

  const existingKeys = new Set<string>(
    (existingClaims || []).map(c => `${c.client_id}::${c.period_start}::${c.period_end}`)
  );

  // Build insert payloads
  const inserts: Record<string, unknown>[] = [];
  let skipped = 0;

  for (const group of groups.values()) {
    const { start, end } = getPeriodRange(group.periodKey, settings.methodology);
    const dedupeKey = `${group.client_id}::${start}::${end}`;
    if (existingKeys.has(dedupeKey)) { skipped++; continue; }

    inserts.push({
      organization_id: orgId,
      client_id: group.client_id,
      methodology: settings.methodology,
      period_start: start,
      period_end: end,
      rate_applied: rate,
      charge_amount: rate,
      billing_code: settings.billing_code || DEFAULT_PPS_BILLING_CODE,
      billing_modifier: settings.billing_modifier || null,
      icd10_codes: group.icd10Codes.slice(0, 4), // max 4 per claim
      qualifying_encounter_ids: group.encounterIds,
      status: "draft",
      notes: null,
    });
  }

  if (!inserts.length) {
    return NextResponse.json({
      created: 0,
      skipped,
      message: skipped > 0
        ? `All ${skipped} qualifying period(s) already have existing PPS claims.`
        : "No new PPS claims to generate.",
    });
  }

  const { data: created, error: insertError } = await supabaseAdmin
    .from("ccbhc_pps_claims")
    .insert(inserts)
    .select();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({
    created: created?.length ?? 0,
    skipped,
    total_amount: (created?.length ?? 0) * rate,
    message: `Generated ${created?.length ?? 0} draft PPS claim(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ""}.`,
    claims: created,
  }, { status: 201 });
}
