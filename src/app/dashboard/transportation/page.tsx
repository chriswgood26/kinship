"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string | null;
  preferred_name?: string | null;
}

interface Trip {
  id: string;
  trip_date: string;
  trip_purpose: string;
  vehicle_id: string | null;
  vehicle_name: string | null;
  driver_name: string | null;
  pickup_time: string | null;
  dropoff_time: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  mileage: number | null;
  odometer_start: number | null;
  odometer_end: number | null;
  status: string;
  escort_required: boolean;
  escort_staff: string | null;
  behavior_notes: string | null;
  notes: string | null;
  client: Client | null;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-500",
  no_show: "bg-slate-100 text-slate-500",
};
const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const PURPOSE_LABELS: Record<string, string> = {
  day_program: "Day Program",
  medical_appointment: "Medical Appointment",
  community_outing: "Community Outing",
  vocational: "Vocational",
  school: "School",
  grocery_errands: "Grocery / Errands",
  family_visit: "Family Visit",
  recreational: "Recreational",
  other: "Other",
};
const PURPOSE_COLORS: Record<string, string> = {
  day_program: "bg-teal-100 text-teal-700",
  medical_appointment: "bg-red-100 text-red-600",
  community_outing: "bg-violet-100 text-violet-700",
  vocational: "bg-orange-100 text-orange-700",
  school: "bg-yellow-100 text-yellow-700",
  grocery_errands: "bg-green-100 text-green-700",
  family_visit: "bg-pink-100 text-pink-700",
  recreational: "bg-sky-100 text-sky-700",
  other: "bg-slate-100 text-slate-600",
};

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(t: string | null) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export default function TransportationPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function loadTrips() {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    const res = await fetch(`/api/transportation?${params}`, { credentials: "include" });
    const d = await res.json();
    setTrips(d.trips || []);
    setLoading(false);
  }

  useEffect(() => { loadTrips(); }, [dateFrom, dateTo]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await fetch("/api/transportation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, status }),
    });
    await loadTrips();
    setUpdatingId(null);
  }

  const filtered = trips.filter(t =>
    (!statusFilter || t.status === statusFilter) &&
    (!purposeFilter || t.trip_purpose === purposeFilter)
  );

  const total = filtered.length;
  const completed = filtered.filter(t => t.status === "completed").length;
  const scheduled = filtered.filter(t => t.status === "scheduled" || t.status === "in_progress").length;
  const totalMiles = filtered.reduce((sum, t) => sum + (t.mileage || 0), 0);

  // Group by date
  const byDate: Record<string, Trip[]> = {};
  filtered.forEach(t => {
    if (!byDate[t.trip_date]) byDate[t.trip_date] = [];
    byDate[t.trip_date].push(t);
  });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transportation</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track vehicle trips and transportation for DD program individuals</p>
        </div>
        <Link
          href="/dashboard/transportation/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 transition-colors"
        >
          🚐 Log Trip
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
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
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Purpose</label>
          <select value={purposeFilter} onChange={e => setPurposeFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[180px]">
            <option value="">All Purposes</option>
            {Object.entries(PURPOSE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
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
          { label: "Total Trips", value: total, color: "bg-slate-50 border-slate-200", text: "text-slate-900" },
          { label: "Completed", value: completed, color: "bg-emerald-50 border-emerald-100", text: "text-emerald-700" },
          { label: "Upcoming / Active", value: scheduled, color: scheduled > 0 ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-200", text: scheduled > 0 ? "text-blue-700" : "text-slate-900" },
          { label: "Total Miles", value: totalMiles > 0 ? `${totalMiles.toFixed(1)} mi` : "—", color: "bg-teal-50 border-teal-100", text: "text-teal-700" },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-2xl p-4`}>
            <div className={`text-3xl font-bold ${s.text}`}>{s.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Trips list */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">Loading...</div>
      ) : dates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">🚐</div>
          <p className="font-semibold text-slate-900 mb-1">No trips found</p>
          <p className="text-slate-500 text-sm mb-4">Start logging transportation trips for DD program individuals</p>
          <Link href="/dashboard/transportation/new"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 inline-block">
            🚐 Log Trip
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map(date => {
            const dayTrips = byDate[date];
            const dayMiles = dayTrips.reduce((s, t) => s + (t.mileage || 0), 0);
            return (
              <div key={date} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{fmtDate(date)}</span>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{dayTrips.length} trip{dayTrips.length !== 1 ? "s" : ""}</span>
                    {dayMiles > 0 && <span className="text-teal-600 font-medium">{dayMiles.toFixed(1)} mi</span>}
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {dayTrips.map(trip => {
                    const client = trip.client;
                    return (
                      <div key={trip.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">
                              {client?.first_name?.[0]}{client?.last_name?.[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 text-sm">
                                {client ? `${client.last_name}, ${client.first_name}` : "—"}
                                {client?.preferred_name && <span className="text-slate-400 font-normal ml-1.5 text-xs">&quot;{client.preferred_name}&quot;</span>}
                              </div>
                              {client?.mrn && <div className="text-xs text-slate-400">MRN: {client.mrn}</div>}
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[trip.status] || "bg-slate-100 text-slate-600"}`}>
                                  {STATUS_LABELS[trip.status] || trip.status}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PURPOSE_COLORS[trip.trip_purpose] || "bg-slate-100 text-slate-600"}`}>
                                  {PURPOSE_LABELS[trip.trip_purpose] || trip.trip_purpose}
                                </span>
                                {trip.escort_required && (
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">Escort Required</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0 text-right space-y-1">
                            <div className="text-sm text-slate-600">
                              {trip.pickup_time || trip.dropoff_time ? (
                                <span>{fmtTime(trip.pickup_time)} → {fmtTime(trip.dropoff_time)}</span>
                              ) : <span className="text-slate-400">No times set</span>}
                            </div>
                            {(trip.vehicle_name || trip.vehicle_id) && (
                              <div className="text-xs text-slate-500">🚐 {trip.vehicle_name || trip.vehicle_id}</div>
                            )}
                            {trip.driver_name && (
                              <div className="text-xs text-slate-500">👤 {trip.driver_name}</div>
                            )}
                            {trip.mileage != null && (
                              <div className="text-xs text-slate-500">{trip.mileage} mi</div>
                            )}
                          </div>
                        </div>

                        {(trip.pickup_address || trip.dropoff_address) && (
                          <div className="mt-2 text-xs text-slate-500 flex gap-4">
                            {trip.pickup_address && <span>📍 From: {trip.pickup_address}</span>}
                            {trip.dropoff_address && <span>🏁 To: {trip.dropoff_address}</span>}
                          </div>
                        )}
                        {trip.notes && (
                          <div className="mt-1.5 text-xs text-slate-500 line-clamp-1">
                            <span className="font-medium">Notes:</span> {trip.notes}
                          </div>
                        )}
                        {trip.behavior_notes && (
                          <div className="mt-1 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 line-clamp-1">
                            <span className="font-medium">Behavior:</span> {trip.behavior_notes}
                          </div>
                        )}

                        {/* Quick status update */}
                        {trip.status !== "completed" && trip.status !== "cancelled" && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-xs text-slate-400">Quick update:</span>
                            {trip.status === "scheduled" && (
                              <button
                                onClick={() => updateStatus(trip.id, "in_progress")}
                                disabled={updatingId === trip.id}
                                className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium transition-colors disabled:opacity-50"
                              >
                                Start Trip
                              </button>
                            )}
                            <button
                              onClick={() => updateStatus(trip.id, "completed")}
                              disabled={updatingId === trip.id}
                              className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-medium transition-colors disabled:opacity-50"
                            >
                              Mark Completed
                            </button>
                            <button
                              onClick={() => updateStatus(trip.id, "no_show")}
                              disabled={updatingId === trip.id}
                              className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 font-medium transition-colors disabled:opacity-50"
                            >
                              No Show
                            </button>
                            <button
                              onClick={() => updateStatus(trip.id, "cancelled")}
                              disabled={updatingId === trip.id}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 font-medium transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
