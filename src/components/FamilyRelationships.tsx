"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Relationship {
  id: string;
  client_id: string;
  related_client_id: string | null;
  related_name: string | null;
  related_phone: string | null;
  related_email: string | null;
  relationship_type: string;
  is_legal_guardian: boolean;
  is_emergency_contact: boolean;
  is_caregiver: boolean;
  is_portal_user: boolean;
  legal_authority: string | null;
  notes: string | null;
  _is_reciprocal?: boolean;
  related_patient?: { id: string; first_name: string; last_name: string; mrn: string | null } | null;
}

interface Patient { id: string; first_name: string; last_name: string; mrn: string | null; }

const RELATIONSHIP_TYPES = [
  "parent", "child", "sibling", "spouse", "partner", "grandparent", "grandchild",
  "aunt_uncle", "niece_nephew", "guardian", "foster_parent", "step_parent",
  "caregiver", "case_manager", "parole_officer", "other"
];

const REL_COLORS: Record<string, string> = {
  parent: "bg-blue-100 text-blue-700", child: "bg-teal-100 text-teal-700",
  sibling: "bg-purple-100 text-purple-700", spouse: "bg-pink-100 text-pink-700",
  partner: "bg-pink-100 text-pink-700", guardian: "bg-amber-100 text-amber-700",
  foster_parent: "bg-amber-100 text-amber-700", caregiver: "bg-emerald-100 text-emerald-700",
  parole_officer: "bg-red-100 text-red-600", case_manager: "bg-slate-100 text-slate-600",
};

const REL_ICONS: Record<string, string> = {
  parent: "👨‍👩‍👧", child: "👶", sibling: "👫", spouse: "💑", partner: "💑",
  guardian: "🛡️", foster_parent: "🏠", caregiver: "🤝", parole_officer: "⚖️",
  case_manager: "📋", other: "👤",
};

export default function FamilyRelationships({ patientId, patients }: { patientId: string; patients: Patient[]; }) {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    relationship_type: "parent",
    related_client_id: "",
    related_name: "",
    related_phone: "",
    related_email: "",
    is_legal_guardian: false,
    is_emergency_contact: false,
    is_caregiver: false,
    is_portal_user: false,
    legal_authority: "",
    notes: "",
    useExistingPatient: false,
  });

  useEffect(() => {
    fetch(`/api/relationships?client_id=${patientId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setRelationships(d.relationships || []); setLoading(false); });
  }, [patientId]);

  async function addRelationship() {
    setSaving(true);
    const res = await fetch("/api/relationships", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...form, client_id: patientId }),
    });
    const data = await res.json();
    if (res.ok) {
      setRelationships(prev => [data.relationship, ...prev]);
      setShowAdd(false);
      setForm({ relationship_type: "parent", related_client_id: "", related_name: "", related_phone: "", related_email: "", is_legal_guardian: false, is_emergency_contact: false, is_caregiver: false, is_portal_user: false, legal_authority: "", notes: "", useExistingPatient: false });
    }
    setSaving(false);
    router.refresh();
  }

  async function removeRelationship(id: string) {
    if (!confirm("Remove this relationship?")) return;
    await fetch(`/api/relationships/${id}`, { method: "DELETE", credentials: "include" });
    setRelationships(prev => prev.filter(r => r.id !== id));
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1";

  const BADGES = [
    { key: "is_legal_guardian", label: "Legal Guardian", color: "bg-amber-100 text-amber-700" },
    { key: "is_emergency_contact", label: "Emergency Contact", color: "bg-red-100 text-red-600" },
    { key: "is_caregiver", label: "Caregiver", color: "bg-emerald-100 text-emerald-700" },
    { key: "is_portal_user", label: "Portal Access", color: "bg-teal-100 text-teal-700" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900 text-sm">Family & Support Network</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="text-xs text-teal-600 hover:text-teal-700 font-medium border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50">
          {showAdd ? "Cancel" : "+ Add"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Relationship Type *</label>
              <select value={form.relationship_type} onChange={e => setForm(f => ({ ...f, relationship_type: e.target.value }))} className={inputClass}>
                {RELATIONSHIP_TYPES.map(r => <option key={r} value={r}>{r.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.useExistingPatient} onChange={e => setForm(f => ({ ...f, useExistingPatient: e.target.checked, related_client_id: "", related_name: "" }))} className="w-4 h-4 accent-teal-500" />
                <span className="text-sm text-slate-700">Existing patient in system</span>
              </label>
            </div>
          </div>

          {form.useExistingPatient ? (
            <div>
              <label className={labelClass}>Select Patient</label>
              <select value={form.related_client_id} onChange={e => setForm(f => ({ ...f, related_client_id: e.target.value }))} className={inputClass}>
                <option value="">Select patient...</option>
                {patients.filter(p => p.id !== patientId).map(p => (
                  <option key={p.id} value={p.id}>{p.last_name}, {p.first_name} — MRN: {p.mrn || "—"}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div><label className={labelClass}>Full Name *</label><input value={form.related_name} onChange={e => setForm(f => ({ ...f, related_name: e.target.value }))} className={inputClass} placeholder="Full name" /></div>
              <div><label className={labelClass}>Phone</label><input value={form.related_phone} onChange={e => setForm(f => ({ ...f, related_phone: e.target.value }))} className={inputClass} placeholder="Phone" /></div>
              <div><label className={labelClass}>Email</label><input type="email" value={form.related_email} onChange={e => setForm(f => ({ ...f, related_email: e.target.value }))} className={inputClass} placeholder="Email" /></div>
            </div>
          )}

          {/* Role checkboxes */}
          <div className="flex flex-wrap gap-2">
            {BADGES.map(b => (
              <label key={b.key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-semibold transition-colors ${(form as Record<string, boolean | string>)[b.key] ? b.color + " border-transparent" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                <input type="checkbox" checked={(form as Record<string, boolean | string>)[b.key] as boolean} onChange={e => setForm(f => ({ ...f, [b.key]: e.target.checked }))} className="sr-only" />
                {b.label}
              </label>
            ))}
          </div>

          {form.is_legal_guardian && (
            <div><label className={labelClass}>Legal Authority / Guardianship Type</label>
              <input value={form.legal_authority} onChange={e => setForm(f => ({ ...f, legal_authority: e.target.value }))} className={inputClass} placeholder="Full guardianship, limited guardianship, conservator..." />
            </div>
          )}

          <div><label className={labelClass}>Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputClass} placeholder="Additional context..." />
          </div>

          <button onClick={addRelationship} disabled={saving || (!form.related_name && !form.related_client_id)}
            className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
            {saving ? "Adding..." : "Add to Network"}
          </button>
        </div>
      )}

      {/* Relationships list */}
      {loading ? (
        <div className="p-5 text-center text-slate-400 text-sm">Loading...</div>
      ) : relationships.length === 0 ? (
        <div className="p-5 text-center text-slate-400 text-xs">No family or support network members added yet</div>
      ) : (
        <div className="divide-y divide-slate-50">
          {relationships.map(rel => {
            const rp = Array.isArray(rel.related_patient) ? rel.related_patient[0] : rel.related_patient;
            const name = rp ? `${rp.last_name}, ${rp.first_name}` : rel.related_name || "—";
            const icon = REL_ICONS[rel.relationship_type] || "👤";
            const color = REL_COLORS[rel.relationship_type] || "bg-slate-100 text-slate-600";
            return (
              <div key={rel.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {rp ? (
                      <Link href={`/dashboard/clients/${rp.id}`} className="font-semibold text-sm text-slate-900 hover:text-teal-600 no-underline">{name}</Link>
                    ) : (
                      <span className="font-semibold text-sm text-slate-900">{name}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${color}`}>{rel.relationship_type.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {rel.is_legal_guardian && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Legal Guardian</span>}
                    {rel.is_emergency_contact && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Emergency Contact</span>}
                    {rel.is_caregiver && <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Caregiver</span>}
                    {rel.is_portal_user && <span className="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">Portal Access</span>}
                  </div>
                  {rel.related_phone && <div className="text-xs text-slate-400 mt-0.5">{rel.related_phone}{rel.related_email ? ` · ${rel.related_email}` : ""}</div>}
                  {rel.legal_authority && <div className="text-xs text-slate-500 mt-0.5 italic">{rel.legal_authority}</div>}
                  {rel.notes && <div className="text-xs text-slate-400 mt-0.5">{rel.notes}</div>}
                </div>
                <button onClick={() => removeRelationship(rel.id)} className="text-slate-300 hover:text-red-400 text-sm flex-shrink-0">✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
