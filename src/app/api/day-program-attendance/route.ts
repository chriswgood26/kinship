import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const url = new URL(req.url);
  const programId = url.searchParams.get("program_id");
  const clientId = url.searchParams.get("client_id");
  const date = url.searchParams.get("date");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabaseAdmin
    .from("day_program_attendance")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name), program:program_id(id, name, code, program_type)")
    .eq("organization_id", orgId)
    .order("attendance_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (programId) query = query.eq("program_id", programId);
  if (clientId) query = query.eq("client_id", clientId);
  if (date) query = query.eq("attendance_date", date);
  if (from) query = query.gte("attendance_date", from);
  if (to) query = query.lte("attendance_date", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();

  // Bulk insert: body.records is array of attendance rows
  const records = Array.isArray(body.records) ? body.records : [body];

  const rows = records.map((r: Record<string, unknown>) => {
    // Compute hours from check_in/check_out if not provided
    let hours_attended = r.hours_attended as number | null || null;
    if (!hours_attended && r.check_in_time && r.check_out_time) {
      const [ih, im] = (r.check_in_time as string).split(":").map(Number);
      const [oh, om] = (r.check_out_time as string).split(":").map(Number);
      const mins = (oh * 60 + om) - (ih * 60 + im);
      if (mins > 0) hours_attended = Math.round((mins / 60) * 4) / 4; // round to nearest 0.25h
    }
    // Default units from hours (1 unit = 15 min, H2014 billing)
    const units = (r.units as number) || (hours_attended ? Math.round(hours_attended * 4) : null);

    return {
      organization_id: orgId,
      program_id: r.program_id,
      client_id: r.client_id,
      attendance_date: r.attendance_date,
      status: r.status || "present",
      check_in_time: r.check_in_time ? (r.check_in_time as string) + ":00" : null,
      check_out_time: r.check_out_time ? (r.check_out_time as string) + ":00" : null,
      hours_attended,
      reason_absent: r.reason_absent || null,
      activity_notes: r.activity_notes || null,
      behavior_notes: r.behavior_notes || null,
      goal_progress: r.goal_progress || [],
      staff_name: r.staff_name || null,
      staff_clerk_id: (r.staff_clerk_id as string) || userId,
      billing_code: r.billing_code || "H2014",
      billing_modifier: r.billing_modifier || null,
      units,
      is_billable: r.is_billable !== false,
      notes: r.notes || null,
      created_by_clerk_id: userId,
    };
  });

  const { data, error } = await supabaseAdmin
    .from("day_program_attendance")
    .upsert(rows, { onConflict: "organization_id,program_id,client_id,attendance_date" })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { id, ...patch } = body;

  const { data, error } = await supabaseAdmin
    .from("day_program_attendance")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ record: data });
}
