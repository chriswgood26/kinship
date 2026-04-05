import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/portal/sign-in");

  // Check if this Clerk user is a portal user (by clerk_user_id)
  let { data: portalUser } = await supabaseAdmin
    .from("portal_users")
    .select("*, client:client_id(first_name, last_name, preferred_name)")
    .eq("clerk_user_id", user.id)
    .eq("is_active", true)
    .single();

  // First-time sign-in: if no match by clerk_user_id, try matching by email
  // (pending accounts have clerk_user_id = "portal_pending_*")
  if (!portalUser && user.emailAddresses?.length) {
    const emails = user.emailAddresses.map((e) => e.emailAddress);
    const { data: pendingUser } = await supabaseAdmin
      .from("portal_users")
      .select("*, client:client_id(first_name, last_name, preferred_name)")
      .in("email", emails)
      .eq("is_active", true)
      .like("clerk_user_id", "portal_pending_%")
      .single();

    if (pendingUser) {
      // Link the real Clerk user ID to this portal account
      await supabaseAdmin
        .from("portal_users")
        .update({ clerk_user_id: user.id })
        .eq("id", pendingUser.id);
      portalUser = { ...pendingUser, clerk_user_id: user.id };
    }
  }

  if (!portalUser) {
    // Not a portal user — check if staff and redirect to dashboard
    redirect("/dashboard");
  }

  const client = Array.isArray(portalUser.client) ? portalUser.client[0] : portalUser.client;
  const access = portalUser.access_settings || {};
  const initials = ((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase() || "P";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Portal User";

  const navItems = [
    { href: "/portal/dashboard", label: "Home", icon: "🏠" },
    ...(access.messages !== false ? [{ href: "/portal/messages", label: "Messages", icon: "💬" }] : []),
    ...(access.appointments !== false ? [{ href: "/portal/appointments", label: "Appointments", icon: "📅" }] : []),
    { href: "/portal/profile", label: "My Profile", icon: "👤" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">K</div>
            <div>
              <div className="font-bold text-slate-900 text-sm">Patient Portal</div>
              {client && (
                <div className="text-xs text-slate-500">
                  {client.preferred_name || `${client.first_name} ${client.last_name}`}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-900">{fullName}</div>
              <div className="text-xs text-slate-400 capitalize">{portalUser.relationship?.replace("_", " ") || "Patient"}</div>
            </div>
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm">
              {initials}
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div className="max-w-3xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-teal-600 border-b-2 border-transparent hover:border-teal-500 transition-colors whitespace-nowrap"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>

      <footer className="max-w-3xl mx-auto px-4 py-6 border-t border-slate-200 mt-8">
        <p className="text-xs text-slate-400 text-center">
          Kinship EHR Patient Portal · This portal contains confidential health information. For emergencies, call 911.
        </p>
      </footer>
    </div>
  );
}
