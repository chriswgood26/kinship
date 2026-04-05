import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ referral_due_days: 3, referral_due_business_days: true });
  }

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("referral_due_days, referral_due_business_days")
    .eq("id", orgId)
    .single();

  return NextResponse.json({
    referral_due_days: org?.referral_due_days ?? 3,
    referral_due_business_days: org?.referral_due_business_days ?? true,
  });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const body = await req.json();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.referral_due_days !== undefined) update.referral_due_days = body.referral_due_days;
  if (body.referral_due_business_days !== undefined) update.referral_due_business_days = body.referral_due_business_days;

  const { error } = await supabaseAdmin.from("organizations").update(update).eq("id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
