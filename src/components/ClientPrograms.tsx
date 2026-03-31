"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Program { id: string; name: string; code: string | null; program_type: string; }
interface Enrollment { id: string; program: Program; status: string; admission_date: string; discharge_date: string | null; assigned_worker: string | null; }

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  discharged: "bg-slate-100 text-slate-500",
  on_hold: "bg-blue-100 text-blue-600",
};

export default function ClientPrograms({ patientId }: { patientId: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [showEnroll, setShowEnroll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ program_id: "", admission_date: new Date().toISOString().split("T")[0], status: "active", assigned_worker: "", notes: "" });

  async function load() {
    const [enrollRes, progRes] = await Promise.all([
      fetch(`/api/patient-programs?client_id=${patientId}`, { credentials: "include" }),
      fetch("/api/programs", { credentials: "include" }),
    ]);
    const [ed, pd] = await Promise.all([enrollRes.json(), progRes.json()]);
    setEnrollments(ed.enrollments || []);
    setPrograms(pd.programs || []);
  }

  useEffect(() => { load(); }, [patientId]);

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    if (!form.program_id) return;
    setSaving(true);
    await fetch("/api/patient-programs", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, client_id: patientId }),
    });
    setShowEnroll(false);
    setForm({ program_id: "", admission_date: new Date().toISOString().split("T")[0], status: "active", assigned_worker: "", notes: "" });
    setSaving(false);
    load();
  }

  async function discharge(id: string) {
    await fetch("/api/patient-programs", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id, status: "discharged", discharge_date: new Date().toISOString().split("T")[0] }),
    });
    load();
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const enrolledIds = new Set(enrollments.filter(e => e.status === "active").map(e => e.program.id));
  const availablePrograms = programs.filter(p => !enrolledIds.has(p.id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">{enrollments.filter(e => e.status === "active").length} active program{enrollments.filter(e => e.status === "active").length !== 1 ? "s" : ""}</span>
        <button onClick={() => setShowEnroll(!showEnroll)}
          className="text-xs text-teal-600 font-semibold hover:text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">
          + Enroll
        </button>
      </div>

      {showEnroll && (
        <form onSubmit={enroll} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Program *</label>
            <select value={form.program_id} onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))} className={inputClass} required>
              <option value="">Select program...</option>
              {availablePrograms.map(p => <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>)}
            </select>
            {availablePrograms.length === 0 && <p className="text-xs text-slate-400 mt-1">Patient is already enrolled in all available programs. <Link href="/dashboard/programs" className="text-teal-600">Manage programs →</Link></p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Admission Date</label>
              <input type="date" value={form.admission_date} onChange={e => setForm(f => ({ ...f, admission_date: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Assigned Worker (optional)</label>
            <input value={form.assigned_worker} onChange={e => setForm(f => ({ ...f, assigned_worker: e.target.value }))} className={inputClass} placeholder="Staff name" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowEnroll(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-medium hover:bg-white">Cancel</button>
            <button type="submit" disabled={saving || !form.program_id} className="flex-1 bg-teal-500 text-white py-2 rounded-xl text-xs font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Enrolling..." : "Enroll"}
            </button>
          </div>
        </form>
      )}

      {enrollments.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">Not enrolled in any programs</p>
      ) : (
        <div className="space-y-2">
          {enrollments.map(e => (
            <div key={e.id} className="flex items-start justify-between p-3 bg-white rounded-xl border border-slate-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link href="/dashboard/programs" className="font-semibold text-sm text-slate-900 hover:text-teal-600 truncate">{e.program.name}</Link>
                  {e.program.code && <span className="text-xs font-mono text-slate-400 flex-shrink-0">{e.program.code}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLORS[e.status] || STATUS_COLORS.active}`}>{e.status}</span>
                  <span className="text-xs text-slate-400">Since {new Date(e.admission_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
                  {e.assigned_worker && <span className="text-xs text-slate-400">· {e.assigned_worker}</span>}
                </div>
              </div>
              {e.status === "active" && (
                <button onClick={() => discharge(e.id)} className="text-xs text-slate-400 hover:text-red-500 ml-2 flex-shrink-0">Discharge</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
