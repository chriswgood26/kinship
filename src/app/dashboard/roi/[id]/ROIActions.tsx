"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ROI { id: string; status: string; patient_signed_at: string | null; is_revocable: boolean; requested_via_portal?: boolean; staff_reviewed?: boolean; }

export default function ROIActions({ roi }: { roi: ROI }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [showRevoke, setShowRevoke] = useState(false);
  const router = useRouter();

  async function update(patch: Record<string, string | boolean | null>) {
    const res = await fetch(`/api/roi/${roi.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(patch),
    });
    if (res.ok) router.refresh();
    setSaving(null);
  }

  async function markSigned() {
    setSaving("sign");
    await update({ patient_signed_at: new Date().toISOString(), status: "active" });
  }

  async function revoke() {
    setSaving("revoke");
    await update({ status: "revoked", revoked_at: new Date().toISOString(), revocation_reason: revokeReason || null });
    setShowRevoke(false);
  }

  async function markStaffReviewed() {
    setSaving("review");
    await update({ staff_reviewed: true, staff_reviewed_at: new Date().toISOString() });
  }

  if (roi.status === "revoked") return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 no-print">
      <h3 className="font-semibold text-slate-900">Actions</h3>
      <div className="flex flex-wrap gap-2">
        {roi.requested_via_portal && !roi.staff_reviewed && (
          <button onClick={markStaffReviewed} disabled={saving === "review"}
            className="bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-400 disabled:opacity-50">
            {saving === "review" ? "..." : "✓ Mark Portal Request Reviewed"}
          </button>
        )}
        {roi.status === "pending_signature" && !roi.patient_signed_at && (
          <button onClick={markSigned} disabled={saving === "sign"}
            className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50">
            {saving === "sign" ? "..." : "✓ Mark Patient Signed → Activate"}
          </button>
        )}
        {roi.status === "active" && (
          <button onClick={() => update({ status: "pending_signature", patient_signed_at: null })} disabled={!!saving}
            className="border border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-50">
            ← Mark Pending Signature
          </button>
        )}
        {roi.is_revocable && roi.status !== "revoked" && (
          <button onClick={() => setShowRevoke(!showRevoke)}
            className="border border-red-200 text-red-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-50">
            Revoke Authorization
          </button>
        )}
      </div>

      {showRevoke && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold text-red-800">Revoke this authorization?</div>
          <p className="text-xs text-red-600">This immediately stops all sharing of records under this ROI. Document the reason.</p>
          <input value={revokeReason} onChange={e => setRevokeReason(e.target.value)}
            className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="Reason for revocation (optional)" />
          <div className="flex gap-2">
            <button onClick={() => setShowRevoke(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium hover:bg-white">Cancel</button>
            <button onClick={revoke} disabled={saving === "revoke"}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-50">
              {saving === "revoke" ? "Revoking..." : "Confirm Revocation"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
