import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("consent_forms")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ consent_form: data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { id } = await params;
  const body = await req.json();

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("consent_forms")
    .select("id")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowed = ["status", "signed_at", "signed_by", "guardian_name", "signature_method", "witnessed_by", "expiration_date", "notes", "title"];
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  // Auto-set signed_at when marking as signed
  if (body.status === "signed" && !body.signed_at && !updates.signed_at) {
    updates.signed_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from("consent_forms")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ consent_form: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("consent_forms")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
