"use client";

import { SignOutButton } from "@clerk/nextjs";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
}

interface Props {
  user: { firstName: string | null; lastName: string | null; email: string | undefined; role?: string | null; title?: string | null };
}

export default function TopBar({ user }: Props) {
  const initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || "U";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "all" }),
      credentials: "include",
    });
    setUnread(0);
    setNotifications([]);
  }

  async function handleNotifClick(notif: Notification) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: notif.id }),
      credentials: "include",
    });
    setOpen(false);
    if (notif.link) router.push(notif.link);
  }

  const typeIcon: Record<string, string> = {
    message: "💬",
    referral: "🔄",
    task: "✅",
    alert: "⚠️",
  };

  return (
    <header className="bg-white px-6 py-3 flex items-center justify-between border-b border-slate-200 no-print">
      <div className="flex items-center gap-3">
        <div className="text-slate-400 text-sm">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            🔔
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-semibold text-slate-900 text-sm">Notifications</span>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">All caught up! 🎉</div>
              ) : (
                <div className="divide-y divide-slate-50 max-h-80 overflow-y-auto">
                  {notifications.map(n => (
                    <button key={n.id} onClick={() => handleNotifClick(n)}
                      className="w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3">
                      <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] || "🔔"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 truncate">{n.title}</div>
                        {n.body && <div className="text-xs text-slate-500 truncate mt-0.5">{n.body}</div>}
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between">
                <button
                  onClick={() => { router.push("/dashboard/inbox?tab=notifications"); setOpen(false); }}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                  View all →
                </button>
                <button
                  onClick={() => { router.push("/dashboard/messages/new"); setOpen(false); }}
                  className="text-xs bg-teal-500 text-white px-3 py-1 rounded-lg font-semibold hover:bg-teal-400">
                  ✉️ New Message
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-medium text-slate-900">{fullName}</div>
            {(user.title || user.role) && (
              <div className="text-xs text-slate-400 capitalize">{user.title || user.role?.replace("_", " ")}</div>
            )}
          </div>
        </div>

        <SignOutButton>
          <button className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium px-2 py-1">
            Sign out
          </button>
        </SignOutButton>
      </div>
    </header>
  );
}
