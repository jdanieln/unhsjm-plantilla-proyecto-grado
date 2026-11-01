"use client";

import { useCallback, useEffect, useState } from "react";
import { TrackingMap } from "@/components/ui/TrackingMap/TrackingMap";
import { Modal, workspaceStyles as ui } from "@/components/ui/Workspace/Workspace";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { ClientApiError, getTracking } from "../../services/clientApi";
import type { Order, Tracking } from "../../types/client";
import styles from "./TripMap.module.css";

export function ClientTripMap({ order, onClose }: { order: Order; onClose: () => void }) {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion(value => value + 1), []);
  useAutoRefresh(refresh, true, 15_000);

  useEffect(() => {
    const abort = new AbortController();
    getTracking(order.idOrder, abort.signal).then(location => {
      if (abort.signal.aborted) return;
      setTracking(location);
      setError("");
    }).catch(cause => {
      if (abort.signal.aborted) return;
      setError(cause instanceof ClientApiError && cause.status === 404
        ? "El conductor todavía no ha compartido su ubicación."
        : cause instanceof Error ? cause.message : "No se pudo actualizar la ubicación.");
    });
    return () => abort.abort();
  }, [order.idOrder, version]);

  const destinations = [...new Set((order.details || []).map(detail => detail.deliveryAddress).filter(Boolean))].join(" · ");

  return <Modal title={`Ubicación del pedido #${order.idOrder}`} eyebrow="SEGUIMIENTO DEL ENVÍO" size="map" onClose={onClose}>
    <div className={styles.meta}>
      <div><strong>{order.company?.businessName || "Tu empresa de transporte"}</strong>{destinations && <span>Entrega: {destinations}</span>}<span>La posición se actualiza automáticamente mientras este mapa está abierto.</span></div>
      <span className={styles.live}>{tracking ? "Última posición recibida" : "Esperando posición"}</span>
    </div>
    <TrackingMap point={tracking} label="Ubicación reportada del conductor" />
    <div className={styles.info}>
      {tracking && <span>Reportada: {new Date(tracking.updatedAt).toLocaleString("es-NI")}</span>}
      {error && <span className={ui.error} role="status">{error}</span>}
      <span>La ubicación depende de que el conductor active el seguimiento y tenga conexión.</span>
    </div>
  </Modal>;
}
