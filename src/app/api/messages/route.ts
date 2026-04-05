import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const senderName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unknown";

  const { subject, body, recipient_ids } = await req.json();
  if (!subject || !body || !recipient_ids?.length) {
    return NextResponse.json({ error: "subject, body, and recipients required" }, { status: 400 });
  }

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", userId)
    .single();

  // Create thread
  const { data: thread } = await supabaseAdmin
    .from("message_threads")
    .insert({ organization_id: profile?.organization_id, subject, created_by: userId })
    .select()
    .single();

  if (!thread) return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });

  // Add participants (sender + recipients)
  const allParticipants = [...new Set([userId, ...recipient_ids])];
  await supabaseAdmin.from("message_participants").insert(
    allParticipants.map(id => ({ thread_id: thread.id, clerk_user_id: id }))
  );

  // Send first message
  await supabaseAdmin.from("messages").insert({
    thread_id: thread.id,
    organization_id: profile?.organization_id,
    sender_clerk_id: userId,
    sender_name: senderName,
    body,
  });

  // Update thread timestamp
  await supabaseAdmin.from("message_threads").update({ updated_at: new Date().toISOString() }).eq("id", thread.id);

  // Send notifications to recipients
  const notifData = recipient_ids.map((rid: string) => ({
    user_clerk_id: rid,
    type: "message",
    title: `New message from ${senderName}`,
    body: subject,
    link: `/dashboard/messages/${thread.id}`,
  }));
  await supabaseAdmin.from("notifications").insert(notifData);

  return NextResponse.json({ thread_id: thread.id }, { status: 201 });
}
