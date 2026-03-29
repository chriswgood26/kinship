import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("charges").insert({
    organization_id: profile?.organization_id,
    client_id: body.client_id,
    service_date: body.service_date,
    cpt_code: body.cpt_code,
    cpt_description: body.cpt_description || null,
    icd10_codes: body.icd10_codes || [],
    units: body.units || 1,
    charge_amount: body.charge_amount ? parseFloat(body.charge_amount) : null,
    notes: body.notes || null,
    status: "pending",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ charge: data }, { status: 201 });
}
