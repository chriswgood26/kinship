"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  orgName?: string | null;
  clientTermPlural?: string;
}

const NAV_SECTIONS = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard", icon: "🏠", exact: true }],
  },
  {
    label: "Care",
    items: [
      { href: "/dashboard/clients", label: "Clients", icon: "👤" },
      { href: "/dashboard/scheduling", label: "Scheduling", icon: "📅" },
      { href: "/dashboard/encounters", label: "Encounters", icon: "⚕️" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: "💰" },
    ],
  },
  {
    label: "Clinical",
    items: [
      { href: "/dashboard/treatment-plans", label: "Treatment Plans", icon: "📋" },
      { href: "/dashboard/screenings", label: "Screenings", icon: "📊" },
      { href: "/dashboard/supervisor", label: "Supervisor Review", icon: "✅" },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/dashboard/reports", label: "Reports", icon: "📊" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
      { href: "/dashboard/feedback", label: "Submit Feedback", icon: "💬" },
    ],
  },
];

export default function Sidebar({ orgName, clientTermPlural = "Clients" }: Props) {
  const pathname = usePathname();

  const sections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.map(item =>
      item.label === "Clients" ? { ...item, label: clientTermPlural } : item
    ),
  }));

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="w-56 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">K</div>
          <span className="font-bold text-slate-900">Kinship</span>
        </div>
        {orgName && <div className="text-xs text-slate-400 mt-1 truncate">{orgName}</div>}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0.5">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "pt-3" : ""}>
            {section.label && (
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1.5">{section.label}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive(item.href, (item as {exact?: boolean}).exact)
                      ? "bg-[#0d1b2e] text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}>
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <div className="text-xs text-slate-400 text-center">Kinship EHR v0.1</div>
      </div>
    </div>
  );
}
