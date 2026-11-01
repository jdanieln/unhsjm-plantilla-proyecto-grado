"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "../services/operationsApi";

export function useResource<T>(path: string | null) {
  const [result, setResult] = useState<{ key: string; path: string; data: T | null; error: string } | null>(null);
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([path, version]);
  useEffect(() => {
    const controller = new AbortController();
    if (!path) return;
    api<T>(path, "GET", undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ key, path, data, error: "" });
    }).catch((cause) => {
      if (!controller.signal.aborted) setResult(previous => ({
        key, path,
        data: previous?.path === path ? previous.data : null,
        error: cause instanceof Error ? cause.message : "No se pudo cargar.",
      }));
    });
    return () => controller.abort();
  }, [path, key]);
  const current = result?.key === key ? result : null;
  const previousData = result?.path === path ? result.data : null;
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const setData = useCallback((data: T) => {
    if (path) setResult({ key, path, data, error: "" });
  }, [key, path]);
  return {
    data: current?.data ?? previousData ?? null,
    error: current?.error ?? "",
    loading: Boolean(path && !current && !previousData),
    reload,
    setData,
  };
}
