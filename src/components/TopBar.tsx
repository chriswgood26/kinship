"use client";

import { SignOutButton } from "@clerk/nextjs";

interface Props {
  firstName: string | null;
  lastName: string | null;
  role?: string | null;
}

export default function TopBar({ firstName, lastName, role }: Props) {
  const initials = ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase() || "U";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "User";

  return (
    <header className="bg-white px-6 py-3 flex items-center justify-between border-b border-slate-200">
      <div />
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">{initials}</div>
        <div className="hidden md:block">
          <div className="text-sm font-medium text-slate-900">{fullName}</div>
          {role && <div className="text-xs text-slate-400 capitalize">{role}</div>}
        </div>
        <SignOutButton>
          <button className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium px-2 py-1">Sign out</button>
        </SignOutButton>
      </div>
    </header>
  );
}
