"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Invoice {
  id: string;
  status: string;
  balance_due: number;
  client_id: string;
}

const PAYMENT_METHODS = ["Cash", "Check", "Credit Card", "Debit Card", "ACH / Bank Transfer", "Money Order", "Other"];

export default function InvoiceActions({ invoice }: { invoice: Invoice }) {
  const [showPayment, setShowPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: Number(invoice.balance_due).toFixed(2),
    payment_method: "Cash",
    payment_date: new Date().toISOString().split("T")[0],
    reference_number: "",
    notes: "",
  });
  const router = useRouter();

  const [sendingLink, setSendingLink] = useState(false);
  const [onlinePaymentError, setOnlinePaymentError] = useState("");

  async function sendPaymentLink() {
    setSendingLink(true);
    setOnlinePaymentError("");
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ invoice_id: invoice.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setOnlinePaymentError(data.error || "Failed to create payment link");
    } else if (data.url) {
      // Open in new tab — staff can copy link and send to patient
      window.open(data.url, "_blank");
    }
    setSendingLink(false);
  }

  async function recordPayment() {
    setSaving(true);
    await fetch("/api/billing/invoices/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        invoice_id: invoice.id,
        client_id: invoice.client_id,
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
      }),
    });
    setSaving(false);
    setShowPayment(false);
    router.refresh();
  }

  async function updateStatus(status: string) {
    await fetch(`/api/billing/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  const inputClass = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500";
  const labelClass = "text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5";

  if (invoice.status === "paid") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center no-print">
        <div className="text-2xl mb-2">✅</div>
        <div className="font-semibold text-emerald-800">Invoice Paid in Full</div>
        <div className="text-sm text-emerald-600 mt-0.5">No balance remaining</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 no-print">
      {invoice.status !== "paid" && Number(invoice.balance_due) > 0 && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="font-semibold text-violet-900 text-sm mb-1">💳 Accept Online Payment</div>
          <p className="text-xs text-violet-700 mb-3">Generate a Stripe payment link — send to patient via email or portal message. Funds deposit directly to your bank account.</p>
          {onlinePaymentError && <p className="text-xs text-red-600 mb-2">⚠️ {onlinePaymentError}</p>}
          <button onClick={sendPaymentLink} disabled={sendingLink}
            className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
            {sendingLink ? "Generating..." : "🔗 Generate Payment Link"}
          </button>
          <p className="text-xs text-violet-500 mt-2">Requires Stripe to be connected in Admin → Settings → Online Payments.</p>
        </div>
      )}
      <h3 className="font-semibold text-slate-900">Invoice Actions</h3>

      <div className="flex flex-wrap gap-2">
        {invoice.status !== "sent" && (
          <button onClick={() => updateStatus("sent")}
            className="border border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-50">
            📤 Mark as Sent
          </button>
        )}
        <button onClick={() => setShowPayment(!showPayment)}
          className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-teal-400">
          💵 Record Payment
        </button>
        <button onClick={() => updateStatus("voided")}
          className="border border-red-200 text-red-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-50">
          Void Invoice
        </button>
      </div>

      {showPayment && (
        <div className="border border-teal-100 bg-teal-50/30 rounded-2xl p-5 space-y-4">
          <h4 className="font-semibold text-slate-900 text-sm">Record Payment</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Amount ($)</label>
              <input type="number" step="0.01" value={paymentForm.amount}
                onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Payment Method</label>
              <select value={paymentForm.payment_method}
                onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                className={inputClass}>
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Payment Date</label>
              <input type="date" value={paymentForm.payment_date}
                onChange={e => setPaymentForm(f => ({ ...f, payment_date: e.target.value }))}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Reference / Check #</label>
              <input type="text" value={paymentForm.reference_number}
                onChange={e => setPaymentForm(f => ({ ...f, reference_number: e.target.value }))}
                className={inputClass} placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <input type="text" value={paymentForm.notes}
              onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
              className={inputClass} placeholder="Payment notes..." />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowPayment(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
            <button onClick={recordPayment} disabled={saving || !paymentForm.amount}
              className="flex-1 bg-teal-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-teal-400 disabled:opacity-50">
              {saving ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
