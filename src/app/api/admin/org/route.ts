import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// Only include columns that actually exist in the organizations table
const ALLOWED_COLUMNS = ["name", "npi", "tax_id", "phone", "email", "website", "address_line1", "address_line2", "city", "state", "zip", "client_terminology", "pay_period_type", "pay_period_start_day", "pay_period_start_date", "field_config", "billing_contact_name", "billing_contact_email", "billing_contact_phone"];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("id, name, npi, tax_id, phone, email, client_terminology, pay_period_type, pay_period_start_day, pay_period_start_date, field_config, billing_contact_name, billing_contact_email, billing_contact_phone")
    .eq("id", "34e600b3-beb0-440c-88c4-20032185e727")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ org: data });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();

  // Strip unknown columns to prevent Supabase errors
  const safeBody = Object.fromEntries(
    Object.entries(body).filter(([key]) => ALLOWED_COLUMNS.includes(key))
  );

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .update({ ...safeBody, updated_at: new Date().toISOString() })
    .eq("id", orgId)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ org: data });
}
