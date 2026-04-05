import Link from "next/link";
import DDNotesFilters from "./DDNotesFilters";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SHIFT_COLORS: Record<string, string> = {
  "Day": "bg-amber-100 text-amber-700",
  "Evening": "bg-purple-100 text-purple-700",
  "Night": "bg-blue-100 text-blue-700",
  "Awake Night": "bg-indigo-100 text-indigo-700",
  "Split": "bg-slate-100 text-slate-600",
};

export default async function DDNotesPage({
  searchParams,
}: { searchParams: Promise<{ patient_id?: string; client_id?: string; date?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");


  const params = await searchParams;
  const today = new Date().toISOString().split("T")[0];
  const dateFilter = params.date || today;
  const patientFilter = params.client_id || "";

  let query = supabaseAdmin
    .from("dd_progress_notes")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .eq("note_date", dateFilter)
    .order("created_at", { ascending: false });

  if (patientFilter) query = query.eq("client_id", patientFilter);

  const { data: notes } = await query;

  const { data: patients } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, mrn, preferred_name")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("last_name");

  const followUpNeeded = notes?.filter(n => n.follow_up_needed).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">DD Progress Notes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Daily shift documentation for residential and day programs</p>
        </div>
        <Link href="/dashboard/dd-notes/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New Progress Note
        </Link>
      </div>

      {followUpNeeded > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-amber-800 font-medium">{followUpNeeded} note{followUpNeeded > 1 ? "s require" : " requires"} follow-up action</span>
        </div>
      )}

      {/* Date nav + filters */}
      <DDNotesFilters dateFilter={dateFilter} patientFilter={patientFilter} today={today} patients={patients || []} />

      {/* Notes list */}
      {!notes?.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">📝</div>
          <p className="font-semibold text-slate-900 mb-1">No progress notes for {new Date(dateFilter + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <Link href="/dashboard/dd-notes/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block mt-3">
            + Write Progress Note
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => {
            const patient = Array.isArray(note.patient) ? note.patient[0] : note.patient;
            return (
              <Link key={note.id} href={`/dashboard/dd-notes/${note.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-teal-300 hover:shadow-sm transition-all no-underline block">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                      {patient?.first_name?.[0]}{patient?.last_name?.[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}
                        {patient?.preferred_name && <span className="text-slate-400 font-normal ml-1.5 text-sm">"{patient.preferred_name}"</span>}
                      </div>
                      <div className="text-xs text-slate-400">MRN: {patient?.mrn || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${SHIFT_COLORS[note.shift] || "bg-slate-100 text-slate-600"}`}>{note.shift} Shift</span>
                    {note.follow_up_needed && <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">⚠️ Follow-up</span>}
                    {note.supervisor_review && <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-semibold">✓ Reviewed</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="font-medium text-slate-600">Staff:</span> <span className="text-slate-900">{note.staff_name}</span>{note.staff_role && <span className="text-slate-400"> · {note.staff_role}</span>}</div>
                  {note.location && <div><span className="font-medium text-slate-600">Location:</span> <span className="text-slate-900">{note.location}</span></div>}
                  {note.start_time && note.end_time && <div><span className="font-medium text-slate-600">Hours:</span> <span className="text-slate-900">{note.start_time.slice(0,5)} – {note.end_time.slice(0,5)}</span></div>}
                </div>
                {note.activities && (
                  <div className="mt-2 text-sm text-slate-600 line-clamp-2">
                    <span className="font-medium">Activities:</span> {note.activities}
                  </div>
                )}
                {note.behaviors && (
                  <div className="mt-1 text-sm text-slate-600 line-clamp-1">
                    <span className="font-medium">Behaviors:</span> {note.behaviors}
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
