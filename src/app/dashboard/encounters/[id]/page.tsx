import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import SOAPEditor from "./SOAPEditor";

export const dynamic = "force-dynamic";

export default async function EncounterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;

  const [{ data: encounter }, { data: notes }] = await Promise.all([
    supabaseAdmin.from("encounters").select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, insurance_provider)").eq("id", id).single(),
    supabaseAdmin.from("clinical_notes").select("*").eq("encounter_id", id).order("created_at", { ascending: false }),
  ]);

  if (!encounter) notFound();
  const client = Array.isArray(encounter.client) ? encounter.client[0] : encounter.client;
  const existingNote = notes?.[0] || null;
  const isSigned = existingNote?.is_signed || false;

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

      {isSigned && existingNote ? (
        <div className="bg-white rounded-2xl border border-emerald-200 overflow-hidden">
          <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
            <h2 className="font-semibold text-emerald-900">✓ Signed Progress Note</h2>
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
          </div>
        </div>
      ) : (
        <SOAPEditor
          encounterId={id}
          existingNote={existingNote}
          clientName={client ? `${client.last_name}, ${client.first_name}` : ""}
        />
      )}
    </div>
  );
}
