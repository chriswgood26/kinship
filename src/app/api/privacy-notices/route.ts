import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// GET /api/privacy-notices
// Returns all HIPAA privacy notice acknowledgments for the org (consent_forms where form_type = 'hipaa_notice')
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const url = new URL(req.url);
  const client_id = url.searchParams.get("client_id");
  const status = url.searchParams.get("status");

  let query = supabaseAdmin
    .from("consent_forms")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("organization_id", orgId)
    .eq("form_type", "hipaa_notice")
    .order("created_at", { ascending: false })
    .limit(500);

  if (client_id) query = query.eq("client_id", client_id);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ privacy_notices: data || [] });
}

// POST /api/privacy-notices
// Log a new HIPAA privacy notice acknowledgment
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();

  if (!body.client_id) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }

  const signedAt = body.signed_at || new Date().toISOString();
  // Default: annual renewal — expires 1 year from acknowledgment date
  const expirationDate =
    body.expiration_date ||
    new Date(new Date(signedAt).getTime() + 365 * 86400000).toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("consent_forms")
    .insert({
      organization_id: orgId,
      client_id: body.client_id,
      form_type: "hipaa_notice",
      title: body.title || "HIPAA Notice of Privacy Practices",
      status: body.status || "signed",
      signed_at: body.status === "pending_signature" ? null : signedAt,
      signed_by: body.signed_by || "patient",
      guardian_name: body.guardian_name || null,
      signature_method: body.signature_method || "written",
      witnessed_by: body.witnessed_by || null,
      expiration_date: body.status === "pending_signature" ? null : expirationDate,
      notes: body.notes || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ privacy_notice: data }, { status: 201 });
}
