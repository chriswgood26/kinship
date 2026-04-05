"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Program { id: string; name: string; code: string | null; program_type: string; }
interface Enrollment {
  id: string;
  client_id: string;
  patient: { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; };
  status: string;
}

const STATUSES = [
  { value: "present", label: "Present", color: "bg-emerald-500 text-white", border: "border-emerald-500" },
  { value: "partial", label: "Partial", color: "bg-amber-500 text-white", border: "border-amber-500" },
  { value: "excused", label: "Excused", color: "bg-blue-500 text-white", border: "border-blue-500" },
  { value: "absent", label: "Absent", color: "bg-red-500 text-white", border: "border-red-500" },
  { value: "no_show", label: "No Show", color: "bg-slate-500 text-white", border: "border-slate-500" },
];

interface ClientRow {
  client_id: string;
  name: string;
  mrn: string | null;
  preferred_name?: string | null;
  status: string;
  check_in_time: string;
  check_out_time: string;
  reason_absent: string;
  activity_notes: string;
  behavior_notes: string;
  is_billable: boolean;
}

function TakeAttendanceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const today = new Date().toISOString().split("T")[0];

  const [programs, setPrograms] = useState<Program[]>([]);
  const [programId, setProgramId] = useState(params.get("program_id") || "");
  const [date, setDate] = useState(params.get("date") || today);
  const [staffName, setStaffName] = useState("");
  const [defaultCheckIn, setDefaultCheckIn] = useState("08:00");
  const [defaultCheckOut, setDefaultCheckOut] = useState("15:00");
  const [billingCode, setBillingCode] = useState("H2014");
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [enrollmentsLoaded, setEnrollmentsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/programs", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const filtered = (d.programs || []).filter((p: Program) => ["day_program", "dd_waiver", "other"].includes(p.program_type));
        setPrograms(filtered);
        if (!programId && filtered.length > 0) setProgramId(filtered[0].id);
      });
  }, []);

  useEffect(() => {
    if (!programId) return;
    setEnrollmentsLoaded(false);
    // Load active enrollments for program, also check for existing attendance records for this date
    Promise.all([
      fetch(`/api/client-programs?program_id=${programId}`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/day-program-attendance?program_id=${programId}&date=${date}`, { credentials: "include" }).then(r => r.json()),
    ]).then(([enrollData, attendData]) => {
      const activeEnrollments: Enrollment[] = (enrollData.enrollments || []).filter((e: Enrollment) => e.status === "active");
      const existingMap: Record<string, Record<string, unknown>> = {};
      (attendData.records || []).forEach((r: Record<string, unknown>) => {
        existingMap[r.client_id as string] = r;
      });

      const newRows: ClientRow[] = activeEnrollments.map((e: Enrollment) => {
        const existing = existingMap[e.patient.id];
        return {
          client_id: e.patient.id,
          name: `${e.patient.last_name}, ${e.patient.first_name}`,
          mrn: e.patient.mrn,
          preferred_name: e.patient.preferred_name,
          status: (existing?.status as string) || "present",
          check_in_time: existing?.check_in_time ? (existing.check_in_time as string).slice(0, 5) : defaultCheckIn,
          check_out_time: existing?.check_out_time ? (existing.check_out_time as string).slice(0, 5) : defaultCheckOut,
          reason_absent: (existing?.reason_absent as string) || "",
          activity_notes: (existing?.activity_notes as string) || "",
          behavior_notes: (existing?.behavior_notes as string) || "",
          is_billable: existing?.is_billable !== false,
        };
      });

      setRows(newRows);
      setEnrollmentsLoaded(true);
    });
  }, [programId, date]);

  function updateRow(clientId: string, field: keyof ClientRow, value: string | boolean) {
    setRows(prev => prev.map(r => r.client_id === clientId ? { ...r, [field]: value } : r));
  }

  function setAllStatus(status: string) {
    setRows(prev => prev.map(r => ({ ...r, status })));
  }

  function applyDefaults() {
    setRows(prev => prev.map(r => ({
      ...r,
      check_in_time: r.status === "present" || r.status === "partial" ? defaultCheckIn : r.check_in_time,
      check_out_time: r.status === "present" || r.status === "partial" ? defaultCheckOut : r.check_out_time,
    })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!programId) { setError("Please select a program"); return; }
    if (!staffName.trim()) { setError("Staff name is required"); return; }
    if (rows.length === 0) { setError("No enrolled clients found for this program"); return; }

    setSaving(true);
    setError("");

    const records = rows.map(r => ({
      program_id: programId,
      client_id: r.client_id,
      attendance_date: date,
      status: r.status,
      check_in_time: (r.status === "present" || r.status === "partial") ? r.check_in_time || null : null,
      check_out_time: (r.status === "present" || r.status === "partial") ? r.check_out_time || null : null,
      reason_absent: (r.status !== "present" && r.status !== "partial") ? r.reason_absent || null : null,
      activity_notes: r.activity_notes || null,
      behavior_notes: r.behavior_notes || null,
      staff_name: staffName,
      billing_code: billingCode,
      is_billable: r.is_billable,
    }));

    const res = await fetch("/api/day-program-attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ records }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => router.push(`/dashboard/day-program-attendance`), 1200);
  }

  const selectedProgram = programs.find(p => p.id === programId);
  const presentCount = rows.filter(r => r.status === "present" || r.status === "partial").length;
  const absentCount = rows.filter(r => r.status === "absent" || r.status === "no_show" || r.status === "excused").length;

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/day-program-attendance" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Take Attendance</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record daily attendance for a day habilitation program</p>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 font-semibold">
          ✓ Attendance saved successfully! Redirecting...
        </div>
      )}

      {/* Session info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Session Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Program *</label>
            <select value={programId} onChange={e => setProgramId(e.target.value)} className={inputClass} required>
              <option value="">— Select a program —</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
              ))}
            </select>
            {programs.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No day programs found. <Link href="/dashboard/programs" className="underline">Create a program</Link> with type &quot;Day Program&quot; or &quot;DD Waiver&quot; first.</p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Date *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} required />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Staff Name *</label>
            <input value={staffName} onChange={e => setStaffName(e.target.value)} className={inputClass} placeholder="Your full name" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Default Check-In</label>
            <input type="time" value={defaultCheckIn} onChange={e => setDefaultCheckIn(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Default Check-Out</label>
            <input type="time" value={defaultCheckOut} onChange={e => setDefaultCheckOut(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Billing Code</label>
            <select value={billingCode} onChange={e => setBillingCode(e.target.value)} className={inputClass}>
              <option value="H2014">H2014 – Day Habilitation</option>
              <option value="H2015">H2015 – Comprehensive Community Support</option>
              <option value="T2021">T2021 – Supported Living</option>
              <option value="S5100">S5100 – Day Program</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end gap-2">
            <button type="button" onClick={applyDefaults}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 whitespace-nowrap">
              Apply Default Times
            </button>
            <div className="text-xs text-slate-400 flex-1">Apply the default check-in/out times to all present/partial clients</div>
          </div>
        </div>
      </div>

      {/* Roster */}
      {programId && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-slate-900">Attendance Roster</h2>
              {selectedProgram && <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2.5 py-1 rounded-full">{selectedProgram.name}</span>}
              {rows.length > 0 && (
                <span className="text-sm text-slate-500">{presentCount} present · {absentCount} absent</span>
              )}
            </div>
            {rows.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Mark all:</span>
                {STATUSES.map(s => (
                  <button key={s.value} type="button" onClick={() => setAllStatus(s.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${s.color}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!enrollmentsLoaded ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading enrolled clients...</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-3xl mb-2">👤</div>
              <p className="text-slate-600 font-medium">No active enrollments in this program</p>
              <p className="text-slate-400 text-sm mt-1">
                <Link href="/dashboard/clients" className="text-teal-600 hover:underline">Enroll clients</Link> from their profile pages first
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase w-48">Individual</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase w-56">Status</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase w-28">Check In</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase w-28">Check Out</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase">Reason / Notes</th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase w-20">Billable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(row => {
                    const isPresent = row.status === "present" || row.status === "partial";
                    const isAbsent = !isPresent;
                    return (
                      <tr key={row.client_id} className={`transition-colors ${row.status === "absent" || row.status === "no_show" ? "bg-red-50/40" : row.status === "excused" ? "bg-blue-50/30" : "hover:bg-slate-50"}`}>
                        <td className="px-5 py-3">
                          <Link href={`/dashboard/clients/${row.client_id}`} className="font-semibold text-slate-900 hover:text-teal-600 text-sm">
                            {row.name}
                            {row.preferred_name && <span className="text-slate-400 font-normal ml-1">&quot;{row.preferred_name}&quot;</span>}
                          </Link>
                          {row.mrn && <div className="text-xs text-slate-400">MRN: {row.mrn}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {STATUSES.map(s => (
                              <button
                                key={s.value}
                                type="button"
                                onClick={() => updateRow(row.client_id, "status", s.value)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                  row.status === s.value ? s.color + " " + s.border : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={row.check_in_time}
                            onChange={e => updateRow(row.client_id, "check_in_time", e.target.value)}
                            disabled={isAbsent}
                            className="w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-40 disabled:bg-slate-50"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="time"
                            value={row.check_out_time}
                            onChange={e => updateRow(row.client_id, "check_out_time", e.target.value)}
                            disabled={isAbsent}
                            className="w-28 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-40 disabled:bg-slate-50"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {isAbsent ? (
                            <input
                              value={row.reason_absent}
                              onChange={e => updateRow(row.client_id, "reason_absent", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="Reason for absence..."
                            />
                          ) : (
                            <input
                              value={row.activity_notes}
                              onChange={e => updateRow(row.client_id, "activity_notes", e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="Activity notes (optional)..."
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={row.is_billable}
                            onChange={e => updateRow(row.client_id, "is_billable", e.target.checked)}
                            className="w-4 h-4 accent-teal-500"
                            title="Billable"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-sm text-slate-500">
              <span className="text-emerald-600 font-semibold">{presentCount} present</span>
              <span className="text-red-500 font-semibold">{absentCount} absent/excused</span>
              <span className="text-slate-400">· {rows.length} total enrolled</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/day-program-attendance"
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving || rows.length === 0}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : `Save Attendance (${rows.length} clients)`}
        </button>
      </div>
    </form>
  );
}

export default function TakeAttendancePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <TakeAttendanceForm />
    </Suspense>
  );
}
