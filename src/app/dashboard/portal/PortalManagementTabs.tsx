"use client";

import { useRouter } from "next/navigation";

export default function PortalManagementTabs({
  activeTab,
  pendingCount,
}: {
  activeTab: "accounts" | "registrations";
  pendingCount: number;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-1 border-b border-slate-200">
      <button
        onClick={() => router.push("?tab=accounts")}
        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
          activeTab === "accounts"
            ? "border-teal-500 text-teal-600"
            : "border-transparent text-slate-500 hover:text-slate-700"
        }`}
      >
        Portal Accounts
      </button>
      <button
        onClick={() => router.push("?tab=registrations")}
        className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
          activeTab === "registrations"
            ? "border-teal-500 text-teal-600"
            : "border-transparent text-slate-500 hover:text-slate-700"
        }`}
      >
        Registration Requests
        {pendingCount > 0 && (
          <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
            {pendingCount}
          </span>
        )}
      </button>
    </div>
  );
}
