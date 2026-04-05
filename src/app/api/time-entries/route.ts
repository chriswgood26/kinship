import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const week = req.nextUrl.searchParams.get("week"); // YYYY-WW format
  const clinicianId = req.nextUrl.searchParams.get("clinician_id");
  const allClinicians = req.nextUrl.searchParams.get("all") === "true";

  let query = supabaseAdmin
    .from("time_entries")
    .select("*, client:client_id(first_name, last_name, mrn)")
    .eq("organization_id", orgId)
    .order("entry_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(200);

  if (clinicianId) {
    // Filter to specific clinician (works in both my and all-staff views)
    query = query.eq("clinician_clerk_id", clinicianId);
  } else if (!allClinicians) {
    // Default: show only current user's entries
    query = query.eq("clinician_clerk_id", userId);
  }
  // If allClinicians and no clinicianId: show everyone (no filter)

  if (week) {
    // week = YYYY-WW, get start and end of that week
    const [year, weekNum] = week.split("-").map(Number);
    const jan1 = new Date(year, 0, 1);
    const weekStart = new Date(jan1.getTime() + (weekNum - 1) * 7 * 86400000);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
    query = query
      .gte("entry_date", weekStart.toISOString().split("T")[0])
      .lte("entry_date", weekEnd.toISOString().split("T")[0]);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("first_name, last_name, credentials, role")
    .eq("clerk_user_id", userId)
    .single();

  // Calculate duration in minutes if start/end times provided
  let duration_minutes = body.duration_minutes;
  if (!duration_minutes && body.start_time && body.end_time) {
    const [sh, sm] = body.start_time.split(":").map(Number);
    const [eh, em] = body.end_time.split(":").map(Number);
    duration_minutes = (eh * 60 + em) - (sh * 60 + sm);
  }

  const { data, error } = await supabaseAdmin.from("time_entries").insert({
    organization_id: orgId,
    clinician_clerk_id: userId,
    clinician_name: profile ? `${profile.first_name} ${profile.last_name}${profile.credentials ? `, ${profile.credentials}` : ""}` : null,
    clinician_role: profile?.role || null,
    client_id: body.client_id || null,
    encounter_id: body.encounter_id || null,
    program_id: body.program_id || null,
    entry_date: body.entry_date,
    start_time: body.start_time || null,
    end_time: body.end_time || null,
    duration_minutes: duration_minutes || body.duration_minutes,
    activity_type: body.activity_type,
    activity_description: body.activity_description || null,
    is_billable: body.is_billable !== false,
    funding_source: body.funding_source || null,
    notes: body.notes || null,
    status: "submitted",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { id, ...patch } = body;
  const { data, error } = await supabaseAdmin
    .from("time_entries")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await supabaseAdmin.from("time_entries").delete().eq("id", id).eq("clinician_clerk_id", userId);
  return NextResponse.json({ deleted: true });
}
