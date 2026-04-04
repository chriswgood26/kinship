"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

const TIMEOUT_MS = 30 * 60 * 1000;       // 30 minutes
const WARNING_MS = 25 * 60 * 1000;       // warn at 25 minutes
const COUNTDOWN_START = TIMEOUT_MS - WARNING_MS; // 5 minutes in ms

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

export default function SessionTimeout() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_START / 1000); // seconds
  const lastActivityRef = useRef<number>(Date.now());
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    await signOut();
    router.push("/sign-in?reason=timeout");
  }, [signOut, router, clearAllTimers]);

  const startTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(COUNTDOWN_START / 1000);

      // Start countdown display
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-logout after remaining time
      logoutTimerRef.current = setTimeout(() => {
        handleLogout();
      }, COUNTDOWN_START);
    }, WARNING_MS);
  }, [clearAllTimers, handleLogout]);

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) return; // don't reset if warning is showing — user must click "Stay logged in"
    startTimers();
  }, [showWarning, startTimers]);

  const handleStayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    startTimers();
  }, [startTimers]);

  useEffect(() => {
    startTimers();

    const handleActivity = () => resetActivity();
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, handleActivity));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!showWarning) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, "0")}`
    : `${seconds}s`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Session Expiring Soon</h2>
        <p className="text-slate-500 text-sm mb-4">
          Your session will automatically end due to inactivity. You will be signed out in:
        </p>
        <div className="text-4xl font-mono font-bold text-red-500 mb-6">{timeDisplay}</div>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleStayLoggedIn}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            Stay Logged In
          </button>
          <button
            onClick={handleLogout}
            className="w-full text-slate-500 hover:text-red-500 text-sm font-medium py-2 transition-colors"
          >
            Sign Out Now
          </button>
        </div>
      </div>
    </div>
  );
}
