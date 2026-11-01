"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/features/operations/services/operationsApi";
import {
  ActionButton,
} from "@/components/ui/Workspace/Workspace";
import { Icon } from "@/components/ui/Icon/Icon";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import s from "./DeliveryInbox.module.css";
type Pending = { id: number; id_order: number; cargoDescription: string };
export function DeliveryInbox() {
  const [rows, setRows] = useState<Pending[]>([]),
    [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useAutoRefresh(refresh);
  useEffect(() => {
    const abort = new AbortController();
    api<Pending[]>("/deliveries/pending", "GET", undefined, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setRows(data);
      })
      .catch(() => {});
    return () => abort.abort();
  }, [version]);
  useEffect(() => {
    window.addEventListener("delivery-changed", refresh);
    return () => window.removeEventListener("delivery-changed", refresh);
  }, [refresh]);
  if (!rows.length) return null;
  return (
    <aside className={s.inbox} aria-label="Entregas por confirmar">
      <span className={s.icon} aria-hidden="true">
        <Icon name="box" size={21} />
      </span>
      <div className={s.copy}>
        <span className={s.eyebrow}>Recepción pendiente</span>
        <strong>
          {rows.length === 1
            ? "Tienes una carga por confirmar"
            : `Tienes ${rows.length} cargas por confirmar`}
        </strong>
        <small>Confirma la entrega después de recibirla.</small>
      </div>
      <span className={s.count} aria-label={`${rows.length} pendientes`}>
        {rows.length}
      </span>
      <ActionButton
        href={`/client/orders?order=${rows[0].id_order}`}
        variant="primary"
        icon="arrow"
        iconPlacement="after"
      >
        Revisar recepción
      </ActionButton>
    </aside>
  );
}
