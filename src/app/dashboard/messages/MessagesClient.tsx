"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Message { id: string; body: string; sender_name: string | null; sender_clerk_id: string; created_at: string; is_system: boolean; }
interface Thread { id: string; subject: string; updated_at: string; messages: Message[]; }

interface Props {
  threads: Thread[];
  lastReadMap: Record<string, string>;
  currentUserId: string;
  unreadCount: number;
  totalCount: number;
  currentQ: string;
  currentFilter: string;
}

export default function MessagesClient({ threads, lastReadMap, currentUserId, unreadCount, totalCount, currentQ, currentFilter }: Props) {
  const [search, setSearch] = useState(currentQ);
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (currentFilter !== "all") params.set("filter", currentFilter);
    router.push(`/dashboard/messages?${params.toString()}`);
  }

  function setFilter(f: string) {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (f !== "all") params.set("filter", f);
    router.push(`/dashboard/messages?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search messages by subject or content..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        {search && (
          <button type="button" onClick={() => { setSearch(""); setFilter("all"); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">✕</button>
        )}
      </form>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          { key: "all", label: `All (${totalCount})` },
          { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
          { key: "sent", label: "Sent" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${currentFilter === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search result count */}
      {currentQ && (
        <p className="text-sm text-slate-500">
          {threads.length} result{threads.length !== 1 ? "s" : ""} for <span className="font-semibold text-slate-900">"{currentQ}"</span>
        </p>
      )}

      {/* Thread list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {threads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">💬</div>
            {currentQ ? (
              <>
                <p className="font-semibold text-slate-900 mb-1">No messages found</p>
                <p className="text-slate-500 text-sm">Try a different search term</p>
              </>
            ) : currentFilter === "unread" ? (
              <>
                <p className="font-semibold text-slate-900 mb-1">All caught up! 🎉</p>
                <p className="text-slate-500 text-sm">No unread messages</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-900 mb-1">No messages yet</p>
                <p className="text-slate-500 text-sm mb-4">Start a conversation with a colleague</p>
                <Link href="/dashboard/messages/new"
                  className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
                  + New Message
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {threads.map(thread => {
              const msgs = Array.isArray(thread.messages) ? thread.messages : [];
              const latest = [...msgs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
              const lastRead = lastReadMap[thread.id];
              const hasUnread = latest && (!lastRead || latest.created_at > lastRead);
              const msgCount = msgs.filter(m => !m.is_system).length;
              const isSentByMe = latest?.sender_clerk_id === currentUserId;

              // Highlight search matches
              const subjectText = thread.subject;
              const highlightSubject = currentQ
                ? subjectText.replace(new RegExp(`(${currentQ})`, "gi"), "<mark class='bg-yellow-100 rounded px-0.5'>$1</mark>")
                : subjectText;

              return (
                <Link key={thread.id} href={`/dashboard/messages/${thread.id}`}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 mt-0.5 ${hasUnread ? "bg-teal-500" : "bg-slate-100"}`}>
                    {hasUnread ? "💬" : isSentByMe ? "📤" : "💬"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5 gap-2">
                      <span
                        className={`text-sm ${hasUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"} truncate`}
                        dangerouslySetInnerHTML={{ __html: highlightSubject }}
                      />
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-slate-400">
                          {new Date(thread.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        {msgCount > 1 && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{msgCount}</span>
                        )}
                      </div>
                    </div>
                    {latest && (
                      <p className="text-xs text-slate-500 truncate">
                        <span className={`font-medium ${isSentByMe ? "text-teal-600" : "text-slate-600"}`}>
                          {isSentByMe ? "You" : latest.sender_name || "Unknown"}:
                        </span>{" "}
                        {currentQ && latest.body?.toLowerCase().includes(currentQ.toLowerCase())
                          ? <span dangerouslySetInnerHTML={{ __html: latest.body.replace(new RegExp(`(${currentQ})`, "gi"), "<mark class='bg-yellow-100 rounded px-0.5'>$1</mark>") }} />
                          : latest.body
                        }
                      </p>
                    )}
                  </div>
                  {hasUnread && (
                    <div className="w-2.5 h-2.5 bg-teal-500 rounded-full flex-shrink-0 mt-2" />
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
