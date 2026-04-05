"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface Patient { id: string; first_name: string; last_name: string; }

interface Props {
  dateFilter: string;
  patientFilter: string;
  today: string;
  patients: Patient[];
}

export default function DDNotesFilters({ dateFilter, patientFilter, today, patients }: Props) {
  const router = useRouter();

  const prevDate = new Date(new Date(dateFilter + "T12:00:00").getTime() - 86400000).toISOString().split("T")[0];
  const nextDate = new Date(new Date(dateFilter + "T12:00:00").getTime() + 86400000).toISOString().split("T")[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/dd-notes?date=${prevDate}${patientFilter ? `&patient_id=${patientFilter}` : ""}`}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">←</Link>
        <input type="date" value={dateFilter}
          onChange={e => router.push(`/dashboard/dd-notes?date=${e.target.value}${patientFilter ? `&patient_id=${patientFilter}` : ""}`)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <Link href={`/dashboard/dd-notes?date=${nextDate}${patientFilter ? `&patient_id=${patientFilter}` : ""}`}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">→</Link>
        <Link href={`/dashboard/dd-notes?date=${today}${patientFilter ? `&patient_id=${patientFilter}` : ""}`}
          className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg">Today</Link>
      </div>
      <select value={patientFilter}
        onChange={e => router.push(`/dashboard/dd-notes?date=${dateFilter}${e.target.value ? `&patient_id=${e.target.value}` : ""}`)}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
        <option value="">All Clients</option>
        {patients.map(p => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
      </select>
    </div>
  );
}
