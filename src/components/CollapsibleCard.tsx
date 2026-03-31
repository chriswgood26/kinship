"use client";

import { useState, useEffect } from "react";

interface Props {
  id: string;  // unique key for localStorage persistence
  title: string;
  icon?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  className?: string;
}

export default function CollapsibleCard({ id, title, icon, headerRight, children, defaultCollapsed = false, className = "" }: Props) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return defaultCollapsed;
    const saved = localStorage.getItem(`drcloud_card_${id}`);
    return saved !== null ? saved === "true" : defaultCollapsed;
  });

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(`drcloud_card_${id}`, String(next)); } catch {}
      return next;
    });
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      <div
        className="flex items-center justify-between px-5 py-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors select-none"
        onClick={toggle}
      >
        <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {headerRight && <div onClick={e => e.stopPropagation()} className="flex items-center">{headerRight}</div>}
          <span className={`text-slate-400 transition-transform duration-200 text-xs ${collapsed ? "" : "rotate-180"}`}>▾</span>
        </div>
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}
