"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Incident {
  id: string;
  status: string;
  severity: string;
  state_report_required: boolean;
  state_report_submitted_at: string | null;
  guardian_notified_at: string | null;
  supervisor_notified_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  follow_up_actions: string | null;
}

export default function IncidentStatusManager({ incident }: { incident: Incident }) {
  const [data, setData] = useState(incident);
  const [saving, setSaving] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState(incident.follow_up_actions || "");
  const [reviewer, setReviewer] = useState(incident.reviewed_by || "");
  const router = useRouter();

  async function update(patch: Record<string, string | boolean | null>) {
    const res = await fetch(`/api/incidents/${incident.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setData(d => ({ ...d, ...patch }));
      router.refresh();
    }
  }

  async function notify(type: "guardian" | "supervisor") {
    setSaving(type);
    const field = type === "guardian" ? "guardian_notified_at" : "supervisor_notified_at";
    await update({ [field]: new Date().toISOString() });
    setSaving(null);
  }

  async function submitToState() {
    setSaving("state");
    await update({ state_report_submitted_at: new Date().toISOString(), status: "submitted_to_state" });
    setSaving(null);
  }

  async function closeIncident() {
    setSaving("close");
    await update({ status: "closed", reviewed_by: reviewer, reviewed_at: new Date().toISOString(), follow_up_actions: followUp });
    setSaving(null);
  }

  const STATUS_FLOW = [
    { key: "open", label: "Open", icon: "🔴" },
    { key: "under_review", label: "Under Review", icon: "🔍" },
    { key: "submitted_to_state", label: "Submitted to State", icon: "📤" },
    { key: "closed", label: "Closed", icon: "✅" },
  ];

  const currentStepIdx = STATUS_FLOW.findIndex(s => s.key === data.status);

  return (
    <div className="space-y-4">
      {/* Status progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-4">Incident Status</h3>
        <div className="flex items-center gap-0">
          {STATUS_FLOW.map((step, i) => {
            const isCompleted = i < currentStepIdx;
            const isCurrent = i === currentStepIdx;
            const isLast = i === STATUS_FLOW.length - 1;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${isCompleted ? "bg-teal-500 text-white" : isCurrent ? "bg-red-100 text-red-600 border-2 border-red-400" : "bg-slate-100 text-slate-400"}`}>
                    {isCompleted ? "✓" : step.icon}
                  </div>
                  <div className={`text-xs mt-1 font-medium text-center ${isCurrent ? "text-red-600" : isCompleted ? "text-slate-600" : "text-slate-400"}`}>{step.label}</div>
                </div>
                {!isLast && <div className={`h-0.5 flex-1 mx-1 rounded ${i < currentStepIdx ? "bg-teal-500" : "bg-slate-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notification tracking */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-900 mb-3">Required Notifications</h3>
        <div className="space-y-3">
          {[
            { key: "guardian" as const, label: "Guardian / Family", value: data.guardian_notified_at, icon: "👨‍👩‍👧", required: true },
            { key: "supervisor" as const, label: "Program Supervisor", value: data.supervisor_notified_at, icon: "👔", required: true },
          ].map(n => (
            <div key={n.key} className={`flex items-center gap-3 rounded-xl p-3.5 border ${n.value ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
              <span className="text-xl">{n.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900">{n.label}</div>
                {n.value ? (
                  <div className="text-xs text-emerald-600">✓ Notified {new Date(n.value).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                ) : (
                  <div className="text-xs text-amber-600 font-medium">⏳ Notification pending</div>
                )}
              </div>
              {!n.value && (
                <button onClick={() => notify(n.key)} disabled={saving === n.key}
                  className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-400 disabled:opacity-50">
                  {saving === n.key ? "..." : "Mark Notified"}
                </button>
              )}
            </div>
          ))}

          {data.state_report_required && (
            <div className={`flex items-center gap-3 rounded-xl p-3.5 border ${data.state_report_submitted_at ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-200"}`}>
              <span className="text-xl">🏛️</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-900">State Agency Report</div>
                {data.state_report_submitted_at ? (
                  <div className="text-xs text-emerald-600">✓ Submitted {new Date(data.state_report_submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                ) : (
                  <div className="text-xs text-red-600 font-semibold">🚨 Required — submit within 24-72 hours</div>
                )}
              </div>
              {!data.state_report_submitted_at && (
                <button onClick={submitToState} disabled={saving === "state"}
                  className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-400 disabled:opacity-50">
                  {saving === "state" ? "..." : "Mark Submitted"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review & close */}
      {data.status !== "closed" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900">Review & Close</h3>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Reviewer Name</label>
            <input value={reviewer} onChange={e => setReviewer(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Reviewing supervisor..." />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Follow-Up Actions</label>
            <textarea value={followUp} onChange={e => setFollowUp(e.target.value)} rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Behavior plan update, staff training, safety modifications, follow-up appointment..." />
          </div>
          <button onClick={closeIncident} disabled={saving === "close" || !reviewer}
            className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
            {saving === "close" ? "Closing..." : "✅ Close Incident"}
          </button>
        </div>
      )}

      {data.status === "closed" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="font-semibold text-emerald-800 mb-1">✅ Incident Closed</div>
          {data.reviewed_by && <div className="text-sm text-emerald-700">Reviewed by: {data.reviewed_by}</div>}
          {data.reviewed_at && <div className="text-xs text-emerald-600 mt-0.5">{new Date(data.reviewed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
          {data.follow_up_actions && <div className="text-sm text-emerald-700 mt-2 border-t border-emerald-200 pt-2"><span className="font-semibold">Follow-up:</span> {data.follow_up_actions}</div>}
        </div>
      )}
    </div>
  );
}
