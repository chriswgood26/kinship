"use client";

import { useState } from "react";
import Link from "next/link";

type RecipientEntry = { id: number; value: string; type: "email" | "phone" };

let idCounter = 3;

export default function ShareKinshipPage() {
  const [recipients, setRecipients] = useState<RecipientEntry[]>([
    { id: 1, value: "", type: "email" },
    { id: 2, value: "", type: "email" },
  ]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  function addRecipient(type: "email" | "phone") {
    setRecipients((prev) => [...prev, { id: idCounter++, value: "", type }]);
  }

  function removeRecipient(id: number) {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRecipient(id: number, value: string) {
    setRecipients((prev) => prev.map((r) => (r.id === id ? { ...r, value } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const emails = recipients.filter((r) => r.type === "email" && r.value.trim()).map((r) => r.value.trim());
    const phones = recipients.filter((r) => r.type === "phone" && r.value.trim()).map((r) => r.value.trim());

    if (emails.length === 0 && phones.length === 0) {
      setError("Please add at least one email address or phone number.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emails, phones, message }),
      });
      const data = await res.json();
      const sent = (data.results ?? []).filter((r: { success: boolean }) => r.success).length;
      const failed = (data.results ?? []).filter((r: { success: boolean }) => !r.success).length;
      setDone({ sent, failed });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setDone(null);
    setRecipients([
      { id: idCounter++, value: "", type: "email" },
      { id: idCounter++, value: "", type: "email" },
    ]);
    setMessage("");
    setError("");
  }

  if (done) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          {done.sent > 0 ? "Referrals sent!" : "Nothing was sent"}
        </h1>
        <p className="text-slate-500 mb-2 leading-relaxed">
          {done.sent > 0 && (
            <>
              <span className="font-semibold text-teal-600">{done.sent} referral{done.sent !== 1 ? "s" : ""}</span> sent successfully.
            </>
          )}
          {done.failed > 0 && (
            <> {done.failed} failed to send — please check the addresses and try again.</>
          )}
        </p>
        <p className="text-slate-400 text-sm mb-8">
          Thank you for spreading the word! Every referral helps us grow and keep improving Kinship for everyone.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50"
          >
            Send More
          </button>
          <Link
            href="/dashboard"
            className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header + tabs */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-700">
            ←
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Feedback</h1>
        </div>
        <div className="ml-8 flex gap-1 mt-3 border-b border-slate-200">
          <Link
            href="/dashboard/feedback"
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 rounded-t-lg"
          >
            Share Feedback
          </Link>
          <span className="px-4 py-2 text-sm font-semibold text-teal-600 border-b-2 border-teal-500 rounded-t-lg bg-teal-50">
            Share Kinship EHR
          </span>
        </div>
      </div>

      {/* Hero card */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white">
        <div className="text-3xl mb-2">💌</div>
        <h2 className="text-xl font-bold mb-1">Know someone who could use a better EHR?</h2>
        <p className="text-teal-100 text-sm leading-relaxed">
          Send a quick email or text to a colleague, peer, or friend at another agency. We&apos;ll reach out and show them what Kinship can do — no pressure, no spam.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Recipients */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <label className="block font-semibold text-slate-900 mb-1">Recipients</label>
          <p className="text-xs text-slate-400 mb-4">Add email addresses and/or phone numbers of people you'd like to refer.</p>

          <div className="space-y-3">
            {recipients.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="text-lg select-none">{r.type === "email" ? "✉️" : "📱"}</span>
                <input
                  type={r.type === "email" ? "email" : "tel"}
                  placeholder={r.type === "email" ? "colleague@agency.org" : "+1 (555) 000-0000"}
                  value={r.value}
                  onChange={(e) => updateRecipient(r.id, e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {recipients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRecipient(r.id)}
                    className="text-slate-300 hover:text-red-400 text-lg leading-none px-1"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => addRecipient("email")}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              + Add email
            </button>
            <button
              type="button"
              onClick={() => addRecipient("phone")}
              className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              + Add phone number
            </button>
          </div>
        </div>

        {/* Personal note */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <label className="block font-semibold text-slate-900 mb-1">
            Personal note <span className="text-slate-400 font-normal text-xs">(optional)</span>
          </label>
          <p className="text-xs text-slate-400 mb-3">
            Add a personal message — it will be included in the referral so they know it&apos;s coming from you.
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full border border-slate-200 rounded-2xl px-5 py-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none leading-relaxed"
            placeholder="e.g. Hey! We switched to Kinship earlier this year and it's been a game-changer for our team. Thought you might want to check it out."
          />
          <p className="text-xs text-slate-300 text-right mt-1">{message.length}/500</p>
        </div>

        {/* What we send preview */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">What your referral includes</p>
          <ul className="text-sm text-slate-600 space-y-2">
            <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">✓</span> A friendly introduction to Kinship EHR</li>
            <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">✓</span> Key features and benefits overview</li>
            <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">✓</span> Your name so they know who referred them</li>
            <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">✓</span> Link to kinshipehr.com to learn more or schedule a demo</li>
            {message.trim() && (
              <li className="flex items-start gap-2"><span className="text-teal-500 mt-0.5">✓</span> Your personal note</li>
            )}
          </ul>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3 justify-end pb-6">
          <Link
            href="/dashboard/feedback"
            className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={sending}
            className="bg-teal-500 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? "Sending..." : "Send Referrals →"}
          </button>
        </div>
      </form>
    </div>
  );
}
