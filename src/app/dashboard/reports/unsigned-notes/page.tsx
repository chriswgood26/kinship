import Link from "next/link";
import ReportActions from "@/components/ReportActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function UnsignedNotesReportPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: notes } = await supabaseAdmin
    .from("clinical_notes")
    .select("*, encounter:encounter_id(encounter_date, encounter_type, client:client_id(first_name, last_name, mrn, preferred_name))")
    .eq("is_signed", false)
    .order("created_at", { ascending: true })
    .limit(100);

  const overdue = notes?.filter(n => {
    const created = new Date(n.created_at);
    const hours = (Date.now() - created.getTime()) / 3600000;
    return hours > 24;
  }) || [];

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Unsigned Notes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Notes pending provider signature</p>
        </div>
      </div>
        <ReportActions reportTitle="Unsigned Notes Report" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="text-3xl font-bold text-slate-900">{notes?.length || 0}</div>
          <div className="text-sm text-slate-500 mt-0.5">Total Unsigned</div>
        </div>
        <div className={`${overdue.length > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200"} border rounded-2xl p-4`}>
          <div className="text-3xl font-bold text-slate-900">{overdue.length}</div>
          <div className="text-sm text-slate-500 mt-0.5">Overdue (&gt;24 hrs)</div>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <div className="text-3xl font-bold text-slate-900">{(notes?.length || 0) - overdue.length}</div>
          <div className="text-sm text-slate-500 mt-0.5">Within 24 hours</div>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <div className="font-semibold text-red-700 text-sm">{overdue.length} note{overdue.length > 1 ? "s are" : " is"} overdue for signature</div>
            <div className="text-xs text-red-500">Notes must be signed within 24 hours per clinical policy</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!notes?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-slate-900 mb-1">All notes are signed</p>
            <p className="text-slate-500 text-sm">No unsigned notes outstanding</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notes.map(note => {
              const enc = Array.isArray(note.encounter) ? note.encounter[0] : note.encounter;
              const patient = enc && (Array.isArray(enc.patient) ? enc.patient[0] : enc.patient);
              const created = new Date(note.created_at);
              const hoursAgo = Math.round((Date.now() - created.getTime()) / 3600000);
              const isOverdue = hoursAgo > 24;
              return (
                <Link key={note.id} href={`/dashboard/encounters`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-10 rounded-full flex-shrink-0 ${isOverdue ? "bg-red-400" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm">
                      {patient ? `${patient.last_name}, ${patient.first_name}` : "Unknown Patient"}
                      {patient?.mrn && <span className="text-slate-400 font-normal ml-2 text-xs">MRN: {patient.mrn}</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {enc?.encounter_type} · {enc?.encounter_date ? new Date(enc.encounter_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-semibold ${isOverdue ? "text-red-500" : "text-amber-600"}`}>
                      {isOverdue ? `${hoursAgo}h overdue` : `${hoursAgo}h ago`}
                    </div>
                    <div className="text-xs text-teal-600 font-medium mt-0.5 hover:text-teal-700">Sign now →</div>
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
