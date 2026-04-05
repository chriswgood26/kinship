"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function InboxBadge() {
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();

  async function fetchUnread() {
    try {
      const [notifRes] = await Promise.all([
        fetch("/api/notifications", { credentials: "include" }),
      ]);
      if (!notifRes.ok) return;
      const notifData = await notifRes.json();
      setUnread(notifData.unread || 0);
    } catch {}
  }

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const isActive = pathname === "/dashboard/inbox" || pathname.startsWith("/dashboard/inbox/");

  return (
    <Link href="/dashboard/inbox"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive ? "bg-[#0d1b2e] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}>
      <span>💬</span>
      <span className="flex-1">Messages</span>
      {unread > 0 && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
          isActive ? "bg-white/20 text-white" : "bg-red-500 text-white"
        }`}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
