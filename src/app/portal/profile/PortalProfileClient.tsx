"use client";

import { useState } from "react";

interface Client {
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  pronouns: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  email: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  primary_language: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
}

interface Props {
  client: Client;
}

export default function PortalProfileClient({ client: initialClient }: Props) {
  const [client, setClient] = useState<Client>(initialClient);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setForm({
      preferred_name: client.preferred_name ?? "",
      pronouns: client.pronouns ?? "",
      phone_primary: client.phone_primary ?? "",
      phone_secondary: client.phone_secondary ?? "",
      email: client.email ?? "",
      address_line1: client.address_line1 ?? "",
      city: client.city ?? "",
      state: client.state ?? "",
      zip: client.zip ?? "",
      primary_language: client.primary_language ?? "",
      emergency_contact_name: client.emergency_contact_name ?? "",
      emergency_contact_phone: client.emergency_contact_phone ?? "",
      emergency_contact_relationship: client.emergency_contact_relationship ?? "",
    });
    setEditing(true);
    setSaved(false);
    setError(null);
  }

  function cancelEdit() {
    setEditing(false);
    setForm({});
    setError(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save");
      setClient(prev => ({ ...prev, ...json.client }));
      setEditing(false);
      setSaved(true);
      setForm({});
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  const dob = client.date_of_birth
    ? new Date(client.date_of_birth + "T00:00:00").toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {saved && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">
          ✅ Your information has been updated successfully.
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* Read-only identity section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Identity</h2>
          <span className="text-xs text-slate-400">Contact your care team to update</span>
        </div>
        <dl className="divide-y divide-slate-50">
          <Row label="Legal Name" value={`${client.first_name} ${client.last_name}`} />
          <Row label="Date of Birth" value={dob} />
          <Row label="Gender" value={client.gender} />
        </dl>
      </div>

      {/* Editable section */}
      {!editing ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">Contact & Preferences</h2>
            <button
              onClick={startEdit}
              className="text-teal-600 text-sm font-semibold hover:text-teal-500"
            >
              Edit
            </button>
          </div>
          <dl className="divide-y divide-slate-50">
            <Row label="Preferred Name" value={client.preferred_name} />
            <Row label="Pronouns" value={client.pronouns} />
            <Row label="Primary Phone" value={client.phone_primary} />
            <Row label="Secondary Phone" value={client.phone_secondary} />
            <Row label="Email" value={client.email} />
            <Row label="Primary Language" value={client.primary_language} />
            <Row label="Address" value={[client.address_line1, client.city, client.state, client.zip].filter(Boolean).join(", ") || null} />
          </dl>
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">Emergency Contact</h3>
            <dl className="space-y-0 divide-y divide-slate-50">
              <Row label="Name" value={client.emergency_contact_name} />
              <Row label="Phone" value={client.emergency_contact_phone} />
              <Row label="Relationship" value={client.emergency_contact_relationship} />
            </dl>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Edit Contact & Preferences</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Preferred Name" name="preferred_name" value={form.preferred_name ?? ""} onChange={handleChange} />
              <Field label="Pronouns" name="pronouns" value={form.pronouns ?? ""} onChange={handleChange} placeholder="e.g. she/her" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Primary Phone" name="phone_primary" value={form.phone_primary ?? ""} onChange={handleChange} type="tel" />
              <Field label="Secondary Phone" name="phone_secondary" value={form.phone_secondary ?? ""} onChange={handleChange} type="tel" />
            </div>
            <Field label="Email" name="email" value={form.email ?? ""} onChange={handleChange} type="email" />
            <Field label="Primary Language" name="primary_language" value={form.primary_language ?? ""} onChange={handleChange} />
            <Field label="Street Address" name="address_line1" value={form.address_line1 ?? ""} onChange={handleChange} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="City" name="city" value={form.city ?? ""} onChange={handleChange} />
              <Field label="State" name="state" value={form.state ?? ""} onChange={handleChange} placeholder="e.g. CA" maxLength={2} />
              <Field label="ZIP" name="zip" value={form.zip ?? ""} onChange={handleChange} />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Emergency Contact</p>
              <div className="space-y-4">
                <Field label="Name" name="emergency_contact_name" value={form.emergency_contact_name ?? ""} onChange={handleChange} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Phone" name="emergency_contact_phone" value={form.emergency_contact_phone ?? ""} onChange={handleChange} type="tel" />
                  <Field label="Relationship" name="emergency_contact_relationship" value={form.emergency_contact_relationship ?? ""} onChange={handleChange} placeholder="e.g. Spouse" />
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={cancelEdit}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
        💡 To update your legal name, date of birth, or gender, please contact your care team directly.
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="px-5 py-3 flex items-start gap-4">
      <dt className="text-xs font-medium text-slate-500 w-36 flex-shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm text-slate-800 flex-1">{value || <span className="text-slate-400 italic">—</span>}</dd>
    </div>
  );
}

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}

function Field({ label, name, value, onChange, type = "text", placeholder, maxLength }: FieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-900 placeholder-slate-400"
      />
    </div>
  );
}
