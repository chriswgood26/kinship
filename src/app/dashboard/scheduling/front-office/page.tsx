"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string | null;
  end_time: string | null;
  appointment_type: string | null;
  status: string;
  notes: string | null;
  is_telehealth: boolean;
  is_provider_only: boolean;
  is_recurring_instance: boolean;
  client_id: string | null;
  client: { first_name: string; last_name: string; mrn: string | null; preferred_name: string | null } | null;
  provider: { first_name: string; last_name: string; title: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-teal-100 text-teal-700 border-teal-200",
  arrived: "bg-emerald-100 text-emerald-700 border-emerald-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-slate-100 text-slate-500 border-slate-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
  no_show: "bg-orange-100 text-orange-700 border-orange-200",
};

const QUICK_ACTIONS: Record<string, { label: string; next: string; color: string }> = {
  scheduled:   { label: "Confirm", next: "confirmed", color: "bg-teal-500 hover:bg-teal-400" },
  confirmed:   { label: "Mark Arrived", next: "arrived", color: "bg-emerald-500 hover:bg-emerald-400" },
  arrived:     { label: "In Progress", next: "in_progress", color: "bg-amber-500 hover:bg-amber-400" },
  in_progress: { label: "Complete", next: "completed", color: "bg-slate-500 hover:bg-slate-400" },
};

export default function FrontOfficePage() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/appointments/day?date=${selectedDate}`, { credentials: "include" });
    const data = await res.json();
    setAppointments(data.appointments || []);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => loadAppointments(), 60_000);
    return () => clearInterval(interval);
  }, [loadAppointments]);

  async function updateStatus(apptId: string, newStatus: string) {
    setUpdating(apptId);
    await fetch(`/api/appointments/${apptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    });
    setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: newStatus } : a));
    setUpdating(null);
  }

  async function markNoShow(apptId: string) {
    setUpdating(apptId);
    await fetch(`/api/appointments/${apptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "no_show" }),
    });
    setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: "no_show" } : a));
    setUpdating(null);
  }

  async function cancelAppointment(apptId: string) {
    if (!confirm("Cancel this appointment?")) return;
    setUpdating(apptId);
    await fetch(`/api/appointments/${apptId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "cancelled" }),
    });
    setAppointments(prev => prev.map(a => a.id === apptId ? { ...a, status: "cancelled" } : a));
    setUpdating(null);
  }

  const filtered = appointments.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    const client = a.client;
    if (client && (`${client.first_name} ${client.last_name}`.toLowerCase().includes(q) || (client.mrn || "").toLowerCase().includes(q))) return true;
    if ((a.appointment_type || "").toLowerCase().includes(q)) return true;
    return false;
  });

  // Stats
  const waiting = appointments.filter(a => a.status === "arrived").length;
  const inProgress = appointments.filter(a => a.status === "in_progress").length;
  const completed = appointments.filter(a => a.status === "completed").length;
  const remaining = appointments.filter(a => ["scheduled", "confirmed"].includes(a.status)).length;

  const formatDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/scheduling" className="text-slate-400 hover:text-slate-700 text-sm">← Schedule</Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">🏥 Front Office</h1>
            <p className="text-slate-500 text-sm">{formatDate(selectedDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <Link href={`/dashboard/scheduling/new?date=${selectedDate}`}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm">
            + Walk-in
          </Link>
        </div>
      </div>

      {/* Status tiles */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Waiting / Arrived", value: waiting, icon: "⏳", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "In Session", value: inProgress, icon: "🩺", color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Remaining", value: remaining, icon: "📋", color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Completed Today", value: completed, icon: "✅", color: "bg-slate-50 border-slate-200 text-slate-600" },
        ].map(s => (
          <div key={s.label} className={`border rounded-2xl p-4 ${s.color.split(" ").slice(0, 2).join(" ")}`}>
            <div className={`text-3xl font-bold ${s.color.split(" ")[2]}`}>{s.icon} {s.value}</div>
            <div className={`text-xs font-medium mt-1 ${s.color.split(" ")[2]}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by client name, MRN, or appointment type..."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
      </div>

      {/* Appointments list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading appointments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="text-3xl mb-2">📅</div>
            <p className="text-sm">No appointments {search ? "matching your search" : "for this date"}</p>
            <Link href={`/dashboard/scheduling/new?date=${selectedDate}`} className="mt-3 inline-block text-xs text-teal-600 font-medium hover:text-teal-700">
              + Schedule appointment →
            </Link>
          </div>
        ) : (
          <div>
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-3">
              <span className="col-span-1">Time</span>
              <span className="col-span-3">Client</span>
              <span className="col-span-2">Provider</span>
              <span className="col-span-2">Type</span>
              <span className="col-span-1">Status</span>
              <span className="col-span-3">Quick Actions</span>
            </div>
            {filtered.map(appt => {
              const client = appt.client;
              const provider = appt.provider;
              const quickAction = QUICK_ACTIONS[appt.status];
              const isActive = updating === appt.id;
              const isDone = ["completed", "cancelled", "no_show"].includes(appt.status);

              return (
                <div key={appt.id} className={`grid grid-cols-12 gap-3 px-5 py-4 items-center border-b border-slate-50 last:border-0 transition-colors ${appt.is_provider_only ? "bg-slate-50/50" : "hover:bg-slate-50"}`}>
                  <div className="col-span-1 text-sm font-bold text-slate-900">
                    {appt.start_time ? new Date(`2000-01-01T${appt.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
                  </div>
                  <div className="col-span-3">
                    {appt.is_provider_only ? (
                      <div className="font-semibold text-slate-500 text-sm">🗓 {appt.appointment_type || "Block"}</div>
                    ) : client ? (
                      <div>
                        <Link href={`/dashboard/clients/${appt.client_id}`} className="font-semibold text-slate-900 text-sm hover:text-teal-600">
                          {client.last_name}, {client.first_name}
                          {client.preferred_name && <span className="font-normal text-slate-400 ml-1">"{client.preferred_name}"</span>}
                        </Link>
                        {client.mrn && <div className="text-xs text-slate-400">MRN: {client.mrn}</div>}
                      </div>
                    ) : <span className="text-slate-400 text-sm">—</span>}
                  </div>
                  <div className="col-span-2 text-sm text-slate-600">
                    {provider ? `${provider.first_name} ${provider.last_name}` : <span className="text-slate-300">—</span>}
                    {provider?.title && <div className="text-xs text-slate-400">{provider.title}</div>}
                  </div>
                  <div className="col-span-2 text-sm text-slate-600 flex items-center gap-1">
                    {appt.is_telehealth && <span>🎥</span>}
                    {appt.is_recurring_instance && <span title="Recurring">🔁</span>}
                    <span className="truncate">{appt.appointment_type || "—"}</span>
                  </div>
                  <div className="col-span-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium border capitalize ${STATUS_COLORS[appt.status] || STATUS_COLORS.scheduled}`}>
                      {appt.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center gap-1.5 flex-wrap">
                    {quickAction && !appt.is_provider_only && (
                      <button onClick={() => updateStatus(appt.id, quickAction.next)}
                        disabled={isActive}
                        className={`text-xs text-white px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 ${quickAction.color}`}>
                        {isActive ? "..." : quickAction.label}
                      </button>
                    )}
                    {!isDone && appt.status !== "no_show" && !appt.is_provider_only && (
                      <button onClick={() => markNoShow(appt.id)} disabled={isActive}
                        className="text-xs border border-orange-200 text-orange-600 px-2.5 py-1.5 rounded-lg font-medium hover:bg-orange-50 transition-colors disabled:opacity-50">
                        No Show
                      </button>
                    )}
                    {!isDone && (
                      <button onClick={() => cancelAppointment(appt.id)} disabled={isActive}
                        className="text-xs border border-red-200 text-red-500 px-2.5 py-1.5 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
                        Cancel
                      </button>
                    )}
                    {isDone && (
                      <span className="text-xs text-slate-400 italic">{appt.status === "completed" ? "Complete" : appt.status.replace("_", " ")}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auto-refresh note */}
      <p className="text-center text-xs text-slate-400">Auto-refreshes every 60 seconds · <button onClick={loadAppointments} className="text-teal-600 hover:text-teal-700">Refresh now</button></p>
    </div>
  );
}
