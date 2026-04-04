import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") || "";
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id, first_name, last_name").eq("clerk_user_id", userId).single();
  let query = supabaseAdmin.from("clients").select("id, first_name, last_name, mrn, preferred_name, pronouns").eq("organization_id", profile?.organization_id || "").eq("is_active", true).order("last_name").limit(15);
  if (q.length >= 2) query = query.or(`last_name.ilike.%${q}%,first_name.ilike.%${q}%,mrn.ilike.%${q}%,preferred_name.ilike.%${q}%`);
  const { data } = await query;

  if (profile?.organization_id) {
    await logAuditEvent({
      organization_id: profile.organization_id,
      user_clerk_id: userId,
      user_name: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : null,
      action: "view",
      resource_type: "client",
      description: q ? `Searched client list: "${q}"` : "Viewed client list",
      ip_address: getRequestIp(req),
      user_agent: getRequestUserAgent(req),
    });
  }

  return NextResponse.json({ clients: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.first_name || !body.last_name) return NextResponse.json({ error: "first_name and last_name required" }, { status: 400 });
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id, first_name, last_name").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("clients").insert({
    organization_id: profile?.organization_id,
    first_name: body.first_name, last_name: body.last_name,
    preferred_name: body.preferred_name || null, middle_name: body.middle_name || null,
    date_of_birth: body.date_of_birth || null, gender: body.gender || null,
    pronouns: body.pronouns || null, primary_language: body.primary_language || "English",
    race: body.race || null, ethnicity: body.ethnicity || null, ssn_last4: body.ssn_last4 || null,
    phone_primary: body.phone_primary || null, phone_secondary: body.phone_secondary || null,
    email: body.email || null, address_line1: body.address_line1 || null,
    city: body.city || null, state: body.state || null, zip: body.zip || null,
    emergency_contact_name: body.emergency_contact_name || null,
    emergency_contact_phone: body.emergency_contact_phone || null,
    emergency_contact_relationship: body.emergency_contact_relationship || null,
    insurance_provider: body.insurance_provider || null,
    insurance_member_id: body.insurance_member_id || null,
    insurance_group_number: body.insurance_group_number || null,
    status: body.status || "active", is_active: true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (profile?.organization_id && data) {
    await logAuditEvent({
      organization_id: profile.organization_id,
      user_clerk_id: userId,
      user_name: profile ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() : null,
      action: "create",
      resource_type: "client",
      resource_id: data.id,
      client_id: data.id,
      description: `Created new client record: ${body.first_name} ${body.last_name}`,
      ip_address: getRequestIp(req),
      user_agent: getRequestUserAgent(req),
    });
  }

  return NextResponse.json({ client: data }, { status: 201 });
}
