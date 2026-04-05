"use client";

import { useState } from "react";
import Link from "next/link";

const RELATIONSHIP_OPTIONS = [
  { value: "self", label: "Myself (I am the patient)" },
  { value: "parent", label: "Parent" },
  { value: "guardian", label: "Legal Guardian" },
  { value: "caregiver", label: "Caregiver" },
  { value: "authorized_rep", label: "Authorized Representative" },
  { value: "other", label: "Other" },
];

export default function SelfRegistrationForm({ orgSlug, orgName }: { orgSlug: string; orgName: string }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    relationship: "self",
    patient_name: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.first_name || !form.last_name || !form.email) {
      setError("First name, last name, and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/portal/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_slug: orgSlug, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">✅</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Request Submitted!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Your portal access request has been sent to <strong>{orgName}</strong>. A staff member will review your
            request and send you an invitation email once approved.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800 text-left">
          <p className="font-semibold mb-1">What happens next?</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Staff will review your request (usually within 1–2 business days)</li>
            <li>You'll receive an email at <strong>{form.email}</strong> with a link to create your account</li>
            <li>Click the link to set up your password and access your portal</li>
          </ul>
        </div>
        <Link
          href="/portal/sign-in"
          className="inline-block text-teal-600 text-sm font-medium hover:text-teal-700"
        >
          Already have an account? Sign in →
        </Link>
      </div>
    );
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800 mb-6">
        Fill out this form to request access to <strong>{orgName}&apos;s</strong> secure patient portal. A staff member
        will review your request and send you an invitation email once approved.
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>First Name *</label>
            <input
              type="text"
              value={form.first_name}
              onChange={e => set("first_name", e.target.value)}
              className={inputClass}
              placeholder="Jane"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Last Name *</label>
            <input
              type="text"
              value={form.last_name}
              onChange={e => set("last_name", e.target.value)}
              className={inputClass}
              placeholder="Smith"
              required
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Email Address *</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set("email", e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            required
          />
          <p className="text-xs text-slate-400 mt-1">Your invitation will be sent to this address.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => set("phone", e.target.value)}
              className={inputClass}
              placeholder="(555) 555-5555"
            />
          </div>
          <div>
            <label className={labelClass}>Date of Birth</label>
            <input
              type="date"
              value={form.date_of_birth}
              onChange={e => set("date_of_birth", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Your Relationship to the Patient *</label>
          <select
            value={form.relationship}
            onChange={e => set("relationship", e.target.value)}
            className={inputClass}
          >
            {RELATIONSHIP_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {form.relationship !== "self" && (
          <div>
            <label className={labelClass}>Patient&apos;s Name</label>
            <input
              type="text"
              value={form.patient_name}
              onChange={e => set("patient_name", e.target.value)}
              className={inputClass}
              placeholder="Full name of the patient you're requesting access for"
            />
          </div>
        )}

        <div>
          <label className={labelClass}>Additional Information (optional)</label>
          <textarea
            value={form.message}
            onChange={e => set("message", e.target.value)}
            className={inputClass + " resize-none"}
            rows={3}
            placeholder="Any additional information that may help staff identify your record..."
          />
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500">
          🔒 Your information is kept confidential and protected under HIPAA. It will only be used to verify your
          identity and set up your portal account.
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-teal-500 text-white font-semibold py-3 rounded-xl hover:bg-teal-400 transition-colors disabled:opacity-50 text-sm"
        >
          {submitting ? "Submitting…" : "Request Portal Access"}
        </button>
      </form>
    </div>
  );
}
