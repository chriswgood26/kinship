"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Submission {
  id: string;
  submission_date: string;
  status: string;
  clearinghouse: string;
  submission_id?: string;
  control_number?: string;
  charge_ids: string[];
  ack_status?: string;
  ack_errors?: string[];
  ack_date?: string;
  error_message?: string;
}

interface Remittance {
  id: string;
  payment_date: string;
  payer_name: string;
  check_number: string;
  payment_method: string;
  total_payment_amount: number;
  claims_count: number;
  posted_at?: string;
  auto_posted: boolean;
  post_errors?: string[];
}

interface Charge {
  id: string;
  service_date: string;
  cpt_code: string;
  cpt_description?: string;
  charge_amount: number;
  status: string;
  client?: { first_name: string; last_name: string; mrn?: string };
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  acknowledged: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
  failed: "bg-red-100 text-red-600",
  pending: "bg-amber-100 text-amber-700",
};

const ACK_COLORS: Record<string, string> = {
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-600",
};

export default function ClearinghousePage() {
  const [tab, setTab] = useState<"submissions" | "era" | "submit">("submissions");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [pendingCharges, setPendingCharges] = useState<Charge[]>([]);
  const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [posting, setPosting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showNotice = (type: "success" | "error", msg: string) => {
    setNotice({ type, msg });
    setTimeout(() => setNotice(null), 6000);
  };

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clearinghouse/acknowledgments", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRemittances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clearinghouse/era", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setRemittances(data.remittances || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPendingCharges = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing?status=pending&limit=100", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPendingCharges(data.charges || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "submissions") loadSubmissions();
    else if (tab === "era") loadRemittances();
    else if (tab === "submit") loadPendingCharges();
  }, [tab, loadSubmissions, loadRemittances, loadPendingCharges]);

  const pollAcknowledgments = async () => {
    setPolling(true);
    try {
      const res = await fetch("/api/clearinghouse/acknowledgments", { credentials: "include" });
      const data = await res.json();
      if (data.fetchError) {
        showNotice("error", `Poll failed: ${data.fetchError}`);
      } else {
        setSubmissions(data.submissions || []);
        const ackCount = (data.acks || []).length;
        showNotice("success", ackCount > 0 ? `Processed ${ackCount} acknowledgment(s).` : "No new acknowledgments.");
      }
    } finally {
      setPolling(false);
    }
  };

  const fetchAndPostERAs = async () => {
    setPosting(true);
    try {
      const res = await fetch("/api/clearinghouse/era", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        showNotice("error", data.error || "ERA fetch failed");
      } else {
        await loadRemittances();
        showNotice(
          "success",
          `Fetched ${data.erasFetched} ERA(s). Posted ${data.erasPosted} successfully.`
        );
      }
    } finally {
      setPosting(false);
    }
  };

  const submitClaims = async () => {
    if (!selectedChargeIds.size) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/clearinghouse/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ charge_ids: Array.from(selectedChargeIds) }),
      });
      const data = await res.json();
      if (data.success) {
        showNotice("success", `${data.chargesSubmitted} claim(s) submitted to Office Ally.`);
        setSelectedChargeIds(new Set());
        await loadPendingCharges();
      } else {
        showNotice("error", data.error || "Submission failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCharge = (id: string) => {
    setSelectedChargeIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedChargeIds(new Set(pendingCharges.map(c => c.id)));
  };

  const clearAll = () => setSelectedChargeIds(new Set());

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clearinghouse</h1>
          <p className="text-slate-500 text-sm mt-0.5">Office Ally EDI — claim submission, 999 acknowledgments, ERA/835 auto-posting</p>
        </div>
        <Link href="/dashboard/billing" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          ← Back to Billing
        </Link>
      </div>

      {/* Notice */}
      {notice && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          notice.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {notice.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {(["submissions", "era", "submit"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "submissions" ? "999 Acknowledgments" : t === "era" ? "ERA / 835" : "Submit Claims"}
          </button>
        ))}
      </div>

      {/* ── Submissions / 999 Acks ── */}
      {tab === "submissions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Claim submission status and functional acknowledgments from Office Ally.
            </p>
            <button
              onClick={pollAcknowledgments}
              disabled={polling}
              className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
            >
              {polling ? "Polling…" : "↻ Poll Acknowledgments"}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : !submissions.length ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-semibold text-slate-900 mb-1">No submissions yet</p>
                <p className="text-slate-500 text-sm">Submit claims from the &quot;Submit Claims&quot; tab to see them here.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Submission ID</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Control #</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Charges</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">999 ACK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {submissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {new Date(sub.submission_date).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-500">
                        {sub.submission_id || "—"}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-500">
                        {sub.control_number || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {sub.charge_ids?.length || 0}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[sub.status] || STATUS_COLORS.pending}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {sub.ack_status ? (
                          <div>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${ACK_COLORS[sub.ack_status] || "bg-slate-100 text-slate-600"}`}>
                              {sub.ack_status}
                            </span>
                            {sub.ack_errors && sub.ack_errors.length > 0 && (
                              <div className="mt-1 text-xs text-red-600">
                                {sub.ack_errors.slice(0, 2).map((e, i) => <div key={i}>{e}</div>)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Awaiting</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── ERA / 835 ── */}
      {tab === "era" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Electronic Remittance Advice — auto-posts payments and adjustments to matched charges.
            </p>
            <button
              onClick={fetchAndPostERAs}
              disabled={posting}
              className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
            >
              {posting ? "Fetching & Posting…" : "↻ Fetch & Post ERAs"}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : !remittances.length ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">💳</div>
                <p className="font-semibold text-slate-900 mb-1">No remittances yet</p>
                <p className="text-slate-500 text-sm">Click &quot;Fetch &amp; Post ERAs&quot; to pull 835 files from Office Ally.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Date</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Payer</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Check / EFT #</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Method</th>
                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Claims</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {remittances.map(rem => (
                    <tr key={rem.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {rem.payment_date
                          ? new Date(rem.payment_date + "T12:00:00").toLocaleDateString("en-US", {
                              month: "short", day: "numeric", year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-slate-900">
                        {rem.payer_name || "—"}
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-500">
                        {rem.check_number || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {rem.payment_method || "—"}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                        ${Number(rem.total_payment_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {rem.claims_count || 0}
                      </td>
                      <td className="px-4 py-4">
                        {rem.auto_posted ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-emerald-100 text-emerald-700">
                            Auto-posted
                          </span>
                        ) : rem.post_errors?.length ? (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-600">
                            {rem.post_errors.length} error(s)
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                            Partial
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Submit Claims ── */}
      {tab === "submit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Select pending charges to batch-submit as 837P claims to Office Ally.
            </p>
            <div className="flex gap-2">
              {pendingCharges.length > 0 && (
                <>
                  <button onClick={selectAll} className="text-xs text-teal-600 hover:underline">Select all</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={clearAll} className="text-xs text-slate-500 hover:underline">Clear</button>
                </>
              )}
              <button
                onClick={submitClaims}
                disabled={submitting || selectedChargeIds.size === 0}
                className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting…" : `Submit ${selectedChargeIds.size > 0 ? selectedChargeIds.size : ""} Claim(s)`}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : !pendingCharges.length ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-semibold text-slate-900 mb-1">No pending charges</p>
                <p className="text-slate-500 text-sm">All charges have been submitted or there are no charges yet.</p>
                <Link href="/dashboard/billing/new" className="inline-block mt-3 bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
                  + Add Charge
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedChargeIds.size === pendingCharges.length}
                        onChange={selectedChargeIds.size === pendingCharges.length ? clearAll : selectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Service Date</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">CPT</th>
                    <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pendingCharges.map(charge => {
                    const client = Array.isArray(charge.client) ? charge.client[0] : charge.client;
                    return (
                      <tr
                        key={charge.id}
                        onClick={() => toggleCharge(charge.id)}
                        className={`cursor-pointer transition-colors ${selectedChargeIds.has(charge.id) ? "bg-teal-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selectedChargeIds.has(charge.id)}
                            onChange={() => toggleCharge(charge.id)}
                            onClick={e => e.stopPropagation()}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-900 text-sm">
                            {client ? `${client.last_name}, ${client.first_name}` : "—"}
                          </div>
                          {client?.mrn && <div className="text-xs text-slate-400">{client.mrn}</div>}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {charge.service_date
                            ? new Date(charge.service_date + "T12:00:00").toLocaleDateString("en-US", {
                                month: "short", day: "numeric", year: "numeric",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-mono font-bold text-sm text-slate-900">{charge.cpt_code}</div>
                          {charge.cpt_description && (
                            <div className="text-xs text-slate-400">{charge.cpt_description}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                          {charge.charge_amount ? `$${Number(charge.charge_amount).toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
