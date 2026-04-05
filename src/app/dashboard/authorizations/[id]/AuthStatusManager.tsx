"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Auth {
  id: string;
  status: string;
  sessions_approved: number | null;
  sessions_used: number;
  auth_number: string | null;
  expiration_date?: string | null;
  patient_id?: string;
  payer_name?: string;
  cpt_code?: string;
  icd10_codes?: string[];
}

const TRANSITIONS: Record<string, { label: string; next: string; color: string; fields?: string[] }[]> = {
  entered: [
    { label: "📤 Submit to Payer", next: "submitted", color: "bg-blue-500 hover:bg-blue-400", fields: [] },
  ],
  submitted: [
    { label: "⏳ Mark Pending Review", next: "pending_review", color: "bg-amber-500 hover:bg-amber-400", fields: [] },
    { label: "✅ Mark Approved", next: "approved", color: "bg-emerald-500 hover:bg-emerald-400", fields: ["auth_number", "sessions_approved", "decision_date"] },
    { label: "❌ Mark Denied", next: "denied", color: "bg-red-500 hover:bg-red-400", fields: ["denial_reason", "decision_date"] },
  ],
  pending_review: [
    { label: "✅ Mark Approved", next: "approved", color: "bg-emerald-500 hover:bg-emerald-400", fields: ["auth_number", "sessions_approved", "decision_date"] },
    { label: "❌ Mark Denied", next: "denied", color: "bg-red-500 hover:bg-red-400", fields: ["denial_reason", "decision_date"] },
  ],
  denied: [
    { label: "⚖️ File Appeal", next: "appealed", color: "bg-purple-500 hover:bg-purple-400", fields: ["appeal_notes", "appeal_date"] },
  ],
  appealed: [
    { label: "✅ Appeal Approved", next: "approved", color: "bg-emerald-500 hover:bg-emerald-400", fields: ["auth_number", "sessions_approved", "decision_date"] },
    { label: "❌ Appeal Denied", next: "denied", color: "bg-red-500 hover:bg-red-400", fields: ["denial_reason"] },
  ],
  approved: [
    { label: "📅 Mark Expired", next: "expired", color: "bg-slate-500 hover:bg-slate-400", fields: [] },
  ],
};

export default function AuthStatusManager({ auth }: { auth: Auth }) {
  const [activeTransition, setActiveTransition] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    auth_number: auth.auth_number || "",
    sessions_approved: auth.sessions_approved?.toString() || "",
    sessions_used: auth.sessions_used?.toString() || "0",
    decision_date: new Date().toISOString().split("T")[0],
    denial_reason: "",
    appeal_notes: "",
    appeal_date: new Date().toISOString().split("T")[0],
  });
  const router = useRouter();

  const transitions = TRANSITIONS[auth.status] || [];
  const activeT = transitions.find(t => t.next === activeTransition);

  async function handleTransition() {
    if (!activeTransition) return;
    setSaving(true);
    await fetch(`/api/authorizations/${auth.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        status: activeTransition,
        ...(formData.auth_number && { auth_number: formData.auth_number }),
        ...(formData.sessions_approved && { sessions_approved: parseInt(formData.sessions_approved) }),
        ...(formData.decision_date && { decision_date: formData.decision_date }),
        ...(formData.denial_reason && { denial_reason: formData.denial_reason }),
        ...(formData.appeal_notes && { appeal_notes: formData.appeal_notes }),
        ...(formData.appeal_date && { appeal_date: formData.appeal_date }),
        updated_at: new Date().toISOString(),
      }),
    });
    setSaving(false);
    setActiveTransition(null);
    router.refresh();
  }

  async function updateSessionsUsed(delta: number) {
    const current = auth.sessions_used || 0;
    const newVal = Math.max(0, current + delta);
    await fetch(`/api/authorizations/${auth.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessions_used: newVal }),
    });
    router.refresh();
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="space-y-4">
      {/* Session tracker for approved auths */}
      {auth.status === "approved" && auth.sessions_approved && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Track Sessions Used</h3>
          <div className="flex items-center gap-4">
            <button onClick={() => updateSessionsUsed(-1)}
              className="w-10 h-10 rounded-xl border border-slate-200 text-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center">−</button>
            <div className="flex-1 text-center">
              <div className="text-3xl font-bold text-slate-900">{auth.sessions_used || 0}</div>
              <div className="text-sm text-slate-400">of {auth.sessions_approved} sessions used</div>
            </div>
            <button onClick={() => updateSessionsUsed(1)}
              className="w-10 h-10 rounded-xl border border-slate-200 text-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center">+</button>
          </div>
        </div>
      )}

      {/* Status transitions */}
      {transitions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Move to Next Status</h3>
          <div className="flex flex-wrap gap-2">
            {transitions.map(t => (
              <button key={t.next} onClick={() => setActiveTransition(activeTransition === t.next ? null : t.next)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${t.color} ${activeTransition === t.next ? "ring-2 ring-offset-2 ring-slate-400" : ""}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Transition form */}
          {activeT && activeT.fields && activeT.fields.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              {activeT.fields.includes("auth_number") && (
                <div>
                  <label className={labelClass}>Authorization Number</label>
                  <input value={formData.auth_number} onChange={e => setFormData(f => ({ ...f, auth_number: e.target.value }))}
                    className={inputClass} placeholder="PA-2026-XXXXX" />
                </div>
              )}
              {activeT.fields.includes("sessions_approved") && (
                <div>
                  <label className={labelClass}>Sessions Approved</label>
                  <input type="number" value={formData.sessions_approved} onChange={e => setFormData(f => ({ ...f, sessions_approved: e.target.value }))}
                    className={inputClass} placeholder="e.g. 30" min={1} />
                </div>
              )}
              {activeT.fields.includes("decision_date") && (
                <div>
                  <label className={labelClass}>Decision Date</label>
                  <input type="date" value={formData.decision_date} onChange={e => setFormData(f => ({ ...f, decision_date: e.target.value }))}
                    className={inputClass} />
                </div>
              )}
              {activeT.fields.includes("denial_reason") && (
                <div>
                  <label className={labelClass}>Denial Reason</label>
                  <textarea value={formData.denial_reason} onChange={e => setFormData(f => ({ ...f, denial_reason: e.target.value }))}
                    rows={2} className={inputClass + " resize-none"} placeholder="Payer denial reason..." />
                </div>
              )}
              {activeT.fields.includes("appeal_notes") && (
                <div>
                  <label className={labelClass}>Appeal Notes</label>
                  <textarea value={formData.appeal_notes} onChange={e => setFormData(f => ({ ...f, appeal_notes: e.target.value }))}
                    rows={2} className={inputClass + " resize-none"} placeholder="Grounds for appeal, additional clinical justification..." />
                </div>
              )}
              {activeT.fields.includes("appeal_date") && (
                <div>
                  <label className={labelClass}>Appeal Date</label>
                  <input type="date" value={formData.appeal_date} onChange={e => setFormData(f => ({ ...f, appeal_date: e.target.value }))}
                    className={inputClass} />
                </div>
              )}
              <button onClick={handleTransition} disabled={saving}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${activeT.color}`}>
                {saving ? "Updating..." : `Confirm — ${activeT.label}`}
              </button>
            </div>
          )}

          {/* Transitions with no extra fields */}
          {activeT && (!activeT.fields || activeT.fields.length === 0) && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <button onClick={handleTransition} disabled={saving}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${activeT.color}`}>
                {saving ? "Updating..." : `Confirm — ${activeT.label}`}
              </button>
            </div>
          )}
        </div>
      )}

      {["denied", "expired"].includes(auth.status) && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-sm text-slate-500">
          {auth.status === "denied" ? "This authorization was denied. File an appeal above or create a new request." : "This authorization has expired. Create a new request for continued services."}
          <div className="mt-2">
            <a href="/dashboard/authorizations/new" className="text-teal-600 font-medium hover:text-teal-700">+ New Auth Request →</a>
          </div>
        </div>
      )}
    </div>
  );
}
