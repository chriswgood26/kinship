import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { data, error } = await supabaseAdmin
    .from("sfs_service_overrides")
    .select("*")
    .eq("organization_id", orgId)
    .order("cpt_code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ overrides: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();

  const { cpt_code, cpt_description, override_type, override_value, applies_to_fpl_max, notes } = body;
  if (!cpt_code || !override_type) {
    return NextResponse.json({ error: "cpt_code and override_type required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sfs_service_overrides")
    .insert({
      organization_id: orgId,
      cpt_code: cpt_code.trim().toUpperCase(),
      cpt_description: cpt_description || null,
      override_type,
      override_value: Number(override_value) || 0,
      applies_to_fpl_max: applies_to_fpl_max != null ? Number(applies_to_fpl_max) : null,
      is_active: true,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ override: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("sfs_service_overrides")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
