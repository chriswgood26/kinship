"use client";

import { useState, useEffect, useCallback } from "react";

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes
let initialVersion: string | null = null;

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const current = data.version as string;
      if (!initialVersion) {
        initialVersion = current;
      } else if (current !== initialVersion) {
        setUpdateAvailable(true);
      }
    } catch {
      // Silently fail — don't disrupt the app
    }
  }, []);

  useEffect(() => {
    checkVersion();
    const interval = setInterval(checkVersion, CHECK_INTERVAL_MS);

    // Also check when user returns to the tab
    function handleVisibilityChange() {
      if (!document.hidden) checkVersion();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkVersion]);

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0d1b2e] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-white/10 animate-in slide-in-from-bottom-3">
      <span className="text-lg">🚀</span>
      <div>
        <div className="text-sm font-semibold">Update available</div>
        <div className="text-xs text-slate-400">A new version of DrCloud Neo has been deployed</div>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={() => window.location.reload()}
          className="bg-teal-500 hover:bg-teal-400 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
        >
          Refresh now
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white text-xs px-2 py-2 transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
}
