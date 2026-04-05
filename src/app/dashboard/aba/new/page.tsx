"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string | null;
  preferred_name?: string | null;
}

const MEASUREMENT_TYPES = [
  { value: "frequency", label: "Frequency — count occurrences per session" },
  { value: "rate", label: "Rate — occurrences per unit time" },
  { value: "duration", label: "Duration — total time behavior occurs (seconds)" },
  { value: "interval", label: "Interval Recording — partial/whole interval" },
  { value: "abc_only", label: "ABC Narrative — qualitative recording only" },
];

const BEHAVIOR_FUNCTIONS = [
  { value: "", label: "— Unknown / not yet assessed —" },
  { value: "attention", label: "Attention — maintained by social attention" },
  { value: "escape", label: "Escape/Avoidance — escape from demands or aversives" },
  { value: "tangible", label: "Tangible — access to items or preferred activities" },
  { value: "sensory", label: "Sensory (Automatic) — internal reinforcement" },
  { value: "multiple", label: "Multiple functions" },
  { value: "unknown", label: "Unknown" },
];

function NewABAForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");

  const [form, setForm] = useState({
    client_id: params.get("client_id") || "",
    patient_name: "",
    behavior_name: "",
    operational_definition: "",
    behavior_type: "target",
    behavior_function: "",
    measurement_type: "frequency",
    interval_minutes: "",
    baseline_value: "",
    reduction_target_pct: "",
    intervention_strategy: "",
    preventive_strategies: "",
    consequence_strategies: "",
    notes: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const cid = params.get("client_id");
    if (cid && !form.patient_name) {
      fetch(`/api/clients/${cid}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          if (d.patient)
            setForm(f => ({
              ...f,
              client_id: d.patient.id,
              patient_name: `${d.patient.last_name}, ${d.patient.first_name}`,
            }));
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setPatients(d.patients || []));
    } else {
      setPatients([]);
    }
  }, [patientSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.behavior_name) {
      setError("Client and behavior name are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/behavior-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_id: form.client_id,
        behavior_name: form.behavior_name,
        operational_definition: form.operational_definition || null,
        behavior_type: form.behavior_type,
        behavior_function: form.behavior_function || null,
        measurement_type: form.measurement_type,
        interval_minutes: form.interval_minutes !== "" ? parseInt(form.interval_minutes) : null,
        baseline_value: form.baseline_value !== "" ? parseFloat(form.baseline_value) : null,
        reduction_target_pct:
          form.reduction_target_pct !== "" ? parseInt(form.reduction_target_pct) : null,
        intervention_strategy: form.intervention_strategy || null,
        preventive_strategies: form.preventive_strategies || null,
        consequence_strategies: form.consequence_strategies || null,
        notes: form.notes || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create behavior program");
      setSaving(false);
      return;
    }
    router.push(`/dashboard/aba/${data.program.id}`);
  }

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass =
    "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/aba" className="text-slate-400 hover:text-slate-700">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Behavior Program</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Define a behavior to track and collect ABC data
          </p>
        </div>
      </div>

      {/* Individual */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Individual</h2>
        <div className="relative">
          <label className={labelClass}>Individual / Client *</label>
          {form.patient_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))}
                className="text-teal-500 text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                className={inputClass}
                placeholder="Search by name or MRN..."
              />
              {patients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                  {patients.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setForm(f => ({
                          ...f,
                          client_id: p.id,
                          patient_name: `${p.last_name}, ${p.first_name}`,
                        }));
                        setPatientSearch("");
                        setPatients([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
                      <div className="font-semibold text-sm text-slate-900">
                        {p.last_name}, {p.first_name}
                        {p.preferred_name && (
                          <span className="text-slate-400 font-normal ml-1.5">
                            &quot;{p.preferred_name}&quot;
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">MRN: {p.mrn || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Behavior definition */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Behavior Definition</h2>

        <div>
          <label className={labelClass}>Behavior Name *</label>
          <input
            value={form.behavior_name}
            onChange={e => set("behavior_name", e.target.value)}
            className={inputClass}
            placeholder="e.g., Self-injurious behavior, Elopement, Verbal aggression"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Operational Definition</label>
          <textarea
            value={form.operational_definition}
            onChange={e => set("operational_definition", e.target.value)}
            rows={3}
            className={inputClass + " resize-none"}
            placeholder="Observable, measurable description of the behavior (e.g., 'Any instance of hitting head with open or closed fist against hard surface...')"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Behavior Type</label>
            <div className="flex gap-2">
              {[
                { value: "target", label: "↓ Target (Reduce)", color: "bg-red-500" },
                { value: "replacement", label: "↑ Replacement (Increase)", color: "bg-emerald-500" },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("behavior_type", opt.value)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-semibold border-2 transition-colors ${
                    form.behavior_type === opt.value
                      ? opt.value === "target"
                        ? "bg-red-50 border-red-300 text-red-700"
                        : "bg-emerald-50 border-emerald-300 text-emerald-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Function of Behavior</label>
            <select
              value={form.behavior_function}
              onChange={e => set("behavior_function", e.target.value)}
              className={inputClass}
            >
              {BEHAVIOR_FUNCTIONS.map(f => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Measurement Type</label>
            <select
              value={form.measurement_type}
              onChange={e => set("measurement_type", e.target.value)}
              className={inputClass}
            >
              {MEASUREMENT_TYPES.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          {(form.measurement_type === "rate" || form.measurement_type === "interval") && (
            <div>
              <label className={labelClass}>Observation Period (minutes)</label>
              <input
                type="number"
                value={form.interval_minutes}
                onChange={e => set("interval_minutes", e.target.value)}
                className={inputClass}
                placeholder="e.g., 30"
                min="1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Baseline & goals */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Baseline & Reduction Goals</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>
              Baseline{" "}
              {form.measurement_type === "duration"
                ? "(seconds/session)"
                : form.measurement_type === "rate"
                ? "(per hour)"
                : "(occurrences/session)"}
            </label>
            <input
              type="number"
              value={form.baseline_value}
              onChange={e => set("baseline_value", e.target.value)}
              className={inputClass}
              placeholder="e.g., 12"
              min="0"
              step="any"
            />
          </div>
          {form.behavior_type === "target" && (
            <div>
              <label className={labelClass}>Reduction Goal (%)</label>
              <input
                type="number"
                value={form.reduction_target_pct}
                onChange={e => set("reduction_target_pct", e.target.value)}
                className={inputClass}
                placeholder="e.g., 80"
                min="1"
                max="100"
              />
              <p className="text-xs text-slate-400 mt-1">% reduction from baseline</p>
            </div>
          )}
        </div>
      </div>

      {/* Intervention */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-900">Behavior Intervention Plan</h2>
        <div>
          <label className={labelClass}>Intervention Strategy</label>
          <textarea
            value={form.intervention_strategy}
            onChange={e => set("intervention_strategy", e.target.value)}
            rows={2}
            className={inputClass + " resize-none"}
            placeholder="e.g., Differential Reinforcement of Alternative behavior (DRA), Functional Communication Training (FCT), Extinction..."
          />
        </div>
        <div>
          <label className={labelClass}>Preventive / Antecedent Strategies</label>
          <textarea
            value={form.preventive_strategies}
            onChange={e => set("preventive_strategies", e.target.value)}
            rows={2}
            className={inputClass + " resize-none"}
            placeholder="Setting event modifications, antecedent manipulations, environmental changes..."
          />
        </div>
        <div>
          <label className={labelClass}>Consequence Strategies (Staff Response)</label>
          <textarea
            value={form.consequence_strategies}
            onChange={e => set("consequence_strategies", e.target.value)}
            rows={2}
            className={inputClass + " resize-none"}
            placeholder="How staff should respond when the behavior occurs..."
          />
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className={labelClass}>Additional Notes</label>
        <textarea
          value={form.notes}
          onChange={e => set("notes", e.target.value)}
          rows={2}
          className={inputClass + " resize-none"}
          placeholder="Additional context, safety considerations, team coordination notes..."
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between pb-6">
        <Link
          href="/dashboard/aba"
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Behavior Program"}
        </button>
      </div>
    </form>
  );
}

export default function NewABAPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <NewABAForm />
    </Suspense>
  );
}
