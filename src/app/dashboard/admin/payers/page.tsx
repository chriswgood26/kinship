"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClearinghouseId {
  id: string;
  clearinghouse: string;
  clearinghouse_payer_id: string;
  is_default: boolean;
  notes?: string;
}

interface Payer {
  id: string;
  name: string;
  payer_type: string;
  state?: string;
  notes?: string;
  is_active: boolean;
  clearinghouse_ids: ClearinghouseId[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLEARINGHOUSES = [
  { id: "office_ally",       label: "Office Ally" },
  { id: "availity",          label: "Availity" },
  { id: "change_healthcare", label: "Change Healthcare" },
  { id: "waystar",           label: "Waystar" },
];

const PAYER_TYPES = [
  { value: "commercial", label: "Commercial" },
  { value: "medicaid",   label: "Medicaid" },
  { value: "medicare",   label: "Medicare" },
  { value: "tricare",    label: "TRICARE" },
  { value: "other",      label: "Other" },
];

const CH_LABEL: Record<string, string> = {
  office_ally:       "Office Ally",
  availity:          "Availity",
  change_healthcare: "Change Healthcare",
  waystar:           "Waystar",
};

const CH_COLORS: Record<string, string> = {
  office_ally:       "bg-teal-50 text-teal-700 border-teal-200",
  availity:          "bg-blue-50 text-blue-700 border-blue-200",
  change_healthcare: "bg-violet-50 text-violet-700 border-violet-200",
  waystar:           "bg-amber-50 text-amber-700 border-amber-200",
};

const TYPE_COLORS: Record<string, string> = {
  commercial: "bg-slate-100 text-slate-600",
  medicaid:   "bg-emerald-100 text-emerald-700",
  medicare:   "bg-blue-100 text-blue-700",
  tricare:    "bg-violet-100 text-violet-700",
  other:      "bg-amber-100 text-amber-700",
};

const BLANK_PAYER = { name: "", payer_type: "commercial", state: "", notes: "", is_active: true };
const BLANK_CH_ID = { clearinghouse: "office_ally", clearinghouse_payer_id: "", is_default: false, notes: "" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function PayersAdminPage() {
  const [payers, setPayers] = useState<Payer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal state
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [editingPayer, setEditingPayer] = useState<Payer | null>(null);
  const [payerForm, setPayerForm] = useState(BLANK_PAYER);
  const [saving, setSaving] = useState(false);

  // Clearinghouse ID modal
  const [showChModal, setShowChModal] = useState(false);
  const [chTargetPayer, setChTargetPayer] = useState<Payer | null>(null);
  const [editingChId, setEditingChId] = useState<ClearinghouseId | null>(null);
  const [chForm, setChForm] = useState(BLANK_CH_ID);
  const [savingCh, setSavingCh] = useState(false);

  const [notice, setNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showNotice = (type: "success" | "error", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 5000);
  };

  const loadPayers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payers", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPayers(data.payers || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayers(); }, [loadPayers]);

  // ── Payer CRUD ──────────────────────────────────────────────────────────────

  function openNewPayer() {
    setEditingPayer(null);
    setPayerForm(BLANK_PAYER);
    setShowPayerModal(true);
  }

  function openEditPayer(p: Payer) {
    setEditingPayer(p);
    setPayerForm({
      name: p.name,
      payer_type: p.payer_type,
      state: p.state || "",
      notes: p.notes || "",
      is_active: p.is_active,
    });
    setShowPayerModal(true);
  }

  async function savePayer() {
    if (!payerForm.name.trim()) return;
    setSaving(true);
    try {
      const url = editingPayer ? `/api/payers/${editingPayer.id}` : "/api/payers";
      const method = editingPayer ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payerForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice("error", data.error || "Save failed");
      } else {
        showNotice("success", editingPayer ? "Payer updated." : "Payer added.");
        setShowPayerModal(false);
        await loadPayers();
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePayerActive(p: Payer) {
    const res = await fetch(`/api/payers/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    if (res.ok) {
      showNotice("success", p.is_active ? "Payer deactivated." : "Payer activated.");
      await loadPayers();
    }
  }

  async function deletePayer(p: Payer) {
    if (!confirm(`Delete "${p.name}"? This will also remove all clearinghouse ID mappings.`)) return;
    const res = await fetch(`/api/payers/${p.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      showNotice("success", "Payer deleted.");
      await loadPayers();
    } else {
      showNotice("error", "Delete failed.");
    }
  }

  // ── Clearinghouse ID CRUD ───────────────────────────────────────────────────

  function openNewChId(payer: Payer) {
    setChTargetPayer(payer);
    setEditingChId(null);
    setChForm(BLANK_CH_ID);
    setShowChModal(true);
  }

  function openEditChId(payer: Payer, ch: ClearinghouseId) {
    setChTargetPayer(payer);
    setEditingChId(ch);
    setChForm({
      clearinghouse: ch.clearinghouse,
      clearinghouse_payer_id: ch.clearinghouse_payer_id,
      is_default: ch.is_default,
      notes: ch.notes || "",
    });
    setShowChModal(true);
  }

  async function saveChId() {
    if (!chForm.clearinghouse_payer_id.trim() || !chTargetPayer) return;
    setSavingCh(true);
    try {
      const url = editingChId
        ? `/api/payers/${chTargetPayer.id}/clearinghouse-ids/${editingChId.id}`
        : `/api/payers/${chTargetPayer.id}/clearinghouse-ids`;
      const method = editingChId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(chForm),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice("error", data.error || "Save failed");
      } else {
        showNotice("success", editingChId ? "Clearinghouse ID updated." : "Clearinghouse ID added.");
        setShowChModal(false);
        await loadPayers();
      }
    } finally {
      setSavingCh(false);
    }
  }

  async function deleteChId(payer: Payer, ch: ClearinghouseId) {
    if (!confirm(`Remove ${CH_LABEL[ch.clearinghouse] || ch.clearinghouse} payer ID "${ch.clearinghouse_payer_id}"?`)) return;
    const res = await fetch(`/api/payers/${payer.id}/clearinghouse-ids/${ch.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      showNotice("success", "Clearinghouse ID removed.");
      await loadPayers();
    } else {
      showNotice("error", "Delete failed.");
    }
  }

  async function setDefaultCh(payer: Payer, ch: ClearinghouseId) {
    const res = await fetch(`/api/payers/${payer.id}/clearinghouse-ids/${ch.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_default: true }),
    });
    if (res.ok) {
      showNotice("success", `${CH_LABEL[ch.clearinghouse] || ch.clearinghouse} set as default clearinghouse.`);
      await loadPayers();
    }
  }

  // ── Filter ──────────────────────────────────────────────────────────────────

  const filtered = payers.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass =
    "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/admin/settings" className="text-slate-400 hover:text-slate-600 text-sm">←</Link>
            <h1 className="text-2xl font-bold text-slate-900">Payer Management</h1>
          </div>
          <p className="text-slate-500 text-sm">
            Manage your payer list and map clearinghouse-specific payer IDs for EDI claim routing.
          </p>
        </div>
        <button
          onClick={openNewPayer}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 transition-colors"
        >
          + Add Payer
        </button>
      </div>

      {/* Notice */}
      {notice && (
        <div
          className={`px-4 py-3 rounded-xl text-sm font-medium border ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {notice.msg}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">How clearinghouse payer IDs work</p>
        <p className="text-blue-700">
          Each payer (e.g. "Oregon Health Plan") may have a different ID assigned by each clearinghouse.
          Add the payer IDs from your clearinghouse payer lists below, then mark one clearinghouse as the
          <strong> default</strong> for each payer. When submitting claims, you can override the default
          clearinghouse per submission.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search payers…"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
      </div>

      {/* Payer list */}
      {loading ? (
        <div className="p-10 text-center text-slate-400 text-sm">Loading payers…</div>
      ) : !filtered.length ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-4xl mb-3">🏥</div>
          <p className="font-semibold text-slate-900 mb-1">
            {search ? "No payers match your search" : "No payers yet"}
          </p>
          <p className="text-slate-500 text-sm mb-4">
            Add your insurance payers to map clearinghouse-specific payer IDs.
          </p>
          {!search && (
            <button
              onClick={openNewPayer}
              className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400"
            >
              + Add Your First Payer
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(payer => (
            <div
              key={payer.id}
              className={`bg-white rounded-2xl border border-slate-200 overflow-hidden transition-opacity ${
                !payer.is_active ? "opacity-60" : ""
              }`}
            >
              {/* Payer header row */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{payer.name}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                          TYPE_COLORS[payer.payer_type] || TYPE_COLORS.other
                        }`}
                      >
                        {payer.payer_type}
                      </span>
                      {payer.state && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                          {payer.state}
                        </span>
                      )}
                      {!payer.is_active && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                          Inactive
                        </span>
                      )}
                    </div>
                    {payer.notes && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-md">{payer.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => openNewChId(payer)}
                    className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-100 font-medium transition-colors"
                  >
                    + Clearinghouse ID
                  </button>
                  <button
                    onClick={() => openEditPayer(payer)}
                    className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => togglePayerActive(payer)}
                    className={`text-xs border px-3 py-1.5 rounded-lg transition-colors ${
                      payer.is_active
                        ? "text-amber-600 border-amber-200 hover:bg-amber-50"
                        : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    }`}
                  >
                    {payer.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => deletePayer(payer)}
                    className="text-xs text-red-400 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Clearinghouse IDs */}
              <div className="px-5 py-3">
                {!payer.clearinghouse_ids?.length ? (
                  <div className="text-xs text-slate-400 italic py-1">
                    No clearinghouse IDs assigned.{" "}
                    <button
                      onClick={() => openNewChId(payer)}
                      className="text-teal-600 hover:underline"
                    >
                      Add one
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {payer.clearinghouse_ids.map(ch => (
                      <div
                        key={ch.id}
                        className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 text-xs font-medium ${
                          CH_COLORS[ch.clearinghouse] || "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        <span className="font-semibold">
                          {CH_LABEL[ch.clearinghouse] || ch.clearinghouse}
                        </span>
                        <span className="font-mono bg-white/60 px-1.5 py-0.5 rounded">
                          {ch.clearinghouse_payer_id}
                        </span>
                        {ch.is_default && (
                          <span className="text-[10px] bg-teal-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                            DEFAULT
                          </span>
                        )}
                        {ch.notes && (
                          <span className="text-[10px] opacity-70">{ch.notes}</span>
                        )}
                        <div className="flex items-center gap-1 ml-1">
                          {!ch.is_default && (
                            <button
                              onClick={() => setDefaultCh(payer, ch)}
                              title="Set as default clearinghouse"
                              className="opacity-60 hover:opacity-100 text-[10px] hover:text-teal-600 transition-opacity"
                            >
                              ★
                            </button>
                          )}
                          <button
                            onClick={() => openEditChId(payer, ch)}
                            title="Edit"
                            className="opacity-60 hover:opacity-100 transition-opacity"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteChId(payer, ch)}
                            title="Remove"
                            className="opacity-60 hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Payer Modal ── */}
      {showPayerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-lg">
                {editingPayer ? "Edit Payer" : "Add Payer"}
              </h2>
              <button
                onClick={() => setShowPayerModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelClass}>Payer Name *</label>
                <input
                  value={payerForm.name}
                  onChange={e => setPayerForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Oregon Health Plan"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Type</label>
                  <select
                    value={payerForm.payer_type}
                    onChange={e => setPayerForm(f => ({ ...f, payer_type: e.target.value }))}
                    className={inputClass}
                  >
                    {PAYER_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    value={payerForm.state}
                    onChange={e => setPayerForm(f => ({ ...f, state: e.target.value }))}
                    placeholder="OR, WA, Multi, Federal…"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={payerForm.notes}
                  onChange={e => setPayerForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Optional notes…"
                  className={inputClass + " resize-none"}
                />
              </div>
              {editingPayer && (
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payerForm.is_active}
                    onChange={e => setPayerForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  Active
                </label>
              )}
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowPayerModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={savePayer}
                disabled={saving || !payerForm.name.trim()}
                className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingPayer ? "Save Changes" : "Add Payer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clearinghouse ID Modal ── */}
      {showChModal && chTargetPayer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">
                  {editingChId ? "Edit Clearinghouse ID" : "Add Clearinghouse ID"}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Payer: {chTargetPayer.name}</p>
              </div>
              <button
                onClick={() => setShowChModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={labelClass}>Clearinghouse *</label>
                <select
                  value={chForm.clearinghouse}
                  onChange={e => setChForm(f => ({ ...f, clearinghouse: e.target.value }))}
                  disabled={!!editingChId}
                  className={inputClass + (editingChId ? " opacity-60" : "")}
                >
                  {CLEARINGHOUSES.map(ch => (
                    <option key={ch.id} value={ch.id}>{ch.label}</option>
                  ))}
                </select>
                {editingChId && (
                  <p className="text-xs text-slate-400 mt-1">
                    Clearinghouse cannot be changed. Delete and re-add to use a different one.
                  </p>
                )}
              </div>
              <div>
                <label className={labelClass}>
                  {CH_LABEL[chForm.clearinghouse] || chForm.clearinghouse} Payer ID *
                </label>
                <input
                  value={chForm.clearinghouse_payer_id}
                  onChange={e => setChForm(f => ({ ...f, clearinghouse_payer_id: e.target.value }))}
                  placeholder="e.g. OROHP, SB00001, 87726…"
                  className={inputClass + " font-mono"}
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1">
                  The payer ID as listed in the {CH_LABEL[chForm.clearinghouse] || chForm.clearinghouse} payer directory.
                </p>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <input
                  value={chForm.notes}
                  onChange={e => setChForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional note…"
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chForm.is_default}
                  onChange={e => setChForm(f => ({ ...f, is_default: e.target.checked }))}
                  className="rounded"
                />
                <span>
                  Set as default clearinghouse for this payer
                </span>
              </label>
              <p className="text-xs text-slate-400 -mt-2">
                When submitting claims for this payer, this clearinghouse will be pre-selected.
              </p>
            </div>
            <div className="flex gap-3 justify-end px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowChModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={saveChId}
                disabled={savingCh || !chForm.clearinghouse_payer_id.trim()}
                className="bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
              >
                {savingCh ? "Saving…" : editingChId ? "Save Changes" : "Add ID"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
