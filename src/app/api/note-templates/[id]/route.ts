import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// PATCH /api/note-templates/[id] — update a template
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { id } = await params;

  const body = await req.json();
  const { name, description, sections, is_default, is_active, sort_order } = body;

  if (name !== undefined && !name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (sections !== undefined && (!Array.isArray(sections) || sections.length === 0)) {
    return NextResponse.json({ error: "At least one section is required" }, { status: 400 });
  }

  // If setting as default, clear existing defaults first
  if (is_default) {
    await supabaseAdmin
      .from("note_templates")
      .update({ is_default: false })
      .eq("organization_id", orgId)
      .neq("id", id);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (sections !== undefined) updates.sections = sections;
  if (is_default !== undefined) updates.is_default = is_default;
  if (is_active !== undefined) updates.is_active = is_active;
  if (sort_order !== undefined) updates.sort_order = sort_order;

  const { data, error } = await supabaseAdmin
    .from("note_templates")
    .update(updates)
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

// DELETE /api/note-templates/[id] — soft-delete (deactivate) a template
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("note_templates")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
