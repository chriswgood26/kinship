"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  status: string;
  guardian_name: string | null;
  guardian_relationship: string | null;
  guardian_signed_at: string | null;
  client_signed_at: string | null;
  coordinator_signed_at: string | null;
  supervisor_signed_at?: string | null;
  next_review_date?: string | null;
}

export default function ISPSignatureManager({ plan }: { plan: Plan }) {
  const [saving, setSaving] = useState<string | null>(null);
  const [status, setStatus] = useState(plan.status);
  const [sigs, setSigs] = useState({
    guardian: plan.guardian_signed_at,
    client: plan.client_signed_at,
    coordinator: plan.coordinator_signed_at,
    supervisor: plan.supervisor_signed_at || null,
  });
  const router = useRouter();

  async function sign(type: "guardian" | "client" | "coordinator" | "supervisor") {
    setSaving(type);
    const field = `${type}_signed_at`;
    const now = new Date().toISOString();
    const patch: Record<string, string> = { [field]: now };
    if (type === "supervisor") patch.status = "active";
    const res = await fetch(`/api/isp/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setSigs(s => ({ ...s, [type]: now }));
      const newSigs = { ...sigs, [type]: now };
      if (newSigs.guardian && newSigs.coordinator) {
        await fetch(`/api/isp/${plan.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "active" }) });
        setStatus("active");
      }
      router.refresh();
    }
    setSaving(null);
  }

  async function unsign(type: "guardian" | "client" | "coordinator" | "supervisor") {
    const field = `${type}_signed_at`;
    await fetch(`/api/isp/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ [field]: null, status: "draft" }),
    });
    setSigs(s => ({ ...s, [type]: null }));
    setStatus("draft");
    router.refresh();
  }

  const signers = [
    { key: "guardian" as const, label: "Guardian / Conservator", name: plan.guardian_name || "Guardian", subtitle: plan.guardian_relationship || "Legal Guardian", icon: "👨‍👩‍👧" },
    { key: "client" as const, label: "Individual", name: "Individual Self-Signature", subtitle: "Or representative if unable to sign", icon: "👤" },
    { key: "coordinator" as const, label: "Support Coordinator", name: "Support Coordinator", subtitle: "ISP Author", icon: "📋" },
    { key: "supervisor" as const, label: "Supervisor Review", name: "Program Supervisor", subtitle: "Annual review sign-off", icon: "✅" },
  ];

  const allSigned = sigs.guardian && sigs.coordinator;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Signatures & Approval</h2>
          <p className="text-xs text-slate-400 mt-0.5">ISP requires guardian and coordinator signatures to be considered active</p>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${allSigned ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {allSigned ? "✅ ISP Active" : `⏳ ${[sigs.guardian, sigs.client, sigs.coordinator].filter(Boolean).length}/3 Signed`}
        </span>
      </div>
      <div className="divide-y divide-slate-50">
        {signers.map(signer => {
          const signed = sigs[signer.key];
          return (
            <div key={signer.key} className={`flex items-center gap-4 px-6 py-4 ${signed ? "bg-emerald-50/30" : ""}`}>
              <div className="text-2xl flex-shrink-0">{signer.icon}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm text-slate-900">{signer.name}</div>
                <div className="text-xs text-slate-500">{signer.subtitle}</div>
                {signed && (
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">
                    ✓ Signed {new Date(signed).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                )}
              </div>
              <div>
                {signed ? (
                  <button onClick={() => unsign(signer.key)}
                    className="text-xs text-slate-400 hover:text-red-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                    Revoke
                  </button>
                ) : (
                  <button onClick={() => sign(signer.key)} disabled={saving === signer.key}
                    className="text-xs bg-teal-500 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-teal-400 disabled:opacity-50 transition-colors">
                    {saving === signer.key ? "Signing..." : "Sign & Approve"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {allSigned && (
        <div className="px-6 py-4 bg-emerald-50 border-t border-emerald-100 text-center">
          <p className="text-sm text-emerald-700 font-medium">✅ This ISP is fully executed and active for {new Date().getFullYear()}</p>
        </div>
      )}
    </div>
  );
}
