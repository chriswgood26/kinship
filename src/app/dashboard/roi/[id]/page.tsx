import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import ROIActions from "./ROIActions";
import PrintButton from "./PrintButton";
import SignaturePad from "./SignaturePad";
import ROIDocumentUpload from "./ROIDocumentUpload";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-slate-100 text-slate-500",
  revoked: "bg-red-100 text-red-600",
  pending_signature: "bg-amber-100 text-amber-700",
};

export default async function ROIDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id;
  if (!orgId) redirect("/sign-in");


  const { id } = await params;
  const { data: roi } = await supabaseAdmin
    .from("releases_of_information")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("id", id)
    .single();

  if (!roi) notFound();

  const patient = Array.isArray(roi.patient) ? roi.patient[0] : roi.patient;
  const expDate = roi.expiration_date ? new Date(roi.expiration_date + "T12:00:00") : null;
  const isExpired = expDate && expDate < new Date() && roi.status === "active";

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/roi" className="text-slate-400 hover:text-slate-700">←</Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">Release of Information</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[isExpired ? "expired" : roi.status] || STATUS_COLORS.pending_signature}`}>
                {isExpired ? "Expired" : roi.status?.replace("_", " ")}
              </span>
              {roi.cfr_part_42 && (
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  42 CFR Part 2
                </span>
              )}
            </div>
            {patient && (
              <Link href={`/dashboard/clients/${patient.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700 mt-0.5 block">
                {patient.last_name}, {patient.first_name} · MRN: {patient.mrn || "—"}
              </Link>
            )}
          </div>
        </div>
        <PrintButton />
      </div>

      {/* Core details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Authorization Details</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Direction</dt><dd className="font-medium text-slate-900 mt-0.5 capitalize">{roi.direction}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Purpose</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.purpose}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Effective Date</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.effective_date ? new Date(roi.effective_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}</dd></div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Expiration Date</dt>
            <dd className={`font-medium mt-0.5 ${isExpired ? "text-red-500" : "text-slate-900"}`}>
              {expDate ? expDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "No expiration"}
              {isExpired && " — EXPIRED"}
            </dd>
          </div>
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Revocable</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.is_revocable ? "Yes — patient may revoke in writing" : "No"}</dd></div>
        </dl>

        {roi.information_to_release?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-2">Information Authorized for Release</dt>
            <div className="flex flex-wrap gap-2">
              {roi.information_to_release.map((info: string) => (
                <span key={info} className="text-xs bg-teal-50 border border-teal-200 text-teal-800 px-2.5 py-1 rounded-lg font-medium">{info}</span>
              ))}
            </div>
          </div>
        )}

        {roi.specific_information && (
          <div className="mt-3">
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Specific Limitations</dt>
            <dd className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-xl p-3">{roi.specific_information}</dd>
          </div>
        )}
      </div>

      {/* 42 CFR Part 2 */}
      {roi.cfr_part_42 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div>
              <h2 className="font-bold text-amber-900 mb-2">42 CFR Part 2 — Substance Use Disorder Records</h2>
              <p className="text-xs text-amber-900 leading-relaxed font-medium border border-amber-300 bg-amber-100 rounded-xl p-4">
                "This information has been disclosed to you from records protected by Federal confidentiality rules (42 CFR Part 2). The Federal rules prohibit you from making any further disclosure of this information unless further disclosure is expressly permitted by the written consent of the person to whom it pertains or as otherwise permitted by 42 CFR Part 2. A general authorization for the release of medical or other information is NOT sufficient for this purpose."
              </p>
              <p className="text-xs text-amber-700 mt-2">This language is required on all ROIs involving substance use disorder treatment records and must appear on any printed or faxed version of this authorization.</p>
            </div>
          </div>
        </div>
      )}

      {/* Recipient */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">{roi.direction === "incoming" ? "Source / Sending Party" : "Recipient"}</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Name</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.recipient_name}</dd></div>
          {roi.recipient_organization && <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Organization</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.recipient_organization}</dd></div>}
          {roi.recipient_phone && <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Phone</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.recipient_phone}</dd></div>}
          {roi.recipient_fax && <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Fax</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.recipient_fax}</dd></div>}
          {roi.recipient_address && <div className="col-span-2"><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Address</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.recipient_address}</dd></div>}
        </dl>
      </div>

      {/* Signature */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Signature Status</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Signature Method</dt><dd className="font-medium text-slate-900 mt-0.5 capitalize">{roi.patient_signature_method?.replace("_", " ")}</dd></div>
          {roi.patient_signed_at && <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Patient Signed</dt><dd className="font-medium text-emerald-700 mt-0.5">✓ {new Date(roi.patient_signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</dd></div>}
          {roi.guardian_name && <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Guardian</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.guardian_name}{roi.guardian_signed_at ? ` · Signed ${new Date(roi.guardian_signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : " · Not yet signed"}</dd></div>}
          {roi.witnessed_by && <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Witnessed By</dt><dd className="font-medium text-slate-900 mt-0.5">{roi.witnessed_by}</dd></div>}
        </dl>
        {roi.status === "pending_signature" && !roi.patient_signed_at && (
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-700">
            ⏳ Awaiting patient signature — obtain signed copy before sharing any records
          </div>
        )}
        {roi.revoked_at && (
          <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
            ⛔ Revoked on {new Date(roi.revoked_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {roi.revocation_reason && ` — ${roi.revocation_reason}`}
          </div>
        )}
      </div>

      {roi.notes && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Notes</div>
          <p className="text-sm text-slate-700">{roi.notes}</p>
        </div>
      )}

      {/* Signature capture / document upload */}
      {roi.status !== "revoked" && !roi.patient_signed_at && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 no-print">
          <h2 className="font-semibold text-slate-900">Capture Signature</h2>
          {roi.patient_signature_method === "electronic" ? (
            <SignaturePad roiId={roi.id} />
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                📋 <span className="font-semibold">Written signature workflow:</span> Print this ROI → have patient sign → scan and upload below → click "Mark Patient Signed" to activate.
              </div>
              <ROIDocumentUpload roiId={roi.id} orgId={orgId} />
            </>
          )}
        </div>
      )}

      {/* Show upload for already-signed ROIs too (for attaching scanned copy later) */}
      {roi.status === "active" && roi.patient_signature_method !== "electronic" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 no-print">
          <h2 className="font-semibold text-slate-900 mb-4">Documents</h2>
          <ROIDocumentUpload roiId={roi.id} orgId={orgId} />
        </div>
      )}

      <ROIActions roi={roi} />
    </div>
  );
}
