import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client_id = new URL(req.url).searchParams.get("patient_id");
  if (!client_id) return NextResponse.json({ team: [] });
  const orgId = await getOrgId(userId);
  const { data } = await supabaseAdmin.from("care_team")
    .select("*, user_profile:user_profile_id(id, first_name, last_name, role, title, credentials, clerk_user_id)")
    .eq("client_id", client_id)
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("added_at");
  return NextResponse.json({ team: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const orgId = await getOrgId(userId);
  const { data, error } = await supabaseAdmin.from("care_team").insert({
    organization_id: orgId,
    client_id: body.client_id,
    user_profile_id: body.user_profile_id || null,
    staff_name: body.staff_name || null,
    role: body.role,
    notes: body.notes || null,
    is_active: true,
  }).select("*, user_profile:user_profile_id(id, first_name, last_name, role, title, credentials, clerk_user_id)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data }, { status: 201 });
}
