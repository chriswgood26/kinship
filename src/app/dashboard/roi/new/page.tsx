"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; date_of_birth?: string | null; }

const PURPOSES = [
  "Continuity of Care / Treatment",
  "Insurance / Billing",
  "Legal / Court Order",
  "Employment",
  "Disability / Benefits",
  "Personal Use / Copy of Records",
  "Family Communication",
  "Research",
  "School / Education",
  "Other",
];

const INFO_TYPES = [
  "Mental Health Records",
  "Substance Use Records",
  "Psychiatric Records",
  "Medication Records",
  "Therapy/Counseling Notes",
  "Treatment Plan",
  "Discharge Summary",
  "Lab Results",
  "Billing / Financial Records",
  "Diagnosis Information",
  "Progress Notes",
  "Assessment Results",
];

function NewROIForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedInfo, setSelectedInfo] = useState<string[]>([]);

  const [form, setForm] = useState({
    client_id: params.get("client_id") || "", patient_name: "",
    direction: "outgoing",
    recipient_name: "", recipient_organization: "", recipient_phone: "", recipient_fax: "", recipient_address: "",
    purpose: "Continuity of Care / Treatment",
    specific_information: "",
    effective_date: new Date().toISOString().split("T")[0],
    expiration_date: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
    is_revocable: true,
    cfr_part_42: false,
    patient_signature_method: "written",
    guardian_name: "",
    witnessed_by: "",
    notes: "",
  });

  useEffect(() => {
    const pid = params.get("client_id");
    if (pid && !form.patient_name) {
      fetch(`/api/clients/${pid}`, { credentials: "include" }).then(r => r.json()).then(d => {
        if (d.patient) setForm(f => ({ ...f, client_id: d.client.id, patient_name: `${d.client.last_name}, ${d.client.first_name}` }));
      });
    }
  }, []);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`, { credentials: "include" })
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  function toggleInfo(info: string) {
    if (info === "All Records") { setSelectedInfo(["All Records"]); return; }
    setSelectedInfo(prev => prev.filter(i => i !== "All Records").includes(info)
      ? prev.filter(i => i !== info)
      : [...prev.filter(i => i !== "All Records"), info]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.recipient_name || !form.purpose) { setError("Patient, recipient, and purpose required"); return; }
    if (selectedInfo.length === 0) { setError("Select at least one type of information to release"); return; }
    setSaving(true);
    const res = await fetch("/api/roi", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, information_to_release: selectedInfo, status: "pending_signature" }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/roi/${data.roi.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/roi" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Release of Information</h1>
          <p className="text-slate-500 text-sm mt-0.5">HIPAA-compliant authorization to disclose PHI</p>
        </div>
      </div>

      {/* Patient */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Authorization Details</h2>

        <div className="relative">
          <label className={labelClass}>Patient *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))} className="text-teal-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search patient..." />
              {patients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {patients.map(p => (
                    <button key={p.id} type="button" onClick={() => { setForm(f => ({ ...f, client_id: p.id, patient_name: `${p.last_name}, ${p.first_name}` })); setPatientSearch(""); setPatients([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className="font-semibold text-sm text-slate-900">{p.last_name}, {p.first_name}</div>
                      <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Direction */}
        <div>
          <label className={labelClass}>Direction *</label>
          <div className="flex gap-3">
            {[
              { value: "outgoing", label: "📤 Outgoing", desc: "We release to third party" },
              { value: "incoming", label: "📥 Incoming", desc: "Third party releases to us" },
            ].map(d => (
              <button key={d.value} type="button" onClick={() => set("direction", d.value)}
                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${form.direction === d.value ? "bg-teal-50 border-teal-400" : "border-slate-200 hover:border-slate-300"}`}>
                <span className="font-semibold text-sm text-slate-900">{d.label}</span>
                <span className="text-xs text-slate-400">{d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recipient */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">{form.direction === "incoming" ? "Source / Sending Party" : "Recipient"}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Name / Provider *</label><input value={form.recipient_name} onChange={e => set("recipient_name", e.target.value)} className={inputClass} placeholder="Dr. Smith, Clinic Name..." /></div>
            <div><label className={labelClass}>Organization</label><input value={form.recipient_organization} onChange={e => set("recipient_organization", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Phone</label><input value={form.recipient_phone} onChange={e => set("recipient_phone", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Fax</label><input value={form.recipient_fax} onChange={e => set("recipient_fax", e.target.value)} className={inputClass} /></div>
            <div className="col-span-2"><label className={labelClass}>Address</label><input value={form.recipient_address} onChange={e => set("recipient_address", e.target.value)} className={inputClass} /></div>
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label className={labelClass}>Purpose of Release *</label>
          <select value={form.purpose} onChange={e => set("purpose", e.target.value)} className={inputClass}>
            {PURPOSES.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>

        {/* Information to release */}
        <div>
          <label className={labelClass + " mb-2"}>Information to Release * (select all that apply)</label>
          <button type="button" onClick={() => toggleInfo("All Records")}
            className={`mb-2 w-full text-center px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${selectedInfo.includes("All Records") ? "bg-amber-50 border-amber-300 text-amber-800" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
            {selectedInfo.includes("All Records") ? "✓ All Records (clears individual selections)" : "☑ Select All Records"}
          </button>
          <div className="grid grid-cols-3 gap-2">
            {INFO_TYPES.map(info => (
              <button key={info} type="button" onClick={() => toggleInfo(info)}
                className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${selectedInfo.includes(info) ? "bg-teal-50 border-teal-300 text-teal-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {selectedInfo.includes(info) ? "✓ " : ""}{info}
              </button>
            ))}
          </div>
        </div>

        <div><label className={labelClass}>Specific Information / Limitations (optional)</label>
          <textarea value={form.specific_information} onChange={e => set("specific_information", e.target.value)} rows={2}
            className={inputClass + " resize-none"} placeholder="e.g. Records from January 2025 - March 2026 only; exclude specific notes..." />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Effective Date</label><input type="date" value={form.effective_date} onChange={e => set("effective_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Expiration Date</label><input type="date" value={form.expiration_date} onChange={e => set("expiration_date", e.target.value)} className={inputClass} /></div>
        </div>

        {/* Revocable */}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="revocable" checked={form.is_revocable} onChange={e => set("is_revocable", e.target.checked)} className="w-4 h-4 accent-teal-500" />
          <label htmlFor="revocable" className="text-sm text-slate-900">Patient may revoke this authorization at any time in writing (recommended)</label>
        </div>

        {/* 42 CFR Part 2 */}
        <div className={`rounded-xl border-2 p-4 transition-colors ${(form as {cfr_part_42?: boolean}).cfr_part_42 ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-start gap-3">
            <input type="checkbox" id="cfr42" checked={(form as {cfr_part_42?: boolean}).cfr_part_42 || false} onChange={e => set("cfr_part_42", e.target.checked)} className="w-4 h-4 accent-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <label htmlFor="cfr42" className="text-sm font-semibold text-slate-900 cursor-pointer">
                ☑ This ROI involves substance use disorder records (42 CFR Part 2)
              </label>
              <p className="text-xs text-slate-500 mt-1">Check if any information to be released includes substance use disorder treatment records. Federal redisclosure prohibition language will be added to the printed form.</p>
            </div>
          </div>
          {(form as {cfr_part_42?: boolean}).cfr_part_42 && (
            <div className="mt-3 bg-amber-100 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed">
              <span className="font-bold">Required federal language that will appear on this ROI:</span><br/>
              "This information has been disclosed to you from records protected by Federal confidentiality rules (42 CFR Part 2). The Federal rules prohibit you from making any further disclosure of this information unless further disclosure is expressly permitted by the written consent of the person to whom it pertains or as otherwise permitted by 42 CFR Part 2. A general authorization for the release of medical or other information is NOT sufficient for this purpose."
            </div>
          )}
        </div>
      </div>

      {/* Signature */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Signature & Witness</h2>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
          ℹ️ Authorization status will be set to "Pending Signature" until patient signs. Update to "Active" after obtaining signature.
        </div>
        <div>
          <label className={labelClass}>Signature Method</label>
          <select value={form.patient_signature_method} onChange={e => set("patient_signature_method", e.target.value)} className={inputClass}>
            <option value="written">Written signature (in person)</option>
            <option value="electronic">Electronic signature</option>
            <option value="verbal_documented">Verbal with documentation</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Guardian Name (if applicable)</label><input value={form.guardian_name} onChange={e => set("guardian_name", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Witnessed By</label><input value={form.witnessed_by} onChange={e => set("witnessed_by", e.target.value)} className={inputClass} placeholder="Staff member name" /></div>
        </div>
        <div><label className={labelClass}>Notes</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Any additional context or limitations..." />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/roi" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Create ROI"}
        </button>
      </div>
    </form>
  );
}

export default function NewROIPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewROIForm /></Suspense>;
}
