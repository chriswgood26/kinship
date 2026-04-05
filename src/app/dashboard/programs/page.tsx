"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Location { id: string; name: string; code: string | null; city: string | null; state: string | null; }
interface Program {
  id: string; name: string; code: string | null; program_type: string;
  description: string | null; capacity: number | null; is_active: boolean;
  location_id: string | null;
  location: Location | null;
  enabled_note_types: string[] | null;
}
interface Enrollment { id: string; patient: { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null }; status: string; admission_date: string; discharge_date: string | null; assigned_worker: string | null; }
interface AssessmentRequirement {
  id: string;
  assessment_type: string;
  is_required_at_intake: boolean;
  reassessment_frequency_days: number | null;
  reminder_days_before: number;
  notes: string | null;
}

const NOTE_TYPES = [
  { key: "soap", label: "SOAP Notes", description: "Subjective, Objective, Assessment, Plan progress notes", icon: "📝" },
  { key: "dd_notes", label: "DD Notes", description: "Developmental disability service documentation", icon: "🧩" },
  { key: "group", label: "Group Notes", description: "Group therapy and group service notes", icon: "👥" },
  { key: "case_mgmt", label: "Case Management Notes", description: "Case coordination, referrals, and service linkage notes", icon: "📋" },
];

const ALL_NOTE_TYPE_KEYS = NOTE_TYPES.map(n => n.key);

const PROGRAM_TYPES = ["outpatient", "intensive_outpatient", "partial_hospitalization", "residential", "crisis", "day_program", "community_support", "dd_waiver", "ccbhc", "other"];
const TYPE_LABELS: Record<string, string> = {
  outpatient: "Outpatient", intensive_outpatient: "IOP", partial_hospitalization: "PHP",
  residential: "Residential", crisis: "Crisis", day_program: "Day Program",
  community_support: "Community Support", dd_waiver: "DD Waiver", ccbhc: "CCBHC", other: "Other",
};

const ASSESSMENT_TYPES = [
  { value: "BPS", label: "Biopsychosocial Assessment (BPS)", icon: "📋" },
  { value: "CUMHA", label: "CUMHA — Children's Uniform Mental Health Assessment", icon: "👶" },
  { value: "IM+CANS", label: "IM+CANS — Illinois Integrated Assessment", icon: "🧠" },
  { value: "Psych Eval", label: "Psychiatric Evaluation", icon: "🔍" },
  { value: "PHQ-9", label: "PHQ-9 — Depression Screening", icon: "🔵" },
  { value: "GAD-7", label: "GAD-7 — Anxiety Screening", icon: "🟣" },
  { value: "C-SSRS", label: "C-SSRS — Suicide Risk Screening", icon: "🔴" },
];

const FREQ_OPTIONS = [
  { value: "", label: "No re-assessment required" },
  { value: "30", label: "Monthly (30 days)" },
  { value: "60", label: "Every 2 months (60 days)" },
  { value: "90", label: "Quarterly (90 days)" },
  { value: "180", label: "Every 6 months (180 days)" },
  { value: "365", label: "Annually (365 days)" },
  { value: "custom", label: "Custom interval..." },
];

function freqLabel(days: number | null): string {
  if (!days) return "No re-assessment";
  if (days === 30) return "Monthly";
  if (days === 60) return "Every 2 months";
  if (days === 90) return "Quarterly";
  if (days === 180) return "Every 6 months";
  if (days === 365) return "Annually";
  return `Every ${days} days`;
}

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selected, setSelected] = useState<Program | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [requirements, setRequirements] = useState<AssessmentRequirement[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"census" | "assessments" | "note_types">("census");
  const [savingNoteTypes, setSavingNoteTypes] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", program_type: "outpatient", description: "", capacity: "", location_id: "" });

  // Assessment requirement form state
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqForm, setReqForm] = useState({
    assessment_type: "BPS",
    is_required_at_intake: true,
    reassessment_frequency_days: "",
    customFreq: "",
    reminder_days_before: "14",
    notes: "",
  });
  const [savingReq, setSavingReq] = useState(false);

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

  async function loadRequirements(programId: string) {
    const res = await fetch(`/api/program-assessment-requirements?program_id=${programId}`, { credentials: "include" });
    const d = await res.json();
    setRequirements(d.requirements || []);
  }

  useEffect(() => { loadLocations(); }, []);
  useEffect(() => { loadPrograms(); }, [locationFilter]);
  useEffect(() => {
    if (selected) {
      loadEnrollments(selected.id);
      loadRequirements(selected.id);
    }
  }, [selected]);

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

  async function addRequirement(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSavingReq(true);
    const freqDays = reqForm.reassessment_frequency_days === "custom"
      ? (reqForm.customFreq ? parseInt(reqForm.customFreq) : null)
      : (reqForm.reassessment_frequency_days ? parseInt(reqForm.reassessment_frequency_days) : null);

    const res = await fetch("/api/program-assessment-requirements", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        program_id: selected.id,
        assessment_type: reqForm.assessment_type,
        is_required_at_intake: reqForm.is_required_at_intake,
        reassessment_frequency_days: freqDays,
        reminder_days_before: parseInt(reqForm.reminder_days_before) || 14,
        notes: reqForm.notes || null,
      }),
    });
    if (res.ok) {
      setShowReqForm(false);
      setReqForm({ assessment_type: "BPS", is_required_at_intake: true, reassessment_frequency_days: "", customFreq: "", reminder_days_before: "14", notes: "" });
      loadRequirements(selected.id);
    }
    setSavingReq(false);
  }

  async function removeRequirement(id: string) {
    if (!selected) return;
    await fetch(`/api/program-assessment-requirements?id=${id}`, { method: "DELETE", credentials: "include" });
    loadRequirements(selected.id);
  }

  async function toggleNoteType(noteTypeKey: string, enabled: boolean) {
    if (!selected) return;
    setSavingNoteTypes(true);
    const current = selected.enabled_note_types ?? ALL_NOTE_TYPE_KEYS;
    const updated = enabled
      ? [...current.filter(k => k !== noteTypeKey), noteTypeKey]
      : current.filter(k => k !== noteTypeKey);
    const res = await fetch("/api/programs", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ id: selected.id, enabled_note_types: updated }),
    });
    if (res.ok) {
      setSelected(s => s ? { ...s, enabled_note_types: updated } : s);
      setPrograms(ps => ps.map(p => p.id === selected.id ? { ...p, enabled_note_types: updated } : p));
    }
    setSavingNoteTypes(false);
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
            <button key={p.id} onClick={() => { setSelected(p); setActiveTab("census"); }}
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

        {/* Program detail */}
        <div className="col-span-2">
          {selected ? (
            <div className="space-y-4">
              {/* Program header */}
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

              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab("census")}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "census" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  Active Census ({activeEnrollments.length})
                </button>
                <button
                  onClick={() => setActiveTab("assessments")}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "assessments" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  Assessment Requirements
                  {requirements.length > 0 && <span className="ml-1.5 bg-teal-100 text-teal-700 text-xs px-1.5 py-0.5 rounded-full">{requirements.length}</span>}
                </button>
                <button
                  onClick={() => setActiveTab("note_types")}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === "note_types" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                  Note Types
                </button>
              </div>

              {/* Census tab */}
              {activeTab === "census" && (
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
              )}

              {/* Note types tab */}
              {activeTab === "note_types" && (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                    <span className="font-semibold">Note type enablement</span> controls which documentation formats are available for clinicians when recording services for clients in <strong>{selected.name}</strong>. Disabled note types will be hidden when creating notes for this program.
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Enabled Note Types</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {NOTE_TYPES.map(noteType => {
                        const enabledTypes = selected.enabled_note_types ?? ALL_NOTE_TYPE_KEYS;
                        const isEnabled = enabledTypes.includes(noteType.key);
                        return (
                          <div key={noteType.key} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{noteType.icon}</span>
                              <div>
                                <div className="font-semibold text-slate-900 text-sm">{noteType.label}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{noteType.description}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleNoteType(noteType.key, !isEnabled)}
                              disabled={savingNoteTypes}
                              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${isEnabled ? "bg-teal-500" : "bg-slate-200"}`}
                              role="switch"
                              aria-checked={isEnabled}
                              title={isEnabled ? `Disable ${noteType.label}` : `Enable ${noteType.label}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isEnabled ? "translate-x-5" : "translate-x-0"}`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
                      <p className="text-xs text-slate-400">
                        {(() => {
                          const enabledTypes = selected.enabled_note_types ?? ALL_NOTE_TYPE_KEYS;
                          const count = NOTE_TYPES.filter(n => enabledTypes.includes(n.key)).length;
                          return `${count} of ${NOTE_TYPES.length} note types enabled`;
                        })()}
                        {savingNoteTypes && <span className="ml-2 text-teal-600">Saving...</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Assessment requirements tab */}
              {activeTab === "assessments" && (
                <div className="space-y-3">
                  {/* Info banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
                    <span className="font-semibold">Assessment requirements</span> define which assessments must be completed at intake and how frequently they must be re-administered for clients enrolled in <strong>{selected.name}</strong>.
                  </div>

                  {/* Add requirement form */}
                  {showReqForm ? (
                    <form onSubmit={addRequirement} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                      <h3 className="font-semibold text-slate-900 text-sm">Add Assessment Requirement</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Assessment Type *</label>
                          <select value={reqForm.assessment_type} onChange={e => setReqForm(f => ({ ...f, assessment_type: e.target.value }))} className={inputClass} required>
                            {ASSESSMENT_TYPES.map(a => (
                              <option key={a.value} value={a.value}>{a.icon} {a.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelClass}>Re-assessment Frequency</label>
                          <select
                            value={reqForm.reassessment_frequency_days}
                            onChange={e => setReqForm(f => ({ ...f, reassessment_frequency_days: e.target.value }))}
                            className={inputClass}>
                            {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                      </div>
                      {reqForm.reassessment_frequency_days === "custom" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelClass}>Custom Interval (days) *</label>
                            <input
                              type="number" min="1" max="3650"
                              value={reqForm.customFreq}
                              onChange={e => setReqForm(f => ({ ...f, customFreq: e.target.value }))}
                              className={inputClass} placeholder="e.g. 120"
                              required
                            />
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 pt-2">
                          <input
                            type="checkbox"
                            id="req_intake"
                            checked={reqForm.is_required_at_intake}
                            onChange={e => setReqForm(f => ({ ...f, is_required_at_intake: e.target.checked }))}
                            className="w-4 h-4 rounded text-teal-500"
                          />
                          <label htmlFor="req_intake" className="text-sm text-slate-700 font-medium">Required at intake</label>
                        </div>
                        {reqForm.reassessment_frequency_days && reqForm.reassessment_frequency_days !== "" && (
                          <div>
                            <label className={labelClass}>Reminder (days before due)</label>
                            <input
                              type="number" min="1" max="90"
                              value={reqForm.reminder_days_before}
                              onChange={e => setReqForm(f => ({ ...f, reminder_days_before: e.target.value }))}
                              className={inputClass}
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={labelClass}>Notes (optional)</label>
                        <input
                          value={reqForm.notes}
                          onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))}
                          className={inputClass}
                          placeholder="e.g. Required by state contract, complete within 30 days of admission"
                        />
                      </div>
                      <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => setShowReqForm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={savingReq} className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">{savingReq ? "Saving..." : "Add Requirement"}</button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setShowReqForm(true)}
                      className="w-full bg-white border-2 border-dashed border-slate-200 rounded-2xl py-4 text-sm text-slate-500 hover:border-teal-300 hover:text-teal-600 hover:bg-teal-50 transition-colors font-medium">
                      + Add Assessment Requirement
                    </button>
                  )}

                  {/* Requirements list */}
                  {requirements.length === 0 && !showReqForm ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
                      <div className="text-3xl mb-2">📋</div>
                      <p className="font-medium">No assessment requirements configured</p>
                      <p className="text-xs mt-1">Add requirements to specify which assessments must be completed at intake or on a recurring schedule for this program.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      {requirements.length > 0 && (
                        <>
                          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 grid grid-cols-12 gap-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <div className="col-span-4">Assessment</div>
                            <div className="col-span-2 text-center">Intake</div>
                            <div className="col-span-3">Re-assessment</div>
                            <div className="col-span-2">Reminder</div>
                            <div className="col-span-1"></div>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {requirements.map(r => {
                              const atype = ASSESSMENT_TYPES.find(a => a.value === r.assessment_type);
                              return (
                                <div key={r.id} className="px-5 py-4 grid grid-cols-12 gap-3 items-center hover:bg-slate-50">
                                  <div className="col-span-4">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{atype?.icon || "📋"}</span>
                                      <div>
                                        <div className="font-semibold text-slate-900 text-sm">{r.assessment_type}</div>
                                        {r.notes && <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]" title={r.notes}>{r.notes}</div>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-span-2 text-center">
                                    {r.is_required_at_intake
                                      ? <span className="inline-block bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-semibold">Required</span>
                                      : <span className="inline-block bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">Optional</span>
                                    }
                                  </div>
                                  <div className="col-span-3">
                                    <span className={`text-sm ${r.reassessment_frequency_days ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                                      {freqLabel(r.reassessment_frequency_days)}
                                    </span>
                                  </div>
                                  <div className="col-span-2 text-sm text-slate-500">
                                    {r.reassessment_frequency_days ? `${r.reminder_days_before}d before` : "—"}
                                  </div>
                                  <div className="col-span-1 text-right">
                                    <button
                                      onClick={() => removeRequirement(r.id)}
                                      className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
                                      title="Remove requirement">
                                      ×
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
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
