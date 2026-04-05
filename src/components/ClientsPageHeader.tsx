"use client";

import Link from "next/link";
import { useTerminology } from "@/components/TerminologyProvider";

interface Props {
  count: number | null;
  caseload: boolean;
  status: string;
  query: string;
}

export default function PatientsPageHeader({ count, caseload, status, query }: Props) {
  const term = useTerminology();

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{term.plural}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{count ?? 0} total {term.plural.toLowerCase()}</p>
        </div>
        <Link href="/dashboard/clients/new"
          className="bg-teal-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-teal-400 transition-colors text-sm flex items-center gap-2 flex-shrink-0">
          + New {term.singular}
        </Link>
      </div>

      {/* Caseload toggle */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm text-slate-500 font-medium">View:</span>
        <Link href={`/dashboard/clients?status=${status}${query ? `&q=${query}` : ""}`}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!caseload ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          All {term.plural}
        </Link>
        <Link href={`/dashboard/clients?status=${status}${query ? `&q=${query}` : ""}&caseload=mine`}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${caseload ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
          👤 My Caseload
        </Link>
        {caseload && <span className="text-xs text-slate-400 ml-1">{count ?? 0} {term.plural.toLowerCase()}</span>}
      </div>
    </>
  );
}
