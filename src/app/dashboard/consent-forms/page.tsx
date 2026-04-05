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

const FORM_TYPE_LABELS: Record<string, string> = {
  general_consent: "General Consent",
  hipaa_notice: "HIPAA Notice",
  treatment_consent: "Treatment Consent",
  medication_consent: "Medication Consent",
  telehealth_consent: "Telehealth Consent",
  photography_consent: "Photography/Media",
  research_consent: "Research Consent",
  financial_agreement: "Financial Agreement",
  other: "Other",
};

const FORM_TYPE_ICONS: Record<string, string> = {
  general_consent: "📋",
  hipaa_notice: "🔒",
  treatment_consent: "⚕️",
  medication_consent: "💊",
  telehealth_consent: "🎥",
  photography_consent: "📷",
  research_consent: "🔬",
  financial_agreement: "💰",
  other: "📄",
};

export default async function ConsentFormsPage({
  searchParams,
}: { searchParams: Promise<{ client_id?: string; status?: string; form_type?: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const orgId = await getOrgId(userId);
  const params = await searchParams;
  const clientFilter = params.client_id || "";
  const statusFilter = params.status || "";
  const typeFilter = params.form_type || "";

  let query = supabaseAdmin
    .from("consent_forms")
    .select("*, client:client_id(id, first_name, last_name, mrn, preferred_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (clientFilter) query = query.eq("client_id", clientFilter);
  if (statusFilter) query = query.eq("status", statusFilter);
  if (typeFilter) query = query.eq("form_type", typeFilter);

  const { data: forms } = await query;

  const today = new Date();
  const pendingSig = forms?.filter(f => f.status === "pending_signature").length || 0;
  const signed = forms?.filter(f => f.status === "signed").length || 0;
  const expired = forms?.filter(f => f.status === "expired" || (f.expiration_date && new Date(f.expiration_date) < today && f.status === "signed")).length || 0;
  const expiringSoon = forms?.filter(f => {
    if (f.status !== "signed" || !f.expiration_date) return false;
    const daysLeft = Math.round((new Date(f.expiration_date).getTime() - today.getTime()) / 86400000);
    return daysLeft >= 0 && daysLeft <= 30;
  }).length || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consent Forms</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track patient consent forms, authorizations, and signatures</p>
        </div>
        <Link
          href={`/dashboard/consent-forms/new${clientFilter ? `?client_id=${clientFilter}` : ""}`}
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm"
        >
          + New Consent Form
        </Link>
      </div>

      {/* Alerts */}
      {pendingSig > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">✍️</span>
          <span className="text-sm text-amber-800 font-medium">
            {pendingSig} consent form{pendingSig > 1 ? "s are" : " is"} awaiting patient signature
          </span>
        </div>
      )}
      {expiringSoon > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-orange-800 font-medium">
            {expiringSoon} consent form{expiringSoon > 1 ? "s expire" : " expires"} within 30 days — obtain renewal before expiration
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending Signature", value: pendingSig, color: pendingSig > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "Signed", value: signed, color: "bg-emerald-50 border-emerald-100" },
          { label: "Expiring Soon", value: expiringSoon, color: expiringSoon > 0 ? "bg-orange-50 border-orange-100" : "bg-slate-50 border-slate-200" },
          { label: "Expired / Revoked", value: expired, color: "bg-slate-50 border-slate-200" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
          {[
            ["", "All Status"],
            ["pending_signature", "Pending Sig."],
            ["signed", "Signed"],
            ["declined", "Declined"],
            ["expired", "Expired"],
            ["revoked", "Revoked"],
          ].map(([val, label]) => (
            <Link
              key={val}
              href={`/dashboard/consent-forms?status=${val}${clientFilter ? `&client_id=${clientFilter}` : ""}${typeFilter ? `&form_type=${typeFilter}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit flex-wrap">
          <Link
            href={`/dashboard/consent-forms?status=${statusFilter}${clientFilter ? `&client_id=${clientFilter}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!typeFilter ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            All Types
          </Link>
          {Object.entries(FORM_TYPE_LABELS).map(([val, label]) => (
            <Link
              key={val}
              href={`/dashboard/consent-forms?form_type=${val}&status=${statusFilter}${clientFilter ? `&client_id=${clientFilter}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${typeFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {FORM_TYPE_ICONS[val]} {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!forms?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-slate-900 mb-1">No consent forms found</p>
            <p className="text-slate-500 text-sm mb-4">Document patient consent and authorizations for treatment and services</p>
            <Link
              href={`/dashboard/consent-forms/new${clientFilter ? `?client_id=${clientFilter}` : ""}`}
              className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block"
            >
              + New Consent Form
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Form</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Signed</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Expires</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {forms.map(form => {
                const client = Array.isArray(form.client) ? form.client[0] : form.client;
                const expDate = form.expiration_date ? new Date(form.expiration_date + "T12:00:00") : null;
                const isExpiringSoon = expDate && form.status === "signed" && (expDate.getTime() - today.getTime()) / 86400000 <= 30 && expDate > today;
                const isExpired = expDate && expDate < today && form.status === "signed";
                return (
                  <tr key={form.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/clients/${form.client_id}`} className="no-underline">
                        <div className="font-semibold text-sm text-slate-900 hover:text-teal-600">
                          {client ? `${client.last_name}, ${client.first_name}` : "—"}
                        </div>
                        <div className="text-xs text-slate-400">{client?.mrn || "—"}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-sm text-slate-900">{form.title}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                        {FORM_TYPE_ICONS[form.form_type]} {FORM_TYPE_LABELS[form.form_type] || form.form_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {form.signed_at ? (
                        <div className="text-sm text-slate-600">
                          {new Date(form.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {form.signed_by && <div className="text-xs text-slate-400 capitalize">{form.signed_by.replace("_", " ")}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {expDate ? (
                        <div className={`text-sm ${isExpiringSoon ? "text-orange-600 font-semibold" : isExpired ? "text-red-500 font-semibold" : "text-slate-600"}`}>
                          {expDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {isExpiringSoon && " ⚠️"}
                          {isExpired && " EXPIRED"}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No expiry</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[form.status] || STATUS_COLORS.pending_signature}`}>
                        {form.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/consent-forms/${form.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">
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

      {/* Compliance note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800">
        <div className="font-semibold mb-1">ℹ️ Consent Tracking Best Practices</div>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>• Obtain written or electronic consent before beginning treatment, administering medications, or conducting telehealth sessions</li>
          <li>• HIPAA Notice of Privacy Practices must be provided at first encounter and re-offered annually</li>
          <li>• Document the method of signature (written, electronic, or verbal with documentation)</li>
          <li>• Set expiration dates for time-limited consents (e.g., 1 year for treatment consent) and renew proactively</li>
        </ul>
      </div>
    </div>
  );
}
