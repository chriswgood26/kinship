import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);
  const body = await req.json();
  const { note_id, encounter_id, subjective, objective, assessment, plan, diagnosis_codes, is_signed, signed_at } = body;
  let data, error;
  if (note_id) {
    ({ data, error } = await supabaseAdmin.from("clinical_notes").update({ subjective, objective, assessment, plan, diagnosis_codes, is_signed, signed_at, updated_at: new Date().toISOString() }).eq("id", note_id).eq("organization_id", orgId).select().single());
    if (is_signed) await supabaseAdmin.from("encounters").update({ status: "signed" }).eq("id", encounter_id).eq("organization_id", orgId);
  } else {
    ({ data, error } = await supabaseAdmin.from("clinical_notes").insert({ encounter_id, note_type: "progress_note", subjective, objective, assessment, plan, diagnosis_codes, is_signed: is_signed || false, signed_at: signed_at || null }).select().single());
    if (is_signed) await supabaseAdmin.from("encounters").update({ status: "signed" }).eq("id", encounter_id);
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ note: data }, { status: 201 });
}
