"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Objective {
  id: string;
  description: string;
  intervention: string;
  status: string;
}

interface Goal {
  id: string;
  description: string;
  target_date: string;
  objectives: Objective[];
}

interface Props {
  planId: string;
  goals: Goal[];
}

const OBJ_STATUSES = [
  { value: "not_started", label: "Not Started", color: "bg-slate-100 text-slate-500" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { value: "achieved",    label: "Achieved",    color: "bg-emerald-100 text-emerald-700" },
  { value: "discontinued", label: "Discontinued", color: "bg-red-100 text-red-500" },
];

const GOAL_STATUSES = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "achieved",    label: "Achieved" },
  { value: "discontinued", label: "Discontinued" },
];

export default function GoalStatusUpdater({ planId, goals: initialGoals }: Props) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const router = useRouter();

  async function updateObjectiveStatus(goalId: string, objId: string, newStatus: string) {
    setSaving(objId);
    const updatedGoals = goals.map(g => {
      if (g.id !== goalId) return g;
      return {
        ...g,
        objectives: g.objectives.map(o =>
          o.id === objId ? { ...o, status: newStatus } : o
        ),
      };
    });

    await fetch(`/api/treatment-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ goals: updatedGoals }),
    });

    setGoals(updatedGoals);
    setSaving(null);
    setSaved(objId);
    setTimeout(() => setSaved(null), 2000);
    router.refresh();
  }

  const OBJ_STATUS: Record<string, string> = {
    not_started: "bg-slate-100 text-slate-500",
    in_progress: "bg-blue-100 text-blue-700",
    achieved: "bg-emerald-100 text-emerald-700",
    discontinued: "bg-red-100 text-red-500",
  };

  return (
    <div className="space-y-4">
      {goals.map((goal, gi) => {
        const allAchieved = goal.objectives.every(o => o.status === "achieved");
        const anyInProgress = goal.objectives.some(o => o.status === "in_progress");
        const goalStatus = allAchieved ? "achieved" : anyInProgress ? "in_progress" : "not_started";

        return (
          <div key={goal.id || gi} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Goal header */}
            <div className="flex items-start gap-3 px-5 py-4 bg-slate-50 border-b border-slate-100">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                goalStatus === "achieved" ? "bg-emerald-500 text-white" :
                goalStatus === "in_progress" ? "bg-blue-500 text-white" :
                "bg-teal-500 text-white"
              }`}>
                {goalStatus === "achieved" ? "✓" : gi + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{goal.description}</p>
                {goal.target_date && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Target: {new Date(goal.target_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize flex-shrink-0 ${OBJ_STATUS[goalStatus]}`}>
                {goalStatus.replace("_", " ")}
              </span>
            </div>

            {/* Objectives */}
            <div className="divide-y divide-slate-50">
              {goal.objectives.map((obj, oi) => (
                <div key={obj.id || oi} className="px-5 py-4 flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-slate-400">Obj {oi + 1}</span>
                    </div>
                    <p className="text-sm text-slate-900 mb-1">{obj.description}</p>
                    {obj.intervention && (
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">Intervention:</span> {obj.intervention}
                      </p>
                    )}
                  </div>

                  {/* Status selector */}
                  <div className="flex-shrink-0">
                    {saving === obj.id ? (
                      <span className="text-xs text-slate-400">Saving...</span>
                    ) : saved === obj.id ? (
                      <span className="text-xs text-emerald-600 font-semibold">✓ Saved</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {OBJ_STATUSES.map(s => (
                          <button
                            key={s.value}
                            onClick={() => obj.status !== s.value && updateObjectiveStatus(goal.id, obj.id, s.value)}
                            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all border ${
                              obj.status === s.value
                                ? `${s.color} border-transparent ring-2 ring-offset-1 ring-slate-300`
                                : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600"
                            }`}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Goal progress bar */}
            {goal.objectives.length > 0 && (
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${(goal.objectives.filter(o => o.status === "achieved").length / goal.objectives.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {goal.objectives.filter(o => o.status === "achieved").length}/{goal.objectives.length} achieved
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
