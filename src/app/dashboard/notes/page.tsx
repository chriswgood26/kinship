import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import PatientName from "@/components/ClientName";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ClinicalNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ signed?: string; q?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const q = (params.q || "").toLowerCase();
  const signedFilter = params.signed || "";

  let query = supabaseAdmin
    .from("clinical_notes")
    .select("*, encounter:encounter_id(encounter_date, encounter_type, client:client_id(first_name, last_name, mrn, preferred_name))")
    .order("created_at", { ascending: false })
    .limit(50);

  if (signedFilter === "true") query = query.eq("is_signed", true);
  if (signedFilter === "false") query = query.eq("is_signed", false);

  let { data: notes } = await query;
  if (q && notes) {
    notes = notes.filter((n: Record<string,unknown>) => {
      const enc = Array.isArray(n.encounter) ? (n.encounter as Record<string,unknown>[])[0] : n.encounter as Record<string,unknown>;
      const patient = enc && (Array.isArray(enc.patient) ? (enc.patient as Record<string,string>[])[0] : enc.patient as Record<string,string>);
      const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.toLowerCase();
      const encType = ((enc?.encounter_type as string) || '').toLowerCase().replace(/_/g, ' ');
      const subjective = ((n.subjective as string) || '').toLowerCase();
      return patientName.includes(q) || encType.includes(q) || subjective.includes(q);
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clinical Notes</h1>
          <p className="text-slate-500 text-sm mt-0.5">Progress notes, assessments, and treatment plans</p>
        </div>
        <Link href="/dashboard/encounters/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New Note
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[{ label: "All Notes", value: "" }, { label: "Unsigned", value: "false" }, { label: "Signed", value: "true" }].map(f => (
          <Link key={f.value} href={`/dashboard/notes?signed=${f.value}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${signedFilter === f.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {f.label}
          </Link>
        ))}
      </div>

      <SearchInput placeholder="Search patient name or chief complaint..." />

      {/* Notes list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!notes || notes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📝</div>
            <p className="font-semibold text-slate-900 mb-1">No notes yet</p>
            <p className="text-slate-500 text-sm">Notes are created during encounters</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notes.map(note => {
              const enc = Array.isArray(note.encounter) ? note.encounter[0] : note.encounter;
              const patient = enc && (Array.isArray(enc.patient) ? enc.patient[0] : enc.patient);
              return (
                <div key={note.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-slate-900 text-sm">
                          {patient ? (
                            <PatientName
                              firstName={patient.first_name}
                              lastName={patient.last_name}
                              preferredName={patient.preferred_name}
                              mrn={patient.mrn}
                              showMrn={false}
                              className="font-semibold text-slate-900 text-sm"
                            />
                          ) : "Unknown Patient"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${note.is_signed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {note.is_signed ? "✓ Signed" : "Unsigned"}
                        </span>
                        {note.is_late_note && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">⏰ Late</span>
                        )}
                        {note.diagnosis_codes?.length > 0 && (
                          <span className="text-xs text-slate-400 font-mono">{note.diagnosis_codes.slice(0, 2).join(", ")}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                        {enc?.encounter_date && <span>{new Date(enc.encounter_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                        {enc?.encounter_type && <span className="capitalize">{enc.encounter_type}</span>}
                        {patient?.mrn && <span>MRN: {patient.mrn}</span>}
                      </div>
                      {/* SOAP preview */}
                      <div className="grid grid-cols-2 gap-3">
                        {note.subjective && (
                          <div>
                            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">S: </span>
                            <span className="text-xs text-slate-600 line-clamp-2">{note.subjective}</span>
                          </div>
                        )}
                        {note.assessment && (
                          <div>
                            <span className="text-xs font-semibold text-teal-600 uppercase tracking-wide">A: </span>
                            <span className="text-xs text-slate-600 line-clamp-2">{note.assessment}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Link href={`/dashboard/encounters/${note.encounter_id}`}
                        className="text-teal-600 text-sm font-medium hover:text-teal-700">
                        {note.is_signed ? "View →" : "Continue →"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
