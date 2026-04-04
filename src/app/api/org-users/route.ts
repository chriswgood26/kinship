import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { data } = await supabaseAdmin.from("user_profiles")
    .select("id, first_name, last_name, role, title, credentials, clerk_user_id")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("last_name");
  return NextResponse.json({ users: data || [] });
}
