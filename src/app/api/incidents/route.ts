import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.description) return NextResponse.json({ error: "description required" }, { status: 400 });
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("incident_reports").insert({
    organization_id: profile?.organization_id || null,
    client_id: body.client_id || null,
    incident_date: body.incident_date,
    incident_time: body.incident_time ? body.incident_time + ":00" : null,
    incident_type: body.incident_type,
    severity: body.severity || "minor",
    location: body.location || null,
    description: body.description,
    antecedent: body.antecedent || null,
    behavior: body.behavior || null,
    consequence: body.consequence || null,
    injury_occurred: body.injury_occurred || false,
    injury_description: body.injury_description || null,
    medical_attention: body.medical_attention || false,
    medical_attention_details: body.medical_attention_details || null,
    witnesses: body.witnesses || [],
    staff_involved: body.staff_involved || [],
    immediate_actions: body.immediate_actions || null,
    notifications_required: body.notifications_required !== false,
    state_report_required: body.state_report_required || false,
    status: "open",
    created_by: userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ incident: data }, { status: 201 });
}
