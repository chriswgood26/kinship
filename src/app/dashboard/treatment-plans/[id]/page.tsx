import Link from "next/link";
import GoalStatusUpdater from "@/components/GoalStatusUpdater";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  review_due: "bg-amber-100 text-amber-700",
  completed: "bg-blue-100 text-blue-700",
  discontinued: "bg-red-100 text-red-600",
};

const OBJ_STATUS: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-500",
  in_progress: "bg-blue-100 text-blue-700",
  achieved: "bg-emerald-100 text-emerald-700",
  discontinued: "bg-red-100 text-red-500",
};

export default async function TreatmentPlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { data: plan } = await supabaseAdmin
    .from("treatment_plans")
    .select("*, client:client_id(first_name, last_name, mrn, date_of_birth)")
    .eq("id", id)
    .single();

  if (!plan) notFound();

  const patient = Array.isArray(plan.patient) ? plan.patient[0] : plan.patient;
  const goals = plan.goals || [];
  const reviewDate = plan.next_review_date ? new Date(plan.next_review_date + "T12:00:00") : null;
  const isOverdue = reviewDate && reviewDate < new Date();

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/treatment-plans" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Treatment Plan</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Link href={`/dashboard/clients/${plan.patient_id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">
                {patient ? `${patient.last_name}, ${patient.first_name}` : "Unknown"}
              </Link>
              {patient?.mrn && <span className="text-slate-400 text-xs">MRN: {patient.mrn}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>
            {plan.status?.replace("_", " ")}
          </span>
          <Link href={`/dashboard/treatment-plans/${id}/edit`}
            className="text-sm font-medium text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
            Edit
          </Link>
        </div>
      </div>

      {/* Plan info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Start Date</div>
            <div className="text-slate-900 font-medium">
              {plan.plan_start_date ? new Date(plan.plan_start_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Next Review</div>
            <div className={`font-medium ${isOverdue ? "text-red-500" : "text-slate-900"}`}>
              {reviewDate ? reviewDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
              {isOverdue && " ⚠️ Overdue"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Level of Care</div>
            <div className="text-slate-900 font-medium">{plan.level_of_care || "—"}</div>
          </div>
        </div>

        {plan.diagnosis_codes?.length > 0 && (
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Diagnoses</div>
            <div className="flex flex-wrap gap-2">
              {plan.diagnosis_codes.map((code: string) => (
                <span key={code} className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">{code}</span>
              ))}
            </div>
          </div>
        )}

        {plan.presenting_problem && (
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Presenting Problem</div>
            <p className="text-slate-700 text-sm leading-relaxed">{plan.presenting_problem}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {plan.strengths && (
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Strengths & Supports</div>
              <p className="text-slate-700 text-sm leading-relaxed">{plan.strengths}</p>
            </div>
          )}
          {plan.barriers && (
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Barriers</div>
              <p className="text-slate-700 text-sm leading-relaxed">{plan.barriers}</p>
            </div>
          )}
        </div>
      </div>

      {/* Goals & Objectives */}
      <div className="space-y-4">
        <h2 className="font-semibold text-slate-900 text-lg">Goals & Objectives</h2>
        {goals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            No goals recorded
          </div>
        ) : (
          <GoalStatusUpdater planId={id} goals={goals} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pb-6">
        <Link href={`/dashboard/encounters/new?patient_id=${plan.patient_id}`}
          className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
          Start Encounter
        </Link>
        <button className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
          Print Plan
        </button>
      </div>
    </div>
  );
}
