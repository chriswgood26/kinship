"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Referral {
  id: string;
  referral_type: string;
  status: string;
  priority: string;
  referred_by: string | null;
  referred_to: string | null;
  referred_to_org: string | null;
  reason: string | null;
  notes: string | null;
  due_date: string | null;
}

const STATUSES = ["pending", "accepted", "declined", "completed", "cancelled"];
const PRIORITIES = ["routine", "urgent", "emergent"];

export default function ReferralEditButton({ referral }: { referral: Referral }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: referral.status,
    priority: referral.priority,
    referred_by: referral.referred_by || "",
    referred_to: referral.referred_to || "",
    referred_to_org: referral.referred_to_org || "",
    reason: referral.reason || "",
    notes: referral.notes || "",
    due_date: referral.due_date || "",
  });
  const router = useRouter();
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/referrals/${referral.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-teal-600 text-sm font-medium hover:text-teal-700">
        Edit
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg">Edit Referral</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={e => set("status", e.target.value)} className={inputClass}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputClass}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{referral.referral_type === "incoming" ? "Referred By" : "Referred To"}</label>
                <input type="text" value={referral.referral_type === "incoming" ? form.referred_by : form.referred_to}
                  onChange={e => set(referral.referral_type === "incoming" ? "referred_by" : "referred_to", e.target.value)}
                  className={inputClass} placeholder="Provider name..." />
              </div>
              <div>
                <label className={labelClass}>Organization</label>
                <input type="text" value={form.referred_to_org} onChange={e => set("referred_to_org", e.target.value)}
                  className={inputClass} placeholder="Organization..." />
              </div>
            </div>

            <div>
              <label className={labelClass}>Due Date</label>
              <input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Reason</label>
              <textarea value={form.reason} onChange={e => set("reason", e.target.value)} rows={2}
                className={inputClass + " resize-none"} placeholder="Clinical reason..." />
            </div>

            <div>
              <label className={labelClass}>Notes</label>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
                className={inputClass + " resize-none"} placeholder="Additional notes..." />
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setOpen(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
