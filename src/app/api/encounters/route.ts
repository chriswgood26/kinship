import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const orgId = await getOrgId(userId);
  const { data, error } = await supabaseAdmin.from("encounters").insert({ organization_id: orgId, client_id: body.client_id, encounter_date: body.encounter_date, encounter_type: body.encounter_type || null, chief_complaint: body.chief_complaint || null, status: "in_progress" }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ encounter: data }, { status: 201 });
}
