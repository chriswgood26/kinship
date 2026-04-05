import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  case_management: "Case Management",
  community_integration: "Community Integration",
  natural_supports: "Natural Supports",
  transportation: "Transportation",
  housing_support: "Housing Support",
  employment_support: "Employment Support",
  benefits_assistance: "Benefits Assistance",
  food_access: "Food Access",
  social_skills: "Social Skills",
  independent_living: "Independent Living",
  family_support: "Family Support",
  crisis_intervention: "Crisis Intervention",
  other: "Other",
};

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  case_management: "bg-teal-100 text-teal-700",
  community_integration: "bg-emerald-100 text-emerald-700",
  natural_supports: "bg-green-100 text-green-700",
  transportation: "bg-sky-100 text-sky-700",
  housing_support: "bg-blue-100 text-blue-700",
  employment_support: "bg-violet-100 text-violet-700",
  benefits_assistance: "bg-amber-100 text-amber-700",
  food_access: "bg-orange-100 text-orange-700",
  social_skills: "bg-pink-100 text-pink-700",
  independent_living: "bg-indigo-100 text-indigo-700",
  family_support: "bg-rose-100 text-rose-700",
  crisis_intervention: "bg-red-100 text-red-700",
  other: "bg-slate-100 text-slate-600",
};

const ENGAGEMENT_LABELS: Record<string, string> = {
  fully_engaged: "Fully Engaged",
  partially_engaged: "Partially Engaged",
  minimal_engagement: "Minimal Engagement",
  refused: "Refused",
};

const ENGAGEMENT_COLORS: Record<string, string> = {
  fully_engaged: "bg-emerald-100 text-emerald-700",
  partially_engaged: "bg-amber-100 text-amber-700",
  minimal_engagement: "bg-orange-100 text-orange-700",
  refused: "bg-red-100 text-red-600",
};

export default async function CommunitySupportPage({
  searchParams,
}: { searchParams: Promise<{ client_id?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = profile?.organization_id;
  if (!orgId) redirect("/sign-in");

  const params = await searchParams;
  const clientFilter = params.client_id || "";

  let query = supabaseAdmin
    .from("community_support_activities")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("activity_date", { ascending: false })
    .limit(50);

  if (clientFilter) query = query.eq("client_id", clientFilter);

  const { data: activities } = await query;

  const safetyConcernCount = activities?.filter(a => a.safety_concern).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Community Support Services</h1>
          <p className="text-slate-500 text-sm mt-0.5">Community-based support activity documentation</p>
        </div>
        <Link
          href="/dashboard/community-support/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm"
        >
          + New Activity
        </Link>
      </div>

      {safetyConcernCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <span className="text-sm text-red-800 font-medium">
            {safetyConcernCount} activit{safetyConcernCount > 1 ? "ies" : "y"} with safety concerns — review required
          </span>
        </div>
      )}

      {/* Summary stats */}
      {activities && activities.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{activities.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Total Activities</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-teal-600">
              {activities.filter(a => a.activity_type === "case_management").length}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Case Management</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {activities.filter(a => a.activity_type === "community_integration").length}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Community Integration</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">
              {activities.filter(a => a.supervisor_reviewed).length}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Supervisor Reviewed</div>
          </div>
        </div>
      )}

      {/* Activity list */}
      {!activities?.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">🏘️</div>
          <p className="font-semibold text-slate-900 mb-1">No community support activities yet</p>
          <p className="text-slate-400 text-sm mb-4">Document case management, community integration, and other community-based support services</p>
          <Link
            href="/dashboard/community-support/new"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block"
          >
            + New Activity
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(activity => {
            const client = Array.isArray(activity.client) ? activity.client[0] : activity.client;
            return (
              <Link
                key={activity.id}
                href={`/dashboard/community-support/${activity.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-teal-300 hover:shadow-sm transition-all no-underline block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                      {client?.first_name?.[0]}{client?.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {client ? `${client.last_name}, ${client.first_name}` : "—"}
                        {client?.preferred_name && (
                          <span className="text-slate-400 font-normal ml-1.5 text-sm">"{client.preferred_name}"</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">MRN: {client?.mrn || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ACTIVITY_TYPE_COLORS[activity.activity_type] || "bg-slate-100 text-slate-600"}`}>
                      {ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}
                    </span>
                    {activity.engagement_level && (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ENGAGEMENT_COLORS[activity.engagement_level] || "bg-slate-100 text-slate-500"}`}>
                        {ENGAGEMENT_LABELS[activity.engagement_level]}
                      </span>
                    )}
                    {activity.safety_concern && (
                      <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">🚨 Safety Concern</span>
                    )}
                    {activity.supervisor_reviewed && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">✓ Reviewed</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">Date: </span>
                    <span className="text-slate-900">
                      {activity.activity_date
                        ? new Date(activity.activity_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Staff: </span>
                    <span className="text-slate-900">{activity.staff_name}</span>
                    {activity.staff_credentials && (
                      <span className="text-slate-400"> · {activity.staff_credentials}</span>
                    )}
                  </div>
                  {activity.duration_minutes && (
                    <div>
                      <span className="font-medium text-slate-600">Duration: </span>
                      <span className="text-slate-900">{activity.duration_minutes} min</span>
                    </div>
                  )}
                </div>
                {activity.activity_summary && (
                  <div className="mt-2 text-sm text-slate-600 line-clamp-2">
                    <span className="font-medium">Summary: </span>{activity.activity_summary}
                  </div>
                )}
                {activity.goals_addressed && activity.goals_addressed.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {activity.goals_addressed.slice(0, 4).map((goal: string) => (
                      <span key={goal} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {goal}
                      </span>
                    ))}
                    {activity.goals_addressed.length > 4 && (
                      <span className="text-xs text-slate-400">+{activity.goals_addressed.length - 4} more</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
