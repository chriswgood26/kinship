"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string | null;
  preferred_name?: string | null;
}

function NewPrivacyNoticeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  const today = new Date().toISOString().split("T")[0];
  const oneYearFromNow = new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0];

  const [form, setForm] = useState({
    client_id: params.get("client_id") || "",
    client_name: "",
    status: "signed",
    signed_at: today,
    signed_by: "patient",
    guardian_name: "",
    signature_method: "written",
    witnessed_by: "",
    expiration_date: oneYearFromNow,
    notes: "",
  });

  // Pre-fill client name if client_id provided
  useEffect(() => {
    const cid = params.get("client_id");
    if (cid) {
      fetch(`/api/clients/${cid}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (d.client) {
            setForm((f) => ({
              ...f,
              client_id: d.client.id,
              client_name: `${d.client.last_name}, ${d.client.first_name}`,
            }));
          }
        });
    }
  }, []);

  // Client search
  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients/search?q=${encodeURIComponent(clientSearch)}`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((d) => setClients(d.patients || []));
    } else {
      setClients([]);
    }
  }, [clientSearch]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) {
      setError("Please select a patient");
      return;
    }

    setSaving(true);
    setError("");

    const payload: Record<string, unknown> = {
      client_id: form.client_id,
      status: form.status,
      signature_method: form.signature_method,
      witnessed_by: form.witnessed_by || null,
      notes: form.notes || null,
    };

    if (form.status === "signed") {
      payload.signed_at = form.signed_at || today;
      payload.signed_by = form.signed_by;
      payload.expiration_date = form.expiration_date || oneYearFromNow;
      if (form.signed_by === "guardian") payload.guardian_name = form.guardian_name;
    }

    const res = await fetch("/api/privacy-notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save");
      setSaving(false);
      return;
    }
    router.push(`/dashboard/privacy-notices`);
  }

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass =
    "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/privacy-notices" className="text-slate-400 hover:text-slate-700 text-lg">
          ←
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Log Privacy Notice Acknowledgment</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Record that a patient received and acknowledged the HIPAA Notice of Privacy Practices
          </p>
        </div>
      </div>

      {/* HIPAA notice info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800">
        <div className="font-semibold mb-1">🔒 HIPAA Notice of Privacy Practices</div>
        <p className="text-xs text-blue-700">
          Document that the patient received the NPP at their first service delivery or when the notice was materially revised.
          Obtain written acknowledgment of receipt when possible (45 CFR §164.520).
        </p>
      </div>

      {/* Patient */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Patient</h2>
        <div className="relative">
          <label className={labelClass}>Patient *</label>
          {form.client_name ? (
            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-teal-800">{form.client_name}</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, client_id: "", client_name: "" }))}
                className="text-teal-500 text-sm hover:text-teal-700"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className={inputClass}
                placeholder="Search patient by name or MRN..."
              />
              {clients.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({
                          ...f,
                          client_id: c.id,
                          client_name: `${c.last_name}, ${c.first_name}`,
                        }));
                        setClientSearch("");
                        setClients([]);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0"
                    >
                      <div className="font-semibold text-sm text-slate-900">
                        {c.last_name}, {c.first_name}
                      </div>
                      <div className="text-xs text-slate-400">MRN: {c.mrn || "—"}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acknowledgment details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="font-semibold text-slate-900">Acknowledgment Details</h2>

        {/* Status */}
        <div>
          <label className={labelClass}>Outcome *</label>
          <div className="flex gap-3">
            {[
              {
                value: "signed",
                label: "✅ Acknowledged",
                desc: "Patient received and signed acknowledgment",
              },
              {
                value: "pending_signature",
                label: "⏳ Pending",
                desc: "Notice provided, awaiting written acknowledgment",
              },
              {
                value: "declined",
                label: "❌ Declined",
                desc: "Patient declined to sign — document in notes",
              },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => set("status", s.value)}
                className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors text-center ${
                  form.status === s.value
                    ? "bg-teal-50 border-teal-400"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="font-semibold text-sm text-slate-900">{s.label}</span>
                <span className="text-xs text-slate-400">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Signature details — only when signed */}
        {form.status === "signed" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date Acknowledged</label>
                <input
                  type="date"
                  value={form.signed_at}
                  onChange={(e) => set("signed_at", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Signed By</label>
                <select
                  value={form.signed_by}
                  onChange={(e) => set("signed_by", e.target.value)}
                  className={inputClass}
                >
                  <option value="patient">Patient</option>
                  <option value="guardian">Guardian / Parent</option>
                  <option value="authorized_rep">Authorized Representative</option>
                </select>
              </div>
            </div>
            {form.signed_by === "guardian" && (
              <div>
                <label className={labelClass}>Guardian Name</label>
                <input
                  value={form.guardian_name}
                  onChange={(e) => set("guardian_name", e.target.value)}
                  className={inputClass}
                  placeholder="Full name of guardian or parent"
                />
              </div>
            )}

            <div>
              <label className={labelClass}>Signature Method</label>
              <select
                value={form.signature_method}
                onChange={(e) => set("signature_method", e.target.value)}
                className={inputClass}
              >
                <option value="written">Written signature (in person)</option>
                <option value="electronic">Electronic signature</option>
                <option value="verbal_documented">Verbal with documentation</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Annual Renewal Date</label>
                <input
                  type="date"
                  value={form.expiration_date}
                  onChange={(e) => set("expiration_date", e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-slate-400 mt-1">
                  HIPAA requires re-offering the NPP annually. Default is 1 year.
                </p>
              </div>
              <div>
                <label className={labelClass}>Witnessed By (optional)</label>
                <input
                  value={form.witnessed_by}
                  onChange={(e) => set("witnessed_by", e.target.value)}
                  className={inputClass}
                  placeholder="Staff member who witnessed"
                />
              </div>
            </div>
          </>
        )}

        {/* Declined notes */}
        {form.status === "declined" && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-700">
            <strong>Documentation required:</strong> When a patient declines to acknowledge receipt of the NPP, you must
            document the attempt and the reason for the refusal in the notes below. This is a HIPAA requirement.
          </div>
        )}

        <div>
          <label className={labelClass}>Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            className={inputClass + " resize-none"}
            placeholder={
              form.status === "declined"
                ? "Document reason patient declined to sign acknowledgment..."
                : "Any additional context or notes about this acknowledgment..."
            }
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 justify-end pb-6">
        <Link
          href="/dashboard/privacy-notices"
          className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Acknowledgment"}
        </button>
      </div>
    </form>
  );
}

export default function NewPrivacyNoticePage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}>
      <NewPrivacyNoticeInner />
    </Suspense>
  );
}
