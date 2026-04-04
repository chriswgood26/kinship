import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import DocumentUploader from "@/components/DocumentUploader";
import ReferralStatusUpdater from "@/components/ReferralStatusUpdater";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  declined: "bg-red-100 text-red-600",
  cancelled: "bg-slate-100 text-slate-500",
};

const TYPE_COLORS: Record<string, string> = {
  outgoing: "bg-purple-100 text-purple-700",
  incoming: "bg-teal-100 text-teal-700",
  internal: "bg-blue-100 text-blue-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  routine: "text-slate-500",
  urgent: "text-amber-600 font-semibold",
  emergent: "text-red-500 font-bold",
};

export default async function ReferralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const { data: referral } = await supabaseAdmin
    .from("referrals")
    .select("*, client:client_id(id, first_name, last_name, mrn)")
    .eq("id", id)
    .single();


  if (!referral) notFound();

  const patient = Array.isArray(referral.patient) ? referral.patient[0] : referral.patient;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/referrals" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Referral Detail</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${TYPE_COLORS[referral.referral_type]}`}>
              {referral.referral_type}
            </span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[referral.status]}`}>
              {referral.status}
            </span>
          </div>
          {patient && (
            <Link href={`/dashboard/clients/${patient.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
              {patient.last_name}, {patient.first_name} · MRN: {patient.mrn || "—"}
            </Link>
          )}
        </div>
      </div>

      {/* Referral details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Referral Information</h2>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Priority</dt>
            <dd className={`mt-0.5 capitalize ${PRIORITY_COLORS[referral.priority] || ""}`}>{referral.priority || "Routine"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Referral Date</dt>
            <dd className="text-slate-900 mt-0.5">{referral.referral_date ? new Date(referral.referral_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Due Date</dt>
            <dd className="text-slate-900 mt-0.5">{referral.due_date ? new Date(referral.due_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Referred By</dt>
            <dd className="text-slate-900 mt-0.5">{referral.referred_by || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Referred To</dt>
            <dd className="text-slate-900 mt-0.5">{referral.referred_to || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Organization</dt>
            <dd className="text-slate-900 mt-0.5">{referral.referred_to_org || "—"}</dd>
          </div>
          {(referral.referred_by_email || referral.referred_to_email) && (
            <div>
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {referral.referral_type === "incoming" ? "Referring Provider Email" : "Receiving Provider Email"}
              </dt>
              <dd className="text-slate-900 mt-0.5 text-sm">
                <a href={`mailto:${referral.referred_by_email || referral.referred_to_email}`}
                   className="text-teal-600 hover:text-teal-700">
                  {referral.referred_by_email || referral.referred_to_email}
                </a>
              </dd>
            </div>
          )}
          {referral.applicant_email && (
            <div>
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Applicant Email</dt>
              <dd className="text-slate-900 mt-0.5 text-sm">
                <a href={`mailto:${referral.applicant_email}`} className="text-teal-600 hover:text-teal-700">
                  {referral.applicant_email}
                </a>
              </dd>
            </div>
          )}
          {referral.reason && (
            <div className="col-span-3">
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Reason</dt>
              <dd className="text-slate-900 mt-0.5">{referral.reason}</dd>
            </div>
          )}
          {referral.notes && (
            <div className="col-span-3">
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</dt>
              <dd className="text-slate-700 mt-0.5 text-sm">{referral.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Status update with email notification */}
      <ReferralStatusUpdater
        referralId={id}
        currentStatus={referral.status}
        referralType={referral.referral_type}
        referredByEmail={referral.referred_by_email || null}
        referredToEmail={referral.referred_to_email || null}
        applicantEmail={referral.applicant_email || null}
      />

      {/* Documents */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Documents</h2>
          <p className="text-xs text-slate-400 mt-0.5">Attach referral letters, authorizations, clinical summaries</p>
        </div>
        <div className="p-5">
          <DocumentUploader referralId={id} patientId={patient?.id} />
        </div>
      </div>

      {patient && (
        <div className="flex gap-3">
          <Link href={`/dashboard/clients/${patient.id}`}
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
            View Patient
          </Link>
          <Link href={`/dashboard/encounters/new?patient_id=${patient.id}`}
            className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
            Start Encounter
          </Link>
        </div>
      )}
    </div>
  );
}
