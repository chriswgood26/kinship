import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const url = new URL(req.url);
  const client_id = url.searchParams.get("client_id");
  const status = url.searchParams.get("status");
  const form_type = url.searchParams.get("form_type");

  let query = supabaseAdmin
    .from("consent_forms")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (client_id) query = query.eq("client_id", client_id);
  if (status) query = query.eq("status", status);
  if (form_type) query = query.eq("form_type", form_type);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ consent_forms: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();

  if (!body.client_id || !body.form_type || !body.title) {
    return NextResponse.json({ error: "client_id, form_type, and title are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("consent_forms")
    .insert({
      organization_id: orgId,
      client_id: body.client_id,
      form_type: body.form_type,
      title: body.title,
      status: body.status || "pending_signature",
      signed_at: body.signed_at || null,
      signed_by: body.signed_by || null,
      guardian_name: body.guardian_name || null,
      signature_method: body.signature_method || "written",
      witnessed_by: body.witnessed_by || null,
      expiration_date: body.expiration_date || null,
      notes: body.notes || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ consent_form: data }, { status: 201 });
}
