"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function OfflineBanner() {
  const { isOnline, pendingCount, syncStatus, syncError, processQueue } = useOfflineSync();

  // Nothing to show if online and idle with no pending items
  if (isOnline && pendingCount === 0 && syncStatus === "idle") return null;

  // Syncing
  if (syncStatus === "syncing") {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2.5 bg-blue-600 text-white px-5 py-2.5 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2">
        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        Syncing {pendingCount} pending change{pendingCount !== 1 ? "s" : ""}…
      </div>
    );
  }

  // Success
  if (syncStatus === "success" && isOnline) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2.5 bg-teal-600 text-white px-5 py-2.5 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2">
        ✅ All changes synced
      </div>
    );
  }

  // Sync error
  if (syncStatus === "error") {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 bg-red-600 text-white px-5 py-2.5 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2">
        <span>⚠️ {syncError ?? "Sync failed"}</span>
        <button
          onClick={() => processQueue()}
          className="underline underline-offset-2 hover:no-underline text-white/90 hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  // Online with pending items (e.g. a previous sync failed partially)
  if (isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 bg-amber-500 text-white px-5 py-2.5 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2">
        <span>⏳ {pendingCount} change{pendingCount !== 1 ? "s" : ""} pending sync</span>
        <button
          onClick={() => processQueue()}
          className="underline underline-offset-2 hover:no-underline text-white/90 hover:text-white"
        >
          Sync now
        </button>
      </div>
    );
  }

  // Offline
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-2.5 bg-slate-800 text-white px-5 py-2.5 rounded-2xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2">
      <span className="inline-block w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
      You&apos;re offline.
      {pendingCount > 0 ? (
        <span className="text-slate-300 font-normal">
          {pendingCount} change{pendingCount !== 1 ? "s" : ""} will sync when reconnected.
        </span>
      ) : (
        <span className="text-slate-300 font-normal">Changes will sync when reconnected.</span>
      )}
    </div>
  );
}
