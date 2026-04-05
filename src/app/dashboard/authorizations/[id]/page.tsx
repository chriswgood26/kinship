import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import AuthStatusManager from "./AuthStatusManager";
import DocumentUploader from "@/components/DocumentUploader";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  entered:        { label: "Entered",         color: "bg-slate-100 text-slate-600",     icon: "📝" },
  submitted:      { label: "Submitted",       color: "bg-blue-100 text-blue-700",       icon: "📤" },
  pending_review: { label: "Pending Review",  color: "bg-amber-100 text-amber-700",     icon: "⏳" },
  approved:       { label: "Approved",        color: "bg-emerald-100 text-emerald-700", icon: "✅" },
  denied:         { label: "Denied",          color: "bg-red-100 text-red-600",         icon: "❌" },
  appealed:       { label: "Appealed",        color: "bg-purple-100 text-purple-700",   icon: "⚖️" },
  expired:        { label: "Expired",         color: "bg-slate-100 text-slate-400",     icon: "📅" },
};

const WORKFLOW_STEPS = ["entered", "submitted", "pending_review", "approved"];

export default async function AuthDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { data: auth } = await supabaseAdmin
    .from("authorizations")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("id", id)
    .single();

  if (!auth) notFound();

  const patient = Array.isArray(auth.patient) ? auth.patient[0] : auth.patient;
  const cfg = STATUS_CONFIG[auth.status] || STATUS_CONFIG.entered;
  const sessionsLeft = auth.sessions_approved ? auth.sessions_approved - (auth.sessions_used || 0) : null;
  const endDate = auth.end_date ? new Date(auth.end_date + "T12:00:00") : null;
  const daysLeft = endDate ? Math.round((endDate.getTime() - Date.now()) / 86400000) : null;
  const currentStep = WORKFLOW_STEPS.indexOf(auth.status);

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/authorizations" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Prior Authorization</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
            {patient && (
              <Link href={`/dashboard/clients/${patient.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
                {patient.last_name}, {patient.first_name} · MRN: {patient.mrn || "—"}
              </Link>
            )}
          </div>
        </div>
        {auth.auth_number && (
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Auth #</div>
            <div className="font-mono font-bold text-slate-900">{auth.auth_number}</div>
          </div>
        )}
      </div>

      {/* Workflow progress bar */}
      {!["denied", "appealed", "expired"].includes(auth.status) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-900 text-sm">Approval Progress</h3>
          </div>
          <div className="flex items-center gap-0">
            {WORKFLOW_STEPS.map((step, i) => {
              const stepCfg = STATUS_CONFIG[step];
              const isCompleted = i < currentStep;
              const isCurrent = i === currentStep;
              const isLast = i === WORKFLOW_STEPS.length - 1;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                      isCompleted ? "bg-teal-500 text-white" :
                      isCurrent ? "bg-teal-100 text-teal-700 border-2 border-teal-500" :
                      "bg-slate-100 text-slate-400"
                    }`}>
                      {isCompleted ? "✓" : stepCfg.icon}
                    </div>
                    <div className={`text-xs mt-1 font-medium ${isCurrent ? "text-teal-600" : isCompleted ? "text-slate-600" : "text-slate-400"}`}>
                      {stepCfg.label}
                    </div>
                  </div>
                  {!isLast && (
                    <div className={`h-0.5 flex-1 mx-1 rounded ${i < currentStep ? "bg-teal-500" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Auth details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Authorization Details</h2>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Insurance</dt><dd className="mt-0.5 text-slate-900 font-medium">{auth.insurance_provider || "—"}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Member ID</dt><dd className="mt-0.5 text-slate-900 font-mono">{auth.insurance_member_id || "—"}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Priority</dt><dd className={`mt-0.5 capitalize font-medium ${auth.priority === "urgent" ? "text-amber-600" : auth.priority === "emergent" ? "text-red-500" : "text-slate-600"}`}>{auth.priority || "Routine"}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Requested</dt><dd className="mt-0.5 text-slate-900">{auth.requested_date ? new Date(auth.requested_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Auth Period</dt>
            <dd className="mt-0.5 text-slate-900">
              {auth.start_date && auth.end_date ? `${new Date(auth.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(auth.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "—"}
              {daysLeft !== null && daysLeft <= 30 && daysLeft >= 0 && <span className="text-amber-500 text-xs ml-1 font-semibold">({daysLeft}d left)</span>}
            </dd>
          </div>
          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Rendering Provider</dt><dd className="mt-0.5 text-slate-900">{auth.rendering_provider || "—"}</dd></div>

          {auth.sessions_approved && (
            <div className="col-span-3">
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Session Utilization</dt>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className={`h-3 rounded-full transition-all ${sessionsLeft !== null && sessionsLeft <= 3 ? "bg-amber-400" : "bg-teal-500"}`}
                    style={{ width: `${Math.min(100, ((auth.sessions_used || 0) / auth.sessions_approved) * 100)}%` }} />
                </div>
                <div className="text-sm font-semibold text-slate-900 flex-shrink-0">
                  {auth.sessions_used || 0} / {auth.sessions_approved} sessions used
                  {sessionsLeft !== null && <span className={`ml-2 text-xs ${sessionsLeft <= 3 ? "text-amber-500 font-bold" : "text-slate-400"}`}>({sessionsLeft} remaining)</span>}
                </div>
              </div>
            </div>
          )}

          {auth.cpt_codes?.length > 0 && (
            <div className="col-span-3">
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Authorized Services</dt>
              <dd className="flex flex-wrap gap-2">
                {auth.cpt_codes.map((code: string) => (
                  <span key={code} className="font-mono text-sm bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-lg font-bold">{code}</span>
                ))}
              </dd>
            </div>
          )}

          {auth.diagnosis_codes?.length > 0 && (
            <div className="col-span-3">
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Diagnosis Codes</dt>
              <dd className="flex flex-wrap gap-2">
                {auth.diagnosis_codes.map((code: string) => (
                  <span key={code} className="font-mono text-sm bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{code}</span>
                ))}
              </dd>
            </div>
          )}

          {auth.clinical_notes && (
            <div className="col-span-3">
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Clinical Notes / Medical Necessity</dt>
              <dd className="text-slate-700 text-sm leading-relaxed bg-slate-50 rounded-xl p-3">{auth.clinical_notes}</dd>
            </div>
          )}

          {auth.denial_reason && (
            <div className="col-span-3">
              <dt className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Denial Reason</dt>
              <dd className="text-red-700 text-sm bg-red-50 rounded-xl p-3">{auth.denial_reason}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Supporting Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Supporting Documents</h2>
          <p className="text-xs text-slate-400 mt-0.5">Attach authorization letters, medical necessity documentation, EOBs, and appeals</p>
        </div>
        <DocumentUploader
          patientId={patient?.id}
          categories={[
            "Authorization Approval Letter",
            "Authorization Denial Letter",
            "Authorization Appeal",
            "Medical Necessity Documentation",
            "Treatment Plan (for auth)",
            "Clinical Assessment",
            "EOB / Explanation of Benefits",
            "Payer Correspondence",
            "Other Authorization Document",
          ]}
        />
      </div>

      {/* Status manager */}
      <AuthStatusManager auth={auth as {id: string; status: string; sessions_approved: number | null; sessions_used: number; auth_number: string | null; expiration_date?: string | null; patient_id?: string; payer_name?: string; cpt_code?: string; icd10_codes?: string[]}} />
    </div>
  );
}
