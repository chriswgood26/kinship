import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();

  // Allowlist safe fields to prevent mass-assignment of sensitive fields
  const ALLOWED_FIELDS = ["name", "client_terminology", "address", "phone", "email", "npi", "tax_id", "logo_url", "timezone", "default_session_duration", "billing_email", "website"];
  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) sanitized[key] = body[key];
  }
  sanitized.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin.from("organizations")
    .update(sanitized)
    .eq("id", orgId)
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ org: data });
}
