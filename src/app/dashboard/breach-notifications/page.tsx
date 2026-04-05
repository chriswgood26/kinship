import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-red-100 text-red-600",
  under_review: "bg-amber-100 text-amber-700",
  notifications_sent: "bg-blue-100 text-blue-700",
  reported_to_hhs: "bg-violet-100 text-violet-700",
  closed: "bg-emerald-100 text-emerald-700",
};

const RISK_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const BREACH_TYPE_LABELS: Record<string, string> = {
  unauthorized_access: "Unauthorized Access",
  theft: "Theft",
  loss: "Loss",
  improper_disposal: "Improper Disposal",
  hacking: "Hacking / IT Incident",
  ransomware: "Ransomware",
  wrong_recipient: "Wrong Recipient",
  other: "Other",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  return Math.round((d.getTime() - Date.now()) / 86400000);
}

export default async function BreachNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);

  const params = await searchParams;
  const statusFilter = params.status || "";

  let query = supabaseAdmin
    .from("breach_notifications")
    .select("*")
    .eq("organization_id", orgId)
    .order("discovered_date", { ascending: false })
    .limit(200);

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: breaches } = await query;

  const today = new Date();

  const openCount = breaches?.filter((b) => b.status === "open").length || 0;
  const overdue = (breaches || []).filter((b) => {
    const days = daysUntil(b.individual_notification_deadline);
    return days !== null && days < 0 && b.status !== "closed" && !b.individual_notification_sent_at;
  });
  const dueSoon = (breaches || []).filter((b) => {
    const days = daysUntil(b.individual_notification_deadline);
    return days !== null && days >= 0 && days <= 14 && b.status !== "closed" && !b.individual_notification_sent_at;
  });
  const hhsPending = (breaches || []).filter(
    (b) => b.status !== "closed" && !b.hhs_notification_submitted_at
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">HIPAA Breach Notifications</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track and manage breach notification obligations under 45 CFR §§164.400–414
          </p>
        </div>
        <Link
          href="/dashboard/breach-notifications/new"
          className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-red-400 transition-colors text-sm"
        >
          + Report Breach
        </Link>
      </div>

      {/* Urgency alerts */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <span className="text-sm text-red-800 font-medium">
            {overdue.length} breach{overdue.length > 1 ? "es have" : " has"} passed the 60-day individual notification deadline — immediate action required
          </span>
        </div>
      )}
      {dueSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-amber-800 font-medium">
            {dueSoon.length} breach{dueSoon.length > 1 ? "es have" : " has"} individual notification due within 14 days
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Open Breaches", value: openCount, color: openCount > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Notification Overdue", value: overdue.length, color: overdue.length > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200" },
          { label: "Notification Due ≤14d", value: dueSoon.length, color: dueSoon.length > 0 ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-200" },
          { label: "HHS Report Pending", value: hhsPending.length, color: hhsPending.length > 0 ? "bg-violet-50 border-violet-100" : "bg-slate-50 border-slate-200" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className="text-3xl font-bold text-slate-900">{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {[
          ["", "All"],
          ["open", "Open"],
          ["under_review", "Under Review"],
          ["notifications_sent", "Notified"],
          ["reported_to_hhs", "HHS Reported"],
          ["closed", "Closed"],
        ].map(([val, label]) => (
          <Link
            key={val}
            href={`/dashboard/breach-notifications?status=${val}`}
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

      {/* Breach list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {!breaches?.length ? (
          <div className="p-12 text-center">
            <div className="text-4xl mb-3">🔐</div>
            <p className="font-semibold text-slate-900 mb-1">No breach notifications recorded</p>
            <p className="text-slate-500 text-sm mb-4">
              Document any PHI breaches here to track your HIPAA notification obligations
            </p>
            <Link
              href="/dashboard/breach-notifications/new"
              className="bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-400 inline-block"
            >
              + Report First Breach
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {breaches.map((b) => {
              const indivDays = daysUntil(b.individual_notification_deadline);
              const isOverdue =
                indivDays !== null &&
                indivDays < 0 &&
                !b.individual_notification_sent_at &&
                b.status !== "closed";
              const isDueSoon =
                indivDays !== null &&
                indivDays >= 0 &&
                indivDays <= 14 &&
                !b.individual_notification_sent_at &&
                b.status !== "closed";

              return (
                <Link
                  key={b.id}
                  href={`/dashboard/breach-notifications/${b.id}`}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors no-underline"
                >
                  <div className="text-2xl flex-shrink-0 mt-0.5">🔓</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-slate-900 text-sm">
                        {BREACH_TYPE_LABELS[b.breach_type] || b.breach_type}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          RISK_COLORS[b.risk_level] || ""
                        }`}
                      >
                        {b.risk_level} risk
                      </span>
                      {isOverdue && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                          🚨 Notification Overdue
                        </span>
                      )}
                      {isDueSoon && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          ⚠️ Due in {indivDays}d
                        </span>
                      )}
                      {b.individuals_affected >= 500 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          📰 Media Notice Required
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 line-clamp-1 mt-0.5">{b.description}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Discovered:{" "}
                      {new Date(b.discovered_date + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {b.individuals_affected != null && (
                        <> · {b.individuals_affected.toLocaleString()} individual{b.individuals_affected !== 1 ? "s" : ""} affected</>
                      )}
                      {b.individual_notification_deadline && (
                        <>
                          {" "}
                          · Notify by:{" "}
                          {new Date(
                            b.individual_notification_deadline + "T12:00:00"
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize inline-block ${
                        STATUS_COLORS[b.status] || ""
                      }`}
                    >
                      {b.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Regulatory reference */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-800">
        <div className="font-semibold mb-1">ℹ️ HIPAA Breach Notification Requirements (45 CFR §§164.400–414)</div>
        <ul className="space-y-1 text-xs text-blue-700">
          <li>
            • <strong>Individual notification:</strong> Notify affected individuals by first-class mail (or email if authorized) within <strong>60 calendar days</strong> of breach discovery
          </li>
          <li>
            • <strong>HHS notification:</strong> Report all breaches to the HHS Secretary within 60 days; breaches affecting &lt;500 may be submitted in an annual log by <strong>March 1</strong> of the following year
          </li>
          <li>
            • <strong>Media notification:</strong> If ≥500 individuals in a single state or jurisdiction are affected, notify prominent media outlets in that state within 60 days
          </li>
          <li>
            • <strong>Business associate breaches:</strong> A BA must notify the covered entity of a breach without unreasonable delay and within 60 days of discovery
          </li>
          <li>
            • Maintain breach documentation for <strong>6 years</strong> from the date of creation or last effective date
          </li>
        </ul>
      </div>
    </div>
  );
}
