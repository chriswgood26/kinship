import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { validateCharge } from "@/lib/billingRules";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  let insuranceProvider: string | undefined;
  if (body.client_id) {
    const { data: pt } = await supabaseAdmin
      .from("clients").select("insurance_provider").eq("id", body.client_id).single();
    insuranceProvider = pt?.insurance_provider;
  }

  const result = validateCharge({ ...body, insurance_provider: insuranceProvider });
  return NextResponse.json(result);
}
