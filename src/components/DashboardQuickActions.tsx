"use client";

import Link from "next/link";
import { useTerminology } from "@/components/TerminologyProvider";

export default function DashboardQuickActions() {
  const term = useTerminology();

  const actions = [
    { label: `New ${term.singular}`, icon: "➕", href: "/dashboard/clients/new" },
    { label: "Schedule Appointment", icon: "📅", href: "/dashboard/scheduling/new" },
    { label: "Start Encounter", icon: "⚕️", href: "/dashboard/encounters/new" },
    { label: `${term.singular} Search`, icon: "🔍", href: "/dashboard/clients" },
  ];

  return (
    <div className="p-4 space-y-2">
      {actions.map(action => (
        <Link key={action.label} href={action.href}
          className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-teal-50 hover:text-teal-700 transition-colors text-slate-700">
          <span className="text-xl">{action.icon}</span>
          <span className="text-sm font-medium">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
