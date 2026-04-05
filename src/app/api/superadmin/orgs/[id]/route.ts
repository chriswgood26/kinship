import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPERADMIN_IDS = process.env.SUPERADMIN_USER_IDS?.split(",") || [];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !SUPERADMIN_IDS.includes(userId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const [
    { data: org },
    { data: users },
    { data: feedback },
    { data: charges },
  ] = await Promise.all([
    supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single(),
    supabaseAdmin
      .from("user_profiles")
      .select("id, first_name, last_name, email, role, is_active, created_at")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("feedback")
      .select("id, type, problem, impact, ideal, status, created_at, submitted_by_name, submitted_by_email, admin_notes")
      .eq("organization_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("charges")
      .select("amount, status, created_at")
      .eq("organization_id", id),
  ]);

  // Lifetime revenue = sum of all charge amounts (posted/paid)
  const lifetimeRevenue = (charges || [])
    .filter((c) => ["posted", "paid", "submitted"].includes(c.status || ""))
    .reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);

  return NextResponse.json({
    org: org || null,
    users: users || [],
    feedback: feedback || [],
    lifetimeRevenue,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !SUPERADMIN_IDS.includes(userId))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const ALLOWED = [
    "plan", "addons", "is_active", "name",
    "disabled_forms", "disabled_modules", "ccbhc_reporting_enabled",
    "requested_plan",
  ];
  const safeBody = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED.includes(k))
  );

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .update({ ...safeBody, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ org: data });
}
