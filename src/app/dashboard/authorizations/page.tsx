import Link from "next/link";
import SearchInput from "@/components/SearchInput";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; next: string[] }> = {
  entered:    { label: "Entered",          color: "bg-slate-100 text-slate-600",   icon: "📝", next: ["submitted"] },
  submitted:  { label: "Submitted",        color: "bg-blue-100 text-blue-700",     icon: "📤", next: ["pending_review", "approved", "denied"] },
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: "⏳", next: ["approved", "denied"] },
  approved:   { label: "Approved",         color: "bg-emerald-100 text-emerald-700", icon: "✅", next: ["expired"] },
  denied:     { label: "Denied",           color: "bg-red-100 text-red-600",       icon: "❌", next: ["appealed"] },
  appealed:   { label: "Appealed",         color: "bg-purple-100 text-purple-700", icon: "⚖️", next: ["approved", "denied"] },
  expired:    { label: "Expired",          color: "bg-slate-100 text-slate-400",   icon: "📅", next: [] },
};

const PRIORITY_COLORS: Record<string, string> = {
  routine: "text-slate-500",
  urgent: "text-amber-600 font-semibold",
  emergent: "text-red-500 font-bold",
};

export default async function AuthorizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; patient_id?: string; client_id?: string; q?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const statusFilter = params.status || "";
  const patientId = params.client_id || params.patient_id || "";
  const q = (params.q || "").toLowerCase();

  let query = supabaseAdmin
    .from("authorizations")
    .select("*, client:client_id(first_name, last_name, mrn, preferred_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (patientId) query = query.eq("client_id", patientId);

  let { data: auths } = await query;
  if (q && auths) {
    auths = auths.filter((a: Record<string,unknown>) => {
      const patient = Array.isArray(a.patient) ? (a.patient as Record<string,string>[])[0] : a.patient as Record<string,string>;
      const patientName = `${patient?.first_name || ''} ${patient?.last_name || ''}`.toLowerCase();
      const payer = ((a.insurance_provider as string) || '').toLowerCase();
      const authNum = ((a.auth_number as string) || '').toLowerCase();
      return patientName.includes(q) || payer.includes(q) || authNum.includes(q);
    });
  }

  const counts = {
    entered: auths?.filter(a => a.status === "entered").length || 0,
    submitted: auths?.filter(a => a.status === "submitted").length || 0,
    pending_review: auths?.filter(a => a.status === "pending_review").length || 0,
    approved: auths?.filter(a => a.status === "approved").length || 0,
    denied: auths?.filter(a => a.status === "denied").length || 0,
  };

  const expiringsSoon = auths?.filter(a => {
    if (a.status !== "approved" || !a.end_date) return false;
    const daysLeft = Math.round((new Date(a.end_date).getTime() - Date.now()) / 86400000);
    return daysLeft >= 0 && daysLeft <= 30;
  }) || [];

  const sessionsLow = auths?.filter(a =>
    a.status === "approved" && a.sessions_approved &&
    (a.sessions_approved - (a.sessions_used || 0)) <= 3
  ) || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prior Authorizations</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track auth requests through the approval workflow</p>
        </div>
        <Link href="/dashboard/authorizations/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
          + New Auth Request
        </Link>
      </div>

      {/* Pipeline view */}
      <div className="grid grid-cols-5 gap-3">
        {(["entered", "submitted", "pending_review", "approved", "denied"] as const).map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = counts[s];
          return (
            <Link key={s} href={`/dashboard/authorizations?status=${s}`}
              className={`rounded-2xl border p-4 text-center transition-all hover:shadow-sm ${statusFilter === s ? "ring-2 ring-teal-500" : ""} ${s === "approved" ? "bg-emerald-50 border-emerald-100" : s === "denied" ? "bg-red-50 border-red-100" : "bg-white border-slate-200"}`}>
              <div className="text-2xl mb-1">{cfg.icon}</div>
              <div className="text-2xl font-bold text-slate-900">{count}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">{cfg.label}</div>
            </Link>
          );
        })}
      </div>

      <SearchInput placeholder="Search patient, payer, auth number..." />

      {/* Alerts */}
      {(expiringsSoon.length > 0 || sessionsLow.length > 0) && (
        <div className="space-y-2">
          {expiringsSoon.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">⏰</span>
                <span className="text-sm text-amber-800 font-medium">
                  {expiringsSoon.length} authorization{expiringsSoon.length > 1 ? "s expire" : " expires"} within 30 days — renew before services are interrupted
                </span>
              </div>
              <Link href="/dashboard/authorizations?expiring=true"
                className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-400 flex-shrink-0 whitespace-nowrap">
                View Expiring →
              </Link>
            </div>
          )}
          {sessionsLow.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
              <span className="text-xl">📊</span>
              <span className="text-sm text-amber-800 font-medium">
                {sessionsLow.length} patient{sessionsLow.length > 1 ? "s have" : " has"} 3 or fewer sessions remaining — request renewal soon
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[["", "All"], ["entered", "Entered"], ["submitted", "Submitted"], ["pending_review", "Pending"], ["approved", "Approved"], ["denied", "Denied"], ["appealed", "Appealed"]].map(([val, label]) => (
          <Link key={val} href={`/dashboard/authorizations?status=${val}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === val ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </Link>
        ))}
      </div>

      {/* Auth list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!auths?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-semibold text-slate-900 mb-1">No authorizations yet</p>
            <p className="text-slate-500 text-sm mb-4">Start by requesting a prior authorization for a patient</p>
            <Link href="/dashboard/authorizations/new"
              className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
              + New Auth Request
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payer</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Services</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sessions</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Auth Period</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {auths.map(auth => {
                const patient = Array.isArray(auth.patient) ? auth.patient[0] : auth.patient;
                const cfg = STATUS_CONFIG[auth.status] || STATUS_CONFIG.entered;
                const sessionsLeft = auth.sessions_approved ? auth.sessions_approved - (auth.sessions_used || 0) : null;
                const endDate = auth.end_date ? new Date(auth.end_date + "T12:00:00") : null;
                const daysLeft = endDate ? Math.round((endDate.getTime() - Date.now()) / 86400000) : null;
                const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft >= 0;
                const isLowSessions = sessionsLeft !== null && sessionsLeft <= 3;

                return (
                  <tr key={auth.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/dashboard/clients/${auth.patient_id}`} className="no-underline">
                        <div className="font-semibold text-slate-900 text-sm hover:text-teal-600">
                          {patient ? `${patient.last_name}, ${patient.first_name}` : "—"}
                        </div>
                        <div className="text-xs text-slate-400">{patient?.mrn || "—"}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">{auth.insurance_provider}</div>
                      {auth.auth_number && <div className="text-xs text-slate-400 font-mono">{auth.auth_number}</div>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {auth.cpt_codes?.slice(0, 2).map((c: string) => (
                          <span key={c} className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{c}</span>
                        ))}
                      </div>
                      {auth.priority !== "routine" && (
                        <div className={`text-xs mt-0.5 capitalize ${PRIORITY_COLORS[auth.priority]}`}>{auth.priority}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {auth.sessions_approved ? (
                        <div>
                          <div className={`text-sm font-semibold ${isLowSessions ? "text-amber-600" : "text-slate-900"}`}>
                            {auth.sessions_used || 0} / {auth.sessions_approved}
                          </div>
                          <div className="text-xs text-slate-400">{sessionsLeft} remaining</div>
                          {isLowSessions && <div className="text-xs text-amber-500 font-semibold">Low ⚠️</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {auth.start_date && auth.end_date ? (
                        <div>
                          <div className="text-xs text-slate-600">
                            {new Date(auth.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
                            {new Date(auth.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                          {isExpiringSoon && (
                            <div className="text-xs text-amber-500 font-semibold">{daysLeft}d left ⚠️</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/dashboard/authorizations/${auth.id}`}
                        className="text-teal-600 text-sm font-medium hover:text-teal-700">
                        Manage →
                      </Link>
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
