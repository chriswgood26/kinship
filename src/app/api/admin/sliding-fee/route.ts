import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { DEFAULT_SFS_TIERS } from "@/lib/fpl";


export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { data } = await supabaseAdmin
    .from("sliding_fee_schedule")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("fpl_min", { ascending: true });

  // Return defaults if org hasn't customized yet
  if (!data || data.length === 0) {
    return NextResponse.json({ tiers: DEFAULT_SFS_TIERS, isDefault: true });
  }
  return NextResponse.json({ tiers: data, isDefault: false });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { tiers } = body;
  if (!tiers || !Array.isArray(tiers)) return NextResponse.json({ error: "tiers array required" }, { status: 400 });

  // Deactivate existing tiers
  await supabaseAdmin.from("sliding_fee_schedule").update({ is_active: false }).eq("organization_id", orgId);

  // Insert new tiers
  const { data, error } = await supabaseAdmin.from("sliding_fee_schedule").insert(
    tiers.map((t: {tier: string; label: string; fpl_min: number; fpl_max: number; discount_type: string; discount_value: number; description: string}) => ({
      organization_id: orgId,
      tier: t.tier,
      label: t.label,
      fpl_min: t.fpl_min,
      fpl_max: t.fpl_max,
      discount_type: t.discount_type,
      discount_value: t.discount_value,
      description: t.description,
      is_active: true,
    }))
  ).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tiers: data });
}
