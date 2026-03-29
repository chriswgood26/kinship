import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const { error } = await supabaseAdmin.from("waitlist").upsert({ email: body.email, name: body.name || null, agency_name: body.agency_name || null, agency_type: body.agency_type || null, agency_size: body.agency_size || null, message: body.message || null }, { onConflict: "email" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: "Added to waitlist" });
}
