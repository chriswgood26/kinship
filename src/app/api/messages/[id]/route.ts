import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("thread_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: data || [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const senderName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Unknown";

  const { id } = await params;
  const { body } = await req.json();

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", userId)
    .single();

  await supabaseAdmin.from("messages").insert({
    thread_id: id,
    organization_id: profile?.organization_id,
    sender_clerk_id: userId,
    sender_name: senderName,
    body,
  });

  await supabaseAdmin.from("message_threads").update({ updated_at: new Date().toISOString() }).eq("id", id);

  // Notify other participants
  const { data: participants } = await supabaseAdmin
    .from("message_participants")
    .select("clerk_user_id")
    .eq("thread_id", id)
    .neq("clerk_user_id", userId);

  if (participants?.length) {
    await supabaseAdmin.from("notifications").insert(
      participants.map(p => ({
        user_clerk_id: p.clerk_user_id,
        type: "message",
        title: `New reply from ${senderName}`,
        body: body.slice(0, 100),
        link: `/dashboard/messages/${id}`,
      }))
    );
  }

  return NextResponse.json({ message: "sent" });
}
