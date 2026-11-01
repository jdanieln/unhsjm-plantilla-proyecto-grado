"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { api } from "@/features/operations/services/operationsApi";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import {
  ActionButton,
  StatusBadge,
  workspaceStyles as w,
} from "@/components/ui/Workspace/Workspace";
import { PhotoUpload } from "@/components/ui/PhotoUpload/PhotoUpload";
import s from "./DeliveryPanel.module.css";

type Report = {
  id: number;
  status: string;
  note: string | null;
  photo_url: string | null;
  reported_at: string;
  response_reason: string | null;
  resolution_reason: string | null;
  needsReview: boolean;
};
type Cargo = {
  idDetails: number;
  cargoDescription: string;
  deliveryStatus: string;
  idDriver: number | null;
  reports: Report[];
};
const labels: Record<string, string> = {
  pending: "Pendiente de viaje",
  in_transit: "En tránsito",
  awaiting_confirmation: "Esperando confirmación",
  confirmed: "Entrega confirmada",
  disputed: "Entrega en disputa",
  rescheduled: "Requiere nueva entrega",
};

function optionalText(value: string | null | undefined) {
  const text = value?.trim();
  return text && !["null", "undefined"].includes(text.toLowerCase())
    ? text
    : null;
}
export function DeliveryPanel({
  orderId,
  role,
  driverId,
  onChanged,
}: {
  orderId: number;
  role: "client" | "driver" | "company" | "platform_admin";
  driverId?: number | null;
  onChanged?: () => void;
}) {
  const [cargos, setCargos] = useState<Cargo[]>([]),
    [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    api<Cargo[]>(
      `/orders/${orderId}/deliveries`,
      "GET",
      undefined,
      controller.signal,
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setCargos(data);
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "No se pudo actualizar.");
      })
      .finally(() => {});
    return () => controller.abort();
  }, [orderId, version]);
  useAutoRefresh(refresh);
  return (
    <section className={s.panel} aria-label="Confirmación de entregas">
      <h3>Recepción de tus cargas</h3>
      <p className={s.hint}>
        {role === "client"
          ? "Confirma cada carga únicamente después de recibirla. Si falta algo, puedes reportarlo aquí."
          : "El cliente confirmará la recepción de cada carga."}
      </p>
      {error && (
        <p role="alert" className={w.error}>
          {error}
        </p>
      )}
      {cargos.map((c) => (
        <CargoDelivery
          key={c.idDetails}
          cargo={c}
          role={role}
          driverId={driverId}
          orderId={orderId}
          onChanged={() => {
            void refresh();
            onChanged?.();
          }}
        />
      ))}
    </section>
  );
}
function CargoDelivery({
  cargo: c,
  role,
  driverId,
  orderId,
  onChanged,
}: {
  cargo: Cargo;
  role: string;
  driverId?: number | null;
  orderId: number;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false),
    [note, setNote] = useState(""),
    [photo, setPhoto] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const r = c.reports[0];
  const reportNote = optionalText(r?.note);
  const responseReason = optionalText(r?.response_reason);
  const resolutionReason = optionalText(r?.resolution_reason);
  async function submit(action: string, confirmed?: boolean) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let body: object | FormData = { confirmed, reason: note };
      let id = r?.id;
      if (action === "report") {
        const form = new FormData();
        form.set("note", note);
        if (photo) form.set("photo", photo);
        body = form;
        id = c.idDetails;
      }
      await api(`/orders/${orderId}/deliveries/${id}/${action}`, "POST", body);
      setPhoto(null);
      setNote("");
      setOpen(false);
      window.dispatchEvent(new Event("delivery-changed"));
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  const canReport =
    role === "driver" &&
    driverId === c.idDriver &&
    c.deliveryStatus === "in_transit";
  const canAnswer = role === "client" && r?.status === "awaiting_confirmation";
  const canResolve = role === "platform_admin" && r?.needsReview;
  return (
    <article className={s.cargo}>
      <div className={s.heading}>
        <strong>{c.cargoDescription}</strong>
        <StatusBadge
          status={c.deliveryStatus}
          label={labels[c.deliveryStatus]}
        />
      </div>
      {r && (
        <>
          <small>
            Reportada el {new Date(r.reported_at).toLocaleString("es-NI")}
          </small>
          <div className={s.reportNote}>
            <span>Nota del conductor</span>
            <p className={!reportNote ? s.emptyValue : undefined}>
              {reportNote ?? "Sin nota adicional."}
            </p>
          </div>
          {r.photo_url && (
            <Image
              className={s.photo}
              src={r.photo_url}
              alt="Fotografía de la entrega reportada"
              width={640}
              height={360}
              unoptimized
            />
          )}
          {["confirmed", "disputed"].includes(r.status) && (
            <p className={s.response}>
              <strong>Respuesta del cliente:</strong>{" "}
              {responseReason ?? "Sin comentario adicional."}
            </p>
          )}
          {resolutionReason && (
            <p className={s.response}>
              <strong>Resolución:</strong> {resolutionReason}
            </p>
          )}
          {r.needsReview && (
            <p className={w.notice}>
              Esta entrega requiere revisión del superadmin.
            </p>
          )}
        </>
      )}
      {canReport && !open && (
        <ActionButton variant="primary" onClick={() => setOpen(true)}>
          Reportar entrega
        </ActionButton>
      )}
      {canReport && open && (
        <>
          <PhotoUpload
            label="Foto de la entrega"
            value={photo}
            onChange={setPhoto}
            disabled={busy}
          />
          <label className={w.field}>
            Nota opcional
            <textarea
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
            />
          </label>
          <div className={w.rowActions}>
            <ActionButton
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setPhoto(null);
              }}
            >
              Volver
            </ActionButton>
            <ActionButton
              variant="primary"
              disabled={busy}
              onClick={() => void submit("report")}
            >
              {busy ? "Enviando…" : "Solicitar confirmación"}
            </ActionButton>
          </div>
        </>
      )}
      {(canAnswer || canResolve) && (
        <>
          <label className={w.field}>
            {canResolve
              ? "Motivo de la resolución"
              : "Motivo si no recibiste la carga"}
            <textarea
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              placeholder="Describe lo sucedido (mínimo 10 caracteres para un reclamo)."
            />
          </label>
          <div className={w.rowActions}>
            <ActionButton
              disabled={busy || (canResolve && note.trim().length < 10)}
              variant="primary"
              onClick={() =>
                void submit(canResolve ? "resolve" : "respond", true)
              }
            >
              {canResolve ? "Confirmar entrega" : "Confirmar recepción"}
            </ActionButton>
            <ActionButton
              disabled={busy || note.trim().length < 10}
              variant="danger"
              onClick={() =>
                void submit(canResolve ? "resolve" : "respond", false)
              }
            >
              {canResolve ? "Solicitar nueva entrega" : "No recibí la carga"}
            </ActionButton>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className={w.error}>
          {error}
        </p>
      )}
      {c.reports.length > 1 && (
        <details>
          <summary>Intentos anteriores ({c.reports.length - 1})</summary>
          {c.reports.slice(1).map((old) => (
            <p key={old.id}>
              {new Date(old.reported_at).toLocaleString("es-NI")} ·{" "}
              {labels[old.status]} ·{" "}
              {optionalText(old.resolution_reason) ||
                optionalText(old.response_reason) ||
                optionalText(old.note) ||
                "Sin comentario adicional."}
            </p>
          ))}
        </details>
      )}
    </article>
  );
}
