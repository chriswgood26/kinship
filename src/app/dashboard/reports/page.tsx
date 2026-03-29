import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", user.id).single();
  const orgId = profile?.organization_id || "";

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [
    { count: activeClients },
    { count: totalEncounters },
    { count: monthEncounters },
    { count: unsignedNotes },
    { count: pendingCharges },
    { data: recentEncounters },
  ] = await Promise.all([
    supabaseAdmin.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true),
    supabaseAdmin.from("encounters").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabaseAdmin.from("encounters").select("*", { count: "exact", head: true }).eq("organization_id", orgId).gte("encounter_date", thirtyDaysAgo),
    supabaseAdmin.from("clinical_notes").select("*, encounter:encounter_id!inner(organization_id)", { count: "exact", head: true }).eq("encounter.organization_id", orgId).eq("is_signed", false),
    supabaseAdmin.from("charges").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "pending"),
    supabaseAdmin.from("encounters").select("*, client:client_id(first_name, last_name)").eq("organization_id", orgId).order("encounter_date", { ascending: false }).limit(8),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">Practice overview and key metrics</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Active Clients", value: activeClients ?? 0, icon: "👤", color: "bg-teal-50 border-teal-100" },
          { label: "Encounters (30d)", value: monthEncounters ?? 0, icon: "⚕️", color: "bg-blue-50 border-blue-100" },
          { label: "Total Encounters", value: totalEncounters ?? 0, icon: "📊", color: "bg-slate-50 border-slate-200" },
          { label: "Unsigned Notes", value: unsignedNotes ?? 0, icon: "📝", color: (unsignedNotes ?? 0) > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Pending Charges", value: pendingCharges ?? 0, icon: "💰", color: (pendingCharges ?? 0) > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
        ].map(m => (
          <div key={m.label} className={`${m.color} border rounded-2xl p-4`}>
            <div className="text-2xl mb-1">{m.icon}</div>
            <div className="text-3xl font-bold text-slate-900">{m.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Recent encounters */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Encounters</h2>
        </div>
        {!recentEncounters?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No encounters yet</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentEncounters.map(enc => {
              const client = Array.isArray(enc.client) ? enc.client[0] : enc.client;
              return (
                <Link key={enc.id} href={`/dashboard/encounters/${enc.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 no-underline">
                  <div className="flex-1">
                    <div className="font-medium text-sm text-slate-900">{client ? `${client.last_name}, ${client.first_name}` : "—"}</div>
                    <div className="text-xs text-slate-400">{enc.encounter_type} · {enc.encounter_date}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${enc.status === "signed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {enc.status?.replace("_", " ")}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick report links */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Unsigned Notes", desc: "Notes pending signature", href: "/dashboard/encounters?status=in_progress", icon: "📝", alert: (unsignedNotes ?? 0) > 0 },
          { label: "Pending Billing", desc: "Charges awaiting submission", href: "/dashboard/billing?status=pending", icon: "💰", alert: (pendingCharges ?? 0) > 0 },
          { label: "Active Clients", desc: "Current caseload", href: "/dashboard/clients", icon: "👤", alert: false },
        ].map(r => (
          <Link key={r.label} href={r.href}
            className={`bg-white rounded-2xl border p-5 hover:shadow-sm transition-shadow no-underline ${r.alert ? "border-amber-200" : "border-slate-200"}`}>
            <div className="text-2xl mb-2">{r.icon}</div>
            <div className="font-semibold text-slate-900 text-sm">{r.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{r.desc}</div>
            <div className="text-xs text-teal-600 font-medium mt-2">View →</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
