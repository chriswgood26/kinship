"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }
interface ISPGoal { id: string; description: string; category: string; }
interface DDNoteForm {
  client_id: string; patient_name: string; note_date: string; shift: string;
  staff_name: string; staff_role: string; start_time: string; end_time: string;
  location: string; activities: string; behaviors: string; mood_affect: string;
  medical_concerns: string; communication_notes: string; personal_care: string;
  community_integration: string; incidents: string; family_contact: string;
  follow_up_needed: boolean; follow_up_notes: string;
}

const SHIFTS = ["Day", "Evening", "Night", "Awake Night", "Split"];
const LOCATIONS = ["Group Home", "Day Program", "Community Outing", "Medical Appointment", "School", "Work", "Family Visit", "Other"];
const MOODS = ["Calm / Stable", "Happy / Positive", "Anxious / Worried", "Irritable / Agitated", "Sad / Withdrawn", "Excited / Elevated", "Mixed / Variable"];
const GOAL_PROGRESS = ["Made progress", "No opportunity", "Did not meet", "Refused to participate", "Achieved"];
const DD_DRAFT_KEY = "dd-note-draft";

function NewDDNoteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [ispGoals, setIspGoals] = useState<ISPGoal[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastLocalSave, setLastLocalSave] = useState<Date | null>(null);
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const now = new Date();
  const hour = now.getHours();
  const defaultShift = hour >= 7 && hour < 15 ? "Day" : hour >= 15 && hour < 23 ? "Evening" : "Night";

  const defaultForm = {
    client_id: params.get("patient_id") || "", patient_name: "",
    note_date: now.toISOString().split("T")[0],
    shift: defaultShift,
    staff_name: "",
    staff_role: "Direct Support Professional",
    start_time: hour >= 7 && hour < 15 ? "07:00" : hour >= 15 && hour < 23 ? "15:00" : "23:00",
    end_time: hour >= 7 && hour < 15 ? "15:00" : hour >= 15 && hour < 23 ? "23:00" : "07:00",
    location: "Group Home",
    activities: "",
    behaviors: "",
    mood_affect: "Calm / Stable",
    medical_concerns: "",
    communication_notes: "",
    personal_care: "",
    community_integration: "",
    incidents: "",
    family_contact: "",
    follow_up_needed: false,
    follow_up_notes: "",
  };

  const [form, setForm] = useState<DDNoteForm>(() => {
    // Restore from localStorage if available
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(DD_DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Only restore if draft is from today (DD notes are shift-based)
          if (parsed.note_date === now.toISOString().split("T")[0]) {
            return { ...defaultForm, ...parsed } as DDNoteForm;
          }
        }
      } catch { /* ignore */ }
    }
    return defaultForm;
  });

  const [goalProgress, setGoalProgress] = useState<Record<string, string>>({});

  // Check if draft was restored
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(DD_DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.note_date === now.toISOString().split("T")[0] && (parsed.activities || parsed.behaviors || parsed.staff_name)) {
            setDraftRestored(true);
          }
        }
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced localStorage persistence
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DD_DRAFT_KEY, JSON.stringify({ ...form, savedAt: new Date().toISOString() }));
        setLastLocalSave(new Date());
      } catch { /* ignore */ }
    }, 1500);
    return () => { if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  useEffect(() => {
    const pid = params.get("patient_id");
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

  // Load ISP goals when patient selected
  useEffect(() => {
    if (form.client_id) {
      fetch(`/api/isp?patient_id=${form.client_id}`, { credentials: "include" })
        .then(r => r.json()).then(d => {
          const plans = d.plans || [];
          const activePlan = plans.find((p: Record<string, string>) => p.status === "active");
          if (activePlan?.goals) {
            setIspGoals(activePlan.goals);
          }
        }).catch(() => {});
    }
  }, [form.client_id]);

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.staff_name || !form.activities) { setError("Client, staff name, and activities are required"); return; }
    setSaving(true);
    const res = await fetch("/api/dd-notes", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        ...form,
        goal_progress: Object.entries(goalProgress).map(([goal_id, progress]) => ({ goal_id, description: ispGoals.find(g => g.id === goal_id)?.description, category: ispGoals.find(g => g.id === goal_id)?.category, progress })),
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    // Clear localStorage draft on successful submit
    try { localStorage.removeItem(DD_DRAFT_KEY); } catch { /* ignore */ }
    router.push(`/dashboard/dd-notes?date=${form.note_date}&patient_id=${form.client_id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const textareaClass = inputClass + " resize-none";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  const sections = [
    { key: "activities", label: "Activities & Daily Schedule", placeholder: "What activities did the individual participate in today? Meals, programming, outings, recreational activities..." },
    { key: "behaviors", label: "Behavioral Observations", placeholder: "Describe any behavioral incidents, triggers, de-escalation strategies used, responses to interventions..." },
    { key: "personal_care", label: "Personal Care & ADLs", placeholder: "Grooming, hygiene, dressing, eating assistance, medications taken (see eMAR for details)..." },
    { key: "communication_notes", label: "Communication", placeholder: "How did the individual communicate today? Use of AAC, verbal, behavioral communication, notable interactions..." },
    { key: "community_integration", label: "Community Integration", placeholder: "Community outings, social interactions, employment, school, transportation..." },
    { key: "medical_concerns", label: "Medical & Health Concerns", placeholder: "Any health complaints, medication side effects, injuries, medical appointments..." },
    { key: "family_contact", label: "Family / Guardian Contact", placeholder: "Any contact with family or guardian — phone calls, visits, messages..." },
    { key: "incidents", label: "Incidents / Critical Events", placeholder: "Any incidents not captured elsewhere — property damage, police contact, elopement, unusual events..." },
  ];

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/dd-notes" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">DD Progress Note</h1>
          <p className="text-slate-500 text-sm mt-0.5">Daily shift documentation</p>
        </div>
      </div>

      {/* Draft restored notice */}
      {draftRestored && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-800">
            <span className="font-semibold">📋 Draft restored</span> — your unsaved changes from a previous session have been recovered.
          </div>
          <button type="button" onClick={() => { setDraftRestored(false); try { localStorage.removeItem(DD_DRAFT_KEY); } catch { /* ignore */ } }} className="text-amber-500 hover:text-amber-700 text-sm ml-4">Discard draft ✕</button>
        </div>
      )}

      {/* Header info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Shift Information</h2>

        {/* Patient */}
        <div className="relative">
          <label className={labelClass}>Individual / Client *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button type="button" onClick={() => { setForm(f => ({ ...f, client_id: "", patient_name: "" })); setIspGoals([]); }} className="text-teal-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search client..." />
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
          <div><label className={labelClass}>Date</label><input type="date" value={form.note_date} onChange={e => set("note_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Shift</label>
            <select value={form.shift} onChange={e => set("shift", e.target.value)} className={inputClass}>
              {SHIFTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Location</label>
            <select value={form.location} onChange={e => set("location", e.target.value)} className={inputClass}>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Start Time</label><input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>End Time</label><input type="time" value={form.end_time} onChange={e => set("end_time", e.target.value)} className={inputClass} /></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Staff Name *</label><input value={form.staff_name} onChange={e => set("staff_name", e.target.value)} className={inputClass} placeholder="Your full name" /></div>
          <div><label className={labelClass}>Staff Role</label>
            <select value={form.staff_role} onChange={e => set("staff_role", e.target.value)} className={inputClass}>
              {["Direct Support Professional", "Lead DSP", "Program Supervisor", "Behavior Specialist", "Nurse", "Case Manager", "Intern / Trainee", "Other"].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Mood & Affect</label>
          <div className="flex flex-wrap gap-2">
            {MOODS.map(mood => (
              <button key={mood} type="button" onClick={() => set("mood_affect", mood)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.mood_affect === mood ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {mood}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Documentation sections */}
      {sections.map(section => (
        <div key={section.key} className="bg-white rounded-2xl border border-slate-200 p-5">
          <label className={labelClass}>{section.label}{section.key === "activities" ? " *" : ""}</label>
          <textarea value={(form as unknown as Record<string, string | boolean>)[section.key] as string}
            onChange={e => set(section.key, e.target.value)}
            rows={3} className={textareaClass} placeholder={section.placeholder} />
        </div>
      ))}

      {/* ISP Goal Progress */}
      {ispGoals.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">ISP Goal Progress</h2>
            <p className="text-xs text-slate-400 mt-0.5">Document progress on active ISP goals for this shift</p>
          </div>
          <div className="divide-y divide-slate-50">
            {ispGoals.map((goal, i) => (
              <div key={goal.id || i} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-0.5">{goal.category}</div>
                    <div className="text-sm text-slate-900">{goal.description}</div>
                  </div>
                  <select value={goalProgress[goal.id] || ""}
                    onChange={e => setGoalProgress(prev => ({ ...prev, [goal.id]: e.target.value }))}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 flex-shrink-0">
                    <option value="">Select...</option>
                    {GOAL_PROGRESS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="follow_up" checked={form.follow_up_needed} onChange={e => set("follow_up_needed", e.target.checked)} className="w-4 h-4 accent-amber-500" />
          <label htmlFor="follow_up" className="text-sm font-semibold text-slate-900 flex items-center gap-1">
            <span>⚠️</span> Follow-up action required
          </label>
        </div>
        {form.follow_up_needed && (
          <textarea value={form.follow_up_notes} onChange={e => set("follow_up_notes", e.target.value)} rows={2}
            className={textareaClass} placeholder="Describe what follow-up is needed and by whom..." />
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex items-center justify-between pb-6">
        <div className="text-xs text-slate-400">
          {lastLocalSave ? (
            <span className="text-emerald-600">✓ Draft saved locally</span>
          ) : (
            <span>Changes are saved locally as you type</span>
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/dd-notes" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
          <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
            {saving ? "Saving..." : "Save Progress Note"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function NewDDNotePage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewDDNoteForm /></Suspense>;
}
