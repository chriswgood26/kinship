import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// GET /api/clients/opening-balances?client_id=xxx
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id");

  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("client_opening_balances")
    .select("*")
    .eq("organization_id", orgId)
    .eq("client_id", clientId)
    .order("balance_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ opening_balances: data });
}

// POST /api/clients/opening-balances
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();

  if (!body.client_id || !body.amount || !body.balance_date) {
    return NextResponse.json({ error: "client_id, amount, and balance_date are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("client_opening_balances")
    .insert({
      organization_id: orgId,
      client_id: body.client_id,
      balance_date: body.balance_date,
      amount: parseFloat(body.amount),
      balance_type: body.balance_type || "self_pay",
      source_system: body.source_system || null,
      description: body.description || null,
      notes: body.notes || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ opening_balance: data }, { status: 201 });
}

// DELETE /api/clients/opening-balances?id=xxx
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("client_opening_balances")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
