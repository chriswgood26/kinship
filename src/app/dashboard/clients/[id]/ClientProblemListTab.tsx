"use client";

import { useState, useEffect, useRef } from "react";

interface Problem {
  id: string;
  icd10_code: string | null;
  description: string;
  onset_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface ICD10Code {
  code: string;
  description: string;
  category: string;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Active", color: "bg-emerald-100 text-emerald-700" },
  { value: "chronic", label: "Chronic", color: "bg-amber-100 text-amber-700" },
  { value: "resolved", label: "Resolved", color: "bg-slate-100 text-slate-500" },
  { value: "inactive", label: "Inactive", color: "bg-slate-100 text-slate-400" },
];

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find(s => s.value === status)?.color ?? "bg-slate-100 text-slate-600";
}

const EMPTY_FORM = {
  icd10_code: "",
  description: "",
  onset_date: "",
  status: "active",
  notes: "",
};

interface Props {
  clientId: string;
}

export default function ClientProblemListTab({ clientId }: Props) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // ICD-10 search
  const [icdQuery, setIcdQuery] = useState("");
  const [icdSuggestions, setIcdSuggestions] = useState<ICD10Code[]>([]);
  const [icdLoading, setIcdLoading] = useState(false);
  const icdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass =
    "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/problem-list?patient_id=${clientId}`, {
      credentials: "include",
    });
    const d = await res.json();
    setProblems(d.problems || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [clientId]);

  // ICD-10 autocomplete
  useEffect(() => {
    if (icdQuery.length < 2) {
      setIcdSuggestions([]);
      return;
    }
    if (icdTimeoutRef.current) clearTimeout(icdTimeoutRef.current);
    icdTimeoutRef.current = setTimeout(async () => {
      setIcdLoading(true);
      const res = await fetch(`/api/icd10?q=${encodeURIComponent(icdQuery)}`, {
        credentials: "include",
      });
      const d = await res.json();
      setIcdSuggestions(d.codes || []);
      setIcdLoading(false);
    }, 250);
  }, [icdQuery]);

  function selectIcd(code: ICD10Code) {
    setForm(f => ({ ...f, icd10_code: code.code, description: code.description }));
    setIcdQuery(`${code.code} – ${code.description}`);
    setIcdSuggestions([]);
  }

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setIcdQuery("");
    setIcdSuggestions([]);
    setShowForm(true);
  }

  function openEdit(p: Problem) {
    setEditId(p.id);
    setForm({
      icd10_code: p.icd10_code || "",
      description: p.description,
      onset_date: p.onset_date || "",
      status: p.status,
      notes: p.notes || "",
    });
    setIcdQuery(p.icd10_code ? `${p.icd10_code} – ${p.description}` : p.description);
    setIcdSuggestions([]);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      client_id: clientId,
      icd10_code: form.icd10_code || null,
      onset_date: form.onset_date || null,
      notes: form.notes || null,
    };
    if (editId) {
      await fetch("/api/problem-list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: editId, ...payload }),
      });
    } else {
      await fetch("/api/problem-list", {
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
    setIcdQuery("");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this problem from the list?")) return;
    await fetch(`/api/problem-list?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    load();
  }

  async function handleStatusChange(p: Problem, newStatus: string) {
    await fetch("/api/problem-list", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: p.id, status: newStatus }),
    });
    load();
  }

  const activeProblems = problems.filter(p => p.status === "active" || p.status === "chronic");
  const resolvedProblems = problems.filter(p => p.status === "resolved" || p.status === "inactive");

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Problem List</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Persistent diagnoses and active clinical conditions
          </p>
        </div>
        <button
          onClick={openNew}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400"
        >
          + Add Problem
        </button>
      </div>

      {/* Active / Chronic Problems */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">
            Active Diagnoses
            {activeProblems.length > 0 && (
              <span className="ml-2 bg-teal-100 text-teal-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {activeProblems.length}
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : activeProblems.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="text-3xl mb-2">🩺</div>
            <p className="text-sm">No active diagnoses on the problem list</p>
            <button
              onClick={openNew}
              className="mt-3 text-teal-600 text-sm font-medium hover:text-teal-700"
            >
              + Add first problem
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activeProblems.map(p => (
              <div key={p.id} className="px-5 py-4 flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  <span className="text-2xl">🩺</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.icd10_code && (
                      <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                        {p.icd10_code}
                      </span>
                    )}
                    <span className="font-semibold text-slate-900 text-sm">{p.description}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${getStatusStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </div>
                  {p.onset_date && (
                    <div className="text-xs text-slate-400 mt-1">
                      Onset:{" "}
                      {new Date(p.onset_date + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  )}
                  {p.notes && (
                    <div className="text-xs text-slate-500 mt-1 italic">{p.notes}</div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-xs text-slate-400 hover:text-teal-600 px-2 py-1 rounded-lg hover:bg-teal-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleStatusChange(p, "resolved")}
                    className="text-xs text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
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
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
        >
          <h3 className="font-semibold text-slate-900">
            {editId ? "Edit Problem" : "Add Problem"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* ICD-10 code search */}
            <div className="col-span-2 relative">
              <label className={labelClass}>
                ICD-10 Code / Diagnosis <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={icdQuery}
                onChange={e => {
                  setIcdQuery(e.target.value);
                  // If user clears the field, reset stored code/description
                  if (!e.target.value) {
                    setForm(f => ({ ...f, icd10_code: "", description: "" }));
                  }
                }}
                className={inputClass}
                placeholder="Search by code (e.g. F32.1) or description (e.g. depression)..."
                autoComplete="off"
              />
              {icdLoading && (
                <div className="absolute right-3 top-9 text-xs text-slate-400">Searching…</div>
              )}
              {icdSuggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                  {icdSuggestions.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => selectIcd(c)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-teal-50 flex items-start gap-3 border-b border-slate-50 last:border-0"
                    >
                      <span className="font-mono font-bold text-teal-700 text-xs mt-0.5 flex-shrink-0 w-16">
                        {c.code}
                      </span>
                      <div>
                        <div className="font-medium text-slate-900 leading-tight">{c.description}</div>
                        {c.category && (
                          <div className="text-xs text-slate-400 mt-0.5">{c.category}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* Fallback: if no ICD selected but user typed something, use as free-text description */}
              {!form.icd10_code && icdQuery && icdSuggestions.length === 0 && !icdLoading && icdQuery.length >= 2 && (
                <p className="text-xs text-slate-400 mt-1">
                  No ICD-10 matches — the description will be saved as entered.
                </p>
              )}
            </div>

            {/* Free-text description override (shown when no ICD code selected) */}
            {!form.icd10_code && (
              <div className="col-span-2">
                <label className={labelClass}>Description (free text)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className={inputClass}
                  placeholder="e.g. Major Depressive Disorder, recurrent, moderate"
                  required={!form.icd10_code}
                />
              </div>
            )}

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
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
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
                placeholder="Additional clinical context, severity modifiers, treatment notes..."
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
                setIcdQuery("");
                setIcdSuggestions([]);
              }}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (!form.icd10_code && !form.description && !icdQuery)}
              className="bg-teal-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Saving..." : editId ? "Update Problem" : "Save Problem"}
            </button>
          </div>
        </form>
      )}

      {/* Resolved / Inactive problems */}
      {resolvedProblems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-500 text-sm">
              Resolved / Inactive ({resolvedProblems.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {resolvedProblems.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-4 opacity-60">
                <div className="text-xl flex-shrink-0">🩺</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {p.icd10_code && (
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {p.icd10_code}
                      </span>
                    )}
                    <span className="font-medium text-slate-600 text-sm line-through">
                      {p.description}
                    </span>
                    <span className="text-xs text-slate-400 capitalize no-underline">
                      · {p.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleStatusChange(p, "active")}
                    className="text-xs text-teal-600 hover:text-teal-700 px-2 py-1 rounded-lg hover:bg-teal-50"
                  >
                    Reactivate
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
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
