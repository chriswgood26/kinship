import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);

  const body = await req.json();
  if (!body.email || !body.first_name || !body.last_name) {
    return NextResponse.json({ error: "Email, first name, and last name required" }, { status: 400 });
  }

  const { data: adminProfile } = await supabaseAdmin
    .from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();

  // Create a user_profile record — in production this would also trigger a Clerk invitation
  const { data, error } = await supabaseAdmin.from("user_profiles").insert({
    organization_id: adminProfile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727",
    clerk_user_id: `pending_${Date.now()}`,
    first_name: body.first_name,
    last_name: body.last_name,
    email: body.email,
    role: body.role || "clinician",
    title: body.title || null,
    credentials: body.credentials || null,
    npi: body.npi || null,
    is_active: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: data }, { status: 201 });
}
