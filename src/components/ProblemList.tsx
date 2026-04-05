"use client";

import { useState, useEffect } from "react";

interface Problem {
  id: string;
  icd10_code: string;
  description: string;
  onset_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-red-50 border-red-200 text-red-800",
  chronic: "bg-amber-50 border-amber-200 text-amber-800",
  resolved: "bg-slate-50 border-slate-200 text-slate-500",
  in_remission: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

export default function ProblemList({ patientId }: { patientId: string }) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{code: string; description: string}[]>([]);
  const [form, setForm] = useState({ icd10_code: "", description: "", onset_date: "", status: "active", notes: "" });

  async function load() {
    const res = await fetch(`/api/problem-list?patient_id=${patientId}`, { credentials: "include" });
    const d = await res.json();
    setProblems(d.problems || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [patientId]);

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/icd10?q=${encodeURIComponent(search)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setSearchResults(d.codes?.slice(0, 6) || []));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function selectCode(code: string, desc: string) {
    setForm(f => ({ ...f, icd10_code: code, description: desc }));
    setSearch(`${code} — ${desc}`);
    setSearchResults([]);
  }

  async function addProblem(e: React.FormEvent) {
    e.preventDefault();
    if (!form.icd10_code) return;
    setSaving(true);
    await fetch("/api/problem-list", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, client_id: patientId }),
    });
    setShowAdd(false);
    setForm({ icd10_code: "", description: "", onset_date: "", status: "active", notes: "" });
    setSearch("");
    setSaving(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await fetch("/api/problem-list", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id, status, resolved_date: status === "resolved" ? new Date().toISOString().split("T")[0] : null }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/problem-list?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  const active = problems.filter(p => p.status !== "resolved");
  const resolved = problems.filter(p => p.status === "resolved");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {active.length} active{resolved.length > 0 ? ` · ${resolved.length} resolved` : ""}
        </span>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-teal-600 font-semibold hover:text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">
          + Add Problem
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addProblem} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="relative">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Diagnosis (ICD-10) *</label>
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Search by code or description..." />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10 max-h-48 overflow-y-auto">
                {searchResults.map(r => (
                  <button key={r.code} type="button" onClick={() => selectCode(r.code, r.description)}
                    className="w-full text-left px-4 py-2.5 hover:bg-teal-50 border-b border-slate-50 last:border-0">
                    <span className="font-mono text-sm font-semibold text-teal-700">{r.code}</span>
                    <span className="text-sm text-slate-700 ml-2">{r.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
                <option value="active">Active</option>
                <option value="chronic">Chronic</option>
                <option value="in_remission">In Remission</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Onset Date</label>
              <input type="date" value={form.onset_date} onChange={e => setForm(f => ({ ...f, onset_date: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setShowAdd(false); setSearch(""); }}
              className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-medium hover:bg-white">Cancel</button>
            <button type="submit" disabled={saving || !form.icd10_code}
              className="flex-1 bg-teal-500 text-white py-2 rounded-xl text-xs font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Adding..." : "Add to Problem List"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-xs text-slate-400 text-center py-3">Loading...</div>
      ) : active.length === 0 && !showAdd ? (
        <div className="text-xs text-slate-400 text-center py-3">No active problems on file</div>
      ) : (
        <div className="space-y-1.5">
          {active.map(p => (
            <div key={p.id} className={`flex items-start gap-2 px-3 py-2 rounded-xl border ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold">{p.icd10_code}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold capitalize ${STATUS_COLORS[p.status] || STATUS_COLORS.active}`}>{p.status.replace("_", " ")}</span>
                </div>
                <div className="text-xs mt-0.5 font-medium truncate">{p.description}</div>
                {p.onset_date && <div className="text-[10px] opacity-70 mt-0.5">Onset: {new Date(p.onset_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}</div>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <select value={p.status} onChange={e => updateStatus(p.id, e.target.value)}
                  className="text-[10px] border border-current/20 rounded-lg px-1.5 py-1 bg-transparent font-medium cursor-pointer focus:outline-none">
                  <option value="active">Active</option>
                  <option value="chronic">Chronic</option>
                  <option value="in_remission">In Remission</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button onClick={() => remove(p.id)} className="text-[10px] opacity-50 hover:opacity-100 px-1">✕</button>
              </div>
            </div>
          ))}
          {resolved.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Show {resolved.length} resolved</summary>
              <div className="space-y-1.5 mt-1.5">
                {resolved.map(p => (
                  <div key={p.id} className="flex items-start gap-2 px-3 py-2 rounded-xl border bg-slate-50 border-slate-200 text-slate-400">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold line-through">{p.icd10_code}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 font-semibold">Resolved</span>
                      </div>
                      <div className="text-xs mt-0.5 line-through">{p.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
