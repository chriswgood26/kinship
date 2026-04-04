"use client";

import ICD10Input from "@/components/ICD10Input";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; pronouns?: string | null; }

interface Goal {
  id: string;
  description: string;
  target_date: string;
  objectives: Objective[];
}

interface Objective {
  id: string;
  description: string;
  intervention: string;
  status: string;
}

interface ICD10Suggestion {
  code: string;
  description: string;
  source: string;
  confidence: "high" | "moderate" | "low";
  reasoning: string;
}

interface AssessmentSources {
  phq9: { score: number; severity: string; date: string } | null;
  gad7: { score: number; severity: string; date: string } | null;
  cssrs: { date: string } | null;
  imcans: { score: number; date: string } | null;
}

function makeId() { return Math.random().toString(36).slice(2, 9); }

export default function NewTreatmentPlanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [suggestions, setSuggestions] = useState<ICD10Suggestion[]>([]);
  const [sources, setSources] = useState<AssessmentSources | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dismissedCodes, setDismissedCodes] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    client_id: "", patient_name: "",
    plan_start_date: new Date().toISOString().split("T")[0],
    next_review_date: "",
    presenting_problem: "",
    strengths: "",
    barriers: "",
    diagnosis_codes: "",
    level_of_care: "",
  });

  const [goals, setGoals] = useState<Goal[]>([
    { id: makeId(), description: "", target_date: "", objectives: [{ id: makeId(), description: "", intervention: "", status: "not_started" }] }
  ]);

  useEffect(() => {
    // Default review date 90 days out
    const d = new Date();
    d.setDate(d.getDate() + 90);
    setForm(f => ({ ...f, next_review_date: d.toISOString().split("T")[0] }));
  }, []);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`)
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  async function fetchSuggestions(clientId: string) {
    if (!clientId) return;
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    try {
      const res = await fetch(`/api/icd10/suggest?client_id=${clientId}`, { credentials: "include" });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setSources(data.sources || null);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function acceptSuggestion(code: string) {
    const current = form.diagnosis_codes ? form.diagnosis_codes.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    if (!current.includes(code)) {
      setForm(f => ({ ...f, diagnosis_codes: [...current, code].join(", ") }));
    }
    setDismissedCodes(d => new Set([...d, code]));
  }

  function dismissSuggestion(code: string) {
    setDismissedCodes(d => new Set([...d, code]));
  }

  function addGoal() {
    setGoals(g => [...g, { id: makeId(), description: "", target_date: "", objectives: [{ id: makeId(), description: "", intervention: "", status: "not_started" }] }]);
  }

  function removeGoal(id: string) {
    setGoals(g => g.filter(goal => goal.id !== id));
  }

  function updateGoal(id: string, field: string, value: string) {
    setGoals(g => g.map(goal => goal.id === id ? { ...goal, [field]: value } : goal));
  }

  function addObjective(goalId: string) {
    setGoals(g => g.map(goal => goal.id === goalId
      ? { ...goal, objectives: [...goal.objectives, { id: makeId(), description: "", intervention: "", status: "not_started" }] }
      : goal));
  }

  function removeObjective(goalId: string, objId: string) {
    setGoals(g => g.map(goal => goal.id === goalId
      ? { ...goal, objectives: goal.objectives.filter(o => o.id !== objId) }
      : goal));
  }

  function updateObjective(goalId: string, objId: string, field: string, value: string) {
    setGoals(g => g.map(goal => goal.id === goalId
      ? { ...goal, objectives: goal.objectives.map(o => o.id === objId ? { ...o, [field]: value } : o) }
      : goal));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError("Please select a patient"); return; }
    if (!goals[0]?.description) { setError("At least one goal is required"); return; }
    setSaving(true);
    const res = await fetch("/api/treatment-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        diagnosis_codes: form.diagnosis_codes.split(",").map(s => s.trim()).filter(Boolean),
        goals,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }
    router.push(`/dashboard/treatment-plans/${data.plan.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/treatment-plans" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Treatment Plan</h1>
          <p className="text-slate-500 text-sm mt-0.5">Person-centered care planning</p>
        </div>
      </div>

      {/* Patient */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Patient & Plan Info</h2>

        <div className="relative">
          <label className={labelClass}>Patient *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))} className="text-teal-500 text-sm">✕ Change</button>
            </div>
          ) : (
            <div className="relative">
              <input type="text" value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search patient name or MRN..." />
              {patients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {patients.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, client_id: p.id, patient_name: `${p.last_name}, ${p.first_name}` })); setPatientSearch(""); setPatients([]); fetchSuggestions(p.id); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className="font-semibold text-sm text-slate-900">
                        {p.last_name}, {p.first_name}
                        {p.preferred_name && <span className="text-slate-400 font-normal ml-1.5">"{p.preferred_name}"</span>}
                      </div>
                      <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}{p.pronouns ? ` · ${p.pronouns}` : ""}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Plan Start Date</label>
            <input type="date" value={form.plan_start_date} onChange={e => setForm(f => ({ ...f, plan_start_date: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Next Review Date</label>
            <input type="date" value={form.next_review_date} onChange={e => setForm(f => ({ ...f, next_review_date: e.target.value }))} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={labelClass + " mb-0"}>Diagnosis Codes (ICD-10)</label>
              {form.client_id && (
                <button
                  type="button"
                  onClick={() => fetchSuggestions(form.client_id)}
                  disabled={loadingSuggestions}
                  className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2.5 py-1 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {loadingSuggestions ? (
                    <><span className="animate-spin">⟳</span> Analyzing...</>
                  ) : (
                    <><span>✦</span> Suggest from Assessments</>
                  )}
                </button>
              )}
            </div>
            <ICD10Input
              value={form.diagnosis_codes}
              onChange={val => setForm(f => ({ ...f, diagnosis_codes: val }))}
              placeholder="Search ICD-10 codes..."
            />
          </div>
          <div>
            <label className={labelClass}>Level of Care</label>
            <select value={form.level_of_care} onChange={e => setForm(f => ({ ...f, level_of_care: e.target.value }))} className={inputClass}>
              <option value="">Select...</option>
              <option>Outpatient</option>
              <option>Intensive Outpatient (IOP)</option>
              <option>Partial Hospitalization (PHP)</option>
              <option>Residential</option>
              <option>Inpatient</option>
              <option>Community-Based</option>
            </select>
          </div>
        </div>

        {/* ICD-10 Suggestions Panel */}
        {showSuggestions && (
          <div className="border border-violet-200 rounded-2xl overflow-hidden">
            <div className="bg-violet-50 px-5 py-3 flex items-center justify-between border-b border-violet-200">
              <div className="flex items-center gap-2">
                <span className="text-violet-600 text-base">✦</span>
                <span className="font-semibold text-slate-900 text-sm">AI-Suggested Diagnoses</span>
                <span className="text-xs text-slate-500">from recent assessments</span>
              </div>
              <button type="button" onClick={() => setShowSuggestions(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            {/* Assessment sources summary */}
            {sources && (
              <div className="bg-slate-50 border-b border-violet-100 px-5 py-2 flex flex-wrap gap-3">
                {sources.phq9 && (
                  <span className="text-xs text-slate-500">
                    PHQ-9 <span className="font-semibold text-slate-700">{sources.phq9.score}/27</span>{" "}
                    <span className="text-slate-400">({sources.phq9.severity})</span>
                  </span>
                )}
                {sources.gad7 && (
                  <span className="text-xs text-slate-500">
                    GAD-7 <span className="font-semibold text-slate-700">{sources.gad7.score}/21</span>{" "}
                    <span className="text-slate-400">({sources.gad7.severity})</span>
                  </span>
                )}
                {sources.cssrs && <span className="text-xs text-slate-500">C-SSRS <span className="text-slate-400">(on file)</span></span>}
                {sources.imcans && (
                  <span className="text-xs text-slate-500">
                    IM+CANS <span className="font-semibold text-slate-700">score {sources.imcans.score}</span>
                  </span>
                )}
                {!sources.phq9 && !sources.gad7 && !sources.cssrs && !sources.imcans && (
                  <span className="text-xs text-slate-400 italic">No completed assessments found for this client</span>
                )}
              </div>
            )}

            {loadingSuggestions ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Analyzing assessment data...</div>
            ) : suggestions.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="text-slate-400 text-sm">No suggestions available</div>
                <div className="text-xs text-slate-400 mt-1">Complete a PHQ-9, GAD-7, C-SSRS, or IM+CANS assessment first</div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {suggestions.map(s => {
                  const accepted = form.diagnosis_codes.includes(s.code);
                  const dismissed = dismissedCodes.has(s.code) && !accepted;
                  if (dismissed) return null;
                  return (
                    <div key={s.code} className={`px-5 py-4 flex items-start gap-4 ${accepted ? "bg-emerald-50" : "bg-white"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-slate-900">{s.code}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            s.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                            s.confidence === "moderate" ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-500"
                          }`}>
                            {s.confidence} confidence
                          </span>
                          <span className="text-xs text-violet-600 font-medium">{s.source}</span>
                        </div>
                        <div className="text-sm text-slate-700 mt-0.5">{s.description}</div>
                        <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{s.reasoning}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {accepted ? (
                          <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">✓ Added</span>
                        ) : (
                          <>
                            <button type="button" onClick={() => acceptSuggestion(s.code)}
                              className="text-xs font-semibold bg-teal-500 text-white px-3 py-1.5 rounded-lg hover:bg-teal-400 transition-colors">
                              + Add
                            </button>
                            <button type="button" onClick={() => dismissSuggestion(s.code)}
                              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                              Dismiss
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bg-slate-50 border-t border-violet-100 px-5 py-2">
              <p className="text-xs text-slate-400">
                ⚠️ Suggestions are clinical decision support only — not a substitute for clinical judgment. Verify all diagnoses before finalizing.
              </p>
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>Presenting Problem</label>
          <textarea value={form.presenting_problem} onChange={e => setForm(f => ({ ...f, presenting_problem: e.target.value }))}
            rows={3} className={inputClass + " resize-none"} placeholder="Describe the primary presenting problem and reason for treatment..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Strengths & Supports</label>
            <textarea value={form.strengths} onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))}
              rows={3} className={inputClass + " resize-none"} placeholder="Client strengths, supports, protective factors..." />
          </div>
          <div>
            <label className={labelClass}>Barriers to Treatment</label>
            <textarea value={form.barriers} onChange={e => setForm(f => ({ ...f, barriers: e.target.value }))}
              rows={3} className={inputClass + " resize-none"} placeholder="Transportation, housing, social support gaps..." />
          </div>
        </div>
      </div>

      {/* Goals & Objectives */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-lg">Goals & Objectives</h2>
          <button type="button" onClick={addGoal}
            className="text-teal-600 text-sm font-semibold hover:text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">
            + Add Goal
          </button>
        </div>

        {goals.map((goal, gi) => (
          <div key={goal.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 bg-teal-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                {gi + 1}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className={labelClass}>Goal *</label>
                  <textarea value={goal.description} onChange={e => updateGoal(goal.id, "description", e.target.value)}
                    rows={2} className={inputClass + " resize-none"} placeholder="Client will..." />
                </div>
                <div>
                  <label className={labelClass}>Target Date</label>
                  <input type="date" value={goal.target_date} onChange={e => updateGoal(goal.id, "target_date", e.target.value)} className={inputClass} />
                </div>

                {/* Objectives */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className={labelClass + " mb-0"}>Objectives & Interventions</label>
                    <button type="button" onClick={() => addObjective(goal.id)}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium">+ Add Objective</button>
                  </div>
                  {goal.objectives.map((obj, oi) => (
                    <div key={obj.id} className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Objective {oi + 1}</span>
                        {goal.objectives.length > 1 && (
                          <button type="button" onClick={() => removeObjective(goal.id, obj.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Objective</label>
                        <input type="text" value={obj.description} onChange={e => updateObjective(goal.id, obj.id, "description", e.target.value)}
                          className={inputClass} placeholder="Measurable, observable behavior..." />
                      </div>
                      <div>
                        <label className={labelClass}>Intervention</label>
                        <input type="text" value={obj.intervention} onChange={e => updateObjective(goal.id, obj.id, "intervention", e.target.value)}
                          className={inputClass} placeholder="CBT, DBT skills training, motivational interviewing..." />
                      </div>
                      <div>
                        <label className={labelClass}>Status</label>
                        <select value={obj.status} onChange={e => updateObjective(goal.id, obj.id, "status", e.target.value)} className={inputClass}>
                          <option value="not_started">Not Started</option>
                          <option value="in_progress">In Progress</option>
                          <option value="achieved">Achieved</option>
                          <option value="discontinued">Discontinued</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {goals.length > 1 && (
                <button type="button" onClick={() => removeGoal(goal.id)} className="text-slate-300 hover:text-red-400 text-lg flex-shrink-0">✕</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/treatment-plans" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Save Plan"}
        </button>
      </div>
    </form>
  );
}
