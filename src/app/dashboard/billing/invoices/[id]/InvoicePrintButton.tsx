"use client";
export default function InvoicePrintButton() {
  return (
    <button onClick={() => window.print()} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 no-print">
      🖨️ Print
    </button>
  );
}
