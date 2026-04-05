"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Notification {
  id: string; type: string; title: string; body: string | null;
  link: string | null; is_read: boolean; created_at: string;
}
interface Thread {
  id: string; subject: string; updated_at: string;
  messages: { id: string; body: string; sender_name: string | null; sender_clerk_id: string; created_at: string }[];
}

interface PortalMessage {
  id: string; direction: string; subject: string | null; body: string;
  is_read: boolean; created_at: string;
  patient: { id: string; first_name: string; last_name: string; mrn: string | null } | null;
}

interface Props {
  notifications: Notification[];
  unreadThreads: Thread[];
  portalMessages: PortalMessage[];
  lastReadMap: Record<string, string>;
  currentUserId: string;
  totalUnread: number;
}

const TYPE_ICON: Record<string, string> = { message: "💬", referral: "🔄", alert: "⚠️", task: "✅" };

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffH = Math.round((now.getTime() - d.getTime()) / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH}h ago`;
  if (diffH < 48) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPageClient({ notifications, unreadThreads, portalMessages, lastReadMap, currentUserId, totalUnread }: Props) {
  const [notifs, setNotifs] = useState(notifications);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"messages"|"portal"|"notifications">("messages");
  const router = useRouter();
  const unreadPortalCount = portalMessages.filter(m => !m.is_read && m.direction === "inbound").length;

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id }),
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id: "all" }),
    });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleNotifClick(n: Notification) {
    if (!n.is_read) await markRead(n.id);
    if (n.link) router.push(n.link);
  }

  // Filter threads and notifications by search
  const filteredThreads = search
    ? unreadThreads.filter(t => t.subject?.toLowerCase().includes(search.toLowerCase()) ||
        t.messages.some(m => m.body?.toLowerCase().includes(search.toLowerCase())))
    : unreadThreads;

  const filteredNotifs = search
    ? notifs.filter(n => n.title?.toLowerCase().includes(search.toLowerCase()) || n.body?.toLowerCase().includes(search.toLowerCase()))
    : notifs;

  const unreadNotifCount = notifs.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {totalUnread > 0 ? `${totalUnread} new` : "All caught up"} · messages & notifications
          </p>
        </div>
        <Link href="/dashboard/messages/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 text-sm">
          ✉️ New Message
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search messages and notifications..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">✕</button>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([["messages", "Messages", unreadThreads.length], ["portal", "Portal Msgs", unreadPortalCount], ["notifications", "Notifications", notifs.filter(n => !n.is_read).length]] as [string, string, number][]).map(([tab, label, count]) => (
          <button key={tab} onClick={() => setActiveTab(tab as "messages"|"portal"|"notifications")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
            {count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab === "portal" ? "bg-blue-500 text-white" : "bg-red-500 text-white"}`}>{count}</span>}
          </button>
        ))}
      </div>

      {/* Unread messages section */}
      {activeTab === "messages" && (filteredThreads.length > 0 || (!search && unreadThreads.length === 0)) && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">New Messages</span>
              {filteredThreads.length > 0 && (
                <span className="bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{filteredThreads.length}</span>
              )}
            </div>
            <Link href="/dashboard/messages" className="text-xs text-teal-600 font-medium hover:text-teal-700">View all messages →</Link>
          </div>
          {filteredThreads.length === 0 ? (
            <div className="px-5 py-4 text-sm text-slate-400">{search ? "No matching messages" : "No new messages"}</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredThreads.map(thread => {
                const msgs = Array.isArray(thread.messages) ? thread.messages : [];
                const latest = [...msgs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                return (
                  <Link key={thread.id} href={`/dashboard/messages/${thread.id}`}
                    className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 no-underline">
                    <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">💬</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 text-sm">{thread.subject}</div>
                      {latest && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          <span className="font-medium">{latest.sender_clerk_id === currentUserId ? "You" : latest.sender_name || "Someone"}:</span>{" "}{latest.body}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400">{latest ? formatTime(latest.created_at) : ""}</span>
                      <div className="w-2 h-2 bg-teal-500 rounded-full" />
                    </div>
                  </Link>
                );
              })}
              <Link href="/dashboard/messages" className="block px-5 py-3 text-center text-xs text-teal-600 font-medium hover:text-teal-700 hover:bg-slate-50 border-t border-slate-100">
                View all message threads →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Portal Messages Tab */}
      {activeTab === "portal" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">Patient Portal Messages</span>
              {unreadPortalCount > 0 && <span className="bg-blue-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadPortalCount}</span>}
            </div>
          </div>
          {portalMessages.filter(m => !search || m.body?.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No portal messages</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {portalMessages.filter(m => !search || m.body?.toLowerCase().includes(search.toLowerCase())).map(msg => (
                <div key={msg.id} className={`px-5 py-4 ${!msg.is_read && msg.direction === "inbound" ? "bg-blue-50/30" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${msg.direction === "inbound" ? "bg-blue-100 text-blue-700" : "bg-teal-100 text-teal-700"}`}>
                          {msg.direction === "inbound" ? "📥 From patient" : "📤 Staff reply"}
                        </span>
                        {msg.patient && (
                          <a href={`/dashboard/clients/${msg.patient.id}?tab=messages`} className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                            {msg.patient.last_name}, {msg.patient.first_name}
                          </a>
                        )}
                        {!msg.is_read && msg.direction === "inbound" && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">Unread</span>
                        )}
                      </div>
                      {msg.subject && <div className="text-sm font-semibold text-slate-900 mb-0.5">{msg.subject}</div>}
                      <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">{msg.body}</p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{formatTime(msg.created_at)}</span>
                  </div>
                  {msg.patient && msg.direction === "inbound" && (
                    <a href={`/dashboard/clients/${msg.patient.id}`} className="mt-2 inline-flex text-xs text-teal-600 font-semibold hover:text-teal-700 border border-teal-200 px-3 py-1 rounded-lg hover:bg-teal-50">
                      View patient & reply →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System notifications */}
      {activeTab === "notifications" && <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm">Notifications</span>
            {unreadNotifCount > 0 && !search && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadNotifCount}</span>
            )}
          </div>
          {unreadNotifCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Mark all read</button>
          )}
        </div>
        {filteredNotifs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{search ? "No matching notifications" : "🎉 No notifications"}</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredNotifs.map(n => (
              <div key={n.id} className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.is_read ? "bg-red-50/30" : "hover:bg-slate-50"}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${!n.is_read ? "bg-red-100" : "bg-slate-100"}`}>
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
                    {!n.is_read && <button onClick={() => markRead(n.id)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Mark read</button>}
                    {n.link && <button onClick={() => handleNotifClick(n)} className="text-xs text-slate-400 hover:text-slate-600">View →</button>}
                  </div>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
}
