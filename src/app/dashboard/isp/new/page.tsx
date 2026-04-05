"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import ICD10Input from "@/components/ICD10Input";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }

const ADL_CATEGORIES = [
  "Communication & Language",
  "Self-Care & Personal Hygiene",
  "Mobility & Motor Skills",
  "Community Integration",
  "Employment & Day Activities",
  "Social & Interpersonal Skills",
  "Behavioral Supports",
  "Health & Wellness",
  "Safety & Emergency Preparedness",
  "Independent Living Skills",
];

function makeId() { return Math.random().toString(36).slice(2, 9); }

interface ISPGoal {
  id: string;
  category: string;
  description: string;
  baseline: string;
  target: string;
  method: string;
  frequency: string;
  responsible_party: string;
}

function NewISPForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [activeTab, setActiveTab] = useState("individual");

  const [form, setForm] = useState({
    client_id: "", patient_name: "",
    plan_year: new Date().getFullYear(),
    effective_date: new Date().toISOString().split("T")[0],
    review_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
    coordinator: "",
    primary_diagnosis: "",
    secondary_diagnoses: "",
    level_of_support: "moderate",
    living_situation: "",
    day_program: "",
    strengths: "",
    preferences: "",
    health_safety_concerns: "",
    communication_style: "",
    guardian_name: "",
    guardian_relationship: "Parent",
    notes: "",
  });

  const [goals, setGoals] = useState<ISPGoal[]>([
    { id: makeId(), category: "Communication & Language", description: "", baseline: "", target: "", method: "", frequency: "Daily", responsible_party: "Direct Support Professional" }
  ]);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`)
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  function addGoal() {
    setGoals(g => [...g, { id: makeId(), category: "Self-Care & Personal Hygiene", description: "", baseline: "", target: "", method: "", frequency: "Daily", responsible_party: "Direct Support Professional" }]);
  }

  function updateGoal(id: string, field: string, value: string) {
    setGoals(g => g.map(goal => goal.id === id ? { ...goal, [field]: value } : goal));
  }

  function removeGoal(id: string) {
    setGoals(g => g.filter(goal => goal.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError("Select an individual"); return; }
    if (!goals[0]?.description) { setError("At least one ISP goal is required"); return; }
    setSaving(true);
    const res = await fetch("/api/isp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...form,
        secondary_diagnoses: form.secondary_diagnoses.split(",").map(s => s.trim()).filter(Boolean),
        goals,
        status: "draft",
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/isp/${data.plan.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";
  const tabs = ["individual", "background", "goals", "guardian"];

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/isp" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Individual Support Plan</h1>
          <p className="text-slate-500 text-sm mt-0.5">Person-centered DD waiver ISP</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[["individual", "1. Individual"], ["background", "2. Background"], ["goals", "3. Goals"], ["guardian", "4. Signatures"]].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${activeTab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab 1: Individual Info */}
      {activeTab === "individual" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Individual Information</h2>

          <div className="relative">
            <label className={labelClass}>Individual *</label>
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
                        <div className="font-semibold text-sm text-slate-900">{p.last_name}, {p.first_name}{p.preferred_name && <span className="text-slate-400 font-normal ml-1.5">"{p.preferred_name}"</span>}</div>
                        <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelClass}>Plan Year</label><input type="number" value={form.plan_year} onChange={e => set("plan_year", parseInt(e.target.value))} className={inputClass} /></div>
            <div><label className={labelClass}>Effective Date</label><input type="date" value={form.effective_date} onChange={e => set("effective_date", e.target.value)} className={inputClass} /></div>
            <div><label className={labelClass}>Annual Review Date</label><input type="date" value={form.review_date} onChange={e => set("review_date", e.target.value)} className={inputClass} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Support Coordinator</label><input value={form.coordinator} onChange={e => set("coordinator", e.target.value)} className={inputClass} placeholder="Name, agency" /></div>
            <div>
              <label className={labelClass}>Level of Support Needed</label>
              <select value={form.level_of_support} onChange={e => set("level_of_support", e.target.value)} className={inputClass}>
                <option value="minimal">Minimal — independent with occasional support</option>
                <option value="moderate">Moderate — regular support needed</option>
                <option value="substantial">Substantial — frequent support needed</option>
                <option value="intensive">Intensive — 24/7 support needed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Living Situation</label><input value={form.living_situation} onChange={e => set("living_situation", e.target.value)} className={inputClass} placeholder="Family home, group home, supported living..." /></div>
            <div><label className={labelClass}>Day Program / Employment</label><input value={form.day_program} onChange={e => set("day_program", e.target.value)} className={inputClass} placeholder="Program name or employer" /></div>
          </div>

          <div><label className={labelClass}>Primary Diagnosis</label><ICD10Input value={form.primary_diagnosis} onChange={val => set("primary_diagnosis", val)} placeholder="Search primary diagnosis..." /></div>
          <div>
            <label className={labelClass}>Secondary Diagnoses</label>
            <input value={form.secondary_diagnoses} onChange={e => set("secondary_diagnoses", e.target.value)} className={inputClass + " font-mono"} placeholder="F70, F84.0 (comma separated)" />
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={() => setActiveTab("background")} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Next: Background →</button>
          </div>
        </div>
      )}

      {/* Tab 2: Background */}
      {activeTab === "background" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Person-Centered Background</h2>
          <div><label className={labelClass}>Strengths, Gifts & Talents</label><textarea value={form.strengths} onChange={e => set("strengths", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="What is this person good at? What do they enjoy? What do others appreciate about them?" /></div>
          <div><label className={labelClass}>Preferences, Interests & Dreams</label><textarea value={form.preferences} onChange={e => set("preferences", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="What does this person like to do? What are their goals for the future?" /></div>
          <div><label className={labelClass}>Communication Style</label><textarea value={form.communication_style} onChange={e => set("communication_style", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="How does this person communicate? Verbal, AAC device, sign language, gestures? What works best?" /></div>
          <div><label className={labelClass}>Health, Safety & Behavioral Considerations</label><textarea value={form.health_safety_concerns} onChange={e => set("health_safety_concerns", e.target.value)} rows={4} className={inputClass + " resize-none"} placeholder="Medical conditions, medications, allergies, behavioral triggers, safety concerns, emergency protocols..." /></div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setActiveTab("individual")} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
            <button type="button" onClick={() => setActiveTab("goals")} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Next: Goals →</button>
          </div>
        </div>
      )}

      {/* Tab 3: Goals */}
      {activeTab === "goals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-lg">ISP Goals</h2>
            <button type="button" onClick={addGoal} className="text-teal-600 text-sm font-semibold border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">+ Add Goal</button>
          </div>
          {goals.map((goal, i) => (
            <div key={goal.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</div>
                  <select value={goal.category} onChange={e => updateGoal(goal.id, "category", e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {ADL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {goals.length > 1 && <button type="button" onClick={() => removeGoal(goal.id)} className="text-slate-300 hover:text-red-400 text-lg">✕</button>}
              </div>
              <div><label className={labelClass}>Goal Statement *</label><textarea value={goal.description} onChange={e => updateGoal(goal.id, "description", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="[Individual's name] will demonstrate..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Baseline / Current Level</label><input value={goal.baseline} onChange={e => updateGoal(goal.id, "baseline", e.target.value)} className={inputClass} placeholder="Current performance level..." /></div>
                <div><label className={labelClass}>Target / Outcome</label><input value={goal.target} onChange={e => updateGoal(goal.id, "target", e.target.value)} className={inputClass} placeholder="Measurable target..." /></div>
                <div><label className={labelClass}>Teaching Method / Strategy</label><input value={goal.method} onChange={e => updateGoal(goal.id, "method", e.target.value)} className={inputClass} placeholder="How will this be taught?" /></div>
                <div>
                  <label className={labelClass}>Data Collection Frequency</label>
                  <select value={goal.frequency} onChange={e => updateGoal(goal.id, "frequency", e.target.value)} className={inputClass}>
                    <option>Daily</option><option>Weekly</option><option>Monthly</option><option>Each opportunity</option><option>Shift-by-shift</option>
                  </select>
                </div>
                <div className="col-span-2"><label className={labelClass}>Responsible Party</label>
                  <select value={goal.responsible_party} onChange={e => updateGoal(goal.id, "responsible_party", e.target.value)} className={inputClass}>
                    <option>Direct Support Professional</option><option>Program Supervisor</option><option>Behavior Specialist</option><option>Speech-Language Pathologist</option><option>Occupational Therapist</option><option>Family / Guardian</option><option>Individual</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-between">
            <button type="button" onClick={() => setActiveTab("background")} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
            <button type="button" onClick={() => setActiveTab("guardian")} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">Next: Signatures →</button>
          </div>
        </div>
      )}

      {/* Tab 4: Guardian & Signatures */}
      {activeTab === "guardian" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-semibold text-slate-900">Guardian & Signatures</h2>
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
            ℹ️ ISPs require signatures from the individual (or guardian), support coordinator, and other team members. Signatures can be added after saving the draft.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Legal Guardian / Conservator Name</label><input value={form.guardian_name} onChange={e => set("guardian_name", e.target.value)} className={inputClass} placeholder="Full legal name" /></div>
            <div>
              <label className={labelClass}>Relationship</label>
              <select value={form.guardian_relationship} onChange={e => set("guardian_relationship", e.target.value)} className={inputClass}>
                <option>Parent</option><option>Sibling</option><option>Spouse</option><option>Court-Appointed Guardian</option><option>Public Guardian</option><option>Self (no guardian)</option>
              </select>
            </div>
          </div>
          <div><label className={labelClass}>Additional Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className={inputClass + " resize-none"} placeholder="Team meeting notes, special considerations, waiver details..." /></div>
          <div className="flex justify-between">
            <button type="button" onClick={() => setActiveTab("goals")} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">← Back</button>
            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save ISP Draft"}
            </button>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
    </form>
  );
}

export default function NewISPPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewISPForm /></Suspense>;
}
