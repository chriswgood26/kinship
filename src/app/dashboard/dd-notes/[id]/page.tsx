import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const SHIFT_COLORS: Record<string, string> = {
  "Day": "bg-amber-100 text-amber-700",
  "Evening": "bg-purple-100 text-purple-700",
  "Night": "bg-blue-100 text-blue-700",
  "Awake Night": "bg-indigo-100 text-indigo-700",
};

const GOAL_PROGRESS_COLORS: Record<string, string> = {
  "Made progress": "bg-emerald-100 text-emerald-700",
  "Achieved": "bg-teal-100 text-teal-700",
  "No opportunity": "bg-slate-100 text-slate-500",
  "Did not meet": "bg-amber-100 text-amber-700",
  "Refused to participate": "bg-red-100 text-red-600",
};

export default async function DDNoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { data: note } = await supabaseAdmin
    .from("dd_progress_notes")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("id", id)
    .single();

  if (!note) notFound();

  const patient = Array.isArray(note.patient) ? note.patient[0] : note.patient;
  const goalProgress: Array<{ goal_id: string; description: string; category: string; progress: string }> = note.goal_progress || [];

  const sections = [
    { label: "Activities & Daily Schedule", value: note.activities, icon: "📅" },
    { label: "Behavioral Observations", value: note.behaviors, icon: "🧠" },
    { label: "Mood & Affect", value: note.mood_affect, icon: "💭" },
    { label: "Personal Care & ADLs", value: note.personal_care, icon: "🛁" },
    { label: "Communication", value: note.communication_notes, icon: "💬" },
    { label: "Community Integration", value: note.community_integration, icon: "🌐" },
    { label: "Medical & Health Concerns", value: note.medical_concerns, icon: "🏥" },
    { label: "Family / Guardian Contact", value: note.family_contact, icon: "👨‍👩‍👧" },
    { label: "Incidents / Critical Events", value: note.incidents, icon: "⚠️" },
  ].filter(s => s.value);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/dd-notes" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">DD Progress Note</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SHIFT_COLORS[note.shift] || "bg-slate-100 text-slate-600"}`}>{note.shift} Shift</span>
              {note.follow_up_needed && <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">⚠️ Follow-up Required</span>}
            </div>
            {patient && (
              <Link href={`/dashboard/clients/${patient.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
                {patient.last_name}, {patient.first_name}{patient.preferred_name && ` "${patient.preferred_name}"`} · MRN: {patient.mrn || "—"}
              </Link>
            )}
          </div>
        </div>
        <button onClick={() => window.print()} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 no-print">🖨️ Print</button>
      </div>

      {/* Header info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Date</dt><dd className="font-medium text-slate-900 mt-0.5">{note.note_date ? new Date(note.note_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "—"}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Staff</dt><dd className="font-medium text-slate-900 mt-0.5">{note.staff_name}<span className="text-slate-400 font-normal"> · {note.staff_role}</span></dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Location</dt><dd className="font-medium text-slate-900 mt-0.5">{note.location || "—"}</dd></div>
          {note.start_time && note.end_time && (
            <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Hours</dt><dd className="font-medium text-slate-900 mt-0.5">{note.start_time.slice(0,5)} – {note.end_time.slice(0,5)}</dd></div>
          )}
        </dl>
      </div>

      {/* Documentation sections */}
      {sections.map(section => (
        <div key={section.label} className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">{section.icon} {section.label}</h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{section.value}</p>
        </div>
      ))}

      {/* Goal progress */}
      {goalProgress.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">ISP Goal Progress</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {goalProgress.map((g, i) => (
              <div key={i} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-0.5">{g.category}</div>
                  <div className="text-sm text-slate-900">{g.description}</div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${GOAL_PROGRESS_COLORS[g.progress] || "bg-slate-100 text-slate-500"}`}>
                  {g.progress}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up */}
      {note.follow_up_needed && note.follow_up_notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-900 mb-2">⚠️ Follow-up Required</h3>
          <p className="text-sm text-amber-800">{note.follow_up_notes}</p>
        </div>
      )}

      {/* Supervisor review */}
      {note.supervisor_review && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <div className="font-semibold text-blue-900 text-sm">Reviewed by Supervisor</div>
            {note.supervisor_name && <div className="text-xs text-blue-700">{note.supervisor_name}</div>}
          </div>
        </div>
      )}

      <div className="flex gap-3 pb-4 no-print">
        <Link href={`/dashboard/clients/${note.patient_id}`} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">View Client</Link>
        <Link href="/dashboard/dd-notes/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">+ New Note</Link>
      </div>
    </div>
  );
}
