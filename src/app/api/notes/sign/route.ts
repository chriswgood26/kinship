import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { DEFAULT_CHARGES } from "@/lib/defaultCharges";
import { getTierForFPL, calculateAdjustment, DEFAULT_SFS_TIERS } from "@/lib/fpl";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);

  const { encounter_id, note_id } = await req.json();

  // Verify the encounter belongs to the caller's organization
  const { data: encounterCheck } = await supabaseAdmin
    .from("encounters")
    .select("organization_id")
    .eq("id", encounter_id)
    .single();

  if (!encounterCheck || encounterCheck.organization_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Sign the note
  if (note_id) {
    await supabaseAdmin.from("clinical_notes").update({
      is_signed: true,
      signed_at: new Date().toISOString(),
    }).eq("id", note_id);
  }

  // Update encounter status to completed
  await supabaseAdmin.from("encounters").update({
    status: "signed",
    updated_at: new Date().toISOString(),
  }).eq("id", encounter_id);

  // Notify supervisor that a note needs co-signature
  try {
    if (note_id) {
      // Get the signing clinician's profile to find their supervisor
      const { data: clinicianProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("id, first_name, last_name, supervisor_id")
        .eq("clerk_user_id", userId)
        .single();

      if (clinicianProfile?.supervisor_id) {
        // Get supervisor's clerk_user_id
        const { data: supervisor } = await supabaseAdmin
          .from("user_profiles")
          .select("clerk_user_id, first_name, last_name")
          .eq("id", clinicianProfile.supervisor_id)
          .single();

        if (supervisor?.clerk_user_id) {
          // Get patient info for the notification message
          const { data: enc } = await supabaseAdmin
            .from("encounters")
            .select("client:client_id(first_name, last_name), encounter_date, encounter_type")
            .eq("id", encounter_id)
            .single();

          const clientData = Array.isArray(enc?.client) ? enc.client[0] : (enc?.client as unknown as {first_name?: string; last_name?: string} | null);
          const patientName = clientData ? `${clientData.first_name} ${clientData.last_name}` : "a client";
          const clinicianName = `${clinicianProfile.first_name} ${clinicianProfile.last_name}`;

          await supabaseAdmin.from("notifications").insert({
            user_clerk_id: supervisor.clerk_user_id,
            type: "co_signature_needed",
            title: "Note needs co-signature",
            message: `${clinicianName} signed a ${enc?.encounter_type || "clinical"} note for ${patientName} — awaiting your co-signature.`,
            entity_type: "clinical_note",
            entity_id: note_id,
            link: `/dashboard/supervisor`,
            is_read: false,
          });
        }
      }
    }
  } catch (err) {
    // Non-fatal
    console.error("Supervisor notification failed:", err);
  }

  // Also notify clinician when their note will need co-signature (via auto-detection)

  // Auto-create draft charge if none exists for this encounter
  try {
    const { data: encounter } = await supabaseAdmin
      .from("encounters")
      .select("id, client_id, encounter_type, encounter_date, organization_id, diagnoses")
      .eq("id", encounter_id)
      .single();

    if (encounter) {
      // Check if charge already exists for this encounter
      const { data: existingCharges } = await supabaseAdmin
        .from("charges")
        .select("id")
        .eq("encounter_id", encounter_id);

      if (!existingCharges || existingCharges.length === 0) {
        const defaults = DEFAULT_CHARGES[encounter.encounter_type] || DEFAULT_CHARGES["individual"];

        // Use diagnoses from encounter if available, else empty array
        const icd10Codes = encounter.diagnoses || [];

        const { data: newCharge } = await supabaseAdmin.from("charges").insert({
          organization_id: encounter.organization_id || orgId,
          client_id: encounter.client_id,
          encounter_id: encounter.id,
          service_date: encounter.encounter_date,
          cpt_code: defaults.cpt_code,
          cpt_description: defaults.cpt_description,
          icd10_codes: icd10Codes,
          units: defaults.units,
          charge_amount: defaults.charge_amount,
          status: "draft",
          notes: `Auto-generated from ${encounter.encounter_type} encounter on sign`,
        }).select().single();

        // Auto-apply sliding fee adjustment if patient has active income assessment
        if (newCharge) {
          const { data: assessment } = await supabaseAdmin
            .from("patient_income_assessments")
            .select("fpl_percent")
            .eq("client_id", encounter.client_id)
            .eq("status", "active")
            .single();

          if (assessment) {
            // Get org sliding fee schedule (fall back to defaults)
            const { data: sfsTiers } = await supabaseAdmin
              .from("sliding_fee_schedule")
              .select("*")
              .eq("organization_id", encounter.organization_id || orgId)
              .eq("is_active", true)
              .order("fpl_min", { ascending: true });

            const tiers = (sfsTiers && sfsTiers.length > 0) ? sfsTiers : DEFAULT_SFS_TIERS;
            const tier = getTierForFPL(assessment.fpl_percent, tiers);

            if (tier && tier.discount_type !== "none") {
              const { adjustment, patientOwes } = calculateAdjustment(defaults.charge_amount, tier);
              if (adjustment > 0) {
                await supabaseAdmin.from("charge_adjustments").insert({
                  charge_id: newCharge.id,
                  organization_id: encounter.organization_id || orgId,
                  client_id: encounter.client_id,
                  adjustment_type: "sliding_fee",
                  adjustment_amount: adjustment,
                  patient_responsibility: patientOwes,
                  fpl_percent: assessment.fpl_percent,
                  tier_label: tier.label,
                  notes: `Sliding fee discount — ${tier.label} (${assessment.fpl_percent}% FPL)`,
                });
                // Update charge with patient responsibility
                await supabaseAdmin.from("charges").update({ patient_responsibility: patientOwes }).eq("id", newCharge.id);
              }
            }
          }
        }
      }
    }
  } catch (err) {
    // Non-fatal — don't fail the sign action if charge creation fails
    console.error("Auto-charge creation failed:", err);
  }

  return NextResponse.json({ message: "signed" });
}
