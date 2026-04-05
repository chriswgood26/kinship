import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  const date = url.searchParams.get("date");
  const activityType = url.searchParams.get("activity_type");

  let query = supabaseAdmin
    .from("community_support_activities")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("activity_date", { ascending: false })
    .limit(50);

  if (clientId) query = query.eq("client_id", clientId);
  if (date) query = query.eq("activity_date", date);
  if (activityType) query = query.eq("activity_type", activityType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activities: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();

  // Compute duration if start/end provided
  let duration_minutes = body.duration_minutes || null;
  if (!duration_minutes && body.start_time && body.end_time) {
    const [sh, sm] = body.start_time.split(":").map(Number);
    const [eh, em] = body.end_time.split(":").map(Number);
    duration_minutes = (eh * 60 + em) - (sh * 60 + sm);
    if (duration_minutes < 0) duration_minutes += 24 * 60;
  }

  const { data, error } = await supabaseAdmin
    .from("community_support_activities")
    .insert({
      organization_id: orgId,
      client_id: body.client_id,
      activity_date: body.activity_date,
      start_time: body.start_time ? body.start_time + ":00" : null,
      end_time: body.end_time ? body.end_time + ":00" : null,
      duration_minutes,
      activity_type: body.activity_type || "case_management",
      location: body.location || null,
      setting: body.setting || null,
      staff_name: body.staff_name,
      staff_clerk_id: body.staff_clerk_id || userId,
      staff_credentials: body.staff_credentials || null,
      activity_summary: body.activity_summary,
      goals_addressed: body.goals_addressed || [],
      client_response: body.client_response || null,
      progress_notes: body.progress_notes || null,
      barriers_identified: body.barriers_identified || null,
      action_steps: body.action_steps || null,
      resources_connected: body.resources_connected || null,
      collateral_contacts: body.collateral_contacts || null,
      engagement_level: body.engagement_level || null,
      attendance: body.attendance || "attended",
      safety_concern: body.safety_concern || false,
      safety_notes: body.safety_notes || null,
      follow_up_date: body.follow_up_date || null,
      follow_up_notes: body.follow_up_notes || null,
      billing_code: body.billing_code || null,
      billing_modifier: body.billing_modifier || null,
      units: body.units || 1,
      is_billable: body.is_billable !== false,
      notes: body.notes || null,
      created_by_clerk_id: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activity: data }, { status: 201 });
}
