"use client";

import { useState, useEffect, useRef } from "react";

interface TimeTrackerProps {
  encounterId: string;
  initialStartTime?: string | null;
  initialEndTime?: string | null;
  initialDurationMinutes?: number | null;
  initialDurationOverride?: boolean;
}

function calcDuration(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function TimeTracker({
  encounterId,
  initialStartTime,
  initialEndTime,
  initialDurationMinutes,
  initialDurationOverride,
}: TimeTrackerProps) {
  const [startTime, setStartTime] = useState(initialStartTime || "");
  const [endTime, setEndTime] = useState(initialEndTime || "");
  const [durationMinutes, setDurationMinutes] = useState<string>(
    initialDurationMinutes != null ? String(initialDurationMinutes) : ""
  );
  const [isOverride, setIsOverride] = useState(initialDurationOverride || false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-calculate duration when start/end change (only if not in override mode)
  useEffect(() => {
    if (isOverride) return;
    const calc = calcDuration(startTime, endTime);
    if (calc !== null) {
      setDurationMinutes(String(calc));
    }
  }, [startTime, endTime, isOverride]);

  // Debounced save whenever any time field changes
  useEffect(() => {
    // Don't save on initial mount
    if (
      startTime === (initialStartTime || "") &&
      endTime === (initialEndTime || "") &&
      durationMinutes === (initialDurationMinutes != null ? String(initialDurationMinutes) : "") &&
      isOverride === (initialDurationOverride || false)
    ) return;

    setSaveStatus("idle");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveTime(), 1200);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, durationMinutes, isOverride]);

  async function saveTime() {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          start_time: startTime || null,
          end_time: endTime || null,
          duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
          duration_override: isOverride,
        }),
      });
      if (res.ok) {
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }

  function handleDurationChange(val: string) {
    setDurationMinutes(val);
    setIsOverride(true);
  }

  function handleClearOverride() {
    setIsOverride(false);
    const calc = calcDuration(startTime, endTime);
    if (calc !== null) setDurationMinutes(String(calc));
    else setDurationMinutes("");
  }

  const calcedDuration = calcDuration(startTime, endTime);
  const displayDuration = durationMinutes ? parseInt(durationMinutes, 10) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">⏱</span>
          <h2 className="font-semibold text-slate-900">Time Tracking</h2>
        </div>
        <div className="text-xs">
          {saveStatus === "saving" && <span className="text-slate-400 animate-pulse">Saving...</span>}
          {saveStatus === "saved" && <span className="text-emerald-600 font-medium">✓ Saved</span>}
          {saveStatus === "error" && <span className="text-red-500 font-medium">⚠ Save failed</span>}
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-end gap-4">
          {/* Start Time */}
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Start Time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* End Time */}
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              End Time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Duration */}
          <div className="flex-1 min-w-[140px]">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Duration (min)
              </label>
              {isOverride && (
                <button
                  type="button"
                  onClick={handleClearOverride}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                >
                  ↺ Auto
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="480"
                value={durationMinutes}
                onChange={e => handleDurationChange(e.target.value)}
                placeholder={calcedDuration ? String(calcedDuration) : "—"}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isOverride ? "border-amber-300 bg-amber-50" : "border-slate-200"
                }`}
              />
              {isOverride && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-500 font-medium pointer-events-none">
                  manual
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Duration summary */}
        {displayDuration && displayDuration > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span className={`text-sm font-semibold ${isOverride ? "text-amber-700" : "text-teal-700"}`}>
              {formatDuration(displayDuration)}
            </span>
            {isOverride && calcedDuration !== null && calcedDuration !== displayDuration && (
              <span className="text-xs text-slate-400">
                (calculated: {formatDuration(calcedDuration)})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
