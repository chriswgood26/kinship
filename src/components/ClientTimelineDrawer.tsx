"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TimelineEvent {
  id: string;
  date: string;
  type: string;
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  href: string;
  urgent?: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  slate: "bg-slate-100 text-slate-500",
};

const TYPE_FILTERS = [
  { key: "", label: "All" },
  { key: "encounter", label: "⚕️ Encounters" },
  { key: "assessment", label: "📊 Assessments" },
  { key: "vitals", label: "🩺 Vitals" },
  { key: "medication", label: "💊 Medications" },
  { key: "referral", label: "🔄 Referrals" },
  { key: "screening", label: "📋 Screenings" },
  { key: "roi", label: "📄 ROIs" },
  { key: "portal_message", label: "💬 Messages" },
];

export default function ClientTimelineDrawer({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function load() {
    if (loaded) return;
    setLoading(true);
    const res = await fetch(`/api/client-timeline?client_id=${clientId}`, { credentials: "include" });
    const d = await res.json();
    setTimeline(d.timeline || []);
    setLoading(false);
    setLoaded(true);
  }

  useEffect(() => {
    if (open && !loaded) load();
  }, [open]);

  const filtered = filter ? timeline.filter(e => e.type === filter) : timeline;
  const urgentCount = timeline.filter(e => e.urgent).length;

  function formatDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: diffDays > 365 ? "numeric" : undefined });
  }

  return (
    <>
      {/* Floating tab */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1 px-2 py-4 rounded-l-xl shadow-lg border border-r-0 transition-all no-print ${
          open ? "bg-[#0d1b2e] text-white border-[#0d1b2e]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
        }`}
        title="Client Timeline"
      >
        <span className="text-lg">📜</span>
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ writingMode: "vertical-rl" }}>Timeline</span>
        {urgentCount > 0 && !open && (
          <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {urgentCount}
          </span>
        )}
      </button>

      {/* Drawer */}
      <div className={`fixed right-0 top-0 bottom-0 z-30 w-96 bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 flex flex-col no-print ${
        open ? "translate-x-0" : "translate-x-full"
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-[#0d1b2e]">
          <div>
            <h2 className="font-bold text-white">Client Timeline</h2>
            <p className="text-slate-400 text-xs mt-0.5">{filtered.length} events{filter ? ` · ${filter}` : ""}</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Filter pills */}
        <div className="px-4 py-3 border-b border-slate-100 flex gap-1.5 flex-wrap bg-slate-50">
          {TYPE_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${filter === f.key ? "bg-[#0d1b2e] text-white" : "border border-slate-200 text-slate-500 hover:border-slate-300 bg-white"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="text-3xl mb-2 animate-pulse">📜</div>
              <p className="text-sm">Loading timeline...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">No events{filter ? ` of type ${filter}` : ""}</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-100" />

              {filtered.map((event, i) => {
                const showDate = i === 0 || formatDate(filtered[i-1].date) !== formatDate(event.date);
                return (
                  <div key={event.id}>
                    {showDate && (
                      <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-slate-50">
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{formatDate(event.date)}</div>
                      </div>
                    )}
                    <Link href={event.href}
                      className={`flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 relative ${event.urgent ? "bg-red-50/40" : ""}`}
                      onClick={() => setOpen(false)}>
                      {/* Icon with timeline dot */}
                      <div className="relative z-10 flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 ${event.urgent ? "bg-red-50 border-red-300" : "bg-white border-slate-200"}`}>
                          {event.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-slate-900 text-sm leading-tight capitalize">{event.title}</div>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                            {new Date(event.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        </div>
                        {event.subtitle && (
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">{event.subtitle}</p>
                        )}
                        {event.badge && (
                          <span className={`inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE_COLORS[event.badgeColor || "slate"]}`}>
                            {event.urgent && "⚠️ "}{event.badge}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
              <div className="h-8" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <button onClick={() => { setLoaded(false); load(); }} className="text-xs text-slate-400 hover:text-teal-600 font-medium">
            🔄 Refresh timeline
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-20 bg-black/10 no-print" onClick={() => setOpen(false)} />}
    </>
  );
}
