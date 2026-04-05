import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MessagesClient from "./MessagesClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const q = params.q?.toLowerCase() || "";
  const filter = params.filter || "all"; // all | unread | sent

  const { data: participations } = await supabaseAdmin
    .from("message_participants")
    .select("thread_id, last_read_at")
    .eq("clerk_user_id", user.id);

  const threadIds = participations?.map(p => p.thread_id) || [];
  const lastReadMap = Object.fromEntries((participations || []).map(p => [p.thread_id, p.last_read_at]));

  const { data: threads } = threadIds.length > 0
    ? await supabaseAdmin
        .from("message_threads")
        .select("*, messages(id, body, sender_name, sender_clerk_id, created_at, is_system)")
        .in("id", threadIds)
        .order("updated_at", { ascending: false })
    : { data: [] };

  // Filter by search and tab
  let filtered = threads || [];

  if (q) {
    filtered = filtered.filter(t => {
      const msgs = Array.isArray(t.messages) ? t.messages : [];
      return (
        t.subject?.toLowerCase().includes(q) ||
        msgs.some((m: { body: string }) => m.body?.toLowerCase().includes(q))
      );
    });
  }

  if (filter === "unread") {
    filtered = filtered.filter(t => {
      const msgs = Array.isArray(t.messages) ? t.messages : [];
      const latest = msgs.sort((a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at))[0];
      const lastRead = lastReadMap[t.id];
      return latest && (!lastRead || latest.created_at > lastRead);
    });
  } else if (filter === "sent") {
    filtered = filtered.filter(t => {
      const msgs = Array.isArray(t.messages) ? t.messages : [];
      return msgs.some((m: { sender_clerk_id: string }) => m.sender_clerk_id === user.id);
    });
  }

  const unreadCount = (threads || []).filter(t => {
    const msgs = Array.isArray(t.messages) ? t.messages : [];
    const latest = msgs.sort((a: { created_at: string }, b: { created_at: string }) => b.created_at.localeCompare(a.created_at))[0];
    const lastRead = lastReadMap[t.id];
    return latest && (!lastRead || latest.created_at > lastRead);
  }).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-500 text-sm mt-0.5">Internal secure messaging</p>
        </div>
        <Link href="/dashboard/messages/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New Message
        </Link>
      </div>

      <MessagesClient
        threads={filtered}
        lastReadMap={lastReadMap}
        currentUserId={user.id}
        unreadCount={unreadCount}
        totalCount={(threads || []).length}
        currentQ={q}
        currentFilter={filter}
      />
    </div>
  );
}
