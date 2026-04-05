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
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");

  const [{ data: patients }, { data: plans }, { data: clinicians }] = await Promise.all([
    supabaseAdmin
      .from("clients")
      .select("id, mrn, first_name, last_name, date_of_birth, status, primary_clinician_id, primary_clinician_name")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("last_name"),
    supabaseAdmin
      .from("treatment_plans")
      .select("client_id, status, next_review_date")
      .eq("organization_id", orgId),
    supabaseAdmin
      .from("user_profiles")
      .select("id, first_name, last_name, credentials, role, roles")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("last_name"),
  ]);

  const plansByPatient: Record<string, { status: string; next_review_date?: string }> = {};
  plans?.forEach(p => { plansByPatient[p.client_id] = p; });

  const reviewDue = plans?.filter(p => {
    if (!p.next_review_date) return false;
    return new Date(p.next_review_date + "T12:00:00") < new Date();
  }).length || 0;

  const withPlan = patients?.filter(p => plansByPatient[p.id]).length || 0;
  const withoutPlan = (patients?.length || 0) - withPlan;

  // Build per-clinician breakdown
  const clinicianMap: Record<string, { name: string; count: number; withPlan: number; withoutPlan: number; reviewDue: number }> = {};
  const clinicianRoleSet = new Set(
    (clinicians || [])
      .filter(c => (c.roles || [c.role]).some((r: string) => ["clinician", "supervisor", "care_coordinator"].includes(r)))
      .map(c => c.id)
  );

  for (const p of patients || []) {
    const cId = p.primary_clinician_id || "__unassigned__";
    if (!clinicianMap[cId]) {
      const clin = (clinicians || []).find(c => c.id === cId);
      clinicianMap[cId] = {
        name: cId === "__unassigned__" ? "Unassigned" : p.primary_clinician_name || (clin ? `${clin.last_name}, ${clin.first_name}` : "Unknown"),
        count: 0, withPlan: 0, withoutPlan: 0, reviewDue: 0,
      };
    }
    clinicianMap[cId].count++;
    const plan = plansByPatient[p.id];
    if (plan) {
      clinicianMap[cId].withPlan++;
      if (plan.next_review_date && new Date(plan.next_review_date + "T12:00:00") < new Date()) {
        clinicianMap[cId].reviewDue++;
      }
    } else {
      clinicianMap[cId].withoutPlan++;
    }
  }

  const clinicianBreakdown = Object.entries(clinicianMap)
    .sort((a, b) => {
      if (a[0] === "__unassigned__") return 1;
      if (b[0] === "__unassigned__") return -1;
      return b[1].count - a[1].count;
    });

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Active Caseload</h1>
            <p className="text-slate-500 text-sm mt-0.5">All active patients and treatment plan status by clinician</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/caseload" className="border border-teal-200 text-teal-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-50 transition-colors">
            ⚖️ Manage Caseloads
          </Link>
          <ReportActions reportTitle="Active Caseload Report" />
        </div>
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

      {/* Per-clinician breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Panel by Clinician</span>
          <span className="text-xs text-slate-400">{clinicianBreakdown.length} clinicians</span>
        </div>
        <div className="divide-y divide-slate-50">
          {clinicianBreakdown.map(([cId, data]) => (
            <div key={cId} className="grid grid-cols-5 gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors">
              <div className="col-span-2 font-semibold text-sm text-slate-900">
                {cId === "__unassigned__" ? (
                  <span className="text-amber-600">⚠️ Unassigned</span>
                ) : data.name}
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-slate-900">{data.count}</div>
                <div className="text-xs text-slate-400">Total</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-emerald-600">{data.withPlan}</div>
                <div className="text-xs text-slate-400">With plan</div>
              </div>
              <div className="text-center">
                <div className={`text-sm font-semibold ${data.reviewDue > 0 ? "text-red-500" : "text-slate-400"}`}>{data.reviewDue}</div>
                <div className="text-xs text-slate-400">Reviews due</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full patient list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-5 gap-4">
          <span className="col-span-2">Patient</span><span>Clinician</span><span>Treatment Plan</span><span>Next Review</span>
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
                  className="grid grid-cols-5 gap-4 px-5 py-4 hover:bg-slate-50 transition-colors items-center">
                  <div className="col-span-2">
                    <div className="font-semibold text-sm text-slate-900">{p.last_name}, {p.first_name}</div>
                    <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}</div>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {p.primary_clinician_name ? (
                      <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{p.primary_clinician_name}</span>
                    ) : <span className="text-slate-300">—</span>}
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
