import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TreatmentPlansPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin.from("user_profiles").select("organization_id").eq("clerk_user_id", user.id).single();

  const { data: plans } = await supabaseAdmin
    .from("treatment_plans")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", profile?.organization_id || "")
    .order("next_review_date", { ascending: true })
    .limit(50);

  const today = new Date().toISOString().split("T")[0];
  const overdueCount = plans?.filter(p => p.next_review_date && p.next_review_date <= today && p.status === "active").length || 0;

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    draft: "bg-slate-100 text-slate-600",
    completed: "bg-blue-100 text-blue-700",
    discontinued: "bg-red-100 text-red-500",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Treatment Plans</h1>
          <p className="text-slate-500 text-sm mt-0.5">Person-centered care planning</p>
        </div>
        <Link href="/dashboard/treatment-plans/new" className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 text-sm">
          + New Plan
        </Link>
      </div>

      {overdueCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-amber-800 font-medium">{overdueCount} treatment plan{overdueCount > 1 ? "s are" : " is"} past review date</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!plans?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-slate-900 mb-1">No treatment plans yet</p>
            <Link href="/dashboard/treatment-plans/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block mt-3">+ Create First Plan</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {plans.map(plan => {
              const client = Array.isArray(plan.client) ? plan.client[0] : plan.client;
              const reviewDate = plan.next_review_date ? new Date(plan.next_review_date + "T12:00:00") : null;
              const isOverdue = reviewDate && reviewDate < new Date();
              return (
                <Link key={plan.id} href={`/dashboard/treatment-plans/${plan.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 no-underline">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900 text-sm">{client ? `${client.last_name}, ${client.first_name}` : "—"}</div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{plan.presenting_problem || "No presenting problem recorded"}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {reviewDate && (
                      <div className={`text-xs mb-1 ${isOverdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                        Review: {reviewDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {isOverdue && " ⚠️"}
                      </div>
                    )}
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[plan.status] || STATUS_COLORS.draft}`}>{plan.status}</span>
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
