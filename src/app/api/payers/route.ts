// GET  /api/payers — list all payers for org (with their clearinghouse IDs)
// POST /api/payers — create a new payer

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
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const [payersResult, orgResult] = await Promise.all([
    supabaseAdmin
      .from("payers")
      .select(`
        *,
        clearinghouse_ids:payer_clearinghouse_ids(*)
      `)
      .eq("organization_id", orgId)
      .order("name"),
    supabaseAdmin
      .from("organizations")
      .select("restrict_to_credentialed_payers")
      .eq("id", orgId)
      .single(),
  ]);

  if (payersResult.error) return NextResponse.json({ error: payersResult.error.message }, { status: 500 });

  return NextResponse.json({
    payers: payersResult.data || [],
    restrict_to_credentialed_payers: orgResult.data?.restrict_to_credentialed_payers ?? false,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orgId: string;
  try {
    orgId = await getOrgId(userId);
  } catch {
    return NextResponse.json({ error: "Organization not found" }, { status: 403 });
  }

  const body = await req.json();
  const { name, payer_type, state, notes, is_active } = body as {
    name: string;
    payer_type?: string;
    state?: string;
    notes?: string;
    is_active?: boolean;
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Payer name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("payers")
    .insert({
      organization_id: orgId,
      name: name.trim(),
      payer_type: payer_type || "commercial",
      state: state || null,
      notes: notes || null,
      is_active: is_active !== false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payer: data }, { status: 201 });
}
