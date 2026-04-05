import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import MessageThread from "./MessageThread";

export const dynamic = "force-dynamic";

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;

  const [{ data: thread }, { data: messages }] = await Promise.all([
    supabaseAdmin.from("message_threads").select("*").eq("id", id).single(),
    supabaseAdmin.from("messages").select("*").eq("thread_id", id).order("created_at", { ascending: true }),
  ]);

  if (!thread) notFound();

  // Mark as read
  await supabaseAdmin.from("message_participants").upsert({
    thread_id: id,
    clerk_user_id: user.id,
    last_read_at: new Date().toISOString(),
  }, { onConflict: "thread_id,clerk_user_id" });

  const senderName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "You";

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/inbox" className="text-slate-400 hover:text-slate-700">←</Link>
        <h1 className="text-xl font-bold text-slate-900">{thread.subject}</h1>
      </div>

      <MessageThread
        threadId={id}
        messages={messages || []}
        currentUserId={user.id}
        currentUserName={senderName}
      />
    </div>
  );
}
