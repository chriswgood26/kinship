import Link from "next/link";
import SearchInput from '@/components/SearchInput';
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AssessmentsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");


  const { data: screenings } = await supabaseAdmin
    .from("screenings")
    .select("*, client:client_id(id, first_name, last_name, mrn)")
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: assessments } = await supabaseAdmin
    .from("assessments")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("assessment_date", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assessments</h1>
          <p className="text-slate-500 text-sm mt-0.5">Standardized clinical assessments</p>
        </div>
        <Link href="/dashboard/assessments/imcans/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New IM+CANS
        </Link>
      </div>

      {/* Assessment types */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/dashboard/assessments/imcans/new"
          className="bg-white border-2 border-teal-200 rounded-2xl p-5 hover:border-teal-400 hover:shadow-sm transition-all">
          <div className="text-3xl mb-2">🧠</div>
          <div className="font-bold text-slate-900">IM+CANS</div>
          <div className="text-xs text-slate-500 mt-0.5">Illinois Integrated Assessment — Child & Adolescent</div>
          <div className="text-xs text-teal-600 font-semibold mt-2">Start Assessment →</div>
        </Link>
        <Link href="/dashboard/assessments/cumha/new"
            className="bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-300 p-5 text-left transition-all hover:shadow-sm">
            <div className="text-3xl mb-3">👶</div>
            <div className="font-bold text-slate-900">CUMHA</div>
            <div className="text-sm text-slate-500 mt-1">Children's Uniform Mental Health Assessment — Oregon OHA required for youth behavioral health services; 12 sections</div>
            <div className="mt-3 text-xs text-teal-600 font-semibold">Youth Assessment · Oregon</div>
          </Link>
          <Link href="/dashboard/assessments/bps/new"
            className="bg-white rounded-2xl border-2 border-slate-200 hover:border-teal-300 p-5 text-left transition-all hover:shadow-sm">
            <div className="text-3xl mb-3">📋</div>
            <div className="font-bold text-slate-900">Biopsychosocial Assessment (BPS)</div>
            <div className="text-sm text-slate-500 mt-1">Comprehensive intake assessment — 10 sections covering presenting problem, history, risk, and diagnostic impression</div>
            <div className="mt-3 text-xs text-teal-600 font-semibold">Intake Assessment</div>
          </Link>
          <Link href="/dashboard/assessments/psych-eval/new"
            className="bg-white rounded-2xl border-2 border-indigo-200 hover:border-indigo-400 p-5 text-left transition-all hover:shadow-sm">
            <div className="text-3xl mb-3">🔍</div>
            <div className="font-bold text-slate-900">Psychiatric Evaluation</div>
            <div className="text-sm text-slate-500 mt-1">Full psychiatric diagnostic evaluation — 11 sections including HPI, MSE, risk assessment, formulation, and treatment plan</div>
            <div className="mt-3 text-xs text-indigo-600 font-semibold">Psychiatric Evaluation</div>
          </Link>
          <Link href="/dashboard/assessments/screenings/phq9/new"
          className="bg-white border-2 border-blue-200 rounded-2xl p-5 hover:border-blue-400 hover:shadow-sm transition-all">
          <div className="text-3xl mb-2">🔵</div>
          <div className="font-bold text-slate-900">PHQ-9</div>
          <div className="text-xs text-slate-500 mt-0.5">Patient Health Questionnaire — Depression</div>
          <div className="text-xs text-blue-600 font-semibold mt-2">Start Assessment →</div>
        </Link>
        <Link href="/dashboard/assessments/screenings/gad7/new"
          className="bg-white border-2 border-purple-200 rounded-2xl p-5 hover:border-purple-400 hover:shadow-sm transition-all">
          <div className="text-3xl mb-2">🟣</div>
          <div className="font-bold text-slate-900">GAD-7</div>
          <div className="text-xs text-slate-500 mt-0.5">Generalized Anxiety Disorder Screener</div>
          <div className="text-xs text-purple-600 font-semibold mt-2">Start Assessment →</div>
        </Link>
        <Link href="/dashboard/assessments/screenings/cssrs/new"
          className="bg-white border-2 border-red-200 rounded-2xl p-5 hover:border-red-400 hover:shadow-sm transition-all">
          <div className="text-3xl mb-2">🔴</div>
          <div className="font-bold text-slate-900">C-SSRS</div>
          <div className="text-xs text-slate-500 mt-0.5">Columbia Suicide Severity Rating Scale</div>
          <div className="text-xs text-red-600 font-semibold mt-2">Start Assessment →</div>
        </Link>
      </div>

      {/* Past assessments */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Assessment History</h2>
        </div>
        {!assessments?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">No assessments completed yet</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {assessments.map(a => {
              const patient = Array.isArray(a.patient) ? a.patient[0] : a.patient;
              return (
                <Link key={a.id} href={
                  a.assessment_type === "BPS" ? `/dashboard/assessments/bps/${a.id}` :
                  a.assessment_type === "CUMHA" ? `/dashboard/assessments/cumha/${a.id}` :
                  a.assessment_type === "Psych Eval" ? `/dashboard/assessments/psych-eval/${a.id}` :
                  `/dashboard/assessments/imcans/${a.id}`
                }
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors no-underline">
                  <div className="text-2xl">🧠</div>
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 text-sm">{a.assessment_type} — {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
                    <div className="text-xs text-slate-400">{a.assessment_date ? new Date(a.assessment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} · {a.assessor_name || "Assessor unknown"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900">{a.total_score || 0}</div>
                    <div className="text-xs text-slate-400">total score</div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {a.status === "completed" ? "Complete" : "Draft"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
