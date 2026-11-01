"use client";

import { useSyncExternalStore } from "react";
import { getServerTheme, getTheme, setTheme, subscribeToTheme } from "./theme";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, getServerTheme);
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = `Cambiar a modo ${nextTheme === "light" ? "claro" : "oscuro"}`;

  return (
    <button type="button" className={styles.toggle} onClick={() => setTheme(nextTheme)}
      aria-label={label} title={label}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === "dark" ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
          : <path d="M20.8 13a9 9 0 0 1-9.8-9.8A9 9 0 1 0 20.8 13Z" />}
      </svg>
      <span>Modo {nextTheme === "light" ? "claro" : "oscuro"}</span>
    </button>
  );
}
