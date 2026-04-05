"use client";

import { useState } from "react";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }
interface Participant {
  id: string;
  client_id: string;
  attendance_status: "present" | "absent" | "late" | "excused";
  participation_notes: string | null;
  client: Client | Client[] | null;
}

interface Props {
  encounterId: string;
  initialParticipants: Participant[];
}

const ATTENDANCE_OPTIONS = [
  { value: "present", label: "Present", color: "bg-emerald-100 text-emerald-700" },
  { value: "absent", label: "Absent", color: "bg-red-100 text-red-600" },
  { value: "late", label: "Late", color: "bg-amber-100 text-amber-700" },
  { value: "excused", label: "Excused", color: "bg-slate-100 text-slate-500" },
];

function getClientName(participant: Participant): string {
  const c = Array.isArray(participant.client) ? participant.client[0] : participant.client;
  if (!c) return "Unknown";
  return `${c.last_name}, ${c.first_name}`;
}

function getClientMrn(participant: Participant): string | null {
  const c = Array.isArray(participant.client) ? participant.client[0] : participant.client;
  return c?.mrn ?? null;
}

export default function GroupParticipantsPanel({ encounterId, initialParticipants }: Props) {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [saving, setSaving] = useState<string | null>(null);
  const [addSearch, setAddSearch] = useState("");
  const [addResults, setAddResults] = useState<Client[]>([]);
  const [addLoading, setAddLoading] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function updateAttendance(participantId: string, status: string) {
    setSaving(participantId);
    const participant = participants.find(p => p.id === participantId);
    const res = await fetch("/api/group-sessions/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: participantId,
        attendance_status: status,
        participation_notes: participant?.participation_notes ?? null,
      }),
    });
    if (res.ok) {
      setParticipants(prev => prev.map(p =>
        p.id === participantId ? { ...p, attendance_status: status as Participant["attendance_status"] } : p
      ));
    }
    setSaving(null);
  }

  async function saveNotes(participantId: string) {
    setSaving(participantId);
    const participant = participants.find(p => p.id === participantId);
    const res = await fetch("/api/group-sessions/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        id: participantId,
        attendance_status: participant?.attendance_status ?? "present",
        participation_notes: noteDraft.trim() || null,
      }),
    });
    if (res.ok) {
      setParticipants(prev => prev.map(p =>
        p.id === participantId ? { ...p, participation_notes: noteDraft.trim() || null } : p
      ));
      setEditingNotes(null);
    }
    setSaving(null);
  }

  async function removeParticipant(participantId: string) {
    const res = await fetch(`/api/group-sessions/participants?id=${encodeURIComponent(participantId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    }
  }

  async function addParticipant(client: Client) {
    const res = await fetch("/api/group-sessions/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        encounter_id: encounterId,
        client_ids: [client.id],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const newP = data.participants?.[0];
      if (newP) {
        setParticipants(prev => [...prev, { ...newP, client }]);
      }
    }
    setAddSearch("");
    setAddResults([]);
    setShowAdd(false);
  }

  const presentCount = participants.filter(p => p.attendance_status === "present" || p.attendance_status === "late").length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Group Participants</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {participants.length} enrolled · {presentCount} present
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-400 transition-colors"
        >
          + Add Member
        </button>
      </div>

      {showAdd && (
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <input
              value={addSearch}
              onChange={e => {
                setAddSearch(e.target.value);
                if (e.target.value.length >= 2) {
                  setAddLoading(true);
                  fetch(`/api/clients?q=${encodeURIComponent(e.target.value)}`, { credentials: "include" })
                    .then(r => r.json())
                    .then(d => {
                      const existing = participants.map(p => p.client_id);
                      setAddResults((d.clients || []).filter((c: Client) => !existing.includes(c.id)));
                      setAddLoading(false);
                    });
                } else {
                  setAddResults([]);
                }
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Search client to add..."
              autoFocus
            />
            {addLoading && <div className="absolute right-3 top-2.5 text-xs text-slate-400">Searching...</div>}
            {addResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                {addResults.map(c => (
                  <button key={c.id} type="button"
                    onClick={() => addParticipant(c)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                    <div className="font-semibold text-sm text-slate-900">{c.last_name}, {c.first_name}</div>
                    {c.mrn && <div className="text-xs text-slate-400">MRN: {c.mrn}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {participants.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">
          No participants yet. Add group members above.
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {participants.map(p => {
            const isEditingThisNote = editingNotes === p.id;
            return (
              <div key={p.id} className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0 mt-0.5">
                    {getClientName(p)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{getClientName(p)}</span>
                      {getClientMrn(p) && <span className="text-xs text-slate-400">MRN: {getClientMrn(p)}</span>}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {ATTENDANCE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={saving === p.id}
                          onClick={() => updateAttendance(p.id, opt.value)}
                          className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                            p.attendance_status === opt.value
                              ? opt.color + " ring-2 ring-offset-1 ring-current"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {isEditingThisNote ? (
                      <div className="mt-2 space-y-1">
                        <textarea
                          value={noteDraft}
                          onChange={e => setNoteDraft(e.target.value)}
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                          placeholder="Individual participation notes for this session..."
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={() => saveNotes(p.id)} disabled={saving === p.id}
                            className="text-xs bg-teal-500 text-white px-3 py-1 rounded-lg font-medium hover:bg-teal-400 disabled:opacity-50">
                            {saving === p.id ? "Saving..." : "Save"}
                          </button>
                          <button onClick={() => setEditingNotes(null)} className="text-xs text-slate-500 px-3 py-1 hover:text-slate-700">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-1">
                        {p.participation_notes && (
                          <p className="text-xs text-slate-600 italic mb-0.5">{p.participation_notes}</p>
                        )}
                        <button
                          onClick={() => { setEditingNotes(p.id); setNoteDraft(p.participation_notes || ""); }}
                          className="text-xs text-teal-600 hover:text-teal-800"
                        >
                          {p.participation_notes ? "Edit notes" : "+ Add participation notes"}
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors text-xs mt-1 flex-shrink-0"
                    title="Remove from session"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
