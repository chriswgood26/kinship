import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserProfile } from "@/lib/getOrgId";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";

/**
 * POST /api/clients/merge
 *
 * Merges a duplicate (source) client record into the canonical (target) record.
 * All clinical data associated with the source is re-pointed to the target.
 * The source record is then marked as merged / inactive.
 *
 * Body: { source_id: string, target_id: string }
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { profile, orgId } = await getUserProfile(userId);
  const body = await req.json();
  const { source_id, target_id } = body;

  if (!source_id || !target_id) {
    return NextResponse.json({ error: "source_id and target_id are required" }, { status: 400 });
  }

  if (source_id === target_id) {
    return NextResponse.json({ error: "source and target must be different records" }, { status: 400 });
  }

  // Verify both clients exist and belong to the org
  const [{ data: sourceClient }, { data: targetClient }] = await Promise.all([
    supabaseAdmin.from("clients").select("id, first_name, last_name, mrn, organization_id").eq("id", source_id).eq("organization_id", orgId).single(),
    supabaseAdmin.from("clients").select("id, first_name, last_name, mrn, organization_id").eq("id", target_id).eq("organization_id", orgId).single(),
  ]);

  if (!sourceClient) return NextResponse.json({ error: "Source client not found" }, { status: 404 });
  if (!targetClient) return NextResponse.json({ error: "Target client not found" }, { status: 404 });

  // Tables to migrate — attempt each individually; log but don't fail on errors
  // (some tables may not have rows, or may have unique constraints requiring special handling)
  const TABLES_WITH_CLIENT_ID: string[] = [
    "appointments",
    "encounters",
    "treatment_plans",
    "charges",
    "referrals",
    "documents",
    "waitlist",
    "screenings",
    "safety_plans",
    "portal_messages",
    "sfs_retroactive_adjustments",
    "comm_delivery_log",
    "appointment_requests",
    "ccbhc_pps_claims",
    "peer_support_sessions",
    "client_housing_assessments",
    "phi_audit_logs",
    // Additional tables discovered via API routes
    "assessments",
    "patient_vitals",
    "client_vitals",
    "medication_orders",
    "releases_of_information",
    "incident_reports",
    "care_team",
    "client_allergies",
    "client_income_assessments",
    "consent_forms",
    "individual_support_plans",
    "patient_problems",
    "patient_relationships",
    "dd_progress_notes",
    "authorizations",
    "client_programs",
    "skill_programs",
    "community_support_activities",
    "day_program_attendance",
    "reminders",
    "time_entries",
  ];

  // Tables with potential unique constraints — for these we delete the source row
  // if a conflict would occur (target already has an equivalent row)
  const TABLES_WITH_UNIQUE_CONSTRAINTS: string[] = [
    "comm_opt_outs",      // unique(organization_id, client_id, channel)
    "portal_users",       // unique per client (usually one portal user per client)
  ];

  const errors: Record<string, string> = {};
  let rowsMoved = 0;

  // Migrate regular tables
  for (const table of TABLES_WITH_CLIENT_ID) {
    try {
      const { count } = await supabaseAdmin
        .from(table as never)
        .update({ client_id: target_id } as never)
        .eq("client_id" as never, source_id);
      rowsMoved += count ?? 0;
    } catch (err: unknown) {
      errors[table] = err instanceof Error ? err.message : String(err);
    }
  }

  // Handle tables with unique constraints: delete source rows where target already has a matching row
  for (const table of TABLES_WITH_UNIQUE_CONSTRAINTS) {
    try {
      // First try a straightforward update
      const { error } = await supabaseAdmin
        .from(table as never)
        .update({ client_id: target_id } as never)
        .eq("client_id" as never, source_id);

      if (error?.code === "23505") {
        // Unique violation — delete source rows that would conflict, then retry
        await supabaseAdmin
          .from(table as never)
          .delete()
          .eq("client_id" as never, source_id);
      } else if (error) {
        errors[table] = error.message;
      }
    } catch (err: unknown) {
      errors[table] = err instanceof Error ? err.message : String(err);
    }
  }

  // Mark source client as merged
  const { error: mergeError } = await supabaseAdmin
    .from("clients")
    .update({
      status: "merged",
      is_active: false,
      updated_at: new Date().toISOString(),
      // Store merge metadata in a safe way
      preferred_name: `[MERGED → ${targetClient.mrn || target_id}]`,
    })
    .eq("id", source_id)
    .eq("organization_id", orgId);

  if (mergeError) {
    return NextResponse.json({ error: `Failed to mark source as merged: ${mergeError.message}` }, { status: 500 });
  }

  // Audit log
  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    user_name: `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim(),
    action: "update",
    resource_type: "client",
    resource_id: target_id,
    client_id: target_id,
    description: `Merged duplicate client record: ${sourceClient.first_name} ${sourceClient.last_name} (MRN: ${sourceClient.mrn || source_id}) merged INTO ${targetClient.first_name} ${targetClient.last_name} (MRN: ${targetClient.mrn || target_id})`,
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({
    success: true,
    target_id,
    source_id,
    rows_moved: rowsMoved,
    table_errors: Object.keys(errors).length > 0 ? errors : undefined,
    message: `${sourceClient.first_name} ${sourceClient.last_name} merged into ${targetClient.first_name} ${targetClient.last_name}`,
  });
}
