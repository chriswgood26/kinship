"use client";

import { useState, useEffect } from "react";

interface Allergy {
  id: string;
  allergen: string;
  allergen_type: string;
  reaction: string | null;
  severity: string;
  onset_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const ALLERGEN_TYPES = [
  { value: "medication", label: "Medication" },
  { value: "food", label: "Food" },
  { value: "environmental", label: "Environmental" },
  { value: "latex", label: "Latex" },
  { value: "contrast", label: "Contrast Dye" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS = [
  { value: "unknown", label: "Unknown", color: "bg-slate-100 text-slate-600" },
  { value: "mild", label: "Mild", color: "bg-blue-100 text-blue-700" },
  { value: "moderate", label: "Moderate", color: "bg-yellow-100 text-yellow-700" },
  { value: "severe", label: "Severe", color: "bg-orange-100 text-orange-700" },
  { value: "life-threatening", label: "Life-Threatening", color: "bg-red-100 text-red-700" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "resolved", label: "Resolved" },
];

const TYPE_ICONS: Record<string, string> = {
  medication: "💊",
  food: "🥜",
  environmental: "🌿",
  latex: "🧤",
  contrast: "💉",
  other: "⚠️",
};

function getSeverityStyle(severity: string) {
  return SEVERITY_OPTIONS.find(s => s.value === severity)?.color ?? "bg-slate-100 text-slate-600";
}

const EMPTY_FORM = {
  allergen: "",
  allergen_type: "medication",
  reaction: "",
  severity: "unknown",
  onset_date: "",
  status: "active",
  notes: "",
};

interface Props {
  clientId: string;
}

export default function ClientAllergiesTab({ clientId }: Props) {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [nkaConfirmed, setNkaConfirmed] = useState(false);

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/allergies?client_id=${clientId}`, { credentials: "include" });
    const d = await res.json();
    setAllergies(d.allergies || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [clientId]);

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(a: Allergy) {
    setEditId(a.id);
    setForm({
      allergen: a.allergen,
      allergen_type: a.allergen_type,
      reaction: a.reaction || "",
      severity: a.severity,
      onset_date: a.onset_date || "",
      status: a.status,
      notes: a.notes || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      client_id: clientId,
      onset_date: form.onset_date || null,
      reaction: form.reaction || null,
      notes: form.notes || null,
    };
    if (editId) {
      await fetch("/api/allergies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: editId, ...payload }),
      });
    } else {
      await fetch("/api/allergies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this allergy record?")) return;
    await fetch(`/api/allergies?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  async function handleStatusToggle(a: Allergy) {
    const newStatus = a.status === "active" ? "resolved" : "active";
    await fetch("/api/allergies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: a.id, status: newStatus }),
    });
    load();
  }

  const activeAllergies = allergies.filter(a => a.status === "active");
  const inactiveAllergies = allergies.filter(a => a.status !== "active");
  const hasLifeThreatening = activeAllergies.some(a => a.severity === "life-threatening");

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Allergy Documentation</h2>
          <p className="text-slate-500 text-sm mt-0.5">Medications, food, and environmental allergies</p>
        </div>
        <div className="flex gap-2">
          {!nkaConfirmed && allergies.length === 0 && !loading && (
            <button
              onClick={() => setNkaConfirmed(true)}
              className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50"
            >
              Mark NKA
            </button>
          )}
          <button
            onClick={openNew}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400"
          >
            + Add Allergy
          </button>
        </div>
      </div>

      {/* Life-threatening alert */}
      {hasLifeThreatening && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <div className="font-bold text-red-800 text-sm">Life-Threatening Allergy Alert</div>
            <div className="text-red-700 text-sm mt-0.5">
              {activeAllergies.filter(a => a.severity === "life-threatening").map(a => a.allergen).join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* No Known Allergies */}
      {nkaConfirmed && allergies.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-semibold text-emerald-800 text-sm">No Known Allergies (NKA)</div>
              <div className="text-emerald-700 text-xs mt-0.5">Documented — no known drug, food, or environmental allergies</div>
            </div>
          </div>
          <button onClick={() => setNkaConfirmed(false)} className="text-xs text-emerald-600 hover:text-emerald-800 underline">
            Clear
          </button>
        </div>
      )}

      {/* Active Allergies */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">
            Active Allergies
            {activeAllergies.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {activeAllergies.length}
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : activeAllergies.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="text-3xl mb-2">💊</div>
            <p className="text-sm">No active allergies documented</p>
            <button onClick={openNew} className="mt-3 text-teal-600 text-sm font-medium hover:text-teal-700">
              + Add first allergy
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activeAllergies.map(a => (
              <div key={a.id} className="px-5 py-4 flex items-start gap-4">
                <div className="text-2xl mt-0.5 flex-shrink-0">{TYPE_ICONS[a.allergen_type] ?? "⚠️"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{a.allergen}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getSeverityStyle(a.severity)}`}>
                      {SEVERITY_OPTIONS.find(s => s.value === a.severity)?.label ?? a.severity}
                    </span>
                    <span className="text-xs text-slate-400 capitalize">{a.allergen_type}</span>
                  </div>
                  {a.reaction && (
                    <div className="text-sm text-slate-600 mt-1">
                      <span className="font-medium text-slate-500">Reaction:</span> {a.reaction}
                    </div>
                  )}
                  {a.onset_date && (
                    <div className="text-xs text-slate-400 mt-1">
                      Onset:{" "}
                      {new Date(a.onset_date + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </div>
                  )}
                  {a.notes && <div className="text-xs text-slate-400 mt-1 italic">{a.notes}</div>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(a)}
                    className="text-xs text-slate-400 hover:text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleStatusToggle(a)}
                    className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs text-slate-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h3 className="font-semibold text-slate-900">{editId ? "Edit Allergy" : "Add Allergy"}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelClass}>
                Allergen <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.allergen}
                onChange={e => setForm(f => ({ ...f, allergen: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Penicillin, Peanuts, Latex..."
              />
            </div>

            <div>
              <label className={labelClass}>Type</label>
              <select
                value={form.allergen_type}
                onChange={e => setForm(f => ({ ...f, allergen_type: e.target.value }))}
                className={inputClass}
              >
                {ALLERGEN_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className={inputClass}
              >
                {SEVERITY_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Reaction / Symptoms</label>
              <input
                type="text"
                value={form.reaction}
                onChange={e => setForm(f => ({ ...f, reaction: e.target.value }))}
                className={inputClass}
                placeholder="e.g. Hives, anaphylaxis, nausea, rash..."
              />
            </div>

            <div>
              <label className={labelClass}>Onset Date</label>
              <input
                type="date"
                value={form.onset_date}
                onChange={e => setForm(f => ({ ...f, onset_date: e.target.value }))}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className={inputClass}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className={labelClass}>Clinical Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className={inputClass + " resize-none"}
                placeholder="Additional clinical context or observations..."
              />
            </div>
          </div>

          {form.severity === "life-threatening" && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <span>🚨</span>
              <span>Life-threatening severity — a high-visibility alert will be shown on this client&apos;s chart</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-teal-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : editId ? "Update Allergy" : "Save Allergy"}
            </button>
          </div>
        </form>
      )}

      {/* Resolved / Inactive allergies */}
      {inactiveAllergies.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-500 text-sm">
              Resolved / Inactive ({inactiveAllergies.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {inactiveAllergies.map(a => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-4 opacity-60">
                <div className="text-xl flex-shrink-0">{TYPE_ICONS[a.allergen_type] ?? "⚠️"}</div>
                <div className="flex-1">
                  <span className="font-medium text-slate-700 text-sm line-through">{a.allergen}</span>
                  <span className="ml-2 text-xs text-slate-400 capitalize no-underline">
                    {a.allergen_type} · {a.status}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleStatusToggle(a)}
                    className="text-xs text-teal-600 hover:text-teal-700 px-2 py-1 rounded-lg hover:bg-teal-50"
                  >
                    Reactivate
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs text-slate-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
