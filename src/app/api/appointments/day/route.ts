import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const providerId = searchParams.get("provider_id") || null;

  let query = supabaseAdmin
    .from("appointments")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name), provider:provider_id(first_name, last_name, title)")
    .eq("organization_id", orgId || "")
    .eq("appointment_date", date)
    .order("start_time");

  if (providerId) query = query.eq("provider_id", providerId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointments: data || [] });
}
