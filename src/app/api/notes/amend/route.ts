import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
import { logAuditEvent, getRequestIp, getRequestUserAgent } from "@/lib/auditLog";

// GET /api/notes/amend?note_id=xxx — list amendments for a note
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const noteId = req.nextUrl.searchParams.get("note_id");
  if (!noteId) return NextResponse.json({ error: "note_id required" }, { status: 400 });

  // Verify the note belongs to this org via the encounter FK chain
  const { data: note } = await supabaseAdmin
    .from("clinical_notes")
    .select("id, encounter_id, encounters!inner(organization_id)")
    .eq("id", noteId)
    .single();

  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  type EncounterRef = { organization_id: string } | null;
  const encRef = (Array.isArray(note.encounters) ? note.encounters[0] : note.encounters) as EncounterRef;
  const noteOrgId = encRef?.organization_id;
  if (noteOrgId !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: amendments, error } = await supabaseAdmin
    .from("note_amendments")
    .select("*")
    .eq("note_id", noteId)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ amendments });
}

// POST /api/notes/amend — create an amendment or addendum
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const body = await req.json();
  const { note_id, amendment_type, content } = body;

  if (!note_id || !amendment_type || !content?.trim()) {
    return NextResponse.json({ error: "note_id, amendment_type, and content are required" }, { status: 400 });
  }
  if (!["amendment", "addendum"].includes(amendment_type)) {
    return NextResponse.json({ error: "amendment_type must be 'amendment' or 'addendum'" }, { status: 400 });
  }

  // Verify the note exists, is signed, and belongs to this org
  const { data: note } = await supabaseAdmin
    .from("clinical_notes")
    .select("id, is_signed, encounter_id, encounters!inner(organization_id, client_id)")
    .eq("id", note_id)
    .single();

  if (!note) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  type EncounterFull = { organization_id: string; client_id: string } | null;
  const enc = (Array.isArray(note.encounters) ? note.encounters[0] : note.encounters) as EncounterFull;
  if (!enc || enc.organization_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!note.is_signed) {
    return NextResponse.json({ error: "Amendments can only be added to signed notes" }, { status: 422 });
  }

  // Get author name for display
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("first_name, last_name, credentials")
    .eq("clerk_user_id", userId)
    .single();

  const authorName = profile
    ? `${profile.first_name} ${profile.last_name}${profile.credentials ? `, ${profile.credentials}` : ""}`
    : userId;

  const { data: amendment, error } = await supabaseAdmin
    .from("note_amendments")
    .insert({
      organization_id: orgId,
      note_id,
      amendment_type,
      content: content.trim(),
      author_clerk_id: userId,
      author_name: authorName,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    organization_id: orgId,
    user_clerk_id: userId,
    action: "create",
    resource_type: "clinical_note",
    resource_id: note_id,
    client_id: enc.client_id ?? null,
    description: `Added ${amendment_type} to signed clinical note ${note_id}`,
    ip_address: getRequestIp(req),
    user_agent: getRequestUserAgent(req),
  });

  return NextResponse.json({ amendment }, { status: 201 });
}
