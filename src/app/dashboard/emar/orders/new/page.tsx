"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; }

const FREQUENCIES = ["QD (once daily)", "BID (twice daily)", "TID (three times daily)", "QID (four times daily)", "Q4H (every 4 hours)", "Q6H (every 6 hours)", "Q8H (every 8 hours)", "Q12H (every 12 hours)", "QHS (bedtime)", "QAM (morning)", "QPM (evening)", "PRN (as needed)", "Weekly", "Monthly"];
const ROUTES = ["oral", "sublingual", "topical", "injection (IM)", "injection (SQ)", "inhaled", "transdermal", "rectal", "nasal", "ophthalmic", "otic"];
const TIME_OPTIONS = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
const CONTROLLED_SCHEDULES = ["C-II", "C-III", "C-IV", "C-V"];

function NewOrderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");

  const [form, setForm] = useState({
    client_id: params.get("client_id") || "", patient_name: "",
    medication_name: "", generic_name: "", dosage: "", route: "oral",
    frequency: "QD (once daily)", scheduled_times: ["08:00"],
    indication: "", prescriber: "", pharmacy: "", rx_number: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "", is_prn: false, prn_indication: "",
    is_controlled: false, controlled_schedule: "C-II",
    instructions: "",
  });

  useEffect(() => {
    const pid = params.get("client_id");
    if (pid && !form.patient_name) {
      fetch(`/api/clients/${pid}`, { credentials: "include" })
        .then(r => r.json()).then(d => {
          if (d.patient) setForm(f => ({ ...f, client_id: d.patient.id, patient_name: `${d.patient.last_name}, ${d.patient.first_name}` }));
        });
    }
  }, []);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`).then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  // Auto-set scheduled times based on frequency
  useEffect(() => {
    const freqMap: Record<string, string[]> = {
      "QD (once daily)": ["08:00"], "BID (twice daily)": ["08:00", "20:00"],
      "TID (three times daily)": ["08:00", "13:00", "20:00"],
      "QID (four times daily)": ["08:00", "12:00", "16:00", "20:00"],
      "QHS (bedtime)": ["21:00"], "QAM (morning)": ["08:00"], "QPM (evening)": ["18:00"],
      "Q12H (every 12 hours)": ["08:00", "20:00"],
      "Q8H (every 8 hours)": ["08:00", "16:00", "00:00"],
      "Q6H (every 6 hours)": ["06:00", "12:00", "18:00", "00:00"],
    };
    if (freqMap[form.frequency]) {
      setForm(f => ({ ...f, scheduled_times: freqMap[form.frequency] }));
    }
  }, [form.frequency]);

  function toggleTime(time: string) {
    setForm(f => ({ ...f, scheduled_times: f.scheduled_times.includes(time) ? f.scheduled_times.filter(t => t !== time) : [...f.scheduled_times, time].sort() }));
  }

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.medication_name || !form.dosage) { setError("Patient, medication name, and dosage required"); return; }
    setSaving(true);
    const res = await fetch("/api/emar/orders", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/emar/${form.client_id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/emar" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Medication Order</h1>
          <p className="text-slate-500 text-sm mt-0.5">Enter prescriber order to add to eMAR</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* Patient */}
        <div className="relative">
          <label className={labelClass}>Client *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))} className="text-teal-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search client..." />
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

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Medication Name *</label><input value={form.medication_name} onChange={e => set("medication_name", e.target.value)} className={inputClass} placeholder="e.g. Sertraline, Depakote" /></div>
          <div><label className={labelClass}>Generic Name</label><input value={form.generic_name} onChange={e => set("generic_name", e.target.value)} className={inputClass} placeholder="Generic/brand name" /></div>
          <div><label className={labelClass}>Dosage *</label><input value={form.dosage} onChange={e => set("dosage", e.target.value)} className={inputClass} placeholder="e.g. 100mg, 5mL" /></div>
          <div><label className={labelClass}>Route</label>
            <select value={form.route} onChange={e => set("route", e.target.value)} className={inputClass}>
              {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Frequency</label>
          <select value={form.frequency} onChange={e => set("frequency", e.target.value)} className={inputClass}>
            {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>

        {!form.is_prn && (
          <div>
            <label className={labelClass}>Scheduled Administration Times</label>
            <div className="flex flex-wrap gap-2">
              {TIME_OPTIONS.map(time => (
                <button key={time} type="button" onClick={() => toggleTime(time)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.scheduled_times.includes(time) ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Indication / Diagnosis</label><input value={form.indication} onChange={e => set("indication", e.target.value)} className={inputClass} placeholder="What it's for" /></div>
          <div><label className={labelClass}>Prescriber</label><input value={form.prescriber} onChange={e => set("prescriber", e.target.value)} className={inputClass} placeholder="Dr. Name, MD" /></div>
          <div><label className={labelClass}>Pharmacy</label><input value={form.pharmacy} onChange={e => set("pharmacy", e.target.value)} className={inputClass} placeholder="Pharmacy name" /></div>
          <div><label className={labelClass}>Rx Number</label><input value={form.rx_number} onChange={e => set("rx_number", e.target.value)} className={inputClass} placeholder="Prescription number" /></div>
          <div><label className={labelClass}>Start Date</label><input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>End Date (if applicable)</label><input type="date" value={form.end_date} onChange={e => set("end_date", e.target.value)} className={inputClass} /></div>
        </div>

        <div><label className={labelClass}>Special Instructions</label>
          <input value={form.instructions} onChange={e => set("instructions", e.target.value)} className={inputClass} placeholder="Take with food, avoid grapefruit, monitor BP before administering..." />
        </div>

        {/* PRN toggle */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <input type="checkbox" id="is_prn" checked={form.is_prn} onChange={e => set("is_prn", e.target.checked)} className="w-4 h-4 accent-teal-500" />
          <label htmlFor="is_prn" className="text-sm font-medium text-slate-900">This is a PRN (as-needed) medication</label>
        </div>
        {form.is_prn && (
          <div><label className={labelClass}>PRN Indication (when to give)</label>
            <input value={form.prn_indication} onChange={e => set("prn_indication", e.target.value)} className={inputClass} placeholder="Pain > 5/10, anxiety episode, PRN agitation..." />
          </div>
        )}

        {/* Controlled substance */}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_controlled" checked={form.is_controlled} onChange={e => set("is_controlled", e.target.checked)} className="w-4 h-4 accent-red-500" />
          <label htmlFor="is_controlled" className="text-sm font-medium text-slate-900 flex items-center gap-1">
            <span className="text-red-500">⚠️</span> Controlled substance — requires witness and narcotic count
          </label>
        </div>
        {form.is_controlled && (
          <div><label className={labelClass}>DEA Schedule</label>
            <select value={form.controlled_schedule} onChange={e => set("controlled_schedule", e.target.value)} className={inputClass}>
              {CONTROLLED_SCHEDULES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/emar" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Add to eMAR"}
        </button>
      </div>
    </form>
  );
}

export default function NewMedOrderPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewOrderForm /></Suspense>;
}
