import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  // Verify appeal belongs to this org
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("claim_appeals")
    .select("id, denial_id, outcome")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Appeal not found" }, { status: 404 });
  }

  const allowedFields: Record<string, unknown> = {};
  const updatable = [
    "appeal_level", "appeal_type", "tracking_number",
    "submitted_at", "deadline", "response_received_at",
    "outcome", "amount_appealed", "amount_recovered", "notes",
  ];
  for (const field of updatable) {
    if (field in body) allowedFields[field] = body[field];
  }
  allowedFields.updated_at = new Date().toISOString();

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("claim_appeals")
    .update(allowedFields)
    .eq("id", id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Sync the parent denial's appeal_status based on outcome
  if (body.outcome) {
    let denialAppealStatus: string;
    if (body.outcome === "approved" || body.outcome === "partially_approved") {
      denialAppealStatus = "approved";
    } else if (body.outcome === "denied") {
      denialAppealStatus = "denied";
    } else if (body.outcome === "withdrawn") {
      denialAppealStatus = "none";
    } else {
      // pending — check if submitted_at is set
      denialAppealStatus = updated.submitted_at ? "submitted" : "in_progress";
    }

    await supabaseAdmin
      .from("claim_denials")
      .update({ appeal_status: denialAppealStatus, updated_at: new Date().toISOString() })
      .eq("id", existing.denial_id);

    // If appeal approved, update the denial resolution too
    if (body.outcome === "approved" || body.outcome === "partially_approved") {
      await supabaseAdmin
        .from("claim_denials")
        .update({ resolution: "appeal_approved", resolved_at: new Date().toISOString() })
        .eq("id", existing.denial_id)
        .is("resolution", null);
    }
  }

  return NextResponse.json({ appeal: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("claim_appeals")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
