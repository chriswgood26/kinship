import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("role, first_name, last_name, credentials")
    .eq("clerk_user_id", userId)
    .single();

  if (profile?.role !== "supervisor" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Supervisor or admin role required" }, { status: 403 });
  }

  const body = await req.json();
  const { note_ids, supervisor_name, review_notes } = body;

  if (!note_ids?.length) return NextResponse.json({ error: "note_ids required" }, { status: 400 });

  const supervisorFullName = supervisor_name || `${profile.first_name} ${profile.last_name}${profile.credentials ? `, ${profile.credentials}` : ""}`;

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
        .select()
        .single();
      return { id, success: !error };
    })
  );

  const successCount = results.filter(r => r.success).length;
  return NextResponse.json({ cosigned: successCount, total: note_ids.length });
}
