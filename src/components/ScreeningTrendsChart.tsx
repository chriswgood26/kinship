"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import Link from "next/link";

interface Screening {
  id: string;
  tool: string;
  total_score: number | null;
  severity_label: string | null;
  administered_at: string;
  answers?: Record<string, number>;
}

interface Props {
  clientId: string;
  clientName?: string;
}

const TOOL_CONFIG = {
  phq9: {
    label: "PHQ-9",
    fullName: "Depression (PHQ-9)",
    color: "#3b82f6",
    maxScore: 27,
    thresholds: [
      { value: 5,  label: "Mild", color: "#dbeafe" },
      { value: 10, label: "Moderate", color: "#fef9c3" },
      { value: 15, label: "Mod. Severe", color: "#fed7aa" },
      { value: 20, label: "Severe", color: "#fecaca" },
    ],
    severityBands: [
      { min: 0,  max: 4,  label: "Minimal",           fill: "#dcfce7" },
      { min: 5,  max: 9,  label: "Mild",               fill: "#dbeafe" },
      { min: 10, max: 14, label: "Moderate",           fill: "#fef9c3" },
      { min: 15, max: 19, label: "Moderately Severe",  fill: "#fed7aa" },
      { min: 20, max: 27, label: "Severe",             fill: "#fecaca" },
    ],
    refLines: [
      { y: 5,  stroke: "#93c5fd", label: "Mild" },
      { y: 10, stroke: "#fbbf24", label: "Moderate" },
      { y: 15, stroke: "#fb923c", label: "Mod. Severe" },
      { y: 20, stroke: "#f87171", label: "Severe" },
    ],
  },
  gad7: {
    label: "GAD-7",
    fullName: "Anxiety (GAD-7)",
    color: "#8b5cf6",
    maxScore: 21,
    thresholds: [
      { value: 5,  label: "Mild",     color: "#dbeafe" },
      { value: 10, label: "Moderate", color: "#fef9c3" },
      { value: 15, label: "Severe",   color: "#fecaca" },
    ],
    severityBands: [
      { min: 0,  max: 4,  label: "Minimal",  fill: "#dcfce7" },
      { min: 5,  max: 9,  label: "Mild",     fill: "#dbeafe" },
      { min: 10, max: 14, label: "Moderate", fill: "#fef9c3" },
      { min: 15, max: 21, label: "Severe",   fill: "#fecaca" },
    ],
    refLines: [
      { y: 5,  stroke: "#93c5fd", label: "Mild" },
      { y: 10, stroke: "#fbbf24", label: "Moderate" },
      { y: 15, stroke: "#f87171", label: "Severe" },
    ],
  },
  audit: {
    label: "AUDIT",
    fullName: "Alcohol Use (AUDIT)",
    color: "#f59e0b",
    maxScore: 40,
    thresholds: [
      { value: 8,  label: "Hazardous", color: "#fef9c3" },
      { value: 16, label: "Harmful",   color: "#fed7aa" },
      { value: 20, label: "Dependent", color: "#fecaca" },
    ],
    severityBands: [
      { min: 0,  max: 7,  label: "Low Risk",   fill: "#dcfce7" },
      { min: 8,  max: 15, label: "Hazardous",  fill: "#fef9c3" },
      { min: 16, max: 19, label: "Harmful",    fill: "#fed7aa" },
      { min: 20, max: 40, label: "Dependent",  fill: "#fecaca" },
    ],
    refLines: [
      { y: 8,  stroke: "#fbbf24", label: "Hazardous" },
      { y: 16, stroke: "#fb923c", label: "Harmful" },
      { y: 20, stroke: "#f87171", label: "Dependent" },
    ],
  },
  dast10: {
    label: "DAST-10",
    fullName: "Drug Use (DAST-10)",
    color: "#7c3aed",
    maxScore: 10,
    thresholds: [
      { value: 3,  label: "Moderate",   color: "#fef9c3" },
      { value: 6,  label: "Substantial", color: "#fed7aa" },
      { value: 9,  label: "Severe",     color: "#fecaca" },
    ],
    severityBands: [
      { min: 0, max: 2, label: "Low",        fill: "#dcfce7" },
      { min: 3, max: 5, label: "Moderate",   fill: "#fef9c3" },
      { min: 6, max: 8, label: "Substantial", fill: "#fed7aa" },
      { min: 9, max: 10, label: "Severe",    fill: "#fecaca" },
    ],
    refLines: [
      { y: 3, stroke: "#fbbf24", label: "Moderate" },
      { y: 6, stroke: "#fb923c", label: "Substantial" },
      { y: 9, stroke: "#f87171", label: "Severe" },
    ],
  },
};

type ToolKey = keyof typeof TOOL_CONFIG;

function getSeverityColor(tool: ToolKey, score: number): string {
  const cfg = TOOL_CONFIG[tool];
  const band = cfg.severityBands.slice().reverse().find(b => score >= b.min);
  return band?.fill ?? "#f1f5f9";
}

function getSeverityLabel(tool: ToolKey, score: number): string {
  const cfg = TOOL_CONFIG[tool];
  const band = cfg.severityBands.slice().reverse().find(b => score >= b.min);
  return band?.label ?? "—";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { score: number; hasSI?: boolean };
  fill?: string;
}

function CustomDot({ cx, cy, payload, fill }: CustomDotProps) {
  if (cx == null || cy == null || !payload) return null;
  if (payload.hasSI) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="#fff" strokeWidth={2} />
        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={10} fill="#ef4444">SI</text>
      </g>
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill={fill ?? "#3b82f6"} stroke="#fff" strokeWidth={2} />;
}

interface ChartDataPoint {
  date: string;
  score: number;
  maxScore: number;
  severity: string;
  severityColor: string;
  hasSI: boolean;
  id: string;
}

interface TooltipArgs {
  active?: boolean;
  payload?: Array<{ payload?: ChartDataPoint; color?: string; name?: string }>;
  label?: string;
}
function CustomTooltip({ active, payload, label }: TooltipArgs) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2.5 text-xs min-w-[140px]">
      <div className="font-semibold text-slate-700 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 leading-none">{d?.score}<span className="text-sm font-normal text-slate-400">/{d?.maxScore}</span></div>
      <div className="mt-1 font-medium" style={{ color: "#64748b" }}>{d?.severity}</div>
      {d?.hasSI && <div className="mt-1 text-red-600 font-bold">🚨 Suicidal ideation flagged</div>}
    </div>
  );
}

export default function ScreeningTrendsChart({ clientId, clientName }: Props) {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTool, setActiveTool] = useState<ToolKey>("phq9");
  const [availableTools, setAvailableTools] = useState<ToolKey[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/screenings?client_id=${clientId}&limit=50`, { credentials: "include" });
      const d = await res.json();
      const data: Screening[] = d.screenings || [];
      setScreenings(data);

      // Determine which tools have data
      const tools = (Object.keys(TOOL_CONFIG) as ToolKey[]).filter(t =>
        data.some(s => s.tool === t)
      );
      setAvailableTools(tools);
      if (tools.length > 0 && !tools.includes(activeTool)) {
        setActiveTool(tools[0]);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const cfg = TOOL_CONFIG[activeTool];

  // Build chart data for active tool (chronological order)
  const chartData = screenings
    .filter(s => s.tool === activeTool && s.total_score != null)
    .reverse()
    .map(s => ({
      date: formatDate(s.administered_at),
      score: s.total_score!,
      maxScore: cfg.maxScore,
      severity: getSeverityLabel(activeTool, s.total_score!),
      severityColor: getSeverityColor(activeTool, s.total_score!),
      hasSI: activeTool === "phq9" && (s.answers?.q9 ?? 0) > 0,
      id: s.id,
    }));

  const latest = chartData[chartData.length - 1];
  const previous = chartData[chartData.length - 2];
  const trend = latest && previous
    ? latest.score - previous.score
    : null;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
        Loading screening history...
      </div>
    );
  }

  if (availableTools.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Screening Trends</h2>
        </div>
        <div className="text-center py-8 text-slate-400">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm">No screenings recorded yet</p>
          <div className="flex justify-center gap-2 mt-4">
            <Link href={`/dashboard/screenings/phq9/new?client_id=${clientId}`}
              className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-600">
              + PHQ-9
            </Link>
            <Link href={`/dashboard/screenings/gad7/new?client_id=${clientId}`}
              className="text-xs bg-purple-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-purple-600">
              + GAD-7
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Screening Trends</h2>
          {clientName && <p className="text-xs text-slate-400 mt-0.5">{clientName}</p>}
        </div>
        <Link
          href={`/dashboard/screenings`}
          className="text-xs text-teal-600 font-medium hover:text-teal-700"
        >
          All screenings →
        </Link>
      </div>

      {/* Tool selector */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(TOOL_CONFIG) as ToolKey[]).map(tool => {
          const hasData = availableTools.includes(tool);
          const isActive = activeTool === tool;
          return (
            <button
              key={tool}
              onClick={() => hasData && setActiveTool(tool)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? "text-white"
                  : hasData
                  ? "border border-slate-200 text-slate-600 hover:border-slate-300"
                  : "border border-slate-100 text-slate-300 cursor-default"
              }`}
              style={isActive ? { backgroundColor: cfg.color } : undefined}
              disabled={!hasData}
              title={!hasData ? "No data" : undefined}
            >
              {TOOL_CONFIG[tool].label}
              {!hasData && <span className="ml-1 opacity-50">—</span>}
            </button>
          );
        })}
      </div>

      {/* Current score + trend summary */}
      {latest && (
        <div className="flex items-center gap-4">
          <div>
            <div className="text-3xl font-bold text-slate-900 leading-none">
              {latest.score}
              <span className="text-base font-normal text-slate-400">/{cfg.maxScore}</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Latest score · {cfg.label}</div>
          </div>
          <div
            className="px-3 py-1.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: getSeverityColor(activeTool, latest.score), color: "#334155" }}
          >
            {latest.severity}
          </div>
          {trend !== null && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${trend < 0 ? "text-emerald-600" : trend > 0 ? "text-red-500" : "text-slate-400"}`}>
              {trend < 0 ? "↓" : trend > 0 ? "↑" : "→"}
              {Math.abs(trend)} pts
              <span className="text-xs font-normal text-slate-400 ml-1">vs prior</span>
            </div>
          )}
          {latest.hasSI && (
            <div className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-xl text-xs font-semibold">
              🚨 Suicidal ideation flagged (Q9 &gt; 0)
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {chartData.length >= 2 ? (
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis
                domain={[0, cfg.maxScore]}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              {cfg.refLines.map(ref => (
                <ReferenceLine
                  key={ref.y}
                  y={ref.y}
                  stroke={ref.stroke}
                  strokeDasharray="4 2"
                  label={{ value: ref.label, fontSize: 9, fill: ref.stroke, position: "insideTopRight" }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="score"
                stroke={cfg.color}
                strokeWidth={2.5}
                dot={<CustomDot fill={cfg.color} />}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                connectNulls
                name={cfg.label}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {cfg.refLines.map(ref => (
              <div key={ref.y} className="flex items-center gap-1 text-xs text-slate-500">
                <div className="w-3 h-0.5 rounded" style={{ backgroundColor: ref.stroke }} />
                {ref.label} ({ref.y}+)
              </div>
            ))}
          </div>
        </div>
      ) : chartData.length === 1 ? (
        <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-400">
          Only one data point available — administer again to see trends
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-4 text-center text-sm text-slate-400">
          No {cfg.label} screenings for this client
        </div>
      )}

      {/* History list */}
      {chartData.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{cfg.label} History</div>
          <div className="space-y-1.5">
            {[...chartData].reverse().slice(0, 6).map((d, i) => (
              <div key={d.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${i === 0 ? "bg-slate-50" : ""}`}>
                <div className="text-xs text-slate-400 w-20 flex-shrink-0">{d.date}</div>
                <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((d.score / cfg.maxScore) * 100)}%`,
                      backgroundColor: cfg.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div className="text-sm font-bold text-slate-900 w-10 text-right flex-shrink-0">
                  {d.score}<span className="text-xs font-normal text-slate-400">/{cfg.maxScore}</span>
                </div>
                <div
                  className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                  style={{ backgroundColor: getSeverityColor(activeTool, d.score), color: "#334155" }}
                >
                  {d.severity}
                </div>
                {d.hasSI && <span className="text-xs text-red-500 font-bold">🚨 SI</span>}
                {i === 0 && <span className="text-xs text-teal-600 font-medium">Latest</span>}
              </div>
            ))}
            {chartData.length > 6 && (
              <div className="text-xs text-slate-400 text-center pt-1">
                +{chartData.length - 6} more screenings
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
