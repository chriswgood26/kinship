import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const OBJ_STATUS_COLOR: Record<string, string> = {
  not_started: "bg-slate-100 text-slate-400",
  in_progress: "bg-blue-100 text-blue-700",
  achieved: "bg-emerald-100 text-emerald-700",
  discontinued: "bg-red-100 text-red-400",
};

const OBJ_STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress 🔄",
  achieved: "Achieved ✓",
  discontinued: "Discontinued",
};

export default async function PortalTreatmentPlanPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users").select("*").eq("clerk_user_id", user.id).single();
  if (!portalUser || !portalUser.access_settings?.treatment_plan) redirect("/portal/dashboard");

  const { data: plan } = await supabaseAdmin
    .from("treatment_plans")
    .select("presenting_problem, strengths, level_of_care, next_review_date, goals, status")
    .eq("client_id", portalUser.client_id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!plan) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-slate-900">My Care Plan</h1>
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-slate-900">No active care plan</p>
          <p className="text-slate-400 text-sm mt-1">Your care team will create a plan with you</p>
        </div>
      </div>
    );
  }

  const goals = plan.goals || [];
  const totalGoals = goals.length;
  const achievedGoals = goals.filter((g: {objectives?: {status: string}[]}) =>
    g.objectives?.every((o: {status: string}) => o.status === "achieved")
  ).length;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">My Care Plan</h1>

      {/* Overview */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-lg">Your Treatment Goals</div>
          <div className="text-right">
            <div className="text-3xl font-bold">{achievedGoals}<span className="text-teal-200 text-lg">/{totalGoals}</span></div>
            <div className="text-teal-200 text-xs">goals achieved</div>
          </div>
        </div>
        <div className="bg-white/20 rounded-full h-2 overflow-hidden">
          <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0}%` }} />
        </div>
        {plan.level_of_care && <div className="text-teal-100 text-xs mt-2">Level of care: {plan.level_of_care}</div>}
        {plan.next_review_date && (
          <div className="text-teal-100 text-xs mt-0.5">
            Next review: {new Date(plan.next_review_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </div>
        )}
      </div>

      {/* Strengths */}
      {plan.strengths && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-2">⭐ Your Strengths</h2>
          <p className="text-sm text-slate-700 leading-relaxed">{plan.strengths}</p>
        </div>
      )}

      {/* Goals — plain language, patient-facing */}
      <div className="space-y-3">
        <h2 className="font-semibold text-slate-900">Your Goals</h2>
        {goals.map((goal: {id: string; description: string; objectives?: {id: string; description: string; status: string}[]}, i: number) => {
          const objectives = goal.objectives || [];
          const achieved = objectives.filter(o => o.status === "achieved").length;
          return (
            <div key={goal.id || i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-start gap-3 px-5 py-4 bg-slate-50 border-b border-slate-100">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${achieved === objectives.length && objectives.length > 0 ? "bg-emerald-500 text-white" : "bg-teal-500 text-white"}`}>
                  {achieved === objectives.length && objectives.length > 0 ? "✓" : i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{goal.description}</p>
                  {objectives.length > 0 && (
                    <div className="text-xs text-slate-400 mt-0.5">{achieved}/{objectives.length} steps complete</div>
                  )}
                </div>
              </div>
              {objectives.length > 0 && (
                <div className="divide-y divide-slate-50">
                  {objectives.map((obj, oi) => (
                    <div key={obj.id || oi} className="flex items-center gap-3 px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${OBJ_STATUS_COLOR[obj.status] || OBJ_STATUS_COLOR.not_started}`}>
                        {OBJ_STATUS_LABEL[obj.status] || "Not started"}
                      </span>
                      <span className="text-sm text-slate-700">{obj.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-500 text-center">
        Your care plan is developed collaboratively with your care team. Talk to your provider if you have questions about your goals.
      </div>
    </div>
  );
}
