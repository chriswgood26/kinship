import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-slate-100 text-slate-500",
  revoked: "bg-red-100 text-red-600",
  pending_signature: "bg-amber-100 text-amber-700",
};

export default async function PortalROIPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: portalUser } = await supabaseAdmin
    .from("portal_users").select("*").eq("clerk_user_id", user.id).single();
  if (!portalUser) redirect("/portal/dashboard");

  const { data: rois } = await supabaseAdmin
    .from("releases_of_information")
    .select("id, status, direction, recipient_name, recipient_organization, purpose, information_to_release, effective_date, expiration_date, patient_signed_at, requested_via_portal, staff_reviewed")
    .eq("client_id", portalUser.client_id)
    .order("created_at", { ascending: false });

  const pendingReview = rois?.filter(r => r.requested_via_portal && !r.staff_reviewed).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Releases of Information</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage authorizations to share your health records</p>
        </div>
        <Link href="/portal/roi/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 text-sm">
          + Request New ROI
        </Link>
      </div>

      {pendingReview > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5 text-sm text-blue-800 flex items-center gap-3">
          <span className="text-xl">⏳</span>
          <div>
            <div className="font-semibold">{pendingReview} request{pendingReview > 1 ? "s" : ""} pending staff review</div>
            <div className="text-xs text-blue-600">Your care team will review and process your request within 2-3 business days.</div>
          </div>
        </div>
      )}

      {/* What is an ROI */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 text-sm mb-2">What is a Release of Information?</h2>
        <p className="text-sm text-slate-600">A Release of Information (ROI) gives your written permission for us to share your health records with someone else — like another doctor, your insurance company, or a family member. You control what is shared, with whom, and for how long.</p>
      </div>

      {/* ROI list */}
      {!rois?.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-slate-900 mb-1">No releases on file</p>
          <p className="text-slate-400 text-sm mb-4">You can request a release to share your records with another provider, family member, or other party.</p>
          <Link href="/portal/roi/new" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            Request a Release →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rois.map(roi => {
            const expDate = roi.expiration_date ? new Date(roi.expiration_date + "T12:00:00") : null;
            const isExpired = expDate && expDate < new Date() && roi.status === "active";
            return (
              <div key={roi.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-900">{roi.recipient_name}</span>
                      {roi.recipient_organization && <span className="text-slate-400 text-sm">· {roi.recipient_organization}</span>}
                      {roi.requested_via_portal && !roi.staff_reviewed && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">⏳ Pending review</span>
                      )}
                      {roi.requested_via_portal && roi.staff_reviewed && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">✓ Processed</span>
                      )}
                    </div>
                    <div className="text-sm text-slate-500">{roi.purpose}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {roi.information_to_release?.map((info: string) => (
                        <span key={info} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{info}</span>
                      ))}
                    </div>
                    {expDate && (
                      <div className={`text-xs mt-2 ${isExpired ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                        {isExpired ? "⚠️ Expired" : `Valid until ${expDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize flex-shrink-0 ${STATUS_COLORS[isExpired ? "expired" : roi.status] || STATUS_COLORS.pending_signature}`}>
                    {isExpired ? "Expired" : roi.status?.replace("_", " ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-500">
        You have the right to request a copy of your records or restrict how they are shared. Contact us at <span className="font-medium">(503) 555-0100</span> if you need assistance.
      </div>
    </div>
  );
}
