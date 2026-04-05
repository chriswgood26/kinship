"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Props {
  encounterId: string | null;
  patientId?: string | null;
}

export default function EncounterContextBanner({ encounterId, patientId }: Props) {
  const [encounter, setEncounter] = useState<{
    id: string;
    encounter_date: string;
    encounter_type: string;
    patient?: { first_name: string; last_name: string } | null;
  } | null>(null);

  useEffect(() => {
    if (!encounterId) return;
    fetch(`/api/encounters/${encounterId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.encounter) setEncounter(d.encounter); })
      .catch(() => {});
  }, [encounterId]);

  if (!encounterId || !encounter) return null;

  const patient = Array.isArray(encounter.patient) ? encounter.patient[0] : encounter.patient;
  const date = encounter.encounter_date
    ? new Date(encounter.encounter_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-2xl px-5 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-teal-500 text-lg">🔗</span>
        <div>
          <div className="text-xs font-bold text-teal-700 uppercase tracking-wide">Working in encounter</div>
          <div className="text-sm font-semibold text-teal-900 mt-0.5">
            {patient ? `${patient.last_name}, ${patient.first_name} · ` : ""}
            <span className="capitalize">{encounter.encounter_type?.replace(/_/g, " ")}</span>
            {date ? ` · ${date}` : ""}
          </div>
        </div>
      </div>
      <Link href={`/dashboard/encounters/${encounterId}`}
        className="text-xs text-teal-600 font-semibold hover:text-teal-700 border border-teal-300 px-3 py-1.5 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap">
        Back to Encounter →
      </Link>
    </div>
  );
}
