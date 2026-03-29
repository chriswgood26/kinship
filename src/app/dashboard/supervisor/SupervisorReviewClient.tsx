"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Note {
  id: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  diagnosis_codes: string[] | null;
  signed_at: string | null;
  supervisor_signed: boolean;
  supervisor_signed_at: string | null;
  supervisor_name: string | null;
  encounter?: {
    encounter_date: string;
    encounter_type: string | null;
    patient?: { first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null } | null;
  } | null;
}

interface Props {
  pendingNotes: Note[];
  reviewedNotes: Note[];
  supervisorName: string;
  supervisorClerkId: string;
  fromDate: string;
  toDate: string;
}

export default function SupervisorReviewClient({ pendingNotes, reviewedNotes, supervisorName, supervisorClerkId, fromDate, toDate }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [signing, setSigning] = useState(false);
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "reviewed">("pending");
  const router = useRouter();

  function toggleSelect(id: string) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  }

  function selectAll() {
    if (selected.size === pendingNotes.length) setSelected(new Set());
    else setSelected(new Set(pendingNotes.map(n => n.id)));
  }

  async function cosign(noteIds: string[]) {
    setSigning(true);
    const res = await fetch("/api/supervisor/cosign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        note_ids: noteIds,
        supervisor_name: supervisorName,
        supervisor_clerk_id: supervisorClerkId,
        review_notes: reviewNotes,
      }),
    });
    if (res.ok) {
      setSuccess(`✅ ${noteIds.length} note${noteIds.length > 1 ? "s" : ""} co-signed`);
      setSelected(new Set());
      router.refresh();
    }
    setSigning(false);
    setTimeout(() => setSuccess(""), 3000);
  }

  const getPatient = (note: Note) => {
    const enc = Array.isArray(note.encounter) ? note.encounter[0] : note.encounter;
    const clientRecord = enc && (Array.isArray(enc.patient) ? enc.patient[0] : enc.patient);
    return { enc, patient: clientRecord };
  };

  return (
    <div className="space-y-4">
      {/* Date filter */}
      <form method="GET" className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <input type="date" name="from" defaultValue={fromDate} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          <input type="date" name="to" defaultValue={toDate} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>
        <button type="submit" className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">Apply</button>
      </form>

      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 text-sm text-emerald-700 font-medium">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        <button onClick={() => setActiveTab("pending")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
          ⏳ Pending Review
          {pendingNotes.length > 0 && <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{pendingNotes.length}</span>}
        </button>
        <button onClick={() => setActiveTab("reviewed")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === "reviewed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
          ✅ Co-signed ({reviewedNotes.length})
        </button>
      </div>

      {/* PENDING TAB */}
      {activeTab === "pending" && (
        <div className="space-y-3">
          {pendingNotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold text-slate-900">All caught up!</p>
              <p className="text-slate-400 text-sm mt-1">No notes pending supervisor co-signature</p>
            </div>
          ) : (
            <>
              {/* Batch actions */}
              <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selected.size === pendingNotes.length && pendingNotes.length > 0}
                    onChange={selectAll} className="w-4 h-4 accent-teal-500" />
                  <span className="text-sm text-slate-600">
                    {selected.size > 0 ? `${selected.size} selected` : `${pendingNotes.length} notes pending`}
                  </span>
                </div>
                {selected.size > 0 && (
                  <button onClick={() => cosign(Array.from(selected))} disabled={signing}
                    className="bg-emerald-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 flex items-center gap-2">
                    {signing ? "Co-signing..." : `✓ Co-sign ${selected.size} note${selected.size > 1 ? "s" : ""}`}
                  </button>
                )}
              </div>

              {pendingNotes.map(note => {
                const { enc, patient } = getPatient(note);
                const isExpanded = expandedId === note.id;
                const isSelected = selected.has(note.id);

                return (
                  <div key={note.id} className={`bg-white rounded-2xl border-2 overflow-hidden transition-colors ${isSelected ? "border-teal-400" : "border-slate-200"}`}>
                    <div className="flex items-start gap-3 px-5 py-4">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(note.id)}
                        className="w-4 h-4 accent-teal-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">
                            {patient ? `${patient.last_name}, ${patient.first_name}${patient.preferred_name ? ' "' + patient.preferred_name + '"' : ""}` : "—"}
                          </span>
                          <span className="text-slate-400 text-xs">MRN: {patient?.mrn || "—"}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {enc?.encounter_type} · {enc?.encounter_date}
                          {note.signed_at && ` · Signed ${new Date(note.signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </div>
                        {(note.diagnosis_codes?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(note.diagnosis_codes || []).map(c => <span key={c} className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{c}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setExpandedId(isExpanded ? null : note.id)}
                          className="text-xs text-teal-600 font-medium hover:text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg">
                          {isExpanded ? "Collapse" : "Review"}
                        </button>
                        <button onClick={() => cosign([note.id])} disabled={signing}
                          className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-400 disabled:opacity-50">
                          Co-sign
                        </button>
                      </div>
                    </div>

                    {/* Expanded note view */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50">
                        {[
                          { label: "S — Subjective", value: note.subjective, color: "border-blue-100" },
                          { label: "O — Objective", value: note.objective, color: "border-slate-200" },
                          { label: "A — Assessment", value: note.assessment, color: "border-amber-100" },
                          { label: "P — Plan", value: note.plan, color: "border-emerald-100" },
                        ].map(s => s.value && (
                          <div key={s.label} className={`border rounded-xl p-3 bg-white ${s.color}`}>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{s.label}</div>
                            <p className="text-sm text-slate-700 leading-relaxed">{s.value}</p>
                          </div>
                        ))}
                        <div>
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Supervisor Notes (optional)</label>
                          <textarea value={reviewNotes[note.id] || ""} onChange={e => setReviewNotes(r => ({ ...r, [note.id]: e.target.value }))}
                            rows={2} placeholder="Feedback, supervision notes, follow-up directions..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                        </div>
                        <button onClick={() => cosign([note.id])} disabled={signing}
                          className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
                          {signing ? "Co-signing..." : "✓ Co-sign This Note"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* REVIEWED TAB */}
      {activeTab === "reviewed" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {reviewedNotes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No co-signed notes in this date range</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {reviewedNotes.map(note => {
                const { enc, patient } = getPatient(note);
                return (
                  <div key={note.id} className="flex items-center gap-4 px-5 py-4">
                    <span className="text-emerald-500 text-lg flex-shrink-0">✓</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-900">{patient ? `${patient.last_name}, ${patient.first_name}` : "—"}</div>
                      <div className="text-xs text-slate-400">{enc?.encounter_type} · {enc?.encounter_date}</div>
                    </div>
                    <div className="text-right text-xs text-slate-400 flex-shrink-0">
                      <div>Co-signed by {note.supervisor_name || "Supervisor"}</div>
                      <div>{note.supervisor_signed_at ? new Date(note.supervisor_signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
