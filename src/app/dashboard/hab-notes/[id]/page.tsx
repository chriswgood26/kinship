import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

const SERVICE_TYPE_LABELS: Record<string, string> = {
  in_home_hab: "In-Home Habilitation",
  community_hab: "Community Habilitation",
  day_hab: "Day Habilitation",
  supported_employment: "Supported Employment",
  supported_living: "Supported Living",
  respite: "Respite",
  prevocational: "Prevocational",
  other: "Other",
};

const SERVICE_TYPE_COLORS: Record<string, string> = {
  in_home_hab: "bg-teal-100 text-teal-700",
  community_hab: "bg-emerald-100 text-emerald-700",
  day_hab: "bg-sky-100 text-sky-700",
  supported_employment: "bg-violet-100 text-violet-700",
  supported_living: "bg-blue-100 text-blue-700",
  respite: "bg-amber-100 text-amber-700",
  prevocational: "bg-orange-100 text-orange-700",
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

export default async function HabNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const { id } = await params;

  const { data: note } = await supabaseAdmin
    .from("hab_notes")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!note) notFound();

  const client = Array.isArray(note.client) ? note.client[0] : note.client;

  const docSections = [
    { label: "Service Summary", value: note.service_summary, icon: "📝" },
    { label: "Skills Practiced", value: note.skills_practiced, icon: "🎯" },
    { label: "Individual's Response", value: note.client_response, icon: "💬" },
    { label: "Progress Toward Goals", value: note.progress_toward_goals, icon: "📈" },
    { label: "Strategies Used", value: note.strategies_used, icon: "🛠️" },
    { label: "Barriers / Challenges", value: note.barriers, icon: "🔧" },
    { label: "Next Steps / Plan", value: note.next_steps, icon: "✅" },
    { label: "Follow-Up Notes", value: note.follow_up_notes, icon: "📅" },
    { label: "Setting Details", value: note.setting_details, icon: "📍" },
    { label: "Additional Notes", value: note.notes, icon: "📋" },
  ].filter(s => s.value);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/hab-notes" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">Habilitation Note</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SERVICE_TYPE_COLORS[note.service_type] || "bg-slate-100 text-slate-600"}`}>
                {SERVICE_TYPE_LABELS[note.service_type] || note.service_type}
              </span>
              {note.engagement_level && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${ENGAGEMENT_COLORS[note.engagement_level] || "bg-slate-100 text-slate-500"}`}>
                  {ENGAGEMENT_LABELS[note.engagement_level]}
                </span>
              )}
              {note.safety_concern && (
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
      {note.safety_concern && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <h3 className="font-semibold text-red-900 mb-2">🚨 Safety Concern Identified</h3>
          {note.safety_notes ? (
            <p className="text-sm text-red-800 whitespace-pre-wrap">{note.safety_notes}</p>
          ) : (
            <p className="text-sm text-red-600 italic">No safety details documented.</p>
          )}
        </div>
      )}

      {/* Service info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Service Date</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {note.service_date
                ? new Date(note.service_date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })
                : "—"}
            </dd>
          </div>
          {(note.start_time || note.end_time) && (
            <div>
              <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Time</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {note.start_time?.slice(0, 5) || "—"}
                {note.end_time && ` – ${note.end_time.slice(0, 5)}`}
                {note.duration_minutes && (
                  <span className="text-slate-400 font-normal ml-1">({note.duration_minutes} min)</span>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Location</dt>
            <dd className="font-medium text-slate-900 mt-0.5">{note.location || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Staff</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {note.staff_name}
              {note.staff_credentials && (
                <span className="text-slate-400 font-normal ml-1.5">{note.staff_credentials}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Attendance</dt>
            <dd className="font-medium text-slate-900 mt-0.5 capitalize">
              {note.attendance?.replace(/_/g, " ") || "—"}
            </dd>
          </div>
          {note.billing_code && (
            <div>
              <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Billing</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {note.billing_code}
                {note.billing_modifier && ` · ${note.billing_modifier}`}
                {` · ${note.units} unit${note.units !== 1 ? "s" : ""}`}
                {!note.is_billable && <span className="text-slate-400 ml-1">(non-billable)</span>}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Skill areas */}
      {note.skill_areas && note.skill_areas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">🎯 Skill Areas Targeted</h3>
          <div className="flex flex-wrap gap-2">
            {note.skill_areas.map((area: string) => (
              <span key={area} className="text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full font-semibold border border-teal-100">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ISP goals */}
      {note.goals_addressed && note.goals_addressed.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">🧩 ISP Goals Addressed</h3>
          <div className="flex flex-wrap gap-2">
            {note.goals_addressed.map((goal: string) => (
              <span key={goal} className="text-xs bg-violet-50 text-violet-700 px-3 py-1 rounded-full font-semibold border border-violet-100">
                {goal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Prompt levels */}
      {note.prompt_levels_used && note.prompt_levels_used.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">🤲 Prompt Levels Used</h3>
          <div className="flex flex-wrap gap-2">
            {note.prompt_levels_used.map((level: string) => (
              <span key={level} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-semibold">
                {level}
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
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Session Checklist</h3>
        <div className="space-y-2">
          {[
            { label: "Billable service", value: note.is_billable },
            { label: "Safety concern identified", value: note.safety_concern },
            { label: "Supervisor reviewed", value: note.supervisor_reviewed },
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
      {note.follow_up_date && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">📅</span>
          <div>
            <div className="font-semibold text-teal-900 text-sm">Follow-Up Planned</div>
            <div className="text-sm text-teal-700">
              {new Date(note.follow_up_date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </div>
          </div>
        </div>
      )}

      {/* Supervisor review */}
      {note.supervisor_reviewed && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <div className="font-semibold text-blue-900 text-sm">Reviewed by Supervisor</div>
            {note.supervisor_name && <div className="text-xs text-blue-700">{note.supervisor_name}</div>}
            {note.supervisor_reviewed_at && (
              <div className="text-xs text-blue-500">
                {new Date(note.supervisor_reviewed_at).toLocaleDateString("en-US")}
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
          href={`/dashboard/hab-notes/new${client ? `?client_id=${client.id}` : ""}`}
          className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400"
        >
          + New Hab Note
        </Link>
      </div>
    </div>
  );
}
