import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const SESSION_TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  group: "Group",
  phone: "Phone",
  telehealth: "Telehealth",
  text_outreach: "Text Outreach",
  community: "Community",
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  individual: "bg-teal-100 text-teal-700",
  group: "bg-violet-100 text-violet-700",
  phone: "bg-blue-100 text-blue-700",
  telehealth: "bg-sky-100 text-sky-700",
  text_outreach: "bg-amber-100 text-amber-700",
  community: "bg-emerald-100 text-emerald-700",
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

export default async function PeerSupportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;

  const { data: session } = await supabaseAdmin
    .from("peer_support_sessions")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("id", id)
    .single();

  if (!session) notFound();

  const client = Array.isArray(session.client) ? session.client[0] : session.client;

  const docSections = [
    { label: "Session Summary", value: session.session_summary, icon: "📝" },
    { label: "Recovery Goals Addressed", value: session.recovery_goals_addressed, icon: "🎯" },
    { label: "Strengths Identified", value: session.strengths_identified, icon: "💪" },
    { label: "Barriers Addressed", value: session.barriers_addressed, icon: "🔧" },
    { label: "Lived Experience Notes", value: session.lived_experience_notes, icon: "🤝" },
    { label: "Referrals / Linkages Made", value: session.referrals_made, icon: "🔗" },
    { label: "Next Session Notes", value: session.next_session_notes, icon: "📅" },
    { label: "Additional Notes", value: session.notes, icon: "📋" },
  ].filter(s => s.value);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/peer-support" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">Peer Support Session</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SESSION_TYPE_COLORS[session.session_type] || "bg-slate-100 text-slate-600"}`}>
                {SESSION_TYPE_LABELS[session.session_type] || session.session_type}
              </span>
              {session.engagement_level && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ENGAGEMENT_COLORS[session.engagement_level] || "bg-slate-100 text-slate-500"}`}>
                  {ENGAGEMENT_LABELS[session.engagement_level]}
                </span>
              )}
              {session.crisis_indicated && (
                <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">🚨 Crisis Indicated</span>
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

      {/* Crisis banner */}
      {session.crisis_indicated && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-semibold text-red-900 mb-2">🚨 Crisis / Safety Concern Indicated</h3>
          {session.crisis_response_taken ? (
            <p className="text-sm text-red-800 whitespace-pre-wrap">{session.crisis_response_taken}</p>
          ) : (
            <p className="text-sm text-red-600 italic">No crisis response details documented.</p>
          )}
        </div>
      )}

      {/* Session info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Date</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {session.session_date
                ? new Date(session.session_date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
          {(session.start_time || session.end_time) && (
            <div>
              <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Time</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {session.start_time?.slice(0, 5) || "—"}
                {session.end_time && ` – ${session.end_time.slice(0, 5)}`}
                {session.duration_minutes && <span className="text-slate-400 font-normal ml-1">({session.duration_minutes} min)</span>}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Location</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{session.location || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Peer Specialist</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {session.specialist_name}
              {session.specialist_credentials && (
                <span className="text-slate-400 font-normal ml-1.5">{session.specialist_credentials}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Billing</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {session.billing_code}
              {session.billing_modifier && ` · ${session.billing_modifier}`}
              {` · ${session.units} unit${session.units !== 1 ? "s" : ""}`}
              {!session.is_billable && <span className="text-slate-400 ml-1">(non-billable)</span>}
            </dd>
          </div>
        </dl>
      </div>

      {/* Session focus */}
      {session.session_focus && session.session_focus.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">🎯 Session Focus Areas</h3>
          <div className="flex flex-wrap gap-2">
            {session.session_focus.map((area: string) => (
              <span key={area} className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-semibold border border-teal-100">
                {area}
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

      {/* Checkboxes summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Compliance Checklist</h3>
        <div className="space-y-2">
          {[
            { label: "Safety check completed", value: session.safety_check_completed },
            { label: "Wellness / WRAP plan reviewed", value: session.wellness_plan_reviewed },
            { label: "Peer specialist shared lived experience", value: session.lived_experience_shared },
            { label: "Billable session", value: session.is_billable },
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

      {/* Next session */}
      {session.next_session_planned && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">📅</span>
          <div>
            <div className="font-semibold text-teal-900 text-sm">Next Session Planned</div>
            <div className="text-sm text-teal-700">
              {new Date(session.next_session_planned + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </div>
          </div>
        </div>
      )}

      {/* Supervisor review */}
      {session.supervisor_reviewed && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <div className="font-semibold text-blue-900 text-sm">Reviewed by Supervisor</div>
            {session.supervisor_name && <div className="text-xs text-blue-700">{session.supervisor_name}</div>}
            {session.supervisor_reviewed_at && (
              <div className="text-xs text-blue-500">
                {new Date(session.supervisor_reviewed_at).toLocaleDateString("en-US")}
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
          href={`/dashboard/peer-support/new${client ? `?client_id=${client.id}` : ""}`}
          className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400"
        >
          + New Session
        </Link>
      </div>
    </div>
  );
}
