"use client";

import { useState, useEffect } from "react";

interface Problem {
  id: string;
  icd10_code: string | null;
  description: string;
  status: string;
}

interface Props {
  clientId: string;
}

export default function ProblemListWidget({ clientId }: Props) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/problem-list?patient_id=${clientId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setProblems((d.problems || []).filter((p: Problem) => p.status === "active" || p.status === "chronic"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className="text-xs text-slate-400">Loading...</div>;
  if (problems.length === 0)
    return (
      <div className="text-xs text-slate-400">
        No active diagnoses —{" "}
        <a href={`/dashboard/clients/${clientId}?tab=problems`} className="text-teal-600 hover:text-teal-700 font-medium">
          Add
        </a>
      </div>
    );

  return (
    <div className="space-y-2">
      {problems.map(p => (
        <div key={p.id} className="flex items-start gap-2">
          {p.icd10_code && (
            <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
              {p.icd10_code}
            </span>
          )}
          <span className="text-sm text-slate-800 leading-snug">{p.description}</span>
        </div>
      ))}
    </div>
  );
}
