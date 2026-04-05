"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  programId: string;
  measurementType: string;
}

const SETTINGS = [
  "Home", "School/Classroom", "Community", "Day Program", "Clinic", "Work", "Transportation", "Other",
];

const SEVERITY_COLORS: Record<string, string> = {
  mild: "border-yellow-300 bg-yellow-50 text-yellow-700",
  moderate: "border-orange-300 bg-orange-50 text-orange-700",
  severe: "border-red-300 bg-red-50 text-red-700",
};

export default function ABCDataEntry({ programId, measurementType }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    incident_date: today,
    incident_time: "",
    setting: "",
    frequency_count: "1",
    duration_seconds: "",
    severity: "",
    antecedent: "",
    behavior_description: "",
    consequence: "",
    perceived_function: "",
    staff_name: "",
    notes: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_name) { setError("Staff name is required"); return; }
    if (!form.incident_date) { setError("Date is required"); return; }
    setSaving(true);
    setError("");

    const res = await fetch("/api/behavior-incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        behavior_program_id: programId,
        incident_date: form.incident_date,
        incident_time: form.incident_time || null,
        setting: form.setting || null,
        frequency_count: form.frequency_count !== "" ? parseInt(form.frequency_count) : 1,
        duration_seconds: form.duration_seconds !== "" ? parseInt(form.duration_seconds) : null,
        severity: form.severity || null,
        antecedent: form.antecedent || null,
        behavior_description: form.behavior_description || null,
        consequence: form.consequence || null,
        perceived_function: form.perceived_function || null,
        staff_name: form.staff_name,
        notes: form.notes || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }

    setSuccess(true);
    setForm(f => ({
      ...f,
      incident_time: "",
      antecedent: "",
      behavior_description: "",
      consequence: "",
      perceived_function: "",
      severity: "",
      duration_seconds: "",
      notes: "",
    }));
    setTimeout(() => setSuccess(false), 3000);
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  if (!open) {
    return (
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="font-semibold text-teal-900">Record Behavior Incident</div>
          <div className="text-xs text-teal-600 mt-0.5">Add ABC data for a behavior occurrence</div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400"
        >
          + Record Incident
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Record Behavior Incident</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">
          ✕ Cancel
        </button>
      </div>

      {/* Date/time/staff */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Date *</label>
          <input type="date" value={form.incident_date} onChange={e => set("incident_date", e.target.value)} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Time (optional)</label>
          <input type="time" value={form.incident_time} onChange={e => set("incident_time", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Staff Name *</label>
          <input value={form.staff_name} onChange={e => set("staff_name", e.target.value)} className={inputClass} placeholder="Your name" required />
        </div>
      </div>

      {/* Measurement */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Setting</label>
          <select value={form.setting} onChange={e => set("setting", e.target.value)} className={inputClass}>
            <option value="">— Select —</option>
            {SETTINGS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {measurementType !== "abc_only" && (
          <>
            {(measurementType === "frequency" || measurementType === "rate" || measurementType === "interval") && (
              <div>
                <label className={labelClass}>Count / Occurrences</label>
                <input type="number" value={form.frequency_count} onChange={e => set("frequency_count", e.target.value)}
                  className={inputClass} min="1" placeholder="1" />
              </div>
            )}
            {(measurementType === "duration") && (
              <div>
                <label className={labelClass}>Duration (seconds)</label>
                <input type="number" value={form.duration_seconds} onChange={e => set("duration_seconds", e.target.value)}
                  className={inputClass} min="0" placeholder="Duration in seconds" />
              </div>
            )}
          </>
        )}
        <div>
          <label className={labelClass}>Severity</label>
          <div className="flex gap-2">
            {["", "mild", "moderate", "severe"].map(sv => (
              <button
                key={sv}
                type="button"
                onClick={() => set("severity", sv)}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  form.severity === sv
                    ? sv === "" ? "bg-slate-200 border-slate-400 text-slate-700" : SEVERITY_COLORS[sv]
                    : "border-slate-200 text-slate-400 hover:border-slate-300"
                }`}
              >
                {sv === "" ? "—" : sv.charAt(0).toUpperCase() + sv.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ABC */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-4">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">ABC Data (Antecedent · Behavior · Consequence)</div>
        <div>
          <label className={labelClass}>A — Antecedent (what happened before)</label>
          <textarea
            value={form.antecedent}
            onChange={e => set("antecedent", e.target.value)}
            rows={2}
            className={inputClass + " resize-none"}
            placeholder="What was happening immediately before the behavior? (demands, transitions, denied access, social interaction...)"
          />
        </div>
        <div>
          <label className={labelClass}>B — Behavior Description (what it looked like)</label>
          <textarea
            value={form.behavior_description}
            onChange={e => set("behavior_description", e.target.value)}
            rows={2}
            className={inputClass + " resize-none"}
            placeholder="Observable description of the behavior episode..."
          />
        </div>
        <div>
          <label className={labelClass}>C — Consequence (staff response / what happened after)</label>
          <textarea
            value={form.consequence}
            onChange={e => set("consequence", e.target.value)}
            rows={2}
            className={inputClass + " resize-none"}
            placeholder="What happened after? How did staff respond? What did the individual obtain or escape?"
          />
        </div>
      </div>

      {/* Perceived function */}
      <div>
        <label className={labelClass}>Perceived Function (this incident)</label>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "", label: "Not determined" },
            { value: "attention", label: "👁 Attention" },
            { value: "escape", label: "🚪 Escape" },
            { value: "tangible", label: "🎁 Tangible" },
            { value: "sensory", label: "🌀 Sensory" },
            { value: "unknown", label: "❓ Unknown" },
          ].map(fn => (
            <button
              key={fn.value}
              type="button"
              onClick={() => set("perceived_function", fn.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                form.perceived_function === fn.value
                  ? "bg-slate-700 text-white border-slate-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {fn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Additional Notes</label>
        <textarea
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          rows={1}
          className={inputClass + " resize-none"}
          placeholder="Any other relevant observations..."
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          ✓ Incident recorded successfully
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Incident"}
        </button>
      </div>
    </form>
  );
}
