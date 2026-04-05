"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ClinicianSummary {
  id: string;
  first_name: string | null;
  last_name: string | null;
  credentials: string | null;
  title: string | null;
  role: string;
  count: number;
  total_count: number;
  caseload_capacity: number | null;
}

interface Client {
  id: string;
  mrn: string | null;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  date_of_birth: string | null;
  status: string;
  phone_primary: string | null;
  insurance_provider: string | null;
  primary_clinician_id: string | null;
  primary_clinician_name: string | null;
  last_encounter_date: string | null;
}

interface Props {
  summary: ClinicianSummary[];
  unassignedCount: number;
  totalActive: number;
  clientTermSingular: string;
  clientTermPlural: string;
}

function calcAge(dob: string | null) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob + "T12:00:00").getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(d: string | null) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d + "T12:00:00").getTime()) / (1000 * 60 * 60 * 24));
}

export default function CaseloadClient({ summary: initialSummary, unassignedCount, totalActive, clientTermSingular, clientTermPlural }: Props) {
  const [summary, setSummary] = useState<ClinicianSummary[]>(initialSummary);
  const [selectedClinician, setSelectedClinician] = useState<ClinicianSummary | null>(null);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  // Per-client reassignment target
  const [reassignTargets, setReassignTargets] = useState<Record<string, string>>({});
  const [reassigning, setReassigning] = useState<string | null>(null);
  // Clinician search
  const [searchQuery, setSearchQuery] = useState("");
  // Panel search (right side)
  const [panelSearch, setPanelSearch] = useState("");
  // Bulk selection
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState("");
  const [bulkReassigning, setBulkReassigning] = useState(false);
  // Capacity editing
  const [editingCapacity, setEditingCapacity] = useState<string | null>(null);
  const [capacityInput, setCapacityInput] = useState("");
  const [savingCapacity, setSavingCapacity] = useState(false);

  const loadClients = useCallback(async (clinicianId: string | null, unassigned: boolean) => {
    setLoadingClients(true);
    setPanelSearch("");
    setSelectedClients(new Set());
    setBulkTarget("");
    const url = unassigned
      ? "/api/caseload?unassigned=true"
      : `/api/caseload?clinician_id=${clinicianId}`;
    const res = await fetch(url, { credentials: "include" });
    const data = await res.json();
    setClients(data.clients || []);
    setReassignTargets({});
    setLoadingClients(false);
  }, []);

  useEffect(() => {
    if (showUnassigned) {
      loadClients(null, true);
    } else if (selectedClinician) {
      loadClients(selectedClinician.id, false);
    }
  }, [selectedClinician, showUnassigned, loadClients]);

  async function reassignClient(clientId: string) {
    const targetId = reassignTargets[clientId];
    setReassigning(clientId);
    await fetch("/api/caseload", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ client_id: clientId, clinician_id: targetId === "__unassign__" ? null : targetId || null }),
    });
    if (showUnassigned) {
      await loadClients(null, true);
    } else if (selectedClinician) {
      await loadClients(selectedClinician.id, false);
    }
    setReassigning(null);
  }

  async function bulkReassign() {
    if (!selectedClients.size || !bulkTarget) return;
    setBulkReassigning(true);
    await fetch("/api/caseload", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        client_ids: Array.from(selectedClients),
        clinician_id: bulkTarget === "__unassign__" ? null : bulkTarget,
      }),
    });
    if (showUnassigned) {
      await loadClients(null, true);
    } else if (selectedClinician) {
      await loadClients(selectedClinician.id, false);
    }
    setSelectedClients(new Set());
    setBulkTarget("");
    setBulkReassigning(false);
  }

  async function saveCapacity(clinicianId: string) {
    setSavingCapacity(true);
    const val = capacityInput.trim() === "" ? null : capacityInput;
    await fetch("/api/caseload", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ clinician_id: clinicianId, caseload_capacity: val }),
    });
    // Optimistically update local summary
    setSummary(prev => prev.map(c =>
      c.id === clinicianId
        ? { ...c, caseload_capacity: val ? parseInt(val, 10) : null }
        : c
    ));
    // Also update selectedClinician if it matches
    setSelectedClinician(prev =>
      prev?.id === clinicianId
        ? { ...prev, caseload_capacity: val ? parseInt(val, 10) : null }
        : prev
    );
    setEditingCapacity(null);
    setSavingCapacity(false);
  }

  const filteredSummary = searchQuery.length >= 1
    ? summary.filter(c =>
        `${c.first_name} ${c.last_name} ${c.credentials || ""} ${c.title || ""}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : summary;

  const panelFiltered = panelSearch.length >= 1
    ? clients.filter(c =>
        `${c.first_name} ${c.last_name} ${c.mrn || ""}`.toLowerCase().includes(panelSearch.toLowerCase())
      )
    : clients;

  const assignedCount = totalActive - unassignedCount;
  const cliniciansWithClients = summary.filter(c => c.count > 0);
  const avgCaseload = cliniciansWithClients.length > 0
    ? Math.round(cliniciansWithClients.reduce((s, c) => s + c.count, 0) / cliniciansWithClients.length)
    : 0;
  const maxCaseload = summary.reduce((m, c) => Math.max(m, c.count), 0);

  const allFilteredSelected = panelFiltered.length > 0 && panelFiltered.every(c => selectedClients.has(c.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedClients(prev => {
        const next = new Set(prev);
        panelFiltered.forEach(c => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedClients(prev => {
        const next = new Set(prev);
        panelFiltered.forEach(c => next.add(c.id));
        return next;
      });
    }
  }

  return (
    <div className="grid grid-cols-3 gap-5">
      {/* Left panel: clinician list */}
      <div className="col-span-1 space-y-3">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search clinicians..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
            {/* Unassigned row */}
            <button
              onClick={() => { setShowUnassigned(true); setSelectedClinician(null); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors ${showUnassigned ? "bg-teal-50 border-l-[3px] border-teal-500" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-xs font-bold flex-shrink-0">?</div>
                <div>
                  <div className="text-sm font-semibold text-slate-700">Unassigned</div>
                  <div className="text-xs text-slate-400">No primary clinician</div>
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${unassignedCount > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                {unassignedCount}
              </span>
            </button>

            {filteredSummary.map(c => {
              const isSelected = selectedClinician?.id === c.id && !showUnassigned;
              const initials = `${c.first_name?.[0] || ""}${c.last_name?.[0] || ""}`;
              // For bar: use capacity if set, else use maxCaseload
              const cap = c.caseload_capacity ?? maxCaseload;
              const pct = cap > 0 ? Math.min((c.count / cap) * 100, 100) : 0;
              const overCapacity = c.caseload_capacity !== null && c.count > c.caseload_capacity;
              const nearCapacity = c.caseload_capacity !== null && !overCapacity && c.count >= Math.floor(c.caseload_capacity * 0.9);
              const barColor = overCapacity ? "bg-red-400" : nearCapacity ? "bg-amber-400" : "bg-teal-400";

              return (
                <div key={c.id} className={`${isSelected ? "bg-teal-50 border-l-[3px] border-teal-500" : ""}`}>
                  <button
                    onClick={() => { setSelectedClinician(c); setShowUnassigned(false); }}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0">{initials}</div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {c.last_name}, {c.first_name}{c.credentials ? `, ${c.credentials}` : ""}
                        </div>
                        {/* Caseload bar */}
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                            <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          {c.caseload_capacity !== null && (
                            <span className={`text-xs flex-shrink-0 ${overCapacity ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                              / {c.caseload_capacity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ml-2 ${overCapacity ? "bg-red-100 text-red-600" : c.count > 0 ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
                      {c.count}
                    </span>
                  </button>

                  {/* Capacity editor — shown when this clinician is selected */}
                  {isSelected && (
                    <div className="px-4 pb-3 flex items-center gap-2">
                      {editingCapacity === c.id ? (
                        <>
                          <input
                            type="number"
                            min="1"
                            value={capacityInput}
                            onChange={e => setCapacityInput(e.target.value)}
                            placeholder="Max panel size"
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 w-28 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            autoFocus
                          />
                          <button
                            onClick={() => saveCapacity(c.id)}
                            disabled={savingCapacity}
                            className="text-xs bg-teal-500 text-white px-2.5 py-1.5 rounded-lg font-semibold hover:bg-teal-400 disabled:opacity-40 transition-colors"
                          >
                            {savingCapacity ? "…" : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingCapacity(null)}
                            className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-1.5"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingCapacity(c.id);
                            setCapacityInput(c.caseload_capacity !== null ? String(c.caseload_capacity) : "");
                          }}
                          className="text-xs text-teal-600 hover:text-teal-800 underline underline-offset-2"
                        >
                          {c.caseload_capacity !== null ? `Capacity: ${c.caseload_capacity} — Edit` : "Set capacity"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredSummary.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-400">No clinicians found</div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Panel Summary</div>
          {[
            { label: `Active ${clientTermPlural}`, value: totalActive, color: "text-slate-900" },
            { label: "Assigned", value: assignedCount, color: "text-slate-900" },
            { label: "Unassigned", value: unassignedCount, color: unassignedCount > 0 ? "text-amber-600 font-semibold" : "text-slate-900" },
            { label: "Avg caseload", value: avgCaseload, color: "text-slate-900" },
            { label: "Max caseload", value: maxCaseload, color: "text-slate-900" },
          ].map(s => (
            <div key={s.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{s.label}</span>
              <span className={s.color}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel: client list */}
      <div className="col-span-2">
        {!selectedClinician && !showUnassigned ? (
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center h-72 text-center p-8">
            <div className="text-5xl mb-4">👥</div>
            <p className="font-semibold text-slate-700">Select a clinician to view their panel</p>
            <p className="text-sm text-slate-400 mt-1.5">
              Or click &quot;Unassigned&quot; to see {clientTermPlural.toLowerCase()} without a primary clinician
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  {showUnassigned ? (
                    <>
                      <h2 className="font-semibold text-slate-900">Unassigned {clientTermPlural}</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{clientTermPlural} without a primary clinician</p>
                    </>
                  ) : (
                    <>
                      <h2 className="font-semibold text-slate-900">
                        {selectedClinician?.first_name} {selectedClinician?.last_name}
                        {selectedClinician?.credentials ? `, ${selectedClinician.credentials}` : ""}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {loadingClients ? "Loading..." : `${clients.length} active ${clientTermPlural.toLowerCase()} in panel`}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Panel search */}
              {!loadingClients && clients.length > 0 && (
                <input
                  type="text"
                  value={panelSearch}
                  onChange={e => setPanelSearch(e.target.value)}
                  placeholder={`Search ${clientTermPlural.toLowerCase()} in this panel...`}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}

              {/* Bulk action bar */}
              {selectedClients.size > 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-teal-50 rounded-xl border border-teal-100">
                  <span className="text-xs font-semibold text-teal-700 flex-shrink-0">
                    {selectedClients.size} selected
                  </span>
                  <select
                    value={bulkTarget}
                    onChange={e => setBulkTarget(e.target.value)}
                    className="text-xs border border-teal-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500 flex-1 min-w-0"
                  >
                    <option value="">Reassign all to...</option>
                    <option value="__unassign__">— Unassign —</option>
                    {summary
                      .filter(c => !showUnassigned ? c.id !== selectedClinician?.id : true)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.last_name}, {c.first_name?.[0]}.{c.credentials ? ` ${c.credentials}` : ""}
                        </option>
                      ))}
                  </select>
                  <button
                    disabled={!bulkTarget || bulkReassigning}
                    onClick={bulkReassign}
                    className="text-xs bg-teal-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    {bulkReassigning ? "Moving…" : "Move"}
                  </button>
                  <button
                    onClick={() => setSelectedClients(new Set())}
                    className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-1.5 flex-shrink-0"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {loadingClients ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading {clientTermPlural.toLowerCase()}...</div>
            ) : clients.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-3xl mb-2">🗂️</div>
                <p className="text-sm text-slate-500">
                  No {clientTermPlural.toLowerCase()} {showUnassigned ? "without a primary clinician" : "in this panel"}
                </p>
              </div>
            ) : (
              <>
                <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 grid grid-cols-12 gap-3 items-center">
                  {/* Select-all checkbox */}
                  <div className="col-span-1 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer"
                      title="Select all"
                    />
                  </div>
                  <span className="col-span-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{clientTermSingular}</span>
                  <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Age</span>
                  <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Seen</span>
                  <span className="col-span-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Reassign</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {panelFiltered.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-slate-400">
                      No {clientTermPlural.toLowerCase()} match &quot;{panelSearch}&quot;
                    </div>
                  ) : (
                    panelFiltered.map(client => {
                      const age = calcAge(client.date_of_birth);
                      const selectedTarget = reassignTargets[client.id] || "";
                      const isChecked = selectedClients.has(client.id);
                      const days = daysSince(client.last_encounter_date);
                      const lastSeenLabel = client.last_encounter_date ? fmtDate(client.last_encounter_date) : null;
                      const staleDays = days !== null && days > 90;

                      return (
                        <div
                          key={client.id}
                          className={`grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-slate-50 transition-colors ${isChecked ? "bg-teal-50" : ""}`}
                        >
                          <div className="col-span-1 flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedClients(prev => {
                                  const next = new Set(prev);
                                  if (next.has(client.id)) next.delete(client.id);
                                  else next.add(client.id);
                                  return next;
                                });
                              }}
                              className="rounded border-slate-300 text-teal-500 focus:ring-teal-500 cursor-pointer"
                            />
                          </div>
                          <div className="col-span-3">
                            <Link href={`/dashboard/clients/${client.id}`} className="group">
                              <div className="font-semibold text-sm text-slate-900 group-hover:text-teal-600 transition-colors truncate">
                                {client.last_name}, {client.first_name}
                              </div>
                              <div className="text-xs text-slate-400 font-mono">{client.mrn || "—"}</div>
                            </Link>
                          </div>
                          <div className="col-span-2 text-sm text-slate-600">
                            {age !== null ? `${age}y` : "—"}
                          </div>
                          <div className="col-span-2 text-xs">
                            {lastSeenLabel ? (
                              <span className={staleDays ? "text-amber-600 font-semibold" : "text-slate-500"} title={`${days} days ago`}>
                                {lastSeenLabel}
                                {staleDays && " ⚠️"}
                              </span>
                            ) : (
                              <span className="text-slate-300">Never</span>
                            )}
                          </div>
                          <div className="col-span-4 flex items-center gap-1.5">
                            <select
                              value={selectedTarget}
                              onChange={e => setReassignTargets(prev => ({ ...prev, [client.id]: e.target.value }))}
                              className="text-xs border border-slate-200 rounded-lg px-1.5 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500 flex-1 min-w-0"
                            >
                              <option value="">Move to...</option>
                              <option value="__unassign__">— Unassign —</option>
                              {summary
                                .filter(c => c.id !== client.primary_clinician_id)
                                .map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.last_name}, {c.first_name?.[0]}.{c.credentials ? ` ${c.credentials}` : ""}
                                  </option>
                                ))}
                            </select>
                            <button
                              disabled={!selectedTarget || reassigning === client.id}
                              onClick={() => reassignClient(client.id)}
                              className="text-xs bg-teal-500 text-white px-2 py-1.5 rounded-lg font-semibold hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                            >
                              {reassigning === client.id ? "…" : "✓"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
