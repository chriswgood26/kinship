"use client";

import { useState } from "react";

const APPT_TYPES = [
  "Individual Therapy",
  "Psychiatric Evaluation",
  "Psychiatric Follow-up",
  "Group Therapy",
  "Intake Assessment",
  "Medication Management",
  "Case Management",
  "Telehealth - Individual",
  "Other",
];

interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string | null;
  appointment_type: string | null;
  status: string;
  notes?: string | null;
}

interface AppointmentRequest {
  id: string;
  requested_date: string | null;
  requested_time: string | null;
  appointment_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  upcoming: Appointment[];
  past: Appointment[];
  myRequests: AppointmentRequest[];
  portalUserId: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  confirmed: { label: "Confirmed ✓", color: "bg-teal-100 text-teal-700" },
  scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-slate-100 text-slate-500" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-500" },
  no_show: { label: "Missed", color: "bg-orange-100 text-orange-600" },
};

const REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending review", color: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Confirmed ✓", color: "bg-teal-100 text-teal-700" },
  denied: { label: "Unable to confirm", color: "bg-slate-100 text-slate-500" },
};

function ApptCard({ appt, showNotes = false }: { appt: Appointment; showNotes?: boolean }) {
  const s = STATUS_LABEL[appt.status] || STATUS_LABEL.scheduled;
  return (
    <div className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50">
      <div className="w-14 h-14 bg-teal-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
        <div className="text-xs font-bold text-teal-600">
          {new Date(appt.appointment_date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
        </div>
        <div className="text-xl font-bold text-teal-800 leading-none">
          {new Date(appt.appointment_date + "T12:00:00").getDate()}
        </div>
      </div>
      <div className="flex-1">
        <div className="font-medium text-slate-900">{appt.appointment_type || "Appointment"}</div>
        <div className="text-sm text-slate-500 mt-0.5">
          {new Date(appt.appointment_date + "T12:00:00").toLocaleDateString("en-US", {
            weekday: "long", month: "long", day: "numeric",
          })}
          {appt.start_time &&
            ` · ${new Date(`2000-01-01T${appt.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
        </div>
        {showNotes && appt.notes && (
          <div className="text-xs text-slate-400 mt-1 bg-slate-50 rounded-lg px-3 py-1.5">{appt.notes}</div>
        )}
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${s.color}`}>{s.label}</span>
    </div>
  );
}

export default function PortalAppointmentsClient({ upcoming, past, myRequests, portalUserId }: Props) {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requests, setRequests] = useState<AppointmentRequest[]>(myRequests);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    appointment_type: "Individual Therapy",
    requested_date: "",
    requested_time: "",
    notes: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/appointment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appointment_type: form.appointment_type,
          requested_date: form.requested_date || null,
          requested_time: form.requested_time || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json() as { error?: string; request?: AppointmentRequest };
      if (!res.ok) { setError(data.error || "Failed to submit request"); return; }
      if (data.request) setRequests((prev) => [data.request!, ...prev]);
      setSubmitted(true);
      setShowRequestForm(false);
      setForm({ appointment_type: "Individual Therapy", requested_date: "", requested_time: "", notes: "" });
    } catch {
      setError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Appointments</h1>
        <button
          onClick={() => { setShowRequestForm(!showRequestForm); setSubmitted(false); }}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 transition-colors"
        >
          {showRequestForm ? "✕ Cancel" : "+ Request Appointment"}
        </button>
      </div>

      {submitted && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-4">
          <p className="font-semibold text-teal-800 text-sm">✅ Request submitted!</p>
          <p className="text-teal-700 text-xs mt-0.5">Your care team will review and confirm your appointment soon.</p>
        </div>
      )}

      {/* Request form */}
      {showRequestForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-teal-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Request an Appointment</h2>
          <p className="text-sm text-slate-500 -mt-2">
            Submit your preferred time and our team will confirm. You&apos;ll receive an email once reviewed.
          </p>

          <div>
            <label className={labelClass}>Appointment Type</label>
            <select value={form.appointment_type} onChange={(e) => set("appointment_type", e.target.value)} className={inputClass}>
              {APPT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Preferred Date (optional)</label>
              <input
                type="date"
                value={form.requested_date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => set("requested_date", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Preferred Time (optional)</label>
              <input
                type="time"
                value={form.requested_time}
                onChange={(e) => set("requested_time", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes / Additional Info</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className={inputClass + " resize-none"}
              placeholder="Any specific needs, concerns, or context for your care team..."
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      )}

      {/* My requests */}
      {requests.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">My Requests</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {requests.map((r) => {
              const rs = REQUEST_STATUS[r.status] || REQUEST_STATUS.pending;
              return (
                <div key={r.id} className="flex items-start gap-4 px-5 py-4">
                  <div className="w-14 h-14 bg-amber-50 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    {r.requested_date ? (
                      <>
                        <div className="text-xs font-bold text-amber-600">
                          {new Date(r.requested_date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                        </div>
                        <div className="text-xl font-bold text-amber-800 leading-none">
                          {new Date(r.requested_date + "T12:00:00").getDate()}
                        </div>
                      </>
                    ) : (
                      <div className="text-xl">📋</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{r.appointment_type || "Appointment"}</div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      {r.requested_date
                        ? new Date(r.requested_date + "T12:00:00").toLocaleDateString("en-US", {
                            weekday: "long", month: "long", day: "numeric",
                          })
                        : "Flexible date"}
                      {r.requested_time &&
                        ` · ${new Date(`2000-01-01T${r.requested_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                    </div>
                    {r.notes && (
                      <div className="text-xs text-slate-400 mt-1">{r.notes}</div>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${rs.color}`}>{rs.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming appointments */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Upcoming</h2>
        </div>
        {!upcoming?.length ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="text-3xl mb-2">📅</div>
            <p>No upcoming appointments scheduled</p>
            <p className="text-xs mt-1">Use the button above to request an appointment</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {upcoming.map((appt) => <ApptCard key={appt.id} appt={appt} showNotes />)}
          </div>
        )}
      </div>

      {past && past.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Past Appointments</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {past.map((appt) => <ApptCard key={appt.id} appt={appt} />)}
          </div>
        </div>
      )}

      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs text-slate-500 text-center">
        To reschedule or cancel an appointment, please contact your care team directly.
      </div>
    </div>
  );
}
