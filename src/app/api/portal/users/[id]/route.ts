import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // Allowlist safe fields — never allow id, client_id, clerk_user_id, organization_id, created_at
  const ALLOWED_FIELDS = [
    "display_name", "email", "phone", "notification_preferences", "access_settings",
    "preferred_language", "avatar_url", "is_active",
  ];
  const safeUpdate: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) safeUpdate[key] = body[key];
  }

  const { data, error } = await supabaseAdmin.from("portal_users").update(safeUpdate).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ portalUser: data });
}
