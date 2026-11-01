"use client";
import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useOperationalSession } from "@/components/ui/OperationalShell/OperationalShell";
import { DashboardStatCard } from "@/components/ui/DashboardStatCard/DashboardStatCard";
import { Icon } from "@/components/ui/Icon/Icon";
import { ActionButton, DataState, PageHeader, StatusBadge, workspaceStyles as w } from "@/components/ui/Workspace/Workspace";
import { DetailCard } from "@/components/ui/DetailCard/DetailCard";
import { allPages, type OperationalOrder } from "../services/operationsApi";
import { orderStatusLabels, formatDate } from "@/features/client/types/client";
import s from "./Operations.module.css";

export function Overview() {
  const { user } = useOperationalSession();
  const [orders, setOrders] = useState<OperationalOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const company = user.role === "company";
  const refreshSilently = useCallback(() => setVersion(value => value + 1), []);
  useAutoRefresh(refreshSilently, Boolean(company ? user.idCompany : user.idDriver));
  useEffect(() => {
    const abort = new AbortController();
    allPages<OperationalOrder>(`/orders?${company ? "idCompany" : "idDriver"}=${company ? user.idCompany : user.idDriver}`, abort.signal)
      .then(rows => { if (!abort.signal.aborted) { setOrders(rows); setError(""); } }).catch((cause) => { if (!abort.signal.aborted) setError(cause.message); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [company, user.idCompany, user.idDriver, version]);
  const destination = company ? "/company/orders" : "/driver/trips";
  const reload = () => { setLoading(true); setError(""); setVersion(v => v + 1); };
  return <>
    <PageHeader eyebrow={company ? "TU EMPRESA EN MOVIMIENTO" : "CADA DESTINO CUENTA"} title="Vista general"
      description={company ? "Tu operación, tu equipo y tus entregas en un solo lugar." : "Organiza tus viajes y acompaña cada entrega."}
      action={<ActionButton icon="refresh" onClick={reload}>Actualizar</ActionButton>} />
    <section className={s.hero}><div><span className={s.caption}>TRAVELDLS · CONECTAMOS DESTINOS</span><h2>Hola, {user.name.split(" ")[0]}.</h2>
      <p>{company ? "Hagamos que todo siga en movimiento. Coordina tu flota, responde a tus clientes y prepara el próximo envío." : "El próximo destino está en tus manos. Revisa tus viajes asignados, tu camión y mantén informados a tus clientes."}</p>
      <ActionButton href={destination} variant="primary" icon="arrow" iconPlacement="after">{company ? "Gestionar pedidos" : "Ver mis viajes"}</ActionButton></div><Icon name="route" size={100} /></section>
    {error && orders.length > 0 && !loading && <p className={w.error} role="status">No se pudo actualizar la vista general. Se muestran los últimos datos disponibles.</p>}
    {loading || (error && !orders.length) ? <DataState loading={loading} error={error} empty="" onRetry={reload} /> : <>
      <div className={s.stats}>
        <DashboardStatCard icon="box" value={orders.length} label={company ? "Pedidos totales" : "Viajes asignados"} href={destination} />
        <DashboardStatCard icon="route" value={orders.filter(o => ["pendiente","esperando_aprobacion","aceptado"].includes(o.status)).length} label="Por gestionar" href={destination} />
        <DashboardStatCard icon="truck" value={orders.filter(o => o.status === "en_transito").length} label="En tránsito" href={destination} />
        <DashboardStatCard icon="shield" value={orders.filter(o => o.status === "entregado").length} label="Entregados" href={destination} />
      </div>
      <section className={s.section}><h2>Actividad reciente</h2><div className={s.grid}>
        {orders.slice(0,4).map(order => <DetailCard key={order.idOrder} title={`Pedido #${order.idOrder}`} facts={[
          { label:"Estado", value:<StatusBadge status={order.status} label={orderStatusLabels[order.status]} /> },
          { label:"Fecha", value:formatDate(order.createdAt) },
          { label:"Cliente", value:order.client?.companyName || order.client?.user?.name || "—" },
          { label:"Cargas", value:order.details?.length || 0 },
        ]}><ActionButton href={destination} icon="arrow">Ver pedidos</ActionButton></DetailCard>)}
        {!orders.length && <DataState empty="Todavía no hay pedidos asignados" />}
      </div></section>
    </>}
  </>;
}
