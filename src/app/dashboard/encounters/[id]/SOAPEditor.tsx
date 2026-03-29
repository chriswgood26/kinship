"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Note { id?: string; subjective?: string; objective?: string; assessment?: string; plan?: string; diagnosis_codes?: string[]; }

const SOAP_SECTIONS = [
  { key: "subjective", label: "S — Subjective", placeholder: "Client's reported symptoms, concerns, and history in their own words. What brings them in today?" },
  { key: "objective", label: "O — Objective", placeholder: "Observable, measurable findings. Mental status, behavioral observations, screening scores..." },
  { key: "assessment", label: "A — Assessment", placeholder: "Clinical impression, diagnosis, progress toward goals, clinical reasoning..." },
  { key: "plan", label: "P — Plan", placeholder: "Interventions used, next steps, homework, referrals, next appointment..." },
];

export default function SOAPEditor({ encounterId, existingNote, clientName }: {
  encounterId: string;
  existingNote: Note | null;
  clientName: string;
}) {
  const [note, setNote] = useState({
    subjective: existingNote?.subjective || "",
    objective: existingNote?.objective || "",
    assessment: existingNote?.assessment || "",
    plan: existingNote?.plan || "",
    diagnosis_codes: existingNote?.diagnosis_codes?.join(", ") || "",
  });
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("subjective");
  const router = useRouter();

  async function saveNote(sign = false) {
    if (sign) setSigning(true); else setSaving(true);
    const res = await fetch("/api/notes", {
      method: existingNote?.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...note,
        encounter_id: encounterId,
        note_id: existingNote?.id,
        diagnosis_codes: note.diagnosis_codes.split(",").map(s => s.trim()).filter(Boolean),
        is_signed: sign,
        signed_at: sign ? new Date().toISOString() : null,
      }),
    });
    if (res.ok) {
      if (sign) { router.refresh(); } else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    }
    if (sign) setSigning(false); else setSaving(false);
  }

  const inputClass = "w-full px-0 py-0 text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none leading-relaxed bg-transparent";

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {SOAP_SECTIONS.map(s => (
          <button key={s.key} type="button" onClick={() => setActiveSection(s.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${activeSection === s.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {s.key[0].toUpperCase()}
          </button>
        ))}
      </div>

      {/* Active section */}
      {SOAP_SECTIONS.map(section => activeSection === section.key && (
        <div key={section.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">{section.label}</div>
          </div>
          <div className="p-5">
            <textarea
              value={(note as Record<string, string>)[section.key]}
              onChange={e => setNote(n => ({ ...n, [section.key]: e.target.value }))}
              rows={8} className={inputClass} placeholder={section.placeholder}
            />
          </div>
        </div>
      ))}

      {/* Diagnosis codes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">ICD-10 Diagnosis Codes</label>
        <input value={note.diagnosis_codes} onChange={e => setNote(n => ({ ...n, diagnosis_codes: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="F32.1, F41.1 (comma separated)" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-5 py-3">
        <div className="text-sm text-slate-400">
          {saved && <span className="text-emerald-600 font-medium">✓ Saved</span>}
          {!saved && <span>Writing note for {clientName}</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => saveNote(false)} disabled={saving}
            className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button onClick={() => saveNote(true)} disabled={signing}
            className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
            {signing ? "Signing..." : "✓ Sign & Lock"}
          </button>
        </div>
      </div>
    </div>
  );
}
