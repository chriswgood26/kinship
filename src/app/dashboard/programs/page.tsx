"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Location { id: string; name: string; code: string | null; city: string | null; state: string | null; }
interface Program {
  id: string; name: string; code: string | null; program_type: string;
  description: string | null; capacity: number | null; is_active: boolean;
  location_id: string | null;
  location: Location | null;
}
interface Enrollment { id: string; patient: { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null }; status: string; admission_date: string; discharge_date: string | null; assigned_worker: string | null; }

const PROGRAM_TYPES = ["outpatient", "intensive_outpatient", "partial_hospitalization", "residential", "crisis", "day_program", "community_support", "dd_waiver", "ccbhc", "other"];
const TYPE_LABELS: Record<string, string> = {
  outpatient: "Outpatient", intensive_outpatient: "IOP", partial_hospitalization: "PHP",
  residential: "Residential", crisis: "Crisis", day_program: "Day Program",
  community_support: "Community Support", dd_waiver: "DD Waiver", ccbhc: "CCBHC", other: "Other",
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<Program | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [form, setForm] = useState({ name: "", code: "", program_type: "outpatient", description: "", capacity: "", location_id: "" });

  async function loadLocations() {
    const res = await fetch("/api/locations", { credentials: "include" });
    const d = await res.json();
    setLocations((d.locations || []).filter((l: Location & { is_active?: boolean }) => l.is_active !== false));
  }

  async function loadPrograms() {
    const params = new URLSearchParams();
    if (locationFilter) params.set("location_id", locationFilter);
    const res = await fetch(`/api/programs?${params}`, { credentials: "include" });
    const d = await res.json();
    setPrograms(d.programs || []);
    if (!selected && d.programs?.length > 0) setSelected(d.programs[0]);
  }

  async function loadEnrollments(programId: string) {
    const res = await fetch(`/api/client-programs?program_id=${programId}`, { credentials: "include" });
    const d = await res.json();
    setEnrollments(d.enrollments || []);
  }

  useEffect(() => { loadLocations(); }, []);
  useEffect(() => { loadPrograms(); }, [locationFilter]);
  useEffect(() => { if (selected) loadEnrollments(selected.id); }, [selected]);

  async function createProgram(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/programs", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowNew(false);
      setForm({ name: "", code: "", program_type: "outpatient", description: "", capacity: "", location_id: "" });
      loadPrograms();
    }
    setSaving(false);
  }

  async function deactivate(id: string) {
    await fetch("/api/programs", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id, is_active: false }),
    });
    setSelected(null);
    loadPrograms();
  }

  const activeEnrollments = enrollments.filter(e => e.status === "active");
  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Programs & Services</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage service programs and patient enrollment across locations</p>
        </div>
        <div className="flex items-center gap-3">
          {locations.length > 0 && (
            <select
              value={locationFilter}
              onChange={e => { setLocationFilter(e.target.value); setSelected(null); }}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white">
              <option value="">All Locations</option>
              {locations.map(l => (
                <option key={l.id} value={l.id}>{l.name}{l.code ? ` (${l.code})` : ""}</option>
              ))}
            </select>
          )}
          <button onClick={() => setShowNew(!showNew)}
            className="bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
            + New Program
          </button>
        </div>
      </div>

      {/* New program form */}
      {showNew && (
        <form onSubmit={createProgram} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">New Program / Service</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><label className={labelClass}>Program Name *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputClass} placeholder="e.g. Adult Outpatient Mental Health" required /></div>
            <div><label className={labelClass}>Program Code</label><input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inputClass} placeholder="e.g. AOMH" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelClass}>Program Type</label>
              <select value={form.program_type} onChange={e => setForm(f => ({ ...f, program_type: e.target.value }))} className={inputClass}>
                {PROGRAM_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label className={labelClass}>Capacity (optional)</label><input type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} className={inputClass} placeholder="Max patients" /></div>
            {locations.length > 0 && (
              <div><label className={labelClass}>Location / Site</label>
                <select value={form.location_id} onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))} className={inputClass}>
                  <option value="">— Not assigned —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div><label className={labelClass}>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inputClass + " resize-none"} /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">{saving ? "Saving..." : "Create Program"}</button>
          </div>
        </form>
      )}

      {/* Location banner when filtering */}
      {locationFilter && locations.find(l => l.id === locationFilter) && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm">
          <span className="text-teal-800 font-medium">
            📍 Showing programs at: <strong>{locations.find(l => l.id === locationFilter)?.name}</strong>
          </span>
          <button onClick={() => setLocationFilter("")} className="text-teal-600 hover:text-teal-800 text-xs underline">Clear filter</button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Program list */}
        <div className="col-span-1 space-y-2">
          {programs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              <div className="text-3xl mb-2">🏥</div>
              <p>No programs {locationFilter ? "at this location" : "yet"}</p>
              <p className="text-xs mt-1">
                {locationFilter ? "Create a program and assign it to this location" : "Create your first program above"}
              </p>
            </div>
          ) : programs.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${selected?.id === p.id ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{p.name}</div>
                  {p.code && <div className="text-xs text-slate-400 font-mono">{p.code}</div>}
                  {p.location && (
                    <div className="text-xs text-teal-600 mt-0.5 flex items-center gap-1">
                      <span>📍</span>
                      <span>{p.location.name}{p.location.code ? ` · ${p.location.code}` : ""}</span>
                    </div>
                  )}
                </div>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2">{TYPE_LABELS[p.program_type] || p.program_type}</span>
              </div>
              {p.capacity && <div className="text-xs text-slate-400 mt-1">Capacity: {p.capacity}</div>}
            </button>
          ))}
        </div>

        {/* Program detail / census */}
        <div className="col-span-2">
          {selected ? (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {selected.code && <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{selected.code}</span>}
                      <span className="text-xs text-slate-500 capitalize">{TYPE_LABELS[selected.program_type]}</span>
                      {selected.capacity && <span className="text-xs text-slate-500">· Capacity: {selected.capacity}</span>}
                    </div>
                    {selected.location && (
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-teal-700 bg-teal-50 rounded-lg px-2 py-1 w-fit">
                        <span>📍</span>
                        <span className="font-medium">{selected.location.name}</span>
                        {selected.location.city && (
                          <span className="text-teal-500 ml-1">
                            · {[selected.location.city, selected.location.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                        <Link href="/dashboard/admin/locations" className="ml-1 underline hover:text-teal-900">manage</Link>
                      </div>
                    )}
                    {selected.description && <p className="text-sm text-slate-500 mt-2">{selected.description}</p>}
                  </div>
                  <button onClick={() => deactivate(selected.id)} className="text-xs text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50">Deactivate</button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "Active", count: enrollments.filter(e => e.status === "active").length, color: "bg-emerald-50 text-emerald-700" },
                    { label: "Discharged", count: enrollments.filter(e => e.status === "discharged").length, color: "bg-slate-50 text-slate-600" },
                    { label: "Pending", count: enrollments.filter(e => e.status === "pending").length, color: "bg-amber-50 text-amber-700" },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                      <div className="text-2xl font-bold">{s.count}</div>
                      <div className="text-xs font-semibold">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Census table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900 text-sm">Active Census ({activeEnrollments.length})</h3>
                  <Link href={`/dashboard/clients`} className="text-xs text-teal-600 font-medium hover:text-teal-700">+ Enroll patient from patient record →</Link>
                </div>
                {activeEnrollments.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No active enrollments in this program</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Admitted</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Worker</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeEnrollments.map(e => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <Link href={`/dashboard/clients/${e.patient.id}`} className="font-semibold text-slate-900 hover:text-teal-600">
                              {e.patient.last_name}, {e.patient.first_name}
                              {e.patient.preferred_name && <span className="text-slate-400 font-normal ml-1">&quot;{e.patient.preferred_name}&quot;</span>}
                            </Link>
                            <div className="text-xs text-slate-400">MRN: {e.patient.mrn || "—"}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{new Date(e.admission_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{e.assigned_worker || "—"}</td>
                          <td className="px-4 py-3"><span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold capitalize">{e.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <div className="text-3xl mb-2">👈</div>
              <p>Select a program to view its census</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
