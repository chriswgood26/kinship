import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();

  // Allowlist safe fields to prevent mass-assignment of sensitive fields
  const ALLOWED_FIELDS = ["name", "client_terminology", "address", "phone", "email", "npi", "tax_id", "logo_url", "timezone", "default_session_duration", "billing_email", "website"];
  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) sanitized[key] = body[key];
  }
  sanitized.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin.from("organizations")
    .update(sanitized)
    .eq("id", profile?.organization_id || "")
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ org: data });
}
