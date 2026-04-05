"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface ClientSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string | null;
  preferred_name: string | null;
  pronouns: string | null;
  date_of_birth?: string | null;
  phone_primary?: string | null;
  email?: string | null;
  status?: string | null;
  gender?: string | null;
  insurance_provider?: string | null;
}

function calcAge(dob: string | null | undefined) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob + "T12:00:00").getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function ClientSearchBox({
  label,
  selected,
  onSelect,
  excludeId,
}: {
  label: string;
  selected: ClientSearchResult | null;
  onSelect: (c: ClientSearchResult) => void;
  excludeId?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/clients?q=${encodeURIComponent(q)}`, { credentials: "include" });
      const data = await res.json();
      setResults((data.clients || []).filter((c: ClientSearchResult) => c.id !== excludeId));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [excludeId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    search(v);
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 space-y-3">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</div>

      {selected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
              {selected.first_name?.[0]}{selected.last_name?.[0]}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900">{selected.last_name}, {selected.first_name}
                {selected.preferred_name && <span className="text-slate-400 font-normal text-sm ml-2">"{selected.preferred_name}"</span>}
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                {selected.mrn && <span className="font-mono font-semibold text-slate-700">MRN: {selected.mrn}</span>}
                {selected.date_of_birth && <span>DOB: {selected.date_of_birth}</span>}
                {selected.pronouns && <span className="bg-slate-100 px-1.5 py-0.5 rounded">{selected.pronouns}</span>}
              </div>
            </div>
            <button
              onClick={() => { onSelect({ id: "", first_name: "", last_name: "", mrn: null, preferred_name: null, pronouns: null }); setQuery(""); setResults([]); }}
              className="text-slate-400 hover:text-red-500 text-sm font-medium"
            >
              ✕ Change
            </button>
          </div>

          {/* Key field preview */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-sm">
            <div>
              <dt className="text-xs text-slate-400 font-semibold uppercase">Gender</dt>
              <dd className="text-slate-800">{selected.gender || <span className="text-slate-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 font-semibold uppercase">Age</dt>
              <dd className="text-slate-800">{calcAge(selected.date_of_birth) !== null ? `${calcAge(selected.date_of_birth)} yrs` : <span className="text-slate-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 font-semibold uppercase">Phone</dt>
              <dd className="text-slate-800">{selected.phone_primary || <span className="text-slate-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 font-semibold uppercase">Email</dt>
              <dd className="text-slate-800 truncate">{selected.email || <span className="text-slate-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 font-semibold uppercase">Insurance</dt>
              <dd className="text-slate-800">{selected.insurance_provider || <span className="text-slate-300">—</span>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-400 font-semibold uppercase">Status</dt>
              <dd className="text-slate-800 capitalize">{selected.status || "active"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search by name or MRN…"
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">Searching…</div>
          )}
          {focused && results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 divide-y divide-slate-50 overflow-hidden max-h-56 overflow-y-auto">
              {results.map(c => (
                <button
                  key={c.id}
                  onMouseDown={() => { onSelect(c); setQuery(""); setResults([]); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-teal-50 text-left transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">
                    {c.first_name?.[0]}{c.last_name?.[0]}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-900">{c.last_name}, {c.first_name}
                      {c.preferred_name && <span className="text-slate-400 ml-1 font-normal">"{c.preferred_name}"</span>}
                    </div>
                    {c.mrn && <div className="text-xs text-slate-400 font-mono">MRN: {c.mrn}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {focused && results.length === 0 && query.length >= 2 && !loading && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-4 text-sm text-slate-400 text-center">
              No clients found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );

  function setFocus(v: boolean) { setFocused(v); }
}

export default function ClientMergePage() {
  const [source, setSource] = useState<ClientSearchResult | null>(null);
  const [target, setTarget] = useState<ClientSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; target_id?: string; error?: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleMerge = async () => {
    if (!source?.id || !target?.id) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/clients/merge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: source.id, target_id: target.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, error: data.error || "Merge failed" });
      } else {
        setResult({ success: true, message: data.message, target_id: data.target_id });
      }
    } catch {
      setResult({ success: false, error: "Network error — please try again" });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceSelect = (c: ClientSearchResult) => {
    setSource(c.id ? c : null);
    setConfirmed(false);
    setResult(null);
  };

  const handleTargetSelect = (c: ClientSearchResult) => {
    setTarget(c.id ? c : null);
    setConfirmed(false);
    setResult(null);
  };

  const readyToMerge = source?.id && target?.id;

  if (result?.success) {
    return (
      <div className="max-w-2xl mx-auto mt-10 space-y-5">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold text-emerald-800">Merge Complete</h2>
          <p className="text-emerald-700">{result.message}</p>
          <p className="text-sm text-emerald-600">The duplicate record has been deactivated. All clinical data has been transferred to the target record.</p>
        </div>
        <div className="flex gap-3 justify-center">
          {result.target_id && (
            <Link href={`/dashboard/clients/${result.target_id}`} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400">
              View Merged Record →
            </Link>
          )}
          <Link href="/dashboard/clients" className="border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
            Back to Clients
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/clients" className="text-slate-400 hover:text-slate-700">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Merge Duplicate Records</h1>
          <p className="text-slate-500 text-sm mt-0.5">Combine two client records into one, preserving all clinical history.</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠️</span>
        <div>
          <strong>This action cannot be undone.</strong> All appointments, encounters, treatment plans, charges, documents, and other clinical records will be transferred from the <em>duplicate</em> record to the <em>primary</em> record. The duplicate will be marked as merged and deactivated.
        </div>
      </div>

      {/* Two-column selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold">D</span>
            <span className="text-sm font-semibold text-slate-700">Duplicate (will be deactivated)</span>
          </div>
          <ClientSearchBox
            label="Select duplicate record"
            selected={source}
            onSelect={handleSourceSelect}
            excludeId={target?.id}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">✓</span>
            <span className="text-sm font-semibold text-slate-700">Primary (data will be kept here)</span>
          </div>
          <ClientSearchBox
            label="Select primary record"
            selected={target}
            onSelect={handleTargetSelect}
            excludeId={source?.id}
          />
        </div>
      </div>

      {/* Arrow / visual */}
      {readyToMerge && (
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="text-sm text-slate-500 font-medium bg-red-50 border border-red-200 px-3 py-1 rounded-full">
            {source!.first_name} {source!.last_name}
          </div>
          <div className="text-slate-400 text-lg">→ merged into →</div>
          <div className="text-sm text-slate-700 font-semibold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            {target!.first_name} {target!.last_name}
          </div>
        </div>
      )}

      {/* Confirm + action */}
      {readyToMerge && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-900 text-sm">Confirm Merge</h3>
          <p className="text-sm text-slate-600">
            You are about to merge <strong>{source!.first_name} {source!.last_name}</strong>
            {source!.mrn && <> (MRN: <span className="font-mono">{source!.mrn}</span>)</>} into{" "}
            <strong>{target!.first_name} {target!.last_name}</strong>
            {target!.mrn && <> (MRN: <span className="font-mono">{target!.mrn}</span>)</>}.
          </p>
          <p className="text-sm text-slate-500">
            All records from the duplicate will be transferred to the primary record. The duplicate record will be marked <span className="font-semibold text-slate-700">merged</span> and hidden from active client lists.
          </p>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="w-4 h-4 accent-teal-500 cursor-pointer"
            />
            <span className="text-sm text-slate-700 group-hover:text-slate-900">
              I understand this action is permanent and cannot be undone.
            </span>
          </label>

          {result?.error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {result.error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleMerge}
              disabled={!confirmed || loading}
              className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Merging…" : "Merge Records"}
            </button>
            <Link href="/dashboard/clients" className="border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">
              Cancel
            </Link>
          </div>
        </div>
      )}

      {!readyToMerge && (
        <div className="text-center py-8 text-slate-400 text-sm">
          Search for and select both the duplicate and primary records above to continue.
        </div>
      )}
    </div>
  );
}
