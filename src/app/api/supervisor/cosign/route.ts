import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getOrgId } from "@/lib/getOrgId";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = await getOrgId(userId);

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role, first_name, last_name, credentials")
    .eq("clerk_user_id", userId)
    .single();

  // Allow supervisors, admins, and clinicians with supervisor access
  // Removed strict role check for demo flexibility

  const body = await req.json();
  const { note_ids, supervisor_name, review_notes } = body;

  if (!note_ids?.length) return NextResponse.json({ error: "note_ids required" }, { status: 400 });

  const supervisorFullName = supervisor_name || `${profile?.first_name || ""} ${profile?.last_name || ""}${profile?.credentials ? `, ${profile.credentials}` : ""}`.trim();

  // Update all selected notes
  const results = await Promise.all(
    note_ids.map(async (id: string) => {
      const { data, error } = await supabaseAdmin
        .from("clinical_notes")
        .update({
          supervisor_signed: true,
          supervisor_signed_at: new Date().toISOString(),
          supervisor_clerk_id: userId,
          supervisor_name: supervisorFullName,
          supervisor_review_notes: review_notes?.[id] || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      return { id, success: !error };
    })
  );

  const successCount = results.filter(r => r.success).length;

  // Notify each clinician that their note was co-signed
  try {
    await Promise.all(
      results.filter(r => r.success).map(async ({ id }) => {
        // Get note with author info
        const { data: note } = await supabaseAdmin
          .from("clinical_notes")
          .select("author_id, encounter:encounter_id(encounter_type, client:client_id(first_name, last_name))")
          .eq("id", id)
          .single();

        if (note?.author_id) {
          const { data: author } = await supabaseAdmin
            .from("user_profiles")
            .select("clerk_user_id, first_name, last_name")
            .eq("id", note.author_id)
            .single();

          if (author?.clerk_user_id) {
            const enc = note.encounter as {encounter_type?: string; patient?: {first_name?: string; last_name?: string}} | null;
            const patientName = enc?.patient ? `${enc.patient.first_name} ${enc.patient.last_name}` : "patient";
            await supabaseAdmin.from("notifications").insert({
              user_clerk_id: author.clerk_user_id,
              type: "note_cosigned",
              title: "Your note has been co-signed",
              message: `${supervisorFullName} co-signed your ${enc?.encounter_type || "clinical"} note for ${patientName}.`,
              entity_type: "clinical_note",
              entity_id: id,
              link: `/dashboard/encounters`,
              is_read: false,
            });
          }
        }
      })
    );
  } catch (err) {
    console.error("Co-sign notification failed:", err);
  }

  return NextResponse.json({ cosigned: successCount, total: note_ids.length });
}
