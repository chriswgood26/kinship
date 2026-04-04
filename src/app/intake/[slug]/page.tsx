"use client";

import { useState, useEffect } from "react";
import { use } from "react";

interface OrgInfo {
  id: string;
  name: string;
  org_type: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
}

export default function IntakePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    dob: "",
    phone: "",
    email: "",
    insurance: "",
    reason: "",
    notes: "",
    referred_by: "",
    referred_by_email: "",
    referred_by_phone: "",
    priority: "routine",
  });

  useEffect(() => {
    fetch(`/api/intake/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setNotFound(true);
        else setOrg(d.org);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.first_name || !form.last_name) {
      setError("First and last name are required");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch(`/api/intake/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to submit. Please try again.");
      setSaving(false);
      return;
    }

    setSubmitted(true);
  }

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-1.5";

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Intake Form Not Found</h1>
          <p className="text-slate-500 text-sm">
            This referral intake link is invalid or the organization is no longer active.
          </p>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-10 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Referral Submitted</h2>
          <p className="text-slate-500 text-sm mb-4">
            Thank you! Your referral to <strong>{org.name}</strong> has been received. Their team will review it and
            follow up with you shortly.
          </p>
          {org.phone && (
            <p className="text-slate-400 text-xs">
              For urgent needs, please call {org.phone} directly.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-1.5 mb-4">
            <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
            <span className="text-teal-700 text-xs font-semibold uppercase tracking-wide">Referral Intake</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{org.name}</h1>
          {(org.city || org.state) && (
            <p className="text-slate-500 text-sm mt-1">
              {[org.city, org.state].filter(Boolean).join(", ")}
            </p>
          )}
          <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
            Complete this form to refer a new patient or client to our team. We&apos;ll review and respond within 1–2 business days.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Applicant info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-900">Applicant Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name *</label>
                <input
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  className={inputClass}
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Last Name *</label>
                <input
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  className={inputClass}
                  placeholder="Last name"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => set("dob", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className={inputClass}
                  placeholder="(555) 000-0000"
                />
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  className={inputClass}
                  placeholder="patient@email.com"
                />
              </div>
              <div>
                <label className={labelClass}>Insurance / Payor</label>
                <input
                  value={form.insurance}
                  onChange={(e) => set("insurance", e.target.value)}
                  className={inputClass}
                  placeholder="Insurance name and member ID"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Reason for Referral *</label>
              <textarea
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                rows={3}
                className={inputClass + " resize-none"}
                placeholder="Describe the clinical reason for this referral..."
                required
              />
            </div>

            <div>
              <label className={labelClass}>Additional Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className={inputClass + " resize-none"}
                placeholder="Any other relevant information..."
              />
            </div>

            <div>
              <label className={labelClass}>Priority</label>
              <div className="flex gap-3">
                {(["routine", "urgent", "emergent"] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      value={p}
                      checked={form.priority === p}
                      onChange={() => set("priority", p)}
                      className="accent-teal-500"
                    />
                    <span
                      className={`text-sm font-medium capitalize ${
                        p === "emergent"
                          ? "text-red-600"
                          : p === "urgent"
                          ? "text-amber-600"
                          : "text-slate-700"
                      }`}
                    >
                      {p}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Referring provider */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-slate-900">Referring Provider</h2>
              <p className="text-xs text-slate-400 mt-0.5">Optional — who is sending this referral?</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Provider / Contact Name</label>
                <input
                  value={form.referred_by}
                  onChange={(e) => set("referred_by", e.target.value)}
                  className={inputClass}
                  placeholder="Dr. Jane Smith"
                />
              </div>
              <div>
                <label className={labelClass}>Provider Phone</label>
                <input
                  type="tel"
                  value={form.referred_by_phone}
                  onChange={(e) => set("referred_by_phone", e.target.value)}
                  className={inputClass}
                  placeholder="(555) 000-0000"
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Provider Email</label>
                <input
                  type="email"
                  value={form.referred_by_email}
                  onChange={(e) => set("referred_by_email", e.target.value)}
                  className={inputClass}
                  placeholder="provider@clinic.com"
                />
                <p className="text-xs text-slate-400 mt-1">
                  We&apos;ll send a confirmation to this address when the referral is reviewed.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-teal-500 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-teal-400 disabled:opacity-50 transition-colors"
          >
            {saving ? "Submitting..." : "Submit Referral"}
          </button>

          <p className="text-xs text-slate-400 text-center">
            This form is secure and HIPAA-compliant. Information is transmitted directly to {org.name}.
          </p>
        </form>
      </div>
    </div>
  );
}
