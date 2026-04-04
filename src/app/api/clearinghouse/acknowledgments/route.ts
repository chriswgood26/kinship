// GET /api/clearinghouse/acknowledgments
// Fetch and parse 999 functional acknowledgments from Office Ally.
// Stores results in clearinghouse_submissions and returns parsed acks.

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { OfficeAllyClient, parse999 } from "@/lib/officeAlly";

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
  const fromDate = searchParams.get("from") || undefined;

  // Fetch 999 acks from Office Ally
  let acks: ReturnType<typeof parse999>[] = [];
  let fetchError: string | undefined;

  try {
    const client = new OfficeAllyClient();
    const result = await client.getAcknowledgments(fromDate);
    acks = result.acks;
    fetchError = result.error;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Clearinghouse not configured";
  }

  if (fetchError && !acks.length) {
    // Return stored submissions if live fetch fails
    const { data: stored } = await supabaseAdmin
      .from("clearinghouse_submissions")
      .select("id, submission_date, status, clearinghouse, submission_id, control_number, charge_ids, ack_status, ack_errors, error_message")
      .eq("organization_id", orgId)
      .order("submission_date", { ascending: false })
      .limit(50);

    return NextResponse.json({
      submissions: stored || [],
      acks: [],
      fetchError,
      note: "Showing stored submission records. Live acknowledgment fetch unavailable.",
    });
  }

  // Match acks to stored submissions and update their status
  const updates: Promise<unknown>[] = [];

  for (const ack of acks) {
    if (!ack) continue;

    const accepted = ack.overallAccepted;
    const ackStatus = accepted ? "accepted" : "rejected";
    const ackErrors = ack.transactions
      .flatMap(t => t.errors)
      .map(e => `${e.errorCode}: ${e.description}`);

    // Try to match by control number
    const controlNumber = ack.interchangeControlNumber;
    if (controlNumber) {
      updates.push(
        Promise.resolve(
          supabaseAdmin
            .from("clearinghouse_submissions")
            .update({
              ack_status: ackStatus,
              ack_date: ack.sentDate || new Date().toISOString().split("T")[0],
              ack_errors: ackErrors,
              status: accepted ? "acknowledged" : "rejected",
            })
            .eq("organization_id", orgId)
            .eq("control_number", controlNumber)
        ).then(() => undefined)
      );
    }
  }

  await Promise.all(updates);

  // Return fresh list of submissions
  const { data: submissions } = await supabaseAdmin
    .from("clearinghouse_submissions")
    .select("id, submission_date, status, clearinghouse, submission_id, control_number, charge_ids, ack_status, ack_errors, ack_date, error_message")
    .eq("organization_id", orgId)
    .order("submission_date", { ascending: false })
    .limit(50);

  return NextResponse.json({
    submissions: submissions || [],
    acks: acks.filter(Boolean).map(a => ({
      interchangeControlNumber: a!.interchangeControlNumber,
      sentDate: a!.sentDate,
      overallAccepted: a!.overallAccepted,
      transactionCount: a!.transactions.length,
      errorCount: a!.transactions.reduce((s, t) => s + t.errors.length, 0),
    })),
    fetchError,
  });
}
