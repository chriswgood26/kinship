import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const orgId = await getOrgId(userId);

  const isGroup = body.is_group === true;

  // For group sessions, client_id can be null (no primary client)
  if (!isGroup && !body.client_id) {
    return NextResponse.json({ error: "client_id required for non-group encounters" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("encounters").insert({
    organization_id: orgId,
    client_id: body.client_id || null,
    encounter_date: body.encounter_date,
    encounter_type: body.encounter_type || null,
    chief_complaint: body.chief_complaint || null,
    status: "in_progress",
    is_group: isGroup,
    group_name: isGroup ? (body.group_name || null) : null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If group session, insert participants
  if (isGroup && body.participant_ids?.length) {
    const rows = (body.participant_ids as string[]).map((cid: string) => ({
      organization_id: orgId,
      encounter_id: data.id,
      client_id: cid,
      attendance_status: "present",
    }));
    await supabaseAdmin.from("group_session_participants").insert(rows);
  }

  return NextResponse.json({ encounter: data }, { status: 201 });
}
