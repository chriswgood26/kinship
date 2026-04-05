"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ScreeningTrendsChart from "@/components/ScreeningTrendsChart";

interface Screening {
  id: string;
  tool: string;
  total_score: number | null;
  severity_label: string | null;
  administered_at: string;
  answers?: Record<string, number>;
  notes?: string | null;
}

const TOOL_BADGE: Record<string, string> = {
  phq9:  "bg-blue-100 text-blue-700",
  gad7:  "bg-purple-100 text-purple-700",
  cssrs: "bg-red-100 text-red-700",
  audit: "bg-amber-100 text-amber-700",
  dast10: "bg-violet-100 text-violet-700",
};

const TOOL_MAX: Record<string, number> = {
  phq9: 27, gad7: 21, audit: 40, dast10: 10,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  clientId: string;
  clientName?: string;
}

export default function ClientScreeningsTab({ clientId, clientName }: Props) {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/screenings?client_id=${clientId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setScreenings(d.screenings || []);
        setLoading(false);
      });
  }, [clientId]);

  return (
    <div className="space-y-5">
      {/* Quick administer buttons */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/screenings/phq9/new?client_id=${clientId}`}
          className="border border-blue-200 text-blue-700 px-4 py-2 rounded-xl font-semibold hover:bg-blue-50 text-sm">
          + PHQ-9
        </Link>
        <Link href={`/dashboard/screenings/gad7/new?client_id=${clientId}`}
          className="border border-purple-200 text-purple-700 px-4 py-2 rounded-xl font-semibold hover:bg-purple-50 text-sm">
          + GAD-7
        </Link>
        <Link href={`/dashboard/screenings/audit/new?client_id=${clientId}`}
          className="border border-amber-200 text-amber-700 px-4 py-2 rounded-xl font-semibold hover:bg-amber-50 text-sm">
          + AUDIT
        </Link>
        <Link href={`/dashboard/screenings/dast10/new?client_id=${clientId}`}
          className="border border-violet-200 text-violet-700 px-4 py-2 rounded-xl font-semibold hover:bg-violet-50 text-sm">
          + DAST-10
        </Link>
        <Link href={`/dashboard/screenings/cssrs/new?client_id=${clientId}`}
          className="bg-red-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-red-400 text-sm">
          + C-SSRS
        </Link>
      </div>

      {/* Trend chart */}
      <ScreeningTrendsChart clientId={clientId} clientName={clientName} />

      {/* SI alert */}
      {screenings.some(s => s.tool === "phq9" && (s.answers?.q9 ?? 0) > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <div className="font-semibold text-red-800">Suicidal ideation flagged</div>
            <div className="text-sm text-red-600">
              {screenings.filter(s => s.tool === "phq9" && (s.answers?.q9 ?? 0) > 0).length} PHQ-9 screening(s) have a positive response on question 9 — review immediately
            </div>
          </div>
        </div>
      )}

      {/* Full history table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">All Screenings ({screenings.length})</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading...</div>
        ) : screenings.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No screenings recorded yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tool</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {screenings.map(s => {
                const isCSSRS = s.tool === "cssrs";
                const hasSI = s.tool === "phq9" && (s.answers?.q9 ?? 0) > 0;
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${TOOL_BADGE[s.tool] ?? "bg-slate-100 text-slate-600"}`}>
                        {s.tool === "dast10" ? "DAST-10" : s.tool?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {s.administered_at ? formatDate(s.administered_at) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xl font-bold text-slate-900">
                      {isCSSRS ? (
                        <span className="text-sm font-semibold text-slate-500">Level {s.total_score ?? "—"}</span>
                      ) : (
                        <>
                          {s.total_score ?? "—"}
                          <span className="text-sm font-normal text-slate-400">/{TOOL_MAX[s.tool] ?? "—"}</span>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                        {s.severity_label || "—"}
                      </span>
                      {hasSI && <span className="ml-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">🚨 SI</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/dashboard/screenings/${s.tool}/${s.id}`} className="text-teal-600 text-sm font-medium hover:text-teal-700">
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
