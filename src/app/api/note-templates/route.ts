import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// GET /api/note-templates — list active templates for org
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { data, error } = await supabaseAdmin
    .from("note_templates")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}

// POST /api/note-templates — create a new template
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { name, description, sections, is_default, sort_order } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!Array.isArray(sections) || sections.length === 0) {
    return NextResponse.json({ error: "At least one section is required" }, { status: 400 });
  }

  // If setting as default, clear existing defaults first
  if (is_default) {
    await supabaseAdmin
      .from("note_templates")
      .update({ is_default: false })
      .eq("organization_id", orgId);
  }

  const { data, error } = await supabaseAdmin
    .from("note_templates")
    .insert({
      organization_id: orgId,
      name: name.trim(),
      description: description?.trim() || null,
      sections,
      is_default: is_default || false,
      is_active: true,
      sort_order: sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data }, { status: 201 });
}
