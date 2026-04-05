"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Breach {
  id: string;
  status: string;
  individuals_affected: number | null;
  individual_notification_deadline: string | null;
  individual_notification_sent_at: string | null;
  individual_notification_method: string | null;
  hhs_notification_deadline: string | null;
  hhs_notification_submitted_at: string | null;
  hhs_submission_type: string | null;
  media_notification_required: boolean;
  media_notification_sent_at: string | null;
  legal_counsel_notified: boolean;
  legal_counsel_notified_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

const STATUS_FLOW = [
  { key: "open", label: "Open", icon: "🔴" },
  { key: "under_review", label: "Under Review", icon: "🔍" },
  { key: "notifications_sent", label: "Individuals Notified", icon: "📬" },
  { key: "reported_to_hhs", label: "HHS Reported", icon: "🏛️" },
  { key: "closed", label: "Closed", icon: "✅" },
];

export default function BreachStatusManager({ breach }: { breach: Breach }) {
  const [data, setData] = useState(breach);
  const [saving, setSaving] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState(breach.reviewed_by || "");
  const [indivMethod, setIndivMethod] = useState(
    breach.individual_notification_method || "mail"
  );
  const [hhsType, setHhsType] = useState(
    breach.hhs_submission_type ||
      ((breach.individuals_affected ?? 0) >= 500 ? "immediate" : "annual")
  );
  const router = useRouter();

  async function patch(fields: Record<string, string | boolean | null>) {
    const res = await fetch(`/api/breach-notifications/${breach.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const json = await res.json();
      setData((d) => ({ ...d, ...json.breach }));
      router.refresh();
    }
  }

  async function markIndividualsNotified() {
    setSaving("indiv");
    await patch({
      individual_notification_sent_at: new Date().toISOString(),
      individual_notification_method: indivMethod,
      status: data.status === "open" || data.status === "under_review" ? "notifications_sent" : data.status,
    });
    setSaving(null);
  }

  async function markHhsSubmitted() {
    setSaving("hhs");
    await patch({
      hhs_notification_submitted_at: new Date().toISOString(),
      hhs_submission_type: hhsType,
      status: "reported_to_hhs",
    });
    setSaving(null);
  }

  async function markMediaNotified() {
    setSaving("media");
    await patch({ media_notification_sent_at: new Date().toISOString() });
    setSaving(null);
  }

  async function markLegalNotified() {
    setSaving("legal");
    await patch({
      legal_counsel_notified: true,
      legal_counsel_notified_at: new Date().toISOString(),
    });
    setSaving(null);
  }

  async function closeBreach() {
    if (!reviewer) return;
    setSaving("close");
    await patch({
      status: "closed",
      reviewed_by: reviewer,
      reviewed_at: new Date().toISOString(),
    });
    setSaving(null);
  }

  const currentStepIdx = STATUS_FLOW.findIndex((s) => s.key === data.status);

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";

  function fmt(dt: string | null) {
    if (!dt) return null;
    return new Date(dt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      {/* Status progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Breach Status</h3>
        <div className="flex items-center gap-0">
          {STATUS_FLOW.map((step, i) => {
            const isCompleted = i < currentStepIdx;
            const isCurrent = i === currentStepIdx;
            const isLast = i === STATUS_FLOW.length - 1;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                      isCompleted
                        ? "bg-teal-500 text-white"
                        : isCurrent
                        ? "bg-red-100 text-red-600 border-2 border-red-400"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? "✓" : step.icon}
                  </div>
                  <div
                    className={`text-xs mt-1 font-medium text-center leading-tight ${
                      isCurrent ? "text-red-600" : isCompleted ? "text-slate-600" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </div>
                </div>
                {!isLast && (
                  <div
                    className={`h-0.5 flex-1 mx-1 rounded ${
                      i < currentStepIdx ? "bg-teal-500" : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notification checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">HIPAA Notification Checklist</h3>
        <div className="space-y-3">
          {/* Legal counsel */}
          <div
            className={`flex items-center gap-3 rounded-xl p-3.5 border ${
              data.legal_counsel_notified
                ? "bg-emerald-50 border-emerald-100"
                : "bg-amber-50 border-amber-100"
            }`}
          >
            <span className="text-xl">⚖️</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">Legal Counsel</div>
              {data.legal_counsel_notified ? (
                <div className="text-xs text-emerald-600">
                  ✓ Notified{data.legal_counsel_notified_at ? ` ${fmt(data.legal_counsel_notified_at)}` : ""}
                </div>
              ) : (
                <div className="text-xs text-amber-600 font-medium">⏳ Recommended before notification letters</div>
              )}
            </div>
            {!data.legal_counsel_notified && (
              <button
                onClick={markLegalNotified}
                disabled={saving === "legal"}
                className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-400 disabled:opacity-50"
              >
                {saving === "legal" ? "..." : "Mark Notified"}
              </button>
            )}
          </div>

          {/* Individual notification */}
          <div
            className={`flex items-start gap-3 rounded-xl p-3.5 border ${
              data.individual_notification_sent_at
                ? "bg-emerald-50 border-emerald-100"
                : "bg-red-50 border-red-200"
            }`}
          >
            <span className="text-xl">📬</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">Individual Notification</div>
              {data.individual_notification_sent_at ? (
                <div className="text-xs text-emerald-600">
                  ✓ Sent {fmt(data.individual_notification_sent_at)} via{" "}
                  {data.individual_notification_method?.replace("_", " ") || "—"}
                </div>
              ) : (
                <>
                  <div className="text-xs text-red-600 font-medium">
                    🚨 Required within 60 days of discovery (45 CFR §164.404)
                  </div>
                  <div className="mt-2 flex gap-2 items-center">
                    <select
                      value={indivMethod}
                      onChange={(e) => setIndivMethod(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-400"
                    >
                      <option value="mail">First-class mail</option>
                      <option value="email">Email (if authorized)</option>
                      <option value="substitute_notice">Substitute notice (10+ bad addresses)</option>
                      <option value="conspicuous_posting">Conspicuous posting (website/media)</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            {!data.individual_notification_sent_at && (
              <button
                onClick={markIndividualsNotified}
                disabled={saving === "indiv"}
                className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-400 disabled:opacity-50 flex-shrink-0"
              >
                {saving === "indiv" ? "..." : "Mark Sent"}
              </button>
            )}
          </div>

          {/* HHS notification */}
          <div
            className={`flex items-start gap-3 rounded-xl p-3.5 border ${
              data.hhs_notification_submitted_at
                ? "bg-emerald-50 border-emerald-100"
                : "bg-violet-50 border-violet-100"
            }`}
          >
            <span className="text-xl">🏛️</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-900">HHS Secretary Notification</div>
              {data.hhs_notification_submitted_at ? (
                <div className="text-xs text-emerald-600">
                  ✓ Submitted {fmt(data.hhs_notification_submitted_at)}{" "}
                  ({data.hhs_submission_type === "immediate" ? "immediate" : "annual log"})
                </div>
              ) : (
                <>
                  <div className="text-xs text-violet-700 font-medium">
                    Required per 45 CFR §164.408 — via HHS breach portal
                  </div>
                  <div className="mt-2 flex gap-2 items-center">
                    <select
                      value={hhsType}
                      onChange={(e) => setHhsType(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-400"
                    >
                      <option value="immediate">Immediate (≥500 individuals)</option>
                      <option value="annual">Annual log ({"<"}500 individuals)</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            {!data.hhs_notification_submitted_at && (
              <button
                onClick={markHhsSubmitted}
                disabled={saving === "hhs"}
                className="text-xs bg-violet-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-violet-400 disabled:opacity-50 flex-shrink-0"
              >
                {saving === "hhs" ? "..." : "Mark Submitted"}
              </button>
            )}
          </div>

          {/* Media notification (only if ≥500) */}
          {(data.media_notification_required || (data.individuals_affected ?? 0) >= 500) && (
            <div
              className={`flex items-center gap-3 rounded-xl p-3.5 border ${
                data.media_notification_sent_at
                  ? "bg-emerald-50 border-emerald-100"
                  : "bg-orange-50 border-orange-200"
              }`}
            >
              <span className="text-xl">📰</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900">Media Notification</div>
                {data.media_notification_sent_at ? (
                  <div className="text-xs text-emerald-600">
                    ✓ Sent {fmt(data.media_notification_sent_at)}
                  </div>
                ) : (
                  <div className="text-xs text-orange-700 font-medium">
                    ≥500 individuals affected — notify prominent media within 60 days (45 CFR §164.406)
                  </div>
                )}
              </div>
              {!data.media_notification_sent_at && (
                <button
                  onClick={markMediaNotified}
                  disabled={saving === "media"}
                  className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-orange-400 disabled:opacity-50"
                >
                  {saving === "media" ? "..." : "Mark Sent"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Close breach */}
      {data.status !== "closed" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900">Close Breach Record</h3>
          <p className="text-xs text-slate-500">
            Close only after all required notifications have been completed and documented.
            Records must be retained for <strong>6 years</strong>.
          </p>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Reviewed By
            </label>
            <input
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              className={inputClass}
              placeholder="Privacy Officer / Compliance Officer name..."
            />
          </div>
          <button
            onClick={closeBreach}
            disabled={saving === "close" || !reviewer}
            className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50"
          >
            {saving === "close" ? "Closing..." : "✅ Close Breach Record"}
          </button>
        </div>
      )}

      {data.status === "closed" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="font-semibold text-emerald-800 mb-1">✅ Breach Record Closed</div>
          {data.reviewed_by && (
            <div className="text-sm text-emerald-700">Reviewed by: {data.reviewed_by}</div>
          )}
          {data.reviewed_at && (
            <div className="text-xs text-emerald-600 mt-0.5">{fmt(data.reviewed_at)}</div>
          )}
          <div className="text-xs text-emerald-600 mt-2 border-t border-emerald-200 pt-2">
            Retain this record for 6 years per HIPAA documentation requirements
          </div>
        </div>
      )}
    </div>
  );
}
