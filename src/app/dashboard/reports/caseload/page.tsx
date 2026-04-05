import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CaseloadReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id || "34e600b3-beb0-440c-88c4-20032185e727";


  const { data: patients } = await supabaseAdmin
    .from("clients")
    .select("*")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("last_name");

  const { data: plans } = await supabaseAdmin
    .from("treatment_plans")
    .select("client_id, status, next_review_date")
    .eq("organization_id", orgId);

  const plansByPatient: Record<string, { status: string; next_review_date?: string }> = {};
  plans?.forEach(p => { plansByPatient[p.client_id] = p; });

  const reviewDue = plans?.filter(p => {
    if (!p.next_review_date) return false;
    return new Date(p.next_review_date + "T12:00:00") < new Date();
  }).length || 0;

  const withPlan = patients?.filter(p => plansByPatient[p.id]).length || 0;
  const withoutPlan = (patients?.length || 0) - withPlan;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Active Caseload</h1>
          <p className="text-slate-500 text-sm mt-0.5">All active patients and treatment plan status</p>
        </div>
      </div>
        <ReportActions reportTitle="Active Caseload Report" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active Patients", value: patients?.length || 0, color: "bg-teal-50 border-teal-100" },
          { label: "With Active Plan", value: withPlan, color: "bg-emerald-50 border-emerald-100" },
          { label: "No Treatment Plan", value: withoutPlan, color: withoutPlan > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Plan Reviews Due", value: reviewDue, color: reviewDue > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-4 gap-4">
          <span>Patient</span><span>DOB</span><span>Treatment Plan</span><span>Next Review</span>
        </div>
        {!patients?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No active patients</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {patients.map(p => {
              const plan = plansByPatient[p.id];
              const reviewDate = plan?.next_review_date ? new Date(plan.next_review_date + "T12:00:00") : null;
              const reviewOverdue = reviewDate && reviewDate < new Date();
              return (
                <Link key={p.id} href={`/dashboard/clients/${p.id}`}
                  className="grid grid-cols-4 gap-4 px-5 py-4 hover:bg-slate-50 transition-colors items-center">
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{p.last_name}, {p.first_name}</div>
                    <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}</div>
                  </div>
                  <div className="text-sm text-slate-600">
                    {p.date_of_birth ? new Date(p.date_of_birth + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </div>
                  <div>
                    {plan ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium capitalize">
                        {plan.status?.replace("_", " ")}
                      </span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-600 px-2.5 py-1 rounded-full font-medium">No Plan</span>
                    )}
                  </div>
                  <div className={`text-sm ${reviewOverdue ? "text-red-500 font-semibold" : "text-slate-600"}`}>
                    {reviewDate ? reviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    {reviewOverdue && " ⚠️"}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
