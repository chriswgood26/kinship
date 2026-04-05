import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import DashboardGreeting from "./DashboardGreeting";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id, role")
    .eq("clerk_user_id", user.id)
    .single();

  const orgId = profile?.organization_id;

  const today = new Date().toISOString().split("T")[0];

  const [
    { count: totalClients },
    { count: todayAppts },
    { count: pendingNotes },
  ] = await Promise.all([
    supabaseAdmin.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId || "").eq("is_active", true),
    supabaseAdmin.from("appointments").select("*", { count: "exact", head: true }).eq("organization_id", orgId || "").eq("appointment_date", today),
    supabaseAdmin.from("encounters").select("*", { count: "exact", head: true }).eq("organization_id", orgId || "").eq("status", "in_progress"),
  ]);

  const firstName = user.firstName || "there";

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <DashboardGreeting firstName={firstName} />
        <p className="text-slate-500 text-sm mt-0.5">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "My Caseload", value: totalClients ?? 0, icon: "👤", href: "/dashboard/clients", color: "bg-teal-50 border-teal-100" },
          { label: "Today's Appointments", value: todayAppts ?? 0, icon: "📅", href: "/dashboard/scheduling", color: "bg-blue-50 border-blue-100" },
          { label: "Pending Notes", value: pendingNotes ?? 0, icon: "📝", href: "/dashboard/encounters", color: "bg-amber-50 border-amber-100" },
        ].map(stat => (
          <Link key={stat.label} href={stat.href}
            className={`${stat.color} border rounded-2xl p-5 hover:shadow-sm transition-shadow`}>
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "New Client", icon: "➕", href: "/dashboard/clients/new" },
            { label: "Schedule Appt", icon: "📅", href: "/dashboard/scheduling/new" },
            { label: "Start Encounter", icon: "⚕️", href: "/dashboard/encounters/new" },
            { label: "Create Referral", icon: "🔗", href: "/dashboard/referrals/new" },
          ].map(action => (
            <Link key={action.label} href={action.href}
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-teal-50 hover:text-teal-700 transition-colors text-slate-700">
              <span className="text-2xl">{action.icon}</span>
              <span className="text-xs font-medium text-center">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Setup checklist for new orgs */}
      {(totalClients ?? 0) === 0 && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6">
          <h2 className="font-bold text-teal-900 mb-1">🌿 Welcome to Kinship!</h2>
          <p className="text-teal-700 text-sm mb-4">Get started by completing your setup:</p>
          <div className="space-y-2">
            {[
              { label: "Add your first client", href: "/dashboard/clients/new", done: false },
              { label: "Configure your organization settings", href: "/dashboard/settings", done: false },
              { label: "Invite your team", href: "/dashboard/admin/users", done: false },
            ].map(item => (
              <Link key={item.label} href={item.href}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 hover:border-teal-300 border border-slate-200 transition-colors">
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <span className="ml-auto text-slate-400 text-sm">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
