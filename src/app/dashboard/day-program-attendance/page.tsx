"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Program { id: string; name: string; code: string | null; program_type: string; }
interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }
interface AttendanceRecord {
  id: string;
  attendance_date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  hours_attended: number | null;
  units: number | null;
  staff_name: string | null;
  reason_absent: string | null;
  activity_notes: string | null;
  billing_code: string | null;
  is_billable: boolean;
  client: Client | null;
  program: Program | null;
}

const STATUS_COLORS: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  absent: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-700",
  excused: "bg-blue-100 text-blue-700",
  no_show: "bg-slate-100 text-slate-500",
};
const STATUS_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  partial: "Partial Day",
  excused: "Excused",
  no_show: "No Show",
};

function fmt(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function DayProgramAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [programFilter, setProgramFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);

  async function loadPrograms() {
    const res = await fetch("/api/programs", { credentials: "include" });
    const d = await res.json();
    setPrograms((d.programs || []).filter((p: Program & { program_type: string }) => ["day_program", "dd_waiver"].includes(p.program_type)));
  }

  async function loadRecords() {
    setLoading(true);
    const params = new URLSearchParams();
    if (programFilter) params.set("program_id", programFilter);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    const res = await fetch(`/api/day-program-attendance?${params}`, { credentials: "include" });
    const d = await res.json();
    setRecords(d.records || []);
    setLoading(false);
  }

  useEffect(() => { loadPrograms(); }, []);
  useEffect(() => { loadRecords(); }, [programFilter, dateFrom, dateTo]);

  const filtered = statusFilter ? records.filter(r => r.status === statusFilter) : records;

  // Group by date for summary
  const byDate: Record<string, AttendanceRecord[]> = {};
  filtered.forEach(r => {
    const k = r.attendance_date;
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(r);
  });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  const total = filtered.length;
  const present = filtered.filter(r => r.status === "present" || r.status === "partial").length;
  const absent = filtered.filter(r => r.status === "absent" || r.status === "no_show").length;
  const excused = filtered.filter(r => r.status === "excused").length;
  const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Day Program Attendance</h1>
          <p className="text-slate-500 text-sm mt-0.5">Daily attendance tracking for day habilitation programs</p>
        </div>
        <Link
          href="/dashboard/day-program-attendance/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 transition-colors"
        >
          📋 Take Attendance
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Program</label>
          <select
            value={programFilter}
            onChange={e => setProgramFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[200px]"
          >
            <option value="">All Programs</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.code ? ` (${p.code})` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          {[
            { label: "Today", from: new Date().toISOString().split("T")[0], to: new Date().toISOString().split("T")[0] },
            { label: "This Week", from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0]; })(), to: new Date().toISOString().split("T")[0] },
            { label: "Last 30d", from: (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0]; })(), to: new Date().toISOString().split("T")[0] },
          ].map(p => (
            <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Records", value: total, color: "bg-slate-50 border-slate-200", text: "text-slate-900" },
          { label: "Present / Partial", value: present, color: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
          { label: "Absent / No-Show", value: absent, color: absent > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-200", text: absent > 0 ? "text-red-600" : "text-slate-900" },
          { label: "Attendance Rate", value: `${attendanceRate}%`, color: attendanceRate >= 80 ? "bg-teal-50 border-teal-100" : attendanceRate >= 60 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100", text: attendanceRate >= 80 ? "text-teal-700" : attendanceRate >= 60 ? "text-amber-700" : "text-red-600" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className={`text-3xl font-bold ${s.text}`}>{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
            {s.label === "Absent / No-Show" && excused > 0 && (
              <div className="text-xs text-blue-500 mt-0.5">{excused} excused</div>
            )}
          </div>
        ))}
      </div>

      {/* Attendance records grouped by date */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">Loading...</div>
      ) : dates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-semibold text-slate-900 mb-1">No attendance records found</p>
          <p className="text-slate-500 text-sm mb-4">Start by taking attendance for a day program session</p>
          <Link href="/dashboard/day-program-attendance/new"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            📋 Take Attendance
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map(date => {
            const recs = byDate[date];
            const dayPresent = recs.filter(r => r.status === "present" || r.status === "partial").length;
            const dayTotal = recs.length;
            const prog = recs[0]?.program;
            return (
              <div key={date} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">{fmt(date)}</span>
                    {prog && (
                      <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-medium">
                        {prog.name}{prog.code ? ` · ${prog.code}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">{dayPresent}/{dayTotal} present</span>
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-2 bg-teal-500 rounded-full" style={{ width: `${dayTotal > 0 ? (dayPresent / dayTotal) * 100 : 0}%` }} />
                    </div>
                    <Link href={`/dashboard/day-program-attendance/new?date=${date}&program_id=${recs[0]?.program?.id || ""}`}
                      className="text-xs text-teal-600 font-medium hover:text-teal-700">
                      Edit →
                    </Link>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Individual</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Check In</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Check Out</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Units</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Staff</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recs.map(r => {
                      const client = r.client;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            {client ? (
                              <Link href={`/dashboard/clients/${client.id}`} className="font-semibold text-slate-900 hover:text-teal-600 text-sm">
                                {client.last_name}, {client.first_name}
                                {client.preferred_name && <span className="text-slate-400 font-normal ml-1">&quot;{client.preferred_name}&quot;</span>}
                              </Link>
                            ) : <span className="text-slate-400">—</span>}
                            {client?.mrn && <div className="text-xs text-slate-400">MRN: {client.mrn}</div>}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[r.status] || STATUS_COLORS.present}`}>
                              {STATUS_LABELS[r.status] || r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{fmtTime(r.check_in_time)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{fmtTime(r.check_out_time)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{r.hours_attended != null ? `${r.hours_attended}h` : "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{r.units ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{r.staff_name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">
                            {r.status === "absent" || r.status === "no_show" || r.status === "excused"
                              ? r.reason_absent || r.activity_notes || "—"
                              : r.activity_notes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
