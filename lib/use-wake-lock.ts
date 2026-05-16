"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * useWakeLock — keeps the screen on during gameplay.
 *
 * Requests a Wake Lock when the component mounts and the document is visible.
 * Re-acquires automatically when:
 *   1. The tab regains visibility (browser releases lock on hide).
 *   2. The sentinel fires its own "release" event (OS power saver, low
 *      battery, notification shade on Android, etc.).
 *   3. A periodic heartbeat (every 30 s) detects the lock was lost silently.
 *
 * Releases the lock on unmount.
 * Falls back silently on browsers that don't support the API.
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  /** True while the hook is mounted — prevents re-acquire after unmount. */
  const activeRef = useRef(true);

  const requestWakeLock = useCallback(async () => {
    if (!activeRef.current) return;
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    if (document.visibilityState !== "visible") return;

    // Already holding a live lock — nothing to do
    if (wakeLockRef.current && !wakeLockRef.current.released) return;

    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLockRef.current = sentinel;

      // If the browser drops the lock for ANY reason, try to re-acquire
      sentinel.addEventListener("release", () => {
        if (wakeLockRef.current === sentinel) {
          wakeLockRef.current = null;
        }
        // Small delay to avoid hammering the API on rapid release/acquire cycles
        setTimeout(() => requestWakeLock(), 300);
      });
    } catch {
      // Permission denied, low battery, or not supported — fail silently
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Already released
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    requestWakeLock();

    // Re-acquire when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    // Heartbeat: every 30 s, check if the lock was silently dropped
    const heartbeat = setInterval(() => {
      if (!wakeLockRef.current || wakeLockRef.current.released) {
        requestWakeLock();
      }
    }, 30_000);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      activeRef.current = false;
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);
}
