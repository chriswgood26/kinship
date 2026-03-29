import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("appointments").insert({ organization_id: profile?.organization_id, client_id: body.client_id, appointment_date: body.appointment_date, start_time: body.start_time || null, end_time: body.end_time || null, duration_minutes: body.duration_minutes || 60, appointment_type: body.appointment_type || null, status: body.status || "scheduled", notes: body.notes || null }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ appointment: data }, { status: 201 });
}
