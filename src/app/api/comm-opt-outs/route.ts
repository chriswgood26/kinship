import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const clientId = req.nextUrl.searchParams.get("client_id");
  let query = supabaseAdmin
    .from("comm_opt_outs")
    .select("*, clients(first_name, last_name, email, phone_primary)")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("opted_out_at", { ascending: false });

  if (clientId) query = query.eq("client_id", clientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ opt_outs: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { client_id, channel, reason, action } = body;

  if (!client_id || !channel) {
    return NextResponse.json({ error: "client_id, channel required" }, { status: 400 });
  }

  if (action === "opt_in") {
    // Re-opt in — mark existing opt-out as inactive
    const { error } = await supabaseAdmin
      .from("comm_opt_outs")
      .update({ is_active: false, opted_back_in_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .eq("client_id", client_id)
      .eq("channel", channel)
      .eq("is_active", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ message: "Opted back in" });
  }

  // Opt out — upsert
  const { data, error } = await supabaseAdmin
    .from("comm_opt_outs")
    .upsert({
      organization_id: orgId,
      client_id,
      channel,
      reason: reason || null,
      opted_out_at: new Date().toISOString(),
      opted_back_in_at: null,
      is_active: true,
    }, { onConflict: "organization_id,client_id,channel" })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ opt_out: data }, { status: 201 });
}
