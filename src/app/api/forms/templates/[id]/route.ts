import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { getTemplateById } from "@/lib/formTemplates";

// GET /api/forms/templates/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Check built-in first
  const builtIn = getTemplateById(id);
  if (builtIn) return NextResponse.json({ template: builtIn, isBuiltIn: true });

  // Check custom templates
  const orgId = await getOrgId(userId);
  const { data, error } = await supabaseAdmin
    .from("form_templates")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template: data, isBuiltIn: false });
}

// PATCH /api/forms/templates/[id] — update a custom template
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { id } = await params;
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("form_templates")
    .update({
      ...body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}

// DELETE /api/forms/templates/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("form_templates")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
