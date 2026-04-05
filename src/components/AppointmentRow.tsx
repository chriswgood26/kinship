"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "drcloud_name_display";
import Link from "next/link";
import CheckInButton from "@/components/CheckInButton";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

interface Appointment {
  id: string;
  client_id: string;
  appointment_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  appointment_type: string | null;
  status: string;
  notes: string | null;
  is_group?: boolean | null;
  group_name?: string | null;
  patient?: { first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; pronouns?: string | null; insurance_copay?: number | null } | null;
  is_provider_only?: boolean | null;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-teal-100 text-teal-700 border-teal-200",
  arrived: "bg-emerald-100 text-emerald-700 border-emerald-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
  no_show: "bg-orange-100 text-orange-600 border-orange-200",
};

const STATUSES = ["scheduled", "confirmed", "arrived", "in_progress", "completed", "cancelled", "no_show"];

export default function AppointmentRow({ appt }: { appt: Appointment }) {
  const [editing, setEditing] = useState(false);
  const [showPreferred, setShowPreferred] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "preferred") setShowPreferred(true);
    // Listen for storage changes from other components
    const handler = () => setShowPreferred(localStorage.getItem(STORAGE_KEY) === "preferred");
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);
  const [saving, setSaving] = useState(false);
  const [showNoShowPrompt, setShowNoShowPrompt] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [form, setForm] = useState({
    status: appt.status || "scheduled",
    appointment_type: appt.appointment_type || "",
    start_time: appt.start_time?.slice(0, 5) || "",
    duration_minutes: appt.duration_minutes || 60,
    notes: appt.notes || "",
  });
  const router = useRouter();
  const patient = Array.isArray(appt.patient) ? appt.patient[0] : appt.patient;
  const copayAmount = patient?.insurance_copay ?? null;

  async function sendNoShowMessage() {
    if (!appt.client_id) { setShowNoShowPrompt(false); return; }
    setSendingMsg(true);
    await fetch("/api/communications", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        client_id: appt.client_id,
        channel: "sms",
        to_address: "on_file",
        message: `We missed you at your ${appt.appointment_type || "appointment"} today. Please call us to reschedule. We care about your wellbeing.`,
        trigger: "no_show_followup",
      }),
    });
    setSendingMsg(false);
    setShowNoShowPrompt(false);
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/appointments/${appt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setEditing(false);
    if (form.status === "no_show" && appt.client_id) {
      setShowNoShowPrompt(true);
    }
    router.refresh();
  }

  const inputClass = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <>
      <div className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
        <div className="w-16 flex-shrink-0">
          <div className="text-sm font-semibold text-slate-900">
            {appt.start_time ? new Date(`2000-01-01T${appt.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
          </div>
          <div className="text-xs text-slate-400">{appt.duration_minutes || 60}min</div>
        </div>
        <div className="flex-1 min-w-0">
          {appt.is_group ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-900">👥 {appt.group_name || appt.appointment_type}</span>
            </div>
          ) : (
            <Link href={`/dashboard/clients/${appt.client_id}`} className="font-semibold text-slate-900 text-sm hover:text-teal-600 no-underline">
              {patient ? (showPreferred && patient.preferred_name ? patient.preferred_name : `${patient.last_name}, ${patient.first_name}`) : "Unknown Patient"}
            </Link>
          )}
          <div className="text-xs text-slate-400">
            {appt.is_group ? "Group session" : showPreferred && patient?.preferred_name ? `${patient?.last_name}, ${patient?.first_name}` : patient?.mrn || "—"}
          </div>
        </div>
        <div className="w-32 text-sm text-slate-600 capitalize">{appt.appointment_type || "—"}</div>
        <div className="w-28">
          <button
            onClick={() => setEditing(true)}
            className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border cursor-pointer hover:opacity-80 transition-opacity ${STATUS_COLORS[appt.status || "scheduled"]}`}>
            {form.status || "scheduled"}
          </button>
        </div>
        <div className="w-16 flex gap-2">
          <Link href={`/dashboard/encounters/new?patient_id=${appt.client_id}`}
            className="text-teal-600 text-xs font-medium hover:text-teal-700">
            Note
          </Link>
          <button onClick={() => setEditing(true)} className="text-slate-400 text-xs font-medium hover:text-slate-600">Edit</button>
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-lg">Edit Appointment</h2>
              <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="bg-teal-50 rounded-xl px-4 py-3">
              <div className="font-semibold text-teal-900 text-sm">{patient ? (showPreferred && patient.preferred_name ? patient.preferred_name : `${patient.last_name}, ${patient.first_name}`) : "—"}</div>
              <div className="text-teal-600 text-xs">{appt.appointment_date}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Appointment Type</label>
                <select value={form.appointment_type} onChange={e => setForm(f => ({ ...f, appointment_type: e.target.value }))} className={inputClass}>
                  <option>Individual Therapy</option>
                  <option>Group Therapy</option>
                  <option>Psychiatric Evaluation</option>
                  <option>Psychiatric Follow-up</option>
                  <option>Crisis Intervention</option>
                  <option>Intake Assessment</option>
                  <option>Case Management</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Start Time</label>
                  <input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Duration (min)</label>
                  <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) }))} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className={inputClass + " resize-none"} placeholder="Appointment notes..." />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setEditing(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
