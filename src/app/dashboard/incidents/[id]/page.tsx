import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import IncidentStatusManager from "./IncidentStatusManager";

export const dynamic = "force-dynamic";

const SEVERITY_COLORS: Record<string, string> = {
  minor: "bg-slate-100 text-slate-600",
  moderate: "bg-amber-100 text-amber-700",
  serious: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { data: incident } = await supabaseAdmin
    .from("incident_reports")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("id", id)
    .single();

  if (!incident) notFound();
  const patient = Array.isArray(incident.patient) ? incident.patient[0] : incident.patient;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/incidents" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{incident.incident_type}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${SEVERITY_COLORS[incident.severity]}`}>{incident.severity}</span>
              {incident.state_report_required && !incident.state_report_submitted_at && (
                <span className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-semibold">🚨 State Report Due</span>
              )}
            </div>
            {patient && (
              <Link href={`/dashboard/clients/${patient.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
                {patient.last_name}, {patient.first_name} · MRN: {patient.mrn || "—"}
              </Link>
            )}
          </div>
        </div>
        <button className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 no-print">🖨️ Print</button>
      </div>

      {/* Key facts */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Incident Details</h2>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Date & Time</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {new Date(incident.incident_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              {incident.incident_time && ` at ${incident.incident_time.slice(0, 5)}`}
            </dd>
          </div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Location</dt><dd className="font-medium text-slate-900 mt-0.5">{incident.location || "—"}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Injury</dt>
            <dd className={`font-medium mt-0.5 ${incident.injury_occurred ? "text-red-600" : "text-emerald-600"}`}>
              {incident.injury_occurred ? "⚠️ Yes" : "✓ No injury"}
            </dd>
          </div>
          {incident.staff_involved?.length > 0 && (
            <div className="col-span-3"><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Staff Involved</dt>
              <dd className="text-slate-700">{incident.staff_involved.join(", ")}</dd>
            </div>
          )}
          {incident.witnesses?.length > 0 && (
            <div className="col-span-3"><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Witnesses</dt>
              <dd className="text-slate-700">{incident.witnesses.join(", ")}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        {[
          { label: "Incident Description", value: incident.description },
          { label: "Antecedent (What happened before)", value: incident.antecedent },
          { label: "Behavior (What the individual did)", value: incident.behavior },
          { label: "Consequence (Staff response)", value: incident.consequence },
          { label: "Immediate Actions Taken", value: incident.immediate_actions },
        ].map(s => s.value && (
          <div key={s.label}>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">{s.label}</dt>
            <dd className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3">{s.value}</dd>
          </div>
        ))}

        {incident.injury_occurred && incident.injury_description && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <dt className="text-xs text-red-500 uppercase font-semibold tracking-wide mb-1">Injury Description</dt>
            <dd className="text-sm text-red-800">{incident.injury_description}</dd>
            {incident.medical_attention && (
              <dd className="text-sm text-red-700 mt-2"><span className="font-semibold">Medical attention:</span> {incident.medical_attention_details}</dd>
            )}
          </div>
        )}
      </div>

      {/* Status management */}
      <IncidentStatusManager incident={incident} />
    </div>
  );
}
