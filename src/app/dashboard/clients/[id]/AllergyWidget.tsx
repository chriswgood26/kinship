"use client";

import { useState, useEffect } from "react";

interface Allergy {
  id: string;
  allergen: string;
  allergen_type: string;
  severity: string;
  status: string;
}

const SEVERITY_BADGE: Record<string, string> = {
  "life-threatening": "bg-red-100 text-red-700",
  severe: "bg-orange-100 text-orange-700",
  moderate: "bg-yellow-100 text-yellow-700",
  mild: "bg-blue-100 text-blue-700",
  unknown: "bg-slate-100 text-slate-600",
};

const TYPE_ICONS: Record<string, string> = {
  medication: "💊",
  food: "🥜",
  environmental: "🌿",
  latex: "🧤",
  contrast: "💉",
  other: "⚠️",
};

export default function AllergyWidget({ clientId }: { clientId: string }) {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/allergies?client_id=${clientId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setAllergies((d.allergies || []).filter((a: Allergy) => a.status === "active"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-xs text-slate-300">Loading...</div>;

  if (allergies.length === 0) {
    return <div className="text-xs text-slate-400">No active allergies documented</div>;
  }

  const hasLifeThreatening = allergies.some(a => a.severity === "life-threatening");

  return (
    <div className="space-y-2">
      {hasLifeThreatening && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5 text-xs text-red-700 font-medium flex items-center gap-1.5">
          <span>🚨</span> Life-threatening allergy on file
        </div>
      )}
      {allergies.slice(0, 4).map(a => (
        <div key={a.id} className="flex items-center gap-2">
          <span className="text-sm">{TYPE_ICONS[a.allergen_type] ?? "⚠️"}</span>
          <span className="text-sm text-slate-900 font-medium flex-1 truncate">{a.allergen}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${SEVERITY_BADGE[a.severity] ?? "bg-slate-100 text-slate-600"}`}>
            {a.severity === "life-threatening" ? "Severe" : a.severity !== "unknown" ? a.severity : "—"}
          </span>
        </div>
      ))}
      {allergies.length > 4 && (
        <div className="text-xs text-slate-400">+{allergies.length - 4} more</div>
      )}
    </div>
  );
}
