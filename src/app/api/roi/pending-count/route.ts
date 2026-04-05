import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ count: 0 });
  const orgId = await getOrgId(userId);
  const { count } = await supabaseAdmin
    .from("releases_of_information")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("requested_via_portal", true)
    .eq("staff_reviewed", false);
  return NextResponse.json({ count: count || 0 });
}
