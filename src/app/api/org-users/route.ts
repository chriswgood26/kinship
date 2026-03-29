import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  if (!profile?.organization_id) return NextResponse.json({ users: [] });
  const { data } = await supabaseAdmin.from("user_profiles")
    .select("id, first_name, last_name, role, title, credentials, clerk_user_id")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("last_name");
  return NextResponse.json({ users: data || [] });
}
