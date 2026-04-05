import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TreatmentPlansReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: plans } = await supabaseAdmin
    .from("treatment_plans")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .order("next_review_date", { ascending: true })
    .limit(100);

  const active = plans?.filter(p => p.status === "active") || [];
  const overdue = plans?.filter(p => {
    if (!p.next_review_date) return false;
    return new Date(p.next_review_date + "T12:00:00") < new Date();
  }) || [];
  const dueIn30 = plans?.filter(p => {
    if (!p.next_review_date) return false;
    const d = new Date(p.next_review_date + "T12:00:00");
    const diff = d.getTime() - Date.now();
    return diff > 0 && diff < 30 * 86400000;
  }) || [];

  const totalGoals = plans?.reduce((s, p) => s + (p.goals?.length || 0), 0) || 0;
  const achievedObjs = plans?.reduce((s, p) => {
    const goals = p.goals || [];
    return s + goals.reduce((gs: number, g: {objectives?: {status: string}[]}) =>
      gs + (g.objectives?.filter((o: {status: string}) => o.status === "achieved").length || 0), 0);
  }, 0) || 0;

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    draft: "bg-slate-100 text-slate-600",
    review_due: "bg-amber-100 text-amber-700",
    completed: "bg-blue-100 text-blue-700",
    discontinued: "bg-red-100 text-red-500",
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Treatment Plan Compliance</h1>
          <p className="text-slate-500 text-sm mt-0.5">Plan status, reviews due, and goal progress</p>
        </div>
      </div>
        <ReportActions reportTitle="Treatment Plan Compliance Report" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Plans", value: active.length, color: "bg-emerald-50 border-emerald-100" },
          { label: "Overdue Reviews", value: overdue.length, color: overdue.length > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Due in 30 Days", value: dueIn30.length, color: dueIn30.length > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Objectives Achieved", value: achievedObjs, color: "bg-teal-50 border-teal-100" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-semibold text-red-700 mb-3">⚠️ Overdue Reviews</h3>
          <div className="space-y-2">
            {overdue.map(p => {
              const patient = Array.isArray(p.patient) ? p.patient[0] : p.patient;
              const daysOverdue = Math.round((Date.now() - new Date(p.next_review_date + "T12:00:00").getTime()) / 86400000);
              return (
                <Link key={p.id} href={`/dashboard/treatment-plans/${p.id}`}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-red-100 hover:bg-red-50">
                  <span className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</span>
                  <span className="text-red-500 text-xs font-semibold">{daysOverdue} days overdue →</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-5 gap-4">
          <span>Patient</span><span>Start Date</span><span>Next Review</span><span>Goals</span><span>Status</span>
        </div>
        {!plans?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No treatment plans yet</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {plans.map(p => {
              const patient = Array.isArray(p.patient) ? p.patient[0] : p.patient;
              const reviewDate = p.next_review_date ? new Date(p.next_review_date + "T12:00:00") : null;
              const isOverdue = reviewDate && reviewDate < new Date();
              return (
                <Link key={p.id} href={`/dashboard/treatment-plans/${p.id}`}
                  className="grid grid-cols-5 gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
                    <div className="text-xs text-slate-400">{patient?.mrn}</div>
                  </div>
                  <div className="text-sm text-slate-600">{p.plan_start_date ? new Date(p.plan_start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>
                  <div className={`text-sm font-medium ${isOverdue ? "text-red-500" : "text-slate-600"}`}>
                    {reviewDate ? reviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    {isOverdue && " ⚠️"}
                  </div>
                  <div className="text-sm text-slate-600">{p.goals?.length || 0} goals</div>
                  <div><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[p.status] || "bg-slate-100 text-slate-500"}`}>{p.status?.replace("_", " ")}</span></div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
