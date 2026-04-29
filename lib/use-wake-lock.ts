"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * useWakeLock — keeps the screen on during gameplay.
 *
 * Requests a Wake Lock when the component mounts and the document is visible.
 * Automatically re-acquires the lock when the tab regains focus (the browser
 * releases it on visibility change).  Releases the lock on unmount.
 *
 * Falls back silently on browsers that don't support the API.
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // Permission denied or low battery — fail silently
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
    requestWakeLock();

    // Re-acquire when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);
}
