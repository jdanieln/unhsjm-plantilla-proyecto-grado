"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon/Icon";
import { PageHeader, DataState, ActionButton, Modal, StatusBadge, workspaceStyles as w } from "@/components/ui/Workspace/Workspace";
import { TimedNotice } from "@/components/ui/TimedNotice/TimedNotice";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useResource } from "../hooks/useResource";
import { api, truckLabels, type Truck } from "../services/operationsApi";
import styles from "./AssignedTruck.module.css";

export function AssignedTruck() {
  const resource = useResource<Truck>("/driver/truck");
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const truck = resource.data;
  const inMaintenance = ["mantenimiento", "maintenance"].includes(truck?.status || "");

  useAutoRefresh(resource.reload, !busy);

  function closeReport() {
    setConfirm(false);
    setReason("");
    setError("");
  }

  async function report() {
    if (busy || reason.trim().length < 10) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api<Truck>("/driver/truck/status", "PATCH", {
        status: "mantenimiento",
        reason: reason.trim(),
      });
      resource.setData(updated);
      resource.reload();
      closeReport();
      setMessage("Mantenimiento reportado a tu empresa.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo reportar el mantenimiento.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <PageHeader eyebrow="TU COMPAÑERO DE RUTA" title="Mi camión" description="Consulta tu vehículo asignado e informa si requiere mantenimiento."
      action={<ActionButton icon="refresh" onClick={resource.reload}>Actualizar</ActionButton>} />
    {message && <TimedNotice message={message} onDismiss={() => setMessage("")} />}
    {resource.error && truck && <p className={w.error} role="status">No pudimos actualizar los datos. Se muestra la última información disponible.</p>}
    {resource.loading || !truck ? <DataState loading={resource.loading} error={resource.error} empty="Aún no tienes un camión asignado" onRetry={resource.reload} /> :
      <article className={styles.truckCard}>
        <div className={styles.hero}>
          <Icon name="truck" size={190} className={styles.watermark} />
          <div className={styles.heroContent}>
            <span className={styles.kicker}><span className={styles.kickerDot} /> VEHÍCULO ASIGNADO</span>
            <h2>{truck.plate}</h2>
            <p>{truck.category?.nameCategory || "Camión de transporte"}</p>
          </div>
          <div className={styles.statusPanel}>
            <span>Estado actual</span>
            <StatusBadge status={truck.status} label={truckLabels[truck.status]} />
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.facts}>
            <div className={styles.fact}><span className={styles.factIcon}><Icon name="tag" size={20} /></span><div><span>Placa</span><strong>{truck.plate}</strong></div></div>
            <div className={styles.fact}><span className={styles.factIcon}><Icon name="route" size={20} /></span><div><span>Chasis</span><strong>{truck.chassis}</strong></div></div>
            <div className={styles.fact}><span className={styles.factIcon}><Icon name="building" size={20} /></span><div><span>Empresa</span><strong>{truck.company?.businessName || "—"}</strong></div></div>
          </div>

          {inMaintenance && <div className={styles.maintenanceNote}>
            <Icon name="help" size={21} />
            <div><strong>En revisión por mantenimiento</strong><p>{truck.maintenanceReason || "No se registró un motivo para este reporte."}</p></div>
          </div>}

          <div className={styles.footer}>
            <p>{inMaintenance ? "Tu empresa puede revisar el reporte y actualizar la disponibilidad del camión." : "Si detectas una falla, repórtala para que tu empresa pueda atenderla."}</p>
            <ActionButton variant="danger" disabled={inMaintenance} disabledReason={inMaintenance ? "Este camión ya está en mantenimiento." : undefined}
              onClick={() => setConfirm(true)}>Reportar mantenimiento</ActionButton>
          </div>
        </div>
      </article>}

    {confirm && truck && <Modal title="Reportar mantenimiento" eyebrow="CUIDAMOS CADA VIAJE" onClose={closeReport} busy={busy}>
      <div className={styles.reportIntro}>
        <span className={styles.reportIcon}><Icon name="truck" size={28} /></span>
        <div><strong>Camión {truck.plate}</strong><p>Cuéntale a tu empresa qué necesita revisión. El vehículo quedará marcado en mantenimiento.</p></div>
      </div>
      <label className={w.field} htmlFor="maintenance-reason">Motivo del mantenimiento
        <textarea id="maintenance-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={10} maxLength={500}
          placeholder="Describe la falla o el mantenimiento que necesita el camión…" disabled={busy} required />
        <small>Mínimo 10 caracteres · {reason.trim().length}/500</small>
      </label>
      {error && <p className={w.error} role="alert">{error}</p>}
      <div className={w.actions}>
        <ActionButton disabled={busy} onClick={closeReport}>Volver</ActionButton>
        <ActionButton disabled={busy || reason.trim().length < 10} variant="danger" onClick={report}>{busy ? "Reportando…" : "Confirmar reporte"}</ActionButton>
      </div>
    </Modal>}
  </>;
}
