"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import styles from "../../styles/Admin.module.css";

export function AdminModal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const focused = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
      focused?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className={styles.modalHeader}>
        <div>
          <span className={styles.eyebrow}>TRAVELDLS · ADMINISTRACIÓN</span>
          <h2 id={titleId}>{title}</h2>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar ventana"
        >
          <Icon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
