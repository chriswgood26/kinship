import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let orgId: string;
    try {
      orgId = await getOrgId(userId);
    } catch {
      return NextResponse.json({ error: "Organization not found for this user" }, { status: 403 });
    }

    const body = await req.json();
    if (!body.email || !body.first_name || !body.last_name) {
      return NextResponse.json({ error: "Email, first name, and last name required" }, { status: 400 });
    }

    // Create a user_profile record — in production this would also trigger a Clerk invitation
    const { data, error } = await supabaseAdmin.from("user_profiles").insert({
      organization_id: orgId,
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
  } catch (err) {
    console.error("Invite user error:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
