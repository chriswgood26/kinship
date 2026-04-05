"use client";

import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { Payload } from "recharts/types/component/DefaultTooltipContent";

interface Screening {
  id: string;
  tool: string;
  total_score: number | null;
  severity_label: string | null;
  administered_at: string;
  answers?: Record<string, number> | null;
  client?: { first_name: string; last_name: string; mrn?: string } | null;
}

const TOOL_COLORS: Record<string, string> = {
  phq9:  "#3b82f6",
  gad7:  "#8b5cf6",
  audit: "#f59e0b",
  dast10: "#7c3aed",
};

const TOOL_MAX: Record<string, number> = {
  phq9: 27, gad7: 21, audit: 40, dast10: 10,
};

const TOOL_LABELS: Record<string, string> = {
  phq9: "PHQ-9", gad7: "GAD-7", audit: "AUDIT", dast10: "DAST-10",
};

const PHQ9_REF_LINES = [
  { y: 5,  stroke: "#93c5fd", label: "Mild" },
  { y: 10, stroke: "#fbbf24", label: "Moderate" },
  { y: 20, stroke: "#f87171", label: "Severe" },
];

const GAD7_REF_LINES = [
  { y: 5,  stroke: "#c4b5fd", label: "Mild" },
  { y: 10, stroke: "#fbbf24", label: "Moderate" },
  { y: 15, stroke: "#f87171", label: "Severe" },
];

function getMonthKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

interface TooltipArgs {
  active?: boolean;
  payload?: Payload<number, string>[];
  label?: string;
}
function CustomTooltip({ active, payload, label }: TooltipArgs) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-xs min-w-[160px]">
      <div className="font-semibold text-slate-700 mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-600">{TOOL_LABELS[String(p.dataKey)] ?? String(p.name)}</span>
          </div>
          <span className="font-bold text-slate-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

type ViewMode = "avg" | "count";

export default function OrgScreeningTrends() {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("avg");
  const [activeTool, setActiveTool] = useState<"phq9_gad7" | "audit" | "dast10">("phq9_gad7");

  useEffect(() => {
    fetch("/api/screenings?limit=200", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setScreenings(d.screenings || []);
        setLoading(false);
      });
  }, []);

  // Group by month
  const monthlyData = useMemo(() => {
    // Collect all month keys
    const months = new Map<string, Record<string, number[]>>();

    for (const s of screenings) {
      if (!s.administered_at || s.total_score == null) continue;
      const mk = getMonthKey(s.administered_at);
      if (!months.has(mk)) months.set(mk, {});
      const entry = months.get(mk)!;
      if (!entry[s.tool]) entry[s.tool] = [];
      entry[s.tool].push(s.total_score);
    }

    // Sort by date
    const sorted = [...months.entries()].sort((a, b) => {
      const da = new Date(a[0]);
      const db = new Date(b[0]);
      return da.getTime() - db.getTime();
    });

    return sorted.map(([month, toolData]) => {
      const row: Record<string, number | string> = { month };
      for (const tool of ["phq9", "gad7", "audit", "dast10"]) {
        const scores = toolData[tool] ?? [];
        row[`${tool}_avg`] = scores.length > 0 ? avg(scores) : 0;
        row[`${tool}_count`] = scores.length;
        row[tool] = view === "avg" ? (scores.length > 0 ? avg(scores) : undefined as unknown as number) : scores.length;
      }
      return row;
    }).filter(r =>
      // Only include rows with data for the active tool set
      activeTool === "phq9_gad7"
        ? (r.phq9 != null && r.phq9 !== 0) || (r.gad7 != null && r.gad7 !== 0)
        : r[activeTool] != null && r[activeTool] !== 0
    );
  }, [screenings, view, activeTool]);

  // Summary stats
  const recentPHQ9 = screenings.filter(s => s.tool === "phq9" && s.total_score != null).slice(0, 10);
  const recentGAD7 = screenings.filter(s => s.tool === "gad7" && s.total_score != null).slice(0, 10);
  const avgPHQ9 = recentPHQ9.length > 0 ? avg(recentPHQ9.map(s => s.total_score!)) : null;
  const avgGAD7 = recentGAD7.length > 0 ? avg(recentGAD7.map(s => s.total_score!)) : null;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
        Loading trend data...
      </div>
    );
  }

  if (screenings.length === 0) {
    return null;
  }

  const refLines = activeTool === "phq9_gad7" ? PHQ9_REF_LINES : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Population Screening Trends</h2>
          <p className="text-xs text-slate-400 mt-0.5">Average scores over time across all clients</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setView("avg")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${view === "avg" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
            Avg Score
          </button>
          <button
            onClick={() => setView("count")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${view === "count" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
            Volume
          </button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-3">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">PHQ-9 Avg</div>
          <div className="text-2xl font-bold text-slate-900">
            {avgPHQ9 != null ? avgPHQ9 : "—"}
            {avgPHQ9 != null && <span className="text-sm font-normal text-slate-400">/27</span>}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">last {recentPHQ9.length} screenings</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-3">
          <div className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-1">GAD-7 Avg</div>
          <div className="text-2xl font-bold text-slate-900">
            {avgGAD7 != null ? avgGAD7 : "—"}
            {avgGAD7 != null && <span className="text-sm font-normal text-slate-400">/21</span>}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">last {recentGAD7.length} screenings</div>
        </div>
        <div className="bg-red-50 rounded-xl p-3">
          <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">SI Flags</div>
          <div className="text-2xl font-bold text-slate-900">
            {screenings.filter(s => s.tool === "phq9" && (s.answers?.q9 ?? 0) > 0).length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">PHQ-9 Q9 &gt; 0</div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Total</div>
          <div className="text-2xl font-bold text-slate-900">{screenings.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">screenings loaded</div>
        </div>
      </div>

      {/* Tool group selector */}
      <div className="flex gap-1.5">
        {([
          { key: "phq9_gad7", label: "PHQ-9 + GAD-7" },
          { key: "audit", label: "AUDIT" },
          { key: "dast10", label: "DAST-10" },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTool(t.key)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${activeTool === t.key ? "bg-[#0d1b2e] text-white" : "border border-slate-200 text-slate-600 hover:border-slate-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {monthlyData.length < 2 ? (
        <div className="bg-slate-50 rounded-xl p-6 text-center text-sm text-slate-400">
          Not enough data across multiple months to show trends yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis
              domain={view === "avg" && activeTool === "phq9_gad7" ? [0, 27] : undefined}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              width={36}
              label={view === "avg" ? { value: "Score", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94a3b8" } : { value: "Count", angle: -90, position: "insideLeft", fontSize: 10, fill: "#94a3b8" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value: string) => TOOL_LABELS[value] ?? value}
            />
            {view === "avg" && refLines.map(ref => (
              <ReferenceLine
                key={ref.y}
                y={ref.y}
                stroke={ref.stroke}
                strokeDasharray="4 2"
                label={{ value: ref.label, fontSize: 9, fill: ref.stroke, position: "insideTopRight" }}
              />
            ))}
            {activeTool === "phq9_gad7" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="phq9"
                  stroke={TOOL_COLORS.phq9}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: TOOL_COLORS.phq9, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls
                  name="phq9"
                />
                <Line
                  type="monotone"
                  dataKey="gad7"
                  stroke={TOOL_COLORS.gad7}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: TOOL_COLORS.gad7, strokeWidth: 2, stroke: "#fff" }}
                  connectNulls
                  name="gad7"
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey={activeTool}
                stroke={TOOL_COLORS[activeTool]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: TOOL_COLORS[activeTool], strokeWidth: 2, stroke: "#fff" }}
                connectNulls
                name={activeTool}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}

      {view === "avg" && (
        <div className="flex flex-wrap gap-3 justify-center">
          {(activeTool === "phq9_gad7" ? PHQ9_REF_LINES : []).map(ref => (
            <div key={ref.y} className="flex items-center gap-1 text-xs text-slate-500">
              <div className="w-3 h-0.5 rounded" style={{ backgroundColor: ref.stroke }} />
              PHQ-9 {ref.label} ({ref.y}+)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
