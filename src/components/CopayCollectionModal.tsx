"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  appointmentId: string;
  patientId: string;
  patientName: string;
  copayAmount: number | null;
  onClose: () => void;
  onComplete: () => void;
}

const PAYMENT_METHODS = ["Cash", "Check", "Credit Card", "Debit Card", "ACH / Bank Transfer", "Waived — Financial Hardship", "No copay — Insurance only", "Other"];

export default function CopayCollectionModal({ appointmentId, patientId, patientName, copayAmount, onClose, onComplete }: Props) {
  const [amount, setAmount] = useState(copayAmount?.toFixed(2) || "");
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const router = useRouter();

  async function collect() {
    setSaving(true);
    // Mark appointment as Arrived
    await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "arrived" }),
    });

    // Create copay charge record if amount > 0
    if (parseFloat(amount) > 0 && method !== "No copay — Insurance only") {
      await fetch("/api/billing/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          client_id: patientId,
          appointment_id: appointmentId,
          cpt_code: "COPAY",
          cpt_description: `Copay collected at check-in — ${method}`,
          service_date: new Date().toISOString().split("T")[0],
          charge_amount: parseFloat(amount),
          units: 1,
          status: "paid",
          notes: `Copay collected at check-in. Method: ${method}${reference ? `. Ref: ${reference}` : ""}`,
        }),
      });
    }

    setSaving(false);
    onComplete();
    router.refresh();
  }

  async function skipCopay() {
    setSaving(true);
    await fetch(`/api/appointments/${appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: "arrived" }),
    });
    setSaving(false);
    onComplete();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">Check In — Copay Collection</h2>
              <p className="text-sm text-slate-500 mt-0.5">{patientName}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Copay pre-fill notice */}
          {copayAmount !== null && copayAmount > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">💊</span>
              <div>
                <div className="text-sm font-semibold text-teal-800">Copay on file: ${copayAmount.toFixed(2)}</div>
                <div className="text-xs text-teal-600">Pre-filled from insurance record</div>
              </div>
            </div>
          )}

          {copayAmount === null && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              ⚠️ No copay on file — enter amount below or add insurance info in the patient record.
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Copay Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">$</span>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full border border-slate-200 rounded-xl pl-7 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg font-semibold"
                placeholder="0.00" />
            </div>
          </div>

          {/* Payment method */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              {["Cash", "Check", "Credit Card", "Debit Card", "Waived", "Skip"].map(m => (
                <button key={m} type="button" onClick={() => setMethod(m === "Skip" ? "No copay — Insurance only" : m === "Waived" ? "Waived — Financial Hardship" : m)}
                  className={`py-2 px-3 rounded-xl border text-sm font-medium transition-colors ${
                    (method === m || (m === "Waived" && method === "Waived — Financial Hardship") || (m === "Skip" && method === "No copay — Insurance only"))
                      ? "bg-teal-50 border-teal-300 text-teal-800"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}>
                  {m === "Credit Card" ? "💳 Credit" : m === "Debit Card" ? "💳 Debit" : m === "Cash" ? "💵 Cash" : m === "Check" ? "📝 Check" : m === "Waived" ? "✋ Waived" : "⏭️ Skip"}
                </button>
              ))}
            </div>
          </div>

          {/* Reference number for check */}
          {method === "Check" && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Check Number</label>
              <input value={reference} onChange={e => setReference(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Check #1234" />
            </div>
          )}

          {/* Waived / skip messages */}
          {method === "Waived — Financial Hardship" && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-xs text-amber-700">
              Copay waiver will be documented. Ensure income assessment / sliding fee is on file.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={skipCopay} disabled={saving}
              className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
              Check In Without Copay
            </button>
            <button onClick={collect} disabled={saving}
              className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Saving..." : method === "No copay — Insurance only" ? "Check In" : `Collect $${parseFloat(amount || "0").toFixed(2)} & Check In`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
