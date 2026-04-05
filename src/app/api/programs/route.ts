import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";


export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const locationId = req.nextUrl.searchParams.get("location_id");
  const includeInactive = req.nextUrl.searchParams.get("include_inactive") === "true";

  let query = supabaseAdmin
    .from("programs")
    .select("*, location:location_id(id, name, code, city, state)")
    .eq("organization_id", orgId)
    .order("name");

  if (!includeInactive) query = query.eq("is_active", true);
  if (locationId) query = query.eq("location_id", locationId);

  const { data } = await query;
  return NextResponse.json({ programs: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { data, error } = await supabaseAdmin.from("programs").insert({
    organization_id: orgId,
    name: body.name,
    code: body.code || null,
    program_type: body.program_type || "outpatient",
    description: body.description || null,
    capacity: body.capacity ? Number(body.capacity) : null,
    location_id: body.location_id || null,
    is_active: true,
  }).select("*, location:location_id(id, name, code, city, state)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ program: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { id, ...patch } = body;
  const { data, error } = await supabaseAdmin.from("programs").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", orgId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ program: data });
}
