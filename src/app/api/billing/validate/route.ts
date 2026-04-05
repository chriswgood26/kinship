import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { validateCharge } from "@/lib/billingRules";
import { detectPayerType, PAYER_TYPE_LABELS } from "@/lib/payerRules";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  let insuranceProvider: string | undefined;
  if (body.client_id) {
    const { data: pt } = await supabaseAdmin
      .from("clients")
      .select("insurance_provider")
      .eq("id", body.client_id)
      .single();
    insuranceProvider = pt?.insurance_provider;
  }

  const chargeInput = { ...body, insurance_provider: insuranceProvider };
  const result = validateCharge(chargeInput);
  const payerType = detectPayerType(insuranceProvider);

  return NextResponse.json({
    ...result,
    payer_type: payerType,
    payer_type_label: PAYER_TYPE_LABELS[payerType],
    insurance_provider: insuranceProvider || null,
  });
}
