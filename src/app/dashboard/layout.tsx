import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("*, organization:organization_id(name, client_terminology)")
    .eq("clerk_user_id", user.id)
    .single();

  const org = Array.isArray(profile?.organization) ? profile?.organization[0] : profile?.organization;
  const clientTerm = org?.client_terminology || "client";
  const clientTermPlural = clientTerm === "client" ? "Clients" : clientTerm === "patient" ? "Patients" : clientTerm.charAt(0).toUpperCase() + clientTerm.slice(1) + "s";
  const initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || "U";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "User";

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: "🏠", exact: true },
    { href: "/dashboard/clients", label: clientTermPlural, icon: "👤" },
    { href: "/dashboard/scheduling", label: "Scheduling", icon: "📅" },
    { href: "/dashboard/encounters", label: "Encounters", icon: "⚕️" },
    { href: "/dashboard/billing", label: "Billing", icon: "💰" },
    { href: "/dashboard/reports", label: "Reports", icon: "📊" },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-xs">K</div>
            <span className="font-bold text-slate-900">Kinship</span>
          </div>
          {org?.name && <div className="text-xs text-slate-400 mt-1 truncate">{org.name}</div>}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const isActive = item.exact
              ? typeof window !== "undefined" && window.location.pathname === item.href
              : true; // server-side we can't check easily, handled by client
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="text-xs text-slate-400 text-center">Kinship EHR v0.1</div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TopBar */}
        <header className="bg-white px-6 py-3 flex items-center justify-between border-b border-slate-200">
          <div />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">{initials}</div>
            <div className="hidden md:block">
              <div className="text-sm font-medium text-slate-900">{fullName}</div>
              {profile?.role && <div className="text-xs text-slate-400 capitalize">{profile.role}</div>}
            </div>
            <SignOutButton>
              <button className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium px-2 py-1">Sign out</button>
            </SignOutButton>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
