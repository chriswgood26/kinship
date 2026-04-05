import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending_signature: "bg-amber-100 text-amber-700",
  signed: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-600",
  expired: "bg-slate-100 text-slate-500",
  revoked: "bg-rose-100 text-rose-600",
};

export default async function PrivacyNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; status?: string; compliance?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await getOrgId(userId);
  const params = await searchParams;
  const clientFilter = params.client_id || "";
  const statusFilter = params.status || "";
  const complianceFilter = params.compliance || "";

  // Fetch all HIPAA notice records
  let query = supabaseAdmin
    .from("consent_forms")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name, date_of_birth)")
    .eq("organization_id", orgId)
    .eq("form_type", "hipaa_notice")
    .order("created_at", { ascending: false })
    .limit(500);

  if (clientFilter) query = query.eq("client_id", clientFilter);
  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: notices } = await query;

  // Fetch all active clients to compute compliance
  const { data: allClients } = await supabaseAdmin
    .from("clients")
    .select("id, first_name, last_name, mrn, preferred_name")
    .eq("organization_id", orgId)
    .eq("is_active", true)
    .order("last_name");

  const today = new Date();

  // Build per-client HIPAA status map (most recent signed notice per client)
  const clientNoticeMap = new Map<
    string,
    { signed_at: string | null; expiration_date: string | null; status: string }
  >();
  for (const notice of notices || []) {
    if (!clientNoticeMap.has(notice.client_id)) {
      clientNoticeMap.set(notice.client_id, {
        signed_at: notice.signed_at,
        expiration_date: notice.expiration_date,
        status: notice.status,
      });
    }
  }

  // Build compliance buckets
  const clientsNeverAcknowledged = (allClients || []).filter(
    (c) => !clientNoticeMap.has(c.id)
  );
  const clientsDueForRenewal = (allClients || []).filter((c) => {
    const record = clientNoticeMap.get(c.id);
    if (!record || record.status !== "signed" || !record.expiration_date) return false;
    const expDate = new Date(record.expiration_date + "T12:00:00");
    const daysLeft = Math.round((expDate.getTime() - today.getTime()) / 86400000);
    return daysLeft >= 0 && daysLeft <= 30;
  });
  const clientsExpired = (allClients || []).filter((c) => {
    const record = clientNoticeMap.get(c.id);
    if (!record) return false;
    if (record.status === "revoked" || record.status === "declined") return true;
    if (!record.expiration_date) return false;
    const expDate = new Date(record.expiration_date + "T12:00:00");
    return expDate < today && record.status === "signed";
  });
  const clientsCompliant = (allClients || []).filter((c) => {
    const record = clientNoticeMap.get(c.id);
    if (!record || record.status !== "signed") return false;
    if (!record.expiration_date) return true;
    const expDate = new Date(record.expiration_date + "T12:00:00");
    return expDate > today;
  });

  const totalActive = allClients?.length || 0;
  const compliancePct = totalActive > 0 ? Math.round((clientsCompliant.length / totalActive) * 100) : 0;

  // Apply compliance filter to records list
  let filteredNotices = notices || [];
  if (complianceFilter === "never") {
    const ids = new Set(clientsNeverAcknowledged.map((c) => c.id));
    filteredNotices = filteredNotices.filter((n) => ids.has(n.client_id));
  } else if (complianceFilter === "renewal") {
    const ids = new Set(clientsDueForRenewal.map((c) => c.id));
    filteredNotices = filteredNotices.filter((n) => ids.has(n.client_id));
  } else if (complianceFilter === "expired") {
    const ids = new Set(clientsExpired.map((c) => c.id));
    filteredNotices = filteredNotices.filter((n) => ids.has(n.client_id));
  }

  const pendingSig = (notices || []).filter((n) => n.status === "pending_signature").length;
  const signed = (notices || []).filter((n) => n.status === "signed").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Privacy Notice Acknowledgments</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track HIPAA Notice of Privacy Practices acknowledgments across all active patients
          </p>
        </div>
        <Link
          href={`/dashboard/privacy-notices/new${clientFilter ? `?client_id=${clientFilter}` : ""}`}
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm"
        >
          + Log Acknowledgment
        </Link>
      </div>

      {/* Compliance bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-semibold text-slate-900 text-sm">HIPAA Compliance Rate</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {clientsCompliant.length} of {totalActive} active patients have a current, signed privacy notice
            </div>
          </div>
          <div
            className={`text-2xl font-bold ${
              compliancePct >= 90
                ? "text-emerald-600"
                : compliancePct >= 70
                ? "text-amber-600"
                : "text-red-600"
            }`}
          >
            {compliancePct}%
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              compliancePct >= 90
                ? "bg-emerald-500"
                : compliancePct >= 70
                ? "bg-amber-500"
                : "bg-red-500"
            }`}
            style={{ width: `${compliancePct}%` }}
          />
        </div>
      </div>

      {/* Alerts */}
      {clientsNeverAcknowledged.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🚨</span>
            <span className="text-sm text-red-800 font-medium">
              {clientsNeverAcknowledged.length} patient
              {clientsNeverAcknowledged.length > 1 ? "s have" : " has"} never received a HIPAA privacy notice
            </span>
          </div>
          <Link
            href="/dashboard/privacy-notices?compliance=never"
            className="text-xs text-red-700 font-semibold underline hover:no-underline"
          >
            View →
          </Link>
        </div>
      )}
      {clientsDueForRenewal.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <span className="text-sm text-orange-800 font-medium">
              {clientsDueForRenewal.length} patient
              {clientsDueForRenewal.length > 1 ? "s are" : " is"} due for annual HIPAA notice renewal within 30 days
            </span>
          </div>
          <Link
            href="/dashboard/privacy-notices?compliance=renewal"
            className="text-xs text-orange-700 font-semibold underline hover:no-underline"
          >
            View →
          </Link>
        </div>
      )}
      {clientsExpired.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">📅</span>
            <span className="text-sm text-amber-800 font-medium">
              {clientsExpired.length} patient
              {clientsExpired.length > 1 ? "s have" : " has"} an expired or revoked HIPAA notice
            </span>
          </div>
          <Link
            href="/dashboard/privacy-notices?compliance=expired"
            className="text-xs text-amber-700 font-semibold underline hover:no-underline"
          >
            View →
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Compliant Patients", value: clientsCompliant.length, color: "bg-emerald-50 border-emerald-100" },
          { label: "Never Acknowledged", value: clientsNeverAcknowledged.length, color: clientsNeverAcknowledged.length > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Due for Renewal", value: clientsDueForRenewal.length, color: clientsDueForRenewal.length > 0 ? "bg-orange-50 border-orange-100" : "bg-slate-50 border-slate-200" },
          { label: "Pending Signature", value: pendingSig, color: pendingSig > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Patients who need action (never or expired) — shown when no filters applied */}
      {!clientFilter && !statusFilter && !complianceFilter && (clientsNeverAcknowledged.length > 0 || clientsExpired.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-red-50">
            <h2 className="font-semibold text-slate-900 text-sm">
              🚨 Patients Requiring HIPAA Notice ({clientsNeverAcknowledged.length + clientsExpired.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These patients have never been given or have an outdated HIPAA privacy notice
            </p>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Notice</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                ...clientsNeverAcknowledged.map((c) => ({ ...c, _reason: "Never acknowledged" as const })),
                ...clientsExpired.map((c) => ({ ...c, _reason: "Expired / revoked" as const })),
              ]
                .slice(0, 20)
                .map((client) => {
                  const record = clientNoticeMap.get(client.id);
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-sm text-slate-900">
                          {client.last_name}, {client.first_name}
                        </div>
                        <div className="text-xs text-slate-400">{client.mrn || "—"}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          client._reason === "Never acknowledged"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {client._reason}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-slate-400">
                          {record?.signed_at
                            ? new Date(record.signed_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/dashboard/privacy-notices/new?client_id=${client.id}`}
                          className="text-teal-600 text-xs font-semibold hover:text-teal-700"
                        >
                          Log Notice →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          {clientsNeverAcknowledged.length + clientsExpired.length > 20 && (
            <div className="px-5 py-3 text-xs text-slate-400 text-center border-t border-slate-100">
              Showing first 20 — use filters above to narrow results
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[
            ["", "All Records"],
            ["pending_signature", "Pending Sig."],
            ["signed", "Signed"],
            ["declined", "Declined"],
            ["expired", "Expired"],
            ["revoked", "Revoked"],
          ].map(([val, label]) => (
            <Link
              key={val}
              href={`/dashboard/privacy-notices?status=${val}${clientFilter ? `&client_id=${clientFilter}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === val
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
        {complianceFilter && (
          <Link
            href="/dashboard/privacy-notices"
            className="text-xs text-teal-600 font-medium hover:text-teal-700 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg"
          >
            ✕ Clear filter: {complianceFilter}
          </Link>
        )}
      </div>

      {/* Records table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!filteredNotices.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="font-semibold text-slate-900 mb-1">No privacy notice records found</p>
            <p className="text-slate-500 text-sm mb-4">
              Log HIPAA privacy notice acknowledgments to track compliance across your patient panel
            </p>
            <Link
              href={`/dashboard/privacy-notices/new${clientFilter ? `?client_id=${clientFilter}` : ""}`}
              className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block"
            >
              + Log First Acknowledgment
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Acknowledged
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Signed By
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Next Renewal
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredNotices.map((notice) => {
                const client = Array.isArray(notice.client) ? notice.client[0] : notice.client;
                const expDate = notice.expiration_date
                  ? new Date(notice.expiration_date + "T12:00:00")
                  : null;
                const daysLeft = expDate
                  ? Math.round((expDate.getTime() - today.getTime()) / 86400000)
                  : null;
                const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                const isExpired = daysLeft !== null && daysLeft < 0 && notice.status === "signed";
                return (
                  <tr key={notice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/clients/${notice.client_id}`} className="no-underline">
                        <div className="font-semibold text-sm text-slate-900 hover:text-teal-600">
                          {client ? `${client.last_name}, ${client.first_name}` : "—"}
                        </div>
                        <div className="text-xs text-slate-400">{client?.mrn || "—"}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      {notice.signed_at ? (
                        <div className="text-sm text-slate-700">
                          {new Date(notice.signed_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700 capitalize">
                        {notice.signed_by?.replace("_", " ") || "—"}
                        {notice.guardian_name && (
                          <div className="text-xs text-slate-400">{notice.guardian_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-600 capitalize">
                        {notice.signature_method?.replace("_", " ") || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {expDate ? (
                        <div
                          className={`text-sm font-medium ${
                            isExpiringSoon
                              ? "text-orange-600"
                              : isExpired
                              ? "text-red-600"
                              : "text-slate-600"
                          }`}
                        >
                          {expDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {isExpiringSoon && (
                            <div className="text-xs font-normal text-orange-500">
                              {daysLeft}d remaining ⚠️
                            </div>
                          )}
                          {isExpired && (
                            <div className="text-xs font-normal text-red-500">EXPIRED</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                          STATUS_COLORS[notice.status] || STATUS_COLORS.pending_signature
                        }`}
                      >
                        {notice.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/dashboard/consent-forms/${notice.id}`}
                        className="text-teal-600 text-sm font-medium hover:text-teal-700"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* HIPAA compliance note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800">
        <div className="font-semibold mb-1">ℹ️ HIPAA Notice of Privacy Practices Requirements</div>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>• Covered entities must provide the Notice of Privacy Practices (NPP) to patients at their first service delivery</li>
          <li>• Good-faith efforts must be made to obtain written acknowledgment of receipt (45 CFR §164.520)</li>
          <li>• If acknowledgment cannot be obtained, document why — note the circumstances in the patient record</li>
          <li>• Re-offer the NPP if the notice has been materially revised or annually at the next service delivery</li>
          <li>• The NPP must also be posted prominently in the facility and available on the organization's website</li>
        </ul>
      </div>
    </div>
  );
}
