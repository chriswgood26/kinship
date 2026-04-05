"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TimeEntry {
  id: string;
  entry_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  activity_type: string;
  activity_description: string | null;
  is_billable: boolean;
  funding_source: string | null;
  notes: string | null;
  patient: { first_name: string; last_name: string; mrn: string | null } | null;
  clinician_name: string | null;
  status: string;
}

interface StaffMember { clerk_user_id: string; first_name: string; last_name: string; role: string; }
interface PayPeriodConfig {
  type: "weekly" | "biweekly" | "semimonthly" | "monthly";
  startDay?: number;     // for semimonthly: day of month for first period
  anchorDate?: string;   // for weekly/biweekly: a known period start date
}

const ACTIVITY_TYPES = [
  { value: "individual_therapy", label: "Individual Therapy", billable: true },
  { value: "group_therapy", label: "Group Therapy", billable: true },
  { value: "psychiatric_eval", label: "Psychiatric Evaluation", billable: true },
  { value: "medication_management", label: "Medication Management", billable: true },
  { value: "case_management", label: "Case Management", billable: true },
  { value: "crisis_intervention", label: "Crisis Intervention", billable: true },
  { value: "telehealth", label: "Telehealth Session", billable: true },
  { value: "assessment", label: "Assessment / Intake", billable: true },
  { value: "documentation", label: "Documentation / Charting", billable: false },
  { value: "care_coordination", label: "Care Coordination (phone/email)", billable: false },
  { value: "consultation", label: "Consultation", billable: false },
  { value: "supervision", label: "Supervision", billable: false },
  { value: "training", label: "Training / In-service", billable: false },
  { value: "admin", label: "Administrative", billable: false },
  { value: "travel", label: "Travel / Home Visit", billable: false },
  { value: "other", label: "Other", billable: false },
];

function getWeekDates(weekOffset = 0) {
  const now = new Date();
  now.setDate(now.getDate() + weekOffset * 7);
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  return days;
}

function formatHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function TimesheetPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [payConfig, setPayConfig] = useState<PayPeriodConfig>({ type: "biweekly" });
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"my" | "all">("my");
  const [selectedClinician, setSelectedClinician] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState<{id:string;first_name:string;last_name:string;mrn:string|null}[]>([]);

  const weekDays = getWeekDates(weekOffset);
  const weekStart = weekDays[0].toISOString().split("T")[0];
  const weekEnd = weekDays[6].toISOString().split("T")[0];

  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "10:00",
    activity_type: "individual_therapy",
    activity_description: "",
    client_id: "",
    patient_name: "",
    is_billable: true,
    funding_source: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (viewMode === "all") params.set("all", "true");
    if (selectedClinician) params.set("clinician_id", selectedClinician);
    params.set("week_start", weekStart);
    params.set("week_end", weekEnd);

    const res = await fetch(`/api/time-entries?${params}`, { credentials: "include" });
    const d = await res.json();
    // Filter client-side by week
    const filtered = (d.entries || []).filter((e: TimeEntry) => e.entry_date >= weekStart && e.entry_date <= weekEnd);
    setEntries(filtered);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (staff.length === 0) {
      fetch("/api/org-users", { credentials: "include" }).then(r => r.json()).then(d => setStaff(d.users || []));
    }
    // Load org pay period config
    fetch("/api/admin/org", { credentials: "include" }).then(r => r.json()).then(d => {
      if (d.org?.pay_period_type) {
        setPayConfig({
          type: d.org.pay_period_type,
          startDay: d.org.pay_period_start_day ? Number(d.org.pay_period_start_day) : undefined,
          anchorDate: d.org.pay_period_start_date || undefined,
        });
      }
    }).catch(() => {});
  }, [weekOffset, viewMode, selectedClinician]);

  useEffect(() => {
    if (patientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(patientSearch)}`, { credentials: "include" })
        .then(r => r.json()).then(d => setPatients(d.patients || []));
    } else setPatients([]);
  }, [patientSearch]);

  // Update is_billable when activity type changes
  useEffect(() => {
    const activity = ACTIVITY_TYPES.find(a => a.value === form.activity_type);
    if (activity) setForm(f => ({ ...f, is_billable: activity.billable }));
  }, [form.activity_type]);

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/time-entries", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, client_id: form.client_id || null }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ entry_date: new Date().toISOString().split("T")[0], start_time: "09:00", end_time: "10:00", activity_type: "individual_therapy", activity_description: "", client_id: "", patient_name: "", is_billable: true, funding_source: "", notes: "" });
    load();
  }

  async function deleteEntry(id: string) {
    await fetch(`/api/time-entries?id=${id}`, { method: "DELETE", credentials: "include" });
    load();
  }

  function exportCSV() {
    const rows = [
      ["Date", "Clinician", "Patient", "Activity", "Start", "End", "Hours", "Billable", "Funding Source", "Notes"],
      ...entries.map(e => {
        const p = Array.isArray(e.patient) ? e.patient[0] : e.patient;
        return [
          e.entry_date, e.clinician_name || "—",
          p ? `${p.last_name}, ${p.first_name}` : "—",
          ACTIVITY_TYPES.find(a => a.value === e.activity_type)?.label || e.activity_type,
          e.start_time || "—", e.end_time || "—",
          (e.duration_minutes / 60).toFixed(2),
          e.is_billable ? "Yes" : "No",
          e.funding_source || "—", e.notes || "—",
        ];
      })
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `timesheet-${weekStart}-to-${weekEnd}.csv`;
    a.click();
  }

  // Totals
  const totalMinutes = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const billableMinutes = entries.filter(e => e.is_billable).reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const byDay = weekDays.map(d => ({
    date: d, dateStr: d.toISOString().split("T")[0],
    entries: entries.filter(e => e.entry_date === d.toISOString().split("T")[0]),
  }));

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timesheet</h1>
          <p className="text-slate-500 text-sm mt-0.5">
          Track billable hours and activities for payroll
          <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium capitalize">
            {payConfig.type === "biweekly" ? "Bi-weekly" : payConfig.type === "semimonthly" ? "Semi-monthly" : payConfig.type.charAt(0).toUpperCase() + payConfig.type.slice(1)} pay period
          </span>
        </p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50">
            📥 Export CSV
          </button>
          <button onClick={() => setShowForm(true)} className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
            + Log Time
          </button>
        </div>
      </div>

      {/* View controls */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        {/* Week nav */}
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="border border-slate-200 px-3 py-1.5 rounded-xl text-sm hover:bg-slate-50">←</button>
          <span className="text-sm font-semibold text-slate-900 min-w-[200px] text-center">
            {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <button onClick={() => setWeekOffset(w => w + 1)} className="border border-slate-200 px-3 py-1.5 rounded-xl text-sm hover:bg-slate-50">→</button>
          {weekOffset !== 0 && <button onClick={() => setWeekOffset(0)} className="text-xs text-teal-600 font-medium hover:text-teal-700">This week</button>}
        </div>

        {/* View toggle */}
        <div className="flex gap-2 items-center">
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {[["my", "My Timesheet"], ["all", "All Staff"]].map(([v, l]) => (
              <button key={v} onClick={() => setViewMode(v as "my" | "all")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${viewMode === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                {l}
              </button>
            ))}
          </div>
          {viewMode === "all" && (
            <select value={selectedClinician} onChange={e => setSelectedClinician(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-white focus:outline-none">
              <option value="">All Clinicians</option>
              {staff.map(s => <option key={s.clerk_user_id} value={s.clerk_user_id}>{s.first_name} {s.last_name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Hours", value: formatHours(totalMinutes), color: "text-slate-900" },
          { label: "Billable Hours", value: formatHours(billableMinutes), color: "text-emerald-700" },
          { label: "Non-Billable", value: formatHours(totalMinutes - billableMinutes), color: "text-slate-500" },
          { label: "Entries This Week", value: entries.length, color: "text-teal-700" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wide mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Log time form */}
      {showForm && (
        <form onSubmit={saveEntry} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Log Time Entry</h2>
          <div className="grid grid-cols-3 gap-4">
            <div><label className={labelClass}>Date *</label><input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} className={inputClass} required /></div>
            <div><label className={labelClass}>Start Time</label><input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className={inputClass} /></div>
            <div><label className={labelClass}>End Time</label><input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className={inputClass} /></div>
          </div>
          {form.start_time && form.end_time && (
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-2 text-sm text-teal-800">
              Duration: {formatHours((() => { const [sh,sm]=form.start_time.split(":").map(Number); const [eh,em]=form.end_time.split(":").map(Number); return (eh*60+em)-(sh*60+sm); })())}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Activity Type *</label>
              <select value={form.activity_type} onChange={e => setForm(f => ({ ...f, activity_type: e.target.value }))} className={inputClass} required>
                {ACTIVITY_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}{a.billable ? " (billable)" : ""}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Patient (optional)</label>
              {form.patient_name ? (
                <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
                  <span className="text-sm font-semibold text-teal-800">{form.patient_name}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", patient_name: "" }))} className="text-teal-500">✕</button>
                </div>
              ) : (
                <div className="relative">
                  <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} className={inputClass} placeholder="Search patient..." />
                  {patients.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto">
                      {patients.map(p => (
                        <button key={p.id} type="button" onClick={() => { setForm(f => ({ ...f, client_id: p.id, patient_name: `${p.last_name}, ${p.first_name}` })); setPatientSearch(""); setPatients([]); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0 text-sm text-slate-900">
                          {p.last_name}, {p.first_name} <span className="text-slate-400 text-xs">MRN: {p.mrn || "—"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Activity Description</label><input value={form.activity_description} onChange={e => setForm(f => ({ ...f, activity_description: e.target.value }))} className={inputClass} placeholder="Brief description..." /></div>
            <div>
              <label className={labelClass}>Funding Source</label>
              <select value={form.funding_source} onChange={e => setForm(f => ({ ...f, funding_source: e.target.value }))} className={inputClass}>
                <option value="">— Select —</option>
                <option>Medicaid / OHP</option><option>Medicare</option><option>CCBHC Grant</option>
                <option>Block Grant</option><option>Private Insurance</option><option>Self-Pay</option><option>Other</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="billable" checked={form.is_billable} onChange={e => setForm(f => ({ ...f, is_billable: e.target.checked }))} className="w-4 h-4 accent-teal-500" />
            <label htmlFor="billable" className="text-sm text-slate-900 cursor-pointer">Billable time</label>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Log Time"}
            </button>
          </div>
        </form>
      )}

      {/* Weekly calendar view */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {byDay.map(({ date, entries: dayEntries }) => {
            const isToday = date.toDateString() === new Date().toDateString();
            const dayMins = dayEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
            return (
              <div key={date.toISOString()} className={`px-3 py-3 text-center border-r border-slate-100 last:border-0 ${isToday ? "bg-teal-50" : ""}`}>
                <div className={`text-xs font-bold uppercase tracking-wide ${isToday ? "text-teal-600" : "text-slate-400"}`}>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className={`text-lg font-bold mt-0.5 ${isToday ? "text-teal-700" : "text-slate-900"}`}>
                  {date.getDate()}
                </div>
                {dayMins > 0 && (
                  <div className="text-xs text-teal-600 font-semibold mt-0.5">{formatHours(dayMins)}</div>
                )}
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="text-3xl mb-2">⏱️</div>
            <p className="font-medium text-slate-600 mb-1">No time entries this week</p>
            <button onClick={() => setShowForm(true)} className="text-teal-600 text-sm font-medium hover:text-teal-700">+ Log your first entry</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {entries.map(entry => {
              const patient = Array.isArray(entry.patient) ? entry.patient[0] : entry.patient;
              const activity = ACTIVITY_TYPES.find(a => a.value === entry.activity_type);
              return (
                <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                  <div className="w-20 flex-shrink-0 text-xs text-slate-500 font-medium">
                    {new Date(entry.entry_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900">{activity?.label || entry.activity_type}</div>
                    {patient && <div className="text-xs text-slate-500">{patient.last_name}, {patient.first_name}</div>}
                    {entry.activity_description && <div className="text-xs text-slate-400 truncate">{entry.activity_description}</div>}
                    {viewMode === "all" && entry.clinician_name && <div className="text-xs text-teal-600">{entry.clinician_name}</div>}
                  </div>
                  <div className="text-xs text-slate-500 flex-shrink-0">
                    {entry.start_time && entry.end_time ? `${entry.start_time.slice(0,5)} – ${entry.end_time.slice(0,5)}` : ""}
                  </div>
                  <div className="font-bold text-sm flex-shrink-0 w-16 text-right text-slate-900">
                    {formatHours(entry.duration_minutes || 0)}
                  </div>
                  <div className="flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${entry.is_billable ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {entry.is_billable ? "Billable" : "Non-billable"}
                    </span>
                  </div>
                  <button onClick={() => deleteEntry(entry.id)} className="text-slate-300 hover:text-red-400 flex-shrink-0 text-sm">✕</button>
                </div>
              );
            })}
            <div className="px-5 py-3 bg-slate-50 flex items-center justify-end gap-6 text-sm">
              <span className="text-slate-500">Total: <span className="font-bold text-slate-900">{formatHours(totalMinutes)}</span></span>
              <span className="text-emerald-600">Billable: <span className="font-bold">{formatHours(billableMinutes)}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
