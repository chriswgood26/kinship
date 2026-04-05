import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "";

  let query = supabaseAdmin
    .from("breach_notifications")
    .select("*")
    .eq("organization_id", orgId)
    .order("discovered_date", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ breaches: data });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();

  if (!body.discovered_date) return NextResponse.json({ error: "discovered_date required" }, { status: 400 });
  if (!body.breach_type) return NextResponse.json({ error: "breach_type required" }, { status: 400 });
  if (!body.description) return NextResponse.json({ error: "description required" }, { status: 400 });

  // Compute 60-day notification deadlines per 45 CFR §164.404(b)
  const discoveredDate = new Date(body.discovered_date + "T12:00:00");
  const deadlineDate = new Date(discoveredDate);
  deadlineDate.setDate(deadlineDate.getDate() + 60);
  const deadline = deadlineDate.toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("breach_notifications")
    .insert({
      organization_id: orgId,
      discovered_date: body.discovered_date,
      breach_date: body.breach_date || null,
      breach_type: body.breach_type,
      breach_cause: body.breach_cause || null,
      business_associate_involved: body.business_associate_involved || false,
      business_associate_name: body.business_associate_name || null,
      phi_types: body.phi_types || [],
      individuals_affected: body.individuals_affected ? parseInt(body.individuals_affected) : null,
      description: body.description,
      risk_level: body.risk_level || "medium",
      risk_assessment_notes: body.risk_assessment_notes || null,
      individual_notification_deadline: deadline,
      hhs_notification_deadline: deadline,
      media_notification_required: body.individuals_affected >= 500,
      remediation_actions: body.remediation_actions || null,
      legal_counsel_notified: body.legal_counsel_notified || false,
      status: "open",
      created_by: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ breach: data }, { status: 201 });
}
