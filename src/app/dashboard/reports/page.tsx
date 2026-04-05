import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await getOrgId(userId);

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [
    { count: activeClients },
    { count: totalEncounters },
    { count: monthEncounters },
    { count: unsignedNotes },
    { count: pendingCharges },
    { data: recentEncounters },
    { data: monthCharges },
  ] = await Promise.all([
    supabaseAdmin.from("clients").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true),
    supabaseAdmin.from("encounters").select("*", { count: "exact", head: true }).eq("organization_id", orgId),
    supabaseAdmin.from("encounters").select("*", { count: "exact", head: true }).eq("organization_id", orgId).gte("encounter_date", thirtyDaysAgo),
    supabaseAdmin.from("clinical_notes").select("*, encounter:encounter_id!inner(organization_id)", { count: "exact", head: true }).eq("encounter.organization_id", orgId).eq("is_signed", false),
    supabaseAdmin.from("charges").select("*", { count: "exact", head: true }).eq("organization_id", orgId).eq("status", "pending"),
    supabaseAdmin.from("encounters").select("*, client:client_id(first_name, last_name)").eq("organization_id", orgId).order("encounter_date", { ascending: false }).limit(8),
    supabaseAdmin.from("charges").select("charge_amount, paid_amount, status").eq("organization_id", orgId).gte("service_date", firstOfMonth).lte("service_date", today),
  ]);

  const monthRevenue = monthCharges?.reduce((s, c) => s + (Number(c.charge_amount) || 0), 0) ?? 0;
  const monthCollected = monthCharges
    ?.filter(c => c.status === "paid")
    .reduce((s, c) => s + (Number(c.paid_amount) || Number(c.charge_amount) || 0), 0) ?? 0;
  const monthCollectionRate = monthRevenue > 0 ? Math.round((monthCollected / monthRevenue) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">Practice overview and key metrics</p>
      </div>

      {/* Financial Dashboard feature card */}
      <Link
        href="/dashboard/reports/revenue"
        className="block bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6 no-underline hover:opacity-95 transition-opacity"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-teal-300 uppercase tracking-wider mb-1">Financial Dashboard</div>
            <h2 className="text-xl font-bold text-white">Revenue Analytics</h2>
            <p className="text-slate-300 text-sm mt-1">Monthly trend, AR aging, CPT performance, collection rates</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-teal-300">
              ${monthRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">charged this month</div>
            {monthRevenue > 0 && (
              <div className={`text-sm font-semibold mt-1 ${monthCollectionRate >= 80 ? "text-teal-300" : "text-amber-300"}`}>
                {monthCollectionRate}% collected
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 text-xs text-teal-400 font-medium">Open Financial Dashboard →</div>
      </Link>

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
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Encounters</h2>
          <Link href="/dashboard/reports/encounters" className="text-xs text-teal-600 hover:text-teal-800 font-medium">
            Full Report →
          </Link>
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
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">All Reports</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Financial Dashboard", desc: "Revenue, AR aging, CPT analytics", href: "/dashboard/reports/revenue", icon: "📈", highlight: true },
            { label: "Charge Summary", desc: "Full charge register by date", href: "/dashboard/reports/charges", icon: "🧾", highlight: false },
            { label: "Claims Outcome", desc: "Paid vs denied analysis", href: "/dashboard/reports/claims", icon: "📋", highlight: false },
            { label: "Revenue by CPT", desc: "Procedure code breakdown", href: "/dashboard/reports/cpt", icon: "💳", highlight: false },
            { label: "Unsigned Notes", desc: "Notes pending signature", href: "/dashboard/encounters?status=in_progress", icon: "📝", alert: (unsignedNotes ?? 0) > 0 },
            { label: "Pending Billing", desc: "Charges awaiting submission", href: "/dashboard/billing?status=pending", icon: "💰", alert: (pendingCharges ?? 0) > 0 },
            { label: "Encounters", desc: "Encounter volume by date", href: "/dashboard/reports/encounters", icon: "⚕️", highlight: false },
            { label: "Caseload", desc: "Client assignments", href: "/dashboard/reports/caseload", icon: "👤", highlight: false },
            { label: "Incident Summary", desc: "Incident trends and compliance", href: "/dashboard/reports/incidents", icon: "🚨", highlight: false },
            { label: "Demographics", desc: "Population breakdown by age, gender, race", href: "/dashboard/reports/demographics", icon: "🧬", highlight: false },
            { label: "Staff Productivity", desc: "Clinician metrics, billable hours, benchmarks", href: "/dashboard/reports/productivity", icon: "🏆", highlight: false },
            { label: "No-Show & Cancellations", desc: "Attendance rate, no-show trends, provider breakdown", href: "/dashboard/reports/attendance", icon: "🚫", highlight: false },
            { label: "Medicaid Compliance Export", desc: "State Medicaid client services & billing export", href: "/dashboard/reports/medicaid", icon: "🏥", highlight: false },
            { label: "Skills Progress", desc: "Skill acquisition data, mastery rates, trend analysis", href: "/dashboard/reports/skills", icon: "🎯", highlight: false },
            { label: "Form Analytics", desc: "Completion rates and average scores by program", href: "/dashboard/reports/forms", icon: "📋", highlight: false },
          ].map(r => (
            <Link key={r.label} href={r.href}
              className={`bg-white rounded-2xl border p-4 hover:shadow-sm transition-shadow no-underline ${
                "alert" in r && r.alert ? "border-amber-200" :
                "highlight" in r && r.highlight ? "border-teal-200 bg-teal-50/30" :
                "border-slate-200"
              }`}>
              <div className="text-xl mb-2">{r.icon}</div>
              <div className="font-semibold text-slate-900 text-sm">{r.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{r.desc}</div>
              <div className={`text-xs font-medium mt-2 ${"highlight" in r && r.highlight ? "text-teal-600" : "text-slate-400"}`}>View →</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
