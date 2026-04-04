"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Patient {
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
}

interface Appointment {
  id: string;
  client_id: string;
  start_time: string | null;
  appointment_type: string | null;
  appointment_date?: string | null;
  status: string;
  patient?: Patient | Patient[] | null;
}

interface Props {
  appointments: Appointment[];
  today: string;
  statusColors: Record<string, string>;
}

const STORAGE_KEY = "drcloud_name_display";

export default function TodaySchedule({ appointments, today, statusColors }: Props) {
  const [showPreferred, setShowPreferred] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "preferred") setShowPreferred(true);
    const handler = () => setShowPreferred(localStorage.getItem(STORAGE_KEY) === "preferred");
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  function getDisplayName(patient: Patient | null | undefined) {
    if (!patient) return "Unknown";
    if (showPreferred && patient.preferred_name) return patient.preferred_name;
    return `${patient.last_name}, ${patient.first_name}`;
  }

  function getSecondaryName(patient: Patient | null | undefined) {
    if (!patient) return null;
    if (showPreferred && patient.preferred_name) return `${patient.last_name}, ${patient.first_name}`;
    return null;
  }

  if (!appointments || appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-400">
        <div className="text-3xl mb-2">📅</div>
        <p className="text-sm">No appointments today</p>
        <Link href={`/dashboard/scheduling/new?date=${today}`}
          className="mt-3 text-xs text-teal-600 font-medium hover:text-teal-700">
          + Schedule appointment →
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-50">
      {appointments.map(appt => {
        const patient = Array.isArray(appt.patient) ? appt.patient[0] : appt.patient;
        const displayName = getDisplayName(patient);
        const secondaryName = getSecondaryName(patient);

        return (
          <div key={appt.id} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-14 flex-shrink-0">
              <div className="text-sm font-semibold text-slate-900">
                {appt.start_time ? new Date(`2000-01-01T${appt.start_time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <Link href={`/dashboard/clients/${appt.client_id}`}
                className="font-semibold text-slate-900 text-sm hover:text-teal-600 transition-colors no-underline block">
                {displayName}
              </Link>
              {secondaryName && (
                <div className="text-xs text-slate-400">{secondaryName}</div>
              )}
              <div className="text-xs text-slate-400 capitalize">{appt.appointment_type}</div>
            </div>
            <Link href={`/dashboard/scheduling?date=${appt.appointment_date || today}&edit=${appt.id}&view=day`}
              className={`text-xs px-2 py-1 rounded-full font-medium capitalize hover:opacity-80 transition-opacity no-underline ${statusColors[appt.status || "scheduled"]}`}>
              {appt.status}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
