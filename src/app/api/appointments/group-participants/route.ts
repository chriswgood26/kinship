import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { appointment_id, patient_ids } = await req.json();
  if (!appointment_id || !patient_ids?.length) return NextResponse.json({ error: "appointment_id and patient_ids required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("group_appointment_participants").insert(
    patient_ids.map((pid: string) => ({ appointment_id, client_id: pid, status: "scheduled" }))
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const appointment_id = new URL(req.url).searchParams.get("appointment_id");
  if (!appointment_id) return NextResponse.json({ error: "appointment_id required" }, { status: 400 });
  const { data } = await supabaseAdmin
    .from("group_appointment_participants")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .eq("appointment_id", appointment_id);
  return NextResponse.json({ participants: data || [] });
}
