"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import styles from "./SessionTransition.module.css";

type SessionTransitionProps = {
  active: boolean;
  mode: "login" | "logout";
};

const content = {
  login: {
    eyebrow: "PREPARANDO TU RUTA",
    title: "Iniciando sesión",
    description: "Estamos conectando tu cuenta con tu próximo destino.",
  },
  logout: {
    eyebrow: "HASTA EL PRÓXIMO DESTINO",
    title: "Cerrando sesión",
    description: "Estamos protegiendo tu cuenta antes de despedirnos.",
  },
} as const;

export function SessionTransition({
  active,
  mode,
}: SessionTransitionProps) {
  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);

  if (!active || typeof document === "undefined") return null;

  const copy = content[mode];

  return createPortal(
    <div
      className={styles.overlay}
      data-session-transition={mode}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`${copy.title}. ${copy.description}`}
    >
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.speedLines} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className={styles.content}>
        <div className={styles.emblemWrap} aria-hidden="true">
          <span className={styles.orbit} />
          <span className={styles.orbitAccent} />
          <Image
            className={styles.emblem}
            src="/images/traveldls-emblem.png"
            alt=""
            width={188}
            height={188}
            priority
          />
        </div>

        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className={styles.description}>{copy.description}</p>

        <div className={styles.progress} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className={styles.brand}>TRAVELDLS · CONECTAMOS DESTINOS</p>
      </div>
    </div>,
    document.body,
  );
}
