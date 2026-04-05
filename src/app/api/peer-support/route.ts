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

  let query = supabaseAdmin
    .from("peer_support_sessions")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("session_date", { ascending: false })
    .limit(50);

  if (clientId) query = query.eq("client_id", clientId);
  if (date) query = query.eq("session_date", date);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data || [] });
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
    .from("peer_support_sessions")
    .insert({
      organization_id: orgId,
      client_id: body.client_id,
      session_date: body.session_date,
      start_time: body.start_time ? body.start_time + ":00" : null,
      end_time: body.end_time ? body.end_time + ":00" : null,
      duration_minutes,
      session_type: body.session_type || "individual",
      location: body.location || null,
      specialist_name: body.specialist_name,
      specialist_clerk_id: body.specialist_clerk_id || userId,
      specialist_credentials: body.specialist_credentials || null,
      session_focus: body.session_focus || [],
      session_summary: body.session_summary || null,
      lived_experience_shared: body.lived_experience_shared || false,
      lived_experience_notes: body.lived_experience_notes || null,
      engagement_level: body.engagement_level || null,
      wellness_plan_reviewed: body.wellness_plan_reviewed || false,
      recovery_goals_addressed: body.recovery_goals_addressed || null,
      strengths_identified: body.strengths_identified || null,
      barriers_addressed: body.barriers_addressed || null,
      safety_check_completed: body.safety_check_completed || false,
      crisis_indicated: body.crisis_indicated || false,
      crisis_response_taken: body.crisis_response_taken || null,
      next_session_planned: body.next_session_planned || null,
      next_session_notes: body.next_session_notes || null,
      referrals_made: body.referrals_made || null,
      billing_code: body.billing_code || "H0038",
      billing_modifier: body.billing_modifier || null,
      units: body.units || 1,
      is_billable: body.is_billable !== false,
      notes: body.notes || null,
      created_by_clerk_id: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data }, { status: 201 });
}
