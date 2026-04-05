"use client";

import { useState, useEffect } from "react";

export default function CommunicationBadgeCount() {
  const [unread, setUnread] = useState(0);

  async function fetchUnread() {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.unread || 0);
    } catch {}
  }

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  if (unread === 0) return null;

  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
      {unread > 9 ? "9+" : unread}
    </span>
  );
}
