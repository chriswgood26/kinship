"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  skillId: string;
  measurementType: string;
  promptLevels: string[];
  targetTrials: number;
}

export default function SkillDataEntry({ skillId, measurementType, promptLevels, targetTrials }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    recorded_date: today,
    staff_name: "",
    trials_total: String(targetTrials),
    trials_correct: "",
    prompt_level: "",
    duration_seconds: "",
    frequency_count: "",
    session_notes: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_name) { setError("Staff name is required"); return; }
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      recorded_date: form.recorded_date,
      staff_name: form.staff_name,
      prompt_level: form.prompt_level || null,
      session_notes: form.session_notes || null,
    };

    if (measurementType === "percent_correct") {
      body.trials_total = form.trials_total !== "" ? parseInt(form.trials_total) : null;
      body.trials_correct = form.trials_correct !== "" ? parseInt(form.trials_correct) : null;
    } else if (measurementType === "frequency") {
      body.frequency_count = form.frequency_count !== "" ? parseInt(form.frequency_count) : null;
    } else if (measurementType === "duration") {
      body.duration_seconds = form.duration_seconds !== "" ? parseInt(form.duration_seconds) : null;
    }

    const res = await fetch(`/api/skills/${skillId}/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }

    setSuccess(true);
    setForm(f => ({ ...f, trials_correct: "", frequency_count: "", duration_seconds: "", session_notes: "", prompt_level: "" }));
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
          <div className="font-semibold text-teal-900">Record Session Data</div>
          <div className="text-xs text-teal-600 mt-0.5">Add a new data point for today&apos;s session</div>
        </div>
        <button onClick={() => setOpen(true)} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
          + Record Data
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-teal-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Record Session Data</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">✕ Cancel</button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={form.recorded_date} onChange={e => set("recorded_date", e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Staff Name *</label>
          <input value={form.staff_name} onChange={e => set("staff_name", e.target.value)} className={inputClass} placeholder="Your name" required />
        </div>
      </div>

      {measurementType === "percent_correct" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Trials Presented</label>
            <input type="number" value={form.trials_total} onChange={e => set("trials_total", e.target.value)} className={inputClass} min="1" max="100" placeholder={String(targetTrials)} />
          </div>
          <div>
            <label className={labelClass}>Trials Correct</label>
            <input type="number" value={form.trials_correct} onChange={e => set("trials_correct", e.target.value)} className={inputClass} min="0" max={form.trials_total || "100"} placeholder="0" />
          </div>
        </div>
      )}

      {measurementType === "frequency" && (
        <div>
          <label className={labelClass}>Frequency Count</label>
          <input type="number" value={form.frequency_count} onChange={e => set("frequency_count", e.target.value)} className={inputClass} min="0" placeholder="Number of occurrences" />
        </div>
      )}

      {measurementType === "duration" && (
        <div>
          <label className={labelClass}>Duration (seconds)</label>
          <input type="number" value={form.duration_seconds} onChange={e => set("duration_seconds", e.target.value)} className={inputClass} min="0" placeholder="Duration in seconds" />
        </div>
      )}

      {promptLevels.length > 0 && (
        <div>
          <label className={labelClass}>Prompt Level Used</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => set("prompt_level", "")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.prompt_level === "" ? "bg-slate-700 text-white border-slate-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
              Not tracked
            </button>
            {promptLevels.map(pl => (
              <button key={pl} type="button" onClick={() => set("prompt_level", pl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${form.prompt_level === pl ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                {pl}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Session Notes</label>
        <textarea value={form.session_notes} onChange={e => set("session_notes", e.target.value)} rows={2}
          className={inputClass + " resize-none"} placeholder="Observations, behavior, context for this session..." />
      </div>

      {/* Live percent calculation */}
      {measurementType === "percent_correct" && form.trials_total && form.trials_correct !== "" && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${
          Math.round((parseInt(form.trials_correct) / parseInt(form.trials_total)) * 100) >= 80
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-50 text-slate-700"
        }`}>
          📊 {form.trials_correct}/{form.trials_total} = {Math.round((parseInt(form.trials_correct || "0") / parseInt(form.trials_total || "1")) * 100)}% correct
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">✓ Data point saved successfully</div>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={() => setOpen(false)} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Save Data Point"}
        </button>
      </div>
    </form>
  );
}
