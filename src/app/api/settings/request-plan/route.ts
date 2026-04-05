import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

const VALID_PLANS = ["starter", "growth", "practice", "agency", "custom"];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);

  // Only admins can request plan changes
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Only organization admins can request plan changes" }, { status: 403 });
  }

  const body = await req.json();
  const { requested_plan } = body;

  if (!requested_plan || !VALID_PLANS.includes(requested_plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Get current plan to validate it's actually a change
  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("plan, requested_plan")
    .eq("id", orgId)
    .single();

  if (org?.plan === requested_plan) {
    return NextResponse.json({ error: "You are already on this plan" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("organizations")
    .update({ requested_plan, updated_at: new Date().toISOString() })
    .eq("id", orgId)
    .select("id, plan, requested_plan")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ org: data, message: "Plan change request submitted. Kinship support will review and apply it shortly." });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);

  const { error } = await supabaseAdmin
    .from("organizations")
    .update({ requested_plan: null, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ message: "Plan change request cancelled" });
}
