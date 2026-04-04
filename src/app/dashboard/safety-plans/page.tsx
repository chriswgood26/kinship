import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const riskColors: Record<string, string> = {
  "Low Risk": "bg-emerald-100 text-emerald-700",
  "Moderate Risk": "bg-amber-100 text-amber-700",
  "High Risk": "bg-orange-100 text-orange-700",
  "Imminent Risk": "bg-red-100 text-red-700",
};

export default async function SafetyPlansPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();

  const { data: plans } = await supabaseAdmin
    .from("safety_plans")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", profile?.organization_id || "")
    .order("created_at", { ascending: false })
    .limit(50);

  const activeCount = plans?.filter(p => p.status === "active").length || 0;
  const highRiskCount = plans?.filter(p => p.risk_level === "High Risk" || p.risk_level === "Imminent Risk").length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Safety Plans</h1>
          <p className="text-slate-500 text-sm mt-0.5">CCBHC-compliant crisis safety planning documentation</p>
        </div>
        <Link href="/dashboard/safety-plans/new"
          className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-400 text-sm">
          + New Safety Plan
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-3xl font-bold text-slate-900">{plans?.length || 0}</div>
          <div className="text-sm text-slate-500 mt-0.5">Total Safety Plans</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-3xl font-bold text-emerald-600">{activeCount}</div>
          <div className="text-sm text-slate-500 mt-0.5">Active Plans</div>
        </div>
        <div className={`rounded-2xl border p-5 ${highRiskCount > 0 ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
          <div className={`text-3xl font-bold ${highRiskCount > 0 ? "text-red-600" : "text-slate-900"}`}>{highRiskCount}</div>
          <div className="text-sm text-slate-500 mt-0.5">High / Imminent Risk</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">All Safety Plans</h2>
          <span className="text-xs text-slate-400">Most recent first</span>
        </div>
        {!plans?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🛡️</div>
            <div className="font-semibold text-slate-700">No safety plans yet</div>
            <div className="text-sm text-slate-400 mt-1">Create a safety plan after completing a C-SSRS assessment</div>
            <Link href="/dashboard/safety-plans/new" className="inline-block mt-4 bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-400">
              Create First Safety Plan →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clinician</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-Up</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {plans.map(plan => {
                const client = Array.isArray(plan.client) ? plan.client[0] : plan.client;
                return (
                  <tr key={plan.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-sm text-slate-900">
                        {client ? `${client.last_name}, ${client.first_name}` : "—"}
                      </div>
                      <div className="text-xs text-slate-400">MRN: {client?.mrn || "—"}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      {plan.risk_level ? (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskColors[plan.risk_level] || "bg-slate-100 text-slate-700"}`}>
                          {plan.risk_level}
                        </span>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-700">
                      {plan.clinician_name || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {plan.created_at ? new Date(plan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {plan.follow_up_date ? new Date(plan.follow_up_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        plan.status === "active" ? "bg-emerald-100 text-emerald-700" :
                        plan.status === "superseded" ? "bg-slate-100 text-slate-500" :
                        "bg-amber-100 text-amber-700"
                      }`}>{plan.status}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/dashboard/safety-plans/${plan.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
