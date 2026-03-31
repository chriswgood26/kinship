import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-slate-100 text-slate-500",
  revoked: "bg-red-100 text-red-600",
  pending_signature: "bg-amber-100 text-amber-700",
};

const DIRECTION_COLORS: Record<string, string> = {
  outgoing: "bg-blue-100 text-blue-700",
  incoming: "bg-purple-100 text-purple-700",
};

export default async function ROIPage({
  searchParams,
}: { searchParams: Promise<{ client_id?: string; status?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { data: _profile } = await supabaseAdmin
    .from("user_profiles")
    .select("organization_id")
    .eq("clerk_user_id", user.id)
    .single();
  const orgId = _profile?.organization_id || profile?.organization_id || "";


  const params = await searchParams;
  const patientFilter = params.client_id || "";
  const statusFilter = params.status || "";

  let query = supabaseAdmin
    .from("releases_of_information")
    .select("*, patient:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (patientFilter) query = query.eq("client_id", patientFilter);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: rois } = await query;

  const today = new Date().toISOString().split("T")[0];
  const expiringSoon = rois?.filter(r => {
    if (r.status !== "active" || !r.expiration_date) return false;
    const daysLeft = Math.round((new Date(r.expiration_date).getTime() - Date.now()) / 86400000);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length || 0;

  const active = rois?.filter(r => r.status === "active").length || 0;
  const pendingSig = rois?.filter(r => r.status === "pending_signature").length || 0;
  const revoked = rois?.filter(r => r.status === "revoked").length || 0;
  const portalRequests = rois?.filter(r => (r as Record<string, unknown>).requested_via_portal && !(r as Record<string, unknown>).staff_reviewed).length || 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Releases of Information</h1>
          <p className="text-slate-500 text-sm mt-0.5">Patient authorization to share protected health information</p>
        </div>
        <Link href={`/dashboard/roi/new${patientFilter ? `?client_id=${patientFilter}` : ""}`} className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 text-sm">
          + New ROI
        </Link>
      </div>

      {expiringSoon > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-amber-800 font-medium">{expiringSoon} release{expiringSoon > 1 ? "s expire" : " expires"} within 30 days — obtain renewal before expiration</span>
        </div>
      )}

      {pendingSig > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">✍️</span>
          <span className="text-sm text-blue-800 font-medium">{pendingSig} release{pendingSig > 1 ? "s are" : " is"} awaiting patient signature</span>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Active", value: active, color: "bg-emerald-50 border-emerald-100" },
          { label: "Pending Signature", value: pendingSig, color: pendingSig > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Expiring Soon", value: expiringSoon, color: expiringSoon > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Revoked", value: revoked, color: "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[["", "All"], ["active", "Active"], ["pending_signature", "Pending Sig."], ["expired", "Expired"], ["revoked", "Revoked"]].map(([val, label]) => (
          <Link key={val} href={`/dashboard/roi?status=${val}${patientFilter ? `&client_id=${patientFilter}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </Link>
        ))}
      </div>

      {/* ROI list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!rois?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-slate-900 mb-1">No releases of information</p>
            <p className="text-slate-500 text-sm mb-4">Document patient authorizations to share PHI with third parties</p>
            <Link href={`/dashboard/roi/new${patientFilter ? `?client_id=${patientFilter}` : ""}`} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">+ New ROI</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Direction</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recipient / Source</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Purpose</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expires</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rois.map(roi => {
                const clientRecord = Array.isArray(roi.patient) ? roi.patient[0] : roi.patient;
                const expDate = roi.expiration_date ? new Date(roi.expiration_date + "T12:00:00") : null;
                const isExpiringSoon = expDate && roi.status === "active" && (expDate.getTime() - Date.now()) / 86400000 <= 30 && expDate > new Date();
                const isExpired = expDate && expDate < new Date() && roi.status === "active";
                return (
                  <tr key={roi.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/clients/${roi.client_id}`} className="no-underline">
                        <div className="font-semibold text-sm text-slate-900 hover:text-teal-600">{patient ? `${client.last_name}, ${client.first_name}` : "—"}</div>
                        <div className="text-xs text-slate-400">{patient?.mrn || "—"}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DIRECTION_COLORS[roi.direction] || ""}`}>{roi.direction}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-slate-900">{roi.recipient_name}</div>
                      {roi.recipient_organization && <div className="text-xs text-slate-400">{roi.recipient_organization}</div>}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 max-w-48 truncate">{roi.purpose}</td>
                    <td className="px-4 py-4">
                      {expDate ? (
                        <div className={`text-sm ${isExpiringSoon ? "text-amber-600 font-semibold" : isExpired ? "text-red-500 font-semibold" : "text-slate-600"}`}>
                          {expDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {isExpiringSoon && " ⚠️"}
                          {isExpired && " EXPIRED"}
                        </div>
                      ) : <span className="text-slate-400 text-sm">No expiry</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[roi.status] || STATUS_COLORS.active}`}>
                        {roi.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/roi/${roi.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
