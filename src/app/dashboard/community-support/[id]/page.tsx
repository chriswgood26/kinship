import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";

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

export default async function CommunitySupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;

  const { data: activity } = await supabaseAdmin
    .from("community_support_activities")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("id", id)
    .single();

  if (!activity) notFound();

  const client = Array.isArray(activity.client) ? activity.client[0] : activity.client;

  const docSections = [
    { label: "Activity Summary", value: activity.activity_summary, icon: "📝" },
    { label: "Client Response", value: activity.client_response, icon: "💬" },
    { label: "Progress Notes", value: activity.progress_notes, icon: "📈" },
    { label: "Barriers Identified", value: activity.barriers_identified, icon: "🔧" },
    { label: "Resources Connected / Services Accessed", value: activity.resources_connected, icon: "🔗" },
    { label: "Collateral Contacts", value: activity.collateral_contacts, icon: "📞" },
    { label: "Action Steps / Follow-Up Tasks", value: activity.action_steps, icon: "✅" },
    { label: "Follow-Up Notes", value: activity.follow_up_notes, icon: "📅" },
    { label: "Setting / Location Details", value: activity.setting, icon: "📍" },
    { label: "Additional Notes", value: activity.notes, icon: "📋" },
  ].filter(s => s.value);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/community-support" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">Community Support Activity</h1>
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
            </div>
            {client && (
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block"
              >
                {client.last_name}, {client.first_name}
                {client.preferred_name && ` "${client.preferred_name}"`} · MRN: {client.mrn || "—"}
              </Link>
            )}
          </div>
        </div>
        <button
          onClick={() => { if (typeof window !== "undefined") window.print(); }}
          className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 no-print"
        >
          🖨️ Print
        </button>
      </div>

      {/* Safety concern banner */}
      {activity.safety_concern && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-semibold text-red-900 mb-2">🚨 Safety Concern Identified</h3>
          {activity.safety_notes ? (
            <p className="text-sm text-red-800 whitespace-pre-wrap">{activity.safety_notes}</p>
          ) : (
            <p className="text-sm text-red-600 italic">No safety details documented.</p>
          )}
        </div>
      )}

      {/* Activity info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Date</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {activity.activity_date
                ? new Date(activity.activity_date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
          {(activity.start_time || activity.end_time) && (
            <div>
              <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Time</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {activity.start_time?.slice(0, 5) || "—"}
                {activity.end_time && ` – ${activity.end_time.slice(0, 5)}`}
                {activity.duration_minutes && <span className="text-slate-400 font-normal ml-1">({activity.duration_minutes} min)</span>}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Location</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{activity.location || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Staff</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {activity.staff_name}
              {activity.staff_credentials && (
                <span className="text-slate-400 font-normal ml-1.5">{activity.staff_credentials}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Attendance</dt>
            <dd className="font-medium text-slate-900 mt-0.5 capitalize">{activity.attendance?.replace("_", " ") || "—"}</dd>
          </div>
          {activity.billing_code && (
            <div>
              <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Billing</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {activity.billing_code}
                {activity.billing_modifier && ` · ${activity.billing_modifier}`}
                {` · ${activity.units} unit${activity.units !== 1 ? "s" : ""}`}
                {!activity.is_billable && <span className="text-slate-400 ml-1">(non-billable)</span>}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Goals addressed */}
      {activity.goals_addressed && activity.goals_addressed.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">🎯 Goals / Areas Addressed</h3>
          <div className="flex flex-wrap gap-2">
            {activity.goals_addressed.map((goal: string) => (
              <span key={goal} className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-semibold border border-teal-100">
                {goal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Documentation sections */}
      {docSections.map(section => (
        <div key={section.label} className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">{section.icon} {section.label}</h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{section.value}</p>
        </div>
      ))}

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Activity Checklist</h3>
        <div className="space-y-2">
          {[
            { label: "Billable activity", value: activity.is_billable },
            { label: "Safety concern identified", value: activity.safety_concern },
            { label: "Supervisor reviewed", value: activity.supervisor_reviewed },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2.5 text-sm">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                item.value ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
              }`}>
                {item.value ? "✓" : "—"}
              </span>
              <span className={item.value ? "text-slate-900" : "text-slate-400"}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-up */}
      {activity.follow_up_date && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">📅</span>
          <div>
            <div className="font-semibold text-teal-900 text-sm">Follow-Up Planned</div>
            <div className="text-sm text-teal-700">
              {new Date(activity.follow_up_date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </div>
          </div>
        </div>
      )}

      {/* Supervisor review */}
      {activity.supervisor_reviewed && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <div className="font-semibold text-blue-900 text-sm">Reviewed by Supervisor</div>
            {activity.supervisor_name && <div className="text-xs text-blue-700">{activity.supervisor_name}</div>}
            {activity.supervisor_reviewed_at && (
              <div className="text-xs text-blue-500">
                {new Date(activity.supervisor_reviewed_at).toLocaleDateString("en-US")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex gap-3 pb-4 no-print">
        {client && (
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50"
          >
            View Client
          </Link>
        )}
        <Link
          href={`/dashboard/community-support/new${client ? `?client_id=${client.id}` : ""}`}
          className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400"
        >
          + New Activity
        </Link>
      </div>
    </div>
  );
}
