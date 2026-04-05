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

const SESSION_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "group", label: "Group" },
  { value: "phone", label: "Phone" },
  { value: "telehealth", label: "Telehealth" },
  { value: "text_outreach", label: "Text Outreach" },
  { value: "community", label: "Community" },
];

const LOCATIONS = [
  "Office",
  "Community",
  "Client's Home",
  "Phone",
  "Telehealth Platform",
  "Hospital / Emergency",
  "Shelter / Housing Program",
  "Other",
];

const FOCUS_AREAS = [
  "Recovery & Wellness",
  "Mental Health",
  "Substance Use",
  "Housing",
  "Employment",
  "Family & Relationships",
  "Social Support",
  "Benefits & Entitlements",
  "Criminal Justice",
  "Physical Health",
  "Education",
  "Life Skills",
  "Crisis Prevention",
  "Medication Adherence",
];

const CREDENTIALS = ["CPRS", "CPS", "PRSS", "RSS", "PSS", "CPRP", "Other"];

const ENGAGEMENT_OPTIONS = [
  { value: "fully_engaged", label: "Fully Engaged" },
  { value: "partially_engaged", label: "Partially Engaged" },
  { value: "minimal_engagement", label: "Minimal Engagement" },
  { value: "refused", label: "Refused" },
];

const DRAFT_KEY = "peer-support-draft";

interface FormState {
  client_id: string;
  client_name: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_type: string;
  location: string;
  specialist_name: string;
  specialist_credentials: string;
  session_focus: string[];
  session_summary: string;
  lived_experience_shared: boolean;
  lived_experience_notes: string;
  engagement_level: string;
  wellness_plan_reviewed: boolean;
  recovery_goals_addressed: string;
  strengths_identified: string;
  barriers_addressed: string;
  safety_check_completed: boolean;
  crisis_indicated: boolean;
  crisis_response_taken: string;
  next_session_planned: string;
  next_session_notes: string;
  referrals_made: string;
  billing_code: string;
  billing_modifier: string;
  units: number;
  is_billable: boolean;
  notes: string;
}

function NewPeerSupportForm() {
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
    session_date: today,
    start_time: "",
    end_time: "",
    session_type: "individual",
    location: "Office",
    specialist_name: "",
    specialist_credentials: "",
    session_focus: [],
    session_summary: "",
    lived_experience_shared: false,
    lived_experience_notes: "",
    engagement_level: "fully_engaged",
    wellness_plan_reviewed: false,
    recovery_goals_addressed: "",
    strengths_identified: "",
    barriers_addressed: "",
    safety_check_completed: false,
    crisis_indicated: false,
    crisis_response_taken: "",
    next_session_planned: "",
    next_session_notes: "",
    referrals_made: "",
    billing_code: "H0038",
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
          if (parsed.session_summary || parsed.specialist_name || parsed.client_id) {
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

  function toggleFocus(area: string) {
    setForm(f => ({
      ...f,
      session_focus: f.session_focus.includes(area)
        ? f.session_focus.filter(a => a !== area)
        : [...f.session_focus, area],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) { setError("Please select a client"); return; }
    if (!form.specialist_name) { setError("Specialist name is required"); return; }
    if (!form.session_summary) { setError("Session summary is required"); return; }
    if (!form.safety_check_completed && !form.crisis_indicated) {
      // Just a warning — don't block
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/peer-support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }

    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    router.push(`/dashboard/peer-support/${data.session.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const textareaClass = inputClass + " resize-none";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/peer-support" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Peer Support Session</h1>
          <p className="text-slate-500 text-sm mt-0.5">CCBHC peer support documentation · H0038</p>
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

      {/* ── Session Information ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Session Information</h2>

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
            <input type="date" value={form.session_date} onChange={e => set("session_date", e.target.value)} className={inputClass} />
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
            <label className={labelClass}>Session Type</label>
            <select value={form.session_type} onChange={e => set("session_type", e.target.value)} className={inputClass}>
              {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <select value={form.location} onChange={e => set("location", e.target.value)} className={inputClass}>
              {LOCATIONS.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Peer Specialist Name *</label>
            <input
              value={form.specialist_name}
              onChange={e => set("specialist_name", e.target.value)}
              className={inputClass}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className={labelClass}>Credentials</label>
            <select value={form.specialist_credentials} onChange={e => set("specialist_credentials", e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              {CREDENTIALS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Session Focus ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Session Focus Areas</h2>
        <div className="flex flex-wrap gap-2">
          {FOCUS_AREAS.map(area => (
            <button
              key={area}
              type="button"
              onClick={() => toggleFocus(area)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                form.session_focus.includes(area)
                  ? "bg-teal-500 text-white border-teal-500"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* ── Session Documentation ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Session Documentation</h2>

        <div>
          <label className={labelClass}>Session Summary *</label>
          <textarea
            value={form.session_summary}
            onChange={e => set("session_summary", e.target.value)}
            rows={4}
            className={textareaClass}
            placeholder="Describe what was discussed and accomplished during this session, the member's presentation, response to peer support, key themes..."
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
          <label className={labelClass}>Recovery Goals Addressed</label>
          <textarea
            value={form.recovery_goals_addressed}
            onChange={e => set("recovery_goals_addressed", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Which goals from the member's wellness/recovery plan were discussed or worked on?"
          />
        </div>

        <div>
          <label className={labelClass}>Strengths Identified</label>
          <textarea
            value={form.strengths_identified}
            onChange={e => set("strengths_identified", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Strengths, resources, and positive coping skills identified during this session..."
          />
        </div>

        <div>
          <label className={labelClass}>Barriers Addressed</label>
          <textarea
            value={form.barriers_addressed}
            onChange={e => set("barriers_addressed", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Barriers to recovery, wellness, or community integration addressed..."
          />
        </div>
      </div>

      {/* ── Peer Specialist Disclosure ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Peer Specialist Disclosure</h2>
        <p className="text-xs text-slate-400">
          Appropriate self-disclosure of lived experience is a core tool in peer support — document if used.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="lived_experience"
            checked={form.lived_experience_shared}
            onChange={e => set("lived_experience_shared", e.target.checked)}
            className="w-4 h-4 accent-teal-500"
          />
          <label htmlFor="lived_experience" className="text-sm font-semibold text-slate-900">
            Peer specialist shared relevant lived experience
          </label>
        </div>
        {form.lived_experience_shared && (
          <textarea
            value={form.lived_experience_notes}
            onChange={e => set("lived_experience_notes", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Brief context on how lived experience was applied (do not include personal identifiers)..."
          />
        )}
        <div className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            id="wellness_plan"
            checked={form.wellness_plan_reviewed}
            onChange={e => set("wellness_plan_reviewed", e.target.checked)}
            className="w-4 h-4 accent-teal-500"
          />
          <label htmlFor="wellness_plan" className="text-sm font-semibold text-slate-900">
            Wellness / WRAP plan reviewed with member
          </label>
        </div>
      </div>

      {/* ── Safety Check ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Safety Check</h2>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="safety_check"
            checked={form.safety_check_completed}
            onChange={e => set("safety_check_completed", e.target.checked)}
            className="w-4 h-4 accent-teal-500"
          />
          <label htmlFor="safety_check" className="text-sm font-semibold text-slate-900">
            Safety check completed
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="crisis"
            checked={form.crisis_indicated}
            onChange={e => set("crisis_indicated", e.target.checked)}
            className="w-4 h-4 accent-red-500"
          />
          <label htmlFor="crisis" className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
            🚨 Crisis or safety concern indicated
          </label>
        </div>
        {form.crisis_indicated && (
          <textarea
            value={form.crisis_response_taken}
            onChange={e => set("crisis_response_taken", e.target.value)}
            rows={3}
            className={textareaClass + " border-red-200 focus:ring-red-400"}
            placeholder="Describe the crisis or safety concern and actions taken (warmline, 988, crisis team contact, supervisor notified, safety planning)..."
          />
        )}
      </div>

      {/* ── Next Steps ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">Next Steps</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Next Session Planned</label>
            <input
              type="date"
              value={form.next_session_planned}
              onChange={e => set("next_session_planned", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Next Session Notes</label>
            <input
              value={form.next_session_notes}
              onChange={e => set("next_session_notes", e.target.value)}
              className={inputClass}
              placeholder="Topics to cover, goals to address..."
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Referrals / Linkages Made</label>
          <textarea
            value={form.referrals_made}
            onChange={e => set("referrals_made", e.target.value)}
            rows={2}
            className={textareaClass}
            placeholder="Any referrals to services, warm handoffs, or linkages made during this session..."
          />
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
              placeholder="H0038"
            />
          </div>
          <div>
            <label className={labelClass}>Modifier</label>
            <input
              value={form.billing_modifier}
              onChange={e => set("billing_modifier", e.target.value)}
              className={inputClass}
              placeholder="e.g. HQ, U1"
            />
          </div>
          <div>
            <label className={labelClass}>Units (15 min each)</label>
            <input
              type="number"
              min={1}
              max={16}
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
            This session is billable
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
            href="/dashboard/peer-support"
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Session"}
          </button>
        </div>
      </div>
    </form>
  );
}

export default function NewPeerSupportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <NewPeerSupportForm />
    </Suspense>
  );
}
