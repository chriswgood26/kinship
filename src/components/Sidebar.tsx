"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import InboxBadge from "@/components/InboxBadge";
import CommunicationBadgeCount from "@/components/CommunicationBadgeCount";
import ROIBadge from "@/components/ROIBadge";
import type { Terminology } from "@/lib/terminology";
import { PLAN_LABELS, type Plan } from "@/lib/plans";
import { hasPermission } from "@/lib/roles";

interface NavItem { href: string; label: string; icon: string; exact?: boolean; inboxBadge?: boolean; roles?: string[]; permissions?: string[]; }
interface NavSection { label: string | null; icon?: string; items: NavItem[]; defaultOpen?: boolean; roles?: string[]; permissions?: string[]; }

const navSections: NavSection[] = [
  {
    label: null,
    defaultOpen: true,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "🏠", exact: true as const },
    ],
  },
  {
    label: "Clients & Intake",
    icon: "👤",
    defaultOpen: true,
    items: [
      { href: "/dashboard/referrals", label: "Referrals", icon: "🔄" },
      { href: "/dashboard/clients", label: "Clients", icon: "👤" },
      { href: "/dashboard/scheduling", label: "Scheduling", icon: "📅" },
      { href: "/dashboard/telehealth", label: "Telehealth", icon: "🎥" },
      { href: "/dashboard/inbox", label: "Messages", icon: "💬", inboxBadge: true },
      { href: "/dashboard/financial-eligibility", label: "Financial Eligibility", icon: "💲" },
      { href: "/dashboard/authorizations", label: "Authorizations", icon: "🔐" },
    ],
  },
  {
    label: "Clinical",
    icon: "⚕️",
    defaultOpen: true,
    items: [
      { href: "/dashboard/encounters", label: "Encounters", icon: "⚕️" },
      { href: "/dashboard/assessments", label: "Assessments", icon: "📊" },
      { href: "/dashboard/treatment-plans", label: "Treatment Plans", icon: "📋" },
      { href: "/dashboard/notes", label: "Clinical Notes", icon: "📝" },
      { href: "/dashboard/screenings", label: "Screenings", icon: "🔬" },
      { href: "/dashboard/safety-plans", label: "Safety Plans", icon: "🛡️" },
      { href: "/dashboard/isp", label: "Support Plans (ISP)", icon: "🧩" },
      { href: "/dashboard/dd-notes", label: "DD Progress Notes", icon: "📝" },
      { href: "/dashboard/emar", label: "eMAR", icon: "💊" },
      { href: "/dashboard/supervisor", label: "Supervisor Review", icon: "✅", permissions: ["supervisor.read"] },
      { href: "/dashboard/incidents", label: "Incident Reports", icon: "🚨" },
    ],
  },
  {
    label: "Residential",
    icon: "🏠",
    defaultOpen: false,
    items: [
      { href: "/dashboard/beds", label: "Bed Management", icon: "🏠" },
    ],
  },
  {
    label: "Billing",
    icon: "💰",
    defaultOpen: true,
    items: [
      { href: "/dashboard/billing", label: "Charges & Claims", icon: "💰" },
      { href: "/dashboard/billing/invoices", label: "Client Invoices", icon: "🧾" },
    ],
  },
  {
    label: "Reporting",
    defaultOpen: false,
    items: [
      { href: "/dashboard/reports", label: "Reports", icon: "📊" },
      { href: "/dashboard/reports/emar", label: "eMAR Compliance", icon: "💊" },
      { href: "/dashboard/timesheet", label: "Timesheet", icon: "⏱️" },
    ],
  },
  {
    label: "Admin",
    defaultOpen: false,
    items: [
      { href: "/dashboard/admin/users", label: "Users", icon: "👥" },
      { href: "/dashboard/portal", label: "Client Portal", icon: "🌐" },
      { href: "/dashboard/admin/settings", label: "Settings", icon: "⚙️" },
      { href: "/dashboard/admin/field-config", label: "Field Configuration", icon: "🔧", permissions: ["*"] },
      { href: "/dashboard/migration", label: "Migration Planner", icon: "🔄", permissions: ["*"] },
      { href: "/dashboard/admin/sliding-fee", label: "Sliding Fee", icon: "💲" },
      { href: "/dashboard/admin/clearinghouse", label: "Clearinghouse", icon: "🏥" },
      { href: "/dashboard/admin/communications", label: "Communications", icon: "📣" },
      { href: "/dashboard/programs", label: "Programs & Services", icon: "🏥" },
      { href: "/dashboard/feedback", label: "Submit Feedback", icon: "💬" },
    ],
  },
];

const PLAN_BADGE_COLORS: Record<Plan, string> = {
  starter:  "bg-slate-100 text-slate-600",
  growth:   "bg-teal-50 text-teal-700",
  practice: "bg-violet-50 text-violet-700",
  agency:   "bg-blue-50 text-blue-700",
  custom:   "bg-amber-50 text-amber-700",
};

export default function Sidebar({ terminology, userRoles = ["clinician"], plan = "starter" }: { terminology?: Terminology; userRoles?: string[]; plan?: string }) {
  const planKey = (plan || "starter") as Plan;
  const planLabel = PLAN_LABELS[planKey] || "Starter";
  const planBadgeColor = PLAN_BADGE_COLORS[planKey] || PLAN_BADGE_COLORS.starter;
  const [localTerm, setLocalTerm] = useState<Terminology | undefined>(terminology);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("drcloud_terminology");
      if (saved) {
        import("@/lib/terminology").then(({ getTerminology }) => {
          setLocalTerm(getTerminology(saved));
        });
      }
    }
  }, []);

  useEffect(() => {
    function handleChange(e: Event) {
      const val = (e as CustomEvent<string>).detail;
      if (val) {
        import("@/lib/terminology").then(({ getTerminology }) => {
          setLocalTerm(getTerminology(val));
        });
      }
    }
    window.addEventListener("drcloud_terminology_change", handleChange);
    return () => window.removeEventListener("drcloud_terminology_change", handleChange);
  }, []);

  const term = localTerm || terminology || { singular: "Client", plural: "Clients", value: "client", adjective: "Client" };

  const [pinned, setPinned] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("drcloud_sidebar_pinned") === "true";
  });
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isExpanded = pinned || hovered || mobileOpen;

  function togglePin() {
    setPinned(prev => {
      const next = !prev;
      try { localStorage.setItem("drcloud_sidebar_pinned", String(next)); } catch {}
      return next;
    });
  }

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navSections.forEach((s, i) => {
      initial[s.label || `section-${i}`] = s.defaultOpen !== false;
    });
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("drcloud_sidebar_sections") : null;
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, boolean>;
        return { ...initial, ...parsed };
      }
    } catch {}
    return initial;
  });

  function toggleSection(label: string) {
    setOpenSections(prev => {
      const next = { ...prev, [label]: !prev[label] };
      try { localStorage.setItem("drcloud_sidebar_sections", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const sections = navSections
    .filter(section => {
      if (section.permissions) return section.permissions.some(p => hasPermission(userRoles, p));
      if (section.roles) return section.roles.some(r => userRoles.includes(r));
      return true;
    })
    .map(section => ({
      ...section,
      label: section.label === "Clients & Intake" ? `${term.plural} & Intake` : section.label,
      items: section.items
        .filter(item => {
          if (item.permissions) return item.permissions.some(p => hasPermission(userRoles, p));
          if (item.roles) return item.roles.some(r => userRoles.includes(r));
          return true;
        })
        .map(item =>
          item.href === "/dashboard/clients"
            ? { ...item, label: term.plural }
            : item
        ),
    }));

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
    {!mobileOpen && (
      <button onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-sm no-print"
        aria-label="Open menu">
        <span className="text-slate-600 text-lg">☰</span>
      </button>
    )}

    {mobileOpen && (
      <div className="md:hidden fixed inset-0 bg-black/40 z-40 no-print" onClick={() => setMobileOpen(false)} />
    )}

    <div
      className={`flex flex-col h-full no-print bg-white border-r border-slate-200 transition-all duration-200
        ${isExpanded ? "w-60" : "w-14"}
        ${mobileOpen ? "fixed inset-y-0 left-0 z-50 shadow-xl" : "hidden md:flex"}
        ${!mobileOpen && !pinned && !hovered ? "md:flex" : ""}
      `}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Logo */}
      <div className={`border-b border-slate-200 ${isExpanded ? "px-5 pt-3 pb-2" : "px-2 py-3 flex items-center justify-center"}`}>
        {isExpanded ? (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">K</div>
                <span className="font-bold text-slate-900">Kinship <span className="font-light text-slate-400">EHR</span></span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={togglePin} title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
                  className="hidden md:block text-slate-400 hover:text-slate-600 transition-colors p-1 rounded">
                  {pinned ? "📌" : "📍"}
                </button>
                <button onClick={() => setMobileOpen(false)}
                  className="md:hidden text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
                  aria-label="Close menu">
                  ✕
                </button>
              </div>
            </div>
            <Link href="/dashboard/admin/settings" className="mt-2 mb-1 inline-flex items-center gap-1.5 group">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md tracking-wide ${planBadgeColor} group-hover:opacity-80 transition-opacity`}>
                {planLabel}
              </span>
              <span className="text-[10px] text-slate-400 group-hover:text-teal-600 transition-colors">plan ›</span>
            </Link>
          </>
        ) : (
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">K</div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {sections.map((section, si) => {
          const sectionKey = section.label || `section-${si}`;
          const isOpen = openSections[sectionKey] !== false;

          return (
            <div key={si} className={si > 0 ? "pt-2" : ""}>
              {section.label && (
                isExpanded ? (
                  <button
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                    <span className="flex items-center gap-2">
                      {section.label}
                      {section.label === "Communication" && <CommunicationBadgeCount />}
                    </span>
                    <span className="text-slate-300">{isOpen ? "▾" : "▸"}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-center py-1 mb-0.5 border-b border-slate-100" title={section.label || ""}>
                    <span className="text-base">{(section as {icon?: string}).icon || "·"}</span>
                  </div>
                )
              )}

              {(isOpen || !isExpanded) && (
                <div className="space-y-0.5">
                  {section.items.map(item => (
                    <div key={item.href}>
                      {(item as {inboxBadge?: boolean}).inboxBadge ? (
                        isExpanded ? <InboxBadge /> : (
                          <Link href="/dashboard/inbox" title="Messages"
                            className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors mx-auto ${isActive("/dashboard/inbox") ? "bg-[#0d1b2e] text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                            <span>💬</span>
                          </Link>
                        )
                      ) : isExpanded ? (
                        <Link href={item.href} onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            isActive(item.href, (item as {exact?: boolean}).exact)
                              ? "bg-[#0d1b2e] text-white"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}>
                          <span>{item.icon}</span>
                          {item.label}
                        </Link>
                      ) : (
                        <Link href={item.href} title={item.label}
                          className={`flex items-center justify-center w-8 h-8 rounded-xl transition-colors mx-auto ${
                            isActive(item.href, (item as {exact?: boolean}).exact)
                              ? "bg-[#0d1b2e] text-white"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}>
                          <span className="text-base">{item.icon}</span>
                        </Link>
                      )}
                      {item.href === "/dashboard/scheduling" && <ROIBadge isExpanded={isExpanded} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {isExpanded && <div className="px-4 py-3 border-t border-slate-200 space-y-1">
        <Link href="/dashboard/release-notes" className="block text-center text-xs text-slate-400 hover:text-teal-600 transition-colors">
          📋 Release Notes · v0.1
        </Link>
        <p className="text-xs text-slate-400 text-center">Kinship EHR · 2026</p>
      </div>}
    </div>
    </>
  );
}
