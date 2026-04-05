import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// GET /api/group-sessions/participants?encounter_id=xxx
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const encounterId = new URL(req.url).searchParams.get("encounter_id");
  if (!encounterId) return NextResponse.json({ error: "encounter_id required" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("group_session_participants")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("encounter_id", encounterId)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ participants: data || [] });
}

// POST /api/group-sessions/participants
// Body: { encounter_id, client_ids: string[] }  — bulk add participants
// OR    { id, attendance_status, participation_notes }  — update a single participant
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();

  // Bulk insert participants
  if (body.client_ids && body.encounter_id) {
    const rows = (body.client_ids as string[]).map((cid: string) => ({
      organization_id: orgId,
      encounter_id: body.encounter_id,
      client_id: cid,
      attendance_status: "present",
    }));
    const { data, error } = await supabaseAdmin
      .from("group_session_participants")
      .upsert(rows, { onConflict: "encounter_id,client_id" })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ participants: data });
  }

  // Update a single participant record
  if (body.id) {
    const { data, error } = await supabaseAdmin
      .from("group_session_participants")
      .update({
        attendance_status: body.attendance_status,
        participation_notes: body.participation_notes ?? null,
      })
      .eq("id", body.id)
      .eq("organization_id", orgId)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ participant: data });
  }

  return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
}

// DELETE /api/group-sessions/participants?id=xxx
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("group_session_participants")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
