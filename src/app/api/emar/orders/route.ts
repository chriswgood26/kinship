import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("medication_orders").insert({
    organization_id: orgId,
    client_id: body.client_id,
    medication_name: body.medication_name,
    generic_name: body.generic_name || null,
    dosage: body.dosage,
    route: body.route || "oral",
    frequency: body.frequency,
    scheduled_times: body.scheduled_times || [],
    indication: body.indication || null,
    prescriber: body.prescriber || null,
    pharmacy: body.pharmacy || null,
    rx_number: body.rx_number || null,
    start_date: body.start_date,
    end_date: body.end_date || null,
    is_prn: body.is_prn || false,
    prn_indication: body.prn_indication || null,
    is_controlled: body.is_controlled || false,
    controlled_schedule: body.controlled_schedule || null,
    instructions: body.instructions || null,
    status: "active",
    created_by: userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ order: data }, { status: 201 });
}
