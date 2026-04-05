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

  // Verify denial belongs to org
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("claim_denials")
    .select("id, charge_id, appeal_status")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Denial not found" }, { status: 404 });
  }

  const allowedFields: Record<string, unknown> = {};
  const updatable = [
    "denial_reason_code", "denial_reason_description", "denial_category",
    "payer_name", "payer_claim_number", "denied_amount",
    "appeal_status", "appeal_deadline", "appeal_submitted_at",
    "appeal_notes", "resolution", "resolved_at", "notes",
  ];
  for (const field of updatable) {
    if (field in body) allowedFields[field] = body[field];
  }
  allowedFields.updated_at = new Date().toISOString();

  // Auto-set resolved_at when resolution is provided
  if (body.resolution && !body.resolved_at) {
    allowedFields.resolved_at = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("claim_denials")
    .update(allowedFields)
    .eq("id", id)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Sync charge status based on resolution/appeal
  if (body.resolution === "appeal_approved" || body.resolution === "corrected_resubmit") {
    await supabaseAdmin
      .from("charges")
      .update({ status: "pending" })
      .eq("id", existing.charge_id);
  } else if (body.resolution === "write_off") {
    await supabaseAdmin
      .from("charges")
      .update({ status: "void" })
      .eq("id", existing.charge_id);
  }

  return NextResponse.json({ denial: updated });
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
    .from("claim_denials")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
