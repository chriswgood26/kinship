"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }
interface Provider { id: string; first_name: string; last_name: string; title?: string | null; role?: string | null; }

const CLIENT_APPT_TYPES = [
  "Individual Therapy", "Psychiatric Evaluation", "Psychiatric Follow-up",
  "Group Therapy", "Intake Assessment", "Crisis Intervention",
  "Case Management", "Medication Management",
  "Telehealth - Individual", "Telehealth - Group", "Telehealth - Psychiatric",
];

const PROVIDER_ONLY_TYPES = [
  "Block Time", "Staff Meeting", "Training", "Administrative", "Lunch Break",
  "Supervision", "Team Huddle", "Documentation Time", "Other",
];

const RECURRENCE_OPTIONS = [
  { value: "", label: "Does not repeat" },
  { value: "FREQ=DAILY;INTERVAL=1", label: "Every day" },
  { value: "FREQ=WEEKLY;INTERVAL=1", label: "Every week" },
  { value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", label: "Every weekday (Mon–Fri)" },
  { value: "FREQ=WEEKLY;BYDAY=MO,WE,FR", label: "Mon, Wed, Fri" },
  { value: "FREQ=WEEKLY;BYDAY=TU,TH", label: "Tue, Thu" },
  { value: "FREQ=MONTHLY;INTERVAL=1", label: "Every month" },
];

function NewAppointmentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isProviderOnly, setIsProviderOnly] = useState(false);

  const timeParam = params.get("time") || "09:00";
  const requestId = params.get("request_id") || "";
  const [form, setForm] = useState({
    client_id: params.get("client_id") || "", client_name: "",
    provider_id: "",
    appointment_date: params.get("date") || new Date().toISOString().split("T")[0],
    start_time: timeParam, duration_minutes: 60,
    appointment_type: "Individual Therapy", status: "confirmed", notes: "",
    is_telehealth: false, telehealth_platform: "jitsi" as "zoom" | "webex" | "jitsi",
    recurrence_rule: "", recurrence_end_date: "",
  });

  // Load providers
  useEffect(() => {
    fetch("/api/org-users", { credentials: "include" })
      .then(r => r.json())
      .then(d => setProviders(d.users || []));
  }, []);

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

  // Switch appointment type list when toggling provider-only
  useEffect(() => {
    if (isProviderOnly) {
      setForm(f => ({ ...f, appointment_type: "Block Time", client_id: "", client_name: "" }));
      setClientSearch("");
      setClients([]);
    } else {
      setForm(f => ({ ...f, appointment_type: "Individual Therapy" }));
    }
  }, [isProviderOnly]);

  const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }));

  const isTelehealthType = form.appointment_type.toLowerCase().includes("telehealth");
  const apptTypes = isProviderOnly ? PROVIDER_ONLY_TYPES : CLIENT_APPT_TYPES;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isProviderOnly && !form.client_id) { setError("Client required (or enable Provider-Only mode)"); return; }
    if (!form.appointment_date || !form.start_time) { setError("Date and time required"); return; }
    if (form.recurrence_rule && !form.recurrence_end_date) { setError("Recurrence end date required for recurring appointments"); return; }

    setSaving(true);
    const [h, m] = form.start_time.split(":").map(Number);
    const end = new Date(2000, 0, 1, h, m + Number(form.duration_minutes));
    const end_time = `${String(end.getHours()).padStart(2,"0")}:${String(end.getMinutes()).padStart(2,"0")}:00`;
    const isTelehealth = form.is_telehealth || isTelehealthType;

    const res = await fetch("/api/appointments", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        ...form,
        client_id: isProviderOnly ? null : form.client_id,
        is_provider_only: isProviderOnly,
        start_time: form.start_time + ":00",
        end_time,
        is_telehealth: isTelehealth,
        telehealth_platform: isTelehealth ? form.telehealth_platform : null,
        recurrence_rule: form.recurrence_rule || null,
        recurrence_end_date: form.recurrence_end_date || null,
      }),
    });
    const data = await res.json() as { error?: string; appointment?: { id: string }; recurring_instances_created?: number };
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }

    if (isTelehealth && data.appointment?.id) {
      try {
        await fetch("/api/telehealth/session", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ appointment_id: data.appointment.id, platform: form.telehealth_platform }),
        });
      } catch {}
    }

    // If coming from an appointment request, mark it as confirmed
    if (requestId && data.appointment?.id) {
      try {
        await fetch(`/api/appointment-requests/${requestId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({
            action: "confirm",
            appointment_date: form.appointment_date,
            start_time: form.start_time + ":00",
            end_time,
            provider_id: form.provider_id || null,
            notes: form.notes || null,
          }),
        });
      } catch {}
    }

    router.push(`/dashboard/scheduling?date=${form.appointment_date}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={requestId ? `/dashboard/scheduling?requests=1` : "/dashboard/scheduling"} className="text-slate-400 hover:text-slate-700">←</Link>
        <h1 className="text-2xl font-bold text-slate-900">New Appointment</h1>
      </div>

      {requestId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-lg">📋</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">Confirming appointment request</p>
            <p className="text-amber-700 text-xs mt-0.5">Adjust the details below and save to confirm. The patient will be notified by email.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">

        {/* Provider-only toggle */}
        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 rounded-xl">
          <div className="relative">
            <input type="checkbox" checked={isProviderOnly} onChange={e => setIsProviderOnly(e.target.checked)} className="sr-only peer" />
            <div className={`w-10 h-6 rounded-full transition-colors ${isProviderOnly ? "bg-teal-500" : "bg-slate-200"}`} />
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isProviderOnly ? "translate-x-4" : ""}`} />
          </div>
          <div>
            <span className="text-sm font-semibold text-slate-700">🗓 Provider-Only (No Client)</span>
            <p className="text-xs text-slate-400">Block time, staff meetings, administrative tasks</p>
          </div>
        </label>

        {/* Client selector — hidden for provider-only */}
        {!isProviderOnly && (
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
        )}

        {/* Provider selector */}
        <div>
          <label className={labelClass}>Provider{isProviderOnly ? " *" : " (optional)"}</label>
          <select value={form.provider_id} onChange={e => set("provider_id", e.target.value)} className={inputClass}>
            <option value="">— Unassigned —</option>
            {providers.map(p => (
              <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}{p.title ? ` (${p.title})` : ""}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Appointment Type</label>
          <select value={form.appointment_type} onChange={e => set("appointment_type", e.target.value)} className={inputClass}>
            {apptTypes.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Telehealth toggle + platform — only for client appts */}
        {!isProviderOnly && (
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" checked={form.is_telehealth || isTelehealthType} disabled={isTelehealthType}
                  onChange={e => set("is_telehealth", e.target.checked)}
                  className="sr-only peer" />
                <div className={`w-10 h-6 rounded-full transition-colors ${(form.is_telehealth || isTelehealthType) ? "bg-teal-500" : "bg-slate-200"}`} />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${(form.is_telehealth || isTelehealthType) ? "translate-x-4" : ""}`} />
              </div>
              <span className="text-sm font-semibold text-slate-700">🎥 Telehealth / Video Session</span>
            </label>

            {(form.is_telehealth || isTelehealthType) && (
              <div>
                <label className={labelClass}>Video Platform</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["jitsi", "zoom", "webex"] as const).map(p => (
                    <button key={p} type="button"
                      onClick={() => set("telehealth_platform", p)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-semibold transition-all ${form.telehealth_platform === p ? "border-teal-400 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      <span className="text-lg">{p === "zoom" ? "🎥" : p === "webex" ? "📡" : "🎬"}</span>
                      {p === "jitsi" ? "Kinship Video" : p === "zoom" ? "Zoom" : "Webex"}
                      {p === "jitsi" && <span className="font-normal text-teal-500 text-[10px]">Free</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div><label className={labelClass}>Date</label><input type="date" value={form.appointment_date} onChange={e => set("appointment_date", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Start Time</label><input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Duration</label>
            <select value={form.duration_minutes} onChange={e => set("duration_minutes", parseInt(e.target.value))} className={inputClass}>
              <option value={15}>15 min</option><option value={30}>30 min</option><option value={45}>45 min</option>
              <option value={60}>60 min</option><option value={90}>90 min</option><option value={120}>2 hours</option>
            </select>
          </div>
        </div>

        {/* Recurrence */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>🔁 Recurrence</label>
            <select value={form.recurrence_rule} onChange={e => set("recurrence_rule", e.target.value)} className={inputClass}>
              {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {form.recurrence_rule && (
            <div>
              <label className={labelClass}>Repeat Until *</label>
              <input type="date" value={form.recurrence_end_date} onChange={e => set("recurrence_end_date", e.target.value)}
                min={form.appointment_date} className={inputClass} />
              <p className="text-xs text-slate-400 mt-1">All recurring instances will be created immediately.</p>
            </div>
          )}
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
          {saving ? "Saving..." : form.recurrence_rule ? "Schedule (Recurring)" : "Schedule Appointment"}
        </button>
      </div>
    </form>
  );
}

export default function NewAppointmentPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewAppointmentForm /></Suspense>;
}
