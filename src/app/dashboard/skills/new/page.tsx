"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }
interface ISPGoal { id: string; description: string; category: string; }
interface ISPPlan { id: string; plan_year: string; goals: ISPGoal[]; }

const CATEGORIES = [
  { value: "daily_living", label: "Daily Living" },
  { value: "communication", label: "Communication" },
  { value: "social", label: "Social" },
  { value: "academic", label: "Academic" },
  { value: "vocational", label: "Vocational" },
  { value: "self_care", label: "Self-Care" },
  { value: "motor", label: "Motor" },
  { value: "safety", label: "Safety" },
  { value: "other", label: "Other" },
];

const MEASUREMENT_TYPES = [
  { value: "percent_correct", label: "Percent Correct — # correct / # trials" },
  { value: "frequency", label: "Frequency — count occurrences per session" },
  { value: "duration", label: "Duration — how long (seconds)" },
  { value: "task_analysis", label: "Task Analysis — step-by-step completion" },
];

function NewSkillForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [ispPlans, setIspPlans] = useState<ISPPlan[]>([]);
  const [selectedIsp, setSelectedIsp] = useState<ISPPlan | null>(null);

  const [form, setForm] = useState({
    client_id: params.get("client_id") || "",
    patient_name: "",
    skill_name: "",
    description: "",
    category: "daily_living",
    measurement_type: "percent_correct",
    baseline_value: "",
    target_value: "80",
    target_trials: "10",
    mastery_criteria: "",
    isp_id: "",
    isp_goal_id: "",
    notes: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const cid = params.get("client_id");
    if (cid && !form.patient_name) {
      fetch(`/api/clients/${cid}`, { credentials: "include" })
        .then(r => r.json()).then(d => {
          if (d.patient) setForm(f => ({ ...f, client_id: d.patient.id, patient_name: `${d.patient.last_name}, ${d.patient.first_name}` }));
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`, { credentials: "include" })
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  // Load ISP plans when patient selected
  useEffect(() => {
    if (form.client_id) {
      fetch(`/api/isp?patient_id=${form.client_id}`, { credentials: "include" })
        .then(r => r.json()).then(d => {
          const plans = (d.plans || []).filter((p: { status: string }) => p.status === "active");
          setIspPlans(plans);
        }).catch(() => {});
    }
  }, [form.client_id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.skill_name) {
      setError("Client and skill name are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: form.client_id,
        skill_name: form.skill_name,
        description: form.description || null,
        category: form.category,
        measurement_type: form.measurement_type,
        baseline_value: form.baseline_value !== "" ? parseFloat(form.baseline_value) : null,
        target_value: form.target_value !== "" ? parseFloat(form.target_value) : null,
        target_trials: form.target_trials !== "" ? parseInt(form.target_trials) : 10,
        mastery_criteria: form.mastery_criteria || null,
        isp_id: form.isp_id || null,
        isp_goal_id: form.isp_goal_id || null,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to create skill program"); setSaving(false); return; }
    router.push(`/dashboard/skills/${data.skill.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/skills" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Skill Program</h1>
          <p className="text-slate-500 text-sm mt-0.5">Define a skill to track and measure acquisition</p>
        </div>
      </div>

      {/* Client */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Individual</h2>
        <div className="relative">
          <label className={labelClass}>Individual / Client *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button type="button" onClick={() => { setForm(f => ({ ...f, client_id: "", patient_name: "", isp_id: "", isp_goal_id: "" })); setIspPlans([]); setSelectedIsp(null); }}
                className="text-teal-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search by name or MRN..." />
              {patients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {patients.map(p => (
                    <button key={p.id} type="button" onClick={() => { setForm(f => ({ ...f, client_id: p.id, patient_name: `${p.last_name}, ${p.first_name}` })); setPatientSearch(""); setPatients([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className="font-semibold text-sm text-slate-900">{p.last_name}, {p.first_name}{p.preferred_name && <span className="text-slate-400 font-normal ml-1.5">"{p.preferred_name}"</span>}</div>
                      <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ISP Linkage */}
        {ispPlans.length > 0 && (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Link to ISP Goal (optional)</label>
              <select value={form.isp_id} onChange={e => { set("isp_id", e.target.value); set("isp_goal_id", ""); const plan = ispPlans.find(p => p.id === e.target.value) || null; setSelectedIsp(plan); }} className={inputClass}>
                <option value="">— Not linked to an ISP —</option>
                {ispPlans.map(p => (
                  <option key={p.id} value={p.id}>ISP {p.plan_year}</option>
                ))}
              </select>
            </div>
            {selectedIsp && selectedIsp.goals?.length > 0 && (
              <div>
                <label className={labelClass}>ISP Goal</label>
                <select value={form.isp_goal_id} onChange={e => set("isp_goal_id", e.target.value)} className={inputClass}>
                  <option value="">— Select a goal —</option>
                  {selectedIsp.goals.map((g, i) => (
                    <option key={g.id || i} value={g.id || String(i)}>{g.category}: {g.description}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Skill definition */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Skill Definition</h2>

        <div>
          <label className={labelClass}>Skill Name *</label>
          <input value={form.skill_name} onChange={e => set("skill_name", e.target.value)} className={inputClass} placeholder="e.g., Hand washing independently, Greeting peers appropriately" required />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={2}
            className={inputClass + " resize-none"} placeholder="Detailed description of the skill and how it will be taught..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Category</label>
            <select value={form.category} onChange={e => set("category", e.target.value)} className={inputClass}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Measurement Type</label>
            <select value={form.measurement_type} onChange={e => set("measurement_type", e.target.value)} className={inputClass}>
              {MEASUREMENT_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Targets */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Baseline & Targets</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>
              Baseline {form.measurement_type === "percent_correct" ? "(%)" : form.measurement_type === "duration" ? "(sec)" : ""}
            </label>
            <input type="number" value={form.baseline_value} onChange={e => set("baseline_value", e.target.value)}
              className={inputClass} placeholder="e.g., 20" min="0" step="any" />
          </div>
          <div>
            <label className={labelClass}>
              Target {form.measurement_type === "percent_correct" ? "(%)" : form.measurement_type === "duration" ? "(sec)" : ""}
            </label>
            <input type="number" value={form.target_value} onChange={e => set("target_value", e.target.value)}
              className={inputClass} placeholder="e.g., 80" min="0" step="any" />
          </div>
          {form.measurement_type === "percent_correct" && (
            <div>
              <label className={labelClass}>Trials per Session</label>
              <input type="number" value={form.target_trials} onChange={e => set("target_trials", e.target.value)}
                className={inputClass} placeholder="10" min="1" max="100" />
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Mastery Criteria</label>
          <input value={form.mastery_criteria} onChange={e => set("mastery_criteria", e.target.value)} className={inputClass}
            placeholder="e.g., 80% correct over 3 consecutive sessions without prompting" />
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className={labelClass}>Additional Notes</label>
        <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
          className={inputClass + " resize-none"} placeholder="Teaching strategies, materials needed, special considerations..." />
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex items-center justify-between pb-6">
        <Link href="/dashboard/skills" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
          Cancel
        </Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Creating..." : "Create Skill Program"}
        </button>
      </div>
    </form>
  );
}

export default function NewSkillPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewSkillForm /></Suspense>;
}
