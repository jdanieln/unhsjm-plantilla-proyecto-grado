"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/features/operations/services/operationsApi";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import {
  ActionButton,
  Modal,
  PageHeader,
  workspaceStyles as w,
} from "@/components/ui/Workspace/Workspace";
import { ResourceTable } from "@/components/ui/ResourceTable/ResourceTable";
import { DeliveryPanel } from "./DeliveryPanel";
type Case = {
  id: number;
  id_order: number;
  cargoDescription: string;
  status: string;
  reported_at: string;
};
export function DeliveryReview() {
  const [rows, setRows] = useState<Case[]>([]),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<number | null>(null),
    [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1),
    [size, setSize] = useState(10);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    api<Case[]>("/deliveries/review", "GET", undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRows(data);
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "No se pudo actualizar.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [version]);
  useAutoRefresh(refresh);
  return (
    <>
      <PageHeader
        eyebrow="CONFIRMACIÓN Y CONFIANZA"
        title="Revisión de entregas"
        description="Reclamos y entregas sin respuesta después de 48 horas."
      />
      {error && <p className={w.error}>{error}</p>}
      <ResourceTable
        rows={rows.slice((page - 1) * size, page * size)}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={refresh}
        page={page}
        perPage={size}
        total={rows.length}
        onPage={setPage}
        onPerPage={(v) => {
          setSize(v);
          setPage(1);
        }}
        columns={[
          { label: "Pedido", render: (r) => `#${r.id_order}` },
          { label: "Carga", render: (r) => r.cargoDescription },
          {
            label: "Revisión",
            render: (r) =>
              r.status === "disputed"
                ? "El cliente no recibió la carga"
                : "Sin respuesta durante 48 horas",
          },
          {
            label: "Acción",
            render: (r) => (
              <ActionButton icon="eye" onClick={() => setSelected(r.id_order)}>
                Revisar entrega
              </ActionButton>
            ),
          },
        ]}
      />
      {selected && (
        <Modal
          title={`Revisar pedido #${selected}`}
          onClose={() => setSelected(null)}
        >
          <DeliveryPanel
            orderId={selected}
            role="platform_admin"
            onChanged={() => void refresh()}
          />
        </Modal>
      )}
    </>
  );
}
