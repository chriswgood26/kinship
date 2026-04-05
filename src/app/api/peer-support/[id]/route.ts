import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("peer_support_sessions")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ session: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { id } = await params;
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("peer_support_sessions")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("peer_support_sessions")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
