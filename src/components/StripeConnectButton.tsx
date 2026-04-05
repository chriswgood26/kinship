"use client";

import { useState, useEffect } from "react";

interface StripeStatus {
  connected: boolean;
  account_id: string | null;
  account_email: string | null;
  onboarding_complete: boolean;
}

export default function StripeConnectButton() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  async function fetchStatus() {
    const res = await fetch("/api/stripe/connect", { credentials: "include" });
    if (res.ok) setStatus(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchStatus(); }, []);

  async function connect() {
    setConnecting(true);
    const res = await fetch("/api/stripe/connect", {
      method: "POST", credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    }
    setConnecting(false);
  }

  async function disconnect() {
    if (!confirm("Disconnect Stripe? Patients will no longer be able to pay invoices online.")) return;
    await fetch("/api/stripe/connect", { method: "DELETE", credentials: "include" });
    fetchStatus();
  }

  if (loading) return <div className="text-sm text-slate-400">Loading Stripe status...</div>;

  if (!status?.connected) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <div className="font-semibold mb-1">Stripe not connected</div>
          <p className="text-xs">Connect your Stripe account to accept online payments from patients. Payments go directly to your bank account.</p>
        </div>
        <button onClick={connect} disabled={connecting}
          className="flex items-center gap-2 bg-[#635bff] hover:bg-[#5348e6] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.91 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg>
          {connecting ? "Connecting..." : "Connect Stripe"}
        </button>
        <p className="text-xs text-slate-400">You'll be redirected to Stripe to set up your account. No Stripe account? One will be created for you.</p>
      </div>
    );
  }

  if (status.connected && !status.onboarding_complete) {
    return (
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <div className="font-semibold mb-1">⏳ Stripe setup incomplete</div>
          <p className="text-xs">Your Stripe account was created but onboarding isn't finished. Complete setup to accept payments.</p>
        </div>
        <button onClick={connect} disabled={connecting}
          className="bg-amber-500 hover:bg-amber-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50">
          {connecting ? "Loading..." : "Complete Stripe Setup →"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-emerald-600">✓</span>
          <span className="font-semibold text-emerald-800 text-sm">Stripe Connected</span>
        </div>
        {status.account_email && <p className="text-xs text-emerald-600">{status.account_email}</p>}
        <p className="text-xs text-emerald-600 mt-0.5">Patients can now pay invoices online. Payments go directly to your bank account.</p>
      </div>
      <div className="flex gap-2">
        <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
          className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
          Open Stripe Dashboard →
        </a>
        <button onClick={disconnect} className="text-xs text-red-400 hover:text-red-600 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50">
          Disconnect
        </button>
      </div>
    </div>
  );
}
