"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon/Icon";
import styles from "./TimedNotice.module.css";

type TimedNoticeProps = {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
  tone?: "success" | "danger";
};

const EXIT_DURATION_MS = 320;

export function TimedNotice({ message, onDismiss, durationMs = 5000, tone = "success" }: TimedNoticeProps) {
  const dismissRef = useRef(onDismiss);
  const autoTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const [closingMessage, setClosingMessage] = useState<string | null>(null);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  const beginDismiss = useCallback(() => {
    if (exitTimer.current !== null) return;
    if (autoTimer.current !== null) window.clearTimeout(autoTimer.current);
    setClosingMessage(message);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    exitTimer.current = window.setTimeout(() => dismissRef.current(), reducedMotion ? 0 : EXIT_DURATION_MS);
  }, [message]);

  useEffect(() => {
    autoTimer.current = window.setTimeout(beginDismiss, durationMs);
    return () => {
      if (autoTimer.current !== null) window.clearTimeout(autoTimer.current);
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
      autoTimer.current = null;
      exitTimer.current = null;
    };
  }, [beginDismiss, durationMs]);

  return <div className={styles.notice} role="status" data-tone={tone} data-closing={closingMessage === message}>
    <div className={styles.content}>
      <span>{message}</span>
      <button type="button" className={styles.close} aria-label="Cerrar aviso" onClick={beginDismiss}>
        <Icon name="close" size={16} />
      </button>
    </div>
  </div>;
}
