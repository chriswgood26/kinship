// PUT    /api/payers/[id]/clearinghouse-ids/[cid] — update a clearinghouse ID entry
// DELETE /api/payers/[id]/clearinghouse-ids/[cid] — remove a clearinghouse ID from a payer

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

type RouteCtx = { params: Promise<{ id: string; cid: string }> };

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const { id: payerId, cid } = await ctx.params;
  const body = await req.json();

  // If setting as default, unset existing defaults for this payer
  if (body.is_default) {
    await supabaseAdmin
      .from("payer_clearinghouse_ids")
      .update({ is_default: false })
      .eq("payer_id", payerId)
      .eq("organization_id", orgId);
  }

  const ALLOWED = ["clearinghouse_payer_id", "is_default", "notes"];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of ALLOWED) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabaseAdmin
    .from("payer_clearinghouse_ids")
    .update(updates)
    .eq("id", cid)
    .eq("payer_id", payerId)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ clearinghouse_id: data });
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

  const { id: payerId, cid } = await ctx.params;

  const { error } = await supabaseAdmin
    .from("payer_clearinghouse_ids")
    .delete()
    .eq("id", cid)
    .eq("payer_id", payerId)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
