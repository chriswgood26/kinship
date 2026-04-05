// POST — public (no auth) — submit a self-registration request
// GET  — staff auth required — list pending/all registration requests for the org

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { org_slug, first_name, last_name, email, phone, date_of_birth, relationship, patient_name, message } = body;

  if (!org_slug || !first_name || !last_name || !email) {
    return NextResponse.json({ error: "org_slug, first_name, last_name, and email are required" }, { status: 400 });
  }

  // Resolve org by slug
  const { data: org, error: orgError } = await supabaseAdmin
    .from("organizations")
    .select("id, name, is_active")
    .eq("slug", org_slug)
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (!org.is_active) {
    return NextResponse.json({ error: "This organization is not accepting registrations" }, { status: 403 });
  }

  // Prevent duplicate pending requests for the same email
  const { data: existing } = await supabaseAdmin
    .from("portal_registration_requests")
    .select("id, status")
    .eq("organization_id", org.id)
    .eq("email", email.toLowerCase().trim())
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      error: "A pending registration request already exists for this email address. Please wait for staff to review it, or contact the organization directly.",
    }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin
    .from("portal_registration_requests")
    .insert({
      organization_id: org.id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || null,
      date_of_birth: date_of_birth || null,
      relationship: relationship || "self",
      patient_name: patient_name?.trim() || null,
      message: message?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id, org_name: org.name }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";

  const query = supabaseAdmin
    .from("portal_registration_requests")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ requests: data });
}
