"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  message: "💬",
  referral: "🔄",
  task: "✅",
  alert: "⚠️",
};

const TYPE_LABEL: Record<string, string> = {
  message: "Message",
  referral: "Referral",
  task: "Task",
  alert: "Alert",
};

export default function NotificationsClient({ notifications: initial, userId }: {
  notifications: Notification[];
  userId: string;
}) {
  const [notifications, setNotifications] = useState(initial);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const router = useRouter();

  const displayed = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: "all" }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleClick(n: Notification) {
    if (!n.is_read) await markRead(n.id);
    if (n.link) router.push(n.link);
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  function formatDate(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diffH = Math.round((now.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    if (diffH < 48) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="space-y-4">
      {/* Filter + actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["all", "unread"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f === "unread" ? `Unread (${unreadCount})` : `All (${notifications.length})`}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
            Mark all read
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {displayed.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-semibold text-slate-900 mb-1">All caught up!</p>
            <p className="text-slate-400 text-sm">No {filter === "unread" ? "unread " : ""}notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {displayed.map(n => (
              <div key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.is_read ? "bg-teal-50/40" : "hover:bg-slate-50"}`}>
                {/* Type icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${!n.is_read ? "bg-teal-100" : "bg-slate-100"}`}>
                  {TYPE_ICON[n.type] || "🔔"}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => handleClick(n)}
                      className={`text-sm text-left hover:text-teal-600 transition-colors ${!n.is_read ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                      {n.title}
                    </button>
                    <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(n.created_at)}</span>
                  </div>
                  {n.body && <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                      {TYPE_LABEL[n.type] || n.type}
                    </span>
                    {!n.is_read && (
                      <button onClick={() => markRead(n.id)} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                        Mark read
                      </button>
                    )}
                    {n.link && (
                      <button onClick={() => handleClick(n)} className="text-xs text-slate-400 hover:text-slate-600 font-medium">
                        View →
                      </button>
                    )}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.is_read && <div className="w-2.5 h-2.5 bg-teal-500 rounded-full flex-shrink-0 mt-1.5" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
