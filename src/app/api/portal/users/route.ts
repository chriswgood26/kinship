import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const body = await req.json();
  if (!body.client_id || !body.email || !body.first_name) return NextResponse.json({ error: "client_id, email, and first_name required" }, { status: 400 });

  const { data, error } = await supabaseAdmin.from("portal_users").insert({
    organization_id: orgId,
    client_id: body.client_id,
    clerk_user_id: `portal_pending_${Date.now()}`,
    email: body.email,
    first_name: body.first_name,
    last_name: body.last_name || null,
    relationship: body.relationship || "patient",
    is_active: true,
    access_settings: body.access_settings || { appointments: true, documents: false, notes: false, billing: false, treatment_plan: false, messages: false },
    invited_by: userId,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portalUser: data }, { status: 201 });
}
