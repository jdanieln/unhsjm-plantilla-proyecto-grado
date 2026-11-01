"use client";

import { useCallback, useEffect, useState } from "react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon/Icon";
import { AnimatedIcon } from "@/components/ui/AnimatedIcon/AnimatedIcon";
import { DashboardStatCard } from "@/components/ui/DashboardStatCard/DashboardStatCard";
import { useClientSession } from "../ClientShell/ClientShell";
import { ActionButton, DataState, PageHeader, StatusBadge, workspaceStyles as ui } from "@/components/ui/Workspace/Workspace";
import { getOrders } from "../../services/clientApi";
import { formatDate, orderStatusLabels, type Order } from "../../types/client";
import styles from "./ClientDashboard.module.css";

export function ClientDashboard() {
  const { user } = useClientSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(user.idClient));
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const refreshSilently = useCallback(() => setVersion(value => value + 1), []);
  useAutoRefresh(refreshSilently, Boolean(user.idClient));

  useEffect(() => {
    if (!user.idClient) return;
    const controller = new AbortController();
    getOrders(user.idClient, 1, 50, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      setOrders(result.data);
      setTotal(result.meta.total);
      setLoading(false);
      setError("");
    }).catch((cause) => {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "No pudimos cargar tus pedidos.");
      setLoading(false);
    });
    return () => controller.abort();
  }, [user.idClient, version]);

  const completed = orders.filter((order) => order.status === "entregado").length;
  const active = orders.filter((order) => ["aceptado", "en_transito"].includes(order.status)).length;
  const awaiting = orders.filter((order) => ["pendiente", "esperando_aprobacion"].includes(order.status)).length;

  return <>
    <PageHeader eyebrow="TODO CONECTADO. TODO BAJO CONTROL." title={`Hola, ${user.name.split(" ")[0]}.`} description="Sigue tus pedidos y encuentra la empresa ideal para tu próximo envío." action={<Link className={ui.primary} href={user.idClient ? "/client/orders?new=1" : "/client/profile"}><Icon name="plus" size={17} />{user.idClient ? "Nuevo pedido" : "Completar perfil"}</Link>} />
    <section className={styles.hero} aria-label="Tu centro de envíos">
      <div><p className={styles.eyebrow}>TU CENTRO DE ENVÍOS</p><h2>De principio a destino.<br /><span>Siempre contigo.</span></h2><p>Solicita transporte, consulta el estado de tus cargas y mantén cada movimiento a la vista.</p><Link className={ui.primary} href="/client/orders">Explorar mis pedidos <Icon name="arrow" size={17} /></Link></div>
      <AnimatedIcon name="route" size={112} />
    </section>
    {!user.idClient && <div className={styles.profilePrompt}><Icon name="user" size={23} /><div><strong>Completa tu perfil para crear pedidos</strong><p>Necesitamos tus datos de cliente antes de solicitar transporte.</p></div><Link className={ui.secondary} href="/client/profile">Completar perfil</Link></div>}
    {error && orders.length > 0 && !loading && <p className={ui.error} role="status">No se pudo actualizar la vista general. Se muestran los últimos datos disponibles.</p>}
    <div className={styles.stats}>
      {[
        { label: "Pedidos totales", value: total, icon: "box" as const },
        { label: "En movimiento · últimos 50", value: active, icon: "truck" as const },
        { label: "Pendientes · últimos 50", value: awaiting, icon: "route" as const },
        { label: "Entregados · últimos 50", value: completed, icon: "shield" as const },
      ].map((item) => <DashboardStatCard key={item.label} icon={item.icon} value={loading ? "—" : item.value} label={item.label} />)}
    </div>
    <section className={`${ui.card} ${styles.recent}`} aria-label="Pedidos recientes"><div className={styles.sectionHead}><div><h2>Pedidos recientes</h2><p>Las últimas conexiones de tu ruta.</p></div><ActionButton href="/client/orders" icon="arrow" iconPlacement="after" variant="subtle">Ver todos</ActionButton></div>
      {loading || orders.length === 0 ? <DataState loading={loading} error={error} empty="Aún no tienes pedidos registrados." onRetry={() => { setLoading(true); setVersion((value) => value + 1); }} /> :
        <div className={ui.tableWrap}><table className={ui.table}><thead><tr><th>Pedido</th><th>Empresa</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{orders.slice(0, 5).map((order) => <tr key={order.idOrder}><td><Link href={`/client/orders?order=${order.idOrder}`} className={ui.inlineButton}>#{order.idOrder}</Link></td><td>{order.company?.businessName || `Empresa #${order.idCompany}`}</td><td><StatusBadge status={order.status} label={orderStatusLabels[order.status]} /></td><td>{formatDate(order.createdAt)}</td></tr>)}</tbody></table></div>}
    </section>
    <div className={styles.quickLinks}><Link href="/client/payments"><AnimatedIcon name="tag" motion="hover" /><span><strong>Mis pagos</strong><small>Consulta tus movimientos.</small></span><Icon name="arrow" size={16} /></Link><Link href="/client/profile"><AnimatedIcon name="user" motion="hover" /><span><strong>Mi perfil</strong><small>Tu información en orden.</small></span><Icon name="arrow" size={16} /></Link></div>
  </>;
}
