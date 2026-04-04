import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";


export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { data } = await supabaseAdmin
    .from("programs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("name");
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
    is_active: true,
  }).select().single();
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
