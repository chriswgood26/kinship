"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }

const INCIDENT_TYPES: Record<string, string[]> = {
  client: ["Behavioral Incident", "Fall / Injury", "Medication Error", "Elopement", "Abuse / Neglect", "Medical Emergency", "Restraint Use", "Self-Harm", "Other"],
  staff: ["Workplace Injury", "Near Miss", "Staff Misconduct", "Harassment / Discrimination", "Exposure Incident", "Other"],
  visitor: ["Visitor Injury", "Trespassing", "Disruptive Behavior", "Other"],
  property: ["Property Damage", "Break-In / Theft", "Fire / Flood", "Equipment Failure", "Vehicle Incident", "Other"],
};
const LOCATIONS = ["Day Program", "Group Home", "Individual's Home", "Community Outing", "Transport", "Medical Appointment", "Other"];

function NewIncidentForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");

  const [form, setForm] = useState({
    client_id: "", patient_name: "",
    incident_date: new Date().toISOString().split("T")[0],
    incident_time: new Date().toTimeString().slice(0, 5),
    incident_category: "client",
    incident_type: "Behavioral Incident",
    severity: "minor",
    location: "Day Program",
    description: "",
    antecedent: "",
    behavior: "",
    consequence: "",
    injury_occurred: false,
    injury_description: "",
    medical_attention: false,
    medical_attention_details: "",
    witnesses: "",
    staff_involved: "",
    immediate_actions: "",
    notifications_required: true,
    state_report_required: false,
    status: "open",
  });

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`)
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description) { setError("Description is required"); return; }
    setSaving(true);
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        witnesses: form.witnesses.split(",").map(s => s.trim()).filter(Boolean),
        staff_involved: form.staff_involved.split(",").map(s => s.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/incidents/${data.incident.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/incidents" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Incident Report</h1>
          <p className="text-slate-500 text-sm mt-0.5">Document the incident accurately and completely</p>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
        <span className="text-xl">⚠️</span>
        <span className="text-sm text-red-800">For medical emergencies, call 911 first. Complete this report as soon as the individual is safe.</span>
      </div>

      {/* Basic info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Incident Information</h2>

        {/* Incident category */}
        <div>
          <label className={labelClass}>Incident Category *</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: "client", label: "Client", icon: "👤" },
              { value: "staff", label: "Staff", icon: "👔" },
              { value: "visitor", label: "Visitor", icon: "🚶" },
              { value: "property", label: "Property", icon: "🏠" },
            ].map(cat => (
              <button key={cat.value} type="button"
                onClick={() => set("incident_category", cat.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-sm font-medium transition-colors ${form.incident_category === cat.value ? "bg-teal-50 border-teal-300 text-teal-800" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                <span className="text-xl">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative">
          <label className={labelClass}>Individual / Client <span className="text-slate-400 font-normal normal-case">(optional — leave blank for staff/visitor/property incidents)</span></label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))} className="text-teal-500 text-sm">✕ Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search individual..." />
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
          <div><label className={labelClass}>Incident Type *</label>
            <select value={form.incident_type} onChange={e => set("incident_type", e.target.value)} className={inputClass}>
              {(INCIDENT_TYPES[form.incident_category] || INCIDENT_TYPES.client).map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Severity</label>
            <select value={form.severity} onChange={e => set("severity", e.target.value)} className={inputClass}>
              <option value="minor">Minor — no injury, contained quickly</option>
              <option value="moderate">Moderate — some impact, managed on-site</option>
              <option value="serious">Serious — significant injury or impact</option>
              <option value="critical">Critical — life-threatening, police/911 involved</option>
            </select>
          </div>
          <div><label className={labelClass}>Date of Incident</label><input type="date" value={form.incident_date} onChange={e => set("incident_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Time of Incident</label><input type="time" value={form.incident_time} onChange={e => set("incident_time", e.target.value)} className={inputClass} /></div>
          <div className="col-span-2"><label className={labelClass}>Location</label>
            <select value={form.location} onChange={e => set("location", e.target.value)} className={inputClass}>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div><label className={labelClass}>Incident Description * (what happened)</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4} className={inputClass + " resize-none"} placeholder="Describe what happened in objective, factual terms..." />
        </div>
      </div>

      {/* ABC Data */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">ABC Analysis <span className="text-slate-400 font-normal text-sm">(Antecedent-Behavior-Consequence)</span></h2>
        <div><label className={labelClass}>Antecedent — What happened immediately BEFORE?</label>
          <textarea value={form.antecedent} onChange={e => set("antecedent", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="What triggered or preceded the incident?" />
        </div>
        <div><label className={labelClass}>Behavior — What did the individual DO?</label>
          <textarea value={form.behavior} onChange={e => set("behavior", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Describe the specific behavior in observable terms..." />
        </div>
        <div><label className={labelClass}>Consequence — What happened AFTER?</label>
          <textarea value={form.consequence} onChange={e => set("consequence", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="How did staff respond? What was the outcome?" />
        </div>
      </div>

      {/* Injury & Medical */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Injury & Medical Response</h2>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="injury" checked={form.injury_occurred} onChange={e => set("injury_occurred", e.target.checked)} className="w-4 h-4 rounded accent-teal-500" />
          <label htmlFor="injury" className="text-sm font-medium text-slate-900">Injury occurred</label>
        </div>
        {form.injury_occurred && (
          <div><label className={labelClass}>Injury Description</label>
            <textarea value={form.injury_description} onChange={e => set("injury_description", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Describe injuries sustained..." />
          </div>
        )}
        <div className="flex items-center gap-3">
          <input type="checkbox" id="medical" checked={form.medical_attention} onChange={e => set("medical_attention", e.target.checked)} className="w-4 h-4 rounded accent-teal-500" />
          <label htmlFor="medical" className="text-sm font-medium text-slate-900">Medical attention required</label>
        </div>
        {form.medical_attention && (
          <div><label className={labelClass}>Medical Attention Details</label>
            <input value={form.medical_attention_details} onChange={e => set("medical_attention_details", e.target.value)} className={inputClass} placeholder="First aid, urgent care, ER, 911..." />
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Notifications & Follow-Up</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Staff Involved (comma separated)</label><input value={form.staff_involved} onChange={e => set("staff_involved", e.target.value)} className={inputClass} placeholder="Staff names..." /></div>
          <div><label className={labelClass}>Witnesses (comma separated)</label><input value={form.witnesses} onChange={e => set("witnesses", e.target.value)} className={inputClass} placeholder="Witness names..." /></div>
        </div>
        <div><label className={labelClass}>Immediate Actions Taken</label>
          <textarea value={form.immediate_actions} onChange={e => set("immediate_actions", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="What immediate steps were taken to ensure safety?" />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="state" checked={form.state_report_required} onChange={e => set("state_report_required", e.target.checked)} className="w-4 h-4 rounded accent-teal-500" />
          <label htmlFor="state" className="text-sm font-medium text-slate-900 flex items-center gap-1">
            <span>State reporting required</span>
            <span className="text-xs text-red-500 font-semibold">(24-72hr deadline)</span>
          </label>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/incidents" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-400 disabled:opacity-50">
          {saving ? "Saving..." : "Submit Incident Report"}
        </button>
      </div>
    </form>
  );
}

export default function NewIncidentPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewIncidentForm /></Suspense>;
}
