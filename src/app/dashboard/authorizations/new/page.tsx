"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import ICD10Input from "@/components/ICD10Input";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; insurance_provider?: string | null; insurance_member_id?: string | null; }

const CPT_COMMON = [
  { code: "90837", desc: "Individual therapy, 60 min" },
  { code: "90834", desc: "Individual therapy, 45 min" },
  { code: "90832", desc: "Individual therapy, 30 min" },
  { code: "90853", desc: "Group psychotherapy" },
  { code: "90791", desc: "Psychiatric diagnostic eval" },
  { code: "90792", desc: "Psych eval w/ medical services" },
  { code: "H0031", desc: "Mental health assessment" },
  { code: "H2017", desc: "Psychosocial rehabilitation" },
  { code: "99492", desc: "Collaborative care, first 70 min" },
  { code: "99493", desc: "Collaborative care, subsequent 60 min" },
];

function NewAuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedCPTs, setSelectedCPTs] = useState<string[]>([]);

  const [form, setForm] = useState({
    client_id: params.get("patient_id") || "",
    patient_name: "",
    insurance_provider: "",
    insurance_member_id: "",
    rendering_provider: "",
    diagnosis_codes: "",
    sessions_requested: 30,
    units_requested: "",
    priority: "routine",
    requested_date: new Date().toISOString().split("T")[0],
    start_date: "",
    end_date: "",
    clinical_notes: "",
  });

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`)
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  function toggleCPT(code: string) {
    setSelectedCPTs(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  }

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError("Select a patient"); return; }
    if (!form.insurance_provider) { setError("Insurance provider required"); return; }
    if (selectedCPTs.length === 0) { setError("Select at least one CPT code"); return; }
    setSaving(true);
    const res = await fetch("/api/authorizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        cpt_codes: selectedCPTs,
        diagnosis_codes: form.diagnosis_codes.split(",").map(s => s.trim()).filter(Boolean),
        sessions_requested: Number(form.sessions_requested),
        units_requested: form.units_requested ? Number(form.units_requested) : null,
        status: "entered",
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/authorizations/${data.auth.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/authorizations" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Auth Request</h1>
          <p className="text-slate-500 text-sm mt-0.5">Prior authorization request</p>
        </div>
      </div>

      {/* Patient */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Patient & Insurance</h2>

        <div className="relative">
          <label className={labelClass}>Patient *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "", insurance_provider: "", insurance_member_id: "" }))} className="text-teal-500 text-sm">✕ Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search patient..." />
              {patients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {patients.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          client_id: p.id,
                          patient_name: `${p.last_name}, ${p.first_name}`,
                          insurance_provider: p.insurance_provider || "",
                          insurance_member_id: p.insurance_member_id || "",
                        }));
                        setPatientSearch(""); setPatients([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className="font-semibold text-sm text-slate-900">{p.last_name}, {p.first_name}</div>
                      <div className="text-xs text-slate-400">MRN: {p.mrn} · {p.insurance_provider || "No insurance on file"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Insurance Provider *</label>
            <input value={form.insurance_provider} onChange={e => set("insurance_provider", e.target.value)} className={inputClass} placeholder="e.g. Regence BlueShield" />
          </div>
          <div>
            <label className={labelClass}>Member ID</label>
            <input value={form.insurance_member_id} onChange={e => set("insurance_member_id", e.target.value)} className={inputClass} placeholder="Member ID" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Rendering Provider</label>
            <input value={form.rendering_provider} onChange={e => set("rendering_provider", e.target.value)} className={inputClass} placeholder="Provider name + credentials" />
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputClass}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="emergent">Emergent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Services Requested</h2>

        <div>
          <label className={labelClass}>CPT Codes * (select all that apply)</label>
          <div className="grid grid-cols-2 gap-2">
            {CPT_COMMON.map(cpt => (
              <button key={cpt.code} type="button" onClick={() => toggleCPT(cpt.code)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left text-sm transition-colors ${selectedCPTs.includes(cpt.code) ? "bg-teal-50 border-teal-300 text-teal-800" : "border-slate-200 text-slate-700 hover:border-slate-300"}`}>
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 text-xs ${selectedCPTs.includes(cpt.code) ? "bg-teal-500 border-teal-500 text-white" : "border-slate-300"}`}>
                  {selectedCPTs.includes(cpt.code) ? "✓" : ""}
                </span>
                <span className="font-mono font-bold">{cpt.code}</span>
                <span className="text-slate-500 text-xs">{cpt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Diagnosis Codes (ICD-10)</label>
          <ICD10Input value={form.diagnosis_codes} onChange={val => set("diagnosis_codes", val)} placeholder="Search diagnosis codes..." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Sessions Requested</label>
            <input type="number" value={form.sessions_requested} onChange={e => set("sessions_requested", parseInt(e.target.value))} className={inputClass} min={1} />
          </div>
          <div>
            <label className={labelClass}>Requested Date</label>
            <input type="date" value={form.requested_date} onChange={e => set("requested_date", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)} className={inputClass}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent (72hr)</option>
              <option value="emergent">Emergent (24hr)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Auth Start Date</label>
            <input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Auth End Date</label>
            <input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Clinical Notes / Medical Necessity</label>
          <textarea value={form.clinical_notes} onChange={e => set("clinical_notes", e.target.value)} rows={4}
            className={inputClass + " resize-none"}
            placeholder="Describe medical necessity, treatment history, functional impairment, and clinical justification for requested services..." />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/authorizations" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Create Auth Request"}
        </button>
      </div>
    </form>
  );
}

export default function NewAuthPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewAuthForm /></Suspense>;
}
