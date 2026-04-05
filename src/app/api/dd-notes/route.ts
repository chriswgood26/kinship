import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const client_id = new URL(req.url).searchParams.get("patient_id");
  let query = supabaseAdmin.from("dd_progress_notes").select("*").order("note_date", { ascending: false }).limit(20);
  if (client_id) query = query.eq("client_id", client_id);
  const { data } = await query;
  return NextResponse.json({ notes: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("dd_progress_notes").insert({
    organization_id: profile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727",
    client_id: body.client_id,
    note_date: body.note_date,
    shift: body.shift,
    staff_name: body.staff_name,
    staff_role: body.staff_role || null,
    start_time: body.start_time ? body.start_time + ":00" : null,
    end_time: body.end_time ? body.end_time + ":00" : null,
    location: body.location || null,
    activities: body.activities || null,
    behaviors: body.behaviors || null,
    mood_affect: body.mood_affect || null,
    goal_progress: body.goal_progress || [],
    medical_concerns: body.medical_concerns || null,
    communication_notes: body.communication_notes || null,
    personal_care: body.personal_care || null,
    community_integration: body.community_integration || null,
    incidents: body.incidents || null,
    family_contact: body.family_contact || null,
    follow_up_needed: body.follow_up_needed || false,
    follow_up_notes: body.follow_up_notes || null,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
