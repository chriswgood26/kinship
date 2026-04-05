import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { data, error } = await supabaseAdmin
    .from("sfs_grant_schedules")
    .select("*")
    .eq("organization_id", orgId)
    .order("effective_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedules: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();

  const {
    id, grant_name, grant_number, funder, tiers,
    fpl_ceiling, effective_date, expiration_date,
    applies_to_program_areas, is_active, notes,
  } = body;

  if (!grant_name || !effective_date || !Array.isArray(tiers)) {
    return NextResponse.json({ error: "grant_name, effective_date, and tiers required" }, { status: 400 });
  }

  const payload = {
    organization_id: orgId,
    grant_name,
    grant_number: grant_number || null,
    funder: funder || null,
    tiers,
    fpl_ceiling: fpl_ceiling != null ? Number(fpl_ceiling) : null,
    effective_date,
    expiration_date: expiration_date || null,
    applies_to_program_areas: applies_to_program_areas || [],
    is_active: is_active !== false,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabaseAdmin
      .from("sfs_grant_schedules")
      .update(payload)
      .eq("id", id)
      .eq("organization_id", orgId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ schedule: data });
  }

  const { data, error } = await supabaseAdmin
    .from("sfs_grant_schedules")
    .insert(payload)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ schedule: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("sfs_grant_schedules")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
