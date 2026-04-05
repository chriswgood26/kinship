"use client";

import { useState, useEffect, useCallback } from "react";

const ACTIVITY_LABELS: Record<string, string> = {
  individual_therapy: "Individual Therapy",
  group_therapy: "Group Therapy",
  psychiatric_eval: "Psychiatric Evaluation",
  medication_management: "Medication Management",
  case_management: "Case Management",
  crisis_intervention: "Crisis Intervention",
  telehealth: "Telehealth Session",
  assessment: "Assessment / Intake",
  documentation: "Documentation / Charting",
  care_coordination: "Care Coordination",
  consultation: "Consultation",
  supervision: "Supervision",
  training: "Training / In-service",
  admin: "Administrative",
  travel: "Travel / Home Visit",
  other: "Other",
};

interface ClinicianData {
  clerk_id: string;
  name: string;
  role: string;
  total_minutes: number;
  billable_minutes: number;
  by_activity: Record<string, { total: number; billable: number }>;
  entry_count: number;
}

interface Props {
  initialFrom: string;
  initialTo: string;
  clinicians: Array<{ clerk_user_id: string; first_name: string; last_name: string; role: string }>;
  // Productivity benchmark defaults (hours per period)
  targetBillableHours?: number;
  targetBillableRatio?: number; // 0–1
}

function fmtH(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtHDecimal(minutes: number) {
  return (minutes / 60).toFixed(1);
}

function pct(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

type SortKey = "name" | "billable" | "total" | "ratio";

export default function BillableHoursDashboardClient({
  initialFrom,
  initialTo,
  clinicians: allClinicians,
  targetBillableHours = 25,
  targetBillableRatio = 0.7,
}: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [clinicianFilter, setClinicianFilter] = useState("");
  const [data, setData] = useState<ClinicianData[]>([]);
  const [orgTotalMins, setOrgTotalMins] = useState(0);
  const [orgBillableMins, setOrgBillableMins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("billable");
  const [sortAsc, setSortAsc] = useState(false);
  const [benchmarkTarget, setBenchmarkTarget] = useState(targetBillableHours);
  const [benchmarkRatio, setBenchmarkRatio] = useState(Math.round(targetBillableRatio * 100));
  const [showBenchmarkEdit, setShowBenchmarkEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    if (clinicianFilter) params.set("clinician_id", clinicianFilter);
    const res = await fetch(`/api/supervisor/billable-hours?${params}`, { credentials: "include" });
    if (res.ok) {
      const json = await res.json();
      setData(json.clinicians || []);
      setOrgTotalMins(json.org_total_minutes || 0);
      setOrgBillableMins(json.org_billable_minutes || 0);
    }
    setLoading(false);
  }, [from, to, clinicianFilter]);

  useEffect(() => { load(); }, [load]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...data].sort((a, b) => {
    let av = 0, bv = 0;
    if (sortKey === "name") return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    if (sortKey === "billable") { av = a.billable_minutes; bv = b.billable_minutes; }
    if (sortKey === "total") { av = a.total_minutes; bv = b.total_minutes; }
    if (sortKey === "ratio") {
      av = a.total_minutes ? a.billable_minutes / a.total_minutes : 0;
      bv = b.total_minutes ? b.billable_minutes / b.total_minutes : 0;
    }
    return sortAsc ? av - bv : bv - av;
  });

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortAsc ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>) : <span className="ml-1 opacity-30">↕</span>;

  // Determine if org is hitting benchmark ratio
  const orgRatio = orgTotalMins ? pct(orgBillableMins, orgTotalMins) : 0;
  const orgBillableHours = orgBillableMins / 60;
  const meetingRatio = orgRatio >= benchmarkRatio;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">From</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">To</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Clinician</label>
          <select
            value={clinicianFilter}
            onChange={e => setClinicianFilter(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="">All Staff</option>
            {allClinicians.map(c => (
              <option key={c.clerk_user_id} value={c.clerk_user_id}>
                {c.last_name}, {c.first_name}
              </option>
            ))}
          </select>
        </div>
        {/* Quick ranges */}
        <div className="flex gap-2">
          {[
            { label: "This week", days: 7 },
            { label: "30 days", days: 30 },
            { label: "90 days", days: 90 },
          ].map(r => (
            <button
              key={r.label}
              onClick={() => {
                const end = new Date().toISOString().split("T")[0];
                const start = new Date(Date.now() - r.days * 86400000).toISOString().split("T")[0];
                setFrom(start);
                setTo(end);
              }}
              className="text-xs border border-slate-200 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-50 font-medium"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Org summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Total Hours</div>
          <div className="text-3xl font-bold text-slate-900">{fmtHDecimal(orgTotalMins)}</div>
          <div className="text-xs text-slate-400 mt-1">{data.length} staff members</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Billable Hours</div>
          <div className="text-3xl font-bold text-teal-600">{fmtHDecimal(orgBillableMins)}</div>
          <div className="text-xs text-slate-400 mt-1">{fmtHDecimal(orgTotalMins - orgBillableMins)}h non-billable</div>
        </div>
        <div className={`rounded-2xl border p-5 ${meetingRatio ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${meetingRatio ? "text-emerald-500" : "text-amber-500"}`}>Billable Ratio</div>
          <div className={`text-3xl font-bold ${meetingRatio ? "text-emerald-700" : "text-amber-700"}`}>{orgRatio}%</div>
          <div className={`text-xs mt-1 ${meetingRatio ? "text-emerald-600" : "text-amber-600"}`}>
            {meetingRatio ? "✓ Meeting" : "⚠ Below"} {benchmarkRatio}% target
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Avg / Clinician</div>
          <div className="text-3xl font-bold text-slate-900">
            {data.length > 0 ? fmtHDecimal(orgBillableMins / data.length) : "—"}
          </div>
          <div className="text-xs text-slate-400 mt-1">billable hours</div>
        </div>
      </div>

      {/* Benchmarks bar */}
      <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-semibold text-slate-700">Benchmarks:</span>
          <span className="text-sm text-slate-600">
            <span className="font-medium text-teal-600">{benchmarkTarget}h</span> billable target/period
          </span>
          <span className="text-sm text-slate-600">
            <span className="font-medium text-teal-600">{benchmarkRatio}%</span> billable ratio target
          </span>
        </div>
        <button
          onClick={() => setShowBenchmarkEdit(e => !e)}
          className="text-xs text-teal-600 border border-teal-200 px-3 py-1.5 rounded-lg font-medium hover:bg-teal-50"
        >
          ✎ Edit Benchmarks
        </button>
      </div>

      {showBenchmarkEdit && (
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex flex-wrap gap-6 items-end">
          <div>
            <label className="text-xs font-semibold text-teal-700 uppercase tracking-wide block mb-1.5">Billable Hours Target</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={80}
                value={benchmarkTarget}
                onChange={e => setBenchmarkTarget(Number(e.target.value))}
                className="w-20 border border-teal-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-sm text-teal-700">hours / period</span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-teal-700 uppercase tracking-wide block mb-1.5">Billable Ratio Target</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={benchmarkRatio}
                onChange={e => setBenchmarkRatio(Number(e.target.value))}
                className="w-20 border border-teal-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-sm text-teal-700">%</span>
            </div>
          </div>
          <button
            onClick={() => setShowBenchmarkEdit(false)}
            className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400"
          >
            Apply
          </button>
        </div>
      )}

      {/* Per-clinician table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Clinician Productivity</h2>
          {loading && <span className="text-xs text-slate-400 animate-pulse">Loading...</span>}
        </div>

        {sorted.length === 0 && !loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No time entries found for this period.
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <button onClick={() => handleSort("name")} className="text-left flex items-center">Name <SortIcon k="name" /></button>
              <button onClick={() => handleSort("billable")} className="text-right flex items-center justify-end">Billable <SortIcon k="billable" /></button>
              <button onClick={() => handleSort("total")} className="text-right flex items-center justify-end">Total <SortIcon k="total" /></button>
              <button onClick={() => handleSort("ratio")} className="text-right flex items-center justify-end">Ratio <SortIcon k="ratio" /></button>
              <div className="text-right">vs Target</div>
              <div></div>
            </div>

            <div className="divide-y divide-slate-50">
              {sorted.map(c => {
                const ratio = pct(c.billable_minutes, c.total_minutes);
                const billableHours = c.billable_minutes / 60;
                const meetsHoursTarget = billableHours >= benchmarkTarget;
                const meetsRatioTarget = ratio >= benchmarkRatio;
                const bothMet = meetsHoursTarget && meetsRatioTarget;
                const neitherMet = !meetsHoursTarget && !meetsRatioTarget;
                const isExpanded = expandedId === c.clerk_id;

                // Progress bar width capped at 100%
                const barPct = Math.min(100, Math.round((billableHours / benchmarkTarget) * 100));

                return (
                  <div key={c.clerk_id}>
                    <div className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_80px] px-5 py-4 items-center gap-2 hover:bg-slate-50/60 transition-colors ${isExpanded ? "bg-slate-50" : ""}`}>
                      {/* Name + role */}
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{c.name}</div>
                        <div className="text-xs text-slate-400 capitalize">{c.role?.replace(/_/g, " ")}</div>
                        {/* Billable hours progress bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all ${meetsHoursTarget ? "bg-teal-500" : "bg-amber-400"}`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{barPct}%</span>
                        </div>
                      </div>

                      {/* Billable hours */}
                      <div className="text-right">
                        <div className="font-bold text-teal-700">{fmtH(c.billable_minutes)}</div>
                        <div className="text-xs text-slate-400">{fmtHDecimal(c.billable_minutes)}h</div>
                      </div>

                      {/* Total hours */}
                      <div className="text-right">
                        <div className="font-medium text-slate-700">{fmtH(c.total_minutes)}</div>
                        <div className="text-xs text-slate-400">{c.entry_count} entries</div>
                      </div>

                      {/* Ratio */}
                      <div className="text-right">
                        <span className={`inline-block text-sm font-bold px-2 py-0.5 rounded-lg ${
                          meetsRatioTarget
                            ? "bg-emerald-100 text-emerald-700"
                            : ratio >= benchmarkRatio * 0.8
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {ratio}%
                        </span>
                      </div>

                      {/* vs Target */}
                      <div className="text-right">
                        {bothMet ? (
                          <span className="text-xs text-emerald-600 font-semibold">✓ On track</span>
                        ) : neitherMet ? (
                          <span className="text-xs text-red-500 font-semibold">⚠ Below</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold">~ Partial</span>
                        )}
                      </div>

                      {/* Expand */}
                      <div className="text-right">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : c.clerk_id)}
                          className="text-xs text-teal-600 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 font-medium"
                        >
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded breakdown by activity */}
                    {isExpanded && (
                      <div className="px-5 pb-5 bg-slate-50 border-t border-slate-100">
                        <div className="pt-4">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Hours by Activity</div>
                          <div className="space-y-2">
                            {Object.entries(c.by_activity)
                              .sort((a, b) => b[1].total - a[1].total)
                              .map(([act, v]) => {
                                const actPct = pct(v.total, c.total_minutes);
                                return (
                                  <div key={act} className="flex items-center gap-3">
                                    <div className="w-40 text-xs text-slate-600 flex-shrink-0 truncate">
                                      {ACTIVITY_LABELS[act] || act}
                                    </div>
                                    <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden relative">
                                      <div
                                        className={`h-4 rounded-full ${v.billable > 0 ? "bg-teal-500" : "bg-slate-400"}`}
                                        style={{ width: `${actPct}%` }}
                                      />
                                    </div>
                                    <div className="text-xs text-slate-700 w-20 text-right flex-shrink-0">
                                      {fmtH(v.total)}
                                      {v.billable > 0 && (
                                        <span className="text-teal-600 ml-1">({fmtH(v.billable)} bill.)</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>

                          {/* Mini stats */}
                          <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                              <div className="text-lg font-bold text-teal-600">{fmtH(c.billable_minutes)}</div>
                              <div className="text-xs text-slate-400">Billable</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                              <div className="text-lg font-bold text-slate-600">{fmtH(c.total_minutes - c.billable_minutes)}</div>
                              <div className="text-xs text-slate-400">Non-Billable</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                              <div className={`text-lg font-bold ${meetsRatioTarget ? "text-emerald-600" : "text-amber-600"}`}>{ratio}%</div>
                              <div className="text-xs text-slate-400">Billable Ratio</div>
                            </div>
                          </div>

                          {/* Benchmark status */}
                          <div className="mt-3 flex gap-3 text-xs">
                            <span className={`px-3 py-1.5 rounded-lg font-medium ${meetsHoursTarget ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {meetsHoursTarget ? "✓" : "⚠"} Hours: {fmtHDecimal(c.billable_minutes)}h / {benchmarkTarget}h target
                            </span>
                            <span className={`px-3 py-1.5 rounded-lg font-medium ${meetsRatioTarget ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {meetsRatioTarget ? "✓" : "⚠"} Ratio: {ratio}% / {benchmarkRatio}% target
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Team distribution chart (simple bar) */}
      {sorted.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="font-bold text-slate-900 mb-4 text-sm">Billable Hours Distribution</div>
          <div className="space-y-3">
            {sorted.map(c => {
              const maxBillable = Math.max(...sorted.map(x => x.billable_minutes), 1);
              const barW = Math.round((c.billable_minutes / maxBillable) * 100);
              const ratio = pct(c.billable_minutes, c.total_minutes);
              const meetsRatioTarget = ratio >= benchmarkRatio;
              return (
                <div key={c.clerk_id} className="flex items-center gap-3">
                  <div className="w-36 text-xs text-slate-600 truncate flex-shrink-0">{c.name.split(",")[0] || c.name}</div>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                    <div
                      className={`h-6 rounded-full flex items-center px-2 transition-all ${meetsRatioTarget ? "bg-teal-500" : "bg-amber-400"}`}
                      style={{ width: `${Math.max(barW, 4)}%` }}
                    >
                      {barW > 15 && <span className="text-white text-xs font-semibold">{fmtHDecimal(c.billable_minutes)}h</span>}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 w-14 text-right flex-shrink-0">{ratio}% bill.</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-slate-400">
            <span><span className="inline-block w-3 h-3 bg-teal-500 rounded mr-1"></span>Meeting ratio target</span>
            <span><span className="inline-block w-3 h-3 bg-amber-400 rounded mr-1"></span>Below ratio target</span>
          </div>
        </div>
      )}

      {/* Bottom note */}
      <div className="text-xs text-slate-400 text-center pb-2">
        Data from time entries submitted by clinicians · Benchmarks are session-configurable and not persisted
      </div>
    </div>
  );
}
