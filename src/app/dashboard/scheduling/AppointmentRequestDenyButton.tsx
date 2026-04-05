"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  requestId: string;
  selectedDate: string;
}

export default function AppointmentRequestDenyButton({ requestId, selectedDate }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDeny() {
    if (!confirm("Deny this appointment request? The patient will be notified.")) return;
    setLoading(true);
    try {
      await fetch(`/api/appointment-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "deny" }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDeny}
      disabled={loading}
      className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
    >
      {loading ? "..." : "✕ Deny"}
    </button>
  );
}
