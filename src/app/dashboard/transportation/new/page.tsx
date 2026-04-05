"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string | null;
  preferred_name?: string | null;
}

const PURPOSES = [
  { value: "day_program", label: "Day Program" },
  { value: "medical_appointment", label: "Medical Appointment" },
  { value: "community_outing", label: "Community Outing" },
  { value: "vocational", label: "Vocational" },
  { value: "school", label: "School" },
  { value: "grocery_errands", label: "Grocery / Errands" },
  { value: "family_visit", label: "Family Visit" },
  { value: "recreational", label: "Recreational" },
  { value: "other", label: "Other" },
];

const STATUSES = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "in_progress", label: "In Progress" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No Show" },
];

const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";

function LogTripForm() {
  const router = useRouter();
  const params = useSearchParams();
  const today = new Date().toISOString().split("T")[0];

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(params.get("client_id") || "");
  const [tripDate, setTripDate] = useState(params.get("date") || today);
  const [tripPurpose, setTripPurpose] = useState("day_program");
  const [status, setStatus] = useState("scheduled");
  const [vehicleId, setVehicleId] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [odometerStart, setOdometerStart] = useState("");
  const [odometerEnd, setOdometerEnd] = useState("");
  const [mileage, setMileage] = useState("");
  const [escortRequired, setEscortRequired] = useState(false);
  const [escortStaff, setEscortStaff] = useState("");
  const [behaviorNotes, setBehaviorNotes] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/clients?limit=200", { credentials: "include" })
      .then(r => r.json())
      .then(d => setClients(d.clients || []));
  }, []);

  // Auto-compute mileage from odometer
  useEffect(() => {
    if (odometerStart && odometerEnd) {
      const diff = parseFloat(odometerEnd) - parseFloat(odometerStart);
      if (diff > 0) setMileage(String(Math.round(diff * 10) / 10));
    }
  }, [odometerStart, odometerEnd]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError("Please select an individual"); return; }
    if (!tripDate) { setError("Trip date is required"); return; }

    setSaving(true);
    setError("");

    const body = {
      client_id: clientId,
      trip_date: tripDate,
      trip_purpose: tripPurpose,
      status,
      vehicle_id: vehicleId || null,
      vehicle_name: vehicleName || null,
      driver_name: driverName || null,
      pickup_time: pickupTime || null,
      dropoff_time: dropoffTime || null,
      pickup_address: pickupAddress || null,
      dropoff_address: dropoffAddress || null,
      odometer_start: odometerStart ? parseFloat(odometerStart) : null,
      odometer_end: odometerEnd ? parseFloat(odometerEnd) : null,
      mileage: mileage ? parseFloat(mileage) : null,
      escort_required: escortRequired,
      escort_staff: escortStaff || null,
      behavior_notes: behaviorNotes || null,
      notes: notes || null,
    };

    const res = await fetch("/api/transportation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed to save"); setSaving(false); return; }

    setSaved(true);
    setTimeout(() => router.push("/dashboard/transportation"), 1200);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/transportation" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Log Transportation Trip</h1>
          <p className="text-slate-500 text-sm mt-0.5">Record a vehicle trip for a DD program individual</p>
        </div>
      </div>

      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 font-semibold">
          ✓ Trip logged successfully! Redirecting...
        </div>
      )}

      {/* Individual & Date */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Trip Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Individual *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} className={inputClass} required>
              <option value="">— Select individual —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.last_name}, {c.first_name}{c.preferred_name ? ` "${c.preferred_name}"` : ""}{c.mrn ? ` · MRN: ${c.mrn}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Trip Date *</label>
            <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} className={inputClass} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Purpose</label>
            <select value={tripPurpose} onChange={e => setTripPurpose(e.target.value)} className={inputClass}>
              {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Vehicle & Driver */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Vehicle &amp; Driver</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Vehicle ID / Unit #</label>
            <input value={vehicleId} onChange={e => setVehicleId(e.target.value)} className={inputClass} placeholder="e.g. VAN-01" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Vehicle Name / Description</label>
            <input value={vehicleName} onChange={e => setVehicleName(e.target.value)} className={inputClass} placeholder="e.g. Blue Ford Transit" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Driver Name</label>
            <input value={driverName} onChange={e => setDriverName(e.target.value)} className={inputClass} placeholder="Driver's full name" />
          </div>
        </div>
      </div>

      {/* Times & Addresses */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Times &amp; Locations</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Pickup Time</label>
            <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Dropoff Time</label>
            <input type="time" value={dropoffTime} onChange={e => setDropoffTime(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Pickup Address</label>
            <input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} className={inputClass} placeholder="e.g. 123 Main St, Springfield" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Dropoff Address</label>
            <input value={dropoffAddress} onChange={e => setDropoffAddress(e.target.value)} className={inputClass} placeholder="e.g. Day Program Center, 456 Oak Ave" />
          </div>
        </div>
      </div>

      {/* Mileage */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Mileage</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Odometer Start</label>
            <input type="number" step="0.1" value={odometerStart} onChange={e => setOdometerStart(e.target.value)} className={inputClass} placeholder="e.g. 45230.5" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Odometer End</label>
            <input type="number" step="0.1" value={odometerEnd} onChange={e => setOdometerEnd(e.target.value)} className={inputClass} placeholder="e.g. 45248.2" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
              Total Miles {odometerStart && odometerEnd ? <span className="text-teal-500">(auto-calculated)</span> : ""}
            </label>
            <input type="number" step="0.1" value={mileage} onChange={e => setMileage(e.target.value)} className={inputClass} placeholder="e.g. 17.7" />
          </div>
        </div>
      </div>

      {/* Escort & Notes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Escort &amp; Notes</h2>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="escort"
            checked={escortRequired}
            onChange={e => setEscortRequired(e.target.checked)}
            className="w-4 h-4 accent-teal-500"
          />
          <label htmlFor="escort" className="text-sm font-medium text-slate-700">Escort / Staff support required</label>
        </div>
        {escortRequired && (
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Escort Staff Name</label>
            <input value={escortStaff} onChange={e => setEscortStaff(e.target.value)} className={inputClass} placeholder="Staff member accompanying individual" />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Behavior Notes</label>
          <textarea value={behaviorNotes} onChange={e => setBehaviorNotes(e.target.value)} rows={2} className={inputClass} placeholder="Any behavioral observations during transport..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">General Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} placeholder="Additional trip notes, incidents, delays..." />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link href="/dashboard/transportation"
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Log Trip"}
        </button>
      </div>
    </form>
  );
}

export default function LogTripPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <LogTripForm />
    </Suspense>
  );
}
