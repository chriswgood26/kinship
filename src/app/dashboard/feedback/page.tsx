"use client";

import { useState } from "react";
import Link from "next/link";

const FEEDBACK_TYPES = [
  { value: "bug", label: "🐛 Bug Report", desc: "Something isn't working correctly", color: "border-red-200 bg-red-50 text-red-800" },
  { value: "feature", label: "✨ Feature Request", desc: "I'd like to see something added or improved", color: "border-teal-200 bg-teal-50 text-teal-800" },
  { value: "other", label: "💬 Something Else", desc: "General feedback or questions", color: "border-slate-200 bg-slate-50 text-slate-700" },
];

export default function FeedbackPage() {
  const [type, setType] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    problem: "",
    impact: "",
    tried: "",
    ideal: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !form.problem) return;
    setSaving(true);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ type, ...form }),
    });
    setSaving(false);
    setDone(true);
  }

  const textareaClass = "w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none leading-relaxed";
  const labelClass = "block font-semibold text-slate-900 mb-1.5";
  const sublabelClass = "text-xs text-slate-400 mb-3 block";

  if (done) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="text-6xl mb-6">🙏</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Thank you for your feedback!</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          This is incredibly valuable. Your input directly shapes what we build next. We read every single submission.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setDone(false); setType(""); setForm({ problem: "", impact: "", tried: "", ideal: "" }); }}
            className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
            Submit Another
          </button>
          <Link href="/dashboard" className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-700">←</Link>
          <h1 className="text-2xl font-bold text-slate-900">Feedback</h1>
        </div>
        <div className="ml-8 flex gap-1 mt-3 border-b border-slate-200">
          <span className="px-4 py-2 text-sm font-semibold text-teal-600 border-b-2 border-teal-500 rounded-t-lg bg-teal-50">
            Share Feedback
          </span>
          <Link
            href="/dashboard/feedback/share"
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 rounded-t-lg"
          >
            Share Kinship EHR
          </Link>
        </div>
        <p className="text-slate-500 text-sm ml-8 mt-3">
          Help us build the EHR your agency actually needs. We read every submission.
        </p>
      </div>

      {/* Feedback type */}
      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-3">What kind of feedback is this? *</label>
        <div className="grid grid-cols-3 gap-3">
          {FEEDBACK_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={`flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-left transition-all ${
                type === t.value ? t.color + " border-current" : "border-slate-200 hover:border-slate-300 bg-white text-slate-900"
              }`}>
              <span className="font-semibold text-sm text-slate-900">{t.label}</span>
              <span className="text-xs text-slate-500">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {type && (
        <>
          {/* Q1 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <label className={labelClass}>1. What is the problem you are trying to solve?</label>
            <span className={sublabelClass}>Be specific — describe the exact situation where you hit this problem</span>
            <textarea
              value={form.problem}
              onChange={e => setForm(f => ({ ...f, problem: e.target.value }))}
              rows={5}
              className={textareaClass}
              placeholder="e.g. When I try to schedule a recurring weekly appointment for a client, there's no way to set up the recurrence — I have to manually create each appointment one at a time..."
              required
            />
          </div>

          {/* Q2 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <label className={labelClass}>2. How is this problem affecting your agency?</label>
            <span className={sublabelClass}>Be as descriptive as possible — time lost, staff frustration, compliance risk, patient impact</span>
            <textarea
              value={form.impact}
              onChange={e => setForm(f => ({ ...f, impact: e.target.value }))}
              rows={5}
              className={textareaClass}
              placeholder="e.g. Our front desk staff spends 30-45 minutes every Monday creating the same 15 appointments for the week. It's causing errors — we've had double-bookings twice this month. Staff are frustrated and clients are noticing the mistakes..."
            />
          </div>

          {/* Q3 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <label className={labelClass}>3. What have you tried so far to address the problem?</label>
            <span className={sublabelClass}>Workarounds, manual processes, other tools — anything you're doing today to cope</span>
            <textarea
              value={form.tried}
              onChange={e => setForm(f => ({ ...f, tried: e.target.value }))}
              rows={4}
              className={textareaClass}
              placeholder="e.g. We created a separate Google Calendar just for recurring appointments and cross-reference it with Kinship. It's a mess and staff sometimes forget to check both..."
            />
          </div>

          {/* Q4 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <label className={labelClass}>4. If you already had your ideal solution, what would that look like?</label>
            <span className={sublabelClass}>Dream big — describe exactly what you wish the software could do</span>
            <textarea
              value={form.ideal}
              onChange={e => setForm(f => ({ ...f, ideal: e.target.value }))}
              rows={5}
              className={textareaClass}
              placeholder="e.g. When I create an appointment, I'd check a 'Recurring' box, pick weekly/biweekly/monthly, set an end date, and it creates all the appointments automatically. If I need to cancel one week I can delete just that occurrence without affecting the series..."
            />
          </div>

          <div className="flex gap-3 justify-end pb-6">
            <Link href="/dashboard" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </Link>
            <button type="submit" disabled={saving || !form.problem}
              className="bg-teal-500 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Sending..." : "Submit Feedback →"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
