"use client";

import { useEffect } from "react";

/** Refresca datos visibles sin reemplazar la lista por una pantalla de carga. */
export function useAutoRefresh(onRefresh: () => void, enabled = true, intervalMs = 60_000) {
  useEffect(() => {
    if (!enabled) return;

    let lastRefresh = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine || Date.now() - lastRefresh < 1_000) return;
      lastRefresh = Date.now();
      onRefresh();
    };
    const interval = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [onRefresh, enabled, intervalMs]);
}
