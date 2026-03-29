"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }

const APPT_TYPES = ["Individual Therapy", "Psychiatric Evaluation", "Psychiatric Follow-up", "Group Therapy", "Intake Assessment", "Crisis Intervention", "Case Management", "Medication Management", "Telehealth"];

function NewAppointmentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  const [form, setForm] = useState({
    client_id: params.get("client_id") || "", client_name: "",
    appointment_date: params.get("date") || new Date().toISOString().split("T")[0],
    start_time: "09:00", duration_minutes: 60,
    appointment_type: "Individual Therapy", status: "scheduled", notes: "",
  });

  useEffect(() => {
    const cid = params.get("client_id");
    if (cid && !form.client_name) {
      fetch(`/api/clients/${cid}`, { credentials: "include" })
        .then(r => r.json()).then(d => {
          if (d.client) setForm(f => ({ ...f, client_id: d.client.id, client_name: `${d.client.last_name}, ${d.client.first_name}` }));
        });
    }
  }, []);

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" })
        .then(r => r.json()).then(d => setClients(d.clients || []));
    } else setClients([]);
  }, [clientSearch]);

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id || !form.appointment_date || !form.start_time) { setError("Client, date, and time required"); return; }
    setSaving(true);
    const [h, m] = form.start_time.split(":").map(Number);
    const end = new Date(2000, 0, 1, h, m + Number(form.duration_minutes));
    const end_time = `${String(end.getHours()).padStart(2,"0")}:${String(end.getMinutes()).padStart(2,"0")}:00`;
    const res = await fetch("/api/appointments", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, start_time: form.start_time + ":00", end_time }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/scheduling?date=${form.appointment_date}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/scheduling" className="text-slate-400 hover:text-slate-700">←</Link>
        <h1 className="text-2xl font-bold text-slate-900">New Appointment</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        {/* Client */}
        <div className="relative">
          <label className={labelClass}>Client *</label>
          {form.client_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.client_name}</span>
              <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", client_name: "" }))} className="text-teal-500 text-sm">✕</button>
            </div>
          ) : (
            <div className="relative">
              <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} className={inputClass} placeholder="Search client..." />
              {clients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {clients.map(c => (
                    <button key={c.id} type="button"
                      onClick={() => { setForm(f => ({ ...f, client_id: c.id, client_name: `${c.last_name}, ${c.first_name}` })); setClientSearch(""); setClients([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                      <div className="font-semibold text-sm text-slate-900">{c.last_name}, {c.first_name}{c.preferred_name && <span className="text-slate-400 font-normal ml-1.5">"{c.preferred_name}"</span>}</div>
                      <div className="text-xs text-slate-400">MRN: {c.mrn || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>Appointment Type</label>
          <select value={form.appointment_type} onChange={e => set("appointment_type", e.target.value)} className={inputClass}>
            {APPT_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className={labelClass}>Date</label><input type="date" value={form.appointment_date} onChange={e => set("appointment_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Start Time</label><input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Duration</label>
            <select value={form.duration_minutes} onChange={e => set("duration_minutes", parseInt(e.target.value))} className={inputClass}>
              <option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option><option value={90}>90 min</option>
            </select>
          </div>
        </div>

        <div><label className={labelClass}>Status</label>
          <select value={form.status} onChange={e => set("status", e.target.value)} className={inputClass}>
            <option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option>
          </select>
        </div>

        <div><label className={labelClass}>Notes</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputClass + " resize-none"} placeholder="Appointment notes..." />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/scheduling" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Saving..." : "Schedule Appointment"}
        </button>
      </div>
    </form>
  );
}

export default function NewAppointmentPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewAppointmentForm /></Suspense>;
}
