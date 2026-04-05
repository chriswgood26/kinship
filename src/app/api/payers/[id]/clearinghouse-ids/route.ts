// GET  /api/payers/[id]/clearinghouse-ids — list clearinghouse IDs for a payer
// POST /api/payers/[id]/clearinghouse-ids — add a clearinghouse ID to a payer

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

  const { id: payerId } = await ctx.params;

  const { data, error } = await supabaseAdmin
    .from("payer_clearinghouse_ids")
    .select("*")
    .eq("payer_id", payerId)
    .eq("organization_id", orgId)
    .order("clearinghouse");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clearinghouse_ids: data || [] });
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const { id: payerId } = await ctx.params;

  // Verify payer belongs to org
  const { data: payer } = await supabaseAdmin
    .from("payers")
    .select("id")
    .eq("id", payerId)
    .eq("organization_id", orgId)
    .single();

  if (!payer) return NextResponse.json({ error: "Payer not found" }, { status: 404 });

  const body = await req.json();
  const { clearinghouse, clearinghouse_payer_id, is_default, notes } = body as {
    clearinghouse: string;
    clearinghouse_payer_id: string;
    is_default?: boolean;
    notes?: string;
  };

  if (!clearinghouse?.trim()) {
    return NextResponse.json({ error: "clearinghouse is required" }, { status: 400 });
  }
  if (!clearinghouse_payer_id?.trim()) {
    return NextResponse.json({ error: "clearinghouse_payer_id is required" }, { status: 400 });
  }

  // If setting as default, unset any existing default for this payer
  if (is_default) {
    await supabaseAdmin
      .from("payer_clearinghouse_ids")
      .update({ is_default: false })
      .eq("payer_id", payerId)
      .eq("organization_id", orgId);
  }

  const { data, error } = await supabaseAdmin
    .from("payer_clearinghouse_ids")
    .upsert({
      organization_id: orgId,
      payer_id: payerId,
      clearinghouse: clearinghouse.trim(),
      clearinghouse_payer_id: clearinghouse_payer_id.trim(),
      is_default: is_default || false,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "payer_id,clearinghouse" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ clearinghouse_id: data }, { status: 201 });
}
