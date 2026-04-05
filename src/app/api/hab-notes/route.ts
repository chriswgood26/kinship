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
  const serviceType = url.searchParams.get("service_type");

  let query = supabaseAdmin
    .from("hab_notes")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("service_date", { ascending: false })
    .limit(100);

  if (clientId) query = query.eq("client_id", clientId);
  if (date) query = query.eq("service_date", date);
  if (serviceType) query = query.eq("service_type", serviceType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data || [] });
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
    .from("hab_notes")
    .insert({
      organization_id: orgId,
      client_id: body.client_id,
      service_date: body.service_date,
      start_time: body.start_time ? body.start_time + ":00" : null,
      end_time: body.end_time ? body.end_time + ":00" : null,
      duration_minutes,
      service_type: body.service_type || "in_home_hab",
      location: body.location || null,
      setting_details: body.setting_details || null,
      staff_name: body.staff_name,
      staff_credentials: body.staff_credentials || null,
      staff_clerk_id: userId,
      isp_id: body.isp_id || null,
      goals_addressed: body.goals_addressed || [],
      skill_areas: body.skill_areas || [],
      prompt_levels_used: body.prompt_levels_used || [],
      engagement_level: body.engagement_level || null,
      attendance: body.attendance || "attended",
      service_summary: body.service_summary,
      skills_practiced: body.skills_practiced || null,
      client_response: body.client_response || null,
      progress_toward_goals: body.progress_toward_goals || null,
      barriers: body.barriers || null,
      strategies_used: body.strategies_used || null,
      next_steps: body.next_steps || null,
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
  return NextResponse.json({ note: data }, { status: 201 });
}
