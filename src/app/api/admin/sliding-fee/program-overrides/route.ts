import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { data, error } = await supabaseAdmin
    .from("sfs_program_overrides")
    .select("*")
    .eq("organization_id", orgId)
    .order("program_area");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ overrides: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();

  const { program_area, label, tiers, is_active, notes } = body;
  if (!program_area || !label || !Array.isArray(tiers)) {
    return NextResponse.json({ error: "program_area, label, and tiers required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("sfs_program_overrides")
    .upsert({
      organization_id: orgId,
      program_area,
      label,
      tiers,
      is_active: is_active !== false,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,program_area" })
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
    .from("sfs_program_overrides")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
