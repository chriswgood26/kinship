import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { note_id, rejection_message, supervisor_name, supervisor_clerk_id } = await req.json();

  // Get the note's author to send them a message
  const { data: note } = await supabaseAdmin
    .from("clinical_notes")
    .select("author_id, encounter:encounter_id(encounter_type, client:client_id(first_name, last_name))")
    .eq("id", note_id)
    .single();

  // Flag the note as needing revision
  await supabaseAdmin
    .from("clinical_notes")
    .update({
      supervisor_notes: rejection_message,
      needs_revision: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", note_id);

  // Send message to clinician
  if (note?.author_id) {
    const { data: author } = await supabaseAdmin
      .from("user_profiles")
      .select("clerk_user_id, first_name, last_name")
      .eq("id", note.author_id)
      .single();

    if (author?.clerk_user_id) {
      const enc = note.encounter as {encounter_type?: string; patient?: {first_name?: string; last_name?: string}} | null;
      const patient = enc?.patient;
      const patientName = patient ? `${patient.first_name} ${patient.last_name}` : "patient";

      // Create a message thread to the clinician
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://drcloud-neo.vercel.app"}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `Note returned for revision — ${patientName}`,
          body: `Your ${enc?.encounter_type || "clinical"} note for ${patientName} has been returned for revision by ${supervisor_name}.\n\n**Supervisor feedback:**\n${rejection_message}\n\nPlease review and update the note, then resubmit for co-signature.`,
          recipient_ids: [author.clerk_user_id],
          sender_clerk_id: supervisor_clerk_id,
        }),
      }).catch(() => {});

      // Also send in-app notification
      await supabaseAdmin.from("notifications").insert({
        user_clerk_id: author.clerk_user_id,
        type: "note_returned",
        title: "Note returned for revision",
        message: `${supervisor_name} returned your note for ${patientName} with feedback: "${rejection_message.slice(0, 80)}${rejection_message.length > 80 ? "..." : ""}"`,
        entity_type: "clinical_note",
        entity_id: note_id,
        link: `/dashboard/supervisor`,
        is_read: false,
      });
    }
  }

  return NextResponse.json({ success: true });
}
