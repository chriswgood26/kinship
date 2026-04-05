"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getQueue, removeFromQueue, QueuedRequest } from "@/lib/offlineQueue";

export type SyncStatus = "idle" | "syncing" | "success" | "error";

interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  syncError: string | null;
  processQueue: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isSyncing = useRef(false);

  // Keep pending count in sync with localStorage
  const refreshPendingCount = useCallback(() => {
    setPendingCount(getQueue().length);
  }, []);

  const processQueue = useCallback(async () => {
    if (isSyncing.current) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    isSyncing.current = true;
    setSyncStatus("syncing");
    setSyncError(null);

    let failed = 0;
    for (const item of queue) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: { ...item.headers, "Content-Type": "application/json" },
          body: item.body,
          credentials: "include",
        });
        if (res.ok) {
          removeFromQueue(item.id);
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    refreshPendingCount();
    isSyncing.current = false;
    setLastSyncAt(Date.now());

    if (failed === 0) {
      setSyncStatus("success");
      // Reset to idle after brief success window
      setTimeout(() => setSyncStatus("idle"), 4000);
    } else {
      setSyncStatus("error");
      setSyncError(`${failed} item${failed !== 1 ? "s" : ""} could not be synced`);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    function handleOnline() {
      setIsOnline(true);
      // Small delay to let the network stabilize before syncing
      setTimeout(() => processQueue(), 1500);
    }

    function handleOffline() {
      setIsOnline(false);
      setSyncStatus("idle");
    }

    // Also watch for storage changes (another tab may have queued items)
    function handleStorage(e: StorageEvent) {
      if (e.key === "kinship_offline_queue") {
        refreshPendingCount();
      }
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("storage", handleStorage);

    // Poll pending count every 10 seconds (covers mutations from same tab)
    const interval = setInterval(refreshPendingCount, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [processQueue, refreshPendingCount]);

  return { isOnline, pendingCount, syncStatus, lastSyncAt, syncError, processQueue };
}
