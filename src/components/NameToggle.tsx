"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "drcloud_name_display";

interface Props {
  firstName: string;
  lastName: string;
  preferredName: string | null;
  middleName?: string | null;
}

export default function NameToggle({ firstName, lastName, preferredName, middleName }: Props) {
  const hasPreferred = !!preferredName;
  const [showPreferred, setShowPreferred] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    if (!hasPreferred) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "preferred") setShowPreferred(true);
  }, [hasPreferred]);

  function toggle(val: boolean) {
    setShowPreferred(val);
    localStorage.setItem(STORAGE_KEY, val ? "preferred" : "legal");
  }

  const displayName = showPreferred && hasPreferred
    ? preferredName!
    : `${lastName}, ${firstName}${middleName ? ` ${middleName}` : ""}`;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>

      {hasPreferred && (
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => toggle(false)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              !showPreferred ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            Legal
          </button>
          <button
            onClick={() => toggle(true)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              showPreferred ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            Preferred
          </button>
        </div>
      )}

      {hasPreferred && (
        <span className="text-slate-400 text-base">
          {showPreferred ? `(Legal: ${lastName}, ${firstName})` : `(Preferred: ${preferredName})`}
        </span>
      )}
    </div>
  );
}
