"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RegistrationRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  relationship: string;
  patient_name: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  mrn: string | null;
  date_of_birth: string | null;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: "Self (patient)",
  parent: "Parent",
  guardian: "Guardian",
  caregiver: "Caregiver",
  authorized_rep: "Authorized Rep",
  other: "Other",
};

export default function RegistrationRequestsManager({
  requests,
  clients,
}: {
  requests: RegistrationRequest[];
  clients: Client[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  // Per-request state for approval flow
  const [approvalState, setApprovalState] = useState<
    Record<string, { clientId: string; clientSearch: string; rejectionReason: string; mode: "approve" | "reject" | null }>
  >({});

  function getState(id: string) {
    return approvalState[id] ?? { clientId: "", clientSearch: "", rejectionReason: "", mode: null };
  }

  function setState(id: string, patch: Partial<typeof approvalState[string]>) {
    setApprovalState(prev => ({ ...prev, [id]: { ...getState(id), ...patch } }));
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  }

  async function handleApprove(req: RegistrationRequest) {
    const state = getState(req.id);
    if (!state.clientId) {
      showToast("Please select a client record to link this request to.");
      return;
    }
    setProcessingId(req.id);
    const res = await fetch(`/api/portal/registrations/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "approve", client_id: state.clientId }),
    });
    const data = await res.json();
    setProcessingId(null);
    if (res.ok) {
      showToast(data.emailSent ? `Approved — invite email sent to ${req.email}` : `Approved — portal account created (email not sent)`);
      router.refresh();
    } else {
      showToast(`Error: ${data.error}`);
    }
  }

  async function handleReject(req: RegistrationRequest) {
    setProcessingId(req.id);
    const state = getState(req.id);
    const res = await fetch(`/api/portal/registrations/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ action: "reject", rejection_reason: state.rejectionReason || null }),
    });
    const data = await res.json();
    setProcessingId(null);
    if (res.ok) {
      showToast(`Request from ${req.first_name} ${req.last_name} rejected.`);
      router.refresh();
    } else {
      showToast(`Error: ${data.error}`);
    }
  }

  const pendingRequests = requests.filter(r => r.status === "pending");
  const displayRequests = activeTab === "pending" ? pendingRequests : requests;

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`rounded-2xl px-5 py-3 text-sm font-medium ${toast.startsWith("Error") ? "bg-red-50 border border-red-200 text-red-700" : "bg-emerald-50 border border-emerald-200 text-emerald-700"}`}>
          {toast}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-3 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("pending")}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === "pending" ? "border-teal-500 text-teal-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Pending
          {pendingRequests.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 px-1 text-sm font-semibold border-b-2 transition-colors ${activeTab === "all" ? "border-teal-500 text-teal-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          All Requests
        </button>
      </div>

      {/* Request list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {displayRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="text-4xl mb-3">📬</div>
            <p className="font-semibold text-slate-900 mb-1">
              {activeTab === "pending" ? "No pending registration requests" : "No registration requests yet"}
            </p>
            <p className="text-slate-500 text-sm mt-1">
              When patients submit a self-registration request, they'll appear here for your review.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayRequests.map(req => {
              const state = getState(req.id);
              const isExpanded = expandedId === req.id;
              const filteredClients = state.clientSearch
                ? clients.filter(c =>
                    `${c.first_name} ${c.last_name}`.toLowerCase().includes(state.clientSearch.toLowerCase()) ||
                    c.mrn?.toLowerCase().includes(state.clientSearch.toLowerCase())
                  )
                : clients;

              const statusBadge =
                req.status === "pending"
                  ? "bg-amber-100 text-amber-700"
                  : req.status === "approved"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-600";

              return (
                <div key={req.id}>
                  <div
                    className="px-5 py-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-sm flex-shrink-0">
                        {req.first_name[0]}{req.last_name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">{req.first_name} {req.last_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge}`}>
                            {req.status}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 capitalize">
                            {RELATIONSHIP_LABELS[req.relationship] || req.relationship}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{req.email}{req.phone ? ` · ${req.phone}` : ""}</div>
                        {req.patient_name && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            For patient: <span className="font-medium">{req.patient_name}</span>
                          </div>
                        )}
                        <div className="text-xs text-slate-400 mt-0.5">
                          Submitted {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                      <div className="text-slate-400 text-xs flex-shrink-0">{isExpanded ? "▲" : "▼"}</div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-5 bg-slate-50 border-t border-slate-100 space-y-4">
                      {/* Details */}
                      <div className="grid grid-cols-2 gap-3 pt-4">
                        {req.date_of_birth && (
                          <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Date of Birth</p>
                            <p className="text-sm text-slate-900 mt-0.5">{new Date(req.date_of_birth).toLocaleDateString("en-US")}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Relationship</p>
                          <p className="text-sm text-slate-900 mt-0.5 capitalize">{RELATIONSHIP_LABELS[req.relationship] || req.relationship}</p>
                        </div>
                      </div>

                      {req.message && (
                        <div>
                          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">Message from Applicant</p>
                          <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-3 leading-relaxed">{req.message}</p>
                        </div>
                      )}

                      {req.status === "rejected" && req.rejection_reason && (
                        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                          <strong>Rejection reason:</strong> {req.rejection_reason}
                        </div>
                      )}

                      {/* Actions — only for pending */}
                      {req.status === "pending" && (
                        <div className="space-y-3">
                          {/* Mode selector */}
                          {!state.mode && (
                            <div className="flex gap-3">
                              <button
                                onClick={e => { e.stopPropagation(); setState(req.id, { mode: "approve" }); }}
                                className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setState(req.id, { mode: "reject" }); }}
                                className="flex-1 border border-red-200 text-red-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-50"
                              >
                                ✗ Reject
                              </button>
                            </div>
                          )}

                          {/* Approve flow */}
                          {state.mode === "approve" && (
                            <div className="bg-white border border-teal-200 rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
                              <p className="text-sm font-semibold text-slate-900">Link to an existing client record</p>
                              <p className="text-xs text-slate-500">
                                Select the client in your system that this registration request belongs to. The portal account will be linked to this record.
                              </p>
                              <input
                                type="text"
                                value={state.clientSearch}
                                onChange={e => setState(req.id, { clientSearch: e.target.value })}
                                placeholder="Search by name or MRN…"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                              {filteredClients.length > 0 && (
                                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                                  {filteredClients.slice(0, 20).map(c => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => setState(req.id, { clientId: c.id, clientSearch: `${c.last_name}, ${c.first_name}${c.mrn ? ` — ${c.mrn}` : ""}` })}
                                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between ${state.clientId === c.id ? "bg-teal-50" : ""}`}
                                    >
                                      <span className="font-medium text-slate-900">{c.last_name}, {c.first_name}</span>
                                      <span className="text-xs text-slate-400">{c.mrn || "No MRN"}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {state.clientId && (
                                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-2.5 text-sm text-teal-800 font-medium">
                                  ✓ Linked to: {state.clientSearch}
                                </div>
                              )}
                              <div className="flex gap-3">
                                <button
                                  onClick={() => setState(req.id, { mode: null, clientId: "", clientSearch: "" })}
                                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-medium hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleApprove(req)}
                                  disabled={processingId === req.id || !state.clientId}
                                  className="flex-1 bg-teal-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50"
                                >
                                  {processingId === req.id ? "Processing…" : "Approve & Send Invite"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Reject flow */}
                          {state.mode === "reject" && (
                            <div className="bg-white border border-red-200 rounded-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
                              <p className="text-sm font-semibold text-slate-900">Reject this request</p>
                              <textarea
                                value={state.rejectionReason}
                                onChange={e => setState(req.id, { rejectionReason: e.target.value })}
                                placeholder="Optional: reason for rejection (not shown to the applicant)"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                                rows={2}
                              />
                              <div className="flex gap-3">
                                <button
                                  onClick={() => setState(req.id, { mode: null, rejectionReason: "" })}
                                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-medium hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleReject(req)}
                                  disabled={processingId === req.id}
                                  className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-red-400 disabled:opacity-50"
                                >
                                  {processingId === req.id ? "Rejecting…" : "Confirm Reject"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
