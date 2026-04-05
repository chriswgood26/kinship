"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import ICD10Input from "@/components/ICD10Input";

export default function DischargeSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = use(params);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-fill clinician info from user profile
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setForm(f => ({
            ...f,
            clinician_name: `${d.profile.first_name || ""} ${d.profile.last_name || ""}`.trim(),
            clinician_credentials: d.profile.credentials || d.profile.title || "",
          }));
        }
      })
      .catch(() => {});
  }, []);
  const [form, setForm] = useState({
    discharge_date: new Date().toISOString().split("T")[0],
    discharge_type: "planned",
    discharge_to: "",
    primary_diagnoses: "",
    treatment_summary: "",
    goals_achieved: "",
    goals_not_achieved: "",
    medications_at_discharge: "",
    followup_plan: "",
    referrals_made: "",
    patient_instructions: "",
    clinician_name: "",
    clinician_credentials: "",
  });

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/encounters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: patientId,
        encounter_type: "discharge_summary",
        encounter_date: form.discharge_date,
        status: "signed",
        notes: JSON.stringify(form),
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/clients/${patientId}`} className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discharge Summary</h1>
          <p className="text-slate-500 text-sm mt-0.5">Document patient discharge from services</p>
        </div>
      </div>

      {/* Discharge info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Discharge Information</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><label className={labelClass}>Discharge Date</label><input type="date" value={form.discharge_date} onChange={e => setForm(f => ({ ...f, discharge_date: e.target.value }))} className={inputClass} /></div>
          <div><label className={labelClass}>Discharge Type</label>
            <select value={form.discharge_type} onChange={e => setForm(f => ({ ...f, discharge_type: e.target.value }))} className={inputClass}>
              <option value="planned">Planned / Successful</option>
              <option value="ama">Against Medical Advice (AMA)</option>
              <option value="administrative">Administrative</option>
              <option value="transfer">Transfer to Higher LOC</option>
              <option value="step_down">Step Down / Transition</option>
              <option value="no_show">Non-engagement / No Show</option>
              <option value="deceased">Deceased</option>
            </select>
          </div>
          <div><label className={labelClass}>Discharged To</label><input value={form.discharge_to} onChange={e => setForm(f => ({ ...f, discharge_to: e.target.value }))} className={inputClass} placeholder="e.g. Home, Residential, IOP..." /></div>
        </div>
      </div>

      {/* Clinical summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Clinical Summary</h2>
        <div>
            <label className={labelClass}>Primary Diagnoses at Discharge (ICD-10)</label>
            <ICD10Input
              value={form.primary_diagnoses}
              onChange={val => setForm(f => ({ ...f, primary_diagnoses: val }))}
              placeholder="Search ICD-10 codes..."
            />
          </div>
        <div><label className={labelClass}>Treatment Summary</label><textarea value={form.treatment_summary} onChange={e => setForm(f => ({ ...f, treatment_summary: e.target.value }))} rows={4} className={inputClass + " resize-none"} placeholder="Summarize treatment provided, modalities used, progress over course of treatment..." /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Goals Achieved</label><textarea value={form.goals_achieved} onChange={e => setForm(f => ({ ...f, goals_achieved: e.target.value }))} rows={3} className={inputClass + " resize-none"} placeholder="List treatment goals that were met..." /></div>
          <div><label className={labelClass}>Goals Not Achieved / Ongoing</label><textarea value={form.goals_not_achieved} onChange={e => setForm(f => ({ ...f, goals_not_achieved: e.target.value }))} rows={3} className={inputClass + " resize-none"} placeholder="Goals requiring continued work..." /></div>
        </div>
        <div><label className={labelClass}>Medications at Discharge</label><textarea value={form.medications_at_discharge} onChange={e => setForm(f => ({ ...f, medications_at_discharge: e.target.value }))} rows={2} className={inputClass + " resize-none"} placeholder="List current medications and doses..." /></div>
      </div>

      {/* Follow-up plan */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Follow-Up Plan</h2>
        <div><label className={labelClass}>Follow-Up Plan</label><textarea value={form.followup_plan} onChange={e => setForm(f => ({ ...f, followup_plan: e.target.value }))} rows={3} className={inputClass + " resize-none"} placeholder="Recommended follow-up care, frequency, type of service..." /></div>
        <div><label className={labelClass}>Referrals Made</label><textarea value={form.referrals_made} onChange={e => setForm(f => ({ ...f, referrals_made: e.target.value }))} rows={2} className={inputClass + " resize-none"} placeholder="List any referrals made at discharge (PCP, specialist, community services)..." /></div>
        <div><label className={labelClass}>Patient / Guardian Instructions</label><textarea value={form.patient_instructions} onChange={e => setForm(f => ({ ...f, patient_instructions: e.target.value }))} rows={3} className={inputClass + " resize-none"} placeholder="Instructions given to patient / guardian at discharge..." /></div>
      </div>

      {/* Signature */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Clinician Signature</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Clinician Name</label><input value={form.clinician_name} onChange={e => setForm(f => ({ ...f, clinician_name: e.target.value }))} className={inputClass} /></div>
          <div><label className={labelClass}>Credentials / Title</label><input value={form.clinician_credentials} onChange={e => setForm(f => ({ ...f, clinician_credentials: e.target.value }))} className={inputClass} placeholder="LCSW, LPC, MD..." /></div>
        </div>
        <p className="text-xs text-slate-400">By saving, you certify that this discharge summary is accurate and complete to the best of your knowledge.</p>
      </div>

      <div className="flex gap-3 justify-end pb-6">
        <Link href={`/dashboard/clients/${patientId}`} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        {saved && <span className="text-teal-600 text-sm font-medium self-center">✓ Saved</span>}
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Save & Sign Discharge Summary"}
        </button>
      </div>
    </form>
  );
}
