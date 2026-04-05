"use client";

import { useState, useRef } from "react";
import Link from "next/link";

interface Column {
  key: string;
  label: string;
}

interface ReportResult {
  title: string;
  description: string;
  columns: Column[];
  rows: Record<string, string>[];
  dateRange?: { from: string; to: string };
  summary?: Record<string, number>;
  isSuggestion?: boolean;
}

const EXAMPLE_PROMPTS = [
  "Encounters this month",
  "Unsigned notes in the last 30 days",
  "Active clients",
  "Charges and revenue this month",
  "Treatment plans",
  "PHQ-9 screenings this month",
  "Staff roster",
  "Incidents last 90 days",
  "Referrals this year",
  "Revenue this year",
  "Authorizations",
  "Diagnoses",
];

export default function CustomReportPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function runReport(text?: string) {
    const q = (text ?? prompt).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/reports/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run report");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") runReport();
  }

  function usePrompt(p: string) {
    setPrompt(p);
    runReport(p);
    inputRef.current?.focus();
  }

  function exportCSV() {
    if (!result || !result.rows.length) return;
    const header = result.columns.map(c => `"${c.label}"`).join(",");
    const body = result.rows.map(row =>
      result.columns.map(c => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const STATUS_COLORS: Record<string, string> = {
    signed: "bg-emerald-100 text-emerald-700",
    "in progress": "bg-amber-100 text-amber-700",
    pending: "bg-amber-100 text-amber-700",
    active: "bg-emerald-100 text-emerald-700",
    discharged: "bg-slate-100 text-slate-600",
    waitlist: "bg-blue-100 text-blue-700",
    paid: "bg-emerald-100 text-emerald-700",
    denied: "bg-red-100 text-red-700",
    approved: "bg-emerald-100 text-emerald-700",
    expired: "bg-red-100 text-red-700",
    yes: "bg-emerald-100 text-emerald-700",
    no: "bg-slate-100 text-slate-500",
  };

  function cellClass(key: string, value: string) {
    if (["status", "active"].includes(key)) {
      return STATUS_COLORS[value.toLowerCase()] || "bg-slate-100 text-slate-600";
    }
    return null;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/reports" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Custom Report Builder</h1>
          <p className="text-slate-500 text-sm mt-0.5">Describe the data you need in plain English</p>
        </div>
      </div>

      {/* Prompt bar */}
      <div className="bg-gradient-to-br from-[#0d1b2e] to-[#1a3260] rounded-2xl p-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">🔍</div>
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='e.g. "Show me all encounters this month" or "Revenue by CPT code last 30 days"'
              className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
            />
          </div>
          <button
            onClick={() => runReport()}
            disabled={loading || !prompt.trim()}
            className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⟳</span> Running...
              </>
            ) : (
              "Run Report →"
            )}
          </button>
        </div>

        {/* Example prompts */}
        <div className="mt-4">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Example prompts</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => usePrompt(p)}
                className="bg-white/10 hover:bg-white/20 border border-white/15 text-white/70 hover:text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Result header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{result.title}</h2>
              <p className="text-slate-500 text-sm mt-0.5">{result.description}</p>
            </div>
            {!result.isSuggestion && result.rows.length > 0 && (
              <div className="flex items-center gap-2">
                {result.dateRange && (
                  <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
                    {result.dateRange.from} → {result.dateRange.to}
                  </span>
                )}
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  ↓ Export CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  🖨️ Print
                </button>
              </div>
            )}
          </div>

          {/* Summary pills */}
          {result.summary && Object.keys(result.summary).length > 0 && (
            <div className="flex gap-3">
              {Object.entries(result.summary).map(([key, val]) => (
                <div key={key} className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-2.5">
                  <div className="text-xs text-teal-600 font-semibold uppercase tracking-wide">
                    {key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {typeof val === "number" && key.toLowerCase().includes("total")
                      ? `$${val.toFixed(2)}`
                      : val}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {result.isSuggestion ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <p className="text-slate-500 text-sm mb-4">
                I couldn&apos;t match your query to a specific report. Here are some things you can ask:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {result.rows.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => usePrompt(r.suggestion)}
                    className="text-left bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 hover:text-teal-700 transition-colors"
                  >
                    💬 {r.suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : result.rows.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
              No data found for this query. Try adjusting the date range or search terms.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div
                className="px-5 py-3 border-b border-slate-100 bg-slate-50 grid gap-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                style={{ gridTemplateColumns: `repeat(${result.columns.length}, minmax(0, 1fr))` }}
              >
                {result.columns.map(col => (
                  <span key={col.key}>{col.label}</span>
                ))}
              </div>
              <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                {result.rows.map((row, i) => (
                  <div
                    key={i}
                    className="px-5 py-3 hover:bg-slate-50 grid gap-3 items-center"
                    style={{ gridTemplateColumns: `repeat(${result.columns.length}, minmax(0, 1fr))` }}
                  >
                    {result.columns.map(col => {
                      const val = row[col.key] || "—";
                      const cls = cellClass(col.key, val);
                      return cls ? (
                        <span key={col.key}>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>
                            {val}
                          </span>
                        </span>
                      ) : (
                        <span key={col.key} className="text-sm text-slate-700 truncate" title={val}>
                          {val}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
                Showing {result.rows.length} row{result.rows.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-semibold text-slate-700 text-lg mb-1">Ask anything about your data</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Type a question or description above and the report builder will query your data and display results instantly.
            Use the example prompts to get started.
          </p>
        </div>
      )}
    </div>
  );
}
