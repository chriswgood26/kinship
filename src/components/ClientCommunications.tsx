"use client";

import { useState, useEffect } from "react";

interface Communication {
  id: string;
  channel: string;
  direction: string;
  to_address: string;
  subject: string | null;
  message: string;
  trigger: string;
  sent_by_name: string | null;
  delivery_status: string;
  delivery_error: string | null;
  sent_at: string;
}

interface Props {
  patientId: string;
  patientEmail?: string | null;
  patientPhone?: string | null;
}

const QUICK_TEMPLATES = [
  { label: "Appointment Reminder", subject: "Upcoming appointment reminder", message: "This is a reminder that you have an upcoming appointment with our office. Please call us if you need to reschedule." },
  { label: "Please Call Us", subject: "Please contact our office", message: "Please give our office a call at your earliest convenience. Thank you." },
  { label: "Documents Ready", subject: "Your documents are ready", message: "Your requested documents are ready for pickup or can be sent to you upon request. Please contact our office to arrange." },
  { label: "Authorization Update", subject: "Insurance authorization update", message: "We have an update regarding your insurance authorization. Please contact our office for details." },
];

export default function ClientCommunications({ patientId, patientEmail, patientPhone }: Props) {
  const [history, setHistory] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ success: boolean; error?: string } | null>(null);
  const [form, setForm] = useState({
    channel: patientEmail ? "email" : "sms",
    to_address: patientEmail || patientPhone || "",
    subject: "",
    message: "",
  });

  async function load() {
    const res = await fetch(`/api/communications?client_id=${patientId}`, { credentials: "include" });
    const d = await res.json();
    setHistory(d.communications || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [patientId]);

  function applyTemplate(t: typeof QUICK_TEMPLATES[0]) {
    setForm(f => ({ ...f, subject: t.subject, message: t.message }));
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!form.message.trim() || !form.to_address.trim()) return;
    setSending(true);
    const res = await fetch("/api/communications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...form, client_id: patientId }),
    });
    const data = await res.json();
    setSending(false);
    setSent({ success: data.delivered, error: data.error });
    if (data.delivered) {
      setShowCompose(false);
      setForm(f => ({ ...f, subject: "", message: "" }));
      load();
    }
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const isEmailConfigured = true; // Shows even if not configured — logs attempt
  const isSMSConfigured = !!patientPhone;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{history.length} message{history.length !== 1 ? "s" : ""} sent</span>
        <button onClick={() => { setShowCompose(!showCompose); setSent(null); }}
          className="text-xs text-teal-600 font-semibold hover:text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">
          ✉️ Send Message
        </button>
      </div>

      {/* Compose */}
      {showCompose && (
        <form onSubmit={handleSend} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900 text-sm">Send Message to Patient</h3>

          {/* Channel selector */}
          <div className="flex gap-2">
            {[
              { value: "email", label: "📧 Email", disabled: !patientEmail, address: patientEmail },
              { value: "sms", label: "💬 SMS", disabled: !patientPhone, address: patientPhone },
            ].map(ch => (
              <button key={ch.value} type="button"
                onClick={() => setForm(f => ({ ...f, channel: ch.value, to_address: ch.address || f.to_address }))}
                disabled={ch.disabled || false}
                className={`flex-1 flex flex-col items-center py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition-colors ${
                  form.channel === ch.value ? "border-teal-400 bg-white text-teal-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
                } disabled:opacity-40 disabled:cursor-not-allowed`}>
                {ch.label}
                <span className="font-normal text-slate-400 mt-0.5 truncate max-w-full">{ch.address || "Not on file"}</span>
              </button>
            ))}
          </div>

          {/* To address override */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
              {form.channel === "email" ? "Email Address" : "Phone Number"}
            </label>
            <input value={form.to_address} onChange={e => setForm(f => ({ ...f, to_address: e.target.value }))}
              className={inputClass} placeholder={form.channel === "email" ? "patient@email.com" : "+1 (555) 000-0000"} required />
          </div>

          {/* Quick templates */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Templates</div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TEMPLATES.map(t => (
                <button key={t.label} type="button" onClick={() => applyTemplate(t)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-colors">
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {form.channel === "email" && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Subject</label>
              <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className={inputClass} placeholder="Message subject..." />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Message *</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4}
              className={inputClass + " resize-none"} placeholder="Type your message..." required />
            {form.channel === "sms" && <p className="text-xs text-slate-400 mt-1">{form.message.length}/160 chars</p>}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
            ⚠️ This message will be sent to the patient and logged in their communication history. For emergencies, call 911.
          </div>

          {sent && !sent.success && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
              ⚠️ Message logged but delivery failed: {sent.error || "Check communication settings in Admin"}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCompose(false)}
              className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-medium hover:bg-white">Cancel</button>
            <button type="submit" disabled={sending || !form.message.trim() || !form.to_address.trim()}
              className="flex-1 bg-teal-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {sending ? "Sending..." : `Send ${form.channel === "email" ? "Email" : "SMS"}`}
            </button>
          </div>
        </form>
      )}

      {/* History */}
      {loading ? (
        <div className="text-xs text-slate-400 text-center py-3">Loading...</div>
      ) : history.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">No messages sent yet</p>
      ) : (
        <div className="space-y-2">
          {history.map(c => (
            <div key={c.id} className={`p-3 rounded-xl border ${c.delivery_status === "failed" ? "border-red-100 bg-red-50/30" : "border-slate-100 bg-white"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{c.channel === "email" ? "📧" : "💬"}</span>
                  <div>
                    {c.subject && <div className="text-xs font-semibold text-slate-900">{c.subject}</div>}
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">{c.message}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${c.delivery_status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                    {c.delivery_status}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">{new Date(c.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5">→ {c.to_address} · by {c.sent_by_name || "Staff"} · {c.trigger === "manual" ? "Manual" : c.trigger}</div>
              {c.delivery_error && <div className="text-[10px] text-red-500 mt-0.5">⚠️ {c.delivery_error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
