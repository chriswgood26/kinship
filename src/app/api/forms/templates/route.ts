import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { BUILT_IN_TEMPLATES } from "@/lib/formTemplates";

// GET /api/forms/templates — list built-in + org custom templates
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  // Fetch org custom templates from DB
  const { data: customTemplates, error } = await supabaseAdmin
    .from("form_templates")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error && error.code !== "42P01") {
    // 42P01 = table does not exist yet — gracefully return built-ins only
    console.error("form_templates fetch error:", error);
  }

  return NextResponse.json({
    builtIn: BUILT_IN_TEMPLATES,
    custom: customTemplates || [],
  });
}

// POST /api/forms/templates — create a custom template
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { name, category, description, icon, sections, tags, populations, estimatedMinutes } = body;

  if (!name || !category || !sections) {
    return NextResponse.json({ error: "name, category, and sections are required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("form_templates")
    .insert({
      organization_id: orgId,
      name,
      category,
      description: description || null,
      icon: icon || "📄",
      sections,
      tags: tags || [],
      populations: populations || ["all"],
      estimated_minutes: estimatedMinutes || null,
      is_active: true,
      created_by_clerk_id: userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
