"use client";

import Link from "next/link";

interface Props {
  clientId: string;
  activeTab: string;
  unreadMessageCount: number;
}

const TABS = [
  { id: "overview", label: "Overview", icon: "👤" },
  { id: "problems", label: "Problem List", icon: "🩺" },
  { id: "screenings", label: "Screenings", icon: "📊" },
  { id: "allergies", label: "Allergies", icon: "💊" },
  { id: "documents", label: "Documents", icon: "📁" },
  { id: "billing", label: "Billing", icon: "💵" },
  { id: "messages", label: "Messages", icon: "💬" },
];

export default function ClientTabNav({ clientId, activeTab, unreadMessageCount }: Props) {
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map(tab => (
        <Link
          key={tab.id}
          href={`/dashboard/clients/${clientId}?tab=${tab.id}`}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
            activeTab === tab.id
              ? "border-teal-500 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>{tab.icon}</span>
          {tab.label}
          {tab.id === "messages" && unreadMessageCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
              {unreadMessageCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
