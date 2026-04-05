"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Note {
  id?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  diagnosis_codes?: string[];
  is_late_note?: boolean;
  late_note_reason?: string;
}

// For group notes, the SOAP sections have group-specific labels
const GROUP_SOAP_SECTIONS = [
  {
    key: "subjective",
    label: "S — Session Content",
    placeholder: "Group topic, theme, structured activities, psychoeducation content, check-in responses...",
  },
  {
    key: "objective",
    label: "O — Group Observations",
    placeholder: "Group dynamics, cohesion, participation levels, significant interactions, affect, engagement...",
  },
  {
    key: "assessment",
    label: "A — Assessment",
    placeholder: "Group progress toward therapeutic goals, individual highlights, risk factors identified, group functioning...",
  },
  {
    key: "plan",
    label: "P — Plan",
    placeholder: "Next session topic, homework assigned, referrals, follow-up items, schedule changes...",
  },
];

const AUTO_SAVE_DELAY = 3000;
const LS_KEY = (encounterId: string) => `group-soap-draft-${encounterId}`;

type AutoSaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

function isLateNote(encounterDate: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return encounterDate < todayStr;
}

const LATE_NOTE_REASONS = [
  "Documentation backlog",
  "Clinician illness or absence",
  "Technical system issues",
  "Emergency or crisis situation",
  "Awaiting additional clinical information",
  "Supervisory review required",
  "Other (describe below)",
];

export default function GroupNoteEditor({
  encounterId,
  existingNote,
  groupName,
  encounterDate,
}: {
  encounterId: string;
  existingNote: Note | null;
  groupName: string | null;
  encounterDate: string;
}) {
  const [note, setNote] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LS_KEY(encounterId));
        if (stored) {
          const parsed = JSON.parse(stored);
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
      } catch { /* ignore */ }
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
  const lateNote = isLateNote(encounterDate);
  const [lateNoteReason, setLateNoteReason] = useState(existingNote?.late_note_reason || "");
  const [lateNoteReasonError, setLateNoteReasonError] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(LS_KEY(encounterId));
        if (stored && !existingNote?.id) setRestoredFromDraft(true);
      } catch { /* ignore */ }
    }
  }, [encounterId, existingNote]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LS_KEY(encounterId), JSON.stringify({ ...note, savedAt: new Date().toISOString() }));
      } catch { /* ignore */ }
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
          note_type: "group_note",
          diagnosis_codes: noteData.diagnosis_codes.split(",").map((s: string) => s.trim()).filter(Boolean),
          is_signed: false,
          signed_at: null,
          is_late_note: lateNote,
          late_note_reason: lateNote ? lateNoteReason.trim() : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.note?.id && !currentNoteId) setNoteId(data.note.id);
        setLastSavedAt(new Date());
        setAutoSaveStatus("saved");
      } else {
        setAutoSaveStatus("error");
      }
    } catch {
      setAutoSaveStatus("error");
    }
  }, [encounterId, lateNote, lateNoteReason]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setAutoSaveStatus("unsaved");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave(note, noteId);
    }, AUTO_SAVE_DELAY);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note]);

  async function saveNote(sign = false) {
    if (sign && lateNote && !lateNoteReason.trim()) {
      setLateNoteReasonError(true);
      return;
    }
    setLateNoteReasonError(false);
    if (sign) setSigning(true);
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
          note_type: "group_note",
          diagnosis_codes: note.diagnosis_codes.split(",").map((s: string) => s.trim()).filter(Boolean),
          is_signed: sign,
          signed_at: sign ? new Date().toISOString() : null,
          is_late_note: lateNote,
          late_note_reason: lateNote ? lateNoteReason.trim() : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.note?.id && !noteId) setNoteId(data.note.id);
        if (sign) {
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
    const diffSeconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diffSeconds < 60) return "just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const inputClass = "w-full px-0 py-0 text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none leading-relaxed bg-transparent";

  return (
    <div className="space-y-4">
      {/* Draft restored notice */}
      {restoredFromDraft && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-800">
            <span className="font-semibold">📋 Draft restored</span> — unsaved changes from a previous session recovered.
          </div>
          <button onClick={() => setRestoredFromDraft(false)} className="text-amber-500 hover:text-amber-700 text-sm ml-4">✕</button>
        </div>
      )}

      {/* Late note warning */}
      {lateNote && (
        <div className={`border rounded-xl px-4 py-4 ${lateNoteReasonError ? "border-red-300 bg-red-50" : "border-orange-200 bg-orange-50"}`}>
          <div className="flex items-start gap-3">
            <span className="text-orange-500 text-lg mt-0.5">⏰</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-orange-800 mb-1">
                Late Note — Encounter date was {new Date(encounterDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-xs text-orange-700 mb-3">A reason is required before signing.</p>
              <label className="block text-xs font-semibold text-orange-800 uppercase tracking-wide mb-1.5">
                Reason for Late Documentation <span className="text-red-500">*</span>
              </label>
              <select
                value={LATE_NOTE_REASONS.includes(lateNoteReason) ? lateNoteReason : (lateNoteReason.startsWith("Other:") ? "Other (describe below)" : "")}
                onChange={e => {
                  setLateNoteReason(e.target.value === "Other (describe below)" ? "Other: " : e.target.value);
                  setLateNoteReasonError(false);
                }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 mb-2 ${lateNoteReasonError ? "border-red-400 bg-red-50" : "border-orange-200 bg-white"}`}
              >
                <option value="">— Select a reason —</option>
                {LATE_NOTE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {lateNoteReason.startsWith("Other:") && (
                <input
                  type="text"
                  value={lateNoteReason.slice(6).trimStart()}
                  onChange={e => { setLateNoteReason(`Other: ${e.target.value}`); setLateNoteReasonError(false); }}
                  placeholder="Describe the reason..."
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${lateNoteReasonError ? "border-red-400 bg-red-50" : "border-orange-200 bg-white"}`}
                />
              )}
              {lateNoteReasonError && <p className="text-xs text-red-600 mt-1 font-medium">⚠ A reason is required before signing.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Group note header banner */}
      <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-purple-500 text-lg">👥</span>
        <div>
          <div className="text-sm font-semibold text-purple-900">Group Session Note</div>
          {groupName && <div className="text-xs text-purple-600">{groupName}</div>}
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {GROUP_SOAP_SECTIONS.map(s => (
          <button key={s.key} type="button" onClick={() => setActiveSection(s.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${activeSection === s.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {s.key === "subjective" ? "S" : s.key === "objective" ? "O" : s.key === "assessment" ? "A" : "P"}
          </button>
        ))}
      </div>

      {/* Active section */}
      {GROUP_SOAP_SECTIONS.map(section => activeSection === section.key && (
        <div key={section.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wide">{section.label}</div>
          </div>
          <div className="p-5">
            <textarea
              value={(note as Record<string, string>)[section.key]}
              onChange={e => setNote(n => ({ ...n, [section.key]: e.target.value }))}
              rows={8}
              className={inputClass}
              placeholder={section.placeholder}
            />
          </div>
        </div>
      ))}

      {/* Diagnosis codes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">ICD-10 Diagnosis Codes</label>
        <input
          value={note.diagnosis_codes}
          onChange={e => setNote(n => ({ ...n, diagnosis_codes: e.target.value }))}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          placeholder="F41.1, Z59.5 (comma separated)"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 px-5 py-3">
        <div className="text-sm">
          {autoSaveStatus === "idle" && <span className="text-slate-400">Writing group session note{groupName ? ` — ${groupName}` : ""}</span>}
          {autoSaveStatus === "unsaved" && <span className="text-amber-500 font-medium">● Unsaved changes</span>}
          {autoSaveStatus === "saving" && <span className="text-slate-400 animate-pulse">Saving draft...</span>}
          {autoSaveStatus === "saved" && lastSavedAt && <span className="text-emerald-600 font-medium">✓ Draft saved {formatLastSaved(lastSavedAt)}</span>}
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
