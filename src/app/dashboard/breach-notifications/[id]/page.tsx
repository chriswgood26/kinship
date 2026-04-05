import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getOrgId } from "@/lib/getOrgId";
import BreachStatusManager from "./BreachStatusManager";

export const dynamic = "force-dynamic";

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

export default async function BreachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const orgId = await getOrgId(userId);
  const { id } = await params;

  const { data: breach } = await supabaseAdmin
    .from("breach_notifications")
    .select("*")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!breach) notFound();

  const today = new Date();
  const deadline = breach.individual_notification_deadline
    ? new Date(breach.individual_notification_deadline + "T12:00:00")
    : null;
  const daysLeft = deadline
    ? Math.round((deadline.getTime() - today.getTime()) / 86400000)
    : null;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/breach-notifications" className="text-slate-400 hover:text-slate-700">
            ←
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">
                {BREACH_TYPE_LABELS[breach.breach_type] || breach.breach_type}
              </h1>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                  RISK_COLORS[breach.risk_level] || ""
                }`}
              >
                {breach.risk_level} risk
              </span>
              {daysLeft !== null && daysLeft < 0 && !breach.individual_notification_sent_at && (
                <span className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-semibold">
                  🚨 Notification Overdue
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-0.5">
              Discovered{" "}
              {new Date(breach.discovered_date + "T12:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Key details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Breach Details</h2>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Discovered</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {new Date(breach.discovered_date + "T12:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </dd>
          </div>
          {breach.breach_date && (
            <div>
              <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Breach Occurred</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {new Date(breach.breach_date + "T12:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Individuals Affected</dt>
            <dd className="font-medium text-slate-900 mt-0.5">
              {breach.individuals_affected != null
                ? breach.individuals_affected.toLocaleString()
                : "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Notify By (60-day)</dt>
            <dd
              className={`font-medium mt-0.5 ${
                daysLeft !== null && daysLeft < 0
                  ? "text-red-600"
                  : daysLeft !== null && daysLeft <= 14
                  ? "text-amber-600"
                  : "text-slate-900"
              }`}
            >
              {deadline
                ? deadline.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"}
              {daysLeft !== null && daysLeft >= 0 && !breach.individual_notification_sent_at && (
                <span className="text-xs font-normal block">
                  {daysLeft === 0 ? "Due today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                </span>
              )}
              {daysLeft !== null && daysLeft < 0 && !breach.individual_notification_sent_at && (
                <span className="text-xs font-normal block text-red-500">
                  {Math.abs(daysLeft)} day{Math.abs(daysLeft) !== 1 ? "s" : ""} overdue
                </span>
              )}
            </dd>
          </div>
          {breach.business_associate_involved && (
            <div>
              <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Business Associate</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{breach.business_associate_name || "Yes (unnamed)"}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Legal Counsel</dt>
            <dd className={`font-medium mt-0.5 ${breach.legal_counsel_notified ? "text-emerald-600" : "text-amber-600"}`}>
              {breach.legal_counsel_notified ? "✓ Notified" : "⏳ Pending"}
            </dd>
          </div>
        </dl>
      </div>

      {/* PHI types */}
      {breach.phi_types?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-3">PHI Types Involved</h2>
          <div className="flex flex-wrap gap-2">
            {breach.phi_types.map((t: string) => (
              <span key={t} className="text-xs bg-red-50 border border-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Narrative */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        {[
          { label: "Breach Description", value: breach.description },
          { label: "Root Cause", value: breach.breach_cause },
          { label: "Risk Assessment Notes", value: breach.risk_assessment_notes },
          { label: "Remediation Actions", value: breach.remediation_actions },
        ].map(
          (s) =>
            s.value && (
              <div key={s.label}>
                <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">
                  {s.label}
                </dt>
                <dd className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3">
                  {s.value}
                </dd>
              </div>
            )
        )}
      </div>

      {/* Status & notification manager */}
      <BreachStatusManager breach={breach} />
    </div>
  );
}
