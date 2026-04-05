"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string | null;
  preferred_name?: string | null;
}

const SERVICE_TYPES = [
  { value: "in_home_hab", label: "In-Home Habilitation" },
  { value: "community_hab", label: "Community Habilitation" },
  { value: "day_hab", label: "Day Habilitation" },
  { value: "supported_employment", label: "Supported Employment" },
  { value: "supported_living", label: "Supported Living" },
  { value: "respite", label: "Respite" },
  { value: "prevocational", label: "Prevocational" },
  { value: "other", label: "Other" },
];

const LOCATIONS = [
  "Client's Home",
  "Community",
  "Day Program Site",
  "Work Site",
  "Office",
  "Vocational Setting",
  "Recreation Center",
  "Grocery Store / Shopping",
  "Public Transportation",
  "Park / Outdoor Setting",
  "Other",
];

const SKILL_AREAS = [
  "Activities of Daily Living (ADLs)",
  "Personal Hygiene & Grooming",
  "Meal Preparation",
  "Household Management",
  "Community Mobility",
  "Community Safety",
  "Money Management",
  "Communication Skills",
  "Social Skills",
  "Self-Advocacy",
  "Employment Skills",
  "Vocational Skills",
  "Leisure & Recreation",
  "Health & Wellness",
  "Medication Management",
  "Self-Regulation",
  "Behavioral Skills",
  "Transportation / Navigation",
  "Shopping / Consumer Skills",
  "Emergency & Safety Procedures",
];

const PROMPT_LEVELS = [
  "Independent",
  "Verbal Prompt",
  "Gestural Prompt",
  "Model Prompt",
  "Partial Physical Prompt",
  "Full Physical Prompt",
];

const ENGAGEMENT_OPTIONS = [
  { value: "fully_engaged", label: "Fully Engaged" },
  { value: "partially_engaged", label: "Partially Engaged" },
  { value: "minimal_engagement", label: "Minimal Engagement" },
  { value: "refused", label: "Refused" },
];

const ATTENDANCE_OPTIONS = [
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No Show" },
  { value: "cancelled", label: "Cancelled" },
  { value: "cancelled_by_staff", label: "Cancelled by Staff" },
  { value: "cancelled_by_client", label: "Cancelled by Client" },
];

const DRAFT_KEY = "hab-note-draft";

interface FormState {
  client_id: string;
  client_name: string;
  service_date: string;
  start_time: string;
  end_time: string;
  service_type: string;
  location: string;
  setting_details: string;
  staff_name: string;
  staff_credentials: string;
  goals_addressed: string[];
  skill_areas: string[];
  prompt_levels_used: string[];
  engagement_level: string;
  attendance: string;
  service_summary: string;
  skills_practiced: string;
  client_response: string;
  progress_toward_goals: string;
  barriers: string;
  strategies_used: string;
  next_steps: string;
  safety_concern: boolean;
  safety_notes: string;
  follow_up_date: string;
  follow_up_notes: string;
  billing_code: string;
  billing_modifier: string;
  units: number;
  is_billable: boolean;
  notes: string;
}

function NewHabNoteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [lastLocalSave, setLastLocalSave] = useState<Date | null>(null);
  const localSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const today = new Date().toISOString().split("T")[0];

  const defaultForm: FormState = {
    client_id: params.get("client_id") || "",
    client_name: "",
    service_date: today,
    start_time: "",
    end_time: "",
    service_type: "in_home_hab",
    location: "Client's Home",
    setting_details: "",
    staff_name: "",
    staff_credentials: "",
    goals_addressed: [],
    skill_areas: [],
    prompt_levels_used: [],
    engagement_level: "fully_engaged",
    attendance: "attended",
    service_summary: "",
    skills_practiced: "",
    client_response: "",
    progress_toward_goals: "",
    barriers: "",
    strategies_used: "",
    next_steps: "",
    safety_concern: false,
    safety_notes: "",
    follow_up_date: "",
    follow_up_notes: "",
    billing_code: "",
    billing_modifier: "",
    units: 1,
    is_billable: true,
    notes: "",
  };

  const [form, setForm] = useState<FormState>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...defaultForm, ...parsed } as FormState;
        }
      } catch { /* ignore */ }
    }
    return defaultForm;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(DRAFT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.service_summary || parsed.staff_name || parsed.client_id) {
            setDraftRestored(true);
          }
        }
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced local save
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, savedAt: new Date().toISOString() }));
        setLastLocalSave(new Date());
      } catch { /* ignore */ }
    }, 1500);
    return () => { if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Pre-load client if passed via query
  useEffect(() => {
    const cid = params.get("client_id");
    if (cid && !form.client_name) {
      fetch(`/api/clients/${cid}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          if (d.patient) {
            setForm(f => ({
              ...f,
              client_id: d.patient.id,
              client_name: `${d.patient.last_name}, ${d.patient.first_name}`,
            }));
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client search
  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setClients(d.patients || []));
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  const set = (k: keyof FormState, v: string | boolean | number | string[]) =>
    setForm(f => ({ ...f, [k]: v }));

  function toggleArray(field: "skill_areas" | "prompt_levels_used" | "goals_addressed", val: string) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val)
        ? f[field].filter((x: string) => x !== val)
        : [...f[field], val],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError("Please select a client"); return; }
    if (!form.staff_name) { setError("Staff name is required"); return; }
    if (!form.service_summary) { setError("Service summary is required"); return; }
    setSaving(true);
    setError("");

    const res = await fetch("/api/hab-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }

    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    router.push(`/dashboard/hab-notes/${data.note.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const textareaClass = inputClass + " resize-none";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/hab-notes" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Habilitation Note</h1>
          <p className="text-slate-500 text-sm mt-0.5">Document habilitation services and skill-building activities</p>
        </div>
      </div>

      {draftRestored && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-800">
            <span className="font-semibold">📋 Draft restored</span> — your unsaved changes have been recovered.
          </div>
          <button
            type="button"
            onClick={() => {
              setDraftRestored(false);
              setForm(defaultForm);
              try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
            }}
            className="text-amber-500 hover:text-amber-700 text-sm ml-4"
          >
            Discard draft ✕
          </button>
        </div>
      )}

      {/* ── Service Information ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Service Information</h2>

        {/* Client */}
        <div className="relative">
          <label className={labelClass}>Individual / Client *</label>
          {form.client_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.client_name}</span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, client_id: "", client_name: "" }))}
                className="text-teal-500 text-sm"
              >✕</button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
                className={inputClass}
                placeholder="Search by name or MRN..."
              />
              {clients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {clients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          client_id: c.id,
                          client_name: `${c.last_name}, ${c.first_name}`,
                        }));
                        setClientSearch("");
                        setClients([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
                      <div className="font-semibold text-sm text-slate-900">
                        {c.last_name}, {c.first_name}
                        {c.preferred_name && <span className="text-slate-400 font-normal ml-1.5">&ldquo;{c.preferred_name}&rdquo;</span>}
                      </div>
                      <div className="text-xs text-slate-400">MRN: {c.mrn || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Service Date *</label>
            <input type="date" value={form.service_date} onChange={e => set("service_date", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Start Time</label>
            <input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>End Time</label>
            <input type="time" value={form.end_time} onChange={e => set("end_time", e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Service Type</label>
            <select value={form.service_type} onChange={e => set("service_type", e.target.value)} className={inputClass}>
              {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <select value={form.location} onChange={e => set("location", e.target.value)} className={inputClass}>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Setting / Additional Location Details</label>
          <input
            value={form.setting_details}
            onChange={e => set("setting_details", e.target.value)}
            className={inputClass}
            placeholder="e.g. client's apartment, neighborhood grocery store, job site..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Staff Name *</label>
            <input
              value={form.staff_name}
              onChange={e => set("staff_name", e.target.value)}
              className={inputClass}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className={labelClass}>Credentials / Title</label>
            <input
              value={form.staff_credentials}
              onChange={e => set("staff_credentials", e.target.value)}
              className={inputClass}
              placeholder="e.g. DSP, QIDP, Hab Specialist"
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Attendance</label>
          <div className="flex flex-wrap gap-2">
            {ATTENDANCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("attendance", opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  form.attendance === opt.value
                    ? "bg-teal-500 text-white border-teal-500"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Skill Areas & Goals ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Skill Areas & Goals</h2>

        <div>
          <label className={labelClass}>Skill Areas Targeted</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_AREAS.map(area => (
              <button
                key={area}
                type="button"
                onClick={() => toggleArray("skill_areas", area)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  form.skill_areas.includes(area)
                    ? "bg-teal-500 text-white border-teal-500"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>ISP Goals Addressed</label>
          <input
            value={form.goals_addressed.join(", ")}
            onChange={e => set("goals_addressed", e.target.value ? e.target.value.split(",").map(s => s.trim()) : [])}
            className={inputClass}
            placeholder="Enter goal names or numbers, separated by commas (e.g. Goal 1: Personal Hygiene, Goal 3: Community Access)"
          />
          <p className="text-xs text-slate-400 mt-1">Enter ISP goal names or numbers, comma-separated</p>
        </div>

        <div>
          <label className={labelClass}>Prompt Levels Used</label>
          <div className="flex flex-wrap gap-2">
            {PROMPT_LEVELS.map(level => (
              <button
                key={level}
                type="button"
                onClick={() => toggleArray("prompt_levels_used", level)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  form.prompt_levels_used.includes(level)
                    ? "bg-violet-500 text-white border-violet-500"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Documentation ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Session Documentation</h2>

        <div>
          <label className={labelClass}>Engagement Level</label>
          <div className="flex flex-wrap gap-2">
            {ENGAGEMENT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("engagement_level", opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  form.engagement_level === opt.value
                    ? "bg-teal-500 text-white border-teal-500"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Service Summary *</label>
          <textarea
            value={form.service_summary}
            onChange={e => set("service_summary", e.target.value)}
            rows={4}
            className={textareaClass}
            placeholder="Describe the services provided during this session — what was done, where, and how the individual was supported..."
          />
        </div>

        <div>
          <label className={labelClass}>Skills Practiced</label>
          <textarea
            value={form.skills_practiced}
            onChange={e => set("skills_practiced", e.target.value)}
            rows={3}
            className={textareaClass}
            placeholder="Specific skills targeted and activities used to practice them (e.g. practiced making a grocery list, navigated checkout independently, cooked a meal using 3-step visual cues)..."
          />
        </div>

        <div>
          <label className={labelClass}>Individual&apos;s Response</label>
          <textarea
            value={form.client_response}
            onChange={e => set("client_response", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="How did the individual respond to the service and skill-building activities? Mood, engagement, affect..."
          />
        </div>

        <div>
          <label className={labelClass}>Progress Toward Goals</label>
          <textarea
            value={form.progress_toward_goals}
            onChange={e => set("progress_toward_goals", e.target.value)}
            rows={3}
            className={textareaClass}
            placeholder="Describe measurable progress toward ISP goals — include data, prompt levels used, and any improvements noted..."
          />
        </div>

        <div>
          <label className={labelClass}>Strategies Used</label>
          <textarea
            value={form.strategies_used}
            onChange={e => set("strategies_used", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Instructional strategies, supports, and accommodations used (e.g. visual supports, task analysis, errorless learning, modeling)..."
          />
        </div>

        <div>
          <label className={labelClass}>Barriers / Challenges</label>
          <textarea
            value={form.barriers}
            onChange={e => set("barriers", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Barriers to skill development or service delivery (e.g. fatigue, behavioral challenges, environmental factors)..."
          />
        </div>
      </div>

      {/* ── Safety ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Safety</h2>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="safety_concern"
            checked={form.safety_concern}
            onChange={e => set("safety_concern", e.target.checked)}
            className="w-4 h-4 accent-red-500"
          />
          <label htmlFor="safety_concern" className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
            🚨 Safety concern identified
          </label>
        </div>
        {form.safety_concern && (
          <textarea
            value={form.safety_notes}
            onChange={e => set("safety_notes", e.target.value)}
            rows={3}
            className={textareaClass + " border-red-200 focus:ring-red-400"}
            placeholder="Describe the safety concern and actions taken (supervisor notified, incident report filed, safety planning, etc.)..."
          />
        )}
      </div>

      {/* ── Next Steps ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Next Steps</h2>

        <div>
          <label className={labelClass}>Next Steps / Plan</label>
          <textarea
            value={form.next_steps}
            onChange={e => set("next_steps", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="What will be focused on in the next session? Any program modifications needed?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Follow-Up Date</label>
            <input
              type="date"
              value={form.follow_up_date}
              onChange={e => set("follow_up_date", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Follow-Up Notes</label>
            <input
              value={form.follow_up_notes}
              onChange={e => set("follow_up_notes", e.target.value)}
              className={inputClass}
              placeholder="Items to address at next contact..."
            />
          </div>
        </div>
      </div>

      {/* ── Billing ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Billing</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Billing Code</label>
            <input
              value={form.billing_code}
              onChange={e => set("billing_code", e.target.value)}
              className={inputClass}
              placeholder="e.g. T2017, H2019"
            />
          </div>
          <div>
            <label className={labelClass}>Modifier</label>
            <input
              value={form.billing_modifier}
              onChange={e => set("billing_modifier", e.target.value)}
              className={inputClass}
              placeholder="e.g. U1, HQ, TF"
            />
          </div>
          <div>
            <label className={labelClass}>Units (15 min each)</label>
            <input
              type="number"
              min={1}
              max={32}
              value={form.units}
              onChange={e => set("units", parseInt(e.target.value) || 1)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="is_billable"
            checked={form.is_billable}
            onChange={e => set("is_billable", e.target.checked)}
            className="w-4 h-4 accent-teal-500"
          />
          <label htmlFor="is_billable" className="text-sm font-semibold text-slate-900">
            This service is billable
          </label>
        </div>
      </div>

      {/* ── Additional Notes ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className={labelClass}>Additional Notes</label>
        <textarea
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          rows={2}
          className={textareaClass}
          placeholder="Any other relevant information not captured above..."
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-between pb-6">
        <div className="text-xs text-slate-400">
          {lastLocalSave ? (
            <span className="text-emerald-600">✓ Draft saved locally</span>
          ) : (
            <span>Changes are auto-saved locally as you type</span>
          )}
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/hab-notes"
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Hab Note"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function NewHabNotePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <NewHabNoteForm />
    </Suspense>
  );
}
