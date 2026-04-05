"use client";

/**
 * PayerSelect — searchable dropdown that lists organization-defined payers.
 *
 * When the org has not enabled `restrict_to_credentialed_payers`, users can
 * also type a free-text payer name that is not yet in the credentialed list.
 * In that case a warning badge is shown on the trigger to indicate the payer
 * has not been set up for billing.
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
  const [restrictToCredentialed, setRestrictToCredentialed] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch payers + org restriction setting once on first open
  const fetchPayers = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const res = await fetch("/api/payers", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPayers((data.payers || []).filter((p: Payer) => p.is_active));
        setRestrictToCredentialed(data.restrict_to_credentialed_payers ?? false);
      }
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }, [fetched]);

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

  // Whether the current value matches a credentialed payer
  const isCredentialed = !value || payers.some(p => p.name === value);
  const showWarning = fetched && !!value && !isCredentialed;

  const filtered = payers.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Show "use custom" option when search text doesn't exactly match a payer
  // and org hasn't restricted to credentialed-only
  const searchTrimmed = search.trim();
  const exactMatch = payers.some(p => p.name.toLowerCase() === searchTrimmed.toLowerCase());
  const showCustomOption = !restrictToCredentialed && searchTrimmed.length > 0 && !exactMatch;

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
        <span className="truncate flex items-center gap-2">
          {value || placeholder}
          {showWarning && (
            <span
              title="This payer is not in your credentialed payer list. Add it in Payer Management to enable billing."
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0"
            >
              ⚠ Not credentialed
            </span>
          )}
        </span>
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

          {/* Restriction notice */}
          {restrictToCredentialed && (
            <div className="mx-3 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-start gap-1.5">
              <span className="flex-shrink-0 mt-0.5">🔒</span>
              <span>Your organization restricts payer selection to credentialed payers only.</span>
            </div>
          )}

          {/* List */}
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">Loading payers…</div>
            ) : (
              <>
                {/* Clear selection */}
                {value && !required && filtered.length > 0 && (
                  <button
                    type="button"
                    onClick={() => select("")}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100 italic"
                  >
                    — Clear selection —
                  </button>
                )}

                {/* Credentialed payer list */}
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

                {/* No matches — empty state */}
                {filtered.length === 0 && !showCustomOption && (
                  <div className="px-4 py-4 text-sm text-slate-400 text-center">
                    {search ? (
                      restrictToCredentialed ? (
                        <>
                          <p>No credentialed payer matches &quot;{search}&quot;.</p>
                          <p className="text-xs mt-1 text-amber-600">
                            Your org restricts payer selection to credentialed payers.{" "}
                            <Link href="/dashboard/admin/payers" className="underline hover:text-amber-800" target="_blank" rel="noreferrer">
                              Add this payer →
                            </Link>
                          </p>
                        </>
                      ) : (
                        `No payers match "${search}"`
                      )
                    ) : (
                      "No payers defined yet"
                    )}
                    {!restrictToCredentialed && (
                      <div className="mt-1">
                        <Link href="/dashboard/admin/payers" className="text-teal-600 hover:underline text-xs" target="_blank" rel="noreferrer">
                          Manage payers →
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom payer entry (when not restricted) */}
                {showCustomOption && (
                  <button
                    type="button"
                    onClick={() => select(searchTrimmed)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-sm hover:bg-amber-50 transition-colors border-t border-slate-100 text-slate-700"
                  >
                    <span className="flex-shrink-0 text-amber-500">+</span>
                    <span>
                      Use <span className="font-semibold">&quot;{searchTrimmed}&quot;</span> as payer
                    </span>
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium flex-shrink-0">
                      Not credentialed
                    </span>
                  </button>
                )}
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

      {/* Inline warning below field (when value is not credentialed and restriction is off) */}
      {showWarning && !restrictToCredentialed && !open && (
        <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
          <span>⚠</span>
          <span>
            &quot;{value}&quot; is not in your credentialed payer list.{" "}
            <Link href="/dashboard/admin/payers" className="underline hover:text-amber-800" target="_blank" rel="noreferrer">
              Add it to Payer Management
            </Link>{" "}
            to enable billing.
          </span>
        </p>
      )}

      {/* Inline error when restriction is on and value is not credentialed */}
      {showWarning && restrictToCredentialed && !open && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <span>⛔</span>
          <span>
            &quot;{value}&quot; is not a credentialed payer.{" "}
            <Link href="/dashboard/admin/payers" className="underline hover:text-red-800" target="_blank" rel="noreferrer">
              Add it in Payer Management
            </Link>{" "}
            or select a different payer.
          </span>
        </p>
      )}
    </div>
  );
}
