import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

// Maps a relationship type to its reciprocal
const RECIPROCAL: Record<string, string> = {
  parent: "child",
  child: "parent",
  sibling: "sibling",
  spouse: "spouse",
  partner: "partner",
  grandparent: "grandchild",
  grandchild: "grandparent",
  aunt_uncle: "niece_nephew",
  niece_nephew: "aunt_uncle",
  guardian: "ward",
  foster_parent: "foster_child",
  step_parent: "step_child",
  step_child: "step_parent",
  caregiver: "care_recipient",
  care_recipient: "caregiver",
  case_manager: "client",
  parole_officer: "parolee",
  other: "other",
};

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = await getOrgId(userId);
  const client_id = new URL(req.url).searchParams.get("patient_id");
  if (!client_id) return NextResponse.json({ relationships: [] });

  // Get direct relationships
  const { data: direct } = await supabaseAdmin.from("patient_relationships")
    .select("*, related_patient:related_patient_id(id, first_name, last_name, mrn)")
    .eq("client_id", client_id)
    .order("created_at");

  // Get reciprocal relationships (where this patient is the related_patient)
  const { data: reciprocal } = await supabaseAdmin.from("patient_relationships")
    .select("*, related_client:client_id(id, first_name, last_name, mrn)")
    .eq("related_patient_id", client_id)
    .not("patient_id", "eq", client_id)
    .order("created_at");

  // Format reciprocal records to look like direct ones (swap patient/related)
  const formattedReciprocal = (reciprocal || []).map(r => ({
    ...r,
    id: `reciprocal_${r.id}`,
    client_id: client_id,
    related_client_id: r.client_id,
    related_patient: r.related_patient,
    relationship_type: RECIPROCAL[r.relationship_type] || r.relationship_type,
    _is_reciprocal: true,
  }));

  // Merge and deduplicate
  const all = [...(direct || []), ...formattedReciprocal];

  return NextResponse.json({ relationships: all });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();

  const { data, error } = await supabaseAdmin.from("patient_relationships").insert({
    organization_id: orgId,
    client_id: body.client_id,
    related_client_id: body.related_patient_id || null,
    related_name: body.related_name || null,
    related_phone: body.related_phone || null,
    related_email: body.related_email || null,
    relationship_type: body.relationship_type,
    is_legal_guardian: body.is_legal_guardian || false,
    is_emergency_contact: body.is_emergency_contact || false,
    is_caregiver: body.is_caregiver || false,
    is_portal_user: body.is_portal_user || false,
    legal_authority: body.legal_authority || null,
    notes: body.notes || null,
  }).select("*, related_patient:related_patient_id(id, first_name, last_name, mrn)").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ relationship: data }, { status: 201 });
}
