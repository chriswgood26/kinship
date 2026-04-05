"use client";

import { useState } from "react";

interface Props {
  reportTitle: string;
  data?: Record<string, unknown>[];
  columns?: { key: string; label: string }[];
}

export default function ReportActions({ reportTitle, data = [], columns = [] }: Props) {
  const [exporting, setExporting] = useState(false);

  function handlePrint() {
    window.print();
  }

  function exportCSV() {
    if (!data.length || !columns.length) {
      // Fallback: export whatever is visible in the table
      const tables = document.querySelectorAll("table");
      if (!tables.length) { alert("No data to export"); return; }
      const table = tables[0];
      const rows: string[][] = [];
      table.querySelectorAll("tr").forEach(tr => {
        const cells = Array.from(tr.querySelectorAll("th, td")).map(td => `"${td.textContent?.trim().replace(/"/g, '""') || ""}"`);
        if (cells.length) rows.push(cells);
      });
      const csv = rows.map(r => r.join(",")).join("\n");
      download(csv, `${reportTitle.replace(/\s+/g, "_")}_${today()}.csv`, "text/csv");
      return;
    }

    const header = columns.map(c => `"${c.label}"`).join(",");
    const body = data.map(row =>
      columns.map(c => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    download(`${header}\n${body}`, `${reportTitle.replace(/\s+/g, "_")}_${today()}.csv`, "text/csv");
  }

  function exportJSON() {
    if (!data.length) { alert("No data to export"); return; }
    download(JSON.stringify(data, null, 2), `${reportTitle.replace(/\s+/g, "_")}_${today()}.json`, "application/json");
  }

  function today() {
    return new Date().toISOString().split("T")[0];
  }

  function download(content: string, filename: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          body { font-size: 12px; }
          button, a[href] { text-decoration: none; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Print header (hidden on screen, shown on print) */}
      <div className="print-header mb-4">
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <div>
            <div className="font-bold text-xl">Beaverton Mental Health</div>
            <div className="text-sm text-gray-600">{reportTitle}</div>
          </div>
          <div className="text-sm text-gray-500 text-right">
            <div>Printed: {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
            <div>DrCloud Neo — Confidential</div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 no-print">
        <button onClick={handlePrint}
          className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
          🖨️ Print
        </button>
        <div className="relative group">
          <button
            className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            ↓ Export ▾
          </button>
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden hidden group-hover:block w-36">
            <button onClick={exportCSV}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              📊 CSV
            </button>
            <button onClick={exportJSON}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-50">
              📋 JSON
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
