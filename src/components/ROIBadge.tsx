"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ROIBadge({ isExpanded = true }: { isExpanded?: boolean }) {
  const [pending, setPending] = useState(0);
  const pathname = usePathname();

  async function fetchPending() {
    try {
      const res = await fetch("/api/roi/pending-count", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setPending(data.count || 0);
    } catch {}
  }

  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = pathname === "/dashboard/roi" || pathname.startsWith("/dashboard/roi/");

  if (!isExpanded) {
    return (
      <Link href="/dashboard/roi" title="Releases of Info"
        className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors mx-auto relative ${
          isActive ? "bg-[#0d1b2e] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}>
        <span className="text-base">📄</span>
        {pending > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {pending > 9 ? "9+" : pending}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link href="/dashboard/roi"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
        isActive ? "bg-[#0d1b2e] text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}>
      <span>📄</span>
      <span className="flex-1">Releases of Info</span>
      {pending > 0 && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-amber-500 text-white"}`}>
          {pending}
        </span>
      )}
    </Link>
  );
}
