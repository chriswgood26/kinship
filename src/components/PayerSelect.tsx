"use client";

/**
 * PayerSelect — searchable dropdown that lists organization-defined payers.
 *
 * Props
 *   value       current payer name string
 *   onChange    called with the new payer name string
 *   required    mark field required
 *   placeholder placeholder text
 *   className   extra className applied to the outer <div>
 *   inputClass  className for the <input> (overrides default)
 *   disabled    whether the field is disabled
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface Payer {
  id: string;
  name: string;
  payer_type: string;
  is_active: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  inputClass?: string;
  disabled?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  commercial: "bg-slate-100 text-slate-600",
  medicaid:   "bg-emerald-100 text-emerald-700",
  medicare:   "bg-blue-100 text-blue-700",
  tricare:    "bg-violet-100 text-violet-700",
  other:      "bg-amber-100 text-amber-700",
};

export default function PayerSelect({
  value,
  onChange,
  required = false,
  placeholder = "Select or search payer…",
  className = "",
  inputClass = "",
  disabled = false,
}: Props) {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch payers once on first open
  const fetchPayers = useCallback(async () => {
    if (payers.length > 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payers", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPayers((data.payers || []).filter((p: Payer) => p.is_active));
      }
    } finally {
      setLoading(false);
    }
  }, [payers.length]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = payers.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleOpen() {
    if (disabled) return;
    setOpen(true);
    fetchPayers();
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function select(name: string) {
    onChange(name);
    setOpen(false);
    setSearch("");
  }

  const defaultInputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white cursor-pointer";
  const resolvedInputClass = inputClass || defaultInputClass;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Trigger — shows current value */}
      <div
        role="combobox"
        aria-expanded={open}
        onClick={handleOpen}
        className={`${resolvedInputClass} flex items-center justify-between gap-2 ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${!value ? "text-slate-400" : ""}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="px-3 pt-3 pb-2">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search payers…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">Loading payers…</div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-400 text-center">
                {search ? `No payers match "${search}"` : "No payers defined yet"}
                <div className="mt-1">
                  <Link href="/dashboard/admin/payers" className="text-teal-600 hover:underline text-xs" target="_blank" rel="noreferrer">
                    Manage payers →
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* Clear selection */}
                {value && !required && (
                  <button
                    type="button"
                    onClick={() => select("")}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100 italic"
                  >
                    — Clear selection —
                  </button>
                )}
                {filtered.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => select(p.name)}
                    className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 text-sm hover:bg-teal-50 transition-colors ${value === p.name ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-800"}`}
                  >
                    <span>{p.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize font-medium flex-shrink-0 ${TYPE_COLORS[p.payer_type] || TYPE_COLORS.other}`}>
                      {p.payer_type}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">{payers.length} payer{payers.length !== 1 ? "s" : ""} configured</span>
            <Link
              href="/dashboard/admin/payers"
              className="text-xs text-teal-600 hover:underline font-medium"
              target="_blank"
              rel="noreferrer"
            >
              Manage payers →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
