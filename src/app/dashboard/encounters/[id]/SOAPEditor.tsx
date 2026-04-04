"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Note { id?: string; subjective?: string; objective?: string; assessment?: string; plan?: string; diagnosis_codes?: string[]; }

const SOAP_SECTIONS = [
  { key: "subjective", label: "S — Subjective", placeholder: "Client's reported symptoms, concerns, and history in their own words. What brings them in today?" },
  { key: "objective", label: "O — Objective", placeholder: "Observable, measurable findings. Mental status, behavioral observations, screening scores..." },
  { key: "assessment", label: "A — Assessment", placeholder: "Clinical impression, diagnosis, progress toward goals, clinical reasoning..." },
  { key: "plan", label: "P — Plan", placeholder: "Interventions used, next steps, homework, referrals, next appointment..." },
];

const AUTO_SAVE_DELAY = 3000; // 3 seconds after last keystroke
const LS_KEY = (encounterId: string) => `soap-draft-${encounterId}`;

type AutoSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export default function SOAPEditor({ encounterId, existingNote, clientName }: {
  encounterId: string;
  existingNote: Note | null;
  clientName: string;
}) {
  const [note, setNote] = useState(() => {
    // On mount, check localStorage for a more recent draft
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LS_KEY(encounterId));
        if (stored) {
          const parsed = JSON.parse(stored);
          // Only restore if there is no server note yet (new draft)
          if (!existingNote?.id) {
            return {
              subjective: parsed.subjective ?? "",
              objective: parsed.objective ?? "",
              assessment: parsed.assessment ?? "",
              plan: parsed.plan ?? "",
              diagnosis_codes: parsed.diagnosis_codes ?? "",
            };
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    return {
      subjective: existingNote?.subjective || "",
      objective: existingNote?.objective || "",
      assessment: existingNote?.assessment || "",
      plan: existingNote?.plan || "",
      diagnosis_codes: existingNote?.diagnosis_codes?.join(", ") || "",
    };
  });

  const [noteId, setNoteId] = useState<string | undefined>(existingNote?.id);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [signing, setSigning] = useState(false);
  const [activeSection, setActiveSection] = useState("subjective");
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const router = useRouter();

  // Check if we restored from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LS_KEY(encounterId));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!existingNote?.id) {
            setRestoredFromDraft(true);
          }
        }
      } catch { /* ignore */ }
    }
  }, [encounterId, existingNote]);

  // Persist to localStorage whenever note changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LS_KEY(encounterId), JSON.stringify({ ...note, savedAt: new Date().toISOString() }));
      } catch { /* ignore storage errors */ }
    }
  }, [note, encounterId]);

  const performAutoSave = useCallback(async (noteData: typeof note, currentNoteId: string | undefined) => {
    setAutoSaveStatus("saving");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...noteData,
          encounter_id: encounterId,
          note_id: currentNoteId,
          diagnosis_codes: noteData.diagnosis_codes.split(",").map((s: string) => s.trim()).filter(Boolean),
          is_signed: false,
          signed_at: null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.note?.id && !currentNoteId) {
          setNoteId(data.note.id);
        }
        setLastSavedAt(new Date());
        setAutoSaveStatus("saved");
      } else {
        setAutoSaveStatus("error");
      }
    } catch {
      setAutoSaveStatus("error");
    }
  }, [encounterId]);

  // Auto-save with debounce whenever note content changes
  useEffect(() => {
    // Skip auto-save on first render (initial mount)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setAutoSaveStatus("unsaved");

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave(note, noteId);
    }, AUTO_SAVE_DELAY);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  async function saveNote(sign = false) {
    if (sign) setSigning(true);
    // Cancel pending auto-save
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    setAutoSaveStatus("saving");

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...note,
          encounter_id: encounterId,
          note_id: noteId,
          diagnosis_codes: note.diagnosis_codes.split(",").map((s: string) => s.trim()).filter(Boolean),
          is_signed: sign,
          signed_at: sign ? new Date().toISOString() : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.note?.id && !noteId) setNoteId(data.note.id);
        if (sign) {
          // Clear localStorage draft on sign
          try { localStorage.removeItem(LS_KEY(encounterId)); } catch { /* ignore */ }
          router.refresh();
        } else {
          setLastSavedAt(new Date());
          setAutoSaveStatus("saved");
        }
      } else {
        setAutoSaveStatus("error");
      }
    } catch {
      setAutoSaveStatus("error");
    }
    if (sign) setSigning(false);
  }

  function formatLastSaved(date: Date) {
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) return "just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function dismissDraftNotice() {
    setRestoredFromDraft(false);
  }

  const inputClass = "w-full px-0 py-0 text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none leading-relaxed bg-transparent";

  return (
    <div className="space-y-4">
      {/* Draft restored notice */}
      {restoredFromDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-800">
            <span className="font-semibold">📋 Draft restored</span> — your unsaved changes from a previous session have been recovered.
          </div>
          <button onClick={dismissDraftNotice} className="text-amber-500 hover:text-amber-700 text-sm ml-4">✕</button>
        </div>
      )}

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
        <div className="text-sm">
          {autoSaveStatus === "idle" && <span className="text-slate-400">Writing note for {clientName}</span>}
          {autoSaveStatus === "unsaved" && <span className="text-amber-500 font-medium">● Unsaved changes</span>}
          {autoSaveStatus === "saving" && <span className="text-slate-400 animate-pulse">Saving draft...</span>}
          {autoSaveStatus === "saved" && lastSavedAt && (
            <span className="text-emerald-600 font-medium">✓ Draft saved {formatLastSaved(lastSavedAt)}</span>
          )}
          {autoSaveStatus === "error" && <span className="text-red-500 font-medium">⚠ Save failed — check connection</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => saveNote(false)} disabled={autoSaveStatus === "saving"}
            className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            {autoSaveStatus === "saving" ? "Saving..." : "Save Draft"}
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
