"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  referralId: string;
  currentStatus: string;
  referralType: string;
  referredByEmail: string | null;
  referredToEmail: string | null;
  applicantEmail: string | null;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "text-amber-600" },
  { value: "accepted", label: "Accepted", color: "text-teal-600" },
  { value: "completed", label: "Completed", color: "text-emerald-600" },
  { value: "declined", label: "Declined", color: "text-red-600" },
  { value: "cancelled", label: "Cancelled", color: "text-slate-500" },
];

export default function ReferralStatusUpdater({
  referralId,
  currentStatus,
  referralType,
  referredByEmail,
  referredToEmail,
  applicantEmail,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [statusNote, setStatusNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const willEmailReferringProvider = referralType === "incoming" && referredByEmail;
  const willEmailApplicant =
    referralType === "incoming" && applicantEmail && (status === "accepted" || status === "declined");
  const willEmailReceivingProvider = referralType === "outgoing" && referredToEmail;
  const willSendEmails = willEmailReferringProvider || willEmailApplicant || willEmailReceivingProvider;

  async function handleUpdate() {
    if (status === currentStatus && !statusNote) return;
    setSaving(true);
    setError("");

    const res = await fetch(`/api/referrals/${referralId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status, status_note: statusNote || undefined }),
    });

    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed to update status");
      return;
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.refresh();
    }, 1500);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">Update Status</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Changing the status will trigger email notifications to relevant parties.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatus(opt.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              status === opt.value
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
          Note (optional — included in notification emails)
        </label>
        <textarea
          value={statusNote}
          onChange={(e) => setStatusNote(e.target.value)}
          rows={2}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          placeholder="Add a note for the referring provider or applicant..."
        />
      </div>

      {/* Email preview */}
      {willSendEmails && status !== currentStatus && (
        <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-sm text-teal-800 space-y-1">
          <div className="font-semibold">📧 Emails will be sent:</div>
          {willEmailReferringProvider && (
            <div className="text-xs">• Referring provider: <span className="font-medium">{referredByEmail}</span></div>
          )}
          {willEmailApplicant && (
            <div className="text-xs">• Applicant: <span className="font-medium">{applicantEmail}</span></div>
          )}
          {willEmailReceivingProvider && (
            <div className="text-xs">• Receiving provider: <span className="font-medium">{referredToEmail}</span></div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          Current: <span className="font-semibold text-slate-600 capitalize">{currentStatus}</span>
        </div>
        <button
          onClick={handleUpdate}
          disabled={saving || saved || (status === currentStatus && !statusNote)}
          className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
        >
          {saved ? "✓ Updated!" : saving ? "Updating..." : "Update Status"}
        </button>
      </div>
    </div>
  );
}
