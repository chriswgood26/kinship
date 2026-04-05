"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ConsentForm {
  id: string;
  client_id: string;
  form_type: string;
  title: string;
  status: string;
  signed_at: string | null;
  signed_by: string | null;
  guardian_name: string | null;
  signature_method: string;
  witnessed_by: string | null;
  expiration_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    first_name: string;
    last_name: string;
    mrn: string | null;
    preferred_name: string | null;
    date_of_birth: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending_signature: "bg-amber-100 text-amber-700",
  signed: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-600",
  expired: "bg-slate-100 text-slate-500",
  revoked: "bg-rose-100 text-rose-600",
};

const FORM_TYPE_LABELS: Record<string, string> = {
  general_consent: "General Consent to Treatment",
  hipaa_notice: "HIPAA Notice of Privacy Practices",
  treatment_consent: "Specific Treatment Consent",
  medication_consent: "Medication Consent",
  telehealth_consent: "Telehealth Consent",
  photography_consent: "Photography / Media Consent",
  research_consent: "Research / Data Use Consent",
  financial_agreement: "Financial Agreement",
  other: "Other",
};

const FORM_TYPE_ICONS: Record<string, string> = {
  general_consent: "📋",
  hipaa_notice: "🔒",
  treatment_consent: "⚕️",
  medication_consent: "💊",
  telehealth_consent: "🎥",
  photography_consent: "📷",
  research_consent: "🔬",
  financial_agreement: "💰",
  other: "📄",
};

export default function ConsentFormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<ConsentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editData, setEditData] = useState({
    status: "",
    signed_at: "",
    signed_by: "",
    guardian_name: "",
    signature_method: "",
    witnessed_by: "",
    expiration_date: "",
    notes: "",
  });

  const loadForm = useCallback(async () => {
    const res = await fetch(`/api/consent-forms/${id}`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setForm(data.consent_form);
      const f = data.consent_form;
      setEditData({
        status: f.status,
        signed_at: f.signed_at ? f.signed_at.split("T")[0] : "",
        signed_by: f.signed_by || "patient",
        guardian_name: f.guardian_name || "",
        signature_method: f.signature_method || "written",
        witnessed_by: f.witnessed_by || "",
        expiration_date: f.expiration_date || "",
        notes: f.notes || "",
      });
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadForm(); }, [loadForm]);

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";
  const set = (k: string, v: string) => setEditData(d => ({ ...d, [k]: v }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/consent-forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editData),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Save failed"); setSaving(false); return; }
    setForm(data.consent_form);
    setEditing(false);
    setSaving(false);
    setSuccess("Saved successfully");
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleQuickStatus(newStatus: string) {
    setSaving(true);
    const patch: Record<string, string> = { status: newStatus };
    if (newStatus === "signed" && !form?.signed_at) {
      patch.signed_at = new Date().toISOString();
    }
    const res = await fetch(`/api/consent-forms/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (res.ok) {
      setForm(data.consent_form);
      setEditData(d => ({ ...d, status: newStatus, signed_at: data.consent_form.signed_at ? data.consent_form.signed_at.split("T")[0] : d.signed_at }));
      setSuccess(`Marked as ${newStatus.replace("_", " ")}`);
      setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this consent form? This cannot be undone.")) return;
    const res = await fetch(`/api/consent-forms/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) router.push("/dashboard/consent-forms");
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
            <div className="h-4 bg-slate-100 rounded mb-3 w-1/3" />
            <div className="h-3 bg-slate-50 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center p-12">
        <div className="text-4xl mb-3">❌</div>
        <p className="font-semibold text-slate-900">Consent form not found</p>
        <Link href="/dashboard/consent-forms" className="mt-4 text-teal-600 hover:underline text-sm inline-block">← Back to Consent Forms</Link>
      </div>
    );
  }

  const client = Array.isArray(form.client) ? (form.client as ConsentForm["client"][])[0] : form.client;
  const expDate = form.expiration_date ? new Date(form.expiration_date + "T12:00:00") : null;
  const today = new Date();
  const isExpiringSoon = expDate && form.status === "signed" && (expDate.getTime() - today.getTime()) / 86400000 <= 30 && expDate > today;
  const isExpired = expDate && expDate < today;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/consent-forms" className="text-slate-400 hover:text-slate-700 text-lg">←</Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{FORM_TYPE_ICONS[form.form_type] || "📄"}</span>
              <h1 className="text-xl font-bold text-slate-900">{form.title}</h1>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">{FORM_TYPE_LABELS[form.form_type] || form.form_type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize ${STATUS_COLORS[form.status] || ""}`}>
            {form.status?.replace("_", " ")}
          </span>
          <button onClick={() => setEditing(!editing)} className="border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm hover:bg-slate-50">
            {editing ? "Cancel" : "✏️ Edit"}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {isExpiringSoon && !isExpired && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="text-sm text-orange-800 font-medium">
            This consent expires on {expDate!.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} — renew before expiration
          </span>
        </div>
      )}
      {isExpired && form.status === "signed" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <span className="text-sm text-red-800 font-medium">
            This consent expired on {expDate!.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} — obtain a new signed consent
          </span>
        </div>
      )}
      {form.status === "pending_signature" && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">✍️</span>
            <span className="text-sm text-amber-800 font-medium">Awaiting patient signature</span>
          </div>
          <button
            onClick={() => handleQuickStatus("signed")}
            disabled={saving}
            className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-emerald-400 disabled:opacity-50"
          >
            Mark as Signed
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-sm text-emerald-800 font-medium">
          ✅ {success}
        </div>
      )}

      {/* Patient info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Patient</h2>
        {client ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-900">{client.last_name}, {client.first_name}</div>
              <div className="text-sm text-slate-500">MRN: {client.mrn || "—"}</div>
              {client.date_of_birth && (
                <div className="text-sm text-slate-500">
                  DOB: {new Date(client.date_of_birth + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
            <Link href={`/dashboard/clients/${form.client_id}`} className="text-teal-600 text-sm hover:underline">View Chart →</Link>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Client not found</p>
        )}
      </div>

      {/* Form details — View or Edit */}
      {editing ? (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Edit Consent Form</h2>

          <div>
            <label className={labelClass}>Status</label>
            <select value={editData.status} onChange={e => set("status", e.target.value)} className={inputClass}>
              <option value="pending_signature">Pending Signature</option>
              <option value="signed">Signed</option>
              <option value="declined">Declined</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Signature Method</label>
            <select value={editData.signature_method} onChange={e => set("signature_method", e.target.value)} className={inputClass}>
              <option value="written">Written signature (in person)</option>
              <option value="electronic">Electronic signature</option>
              <option value="verbal_documented">Verbal with documentation</option>
            </select>
          </div>

          {(editData.status === "signed") && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Signed By</label>
                <select value={editData.signed_by} onChange={e => set("signed_by", e.target.value)} className={inputClass}>
                  <option value="patient">Patient</option>
                  <option value="guardian">Guardian / Parent</option>
                  <option value="authorized_rep">Authorized Representative</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Date Signed</label>
                <input type="date" value={editData.signed_at} onChange={e => set("signed_at", e.target.value)} className={inputClass} />
              </div>
              {editData.signed_by === "guardian" && (
                <div className="col-span-2">
                  <label className={labelClass}>Guardian Name</label>
                  <input value={editData.guardian_name} onChange={e => set("guardian_name", e.target.value)} className={inputClass} />
                </div>
              )}
            </div>
          )}

          <div>
            <label className={labelClass}>Witnessed By</label>
            <input value={editData.witnessed_by} onChange={e => set("witnessed_by", e.target.value)} className={inputClass} placeholder="Staff member who witnessed" />
          </div>

          <div>
            <label className={labelClass}>Expiration Date</label>
            <input type="date" value={editData.expiration_date} onChange={e => set("expiration_date", e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={editData.notes} onChange={e => set("notes", e.target.value)} rows={3} className={inputClass + " resize-none"} />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="bg-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm hover:bg-slate-50">Cancel</button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-900">Consent Details</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <div className={labelClass}>Form Type</div>
              <div className="text-sm text-slate-900">{FORM_TYPE_ICONS[form.form_type]} {FORM_TYPE_LABELS[form.form_type] || form.form_type}</div>
            </div>
            <div>
              <div className={labelClass}>Status</div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[form.status] || ""}`}>
                {form.status?.replace("_", " ")}
              </span>
            </div>
            <div>
              <div className={labelClass}>Signature Method</div>
              <div className="text-sm text-slate-900 capitalize">{form.signature_method?.replace("_", " ") || "—"}</div>
            </div>
            <div>
              <div className={labelClass}>Date Signed</div>
              <div className="text-sm text-slate-900">
                {form.signed_at ? new Date(form.signed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
              </div>
            </div>
            <div>
              <div className={labelClass}>Signed By</div>
              <div className="text-sm text-slate-900 capitalize">
                {form.signed_by?.replace("_", " ") || "—"}
                {form.guardian_name && <span className="text-slate-500"> ({form.guardian_name})</span>}
              </div>
            </div>
            <div>
              <div className={labelClass}>Witnessed By</div>
              <div className="text-sm text-slate-900">{form.witnessed_by || "—"}</div>
            </div>
            <div>
              <div className={labelClass}>Expiration Date</div>
              <div className={`text-sm ${isExpiringSoon ? "text-orange-600 font-semibold" : isExpired ? "text-red-600 font-semibold" : "text-slate-900"}`}>
                {expDate ? expDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "No expiry"}
                {isExpiringSoon && " ⚠️"}
                {isExpired && form.status === "signed" && " (EXPIRED)"}
              </div>
            </div>
            <div>
              <div className={labelClass}>Created</div>
              <div className="text-sm text-slate-900">{new Date(form.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
            </div>
          </div>
          {form.notes && (
            <div>
              <div className={labelClass}>Notes</div>
              <div className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 whitespace-pre-wrap">{form.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* Quick status actions */}
      {!editing && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-3">Actions</h2>
          <div className="flex flex-wrap gap-2">
            {form.status !== "signed" && (
              <button onClick={() => handleQuickStatus("signed")} disabled={saving}
                className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-100 disabled:opacity-50">
                ✅ Mark as Signed
              </button>
            )}
            {form.status === "signed" && (
              <button onClick={() => handleQuickStatus("revoked")} disabled={saving}
                className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-rose-100 disabled:opacity-50">
                🚫 Revoke Consent
              </button>
            )}
            {form.status !== "pending_signature" && (
              <button onClick={() => handleQuickStatus("pending_signature")} disabled={saving}
                className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-100 disabled:opacity-50">
                ⏳ Mark Pending Signature
              </button>
            )}
            <Link
              href={`/dashboard/consent-forms/new?client_id=${form.client_id}`}
              className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-100"
            >
              🔁 New Consent for Same Patient
            </Link>
            <button onClick={handleDelete} disabled={saving}
              className="bg-slate-50 border border-slate-200 text-slate-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-100 disabled:opacity-50 ml-auto">
              🗑️ Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
