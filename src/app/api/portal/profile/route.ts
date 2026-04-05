import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_FIELDS = [
  "preferred_name",
  "phone_primary",
  "phone_secondary",
  "email",
  "address_line1",
  "city",
  "state",
  "zip",
  "emergency_contact_name",
  "emergency_contact_phone",
  "emergency_contact_relationship",
  "primary_language",
  "pronouns",
];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("client_id, organization_id")
    .eq("clerk_user_id", userId)
    .eq("is_active", true)
    .single();

  if (!portalUser) return NextResponse.json({ error: "Not a portal user" }, { status: 403 });

  const { data: client, error } = await supabaseAdmin
    .from("clients")
    .select(
      "first_name, last_name, preferred_name, date_of_birth, gender, pronouns, " +
      "phone_primary, phone_secondary, email, address_line1, city, state, zip, " +
      "primary_language, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship"
    )
    .eq("id", portalUser.client_id)
    .eq("organization_id", portalUser.organization_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("client_id, organization_id")
    .eq("clerk_user_id", userId)
    .eq("is_active", true)
    .single();

  if (!portalUser) return NextResponse.json({ error: "Not a portal user" }, { status: 403 });

  const body = await req.json();

  // Only allow whitelisted demographic fields — never let patient change name/DOB/sensitive fields
  const updates: Record<string, string | null> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      updates[field] = body[field] ?? null;
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data: client, error } = await supabaseAdmin
    .from("clients")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", portalUser.client_id)
    .eq("organization_id", portalUser.organization_id)
    .select(
      "first_name, last_name, preferred_name, date_of_birth, gender, pronouns, " +
      "phone_primary, phone_secondary, email, address_line1, city, state, zip, " +
      "primary_language, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ client });
}
