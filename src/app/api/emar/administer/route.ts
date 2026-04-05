import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("medication_administrations").insert({
    order_id: body.order_id,
    client_id: body.client_id,
    scheduled_time: body.scheduled_time,
    administered_at: body.administered_at || null,
    administered_by: body.administered_by || null,
    status: body.status || "given",
    outcome: body.outcome || "given",
    refused_reason: body.refused_reason || null,
    held_reason: body.held_reason || null,
    prn_reason: body.prn_reason || null,
    notes: body.notes || null,
    witness: body.witness || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ administration: data }, { status: 201 });
}
