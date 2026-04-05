"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Client { id: string; first_name: string; last_name: string; mrn: string | null; preferred_name?: string | null; }
interface EncType { id: string; name: string; is_telehealth: boolean; default_duration_minutes: number | null; }

const DEFAULT_ENC_TYPES = [
  "Individual Therapy", "Group Therapy", "Psychiatric Evaluation", "Psychiatric Follow-up",
  "Intake Assessment", "Crisis Intervention", "Case Management", "Telehealth",
];

const GROUP_ENC_TYPES = ["Group Therapy", "Group Psychoeducation", "Group Skills Training", "Group Process"];

function NewEncounterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [customEncTypes, setCustomEncTypes] = useState<EncType[]>([]);

  // Group session state
  const [groupParticipants, setGroupParticipants] = useState<Client[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantResults, setParticipantResults] = useState<Client[]>([]);

  const [form, setForm] = useState({
    client_id: params.get("client_id") || "", client_name: "",
    encounter_date: new Date().toISOString().split("T")[0],
    encounter_type: "Individual Therapy", chief_complaint: "",
    is_group: false, group_name: "",
  });

  const isGroup = form.is_group || GROUP_ENC_TYPES.includes(form.encounter_type);

  // Load custom encounter types
  useEffect(() => {
    fetch("/api/encounter-appointment-types?category=encounter", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        const types: EncType[] = d.types || [];
        setCustomEncTypes(types);
        if (types.length > 0) {
          setForm(f => ({ ...f, encounter_type: types[0].name }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const cid = params.get("client_id");
    if (cid && !form.client_name) {
      fetch(`/api/clients/${cid}`, { credentials: "include" })
        .then(r => r.json()).then(d => {
          if (d.client) setForm(f => ({ ...f, client_id: d.client.id, client_name: `${d.client.last_name}, ${d.client.first_name}` }));
        });
    }
  }, []);

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients?q=${encodeURIComponent(clientSearch)}`, { credentials: "include" })
        .then(r => r.json()).then(d => setClients(d.clients || []));
    } else setClients([]);
  }, [clientSearch]);

  useEffect(() => {
    if (participantSearch.length >= 2) {
      fetch(`/api/clients?q=${encodeURIComponent(participantSearch)}`, { credentials: "include" })
        .then(r => r.json()).then(d => {
          const existing = groupParticipants.map(p => p.id);
          setParticipantResults((d.clients || []).filter((c: Client) => !existing.includes(c.id)));
        });
    } else setParticipantResults([]);
  }, [participantSearch, groupParticipants]);

  // When encounter type changes to group type, set is_group automatically
  useEffect(() => {
    if (GROUP_ENC_TYPES.includes(form.encounter_type)) {
      setForm(f => ({ ...f, is_group: true }));
    }
  }, [form.encounter_type]);

  const encTypeNames = customEncTypes.length > 0
    ? customEncTypes.map(t => t.name)
    : DEFAULT_ENC_TYPES;

  function addParticipant(client: Client) {
    setGroupParticipants(prev => [...prev, client]);
    setParticipantSearch("");
    setParticipantResults([]);
  }

  function removeParticipant(id: string) {
    setGroupParticipants(prev => prev.filter(p => p.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isGroup) {
      if (groupParticipants.length < 2) {
        setError("Group sessions require at least 2 participants");
        return;
      }
    } else {
      if (!form.client_id) { setError("Select a client"); return; }
    }

    setSaving(true);
    const res = await fetch("/api/encounters", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({
        ...form,
        is_group: isGroup,
        client_id: isGroup ? null : form.client_id,
        participant_ids: isGroup ? groupParticipants.map(p => p.id) : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setSaving(false); return; }
    router.push(`/dashboard/encounters/${data.encounter.id}`);
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/encounters" className="text-slate-400 hover:text-slate-700">←</Link>
        <h1 className="text-2xl font-bold text-slate-900">New Encounter</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">

        {/* Encounter Type + Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Encounter Type</label>
            <select value={form.encounter_type} onChange={e => setForm(f => ({ ...f, encounter_type: e.target.value }))} className={inputClass}>
              {encTypeNames.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className={labelClass}>Date</label>
            <input type="date" value={form.encounter_date} onChange={e => setForm(f => ({ ...f, encounter_date: e.target.value }))} className={inputClass} />
          </div>
        </div>

        {/* Group session toggle */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">Group Session</div>
            <div className="text-xs text-slate-500 mt-0.5">Multiple clients in one documented session</div>
          </div>
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, is_group: !f.is_group }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isGroup ? "bg-teal-500" : "bg-slate-200"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isGroup ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        {/* Individual client selector */}
        {!isGroup && (
          <div className="relative">
            <label className={labelClass}>Client *</label>
            {form.client_name ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5">
                <span className="text-sm font-semibold text-teal-800">{form.client_name}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, client_id: "", client_name: "" }))} className="text-teal-500 text-sm">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} className={inputClass} placeholder="Search client..." />
                {clients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                    {clients.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setForm(f => ({ ...f, client_id: c.id, client_name: `${c.last_name}, ${c.first_name}` })); setClientSearch(""); setClients([]); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                        <div className="font-semibold text-sm text-slate-900">{c.last_name}, {c.first_name}</div>
                        <div className="text-xs text-slate-400">MRN: {c.mrn || "—"}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Group session fields */}
        {isGroup && (
          <div className="space-y-4 border border-teal-100 rounded-xl p-4 bg-teal-50/30">
            <div>
              <label className={labelClass}>Group Name</label>
              <input
                value={form.group_name}
                onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))}
                className={inputClass}
                placeholder="e.g. DBT Skills Group, Men's Process Group..."
              />
            </div>

            <div>
              <label className={labelClass}>Participants ({groupParticipants.length})</label>
              <div className="space-y-2">
                {groupParticipants.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-slate-800">{p.last_name}, {p.first_name}</span>
                      {p.mrn && <span className="text-xs text-slate-400 ml-2">MRN: {p.mrn}</span>}
                    </div>
                    <button type="button" onClick={() => removeParticipant(p.id)} className="text-slate-400 hover:text-red-500 text-sm transition-colors">✕</button>
                  </div>
                ))}
                <div className="relative">
                  <input
                    value={participantSearch}
                    onChange={e => setParticipantSearch(e.target.value)}
                    className={inputClass}
                    placeholder="Add participant..."
                  />
                  {participantResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg z-10">
                      {participantResults.map(c => (
                        <button key={c.id} type="button"
                          onClick={() => addParticipant(c)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                          <div className="font-semibold text-sm text-slate-900">{c.last_name}, {c.first_name}</div>
                          <div className="text-xs text-slate-400">MRN: {c.mrn || "—"}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {groupParticipants.length < 2 && (
                <p className="text-xs text-amber-600 mt-1.5">Add at least 2 participants for a group session</p>
              )}
            </div>
          </div>
        )}

        <div><label className={labelClass}>{isGroup ? "Session Focus / Chief Complaint" : "Chief Complaint"}</label>
          <input value={form.chief_complaint} onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))} className={inputClass} placeholder={isGroup ? "Topic or focus for this group session..." : "Reason for visit..."} />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex gap-3 justify-end">
        <Link href="/dashboard/encounters" className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</Link>
        <button type="submit" disabled={saving} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
          {saving ? "Starting..." : isGroup ? "Start Group Session →" : "Start Encounter →"}
        </button>
      </div>
    </form>
  );
}

export default function NewEncounterPage() {
  return <Suspense fallback={<div className="p-8 text-slate-400">Loading...</div>}><NewEncounterForm /></Suspense>;
}
