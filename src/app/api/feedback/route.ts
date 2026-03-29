import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id, first_name, last_name, email").eq("clerk_user_id", userId).single();
  const { data, error } = await supabaseAdmin.from("feedback").insert({
    organization_id: profile?.organization_id || null,
    submitted_by_clerk_id: userId,
    submitted_by_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
    submitted_by_email: profile?.email || null,
    type: body.type || "other",
    problem: body.problem || null,
    impact: body.impact || null,
    tried: body.tried || null,
    ideal: body.ideal || null,
    status: "new",
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ feedback: data }, { status: 201 });
}
