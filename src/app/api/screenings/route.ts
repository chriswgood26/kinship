import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const client_id = new URL(req.url).searchParams.get("client_id");
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  let query = supabaseAdmin.from("screenings").select("*").eq("organization_id", profile?.organization_id || "").order("administered_at", { ascending: false }).limit(20);
  if (client_id) query = query.eq("client_id", client_id);
  const { data } = await query;
  return NextResponse.json({ screenings: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("screenings").insert({
    organization_id: profile?.organization_id,
    client_id: body.client_id,
    tool: body.tool,
    answers: body.answers || {},
    total_score: body.total_score,
    severity_label: body.severity_label,
    administered_by: body.administered_by || null,
    administered_at: new Date().toISOString(),
    notes: body.notes || null,
    administered_by_clerk_id: userId,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ screening: data }, { status: 201 });
}
