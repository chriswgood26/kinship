import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  review_due: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-500",
  archived: "bg-slate-100 text-slate-400",
};

const SUPPORT_LEVELS: Record<string, string> = {
  "minimal": "bg-green-100 text-green-700",
  "moderate": "bg-yellow-100 text-yellow-700",
  "substantial": "bg-orange-100 text-orange-700",
  "intensive": "bg-red-100 text-red-600",
};

export default async function ISPPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const statusFilter = params.status || "";

  let query = supabaseAdmin
    .from("individual_support_plans")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name, date_of_birth)")
    .order("review_date", { ascending: true })
    .limit(100);

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: plans } = await query;

  const today = new Date().toISOString().split("T")[0];
  const reviewDue = plans?.filter(p => p.review_date && p.review_date <= today && p.status === "active").length || 0;
  const active = plans?.filter(p => p.status === "active").length || 0;
  const draft = plans?.filter(p => p.status === "draft").length || 0;
  const unsigned = plans?.filter(p => p.status === "active" && (!p.guardian_signed_at || !p.coordinator_signed_at)).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Individual Support Plans</h1>
          <p className="text-slate-500 text-sm mt-0.5">DD waiver — person-centered ISP documentation</p>
        </div>
        <Link href="/dashboard/isp/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New ISP
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active ISPs", value: active, color: "bg-emerald-50 border-emerald-100" },
          { label: "Annual Review Due", value: reviewDue, color: reviewDue > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Unsigned / Pending", value: unsigned, color: unsigned > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Drafts", value: draft, color: "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {reviewDue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-red-800 font-medium">
            {reviewDue} ISP{reviewDue > 1 ? "s are" : " is"} past annual review date — update before state audit
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[["", "All"], ["active", "Active"], ["review_due", "Review Due"], ["draft", "Draft"], ["archived", "Archived"]].map(([val, label]) => (
          <Link key={val} href={`/dashboard/isp?status=${val}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </Link>
        ))}
      </div>

      {/* ISP list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!plans?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-slate-900 mb-1">No Individual Support Plans yet</p>
            <p className="text-slate-500 text-sm mb-4">Create person-centered ISPs for DD waiver individuals</p>
            <Link href="/dashboard/isp/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
              + New ISP
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Individual</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan Year</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Support Level</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Annual Review</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Signatures</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {plans.map(plan => {
                const patient = Array.isArray(plan.patient) ? plan.patient[0] : plan.patient;
                const reviewDate = plan.review_date ? new Date(plan.review_date + "T12:00:00") : null;
                const isOverdue = reviewDate && reviewDate < new Date();
                const sigCount = [plan.guardian_signed_at, plan.client_signed_at, plan.coordinator_signed_at].filter(Boolean).length;

                return (
                  <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/clients/${plan.patient_id}`} className="no-underline">
                        <div className="font-semibold text-slate-900 text-sm hover:text-teal-600">
                          {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}
                        </div>
                        <div className="text-xs text-slate-400">{patient?.mrn || "—"}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900">{plan.plan_year || "—"}</td>
                    <td className="px-4 py-4">
                      {plan.level_of_support ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${SUPPORT_LEVELS[plan.level_of_support.toLowerCase()] || "bg-slate-100 text-slate-600"}`}>
                          {plan.level_of_support}
                        </span>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      {reviewDate ? (
                        <div className={`text-sm ${isOverdue ? "text-red-500 font-semibold" : "text-slate-600"}`}>
                          {reviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {isOverdue && " ⚠️"}
                        </div>
                      ) : <span className="text-slate-400 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${plan.guardian_signed_at ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`} title="Guardian">G</span>
                        <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${plan.client_signed_at ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`} title="Individual">I</span>
                        <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${plan.coordinator_signed_at ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`} title="Coordinator">C</span>
                        <span className="text-xs text-slate-400 ml-1">{sigCount}/3</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>
                        {plan.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/isp/${plan.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">
                        View →
                      </Link>
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
