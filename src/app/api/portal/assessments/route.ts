import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/portal/assessments — list screenings submitted by this portal user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("id, client_id, organization_id")
    .eq("clerk_user_id", userId)
    .eq("is_active", true)
    .single();

  if (!portalUser) return NextResponse.json({ error: "Not a portal user" }, { status: 403 });

  const { data: screenings, error } = await supabaseAdmin
    .from("screenings")
    .select("id, tool, total_score, severity_label, administered_at, source, created_at")
    .eq("client_id", portalUser.client_id)
    .eq("organization_id", portalUser.organization_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ screenings });
}

// POST /api/portal/assessments — patient submits a screening from portal
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("id, client_id, organization_id, first_name, last_name")
    .eq("clerk_user_id", userId)
    .eq("is_active", true)
    .single();

  if (!portalUser) return NextResponse.json({ error: "Not a portal user" }, { status: 403 });

  const body = await req.json();
  const { tool, answers, total_score, severity_label } = body;

  if (!tool || !answers || total_score === undefined) {
    return NextResponse.json({ error: "tool, answers, and total_score are required" }, { status: 400 });
  }

  const allowedTools = ["phq9", "gad7"];
  if (!allowedTools.includes(tool)) {
    return NextResponse.json({ error: "Invalid assessment tool" }, { status: 400 });
  }

  const administered_by = [portalUser.first_name, portalUser.last_name].filter(Boolean).join(" ") || "Patient";

  const { data: screening, error } = await supabaseAdmin
    .from("screenings")
    .insert({
      organization_id: portalUser.organization_id,
      client_id: portalUser.client_id,
      portal_user_id: portalUser.id,
      tool,
      answers,
      total_score,
      severity_label: severity_label || null,
      administered_by,
      administered_by_clerk_id: userId,
      administered_at: new Date().toISOString(),
      source: "patient_portal",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ screening }, { status: 201 });
}
