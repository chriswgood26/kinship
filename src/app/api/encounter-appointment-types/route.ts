import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// Default types used as fallback when org has no custom types configured
export const DEFAULT_APPOINTMENT_CLIENT_TYPES = [
  "Individual Therapy", "Psychiatric Evaluation", "Psychiatric Follow-up",
  "Group Therapy", "Intake Assessment", "Crisis Intervention",
  "Case Management", "Medication Management",
  "Telehealth - Individual", "Telehealth - Group", "Telehealth - Psychiatric",
];

export const DEFAULT_APPOINTMENT_PROVIDER_TYPES = [
  "Block Time", "Staff Meeting", "Training", "Administrative", "Lunch Break",
  "Supervision", "Team Huddle", "Documentation Time", "Other",
];

export const DEFAULT_ENCOUNTER_TYPES = [
  "Individual Therapy", "Group Therapy", "Psychiatric Evaluation", "Psychiatric Follow-up",
  "Intake Assessment", "Crisis Intervention", "Case Management", "Telehealth",
];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category"); // optional filter

  let query = supabaseAdmin
    .from("encounter_appointment_types")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ types: data || [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();

  const { name, category, color, default_duration_minutes, is_telehealth, sort_order } = body;

  if (!name || !category) {
    return NextResponse.json({ error: "name and category are required" }, { status: 400 });
  }

  const VALID_CATEGORIES = ["appointment_client", "appointment_provider", "encounter"];
  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("encounter_appointment_types")
    .insert({
      organization_id: orgId,
      name: name.trim(),
      category,
      color: color || null,
      default_duration_minutes: default_duration_minutes || null,
      is_telehealth: is_telehealth || false,
      sort_order: sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ type: data }, { status: 201 });
}
