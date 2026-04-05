// GET    /api/payers/[id] — fetch single payer with clearinghouse IDs
// PUT    /api/payers/[id] — update payer
// DELETE /api/payers/[id] — delete payer

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("payers")
    .select(`*, clearinghouse_ids:payer_clearinghouse_ids(*)`)
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Payer not found" }, { status: 404 });
  return NextResponse.json({ payer: data });
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await req.json();

  const ALLOWED = ["name", "payer_type", "state", "notes", "is_active"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from("payers")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Payer not found" }, { status: 404 });
  return NextResponse.json({ payer: data });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const { error } = await supabaseAdmin
    .from("payers")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
