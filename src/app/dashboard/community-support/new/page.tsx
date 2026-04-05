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

const ACTIVITY_TYPES = [
  { value: "case_management", label: "Case Management" },
  { value: "community_integration", label: "Community Integration" },
  { value: "natural_supports", label: "Natural Supports" },
  { value: "transportation", label: "Transportation" },
  { value: "housing_support", label: "Housing Support" },
  { value: "employment_support", label: "Employment Support" },
  { value: "benefits_assistance", label: "Benefits Assistance" },
  { value: "food_access", label: "Food Access" },
  { value: "social_skills", label: "Social Skills" },
  { value: "independent_living", label: "Independent Living" },
  { value: "family_support", label: "Family Support" },
  { value: "crisis_intervention", label: "Crisis Intervention" },
  { value: "other", label: "Other" },
];

const LOCATIONS = [
  "Office",
  "Client's Home",
  "Community",
  "Phone",
  "Telehealth Platform",
  "Food Bank",
  "Shelter / Housing Program",
  "Employment Agency",
  "Benefits Office",
  "Hospital",
  "School",
  "Court / Legal Setting",
  "Other",
];

const GOAL_AREAS = [
  "Independent Living",
  "Housing Stability",
  "Employment / Education",
  "Financial Management",
  "Community Participation",
  "Natural Supports",
  "Health & Wellness",
  "Mental Health",
  "Substance Use Recovery",
  "Family Relationships",
  "Benefits & Entitlements",
  "Transportation",
  "Food Security",
  "Safety Planning",
  "Social Skills",
  "Legal Issues",
  "Cultural Connection",
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
  { value: "rescheduled", label: "Rescheduled" },
];

const DRAFT_KEY = "community-support-draft";

interface FormState {
  client_id: string;
  client_name: string;
  activity_date: string;
  start_time: string;
  end_time: string;
  activity_type: string;
  location: string;
  setting: string;
  staff_name: string;
  staff_credentials: string;
  activity_summary: string;
  goals_addressed: string[];
  client_response: string;
  progress_notes: string;
  barriers_identified: string;
  action_steps: string;
  resources_connected: string;
  collateral_contacts: string;
  engagement_level: string;
  attendance: string;
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

function NewCommunitySupportForm() {
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
    activity_date: today,
    start_time: "",
    end_time: "",
    activity_type: "case_management",
    location: "Office",
    setting: "",
    staff_name: "",
    staff_credentials: "",
    activity_summary: "",
    goals_addressed: [],
    client_response: "",
    progress_notes: "",
    barriers_identified: "",
    action_steps: "",
    resources_connected: "",
    collateral_contacts: "",
    engagement_level: "fully_engaged",
    attendance: "attended",
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
          if (parsed.activity_summary || parsed.staff_name || parsed.client_id) {
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

  function toggleGoal(area: string) {
    setForm(f => ({
      ...f,
      goals_addressed: f.goals_addressed.includes(area)
        ? f.goals_addressed.filter(g => g !== area)
        : [...f.goals_addressed, area],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError("Please select a client"); return; }
    if (!form.staff_name) { setError("Staff name is required"); return; }
    if (!form.activity_summary) { setError("Activity summary is required"); return; }
    setSaving(true);
    setError("");

    const res = await fetch("/api/community-support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }

    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    router.push(`/dashboard/community-support/${data.activity.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const textareaClass = inputClass + " resize-none";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/community-support" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Community Support Activity</h1>
          <p className="text-slate-500 text-sm mt-0.5">Document community-based support services</p>
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

      {/* ── Activity Information ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Activity Information</h2>

        {/* Client */}
        <div className="relative">
          <label className={labelClass}>Client *</label>
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
                placeholder="Search client by name or MRN..."
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
                        {c.preferred_name && <span className="text-slate-400 font-normal ml-1.5">"{c.preferred_name}"</span>}
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
            <label className={labelClass}>Date *</label>
            <input type="date" value={form.activity_date} onChange={e => set("activity_date", e.target.value)} className={inputClass} />
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
            <label className={labelClass}>Activity Type</label>
            <select value={form.activity_type} onChange={e => set("activity_type", e.target.value)} className={inputClass}>
              {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
            value={form.setting}
            onChange={e => set("setting", e.target.value)}
            className={inputClass}
            placeholder="e.g. Community center, client's neighborhood, job site..."
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
              placeholder="e.g. CSS, QIDP, Case Manager"
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

      {/* ── Goals Addressed ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Goals / Areas Addressed</h2>
        <div className="flex flex-wrap gap-2">
          {GOAL_AREAS.map(area => (
            <button
              key={area}
              type="button"
              onClick={() => toggleGoal(area)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                form.goals_addressed.includes(area)
                  ? "bg-teal-500 text-white border-teal-500"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* ── Activity Documentation ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Activity Documentation</h2>

        <div>
          <label className={labelClass}>Activity Summary *</label>
          <textarea
            value={form.activity_summary}
            onChange={e => set("activity_summary", e.target.value)}
            rows={4}
            className={textareaClass}
            placeholder="Describe what was done during this activity, interventions provided, services delivered, contacts made..."
          />
        </div>

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
          <label className={labelClass}>Client Response</label>
          <textarea
            value={form.client_response}
            onChange={e => set("client_response", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="How did the client respond to the activity and support provided?"
          />
        </div>

        <div>
          <label className={labelClass}>Progress Notes</label>
          <textarea
            value={form.progress_notes}
            onChange={e => set("progress_notes", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Progress toward individual goals, observable changes, skill development..."
          />
        </div>

        <div>
          <label className={labelClass}>Barriers Identified</label>
          <textarea
            value={form.barriers_identified}
            onChange={e => set("barriers_identified", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Barriers to community participation, goal achievement, or service access..."
          />
        </div>

        <div>
          <label className={labelClass}>Resources Connected / Services Accessed</label>
          <textarea
            value={form.resources_connected}
            onChange={e => set("resources_connected", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Community resources linked, referrals made, services accessed (food bank, benefits office, transportation, etc.)..."
          />
        </div>

        <div>
          <label className={labelClass}>Collateral Contacts</label>
          <textarea
            value={form.collateral_contacts}
            onChange={e => set("collateral_contacts", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Contact with family members, natural supports, other service providers, employers, landlords..."
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
            placeholder="Describe the safety concern and actions taken (supervisor notified, crisis team contacted, safety planning, etc.)..."
          />
        )}
      </div>

      {/* ── Next Steps ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Next Steps</h2>

        <div>
          <label className={labelClass}>Action Steps / Follow-Up Tasks</label>
          <textarea
            value={form.action_steps}
            onChange={e => set("action_steps", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Specific tasks or steps to be completed before or at the next contact..."
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
              placeholder="What to focus on next contact..."
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
              placeholder="e.g. T1016, H2015"
            />
          </div>
          <div>
            <label className={labelClass}>Modifier</label>
            <input
              value={form.billing_modifier}
              onChange={e => set("billing_modifier", e.target.value)}
              className={inputClass}
              placeholder="e.g. U1, HQ"
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
            This activity is billable
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
            href="/dashboard/community-support"
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Activity"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function NewCommunitySupportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <NewCommunitySupportForm />
    </Suspense>
  );
}
