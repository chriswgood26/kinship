"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Message { id: string; body: string; sender_name: string | null; sender_clerk_id: string; created_at: string; is_system: boolean; }
interface Thread { id: string; subject: string; updated_at: string; messages: Message[]; }
interface Notification { id: string; type: string; title: string; body: string | null; link: string | null; is_read: boolean; created_at: string; }

interface Props {
  threads: Thread[];
  notifications: Notification[];
  lastReadMap: Record<string, string>;
  currentUserId: string;
  currentUserName: string;
  unreadMessages: number;
  unreadNotifications: number;
  initialTab: string;
}

const TYPE_ICON: Record<string, string> = { message: "💬", referral: "🔄", alert: "⚠️", task: "✅" };
const STORAGE_KEY = "drcloud_name_display";

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffH = Math.round((now.getTime() - d.getTime()) / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  if (diffH < 48) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InboxClient({
  threads, notifications, lastReadMap, currentUserId, currentUserName,
  unreadMessages, unreadNotifications, initialTab
}: Props) {
  const [tab, setTab] = useState(initialTab);
  const [notifs, setNotifs] = useState(notifications);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const totalUnread = unreadMessages + notifs.filter(n => !n.is_read).length;

  async function markNotifRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id }),
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllNotifsRead() {
    await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id: "all" }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleNotifClick(n: Notification) {
    if (!n.is_read) await markNotifRead(n.id);
    if (n.link) router.push(n.link);
  }

  // Filter threads
  const filteredThreads = threads.filter(t => {
    if (!search) return true;
    const msgs = Array.isArray(t.messages) ? t.messages : [];
    return t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      msgs.some(m => m.body?.toLowerCase().includes(search.toLowerCase()));
  });

  const filteredNotifs = notifs.filter(n =>
    !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.body?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {totalUnread > 0 ? `${totalUnread} unread` : "All caught up"} · messages & notifications
          </p>
        </div>
        <Link href="/dashboard/messages/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New Message
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search messages and notifications..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">✕</button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setTab("messages")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${tab === "messages" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          💬 Messages
          {unreadMessages > 0 && (
            <span className="bg-teal-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unreadMessages}</span>
          )}
        </button>
        <button onClick={() => setTab("notifications")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${tab === "notifications" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          🔔 Notifications
          {notifs.filter(n => !n.is_read).length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{notifs.filter(n => !n.is_read).length}</span>
          )}
        </button>
      </div>

      {/* Messages tab */}
      {tab === "messages" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {filteredThreads.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="font-semibold text-slate-900 mb-1">{search ? "No messages found" : "No messages yet"}</p>
              {!search && <Link href="/dashboard/messages/new" className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-2 inline-block">+ Start a conversation →</Link>}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredThreads.map(thread => {
                const msgs = Array.isArray(thread.messages) ? thread.messages : [];
                const latest = [...msgs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                const lastRead = lastReadMap[thread.id];
                const hasUnread = latest && (!lastRead || latest.created_at > lastRead);
                const isMine = latest?.sender_clerk_id === currentUserId;
                const msgCount = msgs.filter(m => !m.is_system).length;

                return (
                  <Link key={thread.id} href={`/dashboard/messages/${thread.id}`}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors no-underline">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 mt-0.5 ${hasUnread ? "bg-teal-100" : "bg-slate-100"}`}>
                      {isMine ? "📤" : "💬"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={`text-sm truncate ${hasUnread ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
                          {thread.subject}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {msgCount > 1 && <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{msgCount}</span>}
                          <span className="text-xs text-slate-400">{formatTime(thread.updated_at)}</span>
                        </div>
                      </div>
                      {latest && (
                        <p className="text-xs text-slate-500 truncate">
                          <span className={`font-medium ${isMine ? "text-teal-600" : "text-slate-600"}`}>
                            {isMine ? "You" : latest.sender_name || "Unknown"}:
                          </span>{" "}{latest.body}
                        </p>
                      )}
                    </div>
                    {hasUnread && <div className="w-2.5 h-2.5 bg-teal-500 rounded-full flex-shrink-0 mt-2" />}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notifications tab */}
      {tab === "notifications" && (
        <div className="space-y-3">
          {notifs.filter(n => !n.is_read).length > 0 && (
            <div className="flex justify-end">
              <button onClick={markAllNotifsRead} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Mark all read</button>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {filteredNotifs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-semibold text-slate-900 mb-1">{search ? "No notifications found" : "All caught up!"}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredNotifs.map(n => (
                  <div key={n.id} className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.is_read ? "bg-teal-50/40" : "hover:bg-slate-50"}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 mt-0.5 ${!n.is_read ? "bg-teal-100" : "bg-slate-100"}`}>
                      {TYPE_ICON[n.type] || "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => handleNotifClick(n)}
                          className={`text-sm text-left hover:text-teal-600 transition-colors ${!n.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </button>
                        <span className="text-xs text-slate-400 flex-shrink-0">{formatTime(n.created_at)}</span>
                      </div>
                      {n.body && <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium capitalize">{n.type}</span>
                        {!n.is_read && <button onClick={() => markNotifRead(n.id)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Mark read</button>}
                        {n.link && <button onClick={() => handleNotifClick(n)} className="text-xs text-slate-400 hover:text-slate-600 font-medium">View →</button>}
                      </div>
                    </div>
                    {!n.is_read && <div className="w-2.5 h-2.5 bg-red-400 rounded-full flex-shrink-0 mt-2" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
