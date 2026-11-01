"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon/Icon";
import { Select } from "@/components/ui/Select/Select";
import styles from "./Workspace.module.css";

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  action?: ReactNode;
}) {
  return <div className={styles.heading}>
    <div><p className={styles.eyebrow}>{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
    {action}
  </div>;
}

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return <span className={styles.status} data-status={status}>
    {label ?? status.replaceAll("_", " ")}
  </span>;
}

export function ActionButton({ children, icon, iconPlacement = "before", variant = "default", href, onClick, disabled = false, disabledReason, fullWidth = false }: {
  children: ReactNode;
  icon?: IconName;
  iconPlacement?: "before" | "after";
  variant?: "default" | "primary" | "subtle" | "danger";
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  fullWidth?: boolean;
}) {
  const content = <>{icon && iconPlacement === "before" && <Icon name={icon} size={15} />}
    <span>{children}</span>{icon && iconPlacement === "after" && <Icon name={icon} size={15} />}</>;
  const className = styles.actionButton;
  if (href && !disabled) return <Link href={href} className={className} data-variant={variant} data-full-width={fullWidth}>{content}</Link>;
  if (href) return <span className={className} data-variant={variant} data-full-width={fullWidth} aria-disabled="true" title={disabledReason}>{content}</span>;
  return <span className={styles.actionWrap} data-full-width={fullWidth} title={disabled ? disabledReason : undefined}>
    <button type="button" className={className} data-variant={variant} data-full-width={fullWidth} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  </span>;
}

export function DataState({ loading, error, empty, onRetry, icon = "box" }: {
  loading?: boolean;
  error?: string;
  empty: string;
  onRetry?: () => void;
  icon?: IconName;
}) {
  return <div className={styles.state} role={error ? "alert" : "status"}>
    {loading ? <span className={styles.spinner} aria-hidden="true" /> : <Icon name={error ? "help" : icon} size={30} />}
    <h2>{loading ? "Cargando información" : error ? "No pudimos cargar los datos" : empty}</h2>
    {error && <><p>{error}</p>{onRetry && <button className={styles.secondary} onClick={onRetry}>Reintentar</button>}</>}
  </div>;
}

export function Pagination({ page, lastPage, total, perPage, onPage, onPerPage, pageSizes = [10, 25, 50], disabled = false }: {
  page: number;
  lastPage: number;
  total: number;
  perPage: number;
  onPage: (page: number) => void;
  onPerPage: (size: number) => void;
  pageSizes?: number[];
  disabled?: boolean;
}) {
  return <div className={styles.pager}>
    <div className={styles.pageSize}>
      <span>Por página</span>
      <Select label="Elementos por página" value={String(perPage)} options={pageSizes.map((value) => ({ value: String(value), label: String(value) }))} onChange={(value) => onPerPage(Number(value))} />
    </div>
    <span>{total ? `${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} de ${total}` : "0 registros"}</span>
    <div className={styles.pagerActions}>
      <button className={styles.secondary} onClick={() => onPage(page - 1)} disabled={disabled || page <= 1}>Anterior</button>
      <span>{page} / {Math.max(1, lastPage)}</span>
      <button className={styles.secondary} onClick={() => onPage(page + 1)} disabled={disabled || page >= lastPage}>Siguiente</button>
    </div>
  </div>;
}

export function Modal({ title, eyebrow, children, onClose, busy = false, size = "default" }: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  size?: "default" | "wide" | "map";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const focused = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previous; focused?.focus(); };
  }, []);
  return <dialog ref={ref} className={styles.dialog} data-size={size} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className={styles.dialogHeader}>
      <div>{eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}<h2 id={titleId}>{title}</h2></div>
      <button type="button" className={styles.iconButton} aria-label="Cerrar ventana" disabled={busy} onClick={onClose}><Icon name="close" /></button>
    </header>
    <div className={styles.dialogBody}>{children}</div>
  </dialog>;
}

export { styles as workspaceStyles };
