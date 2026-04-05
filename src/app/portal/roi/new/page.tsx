"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const PURPOSES = [
  "Sharing records with another healthcare provider",
  "Insurance / billing purposes",
  "Legal or court-ordered purposes",
  "Employment or disability benefits",
  "Personal copy of my records",
  "Sharing with a family member or caregiver",
  "School or education records",
  "Other",
];

const INFO_TYPES = [
  "Mental health treatment records",
  "Medication and prescription records",
  "Therapy and counseling notes",
  "My treatment plan and goals",
  "Discharge summary",
  "Lab results",
  "Billing records",
  "Diagnosis information",
  "Progress notes",
  "All of my records",
];

function PortalROIForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedInfo, setSelectedInfo] = useState<string[]>([]);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    recipient_name: "",
    recipient_organization: "",
    recipient_phone: "",
    recipient_fax: "",
    recipient_address: "",
    purpose: "",
    specific_information: "",
    expiration_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    notes: "",
  });

  function toggleInfo(info: string) {
    if (info === "All of my records") { setSelectedInfo(["All of my records"]); return; }
    setSelectedInfo(prev =>
      prev.includes(info) ? prev.filter(i => i !== info) : [...prev.filter(i => i !== "All of my records"), info]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.recipient_name || !form.purpose || selectedInfo.length === 0) {
      setError("Please fill in the recipient, purpose, and select what to share");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/portal/roi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...form, information_to_release: selectedInfo }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to submit"); setSaving(false); return; }
    router.push("/portal/roi");
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-sm font-semibold text-slate-700 block mb-1.5";

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/portal/roi" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Request a Release of Information</h1>
          <p className="text-slate-500 text-sm mt-0.5">Authorize us to share your health records</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-400"}`}>{s}</div>
            {s < 3 && <div className={`h-0.5 w-12 ${step > s ? "bg-teal-500" : "bg-slate-200"}`} />}
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-2">{step === 1 ? "Who to send to" : step === 2 ? "What to share" : "Confirm & submit"}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1 — Recipient */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Who should receive your records?</h2>
            <div>
              <label className={labelClass}>Name or Organization *</label>
              <input value={form.recipient_name} onChange={e => setForm(f => ({ ...f, recipient_name: e.target.value }))}
                className={inputClass} placeholder="e.g. Dr. Smith, Providence Medical Center" />
            </div>
            <div>
              <label className={labelClass}>Organization (if different from name)</label>
              <input value={form.recipient_organization} onChange={e => setForm(f => ({ ...f, recipient_organization: e.target.value }))}
                className={inputClass} placeholder="Hospital, clinic, or agency name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Phone</label>
                <input value={form.recipient_phone} onChange={e => setForm(f => ({ ...f, recipient_phone: e.target.value }))}
                  className={inputClass} placeholder="Phone number" />
              </div>
              <div>
                <label className={labelClass}>Fax</label>
                <input value={form.recipient_fax} onChange={e => setForm(f => ({ ...f, recipient_fax: e.target.value }))}
                  className={inputClass} placeholder="Fax number" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input value={form.recipient_address} onChange={e => setForm(f => ({ ...f, recipient_address: e.target.value }))}
                className={inputClass} placeholder="Street address, city, state, zip" />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={() => { if (!form.recipient_name) { setError("Please enter a recipient name"); return; } setError(""); setStep(2); }}
                className="bg-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-teal-400">
                Next: What to share →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — What to share */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-900">What records should we share?</h2>
            <div>
              <label className={labelClass}>Purpose for this release *</label>
              <select value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} className={inputClass}>
                <option value="">Select a reason...</option>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass + " mb-2"}>What information to include * (select all that apply)</label>
              <div className="space-y-2">
                {INFO_TYPES.map(info => (
                  <label key={info} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedInfo.includes(info) ? "bg-teal-50 border-teal-300" : "border-slate-200 hover:border-slate-300"}`}>
                    <input type="checkbox" checked={selectedInfo.includes(info)} onChange={() => toggleInfo(info)} className="w-4 h-4 accent-teal-500 flex-shrink-0" />
                    <span className="text-sm text-slate-900">{info}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>Any specific dates or limitations? (optional)</label>
              <textarea value={form.specific_information} onChange={e => setForm(f => ({ ...f, specific_information: e.target.value }))}
                rows={2} className={inputClass + " resize-none"} placeholder="e.g. Records from January 2025 only" />
            </div>
            <div>
              <label className={labelClass}>How long should this authorization last?</label>
              <input type="date" value={form.expiration_date} onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))} className={inputClass} />
              <p className="text-xs text-slate-400 mt-1">You can revoke this authorization at any time by contacting us.</p>
            </div>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
              <button type="button" onClick={() => { if (!form.purpose || selectedInfo.length === 0) { setError("Please select a purpose and what to share"); return; } setError(""); setStep(3); }}
                className="bg-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-teal-400">
                Next: Review →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Review & submit */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-semibold text-slate-900 mb-4">Review Your Request</h2>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Send records to</dt><dd className="font-medium text-slate-900 mt-0.5">{form.recipient_name}{form.recipient_organization ? ` · ${form.recipient_organization}` : ""}</dd></div>
                <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Purpose</dt><dd className="font-medium text-slate-900 mt-0.5">{form.purpose}</dd></div>
                <div>
                  <dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide mb-1">Records to share</dt>
                  <dd className="flex flex-wrap gap-1">
                    {selectedInfo.map(i => <span key={i} className="text-xs bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 rounded font-medium">{i}</span>)}
                  </dd>
                </div>
                <div><dt className="text-xs text-slate-400 uppercase font-semibold tracking-wide">Valid until</dt><dd className="font-medium text-slate-900 mt-0.5">{new Date(form.expiration_date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</dd></div>
              </dl>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="font-semibold text-amber-900 mb-2">⚠️ Important</h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Your care team will review this request within 2-3 business days</li>
                <li>• You will be asked to sign this authorization before records are released</li>
                <li>• You can revoke this authorization at any time in writing</li>
                <li>• Substance use treatment records have special protections under 42 CFR Part 2</li>
              </ul>
            </div>

            <div>
              <label className={labelClass}>Additional notes (optional)</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} className={inputClass + " resize-none"} placeholder="Any additional context for your care team..." />
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(2)} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
              <button type="submit" disabled={saving}
                className="bg-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-teal-400 disabled:opacity-50">
                {saving ? "Submitting..." : "Submit Request →"}
              </button>
            </div>
          </div>
        )}

        {error && step < 3 && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
      </form>
    </div>
  );
}

export default function PortalROINewPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><PortalROIForm /></Suspense>;
}
