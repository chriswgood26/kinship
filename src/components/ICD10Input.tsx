"use client";

import { useState, useEffect, useRef } from "react";

interface ICD10Code { code: string; description: string; category: string; }

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ICD10Input({ value, onChange, placeholder = "Search ICD-10 codes...", className = "" }: Props) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ICD10Code[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse existing codes
  const selected = value ? value.split(",").map(s => s.trim()).filter(Boolean) : [];

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/icd10?q=${encodeURIComponent(search)}`)
        .then(r => r.json())
        .then(d => { setResults(d.codes || []); setLoading(false); setOpen(true); });
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addCode(code: string) {
    if (!selected.includes(code)) {
      onChange([...selected, code].join(", "));
    }
    setSearch("");
    setResults([]);
    setOpen(false);
  }

  function removeCode(code: string) {
    onChange(selected.filter(c => c !== code).join(", "));
  }

  const inputBase = "border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div className={`space-y-2 ${className}`} ref={ref}>
      {/* Selected codes */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(code => (
            <span key={code} className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-bold px-2.5 py-1 rounded-lg">
              {code}
              <button type="button" onClick={() => removeCode(code)} className="text-teal-400 hover:text-teal-700 text-xs leading-none">✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => search.length >= 2 && setOpen(true)}
          className={`w-full ${inputBase}`}
          placeholder={selected.length > 0 ? "Add another code..." : placeholder}
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">...</span>}

        {open && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-xl z-20 max-h-64 overflow-y-auto">
            {results.map(r => (
              <button key={r.code} type="button" onClick={() => addCode(r.code)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex items-start gap-3">
                <span className="font-mono font-bold text-slate-900 text-sm flex-shrink-0 w-16">{r.code}</span>
                <div className="min-w-0">
                  <div className="text-sm text-slate-700 truncate">{r.description}</div>
                  <div className="text-xs text-slate-400">{r.category}</div>
                </div>
                {selected.includes(r.code) && <span className="text-teal-500 flex-shrink-0">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hidden input for form value */}
      <input type="hidden" value={value} readOnly />
    </div>
  );
}
