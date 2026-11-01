"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon/Icon";
import { Select } from "@/components/ui/Select/Select";
import { TimedNotice } from "@/components/ui/TimedNotice/TimedNotice";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { ActionButton, DataState, Modal, PageHeader, Pagination, StatusBadge, workspaceStyles as ui } from "@/components/ui/Workspace/Workspace";
import { formatDate, formatMoney } from "@/lib/format";
import styles from "./PaymentsPanel.module.css";

type Payment = {
  idPayment: number; idOrder: number; amount: number; status: string; method: "card" | "transfer";
  referenceCode: string; last4?: string | null; paidAt?: string | null; createdAt: string;
  billingEmail?: string; transferReference?: string | null; cancellationReason?: string | null;
  order?: { status: string } | null;
  company?: { businessName: string } | null;
  client?: { companyName?: string; user?: { name?: string } } | null;
};
type Page<T> = { data: T[]; meta: { total: number; lastPage: number }; summary?: { totalAmount: number } };
const paymentStatusLabels: Record<string, string> = { pagado: "Pagado", cancelado: "Cancelado", pendiente: "Pendiente", fallido: "Fallido" };

type Filters = { status?: string; method?: string; search?: string };
type Props = {
  mode: "client" | "company";
  load: (page: number, perPage: number, filters: Filters, signal: AbortSignal) => Promise<Page<Payment>>;
  cancel?: (id: number, reason: string) => Promise<unknown>;
  name?: string;
  enabled?: boolean;
};

export function PaymentsPanel({ mode, load, cancel, name, enabled = true }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [page, setPage] = useState(1), [perPage, setPerPage] = useState(10);
  const [lastPage, setLastPage] = useState(1), [total, setTotal] = useState(0), [summary, setSummary] = useState(0);
  const [status, setStatus] = useState(""), [method, setMethod] = useState(""), [search, setSearch] = useState(""), [draftSearch, setDraftSearch] = useState("");
  const [loading, setLoading] = useState(enabled), [error, setError] = useState(""), [notice, setNotice] = useState(""), [version, setVersion] = useState(0);
  const [target, setTarget] = useState<Payment | null>(null), [detail, setDetail] = useState<Payment | null>(null), [busy, setBusy] = useState(false), [actionError, setActionError] = useState("");

  const reload = useCallback(() => { setLoading(true); setVersion(value => value + 1); }, []);
  const refreshSilently = useCallback(() => setVersion(value => value + 1), []);
  useAutoRefresh(refreshSilently, enabled && !loading && !busy);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(page, perPage, { status: status || undefined, method: method || undefined, search: search || undefined }, controller.signal)
      .then(result => { if (controller.signal.aborted) return; setPayments(result.data); setDetail(current => current ? result.data.find(payment => payment.idPayment === current.idPayment) || current : null); setTotal(result.meta.total); setLastPage(Math.max(1, result.meta.lastPage)); setSummary(Number(result.summary?.totalAmount ?? 0)); setError(""); setLoading(false); if (page > result.meta.lastPage) setPage(Math.max(1, result.meta.lastPage)); })
      .catch(cause => { if (controller.signal.aborted) return; setError(cause instanceof Error ? cause.message : "No pudimos cargar los pagos."); setLoading(false); });
    return () => controller.abort();
  }, [enabled, load, page, perPage, status, method, search, version]);

  async function confirmCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target || !cancel || busy) return;
    const reason = String(new FormData(event.currentTarget).get("reason") || "").trim();
    if (reason.length < 5) return;
    setBusy(true); setActionError("");
    try { await cancel(target.idPayment, reason); setTarget(null); setNotice(`Pago #${target.idPayment} cancelado correctamente.`); reload(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "No se pudo cancelar el pago."); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeader eyebrow={mode === "client" ? "TUS MOVIMIENTOS EN ORDEN" : "CONTROL DE INGRESOS"} title="Pagos" description={mode === "client" ? "Consulta los pagos simulados de tus pedidos y cancela los que aún aplican." : "Consulta los pagos de los pedidos de tu empresa."}
      action={<button className={ui.secondary} onClick={reload} disabled={loading}><Icon name="refresh" size={17} />Actualizar</button>} />
    {!enabled && mode === "client" && <p className={ui.notice}>Completa tu perfil de cliente para consultar tus pagos. <Link href="/client/profile">Ir a mi perfil</Link></p>}
    {notice && <TimedNotice message={notice} tone="danger" onDismiss={() => setNotice("")} />}
    <div className={styles.summary}>
      <div><span>Total de registros</span><strong>{loading ? "—" : total}</strong></div>
      <div><span>Monto de la selección</span><strong>{loading ? "—" : formatMoney(summary)}</strong></div>
      <div><span>{mode === "client" ? "Cancelables en esta página" : "Pagados en esta página"}</span><strong>{payments.filter(payment => mode === "client" ? canCancel(payment) : payment.status === "pagado").length}</strong></div>
    </div>
    <section className={ui.card} aria-label="Listado de pagos">
      <div className={styles.toolbar}>
        <form className={styles.search} onSubmit={event => { event.preventDefault(); setSearch(draftSearch.trim()); setPage(1); reload(); }}><Icon name="search" size={17} /><input value={draftSearch} onChange={event => setDraftSearch(event.target.value)} aria-label="Buscar referencia" placeholder="Buscar referencia…" /><button type="submit" className={ui.secondary}>Buscar</button></form>
        <div className={styles.filters}><Select label="Filtrar por estado" value={status} options={[{value:"",label:"Todos los estados"},{value:"pagado",label:"Pagados"},{value:"cancelado",label:"Cancelados"},{value:"pendiente",label:"Pendientes"},{value:"fallido",label:"Fallidos"}]} onChange={value => {setStatus(value);setPage(1);setLoading(true);}} /><Select label="Filtrar por método" value={method} options={[{value:"",label:"Todos los métodos"},{value:"card",label:"Tarjeta"},{value:"transfer",label:"Transferencia"}]} onChange={value => {setMethod(value);setPage(1);setLoading(true);}} /></div>
      </div>
      {error && payments.length > 0 && !loading && <p className={ui.error} role="status">No se pudieron actualizar los pagos. Se muestran los últimos datos disponibles.</p>}
      {loading || payments.length === 0 ? <DataState loading={loading} error={error} empty="No hay pagos para mostrar." onRetry={reload} /> :
        <div className={ui.tableWrap}><table className={ui.table}><thead><tr><th>Referencia</th><th>Pedido</th><th>{mode === "client" ? "Empresa" : "Cliente"}</th><th>Monto</th><th>Método</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>{payments.map(payment => <tr key={payment.idPayment}><td><strong>{payment.referenceCode}</strong></td><td>#{payment.idOrder}</td><td>{mode === "client" ? payment.company?.businessName || "—" : payment.client?.companyName || payment.client?.user?.name || "—"}</td><td>{formatMoney(Number(payment.amount))}</td><td>{payment.method === "card" ? `Tarjeta ${payment.last4 ? `•••• ${payment.last4}` : ""}` : "Transferencia"}</td><td><StatusBadge status={payment.status} label={paymentStatusLabels[payment.status]} /></td><td>{formatDate(payment.paidAt || payment.createdAt)}</td><td>{mode === "client" ? <ActionButton icon="close" variant="danger" disabled={!canCancel(payment)} disabledReason={cancelDisabledReason(payment)} onClick={() => {setTarget(payment);setActionError("");}}>Cancelar</ActionButton> : <ActionButton icon="eye" onClick={() => setDetail(payment)}>Ver detalles</ActionButton>}</td></tr>)}</tbody></table></div>}
      <Pagination page={page} lastPage={lastPage} total={total} perPage={perPage} disabled={loading} onPage={value => {setPage(value);setLoading(true);}} onPerPage={value => {setPerPage(value);setPage(1);setLoading(true);}} />
    </section>
    {target && <Modal title={`Cancelar pago #${target.idPayment}`} eyebrow="TRAVELDLS · TU ESPACIO" onClose={() => setTarget(null)} busy={busy}>
      <p className={ui.muted}>Pedido #{target.idOrder} · {formatMoney(Number(target.amount))}. El backend también actualizará el pedido cuando corresponda.</p>
      <form className={ui.form} onSubmit={event => void confirmCancel(event)}><label className={ui.field}>Motivo de cancelación<textarea name="reason" required minLength={5} maxLength={500} placeholder="Explica por qué necesitas cancelar este pago…" /></label>
        {actionError && <p className={ui.error} role="alert">{actionError}</p>}
        <div className={ui.actions}><button className={ui.secondary} type="button" disabled={busy} onClick={() => setTarget(null)}>Volver</button><button className={ui.danger} disabled={busy}>{busy ? "Cancelando…" : "Confirmar cancelación"}</button></div></form>
    </Modal>}
    {detail && <Modal title={`Pago #${detail.idPayment}`} eyebrow="CONTROL DE INGRESOS" onClose={() => setDetail(null)}>
      <PaymentDetail payment={detail} onClose={() => setDetail(null)} />
    </Modal>}
    {mode === "client" && <p className={styles.footnote}>Sesión de {name}. Los pagos mostrados corresponden a tu cuenta de cliente.</p>}
  </>;
}

function PaymentDetail({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const method = payment.method === "card"
    ? `Tarjeta${payment.last4 ? ` ···· ${payment.last4}` : ""}`
    : "Transferencia";

  return <div className={styles.detailCard}>
    <section className={styles.detailHero} data-status={payment.status} aria-label="Resumen del pago">
      <Icon name="tag" size={96} className={styles.detailWatermark} />
      <div className={styles.detailHeroTop}>
        <span className={styles.detailIcon}><Icon name="tag" size={22} /></span>
        <StatusBadge status={payment.status} label={paymentStatusLabels[payment.status]} />
      </div>
      <span className={styles.detailEyebrow}>Monto registrado</span>
      <strong className={styles.detailAmount}>{formatMoney(Number(payment.amount))}</strong>
      <span className={styles.detailHeroCaption}>Pedido #{payment.idOrder} · {method}</span>
    </section>

    <div className={styles.detailReference}>
      <span>Referencia del pago</span>
      <strong>{payment.referenceCode}</strong>
    </div>

    <dl className={styles.detailFacts}>
      <div><dt><Icon name="box" size={16} />Pedido</dt><dd>#{payment.idOrder}</dd></div>
      <div><dt><Icon name="calendar" size={16} />Fecha</dt><dd>{formatDate(payment.paidAt || payment.createdAt)}</dd></div>
      <div><dt><Icon name="tag" size={16} />Método</dt><dd>{method}</dd></div>
      <div><dt><Icon name="user" size={16} />Cliente</dt><dd>{payment.client?.companyName || payment.client?.user?.name || "—"}</dd></div>
      {payment.billingEmail && <div className={styles.detailFactWide}><dt><Icon name="mail" size={16} />Correo de facturación</dt><dd>{payment.billingEmail}</dd></div>}
      {payment.cancellationReason && <div className={styles.detailFactWide}><dt><Icon name="help" size={16} />Motivo de cancelación</dt><dd>{payment.cancellationReason}</dd></div>}
    </dl>
    <div className={styles.detailFooter}><ActionButton onClick={onClose}>Cerrar</ActionButton></div>
  </div>;
}

function canCancel(payment: Payment) { return payment.status !== "cancelado" && !["entregado", "en_transito", "pendiente_confirmacion", "entrega_disputada", "requiere_nueva_entrega"].includes(payment.order?.status || "") && !(payment.status === "pagado" && payment.order?.status === "aceptado"); }
function cancelDisabledReason(payment: Payment) {
  if (payment.status === "cancelado") return "Este pago ya fue cancelado.";
  if (["pendiente_confirmacion","entrega_disputada","requiere_nueva_entrega"].includes(payment.order?.status || "")) return "La entrega de este pedido sigue en proceso de confirmación o revisión.";
  if (payment.order?.status === "entregado") return "No se puede cancelar un pago de un pedido entregado.";
  if (payment.order?.status === "en_transito") return "No se puede cancelar un pago de un pedido en tránsito.";
  if (payment.status === "pagado" && payment.order?.status === "aceptado") return "No se puede cancelar el pago de un pedido aceptado y pagado.";
  return undefined;
}
