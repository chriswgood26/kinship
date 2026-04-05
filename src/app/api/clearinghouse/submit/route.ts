// POST /api/clearinghouse/submit
// Submit one or more pending charges to Office Ally as an 837P claim batch.
// Requires the org to have billingIntegration feature (practice+).

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { OfficeAllyClient, build837P } from "@/lib/officeAlly";

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
  const { charge_ids, clearinghouse = "office_ally" } = body as {
    charge_ids: string[];
    clearinghouse?: string;
  };

  if (!Array.isArray(charge_ids) || charge_ids.length === 0) {
    return NextResponse.json({ error: "charge_ids array is required" }, { status: 400 });
  }

  // Fetch charges with client data — scoped to org
  const { data: charges, error: chargesErr } = await supabaseAdmin
    .from("charges")
    .select(`
      id, service_date, cpt_code, cpt_description,
      icd10_codes, units, charge_amount, status,
      client:client_id (
        first_name, last_name, date_of_birth, gender,
        insurance_member_id, insurance_group_number,
        insurance_provider, insurance_auth_number
      )
    `)
    .in("id", charge_ids)
    .eq("organization_id", orgId)
    .eq("status", "pending");

  if (chargesErr) return NextResponse.json({ error: chargesErr.message }, { status: 500 });
  if (!charges?.length) {
    return NextResponse.json({ error: "No pending charges found for the given IDs" }, { status: 404 });
  }

  // Fetch org details for 837 envelope
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("name, npi, tax_id, address_line1, city, state, zip")
    .eq("id", orgId)
    .single();

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Fetch submitter's provider NPI
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("npi")
    .eq("clerk_user_id", userId)
    .single();

  // Build 837P EDI for each charge
  const ediChunks: string[] = [];
  const submittedChargeIds: string[] = [];

  for (const charge of charges) {
    const client = Array.isArray(charge.client) ? charge.client[0] : charge.client;
    if (!client) continue;

    try {
      const edi = build837P({
        charge: {
          id: charge.id,
          service_date: charge.service_date,
          cpt_code: charge.cpt_code,
          cpt_description: charge.cpt_description,
          icd10_codes: charge.icd10_codes || [],
          units: charge.units || 1,
          charge_amount: Number(charge.charge_amount) || 0,
        },
        client,
        org,
        providerNpi: profile?.npi || undefined,
      });
      ediChunks.push(edi);
      submittedChargeIds.push(charge.id);
    } catch (err) {
      // Skip charges that fail EDI generation; log in response
      console.error(`EDI build failed for charge ${charge.id}:`, err);
    }
  }

  if (!ediChunks.length) {
    return NextResponse.json({ error: "No valid EDI could be generated" }, { status: 422 });
  }

  const combinedEdi = ediChunks.join("\n");

  // Submit to Office Ally
  let submissionResult;
  try {
    const client = new OfficeAllyClient();
    submissionResult = await client.submitClaim({
      ediContent: combinedEdi,
      chargeIds: submittedChargeIds,
      npi: org.npi || "",
      orgName: org.name,
    });
  } catch (err) {
    // Credentials not configured — record as sandbox/test mode
    submissionResult = {
      success: false,
      error: err instanceof Error ? err.message : "Clearinghouse not configured",
      submissionId: undefined,
      controlNumber: undefined,
    };
  }

  const now = new Date().toISOString();

  // Record the submission in the database
  const { data: submission } = await supabaseAdmin
    .from("clearinghouse_submissions")
    .insert({
      organization_id: orgId,
      charge_ids: submittedChargeIds,
      submission_date: now,
      status: submissionResult.success ? "submitted" : "failed",
      clearinghouse,
      submission_id: submissionResult.submissionId || null,
      control_number: submissionResult.controlNumber || null,
      edi_content: combinedEdi,
      error_message: submissionResult.error || null,
    })
    .select()
    .single();

  // Update charge statuses
  if (submissionResult.success) {
    await supabaseAdmin
      .from("charges")
      .update({ status: "submitted" })
      .in("id", submittedChargeIds)
      .eq("organization_id", orgId);
  }

  return NextResponse.json(
    {
      submission,
      chargesSubmitted: submittedChargeIds.length,
      chargesSkipped: charge_ids.length - submittedChargeIds.length,
      success: submissionResult.success,
      error: submissionResult.error,
    },
    { status: submissionResult.success ? 201 : 422 }
  );
}
