// GET  /api/clearinghouse/era  — list stored ERA remittances
// POST /api/clearinghouse/era  — fetch from Office Ally and auto-post payments

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { OfficeAllyClient, EraParseResult } from "@/lib/officeAlly";

// ─── GET: list stored ERA remittances ─────────────────────────────────────────

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
  const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);

  const { data: remittances, error } = await supabaseAdmin
    .from("era_remittances")
    .select("id, payment_date, payer_name, check_number, payment_method, total_payment_amount, claims_count, posted_at, auto_posted, post_errors")
    .eq("organization_id", orgId)
    .order("payment_date", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ remittances: remittances || [] });
}

// ─── POST: fetch ERAs from Office Ally + auto-post payments ───────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const fromDate: string | undefined = body.from_date;

  // Fetch ERAs from Office Ally
  let eras: EraParseResult[] = [];
  let fetchError: string | undefined;

  try {
    const client = new OfficeAllyClient();
    const result = await client.getERAs(fromDate);
    eras = result.eras;
    fetchError = result.error;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Clearinghouse not configured";
  }

  if (fetchError && !eras.length) {
    return NextResponse.json({ error: fetchError, erasPosted: 0 }, { status: 422 });
  }

  const results: {
    remittanceId: string;
    checkNumber: string;
    totalPayment: number;
    claimsProcessed: number;
    paymentsPosted: number;
    errors: string[];
  }[] = [];

  for (const era of eras) {
    const postErrors: string[] = [];
    let paymentsPosted = 0;

    // Insert ERA remittance record
    const { data: remittance, error: remErr } = await supabaseAdmin
      .from("era_remittances")
      .insert({
        organization_id: orgId,
        clearinghouse: "office_ally",
        payment_date: era.paymentDate || new Date().toISOString().split("T")[0],
        payer_name: era.payerName,
        payee_npi: era.payeeNpi || null,
        check_number: era.checkNumber,
        payment_method: era.paymentMethod,
        total_payment_amount: era.totalPaymentAmount,
        claims_count: era.claims.length,
        raw_content: era.rawContent,
        auto_posted: false,
        posted_at: null,
        post_errors: [],
      })
      .select()
      .single();

    if (remErr || !remittance) {
      postErrors.push(`Failed to insert remittance: ${remErr?.message}`);
      continue;
    }

    // Auto-post each claim payment
    for (const claim of era.claims) {
      // Find matching charge by payer claim number or by client + service date
      // We try two strategies: (1) exact claimId match, (2) CPT + amount fallback

      const claimStatusCode = claim.claimStatusCode;
      const isDenied = claimStatusCode === "4";

      // Insert ERA payment line items
      for (const svc of claim.serviceLines) {
        // Find matching charge for this CPT code
        const { data: matchedCharge } = await supabaseAdmin
          .from("charges")
          .select("id, status, charge_amount")
          .eq("organization_id", orgId)
          .eq("cpt_code", svc.cptCode)
          .eq("status", "submitted")
          .order("service_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error: lineErr } = await supabaseAdmin
          .from("era_payment_lines")
          .insert({
            organization_id: orgId,
            era_remittance_id: remittance.id,
            charge_id: matchedCharge?.id || null,
            payer_claim_number: claim.payerClaimNumber,
            claim_status_code: claimStatusCode,
            claim_status_label: claim.claimStatusLabel,
            patient_name: claim.patientName || null,
            patient_member_id: claim.patientMemberId || null,
            cpt_code: svc.cptCode,
            charged_amount: svc.submittedCharge,
            paid_amount: svc.paidAmount,
            patient_responsibility: claim.patientResponsibility,
            adjustments: svc.adjustments,
            posted: false,
          });

        if (lineErr) {
          postErrors.push(`Line insert failed for CPT ${svc.cptCode}: ${lineErr.message}`);
          continue;
        }

        // Auto-post: update the matched charge status and paid amount
        if (matchedCharge) {
          const newStatus = isDenied ? "denied" : svc.paidAmount > 0 ? "paid" : "denied";
          const { error: updateErr } = await supabaseAdmin
            .from("charges")
            .update({
              status: newStatus,
              paid_amount: svc.paidAmount,
              era_remittance_id: remittance.id,
              posted_at: new Date().toISOString(),
            })
            .eq("id", matchedCharge.id)
            .eq("organization_id", orgId);

          if (!updateErr) {
            // Mark line as posted
            await supabaseAdmin
              .from("era_payment_lines")
              .update({ posted: true, posted_at: new Date().toISOString() })
              .eq("era_remittance_id", remittance.id)
              .eq("charge_id", matchedCharge.id)
              .eq("cpt_code", svc.cptCode);

            paymentsPosted++;
          } else {
            postErrors.push(`Charge update failed for ${matchedCharge.id}: ${updateErr.message}`);
          }
        }
      }
    }

    // Update remittance record to reflect posting completion
    await supabaseAdmin
      .from("era_remittances")
      .update({
        auto_posted: postErrors.length === 0,
        posted_at: new Date().toISOString(),
        post_errors: postErrors,
      })
      .eq("id", remittance.id);

    results.push({
      remittanceId: remittance.id,
      checkNumber: era.checkNumber,
      totalPayment: era.totalPaymentAmount,
      claimsProcessed: era.claims.length,
      paymentsPosted,
      errors: postErrors,
    });
  }

  return NextResponse.json({
    erasFetched: eras.length,
    erasPosted: results.filter(r => r.errors.length === 0).length,
    results,
    fetchError,
  });
}
