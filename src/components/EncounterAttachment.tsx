"use client";

import { useState, useEffect } from "react";

interface Encounter {
  id: string;
  encounter_date: string;
  encounter_type: string;
  status: string;
}

interface Props {
  patientId: string;
  encounterId: string;
  onEncounterChange: (id: string, action: "existing" | "new" | "none") => void;
  policy?: "no" | "yes" | "warn";
}

export default function EncounterAttachment({ patientId, encounterId, onEncounterChange, policy = "no" }: Props) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [mode, setMode] = useState<"existing" | "new" | "none">(encounterId ? "existing" : "none");
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(encounterId || "");
  const [newEncounterType, setNewEncounterType] = useState("individual");
  const [newEncounterDate, setNewEncounterDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    fetch(`/api/encounters?patient_id=${patientId}&status=in_progress`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setEncounters(d.encounters || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [patientId]);

  useEffect(() => {
    if (mode === "existing" && selectedId) {
      onEncounterChange(selectedId, "existing");
    } else if (mode === "new") {
      onEncounterChange(`new:${newEncounterType}:${newEncounterDate}`, "new");
    } else {
      onEncounterChange("", "none");
    }
  }, [mode, selectedId, newEncounterType, newEncounterDate]);

  if (!patientId) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div>
        <div className="font-semibold text-slate-900 text-sm mb-1">Attach to Encounter</div>
        <p className="text-xs text-slate-400">Link this assessment to an encounter for context, or leave standalone</p>
      </div>

      <div className="flex gap-2">
        {[
          { key: "none", label: "Standalone", icon: "📊" },
          { key: "existing", label: "Existing Encounter", icon: "🔗" },
          { key: "new", label: "New Encounter", icon: "➕" },
        ].map(opt => (
          <button key={opt.key} type="button" onClick={() => setMode(opt.key as "existing" | "new" | "none")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              mode === opt.key ? "bg-teal-500 text-white border-teal-500" : "border-slate-200 text-slate-600 hover:border-slate-300"
            }`}>
            <span>{opt.icon}</span>{opt.label}
          </button>
        ))}
      </div>

      {mode === "existing" && (
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Select Open Encounter
          </label>
          {loading ? (
            <div className="text-xs text-slate-400">Loading encounters...</div>
          ) : encounters.length === 0 ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700">
              No open encounters found for this patient. Switch to "New Encounter" to create one, or leave as Standalone.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {encounters.map(enc => (
                <button key={enc.id} type="button" onClick={() => setSelectedId(enc.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                    selectedId === enc.id ? "border-teal-400 bg-teal-50" : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-slate-900 capitalize">{enc.encounter_type?.replace(/_/g, " ")}</div>
                      <div className="text-xs text-slate-400">{new Date(enc.encounter_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">In Progress</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {mode === "new" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Encounter Type</label>
            <select value={newEncounterType} onChange={e => setNewEncounterType(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="individual">Individual Therapy</option>
              <option value="assessment">Assessment / Intake</option>
              <option value="group">Group Therapy</option>
              <option value="medication_management">Medication Management</option>
              <option value="crisis">Crisis Intervention</option>
              <option value="telehealth">Telehealth</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Encounter Date</label>
            <input type="date" value={newEncounterDate} onChange={e => setNewEncounterDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="col-span-2 bg-teal-50 border border-teal-100 rounded-xl px-4 py-2.5 text-xs text-teal-800">
            ✓ A new encounter will be created automatically when you complete this assessment
          </div>
        </div>
      )}

      {mode === "none" && policy === "yes" && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-700 font-semibold">
          ⚠️ Your organization requires all forms to be attached to an encounter before saving.
        </div>
      )}
      {mode === "none" && policy === "warn" && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 text-xs text-amber-700">
          ⚠️ Your organization recommends attaching forms to an encounter. You can still save standalone.
        </div>
      )}
      {mode === "none" && policy === "no" && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-500">
          This assessment will be saved as standalone — not linked to any encounter. You can link it later from the assessment detail page.
        </div>
      )}
    </div>
  );
}
