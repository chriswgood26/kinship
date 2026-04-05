import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import SOAPEditor from "./SOAPEditor";
import NoteAmendmentPanel from "./NoteAmendmentPanel";
import TimeTracker from "./TimeTracker";

export const dynamic = "force-dynamic";

const CHARGE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  submitted: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  denied: "bg-red-100 text-red-600",
  void: "bg-slate-100 text-slate-500",
};

export default async function EncounterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;

  const [{ data: encounter }, { data: notes }, { data: charges }] = await Promise.all([
    supabaseAdmin.from("encounters").select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, insurance_provider)").eq("id", id).single(),
    supabaseAdmin.from("clinical_notes").select("*").eq("encounter_id", id).order("created_at", { ascending: false }),
    supabaseAdmin.from("charges").select("id, cpt_code, cpt_description, charge_amount, status, units, icd10_codes").eq("encounter_id", id).order("created_at", { ascending: false }),
  ]);

  if (!encounter) notFound();
  const client = Array.isArray(encounter.client) ? encounter.client[0] : encounter.client;
  const existingNote = notes?.[0] || null;
  const isSigned = existingNote?.is_signed || false;

  // Fetch amendments for signed notes
  const amendments = isSigned && existingNote?.id
    ? (await supabaseAdmin
        .from("note_amendments")
        .select("*")
        .eq("note_id", existingNote.id)
        .order("created_at", { ascending: true })
      ).data ?? []
    : [];

  return (
    <div className="max-w-4xl space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/encounters" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{client ? `${client.last_name}, ${client.first_name}` : "Encounter"}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${isSigned ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                {isSigned ? "✓ Signed" : "📝 In Progress"}
              </span>
            </div>
            <div className="text-sm text-slate-500 mt-0.5">
              {encounter.encounter_type} · {encounter.encounter_date}
              {client?.mrn && ` · MRN: ${client.mrn}`}
            </div>
          </div>
        </div>
        <Link href={`/dashboard/clients/${encounter.client_id}`} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">
          Client Chart →
        </Link>
      </div>

      {encounter.chief_complaint && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm">
          <span className="font-semibold text-amber-700">Chief Complaint: </span>
          <span className="text-amber-900">{encounter.chief_complaint}</span>
        </div>
      )}

      {/* Time Tracking */}
      <TimeTracker
        encounterId={id}
        initialStartTime={encounter.start_time ?? null}
        initialEndTime={encounter.end_time ?? null}
        initialDurationMinutes={encounter.duration_minutes ?? null}
        initialDurationOverride={encounter.duration_override ?? false}
      />

      {/* Charges */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Charges</h2>
          <Link
            href={`/dashboard/billing/new?encounter_id=${id}`}
            className="bg-teal-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-teal-400 transition-colors"
          >
            + Add Charge
          </Link>
        </div>
        {!charges?.length ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-slate-500">No charges linked to this encounter.</p>
            <Link
              href={`/dashboard/billing/new?encounter_id=${id}`}
              className="inline-block mt-3 text-teal-600 text-sm font-medium hover:text-teal-800"
            >
              + Add a charge →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPT</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Diagnoses</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Units</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {charges.map(charge => (
                <tr key={charge.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="font-mono font-bold text-sm text-slate-900">{charge.cpt_code}</div>
                    {charge.cpt_description && <div className="text-xs text-slate-400">{charge.cpt_description}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-500">{charge.icd10_codes?.slice(0, 2).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{charge.units ?? 1}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{charge.charge_amount ? `$${Number(charge.charge_amount).toFixed(2)}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${CHARGE_STATUS_COLORS[charge.status] || CHARGE_STATUS_COLORS.pending}`}>
                      {charge.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isSigned && existingNote ? (
        <>
          <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden">
            <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-emerald-900">✓ Signed Progress Note</h2>
                {existingNote.is_late_note && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">⏰ Late Note</span>
                )}
              </div>
              <div className="text-xs text-emerald-600">
                {existingNote.signed_at ? new Date(existingNote.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
              </div>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: "S — Subjective", value: existingNote.subjective, color: "border-blue-100 bg-blue-50/30" },
                { label: "O — Objective", value: existingNote.objective, color: "border-slate-100 bg-slate-50/30" },
                { label: "A — Assessment", value: existingNote.assessment, color: "border-amber-100 bg-amber-50/30" },
                { label: "P — Plan", value: existingNote.plan, color: "border-emerald-100 bg-emerald-50/30" },
              ].map(s => s.value && (
                <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{s.label}</div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{s.value}</p>
                </div>
              ))}
              {existingNote.diagnosis_codes?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {existingNote.diagnosis_codes.map((code: string) => (
                    <span key={code} className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">{code}</span>
                  ))}
                </div>
              )}
              {existingNote.is_late_note && existingNote.late_note_reason && (
                <div className="border border-orange-200 bg-orange-50 rounded-xl p-4">
                  <div className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">⏰ Late Note Reason</div>
                  <p className="text-sm text-orange-900">{existingNote.late_note_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Amendments & Addenda panel — always shown for signed notes */}
          <NoteAmendmentPanel
            noteId={existingNote.id}
            initialAmendments={amendments}
          />
        </>
      ) : (
        <SOAPEditor
          encounterId={id}
          existingNote={existingNote}
          clientName={client ? `${client.last_name}, ${client.first_name}` : ""}
          encounterDate={encounter.encounter_date}
        />
      )}
    </div>
  );
}
